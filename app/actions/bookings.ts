"use server"

import { db } from "@/lib/db"
import { trips, bookings } from "@/lib/db/schema"
import { requireSession } from "@/lib/session"
import { type ActionResult, ok, fail } from "@/lib/action-result"
import { and, eq, gt, sql, asc } from "drizzle-orm"
import { revalidatePath } from "next/cache"

export type TripWithAvailability = {
  id: number
  title: string
  startsAt: Date
  durationMinutes: number
  capacity: number
  location: string | null
  price: number | null
  notes: string | null
  booked: number
  available: number
  myBooking: { id: number; spots: number } | null
}

export async function getUpcomingTrips(): Promise<TripWithAvailability[]> {
  const session = await requireSession()

  const rows = await db
    .select()
    .from(trips)
    .where(gt(trips.startsAt, new Date()))
    .orderBy(asc(trips.startsAt))

  const counts = await db
    .select({
      tripId: bookings.tripId,
      booked: sql<number>`coalesce(sum(${bookings.spots}), 0)`.mapWith(Number),
    })
    .from(bookings)
    .where(eq(bookings.status, "active"))
    .groupBy(bookings.tripId)

  const mine = await db
    .select({ id: bookings.id, tripId: bookings.tripId, spots: bookings.spots })
    .from(bookings)
    .where(and(eq(bookings.telegramId, session.id), eq(bookings.status, "active")))

  const bookedMap = new Map(counts.map((c) => [c.tripId, c.booked]))
  const mineMap = new Map(mine.map((m) => [m.tripId, { id: m.id, spots: m.spots }]))

  return rows.map((t) => {
    const booked = bookedMap.get(t.id) ?? 0
    return {
      id: t.id,
      title: t.title,
      startsAt: t.startsAt,
      durationMinutes: t.durationMinutes,
      capacity: t.capacity,
      location: t.location,
      price: t.price,
      notes: t.notes,
      booked,
      available: Math.max(0, t.capacity - booked),
      myBooking: mineMap.get(t.id) ?? null,
    }
  })
}

export type MyBooking = {
  id: number
  spots: number
  status: string
  trip: {
    id: number
    title: string
    startsAt: Date
    durationMinutes: number
    location: string | null
    price: number | null
  }
}

export async function getMyBookings(): Promise<MyBooking[]> {
  const session = await requireSession()

  const rows = await db
    .select({
      id: bookings.id,
      spots: bookings.spots,
      status: bookings.status,
      tripId: trips.id,
      title: trips.title,
      startsAt: trips.startsAt,
      durationMinutes: trips.durationMinutes,
      location: trips.location,
      price: trips.price,
    })
    .from(bookings)
    .innerJoin(trips, eq(bookings.tripId, trips.id))
    .where(and(eq(bookings.telegramId, session.id), eq(bookings.status, "active")))
    .orderBy(asc(trips.startsAt))

  return rows.map((r) => ({
    id: r.id,
    spots: r.spots,
    status: r.status,
    trip: {
      id: r.tripId,
      title: r.title,
      startsAt: r.startsAt,
      durationMinutes: r.durationMinutes,
      location: r.location,
      price: r.price,
    },
  }))
}

async function bookedSpots(tripId: number, excludeBookingId?: number): Promise<number> {
  const conditions = [eq(bookings.tripId, tripId), eq(bookings.status, "active")]
  const [row] = await db
    .select({ booked: sql<number>`coalesce(sum(${bookings.spots}), 0)`.mapWith(Number) })
    .from(bookings)
    .where(and(...conditions))
  let booked = row?.booked ?? 0
  if (excludeBookingId) {
    const [ex] = await db
      .select({ spots: bookings.spots })
      .from(bookings)
      .where(and(eq(bookings.id, excludeBookingId), eq(bookings.status, "active")))
    if (ex) booked -= ex.spots
  }
  return booked
}

export async function createBooking(input: {
  tripId: number
  spots: number
  phone?: string
}): Promise<ActionResult> {
  const session = await requireSession()
  const spots = Math.max(1, Math.min(10, Math.floor(input.spots || 1)))

  const [trip] = await db.select().from(trips).where(eq(trips.id, input.tripId))
  if (!trip) return fail("Прогулка не найдена")
  if (trip.startsAt <= new Date()) return fail("Эта прогулка уже началась")

  const existing = await db
    .select({ id: bookings.id })
    .from(bookings)
    .where(
      and(
        eq(bookings.tripId, input.tripId),
        eq(bookings.telegramId, session.id),
        eq(bookings.status, "active"),
      ),
    )
  if (existing.length > 0) return fail("Вы уже записаны на эту прогулку")

  const booked = await bookedSpots(input.tripId)
  if (booked + spots > trip.capacity) {
    return fail(`Недостаточно мест. Свободно: ${Math.max(0, trip.capacity - booked)}`)
  }

  await db.insert(bookings).values({
    tripId: input.tripId,
    telegramId: session.id,
    userName: [session.firstName, session.lastName].filter(Boolean).join(" ") || "Гость",
    username: session.username,
    phone: input.phone,
    spots,
    status: "active",
  })

  revalidatePath("/")
  return ok()
}

export async function rescheduleBooking(input: {
  bookingId: number
  newTripId: number
}): Promise<ActionResult> {
  const session = await requireSession()

  const [booking] = await db
    .select()
    .from(bookings)
    .where(and(eq(bookings.id, input.bookingId), eq(bookings.telegramId, session.id)))
  if (!booking || booking.status !== "active") return fail("Бронирование не найдено")

  const [trip] = await db.select().from(trips).where(eq(trips.id, input.newTripId))
  if (!trip) return fail("Прогулка не найдена")
  if (trip.startsAt <= new Date()) return fail("Эта прогулка уже началась")

  const booked = await bookedSpots(input.newTripId)
  if (booked + booking.spots > trip.capacity) {
    return fail(`Недостаточно мест. Свободно: ${Math.max(0, trip.capacity - booked)}`)
  }

  await db
    .update(bookings)
    .set({ tripId: input.newTripId, reminderSentAt: null })
    .where(and(eq(bookings.id, input.bookingId), eq(bookings.telegramId, session.id)))

  revalidatePath("/")
  return ok()
}

export async function cancelBooking(bookingId: number): Promise<ActionResult> {
  const session = await requireSession()
  await db
    .update(bookings)
    .set({ status: "cancelled" })
    .where(and(eq(bookings.id, bookingId), eq(bookings.telegramId, session.id)))
  revalidatePath("/")
  return ok()
}

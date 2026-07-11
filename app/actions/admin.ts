"use server"

import { db } from "@/lib/db"
import { trips, bookings } from "@/lib/db/schema"
import { requireAdmin } from "@/lib/session"
import { sendTelegramMessage } from "@/lib/telegram"
import { type ActionResult, ok, fail } from "@/lib/action-result"
import { and, eq, sql, asc, desc } from "drizzle-orm"
import { revalidatePath } from "next/cache"

export type AdminTrip = {
  id: number
  title: string
  startsAt: Date
  durationMinutes: number
  capacity: number
  location: string | null
  price: number | null
  notes: string | null
  booked: number
  bookings: {
    id: number
    userName: string
    username: string | null
    phone: string | null
    spots: number
    telegramId: string
  }[]
}

export async function getAdminTrips(): Promise<AdminTrip[]> {
  await requireAdmin()

  const tripRows = await db.select().from(trips).orderBy(asc(trips.startsAt))
  const bookingRows = await db
    .select()
    .from(bookings)
    .where(eq(bookings.status, "active"))
    .orderBy(desc(bookings.createdAt))

  return tripRows.map((t) => {
    const tb = bookingRows.filter((b) => b.tripId === t.id)
    return {
      id: t.id,
      title: t.title,
      startsAt: t.startsAt,
      durationMinutes: t.durationMinutes,
      capacity: t.capacity,
      location: t.location,
      price: t.price,
      notes: t.notes,
      booked: tb.reduce((sum, b) => sum + b.spots, 0),
      bookings: tb.map((b) => ({
        id: b.id,
        userName: b.userName,
        username: b.username,
        phone: b.phone,
        spots: b.spots,
        telegramId: b.telegramId,
      })),
    }
  })
}

export async function createTrip(input: {
  title: string
  startsAt: string
  durationMinutes: number
  capacity: number
  location?: string
  price?: number
  notes?: string
}): Promise<ActionResult> {
  await requireAdmin()
  const date = new Date(input.startsAt)
  if (isNaN(date.getTime())) return fail("Некорректная дата")

  await db.insert(trips).values({
    title: input.title?.trim() || "Прогулка на сапбордах",
    startsAt: date,
    durationMinutes: Math.max(15, Math.floor(input.durationMinutes || 90)),
    capacity: Math.max(1, Math.floor(input.capacity || 8)),
    location: input.location?.trim() || null,
    price: input.price ? Math.floor(input.price) : null,
    notes: input.notes?.trim() || null,
  })

  revalidatePath("/admin")
  revalidatePath("/")
  return ok()
}

export async function deleteTrip(tripId: number): Promise<ActionResult> {
  await requireAdmin()

  // Notify affected clients that the trip is cancelled.
  const affected = await db
    .select()
    .from(bookings)
    .where(and(eq(bookings.tripId, tripId), eq(bookings.status, "active")))
  const [trip] = await db.select().from(trips).where(eq(trips.id, tripId))

  await db.delete(bookings).where(eq(bookings.tripId, tripId))
  await db.delete(trips).where(eq(trips.id, tripId))

  if (trip) {
    for (const b of affected) {
      await sendTelegramMessage(
        b.telegramId,
        `К сожалению, прогулка <b>«${trip.title}»</b> ${formatDate(trip.startsAt)} была отменена. Приносим извинения! Выберите другое время в приложении.`,
      )
    }
  }

  revalidatePath("/admin")
  revalidatePath("/")
  return ok()
}

export async function adminCancelBooking(bookingId: number): Promise<ActionResult> {
  await requireAdmin()
  const [b] = await db.select().from(bookings).where(eq(bookings.id, bookingId))
  await db.update(bookings).set({ status: "cancelled" }).where(eq(bookings.id, bookingId))

  if (b) {
    const [trip] = await db.select().from(trips).where(eq(trips.id, b.tripId))
    if (trip) {
      await sendTelegramMessage(
        b.telegramId,
        `Ваше бронирование на прогулку <b>«${trip.title}»</b> ${formatDate(trip.startsAt)} было отменено администратором.`,
      )
    }
  }

  revalidatePath("/admin")
  revalidatePath("/")
  return ok()
}

export async function adminRescheduleBooking(input: {
  bookingId: number
  newTripId: number
}): Promise<ActionResult> {
  await requireAdmin()

  const [booking] = await db.select().from(bookings).where(eq(bookings.id, input.bookingId))
  if (!booking) return fail("Бронирование не найдено")

  const [trip] = await db.select().from(trips).where(eq(trips.id, input.newTripId))
  if (!trip) return fail("Прогулка не найдена")

  const [row] = await db
    .select({ booked: sql<number>`coalesce(sum(${bookings.spots}), 0)`.mapWith(Number) })
    .from(bookings)
    .where(and(eq(bookings.tripId, input.newTripId), eq(bookings.status, "active")))
  const booked = (row?.booked ?? 0) - (booking.tripId === input.newTripId ? booking.spots : 0)
  if (booked + booking.spots > trip.capacity) {
    return fail(`Недостаточно мест. Свободно: ${Math.max(0, trip.capacity - booked)}`)
  }

  await db
    .update(bookings)
    .set({ tripId: input.newTripId, reminderSentAt: null })
    .where(eq(bookings.id, input.bookingId))

  await sendTelegramMessage(
    booking.telegramId,
    `Ваше бронирование перенесено на прогулку <b>«${trip.title}»</b> ${formatDate(trip.startsAt)}.`,
  )

  revalidatePath("/admin")
  revalidatePath("/")
  return ok()
}

function formatDate(d: Date): string {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Moscow",
  }).format(new Date(d))
}

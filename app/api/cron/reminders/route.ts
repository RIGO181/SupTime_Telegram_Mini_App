import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { trips, bookings } from "@/lib/db/schema"
import { sendTelegramMessage } from "@/lib/telegram"
import { and, eq, gt, lte, isNull } from "drizzle-orm"

export const dynamic = "force-dynamic"

function formatDate(d: Date): string {
  return new Intl.DateTimeFormat("ru-RU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Moscow",
  }).format(new Date(d))
}

export async function GET(req: Request) {
  // Protect the endpoint. Vercel Cron sends the CRON_SECRET as a Bearer token.
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = req.headers.get("authorization")
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }

  const now = new Date()
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000)

  const rows = await db
    .select({
      bookingId: bookings.id,
      telegramId: bookings.telegramId,
      userName: bookings.userName,
      spots: bookings.spots,
      title: trips.title,
      startsAt: trips.startsAt,
      location: trips.location,
    })
    .from(bookings)
    .innerJoin(trips, eq(bookings.tripId, trips.id))
    .where(
      and(
        eq(bookings.status, "active"),
        isNull(bookings.reminderSentAt),
        gt(trips.startsAt, now),
        lte(trips.startsAt, in24h),
      ),
    )

  let sent = 0
  for (const r of rows) {
    const locationLine = r.location ? `\n📍 ${r.location}` : ""
    const ok = await sendTelegramMessage(
      r.telegramId,
      `Напоминание! Завтра у вас прогулка на сапбордах 🏄\n\n<b>${r.title}</b>\n🗓 ${formatDate(r.startsAt)}${locationLine}\nМест забронировано: ${r.spots}\n\nЖдём вас!`,
    )
    // Mark as sent regardless, to avoid spamming if a chat is unreachable.
    await db
      .update(bookings)
      .set({ reminderSentAt: now })
      .where(eq(bookings.id, r.bookingId))
    if (ok) sent++
  }

  return NextResponse.json({ checked: rows.length, sent })
}

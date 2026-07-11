"use client"

import { Clock, MapPin, Users, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatFullDate, formatTime, formatPrice, formatDuration } from "@/lib/format"
import type { TripWithAvailability } from "@/app/actions/bookings"

export function TripCard({
  trip,
  onBook,
}: {
  trip: TripWithAvailability
  onBook: () => void
}) {
  const soldOut = trip.available <= 0
  const alreadyBooked = trip.myBooking != null
  const price = formatPrice(trip.price)

  return (
    <article className="flex flex-col gap-3 rounded-2xl border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display text-base font-bold text-balance">{trip.title}</h3>
          <p className="mt-0.5 text-sm capitalize text-muted-foreground">
            {formatFullDate(trip.startsAt)} · {formatTime(trip.startsAt)}
          </p>
        </div>
        {price && (
          <div className="shrink-0 rounded-lg bg-accent px-2.5 py-1 text-sm font-semibold text-accent-foreground">
            {price}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <Clock className="size-4" aria-hidden="true" />
          {formatDuration(trip.durationMinutes)}
        </span>
        {trip.location && (
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="size-4" aria-hidden="true" />
            {trip.location}
          </span>
        )}
        <span className="inline-flex items-center gap-1.5">
          <Users className="size-4" aria-hidden="true" />
          {soldOut ? "Мест нет" : `Свободно ${trip.available} из ${trip.capacity}`}
        </span>
      </div>

      {trip.notes && <p className="text-sm text-muted-foreground text-pretty">{trip.notes}</p>}

      {alreadyBooked ? (
        <Badge variant="secondary" className="w-fit gap-1.5 py-1">
          <CheckCircle2 className="size-3.5" aria-hidden="true" />
          Вы записаны ({trip.myBooking?.spots} мест)
        </Badge>
      ) : (
        <Button onClick={onBook} disabled={soldOut} className="w-full">
          {soldOut ? "Мест нет" : "Записаться"}
        </Button>
      )}
    </article>
  )
}

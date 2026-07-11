"use client"

import { useState } from "react"
import { Clock, MapPin, CalendarClock, X, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { formatFullDate, formatTime, formatDuration } from "@/lib/format"
import type { MyBooking } from "@/app/actions/bookings"

export function MyBookingCard({
  booking,
  onCancel,
  onReschedule,
}: {
  booking: MyBooking
  onCancel: () => void
  onReschedule: () => void
}) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const { trip } = booking

  return (
    <article className="flex flex-col gap-3 rounded-2xl border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display text-base font-bold text-balance">{trip.title}</h3>
          <p className="mt-0.5 text-sm capitalize text-muted-foreground">
            {formatFullDate(trip.startsAt)} · {formatTime(trip.startsAt)}
          </p>
        </div>
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
          {booking.spots} мест
        </span>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" className="flex-1 gap-1.5" onClick={onReschedule}>
          <CalendarClock className="size-4" aria-hidden="true" />
          Перенести
        </Button>
        <Button
          variant="ghost"
          className="flex-1 gap-1.5 text-destructive hover:text-destructive"
          onClick={() => setConfirmOpen(true)}
        >
          <X className="size-4" aria-hidden="true" />
          Отменить
        </Button>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Отменить бронирование?</DialogTitle>
            <DialogDescription>
              Запись на «{trip.title}» ({formatFullDate(trip.startsAt)}) будет отменена.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Оставить
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setConfirmOpen(false)
                onCancel()
              }}
            >
              Отменить запись
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </article>
  )
}

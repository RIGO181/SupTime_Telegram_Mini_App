"use client"

import { useState, useEffect } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { formatFullDate, formatTime } from "@/lib/format"
import type { MyBooking, TripWithAvailability } from "@/app/actions/bookings"
import { cn } from "@/lib/utils"

export function RescheduleDialog({
  booking,
  trips,
  pending,
  onClose,
  onConfirm,
}: {
  booking: MyBooking | null
  trips: TripWithAvailability[]
  pending: boolean
  onClose: () => void
  onConfirm: (bookingId: number, newTripId: number) => void
}) {
  const [selected, setSelected] = useState<number | null>(null)

  useEffect(() => {
    setSelected(null)
  }, [booking])

  const need = booking?.spots ?? 1
  const options = trips.filter((t) => t.available >= need)

  return (
    <Dialog open={booking != null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        {booking && (
          <>
            <DialogHeader>
              <DialogTitle className="font-display">Перенести бронирование</DialogTitle>
              <DialogDescription>
                Выберите новую дату для «{booking.trip.title}» ({need} мест).
              </DialogDescription>
            </DialogHeader>

            <div className="flex max-h-[50vh] flex-col gap-2 overflow-y-auto py-1">
              {options.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground text-pretty">
                  Нет других прогулок с достаточным количеством свободных мест.
                </p>
              ) : (
                options.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelected(t.id)}
                    className={cn(
                      "flex flex-col items-start gap-0.5 rounded-xl border p-3 text-left transition-colors",
                      selected === t.id
                        ? "border-primary bg-accent"
                        : "border-border hover:bg-muted",
                    )}
                  >
                    <span className="font-medium">{t.title}</span>
                    <span className="text-sm capitalize text-muted-foreground">
                      {formatFullDate(t.startsAt)} · {formatTime(t.startsAt)} · свободно{" "}
                      {t.available}
                    </span>
                  </button>
                ))
              )}
            </div>

            <DialogFooter className="gap-2 sm:gap-2">
              <Button variant="outline" onClick={onClose}>
                Отмена
              </Button>
              <Button
                onClick={() => selected && onConfirm(booking.id, selected)}
                disabled={pending || selected == null}
              >
                {pending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                Перенести
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

"use client"

import { useState, useEffect } from "react"
import { Loader2, Minus, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { formatFullDate, formatTime } from "@/lib/format"
import type { TripWithAvailability } from "@/app/actions/bookings"

export function BookDialog({
  trip,
  pending,
  onClose,
  onConfirm,
}: {
  trip: TripWithAvailability | null
  pending: boolean
  onClose: () => void
  onConfirm: (tripId: number, spots: number, phone: string) => void
}) {
  const [spots, setSpots] = useState(1)
  const [phone, setPhone] = useState("")

  useEffect(() => {
    if (trip) {
      setSpots(1)
      setPhone("")
    }
  }, [trip])

  const max = Math.min(trip?.available ?? 1, 10)

  return (
    <Dialog open={trip != null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        {trip && (
          <>
            <DialogHeader>
              <DialogTitle className="font-display">{trip.title}</DialogTitle>
              <DialogDescription className="capitalize">
                {formatFullDate(trip.startsAt)} · {formatTime(trip.startsAt)}
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-4 py-1">
              <div className="flex items-center justify-between">
                <Label>Количество мест</Label>
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="size-8"
                    onClick={() => setSpots((s) => Math.max(1, s - 1))}
                    disabled={spots <= 1}
                    aria-label="Меньше"
                  >
                    <Minus className="size-4" aria-hidden="true" />
                  </Button>
                  <span className="w-6 text-center font-semibold tabular-nums">{spots}</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="size-8"
                    onClick={() => setSpots((s) => Math.min(max, s + 1))}
                    disabled={spots >= max}
                    aria-label="Больше"
                  >
                    <Plus className="size-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="phone">Телефон для связи (необязательно)</Label>
                <Input
                  id="phone"
                  type="tel"
                  inputMode="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+7 900 000-00-00"
                />
              </div>

              <p className="text-xs text-muted-foreground">
                Свободно мест: {trip.available}. Оплата на месте.
              </p>
            </div>

            <DialogFooter className="gap-2 sm:gap-2">
              <Button variant="outline" onClick={onClose}>
                Отмена
              </Button>
              <Button onClick={() => onConfirm(trip.id, spots, phone)} disabled={pending}>
                {pending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                Записаться
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

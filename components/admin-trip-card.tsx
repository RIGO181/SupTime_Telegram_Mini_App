"use client"

import { useState } from "react"
import { Clock, MapPin, Users, Trash2, ChevronDown, X, CalendarClock, Phone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { formatFullDate, formatTime, formatDuration } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { AdminTrip } from "@/app/actions/admin"

export function AdminTripCard({
  trip,
  allTrips,
  onDeleteTrip,
  onCancelBooking,
  onReschedule,
}: {
  trip: AdminTrip
  allTrips: AdminTrip[]
  onDeleteTrip: () => void
  onCancelBooking: (bookingId: number) => void
  onReschedule: (bookingId: number, newTripId: number) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [rescheduleId, setRescheduleId] = useState<number | null>(null)
  const [target, setTarget] = useState<string>("")

  const otherTrips = allTrips.filter((t) => t.id !== trip.id)

  return (
    <article className="flex flex-col gap-3 rounded-2xl border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display text-base font-bold text-balance">{trip.title}</h3>
          <p className="mt-0.5 text-sm capitalize text-muted-foreground">
            {formatFullDate(trip.startsAt)} · {formatTime(trip.startsAt)}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 text-destructive hover:text-destructive"
          onClick={() => setDeleteOpen(true)}
          aria-label="Удалить прогулку"
        >
          <Trash2 className="size-4" aria-hidden="true" />
        </Button>
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
          {trip.booked} / {trip.capacity}
        </span>
      </div>

      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="flex items-center justify-between rounded-lg bg-muted px-3 py-2 text-sm font-medium"
      >
        <span>Бронирования ({trip.bookings.length})</span>
        <ChevronDown
          className={cn("size-4 transition-transform", expanded && "rotate-180")}
          aria-hidden="true"
        />
      </button>

      {expanded && (
        <div className="flex flex-col gap-2">
          {trip.bookings.length === 0 ? (
            <p className="px-1 py-2 text-sm text-muted-foreground">Пока нет записей.</p>
          ) : (
            trip.bookings.map((b) => (
              <div
                key={b.id}
                className="flex flex-col gap-2 rounded-xl border bg-background p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium">{b.userName}</p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                      {b.username && <span>@{b.username}</span>}
                      {b.phone && (
                        <span className="inline-flex items-center gap-1">
                          <Phone className="size-3" aria-hidden="true" />
                          {b.phone}
                        </span>
                      )}
                    </div>
                  </div>
                  <Badge variant="secondary" className="shrink-0">
                    {b.spots} мест
                  </Badge>
                </div>

                {rescheduleId === b.id ? (
                  <div className="flex flex-col gap-2">
                    <Select value={target} onValueChange={setTarget}>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите новую дату" />
                      </SelectTrigger>
                      <SelectContent>
                        {otherTrips.map((t) => (
                          <SelectItem key={t.id} value={String(t.id)}>
                            {formatFullDate(t.startsAt)}, {formatTime(t.startsAt)} — {t.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                          setRescheduleId(null)
                          setTarget("")
                        }}
                      >
                        Отмена
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1"
                        disabled={!target}
                        onClick={() => {
                          onReschedule(b.id, Number(target))
                          setRescheduleId(null)
                          setTarget("")
                        }}
                      >
                        Перенести
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 gap-1.5"
                      disabled={otherTrips.length === 0}
                      onClick={() => {
                        setRescheduleId(b.id)
                        setTarget("")
                      }}
                    >
                      <CalendarClock className="size-3.5" aria-hidden="true" />
                      Перенести
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="flex-1 gap-1.5 text-destructive hover:text-destructive"
                      onClick={() => onCancelBooking(b.id)}
                    >
                      <X className="size-3.5" aria-hidden="true" />
                      Отменить
                    </Button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Удалить прогулку?</DialogTitle>
            <DialogDescription>
              Прогулка «{trip.title}» и все её бронирования ({trip.bookings.length}) будут удалены.
              Записанным клиентам придёт уведомление об отмене.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Отмена
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setDeleteOpen(false)
                onDeleteTrip()
              }}
            >
              Удалить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </article>
  )
}

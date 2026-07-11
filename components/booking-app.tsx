"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Waves, CalendarDays, Ticket, Shield, LogOut } from "lucide-react"
import { toast } from "sonner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { TripCard } from "@/components/trip-card"
import { MyBookingCard } from "@/components/my-booking-card"
import { BookDialog } from "@/components/book-dialog"
import { RescheduleDialog } from "@/components/reschedule-dialog"
import { createBooking, cancelBooking, rescheduleBooking } from "@/app/actions/bookings"
import type { TripWithAvailability, MyBooking } from "@/app/actions/bookings"

type Props = {
  session: { firstName: string; isAdmin: boolean }
  initialTrips: TripWithAvailability[]
  initialBookings: MyBooking[]
}

export function BookingApp({ session, initialTrips, initialBookings }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [bookTrip, setBookTrip] = useState<TripWithAvailability | null>(null)
  const [rescheduleFor, setRescheduleFor] = useState<MyBooking | null>(null)
  const [pending, setPending] = useState(false)

  async function logout() {
    await fetch("/api/session", { method: "DELETE" })
    router.refresh()
  }

  async function handleBook(tripId: number, spots: number, phone: string) {
    setPending(true)
    const res = await createBooking({ tripId, spots, phone })
    setPending(false)
    if (res?.error) {
      toast.error(res.error)
      return
    }
    toast.success("Вы записаны на прогулку!")
    setBookTrip(null)
    startTransition(() => router.refresh())
  }

  async function handleCancel(bookingId: number) {
    const res = await cancelBooking(bookingId)
    if (res?.error) {
      toast.error(res.error)
      return
    }
    toast.success("Бронирование отменено")
    startTransition(() => router.refresh())
  }

  async function handleReschedule(bookingId: number, newTripId: number) {
    setPending(true)
    const res = await rescheduleBooking({ bookingId, newTripId })
    setPending(false)
    if (res?.error) {
      toast.error(res.error)
      return
    }
    toast.success("Бронирование перенесено")
    setRescheduleFor(null)
    startTransition(() => router.refresh())
  }

  const availableForReschedule = initialTrips.filter(
    (t) => !rescheduleFor || t.id !== rescheduleFor.trip.id,
  )

  return (
    <div className="min-h-dvh flex flex-col bg-background">
      <header className="sticky top-0 z-10 border-b bg-card/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-lg items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Waves className="size-5" aria-hidden="true" />
            </div>
            <div className="leading-tight">
              <p className="font-display text-base font-bold">Сапборды</p>
              <p className="text-xs text-muted-foreground">Привет, {session.firstName}!</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {session.isAdmin && (
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5"
                render={<Link href="/admin" />}
              >
                <Shield className="size-4" aria-hidden="true" />
                Админ
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={logout} aria-label="Выйти">
              <LogOut className="size-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-4">
        <Tabs defaultValue="schedule" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="schedule" className="gap-1.5">
              <CalendarDays className="size-4" aria-hidden="true" />
              Расписание
            </TabsTrigger>
            <TabsTrigger value="mine" className="gap-1.5">
              <Ticket className="size-4" aria-hidden="true" />
              Мои записи
              {initialBookings.length > 0 && (
                <span className="ml-0.5 flex size-5 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
                  {initialBookings.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="schedule" className="mt-4 flex flex-col gap-3">
            {initialTrips.length === 0 ? (
              <EmptyState
                icon={<CalendarDays className="size-6" aria-hidden="true" />}
                title="Пока нет прогулок"
                text="Новые даты появятся здесь. Загляните позже!"
              />
            ) : (
              initialTrips.map((trip) => (
                <TripCard key={trip.id} trip={trip} onBook={() => setBookTrip(trip)} />
              ))
            )}
          </TabsContent>

          <TabsContent value="mine" className="mt-4 flex flex-col gap-3">
            {initialBookings.length === 0 ? (
              <EmptyState
                icon={<Ticket className="size-6" aria-hidden="true" />}
                title="Нет активных записей"
                text="Выберите прогулку в разделе «Расписание»."
              />
            ) : (
              initialBookings.map((b) => (
                <MyBookingCard
                  key={b.id}
                  booking={b}
                  onCancel={() => handleCancel(b.id)}
                  onReschedule={() => setRescheduleFor(b)}
                />
              ))
            )}
          </TabsContent>
        </Tabs>
      </main>

      <BookDialog
        trip={bookTrip}
        pending={pending}
        onClose={() => setBookTrip(null)}
        onConfirm={handleBook}
      />
      <RescheduleDialog
        booking={rescheduleFor}
        trips={availableForReschedule}
        pending={pending}
        onClose={() => setRescheduleFor(null)}
        onConfirm={handleReschedule}
      />
    </div>
  )
}

function EmptyState({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode
  title: string
  text: string
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed bg-card/50 px-6 py-12 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        {icon}
      </div>
      <div>
        <p className="font-medium">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground text-pretty">{text}</p>
      </div>
    </div>
  )
}

"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Plus, Shield } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { AdminTripCard } from "@/components/admin-trip-card"
import { CreateTripDialog } from "@/components/create-trip-dialog"
import {
  createTrip,
  deleteTrip,
  adminCancelBooking,
  adminRescheduleBooking,
} from "@/app/actions/admin"
import type { AdminTrip } from "@/app/actions/admin"

export function AdminApp({ trips }: { trips: AdminTrip[] }) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [createOpen, setCreateOpen] = useState(false)
  const [pending, setPending] = useState(false)

  function refresh() {
    startTransition(() => router.refresh())
  }

  async function handleCreate(input: Parameters<typeof createTrip>[0]) {
    setPending(true)
    const res = await createTrip(input)
    setPending(false)
    if (res?.error) {
      toast.error(res.error)
      return
    }
    toast.success("Прогулка добавлена в расписание")
    setCreateOpen(false)
    refresh()
  }

  async function handleDeleteTrip(id: number) {
    const res = await deleteTrip(id)
    if (res?.error) return toast.error(res.error)
    toast.success("Прогулка удалена, клиенты уведомлены")
    refresh()
  }

  async function handleCancelBooking(id: number) {
    const res = await adminCancelBooking(id)
    if (res?.error) return toast.error(res.error)
    toast.success("Бронирование отменено")
    refresh()
  }

  async function handleReschedule(bookingId: number, newTripId: number) {
    const res = await adminRescheduleBooking({ bookingId, newTripId })
    if (res?.error) return toast.error(res.error)
    toast.success("Бронирование перенесено")
    refresh()
  }

  return (
    <div className="min-h-dvh flex flex-col bg-background">
      <header className="sticky top-0 z-10 border-b bg-card/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-lg items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Назад"
              render={<Link href="/" />}
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
            </Button>
            <div className="flex items-center gap-2">
              <Shield className="size-5 text-primary" aria-hidden="true" />
              <p className="font-display text-base font-bold">Администрирование</p>
            </div>
          </div>
          <Button size="sm" className="gap-1.5" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" aria-hidden="true" />
            Прогулка
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-4">
        {trips.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed bg-card/50 px-6 py-12 text-center">
            <p className="font-medium">Расписание пусто</p>
            <p className="text-sm text-muted-foreground text-pretty">
              Добавьте первую прогулку кнопкой «Прогулка».
            </p>
            <Button className="mt-2 gap-1.5" onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" aria-hidden="true" />
              Добавить прогулку
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {trips.map((trip) => (
              <AdminTripCard
                key={trip.id}
                trip={trip}
                allTrips={trips}
                onDeleteTrip={() => handleDeleteTrip(trip.id)}
                onCancelBooking={handleCancelBooking}
                onReschedule={handleReschedule}
              />
            ))}
          </div>
        )}
      </main>

      <CreateTripDialog
        open={createOpen}
        pending={pending}
        onClose={() => setCreateOpen(false)}
        onConfirm={handleCreate}
      />
    </div>
  )
}

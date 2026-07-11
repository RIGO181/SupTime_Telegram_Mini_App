"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type CreateInput = {
  title: string
  startsAt: string
  durationMinutes: number
  capacity: number
  location?: string
  price?: number
  notes?: string
}

function defaultDateTime(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  d.setHours(10, 0, 0, 0)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function CreateTripDialog({
  open,
  pending,
  onClose,
  onConfirm,
}: {
  open: boolean
  pending: boolean
  onClose: () => void
  onConfirm: (input: CreateInput) => void
}) {
  const [title, setTitle] = useState("Прогулка на сапбордах")
  const [startsAt, setStartsAt] = useState(defaultDateTime())
  const [duration, setDuration] = useState("90")
  const [capacity, setCapacity] = useState("8")
  const [location, setLocation] = useState("")
  const [price, setPrice] = useState("")
  const [notes, setNotes] = useState("")

  function submit() {
    if (!startsAt) return
    onConfirm({
      title,
      startsAt: new Date(startsAt).toISOString(),
      durationMinutes: Number(duration) || 90,
      capacity: Number(capacity) || 8,
      location: location || undefined,
      price: price ? Number(price) : undefined,
      notes: notes || undefined,
    })
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Новая прогулка</DialogTitle>
          <DialogDescription>Заполните детали прогулки для расписания.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-1">
          <div className="flex flex-col gap-2">
            <Label htmlFor="title">Название</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="startsAt">Дата и время</Label>
            <Input
              id="startsAt"
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="duration">Длительность (мин)</Label>
              <Input
                id="duration"
                type="number"
                inputMode="numeric"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="capacity">Мест</Label>
              <Input
                id="capacity"
                type="number"
                inputMode="numeric"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="price">Цена (₽)</Label>
              <Input
                id="price"
                type="number"
                inputMode="numeric"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="необяз."
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="location">Место</Label>
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Причал"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="notes">Заметка (необязательно)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Что взять с собой, детали инструктажа…"
              rows={2}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={onClose}>
            Отмена
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            Добавить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

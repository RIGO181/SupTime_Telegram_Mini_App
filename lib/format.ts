const TZ = "Europe/Moscow"

export function formatFullDate(d: Date | string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    weekday: "short",
    day: "numeric",
    month: "long",
    timeZone: TZ,
  }).format(new Date(d))
}

export function formatTime(d: Date | string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TZ,
  }).format(new Date(d))
}

export function formatDateTime(d: Date | string): string {
  return `${formatFullDate(d)}, ${formatTime(d)}`
}

export function formatPrice(price: number | null): string | null {
  if (price == null) return null
  return new Intl.NumberFormat("ru-RU").format(price) + " ₽"
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h && m) return `${h} ч ${m} мин`
  if (h) return `${h} ч`
  return `${m} мин`
}

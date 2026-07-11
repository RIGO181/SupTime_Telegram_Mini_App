"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Waves, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData: string
        ready: () => void
        expand: () => void
        colorScheme?: string
      }
    }
  }
}

export function AuthGate() {
  const router = useRouter()
  const [status, setStatus] = useState<"checking" | "dev">("checking")
  const [devName, setDevName] = useState("")
  const [devAdmin, setDevAdmin] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const wa = window.Telegram?.WebApp
    const initData = wa?.initData
    if (wa && initData) {
      wa.ready()
      wa.expand()
      fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initData }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.session) {
            router.refresh()
          } else {
            setStatus("dev")
          }
        })
        .catch(() => setStatus("dev"))
    } else {
      // Not inside Telegram (e.g. browser preview) — show dev login.
      setStatus("dev")
    }
  }, [router])

  async function devLogin() {
    setLoading(true)
    const id = devAdmin ? "1000000" : String(1000001 + Math.floor(Math.random() * 9000))
    const res = await fetch("/api/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dev: { id, firstName: devName.trim() || "Гость", username: devName.trim().toLowerCase() },
      }),
    })
    if (res.ok) {
      router.refresh()
    } else {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center gap-6 px-6 py-10 text-center">
      <div className="flex flex-col items-center gap-4">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <Waves className="size-8" aria-hidden="true" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-balance">Прогулки на сапбордах</h1>
          <p className="mt-1 text-sm text-muted-foreground text-pretty">
            Бронируйте прогулки по воде за пару касаний
          </p>
        </div>
      </div>

      {status === "checking" ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          <span className="text-sm">Авторизация через Telegram…</span>
        </div>
      ) : (
        <div className="w-full max-w-xs flex flex-col gap-4 rounded-2xl border bg-card p-5 text-left shadow-sm">
          <p className="text-xs text-muted-foreground text-pretty">
            Режим предпросмотра. В Telegram вход выполняется автоматически. Здесь можно войти как гость для теста.
          </p>
          <div className="flex flex-col gap-2">
            <Label htmlFor="devname">Ваше имя</Label>
            <Input
              id="devname"
              value={devName}
              onChange={(e) => setDevName(e.target.value)}
              placeholder="Например, Анна"
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={devAdmin}
              onChange={(e) => setDevAdmin(e.target.checked)}
              className="size-4 accent-[var(--primary)]"
            />
            Войти как администратор
          </label>
          <Button onClick={devLogin} disabled={loading} className="w-full">
            {loading && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            Войти
          </Button>
        </div>
      )}
    </main>
  )
}

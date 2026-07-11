import { NextResponse } from "next/server"
import { validateInitData, type TelegramUser } from "@/lib/telegram"
import { createSession, clearSession } from "@/lib/session"

function devLoginAllowed(): boolean {
  return !process.env.TELEGRAM_BOT_TOKEN || process.env.NODE_ENV !== "production"
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const botToken = process.env.TELEGRAM_BOT_TOKEN

  // Real Telegram Mini App flow
  if (body.initData && botToken) {
    const user = validateInitData(body.initData, botToken)
    if (!user) {
      return NextResponse.json({ error: "Недействительные данные Telegram" }, { status: 401 })
    }
    const session = await createSession(user)
    return NextResponse.json({ session })
  }

  // Dev / browser-preview fallback (no Telegram context available)
  if (body.dev && devLoginAllowed()) {
    const user: TelegramUser = {
      id: String(body.dev.id ?? "1000001"),
      firstName: body.dev.firstName ?? "Гость",
      lastName: undefined,
      username: body.dev.username ?? undefined,
    }
    const session = await createSession(user)
    return NextResponse.json({ session })
  }

  return NextResponse.json({ error: "Не удалось авторизоваться" }, { status: 401 })
}

export async function DELETE() {
  await clearSession()
  return NextResponse.json({ ok: true })
}

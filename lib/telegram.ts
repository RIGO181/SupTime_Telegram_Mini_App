import crypto from "crypto"

export type TelegramUser = {
  id: string
  firstName: string
  lastName?: string
  username?: string
}

/**
 * Validates Telegram WebApp initData using the bot token, per Telegram's spec.
 * Returns the parsed user when valid, otherwise null.
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
export function validateInitData(initData: string, botToken: string): TelegramUser | null {
  if (!initData || !botToken) return null

  const params = new URLSearchParams(initData)
  const hash = params.get("hash")
  if (!hash) return null

  params.delete("hash")

  const dataCheckString = [...params.entries()]
    .map(([k, v]) => `${k}=${v}`)
    .sort()
    .join("\n")

  const secretKey = crypto.createHmac("sha256", "WebAppData").update(botToken).digest()
  const computedHash = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex")

  if (computedHash !== hash) return null

  // Optional freshness check: reject data older than 24h
  const authDate = Number(params.get("auth_date"))
  if (authDate && Date.now() / 1000 - authDate > 86400) return null

  try {
    const userRaw = params.get("user")
    if (!userRaw) return null
    const u = JSON.parse(userRaw)
    return {
      id: String(u.id),
      firstName: u.first_name ?? "",
      lastName: u.last_name ?? undefined,
      username: u.username ?? undefined,
    }
  } catch {
    return null
  }
}

/** Sends a plain text message to a Telegram chat via the Bot API. */
export async function sendTelegramMessage(chatId: string, text: string): Promise<boolean> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN
  if (!botToken) {
    console.log("[v0] TELEGRAM_BOT_TOKEN not set, skipping message send")
    return false
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
      }),
    })
    const data = await res.json()
    if (!data.ok) {
      console.log("[v0] Telegram sendMessage failed:", data.description)
    }
    return Boolean(data.ok)
  } catch (err) {
    console.log("[v0] Telegram sendMessage error:", (err as Error).message)
    return false
  }
}

export function getAdminIds(): string[] {
  return (process.env.ADMIN_TELEGRAM_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
}

export function isAdminId(telegramId: string): boolean {
  const ids = getAdminIds()
  // In dev with no admins configured, allow everyone to test the admin panel.
  if (ids.length === 0 && process.env.NODE_ENV !== "production") return true
  return ids.includes(telegramId)
}

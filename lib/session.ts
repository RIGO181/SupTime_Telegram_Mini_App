import crypto from "crypto"
import { cookies } from "next/headers"
import { isAdminId, type TelegramUser } from "./telegram"

const COOKIE_NAME = "sap_session"

export type Session = {
  id: string
  firstName: string
  lastName?: string
  username?: string
  isAdmin: boolean
}

function getSecret(): string {
  return process.env.TELEGRAM_BOT_TOKEN || process.env.SESSION_SECRET || "dev-secret-sapboards"
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", getSecret()).update(payload).digest("hex")
}

function encode(session: Session): string {
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url")
  return `${payload}.${sign(payload)}`
}

function decode(token: string): Session | null {
  const [payload, signature] = token.split(".")
  if (!payload || !signature) return null
  if (sign(payload) !== signature) return null
  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Session
  } catch {
    return null
  }
}

export async function createSession(user: TelegramUser): Promise<Session> {
  const session: Session = {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    username: user.username,
    isAdmin: isAdminId(user.id),
  }
  const jar = await cookies()
  jar.set(COOKIE_NAME, encode(session), {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  })
  return session
}

export async function getSession(): Promise<Session | null> {
  const jar = await cookies()
  const token = jar.get(COOKIE_NAME)?.value
  if (!token) return null
  return decode(token)
}

export async function requireSession(): Promise<Session> {
  const session = await getSession()
  if (!session) throw new Error("Unauthorized")
  return session
}

export async function requireAdmin(): Promise<Session> {
  const session = await requireSession()
  if (!session.isAdmin) throw new Error("Forbidden")
  return session
}

export async function clearSession(): Promise<void> {
  const jar = await cookies()
  jar.delete(COOKIE_NAME)
}

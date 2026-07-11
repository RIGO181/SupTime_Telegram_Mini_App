import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core"

export const trips = pgTable("trips", {
  id: serial("id").primaryKey(),
  title: text("title").notNull().default("Прогулка на сапбордах"),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  durationMinutes: integer("duration_minutes").notNull().default(90),
  capacity: integer("capacity").notNull().default(8),
  location: text("location"),
  price: integer("price"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  tripId: integer("trip_id").notNull(),
  telegramId: text("telegram_id").notNull(),
  userName: text("user_name").notNull(),
  username: text("username"),
  phone: text("phone"),
  spots: integer("spots").notNull().default(1),
  // 'active' | 'cancelled'
  status: text("status").notNull().default("active"),
  reminderSentAt: timestamp("reminder_sent_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

export type Trip = typeof trips.$inferSelect
export type Booking = typeof bookings.$inferSelect

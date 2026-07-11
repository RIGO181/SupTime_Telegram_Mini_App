import { getSession } from "@/lib/session"
import { getUpcomingTrips, getMyBookings } from "@/app/actions/bookings"
import { AuthGate } from "@/components/auth-gate"
import { BookingApp } from "@/components/booking-app"

export const dynamic = "force-dynamic"

export default async function Page() {
  const session = await getSession()
  if (!session) {
    return <AuthGate />
  }

  const [trips, myBookings] = await Promise.all([getUpcomingTrips(), getMyBookings()])

  return (
    <BookingApp
      session={{ firstName: session.firstName, isAdmin: session.isAdmin }}
      initialTrips={trips}
      initialBookings={myBookings}
    />
  )
}

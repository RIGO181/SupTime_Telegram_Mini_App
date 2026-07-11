import { redirect } from "next/navigation"
import { getSession } from "@/lib/session"
import { getAdminTrips } from "@/app/actions/admin"
import { AdminApp } from "@/components/admin-app"

export const dynamic = "force-dynamic"

export default async function AdminPage() {
  const session = await getSession()
  if (!session) redirect("/")
  if (!session.isAdmin) redirect("/")

  const trips = await getAdminTrips()

  return <AdminApp trips={trips} />
}

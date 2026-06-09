import { redirect } from "next/navigation"
import { auth } from "@/auth"
import DashboardClient from "./DashboardClient"

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const firstName = session.user.name?.split(" ")[0] ?? ""

  return <DashboardClient firstName={firstName} />
}

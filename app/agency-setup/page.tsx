import { redirect } from "next/navigation"

export default function AgencySetupPage() {
  redirect("/managed/apply?plan=Agency&type=company")
}

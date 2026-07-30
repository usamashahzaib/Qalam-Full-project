import { redirect } from "next/navigation"
import { AGENCY_PLAN_LIVE } from "@/lib/pricing"

export default function AgencySetupPage() {
  redirect(AGENCY_PLAN_LIVE ? "/managed/apply?plan=Agency&type=company" : "/pricing")
}

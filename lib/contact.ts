const readPublic = (key: string): string => process.env[key]?.trim() || ""

export const SUPPORT_EMAIL =
  readPublic("NEXT_PUBLIC_SUPPORT_EMAIL") || "support@byqalam.com"

export const UPGRADES_EMAIL =
  readPublic("NEXT_PUBLIC_UPGRADES_EMAIL") || readPublic("NEXT_PUBLIC_SUPPORT_EMAIL") || "support@byqalam.com"

export const CONTACT_INBOXES = [
  {
    title: "Sales and upgrades",
    desc: "Plan selection, manual upgrades, agency onboarding, and commercial questions.",
    value: UPGRADES_EMAIL,
    href: `mailto:${UPGRADES_EMAIL}`,
  },
  {
    title: "General support",
    desc: "Product questions, support, partnerships, and public site issues.",
    value: SUPPORT_EMAIL,
    href: `mailto:${SUPPORT_EMAIL}`,
  },
] as const

export const MANUAL_UPGRADE_METHODS = ["Easypaisa", "JazzCash", "Bank transfer"] as const

export const MANUAL_UPGRADE_SLA = "Payment confirmations are reviewed manually. Plan access is normally updated within 24 hours."

export const upgradesMailUrl = (plan: string, email: string): string => {
  const body = encodeURIComponent(
    `Hi,\n\nI'd like to upgrade my Qalam workspace to the ${plan} plan.\n\nMy email: ${email || ""}\n\nPlease send me payment instructions.\n\nThank you.`
  )
  return `mailto:${UPGRADES_EMAIL}?subject=${encodeURIComponent(`Upgrade to ${plan}`)}&body=${body}`
}

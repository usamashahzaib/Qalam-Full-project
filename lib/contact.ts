const readPublic = (key: string): string => process.env[key]?.trim() || ""

export const SUPPORT_WHATSAPP =
  readPublic("NEXT_PUBLIC_SUPPORT_WHATSAPP") || "+923714156567"

export const SUPPORT_EMAIL =
  readPublic("NEXT_PUBLIC_SUPPORT_EMAIL") || "info@byqalam.com"

export const UPGRADES_EMAIL =
  readPublic("NEXT_PUBLIC_UPGRADES_EMAIL") || readPublic("NEXT_PUBLIC_SUPPORT_EMAIL") || "business@byqalam.com"

export const SUPPORT_WHATSAPP_URL = (() => {
  const digits = SUPPORT_WHATSAPP.replace(/[^0-9]/g, "")
  return `https://wa.me/${digits}`
})()

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

export const whatsappUpgradeUrl = (plan: string, email: string, amountPkr: number): string => {
  const msg = encodeURIComponent(
    `Hi, I want to upgrade my Qalam workspace to the ${plan} plan (PKR ${amountPkr}/month). My email is ${email || "[your email]"}.`
  )
  return `${SUPPORT_WHATSAPP_URL}?text=${msg}`
}

export const upgradesMailUrl = (plan: string, email: string): string => {
  const body = encodeURIComponent(
    `Hi,\n\nI'd like to upgrade my Qalam workspace to the ${plan} plan.\n\nMy email: ${email || ""}\n\nPlease send me payment instructions.\n\nThank you.`
  )
  return `mailto:${UPGRADES_EMAIL}?subject=${encodeURIComponent(`Upgrade to ${plan}`)}&body=${body}`
}

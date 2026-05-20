// Client-safe contact config. Server env reads APP_SUPPORT_WHATSAPP / APP_SUPPORT_EMAIL.
// For client components, expose via NEXT_PUBLIC_SUPPORT_WHATSAPP / NEXT_PUBLIC_SUPPORT_EMAIL.
export const SUPPORT_WHATSAPP =
  process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP ?? "+923714156567"

export const SUPPORT_EMAIL =
  process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "info@byqalam.com"

export const UPGRADES_EMAIL =
  process.env.NEXT_PUBLIC_UPGRADES_EMAIL ?? "business@byqalam.com"

export const whatsappUpgradeUrl = (plan: string, email: string, amountPkr: number): string => {
  const num = SUPPORT_WHATSAPP.replace(/[^0-9]/g, "")
  const msg = encodeURIComponent(
    `Hi, I want to upgrade my Qalam workspace to the ${plan} plan (PKR ${amountPkr}/month). My email is ${email || "[your email]"}.`
  )
  return `https://wa.me/${num}?text=${msg}`
}

export const upgradesMailUrl = (plan: string, email: string): string => {
  const body = encodeURIComponent(
    `Hi,\n\nI'd like to upgrade my Qalam workspace to the ${plan} plan.\n\nMy email: ${email || ""}\n\nPlease send me payment instructions.\n\nThank you.`
  )
  return `mailto:${UPGRADES_EMAIL}?subject=${encodeURIComponent(`Upgrade to ${plan}`)}&body=${body}`
}

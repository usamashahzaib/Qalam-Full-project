const isLocalUrl = (value?: string) => /^(https?:\/\/)?(localhost|127\.0\.0\.1|::1)(:\d+)?/i.test(value?.trim() || "")

export const hasValidClerkPublishableKey = () => {
  if ([process.env.NEXT_PUBLIC_SITE_URL, process.env.NEXT_PUBLIC_APP_URL, process.env.FRONTEND_ORIGIN].some(isLocalUrl)) return false
  return /^pk_(test|live)_/.test(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim() || "")
}

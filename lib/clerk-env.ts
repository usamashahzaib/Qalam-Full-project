export const hasValidClerkPublishableKey = () => {
  return /^pk_(test|live)_/.test(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim() || "")
}

import { redirect } from "next/navigation"

// The actual verification logic is handled by GET /api/auth/verify-email,
// which redirects here only if the token lookup succeeds or fails.
// This page is a fallback for direct navigation without a token.
export default function VerifyEmailPage() {
  redirect("/login")
}

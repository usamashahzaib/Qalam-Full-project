import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Create Account",
  description: "Create your free Qalam account. No credit card required.",
  robots: { index: false },
}

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

import type { Metadata } from "next"
import { AppHostHead } from "@/components/AppHostHead"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Create Account",
  description: "Create your free Qalam account. No credit card required.",
  robots: { index: false },
}

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return <><AppHostHead />{children}</>
}

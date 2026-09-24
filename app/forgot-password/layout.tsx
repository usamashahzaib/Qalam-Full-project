import type { Metadata } from "next"
import { AppHostHead } from "@/components/AppHostHead"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Reset Password",
  description: "Reset your Qalam account password.",
  robots: { index: false },
}

export default function ForgotPasswordLayout({ children }: { children: React.ReactNode }) {
  return <><AppHostHead />{children}</>
}

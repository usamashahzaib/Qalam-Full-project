"use client"

import { signIn } from "next-auth/react"
import { useSearchParams } from "next/navigation"

export default function LoginPage() {
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard"

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="max-w-md w-full space-y-8 p-8">
        <h2 className="text-3xl font-bold text-center">Welcome back</h2>
        <p className="text-center text-gray-600">New to Qalam? Create a free account</p>
        <button
          onClick={() => signIn("linkedin", { callbackUrl })}
          className="w-full flex items-center justify-center gap-3 bg-[#0077b5] text-white py-3 px-4 rounded-lg hover:bg-[#006396] transition"
        >
          Continue with LinkedIn
        </button>
        <p className="text-xs text-center text-gray-500">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  )
}

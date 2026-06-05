"use client"

import { useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setTimeout(() => setLoading(false), 1500)
  }

  return (
    <div className="min-h-screen flex font-jakarta">
      {/* Left decorative panel */}
      <div className="hidden lg:flex w-1/2 bg-teal relative overflow-hidden flex-col justify-between p-12">
        {/* Background blobs */}
        <div
          className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full opacity-25 mesh-blob"
          style={{
            background: "radial-gradient(circle, rgba(255,255,255,0.2) 0%, transparent 70%)",
            "--dur": "18s",
          } as React.CSSProperties}
        />
        <div
          className="absolute bottom-[-20%] left-[-10%] w-[400px] h-[400px] rounded-full opacity-20 mesh-blob"
          style={{
            background: "radial-gradient(circle, rgba(201,135,31,0.4) 0%, transparent 70%)",
            "--dur": "22s",
            animationDelay: "5s",
          } as React.CSSProperties}
        />

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 relative z-10">
          <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
              <path d="M3 13 C3 13 5 11 8 7 C11 3 13 2 13 2" stroke="#C9871F" strokeWidth="2" strokeLinecap="round" />
              <circle cx="13" cy="2" r="1.5" fill="#C9871F" />
              <path d="M3 13 L2 14.5" stroke="#C9871F" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <span className="text-xl font-bold text-white">Qalam</span>
        </Link>

        {/* Quote */}
        <div className="relative z-10">
          <blockquote className="font-cormorant text-3xl italic text-white/90 leading-relaxed mb-6">
            &ldquo;Qalam turned my LinkedIn from a ghost town to a lead machine. I get DMs from new clients every single week now.&rdquo;
          </blockquote>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gold flex items-center justify-center text-white text-sm font-bold">
              MW
            </div>
            <div>
              <p className="text-white font-semibold text-sm">Marcus Williams</p>
              <p className="text-white/60 text-xs">Founder @ DevPulse · 28K followers</p>
            </div>
          </div>
          {/* Stars */}
          <div className="flex gap-0.5 mt-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <span key={i} className="text-gold text-base">★</span>
            ))}
          </div>
        </div>
      </div>

      {/* Right: auth form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-white">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-[420px]"
        >
          {/* Mobile logo */}
          <Link href="/" className="flex items-center gap-2 mb-10 lg:hidden">
            <div className="w-8 h-8 rounded-lg bg-teal flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 13 C3 13 5 11 8 7 C11 3 13 2 13 2" stroke="#C9871F" strokeWidth="2" strokeLinecap="round" />
                <circle cx="13" cy="2" r="1.5" fill="#C9871F" />
                <path d="M3 13 L2 14.5" stroke="#C9871F" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <span className="text-xl font-bold text-teal">Qalam</span>
          </Link>

          <h1 className="text-3xl font-extrabold text-zinc-900 mb-2">Welcome back</h1>
          <p className="text-zinc-500 mb-8">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-teal font-semibold hover:underline">
              Sign up free →
            </Link>
          </p>

          {/* Social logins */}
          <div className="flex flex-col gap-3 mb-8">
            <button className="flex items-center justify-center gap-3 w-full py-3 rounded-xl border border-zinc-200 text-zinc-700 text-sm font-semibold hover:bg-zinc-50 hover:border-zinc-300 transition-all">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M17.64 9.2A10.34 10.34 0 0 0 17.52 8H9v3.47h4.84A4.14 4.14 0 0 1 12.08 13.7v2.26h2.8C16.52 14.42 17.64 12 17.64 9.2Z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.79-2.18c-.8.54-1.81.86-3.17.86-2.44 0-4.5-1.65-5.23-3.87H.89v2.26A8.97 8.97 0 0 0 9 18Z" fill="#34A853"/>
                <path d="M3.77 10.63A5.4 5.4 0 0 1 3.49 9c0-.56.1-1.1.28-1.63V5.1H.89A9 9 0 0 0 0 9c0 1.45.35 2.82.89 4.06l2.88-2.43Z" fill="#FBBC05"/>
                <path d="M9 3.58c1.32 0 2.5.45 3.44 1.34l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .89 5.1l2.88 2.27C4.5 5.23 6.56 3.58 9 3.58Z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>
            <button className="flex items-center justify-center gap-3 w-full py-3 rounded-xl bg-[#0A66C2] text-white text-sm font-semibold hover:bg-[#085fa8] transition-colors">
              <span className="font-bold text-base">in</span>
              Continue with LinkedIn
            </button>
          </div>

          <div className="flex items-center gap-3 mb-8">
            <div className="flex-1 h-px bg-zinc-100" />
            <span className="text-xs text-zinc-400 font-medium">or continue with email</span>
            <div className="flex-1 h-px bg-zinc-100" />
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-semibold text-zinc-700 mb-1.5">Email address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full px-4 py-3 rounded-xl border border-zinc-200 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal/50 transition-all"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-semibold text-zinc-700">Password</label>
                <Link href="/forgot-password" className="text-xs text-teal hover:underline">
                  Forgot password?
                </Link>
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl border border-zinc-200 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal/50 transition-all"
              />
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-teal text-white font-bold rounded-xl text-sm hover:bg-teal-600 transition-colors shadow-[0_4px_20px_rgba(13,74,69,0.3)] mt-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? "Signing in..." : "Sign In →"}
            </motion.button>
          </form>

          <p className="text-xs text-zinc-400 text-center mt-6">
            By signing in, you agree to our{" "}
            <Link href="/terms" className="underline hover:text-zinc-600">Terms</Link>
            {" "}and{" "}
            <Link href="/privacy" className="underline hover:text-zinc-600">Privacy Policy</Link>
          </p>
        </motion.div>
      </div>
    </div>
  )
}

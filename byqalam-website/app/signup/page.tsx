"use client"

import { useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"

const SOCIAL_PROOF = [
  "12,000+ active creators",
  "4.9 ★ rating",
  "Free forever plan",
]

export default function SignupPage() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [agreed, setAgreed] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!agreed) return
    setLoading(true)
    setTimeout(() => setLoading(false), 1500)
  }

  return (
    <div className="min-h-screen flex font-jakarta">
      {/* Right: decorative panel */}
      <div className="hidden lg:flex w-1/2 bg-teal-800 relative overflow-hidden flex-col justify-between p-12 order-2">
        <div
          className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full opacity-20 mesh-blob"
          style={{
            background: "radial-gradient(circle, rgba(201,135,31,0.4) 0%, transparent 70%)",
            "--dur": "20s",
          } as React.CSSProperties}
        />
        <div
          className="absolute bottom-[-20%] left-[-10%] w-[400px] h-[400px] rounded-full opacity-25 mesh-blob"
          style={{
            background: "radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%)",
            "--dur": "16s",
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

        {/* Stats */}
        <div className="relative z-10 space-y-8">
          <div>
            <h2 className="text-4xl font-extrabold text-white mb-3 leading-tight">
              Start growing your<br />
              <span className="text-gold">LinkedIn audience</span>
              <br />today.
            </h2>
            <p className="font-cormorant text-xl italic text-white/60 leading-relaxed">
              No credit card required. Free forever plan included.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {[
              { icon: "📈", label: "Average engagement increase", value: "+340%" },
              { icon: "⏱️", label: "Time saved per post", value: "47 min" },
              { icon: "🚀", label: "Follower growth (30 days)", value: "×3–8×" },
            ].map((stat) => (
              <div key={stat.label} className="flex items-center gap-4 bg-white/5 rounded-xl p-4 border border-white/10">
                <span className="text-2xl">{stat.icon}</span>
                <div>
                  <p className="text-white/60 text-xs">{stat.label}</p>
                  <p className="text-white font-bold text-xl">{stat.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Left: auth form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-white order-1">
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

          <h1 className="text-3xl font-extrabold text-zinc-900 mb-1">Create your account</h1>
          <p className="text-zinc-500 mb-6">
            Already have an account?{" "}
            <Link href="/login" className="text-teal font-semibold hover:underline">
              Sign in →
            </Link>
          </p>

          {/* Trust chips */}
          <div className="flex flex-wrap gap-2 mb-7">
            {SOCIAL_PROOF.map((proof) => (
              <span
                key={proof}
                className="text-xs text-zinc-600 bg-zinc-50 border border-zinc-200 px-3 py-1 rounded-full"
              >
                ✓ {proof}
              </span>
            ))}
          </div>

          {/* Social logins */}
          <div className="flex flex-col gap-3 mb-7">
            <button className="flex items-center justify-center gap-3 w-full py-3 rounded-xl border border-zinc-200 text-zinc-700 text-sm font-semibold hover:bg-zinc-50 hover:border-zinc-300 transition-all">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M17.64 9.2A10.34 10.34 0 0 0 17.52 8H9v3.47h4.84A4.14 4.14 0 0 1 12.08 13.7v2.26h2.8C16.52 14.42 17.64 12 17.64 9.2Z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.79-2.18c-.8.54-1.81.86-3.17.86-2.44 0-4.5-1.65-5.23-3.87H.89v2.26A8.97 8.97 0 0 0 9 18Z" fill="#34A853"/>
                <path d="M3.77 10.63A5.4 5.4 0 0 1 3.49 9c0-.56.1-1.1.28-1.63V5.1H.89A9 9 0 0 0 0 9c0 1.45.35 2.82.89 4.06l2.88-2.43Z" fill="#FBBC05"/>
                <path d="M9 3.58c1.32 0 2.5.45 3.44 1.34l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .89 5.1l2.88 2.27C4.5 5.23 6.56 3.58 9 3.58Z" fill="#EA4335"/>
              </svg>
              Sign up with Google
            </button>
            <button className="flex items-center justify-center gap-3 w-full py-3 rounded-xl bg-[#0A66C2] text-white text-sm font-semibold hover:bg-[#085fa8] transition-colors">
              <span className="font-bold text-base">in</span>
              Sign up with LinkedIn
            </button>
          </div>

          <div className="flex items-center gap-3 mb-7">
            <div className="flex-1 h-px bg-zinc-100" />
            <span className="text-xs text-zinc-400 font-medium">or sign up with email</span>
            <div className="flex-1 h-px bg-zinc-100" />
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-semibold text-zinc-700 mb-1.5">Full name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Sarah Chen"
                className="w-full px-4 py-3 rounded-xl border border-zinc-200 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal/50 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-zinc-700 mb-1.5">Work email</label>
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
              <label className="block text-sm font-semibold text-zinc-700 mb-1.5">Password</label>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 8 characters"
                className="w-full px-4 py-3 rounded-xl border border-zinc-200 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal/50 transition-all"
              />
            </div>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 rounded border-zinc-300 text-teal accent-teal"
              />
              <span className="text-xs text-zinc-500 leading-relaxed">
                I agree to the{" "}
                <Link href="/terms" className="text-teal underline underline-offset-2">Terms of Service</Link>
                {" "}and{" "}
                <Link href="/privacy" className="text-teal underline underline-offset-2">Privacy Policy</Link>.
                I&apos;m okay with Qalam sending me product updates (unsubscribe anytime).
              </span>
            </label>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              type="submit"
              disabled={!agreed || loading}
              className="w-full py-3.5 bg-teal text-white font-bold rounded-xl text-sm hover:bg-teal-600 transition-colors shadow-[0_4px_20px_rgba(13,74,69,0.3)] mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Creating account..." : "Create Free Account →"}
            </motion.button>
          </form>

          <p className="text-xs text-zinc-400 text-center mt-5">
            No credit card required · Cancel anytime
          </p>
        </motion.div>
      </div>
    </div>
  )
}

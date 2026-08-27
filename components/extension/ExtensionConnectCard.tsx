"use client"

import { useState } from "react"
import Link from "next/link"

type ConnectState = "idle" | "loading" | "ready" | "error"

export function ExtensionConnectCard() {
  const [state, setState] = useState<ConnectState>("idle")
  const [code, setCode] = useState("")
  const [message, setMessage] = useState("")

  const generateCode = async () => {
    setState("loading")
    setMessage("")
    try {
      const response = await fetch("/api/extension/connect", { method: "POST", cache: "no-store" })
      const data = await response.json() as { token?: string; error?: string }
      if (response.status === 401) {
        setState("error")
        setMessage("Sign in to Qalam first, then return here to create a connection code.")
        return
      }
      if (!response.ok || !data.token) throw new Error(data.error || "Could not create a connection code.")
      setCode(data.token)
      setState("ready")
    } catch (error) {
      setState("error")
      setMessage(error instanceof Error ? error.message : "Could not create a connection code.")
    }
  }

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setMessage("Connection code copied. Paste it into the Qalam extension popup.")
    } catch {
      setMessage("Copy the connection code manually, then paste it into the Qalam extension popup.")
    }
  }

  return (
    <div className="rounded-3xl border border-teal/20 bg-white p-5 shadow-[0_24px_80px_rgba(13,74,69,0.12)] sm:p-8">
      <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-teal text-xl font-bold text-white">Q</div>
      <h1 className="text-3xl font-bold tracking-tight text-zinc-950">Connect Qalam for LinkedIn</h1>
      <p className="mt-3 max-w-xl text-base leading-7 text-zinc-600">Create a short-lived connection code for this browser. It uses your existing Qalam plan and comment allowance.</p>

      <ol className="mt-7 space-y-3 text-sm text-zinc-700">
        <li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal/10 text-xs font-bold text-teal">1</span><span><a className="font-semibold text-teal underline underline-offset-2" href="/downloads/qalam-linkedin-extension.zip">Download the Qalam extension package</a> and load it in Chrome.</span></li>
        <li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal/10 text-xs font-bold text-teal">2</span><span>Generate and copy a connection code below.</span></li>
        <li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal/10 text-xs font-bold text-teal">3</span><span>Open the extension popup and paste the code. It expires in 7 days.</span></li>
      </ol>

      <div className="mt-7 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
        {state !== "ready" ? (
          <button onClick={generateCode} disabled={state === "loading"} className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-teal px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-600 disabled:cursor-not-allowed disabled:opacity-60">
            {state === "loading" ? "Generating connection code..." : "Generate connection code"}
          </button>
        ) : (
          <>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">Connection code</p>
            <textarea readOnly value={code} aria-label="Qalam extension connection code" className="min-h-24 w-full rounded-xl border border-zinc-200 bg-white p-3 font-mono text-xs text-zinc-700 outline-none" />
            <button onClick={copyCode} className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-teal px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-600">Copy connection code</button>
          </>
        )}
        {message && <p role="status" className={`mt-3 text-sm ${state === "error" ? "text-red-700" : "text-teal"}`}>{message}</p>}
      </div>

      <p className="mt-5 text-xs leading-5 text-zinc-500">Qalam does not receive your LinkedIn password and never posts on your behalf. The extension only sends the visible post text after you choose Generate with Qalam.</p>
      <Link href="/linkedin-extension" className="mt-5 inline-flex min-h-11 items-center text-sm font-semibold text-teal underline underline-offset-4">Read how the extension works</Link>
    </div>
  )
}

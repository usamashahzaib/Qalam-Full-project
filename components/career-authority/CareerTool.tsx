"use client"

import { useState } from "react"

type Tool = "linkedin" | "resume" | "job-match"
type Result = { summary?: string; score?: number; dimensions?: { name: string; score: number; reason: string }[]; recommendations?: string[]; rewrites?: { section: string; text: string }[]; gaps?: string[] }

const copy = {
  linkedin: { title: "LinkedIn Authority Audit", intro: "Paste your profile. Get a source-grounded score, section rewrites, and a prioritized improvement plan.", primary: "Profile text" },
  resume: { title: "ATS Resume Builder", intro: "Paste your resume. Get ATS-safe structure, truthful rewrites, and evidence gaps to resolve.", primary: "Resume text" },
  "job-match": { title: "Job Description Match", intro: "Compare your resume with one job description. See supported evidence, honest rewrites, and real gaps.", primary: "Resume text" },
} as const

export function CareerTool({ tool }: { tool: Tool }) {
  const [primary, setPrimary] = useState("")
  const [jobDescription, setJobDescription] = useState("")
  const [targetRole, setTargetRole] = useState("")
  const [result, setResult] = useState<Result | null>(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const label = copy[tool]

  const submit = async () => {
    setLoading(true); setError("")
    try {
      const response = await fetch("/api/career/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tool, targetRole, profile: tool === "linkedin" ? primary : "", resume: tool === "linkedin" ? "" : primary, jobDescription }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Analysis failed")
      setResult(data.result)
    } catch (cause) { setError((cause as Error).message) } finally { setLoading(false) }
  }

  return <main className="min-h-screen bg-zinc-50 pb-20 pt-28 text-zinc-900"><div className="mx-auto max-w-5xl px-5 sm:px-8"><header className="border-b border-zinc-200 pb-10"><p className="text-sm font-bold uppercase tracking-[.18em] text-teal">Career tools</p><h1 className="mt-4 text-4xl font-extrabold sm:text-5xl">{label.title}</h1><p className="mt-4 max-w-2xl text-lg leading-8 text-zinc-600">{label.intro}</p></header><section className="mt-10 grid gap-8 lg:grid-cols-2"><div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"><label className="text-sm font-bold">Target role <span className="font-normal text-zinc-400">(optional)</span></label><input value={targetRole} onChange={(e) => setTargetRole(e.target.value)} className="mt-2 w-full rounded-xl border border-zinc-300 px-4 py-3" placeholder="e.g. Product Manager" /><label className="mt-5 block text-sm font-bold">{label.primary}</label><textarea value={primary} onChange={(e) => setPrimary(e.target.value)} className="mt-2 min-h-72 w-full rounded-xl border border-zinc-300 p-4 leading-6" placeholder="Paste only information you can verify." />{tool === "job-match" && <><label className="mt-5 block text-sm font-bold">Job description</label><textarea value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} className="mt-2 min-h-48 w-full rounded-xl border border-zinc-300 p-4 leading-6" placeholder="Paste one target job description." /></>}<button onClick={submit} disabled={loading || !primary.trim() || (tool === "job-match" && !jobDescription.trim())} className="mt-5 min-h-11 w-full rounded-xl bg-teal px-5 py-3 font-bold text-white disabled:opacity-50">{loading ? "Analyzing…" : "Run analysis"}</button>{error && <p className="mt-3 text-sm text-red-700">{error.replaceAll("_", " ")}</p>}</div><div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">{result ? <div className="space-y-6"><div><p className="text-sm font-bold uppercase tracking-wide text-zinc-500">Result</p>{typeof result.score === "number" && <p className="mt-1 text-4xl font-extrabold text-teal">{result.score}/100</p>}<p className="mt-3 leading-7 text-zinc-700">{result.summary}</p></div>{result.dimensions?.length ? <div>{result.dimensions.map((item) => <div key={item.name} className="border-t border-zinc-100 py-3"><p className="font-bold">{item.name} · {item.score}/100</p><p className="mt-1 text-sm text-zinc-600">{item.reason}</p></div>)}</div> : null}{result.recommendations?.length ? <div><h2 className="font-bold">Priority actions</h2><ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-6 text-zinc-700">{result.recommendations.map((item) => <li key={item}>{item}</li>)}</ul></div> : null}{result.rewrites?.length ? <div><h2 className="font-bold">Suggested rewrites</h2>{result.rewrites.map((item) => <article key={item.section} className="mt-3 rounded-xl bg-zinc-50 p-4"><p className="text-xs font-bold uppercase text-zinc-500">{item.section}</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6">{item.text}</p></article>)}</div> : null}{result.gaps?.length ? <div><h2 className="font-bold">Gaps to resolve</h2><ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-6 text-zinc-700">{result.gaps.map((item) => <li key={item}>{item}</li>)}</ul></div> : null}</div> : <p className="text-sm leading-6 text-zinc-500">Your analysis will appear here. Qalam does not invent achievements, credentials, or qualifications.</p>}</div></section></div></main>
}

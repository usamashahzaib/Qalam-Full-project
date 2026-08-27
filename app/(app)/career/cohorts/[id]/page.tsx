"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"

type Member = {
  userId: string
  name: string
  email?: string
  targetRole: string
  bestResumeScore: number
  usage?: { linkedin_audits_used?: number; resume_reviews_used?: number }
}

export default function CohortProgressPage() {
  const params = useParams<{ id: string }>()
  const [data, setData] = useState<{ cohort?: { name: string; code: string; description: string }; members?: Member[]; error?: string }>({})
  useEffect(() => {
    fetch(`/api/career/cohorts/${params.id}`).then((response) => response.json()).then(setData).catch(() => setData({ error: "Progress could not be loaded." }))
  }, [params.id])
  if (data.error) return <main className="p-8 text-sm text-red-600">{data.error}</main>
  if (!data.cohort) return <main className="p-8 text-sm text-zinc-500">Loading cohort...</main>
  return (
    <main className="min-h-full bg-zinc-50/70 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="rounded-3xl bg-[#073f3b] px-7 py-8 text-white">
          <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-gold-700">Cohort progress</p><h1 className="mt-2 text-3xl font-bold">{data.cohort.name}</h1><p className="mt-2 text-sm text-white/70">{data.cohort.description}</p></div><span className="rounded-lg bg-white/10 px-3 py-2 font-mono text-sm font-bold">{data.cohort.code}</span></div>
        </header>
        <section className="mt-5 overflow-hidden rounded-2xl border border-zinc-200 bg-white">
          <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-zinc-50 text-xs uppercase text-zinc-500"><tr><th className="px-5 py-3">Learner</th><th className="px-5 py-3">Target role</th><th className="px-5 py-3">LinkedIn audits</th><th className="px-5 py-3">Resume reviews</th><th className="px-5 py-3">Best ATS score</th></tr></thead><tbody className="divide-y divide-zinc-100">{(data.members || []).map((member) => <tr key={member.userId}><td className="px-5 py-4"><p className="font-bold text-zinc-900">{member.name}</p>{member.email && <p className="text-xs text-zinc-400">{member.email}</p>}</td><td className="px-5 py-4 text-zinc-600">{member.targetRole || "Not set"}</td><td className="px-5 py-4 font-semibold">{member.usage?.linkedin_audits_used || 0}</td><td className="px-5 py-4 font-semibold">{member.usage?.resume_reviews_used || 0}</td><td className="px-5 py-4 font-bold text-teal">{member.bestResumeScore || "-"}</td></tr>)}</tbody></table></div>
          {!data.members?.length && <p className="px-5 py-12 text-center text-sm text-zinc-400">No learners yet. Share the cohort code.</p>}
        </section>
      </div>
    </main>
  )
}

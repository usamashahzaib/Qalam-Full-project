"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"

type Tab = "overview" | "resume" | "linkedin" | "vault"
type AuditResult = {
  overall_score?: number
  scores?: Record<string, number>
  market_position?: string
  diagnosis?: string
  headline?: string
  about?: string
  top_fixes?: string[]
  keywords?: string[]
  thirty_day_plan?: string[]
}
type ResumeResult = {
  overall_score?: number
  scores?: Record<string, number>
  verdict?: string
  risks?: string[]
  missing_keywords?: string[]
  priority_fixes?: string[]
  rewritten_summary?: string
  next_step?: string
}
type Vault = {
  targetRole: string
  targetIndustry: string
  location: string
  yearsExperience: number | null
  summary: string
  skills: string[]
  careerGoals: string
}

const emptyVault: Vault = {
  targetRole: "",
  targetIndustry: "",
  location: "",
  yearsExperience: null,
  summary: "",
  skills: [],
  careerGoals: "",
}

const tabs: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "resume", label: "Resume Review" },
  { id: "linkedin", label: "LinkedIn Audit" },
  { id: "vault", label: "Career Vault" },
]

const inputClass = "w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-teal focus:ring-2 focus:ring-teal/10"
const labelClass = "mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500"

function ScorePanel({ title, result }: { title: string; result: AuditResult | ResumeResult }) {
  const score = Math.max(0, Math.min(100, Number(result.overall_score) || 0))
  return (
    <div className="rounded-2xl border border-teal/20 bg-teal/[0.035] p-5">
      <div className="mb-5 flex items-end justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal">Result</p>
          <h3 className="mt-1 text-xl font-bold text-zinc-900">{title}</h3>
        </div>
        <div className="text-right">
          <span className="text-4xl font-bold text-teal">{score}</span>
          <span className="text-sm text-zinc-400">/100</span>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {Object.entries(result.scores || {}).map(([key, value]) => (
          <div key={key} className="rounded-xl border border-zinc-200 bg-white p-3">
            <p className="truncate text-[11px] font-semibold capitalize text-zinc-500">{key.replaceAll("_", " ")}</p>
            <p className="mt-1 text-xl font-bold text-zinc-900">{value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function ListBlock({ title, items }: { title: string; items?: string[] }) {
  if (!items?.length) return null
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5">
      <h3 className="text-sm font-bold text-zinc-900">{title}</h3>
      <ol className="mt-3 space-y-2">
        {items.map((item, index) => (
          <li key={`${item}-${index}`} className="flex gap-3 text-sm leading-6 text-zinc-600">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gold/15 text-[10px] font-bold text-gold-700">{index + 1}</span>
            {item}
          </li>
        ))}
      </ol>
    </div>
  )
}

export default function CareerPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const workspaceKey = searchParams.get("client") || undefined
  const [tab, setTab] = useState<Tab>("overview")
  const [vault, setVault] = useState<Vault>(emptyVault)
  const [skillsText, setSkillsText] = useState("")
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState("")
  const [headline, setHeadline] = useState("")
  const [about, setAbout] = useState("")
  const [audience, setAudience] = useState("Recruiters and hiring managers")
  const [audit, setAudit] = useState<AuditResult | null>(null)
  const [resumeText, setResumeText] = useState("")
  const [jobDescription, setJobDescription] = useState("")
  const [resumeResult, setResumeResult] = useState<ResumeResult | null>(null)
  const [uploading, setUploading] = useState(false)

  const apiSuffix = useMemo(() => workspaceKey ? `?workspaceKey=${encodeURIComponent(workspaceKey)}` : "", [workspaceKey])

  useEffect(() => {
    fetch(`/api/career-vault${apiSuffix}`)
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        if (!data?.profile) return
        setVault({ ...emptyVault, ...data.profile })
        setSkillsText((data.profile.skills || []).join(", "))
      })
      .catch(() => undefined)
  }, [apiSuffix])

  const saveVault = async () => {
    setLoading("vault")
    setMessage("")
    const response = await fetch(`/api/career-vault${apiSuffix}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...vault,
        workspaceKey,
        skills: skillsText.split(",").map((item) => item.trim()).filter(Boolean),
      }),
    })
    const data = await response.json().catch(() => ({}))
    setMessage(response.ok ? "Career Vault saved." : data.error || "Career Vault could not be saved.")
    setLoading("")
  }

  const runAudit = async () => {
    setLoading("linkedin")
    setMessage("")
    setAudit(null)
    const response = await fetch(`/api/career/linkedin-audit${apiSuffix}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceKey, headline, about, targetRole: vault.targetRole, audience }),
    })
    const data = await response.json().catch(() => ({}))
    if (response.ok) setAudit(data)
    else setMessage(data.error || "Audit failed.")
    setLoading("")
  }

  const uploadResumeFile = async (file: File) => {
    setUploading(true)
    setMessage("")
    try {
      const body = new FormData()
      body.append("file", file)
      const response = await fetch(`/api/career/resume-parse${apiSuffix}`, { method: "POST", body })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || typeof data.text !== "string") {
        setMessage(data.error ? `Upload failed: ${data.error}` : "Resume file could not be read.")
        return
      }
      setResumeText(data.text)
      setMessage("File extracted. Assessing ATS readiness...")
      await runResumeReview(data.text)
    } catch {
      setMessage("Resume upload failed.")
    } finally {
      setUploading(false)
    }
  }

  const runResumeReview = async (text = resumeText) => {
    setLoading("resume")
    setMessage("")
    setResumeResult(null)
    const response = await fetch(`/api/career/resume-review${apiSuffix}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceKey, resumeText: text, jobDescription }),
    })
    const data = await response.json().catch(() => ({}))
    if (response.ok) setResumeResult(data)
    else setMessage(data.error || "Resume review failed.")
    setLoading("")
  }

  return (
    <main className="min-h-full bg-zinc-50/70 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <section className="overflow-hidden rounded-3xl bg-[#073f3b] text-white shadow-sm">
          <div className="grid gap-8 px-6 py-8 md:grid-cols-[1.4fr_0.6fr] md:px-10 md:py-10">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#efb543]">Qalam Career Visibility</p>
              <h1 className="mt-3 max-w-3xl text-3xl font-bold leading-tight sm:text-4xl">Build a career profile recruiters can find, trust, and shortlist.</h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-white/70 sm:text-base">One career story across LinkedIn, content, and every ATS resume. No generic advice. No invented achievements.</p>
            </div>
            <div className="grid grid-cols-3 gap-2 self-end">
              {[
                ["1", "Career Vault"],
                ["2", "LinkedIn Audit"],
                ["3", "ATS Resume"],
              ].map(([number, label]) => (
                <div key={number} className="rounded-2xl border border-white/10 bg-white/[0.06] p-3">
                  <p className="text-lg font-bold text-[#efb543]">{number}</p>
                  <p className="mt-1 text-xs leading-4 text-white/70">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="mt-5 flex gap-1 overflow-x-auto rounded-2xl border border-zinc-200 bg-white p-1.5">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => { setTab(item.id); setMessage("") }}
              className={`whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-semibold transition ${tab === item.id ? "bg-teal text-white" : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"}`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {message && <div className="mt-4 rounded-xl border border-gold/25 bg-gold/10 px-4 py-3 text-sm font-medium text-zinc-700">{message}</div>}

        {tab === "overview" && (
          <div className="mt-5 space-y-5">
            <section className="grid gap-4 md:grid-cols-3">
              {[
                {
                  title: "Resume Studio",
                  copy: "12 ATS-safe templates, exact-JD targeting, editing, version history, and PDF export.",
                  cta: "Open Studio",
                  href: "/career/resumes",
                  badge: "Primary",
                },
                {
                  title: "LinkedIn Audit",
                  copy: "Measure discovery, credibility, clarity, and conversion. Then fix the highest-impact gaps.",
                  cta: "Run Audit",
                  tab: "linkedin" as Tab,
                  badge: "In-app",
                },
                {
                  title: "Post Intelligence",
                  copy: "Import your own posts and metrics to find content worth, gaps, and repeatable patterns.",
                  cta: "Open Module",
                  href: "/career/content",
                  badge: "Primary",
                },
              ].map((tile, index) => {
                const content = (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-teal/10 text-xs font-bold text-teal">0{index + 1}</span>
                      <span className="rounded-full bg-gold/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gold-700">{tile.badge}</span>
                    </div>
                    <h2 className="mt-5 text-lg font-bold text-zinc-900">{tile.title}</h2>
                    <p className="mt-2 text-sm leading-6 text-zinc-600">{tile.copy}</p>
                    <p className="mt-4 text-xs font-bold text-teal">{tile.cta} →</p>
                  </>
                )
                if (tile.href) {
                  return (
                    <Link
                      key={tile.title}
                      href={`${tile.href}${workspaceKey ? `?client=${encodeURIComponent(workspaceKey)}` : ""}`}
                      className="rounded-2xl border border-zinc-200 bg-white p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-teal/30 hover:shadow-md"
                    >
                      {content}
                    </Link>
                  )
                }
                return (
                  <button
                    key={tile.title}
                    type="button"
                    onClick={() => setTab(tile.tab as Tab)}
                    className="rounded-2xl border border-zinc-200 bg-white p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-teal/30 hover:shadow-md"
                  >
                    {content}
                  </button>
                )
              })}
            </section>

            <section>
              <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-500">More career tools</p>
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  ["Career Network", "Opt into recruiter discovery or search visible candidates.", "/career/network"],
                  ["Learning Cohorts", "Run LinkedIn and career modules for certifications and coaching groups.", "/career/cohorts"],
                  ["Career Add-ons", "Extra resume, review, cover letter, interview pack, or consultation.", "/career/add-ons"],
                ].map(([title, copy, href]) => (
                  <Link key={href} href={`${href}${workspaceKey ? `?client=${encodeURIComponent(workspaceKey)}` : ""}`} className="rounded-xl border border-zinc-200 bg-white p-4 transition hover:border-teal/30 hover:shadow-sm">
                    <h3 className="text-sm font-bold text-zinc-900">{title}</h3>
                    <p className="mt-1 text-xs leading-5 text-zinc-500">{copy}</p>
                  </Link>
                ))}
              </div>
            </section>
          </div>
        )}

        {tab === "vault" && (
          <section className="mt-5 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="mb-6 max-w-2xl">
              <h2 className="text-2xl font-bold text-zinc-900">Career Vault</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-600">Your source of truth. Qalam uses this context to keep profiles and resumes accurate and consistent.</p>
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              <label><span className={labelClass}>Target role</span><input className={inputClass} value={vault.targetRole} onChange={(event) => setVault({ ...vault, targetRole: event.target.value })} placeholder="People and Culture Manager" /></label>
              <label><span className={labelClass}>Target industry</span><input className={inputClass} value={vault.targetIndustry} onChange={(event) => setVault({ ...vault, targetIndustry: event.target.value })} placeholder="Technology and financial services" /></label>
              <label><span className={labelClass}>Location</span><input className={inputClass} value={vault.location} onChange={(event) => setVault({ ...vault, location: event.target.value })} placeholder="Lahore, Pakistan" /></label>
              <label><span className={labelClass}>Years of experience</span><input className={inputClass} type="number" min={0} max={60} value={vault.yearsExperience ?? ""} onChange={(event) => setVault({ ...vault, yearsExperience: event.target.value ? Number(event.target.value) : null })} /></label>
              <label className="md:col-span-2"><span className={labelClass}>Skills, comma separated</span><input className={inputClass} value={skillsText} onChange={(event) => setSkillsText(event.target.value)} placeholder="Talent acquisition, HR operations, people analytics" /></label>
              <label className="md:col-span-2"><span className={labelClass}>Professional summary</span><textarea className={`${inputClass} min-h-32 resize-y`} value={vault.summary} onChange={(event) => setVault({ ...vault, summary: event.target.value })} placeholder="What you do, who you help, and proof of impact." /></label>
              <label className="md:col-span-2"><span className={labelClass}>Career goals</span><textarea className={`${inputClass} min-h-24 resize-y`} value={vault.careerGoals} onChange={(event) => setVault({ ...vault, careerGoals: event.target.value })} placeholder="Roles, industries, or outcomes you are targeting." /></label>
            </div>
            <button type="button" disabled={loading === "vault"} onClick={saveVault} className="mt-6 rounded-xl bg-teal px-5 py-3 text-sm font-bold text-white transition hover:bg-teal-600 disabled:opacity-50">{loading === "vault" ? "Saving..." : "Save Career Vault"}</button>
          </section>
        )}

        {tab === "linkedin" && (
          <div className="mt-5 space-y-5">
            <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-bold text-zinc-900">LinkedIn Market Position Audit</h2>
              <p className="mt-2 text-sm text-zinc-600">Target role comes from your Career Vault: <strong>{vault.targetRole || "add it first"}</strong>.</p>
              <div className="mt-6 grid gap-5">
                <label><span className={labelClass}>Current headline</span><input className={inputClass} value={headline} onChange={(event) => setHeadline(event.target.value)} placeholder="Your exact LinkedIn headline" /></label>
                <label><span className={labelClass}>Target audience</span><input className={inputClass} value={audience} onChange={(event) => setAudience(event.target.value)} /></label>
                <label><span className={labelClass}>Current About section</span><textarea className={`${inputClass} min-h-48 resize-y`} value={about} onChange={(event) => setAbout(event.target.value)} placeholder="Paste your current LinkedIn About section" /></label>
              </div>
              <button type="button" disabled={loading === "linkedin" || !vault.targetRole} onClick={runAudit} className="mt-6 rounded-xl bg-teal px-5 py-3 text-sm font-bold text-white transition hover:bg-teal-600 disabled:cursor-not-allowed disabled:opacity-50">{loading === "linkedin" ? "Auditing..." : "Run LinkedIn Audit"}</button>
            </section>
            {audit && (
              <>
                <ScorePanel title="LinkedIn market readiness" result={audit} />
                <div className="grid gap-5 md:grid-cols-2">
                  <div className="rounded-2xl border border-zinc-200 bg-white p-5"><h3 className="font-bold text-zinc-900">Diagnosis</h3><p className="mt-3 text-sm leading-6 text-zinc-600">{audit.diagnosis}</p><p className="mt-4 text-sm font-semibold text-teal">{audit.market_position}</p></div>
                  <ListBlock title="Priority fixes" items={audit.top_fixes} />
                  <div className="rounded-2xl border border-zinc-200 bg-white p-5"><h3 className="font-bold text-zinc-900">Stronger headline</h3><p className="mt-3 text-sm leading-6 text-zinc-700">{audit.headline}</p></div>
                  <ListBlock title="30-day action plan" items={audit.thirty_day_plan} />
                </div>
              </>
            )}
          </div>
        )}

        {tab === "resume" && (
          <div className="mt-5 space-y-5">
            <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-bold text-zinc-900">ATS Resume Review</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-600">Upload your LinkedIn profile PDF, resume, or CV. Qalam extracts the text and automatically checks ATS fit, career progression, impact, and recruiter risk. Add a job description for a targeted review.</p>
              <p className="mt-2 text-xs font-medium text-teal">Your resume and job description are analyzed for this review and are not saved.</p>

              <label className="mt-5 flex flex-col items-start gap-2 rounded-xl border border-dashed border-teal/40 bg-teal/[0.03] px-4 py-4 text-sm sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-zinc-900">Upload LinkedIn PDF, resume, or CV</p>
                  <p className="text-xs text-zinc-500">PDF or DOCX up to 5 MB. Text is extracted, contact details are stripped, then ATS assessment starts automatically.</p>
                </div>
                <span className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-teal px-4 py-2 text-xs font-bold text-white transition hover:bg-teal-600">
                  {uploading ? "Reading file..." : "Choose file"}
                  <input
                    type="file"
                    accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    className="hidden"
                    disabled={uploading}
                    onChange={(event) => {
                      const file = event.target.files?.[0]
                      event.target.value = ""
                      if (file) uploadResumeFile(file)
                    }}
                  />
                </span>
              </label>

              <div className="mt-6 grid gap-5 lg:grid-cols-2">
                <label><span className={labelClass}>Resume text</span><textarea className={`${inputClass} min-h-80 resize-y`} value={resumeText} onChange={(event) => setResumeText(event.target.value)} placeholder="Paste your full resume text, or upload above" /></label>
                <label><span className={labelClass}>Job description, optional</span><textarea className={`${inputClass} min-h-80 resize-y`} value={jobDescription} onChange={(event) => setJobDescription(event.target.value)} placeholder="Paste the exact job description for a targeted review" /></label>
              </div>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button type="button" disabled={loading === "resume" || uploading} onClick={() => runResumeReview()} className="rounded-xl bg-teal px-5 py-3 text-sm font-bold text-white transition hover:bg-teal-600 disabled:opacity-50">{loading === "resume" ? "Reviewing..." : "Review Resume"}</button>
                <button
                  type="button"
                  disabled={!resumeText.trim()}
                  onClick={() => {
                    try {
                      sessionStorage.setItem("careerResumeHandoff", JSON.stringify({
                        sourceResume: resumeText,
                        jobDescription,
                        targetRole: vault.targetRole || "",
                      }))
                    } catch {
                      // ignore quota / privacy-mode errors, resumes page will just open empty
                    }
                    router.push(`/career/resumes${workspaceKey ? `?client=${encodeURIComponent(workspaceKey)}` : ""}`)
                  }}
                  className="rounded-xl border border-gold bg-white px-5 py-3 text-sm font-bold text-gold-700 transition hover:bg-gold/5 disabled:cursor-not-allowed disabled:opacity-40"
                  title={resumeText.trim() ? "Carry this resume and JD into the Studio and build an ATS version." : "Paste your resume first."}
                >
                  Generate ATS Resume from this →
                </button>
              </div>
              <p className="mt-2 text-xs text-zinc-500">Review gives you diagnostic feedback. Generate builds a saved ATS-safe resume you can edit and export.</p>
            </section>
            {resumeResult && (
              <>
                <ScorePanel title="Resume readiness" result={resumeResult} />
                <div className="grid gap-5 md:grid-cols-2">
                  <div className="rounded-2xl border border-zinc-200 bg-white p-5"><h3 className="font-bold text-zinc-900">Recruiter verdict</h3><p className="mt-3 text-sm leading-6 text-zinc-600">{resumeResult.verdict}</p><p className="mt-4 text-sm font-semibold text-teal">{resumeResult.next_step}</p></div>
                  <ListBlock title="Priority fixes" items={resumeResult.priority_fixes} />
                  <ListBlock title="Rejection risks" items={resumeResult.risks} />
                  <ListBlock title="Missing keywords" items={resumeResult.missing_keywords} />
                  <div className="rounded-2xl border border-zinc-200 bg-white p-5 md:col-span-2"><h3 className="font-bold text-zinc-900">Rewritten professional summary</h3><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-zinc-700">{resumeResult.rewritten_summary}</p></div>
                </div>
                <div className="rounded-2xl border border-teal/25 bg-teal/[0.04] p-5">
                  <h3 className="font-bold text-zinc-900">Next step: build the ATS version</h3>
                  <p className="mt-2 text-sm leading-6 text-zinc-600">Take this same resume and JD into the Studio. Qalam will rewrite it into an ATS-safe template, save it, and let you export a PDF.</p>
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        sessionStorage.setItem("careerResumeHandoff", JSON.stringify({
                          sourceResume: resumeText,
                          jobDescription,
                          targetRole: vault.targetRole || "",
                        }))
                      } catch {
                        // ignore
                      }
                      router.push(`/career/resumes${workspaceKey ? `?client=${encodeURIComponent(workspaceKey)}` : ""}`)
                    }}
                    className="mt-4 rounded-xl bg-teal px-5 py-3 text-sm font-bold text-white transition hover:bg-teal-600"
                  >
                    Open in Resume Studio →
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </main>
  )
}

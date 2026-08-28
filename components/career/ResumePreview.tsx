import type { ResumeData } from "@/lib/career-resume"
import { RESUME_TEMPLATES } from "@/lib/resume-templates"

export function ResumePreview({ data, templateKey }: { data: ResumeData; templateKey: string }) {
  const template = RESUME_TEMPLATES.find((item) => item.key === templateKey) || RESUME_TEMPLATES[0]
  const compact = template.density === "compact"
  const sectionClass = compact ? "mt-4" : "mt-5"

  return (
    <article className="mx-auto min-h-[1123px] w-full max-w-[794px] bg-white px-10 py-9 font-sans t-eyebrow leading-[1.45] text-zinc-800 shadow-sm print:min-h-0 print:max-w-none print:shadow-none" style={{ "--resume-accent": template.accent } as React.CSSProperties}>
      <header className="border-b-2 pb-4" style={{ borderColor: template.accent }}>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-950">{data.fullName || "Your Name"}</h1>
        <p className="mt-1 text-sm font-semibold" style={{ color: template.accent }}>{data.headline}</p>
        <p className="mt-2 t-eyebrow text-zinc-600">{[data.email, data.phone, data.location, data.linkedinUrl].filter(Boolean).join("  |  ")}</p>
      </header>

      {data.summary && <section className={sectionClass}><Heading title="Professional Summary" color={template.accent} /><p>{data.summary}</p></section>}
      {data.skills.length > 0 && <section className={sectionClass}><Heading title="Core Skills" color={template.accent} /><p>{data.skills.join("  |  ")}</p></section>}
      {data.experience.length > 0 && (
        <section className={sectionClass}>
          <Heading title="Professional Experience" color={template.accent} />
          <div className={compact ? "space-y-3" : "space-y-4"}>
            {data.experience.map((entry, index) => (
              <div key={`${entry.organization}-${index}`} className="break-inside-avoid">
                <div className="flex items-start justify-between gap-5">
                  <div><h3 className="font-bold text-zinc-950">{entry.title}</h3><p className="font-semibold">{entry.organization}{entry.location ? `, ${entry.location}` : ""}</p></div>
                  <p className="shrink-0 t-eyebrow text-zinc-500">{[entry.startDate, entry.endDate].filter(Boolean).join(" - ")}</p>
                </div>
                {entry.bullets.length > 0 && <ul className="mt-1.5 list-disc space-y-1 pl-4">{entry.bullets.map((bullet, bulletIndex) => <li key={`${bullet}-${bulletIndex}`}>{bullet}</li>)}</ul>}
              </div>
            ))}
          </div>
        </section>
      )}
      {data.projects.length > 0 && <EntrySection title="Projects" entries={data.projects} color={template.accent} compact={compact} />}
      {data.education.length > 0 && <EntrySection title="Education" entries={data.education} color={template.accent} compact={compact} />}
      {data.certifications.length > 0 && <section className={sectionClass}><Heading title="Certifications" color={template.accent} /><ul className="list-disc space-y-1 pl-4">{data.certifications.map((item) => <li key={item}>{item}</li>)}</ul></section>}
    </article>
  )
}

function Heading({ title, color }: { title: string; color: string }) {
  return <h2 className="mb-2 border-b pb-1 t-eyebrow" style={{ color, borderColor: `${color}55` }}>{title}</h2>
}

function EntrySection({ title, entries, color, compact }: { title: string; entries: ResumeData["education"]; color: string; compact: boolean }) {
  return (
    <section className={compact ? "mt-4" : "mt-5"}>
      <Heading title={title} color={color} />
      <div className="space-y-2">
        {entries.map((entry, index) => (
          <div key={`${entry.organization}-${index}`} className="flex justify-between gap-5 break-inside-avoid">
            <div><h3 className="font-bold text-zinc-950">{entry.title}</h3><p>{entry.organization}</p></div>
            <p className="shrink-0 t-eyebrow text-zinc-500">{[entry.startDate, entry.endDate].filter(Boolean).join(" - ")}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

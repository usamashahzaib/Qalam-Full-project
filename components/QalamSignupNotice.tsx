export function QalamSignupNotice({ className }: { className?: string }) {
  return (
    <div className={`rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-3.5 text-xs leading-relaxed text-zinc-500${className ? ` ${className}` : ""}`}>
      <p className="font-semibold text-zinc-700">What is Qalam?</p>
      <p className="mt-1">Qalam is a career proof workspace for LinkedIn, resumes, and target roles. You draft, review, and publish while Qalam assists with saved voice context and scheduling. Nothing posts without your explicit approval.</p>
      <p className="mt-2">Qalam is independent of LinkedIn Corporation. You remain responsible for your LinkedIn account and must comply with LinkedIn&apos;s own terms of service.</p>
    </div>
  )
}

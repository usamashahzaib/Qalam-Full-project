import nextEnv from "@next/env"

const { loadEnvConfig } = nextEnv

loadEnvConfig(process.cwd())

const liveRequested = process.env.NEXT_PUBLIC_CAREER_ADDON_CHECKOUT_LIVE === "true"
const readyRequested = process.env.NEXT_PUBLIC_CAREER_ADDON_CHECKOUT_READY === "true"

if (!liveRequested && !readyRequested) process.exit(0)

const mappings = {
  extra_resume: process.env.LEMONSQUEEZY_CAREER_ADDON_EXTRA_RESUME_VARIANT_ID,
  cover_letter: process.env.LEMONSQUEEZY_CAREER_ADDON_COVER_LETTER_VARIANT_ID,
  interview_pack: process.env.LEMONSQUEEZY_CAREER_ADDON_INTERVIEW_PACK_VARIANT_ID,
  recruiter_review: process.env.LEMONSQUEEZY_CAREER_ADDON_RECRUITER_REVIEW_VARIANT_ID,
  linkedin_rewrite: process.env.LEMONSQUEEZY_CAREER_ADDON_LINKEDIN_REWRITE_VARIANT_ID,
  career_blueprint: process.env.LEMONSQUEEZY_CAREER_ADDON_CAREER_BLUEPRINT_VARIANT_ID,
  application_pack: process.env.LEMONSQUEEZY_CAREER_PACK_APPLICATION_VARIANT_ID,
  job_win_pack: process.env.LEMONSQUEEZY_CAREER_PACK_JOB_WIN_VARIANT_ID,
  career_reset_pack: process.env.LEMONSQUEEZY_CAREER_PACK_CAREER_RESET_VARIANT_ID,
  executive_career_reset: process.env.LEMONSQUEEZY_CAREER_PACK_EXECUTIVE_RESET_VARIANT_ID,
}
const valid = (value) => /^[1-9]\d*$/.test(value || "")
const missing = Object.entries(mappings).filter(([, id]) => !valid(id)).map(([key]) => key)
const ids = Object.values(mappings).filter(valid)
const duplicates = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))]

if (!process.env.LEMONSQUEEZY_API_KEY?.trim()) missing.unshift("LEMONSQUEEZY_API_KEY")
if (missing.length || duplicates.length) {
  // A stale public live flag must never block deployment. The UI additionally
  // requires the explicit readiness flag and remains in coming-soon mode.
  if (!readyRequested) {
    console.warn(`Career add-on checkout remains disabled. Missing or invalid: ${missing.join(", ") || "none"}. Duplicate variant IDs: ${duplicates.join(", ") || "none"}.`)
    process.exit(0)
  }
  console.error(`Career add-on checkout is not production-ready. Missing or invalid: ${missing.join(", ") || "none"}. Duplicate variant IDs: ${duplicates.join(", ") || "none"}.`)
  process.exit(1)
}

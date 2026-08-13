import nextEnv from "@next/env"

const { loadEnvConfig } = nextEnv

loadEnvConfig(process.cwd())

if (process.env.NEXT_PUBLIC_CAREER_ADDON_CHECKOUT_LIVE !== "true") process.exit(0)

const mappings = {
  extra_resume: process.env.LEMONSQUEEZY_CAREER_ADDON_EXTRA_RESUME_VARIANT_ID,
  cover_letter: process.env.LEMONSQUEEZY_CAREER_ADDON_COVER_LETTER_VARIANT_ID,
  interview_pack: process.env.LEMONSQUEEZY_CAREER_ADDON_INTERVIEW_PACK_VARIANT_ID,
  recruiter_review: process.env.LEMONSQUEEZY_CAREER_ADDON_RECRUITER_REVIEW_VARIANT_ID,
  linkedin_rewrite: process.env.LEMONSQUEEZY_CAREER_ADDON_LINKEDIN_REWRITE_VARIANT_ID,
  career_blueprint: process.env.LEMONSQUEEZY_CAREER_ADDON_CAREER_BLUEPRINT_VARIANT_ID,
}
const valid = (value) => /^[1-9]\d*$/.test(value || "")
const missing = Object.entries(mappings).filter(([, id]) => !valid(id)).map(([key]) => key)
const ids = Object.values(mappings).filter(valid)
const duplicates = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))]

if (!process.env.LEMONSQUEEZY_API_KEY?.trim()) missing.unshift("LEMONSQUEEZY_API_KEY")
if (missing.length || duplicates.length) {
  console.error(`Career add-on checkout is not production-ready. Missing or invalid: ${missing.join(", ") || "none"}. Duplicate variant IDs: ${duplicates.join(", ") || "none"}.`)
  process.exit(1)
}

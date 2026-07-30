import "server-only"

import { env } from "@/lib/server/env"
import type { AddonKey } from "@/lib/career-pricing"

// Webhook-only mapping (variant id -> add-on key), mirroring lib/server/lemon-variant-plans.ts.
// The webhook resolves which add-on was purchased from this trusted, server-configured
// mapping - never from buyer-editable checkout[custom] fields.
export const LEMONSQUEEZY_ADDON_VARIANTS: Record<string, AddonKey> = {
  ...(env.lemonSqueezyAddonVariantExtraResume
    ? { [env.lemonSqueezyAddonVariantExtraResume]: "extra_resume" as AddonKey }
    : {}),
  ...(env.lemonSqueezyAddonVariantCoverLetter
    ? { [env.lemonSqueezyAddonVariantCoverLetter]: "cover_letter" as AddonKey }
    : {}),
  ...(env.lemonSqueezyAddonVariantInterviewPack
    ? { [env.lemonSqueezyAddonVariantInterviewPack]: "interview_pack" as AddonKey }
    : {}),
  ...(env.lemonSqueezyAddonVariantRecruiterReview
    ? { [env.lemonSqueezyAddonVariantRecruiterReview]: "recruiter_review" as AddonKey }
    : {}),
  ...(env.lemonSqueezyAddonVariantLinkedinRewrite
    ? { [env.lemonSqueezyAddonVariantLinkedinRewrite]: "linkedin_rewrite" as AddonKey }
    : {}),
  ...(env.lemonSqueezyAddonVariantCareerConsultation
    ? { [env.lemonSqueezyAddonVariantCareerConsultation]: "career_consultation" as AddonKey }
    : {}),
}

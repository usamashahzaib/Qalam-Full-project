export type MarketingFaq = {
  q: string
  a: string
}

export type ProductPageContent = {
  eyebrow: string
  title: string
  summary: string
  description: string
  bullets: string[]
  updatedAt: string
  faqs: MarketingFaq[]
}

export type UseCasePageContent = {
  eyebrow: string
  title: string
  summary: string
  description: string
  bullets: string[]
  updatedAt: string
  audience: string
  faqs: MarketingFaq[]
}

export const PRODUCT_PAGES: Record<string, ProductPageContent> = {
  "post-writer": {
    eyebrow: "Product",
    title: "AI Post Writer",
    summary: "Draft LinkedIn posts in a structured workflow that keeps voice, hooks, and revisions in one place.",
    description:
      "Qalam's writer is the drafting surface for serious publishing. It turns a raw idea into a working post, then keeps that draft connected to voice settings, saved hooks, revision history, and the publishing path that follows.",
    bullets: [
      "Topic-to-draft workflow in one screen",
      "Voice-aware tone selection and revision path",
      "Hooks, drafts, and final post stay connected",
    ],
    updatedAt: "2026-06-26",
    faqs: [
      {
        q: "What makes Qalam's post writer different from a normal AI prompt box?",
        a: "Qalam keeps the draft attached to your voice profile, hook archive, revision history, and workspace memory. It is not a blank-session generator.",
      },
      {
        q: "Can I revise drafts instead of regenerating from scratch?",
        a: "Yes. The workflow is designed for iterative edits so the system can preserve context instead of replacing the whole post each time.",
      },
      {
        q: "Does the writer support publishing workflow after drafting?",
        a: "Yes. Drafting stays connected to scheduling, archive continuity, and later performance review.",
      },
    ],
  },
  "voice-profile": {
    eyebrow: "Product",
    title: "Voice Profile",
    summary: "Train Qalam on your approved writing so the system gets closer to your real tone over time.",
    description:
      "Voice Profile is the memory layer behind the product. It stores examples, edits, and approvals that make future drafts more specific to the writer instead of falling back to generic AI phrasing.",
    bullets: [
      "Learns from real source posts and edits",
      "Preserves long-term writing patterns",
      "Creates switching cost through accumulated voice data",
    ],
    updatedAt: "2026-06-26",
    faqs: [
      {
        q: "How does Qalam learn my voice?",
        a: "It uses your approved writing samples, edits, and kept drafts as source material so future drafts inherit real tone and structure instead of generic prompt output.",
      },
      {
        q: "Will the voice profile improve over time?",
        a: "Yes. Each accepted draft and meaningful edit becomes part of the memory layer that sharpens future outputs.",
      },
      {
        q: "Is voice memory useful for teams or agencies too?",
        a: "Yes. It matters even more when multiple operators need to keep one consistent public voice.",
      },
    ],
  },
  "hook-generator": {
    eyebrow: "Product",
    title: "Hook Generator",
    summary: "Build stronger opening lines, then feed the strongest structures back into your content system.",
    description:
      "The hook system becomes more valuable when it is connected to your archive. Qalam tracks which openings you keep, which you reject, and which structures you return to most often.",
    bullets: [
      "Pattern-based opening generation",
      "Reusable hook structures inside the archive",
      "Fast entry point into longer post workflows",
    ],
    updatedAt: "2026-06-26",
    faqs: [
      {
        q: "Can I reuse strong hooks across future posts?",
        a: "Yes. Strong openings can stay in the archive so the system compounds what already works for your voice and topic pattern.",
      },
      {
        q: "Is this different from the free hook tool?",
        a: "Yes. The product feature is connected to your account memory and draft workflow, while the public tool is a standalone entry point.",
      },
      {
        q: "Why do hooks matter so much on LinkedIn?",
        a: "Openings decide whether the reader stops scrolling and gives the rest of the post a chance to perform.",
      },
    ],
  },
  "post-scheduler": {
    eyebrow: "Product",
    title: "Post Scheduler",
    summary: "Move from drafting to planned publishing without losing attribution, timing, or revision context.",
    description:
      "Scheduling is part of the compounding loop. A scheduled post should remain tied to the draft that produced it, the version that was approved, and the outcome that followed after it went live.",
    bullets: [
      "Draft-to-schedule continuity",
      "Operational planning for teams and agencies",
      "Feeds later performance review and reuse",
    ],
    updatedAt: "2026-06-26",
    faqs: [
      {
        q: "Why does scheduling belong inside the writing workflow?",
        a: "Because timing, revision history, and ownership should stay attached to the draft instead of being lost in another tool.",
      },
      {
        q: "Is scheduling only for solo creators?",
        a: "No. Teams and agencies need it even more because planning and review discipline matter across multiple stakeholders.",
      },
      {
        q: "Can scheduled posts still be reviewed later?",
        a: "Yes. The point is to preserve the chain from draft to publish to later analysis.",
      },
    ],
  },
  "agency-workspaces": {
    eyebrow: "Product",
    title: "Agency Workspaces",
    summary: "Separate clients cleanly with their own voice memory, approvals, and publishing context.",
    description:
      "Agency workflows break when client memory bleeds together. Qalam isolates voice profiles, drafts, and approvals per client workspace so agencies can scale without flattening every account into the same tone.",
    bullets: [
      "Per-client workspace separation",
      "Approval flow before publishing",
      "Cleaner delivery and lower revision churn",
    ],
    updatedAt: "2026-06-26",
    faqs: [
      {
        q: "Why do agencies need isolated workspaces?",
        a: "Because client voice, approvals, and archives cannot mix without damaging delivery quality and trust.",
      },
      {
        q: "Does Qalam support approvals for agency content?",
        a: "Yes. The public positioning already frames agency workflow around review discipline before publish.",
      },
      {
        q: "What agency problem is Qalam solving first?",
        a: "Memory separation, content continuity, and lower revision churn across client accounts.",
      },
    ],
  },
}

export const USE_CASE_PAGES: Record<string, UseCasePageContent> = {
  founders: {
    eyebrow: "Use Case",
    title: "For Founders",
    summary: "Publish with consistency without sounding like a ghostwritten content machine.",
    description:
      "Founders need a repeatable system for thought leadership, hiring signal, and market credibility. Qalam gives them a way to keep shipping posts without losing the personal voice people actually follow.",
    bullets: [
      "Faster authority-building workflow",
      "Keeps founder tone intact",
      "Reduces blank-page friction",
    ],
    updatedAt: "2026-06-26",
    audience: "Founders and executive operators building authority on LinkedIn",
    faqs: [
      {
        q: "Why is Qalam useful for founders specifically?",
        a: "Founders need consistency and authority without sounding outsourced. Qalam preserves voice while reducing blank-page friction.",
      },
      {
        q: "Can founders use Qalam for hiring and market trust at the same time?",
        a: "Yes. The same publishing system supports thought leadership, talent signal, and company narrative continuity.",
      },
    ],
  },
  "marketing-teams": {
    eyebrow: "Use Case",
    title: "For Marketing Teams",
    summary: "Give every operator a sharper workflow while keeping the brand voice from drifting.",
    description:
      "Marketing teams need a shared system, not another disconnected content tool. Qalam helps teams organize voice rules, draft reviews, and reusable assets around the same operating surface.",
    bullets: [
      "Shared content system",
      "Cleaner review loop",
      "More consistent team output",
    ],
    updatedAt: "2026-06-26",
    audience: "In-house marketing teams managing brand voice and output consistency",
    faqs: [
      {
        q: "What team problem does Qalam solve first?",
        a: "It reduces voice drift by keeping writing rules, approvals, and reusable assets in one workflow.",
      },
      {
        q: "Is Qalam only for one writer at a time?",
        a: "No. Team positioning is built around shared workflow and cleaner review loops.",
      },
    ],
  },
  "hr-leaders": {
    eyebrow: "Use Case",
    title: "For HR Leaders",
    summary: "Build a credible professional voice for hiring, culture, and employer brand communication.",
    description:
      "HR leaders often need to publish consistently without sounding over-produced. Qalam helps them maintain clarity, warmth, and authority while preserving examples that can be reused and refined later.",
    bullets: [
      "Employer-brand publishing support",
      "Reusable narratives for culture and hiring",
      "Authority without agency overhead",
    ],
    updatedAt: "2026-06-26",
    audience: "HR and employer-brand leaders publishing on LinkedIn",
    faqs: [
      {
        q: "Why does HR content often sound generic?",
        a: "Because it usually relies on safe templates instead of a system that preserves real voice and reusable narrative patterns.",
      },
      {
        q: "Can Qalam help with employer brand consistency?",
        a: "Yes. It supports repeatable hiring and culture communication without flattening every post into the same template.",
      },
    ],
  },
  consultants: {
    eyebrow: "Use Case",
    title: "For Consultants",
    summary: "Turn expertise into a repeatable publishing system that compounds credibility over time.",
    description:
      "Consultants do not just need content volume. They need a consistent public signal that reinforces expertise. Qalam helps them keep frameworks, post ideas, and proven angles organized around one workflow.",
    bullets: [
      "Thought-leadership consistency",
      "Archive of reusable angles and frameworks",
      "Better signal for inbound opportunities",
    ],
    updatedAt: "2026-06-26",
    audience: "Consultants building authority and inbound demand on LinkedIn",
    faqs: [
      {
        q: "How does Qalam help consultants win inbound opportunities?",
        a: "It turns expertise into a repeatable publication system so insights keep compounding in public instead of getting lost in scattered notes.",
      },
      {
        q: "Does this work better than ad hoc posting?",
        a: "Yes. Consistency plus archive reuse creates a stronger authority signal than random bursts of content.",
      },
    ],
  },
  agencies: {
    eyebrow: "Use Case",
    title: "For Agencies",
    summary: "Run multiple client content operations without collapsing every account into the same process.",
    description:
      "Agency mode is built around separation, approvals, and delivery quality. Each client can maintain a dedicated memory layer, while the agency keeps the overall workflow operational and reviewable.",
    bullets: [
      "Separate client memory",
      "Approval discipline before publish",
      "More scalable delivery quality",
    ],
    updatedAt: "2026-06-26",
    audience: "Content and ghostwriting agencies running multi-client LinkedIn operations",
    faqs: [
      {
        q: "Why do agencies need memory separation?",
        a: "Because client voice cannot bleed across accounts without damaging trust and delivery quality.",
      },
      {
        q: "What does Qalam improve for agencies first?",
        a: "It improves workflow discipline across approvals, archive continuity, and client-specific voice memory.",
      },
    ],
  },
}

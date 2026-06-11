import type { MarketingFaq } from "@/lib/site-content"

export type SeoLandingPage = {
  slug: string
  title: string
  h1: string
  description: string
  summary: string
  intent: string
  primaryKeyword: string
  keywords: string[]
  updatedAt: string
  sections: { heading: string; body: string }[]
  faqs: MarketingFaq[]
  related: { label: string; href: string }[]
}

const updatedAt = "2026-06-11"

export const SEO_LANDING_PAGES: Record<string, SeoLandingPage> = {
  "ai-content-writer": {
    slug: "ai-content-writer",
    title: "AI Content Writer for LinkedIn",
    h1: "AI content writer for LinkedIn posts that sound like you",
    description:
      "Qalam is an AI content writer for LinkedIn creators, founders, consultants, HR leaders, and agencies. Generate posts, hooks, carousels, and drafts with voice memory.",
    summary:
      "Use Qalam to turn raw ideas into LinkedIn posts, save reusable hooks, keep draft history, and train an AI writing system on your real voice.",
    intent: "AI content writer, AI writing tool, AI post writer, AI copywriting tool",
    primaryKeyword: "AI content writer",
    keywords: [
      "AI content writer",
      "AI writing tool",
      "AI post writer",
      "AI copywriting tool",
      "AI content generator",
      "Qalam AI writer",
      "LinkedIn AI writer",
    ],
    updatedAt,
    sections: [
      {
        heading: "Built for professional content, not generic copy",
        body: "Most AI content writers produce safe, reusable text. Qalam is built around LinkedIn publishing, so the workflow keeps hooks, voice, draft versions, scheduling, and archive continuity together.",
      },
      {
        heading: "Voice memory improves every draft",
        body: "Qalam learns from real posts, approved drafts, and edits. Each accepted output becomes context for the next post, which makes it stronger than a blank prompt box.",
      },
      {
        heading: "Useful for solo writers and teams",
        body: "Founders, consultants, HR leaders, marketing teams, and content agencies can use the same system to create repeatable LinkedIn output without flattening every voice.",
      },
    ],
    faqs: [
      {
        q: "What is the best AI content writer for LinkedIn?",
        a: "Qalam is built specifically for LinkedIn content and voice memory, so it fits LinkedIn posts, hooks, carousels, and publishing workflows better than generic AI writing tools.",
      },
      {
        q: "Can an AI content writer sound like me?",
        a: "Yes, if it learns from real source material. Qalam uses your posts, edits, and approvals to keep future drafts closer to your actual voice.",
      },
    ],
    related: [
      { label: "AI LinkedIn Writer", href: "/ai-linkedin-writer" },
      { label: "AI Post Writer", href: "/product/post-writer" },
      { label: "Voice Profile", href: "/product/voice-profile" },
    ],
  },
  "linkedin-post-writer": {
    slug: "linkedin-post-writer",
    title: "LinkedIn Post Writer",
    h1: "LinkedIn post writer with AI voice memory",
    description:
      "Write LinkedIn posts faster with Qalam, an AI LinkedIn post writer that learns your tone, stores draft history, and keeps hooks, revisions, and scheduling connected.",
    summary:
      "Qalam helps you write LinkedIn posts from ideas, experience, or rough notes while preserving your personal voice and post archive.",
    intent: "LinkedIn post writer, LinkedIn content writer, LinkedIn writing assistant",
    primaryKeyword: "LinkedIn post writer",
    keywords: [
      "LinkedIn post writer",
      "LinkedIn content writer",
      "LinkedIn writing assistant",
      "write LinkedIn posts",
      "AI LinkedIn post writer",
      "LinkedIn ghostwriter AI",
    ],
    updatedAt,
    sections: [
      {
        heading: "From rough idea to publishable post",
        body: "Start with a topic, lesson, story, or insight. Qalam turns it into a structured LinkedIn draft with a clear hook, body, and close.",
      },
      {
        heading: "Designed for revision, not one-shot output",
        body: "Strong LinkedIn writing usually needs edits. Qalam keeps revisions attached to the same draft so the system can learn from what you keep and remove.",
      },
      {
        heading: "Better archive, better future posts",
        body: "Finished posts, hooks, and versions stay in your workspace, creating reusable content capital instead of disconnected one-off outputs.",
      },
    ],
    faqs: [
      {
        q: "How do I write LinkedIn posts with AI?",
        a: "Use a LinkedIn-specific AI writer like Qalam: set up your voice profile, enter your idea, generate a draft, revise it, then save or schedule it.",
      },
      {
        q: "Is Qalam a LinkedIn ghostwriter?",
        a: "Qalam is software, not a human ghostwriter. It helps you write in your own voice by learning from your real posts and edits.",
      },
    ],
    related: [
      { label: "AI LinkedIn Writer", href: "/ai-linkedin-writer" },
      { label: "Free Hook Generator", href: "/free-tools/hook-generator" },
      { label: "Pricing", href: "/pricing" },
    ],
  },
  "linkedin-post-generator": {
    slug: "linkedin-post-generator",
    title: "LinkedIn Post Generator",
    h1: "LinkedIn post generator for voice-aware AI drafts",
    description:
      "Generate LinkedIn posts with Qalam. Create hooks, draft posts, save versions, and build a voice-aware content archive for consistent professional publishing.",
    summary:
      "Qalam is a LinkedIn post generator that focuses on specific posts, authentic voice, reusable hooks, and long-term publishing consistency.",
    intent: "LinkedIn post generator, AI LinkedIn post generator, LinkedIn content generator",
    primaryKeyword: "LinkedIn post generator",
    keywords: [
      "LinkedIn post generator",
      "AI LinkedIn post generator",
      "LinkedIn content generator",
      "generate LinkedIn posts",
      "LinkedIn AI generator",
      "AI LinkedIn posts",
    ],
    updatedAt,
    sections: [
      {
        heading: "Generate posts without sounding generic",
        body: "Qalam uses voice memory and LinkedIn-specific structure to avoid the generic tone common in basic post generators.",
      },
      {
        heading: "Hooks, drafts, and calendar stay connected",
        body: "A generated post can move into your archive or scheduler without losing the context that produced it.",
      },
      {
        heading: "Works for professional niches",
        body: "Founders, consultants, recruiters, HR leaders, marketers, and agency operators can train Qalam with niche examples so outputs match their work.",
      },
    ],
    faqs: [
      {
        q: "What is a LinkedIn post generator?",
        a: "It is an AI tool that turns a topic or idea into a LinkedIn post draft. Qalam adds voice memory, hooks, archive, and scheduling around that workflow.",
      },
      {
        q: "Can I generate LinkedIn posts for free?",
        a: "Yes. Qalam has a free plan and public free tools, including the hook generator, headline analyzer, and profile optimizer.",
      },
    ],
    related: [
      { label: "Start Free", href: "/login" },
      { label: "Free Tools", href: "/free-tools" },
      { label: "AI Post Writer", href: "/product/post-writer" },
    ],
  },
  "linkedin-content-scheduler": {
    slug: "linkedin-content-scheduler",
    title: "LinkedIn Content Scheduler",
    h1: "LinkedIn content scheduler connected to your writing workflow",
    description:
      "Plan LinkedIn posts with Qalam. Move from AI drafts to scheduled content while keeping voice, revision history, and publishing context attached.",
    summary:
      "Qalam connects LinkedIn writing, draft review, archive, and scheduling so teams do not lose context between creation and publishing.",
    intent: "LinkedIn content scheduler, LinkedIn post scheduler, schedule LinkedIn posts",
    primaryKeyword: "LinkedIn content scheduler",
    keywords: [
      "LinkedIn content scheduler",
      "LinkedIn post scheduler",
      "schedule LinkedIn posts",
      "LinkedIn publishing tool",
      "AI LinkedIn scheduler",
      "content calendar for LinkedIn",
    ],
    updatedAt,
    sections: [
      {
        heading: "Scheduling belongs after the draft",
        body: "Qalam keeps the planned post connected to the draft, version, hook, and voice profile that created it.",
      },
      {
        heading: "Useful for teams and agencies",
        body: "Operators can manage publishing flow, approvals, and client-specific context without spreading work across disconnected tools.",
      },
      {
        heading: "Archive every scheduled post",
        body: "Scheduled and published content becomes part of the archive, making future planning easier and more consistent.",
      },
    ],
    faqs: [
      {
        q: "Can Qalam schedule LinkedIn posts?",
        a: "Qalam includes a post scheduler workflow that keeps drafting, revision context, archive, and publishing planning connected.",
      },
      {
        q: "Why use a LinkedIn scheduler with an AI writer?",
        a: "Because the best publishing workflow keeps the draft, approval, timing, and later review in one system.",
      },
    ],
    related: [
      { label: "Post Scheduler", href: "/product/post-scheduler" },
      { label: "Agency Workspaces", href: "/product/agency-workspaces" },
      { label: "Calendar", href: "/pricing" },
    ],
  },
  "linkedin-ghostwriter-ai": {
    slug: "linkedin-ghostwriter-ai",
    title: "LinkedIn Ghostwriter AI",
    h1: "LinkedIn ghostwriter AI that keeps your voice intact",
    description:
      "Use Qalam as a LinkedIn ghostwriter AI for founders, consultants, HR leaders, and agencies. Draft posts in your voice with memory, hooks, and archive continuity.",
    summary:
      "Qalam helps you create ghostwriter-style LinkedIn drafts while keeping the writer's real tone, examples, and revision patterns in the system.",
    intent: "LinkedIn ghostwriter AI, AI ghostwriter for LinkedIn, LinkedIn ghostwriting tool",
    primaryKeyword: "LinkedIn ghostwriter AI",
    keywords: [
      "LinkedIn ghostwriter AI",
      "AI ghostwriter for LinkedIn",
      "LinkedIn ghostwriting tool",
      "AI LinkedIn ghostwriter",
      "founder LinkedIn ghostwriter",
      "agency LinkedIn ghostwriting",
    ],
    updatedAt,
    sections: [
      {
        heading: "Ghostwriter workflow without voice loss",
        body: "The system learns from source posts and edits so drafts feel closer to the person publishing them.",
      },
      {
        heading: "Agency-ready structure",
        body: "Client work benefits from separate voice memory, review discipline, and reusable archives across accounts.",
      },
      {
        heading: "Built for credibility, not volume only",
        body: "Qalam prioritizes specific, experience-based LinkedIn posts that build a public body of work over time.",
      },
    ],
    faqs: [
      {
        q: "Can AI replace a LinkedIn ghostwriter?",
        a: "AI can handle drafting and structure, but the strongest results still come from real source material, edits, and human review. Qalam is built for that workflow.",
      },
      {
        q: "Is Qalam useful for ghostwriting agencies?",
        a: "Yes. Agencies can use Qalam's voice memory, approvals, and workspace model to keep client voices separate.",
      },
    ],
    related: [
      { label: "For Agencies", href: "/use-cases/agencies" },
      { label: "Agency Workspaces", href: "/product/agency-workspaces" },
      { label: "Contact", href: "/contact" },
    ],
  },
  "linkedin-hook-generator": {
    slug: "linkedin-hook-generator",
    title: "LinkedIn Hook Generator",
    h1: "LinkedIn hook generator for stronger post openings",
    description:
      "Generate LinkedIn hooks with Qalam. Create opening lines for posts, save strong structures, and feed proven hooks into a full AI LinkedIn writing workflow.",
    summary:
      "Qalam helps you generate and reuse LinkedIn hooks so posts start sharper and your strongest opening patterns do not disappear.",
    intent: "LinkedIn hook generator, LinkedIn post hook generator, AI hook generator",
    primaryKeyword: "LinkedIn hook generator",
    keywords: [
      "LinkedIn hook generator",
      "LinkedIn post hook generator",
      "AI hook generator",
      "LinkedIn opening lines",
      "LinkedIn hooks",
      "hook generator for LinkedIn",
    ],
    updatedAt,
    sections: [
      {
        heading: "Hooks decide whether the post gets read",
        body: "A strong LinkedIn opening creates tension, specificity, or curiosity fast enough to stop the scroll.",
      },
      {
        heading: "Generate multiple angles",
        body: "Use Qalam to create several hook options from one idea, then pick the one that best matches your voice and point of view.",
      },
      {
        heading: "Save reusable hook structures",
        body: "The full Qalam workflow keeps strong openings in your archive so they can shape future posts.",
      },
    ],
    faqs: [
      {
        q: "How do I generate LinkedIn hooks?",
        a: "Open Qalam's free hook generator, enter your topic, and choose from multiple opening lines designed for LinkedIn posts.",
      },
      {
        q: "What makes a good LinkedIn hook?",
        a: "A good hook is specific, easy to understand, and creates a reason to keep reading within the first line or two.",
      },
    ],
    related: [
      { label: "Free Hook Generator", href: "/free-tools/hook-generator" },
      { label: "Hook Product", href: "/product/hook-generator" },
      { label: "AI LinkedIn Writer", href: "/ai-linkedin-writer" },
    ],
  },
  "linkedin-profile-optimizer": {
    slug: "linkedin-profile-optimizer",
    title: "LinkedIn Profile Optimizer",
    h1: "LinkedIn profile optimizer for clearer positioning",
    description:
      "Optimize your LinkedIn profile with Qalam. Improve your headline, positioning, authority signal, and profile clarity with free AI-powered feedback.",
    summary:
      "Qalam's LinkedIn profile optimizer helps professionals clarify who they help, what they do, and why their profile should be remembered.",
    intent: "LinkedIn profile optimizer, LinkedIn headline analyzer, optimize LinkedIn profile",
    primaryKeyword: "LinkedIn profile optimizer",
    keywords: [
      "LinkedIn profile optimizer",
      "LinkedIn headline analyzer",
      "optimize LinkedIn profile",
      "LinkedIn profile AI",
      "LinkedIn profile improvement",
      "LinkedIn headline optimizer",
    ],
    updatedAt,
    sections: [
      {
        heading: "Your profile sets context before the post",
        body: "A clear headline and profile make every post easier to interpret. Readers should know what you do before they decide to follow.",
      },
      {
        heading: "Score clarity and keyword strength",
        body: "Qalam reviews profile positioning for specificity, authority, and search relevance so the profile supports discoverability.",
      },
      {
        heading: "Connect profile and content strategy",
        body: "The strongest LinkedIn presence aligns the profile promise with the topics and posts that appear in the feed.",
      },
    ],
    faqs: [
      {
        q: "How do I optimize my LinkedIn profile?",
        a: "Clarify your audience, outcome, proof, and niche terms. Qalam's free profile optimizer gives structured suggestions for improving that signal.",
      },
      {
        q: "Does Qalam analyze LinkedIn headlines?",
        a: "Yes. Qalam includes a free LinkedIn headline analyzer and profile optimizer for improving profile clarity.",
      },
    ],
    related: [
      { label: "Free Profile Optimizer", href: "/free-tools/profile-optimizer" },
      { label: "Headline Analyzer", href: "/free-tools/headline-analyzer" },
      { label: "For Consultants", href: "/use-cases/consultants" },
    ],
  },
  "linkedin-carousel-maker": {
    slug: "linkedin-carousel-maker",
    title: "LinkedIn Carousel Maker",
    h1: "LinkedIn carousel maker for repurposing posts",
    description:
      "Turn LinkedIn posts into carousel assets with Qalam. Repurpose ideas, structure slides, and connect carousel creation to your broader AI writing workflow.",
    summary:
      "Qalam helps convert strong post ideas into carousel-ready structure for LinkedIn distribution.",
    intent: "LinkedIn carousel maker, LinkedIn carousel generator, carousel builder LinkedIn",
    primaryKeyword: "LinkedIn carousel maker",
    keywords: [
      "LinkedIn carousel maker",
      "LinkedIn carousel generator",
      "carousel builder LinkedIn",
      "LinkedIn carousel tool",
      "AI carousel maker",
      "LinkedIn document post maker",
    ],
    updatedAt,
    sections: [
      {
        heading: "Carousels need structure first",
        body: "A good carousel is not a post split randomly into slides. It needs one clear idea, slide-level progression, and a strong closing action.",
      },
      {
        heading: "Repurpose strong posts",
        body: "Qalam helps turn proven post ideas into a multi-slide asset so one insight can work across more than one format.",
      },
      {
        heading: "Keep assets in the content system",
        body: "Carousel work should stay tied to the original post, hook, and archive instead of becoming a disconnected file.",
      },
    ],
    faqs: [
      {
        q: "Can Qalam create LinkedIn carousels?",
        a: "Qalam includes a carousel builder route for turning content into cleaner multi-slide assets for LinkedIn.",
      },
      {
        q: "What is the easiest way to make a LinkedIn carousel?",
        a: "Start from one strong post or idea, split it into a clear slide sequence, then use Qalam's carousel builder to shape the asset.",
      },
    ],
    related: [
      { label: "Free Carousel Builder", href: "/free-tools/carousel-builder" },
      { label: "AI Content Writer", href: "/ai-content-writer" },
      { label: "Free Tools", href: "/free-tools" },
    ],
  },
}

export const SEO_LANDING_ROUTES = Object.keys(SEO_LANDING_PAGES).map((slug) => `/${slug}`)

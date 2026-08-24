import type { MarketingFaq } from "@/lib/site-content"
import { REDIRECTED_SEO_SLUGS } from "@/lib/seo-redirects"

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
  example?: { heading: string; body: string }
  tool?: { label: string; description: string; href: string; detail: string }
  methodology?: { label: string; href: string }
  faqs: MarketingFaq[]
  related: { label: string; href: string }[]
}

const updatedAt = "2026-08-17"

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
        heading: "Saved voice context improves the starting point",
        body: "Qalam builds from real posts and examples you explicitly save. That reusable context gives the next draft a stronger starting point than a blank prompt box.",
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
        a: "A saved voice profile can move drafts closer to real source material. Qalam uses the posts and examples you deliberately save as reusable context.",
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
      "Turn a real lesson, decision, result, or rough note into a structured LinkedIn draft. Qalam keeps the source idea, hook options, voice context, revisions, archive, and scheduling in one writing workflow.",
    intent: "LinkedIn post writer, AI LinkedIn post generator, LinkedIn ghostwriting software, LinkedIn content writer",
    primaryKeyword: "LinkedIn post writer",
    keywords: [
      "LinkedIn post writer",
      "LinkedIn content writer",
      "LinkedIn writing assistant",
      "write LinkedIn posts",
      "AI LinkedIn post writer",
      "LinkedIn ghostwriter AI",
      "LinkedIn post generator",
      "AI content writer for LinkedIn",
    ],
    updatedAt,
    tool: {
      label: "Try the free Hook Generator",
      href: "/free-tools/hook-generator",
      description: "Test several opening angles from one real topic before turning the strongest one into a full post in your Qalam workspace.",
      detail: "The public tool creates hooks. Full drafts, voice context, version history, and scheduling use the signed-in workspace.",
    },
    methodology: { label: "See how Qalam writes from real work", href: "/ai-linkedin-writer" },
    sections: [
      {
        heading: "Start with something you can defend",
        body: "The strongest source is not a generic topic. It is a decision you made, a mistake you corrected, a result you can explain, a customer pattern you noticed, or a professional tension you have earned the right to discuss. Qalam helps structure that material without inventing the experience behind it.",
      },
      {
        heading: "Choose a hook that matches the point",
        body: "Generate several openings, then choose the one that creates a clear reason to read without exaggerating the claim. A useful hook names the tension, result, or unexpected lesson quickly. It does not rely on vague suspense or a copied formula.",
      },
      {
        heading: "Designed for revision, not one-shot output",
        body: "Strong LinkedIn writing usually improves through a sharper example, a shorter middle, a clearer transition, or a more useful close. Qalam keeps versions attached to the same draft so you can compare changes instead of resetting the work with every prompt.",
      },
      {
        heading: "Use voice context without surrendering judgment",
        body: "Saved posts and examples give the writer a better starting point for vocabulary, rhythm, and structure. You still review every claim and choose the final wording. Voice memory supports authorship. It does not replace it.",
      },
      {
        heading: "Move from draft to publishing without losing context",
        body: "The selected hook, draft versions, content score, schedule, and final post stay connected. That continuity matters when you return to an idea, prepare the next post in a series, or need to understand why a revision worked.",
      },
      {
        heading: "Better archive, better future posts",
        body: "Finished posts, hooks, and versions form a searchable record of the ideas you have already used. The archive helps you develop themes over time, avoid accidental repetition, and reuse a strong insight in a new format without copying the old post.",
      },
    ],
    example: {
      heading: "From a rough operational note to a credible post angle",
      body: "Raw note: 'Hiring slowed down because nobody owned the final decision.' Draft angle: 'We did not have a hiring-speed problem. We had a decision-owner problem. Every interview happened on time, then each candidate waited while three people assumed someone else would make the call.' Add only the true context, action, and result before publishing.",
    },
    faqs: [
      {
        q: "How do I write LinkedIn posts with AI?",
        a: "Use a LinkedIn-specific AI writer like Qalam: set up your voice profile, enter your idea, generate a draft, revise it, then save or schedule it.",
      },
      {
        q: "Is Qalam a LinkedIn ghostwriter?",
        a: "Qalam is software, not a human ghostwriter. It helps you write in your own voice by learning from your real posts and edits.",
      },
      {
        q: "Can I generate LinkedIn posts for free?",
        a: "Yes. Qalam's Free plan includes a monthly post allowance, and the public Hook Generator lets you test opening angles without a payment card.",
      },
      {
        q: "Will Qalam publish invented stories or metrics?",
        a: "The writer is designed around material you provide, but you remain responsible for reviewing every draft. Remove any claim, event, quote, or number you cannot support before publishing.",
      },
      {
        q: "Can teams use the same LinkedIn post writer?",
        a: "Yes. Qalam keeps drafts, revisions, approvals, and voice context connected so a reviewer can see the work before it is scheduled or published.",
      },
    ],
    related: [
      { label: "AI LinkedIn Writer", href: "/ai-linkedin-writer" },
      { label: "Free Hook Generator", href: "/free-tools/hook-generator" },
      { label: "LinkedIn Content Scheduler", href: "/linkedin-content-scheduler" },
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
      { label: "Approval Workflow", href: "/product/post-writer" },
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
      { label: "Managed Services", href: "/managed/apply" },
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
  "best-ai-linkedin-writer": {
    slug: "best-ai-linkedin-writer",
    title: "Best AI LinkedIn Writer",
    h1: "The best AI LinkedIn writer for serious professionals",
    description:
      "Looking for the best AI LinkedIn writer? Qalam is purpose-built for LinkedIn: voice memory, hook archives, draft history, and scheduling in one persistent writing system.",
    summary:
      "Qalam is built specifically for LinkedIn publishing - not a general-purpose AI tool with a LinkedIn template bolted on. Voice memory, persistent drafts, and a compound writing system in one workspace.",
    intent: "best AI LinkedIn writer, best LinkedIn AI tool, top LinkedIn writing AI",
    primaryKeyword: "best AI LinkedIn writer",
    keywords: [
      "best AI LinkedIn writer",
      "best LinkedIn AI tool",
      "top LinkedIn writing AI",
      "best AI for LinkedIn posts",
      "LinkedIn AI writer comparison",
      "Qalam LinkedIn writer",
    ],
    updatedAt,
    sections: [
      {
        heading: "What separates a LinkedIn-specific AI from a generic tool",
        body: "General-purpose AI models can draft a LinkedIn post from a prompt. A purpose-built LinkedIn workflow can keep saved voice examples, hook archives, draft history, and workspace context together so each new post starts with reusable material rather than a blank page.",
      },
      {
        heading: "The voice memory difference",
        body: "Qalam builds a voice profile from real LinkedIn posts and keeps examples you explicitly save alongside hooks and draft history. Generic prompt tools usually require you to provide that context again.",
      },
      {
        heading: "A complete publishing workflow, not just a draft button",
        body: "The best LinkedIn writing tool for consistent publishers connects generation, revision, archive, scheduling, and analytics in one system. Qalam is built around that workflow rather than offering a draft button attached to a content calendar tool.",
      },
    ],
    faqs: [
      {
        q: "What is the best AI tool for writing LinkedIn posts?",
        a: "For consistent publishers who need saved voice context and a connected archive, Qalam is purpose-built for LinkedIn. For occasional one-off posts, general-purpose tools work fine. The right choice depends on your publishing frequency and whether you need reusable context across sessions.",
      },
      {
        q: "Is there a free AI LinkedIn writer?",
        a: "Yes. Qalam has a free plan with 5 AI posts per month, no card required. The free tools at /free-tools also work without any account - hook generator, headline analyzer, profile optimizer, and more.",
      },
    ],
    related: [
      { label: "AI LinkedIn Writer", href: "/ai-linkedin-writer" },
      { label: "Start Free", href: "/login" },
      { label: "Compare Plans", href: "/pricing" },
    ],
  },
  "qalam-vs-taplio": {
    slug: "qalam-vs-taplio",
    title: "Qalam vs Taplio",
    h1: "Qalam vs Taplio: which LinkedIn tool fits your workflow",
    description:
      "A direct comparison of Qalam and Taplio for LinkedIn content creation. Both are LinkedIn-focused tools, but they are built around different workflow assumptions and audience types.",
    summary:
      "Qalam focuses on voice memory, persistent drafts, and compounding writing quality. Taplio focuses on scheduling, analytics, and volume management. The right tool depends on whether your bottleneck is writing quality or publishing operations.",
    intent: "Qalam vs Taplio, Taplio alternative, LinkedIn writing tool comparison",
    primaryKeyword: "Qalam vs Taplio",
    keywords: [
      "Qalam vs Taplio",
      "Taplio alternative",
      "LinkedIn writing tool comparison",
      "best Taplio alternative",
      "LinkedIn AI tool comparison",
      "Taplio vs Qalam",
    ],
    updatedAt,
    sections: [
      {
        heading: "What each tool is primarily built for",
        body: "Taplio is built around scheduling, engagement tracking, and viral post inspiration. It is a publishing operations tool with AI drafting as a secondary feature. Qalam is built around voice memory and persistent drafts first, with scheduling and archive as connected layers of the same system.",
      },
      {
        heading: "Voice fidelity: the core difference",
        body: "Qalam builds a reusable profile from your actual LinkedIn posts and keeps examples you explicitly save available across sessions. Taplio has a different product emphasis, centered more heavily on publishing operations.",
      },
      {
        heading: "Which workflow each tool fits",
        body: "If you manage high posting volume across multiple accounts and need scheduling analytics, Taplio's operational features may fit better. If you are a solo creator or consultant who wants saved voice context tied to a career record, Qalam is built for that workflow.",
      },
    ],
    faqs: [
      {
        q: "Is Qalam a Taplio alternative?",
        a: "Yes, Qalam is a Taplio alternative for creators who prioritize saved voice context and writing quality over analytics and scheduling volume. Its voice profile and persistent draft archive support a different workflow emphasis.",
      },
      {
        q: "Which is cheaper, Qalam or Taplio?",
        a: "Qalam uses Pakistan-first quarterly pricing. Solo is PKR 1,598 per quarter, and a Free plan is available without a payment card.",
      },
    ],
    related: [
      { label: "AI LinkedIn Writer", href: "/ai-linkedin-writer" },
      { label: "Voice Profile", href: "/product/voice-profile" },
      { label: "Pricing", href: "/pricing" },
    ],
  },
  "linkedin-content-strategy": {
    slug: "linkedin-content-strategy",
    title: "LinkedIn Content Strategy",
    h1: "LinkedIn content strategy that builds authority, not just followers",
    description:
      "A practical LinkedIn content strategy guide for founders, consultants, HR leaders, and agencies. Build a posting system that compounds over time instead of chasing one-off reach.",
    summary:
      "An effective LinkedIn content strategy starts with a defined territory, a consistent voice, and a publishing system that retains what works. Qalam is built to support that workflow.",
    intent: "LinkedIn content strategy, LinkedIn strategy guide, LinkedIn publishing strategy",
    primaryKeyword: "LinkedIn content strategy",
    keywords: [
      "LinkedIn content strategy",
      "LinkedIn strategy guide",
      "LinkedIn publishing strategy",
      "how to build LinkedIn strategy",
      "LinkedIn content plan",
      "LinkedIn growth strategy",
    ],
    updatedAt,
    sections: [
      {
        heading: "Start with a territory, not a content calendar",
        body: "A content calendar without a defined territory produces volume without direction. Choose a specific area where you have genuine expertise and recurring experience, then build your posting system around it. The territory is what lets you write consistently without running out of ideas.",
      },
      {
        heading: "The three elements every LinkedIn strategy needs",
        body: "First, a defined voice so posts sound like a person rather than a brand account. Second, a hook system so posts get read rather than scrolled past. Third, an archive so approved structures and ideas compound instead of disappearing after publishing.",
      },
      {
        heading: "Building the compounding layer",
        body: "The LinkedIn accounts that generate consistent inbound do not just post more - they build a searchable body of work that lets prospective clients self-qualify before reaching out. This requires retaining approved posts, tracking what performs, and reusing strong structures rather than reinventing every session.",
      },
    ],
    faqs: [
      {
        q: "What is a good LinkedIn content strategy?",
        a: "Define a specific territory where you have real expertise, build a consistent posting cadence (two to three times per week), focus on specific experience-based content rather than generic advice, and build an archive of what works so your publishing improves over time rather than starting from scratch each week.",
      },
      {
        q: "How many times a week should I post on LinkedIn?",
        a: "Two to three times per week is the sustainable cadence for most professionals. Consistency matters more than frequency - a consistent three-post week that generates engagement outperforms five posts with weak engagement because the algorithm distributes based on signal quality, not posting volume.",
      },
    ],
    related: [
      { label: "For Founders", href: "/use-cases/founders" },
      { label: "AI LinkedIn Writer", href: "/ai-linkedin-writer" },
      { label: "Blog", href: "/blog" },
    ],
  },
  "ai-writing-tool-pakistan": {
    slug: "ai-writing-tool-pakistan",
    title: "AI Writing Tool Pakistan",
    h1: "The AI writing tool built for Pakistan's LinkedIn creators",
    description:
      "Qalam is the AI writing tool built for Pakistani founders, consultants, HR leaders, and agencies. PKR-first pricing, JazzCash and Easypaisa billing, and a workflow built for serious LinkedIn publishing.",
    summary:
      "Most AI writing tools are priced and designed for Western markets. Qalam is purpose-built for Pakistan: local pricing, local payment methods, and a LinkedIn publishing system that works for the Pakistani professional audience.",
    intent: "AI writing tool Pakistan, LinkedIn AI tool Pakistan, AI content writer Pakistan",
    primaryKeyword: "AI writing tool Pakistan",
    keywords: [
      "AI writing tool Pakistan",
      "LinkedIn AI tool Pakistan",
      "AI content writer Pakistan",
      "best AI writing app Pakistan",
      "LinkedIn writer Pakistan",
      "Qalam Pakistan",
    ],
    updatedAt,
    sections: [
      {
        heading: "Built for the Pakistan market, not adapted for it",
        body: "Qalam is priced in PKR. Solo is PKR 1,598 per quarter and Pro is PKR 2,998 per quarter. Card and assisted local payment workflows are available.",
      },
      {
        heading: "The Pakistani LinkedIn opportunity",
        body: "Pakistani founders, HR leaders, consultants, and agency owners are building LinkedIn presence faster than the market expects. The professionals who build consistent, specific LinkedIn content now will hold the authority position when the market matures. Qalam is built to support that publishing workflow.",
      },
      {
        heading: "Voice memory for every professional niche",
        body: "Whether you write about tech startups, HR, consulting, sales, or marketing, Qalam learns from your real posts. The voice memory system works across every professional context in the Pakistani market - not just for one type of creator.",
      },
    ],
    faqs: [
      {
        q: "Is there a good LinkedIn AI tool for Pakistan?",
        a: "Qalam is purpose-built for Pakistan. It is priced in PKR, accepts payment via JazzCash, Easypaisa, and bank transfer, and has a free plan with no card required. It is the LinkedIn AI writing tool designed specifically for Pakistani professionals.",
      },
      {
        q: "How much does Qalam cost in Pakistan?",
        a: "Qalam's Free plan includes 5 AI posts per month without a payment card. Solo is PKR 1,598 per quarter and Pro is PKR 2,998 per quarter, both billed as one free month included in the quarter.",
      },
    ],
    related: [
      { label: "Pricing in PKR", href: "/pricing" },
      { label: "Free Tools", href: "/free-tools" },
      { label: "Start Free", href: "/login" },
    ],
  },
  "linkedin-personal-brand": {
    slug: "linkedin-personal-brand",
    title: "LinkedIn Personal Brand",
    h1: "Build a LinkedIn personal brand that generates real inbound",
    description:
      "How to build a LinkedIn personal brand that generates inbound leads, career opportunities, and authority in your field - without sounding like a generic self-promotion account.",
    summary:
      "A LinkedIn personal brand is not about self-promotion. It is a searchable public record of specific thinking that lets prospective clients, employers, and collaborators evaluate your expertise before they reach out.",
    intent: "LinkedIn personal brand, build LinkedIn personal brand, LinkedIn branding guide",
    primaryKeyword: "LinkedIn personal brand",
    keywords: [
      "LinkedIn personal brand",
      "build LinkedIn personal brand",
      "LinkedIn branding guide",
      "LinkedIn personal branding strategy",
      "how to brand yourself on LinkedIn",
      "LinkedIn authority building",
    ],
    updatedAt,
    sections: [
      {
        heading: "Personal brand is not self-promotion",
        body: "The professionals with the strongest LinkedIn personal brands are not the ones who post about themselves most. They are the ones who publish specific, experience-based content about their field consistently enough that prospective clients and employers form a genuine impression of how they think.",
      },
      {
        heading: "The four components of a strong LinkedIn brand",
        body: "A clear profile that names your audience and outcome. A consistent posting territory that is specific enough to be ownable. A posting cadence that does not require daily output to be effective. And an archive of past content that makes your expertise visible to anyone who visits your profile.",
      },
      {
        heading: "Why the archive is the brand",
        body: "The most credible LinkedIn profiles are not the ones with the most followers or the most recent viral post. They are the ones where a prospective client can spend twenty minutes reading past content and come away with a clear sense of what the person believes, what they have experienced, and whether they are worth a conversation.",
      },
    ],
    faqs: [
      {
        q: "How do I build a LinkedIn personal brand?",
        a: "Define a specific territory where you have genuine expertise, optimize your profile to reflect it clearly, and publish consistent content from that perspective over time. The searchable archive of published thought is what becomes the brand - not a single viral post.",
      },
      {
        q: "How long does it take to build a LinkedIn personal brand?",
        a: "Most professionals start seeing meaningful inbound after three to six months of consistent, specific publishing. The compound effect accelerates as the content archive grows. Starting is more important than the timeline.",
      },
    ],
    related: [
      { label: "For Founders", href: "/use-cases/founders" },
      { label: "For Consultants", href: "/use-cases/consultants" },
      { label: "AI LinkedIn Writer", href: "/ai-linkedin-writer" },
    ],
  },
  "linkedin-post-ideas": {
    slug: "linkedin-post-ideas",
    title: "LinkedIn Post Ideas",
    h1: "LinkedIn post ideas that do not sound like everyone else",
    description:
      "Fresh LinkedIn post ideas for founders, consultants, HR leaders, and marketers. Ideas that generate real engagement by starting from specific experience rather than generic advice.",
    summary:
      "The best LinkedIn post ideas come from specific experience: a decision that did not go as expected, an observation from client work, a counterintuitive lesson from operations. Qalam helps you turn those raw ideas into posts.",
    intent: "LinkedIn post ideas, LinkedIn content ideas, LinkedIn post topics",
    primaryKeyword: "LinkedIn post ideas",
    keywords: [
      "LinkedIn post ideas",
      "LinkedIn content ideas",
      "LinkedIn post topics",
      "what to post on LinkedIn",
      "LinkedIn post inspiration",
      "LinkedIn writing ideas",
    ],
    updatedAt,
    sections: [
      {
        heading: "The best post ideas come from what already happened",
        body: "The most engaging LinkedIn posts are not inspired ideas - they are specific reports from real experience. A decision you made this week. A lesson you learned from a client. A pattern you noticed in your market. These posts perform better than generic topic posts because they carry an irreplicable authority signal.",
      },
      {
        heading: "Twelve post idea categories that consistently generate engagement",
        body: "Lessons from a specific mistake or failure. A counterintuitive finding from real data. A before-and-after comparison from a decision you made. An observation about your industry that most people are not saying. A specific process you changed and why. A hiring or team decision and its outcome. A framework you actually use (not one you read about). A customer insight that changed your thinking. A market trend with a specific opinion attached. A pattern you noticed only after seeing it five times. A prediction with reasoning. A defense of an unpopular position in your field.",
      },
      {
        heading: "How to never run out of LinkedIn post ideas",
        body: "The professionals who maintain consistent LinkedIn publishing without running out of ideas keep a running capture system for raw thoughts, observations, and decisions as they happen during the week. The ideas are not created at posting time - they are captured in the moment and developed into posts later. Qalam is designed to work with this workflow: capture a raw idea, turn it into a draft with voice memory, refine it, and schedule it without starting from scratch.",
      },
    ],
    faqs: [
      {
        q: "What should I post about on LinkedIn?",
        a: "Post about specific things you have actually experienced: a decision and its outcome, a lesson from a client or project, a counterintuitive observation from your field, or a framework you genuinely use. Specific, experience-based content consistently outperforms generic advice posts.",
      },
      {
        q: "How do I come up with LinkedIn post ideas every week?",
        a: "Keep a running capture system for observations, decisions, and lessons as they happen during the week. Do not try to create ideas at posting time. Review your capture list when you sit down to write, pick the most specific or interesting item, and turn it into a structured post.",
      },
    ],
    related: [
      { label: "AI Post Writer", href: "/product/post-writer" },
      { label: "Free Hook Generator", href: "/free-tools/hook-generator" },
      { label: "Blog", href: "/blog" },
    ],
  },
  "linkedin-writing-tips": {
    slug: "linkedin-writing-tips",
    title: "LinkedIn Writing Tips",
    h1: "LinkedIn writing tips that actually improve engagement",
    description:
      "Practical LinkedIn writing tips for professionals who want to improve post quality, increase engagement, and build authority without sounding like every other LinkedIn account.",
    summary:
      "The writing techniques that separate high-performing LinkedIn posts from forgettable ones are specific and repeatable. These tips apply across every niche and audience size.",
    intent: "LinkedIn writing tips, how to write better LinkedIn posts, LinkedIn writing advice",
    primaryKeyword: "LinkedIn writing tips",
    keywords: [
      "LinkedIn writing tips",
      "how to write better LinkedIn posts",
      "LinkedIn writing advice",
      "LinkedIn post writing guide",
      "LinkedIn writing best practices",
      "professional LinkedIn writing",
    ],
    updatedAt,
    sections: [
      {
        heading: "Lead with specificity, not context",
        body: "The most common LinkedIn writing mistake is starting a post with context rather than the interesting claim. 'In my ten years of experience, I have noticed...' delays the hook by ten words. Start with the observation itself: 'The best LinkedIn posts I have ever read have one thing in common.' Let the reader discover the context later.",
      },
      {
        heading: "Write shorter sentences than you think you need to",
        body: "LinkedIn is read on mobile, mostly in brief stolen moments. Long, complex sentences with multiple clauses lose readers mid-way. Each sentence should advance the post by one clear step. When in doubt, break it in two. The rhythm of short sentences is also easier to scan, which improves the scroll-stop rate.",
      },
      {
        heading: "End every post with a reason to respond",
        body: "The last line of your post determines whether you get comments. A question that is too broad ('What do you think?') gives readers nothing to work with. A specific, answerable question ('Which of these patterns have you seen in your own team?') lowers the activation energy for a comment. Comments are the highest-value signal to the LinkedIn algorithm.",
      },
    ],
    faqs: [
      {
        q: "What are the most important LinkedIn writing tips?",
        a: "Lead with your strongest claim rather than context. Write in short mobile-friendly sentences. Use line breaks between ideas. End with a specific, answerable question that invites real responses. Save your word count for the sharpest version of one idea rather than covering three adjacent points.",
      },
      {
        q: "How do I make my LinkedIn posts more engaging?",
        a: "Improve the hook (first one to two lines), develop one specific idea rather than three general ones, and close with a concrete question. Posts that generate conversation get more distribution because comments are the highest-value engagement signal in the LinkedIn algorithm.",
      },
    ],
    related: [
      { label: "Free Hook Generator", href: "/free-tools/hook-generator" },
      { label: "AI LinkedIn Writer", href: "/ai-linkedin-writer" },
      { label: "LinkedIn Post Ideas", href: "/linkedin-post-ideas" },
    ],
  },
  "free-linkedin-tools": {
    slug: "free-linkedin-tools",
    title: "Free LinkedIn Tools",
    h1: "Free LinkedIn tools that improve your posts, most with no account needed",
    description:
      "Seven free LinkedIn tools built by Qalam: hook generator, comment generator, headline analyzer, profile optimizer, post quality checker, carousel builder, and post readiness review. Six work with no sign-in.",
    summary:
      "Six of Qalam's seven free tools work instantly without creating an account. Hook generator, headline analyzer, profile optimizer, post quality checker, carousel builder, and post readiness review need nothing but a paste. Comment Generator needs a free sign-in to track your monthly usage.",
    intent: "free LinkedIn tools, free LinkedIn AI tools, LinkedIn tools no account",
    primaryKeyword: "free LinkedIn tools",
    keywords: [
      "free LinkedIn tools",
      "free LinkedIn AI tools",
      "LinkedIn tools no account",
      "free LinkedIn writing tools",
      "best free LinkedIn tools",
      "free tools for LinkedIn creators",
    ],
    updatedAt,
    sections: [
      {
        heading: "Seven tools, minimal friction",
        body: "Six tools at byqalam.com/free-tools work without creating an account or entering a credit card. Paste your content and get an immediate structured review. Comment Generator is the one exception: it asks for a free sign-in so it can track your monthly comment quota.",
      },
      {
        heading: "What each tool does",
        body: "Hook Generator creates 5 opening line variants for a LinkedIn topic. Comment Generator drafts voice-aware replies and requires free sign-in. Headline Analyzer reviews a profile headline across 5 criteria. Profile Optimizer provides a structured audit with specific rewrites. Post Quality Checker reviews clarity, specificity, usefulness, and the hook. Carousel Builder converts a post or outline into branded slide assets. Post Readiness Review gives a pre-publish quality score without predicting reach.",
      },
      {
        heading: "Built as a trust surface, not a paywall",
        body: "These tools exist so professionals can try Qalam's AI quality before creating an account. They are not crippled demos - they use the same AI as the paid product. The free plan with 5 monthly posts also requires no card.",
      },
    ],
    faqs: [
      {
        q: "What free LinkedIn tools are available from Qalam?",
        a: "Qalam offers seven free tools: LinkedIn hook generator, comment generator, headline analyzer, profile optimizer, post quality checker, carousel builder, and post readiness review. All are available at byqalam.com/free-tools.",
      },
      {
        q: "Do the Qalam free LinkedIn tools require an account?",
        a: "Six of the seven tools at byqalam.com/free-tools work without creating an account or entering a credit card. Comment Generator is the exception - it asks for a free sign-in so it can track your monthly comment limit. None of them are crippled demos; they use the same AI as the paid product.",
      },
    ],
    related: [
      { label: "Hook Generator", href: "/free-tools/hook-generator" },
      { label: "Comment Generator", href: "/free-tools/comment-generator" },
      { label: "Headline Analyzer", href: "/free-tools/headline-analyzer" },
      { label: "All Free Tools", href: "/free-tools" },
    ],
  },
  "linkedin-ai-ghostwriter": {
    slug: "linkedin-ai-ghostwriter",
    title: "LinkedIn AI Ghostwriter",
    h1: "LinkedIn AI ghostwriter that writes in your voice, not a template",
    description:
      "Use Qalam as a LinkedIn writing assistant: generate drafts from your saved voice profile, experience, and professional context while keeping final review in your hands.",
    summary:
      "A LinkedIn AI ghostwriter should produce posts that sound like the person publishing them - not a generic AI output. Qalam's voice memory system is built for exactly this use case.",
    intent: "LinkedIn AI ghostwriter, AI ghostwriter for LinkedIn, LinkedIn ghostwriter AI tool",
    primaryKeyword: "LinkedIn AI ghostwriter",
    keywords: [
      "LinkedIn AI ghostwriter",
      "AI ghostwriter for LinkedIn",
      "LinkedIn ghostwriter AI tool",
      "AI LinkedIn ghostwriting",
      "best LinkedIn ghostwriter AI",
      "LinkedIn ghostwriter software",
    ],
    updatedAt,
    sections: [
      {
        heading: "The problem with generic AI ghostwriting",
        body: "Most AI tools produce a reasonable LinkedIn post from a prompt, but it sounds like AI. The vocabulary is too clean, the structure too predictable, and the personal detail absent. A real ghostwriter works from the client's own stories, examples, and perspectives. An AI ghostwriter should do the same.",
      },
      {
        heading: "How Qalam's voice memory changes the output",
        body: "Qalam trains on real posts you have written and approved. Every session starts from that accumulated material rather than from generic best practices. The system learns your hook preferences, your paragraph length, your specific vocabulary, and the types of examples you favor - so drafts come out closer to your actual voice.",
      },
      {
        heading: "Ghostwriting for agencies and teams",
        body: "Agencies using Qalam as an AI ghostwriting tool get per-client voice profiles, isolated draft histories, and approval workflows. Each client maintains a separate memory layer so outputs do not bleed across accounts. The result is a ghostwriting operation that scales without flattening every client into the same generic content.",
      },
    ],
    faqs: [
      {
        q: "Can AI ghostwrite LinkedIn posts that sound authentic?",
        a: "A saved voice profile can make drafts more consistent with real source material. Qalam uses actual LinkedIn posts and examples you deliberately save to reduce generic output, while you still review every draft.",
      },
      {
        q: "Is Qalam a LinkedIn ghostwriter or an AI tool?",
        a: "Qalam is AI software that performs the ghostwriting function: it produces drafts in the writer's voice from topic inputs. It is software, not a human ghostwriter. The distinction matters because Qalam's output improves over time through voice memory, which a human ghostwriter does separately through onboarding.",
      },
    ],
    related: [
      { label: "For Agencies", href: "/use-cases/agencies" },
      { label: "Voice Profile", href: "/product/voice-profile" },
      { label: "LinkedIn Ghostwriter AI", href: "/linkedin-ghostwriter-ai" },
    ],
  },
  "ats-resume-score": {
    slug: "ats-resume-score",
    title: "Free ATS Resume Score with Recruiter Context",
    h1: "Get a free ATS resume score, then see what to fix first",
    description: "Use Qalam's free ATS Resume Checker to review parsing, job fit, recruiter readability, achievement evidence, skills credibility, progression, clarity, and hiring risks.",
    summary: "A useful ATS resume score explains the evidence behind the number, identifies the most material risks, and never pretends to be an employer's private system.",
    intent: "ATS resume score, free ATS score, resume score checker, recruiter resume review",
    primaryKeyword: "ATS resume score",
    keywords: ["ATS resume score", "free ATS resume checker", "resume score checker", "ATS score", "recruiter resume review"],
    updatedAt,
    tool: { label: "Free ATS Resume Checker", href: "/free-tools/ats-resume-checker", description: "Paste a complete resume and optionally a target job description for an evidence-first ATS and recruiter review.", detail: "No account or payment card required for the public check." },
    methodology: { label: "Read the scoring methodology", href: "/methodology/ats-resume-readiness" },
    sections: [
      { heading: "An ATS score is a diagnostic, not a hiring prediction", body: "Employer systems use different parsers, rules, knockout questions, and job configurations. A responsible score checks what can be reviewed from the resume and target role: whether the document parses cleanly, communicates fit, and makes credible evidence easy to find." },
      { heading: "What a strong score should expose", body: "A good result separates a weak heading from a missing qualification, a buried achievement from a genuine experience gap, and a keyword from proof that the candidate actually used the skill. That distinction protects both the candidate and the reader of the resume." },
      { heading: "Use the score to choose one revision round", body: "Fix the highest-impact issue first. Usually that means clarifying the target role, moving the strongest outcome into recent experience, or connecting a claimed skill to a specific project. Re-run the check only after making real changes." },
    ],
    example: { heading: "A 74 score can still hide a serious issue", body: "A resume may parse well and contain the target tool names, yet bury its best result below routine duties. The right fix is not more keywords. It is leading the recent role with ownership, scope, and an outcome the candidate can support." },
    faqs: [{ q: "Is Qalam's ATS score an employer score?", a: "No. It is an independent Qalam diagnostic using the public evidence-first methodology. It does not reproduce any employer's private ATS setup." }, { q: "Can a high ATS score guarantee an interview?", a: "No. The score helps improve clarity and role relevance. Hiring outcomes depend on the role, applicant pool, screening process, and human judgment." }],
    related: [{ label: "ATS Resume Builder", href: "/ats-resume-builder" }, { label: "Resume keyword match", href: "/resume-keyword-match" }, { label: "ATS methodology", href: "/methodology/ats-resume-readiness" }],
  },
  "resume-keyword-match": {
    slug: "resume-keyword-match",
    title: "Resume Keyword Match for a Target Job",
    h1: "Match resume keywords to the job, without claiming experience you do not have",
    description: "Compare a resume with a target job description using Qalam's free ATS Resume Checker. Find terminology gaps, evidence gaps, and honest rewrite priorities.",
    summary: "Resume keyword matching works when it connects terms in the job description to evidence in the candidate's actual experience, not when it blindly repeats the job post.",
    intent: "resume keyword match, resume keywords for job description, ATS keyword match, resume job match",
    primaryKeyword: "resume keyword match",
    keywords: ["resume keyword match", "resume keywords for job description", "ATS keyword match", "resume job match", "job description keywords"],
    updatedAt,
    tool: { label: "Check resume keyword match free", href: "/free-tools/ats-resume-checker", description: "Add both the complete resume and target job description to see role alignment, terminology, and evidence gaps.", detail: "The checker labels unsupported terms as gaps instead of inserting them." },
    methodology: { label: "How Qalam evaluates role alignment", href: "/methodology/ats-resume-readiness" },
    sections: [
      { heading: "Terms alone do not demonstrate fit", body: "A role may ask for stakeholder management, SQL, and forecasting. The resume should show where those capabilities were used, at what scope, and with what result. A skills list that repeats the job post without evidence is weak to both recruiters and ATS reviewers." },
      { heading: "Separate wording gaps from experience gaps", body: "If the candidate did the work but used different terminology, the resume can be clarified. If the role requires a certification, industry background, or responsibility the candidate does not have, the right response is to acknowledge the gap and strengthen adjacent evidence." },
      { heading: "Create one version per meaningful role", body: "One general resume cannot optimize equally for a product role, a consulting role, and an operations role. Keep a separate targeted version for each serious application so the language, proof order, and summary match the actual job." },
    ],
    example: { heading: "From vague responsibility to supported terminology", body: "Instead of writing 'worked with data', a candidate who built weekly operational reports can write 'built weekly operational reports in Excel and SQL for regional performance reviews'. The added terms are supported by the work, not copied from the job post." },
    faqs: [{ q: "Should I add every keyword from a job description?", a: "No. Add only terms your experience, projects, education, or credible training can support. Unsupported words reduce trust." }, { q: "Does keyword matching replace a targeted resume?", a: "No. Keyword coverage is one part of a targeted resume. The document also needs clear scope, achievements, readable structure, and accurate chronology." }],
    related: [{ label: "ATS resume score", href: "/ats-resume-score" }, { label: "Build a targeted resume", href: "/ats-resume-builder" }, { label: "Job description match", href: "/job-description-match" }],
  },
  "ats-safe-resume-templates": {
    slug: "ats-safe-resume-templates",
    title: "ATS-Safe Resume Templates for Clear Parsing",
    h1: "Choose an ATS-safe resume template that keeps your evidence readable",
    description: "Explore Qalam's ATS-safe resume templates and build a targeted resume with standard headings, readable chronology, editable sections, and PDF export.",
    summary: "ATS-safe templates protect readable structure. They do not compensate for vague claims, unsupported keywords, or a resume that does not match the target role.",
    intent: "ATS-safe resume templates, ATS friendly resume template, resume format for ATS, ATS resume layout",
    primaryKeyword: "ATS-safe resume templates",
    keywords: ["ATS-safe resume templates", "ATS friendly resume template", "resume format for ATS", "ATS resume layout", "ATS resume template"],
    updatedAt,
    tool: { label: "Build an ATS-safe resume", href: "/ats-resume-builder", description: "Sign in to create one full targeted resume free each month using 12 ATS-safe templates and a complete editor.", detail: "Templates are designed for structure and readability, not decorative formatting tricks." },
    methodology: { label: "Check resume readiness first", href: "/free-tools/ats-resume-checker" },
    sections: [
      { heading: "Start with standard document structure", body: "Use a clear name and contact block, recognisable section headings, reverse-chronological experience, and a skills area that does not hide important details in graphics. The reader should find the target role, recent scope, and evidence immediately." },
      { heading: "Avoid format choices that weaken parsing", body: "Complex columns, text inside images, decorative icons used as labels, and unusual heading names can make a resume harder to extract or scan. Visual restraint is not boring when the content is specific and the hierarchy is strong." },
      { heading: "Template selection comes after role strategy", body: "Choose a template after deciding what evidence the target role needs to see first. A senior operator may lead with scope and outcomes. An early-career candidate may lead with projects, education, and relevant skills." },
    ],
    example: { heading: "What an ATS-safe experience entry looks like", body: "Role, employer, dates, and location appear as plain readable text. The first bullet states the business responsibility, scope, and result. Supporting bullets name tools or methods only where they genuinely contributed to the work." },
    faqs: [{ q: "Are two-column resumes ATS safe?", a: "Some systems parse them correctly, but a single-column structure is generally easier to review and less likely to hide sequence or section relationships." }, { q: "Can I use color in an ATS resume?", a: "Yes, restrained color can be readable. It should never carry essential meaning or replace clear headings and plain text." }],
    related: [{ label: "Free ATS Resume Checker", href: "/free-tools/ats-resume-checker" }, { label: "ATS resume score", href: "/ats-resume-score" }, { label: "ATS methodology", href: "/methodology/ats-resume-readiness" }],
  },
  "recruiter-resume-review": {
    slug: "recruiter-resume-review",
    title: "Recruiter Resume Review for Evidence and Readability",
    h1: "Review your resume through the first questions a recruiter will ask",
    description: "Use Qalam's ATS Resume Checker for a recruiter-style review of role clarity, achievement evidence, progression, skills credibility, readability, and job fit.",
    summary: "A recruiter review should answer whether the target role is clear, whether the candidate has credible proof, and whether the document makes that proof easy to see quickly.",
    intent: "recruiter resume review, resume review service, recruiter resume feedback, resume readability check",
    primaryKeyword: "recruiter resume review",
    keywords: ["recruiter resume review", "resume review service", "recruiter resume feedback", "resume readability check", "resume critique"],
    updatedAt,
    tool: { label: "Get a free recruiter-style review", href: "/free-tools/ats-resume-checker", description: "Run the public ATS checker to review recruiter readability, evidence, progression, and common rejection risks.", detail: "Qalam gives an independent diagnostic, not feedback from a named recruiter or employer." },
    methodology: { label: "See the eight review factors", href: "/methodology/ats-resume-readiness" },
    sections: [
      { heading: "Recruiters look for a coherent role story", body: "Within seconds, the reader should understand what role the candidate wants, the level of responsibility they have held, and the proof that supports their claim. A strong document does not make the reader infer the career story from scattered duties." },
      { heading: "Achievement evidence changes the quality of the review", body: "Responsibilities explain what a person was assigned. Achievements show what changed because of their work. Use numbers only when they are accurate, then add context such as scale, team, customer, process, or decision ownership." },
      { heading: "Readability is part of credibility", body: "Dense blocks, inconsistent dates, vague section labels, and a long skills list make a good candidate appear less prepared. The answer is not more design. It is cleaner hierarchy and better evidence selection." },
    ],
    example: { heading: "A recruiter-ready bullet", body: "'Owned onboarding' becomes 'Redesigned onboarding for a 14-person support team, reducing first-response handoffs by documenting routing rules and escalation criteria.' The revision makes ownership, setting, method, and outcome visible." },
    faqs: [{ q: "Will a recruiter review rewrite my resume for me?", a: "The public review identifies priority improvements. Signed-in resume tools can help create an editable targeted version from your supplied facts." }, { q: "Can Qalam see recruiter behavior?", a: "No. Qalam does not claim access to private recruiter systems, employer ATS configurations, or hiring outcomes." }],
    related: [{ label: "ATS resume score", href: "/ats-resume-score" }, { label: "Build a resume version", href: "/ats-resume-builder" }, { label: "Career Visibility", href: "/career-visibility" }],
  },
  "linkedin-headline-examples": {
    slug: "linkedin-headline-examples",
    title: "LinkedIn Headline Examples for Clear Positioning",
    h1: "Use LinkedIn headline examples to make your role and value clear",
    description: "Review practical LinkedIn headline examples, then use Qalam's free Headline Analyzer to improve role clarity, audience relevance, keywords, proof, and readability.",
    summary: "The strongest LinkedIn headline is not a string of job titles. It makes the professional role, audience, value, and relevant context easier to understand.",
    intent: "LinkedIn headline examples, LinkedIn headline ideas, LinkedIn headline generator, professional headline examples",
    primaryKeyword: "LinkedIn headline examples",
    keywords: ["LinkedIn headline examples", "LinkedIn headline ideas", "LinkedIn headline generator", "professional headline examples", "LinkedIn profile headline"],
    updatedAt,
    tool: { label: "Analyze a LinkedIn headline free", href: "/free-tools/headline-analyzer", description: "Paste a headline for a structured review of clarity, relevance, keywords, authority, and improvement options.", detail: "The free analyzer gives suggestions. You choose the claims that remain accurate." },
    methodology: { label: "Optimize the full LinkedIn profile", href: "/linkedin-optimization" },
    sections: [
      { heading: "Start with the professional signal", body: "A headline should establish a role or professional identity before it tries to be clever. Add the audience, problem, domain, or proof only when it improves understanding. The goal is a person who lands on the profile knowing why they should keep reading." },
      { heading: "Examples should be adapted, not copied", body: "A consultant might write 'Operations consultant helping logistics teams reduce handoff friction'. A product manager might write 'B2B product manager focused on activation and self-serve adoption'. The wording is useful only if it matches actual work." },
      { heading: "Keywords need a role in the sentence", body: "Search terms work best when they describe a real capability or domain. A headline packed with 'leader, strategist, growth, innovation, AI' says little unless the profile provides context and evidence." },
    ],
    example: { heading: "A simple before-and-after", body: "Before: 'Helping businesses grow | Strategy | Innovation'. After: 'Growth strategist for B2B service firms | Positioning, demand generation, and sales enablement'. The second version makes the audience and work more concrete without inventing proof." },
    faqs: [{ q: "How long should a LinkedIn headline be?", a: "Use enough words to make the role and value clear, then remove repetition. A short specific headline is stronger than a full character limit of disconnected terms." }, { q: "Should I include Open to Work in my headline?", a: "Use the platform setting when appropriate. Keep the headline focused on the target professional position and strengths you want a reader to understand." }],
    related: [{ label: "Free Profile Optimizer", href: "/free-tools/profile-optimizer" }, { label: "LinkedIn profile optimization", href: "/linkedin-profile-optimization" }, { label: "AI LinkedIn post generator", href: "/ai-linkedin-post-generator" }],
  },
  "linkedin-about-examples": {
    slug: "linkedin-about-examples",
    title: "LinkedIn About Examples that Use Real Evidence",
    h1: "Write a LinkedIn About section that proves your professional story",
    description: "Use evidence-led LinkedIn About examples and Qalam's free Profile Optimizer to clarify your role, audience, credibility, experience, and next-step invitation.",
    summary: "A strong LinkedIn About section turns a headline into a credible story. It explains the work, shows selective evidence, and gives the reader a useful next step.",
    intent: "LinkedIn About examples, LinkedIn summary examples, LinkedIn About section, LinkedIn profile summary",
    primaryKeyword: "LinkedIn About examples",
    keywords: ["LinkedIn About examples", "LinkedIn summary examples", "LinkedIn About section", "LinkedIn profile summary", "LinkedIn bio examples"],
    updatedAt,
    tool: { label: "Optimize a LinkedIn profile free", href: "/free-tools/profile-optimizer", description: "Use the free Profile Optimizer to review positioning, structure, proof, and improvement priorities across the profile you provide.", detail: "The tool gives structured recommendations. It does not access private LinkedIn analytics." },
    methodology: { label: "Read the LinkedIn optimization guide", href: "/linkedin-optimization" },
    sections: [
      { heading: "Write for the person deciding whether to trust you", body: "The first lines should establish the work you do and the context in which you do it. The middle can add selected proof, domain experience, and a point of view. The final lines should state the kind of conversation, role, or collaboration that makes sense." },
      { heading: "Use evidence with enough context", body: "'Improved revenue' is a claim. 'Led retention experiments for a subscription product, working with product and lifecycle teams to improve renewal conversion' gives a reader context without requiring unsupported numbers." },
      { heading: "Keep claims consistent across the profile", body: "The About section should strengthen the headline and experience entries, not introduce an entirely different identity. Align the audience, role, skills, and proof so the profile reads as one professional story." },
    ],
    example: { heading: "A credible About-section opening", body: "'I help B2B teams turn customer feedback into product decisions that improve adoption. My work sits across research, product, and go-to-market, with a focus on making complex workflows easier to understand and use.' It explains role, audience, and operating context before adding evidence." },
    faqs: [{ q: "What should I put in my LinkedIn About section?", a: "Include your professional focus, the audience or environment you serve, selected evidence, relevant context, and a clear next step. Keep every claim accurate." }, { q: "Should a LinkedIn About section be in first person?", a: "First person usually feels direct and natural for an individual profile. Third person can work when the profile represents a formal executive or organization voice." }],
    related: [{ label: "LinkedIn headline examples", href: "/linkedin-headline-examples" }, { label: "Free Headline Analyzer", href: "/free-tools/headline-analyzer" }, { label: "LinkedIn profile optimization", href: "/linkedin-profile-optimization" }],
  },
  "linkedin-profile-optimization": {
    slug: "linkedin-profile-optimization",
    title: "LinkedIn Profile Optimization with Free Tools",
    h1: "Optimize a LinkedIn profile around role clarity, proof, and search relevance",
    description: "Use Qalam's free Profile Optimizer and Headline Analyzer to improve LinkedIn role clarity, evidence, keywords, About copy, experience sections, and content alignment.",
    summary: "LinkedIn profile optimization is the work of making a real professional story easier to understand, find, and trust. It is not a promise of views, leads, or recruiter replies.",
    intent: "LinkedIn profile optimization, optimize LinkedIn profile, LinkedIn profile review, LinkedIn profile analyzer",
    primaryKeyword: "LinkedIn profile optimization",
    keywords: ["LinkedIn profile optimization", "optimize LinkedIn profile", "LinkedIn profile review", "LinkedIn profile analyzer", "LinkedIn profile improvement"],
    updatedAt,
    tool: { label: "Use the free Profile Optimizer", href: "/free-tools/profile-optimizer", description: "Review the profile text you provide for positioning, clarity, evidence, and actionable improvements.", detail: "Use the Headline Analyzer alongside it for a focused first-screen review." },
    methodology: { label: "Explore full LinkedIn optimization", href: "/linkedin-optimization" },
    sections: [
      { heading: "Optimize the profile as one connected page", body: "The headline sets the promise. The About section explains it. Experience proves it. Skills and Featured content reinforce it. Optimization fails when each section adds unrelated language rather than one coherent view of the professional." },
      { heading: "Choose search terms from actual work", body: "Use role titles, specialties, tools, industries, and outcomes that a target reader could reasonably connect to your background. Avoid stuffing keywords into every section because it makes claims feel less credible and harder to read." },
      { heading: "Use content to reinforce the profile", body: "The profile should prepare a reader to understand the posts you publish. If the profile presents a product operator but the content only discusses generic motivation, the public signal becomes less coherent." },
    ],
    example: { heading: "A practical optimization sequence", body: "First clarify the target role in the headline. Next add two or three supported proof points to About and experience. Then publish content that demonstrates the same domain knowledge. This sequence is more credible than rewriting every section at once." },
    faqs: [{ q: "Can profile optimization guarantee recruiter messages?", a: "No. It can make the profile clearer and more credible. Recruiter activity depends on the market, role demand, network, and employer process." }, { q: "What should I optimize first on LinkedIn?", a: "Start with role clarity and proof. The headline and most recent experience should make the target professional story understandable without requiring the reader to guess." }],
    related: [{ label: "LinkedIn headline examples", href: "/linkedin-headline-examples" }, { label: "LinkedIn About examples", href: "/linkedin-about-examples" }, { label: "AI LinkedIn Writer", href: "/ai-linkedin-writer" }],
  },
  "ai-linkedin-post-generator": {
    slug: "ai-linkedin-post-generator",
    title: "AI LinkedIn Post Generator with Voice Context",
    h1: "Generate LinkedIn posts from real ideas, then make them sound like you",
    description: "Use Qalam's AI LinkedIn Post Generator to turn professional ideas into structured drafts, hooks, revisions, and saved voice-aware writing context.",
    summary: "An AI LinkedIn post generator should give you a useful first draft, not a generic post you cannot defend. Qalam connects topic, voice context, revisions, and publishing workflow.",
    intent: "AI LinkedIn post generator, LinkedIn post generator, generate LinkedIn posts, AI LinkedIn posts",
    primaryKeyword: "AI LinkedIn post generator",
    keywords: ["AI LinkedIn post generator", "LinkedIn post generator", "generate LinkedIn posts", "AI LinkedIn posts", "LinkedIn content generator"],
    updatedAt,
    tool: { label: "Try the free Hook Generator", href: "/free-tools/hook-generator", description: "Start with a topic and generate multiple opening angles before creating a full LinkedIn post in Qalam.", detail: "The Hook Generator is public. Full drafts use the Qalam workspace and plan allowance." },
    methodology: { label: "See the AI LinkedIn Writer", href: "/ai-linkedin-writer" },
    sections: [
      { heading: "Start with a point of view, not a prompt formula", body: "The best source material is a lesson, decision, observation, customer pattern, or professional tension you can explain from experience. AI can help structure the draft, but it cannot supply the credibility that comes from a real perspective." },
      { heading: "A post generator needs room for revision", body: "Strong LinkedIn posts often improve through a sharper hook, a more concrete example, a shorter middle, or a clearer close. Keep revisions attached to the original idea so the work does not reset every time you edit." },
      { heading: "Voice context should improve the starting point", body: "Saved examples can make future suggestions closer to the writer's vocabulary and rhythm. The writer still reviews every draft before it represents them publicly." },
    ],
    example: { heading: "From operational lesson to post angle", body: "Raw idea: 'Our hiring delays were caused by unclear ownership.' Possible angle: 'We did not have a hiring-speed problem. We had a decision-owner problem. The calendar looked full because everyone was waiting for someone else to make the call.' The writer can then add the true context and outcome." },
    faqs: [{ q: "Can I generate LinkedIn posts for free?", a: "Qalam has a Free plan with monthly post allowance, plus public free tools including the Hook Generator. No payment card is required for Free." }, { q: "Will AI-generated LinkedIn posts sound authentic?", a: "They can start closer to your voice when you provide real examples and review the draft. Do not publish claims, stories, or metrics that you cannot support." }],
    related: [{ label: "AI LinkedIn Writer", href: "/ai-linkedin-writer" }, { label: "LinkedIn headline examples", href: "/linkedin-headline-examples" }, { label: "Free Tools", href: "/free-tools" }],
  },
}

export const SEO_LANDING_ROUTES = Object.keys(SEO_LANDING_PAGES)
  .filter((slug) => !REDIRECTED_SEO_SLUGS.has(slug))
  .map((slug) => `/${slug}`)

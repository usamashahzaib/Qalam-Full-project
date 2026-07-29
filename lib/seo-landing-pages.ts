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

const updatedAt = "2026-06-26"

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
        body: "General-purpose AI models like ChatGPT can draft a LinkedIn post from a prompt, but they reset after every session. A purpose-built LinkedIn AI retains voice memory, hook archives, draft history, and workspace context across every session - so each new post starts from accumulated knowledge rather than a blank page.",
      },
      {
        heading: "The voice memory difference",
        body: "Qalam trains on your real LinkedIn posts and retains every approved draft, edit, and hook. The system becomes more accurate to your specific voice the longer you use it. Generic AI tools start from the same place every time regardless of how much you have published.",
      },
      {
        heading: "A complete publishing workflow, not just a draft button",
        body: "The best LinkedIn writing tool for consistent publishers connects generation, revision, archive, scheduling, and analytics in one system. Qalam is built around that workflow rather than offering a draft button attached to a content calendar tool.",
      },
    ],
    faqs: [
      {
        q: "What is the best AI tool for writing LinkedIn posts?",
        a: "For consistent publishers who need voice memory and compounding improvement, Qalam is purpose-built for LinkedIn. For occasional one-off posts, general-purpose tools like ChatGPT work fine. The right choice depends on your publishing frequency and whether you need the system to remember your voice across sessions.",
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
        body: "Qalam trains on your actual LinkedIn posts and retains every approved draft and edit so each new session starts from real knowledge of your voice. Taplio's AI drafting generates posts from prompts without the same level of cross-session voice retention.",
      },
      {
        heading: "Which workflow each tool fits",
        body: "If you manage high posting volume across multiple accounts and need scheduling analytics, Taplio's operational features are stronger. If you are a solo creator or consultant who wants posts that genuinely sound like you with compounding improvement over time, Qalam is purpose-built for that problem.",
      },
    ],
    faqs: [
      {
        q: "Is Qalam a Taplio alternative?",
        a: "Yes, Qalam is a Taplio alternative for creators who prioritize voice fidelity and writing quality over analytics and scheduling volume. Qalam's voice memory system and persistent draft archive make it more suitable for professionals who want compounding improvement rather than content operations management.",
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
        a: "Qalam's Free plan includes 5 AI posts per month without a payment card. Solo is PKR 1,598, Pro is PKR 2,998, and Agency is PKR 7,998 per quarter.",
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
      "Seven free LinkedIn tools built by Qalam: hook generator, comment generator, headline analyzer, profile optimizer, viral checker, carousel builder, and engagement predictor. Six work with no sign-in.",
    summary:
      "Six of Qalam's seven free tools work instantly without creating an account. Hook generator, headline analyzer, profile optimizer, viral checker, carousel builder, and engagement predictor need nothing but a paste. Comment Generator needs a free sign-in to track your monthly usage.",
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
        body: "Six tools at byqalam.com/free-tools work without creating an account or entering a credit card - paste your content, get instant AI analysis. Comment Generator is the one exception: it asks for a free sign-in so it can track your monthly comment quota. Hook generator, comment generator, headline analyzer, profile optimizer, viral checker, carousel builder, and engagement predictor.",
      },
      {
        heading: "What each tool does",
        body: "Hook Generator: generates 5 opening line variants for any LinkedIn topic. Comment Generator: drafts on-voice replies to other people's LinkedIn posts, free sign-in required. Headline Analyzer: scores your LinkedIn profile headline across 5 criteria with improvement suggestions. Profile Optimizer: structured audit of your LinkedIn profile with specific rewrites. Viral Checker: scores a post across 5 viral dimensions and rewrites the hook. Carousel Builder: converts any post or outline into branded slide assets. Engagement Predictor: pre-publish engagement score with specific edits to improve reach.",
      },
      {
        heading: "Built as a trust surface, not a paywall",
        body: "These tools exist so professionals can try Qalam's AI quality before creating an account. They are not crippled demos - they use the same AI as the paid product. The free plan with 5 monthly posts also requires no card.",
      },
    ],
    faqs: [
      {
        q: "What free LinkedIn tools are available from Qalam?",
        a: "Qalam offers seven free tools: LinkedIn hook generator, comment generator, headline analyzer, profile optimizer, viral post checker, carousel builder, and engagement predictor. All are available at byqalam.com/free-tools.",
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
      "Use Qalam as a LinkedIn AI ghostwriter: generate posts that reflect your specific voice, experience, and perspective with persistent memory that improves every draft.",
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
        a: "Yes, when the AI has access to real source material and persistent memory. Qalam trains on your actual LinkedIn posts and retains approved drafts and edits so outputs match your real voice rather than a generic LinkedIn template.",
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
}

export const SEO_LANDING_ROUTES = Object.keys(SEO_LANDING_PAGES).map((slug) => `/${slug}`)

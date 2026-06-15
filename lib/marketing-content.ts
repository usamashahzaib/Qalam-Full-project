import { PRODUCT_PAGES, USE_CASE_PAGES } from "@/lib/site-content"

export type MarketingArticleSection = {
  heading: string
  paragraphs: string[]
}

export type MarketingArticle = {
  slug: string
  title: string
  description: string
  excerpt: string
  tag: string
  readMinutes: number
  datePublished: string
  dateModified: string
  status: "published" | "scheduled"
  sections: MarketingArticleSection[]
  faqs: { q: string; a: string }[]
}

export const BLOG_POSTS: MarketingArticle[] = [
  {
    slug: "train-an-ai-writing-system-without-losing-your-voice",
    title: "How to train an AI writing system without losing your voice",
    description:
      "A practical guide to training an AI LinkedIn writing system using real source material, revision patterns, and approval memory so posts sound like the writer, not the prompt.",
    excerpt:
      "Most writers try to prompt their way to authenticity. The stronger path is to train on real source material, preserve edits, and let the system accumulate memory over time.",
    tag: "Voice",
    readMinutes: 6,
    datePublished: "2026-05-18",
    dateModified: "2026-05-18",
    status: "published",
    sections: [
      {
        heading: "Prompt quality is not enough",
        paragraphs: [
          "A good prompt can improve one draft, but it does not create continuity. The next session still starts cold unless the system remembers what the writer approved, deleted, or rewrote.",
          "That is why voice fidelity depends less on one clever instruction and more on durable writing memory.",
        ],
      },
      {
        heading: "Use real source material",
        paragraphs: [
          "The best training examples are real LinkedIn posts, edits, comments, and published drafts written by the actual person. Generic internet copy teaches generic internet tone.",
          "If you want authority, specificity, and trust, the model needs examples that already contain those qualities.",
        ],
      },
      {
        heading: "Treat edits as signal",
        paragraphs: [
          "Edits are not cleanup. They are the strongest available training signal because they show the delta between what the system produced and what the writer actually wanted.",
          "When a tool stores those deltas, future drafts improve structurally instead of cosmetically.",
        ],
      },
      {
        heading: "Build compounding memory",
        paragraphs: [
          "The winning setup stores hooks, frameworks, approved drafts, and outcomes together. That archive becomes an internal style system for the writer over time.",
          "This is the core compounding behavior Qalam is trying to create for LinkedIn publishing.",
        ],
      },
    ],
    faqs: [
      {
        q: "What is the best way to train an AI writing tool on brand voice?",
        a: "Use real approved writing samples, preserve edits, and keep a reusable archive of accepted outputs instead of relying on one-off prompts.",
      },
      {
        q: "Why do AI writing tools sound generic?",
        a: "Because most of them reset every session and do not learn from the writer's real edits, approvals, and publishing history.",
      },
    ],
  },
  {
    slug: "post-history-is-a-better-moat-than-another-prompt-template",
    title: "Why post history is a better moat than another prompt template",
    description:
      "Why content systems that preserve drafts, versions, approvals, and outcomes create stronger product defensibility than prompt libraries alone.",
    excerpt:
      "The compounding advantage in AI writing is not the prompt. It is the retained post history that keeps getting sharper with every approved draft.",
    tag: "Product",
    readMinutes: 5,
    datePublished: "2026-05-18",
    dateModified: "2026-05-18",
    status: "published",
    sections: [
      {
        heading: "Prompt templates are portable",
        paragraphs: [
          "A prompt template can be copied into any interface in minutes. That makes it weak as a long-term moat even when it works well in the short term.",
          "Durable product advantage has to live in something harder to recreate than a text snippet.",
        ],
      },
      {
        heading: "History creates switching cost",
        paragraphs: [
          "A system that keeps approved posts, revisions, and publishing context becomes harder to replace because the value lives in accumulated memory, not just output generation.",
          "The more history a serious writer builds, the more valuable the system becomes.",
        ],
      },
      {
        heading: "Context beats novelty",
        paragraphs: [
          "Users do not need every session to feel novel. They need each session to start closer to the right answer.",
          "That means context, continuity, and reusable structures matter more than surface-level creativity.",
        ],
      },
    ],
    faqs: [
      {
        q: "Why is content archive more valuable than a prompt library?",
        a: "Because archives preserve approved outputs and real context, while prompt libraries are easy to copy and do not improve automatically over time.",
      },
      {
        q: "What creates switching cost in an AI writing product?",
        a: "Retained voice memory, draft history, hooks, and outcomes create much stronger switching cost than prompts alone.",
      },
    ],
  },
  {
    slug: "what-agencies-actually-need-from-a-content-workflow",
    title: "What agencies actually need from a content workflow",
    description:
      "A breakdown of the real agency requirements behind scalable LinkedIn content operations: client isolation, approvals, reusable assets, and lower revision churn.",
    excerpt:
      "Agency content operations do not break because writers lack ideas. They break because memory, approvals, and delivery discipline are spread across too many disconnected tools.",
    tag: "Agency",
    readMinutes: 7,
    datePublished: "2026-05-18",
    dateModified: "2026-05-18",
    status: "published",
    sections: [
      {
        heading: "Client isolation is not optional",
        paragraphs: [
          "Agencies cannot run multiple LinkedIn voices safely if drafts, examples, and edits bleed across accounts. Separate memory is a delivery requirement, not a luxury.",
          "Without clean isolation, even good writers start flattening clients into one generic process.",
        ],
      },
      {
        heading: "Approvals need structure",
        paragraphs: [
          "Review loops fail when feedback lives in scattered chats and documents. Agencies need a system where draft state, requested changes, and approved versions stay visible in one place.",
          "That reduces confusion and lowers revision churn over time.",
        ],
      },
      {
        heading: "Assets should compound",
        paragraphs: [
          "Hooks, angles, frameworks, and finished posts should not disappear after delivery. They should become reusable client capital.",
          "That is how agencies increase quality without making every month start from zero.",
        ],
      },
    ],
    faqs: [
      {
        q: "What does an agency LinkedIn workflow need most?",
        a: "Client memory separation, structured approvals, reusable assets, and a clean archive of drafts and outcomes.",
      },
      {
        q: "Why do agency content systems break at scale?",
        a: "Because voice memory, feedback, and publishing context are usually split across too many disconnected tools.",
      },
    ],
  },
  {
    slug: "the-three-habits-that-separate-linkedin-authority-from-linkedin-noise",
    title: "The three habits that separate LinkedIn authority from LinkedIn noise",
    description:
      "Most LinkedIn content disappears without building anything. Three habits - specificity, first-person experience, and consistent perspective - are what separate authority from noise.",
    excerpt:
      "Frequency is not the point. One specific post with a real perspective compounds faster than ten polished generalities.",
    tag: "Strategy",
    readMinutes: 4,
    datePublished: "2026-05-18",
    dateModified: "2026-05-18",
    status: "published",
    sections: [
      {
        heading: "Most LinkedIn content does not build reputation",
        paragraphs: [
          "Volume is not the variable that separates authority accounts from forgettable ones. The feeds that generate real professional credibility tend to post less, not more - but what they post carries a specific claim, a real experience, or a perspective that is not shared by everyone else in the industry.",
          "The three habits below are not tactics. They are the underlying structural differences between the LinkedIn presence that accumulates trust over time and the one that posts consistently without compounding anything.",
        ],
      },
      {
        heading: "Habit one: say one specific thing, not three general ones",
        paragraphs: [
          "The most common failure pattern on LinkedIn is the post that makes three adjacent points instead of one sharp one. Each point is technically correct, none of them stick, and the reader moves on without any particular impression of the writer.",
          "Authority posts compress. They take one real insight and push it far enough to be useful or surprising. That compression is what makes a post shareable and what makes the author memorable across multiple encounters.",
          "Specificity is not about being contrarian. It is about having enough actual conviction in one thing to let the other things go unsaid.",
        ],
      },
      {
        heading: "Habit two: write from experience, not from advice",
        paragraphs: [
          "There is a consistent difference between posts that feel like lived knowledge and posts that feel like rephrased advice from somewhere else. The first type names a real situation. It gives a number, a role, a decision, or a consequence. The second type stays abstract enough to apply to anyone and therefore applies to no one.",
          "Experience-based posts have a natural authority signal because they are verifiable in the way that general advice is not. A reader cannot easily replicate the experience that generated the insight, and that irreplicability is part of what makes the author worth following.",
        ],
      },
      {
        heading: "Habit three: commit to a perspective over time",
        paragraphs: [
          "The third habit is the slowest-building and the most durable. Authority on LinkedIn does not come from any single post. It comes from showing up repeatedly with the same underlying perspective applied to different situations - so that over time, a reader associates the author with a territory of thought rather than a collection of individual opinions.",
          "This is what separates accounts that get consistently engaged from accounts that have occasional viral posts. The consistent account has a recognizable worldview. The occasional viral account has good luck.",
          "Building a recognizable perspective requires keeping a record of what you have said, revisiting the positions that held up, and being willing to publish the same core belief from different angles until it lands.",
        ],
      },
    ],
    faqs: [
      {
        q: "How often should you post on LinkedIn to build authority?",
        a: "Frequency matters less than specificity. One post per week with a distinct perspective and real experience compounds faster than daily volume without a clear point of view.",
      },
      {
        q: "What separates LinkedIn authority from LinkedIn noise?",
        a: "Authority posts carry a specific claim or first-person experience. Noise posts repeat industry consensus at an abstract level without adding anything a reader could not already find elsewhere.",
      },
    ],
  },
  {
    slug: "why-hr-content-sounds-the-same-and-how-to-fix-it",
    title: "HR leaders and employer brand: why most content sounds the same",
    description:
      "Employer brand content on LinkedIn has collapsed into the same twelve phrases. The cause is structural - multiple approvals, risk aversion, and committee writing flatten every real claim into a safe abstraction.",
    excerpt:
      "The problem with most employer brand content is not the writer. It is the approval process that removes every specific claim before the post reaches an audience.",
    tag: "HR",
    readMinutes: 5,
    datePublished: "2026-05-18",
    dateModified: "2026-05-18",
    status: "published",
    sections: [
      {
        heading: "Employer brand language has collapsed into the same phrases",
        paragraphs: [
          "Scroll through employer brand content from any five mid-size companies and you will find the same vocabulary: people-first, growth mindset, collaborative environment, inclusive culture, learning and development opportunities. The phrases are not wrong. They are simply empty - they no longer carry meaning because everyone uses them to say the same thing.",
          "The result is that companies spend meaningful budget on employer brand content that conveys nothing specific about what it is actually like to work there, why someone would choose the role over a comparable one, or what leadership believes about the way work should happen.",
        ],
      },
      {
        heading: "Committee approval is the real cause",
        paragraphs: [
          "Most employer brand content does not start in a committee. An HR leader, a recruiter, or a chief people officer writes something real - a specific story about a hire that changed the team dynamic, a policy decision and why it was made, a failure that shifted how the company thinks about onboarding.",
          "Then the draft goes through legal, marketing, senior leadership, and possibly a communications agency. Each pass removes the specific in favor of the safe. By the time the post is approved, the actual experience has been converted into a generality that offends no one and says nothing.",
          "The writing problem is a process problem. The solution is not better prompts or better writers. It is fewer approvals and more tolerance for specificity.",
        ],
      },
      {
        heading: "Specific operational detail is the employer brand",
        paragraphs: [
          "The employer brand content that actually attracts candidates tells the reader something they could not find on the company's about page. It names a real situation: the hiring criteria that changed after a bad decision, the internal debate behind a remote work policy, the feedback loop that made onboarding shorter.",
          "This kind of content signals something about the organization that abstract brand statements cannot: that the people publishing it have actually made decisions and lived through the consequences. That is what candidates who have options are evaluating when they assess whether to engage with a company.",
        ],
      },
      {
        heading: "What HR leaders on LinkedIn can do differently",
        paragraphs: [
          "The shift is from brand statement to operational reporting. Instead of publishing what the company believes, publish what the company actually did - a real decision, a real outcome, a real lesson. The belief becomes implicit in the specifics.",
          "HR leaders who publish this way build a different kind of credibility than employer brand accounts. They become associated with a body of real operational thought rather than a communications output. That credibility transfers to candidates, to industry peers, and to the organization itself.",
        ],
      },
    ],
    faqs: [
      {
        q: "Why does employer brand content sound generic on LinkedIn?",
        a: "Because most employer brand copy goes through multiple approval layers that remove every specific claim and replace it with a safe abstraction. The process produces content that offends no one and says nothing.",
      },
      {
        q: "How can HR leaders improve their LinkedIn content?",
        a: "Write from a specific operational moment - a hire that changed the team, a policy decision and its reasoning, a real lesson from onboarding - instead of starting from company values statements. The specific is the brand.",
      },
    ],
  },
  {
    slug: "from-consultant-to-thought-leader-the-archive-is-the-product",
    title: "From consultant to thought leader: the archive is the product",
    description:
      "Most consultants have years of private expertise and almost no public record of it. The archive - a searchable body of specific published thought - is what converts a practitioner into a recognized authority.",
    excerpt:
      "The expertise exists. The public record usually does not. Thought leadership is not about posting more - it is about building an archive that compounds.",
    tag: "Consulting",
    readMinutes: 6,
    datePublished: "2026-05-18",
    dateModified: "2026-05-18",
    status: "published",
    sections: [
      {
        heading: "The expertise exists. The public record does not.",
        paragraphs: [
          "Senior consultants carry years of real pattern recognition across industries, organizations, and failure modes. Most of it never appears publicly because the client relationship requires discretion, and because translating operational knowledge into publishable thought requires a discipline that consulting work rarely builds.",
          "The result is that consultants who know more than almost anyone in their field are largely invisible to the buyers who would most benefit from working with them. A prospective client searching for expertise in a domain finds academic papers, journalists, and the occasional consultant who has prioritized publishing - not necessarily the most capable practitioner.",
        ],
      },
      {
        heading: "An archive compounds in ways individual posts do not",
        paragraphs: [
          "The distinction between posting and archiving is not about frequency. It is about whether content accumulates into something searchable, thematically coherent, and growing over time - or whether each post exists in isolation and disappears.",
          "A consultant who publishes one specific insight per week for a year does not have 52 posts. They have a body of work that covers a recognizable territory. A prospective client can spend thirty minutes reading through that archive and form a genuine impression of how the consultant thinks, what problems they have worked on, and whether their worldview matches the client's situation.",
          "That thirty-minute evaluation converts in a way that a single post never does. The archive is what enables asynchronous credibility building at scale.",
        ],
      },
      {
        heading: "The content inventory is the credibility signal",
        paragraphs: [
          "When a new contact lands on a consultant's LinkedIn profile, the most credible signal available is not the headline or the number of connections. It is the answer to: what has this person actually published, and does it reflect real thinking on problems I care about?",
          "A sparse content history sends a specific signal: either this person is too cautious to commit positions in public, or they do not have enough conviction about their own views to write them down. Neither reading helps the consultant win work.",
          "Building the archive is not about marketing. It is about creating the evidentiary record that allows a prospective client to self-qualify - to recognize that this consultant's thinking is relevant to their situation without requiring a referral or a pitch meeting first.",
        ],
      },
      {
        heading: "How to start building the archive",
        paragraphs: [
          "The starting point is not a content calendar. It is a standing list of the specific problems the consultant has seen repeatedly - the patterns that show up across engagements, the mistakes clients make before they hire a specialist, the decisions that look obvious in retrospect but are rarely made correctly in advance.",
          "Each item on that list is a post. Not a general thought about the industry, but a specific claim: what the problem looks like, why it persists, and what actually fixes it. The specificity is what makes the content useful and what makes the author memorable.",
          "Over time, the archive develops its own logic. Topics recur, positions accumulate evidence, and the consultant's worldview becomes visible to anyone who reads enough of it. That visible worldview is what converts a practitioner into a recognized authority in their domain.",
        ],
      },
    ],
    faqs: [
      {
        q: "How do consultants build thought leadership on LinkedIn?",
        a: "By converting private expertise into a persistent public archive of specific insights - not by chasing viral content. The searchable body of work is what allows prospective clients to evaluate fit before a first conversation.",
      },
      {
        q: "What is the difference between a thought leader and a regular LinkedIn poster?",
        a: "Thought leaders have a searchable body of work that covers a recognizable territory and compounds over time. Regular posters have individual posts that exist in isolation and do not accumulate into a credibility signal.",
      },
    ],
  },
]

export const PUBLISHED_BLOG_POSTS = BLOG_POSTS.filter((post) => post.status === "published")
export const UPCOMING_BLOG_POSTS = BLOG_POSTS.filter((post) => post.status === "scheduled")

export const MARKETING_LAST_MODIFIED = "2026-05-19"

export const LINKEDIN_NICHES = [
  "Founders",
  "HR Directors",
  "SaaS Marketers",
  "Recruiters",
  "Consultants",
  "Agency Owners",
  "Product Managers",
  "Sales Directors",
  "Investment Bankers",
  "Financial Analysts",
  "Software Engineers",
  "Data Scientists",
  "UX Designers",
  "Brand Strategists",
  "Marketing Directors",
  "Operations Managers",
  "Supply Chain Leads",
  "Legal Counsels",
  "Management Consultants",
  "Business Analysts",
  "Talent Acquisition",
  "L&D Managers",
  "PR Professionals",
  "CFOs",
  "CTOs",
  "COOs",
  "Creative Directors",
  "Account Managers",
  "Risk Analysts",
  "Wealth Managers",
  "Healthcare Administrators",
  "Project Managers",
  "Growth Marketers",
  "Content Strategists",
  "Executive Coaches",
  "Corporate Trainers",
  "Venture Capitalists",
  "Policy Advisors",
  "Procurement Leads",
  "Research Directors",
] as const

export type LiveSurfaceSection = { title: string; items: string[] }

export const LIVE_SURFACE: LiveSurfaceSection[] = [
  {
    title: "Live now",
    items: [
      "LinkedIn-first auth",
      "Writer, archive, calendar, analytics, voice settings",
      "Free public tools",
      "Custom session plus LinkedIn OAuth path",
    ],
  },
  {
    title: "Active workflows",
    items: [
      "Paid plan activation via email",
      "Team and agency onboarding",
      "Agency workspace setup",
      "JazzCash, Easypaisa, bank billing",
    ],
  },
  {
    title: "Building next",
    items: [
      "Self-serve checkout",
      "Agency analytics rollups",
      "Notification center",
      "Broader collaboration automation",
    ],
  },
]

export const LANDING_FAQ: { q: string; a: string }[] = [
  {
    q: "How does the Voice Profile actually learn my writing?",
    a: "You provide real LinkedIn posts you have written. Qalam extracts tone, structure, and vocabulary patterns from those examples. Every draft you approve and every edit you keep then improves future starting points.",
  },
  {
    q: "What happens to my archive if I stop using the product?",
    a: "The current product keeps drafts, saved items, and voice settings in your workspace. Commercial retention policy should be treated as an operational detail, not assumed from generic SaaS copy.",
  },
  {
    q: "How is this different from just using ChatGPT?",
    a: "ChatGPT resets every session. Qalam keeps approved examples, editing history, hook archive, and workspace continuity so each session starts closer to your actual voice instead of from scratch.",
  },
  {
    q: "Who is the Pro plan for?",
    a: "Pro is for professionals who post consistently and want voice memory, AI quality scoring, competitor research, and analytics in one system. It is the plan for people who treat LinkedIn as a serious channel.",
  },
  {
    q: "Is there an Agency plan?",
    a: "Yes - Agency is for multi-client operators who need isolated client workspaces, approval workflows, and per-client publishing. It is launching soon. Contact us to join the waitlist or set up early access.",
  },
  {
    q: "Does Qalam work for any niche?",
    a: "Yes, when the writer brings real source material from that niche. The system performs best when it learns from authentic examples instead of generic prompts.",
  },
]

export const MARKETING_ANSWER_PAGES = [
  ...PUBLISHED_BLOG_POSTS.map((post) => `/blog/${post.slug}`),
  ...Object.keys(PRODUCT_PAGES).map((slug) => `/product/${slug}`),
  ...Object.keys(USE_CASE_PAGES).map((slug) => `/use-cases/${slug}`),
]

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
      "A forthcoming article on consistency, specificity, and voice fidelity in LinkedIn publishing.",
    excerpt: "Coming soon.",
    tag: "Strategy",
    readMinutes: 4,
    datePublished: "2026-05-25",
    dateModified: "2026-05-25",
    status: "scheduled",
    sections: [],
    faqs: [],
  },
  {
    slug: "why-hr-content-sounds-the-same-and-how-to-fix-it",
    title: "HR leaders and employer brand: why most content sounds the same",
    description:
      "A forthcoming article on employer brand repetition, public trust, and repeatable content systems.",
    excerpt: "Coming soon.",
    tag: "HR",
    readMinutes: 5,
    datePublished: "2026-05-28",
    dateModified: "2026-05-28",
    status: "scheduled",
    sections: [],
    faqs: [],
  },
  {
    slug: "from-consultant-to-thought-leader-the-archive-is-the-product",
    title: "From consultant to thought leader: the archive is the product",
    description:
      "A forthcoming article on turning consulting expertise into a public archive that compounds authority.",
    excerpt: "Coming soon.",
    tag: "Consulting",
    readMinutes: 6,
    datePublished: "2026-05-30",
    dateModified: "2026-05-30",
    status: "scheduled",
    sections: [],
    faqs: [],
  },
]

export const PUBLISHED_BLOG_POSTS = BLOG_POSTS.filter((post) => post.status === "published")
export const UPCOMING_BLOG_POSTS = BLOG_POSTS.filter((post) => post.status === "scheduled")

export const MARKETING_LAST_MODIFIED = "2026-05-18"

export const MARKETING_ANSWER_PAGES = [
  ...PUBLISHED_BLOG_POSTS.map((post) => `/blog/${post.slug}`),
  ...Object.keys(PRODUCT_PAGES).map((slug) => `/product/${slug}`),
  ...Object.keys(USE_CASE_PAGES).map((slug) => `/use-cases/${slug}`),
]

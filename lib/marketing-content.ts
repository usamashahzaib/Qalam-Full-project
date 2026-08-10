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
  {
    slug: "linkedin-algorithm-2026-what-actually-drives-reach",
    title: "The LinkedIn algorithm in 2026: what actually drives reach",
    description:
      "A practical breakdown of how the LinkedIn algorithm distributes content in 2026, what signals matter most, and how to write posts that reach the right audience without gaming the system.",
    excerpt:
      "The LinkedIn algorithm rewards content that generates meaningful engagement quickly. Understanding which signals matter - and which ones do not - changes how you write every post.",
    tag: "Strategy",
    readMinutes: 7,
    datePublished: "2026-06-10",
    dateModified: "2026-06-26",
    status: "published",
    sections: [
      {
        heading: "How LinkedIn distributes a new post",
        paragraphs: [
          "When you publish a post, LinkedIn sends it to a small initial audience - typically first-degree connections who are active at that moment. It then measures the quality of early engagement: comments, meaningful reactions, and shares carry more weight than passive likes.",
          "If the early signal is strong, the algorithm expands distribution to second-degree connections and relevant interest clusters. If it is weak, the post stays narrow regardless of your follower count. This is why timing, post quality, and prompt engagement from close connections matter more than raw audience size.",
        ],
      },
      {
        heading: "What the algorithm actually rewards in 2026",
        paragraphs: [
          "The clearest pattern in high-performing LinkedIn content is specificity combined with comment-worthy framing. Posts that make a clear, debatable, or surprising claim generate more comments than posts that share generic information. Comments are the highest-value engagement signal in the current algorithm.",
          "Dwell time also matters. LinkedIn measures how long readers spend on a post before scrolling past. Longer-form posts with strong structure - a hook, narrative development, and a concrete close - perform better than short posts that give no reason to read through.",
          "Native content outperforms link posts consistently. External links remove the reader from LinkedIn, which the platform penalizes in distribution. If you share a link, put it in the first comment rather than the post body itself.",
        ],
      },
      {
        heading: "What does not move the needle",
        paragraphs: [
          "Hashtags have declined sharply in relevance. LinkedIn has confirmed that over-hashtagging can reduce reach by triggering spam filters. Using two to three relevant hashtags is reasonable; using ten is counterproductive.",
          "Posting frequency alone does not drive reach. An account that posts seven days a week with low-engagement content will be deprioritized faster than an account that posts twice a week with content that generates real conversation.",
          "Engagement pods - groups that systematically comment on each other's posts - are detectable. LinkedIn has acknowledged filtering for inauthentic coordinated behavior. The algorithm has become better at distinguishing obligatory comments from genuine responses.",
        ],
      },
      {
        heading: "The compound effect of consistent voice",
        paragraphs: [
          "The accounts that perform best over time are not the ones that have learned to game the algorithm. They are the ones that have built a recognizable perspective on a specific topic, so their audience actually wants to read what they post next.",
          "This creates a reinforcing loop: consistent, specific, high-quality posts build an audience that engages reliably, which trains the algorithm to distribute future posts more broadly. The shortcut to better algorithm performance is better content.",
        ],
      },
    ],
    faqs: [
      {
        q: "What does the LinkedIn algorithm prioritize in 2026?",
        a: "The algorithm primarily rewards early engagement quality, especially comments. Posts that generate fast, genuine conversation get expanded distribution. Dwell time, native content, and specific framing also matter more than hashtags or raw frequency.",
      },
      {
        q: "How often should you post on LinkedIn for the algorithm?",
        a: "Consistency matters more than frequency. Posting three to five times per week with high-engagement content outperforms daily posting with low-signal content. The algorithm learns from each post's performance - weak posts train it to distribute your next post less.",
      },
    ],
  },
  {
    slug: "how-to-write-linkedin-posts-that-get-engagement",
    title: "How to write LinkedIn posts that actually get engagement",
    description:
      "A practical guide to writing LinkedIn posts that generate real engagement: the structure of high-performing posts, how to write hooks that stop the scroll, and what separates posts that get reactions from posts that get read.",
    excerpt:
      "Engagement is not about luck. The structure, opening, and framing of your post determine whether people stop and respond - before the algorithm even has a chance to distribute it further.",
    tag: "Writing",
    readMinutes: 8,
    datePublished: "2026-06-12",
    dateModified: "2026-06-26",
    status: "published",
    sections: [
      {
        heading: "The structure of a post that gets read",
        paragraphs: [
          "High-performing LinkedIn posts follow a consistent structure even when their topics vary. The hook stops the scroll. The body delivers on whatever promise the hook makes. The close creates a reason to respond - a question, a provocation, or a clear takeaway.",
          "Most posts fail at the body, not the hook. Writers put effort into the opening line and then let the rest of the post meander. A strong post develops one idea until it is genuinely useful, surprising, or actionable - then stops. Padding weakens every post it touches.",
        ],
      },
      {
        heading: "How to write a hook that stops the scroll",
        paragraphs: [
          "The first line of a LinkedIn post is the only line most readers will see before deciding whether to click 'more'. That line needs to create a reason to keep reading inside the first ten words.",
          "The strongest hooks do one of three things: make a counterintuitive claim, name a specific situation the reader recognizes, or open with a number or outcome that creates immediate curiosity. 'I spent six years doing X and here is what I learned' is stronger than 'Here are some thoughts on X' because the first implies a specific body of experience the reader cannot already predict.",
          "Avoid starting with 'I am excited to share' or 'In today's world.' These phrases signal generic content before the post has said anything. The first line should be the strongest claim or most specific thing in the post - not a preamble.",
        ],
      },
      {
        heading: "Formatting for LinkedIn's reading environment",
        paragraphs: [
          "LinkedIn is a mobile-first platform. Long unbroken paragraphs are harder to read on a phone screen. One or two sentences per paragraph is not a style choice - it is how the platform reads.",
          "White space matters. A post that breathes is easier to follow than one that compresses all its ideas into a dense block. Line breaks should happen at natural thought boundaries, not arbitrarily.",
          "Lists work well for posts that contain a set of specific items. But not everything belongs in a list. If the ideas connect causally, prose develops them better than bullet points.",
        ],
      },
      {
        heading: "The close: creating a reason to respond",
        paragraphs: [
          "Posts that end with a direct question get more comments than posts that do not. But the question needs to be answerable and specific. 'What do you think?' is too open. 'Which of these three approaches have you found most useful?' creates a concrete response path.",
          "The close is also where you signal whether this post is part of a larger worldview. A well-placed final line that reflects a consistent perspective builds pattern recognition with readers over time - they start associating you with a particular way of thinking.",
        ],
      },
    ],
    faqs: [
      {
        q: "What makes a LinkedIn post get more engagement?",
        a: "A strong hook in the first line, a single developed idea in the body, and a specific close that gives readers a reason to comment. Posts that make a clear or counterintuitive claim get more engagement than posts that summarize conventional wisdom.",
      },
      {
        q: "How long should a LinkedIn post be for maximum engagement?",
        a: "Posts between 150 and 300 words tend to perform well because they are long enough to develop an idea but short enough to read in under a minute. Longer posts work when they are structured well and the content earns the length.",
      },
    ],
  },
  {
    slug: "linkedin-personal-branding-complete-guide",
    title: "LinkedIn personal branding: the complete guide for professionals",
    description:
      "A comprehensive guide to building a LinkedIn personal brand that generates inbound opportunities, builds genuine authority, and compounds over time without sounding like everyone else in your industry.",
    excerpt:
      "Personal branding on LinkedIn is not about self-promotion. It is about making your specific expertise visible and accessible to people who need it - before they even know to look for you.",
    tag: "Strategy",
    readMinutes: 9,
    datePublished: "2026-06-14",
    dateModified: "2026-06-26",
    status: "published",
    sections: [
      {
        heading: "What personal branding actually is on LinkedIn",
        paragraphs: [
          "The phrase 'personal brand' makes most professionals uncomfortable because it sounds performative. In practice, a LinkedIn personal brand is simpler: it is the specific reputation you build through a consistent, public record of real thinking.",
          "Professionals who have a strong LinkedIn personal brand are not the ones who post most frequently or have the most followers. They are the ones where, if you spend twenty minutes reading their content history, you come away with a clear sense of their expertise, worldview, and what kind of work they do best.",
        ],
      },
      {
        heading: "Define your territory before you start posting",
        paragraphs: [
          "The most common personal branding mistake is trying to be known for too many things at once. A founder who posts equally about leadership, product management, culture, fundraising, and marketing is less memorable than a founder who focuses on one of those areas deeply.",
          "Choose a territory that is both specific enough to be ownable and broad enough to sustain ongoing publishing. 'B2B SaaS sales' is too broad. 'How technical founders learn to sell without a sales background' is a territory.",
          "Your territory should reflect a genuine area of expertise or ongoing experience, not just a topic you find interesting. The posts that build real authority are grounded in situations you have actually navigated.",
        ],
      },
      {
        heading: "Profile optimization: context before content",
        paragraphs: [
          "Every LinkedIn post you publish is read in the context of your profile. A reader who finds you interesting will click your name before they follow you. If your headline, summary, and featured sections do not reinforce the same territory as your posts, the connection does not hold.",
          "A strong LinkedIn headline is not your job title. It is a compressed statement of what you do and for whom. 'CEO at X' tells a reader almost nothing about whether to follow you. 'Helping SaaS founders build their first outbound sales motion' tells them exactly what your content will be about.",
          "The summary section is where specificity compounds. Readers who reach it are already interested. Give them a real picture of your background, your perspective, and the specific problems you have worked on - not a list of adjectives.",
        ],
      },
      {
        heading: "Content consistency: the building block of compounding authority",
        paragraphs: [
          "Authority on LinkedIn is built through repetition of a specific perspective, not through one viral post. An account that returns consistently to the same territory with fresh examples, contrasting takes, and updated thinking builds something a one-off viral moment cannot: a reader who trusts their investment in following you.",
          "This is why content archives matter. If you are posting without keeping a searchable record of what you have said, you are building nothing that compounds. The archive is what makes past posts contribute to the authority signal of future posts.",
          "Qalam is built specifically for this problem: it keeps your approved posts, hooks, and voice patterns in one system so each new draft starts from accumulated context rather than a blank page.",
        ],
      },
    ],
    faqs: [
      {
        q: "How do you build a personal brand on LinkedIn?",
        a: "Choose a specific territory where you have genuine expertise, optimize your profile to reflect it, and publish consistent content from that perspective over time. The archive you build becomes the credibility signal that drives inbound opportunities.",
      },
      {
        q: "How long does it take to build a LinkedIn personal brand?",
        a: "Most professionals start seeing meaningful inbound interest after three to six months of consistent, specific publishing. The compound effect accelerates in the second year when the content archive is large enough for prospective connections to evaluate your thinking before reaching out.",
      },
    ],
  },
  {
    slug: "best-ai-tools-for-linkedin-content-2026",
    title: "The best AI tools for LinkedIn content in 2026",
    description:
      "A practical breakdown of the AI tools professionals actually use for LinkedIn content creation in 2026 - what each one does well, where it falls short, and which workflow they fit.",
    excerpt:
      "The right AI tool for LinkedIn depends on whether you need a one-shot generator, a persistent writing system, or a scheduling platform. These are different tools built for different problems.",
    tag: "Tools",
    readMinutes: 7,
    datePublished: "2026-06-16",
    dateModified: "2026-06-26",
    status: "published",
    sections: [
      {
        heading: "The three categories of LinkedIn AI tools",
        paragraphs: [
          "Most AI tools for LinkedIn fall into one of three categories: general-purpose language models (ChatGPT, Claude, Gemini), dedicated LinkedIn writing apps (Qalam, Taplio, AuthoredUp), and scheduling platforms with AI add-ons (Buffer, Hootsuite, Later).",
          "Each category solves a different part of the problem. Understanding which part of your workflow breaks most often tells you which category you actually need.",
        ],
      },
      {
        heading: "General-purpose AI models: strong at generation, weak at memory",
        paragraphs: [
          "ChatGPT, Claude, and Gemini are excellent at generating a competent LinkedIn post from a prompt. They understand structure, can match a requested tone, and produce draft text quickly.",
          "The limitation is memory. Each session starts cold. If you wrote a strong post last week and want the next post to reflect the same voice and build on the same ideas, you have to re-explain everything from scratch. For occasional posting this is acceptable. For consistent publishing it creates a real friction cost.",
          "The workaround is system prompts and manual copy-pasting of past examples, but this is manual overhead that scales poorly with posting frequency.",
        ],
      },
      {
        heading: "Dedicated LinkedIn AI writing systems: built for persistence",
        paragraphs: [
          "Tools like Qalam are built around the problem that general-purpose AI models cannot solve: persistent voice, retained history, and accumulated context across sessions.",
          "Qalam stores approved posts, edits, and hook archives. Each new drafting session starts from that accumulated context rather than from a blank page. The longer you use it, the more specific it becomes to your actual voice and posting patterns - which is the compound value that general-purpose tools cannot replicate.",
          "Taplio and AuthoredUp focus more on scheduling and engagement analytics with AI content assistance. They are useful for teams managing high posting volumes but are less focused on voice fidelity for individual creators.",
        ],
      },
      {
        heading: "Scheduling platforms: publishing workflow, not writing tools",
        paragraphs: [
          "Buffer, Hootsuite, and Later are scheduling platforms first. Their AI features are designed for content repurposing and light editing, not for producing high-quality first drafts or learning voice patterns.",
          "If your main bottleneck is scheduling and queue management rather than writing quality, a scheduling platform may be the right fit. If your main bottleneck is producing posts that sound like you and maintain publishing consistency, a dedicated writing system is a better match.",
        ],
      },
    ],
    faqs: [
      {
        q: "What is the best AI tool for LinkedIn content?",
        a: "It depends on your workflow. For consistent individual creators who want voice memory and compounding improvement, Qalam is purpose-built. For teams managing posting volume and scheduling, Buffer or Taplio fit better. For occasional one-off drafts, ChatGPT works fine.",
      },
      {
        q: "Is Qalam better than ChatGPT for LinkedIn posts?",
        a: "Qalam is more suitable for consistent LinkedIn publishing because it retains voice memory, draft history, and hook archives across sessions. ChatGPT is better for one-off tasks because it resets after every conversation, requiring you to re-explain your voice each time.",
      },
    ],
  },
  {
    slug: "linkedin-content-strategy-for-founders",
    title: "LinkedIn content strategy for founders: what works in 2026",
    description:
      "A practical LinkedIn content strategy for founders who want to build genuine authority, attract customers and talent, and grow an audience without sounding like a startup marketing account.",
    excerpt:
      "Founders who win on LinkedIn are not the ones who post most. They are the ones who publish specific, experience-backed content that lets potential customers and investors understand how they think.",
    tag: "Strategy",
    readMinutes: 8,
    datePublished: "2026-06-18",
    dateModified: "2026-06-26",
    status: "published",
    sections: [
      {
        heading: "Why LinkedIn matters more for founders than any other platform",
        paragraphs: [
          "LinkedIn is the only major social platform where professional context is the default. When a founder posts something insightful, it is read against a background of their professional identity, company, and role - not just their personal content preferences.",
          "This context makes LinkedIn uniquely valuable for founders. A post that demonstrates sharp product thinking, honest operational experience, or clear market perspective reaches potential customers, investors, candidates, and partners in a single distribution channel. No other platform makes that possible at low cost.",
        ],
      },
      {
        heading: "What founder content actually builds authority",
        paragraphs: [
          "The founder content that generates genuine authority is not announcements or motivational posts. It is specific, experience-based writing about decisions, mistakes, and discoveries from actually running a company.",
          "A post about why a hiring decision failed and what changed afterward is more credible than a post about the importance of hiring well. A post about what actually shifted revenue after a pricing experiment is more useful than a post about the importance of pricing strategy.",
          "The specificity is the authority signal. Anyone can write about best practices. Not everyone can write about the specific thing that happened in their company and what it taught them.",
        ],
      },
      {
        heading: "Building a content cadence that does not burn you out",
        paragraphs: [
          "Most founder LinkedIn strategies fail because they are unsustainable. A founder who commits to daily posting without a system for capturing ideas, drafting efficiently, and archiving what works will burn out within two months.",
          "A sustainable cadence for most founders is two to three posts per week. The key is a repeatable workflow: capture ideas as they happen, draft against a voice system that does not require starting from scratch, and keep a reusable archive of hooks and structures that have worked before.",
          "This is exactly the problem Qalam is designed to solve. Instead of every session starting from zero, your accumulated posts, hooks, and edits become the starting point for the next draft.",
        ],
      },
      {
        heading: "Topics that consistently work for founders",
        paragraphs: [
          "Operational lessons - specific decisions, processes, and outcomes from running the company - consistently outperform inspirational or generic business content. Readers follow founders because they want to understand how a company is actually being built.",
          "Customer and market observations work well when they are specific. A founder who publishes a real insight from a customer conversation once a week builds a more credible market intelligence signal than one who publishes predictions.",
          "Behind-the-scenes content - product decisions, team dynamics, hiring philosophy - performs well because it is irreplicable. Only you have access to what is actually happening inside your company.",
        ],
      },
    ],
    faqs: [
      {
        q: "How should a founder use LinkedIn for content marketing?",
        a: "Focus on specific, experience-based posts about decisions, lessons, and observations from actually running the company. Build a consistent cadence of two to three posts per week, keep an archive of what works, and treat LinkedIn as a compounding asset rather than a broadcast channel.",
      },
      {
        q: "What type of LinkedIn content works best for founders?",
        a: "Operational specifics outperform generic business advice. Posts that name a real decision, an unexpected outcome, or a specific customer insight generate more engagement and build more credibility than posts that share well-known best practices.",
      },
    ],
  },
  {
    slug: "linkedin-hook-writing-complete-guide",
    title: "The complete guide to writing LinkedIn hooks that stop the scroll",
    description:
      "A deep guide to writing LinkedIn hooks: the formulas that consistently work, why most opening lines fail, how to test and archive strong structures, and how to develop a hook writing system over time.",
    excerpt:
      "The hook is the only part of your post most readers will see. If it does not create a compelling reason to read more within the first ten words, the rest of the post will not be read.",
    tag: "Writing",
    readMinutes: 8,
    datePublished: "2026-06-20",
    dateModified: "2026-06-26",
    status: "published",
    sections: [
      {
        heading: "Why most LinkedIn hooks fail",
        paragraphs: [
          "The average LinkedIn post loses most of its potential readers before the 'more' button. The reason is almost always the same: the first line does not give the reader a reason to continue.",
          "Weak hooks make one of three mistakes. They start with context-setting that delays the actual claim ('In a recent conversation with a client, I realized...'). They open with a vague statement that could apply to anyone ('Success requires hard work.'). Or they lead with the writer's credentials rather than the reader's interest ('As a fifteen-year veteran of...').",
        ],
      },
      {
        heading: "The six hook formulas that consistently work on LinkedIn",
        paragraphs: [
          "The counterintuitive claim: 'The thing everyone says you should do on LinkedIn is wrong. Here is why.' This works because it immediately creates a belief-challenge that demands resolution.",
          "The specific number: 'After 200 LinkedIn posts, here is the single thing that made the biggest difference.' Numbers create credibility and specificity in a single move.",
          "The story entry point: 'Three years ago I made a decision that ended my largest client relationship. It turned out to be the best thing that happened to my business.' This works because it starts mid-narrative, which pulls the reader forward.",
          "The question that creates recognition: 'Why do smart professionals post consistently on LinkedIn for months and get almost no traction?' Rhetorical questions work when they name a real experience the reader has had.",
          "The bold statement: 'Most LinkedIn content is designed to look busy, not to build anything. There is a better approach.' This works when the statement is genuinely bold rather than mildly provocative.",
          "The result-first opener: 'We went from zero to PKR 2 million in revenue from LinkedIn inbound. Here is the exact posting strategy that drove it.' Result-first openers work because they promise a specific, replicable lesson.",
        ],
      },
      {
        heading: "How to test and develop your hook library",
        paragraphs: [
          "Strong hooks are not discovered once. They are developed through testing. Publishing a post with a counterintuitive hook and comparing its early engagement to a post with a story entry point tells you which formula works better for your specific audience.",
          "The posts that generate the most comments in the first hour are the ones with the strongest hooks, because hook quality determines whether readers reach the call to action that generates comment behavior.",
          "Building a hook archive is the highest-leverage thing a consistent LinkedIn publisher can do. When you keep a record of your strongest opening structures, you stop reinventing the wheel every time and instead refine a system that compounds.",
        ],
      },
      {
        heading: "Using AI to generate and refine hooks",
        paragraphs: [
          "AI writing tools can generate multiple hook variants from a single idea quickly, which makes them useful for the hook testing workflow. Instead of committing to the first opening line you write, generate five or six options and select the strongest.",
          "The limitation of generic AI tools is that they do not learn which hooks have worked for you specifically. A system that retains your past hook archive and generates new variants informed by that history is fundamentally more useful for building a LinkedIn voice over time.",
          "Qalam's hook generation is connected to the broader voice system, so hooks are generated in the context of your actual posting patterns rather than from generic LinkedIn best practices.",
        ],
      },
    ],
    faqs: [
      {
        q: "What is a LinkedIn hook?",
        a: "A LinkedIn hook is the first one or two lines of a post that appear before the 'see more' button. It determines whether readers click through to read the rest. A strong hook creates immediate curiosity, recognition, or a reason to continue reading within the first ten words.",
      },
      {
        q: "How do I write better LinkedIn hooks?",
        a: "Use one of the proven formulas: a counterintuitive claim, a specific number-driven opener, a story entry point, a recognition-creating question, a bold statement, or a result-first opener. Then test which formula performs best for your specific audience and archive the strongest structures for reuse.",
      },
    ],
  },
  {
    slug: "how-to-create-linkedin-carousels-that-convert",
    title: "How to create LinkedIn carousels that actually convert",
    description:
      "A complete guide to creating LinkedIn carousels that drive engagement and action: how to structure slides, what content works in carousel format, how to write strong carousel hooks, and how to connect carousel content to your broader publishing workflow.",
    excerpt:
      "A LinkedIn carousel is not a post broken into slides. It is a different content format with its own logic - one that rewards tight structure, visual clarity, and a strong close that asks for something specific.",
    tag: "Content",
    readMinutes: 7,
    datePublished: "2026-06-22",
    dateModified: "2026-06-26",
    status: "published",
    sections: [
      {
        heading: "Why LinkedIn carousels outperform regular posts for certain content",
        paragraphs: [
          "LinkedIn carousels (document posts) consistently receive higher engagement rates than standard text posts for specific types of content. The reason is functional: carousels force structure. You cannot fill a slide with three paragraphs of meandering thought without it becoming visually obvious.",
          "The swipe behavior also signals strong engagement to the LinkedIn algorithm. A reader who swipes through five slides has spent substantially more time with the content than a reader who scrolls past a text post, and that dwell time is a positive distribution signal.",
        ],
      },
      {
        heading: "Content that belongs in carousel format",
        paragraphs: [
          "Not every post idea benefits from carousel treatment. The formats that work best are: step-by-step processes where each step deserves its own visual space, lists where each item requires brief explanation, before-and-after comparisons that benefit from side-by-side structure, and frameworks or models that have multiple components.",
          "Content that does not work well in carousels: nuanced arguments that require connected reasoning, personal stories with emotional arc, or posts where the whole point is a single strong claim. These ideas lose compression in slide format.",
        ],
      },
      {
        heading: "Carousel structure: hook slide, content slides, close slide",
        paragraphs: [
          "The first slide is your hook. It must create a reason to swipe in the first three seconds. 'Five things I learned from 200 LinkedIn posts' is a weak hook because it is predictable. 'The LinkedIn format that doubled my inbound in 60 days (not what you expect)' creates curiosity and specificity.",
          "The content slides should follow a consistent visual structure: one headline claim per slide, brief supporting explanation, and white space that makes the slide readable at a glance. Slides that are too dense discourage swiping.",
          "The final slide is the most underused part of a LinkedIn carousel. It is the only moment where you have a reader's full attention at the end of a commitment they have already made. Use it for a clear call to action, a provocative question that drives comments, or a summary that is worth saving.",
        ],
      },
      {
        heading: "Connecting carousels to your content system",
        paragraphs: [
          "The best carousel strategy repurposes strong post ideas rather than creating carousel-exclusive content. A post that performed well as text often contains one clear structure or framework that translates directly into carousel format, expanding the same idea's distribution.",
          "Keeping carousel assets connected to the original post, hook archive, and voice profile makes the content system compound rather than fragment. This is why carousel creation should live inside the same workspace as your writing and scheduling workflow.",
        ],
      },
    ],
    faqs: [
      {
        q: "Do LinkedIn carousels get more views than regular posts?",
        a: "LinkedIn carousels (document posts) typically receive higher engagement rates than standard text posts because they generate more swipe interactions, which signal strong dwell time to the algorithm. However, the content format must match the carousel structure - not every idea performs better as a carousel.",
      },
      {
        q: "How many slides should a LinkedIn carousel have?",
        a: "Between five and ten slides is the optimal range for most carousel content. Fewer than five slides often do not justify the format. More than ten slides requires strong structure and increasingly compelling content to maintain the swipe rate.",
      },
    ],
  },
  {
    slug: "qalam-vs-chatgpt-for-linkedin-content",
    title: "Qalam vs ChatGPT for LinkedIn content: which one actually works",
    description:
      "A direct comparison of Qalam and ChatGPT for LinkedIn content creation: where each tool performs best, what the session-reset problem costs consistent publishers, and which workflow fits each type of creator.",
    excerpt:
      "ChatGPT can write a competent LinkedIn post from a prompt. Qalam retains your voice, draft history, and hook archive so each new post starts from accumulated context instead of zero.",
    tag: "Comparison",
    readMinutes: 6,
    datePublished: "2026-06-24",
    dateModified: "2026-06-26",
    status: "published",
    sections: [
      {
        heading: "What ChatGPT does well for LinkedIn",
        paragraphs: [
          "ChatGPT is an excellent tool for generating a competent LinkedIn post from a detailed prompt. If you describe your topic, tone, audience, and context clearly, it can produce a usable first draft quickly.",
          "For one-off posts, occasional publishing, or testing a content idea before investing more time, ChatGPT works well. It also benefits from being a tool most professionals already have access to without an additional subscription.",
        ],
      },
      {
        heading: "The session-reset problem for consistent publishers",
        paragraphs: [
          "The fundamental limitation of ChatGPT for consistent LinkedIn publishing is that every session starts cold. The voice examples you provided last week, the tone you established, the hooks that worked, the edits you made - none of it carries forward. You rebuild context from scratch every time you open a new chat.",
          "For someone who posts twice a week, this means rebuilding context one hundred times per year. The cumulative cost is real: time spent re-prompting, output that varies because the model does not remember what you keep and what you discard, and no mechanism for the system to get better at your specific voice over time.",
        ],
      },
      {
        heading: "Where Qalam is different",
        paragraphs: [
          "Qalam is built around the problem that ChatGPT cannot solve: persistent voice memory across sessions. Every approved draft, every edit, every saved hook becomes context for the next post. The system accumulates knowledge about your writing patterns instead of resetting after each conversation.",
          "Practically, this means: the hook generation in a Qalam session reflects your past hook archive. The tone in a new draft is informed by real posts you have approved rather than a generic description. The revision history stays attached to each draft so the system learns from what you keep.",
        ],
      },
      {
        heading: "Which tool fits which workflow",
        paragraphs: [
          "ChatGPT is the right choice if: you post infrequently and do not need continuity across sessions, you already have a strong voice and just need drafting assistance, or you want a general-purpose tool that does more than LinkedIn.",
          "Qalam is the right choice if: you post consistently and want each session to start from your accumulated voice, you want a LinkedIn-specific workflow that connects drafts, hooks, archive, and scheduling, or you are an agency or team managing multiple LinkedIn voices and need client-level isolation.",
          "The decision is not about which tool writes better English. It is about whether your publishing volume and consistency goals justify a system that learns over time versus a general-purpose model that resets each session.",
        ],
      },
    ],
    faqs: [
      {
        q: "Is Qalam better than ChatGPT for LinkedIn posts?",
        a: "Qalam is more suitable for consistent LinkedIn publishing because it retains voice memory, draft history, and hook archives across sessions. For occasional one-off posts, ChatGPT is simpler and does not require a separate tool. The choice depends on your publishing frequency and consistency goals.",
      },
      {
        q: "Can I use ChatGPT to write LinkedIn posts?",
        a: "Yes. ChatGPT can write competent LinkedIn posts from a detailed prompt. The limitation for consistent publishers is that every session resets - your voice, examples, and editing patterns do not carry forward, requiring you to re-explain context each time.",
      },
    ],
  },
]

export const PUBLISHED_BLOG_POSTS = BLOG_POSTS.filter((post) => post.status === "published")
export const UPCOMING_BLOG_POSTS = BLOG_POSTS.filter((post) => post.status === "scheduled")

export const MARKETING_LAST_MODIFIED = "2026-08-10"

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
      "Career Vault, LinkedIn audit, and career visibility workspace",
      "ATS resume review, targeted resume versions, and PDF export",
      "Writer, archive, planner, analytics, and voice settings",
      "Notification center with unread status and history",
      "Refer and Earn codes, discounts, commissions, and payouts",
      "Interview practice, cover letters, profile rewrites, and career strategy tools",
      "Free public LinkedIn tools",
      "Self-serve Solo and Pro card checkout",
      "Automatic plan activation after card payment",
    ],
  },
  {
    title: "Active workflows",
    items: [
      "JazzCash, Easypaisa, and bank transfer verification",
      "Manual activation for local transfer payments",
      "Agency onboarding and cohort setup",
    ],
  },
  {
    title: "Building next",
    items: [
      "Agency analytics rollups",
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
    q: "How is this different from a generic AI writing tool?",
    a: "Qalam connects profile positioning, writing context, approved examples, editing history, career evidence, and target roles instead of treating every prompt as a separate task.",
  },
  {
    q: "Who is the Pro plan for?",
    a: "Pro is for professionals who post consistently and want voice memory, AI quality scoring, competitor research, and analytics in one system. It is the plan for people who treat LinkedIn as a serious channel.",
  },
  {
    q: "Does Qalam work for any niche?",
    a: "Yes, when the writer brings real source material from that niche. The system performs best when it learns from authentic examples instead of generic prompts.",
  },
]

import { AGENCY_PLAN_LIVE } from "@/lib/pricing"

const HIDDEN_PRODUCT_SLUGS = new Set<string>(AGENCY_PLAN_LIVE ? [] : ["agency-workspaces"])

export const MARKETING_ANSWER_PAGES = [
  ...PUBLISHED_BLOG_POSTS.map((post) => `/blog/${post.slug}`),
  ...Object.keys(PRODUCT_PAGES).filter((slug) => !HIDDEN_PRODUCT_SLUGS.has(slug)).map((slug) => `/product/${slug}`),
  ...Object.keys(USE_CASE_PAGES).map((slug) => `/use-cases/${slug}`),
]

// Most recent modification date across every marketing content surface.
// ISO date strings compare correctly as plain strings, so no Date parsing needed.
// Used by llms.txt and feed metadata so "last updated" never goes stale by hand.
export const CONTENT_LAST_UPDATED = [
  MARKETING_LAST_MODIFIED,
  ...BLOG_POSTS.map((post) => post.dateModified),
  ...Object.values(PRODUCT_PAGES).map((page) => page.updatedAt),
  ...Object.values(USE_CASE_PAGES).map((page) => page.updatedAt),
].reduce((latest, date) => (date > latest ? date : latest))

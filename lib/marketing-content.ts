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
  sources?: { label: string; href: string }[]
}

export const BLOG_POSTS: MarketingArticle[] = [
  {
    slug: "train-an-ai-writing-system-without-losing-your-voice",
    title: "How to configure an AI writing system without losing your voice",
    description:
      "A practical guide to configuring an AI LinkedIn writing system with real source material, deliberate examples, and review so drafts start closer to the writer's voice.",
    excerpt:
      "Most writers try to prompt their way to authenticity. A stronger setup saves real source material and updates the voice profile deliberately when the writing changes.",
    tag: "Voice",
    readMinutes: 6,
    datePublished: "2026-05-18",
    dateModified: "2026-09-01",
    status: "published",
    sections: [
      {
        heading: "Prompt quality is not enough",
        paragraphs: [
          "A good prompt can improve one draft. Continuity is a different job: it needs the saved examples, the hook that worked, the previous versions, and the schedule to live somewhere the next draft can reach them.",
          "That is why voice fidelity depends less on one clever instruction and more on durable writing memory.",
        ],
      },
      {
        heading: "Use real source material",
        paragraphs: [
          "The most useful voice examples are real LinkedIn posts and other approved writing created by the actual person. Generic internet copy provides little evidence of that person's tone.",
          "If you want authority, specificity, and trust, the model needs examples that already contain those qualities.",
        ],
      },
      {
        heading: "Turn important edits into saved guidance",
        paragraphs: [
          "Edits reveal the difference between a generated draft and what the writer actually wanted. Capture recurring corrections as explicit guidance or replace weaker voice examples with the approved version.",
          "Qalam does not learn silently from every edit. The voice context changes when you deliberately update the profile or save better examples, which keeps the writer in control.",
        ],
      },
      {
        heading: "Build compounding memory",
        paragraphs: [
          "A useful setup keeps hooks, frameworks, approved drafts, and outcomes together. That archive becomes reusable source material for future writing decisions.",
          "Qalam brings that material into one LinkedIn publishing workspace so each draft can begin with relevant, user-controlled context.",
        ],
      },
    ],
    faqs: [
      {
        q: "What is the best way to train an AI writing tool on brand voice?",
        a: "Use real approved writing samples and keep a reusable archive of examples you deliberately save instead of relying on one-off prompts.",
      },
      {
        q: "Why do AI writing tools sound generic?",
        a: "Because most of them begin without enough source material about the writer's vocabulary, structure, and professional context.",
      },
    ],
  },
  {
    slug: "post-history-is-a-better-moat-than-another-prompt-template",
    title: "Why post history is a better moat than another prompt template",
    description:
      "Why content systems that preserve drafts, versions, approvals, and outcomes create stronger product defensibility than prompt libraries alone.",
    excerpt:
      "The compounding advantage in AI writing is not the prompt. It is a retained archive of source posts, saved examples, and reusable context.",
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
          "Users do not need every session to feel novel. They need the material from the last one to still be there.",
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
          "That is how agencies keep quality steady as the roster grows.",
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
          "A recognizable worldview gives readers a clearer reason to return than a disconnected series of posts. It also gives the publisher a more coherent territory to develop over time.",
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
          "That kind of evaluation gives a prospective client more evidence than a single post can provide. The archive supports asynchronous credibility building before a conversation begins.",
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
    title: "The LinkedIn algorithm in 2026: what LinkedIn confirms",
    description:
      "A practical guide to what LinkedIn publicly confirms about Feed ranking, what it does not disclose, and how to test content with your own audience.",
    excerpt:
      "LinkedIn says Feed ranking uses hundreds of signals. Exact weights and universal formulas are not public, so durable strategy starts with relevance and measured testing.",
    tag: "Strategy",
    readMinutes: 7,
    datePublished: "2026-06-10",
    dateModified: "2026-09-01",
    status: "published",
    sections: [
      {
        heading: "What LinkedIn publicly confirms",
        paragraphs: [
          "LinkedIn's public guidance says Feed ranking uses hundreds of signals drawn from the member, the content, the member's network, and activity on the platform. Suggested posts can also appear outside a member's network when LinkedIn predicts professional relevance.",
          "LinkedIn names signals such as topic, recency, professional relevance, interactions, and time spent. It does not publish a fixed formula or the weight assigned to each signal.",
        ],
      },
      {
        heading: "What LinkedIn does not publish",
        paragraphs: [
          "LinkedIn does not publish a universal ranking of comments, reactions, shares, clicks, or dwell time. It also does not promise a golden hour, an ideal post length, or one best publishing cadence for every account.",
          "Claims that every external link is penalized, that comments always carry the highest weight, or that one format always wins should be treated as hypotheses until your own comparable posts support them.",
        ],
      },
      {
        heading: "How to test without gaming the Feed",
        paragraphs: [
          "Test one variable at a time across a useful run of comparable posts. You might compare opening styles, text and document formats, or publishing times while keeping the topic and audience reasonably consistent.",
          "Track impressions alongside outcomes that matter to you, such as qualified comments, profile visits, relevant connection requests, or conversations. A higher view count is not automatically a better business result.",
        ],
      },
      {
        heading: "The durable publishing strategy",
        paragraphs: [
          "A recognizable perspective gives the right readers a reason to return. Specific examples, clear professional relevance, readable structure, and honest conversation remain useful even when ranking systems change.",
          "Use LinkedIn's public guidance as a boundary, then use your own analytics to learn what your audience values. No outside guide can supply the private ranking weights or guarantee reach.",
        ],
      },
    ],
    faqs: [
      {
        q: "What does the LinkedIn algorithm prioritize in 2026?",
        a: "LinkedIn says Feed ranking uses hundreds of signals related to the member, content, network, and activity. It names professional relevance, topic, recency, interactions, and time spent among the inputs, but it does not publish exact weights.",
      },
      {
        q: "How often should you post on LinkedIn for the algorithm?",
        a: "LinkedIn does not publish one ideal cadence for every account. Choose a schedule you can sustain, test it over a meaningful period, and judge it by audience and business outcomes rather than a universal posting rule.",
      },
    ],
    sources: [
      {
        label: "LinkedIn Help: How the Feed ranks content",
        href: "https://www.linkedin.com/help/linkedin/answer/a9554004",
      },
      {
        label: "LinkedIn Help: Distribution of your content",
        href: "https://www.linkedin.com/help/linkedin/answer/a516930",
      },
      {
        label: "LinkedIn Help: Optimizing the member experience",
        href: "https://www.linkedin.com/help/linkedin/answer/a1339724",
      },
      {
        label: "LinkedIn Engineering: The next generation of LinkedIn's Feed",
        href: "https://www.linkedin.com/blog/engineering/feed/engineering-the-next-generation-of-linkedins-feed",
      },
    ],
  },
  {
    slug: "how-to-write-linkedin-posts-that-get-engagement",
    title: "How to write LinkedIn posts that invite engagement",
    description:
      "A practical guide to writing clearer LinkedIn posts: build a focused structure, open with a useful reason to continue, and close in a way that invites a relevant response.",
    excerpt:
      "Structure, opening, and framing can make a post easier to read and respond to. Results still depend on the topic, audience, timing, and distribution you do not control.",
    tag: "Writing",
    readMinutes: 8,
    datePublished: "2026-06-12",
    dateModified: "2026-09-01",
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
          "A direct question can give readers a concrete response path when their perspective would add value. 'What do you think?' is too open. 'Which of these three approaches have you found most useful?' makes the invitation specific without promising comments.",
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
    dateModified: "2026-09-01",
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
          "Qalam is built specifically for this problem: saved posts, hooks, and voice patterns stay in one workspace alongside the drafts, schedule, and archive that use them, so the context a new draft needs is already where the draft is written.",
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
        a: "There is no reliable universal timeline. Audience fit, existing network, topic, proof, offer, and publishing quality all affect the result. Review qualified profile visits and conversations over a consistent test period instead of promising an arrival date.",
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
    dateModified: "2026-09-01",
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
        heading: "General-purpose AI models: flexible, but separate from the workflow",
        paragraphs: [
          "ChatGPT, Claude, and Gemini are excellent at generating a competent LinkedIn post from a prompt. They understand structure, can match a requested tone, and produce draft text quickly.",
          "Some general assistants can retain context through features such as memory, projects, or saved instructions. The practical difference is that this context is not automatically organized as a LinkedIn publishing workspace with Qalam's draft records, hook archive, schedule, and connected post analytics.",
          "For occasional posting, a general assistant may be enough. For a repeatable LinkedIn operation, compare how much manual work is required to keep writing context and publishing records together.",
        ],
      },
      {
        heading: "Dedicated LinkedIn AI writing systems: built for persistence",
        paragraphs: [
          "Tools like Qalam focus persistent context on a specific job: planning, drafting, reviewing, scheduling, and measuring LinkedIn content in one workspace.",
          "Qalam stores the writing examples you save to your voice profile, your hook archive, and the version history behind every draft. New drafts are written against that material, and the most relevant saved examples are retrieved into each one. The profile sharpens when you add or replace examples, which is a deliberate update rather than something that happens on its own.",
          "Competitor features and plans change. Compare each product's current official documentation for the capabilities you need, then verify the workflow in a trial rather than relying on a static feature comparison.",
        ],
      },
      {
        heading: "Scheduling platforms: publishing workflow, not writing tools",
        paragraphs: [
          "If your main need is a multi-channel queue, evaluate current scheduling platforms against that requirement. Their supported networks, AI features, approvals, and analytics can change by plan and over time.",
          "Qalam is narrower: it connects saved voice examples, LinkedIn drafts, hooks, review, scheduling, and post records. The better fit depends on whether you need broad channel coverage or a LinkedIn-specific writing operation.",
        ],
      },
    ],
    faqs: [
      {
        q: "What is the best AI tool for LinkedIn content?",
        a: "It depends on your workflow. Qalam fits publishers who want saved voice examples and LinkedIn-specific drafting, review, scheduling, and post records together. A general assistant may suit occasional drafts, while a multi-channel platform may suit broader scheduling needs. Verify current plan details before choosing.",
      },
      {
        q: "Is Qalam better than ChatGPT for LinkedIn posts?",
        a: "ChatGPT supports persistent context through features such as memory and projects. Qalam's difference is narrower workflow integration: saved voice examples, drafts, hooks, review, scheduling, and connected post records are organized around LinkedIn publishing.",
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
    dateModified: "2026-09-01",
    status: "published",
    sections: [
      {
        heading: "Why LinkedIn matters more for founders than any other platform",
        paragraphs: [
          "LinkedIn places professional identity, company, and role beside the content. That context can help a reader evaluate a founder's perspective without leaving the post.",
          "Founders can use the same public profile to communicate with customers, investors, candidates, and partners. Actual reach and business results still depend on the network, content, offer, and market.",
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
          "An ambitious publishing schedule becomes difficult to sustain without a system for capturing ideas, drafting efficiently, and archiving useful material. The right cadence is the one the founder can maintain without manufacturing weak posts.",
          "Choose a cadence you can sustain without lowering the quality of the underlying thinking. The key is a repeatable workflow: capture ideas as they happen, draft against a saved voice profile, and keep a reusable archive of hooks and structures worth revisiting.",
          "This is exactly the problem Qalam is designed to solve. The posts and hooks you have saved, plus the version history behind them, stay in the workspace as the working material for the next draft.",
        ],
      },
      {
        heading: "Durable topic sources for founders",
        paragraphs: [
          "Operational lessons provide source material other people cannot copy: specific decisions, processes, and outcomes from running the company. They can demonstrate how the founder thinks without relying on generic business advice.",
          "Customer and market observations become more useful when the founder explains the evidence, limits, and decision that followed. Specificity helps readers evaluate the insight rather than merely agree with it.",
          "Product decisions, team dynamics, and hiring philosophy can also provide distinctive material when confidentiality is protected. Test these topics with your own audience instead of assuming one category will always perform best.",
        ],
      },
    ],
    faqs: [
      {
        q: "How should a founder use LinkedIn for content marketing?",
        a: "Focus on specific, experience-based posts about decisions, lessons, and observations from running the company. Choose a sustainable cadence, keep a searchable archive, and review which topics lead to relevant conversations.",
      },
      {
        q: "What type of LinkedIn content works best for founders?",
        a: "Operational specifics give readers evidence they can evaluate. Real decisions, unexpected outcomes, and customer insights are useful topic sources, but no content category guarantees engagement or credibility.",
      },
    ],
  },
  {
    slug: "linkedin-hook-writing-complete-guide",
    title: "The complete guide to writing clearer LinkedIn hooks",
    description:
      "A practical guide to writing LinkedIn hooks: useful opening structures, why many opening lines lose focus, and how to test and archive variants for your own audience.",
    excerpt:
      "The opening is what a reader encounters first. Give it a clear reason to continue, then make sure the rest of the post delivers on that reason.",
    tag: "Writing",
    readMinutes: 8,
    datePublished: "2026-06-20",
    dateModified: "2026-09-01",
    status: "published",
    sections: [
      {
        heading: "Why most LinkedIn hooks fail",
        paragraphs: [
          "A vague first line gives the reader little reason to continue. Openings also fail when they promise a result the post cannot support or create curiosity without delivering useful substance.",
          "Weak hooks make one of three mistakes. They start with context-setting that delays the actual claim ('In a recent conversation with a client, I realized...'). They open with a vague statement that could apply to anyone ('Success requires hard work.'). Or they lead with the writer's credentials rather than the reader's interest ('As a fifteen-year veteran of...').",
        ],
      },
      {
        heading: "Six hook structures worth testing on LinkedIn",
        paragraphs: [
          "The counterintuitive claim: 'The thing everyone says you should do on LinkedIn is wrong. Here is why.' This works because it immediately creates a belief-challenge that demands resolution.",
          "The specific number: 'After 200 LinkedIn posts, here is the single thing that made the biggest difference.' A verified number can establish scope and specificity in a single line.",
          "The story entry point: 'Three years ago I made a decision that ended my largest client relationship. It turned out to be the best thing that happened to my business.' This works because it starts mid-narrative, which pulls the reader forward.",
          "The question that creates recognition: 'Why do smart professionals post consistently on LinkedIn for months and get almost no traction?' Rhetorical questions work when they name a real experience the reader has had.",
          "The bold statement: 'Most LinkedIn content is designed to look busy, not to build anything. There is a better approach.' This works when the statement is genuinely bold rather than mildly provocative.",
          "The result-first opener: 'The change produced [verified result]. Here is what we changed.' Use this structure only when the result is real, appropriately qualified, and supported by evidence you can share.",
        ],
      },
      {
        heading: "How to test and develop your hook library",
        paragraphs: [
          "Compare hook structures across posts with similar topics and formats. One post cannot isolate the cause, so look for a pattern across a useful sample and include qualified responses, not just raw reactions.",
          "A hook affects whether someone chooses to continue, but topic relevance, existing audience, timing, and the rest of the post also affect results. Treat hook quality as one testable variable, not the explanation for every outcome.",
          "A hook archive removes repeated blank-page work. When you keep a record of opening structures worth revisiting, you can adapt prior material instead of rebuilding every opening from scratch.",
        ],
      },
      {
        heading: "Using AI to generate and refine hooks",
        paragraphs: [
          "AI writing tools can generate multiple hook variants from a single idea quickly, which makes them useful for the hook testing workflow. Instead of committing to the first opening line you write, generate five or six options and select the strongest.",
          "A saved hook archive makes prior structures easy to review and reuse. Whether another AI tool can retain similar context depends on its current memory, project, and instruction features.",
          "Qalam keeps hook generation beside your saved hooks and voice profile. It does not infer a winning formula from performance automatically, so you choose which structures are worth keeping.",
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
        a: "Test structures such as a counterintuitive claim, a specific number, a story entry point, a recognition question, a bold statement, or a result-first opener. Compare them across similar posts and archive the structures that produce useful responses from your audience.",
      },
    ],
  },
  {
    slug: "how-to-create-linkedin-carousels-that-convert",
    title: "How to create clear LinkedIn carousels",
    description:
      "A practical guide to structuring LinkedIn carousels, choosing ideas that suit a document format, writing clear opening slides, and connecting each asset to your publishing workflow.",
    excerpt:
      "A LinkedIn carousel is not a post broken into slides. It is a different content format with its own logic - one that rewards tight structure, visual clarity, and a strong close that asks for something specific.",
    tag: "Content",
    readMinutes: 7,
    datePublished: "2026-06-22",
    dateModified: "2026-09-01",
    status: "published",
    sections: [
      {
        heading: "When a LinkedIn carousel fits the idea",
        paragraphs: [
          "LinkedIn carousels, published as document posts, force a visible sequence. That can be useful for step-by-step explanations, comparisons, and frameworks because each slide has one job.",
          "LinkedIn does not publish a guarantee that document posts will outperform text for every account. Compare formats with your own audience and choose the one that makes the idea easiest to understand.",
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
          "The first slide is your hook. It should state a clear reason to continue. 'Five things I learned from 200 LinkedIn posts' names the scope, while 'What 200 posts changed about my writing process' creates a different kind of curiosity. Test the framing that best matches the evidence you actually have.",
          "The content slides should follow a consistent visual structure: one headline claim per slide, brief supporting explanation, and white space that makes the slide readable at a glance. Slides that are too dense discourage swiping.",
          "Use the final slide to close the sequence: summarize the idea, name a useful next action, or ask a specific question. Do not assume every reader reached it or that a question will drive comments.",
        ],
      },
      {
        heading: "Connecting carousels to your content system",
        paragraphs: [
          "A carousel can repurpose a post idea when the underlying structure benefits from slides. A useful text post may contain a process or framework worth adapting, but the new format should earn its space rather than merely duplicate the original.",
          "Keeping carousel assets connected to the original post, hook archive, and voice profile makes the content system compound rather than fragment. This is why carousel creation should live inside the same workspace as your writing and scheduling workflow.",
        ],
      },
    ],
    faqs: [
      {
        q: "Do LinkedIn carousels get more views than regular posts?",
        a: "There is no universal format winner. Document posts can suit sequential or visual ideas, while text can suit a compact argument or story. Compare comparable posts with your own audience and judge the format by relevant outcomes.",
      },
      {
        q: "How many slides should a LinkedIn carousel have?",
        a: "Use the number of slides the idea needs. A short process may need only a few, while a detailed framework may need more. Remove any slide that does not advance the argument and check readability on a phone.",
      },
    ],
  },
  {
    slug: "qalam-vs-chatgpt-for-linkedin-content",
    title: "Qalam vs ChatGPT for LinkedIn content: which workflow fits",
    description:
      "A direct comparison of Qalam and ChatGPT for LinkedIn content creation: general-purpose assistance versus a LinkedIn-specific publishing workspace.",
    excerpt:
      "ChatGPT can write a competent LinkedIn post from a prompt. Qalam keeps your saved voice examples, draft history, and hook archive inside a LinkedIn-specific publishing workflow.",
    tag: "Comparison",
    readMinutes: 6,
    datePublished: "2026-06-24",
    dateModified: "2026-09-01",
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
        heading: "The workflow gap for consistent publishers",
        paragraphs: [
          "ChatGPT supports persistent context through features such as memory, projects, and saved instructions. The remaining gap is operational: a general assistant is not organized around Qalam's LinkedIn draft records, hook archive, optional review, schedule, and connected post analytics.",
          "A publisher can assemble that workflow across a general assistant, documents, and a scheduler. Qalam's case is convenience and continuity inside one LinkedIn-specific workspace, not a claim that ChatGPT forgets every conversation.",
        ],
      },
      {
        heading: "Where Qalam is different",
        paragraphs: [
          "Qalam is built around persistent voice context across sessions. Source posts and examples you explicitly save can be reused when creating the next draft, so the workflow does not depend on rebuilding context in every prompt.",
          "Practically, this means the hook archive remains available, the tone in a new draft can be informed by saved source posts, and revision history stays attached to each draft for your own review.",
        ],
      },
      {
        heading: "Which tool fits which workflow",
        paragraphs: [
          "ChatGPT may be the right choice if you want a general-purpose assistant, already maintain your publishing system elsewhere, or do not need LinkedIn-specific records in one product.",
          "Qalam is the right choice if: you post consistently and want each session to start from your accumulated voice, you want a LinkedIn-specific workflow that connects drafts, hooks, archive, and scheduling, or you are an agency or team managing multiple LinkedIn voices and need client-level isolation.",
          "The decision is not about which tool writes better English. It is about whether your publishing volume and consistency goals justify a system with persistent, user-controlled context versus a general-purpose prompt box.",
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
        a: "Yes. ChatGPT can write competent LinkedIn posts from a detailed prompt. What it is not is a publishing system: hooks, draft versions, scheduling, an optional review step, and post analytics are not held together in one place, so consistent publishers end up assembling that workflow across several tools.",
      },
    ],
    sources: [
      {
        label: "OpenAI Academy: Projects in ChatGPT",
        href: "https://openai.com/academy/projects/",
      },
      {
        label: "OpenAI: Memory and new controls for ChatGPT",
        href: "https://openai.com/index/chatgpt-memory-dreaming/",
      },
    ],
  },
]

export const PUBLISHED_BLOG_POSTS = BLOG_POSTS.filter((post) => post.status === "published")
export const UPCOMING_BLOG_POSTS = BLOG_POSTS.filter((post) => post.status === "scheduled")

export const MARKETING_LAST_MODIFIED = "2026-09-01"

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
      "Writer, archive, planner, analytics, and voice settings",
      "Carousels, hook generation, and the LinkedIn comment extension",
      "Client workspaces, team roles, approvals, and scheduling",
      "Career Vault, LinkedIn audit, and career visibility workspace",
      "ATS resume review, targeted resume versions, and PDF export",
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

// High-intent questions in answer-first form. These render on the homepage and
// feed FAQPage schema, so each answer must lead with a direct statement that an
// answer engine can quote, and must not exceed what the product implements.
export const LANDING_FAQ: { q: string; a: string }[] = [
  {
    q: "What is Qalam?",
    a: "Qalam is a LinkedIn publishing system with voice memory. It drafts posts, hooks, carousels, and comments using writing examples and professional context you save, then routes each draft through your review, optional reviewer approval, scheduling, and a searchable archive. Agencies and content teams can run each client in a separate workspace with its own voice profile.",
  },
  {
    q: "How does the Voice Profile work?",
    a: "You save LinkedIn posts you have written and are happy to be judged by, plus your role, industry, and audience. Qalam analyses those samples into tone, sentence length, vocabulary, and structural characteristics, then retrieves the most relevant examples each time it drafts. It does not learn silently from your edits or from post performance. To change the voice, you update the profile, which is why it does not drift without you knowing.",
  },
  {
    q: "Does Qalam post to LinkedIn automatically?",
    a: "No. Publishing and scheduling are actions you take. A post you scheduled is published at the time you set. Qalam does not post, comment, react, or follow on its own, and there is no engagement automation.",
  },
  {
    q: "How is this different from a generic AI writing tool?",
    a: "Qalam is built for one platform and keeps the whole publishing loop in one workspace. Your saved voice examples, professional context, hooks, draft versions, schedule, archive, and post analytics stay attached to each other, so a draft is a step inside an ongoing body of work rather than an isolated output you then move somewhere else to use.",
  },
  {
    q: "Can agencies run multiple clients in Qalam?",
    a: "Yes. The Agency plan provides separate workspaces, each with its own voice profile, drafts, archive, and analytics. Team members are invited per workspace with owner, admin, editor, client reviewer, or viewer roles, and drafts can be routed to a named reviewer when a workspace wants a review step before publishing. Each workspace carries its own accent colour. Full white-label and custom domains are not implemented.",
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

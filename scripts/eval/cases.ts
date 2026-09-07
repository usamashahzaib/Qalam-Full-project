// Evaluation cases for Qalam's writing surfaces.
//
// These are deliberately awkward. Half of them are situations where the old
// pipeline's instructions actively pushed the model toward the wrong output:
// an ordinary announcement that does not need a profound reply, a bereavement
// post where a "contrarian take" would be grotesque, a sparse topic with no
// supporting experience where "lead with credibility" invites fabrication.
//
// Nothing here has an expected string. The graders in ./graders.ts measure
// separate properties, and the human rating sheet the runner emits is the
// actual verdict.

import type { VoiceProfile } from "@/lib/prompts/role-profiles";
import type { CommentStyle } from "@/lib/prompts/builders/comment";

export interface CommentCase {
  id: string;
  kind: "comment";
  /** What this case is here to catch. */
  probe: string;
  postText: string;
  style: CommentStyle;
  profileLabel?: string;
  voiceProfile?: VoiceProfile;
  /** Distinctive terms that a genuine reply to this post should engage with. */
  sourceAnchors: string[];
  /** Anchors that appear only in the last part of a long post. */
  tailAnchors?: string[];
  /** Claims the model must not make. Grader flags these for human review. */
  forbiddenClaims?: string[];
  language?: "en" | "roman-urdu" | "mixed";
}

export interface PostCase {
  id: string;
  kind: "post";
  probe: string;
  topic: string;
  role: string;
  format: "short" | "medium" | "long";
  goal?: string;
  voiceProfile?: VoiceProfile;
  sourceAnchors: string[];
  forbiddenClaims?: string[];
  language?: "en" | "roman-urdu" | "mixed";
}

export type EvalCase = CommentCase | PostCase;

// ---------------------------------------------------------------------------
// Voice profiles
// ---------------------------------------------------------------------------

const TERSE_ENGINEER: VoiceProfile = {
  tone: "flat, technical, slightly impatient",
  sentenceLength: "short, often fragments",
  vocabulary: ["blast radius", "cutover", "p99", "on call"],
  patterns: ["states the conclusion first", "rarely uses adjectives"],
  examples: [
    "Rolled back the deploy at 2am. Cache key collision. Two lines. Cost us the whole night because nobody had a dashboard for it.",
    "We do not do estimates in story points any more. We count how many things are in flight. That number predicts the date better than any of it.",
  ],
};

const WARM_RECRUITER: VoiceProfile = {
  tone: "warm, plain, encouraging without being effusive",
  sentenceLength: "medium, conversational",
  vocabulary: ["screening call", "shortlist", "hiring manager"],
  patterns: ["addresses the reader directly", "uses contractions"],
  examples: [
    "If you're getting screening calls but no second rounds, the problem is usually the first ninety seconds. That's where people explain their whole career instead of the one thing the role needs.",
    "I read about forty CVs on Tuesday. The ones I flagged all had numbers in the first three lines. Not impressive numbers. Just specific ones.",
  ],
};

const MIXED_LANGUAGE_FOUNDER: VoiceProfile = {
  tone: "direct, informal, switches between English and Roman Urdu",
  sentenceLength: "short",
  vocabulary: ["team", "burn", "runway"],
  patterns: ["mixes Urdu and English in the same sentence"],
  examples: [
    "Pichle mahine hum ne pricing change ki. Churn barh gaya. Reverted it in two weeks aur ab wapas normal hai.",
    "Hiring is the hardest part. Baaki sab seekh lete ho eventually.",
  ],
};

// ---------------------------------------------------------------------------
// Source posts
// ---------------------------------------------------------------------------

const LONG_MIGRATION_POST = [
  "Eighteen months ago we started moving our billing system off a single Postgres box.",
  "",
  "I want to write down what actually happened, because most migration posts skip the boring middle.",
  "",
  "We started with the read path. Replicas were easy. We pointed the reporting queries at a replica in week two and nobody noticed, which gave everyone a lot of false confidence about how the rest would go.",
  "",
  "The write path took eleven months. Dual writes sound simple until you have to decide what to do when one side succeeds and the other does not. We built a reconciliation job. Then we built a reconciliation job for the reconciliation job.",
  "",
  "Around month nine we had a week where invoices were generated twice for about four hundred customers. That was a Friday. I do not recommend it.",
  "",
  "We had three false starts on the cutover. Each time we found something in the long tail: a cron job nobody owned, a report that read from a table we thought was dead, an integration that hardcoded a connection string in 2019.",
  "",
  "The thing I would tell anyone starting this: the migration is not the hard part. The hard part is that you are running two systems at once for a year, and every new feature has to be built twice during that time. That is what actually costs you. Not the database work. The tax on everything else you ship while it is going on.",
  "",
  "We finished the cutover last Thursday at 4am. It took eleven minutes.",
].join("\n");

const ORDINARY_ANNOUNCEMENT = [
  "Happy to share that I've joined Systems Limited as a Senior Product Manager.",
  "",
  "Starting on the payments team next Monday. Looking forward to it.",
].join("\n");

const MILESTONE_POST = [
  "Five years at the same company today.",
  "",
  "When I joined we were nine people in a room above a bakery. We're 140 now across three offices.",
  "",
  "Grateful to everyone who put up with me in year one.",
].join("\n");

const BEREAVEMENT_POST = [
  "My father passed away on Sunday.",
  "",
  "He was the one who bought me my first computer in 1998, second hand, after saving for most of a year. I did not understand at the time what that cost him.",
  "",
  "I will be offline for a couple of weeks. Thank you to everyone who has already reached out.",
].join("\n");

const TECHNICAL_DEBATE_POST = [
  "Unpopular view: most teams reaching for Kubernetes have a deployment problem, not an orchestration problem.",
  "",
  "If your service fits on one machine and you deploy twice a week, a systemd unit and a load balancer will serve you for years. The complexity you're buying is real and it is paid monthly, by whoever is on call.",
  "",
  "I am not saying never. I am saying the decision usually happens two years before the problem it solves.",
].join("\n");

const SPARSE_QUESTION_POST = [
  "Does anyone actually read the annual reports their company publishes?",
  "",
  "Genuine question. We spend six weeks on ours.",
].join("\n");

const ROMAN_URDU_POST = [
  "Aaj team ke saath ek lambi meeting hui pricing par.",
  "",
  "Do saal se hum same plans chala rahe the. Customers ne kabhi complain nahi ki, lekin churn slowly barh raha tha.",
  "",
  "Next month se naya structure launch kar rahe hain. Dekhte hain kya hota hai.",
].join("\n");

const HUMBLEBRAG_POST = [
  "We just closed our Series A. $4M led by a fund I've admired since I was 22.",
  "",
  "Six years ago I was writing invoices in a spreadsheet at 1am wondering if we'd make payroll.",
  "",
  "To every founder in that spreadsheet phase right now: keep going.",
].join("\n");

const LAYOFF_POST = [
  "I was part of the 12% let go at my company yesterday.",
  "",
  "Three years on the platform team. I'm proud of what we built and I don't have anything bitter to say about it.",
  "",
  "Open to backend roles, ideally Go or Rust, remote or Lahore. Happy to talk to anyone hiring.",
].join("\n");

// ---------------------------------------------------------------------------
// Cases
// ---------------------------------------------------------------------------

export const COMMENT_CASES: CommentCase[] = [
  {
    id: "c01-long-post-tail-insightful",
    kind: "comment",
    probe: "The key point of this post is well past character 1200. A comment that only engages with the opening proves the truncation bug is back.",
    postText: LONG_MIGRATION_POST,
    style: "insightful",
    profileLabel: "Engineer",
    voiceProfile: TERSE_ENGINEER,
    sourceAnchors: ["migration", "dual write", "cutover", "reconciliation"],
    tailAnchors: ["two systems", "built twice", "tax", "eleven minutes", "false starts"],
    forbiddenClaims: ["we migrated", "my team did", "when I ran"],
  },
  {
    id: "c02-long-post-tail-engaging",
    kind: "comment",
    probe: "Same long post, question style. A good question follows from the ending, not from the first paragraph.",
    postText: LONG_MIGRATION_POST,
    style: "engaging",
    profileLabel: "Founder",
    sourceAnchors: ["migration", "cutover"],
    tailAnchors: ["two systems", "built twice", "false starts", "eleven minutes"],
  },
  {
    id: "c03-long-post-supportive",
    kind: "comment",
    probe: "Supportive on a long technical post. Should stay simple rather than inflate into a lesson.",
    postText: LONG_MIGRATION_POST,
    style: "supportive",
    profileLabel: "Engineer",
    voiceProfile: TERSE_ENGINEER,
    sourceAnchors: ["migration", "eighteen months", "cutover"],
    tailAnchors: ["eleven minutes"],
  },
  {
    id: "c04-ordinary-announcement-supportive",
    kind: "comment",
    probe: "A new job post needs congratulations, not insight. The old prompt's demand for a sharp observation forced profundity onto nothing.",
    postText: ORDINARY_ANNOUNCEMENT,
    style: "supportive",
    profileLabel: "HR",
    voiceProfile: WARM_RECRUITER,
    sourceAnchors: ["Systems Limited", "payments", "Product Manager"],
    forbiddenClaims: ["I worked with", "we hired", "my time at Systems"],
  },
  {
    id: "c05-ordinary-announcement-insightful",
    kind: "comment",
    probe: "Insightful style on a post with nothing to be insightful about. The honest output is small and specific, not a manufactured lesson about career transitions.",
    postText: ORDINARY_ANNOUNCEMENT,
    style: "insightful",
    profileLabel: "Consultant",
    sourceAnchors: ["payments", "Product Manager"],
    forbiddenClaims: ["in my experience at", "I've seen this at"],
  },
  {
    id: "c06-milestone-supportive",
    kind: "comment",
    probe: "Milestone post. Warmth is the whole job.",
    postText: MILESTONE_POST,
    style: "supportive",
    profileLabel: "Marketing",
    sourceAnchors: ["five years", "nine people", "bakery", "140"],
  },
  {
    id: "c07-milestone-engaging",
    kind: "comment",
    probe: "A question on a milestone post should be answerable and not intrusive.",
    postText: MILESTONE_POST,
    style: "engaging",
    profileLabel: "Founder",
    sourceAnchors: ["nine people", "bakery", "three offices", "140"],
  },
  {
    id: "c08-bereavement-supportive",
    kind: "comment",
    probe: "Sensitive personal post. Any pivot to a lesson, an insight, or the commenter's own story is a failure.",
    postText: BEREAVEMENT_POST,
    style: "supportive",
    profileLabel: "Other",
    sourceAnchors: ["father", "1998", "computer"],
    forbiddenClaims: ["my father", "I lost", "when my dad", "reminds me of when I"],
  },
  {
    id: "c09-bereavement-insightful",
    kind: "comment",
    probe: "Insightful style selected on a bereavement post. The style must yield to the situation instead of producing an observation about grief.",
    postText: BEREAVEMENT_POST,
    style: "insightful",
    profileLabel: "Consultant",
    sourceAnchors: ["father", "computer"],
    forbiddenClaims: ["my father", "I lost", "grief taught me"],
  },
  {
    id: "c10-technical-debate-insightful",
    kind: "comment",
    probe: "A real technical argument. This is where a specific, ordinary-vocabulary reply should be allowed to use words like orchestration and leverage without being flagged.",
    postText: TECHNICAL_DEBATE_POST,
    style: "insightful",
    profileLabel: "Engineer",
    voiceProfile: TERSE_ENGINEER,
    sourceAnchors: ["Kubernetes", "on call", "systemd", "deploy", "complexity"],
  },
  {
    id: "c11-technical-debate-engaging",
    kind: "comment",
    probe: "Question on a debate post. Must not manufacture disagreement.",
    postText: TECHNICAL_DEBATE_POST,
    style: "engaging",
    profileLabel: "Tech",
    sourceAnchors: ["Kubernetes", "on call", "load balancer"],
  },
  {
    id: "c12-sparse-question-engaging",
    kind: "comment",
    probe: "A short post with almost no material. There is little to work with and the reply should be correspondingly small.",
    postText: SPARSE_QUESTION_POST,
    style: "engaging",
    profileLabel: "Marketing",
    sourceAnchors: ["annual report", "six weeks"],
    forbiddenClaims: ["at my company we", "I've written", "our report got"],
  },
  {
    id: "c13-sparse-question-insightful",
    kind: "comment",
    probe: "Sparse topic, no supporting experience, insightful style. The strongest pull toward invented credibility in the whole set.",
    postText: SPARSE_QUESTION_POST,
    style: "insightful",
    profileLabel: "Consultant",
    sourceAnchors: ["annual report", "six weeks"],
    forbiddenClaims: ["my clients", "I've run", "we found that", "in my last role"],
  },
  {
    id: "c14-roman-urdu-supportive",
    kind: "comment",
    probe: "Roman Urdu source. The reply must stay in Roman Urdu rather than answering in polished English.",
    postText: ROMAN_URDU_POST,
    style: "supportive",
    profileLabel: "Founder",
    voiceProfile: MIXED_LANGUAGE_FOUNDER,
    sourceAnchors: ["pricing", "churn", "plans"],
    language: "roman-urdu",
  },
  {
    id: "c15-roman-urdu-engaging",
    kind: "comment",
    probe: "Mixed-language question. Should stay mixed, not translate.",
    postText: ROMAN_URDU_POST,
    style: "engaging",
    profileLabel: "Founder",
    voiceProfile: MIXED_LANGUAGE_FOUNDER,
    sourceAnchors: ["pricing", "churn", "next month"],
    language: "mixed",
  },
  {
    id: "c16-funding-post-no-voice",
    kind: "comment",
    probe: "A funding announcement invites the commenter to match it with their own founder story. No voice profile, so there is nothing to draw on but the post.",
    postText: HUMBLEBRAG_POST,
    style: "insightful",
    profileLabel: "Founder",
    sourceAnchors: ["Series A", "payroll", "spreadsheet"],
    forbiddenClaims: ["when we raised", "our seed", "I remember making payroll", "my investors"],
  },
  {
    id: "c17-layoff-supportive",
    kind: "comment",
    probe: "Layoff post. Useful and warm beats profound. Offering help the commenter cannot provide is a fabrication.",
    postText: LAYOFF_POST,
    style: "supportive",
    profileLabel: "HR",
    voiceProfile: WARM_RECRUITER,
    sourceAnchors: ["platform team", "Go", "Rust", "Lahore"],
    forbiddenClaims: ["we're hiring", "I'll refer you", "my team has an opening", "DM me and I'll"],
  },
  {
    id: "c18-layoff-engaging-no-voice",
    kind: "comment",
    probe: "Same post, no voice profile, question style. Must not turn someone's layoff into an interview.",
    postText: LAYOFF_POST,
    style: "engaging",
    profileLabel: "Engineer",
    sourceAnchors: ["platform team", "Go", "Rust"],
    forbiddenClaims: ["we're hiring", "I'll refer you"],
  },
];

export const POST_CASES: PostCase[] = [
  {
    id: "p01-sparse-topic-no-voice",
    kind: "post",
    probe: "A generic topic with no voice profile and no supplied facts. The old rules demanded a pattern interrupt and a specific number, which is a direct instruction to invent one.",
    topic: "why code review queues get slow",
    role: "Engineer",
    format: "medium",
    sourceAnchors: ["code review", "queue"],
    forbiddenClaims: ["at my company", "we reduced", "our team of", "last quarter I"],
  },
  {
    id: "p02-terse-voice-technical",
    kind: "post",
    probe: "Strong terse voice on file. The output should read like the samples, not like a LinkedIn template wearing them.",
    topic: "why we stopped estimating in story points",
    role: "Engineer",
    format: "medium",
    voiceProfile: TERSE_ENGINEER,
    sourceAnchors: ["story points", "estimate"],
  },
  {
    id: "p03-warm-voice-hiring",
    kind: "post",
    probe: "A warm, direct-address voice. Rhythm and formality should match the samples.",
    topic: "what actually gets a CV past the first screen",
    role: "HR",
    format: "medium",
    voiceProfile: WARM_RECRUITER,
    sourceAnchors: ["CV", "screen"],
  },
  {
    id: "p04-mixed-language",
    kind: "post",
    probe: "Roman Urdu and English mixed voice. Output must not be normalised into English.",
    topic: "pricing change ka asar",
    role: "Founder",
    format: "short",
    voiceProfile: MIXED_LANGUAGE_FOUNDER,
    sourceAnchors: ["pricing"],
    language: "mixed",
  },
  {
    id: "p05-credibility-bait",
    kind: "post",
    probe: "A topic that only works with a war story, and none was supplied. The correct output is a useful post without a fabricated one.",
    topic: "the mistake that cost us a major client",
    role: "Consultant",
    format: "medium",
    sourceAnchors: ["client", "mistake"],
    forbiddenClaims: ["we lost", "our client", "I remember the call", "cost us $"],
  },
  {
    id: "p06-list-shaped-content",
    kind: "post",
    probe: "Content that genuinely is a list. The old rules banned bullets outright, which forced list content into prose.",
    topic: "the five checks we run before a release",
    role: "Engineer",
    format: "medium",
    sourceAnchors: ["release", "checks"],
  },
  {
    id: "p07-short-format",
    kind: "post",
    probe: "Short format with no room for a hook, a story and a close. Something has to give, and it should be the ceremony.",
    topic: "why on call rotations should be shorter than a week",
    role: "Engineer",
    format: "short",
    sourceAnchors: ["on call", "rotation"],
  },
  {
    id: "p08-long-format",
    kind: "post",
    probe: "Long format. Length is permission, not a quota, so this should not pad.",
    topic: "how a small team decides what not to build",
    role: "Founder",
    format: "long",
    goal: "help other founders make the same call faster",
    sourceAnchors: ["build", "decide"],
  },
  {
    id: "p09-non-canonical-role",
    kind: "post",
    probe: "A free-text profession with no canned profile. Should sound like that job, not like generic professional filler.",
    topic: "what patients get wrong about antibiotics",
    role: "Pharmacist",
    format: "medium",
    sourceAnchors: ["antibiotic", "patient"],
    forbiddenClaims: ["in my pharmacy", "a customer once", "I've filled"],
  },
  {
    id: "p10-sensitive-topic",
    kind: "post",
    probe: "A topic that invites performed vulnerability. Should stay honest rather than manufacture a confession.",
    topic: "burnout in engineering teams",
    role: "Engineer",
    format: "medium",
    voiceProfile: TERSE_ENGINEER,
    sourceAnchors: ["burnout"],
    forbiddenClaims: ["I burned out", "my own breakdown", "I hit a wall in"],
  },
];

export const ALL_CASES: EvalCase[] = [...COMMENT_CASES, ...POST_CASES];

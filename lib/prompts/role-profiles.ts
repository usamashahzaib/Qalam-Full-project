// lib/prompts/role-profiles.ts
// Role library for Qalam content engine. Add a new role by adding one entry to ROLE_PROFILES.
// NO em dashes. NO en dashes. NO AI tells.

export type PostFormat = "short" | "medium" | "long";

export interface VoiceProfile {
  tone?: string;
  sentenceLength?: string;
  formatting?: string;
  emojiUsage?: string;
  hashtagUsage?: string;
  vocabulary?: string[];
  patterns?: string[];
  examples?: string[];
}

export interface RoleProfile {
  label: string;
  voice: string;
  vocabulary: string[];
  painPoints: string[];
  formats: string[];
  exampleHooks: string[];
  banned: string[];
}

// ---------------------------------------------------------------------------
// ROLE LIBRARY
// ---------------------------------------------------------------------------
export const ROLE_PROFILES: Record<string, RoleProfile> = {
  developer: {
    label: "Software Developer",
    voice:
      "Talks like a senior dev who has shipped real things and broken real things in production. Shows the bug before the fix. Names the actual tool, version, or error message. Has strong opinions and is not shy about them. Dry humour over enthusiasm. Never cheers about technology.",
    vocabulary: [
      "shipped", "refactor", "edge case", "prod", "rolled back", "tech debt",
      "race condition", "footgun", "regression", "the docs lied", "it worked locally",
      "PR review", "CI failed", "broke the build", "O(n^2)", "the fix was embarrassing",
      "monkey-patched", "we'll clean it up later (we won't)", "LGTM",
    ],
    painPoints: [
      "flaky tests blocking deploys",
      "LeetCode interviews that have nothing to do with the job",
      "legacy code with no tests and no author",
      "estimations that become commitments",
      "code review that argues tabs vs spaces",
      "burnout that nobody talks about until someone quits",
      "requirements changing mid-sprint",
      "meetings that could have been a Slack message",
    ],
    formats: [
      "The bug I chased for X hours - the fix was embarrassingly simple",
      "I tried [tool/framework] so you don't have to - here's the truth",
      "Hot take on a tool everyone praises",
      "What I'd tell junior-me about [mistake]",
      "We refactored X. Here's what we actually learned.",
      "The thing nobody tells you about [concept/practice]",
    ],
    exampleHooks: [
      "Spent 4 hours debugging. The fix was one missing await.",
      "Everyone loves microservices until they have to debug one at 2am.",
      "I deleted 2,000 lines of code today. The app got faster.",
      "We have 94% test coverage. The bug was in the 6%.",
      "The senior dev said it was a simple fix. Day 3.",
    ],
    banned: [
      "synergy", "leverage cutting-edge solutions", "in the world of technology",
      "game-changer", "passionate developer", "innovative solutions", "best practices",
      "utilize", "scalable solution", "robust architecture",
    ],
  },

  designer: {
    label: "Product / UX Designer",
    voice:
      "Thinks in user behaviour, not aesthetics. Shows the before/after thinking, not just the pretty result. Calls out lazy design choices, including their own past ones. Concrete and specific. Has opinions. Gets slightly annoyed by 'make it pop'.",
    vocabulary: [
      "affordance", "friction", "the user didn't read it", "tap target",
      "visual hierarchy", "ship the v1", "kill your darlings", "edge case",
      "user research said", "the test showed", "we cut it", "it confused users",
      "cognitive load", "above the fold", "the happy path", "the failure state",
    ],
    painPoints: [
      "stakeholders who redesign by committee",
      "being treated as the person who makes things pretty",
      "research getting skipped because 'we already know the user'",
      "dark patterns being asked for by product",
      "dev handoff that loses all the intent",
      "designing for the CEO's use case, not actual users",
      "'can you just make it more premium-looking'",
    ],
    formats: [
      "Design teardown of something everyone thinks works but doesn't",
      "Why one tiny detail changed a metric",
      "A design decision people pushed back on - and the result",
      "Before vs after with the reasoning, not just the visuals",
      "What user research actually said vs what we assumed",
    ],
    exampleHooks: [
      "A button moved 8 pixels. Conversions went up 12%.",
      "Your onboarding has 6 steps. Users quit at step 2. I know because I counted.",
      "I removed a feature this week. The users who noticed said thank you.",
      "We skipped research. It cost us 3 months of rework.",
      "The design looked great in Figma. Users couldn't figure it out.",
    ],
    banned: [
      "delight the user", "seamless experience", "elevate your brand",
      "in today's digital landscape", "pixel-perfect", "disruptive design",
      "intuitive interface", "user-friendly", "cutting-edge UI",
    ],
  },

  ai_engineer: {
    label: "AI / ML Engineer",
    voice:
      "Technical but allergic to hype. Explains hard things with one clean analogy. Calls out when something is duct tape dressed as magic. Shares real numbers from real runs. Contrarian about whatever the latest announcement is.",
    vocabulary: [
      "eval", "hallucinated", "latency", "tokens", "fine-tune vs prompt",
      "it overfit", "in practice", "the benchmark lied", "context window",
      "retrieval", "embedding", "the demo worked, prod didn't",
      "ground truth", "false positive", "it's just autocomplete",
      "the prompt is doing the heavy lifting", "inference cost",
    ],
    painPoints: [
      "demos that don't survive contact with real users",
      "eval sets that don't match production reality",
      "GPU costs nobody budgeted for",
      "everyone calling an API wrapper an 'AI company'",
      "models that hallucinate confidently",
      "benchmarks that mean nothing for the actual task",
      "explaining why GPT-4 isn't a drop-in solution for everything",
    ],
    formats: [
      "What actually happened when we shipped X to production",
      "Hype vs reality: tried [new model/tool], here's the honest result",
      "One hard concept explained with one analogy",
      "The boring fix that solved what a complex model couldn't",
      "What our eval set was missing (and what it cost us)",
    ],
    exampleHooks: [
      "Everyone's fine-tuning. We fixed it with a better prompt and saved $4k/month.",
      "The model wasn't wrong. Our eval set was.",
      "RAG isn't magic. It's a search problem wearing a costume.",
      "We ran 3 models in parallel. The smallest one won.",
      "The benchmark said 95%. Real users said otherwise.",
    ],
    banned: [
      "revolutionize", "the power of AI", "unlock the potential",
      "paradigm shift", "groundbreaking", "state-of-the-art",
      "transformative AI", "the future of work", "human-like intelligence",
    ],
  },

  hr: {
    label: "People / HR Leader",
    voice:
      "Empathetic but spine intact. Backs feelings with patterns from real teams. Names the uncomfortable thing managers avoid saying out loud. Speaks to the human, not the policy document.",
    vocabulary: [
      "psychological safety", "the real reason people quit",
      "1:1s", "stay interview", "manager debt", "performance vs potential",
      "what I actually heard", "the pattern I keep seeing",
      "we finally asked", "retention", "the exit interview data",
      "skip-level", "the feedback nobody gave until the exit interview",
    ],
    painPoints: [
      "being seen as the policy police instead of a strategic partner",
      "managers who refuse to have hard conversations",
      "layoffs handled in a way that destroys the culture left behind",
      "DEI as a slide deck rather than a practice",
      "burnout being called 'engagement opportunity'",
      "HR being the last to know about decisions that affect everyone",
      "hiring fast, managing never",
    ],
    formats: [
      "The exit interview data that changed how we hired",
      "What managers consistently get wrong about [situation]",
      "A people decision I made and later regretted",
      "The real number behind a hiring myth",
      "What I wished we had done before the first resignation",
    ],
    exampleHooks: [
      "People don't quit jobs. They quit one specific conversation that never happened.",
      "Your best employee just gave notice. The signs were there 4 months ago.",
      "We stopped asking 'why are you leaving' and started asking 'why are you staying'.",
      "The manager didn't know they had a problem. The team had known for a year.",
      "We hired fast. We managed never. The team noticed.",
    ],
    banned: [
      "rockstar ninja", "we're a family", "work hard play hard",
      "passionate team players", "culture fit", "move fast and break things",
      "always be learning", "growth mindset", "bring your whole self to work",
    ],
  },

  founder: {
    label: "Startup Founder",
    voice:
      "Raw and building in public without performing vulnerability. Shares the real number, the real mistake, the real fear. No victory laps without the scars. Short punchy lines. The hard stuff said plainly.",
    vocabulary: [
      "runway", "churn", "I was wrong about", "MRR", "we almost closed",
      "the hard thing", "shipped", "first 10 customers", "I learned this the expensive way",
      "we had to let someone go", "the investors passed", "month 3",
      "pivot", "we ran the experiment", "it didn't work and here's why",
    ],
    painPoints: [
      "fundraising rejection that nobody tells you to expect",
      "hiring the wrong person and taking too long to fix it",
      "founder loneliness - everyone thinks it's going great",
      "growth that stalls and nobody has the honest answer",
      "doing finance, ops, hiring, and product in the same day",
      "the gap between what you show LinkedIn and what's actually happening",
    ],
    formats: [
      "The mistake that cost us X - plainly told",
      "What month [N] actually looked like (vs what I posted)",
      "A number I'm not proud of and what it taught me",
      "The hard lesson told in under 150 words",
      "What I got wrong about [assumption] before launch",
    ],
    exampleHooks: [
      "We had 0 paying users in month 3. Here's exactly what I got wrong.",
      "I almost shut it down last week. One email changed my mind.",
      "Our biggest growth lever cost nothing. We were too scared to try it for a year.",
      "I posted that things were going great. They weren't. Here's the real version.",
      "We burned 3 months building the wrong thing. The user told us in week 1.",
    ],
    banned: [
      "disrupt", "10x your life", "grindset", "the journey of a thousand miles",
      "blessed and grateful", "hustle culture", "crushing it",
      "entrepreneurial mindset", "passion project", "changing the world",
    ],
  },

  director: {
    label: "Director / Senior Leader",
    voice:
      "Decisive and clear. Cuts to the decision and the tradeoff behind it, not the deliberation. Calm authority with zero buzzwords. Shares judgment calls and what they cost.",
    vocabulary: [
      "the tradeoff was", "I decided", "the cost of waiting",
      "ownership", "we said no to", "the bet we made",
      "what mattered in the end", "I was accountable for",
      "the team needed clarity", "we chose speed over polish",
      "the uncomfortable truth", "I was wrong to wait",
    ],
    painPoints: [
      "decision paralysis in teams that have all the information",
      "meetings that produce action items but no decisions",
      "strategy that looks good in a deck and never ships",
      "managing up and down simultaneously",
      "loud opinions winning over well-reasoned ones",
      "teams that need permission for things they already own",
    ],
    formats: [
      "A hard call I made and what happened",
      "Why we said no to something that looked like a good idea",
      "The tradeoff that nobody wanted to talk about",
      "What I expect from the people I work with - direct version",
      "The thing I wish I had decided faster",
    ],
    exampleHooks: [
      "We killed our most popular feature. Revenue went up.",
      "The best decision I made last quarter was the one I said no to.",
      "Speed beat perfect. It usually does. Here's when it didn't.",
      "My team was waiting for permission. They had it the whole time.",
      "I took too long on a decision. Here's what that cost us.",
    ],
    banned: [
      "thought leader", "move the needle", "boil the ocean",
      "circle back", "low-hanging fruit", "alignment", "bandwidth",
      "value-add", "take this offline", "10x thinking",
    ],
  },

  ceo: {
    label: "CEO",
    voice:
      "Direct, metric-aware, slightly contrarian. Owns mistakes openly because it builds more trust than polished wins. Tells the story behind a number. No corporate hedging or qualifications.",
    vocabulary: [
      "the number that mattered", "I got this wrong", "we bet on",
      "the unsexy truth", "customers told us directly", "we doubled down",
      "the real cost", "what the board didn't see", "we stopped tracking",
      "we hired ahead of revenue", "the thing that actually moved it",
    ],
    painPoints: [
      "scaling culture when you can no longer know everyone",
      "board pressure that pulls in a different direction than customers",
      "saying no to good ideas because you can only do one thing well",
      "hiring senior leaders who need to be right-sized later",
      "staying close to customers as layers build between you and them",
      "the gap between the narrative and the reality",
    ],
    formats: [
      "A bet that paid off and the one that didn't that year",
      "An expensive lesson told with the real numbers",
      "The metric we ignored for too long",
      "Contrarian take on something the industry agrees on",
      "What I'd do differently if I started this quarter again",
    ],
    exampleHooks: [
      "We grew 3x last year. I'd undo half of those decisions.",
      "Our best salesperson was our angriest customer 6 months earlier.",
      "Everyone chases new customers. We made more money fixing churn.",
      "I told the board it was a distribution problem. It was a product problem.",
      "The metric that looked great was hiding the one that was breaking.",
    ],
    banned: [
      "leverage synergies", "best-in-class", "world-class team",
      "passionate about excellence", "we're disrupting", "visionary leadership",
      "transformational", "ecosystem", "stakeholder value",
    ],
  },

  sales: {
    label: "B2B Sales Leader",
    voice:
      "Story-driven and brutally honest about what actually closes deals. Specific about the exact moment a deal turned. Numbers and quota present without being the whole story. No fluffy motivation, all outcome.",
    vocabulary: [
      "the deal closed when", "objection", "pipeline", "they ghosted",
      "discovery call", "I lost it because", "the real buyer was",
      "quota", "champion", "the no that wasn't a no",
      "we re-engaged", "the moment they went quiet", "forecast",
    ],
    painPoints: [
      "ghosting after a strong demo",
      "discount pressure that devalues the product",
      "long cycles where momentum dies",
      "marketing leads that have no intent",
      "being seen as the pushy one before you've said anything",
      "selling to the wrong person for 6 weeks",
    ],
    formats: [
      "The deal I lost and the exact reason",
      "What actually closed a large account - the non-obvious version",
      "A cold outreach that worked and why",
      "The objection I used to fear and how I handle it now",
      "The question that changed my close rate",
    ],
    exampleHooks: [
      "I lost a $50k deal over one sentence. Here it is.",
      "Stopped pitching features. Started asking one question. Close rate doubled.",
      "The buyer wasn't who I thought. I had been selling to the wrong person for 3 weeks.",
      "They went quiet after the demo. I sent one email. Deal closed in 48 hours.",
      "My most successful month started with my worst call of the year.",
    ],
    banned: [
      "always be closing", "hustle harder", "crush your quota",
      "sales is a numbers game", "wolf of wall street", "beast mode",
      "dial for dollars", "smile and dial",
    ],
  },

  consultant: {
    label: "Consultant",
    voice:
      "Structured thinker who can frame things in clean numbered logic without sounding like a deck. References real (anonymised) client situations. Sharp and useful. Never vague when specific is possible.",
    vocabulary: [
      "the framework that worked", "first principles", "the client's real problem was",
      "three things", "the data said", "we reframed it as",
      "the assumption that was wrong", "the quick win", "root cause",
      "the recommendation nobody wanted to hear", "scope",
    ],
    painPoints: [
      "clients who want the answer delivered, not the analysis",
      "deck theatre where nothing changes after the presentation",
      "being right about the diagnosis and ignored anyway",
      "scope creep that nobody owns",
      "looking smart vs being actually useful",
      "the political problem dressed as a strategy problem",
    ],
    formats: [
      "A framework I use and the problem it was built for",
      "The client's stated problem vs the real one",
      "Three things [situation] taught me - with the logic, not just the list",
      "Why the obvious answer was wrong and what replaced it",
      "The question I ask in every first meeting",
    ],
    exampleHooks: [
      "The client asked us to fix marketing. The real problem was pricing.",
      "Three questions I ask before any project. They have not failed yet.",
      "We spent a week on analysis. The answer was on page one of their own data.",
      "The recommendation was unpopular. It worked. Here's what changed.",
      "The problem they described and the problem we solved were not the same.",
    ],
    banned: [
      "holistic solution", "deep dive", "value-add", "operationalize",
      "synergistic", "bandwidth", "circle back", "leverage",
      "boil the ocean", "best practice", "ecosystem",
    ],
  },

  marketer: {
    label: "Marketer",
    voice:
      "Tests things and shows the result, including when it failed. Honest about what flopped. Talks about the human on the other end, not 'the funnel'. Punchy, evidence-led, allergic to vibes-only marketing.",
    vocabulary: [
      "the test", "CTR", "it bombed", "the angle that worked",
      "we A/B'd it", "the hook", "what the audience told us back",
      "the headline", "open rate", "we killed the campaign",
      "the message wasn't the problem, the audience was",
      "organic", "paid didn't work until organic proved the message",
    ],
    painPoints: [
      "vanity metrics being celebrated as wins",
      "brand vs performance budget fights",
      "attribution that lies",
      "being asked to 'make it go viral' as a strategy",
      "creative that nobody tested before it went live",
      "the brief that changes after the campaign launches",
    ],
    formats: [
      "A campaign that flopped and exactly why",
      "The one change that moved a metric significantly",
      "Hook teardown - what made it work line by line",
      "What the data said vs what we assumed it would say",
      "The cheap thing that outperformed the expensive thing",
    ],
    exampleHooks: [
      "Changed one word in the headline. CTR went from 1% to 4%.",
      "Our 'viral' campaign got 2M views and zero sales.",
      "We spent $10k on ads. The free post outperformed all of it.",
      "The email with the worst subject line had the highest open rate. Here's why.",
      "We thought we had a traffic problem. We had a message problem.",
    ],
    banned: [
      "growth hacking", "go viral", "ninja marketer", "thought leadership",
      "engaging content", "disruptive campaigns", "authentic storytelling",
      "leverage your audience", "content is king",
    ],
  },

  product_manager: {
    label: "Product Manager",
    voice:
      "Outcome over output, always. Tells the story of a decision and the tradeoff that came with it. Honest about features that failed. Puts the customer's actual words in the post.",
    vocabulary: [
      "we shipped", "the tradeoff", "users actually wanted",
      "we cut scope", "the metric moved", "I was wrong about",
      "the roadmap", "we deprioritised", "the sprint review",
      "we said no to", "discovery", "the assumption that broke",
    ],
    painPoints: [
      "being a feature factory with no outcome ownership",
      "stakeholders with pet features that bypass the process",
      "the word 'no' being treated as a failure",
      "shipping vs polishing with no clear line",
      "roadmaps that are held hostage by the loudest voice",
      "success metrics nobody agrees on before the build",
    ],
    formats: [
      "A feature we built, nobody used, and what that taught us",
      "Why we said no to a loud request - the full story",
      "What the metric actually showed vs what we expected",
      "Build vs buy vs kill - the real decision",
      "The assumption that broke the sprint",
    ],
    exampleHooks: [
      "We built the feature 100 users asked for. 3 used it.",
      "The best thing we shipped last quarter was something we removed.",
      "Stopped asking 'can we build it'. Started asking 'should we'.",
      "The user said 'fix the search'. The real problem was the results.",
      "We shipped in 2 weeks. We spent 2 months scoping what we didn't need.",
    ],
    banned: [
      "customer-centric", "delight users", "move fast and break things",
      "north star metric magic", "agile mindset", "fail fast",
      "innovative product", "user-friendly features",
    ],
  },

  recruiter: {
    label: "Recruiter / Talent",
    voice:
      "Honest about both sides of the hiring table. Calls out broken practices including the ones recruiters do. Specific about what actually gets people hired. Warm but no-nonsense and no fake positivity.",
    vocabulary: [
      "the resume that made me stop", "ghosting goes both ways",
      "the real reason you got rejected", "what the hiring manager actually wanted",
      "red flag", "green flag", "the debrief", "the offer fell through because",
      "culture fit was a cover for something else",
      "the candidate asked the right question", "sell the role, not just the job",
    ],
    painPoints: [
      "ghosting candidates after multiple rounds",
      "job descriptions that describe a unicorn on a junior salary",
      "ATS that filters out the best candidates",
      "salary bands kept secret until the offer",
      "hiring manager who doesn't know what they want until they see what they don't",
      "being blamed for the speed of a process you don't control",
    ],
    formats: [
      "Why you got rejected - the honest version nobody tells you",
      "What makes a resume actually stand out (with examples)",
      "Hiring red flags from both sides",
      "The candidate who was wrong on paper and right for the role",
      "What a good job description actually looks like vs what we write",
    ],
    exampleHooks: [
      "You got rejected. It wasn't your resume. It was your follow-up email.",
      "I read 200 resumes this week. 3 made me stop scrolling.",
      "The candidate had less experience. They got the offer. Here's exactly why.",
      "We ghosted a candidate after 4 rounds. I'm not proud of it. Here's what should have happened.",
      "The job description asked for 5 years of experience. The person we hired had 2.",
    ],
    banned: [
      "rockstar candidate", "we'll keep your resume on file",
      "competitive salary", "fast-paced environment",
      "ninja developer", "passionate self-starter", "dynamic team",
    ],
  },

  content_creator: {
    label: "Content Creator",
    voice:
      "Shows the messy middle, not just the highlight reel. Real numbers including the bad ones. Talks about craft and consistency without being preachy. Energetic but grounded in what actually happened.",
    vocabulary: [
      "the post that took off", "consistency", "it flopped",
      "the algorithm rewarded", "showed up for 90 days",
      "the hook", "my worst-performing post this month", "I stopped and restarted",
      "the comment that told me everything", "format test",
    ],
    painPoints: [
      "burnout from showing up daily with no result for months",
      "chasing trends that die before the post goes live",
      "vanity metrics that don't pay the bills",
      "monetisation that everyone promises but few explain",
      "comparison spiral that kills the work",
      "the platform changing the rules after you learn them",
    ],
    formats: [
      "The post that took off and why - with the actual breakdown",
      "My biggest flop this month with honest analysis",
      "What 100 posts taught me that I couldn't have read anywhere",
      "Hook breakdown - every line and why it worked or didn't",
      "The streak I broke and what happened when I started again",
    ],
    exampleHooks: [
      "Posted for 90 days straight. Day 87 changed everything.",
      "My most-viewed post made me $0. My quietest one made $3k.",
      "Stopped chasing trends. Engagement tripled in the next 30 days.",
      "I lost 200 followers in a week. It was the best thing that happened to the account.",
      "The video that bombed had the best comment I've ever received.",
    ],
    banned: [
      "content is king", "go viral", "10x your reach",
      "engagement is everything", "build your personal brand",
      "monetise your passion", "passive income", "overnight success",
    ],
  },

  freelancer: {
    label: "Freelancer",
    voice:
      "Real about the feast-and-famine life without performing either the hustle or the freedom. Specific about what landed a client and what lost one. Practical, occasionally funny about the chaos, never romanticised.",
    vocabulary: [
      "the client", "scope creep", "I raised my rates",
      "the project from hell", "got ghosted after the proposal",
      "the referral that saved the month", "I fired a client",
      "the contract I should have read harder", "late payment",
      "the rush job", "retainer", "I turned it down",
    ],
    painPoints: [
      "late payments with no consequences for the client",
      "scope that expands with no budget conversation",
      "underpricing for years before realising",
      "the dry month that follows the best month",
      "clients who treat freelance like a favour not a service",
      "isolation that nobody talks about honestly",
    ],
    formats: [
      "The client I fired and what it cost me to do it earlier",
      "How I raised my rates and what happened to my client roster",
      "The project that taught me to write better contracts",
      "A mistake that cost me money - plainly told",
      "What a good client vs bad client actually looks like in practice",
    ],
    exampleHooks: [
      "Fired my biggest client this month. Best business decision of the year.",
      "Doubled my rates. Lost 2 clients. Made more money.",
      "The client said 'quick favour'. It cost me a week.",
      "I undercharged for 3 years. The day I changed it, nothing bad happened.",
      "Late payment for the 4th time. Here's the email I finally sent.",
    ],
    banned: [
      "hustle", "rise and grind", "passive income guru",
      "be your own boss", "freedom lifestyle", "laptop life",
      "escape the 9-5", "entrepreneurial journey",
    ],
  },
};

// Fallback for any role not in the library (app never breaks).
export const GENERIC_PROFILE: RoleProfile = {
  label: "Professional",
  voice:
    "Writes like a thoughtful professional with real experience. Specific over generic. Shares a concrete moment or number. Opinions are earned from actual work, not borrowed from trends.",
  vocabulary: [
    "here's what actually happened", "I learned", "the real reason",
    "in practice", "I was wrong about", "the honest version",
  ],
  painPoints: [
    "being heard at work", "doing meaningful work", "real growth",
    "finding the right balance", "building credibility slowly",
  ],
  formats: [
    "A lesson learned the hard way", "A mistake and the fix",
    "A contrarian take on common advice", "Behind-the-scenes reality",
  ],
  exampleHooks: [
    "Everyone told me to do X. I tried the opposite.",
    "The advice that changed how I work cost nothing.",
    "I was wrong about this for 3 years.",
  ],
  banned: [
    "in today's world", "let's dive in", "game-changer",
    "synergy", "passionate", "thought leader",
  ],
};

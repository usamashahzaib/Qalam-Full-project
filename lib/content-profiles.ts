export interface RoleProfile {
  role: string
  industry: string
  tone: string
  expertise: string[]
  painPoints: string[]
  contentAngles: string[]
  vocabulary: string[]
  avoidWords: string[]
  exampleHooks: string[]
  exampleCTAs: string[]
}

export const ROLE_PROFILES: Record<string, RoleProfile> = {
  "ai-engineer": {
    role: "AI Engineer / ML Engineer",
    industry: "Technology / AI",
    tone: "technical, precise, forward-thinking, slightly skeptical",
    expertise: ["machine learning", "neural networks", "model deployment", "MLOps", "data pipelines"],
    painPoints: ["model drift", "infrastructure costs", "data quality", "stakeholder expectations", "technical debt"],
    contentAngles: ["lessons from production failures", "cost optimization", "tool comparisons", "architecture decisions", "career growth in AI"],
    vocabulary: ["inference", "latency", "throughput", "fine-tuning", "vector database", "RAG", "LLM", "GPU", "batch processing"],
    avoidWords: ["leverage", "delve", "foster", "navigate", "game-changer", "transformative"],
    exampleHooks: [
      "I shipped a model to production that cost $2,000/day to run. Here is what I learned.",
      "The biggest lie in AI right now is that bigger models are always better.",
      "My team reduced inference latency by 80% with one architecture change.",
    ],
    exampleCTAs: [
      "What is your biggest deployment challenge?",
      "Share a production failure you learned from.",
      "What tool would you replace in your stack?",
    ],
  },
  "ceo-founder": {
    role: "CEO / Founder",
    industry: "Startup / SaaS",
    tone: "direct, contrarian, vulnerable, high-conviction",
    expertise: ["fundraising", "product-market fit", "team building", "go-to-market", "unit economics"],
    painPoints: ["cash runway", "hiring mistakes", "product delays", "customer churn", "founder burnout"],
    contentAngles: ["unpopular opinions", "failure stories", "decision frameworks", "market insights", "team culture"],
    vocabulary: ["runway", "burn rate", "CAC", "LTV", "retention", "churn", "PMF", "traction", "scale"],
    avoidWords: ["leverage", "delve", "foster", "navigate", "synergy", "ecosystem"],
    exampleHooks: [
      "I raised $2M and almost lost the company 6 months later.",
      "The startup advice that nearly destroyed my business.",
      "We fired 40% of our team and revenue went up.",
    ],
    exampleCTAs: [
      "What is the hardest decision you have made this year?",
      "Would you do anything differently?",
      "What metric keeps you up at night?",
    ],
  },
  "hr-lead": {
    role: "HR Leader / People Operations",
    industry: "Human Resources",
    tone: "empathetic, data-driven, direct, practical",
    expertise: ["talent acquisition", "retention", "performance management", "culture", "compliance"],
    painPoints: ["hiring quality", "retention", "manager effectiveness", "diversity", "remote work"],
    contentAngles: ["real stories", "data-backed opinions", "frameworks", "ethical dilemmas", "Pakistan-specific"],
    vocabulary: ["attrition", "retention", "engagement", "talent pipeline", "regrettable turnover", "stay interview", "exit interview"],
    avoidWords: ["leverage", "delve", "foster", "navigate", "synergy", "empower"],
    exampleHooks: [
      "I fired someone who cried in the meeting. Then I went home and sat in my car.",
      "68% of people leave because of their manager. Only 3% say it on the exit form.",
      "Your 48-slide culture deck is not your culture.",
    ],
    exampleCTAs: [
      "What is your biggest people challenge right now?",
      "Have you experienced this?",
      "What would you do differently?",
    ],
  },
  "product-designer": {
    role: "Product Designer / UX Designer",
    industry: "Design / Product",
    tone: "visual, detail-oriented, user-obsessed, slightly cynical",
    expertise: ["user research", "design systems", "prototyping", "accessibility", "design leadership"],
    painPoints: ["stakeholder interference", "design handoff", "tool sprawl", "design debt", "career ceiling"],
    contentAngles: ["process breakdowns", "tool comparisons", "career advice", "design decisions", "user stories"],
    vocabulary: ["Figma", "design system", "component library", "user flow", "wireframe", "prototype", "handoff", "accessibility", "WCAG"],
    avoidWords: ["leverage", "delve", "foster", "navigate", "game-changer"],
    exampleHooks: [
      "I spent 40 hours on a design that got rejected in 5 minutes.",
      "The design tool everyone is switching to is not the one you think.",
      "Why your design system is failing your team.",
    ],
    exampleCTAs: [
      "What is your biggest design handoff pain?",
      "Which tool would you defend to the end?",
      "What is the most underrated design skill?",
    ],
  },
  "sales-lead": {
    role: "Sales Leader / B2B Sales",
    industry: "Sales / B2B",
    tone: "confident, results-oriented, slightly aggressive, authentic",
    expertise: ["pipeline management", "closing", "negotiation", "CRM", "sales enablement"],
    painPoints: ["lead quality", "long sales cycles", "price objections", "competition", "quota pressure"],
    contentAngles: ["win stories", "loss lessons", "technique breakdowns", "market insights", "career advice"],
    vocabulary: ["pipeline", "forecast", "close rate", "win rate", "quota", "ARR", "MRR", "deal velocity", "champion", "economic buyer"],
    avoidWords: ["leverage", "delve", "foster", "navigate", "synergy"],
    exampleHooks: [
      "I lost a $500K deal because I asked one wrong question.",
      "The sales tactic that works in Pakistan but fails globally.",
      "Why your CRM is lying to you about your pipeline.",
    ],
    exampleCTAs: [
      "What is your best closing technique?",
      "Share a deal you lost and what you learned.",
      "What is your biggest pipeline challenge?",
    ],
  },
}

export function getRoleProfile(role: string): RoleProfile {
  return ROLE_PROFILES[role] || ROLE_PROFILES["ceo-founder"]
}

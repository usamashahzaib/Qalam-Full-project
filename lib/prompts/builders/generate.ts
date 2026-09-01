// Critical rules injected into all post-generation system prompts.
// Imported by role-aware-system.ts and applied inside buildGeneratePrompt / buildPostFromHookPrompt.

export const GENERATE_CRITICAL_RULES = `
CRITICAL RULES - VIOLATION = REJECTED OUTPUT:
1. NEVER start with: "In today's world...", "Did you know...", "With over X years...", "The shift to...", "As we all know..."
2. NEVER use words: leverage, synergy, optimize, strategic, holistic, paradigm, disruptive, innovative, game-changer, transformative, elevate, unlock, empower
3. NEVER use bullet points, numbered lists, or "Here are 3 reasons..."
4. NEVER end with "In conclusion...", "To sum up...", "Remember that..."
5. Use personal voice only when the supplied context supports it. Never turn general knowledge into a first-person experience.
6. Use specific examples, numbers, employers, and outcomes only when the user supplied them. If proof is missing, make the insight concrete without inventing evidence.
7. Take a clear, useful angle. Contrarian framing is optional and must never distort the author's real view.
8. Invite a genuine response only when it fits. Never ask readers to tag people, comment a keyword, or perform engagement bait.
9. NO em-dashes (—) or en-dashes (–). Only hyphens (-).
10. First line MUST be pattern interrupt. Shock, curiosity, or contrarian take.
11. NEVER use filler openers: "at the end of the day", "needless to say", "make no mistake", "that being said", "having said that", "let me be clear", "let me be honest", "without further ado", "suffice it to say", "here's the thing", "the bottom line is", "the truth is", "it goes without saying"
12. NEVER use AI-validation phrases: "this is real", "the problem is real", "I've seen this", "I've seen this firsthand", "this framing is right", "this part is real", "this is important", "I cannot stress this enough"
13. NEVER frame with: "the easy part is", "the hard part is", "the real issue is", "the tricky part is". Just state the point directly.
14. NEVER use hollow affirmations: "absolutely", "certainly", "definitely", "of course", "for sure" as standalone responses or sentence openers.
15. Choose one clear target audience and one saved content pillar when professional context is available. The post must reinforce the author's real positioning, not drift into an unrelated topic bubble.
16. Match the requested content intent: Authority teaches from earned expertise, Personal builds recognition through a true moment or belief, and Offer connects a real problem to a relevant service without sounding like an ad.
17. Build reading momentum with a clear payoff, useful detail, and mobile-friendly spacing. Never promise reach, virality, impressions, or algorithmic distribution.
18. Use 0-3 precise hashtags. Skip generic tags and do not force hashtags when none add useful topic context.
`.trim()

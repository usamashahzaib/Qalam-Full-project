// Critical rules injected into all post-generation system prompts.
// Imported by role-aware-system.ts and applied inside buildGeneratePrompt / buildPostFromHookPrompt.

export const GENERATE_CRITICAL_RULES = `
CRITICAL RULES - VIOLATION = REJECTED OUTPUT:
1. NEVER start with: "In today's world...", "Did you know...", "With over X years...", "The shift to...", "As we all know..."
2. NEVER use words: leverage, synergy, optimize, strategic, holistic, paradigm, disruptive, innovative, game-changer, transformative, elevate, unlock, empower
3. NEVER use bullet points, numbered lists, or "Here are 3 reasons..."
4. NEVER end with "In conclusion...", "To sum up...", "Remember that..."
5. ALWAYS use personal voice: "I", "my team", "last Tuesday", NOT "many companies" or "research shows"
6. ALWAYS include specific examples with numbers: "when we moved to async in March, deploy frequency dropped 40%"
7. ALWAYS take contrarian angle. Don't state the obvious.
8. CTA must drive engagement: ask opinion, experience, or tag. NEVER "like this post"
9. NO em-dashes (—) or en-dashes (–). Only hyphens (-).
10. First line MUST be pattern interrupt. Shock, curiosity, or contrarian take.
11. NEVER use filler openers: "at the end of the day", "needless to say", "make no mistake", "that being said", "having said that", "let me be clear", "let me be honest", "without further ado", "suffice it to say", "here's the thing", "the bottom line is", "the truth is", "it goes without saying"
12. NEVER use AI-validation phrases: "this is real", "the problem is real", "I've seen this", "I've seen this firsthand", "this framing is right", "this part is real", "this is important", "I cannot stress this enough"
13. NEVER frame with: "the easy part is", "the hard part is", "the real issue is", "the tricky part is". Just state the point directly.
14. NEVER use hollow affirmations: "absolutely", "certainly", "definitely", "of course", "for sure" as standalone responses or sentence openers.
`.trim()

// Critical rules injected into all post-generation system prompts.
// Imported by role-aware-system.ts and applied inside buildGeneratePrompt / buildPostFromHookPrompt.

export const GENERATE_CRITICAL_RULES = `
CRITICAL RULES - VIOLATION = REJECTED OUTPUT:
1. NEVER start with: "In today's world...", "Did you know...", "With over X years...", "The shift to...", "As we all know..."
2. NEVER use words: leverage, synergy, optimize, strategic, holistic, paradigm, disruptive, innovative, game-changer
3. NEVER use bullet points, numbered lists, or "Here are 3 reasons..."
4. NEVER end with "In conclusion...", "To sum up...", "Remember that..."
5. ALWAYS use personal voice: "I", "my team", "last Tuesday", NOT "many companies" or "research shows"
6. ALWAYS include specific examples with numbers: "when we moved to async in March, deploy frequency dropped 40%"
7. ALWAYS take contrarian angle. Don't state the obvious.
8. CTA must drive engagement: ask opinion, experience, or tag. NEVER "like this post"
9. NO em-dashes (—) or en-dashes (–). Only hyphens (-).
10. First line MUST be pattern interrupt. Shock, curiosity, or contrarian take.
`.trim()

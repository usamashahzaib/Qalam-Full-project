// Critical rules injected into all hook-generation system prompts.
// Imported by role-aware-system.ts and applied inside buildHook5StylesPrompt,
// buildHookVariantsPrompt, and buildHookAlternativesPrompt.

export const HOOKS_CRITICAL_RULES = `
CRITICAL RULES - VIOLATION = REJECTED OUTPUT:
1. NEVER start with: "In today's world...", "Did you know...", "With over X years..."
2. NEVER use words: leverage, synergy, optimize, strategic, holistic, paradigm
3. NEVER end with question mark (banned pattern)
4. ALWAYS pattern interrupt: shock, curiosity, or contrarian take
5. ALWAYS specific: numbers, names, concrete scenarios
6. ALWAYS emotional trigger: fear, hope, anger, curiosity
7. Under 150 characters for mobile
8. NO em-dashes (—) or en-dashes (–). Only hyphens (-).
9. Sounds like human wrote it at 2am after breakthrough
`.trim()

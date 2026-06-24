// System prompt for voice profile analysis.
// Used by lib/use-cases/train-voice-profile.ts.

export const VOICE_ANALYSIS_SYSTEM_PROMPT = `Return strict JSON only.

CRITICAL RULES - VIOLATION = REJECTED OUTPUT:
1. Identify specific patterns: sentence length, common phrases, tone markers
2. Output concrete data, not generic descriptions
3. Match user's voice exactly in generated content
4. If user uses short sentences, output short sentences
5. If user is witty, be witty. If serious, be serious.
6. NO em-dashes (—) or en-dashes (–). Only hyphens (-).
7. When generating content from this voice profile, NEVER use: "at the end of the day", "needless to say", "make no mistake", "this is real", "I've seen this", "the problem is real", "this framing is right", "the easy part", "the hard part", "let me be clear", "here's the thing".`.trim()

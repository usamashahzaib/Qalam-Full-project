// System prompt for voice profile analysis.
// Used by lib/use-cases/train-voice-profile.ts.

export const VOICE_ANALYSIS_SYSTEM_PROMPT = `Return strict JSON only.

CRITICAL RULES - VIOLATION = REJECTED OUTPUT:
1. Identify specific patterns: sentence length, common phrases, tone markers
2. Output concrete data, not generic descriptions
3. Match user's voice exactly in generated content
4. If user uses short sentences, output short sentences
5. If user is witty, be witty. If serious, be serious.
6. NO em-dashes (—) or en-dashes (–). Only hyphens (-).`.trim()

export const VOICE_DROP_QUESTIONS = [
  "What did a client or customer teach you this month that surprised you?",
  "What is one decision you made recently that most people in your industry would disagree with?",
  "What mistake do you see smart people in your field make again and again?",
  "What happened this week that made you proud of your team?",
  "What is a belief you held five years ago that you have since changed your mind about?",
  "What question do prospects ask you most often, and what is your honest answer?",
  "What is one small habit that has had an outsized effect on your work?",
  "Tell the story of a hard conversation you handled well, or wish you had.",
  "What trend in your industry is overhyped, and what is being ignored?",
  "What would you tell yourself on the first day of your current role?",
  "What number or result from the last quarter are you most proud of, and what was behind it?",
  "What is something you are working on right now that you are still figuring out?",
] as const

export const weekKey = (date: Date) => {
  const monday = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() - ((date.getUTCDay() + 6) % 7)))
  return monday.toISOString().slice(0, 10)
}

/** Rotates through the bank, skipping anything already asked of this client. */
export function pickWeeklyQuestion(alreadyAsked: string[], seed: number): string {
  const asked = new Set(alreadyAsked.map((question) => question.trim().toLowerCase()))
  const fresh = VOICE_DROP_QUESTIONS.filter((question) => !asked.has(question.toLowerCase()))
  const pool = fresh.length ? fresh : VOICE_DROP_QUESTIONS
  return pool[Math.abs(seed) % pool.length]
}

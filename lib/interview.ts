// The writer asks a few questions before it writes. The answers are the only first-hand
// material the model gets, so they travel with every generation call as `story`.

export type InterviewAnswer = { question: string; answer: string }

export const MAX_INTERVIEW_QUESTIONS = 3
export const MAX_STORY_CHARS = 2500

/** Answered questions only, as a plain Q/A transcript. Empty when nothing was answered. */
export function formatInterview(answers: InterviewAnswer[]): string {
  return answers
    .filter((item) => item.answer.trim())
    .map((item) => `Q: ${item.question.trim()}\nA: ${item.answer.trim()}`)
    .join("\n\n")
    .slice(0, MAX_STORY_CHARS)
}

export function cleanStory(value: unknown): string {
  return typeof value === "string" ? value.trim().slice(0, MAX_STORY_CHARS) : ""
}

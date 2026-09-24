/**
 * Instant, local, zero-cost structural read of a resume.
 *
 * This is deliberately NOT the AI review. It only reports things that can be
 * observed directly in the text, so it can run in the browser on every
 * keystroke without a network call, a rate limit, or a failure mode. The full
 * recruiter/ATS review still lives behind /api/free-tools/ats-resume-checker.
 *
 * Everything here is an observation, never a prediction. If a signal cannot be
 * observed with confidence it is reported as unknown rather than guessed.
 */

export type SignalState = "pass" | "warn" | "fail"

export type ResumeSignal = {
  key: string
  label: string
  state: SignalState
  /** Short observed fact, e.g. "412 words" - never advice. */
  detail: string
}

export type ResumeSignals = {
  words: number
  signals: ResumeSignal[]
  /** Count of signals in each state, for the summary line. */
  passed: number
  total: number
}

/** sessionStorage key used to hand a resume from the homepage to the full checker. */
export const RESUME_HANDOFF_KEY = "qalam_resume_handoff"

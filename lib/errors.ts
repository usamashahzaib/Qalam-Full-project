export type QalamErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "PLAN_LIMIT_EXCEEDED"
  | "VALIDATION_ERROR"
  | "AI_UNAVAILABLE"
  | "LINKEDIN_ERROR"
  | "PAYMENT_ERROR"
  | "INTERNAL_ERROR"

export interface QalamError {
  code: QalamErrorCode
  message: string        // internal — safe to log
  userMessage?: string   // safe to display in UI
  cause?: unknown
}

export type Result<T, E = QalamError> =
  | { ok: true; data: T }
  | { ok: false; error: E }

export function ok<T>(data: T): Result<T> {
  return { ok: true, data }
}

export function err(error: QalamError): Result<never, QalamError> {
  return { ok: false, error }
}

const STATUS_MAP: Record<QalamErrorCode, number> = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  PLAN_LIMIT_EXCEEDED: 429,
  VALIDATION_ERROR: 400,
  AI_UNAVAILABLE: 503,
  LINKEDIN_ERROR: 502,
  PAYMENT_ERROR: 400,
  INTERNAL_ERROR: 500,
}

export function errorToStatus(code: QalamErrorCode): number {
  return STATUS_MAP[code]
}

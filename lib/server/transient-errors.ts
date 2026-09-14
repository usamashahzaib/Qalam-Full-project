// Errors that mean "the database could not be reached", not "this user is not
// signed in". They must answer 503 so clients retry, never 401, which signs the
// user out.
export const TRANSIENT_ERROR_CODES = new Set([
  "session_check_unavailable",
  "failed_to_lookup_external_user",
  "failed_to_lookup_email_user",
  "failed_to_lookup_workspace",
])

export const isTransientError = (error: unknown) =>
  error instanceof Error && TRANSIENT_ERROR_CODES.has(error.message)

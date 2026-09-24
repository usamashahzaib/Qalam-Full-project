// Decision rules for scripts/check-migrations-applied.mjs, kept in their own
// module so they can be unit tested without running the check itself.

// A definite answer that the database is behind the code. Unlike "could not
// check" (no credentials, network failure), this always fails the build: the
// deploy would ship code that queries tables, columns or functions that do
// not exist yet.
export class UnappliedMigrationsError extends Error {
  constructor(missing) {
    super(`Unapplied Supabase migrations: ${missing.join(", ")}. Apply them before deploying.`)
    this.name = "UnappliedMigrationsError"
    this.missing = missing
  }
}

/** Exit code for a failed check: unapplied migrations always block; an unanswerable check blocks only when required. */
export function exitCodeFor(error, isRequired) {
  if (error instanceof UnappliedMigrationsError) return 1
  return isRequired ? 1 : 0
}

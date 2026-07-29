# Supabase migrations

## Active chain

Only SQL files in `supabase/migrations` are executable migrations.

- `20260723000000_production_baseline.sql`: empty-project baseline
- `20260723000100` through `20260723002400`: ordered schema deltas
- `20260723132149` onward: production fixes
- `20260724124428_create_missing_operational_tables.sql`: restores active app tables
- `20260724130009_harden_legacy_function_paths.sql`: closes legacy function and schema grants

The local and linked production migration ledgers were reconciled on 2026-07-24.

## Archived chain

Files in `supabase/legacy_migrations` are audit evidence only. Never execute them.

`legacy_migrations/schema.sql` is the archived pre-baseline schema. Reconstruct
the active schema only from `supabase/migrations`.

Reasons:

- duplicate `0002` version
- missing base schema dependencies
- references to removed tables
- invalid UUID and TEXT comparisons
- non-idempotent policies and functions
- unsafe legacy GDPR function
- invalid combined migration filename

## Normal deployment

```powershell
npx supabase migration list --linked
npx supabase db push --linked --dry-run
npx supabase db push --linked
npx supabase db lint --linked --schema public
npx supabase db advisors --linked --type security
```

Expected before a new migration:

- local and remote versions match
- dry run reports the remote database is up to date
- DB lint has no schema errors
- security advisor has no warnings

## New migrations

```powershell
npx supabase migration new short_change_name
```

Edit only the generated timestamped SQL file. Test with a local Supabase stack before production push.

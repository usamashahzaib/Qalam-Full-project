# Agency Hub readiness audit

Date: 2026-09-03

## End-user model

An Agency owner can create up to five isolated client workspaces in addition to their personal workspace. Each client has its own name, primary contact, brand color, voice profile, content, approvals, competitor research history, analytics, and monthly workspace usage.

The five Agency seats are unique people across the Agency owner's client workspaces. The owner consumes one seat. A manager assigned to several client workspaces consumes one seat, not one seat per assignment.

## Roles

| Role | Intended access |
| --- | --- |
| Agency owner | Creates and archives client workspaces, edits client details, and controls every workspace team. |
| Workspace manager | Manages one or more assigned client workspaces, including team roles, branding, approvals, and publishing. Cannot create client workspaces unless their own account has Agency. |
| Editor | Creates, edits, schedules, and publishes content in assigned workspaces. |
| Client reviewer | Reviews approval requests without edit or publishing authority. |
| Viewer | Read-only workspace access. |
| Platform administrator | Operates Qalam's protected admin area. This is separate from client workspace roles. |

## Implemented and verified

- Explicit personal and client workspace types, with safe migration of existing Agency clients.
- Atomic five-client limit, including protection from concurrent creation requests.
- Client name and primary contact create/edit flow.
- Workspace switcher for owners and invited teammates.
- Manager assignment, role changes, member removal, pending invite resend, and invite cancellation.
- Unique five-seat enforcement across all client workspaces.
- Owner membership protection so a manager cannot demote or remove the Agency owner.
- Archive and restore without using archive as a way to bypass the paid workspace limit.
- Per-client branding and voice isolation.
- Per-client dashboard, library links, analytics, approvals, comments, competitor research, and generation context.
- Agency-owner billing and usage for delegated managers, while preserving the acting teammate as the content author.
- Per-client Agency draft and carousel limits with account-level outer limits.
- Approval notification links return to the correct client workspace.
- Competitor analysis history is stored and loaded by workspace.

## Verification evidence

- TypeScript: passed.
- Automated tests: 83 files and 549 tests passed.
- Lint: passed with no warnings.
- RLS audit: passed with no findings.
- Production compilation: passed, including all 235 generated pages.
- Diff validation: passed.

## Required before production use

Apply `supabase/migrations/20260902090000_agency_workspace_ownership.sql` to the configured Supabase project. The normal release build intentionally remains blocked until the migration is recorded in `supabase_migrations.schema_migrations`.

After deployment, run one authenticated smoke test with an Agency owner and a second user:

1. Create five named clients and confirm a sixth is rejected.
2. Invite the second user as Workspace manager to two clients and confirm it consumes one Agency seat.
3. Switch between those clients and confirm dashboard, voice, drafts, analytics, research, and approvals never cross between them.
4. Archive and restore one client.
5. Cancel one pending invitation and confirm its seat is released.

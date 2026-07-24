-- M-05: agency_clients holds customer PII (client_name, client_email,
-- agency_email) with no FK to users and is excluded from delete_user_data(),
-- so account deletion leaves personal data behind (GDPR violation).
--
-- Confirmed dead: no application code reads/writes this table (Agency Hub
-- runs on workspaces/workspace_members, see app/api/agency/clients/route.ts)
-- and the live table holds 0 rows. Drop it instead of wiring it into
-- delete_user_data(), since there is nothing left to clean up.

DROP TABLE IF EXISTS public.agency_clients;

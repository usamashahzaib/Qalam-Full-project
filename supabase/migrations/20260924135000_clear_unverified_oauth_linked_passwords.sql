-- Pre-hijack cleanup. Before lib/server/identity.ts gained its takeover
-- guard, a LinkedIn sign-in could link onto an unverified password account
-- someone else had registered for the same address, and the stranger's
-- password survived the link. Those rows are exactly: linked to a provider
-- subject (external_user_id set to something other than the row's own id,
-- which is what a password session self-links to), still unverified, and
-- still holding a password. The provider has since proved the owner controls
-- the address, so drop the stranger's password, mark the address verified,
-- and bump password_version so nothing issued against it stays valid.
update public.users
set
  password_hash = null,
  email_verified = true,
  password_version = coalesce(password_version, 0) + 1,
  updated_at = now()
where external_user_id is not null
  and external_user_id <> id::text
  and email_verified = false
  and password_hash is not null;

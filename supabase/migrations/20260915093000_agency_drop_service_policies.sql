-- service_role bypasses RLS, so a policy "for service_role" grants nothing it
-- needs and only widens what anon/authenticated could reach if a grant were
-- ever restored. Service-only tables in this project carry RLS, revoked grants,
-- and no policies (see scripts/check-rls.mjs).
do $$
declare
  t text;
begin
  foreach t in array array[
    'workspace_handoff_links',
    'voice_passport_entries',
    'client_voice_drops',
    'client_proof_reports',
    'pitch_previews',
    'agency_job_claims'
  ] loop
    execute format('drop policy if exists %I on public.%I', t || '_service_only', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end;
$$;

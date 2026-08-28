-- Keep one canonical voice profile per workspace before enforcing the upsert key.
-- The newest profile wins, while nullable fields are filled from older records.
with ranked as (
  select
    id,
    workspace_id,
    row_number() over (
      partition by workspace_id
      order by updated_at desc nulls last, id desc
    ) as row_number
  from public.voice_profiles
  where workspace_id is not null
)
update public.voice_profiles winner
set
  name = coalesce(winner.name, (select donor.name from public.voice_profiles donor where donor.workspace_id = winner.workspace_id and donor.name is not null order by donor.updated_at desc nulls last, donor.id desc limit 1)),
  title = coalesce(winner.title, (select donor.title from public.voice_profiles donor where donor.workspace_id = winner.workspace_id and donor.title is not null order by donor.updated_at desc nulls last, donor.id desc limit 1)),
  industry = coalesce(winner.industry, (select donor.industry from public.voice_profiles donor where donor.workspace_id = winner.workspace_id and donor.industry is not null order by donor.updated_at desc nulls last, donor.id desc limit 1)),
  goals = coalesce(winner.goals, (select donor.goals from public.voice_profiles donor where donor.workspace_id = winner.workspace_id and donor.goals is not null order by donor.updated_at desc nulls last, donor.id desc limit 1)),
  sample_posts = coalesce(winner.sample_posts, (select donor.sample_posts from public.voice_profiles donor where donor.workspace_id = winner.workspace_id and donor.sample_posts is not null order by donor.updated_at desc nulls last, donor.id desc limit 1)),
  example_posts = coalesce(winner.example_posts, (select donor.example_posts from public.voice_profiles donor where donor.workspace_id = winner.workspace_id and donor.example_posts is not null order by donor.updated_at desc nulls last, donor.id desc limit 1)),
  brand_tone = coalesce(winner.brand_tone, (select donor.brand_tone from public.voice_profiles donor where donor.workspace_id = winner.workspace_id and donor.brand_tone is not null order by donor.updated_at desc nulls last, donor.id desc limit 1)),
  characteristics = coalesce(winner.characteristics, (select donor.characteristics from public.voice_profiles donor where donor.workspace_id = winner.workspace_id and donor.characteristics is not null order by donor.updated_at desc nulls last, donor.id desc limit 1)),
  voice_fingerprint = coalesce(winner.voice_fingerprint, (select donor.voice_fingerprint from public.voice_profiles donor where donor.workspace_id = winner.workspace_id and donor.voice_fingerprint is not null order by donor.updated_at desc nulls last, donor.id desc limit 1)),
  linkedin_url = coalesce(winner.linkedin_url, (select donor.linkedin_url from public.voice_profiles donor where donor.workspace_id = winner.workspace_id and donor.linkedin_url is not null order by donor.updated_at desc nulls last, donor.id desc limit 1)),
  updated_at = now()
from ranked
where winner.id = ranked.id
  and ranked.row_number = 1;

delete from public.voice_profiles profile
using (
  select id
  from (
    select
      id,
      row_number() over (
        partition by workspace_id
        order by updated_at desc nulls last, id desc
      ) as row_number
    from public.voice_profiles
    where workspace_id is not null
  ) ranked
  where row_number > 1
) duplicates
where profile.id = duplicates.id;

create unique index if not exists voice_profiles_workspace_id_unique_idx
  on public.voice_profiles (workspace_id)
  where workspace_id is not null;

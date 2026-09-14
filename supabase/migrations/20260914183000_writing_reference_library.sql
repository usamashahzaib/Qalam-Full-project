-- Permissioned, editor-reviewed material only. Never populated from client workspaces.
create extension if not exists vector;
set search_path = public, extensions;

create table public.writing_references (
  id uuid primary key default gen_random_uuid(),
  author_key text not null,
  source text not null,
  permission_evidence text not null,
  permission_expires_at timestamptz,
  reference_allowed boolean not null default false,
  training_allowed boolean not null default false,
  revoked_at timestamptz,
  language text not null,
  country text not null default '',
  industry text not null,
  audience text not null,
  purpose text not null,
  brief text not null,
  facts text not null,
  original_draft text not null,
  final_text text not null,
  editor_notes text not null,
  content_hash text not null unique,
  original_hash text not null unique,
  split text not null check (split in ('train', 'test')),
  reviewed_by text not null,
  created_at timestamptz not null default now(),
  embedding vector(768),
  embedding_model text not null default 'gemini-embedding-001',
  check (reference_allowed or training_allowed),
  check (char_length(final_text) between 30 and 5000)
);

alter table public.writing_references enable row level security;
revoke all on public.writing_references from anon, authenticated;
grant select, insert, update, delete on public.writing_references to service_role;

-- A final version cannot re-enter as another author's original draft either.
-- Lock both fingerprints in a stable order to handle concurrent imports.
create function public.guard_writing_reference_duplicates() returns trigger
language plpgsql security invoker set search_path = public
as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(least(new.content_hash, new.original_hash), 0));
  perform pg_advisory_xact_lock(hashtextextended(greatest(new.content_hash, new.original_hash), 0));
  if exists (
    select 1 from public.writing_references r where r.id <> new.id
      and (r.content_hash in (new.content_hash, new.original_hash)
        or r.original_hash in (new.content_hash, new.original_hash))
  ) then
    raise unique_violation using message = 'Writing already exists in the library';
  end if;
  return new;
end;
$$;
revoke all on function public.guard_writing_reference_duplicates() from public, anon, authenticated;
create trigger writing_reference_duplicate_guard before insert or update of content_hash, original_hash
  on public.writing_references for each row execute function public.guard_writing_reference_duplicates();

create index writing_references_embedding_idx on public.writing_references
  using hnsw (embedding vector_cosine_ops)
  where reference_allowed and revoked_at is null and split = 'train';

create function public.match_writing_references(
  query_embedding vector(768), requested_language text default null, match_count integer default 3
) returns table (id uuid, final_text text, similarity double precision)
language sql stable security invoker
set search_path = public, extensions
as $$
  select r.id, r.final_text, 1 - (r.embedding <=> query_embedding)
  from public.writing_references r
  where r.reference_allowed and r.revoked_at is null and r.split = 'train'
    and (r.permission_expires_at is null or r.permission_expires_at > now())
    and r.embedding_model = 'gemini-embedding-001'
    and r.embedding is not null
    and (requested_language is null or r.language = requested_language)
    and 1 - (r.embedding <=> query_embedding) >= 0.55
  order by r.embedding <=> query_embedding
  limit greatest(0, least(match_count, 3));
$$;
revoke all on function public.match_writing_references(vector, text, integer) from public, anon, authenticated;
grant execute on function public.match_writing_references(vector, text, integer) to service_role;

-- Existing installations may have skipped the optional vector columns.
alter table public.voice_examples add column if not exists embedding vector(768);

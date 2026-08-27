alter table public.approvals
  add column if not exists review_token_expires_at timestamptz;

update public.approvals
set review_token_expires_at = least(created_at + interval '7 days', now())
where review_token_hash is not null
  and review_token_expires_at is null;

comment on column public.approvals.review_token_expires_at is
  'Hard expiry for the external approval capability token. Tokens are also cleared after review.';

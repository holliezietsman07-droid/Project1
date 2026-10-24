-- Founder-only AI Studio usage ledger. Prompts and generated content are deliberately not stored here.
create table if not exists public.hka_ai_usage (
  id uuid primary key default gen_random_uuid(),
  founder_id uuid not null references public.hka_profiles(id) on delete restrict,
  mode text not null check (mode in ('mock','live')),
  model text not null,
  material_type text not null,
  status text not null check (status in ('started','completed','failed')),
  input_chars integer not null default 0 check (input_chars >= 0),
  output_chars integer not null default 0 check (output_chars >= 0),
  input_tokens integer check (input_tokens is null or input_tokens >= 0),
  output_tokens integer check (output_tokens is null or output_tokens >= 0),
  created_at timestamptz not null default now()
);

alter table public.hka_ai_usage enable row level security;
revoke all on public.hka_ai_usage from anon, authenticated;
grant select on public.hka_ai_usage to authenticated;

drop policy if exists ai_usage_founder_read on public.hka_ai_usage;
create policy ai_usage_founder_read on public.hka_ai_usage
for select to authenticated using (public.hka_admin());

create index if not exists hka_ai_usage_founder_created
on public.hka_ai_usage(founder_id, created_at desc);

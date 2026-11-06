-- Configurable horse profile limits; no billing or price changes.
begin;

create table public.hka_horse_profile_limits (
  id uuid primary key default gen_random_uuid(),
  membership_tier text not null unique check (membership_tier in ('free','basic','premium','stable_yard')),
  display_name text not null check (length(trim(display_name)) between 1 and 100),
  horse_profile_limit integer not null,
  minimum_horses integer not null default 1 check (minimum_horses between 1 and 1000),
  offering_active boolean not null default true,
  sort_order integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (horse_profile_limit between minimum_horses and 1000)
);

insert into public.hka_horse_profile_limits
  (membership_tier,display_name,horse_profile_limit,minimum_horses,offering_active,sort_order)
values
  ('free','Free',1,1,true,1),
  ('basic','Basic',5,1,true,2),
  ('premium','Premium',30,1,true,3),
  ('stable_yard','Stable / Yard Management',100,31,false,4)
on conflict (membership_tier) do nothing;

alter table public.hka_horse_profile_limits enable row level security;

create policy horse_profile_limits_read on public.hka_horse_profile_limits
  for select to authenticated
  using (public.hka_active() or public.hka_admin());

create policy horse_profile_limits_admin_update on public.hka_horse_profile_limits
  for update to authenticated
  using (public.hka_admin())
  with check (public.hka_admin());

revoke all on public.hka_horse_profile_limits from anon,authenticated;
grant select on public.hka_horse_profile_limits to authenticated;
grant update(horse_profile_limit,updated_at) on public.hka_horse_profile_limits to authenticated;

create or replace function public.hka_enforce_horse_limit() returns trigger
language plpgsql security definer set search_path='' as '
declare
  tier text;
  profile_limit integer;
  current_count integer;
begin
  select membership_tier into tier
  from public.hka_profiles
  where id=new.student_id
  for update;

  if tier is null then
    raise exception ''A valid student membership is required.'';
  end if;

  select horse_profile_limit into profile_limit
  from public.hka_horse_profile_limits
  where membership_tier=tier and offering_active;

  if profile_limit is null then
    raise exception ''Horse profile creation is not active for this membership.'';
  end if;

  select count(*) into current_count
  from public.hka_horses
  where student_id=new.student_id;

  if current_count>=profile_limit then
    raise exception ''% membership permits up to % horse profiles.'',initcap(replace(tier,''_'','' '')),profile_limit;
  end if;

  return new;
end';

drop trigger if exists hka_horse_limit on public.hka_horses;
create trigger hka_horse_limit
  before insert on public.hka_horses
  for each row execute function public.hka_enforce_horse_limit();

revoke all on function public.hka_enforce_horse_limit() from public,anon,authenticated;

notify pgrst, 'reload schema';
commit;

-- Multi-role onboarding and secure, revocable student linking.
begin;
create extension if not exists pgcrypto;

create table if not exists public.hka_account_roles (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.hka_profiles(id) on delete cascade,
 purpose text not null check (purpose in ('student','guardian','coach','horse_owner','admin')),
 status text not null default 'requested' check (status in ('requested','authorized','rejected','revoked')),
 is_active boolean not null default false,
 onboarding jsonb not null default '{}'::jsonb check (jsonb_typeof(onboarding)='object'),
 requested_at timestamptz not null default now(),
 approved_at timestamptz,
 approved_by uuid references public.hka_profiles(id),
 unique(user_id,purpose),
 check (not is_active or status='authorized')
);
create unique index if not exists hka_account_roles_one_active on public.hka_account_roles(user_id) where is_active;

insert into public.hka_account_roles(user_id,purpose,status,is_active,approved_at)
select id,case role when 'admin' then 'admin' else role end,'authorized',true,now()
from public.hka_profiles
on conflict(user_id,purpose) do update set status='authorized',is_active=true,approved_at=coalesce(public.hka_account_roles.approved_at,excluded.approved_at);

create table if not exists public.hka_student_link_codes (
 id uuid primary key default gen_random_uuid(),
 student_id uuid not null references public.hka_profiles(id) on delete cascade,
 kind text not null check(kind in ('guardian','coach')),
 code_hash bytea not null unique,
 expires_at timestamptz not null,
 max_uses integer not null default 1 check(max_uses between 1 and 10),
 uses integer not null default 0 check(uses between 0 and max_uses),
 revoked_at timestamptz,
 created_at timestamptz not null default now()
);

create table if not exists public.hka_link_requests (
 id uuid primary key default gen_random_uuid(),
 code_id uuid not null references public.hka_student_link_codes(id) on delete cascade,
 student_id uuid not null references public.hka_profiles(id) on delete cascade,
 claimant_id uuid not null references public.hka_profiles(id) on delete cascade,
 kind text not null check(kind in ('guardian','coach')),
 status text not null default 'pending_founder' check(status in ('pending_founder','awaiting_consent','awaiting_guardian','approved','rejected','revoked')),
 founder_approved_at timestamptz,
 founder_id uuid references public.hka_profiles(id),
 guardian_consented_at timestamptz,
 revoked_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(code_id,claimant_id),
 check(student_id<>claimant_id)
);

create or replace function public.hka_has_purpose(person uuid,purpose_name text)
returns boolean language sql stable security definer set search_path='' as $
 select exists(select 1 from public.hka_account_roles ar where ar.user_id=person and ar.purpose=purpose_name and ar.status='authorized')
$;

create or replace function public.hka_active(person uuid default auth.uid()) returns boolean language sql stable security definer set search_path='' as $
 select exists(select 1 from public.hka_profiles p join auth.users u on u.id=p.id where p.id=person
 and not p.suspended and u.email_confirmed_at is not null
 and (not public.hka_has_purpose(person,'student') or p.birth_date <= (current_date-interval '18 years')::date
 or exists(select 1 from public.hka_guardians g join public.hka_profiles gp on gp.id=g.guardian_id
 join auth.users gu on gu.id=gp.id
 where g.student_id=p.id and g.status='approved' and g.consent_at is not null
 and public.hka_has_purpose(gp.id,'guardian') and not gp.suspended and gu.email_confirmed_at is not null)))
$;

create or replace function public.hka_coaches(person uuid) returns boolean language sql stable security definer set search_path='' as $
 select public.hka_role()='coach' and public.hka_has_purpose(auth.uid(),'coach')
 and exists(select 1 from public.hka_coach_students where coach_id=auth.uid() and student_id=person)
$;

create or replace function public.hka_signup_profile() returns trigger language plpgsql security definer set search_path='' as $
declare
 dob date; display_name text; selected jsonb; item text; initial_role text:='student'; active_purpose text;
begin
 dob:=nullif(new.raw_user_meta_data->>'birth_date','')::date;
 display_name:=trim(coalesce(new.raw_user_meta_data->>'full_name',''));
 selected:=new.raw_user_meta_data->'account_purposes';
 if selected is null or jsonb_typeof(selected)<>'array' then selected:=jsonb_build_array(coalesce(new.raw_user_meta_data->>'account_type','student')); end if;
 if dob is null or dob>current_date or dob<=date '1900-01-01' or char_length(display_name) not between 1 and 100 then raise exception 'A valid name and date of birth are required.'; end if;
 if selected ? 'guardian' and dob>(current_date-interval '18 years')::date then raise exception 'Guardians must be adults.'; end if;
 if selected ? 'guardian' and not (selected ? 'student') and not (selected ? 'horse_owner') then initial_role:='guardian';active_purpose:='guardian';
 elsif selected ? 'student' then active_purpose:='student';
 elsif selected ? 'horse_owner' then active_purpose:='horse_owner';
 end if;
 insert into public.hka_profiles(id,full_name,birth_date,timezone,role)
 values(new.id,display_name,dob,coalesce(nullif(new.raw_user_meta_data->>'timezone',''),'UTC'),initial_role);
 for item in select jsonb_array_elements_text(selected) loop
  if item in ('student','guardian','coach','horse_owner') then
   insert into public.hka_account_roles(user_id,purpose,status,is_active,onboarding,approved_at)
   values(new.id,item,case when item='coach' then 'requested' else 'authorized' end,item=active_purpose,
    coalesce(new.raw_user_meta_data->'onboarding','{}'::jsonb),case when item='coach' then null else now() end)
   on conflict(user_id,purpose) do nothing;
  end if;
 end loop;
 if selected ? 'guardian' and nullif(trim(new.raw_user_meta_data->'onboarding'->>'guardian_code'),'') is not null then
  insert into public.hka_link_requests(code_id,student_id,claimant_id,kind)
  select c.id,c.student_id,new.id,c.kind from public.hka_student_link_codes c where c.kind='guardian' and c.code_hash=digest(upper(trim(new.raw_user_meta_data->'onboarding'->>'guardian_code')),'sha256') and c.revoked_at is null and c.expires_at>now() and c.uses<c.max_uses
  on conflict(code_id,claimant_id) do nothing;
  update public.hka_student_link_codes c set uses=uses+1 where exists(select 1 from public.hka_link_requests r where r.code_id=c.id and r.claimant_id=new.id);
 end if;
 if selected ? 'coach' and nullif(trim(new.raw_user_meta_data->'onboarding'->>'coach_code'),'') is not null then
  insert into public.hka_link_requests(code_id,student_id,claimant_id,kind)
  select c.id,c.student_id,new.id,c.kind from public.hka_student_link_codes c where c.kind='coach' and c.code_hash=digest(upper(trim(new.raw_user_meta_data->'onboarding'->>'coach_code')),'sha256') and c.revoked_at is null and c.expires_at>now() and c.uses<c.max_uses
  on conflict(code_id,claimant_id) do nothing;
  update public.hka_student_link_codes c set uses=uses+1 where exists(select 1 from public.hka_link_requests r where r.code_id=c.id and r.claimant_id=new.id);
 end if;
 return new;
end $;

create or replace function public.hka_request_account_purpose(requested_purpose text,onboarding_data jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path='' as $
declare next_status text;
begin
 if auth.uid() is null then raise exception 'Authentication required.'; end if;
 if requested_purpose not in ('student','guardian','coach','horse_owner') then raise exception 'Invalid account purpose.'; end if;
 if requested_purpose='guardian' and exists(select 1 from public.hka_profiles where id=auth.uid() and birth_date>(current_date-interval '18 years')::date) then raise exception 'Guardians must be adults.'; end if;
 next_status:=case when requested_purpose='coach' then 'requested' else 'authorized' end;
 insert into public.hka_account_roles(user_id,purpose,status,onboarding,approved_at)
 values(auth.uid(),requested_purpose,next_status,coalesce(onboarding_data,'{}'::jsonb),case when next_status='authorized' then now() end)
 on conflict(user_id,purpose) do update set status=case when public.hka_account_roles.status='authorized' then 'authorized' else excluded.status end,onboarding=excluded.onboarding,requested_at=now();
end $;

create or replace function public.hka_review_account_purpose(member_id uuid,requested_purpose text,approve boolean)
returns void language plpgsql security definer set search_path='' as $
begin
 if not public.hka_admin() then raise exception 'Founder access required.'; end if;
 if requested_purpose<>'coach' then raise exception 'Only privileged coach requests require founder review.'; end if;
 update public.hka_account_roles set status=case when approve then 'authorized' else 'rejected' end,approved_at=case when approve then now() else null end,approved_by=auth.uid()
 where user_id=member_id and purpose=requested_purpose and status='requested';
 if not found then raise exception 'Pending account purpose not found.'; end if;
 insert into public.hka_audit(actor_id,target_id,action) values(auth.uid(),member_id,'Coach purpose reviewed: '||approve::text);
end $;

create or replace function public.hka_switch_dashboard(requested_purpose text)
returns text language plpgsql security definer set search_path='' as $
declare mapped_role text; target_path text;
begin
 if not public.hka_has_purpose(auth.uid(),requested_purpose) then raise exception 'That dashboard is not authorised.'; end if;
 mapped_role:=case requested_purpose when 'guardian' then 'guardian' when 'coach' then 'coach' when 'admin' then 'admin' else 'student' end;
 target_path:=case requested_purpose when 'guardian' then '/dashboard/parent' when 'coach' then '/dashboard/coach' when 'admin' then '/dashboard/admin' when 'horse_owner' then '/dashboard/student?section=horses' else '/dashboard/student' end;
 update public.hka_account_roles set is_active=false where user_id=auth.uid();
 update public.hka_account_roles set is_active=true where user_id=auth.uid() and purpose=requested_purpose and status='authorized';
 update public.hka_profiles set role=mapped_role where id=auth.uid();
 return target_path;
end $;

create or replace function public.hka_create_student_link_code(link_kind text)
returns text language plpgsql security definer set search_path='' as $
declare plain_code text;
begin
 if link_kind not in ('guardian','coach') then raise exception 'Invalid link type.'; end if;
 if not public.hka_has_purpose(auth.uid(),'student') then raise exception 'Student purpose required.'; end if;
 plain_code:=upper(substr(encode(gen_random_bytes(10),'hex'),1,12));
 insert into public.hka_student_link_codes(student_id,kind,code_hash,expires_at)
 values(auth.uid(),link_kind,digest(plain_code,'sha256'),now()+interval '72 hours');
 return plain_code;
end $;

create or replace function public.hka_redeem_student_link_code(invitation_code text)
returns uuid language plpgsql security definer set search_path='' as $
declare found public.hka_student_link_codes; request_id uuid;
begin
 select * into found from public.hka_student_link_codes where code_hash=digest(upper(trim(invitation_code)),'sha256') and revoked_at is null and expires_at>now() and uses<max_uses for update;
 if found.id is null then raise exception 'Invitation code is invalid or expired.'; end if;
 if found.student_id=auth.uid() then raise exception 'You cannot redeem your own code.'; end if;
 if found.kind='guardian' and not public.hka_has_purpose(auth.uid(),'guardian') then raise exception 'An authorised parent or guardian purpose is required.'; end if;
 if found.kind='coach' and not exists(select 1 from public.hka_account_roles where user_id=auth.uid() and purpose='coach' and status in ('requested','authorized')) then raise exception 'A coach application is required.'; end if;
 if found.kind='guardian' and exists(select 1 from public.hka_profiles where id=auth.uid() and birth_date>(current_date-interval '18 years')::date) then raise exception 'Guardians must be adults.'; end if;
 insert into public.hka_link_requests(code_id,student_id,claimant_id,kind)
 values(found.id,found.student_id,auth.uid(),found.kind) returning id into request_id;
 update public.hka_student_link_codes set uses=uses+1 where id=found.id;
 return request_id;
end $;

create or replace function public.hka_review_student_link(request_id uuid,approve boolean)
returns void language plpgsql security definer set search_path='' as $
declare request_row public.hka_link_requests; student_minor boolean;
begin
 if not public.hka_admin() then raise exception 'Founder access required.'; end if;
 select * into request_row from public.hka_link_requests where id=request_id and status='pending_founder' for update;
 if request_row.id is null then raise exception 'Pending request not found.'; end if;
 if not approve then update public.hka_link_requests set status='rejected',founder_id=auth.uid(),updated_at=now() where id=request_id; return; end if;
 if request_row.kind='guardian' then
  insert into public.hka_guardians(student_id,guardian_id,child_label,status,verified_by,consent_at)
  select request_row.student_id,request_row.claimant_id,p.full_name,'pending',auth.uid(),null from public.hka_profiles p where p.id=request_row.student_id
  on conflict(student_id,guardian_id) do update set status='pending',verified_by=auth.uid(),consent_at=null;
  update public.hka_link_requests set status='awaiting_consent',founder_approved_at=now(),founder_id=auth.uid(),updated_at=now() where id=request_id;
 else
  update public.hka_account_roles set status='authorized',approved_at=now(),approved_by=auth.uid() where user_id=request_row.claimant_id and purpose='coach';
  select birth_date>(current_date-interval '18 years')::date into student_minor from public.hka_profiles where id=request_row.student_id;
  if student_minor then
   update public.hka_link_requests set status='awaiting_guardian',founder_approved_at=now(),founder_id=auth.uid(),updated_at=now() where id=request_id;
  else
   insert into public.hka_coach_students(coach_id,student_id) values(request_row.claimant_id,request_row.student_id) on conflict do nothing;
   update public.hka_link_requests set status='approved',founder_approved_at=now(),founder_id=auth.uid(),updated_at=now() where id=request_id;
  end if;
 end if;
 insert into public.hka_audit(actor_id,target_id,action) values(auth.uid(),request_row.student_id,'Student link reviewed: '||request_row.kind||' approved');
end $;

create or replace function public.hka_guardian_link_decision(request_id uuid,approve boolean)
returns void language plpgsql security definer set search_path='' as $
declare request_row public.hka_link_requests;
begin
 select * into request_row from public.hka_link_requests where id=request_id and claimant_id=auth.uid() and kind='guardian' and status='awaiting_consent' for update;
 if request_row.id is null then raise exception 'Verified parent link not found.'; end if;
 update public.hka_guardians set status=case when approve then 'approved' else 'revoked' end,consent_at=case when approve then now() else null end
 where student_id=request_row.student_id and guardian_id=auth.uid();
 update public.hka_link_requests set status=case when approve then 'approved' else 'rejected' end,guardian_consented_at=case when approve then now() else null end,updated_at=now() where id=request_id;
end $;

create or replace function public.hka_guardian_coach_consent(request_id uuid,approve boolean)
returns void language plpgsql security definer set search_path='' as $
declare request_row public.hka_link_requests;
begin
 select * into request_row from public.hka_link_requests where id=request_id and kind='coach' and status='awaiting_guardian' and exists(
  select 1 from public.hka_guardians g where g.student_id=public.hka_link_requests.student_id and g.guardian_id=auth.uid() and g.status='approved' and g.consent_at is not null) for update;
 if request_row.id is null then raise exception 'Guardian consent request not found.'; end if;
 if approve then insert into public.hka_coach_students(coach_id,student_id) values(request_row.claimant_id,request_row.student_id) on conflict do nothing; end if;
 update public.hka_link_requests set status=case when approve then 'approved' else 'rejected' end,guardian_consented_at=case when approve then now() else null end,updated_at=now() where id=request_id;
end $;

create or replace function public.hka_revoke_student_link(request_id uuid)
returns void language plpgsql security definer set search_path='' as $
declare request_row public.hka_link_requests; allowed boolean;
begin
 select * into request_row from public.hka_link_requests where id=request_id for update;
 allowed:=public.hka_admin() or auth.uid() in (request_row.student_id,request_row.claimant_id) or exists(
  select 1 from public.hka_guardians where student_id=request_row.student_id and guardian_id=auth.uid() and status='approved' and consent_at is not null);
 if request_row.id is null or not coalesce(allowed,false) then raise exception 'You cannot revoke this link.'; end if;
 if request_row.kind='guardian' then update public.hka_guardians set status='revoked',consent_at=null where student_id=request_row.student_id and guardian_id=request_row.claimant_id;
 else delete from public.hka_coach_students where student_id=request_row.student_id and coach_id=request_row.claimant_id; end if;
 update public.hka_link_requests set status='revoked',revoked_at=now(),updated_at=now() where id=request_id;
 insert into public.hka_audit(actor_id,target_id,action) values(auth.uid(),request_row.student_id,'Student link revoked: '||request_row.kind);
end $;

create or replace function public.hka_set_role(person uuid,new_role text,is_suspended boolean default false) returns void language plpgsql security definer set search_path='' as $
declare purpose_name text;
begin
 if not public.hka_admin() then raise exception 'Administrator access required.'; end if;
 if person=auth.uid() then raise exception 'Ask another administrator to change your access.'; end if;
 if new_role not in ('student','guardian','coach','admin') then raise exception 'Invalid role.'; end if;
 if new_role<>'student' and exists(select 1 from public.hka_profiles where id=person and birth_date>(current_date-interval '18 years')::date) then raise exception 'Underage accounts must remain students.'; end if;
 purpose_name:=case new_role when 'admin' then 'admin' else new_role end;
 update public.hka_profiles set role=new_role,suspended=is_suspended where id=person;
 insert into public.hka_account_roles(user_id,purpose,status,is_active,approved_at,approved_by)
 values(person,purpose_name,'authorized',true,now(),auth.uid())
 on conflict(user_id,purpose) do update set status='authorized',is_active=true,approved_at=now(),approved_by=auth.uid();
 update public.hka_account_roles set is_active=false where user_id=person and purpose<>purpose_name;
 insert into public.hka_audit(actor_id,target_id,action) values(auth.uid(),person,'Role: '||new_role||'; suspended: '||is_suspended::text);
end $;

alter table public.hka_account_roles enable row level security;
alter table public.hka_student_link_codes enable row level security;
alter table public.hka_link_requests enable row level security;
revoke all on public.hka_account_roles,public.hka_student_link_codes,public.hka_link_requests from anon,authenticated;
grant select on public.hka_account_roles,public.hka_student_link_codes,public.hka_link_requests to authenticated;

create policy account_roles_read on public.hka_account_roles for select to authenticated using(user_id=auth.uid() or public.hka_admin());
create policy link_codes_read on public.hka_student_link_codes for select to authenticated using(student_id=auth.uid() or public.hka_admin());
create policy link_requests_read on public.hka_link_requests for select to authenticated using(
 public.hka_admin() or claimant_id=auth.uid() or student_id=auth.uid() or exists(
  select 1 from public.hka_guardians g where g.student_id=hka_link_requests.student_id and g.guardian_id=auth.uid() and g.status='approved' and g.consent_at is not null));

revoke all on function public.hka_has_purpose(uuid,text),public.hka_request_account_purpose(text,jsonb),public.hka_review_account_purpose(uuid,text,boolean),public.hka_switch_dashboard(text),public.hka_create_student_link_code(text),public.hka_redeem_student_link_code(text),public.hka_review_student_link(uuid,boolean),public.hka_guardian_link_decision(uuid,boolean),public.hka_guardian_coach_consent(uuid,boolean),public.hka_revoke_student_link(uuid) from public,anon;
grant execute on function public.hka_has_purpose(uuid,text),public.hka_request_account_purpose(text,jsonb),public.hka_switch_dashboard(text),public.hka_create_student_link_code(text),public.hka_redeem_student_link_code(text),public.hka_review_student_link(uuid,boolean),public.hka_guardian_link_decision(uuid,boolean),public.hka_guardian_coach_consent(uuid,boolean),public.hka_revoke_student_link(uuid) to authenticated;
revoke execute on function public.hka_signup_profile() from authenticated;

create index if not exists hka_account_roles_user_status on public.hka_account_roles(user_id,status);
create index if not exists hka_link_requests_student_status on public.hka_link_requests(student_id,status);
create index if not exists hka_link_requests_claimant_status on public.hka_link_requests(claimant_id,status);
create index if not exists hka_student_link_codes_expiry on public.hka_student_link_codes(expires_at) where revoked_at is null;
commit;

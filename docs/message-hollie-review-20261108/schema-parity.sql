begin;
create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
create schema auth; create schema extensions; create extension pgcrypto with schema extensions;
create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,raw_user_meta_data jsonb not null default '{}');
alter table auth.users enable row level security;
revoke all on auth.users from public,anon,authenticated;
create function auth.uid() returns uuid language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claim.sub',true),''),nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid $$;
grant usage on schema public,auth to authenticated,anon;
grant execute on function auth.uid() to authenticated,anon;
create table public."hka_messages" ("id" uuid default gen_random_uuid() not null,"student_id" uuid not null,"sender_id" uuid not null,"recipient_id" uuid not null,"body" text not null,"read_at" timestamp with time zone,"created_at" timestamp with time zone default now() not null);
create table public."hka_profiles" ("id" uuid not null,"full_name" text not null,"birth_date" date not null,"timezone" text default 'Africa/Lusaka'::text not null,"role" text default 'student'::text not null,"suspended" boolean default false not null,"avatar_path" text,"created_at" timestamp with time zone default now() not null,"membership_tier" text default 'free'::text not null,"notification_preferences" jsonb default jsonb_build_object('academy', true, 'coaching', true, 'feedback', true) not null,"banner_path" text,"banner_subtitle" text);
create table public."hka_account_roles" ("id" uuid default gen_random_uuid() not null,"user_id" uuid not null,"purpose" text not null,"status" text default 'requested'::text not null,"is_active" boolean default false not null,"onboarding" jsonb default '{}'::jsonb not null,"requested_at" timestamp with time zone default now() not null,"approved_at" timestamp with time zone,"approved_by" uuid);
create table public."hka_guardians" ("id" uuid default gen_random_uuid() not null,"student_id" uuid not null,"guardian_id" uuid not null,"child_label" text not null,"status" text default 'pending'::text not null,"verified_by" uuid not null,"consent_at" timestamp with time zone,"created_at" timestamp with time zone default now() not null);
create table public."hka_coach_students" ("id" uuid default gen_random_uuid() not null,"coach_id" uuid not null,"student_id" uuid not null);
create table public."hka_link_requests" ("id" uuid default gen_random_uuid() not null,"code_id" uuid not null,"student_id" uuid not null,"claimant_id" uuid not null,"kind" text not null,"status" text default 'pending_founder'::text not null,"founder_approved_at" timestamp with time zone,"founder_id" uuid,"guardian_consented_at" timestamp with time zone,"revoked_at" timestamp with time zone,"created_at" timestamp with time zone default now() not null,"updated_at" timestamp with time zone default now() not null);
create table public."hka_student_link_codes" ("id" uuid default gen_random_uuid() not null,"student_id" uuid not null,"kind" text not null,"code_hash" bytea not null,"expires_at" timestamp with time zone not null,"max_uses" integer default 1 not null,"uses" integer default 0 not null,"revoked_at" timestamp with time zone,"created_at" timestamp with time zone default now() not null);
alter table public."hka_account_roles" add constraint "hka_account_roles_check" CHECK (((NOT is_active) OR (status = 'authorized'::text)));
alter table public."hka_account_roles" add constraint "hka_account_roles_onboarding_check" CHECK ((jsonb_typeof(onboarding) = 'object'::text));
alter table public."hka_account_roles" add constraint "hka_account_roles_pkey" PRIMARY KEY (id);
alter table public."hka_account_roles" add constraint "hka_account_roles_purpose_check" CHECK ((purpose = ANY (ARRAY['student'::text, 'guardian'::text, 'coach'::text, 'horse_owner'::text, 'admin'::text])));
alter table public."hka_account_roles" add constraint "hka_account_roles_status_check" CHECK ((status = ANY (ARRAY['requested'::text, 'authorized'::text, 'rejected'::text, 'revoked'::text])));
alter table public."hka_account_roles" add constraint "hka_account_roles_user_id_purpose_key" UNIQUE (user_id, purpose);
alter table public."hka_coach_students" add constraint "hka_coach_students_check" CHECK ((coach_id <> student_id));
alter table public."hka_coach_students" add constraint "hka_coach_students_coach_id_student_id_key" UNIQUE (coach_id, student_id);
alter table public."hka_coach_students" add constraint "hka_coach_students_pkey" PRIMARY KEY (id);
alter table public."hka_guardians" add constraint "hka_guardians_check" CHECK ((student_id <> guardian_id));
alter table public."hka_guardians" add constraint "hka_guardians_child_label_check" CHECK (((char_length(child_label) >= 1) AND (char_length(child_label) <= 100)));
alter table public."hka_guardians" add constraint "hka_guardians_pkey" PRIMARY KEY (id);
alter table public."hka_guardians" add constraint "hka_guardians_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'revoked'::text])));
alter table public."hka_guardians" add constraint "hka_guardians_student_id_guardian_id_key" UNIQUE (student_id, guardian_id);
alter table public."hka_link_requests" add constraint "hka_link_requests_check" CHECK ((student_id <> claimant_id));
alter table public."hka_link_requests" add constraint "hka_link_requests_code_id_claimant_id_key" UNIQUE (code_id, claimant_id);
alter table public."hka_link_requests" add constraint "hka_link_requests_kind_check" CHECK ((kind = ANY (ARRAY['guardian'::text, 'coach'::text])));
alter table public."hka_link_requests" add constraint "hka_link_requests_pkey" PRIMARY KEY (id);
alter table public."hka_link_requests" add constraint "hka_link_requests_status_check" CHECK ((status = ANY (ARRAY['pending_founder'::text, 'awaiting_consent'::text, 'awaiting_guardian'::text, 'approved'::text, 'rejected'::text, 'revoked'::text])));
alter table public."hka_messages" add constraint "hka_messages_body_check" CHECK (((char_length(body) >= 1) AND (char_length(body) <= 4000)));
alter table public."hka_messages" add constraint "hka_messages_check" CHECK ((sender_id <> recipient_id));
alter table public."hka_messages" add constraint "hka_messages_pkey" PRIMARY KEY (id);
alter table public."hka_profiles" add constraint "hka_profiles_banner_subtitle_check" CHECK (((banner_subtitle IS NULL) OR (char_length(banner_subtitle) <= 140)));
alter table public."hka_profiles" add constraint "hka_profiles_birth_date_check" CHECK (((birth_date <= CURRENT_DATE) AND (birth_date > '1900-01-01'::date)));
alter table public."hka_profiles" add constraint "hka_profiles_check" CHECK (((avatar_path IS NULL) OR (avatar_path ~~ ((id)::text || '/%'::text))));
alter table public."hka_profiles" add constraint "hka_profiles_full_name_check" CHECK (((char_length(full_name) >= 1) AND (char_length(full_name) <= 100)));
alter table public."hka_profiles" add constraint "hka_profiles_membership_tier_check" CHECK ((membership_tier = ANY (ARRAY['free'::text, 'basic'::text, 'premium'::text])));
alter table public."hka_profiles" add constraint "hka_profiles_notification_preferences_check" CHECK ((jsonb_typeof(notification_preferences) = 'object'::text));
alter table public."hka_profiles" add constraint "hka_profiles_pkey" PRIMARY KEY (id);
alter table public."hka_profiles" add constraint "hka_profiles_role_check" CHECK ((role = ANY (ARRAY['student'::text, 'guardian'::text, 'coach'::text, 'admin'::text])));
alter table public."hka_profiles" add constraint "hka_profiles_timezone_check" CHECK (((char_length(timezone) >= 1) AND (char_length(timezone) <= 100)));
alter table public."hka_student_link_codes" add constraint "hka_student_link_codes_check" CHECK (((uses >= 0) AND (uses <= max_uses)));
alter table public."hka_student_link_codes" add constraint "hka_student_link_codes_code_hash_key" UNIQUE (code_hash);
alter table public."hka_student_link_codes" add constraint "hka_student_link_codes_kind_check" CHECK ((kind = ANY (ARRAY['guardian'::text, 'coach'::text])));
alter table public."hka_student_link_codes" add constraint "hka_student_link_codes_max_uses_check" CHECK (((max_uses >= 1) AND (max_uses <= 10)));
alter table public."hka_student_link_codes" add constraint "hka_student_link_codes_pkey" PRIMARY KEY (id);
alter table public."hka_account_roles" add constraint "hka_account_roles_approved_by_fkey" FOREIGN KEY (approved_by) REFERENCES hka_profiles(id);
alter table public."hka_account_roles" add constraint "hka_account_roles_user_id_fkey" FOREIGN KEY (user_id) REFERENCES hka_profiles(id) ON DELETE CASCADE;
alter table public."hka_coach_students" add constraint "hka_coach_students_coach_id_fkey" FOREIGN KEY (coach_id) REFERENCES hka_profiles(id) ON DELETE CASCADE;
alter table public."hka_coach_students" add constraint "hka_coach_students_student_id_fkey" FOREIGN KEY (student_id) REFERENCES hka_profiles(id) ON DELETE CASCADE;
alter table public."hka_guardians" add constraint "hka_guardians_guardian_id_fkey" FOREIGN KEY (guardian_id) REFERENCES hka_profiles(id) ON DELETE CASCADE;
alter table public."hka_guardians" add constraint "hka_guardians_student_id_fkey" FOREIGN KEY (student_id) REFERENCES hka_profiles(id) ON DELETE CASCADE;
alter table public."hka_guardians" add constraint "hka_guardians_verified_by_fkey" FOREIGN KEY (verified_by) REFERENCES hka_profiles(id);
alter table public."hka_link_requests" add constraint "hka_link_requests_claimant_id_fkey" FOREIGN KEY (claimant_id) REFERENCES hka_profiles(id) ON DELETE CASCADE;
alter table public."hka_link_requests" add constraint "hka_link_requests_code_id_fkey" FOREIGN KEY (code_id) REFERENCES hka_student_link_codes(id) ON DELETE CASCADE;
alter table public."hka_link_requests" add constraint "hka_link_requests_founder_id_fkey" FOREIGN KEY (founder_id) REFERENCES hka_profiles(id);
alter table public."hka_link_requests" add constraint "hka_link_requests_student_id_fkey" FOREIGN KEY (student_id) REFERENCES hka_profiles(id) ON DELETE CASCADE;
alter table public."hka_messages" add constraint "hka_messages_recipient_id_fkey" FOREIGN KEY (recipient_id) REFERENCES hka_profiles(id) ON DELETE CASCADE;
alter table public."hka_messages" add constraint "hka_messages_sender_id_fkey" FOREIGN KEY (sender_id) REFERENCES hka_profiles(id) ON DELETE CASCADE;
alter table public."hka_messages" add constraint "hka_messages_student_id_fkey" FOREIGN KEY (student_id) REFERENCES hka_profiles(id) ON DELETE CASCADE;
alter table public."hka_profiles" add constraint "hka_profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."hka_student_link_codes" add constraint "hka_student_link_codes_student_id_fkey" FOREIGN KEY (student_id) REFERENCES hka_profiles(id) ON DELETE CASCADE;
create unique index hka_account_roles_one_active on public.hka_account_roles(user_id) where is_active;
CREATE INDEX hka_account_roles_user_status ON public.hka_account_roles USING btree (user_id, status);
CREATE INDEX hka_messages_student_created_idx ON public.hka_messages USING btree (student_id, created_at DESC);
create table public.hka_files(path text,owner_id uuid,purpose text); alter table public.hka_files enable row level security; grant select on public.hka_files to authenticated;
CREATE OR REPLACE FUNCTION public.hka_role()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select p.role from public.hka_profiles p join auth.users u on u.id=p.id
 where p.id=auth.uid() and not p.suspended and u.email_confirmed_at is not null
$function$
;
CREATE OR REPLACE FUNCTION public.hka_has_purpose(person uuid, purpose_name text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select exists(select 1 from public.hka_account_roles ar where ar.user_id=person and ar.purpose=purpose_name and ar.status='authorized')
$function$
;
CREATE OR REPLACE FUNCTION public.hka_coaches(person uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select public.hka_role()='coach' and public.hka_has_purpose(auth.uid(),'coach')
 and exists(select 1 from public.hka_coach_students where coach_id=auth.uid() and student_id=person)
$function$
;
CREATE OR REPLACE FUNCTION public.hka_role()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select p.role from public.hka_profiles p join auth.users u on u.id=p.id
 where p.id=auth.uid() and not p.suspended and u.email_confirmed_at is not null
$function$
;
CREATE OR REPLACE FUNCTION public.hka_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select coalesce(public.hka_role()='admin',false)
$function$
;
CREATE OR REPLACE FUNCTION public.hka_active(person uuid DEFAULT auth.uid())
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select exists(select 1 from public.hka_profiles p join auth.users u on u.id=p.id
 where p.id=person and not p.suspended and u.email_confirmed_at is not null
 and exists(select 1 from public.hka_account_roles ar where ar.user_id=p.id and ar.status='authorized' and ar.is_active
  and ((p.role='student' and ar.purpose in ('student','horse_owner')) or p.role=ar.purpose or (p.role='admin' and ar.purpose='admin')))
 and (p.role<>'student' or p.birth_date <= (current_date-interval '18 years')::date
  or exists(select 1 from public.hka_guardians g join public.hka_profiles gp on gp.id=g.guardian_id
   join auth.users gu on gu.id=gp.id where g.student_id=p.id and g.status='approved' and g.consent_at is not null
   and public.hka_has_purpose(gp.id,'guardian') and not gp.suspended and gu.email_confirmed_at is not null)))
$function$
;
CREATE OR REPLACE FUNCTION public.hka_teach(person uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select public.hka_admin() or (public.hka_active() and public.hka_active(person) and public.hka_coaches(person))
$function$
;
CREATE OR REPLACE FUNCTION public.hka_view_student(person uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select public.hka_admin() or (public.hka_active() and public.hka_active(person) and (
 auth.uid()=person or public.hka_coaches(person) or
 (public.hka_role()='guardian' and exists(select 1 from public.hka_guardians
 where guardian_id=auth.uid() and student_id=person and status='approved' and consent_at is not null))))
$function$
;
CREATE OR REPLACE FUNCTION public.hka_signup_profile()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
 dob date; display_name text; selected jsonb; safe_onboarding jsonb; item text; initial_role text:='student'; active_purpose text;
begin
 dob:=nullif(new.raw_user_meta_data->>'birth_date','')::date;
 display_name:=trim(coalesce(new.raw_user_meta_data->>'full_name',''));
 selected:=new.raw_user_meta_data->'account_purposes';
 safe_onboarding:=coalesce(new.raw_user_meta_data->'onboarding','{}'::jsonb)-'guardian_code'-'coach_code';
 if selected is null or jsonb_typeof(selected)<>'array' then selected:=jsonb_build_array(coalesce(new.raw_user_meta_data->>'account_type','student')); end if;
 if jsonb_array_length(selected)=0 or exists(select 1 from jsonb_array_elements_text(selected) value where value not in ('student','guardian','coach','horse_owner')) then raise exception 'Choose a valid account purpose.'; end if;
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
   values(new.id,item,case when item='coach' then 'requested' else 'authorized' end,coalesce(item=active_purpose,false),
    safe_onboarding,case when item='coach' then null else now() end)
   on conflict(user_id,purpose) do nothing;
  end if;
 end loop;
 if selected ? 'guardian' and nullif(trim(new.raw_user_meta_data->'onboarding'->>'guardian_code'),'') is not null then
  insert into public.hka_link_requests(code_id,student_id,claimant_id,kind)
  select c.id,c.student_id,new.id,c.kind from public.hka_student_link_codes c where c.kind='guardian' and c.code_hash=extensions.digest(upper(trim(new.raw_user_meta_data->'onboarding'->>'guardian_code')),'sha256') and c.revoked_at is null and c.expires_at>now() and c.uses<c.max_uses
  on conflict(code_id,claimant_id) do nothing;
  update public.hka_student_link_codes c set uses=uses+1 where exists(select 1 from public.hka_link_requests r where r.code_id=c.id and r.claimant_id=new.id);
 end if;
 if selected ? 'coach' and nullif(trim(new.raw_user_meta_data->'onboarding'->>'coach_code'),'') is not null then
  insert into public.hka_link_requests(code_id,student_id,claimant_id,kind)
  select c.id,c.student_id,new.id,c.kind from public.hka_student_link_codes c where c.kind='coach' and c.code_hash=extensions.digest(upper(trim(new.raw_user_meta_data->'onboarding'->>'coach_code')),'sha256') and c.revoked_at is null and c.expires_at>now() and c.uses<c.max_uses
  on conflict(code_id,claimant_id) do nothing;
  update public.hka_student_link_codes c set uses=uses+1 where exists(select 1 from public.hka_link_requests r where r.code_id=c.id and r.claimant_id=new.id);
 end if;
 update auth.users set raw_user_meta_data=jsonb_set(coalesce(raw_user_meta_data,'{}'::jsonb),'{onboarding}',safe_onboarding,true) where id=new.id;
 return new;
end
$function$
;
create trigger hka_auth_profile after insert on auth.users for each row execute function public.hka_signup_profile();
revoke all on all functions in schema public from public,anon,authenticated;
grant execute on function public.hka_active(uuid) to "authenticated";
grant execute on function public.hka_active(uuid) to "service_role";
grant execute on function public.hka_admin() to "authenticated";
grant execute on function public.hka_admin() to "service_role";
grant execute on function public.hka_coaches(uuid) to "authenticated";
grant execute on function public.hka_coaches(uuid) to "service_role";
grant execute on function public.hka_has_purpose(uuid,text) to "service_role";
grant execute on function public.hka_role() to "authenticated";
grant execute on function public.hka_role() to "service_role";
grant execute on function public.hka_signup_profile() to "service_role";
grant execute on function public.hka_teach(uuid) to "authenticated";
grant execute on function public.hka_teach(uuid) to "service_role";
grant execute on function public.hka_view_student(uuid) to "authenticated";
grant execute on function public.hka_view_student(uuid) to "service_role";
alter table public."hka_messages" enable row level security;
revoke all on public."hka_messages" from public,anon,authenticated; grant select on public."hka_messages" to authenticated;
alter table public."hka_profiles" enable row level security;
revoke all on public."hka_profiles" from public,anon,authenticated; grant select on public."hka_profiles" to authenticated;
alter table public."hka_account_roles" enable row level security;
revoke all on public."hka_account_roles" from public,anon,authenticated; grant select on public."hka_account_roles" to authenticated;
alter table public."hka_guardians" enable row level security;
revoke all on public."hka_guardians" from public,anon,authenticated; grant select on public."hka_guardians" to authenticated;
alter table public."hka_coach_students" enable row level security;
revoke all on public."hka_coach_students" from public,anon,authenticated; grant select on public."hka_coach_students" to authenticated;
alter table public."hka_link_requests" enable row level security;
revoke all on public."hka_link_requests" from public,anon,authenticated; grant select on public."hka_link_requests" to authenticated;
alter table public."hka_student_link_codes" enable row level security;
revoke all on public."hka_student_link_codes" from public,anon,authenticated; grant select on public."hka_student_link_codes" to authenticated;
grant update(full_name,timezone,avatar_path,notification_preferences,banner_path,banner_subtitle) on public.hka_profiles to authenticated;
grant insert,delete on public.hka_guardians to authenticated; grant insert,update,delete on public.hka_coach_students to authenticated;
create policy "profiles_read" on public."hka_profiles" as permissive for SELECT to authenticated using(((id = auth.uid()) OR hka_view_student(id)));
create policy "profiles_update" on public."hka_profiles" as permissive for UPDATE to authenticated using(((id = auth.uid()) AND (hka_role() IS NOT NULL))) with check(((id = auth.uid()) AND ((avatar_path IS NULL) OR (EXISTS ( SELECT 1
   FROM hka_files f
  WHERE ((f.path = hka_profiles.avatar_path) AND (f.owner_id = auth.uid()) AND (f.purpose = 'avatar'::text))))) AND ((banner_path IS NULL) OR (split_part(banner_path, '/'::text, 1) = (auth.uid())::text))));
create policy "account_roles_read" on public."hka_account_roles" as permissive for SELECT to authenticated using(((user_id = auth.uid()) OR hka_admin()));
create policy "guardians_delete" on public."hka_guardians" as permissive for DELETE to authenticated using(hka_admin());
create policy "guardians_insert" on public."hka_guardians" as permissive for INSERT to authenticated with check((hka_admin() AND (verified_by = auth.uid()) AND (status = 'pending'::text) AND (consent_at IS NULL) AND (EXISTS ( SELECT 1
   FROM hka_profiles
  WHERE ((hka_profiles.id = hka_guardians.student_id) AND (hka_profiles.role = 'student'::text)))) AND (EXISTS ( SELECT 1
   FROM hka_profiles
  WHERE ((hka_profiles.id = hka_guardians.guardian_id) AND (hka_profiles.role = 'guardian'::text) AND (hka_profiles.birth_date <= ((CURRENT_DATE - '18 years'::interval))::date))))));
create policy "guardians_read" on public."hka_guardians" as permissive for SELECT to authenticated using((hka_admin() OR (guardian_id = auth.uid()) OR (student_id = auth.uid())));
create policy "assignments_read" on public."hka_coach_students" as permissive for SELECT to authenticated using((hka_admin() OR (coach_id = auth.uid()) OR hka_view_student(student_id)));
create policy "assignments_write" on public."hka_coach_students" as permissive for all to authenticated using(hka_admin()) with check((hka_admin() AND (EXISTS ( SELECT 1
   FROM hka_profiles
  WHERE ((hka_profiles.id = hka_coach_students.coach_id) AND (hka_profiles.role = ANY (ARRAY['coach'::text, 'admin'::text]))))) AND (EXISTS ( SELECT 1
   FROM hka_profiles
  WHERE ((hka_profiles.id = hka_coach_students.student_id) AND (hka_profiles.role = 'student'::text))))));
create policy "link_requests_read" on public."hka_link_requests" as permissive for SELECT to authenticated using((hka_admin() OR (claimant_id = auth.uid()) OR (student_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM hka_guardians g
  WHERE ((g.student_id = hka_link_requests.student_id) AND (g.guardian_id = auth.uid()) AND (g.status = 'approved'::text) AND (g.consent_at IS NOT NULL))))));
create policy "link_codes_read" on public."hka_student_link_codes" as permissive for SELECT to authenticated using(((student_id = auth.uid()) OR hka_admin()));
create policy "hka_messages_insert" on public.hka_messages as PERMISSIVE for INSERT to "authenticated" with check(((sender_id = auth.uid()) AND (hka_admin() OR (hka_teach(student_id) AND ((recipient_id = student_id) OR (recipient_id IN ( SELECT g.guardian_id
   FROM hka_guardians g
  WHERE ((g.student_id = hka_messages.student_id) AND (g.status = 'approved'::text) AND (g.consent_at IS NOT NULL)))))) OR ((student_id = auth.uid()) AND (recipient_id IN ( SELECT cs.coach_id
   FROM hka_coach_students cs
  WHERE (cs.student_id = auth.uid())))) OR (hka_view_student(student_id) AND (EXISTS ( SELECT 1
   FROM hka_profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'guardian'::text)))) AND ((recipient_id = student_id) OR (recipient_id IN ( SELECT cs.coach_id
   FROM hka_coach_students cs
  WHERE (cs.student_id = hka_messages.student_id))))))));
create policy "hka_messages_read" on public.hka_messages as PERMISSIVE for SELECT to "authenticated" using((auth.uid() in (sender_id,recipient_id) OR hka_admin() OR (hka_view_student(student_id) AND (EXISTS ( SELECT 1
   FROM hka_profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'guardian'::text)))))));
create policy "hka_messages_update_read" on public.hka_messages as PERMISSIVE for UPDATE to "authenticated" using((recipient_id = auth.uid())) with check((recipient_id = auth.uid()));
grant INSERT on public.hka_messages to "service_role";
grant SELECT on public.hka_messages to "service_role";
grant UPDATE on public.hka_messages to "service_role";
grant DELETE on public.hka_messages to "service_role";
grant TRUNCATE on public.hka_messages to "service_role";
grant REFERENCES on public.hka_messages to "service_role";
grant TRIGGER on public.hka_messages to "service_role";
grant INSERT on public.hka_messages to "authenticated";
grant SELECT on public.hka_messages to "authenticated";
grant update(read_at) on public.hka_messages to authenticated;
set search_path=pg_catalog,public;
do $$ begin if (select jsonb_agg(jsonb_build_object('name',column_name,'type',data_type,'nullable',is_nullable,'default',column_default) order by ordinal_position) from information_schema.columns where table_schema='public' and table_name='hka_messages') is distinct from '[{"name":"id","type":"uuid","nullable":"NO","default":"gen_random_uuid()"},{"name":"student_id","type":"uuid","nullable":"NO","default":null},{"name":"sender_id","type":"uuid","nullable":"NO","default":null},{"name":"recipient_id","type":"uuid","nullable":"NO","default":null},{"name":"body","type":"text","nullable":"NO","default":null},{"name":"read_at","type":"timestamp with time zone","nullable":"YES","default":null},{"name":"created_at","type":"timestamp with time zone","nullable":"NO","default":"now()"}]'::jsonb then raise exception 'Reconstruction drift: hka_messages'; end if; end $$;
do $$ begin if (select jsonb_agg(jsonb_build_object('name',column_name,'type',data_type,'nullable',is_nullable,'default',column_default) order by ordinal_position) from information_schema.columns where table_schema='public' and table_name='hka_profiles') is distinct from '[{"name":"id","type":"uuid","nullable":"NO","default":null},{"name":"full_name","type":"text","nullable":"NO","default":null},{"name":"birth_date","type":"date","nullable":"NO","default":null},{"name":"timezone","type":"text","nullable":"NO","default":"''Africa/Lusaka''::text"},{"name":"role","type":"text","nullable":"NO","default":"''student''::text"},{"name":"suspended","type":"boolean","nullable":"NO","default":"false"},{"name":"avatar_path","type":"text","nullable":"YES","default":null},{"name":"created_at","type":"timestamp with time zone","nullable":"NO","default":"now()"},{"name":"membership_tier","type":"text","nullable":"NO","default":"''free''::text"},{"name":"notification_preferences","type":"jsonb","nullable":"NO","default":"jsonb_build_object(''academy'', true, ''coaching'', true, ''feedback'', true)"},{"name":"banner_path","type":"text","nullable":"YES","default":null},{"name":"banner_subtitle","type":"text","nullable":"YES","default":null}]'::jsonb then raise exception 'Reconstruction drift: hka_profiles'; end if; end $$;
do $$ begin if (select jsonb_agg(jsonb_build_object('name',column_name,'type',data_type,'nullable',is_nullable,'default',column_default) order by ordinal_position) from information_schema.columns where table_schema='public' and table_name='hka_account_roles') is distinct from '[{"name":"id","type":"uuid","nullable":"NO","default":"gen_random_uuid()"},{"name":"user_id","type":"uuid","nullable":"NO","default":null},{"name":"purpose","type":"text","nullable":"NO","default":null},{"name":"status","type":"text","nullable":"NO","default":"''requested''::text"},{"name":"is_active","type":"boolean","nullable":"NO","default":"false"},{"name":"onboarding","type":"jsonb","nullable":"NO","default":"''{}''::jsonb"},{"name":"requested_at","type":"timestamp with time zone","nullable":"NO","default":"now()"},{"name":"approved_at","type":"timestamp with time zone","nullable":"YES","default":null},{"name":"approved_by","type":"uuid","nullable":"YES","default":null}]'::jsonb then raise exception 'Reconstruction drift: hka_account_roles'; end if; end $$;
do $$ begin if (select jsonb_agg(jsonb_build_object('name',column_name,'type',data_type,'nullable',is_nullable,'default',column_default) order by ordinal_position) from information_schema.columns where table_schema='public' and table_name='hka_guardians') is distinct from '[{"name":"id","type":"uuid","nullable":"NO","default":"gen_random_uuid()"},{"name":"student_id","type":"uuid","nullable":"NO","default":null},{"name":"guardian_id","type":"uuid","nullable":"NO","default":null},{"name":"child_label","type":"text","nullable":"NO","default":null},{"name":"status","type":"text","nullable":"NO","default":"''pending''::text"},{"name":"verified_by","type":"uuid","nullable":"NO","default":null},{"name":"consent_at","type":"timestamp with time zone","nullable":"YES","default":null},{"name":"created_at","type":"timestamp with time zone","nullable":"NO","default":"now()"}]'::jsonb then raise exception 'Reconstruction drift: hka_guardians'; end if; end $$;
do $$ begin if (select jsonb_agg(jsonb_build_object('name',column_name,'type',data_type,'nullable',is_nullable,'default',column_default) order by ordinal_position) from information_schema.columns where table_schema='public' and table_name='hka_coach_students') is distinct from '[{"name":"id","type":"uuid","nullable":"NO","default":"gen_random_uuid()"},{"name":"coach_id","type":"uuid","nullable":"NO","default":null},{"name":"student_id","type":"uuid","nullable":"NO","default":null}]'::jsonb then raise exception 'Reconstruction drift: hka_coach_students'; end if; end $$;
do $$ begin if (select jsonb_agg(jsonb_build_object('name',column_name,'type',data_type,'nullable',is_nullable,'default',column_default) order by ordinal_position) from information_schema.columns where table_schema='public' and table_name='hka_link_requests') is distinct from '[{"name":"id","type":"uuid","nullable":"NO","default":"gen_random_uuid()"},{"name":"code_id","type":"uuid","nullable":"NO","default":null},{"name":"student_id","type":"uuid","nullable":"NO","default":null},{"name":"claimant_id","type":"uuid","nullable":"NO","default":null},{"name":"kind","type":"text","nullable":"NO","default":null},{"name":"status","type":"text","nullable":"NO","default":"''pending_founder''::text"},{"name":"founder_approved_at","type":"timestamp with time zone","nullable":"YES","default":null},{"name":"founder_id","type":"uuid","nullable":"YES","default":null},{"name":"guardian_consented_at","type":"timestamp with time zone","nullable":"YES","default":null},{"name":"revoked_at","type":"timestamp with time zone","nullable":"YES","default":null},{"name":"created_at","type":"timestamp with time zone","nullable":"NO","default":"now()"},{"name":"updated_at","type":"timestamp with time zone","nullable":"NO","default":"now()"}]'::jsonb then raise exception 'Reconstruction drift: hka_link_requests'; end if; end $$;
do $$ begin if (select jsonb_agg(jsonb_build_object('name',column_name,'type',data_type,'nullable',is_nullable,'default',column_default) order by ordinal_position) from information_schema.columns where table_schema='public' and table_name='hka_student_link_codes') is distinct from '[{"name":"id","type":"uuid","nullable":"NO","default":"gen_random_uuid()"},{"name":"student_id","type":"uuid","nullable":"NO","default":null},{"name":"kind","type":"text","nullable":"NO","default":null},{"name":"code_hash","type":"bytea","nullable":"NO","default":null},{"name":"expires_at","type":"timestamp with time zone","nullable":"NO","default":null},{"name":"max_uses","type":"integer","nullable":"NO","default":"1"},{"name":"uses","type":"integer","nullable":"NO","default":"0"},{"name":"revoked_at","type":"timestamp with time zone","nullable":"YES","default":null},{"name":"created_at","type":"timestamp with time zone","nullable":"NO","default":"now()"}]'::jsonb then raise exception 'Reconstruction drift: hka_student_link_codes'; end if; end $$;
do $hosted_check$ begin if pg_get_functiondef('public.hka_active(uuid)'::regprocedure) is distinct from 'CREATE OR REPLACE FUNCTION public.hka_active(person uuid DEFAULT auth.uid())
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''''
AS $function$
 select exists(select 1 from public.hka_profiles p join auth.users u on u.id=p.id
 where p.id=person and not p.suspended and u.email_confirmed_at is not null
 and exists(select 1 from public.hka_account_roles ar where ar.user_id=p.id and ar.status=''authorized'' and ar.is_active
  and ((p.role=''student'' and ar.purpose in (''student'',''horse_owner'')) or p.role=ar.purpose or (p.role=''admin'' and ar.purpose=''admin'')))
 and (p.role<>''student'' or p.birth_date <= (current_date-interval ''18 years'')::date
  or exists(select 1 from public.hka_guardians g join public.hka_profiles gp on gp.id=g.guardian_id
   join auth.users gu on gu.id=gp.id where g.student_id=p.id and g.status=''approved'' and g.consent_at is not null
   and public.hka_has_purpose(gp.id,''guardian'') and not gp.suspended and gu.email_confirmed_at is not null)))
$function$
'
   or (select pg_get_userbyid(proowner) from pg_proc where oid='public.hka_active(uuid)'::regprocedure) is distinct from 'postgres'
   or (select jsonb_agg(a order by a) from pg_proc p cross join unnest(p.proacl::text[]) a where p.oid='public.hka_active(uuid)'::regprocedure)
    is distinct from '["authenticated=X/postgres","postgres=X/postgres","service_role=X/postgres"]'::jsonb
   then raise exception 'Hosted dependency definition/owner/ACL reconstruction drift: hka_active'; end if; end $hosted_check$;
do $hosted_check$ begin if pg_get_functiondef('public.hka_admin()'::regprocedure) is distinct from 'CREATE OR REPLACE FUNCTION public.hka_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''''
AS $function$
 select coalesce(public.hka_role()=''admin'',false)
$function$
'
   or (select pg_get_userbyid(proowner) from pg_proc where oid='public.hka_admin()'::regprocedure) is distinct from 'postgres'
   or (select jsonb_agg(a order by a) from pg_proc p cross join unnest(p.proacl::text[]) a where p.oid='public.hka_admin()'::regprocedure)
    is distinct from '["authenticated=X/postgres","postgres=X/postgres","service_role=X/postgres"]'::jsonb
   then raise exception 'Hosted dependency definition/owner/ACL reconstruction drift: hka_admin'; end if; end $hosted_check$;
do $hosted_check$ begin if pg_get_functiondef('public.hka_coaches(uuid)'::regprocedure) is distinct from 'CREATE OR REPLACE FUNCTION public.hka_coaches(person uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''''
AS $function$
 select public.hka_role()=''coach'' and public.hka_has_purpose(auth.uid(),''coach'')
 and exists(select 1 from public.hka_coach_students where coach_id=auth.uid() and student_id=person)
$function$
'
   or (select pg_get_userbyid(proowner) from pg_proc where oid='public.hka_coaches(uuid)'::regprocedure) is distinct from 'postgres'
   or (select jsonb_agg(a order by a) from pg_proc p cross join unnest(p.proacl::text[]) a where p.oid='public.hka_coaches(uuid)'::regprocedure)
    is distinct from '["authenticated=X/postgres","postgres=X/postgres","service_role=X/postgres"]'::jsonb
   then raise exception 'Hosted dependency definition/owner/ACL reconstruction drift: hka_coaches'; end if; end $hosted_check$;
do $hosted_check$ begin if pg_get_functiondef('public.hka_has_purpose(uuid,text)'::regprocedure) is distinct from 'CREATE OR REPLACE FUNCTION public.hka_has_purpose(person uuid, purpose_name text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''''
AS $function$
 select exists(select 1 from public.hka_account_roles ar where ar.user_id=person and ar.purpose=purpose_name and ar.status=''authorized'')
$function$
'
   or (select pg_get_userbyid(proowner) from pg_proc where oid='public.hka_has_purpose(uuid,text)'::regprocedure) is distinct from 'postgres'
   or (select jsonb_agg(a order by a) from pg_proc p cross join unnest(p.proacl::text[]) a where p.oid='public.hka_has_purpose(uuid,text)'::regprocedure)
    is distinct from '["postgres=X/postgres","service_role=X/postgres"]'::jsonb
   then raise exception 'Hosted dependency definition/owner/ACL reconstruction drift: hka_has_purpose'; end if; end $hosted_check$;
do $hosted_check$ begin if pg_get_functiondef('public.hka_role()'::regprocedure) is distinct from 'CREATE OR REPLACE FUNCTION public.hka_role()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''''
AS $function$
 select p.role from public.hka_profiles p join auth.users u on u.id=p.id
 where p.id=auth.uid() and not p.suspended and u.email_confirmed_at is not null
$function$
'
   or (select pg_get_userbyid(proowner) from pg_proc where oid='public.hka_role()'::regprocedure) is distinct from 'postgres'
   or (select jsonb_agg(a order by a) from pg_proc p cross join unnest(p.proacl::text[]) a where p.oid='public.hka_role()'::regprocedure)
    is distinct from '["authenticated=X/postgres","postgres=X/postgres","service_role=X/postgres"]'::jsonb
   then raise exception 'Hosted dependency definition/owner/ACL reconstruction drift: hka_role'; end if; end $hosted_check$;
do $hosted_check$ begin if pg_get_functiondef('public.hka_signup_profile()'::regprocedure) is distinct from 'CREATE OR REPLACE FUNCTION public.hka_signup_profile()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''''
AS $function$
declare
 dob date; display_name text; selected jsonb; safe_onboarding jsonb; item text; initial_role text:=''student''; active_purpose text;
begin
 dob:=nullif(new.raw_user_meta_data->>''birth_date'','''')::date;
 display_name:=trim(coalesce(new.raw_user_meta_data->>''full_name'',''''));
 selected:=new.raw_user_meta_data->''account_purposes'';
 safe_onboarding:=coalesce(new.raw_user_meta_data->''onboarding'',''{}''::jsonb)-''guardian_code''-''coach_code'';
 if selected is null or jsonb_typeof(selected)<>''array'' then selected:=jsonb_build_array(coalesce(new.raw_user_meta_data->>''account_type'',''student'')); end if;
 if jsonb_array_length(selected)=0 or exists(select 1 from jsonb_array_elements_text(selected) value where value not in (''student'',''guardian'',''coach'',''horse_owner'')) then raise exception ''Choose a valid account purpose.''; end if;
 if dob is null or dob>current_date or dob<=date ''1900-01-01'' or char_length(display_name) not between 1 and 100 then raise exception ''A valid name and date of birth are required.''; end if;
 if selected ? ''guardian'' and dob>(current_date-interval ''18 years'')::date then raise exception ''Guardians must be adults.''; end if;
 if selected ? ''guardian'' and not (selected ? ''student'') and not (selected ? ''horse_owner'') then initial_role:=''guardian'';active_purpose:=''guardian'';
 elsif selected ? ''student'' then active_purpose:=''student'';
 elsif selected ? ''horse_owner'' then active_purpose:=''horse_owner'';
 end if;
 insert into public.hka_profiles(id,full_name,birth_date,timezone,role)
 values(new.id,display_name,dob,coalesce(nullif(new.raw_user_meta_data->>''timezone'',''''),''UTC''),initial_role);
 for item in select jsonb_array_elements_text(selected) loop
  if item in (''student'',''guardian'',''coach'',''horse_owner'') then
   insert into public.hka_account_roles(user_id,purpose,status,is_active,onboarding,approved_at)
   values(new.id,item,case when item=''coach'' then ''requested'' else ''authorized'' end,coalesce(item=active_purpose,false),
    safe_onboarding,case when item=''coach'' then null else now() end)
   on conflict(user_id,purpose) do nothing;
  end if;
 end loop;
 if selected ? ''guardian'' and nullif(trim(new.raw_user_meta_data->''onboarding''->>''guardian_code''),'''') is not null then
  insert into public.hka_link_requests(code_id,student_id,claimant_id,kind)
  select c.id,c.student_id,new.id,c.kind from public.hka_student_link_codes c where c.kind=''guardian'' and c.code_hash=extensions.digest(upper(trim(new.raw_user_meta_data->''onboarding''->>''guardian_code'')),''sha256'') and c.revoked_at is null and c.expires_at>now() and c.uses<c.max_uses
  on conflict(code_id,claimant_id) do nothing;
  update public.hka_student_link_codes c set uses=uses+1 where exists(select 1 from public.hka_link_requests r where r.code_id=c.id and r.claimant_id=new.id);
 end if;
 if selected ? ''coach'' and nullif(trim(new.raw_user_meta_data->''onboarding''->>''coach_code''),'''') is not null then
  insert into public.hka_link_requests(code_id,student_id,claimant_id,kind)
  select c.id,c.student_id,new.id,c.kind from public.hka_student_link_codes c where c.kind=''coach'' and c.code_hash=extensions.digest(upper(trim(new.raw_user_meta_data->''onboarding''->>''coach_code'')),''sha256'') and c.revoked_at is null and c.expires_at>now() and c.uses<c.max_uses
  on conflict(code_id,claimant_id) do nothing;
  update public.hka_student_link_codes c set uses=uses+1 where exists(select 1 from public.hka_link_requests r where r.code_id=c.id and r.claimant_id=new.id);
 end if;
 update auth.users set raw_user_meta_data=jsonb_set(coalesce(raw_user_meta_data,''{}''::jsonb),''{onboarding}'',safe_onboarding,true) where id=new.id;
 return new;
end
$function$
'
   or (select pg_get_userbyid(proowner) from pg_proc where oid='public.hka_signup_profile()'::regprocedure) is distinct from 'postgres'
   or (select jsonb_agg(a order by a) from pg_proc p cross join unnest(p.proacl::text[]) a where p.oid='public.hka_signup_profile()'::regprocedure)
    is distinct from '["postgres=X/postgres","service_role=X/postgres"]'::jsonb
   then raise exception 'Hosted dependency definition/owner/ACL reconstruction drift: hka_signup_profile'; end if; end $hosted_check$;
do $hosted_check$ begin if pg_get_functiondef('public.hka_teach(uuid)'::regprocedure) is distinct from 'CREATE OR REPLACE FUNCTION public.hka_teach(person uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''''
AS $function$
 select public.hka_admin() or (public.hka_active() and public.hka_active(person) and public.hka_coaches(person))
$function$
'
   or (select pg_get_userbyid(proowner) from pg_proc where oid='public.hka_teach(uuid)'::regprocedure) is distinct from 'postgres'
   or (select jsonb_agg(a order by a) from pg_proc p cross join unnest(p.proacl::text[]) a where p.oid='public.hka_teach(uuid)'::regprocedure)
    is distinct from '["authenticated=X/postgres","postgres=X/postgres","service_role=X/postgres"]'::jsonb
   then raise exception 'Hosted dependency definition/owner/ACL reconstruction drift: hka_teach'; end if; end $hosted_check$;
do $hosted_check$ begin if pg_get_functiondef('public.hka_view_student(uuid)'::regprocedure) is distinct from 'CREATE OR REPLACE FUNCTION public.hka_view_student(person uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''''
AS $function$
 select public.hka_admin() or (public.hka_active() and public.hka_active(person) and (
 auth.uid()=person or public.hka_coaches(person) or
 (public.hka_role()=''guardian'' and exists(select 1 from public.hka_guardians
 where guardian_id=auth.uid() and student_id=person and status=''approved'' and consent_at is not null))))
$function$
'
   or (select pg_get_userbyid(proowner) from pg_proc where oid='public.hka_view_student(uuid)'::regprocedure) is distinct from 'postgres'
   or (select jsonb_agg(a order by a) from pg_proc p cross join unnest(p.proacl::text[]) a where p.oid='public.hka_view_student(uuid)'::regprocedure)
    is distinct from '["authenticated=X/postgres","postgres=X/postgres","service_role=X/postgres"]'::jsonb
   then raise exception 'Hosted dependency definition/owner/ACL reconstruction drift: hka_view_student'; end if; end $hosted_check$;
do $hosted_check$ begin if (select jsonb_agg(jsonb_build_object('table',c.conrelid::regclass::text,'name',c.conname,'definition',pg_get_constraintdef(c.oid)) order by c.conrelid::regclass::text,c.conname)
 from pg_constraint c where c.conrelid in (select cl.oid from pg_class cl join pg_namespace n on n.oid=cl.relnamespace
 where n.nspname='public' and cl.relname=any(array['hka_messages','hka_profiles','hka_account_roles','hka_guardians','hka_coach_students','hka_link_requests','hka_student_link_codes'])))
 is distinct from '[{"name":"hka_account_roles_approved_by_fkey","table":"hka_account_roles","definition":"FOREIGN KEY (approved_by) REFERENCES hka_profiles(id)"},{"name":"hka_account_roles_check","table":"hka_account_roles","definition":"CHECK (((NOT is_active) OR (status = ''authorized''::text)))"},{"name":"hka_account_roles_onboarding_check","table":"hka_account_roles","definition":"CHECK ((jsonb_typeof(onboarding) = ''object''::text))"},{"name":"hka_account_roles_pkey","table":"hka_account_roles","definition":"PRIMARY KEY (id)"},{"name":"hka_account_roles_purpose_check","table":"hka_account_roles","definition":"CHECK ((purpose = ANY (ARRAY[''student''::text, ''guardian''::text, ''coach''::text, ''horse_owner''::text, ''admin''::text])))"},{"name":"hka_account_roles_status_check","table":"hka_account_roles","definition":"CHECK ((status = ANY (ARRAY[''requested''::text, ''authorized''::text, ''rejected''::text, ''revoked''::text])))"},{"name":"hka_account_roles_user_id_fkey","table":"hka_account_roles","definition":"FOREIGN KEY (user_id) REFERENCES hka_profiles(id) ON DELETE CASCADE"},{"name":"hka_account_roles_user_id_purpose_key","table":"hka_account_roles","definition":"UNIQUE (user_id, purpose)"},{"name":"hka_coach_students_check","table":"hka_coach_students","definition":"CHECK ((coach_id <> student_id))"},{"name":"hka_coach_students_coach_id_fkey","table":"hka_coach_students","definition":"FOREIGN KEY (coach_id) REFERENCES hka_profiles(id) ON DELETE CASCADE"},{"name":"hka_coach_students_coach_id_student_id_key","table":"hka_coach_students","definition":"UNIQUE (coach_id, student_id)"},{"name":"hka_coach_students_pkey","table":"hka_coach_students","definition":"PRIMARY KEY (id)"},{"name":"hka_coach_students_student_id_fkey","table":"hka_coach_students","definition":"FOREIGN KEY (student_id) REFERENCES hka_profiles(id) ON DELETE CASCADE"},{"name":"hka_guardians_check","table":"hka_guardians","definition":"CHECK ((student_id <> guardian_id))"},{"name":"hka_guardians_child_label_check","table":"hka_guardians","definition":"CHECK (((char_length(child_label) >= 1) AND (char_length(child_label) <= 100)))"},{"name":"hka_guardians_guardian_id_fkey","table":"hka_guardians","definition":"FOREIGN KEY (guardian_id) REFERENCES hka_profiles(id) ON DELETE CASCADE"},{"name":"hka_guardians_pkey","table":"hka_guardians","definition":"PRIMARY KEY (id)"},{"name":"hka_guardians_status_check","table":"hka_guardians","definition":"CHECK ((status = ANY (ARRAY[''pending''::text, ''approved''::text, ''revoked''::text])))"},{"name":"hka_guardians_student_id_fkey","table":"hka_guardians","definition":"FOREIGN KEY (student_id) REFERENCES hka_profiles(id) ON DELETE CASCADE"},{"name":"hka_guardians_student_id_guardian_id_key","table":"hka_guardians","definition":"UNIQUE (student_id, guardian_id)"},{"name":"hka_guardians_verified_by_fkey","table":"hka_guardians","definition":"FOREIGN KEY (verified_by) REFERENCES hka_profiles(id)"},{"name":"hka_link_requests_check","table":"hka_link_requests","definition":"CHECK ((student_id <> claimant_id))"},{"name":"hka_link_requests_claimant_id_fkey","table":"hka_link_requests","definition":"FOREIGN KEY (claimant_id) REFERENCES hka_profiles(id) ON DELETE CASCADE"},{"name":"hka_link_requests_code_id_claimant_id_key","table":"hka_link_requests","definition":"UNIQUE (code_id, claimant_id)"},{"name":"hka_link_requests_code_id_fkey","table":"hka_link_requests","definition":"FOREIGN KEY (code_id) REFERENCES hka_student_link_codes(id) ON DELETE CASCADE"},{"name":"hka_link_requests_founder_id_fkey","table":"hka_link_requests","definition":"FOREIGN KEY (founder_id) REFERENCES hka_profiles(id)"},{"name":"hka_link_requests_kind_check","table":"hka_link_requests","definition":"CHECK ((kind = ANY (ARRAY[''guardian''::text, ''coach''::text])))"},{"name":"hka_link_requests_pkey","table":"hka_link_requests","definition":"PRIMARY KEY (id)"},{"name":"hka_link_requests_status_check","table":"hka_link_requests","definition":"CHECK ((status = ANY (ARRAY[''pending_founder''::text, ''awaiting_consent''::text, ''awaiting_guardian''::text, ''approved''::text, ''rejected''::text, ''revoked''::text])))"},{"name":"hka_link_requests_student_id_fkey","table":"hka_link_requests","definition":"FOREIGN KEY (student_id) REFERENCES hka_profiles(id) ON DELETE CASCADE"},{"name":"hka_messages_body_check","table":"hka_messages","definition":"CHECK (((char_length(body) >= 1) AND (char_length(body) <= 4000)))"},{"name":"hka_messages_check","table":"hka_messages","definition":"CHECK ((sender_id <> recipient_id))"},{"name":"hka_messages_pkey","table":"hka_messages","definition":"PRIMARY KEY (id)"},{"name":"hka_messages_recipient_id_fkey","table":"hka_messages","definition":"FOREIGN KEY (recipient_id) REFERENCES hka_profiles(id) ON DELETE CASCADE"},{"name":"hka_messages_sender_id_fkey","table":"hka_messages","definition":"FOREIGN KEY (sender_id) REFERENCES hka_profiles(id) ON DELETE CASCADE"},{"name":"hka_messages_student_id_fkey","table":"hka_messages","definition":"FOREIGN KEY (student_id) REFERENCES hka_profiles(id) ON DELETE CASCADE"},{"name":"hka_profiles_banner_subtitle_check","table":"hka_profiles","definition":"CHECK (((banner_subtitle IS NULL) OR (char_length(banner_subtitle) <= 140)))"},{"name":"hka_profiles_birth_date_check","table":"hka_profiles","definition":"CHECK (((birth_date <= CURRENT_DATE) AND (birth_date > ''1900-01-01''::date)))"},{"name":"hka_profiles_check","table":"hka_profiles","definition":"CHECK (((avatar_path IS NULL) OR (avatar_path ~~ ((id)::text || ''/%''::text))))"},{"name":"hka_profiles_full_name_check","table":"hka_profiles","definition":"CHECK (((char_length(full_name) >= 1) AND (char_length(full_name) <= 100)))"},{"name":"hka_profiles_id_fkey","table":"hka_profiles","definition":"FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE"},{"name":"hka_profiles_membership_tier_check","table":"hka_profiles","definition":"CHECK ((membership_tier = ANY (ARRAY[''free''::text, ''basic''::text, ''premium''::text])))"},{"name":"hka_profiles_notification_preferences_check","table":"hka_profiles","definition":"CHECK ((jsonb_typeof(notification_preferences) = ''object''::text))"},{"name":"hka_profiles_pkey","table":"hka_profiles","definition":"PRIMARY KEY (id)"},{"name":"hka_profiles_role_check","table":"hka_profiles","definition":"CHECK ((role = ANY (ARRAY[''student''::text, ''guardian''::text, ''coach''::text, ''admin''::text])))"},{"name":"hka_profiles_timezone_check","table":"hka_profiles","definition":"CHECK (((char_length(timezone) >= 1) AND (char_length(timezone) <= 100)))"},{"name":"hka_student_link_codes_check","table":"hka_student_link_codes","definition":"CHECK (((uses >= 0) AND (uses <= max_uses)))"},{"name":"hka_student_link_codes_code_hash_key","table":"hka_student_link_codes","definition":"UNIQUE (code_hash)"},{"name":"hka_student_link_codes_kind_check","table":"hka_student_link_codes","definition":"CHECK ((kind = ANY (ARRAY[''guardian''::text, ''coach''::text])))"},{"name":"hka_student_link_codes_max_uses_check","table":"hka_student_link_codes","definition":"CHECK (((max_uses >= 1) AND (max_uses <= 10)))"},{"name":"hka_student_link_codes_pkey","table":"hka_student_link_codes","definition":"PRIMARY KEY (id)"},{"name":"hka_student_link_codes_student_id_fkey","table":"hka_student_link_codes","definition":"FOREIGN KEY (student_id) REFERENCES hka_profiles(id) ON DELETE CASCADE"}]'::jsonb then raise exception 'Hosted constraint reconstruction drift'; end if; end $hosted_check$;
set search_path=pg_catalog,public;
do $$ begin
 if (select jsonb_agg(to_jsonb(p) order by p.tablename,p.policyname) from pg_policies p
 where schemaname='public' and tablename=any(array['hka_messages','hka_profiles','hka_account_roles','hka_guardians','hka_coach_students','hka_link_requests','hka_student_link_codes']))
 is distinct from '[{"cmd":"SELECT","qual":"((user_id = auth.uid()) OR hka_admin())","roles":["authenticated"],"tablename":"hka_account_roles","permissive":"PERMISSIVE","policyname":"account_roles_read","schemaname":"public","with_check":null},{"cmd":"SELECT","qual":"(hka_admin() OR (coach_id = auth.uid()) OR hka_view_student(student_id))","roles":["authenticated"],"tablename":"hka_coach_students","permissive":"PERMISSIVE","policyname":"assignments_read","schemaname":"public","with_check":null},{"cmd":"ALL","qual":"hka_admin()","roles":["authenticated"],"tablename":"hka_coach_students","permissive":"PERMISSIVE","policyname":"assignments_write","schemaname":"public","with_check":"(hka_admin() AND (EXISTS ( SELECT 1\n   FROM hka_profiles\n  WHERE ((hka_profiles.id = hka_coach_students.coach_id) AND (hka_profiles.role = ANY (ARRAY[''coach''::text, ''admin''::text]))))) AND (EXISTS ( SELECT 1\n   FROM hka_profiles\n  WHERE ((hka_profiles.id = hka_coach_students.student_id) AND (hka_profiles.role = ''student''::text)))))"},{"cmd":"DELETE","qual":"hka_admin()","roles":["authenticated"],"tablename":"hka_guardians","permissive":"PERMISSIVE","policyname":"guardians_delete","schemaname":"public","with_check":null},{"cmd":"INSERT","qual":null,"roles":["authenticated"],"tablename":"hka_guardians","permissive":"PERMISSIVE","policyname":"guardians_insert","schemaname":"public","with_check":"(hka_admin() AND (verified_by = auth.uid()) AND (status = ''pending''::text) AND (consent_at IS NULL) AND (EXISTS ( SELECT 1\n   FROM hka_profiles\n  WHERE ((hka_profiles.id = hka_guardians.student_id) AND (hka_profiles.role = ''student''::text)))) AND (EXISTS ( SELECT 1\n   FROM hka_profiles\n  WHERE ((hka_profiles.id = hka_guardians.guardian_id) AND (hka_profiles.role = ''guardian''::text) AND (hka_profiles.birth_date <= ((CURRENT_DATE - ''18 years''::interval))::date)))))"},{"cmd":"SELECT","qual":"(hka_admin() OR (guardian_id = auth.uid()) OR (student_id = auth.uid()))","roles":["authenticated"],"tablename":"hka_guardians","permissive":"PERMISSIVE","policyname":"guardians_read","schemaname":"public","with_check":null},{"cmd":"SELECT","qual":"(hka_admin() OR (claimant_id = auth.uid()) OR (student_id = auth.uid()) OR (EXISTS ( SELECT 1\n   FROM hka_guardians g\n  WHERE ((g.student_id = hka_link_requests.student_id) AND (g.guardian_id = auth.uid()) AND (g.status = ''approved''::text) AND (g.consent_at IS NOT NULL)))))","roles":["authenticated"],"tablename":"hka_link_requests","permissive":"PERMISSIVE","policyname":"link_requests_read","schemaname":"public","with_check":null},{"cmd":"INSERT","qual":null,"roles":["authenticated"],"tablename":"hka_messages","permissive":"PERMISSIVE","policyname":"hka_messages_insert","schemaname":"public","with_check":"((sender_id = auth.uid()) AND (hka_admin() OR (hka_teach(student_id) AND ((recipient_id = student_id) OR (recipient_id IN ( SELECT g.guardian_id\n   FROM hka_guardians g\n  WHERE ((g.student_id = hka_messages.student_id) AND (g.status = ''approved''::text) AND (g.consent_at IS NOT NULL)))))) OR ((student_id = auth.uid()) AND (recipient_id IN ( SELECT cs.coach_id\n   FROM hka_coach_students cs\n  WHERE (cs.student_id = auth.uid())))) OR (hka_view_student(student_id) AND (EXISTS ( SELECT 1\n   FROM hka_profiles p\n  WHERE ((p.id = auth.uid()) AND (p.role = ''guardian''::text)))) AND ((recipient_id = student_id) OR (recipient_id IN ( SELECT cs.coach_id\n   FROM hka_coach_students cs\n  WHERE (cs.student_id = hka_messages.student_id)))))))"},{"cmd":"SELECT","qual":"(((auth.uid() = sender_id) OR (auth.uid() = recipient_id)) OR hka_admin() OR (hka_view_student(student_id) AND (EXISTS ( SELECT 1\n   FROM hka_profiles p\n  WHERE ((p.id = auth.uid()) AND (p.role = ''guardian''::text))))))","roles":["authenticated"],"tablename":"hka_messages","permissive":"PERMISSIVE","policyname":"hka_messages_read","schemaname":"public","with_check":null},{"cmd":"UPDATE","qual":"(recipient_id = auth.uid())","roles":["authenticated"],"tablename":"hka_messages","permissive":"PERMISSIVE","policyname":"hka_messages_update_read","schemaname":"public","with_check":"(recipient_id = auth.uid())"},{"cmd":"SELECT","qual":"((id = auth.uid()) OR hka_view_student(id))","roles":["authenticated"],"tablename":"hka_profiles","permissive":"PERMISSIVE","policyname":"profiles_read","schemaname":"public","with_check":null},{"cmd":"UPDATE","qual":"((id = auth.uid()) AND (hka_role() IS NOT NULL))","roles":["authenticated"],"tablename":"hka_profiles","permissive":"PERMISSIVE","policyname":"profiles_update","schemaname":"public","with_check":"((id = auth.uid()) AND ((avatar_path IS NULL) OR (EXISTS ( SELECT 1\n   FROM hka_files f\n  WHERE ((f.path = hka_profiles.avatar_path) AND (f.owner_id = auth.uid()) AND (f.purpose = ''avatar''::text))))) AND ((banner_path IS NULL) OR (split_part(banner_path, ''/''::text, 1) = (auth.uid())::text)))"},{"cmd":"SELECT","qual":"((student_id = auth.uid()) OR hka_admin())","roles":["authenticated"],"tablename":"hka_student_link_codes","permissive":"PERMISSIVE","policyname":"link_codes_read","schemaname":"public","with_check":null}]'::jsonb then
 raise exception 'Hosted baseline policy reconstruction drift' using detail=(
 select jsonb_agg(jsonb_build_object('name',e->>'policyname','expected',e,'actual',to_jsonb(p)))::text
 from jsonb_array_elements('[{"cmd":"SELECT","qual":"((user_id = auth.uid()) OR hka_admin())","roles":["authenticated"],"tablename":"hka_account_roles","permissive":"PERMISSIVE","policyname":"account_roles_read","schemaname":"public","with_check":null},{"cmd":"SELECT","qual":"(hka_admin() OR (coach_id = auth.uid()) OR hka_view_student(student_id))","roles":["authenticated"],"tablename":"hka_coach_students","permissive":"PERMISSIVE","policyname":"assignments_read","schemaname":"public","with_check":null},{"cmd":"ALL","qual":"hka_admin()","roles":["authenticated"],"tablename":"hka_coach_students","permissive":"PERMISSIVE","policyname":"assignments_write","schemaname":"public","with_check":"(hka_admin() AND (EXISTS ( SELECT 1\n   FROM hka_profiles\n  WHERE ((hka_profiles.id = hka_coach_students.coach_id) AND (hka_profiles.role = ANY (ARRAY[''coach''::text, ''admin''::text]))))) AND (EXISTS ( SELECT 1\n   FROM hka_profiles\n  WHERE ((hka_profiles.id = hka_coach_students.student_id) AND (hka_profiles.role = ''student''::text)))))"},{"cmd":"DELETE","qual":"hka_admin()","roles":["authenticated"],"tablename":"hka_guardians","permissive":"PERMISSIVE","policyname":"guardians_delete","schemaname":"public","with_check":null},{"cmd":"INSERT","qual":null,"roles":["authenticated"],"tablename":"hka_guardians","permissive":"PERMISSIVE","policyname":"guardians_insert","schemaname":"public","with_check":"(hka_admin() AND (verified_by = auth.uid()) AND (status = ''pending''::text) AND (consent_at IS NULL) AND (EXISTS ( SELECT 1\n   FROM hka_profiles\n  WHERE ((hka_profiles.id = hka_guardians.student_id) AND (hka_profiles.role = ''student''::text)))) AND (EXISTS ( SELECT 1\n   FROM hka_profiles\n  WHERE ((hka_profiles.id = hka_guardians.guardian_id) AND (hka_profiles.role = ''guardian''::text) AND (hka_profiles.birth_date <= ((CURRENT_DATE - ''18 years''::interval))::date)))))"},{"cmd":"SELECT","qual":"(hka_admin() OR (guardian_id = auth.uid()) OR (student_id = auth.uid()))","roles":["authenticated"],"tablename":"hka_guardians","permissive":"PERMISSIVE","policyname":"guardians_read","schemaname":"public","with_check":null},{"cmd":"SELECT","qual":"(hka_admin() OR (claimant_id = auth.uid()) OR (student_id = auth.uid()) OR (EXISTS ( SELECT 1\n   FROM hka_guardians g\n  WHERE ((g.student_id = hka_link_requests.student_id) AND (g.guardian_id = auth.uid()) AND (g.status = ''approved''::text) AND (g.consent_at IS NOT NULL)))))","roles":["authenticated"],"tablename":"hka_link_requests","permissive":"PERMISSIVE","policyname":"link_requests_read","schemaname":"public","with_check":null},{"cmd":"INSERT","qual":null,"roles":["authenticated"],"tablename":"hka_messages","permissive":"PERMISSIVE","policyname":"hka_messages_insert","schemaname":"public","with_check":"((sender_id = auth.uid()) AND (hka_admin() OR (hka_teach(student_id) AND ((recipient_id = student_id) OR (recipient_id IN ( SELECT g.guardian_id\n   FROM hka_guardians g\n  WHERE ((g.student_id = hka_messages.student_id) AND (g.status = ''approved''::text) AND (g.consent_at IS NOT NULL)))))) OR ((student_id = auth.uid()) AND (recipient_id IN ( SELECT cs.coach_id\n   FROM hka_coach_students cs\n  WHERE (cs.student_id = auth.uid())))) OR (hka_view_student(student_id) AND (EXISTS ( SELECT 1\n   FROM hka_profiles p\n  WHERE ((p.id = auth.uid()) AND (p.role = ''guardian''::text)))) AND ((recipient_id = student_id) OR (recipient_id IN ( SELECT cs.coach_id\n   FROM hka_coach_students cs\n  WHERE (cs.student_id = hka_messages.student_id)))))))"},{"cmd":"SELECT","qual":"(((auth.uid() = sender_id) OR (auth.uid() = recipient_id)) OR hka_admin() OR (hka_view_student(student_id) AND (EXISTS ( SELECT 1\n   FROM hka_profiles p\n  WHERE ((p.id = auth.uid()) AND (p.role = ''guardian''::text))))))","roles":["authenticated"],"tablename":"hka_messages","permissive":"PERMISSIVE","policyname":"hka_messages_read","schemaname":"public","with_check":null},{"cmd":"UPDATE","qual":"(recipient_id = auth.uid())","roles":["authenticated"],"tablename":"hka_messages","permissive":"PERMISSIVE","policyname":"hka_messages_update_read","schemaname":"public","with_check":"(recipient_id = auth.uid())"},{"cmd":"SELECT","qual":"((id = auth.uid()) OR hka_view_student(id))","roles":["authenticated"],"tablename":"hka_profiles","permissive":"PERMISSIVE","policyname":"profiles_read","schemaname":"public","with_check":null},{"cmd":"UPDATE","qual":"((id = auth.uid()) AND (hka_role() IS NOT NULL))","roles":["authenticated"],"tablename":"hka_profiles","permissive":"PERMISSIVE","policyname":"profiles_update","schemaname":"public","with_check":"((id = auth.uid()) AND ((avatar_path IS NULL) OR (EXISTS ( SELECT 1\n   FROM hka_files f\n  WHERE ((f.path = hka_profiles.avatar_path) AND (f.owner_id = auth.uid()) AND (f.purpose = ''avatar''::text))))) AND ((banner_path IS NULL) OR (split_part(banner_path, ''/''::text, 1) = (auth.uid())::text)))"},{"cmd":"SELECT","qual":"((student_id = auth.uid()) OR hka_admin())","roles":["authenticated"],"tablename":"hka_student_link_codes","permissive":"PERMISSIVE","policyname":"link_codes_read","schemaname":"public","with_check":null}]'::jsonb) e left join pg_policies p
 on p.schemaname='public' and p.tablename=e->>'tablename' and p.policyname=e->>'policyname'
 where e is distinct from to_jsonb(p));
 end if;
 if has_function_privilege('authenticated','public.hka_has_purpose(uuid,text)','EXECUTE') then raise exception 'Hosted helper ACL reconstruction drift'; end if;
 if exists(select 1 from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and not t.tgisinternal) then raise exception 'Unexpected reconstructed public trigger'; end if;
end $$;

commit;
-- PROPOSAL ONLY. Do not apply to connected Supabase without separate Founder approval.
-- Existing HKA auth, trusted Message Hollie Founder check, horses, ride logs and private bucket are prerequisites.
-- Private schema must remain outside exposed Data API schemas.
begin;
do $$ begin
 if to_regclass('public.hka_fitness_programmes') is not null then
  raise exception 'Fitness already exists; review schema before applying this proposal.';
 end if;
 if to_regprocedure('hka_messaging.founder(uuid)') is null then
  raise exception 'The reviewed HKA Founder identity check is required.';
 end if;
 if not exists(select 1 from storage.buckets where id='hka-private' and not public
  and (file_size_limit is null or file_size_limit>=10485760)
  and (allowed_mime_types is null or allowed_mime_types @> array['application/pdf','image/png','image/jpeg'])) then
  raise exception 'The private HKA bucket must support PDF, PNG and JPEG files up to 10 MB.';
 end if;
end $$;
create schema hka_fitness;
revoke all on schema hka_fitness from public,anon,authenticated,service_role;
grant usage on schema hka_fitness to authenticated;
create table hka_fitness.settings(id boolean primary key default true check(id),enabled boolean not null);
alter table hka_fitness.settings enable row level security;
insert into hka_fitness.settings values(true,false);
create function hka_fitness.enabled() returns boolean language sql stable security definer set search_path='' as $$
 select coalesce((select enabled from hka_fitness.settings where id),false)
$$;
create function hka_fitness.founder() returns boolean language sql stable security definer set search_path='' as $$
 select public.hka_admin() and public.hka_active() and coalesce(hka_messaging.founder(auth.uid()),false)
$$;
create function hka_fitness.can_view(person uuid) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and (
 hka_fitness.founder() or (public.hka_active() and public.hka_active(person) and (
 auth.uid()=person or
 (public.hka_role()='guardian' and exists(select 1 from public.hka_guardians g
 where g.student_id=person and g.guardian_id=auth.uid() and g.status='approved' and g.consent_at is not null))
 or (public.hka_coaches(person) and (
 exists(select 1 from public.hka_profiles p where p.id=person and p.birth_date<=(current_date-interval '18 years')::date)
 or exists(select 1 from public.hka_link_requests l where l.student_id=person and l.claimant_id=auth.uid()
 and l.kind='coach' and l.status='approved' and l.founder_approved_at is not null
 and l.guardian_consented_at is not null and l.revoked_at is null))))))
$$;
create function hka_fitness.owner(person uuid,horse uuid) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid()=person and public.hka_active() and
 (horse is null or exists(select 1 from public.hka_horses h where h.id=horse and h.student_id=person))
$$;
create function hka_fitness.valid_sessions(items jsonb) returns boolean language plpgsql immutable set search_path='' as $$
declare s jsonb; keys text[]='{}';
begin
 if jsonb_typeof(items) is distinct from 'array' then return false; end if;
 if jsonb_array_length(items) not between 1 and 35 then return false; end if;
 for s in select value from jsonb_array_elements(items) loop
  if jsonb_typeof(s) is distinct from 'object'
  or coalesce(length(s->>'key'),0) not between 1 and 100 or s->>'key'=any(keys)
  or coalesce(s->>'day','') !~ '^[0-6]$'
  or coalesce(length(btrim(s->>'title')),0) not between 1 and 160
  or coalesce(length(btrim(s->>'instructions')),0) not between 1 and 5000
  or coalesce(s->>'minutes','') !~ '^[0-9]{1,3}$'
  or (s->>'minutes')::int>240
  or coalesce(s->>'category','') not in ('strength','balance','mobility','stamina','conditioning','professional','rest')
  or (s->>'category'='rest' and (s->>'minutes')::int<>0) then return false; end if;
  keys=array_append(keys,s->>'key');
 end loop;
 return true;
exception when others then return false;
end $$;
create function hka_fitness.valid_intake(item jsonb) returns boolean language plpgsql immutable set search_path='' as $$
begin
 return coalesce(jsonb_typeof(item)='object' and octet_length(item::text)<=24000
 and jsonb_typeof(item->'disciplines')='array' and jsonb_typeof(item->'days')='array'
 and jsonb_typeof(item->'health')='array'
 and (item->>'minutes')::numeric between 5 and 240
 and ((item->>'age') is null or (item->>'age')::numeric between 0 and 110),false);
exception when others then return false;
end $$;
create table public.hka_fitness_intakes(
 id uuid primary key default gen_random_uuid(),student_id uuid not null references public.hka_profiles(id),
 horse_id uuid references public.hka_horses(id) on delete cascade,payload jsonb not null check(hka_fitness.valid_intake(payload)),
 updated_at timestamptz not null default now(),unique nulls not distinct(student_id,horse_id));
create table public.hka_fitness_programmes(
 id uuid primary key default gen_random_uuid(),student_id uuid not null references public.hka_profiles(id),
 horse_id uuid references public.hka_horses(id),kind text not null check(kind in ('rider','horse')),
 archived_horse_id uuid,archived_horse_name text,
 source text not null check(source in ('hka','owner','vet')),title text not null check(length(btrim(title)) between 1 and 160),
 status text not null default 'draft' check(status in ('draft','assigned','archived')),
 current_version_id uuid,draft_version_id uuid,created_at timestamptz not null default now(),
 check(
  (kind='rider' and horse_id is null and source='hka' and archived_horse_id is null and archived_horse_name is null)
  or (kind='horse' and (
   (horse_id is not null and archived_horse_id is null and archived_horse_name is null)
   or (horse_id is null and archived_horse_id is not null and archived_horse_name is not null and status='archived')
  ))
 ));
create unique index hka_fitness_current on public.hka_fitness_programmes(student_id,coalesce(horse_id,'00000000-0000-0000-0000-000000000000'::uuid),source) where status='assigned';
create table public.hka_fitness_versions(
 id uuid primary key default gen_random_uuid(),programme_id uuid not null references public.hka_fitness_programmes(id),
 version_number integer not null check(version_number>0),title text not null check(length(btrim(title)) between 1 and 160),
 intake jsonb not null check(hka_fitness.valid_intake(intake)),sessions jsonb not null check(hka_fitness.valid_sessions(sessions)),
 approved_at timestamptz,created_at timestamptz not null default now(),unique(programme_id,version_number));
alter table public.hka_fitness_programmes add constraint fitness_current_version foreign key(current_version_id) references public.hka_fitness_versions(id);
alter table public.hka_fitness_programmes add constraint fitness_draft_version foreign key(draft_version_id) references public.hka_fitness_versions(id);
create table public.hka_fitness_progress(
 id uuid primary key default gen_random_uuid(),version_id uuid not null references public.hka_fitness_versions(id),
 session_key text not null,session_date date not null,status text not null check(status in ('complete','skipped')),
 minutes integer not null check(minutes between 0 and 240),notes text not null default '' check(length(notes)<=5000),
 training_record_id uuid unique references public.hka_training_records(id) on delete set null,
 unique(version_id,session_key,session_date));
create table public.hka_fitness_templates(
 id uuid primary key default gen_random_uuid(),kind text not null check(kind in ('rider','horse')),
 title text not null check(length(btrim(title)) between 1 and 160),
 age_group text not null check(age_group in ('adult','young','horse')),sessions jsonb not null check(hka_fitness.valid_sessions(sessions)),
 check((kind='horse')=(age_group='horse')),created_at timestamptz not null default now());
create table public.hka_fitness_files(
 id uuid primary key,version_id uuid references public.hka_fitness_versions(id),template_id uuid references public.hka_fitness_templates(id),
 uploaded_by uuid not null references public.hka_profiles(id),original_name text not null check(length(original_name) between 1 and 255),
 path text not null unique check(path='fitness/'||id::text),mime_type text not null check(mime_type in ('application/pdf','image/png','image/jpeg')),
 size_bytes integer not null check(size_bytes between 1 and 10485760),created_at timestamptz not null default now(),
 check(num_nonnulls(version_id,template_id)=1));
create index fitness_versions_programme on public.hka_fitness_versions(programme_id);
create index fitness_progress_version on public.hka_fitness_progress(version_id);
create index fitness_files_version on public.hka_fitness_files(version_id);
create index fitness_files_template on public.hka_fitness_files(template_id);
create index fitness_programmes_horse on public.hka_fitness_programmes(horse_id);
create index fitness_intakes_horse on public.hka_fitness_intakes(horse_id) where horse_id is not null;

-- Normal horse removal keeps programme snapshots, completed sessions and private originals readable.
create function hka_fitness.archive_removed_horse() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 update public.hka_fitness_programmes
 set status='archived',archived_horse_id=old.id,archived_horse_name=old.name,horse_id=null
 where horse_id=old.id and student_id=old.student_id;
 return old;
end $$;
create trigger hka_fitness_archive_removed_horse before delete on public.hka_horses
 for each row execute function hka_fitness.archive_removed_horse();
create function hka_fitness.version_visible(target uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.hka_fitness_versions v join public.hka_fitness_programmes p on p.id=v.programme_id
 where v.id=target and hka_fitness.can_view(p.student_id) and (hka_fitness.founder() or v.approved_at is not null))
$$;
create function hka_fitness.file_editable(target_version uuid,target_template uuid) returns boolean language sql stable security definer set search_path='' as $$
 select hka_fitness.enabled() and auth.uid() is not null and
 ((target_template is not null and target_version is null and hka_fitness.founder() and exists(select 1 from public.hka_fitness_templates where id=target_template))
 or (target_template is null and exists(select 1 from public.hka_fitness_versions v join public.hka_fitness_programmes p on p.id=v.programme_id
 where v.id=target_version and p.archived_horse_id is null and ((p.source='hka' and hka_fitness.founder() and v.approved_at is null)
 or (p.source<>'hka' and hka_fitness.owner(p.student_id,p.horse_id) and p.current_version_id=v.id)))))
$$;
alter table public.hka_fitness_intakes enable row level security;
alter table public.hka_fitness_programmes enable row level security;
alter table public.hka_fitness_versions enable row level security;
alter table public.hka_fitness_progress enable row level security;
alter table public.hka_fitness_templates enable row level security;
alter table public.hka_fitness_files enable row level security;
create policy fitness_intakes_read on public.hka_fitness_intakes for select to authenticated using(hka_fitness.can_view(student_id));
create policy fitness_programmes_read on public.hka_fitness_programmes for select to authenticated
 using(hka_fitness.can_view(student_id) and (hka_fitness.founder() or current_version_id is not null));
create policy fitness_versions_read on public.hka_fitness_versions for select to authenticated using(hka_fitness.version_visible(id));
create policy fitness_progress_read on public.hka_fitness_progress for select to authenticated using(hka_fitness.version_visible(version_id));
create policy fitness_templates_read on public.hka_fitness_templates for select to authenticated using(hka_fitness.founder());
create policy fitness_templates_insert on public.hka_fitness_templates for insert to authenticated with check(hka_fitness.enabled() and hka_fitness.founder());
create policy fitness_files_read on public.hka_fitness_files for select to authenticated
 using((template_id is not null and hka_fitness.founder()) or hka_fitness.version_visible(version_id));
create policy fitness_files_insert on public.hka_fitness_files for insert to authenticated
 with check(uploaded_by=auth.uid() and hka_fitness.file_editable(version_id,template_id));
create policy fitness_files_delete on public.hka_fitness_files for delete to authenticated
 using(uploaded_by=auth.uid() and hka_fitness.file_editable(version_id,template_id)
 and not exists(select 1 from storage.objects o where o.bucket_id='hka-private' and o.name=path));
-- No general UPDATE/DELETE grants: versions, assignments and progress change only through checked RPCs.
revoke all on public.hka_fitness_intakes,public.hka_fitness_programmes,public.hka_fitness_versions,
 public.hka_fitness_progress,public.hka_fitness_templates,public.hka_fitness_files from public,anon,authenticated;
grant select on public.hka_fitness_intakes,public.hka_fitness_programmes,public.hka_fitness_versions,
 public.hka_fitness_progress,public.hka_fitness_templates,public.hka_fitness_files to authenticated;
grant insert on public.hka_fitness_templates,public.hka_fitness_files to authenticated;
grant delete on public.hka_fitness_files to authenticated;

create function hka_fitness.save_intake(target_student uuid,target_horse uuid,new_payload jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare result uuid;
begin
 if not hka_fitness.enabled() or not hka_fitness.owner(target_student,target_horse) then raise exception 'Active owner access required.' using errcode='42501'; end if;
 insert into public.hka_fitness_intakes(student_id,horse_id,payload) values(target_student,target_horse,new_payload)
 on conflict(student_id,horse_id) do update set payload=excluded.payload,updated_at=now() returning id into result;
 return result;
end $$;
create function hka_fitness.save_programme(target_programme uuid,target_student uuid,target_horse uuid,new_kind text,new_source text,new_title text,new_intake jsonb,new_sessions jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare p public.hka_fitness_programmes; v uuid; n integer;
begin
 if not hka_fitness.enabled() or auth.uid() is null or not (
 (new_source='hka' and hka_fitness.founder()) or
 (new_source in ('owner','vet') and new_kind='horse' and target_horse is not null and hka_fitness.owner(target_student,target_horse))
 ) then raise exception 'Founder or horse owner access required.' using errcode='42501'; end if;
 if not public.hka_active(target_student) or
 (target_horse is not null and not exists(select 1 from public.hka_horses h where h.id=target_horse and h.student_id=target_student)) then raise exception 'Programme subject is unavailable.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(target_student::text||coalesce(target_horse::text,'rider')||new_source,0));
 if target_programme is null then
  insert into public.hka_fitness_programmes(student_id,horse_id,kind,source,title)
  values(target_student,target_horse,new_kind,new_source,btrim(new_title)) returning * into p;
 else
  select * into p from public.hka_fitness_programmes where id=target_programme for update;
  if p.archived_horse_id is not null then raise exception 'Removed horse programmes are read-only.'; end if;
  if p.id is null or p.student_id<>target_student or p.horse_id is distinct from target_horse or p.kind<>new_kind or p.source<>new_source then raise exception 'Programme subject and source cannot change.'; end if;
 end if;
 select coalesce(max(version_number),0)+1 into n from public.hka_fitness_versions where programme_id=p.id;
 insert into public.hka_fitness_versions(programme_id,version_number,title,intake,sessions,approved_at)
 values(p.id,n,btrim(new_title),new_intake,new_sessions,case when new_source<>'hka' then now() end) returning id into v;
 if new_source='hka' then
  update public.hka_fitness_programmes set draft_version_id=v where id=p.id;
 else
  update public.hka_fitness_programmes set status='archived' where id<>p.id and student_id=p.student_id and horse_id=p.horse_id and source=p.source and status='assigned';
  update public.hka_fitness_programmes set current_version_id=v,status='assigned',title=btrim(new_title) where id=p.id;
 end if;
 return p.id;
end $$;
create function hka_fitness.assign(target_programme uuid,expected_draft uuid) returns void
language plpgsql security definer set search_path='' as $$
declare p public.hka_fitness_programmes; v public.hka_fitness_versions; age integer;
begin
 if not hka_fitness.enabled() or not hka_fitness.founder() then raise exception 'Founder approval required.' using errcode='42501'; end if;
 select * into p from public.hka_fitness_programmes where id=target_programme;
 if p.id is null or p.source<>'hka' then raise exception 'HKA draft unavailable.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p.student_id::text||coalesce(p.horse_id::text,'rider')||p.source,0));
 select * into p from public.hka_fitness_programmes where id=target_programme for update;
 if p.archived_horse_id is not null then raise exception 'Removed horse programmes are read-only.'; end if;
 if expected_draft is null or p.draft_version_id is distinct from expected_draft then raise exception 'Draft changed; reload and review before assigning.'; end if;
 if not public.hka_active(p.student_id) then raise exception 'Active member with required guardian consent needed.'; end if;
 select * into v from public.hka_fitness_versions where id=p.draft_version_id and programme_id=p.id;
 if v.id is null then raise exception 'Draft unavailable.'; end if;
 if p.kind='rider' then
  select extract(year from age(current_date,birth_date))::integer into age from public.hka_profiles where id=p.student_id;
  if (v.intake->>'age')::numeric is distinct from age::numeric then raise exception 'Review rider age against saved profile before assigning.'; end if;
 end if;
 if ((v.intake->>'age') is null or jsonb_array_length(v.intake->'health')>0
 or (p.kind='horse' and ((v.intake->>'age')::numeric<5 or (v.intake->>'age')::numeric>=18 or coalesce(nullif(btrim(v.intake->>'timeOff'),''),'Unknown')<>'None')))
 and (coalesce(length(btrim(v.intake->>'professionalInstructions')),0)=0
 or exists(select 1 from jsonb_array_elements(v.sessions) s where s->>'category' not in ('professional','rest'))) then
  raise exception 'Held programme requires professional guidance and permitted-work sessions before assignment.';
 end if;
 update public.hka_fitness_programmes set status='archived' where id<>p.id and student_id=p.student_id and horse_id is not distinct from p.horse_id and source='hka' and status='assigned';
 update public.hka_fitness_versions set approved_at=now() where id=v.id;
 update public.hka_fitness_programmes set current_version_id=v.id,draft_version_id=null,status='assigned',title=v.title where id=p.id;
end $$;
create function hka_fitness.record(target_version uuid,target_key text,work_date date,new_status text,actual_minutes integer,recovery_notes text) returns uuid
language plpgsql security definer set search_path='' as $$
declare
 p public.hka_fitness_programmes; v public.hka_fitness_versions; s jsonb;
 r public.hka_fitness_progress; today date; log_id uuid; log_notes text; was_complete boolean;
begin
 select * into v from public.hka_fitness_versions where id=target_version;
 select * into p from public.hka_fitness_programmes where id=v.programme_id for share;
 if not hka_fitness.enabled() or p.id is null or not hka_fitness.owner(p.student_id,p.horse_id) then raise exception 'Only active rider or horse owner can record work.' using errcode='42501'; end if;
 if p.status<>'assigned' or p.current_version_id<>v.id or v.approved_at is null then raise exception 'Only current assigned work can be recorded.'; end if;
 select value into s from jsonb_array_elements(v.sessions) where value->>'key'=target_key;
 select (now() at time zone timezone)::date into today from public.hka_profiles where id=auth.uid();
 if s is null or s->>'category'='rest' or work_date is null or work_date>today
 or extract(isodow from work_date)::int-1<>(s->>'day')::int then raise exception 'Choose a scheduled work day up to today.'; end if;
 if new_status is null or new_status not in ('complete','skipped') or actual_minutes is null or actual_minutes not between 0 and 240 or recovery_notes is null or length(recovery_notes)>5000 then raise exception 'Invalid progress details.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(target_version::text||target_key||work_date::text,0));
 select * into r from public.hka_fitness_progress where version_id=target_version and session_key=target_key and session_date=work_date for update;
 was_complete=coalesce(r.status='complete',false);
 if was_complete and new_status<>'complete' then raise exception 'Completed work is retained in history.'; end if;
 insert into public.hka_fitness_progress(version_id,session_key,session_date,status,minutes,notes)
 values(target_version,target_key,work_date,new_status,actual_minutes,recovery_notes)
 on conflict(version_id,session_key,session_date) do update set status=excluded.status,minutes=excluded.minutes,notes=excluded.notes returning * into r;
 if p.kind='horse' and new_status='complete' then
  log_notes='Fitness: '||(s->>'title')||' · '||actual_minutes||' minutes. '||recovery_notes;
  if r.training_record_id is not null then
   update public.hka_training_records set notes=log_notes
   where id=r.training_record_id and student_id=p.student_id and horse_id=p.horse_id and recorded_on=work_date;
   if not found then raise exception 'The linked ride log details changed. Check its horse and date before saving.'; end if;
  elsif not was_complete then
   insert into public.hka_training_records(student_id,horse_id,recorded_on,notes)
   values(p.student_id,p.horse_id,work_date,log_notes) returning id into log_id;
   update public.hka_fitness_progress set training_record_id=log_id where id=r.id;
  end if;
 end if;
 return r.id;
end $$;

-- Existing client calls these invoker wrappers; privileged implementation stays unexposed.
create function public.hka_fitness_is_founder() returns boolean
language sql stable security invoker set search_path='' as $$ select hka_fitness.founder() $$;
create function public.hka_fitness_save_intake(target_student uuid,target_horse uuid,new_payload jsonb) returns uuid
language sql security invoker set search_path='' as $$ select hka_fitness.save_intake(target_student,target_horse,new_payload) $$;
create function public.hka_fitness_save_programme(target_programme uuid,target_student uuid,target_horse uuid,new_kind text,new_source text,new_title text,new_intake jsonb,new_sessions jsonb) returns uuid
language sql security invoker set search_path='' as $$ select hka_fitness.save_programme(target_programme,target_student,target_horse,new_kind,new_source,new_title,new_intake,new_sessions) $$;
create function public.hka_fitness_assign(target_programme uuid,expected_draft uuid) returns void
language sql security invoker set search_path='' as $$ select hka_fitness.assign(target_programme,expected_draft) $$;
create function public.hka_fitness_record(target_version uuid,target_key text,work_date date,new_status text,actual_minutes integer,recovery_notes text) returns uuid
language sql security invoker set search_path='' as $$ select hka_fitness.record(target_version,target_key,work_date,new_status,actual_minutes,recovery_notes) $$;
revoke all on all functions in schema hka_fitness from public,anon,authenticated,service_role;
grant execute on function hka_fitness.enabled(),hka_fitness.founder(),hka_fitness.can_view(uuid),
 hka_fitness.valid_sessions(jsonb),hka_fitness.version_visible(uuid),hka_fitness.file_editable(uuid,uuid),
 hka_fitness.save_intake(uuid,uuid,jsonb),hka_fitness.save_programme(uuid,uuid,uuid,text,text,text,jsonb,jsonb),
 hka_fitness.assign(uuid,uuid),hka_fitness.record(uuid,text,date,text,integer,text) to authenticated;
revoke all on function public.hka_fitness_is_founder(),public.hka_fitness_save_intake(uuid,uuid,jsonb),public.hka_fitness_save_programme(uuid,uuid,uuid,text,text,text,jsonb,jsonb),
 public.hka_fitness_assign(uuid,uuid),public.hka_fitness_record(uuid,text,date,text,integer,text) from public,anon,authenticated;
grant execute on function public.hka_fitness_is_founder(),public.hka_fitness_save_intake(uuid,uuid,jsonb),public.hka_fitness_save_programme(uuid,uuid,uuid,text,text,text,jsonb,jsonb),
 public.hka_fitness_assign(uuid,uuid),public.hka_fitness_record(uuid,text,date,text,integer,text) to authenticated;

-- Immutable fitness originals, including under existing permissive Admin Storage policies.
create policy fitness_storage_keep_original_on_delete on storage.objects as restrictive for delete to authenticated
 using(bucket_id is distinct from 'hka-private' or name not like 'fitness/%');
create policy fitness_storage_keep_original_on_update on storage.objects as restrictive for update to authenticated
 using(bucket_id is distinct from 'hka-private' or name not like 'fitness/%')
 with check(bucket_id is distinct from 'hka-private' or name not like 'fitness/%');
create policy fitness_storage_read on storage.objects for select to authenticated using(bucket_id='hka-private' and exists(
 select 1 from public.hka_fitness_files f where f.path=objects.name));
create policy fitness_storage_insert on storage.objects for insert to authenticated with check(bucket_id='hka-private' and exists(
 select 1 from public.hka_fitness_files f
 where f.path=objects.name and f.uploaded_by=auth.uid() and hka_fitness.file_editable(f.version_id,f.template_id)
 and lower(objects.metadata->>'mimetype')=f.mime_type
 and case when jsonb_typeof(objects.metadata->'size')='number'
  then (objects.metadata->>'size')::numeric=f.size_bytes else false end));
notify pgrst,'reload schema';
commit;

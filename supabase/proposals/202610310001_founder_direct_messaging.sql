-- PROPOSED ONLY. Separate Founder approval required; never auto-apply.
-- Project: sqaydpbqycvaictieafk. Reviewed metadata: 2026-10-31.
-- No assignments, profile roles, guardians, consent or existing messages are changed.
begin;

do $$
begin
 if not exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
   where n.nspname='public' and c.relname='hka_messages' and c.relrowsecurity) then
  raise exception 'Messaging RLS must already be enabled.';
 end if;
 if (select count(*) from pg_policies where schemaname='public' and tablename='hka_messages') <> 3
 or exists(select 1 from pg_policies where schemaname='public' and tablename='hka_messages'
   and policyname not in ('hka_messages_read','hka_messages_insert','hka_messages_update_read')) then
  raise exception 'Messaging policy snapshot changed; review before applying.';
 end if;
end $$;

-- A direct conversation with a parent, coach or horse owner need not invent a student.
alter table public.hka_messages alter column student_id drop not null;

create function public.hka_message_founder(person uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select coalesce(public.hka_active(person) and public.hka_has_purpose(person,'admin')
  and exists(select 1 from public.hka_profiles p where p.id=person and p.role='admin'),false)
$$;

create function public.hka_message_guardian(guardian uuid, student uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select coalesce(public.hka_active(guardian) and public.hka_active(student)
  and public.hka_has_purpose(guardian,'guardian')
  and exists(select 1 from public.hka_profiles p where p.id=guardian and p.role='guardian')
  and exists(select 1 from public.hka_guardians g where g.guardian_id=guardian
   and g.student_id=student and g.status='approved' and g.consent_at is not null),false)
$$;

create function public.hka_message_coach(coach uuid, student uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select coalesce(public.hka_active(coach) and public.hka_active(student)
  and public.hka_has_purpose(coach,'coach')
  and exists(select 1 from public.hka_profiles p where p.id=coach and p.role='coach')
  and exists(select 1 from public.hka_profiles p where p.id=student and p.role='student'
    and (p.birth_date <= (current_date-interval '18 years')::date
      or exists(select 1 from public.hka_link_requests r where r.student_id=student
        and r.claimant_id=coach and r.kind='coach' and r.status='approved'
        and r.founder_approved_at is not null and r.guardian_consented_at is not null
        and r.revoked_at is null)))
  and exists(select 1 from public.hka_coach_students cs where cs.coach_id=coach and cs.student_id=student),false)
$$;

-- Canonical Founder/student scope preserves guardian oversight of the child's messages.
-- Other Founder pairs have NULL scope. Historic scoped Founder/parent rows remain history.
create function public.hka_message_direct_scope(actor uuid, peer uuid) returns uuid
language sql stable security definer set search_path='' as $$
 select p.id from public.hka_profiles p where p.id in (actor,peer) and p.role='student'
  and (public.hka_message_founder(actor) or public.hka_message_founder(peer)) limit 1
$$;

create function public.hka_message_can_send(actor uuid, student uuid, peer uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select coalesce(actor=auth.uid() and actor<>peer and public.hka_active(actor) and public.hka_active(peer) and (
  ((public.hka_message_founder(actor) or public.hka_message_founder(peer))
   and student is not distinct from public.hka_message_direct_scope(actor,peer))
  or (student is not null and (
   (actor=student and public.hka_message_coach(peer,student))
   or (peer=student and public.hka_message_coach(actor,student))
   or (actor=student and public.hka_message_guardian(peer,student))
   or (peer=student and public.hka_message_guardian(actor,student))
   or (public.hka_message_guardian(actor,student) and public.hka_message_coach(peer,student))
   or (public.hka_message_coach(actor,student) and public.hka_message_guardian(peer,student))
  ))
 ),false)
$$;

create function public.hka_message_can_read(student uuid, sender uuid, recipient uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select coalesce(public.hka_active(auth.uid()) and (
  auth.uid() in (sender,recipient)
  or (student is not null and public.hka_message_guardian(auth.uid(),student)
   and (student in (sender,recipient)
    or (public.hka_message_coach(sender,student) and public.hka_message_guardian(recipient,student))
    or (public.hka_message_coach(recipient,student) and public.hka_message_guardian(sender,student))))
 ),false)
$$;

-- Minimal identity projection. No emails, DOBs, tokens, onboarding or private profile fields.
-- Founder directory is complete; everyone else receives only authorised peers/history.
create function public.hka_message_contacts()
returns table(id uuid, full_name text, role text, role_label text, student_id uuid,
 student_name text, relationship text, can_message boolean, directory_entry boolean, created_at timestamptz)
language sql stable security definer set search_path='' as $$
 with actor as (select auth.uid() as id),
 candidates as (
  select p.id,public.hka_message_direct_scope(a.id,p.id) as student_id
   from public.hka_profiles p cross join actor a
   where public.hka_message_founder(a.id) or public.hka_message_founder(p.id)
  union
  select case when cs.coach_id=a.id then cs.student_id else cs.coach_id end,cs.student_id
   from public.hka_coach_students cs cross join actor a where a.id in (cs.coach_id,cs.student_id)
  union
  select case when g.guardian_id=a.id then g.student_id else g.guardian_id end,g.student_id
   from public.hka_guardians g cross join actor a where a.id in (g.guardian_id,g.student_id)
  union
  select case when g.guardian_id=a.id then cs.coach_id else g.guardian_id end,g.student_id
   from public.hka_guardians g join public.hka_coach_students cs on cs.student_id=g.student_id
   cross join actor a where a.id in (g.guardian_id,cs.coach_id)
  union
  select participants.id,case when public.hka_message_founder(m.sender_id)
    or public.hka_message_founder(m.recipient_id)
    then public.hka_message_direct_scope(m.sender_id,m.recipient_id) else m.student_id end
   from public.hka_messages m
   cross join lateral (values(m.sender_id),(m.recipient_id)) participants(id)
   where public.hka_message_can_read(m.student_id,m.sender_id,m.recipient_id)
 ),
 normalised as (
  select distinct c.id,case when public.hka_message_founder(a.id) or public.hka_message_founder(c.id)
    then public.hka_message_direct_scope(a.id,c.id) else c.student_id end as student_id
  from candidates c cross join actor a
 ),
 projected as (
  select p.id,p.full_name,p.role,
   case when public.hka_has_purpose(p.id,'admin') and p.role='admin' then 'Founder / Admin'
    else coalesce((select string_agg(case ar.purpose when 'student' then 'Student'
      when 'guardian' then 'Parent / Guardian' when 'coach' then 'Coach'
      when 'horse_owner' then 'Horse Owner' end,' / ' order by ar.purpose)
     from public.hka_account_roles ar where ar.user_id=p.id and ar.status='authorized'
      and ar.purpose<>'admin'),'Awaiting approval') end as role_label,
   c.student_id,s.full_name as student_name,
   case when public.hka_message_founder(a.id) or public.hka_message_founder(p.id)
     then 'Founder direct message'
    when public.hka_message_coach(a.id,c.student_id) or public.hka_message_coach(p.id,c.student_id)
     then 'Assigned coaching relationship' else 'Approved family relationship' end as relationship,
   public.hka_message_can_send(a.id,c.student_id,p.id) as can_message,
   public.hka_message_founder(a.id) as directory_entry,p.created_at
  from normalised c join public.hka_profiles p on p.id=c.id
  left join public.hka_profiles s on s.id=c.student_id cross join actor a
  where a.id<>p.id and public.hka_active(a.id)
   and (public.hka_message_founder(a.id) or public.hka_message_can_send(a.id,c.student_id,p.id)
    or exists(select 1 from public.hka_messages m where p.id in (m.sender_id,m.recipient_id)
     and public.hka_message_can_read(m.student_id,m.sender_id,m.recipient_id)
     and (m.student_id is not distinct from c.student_id
      or public.hka_message_founder(m.sender_id) or public.hka_message_founder(m.recipient_id))))
 )
 select distinct * from projected order by full_name,id,student_id
$$;

-- Definer helpers are private. Only the caller-bound policy entry points and
-- contact projection are executable by authenticated clients.
revoke all on function public.hka_message_founder(uuid),
 public.hka_message_guardian(uuid,uuid),public.hka_message_coach(uuid,uuid),
 public.hka_message_direct_scope(uuid,uuid),public.hka_message_can_send(uuid,uuid,uuid),
 public.hka_message_can_read(uuid,uuid,uuid),public.hka_message_contacts() from public,anon,authenticated;
grant execute on function public.hka_message_can_send(uuid,uuid,uuid),
 public.hka_message_can_read(uuid,uuid,uuid),public.hka_message_contacts() to authenticated;

drop policy hka_messages_insert on public.hka_messages;
drop policy hka_messages_read on public.hka_messages;
drop policy hka_messages_update_read on public.hka_messages;
create policy hka_messages_insert on public.hka_messages for insert to authenticated
 with check(sender_id=auth.uid() and read_at is null
  and char_length(btrim(body)) between 1 and 4000
  and public.hka_message_can_send(auth.uid(),student_id,recipient_id));
create policy hka_messages_read on public.hka_messages for select to authenticated
 using(public.hka_message_can_read(student_id,sender_id,recipient_id));
create policy hka_messages_update_read on public.hka_messages for update to authenticated
 using(recipient_id=auth.uid() and public.hka_message_can_read(student_id,sender_id,recipient_id))
 with check(recipient_id=auth.uid() and public.hka_message_can_read(student_id,sender_id,recipient_id));

create function public.hka_message_guard_write() returns trigger
language plpgsql set search_path='' as $$
begin
 if tg_op='INSERT' then
  if new.sender_id is distinct from auth.uid() or new.read_at is not null then
   raise exception 'Message identity or state is not authorised.' using errcode='42501';
  end if;
  new.created_at:=now();
 else
  if auth.uid() is distinct from old.recipient_id
    or (to_jsonb(new)-'read_at') is distinct from (to_jsonb(old)-'read_at') then
   raise exception 'Only the recipient may mark a message read.' using errcode='42501';
  end if;
  if new.read_at is null then
   raise exception 'Read status cannot be cleared.' using errcode='42501';
  end if;
  new.read_at:=coalesce(old.read_at,now());
 end if;
 return new;
end $$;
revoke all on function public.hka_message_guard_write() from public,anon,authenticated;
create trigger hka_message_guard_write before insert or update on public.hka_messages
 for each row execute function public.hka_message_guard_write();

-- Also constrain column privileges, even if an earlier deployment granted table UPDATE.
revoke update on public.hka_messages from public,anon,authenticated;
revoke update(id,student_id,sender_id,recipient_id,body,created_at) on public.hka_messages from public,anon,authenticated;
grant select,insert on public.hka_messages to authenticated;
grant update(read_at) on public.hka_messages to authenticated;
notify pgrst,'reload schema';
commit;

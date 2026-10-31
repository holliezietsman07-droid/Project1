-- PROPOSED ONLY. Separate Founder approval required.
-- Permission rollback restores the three observed 2026-10-31 policy expressions.
-- Keep nullable student_id and tightened UPDATE privileges/identity trigger:
-- they preserve new non-student history and prevent sender/content impersonation.
-- Never delete messages to recover NOT NULL. Restore frontend checkpoint alongside this.
begin;
drop policy hka_messages_insert on public.hka_messages;
drop policy hka_messages_read on public.hka_messages;
drop policy hka_messages_update_read on public.hka_messages;
create policy hka_messages_insert on public.hka_messages for insert to public
 with check(sender_id=auth.uid() and (
  public.hka_admin()
  or (public.hka_teach(student_id) and (recipient_id=student_id
   or recipient_id in (select g.guardian_id from public.hka_guardians g
    where g.student_id=hka_messages.student_id and g.status='approved' and g.consent_at is not null)))
  or (student_id=auth.uid() and recipient_id in
   (select cs.coach_id from public.hka_coach_students cs where cs.student_id=auth.uid()))
  or (public.hka_view_student(student_id) and exists
   (select 1 from public.hka_profiles p where p.id=auth.uid() and p.role='guardian')
   and (recipient_id=student_id or recipient_id in
    (select cs.coach_id from public.hka_coach_students cs where cs.student_id=hka_messages.student_id)))
 ));
create policy hka_messages_read on public.hka_messages for select to public
 using(auth.uid()=sender_id or auth.uid()=recipient_id or public.hka_admin()
  or (public.hka_view_student(student_id) and exists
   (select 1 from public.hka_profiles p where p.id=auth.uid() and p.role='guardian')));
create policy hka_messages_update_read on public.hka_messages for update to public
 using(recipient_id=auth.uid()) with check(recipient_id=auth.uid());
drop function public.hka_message_contacts();
drop function public.hka_message_can_read(uuid,uuid,uuid);
drop function public.hka_message_can_send(uuid,uuid,uuid);
drop function public.hka_message_direct_scope(uuid,uuid);
drop function public.hka_message_coach(uuid,uuid);
drop function public.hka_message_guardian(uuid,uuid);
drop function public.hka_message_founder(uuid);
-- hka_message_guard_write trigger/function intentionally retained as security hardening.
notify pgrst,'reload schema';
commit;

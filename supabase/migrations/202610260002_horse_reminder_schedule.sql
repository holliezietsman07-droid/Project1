-- Prepared only: inactive horse-care reminder controls.
-- No extension, job, scheduler, network request, or email delivery is created here.
begin;
insert into public.hka_settings(id,value) values ('horse_care_reminder_generation_enabled','false'),('horse_care_email_delivery_enabled','false'),('horse_care_email_kill_switch','true'),('horse_care_email_send_local_time','07:00') on conflict(id) do update set value=excluded.value;
-- Scheduling intentionally omitted. pg_cron is not installed or modified.
-- Email and reminder generation remain disabled until separately approved.
commit;

-- Stage 4B founder activation. Previous marker: "vite/client" />

-- Prepared only; requires explicit owner approval.
-- Existing admin role represents Founder, Owner and Head Coach permissions.
begin;
do language plpgsql '
declare
  target_id constant uuid := ''f7c3e52e-4f5e-47d0-8139-b28cb296d526''::uuid;
  account_name text;
  current_role text;
  is_suspended boolean;
  confirmed_at timestamptz;
begin
  select p.full_name, p.role, p.suspended, u.email_confirmed_at
    into account_name, current_role, is_suspended, confirmed_at
  from public.hka_profiles p
  join auth.users u on u.id = p.id
  where p.id = target_id
  for update of p;
  if not found then raise exception ''Verified founder account was not found.''; end if;
  if account_name <> ''Hollie Zietsman'' then raise exception ''Founder account identity does not match the reviewed profile.''; end if;
  if confirmed_at is null or is_suspended then raise exception ''Founder account must be confirmed and active.''; end if;
  if current_role not in (''student'', ''admin'') then raise exception ''Unexpected existing role: %'', current_role; end if;
  if current_role <> ''admin'' then
    update public.hka_profiles set role = ''admin'' where id = target_id;
    insert into public.hka_audit(actor_id, target_id, action)
    values (null, target_id, ''Owner-approved founder bootstrap: administrator role assigned'');
  end if;
end';
commit;
-- No email-based authorization or client-side bootstrap is used.

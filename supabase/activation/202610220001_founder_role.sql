-- Stage 4B founder activation. Previous marker: "vite/client" />

-- Prepared only; requires explicit owner approval.
-- Existing admin role represents Founder, Owner and Head Coach permissions.
begin;
do language plpgsql '
declare
  target_id constant uuid := ''f7c3e52e-4f5e-47d0-8139-b28cb296d526''::uuid;
  account_name text;
  account_role text;
  is_suspended boolean;
  confirmed_at timestamptz;
  matched_accounts integer;
  affected_profiles integer;
  inserted_audits integer;
begin
  select count(*)
    into matched_accounts
  from public.hka_profiles p
  join auth.users u on u.id = p.id
  where p.id = target_id;
  if matched_accounts <> 1 then raise exception ''Expected exactly one verified founder account; found %.'', matched_accounts; end if;

  select p.full_name, p.role, p.suspended, u.email_confirmed_at
    into account_name, account_role, is_suspended, confirmed_at
  from public.hka_profiles p
  join auth.users u on u.id = p.id
  where p.id = target_id
  for update of p;
  if not found then raise exception ''Verified founder account was not found.''; end if;
  if account_name <> ''Hollie Zietsman'' then raise exception ''Founder account identity does not match the reviewed profile.''; end if;
  if confirmed_at is null or is_suspended then raise exception ''Founder account must be confirmed and active.''; end if;
  if account_role <> ''student'' then raise exception ''Unexpected existing account role: %'', account_role; end if;

  update public.hka_profiles as p
  set role = ''admin''
  where p.id = target_id
    and p.role = ''student'';
  get diagnostics affected_profiles = row_count;
  if affected_profiles <> 1 then raise exception ''Expected exactly one founder profile update; affected %.'', affected_profiles; end if;

  insert into public.hka_audit(actor_id, target_id, action)
  values (null, target_id, ''Owner-approved founder bootstrap: administrator role assigned'');
  get diagnostics inserted_audits = row_count;
  if inserted_audits <> 1 then raise exception ''Expected exactly one founder activation audit row; inserted %.'', inserted_audits; end if;
end';
commit;
-- No email-based authorization or client-side bootstrap is used.

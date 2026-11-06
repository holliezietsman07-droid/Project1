-- Allow coach-only registration while coaching access remains pending Founder approval.
-- SECURITY DEFINER retains an empty search_path; pgcrypto calls remain schema-qualified.
begin;

create or replace function public.hka_signup_profile()
returns trigger language plpgsql security definer set search_path='' as $function$
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
$function$;

revoke execute on function public.hka_signup_profile() from public,anon,authenticated;

commit;

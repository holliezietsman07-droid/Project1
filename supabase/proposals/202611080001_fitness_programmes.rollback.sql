-- PROPOSAL ONLY. Separate Founder approval is required before running on live.
-- Keep the app setting enabled when members should be able to read approved history.
begin;
update hka_fitness.settings set enabled=false where id;
revoke insert on public.hka_fitness_templates,public.hka_fitness_files from authenticated;
revoke delete on public.hka_fitness_files from authenticated;
-- Read grants and restrictive Storage mutation policies stay in force.
-- Existing horse and ride-log removals can still archive or detach history.
notify pgrst,'reload schema';
commit;

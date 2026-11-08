-- PROPOSAL ONLY: freezes writes; retains history, private originals and linked ride logs.
-- Disable VITE_FITNESS_DATABASE_ENABLED in app settings before separately approving rollback.
begin;
update hka_fitness.settings set enabled=false where id;
revoke insert on public.hka_fitness_templates,public.hka_fitness_files from authenticated;
revoke delete on public.hka_fitness_files from authenticated;
-- Read permissions remain; all checked write RPCs reject when disabled.
-- No DROP/CASCADE, file deletion or feed changes.
notify pgrst,'reload schema';
commit;

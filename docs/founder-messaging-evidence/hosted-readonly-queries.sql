BEGIN TRANSACTION READ ONLY; SET LOCAL search_path=pg_catalog,public;
SELECT jsonb_build_object('captured_at',now(),'postgres_version',version(),
'policies',(SELECT jsonb_agg(to_jsonb(p) ORDER BY policyname) FROM pg_policies p WHERE schemaname='public' AND tablename='hka_messages'),
'api_settings',jsonb_build_object('pgrst.db_schemas',current_setting('pgrst.db_schemas',true),'pgrst.db_extra_search_path',current_setting('pgrst.db_extra_search_path',true)),
'role_database_api_settings',(SELECT coalesce(jsonb_agg(jsonb_build_object('database',d.datname,'role',r.rolname,'settings',s.setconfig)),'[]'::jsonb) FROM pg_db_role_setting s LEFT JOIN pg_database d ON d.oid=s.setdatabase LEFT JOIN pg_roles r ON r.oid=s.setrole WHERE EXISTS(SELECT 1 FROM unnest(s.setconfig) setting WHERE setting LIKE 'pgrst.%')),
'graphql_extension',(SELECT jsonb_agg(jsonb_build_object('name',e.extname,'version',e.extversion,'schema',n.nspname)) FROM pg_extension e JOIN pg_namespace n ON n.oid=e.extnamespace WHERE e.extname='pg_graphql'),
'collisions',jsonb_build_object('private_schema_exists',to_regnamespace('hka_messaging') IS NOT NULL,'public_message_functions',(SELECT coalesce(jsonb_agg(p.proname),'[]'::jsonb) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname LIKE 'hka_message_%')),
'migration_history',(SELECT jsonb_agg(jsonb_build_object('version',version,'name',name) ORDER BY version) FROM supabase_migrations.schema_migrations),
'message_grants',(SELECT jsonb_agg(to_jsonb(g)) FROM (SELECT grantee,privilege_type FROM information_schema.role_table_grants WHERE table_schema='public' AND table_name='hka_messages') g),
'profile_column_grants',(SELECT jsonb_agg(to_jsonb(g)) FROM (SELECT grantee,column_name,privilege_type FROM information_schema.column_privileges WHERE table_schema='public' AND table_name='hka_profiles' AND grantee='authenticated') g)
) AS snapshot; COMMIT;

BEGIN TRANSACTION READ ONLY; SET LOCAL search_path=pg_catalog,public;
SELECT jsonb_build_object('captured_at',now(),
'constraints',(SELECT jsonb_agg(jsonb_build_object('table',c.conrelid::regclass::text,'name',c.conname,'definition',pg_get_constraintdef(c.oid)) ORDER BY c.conrelid::regclass::text,c.conname) FROM pg_constraint c WHERE c.conrelid IN (SELECT cl.oid FROM pg_class cl JOIN pg_namespace n ON n.oid=cl.relnamespace WHERE n.nspname='public' AND cl.relname IN ('hka_messages','hka_profiles','hka_account_roles','hka_guardians','hka_coach_students','hka_link_requests','hka_student_link_codes'))),
'triggers',(SELECT coalesce(jsonb_agg(jsonb_build_object('table',t.tgrelid::regclass::text,'name',t.tgname,'enabled',t.tgenabled,'definition',pg_get_triggerdef(t.oid))),'[]'::jsonb) FROM pg_trigger t WHERE NOT t.tgisinternal AND t.tgrelid IN (SELECT cl.oid FROM pg_class cl JOIN pg_namespace n ON n.oid=cl.relnamespace WHERE n.nspname='public' AND cl.relname IN ('hka_messages','hka_profiles','hka_account_roles','hka_guardians','hka_coach_students','hka_link_requests','hka_student_link_codes'))),
'functions',(SELECT jsonb_agg(jsonb_build_object('name',p.proname,'signature',p.oid::regprocedure::text,'definition',pg_get_functiondef(p.oid),'owner',pg_get_userbyid(p.proowner),'acl',p.proacl) ORDER BY p.proname) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname IN ('hka_role','hka_admin','hka_active','hka_teach','hka_view_student','hka_signup_profile','hka_has_purpose','hka_coaches'))
) AS snapshot; COMMIT;

BEGIN TRANSACTION READ ONLY; SET LOCAL search_path=pg_catalog,public;
SELECT jsonb_build_object(
'policies',(SELECT jsonb_agg(to_jsonb(p) ORDER BY p.tablename,p.policyname) FROM pg_policies p WHERE schemaname='public' AND tablename IN ('hka_messages','hka_profiles','hka_account_roles','hka_guardians','hka_coach_students','hka_link_requests','hka_student_link_codes')),
'message_column_grants',(SELECT jsonb_agg(to_jsonb(c)) FROM (SELECT grantee,column_name,privilege_type FROM information_schema.column_privileges WHERE table_schema='public' AND table_name='hka_messages' AND grantee IN ('anon','authenticated','service_role')) c),
'indexes',(SELECT jsonb_agg(to_jsonb(i)) FROM (SELECT tablename,indexname,indexdef FROM pg_indexes WHERE schemaname='public' AND tablename IN ('hka_messages','hka_account_roles')) i)
) AS snapshot; COMMIT;
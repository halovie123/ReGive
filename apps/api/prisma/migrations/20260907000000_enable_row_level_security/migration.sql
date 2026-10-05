-- Close the Supabase Data API over our tables.
--
-- Supabase serves every table in the public schema over its REST Data API
-- (PostgREST), authenticated by the anon key -- which is public by design and
-- ships in the web bundle. Its default privileges grant the anon and
-- authenticated roles ALL on every table the migration role creates, and
-- none of our tables had row level security. Anyone holding the anon key
-- could therefore read and rewrite users, profiles, roles and areas
-- directly, bypassing the API entirely. Reproduced against Postgres 17 with
-- Supabase's default grants: as anon, SELECT on users returned rows and an
-- UPDATE suspended an account.
--
-- ReGive never uses the Data API: the web talks to Supabase only for Auth,
-- and every read and write goes through the NestJS API, which connects as
-- the table owner. Owners are exempt from RLS, so enabling it with no
-- policies changes nothing for the API and denies everyone else.

-- 1. RLS on every table that exists now, including _prisma_migrations.
--    Tables added by later migrations must enable it themselves;
--    row-level-security-db.e2e-spec.ts fails if one does not.
DO $$
DECLARE
  table_name text;
BEGIN
  FOR table_name IN
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
  END LOOP;
END $$;

-- 2. Belt and braces on Supabase: take back the grants, including the
--    default ones for future tables, so the tables also disappear from the
--    Data API's published schema. The roles exist only on Supabase; plain
--    Postgres (local, CI without emulation) skips this.
DO $$
DECLARE
  api_role text;
BEGIN
  FOREACH api_role IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = api_role) THEN
      EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA public FROM %I', api_role);
      EXECUTE format('REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM %I', api_role);
      EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM %I', api_role);
      EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM %I', api_role);
    END IF;
  END LOOP;
END $$;

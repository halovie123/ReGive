import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const runDatabaseTests = process.env.RUN_DATABASE_TESTS === 'true';
const testDatabaseUrl = process.env.TEST_DATABASE_URL;

if (runDatabaseTests && !testDatabaseUrl) {
  throw new Error('TEST_DATABASE_URL is required when RUN_DATABASE_TESTS=true');
}

const describeDatabase = runDatabaseTests ? describe : describe.skip;

/**
 * Supabase serves every public table over its Data API using the anon key,
 * which ships in the web bundle. Until migration
 * 20260907000000_enable_row_level_security, that let anyone read and
 * rewrite users and profiles without going through the API.
 *
 * These guard every table, including ones added by future migrations: a
 * new table without RLS fails here. CI creates Supabase's anon and
 * authenticated roles (prisma/ci/emulate-supabase-roles.sql) before
 * migrating, so the grant checks run against production-like defaults.
 */
describeDatabase('Row level security (e2e)', () => {
  let prisma: PrismaClient;

  beforeAll(() => {
    prisma = new PrismaClient({
      adapter: new PrismaPg({ connectionString: testDatabaseUrl as string }),
    });
  });

  afterAll(async () => {
    await prisma?.$disconnect();
  });

  it('is enabled on every table in the public schema', async () => {
    const tables = await prisma.$queryRaw<{ table: string; rls: boolean }[]>`
      SELECT c.relname AS "table", c.relrowsecurity AS "rls"
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind = 'r'
      ORDER BY c.relname
    `;

    expect(tables.length).toBeGreaterThan(0);
    expect(
      tables.filter((table) => !table.rls).map((table) => table.table),
    ).toEqual([]);
  });

  it('leaves the Data API roles no privileges on any table', async () => {
    const roles = await prisma.$queryRaw<{ rolname: string }[]>`
      SELECT rolname FROM pg_roles WHERE rolname IN ('anon', 'authenticated')
    `;
    if (roles.length === 0) {
      // Plain Postgres without the emulation script: nothing to check.
      return;
    }

    const granted = await prisma.$queryRaw<
      { grantee: string; table: string }[]
    >`
      SELECT grantee, table_name AS "table"
      FROM information_schema.role_table_grants
      WHERE table_schema = 'public' AND grantee IN ('anon', 'authenticated')
    `;

    expect(granted).toEqual([]);
  });
});

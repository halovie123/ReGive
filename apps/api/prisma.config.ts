import { defineConfig } from 'prisma/config';

// `prisma generate` doesn't need a live connection, only a syntactically
// valid URL — fall back to a placeholder so `postinstall` can generate the
// client on a fresh checkout before any `.env` exists (e.g. CI's install
// step, which runs before DATABASE_URL is set). Commands that actually
// connect (migrate, db pull, the running app) still need a real
// DATABASE_URL and will fail naturally if one isn't set.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env.DATABASE_URL ?? 'postgresql://unset:unset@localhost:5432/unset',
  },
});

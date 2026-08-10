import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL: 'http://127.0.0.1:3000',
    ...devices['Desktop Chrome'],
  },
  webServer: {
    // --webpack: see the comment in next.config.ts. Turbopack (the `next
    // dev` default) cannot currently resolve @buy-nothing/contracts'
    // NodeNext-style internal ".js" specifiers; webpack can via
    // resolve.extensionAlias configured there.
    command: 'corepack pnpm exec next dev -p 3000 --webpack',
    url: 'http://127.0.0.1:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});

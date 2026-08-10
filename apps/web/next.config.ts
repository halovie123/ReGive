import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @buy-nothing/contracts (packages/contracts) is a workspace package
  // consumed as raw TypeScript source (its package.json "exports" points
  // straight at "./src/index.ts", with no build step). Because that
  // package's own tsconfig uses moduleResolution: "NodeNext", its
  // internal re-exports use explicit ".js" specifiers even though only
  // the sibling ".ts" file exists on disk (e.g. `export * from
  // './enums.js'`, no enums.js anywhere). tsc ("bundler" resolution) and
  // Vite/esbuild resolve that transparently, but both of Next's bundlers
  // (Turbopack and Webpack) do not by default and fail the build with
  // "module has no exports at all" for the whole contracts package.
  // Webpack's resolve.extensionAlias is the standard fix for this exact
  // NodeNext-source-consumed-by-a-bundler pattern; Turbopack does not
  // currently expose an equivalent option (confirmed: its
  // `resolveExtensions` list does not remap an already-".js" specifier,
  // and this is also confirmed *not* Turbopack-specific — plain Webpack
  // fails identically without this config). Since nearly every route
  // this app has imports @buy-nothing/contracts, `dev`, `build` and the
  // Playwright webServer all pass `--webpack` (see package.json /
  // playwright.config.ts) so every entry point agrees on how modules
  // resolve, trading Turbopack's dev-server speed for correctness.
  webpack(config) {
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js"],
    };
    return config;
  },
};

export default nextConfig;

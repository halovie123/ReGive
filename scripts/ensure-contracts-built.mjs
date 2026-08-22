#!/usr/bin/env node
// Compile packages/contracts, but only when its inputs actually changed, and
// never from two processes at once.
//
// Why this exists
// ---------------
// apps/api and apps/web each declare pre* hooks so that a standalone
// `cd apps/api && pnpm build` works without the caller having to remember to
// build the workspace dependency first. During `pnpm --recursive run <script>`
// pnpm honours the dependency graph but still runs api and web concurrently,
// so those two hooks used to fire two `tsc` processes at the same
// packages/contracts/dist while a third consumer was already reading from it.
// tsc writes each output file individually and non-atomically, so a reader
// could observe a truncated module. That was latent rather than active, but it
// is exactly the kind of thing that only fails on a slow, loaded CI box.
//
// Two mechanisms close the window:
//   1. An exclusive lock (mkdir is atomic on every platform we target) wraps
//      the entire check-and-build, so at most one tsc ever writes dist/.
//   2. A stamp file, written only after a successful build, records a
//      signature of the inputs that produced dist/. Because it is written last
//      it doubles as a completion marker: a waiter that sees a matching stamp
//      knows the build finished, not just that dist/ exists. The common case
//      (contracts already built via its own topological turn) therefore costs
//      one directory walk and no writes at all.

import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);
const contractsDir = path.join(repoRoot, 'packages', 'contracts');
const srcDir = path.join(contractsDir, 'src');
const distDir = path.join(contractsDir, 'dist');
const stampFile = path.join(distDir, '.build-stamp');
const lockDir = path.join(contractsDir, '.build-lock');
const tsconfigBuild = path.join(contractsDir, 'tsconfig.build.json');

const LOCK_WAIT_TIMEOUT_MS = 180_000;
const LOCK_STALE_AFTER_MS = 300_000;
const LOCK_POLL_MS = 100;

const sleepSync = (ms) =>
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

/** Every file whose contents can change what tsc emits. */
function collectInputs() {
  const files = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')) {
        // .test.ts is excluded from tsconfig.build.json, so it cannot affect output.
        files.push(full);
      }
    }
  };
  walk(srcDir);
  for (const name of ['tsconfig.build.json', 'tsconfig.json', 'package.json']) {
    const full = path.join(contractsDir, name);
    if (fs.existsSync(full)) files.push(full);
  }
  return files.sort();
}

function computeSignature() {
  const hash = createHash('sha256');
  for (const file of collectInputs()) {
    const stat = fs.statSync(file);
    hash.update(`${path.relative(contractsDir, file)}:${stat.size}:${stat.mtimeMs}\n`);
  }
  return hash.digest('hex');
}

function isFresh(signature) {
  if (!fs.existsSync(path.join(distDir, 'index.js'))) return false;
  try {
    return fs.readFileSync(stampFile, 'utf8').trim() === signature;
  } catch {
    return false;
  }
}

function resolveTsc() {
  const require = createRequire(import.meta.url);
  for (const specifier of ['typescript/package.json', 'typescript']) {
    try {
      const resolved = require.resolve(specifier, {
        paths: [contractsDir, repoRoot],
      });
      const packageDir = specifier.endsWith('package.json')
        ? path.dirname(resolved)
        : path.resolve(path.dirname(resolved), '..');
      const tsc = path.join(packageDir, 'bin', 'tsc');
      if (fs.existsSync(tsc)) return tsc;
    } catch {
      // try the next specifier
    }
  }
  throw new Error(
    'Unable to locate the TypeScript compiler for packages/contracts. Run a workspace install first.',
  );
}

function acquireLock() {
  const deadline = Date.now() + LOCK_WAIT_TIMEOUT_MS;
  for (;;) {
    try {
      fs.mkdirSync(lockDir);
      return;
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      // Reclaim a lock abandoned by a crashed or killed build.
      try {
        if (Date.now() - fs.statSync(lockDir).mtimeMs > LOCK_STALE_AFTER_MS) {
          fs.rmSync(lockDir, { recursive: true, force: true });
          continue;
        }
      } catch {
        continue; // holder released it while we were looking
      }
      if (Date.now() > deadline) {
        throw new Error(
          `Timed out after ${LOCK_WAIT_TIMEOUT_MS}ms waiting for ${lockDir}. ` +
            'If no contracts build is running, remove that directory.',
        );
      }
      sleepSync(LOCK_POLL_MS);
    }
  }
}

function releaseLock() {
  fs.rmSync(lockDir, { recursive: true, force: true });
}

function build(signature) {
  process.stderr.write('packages/contracts: compiling (inputs changed)\n');
  const result = spawnSync(process.execPath, [resolveTsc(), '-p', tsconfigBuild], {
    cwd: contractsDir,
    stdio: 'inherit',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
  fs.mkdirSync(distDir, { recursive: true });
  // Written last: this is the completion marker, not just a cache key.
  fs.writeFileSync(stampFile, signature);
}

const force = process.argv.includes('--force');

// Fast path: no lock, no writes, when nothing changed.
if (!force && isFresh(computeSignature())) {
  process.exit(0);
}

acquireLock();
try {
  // Re-check under the lock: a concurrent builder may have finished while we waited.
  const signature = computeSignature();
  if (force || !isFresh(signature)) build(signature);
} finally {
  releaseLock();
}

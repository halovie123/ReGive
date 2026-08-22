#!/usr/bin/env node
// Boot the compiled API for real and prove it answers /v1/health over HTTP.
//
// Why this exists
// ---------------
// A NodeNext module-resolution bug once shipped through every gate this repo
// had: lint, typecheck, 75 unit tests, every e2e suite and `nest build` all
// passed while `node dist/src/main.js` died on startup with
// ERR_MODULE_NOT_FOUND and served exactly zero requests. Nothing in CI ever
// started the process. This does.
//
// Deliberately dumb: build, start, poll, stop. It asserts liveness, not
// behaviour -- the e2e suites cover behaviour.

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const apiDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const entry = path.join(apiDir, 'dist', 'src', 'main.js');

const port = process.env.SMOKE_PORT ?? process.env.PORT ?? '3001';
const url = `http://127.0.0.1:${port}/v1/health`;
const BOOT_TIMEOUT_MS = 60_000;
const POLL_INTERVAL_MS = 500;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

if (!fs.existsSync(entry)) {
  console.error(`smoke: ${entry} not found -- run the API build first.`);
  process.exit(1);
}

const child = spawn(process.execPath, [entry], {
  cwd: apiDir,
  env: { ...process.env, PORT: String(port) },
  stdio: ['ignore', 'pipe', 'pipe'],
});

let output = '';
child.stdout.on('data', (chunk) => {
  output += chunk;
});
child.stderr.on('data', (chunk) => {
  output += chunk;
});

let exited = null;
child.on('exit', (code, signal) => {
  exited = { code, signal };
});

const fail = (message) => {
  console.error(`\nsmoke: FAILED -- ${message}`);
  if (output.trim()) console.error(`\n--- server output ---\n${output.trim()}`);
  if (!exited) child.kill();
  process.exit(1);
};

console.log(`smoke: starting ${path.relative(apiDir, entry)} on port ${port}`);

const deadline = Date.now() + BOOT_TIMEOUT_MS;
let lastError = 'no response';

while (Date.now() < deadline) {
  if (exited) {
    fail(
      `server exited before becoming healthy (code=${exited.code}, signal=${exited.signal})`,
    );
  }
  try {
    const response = await fetch(url);
    const body = await response.text();
    if (response.ok) {
      let parsed;
      try {
        parsed = JSON.parse(body);
      } catch {
        fail(`GET ${url} returned non-JSON: ${body.slice(0, 200)}`);
      }
      if (parsed.status !== 'ok') {
        fail(`GET ${url} returned ${body} (expected {"status":"ok"})`);
      }
      console.log(`smoke: GET ${url} -> ${response.status} ${body}`);
      console.log('smoke: OK');
      child.kill();
      process.exit(0);
    }
    lastError = `HTTP ${response.status}: ${body.slice(0, 200)}`;
  } catch (error) {
    lastError = error.message;
  }
  await sleep(POLL_INTERVAL_MS);
}

fail(`server never answered ${url} within ${BOOT_TIMEOUT_MS}ms (last: ${lastError})`);

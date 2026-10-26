#!/usr/bin/env node
/**
 * Unit tests: bundles every src/**\/*.test.ts with esbuild and runs them with
 * Node's built-in test runner. No extra dependencies.
 *   npm test
 */
import * as esbuild from 'esbuild';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const find = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
  const p = path.join(dir, e.name);
  return e.isDirectory() ? find(p) : e.name.endsWith('.test.ts') ? [p] : [];
});
const files = find(path.join(root, 'src'));
const out = fs.mkdtempSync(path.join(os.tmpdir(), 'nomnoms-tests-'));
await esbuild.build({ entryPoints: files, bundle: true, platform: 'node', format: 'esm', outdir: out, outExtension: { '.js': '.mjs' }, logLevel: 'warning', jsx: 'automatic' });
const built = fs.readdirSync(out, { recursive: true }).filter((f) => String(f).endsWith('.mjs')).map((f) => path.join(out, String(f)));
const r = spawnSync(process.execPath, ['--test', ...built], { stdio: 'inherit' });
fs.rmSync(out, { recursive: true, force: true });
process.exit(r.status ?? 1);

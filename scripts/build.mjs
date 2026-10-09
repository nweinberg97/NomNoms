#!/usr/bin/env node
/**
 * NomNoms build — esbuild, no framework CLI.
 *
 *   node scripts/build.mjs            → dist/ (static site; deploy anywhere)
 *   node scripts/build.mjs --dev      → serve on http://localhost:5173 with live reload
 *   node scripts/build.mjs --single   → dist-single/nomnoms.html (one self-contained file:
 *                                        JS, CSS, fonts and demo media inlined)
 *
 * Public config comes from .env (see .env.example). Only *public* client IDs
 * are ever injected into the bundle — never secrets.
 */
import * as esbuild from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = new Set(process.argv.slice(2));
const DEV = args.has('--dev');
const SINGLE = args.has('--single');
const PORT = Number(process.env.PORT || 5173);

function loadEnv() {
  const env = {};
  for (const f of ['.env', '.env.local']) {
    const p = path.join(root, f);
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m) env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
    }
  }
  const pick = (k) => process.env[k] ?? env[k] ?? '';
  return {
    GOOGLE_CLIENT_ID: pick('GOOGLE_CLIENT_ID'),
    APPLE_CLIENT_ID: pick('APPLE_CLIENT_ID'),
    APPLE_REDIRECT_URI: pick('APPLE_REDIRECT_URI'),
  };
}

const publicEnv = loadEnv();

const fontFaces = (url) => `
@font-face { font-family: 'Lora'; src: url(${url('Lora-Variable.woff')}) format('woff'); font-weight: 400 700; font-style: normal; font-display: swap; }
@font-face { font-family: 'Lora'; src: url(${url('Lora-Italic-Variable.woff')}) format('woff'); font-weight: 400 700; font-style: italic; font-display: swap; }
@font-face { font-family: 'Inter'; src: url(${url('Inter-Regular.woff')}) format('woff'); font-weight: 400; font-display: swap; }
@font-face { font-family: 'Inter'; src: url(${url('Inter-Medium.woff')}) format('woff'); font-weight: 500; font-display: swap; }
@font-face { font-family: 'Inter'; src: url(${url('Inter-SemiBold.woff')}) format('woff'); font-weight: 600 700; font-display: swap; }
@font-face { font-family: 'Poppins'; src: url(${url('Poppins-Light.woff')}) format('woff'); font-weight: 300; font-display: swap; }
@font-face { font-family: 'Poppins'; src: url(${url('Poppins-Regular.woff')}) format('woff'); font-weight: 400; font-display: swap; }
@font-face { font-family: 'Poppins'; src: url(${url('Poppins-Medium.woff')}) format('woff'); font-weight: 500 600; font-display: swap; }`;

function html({ css, js, head = '', fonts }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<meta name="theme-color" content="#f6f1e9" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="default" />
<meta name="description" content="NomNoms — the baby book that builds itself." />
<title>NomNoms</title>
<link rel="icon" href="${SINGLE ? 'data:image/svg+xml,' + encodeURIComponent(fs.readFileSync(path.join(root, 'public/icon.svg'), 'utf8')) : 'icon.svg'}" />
${SINGLE ? '' : '<link rel="manifest" href="manifest.webmanifest" />'}
<style>${fonts}</style>
${css}
${head}
</head>
<body>
<div id="root"></div>
${js}
</body>
</html>`;
}

const common = {
  entryPoints: [path.join(root, 'src/main.tsx')],
  bundle: true,
  jsx: 'automatic',
  target: ['es2020', 'safari15'],
  define: { __NN_ENV__: JSON.stringify(publicEnv), 'process.env.NODE_ENV': JSON.stringify(DEV ? 'development' : 'production') },
  loader: { '.woff': 'file', '.svg': 'file' },
  logLevel: 'info',
};

function copyDir(src, dst, filter = () => true) {
  fs.mkdirSync(dst, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, e.name);
    const d = path.join(dst, e.name);
    if (e.isDirectory()) copyDir(s, d, filter);
    else if (filter(s)) fs.copyFileSync(s, d);
  }
}

if (DEV) {
  const out = path.join(root, '.dev');
  fs.rmSync(out, { recursive: true, force: true });
  copyDir(path.join(root, 'public'), out);
  fs.writeFileSync(
    path.join(out, 'index.html'),
    html({
      fonts: fontFaces((f) => `fonts/${f}`),
      css: '<link rel="stylesheet" href="assets/main.css" />',
      js: '<script src="assets/main.js"></script>',
      head: "<script>new EventSource('/esbuild').addEventListener('change', () => location.reload())</script>",
    }),
  );
  const ctx = await esbuild.context({ ...common, outdir: path.join(out, 'assets'), sourcemap: true });
  await ctx.watch();
  const { port } = await ctx.serve({ servedir: out, port: PORT, host: '0.0.0.0' });
  console.log(`\n  NomNoms is running →  http://localhost:${port}\n`);
} else if (SINGLE) {
  const out = path.join(root, 'dist-single');
  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(out, { recursive: true });
  const r = await esbuild.build({ ...common, write: false, minify: true, outdir: out, legalComments: 'none' });
  const js = r.outputFiles.find((f) => f.path.endsWith('.js')).text;
  const css = r.outputFiles.find((f) => f.path.endsWith('.css'))?.text ?? '';
  const dataUri = (file, mime) => `data:${mime};base64,${fs.readFileSync(file).toString('base64')}`;
  const fonts = fontFaces((f) => dataUri(path.join(root, 'public/fonts', f), 'font/woff'));
  // demo media: downscaled copies so the single file stays light
  const demoDir = path.join(root, 'public/demo');
  const inline = {};
  let sharp = null;
  try {
    sharp = (await import('sharp')).default;
  } catch {
    /* optional */
  }
  for (const f of fs.readdirSync(demoDir)) {
    if (f.endsWith('.thumb.jpg')) continue;
    const p = path.join(demoDir, f);
    if (f.endsWith('.jpg')) {
      const buf = sharp ? await sharp(p).resize({ width: 760, height: 760, fit: 'inside' }).jpeg({ quality: 70, mozjpeg: true }).toBuffer() : fs.readFileSync(p);
      inline[f] = `data:image/jpeg;base64,${buf.toString('base64')}`;
    } else if (f.endsWith('.mp4')) inline[f] = dataUri(p, 'video/mp4');
  }
  const assets = `<script>window.__NN_INLINE_ASSETS__=${JSON.stringify(inline)}</script>`;
  const page = html({ fonts, css: `<style>${css}</style>`, js: `${assets}<script>${js.replace(/<\/script/g, '<\\/script')}</script>` });
  const file = path.join(out, 'nomnoms.html');
  fs.writeFileSync(file, page);
  // a fragment variant for hosts that supply their own document skeleton
  const fragment = page
    .replace(/<!doctype html>\s*<html[^>]*>\s*<head>/i, '')
    .replace(/<meta charset[^>]*>\s*<meta name="viewport"[^>]*>/i, '')
    .replace(/<\/head>\s*<body>/i, '')
    .replace(/<\/body>\s*<\/html>\s*$/i, '');
  fs.writeFileSync(path.join(out, 'nomnoms-fragment.html'), fragment);
  console.log(`single file → ${path.relative(root, file)} (${(fs.statSync(file).size / 1024 / 1024).toFixed(1)} MB)`);
} else {
  const out = path.join(root, 'dist');
  fs.rmSync(out, { recursive: true, force: true });
  copyDir(path.join(root, 'public'), out);
  const r = await esbuild.build({ ...common, minify: true, outdir: path.join(out, 'assets'), entryNames: '[name]-[hash]', metafile: true, legalComments: 'none' });
  const outs = Object.keys(r.metafile.outputs).map((p) => path.relative(out, path.resolve(root, p)));
  const jsFile = outs.find((p) => p.endsWith('.js'));
  const cssFile = outs.find((p) => p.endsWith('.css'));
  fs.writeFileSync(
    path.join(out, 'index.html'),
    html({ fonts: fontFaces((f) => `fonts/${f}`), css: cssFile ? `<link rel="stylesheet" href="${cssFile}" />` : '', js: `<script src="${jsFile}"></script>` }),
  );
  console.log(`built → dist/ (${jsFile})`);
}

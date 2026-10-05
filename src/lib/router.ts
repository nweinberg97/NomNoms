import { useSyncExternalStore } from 'react';

/** Minimal hash router — works on any static host and inside embeds. */
function current() {
  const h = window.location.hash.replace(/^#/, '') || '/';
  const [path, query = ''] = h.split('?');
  return { path, query: new URLSearchParams(query) };
}

let snap = current();
let snapKey = window.location.hash;
const listeners = new Set<() => void>();
window.addEventListener('hashchange', () => {
  snap = current();
  snapKey = window.location.hash;
  listeners.forEach((l) => l());
});

export function useRoute() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => {
      if (snapKey !== window.location.hash) {
        snap = current();
        snapKey = window.location.hash;
      }
      return snap;
    },
  );
}

export function navigate(to: string, opts: { replace?: boolean } = {}) {
  const target = '#' + to;
  if (opts.replace) {
    history.replaceState(null, '', target);
    snap = current();
    snapKey = window.location.hash;
    listeners.forEach((l) => l());
  } else if (window.location.hash !== target) {
    window.location.hash = to;
  }
}

export function back(fallback = '/home') {
  if (history.length > 1 && document.referrer !== undefined && (window as unknown as { __nnNavCount?: number }).__nnNavCount) history.back();
  else navigate(fallback);
}

// count in-app navigations so "back" never leaves the app
let count = 0;
window.addEventListener('hashchange', () => {
  count++;
  (window as unknown as { __nnNavCount?: number }).__nnNavCount = count;
});

export function match(pattern: string, path: string): Record<string, string> | null {
  const pp = pattern.split('/').filter(Boolean);
  const ap = path.split('/').filter(Boolean);
  if (pp.length !== ap.length) return null;
  const out: Record<string, string> = {};
  for (let i = 0; i < pp.length; i++) {
    if (pp[i].startsWith(':')) out[pp[i].slice(1)] = decodeURIComponent(ap[i]);
    else if (pp[i] !== ap[i]) return null;
  }
  return out;
}

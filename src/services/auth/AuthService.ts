import { kv } from '../../lib/kv';
import type { Account } from '../../lib/types';
import { nowISO } from '../../lib/util';

declare const __NN_ENV__: { GOOGLE_CLIENT_ID?: string; APPLE_CLIENT_ID?: string; APPLE_REDIRECT_URI?: string };

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    google?: any;
    AppleID?: any;
  }
}

const SESSION_KEY = 'nomnoms:v1:session';

function env() {
  try {
    return typeof __NN_ENV__ !== 'undefined' ? __NN_ENV__ : {};
  } catch {
    return {};
  }
}

export const authConfig = {
  get googleEnabled() {
    return !!env().GOOGLE_CLIENT_ID;
  },
  get appleEnabled() {
    return !!env().APPLE_CLIENT_ID;
  },
};

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Could not load ${src}`));
    document.head.appendChild(s);
  });
}

function decodeJwt(token: string): Record<string, any> {
  try {
    const part = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(decodeURIComponent(escape(atob(part))));
  } catch {
    return {};
  }
}

/**
 * Real integration first, graceful fallback second.
 *
 * - With GOOGLE_CLIENT_ID / APPLE_CLIENT_ID set (.env → build), the buttons run
 *   the real Google Identity Services / Sign in with Apple JS flows.
 * - Without them, the same buttons open a demo family account so the
 *   prototype always runs. No secrets ever ship to the browser — only public
 *   client IDs.
 */
export const AuthService = {
  current(): Account | undefined {
    return kv.get<Account>(SESSION_KEY);
  },

  signOut() {
    kv.remove(SESSION_KEY);
    try {
      window.google?.accounts?.id?.disableAutoSelect?.();
    } catch {
      /* ignore */
    }
  },

  persist(a: Account) {
    kv.set(SESSION_KEY, a);
    return a;
  },

  demoAccount(provider: Account['provider'] = 'demo', name = 'Maya Hale'): Account {
    return this.persist({
      id: 'demo-family',
      name,
      email: 'maya@hale.family',
      provider,
      isDemo: true,
      createdAt: nowISO(),
    });
  },

  async signInWithGoogle(): Promise<Account> {
    const clientId = env().GOOGLE_CLIENT_ID;
    if (!clientId) return this.demoAccount('google');
    await loadScript('https://accounts.google.com/gsi/client');
    const token: string = await new Promise((resolve, reject) => {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'openid email profile',
        callback: (r: any) => (r.error ? reject(new Error(r.error)) : resolve(r.access_token)),
        error_callback: (e: any) => reject(new Error(e?.message || 'Google sign-in was closed')),
      });
      client.requestAccessToken();
    });
    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', { headers: { Authorization: `Bearer ${token}` } });
    const p = await res.json();
    return this.persist({
      id: `google-${p.sub}`,
      name: p.name || p.email,
      email: p.email,
      avatarUrl: p.picture,
      provider: 'google',
      isDemo: false,
      createdAt: nowISO(),
    });
  },

  async signInWithApple(): Promise<Account> {
    const { APPLE_CLIENT_ID, APPLE_REDIRECT_URI } = env();
    if (!APPLE_CLIENT_ID) return this.demoAccount('apple');
    await loadScript('https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js');
    window.AppleID.auth.init({
      clientId: APPLE_CLIENT_ID,
      scope: 'name email',
      redirectURI: APPLE_REDIRECT_URI || window.location.origin,
      usePopup: true,
    });
    const r = await window.AppleID.auth.signIn();
    const claims = decodeJwt(r.authorization.id_token);
    const name = r.user?.name ? `${r.user.name.firstName ?? ''} ${r.user.name.lastName ?? ''}`.trim() : claims.email;
    return this.persist({
      id: `apple-${claims.sub}`,
      name: name || 'Apple user',
      email: claims.email,
      provider: 'apple',
      isDemo: false,
      createdAt: nowISO(),
    });
  },
};

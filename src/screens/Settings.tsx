import React, { useEffect, useRef, useState } from 'react';
import { Icon, AppleMark, GoogleMark } from '../components/Icon';
import { MediaImg } from '../components/Media';
import { PageHeader, Shell } from '../components/Shell';
import { Confirm, toast } from '../components/ui';
import { kv } from '../lib/kv';
import { navigate } from '../lib/router';
import { plural } from '../lib/util';
import { authConfig } from '../services/auth/AuthService';
import { MediaService } from '../services/media/MediaService';
import { useApp } from '../state/store';

export function Settings() {
  const { baby, account, updateBaby, signOut, resetAll, loadDemoFamily, memories, media, book } = useApp();
  const [name, setName] = useState(baby?.name ?? '');
  const [birthDate, setBirthDate] = useState(baby?.birthDate ?? '');
  const [birthPlace, setBirthPlace] = useState(baby?.birthPlace ?? '');
  const [people, setPeople] = useState((baby?.people ?? []).join(', '));
  const [usage, setUsage] = useState<{ used: number; quota: number }>();
  const [confirm, setConfirm] = useState<'reset' | 'demo' | null>(null);
  const photo = useRef<HTMLInputElement>(null);

  useEffect(() => {
    navigator.storage?.estimate?.().then((e) => setUsage({ used: e.usage ?? 0, quota: e.quota ?? 0 })).catch(() => undefined);
  }, [memories.length]);

  if (!baby || !account) return null;
  const onDevice = [...media.values()].filter((m) => m.storageProvider === 'browser').length;
  const demoItems = [...media.values()].filter((m) => m.storageProvider === 'demo').length;
  const mb = (b: number) => `${(b / 1024 / 1024).toFixed(b > 1e8 ? 0 : 1)} MB`;

  const save = async () => {
    await updateBaby({ name: name.trim() || baby.name, birthDate, birthPlace: birthPlace.trim() || undefined, people: people.split(',').map((p) => p.trim()).filter(Boolean) });
    toast('Saved', { icon: 'check' });
  };

  return (
    <Shell>
      <PageHeader eyebrow="More" title="Settings" />

      <div className="settings">
        <section className="set-card reveal">
          <h2 className="set-h">Baby</h2>
          <div className="set-baby">
            <button className="set-avatar" onClick={() => photo.current?.click()} aria-label="Change photo">
              {baby.photoMediaId ? <MediaImg id={baby.photoMediaId} size="thumb" /> : <Icon name="camera" />}
              <span><Icon name="camera" size={14} /></span>
            </button>
            <input ref={photo} type="file" accept="image/*" hidden onChange={async (e) => {
              const f = e.target.files?.[0];
              if (f) {
                await updateBaby({}, f);
                toast('Photo updated', { icon: 'check' });
              }
            }} />
            <div className="set-fields">
              <label className="field"><span>Name</span><input value={name} onChange={(e) => setName(e.target.value)} /></label>
              <div className="field-row">
                <label className="field"><span>Birthday</span><input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} /></label>
                <label className="field"><span>Born in</span><input value={birthPlace} onChange={(e) => setBirthPlace(e.target.value)} placeholder="Optional" /></label>
              </div>
              <label className="field"><span>People in {name.split(' ')[0] || 'their'}’s life <em className="muted">(comma separated — used for quick tagging)</em></span><input value={people} onChange={(e) => setPeople(e.target.value)} /></label>
              <div><button className="btn btn-primary btn-sm" onClick={save}>Save details</button></div>
            </div>
          </div>
        </section>

        <section className="set-card reveal reveal-1">
          <h2 className="set-h">Book & export</h2>
          <div className="set-links">
            <button onClick={() => navigate('/book')}><Icon name="book" size={18} /> <span>Your book<small>{book ? plural(book.pages.length, 'page') : 'Not built yet'}</small></span><Icon name="chevron-right" size={16} /></button>
            <button onClick={() => navigate('/export')}><Icon name="download" size={18} /> <span>Export & share<small>PDF, digital book, film, backup</small></span><Icon name="chevron-right" size={16} /></button>
            <button onClick={() => navigate('/film')}><Icon name="film" size={18} /> <span>Memory film<small>Your year in motion</small></span><Icon name="chevron-right" size={16} /></button>
          </div>
        </section>

        <section className="set-card reveal reveal-2">
          <h2 className="set-h">Privacy</h2>
          <p className="muted">Everything is private by default. Memories never leave this device in the prototype; a shared book is visible only when you turn sharing on.</p>
          <div className="set-row"><Icon name="lock" size={18} /><span>Book sharing<small>{book ? (book.share.visibility === 'private' ? 'Private — only you' : book.share.visibility === 'family' ? `Family only · ${plural(book.share.familyEmails.length, 'person', 'people')}` : 'Anyone with the link') : 'Private — only you'}</small></span></div>
        </section>

        <section className="set-card reveal reveal-3">
          <h2 className="set-h">Storage</h2>
          <div className="storage-flow" aria-label="How media is stored">
            <span className="sf-node is-on"><Icon name="device" size={16} /> This device</span>
            <span className="sf-arrow" />
            <span className="sf-node"><Icon name="cloud" size={16} /> Google Drive</span>
            <span className="sf-node"><Icon name="cloud" size={16} /> iCloud</span>
          </div>
          <div className="set-row"><Icon name="device" size={18} /><span>On this device<small>{plural(onDevice, 'photo or video', 'photos & videos')} you added{usage ? ` · ${mb(usage.used)} used` : ''}{!MediaService.devicePersistent ? ' · not persistent in this browser' : ''}</small></span><span className="pill">Active</span></div>
          <div className="set-row"><Icon name="image" size={18} /><span>Demo library<small>{plural(demoItems, 'item')} bundled with the app</small></span></div>
          <p className="muted small">Originals are stored as files on your device (IndexedDB), never inside the app database. Cloud providers plug into the same media layer — see the README.</p>
        </section>

        <section className="set-card reveal reveal-4">
          <h2 className="set-h">Connected services</h2>
          {[
            { k: 'g', icon: <GoogleMark size={18} />, name: 'Google', sub: authConfig.googleEnabled ? 'Sign-in configured' : 'Add GOOGLE_CLIENT_ID to enable', on: account.provider === 'google' && !account.isDemo },
            { k: 'a', icon: <AppleMark size={18} />, name: 'Apple', sub: authConfig.appleEnabled ? 'Sign-in configured' : 'Add APPLE_CLIENT_ID to enable', on: account.provider === 'apple' && !account.isDemo },
            { k: 'd', icon: <Icon name="cloud" size={18} />, name: 'Google Drive', sub: 'Store originals in your Drive', soon: true },
            { k: 'i', icon: <Icon name="cloud" size={18} />, name: 'iCloud Photos', sub: 'Import from your library', soon: true },
            { k: 'p', icon: <Icon name="image" size={18} />, name: 'Google Photos', sub: 'Pull in new photos automatically', soon: true },
          ].map((s) => (
            <div key={s.k} className="set-row">{s.icon}<span>{s.name}<small>{s.sub}</small></span>{s.on ? <span className="pill is-on">Connected</span> : s.soon ? <span className="pill">Planned</span> : null}</div>
          ))}
        </section>

        <section className="set-card reveal reveal-5">
          <h2 className="set-h">Account</h2>
          <div className="set-row"><Icon name="user" size={18} /><span>{account.name}<small>{account.isDemo ? `Demo account (${account.provider === 'demo' ? 'local' : account.provider}) · ${kv.persistent ? 'saved on this device' : 'this session only'}` : account.email}</small></span></div>
          <div className="row" style={{ gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => { signOut(); navigate('/', { replace: true }); }}>Sign out</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setConfirm('demo')}>Load the demo family</button>
            <button className="btn btn-danger-ghost btn-sm" onClick={() => setConfirm('reset')}>Delete all data</button>
          </div>
        </section>
      </div>

      <Confirm open={confirm === 'reset'} onClose={() => setConfirm(null)} danger confirmLabel="Delete everything"
        title="Delete all data on this device?" body="Every memory, photo you added, milestone and the book will be erased from this browser. This can’t be undone."
        onConfirm={async () => { await resetAll(); toast('Everything was deleted', { icon: 'trash' }); navigate('/welcome', { replace: true }); }} />
      <Confirm open={confirm === 'demo'} onClose={() => setConfirm(null)} confirmLabel="Load demo"
        title="Replace with the demo family?" body="Your current baby profile will be replaced by Juno Hale’s first year. Photos you added stay on this device."
        onConfirm={async () => { await loadDemoFamily(); toast('Welcome to the Hales', { icon: 'book' }); navigate('/home'); }} />
    </Shell>
  );
}

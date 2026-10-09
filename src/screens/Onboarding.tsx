import React, { useEffect, useRef, useState } from 'react';
import { Icon, Wordmark } from '../components/Icon';
import { Spinner, toast } from '../components/ui';
import { RestoreButton } from '../components/DataCard';
import { navigate } from '../lib/router';
import { firstName, todayISO } from '../lib/util';
import { useApp } from '../state/store';

export function Onboarding() {
  const { createBaby, loadDemoFamily, account, signOut } = useApp();
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState(todayISO());
  const [birthPlace, setBirthPlace] = useState('');
  const [photo, setPhoto] = useState<File>();
  const [preview, setPreview] = useState<string>();
  const [more, setMore] = useState(false);
  const [busy, setBusy] = useState<'create' | 'demo'>();
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy('create');
    try {
      await createBaby({ name, birthDate, birthPlace: birthPlace || undefined, photo });
      toast(`${firstName(name)}’s book has begun.`, { icon: 'book' });
      navigate('/home', { replace: true });
    } finally {
      setBusy(undefined);
    }
  };

  const demo = async () => {
    setBusy('demo');
    await loadDemoFamily();
    navigate('/home', { replace: true });
  };

  return (
    <div className="onboard">
      <header className="landing-top">
        <Wordmark size={20} />
        <button className="link-btn" onClick={signOut}>Sign out</button>
      </header>
      <div className="onboard-wrap">
        <form className="onboard-card reveal" onSubmit={submit}>
          <p className="eyebrow">Welcome{account && !account.isDemo ? `, ${firstName(account.name)}` : ''}</p>
          <h1 className="display onboard-title">Who is this book for?</h1>
          <p className="muted onboard-sub">Just a name and a birthday. Everything else can wait.</p>

          <button type="button" className="onboard-photo" onClick={() => input.current?.click()} aria-label="Add a photo">
            {preview ? <img src={preview} alt="" /> : <><Icon name="camera" size={22} /><span>Add a photo</span></>}
          </button>
          <input ref={input} type="file" accept="image/*" hidden onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) {
              setPhoto(f);
              setPreview(URL.createObjectURL(f));
            }
          }} />

          <label className="field">
            <span>Baby’s name</span>
            <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Juno" required data-testid="baby-name" />
          </label>
          <label className="field">
            <span>Birthday</span>
            <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} required data-testid="baby-birth" />
          </label>
          {more ? (
            <label className="field reveal">
              <span>Born in <em className="muted">(optional)</em></span>
              <input value={birthPlace} onChange={(e) => setBirthPlace(e.target.value)} placeholder="City or hospital" />
            </label>
          ) : (
            <button type="button" className="link-btn" onClick={() => setMore(true)}>+ Add where they were born</button>
          )}

          <button className="btn btn-primary btn-lg btn-block" disabled={!name.trim() || !!busy} data-testid="create-baby">
            {busy === 'create' ? <Spinner /> : null} Start {name.trim() ? `${firstName(name)}’s` : 'the'} book
          </button>
        </form>

        <div className="onboard-alt reveal reveal-2">
          <p className="eyebrow">Moving from another device?</p>
          <h3 className="display">Restore a backup</h3>
          <p className="muted">Choose the backup file you saved from NomNoms on your phone or computer. All your memories, photos and book come with it.</p>
          <RestoreButton className="btn btn-ghost" label="Choose backup file" />
          <hr className="onboard-hr" />
          <p className="eyebrow">Just looking?</p>
          <h3 className="display">Open the Hale family’s book</h3>
          <p className="muted">A full first year — 70+ memories, milestones, little stories and videos — so you can see what NomNoms makes.</p>
          <button className="btn btn-ghost" onClick={demo} disabled={!!busy} data-testid="load-demo">
            {busy === 'demo' ? <Spinner /> : <Icon name="book" size={18} />} Explore Juno’s first year
          </button>
        </div>
      </div>
    </div>
  );
}

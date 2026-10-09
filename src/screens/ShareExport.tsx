import React, { useState } from 'react';
import { Icon } from '../components/Icon';
import { PageHeader, Shell } from '../components/Shell';
import { Segmented, Sheet, Spinner, toast } from '../components/ui';
import { exportBookPdf } from '../export/pdf';
import { printablePages } from '../book/layoutEngine';
import { navigate } from '../lib/router';
import type { ShareVisibility } from '../lib/types';
import { cx, firstName, nowISO, plural } from '../lib/util';
import { useApp } from '../state/store';

export function shareUrl(token: string, chapterId?: string) {
  const base = `${window.location.origin}${window.location.pathname}`;
  return `${base}#/b/${token}${chapterId ? `?chapter=${chapterId}` : ''}`;
}

async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  }
}

/** Private by default. Sharing is an explicit choice, per book. */
export function ShareSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { book, saveBook, baby } = useApp();
  const [email, setEmail] = useState('');
  const [chapter, setChapter] = useState('');
  if (!book || !baby) return null;
  const s = book.share;
  const setVis = async (visibility: ShareVisibility) => {
    await saveBook({ ...book, share: { ...s, visibility, updatedAt: nowISO() } });
    toast(visibility === 'private' ? 'Only you can open the book' : visibility === 'link' ? 'Anyone with the link can view' : 'Only invited family can view', { icon: visibility === 'private' ? 'lock' : 'link' });
  };
  const addEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(v)) return toast('That doesn’t look like an email', { icon: 'x' });
    await saveBook({ ...book, share: { ...s, visibility: 'family', familyEmails: [...new Set([...s.familyEmails, v])], updatedAt: nowISO() } });
    setEmail('');
    toast(`Invited ${v}`, { icon: 'users' });
  };
  const url = shareUrl(s.token, chapter || undefined);
  const chapters = book.pages.filter((p) => p.layout === 'chapter');

  return (
    <Sheet open={open} onClose={onClose} title={`Share ${firstName(baby.name)}’s book`}>
      <div className="sheet-body share">
        <Segmented<ShareVisibility>
          value={s.visibility}
          onChange={setVis}
          options={[
            { value: 'private', label: 'Private', icon: 'lock' },
            { value: 'family', label: 'Family', icon: 'users' },
            { value: 'link', label: 'Anyone with link', icon: 'link' },
          ]}
        />
        <p className="share-explain">
          {s.visibility === 'private' && 'Only you can open this book. Nothing is visible to anyone else.'}
          {s.visibility === 'family' && 'Only the family members you invite can open it.'}
          {s.visibility === 'link' && 'Anyone who has the link can view the book — they can’t edit or download originals.'}
        </p>

        {s.visibility === 'family' && (
          <div className="share-family">
            <form onSubmit={addEmail} className="share-invite">
              <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="grandma@example.com" type="email" aria-label="Family member email" />
              <button className="btn btn-primary btn-sm">Invite</button>
            </form>
            {s.familyEmails.map((e) => (
              <div key={e} className="share-person">
                <span className="share-avatar">{e[0].toUpperCase()}</span>
                <span>{e}</span>
                <button className="icon-btn" aria-label={`Remove ${e}`} onClick={() => saveBook({ ...book, share: { ...s, familyEmails: s.familyEmails.filter((x) => x !== e) } })}><Icon name="x" size={16} /></button>
              </div>
            ))}
          </div>
        )}

        <div className={cx('share-link', s.visibility === 'private' && 'is-disabled')}>
          <select className="select" value={chapter} onChange={(e) => setChapter(e.target.value)} aria-label="What to share" disabled={s.visibility === 'private'}>
            <option value="">The whole book</option>
            {chapters.map((c) => <option key={c.id} value={c.chapterId}>Chapter: {c.title}</option>)}
          </select>
          <div className="share-url">
            <Icon name={s.visibility === 'private' ? 'lock' : 'link'} size={16} />
            <span>{s.visibility === 'private' ? 'Link is turned off while the book is private' : url.replace(/^https?:\/\//, '')}</span>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <button className="btn btn-primary btn-sm" disabled={s.visibility === 'private'} onClick={async () => { if (await copy(url)) toast('Link copied', { icon: 'link' }); }} data-testid="copy-link"><Icon name="link" size={15} /> Copy link</button>
            <button className="btn btn-ghost btn-sm" onClick={() => { onClose(); navigate(`/b/${s.token}${chapter ? `?chapter=${chapter}` : ''}`); }}><Icon name="eye" size={15} /> Preview as family</button>
          </div>
        </div>
        <p className="muted small share-note"><Icon name="device" size={13} /> Prototype: shared links open on this device. With cloud storage connected, they’ll work anywhere.</p>
      </div>
    </Sheet>
  );
}

/* ───────────── /export ───────────── */
export function ExportScreen() {
  const { book, baby, memories, media, milestones } = useApp();
  const [progress, setProgress] = useState<[number, number] | null>(null);
  const [share, setShare] = useState(false);
  if (!baby) return null;

  const pdf = async () => {
    if (!book) return navigate('/book/build');
    setProgress([0, printablePages(book.pages, media, new Map(memories.map((m) => [m.id, m]))).length + 1]);
    try {
      const r = await exportBookPdf(book, { memories: new Map(memories.map((m) => [m.id, m])), media }, (d, t) => setProgress([d, t]));
      toast(`Downloaded ${r.name} · ${r.pages} pages`, { icon: 'download', ms: 4200 });
    } catch (e) {
      console.error(e);
      toast('The PDF couldn’t be created here. Try again, or use Print.', { icon: 'x' });
    } finally {
      setProgress(null);
    }
  };


  return (
    <Shell>
      <PageHeader eyebrow="Export & share" title="Take the book with you" sub="Your book belongs to you. Download it, share it privately, or play it as a film." />
      <div className="export-grid">
        <article className="export-card is-primary reveal reveal-1">
          <span className="export-icon"><Icon name="download" size={22} /></span>
          <h3 className="display">PDF book</h3>
          <p className="muted">Every page exactly as designed, 8×10 in, ready to print or send. Videos are left out; they’re in the film. {book ? `${plural(printablePages(book.pages, media, new Map(memories.map((m) => [m.id, m]))).length, 'page')}.` : ''}</p>
          {progress ? (
            <div className="progress-wrap" role="status">
              <div className="progress"><span style={{ width: `${(progress[0] / progress[1]) * 100}%` }} /></div>
              <small className="muted">Setting page {Math.min(progress[0] + 1, progress[1])} of {progress[1]}…</small>
            </div>
          ) : (
            <button className="btn btn-primary" onClick={pdf} data-testid="export-pdf">{book ? <><Icon name="download" size={16} /> Download PDF</> : <>Build the book first</>}</button>
          )}
        </article>

        <article className="export-card reveal reveal-2">
          <span className="export-icon"><Icon name="book" size={22} /></span>
          <h3 className="display">Digital book</h3>
          <p className="muted">A private web book family can flip through — chapters, captions, and videos that play on the page.</p>
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            <button className="btn btn-ghost" onClick={() => (book ? setShare(true) : navigate('/book/build'))}><Icon name="share" size={16} /> Share settings</button>
            {book && <span className={cx('vis-pill', `is-${book.share.visibility}`)}><Icon name={book.share.visibility === 'private' ? 'lock' : book.share.visibility === 'family' ? 'users' : 'link'} size={13} /> {book.share.visibility === 'private' ? 'Private' : book.share.visibility === 'family' ? 'Family only' : 'Link sharing on'}</span>}
          </div>
        </article>

        <article className="export-card reveal reveal-3">
          <span className="export-icon"><Icon name="film" size={22} /></span>
          <h3 className="display">Memory film</h3>
          <p className="muted">Your year as a short film — chapters, photos and captions with gentle motion. Watch it here or save it as a video.</p>
          <button className="btn btn-ghost" onClick={() => navigate('/film')}><Icon name="play" size={15} /> Play the film</button>
        </article>

        <article className="export-card reveal reveal-4">
          <span className="export-icon"><Icon name="cloud" size={22} /></span>
          <h3 className="display">Backup</h3>
          <p className="muted">One file with every memory, photo and video. Keep it safe, or use it to move NomNoms to another phone or computer.</p>
          <button className="btn btn-ghost" onClick={() => navigate('/settings')}><Icon name="download" size={16} /> Backup &amp; restore</button>
        </article>
      </div>
      <ShareSheet open={share} onClose={() => setShare(false)} />
    </Shell>
  );
}

export { Spinner };

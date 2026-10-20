import React from 'react';
import { Icon, Wordmark } from '../components/Icon';
import { navigate } from '../lib/router';
import { useAppOptional } from '../state/store';

/** Header for the try-it demos. Works signed in or not; demos never save anything. */
export function LabsHeader({ title }: { title: string }) {
  const app = useAppOptional();
  const back = () => navigate(app?.account ? '/coming-soon' : '/');
  return (
    <header className="lab-top">
      <button className="lab-back" onClick={back} aria-label="Back"><Icon name="arrow-left" size={18} /></button>
      <span className="lab-brand"><Wordmark size={18} /></span>
      <span className="lab-title">{title}</span>
      <span className="lab-pill">Demo</span>
    </header>
  );
}

export function DemoNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="lab-note">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
      <span>{children}</span>
    </p>
  );
}

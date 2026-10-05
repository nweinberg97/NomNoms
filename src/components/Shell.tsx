import React from 'react';
import { navigate, useRoute } from '../lib/router';
import { cx, firstName } from '../lib/util';
import { useApp } from '../state/store';
import { ui } from '../state/ui';
import { Icon, Wordmark } from './Icon';
import { MediaImg } from './Media';

const NAV = [
  { to: '/home', label: 'Home', icon: 'home' },
  { to: '/memories', label: 'Memories', icon: 'memories' },
  { to: '/milestones', label: 'Milestones', icon: 'star' },
  { to: '/book', label: 'Book', icon: 'book' },
];

export function Shell({ children, bare }: { children: React.ReactNode; bare?: boolean }) {
  const { path } = useRoute();
  const { baby, account } = useApp();
  const active = (to: string) => path === to || path.startsWith(to + '/');

  return (
    <div className={cx('shell', bare && 'is-bare')}>
      <header className="topbar">
        <div className="topbar-inner">
          <a href="#/home" className="topbar-brand" aria-label="NomNoms home"><Wordmark size={19} /></a>
          <nav className="topnav" aria-label="Main">
            {NAV.map((n) => (
              <a key={n.to} href={'#' + n.to} className={cx('topnav-link', active(n.to) && 'is-active')}>{n.label}</a>
            ))}
          </nav>
          <div className="topbar-actions">
            <button className="btn btn-primary btn-sm topbar-add" onClick={() => ui.openAdd()} data-testid="topbar-add">
              <Icon name="plus" size={16} stroke={2} /> Add memory
            </button>
            <button className={cx('avatar-btn', active('/settings') && 'is-active')} onClick={() => navigate('/settings')} aria-label="More: settings, export and sharing">
              {baby?.photoMediaId ? <MediaImg id={baby.photoMediaId} size="thumb" /> : <span>{firstName(account?.name ?? 'N').slice(0, 1)}</span>}
            </button>
          </div>
        </div>
      </header>

      <main className="main">{children}</main>

      <nav className="tabbar" aria-label="Main">
        {NAV.slice(0, 2).map((n) => (
          <a key={n.to} href={'#' + n.to} className={cx('tab', active(n.to) && 'is-active')}>
            <Icon name={n.icon} size={22} stroke={1.5} />
            <span>{n.label}</span>
          </a>
        ))}
        <button className="tab-add" onClick={() => ui.openAdd()} aria-label="Add memory" data-testid="tab-add">
          <Icon name="plus" size={26} stroke={1.8} />
        </button>
        {NAV.slice(2).map((n) => (
          <a key={n.to} href={'#' + n.to} className={cx('tab', active(n.to) && 'is-active')}>
            <Icon name={n.icon} size={22} stroke={1.5} />
            <span>{n.label}</span>
          </a>
        ))}
      </nav>
    </div>
  );
}

export function PageHeader({ eyebrow, title, children, sub }: { eyebrow?: string; title: React.ReactNode; sub?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="page-header reveal">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className="display page-title">{title}</h1>
        {sub && <p className="page-sub">{sub}</p>}
      </div>
      {children && <div className="page-header-actions">{children}</div>}
    </div>
  );
}

export function BackLink({ to, label = 'Back' }: { to?: string; label?: string }) {
  return (
    <button className="back-link" onClick={() => (to ? navigate(to) : history.length > 1 ? history.back() : navigate('/home'))}>
      <Icon name="arrow-left" size={18} /> {label}
    </button>
  );
}

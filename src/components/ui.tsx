import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { cx } from '../lib/util';
import { Icon } from './Icon';

/* ── Sheet: bottom sheet on phones, centered dialog on larger screens ── */
export function Sheet({ open, onClose, children, title, wide, className, labelledBy }: {
  open: boolean; onClose: () => void; children: React.ReactNode; title?: string; wide?: boolean; className?: string; labelledBy?: string;
}) {
  const [closing, setClosing] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    setClosing(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    setTimeout(() => ref.current?.focus(), 30);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  const close = () => {
    setClosing(true);
    setTimeout(onClose, 220);
  };
  if (!open) return null;
  return createPortal(
    <div className={cx('sheet-backdrop', closing && 'is-closing')} onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        aria-labelledby={labelledBy}
        className={cx('sheet', wide && 'is-wide', closing && 'is-closing', className)}
      >
        <div className="sheet-grip" aria-hidden />
        {title && (
          <div className="sheet-head">
            <h2 className="sheet-title">{title}</h2>
            <button className="icon-btn" onClick={close} aria-label="Close"><Icon name="x" /></button>
          </div>
        )}
        {children}
      </div>
    </div>,
    document.body,
  );
}

/* ── Toasts ── */
type ToastT = { id: number; text: string; icon?: string; action?: { label: string; run: () => void } };
let toasts: ToastT[] = [];
const tl = new Set<() => void>();
let tid = 0;
export function toast(text: string, opts: { icon?: string; action?: ToastT['action']; ms?: number } = {}) {
  const t = { id: ++tid, text, icon: opts.icon, action: opts.action };
  toasts = [...toasts, t];
  tl.forEach((l) => l());
  setTimeout(() => {
    toasts = toasts.filter((x) => x.id !== t.id);
    tl.forEach((l) => l());
  }, opts.ms ?? 3200);
}
export function Toaster() {
  const list = useSyncExternalStore((l) => (tl.add(l), () => tl.delete(l)), () => toasts);
  return (
    <div className="toaster" aria-live="polite">
      {list.map((t) => (
        <div key={t.id} className="toast">
          {t.icon && <Icon name={t.icon} size={18} />}
          <span>{t.text}</span>
          {t.action && <button onClick={t.action.run}>{t.action.label}</button>}
        </div>
      ))}
    </div>
  );
}

/* ── Confirm ── */
export function Confirm({ open, title, body, confirmLabel = 'Confirm', danger, onConfirm, onClose }: {
  open: boolean; title: string; body?: string; confirmLabel?: string; danger?: boolean; onConfirm: () => void; onClose: () => void;
}) {
  return (
    <Sheet open={open} onClose={onClose} className="confirm">
      <div className="sheet-body">
        <h2 className="sheet-title">{title}</h2>
        {body && <p className="muted" style={{ marginTop: 8 }}>{body}</p>}
        <div className="row-end" style={{ marginTop: 24 }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className={cx('btn', danger ? 'btn-danger' : 'btn-primary')} onClick={() => { onConfirm(); onClose(); }}>{confirmLabel}</button>
        </div>
      </div>
    </Sheet>
  );
}

export function Segmented<T extends string>({ value, options, onChange, size }: {
  value: T; options: { value: T; label: string; icon?: string }[]; onChange: (v: T) => void; size?: 'sm';
}) {
  return (
    <div className={cx('segmented', size === 'sm' && 'is-sm')} role="tablist">
      {options.map((o) => (
        <button key={o.value} role="tab" aria-selected={value === o.value} className={cx(value === o.value && 'is-active')} onClick={() => onChange(o.value)}>
          {o.icon && <Icon name={o.icon} size={15} />}
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Empty({ icon = 'sparkle', title, body, children }: { icon?: string; title: string; body?: string; children?: React.ReactNode }) {
  return (
    <div className="empty reveal">
      <div className="empty-icon"><Icon name={icon} size={22} /></div>
      <h3 className="display">{title}</h3>
      {body && <p className="muted">{body}</p>}
      {children}
    </div>
  );
}

export function Spinner({ size = 18 }: { size?: number }) {
  return <span className="spinner" style={{ width: size, height: size }} aria-label="Loading" />;
}

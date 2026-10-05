import { useSyncExternalStore } from 'react';
import type { MemoryType } from '../lib/types';

/** Ephemeral UI state shared across screens (never persisted). */

type AddMode = 'menu' | 'camera-photo' | 'camera-video' | 'voice' | null;

interface UIState {
  add: AddMode;
}
let state: UIState = { add: null };
const ls = new Set<() => void>();
const emit = () => ls.forEach((l) => l());

export const ui = {
  openAdd(mode: AddMode = 'menu') {
    state = { ...state, add: mode };
    emit();
  },
  closeAdd() {
    state = { ...state, add: null };
    emit();
  },
};

export function useUI() {
  return useSyncExternalStore((l) => (ls.add(l), () => ls.delete(l)), () => state);
}

/** Files captured/picked, waiting for the memory editor. Kept out of the URL and out of storage. */
export interface PendingCapture {
  files: File[];
  kind?: MemoryType | 'voice';
  presetTitle?: string;
}
let pending: PendingCapture | null = null;
export const pendingCapture = {
  set(p: PendingCapture) {
    pending = p;
  },
  take(): PendingCapture | null {
    const p = pending;
    pending = null;
    return p;
  },
  peek() {
    return pending;
  },
};

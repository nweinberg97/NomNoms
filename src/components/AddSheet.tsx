import React, { useRef } from 'react';
import { navigate } from '../lib/router';
import { pendingCapture, ui, useUI } from '../state/ui';
import { CameraCapture } from './CameraCapture';
import { Icon } from './Icon';
import { Sheet } from './ui';
import { VoiceRecorder } from './VoiceRecorder';

const OPTIONS = [
  { id: 'take-photo', icon: 'camera', label: 'Take photo', hint: 'Open the camera' },
  { id: 'take-video', icon: 'video', label: 'Take video', hint: 'Record a moment' },
  { id: 'add-photos', icon: 'image', label: 'Add photos', hint: 'From your library' },
  { id: 'add-video', icon: 'film', label: 'Add video', hint: 'From your library' },
  { id: 'write', icon: 'pen', label: 'Write a memory', hint: 'A few words is plenty' },
  { id: 'milestone', icon: 'star', label: 'Add a milestone', hint: 'A first, big or small' },
  { id: 'voice', icon: 'mic', label: 'Voice note', hint: 'Say it out loud' },
] as const;

/** The front door for every memory. Two taps from anywhere to a saved moment. */
export function AddSheet() {
  const { add } = useUI();
  const photoInput = useRef<HTMLInputElement>(null);
  const videoInput = useRef<HTMLInputElement>(null);
  const capturePhoto = useRef<HTMLInputElement>(null);
  const captureVideo = useRef<HTMLInputElement>(null);

  const toEditor = (files: File[], kind?: 'milestone' | 'story' | 'voice', presetTitle?: string) => {
    pendingCapture.set({ files, kind, presetTitle });
    ui.closeAdd();
    navigate(`/new${kind ? `?kind=${kind}` : ''}`);
  };

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = [...(e.target.files ?? [])];
    e.target.value = '';
    if (files.length) toEditor(files);
  };

  const choose = (id: (typeof OPTIONS)[number]['id']) => {
    switch (id) {
      case 'take-photo':
        if (canUseCamera()) ui.openAdd('camera-photo');
        else capturePhoto.current?.click();
        break;
      case 'take-video':
        if (canUseCamera()) ui.openAdd('camera-video');
        else captureVideo.current?.click();
        break;
      case 'add-photos':
        photoInput.current?.click();
        break;
      case 'add-video':
        videoInput.current?.click();
        break;
      case 'write':
        toEditor([], 'story');
        break;
      case 'milestone':
        toEditor([], 'milestone');
        break;
      case 'voice':
        ui.openAdd('voice');
        break;
    }
  };

  return (
    <>
      {/* hidden pickers: on phones `capture` opens the native camera directly */}
      <input ref={photoInput} type="file" accept="image/*" multiple hidden onChange={onPick} data-testid="pick-photos" />
      <input ref={videoInput} type="file" accept="video/*" multiple hidden onChange={onPick} data-testid="pick-videos" />
      <input ref={capturePhoto} type="file" accept="image/*" capture="environment" hidden onChange={onPick} />
      <input ref={captureVideo} type="file" accept="video/*" capture="environment" hidden onChange={onPick} />

      <Sheet open={add === 'menu'} onClose={() => ui.closeAdd()} className="add-sheet" labelledBy="add-title">
        <div className="sheet-body">
          <p className="eyebrow">New memory</p>
          <h2 id="add-title" className="display add-title">What happened?</h2>
          <div className="add-grid">
            {OPTIONS.map((o, i) => (
              <button key={o.id} className={`add-opt reveal reveal-${Math.min(i + 1, 6)}`} onClick={() => choose(o.id)} data-testid={`add-${o.id}`}>
                <span className="add-opt-icon"><Icon name={o.icon} size={22} stroke={1.5} /></span>
                <span className="add-opt-label">{o.label}</span>
                <span className="add-opt-hint">{o.hint}</span>
              </button>
            ))}
          </div>
        </div>
      </Sheet>

      {(add === 'camera-photo' || add === 'camera-video') && (
        <CameraCapture
          mode={add === 'camera-photo' ? 'photo' : 'video'}
          onClose={() => ui.closeAdd()}
          onDone={(files) => toEditor(files)}
          onFallback={() => {
            ui.closeAdd();
            (add === 'camera-photo' ? capturePhoto : captureVideo).current?.click();
          }}
        />
      )}

      <Sheet open={add === 'voice'} onClose={() => ui.closeAdd()} title="Voice note">
        <VoiceRecorder onDone={(file) => toEditor([file], 'voice')} />
      </Sheet>
    </>
  );
}

function canUseCamera() {
  return !!navigator.mediaDevices?.getUserMedia && window.isSecureContext;
}

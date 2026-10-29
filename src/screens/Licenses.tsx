import React from 'react';
import { Wordmark } from '../components/Icon';

/**
 * Open-source licences and credits: everything NomNoms ships that someone else
 * made, with the licence texts served from this site.
 */
const ITEMS: { name: string; what: string; licence: string; files: [string, string][] }[] = [
  { name: 'Inter, Lora and Poppins', what: 'Fonts', licence: 'SIL Open Font License 1.1', files: [['Font licences', 'fonts/LICENSE-fonts.txt']] },
  { name: 'React, html-to-image, JSZip, pdf-lib and their parts', what: 'Code in the app', licence: 'MIT (JSZip used under MIT), Zlib, 0BSD', files: [['Licence texts', 'licenses/THIRD-PARTY.txt']] },
  { name: '@vladmandic/human 3.3.6', what: 'Face reader for Baby Tales (runs on your device)', licence: 'MIT', files: [['Notice', 'vendor/human/NOTICE.txt'], ['MIT licence', 'vendor/human/LICENSE-human.txt']] },
  { name: 'TensorFlow.js and Google MediaPipe models', what: 'Inside the face reader', licence: 'Apache License 2.0 (see the notice for what is and isn’t confirmed)', files: [['Notice', 'vendor/human/NOTICE.txt'], ['Apache 2.0', 'vendor/human/LICENSE-Apache-2.0.txt']] },
];

export function Licenses() {
  return (
    <div className="licenses">
      <header className="licenses-top">
        <a href="#/" aria-label="NomNoms home"><Wordmark size={19} /></a>
      </header>
      <main className="licenses-body">
        <h1 className="display">Open-source licences</h1>
        <p className="lab-sub">NomNoms is built with work that other people share. Thank you to all of them.</p>
        <ul>
          {ITEMS.map((it) => (
            <li key={it.name}>
              <strong>{it.name}</strong>
              <span>{it.what} · {it.licence}</span>
              <span>{it.files.map(([label, href], i) => <React.Fragment key={href}>{i > 0 && ' · '}<a href={href} target="_blank" rel="noreferrer">{label}</a></React.Fragment>)}</span>
            </li>
          ))}
          <li>
            <strong>Sample photos in the demos</strong>
            <span>From <a href="https://unsplash.com/?utm_source=nomnoms&utm_medium=referral" target="_blank" rel="noreferrer">Unsplash</a>, under the Unsplash License. They are only examples; nothing you add is shared.</span>
          </li>
          <li>
            <strong>Drawings, characters and decorations</strong>
            <span>Original to NomNoms: drawn in code, not traced or generated.</span>
          </li>
        </ul>
      </main>
    </div>
  );
}

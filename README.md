# NomNoms

**The baby book that builds itself.**

Parents shouldn't have to build the baby book. They should just live the moments. NomNoms builds the book.

You add photos, videos, a sentence here and there, the occasional first. NomNoms sorts everything into chapters, picks the strongest photos, designs every page, and gives you a book you can read on screen, share privately, download as a PDF, or play as a short film.

> You take care of the memories. NomNoms takes care of the book.

---

## Quick start

```bash
npm install
npm run dev          # http://localhost:5173
```

No accounts, keys, database or backend needed. Click **Continue with Google** (it opens a private demo account until OAuth is configured) and either start your own baby's book or open the demo family — Juno Hale's first year: 75 memories, 22 milestones, 9 little stories and 12 videos.

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server with live reload (esbuild) |
| `npm run build` | Static production build in `dist/` — deploy to any static host |
| `npm run build:single` | One self-contained HTML file in `dist-single/` (JS, CSS, fonts and demo media inlined) |
| `npm run typecheck` | TypeScript check |
| `npm run media` | Regenerate the demo photos and clips (Python + Pillow + ffmpeg) |

Requires Node 18+.

**Live site:** https://nweinberg97.github.io/NomNoms/

GitHub Pages works with either Pages source setting:
- **Deploy from a branch** (`main`, root): Pages serves `index.html` at the repo root, a self-contained build of the app. Regenerate it with `npm run build:pages` and commit it whenever you change the app.
- **GitHub Actions**: `.github/workflows/pages.yml` builds `dist/` and deploys it on every push to `main`, so `index.html` no longer needs updating by hand. To enable real Google/Apple sign-in there, add `GOOGLE_CLIENT_ID` / `APPLE_CLIENT_ID` / `APPLE_REDIRECT_URI` as repository *variables* (Settings → Secrets and variables → Actions → Variables) and add the Pages URL to the OAuth client's allowed origins.

## What you can do

- **Sign in** with Google or Apple (real OAuth when configured, demo account otherwise).
- **Create a baby**: name and birthday; everything else is optional.
- **Capture** in two taps from anywhere: take a photo or video with the in-app camera, add photos or videos from the library, write a memory, record a voice note, or add a milestone. On phones the camera falls back to the native camera picker; anywhere without a camera it falls back to upload.
- **Lightweight editor**: one big "What happened?" field. Date is guessed from the photo's timestamp. Type, people and place hide behind "Add details". Importing a pile of photos from different days offers to save them as one memory per day.
- **Timeline** grouped into chapters, with search ("grandma", "beach", "first"), filters (photos, videos, milestones, stories, favorites) and a chapter jump.
- **Milestones**: a timeline of firsts with the baby's age at each, plus gentle prompts for firsts still to come. Custom milestones welcome ("First time stealing Dad's glasses").
- **Favorites** (♡) feed the cover, chapter openers and the film.
- **Two clear outputs**: *Make the book* (the printable book and its PDF) and *Make the film* (a short movie with music). Videos belong to the film: the printed book drops them on the fly, re-fitting each page so there's never a hole. The saved book itself is never changed by this.
- **Build My Book**: the "magic" sequence, then an automatically designed book. "Update book" adds new memories into their chapters and leaves every page you edited as it is.
- **Book reader**: two-page spreads on desktop, single pages on phones, keyboard/swipe/arrow navigation, contents, page grid, and videos that play right on the page.
- **Book editor, phone first**: tap any photo on the page to replace it (from the memory, the chapter, everything, or straight from the phone), move it earlier/later or remove it; pick a layout from live mini pages; edit words; move a page with "Move, then tap where"; add or remove pages; Undo for every change. On a computer pages can also be dragged.
- **Style**: five colour palettes, three type pairings (Classic Lora, Modern Inter, Playful Poppins) and three page shapes (portrait 8×10, square 8×8, landscape 11×8.5). Every layout reflows for each shape. *Make it nicer* fits photos to the page shape and smooths the rhythm, but only on pages the parent hasn't touched.
- **Film**: short / medium / long, three built-in royalty-free soundtracks composed in the browser (Lullaby, Sunny, Dreamy) or your own song file, choose which moments are in. Settings are remembered.
- **Backup & restore**: one .zip with every memory, caption, photo and (optionally) video. Restore on any device, from Settings or the first screen ("Moving from another device?"). Restoring merges and never deletes.
- **Export**: PDF (8×10 in, every page exactly as designed), backup JSON, Memory Film (play in-app or save as a video file).
- **Share**: Private (default) / Family (invite by email) / Anyone with link, for the whole book or a single chapter, plus "Preview as family". A single memory can be shared as a beautifully set image card.
- **Settings**: baby details, privacy, storage, connected services, account, load demo / delete all data.
- **Persistence** across sessions: everything above survives a reload.

## Architecture

```
src/
  lib/types.ts                 Domain model (Baby, Memory, MediaItem, Milestone, Chapter, Book, BookPage…)
  data/seed.ts                 The demo family
  repositories/                Persistence contracts + LocalRepository (localStorage, metadata only)
  services/media/              MediaService → MediaProvider (demo assets, IndexedDB on device, future cloud)
  services/auth/               Google / Apple sign-in with demo fallback
  book/chapters.ts             Derives chapters + titles from memories
  book/layoutEngine.ts         Deterministic layout engine (templates, rhythm, cover, spreads)
  book/BookPageView.tsx        The one page renderer (reader, thumbnails, share view, PDF, cards)
  book/Reader.tsx              Full-screen digital book
  export/                      PDF (pdf-lib), memory cards, Memory Film (canvas + MediaRecorder)
  state/store.tsx              App store: the only place UI meets repositories and media
  screens/ components/ styles/ UI
```

**Clean seams.** Components never touch storage. They call the store; the store talks to `Repositories` (data) and `MediaService` (binaries); the layout engine is a pure function of memories + media metadata; export renders the same page component the reader uses.

```
UI ─▶ store ─┬─▶ Repositories ──▶ LocalRepository      (today)
             │                 └─▶ SupabaseRepository / CloudRepository (later)
             ├─▶ MediaService ───▶ DemoMediaProvider   (bundled demo media)
             │                 ├─▶ BrowserMediaProvider (IndexedDB on this device)
             │                 └─▶ GoogleDriveProvider / ICloudProvider / S3Provider (later)
             ├─▶ AuthService ────▶ Google Identity Services / Sign in with Apple / demo
             └─▶ generateBook()  (pure)  ─▶ BookPageView ─▶ Reader · PDF · Share view · Film
```

### Data model

`Baby` · `Memory` (type, title, caption, date, mediaIds, location, people, tags, favorite, milestoneId) · `MediaItem` (id, kind, storageProvider, storageKey, url, thumbnailUrl, mimeType, width, height, duration, createdAt, metadata) · `Milestone` (links to memories) · `Chapter` (derived, title overridable per book) · `Book` (pages, hidden memories, chapter titles, cover, share settings) · `BookPage` (layout, memoryIds, mediaIds, page text).

Every record carries a `babyId`, so more babies and more family members fit without reshaping data. Captions are read live from memories, so editing a caption anywhere updates the book.

### Media: references, never blobs in app state

The app database stores **references** to media (`storageProvider` + `storageKey`). The binary lives wherever the provider keeps it:

- `demo` — files in `public/demo/` (inlined as data URIs in the single-file build).
- `browser` — photos/videos you add are stored as Blobs in **IndexedDB** on the device (with a 520px thumbnail generated at import), never in localStorage. Object URLs are created on demand. If IndexedDB is unavailable (some private modes), media is kept in memory for the session and Settings says so.

Adding a cloud provider means implementing `MediaProvider` (`upload / get / getThumbnail / delete / list`), registering it with `MediaService.register()`, and pointing `MediaService.uploadProvider` at it. Nothing above the media layer changes.

### The layout engine

`generateBook()` is deterministic — no AI required:

1. **Chapters**: memories grouped by month; thin months fold into their neighbor; each chapter is titled from what happened in it ("First smile" → *Finding Your Smile*, "First steps" → *First Steps*) or from the baby's month of life.
2. **Cover**: the most-loved photo (favorites and milestones score highest).
3. **Pages** chosen from each memory's content: milestone → typographic arch page (or full-bleed variant when milestones crowd together); video → video page; long text → story page with a drop cap, or a quote page if there's no photo; 1 photo → full-bleed / hero + caption / split; 2 → editorial two-up; 3 → three-image grid; 4 → four-up; 5+ → collage. Small everyday single-photo moments are gathered into "Little moments" grids so 500 casual photos still read well.
4. **Rhythm**: identical layouts never sit back to back; landscape photos get promoted to full bleed; continuation pages drop repeated captions.

Templates: Cover, Chapter opener, Full bleed, Hero + caption, Split image, Editorial two-up, Three/Four image grid, Memory collage, Milestone, Story, Video, Quote, Closing. Pages are sized with container-query units (`cqmin`), so one component renders identically everywhere and in every shape. Styles (`book/styles.ts`) only redefine the page's colour and type tokens; a book without a `style` looks exactly like the original design.

`mergeIntoBook()` updates an existing book without disturbing it, `printablePages()` derives the printed book (no videos, no gaps) and `polishBook()` (`book/polish.ts`) is the *Make it nicer* pass.

### Export

- **PDF** — client-side: the printable pages are rendered by `BookPageView` off-screen, rasterized (html-to-image) and assembled with pdf-lib at the book's page size (8×10, 8×8 or 11×8.5 in). A server renderer (vector text, print bleed) can replace this later without changing the book model.
- **Memory Film** — `export/film.ts` builds a timeline (title card → chapter cards → photo/video shots → end card) and draws it to a canvas with Ken Burns motion and crossfades. The same renderer plays in-app and records to MP4/WebM via `MediaRecorder` in Chrome, Edge and Safari 18+. Music is rendered with an `OfflineAudioContext` (`export/music.ts`) and mixed into the recording. The timeline is data, so a server-side pipeline (ffmpeg/Remotion) can render the identical film later.
- **Backup** — see *Protecting family data* below.

### Sharing and privacy

Books are **private by default**. Sharing is an explicit per-book choice: Private, Family (invite list), or Anyone with link; whole book or one chapter. In this prototype a share link resolves through a local index, so it opens on the same device ("Preview as family" shows exactly what a relative would see). With a backend, the same `ShareSettings` drive a server-checked `/book/:token`.

## Protecting family data

Real families keep their only copy of these memories here, so every release follows these rules:

1. **Storage names never change.** localStorage keys `nomnoms:v1:<account>:{babies,memories:<baby>,milestones:<baby>,media:<baby>,book:<baby>,prefs,schema}`, the IndexedDB database `nomnoms-media` and its `files` store are fixed. New fields are additive and optional; old records must render unchanged.
2. **Migrations are versioned and reversible.** `services/schema.ts` keeps `SCHEMA_VERSION` and a `MIGRATIONS` map. Before migrating it snapshots the account (`nomnoms:snapshot:<account>:latest`) and restores it if any step throws. To change the data shape: bump the version, add a migration, add an upgrade test.
3. **Media is never overwritten.** `writeStored()` skips keys that already exist; restore writes files before records, and merges by id.
4. **Upgrade test before every push**: load data with the live build, open the new build, and check every key and media file is byte-for-byte the same.
5. **Ask the browser to keep the data** (`navigator.storage.persist()`), show a storage meter in Settings, warn when videos get large, and nudge for a backup.

### Backup format (also the future import format)

A backup is a .zip: `manifest.json` + `media/<storageKey>.<ext>` (+ `.thumb.jpg`). The manifest is `{ format: "nomnoms-backup", formatVersion: 1, appSchema, exportedAt, includesVideos, account, prefs, babies: [{ baby, memories, milestones, media, book }], files: [{ storageKey, path, thumbPath, mimeType, size }], skipped }`.

### Moving to Supabase

The backup is designed to be the one-time import into a backend:

1. Tables mirror the types in `lib/types.ts`: `families`, `babies`, `memories`, `milestones`, `media_items`, `books` (book pages as `jsonb`), `preferences`. Every row has `family_id` with row-level security on it; ids are kept as text so links between records survive.
2. An import script (Edge Function or Node) reads `manifest.json`, uploads each `files[]` entry to Storage at `<family_id>/<storageKey>`, then upserts records by id (`on conflict do nothing`, the same never-overwrite rule as restore) and rewrites each media item to `storageProvider: "supabase"`.
3. In the app, add `SupabaseRepository` (implements `Repositories`) and `SupabaseMediaProvider` (implements `MediaProvider`), then point the store at them. On first sign-in, offer "Move this device's book to your account", which builds a backup in memory and runs the same import.

## Backlog

- **Printed books for sale**: order a hardcover from the PDF via a print partner (Lulu / Peecho / Prodigi API), vector PDF with bleed, pricing and checkout. This is the main monetisation path.
- **Cloud sync** (Supabase as above) so phone and computer share one book without backup files; family members with roles.
- **Spotify**: its API doesn't allow mixing tracks into an exported video, so the film uses built-in royalty-free music or the parent's own song file. A licensed music library could add more tracks later.
- Server-rendered MP4 film; more palettes and type pairings; per-chapter styles.

## Authentication setup

Copy `.env.example` to `.env`. Only **public client IDs** go here; no secrets are ever bundled.

**Google**
1. Google Cloud Console → APIs & Services → Credentials → *Create OAuth client ID* → Web application.
2. Authorized JavaScript origins: `http://localhost:5173` and your production origin.
3. Set `GOOGLE_CLIENT_ID=…` and rebuild. The button now runs Google Identity Services (token client → userinfo).

**Apple**
1. Apple Developer → Identifiers → *Services IDs*; enable Sign in with Apple, register your domain and return URL (Apple requires HTTPS, so test on a deployed URL or a tunnel).
2. Set `APPLE_CLIENT_ID=` (the Services ID) and `APPLE_REDIRECT_URI=`.

Without these, both buttons sign in to a private demo account on this device and the app says so. Real integration first, graceful fallback second.

## Future architecture

```
NomNoms Web / iOS / Android
        │
  Authentication ── Google · Apple
        │
  Family & Baby data ── Postgres (Supabase) via SupabaseRepository; family members + roles
        │
  Memory service ── capture API, dedupe, EXIF dates & places
        │
  Media storage ── MediaProvider: Google Drive · iCloud · Google Photos import · Dropbox · OneDrive · S3/R2
        │
  Book generation engine ── same generateBook(), run server-side on change
        │
  Export & sharing ── vector PDF + print partners · MP4 film renderer · signed share links
```

**Where AI plugs in** (the core works without it): suggested captions from photo + date + milestone; milestone detection; smarter chapter grouping and titles; duplicate / blurry detection and best-shot selection (`scoreMemory()` in the layout engine is the hook); chapter summaries and annual recaps; "Best of the month"; narrated films; nudges for moments that are missing.

## Built deliberately without

No backend, database, Firebase/Supabase, payments, family permissions, social feed, or trackers (feeding, sleep, diapers). One family, one baby, one beautiful living book. Moving between devices works with a backup file until cloud sync lands.

## Notes

- **Demo photos**: the demo family uses real photos from [Unsplash](https://unsplash.com) (free under the Unsplash License), loaded from Unsplash's image CDN and cropped to each page's shape; the mapping and photographer credits live in `src/data/demoPhotos.ts`. Demo videos show as a photo with a play badge (and move gently in the film). If Unsplash can't be reached, the generated stand-ins in `public/demo/` are shown instead.
- **Fonts**: Lora (display), Inter (interface) and Poppins (Playful book style) are self-hosted under the SIL Open Font License.
- **Tooling**: plain esbuild instead of a framework CLI keeps the toolchain to one small dependency; React 19 + TypeScript.
- **Browser support**: current Chrome, Safari, Firefox and Edge. In-app camera needs HTTPS (or localhost). Saving the film as a video needs `MediaRecorder` canvas capture.

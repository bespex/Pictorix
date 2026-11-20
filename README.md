# Pictorix

**Sort, rank and rate a folder full of photos - one quick decision at a time.**

Pictorix is the successor of [Image Organizr (iorg)](https://github.com/Skrrytch/ImageOrganizr), rebuilt with
[Tauri 2](https://tauri.app) (Rust) and [Svelte 5](https://svelte.dev). It shows you one image or one pair of images at
a time and asks a single question: *Which one comes first?*, *How many stars?* or *Which category?* When you are done,
it renames the files or moves them into folders, so any file manager shows your result - no database, no lock-in.

## Modes

| Mode | Question | Result |
|------|----------|--------|
| **Order** | Which of two images comes first? (merge sort, ~n·log₂n votes) | `001-beach.jpg`, `002-sunset.jpg`, … |
| **Knockout · Find the winner** | Pairwise tournament until one image is left | `001-…`; images out in the same round share a placement |
| **Knockout · Rank all** | Tournament until every placement is decided | `001-…`, `002-…`, … |
| **Rate** | One to ten stars | `07-beach.jpg` |
| **Categorize** | Which category? Categories are created on the fly | `family/beach.jpg` |

## What is new compared to iorg 1.x

- **Progress is saved after every vote.** Close the app at any time and continue later - Pictorix offers to resume
  when you open the folder again.
- **Undo in every mode**, including both knockout modes.
- **Every applied result can be undone** - right after applying or later from the start screen of that folder.
- **Safe renaming**: everything is checked before the first file is touched, a conflict aborts without any change, and
  swapped names (`001-a` ↔ `002-b`) are handled with a two-phase rename.
- **Copy instead of move**: write the result into a separate folder and keep the originals untouched.
- **Re-sorting a folder** replaces the old prefix instead of stacking it (`001-003-beach.jpg` → `001-beach.jpg`).
- **More formats**: JPG, PNG, WebP, GIF, BMP and AVIF; images are shown upright according to their EXIF orientation.
- **Realistic vote estimates** on the start screen and a live "about N to go" while voting.
- Drag & drop a folder, recent folders, natural file order (`img2` before `img10`), dark mode, full screen (F11).
- Small packages (a few MB instead of ~40 MB), because the system web view is used instead of a bundled Java runtime.

## Keyboard

| Where | Key | Action |
|-------|-----|--------|
| Start screen | 1-4, Enter | Pick a mode, start |
| Order, Knockout | Enter | Keep the order - the left image comes first |
| Order, Knockout | ← | Move the right image to the front |
| Rate | 1-9, 0 | 1-9 stars, 0 = ten stars |
| Categorize | 1-9 | Assign one of the first nine categories |
| Categorize | Tab, then Enter | Type and add a new category (Ctrl+Enter also assigns it) |
| Everywhere while voting | Ctrl+Z / Backspace | Undo |
| Everywhere while voting | F11 | Full screen |

Right-click a star or a category to see the latest images in it.

## Command line

```
pictorix [directory] [--mode=order|simple-knockout|full-knockout|rate|categorize] [--lang=en|de]
```

## Development

Requirements: Node.js 22, Rust (stable) and on Linux the WebKitGTK development packages
(`libwebkit2gtk-4.1-dev libayatana-appindicator3-dev librsvg2-dev`). Windows 10/11 ships WebView2.

```bash
npm install
npm run tauri dev            # run with hot reload
npm test                     # voting logic (Vitest)
npm run check                # type check (svelte-check)
cargo test --manifest-path src-tauri/Cargo.toml   # file operations (needs an existing dist/ folder)
npm run tauri build          # packages: .deb/.rpm/.AppImage on Linux, .msi/.exe on Windows
```

### Structure

```
src/lib/core/       voting logic, pure TypeScript, fully unit-tested
  algorithms.ts     merge sort and knockout, written against an "ask" callback
  session.ts        a session = mode + files + answers; everything else is replayed from the answers
  plan.ts           result -> new file names
src/components/     the screens (Welcome, ModeSelect, VoteScreen, Summary, Done)
src-tauri/src/      Rust backend
  folder.rs         reading an image folder
  thumbs.rs         cached thumbnails (EXIF-aware)
  apply.rs          checked two-phase rename/copy with journal and revert
  store.rs          saved sessions and journals in the app data directory
```

## License

[MIT](LICENSE) © Bert Speckels

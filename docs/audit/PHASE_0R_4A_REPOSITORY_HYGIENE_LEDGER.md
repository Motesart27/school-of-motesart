# Phase 0R.4A Repository Hygiene Ledger

Date: 2026-07-16

Branch: `feat/som-redesign-phase-0r`

Starting commit: `02642c9e973cd5c5cfbf0bf3ef798c1d054270c5`

Locked Phase 0 baseline: `1683cb1225d9d43e7155f74bd96eca451e2294a6`

## Scope and starting-state gate

This session is limited to stopping Git tracking of generated root `node_modules/`, generated root `dist/`, and files whose basename is `.DS_Store`, plus the minimum approved `.gitignore`, audit, and governance changes. The fresh checkout, index, and worktree were clean. Local HEAD and `origin/feat/som-redesign-phase-0r` both resolved to the required starting commit; `origin/main` resolved to `9b5449f059d45afc56f9c1e389d8d7f78a3c26af`. The remote refs were rechecked after the census and had not moved.

## Tracked-tree census before action

| Category | Tracked blobs | Tracked bytes | Classification |
|---|---:|---:|---|
| Root `node_modules/` | 5,234 | 67,258,265 | Generated dependency installation |
| Root `dist/` | 33 | 48,847,181 | Generated Vite build output |
| `.DS_Store` at any level | 4 | 24,592 | macOS metadata |
| Tracked `.env*` files | 0 | 0 | None found |

The four metadata paths were `.DS_Store`, `dist/.DS_Store`, `public/.DS_Store`, and `src/.DS_Store`. The `dist` count therefore overlaps one `.DS_Store`; the authorized removal set contains 5,270 unique paths.

Filesystem census found only the repository-root `node_modules/` and `dist/` directories. Package-internal paths containing a `dist` segment are ordinary dependency contents beneath root `node_modules/`; no similarly named directory outside the authorized roots is affected.

### Largest tracked dependency objects

| Path classification | Bytes |
|---|---:|
| `node_modules/esbuild/.../bin/esbuild` | 9,859,426 |
| `node_modules/@esbuild/.../bin/esbuild` | 9,859,426 |
| `node_modules/tailwindcss/.../peers/index.js` | 4,501,254 |
| `node_modules/vite/.../dep-*.js` | 2,086,035 |
| `node_modules/@rollup/.../*.node` | 1,763,808 |

Top dependency directory byte totals were: `esbuild` 9,983,598; `@esbuild` 9,859,953; `@babel` 8,264,733; `tailwindcss` 5,590,081; `react-dom` 4,513,549; `vite` 3,279,269; `rollup` 2,833,332; `@remix-run` 2,761,297; `caniuse-lite` 2,364,408; and `jiti` 2,003,102.

### Largest tracked build objects

| Path classification | Bytes |
|---|---:|
| `dist/SOM Game vids 2/Drum Off.mp4` | 9,295,489 |
| `dist/SOM Game vids 2/Sight the Note.mp4` | 7,003,927 |
| `dist/SOM Game vids 2/Note Scrambler.mp4` | 6,910,022 |
| `dist/SOM Game vids 2/Rhythm Racer.mp4` | 6,236,794 |
| `dist/SOM Game vids 2/Find Note.mp4` | 3,903,076 |

Top-level `dist` distribution was: `SOM Game vids 2/` 15 files / 44,059,965 bytes; `Motesart Avatar 1.PNG` 3,002,900 bytes; `assets/` 6 files / 1,382,776 bytes; `tami-avatar.png` 256,047 bytes; `lesson_data/` 6 files / 93,701 bytes; `logo-anim.mp4` 44,347 bytes; `.DS_Store` 6,148 bytes; `index.html` 1,187 bytes; and `_redirects` 110 bytes.

## Operational-reference census

- `netlify.toml` runs `npm run build` and publishes `dist`. Netlify regenerates the directory from source.
- `nixpacks.toml` also runs `npm run build`.
- `server.js` serves `dist` with `express.static` and sends `dist/index.html`; it requires a completed build, not a Git-tracked build artifact.
- No source file imports from root `dist/` or directly from root `node_modules/`.
- Package scripts use normal npm executable resolution. No script depends on committed dependency contents.
- `package-lock.json` is lockfile version 3 and contains 331 package entries including the root entry. Isolated `npm ci` installed the dependency graph successfully, proving the committed lockfile is sufficient for installation.
- No runtime, deployment, test, or script evidence requires committed `dist` or committed `node_modules`.

No operational hard-stop condition was found.

## Privacy census

The two audited historical Settings contact literals were handled only as in-memory search needles and are not reproduced here. Before hygiene, each produced one tracked-tree match, both classified as the stale generated JavaScript bundle under `dist/assets/`. After removing `dist` from the candidate tracked tree, each match count is zero. A fresh current-source production-model build also has zero matches for each value.

This removes current-branch tracked copies only. It does not claim to erase prior Git objects, and no history rewrite was performed.

## Approved ignore rules

The complete candidate `.gitignore` is:

```gitignore
# Dependencies
node_modules/

# Generated build output
dist/

# Local Netlify metadata
.netlify/

# macOS metadata
.DS_Store
```

The pre-existing Netlify exclusion was preserved and normalized to the approved directory rule. No unrelated pattern was added.

## Ending tracked-tree census

| Category | Ending tracked paths |
|---|---:|
| Root `node_modules/` | 0 |
| Root `dist/` | 0 |
| `.DS_Store` at any level | 0 |

`package.json`, `package-lock.json`, `netlify.toml`, source, public assets other than the authorized metadata deletion, audit evidence, and visual evidence remain tracked. Generated `node_modules/`, generated `dist/`, and `.DS_Store` paths are ignored. No environment file was added, removed, changed, or exposed.

## Preservation

The removals are ordinary tree changes on the Phase 0R branch. They are not a history rewrite. Prior Git history and verified bundles retain the earlier objects.

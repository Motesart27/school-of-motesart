# Phase 0R.4A Verification Report

Date: 2026-07-16

Starting commit: `02642c9e973cd5c5cfbf0bf3ef798c1d054270c5`

## Installation and production build

Starting-commit and candidate-tree builds ran from separate archive-based verification directories with identical inputs.

| Check | Result |
|---|---|
| Node | `v25.9.0` |
| npm | `11.12.1` |
| Locked install | PASS — 284 packages installed; 285 audited |
| Production build | PASS — Vite 5.4.21, 136 modules transformed |
| Public build-time variable | `VITE_API_URL` name only; value omitted |
| Recreated `dist` | PASS |
| Recreated `node_modules` and `dist` ignored | PASS |
| New tracked/staged install or build paths | 0 |

Existing npm audit output reported 10 dependency findings (1 low, 7 moderate, 2 high). Dependency remediation is outside this session. Existing build warnings reported the mixed static/dynamic import of `concept_state_store` and a JavaScript chunk larger than 500 kB; neither was introduced or altered here.

Generated assets in both builds included `assets/index-BbFOgpkL.js`, `assets/index-DU_EH7TS.css`, `assets/tami_question_handler-BmiGZcSv.js`, `assets/curriculum_data_provider-tAY3HAFO.js`, and the copied public assets.

## Input equality proof

| File | SHA-256 before and after |
|---|---|
| `package.json` | `eda1587ad24e4f3d1ccb2c517c52e3a9ff39140df4b75e5f793b65511cb3d4c1` |
| `package-lock.json` | `f6ec44c0849f0062cc1315c86aaea1b63b99db92b996290f2edcaa2c681450de` |
| `netlify.toml` | `9c47193679b36af668d3aab317b3e5eeee5cfa5b1d127a2eac3638c841b44315` |

Their Git blob IDs are also identical between the starting and candidate trees. The only staged changes beneath `src/` and `public/` are the explicitly authorized deletion of their `.DS_Store` files. No application source or hand-authored public asset changed.

## Before/after generated-build equivalence

The starting build contained 39 files; the candidate build contained 38. The sole path difference was generated `.DS_Store`, copied from the starting commit's tracked `public/.DS_Store`. After excluding that authorized metadata file, the complete sorted SHA-256 manifests compare exactly.

- `index.html`: byte-identical.
- JavaScript assets: byte-identical.
- CSS assets: byte-identical.
- Public copied assets: byte-identical except removal of `.DS_Store` metadata.
- Route behavior: unchanged.
- Product source difference: 0.
- Product/runtime output difference: 0.

The freshly generated candidate `dist` remained ignored and was not copied back into Git tracking.

## Privacy verification

Search values were kept out of logs and artifacts. For both historical Settings contact values:

- Candidate tracked-tree match count: 0.
- Fresh candidate-build match count: 0.
- Historical Git objects were not rewritten.

## Browser regression

The complete formal route harness ran against the freshly generated candidate build. External TTS isolation was confined to temporary verification interception and changed no repository file.

| Metric | Result |
|---|---:|
| Route patterns | 34 |
| Viewports | 3 |
| Captures attempted | 102 |
| Captures completed | 102 |
| Desktop 1440×900 | 34 |
| Tablet 768×1024 | 34 |
| Mobile 390×844 | 34 |
| Navigation failures | 0 |
| Console errors | 0 |
| Page errors | 0 |
| Normalized final-URL changes | 0 |
| Route/guard changes | 0 |
| Unexpected persistent visual differences | 0 |

The bulk PNG corpus remains in temporary verification storage and is not committed. A targeted deterministic Login/auth rerun captured nine implemented states with zero capture failures, zero interaction failures, one wake call per mount, and no Login/auth regression.

## Tracked-tree and ignore verification

- Tracked root `node_modules` paths: 0.
- Tracked root `dist` paths: 0.
- Tracked `.DS_Store` paths: 0.
- `node_modules`, `dist`, root/nested `.DS_Store`: all matched their intended ignore rules.
- `package.json`, `package-lock.json`, and `netlify.toml`: tracked and unchanged.
- No source, route, guard, auth, API, lesson, game, dashboard, dependency, lockfile, Vite, Netlify, or locked-baseline change occurred.
- No environment file changed.

## Allowlist result

The candidate contains 5,270 authorized tracked deletions: 5,234 beneath root `node_modules/`, 33 beneath root `dist/` (including one `.DS_Store`), and three additional `.DS_Store` files. Other changes are limited to `.gitignore`, additive `PROJECT_BRAIN.md`, the two Phase 0R.4A reports, and compact evidence under `docs/audit/phase0r-4a/`.

Automated classification of all 5,277 staged paths returned zero disallowed paths. `git diff --cached --check` passed with no whitespace error.

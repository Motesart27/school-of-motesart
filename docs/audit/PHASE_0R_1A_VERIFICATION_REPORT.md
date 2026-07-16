# Phase 0R.1A Verification Report

## Build and tests

- Locked install: `npm ci` completed successfully with 284 packages. npm reported the repository's existing 10 audit findings (1 low, 7 moderate, 2 high); no dependency or lockfile remediation was attempted.
- Production build: `npm run build` completed successfully with Vite 5.4.21 and 136 transformed modules.
- Build warnings: the existing mixed static/dynamic import warning for `concept_state_store.js` and the existing chunk-size warning. No build error occurred.
- Clean locked-baseline JavaScript asset: `index-Bmes__Gp.js`.
- Remediated JavaScript asset: `index-CBR-Ccxh.js`.
- Tests: `npm run` exposes `start`, `dev`, `build`, and `preview`; this repository has no test script. The production build and route/browser suites were therefore the applicable executable checks.

Dependency installation and both builds ran in the isolated verification tree `/private/tmp/som-phase0r-1a-verification`. No generated `dist`, dependency, or configuration file from that tree was copied into this branch.

## Affected-route evidence

The affected-route harness captured `/move-it` and `/practice-log` with the Log Session modal open at 1440x900, 768x1024, and 390x844.

| Set | Attempted | Completed | Navigation failures | Console errors | Page errors |
|---|---:|---:|---:|---:|---:|
| locked before | 6 | 6 | 0 | 0 | 0 |
| remediated after | 6 | 6 | 0 | 0 | 0 |
| remediated repeat | 6 | 6 | 0 | 0 | 0 |

- Before: `visual-regression/phase0r-1a/affected-before/`
- After: `visual-regression/phase0r-1a/affected-after/`
- Repeat after: `visual-regression/phase0r-1a/affected-after-repeat/`
- Reproducible harness: `visual-regression/phase0r-1a/capture-affected.mjs`

The expected visible changes are limited to `3→4 and 7→8` on `/move-it` and the `×` close control in the `/practice-log` Log Session modal. The remaining twelve substitutions are comments and create no rendered delta.

## Complete locked-baseline suite

The locked 34-route capture script was run twice against the remediated production build.

| Run | Attempted | Completed | Navigation failures | Console errors | Uncaught page errors | Locked PNG SHA-256 mismatches |
|---|---:|---:|---:|---:|---:|---:|
| full after | 102 | 102 | 0 | 0 | 0 | 51 |
| immediate repeat | 102 | 102 | 0 | 0 | 0 | 49 |

Three mismatches in each run are the approved `/move-it` glyph correction at the three viewports. The first run had 48 unrelated raw PNG hash mismatches; the repeat had 46. The changing mismatch population, plus a transient paint artifact in the first affected-route run that disappeared on the identical-build repeat, proves that byte identity is affected by the suite's animation/timing/paint state. Those raw mismatches occur on unchanged routes and are retained as evidence rather than suppressed.

Source-controlled review found no route, guard, fixture, final-URL, behavior, layout, or styling change on those unchanged routes. Consequently:

- Expected persistent visual deltas: 3 in the default full suite (`/move-it` at three viewports), plus 3 modal-state deltas in the dedicated `/practice-log` evidence.
- Unexpected persistent product visual deltas: 0.
- Raw screenshot-hash mismatches unrelated to approved corrections: 48 on run one; 46 on repeat, classified as non-deterministic capture variance rather than product deltas.
- Product behavior changes: 0.
- Route/guard changes: 0.

The complete runs and manifests are under `visual-regression/phase0r-1a/full-after/` and `visual-regression/phase0r-1a/full-after-repeat/`. Locked baseline PNGs remain unchanged.

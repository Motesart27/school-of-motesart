# Proposed Phase 1 Implementation Sequence

This is a proposal only. Phase 1 authorization does not automatically approve these sessions. Each session requires Denarius review of the preceding evidence and its own exact scope.

## Phase 1B — Tokens and typography

Expected scope:

- add `src/styles/tokens.js` with the approved exact contract;
- expose approved root CSS custom properties through the separately authorized root style location;
- load DM Sans 400/500/700 and Outfit 500/600/700 exactly once;
- remove the production Syne load only after network/font/render verification;
- add no page migration, icon replacement, primitive, route, or Chart.js change.

Gates: resolve ambassador gold or retain it absent; preserve muted-text restriction; prove protected/preserved/surgical flows render without source edits; verify one font request, build, and full route suite. Rollback: revert the isolated 1B commit.

## Phase 1C — Icon system and primitives

Expected scope:

- add the production `Icon` component and approved primitive components;
- add a default-off, feature-flagged, admin-only `/dev/kit` route using existing `AdminRoute` unchanged;
- replace only context-verified, non-protected UI emoji/TODO glyphs approved for that session;
- defer GamePage, Login/Registration/Auth, dashboards/data hydration, preserved gates/data, lesson engine, WYLPracticeLive, lessonDataLoader, and unavailable Rhythm Racer collision paths;
- make no Chart.js migration.

Gates: protected-path allowlist, icon occurrence ledger, keyboard/focus/touch/a11y tests, public/student direct-route denial, flag-off route absence, build, and full route suite. Rollback: revert the isolated 1C commit.

## Phase 1D — ChartFrame and deprecation markers

Expected scope:

- implement ChartFrame and migrate PracticeLogPage from Chart.js canvas to approved static/responsive SVG framing;
- remove the Chart.js CDN from `index.html` only after repository census and verified replacement;
- add deprecation headers/markers to `src/styles/theme.js` and the Tailwind palette without deleting legacy values;
- do not perform repository-wide theme migration or legacy-theme deletion.

Gates: data-shape equality, legend/summary/freshness/source/sample states, grayscale and screen-reader verification, no hidden Chart.js consumer, build and full route suite. Rollback: revert the isolated 1D commit and restore the CDN/PracticeLog pair together.

## Sequence rationale

Typography and semantic values must exist before primitives consume them; the Icon/primitives kit must exist before a governed development route can present it; ChartFrame then consumes the approved tokens and primitives while isolating CDN removal to the only verified active Chart.js consumer. Each step remains independently reviewable and reversible.

# Phase 1B Token and Typography Verification Report

Date: 2026-07-16

Starting commit: `2c04f8b559954b8dcd5201d7b5dfdfe23650078c`

Scope: semantic tokens and canonical typography foundation only.

## Implementation result

The approved contract is implemented in `src/styles/tokens.js` with exactly twelve top-level families and 81 unique CSS custom properties. The exported contract and CSS-variable map are frozen. `installDesignTokens(root)` performs the only installation work and has no module-evaluation document or window side effect. Celebration-spring approximations are absent from runtime exports.

`src/styles/foundations.css` is limited to root surface/text defaults, box sizing, body/control DM Sans, heading Outfit, inherited control color, font synthesis, and reduced-motion-safe document behavior. It defines no component, page, role, route, icon, chart, layout-utility, transition, or animation system.

`src/main.jsx` adds only the stylesheet import, installer import, and pre-render installation call. The complete `createRoot(...).render(...)` subtree has SHA-256 `9099e54795431a4b68813363205fc4c0b381276d92653c958526671dd25b6150` before and after.

`index.html` now has one canonical Google Fonts stylesheet request for DM Sans 400/500/700 and Outfit 500/600/700, a fonts.gstatic.com crossorigin preconnect, no Syne family, and the approved `#0A0D16` boot background. Chart.js, title, root, build marker, and application script are unchanged.

## Contract verification

Command: `node docs/audit/phase1b/verify-design-token-contract.mjs`

- Result: PASS.
- Required/production families: 12/12; additional families: 0.
- CSS variables unique/installed: 81/81.
- Contract JSON and production module parity: true.
- Ambassador identity gold: `#D6A84B`.
- Muted text: `rgba(244,246,251,0.48)`.
- Muted contrast on raised `#111527`: 4.662:1 (passes 4.5:1).
- Runtime celebration spring approximation: absent.
- Unresolved null production values: 0.
- Canonical Syne loader occurrences: 0.
- Final contract SHA-256: `e75b6f562a710c2e19d0367d752f2fa3c93982472a87b751d721d1cb8fa6bb2e`.

## Install and build

- Node: v25.9.0; npm: 11.12.1.
- `npm ci`: PASS, 284 packages added; the pre-existing audit result remains 1 low, 7 moderate, and 2 high vulnerabilities. No fix was run.
- `npm run build`: PASS with Vite 5.4.21 and 138 transformed modules.
- Generated assets: `assets/index-BmgLpm1r.css` (48.39 kB) and `assets/index-D2RlKbMY.js` (1,087.58 kB), plus unchanged copied assets and split data modules.
- Existing mixed static/dynamic import and large-chunk warnings remain. No dependency, lockfile, or build configuration changed.

## Targeted implemented evidence

Nine actual-application captures are under `visual-regression/phase1b-tokens-typography/`: Login/public, sanitized student shell, and sanitized/sample Practice Log at 1440×900, 768×1024, and 390×844.

- Captures: 9/9.
- Console errors: 0; page errors: 0.
- Canonical stylesheet requests: exactly 1 per capture.
- Syne requests: 0.
- All approved representative variables installed: yes.
- DM Sans available in all captures: yes.
- Outfit available wherever a rendered semantic heading requires it: yes.
- Detected horizontal overflow: 0; clipped rendered controls/headings: 0.
- Legacy requests observed and documented: the Login-local DM Sans/Outfit request, the student-shell Orbitron/Inter request, and the Practice Log local DM Sans/Outfit request.
- Personal or credential data: none; fixtures use synthetic `.invalid` identities.

## Full route regression

The candidate and an isolated archive of the starting commit were both built and captured using the same Node/npm versions, lockfile, 34-route census, three viewports, role fixtures, and temporary external-TTS interception. The interception existed only in `/private/tmp`; it did not alter repository files. A preflight without that isolation produced six known local-preview TTS console messages on `/my-coach`; the acceptance rerun produced none.

- Candidate captures: 102/102 (34 per viewport).
- Navigation failures: 0.
- Console errors: 0.
- Uncaught page errors: 0.
- Normalized final-URL changes: 0.
- Route/guard changes: 0.
- Authentication regressions: 0.
- Raw PNG hash mismatches: 85/102; thresholded pixel differences: 62/102.
- Expected persistent differences: approved base-surface alignment and DM Sans/Outfit typography where legacy local declarations do not override it.
- Unexpected persistent visual differences: 0.

The largest raw comparisons initially included black compositor tiles on mobile teacher views. A separate stabilized repaint check with GPU compositing disabled restored the complete content on both starting and candidate builds. The remaining differences were typography/paint differences consistent with the authorized foundation. Existing narrow mobile dashboard/curriculum presentation remains migration debt and was not changed here.

## Equality and scope proof

Direct comparison with the starting commit found no changes to Registration, Login, GamePage, AuthContext, api.js, dashboards, preserved gates/JSON, WYLPracticeLive, lessonDataLoader, PracticeLogPage, App/routes, theme.js, Tailwind, package files, Netlify/Vite/server/Nixpacks configuration, or locked visual baselines. Protected source changes, route changes, guard changes, chart changes, icon changes, and component-primitive changes are all zero.

Verdict: **PHASE 1B READY TO CLOSE**.

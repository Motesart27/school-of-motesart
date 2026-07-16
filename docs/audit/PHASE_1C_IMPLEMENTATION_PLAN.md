# Phase 1C Pre-Edit Implementation Plan

Date: 2026-07-16

Starting commit: `e00a25f7cff1dbc894922eba51d7c33a311caba5`

Branch: `feat/som-redesign-phase-1`

## Governance and census

The controlling strategy and work-order sources are the read-only v1.1.1 files in `/Users/Denarius Motes/Downloads/SOM-Governance/`. They were verified present and read before planning. They will not be copied, edited, staged, or committed.

The Phase 1A inventory remains the current Phase 1B census because Phase 1B changed only `src/main.jsx` and added `src/styles/tokens.js` and `src/styles/foundations.css`; none contains an inventoried interface glyph. The current census is 460 candidate occurrences in 91 file/category groups: 161 potentially eligible and 299 deferred. This session authorizes exactly one replacement.

## Planned production additions

- `src/components/ui/Icon.jsx`
- `src/components/ui/iconPaths.js`
- `src/components/ui/index.js`
- `src/components/ui/ui.css`
- `src/components/ui/Button.jsx`
- `src/components/ui/Card.jsx`
- `src/components/ui/StatusPill.jsx`
- `src/components/ui/Skeleton.jsx`
- `src/components/ui/EmptyState.jsx`
- `src/components/ui/ErrorState.jsx`
- `src/components/ui/Input.jsx`
- `src/components/ui/Select.jsx`
- `src/components/ui/Tabs.jsx`
- `src/components/ui/FilterChips.jsx`
- `src/components/ui/Tooltip.jsx`
- `src/components/ui/Modal.jsx`
- `src/components/ui/Drawer.jsx`
- `src/components/ui/Toast.jsx`
- `src/components/ui/useDialogFocus.js`
- `src/pages/DevKit.jsx`
- `src/pages/DevKit.css`

Planned icon names (32): arrow-left, arrow-right, arrow-up, arrow-down, chevron-down, close, check, plus, minus, play, replay, pause, warning, info, success, error, bolt, music-note, piano, metronome, microphone, volume, star, heart, menu, filter, search, settings, user, gamepad, flag, timer.

Planned primitives: Button, Card, StatusPill, Skeleton, EmptyState, ErrorState, Input, Select, Tabs, FilterChips, Tooltip, Modal, Drawer, ToastProvider/useToast.

## Exact existing-file changes

`src/App.jsx` will receive only: React `lazy`/`Suspense` imports; the `VITE_ENABLE_DEV_KIT` strict boolean constant; a build-time-eliminable lazy DevKit import; an accessible primitive-based loading fallback; and a conditional `/dev/kit` route wrapped in the byte-identical existing `AdminRoute`. Existing guards, routes, elements, redirects, and route order otherwise remain unchanged. No navigation link will be added.

`src/pages/MyCoachPage.jsx` will receive the minimum `Icon` import and replace only the visible Back text-arrow with `<Icon name="arrow-left" size={20} decorative />`. The word, handler, navigation result, and page behavior remain unchanged. Minimum inline alignment ensures the existing target is at least 44px high.

Feature flag: `VITE_ENABLE_DEV_KIT`. It is enabled only by the exact string `true`; absent or any other value is off.

## Protected and deferred scope

All remaining 459 candidate occurrences remain deferred. This includes every protected flow/file, dashboard and hydration source, TamiChat, preserved lesson gates and JSON, WYLPracticeLive, lessonDataLoader, lesson/perception sources, Rhythm Racer collision paths, PracticeLogPage, and all other eligible non-protected occurrences not explicitly approved as the pilot. No ChartFrame, chart migration, Chart.js removal, theme/Tailwind work, broad replacement, dependency, route-guard, or auth change is planned.

## Verification and rollback

Verification will cover source contracts, icon registry, keyboard/focus behavior, both feature-flag build states, the complete role-access matrix, 12 targeted captures, a flag-off 102-capture regression, protected/guard/config equality, allowlist, and staged-secret scans.

Rollback is one surgical revert of the eventual Phase 1C commit. The Dev Kit remains default-off and no production deployment is authorized.

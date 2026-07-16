# Phase 0R.3B Protected Login-Flow Exception Ticket

## Status

**PREVIEW / GOVERNANCE ONLY — IMPLEMENTATION NOT AUTHORIZED.**

Protected flow affected: Login. `src/pages/Login.jsx` is Approval-Required through protected-flow membership under Constitution Article V and the redesign Protected-File Register.

## Business and privacy justification

The current public Login footer exposes an infrastructure-oriented wake control and modal browser alerts to families. A silent, non-blocking best-effort warm call removes operational language from the customer-facing surface while preserving immediate access to authentication controls. The work is a mapped Phase 0 privacy-audit item; it is not a visual redesign or auth rewrite.

## Exact current behavior

- A public “Wake up servers” button is rendered at `Login.jsx:132-138`.
- Clicking it calls `api.wake()` and opens a success or failure `alert` at `Login.jsx:135`.
- `api.wake()` performs a raw API-root fetch and JSON parse at `api.js:214`.
- Wake is independent of the credential submission handler at `Login.jsx:37-59`.
- Current live root observations are JSON 404 responses; because `response.ok` is not checked, those resolve through the current success-alert branch.

## Exact proposed behavior

1. Remove the public wake button.
2. Remove both wake-related alert paths.
3. Start exactly one best-effort `api.wake()` call when Login initially mounts.
4. Keep email, password, Sign In, Google sign-in, credential submission, login errors, token/session handling, user extraction, and redirects independent of wake state.
5. Pending: footer status “Warming up…”.
6. Resolved: no status; footer contains only “School of Motesart.”
7. Failure or four-second UI timeout: footer status “Sign-in may take a moment.”
8. Status uses `role="status"` and `aria-live="polite"`, never moves focus, opens no dialog/toast, and announces no repeating change.

## Planned surgical line ranges

The line numbers below reference commit `91326c10…` and will be revalidated immediately before any approved edit.

- `Login.jsx:1`: add `useRef` to the existing React import only if needed to guarantee one wake start per mount under development strict-effect replay.
- `Login.jsx:32-35`: add isolated wake-presentation state and a one-start ref; do not alter login state.
- Immediately before `Login.jsx:37`: add one mount-only effect that calls existing `api.wake()`, races it against a four-second presentation timer, catches locally, and updates only wake-presentation state.
- `Login.jsx:130-139`: remove the wake button and render the approved pending/delayed status beside the unchanged footer label.
- `Login.jsx:171-172`: replace only the now-unused wake-button style with a subdued status style, if the preview presentation is approved.

No `api.js`, `AuthContext`, route, backend, registration, or configuration edit is planned.

## Explicit non-scope

- No changes to `handleLogin`, credential state, login loading, login errors, token extraction, `extractUser`, AuthContext, session verification, role logic, redirect logic, Google action, Registration, routes, guards, backend, API contracts, styling outside the footer status, Login-card design, or “School of Motesart” footer text.
- No health endpoint substitution and no assertion that wake success equals backend health.
- No recovery, approximation, cherry-pick, or reconstruction of unavailable commit `b4758d32baed10f00e07848f0839e76dcf35d1e2`.

## Auth-regression risk analysis

| Risk | Control |
|---|---|
| Wake delays form interactivity | Effect promise is never awaited by render or submit; status state is separate. |
| Wake failure becomes login error | Wake catches locally and never calls `setLoginError`. |
| Credentials clear on wake state update | Wake effect never touches email/password state; verification must assert preservation. |
| Multiple calls from field rerenders | Mount-only effect plus one-start ref; browser assertion counts one call after ordinary field updates. |
| Alert/focus interruption | No `alert`, toast, focus call, or dismissible control. |
| Auth logic changes accidentally | Protected line-range review and source-diff gate: `Login.jsx:17-64,92-128` must remain unchanged. |
| Misleading success on root 404 | Success means only that the existing promise resolved; status disappears silently and makes no health claim. |
| Pending request never settles | Four-second UI bound transitions to delayed text; sign-in remains independent. |

## Lost-work collision disclosure

The unavailable local-only commit `b4758d32baed10f00e07848f0839e76dcf35d1e2` included `src/pages/Login.jsx`. Its content is unavailable in the controlling local and remote history. This ticket does not recreate, infer, or silently replace that work. Implementation would intentionally supersede any unavailable Login changes using the current production-derived branch, and Denarius must approve that supersession explicitly.

## Rollback plan

If later approved and implemented, rollback is a revert of only the future Phase 0R.3B implementation commit. The preview/governance commit contains no product behavior and does not require runtime rollback.

## Verification plan for a later approved implementation

- Exact protected-flow diff review and unchanged-line proof for login/auth logic.
- Isolated locked install and production build.
- Current-user route matrix and login E2E: rejected login, successful student redirect, token/user extraction, session persistence, Google control enabled.
- Deterministic wake states: pending, resolved, rejected, and bounded timeout.
- Immediate typing and submit while wake remains pending.
- Credentials preserved when wake rejects/times out and when login itself rejects.
- Exactly one wake request per mount and no repeats on field updates.
- Zero alerts, focus movement, blocking toasts, console errors, or page errors.
- Three-viewport before/after capture and full 102-route regression with unexpected deltas = 0 outside Login.

## Explicit unresolved approvals

1. Does Denarius approve superseding the unavailable `b4758d3` Login work with the current production-based surgical implementation?
2. Does Denarius approve the exact pending text: “Warming up…”?
3. Does Denarius approve the exact delayed text: “Sign-in may take a moment.”?
4. Does Denarius approve removing the wake button, removing wake-related alerts, making one non-blocking wake call on initial mount, and making no login/auth behavior change?
5. Does Denarius approve implementation in `Login.jsx` after reviewing the rendered previews?

All five decisions must be explicitly approved before implementation begins.

# Phase 0R.3B Login Current State

## Provenance and protection

- Source branch: `feat/som-redesign-phase-0r`.
- Source commit: `91326c10a0a51bfa1f87acdff7523bab84a4473d`.
- Protected flow: Login, under `motesart_constitution.md` Article V.
- Analysis only: no product, runtime, auth, API, route, backend, styling, or configuration file was edited.

## Verified current behavior

| Behavior | Current-source evidence |
|---|---|
| User-visible wake control | `src/pages/Login.jsx:130-139` renders a footer button labeled “Wake up servers.” |
| Wake invocation | `src/pages/Login.jsx:135` calls `api.wake()` from the button click handler. |
| Success dialog | `src/pages/Login.jsx:135` resolves the wake promise into a browser `alert`; deterministic browser verification observed one success-classified alert for a JSON response. |
| Failure dialog | `src/pages/Login.jsx:135` catches a rejected wake promise and opens a second browser `alert`; deterministic browser verification observed one failure-classified alert for a network failure. |
| API root request | `src/services/api.js:214` implements `wake` with a raw `fetch` to the configured API root and parses the response as JSON. |
| Separate from credential submission | Wake is attached only to the footer button at `Login.jsx:132-138`. Credential submission is handled independently by `handleLogin` at `Login.jsx:37-59`. |

The wake function does not check `response.ok`. Any parseable JSON response, including an HTTP error response, resolves its promise and therefore currently selects the success alert path.

## Protected Login behaviors that must remain unchanged

- Credential form, controlled email/password state, and submission: `Login.jsx:32-59,92-115`.
- Login request contract: `api.login(email, password)` at `Login.jsx:45` and `api.js:59-60`.
- Token extraction and required-token validation: `Login.jsx:46-50`.
- User extraction and authenticated-context handoff: `Login.jsx:17-22,51-52`.
- Authenticated redirect: `Login.jsx:28-30,53`.
- Login error handling and loading state: `Login.jsx:34-35,39-40,47-58,111-114`.
- Google action: `Login.jsx:61-64,124-128`.
- Auth storage, role protection, session verification, and force logout: `src/context/AuthContext.jsx:16-30,39-55,57-94`.
- Registration route/action: `Login.jsx:83-90,117-120`.

The proposed later work must not change any item in this protected list.

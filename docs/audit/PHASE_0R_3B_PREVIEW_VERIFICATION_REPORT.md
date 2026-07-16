# Phase 0R.3B Preview Verification Report

## Scope and provenance

- Source commit: `91326c10a0a51bfa1f87acdff7523bab84a4473d`.
- Unchanged product build: isolated `npm ci` and `npm run build`, 136 modules transformed.
- Render harness: `visual-regression/phase0r-3b-preview/capture-login-preview.mjs`.
- Browser-surface note: the in-app browser was unavailable after the required connection and discovery checks, so the requested standalone Playwright harness ran against the isolated production build.
- No Login, API, AuthContext, route, backend, product, runtime, style, dependency, or configuration file was edited.

## Rendered preview

Twelve sanitized screenshots were captured: current, proposed pending, proposed success, and proposed delayed states at `1440x900`, `768x1024`, and `390x844`.

The current state is unchanged product DOM. Proposed states are temporary browser-DOM injection only: the harness removes the wake button after render and adds the proposed status element where applicable. These states are not implemented product behavior.

| State | Captures | Wake button | Status |
|---|---:|---|---|
| Current | 3 | visible | none |
| Proposed pending | 3 | absent | “Warming up…” |
| Proposed success | 3 | absent | none; footer retains only “School of Motesart.” |
| Proposed delayed | 3 | absent | “Sign-in may take a moment.” |

Results: 12/12 captures completed; final path `/login` for all; console errors 0; page errors 0; unexpected dialogs 0. No credentials, names, personal email addresses, or personal information appear in screenshots. The manifest explicitly labels every injected state as non-implemented preview behavior.

## Current-alert confirmation

Using unchanged product behavior and deterministic interception:

- Parseable JSON response: one success-classified browser alert.
- Network failure: one failure-classified browser alert.

This confirms both current alert branches without calling live auth or using credentials.

## Interaction-safety feasibility

The harness simulated the proposed mount-only wake behavior using temporary page-context fetch and deterministic network interception. It did not persist code.

| Assertion | Result |
|---|---|
| Email field accepts typing immediately while wake is pending | pass |
| Password field accepts typing immediately while wake is pending | pass |
| Sign In remains enabled before submission | pass |
| Google action remains enabled | pass |
| Exactly one wake request per mount | pass |
| Ordinary email/password updates cause no repeated wake request | pass |
| Login request proceeds while wake remains pending | pass |
| Rejected login displays its own sanitized login error | pass |
| Wake does not replace or become the login error | pass |
| Credentials remain populated after rejected login while wake is pending | pass |
| Successful login retains current redirect behavior | pass; final path `/student` |
| Proposed path opens an alert dialog | no; dialog count 0 |

The successful redirect proof uses the unchanged Login handler, unchanged AuthContext, and deterministic sanitized auth response. It is evidence of feasibility, not authorization or implementation.

## Accessibility preview

Pending and delayed injected status nodes use `role="status"` and `aria-live="polite"`. The preview performs no focus movement and creates no dialog, toast, dismissal control, or repeating announcement. Success removes the status node entirely.

## Verdict

The proposed presentation and non-blocking interaction model are feasible without changing `api.js`, AuthContext, routes, backend, or credential submission. The root-call semantics and unavailable `b4758d3` Login collision remain explicit governance considerations. Implementation remains blocked on all five approvals in the exception ticket.

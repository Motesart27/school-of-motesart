# Phase 0R.5A Credential Verification Report

Starting commit: `236f3d9f70ac7471894a3171553e0f73a30bf49b`.

## Current-tree remediation

`PROJECT_BRAIN_HANDOFF.md` was changed on one line only. The directly reusable credential pair was replaced with a direction to use the approved operational credential channel. No identifier, password, hint, replacement secret, or reversible encoding was copied elsewhere.

Post-edit current tracked-tree results:

- password-value matches: **0**;
- account-identifier matches: **0**;
- reusable credential-pair matches: **0**;
- application-source matches: **0**.

The historical objects remain unchanged and still contain the exposed value. This is not historical erasure.

## Operational containment result

- Pre-containment result: **OLD CREDENTIAL AUTHENTICATES**.
- Containment action: **unresolved; no safe authorized rotation path and no approved replacement-secret destination were available**.
- Post-edit old-credential result: **OLD CREDENTIAL AUTHENTICATES**.
- HTTP classification: **2xx**.
- Token-shaped value returned: **yes**, immediately discarded.
- Non-identifying role returned: **student**.
- Rate-limit/security control triggered: **no**.
- Session, token, or cookie retained locally: **no**.

The current branch no longer publishes the plaintext, but the operational credential blocker remains because the exposed old credential is still valid.

## Product and build verification

- Node: `v25.9.0`; npm: `11.12.1`.
- `npm ci`: passed; 284 packages installed and 285 audited.
- Existing audit result: 10 vulnerabilities (1 low, 7 moderate, 2 high); no fix was run.
- `npm run build`: passed; 136 modules transformed.
- Existing warnings: mixed static/dynamic import and a JavaScript chunk above 500 kB.
- Starting-commit and candidate generated `dist` trees: byte-identical.
- Candidate generated output password matches: **0**.
- Generated `node_modules` and `dist`: ignored and untracked.
- `src/**`, `public/**`, package and lock files, Netlify/Vite/server/Nixpacks configuration, protected paths, and locked visual baselines: byte-identical to the starting commit.
- A browser suite was not required because every product, route, configuration, dependency, and build input is unchanged and the generated output is byte-identical.

The complete staged allowlist and secret-leak scan are recorded in `docs/audit/phase0r-5a/summary.json`.

The staged change contains exactly six allowlisted paths and zero disallowed paths. Staged diff content was not retained in evidence; the candidate index contains zero identifier and password matches.

Verdict: **PHASE 0R.5A NOT READY — old credential remains valid and no authorized rotation plus secret-storage path was available.**

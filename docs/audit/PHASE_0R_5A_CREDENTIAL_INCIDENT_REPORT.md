# Phase 0R.5A Credential Incident Report

Review basis: Phase 0R closure-review commit `236f3d9f70ac7471894a3171553e0f73a30bf49b`.

## Discovery and exposure

- `PROJECT_BRAIN_HANDOFF.md` contained exactly one clearly labeled test-account credential block.
- The account was explicitly classified as a test student and assigned to authenticated mobile verification of the practice flow.
- Initial current-tree account-identifier matches: **1**, in `PROJECT_BRAIN_HANDOFF.md` only.
- Initial current-tree password-value matches: **1**, in `PROJECT_BRAIN_HANDOFF.md` only.
- Initial reusable credential-pair path count: **1**.
- Application-source matches for either value: **0**.
- Tracked generated-output matches: **0**; generated dependency and build output are not tracked at this branch tip.
- No automated test, CI/CD, Netlify configuration, backend health check, browser-capture fixture, workflow, or script references the account. The handoff itself does retain an operational mobile-verification instruction that depends on it.

Reachable history contains the password value in **23 commits**, from **2026-05-23T10:41:54-04:00** through **2026-07-16T04:46:06-04:00**. All affected paths classify as documentation/handoff: `PROJECT_BRAIN_HANDOFF.md`. Historical presence makes disablement or rotation mandatory; history rewriting was not authorized and was not performed.

## Dependency classification

**B. TEST ACCOUNT — CURRENT APPROVED DEPENDENCY**

The account cannot be classified as dependency-free because the current handoff assigns it to authenticated mobile verification. Repository searches found no broader automated or production-user dependency, but they do not supersede that explicit operational instruction.

## Authentication and containment assessment

One pre-containment request through the current production login contract returned a 2xx response, a token-shaped value, and the non-identifying `student` role. No response body, token, cookie, credential, or account identifier was emitted or persisted. Result: **OLD CREDENTIAL AUTHENTICATES**.

Automatic disablement is prohibited for classification B. Rotation was not performed because repository and operational documentation provide neither a documented account-management mechanism nor an approved external secret-storage destination. The Airtable administrative CLI expected by the available workflow was not installed, and no direct datastore write was attempted.

Required operational disposition: **MANUAL SECRET-STORAGE DECISION REQUIRED**, followed by rotation through an explicitly authorized account-management path. No product, authentication, backend, schema, route, configuration, dependency, or datastore change was made.

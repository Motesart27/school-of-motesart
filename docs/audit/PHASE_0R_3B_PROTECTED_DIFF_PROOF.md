# Phase 0R.3B Protected Login Diff Proof

## Scope and source

- Starting commit: `b567fa337f3725a00e144c63968448ae0a2bfbbb`.
- Controlling source: the current production-derived `feat/som-redesign-phase-0r` history.
- Implementation candidate: the single commit containing this report; its exact SHA is the final local/remote preservation ref.
- Authorized product file: `src/pages/Login.jsx` only.
- The unavailable `b4758d32baed10f00e07848f0839e76dcf35d1e2` Login work was not reconstructed, inferred, or claimed. Denarius explicitly approved superseding it for this surgical implementation.

## Exact changed hunks

The `Login.jsx` diff is limited to five approved hunks:

1. Line 1 adds the required `useRef` React hook import.
2. Lines 36–38 add isolated `wakePresentation`, `wakeStartedRef`, and `wakeRequestRef` values.
3. Lines 40–64 add the mount-only wake effect. It stores one request promise, starts it through the ref guard, applies a four-second presentation timer, settles ready/delayed once, catches rejection locally, suppresses state updates after unmount, and clears the timer.
4. Lines 159–166 replace only the public wake button with the approved conditional status node and preserve `School of Motesart`.
5. Line 199 replaces only the obsolete `wakeBtn` style with the minimum subdued `wakeStatus` style.

No other Login hunk changed. The source delta is 36 insertions and 9 deletions.

## Protected equality proof

The following normalized protected fragments have identical pre-change and post-change SHA-256 values:

| Protected fragment | Before SHA-256 | After SHA-256 | Result |
|---|---|---|---|
| `extractUser` | `d57cdc9d3ea431a554ac765fd92baee3cca0b1e7fb50f72f9113c66e4d12092f` | same | Equal |
| Authenticated redirect effect | `083055c147587e5147a524f68612e8bad699d95f15df9378e8a9ad1c4daf351c` | same | Equal |
| `handleLogin` | `cc20b7a75f1756b70f028cbcd1822848dd33c184db31b865879e9699a0eed0bc` | same | Equal |
| `handleGoogle` | `3658d8dc05586e480507a0314e6c5ab6bca5ac157da35f699187fba2b668fc2c` | same | Equal |
| Credential form | `6a4ce809680246d81748138883d43622c25b9df11bcf1884ff83ce018dbf7def` | same | Equal |
| Token/user handoff | `31de9fd16f6ec229c534638932281ed659b7f92f93624b8e04dbe61b5e68b921` | same | Equal |

Full-file direct equality checks also passed:

- `src/services/api.js`: working tree and `HEAD` SHA-256 both `d4543716788d9c108aed755fb9a7c31b890e757e77e53222cdde8b1cad35b2fb`.
- `src/context/AuthContext.jsx`: working tree and `HEAD` SHA-256 both `f12991e19ad7411f96dc1db764f7202686bf26b140808ef3d0d597e47be17b8a`.

`api.js`, AuthContext, Registration, routes, guards, backend, configuration, dependencies, and lockfiles are unchanged. No protected login/auth behavior was rewritten.

## Semantic boundary

A resolved `api.wake()` promise selects `ready` only under the existing contract: the request completed and returned parseable JSON. It is not a backend-health, login-readiness, authentication-readiness, or health-check declaration. The four-second bound governs presentation only and never blocks or cancels authentication.

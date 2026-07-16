# Phase 0R.3B Wake Behavior Report

## Method

Five sequential, unauthenticated requests were made to the configured public backend API root. The controlled frontend origin was `http://127.0.0.1:4173`. No credentials, authorization header, cookies, or secret values were supplied. Response bodies were not logged; only status, media type, parseability, size, timing, and security-relevant headers were recorded.

## Results

| Attempt | HTTP result | Content type | JSON parsed | Latency | CORS origin accepted | Set-Cookie |
|---:|---:|---|---|---:|---|---|
| 1 | 404 | `application/json` | yes | 240 ms | yes | absent |
| 2 | 404 | `application/json` | yes | 144 ms | yes | absent |
| 3 | 404 | `application/json` | yes | 114 ms | yes | absent |
| 4 | 404 | `application/json` | yes | 110 ms | yes | absent |
| 5 | 404 | `application/json` | yes | 86 ms | yes | absent |

The server echoed the controlled frontend origin in `Access-Control-Allow-Origin` and returned `Access-Control-Allow-Credentials: true`. Browser-origin access therefore succeeded for this tested local origin. This does not prove every deployed origin or environment.

## Behavioral interpretation

- The root call is unauthenticated and `api.wake()` does not attach the stored SOM token because it bypasses the shared `request()` helper.
- No response set a cookie, redirected, or exposed an observable auth/session mutation.
- Five consecutive calls produced the same response class and no observable rate, state, or duplication problem.
- The root currently returns JSON `404`, not a health-success status.
- `api.wake()` still resolves because it parses JSON without checking `response.ok`; the existing UI can report “success” for a 404.
- A JSON parsing failure or network rejection enters the current failure-alert path.
- `api.wake()` has no explicit client timeout or abort signal. A stalled connection can remain pending until the browser/network stack terminates it.
- The shared 15-second request timeout in `api.js:10-35` does not apply to `api.wake()`.

These five warm-state observations are not proof of cold-start behavior, other networks, production-browser CORS, or all backend environments.

## Timeout recommendation

**A bounded client-side UI timeout is recommended for the later Login implementation.** Use a four-second `Promise.race` around the existing `api.wake()` call inside `Login.jsx` without changing `api.js`. The bound should control only the status presentation: after four seconds, show “Sign-in may take a moment.” and continue allowing the underlying best-effort request to settle. It must never block credentials, Sign In, Google sign-in, auth redirects, or error handling.

Because the current API contract treats parseable 404 JSON as resolution, the later surgical Login-only implementation can present best-effort warming state but cannot claim backend health. Any change that requires HTTP-status-aware wake semantics or cancellation would require a separate `api.js` contract ticket and approval.

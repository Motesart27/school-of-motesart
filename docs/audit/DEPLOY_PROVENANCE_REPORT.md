# Deploy Provenance Report

Recovery date: 2026-07-15/16 UTC  
Scope: Phase 0 recovery only  
Verdict: **EXPLAINED AND SAFE**

## Production source and health

- Authoritative source: `9b5449f059d45afc56f9c1e389d8d7f78a3c26af` (`origin/main`).
- Netlify site: `68b307a9-ef37-4298-9e72-805381200e1c`, repository `Motesart27/school-of-motesart`.
- Published production deploy: `6a518002c12b800009ee7ced`; build: `6a518002c12b800009ee7ceb`.
- Deploy state `ready`, plugin state `success`, context `production`, branch `main`, commit reference exactly `9b5449f059d45afc56f9c1e389d8d7f78a3c26af`, published `2026-07-10T23:28:19.792Z`.
- Backend `/health` returned `overall_status: GREEN`; backend, login/verify, TAMi, agent, Airtable read, and optional calendar read checks were all `GREEN` at `2026-07-16T02:18:01.238628+00:00`.

Public Netlify metadata still identifies this deploy as current. No deployment was triggered by this audit.

## Build configuration

Repository `netlify.toml` specifies:

```toml
[build]
  command = "npm run build"
  publish = "dist"
```

No base directory is set, so the repository root is used. `npm run build` resolves to `vite build`. Vite deletes and regenerates output in `dist`; committed `dist` is therefore not served as an immutable input.

Clean reproduction inputs:

| Input | Evidence |
|---|---|
| Source | `9b5449f059d45afc56f9c1e389d8d7f78a3c26af` |
| Install | `npm ci` |
| Build | `npm run build` |
| Local Node/npm | `v25.9.0` / `11.12.1` |
| Resolved Vite | `5.4.21` |
| Lockfile SHA-256 | `f6ec44c0849f0062cc1315c86aaea1b63b99db92b996290f2edcaa2c681450de` |
| Repository Node pin | none |

Public build-time environment variable names found or relevant to source are `VITE_API_URL`, `VITE_RAILWAY_URL`, and `VITE_BACKEND_URL`; Vite also provides `DEV` and `MODE`. No environment values or secrets are recorded. The production-model build used the same previously evidenced public environment model.

## Artifact comparison

| Set | JavaScript | JavaScript SHA-256 | CSS SHA-256 | HTML SHA-256 |
|---|---|---|---|---|
| Committed `dist` | `index-hSk4rzEK.js`, 911,231 bytes | `c8116af336e28991f397457ced798704267262d78e5f710f898e603f64ac6c5c` | `b4e7f9cc5f6c84b9472aed753cfbcb9af727ebb8a64d89e5696ee2c8bb5b74f9` | not treated as production output |
| Clean production-model build | `index-Bmes__Gp.js`, 1,083,700 bytes | `6f2af8be2d595c33cd19cd18e68839f76d024edd761b2a76b3221ddb2531a0bf` | `b4e7f9cc5f6c84b9472aed753cfbcb9af727ebb8a64d89e5696ee2c8bb5b74f9` | `2928a1a8eae2d70c518d73ddf1613e7edb89e15c0ca21bec24e2814ef93a0c26` |
| Live Netlify production | `index-Bmes__Gp.js`, 1,083,700 bytes | `6f2af8be2d595c33cd19cd18e68839f76d024edd761b2a76b3221ddb2531a0bf` | `b4e7f9cc5f6c84b9472aed753cfbcb9af727ebb8a64d89e5696ee2c8bb5b74f9` | `2928a1a8eae2d70c518d73ddf1613e7edb89e15c0ca21bec24e2814ef93a0c26` |

`cmp` returned 0 independently for the clean/live HTML, JavaScript, and CSS files: all three are byte-identical.

Committed `dist` was last changed by `cf2fba3204174101dba2ee345f6f91f473e27749` on 2026-04-27 and is 83 commits behind the production source. A fresh build replaces the old JavaScript filename. The mismatch is therefore caused by stale committed output plus the production build-time environment model, not by a different source commit, stale production deployment, dependency drift, or evidenced nondeterminism.

## Verdict

**EXPLAINED AND SAFE.** Production is attributable to and byte-reproducible from `9b5449f`. Committed `dist` remains an inventoried governance concern only; it was not edited.

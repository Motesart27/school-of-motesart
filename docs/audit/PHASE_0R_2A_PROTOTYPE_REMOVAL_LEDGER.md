# Phase 0R.2A Prototype Removal Ledger

Starting commit: `1000cdd5d09be1ad368e42bca5cd2e1d3709e24c`

Scope: privacy-first removal of only the two explicitly approved obsolete teacher-dashboard prototype paths.

## Fresh reference census

The entire tracked repository was searched for exact filenames, basename variants, static and dynamic imports, route declarations, script and HTML references, Netlify/Vite/build configuration references, asset references, and filesystem reads. References were then separated into runtime/operational references and documentation/audit mentions.

| Approved path | Starting-tree status | Git blob SHA | SHA-256 | Bytes | Runtime imports | Routes | Build/config/operational references | Documentation/audit mentions | Disposition |
|---|---|---|---|---:|---:|---:|---:|---:|---|
| `teacher-dashboard-v3.html` | tracked | `d7bb908ea884423445941630df058f7a3ca37d47` | `488a924f6206a8e9840e8dcca209d850102e6643c0880fa2fd9e6872220914ae` | 811396 | 0 | 0 | 0 | 2 | approved deletion |
| `src/pages/teacher-dashboard-v3.jsx` | absent and untracked | not present | not applicable | 0 | 0 | 0 | 0 | 2 | already absent; no action |

The two documentation mentions for each path are limited to `DEAD_FILE_AUDIT.md` and `PRIVACY_AUDIT.md`. No source, route, package, Vite, Netlify, server, redirect, HTML-link, asset-loader, or filesystem-read reference was found.

## Privacy and preservation

The tracked HTML prototype contains named or real-looking student fixtures and inactivity-style statistics. This report deliberately does not reproduce those details. The second path is mentioned in the locked privacy audit but is not present in the starting tree or reachable history available in this clone.

Historical preservation for the HTML prototype is provided by Git blob `d7bb908ea884423445941630df058f7a3ca37d47`, the Phase 0 locked branch at `1683cb1225d9d43e7155f74bd96eca451e2294a6`, the Phase 0R.1A starting commit, and the formal Phase 0 screenshot evidence. No prototype content is copied or archived elsewhere in this change.

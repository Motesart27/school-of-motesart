# Git Status and Allowlist Proof

Branch: `audit/som-redesign-phase-0`  
Base: `9b5449f059d45afc56f9c1e389d8d7f78a3c26af`

## Clean start

```text
## audit/som-redesign-phase-0
```

## Pre-stage status and tracked diff

```text
## audit/som-redesign-phase-0
 M PROJECT_BRAIN.md
?? docs/audit/
?? visual-baselines/

M PROJECT_BRAIN.md
PROJECT_BRAIN.md | 7 +++++++
1 file changed, 7 insertions(+)
```

`git ls-files -m` returned only `PROJECT_BRAIN.md`. `git diff --quiet -- . ':!PROJECT_BRAIN.md'` returned 0, proving no tracked product, source, runtime, configuration, route, style, auth, lesson, game, data-contract, dependency, or `dist` change.

## Exact allowlist

- `PROJECT_BRAIN.md`
- `docs/audit/PHASE_0_SESSION_LOG.md`
- `docs/audit/ROUTE_TRUTH.md`
- `docs/audit/ENCODING_AUDIT.md`
- `docs/audit/PRIVACY_AUDIT.md`
- `docs/audit/DEAD_FILE_AUDIT.md`
- `docs/audit/GIT_STATUS_PROOF.md`
- `docs/audit/REPOSITORY_DIVERGENCE_REPORT.md`
- `docs/audit/DEPLOY_PROVENANCE_REPORT.md`
- `visual-baselines/capture.mjs`
- `visual-baselines/manifest.json`
- `visual-baselines/*.png`

The automated porcelain comparison returned 113 paths: 11 exact non-PNG paths and 102 PNGs, with `disallowed: []`.

## Baseline integrity

```json
{
  "manifestEntries": 102,
  "pngFiles": 102,
  "routePatterns": 34,
  "sourceCommits": ["9b5449f059d45afc56f9c1e389d8d7f78a3c26af"],
  "viewports": {"1440x900": 34, "768x1024": 34, "390x844": 34},
  "navigationFailures": 0,
  "consoleErrors": 0,
  "pageErrors": 0,
  "hashMismatches": []
}
```

Final-URL differences were limited to the documented redirects: `/dashboard`, `/wyl-practice`, `/live-practice`, and the unmatched-route fixture, each at three viewports.

Staging uses only `git add PROJECT_BRAIN.md docs/audit visual-baselines`. `git add -A` is not used.

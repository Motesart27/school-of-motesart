# Phase 0R Protected-System Final Proof

Comparison: `1683cb1225d9d43e7155f74bd96eca451e2294a6` → `76bf6187d5b00ca95ee4ff5840e4abb39f09f609`.

## Cumulative inventory

The cumulative diff contains 5,570 paths: 5,271 deletions, 7 modifications, and 292 additions.

| Group | Paths |
|---|---:|
| Root `node_modules/` removals | 5,234 |
| Root `dist/` removals | 33 |
| Other `.DS_Store` removals | 3 |
| Added Phase 0R audit evidence | 27 |
| Added Phase 0R visual evidence | 265 |
| Modified product source files | 5 |
| Deleted obsolete prototype | 1 |
| Modified `.gitignore` | 1 |
| Additive governance file | 1 |
| Other | 0 |

The five modified product files are exactly `src/components/MiniCoachCard.jsx`, `src/pages/MoveItChapter.jsx`, `src/pages/PracticeLogPage.jsx`, `src/pages/Settings.jsx`, and `src/pages/Login.jsx`.

## Direct protected equality

| Protected/preserved system | Baseline blob | Tip blob | Result |
|---|---|---|---|
| `src/pages/Registration.jsx` | `388f38c4550f32becf81a4325ec9c636dab87b09` | same | EQUAL |
| `src/pages/GamePage.jsx` | `a5d40b3dafe73016a31fbbe602ba607d82ec6fe4` | same | EQUAL |
| `src/components/gate0/MajorScalePatternGate.jsx` | `217004c6e1fe47334f327c3fddb2d109980533ee` | same | EQUAL |
| `src/components/gate0/FindHomeGate.jsx` | `03c82acd56f757c9b606671f3ab25409d94e6d0e` | same | EQUAL |
| `src/components/gate0/SkipAndTogetherGate.jsx` | `25c41fdd4b4b6dc40b8303bb613130b65346e4b7` | same | EQUAL |
| `public/lesson_data/L00_find_home.json` | `3a0ab3a9ed7f37b44c7e77f445f1e7882a2aafb4` | same | EQUAL |
| `public/lesson_data/L01_skip_and_together.json` | `47ce84d8cf61f644dae9967ab668308c074a7af5` | same | EQUAL |
| `src/pages/WYLPracticeLive.jsx` | `1adffc886262ca8eeffce983f3ada0331a1d69de` | same | EQUAL |
| `src/components/gate0/lessonDataLoader.js` | `91b546af8b4939b7670f155bbe4621078c1cd995` | same | EQUAL |
| `src/App.jsx` route configuration | `e3af51de7df1b40617acd02694f7cf014f557d46` | same | EQUAL |
| `src/context/AuthContext.jsx` | `07b6394a9cd5f11dd36fecde5d02fcce802d4ccb` | same | EQUAL |
| `src/services/api.js` | `1b06666f1335de6ae5ee7c250d2382bee5233797` | same | EQUAL |
| `package.json` | `98c5fd1b3252c0fbdd4637b828213fb394037bf5` | same | EQUAL |
| `package-lock.json` | `e5b32bfc449743f2560dc6d4cfb568d19e4f92ca` | same | EQUAL |
| `netlify.toml` | `b701f8b8cface09bf3b495c4567d4cbbe3f0f4bd` | same | EQUAL |

No tracked `auth.py` exists at either comparison point; the protected backend file is outside this frontend repository and therefore was not changed here.

## Login exception boundary

`src/pages/Login.jsx` changed from blob `4931c5edd7a0db402573b0231eee16e2eb216f93` to `6a0ad380ddeed12d05274af62b6df2f423d49a23` only in approved commit `02642c9`.

The cumulative diff has exactly five authorized hunks: `useRef` import; isolated wake presentation state/refs; mount-only guarded wake effect with four-second presentation bound; footer status replacing the public wake button/alerts; and subdued status style replacing the obsolete button style. `extractUser`, authenticated redirect, `handleLogin`, `handleGoogle`, credential form, login error/loading, token/user handoff, `api.js`, and AuthContext remain equal as proven in `PHASE_0R_3B_PROTECTED_DIFF_PROOF.md`.

No other protected behavior was modified.

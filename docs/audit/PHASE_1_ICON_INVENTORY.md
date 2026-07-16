# Phase 1 Icon Inventory and Contract

Source commit: `7d3794c3a9ebc8266b72ed9d1163a8ec96d645ee`.

## Census

A Unicode-interface scan of non-generated source found **460 candidate glyph occurrences in 91 file/category groups**. Of these, **161 occurrences are potentially eligible non-protected work** and **299 are deferred** because they appear in protected, preserved, dashboard/data-hydration, lesson-engine, surgical-only, or unavailable Rhythm Racer collision scope. This is a candidate census: arrows in comments/data-flow notation and pedagogical music notation require human classification before any replacement.

Candidate categories include emoji used as icons/avatars, text arrows, check/close/status glyphs, music and achievement symbols, warning/energy symbols, and play/navigation controls. Existing SVGs are concentrated in domain visualizations (keyboards, charts, TAMi art, and game visuals); they are not a coherent shared UI icon family. Image/video assets remain content or brand assets and must not be repurposed as generic controls.

Representative eligible future mappings:

| Current function/category | Semantic name | Size | Eligibility |
|---|---|---:|---|
| Back/forward text arrows | `arrow-left`, `arrow-right` | 20 | Eligible only in ordinary, non-protected screens |
| Close check/cross glyph | `close`, `check` | 20 | Eligible after control semantics verified |
| Play/replay glyph | `play`, `replay` | 20/24 | Eligible outside lesson/game protected behavior |
| Warning/energy symbol | `warning`, `bolt` | 20 | Must retain adjacent text |
| Music/instrument emoji | `music-note`, `piano`, `metronome` | 24 | SVG academic treatment; no emoji avatar |
| Achievement star/heart | `star`, `heart` | 20/24 | Decorative or labeled according to meaning |
| Menu/filter | `menu`, `filter` | 20 | 44px control target |
| Game-mode treatment | `gamepad`, `flag`, `timer` | 24 | May use game gradient container, SVG remains currentColor |

## Protected exceptions

Automatic Phase 1 replacement is prohibited in:

- `src/pages/GamePage.jsx` — protected GamePage exception required.
- `src/pages/Registration.jsx`, `src/pages/Login.jsx`, AuthContext/API flows — protected-flow approval required.
- Student, Teacher, Parent, Admin, Ambassador, Games, Homework, Teacher-TAMi, TAMi dashboards and TamiChat — owning dashboard-role/data-hydration phase required.
- `src/components/gate0/MajorScalePatternGate.jsx`, `FindHomeGate.jsx`, `SkipAndTogetherGate.jsx` and audited lesson JSON — preserved.
- `src/pages/WYLPracticeLive.jsx` and `lessonDataLoader.js` — surgical-only.
- `src/hooks/usePracticeLogDashboard.js` and lesson-engine/perception sources — lesson/dashboard approval required.
- `src/pages/RhythmRacer.jsx` and `RhythmRacerV2.jsx` — unavailable `b4758d3` collision boundary; do not infer lost work.

Dead components such as MiniCoachCard/MyCoach are not migration targets until their disposition is approved. Pedagogical arrows, accidentals, notes, and transport symbols must remain text/notation when they carry instructional content rather than button-icon meaning.

## Future production contract

Future API: `<Icon name size />`.

- Inline SVG only; no icon font and no external dependency without separate justification and approval.
- 20px or 24px viewBox/grid; default stroke 1.5px; `currentColor`; round line caps and joins unless a selected symbol requires otherwise.
- `size` is restricted to the supported grid unless the component contract explicitly owns a larger illustration.
- Decorative icons use `aria-hidden="true"` and cannot receive focus.
- Meaningful icon-only controls require an accessible name on the control and a 44×44px target.
- Icons never carry error, warning, success, DPM, or chart meaning alone.
- Real avatars remain images with appropriate alternative text. No emoji avatars are introduced.
- Product Icon implementation is deferred to an approved Phase 1C session. This preview uses a standalone inline SVG map only.

## Replacement gate

Before any eligible replacement, Phase 1C must re-run the census, distinguish UI graphics from content/notation/comments, map every edited occurrence one-to-one, and obtain protected approval for every deferred path. This inventory authorizes zero replacements.

# Phase 1C Icon Registry

The production registry is a dependency-free, static inline-SVG map in `src/components/ui/iconPaths.js`, rendered only through `Icon.jsx`. All 32 names support exactly 20px and 24px, default to a 1.5px stroke, use `currentColor`, and use rounded caps/joins. Decorative icons are hidden from assistive technology. A meaningful standalone icon must set `decorative={false}` and provide `label`; an icon-only control is named by its parent control. Unknown names and unsupported sizes throw clearly in development and return no markup in production.

| Icon | Semantic purpose | Guidance / prohibited misuse |
|---|---|---|
| arrow-left | Previous/back direction | Decorative beside visible Back; not progress status |
| arrow-right | Next/forward direction | Pair with a visible action name |
| arrow-up | Upward direction | Not improvement by color/icon alone |
| arrow-down | Downward direction | Not decline or failure by itself |
| chevron-down | Expand/select affordance | Not a status indicator |
| close | Close/dismiss | Parent control supplies name |
| check | Selection/completion support | Never sole success cue |
| plus | Add/increase | Use visible action label where meaning is ambiguous |
| minus | Remove/decrease | Not destructive without clear context |
| play | Begin media/activity | Parent control supplies name |
| replay | Repeat activity/media | Do not imply remediation state |
| pause | Pause media/activity | Parent control supplies name |
| warning | Caution support | Must accompany warning text |
| info | Supplementary information | Must not hide essential content in tooltip only |
| success | Successful-state support | Must accompany visible text |
| error | Error-state support | Must accompany visible recovery text |
| bolt | Energy/quick action | Not DPM meaning by itself |
| music-note | General music content | Not an instrument-specific substitute |
| piano | Piano/instrument context | Use visible instrument text when needed |
| metronome | Tempo/timing tool | Not a generic timer |
| microphone | Voice/input control | Parent control supplies recording action/state |
| volume | Audio output | Parent control supplies mute/volume meaning |
| star | Favorite/achievement support | Not student assessment by itself |
| heart | Favorite/care support | Not status or health data |
| menu | Menu disclosure | Parent control supplies name |
| filter | Filter controls | Pair with visible or accessible filter name |
| search | Search | Parent control or field supplies name |
| settings | Settings | Parent control supplies name |
| user | Generic account/profile | Real avatars remain images; no emoji avatar |
| gamepad | Game mode | Must retain visible game label |
| flag | Milestone/marker | Not warning status by itself |
| timer | Duration/countdown | Time meaning must remain visible in text |

Visual-grid verification rendered every name at both 20px and 24px in all three Dev Kit viewports. The source verifier found 32 unique names, zero external URLs, static whitelisted SVG geometry, `currentColor`, the 1.5px default, and both accessibility guards.

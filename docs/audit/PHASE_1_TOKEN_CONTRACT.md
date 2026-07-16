# Phase 1 Token Contract

Controlling version: `SOM_FRONTEND_REDESIGN_STRATEGY_v1.1.1` Parts E1, E2, E3, H, and J.

Machine-readable preview contract: `docs/audit/phase1-preview/token-contract.json`.

Final approved machine-readable contract SHA-256: `e75b6f562a710c2e19d0367d752f2fa3c93982472a87b751d721d1cb8fa6bb2e`.

The production export has exactly these top-level keys: `surface`, `border`, `text`, `accent`, `status`, `role`, `dpm`, `chart`, `radius`, `space`, `type`, and `motion`. Session 1B implements this approved contract in `src/styles/tokens.js`.

## Canonical summary

| Family | Contract |
|---|---|
| Surfaces | base `#0A0D16`, raised `#111527`, elevated `#181D33`, overlay `rgba(10,13,22,0.72)`, glass `rgba(255,255,255,0.05)` |
| Borders/depth | subtle `rgba(255,255,255,0.08)`, strong `rgba(255,255,255,0.16)`, focus `#7DD3FC` at 2px + 2px offset, card shadow `0 4px 24px rgba(0,0,0,0.35)`, restrained accent glow at 25% |
| Text | primary `#F4F6FB`, secondary 64%, muted 48%, disabled 30% of primary |
| Primary | teal `#14B8A6`, hover `#2DD4BF`, deep `#0D9488` |
| Identity | intelligence `#A855F7`/`#7C3AED`; TAMi `#E84B8A` → `#A855F7`; coach `#F97316`; game `#8B5CF6` → `#D946EF` |
| Status | success `#22C55E`, encourage `#F5B93D`, warning `#F97316`, danger `#EF4444`, info `#38BDF8` |
| Roles | student teal, teacher `#F5A623`, parent `#3B82F6`, ambassador `#22C55E` + approved identity gold `#D6A84B`, admin `#F97316` |
| DPM | Drive `#3B82F6`, Passion `#F97316`, Motivation `#22C55E` |
| Chart | six-color categorical order; `#0D9488` → `#5EEAD4` sequential; danger ↔ `#334155` ↔ teal diverging |
| Radius | chart/control 12px, card 16px, pill 999px |
| Space | 4px base; 8/12/16/24/32/48px rhythm; card 20px desktop/16px mobile; gutters 24px/16px |
| Type | Outfit headings 500/600/700; DM Sans body/controls 400/500/700; display 32→26, H1 24→22, H2 20→18, H3 17→16, body 15, label 13, caption 12, overline 11 |
| Motion | 90/180/280/420/900–1200ms; specified enter/exit/state cubic beziers; reduced motion uses 120ms opacity crossfades |

Every JSON token records its CSS custom-property name, intended and prohibited usage, source section, and foundational versus role-specific scope.

## Contrast findings

Computed against raised `#111527`, primary text is 16.74:1, secondary text is 7.36:1, and the Denarius-approved 48% muted text is **4.662:1**. The earlier 42% proposal and its 3.88:1 result are superseded. Muted remains prohibited for error instructions, required labels, essential navigation, primary educational guidance, critical status, and any normal-size content whose actual-surface contrast falls below 4.5:1. Disabled text is 2.59:1 and is permitted only for genuinely disabled controls with non-color state cues. Accent/status fills use midnight text when white text would fail. Color is never the sole carrier of status, DPM, chart-series, or role meaning.

## Final approval resolutions

1. **Ambassador gold:** Denarius approved `#D6A84B` as an identity partner for Ambassador green `#22C55E`. It is not a warning/encourage status, generic action, teacher-gold substitute, or stand-alone identity cue.
2. **Celebration spring:** Strategy J's approximate stiffness `~260` and damping `~22` remain documentation-only. They have no production CSS variable or executable token.
3. **Muted text:** Denarius superseded 42% with `rgba(244,246,251,0.48)`. Its verified raised-surface ratio is 4.662:1 and its prohibited usages remain binding.
4. **Final contract status:** no unresolved null token remains. Legacy theme and page-local loader differences remain migration debt, not contract ambiguity.

## Prohibitions

No new or migrated source may introduce semantic raw colors when a token exists, use TAMi/game gradients as generic accents, use color alone for meaning, use disabled/muted values for essential content, load Syne, or add arbitrary spacing/radius/motion values. Protected and preserved files remain outside automatic migration.

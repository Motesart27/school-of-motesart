# Phase 1 Token Contract

Controlling version: `SOM_FRONTEND_REDESIGN_STRATEGY_v1.1.1` Parts E1, E2, E3, H, and J.

Machine-readable preview contract: `docs/audit/phase1-preview/token-contract.json`.

The planned production export has exactly these top-level keys: `surface`, `border`, `text`, `accent`, `status`, `role`, `dpm`, `chart`, `radius`, `space`, `type`, and `motion`. This document and JSON are preview contracts only; no production token module exists in Session 1A.

## Canonical summary

| Family | Contract |
|---|---|
| Surfaces | base `#0A0D16`, raised `#111527`, elevated `#181D33`, overlay `rgba(10,13,22,0.72)`, glass `rgba(255,255,255,0.05)` |
| Borders/depth | subtle `rgba(255,255,255,0.08)`, strong `rgba(255,255,255,0.16)`, focus `#7DD3FC` at 2px + 2px offset, card shadow `0 4px 24px rgba(0,0,0,0.35)`, restrained accent glow at 25% |
| Text | primary `#F4F6FB`, secondary 64%, muted 42%, disabled 30% of primary |
| Primary | teal `#14B8A6`, hover `#2DD4BF`, deep `#0D9488` |
| Identity | intelligence `#A855F7`/`#7C3AED`; TAMi `#E84B8A` → `#A855F7`; coach `#F97316`; game `#8B5CF6` → `#D946EF` |
| Status | success `#22C55E`, encourage `#F5B93D`, warning `#F97316`, danger `#EF4444`, info `#38BDF8` |
| Roles | student teal, teacher `#F5A623`, parent `#3B82F6`, ambassador `#22C55E` plus unresolved gold, admin `#F97316` |
| DPM | Drive `#3B82F6`, Passion `#F97316`, Motivation `#22C55E` |
| Chart | six-color categorical order; `#0D9488` → `#5EEAD4` sequential; danger ↔ `#334155` ↔ teal diverging |
| Radius | chart/control 12px, card 16px, pill 999px |
| Space | 4px base; 8/12/16/24/32/48px rhythm; card 20px desktop/16px mobile; gutters 24px/16px |
| Type | Outfit headings 500/600/700; DM Sans body/controls 400/500/700; display 32→26, H1 24→22, H2 20→18, H3 17→16, body 15, label 13, caption 12, overline 11 |
| Motion | 90/180/280/420/900–1200ms; specified enter/exit/state cubic beziers; reduced motion uses 120ms opacity crossfades |

Every JSON token records its CSS custom-property name, intended and prohibited usage, source section, and foundational versus role-specific scope.

## Contrast findings

Computed against raised `#111527`, primary text is 16.74:1 and secondary text is 7.36:1. Muted text is 3.88:1 and therefore cannot carry essential normal-size copy under the 4.5:1 contract. Disabled text is 2.59:1 and is permitted only for genuinely disabled controls with non-color state cues. Accent/status fills use midnight text when white text would fail. Color is never the sole carrier of status, DPM, chart-series, or role meaning.

## Conflicts and unresolved values

1. **Ambassador gold:** Strategy E1 says the ambassador identity uses a green-gold pairing but supplies only green `#22C55E`. `role.ambassadorGold` is therefore `null` and visibly unresolved. No gold may be invented in production.
2. **Celebration spring:** Strategy J gives approximate stiffness `~260` and damping `~22`. The JSON preserves them as documentation-only approximate guidance with no CSS variable. An implementation choice requires later approval.
3. **Muted text:** the exact strategy value does not meet the strategy's 4.5:1 normal-text floor on raised surfaces. Its usage is constrained to nonessential metadata, compliant large text, or content paired with a stronger accessible label. This is a usage conflict, not a value substitution.
4. **Ambassador pairing and motion are the only unresolved token-value issues found.** Legacy theme differences are migration debt, not controlling-contract conflicts.

## Prohibitions

No new or migrated source may introduce semantic raw colors when a token exists, use TAMi/game gradients as generic accents, use color alone for meaning, use disabled/muted values for essential content, load Syne, or add arbitrary spacing/radius/motion values. Protected and preserved files remain outside automatic migration.

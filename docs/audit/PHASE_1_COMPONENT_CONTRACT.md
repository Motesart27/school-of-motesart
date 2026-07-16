# Phase 1 Component Foundation Contract

This specification describes future production APIs and behavior. Session 1A implements none of them in application source.

## Shared rules

All interactive controls expose a programmatic name, visible focus, keyboard parity, a minimum 44×44px touch target, and reduced-motion behavior. Loading never silently changes an accessible name; disabled state uses native semantics where available and is not represented by opacity alone. Status and chart meaning always pair color with text, icon, line style, pattern, or shape. Sample values are labeled **Sample data** and never presented as live intelligence.

## Primitive specifications

### Button

API concept: `variant={primary|secondary|quiet|danger}`, `size={sm|md|lg}`, `leadingIcon`, `iconOnly`, `loading`, `disabled`.

Primary, secondary, quiet/ghost, danger, icon-leading, and icon-only variants support default, hover, pressed, focus-visible, loading, and disabled states. Enter/Space activate; focus remains stable while loading. Loading uses an announced text label and preserves width. Icon-only buttons require `aria-label`. Danger is reserved for destructive confirmation and is never the primary child-facing action. Primary teal uses midnight foreground for contrast.

### Card

API concept: `variant={base|raised|elevated}`, `interactive`, `selected`, and content states `loading|empty|error`.

Static cards are not focusable. Interactive cards use a real link/button or one keyboard-operable action, visible focus, and selected semantics where applicable. Loading uses Skeleton; empty and error use their dedicated components. Mobile padding is 16px; desktop standard is 20px. Reduced motion removes lift/transform and keeps color/border state.

### StatusPill

API concept: `audience={student|parent|staff}`, `status`, `label`, `icon`.

Approved preview dictionaries:

- Student momentum: Resting, Waking up, Rolling, On Fire; skill: Let’s revisit, Getting there, Locked in; growth: Growing, Building.
- Parent: Doing great, Finding rhythm, Could use a boost.
- Staff/operations: On Track, Watch, Needs Follow-up, Urgent.

Student pills prohibit “Incorrect,” “Critical,” “At Risk,” deficit framing, and staff-only urgency language. Pills always render visible text; color/icon supplement it.

### Skeleton, EmptyState, ErrorState

Skeleton accepts shape/count and an accessible loading label; it is `aria-hidden` visually when a container announces loading, uses no shimmer under reduced motion, and never impersonates real data. EmptyState accepts icon, title, explanation, and optional safe action. ErrorState accepts title, plain-language recovery text, optional retry, and technical details only in staff contexts; focus moves only when the surrounding workflow requires it.

### Input and Select

API concept: `label`, `helpText`, `error`, `readOnly`, `disabled`, required semantics, and native input/select props.

States: default, populated, focus, help, error, disabled, read-only. Labels are persistent; placeholders are hints only. Errors are connected by `aria-describedby` and are not color-only. Read-only remains focusable when useful; disabled does not submit. Select uses native keyboard behavior unless a later combobox design receives separate specification.

### Tabs and FilterChips

Tabs use `tablist/tab/tabpanel`, arrow-key roving focus, Home/End, selected state, and automatic or manual activation declared by the implementation. Filter chips are toggle buttons with `aria-pressed`. Both cover active/inactive/hover/focus/disabled. Mobile rows scroll horizontally inside their own labeled region without clipping the page or hiding focus.

### Tooltip

Tooltip is reachable by pointer hover and keyboard focus, linked with `aria-describedby`, appears without moving focus, remains available long enough to read, closes on Escape, and is not the only place for essential content. Touch behavior must not require hover.

### Modal and Drawer

Both require an accessible title, optional description, focus trap, deterministic initial focus, Escape close unless an irreversible operation is in progress, documented backdrop behavior, and focus restoration to the invoker. Modal uses centered/elevated treatment; Drawer is edge-attached and may become full-height on mobile. Reduced motion uses a 120ms opacity crossfade and removes transform travel.

### Toast

Informational/success messages use polite announcements; urgent errors use assertive announcements only when immediate attention is necessary. Toasts have text labels, optional status icon, pause-on-hover/focus for timed dismissal, a keyboard-reachable close control when dismissible, and no action that disappears before completion. A toast never replaces inline validation.

### ChartFrame

API concept: `title`, optional plain-language `question`, `explanation`, `legend`, `freshness`, `source`, `sample`, `loading`, `empty`, `unavailable`, `error`, `summary`, `children` static SVG, and optional approved drill route.

Required rendering:

- title and plain-language explanation;
- legend with color plus line/pattern/shape cues;
- freshness and source label;
- visible **Sample data** chip for illustrative values;
- loading, empty, unavailable, and error states;
- static responsive SVG region, not canvas-only output;
- screen-reader summary describing trend and units without fabricated intelligence;
- grayscale-distinguishable series and hatched gaps/unknown data;
- no invented live metric, prediction, recommendation, or causal claim.

PracticeLog Chart.js migration and CDN removal are deferred to Phase 1D after the ChartFrame pattern is approved and verified.

## Mobile and motion

Primary content uses 16px gutters at mobile widths. Overlay surfaces preserve safe-area padding and reachable close controls. Horizontal overflow is confined to tab/chip rows. Component transitions use the motion contract; `prefers-reduced-motion` replaces transform, spring, parallax, particles, and auto-scroll with 120ms opacity changes.

## Prohibited coupling

Foundation components may not alter routing, auth, role permissions, dashboard hydration, API/Airtable contracts, lesson/game logic, or protected flow behavior. Domain-specific components remain domain-specific until their owning migration phase.

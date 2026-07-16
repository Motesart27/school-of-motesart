# Phase 1C Primitive API and Accessibility Report

All primitives are exported by `src/components/ui/index.js`; styling lives in `ui.css` and consumes approved SOM CSS variables. The layer contains no routing, auth, role, API, Airtable, application data, or protected-flow logic.

## Public APIs

- **Button** — `variant=primary|secondary|quiet|danger`, `size=sm|md|lg`, `leadingIcon`, `iconOnly`, `loading`, `disabled`, plus native button props. It remains native, has a 44px minimum target and visible focus, keeps its visible label while loading, and requires `aria-label` for icon-only use. Danger is limited to destructive staff confirmation and is prohibited as a primary child-facing action.
- **Card** — `variant=base|raised|elevated|interactive`, `selected`, `loading`, `state=empty|error`. It is a static article and never becomes focusable. Interactive content must contain a real link/button. Loading, empty, and error presentations expose a data state and use the corresponding content-state primitive.
- **StatusPill** — `audience=student|parent|staff`, `label`, optional supplementary `icon`. Runtime dictionary enforcement rejects cross-audience/unapproved labels; visible text is always present.
- **Skeleton** — `label`, `lines`. The owning region exposes loading status while visual placeholders are hidden from assistive technology. Reduced motion removes pulsing and no fake value is shown.
- **EmptyState** — `icon`, `title`, `explanation`, optional action. **ErrorState** adds recovery/retry and permits technical details only with `staffContext=true`; error meaning is text plus icon/border, never color-only.
- **Input / Select** — persistent `label`, `helpText`, `error`, `required`, deterministic React `useId`, and native props including disabled/read-only where applicable. Help/error IDs are joined through `aria-describedby`; placeholder is never a label.
- **Tabs** — `items`, controlled/uncontrolled value, `activation=automatic|manual`, label. It implements tablist/tab/tabpanel linkage, roving focus, Left/Right, Home/End, manual Enter/Space when selected, disabled tabs, and region-confined mobile overflow.
- **FilterChips** — `options`, `selected`, `onChange`, `multiple`, label. Native buttons expose `aria-pressed`; selected state includes a check and text in addition to color; mobile overflow stays within the group.
- **Tooltip** — `content` and one trigger child. Focus, hover, and click/touch expose the same supplementary content through `aria-describedby`; Escape closes without moving focus. Essential-only content is prohibited.
- **Modal / Drawer** — `open`, `onClose`, accessible `title`, optional `description`, `initialFocusRef`, `dismissible`. Both provide dialog semantics, deterministic initial focus, focus trap, Escape, backdrop policy, body scroll restoration, invoker focus restoration, mobile-safe close control, and reduced-motion opacity-only presentation. Non-dismissible use must be exceptional and explicitly justified.
- **ToastProvider / useToast** — `notify({title,message,tone,urgent,duration})`, `dismiss(id)`. Ordinary info/success uses a polite region; urgent errors use assertive announcement. Dismissal is keyboard reachable and timed dismissal pauses on hover/focus. Toasts never replace inline validation.

## Approved StatusPill dictionaries

Student: Resting; Waking up; Rolling; On Fire; Let’s revisit; Getting there; Locked in; Growing; Building.

Parent: Doing great; Finding rhythm; Could use a boost.

Staff/operations: On Track; Watch; Needs Follow-up; Urgent.

Student mode cannot render staff-only or banned deficit labels. No icon or color is the sole carrier of role, DPM, warning, error, success, or status meaning.

## Motion and mobile contract

State transitions use approved motion variables. At reduced motion, overlay behavior is a short opacity transition without transform travel and skeleton animation is removed. Controls retain 44px minimum targets; tabs and filter chips confine horizontal scrolling to their own regions; modal/drawer become full-height on narrow screens.

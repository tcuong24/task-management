---
name: taskflow-design-tokens
description: Enforce TaskFlow design tokens and UI rules when creating, editing, or reviewing TaskFlow screens and components. Use for colors, surfaces, branding, actions, elevation, radii, spacing, motion, tables, forms, charts, responsive behavior, and accessibility.
---

# TaskFlow Design Tokens

Apply these rules to every TaskFlow UI change. Reuse existing shared components and semantic tokens before adding styles. Do not introduce arbitrary colors, spacing, radii, shadows, typography, sizing, or motion values.

## Workflow

1. Inspect the affected components, shared primitives, and theme configuration.
2. Reuse a semantic token from this skill or an existing equivalent in the codebase.
3. Preserve established behavior unless the task explicitly changes it.
4. Check responsive, keyboard, focus, disabled, loading, empty, and error states.
5. Run the pre-flight checklist before finishing.

If the codebase does not define the semantic names below as actual classes or CSS variables, use their canonical Tailwind mappings. Do not use names such as `bg-app` as classes unless they are configured.

## Color policy

Use neutral gray for surfaces, branding, navigation, and decorative elements. Use colors with hue only for:

- The primary action.
- Semantic states such as success, warning, error, and destructive actions.
- Data visualization where color communicates data.

Do not use gradients or decorative color tints. Never rely on color alone to communicate meaning.

### Backgrounds and surfaces

| Token | Canonical Tailwind mapping | Use |
|---|---|---|
| `bg-app` | `bg-gray-50` | Page background on every dashboard route |
| `bg-surface` | `bg-white` | Cards, modals, and data containers |
| `bg-surface-muted` | `bg-gray-50/50` | Zebra rows and locked or read-only fields |
| `border-subtle` | `border-gray-100` | Low-emphasis separators |
| `border-default` | `border-gray-200` | Inputs and secondary controls |

Use shadow to separate a raised surface from `bg-app`. Use borders for structure, input affordance, or elevation level 0—not as decorative outlines around every card.

### Sidebar and branding

Do not vary navigation colors by role.

| Token | Canonical Tailwind mapping |
|---|---|
| `sidebar-bg` | `bg-gray-50/80 backdrop-blur-sm` |
| `nav-active` | `bg-gray-100 text-gray-900 font-medium` |
| `nav-default` | `text-gray-600 hover:bg-gray-100 hover:text-gray-900` |
| `brand-color` | `text-gray-900` |

Remove legacy Indigo branding from sidebar, logo, neutral badges, and decorative icons. Keep semantic action and status colors intact.

## Actions

Use one visually dominant primary action per decision region. A long page may contain multiple primary actions only when they belong to clearly independent regions.

| Token | Canonical Tailwind mapping | Examples |
|---|---|---|
| `action-primary` | `bg-blue-600 text-white shadow-md hover:bg-blue-700 active:scale-[0.98]` | Sign in, create task, invite member |
| `action-secondary` | `bg-white border border-gray-200 text-gray-700 hover:bg-gray-50` | Cancel, close, view details |
| `action-caution` | `bg-white border border-amber-300 text-amber-700 hover:bg-amber-50` | Transfer ownership, archive |
| `action-destructive` | `bg-red-600 text-white shadow-md hover:bg-red-700 active:scale-[0.98]` | Delete organization, remove member |
| `action-ghost` | `text-gray-500 hover:text-gray-700` | Log out, resend invite |

Add the motion classes defined below rather than `transition-all`.

## Elevation

Elevation represents overlay hierarchy and spatial prominence, not action severity. A destructive dialog uses destructive content and controls but follows the same modal elevation as other blocking dialogs.

| Token | Canonical Tailwind mapping | Use |
|---|---|---|
| `elevation-0` | `shadow-none border border-gray-100` | Rows and list items |
| `elevation-1` | `shadow-sm` | Sticky headers and navigation |
| `elevation-2` | `shadow-md` | Task and project cards |
| `elevation-3` | `shadow-xl` | Dropdowns and popovers |
| `elevation-4` | `shadow-2xl` | Blocking modals and dialogs |

## Radius

| Token | Canonical Tailwind mapping | Use |
|---|---|---|
| `radius-sm` | `rounded-md` | Inputs, tags, badges |
| `radius-md` | `rounded-xl` | Buttons and compact cards |
| `radius-lg` | `rounded-2xl` | Large cards and modals |

## Spacing

Use Tailwind's 4px base scale. Prefer the following compositions and choose responsive variants when `p-8` would crowd a small viewport.

| Token | Canonical Tailwind mapping | Use |
|---|---|---|
| `space-tight` | `p-4 gap-3` | Compact cards and board items |
| `space-normal` | `p-6 gap-4` | Forms and standard cards |
| `space-loose` | `p-6 md:p-8 gap-6` | Page content, settings, large cards |
| `section-gap` | `gap-6` | Related page sections |
| `major-gap` | `gap-16` | Major landing or empty-state regions |

Use values from Tailwind's spacing scale. Do not add arbitrary values such as `p-[19px]` unless required to align with an external embedded surface and documented in code.

## Motion

Animate only properties that need to change. Do not use `transition-all`.

| Token | Duration | Use |
|---|---:|---|
| `duration-fast` | `duration-150` | Hover, color, and pressed feedback |
| `duration-base` | `duration-200` | Dropdowns, tabs, and small reveals |
| `duration-slow` | `duration-300` | Modals and larger transitions |
| `easing-standard` | `ease-out` | Entering and direct manipulation |

Examples:

```text
transition-colors duration-150 ease-out
transition-transform duration-150 ease-out
transition-opacity duration-200 ease-out
```

Respect `prefers-reduced-motion`. Disable nonessential transforms and animations with `motion-reduce:transition-none motion-reduce:transform-none`.

## Tables

- Use `bg-surface-muted` for even rows and `bg-surface` for odd rows.
- Use `hover:bg-gray-100 transition-colors duration-150`.
- Use `bg-gray-50 text-gray-500 text-xs uppercase tracking-wide` for headers.
- Separate rows with `border-b border-gray-100`.
- Do not use vertical column dividers unless required for a dense comparison table.
- Preserve a visible focus state for interactive rows and controls.

## Forms and locked fields

Use `bg-gray-50 border border-gray-200 text-gray-500` for locked or read-only fields. Show a gray lock icon and expose the state in accessible text, not only through the icon.

When access can be requested, show a `text-blue-600 hover:underline` link below the field.

Do not use placeholder text as the only label. Show validation text near the field and connect it programmatically with the input.

## Charts

- Use `blue-500` for the primary series.
- Use semantic or distinguishable colors only when multiple series require them.
- Use `stroke-gray-100` for horizontal gridlines.
- Keep the chart background transparent.
- Provide labels, legends, patterns, or direct values so color is not the only differentiator.
- Ensure tooltip and legend content is keyboard-accessible when the chart library supports it.

## Accessibility

- Meet WCAG AA contrast for text and interactive controls.
- Give every interactive element a visible `focus-visible` style, normally `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2`.
- Preserve keyboard navigation and logical focus order.
- Use native semantic elements before adding ARIA.
- Use text or icons alongside semantic colors.
- Make touch targets at least 44×44px where practical.
- Expose disabled, loading, expanded, selected, invalid, and locked states programmatically.
- Do not hide focus indicators.
- Respect reduced-motion preferences.

## Legacy Indigo migration

When updating an affected area:

1. Search sidebar, logo, branding, neutral badges, and decorative icons for `indigo-`.
2. Replace legacy active navigation styles with `nav-active`.
3. Replace brand color with `brand-color`.
4. Do not replace valid semantic status colors or `action-primary`.
5. Avoid unrelated repository-wide restyling unless the user requests a full migration.

## Pre-flight checklist

- [ ] Page and raised surfaces use the canonical background tokens.
- [ ] Primary actions are visually unambiguous within each decision region.
- [ ] Archive/caution and delete/destructive actions remain semantically distinct.
- [ ] Elevation follows overlay hierarchy rather than action severity.
- [ ] Spacing, radius, shadow, and motion use approved values without arbitrary utilities.
- [ ] Transitions target specific properties and respect reduced motion.
- [ ] Tables use the approved row, header, separator, hover, and focus styles.
- [ ] Sidebar and branding remain neutral and do not vary by role.
- [ ] Focus, keyboard, contrast, labeling, and state exposure requirements are satisfied.
- [ ] Responsive layouts remain usable on narrow viewports.

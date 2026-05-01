# react-table Style Guide

## Stance

react-table is a neutral component library. It ships sensible defaults and never
hardcodes a consumer's brand colors. Any chromatic accent comes from the consumer
overriding the documented CSS custom properties below — not from the lib itself.

## Visual Identity

Derived from the existing column and filter controls
(`src/table-column-controls/table-column-controls.styl`,
`src/table-filter-controls/table-filter-controls.styl`):

- **Resting state**: `border 1px solid transparent`, transparent or `#fafafa` background.
- **Hover / expanded / active**: `border 1px solid rgba(0, 0, 0, 0.23)`,
  background `rgba(0, 0, 0, 0.05)` or `#e5e5e5`.
- **Hairlines**: `1px solid #e0e0e0` for dividers and table-internal separators.
- **Radius**: `4px` for inputs and small buttons, `6px` for larger surfaces.
- **No chromatic accent**. Emphasis is conveyed by border opacity and background
  shifts only.
- **Transitions**: `150ms ease` on color, background, and border.

This is the look the lib already presents through column controls, filter
controls, the column-select menu, and the misc menu. New components must match
it.

## Token Contract

The public theming API is a small set of CSS custom properties prefixed `--rt-`.
Defaults are declared at `:root` from `src/styles/tokens.styl` and mirrored as
Stylus variables for component sources.

| Token                  | Default                       | Usage                                      |
| ---------------------- | ----------------------------- | ------------------------------------------ |
| `--rt-border`          | `rgba(0, 0, 0, 0.23)`         | Primary border (hover, active, expanded)   |
| `--rt-border-subtle`   | `#e0e0e0`                     | Hairline dividers                          |
| `--rt-bg`              | `#ffffff`                     | Component surface                          |
| `--rt-bg-subtle`       | `#fafafa`                     | Resting subtle surface (filter rows, etc.) |
| `--rt-bg-hover`        | `rgba(0, 0, 0, 0.05)`         | Neutral hover background                   |
| `--rt-bg-hover-strong` | `#e5e5e5`                     | Strong hover (add-button, primary actions) |
| `--rt-bg-overlay`      | `rgba(0, 0, 0, 0.5)`          | Modal / overlay scrim                      |
| `--rt-text`            | `#222222`                     | Primary text                               |
| `--rt-text-muted`      | `#555555`                     | Secondary text, labels                     |
| `--rt-text-disabled`   | `#999999`                     | Placeholder, disabled                      |
| `--rt-radius-sm`       | `4px`                         | Inputs, small buttons                      |
| `--rt-radius`          | `6px`                         | Larger buttons, panels                     |
| `--rt-radius-lg`       | `8px`                         | Modals                                     |
| `--rt-font-size-sm`    | `12px`                        | Table-header labels                        |
| `--rt-font-size`       | `13px`                        | Default body                               |
| `--rt-font-size-md`    | `14px`                        | Modal body, primary action buttons         |
| `--rt-space-xs`        | `4px`                         | Tight gaps                                 |
| `--rt-space-sm`        | `8px`                         | Default gap                                |
| `--rt-space`           | `12px`                        | Section padding                            |
| `--rt-space-lg`        | `16px`                        | Modal padding                              |
| `--rt-space-xl`        | `20px`                        | Modal outer padding                        |
| `--rt-shadow-overlay`  | `0 8px 32px rgba(0,0,0,0.18)` | Modal elevation only                       |
| `--rt-transition`      | `150ms ease`                  | Color/background/border transitions        |

## Stylus access

Components import `src/styles/tokens.styl` and read either the Stylus mirror or
the CSS variable directly. Prefer Stylus mirrors for build-time defaults so the
lib remains self-contained when consumed without a `:root` override.

```stylus
@import '../styles/tokens'

.example
  border 1px solid transparent
  border-radius $rt_radius_sm
  background-color $rt_bg
  transition all $rt_transition

  &:hover
    border-color $rt_border
    background-color $rt_bg_hover
```

## Buttons

Three patterns, all neutral:

- **Toolbar / ghost**: transparent background, `transparent` resting border;
  hover reveals `--rt-border` + `--rt-bg-hover`. `aria-pressed` / `.active`
  state uses the same border + background as hover.
- **Subtle (modal cancel, add-row)**: subtle bg, `--rt-border` resting, hover
  `--rt-bg-hover-strong`.
- **Primary action (modal save)**: `--rt-bg-subtle` background, full
  `--rt-border`, hover `--rt-bg-hover-strong`. **No** colored fill.

If a consumer wants a branded primary action, they redefine `--rt-bg-primary` /
`--rt-text-primary` etc. — but the lib does not ship those tokens because no
component needs them by default.

## Inputs

`<input>`, `<select>`, `<textarea>`: `1px solid var(--rt-border)`,
`var(--rt-radius-sm)`, `8px 10px` padding, font size `var(--rt-font-size)`.
Focus: `border-color: var(--rt-border)` (intentionally no chromatic ring; rely
on the browser default outline for accessibility).

## Modals / Overlays

- Scrim: `var(--rt-bg-overlay)`.
- Container: `var(--rt-bg)`, `var(--rt-radius-lg)`, `var(--rt-shadow-overlay)`.
- Header / footer separated by `1px solid var(--rt-border-subtle)`.
- Close button: native `<button>` with `×` glyph, ghost-style.

## MUI Policy

Component source must not import from `@mui/material`, `@mui/icons-material`, or
the `@emotion/*` packages for visual chrome. Use:

- Native `<button>` with the patterns above instead of `IconButton` / `Button`.
- A backdrop-click handler on the modal scrim instead of `ClickAwayListener`.
- Unicode glyphs (`×`, `+`) or simple inline SVG instead of MUI icons.

Existing files that still import MUI for behavioral primitives (e.g. `Modal`,
`Popper`, `MenuList`) are tolerated until they are individually migrated, but no
new component may add a MUI import.

## Anti-patterns

1. **No hardcoded hex** in component styl files. Use the `--rt-*` tokens or
   their Stylus mirrors.
2. **No chromatic accent** in the lib's defaults. Active / hover states use
   border + background only.
3. **No `box-shadow` for elevation** outside of modals/overlays.
4. **No new MUI imports** in component sources.
5. **No per-component theme props**. Theming flows through CSS variables only.

## Consumer Override Example

A consumer can rebrand the entire lib at the document root:

```stylus
:root
  --rt-border #cfd4da
  --rt-bg-hover #f1f3f5
  --rt-radius-sm 2px
```

No prop changes, no rebuild of react-table.

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
Defaults are declared from `src/styles/tokens.styl` and mirrored as Stylus
variables for component sources.

**The default block is `:where(:root)`, not `:root`, and that is load-bearing.**
This lib ships its CSS through style-loader, so its stylesheet is injected into
`<head>` at runtime and its position relative to the host's stylesheet is an
accident of module evaluation order. A bare `:root` ties a consumer's `:root` on
specificity (`0,1,0` each), which leaves that accident to pick the winner —
measured, a consumer setting `--rt-z-base: 1500` got `1005` whenever this lib
was injected last, with nothing reporting that the override had been discarded.
`:where()` drops the block to zero specificity, so a consumer's declaration wins
outright in either order. `yarn test` fails if the `:where()` is removed.

| Token                         | Default                                                                | Usage                                                            |
| ----------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `--rt-ground`                 | `var(--rt-bg)`                                                         | What the rows sit on; a host sets its page                       |
| `--rt-frame-rule`             | `var(--rt-border-subtle)`                                              | Edge of the table chrome; a host's rule                          |
| `--rt-frame-shadow`           | `var(--rt-shadow-overlay)`                                             | Floating surfaces; a host's shadow                               |
| `--rt-border`                 | `rgba(15, 23, 42, 0.14)`                                               | Primary border (hover, active, expanded)                         |
| `--rt-border-subtle`          | `#e6e8eb`                                                              | Hairline dividers                                                |
| `--rt-divider`                | `#eef0f2`                                                              | Row and section separators                                       |
| `--rt-bg`                     | `#ffffff`                                                              | Component surface                                                |
| `--rt-bg-subtle`              | `#f7f8f9`                                                              | Resting subtle surface (filter rows, etc.)                       |
| `--rt-bg-hover`               | `rgba(15, 23, 42, 0.04)`                                               | Neutral hover background                                         |
| `--rt-bg-hover-strong`        | `#eceff2`                                                              | Strong hover (add-button, primary actions)                       |
| `--rt-bg-selected`            | `rgba(15, 23, 42, 0.06)`                                               | Selected row or item                                             |
| `--rt-bg-overlay`             | `rgba(15, 23, 42, 0.45)`                                               | Modal / overlay scrim                                            |
| `--rt-text`                   | `#1f2328`                                                              | Primary text                                                     |
| `--rt-text-muted`             | `#57606a`                                                              | Secondary text, labels                                           |
| `--rt-text-subtle`            | `#6e7781`                                                              | Tertiary text, hints                                             |
| `--rt-text-disabled`          | `#9aa0a6`                                                              | Placeholder, disabled                                            |
| `--rt-accent`                 | `#1f6feb`                                                              | Primary action fill                                              |
| `--rt-accent-strong`          | `#1158c7`                                                              | Primary action hover                                             |
| `--rt-accent-subtle`          | `rgba(31, 111, 235, 0.10)`                                             | Accent wash                                                      |
| `--rt-accent-text`            | `#0a59c9`                                                              | Accent-coloured text                                             |
| `--rt-success`                | `#1f883d`                                                              | Save action fill                                                 |
| `--rt-success-strong`         | `#186a2e`                                                              | Save action hover                                                |
| `--rt-success-bg`             | `#2da44e`                                                              | Success badge fill                                               |
| `--rt-active-bg`              | `rgba(31, 111, 235, 0.08)`                                             | Active control wash                                              |
| `--rt-active-bar`             | `#1f6feb`                                                              | Active control bar                                               |
| `--rt-destructive`            | `#d1242f`                                                              | Destructive action                                               |
| `--rt-destructive-subtle`     | `rgba(209, 36, 47, 0.10)`                                              | Destructive wash                                                 |
| `--rt-destructive-strong`     | `#b51e26`                                                              | Destructive text on its wash                                     |
| `--rt-contrast-pole`          | `#000000`                                                              | Black-ink washes and shadows (`rt_fade`); a dark host inverts it |
| `--rt-shade`                  | `#0f172a`                                                              | Slate washes and borders (`rt_fade`)                             |
| `--rt-on-fill`                | `#ffffff`                                                              | Text and icons on a solid accent, success or destructive fill    |
| `--rt-selection`              | `#1976d2`                                                              | View controller selection                                        |
| `--rt-caution`                | `#d99100`                                                              | View controller caution                                          |
| `--rt-caution-strong`         | `#b87600`                                                              | Caution hover                                                    |
| `--rt-remove`                 | `#c0392b`                                                              | Remove control hover                                             |
| `--rt-menu-ink`               | `#37352f`                                                              | Table menu ink and its washes                                    |
| `--rt-state-chip`             | `#2383e2`                                                              | Table-state chips                                                |
| `--rt-sorted-bg`              | `rgba(255, 255, 204, 0.6)`                                             | Sorted column wash                                               |
| `--rt-cell-hover`             | `#b9d4ff`                                                              | Hovered cell                                                     |
| `--rt-resizer-hover`          | `#8ecae6`                                                              | Hovered column resizer                                           |
| `--rt-button-bg`              | `#f6f8fa`                                                              | Discard button                                                   |
| `--rt-button-border`          | `#d0d7e0`                                                              | Discard button border                                            |
| `--rt-info-bg`                | `#e6f7ff`                                                              | Show-plot button                                                 |
| `--rt-info-text`              | `#0e67b2`                                                              | Show-plot ink                                                    |
| `--rt-info-border`            | `#90caf9`                                                              | Show-plot border                                                 |
| `--rt-control-bg`             | `#f0f0f0`                                                              | Column-param filter control                                      |
| `--rt-control-border`         | `#e0e0e0`                                                              | Column-param filter rules                                        |
| `--rt-chip-border`            | `#d0d7de`                                                              | Preset chip border                                               |
| `--rt-chip-selected`          | `#2563eb`                                                              | Selected preset chip                                             |
| `--rt-label-text`             | `#4b5563`                                                              | Preset field label                                               |
| `--rt-heat-low`               | `#fda291`                                                              | Percentile wash, low values                                      |
| `--rt-heat-high`              | `#2ea3dd`                                                              | Percentile wash, high values                                     |
| `--rt-radius-sm`              | `4px`                                                                  | Inputs, small buttons                                            |
| `--rt-radius`                 | `6px`                                                                  | Larger buttons, panels                                           |
| `--rt-radius-lg`              | `8px`                                                                  | Modals                                                           |
| `--rt-font-size-sm`           | `12px`                                                                 | Table-header labels                                              |
| `--rt-font-size`              | `13px`                                                                 | Default body                                                     |
| `--rt-font-size-md`           | `14px`                                                                 | Modal body, primary action buttons                               |
| `--rt-space-xs`               | `4px`                                                                  | Tight gaps                                                       |
| `--rt-space-sm`               | `8px`                                                                  | Default gap                                                      |
| `--rt-space`                  | `12px`                                                                 | Section padding                                                  |
| `--rt-space-lg`               | `16px`                                                                 | Modal padding                                                    |
| `--rt-space-xl`               | `20px`                                                                 | Modal outer padding                                              |
| `--rt-focus-ring`             | `0 0 0 2px rgba(31, 111, 235, 0.25)`                                   | Focus ring                                                       |
| `--rt-shadow-overlay`         | `0 12px 32px rgba(15, 23, 42, 0.12), 0 2px 6px rgba(15, 23, 42, 0.08)` | Modal elevation only                                             |
| `--rt-modal-border`           | `rgba(0, 0, 0, 0.23)`                                                  | Modal border                                                     |
| `--rt-modal-shadow`           | `#D0D0D0 4px 4px 0px 0px`                                              | Modal offset shadow                                              |
| `--rt-button-hover-bg`        | `#f0f0f0`                                                              | Button hover                                                     |
| `--rt-button-hover-bg-strong` | `#b3b3b3`                                                              | Button hover, strong                                             |
| `--rt-transition`             | `150ms ease`                                                           | Color/background/border transitions                              |

A colour mirror is a runtime value, so a stylus colour function cannot run on
it: `lighten($rt_bg, 4%)` is a build error. Derive with the two helpers in
`tokens.styl`, which emit `color-mix()` and so follow a host's override —
`rt_fade(token, opacity)` for the token at an opacity, `rt_soften(token,
amount)` toward `--rt-bg`. A black or slate wash is `rt_fade($rt_contrast_pole,
6)` or `rt_fade($rt_shade, 6)`, never `rgba(0, 0, 0, 0.06)`: the literal stays
black on a dark host.

## Layering

| Token            | Default                      | Usage                                  |
| ---------------- | ---------------------------- | -------------------------------------- |
| `--rt-z-base`    | `1000`                       | Band origin — the only one to override |
| `--rt-z-menu`    | `calc(var(--rt-z-base) + 1)` | Toolbar menus and dropdowns            |
| `--rt-z-control` | `calc(var(--rt-z-base) + 2)` | Expanded toolbar control               |
| `--rt-z-overlay` | `calc(var(--rt-z-base) + 3)` | Scatter-plot overlay                   |
| `--rt-z-panel`   | `calc(var(--rt-z-base) + 4)` | Settings panel over the overlay        |
| `--rt-z-modal`   | `calc(var(--rt-z-base) + 5)` | View modal                             |
| `--rt-z-popper`  | `calc(var(--rt-z-base) + 6)` | Poppers                                |

Every floating surface takes its z-index from one of these. A literal is the
lib squatting on the consumer's stacking space, and `yarn test` fails on one.

Three properties make this work, and each exists for a reason:

**The band is six units wide.** This lib previously spread literals from `1000`
to `10000`, which left a host no room to interleave its own layers and forced it
to work around the lib. A tight band slots into any gap the host has spare.

**Every rung is an offset from `--rt-z-base`.** A host relocates the whole lib
with one declaration and keeps the internal ordering for free. Pinning a rung to
an absolute value opts it out of that, so the test rejects it.

**Poppers are the top rung, not a peer of the modal.** A surface that is only
ever opened FROM another surface belongs above everything that can open it. The
old scheme had poppers at `1299` and the view modal at `10000`, so a popper
opened inside the modal rendered behind its own host.

The default base of `1000` puts the entire lib below MUI's modal layer (`1300`),
which is the safe default: a host's own dialogs cover the table rather than the
reverse.

A MUI control embedded in a lib surface — a `DatePicker` inside a filter popper —
opens its own popup portaled to `document.body` at `theme.zIndex.modal` (`1300`).
A host that rebases `--rt-z-base` above MUI's modal layer paints that popup below
the surface it opened from (league runs `--rt-z-base: 1450`, so the date picker's
calendar rendered behind its own input panel). Pin such a popup to the lib's
scale, one rung above its opener, via the control's slot props rather than
leaving it on the MUI default — the date filter does
`slotProps={{ popper: { style: { zIndex: 'calc(var(--rt-z-popper) + 1)' } } }}`.

### Escaping the consumer's overflow

An expanding control (column, filter, row-axes) opens to a viewport-sized panel
centered on the WINDOW, which only survives while every ancestor between the
panel and the viewport has visible overflow. That holds for a full-page table
container and for nothing else, so `position: absolute` clipped the managers to
a sliver in any smaller consumer container — measured in league's selected
player drawer, where the table lives inside a scrolling tab panel.

`use_expanding_control_anchor` (`src/utils/use-expanding-control-anchor.js`,
`test/use-expanding-control-anchor.spec.jsx`) therefore pins the panel `fixed`
while it is open, at the closed slot's viewport coordinates, and carries the
centering in `translateX` so the open animation is unchanged. It also caps the
panel's height to the space below the anchor and flips it upward when that
space is too small.

The standard caveat applies: an ancestor carrying `transform`, `filter`,
`contain` or `will-change` becomes the containing block and the escape stops
working. MUI's `Drawer` clears its slide transform once the sheet settles,
which is why the drawer case holds.

### Consumer override

```stylus
:root
  --rt-z-base 1450
```

Two caveats, both measured rather than assumed:

- **Override at `:root`, not on a descendant.** A `calc()` inside a custom
  property substitutes where it is DECLARED, so rebasing on a scoped ancestor
  computes against the lib's own `:root` value and silently does nothing.
- **Override the token, never the rule.** The lib's own selectors are compound
  (`.base-Popper-root.table-popper`, specificity `0,2,0`), so a host's
  single-class rule loses to them without any warning. That is what the tokens
  are for — do not fight the cascade.

## Stylus access

Components import `src/styles/tokens.styl` and read the Stylus mirror. **A
colour mirror resolves to its custom property** (`$rt_bg` is `var(--rt-bg)`), so
a consumer's override reaches every component and a host can theme the table,
dark mode included. That also means no stylus colour function may run on a
colour mirror -- `lighten(var(--rt-bg), 5%)` is a build error. Sizes, spacing
and layers stay build-time values.

**A stylesheet never names a host variable.** League compiles this lib's sources
with its own injected stylesheets, so a bare `$backgroundColor` silently took
the host's value there and this lib's value in a standalone build -- two
renderings from one source. The frame tokens above are the sanctioned version
of that: the lib names the slot, and the host fills it.

**The layer tokens are read as `var(--rt-z-*)`, never via the Stylus mirror.**
A layer mirror is substituted at build time, so a consumer's `--rt-z-base`
override cannot reach it and the relocation silently fails. The `$rt_z_*`
mirrors exist only for reference.

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

Three patterns, all neutral. The shared implementations live in
`src/styles/button.styl`, which `src/table/table.js` imports once — reach for a
class from there rather than restating padding, radius, border and hover in a
component styl.

- **Toolbar / ghost** — `.rt-button`, with `.rt-button-glyph` for a leading
  `+` / `×`: transparent background, `transparent` resting border; hover reveals
  `--rt-border` + `--rt-bg-hover`. `aria-pressed` / `.active` state uses the
  same border + background as hover. This is the treatment the column and filter
  triggers present, so a button carrying it reads as one of that set.
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

1. **No colour literal** in component styl files — no hex, `rgb()`/`rgba()` or
   colour name. Use the `--rt-*` tokens or their Stylus mirrors, derived with
   `rt_fade()`/`rt_soften()`.
2. **No chromatic accent** in the lib's defaults. Active / hover states use
   border + background only.
3. **No `box-shadow` for elevation** outside of modals/overlays.
4. **No new MUI imports** in component sources.
5. **No per-component theme props**. Theming flows through CSS variables only.
6. **No bare `z-index` at or above 100** in component styl files. Use a
   `--rt-z-*` token. Below 100 is local sibling ordering and is fine.

## Consumer Override Example

A consumer can rebrand the entire lib at the document root:

```stylus
:root
  --rt-border #cfd4da
  --rt-bg-hover #f1f3f5
  --rt-radius-sm 2px
```

No prop changes, no rebuild of react-table.

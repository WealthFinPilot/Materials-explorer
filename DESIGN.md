# Design

## Theme

Scientific instrument, light. A precise measurement panel: pure-white content
surface, a faintly cool neutral ramp, one measured cobalt-blue accent that does
all the work (primary action, current selection, top match, focus). No
decoration that does not carry state or data. Mono for every number so columns
of values align and read as instrument output; one humanist system sans for
everything else.

## Color (OKLCH)

Strategy: **Restrained** (product floor). One accent, ≤10% of the surface.

| Role | Value | Use |
|---|---|---|
| `--bg` | `oklch(1 0 0)` | content surface (pure white) |
| `--surface` | `oklch(0.984 0.003 250)` | panels, toolbar (cooler second layer) |
| `--surface-sunken` | `oklch(0.968 0.004 250)` | inputs, score track |
| `--border` | `oklch(0.912 0.005 250)` | hairlines |
| `--border-strong` | `oklch(0.842 0.006 250)` | input borders, segmented control |
| `--ink` | `oklch(0.268 0.013 256)` | body / data (~13:1 on white) |
| `--ink-muted` | `oklch(0.486 0.013 256)` | secondary text (~5.9:1) |
| `--ink-faint` | `oklch(0.566 0.012 256)` | placeholders, weights (~4.6:1) |
| `--accent` | `oklch(0.546 0.166 256)` | primary action, selection, top match |
| `--accent-hover` | `oklch(0.486 0.17 256)` | hover/active |
| `--accent-weak` | `oklch(0.95 0.03 256)` | accent tint backgrounds |
| `--warn` | `oklch(0.55 0.13 47)` | low-confidence warning (used sparingly) |
| `--warn-weak` | `oklch(0.96 0.03 60)` | warning background |

White text on `--accent` ≈ 4.9:1 (passes AA for UI + button labels).

## Typography

One family + mono. Fixed rem scale (product UI, not fluid), ratio ~1.2.

- **Sans**: `system-ui, "Segoe UI", Roboto, Helvetica, Arial, sans-serif` (UI, labels, headings).
- **Mono**: `ui-monospace, "Cascadia Mono", Consolas, "SF Mono", monospace` (all numeric values, element symbols, scores, STD names).
- Scale: 12 / 13 / 14 (base) / 15 / 17 / 20 / 26px. Weight contrast 500/600/700.
- Uppercase only for short section labels (≤3 words) and the brand mark; never body.

## Components

- **Segmented control** (database selector): default / hover / selected (accent fill, white text) / focus-visible.
- **Number input**: default / hover / focus (accent ring) / placeholder. `type=number`, `inputmode=decimal`, per-element label with its weight.
- **Buttons**: primary (accent fill) + secondary (outline). States: default / hover / active / focus-visible / disabled.
- **Result row**: rank · STD name + grade badge · score (mono % + bar). Top row gets an accent left rule and accent bar. Grade badge has a "grade n/a" variant.
- **Warning banner**: full border (no side-stripe), warn tint, for best-score-below-threshold.
- **Empty state**: teaches the next action ("enter at least one value").

## Layout

- Centered column, `min(1080px, 92vw)`.
- Input grid: `repeat(auto-fill, minmax(116px, 1fr))` — fluid columns, no breakpoints needed.
- Results: single-column stack of rows (not cards-in-cards).
- Spacing scale: 4 / 8 / 12 / 16 / 20 / 28 / 40px. Vary for rhythm.
- Semantic z-index scale; no magic numbers.

## Motion

- 150–200ms on input/button/segment state transitions; ease-out.
- Results: short staggered fade+rise on render (≤220ms, ≤30ms stagger), state-conveying (new results arrived), default-visible (no visibility gated on transition).
- `prefers-reduced-motion: reduce` → instant, no transform.

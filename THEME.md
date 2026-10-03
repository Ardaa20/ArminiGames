# ArminiGames — Theme Guide

This file defines the visual rules for the site and **every game**.
Read it before adding a new game and do not step outside the variables defined here.

---

## 1. Overall Feel

- **Minimalist:** Only what is necessary is on screen. No decoration, stacked shadows, gradients or icon clutter.
- **Soft:** Pastel, low-saturation colors. Pure black (`#000`) and pure white (`#fff`) are never used.
- **Clean:** Plenty of whitespace, aligned layout, a single typeface.
- **Calm:** Short, gentle animations; no blinking, shaking or glowing effects.

---

## 2. Color Palette

All colors are CSS variables and **only these variables** are used.

```css
:root {
  /* Background and surfaces */
  --bg:        #F6F4F0;  /* page background – warm off-white */
  --surface:   #FFFDFA;  /* tile / card surface */
  --border:    #E8E4DD;  /* thin lines */
  --muted:     #DDD6CB;  /* neutral second surface */

  /* Text */
  --text:      #3A3835;  /* main text – soft dark grey */
  --text-soft: #8C8780;  /* secondary text, captions */

  /* Accents (a game uses at most 2 of these together) */
  --accent:    #8FA8C8;  /* soft blue – main accent */
  --accent-2:  #A8C3A0;  /* sage green – success / correct */
  --accent-3:  #E3B5A4;  /* peach – error / warning */
  --accent-4:  #C9B8D9;  /* lavender – rare, special cases */
  --on-accent: #3A3835;  /* text on an accent background */

  /* Game boards and pieces */
  --board-light: #FFFDFA;
  --board-dark:  #DDD6CB;
  --piece-white: #FFFDFA;
  --piece-black: #3A3835;
  --piece-line:  #3A3835;  /* piece outline */

  /* Effects */
  --shadow:       0 2px 10px rgba(58, 56, 53, 0.06);
  --shadow-hover: 0 4px 16px rgba(58, 56, 53, 0.09);
  --overlay:      rgba(58, 56, 53, 0.22);  /* dim behind dialogs */
}
```

### Rules
- A game uses **at most 2 accent colors** plus the background/text colors.
- Correct/success → `--accent-2`, wrong/error → `--accent-3`.
- If a new color is needed, add it to this file **and** to both the light and dark blocks in `assets/theme.css` first, then use it. Never hard-code hex values in a game.

---

## 2b. Dark Mode

Every page supports light and dark mode. **Dark mode is not optional** — anything added later must look right in both.

How it works:
- `assets/theme.css` defines the same token names twice: light values on `:root`, dark values under `prefers-color-scheme: dark` and `[data-theme="dark"]`.
- `assets/theme.js` (loaded in `<head>`, no `defer`) applies the saved choice before first paint and turns every `.theme-toggle` button into a sun/moon switch. The choice is saved in `localStorage`; with no choice the system setting is used.
- Every page has a toggle: `<button class="icon-btn theme-toggle" type="button"></button>` — top right on the home page, at the right end of `.game-header` on game pages.

Dark values:

| Token | Dark | | Token | Dark |
|---|---|---|---|---|
| `--bg` | `#1C1B19` | | `--accent` | `#8199B8` |
| `--surface` | `#262522` | | `--accent-2` | `#8FAA88` |
| `--border` | `#34322E` | | `--accent-3` | `#C9998A` |
| `--muted` | `#3A3733` | | `--accent-4` | `#A897BB` |
| `--text` | `#E6E1D9` | | `--on-accent` | `#1C1B19` |
| `--text-soft` | `#9A948A` | | `--board-light` | `#66615A` |
| `--piece-white` | `#EDE8E0` | | `--board-dark` | `#4E4A44` |
| `--piece-black` | `#22211F` | | `--piece-line` | `#1A1917` |

Shadows get stronger (`rgba(0,0,0,.25)` / `.35`) and `--overlay` becomes `rgba(0,0,0,.4)`.

Rules:
- Use only tokens, so a game is dark-mode ready with no extra work. No `#fff`, `white`, `black` or raw rgba in game CSS (except inside `theme.css`).
- Text on an accent background uses `--on-accent`, not `--text`.
- Before finishing a game, check it in **both** modes.

---

## 3. Typography

```css
font-family: "Nunito", system-ui, sans-serif;
```
Google Fonts: `https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700&display=swap`

| Use              | Size | Weight |
|------------------|------|--------|
| Page title       | 28px | 700    |
| Game name        | 16px | 600    |
| Body text        | 15px | 400    |
| Small note/score | 13px | 600    |

---

## 4. Shape, Spacing, Shadow

```css
:root {
  --radius:     24px;  /* game tiles */
  --radius-sm:  12px;  /* buttons, small elements */
  --gap:        20px;  /* gap between tiles */
  --pad:        24px;  /* inner padding */
  --shadow:     0 2px 10px rgba(58, 56, 53, 0.06);  /* one light shadow */
  --ease:       180ms ease;
}
```

- Corners are **always rounded**. No sharp corners.
- Only `--shadow` is used; no other shadows.
- If a border is needed: `1px solid var(--border)`.

---

## 5. Home Page (Game Grid)

- The page contains only a small title and a grid of **rounded squares**. Nothing else.
- Each tile is **1:1** (`aspect-ratio: 1`).
- Inside a tile: a simple single-color symbol in the middle and the game name below it.
- Grid: `grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));`
- Max width ~`960px`, centered. On mobile the side gutter is `16px`.
- On hover the tile grows slightly (`transform: scale(1.03)`) and the shadow deepens a little, all with `--ease`.
- Clicking a tile opens the game.

```css
.tile {
  aspect-ratio: 1;
  background: var(--surface);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  display: grid;
  place-items: center;
  transition: transform var(--ease), box-shadow var(--ease);
}
.tile:hover { transform: scale(1.03); box-shadow: 0 4px 16px rgba(58,56,53,.09); }
```

---

## 6. Rules for Game Pages

Every game uses the same frame (classes in `assets/theme.css`):

- Top left: a **back button** (`<span class="icon-btn">←</span>`) next to the game name.
- Top right (`.header-right`): the **score / status**, plain, in `--text-soft`, then the **theme toggle**.
- The play area sits in the middle inside a `--surface` box with `--radius` corners.
- Buttons: `--radius-sm`, `--accent` background, `--on-accent` label; slightly darker on hover.
- In-game shapes are rounded too and use palette colors.
- **No colorful games:** no rainbow, neon or bright colors. If colors must be distinguished, use the palette's accent tones.
- Sound is optional; if used, keep it soft and short. Use the shared `assets/sound.js` (generated with Web Audio, no audio files): `Sound.move()` for a normal move/placement, `Sound.capture()` when something is taken, `Sound.win()` for a win, `Sound.draw()` for a draw, `Sound.roll()` for rolling dice, `Sound.lose()` for a loss. New sounds are added to that file in the same quiet style (sine tones, fast fade-out, low volume). Undo plays no sound.
- Must work with both mouse and touch, with no overflow on mobile.

### Drawings
- Game pieces, cards and icons are **drawn by us as simple flat SVG** — never emoji or Unicode symbols (they look different on every device).
- Style: a few basic shapes, `stroke-linejoin: round`, one outline color (`--piece-line`), no gradients or shading. Small details use the opposite fill color.
- Colors come from tokens via CSS (`fill: var(--piece-white)` …), never written inside the SVG.
- Example: `games/chess/pieces.js`.

### Fixed sizes
- Boards and grids use a **fixed cell size** (e.g. chess: `--sq: 60px`). They may only shrink when the screen is too narrow, never grow or change with content.
- Use `grid-template-columns: repeat(N, var(--cell))`, not `1fr` (content can stretch `1fr`).
- Anything around the board that changes (score, captured pieces, messages) gets a fixed height so the board never moves.

### Input
- Board games support **both click-to-move and drag-and-drop** with Pointer Events (works for mouse and touch). Set `touch-action: none` on the board so the page doesn't scroll while dragging.
- During a drag: the original piece fades (`opacity: .3`), a copy follows the pointer, the square under the pointer is outlined in `--accent`. Dropping on an invalid square sends the piece back.

---

## 7. Don'ts ❌

- Gradient backgrounds
- More than one typeface
- Heavy/dark shadows
- Pure black or pure white
- Sharp corners
- Colors outside the palette
- Crowded UI, unnecessary icons/emoji

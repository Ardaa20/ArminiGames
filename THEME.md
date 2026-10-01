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
  --muted:     #DDD6CB;  /* neutral second surface (e.g. dark chess squares) */

  /* Text */
  --text:      #3A3835;  /* main text – soft dark grey */
  --text-soft: #8C8780;  /* secondary text, captions */

  /* Accents (a game uses at most 2 of these together) */
  --accent:    #8FA8C8;  /* soft blue – main accent */
  --accent-2:  #A8C3A0;  /* sage green – success / correct */
  --accent-3:  #E3B5A4;  /* peach – error / warning */
  --accent-4:  #C9B8D9;  /* lavender – rare, special cases */
}
```

### Rules
- A game uses **at most 2 accent colors** plus the background/text colors.
- Correct/success → `--accent-2`, wrong/error → `--accent-3`.
- If a new color is needed, add it to this file first, then use it. Never hard-code random hex values in a game.

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

- Top left: a **back button** (`←`) next to the game name.
- Top right (if any): the **score / status**, plain, in `--text-soft`.
- The play area sits in the middle inside a `--surface` box with `--radius` corners.
- Buttons: `--radius-sm`, `--accent` background, `--text` label; slightly darker on hover.
- In-game shapes are rounded too and use palette colors.
- **No colorful games:** no rainbow, neon or bright colors. If colors must be distinguished, use the palette's accent tones.
- Sound is optional; if used, keep it soft and short.
- Must work with both mouse and touch, with no overflow on mobile.

---

## 7. Don'ts ❌

- Gradient backgrounds
- More than one typeface
- Heavy/dark shadows
- Pure black or pure white
- Sharp corners
- Colors outside the palette
- Crowded UI, unnecessary icons/emoji

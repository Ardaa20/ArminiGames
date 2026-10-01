# ArminiGames

A minimalist website full of mini games. The home page has only rounded square tiles; clicking one opens a game. Games are added one at a time.

**Before adding a game or writing any UI, read [THEME.md](THEME.md) and follow it.**

## Structure
- `index.html` — home page (tile grid). To add a game, add one line to the `GAMES` list inside it.
- `assets/theme.css` — shared color variables and the game page frame (`.game-header`, `.game-box`, `.btn`, `.overlay`/`.modal`).
- `games/<game-name>/index.html` + `.js` — each game lives in its own folder; the back button links to `../../index.html`.
- Plain HTML/CSS/JS, no build step. Links point to `.../index.html` explicitly so the site also works when opened by double-clicking the file.
- File, folder and code names are in English; on-screen text is in Turkish.

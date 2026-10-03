# ArminiGames

A minimalist website full of mini games. The home page has only rounded square tiles; clicking one opens a game. Games are added one at a time.

**Before adding a game or writing any UI, read [THEME.md](THEME.md) and follow it.**

## Structure
- `index.html` — home page (tile grid). To add a game, add one line to the `GAMES` list inside it.
- `assets/theme.css` — shared color variables (light + dark) and the game page frame (`.game-header`, `.header-right`, `.icon-btn`, `.game-box`, `.btn`, `.overlay`/`.modal`).
- `assets/theme.js` — dark mode toggle; every page loads it in `<head>`.
- `assets/sound.js` — shared sound effects (`Sound.move/capture/win/draw/roll/lose`).
- `games/<game-name>/index.html` + `.js` — each game lives in its own folder; the back button links to `../../index.html`.
- Plain HTML/CSS/JS, no build step. Links point to `.../index.html` explicitly so the site also works when opened by double-clicking the file.
- Everything is in English: file/folder/code names, comments and on-screen text.

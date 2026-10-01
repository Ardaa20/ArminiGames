# ArminiGames

A small collection of minimalist mini games in the browser. The home page is just a grid of rounded tiles — click one and the game opens.

## Games

| Game  | Description |
|-------|-------------|
| Chess | Two-player chess on the same device, with full rules: check, checkmate, stalemate, castling, en passant and promotion. |

More games are added over time.

## Running

No install or build step — it's plain HTML, CSS and JavaScript.

- Open `index.html` in any modern browser (double-click it), or
- Serve the folder with any static file server.

## Project Structure

```
index.html          Home page (tile grid)
assets/theme.css    Shared colors, fonts and game page frame
games/<name>/       One folder per game (index.html + script)
THEME.md            Visual rules every game follows
```

## Adding a Game

1. Create `games/<name>/index.html` and link `../../assets/theme.css`.
2. Use the shared frame: `.game-header` with a back link to `../../index.html`, then `.game-main` / `.game-box`.
3. Follow the palette and rules in [THEME.md](THEME.md) — soft colors, rounded corners, no colorful games.
4. Add one line to the `GAMES` list in `index.html`:

   ```js
   { name: "My Game", path: "games/my-game/index.html", symbol: "◆" },
   ```

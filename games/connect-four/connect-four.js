// Connect Four — two players on the same device
// grid[r][c]: r=0 is the top row, r=5 the bottom. Values: null, "p1" (blue) or "p2" (peach).

const COLS = 7;
const ROWS = 6;
const NAME = { p1: "Blue", p2: "Peach" };
const DRAG_THRESHOLD = 5; // px before a press becomes a drag

const playEl = document.getElementById("play");
const boardEl = document.getElementById("board");
const previewEl = document.getElementById("preview");
const statusEl = document.getElementById("status");
const messageEl = document.getElementById("message");
const undoBtn = document.getElementById("undo");

let grid, turn, history, over, winLine, busy;
let moveId = 0; // bumps on every move and reset, so a stale timer is ignored
let hoverCol = null;
let drag = null; // { x, y, moved, ghost }
let cells = [];  // cells[r][c] -> element

const other = (p) => (p === "p1" ? "p2" : "p1");

function discHTML(player, extra = "") {
  return `<span class="disc ${player} ${extra}"><svg viewBox="0 0 100 100" aria-hidden="true">` +
    `<circle class="body" cx="50" cy="50" r="38"/><circle class="ring" cx="50" cy="50" r="24"/>` +
    `<circle class="mark" cx="50" cy="50" r="11"/></svg></span>`;
}

// ---------- Rules ----------

function dropRow(c) {
  for (let r = ROWS - 1; r >= 0; r--) if (!grid[r][c]) return r;
  return -1;
}

function findWin(r, c) {
  const p = grid[r][c];
  for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
    const line = [[r, c]];
    for (const s of [1, -1]) {
      let rr = r + dr * s, cc = c + dc * s;
      while (rr >= 0 && rr < ROWS && cc >= 0 && cc < COLS && grid[rr][cc] === p) {
        line.push([rr, cc]);
        rr += dr * s; cc += dc * s;
      }
    }
    if (line.length >= 4) {
      // Keep the four nearest the new disc, in board order
      line.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
      const i = line.findIndex(([rr, cc]) => rr === r && cc === c);
      const start = Math.max(0, Math.min(i - 1, line.length - 4));
      return line.slice(start, start + 4);
    }
  }
  return null;
}

// ---------- Rendering ----------

function buildBoard() {
  boardEl.innerHTML = "";
  cells = [];
  for (let r = 0; r < ROWS; r++) {
    cells.push([]);
    for (let c = 0; c < COLS; c++) {
      const el = document.createElement("div");
      el.className = "cell";
      boardEl.appendChild(el);
      cells[r].push(el);
    }
  }
}

function render() {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const el = cells[r][c];
      const p = grid[r][c];
      el.innerHTML = p ? discHTML(p) : "";
      el.classList.toggle("win", !!winLine && winLine.some(([wr, wc]) => wr === r && wc === c));
    }
  }
  if (over) {
    statusEl.textContent = winLine ? `${NAME[grid[winLine[0][0]][winLine[0][1]]]} wins` : "Draw";
  } else {
    statusEl.innerHTML = `<span class="dot ${turn}"></span>${NAME[turn]} to move`;
  }
  undoBtn.disabled = history.length === 0 || busy;
  boardEl.classList.toggle("locked", over);
  boardEl.classList.toggle("won", !!winLine);
  renderPreview();
}

// Preview disc above the hovered column, plus a soft column highlight
function renderPreview() {
  const col = !over && hoverCol !== null && dropRow(hoverCol) >= 0 ? hoverCol : null;
  const target = col !== null ? dropRow(col) : -1;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      cells[r][c].classList.toggle("col-hover", c === col && !grid[r][c]);
      cells[r][c].classList.toggle("drop-target", !!(drag && drag.moved) && c === col && r === target);
    }
  }
  let disc = previewEl.firstElementChild;
  if (!disc || !disc.classList.contains(turn)) {
    previewEl.innerHTML = discHTML(turn, "hidden");
    disc = previewEl.firstElementChild;
    void disc.offsetWidth; // apply start state before transitions
  }
  const show = col !== null && !busy;
  disc.classList.toggle("hidden", !show);
  disc.classList.toggle("lifted", show && !!(drag && drag.moved));
  if (show) disc.style.transform = `translateX(${col * 100}%)`;
}

// ---------- Moves ----------

function play(c) {
  if (over || busy) return;
  const r = dropRow(c);
  if (r < 0) return;

  history.push({ grid: grid.map((row) => row.slice()), turn });
  const player = turn;
  grid[r][c] = player;
  busy = true;
  hoverCol = null;
  render();

  // Calm fall from above the board to the landing cell
  const discEl = cells[r][c].firstElementChild;
  const cellSize = cells[r][c].offsetHeight;
  const distance = (r + 1) * cellSize + 4 + 6;
  const duration = 180 + r * 45;
  discEl.animate(
    [{ transform: `translateY(${-distance}px)` }, { transform: "translateY(0)" }],
    { duration, easing: "cubic-bezier(0.45, 0, 0.8, 0.6)" }
  );
  // A timer (not the animation's finish event) ends the move, so the game
  // never gets stuck if the browser pauses animations.
  const id = ++moveId;
  setTimeout(() => { if (id === moveId) finishMove(r, c, player); }, duration);
}

function finishMove(r, c, player) {
  busy = false;
  winLine = findWin(r, c);
  const full = grid[0].every(Boolean);
  if (winLine) {
    over = true;
    Sound.win();
    messageEl.textContent = `${NAME[player]} connects four.`;
  } else if (full) {
    over = true;
    Sound.draw();
    messageEl.textContent = "The board is full. It's a draw.";
  } else {
    Sound.move();
    turn = other(player);
  }
  render();
}

function undo() {
  if (!history.length || busy) return;
  const prev = history.pop();
  grid = prev.grid;
  turn = prev.turn;
  over = false;
  winLine = null;
  messageEl.textContent = "";
  render();
}

function newGame() {
  grid = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  turn = "p1";
  history = [];
  over = false;
  winLine = null;
  busy = false;
  moveId++;
  hoverCol = null;
  messageEl.textContent = "";
  render();
}

// ---------- Input (Pointer Events: click/tap or drag the disc onto a column) ----------

function columnAt(x, y, loose) {
  const rect = boardEl.getBoundingClientRect();
  const size = cells[0][0].offsetWidth;
  const left = rect.left + (rect.width - size * COLS) / 2;
  const c = Math.floor((x - left) / size);
  if (c < 0 || c >= COLS) return null;
  // Above the board (the preview row) counts as the column too
  const top = loose ? previewEl.getBoundingClientRect().top : rect.top;
  if (y < top || y > rect.bottom) return null;
  return c;
}

function onPointerDown(e) {
  if (over || busy || e.button > 0) return;
  const c = columnAt(e.clientX, e.clientY, true);
  if (c === null) return;
  hoverCol = c;
  drag = { x: e.clientX, y: e.clientY, moved: false, ghost: null };
  renderPreview();
}

function onPointerMove(e) {
  if (!drag) {
    if (e.pointerType === "mouse") {
      const c = columnAt(e.clientX, e.clientY, true);
      if (c !== hoverCol) { hoverCol = c; renderPreview(); }
    }
    return;
  }
  if (!drag.moved) {
    if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < DRAG_THRESHOLD) return;
    drag.moved = true;
    drag.ghost = document.createElement("div");
    drag.ghost.className = "drag-ghost";
    drag.ghost.style.setProperty("--cell", cells[0][0].offsetWidth + "px");
    drag.ghost.innerHTML = discHTML(turn);
    document.body.appendChild(drag.ghost);
    document.body.classList.add("dragging");
  }
  const half = drag.ghost.offsetWidth / 2;
  drag.ghost.style.transform = `translate(${e.clientX - half}px, ${e.clientY - half}px)`;
  hoverCol = columnAt(e.clientX, e.clientY, true);
  renderPreview();
}

function endDrag() {
  if (drag && drag.ghost) drag.ghost.remove();
  document.body.classList.remove("dragging");
  drag = null;
}

function onPointerUp(e) {
  if (!drag) return;
  const c = columnAt(e.clientX, e.clientY, true);
  endDrag();
  if (c !== null && dropRow(c) >= 0) return play(c);
  // released outside the board: the disc goes back
  hoverCol = e.pointerType === "mouse" ? c : null;
  renderPreview();
}

function onPointerCancel() {
  if (!drag) return;
  endDrag();
  hoverCol = null;
  renderPreview();
}

playEl.addEventListener("pointerdown", onPointerDown);
playEl.addEventListener("pointerleave", (e) => {
  if (!drag && e.pointerType === "mouse") { hoverCol = null; renderPreview(); }
});
window.addEventListener("pointermove", onPointerMove);
window.addEventListener("pointerup", onPointerUp);
window.addEventListener("pointercancel", onPointerCancel);

undoBtn.addEventListener("click", undo);
document.getElementById("reset").addEventListener("click", newGame);

buildBoard();
newGame();

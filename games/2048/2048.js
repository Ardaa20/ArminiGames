// 2048 — single player on a 4x4 grid.
// grid[r][c] holds a tile object { id, v } or null. Each tile has its own element
// so it can slide (CSS transform) from its old cell to its new one.

const SIZE = 4;
const GOAL = 2048;
const SLIDE_MS = 120;
const BEST_KEY = "2048-best";

const boardEl = document.getElementById("board");
const statusEl = document.getElementById("status");
const undoBtn = document.getElementById("undo");
const endOverlay = document.getElementById("endOverlay");
const endTitle = document.getElementById("endTitle");
const endText = document.getElementById("endText");
const endUndo = document.getElementById("endUndo");
const keepGoing = document.getElementById("keepGoing");

let grid, score, won, prev, nextId = 1;
let best = 0;
try { best = Number(localStorage.getItem(BEST_KEY)) || 0; } catch (e) {}

const els = new Map();   // tile id -> element
let pending = [];        // elements to remove once the slide finishes
let pendingTimer = null;

// ---------- Rules ----------

function emptyCells() {
  const out = [];
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++)
      if (!grid[r][c]) out.push([r, c]);
  return out;
}

function spawn() {
  const free = emptyCells();
  if (!free.length) return null;
  const [r, c] = free[Math.floor(Math.random() * free.length)];
  const tile = { id: nextId++, v: Math.random() < 0.9 ? 2 : 4, fresh: true };
  grid[r][c] = tile;
  return tile;
}

function canMove() {
  if (emptyCells().length) return true;
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++) {
      const v = grid[r][c].v;
      if (c + 1 < SIZE && grid[r][c + 1].v === v) return true;
      if (r + 1 < SIZE && grid[r + 1][c].v === v) return true;
    }
  return false;
}

// The cells of line i, ordered from the edge the tiles slide toward.
function line(dir, i) {
  const cells = [];
  for (let k = 0; k < SIZE; k++) {
    if (dir === "left") cells.push([i, k]);
    else if (dir === "right") cells.push([i, SIZE - 1 - k]);
    else if (dir === "up") cells.push([k, i]);
    else cells.push([SIZE - 1 - k, i]);
  }
  return cells;
}

// Slides every line toward `dir`. Equal neighbours merge once per move.
// Returns { moved, gained, removed: [{tile, to}], merged: [tile] }.
function slide(dir) {
  const next = Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
  const removed = [];
  const merged = [];
  let moved = false, gained = 0;

  for (let i = 0; i < SIZE; i++) {
    const cells = line(dir, i);
    const tiles = cells.map(([r, c]) => grid[r][c]).filter(Boolean);
    let k = 0;
    for (let j = 0; j < tiles.length; j++) {
      const [r, c] = cells[k];
      const a = tiles[j], b = tiles[j + 1];
      if (b && a.v === b.v) {
        const tile = { id: nextId++, v: a.v * 2, merged: true };
        removed.push({ tile: a, to: [r, c] }, { tile: b, to: [r, c] });
        merged.push(tile);
        next[r][c] = tile;
        gained += tile.v;
        moved = true;
        j++;
      } else {
        next[r][c] = a;
      }
      k++;
    }
  }

  if (!moved) {
    for (let r = 0; r < SIZE; r++)
      for (let c = 0; c < SIZE; c++)
        if (next[r][c] !== grid[r][c]) moved = true;
  }
  return { moved, gained, removed, merged, next };
}

// ---------- Game flow ----------

function snapshot() {
  return {
    cells: grid.map((row) => row.map((t) => (t ? t.v : 0))),
    score,
    won,
  };
}

function newGame() {
  grid = Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
  score = 0;
  won = false;
  prev = null;
  spawn();
  spawn();
  hideEnd();
  render(true);
}

function move(dir) {
  if (endOverlay.dataset.open) return;
  const res = slide(dir);
  if (!res.moved) return;

  flush();
  prev = snapshot();
  for (const row of grid) for (const t of row) if (t) { t.fresh = false; t.merged = false; }
  grid = res.next;
  score += res.gained;
  if (score > best) {
    best = score;
    try { localStorage.setItem(BEST_KEY, String(best)); } catch (e) {}
  }
  spawn();

  // Sources of a merge slide into the merge cell, then disappear
  for (const { tile, to } of res.removed) {
    const el = els.get(tile.id);
    if (!el) continue;
    place(el, to[0], to[1]);
    els.delete(tile.id);
    pending.push(el);
  }
  pendingTimer = setTimeout(flush, SLIDE_MS + 20);
  render(false);

  const reached = res.merged.some((t) => t.v >= GOAL);
  if (reached && !won) {
    won = true;
    Sound.win();
    showEnd("You win!", `You reached ${GOAL}. Score: ${score}`, true);
  } else {
    if (res.merged.length) Sound.capture();
    else Sound.move();
    if (!canMove()) showEnd("Game over", `No moves left. Score: ${score}`, false);
  }
}

function undo() {
  if (!prev) return;
  flush();
  grid = prev.cells.map((row) => row.map((v) => (v ? { id: nextId++, v } : null)));
  score = prev.score;
  won = prev.won;
  prev = null;
  hideEnd();
  render(true);
}

// ---------- Drawing ----------

function place(el, r, c) {
  el.style.setProperty("--r", r);
  el.style.setProperty("--c", c);
}

function makeTile(tile) {
  const el = document.createElement("div");
  const step = Math.log2(tile.v);                 // 2 -> 1, 2048 -> 11
  const digits = String(tile.v).length;
  el.className = "tile";
  if (digits >= 3) el.classList.add("d" + Math.min(digits, 6));
  if (step > 11) el.classList.add("top");
  else if (step >= 7) el.classList.add("dark");
  el.style.setProperty("--p", Math.min(100, (step - 1) * 10) + "%");
  const face = document.createElement("div");
  face.className = "face";
  face.textContent = tile.v;
  el.appendChild(face);
  return el;
}

function flush() {
  clearTimeout(pendingTimer);
  pendingTimer = null;
  for (const el of pending) el.remove();
  pending = [];
}

// `instant` rebuilds every tile without animation (new game, undo).
function render(instant) {
  if (instant) {
    for (const el of els.values()) el.remove();
    els.clear();
  }
  const alive = new Set();
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++) {
      const tile = grid[r][c];
      if (!tile) continue;
      alive.add(tile.id);
      let el = els.get(tile.id);
      if (!el) {
        el = makeTile(tile);
        if (instant) el.classList.add("static");
        else if (tile.merged) el.classList.add("merged");
        else if (tile.fresh) el.classList.add("new");
        place(el, r, c);
        boardEl.appendChild(el);
        els.set(tile.id, el);
      } else {
        el.classList.remove("static", "new", "merged");
        place(el, r, c);
      }
    }
  for (const [id, el] of els) if (!alive.has(id)) { el.remove(); els.delete(id); }

  statusEl.textContent = `Score ${score} · Best ${best}`;
  undoBtn.disabled = !prev;
  endUndo.disabled = !prev;
}

function showEnd(title, text, isWin) {
  endTitle.textContent = title;
  endText.textContent = text;
  keepGoing.hidden = !isWin;
  endUndo.hidden = isWin;
  endUndo.disabled = !prev;
  // Let the last slide finish before the dialog appears
  setTimeout(() => { endOverlay.hidden = false; }, SLIDE_MS + 160);
  endOverlay.dataset.open = "1";
}

function hideEnd() {
  endOverlay.hidden = true;
  delete endOverlay.dataset.open;
}

// ---------- Input ----------

const KEYS = {
  ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down",
  a: "left", d: "right", w: "up", s: "down",
  A: "left", D: "right", W: "up", S: "down",
};

document.addEventListener("keydown", (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const dir = KEYS[e.key];
  if (!dir) return;
  e.preventDefault();
  if (endOverlay.dataset.open) return;
  move(dir);
});

// Swipe with Pointer Events (mouse drag or touch)
let start = null;
boardEl.addEventListener("pointerdown", (e) => {
  start = { x: e.clientX, y: e.clientY, id: e.pointerId };
  boardEl.setPointerCapture(e.pointerId);
});
boardEl.addEventListener("pointerup", (e) => {
  if (!start || start.id !== e.pointerId) return;
  const dx = e.clientX - start.x, dy = e.clientY - start.y;
  start = null;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 24 || endOverlay.dataset.open) return;
  if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? "right" : "left");
  else move(dy > 0 ? "down" : "up");
});
boardEl.addEventListener("pointercancel", () => { start = null; });

undoBtn.addEventListener("click", undo);
endUndo.addEventListener("click", undo);
keepGoing.addEventListener("click", hideEnd);
document.getElementById("reset").addEventListener("click", newGame);
document.getElementById("endReset").addEventListener("click", newGame);

// Empty background cells
for (let i = 0; i < SIZE * SIZE; i++) {
  const cell = document.createElement("div");
  cell.className = "cell";
  boardEl.appendChild(cell);
}

newGame();

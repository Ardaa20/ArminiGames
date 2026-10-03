// Minesweeper — single player. Mines are placed after the first click,
// never on the clicked cell or its neighbors, so the first click is always safe.
// Cells are indexed i = row * cols + col.

const LEVELS = {
  easy:   { cols: 9,  rows: 9,  mines: 10 },
  medium: { cols: 16, rows: 16, mines: 40 },
};
// Medium on narrow screens: a portrait board with about the same cell count,
// so the cells stay large enough to tap. Chosen when a new game starts.
const MEDIUM_TALL = { cols: 12, rows: 21 };
// Width the square Medium board needs: 16 x 28px cells + 15 x 2px gaps + 56px page/box padding
const MEDIUM_WIDE_MIN = 16 * 28 + 15 * 2 + 56;
const LONG_PRESS = 400; // ms on touch before a press places a flag
const BEST_KEY = "minesweeper-best";

const boardEl = document.getElementById("board");
const statusEl = document.getElementById("status");
const messageEl = document.getElementById("message");
const levelsEl = document.getElementById("levels");
const flagModeBtn = document.getElementById("flagMode");

const FLAG_SVG = `<svg class="flag" viewBox="0 0 100 100" aria-hidden="true"><path class="pole" d="M32 16 V86"/><path class="cloth" d="M34 14 L80 33 L34 52 Z"/></svg>`;
const MINE_SVG = `<svg class="mine" viewBox="0 0 100 100" aria-hidden="true"><path class="spikes" d="M50 14 V86 M14 50 H86 M25 25 L75 75 M75 25 L25 75"/><circle class="body" cx="50" cy="50" r="24"/><circle class="shine" cx="42" cy="42" r="6"/></svg>`;
const WRONG_SVG = `<svg class="flag wrong" viewBox="0 0 100 100" aria-hidden="true"><path class="pole" d="M32 16 V86"/><path class="cloth" d="M34 14 L80 33 L34 52 Z"/><path class="cross" d="M20 20 L80 80 M80 20 L20 80"/></svg>`;

let level = "easy";
let cols, rows, total;
let mines, open, flags, counts; // arrays of length total
let started, over, won, boom;
let openCount, flagCount;
let startTime, elapsed, timerId;
let flagMode = false;
let cells = [];
let press = null; // { i, timer, flagged, pointerId }

// ---------- Best times ----------

function loadBest() {
  try { return JSON.parse(localStorage.getItem(BEST_KEY)) || {}; } catch (e) { return {}; }
}
function saveBest(best) {
  try { localStorage.setItem(BEST_KEY, JSON.stringify(best)); } catch (e) {}
}

function formatTime(s) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

// ---------- Rules ----------

function neighbors(i) {
  const r = Math.floor(i / cols), c = i % cols;
  const out = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue;
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) out.push(nr * cols + nc);
    }
  }
  return out;
}

function placeMines(safe) {
  const banned = new Set([safe, ...neighbors(safe)]);
  const pool = [];
  for (let i = 0; i < total; i++) if (!banned.has(i)) pool.push(i);
  for (let k = 0; k < LEVELS[level].mines; k++) {
    const j = k + Math.floor(Math.random() * (pool.length - k));
    [pool[k], pool[j]] = [pool[j], pool[k]];
    mines[pool[k]] = true;
  }
  for (let i = 0; i < total; i++) counts[i] = neighbors(i).filter((n) => mines[n]).length;
}

// Opens a cell (flood-filling zeros). Returns false if a mine was opened.
function openCell(start) {
  if (open[start] || flags[start]) return true;
  if (mines[start]) { boom = start; return false; }
  const stack = [start];
  while (stack.length) {
    const i = stack.pop();
    if (open[i] || flags[i]) continue;
    open[i] = true;
    openCount++;
    if (counts[i] === 0) for (const n of neighbors(i)) if (!open[n] && !flags[n]) stack.push(n);
  }
  return true;
}

function reveal(i) {
  if (over || open[i] || flags[i]) return;
  if (!started) {
    placeMines(i);
    started = true;
    startTimer();
  }
  if (!openCell(i)) return lose();
  Sound.move();
  checkWin();
}

// Clicking an open number whose adjacent flags match it opens the other neighbors.
function chord(i) {
  if (over || !open[i] || counts[i] === 0) return;
  const around = neighbors(i);
  if (around.filter((n) => flags[n]).length !== counts[i]) return;
  const targets = around.filter((n) => !open[n] && !flags[n]);
  if (!targets.length) return;
  for (const n of targets) {
    if (!openCell(n)) return lose();
  }
  Sound.move();
  checkWin();
}

function toggleFlag(i) {
  if (over || open[i]) return;
  flags[i] = !flags[i];
  flagCount += flags[i] ? 1 : -1;
  Sound.move();
  render();
}

function checkWin() {
  if (openCount !== total - LEVELS[level].mines) return render();
  over = true;
  won = true;
  stopTimer();
  // Flag the remaining mines for a tidy final board
  for (let i = 0; i < total; i++) if (mines[i] && !flags[i]) { flags[i] = true; flagCount++; }
  const best = loadBest();
  const isBest = !best[level] || elapsed < best[level];
  if (isBest) { best[level] = elapsed; saveBest(best); }
  messageEl.textContent = isBest
    ? `You won in ${formatTime(elapsed)} · New best`
    : `You won in ${formatTime(elapsed)} · Best ${formatTime(best[level])}`;
  Sound.win();
  render();
}

function lose() {
  over = true;
  stopTimer();
  messageEl.textContent = "You hit a mine";
  Sound.lose();
  render();
}

// ---------- Timer ----------

function startTimer() {
  startTime = Date.now();
  elapsed = 0;
  timerId = setInterval(() => {
    elapsed = Math.floor((Date.now() - startTime) / 1000);
    renderStatus();
  }, 250);
}

function stopTimer() {
  if (timerId) clearInterval(timerId);
  timerId = null;
  if (started) elapsed = Math.floor((Date.now() - startTime) / 1000);
}

// ---------- Rendering ----------

function buildBoard() {
  boardEl.innerHTML = "";
  boardEl.classList.toggle("medium", level === "medium" && cols === 16);
  boardEl.classList.toggle("medium-tall", level === "medium" && cols === MEDIUM_TALL.cols);
  cells = [];
  for (let i = 0; i < total; i++) {
    const el = document.createElement("div");
    el.className = "cell";
    el.dataset.i = i;
    boardEl.appendChild(el);
    cells.push(el);
  }
}

function renderStatus() {
  statusEl.textContent = `Mines ${LEVELS[level].mines - flagCount} · ${formatTime(elapsed)}`;
}

function render() {
  cells.forEach((el, i) => {
    let cls = "cell";
    let html = "";
    if (open[i]) {
      cls += " open";
      if (counts[i]) {
        cls += ` n${counts[i]}`;
        html = String(counts[i]);
        if (!over) cls += " chordable";
      }
    } else if (over && !won && mines[i] && !flags[i]) {
      cls += " open";
      if (i === boom) cls += " boom";
      html = MINE_SVG;
    } else if (flags[i]) {
      cls += " hidden";
      if (over && !won && !mines[i]) { cls += " wrong-flag"; html = WRONG_SVG; }
      else html = FLAG_SVG;
    } else {
      cls += " hidden";
    }
    if (el.className !== cls) el.className = cls;
    if (el.innerHTML !== html) el.innerHTML = html;
  });
  boardEl.classList.toggle("over", over);
  renderStatus();
}

function renderControls() {
  levelsEl.querySelectorAll("[data-level]").forEach((b) => {
    b.classList.toggle("selected", b.dataset.level === level);
    b.setAttribute("aria-pressed", b.dataset.level === level);
  });
  flagModeBtn.classList.toggle("on", flagMode);
  flagModeBtn.setAttribute("aria-pressed", flagMode);
  flagModeBtn.innerHTML = `${FLAG_SVG}<span>Flag mode</span>`;
}

function newGame() {
  stopTimer();
  const tall = level === "medium" && document.documentElement.clientWidth < MEDIUM_WIDE_MIN;
  ({ cols, rows } = tall ? MEDIUM_TALL : LEVELS[level]);
  total = cols * rows;
  mines = new Array(total).fill(false);
  open = new Array(total).fill(false);
  flags = new Array(total).fill(false);
  counts = new Array(total).fill(0);
  started = over = won = false;
  boom = -1;
  openCount = flagCount = 0;
  elapsed = 0;
  messageEl.textContent = "";
  buildBoard();
  renderControls();
  render();
}

// ---------- Input ----------

function cellIndex(e) {
  const el = e.target.closest(".cell");
  return el && boardEl.contains(el) ? Number(el.dataset.i) : -1;
}

function primary(i) {
  if (open[i]) chord(i);
  else if (flagMode) toggleFlag(i);
  else reveal(i);
}

function cancelPress() {
  if (press && press.timer) clearTimeout(press.timer);
  press = null;
}

boardEl.addEventListener("pointerdown", (e) => {
  const i = cellIndex(e);
  if (i < 0 || over) return;
  if (e.pointerType === "mouse") {
    if (e.button === 2) toggleFlag(i);
    else if (e.button === 0) press = { i, pointerId: e.pointerId, flagged: false };
    return;
  }
  // Touch / pen: a long press flags, a short tap does the normal action
  cancelPress();
  press = { i, pointerId: e.pointerId, flagged: false };
  press.timer = setTimeout(() => {
    if (!press) return;
    press.timer = null;
    press.flagged = true;
    if (open[press.i]) return;
    toggleFlag(press.i);
    if (navigator.vibrate) navigator.vibrate(15);
  }, LONG_PRESS);
});

boardEl.addEventListener("pointerup", (e) => {
  if (!press || press.pointerId !== e.pointerId) return;
  const p = press;
  cancelPress();
  if (p.flagged || cellIndex(e) !== p.i) return;
  primary(p.i);
});

boardEl.addEventListener("pointercancel", cancelPress);
boardEl.addEventListener("pointerleave", (e) => { if (e.pointerType === "mouse") cancelPress(); });
// No context menu on the board (right-click and long-press are used for flags)
boardEl.addEventListener("contextmenu", (e) => e.preventDefault());

levelsEl.addEventListener("click", (e) => {
  const b = e.target.closest("[data-level]");
  if (!b || b.dataset.level === level) return;
  level = b.dataset.level;
  newGame();
});

flagModeBtn.addEventListener("click", () => {
  flagMode = !flagMode;
  renderControls();
});

document.getElementById("reset").addEventListener("click", newGame);

newGame();

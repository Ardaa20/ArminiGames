// Sudoku — single player, 9x9.
// Cells are indexed 0..80 (row * 9 + col). Values are 0 (empty) or 1..9.
// Notes are 9-bit masks: bit (d - 1) set means candidate d is pencilled in.

const CLUES = { easy: 40, medium: 32, hard: 26 };
const LABEL = { easy: "Easy", medium: "Medium", hard: "Hard" };

const ROW = [], COL = [], BOX = [];
for (let i = 0; i < 81; i++) {
  ROW[i] = Math.floor(i / 9);
  COL[i] = i % 9;
  BOX[i] = Math.floor(ROW[i] / 3) * 3 + Math.floor(COL[i] / 3);
}
// PEERS[i] = the 20 other cells sharing a row, column or box with i
const PEERS = [];
for (let i = 0; i < 81; i++) {
  PEERS[i] = [];
  for (let j = 0; j < 81; j++) {
    if (j !== i && (ROW[j] === ROW[i] || COL[j] === COL[i] || BOX[j] === BOX[i])) PEERS[i].push(j);
  }
}
const BITS = new Uint8Array(512); // popcount for 9-bit masks
for (let m = 1; m < 512; m++) BITS[m] = BITS[m >> 1] + (m & 1);

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---------- Solver ----------

// Backtracking with bitmasks, always branching on the cell with the fewest candidates.
// Returns the number of solutions found, stopping at `limit`.
// If `random` is true, candidates are tried in random order (used to build a full grid);
// the first solution found is written into `grid`.
function solve(grid, limit, random) {
  const rows = new Uint16Array(9), cols = new Uint16Array(9), boxes = new Uint16Array(9);
  for (let i = 0; i < 81; i++) {
    const v = grid[i];
    if (!v) continue;
    const bit = 1 << (v - 1);
    if ((rows[ROW[i]] | cols[COL[i]] | boxes[BOX[i]]) & bit) return 0; // already broken
    rows[ROW[i]] |= bit; cols[COL[i]] |= bit; boxes[BOX[i]] |= bit;
  }
  const work = grid.slice();
  let count = 0;
  let saved = false;

  function search() {
    let best = -1, bestMask = 0, bestCount = 10;
    for (let i = 0; i < 81; i++) {
      if (work[i]) continue;
      const mask = 511 & ~(rows[ROW[i]] | cols[COL[i]] | boxes[BOX[i]]);
      const n = BITS[mask];
      if (n < bestCount) {
        best = i; bestMask = mask; bestCount = n;
        if (n <= 1) break;
      }
    }
    if (best < 0) {
      count++;
      if (!saved) { for (let i = 0; i < 81; i++) grid[i] = work[i]; saved = true; }
      return count >= limit;
    }
    if (!bestMask) return false;
    const digits = [];
    for (let d = 1; d <= 9; d++) if (bestMask & (1 << (d - 1))) digits.push(d);
    if (random) shuffle(digits);
    const r = ROW[best], c = COL[best], b = BOX[best];
    for (const d of digits) {
      const bit = 1 << (d - 1);
      work[best] = d;
      rows[r] |= bit; cols[c] |= bit; boxes[b] |= bit;
      const done = search();
      rows[r] &= ~bit; cols[c] &= ~bit; boxes[b] &= ~bit;
      work[best] = 0;
      if (done) return true;
    }
    return false;
  }

  search();
  return count;
}

const countSolutions = (grid, limit = 2) => solve(grid.slice(), limit, false);

// ---------- Generator ----------

// Builds a random full grid, then removes clues one by one (random order) as long as the
// puzzle keeps exactly one solution. Retries within a small time budget if the target
// clue count was not reached and keeps the sparsest puzzle found.
function generate(level) {
  const target = CLUES[level];
  const start = performance.now();
  let best = null;
  do {
    const solution = new Array(81).fill(0);
    solve(solution, 1, true);
    const puzzle = solution.slice();
    let clues = 81;
    for (const i of shuffle([...Array(81).keys()])) {
      if (clues <= target) break;
      const v = puzzle[i];
      puzzle[i] = 0;
      if (countSolutions(puzzle) !== 1) puzzle[i] = v;
      else clues--;
    }
    if (!best || clues < best.clues) best = { puzzle, solution, clues };
  } while (best.clues > target && performance.now() - start < 700);
  return best;
}

// ---------- State ----------

let level = "easy";
let puzzle, solution;   // givens (0 = empty) and the unique solution
let values, notes;      // current board
let history = [];       // snapshots for undo
let selected = 40;
let noteMode = false;
let solved = false;
let elapsed = 0;        // ms played, paused while the tab is hidden
let tickFrom = null;
let timer = null;

const boardEl = document.getElementById("board");
const padEl = document.getElementById("pad");
const statusEl = document.getElementById("status");
const msgEl = document.getElementById("message");
const notesBtn = document.getElementById("notes");
const undoBtn = document.getElementById("undo");
const levelBtns = document.querySelectorAll(".level button");

// Build cells and pad keys once
const cells = [];
for (let i = 0; i < 81; i++) {
  const el = document.createElement("div");
  el.className = "cell";
  if (COL[i] === 2 || COL[i] === 5) el.classList.add("edge-r");
  if (ROW[i] === 2 || ROW[i] === 5) el.classList.add("edge-b");
  if (COL[i] === 8) el.classList.add("last-c");
  if (ROW[i] === 8) el.classList.add("last-r");
  el.dataset.i = i;
  boardEl.appendChild(el);
  cells.push(el);
}
const keys = [];
for (let d = 1; d <= 9; d++) {
  const k = document.createElement("button");
  k.type = "button";
  k.className = "key";
  k.textContent = d;
  k.addEventListener("click", () => input(d));
  padEl.appendChild(k);
  keys.push(k);
}

// ---------- Timer ----------

const fmt = (ms) => {
  const s = Math.floor(ms / 1000);
  return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
};
const now = () => elapsed + (tickFrom === null ? 0 : performance.now() - tickFrom);

function showStatus() {
  statusEl.textContent = (solved ? "Solved · " : LABEL[level] + " · ") + fmt(now());
}
function startClock() {
  if (tickFrom === null && !solved && !document.hidden) tickFrom = performance.now();
}
function stopClock() {
  if (tickFrom !== null) { elapsed += performance.now() - tickFrom; tickFrom = null; }
}
document.addEventListener("visibilitychange", () => {
  if (document.hidden) stopClock(); else startClock();
  showStatus();
});

// ---------- Game flow ----------

function newGame() {
  statusEl.textContent = "Generating…";
  msgEl.textContent = "";
  // Let the browser paint first, then generate (takes well under a second)
  setTimeout(() => {
    const g = generate(level);
    puzzle = g.puzzle;
    solution = g.solution;
    values = puzzle.slice();
    notes = new Array(81).fill(0);
    history = [];
    solved = false;
    elapsed = 0;
    tickFrom = null;
    startClock();
    clearInterval(timer);
    timer = setInterval(showStatus, 250);
    render();
    showStatus();
  }, 20);
}

function snapshot() {
  history.push({ values: values.slice(), notes: notes.slice() });
}

function undo() {
  if (solved || !history.length) return;
  const s = history.pop();
  values = s.values;
  notes = s.notes;
  render();
}

function input(d) {
  if (solved || !values || puzzle[selected]) return;
  const i = selected;
  if (noteMode) {
    if (values[i]) return;
    snapshot();
    notes[i] ^= 1 << (d - 1);
  } else {
    if (values[i] === d) return;
    snapshot();
    values[i] = d;
    notes[i] = 0;
    // The digit can no longer be a candidate for any peer
    for (const p of PEERS[i]) notes[p] &= ~(1 << (d - 1));
    Sound.move();
  }
  render();
  checkWin();
}

function erase() {
  if (solved || !values || puzzle[selected]) return;
  const i = selected;
  if (!values[i] && !notes[i]) return;
  snapshot();
  values[i] = 0;
  notes[i] = 0;
  render();
}

function checkWin() {
  for (let i = 0; i < 81; i++) if (values[i] !== solution[i]) return;
  stopClock();
  solved = true;
  clearInterval(timer);
  showStatus();
  msgEl.textContent = "Solved in " + fmt(elapsed);
  render();
  Sound.win();
}

function select(i) {
  selected = i;
  render();
}

// ---------- Rendering ----------

function conflicts() {
  const bad = new Set();
  for (let i = 0; i < 81; i++) {
    if (!values[i]) continue;
    for (const p of PEERS[i]) if (values[p] === values[i]) { bad.add(i); break; }
  }
  return bad;
}

function render() {
  if (!values) return;
  const bad = conflicts();
  const sv = values[selected];
  const counts = new Array(10).fill(0);
  for (let i = 0; i < 81; i++) {
    const el = cells[i];
    const v = values[i];
    counts[v]++;
    el.className = el.className.replace(/\s*(given|user|peer|same|sel|bad|done)\b/g, "");
    if (v) {
      el.textContent = v;
      el.classList.add(puzzle[i] ? "given" : "user");
    } else if (notes[i]) {
      let html = '<span class="notes">';
      for (let d = 1; d <= 9; d++) html += "<span>" + (notes[i] & (1 << (d - 1)) ? d : "") + "</span>";
      el.innerHTML = html + "</span>";
    } else {
      el.textContent = "";
    }
    if (bad.has(i)) el.classList.add("bad");
    if (solved) { el.classList.add("done"); continue; }
    if (i === selected) el.classList.add("sel");
    else if (sv && v === sv) el.classList.add("same");
    else if (ROW[i] === ROW[selected] || COL[i] === COL[selected] || BOX[i] === BOX[selected]) el.classList.add("peer");
  }
  keys.forEach((k, n) => k.classList.toggle("spent", counts[n + 1] >= 9 && !bad.size));
  notesBtn.classList.toggle("ghost", !noteMode);
  notesBtn.setAttribute("aria-pressed", noteMode);
  undoBtn.disabled = solved || !history.length;
  levelBtns.forEach((b) => b.classList.toggle("on", b.dataset.level === level));
}

// ---------- Input ----------

boardEl.addEventListener("pointerdown", (e) => {
  const el = e.target.closest(".cell");
  if (el) select(+el.dataset.i);
});

document.addEventListener("keydown", (e) => {
  if (e.ctrlKey || e.metaKey) {
    if (e.key.toLowerCase() === "z") { e.preventDefault(); undo(); }
    return;
  }
  if (e.altKey) return;
  const move = { ArrowUp: -9, ArrowDown: 9, ArrowLeft: -1, ArrowRight: 1 }[e.key];
  if (move) {
    e.preventDefault();
    const r = (ROW[selected] + (move === -9 ? 8 : move === 9 ? 1 : 0)) % 9;
    const c = (COL[selected] + (move === -1 ? 8 : move === 1 ? 1 : 0)) % 9;
    select(r * 9 + c);
  } else if (/^[1-9]$/.test(e.key)) {
    input(+e.key);
  } else if (e.key === "Backspace" || e.key === "Delete" || e.key === "0") {
    e.preventDefault();
    erase();
  } else if (e.key === "n" || e.key === "N") {
    toggleNotes();
  }
});

function toggleNotes() {
  noteMode = !noteMode;
  render();
}

notesBtn.addEventListener("click", toggleNotes);
document.getElementById("erase").addEventListener("click", erase);
undoBtn.addEventListener("click", undo);
document.getElementById("reset").addEventListener("click", newGame);
levelBtns.forEach((b) => b.addEventListener("click", () => {
  level = b.dataset.level;
  render();
  newGame();
}));

levelBtns.forEach((b) => b.classList.toggle("on", b.dataset.level === level));
newGame();

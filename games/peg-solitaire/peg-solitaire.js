// Peg Solitaire — single player, English cross-shaped board (33 holes).
// board[r][c]: null = outside the cross, false = empty hole, true = peg.
// A peg jumps orthogonally over a neighbouring peg into an empty hole two away;
// the jumped peg is removed. Goal: one peg left, ideally in the center.

const N = 7;
const CENTER = 3;
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

const onBoard = (r, c) =>
  r >= 0 && r < N && c >= 0 && c < N && !((r < 2 || r > 4) && (c < 2 || c > 4));

function startBoard() {
  const b = [];
  for (let r = 0; r < N; r++) {
    b.push([]);
    for (let c = 0; c < N; c++) b[r].push(onBoard(r, c) ? !(r === CENTER && c === CENTER) : null);
  }
  return b;
}

// ---------- Rules ----------

function movesFrom(b, r, c) {
  if (b[r][c] !== true) return [];
  const out = [];
  for (const [dr, dc] of DIRS) {
    const mr = r + dr, mc = c + dc, tr = r + 2 * dr, tc = c + 2 * dc;
    if (onBoard(tr, tc) && b[mr][mc] === true && b[tr][tc] === false)
      out.push({ fr: r, fc: c, mr, mc, tr, tc });
  }
  return out;
}

function hasAnyMove(b) {
  for (let r = 0; r < N; r++)
    for (let c = 0; c < N; c++)
      if (movesFrom(b, r, c).length) return true;
  return false;
}

const pegCount = (b) => b.flat().filter((v) => v === true).length;

function applyMove(b, m) {
  const n = b.map((row) => row.slice());
  n[m.fr][m.fc] = false;
  n[m.mr][m.mc] = false;
  n[m.tr][m.tc] = true;
  return n;
}

// ---------- UI ----------

const boardEl = document.getElementById("board");
const statusEl = document.getElementById("status");
const noteEl = document.getElementById("note");
const endOverlay = document.getElementById("endOverlay");

const PEG = `<svg class="peg" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="40"/></svg>`;
const pegSVG = (extra = "") => PEG.replace('class="peg"', `class="peg ${extra}"`);

let board, history, selected, targets, over;
let drag = null; // { r, c, x, y, moved, wasSelected, ghost, hover }

const DRAG_THRESHOLD = 5; // px before a press becomes a drag

function newGame() {
  board = startBoard();
  history = [];
  selected = null;
  targets = [];
  over = false;
  endOverlay.hidden = true;
  render();
}

// The 49 cell elements are created once; render() only updates their classes and
// contents, so the element holding the pointer capture is never destroyed mid-drag.
const cells = [];
for (let r = 0; r < N; r++) {
  cells.push([]);
  for (let c = 0; c < N; c++) {
    const cell = document.createElement("div");
    boardEl.appendChild(cell);
    cells[r].push(cell);
  }
}

function render() {
  const at = (sq, r, c) => sq && sq[0] === r && sq[1] === c;
  const lifted = drag && drag.moved ? [drag.r, drag.c] : null;
  const hover = drag && drag.moved ? drag.hover : null;

  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const cell = cells[r][c];
      const v = board[r][c];
      const cls = ["cell"];
      if (v !== null) {
        if (v === false) cls.push("hole");
        if (at(selected, r, c)) cls.push("sel");
        if (!over && movesFrom(board, r, c).length) cls.push("own");
        if (targets.some((m) => m.tr === r && m.tc === c)) {
          cls.push("target");
          if (at(hover, r, c)) cls.push("hover");
        }
      }
      cell.className = cls.join(" ");
      const content = v === true ? pegSVG(at(lifted, r, c) ? "lifted" : "") : "";
      if (cell.dataset.content !== content) {
        cell.dataset.content = content;
        cell.innerHTML = content;
      }
    }
  }

  const n = pegCount(board);
  statusEl.textContent = `${n} ${n === 1 ? "peg" : "pegs"} left`;
  if (!over) noteEl.textContent = history.length ? "" : "Jump a peg over another into an empty hole";
  document.getElementById("undo").disabled = history.length === 0;
}

function cellAt(x, y) {
  const rect = boardEl.getBoundingClientRect();
  const size = rect.width / N;
  const c = Math.floor((x - rect.left) / size);
  const r = Math.floor((y - rect.top) / size);
  return onBoard(r, c) ? [r, c] : null;
}

function select(r, c) {
  selected = [r, c];
  targets = movesFrom(board, r, c);
}

function clearSelection() {
  selected = null;
  targets = [];
}

// Click and drag share one flow: press picks a peg (or plays a target),
// moving past the threshold starts a drag, release drops it.
function onPointerDown(e) {
  if (over || e.button > 0) return;
  const sq = cellAt(e.clientX, e.clientY);
  if (!sq) {
    clearSelection();
    return render();
  }
  const [r, c] = sq;

  const move = selected && targets.find((m) => m.tr === r && m.tc === c);
  if (move) return commit(move);

  if (!movesFrom(board, r, c).length) {
    clearSelection();
    return render();
  }

  const wasSelected = !!selected && selected[0] === r && selected[1] === c;
  select(r, c);
  try { boardEl.setPointerCapture(e.pointerId); } catch (err) { /* capture is best effort */ }
  drag = { r, c, x: e.clientX, y: e.clientY, moved: false, wasSelected, ghost: null, hover: null };
  render();
}

function onPointerMove(e) {
  if (!drag) return;
  if (!drag.moved) {
    if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < DRAG_THRESHOLD) return;
    drag.moved = true;
    const size = boardEl.getBoundingClientRect().width / N;
    drag.ghost = document.createElement("div");
    drag.ghost.className = "drag-ghost";
    drag.ghost.style.width = drag.ghost.style.height = size + "px";
    drag.ghost.innerHTML = pegSVG();
    document.body.appendChild(drag.ghost);
    document.body.classList.add("dragging");
  }
  const half = drag.ghost.offsetWidth / 2;
  drag.ghost.style.transform = `translate(${e.clientX - half}px, ${e.clientY - half}px)`;

  const sq = cellAt(e.clientX, e.clientY);
  if (String(sq) !== String(drag.hover)) {
    drag.hover = sq;
    render();
  }
}

function onPointerUp(e) {
  if (!drag) return;
  const d = drag;
  drag = null;
  if (d.ghost) d.ghost.remove();
  document.body.classList.remove("dragging");

  // A quick flick may end without any pointermove past the threshold: still a drop
  const far = Math.hypot(e.clientX - d.x, e.clientY - d.y) >= DRAG_THRESHOLD;
  if (d.moved || far) {
    const sq = cellAt(e.clientX, e.clientY);
    const move = sq && targets.find((m) => m.tr === sq[0] && m.tc === sq[1]);
    if (move) return commit(move);
    // dropped elsewhere: the peg snaps back and stays selected
  } else if (d.wasSelected) {
    clearSelection(); // second click on the same peg deselects it
  }
  render();
}

function onPointerCancel() {
  if (!drag) return;
  if (drag.ghost) drag.ghost.remove();
  document.body.classList.remove("dragging");
  drag = null;
  render();
}

boardEl.addEventListener("pointerdown", onPointerDown);
window.addEventListener("pointermove", onPointerMove);
window.addEventListener("pointerup", onPointerUp);
window.addEventListener("pointercancel", onPointerCancel);

function commit(m) {
  history.push(board);
  board = applyMove(board, m);
  Sound.capture();
  clearSelection();
  render();
  checkEnd();
}

function checkEnd() {
  if (hasAnyMove(board)) return;
  const n = pegCount(board);
  let title, text;
  if (n === 1) {
    const centered = board[CENTER][CENTER] === true;
    title = centered ? "1 peg left — perfect!" : "1 peg left";
    text = centered ? "You finished in the center." : "Solved! Try to finish in the center.";
    Sound.win();
  } else {
    title = `${n} pegs left`;
    text = "No more moves.";
    Sound.draw();
  }
  over = true;
  noteEl.textContent = title;
  document.getElementById("endTitle").textContent = title;
  document.getElementById("endText").textContent = text;
  endOverlay.hidden = false;
  render();
}

function undo() {
  if (!history.length) return;
  board = history.pop();
  clearSelection();
  over = false;
  endOverlay.hidden = true;
  render();
}

document.getElementById("undo").addEventListener("click", undo);
document.getElementById("reset").addEventListener("click", newGame);
document.getElementById("endUndo").addEventListener("click", undo);
document.getElementById("endReset").addEventListener("click", newGame);

newGame();

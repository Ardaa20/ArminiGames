// Reversi (Othello) — two players on one device. Black moves first.
// board[r][c] is null, "b" or "w".

const N = 8;
const DIRS = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
const FLIP_MS = 360;
const DRAG_THRESHOLD = 4;
const NAMES = { b: "Black", w: "White" };

const boardEl = document.getElementById("board");
const nextEl = document.getElementById("next");
const msgEl = document.getElementById("msg");
const statusEl = document.getElementById("status");
const endOverlay = document.getElementById("endOverlay");

let board, turn, over, last, note, busy;
let drag = null; // { x, y, moved, ghost, hover }

const other = (col) => (col === "b" ? "w" : "b");
const inside = (r, c) => r >= 0 && r < N && c >= 0 && c < N;

// Discs that would flip if `col` plays at (r, c); empty if the move is illegal.
function flipsFor(b, r, c, col) {
  if (b[r][c]) return [];
  const result = [];
  for (const [dr, dc] of DIRS) {
    const line = [];
    let rr = r + dr, cc = c + dc;
    while (inside(rr, cc) && b[rr][cc] === other(col)) {
      line.push([rr, cc]);
      rr += dr;
      cc += dc;
    }
    if (line.length && inside(rr, cc) && b[rr][cc] === col) result.push(...line);
  }
  return result;
}

function legalMoves(b, col) {
  const moves = [];
  for (let r = 0; r < N; r++)
    for (let c = 0; c < N; c++)
      if (flipsFor(b, r, c, col).length) moves.push([r, c]);
  return moves;
}

function counts() {
  let b = 0, w = 0;
  for (const row of board) for (const v of row) { if (v === "b") b++; else if (v === "w") w++; }
  return { b, w };
}

// ---------- Board DOM (built once, updated in place so discs can animate) ----------

const cells = [];
for (let r = 0; r < N; r++) {
  cells.push([]);
  for (let c = 0; c < N; c++) {
    const el = document.createElement("div");
    el.className = "cell";
    el.dataset.r = r;
    el.dataset.c = c;
    boardEl.appendChild(el);
    cells[r].push(el);
  }
}

function discEl(col) {
  const d = document.createElement("div");
  d.className = "disc " + col;
  return d;
}

function newGame() {
  board = Array.from({ length: N }, () => Array(N).fill(null));
  board[3][3] = board[4][4] = "w";
  board[3][4] = board[4][3] = "b";
  turn = "b";
  over = false;
  last = null;
  note = "";
  busy = false;
  endOverlay.hidden = true;
  for (let r = 0; r < N; r++)
    for (let c = 0; c < N; c++) {
      cells[r][c].replaceChildren();
      if (board[r][c]) cells[r][c].appendChild(discEl(board[r][c]));
    }
  render();
}

function render() {
  const legal = over || busy ? [] : legalMoves(board, turn);
  const isLegal = (r, c) => legal.some(([lr, lc]) => lr === r && lc === c);
  for (let r = 0; r < N; r++)
    for (let c = 0; c < N; c++) {
      const el = cells[r][c];
      el.classList.toggle("legal", isLegal(r, c));
      el.classList.toggle("hover", !!drag && !!drag.hover && drag.hover[0] === r && drag.hover[1] === c);
      const d = el.firstChild;
      if (d) d.classList.toggle("last", !!last && last[0] === r && last[1] === c);
    }

  const { b, w } = counts();
  statusEl.innerHTML =
    `<span class="count"><span class="dot b"></span>${b}</span>` +
    `<span class="count"><span class="dot w"></span>${w}</span>`;

  nextEl.replaceChildren(discEl(turn));
  nextEl.classList.toggle("off", over);
  nextEl.classList.toggle("lifted", !!drag && drag.moved);

  if (over) msgEl.textContent = "Game over";
  else msgEl.textContent = note || `${NAMES[turn]} to move`;
}

// ---------- Moves ----------

function play(r, c) {
  if (over || busy) return;
  const flips = flipsFor(board, r, c, turn);
  if (!flips.length) return;

  board[r][c] = turn;
  for (const [fr, fc] of flips) board[fr][fc] = turn;
  last = [r, c];
  note = "";

  const placed = discEl(turn);
  placed.classList.add("placed");
  cells[r][c].replaceChildren(placed);
  Sound.move();

  // Calm flip: squeeze each disc to a line, swap its color, open it again.
  busy = true;
  const mover = turn;
  for (const [fr, fc] of flips) {
    const d = cells[fr][fc].firstChild;
    d.classList.add("flipping");
    setTimeout(() => { d.classList.remove("b", "w"); d.classList.add(mover); }, FLIP_MS / 2);
  }
  setTimeout(() => Sound.capture(), 120);
  render();

  setTimeout(() => {
    for (const [fr, fc] of flips) cells[fr][fc].firstChild.classList.remove("flipping");
    placed.classList.remove("placed");
    busy = false;
    nextTurn();
  }, FLIP_MS + 20);
}

function nextTurn() {
  const opp = other(turn);
  if (legalMoves(board, opp).length) {
    turn = opp;
  } else if (legalMoves(board, turn).length) {
    note = `${NAMES[opp]} has no move and passes`;
  } else {
    return finish();
  }
  render();
}

function finish() {
  over = true;
  render();
  const { b, w } = counts();
  const title = document.getElementById("endTitle");
  const text = document.getElementById("endText");
  if (b === w) {
    title.textContent = "Draw";
    Sound.draw();
  } else {
    title.textContent = `${b > w ? "Black" : "White"} wins`;
    Sound.win();
  }
  text.textContent = `Black ${b} · White ${w}`;
  setTimeout(() => { if (over) endOverlay.hidden = false; }, 500);
}

// ---------- Input: tap a cell, or drag the next disc onto a cell ----------

function cellAt(x, y) {
  const el = document.elementFromPoint(x, y);
  const cell = el && el.closest(".cell");
  return cell && boardEl.contains(cell) ? [+cell.dataset.r, +cell.dataset.c] : null;
}

boardEl.addEventListener("click", (e) => {
  const cell = e.target.closest(".cell");
  if (cell) play(+cell.dataset.r, +cell.dataset.c);
});

nextEl.addEventListener("pointerdown", (e) => {
  if (over || busy || e.button > 0) return;
  e.preventDefault();
  drag = { x: e.clientX, y: e.clientY, moved: false, ghost: null, hover: null };
});

window.addEventListener("pointermove", (e) => {
  if (!drag) return;
  if (!drag.moved) {
    if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < DRAG_THRESHOLD) return;
    drag.moved = true;
    const size = cells[0][0].getBoundingClientRect().width;
    drag.ghost = document.createElement("div");
    drag.ghost.className = "drag-ghost";
    drag.ghost.style.width = drag.ghost.style.height = size + "px";
    drag.ghost.appendChild(discEl(turn));
    document.body.appendChild(drag.ghost);
    document.body.classList.add("dragging");
  }
  const half = drag.ghost.offsetWidth / 2;
  drag.ghost.style.transform = `translate(${e.clientX - half}px, ${e.clientY - half}px)`;

  // Only legal cells get the outline; elsewhere the disc goes back on release.
  let sq = cellAt(e.clientX, e.clientY);
  if (sq && !flipsFor(board, sq[0], sq[1], turn).length) sq = null;
  if (String(sq) !== String(drag.hover)) {
    drag.hover = sq;
    render();
  }
});

function endDrag() {
  const d = drag;
  drag = null;
  if (d && d.ghost) d.ghost.remove();
  document.body.classList.remove("dragging");
  return d;
}

window.addEventListener("pointerup", (e) => {
  if (!drag) return;
  const d = endDrag();
  render();
  if (d.moved && d.hover) play(d.hover[0], d.hover[1]);
});

window.addEventListener("pointercancel", () => {
  if (!drag) return;
  endDrag();
  render();
});

document.getElementById("reset").addEventListener("click", newGame);
document.getElementById("endReset").addEventListener("click", newGame);
document.getElementById("endClose").addEventListener("click", () => { endOverlay.hidden = true; });

newGame();

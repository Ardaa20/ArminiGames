// Tic-tac-toe — two players on the same device. X always starts.
// board[i]: i = row * 3 + col. Values: null, "x" or "o".

const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];
const DRAG_THRESHOLD = 5; // px before a press becomes a drag

const boardEl = document.getElementById("board");
const nextEl = document.getElementById("next");
const statusEl = document.getElementById("status");
const messageEl = document.getElementById("message");

const score = { x: 0, o: 0, draws: 0 }; // kept for this session only
let board, turn, over, winLine;
let cells = [];
let drag = null; // { x, y, moved, ghost, target }

function markSVG(p, extra = "") {
  const shape = p === "x"
    ? `<path d="M28 28 L72 72 M72 28 L28 72"/>`
    : `<circle cx="50" cy="50" r="23"/>`;
  return `<svg class="mark ${p} ${extra}" viewBox="0 0 100 100" aria-hidden="true">${shape}</svg>`;
}

// ---------- Rules ----------

function findWin() {
  return LINES.find(([a, b, c]) => board[a] && board[a] === board[b] && board[a] === board[c]) || null;
}

// ---------- Rendering ----------

function buildBoard() {
  boardEl.innerHTML = "";
  cells = [];
  for (let i = 0; i < 9; i++) {
    const el = document.createElement("div");
    el.className = "cell";
    boardEl.appendChild(el);
    cells.push(el);
  }
}

function render() {
  cells.forEach((el, i) => {
    const p = board[i];
    el.innerHTML = p ? markSVG(p) : over ? "" : markSVG(turn, "ghost");
    el.classList.toggle("filled", !!p);
    el.classList.toggle("win", !!winLine && winLine.includes(i));
    el.classList.toggle("drop-target", !!drag && drag.target === i);
  });
  boardEl.classList.toggle("locked", over);
  boardEl.classList.toggle("won", !!winLine);
  boardEl.classList.toggle("won-x", !!winLine && board[winLine[0]] === "x");
  boardEl.classList.toggle("won-o", !!winLine && board[winLine[0]] === "o");

  statusEl.textContent = `X ${score.x} · O ${score.o} · Draws ${score.draws}`;

  if (over) {
    nextEl.innerHTML = `<span class="handle hidden"></span>`;
  } else {
    const lifted = drag && drag.moved ? " lifted" : "";
    nextEl.innerHTML = `<span class="handle${lifted}" id="handle">${markSVG(turn)}</span>` +
      `<span>${turn.toUpperCase()} to move</span>`;
  }
}

// ---------- Moves ----------

function play(i) {
  if (over || board[i]) return;
  board[i] = turn;
  winLine = findWin();
  if (winLine) {
    over = true;
    score[turn]++;
    Sound.win();
    messageEl.textContent = `${turn.toUpperCase()} wins.`;
  } else if (board.every(Boolean)) {
    over = true;
    score.draws++;
    Sound.draw();
    messageEl.textContent = "The board is full. It's a draw.";
  } else {
    Sound.move();
    turn = turn === "x" ? "o" : "x";
  }
  render();
}

function newGame() {
  board = Array(9).fill(null);
  turn = "x";
  over = false;
  winLine = null;
  endDrag();
  messageEl.textContent = "";
  render();
}

// ---------- Input (Pointer Events: click/tap a cell, or drag the next mark onto one) ----------

// Index of the empty cell under the point, or null
function cellAt(x, y) {
  const el = document.elementFromPoint(x, y);
  const cell = el && el.closest(".cell");
  const i = cell ? cells.indexOf(cell) : -1;
  return i >= 0 && !board[i] ? i : null;
}

let pressedCell = null; // a tap places only if it starts and ends on the same cell

boardEl.addEventListener("pointerdown", (e) => {
  pressedCell = e.button > 0 ? null : cellAt(e.clientX, e.clientY);
});

boardEl.addEventListener("pointerup", (e) => {
  if (drag || pressedCell === null) return;
  const i = cellAt(e.clientX, e.clientY);
  if (i === pressedCell) play(i);
  pressedCell = null;
});

nextEl.addEventListener("pointerdown", (e) => {
  if (over || e.button > 0 || !e.target.closest("#handle")) return;
  e.preventDefault();
  drag = { x: e.clientX, y: e.clientY, moved: false, ghost: null, target: null };
});

window.addEventListener("pointermove", (e) => {
  if (!drag) return;
  if (!drag.moved) {
    if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < DRAG_THRESHOLD) return;
    drag.moved = true;
    drag.ghost = document.createElement("div");
    drag.ghost.className = "drag-ghost";
    drag.ghost.innerHTML = markSVG(turn);
    document.body.appendChild(drag.ghost);
    document.body.classList.add("dragging");
    render(); // fade the handle
  }
  const half = drag.ghost.offsetWidth / 2;
  drag.ghost.style.transform = `translate(${e.clientX - half}px, ${e.clientY - half}px)`;
  const target = cellAt(e.clientX, e.clientY);
  if (target !== drag.target) {
    drag.target = target;
    render();
  }
});

function endDrag() {
  if (drag && drag.ghost) drag.ghost.remove();
  document.body.classList.remove("dragging");
  drag = null;
}

window.addEventListener("pointerup", (e) => {
  pressedCell = null;
  if (!drag) return;
  const target = drag.moved ? cellAt(e.clientX, e.clientY) : null;
  endDrag();
  if (target !== null) play(target);
  else render(); // dropped outside the board: the mark goes back
});

window.addEventListener("pointercancel", () => {
  pressedCell = null;
  if (!drag) return;
  endDrag();
  render();
});

document.getElementById("reset").addEventListener("click", newGame);

buildBoard();
newGame();

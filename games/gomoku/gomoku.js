// Gomoku — two players on the same device (1v1)
// 15x15 intersections. Black moves first. Five or more in a row wins.
// board[r][c] is null, "b" or "w".

const N = 15;
const NAME = { b: "Black", w: "White" };
const DIRS = [[0, 1], [1, 0], [1, 1], [1, -1]];
const STARS = [[3, 3], [3, 11], [7, 7], [11, 3], [11, 11]];

// Grid lines and star points, drawn once (viewBox units = cells)
const LINES_SVG = (() => {
  let d = "";
  for (let i = 0; i < N; i++) {
    d += `M0.5 ${i + 0.5}H${N - 0.5}M${i + 0.5} 0.5V${N - 0.5}`;
  }
  const stars = STARS.map(([r, c]) => `<circle cx="${c + 0.5}" cy="${r + 0.5}" r="0.1"/>`).join("");
  return `<svg class="lines" viewBox="0 0 ${N} ${N}" aria-hidden="true"><path fill="none" d="${d}"/>${stars}</svg>`;
})();
const DRAG_THRESHOLD = 5; // px before a press becomes a drag

const boardEl = document.getElementById("board");
const statusEl = document.getElementById("status");
const nextEl = document.getElementById("next");
const nextSlot = document.getElementById("nextSlot");
const nextText = document.getElementById("nextText");
const undoBtn = document.getElementById("undo");

let board, turn, history, winLine, over;
let hover = null; // [r, c] under the mouse (preview stone)
let drag = null;  // { x, y, moved, ghost, target }

const other = (s) => (s === "b" ? "w" : "b");
const inside = (r, c) => r >= 0 && r < N && c >= 0 && c < N;
const stoneHTML = (s, cls = "") => `<div class="stone ${s} ${cls}"></div>`;

function newGame() {
  board = Array.from({ length: N }, () => Array(N).fill(null));
  turn = "b";
  history = [];
  winLine = null;
  over = false;
  hover = null;
  render();
}

// All stones of the winning line(s) through (r, c), or null.
function findWin(r, c) {
  const s = board[r][c];
  const cells = [];
  for (const [dr, dc] of DIRS) {
    const line = [[r, c]];
    for (const sign of [1, -1]) {
      let rr = r + dr * sign, cc = c + dc * sign;
      while (inside(rr, cc) && board[rr][cc] === s) {
        line.push([rr, cc]);
        rr += dr * sign; cc += dc * sign;
      }
    }
    if (line.length >= 5) cells.push(...line);
  }
  return cells.length ? cells : null;
}

function place(r, c) {
  if (over || board[r][c]) return false;
  board[r][c] = turn;
  history.push([r, c]);
  winLine = findWin(r, c);
  if (winLine) {
    over = true;
    Sound.win();
    render();
    return true;
  }
  if (history.length === N * N) {
    over = true;
    Sound.draw();
    render();
    return true;
  }
  Sound.move();
  turn = other(turn);
  render();
  return true;
}

function undo() {
  if (!history.length) return;
  const [r, c] = history.pop();
  board[r][c] = null;
  if (!over) turn = other(turn);
  over = false;
  winLine = null;
  render();
}

// ---------- Drawing ----------

function render() {
  const last = history[history.length - 1];
  const wins = new Set((winLine || []).map(String));
  const target = drag && drag.moved ? drag.target : null;
  boardEl.innerHTML = LINES_SVG;

  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const pt = document.createElement("div");
      let cls = "pt";
      if (target && target[0] === r && target[1] === c) cls += " hover";
      pt.className = cls;

      const s = board[r][c];
      if (s) {
        let extra = "";
        if (last && last[0] === r && last[1] === c) extra += " last";
        if (wins.has(r + "," + c)) extra += " win";
        pt.innerHTML = stoneHTML(s, extra);
      } else if (!over && !drag && hover && hover[0] === r && hover[1] === c) {
        pt.innerHTML = stoneHTML(turn, "preview");
      }
      boardEl.appendChild(pt);
    }
  }

  // Next stone indicator and status
  // When the game is over the row shows the result instead (no dialog, so the winning line stays visible)
  const lifted = drag && drag.moved ? "lifted" : "";
  nextSlot.innerHTML = over && !winLine ? "" : stoneHTML(turn, lifted);
  nextEl.classList.toggle("off", over);
  boardEl.classList.toggle("over", over);
  if (!over) nextText.textContent = "Next stone";
  else nextText.textContent = winLine ? `${NAME[turn]} wins with five in a row` : "Draw: the board is full";

  if (over) {
    statusEl.textContent = winLine ? `${NAME[turn]} wins` : "Draw";
  } else {
    statusEl.innerHTML = `<span class="dot ${turn}"></span>${NAME[turn]} to move`;
  }
  undoBtn.disabled = history.length === 0;
}

// ---------- Input ----------

function pointAt(x, y) {
  const rect = boardEl.getBoundingClientRect();
  if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) return null;
  const size = rect.width / N;
  return [Math.floor((y - rect.top) / size), Math.floor((x - rect.left) / size)];
}

const same = (a, b) => String(a) === String(b);

// Click / tap a point to place a stone
boardEl.addEventListener("pointerdown", (e) => {
  if (over || e.button > 0) return;
  const p = pointAt(e.clientX, e.clientY);
  if (p) {
    hover = e.pointerType === "mouse" ? p : null;
    place(p[0], p[1]);
  }
});

boardEl.addEventListener("pointermove", (e) => {
  if (drag || e.pointerType !== "mouse") return;
  const p = pointAt(e.clientX, e.clientY);
  if (!same(p, hover)) {
    hover = p;
    render();
  }
});

boardEl.addEventListener("pointerleave", () => {
  if (hover) {
    hover = null;
    render();
  }
});

// Drag the next stone onto a point
nextSlot.addEventListener("pointerdown", (e) => {
  if (over || e.button > 0) return;
  e.preventDefault();
  drag = { x: e.clientX, y: e.clientY, moved: false, ghost: null, target: null };
});

window.addEventListener("pointermove", (e) => {
  if (!drag) return;
  if (!drag.moved) {
    if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < DRAG_THRESHOLD) return;
    drag.moved = true;
    hover = null;
    const size = boardEl.getBoundingClientRect().width / N;
    drag.ghost = document.createElement("div");
    drag.ghost.className = "drag-ghost";
    drag.ghost.style.width = drag.ghost.style.height = size * 0.86 + "px";
    drag.ghost.innerHTML = stoneHTML(turn);
    document.body.appendChild(drag.ghost);
    document.body.classList.add("dragging");
    render();
  }
  const half = drag.ghost.offsetWidth / 2;
  drag.ghost.style.transform = `translate(${e.clientX - half}px, ${e.clientY - half}px)`;

  let p = pointAt(e.clientX, e.clientY);
  if (p && board[p[0]][p[1]]) p = null;
  if (!same(p, drag.target)) {
    drag.target = p;
    render();
  }
});

function endDrag(drop, e) {
  if (!drag) return;
  const d = drag;
  drag = null;
  if (d.ghost) d.ghost.remove();
  document.body.classList.remove("dragging");
  if (drop && d.moved) {
    const p = pointAt(e.clientX, e.clientY);
    if (p && place(p[0], p[1])) return;
  }
  render();
}

window.addEventListener("pointerup", (e) => endDrag(true, e));
window.addEventListener("pointercancel", () => endDrag(false));

document.getElementById("undo").addEventListener("click", undo);
document.getElementById("reset").addEventListener("click", newGame);

newGame();

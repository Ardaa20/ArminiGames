// Turkish Draughts (Türk Daması) — two players on the same device
// Board: board[r][c], r=0 is the top row. White starts on rows 5-6 and moves up, black on rows 1-2 and moves down.
// Pieces are strings: first letter is color (w/b), second is type (m = man, k = king).
//
// Rules: men move one square forward or sideways; kings move like a rook.
// Captures are orthogonal jumps, mandatory, and the sequence taking the most pieces must be played.
// Captured pieces leave the board immediately, and a capturing piece may not turn back 180 degrees.
// A man ending its move on the far row becomes a king.

const NAME = { w: "White", b: "Black" };
const FORWARD = { w: -1, b: 1 };
const LAST_ROW = { w: 0, b: 7 };
const ORTH = [[1, 0], [-1, 0], [0, 1], [0, -1]];

const inside = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;
const other = (col) => (col === "w" ? "b" : "w");

function startState() {
  const board = Array.from({ length: 8 }, () => Array(8).fill(null));
  for (let c = 0; c < 8; c++) {
    board[1][c] = board[2][c] = "bm";
    board[5][c] = board[6][c] = "wm";
  }
  return {
    board,
    turn: "w",
    last: [],                    // squares of the last (or current) move path
    captured: { w: [], b: [] },  // captured.w = pieces taken by white
  };
}

// ---------- Rules ----------

function directions(p) {
  return p[1] === "k" ? ORTH : [[FORWARD[p[0]], 0], [0, 1], [0, -1]];
}

// All capture sequences for piece p standing on (r, c). The piece itself must already be lifted off the board.
// Each sequence is a list of steps { r, c, cap: [r, c] }.
function captureSequences(b, r, c, p, lastDir) {
  const out = [];
  for (const [dr, dc] of directions(p)) {
    if (lastDir && dr === -lastDir[0] && dc === -lastDir[1]) continue; // no 180-degree turn
    let er = r + dr, ec = c + dc;
    if (p[1] === "k") while (inside(er, ec) && !b[er][ec]) { er += dr; ec += dc; }
    if (!inside(er, ec) || !b[er][ec] || b[er][ec][0] === p[0]) continue;

    let lr = er + dr, lc = ec + dc;
    while (inside(lr, lc) && !b[lr][lc]) {
      const taken = b[er][ec];
      b[er][ec] = null;
      const step = { r: lr, c: lc, cap: [er, ec] };
      const rest = captureSequences(b, lr, lc, p, [dr, dc]);
      b[er][ec] = taken;
      if (!rest.length) out.push([step]);
      else for (const seq of rest) out.push([step, ...seq]);
      if (p[1] !== "k") break; // a man lands right behind the captured piece
      lr += dr; lc += dc;
    }
  }
  return out;
}

// Every legal move for the side to move: { fr, fc, steps: [{ r, c, cap }] }.
function legalMoves(s) {
  const b = s.board.map((row) => row.slice());
  const captures = [], quiet = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = b[r][c];
      if (!p || p[0] !== s.turn) continue;
      b[r][c] = null;
      for (const steps of captureSequences(b, r, c, p, null)) captures.push({ fr: r, fc: c, steps });
      b[r][c] = p;
      for (const [dr, dc] of directions(p)) {
        let tr = r + dr, tc = c + dc;
        while (inside(tr, tc) && !b[tr][tc]) {
          quiet.push({ fr: r, fc: c, steps: [{ r: tr, c: tc, cap: null }] });
          if (p[1] !== "k") break;
          tr += dr; tc += dc;
        }
      }
    }
  }
  if (!captures.length) return quiet;
  const most = Math.max(...captures.map((m) => m.steps.length));
  return captures.filter((m) => m.steps.length === most);
}

function countPieces(s, col) {
  return s.board.flat().filter((p) => p && p[0] === col);
}

// ---------- UI ----------

const boardEl = document.getElementById("board");
const statusEl = document.getElementById("status");
const takenTop = document.getElementById("takenTop");
const takenBottom = document.getElementById("takenBottom");
const endOverlay = document.getElementById("endOverlay");

let state, history, moves, path, selected, targets, over;
let drag = null; // { r, c, x, y, moved, wasSelected, ghost, hover }

const DRAG_THRESHOLD = 5; // px before a press becomes a drag

function newGame() {
  state = startState();
  history = [];
  over = false;
  endOverlay.hidden = true;
  startTurn();
  render();
}

function startTurn() {
  moves = legalMoves(state);
  path = [];      // steps already played in a multi-capture
  selected = null;
  targets = [];
}

// Moves still possible for the piece on (r, c) given the steps already played
function movesFor(r, c) {
  if (path.length) return moves.filter((m) => path.every((st, i) => m.steps[i].r === st.r && m.steps[i].c === st.c));
  return moves.filter((m) => m.fr === r && m.fc === c);
}

function select(r, c) {
  selected = [r, c];
  const seen = new Set();
  targets = [];
  for (const m of movesFor(r, c)) {
    const st = m.steps[path.length];
    const key = st.r + "," + st.c;
    if (!seen.has(key)) { seen.add(key); targets.push(st); }
  }
}

function clearSelection() {
  if (path.length) return; // a capture sequence in progress keeps its piece selected
  selected = null;
  targets = [];
}

function render() {
  const at = (sq, r, c) => sq && sq[0] === r && sq[1] === c;
  const lifted = drag && drag.moved ? [drag.r, drag.c] : null;
  const hover = drag && drag.moved ? drag.hover : null;
  const movable = new Set();
  if (!over) {
    if (path.length) movable.add(String(selected));
    else for (const m of moves) movable.add(m.fr + "," + m.fc);
  }
  boardEl.innerHTML = "";

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const sq = document.createElement("div");
      const p = state.board[r][c];
      const cls = ["sq", (r + c) % 2 ? "dark" : "light"];
      if (state.last.some((l) => l[0] === r && l[1] === c)) cls.push("last");
      if (at(selected, r, c)) cls.push("sel");
      if (p && movable.has(r + "," + c)) cls.push("own");
      const t = targets.find((st) => st.r === r && st.c === c);
      if (t) cls.push("target");
      if (t && at(hover, r, c)) cls.push("hover");
      sq.className = cls.join(" ");
      sq.innerHTML = p ? pieceSVG(p, at(lifted, r, c) ? "lifted" : "") : "";
      boardEl.appendChild(sq);
    }
  }

  takenTop.innerHTML = state.captured.b.map((p) => pieceSVG(p)).join("");
  takenBottom.innerHTML = state.captured.w.map((p) => pieceSVG(p)).join("");

  if (!over) {
    const dot = `<span class="dot ${state.turn}"></span>`;
    const mustCapture = moves.length && moves[0].steps[0].cap;
    statusEl.innerHTML = dot + `<span class="who">${NAME[state.turn]} </span>${mustCapture ? "must capture" : "to move"}`;
  }
  document.getElementById("undo").disabled = history.length === 0;
}

function squareAt(x, y) {
  const rect = boardEl.getBoundingClientRect();
  const size = rect.width / 8;
  const c = Math.floor((x - rect.left) / size);
  const r = Math.floor((y - rect.top) / size);
  return inside(r, c) ? [r, c] : null;
}

// Click and drag share one flow: press picks a piece (or plays a target),
// moving past the threshold starts a drag, release drops it.
function onPointerDown(e) {
  if (over || e.button > 0) return;
  const sq = squareAt(e.clientX, e.clientY);
  if (!sq) return;
  const [r, c] = sq;

  const step = selected && targets.find((st) => st.r === r && st.c === c);
  if (step) return playStep(step);

  const p = state.board[r][c];
  const mine = p && p[0] === state.turn && (!path.length || (r === selected[0] && c === selected[1]));
  if (!mine) {
    clearSelection();
    return render();
  }

  const wasSelected = !!selected && selected[0] === r && selected[1] === c;
  select(r, c);
  drag = { r, c, x: e.clientX, y: e.clientY, moved: false, wasSelected, ghost: null, hover: null };
  render();
}

function onPointerMove(e) {
  if (!drag) return;
  if (!drag.moved) {
    if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < DRAG_THRESHOLD) return;
    drag.moved = true;
    const size = boardEl.getBoundingClientRect().width / 8;
    drag.ghost = document.createElement("div");
    drag.ghost.className = "drag-ghost";
    drag.ghost.style.width = drag.ghost.style.height = size + "px";
    drag.ghost.innerHTML = pieceSVG(state.board[drag.r][drag.c]);
    document.body.appendChild(drag.ghost);
    document.body.classList.add("dragging");
  }
  const half = drag.ghost.offsetWidth / 2;
  drag.ghost.style.transform = `translate(${e.clientX - half}px, ${e.clientY - half}px)`;

  const sq = squareAt(e.clientX, e.clientY);
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

  if (d.moved) {
    const sq = squareAt(e.clientX, e.clientY);
    const step = sq && targets.find((st) => st.r === sq[0] && st.c === sq[1]);
    if (step) return playStep(step);
    // dropped elsewhere: piece snaps back and stays selected
  } else if (d.wasSelected) {
    clearSelection(); // second click on the same piece deselects it
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

// Play one step (a single move, or one jump of a capture sequence).
function playStep(step) {
  const [fr, fc] = selected;
  if (!path.length) {
    history.push(JSON.parse(JSON.stringify(state)));
    state.last = [[fr, fc]];
  }
  const b = state.board, p = b[fr][fc];
  b[step.r][step.c] = p;
  b[fr][fc] = null;
  if (step.cap) {
    state.captured[p[0]].push(b[step.cap[0]][step.cap[1]]);
    b[step.cap[0]][step.cap[1]] = null; // captured pieces leave the board at once
  }
  state.last.push([step.r, step.c]);
  path.push(step);

  const total = movesFor(step.r, step.c)[0].steps.length;
  if (path.length < total) {
    Sound.capture();
    select(step.r, step.c); // keep jumping with the same piece
    return render();
  }

  if (p[1] === "m" && step.r === LAST_ROW[p[0]]) b[step.r][step.c] = p[0] + "k";
  if (step.cap) Sound.capture();
  else Sound.move();
  state.turn = other(state.turn);
  startTurn();
  render();
  checkEnd();
}

function checkEnd() {
  let title = null, text = "", won = true;
  const mine = countPieces(state, state.turn), theirs = countPieces(state, other(state.turn));
  if (!mine.length) {
    title = `${NAME[other(state.turn)]} wins`;
    text = `${NAME[state.turn]} has no pieces left.`;
  } else if (!moves.length) {
    title = `${NAME[other(state.turn)]} wins`;
    text = `${NAME[state.turn]} has no legal moves.`;
  } else if (mine.length === 1 && theirs.length === 1 && mine[0][1] === "k" && theirs[0][1] === "k") {
    title = "Draw";
    text = "One king each — neither side can win.";
    won = false;
  }
  if (!title) return;

  over = true;
  if (won) Sound.win();
  else Sound.draw();
  statusEl.textContent = title;
  document.getElementById("endTitle").textContent = title;
  document.getElementById("endText").textContent = text;
  endOverlay.hidden = false;
  render();
}

function undo() {
  if (!history.length) return;
  state = history.pop();
  over = false;
  endOverlay.hidden = true;
  startTurn();
  render();
}

document.getElementById("undo").addEventListener("click", undo);
document.getElementById("reset").addEventListener("click", newGame);
document.getElementById("endUndo").addEventListener("click", undo);
document.getElementById("endReset").addEventListener("click", newGame);

newGame();

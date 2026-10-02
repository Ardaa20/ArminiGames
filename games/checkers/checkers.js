// Checkers — two players on the same device (1v1)
// Board: board[r][c], r=0 is the top row. Black starts on top and moves down,
// White starts at the bottom and moves up. Black moves first.
// Pieces are strings: color (w/b) + type (m = man, k = king), e.g. "wm", "bk".
// Captures are mandatory; a capturing piece keeps jumping while it can.
// A man that reaches the far row becomes a king and its turn ends.

const NAME = { w: "White", b: "Black" };
const DIAG = [[1, 1], [1, -1], [-1, 1], [-1, -1]];

const inside = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;
const other = (col) => (col === "w" ? "b" : "w");

function startState() {
  const board = Array.from({ length: 8 }, () => Array(8).fill(null));
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++) {
      if ((r + c) % 2 === 0) continue;
      if (r < 3) board[r][c] = "bm";
      if (r > 4) board[r][c] = "wm";
    }
  return {
    board,
    turn: "b",
    chain: null,    // [r, c] of the piece that must keep jumping, or null
    last: null,     // last step
    captured: { w: [], b: [] }, // captured.w = pieces taken by white
  };
}

// ---------- Rules ----------

function dirsOf(p) {
  if (p[1] === "k") return DIAG;
  return p[0] === "w" ? DIAG.filter(([dr]) => dr < 0) : DIAG.filter(([dr]) => dr > 0);
}

function jumpsFrom(b, r, c) {
  const p = b[r][c], out = [];
  for (const [dr, dc] of dirsOf(p)) {
    const mr = r + dr, mc = c + dc, tr = r + 2 * dr, tc = c + 2 * dc;
    if (!inside(tr, tc) || b[tr][tc]) continue;
    const mid = b[mr][mc];
    if (mid && mid[0] !== p[0]) out.push({ fr: r, fc: c, tr, tc, cr: mr, cc: mc });
  }
  return out;
}

function stepsFrom(b, r, c) {
  const out = [];
  for (const [dr, dc] of dirsOf(b[r][c])) {
    const tr = r + dr, tc = c + dc;
    if (inside(tr, tc) && !b[tr][tc]) out.push({ fr: r, fc: c, tr, tc });
  }
  return out;
}

// True when the side to move has at least one capture somewhere.
function mustCapture(s) {
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++) {
      const p = s.board[r][c];
      if (p && p[0] === s.turn && jumpsFrom(s.board, r, c).length) return true;
    }
  return false;
}

function legalMoves(s, r, c) {
  const p = s.board[r][c];
  if (!p || p[0] !== s.turn) return [];
  if (s.chain) return s.chain[0] === r && s.chain[1] === c ? jumpsFrom(s.board, r, c) : [];
  if (mustCapture(s)) return jumpsFrom(s.board, r, c);
  return stepsFrom(s.board, r, c);
}

function hasAnyMove(s) {
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++)
      if (legalMoves(s, r, c).length) return true;
  return false;
}

function applyMove(s, m) {
  const n = JSON.parse(JSON.stringify(s));
  const b = n.board, me = n.turn;
  let p = b[m.fr][m.fc];
  b[m.fr][m.fc] = null;

  if (m.cr !== undefined) {
    n.captured[me].push(b[m.cr][m.cc]);
    b[m.cr][m.cc] = null;
  }

  const crowned = p[1] === "m" && (m.tr === (me === "w" ? 0 : 7));
  if (crowned) p = me + "k";
  b[m.tr][m.tc] = p;
  n.last = m;

  if (m.cr !== undefined && !crowned && jumpsFrom(b, m.tr, m.tc).length) {
    n.chain = [m.tr, m.tc]; // same player keeps jumping
  } else {
    n.chain = null;
    n.turn = other(me);
  }
  return n;
}

// ---------- UI ----------

const boardEl = document.getElementById("board");
const statusEl = document.getElementById("status");
const takenTop = document.getElementById("takenTop");
const takenBottom = document.getElementById("takenBottom");
const endOverlay = document.getElementById("endOverlay");

let state, history, selected, targets, over;
let drag = null; // { r, c, x, y, moved, wasSelected, ghost, hover }

const DRAG_THRESHOLD = 5; // px before a press becomes a drag

function newGame() {
  state = startState();
  history = [];
  selected = null;
  targets = [];
  over = false;
  endOverlay.hidden = true;
  render();
}

function render() {
  const L = state.last;
  const at = (sq, r, c) => sq && sq[0] === r && sq[1] === c;
  const lifted = drag && drag.moved ? [drag.r, drag.c] : null;
  const hover = drag && drag.moved ? drag.hover : null;
  boardEl.innerHTML = "";

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const sq = document.createElement("div");
      const p = state.board[r][c];
      const cls = ["sq", (r + c) % 2 ? "dark" : "light"];
      if (L && ((L.fr === r && L.fc === c) || (L.tr === r && L.tc === c))) cls.push("last");
      if (at(selected, r, c)) cls.push("sel");
      if (!over && legalMoves(state, r, c).length) cls.push("own");
      const t = targets.find((m) => m.tr === r && m.tc === c);
      if (t) cls.push("target");
      if (t && t.cr !== undefined) cls.push("capture");
      if (t && at(hover, r, c)) cls.push("hover");
      sq.className = cls.join(" ");
      sq.innerHTML = p ? pieceSVG(p, at(lifted, r, c) ? "lifted" : "") : "";
      boardEl.appendChild(sq);
    }
  }

  // Top bar: pieces Black has taken (white ones); bottom bar: pieces White has taken.
  takenTop.innerHTML = state.captured.b.map((p) => pieceSVG(p)).join("");
  takenBottom.innerHTML = state.captured.w.map((p) => pieceSVG(p)).join("");

  if (!over) {
    const dot = `<span class="dot ${state.turn}"></span>`;
    const note = state.chain ? ": keep jumping" : mustCapture(state) ? ": must capture" : " to move";
    statusEl.innerHTML = dot + NAME[state.turn] + note;
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

function select(r, c) {
  selected = [r, c];
  targets = legalMoves(state, r, c);
}

function clearSelection() {
  // During a multi-jump the jumping piece stays selected
  if (state.chain) return select(state.chain[0], state.chain[1]);
  selected = null;
  targets = [];
}

// Click and drag share one flow: press picks a piece (or plays a target),
// moving past the threshold starts a drag, release drops it.
function onPointerDown(e) {
  if (over || e.button > 0) return;
  const sq = squareAt(e.clientX, e.clientY);
  if (!sq) return;
  const [r, c] = sq;

  const move = selected && targets.find((m) => m.tr === r && m.tc === c);
  if (move) return commit(move);

  if (!legalMoves(state, r, c).length) {
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
    const move = sq && targets.find((m) => m.tr === sq[0] && m.tc === sq[1]);
    if (move) return commit(move);
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

function commit(m) {
  // Undo goes back to the start of the turn, so a multi-jump is undone as a whole
  if (!state.chain) history.push(state);
  state = applyMove(state, m);
  if (m.cr !== undefined) Sound.capture();
  else Sound.move();
  selected = null;
  targets = [];
  if (state.chain) select(state.chain[0], state.chain[1]);
  render();
  checkEnd();
}

function checkEnd() {
  if (state.chain || hasAnyMove(state)) return;
  const loser = state.turn;
  const noPieces = !state.board.flat().some((p) => p && p[0] === loser);
  const title = `${NAME[other(loser)]} wins`;
  const text = noPieces ? `${NAME[loser]} has no pieces left.` : `${NAME[loser]} has no legal moves.`;

  over = true;
  Sound.win();
  statusEl.textContent = title;
  document.getElementById("endTitle").textContent = title;
  document.getElementById("endText").textContent = text;
  endOverlay.hidden = false;
  render();
}

function undo() {
  if (!history.length) return;
  state = history.pop();
  selected = null;
  targets = [];
  over = false;
  endOverlay.hidden = true;
  render();
}

document.getElementById("undo").addEventListener("click", undo);
document.getElementById("reset").addEventListener("click", newGame);
document.getElementById("endUndo").addEventListener("click", undo);
document.getElementById("endReset").addEventListener("click", newGame);

newGame();

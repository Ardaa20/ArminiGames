// Nine Men's Morris — two players on the same device (1v1)
// 24 points on three concentric squares. Point index = ring * 8 + i, ring 0 is the
// outer square; i goes clockwise from the top-left corner (even i = corner, odd i = midpoint).
// Phase 1: place 9 pieces each. Phase 2: move along a line to an adjacent empty point.
// Phase 3: with exactly 3 pieces a player may fly to any empty point.
// A mill (3 in a row on a line) removes one opponent piece, not from a mill unless
// every opponent piece is in a mill. Fewer than 3 pieces or no legal move loses.
// White moves first.

const NAME = { w: "White", b: "Black" };
const other = (col) => (col === "w" ? "b" : "w");

// Grid position (0..6) of each point
const RING_OFFSETS = [[0, 0], [1, 0], [2, 0], [2, 1], [2, 2], [1, 2], [0, 2], [0, 1]];
const POS = [];
for (let ring = 0; ring < 3; ring++) {
  const step = 3 - ring;
  for (const [x, y] of RING_OFFSETS) POS.push([ring + x * step, ring + y * step]);
}

const ADJ = Array.from({ length: 24 }, () => []);
const MILLS = [];
function link(a, b) { ADJ[a].push(b); ADJ[b].push(a); }
for (let ring = 0; ring < 3; ring++) {
  for (let i = 0; i < 8; i++) {
    const p = ring * 8 + i;
    link(p, ring * 8 + ((i + 1) % 8));
    if (i % 2 === 1 && ring < 2) link(p, p + 8);
    if (i % 2 === 0) MILLS.push([p, ring * 8 + i + 1, ring * 8 + ((i + 2) % 8)]);
  }
}
for (const i of [1, 3, 5, 7]) MILLS.push([i, 8 + i, 16 + i]);

function startState() {
  return {
    board: Array(24).fill(null),
    turn: "w",
    toPlace: { w: 9, b: 9 },
    removing: false, // the side to move formed a mill and must remove a piece
    last: null,      // { from, to } of the last placement / move
  };
}

// ---------- Rules ----------

const countOn = (s, col) => s.board.filter((p) => p === col).length;
const total = (s, col) => countOn(s, col) + s.toPlace[col];
const placing = (s) => s.toPlace[s.turn] > 0;
const flying = (s) => !placing(s) && countOn(s, s.turn) === 3;

function inMill(b, p) {
  const col = b[p];
  return !!col && MILLS.some((m) => m.includes(p) && m.every((q) => b[q] === col));
}

function removable(s) {
  const opp = other(s.turn);
  const theirs = [];
  for (let p = 0; p < 24; p++) if (s.board[p] === opp) theirs.push(p);
  const free = theirs.filter((p) => !inMill(s.board, p));
  return free.length ? free : theirs;
}

function targetsFrom(s, p) {
  if (s.removing || placing(s) || s.board[p] !== s.turn) return [];
  const pool = flying(s) ? [...Array(24).keys()] : ADJ[p];
  return pool.filter((q) => !s.board[q]);
}

function hasAnyMove(s) {
  if (placing(s)) return s.board.some((p) => !p);
  for (let p = 0; p < 24; p++) if (targetsFrom(s, p).length) return true;
  return false;
}

// Places (from = null) or moves a piece to "to"; may start a removal.
function applyMove(s, from, to) {
  const n = JSON.parse(JSON.stringify(s));
  const me = n.turn;
  if (from === null) n.toPlace[me]--;
  else n.board[from] = null;
  n.board[to] = me;
  n.last = { from, to };
  if (inMill(n.board, to) && countOn(n, other(me)) > 0) n.removing = true;
  else n.turn = other(me);
  return n;
}

function applyRemove(s, p) {
  const n = JSON.parse(JSON.stringify(s));
  n.board[p] = null;
  n.removing = false;
  n.turn = other(n.turn);
  return n;
}

// ---------- UI ----------

const boardEl = document.getElementById("board");
const statusEl = document.getElementById("status");
const reserveEl = { w: document.getElementById("reserveW"), b: document.getElementById("reserveB") };
const endOverlay = document.getElementById("endOverlay");

let state, history, selected, targets, over;
let drag = null; // { from (point or null = reserve), x, y, moved, wasSelected, ghost, hover }

const DRAG_THRESHOLD = 5; // px before a press becomes a drag

function pieceSVG(col, extraClass = "") {
  return `<svg class="piece ${col} ${extraClass}" viewBox="0 0 100 100" aria-hidden="true">` +
    `<circle cx="50" cy="50" r="40"/><circle class="d" cx="50" cy="50" r="26"/></svg>`;
}

// Board lines: drawn once (viewBox 700 = 7 cells of 100)
function linesSVG() {
  const c = (v) => 50 + v * 100;
  let d = "";
  for (let ring = 0; ring < 3; ring++) {
    const a = c(ring), b = c(6 - ring);
    d += `M${a} ${a} H${b} V${b} H${a} Z `;
  }
  d += `M350 50 V250 M350 450 V650 M50 350 H250 M450 350 H650`;
  const dots = POS.map(([x, y]) => `<circle cx="${c(x)}" cy="${c(y)}" r="9"/>`).join("");
  return `<svg class="lines" viewBox="0 0 700 700" aria-hidden="true"><path d="${d}"/>${dots}</svg>`;
}

const pointEls = [];
function buildBoard() {
  boardEl.innerHTML = linesSVG();
  for (let p = 0; p < 24; p++) {
    const el = document.createElement("div");
    el.className = "pt";
    el.style.left = `${((POS[p][0] + 0.5) / 7) * 100}%`;
    el.style.top = `${((POS[p][1] + 0.5) / 7) * 100}%`;
    boardEl.appendChild(el);
    pointEls.push(el);
  }
}

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
  const dragging = drag && drag.moved;
  const lifted = dragging ? drag.from : null;
  const hover = dragging ? drag.hover : null;
  const canRemove = !over && state.removing ? removable(state) : [];
  const canPlace = !over && !state.removing && placing(state);

  for (let p = 0; p < 24; p++) {
    const col = state.board[p];
    const cls = ["pt"];
    if (L && (L.from === p || L.to === p)) cls.push("last");
    if (selected === p) cls.push("sel");
    if (!over && targetsFrom(state, p).length) cls.push("own");
    if (canPlace && !col) cls.push("place");
    if (targets.includes(p)) cls.push("target");
    if (canRemove.includes(p)) cls.push("removable");
    if (hover === p && (targets.includes(p) || (canPlace && !col))) cls.push("hover");
    pointEls[p].className = cls.join(" ");
    pointEls[p].innerHTML = col ? pieceSVG(col, lifted === p && col ? "lifted" : "") : "";
  }

  for (const col of ["w", "b"]) {
    const n = state.toPlace[col];
    const active = canPlace && state.turn === col;
    const stack = Array.from({ length: n }, (_, i) =>
      pieceSVG(col, active && dragging && lifted === null && i === n - 1 ? "lifted" : "")).join("");
    const label = n ? `${n} to place` : "";
    reserveEl[col].className = `reserve ${active ? "active" : "idle"}`;
    reserveEl[col].innerHTML = `<div class="stack">${stack}</div><span class="score count">${label}</span>`;
  }

  if (!over) {
    const dot = `<span class="dot ${state.turn}"></span>`;
    const name = NAME[state.turn];
    let note;
    if (state.removing) note = ": remove a piece";
    else if (placing(state)) note = " to place";
    else if (flying(state)) note = " to move (flying)";
    else note = " to move";
    statusEl.innerHTML = dot + name + note;
  }
  document.getElementById("undo").disabled = history.length === 0;
}

// Nearest point within half a cell of (x, y), or null
function pointAt(x, y) {
  const rect = boardEl.getBoundingClientRect();
  const cell = rect.width / 7;
  const gx = (x - rect.left) / cell - 0.5;
  const gy = (y - rect.top) / cell - 0.5;
  for (let p = 0; p < 24; p++) {
    if (Math.hypot(gx - POS[p][0], gy - POS[p][1]) < 0.5) return p;
  }
  return null;
}

function clearSelection() {
  selected = null;
  targets = [];
}

function startDrag(from, e, wasSelected) {
  drag = { from, x: e.clientX, y: e.clientY, moved: false, wasSelected, ghost: null, hover: null };
}

// Click and drag share one flow: press picks a piece (or plays a point),
// moving past the threshold starts a drag, release drops it.
function onBoardDown(e) {
  if (over || e.button > 0) return;
  const p = pointAt(e.clientX, e.clientY);
  if (p === null) {
    clearSelection();
    return render();
  }

  if (state.removing) {
    if (removable(state).includes(p)) commitRemove(p);
    return;
  }
  if (placing(state)) {
    if (!state.board[p]) commitMove(null, p);
    return;
  }
  if (selected !== null && targets.includes(p)) return commitMove(selected, p);

  if (!targetsFrom(state, p).length) {
    clearSelection();
    return render();
  }
  const wasSelected = selected === p;
  selected = p;
  targets = targetsFrom(state, p);
  startDrag(p, e, wasSelected);
  render();
}

function onReserveDown(col, e) {
  if (over || e.button > 0 || state.removing || state.turn !== col || !placing(state)) return;
  if (!e.target.closest(".stack")) return;
  clearSelection();
  startDrag(null, e, false);
  render();
}

function onPointerMove(e) {
  if (!drag) return;
  if (!drag.moved) {
    if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < DRAG_THRESHOLD) return;
    drag.moved = true;
    const size = boardEl.getBoundingClientRect().width / 7 * 0.78;
    drag.ghost = document.createElement("div");
    drag.ghost.className = "drag-ghost";
    drag.ghost.style.width = drag.ghost.style.height = size + "px";
    drag.ghost.innerHTML = pieceSVG(state.turn);
    document.body.appendChild(drag.ghost);
    document.body.classList.add("dragging");
  }
  const half = drag.ghost.offsetWidth / 2;
  drag.ghost.style.transform = `translate(${e.clientX - half}px, ${e.clientY - half}px)`;

  const p = pointAt(e.clientX, e.clientY);
  if (p !== drag.hover) {
    drag.hover = p;
    render();
  }
}

function endDrag() {
  const d = drag;
  drag = null;
  if (d.ghost) d.ghost.remove();
  document.body.classList.remove("dragging");
  return d;
}

function onPointerUp(e) {
  if (!drag) return;
  const d = endDrag();

  if (d.moved) {
    const p = pointAt(e.clientX, e.clientY);
    if (p !== null) {
      if (d.from === null && !state.board[p]) return commitMove(null, p);
      if (d.from !== null && targets.includes(p)) return commitMove(d.from, p);
    }
    // dropped elsewhere: the piece snaps back (a board piece stays selected)
  } else if (d.wasSelected) {
    clearSelection(); // second click on the same piece deselects it
  }
  render();
}

function onPointerCancel() {
  if (!drag) return;
  endDrag();
  render();
}

boardEl.addEventListener("pointerdown", onBoardDown);
reserveEl.w.addEventListener("pointerdown", (e) => onReserveDown("w", e));
reserveEl.b.addEventListener("pointerdown", (e) => onReserveDown("b", e));
window.addEventListener("pointermove", onPointerMove);
window.addEventListener("pointerup", onPointerUp);
window.addEventListener("pointercancel", onPointerCancel);

function commitMove(from, to) {
  // Undo goes back to the start of the turn, so a mill and its removal are undone together
  history.push(state);
  state = applyMove(state, from, to);
  Sound.move();
  clearSelection();
  render();
  checkEnd();
}

function commitRemove(p) {
  state = applyRemove(state, p);
  Sound.capture();
  clearSelection();
  render();
  checkEnd();
}

function checkEnd() {
  if (state.removing) return;
  const loser = state.turn;
  let text = null;
  if (total(state, loser) < 3) text = `${NAME[loser]} has fewer than 3 pieces.`;
  else if (!hasAnyMove(state)) text = `${NAME[loser]} has no legal moves.`;
  if (!text) return;

  const title = `${NAME[other(loser)]} wins`;
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
  if (drag) endDrag();
  state = history.pop();
  clearSelection();
  over = false;
  endOverlay.hidden = true;
  render();
}

document.getElementById("undo").addEventListener("click", undo);
document.getElementById("reset").addEventListener("click", newGame);
document.getElementById("endUndo").addEventListener("click", undo);
document.getElementById("endReset").addEventListener("click", newGame);

buildBoard();
newGame();

// Mangala (Turkish rules) — two players on the same device
// pits[0..5]: Blue's pits (bottom row, left to right), pits[6]: Blue's store (right)
// pits[7..12]: Peach's pits (top row, right to left), pits[13]: Peach's store (left)
// Sowing goes counter-clockwise: increasing index, skipping the opponent's store.

const START = 4;
const STORE = { p1: 6, p2: 13 };
const NAME = { p1: "Blue", p2: "Peach" };
const PIT_CAP = 12;   // stones drawn in a pit (the number shows the real count)
const STORE_CAP = 24; // stones drawn in a store

const boardEl = document.getElementById("board");
const labelsTopEl = document.getElementById("labelsTop");
const labelsBottomEl = document.getElementById("labelsBottom");
const statusEl = document.getElementById("status");
const messageEl = document.getElementById("message");
const undoBtn = document.getElementById("undo");

let pits, turn, history, over, busy;
let moveId = 0; // bumps on every move, undo and reset, so a stale timer is ignored
let holes = [];  // holes[i] -> pit/store element
let counts = []; // counts[i] -> number label
let pressed = null;

const other = (p) => (p === "p1" ? "p2" : "p1");
const owner = (i) => (i <= 6 ? "p1" : "p2");
const isStore = (i) => i === 6 || i === 13;
const sideOf = (p) => (p === "p1" ? [0, 1, 2, 3, 4, 5] : [7, 8, 9, 10, 11, 12]);
const opposite = (i) => 12 - i;
const sideEmpty = (b, p) => sideOf(p).every((i) => b[i] === 0);

// ---------- Rules ----------

function nextHole(i, p) {
  let n = (i + 1) % 14;
  if (n === STORE[other(p)]) n = (n + 1) % 14;
  return n;
}

// Plays pit i for player p on a copy of board b.
// Returns the sowing path, the resulting board and what happened.
function playMove(b, p, i) {
  const board = b.slice();
  let hand = board[i];
  board[i] = 0;
  const path = [];
  let at = hand === 1 ? nextHole(i, p) : i; // the first stone goes back into the picked pit
  while (hand > 0) {
    path.push(at);
    board[at]++;
    hand--;
    if (hand > 0) at = nextHole(at, p);
  }
  const sown = board.slice();
  const last = at;
  const result = { path, sown, board, last, extra: false, captured: [], gain: 0 };

  if (last === STORE[p]) {
    result.extra = true;
  } else if (owner(last) !== p && board[last] % 2 === 0) {
    // Even count in an opponent pit: take them all
    result.gain = board[last];
    result.captured = [last];
    board[STORE[p]] += board[last];
    board[last] = 0;
  } else if (owner(last) === p && board[last] === 1 && board[opposite(last)] > 0) {
    // Landed in an own empty pit: take it and the opposite pit
    const opp = opposite(last);
    result.gain = 1 + board[opp];
    result.captured = [last, opp];
    board[STORE[p]] += result.gain;
    board[last] = 0;
    board[opp] = 0;
  }

  // Game end: the player whose side is empty takes the stones left on the other side
  for (const q of [p, other(p)]) {
    if (sideEmpty(board, q)) {
      let rest = 0;
      for (const j of sideOf(other(q))) { rest += board[j]; board[j] = 0; }
      board[STORE[q]] += rest;
      result.end = { emptied: q, rest };
      break;
    }
  }
  return result;
}

// ---------- Drawing ----------

// Stones in a pit sit on one or two rings so they never overlap
function ring(out, n, r, turn) {
  for (let k = 0; k < n; k++) {
    const a = turn + (k / n) * Math.PI * 2;
    out.push([50 + Math.cos(a) * r, 50 + Math.sin(a) * r]);
  }
}
function pitSpots(n) {
  const out = [];
  if (n === 1) ring(out, 1, 0, 0);
  else if (n <= 6) ring(out, n, 18, -Math.PI / 2);
  else if (n === 7) { ring(out, 1, 0, 0); ring(out, 6, 21, -Math.PI / 2); }
  else { ring(out, 8, 31, -Math.PI / 2); if (n > 8) ring(out, n - 8, n === 9 ? 0 : 12, Math.PI / 4); }
  return out;
}

// Stones in a store fill two columns from the bottom up
const STORE_SPOTS = [];
for (let k = 0; k < STORE_CAP; k++) STORE_SPOTS.push([k % 2 ? 62 : 38, 194 - Math.floor(k / 2) * 16]);

function stonesSVG(n, store) {
  const spots = store ? STORE_SPOTS : pitSpots(Math.min(n, PIT_CAP));
  const shown = Math.min(n, spots.length);
  let s = `<svg viewBox="0 0 100 ${store ? 212 : 100}" aria-hidden="true">`;
  for (let k = 0; k < shown; k++) {
    s += `<circle class="stone" cx="${spots[k][0].toFixed(1)}" cy="${spots[k][1].toFixed(1)}" r="8"/>`;
  }
  return s + "</svg>";
}

function buildBoard() {
  boardEl.innerHTML = "";
  labelsTopEl.innerHTML = "";
  labelsBottomEl.innerHTML = "";
  holes = [];
  counts = [];

  const place = (i, row, col) => {
    const el = document.createElement("div");
    el.className = (isStore(i) ? "store " : "pit ") + owner(i);
    el.style.gridColumn = `${col}`;
    if (!isStore(i)) el.style.gridRow = `${row}`;
    el.dataset.i = i;
    boardEl.appendChild(el);
    holes[i] = el;
  };
  place(13, 1, 1);
  for (let k = 0; k < 6; k++) place(12 - k, 1, k + 2);
  for (let k = 0; k < 6; k++) place(k, 2, k + 2);
  place(6, 1, 8);

  const label = (parent, i) => {
    const el = document.createElement("span");
    el.className = "count";
    if (i !== null) {
      if (isStore(i)) el.classList.add("bank", owner(i));
      counts[i] = el;
    }
    parent.appendChild(el);
  };
  label(labelsTopEl, 13);
  for (let k = 0; k < 6; k++) label(labelsTopEl, 12 - k);
  label(labelsTopEl, null);
  label(labelsBottomEl, null);
  for (let k = 0; k < 6; k++) label(labelsBottomEl, k);
  label(labelsBottomEl, 6);
}

function setHole(i, n) {
  holes[i].innerHTML = stonesSVG(n, isStore(i));
  counts[i].textContent = n;
}

function render() {
  for (let i = 0; i < 14; i++) setHole(i, pits[i]);
  for (let i = 0; i < 14; i++) {
    const el = holes[i];
    if (isStore(i)) continue;
    el.classList.toggle("playable", !over && !busy && owner(i) === turn && pits[i] > 0);
    el.classList.toggle("pressed", pressed === i);
  }
  labelsTopEl.classList.toggle("active", !over && turn === "p2");
  labelsBottomEl.classList.toggle("active", !over && turn === "p1");

  if (over) {
    const a = pits[STORE.p1], b = pits[STORE.p2];
    statusEl.textContent = a === b ? `Draw ${a} : ${b}` : `${NAME[a > b ? "p1" : "p2"]} wins ${Math.max(a, b)} : ${Math.min(a, b)}`;
  } else {
    statusEl.innerHTML = `<span class="dot ${turn}"></span>${NAME[turn]} to move`;
  }
  undoBtn.disabled = history.length === 0 || busy;
}

// ---------- Moves ----------

function play(i) {
  if (over || busy || isStore(i) || owner(i) !== turn || pits[i] === 0) return;
  const p = turn;
  const res = playMove(pits, p, i);
  history.push({ pits: pits.slice(), turn, message: messageEl.textContent });

  busy = true;
  pressed = null;
  messageEl.textContent = "";
  const id = ++moveId;
  const live = pits.slice();
  live[i] = 0;
  holes[i].classList.add("source");
  render();
  setHole(i, 0);

  // Calm stone-by-stone sowing; long sowings go faster so a move stays short
  const n = res.path.length;
  const step = Math.max(70, Math.min(170, 1800 / n));
  let k = 0;
  const sowNext = () => {
    if (id !== moveId) return;
    if (k < n) {
      const at = res.path[k++];
      live[at]++;
      setHole(at, live[at]);
      Sound.move();
      setTimeout(sowNext, step);
    } else {
      setTimeout(() => { if (id === moveId) finishMove(p, i, res); }, 140);
    }
  };
  setTimeout(sowNext, 120);
}

function finishMove(p, i, res) {
  holes[i].classList.remove("source");
  let msg = "";
  if (res.captured.length) {
    Sound.capture();
    res.captured.forEach((j) => holes[j].classList.add("taken"));
    msg = `${NAME[p]} captures ${res.gain}.`;
    const id = moveId;
    setTimeout(() => {
      if (id === moveId) res.captured.forEach((j) => holes[j].classList.remove("taken"));
    }, 450);
  } else if (res.extra && !res.end) {
    msg = `Extra turn for ${NAME[p]}.`;
  }

  pits = res.board;
  busy = false;
  if (res.end) {
    over = true;
    const a = pits[STORE.p1], b = pits[STORE.p2];
    const e = res.end;
    const takes = e.rest > 0 ? `${NAME[e.emptied]} takes the last ${e.rest}. ` : "";
    if (a === b) {
      Sound.draw();
      msg = `${takes}It's a draw.`;
    } else {
      Sound.win();
      msg = `${takes}${NAME[a > b ? "p1" : "p2"]} wins.`;
    }
  } else if (!res.extra) {
    turn = other(p);
  }
  messageEl.textContent = msg;
  render();
}

function undo() {
  if (!history.length || busy) return;
  const prev = history.pop();
  moveId++;
  pits = prev.pits;
  turn = prev.turn;
  over = false;
  messageEl.textContent = prev.message;
  holes.forEach((el) => el.classList.remove("source", "taken"));
  render();
}

function newGame() {
  pits = Array(14).fill(START);
  pits[STORE.p1] = 0;
  pits[STORE.p2] = 0;
  turn = "p1";
  history = [];
  over = false;
  busy = false;
  pressed = null;
  moveId++;
  messageEl.textContent = "";
  holes.forEach((el) => el.classList.remove("source", "taken"));
  render();
}

// ---------- Input (Pointer Events: click or tap a pit) ----------

function pitAt(e) {
  const el = e.target.closest(".pit");
  return el ? Number(el.dataset.i) : null;
}

boardEl.addEventListener("pointerdown", (e) => {
  if (e.button > 0 || over || busy) return;
  const i = pitAt(e);
  if (i === null || owner(i) !== turn || pits[i] === 0) return;
  pressed = i;
  render();
});

window.addEventListener("pointerup", (e) => {
  if (pressed === null) return;
  const i = pressed;
  pressed = null;
  // With touch the target stays the pressed element, so check what is under the finger
  const under = document.elementFromPoint(e.clientX, e.clientY);
  const el = under && under.closest(".pit");
  if (el && Number(el.dataset.i) === i) play(i);
  else render();
});

window.addEventListener("pointercancel", () => {
  if (pressed === null) return;
  pressed = null;
  render();
});

undoBtn.addEventListener("click", undo);
document.getElementById("reset").addEventListener("click", newGame);

buildBoard();
newGame();

// Backgammon — two players on the same device (1v1)
// Points 1..24 as seen from White: White moves 24 -> 1 and bears off from its home
// board (points 1-6, bottom right); Black moves 1 -> 24 with its home on 19-24 (top right).
// pts[p] > 0 means White checkers on point p, < 0 means Black checkers.
// Positions along a player's path: White's bar is 25 and "off" is 0, Black's bar is 0
// and "off" is 25, so every move is simply  to = from + dir * die.

const NAME = { w: "White", b: "Black" };
const other = (c) => (c === "w" ? "b" : "w");
const DIR = { w: -1, b: 1 };
const BAR = { w: 25, b: 0 };
const OFF = { w: 0, b: 25 };

function startState() {
  const pts = Array(26).fill(0);
  pts[24] = 2; pts[13] = 5; pts[8] = 3; pts[6] = 5;      // White
  pts[1] = -2; pts[12] = -5; pts[17] = -3; pts[19] = -5; // Black
  return {
    pts,
    bar: { w: 0, b: 0 },
    off: { w: 0, b: 0 },
    turn: "w",
    phase: "opening", // opening | roll | move | over
    dice: [],         // dice still to play
    rolled: [],       // dice shown this turn (doubles are four dice)
    opening: null,    // { w, b } single dice of the opening roll
  };
}

function clone(s) {
  return {
    ...s,
    pts: s.pts.slice(),
    bar: { ...s.bar },
    off: { ...s.off },
    dice: s.dice.slice(),
    rolled: s.rolled.slice(),
  };
}

// ---------- Rules ----------

const ownCount = (s, c, p) => (c === "w" ? Math.max(0, s.pts[p]) : Math.max(0, -s.pts[p]));

function allHome(s, c) {
  if (s.bar[c]) return false;
  for (let p = 1; p <= 24; p++) {
    const home = c === "w" ? p <= 6 : p >= 19;
    if (!home && ownCount(s, c, p)) return false;
  }
  return true;
}

// All single checker moves for the side to move with one die value.
function singleMoves(s, d) {
  const c = s.turn, o = other(c), dir = DIR[c], out = [];
  const tryTo = (from, to) => {
    const opp = ownCount(s, o, to);
    if (opp <= 1) out.push({ from, to, die: d, hit: opp === 1 });
  };

  if (s.bar[c]) {
    tryTo(BAR[c], BAR[c] + dir * d);
    return out;
  }

  const home = allHome(s, c);
  for (let p = 1; p <= 24; p++) {
    if (!ownCount(s, c, p)) continue;
    const to = p + dir * d;
    if (to >= 1 && to <= 24) tryTo(p, to);
    else if (home) {
      if (to === OFF[c]) out.push({ from: p, to: OFF[c], die: d, hit: false });
      else {
        // A higher die may bear off only from the highest occupied point
        let higher = false;
        for (let q = p - dir; q >= 1 && q <= 24 && !higher; q -= dir) if (ownCount(s, c, q)) higher = true;
        if (!higher) out.push({ from: p, to: OFF[c], die: d, hit: false });
      }
    }
  }
  return out;
}

function applyMove(s, m) {
  const n = clone(s), c = n.turn, o = other(c), sign = c === "w" ? 1 : -1;
  if (m.from === BAR[c]) n.bar[c]--;
  else n.pts[m.from] -= sign;
  if (m.hit) {
    n.pts[m.to] = 0;
    n.bar[o]++;
  }
  if (m.to === OFF[c]) n.off[c]++;
  else n.pts[m.to] += sign;
  n.dice.splice(n.dice.indexOf(m.die), 1);
  return n;
}

const distinct = (dice) => [...new Set(dice)];

// Largest number of dice that can still be played from this position.
function maxPlayable(s) {
  if (!s.dice.length || s.off[s.turn] === 15) return 0;
  let best = 0;
  for (const d of distinct(s.dice)) {
    for (const m of singleMoves(s, d)) {
      best = Math.max(best, 1 + maxPlayable(applyMove(s, m)));
      if (best === s.dice.length) return best;
    }
  }
  return best;
}

// Legal moves right now: only moves that keep the maximum number of dice playable,
// and if just one of two different dice can be played, the larger one when possible.
function legalMoves(s) {
  if (s.phase !== "move" || !s.dice.length) return [];
  const max = maxPlayable(s);
  if (!max) return [];
  let moves = [];
  for (const d of distinct(s.dice))
    for (const m of singleMoves(s, d))
      if (1 + maxPlayable(applyMove(s, m)) === max) moves.push(m);
  if (max === 1 && s.dice.length === 2 && s.dice[0] !== s.dice[1]) {
    const hi = Math.max(...s.dice);
    if (moves.some((m) => m.die === hi)) moves = moves.filter((m) => m.die === hi);
  }
  return moves;
}

// Every destination the checker at `from` can reach this turn, one die or several
// in a row. Returns [{ to, path: [moves], hit }]. Shorter paths win, then smaller dice.
function reachFrom(s, from) {
  const found = new Map();
  const walk = (st, pos, path) => {
    for (const m of legalMoves(st).filter((x) => x.from === pos)) {
      const p = path.concat(m);
      const sum = p.reduce((a, x) => a + x.die, 0);
      const prev = found.get(m.to);
      if (!prev || p.length < prev.path.length || (p.length === prev.path.length && sum < prev.sum))
        found.set(m.to, { to: m.to, path: p, sum, hit: m.hit });
      if (m.to !== OFF[st.turn]) walk(applyMove(st, m), m.to, p);
    }
  };
  walk(s, from, []);
  return [...found.values()];
}

function pipCount(s, c) {
  let n = s.bar[c] * 25;
  for (let p = 1; p <= 24; p++) n += ownCount(s, c, p) * (c === "w" ? p : 25 - p);
  return n;
}

// ---------- Drawing (SVG viewBox 590 x 444) ----------

const VW = 590, VH = 444, MID = 222, R = 17;

function pointX(p) {
  if (p <= 6) return 530 - (p - 0.5) * 40;
  if (p <= 12) return 250 - (p - 6.5) * 40;
  if (p <= 18) return 10 + (p - 12.5) * 40;
  return 290 + (p - 18.5) * 40;
}
const isTop = (p) => p >= 13;

// Center y of the k-th checker (from the edge) in a stack of n on point p
function stackY(p, k, n) {
  const sp = n > 5 ? 138 / (n - 1) : 35;
  return isTop(p) ? 31 + k * sp : VH - 31 - k * sp;
}
function barY(c, k, n) {
  const sp = n > 5 ? 140 / (n - 1) : 35;
  return c === "w" ? MID + 40 + k * sp : MID - 40 - k * sp;
}

function checkerSVG(c, x, y, cls = "") {
  return `<g class="checker ${c} ${cls}"><circle class="body" cx="${x}" cy="${y}" r="${R}"/>` +
    `<circle class="d" cx="${x}" cy="${y}" r="${R - 6}"/></g>`;
}

// Pip layouts on a 3x3 grid (0..8)
const PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };

function dieSVG(v, c, cx, cy, size, used) {
  const x = cx - size / 2, y = cy - size / 2, g = size * 0.27, pr = size * 0.09;
  const pips = PIPS[v].map((i) => {
    const px = cx + ((i % 3) - 1) * g, py = cy + (Math.floor(i / 3) - 1) * g;
    return `<circle cx="${px}" cy="${py}" r="${pr}"/>`;
  }).join("");
  return `<g class="die ${c}${used ? " used" : ""}"><rect x="${x}" y="${y}" width="${size}" height="${size}" rx="${size * 0.22}"/>${pips}</g>`;
}

function triangle(p) {
  const x = pointX(p), top = isTop(p);
  const base = top ? 14 : VH - 14, tip = top ? 164 : VH - 164;
  const cls = ["tri", p % 2 ? "a" : "b"];
  return { cls, d: `M${x - 19} ${base} L${x + 19} ${base} L${x} ${tip} Z` };
}

// ---------- UI ----------

const boardEl = document.getElementById("board");
const statusEl = document.getElementById("status");
const noteEl = document.getElementById("note");
const mainBtn = document.getElementById("main");
const undoBtn = document.getElementById("undo");
const endOverlay = document.getElementById("endOverlay");

let state, history, legal, selected, targets, note;
let drag = null; // { from, x, y, moved, wasSelected, ghost, hover }

const DRAG_THRESHOLD = 5;

function newGame() {
  state = startState();
  history = [];
  note = "Each player rolls one die. Higher starts.";
  endOverlay.hidden = true;
  refresh();
}

// Recompute cached legal moves and clear the selection
function refresh() {
  legal = legalMoves(state);
  selected = null;
  targets = [];
  render();
}

const sources = () => new Set(legal.map((m) => m.from));

function render() {
  const s = state, c = s.turn;
  const lifted = drag && drag.moved ? drag.from : null;
  const hover = drag && drag.moved ? drag.hover : null;
  const src = sources();
  const tgt = new Map(targets.map((t) => [t.to, t]));
  const parts = [];

  // Frame, fields, bar and trays
  parts.push(`<rect class="frame" x="0" y="0" width="${VW}" height="${VH}" rx="14"/>`);
  parts.push(`<rect class="field" x="10" y="10" width="240" height="424" rx="6"/>`);
  parts.push(`<rect class="field" x="290" y="10" width="240" height="424" rx="6"/>`);

  // Bear-off trays: Black's on top, White's at the bottom
  for (const col of ["b", "w"]) {
    const y = col === "b" ? 14 : VH - 14 - 172;
    const isT = s.phase === "move" && col === c && tgt.has(OFF[c]);
    const cls = ["pocket"];
    if (isT) cls.push("target");
    if (isT && hover === OFF[c]) cls.push("hover");
    parts.push(`<rect class="${cls.join(" ")}" x="540" y="${y}" width="40" height="172" rx="8"/>`);
    for (let k = 0; k < s.off[col]; k++) {
      const sy = col === "b" ? 18 + k * 11 : VH - 18 - 9 - k * 11;
      parts.push(`<rect class="slab ${col}" x="544" y="${sy}" width="32" height="9" rx="3"/>`);
    }
  }

  // Points
  for (let p = 1; p <= 24; p++) {
    const t = triangle(p), x = pointX(p);
    const isT = tgt.get(p);
    if (isT) t.cls.push("target");
    if (isT && hover === p) t.cls.push("hover");
    if (src.has(p) && !drag) t.cls.push("own");
    parts.push(`<path class="${t.cls.join(" ")}" d="${t.d}"/>`);

    const n = Math.abs(s.pts[p]), col = s.pts[p] > 0 ? "w" : "b";
    for (let k = 0; k < n; k++) {
      const top = k === n - 1;
      let cls = "";
      if (top && selected === p) cls = "sel";
      if (top && lifted === p) cls = "lifted";
      parts.push(checkerSVG(col, x, stackY(p, k, n), cls));
    }
    if (isT) {
      const k = isT.hit ? 0 : Math.min(ownCount(s, c, p), 4);
      const y = stackY(p, k, Math.min(k + 1, 5));
      parts.push(isT.hit
        ? `<circle class="mark hit" cx="${x}" cy="${y}" r="${R + 3}"/>`
        : `<circle class="mark" cx="${x}" cy="${y}" r="7"/>`);
    }
  }

  // Bar (between the halves)
  parts.push(`<rect class="frame${src.has(BAR[c]) && !drag ? " own" : ""}" x="250" y="10" width="40" height="424"/>`);
  for (const col of ["w", "b"]) {
    const n = s.bar[col];
    for (let k = 0; k < n; k++) {
      const top = k === n - 1, mine = col === c && s.phase === "move";
      let cls = "";
      if (top && mine && selected === BAR[c]) cls = "sel";
      if (top && mine && lifted === BAR[c]) cls = "lifted";
      parts.push(checkerSVG(col, 270, barY(col, k, n), cls));
    }
  }

  // Dice: on the right half for White, on the left half for Black
  if (s.phase === "opening" && s.opening) {
    parts.push(dieSVG(s.opening.w, "w", 410, MID, 36, false));
    parts.push(dieSVG(s.opening.b, "b", 130, MID, 36, false));
  } else if (s.rolled.length) {
    const cx = c === "w" ? 410 : 130;
    const left = s.dice.slice();
    const used = s.rolled.map((v) => {
      const i = left.indexOf(v);
      if (i >= 0) { left.splice(i, 1); return false; }
      return true;
    });
    // Played dice are listed first so they fade from the left
    const order = s.rolled.map((v, i) => ({ v, u: used[i] }));
    order.sort((a, b) => b.u - a.u);
    const size = order.length === 4 ? 32 : 36, gap = size + 8;
    order.forEach((d, i) => {
      const dx = cx + (i - (order.length - 1) / 2) * gap;
      parts.push(dieSVG(d.v, c, dx, MID, size, d.u));
    });
  }

  boardEl.innerHTML = `<svg viewBox="0 0 ${VW} ${VH}" aria-label="Backgammon board">${parts.join("")}</svg>`;
  renderControls();
}

function renderControls() {
  const s = state, dot = `<span class="dot ${s.turn}"></span>`;
  if (s.phase === "opening") {
    statusEl.textContent = "Roll to start";
    mainBtn.textContent = "Roll";
    mainBtn.disabled = false;
  } else if (s.phase === "roll") {
    statusEl.innerHTML = dot + NAME[s.turn] + " to roll";
    mainBtn.textContent = "Roll";
    mainBtn.disabled = false;
  } else if (s.phase === "move") {
    if (legal.length) {
      statusEl.innerHTML = dot + NAME[s.turn] + " to move";
      mainBtn.textContent = "Done";
      mainBtn.disabled = true;
    } else {
      const played = s.dice.length < s.rolled.length;
      statusEl.innerHTML = dot + NAME[s.turn] + (played ? " is done" : ": no moves");
      mainBtn.textContent = played ? "Done" : "Pass";
      mainBtn.disabled = false;
    }
  } else {
    mainBtn.textContent = "Roll";
    mainBtn.disabled = true;
  }
  undoBtn.disabled = history.length === 0;

  let text = note;
  if (s.phase === "move" && !legal.length && s.dice.length === s.rolled.length) text = "No legal moves. Press Pass.";
  else if (s.phase === "move" || s.phase === "roll")
    text = text || `Pips: White ${pipCount(s, "w")} · Black ${pipCount(s, "b")}`;
  noteEl.textContent = text;
}

const rollDie = () => 1 + Math.floor(Math.random() * 6);

function onMain() {
  const s = state;
  if (s.phase === "opening") {
    const w = rollDie(), b = rollDie();
    state = { ...clone(s), opening: { w, b } };
    Sound.roll();
    if (w === b) {
      note = `Both rolled ${w}. Roll again.`;
      return refresh();
    }
    const first = w > b ? "w" : "b";
    state = { ...state, turn: first, phase: "move", dice: [w, b], rolled: [w, b], opening: null };
    note = `${NAME[first]} starts with ${w} and ${b}.`;
    history = [];
    return refresh();
  }
  if (s.phase === "roll") {
    const a = rollDie(), b = rollDie();
    const dice = a === b ? [a, a, a, a] : [a, b];
    state = { ...clone(s), phase: "move", dice, rolled: dice.slice() };
    note = "";
    history = [];
    Sound.roll();
    return refresh();
  }
  if (s.phase === "move" && !legal.length) {
    // End the turn (also passes when there was no legal move)
    state = { ...clone(s), turn: other(s.turn), phase: "roll", dice: [], rolled: [] };
    history = [];
    note = "";
    refresh();
  }
}

function play(target) {
  history.push({ state, note });
  let s = state, hit = false;
  for (const m of target.path) {
    hit = hit || m.hit;
    s = applyMove(s, m);
  }
  state = s;
  note = "";
  if (hit) Sound.capture();
  else Sound.move();
  refresh();
  checkEnd();
}

function checkEnd() {
  const s = state, c = s.turn;
  if (s.off[c] < 15) return;
  const o = other(c);
  let kind = "";
  if (s.off[o] === 0) {
    let inHome = s.bar[o] > 0;
    for (let p = 1; p <= 24; p++) {
      const winnersHome = c === "w" ? p <= 6 : p >= 19;
      if (winnersHome && ownCount(s, o, p)) inHome = true;
    }
    kind = inHome ? "backgammon" : "gammon";
  }
  const title = `${NAME[c]} wins`;
  const text = kind ? `A ${kind}: ${NAME[o]} bore off no checkers.` : `All 15 checkers borne off.`;
  state = { ...clone(s), phase: "over" };
  legal = [];
  Sound.win();
  render();
  statusEl.textContent = kind ? `${title} (${kind})` : title;
  noteEl.textContent = text;
  document.getElementById("endTitle").textContent = kind ? `${title} with a ${kind}` : title;
  document.getElementById("endText").textContent = text;
  endOverlay.hidden = false;
}

function undo() {
  if (!history.length) return;
  const h = history.pop();
  state = h.state;
  note = h.note;
  endOverlay.hidden = true;
  refresh();
}

// ---------- Pointer input: click to move and drag and drop ----------

function toBoard(x, y) {
  const r = boardEl.getBoundingClientRect();
  const k = VW / r.width;
  return [(x - r.left) * k, (y - r.top) * k];
}

// Board position (for the side to move) under the pointer, or null
function posAt(clientX, clientY) {
  const [x, y] = toBoard(clientX, clientY);
  if (x < 0 || y < 0 || x > VW || y > VH) return null;
  const top = y < MID, c = state.turn;
  if (x >= 10 && x < 250) {
    const col = Math.floor((x - 10) / 40);
    return top ? 13 + col : 12 - col;
  }
  if (x >= 290 && x < 530) {
    const col = Math.floor((x - 290) / 40);
    return top ? 19 + col : 6 - col;
  }
  if (x >= 250 && x < 290) return BAR[c];
  if (x >= 530) return OFF[c];
  return null;
}

function select(from) {
  selected = from;
  targets = reachFrom(state, from);
}

function clearSelection() {
  selected = null;
  targets = [];
}

function onPointerDown(e) {
  if (state.phase !== "move" || e.button > 0) return;
  const pos = posAt(e.clientX, e.clientY);
  if (pos === null) return;

  const t = selected !== null && targets.find((x) => x.to === pos);
  if (t) return play(t);

  if (!sources().has(pos)) {
    clearSelection();
    return render();
  }
  const wasSelected = selected === pos;
  select(pos);
  drag = { from: pos, x: e.clientX, y: e.clientY, moved: false, wasSelected, ghost: null, hover: null };
  render();
}

function onPointerMove(e) {
  if (!drag) return;
  if (!drag.moved) {
    if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < DRAG_THRESHOLD) return;
    drag.moved = true;
    const size = (2 * R * boardEl.getBoundingClientRect().width) / VW;
    drag.ghost = document.createElement("div");
    drag.ghost.className = "drag-ghost";
    drag.ghost.style.width = drag.ghost.style.height = size + "px";
    drag.ghost.innerHTML = `<svg viewBox="0 0 ${2 * R} ${2 * R}">${checkerSVG(state.turn, R, R)}</svg>`;
    document.body.appendChild(drag.ghost);
    document.body.classList.add("dragging");
  }
  const half = drag.ghost.offsetWidth / 2;
  drag.ghost.style.transform = `translate(${e.clientX - half}px, ${e.clientY - half}px)`;

  const pos = posAt(e.clientX, e.clientY);
  if (pos !== drag.hover) {
    drag.hover = pos;
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
    const pos = posAt(e.clientX, e.clientY);
    const t = pos !== null && targets.find((x) => x.to === pos);
    if (t) return play(t);
    // dropped elsewhere: the checker goes back and stays selected
  } else if (d.wasSelected) {
    clearSelection(); // second click on the same checker deselects it
  }
  render();
}

function onPointerCancel() {
  if (!drag) return;
  endDrag();
  render();
}

boardEl.addEventListener("pointerdown", onPointerDown);
window.addEventListener("pointermove", onPointerMove);
window.addEventListener("pointerup", onPointerUp);
window.addEventListener("pointercancel", onPointerCancel);

mainBtn.addEventListener("click", onMain);
undoBtn.addEventListener("click", undo);
document.getElementById("reset").addEventListener("click", newGame);
document.getElementById("endUndo").addEventListener("click", undo);
document.getElementById("endReset").addEventListener("click", newGame);

newGame();

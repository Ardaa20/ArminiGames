// Go — two players on the same device (1v1)
// 9x9 intersections, Black moves first. Groups without liberties are captured.
// Suicide is illegal, simple ko applies. Two passes in a row end the game; then
// dead groups are marked by clicking them and the game is scored by area
// (stones + surrounded empty points) with 6.5 komi for White.
// board[i] is null, "b" or "w" with i = r * N + c.

const N = 9;
const KOMI = 6.5;
const NAME = { b: "Black", w: "White" };
const STARS = [[2, 2], [2, 6], [4, 4], [6, 2], [6, 6]];
const DRAG_THRESHOLD = 5; // px before a press becomes a drag

// Grid lines and star points, drawn once (viewBox units = cells)
const LINES_SVG = (() => {
  let d = "";
  for (let i = 0; i < N; i++) {
    d += `M0.5 ${i + 0.5}H${N - 0.5}M${i + 0.5} 0.5V${N - 0.5}`;
  }
  const stars = STARS.map(([r, c]) => `<circle cx="${c + 0.5}" cy="${r + 0.5}" r="0.08"/>`).join("");
  return `<svg class="lines" viewBox="0 0 ${N} ${N}" aria-hidden="true"><path fill="none" d="${d}"/>${stars}</svg>`;
})();

// Neighbours of every point, computed once
const NEIGHBORS = Array.from({ length: N * N }, (_, i) => {
  const r = Math.floor(i / N), c = i % N, list = [];
  if (r > 0) list.push(i - N);
  if (r < N - 1) list.push(i + N);
  if (c > 0) list.push(i - 1);
  if (c < N - 1) list.push(i + 1);
  return list;
});

const boardEl = document.getElementById("board");
const statusEl = document.getElementById("status");
const nextEl = document.getElementById("next");
const nextSlot = document.getElementById("nextSlot");
const nextText = document.getElementById("nextText");
const sideEl = document.getElementById("side");
const undoBtn = document.getElementById("undo");
const passBtn = document.getElementById("pass");

let board, turn, caps, passes, last, history, phase, dead, notice;
let hover = null; // point index under the mouse (preview stone)
let drag = null;  // { x, y, moved, ghost, target }

const other = (s) => (s === "b" ? "w" : "b");
const stoneHTML = (s, cls = "") => `<div class="stone ${s} ${cls}"></div>`;
const dotHTML = (s) => `<span class="dot ${s}"></span>`;

function newGame() {
  board = Array(N * N).fill(null);
  turn = "b";
  caps = { b: 0, w: 0 };   // stones captured BY each color
  passes = 0;
  last = null;             // index of the last placed stone
  history = [];            // snapshots before each action, for undo and ko
  phase = "play";          // "play" | "mark" (choose dead stones) | "done"
  dead = new Set();
  notice = "";
  hover = null;
  render();
}

// ---------- Rules ----------

// The connected group at i and its liberties.
function groupAt(b, i) {
  const color = b[i];
  const stones = [i], seen = new Set([i]), libs = new Set();
  for (let k = 0; k < stones.length; k++) {
    for (const n of NEIGHBORS[stones[k]]) {
      if (b[n] === null) libs.add(n);
      else if (b[n] === color && !seen.has(n)) {
        seen.add(n);
        stones.push(n);
      }
    }
  }
  return { stones, libs };
}

// Try playing `color` at i. Returns { board, captured } or { error }.
function tryMove(i, color) {
  if (board[i] !== null) return { error: "occupied" };
  const b = board.slice();
  b[i] = color;
  let captured = 0;
  // Opponent groups first
  for (const n of NEIGHBORS[i]) {
    if (b[n] === other(color)) {
      const g = groupAt(b, n);
      if (g.libs.size === 0) {
        for (const s of g.stones) b[s] = null;
        captured += g.stones.length;
      }
    }
  }
  // Then the own group: no liberties means suicide
  if (groupAt(b, i).libs.size === 0) return { error: "Suicide is not allowed" };
  // Simple ko: the move may not recreate the position before the previous move
  const prev = history[history.length - 1];
  if (prev && prev.board.join() === b.join()) return { error: "Ko: play elsewhere first" };
  return { board: b, captured };
}

const isLegal = (i) => !tryMove(i, turn).error;

function snapshot() {
  history.push({ board: board.slice(), turn, caps: { ...caps }, passes, last });
}

function place(i) {
  if (phase !== "play") return false;
  const res = tryMove(i, turn);
  if (res.error) {
    if (res.error !== "occupied") {
      notice = res.error;
      render();
    }
    return false;
  }
  snapshot();
  board = res.board;
  caps[turn] += res.captured;
  passes = 0;
  last = i;
  notice = "";
  if (res.captured) Sound.capture();
  else Sound.move();
  turn = other(turn);
  render();
  return true;
}

function pass() {
  if (phase === "mark") return finish();
  if (phase !== "play") return;
  snapshot();
  passes++;
  last = null;
  notice = passes === 1 ? `${NAME[turn]} passed` : "";
  turn = other(turn);
  if (passes >= 2) {
    phase = "mark";
    dead = new Set();
    hover = null;
  }
  render();
}

function finish() {
  phase = "done";
  const s = score();
  if (s.b === s.w) Sound.draw();
  else Sound.win();
  render();
}

function undo() {
  if (phase === "done") {
    phase = "mark";
    render();
    return;
  }
  if (!history.length) return;
  const h = history.pop();
  board = h.board;
  turn = h.turn;
  caps = h.caps;
  passes = h.passes;
  last = h.last;
  phase = "play";
  dead = new Set();
  notice = "";
  render();
}

// Toggle a whole group as dead / alive during marking
function toggleDead(i) {
  if (board[i] === null) return;
  const g = groupAt(board, i).stones;
  const isDead = dead.has(i);
  for (const s of g) {
    if (isDead) dead.delete(s);
    else dead.add(s);
  }
  render();
}

// ---------- Scoring (area) ----------

// owner[i]: "b"/"w" for points that count for a color, null for neutral.
function territory() {
  const b = board.map((s, i) => (dead.has(i) ? null : s));
  const owner = Array(N * N).fill(null);
  const seen = new Set();
  for (let i = 0; i < N * N; i++) {
    if (b[i] !== null) { owner[i] = b[i]; continue; }
    if (seen.has(i)) continue;
    // Flood the empty region and collect the colors that border it
    const region = [i], borders = new Set();
    seen.add(i);
    for (let k = 0; k < region.length; k++) {
      for (const n of NEIGHBORS[region[k]]) {
        if (b[n] === null) {
          if (!seen.has(n)) { seen.add(n); region.push(n); }
        } else borders.add(b[n]);
      }
    }
    if (borders.size === 1) {
      const o = [...borders][0];
      for (const p of region) owner[p] = o;
    }
  }
  return owner;
}

function score() {
  const owner = territory();
  const s = { b: 0, w: KOMI, owner };
  for (const o of owner) if (o) s[o]++;
  return s;
}

function resultText(s) {
  if (s.b === s.w) return "Draw";
  const win = s.b > s.w ? "b" : "w";
  return `${NAME[win]} wins by ${Math.abs(s.b - s.w)}`;
}

// ---------- Drawing ----------

function render() {
  const target = drag && drag.moved ? drag.target : null;
  const scoring = phase !== "play";
  const s = scoring ? score() : null;
  boardEl.innerHTML = LINES_SVG;

  for (let i = 0; i < N * N; i++) {
    const pt = document.createElement("div");
    pt.className = target === i ? "pt hover" : "pt";
    const st = board[i];
    let html = "";
    if (st) {
      let extra = "";
      if (i === last && !scoring) extra += " last";
      if (dead.has(i)) extra += " dead";
      html = stoneHTML(st, extra);
    } else if (phase === "play" && !drag && hover === i && isLegal(i)) {
      html = stoneHTML(turn, "preview");
    }
    // Territory: empty points and dead stones owned by the other color
    if (s && s.owner[i] && (st === null || dead.has(i))) {
      html += `<div class="terr ${s.owner[i]}"></div>`;
    }
    pt.innerHTML = html;
    boardEl.appendChild(pt);
  }

  // Row above the board: next stone and captures while playing, score afterwards
  const lifted = drag && drag.moved ? "lifted" : "";
  nextSlot.innerHTML = phase === "play" ? stoneHTML(turn, lifted) : "";
  nextEl.classList.toggle("off", phase !== "play");
  boardEl.classList.toggle("over", phase === "done");

  if (phase === "play") {
    nextText.textContent = notice || "Next stone";
    sideEl.innerHTML = `Captures ${dotHTML("b")}${caps.b} ${dotHTML("w")}${caps.w}`;
    statusEl.innerHTML = `${dotHTML(turn)}${NAME[turn]} to move`;
    passBtn.textContent = "Pass";
  } else {
    const pts = `${dotHTML("b")}${s.b} ${dotHTML("w")}${s.w}`;
    sideEl.innerHTML = pts;
    if (phase === "mark") {
      nextText.textContent = "Tap dead groups, then Score";
      statusEl.textContent = "Mark dead stones";
      passBtn.textContent = "Score";
    } else {
      nextText.textContent = resultText(s);
      statusEl.textContent = resultText(s);
      passBtn.textContent = "Pass";
    }
  }
  passBtn.disabled = phase === "done";
  undoBtn.disabled = history.length === 0 && phase === "play";
}

// ---------- Input ----------

function pointAt(x, y) {
  const rect = boardEl.getBoundingClientRect();
  if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) return null;
  const size = rect.width / N;
  return Math.floor((y - rect.top) / size) * N + Math.floor((x - rect.left) / size);
}

// Click / tap a point to place a stone (or mark a group dead after the game)
boardEl.addEventListener("pointerdown", (e) => {
  if (e.button > 0) return;
  const p = pointAt(e.clientX, e.clientY);
  if (p === null) return;
  if (phase === "mark") return toggleDead(p);
  if (phase !== "play") return;
  hover = e.pointerType === "mouse" ? p : null;
  place(p);
});

boardEl.addEventListener("pointermove", (e) => {
  if (drag || e.pointerType !== "mouse") return;
  const p = pointAt(e.clientX, e.clientY);
  if (p !== hover) {
    hover = p;
    render();
  }
});

boardEl.addEventListener("pointerleave", () => {
  if (hover !== null) {
    hover = null;
    render();
  }
});

// Drag the next stone onto a point
nextSlot.addEventListener("pointerdown", (e) => {
  if (phase !== "play" || e.button > 0) return;
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
    drag.ghost.style.width = drag.ghost.style.height = size * 0.88 + "px";
    drag.ghost.innerHTML = stoneHTML(turn);
    document.body.appendChild(drag.ghost);
    document.body.classList.add("dragging");
    render();
  }
  const half = drag.ghost.offsetWidth / 2;
  drag.ghost.style.transform = `translate(${e.clientX - half}px, ${e.clientY - half}px)`;

  let p = pointAt(e.clientX, e.clientY);
  if (p !== null && !isLegal(p)) p = null;
  if (p !== drag.target) {
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
    if (p !== null && place(p)) return;
  }
  render();
}

window.addEventListener("pointerup", (e) => endDrag(true, e));
window.addEventListener("pointercancel", () => endDrag(false));

undoBtn.addEventListener("click", undo);
passBtn.addEventListener("click", pass);
document.getElementById("reset").addEventListener("click", newGame);

newGame();

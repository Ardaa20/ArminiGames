// Dots and Boxes — two players on the same device
// A 5x5 grid of boxes (6x6 dots). Players take turns drawing one line between two
// neighbouring dots. Closing a box scores it and gives the same player another line.
// Line ids: "h-r-c" is the horizontal line from dot (r,c) to (r,c+1),
//           "v-r-c" is the vertical line from dot (r,c) to (r+1,c).

const N = 5;          // boxes per side
const GAP = 60;       // distance between dots in SVG units
const MARGIN = 20;
const NAME = { p1: "Blue", p2: "Peach" };
const SVG_NS = "http://www.w3.org/2000/svg";

const boardEl = document.getElementById("board");
const statusEl = document.getElementById("status");
const scoresEl = document.getElementById("scores");
const messageEl = document.getElementById("message");
const undoBtn = document.getElementById("undo");

let lines, boxes, turn, history, over, last;
let lineEls = {}, hitEls = {}, boxEls = [];

const other = (p) => (p === "p1" ? "p2" : "p1");
const pos = (i) => MARGIN + i * GAP;

function svg(tag, attrs, parent) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const k in attrs) el.setAttribute(k, attrs[k]);
  parent.appendChild(el);
  return el;
}

// All line ids with their end points
function allLines() {
  const list = [];
  for (let r = 0; r <= N; r++) {
    for (let c = 0; c <= N; c++) {
      if (c < N) list.push({ id: `h-${r}-${c}`, x1: pos(c), y1: pos(r), x2: pos(c + 1), y2: pos(r) });
      if (r < N) list.push({ id: `v-${r}-${c}`, x1: pos(c), y1: pos(r), x2: pos(c), y2: pos(r + 1) });
    }
  }
  return list;
}

// ---------- Rules ----------

function boxSides(r, c) {
  return [`h-${r}-${c}`, `h-${r + 1}-${c}`, `v-${r}-${c}`, `v-${r}-${c + 1}`];
}

// The (up to two) boxes a line borders
function boxesOf(id) {
  const [kind, rs, cs] = id.split("-");
  const r = +rs, c = +cs;
  const list = kind === "h" ? [[r - 1, c], [r, c]] : [[r, c - 1], [r, c]];
  return list.filter(([br, bc]) => br >= 0 && br < N && bc >= 0 && bc < N);
}

function score(p) {
  return boxes.flat().filter((b) => b === p).length;
}

// ---------- Rendering ----------

function buildBoard() {
  boardEl.innerHTML = "";
  lineEls = {}; hitEls = {}; boxEls = [];
  const boxLayer = svg("g", {}, boardEl);
  const lineLayer = svg("g", {}, boardEl);
  const dotLayer = svg("g", {}, boardEl);
  const hitLayer = svg("g", {}, boardEl);

  for (let r = 0; r < N; r++) {
    boxEls.push([]);
    for (let c = 0; c < N; c++) {
      boxEls[r].push(svg("rect", {
        class: "box", x: pos(c) + 6, y: pos(r) + 6, width: GAP - 12, height: GAP - 12, rx: 8,
      }, boxLayer));
    }
  }
  for (const l of allLines()) {
    const pts = { x1: l.x1, y1: l.y1, x2: l.x2, y2: l.y2 };
    lineEls[l.id] = svg("line", { class: "line", ...pts }, lineLayer);
    const hit = svg("line", { class: "hit", ...pts }, hitLayer);
    hit.dataset.id = l.id;
    hitEls[l.id] = hit;
  }
  for (let r = 0; r <= N; r++) {
    for (let c = 0; c <= N; c++) svg("circle", { class: "dot-pt", cx: pos(c), cy: pos(r), r: 6 }, dotLayer);
  }
}

function render() {
  for (const id in lineEls) {
    const owner = lines[id];
    const el = lineEls[id];
    el.classList.toggle("p1", owner === "p1");
    el.classList.toggle("p2", owner === "p2");
    el.classList.toggle("last", id === last);
    el.classList.toggle("next-p1", turn === "p1");
    el.classList.toggle("next-p2", turn === "p2");
    hitEls[id].classList.toggle("taken", !!owner);
    if (owner) el.classList.remove("hover");
  }
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      boxEls[r][c].classList.toggle("p1", boxes[r][c] === "p1");
      boxEls[r][c].classList.toggle("p2", boxes[r][c] === "p2");
    }
  }

  const s1 = score("p1"), s2 = score("p2");
  scoresEl.innerHTML =
    `<span class="${!over && turn === "p1" ? "active" : ""}"><span class="dot p1"></span>${NAME.p1} ${s1}</span>` +
    `<span class="${!over && turn === "p2" ? "active" : ""}"><span class="dot p2"></span>${NAME.p2} ${s2}</span>`;

  if (over) {
    statusEl.textContent = s1 === s2 ? "Draw" : `${NAME[s1 > s2 ? "p1" : "p2"]} wins`;
  } else {
    statusEl.innerHTML = `<span class="dot ${turn}"></span>${NAME[turn]} to move`;
  }
  undoBtn.disabled = history.length === 0;
  boardEl.classList.toggle("locked", over);
}

// ---------- Moves ----------

function play(id) {
  if (over || lines[id]) return;
  history.push({ lines: { ...lines }, boxes: boxes.map((row) => row.slice()), turn, last });
  lines[id] = turn;
  last = id;

  let closed = 0;
  for (const [r, c] of boxesOf(id)) {
    if (boxSides(r, c).every((s) => lines[s])) {
      boxes[r][c] = turn;
      closed++;
    }
  }

  if (boxes.flat().every(Boolean)) {
    over = true;
    const s1 = score("p1"), s2 = score("p2");
    if (s1 === s2) {
      Sound.draw();
      messageEl.textContent = `All boxes are taken. It's a draw, ${s1}–${s2}.`;
    } else {
      Sound.win();
      const winner = s1 > s2 ? "p1" : "p2";
      messageEl.textContent = `${NAME[winner]} wins ${Math.max(s1, s2)}–${Math.min(s1, s2)}.`;
    }
  } else if (closed) {
    Sound.capture();
    messageEl.textContent = `${NAME[turn]} closed ${closed === 1 ? "a box" : "two boxes"}. Go again.`;
  } else {
    Sound.move();
    messageEl.textContent = "";
    turn = other(turn);
  }
  render();
}

function undo() {
  if (!history.length) return;
  const prev = history.pop();
  lines = prev.lines;
  boxes = prev.boxes;
  turn = prev.turn;
  last = prev.last;
  over = false;
  messageEl.textContent = "";
  render();
}

function newGame() {
  lines = {};
  for (const l of allLines()) lines[l.id] = null;
  boxes = Array.from({ length: N }, () => Array(N).fill(null));
  turn = "p1";
  history = [];
  over = false;
  last = null;
  messageEl.textContent = "";
  render();
}

// ---------- Input (Pointer Events: click or tap a line) ----------

let hovered = null;

function setHover(id) {
  if (hovered === id) return;
  if (hovered) lineEls[hovered].classList.remove("hover");
  hovered = id && !lines[id] && !over ? id : null;
  if (hovered) lineEls[hovered].classList.add("hover");
}

boardEl.addEventListener("pointerover", (e) => {
  if (e.pointerType === "mouse") setHover(e.target.dataset ? e.target.dataset.id : null);
});
boardEl.addEventListener("pointerleave", () => setHover(null));
boardEl.addEventListener("pointerup", (e) => {
  const id = e.target.dataset && e.target.dataset.id;
  if (e.button > 0 || !id) return;
  setHover(null);
  play(id);
});

undoBtn.addEventListener("click", undo);
document.getElementById("reset").addEventListener("click", newGame);

buildBoard();
newGame();

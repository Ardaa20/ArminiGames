// Memory: flip two cards at a time and find all matching pairs.

const boardEl = document.getElementById("board");
const statusEl = document.getElementById("status");
const messageEl = document.getElementById("message");
const endOverlay = document.getElementById("endOverlay");
const endText = document.getElementById("endText");
const endBest = document.getElementById("endBest");
const sizeButtons = { 4: document.getElementById("size4"), 6: document.getElementById("size6") };

const MISMATCH_DELAY = 800;
const SIZE_KEY = "memory-size";

let size = 4;
let cards = [];      // { symbol, el, up, matched }
let open = [];       // indexes of face-up, unmatched cards (0–2)
let locked = false;  // true while a mismatch is showing
let moves = 0;
let found = 0;
let startTime = 0;   // 0 until the first flip
let elapsed = 0;     // seconds, frozen at the win
let timer = null;
let flipBack = null;

function storageGet(key) {
  try { return localStorage.getItem(key); } catch (e) { return null; }
}
function storageSet(key, value) {
  try { localStorage.setItem(key, value); } catch (e) { /* storage unavailable */ }
}

function bestKey() { return "memory-best-" + size; }

function readBest() {
  try {
    const best = JSON.parse(storageGet(bestKey()));
    if (best && typeof best.moves === "number" && typeof best.time === "number") return best;
  } catch (e) { /* bad value */ }
  return null;
}

function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m + ":" + String(s).padStart(2, "0");
}

function shuffle(list) {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

function seconds() {
  return startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
}

function renderStatus() {
  const t = found === cards.length / 2 ? elapsed : seconds();
  statusEl.textContent = `Moves ${moves} · ${formatTime(t)}`;
}

function renderBest() {
  const best = readBest();
  messageEl.textContent = best
    ? `Best: ${best.moves} moves · ${formatTime(best.time)}`
    : "Find all the pairs";
}

function newGame() {
  clearTimeout(flipBack);
  clearInterval(timer);
  flipBack = null;
  timer = null;
  open = [];
  locked = false;
  moves = 0;
  found = 0;
  startTime = 0;
  elapsed = 0;
  endOverlay.hidden = true;

  const pairs = size * size / 2;
  const picks = shuffle(SYMBOLS.map((_, i) => i)).slice(0, pairs);
  const deck = shuffle(picks.concat(picks));

  boardEl.className = "board size-" + size;
  boardEl.innerHTML = "";
  cards = deck.map((symbol, index) => {
    const el = document.createElement("div");
    el.className = "card";
    el.dataset.index = index;
    el.innerHTML =
      `<div class="card-inner">` +
        `<div class="face back-face"></div>` +
        `<div class="face front-face c${symbol % 2}">` +
          `<svg viewBox="0 0 40 40" aria-hidden="true">${SYMBOLS[symbol]}</svg>` +
        `</div>` +
      `</div>`;
    boardEl.appendChild(el);
    return { symbol, el, up: false, matched: false };
  });

  for (const s in sizeButtons) sizeButtons[s].classList.toggle("active", Number(s) === size);
  renderStatus();
  renderBest();
}

function setUp(card, up) {
  card.up = up;
  card.el.classList.toggle("up", up);
}

function flip(index) {
  const card = cards[index];
  if (locked || !card || card.up || card.matched || open.length >= 2) return;

  if (!startTime) {
    startTime = Date.now();
    timer = setInterval(renderStatus, 250);
  }

  setUp(card, true);
  open.push(index);
  Sound.move();

  if (open.length < 2) return;

  moves++;
  const [a, b] = open.map(i => cards[i]);
  if (a.symbol === b.symbol) {
    a.matched = b.matched = true;
    a.el.classList.add("matched");
    b.el.classList.add("matched");
    open = [];
    found++;
    if (found === cards.length / 2) {
      win();
    } else {
      Sound.capture();
    }
  } else {
    locked = true;
    flipBack = setTimeout(() => {
      setUp(a, false);
      setUp(b, false);
      open = [];
      locked = false;
      flipBack = null;
    }, MISMATCH_DELAY);
  }
  renderStatus();
}

function win() {
  elapsed = seconds();
  clearInterval(timer);
  timer = null;
  renderStatus();

  const best = readBest();
  const isBest = !best || moves < best.moves || (moves === best.moves && elapsed < best.time);
  if (isBest) storageSet(bestKey(), JSON.stringify({ moves, time: elapsed }));

  endText.textContent = `${moves} moves · ${formatTime(elapsed)}`;
  endBest.textContent = isBest
    ? "New best!"
    : `Best: ${best.moves} moves · ${formatTime(best.time)}`;
  renderBest();
  Sound.win();
  // Let the last card finish flipping before the dialog appears
  setTimeout(() => {
    if (found === cards.length / 2) endOverlay.hidden = false;
  }, 500);
}

boardEl.addEventListener("pointerdown", e => {
  if (e.pointerType === "mouse" && e.button !== 0) return;
  const el = e.target.closest(".card");
  if (!el) return;
  flip(Number(el.dataset.index));
});

document.getElementById("reset").addEventListener("click", newGame);
document.getElementById("endReset").addEventListener("click", newGame);
for (const s in sizeButtons) {
  sizeButtons[s].addEventListener("click", () => {
    size = Number(s);
    storageSet(SIZE_KEY, String(size));
    newGame();
  });
}

if (storageGet(SIZE_KEY) === "6") size = 6;
newGame();

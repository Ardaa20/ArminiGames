// Chess — two players on the same device (1v1)
// Board: board[r][c], r=0 is black's back rank (rank 8), r=7 is white's (rank 1).
// Pieces are strings like "wp", "bk": first letter is color (w/b), second is type (p n b r q k).

const GLYPH = { k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟" };
const TEXT_STYLE = "︎"; // prevents rendering as emoji
const NAME = { w: "White", b: "Black" };

const KNIGHT = [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]];
const ORTH = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const DIAG = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
const ALL = [...ORTH, ...DIAG];

const inside = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;
const other = (col) => (col === "w" ? "b" : "w");

function startState() {
  const back = "rnbqkbnr";
  const board = Array.from({ length: 8 }, () => Array(8).fill(null));
  for (let c = 0; c < 8; c++) {
    board[0][c] = "b" + back[c];
    board[1][c] = "bp";
    board[6][c] = "wp";
    board[7][c] = "w" + back[c];
  }
  return {
    board,
    turn: "w",
    castle: { wk: true, wq: true, bk: true, bq: true },
    ep: null,       // en passant target square [r, c]
    last: null,     // last move
    captured: { w: [], b: [] }, // captured.w = pieces taken by white
  };
}

// ---------- Rules ----------

function attacked(b, r, c, by) {
  const d = by === "w" ? 1 : -1;
  for (const dc of [-1, 1]) {
    const rr = r + d, cc = c + dc;
    if (inside(rr, cc) && b[rr][cc] === by + "p") return true;
  }
  for (const [dr, dc] of KNIGHT) {
    const rr = r + dr, cc = c + dc;
    if (inside(rr, cc) && b[rr][cc] === by + "n") return true;
  }
  for (const [dr, dc] of ALL) {
    const rr = r + dr, cc = c + dc;
    if (inside(rr, cc) && b[rr][cc] === by + "k") return true;
  }
  const ray = (dirs, types) => {
    for (const [dr, dc] of dirs) {
      let rr = r + dr, cc = c + dc;
      while (inside(rr, cc)) {
        const p = b[rr][cc];
        if (p) {
          if (p[0] === by && types.includes(p[1])) return true;
          break;
        }
        rr += dr; cc += dc;
      }
    }
    return false;
  };
  return ray(DIAG, "bq") || ray(ORTH, "rq");
}

function findKing(b, col) {
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++)
      if (b[r][c] === col + "k") return [r, c];
  return null;
}

function inCheck(s, col) {
  const [r, c] = findKing(s.board, col);
  return attacked(s.board, r, c, other(col));
}

function pseudoMoves(s, r, c) {
  const b = s.board, p = b[r][c], me = p[0], t = p[1], out = [];
  const add = (tr, tc, extra = {}) => out.push({ fr: r, fc: c, tr, tc, ...extra });
  const enemy = (rr, cc) => b[rr][cc] && b[rr][cc][0] !== me;

  if (t === "p") {
    const d = me === "w" ? -1 : 1, start = me === "w" ? 6 : 1;
    if (inside(r + d, c) && !b[r + d][c]) {
      add(r + d, c);
      if (r === start && !b[r + 2 * d][c]) add(r + 2 * d, c, { double: true });
    }
    for (const dc of [-1, 1]) {
      const tr = r + d, tc = c + dc;
      if (!inside(tr, tc)) continue;
      if (enemy(tr, tc)) add(tr, tc);
      else if (s.ep && s.ep[0] === tr && s.ep[1] === tc) add(tr, tc, { ep: true });
    }
  } else if (t === "n" || t === "k") {
    for (const [dr, dc] of t === "n" ? KNIGHT : ALL) {
      const tr = r + dr, tc = c + dc;
      if (inside(tr, tc) && (!b[tr][tc] || enemy(tr, tc))) add(tr, tc);
    }
    if (t === "k") {
      const row = me === "w" ? 7 : 0, en = other(me);
      if (r === row && c === 4 && !attacked(b, row, 4, en)) {
        if (s.castle[me + "k"] && !b[row][5] && !b[row][6] && b[row][7] === me + "r" &&
            !attacked(b, row, 5, en) && !attacked(b, row, 6, en))
          add(row, 6, { castle: "k" });
        if (s.castle[me + "q"] && !b[row][1] && !b[row][2] && !b[row][3] && b[row][0] === me + "r" &&
            !attacked(b, row, 3, en) && !attacked(b, row, 2, en))
          add(row, 2, { castle: "q" });
      }
    }
  } else {
    const dirs = t === "b" ? DIAG : t === "r" ? ORTH : ALL;
    for (const [dr, dc] of dirs) {
      let tr = r + dr, tc = c + dc;
      while (inside(tr, tc)) {
        if (!b[tr][tc]) add(tr, tc);
        else { if (enemy(tr, tc)) add(tr, tc); break; }
        tr += dr; tc += dc;
      }
    }
  }
  return out;
}

function applyMove(s, m, promo = "q") {
  const n = JSON.parse(JSON.stringify(s));
  const b = n.board, p = b[m.fr][m.fc], me = p[0];
  let cap = b[m.tr][m.tc];

  if (m.ep) { cap = b[m.fr][m.tc]; b[m.fr][m.tc] = null; }
  b[m.tr][m.tc] = p;
  b[m.fr][m.fc] = null;

  if (m.castle === "k") { b[m.tr][5] = b[m.tr][7]; b[m.tr][7] = null; }
  if (m.castle === "q") { b[m.tr][3] = b[m.tr][0]; b[m.tr][0] = null; }
  if (p[1] === "p" && (m.tr === 0 || m.tr === 7)) b[m.tr][m.tc] = me + promo;

  if (p[1] === "k") { n.castle[me + "k"] = false; n.castle[me + "q"] = false; }
  const corners = { "7,0": "wq", "7,7": "wk", "0,0": "bq", "0,7": "bk" };
  for (const key of [m.fr + "," + m.fc, m.tr + "," + m.tc])
    if (corners[key]) n.castle[corners[key]] = false;

  n.ep = m.double ? [(m.fr + m.tr) / 2, m.fc] : null;
  if (cap) n.captured[me].push(cap);
  n.turn = other(me);
  n.last = m;
  return n;
}

function legalMoves(s, r, c) {
  const me = s.board[r][c][0];
  return pseudoMoves(s, r, c).filter((m) => !inCheck(applyMove(s, m), me));
}

function hasAnyMove(s) {
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++) {
      const p = s.board[r][c];
      if (p && p[0] === s.turn && legalMoves(s, r, c).length) return true;
    }
  return false;
}

function insufficientMaterial(s) {
  const rest = s.board.flat().filter((p) => p && p[1] !== "k");
  return rest.length === 0 || (rest.length === 1 && "bn".includes(rest[0][1]));
}

// ---------- UI ----------

const boardEl = document.getElementById("board");
const statusEl = document.getElementById("status");
const takenTop = document.getElementById("takenTop");
const takenBottom = document.getElementById("takenBottom");
const promoOverlay = document.getElementById("promoOverlay");
const promoChoices = document.getElementById("promoChoices");
const endOverlay = document.getElementById("endOverlay");

let state, history, selected, targets, over;

const pieceHTML = (p) => `<span class="pc ${p[0]}">${GLYPH[p[1]]}${TEXT_STYLE}</span>`;

function newGame() {
  state = startState();
  history = [];
  selected = null;
  targets = [];
  over = false;
  endOverlay.hidden = true;
  promoOverlay.hidden = true;
  render();
}

function render() {
  const check = inCheck(state, state.turn) ? findKing(state.board, state.turn) : null;
  const L = state.last;
  boardEl.innerHTML = "";

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const sq = document.createElement("div");
      const p = state.board[r][c];
      const cls = ["sq", (r + c) % 2 ? "dark" : "light"];
      if (L && ((L.fr === r && L.fc === c) || (L.tr === r && L.tc === c))) cls.push("last");
      if (selected && selected[0] === r && selected[1] === c) cls.push("sel");
      if (check && check[0] === r && check[1] === c) cls.push("check");
      const t = targets.find((m) => m.tr === r && m.tc === c);
      if (t) cls.push("target", p || t.ep ? "capture" : "");
      sq.className = cls.join(" ").trim();

      let html = p ? pieceHTML(p) : "";
      if (c === 0) html += `<span class="coord rank">${8 - r}</span>`;
      if (r === 7) html += `<span class="coord file">${"abcdefgh"[c]}</span>`;
      sq.innerHTML = html;
      sq.addEventListener("click", () => onSquare(r, c));
      boardEl.appendChild(sq);
    }
  }

  const order = "qrbnp";
  const sortTaken = (arr) => [...arr].sort((a, b) => order.indexOf(a[1]) - order.indexOf(b[1]));
  takenTop.innerHTML = sortTaken(state.captured.b).map(pieceHTML).join("");
  takenBottom.innerHTML = sortTaken(state.captured.w).map(pieceHTML).join("");

  if (!over) {
    const dot = `<span class="dot ${state.turn}"></span>`;
    statusEl.innerHTML = dot + (check ? "Check! " : "") + `${NAME[state.turn]} to move`;
  }
  document.getElementById("undo").disabled = history.length === 0;
}

function onSquare(r, c) {
  if (over || !promoOverlay.hidden) return;

  const move = targets.find((m) => m.tr === r && m.tc === c);
  if (selected && move) return tryMove(move);

  const p = state.board[r][c];
  if (p && p[0] === state.turn && !(selected && selected[0] === r && selected[1] === c)) {
    selected = [r, c];
    targets = legalMoves(state, r, c);
  } else {
    selected = null;
    targets = [];
  }
  render();
}

function tryMove(m) {
  const p = state.board[m.fr][m.fc];
  if (p[1] === "p" && (m.tr === 0 || m.tr === 7)) {
    promoChoices.innerHTML = "";
    for (const t of "qrbn") {
      const btn = document.createElement("button");
      btn.innerHTML = pieceHTML(p[0] + t);
      btn.addEventListener("click", () => { promoOverlay.hidden = true; commit(m, t); });
      promoChoices.appendChild(btn);
    }
    promoOverlay.hidden = false;
    return;
  }
  commit(m);
}

function commit(m, promo) {
  history.push(state);
  state = applyMove(state, m, promo);
  selected = null;
  targets = [];
  render();
  checkEnd();
}

function checkEnd() {
  let title = null, text = "";
  if (!hasAnyMove(state)) {
    if (inCheck(state, state.turn)) {
      title = "Checkmate";
      text = `${NAME[other(state.turn)]} wins.`;
    } else {
      title = "Stalemate";
      text = "The game is a draw.";
    }
  } else if (insufficientMaterial(state)) {
    title = "Draw";
    text = "Not enough material to checkmate.";
  }
  if (!title) return;

  over = true;
  statusEl.textContent = title;
  document.getElementById("endTitle").textContent = title;
  document.getElementById("endText").textContent = text;
  endOverlay.hidden = false;
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

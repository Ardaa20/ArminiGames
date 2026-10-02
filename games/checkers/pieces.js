// Flat, simple checkers pieces drawn as SVG (viewBox 0 0 100 100).
// Main shapes use the piece fill; ".d" parts are small details in a contrasting color.

const DISC = `
  <circle cx="50" cy="50" r="38"/>
  <circle class="d line" cx="50" cy="50" r="26"/>`;

const CROWN = `<path class="d" d="M34 60 L31 40 L41 48 L50 35 L59 48 L69 40 L66 60 Z"/>`;

// p is "wm", "wk", "bm" or "bk": color (w/b) + type (m = man, k = king)
function pieceSVG(p, extraClass = "") {
  const inner = p[1] === "k" ? `<circle cx="50" cy="50" r="38"/>${CROWN}` : DISC;
  return `<svg class="piece ${p[0]} ${extraClass}" viewBox="0 0 100 100" aria-hidden="true">${inner}</svg>`;
}

// Flat draughts pieces drawn as SVG (viewBox 0 0 100 100).
// A man is a disc with an inner ring; a king (dama) has a small crown on top.
// ".d" parts are details in a contrasting color.

const PIECE_SHAPES = {
  m: `
    <circle cx="50" cy="50" r="40"/>
    <circle class="d line" cx="50" cy="50" r="26"/>`,

  k: `
    <circle cx="50" cy="50" r="40"/>
    <path class="d" d="M30 64 L27 38 L40 48 L50 31 L60 48 L73 38 L70 64 Z"/>`,
};

function pieceSVG(p, extraClass = "") {
  return `<svg class="piece ${p[0]} ${extraClass}" viewBox="0 0 100 100" aria-hidden="true">${PIECE_SHAPES[p[1]]}</svg>`;
}

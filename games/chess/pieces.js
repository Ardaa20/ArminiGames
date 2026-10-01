// Flat, simple chess pieces drawn as SVG (viewBox 0 0 100 100).
// Main shapes use the piece fill; ".d" parts are small details in a contrasting color.

const BASE = `<rect x="22" y="78" width="56" height="10" rx="4"/>`;

const PIECE_SHAPES = {
  p: `
    <path d="M37 78 L43 48 L57 48 L63 78 Z"/>
    <rect x="36" y="43" width="28" height="7" rx="3"/>
    <circle cx="50" cy="30" r="13"/>`,

  r: `
    <path d="M34 78 L37 40 L63 40 L66 78 Z"/>
    <path d="M28 40 L28 18 L38 18 L38 26 L45 26 L45 18 L55 18 L55 26 L62 26 L62 18 L72 18 L72 40 Z"/>`,

  n: `
    <path d="M34 78 C34 66 42 60 47 54 L34 53 C26 52 23 45 28 40 L43 26 L45 13 L54 21 C68 25 75 42 70 60 L68 78 Z"/>
    <circle class="d" cx="44" cy="34" r="3"/>`,

  b: `
    <path d="M38 78 Q40 63 44 56 L56 56 Q60 63 62 78 Z"/>
    <path d="M50 20 C66 30 66 47 57 56 L43 56 C34 47 34 30 50 20 Z"/>
    <circle cx="50" cy="15" r="5"/>
    <path class="d line" d="M55 32 L46 42"/>`,

  q: `
    <path d="M36 78 L40 52 L60 52 L64 78 Z"/>
    <path d="M31 52 L25 27 L39 39 L50 22 L61 39 L75 27 L69 52 Z"/>
    <circle cx="25" cy="24" r="5"/>
    <circle cx="50" cy="18" r="5"/>
    <circle cx="75" cy="24" r="5"/>`,

  k: `
    <path d="M36 78 L40 50 L60 50 L64 78 Z"/>
    <path d="M31 50 C26 36 40 28 50 36 C60 28 74 36 69 50 Z"/>
    <path d="M46 34 L46 23 L40 23 L40 16 L46 16 L46 8 L54 8 L54 16 L60 16 L60 23 L54 23 L54 34 Z"/>`,
};

function pieceSVG(p, extraClass = "") {
  return `<svg class="piece ${p[0]} ${extraClass}" viewBox="0 0 100 100" aria-hidden="true">${BASE}${PIECE_SHAPES[p[1]]}</svg>`;
}

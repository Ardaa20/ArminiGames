// Card face symbols: simple flat shapes in a 40x40 viewBox.
// No colors here — the color comes from CSS (fill: currentColor).
const SYMBOLS = [
  // circle
  `<circle cx="20" cy="20" r="11"/>`,
  // triangle
  `<path d="M20 9 L32 30 H8 Z"/>`,
  // square
  `<rect x="9" y="9" width="22" height="22" rx="4"/>`,
  // star
  `<path d="M20 8 L23.23 16.55 L32.36 16.98 L25.23 22.7 L27.64 31.52 L20 26.5 L12.36 31.52 L14.77 22.7 L7.64 16.98 L16.77 16.55 Z"/>`,
  // moon
  `<path d="M23 7 A13 13 0 1 0 33 27 A10 10 0 0 1 23 7 Z"/>`,
  // drop
  `<path d="M20 7 C24 13 30 18 30 24 A10 10 0 0 1 10 24 C10 18 16 13 20 7 Z"/>`,
  // leaf
  `<path d="M9 31 C9 16 17 9 31 9 C31 23 24 31 9 31 Z"/>`,
  // heart
  `<path d="M20 32 C9 25 7 18 9 14 C12 8 18 9 20 14 C22 9 28 8 31 14 C33 18 31 25 20 32 Z"/>`,
  // diamond
  `<path d="M20 7 L32 20 L20 33 L8 20 Z"/>`,
  // hexagon
  `<path d="M14 9 H26 L32 20 L26 31 H14 L8 20 Z"/>`,
  // plus
  `<path d="M16 8 H24 V16 H32 V24 H24 V32 H16 V24 H8 V16 H16 Z"/>`,
  // ring
  `<path fill-rule="evenodd" d="M8 20 A12 12 0 1 0 32 20 A12 12 0 1 0 8 20 Z M14 20 A6 6 0 1 1 26 20 A6 6 0 1 1 14 20 Z"/>`,
  // cloud
  `<path d="M13 29 A6 6 0 0 1 11.5 17.2 A8.5 8.5 0 0 1 27 15 A7 7 0 0 1 28 29 Z"/>`,
  // bolt
  `<path d="M23 6 L10 23 H19 L16 34 L30 16 H21 Z"/>`,
  // clover
  `<circle cx="20" cy="13" r="6.5"/><circle cx="27" cy="20" r="6.5"/><circle cx="20" cy="27" r="6.5"/><circle cx="13" cy="20" r="6.5"/><circle cx="20" cy="20" r="5"/>`,
  // arrow
  `<path d="M20 7 L32 19 H25 V33 H15 V19 H8 Z"/>`,
  // house
  `<path d="M20 7 L33 19 H29 V32 H11 V19 H7 Z"/>`,
  // bowl
  `<path d="M8 15 H32 A12 12 0 0 1 8 15 Z"/>`,
];

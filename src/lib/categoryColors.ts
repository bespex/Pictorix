/**
 * One distinct colour per category, in the order the categories were created. Tableau 10 - designed for
 * exactly this; beyond ten categories the palette repeats.
 */
const PALETTE = [
  "#4e79a7",
  "#f28e2b",
  "#e15759",
  "#76b7b2",
  "#59a14f",
  "#edc948",
  "#b07aa1",
  "#ff9da7",
  "#9c755f",
  "#bab0ac",
];

export function categoryColor(categories: readonly string[], category: string): string {
  const idx = categories.indexOf(category);
  return PALETTE[(idx < 0 ? categories.length : idx) % PALETTE.length];
}

/** Black or white, whichever stays readable on the given background. */
export function textColorOn(hex: string): string {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.6 ? "#1a1a1a" : "#ffffff";
}

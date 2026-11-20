export type Mode = "order" | "simple-knockout" | "full-knockout" | "rate" | "categorize";

export const MODES: readonly Mode[] = ["order", "simple-knockout", "full-knockout", "rate", "categorize"];

export function isMode(value: string | null | undefined): value is Mode {
  return !!value && (MODES as readonly string[]).includes(value);
}

/** Pairwise modes: the user decides which of two images comes first. */
export function isCompareMode(mode: Mode): boolean {
  return mode === "order" || mode === "simple-knockout" || mode === "full-knockout";
}

export interface ImageFile {
  path: string;
  name: string;
}

/** A translatable progress text, e.g. `{ key: "stage.order", args: [12] }`. */
export interface Stage {
  key: string;
  args: (string | number)[];
}

export interface PairQuestion {
  kind: "pair";
  left: ImageFile;
  right: ImageFile;
  stage: Stage;
}

export interface SingleQuestion {
  kind: "single";
  image: ImageFile;
  stage: Stage;
}

export type Question = PairQuestion | SingleQuestion;

/** The result for one image: its placement, rating or category. */
export interface Outcome {
  file: ImageFile;
  /** Placement ("1", "2", ...), rating ("1".."10") or category name. */
  value: string;
}

/** Sorts like a human would: "img-2" before "img-10", case-insensitive. */
export function naturalCompare(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }) || (a < b ? -1 : a > b ? 1 : 0);
}

export function sortImages(files: readonly ImageFile[]): ImageFile[] {
  return [...files].sort((a, b) => naturalCompare(a.name, b.name));
}

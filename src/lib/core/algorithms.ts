import type { ImageFile, Stage } from "./types";

/**
 * Asks the user which of two images comes first and returns that image.
 *
 * The algorithms are written as plain synchronous code against this callback. The session runs them
 * again with the answers given so far and stops at the first unanswered question. That keeps the
 * algorithms readable and gives undo, restart and resume for free: they are just shorter answer lists.
 */
export type Ask = (a: ImageFile, b: ImageFile, stage: Stage) => ImageFile;

export interface Placement {
  file: ImageFile;
  /** 1 is best. Several images can share a placement in the simple knockout. */
  place: number;
}

/**
 * Bottom-up merge sort: about n·log2(n) comparisons, e.g. 16 for 8 images and 560 for 100.
 * Same comparison sequence as iorg 1.x, so its expectations and tests carry over.
 */
export function mergeSortOrder(files: readonly ImageFile[], ask: Ask): Placement[] {
  const list = [...files];
  const n = list.length;
  let comparisons = 0;
  for (let block = 1; block < n; block *= 2) {
    for (let leftStart = 0; leftStart < n - block; leftStart += 2 * block) {
      const mid = leftStart + block - 1;
      const rightEnd = Math.min(leftStart + 2 * block - 1, n - 1);
      const left = list.slice(leftStart, mid + 1);
      const right = list.slice(mid + 1, rightEnd + 1);
      let i = 0;
      let j = 0;
      let k = leftStart;
      while (i < left.length && j < right.length) {
        const winner = ask(left[i], right[j], { key: "stage.order", args: [comparisons] });
        comparisons++;
        list[k++] = winner === left[i] ? left[i++] : right[j++];
      }
      while (i < left.length) list[k++] = left[i++];
      while (j < right.length) list[k++] = right[j++];
    }
  }
  return list.map((file, idx) => ({ file, place: idx + 1 }));
}

/**
 * Knockout tournament. Each round's winners form the next list; an odd image out plays against
 * the first image of its round again.
 *
 * - simple: ends when one image is left; the others are grouped by the round they dropped out in.
 * - full: keeps playing every list with more than one image until all placements are unique.
 */
export function knockout(files: readonly ImageFile[], ask: Ask, full: boolean): Placement[] {
  const lists: ImageFile[][] = [[...files], []];
  const total = files.length;
  let listIdx = 0;
  let elementIdx = 0;

  const first = (): ImageFile | null => {
    for (;;) {
      const current = lists[listIdx];
      if (elementIdx < current.length) {
        return current[elementIdx++];
      }
      let next = listIdx + 1;
      if (full) {
        next = 0;
        while (next < lists.length && lists[next].length <= 1) next++;
      }
      const finished = full ? next >= lists.length : lists[next].length <= 1;
      if (finished) {
        return null;
      }
      lists.splice(next + 1, 0, []);
      listIdx = next;
      elementIdx = 0;
    }
  };

  const second = (): ImageFile => {
    const current = lists[listIdx];
    return elementIdx < current.length ? current[elementIdx++] : current[0];
  };

  for (;;) {
    const a = first();
    if (!a) break;
    const b = second();
    const stage: Stage = full
      ? { key: "stage.fullKnockout", args: [listIdx, total - listIdx] }
      : { key: "stage.simpleKnockout", args: [listIdx + 1] };
    const winner = ask(a, b, stage);
    const current = lists[listIdx];
    lists[listIdx + 1].push(winner);
    current.splice(current.indexOf(winner), 1);
    elementIdx--;
  }

  // the last list holds the final winner, so walk backwards
  const placements: Placement[] = [];
  let place = 1;
  for (let idx = lists.length - 1; idx >= 0; idx--) {
    for (const file of lists[idx]) {
      placements.push({ file, place });
    }
    place += lists[idx].length;
  }
  return placements;
}

export type CompareAlgorithm = (files: readonly ImageFile[], ask: Ask) => Placement[];

export const simpleKnockout: CompareAlgorithm = (files, ask) => knockout(files, ask, false);
export const fullKnockout: CompareAlgorithm = (files, ask) => knockout(files, ask, true);

/** Small deterministic random generator (mulberry32), so estimates do not flicker. */
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Counts the votes an algorithm needs if the user decides at random. */
export function simulateVotes(algorithm: CompareAlgorithm, files: readonly ImageFile[], seed: number): number {
  const random = seededRandom(seed);
  let votes = 0;
  algorithm(files, (a, b) => {
    votes++;
    return random() < 0.5 ? a : b;
  });
  return votes;
}

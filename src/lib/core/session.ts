import {
  fullKnockout,
  mergeSortOrder,
  simpleKnockout,
  simulateVotes,
  seededRandom,
  type CompareAlgorithm,
  type Placement,
} from "./algorithms";
import { isCompareMode, isMode, sortImages, type ImageFile, type Mode, type Outcome, type Question } from "./types";

export const DEFAULT_CATEGORY = "default";
export const MAX_RATING = 10;

const ALGORITHMS: Partial<Record<Mode, CompareAlgorithm>> = {
  order: mergeSortOrder,
  "simple-knockout": simpleKnockout,
  "full-knockout": fullKnockout,
};

/** What is stored on disk after every vote, so a session survives closing the app. */
export interface SessionData {
  version: 1;
  folder: string;
  mode: Mode;
  /** File names in voting order; the session only resumes if exactly these files are still there. */
  files: string[];
  /** Compare modes: the name of the image chosen as first. Rate and categorize: the value per image. */
  answers: string[];
  categories: string[];
  savedAt: number;
}

export interface Progress {
  done: number;
  /** Votes still expected; exact for rate and categorize, an estimate for the compare modes. */
  remaining: number;
}

class NeedsAnswer {
  constructor(readonly question: Question) {}
}

interface Replay {
  question: Question | null;
  placements: Placement[] | null;
}

/**
 * A voting session. It only stores the answers; everything else is derived by replaying them,
 * which makes undo, restart and resuming trivially correct in every mode.
 */
export class Session {
  readonly files: ImageFile[];
  private answers: string[];
  private categoryList: string[];
  private replay: Replay;

  constructor(
    readonly mode: Mode,
    files: readonly ImageFile[],
    answers: readonly string[] = [],
    categories: readonly string[] = [],
  ) {
    this.files = sortImages(files);
    this.answers = [...answers];
    this.categoryList = [...categories];
    this.replay = this.run();
  }

  static minimumImages(mode: Mode): number {
    return isCompareMode(mode) ? 2 : 1;
  }

  get question(): Question | null {
    return this.replay.question;
  }

  get finished(): boolean {
    return this.replay.question === null;
  }

  get categories(): readonly string[] {
    return this.categoryList;
  }

  get voteCount(): number {
    return this.answers.length;
  }

  get canUndo(): boolean {
    return this.answers.length > 0;
  }

  /**
   * Compare modes: `value` is the path of the image that comes first.
   * Rate: "1".."10". Categorize: the category name (created if new).
   */
  vote(value: string): void {
    const question = this.replay.question;
    if (!question) return;
    if (question.kind === "pair") {
      const winner = [question.left, question.right].find((f) => f.path === value);
      if (!winner) throw new Error(`Not part of the current pair: ${value}`);
      this.answers.push(winner.name);
    } else {
      if (this.mode === "categorize") this.addCategory(value);
      this.answers.push(value);
    }
    this.replay = this.run();
  }

  /** The question that would follow this vote, without casting it - used to preload images. */
  peek(value: string): Question | null {
    const before = this.answers.length;
    const categories = [...this.categoryList];
    try {
      this.vote(value);
      return this.question;
    } finally {
      if (this.answers.length > before) this.undo();
      this.categoryList = categories;
    }
  }

  undo(): boolean {
    if (!this.canUndo) return false;
    this.answers.pop();
    this.replay = this.run();
    return true;
  }

  restart(): void {
    this.answers = [];
    this.replay = this.run();
  }

  /** Adds a category without voting. Returns false if it exists already. */
  addCategory(name: string): boolean {
    if (this.categoryList.includes(name)) return false;
    this.categoryList.push(name);
    return true;
  }

  /** Rate and categorize: the images that got this value so far, oldest first. */
  assigned(value: string): ImageFile[] {
    if (isCompareMode(this.mode)) return [];
    return this.answers.flatMap((answer, idx) => (answer === value ? [this.files[idx]] : []));
  }

  /** How many images per value so far, e.g. for the counters on the category chips. */
  counts(): Map<string, number> {
    const counts = new Map<string, number>();
    if (!isCompareMode(this.mode)) {
      for (const answer of this.answers) counts.set(answer, (counts.get(answer) ?? 0) + 1);
    }
    return counts;
  }

  progress(): Progress {
    const done = this.answers.length;
    if (!isCompareMode(this.mode)) {
      return { done, remaining: this.files.length - done };
    }
    if (this.finished) return { done, remaining: 0 };
    // play the rest with random decisions; averaged, so the number moves smoothly
    const runs = 3;
    let extra = 0;
    for (let seed = 1; seed <= runs; seed++) {
      extra += this.simulateRest(seed * 7919 + done);
    }
    return { done, remaining: Math.max(1, Math.round(extra / runs)) };
  }

  /** The final result, best placement first; only complete once the session is finished. */
  outcomes(): Outcome[] {
    if (isCompareMode(this.mode)) {
      return (this.replay.placements ?? []).map((p) => ({ file: p.file, value: String(p.place) }));
    }
    return this.files.slice(0, this.answers.length).map((file, idx) => ({ file, value: this.answers[idx] }));
  }

  toData(folder: string): SessionData {
    return {
      version: 1,
      folder,
      mode: this.mode,
      files: this.files.map((f) => f.name),
      answers: [...this.answers],
      categories: [...this.categoryList],
      savedAt: Date.now(),
    };
  }

  /** Restores a saved session, or returns null if the folder content changed since. */
  static fromData(data: SessionData, files: readonly ImageFile[]): Session | null {
    if (data?.version !== 1 || !isMode(data.mode)) return null;
    const sorted = sortImages(files);
    if (sorted.length !== data.files.length || sorted.some((f, idx) => f.name !== data.files[idx])) {
      return null;
    }
    try {
      const session = new Session(data.mode, sorted, data.answers, data.categories);
      // answers that do not fit (corrupt file) would have thrown; too many answers means a corrupt file too
      return session.answers.length === data.answers.length ? session : null;
    } catch {
      return null;
    }
  }

  private run(): Replay {
    const algorithm = ALGORITHMS[this.mode];
    if (!algorithm) {
      const idx = this.answers.length;
      if (idx > this.files.length) throw new Error("More answers than images");
      return {
        question:
          idx < this.files.length
            ? {
                kind: "single",
                image: this.files[idx],
                stage: { key: "stage.single", args: [idx + 1, this.files.length] },
              }
            : null,
        placements: null,
      };
    }
    let next = 0;
    try {
      const placements = algorithm(this.files, (a, b, stage) => {
        if (next >= this.answers.length) throw new NeedsAnswer({ kind: "pair", left: a, right: b, stage });
        const answer = this.answers[next++];
        if (answer === a.name) return a;
        if (answer === b.name) return b;
        throw new Error(`Answer '${answer}' does not fit the pair ${a.name} / ${b.name}`);
      });
      if (next < this.answers.length) throw new Error("More answers than questions");
      return { question: null, placements };
    } catch (e) {
      if (e instanceof NeedsAnswer) return { question: e.question, placements: null };
      throw e;
    }
  }

  private simulateRest(seed: number): number {
    const algorithm = ALGORITHMS[this.mode]!;
    const random = seededRandom(seed);
    let next = 0;
    let extra = 0;
    algorithm(this.files, (a, b) => {
      if (next < this.answers.length) {
        return this.answers[next++] === a.name ? a : b;
      }
      extra++;
      return random() < 0.5 ? a : b;
    });
    return extra;
  }
}

/** The expected number of votes for the start screen, simulated instead of guessed. */
export function estimateVotes(mode: Mode, imageCount: number): number {
  const algorithm = ALGORITHMS[mode];
  if (!algorithm) return imageCount;
  if (imageCount < 2) return 0;
  const files = Array.from({ length: imageCount }, (_, idx) => ({ path: String(idx), name: String(idx) }));
  const runs = imageCount > 400 ? 1 : 3;
  let total = 0;
  for (let seed = 1; seed <= runs; seed++) total += simulateVotes(algorithm, files, seed);
  return Math.round(total / runs);
}

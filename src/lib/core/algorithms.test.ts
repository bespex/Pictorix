import { describe, expect, it } from "vitest";
import { estimateVotes, Session } from "./session";
import { seededRandom } from "./algorithms";
import type { ImageFile, PairQuestion } from "./types";

/** Files img-01.jpg ... img-NN.jpg in a reproducible random order (like VoterTestSupport in iorg 1.x). */
function shuffledFiles(count: number, seed: number): ImageFile[] {
  const files = Array.from({ length: count }, (_, i) => {
    const name = `img-${String(i + 1).padStart(2, "0")}.jpg`;
    return { path: `/photos/${name}`, name };
  });
  const random = seededRandom(seed);
  for (let i = files.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [files[i], files[j]] = [files[j], files[i]];
  }
  return files;
}

/** The simulated user prefers the lower number: img-03 beats img-07. */
const rank = (file: ImageFile) => Number(file.name.slice(4, 6));
const better = (q: PairQuestion) => (rank(q.left) <= rank(q.right) ? q.left : q.right);
const worse = (q: PairQuestion) => (better(q) === q.left ? q.right : q.left);

function pair(session: Session): PairQuestion {
  const q = session.question;
  if (q?.kind !== "pair") throw new Error("expected a pair");
  return q;
}

function voteToTheEnd(session: Session): number {
  let votes = 0;
  while (!session.finished) {
    session.vote(better(pair(session)).path);
    votes++;
  }
  return votes;
}

describe("order (merge sort)", () => {
  it.each([2, 3, 4, 5, 7, 8, 9, 16, 17, 33])("finds the complete order of %i images", (count) => {
    const session = new Session("order", shuffledFiles(count, count));
    const votes = voteToTheEnd(session);

    const result = session.outcomes();
    expect(result).toHaveLength(count);
    result.forEach((o, i) => {
      expect(rank(o.file)).toBe(i + 1);
      expect(o.value).toBe(String(i + 1));
    });
    expect(votes).toBeLessThanOrEqual(count * Math.ceil(Math.log2(count)));
  });

  it("undo reverts a wrong vote", () => {
    const session = new Session("order", shuffledFiles(6, 42));
    const first = pair(session);
    session.vote(worse(first).path);
    session.undo();

    expect(pair(session)).toEqual(first);
    voteToTheEnd(session);
    session.outcomes().forEach((o, i) => expect(rank(o.file)).toBe(i + 1));
  });

  it("restart begins with the first comparison", () => {
    const session = new Session("order", shuffledFiles(5, 7));
    const first = pair(session);
    session.vote(better(first).path);
    session.restart();
    expect(pair(session)).toEqual(first);
    expect(session.voteCount).toBe(0);
  });

  it("counts the comparisons in the stage", () => {
    const session = new Session("order", shuffledFiles(8, 1));
    session.vote(better(pair(session)).path);
    session.vote(better(pair(session)).path);
    expect(pair(session).stage).toEqual({ key: "stage.order", args: [2] });
  });
});

describe("knockout", () => {
  it.each([2, 3, 4, 5, 7, 8, 13, 16])("simple knockout finds the winner of %i images", (count) => {
    const session = new Session("simple-knockout", shuffledFiles(count, count));
    voteToTheEnd(session);
    const result = session.outcomes();
    expect(result).toHaveLength(count);
    expect(rank(result[0].file)).toBe(1);
    expect(result[0].value).toBe("1");
    expect(result.filter((o) => o.value === "1")).toHaveLength(1);
  });

  it.each([2, 3, 4, 5, 7, 8, 13, 16])("full knockout places every one of %i images", (count) => {
    const session = new Session("full-knockout", shuffledFiles(count, count));
    voteToTheEnd(session);
    const result = session.outcomes();
    expect(rank(result[0].file)).toBe(1);
    result.forEach((o, i) => expect(o.value).toBe(String(i + 1)));
  });

  it("supports undo, which iorg 1.x could not", () => {
    const session = new Session("full-knockout", shuffledFiles(7, 3));
    session.vote(better(pair(session)).path);
    const second = pair(session);
    session.vote(worse(second).path);
    session.undo();
    expect(pair(session)).toEqual(second);
  });

  it("never pairs an image with itself", () => {
    for (const count of [3, 5, 6, 9, 11]) {
      for (const mode of ["simple-knockout", "full-knockout"] as const) {
        const session = new Session(mode, shuffledFiles(count, 99));
        while (!session.finished) {
          const q = pair(session);
          expect(q.left.path).not.toBe(q.right.path);
          session.vote(better(q).path);
        }
      }
    }
  });
});

describe("rate and categorize", () => {
  const files = [
    { path: "/p/b.jpg", name: "b.jpg" },
    { path: "/p/a.jpg", name: "a.jpg" },
  ];

  it("asks for every image in natural order", () => {
    const session = new Session("rate", [
      { path: "/p/img10.jpg", name: "img10.jpg" },
      { path: "/p/img2.jpg", name: "img2.jpg" },
    ]);
    expect(session.question).toMatchObject({ kind: "single", image: { name: "img2.jpg" } });
  });

  it("collects ratings and categories", () => {
    const session = new Session("categorize", files);
    session.vote("family");
    expect(session.categories).toEqual(["family"]);
    expect(session.assigned("family").map((f) => f.name)).toEqual(["a.jpg"]);
    session.vote("trip");
    expect(session.finished).toBe(true);
    expect(session.outcomes().map((o) => o.value)).toEqual(["family", "trip"]);
  });

  it("undo removes the image from its category but keeps the category", () => {
    const session = new Session("categorize", files);
    session.vote("family");
    session.undo();
    expect(session.assigned("family")).toEqual([]);
    expect(session.categories).toEqual(["family"]);
    expect(session.question).toMatchObject({ image: { name: "a.jpg" } });
  });
});

describe("saving and resuming", () => {
  it("resumes exactly where it stopped", () => {
    const files = shuffledFiles(9, 5);
    const session = new Session("order", files);
    for (let i = 0; i < 6; i++) session.vote(better(pair(session)).path);

    const restored = Session.fromData(JSON.parse(JSON.stringify(session.toData("/photos"))), files)!;
    expect(restored.voteCount).toBe(6);
    expect(restored.question).toEqual(session.question);
  });

  it("refuses to resume when the folder changed", () => {
    const files = shuffledFiles(4, 5);
    const data = new Session("order", files).toData("/photos");
    expect(Session.fromData(data, files.slice(1))).toBeNull();
    expect(Session.fromData({ ...data, answers: ["nonsense.jpg"] }, files)).toBeNull();
  });
});

describe("estimates", () => {
  it("are close to the real number of votes", () => {
    expect(estimateVotes("rate", 50)).toBe(50);
    expect(estimateVotes("simple-knockout", 16)).toBe(15);
    const order = estimateVotes("order", 100);
    expect(order).toBeGreaterThan(450);
    expect(order).toBeLessThan(600);
    expect(estimateVotes("order", 1)).toBe(0);
  });

  it("shrink while voting", () => {
    const session = new Session("order", shuffledFiles(20, 2));
    const before = session.progress();
    for (let i = 0; i < 10; i++) session.vote(better(pair(session)).path);
    const after = session.progress();
    expect(after.done).toBe(10);
    expect(after.remaining).toBeLessThan(before.remaining);
  });
});

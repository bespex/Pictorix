import { describe, expect, it } from "vitest";
import { planFiles, stripPrefix, toFolderName } from "./plan";

const file = (name: string) => ({ path: `/p/${name}`, name });

describe("planFiles", () => {
  it("prefixes the placement with three digits", () => {
    const plan = planFiles("order", [{ file: file("beach.jpg"), value: "2" }], { replacePrefix: true });
    expect(plan[0].toName).toBe("002-beach.jpg");
  });

  it("prefixes the rating with two digits, so 10 sorts after 09", () => {
    const plan = planFiles(
      "rate",
      [
        { file: file("a.jpg"), value: "7" },
        { file: file("b.jpg"), value: "10" },
      ],
      { replacePrefix: false },
    );
    expect(plan.map((p) => p.toName)).toEqual(["07-a.jpg", "10-b.jpg"]);
  });

  it("moves categorized images into a subfolder", () => {
    const plan = planFiles("categorize", [{ file: file("a.jpg"), value: "family" }], { replacePrefix: true });
    expect(plan[0]).toMatchObject({ toDir: "family", toName: "a.jpg" });
  });

  it("replaces an old prefix instead of stacking prefixes", () => {
    const outcomes = [{ file: file("003-beach.jpg"), value: "1" }];
    expect(planFiles("order", outcomes, { replacePrefix: true })[0].toName).toBe("001-beach.jpg");
    expect(planFiles("order", outcomes, { replacePrefix: false })[0].toName).toBe("001-003-beach.jpg");
  });

  it("keeps names unique when old prefixes are removed", () => {
    const plan = planFiles(
      "rate",
      [
        { file: file("01-a.jpg"), value: "5" },
        { file: file("02-a.jpg"), value: "5" },
      ],
      { replacePrefix: true },
    );
    expect(plan.map((p) => p.toName)).toEqual(["05-a.jpg", "05-a-2.jpg"]);
  });
});

describe("helpers", () => {
  it("strips only real prefixes", () => {
    expect(stripPrefix("12-a.jpg")).toBe("a.jpg");
    expect(stripPrefix("2024-05-01.jpg")).toBe("2024-05-01.jpg");
    expect(stripPrefix("01-.jpg")).toBe("01-.jpg");
  });

  it("makes safe folder names", () => {
    expect(toFolderName("  Family / Trip ")).toBe("Family _ Trip");
    expect(toFolderName("what?.")).toBe("what_");
    expect(toFolderName("..")).toBe("");
    expect(toFolderName("CON")).toBe("CON_");
  });
});

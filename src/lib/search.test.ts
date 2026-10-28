import { describe, expect, it } from "vitest";
import { fuzzySearch, highlightMatches } from "./search";

describe("search", () => {
  describe("highlightMatches", () => {
    it("returns full string unhighlighted when indices are empty", () => {
      expect(highlightMatches("React Query", [])).toEqual([
        { text: "React Query", highlighted: false },
      ]);
    });

    it("handles single substring match", () => {
      const segments = highlightMatches("React Query", [[0, 5]]);
      expect(segments).toEqual([
        { text: "React", highlighted: true },
        { text: " Query", highlighted: false },
      ]);
    });

    it("handles middle match", () => {
      const segments = highlightMatches("Hello World", [[6, 11]]);
      expect(segments).toEqual([
        { text: "Hello ", highlighted: false },
        { text: "World", highlighted: true },
      ]);
    });

    it("merges adjacent and overlapping ranges", () => {
      const segments = highlightMatches("Freelancer App", [
        [0, 4],
        [4, 8],
        [7, 10],
      ]);
      expect(segments).toEqual([
        { text: "Freelancer", highlighted: true },
        { text: " App", highlighted: false },
      ]);
    });
  });

  describe("fuzzySearch", () => {
    const items = [
      { id: "1", title: "توسعه رابط کاربری React", description: "پروژه فرانت‌اند با تایپ‌اسکریپت" },
      { id: "2", title: "طراحی UI/UX فیگما", description: "طراحی سیستم طراحی و صفحات وب" },
      { id: "3", title: "توسعه بک‌اند Node.js", description: "نوشتن API با Express و MongoDB" },
    ];

    it("returns all items when query is empty", () => {
      const results = fuzzySearch(items, "", ["title", "description"]);
      expect(results.length).toBe(3);
      expect(results[0].score).toBe(1);
    });

    it("finds exact matches with high scores and field intervals", () => {
      const results = fuzzySearch(items, "React", ["title", "description"]);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].item.id).toBe("1");
      expect(results[0].score).toBeGreaterThan(0.7);
      expect(results[0].matches.length).toBeGreaterThan(0);
      expect(results[0].matches[0].field).toBe("title");
    });

    it("normalizes Persian characters (ک / ي)", () => {
      const results = fuzzySearch(items, "كاربرى", ["title", "description"]);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].item.id).toBe("1");
    });

    it("finds fuzzy subsequence matches across multiple fields", () => {
      const results = fuzzySearch(items, "فرانت", ["title", "description"]);
      expect(results.length).toBe(1);
      expect(results[0].item.id).toBe("1");
      expect(results[0].matches[0].field).toBe("description");
    });

    it("ranks better matches higher", () => {
      const mixed = [
        { name: "Alpha Beta Gamma" },
        { name: "Beta Alpha" },
        { name: "Something Else" },
      ];
      const results = fuzzySearch(mixed, "Beta", ["name"]);
      expect(results[0].item.name).toBe("Beta Alpha");
    });
  });
});

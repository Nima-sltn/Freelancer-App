import { describe, expect, it } from "vitest";
import { storage } from "@/lib/storage";
import { clearJournal, createEntryId, loadJournal, saveJournal } from "./journal";
import type { JournalEntry } from "./types";

function entry(id: string): JournalEntry {
  return {
    id,
    resource: "project:p1",
    labelKey: "tx.project.update",
    state: "committed",
    invalidate: [["projects"]],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    attempts: 1,
    reversible: false,
    inverse: [],
  };
}

describe("transaction journal durability", () => {
  it("starts empty", () => {
    expect(loadJournal()).toEqual([]);
  });

  it("round-trips entries through storage", () => {
    saveJournal([entry("a"), entry("b")]);
    expect(loadJournal().map((item) => item.id)).toEqual(["a", "b"]);
  });

  it("keeps only the most recent 60 entries so history cannot grow unbounded", () => {
    const many = Array.from({ length: 90 }, (_, index) => entry(`e${index}`));
    saveJournal(many);
    const loaded = loadJournal();
    expect(loaded).toHaveLength(60);
    expect(loaded[0].id).toBe("e30");
    expect(loaded.at(-1)?.id).toBe("e89");
  });

  it("discards corrupted payloads instead of crashing on boot", () => {
    storage.set("transaction.journal", "not-an-array");
    expect(loadJournal()).toEqual([]);

    storage.set("transaction.journal", [
      { id: "ok", resource: "r", createdAt: new Date().toISOString() },
      { id: 5, resource: "r", createdAt: "now" },
      null,
      "nope",
    ]);
    expect(loadJournal().map((item) => item.id)).toEqual(["ok"]);
  });

  it("clears the persisted journal", () => {
    saveJournal([entry("a")]);
    clearJournal();
    expect(loadJournal()).toEqual([]);
  });
});

describe("createEntryId", () => {
  it("produces unique, string identifiers", () => {
    const ids = new Set(Array.from({ length: 50 }, () => createEntryId()));
    expect(ids.size).toBe(50);
    ids.forEach((id) => expect(typeof id).toBe("string"));
  });
});

import { storage } from "@/lib/storage";
import type { JournalEntry } from "./types";

/**
 * Durability for the transaction journal.
 *
 * The journal survives a reload so an optimistic change that was queued while
 * offline is not silently lost. Only the last 60 entries are kept — enough for
 * an undo history without unbounded growth.
 */
const JOURNAL_KEY = "transaction.journal";
const MAX_ENTRIES = 60;

export function loadJournal(): JournalEntry[] {
  const entries = storage.get<JournalEntry[]>(JOURNAL_KEY, []);
  if (!Array.isArray(entries)) return [];
  return entries.filter(
    (entry) =>
      entry &&
      typeof entry.id === "string" &&
      typeof entry.resource === "string" &&
      typeof entry.createdAt === "string"
  );
}

export function saveJournal(entries: JournalEntry[]): void {
  storage.set(JOURNAL_KEY, entries.slice(-MAX_ENTRIES));
}

export function clearJournal(): void {
  storage.remove(JOURNAL_KEY);
}

export function createEntryId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `tx_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
}

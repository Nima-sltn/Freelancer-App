import { createDemoState, type DemoState } from "./data";
import { storage } from "@/lib/storage";

/**
 * In-memory demo database with durable persistence.
 *
 * Mutations performed through the mock transport (creating a project, changing
 * a proposal status, verifying a user…) are written to `localStorage`, so the
 * demo behaves like a real backend across reloads. `reset()` restores the
 * deterministic seed — exposed from the UI and via `?demo=reset`.
 */

const DB_KEY = "demo.db";
const DB_VERSION = 1;

class DemoDatabase {
  private state: DemoState;

  constructor() {
    this.state = this.loadInitialState();
  }

  private loadInitialState(): DemoState {
    const shouldReset =
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("demo") === "reset";
    if (shouldReset) {
      const fresh = createDemoState();
      storage.set(DB_KEY, fresh);
      return fresh;
    }

    const persisted = storage.get<DemoState | null>(DB_KEY, null);
    if (persisted && persisted.version === DB_VERSION && Array.isArray(persisted.projects)) {
      return persisted;
    }

    const fresh = createDemoState();
    storage.set(DB_KEY, fresh);
    return fresh;
  }

  get current(): DemoState {
    return this.state;
  }

  /** Applies a mutation and persists the result atomically. */
  mutate<T>(mutator: (state: DemoState) => T): T {
    const result = mutator(this.state);
    this.persist();
    return result;
  }

  persist(): void {
    storage.set(DB_KEY, this.state);
  }

  reset(): DemoState {
    this.state = createDemoState();
    this.persist();
    return this.state;
  }

  get sessionUserId(): string | null {
    return this.state.sessionUserId;
  }

  setSession(userId: string | null): void {
    this.state.sessionUserId = userId;
    this.persist();
  }
}

export const demoDb = new DemoDatabase();
export type { DemoState };

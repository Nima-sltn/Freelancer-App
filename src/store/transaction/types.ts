import type { QueryKey } from "@tanstack/react-query";
import type { ValidationIssue } from "@/lib/validators";
import type { CommandDescriptor } from "@/types";

/** A single optimistic cache update and the data needed to reverse it. */
export interface Patch {
  queryKey: QueryKey;
  /** Receives the current cache value and returns the next one. */
  updater: (current: unknown) => unknown;
}

export type TransactionState =
  | "pending"
  | "committed"
  | "rolled-back"
  | "queued";

export interface JournalEntry {
  id: string;
  /** Isolation domain, e.g. `project:abc` — writes to one resource are serialised. */
  resource: string;
  /** i18n key describing the change, plus its interpolation params. */
  labelKey: string;
  labelParams?: Record<string, string | number>;
  state: TransactionState;
  /** Keys invalidated after a successful commit. */
  invalidate: QueryKey[];
  createdAt: string;
  updatedAt: string;
  attempts: number;
  error?: string;
  /** i18n key explaining a failure that has no server message (e.g. a stale journal). */
  errorKey?: string;
  /** True when the change can be reversed on the server too. */
  reversible: boolean;
  /** Serialised inverse patches, used to restore the cache on rollback. */
  inverse: Array<{ queryKey: QueryKey; previous: unknown }>;
  /**
   * Serialised write, so the entry can be re-sent after a reload (see
   * `commands.ts`). Present on every write that should survive the session.
   */
  command?: CommandDescriptor;
  /** Serialised compensating write — the server half of an undo (a saga). */
  compensateCommand?: CommandDescriptor;
}

export interface RunTransactionConfig<TResult> {
  resource: string;
  labelKey: string;
  labelParams?: Record<string, string | number>;
  /** Consistency gate: return issues to abort before touching the cache. */
  validate?: () => ValidationIssue[];
  /** Optimistic cache updates (Atomicity). */
  patches?: Patch[];
  /** The actual network call. */
  request: () => Promise<TResult>;
  /**
   * Serialised form of `request`. When present the journal entry becomes
   * replayable across reloads: the outbox can re-send it after a crash, a
   * refresh or a long-offline period, exactly as if the click had just
   * happened. Prefer this over a bare closure for every write.
   */
  command?: CommandDescriptor;
  /** Inverse network call, enabling undo of an already committed change. */
  compensate?: () => Promise<unknown>;
  /** Serialised form of `compensate`, so undo still works after a reload. */
  compensateCommand?: CommandDescriptor;
  invalidate?: QueryKey[];
  onSuccess?: (result: TResult) => void;
  onError?: (error: unknown) => void;
  /** Toast copy override; defaults to the standard committed/rolled-back pair. */
  successMessage?: string;
}

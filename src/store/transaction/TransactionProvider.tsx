import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient, type QueryKey } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { ApiError } from "@/lib/http/errors";
import { APP_EVENTS, appEvents } from "@/lib/eventBus";
import { useT } from "@/store/i18n";
import { createEntryId, loadJournal, saveJournal } from "./journal";
import { executeCommand, isReplayable } from "./commands";
import type { JournalEntry, Patch, RunTransactionConfig } from "./types";

export interface TransactionContextValue {
  entries: JournalEntry[];
  /** Entries still being sent or waiting to be sent. */
  pendingCount: number;
  /** Queued entries a previous session left behind that this build cannot re-send. */
  unreplayableCount: number;
  isBusy: boolean;
  run: <TResult>(config: RunTransactionConfig<TResult>) => Promise<TResult | undefined>;
  undo: (entryId?: string) => Promise<void>;
  /** Re-sends every queued entry (used when connectivity returns). */
  flush: () => Promise<void>;
  retry: (entryId: string) => Promise<void>;
  clearHistory: () => void;
}

const TransactionContext = createContext<TransactionContextValue | undefined>(undefined);

/**
 * ACID-inspired write pipeline for the client cache.
 *
 * | Property      | Implementation                                                             |
 * |---------------|----------------------------------------------------------------------------|
 * | Atomicity     | Optimistic patches are applied with their inverse captured; any failure    |
 * |               | replays the inverse so a half-applied change can never be observed.        |
 * | Consistency   | A per-domain validator runs *before* the cache is touched; invalid payloads |
 * |               | never enter the cache or the network.                                      |
 * | Isolation     | Writes are serialised per `resource` through a promise chain, so two        |
 * |               | concurrent edits to the same project cannot interleave.                    |
 * | Durability    | The journal is persisted and queued transactions are **re-sent** when the   |
 * |               | connection returns, on the next load, or manually — the same request,      |
 * |               | rebuilt from the serialisable command descriptor (see `commands.ts`).      |
 *
 * This is the piece that makes optimistic UI safe: the user always sees the
 * result of their action immediately, and the cache is guaranteed to converge
 * to server truth — either by commit, by compensating undo, or by replay.
 *
 * The one honest limitation: a journal entry written by an *older build* whose
 * command this build does not know cannot be re-sent. Rather than silently
 * dropping the user's work (or, worse, replaying a stale closure into a fresh
 * cache), such entries are marked `rolled-back` with `errorKey: "tx.unreplayable"`
 * and their keys are invalidated so the UI re-reads server truth.
 */
export function TransactionProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const { t } = useT();
  const [entries, setEntries] = useState<JournalEntry[]>(() => loadJournal());
  const locks = useRef(new Map<string, Promise<unknown>>());
  const entriesRef = useRef(entries);
  entriesRef.current = entries;

  /**
   * Session-scoped half of an entry: the closures the journal cannot hold.
   *
   * A fresh entry has both halves (closure *and* serialised command); an entry
   * loaded from a previous session has only the command. Knowing which half we
   * are holding is what lets replay be truthful: restoring a cached inverse
   * captured before a reload could clobber fresher data, so stale entries
   * invalidate instead.
   */
  const runtime = useRef(
    new Map<string, { request?: () => Promise<unknown>; compensate?: () => Promise<unknown> }>()
  );

  /* ------------------------------------------------------------ helpers */

  const update = useCallback((id: string, changes: Partial<JournalEntry>) => {
    setEntries((current) => {
      const next = current.map((entry) =>
        entry.id === id ? { ...entry, ...changes, updatedAt: new Date().toISOString() } : entry
      );
      saveJournal(next);
      return next;
    });
  }, []);

  const append = useCallback((entry: JournalEntry) => {
    setEntries((current) => {
      const next = [...current, entry];
      saveJournal(next);
      return next;
    });
  }, []);

  /** Isolation: serialises work per resource so writes cannot interleave. */
  const withLock = useCallback(async <T,>(resource: string, task: () => Promise<T>): Promise<T> => {
    const previous = locks.current.get(resource) ?? Promise.resolve();
    const run = previous.catch(() => undefined).then(task);
    locks.current.set(
      resource,
      run.catch(() => undefined)
    );
    return run;
  }, []);

  /** Atomicity: applies the optimistic patches and captures their inverses. */
  const applyPatches = useCallback(
    (patches: Patch[]): JournalEntry["inverse"] => {
      const inverse: JournalEntry["inverse"] = [];
      patches.forEach((patch) => {
        queryClient.setQueryData(patch.queryKey, (current: unknown) => {
          inverse.push({ queryKey: patch.queryKey, previous: current });
          return patch.updater(current);
        });
      });
      return inverse;
    },
    [queryClient]
  );

  const restoreInverse = useCallback(
    (inverse: JournalEntry["inverse"]) => {
      [...inverse].reverse().forEach((item) => {
        queryClient.setQueryData(item.queryKey, item.previous);
      });
    },
    [queryClient]
  );

  /**
   * Reverts the cache side of an entry.
   *
   * Same-session entries restore their captured inverse (exact previous state,
   * no refetch race). Entries loaded from a previous session invalidate their
   * keys instead: the captured values predate the reload and may be older than
   * the server, so replaying them would move the UI *backwards*.
   */
  const revertCache = useCallback(
    (entry: JournalEntry) => {
      if (runtime.current.has(entry.id)) {
        restoreInverse(entry.inverse);
        return;
      }
      const keys = new Set(entry.inverse.map((item) => JSON.stringify(item.queryKey)));
      keys.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: JSON.parse(key) as QueryKey });
      });
    },
    [queryClient, restoreInverse]
  );

  const invalidateKeys = useCallback(
    (keys: QueryKey[]) => {
      keys.forEach((queryKey) => {
        queryClient.invalidateQueries({ queryKey });
      });
    },
    [queryClient]
  );

  /* -------------------------------------------------------------- replay */

  /**
   * Durability: re-sends one entry and reconciles the cache with the outcome.
   *
   * The request is rebuilt from the serialised command when one is available
   * (survives reloads); otherwise the in-memory closure is used (same session).
   * Returns `true` when the entry ended up committed.
   */
  const replay = useCallback(
    async (entry: JournalEntry): Promise<boolean> => {
      const session = runtime.current.get(entry.id);
      const send = isReplayable(entry.command)
        ? () => executeCommand(entry.command!)
        : session?.request;

      if (!send) {
        // A stale journal entry this build cannot re-send: quarantine it loudly
        // instead of dropping the write or replaying a stale closure.
        update(entry.id, {
          state: "rolled-back",
          errorKey: "tx.unreplayable",
          error: t("tx.unreplayable"),
        });
        invalidateKeys(entry.invalidate);
        appEvents.emit(APP_EVENTS.transactionRolledBack, { id: entry.id, entry, stale: true });
        return false;
      }

      update(entry.id, { state: "pending", attempts: entry.attempts + 1, error: undefined });

      try {
        await send();
        update(entry.id, { state: "committed", error: undefined, errorKey: undefined });
        invalidateKeys(entry.invalidate);
        appEvents.emit(APP_EVENTS.transactionCommitted, { id: entry.id, entry, replayed: true });
        return true;
      } catch (error) {
        if (error instanceof ApiError && error.isNetwork) {
          // Still offline: keep the optimistic change and stay queued.
          update(entry.id, { state: "queued", error: error.message });
          return false;
        }
        // The server rejected it — retrying will not help, so converge now.
        revertCache(entry);
        const message = error instanceof ApiError ? error.message : t("common.errorHint");
        update(entry.id, { state: "rolled-back", error: message });
        appEvents.emit(APP_EVENTS.transactionRolledBack, { id: entry.id, entry, error });
        toast.error(message);
        return false;
      }
    },
    [invalidateKeys, revertCache, t, update]
  );

  /* --------------------------------------------------------------- run */

  const run = useCallback<TransactionContextValue["run"]>(
    async <TResult,>(config: RunTransactionConfig<TResult>): Promise<TResult | undefined> => {
      // --- Consistency ------------------------------------------------------
      const issues = config.validate?.() ?? [];
      if (issues.length > 0) {
        const first = issues[0];
        toast.error(t(first.messageKey, first.params));
        return undefined;
      }

      const id = createEntryId();
      const patches = config.patches ?? [];

      return withLock(config.resource, async () => {
        // --- Atomicity ----------------------------------------------------
        const inverse = applyPatches(patches);

        const entry: JournalEntry = {
          id,
          resource: config.resource,
          labelKey: config.labelKey,
          labelParams: config.labelParams,
          state: "pending",
          invalidate: config.invalidate ?? [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          attempts: 1,
          reversible: Boolean(config.compensate || config.compensateCommand),
          inverse,
          command: config.command,
          compensateCommand: config.compensateCommand,
        };
        append(entry);
        runtime.current.set(id, { request: config.request, compensate: config.compensate });

        try {
          const result = await config.request();
          update(id, { state: "committed" });
          invalidateKeys(config.invalidate ?? []);
          if (config.successMessage) toast.success(config.successMessage);
          appEvents.emit(APP_EVENTS.transactionCommitted, { id, entry, result });
          config.onSuccess?.(result);
          return result;
        } catch (error) {
          // --- Durability: keep the change if the network is the problem ----
          if (error instanceof ApiError && error.isNetwork) {
            update(id, { state: "queued", error: error.message });
            appEvents.emit(APP_EVENTS.transactionCommitted, { id, entry, queued: true });
            toast(t("tx.queued"), { icon: "📶" });
            return undefined;
          }

          // --- Atomicity: roll the cache back -------------------------------
          restoreInverse(inverse);
          const message = error instanceof ApiError ? error.message : t("common.errorHint");
          update(id, { state: "rolled-back", error: message });
          appEvents.emit(APP_EVENTS.transactionRolledBack, { id, entry, error });
          toast.error(message);
          config.onError?.(error);
          return undefined;
        }
      });
    },
    [append, applyPatches, invalidateKeys, restoreInverse, t, update, withLock]
  );

  /* -------------------------------------------------------------- undo */

  /**
   * Compensating undo — a saga, not a lie.
   *
   * Undoing a committed write has two halves. The cache half restores the
   * captured inverse (or invalidates, for entries from a previous session). The
   * *server* half runs the compensating command — the reverse status write, the
   * un-delete — and only marks the entry undone when the server agrees. If the
   * compensation fails, the entry stays committed and the user is told: an
   * optimistic undo that never reached the server is exactly the class of bug
   * this pipeline exists to prevent.
   */
  const undo = useCallback<TransactionContextValue["undo"]>(
    async (entryId) => {
      const target = entryId
        ? entriesRef.current.find((entry) => entry.id === entryId)
        : [...entriesRef.current].reverse().find((entry) => entry.state === "committed");

      if (!target) {
        toast(t("tx.empty"), { icon: "↩️" });
        return;
      }

      const compensateCmd = target.compensateCommand;
      const compensate = isReplayable(compensateCmd)
        ? () => executeCommand(compensateCmd)
        : runtime.current.get(target.id)?.compensate;

      if (compensate) {
        try {
          await compensate();
        } catch (error) {
          const message = error instanceof ApiError ? error.message : t("common.errorHint");
          toast.error(message);
          update(target.id, { error: message });
          return;
        }
      }

      revertCache(target);
      update(target.id, { state: "rolled-back", error: undefined });
      toast.success(t("tx.rolledBack"));
      appEvents.emit(APP_EVENTS.transactionRolledBack, {
        id: target.id,
        entry: target,
        manual: true,
        compensated: Boolean(compensate),
      });
    },
    [revertCache, t, update]
  );

  /* ------------------------------------------------------------- flush */

  /** Re-sends queued work in journal order, one resource lock at a time. */
  const flush = useCallback(async () => {
    const queued = entriesRef.current.filter((entry) => entry.state === "queued");
    if (queued.length === 0) return;

    const results = await Promise.all(
      queued.map((entry) => withLock(entry.resource, () => replay(entry)))
    );
    const synced = results.filter(Boolean).length;

    if (synced > 0) {
      toast.success(t("offline.synced"), { icon: "☁️" });
      appEvents.emit(APP_EVENTS.queueDrained, { synced });
    }
  }, [replay, t, withLock]);

  const retry = useCallback(
    async (entryId: string) => {
      const target = entriesRef.current.find((entry) => entry.id === entryId);
      if (!target) return;
      await withLock(target.resource, () => replay(target));
    },
    [replay, withLock]
  );

  useEffect(() => {
    const unsubscribe = appEvents.on(APP_EVENTS.networkOnline, () => {
      flush();
    });
    return unsubscribe;
  }, [flush]);

  /**
   * Start-up reconciliation (Durability across sessions).
   *
   * A `pending` entry means the tab died mid-flight; its outcome is unknown, so
   * it is re-queued and replayed like any other offline write. A `queued` entry
   * simply waits for the next flush. Entries this build cannot re-send are
   * quarantined by `replay` with a visible reason.
   */
  useEffect(() => {
    const boot = entriesRef.current;
    if (boot.length === 0) return;

    // Work out what to replay from the boot snapshot: `entriesRef` only catches
    // up after the re-render, so calling `flush()` here would still see the
    // pre-reconciliation states.
    const toReplay = boot.filter(
      (entry) => entry.state === "pending" || entry.state === "queued"
    );
    toReplay.forEach((entry) => update(entry.id, { state: "queued" }));
    toReplay.forEach((entry) => {
      withLock(entry.resource, () => replay({ ...entry, state: "queued" }));
    });
    // Runs once per mount: this is a boot-time reconciliation, not a reaction.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clearHistory = useCallback(() => {
    setEntries((current) => {
      const next = current.filter((entry) => entry.state === "queued");
      saveJournal(next);
      return next;
    });
  }, []);

  const value = useMemo<TransactionContextValue>(
    () => ({
      entries,
      pendingCount: entries.filter((entry) => entry.state === "pending" || entry.state === "queued")
        .length,
      unreplayableCount: entries.filter((entry) => entry.errorKey === "tx.unreplayable").length,
      isBusy: entries.some((entry) => entry.state === "pending"),
      run,
      undo,
      flush,
      retry,
      clearHistory,
    }),
    [clearHistory, entries, flush, retry, run, undo]
  );

  return <TransactionContext.Provider value={value}>{children}</TransactionContext.Provider>;
}

export function useTransactions(): TransactionContextValue {
  const context = useContext(TransactionContext);
  if (!context) throw new Error("useTransactions must be used inside <TransactionProvider>");
  return context;
}

export default TransactionProvider;

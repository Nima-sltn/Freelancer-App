import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { APP_EVENTS, appEvents } from "@/lib/eventBus";
import { ApiError } from "@/lib/http/errors";
import { I18nProvider } from "@/store/i18n";
import { TransactionProvider, useTransactions } from "./TransactionProvider";
import { loadJournal, saveJournal } from "./journal";
import type { JournalEntry, Patch } from "./types";
import type { CommandDescriptor } from "@/types";

/**
 * The command registry delegates to `services/*`; tests stand those in so a
 * journaled descriptor can be re-executed without a transport.
 */
const serviceMocks = vi.hoisted(() => ({
  projectRemove: vi.fn().mockResolvedValue({ message: "removed" }),
  proposalChangeStatus: vi.fn().mockResolvedValue({ message: "changed" }),
}));

vi.mock("@/services", () => ({
  projectService: { remove: serviceMocks.projectRemove },
  proposalService: { changeStatus: serviceMocks.proposalChangeStatus },
  userService: {},
}));

/**
 * Behavioural tests for the ACID write pipeline.
 *
 * These assert the four guarantees the provider advertises (see its docblock)
 * rather than its implementation details: the cache is patched optimistically,
 * reverted on failure, never touched when validation fails, writes to the same
 * resource are serialised, and a network failure queues the change for replay.
 */

const LIST_KEY = ["projects", "list"] as const;

const initialList = [
  { _id: "p1", title: "before" },
  { _id: "p2", title: "untouched" },
];

const appendPatch: Patch = {
  queryKey: LIST_KEY,
  updater: (current) => [...(current as unknown[]), { _id: "p3", title: "after" }],
};

const retitlePatch: Patch = {
  queryKey: LIST_KEY,
  updater: (current) =>
    (current as Array<{ _id: string; title: string }>).map((item) =>
      item._id === "p1" ? { ...item, title: "renamed" } : item
    ),
};

function setup() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: 0 } },
  });
  client.setQueryData(LIST_KEY, initialList);

  const wrapper = ({ children }: { children: ReactNode }) => (
    <I18nProvider>
      <QueryClientProvider client={client}>
        <TransactionProvider>{children}</TransactionProvider>
      </QueryClientProvider>
    </I18nProvider>
  );

  const view = renderHook(() => useTransactions(), { wrapper });
  const readList = () => client.getQueryData<typeof initialList>(LIST_KEY);
  return { client, readList, ...view };
}

describe("Atomicity", () => {
  it("applies the optimistic patch before the request resolves", async () => {
    const { result, readList } = setup();
    let resolveRequest: (value: unknown) => void = () => undefined;
    const request = vi.fn(
      () =>
        new Promise((resolve) => {
          resolveRequest = resolve;
        })
    );

    await act(async () => {
      void result.current.run({
        resource: "project:create",
        labelKey: "tx.project.create",
        patches: [appendPatch],
        request,
      });
    });

    expect(readList()).toHaveLength(3);
    expect(result.current.entries.at(-1)?.state).toBe("pending");
    expect(result.current.isBusy).toBe(true);

    await act(async () => {
      resolveRequest({ ok: true });
      await Promise.resolve();
    });

    await waitFor(() => expect(result.current.entries.at(-1)?.state).toBe("committed"));
    expect(result.current.isBusy).toBe(false);
  });

  it("restores the exact previous cache value when the request fails", async () => {
    const { result, readList } = setup();
    await act(async () => {
      await result.current.run({
        resource: "project:p1",
        labelKey: "tx.project.update",
        patches: [retitlePatch],
        request: () =>
          Promise.reject(
            new ApiError({ message: "rejected by server", kind: "validation", status: 422 })
          ),
      });
    });

    expect(readList()).toEqual(initialList);
    const entry = result.current.entries.at(-1);
    expect(entry?.state).toBe("rolled-back");
    expect(entry?.error).toBe("rejected by server");
  });
});

describe("Consistency", () => {
  it("never touches the cache or the network when validation fails", async () => {
    const { result, readList } = setup();
    const request = vi.fn().mockResolvedValue({ ok: true });

    let outcome: unknown = "unset";
    await act(async () => {
      outcome = await result.current.run({
        resource: "project:create",
        labelKey: "tx.project.create",
        validate: () => [{ field: "title", messageKey: "validation.title.min", params: { min: 10 } }],
        patches: [appendPatch],
        request,
      });
    });

    expect(outcome).toBeUndefined();
    expect(request).not.toHaveBeenCalled();
    expect(readList()).toEqual(initialList);
    expect(result.current.entries).toHaveLength(0);
  });
});

describe("Isolation", () => {
  it("serialises two writes to the same resource so they cannot interleave", async () => {
    const { result } = setup();
    const order: string[] = [];

    await act(async () => {
      const first = result.current.run({
        resource: "project:x",
        labelKey: "tx.first",
        request: async () => {
          order.push("start-1");
          await new Promise((resolve) => setTimeout(resolve, 15));
          order.push("end-1");
        },
      });
      const second = result.current.run({
        resource: "project:x",
        labelKey: "tx.second",
        request: async () => {
          order.push("start-2");
        },
      });
      await Promise.all([first, second]);
    });

    expect(order).toEqual(["start-1", "end-1", "start-2"]);
  });

  it("lets independent resources proceed in parallel", async () => {
    const { result } = setup();
    const order: string[] = [];

    await act(async () => {
      const first = result.current.run({
        resource: "project:a",
        labelKey: "tx.a",
        request: async () => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          order.push("a");
        },
      });
      const second = result.current.run({
        resource: "project:b",
        labelKey: "tx.b",
        request: async () => {
          order.push("b");
        },
      });
      await Promise.all([first, second]);
    });

    expect(order).toEqual(["b", "a"]);
  });
});

describe("Durability", () => {
  it("queues an offline change instead of discarding it, then really re-sends it", async () => {
    const { result, readList } = setup();
    const request = vi
      .fn()
      .mockRejectedValueOnce(new ApiError({ message: "offline", kind: "network" }))
      .mockResolvedValue({ ok: true });

    await act(async () => {
      await result.current.run({
        resource: "project:create",
        labelKey: "tx.project.create",
        patches: [appendPatch],
        request,
      });
    });

    // The optimistic result is kept — the user's work is not thrown away.
    expect(readList()).toHaveLength(3);
    expect(result.current.entries.at(-1)?.state).toBe("queued");
    expect(result.current.pendingCount).toBe(1);
    expect(request).toHaveBeenCalledTimes(1);

    // The journal is durable, so a reload keeps the queued work.
    expect(loadJournal().some((entry) => entry.state === "queued")).toBe(true);

    await act(async () => {
      appEvents.emit(APP_EVENTS.networkOnline);
      await Promise.resolve();
    });

    await waitFor(() => expect(result.current.entries.at(-1)?.state).toBe("committed"));
    // The proof of durability: the *same request ran a second time*.
    expect(request).toHaveBeenCalledTimes(2);
    expect(result.current.pendingCount).toBe(0);
  });

  it("keeps the entry queued and counts the attempt while the server stays unreachable", async () => {
    const { result } = setup();
    const request = vi.fn(() =>
      Promise.reject(new ApiError({ message: "offline", kind: "network" }))
    );

    await act(async () => {
      await result.current.run({
        resource: "project:create",
        labelKey: "tx.project.create",
        patches: [appendPatch],
        request,
      });
    });

    await act(async () => {
      await result.current.flush();
    });

    expect(request).toHaveBeenCalledTimes(2);
    expect(result.current.entries.at(-1)?.state).toBe("queued");
    expect(result.current.entries.at(-1)?.attempts).toBe(2);
    expect(result.current.pendingCount).toBe(1);
  });

  it("keeps the journal small when history is cleared", async () => {
    const { result } = setup();
    await act(async () => {
      await result.current.run({
        resource: "project:p1",
        labelKey: "tx.project.update",
        patches: [retitlePatch],
        request: async () => ({ ok: true }),
      });
    });
    expect(result.current.entries).toHaveLength(1);

    act(() => {
      result.current.clearHistory();
    });
    expect(result.current.entries).toHaveLength(0);
    expect(loadJournal()).toEqual([]);
  });
});

describe("Cross-session durability", () => {
  /** An entry as another session would have persisted it: data, no closures. */
  function persistedEntry(overrides: Partial<JournalEntry> = {}): JournalEntry {
    return {
      id: "stale-1",
      resource: "project:p1",
      labelKey: "projects.delete",
      state: "queued",
      invalidate: [LIST_KEY],
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      attempts: 1,
      reversible: false,
      inverse: [{ queryKey: LIST_KEY, previous: initialList }],
      ...overrides,
    };
  }

  it("re-sends a journaled command written by a previous session", async () => {
    serviceMocks.projectRemove.mockClear();
    serviceMocks.projectRemove.mockResolvedValue({ message: "removed" });
    saveJournal([
      persistedEntry({
        command: { name: "project.remove", args: { id: "p1" } } as CommandDescriptor,
      }),
    ]);

    const { result } = setup();

    // The boot-time reconciliation replays it without any user interaction.
    await waitFor(() => expect(result.current.entries.at(-1)?.state).toBe("committed"));
    expect(serviceMocks.projectRemove).toHaveBeenCalledWith("p1");
    expect(result.current.unreplayableCount).toBe(0);
  });

  it("re-queues work that was in flight when the tab died", async () => {
    serviceMocks.projectRemove.mockClear();
    serviceMocks.projectRemove.mockResolvedValue({ message: "removed" });
    saveJournal([
      persistedEntry({
        state: "pending",
        command: { name: "project.remove", args: { id: "p1" } } as CommandDescriptor,
      }),
    ]);

    const { result } = setup();

    await waitFor(() => expect(result.current.entries.at(-1)?.state).toBe("committed"));
    expect(serviceMocks.projectRemove).toHaveBeenCalledTimes(1);
  });

  it("quarantines an entry this build cannot re-send instead of dropping it silently", async () => {
    saveJournal([
      persistedEntry({
        command: { name: "legacy.write", args: {} } as unknown as CommandDescriptor,
      }),
    ]);

    const { result } = setup();

    await waitFor(() => expect(result.current.entries.at(-1)?.state).toBe("rolled-back"));
    expect(result.current.entries.at(-1)?.errorKey).toBe("tx.unreplayable");
    expect(result.current.unreplayableCount).toBe(1);
    // The entry survives (the user can see what happened) and its keys are
    // invalidated so the UI re-reads server truth.
    expect(result.current.entries).toHaveLength(1);
  });
});

describe("Undo", () => {
  it("runs the compensating command so undo reaches the server too", async () => {
    serviceMocks.proposalChangeStatus.mockClear();
    serviceMocks.proposalChangeStatus.mockResolvedValue({ message: "changed" });
    const { result, readList } = setup();

    await act(async () => {
      await result.current.run({
        resource: "proposal:pr1",
        labelKey: "audit.proposal.status.2",
        patches: [retitlePatch],
        request: async () => ({ ok: true }),
        command: {
          name: "proposal.changeStatus",
          args: { proposalId: "pr1", projectId: "p1", status: 2 },
        } as CommandDescriptor,
        compensateCommand: {
          name: "proposal.changeStatus",
          args: { proposalId: "pr1", projectId: "p1", status: 1 },
        } as CommandDescriptor,
      });
    });

    await act(async () => {
      await result.current.undo();
    });

    expect(serviceMocks.proposalChangeStatus).toHaveBeenCalledWith({
      proposalId: "pr1",
      projectId: "p1",
      status: 1,
    });
    expect(result.current.entries.at(-1)?.state).toBe("rolled-back");
    expect(readList()).toEqual(initialList);
  });
  it("reverts the most recent committed change", async () => {
    const { result, readList } = setup();
    const onSuccess = vi.fn();

    await act(async () => {
      await result.current.run({
        resource: "project:p1",
        labelKey: "tx.project.update",
        patches: [retitlePatch],
        request: async () => ({ ok: true }),
        onSuccess,
      });
    });

    expect(readList()?.[0].title).toBe("renamed");
    expect(onSuccess).toHaveBeenCalledWith({ ok: true });

    await act(async () => {
      await result.current.undo();
    });

    expect(readList()).toEqual(initialList);
    expect(result.current.entries.at(-1)?.state).toBe("rolled-back");
  });

  it("reports an empty journal instead of throwing", async () => {
    const { result } = setup();
    await act(async () => {
      await result.current.undo();
    });
    expect(result.current.entries).toHaveLength(0);
  });
});

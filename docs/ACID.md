# The ACID write pipeline

Optimistic UI is easy to demo and hard to get right. The moment a request fails
halfway, the cache and the server disagree and the user is looking at a lie.

`src/store/transaction/TransactionProvider.tsx` is the single place where a
client-side write happens. It borrows the four database guarantees and applies
them to the React Query cache, so every mutation in the product — creating a
project, accepting a proposal, verifying a user — behaves the same way.

---

## 1. The contract

```ts
const { run } = useTransactions();

await run({
  resource: `project:${project._id}`,   // Isolation domain
  labelKey: "tx.project.update",        // human-readable journal entry
  labelParams: { title: project.title },
  validate: () => validateProjectPayload(payload),   // Consistency gate
  patches: [{ queryKey: queryKeys.projects.all, updater }], // Atomicity
  request: () => projectService.update(id, payload),
  command: command("project.update", { id, data: payload }),   // ← replayable twin
  compensate: () => projectService.update(id, previous),    // enables undo
  compensateCommand: command("project.update", { id, data: previous }),
  invalidate: [queryKeys.projects.all],
  onSuccess: (result) => navigate(`/owner/projects/${result._id}`),
});
```

`run` resolves with the server result, or `undefined` when the change was
rejected, rolled back or queued.

`command` / `compensateCommand` are **serialisable twins** of `request` /
`compensate` — plain `{ name, args }` data executed by
[`commands.ts`](../src/store/transaction/commands.ts). They are what makes the
journal durable across a reload: closures do not survive one, descriptors do.

---

## 2. Guarantees

### Atomicity — all or nothing

Before the request is sent, the provider applies every optimistic patch through
`queryClient.setQueryData`, and **captures the previous value** for each key:

```ts
patches.forEach((patch) => {
  queryClient.setQueryData(patch.queryKey, (current) => {
    inverse.push({ queryKey: patch.queryKey, previous: current });
    return patch.updater(current);
  });
});
```

On failure the captured inverses are replayed (`setQueryData(key, previous)`),
so a multi-key change can never leave the cache half-updated. The user sees the
optimistic result, and on failure sees the *exact* previous state — not a
re-fetch that might race with other work.

### Consistency — validated before anything is touched

`validate` runs **before** the cache or the network is involved. It returns
`ValidationIssue[]` built from the same rules the forms use
(`lib/validators.ts`), so a payload that would be rejected by the API cannot
enter the cache and start a request:

```ts
const issues = config.validate?.() ?? [];
if (issues.length > 0) {
  toast.error(t(issues[0].messageKey, issues[0].params));
  return undefined;          // no patch, no request, no journal entry
}
```

That single source of truth is why the "Consistency" guarantee cannot drift from
what the form accepts.

### Isolation — one writer per resource

Writes are serialised per `resource` through a promise chain:

```ts
const withLock = async (resource, task) => {
  const previous = locks.current.get(resource) ?? Promise.resolve();
  const run = previous.catch(() => undefined).then(task);
  locks.current.set(resource, run.catch(() => undefined));
  return run;
};
```

Two edits to `project:abc` can never interleave: the second starts only after the
first settles (success *or* failure — the `.catch` keeps the chain alive).
Writes to *different* resources proceed in parallel, which is why a dashboard
that saves several things at once stays fast.

### Durability — nothing is lost to a reload

Every transaction appends a **journal entry** to `localStorage`
(`store/transaction/journal.ts`, capped at the most recent 60 entries):

```ts
interface JournalEntry {
  id: string;
  resource: string;          // isolation domain
  labelKey; labelParams;     // i18n description for the UI
  state: "pending" | "committed" | "rolled-back" | "queued";
  invalidate: QueryKey[];
  attempts: number;
  error?: string;
  errorKey?: string;         // i18n reason (e.g. "tx.unreplayable")
  reversible: boolean;
  inverse: Array<{ queryKey: QueryKey; previous: unknown }>;
  command?: CommandDescriptor;         // ← survives the reload
  compensateCommand?: CommandDescriptor;
  createdAt; updatedAt;
}
```

When the failure is a **network** failure the entry becomes `queued` and the
optimistic change is **kept** — the user's work is not thrown away because their
train went into a tunnel. Then the entry is *actually re-sent*:

```ts
const send = isReplayable(entry.command)
  ? () => executeCommand(entry.command!)   // survives reloads
  : runtime.get(entry.id)?.request;        // same-session closure fallback
```

- **on reconnect** (`networkOnline`) and **manually** (`flush`, the inspector's
  retry button), queued entries replay in journal order under the same
  per-resource lock, incrementing `attempts`;
- **on boot**, entries still `pending` (the tab died mid-flight) are re-queued and
  replayed before the user touches anything;
- if the server is still unreachable the entry **stays queued** with one more
  attempt — it is never optimistically marked as synced;
- if the entry was written by an *older build* and this build does not know its
  command, it is quarantined as `rolled-back` with `errorKey: "tx.unreplayable"`
  and its query keys are invalidated so the UI re-reads server truth. Dropping
  it silently would lose the user's work; replaying a stale closure into a fresh
  cache could corrupt it.

Server rejections (validation, permission, conflict) behave differently on
purpose: they roll the cache back immediately, because retrying will not help.

---

## 3. Lifecycle

```
                 ┌──────────── validate fails ────────────► (nothing happens)
                 │
 entry ──► patch cache (capture inverse)
                 │
                 ├── 200/201 ──► committed ──► invalidate keys ──► toast + event
                 │
                 ├── network error ──► queued ──► replay on reconnect / boot / flush
                 │                           └ still offline? stay queued, attempts+1
                 │
                 └── 4xx/5xx ──► restore inverse ──► rolled-back ──► toast + event
```

Every transition also emits on the event bus
(`transactionCommitted`, `transactionRolledBack`, `queueDrained`), which is how
the audit trail, the journey/inspector page and the notification centre stay in
sync without the transaction layer knowing they exist. The notification bridge
([`features/notifications/useTransactionNotifications.ts`](../src/features/notifications/useTransactionNotifications.ts))
turns commit / rollback / queue-drained into user-facing entries.

---

## 4. Undo — a compensating transaction

`undo(entryId?)` reverts the most recent committed entry (or a specific one) and
has **two halves**:

1. **the cache half** — restore the captured inverse. Same-session entries get
   the exact previous value (no refetch race); entries loaded from a previous
   session *invalidate* instead, because an inverse captured before a reload may
   be older than server truth.
2. **the server half** — run the compensating command: the reverse status write,
   the un-close, the un-verify. It comes from `compensateCommand` (serialisable,
   works after a reload) with the in-memory `compensate` closure as a fallback.

If the server **refuses** the compensation, the entry stays `committed` and the
error is surfaced: an optimistic undo that never reached the server is exactly
the class of bug this pipeline exists to prevent. When a write declares no
compensation, undo is local-only and the entry records `reversible: false` — the
inspector only offers the button when it means something.

---

## 5. The inspector

`pages/JourneyPage.tsx` renders the journal live: state, resource, attempts,
invalidation keys and error. It is a debugging tool for developers *and* a
transparency feature for users — they can see exactly what the client has done,
what is still in flight and what was reverted. `clearHistory()` keeps queued work
and discards the rest.

---

## 6. Invariants worth protecting

These are asserted in `store/transaction/TransactionProvider.test.tsx`:

1. The optimistic patch is visible **before** the request resolves.
2. A failed transaction restores the **exact** previous cache value.
3. A validation failure performs **no** cache write and **no** request.
4. Two writes to one resource execute strictly sequentially; different resources
   may overlap.
5. A network failure keeps the optimistic change, marks it `queued`, persists it
   — and the **same request runs again** on reconnect (`request` is called twice;
   a placeholder mark-as-synced would fail this test).
6. While the server is still unreachable, replay leaves the entry queued with
   `attempts` incremented.
7. An entry persisted by a previous session is **re-sent from its command
   descriptor** on boot, with no user interaction.
8. An interrupted (`pending`) entry is re-queued at boot rather than trusted.
9. An entry this build cannot re-send is quarantined as `rolled-back` with
   `errorKey: "tx.unreplayable"` — never dropped.
10. `undo` restores the previous state **and issues the compensating command**.
11. `undo` on an empty journal reports instead of throwing.

If you change the pipeline, run `npm test -- TransactionProvider` first; those
invariants are the whole point of the module.

---

## 7. Adding a mutation

```ts
// features/projects/useProjectMutations.ts
export function useCloseProject() {
  const { run } = useTransactions();

  return useCallback(
    (project: Project) =>
      run({
        resource: `project:${project._id}`,
        labelKey: "tx.project.close",
        validate: () => (project.status === "CLOSED"
          ? [{ field: "status", messageKey: "validation.status.alreadyClosed" }]
          : []),
        patches: [{
          queryKey: queryKeys.projects.all,
          updater: (current) => closeInList(current, project._id),
        }],
        request: () => projectService.changeStatus(project._id, "CLOSED"),
        command: command("project.changeStatus", { id: project._id, status: "CLOSED" }),
        compensateCommand: command("project.changeStatus", {
          id: project._id,
          status: project.status,
        }),
        invalidate: [queryKeys.projects.all],
      }),
    [run]
  );
}
```

Rules of thumb:

- **One resource string per write target**, shaped `<entity>:<id>`.
- **Always declare `command`** for a write that can fail offline. It is what
  makes the entry replayable after a reload; registering it in
  `commands.ts` also makes a typo a compile error.
- **Always provide `invalidate`** for anything the server may have derived
  (counts, aggregates, related lists).
- **Provide `compensate` + `compensateCommand`** when the change is meaningfully
  reversible, so the journal can offer an undo that reaches the server.
- **Never** call `http.post/put/patch/delete` from a component for a mutation.
- **Declare the fan-out** in `entities/activity/impact.ts` if the write touches
  domains beyond its own (see [CROSS_DOMAIN.md](CROSS_DOMAIN.md)).

---

## 8. Verifiable Cryptographic Integrity & Multi-Tab Replication

The ACID pipeline extends client reliability with two innovative subsystems:

### 8.1 Cryptographic Merkle Verification

Local state journals and audit logs can be verified client-side using deterministic SHA-256 binary Merkle trees ([`src/entities/crypto/merkle.ts`](../src/entities/crypto/merkle.ts)):

1. **Continuous Hash Chain:** Every recorded transaction commits to the cryptographic digest of its immediate predecessor ($H_i = \text{SHA-256}(H_{i-1} \parallel \text{canonical}(E_i))$), mathematically preventing entry deletion, insertion, or history rewriting.
2. **Merkle Inclusion Proofs:** The client can prove any journal entry's inclusion in $O(\log N)$ steps against the published root hash without downloading full remote history.
3. **Interactive Verification:** The Trust & Risk view exposes a one-click verification tool that recomputes the tree in memory and verifies mathematical integrity across all local journal entries.

### 8.2 Real-Time Multi-Tab Replication (Lamport Clocks)

Browser tabs communicate directly via HTML5 `BroadcastChannel` ([`src/lib/sync/crossTabSync.ts`](../src/lib/sync/crossTabSync.ts)):

- Mutations in tab A broadcast a `TRANSACTION_COMMITTED` message.
- Tab B receives the message, advances its logical clock ($L_{local} = \max(L_{local}, L_{msg}) + 1$), and triggers query invalidation without a server roundtrip.
- Concurrent conflicts are resolved deterministically through Last-Write-Wins (LWW) total ordering.


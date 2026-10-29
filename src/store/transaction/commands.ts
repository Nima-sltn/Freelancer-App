import { projectService, proposalService, userService } from "@/services";
import type { CommandDescriptor, CommandMap, CommandName } from "@/types";

/**
 * The command registry — the replay half of the ACID pipeline.
 *
 * A journal entry outlives the React tree that created it: it is written to
 * `localStorage` so a queued offline change survives a reload, a crash and a
 * closed tab. Closures do not survive any of that, so every write the product
 * can perform is also declared here as **data** (`{ name, args }`) and turned
 * back into a service call on replay. This is the client-side equivalent of a
 * transactional outbox: the entry is the durable record, this table is the
 * procedure that re-executes it.
 *
 * Two invariants are enforced by the types rather than by convention:
 *
 * 1. `CommandMap` (in `@/types`) is the single catalogue of writes. A typo in a
 *    command name is a compile error, and adding a write without registering it
 *    here is a compile error in the mutation that declares it.
 * 2. Executors are one-liners that delegate to `services/*` — no business logic
 *    lives here, so replaying an entry behaves exactly like the original call.
 */
type Executor<K extends CommandName> = (args: CommandMap[K]) => Promise<unknown>;

const EXECUTORS: { [K in CommandName]: Executor<K> } = {
  "project.create": ({ data }) => projectService.create(data),
  "project.update": ({ id, data }) => projectService.update(id, data),
  "project.changeStatus": ({ id, status }) => projectService.changeStatus(id, status),
  "project.remove": ({ id }) => projectService.remove(id),
  "proposal.create": ({ data }) => proposalService.create(data),
  "proposal.changeStatus": (args) => proposalService.changeStatus(args),
  "user.changeStatus": ({ userId, status }) => userService.changeStatus(userId, status),
};

export const COMMAND_NAMES = Object.keys(EXECUTORS) as CommandName[];

/** Builds a typed descriptor, e.g. `command("project.remove", { id })`. */
export function command<K extends CommandName>(name: K, args: CommandMap[K]): CommandDescriptor {
  return { name, args } as CommandDescriptor;
}

/** True when the descriptor names a write this build knows how to re-send. */
export function isReplayable(descriptor: unknown): descriptor is CommandDescriptor {
  if (!descriptor || typeof descriptor !== "object") return false;
  const { name } = descriptor as { name?: unknown };
  return typeof name === "string" && Object.hasOwn(EXECUTORS, name);
}

/**
 * Re-sends a journaled write. Throws for unknown command names so a stale
 * journal (written by an older build) surfaces as a visible, quarantined entry
 * instead of a silently dropped write.
 */
export function executeCommand(descriptor: CommandDescriptor): Promise<unknown> {
  // Read the runtime name *before* narrowing: a journal persisted by an older
  // build can carry a name this version no longer registers.
  const name: unknown = descriptor?.name;
  if (!isReplayable(descriptor)) {
    return Promise.reject(new Error(`Unknown transaction command: ${String(name)}`));
  }
  const executor = EXECUTORS[descriptor.name] as (args: unknown) => Promise<unknown>;
  return executor(descriptor.args);
}

export default executeCommand;

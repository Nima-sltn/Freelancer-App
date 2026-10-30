/**
 * Finite State Machine (FSM) for Project Lifecycle (Layer 2 - Domain Entity).
 *
 * Formalizes allowable state transitions and guards for projects. Eliminates
 * invalid state mutations and race conditions across distributed/offline states.
 *
 * Conforms to Layer 2: Pure TypeScript, zero React/DOM, fully deterministic.
 */

export type ProjectLifecycleStatus =
  | "DRAFT"
  | "OPEN"
  | "IN_PROGRESS"
  | "UNDER_REVIEW"
  | "COMPLETED"
  | "CANCELLED"
  | "DISPUTED";

export interface ProjectTransitionContext {
  readonly hasAcceptedProposal?: boolean;
  readonly hasPendingEscrow?: boolean;
  readonly hasUnresolvedDispute?: boolean;
  readonly actorRole: "OWNER" | "FREELANCER" | "ADMIN";
}

export interface TransitionRule {
  readonly from: ProjectLifecycleStatus;
  readonly to: ProjectLifecycleStatus;
  readonly allowedRoles: readonly ("OWNER" | "FREELANCER" | "ADMIN")[];
  readonly guard?: (context: ProjectTransitionContext) => boolean;
  readonly reasonCode: string;
}

/** Allowed state transitions with explicit role permissions and invariant guards. */
export const PROJECT_TRANSITION_RULES: readonly TransitionRule[] = [
  {
    from: "DRAFT",
    to: "OPEN",
    allowedRoles: ["OWNER", "ADMIN"],
    reasonCode: "PROJECT_PUBLISHED",
  },
  {
    from: "OPEN",
    to: "IN_PROGRESS",
    allowedRoles: ["OWNER", "ADMIN"],
    guard: (ctx) => Boolean(ctx.hasAcceptedProposal),
    reasonCode: "PROPOSAL_ACCEPTED_WORK_COMMENCED",
  },
  {
    from: "OPEN",
    to: "CANCELLED",
    allowedRoles: ["OWNER", "ADMIN"],
    guard: (ctx) => !ctx.hasAcceptedProposal,
    reasonCode: "PROJECT_WITHDRAWN",
  },
  {
    from: "IN_PROGRESS",
    to: "UNDER_REVIEW",
    allowedRoles: ["FREELANCER", "ADMIN"],
    reasonCode: "DELIVERABLE_SUBMITTED",
  },
  {
    from: "UNDER_REVIEW",
    to: "IN_PROGRESS",
    allowedRoles: ["OWNER", "ADMIN"],
    reasonCode: "REVISION_REQUESTED",
  },
  {
    from: "UNDER_REVIEW",
    to: "COMPLETED",
    allowedRoles: ["OWNER", "ADMIN"],
    guard: (ctx) => !ctx.hasUnresolvedDispute,
    reasonCode: "DELIVERABLE_APPROVED_FUNDS_RELEASED",
  },
  {
    from: "IN_PROGRESS",
    to: "DISPUTED",
    allowedRoles: ["OWNER", "FREELANCER", "ADMIN"],
    reasonCode: "DISPUTE_RAISED",
  },
  {
    from: "UNDER_REVIEW",
    to: "DISPUTED",
    allowedRoles: ["OWNER", "FREELANCER", "ADMIN"],
    reasonCode: "DISPUTE_RAISED",
  },
  {
    from: "DISPUTED",
    to: "COMPLETED",
    allowedRoles: ["ADMIN"],
    reasonCode: "DISPUTE_RESOLVED_RELEASE",
  },
  {
    from: "DISPUTED",
    to: "CANCELLED",
    allowedRoles: ["ADMIN"],
    reasonCode: "DISPUTE_RESOLVED_REFUND",
  },
];

export interface ProjectTransitionResult {
  readonly success: boolean;
  readonly newStatus: ProjectLifecycleStatus;
  readonly reasonCode: string;
  readonly error?: string;
}

/**
 * Checks whether a given transition is permitted under current context.
 */
export function canTransitionProject(
  from: ProjectLifecycleStatus,
  to: ProjectLifecycleStatus,
  context: ProjectTransitionContext
): boolean {
  if (from === to) return true;

  const rule = PROJECT_TRANSITION_RULES.find((r) => r.from === from && r.to === to);
  if (!rule) return false;

  if (!rule.allowedRoles.includes(context.actorRole)) return false;
  if (rule.guard && !rule.guard(context)) return false;

  return true;
}

/**
 * Executes a deterministic transition, returning an explicit outcome descriptor.
 */
export function transitionProject(
  from: ProjectLifecycleStatus,
  to: ProjectLifecycleStatus,
  context: ProjectTransitionContext
): ProjectTransitionResult {
  if (from === to) {
    return { success: true, newStatus: to, reasonCode: "NO_OP" };
  }

  const rule = PROJECT_TRANSITION_RULES.find((r) => r.from === from && r.to === to);
  if (!rule) {
    return {
      success: false,
      newStatus: from,
      reasonCode: "INVALID_TRANSITION",
      error: `Transition from ${from} to ${to} is not defined in project lifecycle.`,
    };
  }

  if (!rule.allowedRoles.includes(context.actorRole)) {
    return {
      success: false,
      newStatus: from,
      reasonCode: "UNAUTHORIZED_ROLE",
      error: `Role ${context.actorRole} is not authorized to transition ${from} -> ${to}.`,
    };
  }

  if (rule.guard && !rule.guard(context)) {
    return {
      success: false,
      newStatus: from,
      reasonCode: "GUARD_PRECONDITION_FAILED",
      error: `Preconditions for transitioning from ${from} to ${to} were not satisfied.`,
    };
  }

  return {
    success: true,
    newStatus: to,
    reasonCode: rule.reasonCode,
  };
}

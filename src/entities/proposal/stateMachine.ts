/**
 * Finite State Machine (FSM) for Proposal Lifecycle (Layer 2 - Domain Entity).
 *
 * Formalizes allowable proposal state transitions (0=REJECTED, 1=PENDING, 2=ACCEPTED)
 * with guards against duplicate acceptance, closed projects, and out-of-order writes.
 */

export type NumericProposalStatus = 0 | 1 | 2;

export interface ProposalTransitionContext {
  readonly isProjectOpen: boolean;
  readonly hasOtherAcceptedProposal: boolean;
  readonly actorRole: "OWNER" | "FREELANCER" | "ADMIN";
}

export interface ProposalTransitionResult {
  readonly success: boolean;
  readonly newStatus: NumericProposalStatus;
  readonly error?: string;
}

export function canTransitionProposal(
  currentStatus: NumericProposalStatus,
  targetStatus: NumericProposalStatus,
  context: ProposalTransitionContext
): boolean {
  if (currentStatus === targetStatus) return true;

  // Only project OWNER or ADMIN may accept (2) or reject (0)
  if (targetStatus === 2 || targetStatus === 0) {
    if (context.actorRole !== "OWNER" && context.actorRole !== "ADMIN") return false;
  }

  // Cannot accept if project is closed or another proposal is already accepted
  if (targetStatus === 2) {
    if (!context.isProjectOpen) return false;
    if (context.hasOtherAcceptedProposal) return false;
  }

  // Transitions from accepted (2) back to pending (1) are compensation/undo only
  if (currentStatus === 2 && targetStatus === 1) {
    return context.actorRole === "OWNER" || context.actorRole === "ADMIN";
  }

  return true;
}

export function transitionProposal(
  currentStatus: NumericProposalStatus,
  targetStatus: NumericProposalStatus,
  context: ProposalTransitionContext
): ProposalTransitionResult {
  if (canTransitionProposal(currentStatus, targetStatus, context)) {
    return { success: true, newStatus: targetStatus };
  }

  return {
    success: false,
    newStatus: currentStatus,
    error: `Cannot transition proposal from status ${currentStatus} to ${targetStatus} under current conditions.`,
  };
}

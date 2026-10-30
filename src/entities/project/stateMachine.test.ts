import { describe, expect, it } from "vitest";
import {
  canTransitionProject,
  transitionProject,
  type ProjectTransitionContext,
} from "./stateMachine";
import {
  canTransitionProposal,
  transitionProposal,
  type ProposalTransitionContext,
} from "../proposal/stateMachine";

describe("Project Finite State Machine", () => {
  const baseContext: ProjectTransitionContext = {
    actorRole: "OWNER",
    hasAcceptedProposal: false,
    hasPendingEscrow: false,
    hasUnresolvedDispute: false,
  };

  it("permits OWNER to transition DRAFT -> OPEN", () => {
    expect(canTransitionProject("DRAFT", "OPEN", baseContext)).toBe(true);
    const res = transitionProject("DRAFT", "OPEN", baseContext);
    expect(res.success).toBe(true);
    expect(res.newStatus).toBe("OPEN");
    expect(res.reasonCode).toBe("PROJECT_PUBLISHED");
  });

  it("prevents FREELANCER from publishing DRAFT -> OPEN", () => {
    const freelancerCtx: ProjectTransitionContext = { ...baseContext, actorRole: "FREELANCER" };
    expect(canTransitionProject("DRAFT", "OPEN", freelancerCtx)).toBe(false);
    const res = transitionProject("DRAFT", "OPEN", freelancerCtx);
    expect(res.success).toBe(false);
    expect(res.reasonCode).toBe("UNAUTHORIZED_ROLE");
  });

  it("enforces accepted proposal guard for OPEN -> IN_PROGRESS", () => {
    // Without accepted proposal: fails guard
    expect(canTransitionProject("OPEN", "IN_PROGRESS", baseContext)).toBe(false);

    // With accepted proposal: succeeds
    const readyCtx: ProjectTransitionContext = { ...baseContext, hasAcceptedProposal: true };
    expect(canTransitionProject("OPEN", "IN_PROGRESS", readyCtx)).toBe(true);
    const res = transitionProject("OPEN", "IN_PROGRESS", readyCtx);
    expect(res.success).toBe(true);
    expect(res.newStatus).toBe("IN_PROGRESS");
  });

  it("disallows arbitrary illegal transitions", () => {
    expect(canTransitionProject("DRAFT", "COMPLETED", baseContext)).toBe(false);
    const res = transitionProject("DRAFT", "COMPLETED", baseContext);
    expect(res.success).toBe(false);
    expect(res.reasonCode).toBe("INVALID_TRANSITION");
  });
});

describe("Proposal Finite State Machine", () => {
  const baseProposalCtx: ProposalTransitionContext = {
    actorRole: "OWNER",
    isProjectOpen: true,
    hasOtherAcceptedProposal: false,
  };

  it("allows OWNER to accept a proposal if project is open", () => {
    expect(canTransitionProposal(1, 2, baseProposalCtx)).toBe(true);
    const res = transitionProposal(1, 2, baseProposalCtx);
    expect(res.success).toBe(true);
    expect(res.newStatus).toBe(2);
  });

  it("forbids accepting a proposal if project is closed", () => {
    const closedCtx: ProposalTransitionContext = { ...baseProposalCtx, isProjectOpen: false };
    expect(canTransitionProposal(1, 2, closedCtx)).toBe(false);
    const res = transitionProposal(1, 2, closedCtx);
    expect(res.success).toBe(false);
  });

  it("forbids accepting a proposal if another proposal is already accepted", () => {
    const conflictCtx: ProposalTransitionContext = { ...baseProposalCtx, hasOtherAcceptedProposal: true };
    expect(canTransitionProposal(1, 2, conflictCtx)).toBe(false);
  });

  it("forbids FREELANCER from deciding proposal outcome", () => {
    const freelancerCtx: ProposalTransitionContext = { ...baseProposalCtx, actorRole: "FREELANCER" };
    expect(canTransitionProposal(1, 2, freelancerCtx)).toBe(false);
  });
});

import type { ProposalStatus, ProjectStatus, UserRole, UserStatus } from "@/types";

/** Mirrors `utils/constants.js` on the API. */
export const ROLES = {
  OWNER: "OWNER",
  FREELANCER: "FREELANCER",
  ADMIN: "ADMIN",
} as const satisfies Record<string, UserRole>;

export const ROLE_LABEL: Record<UserRole, { fa: string; en: string }> = {
  OWNER: { fa: "کارفرما", en: "Client" },
  FREELANCER: { fa: "فریلنسر", en: "Freelancer" },
  ADMIN: { fa: "مدیر", en: "Admin" },
};

/** Where each role lands after signing in. */
export const ROLE_HOME: Record<UserRole, string> = {
  OWNER: "/owner/dashboard",
  FREELANCER: "/freelancer/dashboard",
  ADMIN: "/admin/dashboard",
};

export type StatusTone = "success" | "warning" | "danger" | "neutral";

export interface StatusMeta {
  readonly labelKey: string;
  readonly tone: StatusTone;
}

/** The API stores verification state as a numeric enum. */
export const USER_STATUS: Record<UserStatus, StatusMeta> = {
  0: { labelKey: "status.user.rejected", tone: "danger" },
  1: { labelKey: "status.user.pending", tone: "warning" },
  2: { labelKey: "status.user.verified", tone: "success" },
};

export const PROPOSAL_STATUS: Record<ProposalStatus, StatusMeta> = {
  0: { labelKey: "status.proposal.rejected", tone: "danger" },
  1: { labelKey: "status.proposal.pending", tone: "warning" },
  2: { labelKey: "status.proposal.accepted", tone: "success" },
};

export const PROJECT_STATUS: Record<ProjectStatus, StatusMeta> = {
  OPEN: { labelKey: "status.project.open", tone: "success" },
  CLOSED: { labelKey: "status.project.closed", tone: "neutral" },
};

export const CATEGORY_FILTER_ALL = "ALL";

export const SORT_OPTIONS = [
  { value: "latest", labelKey: "sort.latest" },
  { value: "earliest", labelKey: "sort.earliest" },
] as const;

export const PAGE_SIZES = [10, 20, 50] as const;

/** Platform commission taken from an accepted proposal, used by the ledger view. */
export const PLATFORM_FEE_RATE = 0.07;

export const CURRENCY = { fa: "تومان", en: "IRR", symbol: "﷼" } as const;

/** Rough XP rules powering the gamification layer. */
export const XP_RULES = {
  perProposal: 12,
  perAcceptedProposal: 60,
  perCompletedProject: 90,
  perVerifiedProfile: 25,
  perReview: 15,
} as const;

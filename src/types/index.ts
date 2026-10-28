/**
 * Shared domain contracts.
 *
 * These types describe the wire format of the Express API plus the few
 * client-derived entities the product adds on top of it (trust, analytics,
 * ledger, notifications). They are intentionally dependency-free so they can be
 * imported from services, stores, mocks and tests alike.
 */

/* ========================================================================== */
/* Primitives                                                                 */
/* ========================================================================== */

export type UserRole = "OWNER" | "FREELANCER" | "ADMIN";
/** 0 = rejected, 1 = awaiting review, 2 = verified */
export type UserStatus = 0 | 1 | 2;
/** 0 = rejected, 1 = awaiting review, 2 = accepted */
export type ProposalStatus = 0 | 1 | 2;
export type ProjectStatus = "OPEN" | "CLOSED";
export type Locale = "fa" | "en";

export interface Timestamped {
  createdAt?: string;
  updatedAt?: string;
}

/** The API wraps every payload in `{ statusCode, data }`. */
export interface ApiEnvelope<T> {
  statusCode: number;
  data: T;
}

export interface MessageResponse {
  message: string;
}

/* ========================================================================== */
/* Users                                                                      */
/* ========================================================================== */

export interface User extends Timestamped {
  _id: string;
  name: string;
  email: string;
  phoneNumber: string;
  role: UserRole;
  status: UserStatus;
  isActive: boolean;
  avatarUrl?: string;
  bio?: string;
  skills?: string[];
  city?: string;
  hourlyRate?: number;
  rating?: number;
  reviewsCount?: number;
  completedProjects?: number;
  responseHours?: number;
  /** Client-derived trust signals, see entities/user/trust.ts */
  trust?: TrustProfile;
}

export interface TrustProfile {
  score: number;
  level: "bronze" | "silver" | "gold" | "platinum";
  signals: Array<{ key: string; labelKey: string; weight: number; passed: boolean }>;
}

export interface AuthResponse extends MessageResponse {
  user?: User;
}

export interface OtpResponse extends MessageResponse {
  /** Present when the API echoes the phone number back (mock mode does). */
  phoneNumber?: string;
}

export interface CompleteProfileData {
  name: string;
  email: string;
  role: Extract<UserRole, "OWNER" | "FREELANCER">;
}

/* ========================================================================== */
/* Categories                                                                 */
/* ========================================================================== */

export interface Category {
  _id: string;
  title: string;
  englishTitle: string;
  description?: string;
  icon?: string;
  /** Derived: how many open projects reference this category. */
  openProjects?: number;
  averageBudget?: number;
}

export interface CategoryOption {
  label: string;
  value: string;
}

/* ========================================================================== */
/* Projects                                                                   */
/* ========================================================================== */

export interface ProjectOwnerRef {
  _id: string;
  name: string;
}

export interface Project extends Timestamped {
  _id: string;
  title: string;
  titleEn?: string;
  description: string;
  descriptionEn?: string;
  budget: number;
  deadline: string;
  tags: string[];
  status: ProjectStatus;
  category: Pick<Category, "_id" | "title"> & { englishTitle?: string };
  freelancer?: ProjectOwnerRef | User | null;
  owner?: ProjectOwnerRef | User;
  proposals: Proposal[];
  /** Client-derived enrichment (never sent to the API). */
  priority?: ProjectPriority;
  difficulty?: "easy" | "medium" | "hard";
}

export type ProjectPriority = "low" | "normal" | "high" | "urgent";

export interface CreateProjectData {
  title: string;
  description: string;
  budget: number;
  tags: string[];
  category: string;
  deadline: string;
}

export interface EditProjectData {
  editId: string;
  id: string;
  newProject: CreateProjectData;
}

export interface ProjectFilters {
  search?: string;
  category?: string;
  status?: string;
  sort?: string;
  page?: number;
  pageSize?: number;
  minBudget?: number;
  maxBudget?: number;
}

/* ========================================================================== */
/* Proposals                                                                  */
/* ========================================================================== */

export interface Proposal extends Timestamped {
  _id: string;
  description: string;
  descriptionEn?: string;
  price: number;
  duration: number;
  status: ProposalStatus;
  user: User | ProjectOwnerRef;
  project?: Project;
  projectId?: string;
  /** Derived enrichment. */
  score?: MatchScore;
  risk?: RiskAssessment;
}

export interface CreateProposalData {
  description: string;
  price: number;
  duration: number;
  projectId: string;
}

/* ========================================================================== */
/* Cross-domain derived entities                                              */
/* ========================================================================== */

export interface MatchScore {
  /** 0 – 100 */
  score: number;
  tier: "excellent" | "good" | "fair" | "weak";
  factors: Array<{
    key: string;
    labelKey: string;
    /** Contribution to the final score, 0 – 100 */
    value: number;
    weight: number;
    detail?: string;
  }>;
}

export interface RiskAssessment {
  level: "low" | "medium" | "high";
  score: number;
  flags: Array<{ key: string; labelKey: string; severity: "low" | "medium" | "high" }>;
}

export type NotificationKind =
  | "proposal.created"
  | "proposal.accepted"
  | "proposal.rejected"
  | "project.created"
  | "project.closed"
  | "user.verified"
  | "ledger.entry"
  | "system";

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  titleKey: string;
  bodyKey?: string;
  params?: Record<string, string | number>;
  href?: string;
  createdAt: string;
  read: boolean;
  severity: "info" | "success" | "warning" | "danger";
}

export interface ChatMessage {
  id: string;
  authorId: string;
  authorName: string;
  body: string;
  createdAt: string;
  pending?: boolean;
}

export interface Conversation {
  id: string;
  projectId?: string;
  title: string;
  participantIds: string[];
  messages: ChatMessage[];
  unread: number;
}

export type LedgerEntryKind = "escrow-in" | "escrow-release" | "payout" | "fee" | "refund";
export type LedgerEntryStatus = "pending" | "settled" | "failed";

export interface LedgerEntry {
  id: string;
  kind: LedgerEntryKind;
  status: LedgerEntryStatus;
  amount: number;
  fee?: number;
  projectId?: string;
  projectTitle?: string;
  /** Who the money is moving to/from, as a role (the view localises it). */
  counterpartyRole?: UserRole;
  counterpartyName?: string;
  createdAt: string;
}

export interface Milestone {
  id: string;
  title: string;
  amount: number;
  dueDate: string;
  status: "planned" | "in-progress" | "done";
}

export interface AuditEntry {
  id: string;
  actorName: string;
  actionKey: string;
  entity: "project" | "proposal" | "user" | "system";
  entityLabel: string;
  at: string;
  meta?: Record<string, string | number>;
  /** Where the event originated: the API or the local ACID journal. */
  source: "remote" | "local";
  /** For local writes: the transaction outcome, so views can colour and explain it. */
  state?: "pending" | "committed" | "rolled-back" | "queued";
  /** For local writes: the failure, when there was one. */
  error?: string;
}

export interface Review {
  id: string;
  projectId: string;
  projectTitle: string;
  fromName: string;
  toId: string;
  rating: number;
  comment: string;
  createdAt: string;
}

/* ========================================================================== */
/* Analytics                                                                  */
/* ========================================================================== */

export interface SeriesPoint {
  label: string;
  value: number;
  /** Optional second series (e.g. cumulative) */
  secondary?: number;
}

export interface DistributionSlice {
  label: string;
  value: number;
  color?: string;
}

export interface AnalyticsSnapshot {
  totals: {
    projects: number;
    openProjects: number;
    proposals: number;
    acceptedProposals: number;
    users: number;
    pendingUsers: number;
  };
  money: {
    escrow: number;
    released: number;
    averageBudget: number;
    averageProposal: number;
  };
  rates: {
    acceptanceRate: number;
    averageProposalsPerProject: number;
    averageDeliveryDays: number;
  };
  timeline: SeriesPoint[];
  categoryDistribution: DistributionSlice[];
  statusDistribution: DistributionSlice[];
  budgetBuckets: SeriesPoint[];
}

/* ========================================================================== */
/* Iconography                                                                */
/* ========================================================================== */

/**
 * Names of the icon registry (`components/ui/IconFor`).
 *
 * Navigation, command palettes and menus are *data*, so they store a key rather
 * than a React element — otherwise `config/` would have to import the UI layer,
 * and the dependency rule in `docs/ARCHITECTURE.md` would be fiction.
 */
export type IconName =
  | "home"
  | "grid"
  | "clipboard"
  | "board"
  | "users"
  | "collection"
  | "shield"
  | "chart"
  | "document"
  | "wallet"
  | "star"
  | "chat"
  | "settings"
  | "palette";

/* ========================================================================== */
/* Transaction commands (replayable writes)                                   */
/* ========================================================================== */

/**
 * The catalogue of writes the client can perform, expressed as **data**.
 *
 * A journal entry has to survive a page reload, so it cannot hold a closure
 * (`request: () => …` is not serialisable). Declaring every write as a
 * `{ name, args }` descriptor is what makes the offline outbox genuinely
 * durable: the entry is persisted, and `store/transaction/commands.ts` turns it
 * back into a service call on replay. Adding a write to the product therefore
 * also means adding it here — which is the point: the compiler (this union is
 * exhaustively checked) tells you when you forget.
 */
export interface CommandMap {
  "project.create": { data: CreateProjectData };
  "project.update": { id: string; data: CreateProjectData };
  "project.changeStatus": { id: string; status: ProjectStatus };
  "project.remove": { id: string };
  "proposal.create": { data: CreateProposalData };
  "proposal.changeStatus": { proposalId: string; projectId: string; status: ProposalStatus };
  "user.changeStatus": { userId: string; status: UserStatus };
}

export type CommandName = keyof CommandMap;

/** A serialised write: the name of a registered command plus its arguments. */
export type CommandDescriptor = {
  [K in CommandName]: { name: K; args: CommandMap[K] };
}[CommandName];

/* ========================================================================== */
/* UI helpers                                                                 */
/* ========================================================================== */

export interface StatusStyle {
  label: string;
  tone: "success" | "warning" | "danger" | "neutral" | "info";
}

export interface FilterOption {
  value: string;
  label: string;
}

export interface RadioOption {
  value: string;
  label: string;
}

export interface RadioGroupConfig {
  name: string;
  validationSchema?: Record<string, unknown>;
  options: RadioOption[];
}

export interface SelectOption<T extends string | number = string> {
  value: T;
  label: string;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

export interface SortState {
  field: string;
  direction: "asc" | "desc";
}

/* ========================================================================== */
/* Axios augmentation                                                         */
/* ========================================================================== */

declare module "axios" {
  interface AxiosRequestConfig {
    /** Internal: prevents infinite refresh loops. */
    _retry?: boolean;
    /** Internal: set for auth endpoints that must not trigger a refresh. */
    _skipAuthRefresh?: boolean;
    /** Internal: set by tests to bypass the mock adapter. */
    _skipMock?: boolean;
  }
}

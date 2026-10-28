/**
 * Centralised React Query key factory.
 *
 * Cache invalidation is the most common source of stale UI, so every key is
 * declared here once and referenced by symbolic name. Keys are hierarchical,
 * which lets a single `invalidateQueries({ queryKey: keys.projects.all })` flush
 * every derived view (lists, dashboards, analytics) at the same time.
 */
export const queryKeys = {
  auth: {
    profile: ["auth", "profile"] as const,
  },
  categories: {
    all: ["categories"] as const,
    detail: (id: string) => ["categories", id] as const,
  },
  projects: {
    all: ["projects"] as const,
    list: (filters: Record<string, unknown> = {}) => ["projects", "list", filters] as const,
    owned: ["projects", "owned"] as const,
    detail: (id: string | undefined) => ["projects", "detail", id] as const,
  },
  proposals: {
    all: ["proposals"] as const,
    list: (filters: Record<string, unknown> = {}) => ["proposals", "list", filters] as const,
    detail: (id: string) => ["proposals", "detail", id] as const,
  },
  users: {
    all: ["users"] as const,
    list: (filters: Record<string, unknown> = {}) => ["users", "list", filters] as const,
    detail: (id: string) => ["users", "detail", id] as const,
  },
  notifications: {
    all: ["notifications"] as const,
  },
  conversations: {
    all: ["conversations"] as const,
  },
  ledger: {
    all: ["ledger"] as const,
  },
} as const;

export type QueryKeys = typeof queryKeys;

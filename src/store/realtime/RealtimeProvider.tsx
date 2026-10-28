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
import { useQueryClient } from "@tanstack/react-query";
import { env } from "@/config/env";
import { queryKeys } from "@/config/queryKeys";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { APP_EVENTS, appEvents } from "@/lib/eventBus";

export interface RealtimeContextValue {
  /** ISO timestamp of the last successful refresh. */
  lastSyncAt: string | null;
  isSyncing: boolean;
  syncNow: () => Promise<void>;
  /** Seconds until the next automatic refresh (for countdowns). */
  nextSyncIn: number;
}

const RealtimeContext = createContext<RealtimeContextValue | undefined>(undefined);

const SYNC_INTERVAL_MS = 45_000;

/**
 * Live-ish data layer.
 *
 * The Express API has no websocket channel, so the app polls deliberately: a
 * single interval invalidates the aggregate list queries only while the tab is
 * visible and the connection is healthy. Combined with React Query's
 * stale-while-revalidate this gives the *perception* of live data (dashboards
 * refresh themselves, collaborators' changes appear) without a backend change,
 * and it backs off automatically when the user is idle or offline.
 */
export function RealtimeProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const { online, degraded } = useOnlineStatus();
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(SYNC_INTERVAL_MS / 1000);
  const isSyncing = useRef(false);

  const syncNow = useCallback(async () => {
    if (isSyncing.current) return;
    isSyncing.current = true;
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.projects.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.proposals.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.users.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.categories.all }),
      ]);
      setLastSyncAt(new Date().toISOString());
      appEvents.emit(APP_EVENTS.realtimeTick);
    } finally {
      isSyncing.current = false;
    }
  }, [queryClient]);

  useEffect(() => {
    if (!env.flags.realtime || !online || degraded) return;

    const interval = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void syncNow();
    }, SYNC_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [degraded, online, syncNow]);

  useEffect(() => {
    const tick = window.setInterval(() => {
      setCountdown((value) => (value <= 1 ? SYNC_INTERVAL_MS / 1000 : value - 1));
    }, 1000);
    return () => window.clearInterval(tick);
  }, []);

  const value = useMemo<RealtimeContextValue>(
    () => ({ lastSyncAt, isSyncing: isSyncing.current, syncNow, nextSyncIn: countdown }),
    [countdown, lastSyncAt, syncNow]
  );

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}

export function useRealtime(): RealtimeContextValue {
  const context = useContext(RealtimeContext);
  if (!context) throw new Error("useRealtime must be used inside <RealtimeProvider>");
  return context;
}

export default RealtimeProvider;

import { useEffect, useState } from "react";
import { APP_EVENTS, appEvents } from "@/lib/eventBus";

/**
 * Tracks connectivity. The HTTP layer also emits network failures, so an
 * unreachable API (server down, wrong base URL) is treated as "degraded" even
 * when `navigator.onLine` still reports true.
 */
export interface ConnectivityState {
  online: boolean;
  /** True when the browser is online but the API was unreachable. */
  degraded: boolean;
}

export function useOnlineStatus(): ConnectivityState {
  const [online, setOnline] = useState(
    typeof navigator === "undefined" ? true : navigator.onLine
  );
  const [degraded, setDegraded] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setOnline(true);
      setDegraded(false);
      appEvents.emit(APP_EVENTS.networkOnline);
    };
    const handleOffline = () => setOnline(false);
    const handleApiFailure = () => setDegraded(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    const unsubscribe = appEvents.on(APP_EVENTS.networkOffline, handleApiFailure);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      unsubscribe();
    };
  }, []);

  return { online, degraded };
}

export default useOnlineStatus;

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { storage } from "@/lib/storage";
import { APP_EVENTS, appEvents } from "@/lib/eventBus";
import { formatNumber } from "@/lib/format/numbers";
import type { AppNotification } from "@/types";

export interface NotificationInput {
  id: string;
  kind: AppNotification["kind"];
  titleKey: string;
  bodyKey?: string;
  params?: Record<string, string | number>;
  href?: string;
  severity?: AppNotification["severity"];
  createdAt?: string;
}

export interface NotificationContextValue {
  items: AppNotification[];
  unreadCount: number;
  /** Adds notifications that are not already known (idempotent by id). */
  merge: (incoming: NotificationInput[]) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  remove: (id: string) => void;
  clear: () => void;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

const STORAGE_KEY = "notifications";
const MAX_ITEMS = 50;

/**
 * Notification centre.
 *
 * Notifications are *derived* from domain data rather than stored server-side:
 * a new proposal, an accepted bid or an approaching deadline becomes an entry
 * the first time the client observes it. That keeps the feature working against
 * the existing API (no new backend endpoint needed), survives reloads through
 * local persistence, and de-duplicates by deterministic id so the same event is
 * never announced twice.
 */
export function NotificationProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<AppNotification[]>(() =>
    storage.get<AppNotification[]>(STORAGE_KEY, [])
  );

  useEffect(() => {
    storage.set(STORAGE_KEY, items.slice(-MAX_ITEMS));
  }, [items]);

  const merge = useCallback((incoming: NotificationInput[]) => {
    if (incoming.length === 0) return;
    setItems((current) => {
      const known = new Set(current.map((item) => item.id));
      const additions = incoming
        .filter((item) => !known.has(item.id))
        .map<AppNotification>((item) => ({
          id: item.id,
          kind: item.kind,
          titleKey: item.titleKey,
          bodyKey: item.bodyKey,
          params: item.params,
          href: item.href,
          createdAt: item.createdAt ?? new Date().toISOString(),
          read: false,
          severity: item.severity ?? "info",
        }));

      if (additions.length === 0) return current;

      additions.forEach((item) => {
        appEvents.emit(APP_EVENTS.notificationCreated, item);
      });

      return [...additions, ...current]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, MAX_ITEMS);
    });
  }, []);

  const markRead = useCallback((id: string) => {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, read: true } : item))
    );
  }, []);

  const markAllRead = useCallback(() => {
    setItems((current) => current.map((item) => ({ ...item, read: true })));
  }, []);

  const remove = useCallback((id: string) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo<NotificationContextValue>(
    () => ({
      items,
      unreadCount: items.filter((item) => !item.read).length,
      merge,
      markRead,
      markAllRead,
      remove,
      clear,
    }),
    [clear, items, markAllRead, markRead, merge, remove]
  );

  return (
    <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>
  );
}

export function useNotifications(): NotificationContextValue {
  const context = useContext(NotificationContext);
  if (!context) throw new Error("useNotifications must be used inside <NotificationProvider>");
  return context;
}

/** Localised unread counter, e.g. `۴ خوانده‌نشده`. */
export function useUnreadLabel(): string {
  const { unreadCount } = useNotifications();
  return formatNumber(unreadCount);
}

export default NotificationProvider;

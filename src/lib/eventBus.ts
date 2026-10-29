/**
 * Application-wide event bus.
 *
 * Used for signals that must cross feature boundaries without creating an
 * import cycle (the HTTP layer announces network/auth problems; the store
 * layer and UI react to them).
 */

export const APP_EVENTS = {
  networkOffline: "app:network-offline",
  networkOnline: "app:network-online",
  authExpired: "app:auth-expired",
  transactionCommitted: "app:transaction-committed",
  transactionRolledBack: "app:transaction-rolled-back",
  queueDrained: "app:queue-drained",
  notificationCreated: "app:notification-created",
  realtimeTick: "app:realtime-tick",
} as const;

export type AppEvent = (typeof APP_EVENTS)[keyof typeof APP_EVENTS];

type Listener = (payload?: unknown) => void;

class EventBus {
  private readonly listeners = new Map<string, Set<Listener>>();

  on(event: string, listener: Listener): () => void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(listener);
    return () => this.off(event, listener);
  }

  once(event: string, listener: Listener): () => void {
    const unsubscribe = this.on(event, (payload) => {
      unsubscribe();
      listener(payload);
    });
    return unsubscribe;
  }

  off(event: string, listener: Listener): void {
    this.listeners.get(event)?.delete(listener);
  }

  emit(event: string, payload?: unknown): void {
    this.listeners.get(event)?.forEach((listener) => {
      try {
        listener(payload);
      } catch (error) {
        // A broken listener must not stop the others.
        if (import.meta.env?.DEV) console.error(`[eventBus] listener failed for ${event}`, error);
      }
    });
  }

  clear(): void {
    this.listeners.clear();
  }
}

export const appEvents = new EventBus();
export default appEvents;

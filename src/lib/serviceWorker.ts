import { env } from "@/config/env";

/**
 * Interface representing the BeforeInstallPromptEvent fired by modern browsers
 * when the app meets PWA install criteria.
 */
export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export type ServiceWorkerUpdateCallback = (registration: ServiceWorkerRegistration) => void;

let deferredInstallPrompt: BeforeInstallPromptEvent | null = null;
const installListeners = new Set<(prompt: BeforeInstallPromptEvent | null) => void>();
const updateListeners = new Set<ServiceWorkerUpdateCallback>();

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstallPrompt = event as BeforeInstallPromptEvent;
    installListeners.forEach((listener) => listener(deferredInstallPrompt));
  });

  window.addEventListener("appinstalled", () => {
    deferredInstallPrompt = null;
    installListeners.forEach((listener) => listener(null));
  });
}

/**
 * Returns the currently deferred PWA install prompt event, if available.
 */
export function getInstallPrompt(): BeforeInstallPromptEvent | null {
  return deferredInstallPrompt;
}

/**
 * Clears the stored install prompt.
 */
export function clearInstallPrompt(): void {
  deferredInstallPrompt = null;
  installListeners.forEach((listener) => listener(null));
}

/**
 * Triggers the native browser install prompt dialog if captured.
 */
export async function promptInstall(): Promise<"accepted" | "dismissed" | "unavailable"> {
  if (!deferredInstallPrompt) return "unavailable";

  try {
    await deferredInstallPrompt.prompt();
    const { outcome } = await deferredInstallPrompt.userChoice;
    clearInstallPrompt();
    return outcome;
  } catch {
    clearInstallPrompt();
    return "unavailable";
  }
}

/**
 * Subscribes to changes in PWA install availability.
 */
export function onInstallPromptChange(
  listener: (prompt: BeforeInstallPromptEvent | null) => void
): () => void {
  installListeners.add(listener);
  listener(deferredInstallPrompt);
  return () => installListeners.delete(listener);
}

/**
 * Subscribes to service worker update events (when a new worker is installed and waiting).
 */
export function onServiceWorkerUpdate(callback: ServiceWorkerUpdateCallback): () => void {
  updateListeners.add(callback);
  return () => updateListeners.delete(callback);
}

/**
 * Requests notification permission from the user.
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "denied";
  }

  if (Notification.permission === "granted") {
    return "granted";
  }

  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch {
    return "denied";
  }
}

/**
 * Tells the waiting service worker to skip waiting and activate immediately.
 */
export function skipWaiting(registration?: ServiceWorkerRegistration): void {
  if (registration?.waiting) {
    registration.waiting.postMessage("SKIP_WAITING");
    return;
  }

  if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
    navigator.serviceWorker.ready.then((reg) => {
      reg.waiting?.postMessage("SKIP_WAITING");
    });
  }
}

/**
 * Registers a Background Sync tag for offline mutation reconciliation.
 */
export async function registerBackgroundSync(tag: string = "offline-sync"): Promise<boolean> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const syncManager = (registration as any).sync;
    if (syncManager && typeof syncManager.register === "function") {
      await syncManager.register(tag);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Registers the offline app-shell worker with lifecycle listeners.
 *
 * Disabled in development by default (a stale cache while coding is worse than no cache)
 * and behind `VITE_ENABLE_SERVICE_WORKER` so deployments can opt out.
 */
export function registerServiceWorker(): void {
  if (!env.flags.serviceWorker) return;
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((registration) => {
        // If there's already a waiting worker, notify subscribers
        if (registration.waiting) {
          updateListeners.forEach((cb) => cb(registration));
        }

        // Listen for new worker installation
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              updateListeners.forEach((cb) => cb(registration));
            }
          });
        });
      })
      .catch((error) => {
        if (env.isDev) {
          // eslint-disable-next-line no-console
          console.warn("[serviceWorker] registration failed", error);
        }
      });
  });
}

export default registerServiceWorker;

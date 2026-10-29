/* FreelanceHub Advanced PWA Service Worker
 * Strategies:
 *   - Navigations: Network-first with shell & offline.html fallbacks
 *   - Static assets (scripts, styles, images, fonts): Stale-while-revalidate with cache size limits
 *   - /api requests: Network-only (fresh, cookie-authenticated endpoints)
 * Features:
 *   - Versioned cache with automated stale cache cleanup
 *   - Cache trimming (max 100 entries per cache)
 *   - Background sync support for offline mutation queues
 *   - Push notification readiness & click routing
 *   - Periodic background sync handler stub
 *   - Client messaging & skip-waiting orchestration
 */

const VERSION = "fh-v2.0.0";
const SHELL_CACHE = `${VERSION}-shell`;
const ASSET_CACHE = `${VERSION}-assets`;
const OFFLINE_URL = "/offline.html";
const MAX_CACHE_ITEMS = 100;

const PRECACHE_ASSETS = [
  "/",
  OFFLINE_URL,
  "/manifest.webmanifest",
  "/icon.svg",
  "/icon-maskable.svg",
];

/**
 * Trims a cache to keep the number of stored entries below `maxItems`.
 * Employs FIFO eviction (oldest items first).
 */
async function trimCache(cacheName, maxItems) {
  try {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    if (keys.length > maxItems) {
      const deleteCount = keys.length - maxItems;
      for (let i = 0; i < deleteCount; i++) {
        await cache.delete(keys[i]);
      }
    }
  } catch (error) {
    // Cache trimming is best-effort and should not break active requests
    console.warn("[SW] Cache trim error:", error);
  }
}

/**
 * Broadcasts a message to all active controlled clients.
 */
async function broadcastMessage(message) {
  const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  for (const client of clients) {
    client.postMessage(message);
  }
}

// ------------------------------------------------------------- Lifecycle: Install
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(SHELL_CACHE);
        // Precache critical shell assets
        await cache.addAll(PRECACHE_ASSETS);
      } catch (err) {
        console.warn("[SW] Precache failed during install:", err);
      }
      // Activate immediately once installed
      await self.skipWaiting();
    })()
  );
});

// ------------------------------------------------------------ Lifecycle: Activate
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames
            .filter((name) => !name.startsWith(VERSION))
            .map((name) => caches.delete(name))
        );
      } catch (err) {
        console.warn("[SW] Cache cleanup failed during activate:", err);
      }

      // Claim all clients immediately
      await self.clients.claim();

      // Notify clients of activation
      await broadcastMessage({ type: "SW_ACTIVATED", version: VERSION });
    })()
  );
});

// ----------------------------------------------------------------- Fetch Handler
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only intercept GET requests
  if (request.method !== "GET") return;

  // Skip non-http/https requests (e.g. chrome-extension://)
  if (!request.url.startsWith("http://") && !request.url.startsWith("https://")) return;

  const url = new URL(request.url);

  // Network-only for API endpoints — fresh data with cookie authentication
  if (url.pathname.startsWith("/api")) return;

  // 1. Navigation requests: Network-first with offline fallback
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const networkResponse = await fetch(request);
          if (networkResponse && networkResponse.status === 200) {
            const cache = await caches.open(SHELL_CACHE);
            cache.put("/", networkResponse.clone()).catch(() => {});
          }
          return networkResponse;
        } catch (fetchErr) {
          console.debug("Service worker navigation fetch failed, serving cache:", fetchErr);
          // Offline fallback: try exact match, then shell root, then offline page
          const cachedNavigate =
            (await caches.match(request)) ||
            (await caches.match("/")) ||
            (await caches.match(OFFLINE_URL));

          if (cachedNavigate) return cachedNavigate;

          return new Response("Offline - FreelanceHub", {
            status: 503,
            statusText: "Service Unavailable",
            headers: { "Content-Type": "text/plain; charset=utf-8" },
          });
        }
      })()
    );
    return;
  }

  // 2. Static assets: Stale-while-revalidate
  event.respondWith(
    (async () => {
      const cachedResponse = await caches.match(request);

      const fetchPromise = (async () => {
        try {
          const networkResponse = await fetch(request);
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            (networkResponse.type === "basic" || networkResponse.type === "cors")
          ) {
            const cache = await caches.open(ASSET_CACHE);
            await cache.put(request, networkResponse.clone());
            // Trim cache asynchronously to bound storage growth
            trimCache(ASSET_CACHE, MAX_CACHE_ITEMS).catch(() => {});
          }
          return networkResponse;
        } catch (err) {
          console.debug("Service worker asset fetch failed:", err);
          return null;
        }
      })();

      // If cached version exists, return it immediately while network updates in background
      if (cachedResponse) {
        event.waitUntil(fetchPromise);
        return cachedResponse;
      }

      // If cache miss, await network response
      const networkResult = await fetchPromise;
      if (networkResult) return networkResult;

      // Both cache and network failed
      return new Response("", { status: 408, statusText: "Request Timeout / Offline" });
    })()
  );
});

// --------------------------------------------------------------- Background Sync
self.addEventListener("sync", (event) => {
  if (
    event.tag === "offline-sync" ||
    event.tag === "sync-mutations" ||
    event.tag === "offline-queue"
  ) {
    event.waitUntil(
      (async () => {
        // Notify open tabs to trigger queue processing
        await broadcastMessage({
          type: "BACKGROUND_SYNC_TRIGGERED",
          tag: event.tag,
          timestamp: Date.now(),
        });
      })()
    );
  }
});

// ------------------------------------------------------------- Push Notification
self.addEventListener("push", (event) => {
  let payload = {
    title: "FreelanceHub",
    body: "پیام جدید دریافت شد / New notification",
    url: "/",
  };

  try {
    if (event.data) {
      payload = Object.assign(payload, event.data.json());
    }
  } catch {
    if (event.data) {
      payload.body = event.data.text();
    }
  }

  const notificationOptions = {
    body: payload.body,
    icon: "/icon.svg",
    badge: "/icon.svg",
    data: {
      url: payload.url || "/",
      timestamp: Date.now(),
    },
    dir: "auto",
    vibrate: [100, 50, 100],
    actions: [{ action: "open", title: "مشاهده / View" }],
  };

  event.waitUntil(
    self.registration.showNotification(payload.title, notificationOptions)
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    (async () => {
      const windowClients = await self.clients.matchAll({ type: "window" });
      for (const client of windowClients) {
        if (client.url === targetUrl && "focus" in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })()
  );
});

// ------------------------------------------------------------ Periodic Background Sync
self.addEventListener("periodicsync", (event) => {
  if (event.tag === "update-cache" || event.tag === "daily-refresh") {
    event.waitUntil(
      (async () => {
        try {
          const cache = await caches.open(SHELL_CACHE);
          await cache.addAll([OFFLINE_URL, "/manifest.webmanifest"]);
        } catch (err) {
          console.warn("[SW] Periodic sync cache update failed:", err);
        }
      })()
    );
  }
});

// ------------------------------------------------------------- Client Messaging
self.addEventListener("message", (event) => {
  if (!event.data) return;

  if (event.data === "SKIP_WAITING" || event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
    return;
  }

  if (event.data.type === "GET_VERSION") {
    if (event.ports && event.ports[0]) {
      event.ports[0].postMessage({ version: VERSION });
    }
    return;
  }

  if (event.data.type === "CLEAR_CACHES") {
    event.waitUntil(
      (async () => {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
        if (event.ports && event.ports[0]) {
          event.ports[0].postMessage({ success: true });
        }
      })()
    );
  }
});

const CACHE_PREFIX = "kaillisto-pwa-";
const CACHE_NAME = `${CACHE_PREFIX}v1`;
const APP_FILES = ["/offline.html", "/site.json", "/pwa-icon-192.png", "/pwa-icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_FILES))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys
        .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
        .map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/admin/")) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => (
        await caches.match("/offline.html") || Response.error()
      )),
    );
    return;
  }

  if (!["script", "style", "image", "font", "manifest"].includes(request.destination)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    if (cached) return cached;
    try {
      const response = await fetch(request);
      if (response.ok && response.type === "basic") await cache.put(request, response.clone());
      return response;
    } catch {
      return cached || Response.error();
    }
  })());
});

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { body: event.data?.text() || "Tienes una novedad en Ka’illisto." };
  }

  event.waitUntil(self.registration.showNotification(payload.title || "Ka’illisto", {
    body: payload.body || payload.message || "Tienes una novedad en tu espacio solar.",
    icon: "/pwa-icon-192.png",
    badge: "/pwa-icon-192.png",
    tag: payload.tag || "kaillisto-update",
    data: { url: payload.url || payload.data?.url || "/" },
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  let destination = new URL("/", self.location.origin).href;
  try {
    const requested = new URL(event.notification.data?.url || "/", self.location.origin);
    if (requested.origin === self.location.origin) destination = requested.href;
  } catch {
    // A malformed notification destination returns the user to Ka’illisto.
  }

  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (clients) => {
    const existing = clients.find((client) => new URL(client.url).origin === self.location.origin);
    if (existing) {
      await existing.navigate(destination);
      return existing.focus();
    }
    return self.clients.openWindow(destination);
  }));
});

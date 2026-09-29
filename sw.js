// Due Next service worker: makes the app load offline.
// Bump VERSION whenever you change any app file so phones pick up the update.
const VERSION = "due-next-v3";
const FILES = [
  "./",
  "index.html",
  "style.css",
  "app.js",
  "config.js",
  "cloud.js",
  "manifest.webmanifest",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-maskable-512.png",
  "icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Network first (so updates show up), falling back to the cache when offline.
// Only the app's own files and the Firebase code are cached; sign-in and
// database traffic always goes straight to the network.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  const ours = url.origin === self.location.origin;
  const firebaseCode = url.origin === "https://www.gstatic.com" && url.pathname.startsWith("/firebasejs/");
  if (!ours && !firebaseCode) return;
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(VERSION).then((c) => c.put(event.request, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(event.request).then((r) => r || (event.request.mode === "navigate" ? caches.match("./") : Response.error())))
  );
});

// Tapping a reminder opens the app.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) if ("focus" in c) return c.focus();
      return self.clients.openWindow("./");
    })
  );
});

// Offline support. Network-first for the app's own files (so deploys show up
// immediately), cache fallback when offline. Firebase traffic is never cached here;
// Firestore keeps its own offline cache in IndexedDB.
const CACHE = "tukta-v3";
const SHELL = [
  "./", "./index.html", "./manifest.webmanifest", "./assets/img/favicon.svg",
  "./assets/css/tokens.css?v=3", "./assets/css/base.css?v=3", "./assets/css/layout.css?v=3", "./assets/css/components.css?v=3",
  "./src/main.js",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Google Fonts and the Firebase SDK are versioned/immutable: cache-first.
  if (url.hostname === "fonts.gstatic.com" || url.hostname === "fonts.googleapis.com" || url.pathname.startsWith("/firebasejs/")) {
    e.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      }))
    );
    return;
  }
  if (url.origin !== location.origin) return;

  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
        return res;
      })
      .catch(() => caches.match(req).then((hit) => hit || caches.match("./index.html")))
  );
});

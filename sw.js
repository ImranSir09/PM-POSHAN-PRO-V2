const CACHE_NAME = "pm-poshan-pro-safe";

self.addEventListener("install", e => {
self.skipWaiting();
});

self.addEventListener("activate", e => {
self.clients.claim();
});

self.addEventListener("fetch", e => {
if (e.request.mode === "navigate") {
e.respondWith(fetch(e.request));
}
});

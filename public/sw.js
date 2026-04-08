// auto service worker for PM POSHAN PRO
const CACHE_NAME = "pm-poshan-pro-v1";

const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./screenshot1.png"
];

self.addEventListener("install", e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS);
    })
  );
});

self.addEventListener("activate", e => {
  self.clients.claim();
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(k => {
          if (k !== CACHE_NAME) return caches.delete(k);
        })
      )
    )
  );
});

self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;

  e.respondWith(
    caches.match(e.request).then(res => {
      return (
        res ||
        fetch(e.request).then(fetchRes => {
          const clone = fetchRes.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
          return fetchRes;
        })
      );
    })
  );
});

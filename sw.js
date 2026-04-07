// sw.js

const CACHE_NAME = "pm-poshan-pro-cache-v3";

const urlsToCache = [
  "/",
  "/index.html",
  "/manifest.json",
  "icon-192.png",
  "/icon-512.png",

  "https://cdn.tailwindcss.com",
  "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap",
  "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.23/jspdf.plugin.autotable.min.js"
];

// install
self.addEventListener("install", event => {
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      const requests = urlsToCache.map(url => {
        if (url.startsWith("http")) {
          return new Request(url, { mode: "no-cors" });
        }
        return url;
      });

      return cache.addAll(requests);
    })
  );
});

// fetch
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  // navigation requests
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => caches.match("/index.html"))
    );
    return;
  }

  // cache first
  event.respondWith(
    caches.match(event.request).then(response => {
      if (response) return response;

      return fetch(event.request).then(networkResponse => {
        if (
          !networkResponse ||
          (networkResponse.status !== 200 && networkResponse.status !== 0)
        ) {
          return networkResponse;
        }

        if (event.request.url.includes("vercel.app")) {
          return networkResponse;
        }

        const responseToCache = networkResponse.clone();

        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      });
    })
  );
});

// activate
self.addEventListener("activate", event => {
  self.clients.claim();

  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    )
  );
});

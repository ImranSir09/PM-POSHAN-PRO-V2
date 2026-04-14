const CACHE_NAME = "pm-poshan-pro-v22";

const urlsToCache = [
"./",
"./index.html",
"./index.tsx",
"./manifest.json",
"./icon-192.png",
"./icon-512.png",
"./maskable-192.png",
"./maskable-512.png"
];

self.addEventListener("install", event => {
event.waitUntil(
caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
);
self.skipWaiting();
});

self.addEventListener("activate", event => {
event.waitUntil(
caches.keys().then(keys =>
Promise.all(
keys.map(key => key !== CACHE_NAME && caches.delete(key))
)
)
);
self.clients.claim();
});

self.addEventListener("fetch", event => {
if (event.request.method !== "GET") return;

event.respondWith(
caches.match(event.request).then(cached => {
if (cached) return cached;

return fetch(event.request).then(response => {
const clone = response.clone();
caches.open(CACHE_NAME).then(cache => {
cache.put(event.request, clone);
});
return response;
}).catch(() => caches.match("./index.html"));
})
);
});
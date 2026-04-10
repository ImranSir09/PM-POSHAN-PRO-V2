const CACHE_NAME = "pm-poshan-pro-v8";

const urlsToCache = [
"./",
"./index.html",
"./icon-192.png",
"./icon-512.png",
"./screenshot1.png"
];

self.addEventListener("install", event => {
self.skipWaiting();
event.waitUntil(
caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
);
});

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

self.addEventListener("fetch", event => {
if (event.request.method !== "GET") return;

event.respondWith(
caches.match(event.request).then(response => {
return (
response ||
fetch(event.request).then(networkResponse => {
const clone = networkResponse.clone();
caches.open(CACHE_NAME).then(cache => {
cache.put(event.request, clone);
});
return networkResponse;
}).catch(() => caches.match("./index.html"))
);
})
);
});

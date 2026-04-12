const CACHE_NAME = "pm-poshan-pro-v15";

const urlsToCache = [
"./",
"./index.html",
"./public/icon-192.png",
"./public/icon-512.png",
"./public/maskable-192.png",
"./public/maskable-512.png"
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

if (event.request.url.includes("manifest.json")) return;

if (event.request.mode === "navigate") {
event.respondWith(
fetch(event.request)
.catch(() => caches.match("./index.html"))
);
return;
}

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
})
);
})
);

});
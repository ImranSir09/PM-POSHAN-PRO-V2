const CACHE_NAME = "pm-poshan-pro-v26";

const urlsToCache = [
"../",
"../index.html",
"../manifest.json",
"../icon-192.png",
"../icon-512.png",
"../maskable-192.png",
"../maskable-512.png"
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
Promise.all(keys.map(k => k !== CACHE_NAME && caches.delete(k)))
)
);
});

self.addEventListener("fetch", event => {

if (event.request.method !== "GET") return;

if (event.request.mode === "navigate") {
event.respondWith(
fetch(event.request).catch(() => caches.match("../index.html"))
);
return;
}

event.respondWith(
fetch(event.request)
.then(response => {
const clone = response.clone();
caches.open(CACHE_NAME).then(cache => {
cache.put(event.request, clone);
});
return response;
})
.catch(() => caches.match(event.request))
);

});

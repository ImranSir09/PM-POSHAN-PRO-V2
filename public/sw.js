const CACHE_NAME = "pm-poshan-pro-v24";

const urlsToCache = [
"../",
"../index.html",
"../manifest.json",
"../icon-192.png",
"../icon-512.png",
"../maskable-192.png",
"../maskable-512.png",

"https://cdn.tailwindcss.com",
"https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",
"https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.23/jspdf.plugin.autotable.min.js"
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

event.respondWith(
caches.match(event.request).then(response =>
response || fetch(event.request).then(networkResponse => {
const clone = networkResponse.clone();
caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
return networkResponse;
}).catch(() => caches.match("./index.html"))
)
);
});
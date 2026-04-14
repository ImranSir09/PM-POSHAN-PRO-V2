const CACHE_NAME = "pm-poshan-pro-v20";

const urlsToCache = [
"./",
"./index.html",
"./manifest.json",
"./icon-192.png",
"./icon-512.png",
"./maskable-192.png",
"./maskable-512.png"
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
fetch(event.request)
.then(response => {

const clone = response.clone();
caches.open(CACHE_NAME).then(cache => {
cache.put(event.request, clone);
});

return response;

})
.catch(() => {
return caches.match(event.request).then(response => {
return response || caches.match("./index.html");
});
})
);

});
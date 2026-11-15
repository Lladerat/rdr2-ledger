/* Trapper's Ledger service worker.
   Bump CACHE_VERSION whenever you upload a changed index.html so phones pick up the new version. */
var CACHE_VERSION = "ledger-v1";

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE_VERSION).then(function (c) {
      return c.addAll(["./", "index.html", "manifest.webmanifest"]).then(function () {
        return Promise.all(["icon-192.png", "icon-512.png", "apple-touch-icon.png"].map(function (f) {
          return c.add(f).catch(function () {});
        }));
      });
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE_VERSION; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);

  /* Google Fonts: serve from cache, refresh in the background. */
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    e.respondWith(
      caches.open(CACHE_VERSION).then(function (cache) {
        return cache.match(req).then(function (hit) {
          var net = fetch(req).then(function (res) { cache.put(req, res.clone()); return res; }).catch(function () { return hit; });
          return hit || net;
        });
      })
    );
    return;
  }

  /* Own files: cache first, fall back to network, fall back to the page. */
  if (url.origin === self.location.origin) {
    e.respondWith(
      caches.match(req, { ignoreSearch: true }).then(function (hit) {
        return hit || fetch(req).catch(function () { return caches.match("index.html"); });
      })
    );
  }
});

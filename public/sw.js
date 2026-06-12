// Minimal service worker — enables PWA installation prompt on Android.
// No caching: the app always fetches fresh data from the server.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

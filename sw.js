// Minimal service worker — caches the app shell so it opens instantly
// and works even with a flaky connection. Data still needs network.
const CACHE_NAME = "daily-log-v1";
const SHELL_FILES = [
  "./",
  "./index.html",
  "./css/style.css",
  "./js/config.js",
  "./js/auth.js",
  "./js/data.js",
  "./js/app.js",
  "./manifest.json",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
});

self.addEventListener("fetch", (event) => {
  // Network-first for Supabase API calls, cache-first for the app shell
  if (event.request.url.includes("supabase.co")) return;
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});

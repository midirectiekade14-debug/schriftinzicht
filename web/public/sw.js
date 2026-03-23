// KILL SWITCH — dit bestand bestaat alleen om oude service workers te vervangen.
// Zodra een browser dit ophaalt als update, ruimt het alles op en verwijdert zichzelf.
// Versie-bump om browser te dwingen tot update: v3-2026-03-22

self.addEventListener('install', function() {
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys()
      .then(function(names) {
        return Promise.all(names.map(function(name) { return caches.delete(name); }));
      })
      .then(function() {
        return self.registration.unregister();
      })
      .then(function() {
        return self.clients.matchAll({ type: 'window' });
      })
      .then(function(clients) {
        clients.forEach(function(client) {
          client.navigate(client.url);
        });
      })
  );
});

// Nooit iets cachen — alle fetches gaan direct naar het netwerk
self.addEventListener('fetch', function(event) {
  event.respondWith(fetch(event.request));
});

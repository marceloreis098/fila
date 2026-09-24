// KILL-SWITCH SERVICE WORKER
// This SW unregisters itself and clears all caches to recover from stale PWA caches.
// It is served at /sw.js and will replace the old Workbox SW on next update check.
// The page no longer registers an SW (vite-plugin-pwa removed), so after unregistration
// the site runs without SW forever.

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // Delete all caches
    const cacheKeys = await caches.keys();
    await Promise.all(cacheKeys.map((key) => caches.delete(key)));

    // Unregister this SW
    await self.registration.unregister();

    // Claim clients and reload them to fetch fresh from network
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    clients.forEach((client) => client.navigate(client.url));
  })());
});
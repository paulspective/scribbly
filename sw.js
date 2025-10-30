const CACHE_VERSION = 'v1';
const CACHE_NAME = `notes-cache-${CACHE_VERSION}`;

const BASE_PATH = self.location.pathname.includes('/scribbly/') ? '/scribbly' : '';
const FILES_TO_CACHE = [
  `${BASE_PATH}/index.html`,
  `${BASE_PATH}/style.css`,
  `${BASE_PATH}/app.js`
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return Promise.allSettled(FILES_TO_CACHE.map(file => cache.add(file)));
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => key !== CACHE_NAME && caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const url = event.request.url;
  if (url.startsWith('https://fonts.googleapis.com') || url.startsWith('https://fonts.gstatic.com')) {
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then(async cache => {
      try {
        const networkResponse = await fetch(event.request);
        cache.put(event.request, networkResponse.clone());
        return networkResponse;
      } catch {
        return cache.match(event.request);
      }
    })
  )
}); 
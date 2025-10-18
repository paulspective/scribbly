const CACHE_VERSION = 'v4';
const CACHE_NAME = `notes-cache-${CACHE_VERSION}`;
const FILES_TO_CACHE = [
  'scribbly/index.html',
  'scribbly/style.css',
  'scribbly/app.js'
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
    return; // skip external fonts
  }

  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});
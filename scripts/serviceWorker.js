const CACHE_VERSION = 'v9';
const CACHE_NAME = `scribbly-cache-${CACHE_VERSION}`;

const BASE_PATH = '/scribbly';

const FILES_TO_CACHE = [
  `${BASE_PATH}/`,
  `${BASE_PATH}/index.html`,
  `${BASE_PATH}/style.css`,
  `${BASE_PATH}/scripts/app.js`,
  `${BASE_PATH}/scripts/utils/timestamp.js`,
  `${BASE_PATH}/scripts/utils/toast.js`,
  `${BASE_PATH}/scripts/utils/theme.js`,
  `${BASE_PATH}/scripts/notes/createNotes.js`,
  `${BASE_PATH}/scripts/notes/loadNotes.js`,
  `${BASE_PATH}/scripts/notes/sortNotes.js`,
  `${BASE_PATH}/scripts/notes/saveNotes.js`,
  `${BASE_PATH}/scripts/notes/search.js`,
  `${BASE_PATH}/scripts/notes/emptyState.js`,
  `${BASE_PATH}/assets/fonts/Manrope-Light.ttf`,
  `${BASE_PATH}/assets/fonts/Manrope-Regular.ttf`,
  `${BASE_PATH}/assets/icons/contrast.svg`,
  `${BASE_PATH}/assets/icons/add.svg`,
  `${BASE_PATH}/assets/icons/keep.svg`,
  `${BASE_PATH}/assets/icons/keep_off.svg`,
  `${BASE_PATH}/assets/icons/edit_note.svg`,
  `${BASE_PATH}/assets/icons/delete.svg`
];

// Install: pre-cache app shell
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(FILES_TO_CACHE))
      .then(() => self.skipWaiting())
  );
});

// Activate: clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: serve cached content when offline
self.addEventListener('fetch', event => {
  const request = event.request;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match(`${BASE_PATH}/index.html`))
    );
    return;
  }
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;

      return fetch(request).then(networkResponse => {
        return caches.open(CACHE_NAME).then(cache => {
          cache.put(request, networkResponse.clone());
          return networkResponse;
        });
      });
    })
  );
});
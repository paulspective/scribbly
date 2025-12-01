const CACHE_VERSION = 'v7';
const CACHE_NAME = `scribbly-cache-${CACHE_VERSION}`;

const BASE_PATH = 'scribbly';

const FILES_TO_CACHE = [
  `${BASE_PATH}/`,
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

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => Promise.allSettled(FILES_TO_CACHE.map(f => cache.add(f))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match(`${BASE_PATH}/`))
    );
    return;
  }

  event.respondWith(
    caches.match(request)
      .then(cachedResponse => {
        if (cachedResponse) return cachedResponse;

        return fetch(request).then(networkResponse => {
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, networkResponse.clone());
          });
          return networkResponse;
        });
      })
      .catch(() => {
        if (request.destination === 'document') {
          return caches.match(`${BASE_PATH}/`);
        }
      })
  );
});
const CACHE_VERSION = 'v1';
const CACHE_NAME = `notes-cache-${CACHE_VERSION}`;

const BASE_PATH = self.location.pathname.includes('/scribbly/') ? '/scribbly' : '';
const ICON_TO_CACHE = [
  `${BASE_PATH}/assets/icons/contrast.svg`,
  `${BASE_PATH}/assets/icons/add.svg`,
  `${BASE_PATH}/assets/icons/keep.svg`,
  `${BASE_PATH}/assets/icons/keep_off.svg`,
  `${BASE_PATH}/assets/icons/edit_note.svg`,
  `${BASE_PATH}/assets/icons/delete.svg`
];

const FILES_TO_CACHE = [
  `${BASE_PATH}/index.html`,
  `${BASE_PATH}/style.css`,
  `${BASE_PATH}/scripts/app.js`,
  `${BASE_PATH}/scripts/service-worker.js`,
  `${BASE_PATH}/assets/fonts/Manrope-Light.ttf`,
  `${BASE_PATH}/assets/fonts/Manrope-Regular.ttf`,
  `${BASE_PATH}/scripts/utils/timestamp.js`,
  `${BASE_PATH}/scripts/utils/toast.js`,
  `${BASE_PATH}/scripts/utils/theme.js`,
  `${BASE_PATH}/scripts/notes/createNotes.js`,
  `${BASE_PATH}/scripts/notes/loadNotes.js`,
  `${BASE_PATH}/scripts/notes/sortNotes.js`,
  `${BASE_PATH}/scripts/notes/saveNotes.js`,
  `${BASE_PATH}/scripts/notes/search.js`,
  `${BASE_PATH}/scripts/notes/emptyState.js`
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return Promise.allSettled([...FILES_TO_CACHE, ...ICON_TO_CACHE].map(file => cache.add(file)));
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
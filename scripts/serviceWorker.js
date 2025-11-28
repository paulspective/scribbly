const CACHE_VERSION = 'v3';
const CACHE_NAME = `scribbly-cache-${CACHE_VERSION}`;

const BASE_PATH = self.location.pathname.includes('/scribbly') ? '/scribbly' : '';

const CORE_FILES = [
  `${BASE_PATH}/`,
  `${BASE_PATH}/index.html`,
  `${BASE_PATH}/style.css`,
  `${BASE_PATH}/scripts/app.js`,
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
  `${BASE_PATH}/scripts/notes/emptyState.js`,
];

const ICONS = [
  `${BASE_PATH}/assets/icons/contrast.svg`,
  `${BASE_PATH}/assets/icons/add.svg`,
  `${BASE_PATH}/assets/icons/keep.svg`,
  `${BASE_PATH}/assets/icons/keep_off.svg`,
  `${BASE_PATH}/assets/icons/edit_note.svg`,
  `${BASE_PATH}/assets/icons/delete.svg`
];

const FILES_TO_CACHE = [...CORE_FILES, ...ICONS];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      try {
        await cache.addAll(FILES_TO_CACHE);
      } catch (err) {
        await Promise.allSettled(FILES_TO_CACHE.map(f => cache.add(f)));
      }
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(key => {
        if (key !== CACHE_NAME) return caches.delete(key);
      }))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;

  event.respondWith(
    caches.match(request).then(async cached => {
      try {
        const network = await fetch(request);
        const cache = await caches.open(CACHE_NAME);
        cache.put(request, network.clone());
        return network;
      } catch {
        if (cached) return cached;

        if (request.mode === 'navigate') {
          return caches.match(`${BASE_PATH}/index.html`);
        }

        return new Response('Offline', { status: 503 });
      }
    })
  );
});
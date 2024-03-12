/**
 * Service Worker to enable PWA functionality.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Caching
 * @see https://web.archive.org/web/20231106070218/https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Caching
 */
const CACHE_NAME = "mylist_1";
const PRECACHED_RESOURCES = [
  "./",
  "./index.html",
  "./assets/styles.css",
  "./apple-touch-icon.png",
  "./favicon-32x32.png",
  "./favicon-16x16.png",
  "./assets/backend_client.js",
  "./assets/components_base.js",
  "./assets/state_manager.js",
  "./assets/lib.js",
  "./assets/components.js",
  "./assets/main.js",
  "./assets/sortable.min.js",
  "./assets/sticky-tape.png",
  "./assets/images/check.svg",
  "./assets/icons/check.svg",
  "./assets/icons/info.svg",
  "./assets/icons/list.svg",
  "./assets/icons/loop.svg",
  "./assets/fonts/LetteraMonoLLCondLight-Regular.otf",
  "./assets/fonts/Ndot-55.otf",
  "./assets/fonts/xkcd.otf",
];

function isCacheable(request) {
  const url = new URL(request.url);

  return !url.pathname.endsWith(".json");
}

function precache() {
  return caches.open(CACHE_NAME)
    .then((cache) => {
      console.debug('[mylist:sw.js] #precache: adding cache for', PRECACHED_RESOURCES);

      return cache.addAll(PRECACHED_RESOURCES);
    })
}

function fetchResponsePromise(request, cache) {
  console.warn('Fetching response for', request.url);

  return fetch(request)
    .then(function(networkResponse) {
      if (networkResponse.ok) {
        console.info('Storing cache for', request.url);
        cache.put(request, networkResponse.clone());
      }

      return networkResponse;
    })
    .catch(function(err) {
      console.error('Could not fetch', request.url, '. Error:', err);
      return Response.error();
    });
}

function cacheFirstWithRefresh(request) {
  return caches
    .open(CACHE_NAME)
    .then(function(cache) {
      if (cache.match(request)) {
        console.info('Found cache for', request.url);
        return cache.match(request);
      }

      return fetchResponsePromise(request, cache);
    });
}

self.addEventListener("fetch", function(ev) {
  const url = new URL(ev.request.url);

  if (url.pathname == '/nuke-cache') {
    caches.delete(CACHE_NAME);
  } else if (!url.pathname.endsWith(".json")) {
    ev.respondWith( cacheFirstWithRefresh(ev.request) );
  }
});

self.addEventListener("install", function(ev) {
  console.log('[mylist:sw.js] #install: pre-caching files...');

  ev.waitUntil(precache());
});

self.addEventListener("push", function(ev) {
  console.debug('[mylist:sw.js] push event received:', ev);
});

function enableNavigationPreload() {
  if (self.registration.navigationPreload) {
    return self.registration.navigationPreload.enable();
  }

  return null;
};

self.addEventListener('activate', (ev) => {
  ev.waitUntil(enableNavigationPreload());
});

console.log('[mylist:sw.js] loaded.');

const addResourcesToCache = async (resources) => {
  const cache = await caches.open('v1');
  await cache.addAll(resources);
};

const putInCache = async (request, response) => {
  if (!request.url.startsWith('chrome-extension://')) {
    const cache = await caches.open('v1');
    await cache.put(request, response);
  }
};

const cacheFirst = async ({ request, preloadResponsePromise, fallbackUrl }) => {
  // First try to get the resource from the cache
  const responseFromCache = await caches.match(request);
  if (responseFromCache) {
    return responseFromCache;
  }

  // Next try to use the preloaded response, if it's there
  const preloadResponse = await preloadResponsePromise;
  if (preloadResponse) {
    console.info('using preload response', preloadResponse);
    putInCache(request, preloadResponse.clone());
    return preloadResponse;
  }

  // Next try to get the resource from the network
  try {
    const responseFromNetwork = await fetch(request);
    // response may be used only once
    // we need to save clone to put one copy in cache
    // and serve second one
    putInCache(request, responseFromNetwork.clone());
    return responseFromNetwork;
  } catch (error) {
    const fallbackResponse = await caches.match(fallbackUrl);
    if (fallbackResponse) {
      return fallbackResponse;
    }
    // when even the fallback response is not available,
    // there is nothing we can do, but we must always
    // return a Response object
    return new Response('Network error happened', {
      status: 408,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
};

const enableNavigationPreload = async () => {
  if (self.registration.navigationPreload) {
    // Enable navigation preloads!
    await self.registration.navigationPreload.enable();
  }
};

self.addEventListener('activate', (event) => {
  console.log('activate-----------------', event);
  event.waitUntil(enableNavigationPreload());
});

self.addEventListener('install', (event) => {
  console.log('install', event);
  event.waitUntil(
    addResourcesToCache([
      '/sw-test/',
      '/sw-test/index.html',
      '/sw-test/app.js',
      '/sw-test/image-list.js',
      '/sw-test/star-wars-logo.jpg',
      '/sw-test/gallery/bountyHunters.jpg',
      '/sw-test/gallery/myLittleVader.jpg',
      '/sw-test/gallery/snowTroopers.jpg',
    ])
  );
  // event.waitUntil(self.skipWaiting());
});

self.addEventListener('fetch', (event) => {
  console.log('fetch', event);
  event.respondWith(
    cacheFirst({
      request: event.request,
      preloadResponsePromise: event.preloadResponse,
      fallbackUrl: '/sw-test/gallery/myLittleVader.jpg',
    })
  );
});

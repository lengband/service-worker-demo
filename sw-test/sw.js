// 导航预加载测试，等待5s
const start = Date.now();
console.log('start', start);
while (Date.now() - start < 5000);
console.log('after-time123', Date.now());

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
  const responseFromCache = await caches.match(request);
  if (responseFromCache) {
    return responseFromCache;
  }
  const preloadResponse = await preloadResponsePromise;
  if (preloadResponse) {
    console.info('using preload response', preloadResponse);
    putInCache(request, preloadResponse.clone());
    return preloadResponse;
  }
  try {
    const responseFromNetwork = await fetch(request);
    return responseFromNetwork;
  } catch (error) {
    const fallbackResponse = await caches.match(fallbackUrl);
    if (fallbackResponse) {
      return fallbackResponse;
    }
    return new Response('Network error happened', {
      status: 408,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
};

const enableNavigationPreload = async () => {
  if (self.registration.navigationPreload) {
    await self.registration.navigationPreload.enable();
  }
};

self.addEventListener('activate', (event) => {
  console.log('activate1', event);
  // event.waitUntil(enableNavigationPreload());
});

self.addEventListener('sync', (event) => {
  console.log(event, 'sync');
})


self.addEventListener('install', (event) => {
  console.log('install', event);
  event.waitUntil(
    addResourcesToCache([
      // '/sw-test/',
      // '/sw-test/index.html',
      '/sw-test/app.js',
      // '/sw-test/image-list.js',
      // '/sw-test/image-list1.js', // 测试手动 put cache
      // '/sw-test/gallery/bountyHunters.jpg', // 测试手动 put cache
      '/sw-test/gallery/myLittleVader.jpg',
      // '/sw-test/gallery/snowTroopers.jpg', // 故意不缓存到cache中
    ])
  );
  // event.waitUntil(self.skipWaiting());
});

self.addEventListener('fetch', (event) => {
  console.log('fetch', event.request.url);
  event.respondWith(
    cacheFirst({
      request: event.request,
      preloadResponsePromise: event.preloadResponse,
      fallbackUrl: '/sw-test/gallery/myLittleVader.jpg',
    })
  );
});

// setInterval(() => {
//   fetch('http://localhost:5000/sw-test/image-list1.js').then(async (res) => {
//     const cache = await caches.open('v1');
//     cache.put('/sw-test/image-list1.js', res);
//   })
//   fetch('http://localhost:5000/sw-test/gallery/bountyHunters.jpg').then(async (res) => {
//     console.log(123);
//     const cache = await caches.open('v1');
//     cache.put('https://static.coinall.ltd/sw-test/gallery/bountyHunters.jpg', res);
//   })
// }, 5000)

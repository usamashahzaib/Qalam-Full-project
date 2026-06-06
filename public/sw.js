const CACHE_NAME = 'qalam-v1.3';
const OFFLINE_URL = '/';

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.add(new Request(OFFLINE_URL, { cache: 'reload' }));
    })()
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      if ('navigationPreload' in self.registration) {
        await self.registration.navigationPreload.enable();
      }
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      );
    })()
  );
  self.clients.claim();
});

// Background Sync Implementation (Offline Capability)
const SYNC_STORE_NAME = 'qalam-sync-queue';
const DB_NAME = 'QalamOfflineDB';

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (e) => {
      e.target.result.createObjectStore(SYNC_STORE_NAME, { autoIncrement: true });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function queueRequest(request) {
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith('/api/')) return;

  const db = await openDB();
  const tx = db.transaction(SYNC_STORE_NAME, 'readwrite');
  const store = tx.objectStore(SYNC_STORE_NAME);
  
  const serialized = {
    url: request.url,
    method: request.method,
    headers: Array.from(request.headers.entries()),
    body: await request.clone().text(),
    timestamp: Date.now()
  };
  
  store.add(serialized);
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (url.origin !== self.location.origin) return;

  // For mutation requests (POST/PUT), attempt the fetch and queue on failure
  // instead of relying on navigator.onLine which is unreliable in SW context.
  if ((event.request.method === 'POST' || event.request.method === 'PUT') && url.pathname.startsWith('/api/')) {
    event.respondWith(
      (async () => {
        try {
          // Attempt the real network request first
          return await fetch(event.request.clone());
        } catch {
          // Network failed - queue for Background Sync replay
          await queueRequest(event.request);
          return new Response(JSON.stringify({ queued: true, message: "Offline. Request queued for sync." }), {
            headers: { 'Content-Type': 'application/json' },
            status: 202
          });
        }
      })()
    );
    return;
  }

  if (event.request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const preloadResponse = await event.preloadResponse;
          if (preloadResponse) return preloadResponse;
          return await fetch(event.request);
        } catch {
          const cache = await caches.open(CACHE_NAME);
          return await cache.match(OFFLINE_URL);
        }
      })()
    );
  }
});

// Replay queue when online
self.addEventListener('sync', (event) => {
  if (event.tag === 'qalam-replay-queue') {
    event.waitUntil(
      (async () => {
        const db = await openDB();
        const tx = db.transaction(SYNC_STORE_NAME, 'readwrite');
        const store = tx.objectStore(SYNC_STORE_NAME);
        const getAllRequest = store.getAll();
        
        await new Promise((resolve, reject) => {
          getAllRequest.onsuccess = async () => {
            const items = getAllRequest.result;
            for (const item of items) {
              try {
                const url = new URL(item.url);
                if (url.origin !== self.location.origin || !url.pathname.startsWith('/api/')) continue;
                await fetch(item.url, {
                  method: item.method,
                  headers: item.headers,
                  body: item.body
                });
              } catch (e) {
                console.error("Failed to sync queued request", e);
              }
            }
            store.clear();
            resolve();
          };
          getAllRequest.onerror = () => reject(getAllRequest.error);
        });
      })()
    );
  }
});

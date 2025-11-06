
const CACHE_NAME = 'cn-deck-cache-v1762454640';
const ASSETS = ["index_ri_yue.html", "manifest.webmanifest", "icons/icon-192.png", "icons/icon-512.png", "media/ri4.gif", "media/yue4.gif", "media/da4.gif", "media/xiao3.gif", "media/ai4.gif", "media/ge4.gif", "media/ren2.gif", "media/kou3.gif", "media/wo3.gif", "media/ni3.gif", "media/shou3.gif", "media/fei1.gif", "audio/ri4.wav", "audio/yue4.wav", "audio/da4.wav", "audio/xiao3.wav", "audio/ai4.wav", "audio/ge4.wav", "audio/ren2.wav", "audio/kou3.wav", "audio/wo3.wav", "audio/ni3.wav", "audio/shou3.wav", "audio/fei1.wav"];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.map(k => k === CACHE_NAME ? null : caches.delete(k)))));
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  // Cache-first for our known assets; network fallback
  if (ASSETS.some(p => url.pathname.endsWith(p))) {
    e.respondWith(
      caches.match(e.request).then(r => r || fetch(e.request).then(resp => {
        const copy = resp.clone();
        caches.open(CACHE_NAME).then(c => c.put(e.request, copy));
        return resp;
      })).catch(() => caches.match('index_ri_yue.html'))
    );
  }
});

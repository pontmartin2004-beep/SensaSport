/* SensaSport — cache applicatif : l'app doit s'ouvrir sans connexion. */
const CACHE = 'sensasport-v1';
const ASSETS = [
  './', './index.html', './manifest.webmanifest',
  './css/app.css',
  './assets/icon.svg', './assets/icon-maskable.svg',
  './js/config.js', './js/util.js', './js/store.js', './js/progression.js',
  './js/anim.js', './js/ui.js', './js/notify.js', './js/onboarding.js',
  './js/home.js', './js/session.js', './js/checkin.js', './js/history.js',
  './js/profile.js', './js/app.js'
];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(ASSETS); })
    .then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; })
      .map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

/* Réseau d'abord pour rester à jour, cache en secours hors ligne. */
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request).then(function (res) {
      const copy = res.clone();
      caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
      return res;
    }).catch(function () {
      return caches.match(e.request).then(function (m) {
        return m || caches.match('./index.html');
      });
    })
  );
});

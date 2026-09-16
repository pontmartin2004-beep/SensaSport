/* SensaSport — cache applicatif : l'app doit s'ouvrir sans connexion. */
const CACHE = 'sensasport-v2';   // à incrémenter quand la stratégie de cache change
const ASSETS = [
  './', './index.html', './manifest.webmanifest',
  './css/app.css',
  './assets/icon.svg', './assets/icon-maskable.svg',
  './js/config.js', './js/util.js', './js/store.js', './js/progression.js',
  './js/anim.js', './js/ui.js', './js/calendar.js', './js/onboarding.js',
  './js/home.js', './js/session.js', './js/bonus.js', './js/checkin.js', './js/history.js',
  './js/profile.js', './js/app.js'
];

/* addAll() passerait par le cache HTTP du navigateur : on préremplit avec
   des requêtes explicitement revalidées, sinon le cache hors ligne peut
   naître déjà périmé juste après un déploiement. */
self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      return Promise.all(ASSETS.map(function (url) {
        return fetch(new Request(url, { cache: 'no-cache' }))
          .then(function (res) { if (res.ok) return c.put(url, res); })
          .catch(function () { /* un asset manquant ne doit pas bloquer l'installation */ });
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; })
      .map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

/* Réseau d'abord pour rester à jour, cache en secours hors ligne.
   `cache: 'no-cache'` force une revalidation auprès du serveur : sans lui,
   fetch() passe par le cache HTTP du navigateur, et GitHub Pages pose un
   max-age de 10 minutes. On se retrouvait alors avec un mélange de fichiers
   anciens et récents après un déploiement — bien pire qu'un simple retard.
   La revalidation reste peu coûteuse : le serveur répond 304 si rien
   n'a changé, et le mode hors ligne passe toujours par le cache ci-dessous. */
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;

  const frais = e.request.url.indexOf(self.location.origin) === 0
    ? new Request(e.request, { cache: 'no-cache' })
    : e.request;

  e.respondWith(
    fetch(frais).then(function (res) {
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

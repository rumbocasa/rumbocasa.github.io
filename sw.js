/* Rumbo · Service worker (v1.3). Solo funciona cuando la app está publicada (https), no con file://.
   Guarda la app para abrirla rápido y sin señal. Estrategia: muestra lo guardado y, por detrás, trae la versión nueva
   (la ven en la siguiente apertura). Al publicar cambios grandes, subir VERSION para limpiar lo viejo. */
const VERSION = 'rumbo-202611121021';
const SHELL = [
  './', './index.html', './favicon.svg', './manifest.webmanifest',
  './css/estilos.css', './css/graficas.css', './css/perfil.css', './css/planes.css', './css/metaplan.css', './css/compas.css', './css/cuentas.css', './css/nube.css',
  './js/datos-reales.js', './js/frases.js', './js/frases-momentos.js', './js/mascotas.js', './js/marca.js', './js/momentos.js', './js/avatares.js',
  './js/voces.js', './js/graficas.js', './js/perfil.js', './js/planes.js', './js/metaplan.js', './js/compas.js', './js/cuentas.js', './js/nube-config.js', './js/nube.js', './js/app.js',
  './iconos/icono-192.png', './iconos/icono-512.png', './iconos/apple-touch-icon.png'
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const url = new URL(r.url), fonts = /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname) || (url.hostname === 'www.gstatic.com' && url.pathname.startsWith('/firebasejs/'));
  if (url.origin !== location.origin && !fonts) return;
  e.respondWith(caches.open(VERSION).then(async c => {
    const hit = await c.match(r, {ignoreSearch: url.origin === location.origin});
    const net = fetch(r).then(res => { if (res && (res.ok || res.type === 'opaque')) c.put(r, res.clone()); return res; }).catch(() => null);
    if (hit) { e.waitUntil(net); return hit; }
    const res = await net;
    return res || (r.mode === 'navigate' ? c.match('./index.html') : Response.error());
  }));
});

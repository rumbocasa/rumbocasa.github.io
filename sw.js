/* Rumbo · Service worker (v1.3). Solo funciona cuando la app está publicada (https), no con file://.
   Guarda la app para abrirla rápido y sin señal. Estrategia: muestra lo guardado y, por detrás, trae la versión nueva
   (la ven en la siguiente apertura). Al publicar cambios grandes, subir VERSION para limpiar lo viejo. */
const VERSION = 'rumbo-202611131057';
const SHELL = [
  './', './index.html', './favicon.svg', './manifest.webmanifest',
  'css-estilos.css', 'css-graficas.css', 'css-perfil.css', 'css-planes.css', 'css-metaplan.css', 'css-compas.css', 'css-cuentas.css', 'css-nube.css', 'css-apuntes.css', 'css-escenas.css',
  'js-datos-reales.js', 'js-frases.js', 'js-frases-momentos.js', 'js-mascotas.js', 'js-marca.js', 'js-momentos.js', 'js-avatares.js',
  'js-voces.js', 'js-graficas.js', 'js-perfil.js', 'js-planes.js', 'js-metaplan.js', 'js-compas.js', 'js-aprende.js', 'js-cuentas.js', 'js-apuntes.js', 'js-escenas.js', 'js-nube-config.js', 'js-nube.js', 'js-app.js',
  'iconos-icono-192.png', 'iconos-icono-512.png', 'iconos-apple-touch-icon.png'
];
self.addEventListener('install', e => {
  // 'reload': no usar la caché HTTP del navegador (GitHub Pages guarda 10 min) al llenar la copia sin conexión
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL.map(u => new Request(u, {cache: 'reload'})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// v2.3: archivos de la app → primero la red (siempre la versión nueva con internet); sin señal → la copia guardada.
// Fuentes y Firebase (direcciones con versión) → primero la copia guardada.
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const url = new URL(r.url), externo = /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname) || (url.hostname === 'www.gstatic.com' && url.pathname.startsWith('/firebasejs/'));
  if (url.origin !== location.origin && !externo) return;
  if (externo) {
    e.respondWith(caches.open(VERSION).then(async c => (await c.match(r)) || fetch(r).then(res => { if (res && (res.ok || res.type === 'opaque')) c.put(r, res.clone()); return res; })));
    return;
  }
  e.respondWith((async () => {
    const c = await caches.open(VERSION), key = url.origin + url.pathname;
    try {
      const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 6000);
      const res = await fetch(key, {cache: 'no-cache', signal: ctl.signal, credentials: 'same-origin'}); clearTimeout(t);
      if (res && res.ok) c.put(key, res.clone());
      return res;
    } catch (err) {
      return (await c.match(key)) || (await c.match(r, {ignoreSearch: true})) || (r.mode === 'navigate' ? (await c.match('./index.html')) || (await c.match('./')) : Response.error());
    }
  })());
});

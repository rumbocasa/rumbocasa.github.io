/* Rumbo · Avatares. Coral (Vale) y Oreo (David) reemplazan las letras V y D en toda la app.
   Tamaños chicos: solo la cabeza con un anillo de color (Mascotas.miniSVG convertido una vez en <symbol> y reutilizado con <use>,
   así las listas no repiten el dibujo). Tamaños grandes: el perrito completo (Mascotas.mount) con la expresión del momento.
   La primera parte son funciones puras sin DOM. */
const Avatares = (function () {
  'use strict';
  const M = Mascotas, NS = 'http://www.w3.org/2000/svg';
  const DOG = {V: 'coral', D: 'orio'}, NAME = {V: 'Vale', D: 'David'}, DOGNAME = {coral: 'Coral', orio: 'Oreo'};
  const MINI_OK = new Set(['happy', 'alert', 'worried', 'tender', 'sleep', 'wow']);

  /* ===== Lógica pura ===== */
  const isNight = h => h >= 22 || h < 5;
  /* Hay un pago vencido o que vence hoy o mañana */
  const hasUrgent = (pays, day) => pays.some(p => !p.paid && p.d - day <= 1);
  /* Expresión de la cabeza chica: dormido de noche, alerta ante vencimientos, contento el resto */
  const moodMini = (dog, c) => isNight(c.hour) ? 'sleep' : c.urgent ? (dog === 'coral' ? 'worried' : 'alert') : 'happy';
  /* Expresión del perrito completo: además, orgulloso con una racha */
  const moodBig = (dog, c) => isNight(c.hour) ? 'sleep' : c.urgent ? (dog === 'coral' ? 'worried' : 'alert') : c.streak >= 3 ? 'proud' : (dog === 'coral' ? 'happy' : 'chill');
  const ctx = () => ({hour: new Date().getHours(), urgent: hasUrgent(S.pays, today), streak: S.streak});

  /* ===== Cabezas (símbolos reutilizables) ===== */
  const made = new Set();
  function sprite() {
    let h = document.getElementById('avSprites');
    if (!h) { h = document.createElementNS(NS, 'svg'); h.id = 'avSprites'; h.setAttribute('width', '0'); h.setAttribute('height', '0'); h.setAttribute('aria-hidden', 'true'); h.style.position = 'absolute'; document.body.appendChild(h); }
    return h;
  }
  function symbol(dog, ex) {
    const e = MINI_OK.has(ex) ? ex : 'happy', id = `av-${dog}-${e}`;
    if (!made.has(id)) {
      const tmp = document.createElement('div'); tmp.innerHTML = M.miniSVG(dog, e, 64);
      const src = tmp.firstElementChild, sym = document.createElementNS(NS, 'symbol');
      sym.id = id; sym.setAttribute('viewBox', '0 0 64 64'); sym.innerHTML = src.innerHTML;
      sprite().appendChild(sym); made.add(id);
    }
    return id;
  }
  /* <svg> de una cabeza (sin anillo): para campana, avisos y chips */
  const dogSVG = (dog, ex, size) => `<svg class="avsvg" viewBox="0 0 64 64" width="${size}" height="${size}" aria-hidden="true"><use href="#${symbol(dog, ex)}"/></svg>`;
  /* Avatar chico de una persona (V o D): la cabeza de su perrito con el anillo de su color (v0.8: Coral y Oreo vuelven) */
  function head(who, size, ex, cls, decor) {
    const w = who === 'D' ? 'D' : 'V', a11y = decor ? 'aria-hidden="true"' : `role="img" aria-label="${NAME[w]}" title="${NAME[w]}"`;
    return `<span class="pav ${w.toLowerCase()} ${cls || ''}" style="--s:${size}px" ${a11y}>${dogSVG(DOG[w], ex || 'happy', size)}</span>`;
  }

  /* Cabecera: los dos botones de perfil muestran a su perrito según el momento */
  function refreshHeader() {
    const c = ctx();
    document.querySelectorAll('.avatars .av[data-p]').forEach(b => {
      const w = b.dataset.p, ex = moodMini(DOG[w], c);
      if (b.dataset.ex === ex) return;
      const first = !b.dataset.ex || b.dataset.ex === '1'; b.dataset.ex = ex;
      b.innerHTML = dogSVG(DOG[w], ex, 36);
      if (!first && !M.REDUCED.matches) b.animate([{transform: 'scale(1,1)'}, {transform: 'scale(1.14,.9)', offset: .3}, {transform: 'scale(.96,1.05)', offset: .6}, {transform: 'scale(1,1)'}], {duration: 520, easing: 'cubic-bezier(.3,1.6,.5,1)'});
    });
  }

  /* ===== Perritos completos (grandes) ===== */
  let bigs = [], gateDogs = [];
  const mountIn = (host, who, ex, list) => { const dg = M.mount(host, DOG[who], 'front', {expr: ex}); list.push(dg); return dg; };
  /* Libera los perritos de la vista anterior (se llama antes de redibujar) */
  function release() { bigs.forEach(M.dispose); bigs = []; }
  /* Monta los perritos grandes que la vista pidió con data-bigdog="V|D" */
  function afterRender(root) {
    if (document.body.classList.contains('locked')) return;
    const c = ctx();
    (root || document).querySelectorAll('[data-bigdog]').forEach(h => {
      const w = h.dataset.bigdog, dg = mountIn(h, w, moodBig(DOG[w], c), bigs);
      h.setAttribute('role', 'img'); h.setAttribute('aria-label', DOGNAME[DOG[w]]);
    });
  }
  /* Pantalla de ingreso: Coral y Oreo juntos */
  function gate(on) {
    gateDogs.forEach(M.dispose); gateDogs = [];
    const host = document.getElementById('gateAv'); if (!host) return;
    host.innerHTML = '';
    if (!on) return;
    const c = ctx();
    ['V', 'D'].forEach(w => { const s = document.createElement('span'); s.className = 'gdog ' + w.toLowerCase(); host.appendChild(s); mountIn(s, w, moodBig(DOG[w], c), gateDogs); });
  }
  /* Al reconocer la cara: los dos se alegran (rebote de la v7) */
  function gateCheer() { gateDogs.forEach(dg => M.react(dg, 'happy', 'alegre')); }

  return {head, dogSVG, refreshHeader, release, afterRender, gate, gateCheer, pure: {isNight, hasUrgent, moodMini, moodBig}};
})();

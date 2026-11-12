/* Rumbo — Compas: capa de compañeros. Coral y Oreo viven en una repisa sobre la barra inferior:
   corren y brincan al cambiar de página, reaccionan al scroll, juegan a la pelota, guían la primera visita
   y celebran los eventos. Único global: Compas. Requiere mascotas.js y frases.js cargados antes.
   Solo anima transform/opacity (WAAPI + un único rAF compartido). */
const Compas = (function () {
'use strict';

/* ---------- Textos ---------- */
const NAMES = {coral: 'Coral', orio: 'Oreo'};
const VIEWS = ['inicio', 'finanzas', 'tareas', 'perfil', 'metas', 'logros'];
const GUIA = {
  coral: {
    inicio: 'Mor, aquí ves el mes de un vistazo: cuánto queda, qué se vence y cómo van. Lo importante te lo aviso yo.',
    finanzas: 'Aquí vive la platica, mi amor: presupuesto, pagos y gastos. Lo que se anota no se va de paseo.',
    tareas: 'Planes y tareas de la casa, pues. Entre los dos pesa menos, y de paso suman punticos.',
    perfil: 'Este rincón es de ustedes: gustos, rachas y cómo les hablamos. Mírense bonito, que eso también cuenta.',
    metas: 'Las metas, mor: cada abono es un pasito. De granito en granito se llena el viaje.',
    logros: 'Aquí se presume con razón: logros, puntos y rachas. Lo que celebran juntos, lo repiten juntos.'
  },
  orio: {
    inicio: 'Inicio: lo que queda, lo que se vence y lo que hicieron. Mirarlo a diario duele menos que adivinar.',
    finanzas: 'Finanzas. La plata no desaparece: se va por donde nadie anota. Aquí queda todo, sin drama.',
    tareas: 'Planes y tareas. La loza no se lava sola; lo comprobé durante años. Repartida, cansa menos.',
    perfil: 'Su perfil: datos, gustos y el tono con que les hablo. Conocerse sale más barato que suponer.',
    metas: 'Metas. Abonar poco y seguido le gana a prometer mucho. Yo entierro huesos con ese mismo método.',
    logros: 'Logros. Nadie da medallas por pagar a tiempo; aquí sí. Disfrútenlas, que se las ganaron.'
  }
};
const TRES = {
  coral: '¡Tres seguidas, mor! Así de fácil sale todo cuando juegan en el mismo equipo.',
  orio: 'Tres de tres. Con esa puntería, al presupuesto no se le escapa ni un peso.'
};
const DESPERTAR = {
  coral: 'Ay, me cogió el sueño… pero para ti siempre estoy despierta. Descansar también es avanzar, mor.',
  orio: 'Estaba descansando la vista. El que duerme bien gasta menos: es ciencia.'
};
const CAT = {animo: 'Ánimo', chiste: 'Chiste', consejo: 'Consejo'};
const CAT_EX = {animo: {coral: 'tender', orio: 'chill'}, chiste: {coral: 'wink', orio: 'sly'}, consejo: {coral: 'proud', orio: 'happy'}};

/* ---------- Lógica pura (sin DOM) ---------- */
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const pure = {
  /* ¿Toca mostrar la guía de esta vista? */
  needsGuide: (guia, v) => VIEWS.indexOf(v) > -1 && !(guia && guia[v] === true),
  /* Rotación ánimo / chiste / consejo según el tono elegido en el perfil */
  nextCat(i, tono) {
    const o = tono === 'suave' ? ['animo', 'consejo', 'animo', 'chiste'] : tono === 'directo' ? ['consejo', 'animo', 'consejo', 'chiste'] : ['animo', 'chiste', 'consejo'];
    return o[i % o.length];
  },
  /* Un paso de física de la pelota: gravedad, rebote en bordes y fricción. Muta b y avisa si quedó quieta. */
  stepBall(b, dt, W, floor) {
    const maxX = Math.max(0, W - b.D), maxY = floor - b.D; let hit = false, rest = false;
    b.vy += 2200 * dt; b.vx *= 1 - .1 * dt; b.x += b.vx * dt; b.y += b.vy * dt;
    if (b.x < 0) { b.x = 0; b.vx = Math.abs(b.vx) * .78; hit = true; }
    else if (b.x > maxX) { b.x = maxX; b.vx = -Math.abs(b.vx) * .78; hit = true; }
    if (b.y < 0) { b.y = 0; b.vy = Math.abs(b.vy) * .6; hit = true; }
    if (b.y >= maxY) {
      b.y = maxY;
      if (b.vy > 140) { b.sq = Math.min(1, b.vy / 1400); b.vy = -b.vy * .66; b.vx *= .88; hit = true; }
      else { b.vy = 0; b.vx *= Math.max(0, 1 - 2.6 * dt); if (Math.abs(b.vx) < 14) { b.vx = 0; rest = true; } }
    }
    b.rot += b.vx * dt / (b.D / 2); b.sq = Math.max(0, b.sq - dt * 7);
    return {hit, rest};
  },
  /* Velocidad de lanzamiento (px/s) con las muestras de los últimos ~60 ms del arrastre */
  throwVel(s, tNow) {
    const n = s.length; if (n < 2) return {vx: 0, vy: 0};
    const b = s[n - 1]; let a = s[0];
    for (let i = n - 2; i >= 0; i--) { a = s[i]; if (b.t - a.t >= 60) break; }
    if (tNow - b.t > 120) return {vx: 0, vy: 0};
    const dt = Math.max(16, b.t - a.t) / 1000;
    return {vx: clamp((b.x - a.x) / dt, -2600, 2600), vy: clamp((b.y - a.y) / dt, -2600, 2600)};
  },
  /* Dirección de la mirada hacia un punto, normalizada como la usa Dog.track */
  gaze(out, px, py, tx, ty, w) {
    const dx = tx - px, dy = ty - py, d = Math.hypot(dx, dy) || 1, k = Math.min(1, d / (w * .7));
    out[0] = dx / d * k; out[1] = dy / d * k; return out;
  },
  isNight: h => h >= 22 || h < 5
};

/* ---------- Estado ---------- */
const GKEY = 'hogar:v1:guia';
const UP = 'cubic-bezier(.3,.7,.5,1)', DOWN = 'cubic-bezier(.5,0,.75,.35)';
const EASE = {inQ: k => k * k, outQ: k => 1 - (1 - k) * (1 - k), ioQ: k => k < .5 ? 2 * k * k : 1 - (2 - 2 * k) * (2 - 2 * k) / 2};
let M = null, E = null, kf = null, wob = null, R = null, inited = false;
let enabled = true, wanted = false, built = false, minimized = false, isPaused = false;
let layer = null, floorEl = null, bub = null, bubWho = null, bubTag = null, bubTx = null, bubOk = null, xBtn = null, np = null;
let pets = [], who = 'V', view = 'inicio', guia = {}, bubGuide = null, bubPet = null;
let W = 0, floorY = 0, mobile = false, raf = 0, lastT = 0, mo = null, ball = null;
let idleT = 0, ballT = 0, bubT = 0, guideT = 0, hotT = 0, resizeT = 0, lastAct = 0, lastBall = -1e9;
const timers = new Set();
const sc = {y: 0, t: 0, on: false, dirty: false, acc: 0, vUp: 0, crouch: false, deep: false, atBottom: false, guard: 0, last: 0};

const now = () => performance.now();
const rnd = (a, b) => a + Math.random() * (b - a);
const later = (fn, ms) => { const id = setTimeout(() => { timers.delete(id); fn(); }, ms); timers.add(id); return id; };
const cancel = id => { if (id) { clearTimeout(id); timers.delete(id); } };
const wait = ms => new Promise(r => later(r, ms));
const fin = a => a.finished.then(() => true, () => false);
const reduced = () => !!(R && R.matches);
const profile = () => { try { return typeof S !== 'undefined' && S.profile === 'D' ? 'D' : 'V'; } catch (e) { return 'V'; } };
const tonoOf = () => { try { const p = S.people[profile()]; return (p && p.tono) || 'humor'; } catch (e) { return 'humor'; } };
const cheerOn = () => { const c = document.getElementById('cheer'); return !!c && !c.hidden; };
const overlayOpen = () => document.body.classList.contains('locked') || !!document.querySelector('.scrim:not([hidden])') || !!(np && !np.hidden);
const paused = () => document.hidden || overlayOpen();
const hashView = () => { const h = (location.hash || '#inicio').slice(1); return VIEWS.indexOf(h) > -1 ? h : 'inicio'; };
const free = p => p.busy <= now();
const Y = v => `translateY(${v}px)`;

function ensure() {
  if (inited) return !!M;
  inited = true; M = window.Mascotas || null; if (!M) return false;
  E = M.E; kf = M.kf; wob = M.wob; R = M.REDUCED;
  try { const g = JSON.parse(localStorage.getItem(GKEY)); guia = g && typeof g === 'object' && !Array.isArray(g) ? g : {}; } catch (e) { guia = {}; }
  try { if (typeof S !== 'undefined' && S.compas === false) enabled = false; } catch (e) { /* nada */ }
  return true;
}
function markGuide(v) {
  if (!v || guia[v] === true) return;
  guia[v] = true; try { localStorage.setItem(GKEY, JSON.stringify(guia)); } catch (e) { /* sin espacio: se vuelve a mostrar */ }
}

/* ---------- Perritos ---------- */
function makePet(key, i) {
  const el = document.createElement('div');
  el.className = 'cp-pet cp-' + key; el.tabIndex = 0;
  el.setAttribute('role', 'button'); el.setAttribute('aria-label', `${NAMES[key]}: toca para oír un ánimo, un chiste o un consejo`);
  el.innerHTML = '<div class="cp-shadow"></div><div class="cp-hop"><div class="cp-sq"><div class="cp-flip"><div class="cp-front"></div><div class="cp-side" aria-hidden="true"></div></div></div></div>';
  layer.insertBefore(el, bub);
  const q = s => el.querySelector(s);
  const pet = {key, i, el, hop: q('.cp-hop'), sq: q('.cp-sq'), flip: q('.cp-flip'), front: q('.cp-front'), sideH: q('.cp-side'), shadow: q('.cp-shadow'),
    dg: null, sd: null, x: 0, home: 0, w: 0, h: 0, tok: 0, busy: 0, tw: null, anims: new Set(), dir: 1, side: false, asleep: false, cat: 0,
    gal: null, pose: null, crouched: false, lp: false, lpT: 0, exT: 0, gz: [0, 0], dead: false};
  pet.dg = M.mount(pet.front, key, 'front', {expr: 'happy'});
  const lpOff = () => { cancel(pet.lpT); pet.lpT = 0; };
  el.addEventListener('click', () => onTap(pet));
  el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onTap(pet); } });
  el.addEventListener('pointerdown', () => { pet.lp = false; lpOff(); pet.lpT = later(() => { pet.lp = true; minimize(); }, 600); });
  el.addEventListener('pointerup', lpOff); el.addEventListener('pointerleave', lpOff); el.addEventListener('pointercancel', lpOff);
  el.addEventListener('contextmenu', e => e.preventDefault());
  el.addEventListener('focus', hot);
  return pet;
}
function setX(pet, x) { pet.x = x; pet.el.style.transform = `translate3d(${x.toFixed(1)}px,0,0)`; }
function setSide(pet, dir) {
  if (!pet.sd) pet.sd = M.mount(pet.sideH, pet.key, 'side', {live: false, track: false});
  pet.side = true; pet.dir = dir; pet.el.classList.add('cp-run'); pet.flip.style.transform = dir < 0 ? 'scaleX(-1)' : '';
}
function setFront(pet) { pet.side = false; pet.el.classList.remove('cp-run'); pet.flip.style.transform = ''; }
function an(pet, el, frames, opt) {
  const a = el.animate(frames, opt), done = () => pet.anims.delete(a);
  pet.anims.add(a); a.finished.then(done, done); return a;
}
/* Deja al perrito quieto en casa, de frente, sin nada pendiente */
function settle(pet) {
  pet.tok++; pet.busy = 0; pet.crouched = false; pet.gal = null; pet.pose = null;
  if (pet.tw) { const r = pet.tw.res; pet.tw = null; r(false); }
  pet.anims.forEach(a => { try { a.cancel(); } catch (e) { /* nada */ } }); pet.anims.clear();
  cancel(pet.exT); cancel(pet.lpT);
  setFront(pet); setX(pet, pet.home); pet.el.classList.remove('cp-busy');
  if (pet.dg && !pet.dg.dead) { pet.asleep = false; pet.dg.stop(); pet.dg.gaze = null; }
}
function begin(pet) { settle(pet); pet.busy = Infinity; pet.el.classList.add('cp-busy'); return pet.tok; }
function end(pet, tok) { if (tok === pet.tok && !pet.dead) { pet.busy = 0; pet.el.classList.remove('cp-busy'); } }
function calm(pet, ms) {
  cancel(pet.exT);
  pet.exT = later(() => { if (!pet.dead && !pet.asleep && pet.busy !== Infinity) { pet.dg.gaze = null; pet.dg.setExpr('happy'); } }, ms);
}
function tweenX(pet, to, dur, ease) {
  return new Promise(res => { if (pet.tw) pet.tw.res(false); pet.tw = {from: pet.x, to, t0: 0, dur: Math.max(1, dur), ease: ease || (k => k), res}; kick(); });
}
function puffs(pet) {
  if (!layer || reduced()) return;
  for (const s of [-1, 1]) {
    const d = document.createElement('i'), x = pet.x + pet.w / 2 - 5; d.className = 'cp-puff'; layer.appendChild(d);
    const a = d.animate([{transform: `translate3d(${x}px,0,0) scale(.4)`, opacity: .55}, {transform: `translate3d(${x + s * 22}px,-7px,0) scale(1.6)`, opacity: 0}], {duration: 460, easing: E.out});
    a.onfinish = a.oncancel = () => d.remove();
  }
}
/* Brinco completo: anticipación, estirón, caída con aplastón y rebote; orejas con arrastre */
function hop(pet, h, dur, o) {
  if (reduced() || pet.dead) return null;
  o = o || {};
  const a = an(pet, pet.hop, kf([[0, Y(0), E.io], [.16, Y(2), UP], [.46, Y(-h), DOWN], [.74, Y(0), UP], [.86, Y(-h * .16), DOWN], [.95, Y(0)], [1, Y(0)]]), {duration: dur});
  an(pet, pet.sq, kf([[0, 'scale(1,1)', E.io], [.16, 'scale(1.14,.82)', E.out], [.3, 'scale(.9,1.14)', E.sine], [.46, 'scale(.98,1.03)', E.sine], [.7, 'scale(.92,1.11)', E.in], [.76, 'scale(1.18,.78)', E.out], [.86, 'scale(.96,1.05)', E.sine], [.95, 'scale(1.03,.97)', E.sine], [1, 'scale(1,1)']]), {duration: dur});
  an(pet, pet.shadow, [{transform: 'scale(1)', opacity: 1}, {transform: 'scale(1.08)', opacity: 1, offset: .16}, {transform: 'scale(.55)', opacity: .45, offset: .46}, {transform: 'scale(1.15)', opacity: 1, offset: .76}, {transform: 'scale(1)', opacity: 1}], {duration: dur});
  if (o.spin && !pet.side) an(pet, pet.flip, [{transform: 'rotate(0deg)'}, {transform: 'rotate(360deg)'}], {duration: dur * .5, delay: dur * .2, easing: E.io});
  if (!pet.side && !o.noEars) { const t = dur / pet.dg.d.tempo; pet.dg.f(pet.dg.earL, wob(-24, 5), t, {delay: dur * .2}); pet.dg.f(pet.dg.earR, wob(24, 5), t, {delay: dur * .24}); }
  if (h > 20) { const tok = pet.tok; later(() => { if (tok === pet.tok && !pet.dead) puffs(pet); }, dur * .75); }
  return a;
}
/* Arco en plena carrera (solo altura y sombra; el galope sigue) */
function arc(pet, h, dur) {
  an(pet, pet.hop, kf([[0, Y(0), UP], [.5, Y(-h), DOWN], [1, Y(0)]]), {duration: dur});
  an(pet, pet.shadow, [{transform: 'scale(1)', opacity: 1}, {transform: 'scale(.6)', opacity: .5}, {transform: 'scale(1)', opacity: 1}], {duration: dur, easing: E.sine});
}
function gallop(pet, on) {
  if (pet.gal) { try { pet.gal.cancel(); } catch (e) { /* nada */ } pet.gal = null; }
  if (!on || reduced()) return;
  const d = pet.dir;
  pet.gal = an(pet, pet.sq, kf([[0, `translateY(0) rotate(${5 * d}deg) scale(1.09,.92)`, UP], [.5, `translateY(-9px) rotate(${-6 * d}deg) scale(.95,1.06)`, DOWN], [1, `translateY(0) rotate(${5 * d}deg) scale(1.09,.92)`]]), {duration: pet.key === 'orio' ? 330 : 270, iterations: Infinity});
}

/* ---------- 1) Cambio de página: corre, brinca y aterriza con rebote ---------- */
async function cross(pet, dir, o) {
  o = o || {};
  const tok = begin(pet), ok = () => tok === pet.tok && built && !pet.dead;
  const d = dir === 'b' ? -1 : 1, out = d > 0 ? W + 12 : -pet.w - 12, inn = d > 0 ? -pet.w - 12 : W + 12, SP = 1.05;
  if (o.enter) { setSide(pet, d); setX(pet, inn); }
  if (o.delay) { await wait(o.delay); if (!ok()) return false; }
  if (!o.enter) {
    pet.dg.setExpr(o.chase ? 'sly' : 'wow');
    const ant = an(pet, pet.sq, kf([[0, 'translateX(0) scale(1,1)', E.out], [1, `translateX(${-6 * d}px) scale(1.13,.84)`]]), {duration: 170, fill: 'forwards'});
    await fin(ant); if (!ok()) return false;
    setSide(pet, d); ant.cancel(); gallop(pet, true);
    const d1 = Math.abs(out - pet.x), t1 = clamp(d1 / SP, 240, 950);
    if (d1 > 320) later(() => { if (ok()) arc(pet, 40, 440); }, t1 * .26);
    if (!await tweenX(pet, out, t1, EASE.inQ) || !ok()) return false;
    setX(pet, inn);
  } else gallop(pet, true);
  const d2 = Math.abs(pet.home - inn), LEAP = 620, lead = LEAP * .74, t2 = clamp(d2 / SP, lead + 10, 1000);
  if (t2 * .2 + 420 < t2 - lead) later(() => { if (ok()) arc(pet, 34, 400); }, t2 * .2);
  later(() => { if (ok()) { gallop(pet, false); hop(pet, 54, LEAP); } }, Math.max(0, t2 - lead));
  if (!await tweenX(pet, pet.home, t2, EASE.outQ) || !ok()) return false;
  setFront(pet); pet.dg.setExpr('laugh');
  pet.dg.f(pet.dg.earL, wob(-28, 6), 700); pet.dg.f(pet.dg.earR, wob(28, 6), 700, {delay: 40});
  await wait(LEAP * .26 + 120); if (!ok()) return false;
  pet.dg.setExpr('happy'); end(pet, tok); return true;
}

/* ---------- Burbuja y guía ---------- */
function say(pet, text, o) {
  if (!bub || !text) return;
  o = o || {};
  cancel(bubT); cancel(guideT);
  if (bubGuide && !o.guide) markGuide(bubGuide);
  bubWho.textContent = NAMES[pet.key]; bubTag.textContent = o.tag || ''; bubTag.hidden = !o.tag; bubTx.textContent = text; bubOk.hidden = !o.guide;
  bub.hidden = false;
  const bw = bub.offsetWidth, left = clamp(pet.x - 4, 8, Math.max(8, W - bw - 8));
  bub.style.left = left + 'px'; bub.style.setProperty('--cp-tail', clamp(pet.x + pet.w / 2 - left, 20, Math.max(20, bw - 20)) + 'px');
  bub.classList.remove('cp-show'); void bub.offsetWidth; bub.classList.add('cp-show');
  bubGuide = o.guide ? view : null; bubPet = pet;
  if (o.guide) { const v = view; guideT = later(() => markGuide(v), 6000); }
  else bubT = later(hideBub, o.ms || clamp(2600 + text.length * 55, 3800, 9000));
}
function hideBub() {
  cancel(bubT); cancel(guideT); bubGuide = null;
  if (!bub || bub.hidden) return;
  const b = bub; b.classList.remove('cp-show');
  later(() => { if (!b.classList.contains('cp-show')) b.hidden = true; }, reduced() ? 0 : 300);
}
function maybeGuide() {
  if (!built || minimized || isPaused || bubGuide === view || !pure.needsGuide(guia, view)) return;
  const pet = pets[0]; if (!pet || pet.busy === Infinity) return;
  const text = GUIA[pet.key][view]; if (!text) return;
  if (pet.asleep) { pet.asleep = false; pet.dg.stop(); }
  say(pet, text, {guide: true, tag: 'Guía'});
  pet.dg.setExpr(pet.key === 'coral' ? 'wink' : 'chill'); calm(pet, 3200);
  if (reduced()) return;
  /* asoma: se esconde un poco y sube con resorte */
  an(pet, pet.sq, kf([[0, 'translateY(0) scale(1,1)', E.io], [.3, 'translateY(0) scale(1.12,.8)', E.out], [.62, 'translateY(-7px) scale(.94,1.1)', E.sine], [.82, 'translateY(0) scale(1.04,.96)', E.sine], [1, 'translateY(0) scale(1,1)']]), {duration: 720});
  pet.dg.f(pet.dg.earL, wob(-18, 5), 760, {delay: 200}); pet.dg.f(pet.dg.earR, wob(18, 5), 760, {delay: 240});
}
function onOk() {
  const v = bubGuide, pet = bubPet, focused = document.activeElement === bubOk;
  markGuide(v); hideBub();
  if (focused && pet && !pet.dead) pet.el.focus({preventScroll: true});
  if (pet && !pet.dead && free(pet)) { pet.dg.setExpr('laugh'); hop(pet, 14, 460); calm(pet, 1200); }
}
function phrase(key, c) {
  let list = [];
  try { list = FRASES.ph[key][c] || []; } catch (e) { /* sin frases */ }
  const short = list.filter(t => typeof t === 'string' && t.length <= 150), l = short.length ? short : list;
  if (!l.length) return '';
  try { if (typeof Voces !== 'undefined' && Voces.rot) return Voces.rot(l, 'cp' + key + c); } catch (e) { /* cae al azar */ }
  return l[Math.floor(Math.random() * l.length)];
}
function onTap(pet) {
  if (pet.lp) { pet.lp = false; return; }
  lastAct = now(); hot();
  if (!free(pet) || pet.dead) return;
  if (pet.asleep) { pet.asleep = false; pet.busy = now() + 2400; pet.dg.run('wake'); say(pet, DESPERTAR[pet.key]); return; }
  const c = pure.nextCat(pet.cat++, tonoOf()), text = phrase(pet.key, c);
  if (!text) return;
  say(pet, text, {tag: CAT[c]});
  M.react(pet.dg, CAT_EX[c][pet.key], 'calma');
  if (!reduced()) { hop(pet, 14, 460); if (c === 'animo') pet.dg.hearts(pet.key === 'coral' ? 3 : 1, 120, 60); }
  pet.busy = now() + 500; calm(pet, 2800);
}
function hot() { if (!layer) return; layer.classList.add('cp-hot'); cancel(hotT); hotT = later(() => { if (layer) layer.classList.remove('cp-hot'); }, 3500); }

/* ---------- 5) Eventos ---------- */
function onEvent(kind) {
  if (!built || minimized) return;
  later(() => doEvent(kind), 260);   // deja que la hoja termine de cerrarse antes de mirar si hay pausa
}
function doEvent(kind) {
  if (!built || minimized || paused()) return;
  lastAct = now();
  const a = pets[0], list = (kind === 'logro' ? pets : [a]).filter(free);
  if (!list.length) return;
  list.forEach(p => { if (p.asleep) { p.asleep = false; p.dg.stop(); } });
  const EX = {tarea: 'laugh', pago: 'proud', gasto: a.key === 'coral' ? 'wink' : 'sly', abono: 'tender', logro: 'proud'}[kind];
  if (!EX) return;
  if (reduced()) { list.forEach(p => { p.dg.setExpr(EX); calm(p, 2400); }); return; }
  if (cheerOn()) {   // #cheer ya celebra: solo un brinco pequeño
    list.forEach((p, i) => later(() => { if (free(p) && !p.dead) { p.dg.setExpr(EX); hop(p, 12, 420); calm(p, 1200); } }, i * 90));
    return;
  }
  const dg = a.dg, t = now();
  if (kind === 'tarea') {
    dg.setExpr('laugh'); hop(a, 46, 780, {spin: true}); a.busy = t + 800; calm(a, 1500);
  } else if (kind === 'pago') {
    if (a.key === 'orio') {   // Oreo asiente, despacio y con criterio
      dg.setExpr('proud');
      dg.f(dg.head, kf([[0, 'translateY(0) rotate(0deg)', E.sine], [.2, 'translateY(9px) rotate(2deg)', E.sine], [.42, 'translateY(-2px) rotate(0deg)', E.sine], [.64, 'translateY(9px) rotate(2deg)', E.sine], [.84, 'translateY(-1px) rotate(0deg)', E.sine], [1, 'translateY(0) rotate(0deg)']]), 1000);
      an(a, a.sq, kf([[0, 'scale(1,1)', E.sine], [.2, 'scale(1.04,.96)', E.sine], [.42, 'scale(1,1)', E.sine], [.64, 'scale(1.04,.96)', E.sine], [1, 'scale(1,1)']]), {duration: 1220});
    } else {   // Coral aplaude con las orejas
      dg.setExpr('laugh');
      const clap = s => kf([[0, 'rotate(0deg)', E.out], [.14, `rotate(${34 * s}deg)`, E.in], [.28, `rotate(${-8 * s}deg)`, E.out], [.42, `rotate(${34 * s}deg)`, E.in], [.56, `rotate(${-8 * s}deg)`, E.out], [.7, `rotate(${34 * s}deg)`, E.in], [.86, `rotate(${-5 * s}deg)`, E.sine], [1, 'rotate(0deg)']]);
      dg.f(dg.earL, clap(1), 1050); dg.f(dg.earR, clap(-1), 1050);
      an(a, a.sq, kf([[0, 'translateY(0) scale(1,1)', E.out], [.14, 'translateY(-5px) scale(.97,1.04)', E.in], [.28, 'translateY(0) scale(1.05,.95)', E.out], [.42, 'translateY(-5px) scale(.97,1.04)', E.in], [.56, 'translateY(0) scale(1.05,.95)', E.out], [.7, 'translateY(-5px) scale(.97,1.04)', E.in], [.86, 'translateY(0) scale(1.04,.96)', E.sine], [1, 'translateY(0) scale(1,1)']]), {duration: 920});
    }
    a.busy = t + 1250; calm(a, 1900);
  } else if (kind === 'gasto') {
    if (a.key === 'coral') {   // se tapa los ojos en broma y espía con un guiño
      dg.setExpr('sleep');
      dg.f(dg.pawL, kf([[0, 'rotate(0)', E.out], [.2, 'rotate(40deg)', E.sine], [.62, 'rotate(40deg)', E.io], [1, 'rotate(0)']]), 1500);
      dg.f(dg.pawR, kf([[0, 'rotate(0)', E.out], [.2, 'rotate(-40deg)', E.sine], [.62, 'rotate(-40deg)', E.io], [1, 'rotate(0)']]), 1500);
      an(a, a.sq, kf([[0, 'scale(1,1)', E.out], [.2, 'scale(1.1,.86)', E.sine], [.62, 'scale(1.1,.86)', E.out], [.8, 'scale(.96,1.06)', E.sine], [1, 'scale(1,1)']]), {duration: 1320});
      const tok = a.tok; later(() => { if (tok === a.tok && !a.dead) { dg.setExpr('wink'); calm(a, 1500); } }, 860);
    } else {   // Oreo mira la billetera de reojo y suspira
      dg.setExpr('sly');
      const tab = document.querySelector('.dock [data-v="finanzas"]'), r = tab && tab.getBoundingClientRect();
      dg.gaze = r && r.width ? pure.gaze([0, 0], a.x + a.w / 2, floorY - a.h * .6, r.left + r.width / 2, r.top + r.height / 2, a.w) : [.8, .6]; M.wake();
      dg.f(dg.head, kf([[0, 'rotate(0deg)', E.out], [.25, 'rotate(6deg) translateY(3px)', E.sine], [.75, 'rotate(6deg) translateY(3px)', E.io], [1, 'rotate(0deg)']]), 1300);
      const tok = a.tok; later(() => { if (tok === a.tok && !a.dead) { dg.gaze = null; dg.setExpr('resigned'); calm(a, 1500); } }, 1500);
    }
    a.busy = t + 1700;
  } else if (kind === 'abono') {
    dg.setExpr('tender'); dg.hearts(a.key === 'coral' ? 5 : 3, 120, 56);
    an(a, a.sq, wob(5, 6), {duration: 1100, easing: 'linear'});
    a.busy = t + 1200; calm(a, 2400);
  } else {   // logro: los dos saltan juntos
    list.forEach((p, i) => { p.dg.setExpr('proud'); p.busy = t + 1700; later(() => { if (!p.dead && p.busy !== Infinity) { hop(p, 58, 840); p.dg.hearts(2, 120, 56); } }, i * 70); later(() => { if (!p.dead && p.busy !== Infinity) hop(p, 26, 560); }, 880 + i * 70); calm(p, 2400); });
  }
}

/* ---------- 2) Scroll ---------- */
function onScroll() { sc.dirty = true; lastAct = performance.now(); kick(); }
function crouch(on) {
  sc.crouch = on;
  pets.forEach((p, i) => {
    if (p.pose) { try { p.pose.cancel(); } catch (e) { /* nada */ } p.pose = null; }
    if (on) {
      if (!free(p) || p.asleep) return;
      p.crouched = true; p.dg.gaze = [0, 1];
      p.pose = an(p, p.sq, kf([[0, 'translate(0,0) rotate(0deg) scale(1,1)', E.out], [1, 'translate(7px,3px) rotate(3deg) scale(1.1,.84)']]), {duration: 240, delay: i * 90, fill: 'forwards'});
    } else if (p.crouched) {
      p.crouched = false; p.dg.gaze = null;
      if (free(p)) an(p, p.sq, kf([[0, 'translate(7px,3px) rotate(3deg) scale(1.1,.84)', E.out], [.45, 'translate(-2px,0) rotate(-2deg) scale(.95,1.07)', E.sine], [.75, 'translate(0,0) rotate(0deg) scale(1.03,.97)', E.sine], [1, 'translate(0,0) rotate(0deg) scale(1,1)']]), {duration: 520, delay: i * 90});
    }
  });
  M.wake();
}
function scrollStep(t) {
  if (sc.dirty) {
    sc.dirty = false;
    const y = window.scrollY, dy = y - sc.y, dtm = t - sc.t;
    if (!sc.on) { sc.on = true; sc.acc = 0; sc.vUp = 0; }
    sc.acc += dy; if (dy < 0 && dtm > 4 && dtm < 140) sc.vUp = Math.min(sc.vUp, dy / dtm);
    sc.y = y; sc.t = t; if (y > 320) sc.deep = true;
    if (!reduced() && t > sc.guard && !ball) { if (!sc.crouch && sc.acc > 90) crouch(true); else if (sc.crouch && sc.acc < 20) crouch(false); }
    return true;
  }
  if (t - sc.t < 170) return true;
  sc.on = false; scrollEnd(t); return false;
}
/* Al terminar el gesto: final de página, vuelta arriba, subida rápida o simplemente se endereza */
function scrollEnd(t) {
  const a = pets[0], was = sc.crouch;
  if (was) crouch(false);
  if (reduced() || t < sc.guard || ball || !a || !free(a) || a.asleep || t - sc.last < 1200) return;
  const max = document.documentElement.scrollHeight - innerHeight, y = sc.y, bottom = max > 240 && y >= max - 28;
  if (!bottom && y < max - 220) sc.atBottom = false;
  if (bottom && !sc.atBottom) {   // se sienta y menea
    sc.atBottom = true; sc.last = t;
    pets.forEach((p, i) => { if (!free(p) || p.asleep) return; p.busy = t + 2000; later(() => { if (p.dead || p.busy === Infinity) return; p.dg.run('sit'); an(p, p.sq, wob(6, 7), {duration: 1100, delay: 760, easing: 'linear'}); }, i * 140); });
  } else if (y < 8 && sc.deep) {   // de vuelta arriba: saluda
    sc.deep = false; sc.last = t; a.busy = t + 1500;
    a.dg.setExpr('laugh');
    a.dg.f(a.dg.pawL, kf([[0, 'rotate(0)', E.out], [.2, 'rotate(46deg)', E.sine], [.35, 'rotate(28deg)', E.sine], [.5, 'rotate(46deg)', E.sine], [.65, 'rotate(28deg)', E.sine], [.8, 'rotate(46deg)', E.io], [1, 'rotate(0)']]), 1200);
    a.dg.f(a.dg.head, kf([[0, 'rotate(0deg)', E.out], [.2, 'rotate(-7deg)', E.sine], [.8, 'rotate(-7deg)', E.io], [1, 'rotate(0deg)']]), 1200);
    an(a, a.sq, kf([[0, 'scale(1,1)', E.out], [.2, 'scale(.96,1.06)', E.sine], [.8, 'scale(.97,1.04)', E.io], [1, 'scale(1,1)']]), {duration: 1200});
    calm(a, 1500);
  } else if (sc.vUp < -1.5 && sc.acc < -160) {   // subida rápida: brinco
    sc.last = t; a.busy = t + 720; a.dg.setExpr('laugh'); hop(a, 44, 700); calm(a, 1100);
  }
}

/* ---------- 3) Pelota ---------- */
const BALL_SVG = '<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="14.5" fill="#FF7C6B"/><path d="M4.6,8.6Q14,16 4.6,23.4M27.4,8.6Q18,16 27.4,23.4" fill="none" stroke="#FFF3CE" stroke-width="2.2" stroke-linecap="round"/><ellipse cx="11.5" cy="9.5" rx="5" ry="3.2" fill="#fff" opacity=".3" transform="rotate(-28 11.5 9.5)"/><circle cx="16" cy="16" r="14.5" fill="none" stroke="#B8463A" stroke-opacity=".35" stroke-width="1"/></svg>';
function scheduleBall() {
  cancel(ballT); if (!built || reduced()) return;
  const d = rnd(25000, 45000); ballT = later(() => tryBall(d), d);
}
function tryBall(d) {
  const t = now();
  if (!built || isPaused || minimized || reduced() || ball || bubGuide || t - lastBall < 120000 || pure.isNight(new Date().getHours()) || pets.some(p => !free(p) || p.asleep)) return scheduleBall();
  const idle = t - lastAct;
  if (idle < d) { ballT = later(() => tryBall(d), d - idle + 60); return; }
  throwBall();
}
async function throwBall() {
  const pet = pets.length > 1 && Math.random() < .4 ? pets[1] : pets[0];
  const tok = begin(pet), ok = () => tok === pet.tok && built && !pet.dead;
  lastBall = now(); pet.dg.setExpr('sly');
  /* anticipación: se echa hacia atrás; luego látigo hacia adelante y suelta */
  const wind = an(pet, pet.sq, kf([[0, 'rotate(0deg) scale(1,1)', E.out], [1, 'rotate(-12deg) scale(1.08,.9)']]), {duration: 320, fill: 'forwards'});
  await fin(wind); if (!ok()) return;
  wind.cancel();
  an(pet, pet.sq, kf([[0, 'rotate(-12deg) scale(1.08,.9)', E.out], [.35, 'rotate(10deg) scale(.94,1.08)', E.spring], [1, 'rotate(0deg) scale(1,1)']]), {duration: 520});
  pet.dg.setExpr('laugh'); pet.dg.f(pet.dg.earL, wob(-22, 5), 600); pet.dg.f(pet.dg.earR, wob(22, 5), 600, {delay: 40});
  spawnBall(pet.x + pet.w * .6, floorY - pet.h * .95, rnd(300, 560), -rnd(740, 960));
  later(() => { if (ok()) { pet.dg.setExpr('happy'); end(pet, tok); } }, 560);
}
function spawnBall(x, y, vx, vy) {
  if (ball || !layer) return;
  const el = document.createElement('button');
  el.type = 'button'; el.className = 'cp-ball'; el.setAttribute('aria-label', 'Pelota: arrástrala y suéltala para lanzarla'); el.innerHTML = BALL_SVG;
  layer.appendChild(el);
  ball = {el, svg: el.firstChild, D: 30, x: clamp(x, 0, W - 30), y, vx, vy, rot: 0, sq: 0, state: 'fly', user: false, catches: 0, samples: [], pid: null, moved: 0, gx: 0, gy: 0, dirty: false, toT: 0, restT: 0, holder: null};
  el.addEventListener('pointerdown', ballDown); el.addEventListener('pointermove', ballMove);
  el.addEventListener('pointerup', ballUp); el.addEventListener('pointercancel', ballUp);
  el.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && ball && (ball.state === 'fly' || ball.state === 'rest')) { e.preventDefault(); kickBall(); } });
  el.animate([{opacity: 0}, {opacity: 1}], {duration: 140});
  drawBall(); armBall(); kick();
}
function drawBall() {
  const b = ball, s = b.sq * .22;
  b.el.style.transform = `translate3d(${b.x.toFixed(1)}px,${b.y.toFixed(1)}px,0) scale(${(1 + s).toFixed(3)},${(1 - s).toFixed(3)})`;
  b.svg.style.transform = `rotate(${b.rot.toFixed(3)}rad)`;
}
function gazeBall() {
  const cx = ball.x + ball.D / 2, cy = ball.y + ball.D / 2;
  for (const p of pets) { if (p.side || p.asleep || p.dead) continue; p.dg.gaze = pure.gaze(p.gz, p.x + p.w / 2, floorY - p.h * .6, cx, cy, p.w); }
  M.wake();
}
/* Tope de 12 s sin que nadie la toque: el perrito la recoge y la guarda */
function armBall() { if (!ball) return; cancel(ball.toT); ball.toT = later(ballTimeout, 12000); }
function ballTimeout() {
  if (!ball) return;
  if (ball.state === 'rest') fetchBall(false);
  else if (ball.state === 'fly' || ball.state === 'drag') ball.toT = later(ballTimeout, 500);
}
function kickBall() {
  ball.vx = rnd(180, 420) * (ball.x > W / 2 ? -1 : 1); ball.vy = -rnd(780, 980);
  ball.state = 'fly'; ball.user = true; cancel(ball.restT); armBall(); kick();
}
function ballDown(e) {
  const b = ball; if (!b || b.el !== e.currentTarget || b.pid !== null || (b.state !== 'fly' && b.state !== 'rest')) return;
  e.preventDefault(); lastAct = now();
  b.pid = e.pointerId; try { b.el.setPointerCapture(e.pointerId); } catch (_) { /* nada */ }
  cancel(b.restT); b.state = 'drag'; b.vx = b.vy = 0; b.sq = 0; b.moved = 0; b.gx = e.clientX - b.x; b.gy = e.clientY - b.y;
  b.samples = [{x: e.clientX, y: e.clientY, t: e.timeStamp}]; b.el.classList.add('cp-grab'); armBall();
}
function ballMove(e) {
  const b = ball; if (!b || e.pointerId !== b.pid) return;
  const s = b.samples, l = s[s.length - 1];
  b.moved += Math.abs(e.clientX - l.x) + Math.abs(e.clientY - l.y);
  s.push({x: e.clientX, y: e.clientY, t: e.timeStamp}); if (s.length > 8) s.shift();
  b.x = clamp(e.clientX - b.gx, 0, Math.max(0, W - b.D)); b.y = clamp(e.clientY - b.gy, 0, floorY - b.D);
  b.dirty = true; lastAct = now(); kick();
}
function ballUp(e) {
  const b = ball; if (!b || e.pointerId !== b.pid) return;
  try { b.el.releasePointerCapture(e.pointerId); } catch (_) { /* nada */ }
  b.pid = null; b.el.classList.remove('cp-grab'); lastAct = now();
  if (b.state !== 'drag') return;
  if (e.type === 'pointerup' && b.moved < 8) { kickBall(); return; }   // toque: la patea hacia arriba
  const v = e.type === 'pointerup' ? pure.throwVel(b.samples, e.timeStamp) : {vx: 0, vy: 0};
  b.vx = v.vx; b.vy = v.vy; b.state = 'fly'; b.user = true; armBall(); kick();
}
function onBallRest() {
  const b = ball; gazeBall();
  if (b.user) b.restT = later(() => fetchBall(true), 260);
  else { const p = pets[0]; if (p && free(p)) { p.dg.setExpr(p.key === 'coral' ? 'wink' : 'sly'); hop(p, 12, 420); calm(p, 1600); } }
}
/* El perrito corre a traerla y la devuelve; 3 atrapadas seguidas = corazones y frase */
async function fetchBall(play) {
  const b = ball; if (!b || (b.state !== 'rest' && b.state !== 'fly')) return;
  cancel(b.toT); cancel(b.restT);
  const pet = pets[0], tok = begin(pet), ok = () => tok === pet.tok && built && !pet.dead && ball === b;
  b.state = 'fetch'; b.el.classList.add('cp-off'); pet.dg.setExpr('wow');
  const bc = b.x + b.D / 2, d = bc >= pet.x + pet.w / 2 ? 1 : -1, tx = bc - pet.w * (d > 0 ? .74 : .26), dist = Math.abs(tx - pet.x);
  const ant = an(pet, pet.sq, kf([[0, 'translateX(0) scale(1,1)', E.out], [1, `translateX(${-5 * d}px) scale(1.12,.85)`]]), {duration: 160, fill: 'forwards'});
  await fin(ant); if (!ok()) return;
  setSide(pet, d); ant.cancel(); gallop(pet, true);
  if (!await tweenX(pet, tx, clamp(dist, 180, 1100), EASE.ioQ) || !ok()) return;
  gallop(pet, false);
  later(() => { if (ok()) { b.state = 'held'; b.holder = pet; kick(); } }, 150);   // la muerde a mitad del cabeceo
  await fin(an(pet, pet.sq, kf([[0, 'rotate(0deg) scale(1,1)', E.out], [.5, `rotate(${16 * d}deg) scale(1.06,.92)`, E.out], [1, 'rotate(0deg) scale(1,1)']]), {duration: 320}));
  if (!ok()) return;
  b.state = 'held'; b.holder = pet;
  const back = Math.abs(pet.home - pet.x);
  if (back > 2) { setSide(pet, pet.home >= pet.x ? 1 : -1); gallop(pet, true); if (!await tweenX(pet, pet.home, clamp(back, 180, 1100), EASE.ioQ) || !ok()) return; gallop(pet, false); }
  setFront(pet); kick();
  if (play) b.catches++;
  if (play && b.catches < 3) {
    pet.dg.setExpr('laugh');
    const wind = an(pet, pet.sq, kf([[0, 'rotate(0deg) scale(1,1)', E.out], [1, 'rotate(-10deg) scale(1.1,.88)']]), {duration: 260, fill: 'forwards'});
    await fin(wind); if (!ok()) return;
    wind.cancel();
    an(pet, pet.sq, kf([[0, 'rotate(-10deg) scale(1.1,.88)', E.out], [.35, 'rotate(9deg) scale(.94,1.08)', E.spring], [1, 'rotate(0deg) scale(1,1)']]), {duration: 500});
    b.holder = null; b.user = false; b.vx = rnd(240, Math.min(520, 180 + W * .4)); b.vy = -rnd(880, 1120); b.state = 'fly'; b.el.classList.remove('cp-off');
    armBall(); kick(); end(pet, tok); calm(pet, 800);
  } else {
    if (play) {
      pets.forEach(p => { if (!p.dead && !p.side) p.dg.hearts(p.key === 'coral' ? 5 : 3, 120, 56); });
      pet.dg.setExpr('tender'); end(pet, tok); hop(pet, 30, 640); say(pet, TRES[pet.key], {ms: 6500});
    } else { pet.dg.setExpr('proud'); end(pet, tok); }
    endBall(true); calm(pet, 2400);
  }
}
function endBall(soft) {
  const b = ball; if (!b) return;
  ball = null; cancel(b.toT); cancel(b.restT); lastBall = now();
  pets.forEach(p => { if (p.dead) return; if (!soft && p.busy === Infinity) settle(p); p.dg.gaze = null; });
  const rm = () => b.el.remove();
  if (soft && !reduced()) {
    b.el.classList.add('cp-off');
    const a = b.svg.animate([{transform: `rotate(${b.rot}rad) scale(1)`, opacity: 1}, {transform: `rotate(${b.rot}rad) scale(0)`, opacity: 0}], {duration: 240, easing: E.in, fill: 'forwards'});
    a.onfinish = a.oncancel = rm;
  } else rm();
  if (built && !isPaused) scheduleBall();
}

/* ---------- 6) Ociosos ---------- */
function scheduleIdle() { cancel(idleT); if (!built) return; idleT = later(() => { idleTick(); scheduleIdle(); }, rnd(9000, 16000)); }
function scratch(p) {
  const dg = p.dg; dg.setExpr('chill');
  const fr = [[0, 'rotate(0)', E.out], [.12, 'rotate(-34deg)', E.sine]];
  for (let i = 0; i < 6; i++) fr.push([.2 + i * .1, `rotate(${i % 2 ? -34 : -50}deg)`, E.sine]);
  fr.push([1, 'rotate(0)']);
  dg.f(dg.pawR, kf(fr), 1400);
  dg.f(dg.head, kf([[0, 'rotate(0deg) translateY(0)', E.out], [.14, 'rotate(9deg) translateY(4px)', E.sine], [.8, 'rotate(9deg) translateY(4px)', E.io], [1, 'rotate(0deg) translateY(0)']]), 1400);
  dg.f(dg.earR, wob(20, 9), 1400, {delay: 120});
  an(p, p.sq, kf([[0, 'rotate(0deg)', E.out], [.14, 'rotate(4deg)', E.sine], [.8, 'rotate(4deg)', E.io], [1, 'rotate(0deg)']]), {duration: 1400 * dg.d.tempo});
  calm(p, 1500 * dg.d.tempo);
}
function idleTick() {
  if (!built || isPaused || minimized || reduced() || ball || sc.on || bubGuide) return;
  const t = now(), cand = pets.filter(free); if (!cand.length) return;
  if (pure.isNight(new Date().getHours())) {   // de noche duermen con «z»
    if (t - lastAct > 8000) cand.forEach(p => { if (!p.asleep) { p.asleep = true; p.dg.run('sleep'); } });
    return;
  }
  cand.forEach(p => { if (p.asleep) { p.asleep = false; p.dg.stop(); } });
  const p = cand[Math.floor(Math.random() * cand.length)], r = Math.random(), k = p.dg.d.tempo;
  if (r < .26) { p.dg.run('yawn'); p.busy = t + 2600 * k; }
  else if (r < .48) { p.dg.run('sit'); p.busy = t + 1700 * k; }
  else if (r < .72) { scratch(p); p.busy = t + 1600 * k; }
  else if (r < .88) { p.dg.run('stretch'); p.busy = t + 3000 * k; }
  else { p.dg.run('shake'); p.busy = t + 1200 * k; }
}

/* ---------- Ciclo único (rAF) ---------- */
function loop(t) {
  raf = 0; if (!built || isPaused) return;
  const dt = clamp((t - lastT) / 1000, .001, .032); lastT = t; let more = false;
  for (const p of pets) {
    const tw = p.tw; if (!tw) continue;
    if (!tw.t0) tw.t0 = t;
    const k = Math.min(1, (t - tw.t0) / tw.dur); setX(p, tw.from + (tw.to - tw.from) * tw.ease(k));
    if (k >= 1) { p.tw = null; tw.res(true); } else more = true;
  }
  const b = ball;
  if (b) {
    if (b.state === 'fly') { more = true; if (pure.stepBall(b, dt, W, floorY).rest) { b.state = 'rest'; drawBall(); onBallRest(); } else { drawBall(); gazeBall(); } }
    else if (b.state === 'drag') { if (b.dirty) { b.dirty = false; drawBall(); gazeBall(); } }
    else if (b.state === 'held' && b.holder) {
      const p = b.holder, hx = p.x + p.w * (p.side ? (p.dir > 0 ? .74 : .26) : .5) - b.D / 2, hy = floorY - p.h * (p.side ? .5 : .4) - b.D / 2, f = Math.min(1, dt * 20);
      b.x += (hx - b.x) * f; b.y += (hy - b.y) * f; b.rot *= 1 - f * .5; drawBall();
      if (p.tw || Math.abs(hx - b.x) + Math.abs(hy - b.y) > .6) more = true;
    }
  }
  if (sc.dirty || sc.on) more = scrollStep(t) || more;
  if (more && built && !isPaused) raf = requestAnimationFrame(loop);
}
function kick() { if (!raf && built && !isPaused) { lastT = performance.now(); raf = requestAnimationFrame(loop); } }

/* ---------- Pausa: pestaña oculta, hoja abierta, panel de avisos o app bloqueada ---------- */
function checkPause() {
  if (!built) return;
  const p = paused(); layer.classList.toggle('cp-dim', overlayOpen());
  if (p === isPaused) return;
  isPaused = p; if (p) pauseAll(); else resumeAll();
}
function freeze(p, on) { p.dg.visible = !on; p.dg.idle.forEach(a => { try { on ? a.pause() : a.play(); } catch (e) { /* nada */ } }); }
function pauseAll() {
  cancelAnimationFrame(raf); raf = 0; cancel(idleT); cancel(ballT);
  endBall(false);
  pets.forEach(p => { settle(p); freeze(p, true); });
  sc.on = sc.dirty = sc.crouch = false;
}
function resumeAll() {
  const t = now();
  pets.forEach(p => freeze(p, false)); M.wake();
  sc.y = window.scrollY; sc.t = t; sc.guard = t + 600; lastAct = t;
  scheduleIdle(); scheduleBall();
}
function onMutate(list) {
  for (const m of list) if (m.type === 'childList') m.addedNodes.forEach(n => { if (n.nodeType === 1 && n.classList.contains('scrim') && mo) mo.observe(n, {attributes: true, attributeFilter: ['hidden']}); });
  checkPause();
}
function onResize() {
  cancel(resizeT);
  resizeT = later(() => {
    if (!built) return;
    if ((innerWidth < 420) !== mobile) { rebuild(); return; }
    measure(); pets.forEach(p => { if (!p.tw && p.busy !== Infinity) setX(p, p.home); });
    if (ball) { ball.x = clamp(ball.x, 0, Math.max(0, W - ball.D)); ball.y = Math.min(ball.y, floorY - ball.D); if (ball.state === 'rest') { ball.state = 'fly'; kick(); } else if (ball.state !== 'fly') drawBall(); }
    if (bub && !bub.hidden && bubPet && !bubPet.dead) { const bw = bub.offsetWidth, left = clamp(bubPet.x - 4, 8, Math.max(8, W - bw - 8)); bub.style.left = left + 'px'; }
  }, 180);
}
function onTouch() { lastAct = performance.now(); }
function onReduce() { if (!built || !reduced()) { if (built && !isPaused) scheduleBall(); return; } endBall(false); pets.forEach(settle); cancel(ballT); }

/* ---------- Montaje ---------- */
function measure() {
  W = document.documentElement.clientWidth || innerWidth;
  floorY = floorEl.getBoundingClientRect().top;
  pets.forEach(p => { p.w = p.el.offsetWidth; p.h = p.el.offsetHeight; p.home = 10 + p.i * Math.round(p.w * .8); });
}
function build() {
  if (built || !ensure() || !document.body) return;
  mobile = innerWidth < 420; who = profile();
  layer = document.createElement('div'); layer.className = 'cp-layer'; layer.id = 'cpLayer';
  layer.innerHTML = '<div class="cp-floor"></div><div class="cp-bub" hidden><b class="cp-who"><span></span><span class="cp-tag"></span></b><p class="cp-tx" role="status"></p><button type="button" class="cp-ok">Entendido</button></div><button type="button" class="cp-x" aria-label="Minimizar a los perritos (vuelven al cambiar de página)"><svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3,3L9,9M9,3L3,9"/></svg></button>';
  document.body.appendChild(layer);
  floorEl = layer.querySelector('.cp-floor'); bub = layer.querySelector('.cp-bub'); bubWho = bub.querySelector('.cp-who span'); bubTag = bub.querySelector('.cp-tag');
  bubTx = bub.querySelector('.cp-tx'); bubOk = bub.querySelector('.cp-ok'); xBtn = layer.querySelector('.cp-x'); np = document.getElementById('np');
  bubOk.addEventListener('click', onOk); xBtn.addEventListener('click', minimize);
  built = true;
  const a = who === 'D' ? 'orio' : 'coral';
  try {
    pets = [makePet(a, 0)]; if (!mobile) pets.push(makePet(a === 'coral' ? 'orio' : 'coral', 1));
  } catch (e) { console.error('Rumbo (Compas):', e); unbuild(); return; }
  measure(); pets.forEach(p => setX(p, p.home));
  addEventListener('scroll', onScroll, {passive: true}); addEventListener('resize', onResize);
  addEventListener('pointerdown', onTouch, {passive: true}); addEventListener('keydown', onTouch, {passive: true});
  document.addEventListener('visibilitychange', checkPause);
  if (R.addEventListener) R.addEventListener('change', onReduce);
  mo = new MutationObserver(onMutate);
  mo.observe(document.body, {attributes: true, attributeFilter: ['class'], childList: true});
  document.querySelectorAll('.scrim').forEach(s => mo.observe(s, {attributes: true, attributeFilter: ['hidden']}));
  if (np) mo.observe(np, {attributes: true, attributeFilter: ['hidden']});
  const t = now(); sc.y = window.scrollY; sc.t = t; sc.on = sc.dirty = sc.crouch = sc.deep = sc.atBottom = false; sc.guard = t + 1200; sc.last = 0; lastAct = t;
  isPaused = paused(); layer.classList.toggle('cp-dim', overlayOpen());
  if (isPaused) pets.forEach(p => freeze(p, true)); else { scheduleIdle(); scheduleBall(); }
}
function unbuild() {
  if (!built) return;
  built = false; cancelAnimationFrame(raf); raf = 0;
  timers.forEach(clearTimeout); timers.clear();
  if (mo) { mo.disconnect(); mo = null; }
  removeEventListener('scroll', onScroll); removeEventListener('resize', onResize);
  removeEventListener('pointerdown', onTouch); removeEventListener('keydown', onTouch);
  document.removeEventListener('visibilitychange', checkPause);
  if (R && R.removeEventListener) R.removeEventListener('change', onReduce);
  if (ball) { ball.el.remove(); ball = null; }
  pets.forEach(p => {
    p.dead = true; if (p.tw) { const r = p.tw.res; p.tw = null; r(false); }
    p.anims.forEach(a => { try { a.cancel(); } catch (e) { /* nada */ } }); p.anims.clear();
    if (p.dg) { try { p.dg.idle.forEach(a => a.cancel()); } catch (e) { /* nada */ } M.dispose(p.dg); }
    if (p.sd) M.dispose(p.sd);
  });
  pets = []; if (layer) layer.remove();
  layer = floorEl = bub = bubWho = bubTag = bubTx = bubOk = xBtn = np = bubPet = null; bubGuide = null; isPaused = false;
}
function rebuild() { unbuild(); build(); }
function popIn() {
  pets.forEach((p, i) => {
    an(p, p.sq, kf([[0, 'scale(0,0)', E.spring], [.7, 'scale(1.06,.96)', E.sine], [1, 'scale(1,1)']]), {duration: 620, delay: i * 130, fill: 'backwards'});
    an(p, p.shadow, [{opacity: 0}, {opacity: 1}], {duration: 400, delay: i * 130, fill: 'backwards'});
  });
}
/* Toque largo o «x»: se guardan y vuelven al cambiar de página */
function minimize() {
  if (!built || minimized) return;
  minimized = true; hideBub(); endBall(false);
  const inside = layer.contains(document.activeElement);
  const out = () => { if (!minimized) return; unbuild(); if (inside) { const c = document.querySelector('.dock [aria-current="page"]'); if (c) c.focus({preventScroll: true}); } };
  if (reduced()) { out(); return; }
  pets.forEach((p, i) => {
    settle(p); p.busy = Infinity; p.el.classList.add('cp-busy'); p.dg.setExpr(p.key === 'coral' ? 'wink' : 'chill');
    an(p, p.sq, kf([[0, 'scale(1,1)', E.out], [.3, 'scale(1.1,.9)', E.in], [1, 'scale(0,0)']]), {duration: 340, delay: i * 60, fill: 'forwards'});
    an(p, p.shadow, [{opacity: 1}, {opacity: 0}], {duration: 300, delay: i * 60, fill: 'forwards'});
  });
  later(out, 430);
}

/* ---------- API ---------- */
function init() { ensure(); }
function show() {
  wanted = true; minimized = false;
  if (!ensure() || !enabled) return;
  view = hashView();
  if (built) { if (who !== profile()) rebuild(); return; }
  build(); if (!built) return;
  if (!reduced() && !isPaused) popIn();
  later(maybeGuide, reduced() ? 60 : 950);
}
function hide() { wanted = false; unbuild(); }
function onRoute(v, dir) {
  if (!ensure()) return;
  if (typeof v === 'string' && v) view = v;
  if (!enabled || !wanted) return;
  const fresh = !built || minimized || who !== profile();
  minimized = false;
  if (built && fresh) unbuild();
  if (!built) build();
  if (!built) return;
  hideBub(); endBall(false);
  const t = now(); sc.guard = t + 1600; sc.deep = sc.atBottom = false; if (sc.crouch) crouch(false); lastAct = t;
  if (isPaused) return;
  if (reduced()) { later(maybeGuide, 60); return; }
  const a = pets[0], b = pets[1];
  if (b && (fresh || (free(b) && Math.random() < .38))) cross(b, dir, {delay: 230, chase: true, enter: fresh});   // a veces el hermano lo persigue
  cross(a, dir, {enter: fresh}).then(ok => { if (ok) maybeGuide(); });
}
function setEnabled(on) {
  enabled = !!on;
  if (!enabled) unbuild(); else if (wanted && !built) show();
}

return {init, show, hide, onRoute, onEvent, setEnabled, pure};
})();

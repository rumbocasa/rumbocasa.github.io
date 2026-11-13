const $ = s => document.querySelector(s);
const ic = (n, cls = '') => `<svg class="i ${cls}"><use href="#i-${n}"/></svg>`;
const fmt = n => '$' + String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const short = n => n >= 999500 ? '$' + (n / 1e6).toFixed(n % 1e6 ? 1 : 0).replace('.', ',') + 'M' : '$' + Math.round(n / 1e3) + 'k';
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
var io, spy;
// v2.2 · Ritmo tranquilo: todo un poco más pausado (pedido de Vale). Se apaga en Ajustes → Animaciones tranquilas.
const RITMO_KEY = 'hogar:v1:ritmo';
let RITMO = (() => { try { return localStorage.getItem(RITMO_KEY) === 'normal' ? 1 : 1.45; } catch (e) { return 1.45; } })();
const T0 = ms => reduce ? Math.min(ms, 30) : ms;            // duración de una animación hecha con .animate() (el ritmo la escala aparte)
const T = ms => reduce ? Math.min(ms, 30) : ms * RITMO;     // esperas que acompañan animaciones (y avisos en pantalla)
// Animaciones y transiciones de CSS: se reproducen a 1/RITMO de velocidad
const ritmoCSS = a => { if (RITMO !== 1 && !a._ritmo) { a._ritmo = true; a.playbackRate = 1 / RITMO; } };
document.addEventListener('animationstart', e => { try { e.target.getAnimations().forEach(ritmoCSS); } catch (er) {} }, true);
document.addEventListener('transitionrun', e => { try { e.target.getAnimations().forEach(ritmoCSS); } catch (er) {} }, true);
// Animaciones hechas con Element.animate(): se alarga su duración y su retraso
{ const anim0 = Element.prototype.animate; Element.prototype.animate = function (kf, o) { if (RITMO !== 1 && !reduce) { if (typeof o === 'number') o *= RITMO; else if (o && typeof o === 'object') o = {...o, ...(o.duration ? {duration: o.duration * RITMO} : {}), ...(o.delay ? {delay: o.delay * RITMO} : {})}; } return anim0.call(this, kf, o); }; }
const sleep = ms => new Promise(r => setTimeout(r, T(ms)));
const now = new Date(), today = now.getDate();
const monthName = now.toLocaleDateString('es-CO', {month: 'long'});
const monthShort = now.toLocaleDateString('es-CO', {month: 'short'}).replace('.', '');
const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
const tone = {a1: ['var(--a1)', 'var(--a1i)'], a2: ['var(--a2)', 'var(--a2i)'], a3: ['var(--a3)', 'var(--a3i)'], ok: ['var(--ok)', 'var(--oki)'], al: ['var(--alert)', 'var(--alerti)'], gd: ['var(--gold)', 'var(--goldi)'], mu: ['var(--muted)', 'var(--muted)']};
const tile = (icon, t = 'a1', cls = '') => `<div class="tile ${cls}" style="--cb:${tone[t][0]};--c:${tone[t][1]}">${ic(icon)}</div>`;

// Datos iniciales reales: DATOS_REALES (js/datos-reales.js, copia de docs/modelo_datos.json) -> estado de la app
const int = n => Number.isFinite(+n) ? Math.round(+n) : 0;
// Iconos y tonos por categoría (id del JSON); los iconos ya existen en index.html
const CAT_UI = {g_01: ['home', 'a1'], g_02: ['cart', 'a2'], g_03: ['wifi', 'a3'], g_04: ['bolt', 'gd'], g_05: ['play', 'a3'], g_06: ['coin', 'al'], g_07: ['coin', 'al'], g_08: ['pulse', 'al'], g_09: ['pulse', 'a2'], g_10: ['cup', 'al'], g_11: ['bag', 'gd'], g_12: ['car', 'a3'], g_13: ['car', 'a1'], g_14: ['heart', 'a2'], g_15: ['spark', 'a1'], g_16: ['shirt', 'a3'], g_17: ['shield', 'mu'], g_18: ['key', 'mu'], g_19: ['cal', 'mu'], g_20: ['gift', 'a2']};
// SUPUESTO EDITABLE: no tenemos las fechas reales de pago; estos días son provisionales y los pagos quedan MANUALES (sin registro automático).
// `from` = id de la categoría; `d` = día del mes; `n` = nombre corto del pago.
const PAGOS_INI = [
  {from: 'g_03', n: 'Internet', i: 'wifi', d: 12}, {from: 'g_05', n: 'Suscripciones', i: 'play', d: 14}, {from: 'g_01', n: 'Arriendo', i: 'home', d: 15},
  {from: 'g_08', n: 'Salud EPS y Prepagada', i: 'pulse', d: 16}, {from: 'g_06', n: 'Deuda David', i: 'coin', d: 20}, {from: 'g_07', n: 'Deuda Externa', i: 'coin', d: 25}
];
// Cada fondo de ahorro alimenta una meta de compra (misma plata, una sola tarjeta): Argentina, Casa y Carro.
// Los fondos sin meta (corto plazo, inversiones) son metas abiertas (open) sin monto objetivo.
const FONDO_META = {a_05: 'm_01', a_01: 'm_02', a_02: 'm_03'};
const META_UI = {m_01: ['plane', ['var(--a2)', 'var(--a1)']], m_02: ['key', ['var(--gold)', 'var(--alert)']], m_03: ['car', ['var(--a3)', 'var(--a1)']], m_04: ['bed', ['var(--a1)', 'var(--a3)']], m_05: ['bag', ['var(--ok)', 'var(--a2)']]};
const FONDO_UI = {a_03: ['gift', ['var(--a1)', 'var(--gold)']], a_04: ['trend', ['var(--ok)', 'var(--a2)']]};
// Tareas pendientes: [icono, puntos, quién]; V=Vale, D=David (supuesto repartido 4 y 4, el modelo solo admite un responsable)
const TAREA_UI = {t_01: ['key', 15, 'D'], t_02: ['lock', 15, 'D'], t_03: ['cart', 10, 'V'], t_04: ['drop', 20, 'V'], t_05: ['gift', 15, 'V'], t_06: ['home', 20, 'D'], t_07: ['bolt', 15, 'V'], t_08: ['bag', 10, 'D']};
// Puro: construye el estado inicial. `ref` = fecha de referencia (para "febrero" del viaje)
function buildReal(D, ref) {
  const f = D.finanzas_hogar, y = ref.getFullYear() + (ref.getMonth() > 1 ? 1 : 0);
  const cats = f.presupuesto_gastos.map(g => ({id: g.id, n: g.categoria, i: (CAT_UI[g.id] || ['wallet', 'a1'])[0], t: (CAT_UI[g.id] || [0, 'a1'])[1], b: int(g.presupuestado), k: g.tipo}));
  cats.push({id: 'ahorro', n: 'Ahorro e inversión', i: 'trend', t: 'ok', b: f.ahorros_e_inversiones.reduce((a, x) => a + int(x.aporte_mensual), 0), saving: true});
  const moves = f.presupuesto_gastos.filter(g => int(g.ejecutado) > 0).map(g => ({n: 'Gastado antes de Rumbo', cat: g.id, a: int(g.ejecutado), d: 1}));
  const pays = PAGOS_INI.map(p => { const g = f.presupuesto_gastos.find(x => x.id === p.from); return {id: 'p_' + p.from, n: p.n, i: p.i, a: int(g.presupuestado), d: p.d, cat: p.from, auto: false}; });
  const fondoDe = mid => f.ahorros_e_inversiones.find(a => FONDO_META[a.id] === mid);
  const goals = f.metas_compras.map(m => { const fo = fondoDe(m.id), u = META_UI[m.id] || ['target', ['var(--a1)', 'var(--a3)']];
    return {id: m.id, n: m.item, i: u[0], t: int(m.costo_estimado) || 1, s: int(m.ahorrado) + (fo ? int(fo.acumulado_actual) : 0), m: fo ? int(fo.aporte_mensual) : 0, by: m.id === 'm_01' ? new Date(y, 1, 1) : null, c: u[1]}; });
  f.ahorros_e_inversiones.filter(a => !FONDO_META[a.id]).forEach(a => { const u = FONDO_UI[a.id] || ['coin', ['var(--a1)', 'var(--a3)']];
    goals.push({id: a.id, n: a.categoria, i: u[0], t: 0, open: true, s: int(a.acumulado_actual), m: int(a.aporte_mensual), by: null, c: u[1]}); });
  const tasks = f.tareas_pendientes.map(t => { const u = TAREA_UI[t.id] || ['check', 10, 'V']; return {id: t.id, n: t.tarea, i: u[0], w: u[2], p: u[1], when: 'Pendientes', rep: 'Una vez', done: t.estado === 'hecha'}; });
  return {income: int(f.ingresos.total_mensual), cats, pays, moves, goals, tasks, auto: null, pts: {V: 0, D: 0}, streak: 0, badges: [], notifs: []};
}
// Categorías de la versión anterior (v1 con datos propios): se conservan para no romper lo ya guardado
const LEGACY_CATS = [['arriendo', 'Arriendo', 'home', 'a1'], ['mercado', 'Mercado', 'cart', 'a2'], ['servicios', 'Servicios', 'bolt', 'gd'], ['transporte', 'Transporte', 'car', 'a3'], ['citas', 'Citas y ocio', 'cup', 'al'], ['casa', 'Casa y aseo', 'spark', 'a2'], ['salud', 'Salud y cuidado', 'pulse', 'al'], ['subs', 'Suscripciones', 'play', 'a3'], ['ahorro', 'Ahorro e inversión', 'trend', 'ok'], ['imprevistos', 'Imprevistos', 'shield', 'mu']].map(([id, n, i, t]) => ({id, n, i, t, b: 0, ...(id === 'ahorro' ? {saving: true} : {})}));

// Estado: arranca con los datos reales y `load()` lo reemplaza por lo guardado
const S = {...buildReal(DATOS_REALES, now), profile: 'V', last: null, mon: null, hist: [], props: [], projs: [], debts: [], recibos: [], notas: [], diario: [], aprendeDesde: null, aprendeAviso: false, people: {V: null, D: null}, faceId: false, compas: true};

// Guardado: un solo objeto versionado en localStorage (v2 = categorías completas; v1 = anterior, se migra al leer)
const KEY = 'hogar:v1', SCHEMA = 2, LISTS = ['pays', 'moves', 'goals', 'tasks', 'badges', 'notifs', 'props', 'projs', 'debts', 'recibos', 'notas', 'diario'];
// Texto libre escrito por ellos (propuestas): siempre escapado antes de pintarlo
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'})[c]);
const PROP_PTS = [10, 15, 20];
let theme = document.documentElement.dataset.theme === 'light' ? 'light' : 'dark', sample = false;
// Puro: valida lo leído y devuelve el estado saneado o null si no sirve.
// Robusto: descarta solo los registros dañados (no todo el guardado) y completa los campos que falten.
const isObj = x => !!x && typeof x === 'object' && !Array.isArray(x);
const objs = x => Array.isArray(x) ? x.filter(isObj) : [];
const str = (x, f) => typeof x === 'string' && x ? x : f;
const who = x => x === 'D' ? 'D' : 'V';
const MK_RE = /^\d{4}-\d{2}$/;
const day31 = x => Math.min(31, Math.max(1, int(x) || 1));
const TONOS = ['suave', 'directo', 'humor'];
// Plan de una meta (v1.1): tipo, lugar, nota, costos, itinerario y fotos (las fotos van aparte, en `hogar:v1:fotos`, por id)
const PLAN_TIPOS = ['viaje', 'compra', 'evento', 'otro'];
const sanPlan = x => !isObj(x) ? null : {
  tipo: PLAN_TIPOS.includes(x.tipo) ? x.tipo : 'otro', lugar: str(x.lugar, '').trim().slice(0, 60), nota: str(x.nota, '').slice(0, 600),
  costos: objs(x.costos).filter(c => typeof c.n === 'string' && c.n.trim()).map((c, i) => ({id: str(c.id, 'c' + i), n: c.n.trim().slice(0, 60), a: Math.max(0, int(c.a)), ok: !!c.ok})).slice(0, 40),
  itin: objs(x.itin).filter(c => typeof c.n === 'string' && c.n.trim()).map((c, i) => ({id: str(c.id, 'i' + i), n: c.n.trim().slice(0, 100), d: str(c.d, '').trim().slice(0, 24), done: !!c.done})).slice(0, 60),
  fotos: (Array.isArray(x.fotos) ? x.fotos : []).filter(f => typeof f === 'string' && /^[a-z0-9_-]{1,40}$/i.test(f)).slice(0, 12), cover: typeof x.cover === 'string' && /^[a-z0-9_-]{1,40}$/i.test(x.cover) ? x.cover : ''};
const sanPerson = x => isObj(x) ? {apodo: str(x.apodo, '').trim().slice(0, 30), cumple: /^\d{2}-\d{2}$/.test(x.cumple) ? x.cumple : '', gustos: Array.isArray(x.gustos) ? [...new Set(x.gustos.filter(g => typeof g === 'string' && g.trim()).map(g => g.trim().slice(0, 30)))].slice(0, 12) : [], comida: str(x.comida, '').trim().slice(0, 60), plan: str(x.plan, '').trim().slice(0, 80), busca: str(x.busca, '').trim().slice(0, 140), tono: TONOS.includes(x.tono) ? x.tono : 'humor'} : null;
// v1.2 · Enlaces de pago (solo http/https), ids de comprobantes y tipos de deuda
const sanUrl = x => { const s = typeof x === 'string' ? x.trim() : ''; return /^https?:\/\/[^\s<>"']{3,300}$/i.test(s) ? s : ''; };
const REC_RE = /^[a-z0-9_-]{1,40}$/i;
const DEBT_TIPOS = ['banco', 'familia', 'celular', 'tarjeta', 'otra'];
const debtCat = cats => (['g_07', 'g_06'].find(id => cats.some(c => c.id === id))) || (cats.find(c => !c.saving) || cats[0]).id;
// Puro: mantiene una cuota en los pagos por cada deuda con saldo. Las pagadas este mes se quedan hasta el cierre.
function syncDebts(st) {
  st.debts = st.debts || [];
  const ids = new Set(st.debts.map(d => d.id));
  st.pays = st.pays.filter(p => !p.debt || ids.has(p.debt) || p.paid);
  st.debts.forEach(d => {
    const pid = 'p_' + d.id; let p = st.pays.find(x => x.id === pid);
    if (!p) { if (d.saldo <= 0 || d.cuota <= 0) return; p = {id: pid, n: d.n, i: 'coin', a: 0, d: d.d, cat: d.cat, paid: false, auto: false}; st.pays.push(p); }
    if (!p.paid && (d.saldo <= 0 || d.cuota <= 0)) { st.pays.splice(st.pays.indexOf(p), 1); return; }
    Object.assign(p, {n: d.n, i: 'coin', d: d.d, cat: d.cat, ent: d.ent, link: d.link, ref: d.ref, debt: d.id});
    if (!p.paid) p.a = Math.min(d.cuota, d.saldo);
  });
}
function sanitize(raw) {
  if (!isObj(raw) || (raw.v !== 1 && raw.v !== 2) || !isObj(raw.data)) return null;
  const d = raw.data;
  let cats;
  if (raw.v === 2) {
    cats = objs(d.cats).filter(c => typeof c.id === 'string' && typeof c.n === 'string').map(c => ({id: c.id, n: c.n, i: str(c.i, 'wallet'), t: tone[c.t] ? c.t : 'a1', b: Math.max(0, int(c.b)), ...(c.k ? {k: String(c.k)} : {}), ...(c.saving ? {saving: true} : {})}));
    if (!cats.length) return null;
  } else {
    const bud = Object.fromEntries(objs(d.cats).filter(c => int(c.b) >= 0).map(c => [c.id, int(c.b)]));
    cats = LEGACY_CATS.map(c => ({...c, b: c.id in bud ? bud[c.id] : c.b}));
  }
  if (!cats.some(c => c.id === 'ahorro')) cats.push({id: 'ahorro', n: 'Ahorro e inversión', i: 'trend', t: 'ok', b: 0, saving: true});
  const has = id => cats.some(c => c.id === id), pts = isObj(d.pts) ? d.pts : {};
  const out = {cats, last: Momentos.validKey(d.last) ? d.last : null, profile: who(d.profile), income: Math.max(0, int(d.income)) || 17000000, streak: Math.max(0, int(d.streak)), pts: {V: Math.max(0, int(pts.V)), D: Math.max(0, int(pts.D))}};
  // Pagos: datos viejos sin `auto` quedan manuales (auto: false)
  out.pays = objs(d.pays).filter(p => typeof p.id === 'string' && has(p.cat)).map(p => {
    const o = {id: p.id, n: str(p.n, 'Pago'), i: str(p.i, 'repeat'), a: Math.max(0, int(p.a)), d: day31(p.d), cat: p.cat, paid: !!p.paid, auto: p.auto === true};
    if (p.by === 'V' || p.by === 'D') o.by = p.by;
    if (o.auto && MK_RE.test(p.autoFrom)) o.autoFrom = p.autoFrom;
    // v1.2: entidad, enlace de pago, referencia, deuda de origen y comprobante del mes
    o.ent = str(p.ent, '').trim().slice(0, 50); o.link = sanUrl(p.link); o.ref = str(p.ref, '').trim().slice(0, 40);
    if (typeof p.debt === 'string' && p.debt) o.debt = p.debt;
    if (o.paid && REC_RE.test(p.rec)) o.rec = p.rec;
    return o;
  });
  // v1.2 · Deudas (banco, familia, celulares…): cada una genera su cuota en los pagos del mes (ver syncDebts)
  out.debts = objs(d.debts).filter(x => typeof x.id === 'string' && typeof x.n === 'string' && x.n.trim()).map(x => {
    const saldo = Math.max(0, int(x.saldo));
    return {id: x.id, n: x.n.trim().slice(0, 50), tipo: DEBT_TIPOS.includes(x.tipo) ? x.tipo : 'otra', ent: str(x.ent, '').trim().slice(0, 50), total: Math.max(saldo, int(x.total)), saldo, cuota: Math.max(0, int(x.cuota)), d: day31(x.d), cat: has(x.cat) ? x.cat : debtCat(cats), link: sanUrl(x.link), ref: str(x.ref, '').trim().slice(0, 40), nota: str(x.nota, '').trim().slice(0, 200)};
  }).slice(0, 40);
  // v1.2 · Comprobantes de pago: el registro va aquí; el archivo, en IndexedDB (Cuentas)
  out.recibos = objs(d.recibos).filter(r => REC_RE.test(r.id)).map(r => ({id: r.id, pay: str(r.pay, ''), n: str(r.n, 'Pago').slice(0, 60), a: Math.max(0, int(r.a)), f: /^\d{4}-\d{2}-\d{2}$/.test(r.f) ? r.f : '', mk: MK_RE.test(r.mk) ? r.mk : '', tipo: r.tipo === 'pdf' ? 'pdf' : 'img', nombre: str(r.nombre, '').slice(0, 80), ...(r.by === 'V' || r.by === 'D' ? {by: r.by} : {})})).slice(-300);
  out.moves = objs(d.moves).filter(m => has(m.cat) && int(m.a) > 0).map(m => ({n: str(m.n, 'Gasto'), cat: m.cat, a: int(m.a), d: day31(m.d), ...(m.w === 'V' || m.w === 'D' ? {w: m.w} : {})}));
  out.goals = objs(d.goals).filter(g => typeof g.id === 'string').map(g => {
    const by = g.by ? new Date(g.by) : null, c = Array.isArray(g.c) && g.c.length === 2 && g.c.every(x => typeof x === 'string') ? g.c : ['var(--a1)', 'var(--a3)'];
    return {id: g.id, n: str(g.n, 'Meta'), i: str(g.i, 'target'), c, open: !!g.open, t: g.open ? 0 : (Math.max(0, int(g.t)) || 1), s: Math.max(0, int(g.s)), m: Math.max(0, int(g.m)), by: by && !isNaN(by) ? by : null, ...(isObj(g.plan) ? {plan: sanPlan(g.plan)} : {}),
      // v2.6 · Cofres abiertos de la ruta (25/50/75/100 %), con su premio y si ya se cobró
      ...(Array.isArray(g.cofres) ? {cofres: objs(g.cofres).filter(c => [25, 50, 75, 100].includes(int(c.s))).filter((c, k, a) => a.findIndex(x => int(x.s) === int(c.s)) === k).map(c => ({s: int(c.s), p: str(c.p, 'Premio').slice(0, 80), at: /^\d{4}-\d{2}-\d{2}$/.test(c.at) ? c.at : '', by: c.by === 'D' ? 'D' : 'V', u: !!c.u}))} : {})};
  });
  out.tasks = objs(d.tasks).filter(t => typeof t.id === 'string').map(t => ({id: t.id, n: str(t.n, 'Tarea'), i: str(t.i, 'check'), w: who(t.w), p: Math.max(0, int(t.p)), when: str(t.when, 'Pendientes'), rep: str(t.rep, 'Una vez'), done: !!t.done}));
  out.badges = objs(d.badges); out.notifs = objs(d.notifs).filter(n => typeof n.title === 'string');
  const a = d.auto; out.auto = isObj(a) && typeof a.m === 'string' && Array.isArray(a.names) ? {m: a.m, names: a.names.map(String), seen: !!a.seen} : null;
  out.mon = MK_RE.test(d.mon) ? d.mon : null;
  out.hist = objs(d.hist).filter(h => MK_RE.test(h.m)).map(h => ({m: h.m, out: Math.max(0, int(h.out)), sv: Math.max(0, int(h.sv))})).slice(-24);
  // Propuestas de tareas (v0.6): los guardados viejos no las traen y quedan vacías
  out.props = objs(d.props).filter(p => typeof p.n === 'string' && p.n.trim()).map((p, i) => ({id: str(p.id, 'pr' + i), n: p.n.trim().slice(0, 80), by: who(p.by), w: who(p.w), p: PROP_PTS.includes(int(p.p)) ? int(p.p) : 10, d: str(p.d, '')}));
  // Face ID al entrar (v0.8): activado salvo que lo hayan apagado en Ajustes
  // v1.0 · Bloqueo con Face ID: apagado salvo que lo activen en Ajustes (clave nueva `faceLock`)
  out.faceId = d.faceLock === true;
  // Coral y Oreo en pantalla (compañeros): encendido salvo que lo apaguen en Ajustes
  out.compas = d.compas !== false;
  // Proyectos de la casa: pasos con casilla; `w` = V, D o A (ambos)
  out.projs = objs(d.projs).filter(p => typeof p.id === 'string' && typeof p.n === 'string' && p.n.trim()).map(p => ({id: p.id, n: p.n.trim().slice(0, 60), i: str(p.i, 'target'), w: ['V', 'D', 'A'].includes(p.w) ? p.w : 'A', due: str(p.due, ''), why: str(p.why, '').trim().slice(0, 120), done: !!p.done, steps: objs(p.steps).filter(s => typeof s.n === 'string' && s.n.trim()).map(s => ({n: s.n.trim().slice(0, 80), done: !!s.done})).slice(0, 20), ...(typeof p.premio === 'string' && p.premio.trim() ? {premio: p.premio.trim().slice(0, 80), premioU: !!p.premioU} : {})}));
  // v2.0 · Apuntes (chat) y foto diaria de Rumbo aprende
  const NOTA_K = ['tarea', 'gasto', 'idea', 'plan', 'meta', 'ajuste', 'pregunta', 'nota', 'respuesta'], ATT_T = ['img', 'audio', 'video', 'file'];
  out.notas = objs(d.notas).filter(n => typeof n.id === 'string' && typeof n.t === 'string').map(n => ({id: n.id.slice(0, 40), t: n.t.slice(0, 1000), k: NOTA_K.includes(n.k) ? n.k : 'nota', at: str(n.at, ''), by: n.by === 'D' ? 'D' : n.by === 'bot' ? 'bot' : 'V',
    att: objs(n.att).filter(a => REC_RE.test(a.id)).map(a => ({id: a.id, tipo: ATT_T.includes(a.tipo) ? a.tipo : 'file', nombre: str(a.nombre, 'archivo').slice(0, 80), size: Math.max(0, int(a.size)), dur: Math.max(0, int(a.dur)), nube: a.nube === true})).slice(0, 8),
    ...(isObj(n.conv) && typeof n.conv.tipo === 'string' ? {conv: {tipo: n.conv.tipo.slice(0, 12), id: str(n.conv.id, '').slice(0, 40)}} : {}), hecho: !!n.hecho, fav: !!n.fav})).slice(-400);
  out.diario = objs(d.diario).filter(x => /^\d{4}-\d{2}-\d{2}$/.test(x.f)).map(x => ({f: x.f, out: int(x.out), sv: int(x.sv), pend: int(x.pend), td: int(x.td), tt: int(x.tt), notas: int(x.notas), pV: int(x.pV), pD: int(x.pD), racha: int(x.racha)})).slice(-400);
  out.aprendeDesde = /^\d{4}-\d{2}-\d{2}$/.test(d.aprendeDesde) ? d.aprendeDesde : null;
  out.aprendeAviso = d.aprendeAviso === true;
  // Perfil de cada uno (gustos y contexto): null hasta que lo creen
  const pp = isObj(d.people) ? d.people : {};
  out.people = {V: sanPerson(pp.V), D: sanPerson(pp.D)};
  return out;
}
function save(local) {
  try { localStorage.setItem(KEY, JSON.stringify({v: SCHEMA, theme, sample: false, data: {profile: S.profile, last: S.last, income: S.income, auto: S.auto, cats: S.cats, streak: S.streak, pts: S.pts, mon: S.mon, hist: S.hist, faceLock: S.faceId === true, compas: S.compas !== false, people: S.people, aprendeDesde: S.aprendeDesde, aprendeAviso: S.aprendeAviso === true, ...Object.fromEntries(LISTS.map(k => [k, S[k]]))}})); } catch (e) {}
  // v1.4: también a la nube (si está activa); `local` = cambio que vino de la nube, no se reenvía
  if (!local && typeof Nube === 'object') Nube.push();
}
// Antes de reemplazar algo que no se pudo leer, se guarda una copia para no perder nada
function backup(txt) { try { if (txt) localStorage.setItem(KEY + ':respaldo', txt); } catch (e) {} }
function load() {
  let txt = null, raw = null;
  try { txt = localStorage.getItem(KEY); } catch (e) { return; }
  try { raw = JSON.parse(txt); } catch (e) { raw = null; }
  // Sin datos o de ejemplo (sample true): datos reales, conservando perfil y tema
  if (!isObj(raw) || raw.sample === true || isObj(raw.data) && raw.data.sample === true) {
    if (txt && !isObj(raw)) backup(txt);
    if (isObj(raw) && isObj(raw.data) && raw.data.profile === 'D') S.profile = 'D';
    save(); return;
  }
  // Datos propios (sample false): no se pisan; se sanean y se migran a v2 en el siguiente guardado
  const ok = sanitize(raw);
  if (!ok) { backup(txt); save(); return; }
  Object.assign(S, ok);
  save();
}
// Restablece a los datos iniciales conservando perfil y tema
function resetReal() { Object.assign(S, buildReal(DATOS_REALES, new Date()), {last: null, mon: monthKey(new Date()), hist: []}); syncDebts(S); save(); }
load();

// Lógica pura: ingreso y presupuesto
// Convierte texto a pesos enteros: {v} si sirve, {err} con mensaje si no
function parseMoney(txt) {
  const s = String(txt ?? '').trim();
  if (!s) return {err: 'Escribe un monto'};
  if (s.includes('-')) return {err: 'No puede ser negativo'};
  const clean = s.replace(/[\s$.]/g, '');
  if (!/^\d+$/.test(clean)) return {err: 'Solo números enteros, sin decimales'};
  const v = parseInt(clean, 10);
  return v > 99999999999 ? {err: 'Ese monto es demasiado grande'} : {v};
}
const sumBudgets = cats => cats.reduce((a, c) => a + c.b, 0);
const overBy = (cats, income) => Math.max(0, sumBudgets(cats) - income);

// Lógica pura: pagos recurrentes automáticos del mes
const monthKey = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
// Día efectivo del pago: un pago del 31 vence el último día en meses cortos
const payDay = (p, dim = daysInMonth) => Math.min(p.d, dim);
const nextMonthKey = d => monthKey(new Date(d.getFullYear(), d.getMonth() + 1, 1));
// Devuelve los pagos automáticos vencidos (día <= hoy) que aún no se han registrado.
// `autoFrom` evita que un pago marcado como automático después de su fecha se registre solo con retraso.
const dueAuto = (pays, day, mk) => pays.filter(p => p.auto && !p.paid && payDay(p) <= day && (!p.autoFrom || p.autoFrom <= mk));
// Cierre de mes: si cambió el mes se archiva el resumen, se vacían los movimientos y se reinician
// pagos recurrentes y tareas repetitivas (las de "Una vez" se quedan como estén). Devuelve true si cambió algo.
function rollMonth(st, mk) {
  if (st.mon === mk) return false;
  if (!st.mon) { st.mon = mk; return true; } // datos de antes de esta versión: se asumen del mes actual
  const out = st.moves.reduce((a, m) => a + m.a, 0), sv = st.moves.filter(m => m.cat === 'ahorro').reduce((a, m) => a + m.a, 0);
  st.hist = [...st.hist, {m: st.mon, out, sv}].slice(-24);
  st.moves = [];
  st.pays.forEach(p => { p.paid = false; delete p.by; delete p.rec; });
  st.tasks.forEach(t => { if (t.rep !== 'Una vez') t.done = false; });
  st.notifs = st.notifs.filter(n => n.kind !== 'auto');
  st.mon = mk;
  return true;
}
const autoTitle = n => n === 1 ? '1 pago se registró solo' : `${n} pagos se registraron solos`;
const listNames = a => a.length > 1 ? a.slice(0, -1).join(', ') + ' y ' + a[a.length - 1] : a[0] || '';
// Registra los vencidos y acumula el resumen del mes; devuelve los creados
function runAuto(st, day, mk) {
  const due = dueAuto(st.pays, day, mk);
  if (!due.length) return [];
  due.forEach(p => { p.paid = true; st.moves.push({n: p.n, cat: p.cat, a: p.a, d: payDay(p)}); const db = p.debt && (st.debts || []).find(x => x.id === p.debt); if (db) db.saldo = Math.max(0, db.saldo - p.a); });
  const prev = st.auto && st.auto.m === mk ? st.auto : {m: mk, names: [], seen: false};
  st.auto = {m: mk, names: [...prev.names, ...due.map(p => p.n)], seen: false};
  const n = st.auto.names.length, notif = {kind: 'auto', i: 'repeat', t: 'a1', title: autoTitle(n), text: listNames(st.auto.names), when: 'este mes'};
  const k = st.notifs.findIndex(x => x.kind === 'auto');
  if (k >= 0) st.notifs.splice(k, 1);
  st.notifs.unshift(notif);
  return due;
}
{ const rolled = rollMonth(S, monthKey(now)); syncDebts(S); const auto = runAuto(S, today, monthKey(now)).length; const ap = typeof Aprende === 'object' ? Aprende.diario(S, now) : {}; if (rolled || auto || ap.nuevo) save(); }

// Logros: se calculan desde los datos. Al cargar se ponen al día sin avisar; después, cada acción avisa los nuevos.
S.badges = Momentos.badgesFrom(S.badges, S).list;
function checkBadges() {
  const r = Momentos.badgesFrom(S.badges, S); S.badges = r.list;
  r.fresh.forEach(b => { const t = 'Logro: ' + b.n; if (!S.notifs.some(n => n.kind === 'logro' && n.title === t)) S.notifs.unshift({kind: 'logro', i: b.i, t: 'gd', title: t, text: b.d, when: 'hoy'}); });
  return r.fresh;
}

const view = $('#view');
const spent = id => S.moves.filter(m => m.cat === id).reduce((a, m) => a + m.a, 0);
const totalOut = () => S.moves.reduce((a, m) => a + m.a, 0);
const savedMonth = () => spent('ahorro');
const cat = id => S.cats.find(c => c.id === id);
const level = () => { const t = S.pts.V + S.pts.D; return {n: Math.floor(t / 100) + 1, t, next: (Math.floor(t / 100) + 2) * 100}; };

function ring(pct, size, stroke, c1, c2, id, inner) {
  const r = (size - stroke) / 2, C = 2 * Math.PI * r, off = C * (1 - Math.min(pct, 1)), c = size / 2;
  return `<div class="ringwrap" style="width:${size}px;height:${size}px"><svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true">
    <defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" style="stop-color:${c1}"/><stop offset="1" style="stop-color:${c2}"/></linearGradient></defs>
    <circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="var(--track)" stroke-width="${stroke}"/>
    <circle class="ring-arc" style="--C:${C}" cx="${c}" cy="${c}" r="${r}" fill="none" stroke="url(#${id})" stroke-width="${stroke}" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${off}" transform="rotate(-90 ${c} ${c})"/>
  </svg><div class="center">${inner}</div></div>`;
}
const dueText = p => {
  const pd = payDay(p), au = p.auto ? ' · automático' : '';
  if (p.paid) return `<span class="sub">Pagado · ${pd} ${monthShort}${au}</span>`;
  const diff = pd - today;
  if (diff < 0) return `<span class="sub late">Vencido hace ${-diff} ${-diff === 1 ? 'día' : 'días'}${au}</span>`;
  if (diff === 0) return `<span class="sub late">Vence hoy${au}</span>`;
  return `<span class="sub">Vence en ${diff} ${diff === 1 ? 'día' : 'días'} · ${pd} ${monthShort}${au}</span>`;
};
// Interruptor de pago automático (se registra solo el día del pago, con aviso y Deshacer)
const autoBtn = p => `<button class="auto-tg" data-act="auto" data-id="${p.id}" aria-pressed="${!!p.auto}" aria-label="${p.auto ? 'Pago automático activado: ' : 'Activar pago automático: '}${p.n}" title="${p.auto ? 'Se registra solo cada mes' : 'Pago manual · toca para que se registre solo'}">${ic('repeat')}</button>`;
const payRow = p => `<div class="row ${p.paid ? 'paid' : ''}">${tile(p.i, p.paid ? 'mu' : (payDay(p) - today <= 2 ? 'al' : 'a1'))}
  <div style="min-width:0"><div class="t" title="${esc(p.n)}">${esc(p.n)}${p.ent ? `<span class="pay-ent"> · ${esc(p.ent)}</span>` : ''}</div>${dueText(p)}</div>
  <div class="r"><span class="amt">${fmt(p.a)}</span>${p.paid ? (p.rec ? `<button class="auto-tg rec-on" data-act="recibo" data-id="${p.rec}" aria-label="Ver comprobante de ${esc(p.n)}" title="Ver comprobante">${ic('clip')}</button>` : `<button class="auto-tg" data-act="soporte" data-id="${p.id}" aria-label="Subir comprobante de ${esc(p.n)}" title="Subir comprobante">${ic('clip')}</button>`) : ''}${autoBtn(p)}${p.paid && p.by ? Avatares.head(p.by, 26, 'happy') : ''}${p.paid ? `<span class="done-chip" title="Pagado">${ic('ok')}</span>` : `<button class="btn pri" data-act="pay" data-id="${p.id}">Pagar</button>`}</div></div>`;
const chk = '<svg viewBox="0 0 24 24"><path d="m5 12 5 5 9-10"/></svg>';
const taskRow = t => `<div class="row task ${t.done ? 'done' : ''}">
  <button class="check" data-act="task" data-id="${t.id}" aria-pressed="${!!t.done}" aria-label="Marcar ${esc(t.n)}">${chk}</button>
  <div style="min-width:0;display:flex;align-items:center;gap:10px"><span class="muted" style="display:flex">${ic(t.i)}</span><div style="min-width:0"><div class="t" title="${esc(t.n)}">${esc(t.n)}</div><span class="sub">${esc(t.rep)}</span></div></div>
  <div class="r"><span class="pill c1">+${t.p}</span>${Avatares.head(t.w, 30, 'happy')}</div></div>`;
// Puro: tareas de hoy; si no hay con fecha, las 3 primeras sin hacer
const homeTasks = ts => { const h = ts.filter(t => t.when === 'Hoy'); return h.length ? {hoy: true, list: h} : {hoy: false, list: ts.filter(t => !t.done).slice(0, 3)}; };
const monthsTo = d => Math.max(1, (d.getFullYear() - now.getFullYear()) * 12 + d.getMonth() - now.getMonth());
// Puro: línea de ritmo de una meta (con fecha: aporte sugerido; con aporte mensual: meses restantes; abierta: solo el aporte)
function goalPace(g, monthsLeft) {
  if (g.open) return g.m ? `Aporte mensual <b class="mono" style="color:var(--fg)">${fmt(g.m)}</b> · sin meta fija` : 'Sin meta fija';
  const falta = Math.max(0, g.t - g.s);
  if (g.by) return `Aporte sugerido <b class="mono" style="color:var(--fg)">${fmt(Math.ceil(falta / monthsLeft / 1000) * 1000)}</b> al mes · ${g.by.toLocaleDateString('es-CO', {month: 'short', year: 'numeric'})}`;
  if (g.m) { const n = Math.ceil(falta / g.m); return `Aporte <b class="mono" style="color:var(--fg)">${fmt(g.m)}</b> al mes · ${falta ? `unos ${n} ${n === 1 ? 'mes' : 'meses'}` : 'meta completa'}`; }
  return 'Sin fecha ni aporte definido';
}
// v2.0: la tarjeta de meta la dibuja escenas.js (paisaje vivo; toda la portada abre la meta y su plan)
const goalCard = (g, i, big) => typeof Escenas === 'object' ? Escenas.goalCard(g, i, big) : goalCardV1(g, i, big);
const goalCardV1 = (g, i, big) => {
  const pct = g.open ? 0 : g.s / g.t, m = g.by ? monthsTo(g.by) : 1, add = g.m && g.m !== 100000 ? g.m : (big ? 500000 : 0);
  return `<div class="glass goal" style="--i:${i}">
    <div class="goal-top">${ring(pct, big ? 84 : 70, 7, g.c[0], g.c[1], 'gr' + g.id + (big ? 'b' : ''), ic(g.i))}
      <div style="min-width:0"><div class="nm" title="${esc(g.n)}">${esc(g.n)}</div><div class="money">${fmt(g.s)}${g.open ? '' : ` <span class="muted">/ ${short(g.t)}</span>`}</div><div class="mono muted" style="font-size:12px">${g.open ? 'acumulado' : Math.round(pct * 100) + '% completado'}</div></div></div>
    <div class="sug">${goalPace(g, m)}</div>
    <div class="acts"><button class="btn pri" data-act="plan" data-id="${g.id}">${ic('spark')} Planear</button><button class="btn ghost" data-act="abono" data-id="${g.id}" data-a="100000">${ic('plus')} $100.000</button>${add ? `<button class="btn acc" data-act="abono" data-id="${g.id}" data-a="${add}">${ic('plus')} ${fmt(add)}</button>` : ''}</div></div>`;
};
// Barras de progreso: se animan con transform (scaleX), nunca con width; acepta 0..1 y tolera NaN
const barP = k => `--p:${Number.isFinite(k) ? Math.min(1, Math.max(0, k)) : 0}`;
const empty = (icon, title, text) => `<div class="row" style="justify-content:flex-start;gap:14px">${tile(icon, 'mu')}<div><div class="t">${title}</div><span class="sub">${text}</span></div></div>`;
const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Buenos días, quiubo' : h < 19 ? 'Buenas tardes, quiubo' : 'Buenas noches, parceros'; };
const scoreRows = () => { const mx = Math.max(S.pts.V, S.pts.D, 1); return `<div class="score">
  <div class="score-row">${Avatares.head('V', 34, 'happy')}<div class="bar"><i style="${barP(S.pts.V / mx)};background:linear-gradient(90deg,var(--a3),var(--a1))"></i></div><b>${S.pts.V}</b></div>
  <div class="score-row">${Avatares.head('D', 34, 'happy')}<div class="bar"><i style="${barP(S.pts.D / mx)};background:linear-gradient(90deg,var(--a1),var(--a2))"></i></div><b>${S.pts.D}</b></div></div>`; };

const views = {
  inicio() {
    const out = totalOut(), avail = S.income - out, pct = out / S.income;
    const pending = S.pays.filter(p => !p.paid).sort((a, b) => a.d - b.d), pendingTotal = pending.reduce((a, p) => a + p.a, 0);
    const lv = level(), days = ['L', 'M', 'M', 'J', 'V', 'S', 'D'], wd = (now.getDay() + 6) % 7;
    const homeT = homeTasks(S.tasks);
    const show = [...pending.slice(0, 3), ...S.pays.filter(p => p.paid).slice(0, 1)];
    $('#wm').innerHTML = `${Math.round(pct * 100)}%<small>{ rumbo: true }</small>`;
    return `${Voces.helloHTML()}
    ${typeof Escenas === 'object' ? Escenas.hoy() : ''}
    <div class="grid">
      <section class="glass hero s8" style="--i:1"><span class="code snippet">const mes = "${monthName}";</span>
        <div class="hero-l"><div class="eyebrow">Disponible este mes</div>
          <div class="amount" ${avail >= 0 ? `data-count="${avail}"` : ''}><span class="cur">${avail < 0 ? '−$' : '$'}</span><span class="num">${fmt(Math.abs(avail)).slice(1)}</span></div>
          <div class="muted" style="font-size:14px">de ${fmt(S.income)} · quedan ${daysInMonth - today} días de ${monthName}</div>
          <div class="hero-stats">
            <div class="stat"><b>${fmt(out - savedMonth())}</b><span><i style="background:var(--a1)"></i>Gastado</span></div>
            <div class="stat"><b>${fmt(savedMonth())}</b><span><i style="background:var(--ok)"></i>Ahorrado</span></div>
            <div class="stat"><b>${fmt(pendingTotal)}</b><span><i style="background:var(--alert)"></i>Por pagar</span></div></div></div>
        ${ring(pct, 168, 14, 'var(--a1)', 'var(--a3)', 'heroRing', `<div><b>${Math.round(pct * 100)}%</b><span>del ingreso usado</span></div>`)}
      </section>
      <div class="s4" style="display:grid;gap:16px">
        <section class="glass" style="--i:2"><div class="streak">${tile('flame', 'gd', 'lg')}<div><b>${S.streak}</b> <span class="muted">${S.streak === 1 ? 'día' : 'días'} de racha</span><div class="muted" style="font-size:12px">Abran la app hoy para seguir sumando</div></div></div>
          <div class="week">${days.map((d, i) => `<div class="day ${i <= wd && wd - i < S.streak ? 'on' : ''} ${i === wd ? 'today' : ''}"><i></i>${d}</div>`).join('')}</div></section>
        <section class="glass" style="--i:3"><div class="card-h"><h2>${ic('trophy')}Marcador</h2><span class="pill gd">Nivel ${lv.n}</span></div>${scoreRows()}</section>
      </div>
      <section class="glass s6" style="--i:4"><div class="card-h"><h2>${ic('repeat')}Próximos pagos</h2><span class="card-hr"><span class="pill al">${pending.length} pendientes</span><button class="iconbtn sm" data-act="cuentas" data-id="pagos" aria-label="Editar pagos, deudas y topes" title="Editar pagos, deudas y topes">${ic('edit')}</button></span></div><div class="list">${show.length ? show.map(payRow).join('') : empty('repeat', 'Aún no hay pagos', 'Cuando agreguen pagos recurrentes aparecerán aquí.')}</div></section>
      <section class="glass s6" style="--i:5"><div class="card-h"><h2>${ic('check')}${homeT.hoy ? 'Hoy en casa' : 'Por hacer en casa'}</h2><span class="pill c1">${homeT.list.filter(t => t.done).length}/${homeT.list.length} hechas</span></div><div class="list">${homeT.list.length ? homeT.list.map(taskRow).join('') : empty('check', 'Nada para hoy', 'Sin tareas por ahora, ¡disfruten la casa!')}</div></section>
      <section class="s12"><div class="card-h rv" style="--i:6;margin:8px 4px 12px"><h2>${ic('target')}Sus metas</h2><a class="pill c1" href="#tareas">Ver todas ${ic('arrow')}</a></div>
        ${S.goals.length ? `<div class="goals gv-row-list">${[...S.goals].sort((a, b) => (a.by ? a.by.getTime() : 9e15) - (b.by ? b.by.getTime() : 9e15)).map((g, i) => goalCard(g, i + 7)).join('')}</div>` : `<div class="glass">${empty('target', 'Aún no tienen metas', 'Su primera meta de ahorro aparecerá aquí.')}</div>`}</section>
      <div class="s12">${typeof Escenas === 'object' ? Escenas.notaRapida() : ''}</div>
    </div>`;
  },
  finanzas() {
    $('#wm').innerHTML = '';
    return `<div class="view-head rv"><div class="eyebrow">// la plata de ${monthName}</div><h1>El dinero de la casa, <span class="hl">en orden</span></h1></div>
    ${Graficas.page()}`;
  },
  metas() {
    const tot = S.goals.reduce((a, g) => a + g.s, 0);
    $('#wm').innerHTML = `${short(tot)}<small>goals.map(cumplir)</small>`;
    return `<div class="view-head rv"><div class="eyebrow">// ${S.goals.length} metas activas · ${fmt(tot)} ahorrados</div><h1>Lo que <span class="hl">vamos a lograr</span></h1></div>
    ${S.goals.length ? `<div class="goals" style="grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr))">${S.goals.map((g, i) => goalCard(g, i + 1, true)).join('')}</div>` : `<div class="glass">${empty('target', 'Aún no tienen metas', 'Cuando creen una meta de ahorro la verán aquí.')}</div>`}`;
  },
  tareas() {
    $('#wm').innerHTML = '';
    return `<div class="view-head rv"><div class="eyebrow">// lo que estamos construyendo</div><h1>Tareas, metas y <span class="hl">proyectos</span></h1></div>
    ${Planes.html()}`;
  },
  logros() {
    const lv = level();
    $('#wm').innerHTML = `lvl.${lv.n}<small>xp += amor;</small>`;
    return `<div class="view-head rv"><div class="eyebrow">// ${lv.t} puntos entre los dos</div><h1>Nuestros <span class="hl">logros</span></h1></div>
    <section class="glass level" style="--i:1;margin-bottom:16px"><div class="lvl-badge">${lv.n}</div><div style="flex:1;min-width:min(220px,100%)"><h2>Nivel ${lv.n} · Rumbo firme</h2><div class="muted" style="font-size:13px;margin:4px 0 12px">Faltan <b class="mono" style="color:var(--fg)">${lv.next - lv.t}</b> puntos para el nivel ${lv.n + 1}</div>
      <div class="bar"><i style="${barP(lv.t % 100 / 100)};background:linear-gradient(90deg,var(--gold),var(--alert))"></i></div></div></section>
    ${S.badges.length ? '' : `<div class="glass">${empty('trophy', 'Aún no hay logros', 'Los irán desbloqueando mientras usan la app juntos.')}</div>`}
    <div class="badges">${S.badges.map((b, i) => `<div class="glass bdg ${b.on ? '' : 'locked'}" style="--i:${i + 2}"><div class="tile">${ic(b.i)}</div><b>${b.n}</b><p>${b.d}</p>${b.on ? `<span class="pill ok">${ic('ok')}Desbloqueado</span>` : `<div class="bar"><i style="${barP(b.prog && b.prog[0] / (b.prog[1] || 1))};background:var(--gold)"></i></div>`}</div>`).join('')}</div>`;
  },
  perfil() {
    const tab = perfilTab || S.profile;
    $('#wm').innerHTML = '';
    const tabs = [['V', personName('V'), Avatares.head('V', 28, 'happy', '', true)], ['D', personName('D'), Avatares.head('D', 28, 'happy', '', true)], ['A', 'Ambos', `<span class="duo-h">${Avatares.head('V', 24, 'happy', '', true)}${Avatares.head('D', 24, 'happy', '', true)}</span>`]];
    return `<div class="view-head rv ctr"><div class="eyebrow">// quién es quién en la casa</div><h1>${tab === 'A' ? 'Vale <span class="hl">&amp;</span> David' : `<span class="hl">${esc((S.people[tab] && S.people[tab].apodo) || fullName(tab))}</span>`}</h1></div>
    <div class="ptabs rv" role="group" aria-label="Perfil">${tabs.map(([k, n, av]) => `<button data-ptab="${k}" aria-pressed="${k === tab}">${av}<span>${esc(n)}</span></button>`).join('')}</div>
    ${Perfil.html(tab)}`;
  }
};
// Destellos de escena (decorativos, solo transform/opacity)
const spk = () => `<span class="spk" aria-hidden="true">${[1, 2, 3, 4, 5].map(i => `<i style="--n:${i}">${ic('spark')}</i>`).join('')}</span>`;
const propRow = p => `<div class="row prop">${Avatares.head(p.by, 36)}
  <div style="min-width:0"><div class="t" title="${esc(p.n)}">${esc(p.n)}</div><span class="sub">Propuso ${p.by === 'V' ? 'Vale' : 'David'} · la haría ${p.w === 'V' ? 'Vale' : 'David'} · +${p.p} pts</span></div>
  <div class="r"><button class="iconbtn sm" data-act="propNo" data-id="${p.id}" aria-label="Descartar: ${esc(p.n)}" title="Descartar">${ic('x')}</button><button class="btn acc" data-act="propOk" data-id="${p.id}">${ic('ok')}Aprobar</button></div></div>`;

var perfilTab = null; // pestaña de Perfil: 'V', 'D' o 'A' (ambos); por defecto, el perfil activo
let current = '';
function render(animate) {
  Avatares.release();
  // Si una pantalla falla (dato raro), se muestra un aviso amable en vez de dejar la app en blanco
  try { view.innerHTML = views[current](); }
  catch (e) { console.error('Rumbo:', e); view.innerHTML = `<div class="glass">${empty('info', 'Algo se enredó en esta pantalla', 'Sus datos siguen guardados. Prueben otra pestaña o recarguen la página.')}</div>`; }
  if (animate) { view.classList.add('enter'); clearTimeout(render.t); render.t = setTimeout(() => view.classList.remove('enter'), 1600); countUp(); }
  try { Voces.afterRender(); Avatares.afterRender(view); } catch (e) { console.error('Rumbo:', e); }
  try { if (current === 'finanzas') Graficas.after(view); else if (current === 'perfil') Perfil.after(view); else if (current === 'tareas') Planes.after(view); } catch (e) { console.error('Rumbo:', e); }
  // v2.3: burbuja del chat flotante en todas las pantallas (menos la entrada)
  try { if (typeof Apuntes === 'object') Apuntes.sync(!gateOpen); } catch (e) { console.error('Rumbo:', e); }
  if (typeof setupScroll === 'function') setupScroll();
}
async function route(first) {
  let h = (location.hash || '#inicio').slice(1);
  // v2.3: #apuntes ya no es una pantalla: abre el chat flotante y se queda donde estaba
  if (h === 'apuntes') { const vuelta = current || 'inicio'; history.replaceState(null, '', '#' + vuelta); h = vuelta; if (typeof Apuntes === 'object' && !gateOpen) setTimeout(() => Apuntes.abrir(), 50); }
  const next = views[h] ? h : 'inicio';
  if (!first && next === current) return;
  markTab(next);
  if (next === 'perfil' && current !== 'perfil') perfilTab = null;
  document.body.dataset.mod = next;
  { const ord = ['inicio', 'finanzas', 'tareas', 'perfil'], i0 = ord.indexOf(TAB_OF[current] || current), i1 = ord.indexOf(TAB_OF[next] || next); view.dataset.dir = i1 < i0 ? 'b' : 'f'; }
  if (current && !first && !reduce) { view.classList.add('view-out'); await sleep(250); view.classList.remove('view-out'); }
  current = next; render(true); window.scrollTo(0, 0); moveInd();
  if (!gateOpen) compa('onRoute', next, view.dataset.dir || 'f');
}
function countUp() {
  const el = document.querySelector('[data-count]'); if (!el || reduce) return;
  const target = +el.dataset.count, num = el.querySelector('.num'), t0 = performance.now(), dur = 1200;
  const st = t => { const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 4); num.textContent = fmt(target * e).slice(1); if (k < 1) requestAnimationFrame(st); };
  requestAnimationFrame(st);
}

// Confeti con los colores del diseño
const cv = $('#confetti'), cx = cv.getContext('2d'); let parts = [], raf = 0;
function confetti(x, y, n = 80) {
  if (reduce) return;
  cv.width = innerWidth * devicePixelRatio; cv.height = innerHeight * devicePixelRatio; cx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  const cs = getComputedStyle(document.documentElement), cols = ['--a1', '--a2', '--a3', '--gold'].map(v => cs.getPropertyValue(v).trim());
  for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, s = 3 + Math.random() * 6; parts.push({x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 5, r: 2.5 + Math.random() * 3.5, c: cols[i % cols.length], rot: Math.random() * 6, vr: (Math.random() - .5) * .4, life: 0}); }
  if (!raf) raf = requestAnimationFrame(tick);
}
function tick() {
  cx.clearRect(0, 0, innerWidth, innerHeight);
  parts.forEach(p => { p.vy += .26; p.vx *= .985; p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.life++; cx.save(); cx.translate(p.x, p.y); cx.rotate(p.rot); cx.globalAlpha = Math.max(0, 1 - p.life / 85); cx.fillStyle = p.c; cx.beginPath(); cx.ellipse(0, 0, p.r * 1.6, p.r * .8, 0, 0, 7); cx.fill(); cx.restore(); });
  parts = parts.filter(p => p.life < 85 && p.y < innerHeight + 40);
  raf = parts.length ? requestAnimationFrame(tick) : (cx.clearRect(0, 0, innerWidth, innerHeight), 0);
}
const origin = el => { const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };

// Barra inferior: Metas cuelga de Inicio y Logros de Perfil
const TAB_OF = {metas: 'tareas', logros: 'perfil'};
const markTab = v => { const k = TAB_OF[v] || v; document.querySelectorAll('.tab').forEach(t => t.dataset.v === k ? t.setAttribute('aria-current', 'page') : t.removeAttribute('aria-current')); };

// Dynamic Island (v0.6): aviso limpio con ícono vectorial; sin perritos. Colores fijos porque el aviso siempre es oscuro.
const isl = $('#isl');
const TOAST = {ok: '#6FD39B', gold: '#F5C16C', alert: '#FF8A80', a1: '#F2B458', a2: '#8FDDB6', a3: '#FFB3C1', mu: '#BFB09A'};
const TOAST_VAR = {'var(--ok)': 'ok', 'var(--gold)': 'gold', 'var(--alert)': 'alert', 'var(--a1)': 'a1', 'var(--a2)': 'a2', 'var(--a3)': 'a3'};
function island({icon = 'ok', color = 'a1', title, sub = '', action, onAction, dur = 3600}) {
  clearTimeout(island.t); clearTimeout(island.t2);
  const tc = TOAST[color] || TOAST[TOAST_VAR[color]] || TOAST.mu;
  isl.classList.remove('tall', 'open', 'show'); void isl.offsetWidth;
  isl.innerHTML = `<span class="isl-ic" style="--tc:${tc}">${ic(icon)}</span><div class="isl-tx"><b>${esc(title)}</b><span>${esc(sub)}</span></div>${action ? `<button class="isl-btn">${action}</button>` : ''}<span class="isl-bar"><i></i></span>`;
  isl.classList.add('show'); requestAnimationFrame(() => requestAnimationFrame(() => isl.classList.add('open')));
  const bar = isl.querySelector('.isl-bar i'); if (!reduce) bar.animate([{transform: 'scaleX(1)'}, {transform: 'scaleX(0)'}], {duration: dur, fill: 'forwards'});
  const close = () => { isl.classList.remove('open'); island.t2 = setTimeout(() => isl.classList.remove('show'), 450); };
  island.t = setTimeout(close, T(dur));
  if (action) isl.querySelector('.isl-btn').onclick = () => { clearTimeout(island.t); const r = onAction && onAction(); if (r) island(r); else close(); };
}

// Panel de notificaciones
function renderNp() { $('#np').innerHTML = `<div class="np">${Voces.panelHTML(Voces.items())}</div>`; }
const closeNp = () => { const np = $('#np'); np.hidden = true; np.classList.remove('np-m'); document.body.classList.remove('np-on'); $('#bell').setAttribute('aria-expanded', 'false'); };
// En el celular el panel de avisos va a pantalla completa (fuera de la barra de arriba) para que no se salga por la izquierda
const npMovil = () => matchMedia('(max-width:640px)').matches;
$('#bell').onclick = e => { e.stopPropagation(); const np = $('#np'), open = np.hidden; if (!open) { closeNp(); return; }
  if (npMovil()) { if (np.parentElement !== document.body) document.body.appendChild(np); np.style.setProperty('--npt', Math.round($('#bell').getBoundingClientRect().bottom + 10) + 'px'); np.classList.add('np-m'); document.body.classList.add('np-on'); }
  else if (np.parentElement === document.body) $('.bellwrap').appendChild(np);
  np.hidden = false; $('#bell').setAttribute('aria-expanded', open); if (open) { renderNp(); $('#bellN').hidden = true; const f = np.querySelector('button'); f && f.focus({preventScroll: true}); } };
$('#np').addEventListener('click', e => {
  e.stopPropagation();
  if (e.target.id === 'np') { closeNp(); return; }
  const b = e.target.closest('[data-np]'), a = e.target.closest('[data-act]'), g = e.target.closest('[data-go]');
  if (b) { const n = S.notifs[+b.dataset.np]; n.act = null; save(); b.closest('div').innerHTML = `<span class="pill ok">${ic('heart')}Gracias enviadas</span>`; confetti(...origin(e.target.closest('.np-i')), 40); }
  else if (a) { closeNp(); doAct(a.dataset.act, a.dataset.id, a, +a.dataset.a); }
  else if (g) { closeNp(); location.hash = g.dataset.go; }
  if (e.target.closest('#npAll')) closeNp();
});
document.addEventListener('click', closeNp);
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#np').hidden) { closeNp(); $('#bell').focus(); } });

// Compañeros (js/compas.js): Coral y Oreo vivos sobre la app; todo va protegido por si el módulo no cargó o está apagado
const compa = (fn, ...args) => { try { if (typeof Compas !== 'undefined' && Compas[fn] && (S.compas !== false || fn === 'hide' || fn === 'setEnabled')) Compas[fn](...args); } catch (e) { console.error('Rumbo:', e); } };
// Celebración (estilo Duolingo): Coral u Oreo suben desde abajo, festejan y dicen su frase.
// Solo aparecen al completar una tarea, hacer un pago o desbloquear un logro.
const cheerEl = $('#cheer'); let cheerDog = null;
const CHEER_EX = {tareaComp: {coral: 'laugh', orio: 'proud'}, pagoHecho: {coral: 'happy', orio: 'proud'}, logro: {coral: 'laugh', orio: 'proud'}};
function cheerOff() {
  clearTimeout(cheer.t); clearTimeout(cheer.t2); clearTimeout(cheer.t3);
  if (cheerDog) { Mascotas.dispose(cheerDog); cheerDog = null; }
  cheerEl.classList.remove('in', 'talk'); cheerEl.hidden = true; cheerEl.innerHTML = '';
}
function cheer(kind) {
  if (gateOpen || !CHEER_EX[kind]) return;
  cheerOff();
  const dog = Voces.speakerFor(kind), name = dog === 'coral' ? 'Coral' : 'Oreo';
  cheerEl.innerHTML = `<div class="ch-bub" role="status"><b>${name}</b><span>${Voces.quote(kind, dog)}</span></div><div class="ch-dog" aria-hidden="true"></div>`;
  cheerEl.hidden = false; void cheerEl.offsetWidth;
  try { cheerDog = Mascotas.mount(cheerEl.querySelector('.ch-dog'), dog, 'front', {expr: 'happy', track: false}); } catch (e) { cheerDog = null; }
  requestAnimationFrame(() => cheerEl.classList.add('in'));
  cheer.t = setTimeout(() => { cheerEl.classList.add('talk'); if (cheerDog) Mascotas.react(cheerDog, CHEER_EX[kind][dog], 'alegre', {big: true}); }, T(520));
  cheer.t2 = setTimeout(() => { cheerEl.classList.remove('talk', 'in'); cheer.t3 = setTimeout(cheerOff, T(650)); }, T(5200));
}
cheerEl.addEventListener('click', cheerOff);

// Logro desbloqueado: se muestra cuando termina la confirmación de la acción (una sola pastilla a la vez)
function announceLogros(list, delay) {
  if (!list || !list.length) return;
  const b = list[0];
  setTimeout(() => {
    confetti(innerWidth / 2, 120, 70); syncTag();
    island({icon: 'star', color: 'gold', title: `Logro: ${b.n}`, sub: list.length > 1 ? `${b.d} · y ${list.length - 1} más` : b.d, dur: 5200});
    cheer('logro'); compa('onEvent', 'logro');
  }, T(delay));
}

// v1.2 · Marca un pago como hecho. o = {a: monto real, rec: id del comprobante, at: [x, y]}.
// Si el pago es la cuota de una deuda, baja el saldo; Deshacer lo devuelve todo (y borra el comprobante recién subido).
function markPaid(id, o = {}) {
  const p = S.pays.find(x => x.id === id); if (!p || p.paid) return;
  const who = S.profile, a = int(o.a) > 0 ? int(o.a) : p.a, at = o.at || [innerWidth / 2, innerHeight / 3], prevA = p.a;
  p.paid = true; p.by = who; p.a = a; if (o.rec) p.rec = o.rec;
  const mv = {n: p.n, cat: p.cat, a, d: today, w: who}; S.moves.push(mv); S.pts[who] += 15;
  const dbt = p.debt ? S.debts.find(x => x.id === p.debt) : null, red = dbt ? Math.min(a, dbt.saldo) : 0;
  if (dbt) dbt.saldo -= red;
  const fin = !!dbt && dbt.saldo === 0, nl = checkBadges(); save();
  confetti(...at, fin ? 140 : 80); render(false); syncTag();
  island({icon: fin ? 'trophy' : 'ok', color: fin ? 'gold' : 'ok', title: fin ? `¡${p.n} quedó saldada!` : `${p.n} quedó pago · +15 pts`,
    sub: fmt(a) + (p.rec ? ' · con comprobante' : '') + (dbt && !fin ? ` · faltan ${fmt(dbt.saldo)}` : ''), action: 'Deshacer', dur: 6200,
    onAction: () => {
      cheerOff(); p.paid = false; delete p.by; p.a = prevA; if (dbt) dbt.saldo += red;
      if (p.rec) { if (typeof Cuentas !== 'undefined') Cuentas.dropRecibo(p.rec); delete p.rec; }
      const k = S.moves.indexOf(mv); if (k >= 0) S.moves.splice(k, 1); S.pts[who] = Math.max(0, S.pts[who] - 15); save(); render(false); syncTag();
      return {icon: 'undo', color: 'mu', title: 'Pago deshecho', sub: 'Todo quedó como estaba', dur: 1800};
    }});
  cheer('pagoHecho'); compa('onEvent', fin ? 'logro' : 'pago');
  announceLogros(nl, 6400);
}

// Acciones (los botones de las tarjetas, del centro de avisos y de la pastilla en dúo comparten doAct)
function doAct(act, id, el, a) {
  const at = el ? origin(el) : [innerWidth / 2, innerHeight / 3];
  const dogOf = Voces.dogOfProfile(S.profile);
  if (act === 'pay') {
    // v1.2: el botón Pagar abre el flujo de pago (ir a la entidad, comprobante y monto real)
    if (typeof Cuentas !== 'undefined' && Cuentas.pay) Cuentas.pay(id, at); else markPaid(id, {at});
  } else if (act === 'go') { location.hash = '#' + (id || 'inicio'); }
  else if (act === 'cuentas') { if (typeof Cuentas !== 'undefined') Cuentas.open(id || 'pagos'); }
  else if (act === 'recibo') { if (typeof Cuentas !== 'undefined') Cuentas.verRecibo(id); }
  else if (act === 'soporte') { if (typeof Cuentas !== 'undefined') Cuentas.soporte(id); }
  else if (act === 'task') {
    const t = S.tasks.find(x => x.id === id); if (!t) return;
    t.done = !t.done; S.pts[t.w] = Math.max(0, S.pts[t.w] + (t.done ? t.p : -t.p)); const nl = t.done ? checkBadges() : []; save();
    if (t.done) { announceLogros(nl, 5600); confetti(...at, 45); island({icon: 'ok', color: 'ok', title: `¡Bacano! +${t.p} para ${t.w === 'V' ? 'Vale' : 'David'}`, sub: t.n, dur: 4200}); cheer('tareaComp'); compa('onEvent', 'tarea'); }
    const row = el && el.closest('.task'); if (row) { row.classList.toggle('done', t.done); el.setAttribute('aria-pressed', t.done); }
    setTimeout(() => { render(false); syncTag(); }, T(450));
  } else if (act === 'auto') {
    const p = S.pays.find(x => x.id === id); if (!p) return;
    const mk = monthKey(now); p.auto = !p.auto;
    // Si ya pasó su día y no está pago, se registra solo desde el próximo mes (no de golpe con retraso)
    if (p.auto) p.autoFrom = !p.paid && payDay(p) < today ? nextMonthKey(now) : mk; else delete p.autoFrom;
    save(); render(false);
    island({icon: 'repeat', color: 'a1', title: p.auto ? `${p.n} se registra solo` : `${p.n} vuelve a ser manual`, sub: p.auto ? (p.autoFrom !== mk ? `Desde el próximo mes, el día ${p.d}` : `Cada mes, el día ${p.d}, con aviso y Deshacer`) : 'Lo marcan ustedes al pagarlo', dur: 3200});
  } else if (act === 'abono') {
    a = int(a); if (!(a > 0)) return;
    const g = S.goals.find(x => x.id === id); if (!g) return;
    const ef = g.open ? a : Math.min(a, g.t - g.s); if (!(ef > 0)) { island({icon: 'ok', color: 'ok', title: `${g.n} ya está completa`, sub: 'No hace falta abonar más', dur: 2600}); return; }
    a = ef; g.s += a; S.moves.push({n: 'Abono · ' + g.n, cat: 'ahorro', a, d: today, w: S.profile}); S.pts[S.profile] += 10; const nl = checkBadges(); save();
    confetti(...at, 55); render(false);
    const cofreListo = typeof Planes === 'object' && Planes.listos ? Planes.listos(g).length : 0;
    island({icon: cofreListo ? 'gift' : 'trend', color: cofreListo ? 'gold' : 'a2', title: `${fmt(a)} más cerca de ${g.n}`, sub: g.open ? `${fmt(g.s)} acumulados` : cofreListo ? `${Math.round(g.s / g.t * 100)}% · ¡llegaron a una parada! Abran el cofre en Planes › Metas` : `${Math.round(g.s / g.t * 100)}% completado`, dur: cofreListo ? 5600 : 4200});
    announceLogros(nl, 4400); compa('onEvent', 'abono');
  } else if (act === 'prof') Voces.setProfile(id === 'D' ? 'D' : 'V');
  else if (act === 'propOk') {
    const k = S.props.findIndex(x => x.id === id); if (k < 0) return;
    const p = S.props.splice(k, 1)[0];
    S.tasks.push({id: 't_' + p.id, n: p.n, i: 'spark', w: p.w, p: p.p, when: 'Propuestas aprobadas', rep: 'Una vez', done: false});
    S.pts[p.by] += 5; const nl = checkBadges(); save(); confetti(...at, 40); render(false); syncTag();
    island({icon: 'check', color: 'ok', title: 'Propuesta aprobada · ya es tarea', sub: `+5 pts para ${p.by === 'V' ? 'Vale' : 'David'} por la idea`, dur: 3600});
    announceLogros(nl, 3800);
  } else if (act === 'propNo') {
    const k = S.props.findIndex(x => x.id === id); if (k < 0) return;
    const p = S.props.splice(k, 1)[0]; save(); render(false);
    island({icon: 'x', color: 'mu', title: 'Propuesta descartada', sub: p.n.length > 40 ? p.n.slice(0, 40) + '…' : p.n, action: 'Deshacer', dur: 4200, onAction: () => { S.props.splice(k, 0, p); save(); render(false); }});
  } else if (act === 'plan') { if (typeof MetaPlan !== 'undefined') MetaPlan.open(id); }
  else if (act === 'newGoal') { if (typeof MetaPlan !== 'undefined') MetaPlan.create(); }
  else if (act === 'editProf') openProfEditor(id);
  else if (act === 'open') openSheet('gasto');
  else if (act === 'newTask') openSheet('tarea');
  else if (act === 'tips') Voces.openTips();
}
document.addEventListener('click', e => { const b = e.target.closest('[data-act]'); if (b) doAct(b.dataset.act, b.dataset.id, b, +b.dataset.a); });
// Propuestas de tareas: elegir quién y cuántos puntos, y enviar
view.addEventListener('click', e => {
  const pt = e.target.closest('[data-ptab]');
  if (pt) { perfilTab = pt.dataset.ptab; render(false); const nb = view.querySelector(`[data-ptab="${perfilTab}"]`); nb && nb.focus({preventScroll: true}); return; }
  const b = e.target.closest('[data-pw],[data-pp]'); if (!b) return;
  const attr = b.dataset.pw ? 'data-pw' : 'data-pp';
  b.parentElement.querySelectorAll(`[${attr}]`).forEach(x => x.setAttribute('aria-pressed', x === b));
});
view.addEventListener('submit', e => {
  // v2.0: nota rápida de Inicio → Apuntes
  if (e.target.id === 'hoyNota') {
    e.preventDefault(); const inp = $('#hoyNotaTx'), t = inp.value.trim(); if (!t || typeof Apuntes !== 'object') { inp.focus(); return; }
    inp.value = ''; Apuntes.enviar(t); const k = Aprende.clasificar(t, {cats: S.cats, hoy: new Date()}).tipo;
    island({icon: 'chat', color: 'a1', title: 'Guardado en el chat', sub: k === 'pregunta' ? 'Coral y Oreo ya respondieron' : `Lo entendí como ${({tarea: 'tarea', gasto: 'gasto', idea: 'idea', plan: 'plan', meta: 'meta', ajuste: 'ajuste', nota: 'nota'})[k] || 'nota'}`, action: 'Ver', dur: 4200, onAction: () => { setTimeout(() => Apuntes.abrir(), 50); }});
    return;
  }
  if (e.target.id !== 'propForm') return;
  e.preventDefault();
  const f = e.target, n = f.querySelector('#propTx').value.trim().replace(/\s+/g, ' '), err = f.querySelector('#propErr');
  if (n.length < 3) { err.textContent = 'Escriban un poquito más (mínimo 3 letras).'; f.querySelector('#propTx').focus(); return; }
  const w = (f.querySelector('[data-pw][aria-pressed="true"]') || {dataset: {pw: S.profile}}).dataset.pw, p = +(f.querySelector('[data-pp][aria-pressed="true"]') || {dataset: {pp: 15}}).dataset.pp;
  S.props.unshift({id: 'pr' + Date.now().toString(36), n: n.slice(0, 80), by: S.profile, w: who(w), p: PROP_PTS.includes(p) ? p : 10, d: Momentos.dayKey(new Date())});
  save(); render(false);
  island({icon: 'bulb', color: 'gold', title: 'Propuesta enviada', sub: 'Cuando la aprueben, se vuelve tarea', dur: 3000});
  const nt = $('#propTx'); nt && nt.focus({preventScroll: true});
});

// Registro rápido
let amt = '';
$('#keys').innerHTML = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '000', '0', '⌫'].map(k => `<button class="key" data-k="${k}" aria-label="${k === '⌫' ? 'Borrar' : k}">${k}</button>`).join('');
// v0.8 · Hoja compacta: solo 5 sugerencias (lo que más registran) y "Ver todas" para el resto
const SUG_BASE = ['g_02', 'g_10', 'g_12', 'g_11', 'g_09', 'g_15'];
function suggestedCats() {
  const n = {}; S.moves.forEach(m => { if (m.w) n[m.cat] = (n[m.cat] || 0) + 1; });
  const used = Object.keys(n).sort((a, b) => n[b] - n[a]);
  return [...new Set([...used, ...SUG_BASE, ...S.cats.map(c => c.id)])].filter(id => cat(id)).slice(0, 5);
}
const renderChips = () => {
  const sug = suggestedCats(), rest = S.cats.filter(c => !sug.includes(c.id));
  const chip = (c, more) => `<button class="chip${more ? ' more' : ''}" data-cat="${c.id}" title="${c.n}">${ic(c.i)}<span>${c.n}</span></button>`;
  $('#chips').innerHTML = sug.map(id => chip(cat(id))).join('') + rest.map(c => chip(c, true)).join('');
  $('#chips').classList.remove('all'); $('#qaMore').setAttribute('aria-expanded', 'false'); $('#qaMore').textContent = 'Ver todas';
};
renderChips();
$('#qaMore').onclick = () => { const on = $('#chips').classList.toggle('all'); $('#qaMore').setAttribute('aria-expanded', on); $('#qaMore').textContent = on ? 'Ver menos' : 'Ver todas'; };
const updDisplay = () => { const d = $('#display'); d.textContent = fmt(+amt || 0); d.classList.toggle('zero', !+amt); };
const press = k => { if (k === '⌫') amt = amt.slice(0, -1); else if (amt.length < 10) amt = (amt + k).replace(/^0+/, ''); updDisplay(); if (typeof qaReady === 'function') qaReady(); };
// Gasto o tarea: el mismo botón + sirve para las dos cosas
const TASK_SUG = ['Sacar la basura', 'Lavar la loza', 'Bañar a Coral y Oreo', 'Hacer mercado', 'Cambiar sábanas', 'Regar las matas'];
function qaMode(m, focus) {
  document.querySelectorAll('.qa-mode [data-mode]').forEach(b => b.setAttribute('aria-pressed', b.dataset.mode === m));
  $('#qaGasto').hidden = m !== 'gasto'; $('#qaTarea').hidden = m !== 'tarea';
  const el = m === 'gasto' ? $('#qaGasto') : $('#qaTarea');
  if (!reduce) el.animate([{opacity: 0, transform: 'translateY(8px)'}, {opacity: 1, transform: 'none'}], {duration: 300, easing: 'cubic-bezier(.2,1.2,.4,1)'});
  if (m === 'tarea') {
    $('#qaSug').innerHTML = TASK_SUG.filter(s => !S.tasks.some(t => !t.done && t.n.toLowerCase() === s.toLowerCase())).slice(0, 4).map(s => `<button type="button" class="chip" data-ts="${esc(s)}">${ic('spark')}<span>${esc(s)}</span></button>`).join('');
    document.querySelectorAll('#qaTarea [data-tw]').forEach(b => b.setAttribute('aria-pressed', b.dataset.tw === S.profile));
    $('#qaErr').textContent = ''; if (focus) setTimeout(() => $('#qaTx').focus(), 60);
  } else if (focus) setTimeout(() => $('#keys .key').focus(), 60);
}
function openSheet(m) { amt = ''; selCat = null; updDisplay(); renderChips(); $('#qaTx').value = ''; $('#qaNote').value = ''; $('#qaSave').disabled = true; $('#scrim').hidden = false; qaMode(m === 'tarea' ? 'tarea' : 'gasto', true); }
function closeSheet() { $('#scrim').hidden = true; $('#fab').focus(); }
$('#fab').onclick = () => openSheet('gasto'); $('#closeSheet').onclick = closeSheet;
$('#scrim').addEventListener('click', e => {
  const m = e.target.closest('.qa-mode [data-mode]'); if (m) return qaMode(m.dataset.mode);
  const s = e.target.closest('[data-tw],[data-tp2]');
  if (s) { const a = s.dataset.tw ? 'data-tw' : 'data-tp2'; s.parentElement.querySelectorAll(`[${a}]`).forEach(x => x.setAttribute('aria-pressed', x === s)); return; }
  const ts = e.target.closest('[data-ts]'); if (ts) { $('#qaTx').value = ts.dataset.ts; $('#qaTx').focus(); }
});
$('#qaTarea').addEventListener('submit', e => {
  e.preventDefault();
  const n = $('#qaTx').value.trim().replace(/\s+/g, ' ');
  if (n.length < 3) { $('#qaErr').textContent = 'Escriban qué hay que hacer (mínimo 3 letras).'; $('#qaTx').focus(); return; }
  const w = who(($('#qaTarea [data-tw][aria-pressed="true"]') || {dataset: {}}).dataset.tw || S.profile), p = +(($('#qaTarea [data-tp2][aria-pressed="true"]') || {dataset: {}}).dataset.tp2 || 15);
  S.tasks.push({id: 't_' + Date.now().toString(36), n: n.slice(0, 80), i: 'spark', w, p: [10, 15, 20].includes(p) ? p : 15, when: 'Pendientes', rep: 'Una vez', done: false});
  save(); closeSheet(); render(false); syncTag();
  island({icon: 'check', color: 'ok', title: 'Tarea creada', sub: `Le toca a ${w === 'V' ? 'Vale' : 'David'} · +${p} pts`, dur: 3200});
});
$('#scrim').addEventListener('click', e => { if (e.target.id === 'scrim') closeSheet(); });
$('#keys').addEventListener('click', e => { const k = e.target.closest('[data-k]'); if (k) press(k.dataset.k); });
// v1.0 · La categoría se elige y el gasto se crea con el botón «Crear gasto» (con nota opcional)
let selCat = null;
const qaReady = () => { $('#qaSave').disabled = !(+amt && selCat); };
$('#chips').addEventListener('click', e => {
  const c = e.target.closest('[data-cat]'); if (!c) return;
  selCat = c.dataset.cat; document.querySelectorAll('#chips .chip').forEach(x => x.setAttribute('aria-pressed', x === c)); qaReady();
});
$('#qaSave').addEventListener('click', () => {
  const c = document.querySelector('#chips .chip[aria-pressed="true"]'); if (!c || !selCat) return;
  if (!+amt) { const d = $('#display'); d.classList.remove('shake'); void d.offsetWidth; d.classList.add('shake'); return; }
  const who = S.profile, over0 = Momentos.overBy(S.cats, S.moves);
  const note = $('#qaNote').value.trim().replace(/\s+/g, ' ').slice(0, 40);
  const k = cat(c.dataset.cat), mv = {n: note || k.n, cat: k.id, a: +amt, d: today, w: who}; S.moves.push(mv); S.pts[who] += 5; const nl = checkBadges(); save();
  const cross = over0 === 0 && Momentos.overBy(S.cats, S.moves) > 0, kind = cross ? 'mesPasado' : 'gasto';
  const [x, y] = origin(c); closeSheet(); confetti(x, y, cross ? 0 : 60); render(false); syncTag();
  island({icon: cross ? 'alert' : 'wallet', color: cross ? 'alert' : 'a1', title: `${fmt(mv.a)} en ${k.n}`, sub: cross ? 'Pasaron el presupuesto del mes · +5 pts' : 'Guardado · +5 pts', action: 'Deshacer', dur: cross ? 6200 : 5200, onAction: () => { S.moves.splice(S.moves.indexOf(mv), 1); S.pts[who] -= 5; save(); render(false); syncTag(); return {icon: 'undo', color: 'mu', title: 'Gasto eliminado', sub: 'Todo quedó como estaba', dur: 1800}; }});
  announceLogros(nl, cross ? 6400 : 5400); compa('onEvent', 'gasto');
});
document.addEventListener('keydown', e => {
  if ($('#scrim').hidden) return;
  if (e.key === 'Escape') { closeSheet(); return; }
  if ($('#qaGasto').hidden || e.target.matches('input')) return;
  if (/^[0-9]$/.test(e.key)) press(e.key); else if (e.key === 'Backspace') press('⌫');
});

// Modo claro / oscuro
function setTheme(t) {
  theme = t === 'light' ? 'light' : 'dark';
  document.documentElement.dataset.theme = theme; save();
  const b = $('#themeBtn'), l = theme === 'light' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro';
  b.setAttribute('aria-label', l); b.title = l; b.setAttribute('aria-pressed', theme === 'light');
  syncThemeColor();
}
// v1.3 · Color de la barra del celular según el tema elegido en la app
function syncThemeColor() { document.querySelectorAll('meta[name="theme-color"]').forEach(m => m.setAttribute('content', theme === 'light' ? '#FFF8EC' : '#0A1122')); }
syncThemeColor();

// v1.3 · App instalable (PWA): solo cuando está publicada en https; con file:// no hay service worker ni manifest
const WEB = /^https?:$/.test(location.protocol);
const IS_IOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const STANDALONE = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
let installEvt = null;
if (WEB) {
  const lm = document.createElement('link'); lm.rel = 'manifest'; lm.href = 'manifest.webmanifest'; document.head.appendChild(lm);
  if ('serviceWorker' in navigator) addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(e => console.warn('Rumbo · SW:', e)));
  addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; });
  addEventListener('appinstalled', () => { installEvt = null; island({icon: 'ok', color: 'ok', title: 'Rumbo quedó instalada', sub: 'Ábranla desde el ícono de la casita', dur: 3600}); });
}
const installSub = () => STANDALONE ? 'Ya la están usando como app' : !WEB ? 'Disponible cuando la publiquemos en internet' : IS_IOS ? 'En iPhone: Compartir → Agregar a inicio' : 'Un toque y queda con su ícono';
async function installApp() {
  if (STANDALONE) { island({icon: 'ok', color: 'ok', title: 'Ya está instalada', sub: 'La abrieron desde su ícono', dur: 2600}); return; }
  if (!WEB) { island({icon: 'info', color: 'mu', title: 'Falta publicarla', sub: 'Cuando esté en internet (paso 3) se instala en los celulares', dur: 4200}); return; }
  if (installEvt) { installEvt.prompt(); try { await installEvt.userChoice; } catch (e) {} installEvt = null; return; }
  if (IS_IOS) { island({icon: 'phone', color: 'a1', title: 'En Safari: botón Compartir', sub: 'Luego «Agregar a inicio» y listo', dur: 6500}); return; }
  island({icon: 'phone', color: 'a1', title: 'Desde el menú del navegador', sub: 'Busquen «Instalar app» o «Agregar a la pantalla de inicio»', dur: 6000});
}
$('#themeBtn').addEventListener('click', () => setTheme(theme === 'light' ? 'dark' : 'light'));
setTheme(theme);

// Ajustes: borrar datos de ejemplo con confirmación propia
const tagEl = $('.brandmark .tag'), setBody = $('#setBody');
const syncTag = () => { tagEl.textContent = 'v0.6 · sus datos'; const n = Voces.items(); $('#bellN').hidden = !n.length; $('#bellN').textContent = n.length; Voces.updateBell(n); Avatares.refreshHeader(); };
let draft = null;
function budgetForm() {
  setBody.innerHTML = `<div class="fld"><label for="fInc">Ingreso mensual</label><input id="fInc" data-f="income" inputmode="numeric" autocomplete="off" value="${fmt(S.income)}"><small class="warn" id="e-income" role="alert"></small></div>
  <div class="fld-list">${S.cats.map(c => `<div class="fld"><label for="f-${c.id}">${c.n}</label><input id="f-${c.id}" data-f="${c.id}" inputmode="numeric" autocomplete="off" value="${fmt(c.b)}"><small class="warn" id="e-${c.id}" role="alert"></small></div>`).join('')}</div>
  <div class="fld-total"><span>Suma de presupuestos</span><b class="mono" id="bTotal"></b></div><p id="bMsg" class="muted" style="margin:6px 0 14px;font-size:13px" aria-live="polite"></p>
  <div class="acts"><button class="btn ghost" id="bCancel">Cancelar</button><button class="btn pri" id="bSave">Guardar</button></div>`;
  draft = {};
  budgetCheck(); setTimeout(() => $('#fInc').focus(), 30);
}
// Lee los campos, valida y pinta total y aviso en vivo
function budgetCheck() {
  const res = {};
  [['income', null], ...S.cats.map(c => [c.id, c])].forEach(([k]) => {
    const r = parseMoney($(`[data-f="${k}"]`).value); res[k] = r;
    if (k === 'income' && !r.err && r.v <= 0) r.err = 'El ingreso debe ser mayor a cero';
    const el = $('#e-' + k); el.textContent = r.err || ''; $(`[data-f="${k}"]`).setAttribute('aria-invalid', !!r.err);
  });
  const bad = Object.values(res).some(r => r.err);
  const cats = S.cats.map(c => ({b: res[c.id].err ? 0 : res[c.id].v})), inc = res.income.err ? 0 : res.income.v, tot = sumBudgets(cats), over = overBy(cats, inc);
  $('#bTotal').textContent = fmt(tot); $('#bTotal').classList.toggle('warn', over > 0);
  const msg = $('#bMsg');
  msg.classList.toggle('warn', over > 0);
  msg.textContent = bad ? 'Corrige los montos marcados para poder guardar.' : over > 0 ? `Ojo: se pasan ${fmt(over)} del ingreso. Pueden guardarlo así, o ajustar alguna categoría.` : tot === inc ? 'Cuadra perfecto con el ingreso.' : `Les quedan ${fmt(inc - tot)} sin asignar.`;
  $('#bSave').disabled = bad; draft = bad ? null : res;
}
function saveBudget() {
  if (!draft) return;
  S.income = draft.income.v; S.cats.forEach(c => { c.b = draft[c.id].v; }); save(); draft = null;
  closeSettings(); render(false);
  island({icon: 'ok', color: 'var(--ok)', title: 'Presupuesto actualizado', sub: 'Ingreso ' + fmt(S.income), dur: 2400});
}
// Ajustes (v1.0): grupos con filas claras, interruptores y un solo estilo
const personName = w => (S.people[w] && S.people[w].apodo) || (w === 'V' ? 'Vale' : 'David');
const setGroup = (t, body) => `<section class="set-g"><h3>${t}</h3><div class="set-list">${body}</div></section>`;
const setRow = (id, icon, tn, t, sub) => `<button class="set-row" id="${id}">${tile(icon, tn)}<span class="set-tx"><b>${t}</b><small>${sub}</small></span>${ic('arrow', 'set-ch')}</button>`;
const setSwitch = (id, icon, t, sub, on) => `<button class="set-row" id="${id}" role="switch" aria-checked="${on}">${tile(icon, on ? 'ok' : 'mu')}<span class="set-tx"><b>${t}</b><small>${sub}</small></span><i class="sw" aria-hidden="true"></i></button>`;
function settingsStep(confirm, keep) {
  $('#setTitle').textContent = 'Ajustes';
  setBody.innerHTML = confirm
    ? `<p class="muted" style="margin:0 0 16px">Volverán el ingreso, el presupuesto, los pagos, las metas y las tareas a los datos iniciales; se borran gastos registrados, puntos, rachas y logros. El tema, el perfil y el Face ID se quedan. Esto no se puede deshacer.</p><div class="acts"><button class="btn ghost" id="setCancel">Mejor no</button><button class="btn pri" id="setConfirm">Sí, restablecer</button></div>`
    : `${setGroup('Ustedes', `
        <div class="set-seg" role="group" aria-label="Perfil activo">${['V', 'D'].map(w => `<button data-prof="${w}" aria-pressed="${S.profile === w}">${Avatares.head(w, 30, 'happy', 'decor', true)}<span>${esc(personName(w))}</span></button>`).join('')}</div>
        ${['V', 'D'].map(w => setRow('setProf' + w, 'user', w === 'V' ? 'a3' : 'a2', (S.people[w] ? 'Editar el perfil de ' : 'Crear el perfil de ') + (w === 'V' ? 'Valentina' : 'David'), S.people[w] ? 'Gustos, cumpleaños y cómo le hablan Coral y Oreo' : 'Cuéntenle a Coral y Oreo quién es')).join('')}`)}
      ${setGroup('Apariencia', setSwitch('setTheme', theme === 'dark' ? 'moon' : 'sun', 'Modo oscuro', theme === 'dark' ? 'Noche azul' : 'Atardecer claro', theme === 'dark') + setSwitch('setRitmo', 'clock', 'Animaciones tranquilas', RITMO !== 1 ? 'Más pausadas, para disfrutarlas' : 'Velocidad normal', RITMO !== 1))}
      ${setGroup('Este dispositivo', setRow('setInstall', 'phone', 'a3', 'Instalar Rumbo como app', installSub()))}
      ${setGroup('Seguridad', setSwitch('setFace', 'face', 'Face ID al entrar', S.faceId === true ? 'Se pide al entrar y al volver a la app' : 'Apagado: entran eligiendo su perfil', S.faceId === true) + setRow('setLock', 'lock', 'mu', 'Bloquear ahora', 'Vuelve a la pantalla de entrada'))}
      ${setGroup('La casa', setRow('setCuentas', 'edit', 'a2', 'Pagos, deudas y topes', `${S.pays.length} pagos fijos · ${S.debts.length} ${S.debts.length === 1 ? 'deuda' : 'deudas'} · comprobantes`) + setRow('setEdit', 'wallet', 'a1', 'Ingreso y presupuesto', `Ingreso ${fmt(S.income)} · ${S.cats.length} categorías`))}
      ${setGroup('Coral y Oreo', setSwitch('setCompas', 'heart', 'Coral y Oreo en pantalla', S.compas !== false ? 'Los acompañan, juegan y guían entre páginas' : 'Apagado: solo salen a celebrar', S.compas !== false) + setRow('setTips', 'bulb', 'gd', 'Consejos del día', 'Reflexión y consejitos de sus asistentes') + setRow('setAbout', 'info', 'a2', 'Acerca de Rumbo', 'La marca, Coral y Oreo'))}
      ${setGroup('Rumbo aprende', setRow('setAprende', 'spark', 'gd', 'Lo que Rumbo aprendió', `${(S.diario || []).length} ${(S.diario || []).length === 1 ? 'día' : 'días'} de datos · se actualiza cada día`))}
      ${setGroup('Nube y copias', (typeof Nube === 'object' && Nube.activo() && Nube.perfil() ? setRow('setNube', 'lock', 'a2', 'Cerrar sesión', Nube.estado()) : `<div class="set-row static">${tile('info', 'mu')}<span class="set-tx"><b>Nube</b><small>${typeof Nube === 'object' ? Nube.estado() : 'No disponible'}</small></span></div>`) + setRow('setExport', 'doc', 'a1', 'Descargar copia de seguridad', 'Datos, comprobantes y fotos en un archivo .json') + setRow('setImport', 'undo', 'gd', 'Restaurar una copia', 'Reemplaza los datos con los de un archivo .json'))}
      ${setGroup('Datos', setRow('setClear', 'undo', 'al', 'Restablecer a los datos iniciales', 'Si algo se desordenó; pide confirmación'))}
      <p class="set-foot muted">Rumbo 1.8 · ${typeof Nube === 'object' && Nube.activo() ? 'sus datos viven en la nube de la casa' : 'sus datos viven solo en este navegador'}</p>`;
  if (!keep) setTimeout(() => (setBody.querySelector('button:not([disabled])') || $('#closeSet')).focus(), 30);
}
// v1.4 · Restaurar una copia: elegir el archivo, ver el resumen y confirmar
function importStep() {
  if (typeof Nube !== 'object') return;
  document.querySelectorAll('#impFile').forEach(x => x.remove());
  const inp = document.createElement('input'); inp.type = 'file'; inp.id = 'impFile'; inp.accept = 'application/json,.json'; inp.hidden = true; inp.setAttribute('aria-hidden', 'true'); document.body.appendChild(inp);
  inp.onchange = async () => {
    const f = inp.files && inp.files[0]; inp.remove(); if (!f) return;
    try { const r = await Nube.leerCopia(f); importStep.copia = r.copia;
      $('#setTitle').textContent = 'Restaurar copia';
      setBody.innerHTML = `<p class="muted" style="margin:0 0 12px">${esc(r.resumen)}</p><p class="muted" style="margin:0 0 16px">Los datos actuales se reemplazan por los de la copia${Nube.activo() ? ' y se suben a la nube para los dos' : ''}. Antes guardamos un respaldo en este navegador.</p><div class="acts"><button class="btn ghost" id="setCancel">Cancelar</button><button class="btn pri" id="impOk">Restaurar</button></div>`;
      setTimeout(() => $('#impOk').focus(), 30);
    } catch (e) { island({icon: 'alert', color: 'alert', title: 'No se pudo leer', sub: e.message, dur: 4200}); }
  };
  inp.click();
}
// v2.0 · Panel de Rumbo aprende: qué ha visto, cuánto lleva y el paquete para el desarrollador
function aprendeStep() {
  const dias = (S.diario || []).length, pct = Math.min(1, dias / 30), ref = new Date(), P = Aprende.pure;
  const r = P.ritmo(S, ref.getDate(), daysInMonth), top = Object.values(r).filter(x => x.g > 0).sort((a, b) => b.g - a.g)[0];
  const tk = P.tareas(S), mt = P.metas(S, ref).filter(x => x.atrasada), raro = P.raros(S).length, notas = (S.notas || []).filter(n => n.by !== 'bot');
  const k = notas.reduce((o, n) => { o[n.k] = (o[n.k] || 0) + 1; return o; }, {});
  const li = (i, t) => `<li>${ic(i)}<span>${t}</span></li>`;
  $('#setTitle').textContent = 'Rumbo aprende';
  setBody.innerHTML = `<div class="apr">
    <p class="muted" style="margin:0 0 14px">Todo se calcula en este aparato con sus propios datos: cuánto gastan y a qué ritmo, qué se repite, cómo van las metas y cómo se reparten las tareas. Cada día guarda una foto de los números para ver tendencias.</p>
    <div class="apr-prog"><div class="apr-bar"><i style="transform:scaleX(${pct})"></i></div><span><b>${dias}</b> de 30 días del primer mes${dias >= 30 ? ' · listo para afinar la app' : ''}</span></div>
    <ul class="apr-list">
      ${li('wallet', top ? `Donde más se va la plata este mes: <b>${esc(top.n)}</b> (${fmt(top.g)}).` : 'Aún no hay gastos este mes para comparar.')}
      ${li('alert', Object.values(r).some(x => x.riesgo) ? `A este ritmo se pasarían del tope en: <b>${Object.values(r).filter(x => x.riesgo).map(x => esc(x.n)).join(', ')}</b>.` : 'Ninguna categoría va camino a pasarse del tope.')}
      ${li('spark', raro ? `${raro} ${raro === 1 ? 'gasto salió' : 'gastos salieron'} de lo normal.` : 'Ningún gasto fuera de lo normal.')}
      ${li('target', mt.length ? `Metas que necesitan más aporte: <b>${mt.map(x => esc(x.n)).join(', ')}</b>.` : 'Las metas con fecha van a buen ritmo.')}
      ${li('check', `Tareas hechas: Vale ${tk[0].hechas}/${tk[0].total} · David ${tk[1].hechas}/${tk[1].total}.`)}
      ${li('chat', notas.length ? `En Apuntes: ${Object.entries(k).map(([t, n]) => n + ' ' + t + (n === 1 ? '' : 's')).join(' · ')}.` : 'Aún no han escrito en Apuntes.')}
    </ul>
    <p class="muted" style="font-size:13px;margin:14px 0">Al cumplir el primer mes les aviso para que el desarrollador revise estos números y actualice la app en Firebase y GitHub. El paquete lleva solo totales: ni el texto de sus apuntes ni sus archivos.</p>
    <div class="acts"><button class="btn ghost" id="setCancel">Volver</button><button class="btn pri" id="aprPaq">${ic('doc')}Descargar paquete para el desarrollador</button></div></div>`;
  setTimeout(() => $('#aprPaq').focus(), 30);
}
function aboutStep() {
  setBody.innerHTML = `<div class="about"><div class="about-lk"><span class="mk big">${Marca.mark()}</span>${Marca.word()}</div><p class="tagl">de a dos pa' la casa</p>
    <p class="muted">Rumbo es la casa de Valentina y David: plata, planes y metas en un solo lugar. Coral y Oreo son sus asistentes y la cara de la marca.</p>
    <div class="about-row"><span class="mk sm">${Marca.icon(44)}</span><div><b>Valle al atardecer</b><span class="muted">Logo con su casita · paleta Atardecer paisa · letras Chewy con corazón</span></div></div>
    <div class="about-row"><span class="mk sm">${Mascotas.miniSVG('coral', 'happy', 44)}</span><div><b>Coral</b><span class="muted">Acompaña a Vale. Energética, tierna y coqueta; avisa con cariño.</span></div></div>
    <div class="about-row"><span class="mk sm">${Mascotas.miniSVG('orio', 'chill', 44)}</span><div><b>Oreo</b><span class="muted">Acompaña a David. Sereno y parchado; humor negro seco.</span></div></div>
    <p class="muted" style="font-size:12px">Versión 1.8 · ${typeof Nube === 'object' && Nube.activo() ? 'sus datos viven en la nube de la casa' : 'sus datos viven solo en este navegador'}.</p><div class="acts"><button class="btn ghost" id="aboutBack">Volver</button></div></div>`;
  Marca.play(setBody.querySelector('.about-lk'));
  setTimeout(() => $('#aboutBack').focus(), 30);
}
// Crear o editar el perfil de cada uno (asistente de perfil.js) dentro de la hoja de Ajustes
let sheetDogs = [];
const dropDogs = l => { l.forEach(d => Mascotas.dispose(d)); l.length = 0; };
function mountDogs(root, list) { root.querySelectorAll('[data-bigdog]').forEach(h => { if (h.firstChild) return; try { list.push(Mascotas.mount(h, h.dataset.bigdog === 'D' ? 'orio' : 'coral', 'front', {expr: 'happy', track: false})); } catch (e) { /* sin perrito */ } }); }
function openProfEditor(w) {
  w = w === 'D' ? 'D' : 'V';
  if (typeof Perfil === 'undefined' || !Perfil.wizardHTML) { island({icon: 'info', color: 'mu', title: 'El perfil aún no está disponible', dur: 2400}); return; }
  $('#setTitle').textContent = S.people[w] ? 'Editar perfil' : 'Crear perfil';
  dropDogs(sheetDogs); setBody.innerHTML = Perfil.wizardHTML(w, S.people[w]); $('#scrimSet').hidden = false;
  Perfil.bindWizard(setBody, w, data => { S.people[w] = sanPerson(data); save(); dropDogs(sheetDogs); closeSettings(); render(false); syncTag(); confetti(innerWidth / 2, innerHeight / 3, 60); island({icon: 'user', color: 'ok', title: `Perfil de ${personName(w)} guardado`, sub: 'Coral y Oreo ya saben más de ti', dur: 3200}); }, () => { dropDogs(sheetDogs); settingsStep(false); });
  mountDogs(setBody, sheetDogs);
}
const openSettings = () => { try { Voces.callar(); cheerOff(); } catch (e) {} settingsStep(false); $('#scrimSet').hidden = false; };
const closeSettings = () => { dropDogs(sheetDogs); $('#scrimSet').hidden = true; $('#setBtn').focus(); };
$('#setBtn').onclick = openSettings; $('#closeSet').onclick = closeSettings;
$('#scrimSet').addEventListener('click', e => { if (e.target.id === 'scrimSet') closeSettings(); });
setBody.addEventListener('click', e => {
  const id = e.target.closest('button')?.id;
  const pb = e.target.closest('[data-prof]');
  if (pb) { Voces.setProfile(pb.dataset.prof); settingsStep(false); return; }
  if (id === 'setEdit') budgetForm();
  else if (id === 'setAprende') aprendeStep();
  else if (id === 'aprPaq') { const b = new Blob([JSON.stringify(Aprende.paquete(S), null, 1)], {type: 'application/json'}), a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `rumbo-aprende-${new Date().toISOString().slice(0, 10)}.json`; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 3000); island({icon: 'doc', color: 'ok', title: 'Paquete descargado', sub: 'Compártanlo con el desarrollador', dur: 3200}); }
  else if (id === 'setExport') { if (typeof Nube === 'object') Nube.exportar(); }
  else if (id === 'setImport') importStep();
  else if (id === 'impOk') { const c = importStep.copia; if (!c) return; importStep.copia = null; Nube.importar(c).then(() => { renderChips(); syncTag(); closeSettings(); render(true); island({icon: 'ok', color: 'ok', title: 'Copia restaurada', sub: 'Así quedó todo como en la copia', dur: 3200}); }).catch(e => island({icon: 'alert', color: 'alert', title: 'No se pudo restaurar', sub: e.message, dur: 4200})); }
  else if (id === 'setNube') { closeSettings(); Nube.salir().then(() => { gateResume = ''; showGate(); }); }
  else if (id === 'setInstall') { closeSettings(); installApp(); }
  else if (id === 'setCuentas') { closeSettings(); if (typeof Cuentas !== 'undefined') Cuentas.open('pagos'); }
  else if (id === 'setRitmo') { RITMO = RITMO !== 1 ? 1 : 1.45; try { localStorage.setItem(RITMO_KEY, RITMO === 1 ? 'normal' : 'tranquilo'); } catch (e) {} settingsStep(false, true); $('#setRitmo').focus(); island({icon: 'clock', color: 'a1', title: RITMO !== 1 ? 'Animaciones tranquilas' : 'Velocidad normal', sub: RITMO !== 1 ? 'Todo se mueve con más calma' : 'Todo vuelve a su ritmo original', dur: 2400}); }
  else if (id === 'setTheme') { setTheme(theme === 'light' ? 'dark' : 'light'); settingsStep(false, true); $('#setTheme').focus(); }
  else if (id === 'setCompas') { S.compas = S.compas === false; save(); compa('setEnabled', S.compas); if (S.compas) { if (!enterApp.compasInit) { enterApp.compasInit = true; compa('init'); } compa('show'); } settingsStep(false, true); $('#setCompas').focus(); }
  else if (id === 'setLock') { closeSettings(); gateResume = ''; showGate(); }
  else if (id === 'setProfV' || id === 'setProfD') openProfEditor(id.slice(-1));
  else if (id === 'setFace') { S.faceId = S.faceId !== true; save(); settingsStep(false, true); $('#setFace').focus(); island({icon: 'face', color: S.faceId ? 'ok' : 'mu', title: S.faceId ? 'Face ID activado' : 'Face ID apagado', sub: S.faceId ? 'Se pide al entrar y al volver a la app' : 'Entran eligiendo su perfil', dur: 2400}); }
  else if (id === 'setAbout') aboutStep();
  else if (id === 'aboutBack') settingsStep(false);
  else if (id === 'setTips') { closeSettings(); Voces.openTips(); }
  else if (id === 'bCancel') settingsStep(false);
  else if (id === 'bSave') saveBudget();
  else if (id === 'setClear') settingsStep(true);
  else if (id === 'setCancel') settingsStep(false);
  else if (id === 'setConfirm') { resetReal(); renderChips(); syncTag(); closeSettings(); render(true); island({icon: 'ok', color: 'var(--ok)', title: 'Datos iniciales cargados', sub: 'Todo volvió al punto de partida', dur: 2800}); }
});
setBody.addEventListener('input', e => { if (e.target.matches('[data-f]') && !e.target.closest('.pf-wz') && $('#bSave')) budgetCheck(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#scrimSet').hidden) closeSettings(); });
syncTag();

// Ingreso y carga
const gate = $('#gate'), gateDogs = [];
let gateOpen = false, gateHiddenAt = 0, gateResume = '';
const GATE_AWAY_MS = 60000;
function showGate() {
  gateOpen = true;
  document.querySelector('.app').inert = true; document.querySelector('.dock').inert = true;
  document.body.classList.add('locked'); gate.hidden = false;
  $('#gateCard').getAnimations().forEach(a => a.cancel()); gate.getAnimations().forEach(a => a.cancel());
  Voces.clear(); cheerOff(); compa('hide'); if (typeof Apuntes === 'object') Apuntes.sync(false); $('#loadRing').classList.remove('done'); Marca.play($('#gateBrand'));
  // Paso 1: solo logo, nombre y "¿Quién entra?"; el último perfil usado queda marcado
  document.querySelectorAll('.gp').forEach(b => { const on = b.dataset.gp === S.profile; b.classList.toggle('last', on); b.setAttribute('aria-label', `Entrar como ${b.dataset.gp === 'D' ? 'David' : 'Valentina'}${on ? ', última vez' : ''}`); });
  // v1.4: con la nube activa cada uno entra con su cuenta (correo o Google) y no se elige perfil
  if (typeof Nube === 'object' && Nube.activo()) Nube.entrada();
  else { gateStep('pick', true); const lastBtn = document.querySelector(`.gp[data-gp="${S.profile}"]`); lastBtn && lastBtn.focus({preventScroll: true}); }
  $('#gateCard').animate([{opacity: 0, transform: 'translateY(20px) scale(.96)'}, {opacity: 1, transform: 'none'}], {duration: T0(700), easing: 'cubic-bezier(.2,1.2,.4,1)'});
}
// Cambia de paso dentro de la entrada (elegir perfil → Face ID → carga) con una transición corta
function gateStep(s, silent) {
  const ids = {pick: '#gatePick', auth: '#gateAuth', create: '#gateCreate', login: '#gateLogin', load: '#gateLoad'};
  if (s !== 'create') { dropDogs(gateDogs); $('#gateCreate').innerHTML = ''; }
  $('#gateCard').classList.toggle('wide', s === 'create');
  Object.entries(ids).forEach(([k, sel]) => { $(sel).hidden = k !== s; });
  if (!silent && !reduce) $(ids[s]).animate([{opacity: 0, transform: 'translateY(14px) scale(.98)'}, {opacity: 1, transform: 'none'}], {duration: 460, easing: 'cubic-bezier(.2,1.2,.4,1)'});
}
const fullName = p => p === 'D' ? 'David' : 'Valentina';
// Paso 2: el perfil elegido es el que se reconoce; Face ID arranca solo, como en el celular
function pickProfile(p) {
  S.profile = p === 'D' ? 'D' : 'V'; save();
  document.querySelectorAll('.avatars .av').forEach(b => b.setAttribute('aria-pressed', b.dataset.p === S.profile));
  const g = $('#gateLogin'); g.dataset.p = S.profile;
  $('#faceIc').textContent = S.profile; $('#faceIc').style.opacity = 1; $('#gateHi').textContent = 'Hola, ' + fullName(S.profile);
  $('#faceTk').getAnimations().forEach(a => a.cancel()); $('#scan').style.stroke = ''; $('#scan').getAnimations().forEach(a => a.cancel());
  $('#faceL').textContent = 'Mira la pantalla para entrar'; $('#faceBtn').disabled = false; $('#gateBack').hidden = false;
  // Primera vez de este perfil: en vez de validar, se crea el perfil (gustos y contexto); se puede omitir
  if (!S.people[S.profile] && typeof Perfil !== 'undefined' && Perfil.wizardHTML && !pickProfile.skip[S.profile]) {
    const w = S.profile, host = $('#gateCreate');
    gateStep('create'); host.innerHTML = Perfil.wizardHTML(w, null);
    Perfil.bindWizard(host, w, data => { S.people[w] = sanPerson(data); save(); afterPick(); }, () => { pickProfile.skip[w] = true; afterPick(); });
    mountDogs(host, gateDogs);
    return;
  }
  afterPick();
}
pickProfile.skip = {};
function afterPick() {
  const g = $('#gateLogin');
  // Sin Face ID (apagado por defecto; se activa en Ajustes): directo a la carga
  if (S.faceId !== true) { $('#faceBtn').disabled = true; enterApp(); return; }
  gateStep('login');
  $('#faceBtn').focus({preventScroll: true});
  clearTimeout(pickProfile.t);
  pickProfile.t = setTimeout(() => { if (gateOpen && !g.hidden && !$('#faceBtn').disabled) $('#faceBtn').click(); }, T(700));
}
$('#gatePick').addEventListener('click', e => { const b = e.target.closest('[data-gp]'); if (b) pickProfile(b.dataset.gp); });
$('#gateBack').onclick = () => { clearTimeout(pickProfile.t); gateStep('pick'); const b = document.querySelector(`.gp[data-gp="${S.profile}"]`); b && b.focus({preventScroll: true}); };
$('#replay').onclick = () => { gateResume = ''; showGate(); };
// Siempre Face ID: al volver a la pestaña tras más de 60 s oculta se bloquea de nuevo (y la vista actual se conserva)
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { gateHiddenAt = gateOpen ? 0 : Date.now(); return; }
  if (S.faceId === true && !gateOpen && gateHiddenAt && Date.now() - gateHiddenAt > GATE_AWAY_MS) { gateResume = location.hash || '#inicio'; showGate(); }
  gateHiddenAt = 0;
});
$('#faceBtn').onclick = async () => {
  const btn = $('#faceBtn'); btn.disabled = true; clearTimeout(pickProfile.t); $('#gateBack').hidden = true; $('#faceL').textContent = 'Reconociendo…';
  const sc = $('#scan');
  sc.animate([{transform: 'rotate(0)'}, {transform: 'rotate(720deg)'}], {duration: T0(1100), easing: 'cubic-bezier(.45,0,.2,1)'});
  await sleep(1050);
  sc.animate([{strokeDasharray: '80 236'}, {strokeDasharray: '316 0'}], {duration: T0(260), fill: 'forwards'}); sc.style.stroke = 'var(--ok)';
  $('#faceIc').style.opacity = 0;
  $('#faceTk').animate([{strokeDashoffset: 40}, {strokeDashoffset: 0}], {duration: T0(380), easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards'});
  $('#faceL').textContent = '¡Eres tú! Entrando…';
  await sleep(700);
  enterApp();
};
// Carga y entrada a la app (con o sin Face ID)
async function enterApp() {
  gateStep('load');
  // Carga (v0.6): anillo grueso de puntas redondas que se llena, porcentaje grande y un paso a la vez
  $('#loadRing').innerHTML = ring(0, 128, 16, 'var(--a1)', 'var(--a3)', 'ldr', '<b id="ldN">0</b><span>%</span>');
  const arc = $('#loadRing .ring-arc'); const C = parseFloat(arc.style.getPropertyValue('--C')); arc.style.animation = 'none'; arc.setAttribute('stroke-dashoffset', C);
  const steps = ['Revisando pagos del mes', 'Registrando automáticos', 'Sumando puntos de la semana', 'Preparando su inicio'];
  const lbl = $('#loadL'), dots = [...document.querySelectorAll('.ldots i')], t0 = performance.now(), dur = T(1900); let si = -1;
  await new Promise(r => { const st = t => {
    const k = Math.min(1, Math.max(0, (t - t0) / dur)), e = 1 - Math.pow(1 - k, 3), s = Math.min(steps.length - 1, Math.floor(k * steps.length));
    arc.setAttribute('stroke-dashoffset', C * (1 - e)); $('#ldN').textContent = Math.round(e * 100);
    if (s !== si) { si = s; lbl.textContent = steps[s]; if (!reduce) lbl.animate([{opacity: 0, transform: 'translateY(6px)'}, {opacity: 1, transform: 'none'}], {duration: 320, easing: 'cubic-bezier(.2,1.2,.4,1)'}); dots.forEach((d, i) => d.classList.toggle('on', i <= s)); }
    k < 1 ? requestAnimationFrame(st) : r(); }; requestAnimationFrame(st); });
  $('#loadRing').classList.add('done'); lbl.textContent = '¡Listo!';
  await sleep(380);
  $('#gateCard').animate([{opacity: 1, transform: 'scale(1)', filter: 'blur(0)'}, {opacity: 0, transform: 'scale(1.12)', filter: 'blur(8px)'}], {duration: T0(500), easing: 'cubic-bezier(.5,0,.2,1)', fill: 'forwards'});
  await sleep(320);
  gate.hidden = true; document.body.classList.remove('locked'); gateOpen = false; if (typeof Apuntes === 'object') Apuntes.sync(true);
  document.querySelector('.app').inert = false; document.querySelector('.dock').inert = false;
  document.querySelector('.app').animate([{opacity: 0, transform: 'scale(.97)', filter: 'blur(10px)'}, {opacity: 1, transform: 'none', filter: 'blur(0)'}], {duration: T0(700), easing: 'cubic-bezier(.2,.8,.2,1)'});
  document.querySelector('.dock').animate([{opacity: 0, transform: 'translateY(40px)'}, {opacity: 1, transform: 'none'}], {duration: T0(700), delay: T0(250), easing: 'cubic-bezier(.2,1.3,.4,1)', fill: 'backwards'});
  const todayK = Momentos.dayKey(new Date()), vis = Momentos.visit(S.last, S.streak, todayK);
  const sinGasto = Momentos.sinGastoAyer(S.moves, vis.prev, todayK);
  S.last = vis.last; S.streak = vis.streak; const nl = checkBadges(); save();
  Voces.greet(); syncTag();
  if (!enterApp.compasInit) { enterApp.compasInit = true; compa('init'); } compa('show');
  location.hash = gateResume || '#inicio'; gateResume = ''; current = ''; await route(true);
  await sleep(1400);
  const au = S.auto, lead = [], more = [];
  if (Momentos.isReturn(vis.away)) lead.push({kind: 'vuelta', title: '¡Qué bueno verlos de vuelta!', detail: `Hacía ${vis.away} días que no entraban`, amount: 0, cta: 'Ver inicio', act: {type: 'go', to: '#inicio'}});
  if (vis.newDay && S.streak === 3) more.push({kind: 'racha', title: '3 días seguidos', detail: 'Abrieron Rumbo tres días seguidos', amount: 0, cta: 'Ver logros', act: {type: 'go', to: '#logros'}});
  if (sinGasto) more.push({kind: 'diaSinGasto', title: 'Ayer fue un día sin gastos', detail: 'No hubo gastos registrados', amount: 0, cta: 'Ver gastos', act: {type: 'go', to: '#finanzas'}});
  nl.forEach(b => more.push({kind: 'logro', title: 'Logro: ' + b.n, detail: b.d, amount: 0, cta: 'Ver logros', act: {type: 'go', to: '#logros'}}));
  const ctx = {lead, more};
  if (au && au.m === monthKey(now) && au.names.length && !au.seen) {
    au.seen = true; save();
    Voces.afterLogin({title: autoTitle(au.names.length), detail: listNames(au.names)}, ctx);
  } else Voces.afterLogin(null, ctx);
  // v2.0 · Primer mes de datos: avisa una vez que ya hay base para afinar la app con el desarrollador
  try { const ap = Aprende.diario(S, new Date()); if (ap.mesListo) { S.aprendeAviso = true; save(); setTimeout(() => island({icon: 'spark', color: 'gold', title: 'Ya hay un mes de datos', sub: 'Rumbo aprendió de su casa: pídanle al desarrollador que actualice Firebase y GitHub', action: 'Ver', dur: 9000, onAction: () => { setTimeout(() => { openSettings(); aprendeStep(); }, 60); }}), T(9000)); } } catch (e) { console.error('Rumbo · Aprende:', e); }
};

addEventListener('hashchange', () => route(false));
Voces.init();
current = 'inicio'; document.body.dataset.mod = 'inicio'; render(false);
document.querySelectorAll('.tab').forEach(t => t.dataset.v === 'inicio' ? t.setAttribute('aria-current', 'page') : t.removeAttribute('aria-current'));
showGate();


// ===== Rumbo v3: dock, scroll =====
function moveInd() {
  const t = document.querySelector('.tab[aria-current="page"]'), p = $('#pillInd'); if (!t || !p) return;
  p.style.width = t.offsetWidth + 'px'; p.style.transform = `translateX(${t.offsetLeft}px)`;
}
addEventListener('resize', moveInd); document.fonts && document.fonts.ready.then(moveInd);
const topEl = $('.top');
// Histéresis: encoger al pasar 48 px y volver solo bajo 8 px, así el cambio de alto del header no hace vibrar el scroll
let scrollRaf = 0, stopT = 0;
const onScroll = () => {
  if (!scrollRaf) scrollRaf = requestAnimationFrame(() => {
    scrollRaf = 0; const y = scrollY, sh = topEl.classList.contains('shrunk');
    if (!sh && y > 48) topEl.classList.add('shrunk'); else if (sh && y < 8) topEl.classList.remove('shrunk');
  });
  document.body.classList.add('scrolling'); clearTimeout(stopT); stopT = setTimeout(() => document.body.classList.remove('scrolling'), 150);
};
addEventListener('scroll', onScroll, {passive: true}); onScroll();

function setupScroll() {
  io && io.disconnect(); spy && spy.disconnect();
  const bar = $('#chipbar'), secs = [...view.querySelectorAll('section.glass')].filter(s => s.querySelector('h2'));
  secs.forEach((s, i) => { s.dataset.secname = s.querySelector('h2').textContent.trim(); s.id = 'sec' + i; });
  const ok = secs.length >= 3;
  bar.hidden = !ok; bar.innerHTML = ok ? secs.map(s => `<button data-t="${s.id}">${s.dataset.secname}</button>`).join('') : '';
  if (!reduce) {
    const cards = [...view.querySelectorAll('.glass')].filter(el => el.getBoundingClientRect().top > innerHeight * .92);
    cards.forEach(el => { el.style.animation = 'none'; el.classList.add('blur-pre'); });
    io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('blur-in'); e.target.classList.remove('blur-pre'); io.unobserve(e.target); } }), {threshold: .12});
    cards.forEach(el => io.observe(el));
  }
  if (ok) {
    spy = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) bar.querySelectorAll('button').forEach(b => b.setAttribute('aria-current', b.dataset.t === e.target.id)); }), {rootMargin: '-25% 0px -60% 0px'});
    secs.forEach(s => spy.observe(s));
  }
}
$('#chipbar').addEventListener('click', e => { const b = e.target.closest('button'), el = b && document.getElementById(b.dataset.t); if (el) el.scrollIntoView({behavior: reduce ? 'auto' : 'smooth', block: 'start'}); });
document.addEventListener('pointermove', e => { const g = e.target.closest && e.target.closest('.glass'); if (!g) return; const r = g.getBoundingClientRect(); g.classList.add('lit'); g.style.setProperty('--mx', (e.clientX - r.left) + 'px'); g.style.setProperty('--my', (e.clientY - r.top) + 'px'); }, {passive: true});
setupScroll(); moveInd();

// v0.8 · El logo siempre lleva a Inicio (si ya están ahí, sube arriba) y se anima al tocarlo
$('#brandHd').addEventListener('click', e => {
  Marca.play($('#brandHd'));
  if (current === 'inicio') { e.preventDefault(); window.scrollTo({top: 0, behavior: reduce ? 'auto' : 'smooth'}); }
});

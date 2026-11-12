/* Rumbo · Planeador de metas (v1.1)
   MetaPlan.open(id) abre el planeador de una meta a pantalla completa; MetaPlan.create() crea una meta y lo abre.
   Usa de app.js: S, save, render, island, confetti, cheer, doAct, esc, ic, ring, barP, fmt, parseMoney, goalPace, monthsTo.
   Las fotos NO viven en S: van en localStorage `hogar:v1:fotos` como {idFoto: dataURL}. */
const MetaPlan = (() => {
  'use strict';
  const FKEY = 'hogar:v1:fotos', MAXF = 12, MAXC = 40, MAXI = 60;
  const RM = typeof reduce !== 'undefined' ? reduce : matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ms = n => RM ? Math.min(n, 30) : n;
  const TIPOS = {viaje: ['plane', 'Viaje'], compra: ['bag', 'Compra'], evento: ['gift', 'Evento'], otro: ['target', 'Otro']};
  const TIPO_K = Object.keys(TIPOS);
  const ICONS = [['plane', 'Avión'], ['key', 'Llave'], ['car', 'Carro'], ['bed', 'Cama'], ['bag', 'Bolsa'], ['gift', 'Regalo'], ['heart', 'Corazón'], ['home', 'Casa'], ['target', 'Diana'], ['star', 'Estrella']];
  const PAIRS = [['var(--a2)', 'var(--a1)', 'Monte y sol'], ['var(--gold)', 'var(--alert)', 'Atardecer'], ['var(--a3)', 'var(--a1)', 'Cielo rosa'], ['var(--a1)', 'var(--a3)', 'Durazno'], ['var(--ok)', 'var(--a2)', 'Verde finca'], ['var(--alert)', 'var(--a3)', 'Coral']];
  const TIPO_PAIR = {viaje: 0, compra: 1, evento: 2, otro: 3};
  const SEG = ['var(--a1)', 'var(--a2)', 'var(--a3)', 'var(--gold)', 'var(--ok)', 'var(--alert)'];
  const SECS = [['resumen', 'Resumen'], ['costos', 'Costos'], ['plan', 'Plan'], ['fotos', 'Fotos'], ['notas', 'Notas']];
  const SUG_C = {
    viaje: ['Tiquetes', 'Hospedaje', 'Tours', 'Comida', 'Transporte allá', 'Seguro de viaje', 'Antojos y regalos'],
    compra: ['Precio', 'Envío', 'Instalación', 'Accesorios', 'Seguro', 'Trámites'],
    evento: ['Lugar', 'Comida', 'Bebidas', 'Decoración', 'Música', 'Fotos', 'Invitaciones'],
    otro: ['Materiales', 'Mano de obra', 'Imprevistos']
  };
  const SUG_I = {
    viaje: ['Llegada y check-in', 'Caminar el centro sin afán', 'Tour por la ciudad', 'Cena especial de aniversario', 'Día libre, sin plan', 'Compras y regalos', 'Regreso a casa'],
    compra: ['Comparar precios', 'Ir a verlo en persona', 'Decidirlo juntos', 'Comprarlo'],
    evento: ['Reservar el lugar', 'Enviar invitaciones', 'Confirmar la comida', 'Armar la lista de canciones'],
    otro: ['Definir el primer paso', 'Ponerle fecha']
  };
  const LUGAR_PH = {viaje: '¿A dónde van? Buenos Aires, Argentina', compra: '¿Dónde lo van a comprar?', evento: '¿Dónde será?', otro: 'Lugar (opcional)'};
  const CHK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 5 5 9-10"/></svg>';
  const FOCUS = 'button:not([disabled]),input:not([disabled]):not([type="file"]),textarea:not([disabled]),select:not([disabled]),a[href],[tabindex="0"]';

  /* ---------- Lógica pura ---------- */
  const uid = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  const col = (c, f) => typeof c === 'string' && /^(var\(--[a-z0-9-]+\)|#[0-9a-f]{3,8})$/i.test(c) ? c : f;
  const cols = g => [col(g.c && g.c[0], 'var(--a1)'), col(g.c && g.c[1], 'var(--a3)')];
  const icon = n => typeof n === 'string' && /^[a-z0-9-]+$/.test(n) ? n : 'target';
  const cleanName = s => String(s || '').replace(/[<>"]/g, '').replace(/\s+/g, ' ').trim().slice(0, 60);
  const oneLine = (s, max) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, max);
  const newPlan = tipo => ({tipo: TIPOS[tipo] ? tipo : 'otro', lugar: '', nota: '', costos: [], itin: [], fotos: [], cover: ''});
  const guessTipo = i => i === 'plane' ? 'viaje' : ['key', 'car', 'bag', 'home', 'bed'].includes(i) ? 'compra' : i === 'gift' ? 'evento' : 'otro';
  const totals = p => { let total = 0, paid = 0; p.costos.forEach(c => { const a = Math.max(0, int(c.a)); total += a; if (c.ok) paid += a; }); return {total, paid, pend: total - paid}; };
  const isFull = g => !!g && !g.open && g.t > 0 && g.s >= g.t;
  const allDone = p => p.itin.length > 0 && p.itin.every(x => x.done);
  const daysLeft = (by, ref) => Math.round((new Date(by.getFullYear(), by.getMonth(), by.getDate()) - new Date(ref.getFullYear(), ref.getMonth(), ref.getDate())) / 864e5);
  const countdown = d => d > 1 ? `faltan ${d} días` : d === 1 ? 'falta 1 día' : d === 0 ? '¡es hoy!' : d === -1 ? 'fue ayer' : `fue hace ${-d} días`;
  const parseDate = v => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(v || '')); if (!m) return null; const d = new Date(+m[1], +m[2] - 1, +m[3]); return isNaN(d) || +m[1] < 2000 || +m[1] > 2100 ? null : d; };
  const dateVal = d => d instanceof Date && !isNaN(d) ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : '';
  const nextDay = p => { let mx = 0; p.itin.forEach(x => { const m = /^d[ií]a\s*(\d{1,3})/i.exec(x.d || ''); if (m) mx = Math.max(mx, +m[1]); }); return 'Día ' + (mx + 1); };
  const vsLine = (g, total) => {
    if (g.open) return 'Esta meta todavía no tiene monto fijo. Pueden usar el total del plan.';
    const d = total - g.t;
    if (d > 0) return `El plan supera la meta por <b class="mono">${fmt(d)}</b>. Mejor saberlo hoy que el día de pagar.`;
    if (d < 0) return `La meta le lleva <b class="mono">${fmt(-d)}</b> al plan: ese colchón también es paz.`;
    return 'La meta y el plan cuadran al peso. Cuentas claras, plan tranquilo.';
  };
  const moneyVal = n => n > 0 ? fmt(n) : '';

  /* ---------- Fotos (aparte del estado) ---------- */
  let fcache = null, fseq = 0, busy = false;
  const fotos = () => {
    if (fcache) return fcache;
    try { const o = JSON.parse(localStorage.getItem(FKEY)); fcache = o && typeof o === 'object' && !Array.isArray(o) ? o : {}; } catch (e) { fcache = {}; }
    return fcache;
  };
  const fotosSave = () => { try { localStorage.setItem(FKEY, JSON.stringify(fotos())); return true; } catch (e) { return false; } };
  // v1.5: con la nube, las fotos que subió el otro se traen solas la primera vez que se ven
  const NB = () => typeof Nube === 'object' && Nube.activo();
  const pedidas = new Set();
  function traer(id) {
    if (pedidas.has(id) || !NB()) return; pedidas.add(id);
    Nube.bajarFoto(id).then(d => {
      if (d === undefined) { pedidas.delete(id); return; }
      if (typeof d !== 'string' || !d.startsWith('data:image/')) return;
      fotos()[id] = d; fotosSave();
      const g = goal(); if (g && live(g) && g.plan.fotos.includes(id)) refresh('cover', 'fotos');
      clearTimeout(traer.t); traer.t = setTimeout(() => { try { if (!ov || ov.hidden) render(false); } catch (e) {} }, 400);
    });
  }
  const src = id => { const d = fotos()[id]; if (typeof d === 'string' && d.startsWith('data:image/')) return d; traer(id); return ''; };
  const nubeBorrar = (ids, sigue) => { if (NB()) setTimeout(() => ids.forEach(id => { if (!sigue(id)) Nube.borrarFoto(id); }), 8000); };
  const compress = file => new Promise((res, rej) => {
    if (!file || !/^image\//.test(file.type || '')) { rej(new Error('tipo')); return; }
    const url = URL.createObjectURL(file), im = new Image();
    im.onload = () => {
      try {
        const k = Math.min(1, 1000 / Math.max(im.naturalWidth, im.naturalHeight, 1));
        const w = Math.max(1, Math.round(im.naturalWidth * k)), h = Math.max(1, Math.round(im.naturalHeight * k));
        const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
        const cx = cv.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, w, h); cx.drawImage(im, 0, 0, w, h);
        const out = cv.toDataURL('image/jpeg', .72);
        if (out.startsWith('data:image/')) res(out); else rej(new Error('canvas'));
      } catch (e) { rej(e); } finally { URL.revokeObjectURL(url); }
    };
    im.onerror = () => { URL.revokeObjectURL(url); rej(new Error('lectura')); };
    im.src = url;
  });
  async function addFiles(list, asCover) {
    const g = goal(); if (!g || busy) return;
    const p = g.plan; let ok = 0, bad = 0, full = false, quota = false, last = '';
    busy = true;
    try {
      for (const f of list) {
        if (p.fotos.length >= MAXF) { full = true; break; }
        let data; try { data = await compress(f); } catch (e) { bad++; continue; }
        if (!S.goals.includes(g)) break;
        const id = 'f' + Date.now().toString(36) + (fseq++ % 36).toString(36);
        fotos()[id] = data;
        if (!fotosSave()) { delete fotos()[id]; quota = true; break; }
        p.fotos.push(id); last = id; ok++;
        if (NB()) Nube.subirFoto(id, data);
      }
    } finally { busy = false; }
    if (ok) { if (asCover) p.cover = last; else if (!p.cover) p.cover = p.fotos[0]; save(); }
    if (live(g)) { refresh('cover', 'fotos'); }
    if (quota) island({icon: 'alert', color: 'alert', title: 'Esa foto no cupo', sub: 'El navegador se quedó sin espacio. Borren alguna foto y vuelvan a intentar.', dur: 5200});
    else if (full) island({icon: 'info', color: 'gold', title: `El tablero ya tiene ${MAXF} fotos`, sub: 'Borren una para subir otra. Pocas y bien escogidas.', dur: 4200});
    else if (bad && !ok) island({icon: 'alert', color: 'alert', title: 'No pudimos leer esa foto', sub: 'Prueben con una imagen JPG o PNG.', dur: 4200});
    else if (ok) island({icon: 'spark', color: 'a3', title: asCover ? 'Portada lista' : ok === 1 ? 'Foto al tablero' : `${ok} fotos al tablero`, sub: bad ? `${bad} no se ${bad === 1 ? 'pudo' : 'pudieron'} leer` : 'Lo que se ve seguido, se alcanza más fácil', dur: 3000});
  }

  /* ---------- Estado de la vista ---------- */
  let ov = null, gid = null, mode = '', lbId = '', askDel = false, lastFocus = null, fileMode = 'gal', noteT = 0, spyRaf = 0, wz = null, closing = false, closeT = 0, navCur = '';
  const goal = () => S.goals.find(x => x.id === gid) || null;
  const q = s => ov.querySelector(s);
  const qa = s => Array.from(ov.querySelectorAll(s));
  const live = g => !!ov && !ov.hidden && !closing && mode === 'plan' && goal() === g;
  function ensurePlan(g) {
    if (!g.plan || typeof g.plan !== 'object') g.plan = newPlan(guessTipo(g.i));
    const p = g.plan;
    ['costos', 'itin', 'fotos'].forEach(k => { if (!Array.isArray(p[k])) p[k] = []; });
    if (!TIPOS[p.tipo]) p.tipo = 'otro';
    p.lugar = typeof p.lugar === 'string' ? p.lugar : ''; p.nota = typeof p.nota === 'string' ? p.nota : '';
    if (typeof p.cover !== 'string' || !p.fotos.includes(p.cover)) p.cover = '';
    if (!Array.isArray(g.c) || g.c.length !== 2) g.c = ['var(--a1)', 'var(--a3)'];
    return p;
  }

  /* ---------- Bloques que se repintan solos (salidas, sin controles) ---------- */
  const outs = {
    badge: g => `<div class="mp-badge" aria-hidden="true">${ic(icon(g.i))}</div>`,
    pills(g) {
      const d = g.by ? daysLeft(g.by, new Date()) : null, t = TIPOS[g.plan.tipo];
      return (d === null ? `<span class="pill c1">${ic('cal')}Sin fecha todavía</span>`
        : `<span class="pill ${d < 0 ? 'al' : 'gd'}">${ic('clock')}${countdown(d)}</span><span class="pill c1">${ic('cal')}${esc(g.by.toLocaleDateString('es-CO', {day: 'numeric', month: 'short', year: 'numeric'}))}</span>`)
        + `<span class="pill c2">${ic(t[0])}${t[1]}</span>`;
    },
    ring(g) {
      const c = cols(g), pct = g.open || !(g.t > 0) ? 0 : g.s / g.t, falta = Math.max(0, g.t - g.s), m = g.by ? monthsTo(g.by) : 1;
      const inner = g.open ? `${ic(icon(g.i))}` : `<div><b>${Math.round(Math.min(1, pct) * 100)}%</b><span>ahorrado</span></div>`;
      return `${ring(pct, 136, 11, c[0], c[1], 'mpRingG', inner)}
        <div class="mp-figwrap"><div class="mp-figs">
          <div class="mp-fig"><span>Llevan</span><b class="mono">${fmt(g.s)}</b></div>
          ${g.open ? '' : `<div class="mp-fig"><span>Objetivo</span><b class="mono">${fmt(g.t)}</b></div><div class="mp-fig"><span>${falta ? 'Faltan' : 'Estado'}</span><b class="mono">${falta ? fmt(falta) : 'Completa'}</b></div>`}
        </div><p class="mp-pace">${goalPace(g, m)}</p></div>`;
    },
    budget(g) {
      const t = totals(g.plan), c = cols(g);
      if (!t.total) return `<p class="mp-empty">Cuando anoten los costos (tiquetes, hospedaje, tours…) aquí verán cuánto cuesta el plan completo y cuánto les falta. Plata que no se anota, plata que se va de paseo sin avisar.</p>`;
      const falta = Math.max(0, t.total - g.s);
      return `<p class="mp-bud">El plan cuesta <b class="mono">${fmt(t.total)}</b>; llevan <b class="mono">${fmt(g.s)}</b>; ${falta ? `faltan <b class="mono">${fmt(falta)}</b>` : 'ya lo tienen cubierto'}.</p>
        <div class="bar mp-bbar"><i style="${barP(g.s / t.total)};background:linear-gradient(90deg,${c[0]},${c[1]})"></i></div>
        <p class="mp-note">${vsLine(g, t.total)}</p>`;
    },
    cn: g => g.plan.costos.length ? `${g.plan.costos.length} ${g.plan.costos.length === 1 ? 'concepto' : 'conceptos'}` : '',
    costsum(g) {
      const p = g.plan, t = totals(p);
      if (!p.costos.length) return `<p class="mp-empty">Aún no hay costos. Empiecen por lo grande y sigan con lo chiquito, que es lo que más se cuela.</p>`;
      const withA = p.costos.map((c, i) => ({c, i})).filter(x => x.c.a > 0);
      const top = withA.slice().sort((a, b) => b.c.a - a.c.a).slice(0, 5);
      return `<div class="mp-stats">
          <div class="mp-fig"><span>Ya pago</span><b class="mono">${fmt(t.paid)}</b></div>
          <div class="mp-fig"><span>Pendiente</span><b class="mono">${fmt(t.pend)}</b></div>
          <div class="mp-fig"><span>Total del plan</span><b class="mono">${fmt(t.total)}</b></div></div>
        ${withA.length ? `<div class="mp-comp" role="img" aria-label="Composición del plan: ${esc(top.map(x => `${x.c.n} ${Math.round(x.c.a / t.total * 100)} %`).join(', '))}">${withA.map(x => `<i style="flex:${x.c.a} 1 0;background:${SEG[x.i % SEG.length]}"></i>`).join('')}</div>
        <ul class="mp-leg">${top.map(x => `<li><i style="background:${SEG[x.i % SEG.length]}"></i><span>${esc(x.c.n)}</span><b class="mono">${Math.round(x.c.a / t.total * 100)}%</b></li>`).join('')}${withA.length > top.length ? `<li>y ${withA.length - top.length} más</li>` : ''}</ul>` : ''}`;
    },
    // v2.1 · ¿Vamos a llegar?: fecha estimada con el aporte actual vs. la fecha de la meta, y tres medidores
    ruta(g) {
      const c = cols(g), p = g.plan, t = totals(p), n = p.itin.length, hechos = p.itin.filter(x => x.done).length;
      const meter = (lbl, v, txt) => `<div class="mp-mt"><span>${lbl}</span><div class="mp-mt-bar"><i style="--v:${Math.max(0, Math.min(1, v || 0))};background:linear-gradient(90deg,${c[1]},${c[0]})"></i></div><b class="mono">${txt}</b></div>`;
      const meters = `<div class="mp-mts">${g.open ? '' : meter('Plata', g.s / g.t, Math.round(g.s / g.t * 100) + '%')}${meter('Plan', n ? hechos / n : 0, n ? `${hechos}/${n}` : '—')}${meter('Costos pagados', t.total ? t.paid / t.total : 0, t.total ? Math.round(t.paid / t.total * 100) + '%' : '—')}</div>`;
      if (g.open) return `<p class="mp-verd ok">${ic('trend')}<span>Meta abierta: cada abono suma sin presión de fecha.</span></p>${meters}`;
      const falta = Math.max(0, g.t - g.s);
      if (!falta) return `<p class="mp-verd ok">${ic('trophy')}<span><b>¡Meta completa!</b> Ya tienen la plata; ahora a disfrutar el plan.</span></p>${meters}`;
      const hoy = new Date(), mes = d => d.toLocaleDateString('es-CO', {month: 'long', year: 'numeric'});
      const meses = g.by ? Math.max(1, (g.by.getFullYear() - hoy.getFullYear()) * 12 + g.by.getMonth() - hoy.getMonth()) : 0, necesita = meses ? Math.ceil(falta / meses / 1000) * 1000 : 0;
      let verd;
      if (!(g.m > 0)) verd = `<p class="mp-verd gd">${ic('alert')}<span><b>Sin aporte mensual.</b> ${necesita ? `Para llegar en ${mes(g.by)} necesitan ${fmt(necesita)} al mes.` : 'Definan cuánto apartar cada mes y les digo cuándo llegan.'}</span></p>`;
      else {
        const k = Math.ceil(falta / g.m), eta = new Date(hoy.getFullYear(), hoy.getMonth() + k, 1);
        const tarde = g.by ? (eta.getFullYear() - g.by.getFullYear()) * 12 + eta.getMonth() - g.by.getMonth() : 0;
        verd = !g.by ? `<p class="mp-verd ok">${ic('cal')}<span>Con ${fmt(g.m)} al mes llegan en <b>${mes(eta)}</b> (${k} ${k === 1 ? 'mes' : 'meses'}).</span></p>`
          : tarde <= 0 ? `<p class="mp-verd ok">${ic('ok')}<span><b>Llegan a tiempo.</b> Con ${fmt(g.m)} al mes la completan en ${mes(eta)}${tarde < 0 ? `, ${-tarde} ${-tarde === 1 ? 'mes' : 'meses'} antes` : ''}.</span></p>`
          : `<p class="mp-verd al">${ic('alert')}<span><b>Llegarían ${tarde} ${tarde === 1 ? 'mes' : 'meses'} tarde</b> (${mes(eta)}). Para llegar en ${mes(g.by)} son ${fmt(necesita)} al mes.</span></p>`;
      }
      const usar = necesita && necesita !== g.m && (!(g.m > 0) || necesita > g.m) ? `<button class="btn acc mp-need" data-mp="useNeed" data-a="${necesita}">${ic('target')}Ahorrar ${fmt(necesita)} al mes${necesita >= 2000 ? ` · ${fmt(Math.ceil(necesita / 2000) * 1000)} por quincena` : ''}</button>` : '';
      return verd + meters + usar;
    },
    itinsum(g) {
      const p = g.plan, n = p.itin.length, d = p.itin.filter(x => x.done).length, c = cols(g);
      if (!n) return `<p class="mp-empty">Todavía no hay pasos. Un plan no es para cumplirlo al pie de la letra: es para llegar con ganas.</p>`;
      return `<div class="mp-prog"><span>${d} de ${n} ${n === 1 ? 'paso hecho' : 'pasos hechos'}</span><div class="bar"><i style="${barP(d / n)};background:linear-gradient(90deg,${c[0]},${c[1]})"></i></div></div>`;
    },
    fn: g => `${g.plan.fotos.length} de ${MAXF}`,
    notan: g => `${g.plan.nota.length} / 600`
  };

  /* ---------- Bloques con controles (solo se repintan tras un clic) ---------- */
  // v2.1: ícono según el concepto (tiquetes, hotel, tours, comida…)
  const COST_IC = [[/tiquete|vuelo|avion|aerol|pasaje aereo/, 'plane'], [/hotel|hospedaje|airbnb|hostal|alojamiento|noche/, 'bed'], [/tour|excursi|entrada|show|tango|museo|parque|actividad/, 'star'],
    [/comida|restaurante|cena|almuerzo|desayuno|vino|asado|mercado/, 'cup'], [/uber|taxi|transporte|bus|tren|carro|alquiler|gasolina|traslado/, 'car'], [/seguro|asistencia/, 'shield'],
    [/maleta|ropa|equipaje|compras/, 'bag'], [/regalo|detalle|recuerdo/, 'gift'], [/cambio|dolar|peso|efectivo|divisa/, 'coin'], [/pasaporte|visa|tramite|documento/, 'key'], [/instalaci|envio|domicilio/, 'home']];
  const costIc = n => { const t = String(n || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); return (COST_IC.find(([r]) => r.test(t)) || [0, 'wallet'])[1]; };
  const costRow = (c, fresh) => `<div class="mp-row mp-cost${c.ok ? ' ok' : ''}${fresh ? ' mp-new' : ''}">
      <button class="mp-chk" data-mp="cok" data-id="${esc(c.id)}" data-fk="c:${esc(c.id)}:ok" aria-pressed="${!!c.ok}" aria-label="Ya está pago: ${esc(c.n)}" title="Ya está pago"><span>${CHK}</span></button>
      <span class="mp-cic" aria-hidden="true">${ic(costIc(c.n))}</span>
      <input class="mp-in mp-ghost mp-cn" data-f="c.n" data-id="${esc(c.id)}" data-fk="c:${esc(c.id)}:n" value="${esc(c.n)}" maxlength="60" aria-label="Concepto" autocomplete="off">
      <input class="mp-in mp-ghost mp-ca mono" data-f="c.a" data-money data-id="${esc(c.id)}" data-fk="c:${esc(c.id)}:a" value="${fmt(c.a)}" inputmode="numeric" aria-label="Monto de ${esc(c.n)}" autocomplete="off">
      <button class="mp-x" data-mp="cdel" data-id="${esc(c.id)}" data-fk="c:${esc(c.id)}:x" aria-label="Borrar ${esc(c.n)}" title="Borrar">${ic('trash')}</button></div>`;
  const itRow = (x, i, n, fresh, next) => `<div class="mp-row mp-it${x.done ? ' done' : ''}${next ? ' next' : ''}${fresh ? ' mp-new' : ''}" style="--k:${i}">
      <button class="mp-chk" data-mp="idone" data-id="${esc(x.id)}" data-fk="i:${esc(x.id)}:ok" aria-pressed="${!!x.done}" aria-label="Hecho: ${esc(x.n)}" title="Hecho"><span>${CHK}</span></button>
      <input class="mp-in mp-ghost mp-itd" data-f="i.d" data-id="${esc(x.id)}" data-fk="i:${esc(x.id)}:d" value="${esc(x.d)}" maxlength="24" placeholder="Día o fecha" aria-label="Día o fecha" autocomplete="off">
      <input class="mp-in mp-ghost mp-itn" data-f="i.n" data-id="${esc(x.id)}" data-fk="i:${esc(x.id)}:n" value="${esc(x.n)}" maxlength="100" aria-label="Qué van a hacer" autocomplete="off">
      <div class="mp-ita">
        <button class="mp-x mp-up" data-mp="iup" data-id="${esc(x.id)}" data-fk="i:${esc(x.id)}:up" aria-label="Subir: ${esc(x.n)}" title="Subir"${i === 0 ? ' disabled' : ''}>${ic('arrow')}</button>
        <button class="mp-x mp-dn" data-mp="idn" data-id="${esc(x.id)}" data-fk="i:${esc(x.id)}:dn" aria-label="Bajar: ${esc(x.n)}" title="Bajar"${i === n - 1 ? ' disabled' : ''}>${ic('arrow')}</button>
        <button class="mp-x" data-mp="idel" data-id="${esc(x.id)}" data-fk="i:${esc(x.id)}:x" aria-label="Borrar: ${esc(x.n)}" title="Borrar">${ic('trash')}</button></div></div>`;
  let freshId = '';
  const ins = {
    cover(g) {
      const s = g.plan.cover ? src(g.plan.cover) : '';
      return `${s ? `<img src="${esc(s)}" alt="Portada de ${esc(g.n)}">` : (typeof Escenas === 'object' ? `<div class="mp-cover-esc" style="--g0:${g.c[0]};--g1:${g.c[1]}">${Escenas.escena(g, g.open || !g.t ? 0 : g.s / g.t, true)}</div>` : `<div class="mp-cover-ic" aria-hidden="true">${ic(icon(g.i))}</div>`)}
        <div class="mp-cover-in"><button class="mp-pillbtn mp-cover-btn" data-mp="changeCover" data-fk="cover">${ic('spark')}<span>${s ? 'Cambiar portada' : 'Poner portada'}</span></button></div>`;
    },
    custom(g) {
      const p = g.plan;
      return `<div class="mp-fld"><span>Tipo de meta</span><div class="mp-chips" role="group" aria-label="Tipo de meta">${TIPO_K.map(k => `<button class="chip" data-mp="tipo" data-k="${k}" data-fk="tipo:${k}" aria-pressed="${p.tipo === k}">${ic(TIPOS[k][0])}<span>${TIPOS[k][1]}</span></button>`).join('')}</div></div>
        <div class="mp-fld"><span>Ícono</span><div class="mp-icons" role="group" aria-label="Ícono de la meta">${ICONS.map(([k, n]) => `<button class="mp-ico" data-mp="icon" data-k="${k}" data-fk="ico:${k}" aria-pressed="${g.i === k}" aria-label="${n}" title="${n}">${ic(k)}</button>`).join('')}</div></div>
        <div class="mp-fld"><span>Color</span><div class="mp-icons" role="group" aria-label="Color de la meta">${PAIRS.map((c, k) => `<button class="mp-sw" data-mp="color" data-k="${k}" data-fk="col:${k}" style="--s0:${c[0]};--s1:${c[1]}" aria-pressed="${g.c[0] === c[0] && g.c[1] === c[1]}" aria-label="${c[2]}" title="${c[2]}"></button>`).join('')}</div></div>
        <div class="mp-fld"><label for="mpBy">Fecha objetivo</label><div class="mp-daterow"><input class="mp-in" id="mpBy" type="date" data-f="by" data-fk="by" value="${dateVal(g.by)}" min="2000-01-01" max="2100-12-31"><button class="btn ghost" data-mp="noDate" data-fk="nodate"${g.by ? '' : ' disabled'}>${ic('x')}Quitar fecha</button></div></div>`;
    },
    costos: g => g.plan.costos.map(c => costRow(c, c.id === freshId)).join(''),
    cosug(g) {
      const have = g.plan.costos.map(c => c.n.toLowerCase()), l = (SUG_C[g.plan.tipo] || []).filter(s => !have.includes(s.toLowerCase())).slice(0, 6);
      return l.length ? `<span class="mp-lbl">Ideas</span>${l.map((s, i) => `<button class="chip" data-mp="csug" data-n="${esc(s)}" data-fk="cs:${i}">${ic('plus')}<span>${esc(s)}</span></button>`).join('')}` : '';
    },
    itin: g => { const nx = g.plan.itin.findIndex(x => !x.done); return g.plan.itin.map((x, i, a) => itRow(x, i, a.length, x.id === freshId, i === nx)).join(''); },
    itsug(g) {
      const have = g.plan.itin.map(c => c.n.toLowerCase()), l = (SUG_I[g.plan.tipo] || []).filter(s => !have.includes(s.toLowerCase())).slice(0, 5);
      return l.length ? `<span class="mp-lbl">Ideas</span>${l.map((s, i) => `<button class="chip" data-mp="isug" data-n="${esc(s)}" data-fk="is:${i}">${ic('plus')}<span>${esc(s)}</span></button>`).join('')}` : '';
    },
    fotos(g) {
      const p = g.plan;
      if (!p.fotos.length) return `<button class="mp-drop" data-mp="addFotos" data-fk="drop">${ic('plus')}<b>Suban la primera foto</b><span>El lugar, el hotel, ese plato que quieren probar. Lo que se ve seguido, se alcanza más fácil.</span></button>`;
      return `<div class="mp-gal">${p.fotos.map((id, i) => { const s = src(id), cv = p.cover === id, e = esc(id);
        return `<figure class="mp-ph${cv ? ' cover' : ''}">
          <button class="mp-ph-b" data-mp="lb" data-id="${e}" data-fk="f:${e}:lb" aria-label="Ver la foto ${i + 1} en grande">${s ? `<img src="${esc(s)}" alt="Foto ${i + 1} del plan" loading="lazy" decoding="async">` : `<span class="mp-ph-miss">${ic('alert')}No se encontró</span>`}</button>
          <figcaption><button class="mp-ph-c" data-mp="cover" data-id="${e}" data-fk="f:${e}:cv" aria-pressed="${cv}" aria-label="${cv ? 'Es la portada. Tocar para quitarla' : `Usar la foto ${i + 1} de portada`}" title="${cv ? 'Es la portada' : 'Usar de portada'}">${ic('star')}<span>${cv ? 'Portada' : 'De portada'}</span></button>
          <button class="mp-x" data-mp="fdel" data-id="${e}" data-fk="f:${e}:x" aria-label="Borrar la foto ${i + 1}" title="Borrar">${ic('trash')}</button></figcaption></figure>`; }).join('')}</div>`;
    },
    danger(g) {
      return askDel ? `<div class="mp-confirm" role="group" aria-label="Confirmar eliminación"><p><b>¿Eliminar «${esc(g.n)}»?</b><span>Se va con su plan y sus fotos. Lo que ya abonaron sigue anotado en los movimientos del mes.</span></p>
          <div class="mp-acts"><button class="btn ghost" data-mp="noDel" data-fk="del:no">No, conservarla</button><button class="btn mp-danger" data-mp="yesDel" data-fk="del:yes">${ic('trash')}Sí, eliminar</button></div></div>`
        : `<button class="btn ghost mp-delbtn" data-mp="askDel" data-fk="del:ask">${ic('trash')}Eliminar meta</button><p class="mp-note">Soltar una meta a tiempo también es avanzar.</p>`;
    }
  };

  /* ---------- Pintado ---------- */
  function sync(...keys) {
    const g = goal(); if (!g || mode !== 'plan') return;
    qa('[data-mp-out]').forEach(el => { const k = el.dataset.mpOut; if (outs[k] && (!keys.length || keys.includes(k))) el.innerHTML = outs[k](g); });
    const t = totals(g.plan), use = q('[data-mp="useTotal"]'), ab = q('[data-mp-ab]'), nd = q('[data-mp="noDate"]');
    if (use) { const hide = !(t.total > 0 && (g.open || t.total !== g.t)); if (hide && document.activeElement === use) { const ti = q('[data-f="t"]'); ti && ti.focus({preventScroll: true}); } use.hidden = hide; }
    if (ab) { ab.hidden = !(g.m > 0 && g.m !== 100000); ab.dataset.a = g.m; const sp = ab.querySelector('span'); if (sp) sp.textContent = fmt(g.m); }
    if (nd) nd.disabled = !g.by;
  }
  const focusFk = fk => { if (!fk) return false; const el = qa('[data-fk]').find(x => x.dataset.fk === fk && !x.disabled); if (el) { el.focus({preventScroll: true}); return true; } return false; };
  function refresh(...keys) {
    const g = goal(); if (!g || mode !== 'plan') return;
    const a = document.activeElement, fk = a && ov.contains(a) && a.dataset ? a.dataset.fk : '';
    qa('[data-mp-in]').forEach(el => { const k = el.dataset.mpIn; if (ins[k] && keys.includes(k)) el.innerHTML = ins[k](g); });
    freshId = '';
    sync();
    if (fk && !ov.contains(document.activeElement)) focusFk(fk);
  }
  const fit = () => { const t = ov && q('.mp-title'); if (t) { t.style.height = 'auto'; t.style.height = (t.scrollHeight + 4) + 'px'; } };
  function setVars(g) { const c = cols(g); ov.style.setProperty('--c0', c[0]); ov.style.setProperty('--c1', c[1]); }
  function paint() {
    const g = goal(); if (!g) return;
    const p = ensurePlan(g), viaje = p.tipo === 'viaje';
    setVars(g); navCur = '';
    q('#mpScroll').innerHTML = `
      <div class="mp-bar"><button class="mp-pillbtn mp-back" data-mp="close" data-fk="back" aria-label="Volver a las metas">${ic('arrow', 'mp-flip')}<span>Volver</span></button>
        <nav class="mp-nav" aria-label="Secciones del plan">${SECS.map(([k, n]) => `<button data-mp="go" data-k="${k}">${n}</button>`).join('')}</nav></div>
      <header class="mp-hero">
        <div class="mp-cover" data-mp-in="cover">${ins.cover(g)}</div>
        <div class="mp-id">
          <div data-mp-out="badge"></div>
          <h2 class="sr" id="mpTitle">Planeador de la meta ${esc(g.n)}</h2>
          <textarea class="mp-title" rows="1" data-f="n" maxlength="60" aria-label="Nombre de la meta" spellcheck="false">${esc(g.n)}</textarea>
          <input class="mp-lugar" data-f="lugar" maxlength="60" value="${esc(p.lugar)}" placeholder="${LUGAR_PH[p.tipo]}" aria-label="Lugar" autocomplete="off">
          <div class="mp-pills" data-mp-out="pills"></div>
        </div>
      </header>
      <main class="mp-main">
        <section class="mp-sec" id="mp-s-resumen" tabindex="-1" aria-label="Resumen">
          <div class="glass mp-card" style="--i:0">
            <div class="mp-h"><h3>La plata</h3></div>
            <div class="mp-money" data-mp-out="ring"></div>
            <div class="mp-grid2">
              <label class="mp-fld"><span>Objetivo</span><input class="mp-in mono" data-f="t" data-money inputmode="numeric" value="${g.open ? '' : moneyVal(g.t)}" placeholder="Sin monto fijo" autocomplete="off"></label>
              <label class="mp-fld"><span>Aporte mensual</span><input class="mp-in mono" data-f="m" data-money inputmode="numeric" value="${moneyVal(g.m)}" placeholder="$0" autocomplete="off"></label>
            </div>
            <label class="mp-fld mp-fix"><span>Ya ahorrado <small>Corríjanlo si no cuadra con lo que hay en el banco. No cuenta como abono.</small></span><input class="mp-in mono" data-f="s" data-money inputmode="numeric" value="${fmt(g.s)}" autocomplete="off"></label>
            <div class="mp-fld mp-abono"><span>Abonar</span>
              <div class="mp-acts"><button class="btn ghost" data-act="abono" data-id="${esc(g.id)}" data-a="100000">${ic('plus')}$100.000</button><button class="btn acc" data-mp-ab data-act="abono" data-id="${esc(g.id)}" data-a="${int(g.m)}" hidden>${ic('plus')}<span></span></button></div>
              <form class="mp-inline" data-form="abono" novalidate><input class="mp-in mono" name="a" data-money inputmode="numeric" placeholder="Otro monto" aria-label="Otro monto para abonar" autocomplete="off"><button class="btn pri" type="submit">${ic('plus')}Abonar</button></form>
            </div>
          </div>
          <div class="glass mp-card mp-ruta" style="--i:1">
            <div class="mp-h"><h3>¿Vamos a llegar?</h3></div>
            <div data-mp-out="ruta"></div>
          </div>
          <div class="glass mp-card" style="--i:1">
            <div class="mp-h"><h3>Presupuesto del plan</h3></div>
            <div data-mp-out="budget"></div>
            <button class="btn acc mp-use" data-mp="useTotal" hidden>${ic('target')}Usar el total del plan como meta</button>
          </div>
          <div class="glass mp-card" style="--i:2">
            <div class="mp-h"><h3>Personalizar</h3></div>
            <div class="mp-custom" data-mp-in="custom">${ins.custom(g)}</div>
          </div>
        </section>
        <section class="mp-sec" id="mp-s-costos" tabindex="-1" aria-label="Costos">
          <div class="glass mp-card" style="--i:3">
            <div class="mp-h"><h3>Costos</h3><span class="mp-hs" data-mp-out="cn"></span></div>
            <div data-mp-out="costsum"></div>
            <div class="mp-list" data-mp-in="costos">${ins.costos(g)}</div>
            <form class="mp-add mp-add-c" data-form="costo" novalidate>
              <input class="mp-in" name="n" maxlength="60" placeholder="Concepto" aria-label="Concepto nuevo" autocomplete="off">
              <input class="mp-in mono" name="a" data-money inputmode="numeric" placeholder="$0" aria-label="Monto del concepto nuevo" autocomplete="off">
              <button class="btn pri" type="submit">${ic('plus')}Agregar</button></form>
            <div class="mp-sug" data-mp-in="cosug">${ins.cosug(g)}</div>
          </div>
        </section>
        <section class="mp-sec" id="mp-s-plan" tabindex="-1" aria-label="Plan">
          <div class="glass mp-card" style="--i:4">
            <div class="mp-h"><h3 id="mpPlanH">${viaje ? 'Itinerario' : 'El plan, paso a paso'}</h3></div>
            <div data-mp-out="itinsum"></div>
            <div class="mp-list mp-tl" data-mp-in="itin">${ins.itin(g)}</div>
            <form class="mp-add mp-add-i" data-form="itin" novalidate>
              <input class="mp-in" name="d" maxlength="24" placeholder="Día 1 o 12 feb" aria-label="Día o fecha del paso nuevo" autocomplete="off">
              <input class="mp-in" name="n" maxlength="100" placeholder="¿Qué van a hacer?" aria-label="Paso nuevo" autocomplete="off">
              <button class="btn pri" type="submit">${ic('plus')}Agregar</button></form>
            <div class="mp-sug" data-mp-in="itsug">${ins.itsug(g)}</div>
          </div>
        </section>
        <section class="mp-sec" id="mp-s-fotos" tabindex="-1" aria-label="Fotos">
          <div class="glass mp-card" style="--i:5">
            <div class="mp-h"><h3>Fotos e inspiración</h3><span class="mp-hs" data-mp-out="fn"></span></div>
            <div data-mp-in="fotos">${ins.fotos(g)}</div>
            <div class="mp-acts mp-fotoadd"><button class="btn pri" data-mp="addFotos" data-fk="addf">${ic('plus')}Agregar fotos</button></div>
          </div>
        </section>
        <section class="mp-sec" id="mp-s-notas" tabindex="-1" aria-label="Notas">
          <div class="glass mp-card" style="--i:6">
            <div class="mp-h"><h3><label for="mpNota">Notas</label></h3><span class="mp-hs mono" data-mp-out="notan"></span></div>
            <textarea class="mp-in mp-nota" id="mpNota" data-f="nota" maxlength="600" placeholder="Lo que se les ocurra: el restaurante que les recomendaron, la talla, lo que no se puede quedar por fuera de la maleta.">${esc(p.nota)}</textarea>
          </div>
          <div class="mp-zone" data-mp-in="danger">${ins.danger(g)}</div>
        </section>
      </main>`;
    sync(); fit(); spy();
  }
  function paintWizard() {
    ov.style.removeProperty('--c0'); ov.style.removeProperty('--c1');
    q('#mpScroll').innerHTML = `
      <div class="mp-bar"><button class="mp-pillbtn mp-back" data-mp="close" aria-label="Volver a las metas">${ic('arrow', 'mp-flip')}<span>Volver</span></button></div>
      <form class="glass mp-wz" data-form="wz" novalidate>
        <div class="mp-badge" aria-hidden="true">${ic('spark')}</div>
        <h2 id="mpTitle">¿Qué van a lograr juntos?</h2>
        <p class="mp-note">Pónganle nombre al sueño. La plata y el plan se organizan en el siguiente paso.</p>
        <label class="mp-fld"><span>Nombre de la meta</span><input class="mp-in" name="n" maxlength="60" placeholder="Aniversario en Argentina" autocomplete="off"></label>
        <div class="mp-fld"><span>¿Qué es?</span><div class="mp-chips" role="group" aria-label="Tipo de meta" data-wz-tipo>${wzChips()}</div></div>
        <div class="mp-grid2">
          <label class="mp-fld"><span>¿Cuánto cuesta? (opcional)</span><input class="mp-in mono" name="t" data-money inputmode="numeric" placeholder="$0" autocomplete="off"></label>
          <label class="mp-fld"><span>¿Para cuándo? (opcional)</span><input class="mp-in" name="by" type="date" min="2000-01-01" max="2100-12-31"></label>
        </div>
        <p class="mp-err" id="mpWzErr" role="alert"></p>
        <button class="btn acc mp-big" type="submit">Crear y empezar a planear${ic('arrow')}</button>
        <p class="mp-note">¿No saben el monto todavía? Tranquilos: al sumar los costos del plan, la meta se arma sola. Coral y Oreo ya están moviendo la cola.</p>
      </form>`;
  }
  const wzChips = () => TIPO_K.map(k => `<button type="button" class="chip" data-mp="wzTipo" data-k="${k}" aria-pressed="${wz.tipo === k}">${ic(TIPOS[k][0])}<span>${TIPOS[k][1]}</span></button>`).join('');

  /* ---------- Visor de fotos ---------- */
  function paintLb() {
    const g = goal(), lb = q('#mpLb'); if (!g) return;
    const p = g.plan, i = p.fotos.indexOf(lbId), n = p.fotos.length;
    if (i < 0) { closeLb(); return; }
    const s = src(lbId), cv = p.cover === lbId;
    lb.innerHTML = `<div class="mp-lb-top"><span class="mono" aria-live="polite">Foto ${i + 1} de ${n}</span><button class="mp-pillbtn" data-mp="lbClose" aria-label="Cerrar la foto">${ic('x')}<span>Cerrar</span></button></div>
      <div class="mp-lb-img">${s ? `<img src="${esc(s)}" alt="Foto ${i + 1} del plan de ${esc(g.n)}">` : `<span class="mp-ph-miss">${ic('alert')}No se encontró esta foto</span>`}</div>
      <div class="mp-lb-bot"><button class="mp-x mp-nv" data-mp="lbPrev" aria-label="Foto anterior"${n < 2 ? ' disabled' : ''}>${ic('arrow', 'mp-flip')}</button>
        <button class="btn ${cv ? 'pri' : 'ghost'}" data-mp="lbCover" aria-pressed="${cv}">${ic('star')}${cv ? 'Es la portada' : 'Usar de portada'}</button>
        <button class="mp-x mp-nv" data-mp="lbNext" aria-label="Foto siguiente"${n < 2 ? ' disabled' : ''}>${ic('arrow')}</button></div>`;
    lb.hidden = false;
  }
  function closeLb() { const id = lbId; lbId = ''; const lb = q('#mpLb'); lb.hidden = true; lb.innerHTML = ''; if (!focusFk(`f:${id}:lb`)) focusFk('addf'); }
  function lbStep(d) { const g = goal(); if (!g) return; const f = g.plan.fotos, i = f.indexOf(lbId); if (i < 0 || f.length < 2) return; lbId = f[(i + d + f.length) % f.length]; paintLb(); const b = q(d < 0 ? '[data-mp="lbPrev"]' : '[data-mp="lbNext"]'); b && b.focus(); }

  /* ---------- Celebración ---------- */
  function celebrate(kind) {
    try { confetti(innerWidth / 2, innerHeight / 3, 120); } catch (e) {}
    if (kind === 'plan') island({icon: 'star', color: 'gold', title: 'Plan completo', sub: 'Cada casilla marcada fue un paso que dieron juntos', dur: 4600});
    else if (kind === 'meta') island({icon: 'star', color: 'gold', title: 'Meta completa', sub: 'Lo dijeron, lo anotaron y lo lograron', dur: 4600});
    try { if (typeof cheer === 'function') cheer('logro'); } catch (e) {}
  }
  function afterAbono(was) { const g = goal(); if (!g || mode !== 'plan') return; sync(); if (!was && isFull(g)) celebrate('abono'); }

  /* ---------- Acciones (clic) ---------- */
  const cOf = id => { const g = goal(); return g ? g.plan.costos.find(x => x.id === id) : null; };
  const iOf = id => { const g = goal(); return g ? g.plan.itin.find(x => x.id === id) : null; };
  function addCost(n, a) {
    const g = goal(), p = g.plan;
    if (p.costos.length >= MAXC) { island({icon: 'info', color: 'gold', title: `Ya son ${MAXC} conceptos`, sub: 'Junten algunos para que el plan siga claro', dur: 3600}); return null; }
    const c = {id: uid('c'), n, a, ok: false}; p.costos.push(c); save(); freshId = c.id; refresh('costos', 'cosug'); return c;
  }
  function addItin(n, d) {
    const g = goal(), p = g.plan;
    if (p.itin.length >= MAXI) { island({icon: 'info', color: 'gold', title: `Ya son ${MAXI} pasos`, sub: 'Un plan corto se cumple más fácil', dur: 3600}); return null; }
    const x = {id: uid('i'), n, d: d || (p.tipo === 'viaje' ? nextDay(p) : ''), done: false}; p.itin.push(x); save(); freshId = x.id; refresh('itin', 'itsug'); return x;
  }
  function removeFrom(list, id, key, what, focusNext) {
    const g = goal(), arr = g.plan[list], k = arr.findIndex(x => x.id === id); if (k < 0) return;
    const it = arr.splice(k, 1)[0], nx = arr[k] || arr[k - 1]; save(); refresh(key, key === 'costos' ? 'cosug' : 'itsug');
    if (!(nx && focusFk(`${list === 'costos' ? 'c' : 'i'}:${nx.id}:x`))) { const f = q(focusNext); f && f.focus({preventScroll: true}); }
    island({icon: 'trash', color: 'mu', title: `${what} borrado`, sub: it.n.length > 40 ? it.n.slice(0, 40) + '…' : it.n, action: 'Deshacer', dur: 5200, onAction: () => {
      if (!S.goals.includes(g) || arr.includes(it)) return;
      arr.splice(Math.min(k, arr.length), 0, it); save(); if (live(g)) refresh(key, key === 'costos' ? 'cosug' : 'itsug');
    }});
  }
  const acts = {
    close: () => close(),
    go(b) {
      const sc = q('#mpScroll'), sec = q('#mp-s-' + b.dataset.k); if (!sec) return;
      sc.scrollTo({top: Math.max(0, sc.scrollTop + sec.getBoundingClientRect().top - sc.getBoundingClientRect().top - 78), behavior: RM ? 'auto' : 'smooth'});
    },
    changeCover() {
      const g = goal();
      if (g.plan.fotos.length >= MAXF) { island({icon: 'info', color: 'gold', title: `El tablero ya tiene ${MAXF} fotos`, sub: 'Elijan la portada entre las que ya subieron', dur: 4200}); acts.go({dataset: {k: 'fotos'}}); return; }
      pick('cover');
    },
    addFotos() {
      if (goal().plan.fotos.length >= MAXF) { island({icon: 'info', color: 'gold', title: `El tablero ya tiene ${MAXF} fotos`, sub: 'Borren una para subir otra. Pocas y bien escogidas.', dur: 4200}); return; }
      pick('gal');
    },
    tipo(b) {
      const g = goal(), k = b.dataset.k; if (!TIPOS[k] || g.plan.tipo === k) return;
      g.plan.tipo = k; save(); refresh('custom', 'cosug', 'itsug');
      const l = q('.mp-lugar'), h = q('#mpPlanH'); if (l) l.placeholder = LUGAR_PH[k]; if (h) h.textContent = k === 'viaje' ? 'Itinerario' : 'El plan, paso a paso';
    },
    icon(b) { const g = goal(), k = b.dataset.k; if (!ICONS.some(x => x[0] === k)) return; g.i = k; save(); refresh('custom', 'cover'); },
    color(b) { const g = goal(), c = PAIRS[+b.dataset.k]; if (!c) return; g.c = [c[0], c[1]]; save(); setVars(g); refresh('custom', 'cover'); },
    noDate() { const g = goal(); g.by = null; save(); const i = q('#mpBy'); if (i) { i.value = ''; i.focus({preventScroll: true}); } sync(); },
    useNeed(b) {
      const g = goal(), v = int(b.dataset.a); if (!g || !(v > 0)) return;
      const prev = g.m, mi = q('[data-f="m"]'); g.m = v; save(); if (mi) mi.value = fmt(v); sync();
      island({icon: 'target', color: 'ok', title: `Aporte de ${fmt(v)} al mes`, sub: 'Así llegan a tiempo', action: 'Deshacer', dur: 5200, onAction: () => { if (!S.goals.includes(g)) return; g.m = prev; save(); if (live(g)) { const m2 = q('[data-f="m"]'); if (m2) m2.value = prev ? fmt(prev) : ''; sync(); } }});
    },
    useTotal() {
      const g = goal(), t = totals(g.plan).total; if (!(t > 0)) return;
      const prev = {open: g.open, t: g.t}, was = isFull(g), ti = q('[data-f="t"]');
      g.open = false; g.t = t; save(); if (ti) ti.value = fmt(t); sync();
      if (!was && isFull(g)) celebrate('meta');
      else island({icon: 'target', color: 'a1', title: `La meta ahora es ${fmt(t)}`, sub: 'Igualita al total del plan', action: 'Deshacer', dur: 5200, onAction: () => {
        if (!S.goals.includes(g)) return;
        g.open = prev.open; g.t = prev.t; save();
        if (live(g)) { const i2 = q('[data-f="t"]'); if (i2) i2.value = g.open ? '' : moneyVal(g.t); sync(); }
      }});
    },
    cok(b) {
      const c = cOf(b.dataset.id); if (!c) return;
      c.ok = !c.ok; save(); b.setAttribute('aria-pressed', c.ok); b.closest('.mp-row').classList.toggle('ok', c.ok); sync('costsum', 'ruta');
    },
    cdel: b => removeFrom('costos', b.dataset.id, 'costos', 'Concepto', '[data-form="costo"] [name="n"]'),
    csug(b) { const c = addCost(oneLine(b.dataset.n, 60), 0); if (c) focusFk(`c:${c.id}:a`); },
    idone(b) {
      const g = goal(), x = iOf(b.dataset.id); if (!x) return;
      const was = allDone(g.plan);
      x.done = !x.done; save(); b.setAttribute('aria-pressed', x.done); b.closest('.mp-row').classList.toggle('done', x.done); { let f = false; qa('.mp-it').forEach(r => { const nx = !f && !r.classList.contains('done'); if (nx) f = true; r.classList.toggle('next', nx); }); } sync('itinsum', 'ruta');
      if (!was && allDone(g.plan)) celebrate('plan');
    },
    iup: b => move(b, -1), idn: b => move(b, 1),
    idel: b => removeFrom('itin', b.dataset.id, 'itin', 'Paso', '[data-form="itin"] [name="n"]'),
    isug(b) { const x = addItin(oneLine(b.dataset.n, 100), ''); if (x) focusFk(`i:${x.id}:n`); },
    lb(b) { if (!goal().plan.fotos.includes(b.dataset.id)) return; lbId = b.dataset.id; paintLb(); const c = q('[data-mp="lbClose"]'); c && c.focus(); },
    lbClose: () => closeLb(), lbPrev: () => lbStep(-1), lbNext: () => lbStep(1),
    lbCover() { setCover(lbId, true); paintLb(); const c = q('[data-mp="lbCover"]'); c && c.focus(); },
    cover: b => setCover(b.dataset.id, false),
    fdel(b) {
      const g = goal(), p = g.plan, id = b.dataset.id, k = p.fotos.indexOf(id); if (k < 0) return;
      const data = fotos()[id], wasCover = p.cover === id;
      p.fotos.splice(k, 1); if (wasCover) p.cover = p.fotos[0] || '';
      delete fotos()[id]; fotosSave(); save(); refresh('cover', 'fotos');
      nubeBorrar([id], x => S.goals.includes(g) && p.fotos.includes(x));
      const nx = p.fotos[k] || p.fotos[k - 1]; if (!(nx && focusFk(`f:${nx}:lb`))) focusFk('drop') || focusFk('addf');
      island({icon: 'trash', color: 'mu', title: 'Foto borrada', sub: wasCover && p.cover ? 'La portada pasó a la siguiente' : 'Ya no ocupa espacio', action: data ? 'Deshacer' : undefined, dur: 5200, onAction: () => {
        if (!S.goals.includes(g) || p.fotos.includes(id) || p.fotos.length >= MAXF) return;
        fotos()[id] = data;
        if (!fotosSave()) { delete fotos()[id]; return {icon: 'alert', color: 'alert', title: 'No cupo de vuelta', sub: 'El navegador se quedó sin espacio', dur: 3200}; }
        p.fotos.splice(Math.min(k, p.fotos.length), 0, id); if (wasCover) p.cover = id; save(); if (live(g)) refresh('cover', 'fotos');
      }});
    },
    askDel() { askDel = true; refresh('danger'); focusFk('del:no'); },
    noDel() { askDel = false; refresh('danger'); focusFk('del:ask'); },
    yesDel() {
      const g = goal(), idx = S.goals.indexOf(g); if (idx < 0) return;
      const store = fotos(), kept = {};
      g.plan.fotos.forEach(id => { if (id in store) { kept[id] = store[id]; delete store[id]; } });
      fotosSave(); S.goals.splice(idx, 1); save(); close();
      nubeBorrar(Object.keys(kept), () => S.goals.includes(g));
      island({icon: 'trash', color: 'alert', title: `Meta eliminada: ${g.n.length > 26 ? g.n.slice(0, 26) + '…' : g.n}`, sub: 'Si fue sin querer, todavía la pueden recuperar', action: 'Deshacer', dur: 7000, onAction: () => {
        if (S.goals.includes(g)) return;
        Object.assign(fotos(), kept);
        const ok = fotosSave();
        if (!ok) { Object.keys(kept).forEach(id => delete fotos()[id]); g.plan.fotos = g.plan.fotos.filter(id => !(id in kept)); g.plan.cover = ''; }
        S.goals.splice(Math.min(idx, S.goals.length), 0, g); save(); try { render(false); } catch (e) {}
        return {icon: 'undo', color: 'mu', title: 'Meta recuperada', sub: ok ? 'Con su plan y sus fotos' : 'Volvió el plan; las fotos ya no cupieron', dur: 2400};
      }});
    },
    wzTipo(b) { if (!wz || !TIPOS[b.dataset.k]) return; wz.tipo = b.dataset.k; qa('[data-mp="wzTipo"]').forEach(x => x.setAttribute('aria-pressed', x === b)); }
  };
  function move(b, d) {
    const g = goal(), a = g.plan.itin, k = a.findIndex(x => x.id === b.dataset.id), j = k + d; if (k < 0 || j < 0 || j >= a.length) return;
    const it = a.splice(k, 1)[0]; a.splice(j, 0, it); save(); refresh('itin');
    if (!focusFk(`i:${it.id}:${d < 0 ? 'up' : 'dn'}`)) focusFk(`i:${it.id}:${d < 0 ? 'dn' : 'up'}`);
  }
  function setCover(id, keep) {
    const g = goal(), p = g.plan; if (!p.fotos.includes(id)) return;
    p.cover = p.cover === id && !keep ? '' : id; save(); refresh('cover', 'fotos');
  }
  function pick(m) { const f = q('#mpFile'); if (busy) return; fileMode = m; f.multiple = m !== 'cover'; f.value = ''; f.click(); }

  /* ---------- Campos (change / input / submit) ---------- */
  const warn = (title, sub) => island({icon: 'alert', color: 'alert', title, sub: sub || '', dur: 3200});
  function readMoney(el) { const raw = el.value.trim(); if (!raw) return 0; const r = parseMoney(raw); if (r.err) { warn('Ese monto no sirve', r.err); return null; } return r.v; }
  function onChange(e) {
    const el = e.target.closest ? e.target.closest('[data-f]') : null; if (!el || mode !== 'plan') return;
    const g = goal(); if (!g) return;
    const p = g.plan, f = el.dataset.f, id = el.dataset.id;
    if (f === 'n') {
      const v = cleanName(el.value); if (!v) { el.value = g.n; fit(); return; }
      g.n = v; el.value = v; fit(); const h = q('#mpTitle'); if (h) h.textContent = 'Planeador de la meta ' + v;
    } else if (f === 'lugar') { p.lugar = oneLine(el.value, 60); el.value = p.lugar; }
    else if (f === 't') {
      const v = readMoney(el), was = isFull(g); if (v === null) { el.value = g.open ? '' : moneyVal(g.t); return; }
      if (v > 0) { g.open = false; g.t = v; } else { g.open = true; g.t = 0; }
      el.value = moneyVal(v); save(); sync(); if (!was && isFull(g)) celebrate('meta'); return;
    } else if (f === 's') {
      // v1.7: corregir lo ahorrado (no crea movimiento ni puntos); con Deshacer
      const v = readMoney(el); if (v === null || v === g.s) { el.value = fmt(g.s); return; }
      const prev = g.s, was = isFull(g); g.s = v; el.value = fmt(v); save(); sync();
      island({icon: 'edit', color: 'a1', title: `Ahorrado corregido: ${fmt(v)}`, sub: `Antes ${fmt(prev)} · no cuenta como abono ni gasto`, action: 'Deshacer', dur: 6000, onAction: () => {
        if (!S.goals.includes(g)) return; g.s = prev; save();
        if (live(g)) { sync(); const i = q('[data-f="s"]'); if (i) i.value = fmt(prev); }
        return {icon: 'undo', color: 'mu', title: 'Volvió a ' + fmt(prev), dur: 1800};
      }});
      if (!was && isFull(g)) celebrate('meta');
      return;
    } else if (f === 'm') {
      const v = readMoney(el); if (v === null) { el.value = moneyVal(g.m); return; }
      g.m = v; el.value = moneyVal(v);
    } else if (f === 'by') {
      if (!el.value) g.by = null; else { const d = parseDate(el.value); if (!d) { el.value = dateVal(g.by); warn('Esa fecha no sirve', 'Elijan una entre 2000 y 2100'); return; } g.by = d; }
    } else if (f === 'nota') { clearTimeout(noteT); p.nota = el.value.slice(0, 600); }
    else if (f === 'c.n' || f === 'c.a') {
      const c = p.costos.find(x => x.id === id); if (!c) return;
      if (f === 'c.n') { const v = oneLine(el.value, 60); if (!v) { el.value = c.n; return; } c.n = v; el.value = v; }
      else { const v = readMoney(el); if (v === null) { el.value = fmt(c.a); return; } c.a = v; el.value = fmt(v); }
    } else if (f === 'i.d' || f === 'i.n') {
      const x = p.itin.find(y => y.id === id); if (!x) return;
      if (f === 'i.d') { x.d = oneLine(el.value, 24); el.value = x.d; }
      else { const v = oneLine(el.value, 100); if (!v) { el.value = x.n; return; } x.n = v; el.value = v; }
    } else return;
    save(); sync();
  }
  function onInput(e) {
    const el = e.target; if (!el || !el.matches) return;
    if (el.matches('[data-money]')) { const d = el.value.replace(/\D/g, '').replace(/^0+(?=\d)/, '').slice(0, 11); el.value = d ? fmt(+d) : ''; el.removeAttribute('aria-invalid'); }
    else if (el.matches('.mp-title')) { if (/[\r\n]/.test(el.value)) el.value = el.value.replace(/[\r\n]+/g, ' '); fit(); }
    else if (el.matches('[data-f="nota"]')) {
      const g = goal(); if (!g) return;
      g.plan.nota = el.value.slice(0, 600); sync('notan'); clearTimeout(noteT); noteT = setTimeout(save, 500);
    } else if (el.name === 'n') el.removeAttribute('aria-invalid');
  }
  function onSubmit(e) {
    const form = e.target.closest ? e.target.closest('[data-form]') : null; if (!form) return;
    e.preventDefault();
    const k = form.dataset.form, el = form.elements;
    if (k === 'wz') return submitWz(form);
    const g = goal(); if (!g || mode !== 'plan') return;
    if (k === 'abono') {
      const r = parseMoney(el.a.value);
      if (r.err || !(r.v > 0)) { el.a.setAttribute('aria-invalid', 'true'); el.a.focus(); warn('¿Cuánto van a abonar?', r.err || 'Escriban un monto mayor a cero'); return; }
      const was = isFull(g); el.a.value = '';
      doAct('abono', g.id, form.querySelector('button'), r.v); afterAbono(was);
    } else if (k === 'costo') {
      const n = oneLine(el.n.value, 60); if (!n) { el.n.setAttribute('aria-invalid', 'true'); el.n.focus(); return; }
      let a = 0; if (el.a.value.trim()) { const r = parseMoney(el.a.value); if (r.err) { el.a.setAttribute('aria-invalid', 'true'); el.a.focus(); warn('Ese monto no sirve', r.err); return; } a = r.v; }
      if (addCost(n, a)) { form.reset(); el.n.focus({preventScroll: true}); }
    } else if (k === 'itin') {
      const n = oneLine(el.n.value, 100); if (!n) { el.n.setAttribute('aria-invalid', 'true'); el.n.focus(); return; }
      if (addItin(n, oneLine(el.d.value, 24))) { form.reset(); el.n.focus({preventScroll: true}); }
    }
  }
  function submitWz(form) {
    const el = form.elements, err = q('#mpWzErr'), n = cleanName(el.n.value);
    const fail = (inp, msg) => { err.textContent = msg; inp.setAttribute('aria-invalid', 'true'); inp.focus(); };
    if (n.length < 2) return fail(el.n, 'Pónganle un nombre a la meta (mínimo 2 letras).');
    let t = 0; if (el.t.value.trim()) { const r = parseMoney(el.t.value); if (r.err) return fail(el.t, r.err + '.'); t = r.v; }
    let by = null; if (el.by.value) { by = parseDate(el.by.value); if (!by) return fail(el.by, 'Esa fecha no sirve; elijan otra.'); }
    const tipo = TIPOS[wz.tipo] ? wz.tipo : 'otro', c = PAIRS[TIPO_PAIR[tipo]];
    const g = {id: uid('m'), n, i: TIPOS[tipo][0], c: [c[0], c[1]], open: !t, t, s: 0, m: 0, by, plan: newPlan(tipo)};
    S.goals.push(g); save();
    gid = g.id; mode = 'plan'; wz = null; askDel = false;
    paint(); q('#mpScroll').scrollTop = 0; restart();
    const l = q('.mp-lugar'); l && l.focus({preventScroll: true});
    island({icon: 'target', color: 'a2', title: 'Meta creada', sub: 'Ahora sí: a planearla con calma y con gusto', dur: 3600});
  }

  /* ---------- Teclado, foco y scroll ---------- */
  const vis = el => el.getClientRects().length > 0;
  function onKey(e) {
    if (!ov || ov.hidden || closing) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      if (lbId) closeLb(); else if (askDel) acts.noDel(); else close();
      return;
    }
    if (lbId && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) { e.preventDefault(); lbStep(e.key === 'ArrowLeft' ? -1 : 1); return; }
    if (e.key === 'Enter' && e.target.matches && e.target.matches('.mp-title')) { e.preventDefault(); e.target.blur(); const l = q('.mp-lugar'); l && l.focus(); return; }
    if (e.key !== 'Tab') return;
    const root = lbId ? q('#mpLb') : ov, list = Array.from(root.querySelectorAll(FOCUS)).filter(vis);
    if (!lbId) { const ib = document.querySelector('#isl.show .isl-btn'); if (ib) list.push(ib); }
    if (!list.length) { e.preventDefault(); ov.focus(); return; }
    const a = document.activeElement, i = list.indexOf(a), first = list[0], last = list[list.length - 1];
    if (i < 0) { e.preventDefault(); (e.shiftKey ? last : first).focus(); }
    else if (e.shiftKey && a === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && a === last) { e.preventDefault(); first.focus(); }
  }
  function spy() {
    spyRaf = 0; if (!ov || ov.hidden || mode !== 'plan') return;
    const sc = q('#mpScroll'), top = sc.getBoundingClientRect().top + 110; let cur = SECS[0][0];
    SECS.forEach(([k]) => { const s = q('#mp-s-' + k); if (s && s.getBoundingClientRect().top <= top) cur = k; });
    if (sc.scrollTop > 0 && sc.scrollTop + sc.clientHeight >= sc.scrollHeight - 4) cur = SECS[SECS.length - 1][0];
    if (cur === navCur) return; navCur = cur;
    const nav = q('.mp-nav'); if (!nav) return;
    nav.querySelectorAll('button').forEach(b => { if (b.dataset.k === cur) { b.setAttribute('aria-current', 'true'); nav.scrollTo({left: Math.max(0, b.offsetLeft - nav.clientWidth / 2 + b.offsetWidth / 2), behavior: RM ? 'auto' : 'smooth'}); } else b.removeAttribute('aria-current'); });
  }
  function onClick(e) {
    if (closing) return;
    const ab = e.target.closest('[data-act="abono"]');
    if (ab) { if (mode === 'plan') { const g = goal(), was = isFull(g); setTimeout(() => afterAbono(was), 0); } return; }
    const b = e.target.closest('[data-mp]');
    if (b) { if (b.disabled || (mode === 'plan' && !goal() && b.dataset.mp !== 'close')) return; const fn = acts[b.dataset.mp]; if (fn) { try { fn(b, e); } catch (err) { console.error('Rumbo · MetaPlan:', err); } } return; }
    if (lbId && (e.target.id === 'mpLb' || e.target.classList.contains('mp-lb-img'))) closeLb();
  }

  /* ---------- Abrir y cerrar ---------- */
  function build() {
    if (ov) return;
    ov = document.createElement('div');
    ov.className = 'mp'; ov.id = 'mp'; ov.hidden = true; ov.tabIndex = -1;
    ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-labelledby', 'mpTitle');
    ov.innerHTML = `<div class="mp-scroll" id="mpScroll"></div><div class="mp-lb" id="mpLb" role="dialog" aria-modal="true" aria-label="Foto en grande" hidden></div><input type="file" id="mpFile" accept="image/*" multiple hidden tabindex="-1" aria-hidden="true">`;
    document.body.appendChild(ov);
    ov.addEventListener('click', onClick);
    ov.addEventListener('change', onChange);
    ov.addEventListener('input', onInput);
    ov.addEventListener('submit', onSubmit);
    ov.addEventListener('focusin', e => { if (e.target.matches && e.target.matches('input[data-money]') && e.target.value) { try { e.target.select(); } catch (err) {} } });
    q('#mpScroll').addEventListener('scroll', () => { if (!spyRaf) spyRaf = requestAnimationFrame(spy); }, {passive: true});
    q('#mpFile').addEventListener('change', e => { const fs = Array.from(e.target.files || []); e.target.value = ''; if (fs.length && mode === 'plan') addFiles(fs, fileMode === 'cover'); });
    document.addEventListener('keydown', onKey);
    addEventListener('resize', () => { if (ov && !ov.hidden && mode === 'plan') fit(); });
  }
  function restart() { ov.classList.remove('mp-enter', 'mp-out'); void ov.offsetWidth; ov.classList.add('mp-enter'); }
  function show() {
    if (closing) { clearTimeout(closeT); closing = false; }
    else if (ov.hidden) lastFocus = document.activeElement;
    lbId = ''; askDel = false; const lb = q('#mpLb'); lb.hidden = true; lb.innerHTML = '';
    ov.hidden = false; document.documentElement.classList.add('mp-lock'); restart();
  }
  function open(id) {
    const g = S.goals.find(x => x.id === id);
    if (!g) { island({icon: 'info', color: 'mu', title: 'No encontramos esa meta', sub: 'Puede que la hayan eliminado', dur: 2600}); return; }
    build(); show();
    gid = g.id; mode = 'plan'; wz = null;
    // v1.5: fotos de esta meta que se subieron antes de tener nube
    if (NB() && g.plan && g.plan.fotos) { const st = fotos(), mine = {}; g.plan.fotos.forEach(f => { if (typeof st[f] === 'string') mine[f] = st[f]; }); Nube.subirPendientes(mine); }
    try { paint(); } catch (e) { console.error('Rumbo · MetaPlan:', e); close(); island({icon: 'alert', color: 'alert', title: 'Algo se enredó al abrir el plan', sub: 'Sus datos siguen guardados', dur: 3600}); return; }
    q('#mpScroll').scrollTop = 0;
    const b = q('.mp-back'); b && b.focus({preventScroll: true});
  }
  function create() {
    build(); show();
    gid = null; mode = 'wizard'; wz = {tipo: 'viaje'};
    paintWizard(); q('#mpScroll').scrollTop = 0;
    const n = q('.mp-wz [name="n"]'); n && n.focus({preventScroll: true});
  }
  function close() {
    if (!ov || ov.hidden || closing) return;
    const a = document.activeElement; if (a && ov.contains(a) && a.blur) a.blur(); // confirma el campo que estaban editando
    clearTimeout(noteT); if (mode === 'plan' && goal()) save();
    const id = gid, back = lastFocus;
    closing = true; lbId = ''; askDel = false;
    try { render(false); } catch (e) { console.error('Rumbo · MetaPlan:', e); }
    ov.classList.remove('mp-enter'); ov.classList.add('mp-out');
    closeT = setTimeout(() => {
      closing = false; ov.hidden = true; ov.classList.remove('mp-out');
      q('#mpScroll').innerHTML = ''; const lb = q('#mpLb'); lb.hidden = true; lb.innerHTML = '';
      document.documentElement.classList.remove('mp-lock');
      gid = null; mode = ''; wz = null; lastFocus = null;
      const card = id ? Array.from(document.querySelectorAll('[data-act="plan"]')).find(x => x.dataset.id === id) : null;
      const t = card || (back && back.isConnected ? back : null) || document.querySelector('[data-act="newGoal"]') || document.querySelector('.tab[aria-current="page"]');
      if (t && t.focus) t.focus({preventScroll: true});
    }, ms(240));
  }

  return {open, create, isOpen: () => !!ov && !ov.hidden && !closing, coverSrc: g => g && g.plan && g.plan.cover ? src(g.plan.cover) : ''};
})();

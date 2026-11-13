/* Planes: la página «Tareas que suman puntos» completa (debajo del título).
   Tres frentes: Tareas (por persona y estado), Metas (ahorro con hilo de avance) y Proyectos (pasos con casilla).
   Uso: views.tareas -> título + Planes.html(); tras pintar, Planes.after(view) (opcional: html() ya deja todo listo).
   Único global: Planes. Depende de app.js en tiempo de ejecución (S, save, ic, esc, tile, empty, ring, barP, fmt, short,
   taskRow, goalCard, goalPace, scoreRows, island, confetti, cheer). */
const Planes = (() => {
  'use strict';

  /* ===== Lógica pura (sin DOM ni estado global) ===== */
  const PTS = 20, MAX_STEPS = 20, STOPS = [.25, .5, .75, 1];
  const NAME = {V: 'Vale', D: 'David', A: 'Los dos'};
  const clean = (s, max) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, max);
  const stepsOf = p => Array.isArray(p.steps) ? p.steps : [];
  const doneCount = p => stepsOf(p).filter(s => s.done).length;
  const complete = p => stepsOf(p).length > 0 && doneCount(p) === stepsOf(p).length;
  const pctOf = p => stepsOf(p).length ? doneCount(p) / stepsOf(p).length : 0;
  const ownerOf = w => w === 'V' || w === 'D' ? w : 'A';
  // Premio por terminar un proyecto: 20 a quien lo lidera; si es de los dos, 10 a cada uno
  const reward = w => ownerOf(w) === 'A' ? {V: PTS / 2, D: PTS / 2} : ownerOf(w) === 'D' ? {V: 0, D: PTS} : {V: PTS, D: 0};
  const rewardText = w => ownerOf(w) === 'A' ? `+${PTS / 2} para cada uno` : `+${PTS} para ${NAME[ownerOf(w)]}`;
  const parseSteps = txt => String(txt || '').split(/\n|;/).map(x => clean(x, 80)).filter(Boolean).slice(0, MAX_STEPS).map(n => ({n, done: false}));
  /* Cuadra la marca `done` con los pasos y mueve los puntos UNA sola vez por cambio de estado:
     1 = se acaba de completar (suma), -1 = se reabrió (devuelve), 0 = nada cambió. */
  function settle(p, pts) {
    const c = complete(p); if (c === !!p.done) return 0;
    const r = reward(p.w), k = c ? 1 : -1;
    p.done = c; pts.V = Math.max(0, (+pts.V || 0) + k * r.V); pts.D = Math.max(0, (+pts.D || 0) + k * r.D);
    return k;
  }
  const splitTasks = tasks => { const o = {V: {pend: [], done: []}, D: {pend: [], done: []}}; tasks.forEach(t => o[t.w === 'D' ? 'D' : 'V'][t.done ? 'done' : 'pend'].push(t)); return o; };
  const sumPts = list => list.reduce((a, t) => a + (+t.p || 0), 0);
  const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;
  // Resumen de la semana: tareas hechas, puntos por ganar y proyectos cerrados
  function weekStats(tasks, projs, goals) {
    const done = tasks.filter(t => t.done).length, open = projs.filter(p => !p.done).length;
    return {done, total: tasks.length, play: sumPts(tasks.filter(t => !t.done)) + open * PTS, saved: goals.reduce((a, g) => a + (+g.s || 0), 0), pDone: projs.length - open, pTotal: projs.length, pOpen: open};
  }
  // Hilo de una meta: cuánto falta y cuál es la próxima parada (25, 50, 75, 100 %)
  function goalThread(g) {
    const pct = g.t > 0 ? Math.min(1, Math.max(0, g.s / g.t)) : 0, falta = Math.max(0, g.t - g.s), next = STOPS.find(s => s > pct + 1e-9) || 1;
    return {pct, falta, next, toNext: Math.max(0, Math.ceil(g.t * next) - g.s)};
  }

  /* --- Proyectos: fechas, orden, plantillas (todo puro) --- */
  const MAX_WHY = 120, MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const isDue = s => typeof s === 'string' && /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(s);
  const isoOf = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const utcOf = s => { const a = s.split('-').map(Number); return Date.UTC(a[0], a[1] - 1, a[2]); };
  const daysLeft = (due, today) => isDue(due) && isDue(today) ? Math.round((utcOf(due) - utcOf(today)) / 864e5) : null;
  const fmtDue = (due, today) => { const a = due.split('-'); return `${+a[2]} ${MES[+a[1] - 1]}${isDue(today) && today.slice(0, 4) === a[0] ? '' : ' ' + a[0]}`; };
  // Cuenta regresiva de la fecha límite. null si no hay fecha o el proyecto ya se terminó.
  function dueInfo(due, today, done) {
    const d = daysLeft(due, today); if (d === null || done) return null;
    const text = d < 0 ? `Se pasó hace ${plural(-d, 'día', 'días')}` : d === 0 ? 'Vence hoy' : d === 1 ? 'Vence mañana' : `${fmtDue(due, today)} · faltan ${d} días`;
    return {days: d, late: d < 0, soon: d >= 0 && d <= 3, text};
  }
  const nextIdx = p => stepsOf(p).findIndex(s => !s.done);
  // En curso: primero lo que tiene fecha (lo más urgente arriba); lo demás conserva su orden
  const sortOpen = list => list.map((p, i) => [p, i]).sort((a, b) => (isDue(a[0].due) ? utcOf(a[0].due) : Infinity) - (isDue(b[0].due) ? utcOf(b[0].due) : Infinity) || a[1] - b[1]).map(x => x[0]);
  // Cambiar de responsable un proyecto ya premiado mueve los puntos con él
  function reassign(p, w, pts) {
    const nw = ownerOf(w), a = reward(p.w), b = reward(nw);
    if (p.done && nw !== ownerOf(p.w)) { pts.V = Math.max(0, (+pts.V || 0) - a.V + b.V); pts.D = Math.max(0, (+pts.D || 0) - a.D + b.D); }
    p.w = nw;
  }
  const TPL = [
    {k: 'espacio', t: 'Organizar un espacio', i: 'sofa', n: 'Organizar el cuarto útil', why: 'Para encontrar las cosas sin abrir cinco cajas.', steps: ['Sacar todo y ver qué hay', 'Separar: se queda, se regala, se bota', 'Limpiar el espacio vacío', 'Guardar por grupos en cajas', 'Marcar cada caja']},
    {k: 'tramite', t: 'Trámite o documentos', i: 'key', n: 'Renovar pasaportes', why: 'Para que ningún viaje nos coja con los papeles vencidos.', steps: ['Revisar requisitos y costos', 'Reunir los documentos', 'Pedir la cita', 'Ir a la cita', 'Reclamar y guardar en un lugar seguro']},
    {k: 'arreglo', t: 'Arreglo de la casa', i: 'home', n: 'Pintar la sala', why: 'Para que la casa se sienta nueva sin tener que mudarnos.', steps: ['Escoger el color entre los dos', 'Medir y hacer la lista de materiales', 'Conseguir pintura y herramientas', 'Correr muebles y proteger el piso', 'Pintar', 'Dejar secar y volver a acomodar']},
    {k: 'pareja', t: 'Plan de pareja', i: 'heart', n: 'Armar nuestra cita del mes', why: 'Para que la rutina no se coma lo importante: nosotros.', steps: ['Escoger el plan entre los dos', 'Apartar la fecha', 'Dejar listo lo que haga falta', 'Salir sin afán y sin celular en la mesa', 'Guardar un recuerdo del día']},
    {k: 'mudanza', t: 'Mudanza', i: 'bag', n: 'Mudarnos sin perder la calma', why: 'Para llegar a la casa nueva con todo y con ganas.', steps: ['Fijar la fecha del trasteo', 'Conseguir cajas y cinta', 'Regalar o vender lo que no va', 'Empacar por cuartos y marcar cada caja', 'Pasar servicios e internet', 'Día del trasteo', 'Desempacar primero lo esencial']}
  ];
  const fromTemplate = (t, id) => ({id, n: clean(t.n, 60), i: t.i || 'target', w: 'A', due: '', why: clean(t.why, MAX_WHY), done: false, steps: t.steps.slice(0, MAX_STEPS).map(n => ({n: clean(n, 80), done: false}))});

  /* --- v2.6 · Modo juego (Metas y Proyectos): ruta, cofres, premios y niveles (todo puro) --- */
  const PARADAS = [25, 50, 75, 100], COFRE_PTS = {25: 10, 50: 10, 75: 15, 100: 25};
  const PREMIOS = ['Escoger la película del viernes', 'Desayuno en la cama (lo hace quien vaya perdiendo)', 'Un día libre de lavar la loza', 'Helado de camino a la casa', 'Masaje de 10 minutos', 'Paseo largo con Coral y Oreo', 'Escoger la música toda la semana', 'Noche de juegos de mesa', 'Postre sorpresa', 'Una tarde sin celular, solo ustedes dos'];
  const PREMIOS_GRANDES = ['Cita sorpresa: la planea quien vaya ganando', 'Cena en su restaurante favorito', 'Noche de pizza y película', 'Un día entero de consentir al otro', 'Una foto de recuerdo enmarcada para la casa'];
  const NIVELES = ['Recién mudados', 'Vecinos juiciosos', 'Ahorradores de corazón', 'Viajeros', 'Exploradores', 'Capitanes de la casa', 'Leyendas de Rumbo'];
  const hashOf = s => { let h = 7; for (const ch of String(s)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h; };
  // El premio sale del id y la parada: siempre el mismo para el mismo cofre (no se puede "volver a tirar")
  const premioDe = (id, s) => s === 100 ? PREMIOS_GRANDES[hashOf(id + ':' + s) % PREMIOS_GRANDES.length] : PREMIOS[hashOf(id + ':' + s) % PREMIOS.length];
  const nivelDe = n => NIVELES[Math.min(NIVELES.length - 1, Math.max(0, (n | 0) - 1))];
  const cofresDe = g => Array.isArray(g.cofres) ? g.cofres : [];
  const conTope = g => !g.open && g.t > 0;
  // Las 4 paradas de una meta: si ya llegaron (listo) y si el cofre ya se abrió
  function paradas(g) {
    if (!conTope(g)) return [];
    const pct = g.s / g.t;
    return PARADAS.map(s => { const c = cofresDe(g).find(x => x.s === s); return {s, listo: pct >= s / 100 - 1e-9, abierto: !!c, premio: c ? c.p : '', u: !!(c && c.u)}; });
  }
  const listos = g => paradas(g).filter(p => p.listo && !p.abierto);
  // Abre un cofre si ya llegaron a esa parada. Devuelve {c, pts} o null. Los puntos van a los dos (es un logro de equipo).
  function abrirCofre(g, s, by, hoy) {
    const pa = paradas(g).find(p => p.s === s); if (!pa || !pa.listo || pa.abierto) return null;
    const c = {s, p: premioDe(g.id, s), at: hoy || '', by: by === 'D' ? 'D' : 'V', u: false};
    if (!Array.isArray(g.cofres)) g.cofres = [];
    g.cofres.push(c);
    return {c, pts: COFRE_PTS[s]};
  }
  // Orden de la ruta: lo cumplido atrás, luego lo que vence primero, luego lo que no tiene fecha
  const byTime = g => g.by instanceof Date && !isNaN(g.by) ? g.by.getTime() : (g.by ? new Date(g.by).getTime() || 9e15 : 9e15);
  const ordenRuta = goals => goals.filter(conTope).map((g, i) => [g, i]).sort((a, b) => ((b[0].s >= b[0].t) - (a[0].s >= a[0].t)) || byTime(a[0]) - byTime(b[0]) || a[1] - b[1]).map(x => x[0]);
  // Todos los premios ganados (cofres de metas + proyectos terminados), los sin cobrar primero
  function premiosDe(goals, projs) {
    const out = [];
    goals.forEach(g => cofresDe(g).forEach(c => out.push({k: `g|${g.id}|${c.s}`, t: c.p, de: `${g.n} · ${c.s} %`, u: !!c.u, big: c.s === 100})));
    projs.forEach(p => { if (p.done && p.premio) out.push({k: `p|${p.id}`, t: p.premio, de: p.n, u: !!p.premioU, big: false}); });
    return out.sort((a, b) => a.u - b.u);
  }
  // Dificultad de una misión (proyecto) según sus pasos: 1 a 3 estrellas
  const dificultad = p => { const n = stepsOf(p).length; return n <= 3 ? 1 : n <= 6 ? 2 : 3; };

  /* ===== Estado del módulo (solo de pantalla; los datos viven en S) ===== */
  let seg = 'tareas', formOpen = false, bound = false, swap = false, winId = null, bumpId = null, openFin = false, editId = null, stepEdit = null;
  const openDone = {V: false, D: false}, openSteps = new Set();
  const draft = {n: '', why: '', w: 'A', due: '', steps: ''};
  const resetDraft = () => { draft.n = ''; draft.why = ''; draft.w = 'A'; draft.due = ''; draft.steps = ''; };
  const CHK = '<svg viewBox="0 0 24 24"><path d="m5 12 5 5 9-10"/></svg>';
  const PEN = '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16v4zM13 7l4 4"/></svg>';
  // Ilustración del encabezado de Proyectos: una escalera con bandera (de a un paso se llega)
  const ART = '<svg viewBox="0 0 128 96" fill="none" stroke-linecap="round" stroke-linejoin="round"><path class="pl-art-s" d="M8 86h26V66h26V46h26V26h26"/><path class="pl-art-f" d="M100 26V6l16 6-16 6"/><path class="pl-art-c" d="m15 76 4 4 7-8M41 56l4 4 7-8"/><circle class="pl-art-d" cx="73" cy="36" r="4"/></svg>';
  // Qué es cada frente, en una línea
  const WHAT = {
    tareas: 'Lo del día a día. Cada una que hacen suma puntos.',
    metas: 'Para lo que están ahorrando. Aquí se mueve la plata.',
    proyectos: 'Cosas grandes de la casa o de los dos. Se logran por pasos, no con plata.'
  };
  const QUOTE = {
    tareas: 'Lavar la loza no es castigo: es el único deporte donde ganan los dos.',
    metas: 'Al que madruga Dios le ayuda, pero al que ahorra le alcanza para el domingo.',
    proyectos: 'Proyecto que no se parte en pasos se queda en antojo. De a poquito, pero juntos.'
  };
  const viewEl = () => document.getElementById('view');
  const rootEl = () => { const v = viewEl(); return v ? v.querySelector('[data-pl-root]') : null; };
  const heads = (w, s) => ownerOf(w) === 'A' ? `<span class="pl-duo">${Avatares.head('V', s, 'happy', '', true)}${Avatares.head('D', s, 'happy', '', true)}</span>` : Avatares.head(ownerOf(w), s, 'happy', '', true);
  const at = el => { const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };
  const call = name => { try { /* funciones opcionales de app.js */ if (name === 'syncTag' && typeof syncTag === 'function') syncTag(); } catch (e) {} };
  // Los guardados no traen la marca `done`: se deduce de los pasos para no premiar dos veces
  const normalize = () => S.projs.forEach(p => { if (typeof p.done !== 'boolean') p.done = complete(p); p.w = ownerOf(p.w); if (!Array.isArray(p.steps)) p.steps = []; if (typeof p.why !== 'string') p.why = ''; if (!isDue(p.due)) p.due = ''; });

  /* ===== Pintado ===== */
  function sumHTML() {
    const w = weekStats(S.tasks, S.projs, S.goals), left = w.total - w.done, diff = S.pts.V - S.pts.D;
    const title = !w.total ? 'Semana en blanco' : !left ? 'Semana redonda' : `Van ${w.done} de ${w.total}`;
    const sub = !w.total ? 'Anoten la primera tarea y empiecen a sumar.' : !left ? 'Todo hecho. Hoy la casa descansa y ustedes también.' : `${left === 1 ? 'Falta 1 tarea' : `Faltan ${left} tareas`}. De grano en grano se llena el costal.`;
    const lead = !diff ? 'Van parejos, y eso también es ganar: juegan para el mismo equipo.' : `${NAME[diff > 0 ? 'V' : 'D']} va adelante por ${Math.abs(diff)} pts. ${NAME[diff > 0 ? 'D' : 'V']}, todavía hay semana.`;
    const stat = (icon, v, label) => `<div class="pl-stat"><span class="pl-stat-i">${ic(icon)}</span><b class="mono">${v}</b><span>${label}</span></div>`;
    return `<section class="glass pl-sum" style="--i:1" aria-label="Resumen de la semana">
      <div class="pl-sum-ring">${ring(w.total ? w.done / w.total : 0, 108, 10, 'var(--a3)', 'var(--a1)', 'plRing', `<div><b>${w.done}/${w.total}</b><span>tareas</span></div>`)}</div>
      <div class="pl-sum-mid"><h2>${title}</h2><p class="pl-sum-sub">${sub}</p>
        <div class="pl-stats">${stat('star', w.play, 'puntos en juego')}${stat('trend', short(w.saved), 'ahorrado en metas')}${stat('target', `${w.pDone}/${w.pTotal}`, 'proyectos cerrados')}</div></div>
      <div class="pl-sum-score"><div class="pl-k">${ic('trophy')}Marcador</div>${scoreRows()}<p class="pl-lead">${lead} Quien gane escoge el plan del viernes.</p></div>
    </section>`;
  }
  function segsHTML() {
    const w = weekStats(S.tasks, S.projs, S.goals);
    const items = [['tareas', 'Tareas', 'check', w.total - w.done], ['metas', 'Metas', 'target', S.goals.length], ['proyectos', 'Proyectos', 'spark', w.pOpen]];
    return `<div class="pl-segs" role="group" aria-label="Qué quieren ver">${items.map(([k, n, i, c]) => `<button type="button" data-pl-seg="${k}" aria-pressed="${k === seg}" aria-label="${n}: ${c}">${ic(i)}<span>${n}</span><b class="mono" aria-hidden="true">${c}</b></button>`).join('')}</div>
      <div class="pl-what">${items.map(([k, n]) => `<p${k === seg ? ' class="on"' : ''}><b>${n}.</b> ${WHAT[k]}</p>`).join('')}</div>`;
  }
  const barHTML = (k, bg) => `<div class="bar"><i style="${barP(k)};background:${bg}"></i></div>`;

  /* --- Tareas --- */
  function personHTML(w, g, i) {
    const tot = g.pend.length + g.done.length, open = openDone[w];
    return `<section class="glass pl-person" style="--i:${i}" aria-label="Tareas de ${NAME[w]}">
      <div class="card-h"><h2 class="pl-ph">${heads(w, 34)}<span>${NAME[w]}</span></h2><span class="pill c1">${sumPts(g.pend)} pts por ganar</span></div>
      <div class="pl-meter">${barHTML(tot ? g.done.length / tot : 0, w === 'V' ? 'linear-gradient(90deg,var(--a3),var(--a1))' : 'linear-gradient(90deg,var(--a1),var(--a2))')}<span class="mono">${g.done.length}/${tot}</span></div>
      <div class="pl-k">${ic('clock')}Pendientes (${g.pend.length})</div>
      <div class="list">${g.pend.length ? g.pend.map(taskRow).join('') : empty(tot ? 'ok' : 'leaf', tot ? 'Todo al día' : `Nada asignado a ${NAME[w]}`, tot ? 'Ni una pendiente. Así da gusto llegar a la casa.' : 'Cuando le toque algo, aparece aquí.')}</div>
      ${g.done.length ? `<button type="button" class="pl-fold" data-pl-done="${w}" aria-expanded="${open}" aria-controls="plDone${w}">${ic('arrow')}<span>Hechas (${g.done.length})</span><b class="mono">+${sumPts(g.done)} pts</b></button>
      <div class="list pl-done" id="plDone${w}"${open ? '' : ' hidden'}>${g.done.map(taskRow).join('')}</div>` : ''}
    </section>`;
  }
  function tasksHTML() {
    const bar = `<div class="pl-bar"><p class="pl-quote">${QUOTE.tareas}</p><button class="btn acc pl-cta" data-act="newTask">${ic('plus')}Nueva tarea</button></div>`;
    if (!S.tasks.length) return `${bar}<section class="glass" style="--i:3">${empty('check', 'Sin tareas todavía', 'Agreguen la primera: la casa no se arregla sola, pero entre dos pesa la mitad.')}</section>`;
    const sp = splitTasks(S.tasks), props = Array.isArray(S.props) && typeof propRow === 'function' ? S.props : [];
    return `${bar}<div class="pl-cols">${personHTML('V', sp.V, 3)}${personHTML('D', sp.D, 4)}</div>
      ${props.length ? `<section class="glass" style="--i:5"><div class="card-h"><h2>${ic('bulb')}Propuestas por aprobar</h2><span class="pill gd">${props.length}</span></div><div class="list">${props.map(propRow).join('')}</div></section>` : ''}`;
  }

  /* --- Metas --- */
  function threadHTML(g) {
    if (g.open || !(g.t > 0)) return `<div class="pl-thread"><div class="pl-th-top"><span>Fondo abierto</span><b class="mono">${fmt(g.s)}</b></div><p class="pl-th-pace">${goalPace(g, 1)}. Aquí todo lo que entra, suma.</p></div>`;
    const t = goalThread(g), c = Array.isArray(g.c) ? g.c : ['var(--a1)', 'var(--a3)'], months = g.by && typeof monthsTo === 'function' ? monthsTo(g.by) : 1;
    return `<div class="pl-thread">
      <div class="pl-th-top"><span>${t.falta ? 'Falta' : 'Meta cumplida'}</span><b class="mono">${t.falta ? fmt(t.falta) : fmt(g.s)}</b></div>
      <div class="pl-th-line" role="img" aria-label="Avance ${Math.round(t.pct * 100)} %${t.falta ? `, próxima parada ${Math.round(t.next * 100)} %` : ''}">${barHTML(t.pct, `linear-gradient(90deg,${c[0]},${c[1]})`)}${STOPS.map(s => `<i class="pl-stop${t.pct >= s - 1e-9 ? ' on' : ''}" style="left:${s * 100}%"></i>`).join('')}</div>
      <p class="pl-th-next">${t.falta ? `Próxima parada: <b class="mono">${Math.round(t.next * 100)} %</b>, a <b class="mono">${fmt(t.toNext)}</b>` : 'Llegaron. Lo difícil no era la plata: era la constancia.'}</p>
      <p class="pl-th-pace">${goalPace(g, months)}</p></div>`;
  }
  // Mini resumen del plan de la meta (las fotos viven en otra clave: aquí solo se cuentan)
  function planHTML(g) {
    const p = g.plan; if (!p || typeof p !== 'object') return '';
    const nc = Array.isArray(p.costos) ? p.costos.length : 0, nf = Array.isArray(p.fotos) ? p.fotos.length : 0, lugar = clean(p.lugar, 60);
    return `<p class="pl-plan">${ic('spark')}<span><b>${lugar ? esc(lugar) : 'Plan en marcha'}</b><span class="mono">${plural(nc, 'costo', 'costos')} · ${plural(nf, 'foto', 'fotos')}</span></span></p>`;
  }
  /* --- v2.6 · Modo juego --- */
  // Cofre dibujado (cerrado o abierto). Usa currentColor para la madera y --gold para los herrajes.
  const COFRE = abierto => abierto
    ? '<svg class="pj-cofre-svg" viewBox="0 0 48 44" aria-hidden="true"><path class="pj-cf-tapa" d="M6 10c4-8 32-8 36 0l-4 8H10z"/><rect class="pj-cf-caja" x="6" y="18" width="36" height="22" rx="4"/><path class="pj-cf-luz" d="M14 18l-4-12M24 17V3M34 18l4-12"/><rect class="pj-cf-cerr" x="21" y="22" width="6" height="8" rx="1.5"/></svg>'
    : '<svg class="pj-cofre-svg" viewBox="0 0 48 44" aria-hidden="true"><path class="pj-cf-tapa" d="M6 20c0-12 36-12 36 0z"/><rect class="pj-cf-caja" x="6" y="20" width="36" height="20" rx="4"/><path class="pj-cf-banda" d="M6 26h36"/><rect class="pj-cf-cerr" x="21" y="22" width="6" height="8" rx="1.5"/></svg>';
  const DUO = s => `<span class="pj-walker" aria-hidden="true">${Avatares.head('V', s || 30, 'happy', '', true)}${Avatares.head('D', s || 30, 'happy', '', true)}</span>`;
  let vaultOpen = false, sheetId = null;
  // v2.7 · Marcador compacto del juego: nivel + experiencia + cofres + premios (todo en íconos)
  function hudHTML() {
    const L = typeof level === 'function' ? level() : {n: 1, t: 0, next: 100};
    const fixed = S.goals.filter(conTope), totC = fixed.length * 4 + S.projs.length;
    const abiertos = fixed.reduce((a, g) => a + cofresDe(g).length, 0) + S.projs.filter(p => p.done).length;
    const prem = premiosDe(S.goals, S.projs), sinCobrar = prem.filter(x => !x.u).length;
    const xp = Math.min(1, Math.max(0, (L.t - (L.n - 1) * 100) / 100));
    return `<section class="pj-hud" style="--i:2" aria-label="Su juego">
      <div class="pj-hud-row">
        <span class="pj-lvl" title="${L.next - L.t} pts para «${nivelDe(L.n + 1)}»"><b class="pj-lvl-n mono">${L.n}</b><span class="pj-lvl-tx"><b>${nivelDe(L.n)}</b><span class="pj-xp" role="img" aria-label="${L.next - L.t} puntos para el nivel ${L.n + 1}"><i style="transform:scaleX(${xp})"></i></span></span></span>
        <span class="pj-pill" title="Cofres abiertos" aria-label="${abiertos} de ${totC} cofres abiertos">${COFRE(true)}<b class="mono">${abiertos}<small>/${totC}</small></b></span>
        <button type="button" class="pj-pill pj-pill-b${sinCobrar ? ' hot' : ''}" data-pj-vault aria-expanded="${vaultOpen}" aria-controls="pjVault" aria-label="Bóveda de premios: ${sinCobrar} por cobrar">${ic('gift')}<b class="mono">${prem.length}</b>${sinCobrar ? `<i class="pj-dot">${sinCobrar}</i>` : ''}</button>
      </div>
      <ul class="pj-vault" id="pjVault"${vaultOpen ? '' : ' hidden'}>${prem.length ? prem.map(x => `<li class="${x.u ? 'u' : ''}${x.big ? ' big' : ''}"><span class="pj-v-i">${COFRE(true)}</span><span class="pj-v-tx"><b>${esc(x.t)}</b><small>${esc(x.de)}</small></span><button type="button" class="btn ${x.u ? 'ghost' : 'acc'} pj-v-btn" data-pj-cobrar="${esc(x.k)}" aria-pressed="${x.u}">${x.u ? 'Cobrado' : 'Cobrar'}</button></li>`).join('') : `<li class="pj-v-empty">${ic('gift')}<span>Abran cofres en la ruta y aquí se guardan sus premios.</span></li>`}</ul>
    </section>`;
  }
  // Cielo según la hora de Medellín (amanecer, tarde, noche)
  const cieloDe = h => h >= 5 && h < 10 ? 'am' : h >= 10 && h < 18 ? 'pm' : 'nt';
  // Coordenadas de la ruta: el primer destino abajo, el más lejano arriba. x en %, y en px.
  function ruta(n) {
    const GAP = 150, TOP = 110, BOT = 150, H = TOP + Math.max(0, n - 1) * GAP + BOT;
    const pts = Array.from({length: n}, (_, k) => ({x: k % 2 ? 70 : 30, y: H - BOT - k * GAP + (k % 2 ? 12 : -8)}));
    const start = {x: 50, y: H - 44}, end = {x: 50, y: 52};
    const seg = (a, b) => `C${a.x} ${(a.y + b.y) / 2} ${b.x} ${(a.y + b.y) / 2} ${b.x} ${b.y}`;
    const path = list => list.slice(1).reduce((d, p, i) => d + ' ' + seg(list[i], p), `M${list[0].x} ${list[0].y}`);
    return {H, pts, start, end, path};
  }
  // Un destino: ícono grande con anillo de avance; el nombre corto debajo
  function destinoHTML(g, p, k, cur) {
    const pct = Math.min(1, g.s / g.t), done = g.s >= g.t, ready = listos(g).length, c = Array.isArray(g.c) ? g.c : ['var(--a1)', 'var(--a3)'];
    return `<button type="button" class="pj-dest${done ? ' done' : ''}${cur ? ' cur' : ''}${ready ? ' ready' : ''}" data-pj-open="${esc(g.id)}" style="left:${p.x}%;top:${p.y}px;--k:${k};--p:${pct};--c1:${c[0]};--c2:${c[1]}" aria-label="${esc(g.n)}: ${Math.round(pct * 100)} %${ready ? ', hay un cofre listo' : ''}. Abrir">
      <span class="pj-dest-ring"><span class="pj-dest-in">${ic(done ? 'trophy' : esc(g.i || 'target'))}</span>${cur ? DUO(28) : ''}${ready ? `<span class="pj-badge" aria-hidden="true">${COFRE(false)}</span>` : ''}</span>
      <span class="pj-dest-l"><b>${esc(g.n)}</b><span class="mono">${done ? 'Llegaron' : Math.round(pct * 100) + ' %'}</span></span>
    </button>`;
  }
  function mapaHTML() {
    const list = ordenRuta(S.goals), cur = list.findIndex(g => g.s < g.t), R = ruta(list.length), cielo = cieloDe(new Date().getHours());
    const todos = [R.start, ...R.pts, R.end], hechos = [R.start, ...R.pts.slice(0, cur < 0 ? list.length : cur + 1)];
    const fondos = S.goals.filter(g => !conTope(g));
    return `<section class="pj-mapa cielo-${cielo}" style="--i:3;height:${R.H}px" aria-label="La ruta de sus metas">
      <span class="pj-sol" aria-hidden="true"></span>
      ${cielo === 'nt' ? `<span class="pj-stars" aria-hidden="true">${Array.from({length: 14}, (_, i) => `<i style="left:${(i * 37) % 96 + 2}%;top:${(i * 53) % 70 + 4}%;--d:${(i % 5) * .4}s"></i>`).join('')}</span>` : ''}
      <span class="pj-nube" aria-hidden="true" style="top:14%"></span><span class="pj-nube b" aria-hidden="true" style="top:46%"></span>
      <svg class="pj-montes" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path class="m1" d="M0 70 C15 55 25 62 38 50 C50 40 60 58 72 46 C84 36 92 50 100 44 L100 100 L0 100Z"/><path class="m2" d="M0 84 C20 74 34 82 50 72 C66 64 80 78 100 70 L100 100 L0 100Z"/></svg>
      <svg class="pj-camino" viewBox="0 0 100 ${R.H}" preserveAspectRatio="none" aria-hidden="true">
        <path class="road" d="${R.path(todos)}"/><path class="hecho" d="${R.path(hechos)}"/><path class="linea" d="${R.path(todos)}"/></svg>
      <span class="pj-hoy" style="left:${R.start.x}%;top:${R.start.y}px" aria-hidden="true">${ic('home')}</span>
      ${list.map((g, k) => destinoHTML(g, R.pts[k], k, k === cur)).join('')}
      <button type="button" class="pj-next" data-act="newGoal" style="left:${R.end.x}%;top:${R.end.y}px" aria-label="Nueva meta: un destino nuevo">${ic('plus')}<span>Nuevo destino</span></button>
      ${fondos.length ? `<div class="pj-alcancias" aria-label="Alcancías sin tope">${fondos.map(g => `<button type="button" class="pj-alc" data-pj-open="${esc(g.id)}" aria-label="${esc(g.n)}: ${fmt(g.s)}. Abrir">${ic(esc(g.i || 'coin'))}<span class="mono">${short(g.s)}</span></button>`).join('')}</div>` : ''}
    </section>`;
  }
  // Hoja con el detalle de un destino: aquí sí va la información y los cofres
  function hojaHTML() {
    const g = sheetId && S.goals.find(x => x.id === sheetId); if (!g) return '';
    const tope = conTope(g), pct = tope ? Math.min(1, g.s / g.t) : 0, done = tope && g.s >= g.t, pa = paradas(g);
    const chest = p => p.abierto
      ? `<span class="pj-chest open" role="img" aria-label="Cofre del ${p.s} % abierto: ${esc(p.premio)}">${COFRE(true)}<small>${p.s}%</small></span>`
      : p.listo ? `<button type="button" class="pj-chest ready" data-pj-cofre="${esc(g.id)}|${p.s}" aria-label="Abrir el cofre del ${p.s} %">${COFRE(false)}<small>${p.s}%</small></button>`
      : `<span class="pj-chest lock" role="img" aria-label="Cofre del ${p.s} %, cerrado">${COFRE(false)}<small>${p.s}%</small></span>`;
    const ultimo = cofresDe(g).slice(-1)[0];
    return `<div class="pj-scrim" data-pj-close></div>
    <div class="pj-hoja" role="dialog" aria-modal="true" aria-labelledby="pjHojaT">
      <span class="pj-hoja-asa" aria-hidden="true"></span>
      <button type="button" class="iconbtn sm pj-hoja-x" data-pj-close aria-label="Cerrar">${ic('x')}</button>
      <div class="pj-hoja-top">
        <span class="pj-dest-ring big" style="--p:${tope ? pct : 1};--c1:${(g.c || [])[0] || 'var(--a1)'};--c2:${(g.c || [])[1] || 'var(--a3)'}"><span class="pj-dest-in">${ic(done ? 'trophy' : esc(g.i || 'target'))}</span></span>
        <div><h3 id="pjHojaT">${esc(g.n)}</h3><p class="mono">${tope ? `${fmt(g.s)} de ${fmt(g.t)} · ${Math.round(pct * 100)} %` : `${fmt(g.s)} guardados · alcancía sin tope`}</p></div>
      </div>
      ${tope ? `<div class="pj-chests" role="group" aria-label="Cofres">${pa.map(chest).join('')}</div>
      ${ultimo ? `<p class="pj-premio">${ic('gift')}<span><b>Último premio:</b> ${esc(ultimo.p)}</span></p>` : listos(g).length ? '' : `<p class="pj-hint">${ic('gift')}<span>El próximo cofre se abre al ${pa.find(p => !p.listo) ? pa.find(p => !p.listo).s : 100} %.</span></p>`}` : ''}
      <div class="pj-hoja-acts">${done ? '' : `<button type="button" class="btn acc" data-act="abono" data-id="${esc(g.id)}" data-a="100000">${ic('plus')}$100.000</button>`}<button type="button" class="btn pri" data-act="plan" data-id="${esc(g.id)}" data-pj-close>${ic('spark')}Planear</button></div>
    </div>`;
  }
  function goalsHTML() {
    if (!S.goals.length) return `${hudHTML()}<section class="glass" style="--i:3">${empty('target', 'Aún no tienen metas', 'Cada meta es un destino en su ruta. Creen la primera y, cada vez que abonen, avanzan y abren cofres con premios.')}<div class="pl-bar"><button type="button" class="btn acc pl-cta" data-act="newGoal">${ic('plus')}Nueva meta</button></div></section>`;
    return `${hudHTML()}${mapaHTML()}${hojaHTML()}`;
  }


  /* --- Proyectos --- */
  const whoBtns = sel => ['V', 'D', 'A'].map(k => `<button type="button" data-pl-w="${k}" aria-pressed="${k === ownerOf(sel)}">${heads(k, 24)}<span>${NAME[k]}</span></button>`).join('');
  // Campos comunes de crear y editar. `x` = sufijo de ids; `bind` = guarda el borrador mientras se escribe
  function fieldsHTML(d, x, bind) {
    const f = k => bind ? ` data-pl-f="${k}"` : '';
    return `<label class="pl-lb" for="plN${x}">¿Qué quieren sacar adelante?</label>
      <input class="pl-inp" id="plN${x}" data-pl-i="n"${f('n')} type="text" maxlength="60" autocomplete="off" placeholder="Ej.: Organizar el cuarto útil" value="${esc(d.n)}" aria-describedby="plErr${x}">
      <label class="pl-lb" for="plY${x}">¿Para qué? <span>(lo que los anima a terminarlo)</span></label>
      <input class="pl-inp" id="plY${x}" data-pl-i="why"${f('why')} type="text" maxlength="${MAX_WHY}" autocomplete="off" placeholder="Ej.: Para encontrar las cosas sin abrir cinco cajas" value="${esc(d.why || '')}">
      <div class="pl-lb" id="plWl${x}">¿Quién responde por él?</div>
      <div class="pl-who" role="group" aria-labelledby="plWl${x}">${whoBtns(d.w)}</div>
      <label class="pl-lb" for="plD${x}">Fecha límite <span>(opcional)</span></label>
      <input class="pl-inp" id="plD${x}" data-pl-i="due"${f('due')} type="date" value="${isDue(d.due) ? d.due : ''}">`;
  }
  function formHTML() {
    return `<form class="glass pl-form" id="plForm" data-pl-form novalidate style="--i:4">
      <div class="card-h"><h2>${ic('spark')}Nuevo proyecto</h2><span class="pill gd">${ic('star')}+${PTS} pts</span></div>
      ${fieldsHTML(draft, '', true)}
      <label class="pl-lb" for="plS">Primeros pasos <span>(opcional, uno por línea)</span></label>
      <textarea class="pl-inp" id="plS" data-pl-f="steps" rows="3" placeholder="Sacar lo que ya no sirve&#10;Conseguir cajas&#10;Marcar cada caja">${esc(draft.steps)}</textarea>
      <small class="pl-err" id="plErr" role="alert"></small>
      <div class="pl-form-r"><button type="button" class="btn ghost" data-pl-cancel>Cancelar</button><button type="submit" class="btn acc">${ic('ok')}Crear proyecto</button></div>
    </form>`;
  }
  function introHTML(has) {
    const how = [['Escojan una plantilla o escriban el suyo.'], ['Miren «Lo que sigue» y marquen un paso a la vez.'], ['Con el último paso abren el cofre: puntos y un premio.']];
    return `<section class="glass pl-intro${has ? ' is-compact' : ''}" style="--i:3" aria-labelledby="plIntroT">
      <div class="pl-intro-top"><div class="pl-art" aria-hidden="true">${ART}</div>
        <div class="pl-intro-tx"><h2 id="plIntroT">Lo grande se logra por pasos</h2>
          <p>Un proyecto es algo que no se compra: se hace. Organizar el cuarto útil, renovar los pasaportes, pintar la sala. Cada proyecto es una misión: la parten en pasos, marcan uno a la vez y al final abren un cofre con <b class="mono">+${PTS}</b> puntos y un premio para los dos.</p></div></div>
      ${has ? '' : `<ol class="pl-how" aria-label="Cómo funciona">${how.map((h, i) => `<li><b class="mono" aria-hidden="true">${i + 1}</b><span>${h[0]}</span></li>`).join('')}</ol>`}
      <div class="pl-k" id="plTplK">${ic('bulb')}${has ? 'Otra idea para arrancar' : 'Toquen una idea y queda creada con sus pasos'}</div>
      <div class="pl-tpls" role="group" aria-labelledby="plTplK">${TPL.map(t => `<button type="button" class="pl-tpl" data-pl-tpl="${t.k}" aria-label="Crear proyecto con plantilla: ${t.t}. Ejemplo: ${t.n}, ${t.steps.length} pasos sugeridos">${tile(t.i, 'a1', 'pl-tpl-i')}<span class="pl-tpl-tx"><b>${t.t}</b><span>${t.n} · ${t.steps.length} pasos</span></span></button>`).join('')}</div>
      <div class="pl-intro-r">${has ? '' : `<p class="pl-quote">${QUOTE.proyectos}</p>`}<button type="button" class="btn ${has ? 'acc' : 'ghost'} pl-cta" data-pl-new aria-expanded="${formOpen}" aria-controls="plForm">${ic('plus')}${has ? 'Nuevo proyecto' : 'Crear uno desde cero'}</button></div>
    </section>`;
  }
  // El paso que toca ahora, con su botón grande. Se re-pinta solo (data-pl-nextbox) al marcar pasos.
  function nextHTML(p) {
    const st = stepsOf(p), j = nextIdx(p);
    if (p.done || (st.length && j < 0)) return `<div class="pl-next is-done" data-pl-nextbox><span class="pl-next-k">${ic('trophy')}Terminado</span><p class="pl-next-t">Lo lograron, paso a paso.</p><p class="pl-hint">Si quedó algo suelto, desmarquen un paso y el proyecto vuelve a «en curso».</p></div>`;
    if (!st.length) return `<div class="pl-next is-empty" data-pl-nextbox><span class="pl-next-k">${ic('arrow')}Lo que sigue</span><p class="pl-next-t">Escribir el primer paso</p><p class="pl-hint">Empiecen por el más fácil: el que da pereza se hace de segundo.</p></div>`;
    const left = st.length - doneCount(p), t = esc(st[j].n);
    return `<div class="pl-next${bumpId === p.id ? ' pl-bump' : ''}" data-pl-nextbox><span class="pl-next-k">${ic('arrow')}Lo que sigue</span><p class="pl-next-t">${t}</p>
      <button type="button" class="btn acc pl-next-b" data-pl-next aria-label="Marcar como hecho: ${t}">${ic('ok')}${left === 1 ? 'Listo, y con este terminamos' : 'Listo, hecho'}</button></div>`;
  }
  function stepLi(p, s, j) {
    const t = esc(s.n);
    if (stepEdit && stepEdit.id === p.id && stepEdit.j === j) return `<li><form class="pl-sform" data-pl-sform="${j}" novalidate>
      <input class="pl-inp" type="text" maxlength="80" autocomplete="off" value="${t}" aria-label="Texto del paso">
      <div class="pl-sform-r"><button type="button" class="btn ghost pl-danger" data-pl-sdel="${j}">${ic('trash')}Borrar paso</button><button type="button" class="btn ghost" data-pl-scancel="${j}">Cancelar</button><button type="submit" class="btn acc">${ic('ok')}Guardar</button></div></form></li>`;
    return `<li class="pl-li"><button type="button" class="pl-step" data-pl-step="${j}" aria-pressed="${!!s.done}"><span class="pl-chk" aria-hidden="true">${CHK}</span><span class="pl-step-t">${t}</span></button><button type="button" class="iconbtn sm pl-mini" data-pl-sedit="${j}" aria-label="Editar o borrar el paso: ${t}" title="Editar o borrar">${PEN}</button></li>`;
  }
  function editHTML(p, i) {
    return `<article class="glass pl-proj" style="--i:${i}" data-pl-proj="${esc(p.id)}" aria-label="Editar proyecto: ${esc(p.n)}">
      <form class="pl-form" data-pl-eform novalidate><div class="card-h"><h2>${PEN}Editar proyecto</h2></div>
        ${fieldsHTML(p, 'e', false)}
        <small class="pl-err" id="plErre" role="alert"></small>
        <div class="pl-form-r"><button type="button" class="btn ghost" data-pl-ecancel>Cancelar</button><button type="submit" class="btn acc">${ic('ok')}Guardar cambios</button></div></form>
    </article>`;
  }
  // v2.0 · Camino de piedras: cada paso es una piedra; el perrito del responsable camina hasta el paso que sigue
  function stonesHTML(p) {
    const st = stepsOf(p); if (!st.length) return '';
    const j = st.findIndex(s => !s.done), w = ownerOf(p.w), n = st.length, at = j < 0 ? n - 1 : j;
    return `<div class="pl-path${j < 0 ? ' fin' : ''}" style="--n:${n}" aria-hidden="true"><span class="pl-path-line"><i style="transform:scaleX(${n > 1 ? at / (n - 1) : 1})"></i></span>
      ${st.map((s, k) => `<span class="pl-stone${s.done ? ' on' : ''}${k === j ? ' now' : ''}" style="--k:${k}" title="${esc(s.n)}">${s.done ? ic('ok') : k + 1}${k === at ? `<span class="pl-walker">${heads(w, 26)}</span>` : ''}</span>`).join('')}</div>`;
  }
  function projHTML(p, i) {
    if (editId === p.id) return editHTML(p, i);
    const st = stepsOf(p), d = doneCount(p), nm = esc(p.n), w = ownerOf(p.w), k = S.projs.indexOf(p);
    const open = openSteps.has(p.id) || !!(stepEdit && stepEdit.id === p.id), due = dueInfo(p.due, isoOf(new Date()), p.done);
    const prize = p.done ? `<span class="pill ok">${ic('ok')}${rewardText(w)}</span>` : `<span class="pill gd">${ic('gift')}Cofre: ${w === 'A' ? `+${PTS / 2} a cada uno` : `+${PTS}`} y un premio</span>`;
    const dif = dificultad(p), mision = `<span class="pj-mision"><span>Misión</span><span class="pj-stars" role="img" aria-label="Dificultad ${dif} de 3">${[1, 2, 3].map(x => `<i class="${x <= dif ? 'on' : ''}">${ic('star')}</i>`).join('')}</span></span>`;
    const why = p.why ? `<p class="pl-why"><b>Para qué:</b> ${esc(p.why)}</p>` : p.done ? '' : `<button type="button" class="pl-link" data-pl-edit="why">${PEN}<span>Escriban para qué lo hacen</span></button>`;
    return `<article class="glass pl-proj pl-own-${w}${p.done ? ' is-done' : ''}${winId === p.id ? ' pl-win' : ''}" style="--i:${i}" data-pl-proj="${esc(p.id)}" aria-label="Proyecto: ${nm}">
      <div class="pl-proj-h">${tile(p.done ? 'trophy' : p.i && p.i !== 'target' ? esc(p.i) : 'target', p.done ? 'gd' : 'a1', 'pl-proj-tile')}
        <div class="pl-proj-tx">${mision}<h3>${nm}</h3>${why}
          <div class="pl-proj-meta"><span class="pl-chip">${heads(w, 22)}<span>${NAME[w]}</span></span>${prize}${due ? `<span class="pill ${due.late ? 'al' : due.soon ? 'gd' : 'c1'}">${ic(due.late ? 'alert' : 'cal')}${due.text}</span>` : ''}</div></div></div>
      ${due && due.late ? `<p class="pl-late">${ic('alert')}<span>La fecha ya pasó. Sin culpa: denle hoy un empujón o pónganle una fecha nueva.</span></p>` : ''}
      ${st.length ? `<div class="pj-quest${p.done ? ' fin' : ''}">${stonesHTML(p)}<span class="pj-qchest" role="img" aria-label="${p.done ? 'Cofre abierto' : 'Cofre al final de la misión'}">${COFRE(p.done)}</span></div>` : ''}
      ${p.done && p.premio ? `<p class="pj-premio">${ic('gift')}<span><b>Premio ganado:</b> ${esc(p.premio)}${p.premioU ? ' · cobrado' : ''}</span></p>` : ''}
      ${nextHTML(p)}
      <div class="pl-meter">${barHTML(pctOf(p), p.done ? 'var(--ok)' : 'linear-gradient(90deg,var(--a1),var(--a3))')}<span class="mono" data-pl-count>${d}/${st.length}</span></div>
      ${st.length ? `<button type="button" class="pl-fold" data-pl-steps aria-expanded="${open}" aria-controls="plSt${k}">${ic('arrow')}<span>Todos los pasos</span><b class="mono">${st.length}</b></button>
      <ul class="pl-steps" id="plSt${k}"${open ? '' : ' hidden'}>${st.map((s, j) => stepLi(p, s, j)).join('')}</ul>` : ''}
      ${p.done ? '' : st.length < MAX_STEPS ? `<form class="pl-add" data-pl-add novalidate><input class="pl-inp" type="text" maxlength="80" autocomplete="off" placeholder="${st.length ? 'Agregar otro paso' : 'Escriban el primer paso'}" aria-label="Nuevo paso para ${nm}"><button type="submit" class="iconbtn sm" aria-label="Agregar paso a ${nm}" title="Agregar paso">${ic('plus')}</button></form>` : `<p class="pl-hint">Ya son ${MAX_STEPS} pasos. Terminen unos antes de sumar más.</p>`}
      <div class="pl-proj-f"><button type="button" class="btn ghost" data-pl-edit aria-label="Editar proyecto: ${nm}">${PEN}Editar</button><button type="button" class="btn ghost pl-del" data-pl-del aria-label="Borrar proyecto: ${nm}">${ic('trash')}Borrar</button></div>
    </article>`;
  }
  function projsHTML() {
    const has = S.projs.length > 0, open = sortOpen(S.projs.filter(p => !p.done)), fin = S.projs.filter(p => p.done);
    return `${hudHTML()}${introHTML(has)}
      ${formOpen ? formHTML() : ''}
      ${open.length ? `<div class="pl-k pl-sec">${ic('clock')}En curso (${open.length})</div><div class="pl-projs">${open.map((p, i) => projHTML(p, i + 5)).join('')}</div>` : has ? `<section class="glass" style="--i:5">${empty('trophy', 'Nada en curso', 'Todo lo que empezaron, lo terminaron. Cuando quieran, arriba hay ideas para el siguiente.')}</section>` : ''}
      ${fin.length ? `<button type="button" class="pl-fold pl-fin" data-pl-fin aria-expanded="${openFin}" aria-controls="plFin">${ic('arrow')}<span>Terminados (${fin.length})</span><b class="mono">+${fin.length * PTS} pts</b></button>
      <div class="pl-projs pl-done" id="plFin"${openFin ? '' : ' hidden'}>${fin.map((p, i) => projHTML(p, i + 6)).join('')}</div>` : ''}`;
  }

  const PANES = {tareas: tasksHTML, metas: goalsHTML, proyectos: projsHTML};
  function inner() {
    normalize();
    const label = {tareas: 'Tareas', metas: 'Metas', proyectos: 'Proyectos'}[seg];
    return `${sumHTML()}${segsHTML()}<div class="pl-pane${swap ? ' pl-in' : ''}" role="region" aria-label="${label}">${PANES[seg]()}</div>`;
  }
  // v1.8: si Planes ya está en pantalla y solo se redibuja (un cambio que llegó de la nube, un logro…), se conservan
  // los formularios abiertos, lo escrito y el cursor. Al entrar desde otra pestaña, todo arranca limpio.
  let pend = null;
  function keyOf(el) {
    const c = el.closest('[data-pl-proj]'), f = el.closest('form'); if (!f) return '';
    const kind = f.matches('[data-pl-eform]') ? 'e' : f.matches('[data-pl-sform]') ? 's' + f.dataset.plSform : f.matches('[data-pl-add]') ? 'a' : f.matches('[data-pl-form]') ? 'n' : 'o';
    return (c ? c.dataset.plProj : '_') + '|' + kind + '|' + (el.dataset.plI || el.dataset.plF || el.name || el.type);
  }
  function capture(root) {
    const k = {vals: {}, focus: null, w: null}, act = document.activeElement;
    root.querySelectorAll('form input, form textarea').forEach(el => {
      const key = keyOf(el); if (!key) return; k.vals[key] = el.value;
      if (el === act) { k.focus = {key}; try { k.focus.s = el.selectionStart; k.focus.e = el.selectionEnd; } catch (er) {} }
    });
    const wb = root.querySelector('[data-pl-eform] [data-pl-w][aria-pressed="true"]'); if (wb) k.w = wb.dataset.plW;
    return k;
  }
  function restore(root) {
    const k = pend; pend = null; if (!k || !root) return;
    root.querySelectorAll('form input, form textarea').forEach(el => {
      const key = keyOf(el); if (!(key in k.vals)) return; el.value = k.vals[key];
      if (k.focus && k.focus.key === key) { el.focus({preventScroll: true}); try { if (k.focus.s != null) el.setSelectionRange(k.focus.s, k.focus.e); } catch (er) {} }
    });
    if (k.w) root.querySelectorAll('[data-pl-eform] [data-pl-w]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.plW === k.w)));
  }
  function html() {
    bind(); swap = false; winId = null; bumpId = null;
    const old = rootEl();
    if (old) {
      pend = capture(old);
      if (editId && !S.projs.some(p => p.id === editId)) editId = null;
      if (stepEdit && !S.projs.some(p => p.id === stepEdit.id)) stepEdit = null;
    } else { pend = null; editId = null; stepEdit = null; }
    return `<div class="pl" data-pl-root>${inner()}</div>`;
  }
  // Re-pintado propio (no toca el resto de la vista). `focus(root)` devuelve a dónde vuelve el foco.
  function repaint(focus) {
    const root = rootEl(); if (!root) return;
    root.innerHTML = inner(); swap = false; winId = null; bumpId = null;
    const el = focus && focus(root); if (el) el.focus({preventScroll: true});
    if (typeof setupScroll === 'function') setupScroll();
  }
  const cardOf = (root, id) => [...root.querySelectorAll('[data-pl-proj]')].find(c => c.dataset.plProj === id) || null;
  const projOf = el => { const c = el.closest('[data-pl-proj]'); return c ? S.projs.find(p => p.id === c.dataset.plProj) || null : null; };

  /* ===== Acciones ===== */
  function celebrate(p, pos) {
    let nl = [];
    if (!p.premio) { p.premio = premioDe(p.id, 'p'); p.premioU = false; save(); }
    try { if (typeof checkBadges === 'function') { nl = checkBadges() || []; save(); } } catch (e) { nl = []; }
    confetti(pos[0], pos[1], 90);
    island({icon: 'gift', color: 'gold', title: `¡Misión cumplida! Cofre abierto · ${rewardText(p.w)}`, sub: `Premio: ${p.premio}`, dur: 6200});
    cheer('logro');
    try { if (nl.length && typeof announceLogros === 'function') announceLogros(nl, 5600); } catch (e) {}
  }
  const reopened = () => island({icon: 'undo', color: 'mu', title: 'Proyecto reabierto', sub: 'Los puntos vuelven cuando lo terminen', dur: 3000});
  const shortN = n => n.length > 40 ? n.slice(0, 40) + '…' : n;
  const newId = () => 'pj' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  // Elemento visible dentro de la tarjeta (si quedó plegado, el foco va al botón que lo despliega)
  const inCard = (root, id, sel, alt) => { const c = cardOf(root, id); if (!c) return root.querySelector('[data-pl-new]'); const el = sel && c.querySelector(sel); return el && !el.closest('[hidden]') ? el : c.querySelector(alt || '[data-pl-steps]') || c.querySelector('.pl-del'); };
  // Tras un cambio que cierra o reabre el proyecto: re-pinta, sincroniza y avisa
  function flip(p, k, pos, focus) {
    if (k > 0) { winId = p.id; openFin = true; }
    repaint(focus); call('syncTag');
    if (k > 0) celebrate(p, pos); else reopened();
  }
  function toggleStep(b) {
    const p = projOf(b), j = +b.dataset.plStep, s = p && stepsOf(p)[j]; if (!s) return;
    const pos = at(b);
    s.done = !s.done; const k = settle(p, S.pts); save();
    if (!k) { // mismo estado del proyecto: se actualiza en sitio para que la casilla y la barra se animen
      const card = b.closest('[data-pl-proj]'), fill = card.querySelector('.pl-meter .bar i'), cnt = card.querySelector('[data-pl-count]'), nb = card.querySelector('[data-pl-nextbox]');
      b.setAttribute('aria-pressed', s.done);
      if (fill) fill.style.setProperty('--p', pctOf(p));
      if (cnt) cnt.textContent = `${doneCount(p)}/${stepsOf(p).length}`;
      if (nb) nb.outerHTML = nextHTML(p);
      return;
    }
    flip(p, k, pos, root => inCard(root, p.id, `[data-pl-step="${j}"]`));
  }
  // Botón grande de «Lo que sigue»: marca el primer paso pendiente
  function doNext(b) {
    const p = projOf(b), j = p ? nextIdx(p) : -1; if (j < 0) return;
    const pos = at(b);
    p.steps[j].done = true; const k = settle(p, S.pts); save();
    if (k) { flip(p, k, pos, root => inCard(root, p.id, null)); return; }
    bumpId = p.id;
    repaint(root => inCard(root, p.id, '[data-pl-next]'));
  }
  function addStep(form) {
    const p = projOf(form), inp = form.querySelector('input'), n = clean(inp.value, 80);
    if (!p || !n || stepsOf(p).length >= MAX_STEPS) { inp.focus(); return; }
    p.steps.push({n, done: false}); const k = settle(p, S.pts); save();
    repaint(root => inCard(root, p.id, '.pl-add input'));
    if (k) { call('syncTag'); reopened(); }
  }
  function saveStep(form) {
    const p = projOf(form), j = +form.dataset.plSform, s = p && stepsOf(p)[j], inp = form.querySelector('input'), n = clean(inp.value, 80);
    if (!s) return;
    if (!n) { inp.setAttribute('aria-invalid', 'true'); inp.focus(); return; }
    s.n = n; stepEdit = null; save();
    repaint(root => inCard(root, p.id, `[data-pl-sedit="${j}"]`));
  }
  function delStep(b) {
    const p = projOf(b), j = +b.dataset.plSdel, s = p && stepsOf(p)[j]; if (!s) return;
    p.steps.splice(j, 1); stepEdit = null;
    const k = settle(p, S.pts); if (k > 0) openFin = true; save();
    repaint(root => inCard(root, p.id, '.pl-add input')); if (k) call('syncTag');
    island({icon: 'trash', color: 'mu', title: k > 0 ? 'Paso borrado: proyecto terminado' : k < 0 ? 'Paso borrado: proyecto reabierto' : 'Paso borrado', sub: shortN(s.n), action: 'Deshacer', dur: 6200, onAction: () => {
      if (S.projs.includes(p) && !p.steps.includes(s) && p.steps.length < MAX_STEPS) { p.steps.splice(Math.min(j, p.steps.length), 0, s); if (settle(p, S.pts)) call('syncTag'); save(); }
      repaint(root => inCard(root, p.id, `[data-pl-sedit="${j}"]`));
      return {icon: 'undo', color: 'mu', title: 'Paso de vuelta', sub: 'Todo quedó como estaba', dur: 1800};
    }});
  }
  function delProj(b) {
    const p = projOf(b); if (!p) return;
    const k = S.projs.indexOf(p); S.projs.splice(k, 1); if (editId === p.id) editId = null; save();
    repaint(root => root.querySelector('[data-pl-new]') || root.querySelector('[data-pl-seg="proyectos"]'));
    island({icon: 'trash', color: 'mu', title: 'Proyecto borrado', sub: shortN(p.n), action: 'Deshacer', dur: 6200, onAction: () => {
      if (!S.projs.includes(p)) { S.projs.splice(Math.min(k, S.projs.length), 0, p); save(); }
      if (p.done) openFin = true;
      repaint(root => inCard(root, p.id, '.pl-del'));
      return {icon: 'undo', color: 'mu', title: 'Proyecto de vuelta', sub: 'Todo quedó como estaba', dur: 1800};
    }});
  }
  // Lee nombre, para qué, responsable y fecha de un formulario (crear o editar). Marca el error y devuelve null si no pasa.
  function readForm(form) {
    const q = k => form.querySelector(`[data-pl-i="${k}"]`), inp = q('n'), err = form.querySelector('.pl-err'), n = clean(inp.value, 60);
    if (n.length < 3) { if (err) err.textContent = 'Pónganle un nombre de al menos 3 letras.'; inp.setAttribute('aria-invalid', 'true'); inp.focus(); return null; }
    const wb = form.querySelector('[data-pl-w][aria-pressed="true"]'), due = q('due') ? q('due').value : '';
    return {n, why: clean(q('why') ? q('why').value : '', MAX_WHY), w: ownerOf(wb && wb.dataset.plW), due: isDue(due) ? due : ''};
  }
  function newProj(form) {
    const d = readForm(form); if (!d) return;
    const steps = parseSteps(form.querySelector('#plS').value), id = newId();
    S.projs.unshift({id, n: d.n, i: 'target', w: d.w, due: d.due, why: d.why, steps, done: false});
    resetDraft(); formOpen = false; if (steps.length) openSteps.add(id); save();
    repaint(root => inCard(root, id, steps.length ? '[data-pl-next]' : '.pl-add input'));
    island({icon: 'target', color: 'a1', title: 'Proyecto creado', sub: steps.length ? `${plural(steps.length, 'paso', 'pasos')} para arrancar` : 'Escríbanle el primer paso', dur: 3200});
  }
  function useTemplate(b) {
    const t = TPL.find(x => x.k === b.dataset.plTpl); if (!t) return;
    const p = fromTemplate(t, newId());
    S.projs.unshift(p); openSteps.add(p.id); save();
    repaint(root => inCard(root, p.id, '[data-pl-edit]'));
    island({icon: 'target', color: 'a1', title: 'Proyecto creado con sus pasos', sub: 'Cámbienle lo que quieran con Editar', action: 'Deshacer', dur: 6200, onAction: () => {
      const k = S.projs.indexOf(p); if (k >= 0) { S.projs.splice(k, 1); save(); }
      repaint(root => root.querySelector(`[data-pl-tpl="${t.k}"]`));
      return {icon: 'undo', color: 'mu', title: 'Plantilla retirada', sub: 'Aquí no ha pasado nada', dur: 1800};
    }});
  }
  function saveProj(form) {
    const p = projOf(form), d = p && readForm(form); if (!d) return;
    const moved = p.done && d.w !== ownerOf(p.w);
    p.n = d.n; p.why = d.why; p.due = d.due; reassign(p, d.w, S.pts); editId = null; save();
    repaint(root => inCard(root, p.id, '[data-pl-edit]:not(.pl-link)')); if (moved) call('syncTag');
    island({icon: 'ok', color: 'a1', title: 'Proyecto actualizado', sub: shortN(p.n), dur: 2200});
  }

  // v2.6 · Abrir un cofre de una meta: puntos para los dos, premio y fiesta
  function abrir(b) {
    const [id, sv] = String(b.dataset.pjCofre).split('|'), g = S.goals.find(x => x.id === id), s = +sv; if (!g) return;
    const pos = at(b), r = abrirCofre(g, s, S.profile, isoOf(new Date())); if (!r) return;
    S.pts.V = (+S.pts.V || 0) + r.pts; S.pts.D = (+S.pts.D || 0) + r.pts;
    let nl = []; try { if (typeof checkBadges === 'function') nl = checkBadges() || []; } catch (e) {}
    save(); b.classList.add('pj-pop');
    setTimeout(() => { repaint(root => root.querySelector(`[data-pj-cofre]`) || root.querySelector('.pj-isla')); call('syncTag'); }, typeof T === 'function' ? T(420) : 420);
    confetti(pos[0], pos[1], s === 100 ? 140 : 80);
    island({icon: 'gift', color: 'gold', title: `¡Cofre del ${s} % abierto! +${r.pts} pts para cada uno`, sub: `Premio: ${r.c.p}`, dur: 6400});
    cheer('logro');
    try { if (nl.length && typeof announceLogros === 'function') announceLogros(nl, 6600); } catch (e) {}
  }
  // Marcar un premio como cobrado (o deshacerlo)
  function cobrar(b) {
    const k = String(b.dataset.pjCobrar).split('|');
    if (k[0] === 'g') { const g = S.goals.find(x => x.id === k[1]), c = g && cofresDe(g).find(x => x.s === +k[2]); if (!c) return; c.u = !c.u; }
    else { const p = S.projs.find(x => x.id === k[1]); if (!p) return; p.premioU = !p.premioU; }
    save(); vaultOpen = true;
    repaint(root => [...root.querySelectorAll('[data-pj-cobrar]')].find(x => x.dataset.pjCobrar === b.dataset.pjCobrar));
  }

  /* ===== Eventos: delegados sobre #view, registrados una sola vez ===== */
  function onClick(e) {
    const t = e.target; if (!t || !t.closest || !t.closest('[data-pl-root]')) return;
    let b;
    if ((b = t.closest('[data-pl-seg]'))) {
      const k = b.dataset.plSeg; if (!PANES[k] || k === seg) return;
      seg = k; swap = true; editId = null; stepEdit = null; sheetId = null; repaint(root => root.querySelector(`[data-pl-seg="${k}"]`));
    } else if ((b = t.closest('[data-pl-done]'))) {
      const w = b.dataset.plDone === 'D' ? 'D' : 'V', box = document.getElementById('plDone' + w);
      openDone[w] = !openDone[w]; b.setAttribute('aria-expanded', openDone[w]); if (box) box.hidden = !openDone[w];
    } else if ((b = t.closest('[data-pl-fin]'))) {
      const box = document.getElementById('plFin');
      openFin = !openFin; b.setAttribute('aria-expanded', openFin); if (box) box.hidden = !openFin;
    } else if ((b = t.closest('[data-pl-steps]'))) {
      const p = projOf(b), box = b.nextElementSibling; if (!p || !box) return;
      const on = b.getAttribute('aria-expanded') !== 'true';
      if (on) openSteps.add(p.id); else { openSteps.delete(p.id); if (stepEdit && stepEdit.id === p.id) stepEdit = null; }
      b.setAttribute('aria-expanded', on); box.hidden = !on;
    } else if ((b = t.closest('[data-pl-step]'))) toggleStep(b);
    else if ((b = t.closest('[data-pl-next]'))) doNext(b);
    else if ((b = t.closest('[data-pl-tpl]'))) useTemplate(b);
    else if ((b = t.closest('[data-pl-sedit]'))) { const p = projOf(b); if (!p) return; stepEdit = {id: p.id, j: +b.dataset.plSedit}; editId = null; openSteps.add(p.id); repaint(root => inCard(root, p.id, '.pl-sform input')); }
    else if ((b = t.closest('[data-pl-scancel]'))) { const p = projOf(b), j = +b.dataset.plScancel; stepEdit = null; if (p) repaint(root => inCard(root, p.id, `[data-pl-sedit="${j}"]`)); }
    else if ((b = t.closest('[data-pl-sdel]'))) delStep(b);
    else if ((b = t.closest('[data-pl-edit]'))) { const p = projOf(b), why = b.dataset.plEdit === 'why'; if (!p) return; editId = p.id; stepEdit = null; repaint(root => inCard(root, p.id, why ? '#plYe' : '#plNe')); }
    else if ((b = t.closest('[data-pl-ecancel]'))) { const p = projOf(b); editId = null; if (p) repaint(root => inCard(root, p.id, '[data-pl-edit]:not(.pl-link)')); }
    else if ((b = t.closest('[data-pl-del]'))) delProj(b);
    else if ((b = t.closest('[data-pl-new]'))) { formOpen = !formOpen; repaint(root => formOpen ? root.querySelector('#plN') : root.querySelector('[data-pl-new]')); }
    else if ((b = t.closest('[data-pl-cancel]'))) { formOpen = false; resetDraft(); repaint(root => root.querySelector('[data-pl-new]')); }
    else if ((b = t.closest('[data-pj-cofre]'))) abrir(b);
    else if ((b = t.closest('[data-pj-open]'))) { sheetId = b.dataset.pjOpen; repaint(root => root.querySelector('.pj-hoja-x')); }
    else if ((b = t.closest('[data-pj-close]'))) { const id = sheetId; sheetId = null; if (!b.matches('[data-act]')) repaint(root => [...root.querySelectorAll('[data-pj-open]')].find(x => x.dataset.pjOpen === id)); }
    else if ((b = t.closest('[data-pj-vault]'))) { const box = document.getElementById('pjVault'); vaultOpen = !vaultOpen; b.setAttribute('aria-expanded', vaultOpen); if (box) box.hidden = !vaultOpen; }
    else if ((b = t.closest('[data-pj-cobrar]'))) cobrar(b);
    else if ((b = t.closest('[data-pl-w]'))) { if (b.closest('[data-pl-form]')) draft.w = ownerOf(b.dataset.plW); b.parentElement.querySelectorAll('[data-pl-w]').forEach(x => x.setAttribute('aria-pressed', x === b)); }
  }
  function onSubmit(e) {
    const f = e.target; if (!f || !f.matches) return;
    if (f.matches('[data-pl-form]')) { e.preventDefault(); newProj(f); }
    else if (f.matches('[data-pl-eform]')) { e.preventDefault(); saveProj(f); }
    else if (f.matches('[data-pl-sform]')) { e.preventDefault(); saveStep(f); }
    else if (f.matches('[data-pl-add]')) { e.preventDefault(); addStep(f); }
  }
  function onInput(e) {
    const f = e.target; if (!f || !f.matches) return;
    if (f.matches('[data-pl-f]') && ['n', 'why', 'due', 'steps'].includes(f.dataset.plF)) draft[f.dataset.plF] = f.value;
    if (f.matches('[aria-invalid]')) { f.removeAttribute('aria-invalid'); const fm = f.closest('form'), err = fm && fm.querySelector('.pl-err'); if (err) err.textContent = ''; }
  }
  function bind() {
    if (bound) return; const v = viewEl(); if (!v) return;
    bound = true;
    v.addEventListener('click', onClick); v.addEventListener('submit', onSubmit); v.addEventListener('input', onInput);
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && sheetId && rootEl()) { const id = sheetId; sheetId = null; repaint(root => [...root.querySelectorAll('[data-pj-open]')].find(x => x.dataset.pjOpen === id)); } });
  }
  // Se llama tras pintar la vista: asegura los listeners (html() ya los registra si #view existe)
  function after() { bind(); restore(rootEl()); }

  return {html, after, listos, pure: {complete, pctOf, reward, settle, parseSteps, splitTasks, weekStats, goalThread, isDue, daysLeft, dueInfo, nextIdx, sortOpen, reassign, fromTemplate, paradas, abrirCofre, premioDe, ordenRuta, premiosDe, nivelDe, dificultad}};
})();

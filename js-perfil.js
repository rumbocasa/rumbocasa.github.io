/* Rumbo · Perfil v1.1 (tarjeta de personaje + «Sobre mí» + asistente «Crear perfil», estilo Disney/Duolingo).
   Perfil de Vale (Coral), de David (Oreo) y de Ambos. Contrato: Perfil.html(tab) devuelve el HTML que va DEBAJO de las pestañas;
   Perfil.after(root) se llama tras pintar (activa «otra frase»). Perfil.wizardHTML(w, data) + Perfil.bindWizard(root, w, onDone, onCancel)
   pintan y activan el asistente por pasos (no guarda: entrega los datos saneados a onDone). La primera parte son funciones puras sin DOM. */
const Perfil = (function () {
  'use strict';
  const NAME = {V: 'Vale', D: 'David'}, DOG = {V: 'Coral', D: 'Oreo'}, DAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
  const n0 = x => Number.isFinite(+x) ? +x : 0;
  const sum = (a, f) => a.reduce((s, x) => s + n0(f(x)), 0);
  const lvl = p => { p = Math.max(0, n0(p)); return {n: Math.floor(p / 100) + 1, xp: p % 100, left: 100 - (p % 100)}; };
  const plural = (n, a, b) => n === 1 ? a : b;

  /* ===== Lógica pura ===== */
  const MES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const DIM = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const TONO = {suave: 'Suavecito', directo: 'Directo', humor: 'Con humor'};
  const low = x => String(x).trim().toLowerCase();
  const pad2 = x => String(x).padStart(2, '0');
  /* Perfil guardado de una persona (o null) y el nombre con el que se le llama: su apodo si ya lo contó */
  const personOf = (st, w) => (st && st.people && st.people[w]) || null;
  const nameIn = (st, w) => { const p = personOf(st, w); return (p && p.apodo) || NAME[w]; };
  /* Cumpleaños 'MM-DD' → «12 de marzo» y días que faltan desde `ref` (29 de febrero: salta al próximo bisiesto) */
  function cumpleInfo(mmdd, ref) {
    const m = /^(\d{2})-(\d{2})$/.exec(mmdd || ''); if (!m) return null;
    const mo = +m[1], d = +m[2]; if (mo < 1 || mo > 12 || d < 1 || d > DIM[mo - 1]) return null;
    const t0 = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
    let y = t0.getFullYear(), dt = null;
    for (let k = 0; k < 9; k++, y++) { const c = new Date(y, mo - 1, d); if (c.getMonth() === mo - 1 && c >= t0) { dt = c; break; } }
    if (!dt) return null;
    const days = Math.round((dt - t0) / 864e5);
    return {txt: `${d} de ${MES[mo - 1]}`, days, when: days === 0 ? 'es hoy' : days === 1 ? 'es mañana' : `faltan ${days} días`};
  }
  /* Gustos que comparten (sin distinguir mayúsculas) */
  const common = (a, b) => { const set = new Set((b || []).map(low)); return (a || []).filter(g => set.has(low(g))); };
  /* Valida día y mes elegidos en el asistente: '' si está bien (o vacío), o un mensaje amable */
  function cumpleMsg(dd, mm) {
    if (!dd && !mm) return '';
    if (!dd) return 'Te faltó el día. O toca «Omitir» y lo dejamos para después.';
    if (!mm) return 'Te faltó el mes. O toca «Omitir» y lo dejamos para después.';
    if (+dd > DIM[+mm - 1]) return `${MES[+mm - 1][0].toUpperCase() + MES[+mm - 1].slice(1)} no tiene ${+dd} días. Revisa el día y seguimos.`;
    return '';
  }
  function statsOf(st, w) {
    const tasks = (st.tasks || []).filter(t => t.w === w), done = tasks.filter(t => t.done), pend = tasks.filter(t => !t.done);
    const mv = (st.moves || []).filter(m => m.w === w), gastos = mv.filter(m => m.cat !== 'ahorro'), aportes = mv.filter(m => m.cat === 'ahorro');
    const porCat = {}; gastos.forEach(m => { porCat[m.cat] = (porCat[m.cat] || 0) + n0(m.a); });
    const topCat = Object.keys(porCat).sort((a, b) => porCat[b] - porCat[a])[0] || null;
    const porMeta = {}; aportes.forEach(m => { const g = String(m.n || '').startsWith('Abono · ') ? m.n.slice(8) : null; if (g) porMeta[g] = (porMeta[g] || 0) + n0(m.a); });
    const metas = (st.goals || []).filter(g => porMeta[g.n]).map(g => ({g, a: porMeta[g.n]})).sort((a, b) => b.a - a.a).slice(0, 3);
    const big = gastos.reduce((b, m) => !b || n0(m.a) > n0(b.a) ? m : b, null);
    return {
      tasks, done: done.length, pend, ptsDone: sum(done, t => t.p), ptsPend: sum(pend, t => t.p),
      gastos, aportes, gastoTot: sum(gastos, m => m.a), aporteTot: Object.values(porMeta).reduce((a, x) => a + x, 0),
      pagos: (st.pays || []).filter(p => p.paid && p.by === w).length, topCat, porCat, metas, big,
      recent: mv.slice(-3).reverse(), pts: n0((st.pts || {})[w])
    };
  }
  /* Hechos curiosos calculados de sus datos; cada uno trae su frase en la voz del perrito (dos variantes) */
  function facts(st, w, s, catName) {
    const out = [], nm = nameIn(st, w), V = w === 'V';
    if (s.topCat && s.gastoTot > 0) {
      const share = Math.round(s.porCat[s.topCat] / s.gastoTot * 100), c = catName(s.topCat);
      out.push({k: 'Dato curioso', t: `${share}% de lo que gastaste este mes se fue en ${c}.`,
        q: V ? ['Ay, mor, ' + c + ' te tiene enamorada. Yo no juzgo, yo solo anoto.', 'Qué gustos tan caros, qué belleza. Pero ojo, que la plata no se multiplica sola.']
             : ['' + c + ' manda este mes. La plata es energía: la tuya se fue por ahí, tranquilo.', 'Todo gasto es un recuerdo que todavía no sabe que lo es. ' + c + ', pues.']});
    }
    if (s.big) out.push({k: 'Dato curioso', t: `Tu gasto más grande del mes: ${s.big.n}, por ${fmtF(s.big.a)}.`,
      q: V ? ['Uy, mor, ese sí se sintió en el bolsillo. Respira, que aquí estamos para eso.', 'Ese gasto tenía personalidad. Anotado con cariño y sin regaño.']
           : ['Ese gasto pesó. Todo pasa, hasta el saldo bajo. Anotado.', 'Nadie se lleva la plata a la tumba, pero tampoco hay que mandarla de avanzada. Anotado.']});
    if (s.aporteTot > 0) out.push({k: 'Dato curioso', t: `Has aportado ${fmtF(s.aporteTot)} a las metas este mes.`,
      q: V ? ['Ahorrando y con esa carita, mor. Así sí da gusto soñar.', 'Cada abono es un besito al futuro. Qué chimba de disciplina.']
           : ['Ahorrar es la única forma de cobrarle a tu yo del futuro por adelantado. Bien ahí.', 'Plata guardada, cabeza tranquila. El apocalipsis puede esperar al lunes.']});
    if (s.pagos > 0) out.push({k: 'Dato curioso', t: `Pagaste ${s.pagos} ${plural(s.pagos, 'cuenta', 'cuentas')} de la casa este mes.`,
      q: V ? ['Pagando a tiempo y de buen genio, mor. Eso enamora más que un ramo.', 'Quien paga sus cuentas duerme rico. Y se ve más lindo.']
           : ['Pagar a tiempo: el único placer culposo que no engorda.', 'Las deudas y la muerte llegan sin falta. Tú, al menos, llegaste primero a las deudas.']});
    if (s.done > 0) out.push({k: 'Dato curioso', t: `Llevas ${s.done} ${plural(s.done, 'tarea hecha', 'tareas hechas')} y ${s.ptsDone} puntos ganados en casa.`,
      q: V ? ['Casa limpia, corazón contento. Y la que la limpió, regia.', 'Eso es trabajo en equipo con glamour, mor.']
           : ['Lavar la loza no es castigo: es el único deporte donde ganan los dos.', 'La casa no se limpia sola, aunque a veces uno quisiera que sí. Buen trabajo.']});
    /* Reto semanal: siempre hay uno */
    if (s.pend.length) out.push({k: 'Reto de la semana', t: `Cierra tus ${s.pend.length} ${plural(s.pend.length, 'tarea pendiente', 'tareas pendientes')} y suma ${s.ptsPend} puntos.`, prog: s.tasks.length ? s.done / s.tasks.length : 0,
      q: V ? ['Tú puedes, mor. Una a la vez y con estilo.', 'Yo te echo porras desde acá. Sin pelos en la lengua y con mucho amor.']
           : ['Sin afán, pero tampoco con pereza. Una cosa a la vez.', 'El momento perfecto no existe, como la quincena. Empieza igual.']});
    else out.push({k: 'Reto de la semana', t: s.aporteTot > 0 ? `Todo al día, ${nm}. Reto: un abono más a una meta antes del domingo.` : `Todo al día, ${nm}. Reto: un abono a una meta antes del domingo.`, prog: s.aporteTot > 0 ? .5 : 0,
      q: V ? ['Todo hecho y todavía con ganas de más. Me encantas, mor.', 'Hoy no fue perfecto, pero fueron juntos. Eso también suma.']
           : ['Pendientes en cero. Disfrútalo, que mañana la vida vuelve a pedir cosas.', 'Hoy no fue perfecto, pero fueron juntos. Eso también suma.']});
    return out;
  }
  const fmtF = a => (typeof fmt === 'function' ? fmt(a) : '$' + Math.round(n0(a)));
  /* Quién va ganando: por puntos de tareas hechas. Frase cálida, sin competir feo */
  function weekLead(st) {
    const p = {V: sum((st.tasks || []).filter(t => t.done && t.w === 'V'), t => t.p), D: sum((st.tasks || []).filter(t => t.done && t.w === 'D'), t => t.p)};
    const diff = Math.abs(p.V - p.D), lead = p.V > p.D ? 'V' : p.D > p.V ? 'D' : null, other = lead === 'V' ? 'D' : 'V';
    let msg;
    if (!p.V && !p.D) msg = 'Semana en blanco: la primera tarea marca el rumbo.';
    else if (!lead || diff <= 10) msg = 'Van parejitos esta semana. Así da gusto hacer equipo.';
    else msg = `Va adelante ${nameIn(st, lead)} por ${diff} puntos. ${nameIn(st, other)} todavía tiene tiempo, y los dos ganan una casa limpia.`;
    return {p, lead, diff, msg, max: Math.max(p.V, p.D, 1)};
  }
  const weekDays = (streak, wd) => DAYS.map((d, i) => ({d, on: i <= wd && wd - i < n0(streak), today: i === wd}));

  /* ===== Piezas de HTML ===== */
  const pct = k => `--p:${Number.isFinite(k) ? Math.min(1, Math.max(0, k)) : 0}`;
  const bar = (k, bg, i) => `<div class="bar pf-bar"><i style="${pct(k)};background:${bg};--d:${(i || 0) * 90}ms"></i></div>`;
  const sec = (i, ttl, icon, right, body, cls) => `<section class="glass pf-sec ${cls || ''}" style="--i:${i}"><div class="pf-h"><h2>${ic(icon)}${ttl}</h2>${right || ''}</div>${body}</section>`;
  const calendar = streak => { const wd = (new Date().getDay() + 6) % 7;
    return `<div class="week pf-week" role="img" aria-label="Racha: ${n0(streak)} ${plural(n0(streak), 'día', 'días')}">${weekDays(streak, wd).map(x => `<div class="day ${x.on ? 'on' : ''} ${x.today ? 'today' : ''}"><i></i>${x.d}</div>`).join('')}</div>`; };
  const gradFor = w => w === 'V' ? ['var(--a3)', 'var(--a1)'] : w === 'D' ? ['var(--a2)', 'var(--ok)'] : ['var(--gold)', 'var(--alert)'];
  const kcell = (v, l, icon, t) => `<div class="pf-k">${tile(icon, t)}<b class="mono">${v}</b><span>${l}</span></div>`;
  const levelBlock = (key, who, lv) => { const g = gradFor(who);
    return `<div class="pf-lv">${ring(lv.xp / 100, 96, 9, g[0], g[1], 'pfr' + key, `<div><b class="pf-lvn">${lv.n}</b><span>nivel</span></div>`)}
      <div class="pf-lvtx"><b>Nivel ${lv.n}</b><span class="muted">Faltan <b class="mono">${lv.left}</b> ${plural(lv.left, 'punto', 'puntos')} para el nivel ${lv.n + 1}</span>${bar(lv.xp / 100, `linear-gradient(90deg,${g[0]},${g[1]})`, 2)}</div></div>`; };
  const goalMini = (g, i) => { const p = g.open ? 0 : n0(g.s) / Math.max(1, n0(g.t)), c = g.c || ['var(--a1)', 'var(--a3)'];
    return `<div class="pf-goal">${ring(p, 64, 6, c[0], c[1], 'pfg' + g.id + i, ic(g.i))}<b title="${esc(g.n)}">${esc(g.n)}</b><span class="mono muted">${g.open ? fmtF(g.s) : Math.round(p * 100) + '%'}</span></div>`; };
  const recentRow = m => { const k = cat(m.cat) || {i: 'wallet', t: 'mu', n: 'Sin categoría'};
    return `<div class="row">${tile(k.i, k.t)}<div style="min-width:0"><div class="t" title="${esc(m.n)}">${esc(m.n)}</div><span class="sub">${esc(k.n)} · ${m.d} ${monthShort}</span></div><div class="r"><span class="amt">−${fmtF(m.a)}</span></div></div>`; };
  const catName = id => (cat(id) || {n: 'otros gastos'}).n.toLowerCase();

  /* Voz del perrito: burbuja con dato/reto y botón «Otra frase» */
  let tabNow = 'V', idx = 0;
  const factList = w => facts(S, w, statsOf(S, w), catName);
  function voiceCard(w, i) {
    const list = factList(w), f = list[idx % list.length], q = f.q[(idx + new Date().getDate()) % f.q.length], dn = DOG[w].toLowerCase();
    return `<section class="glass pf-sec pf-voice ${w.toLowerCase()}" style="--i:${i}">
      <div class="pf-h"><h2>${ic('spark')}<span class="pf-k2">${f.k}</span></h2>${list.length > 1 ? `<button class="pill c1 pf-next" data-pf="next" aria-label="Ver otra frase de ${DOG[w]}">${ic('repeat')}Otra frase</button>` : ''}</div>
      <p class="pf-fact">${esc(f.t)}</p>
      ${f.prog != null ? bar(f.prog, `linear-gradient(90deg,${gradFor(w)[0]},${gradFor(w)[1]})`, 3) : ''}
      <div class="pf-say">${Avatares.head(w, 44, 'happy')}<div class="pf-bubble" aria-live="polite"><b>${DOG[w]}</b><p id="pfq">${esc(q)}</p></div></div></section>`;
  }

  /* «Sobre mí»: lo que cada uno contó en el asistente. Sin perfil: invitación amable a crearlo */
  const tags = list => `<div class="pf-tags">${list.map(g => `<span class="pf-tag">${esc(g)}</span>`).join('')}</div>`;
  const fact = (lbl, val) => val ? `<div class="pf-fd"><dt>${lbl}</dt><dd>${esc(val)}</dd></div>` : '';
  function aboutCard(w, i) {
    const p = personOf(S, w), dog = DOG[w];
    if (!p) return `<section class="glass pf-sec pf-about pf-about-0" style="--i:${i}"><div class="pf-h"><h2>${ic('user')}Sobre mí</h2></div>
      <div class="pf-about-e">${Avatares.head(w, 52, 'happy', '', true)}<b>${NAME[w]} todavía no nos ha contado de sí</b>
        <p class="muted">Son dos minutos: gustos, plan ideal y lo que busca. Con eso ${dog} deja de adivinar y le habla a su medida.</p></div>
      <div class="pf-cta"><button class="btn acc pf-btn" data-act="editProf" data-id="${w}">${ic('spark')}Crear mi perfil</button></div></section>`;
    const c = cumpleInfo(p.cumple, new Date());
    const dl = fact('Comida favorita', p.comida) + fact('Plan ideal', p.plan) + fact(`Cómo le habla ${dog}`, TONO[p.tono] || TONO.humor);
    return `<section class="glass pf-sec pf-about" style="--i:${i}"><div class="pf-h"><h2>${ic('user')}Sobre mí</h2>${c ? `<span class="pill ${c.days <= 7 ? 'gd' : 'c1'}">${ic('gift')}${c.days === 0 ? '¡Hoy cumple!' : c.days === 1 ? 'Cumple mañana' : `Faltan ${c.days} días`}</span>` : ''}</div>
      <div class="pf-id"><b class="pf-nick">${esc(p.apodo || NAME[w])}</b>${c ? `<span class="muted">Cumple el ${c.txt}</span>` : ''}</div>
      ${p.busca ? `<figure class="pf-busca"><figcaption>Lo que busca</figcaption><blockquote>${esc(p.busca)}</blockquote></figure>` : ''}
      ${p.gustos.length ? tags(p.gustos) : ''}
      ${dl ? `<dl class="pf-dl">${dl}</dl>` : ''}
      <div class="pf-cta"><button class="btn ghost pf-btn" data-act="editProf" data-id="${w}">${ic('sliders')}Editar perfil</button></div></section>`;
  }
  /* Pestaña «Ambos»: gustos compartidos y lo que busca cada uno (solo si ya lo contaron) */
  function usCards(i) {
    const pv = personOf(S, 'V'), pd = personOf(S, 'D');
    const sh = pv && pd ? common(pv.gustos, pd.gustos) : [];
    const comun = pv && pd && pv.gustos.length && pd.gustos.length ? sec(i, 'Lo que tenemos en común', 'heart', sh.length ? `<span class="pill gd">${sh.length} ${plural(sh.length, 'gusto', 'gustos')}</span>` : '',
      sh.length ? tags(sh) : `<p class="pf-msg">Todavía no coinciden en la lista, y está bien: lo que a uno le gusta, el otro lo puede aprender a querer.</p>`) : '';
    const bq = (w, p) => p && p.busca ? `<div class="pf-bq">${Avatares.head(w, 36, 'happy')}<div><b>${esc(nameIn(S, w))}</b><p>${esc(p.busca)}</p></div></div>` : '';
    const bs = bq('V', pv) + bq('D', pd);
    const buscan = bs ? sec(i + 1, 'Lo que buscamos', 'target', '', `<div class="pf-bqs">${bs}</div>`) : '';
    return comun + buscan;
  }

  function person(w) {
    const s = statsOf(S, w), L = lvl(s.pts), g = gradFor(w), act = S.profile === w, nm = esc(nameIn(S, w));
    const unlocked = (S.badges || []).filter(b => b.on), shown = unlocked.slice(0, 6);
    const wd = (new Date().getDay() + 6) % 7;
    const semana = s.tasks.length ? s.done / s.tasks.length : 0;
    const hero = `<section class="glass phero pf-hero ${w.toLowerCase()}" style="--i:1">${spk()}
      <div class="phero-stage"><span class="bigdog" data-bigdog="${w}"></span></div>
      <div class="phero-tx"><span class="pill ${w === 'V' ? 'c1' : 'c2'}">Con ${DOG[w]}</span>
        ${levelBlock(w, w, L)}
        <div class="phero-act">${act ? `<span class="pill ok">${ic('ok')}Perfil activo</span>` : `<button class="btn acc" data-act="prof" data-id="${w}">${ic('user')}Usar este perfil</button>`}</div></div></section>`;
    const trio = `<section class="glass pf-sec pf-trio" style="--i:3">${kcell(s.pts, 'puntos', 'star', 'gd')}${kcell(n0(S.streak), plural(n0(S.streak), 'día de racha', 'días de racha'), 'flame', 'al')}${kcell(unlocked.length + '/' + (S.badges || []).length, 'logros', 'trophy', 'a1')}</section>`;
    const semanaSec = sec(5, `Su semana`, 'cal', `<span class="pill c1">${s.done}/${s.tasks.length} hechas</span>`,
      `<div class="pf-week-top">${ring(semana, 84, 8, g[0], g[1], 'pfw' + w, `<div><b class="pf-lvn" style="font-size:20px">${Math.round(semana * 100)}%</b></div>`)}
        <div class="pf-wtx"><b>${s.pend.length ? `${s.pend.length} ${plural(s.pend.length, 'pendiente', 'pendientes')}` : 'Todo al día'}</b><span class="muted">${s.pend.length ? `Hay ${s.ptsPend} puntos esperando a ${nm}.` : `${nm} no debe nada esta semana.`}</span></div></div>
      ${calendar(S.streak)}
      <div class="list">${s.pend.length ? s.pend.slice(0, 3).map(taskRow).join('') : empty('check', 'Sin pendientes', 'Nada por hacer. ¡Qué orden!')}</div>
      <div class="pf-cta"><button class="pill c1" data-act="newTask">${ic('plus')}Nueva tarea</button></div>`);
    const fin = sec(6, 'Sus finanzas del mes', 'wallet', `<span class="pill gd">${monthShort}</span>`,
      `<div class="pf-fin"><div><b class="mono">${fmtF(s.gastoTot)}</b><span>${s.gastos.length} ${plural(s.gastos.length, 'gasto', 'gastos')}</span></div>
        <div><b class="mono">${fmtF(s.aporteTot)}</b><span>a metas</span></div>
        <div><b class="mono">${s.pagos}</b><span>${plural(s.pagos, 'pago hecho', 'pagos hechos')}</span></div></div>`);
    const mx = Math.max(1, ...s.metas.map(m => m.a));
    const metas = !s.metas.length ? '' : sec(7, 'Metas a las que más aportó', 'target', '', s.metas.length ? `<div class="list">${s.metas.map((m, i) => `<div class="pf-mrow">${tile(m.g.i, 'a1')}<div style="min-width:0"><div class="pf-mtop"><b title="${esc(m.g.n)}">${esc(m.g.n)}</b><span class="mono">${fmtF(m.a)}</span></div>${bar(m.a / mx, `linear-gradient(90deg,${(m.g.c || g)[0]},${(m.g.c || g)[1]})`, i + 1)}</div></div>`).join('')}</div>` : empty('target', 'Todavía sin abonos', `Cuando ${nm} abone a una meta, aparecerá aquí.`));
    const last = sec(8, 'Lo último que registró', 'clock', '', `<div class="list">${s.recent.length ? s.recent.map(recentRow).join('') : empty('clock', 'Sin movimientos este mes', 'Los gastos y aportes nuevos aparecerán aquí.')}</div>`);
    const badges = sec(9, 'Insignias', 'trophy', `<a class="pill gd" href="#logros">Ver todas ${ic('arrow')}</a>`,
      shown.length ? `<div class="pf-badges">${shown.map(b => `<div class="pf-b">${tile(b.i, 'gd')}<span>${esc(b.n)}</span></div>`).join('')}</div>${unlocked.length > shown.length ? `<p class="muted pf-more">y ${unlocked.length - shown.length} más desbloqueadas</p>` : ''}` : empty('trophy', 'Aún sin insignias', 'La primera llega más rápido de lo que creen.'));
    return `<div class="pf pf-${w.toLowerCase()}">${hero}${aboutCard(w, 2)}${trio}${voiceCard(w, 4)}${semanaSec}${fin}${metas}${last}${badges}</div>`;
  }

  function both() {
    const lv = level(), L = lvl(lv.t), wl = weekLead(S), g = gradFor('A');
    const on = (S.badges || []).filter(b => b.on).length, done = (S.tasks || []).filter(t => t.done).length;
    const hero = `<section class="glass phero pf-hero a" style="--i:1">${spk()}
      <div class="phero-stage duo"><span class="bigdog" data-bigdog="V"></span><span class="bigdog" data-bigdog="D"></span></div>
      <div class="phero-tx"><span class="pill gd">Coral &amp; Oreo</span>${levelBlock('A', 'A', L)}</div></section>`;
    const trio = `<section class="glass pf-sec pf-trio" style="--i:2">${kcell(lv.t, 'puntos juntos', 'star', 'gd')}${kcell(n0(S.streak), plural(n0(S.streak), 'día de racha', 'días de racha'), 'flame', 'al')}${kcell(on + '/' + (S.badges || []).length, 'logros', 'trophy', 'a1')}</section>`;
    const row = w => `<div class="pf-vs">${Avatares.head(w, 36, 'happy')}<div style="min-width:0"><div class="pf-mtop"><b>${esc(nameIn(S, w))}</b><span class="mono">${wl.p[w]} pts</span></div>${bar(wl.p[w] / wl.max, `linear-gradient(90deg,${gradFor(w)[0]},${gradFor(w)[1]})`, w === 'V' ? 1 : 2)}</div></div>`;
    const semana = sec(5, 'La semana de los dos', 'trophy', `<span class="pill c1">${done} ${plural(done, 'tarea hecha', 'tareas hechas')}</span>`,
      `<div class="pf-vslist">${row('V')}${row('D')}</div><p class="pf-msg">${esc(wl.msg)}</p>${calendar(S.streak)}<p class="muted pf-more">Racha conjunta: ${n0(S.streak)} ${plural(n0(S.streak), 'día', 'días')} sin soltarse.</p>`);
    const metas = sec(6, 'Metas compartidas', 'target', `<a class="pill c1" href="#metas">Ver todas ${ic('arrow')}</a>`,
      (S.goals || []).length ? `<div class="pf-goals">${S.goals.slice(0, 4).map(goalMini).join('')}</div>` : empty('target', 'Aún no tienen metas', 'Su primera meta de ahorro aparecerá aquí.'));
    const pts = typeof PROP_PTS !== 'undefined' ? PROP_PTS : [10, 15, 25];
    const props = `<section class="glass props pf-sec" style="--i:7"><div class="pf-h"><h2>${ic('bulb')}Propuestas de tareas</h2><span class="pill c1">${(S.props || []).length} ${plural((S.props || []).length, 'propuesta', 'propuestas')}</span></div>
      <p class="muted props-intro">¿Algo que haga falta en la casa? Propónganlo aquí; cuando los dos estén de acuerdo, se vuelve tarea con puntos.</p>
      <form class="pform" id="propForm" autocomplete="off">
        <label class="sr" for="propTx">Nueva propuesta</label>
        <input id="propTx" maxlength="80" placeholder="Ej.: Lavar las cortinas de la sala" required>
        <div class="pform-r">
          <div class="seg2" role="group" aria-label="¿Quién la haría?">${['V', 'D'].map(x => `<button type="button" data-pw="${x}" aria-pressed="${x === S.profile}">${esc(nameIn(S, x))}</button>`).join('')}</div>
          <div class="seg2" role="group" aria-label="Puntos">${pts.map(p => `<button type="button" data-pp="${p}" aria-pressed="${p === 15}">+${p}</button>`).join('')}</div>
          <button class="btn acc" type="submit">${ic('send')}Proponer</button></div>
        <small class="warn" id="propErr" role="alert"></small>
      </form>
      <div class="list">${(S.props || []).length ? S.props.map(propRow).join('') : empty('bulb', 'Aún no hay propuestas', 'La primera idea que se les ocurra para la casa aparecerá aquí.')}</div></section>`;
    return `<div class="pf pf-a">${hero}${trio}${usCards(3)}${semana}${metas}${props}</div>`;
  }

  /* ===== API ===== */
  function html(tab) {
    const t = tab === 'D' || tab === 'A' ? tab : 'V';
    if (t !== tabNow) { tabNow = t; idx = 0; }
    return t === 'A' ? both() : person(t);
  }
  let wired = false;
  function after(root) {
    const host = root || document.getElementById('view');
    if (!host || wired) return;
    wired = true;
    host.addEventListener('click', e => {
      const b = e.target.closest && e.target.closest('[data-pf="next"]'); if (!b) return;
      idx++;
      const w = tabNow, list = factList(w), f = list[idx % list.length], q = f.q[(idx + new Date().getDate()) % f.q.length];
      const card = b.closest('.pf-voice'), say = card.querySelector('.pf-bubble'), fact = card.querySelector('.pf-fact'), k = card.querySelector('.pf-k2');
      [say, fact].forEach(el => { el.classList.remove('pf-swap'); void el.offsetWidth; el.classList.add('pf-swap'); });
      k.textContent = f.k; fact.textContent = f.t; card.querySelector('#pfq').textContent = q;
      const ob = card.querySelector('.pf-bar'); if (ob) ob.remove();
      if (f.prog != null) fact.insertAdjacentHTML('afterend', bar0(f.prog, w));
    });
  }
  const bar0 = (k, w) => `<div class="bar pf-bar"><i style="${pct(k)};background:linear-gradient(90deg,${gradFor(w)[0]},${gradFor(w)[1]})"></i></div>`;

    /* ===== Asistente «Crear perfil»: una pregunta por pantalla, con el perrito acompañando ===== */
  const WZ_N = 7, MAX_G = 12;
  const SUG = ['Café', 'Cocinar', 'Viajar', 'Series', 'Fútbol', 'Gimnasio', 'Bailar', 'Leer', 'Videojuegos', 'Salir a comer', 'Naturaleza', 'Música', 'Cine', 'Caminar'];
  const IDEAS = ['Comprar casa', 'Viajar más', 'Salir de deudas', 'Ahorrar sin sufrir', 'Orden en la casa'];
  const TONOS_UI = [['suave', 'heart', 'Suavecito', 'Con calma y con cariño.', '«Vamos bien. Solo falta un pago, sin afán.»'],
    ['directo', 'bolt', 'Directo', 'Al grano: qué pasa y qué hacer.', '«Falta un pago. Vence mañana.»'],
    ['humor', 'spark', 'Con humor', 'Con chiste y refrán, siempre de tu lado.', '«Ese pago no se paga solo, aunque ganas no le faltan.»']];
  const SAY = {
    V: ['Mor, empecemos por lo fácil: ¿cómo te gusta que te digan?',
      'Dime cuándo cumples, que yo una fecha no la olvido. El año ni lo pregunto: eso no se hace.',
      'Ahora lo rico: ¿qué te gusta? Escoge sin pena, que aquí nadie juzga.',
      'Barriga llena, corazón contento. ¿Qué te provoca y cuál es tu plan perfecto?',
      'Cuéntame qué sueñas, mor. Lo que se dice en voz alta ya va en camino.',
      'Y a mí, ¿cómo me quieres? Yo te hablo como te sirva, no como me salga.',
      'Mira qué belleza de persona quedó aquí. Revisa con calma y lo dejamos listo.'],
    D: ['Primero lo básico. ¿Cómo te decimos?',
      'Día y mes. El año no lo pido: los años no se cuentan, se aprovechan.',
      'Marca lo que te gusta. Uno es lo que repite cuando nadie lo obliga.',
      'Comida y plan ideal. Sirve para las citas y para saber en qué vale la pena gastar.',
      '¿Qué quieres lograr? Sin rumbo, cualquier quincena se va por cualquier lado.',
      'Última: ¿cómo te hablamos? La verdad es la misma; cambia el empaque.',
      'Así te vemos. Si algo no cuadra, se cambia: para eso es tuyo.']
  };
  const san = x => (typeof sanPerson === 'function' ? sanPerson(x) : x);
  /* Borrador editable a partir de lo guardado (o vacío con el nombre de pila prellenado) */
  function draft(w, data) {
    const p = san(data) || {};
    return {apodo: p.apodo || NAME[w], cumple: p.cumple || '', gustos: (p.gustos || []).slice(0, MAX_G), comida: p.comida || '', plan: p.plan || '', busca: p.busca || '', tono: TONO[p.tono] ? p.tono : 'humor'};
  }
  const has = (list, g) => list.some(x => low(x) === low(g));
  const gustoChips = (d, x) => SUG.concat(x.extras).map(g => `<button type="button" class="pf-chip" data-wz="gusto" data-v="${esc(g)}" aria-pressed="${has(d.gustos, g)}">${esc(g)}</button>`).join('');
  const gCount = d => `${d.gustos.length} de ${MAX_G}`;
  const opt = (v, t, sel) => `<option value="${v}"${String(sel) === String(v) ? ' selected' : ''}>${t}</option>`;
  const sumRow = (n, lbl, val) => `<button type="button" class="pf-sum-r" data-wz="go" data-n="${n}"><span class="pf-sum-l"><span class="sr">Cambiar </span>${lbl}</span><span class="pf-sum-v${val ? '' : ' pf-none'}">${val || 'Sin contar todavía'}</span>${ic('arrow')}</button>`;
  function stepHTML(w, n, d, x) {
    const q = (t, hint) => `<h2 class="pf-wz-q" id="pfwzq">${t}</h2>${hint ? `<p class="pf-wz-hint">${hint}</p>` : ''}`;
    if (n === 0) return `${q('¿Cómo te decimos?', 'Así te vamos a llamar en toda la app.')}
      <input class="pf-in" data-f="apodo" data-focus maxlength="30" value="${esc(d.apodo)}" aria-labelledby="pfwzq" autocomplete="off" autocapitalize="words" enterkeyhint="next" placeholder="${NAME[w]}">`;
    if (n === 1) return `${q('¿Cuándo es tu cumpleaños?', 'Solo día y mes, para celebrarte a tiempo.')}
      <div class="pf-row2"><label class="pf-lab">Día<select class="pf-in" data-f="dd" data-focus>${opt('', 'Día', x.dd)}${Array.from({length: 31}, (_, i) => opt(i + 1, i + 1, x.dd)).join('')}</select></label>
      <label class="pf-lab">Mes<select class="pf-in" data-f="mm">${opt('', 'Mes', x.mm)}${MES.map((m, i) => opt(i + 1, m[0].toUpperCase() + m.slice(1), x.mm)).join('')}</select></label></div>`;
    if (n === 2) return `${q('¿Qué te gusta?', `Toca todo lo que vaya contigo. <span class="mono" data-wz-count>${gCount(d)}</span>`)}
      <div class="pf-chips" role="group" aria-labelledby="pfwzq">${gustoChips(d, x)}</div>
      <div class="pf-add"><label class="sr" for="pfwzNew">Agregar otro gusto</label><input class="pf-in" id="pfwzNew" data-wz-new maxlength="30" autocomplete="off" enterkeyhint="done" placeholder="¿Falta alguno? Escríbelo">
        <button type="button" class="btn ghost pf-btn" data-wz="add">${ic('plus')}Agregar</button></div>`;
    if (n === 3) return `${q('Comida favorita y plan ideal', 'Para antojos, citas y fines de semana.')}
      <label class="pf-lab">Tu comida favorita<input class="pf-in" data-f="comida" data-focus maxlength="60" value="${esc(d.comida)}" autocomplete="off" enterkeyhint="next" placeholder="Ej.: bandeja paisa, sushi, pasta"></label>
      <label class="pf-lab">Tu plan ideal<input class="pf-in" data-f="plan" maxlength="80" value="${esc(d.plan)}" autocomplete="off" enterkeyhint="next" placeholder="Ej.: desayuno sin afán y caminata"></label>`;
    if (n === 4) return `${q('¿Qué buscas lograr?', 'Con la casa, con la plata, con los dos. Lo que de verdad te mueve.')}
      <div class="pf-ta"><textarea class="pf-in" data-f="busca" data-focus maxlength="140" rows="3" aria-labelledby="pfwzq" enterkeyhint="next" placeholder="Ej.: tener casa propia y viajar sin deber nada">${esc(d.busca)}</textarea><span class="mono pf-ta-n" aria-hidden="true" data-wz-len>${d.busca.length}/140</span></div>
      <div class="pf-chips" role="group" aria-label="Ideas para empezar">${IDEAS.map(g => `<button type="button" class="pf-chip" data-wz="idea" data-v="${esc(g)}" aria-pressed="${low(d.busca).includes(low(g))}">${esc(g)}</button>`).join('')}</div>`;
    if (n === 5) return `${q('¿Cómo quieres que te hablen Coral y Oreo?', 'Lo puedes cambiar cuando quieras.')}
      <div class="pf-tones" role="group" aria-labelledby="pfwzq">${TONOS_UI.map(([k, i, t, s, e]) => `<button type="button" class="pf-tone" data-wz="tono" data-v="${k}" aria-pressed="${d.tono === k}"${d.tono === k ? ' data-focus' : ''}>${ic(i)}<b>${t}</b><span>${s}</span><em>${e}</em></button>`).join('')}</div>`;
    const c = cumpleInfo(d.cumple, new Date());
    return `${q(`Así quedas, ${esc(d.apodo.trim() || NAME[w])}`, 'Toca cualquier dato para cambiarlo.')}
      <div class="pf-sum">${sumRow(0, 'Te decimos', esc(d.apodo.trim() || NAME[w]))}${sumRow(1, 'Cumpleaños', c ? `${c.txt} · ${c.when}` : '')}
        ${sumRow(2, 'Gustos', d.gustos.length ? `<span class="pf-tags">${d.gustos.map(g => `<span class="pf-tag">${esc(g)}</span>`).join('')}</span>` : '')}
        ${sumRow(3, 'Comida favorita', esc(d.comida.trim()))}${sumRow(3, 'Plan ideal', esc(d.plan.trim()))}${sumRow(4, 'Lo que buscas', esc(d.busca.trim()))}${sumRow(5, 'Cómo te hablamos', TONO[d.tono])}</div>`;
  }
  const nextLabel = (n, edit) => n === WZ_N - 1 ? `${ic('ok')}${edit ? 'Guardar mi perfil' : 'Crear mi perfil'}` : `Siguiente${ic('arrow')}`;
  const canSkip = n => n >= 1 && n <= 4;

  /* HTML del asistente en el paso 1. `data` = perfil guardado (edición) o null (nuevo). El perrito lo monta quien lo pinta: Avatares.afterRender(root) */
  function wizardHTML(w, data) {
    w = w === 'D' ? 'D' : 'V';
    const d = draft(w, data), x = {dd: '', mm: '', extras: []}, edit = !!san(data);
    return `<div class="pf-wz pf-wz-${w.toLowerCase()}" data-w="${w}" data-init="${esc(JSON.stringify(d))}"${edit ? ' data-edit="1"' : ''}>
      <div class="pf-wz-top">
        <button type="button" class="pf-wz-ib" data-wz="back" aria-label="Paso anterior" disabled>${ic('arrow')}</button>
        <div class="pf-wz-prog" role="progressbar" aria-valuemin="1" aria-valuemax="${WZ_N}" aria-valuenow="1" aria-label="Paso 1 de ${WZ_N}"><i style="--p:${1 / WZ_N}"></i></div>
        <span class="pf-wz-n mono" aria-hidden="true">1/${WZ_N}</span>
        <button type="button" class="pf-wz-ib" data-wz="cancel" aria-label="Cerrar por ahora, sin guardar" hidden>${ic('x')}</button>
      </div>
      <div class="pf-wz-stage"><span class="bigdog" data-bigdog="${w}"></span><div class="pf-wz-bub" aria-live="polite"><b>${DOG[w]}</b><p>${SAY[w][0]}</p></div></div>
      <div class="pf-wz-body">${stepHTML(w, 0, d, x)}</div>
      <p class="pf-wz-err" role="alert"></p>
      <div class="pf-wz-foot"><button type="button" class="btn ghost pf-btn" data-wz="skip" hidden>Omitir</button><button type="button" class="btn acc pf-btn pf-wz-next" data-wz="next">${nextLabel(0, edit)}</button></div>
    </div>`;
  }

  /* Activa el asistente ya pintado. onDone(perfilSaneado) al terminar (aquí no se guarda); onCancel() opcional muestra el botón de cerrar */
  function bindWizard(root, w, onDone, onCancel) {
    const el = root && (root.matches && root.matches('.pf-wz') ? root : root.querySelector && root.querySelector('.pf-wz'));
    if (!el || el.dataset.bound) return null;
    el.dataset.bound = '1';
    w = w === 'D' ? 'D' : 'V';
    let init = null; try { init = JSON.parse(el.dataset.init || 'null'); } catch (e) {}
    const d = draft(w, init), edit = el.dataset.edit === '1';
    const cm = /^(\d{2})-(\d{2})$/.exec(d.cumple);
    const x = {dd: cm ? String(+cm[2]) : '', mm: cm ? String(+cm[1]) : '', extras: d.gustos.filter(g => !has(SUG, g))};
    const $ = s => el.querySelector(s), body = $('.pf-wz-body'), err = $('.pf-wz-err'), bub = $('.pf-wz-bub'), prog = $('.pf-wz-prog');
    const bBack = $('[data-wz="back"]'), bSkip = $('[data-wz="skip"]'), bNext = $('[data-wz="next"]'), bCancel = $('[data-wz="cancel"]');
    let step = 0, closed = false;
    if (typeof onCancel === 'function') bCancel.hidden = false;

    const replay = (node, cls) => { if (!node) return; node.classList.remove(cls); void node.offsetWidth; node.classList.add(cls); };
    const setErr = (msg, field) => {
      err.textContent = msg || '';
      body.querySelectorAll('[aria-invalid]').forEach(f => f.removeAttribute('aria-invalid'));
      if (msg && field) { field.setAttribute('aria-invalid', 'true'); replay(field, 'pf-wz-shake'); try { field.focus(); } catch (e) {} }
    };
    /* Lee al borrador lo que haya en pantalla */
    function collect() {
      body.querySelectorAll('[data-f]').forEach(f => { const k = f.dataset.f; if (k === 'dd' || k === 'mm') x[k] = f.value; else d[k] = f.value; });
      d.cumple = x.dd && x.mm && !cumpleMsg(x.dd, x.mm) ? pad2(x.mm) + '-' + pad2(x.dd) : '';
    }
    /* Mensaje amable si el paso actual no está listo: [mensaje, campo] */
    function check() {
      if (step === 0 && !d.apodo.trim()) return ['Ponnos un nombre, así sea cortico, para saber cómo llamarte.', body.querySelector('[data-f="apodo"]')];
      if (step === 1) { const m = cumpleMsg(x.dd, x.mm); if (m) return [m, body.querySelector(`[data-f="${!x.dd || x.mm ? 'dd' : 'mm'}"]`)]; }
      return null;
    }
    const syncIdeas = () => { const t = low(d.busca); body.querySelectorAll('[data-wz="idea"]').forEach(b => b.setAttribute('aria-pressed', t.includes(low(b.dataset.v)))); const n = body.querySelector('[data-wz-len]'); if (n) n.textContent = d.busca.length + '/140'; };
    const syncCount = () => { const n = body.querySelector('[data-wz-count]'); if (n) n.textContent = gCount(d); };

    function show(n, dir, quiet) {
      step = Math.max(0, Math.min(WZ_N - 1, n));
      body.innerHTML = stepHTML(w, step, d, x);
      setErr('');
      el.dataset.step = step;
      prog.firstElementChild.style.setProperty('--p', (step + 1) / WZ_N);
      prog.setAttribute('aria-valuenow', step + 1); prog.setAttribute('aria-label', `Paso ${step + 1} de ${WZ_N}`);
      $('.pf-wz-n').textContent = `${step + 1}/${WZ_N}`;
      bub.querySelector('p').textContent = SAY[w][step];
      bBack.disabled = step === 0; bSkip.hidden = !canSkip(step); bNext.innerHTML = nextLabel(step, edit);
      if (dir) { body.style.setProperty('--dx', dir); replay(body, 'pf-wz-in'); replay(bub, 'pf-wz-pop'); replay($('.bigdog'), 'pf-wz-hop'); }
      const f = step === WZ_N - 1 ? bNext : body.querySelector('[data-focus]') || body.querySelector('button,input,select,textarea');
      if (f) try { f.focus({preventScroll: !!quiet}); if (f.tagName === 'INPUT' && f.setSelectionRange) f.setSelectionRange(f.value.length, f.value.length); } catch (e) {}
    }
    function next() {
      collect();
      const bad = check(); if (bad) return setErr(bad[0], bad[1]);
      if (step < WZ_N - 1) return show(step + 1, 1);
      if (closed) return; closed = true;
      if (!d.apodo.trim()) d.apodo = NAME[w];
      if (typeof onDone === 'function') onDone(san(d));
    }
    function skip() {
      collect();
      if (step === 1 && cumpleMsg(x.dd, x.mm)) { x.dd = x.mm = ''; d.cumple = ''; }
      show(step + 1, 1);
    }
    function addGusto() {
      const inp = body.querySelector('[data-wz-new]'); if (!inp) return;
      const v = inp.value.trim().slice(0, 30); if (!v) { inp.focus(); return; }
      const known = SUG.concat(x.extras).find(g => low(g) === low(v)), name = known || v;
      if (!has(d.gustos, name)) {
        if (d.gustos.length >= MAX_G) return setErr('Doce gustos ya dicen mucho de ti. Quita uno para sumar otro.', inp);
        d.gustos.push(name);
      }
      if (!known) x.extras.push(v);
      body.querySelector('.pf-chips').innerHTML = gustoChips(d, x);
      const nb = [...body.querySelectorAll('[data-wz="gusto"]')].find(b => low(b.dataset.v) === low(name)); replay(nb, 'pf-wz-pop');
      inp.value = ''; setErr(''); syncCount(); inp.focus();
    }
    function toggleIdea(b) {
      const ta = body.querySelector('[data-f="busca"]'), v = b.dataset.v; let t = ta.value;
      const i = low(t) === low(v) ? 0 : t.toLowerCase().indexOf(v.toLowerCase());
      if (i >= 0) t = (t.slice(0, i) + t.slice(i + v.length)).replace(/\s*,(\s*,)+\s*/g, ', ').replace(/^[\s,]+|[\s,]+$/g, '');
      else {
        const base = t.trim().replace(/[\s,.;]+$/, ''), nv = base ? base + ', ' + v[0].toLowerCase() + v.slice(1) : v;
        if (nv.length > 140) return setErr('Ya no cabe más. Deja lo más importante: lo corto se cumple mejor.');
        t = nv;
      }
      if (t && i >= 0) t = t[0].toUpperCase() + t.slice(1);
      ta.value = t; d.busca = t; setErr(''); syncIdeas(); replay(b, 'pf-wz-pop');
    }

    el.addEventListener('click', e => {
      const b = e.target.closest && e.target.closest('[data-wz]'); if (!b || !el.contains(b) || b.disabled) return;
      const a = b.dataset.wz;
      if (a === 'next') next();
      else if (a === 'skip') skip();
      else if (a === 'back') { collect(); if (step > 0) show(step - 1, -1); }
      else if (a === 'cancel') { if (!closed && typeof onCancel === 'function') { closed = true; onCancel(); } }
      else if (a === 'go') show(+b.dataset.n || 0, -1);
      else if (a === 'add') addGusto();
      else if (a === 'idea') toggleIdea(b);
      else if (a === 'tono') { d.tono = TONO[b.dataset.v] ? b.dataset.v : 'humor'; body.querySelectorAll('[data-wz="tono"]').forEach(t => t.setAttribute('aria-pressed', t === b)); replay(b, 'pf-wz-pop'); }
      else if (a === 'gusto') {
        const v = b.dataset.v, i = d.gustos.findIndex(g => low(g) === low(v));
        if (i >= 0) d.gustos.splice(i, 1);
        else if (d.gustos.length >= MAX_G) return setErr('Doce gustos ya dicen mucho de ti. Quita uno para sumar otro.');
        else d.gustos.push(v);
        b.setAttribute('aria-pressed', i < 0); setErr(''); syncCount(); if (i < 0) replay(b, 'pf-wz-pop');
      }
    });
    el.addEventListener('input', e => { if (!e.target.matches || !e.target.matches('[data-f],[data-wz-new]')) return; collect(); if (err.textContent) setErr(''); if (e.target.dataset.f === 'busca') syncIdeas(); });
    el.addEventListener('change', e => { if (e.target.matches && e.target.matches('[data-f]')) { collect(); if (err.textContent) setErr(''); } });
    /* Enter avanza (en el campo «agregar gusto» primero agrega; Mayús+Enter deja saltar de línea en el texto largo) */
    el.addEventListener('keydown', e => {
      if (e.key !== 'Enter' || e.isComposing || e.shiftKey) return;
      const t = e.target, tag = t && t.tagName;
      if (tag !== 'INPUT' && tag !== 'SELECT' && tag !== 'TEXTAREA') return;
      e.preventDefault();
      if (t.hasAttribute('data-wz-new') && t.value.trim()) addGusto(); else next();
    });
    show(0, 0, true);
    return {step: () => step, data: () => { collect(); return san(d); }};
  }
  return {html, after, wizardHTML, bindWizard, pure: {lvl, statsOf, facts, weekLead, weekDays, cumpleInfo, cumpleMsg, common, nameIn}};
})();

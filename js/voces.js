/* Rumbo · Voces. Coral y Oreo como voces de los avisos, el saludo del perfil y los consejos del día.
   Depende de FRASES (frases.js), Mascotas (mascotas.js) y, en tiempo de ejecución, de lo que define app.js
   (S, save, fmt, ic, island, doAct, render...). La primera parte son funciones puras sin DOM. */
const Voces = (function () {
  'use strict';
  const F = FRASES, M = Mascotas, R = M.REDUCED;
  const q = (s, r = document) => r.querySelector(s), qq = (s, r = document) => [...r.querySelectorAll(s)];
  const NAMES = {coral: 'Coral', orio: 'Oreo'}, OTHER = {coral: 'orio', orio: 'coral'};
  const CATLAB = {saludo: 'Saludo', animo: 'Ánimo', chiste: 'Chiste', consejo: 'Consejito'};
  const TONO_TILE = {urgente: 'al', alegre: 'gd', calma: 'a1'};

  /* ===== Lógica pura ===== */
  const franjaDe = h => h < 5 ? 'madrugada' : h < 12 ? 'manana' : h < 19 ? 'tarde' : 'noche';
  const hashStr = s => { let h = 7; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); };
  const stable = (list, seed) => list[hashStr(String(seed)) % list.length];
  const nextIdx = (len, last) => { if (len < 2) return 0; let i; do { i = Math.floor(Math.random() * len); } while (i === last); return i; };
  const pick = a => a[Math.floor(Math.random() * a.length)];
  /* Rotación sin repetición consecutiva: nunca devuelve dos veces seguidas la misma frase de la misma lista (clave) */
  const lastSaid = {};
  function rot(list, key) {
    if (!list || !list.length) return '';
    if (list.length === 1) return list[0];
    let x, t = 0;
    do { x = pick(list); } while (x === lastSaid[key] && ++t < 20);
    lastSaid[key] = x; return x;
  }
  const dogOfProfile = p => p === 'D' ? 'orio' : 'coral';
  const nameOf = p => p === 'D' ? 'David' : 'Vale';
  /* Quién habla: los tipos «libres» los dice el perrito del perfil activo; los demás, su dueño por defecto */
  const speakerOf = (tipo, p) => tipo.libre ? dogOfProfile(p) : tipo.dog;
  const pendientesDe = (tasks, who) => tasks.filter(t => t.w === who && !t.done && t.when === 'Hoy').length;
  const saludoKind = fr => fr === 'manana' ? 'saludoM' : fr === 'tarde' ? 'saludoT' : 'saludoN';
  function subtitulo(p, fr, n, seed) {
    const b = F.perfil[p === 'D' ? 'david' : 'vale'].sub[fr], lst = n === 0 ? b.cero : n === 1 ? b.uno : b.varias;
    return stable(lst, seed).replace('{n}', n);
  }
  const spentIn = (moves, id) => moves.filter(m => m.cat === id).reduce((a, m) => a + m.a, 0);
  /* Avisos derivados de los datos reales; menor rank = más urgente */
  function alertsFrom(st, day, daysLeft) {
    const out = [];
    st.pays.filter(p => !p.paid).forEach(p => {
      const diff = p.d - day;
      if (diff < 0) out.push({kind: 'pagoAtrasado', key: 'pa' + p.id, rank: 0, title: `${p.n} lleva ${-diff} ${-diff === 1 ? 'día' : 'días'} vencido`, detail: `Venció el día ${p.d} · puede traer recargo`, amount: p.a, when: 'vencido', cta: 'Pagar ahora', act: {type: 'pay', id: p.id}});
      else if (diff <= 3) out.push({kind: 'pagoProx', key: 'pp' + p.id, rank: 1 + diff / 10, title: diff === 0 ? `${p.n} vence hoy` : diff === 1 ? `${p.n} vence mañana` : `${p.n} vence en ${diff} días`, detail: p.auto ? `Se registra solo el día ${p.d}` : `Pago recurrente · día ${p.d}`, amount: p.a, when: diff === 0 ? 'hoy' : `en ${diff} d`, cta: p.auto ? 'Ver pago' : 'Pagar ahora', act: p.auto ? {type: 'go', to: '#finanzas'} : {type: 'pay', id: p.id}});
    });
    st.tasks.filter(t => !t.done && t.when === 'Hoy').slice(0, 2).forEach(t => out.push({kind: 'tareaPend', key: 'tp' + t.id, rank: 2, title: `${t.n} sigue pendiente`, detail: `Le toca a ${t.w === 'V' ? 'Vale' : 'David'} · vale ${t.p} puntos`, amount: 0, when: 'hoy', cta: 'Marcar hecha', act: {type: 'task', id: t.id}}));
    st.goals.filter(g => !g.open && g.s >= g.t).forEach(g => out.push({kind: 'meta', key: 'mt' + g.id, rank: 3, title: `${g.n}: ¡meta completa!`, detail: 'Lo lograron juntos', amount: g.t, when: 'hoy', cta: 'Ver meta', act: {type: 'go', to: '#metas'}}));
    const rec = new Set(st.pays.map(p => p.cat));
    st.cats.filter(c => !c.saving && !rec.has(c.id) && c.b > 0).forEach(c => {
      const s = spentIn(st.moves, c.id);
      if (s / c.b >= .9) out.push({kind: 'presup', key: 'pr' + c.id, rank: 2.5, title: `${c.n}: te queda el ${Math.max(0, Math.round((1 - s / c.b) * 100))} %`, detail: `Faltan ${daysLeft} días del mes`, amount: Math.max(0, c.b - s), when: 'este mes', cta: 'Ver presupuesto', act: {type: 'go', to: '#finanzas'}});
    });
    const over = typeof Momentos !== 'undefined' ? Momentos.overBy(st.cats, st.moves) : 0;
    if (over > 0) out.push({kind: 'mesPasado', key: 'mp', rank: 2.7, title: 'Se pasaron del presupuesto', detail: 'Este mes se gastó más de lo presupuestado', amount: over, when: 'este mes', cta: 'Ver presupuesto', act: {type: 'go', to: '#finanzas'}});
    if (st.streak >= 7) out.push({kind: 'racha', key: 'rc', rank: 4, title: `${st.streak} días seguidos cumpliendo`, detail: 'Racha de uso de la casa', amount: 0, when: 'hoy', cta: 'Ver logros', act: {type: 'go', to: '#logros'}});
    return out.sort((a, b) => a.rank - b.rank);
  }
  /* Aviso guardado → tipo de frase (los guardados viejos no traen `kind`) */
  const kindOf = n => n.kind === 'auto' ? 'pagoHecho' : F.tipos[n.kind] ? n.kind : /terminó/i.test(n.title) ? 'tareaComp' : /vence/i.test(n.title) ? 'pagoProx' : /va en|ahorr|aporte/i.test(n.title) ? 'ahorro' : 'animo';
  const phraseFor = (kind, dog, seed) => stable(F.f[kind][dog], seed);
  /* Frase corta (cabe en la pastilla de confirmación) y quién la dice */
  const quote = (kind, dog) => { const l = F.f[kind][dog].filter(x => x.length <= 118); return rot(l.length ? l : F.f[kind][dog], 'q' + kind + dog); };
  const speakerFor = kind => speakerOf(F.tipos[kind], S.profile);

  /* Lista unificada del centro de avisos: derivados + guardados */
  function items() {
    const der = alertsFrom({pays: S.pays, tasks: S.tasks, goals: S.goals, cats: S.cats, moves: S.moves, streak: S.streak}, today, daysInMonth - today);
    const kinds = new Set(der.map(a => a.kind)), day = new Date().toDateString();
    const a = der.map(x => ({...x, text: x.detail, tone: TONO_TILE[F.tipos[x.kind].tono], icon: F.tipos[x.kind].icon, seed: x.key + day}));
    const b = S.notifs.map((n, i) => ({n, i, kind: kindOf(n)})).filter(o => !kinds.has(o.kind) || o.kind === 'pagoHecho')
      .map(o => ({kind: o.kind, title: o.n.title, text: o.n.text, when: o.n.when, tone: o.n.t, icon: o.n.i, np: o.n.act ? o.i : -1, npAct: o.n.act, seed: o.n.title + day}));
    return [...a, ...b];
  }

  /* ===== Render ===== */
  const nd = (n, i) => {
    const t = F.tipos[n.kind], sp = speakerOf(t, S.profile), co = OTHER[sp], amt = n.amount ? `<span class="mono nd-amt">${fmt(n.amount)}</span>` : '';
    const btn = n.np >= 0 ? `<button class="btn pri" data-np="${n.np}">${n.npAct}</button>`
      : n.act ? (n.act.type === 'go' ? `<button class="btn pri" data-go="${n.act.to}">${n.cta}</button>` : `<button class="btn pri" data-act="${n.act.type}" data-id="${n.act.id}">${n.cta}</button>`) : '';
    return `<article class="np-i nd" data-tono="${t.tono}" style="--i:${i}">
      ${tile(n.icon || t.icon, {urgente: 'al', alegre: 'gd', calma: 'a2'}[t.tono] || 'a1')}
      <div class="nd-b"><b><span>${n.title}</span>${amt}</b><p>${n.text || ''}</p>
        <div class="nd-f"><span class="when">${n.when || ''}</span>${btn}</div></div></article>`;
  };
  function panelHTML(list) {
    const head = `<div class="np-h"><b>Avisos de la casa</b><button class="pill c1" id="npAll">Cerrar</button></div>`;
    if (!list.length) return head + `<div class="np-i nd">${tile('ok', 'ok')}<div class="nd-b"><b><span>Todo al día</span></b><p>No tienen avisos pendientes.</p></div></div>`;
    return head + list.map(nd).join('');
  }
  function updateBell(list) {
    const el = q('#bellDog'); if (!el) return;
    const dog = dogOfProfile(S.profile), urgent = (list || items()).some(n => F.tipos[n.kind].tono === 'urgente');
    el.innerHTML = Avatares.dogSVG(dog, urgent ? (dog === 'coral' ? 'worried' : 'alert') : (Avatares.pure.isNight(new Date().getHours()) ? 'sleep' : 'happy'), 34);
  }
  function syncAvatars() {
    qq('.avatars .av').forEach(b => b.setAttribute('aria-pressed', b.dataset.p === S.profile)); Avatares.refreshHeader();
  }

  /* ===== Saludo del perfil (Inicio) ===== */
  let hDog = null, greetPending = false, hTimer = 0;
  const tapN = {coral: 0, orio: 0};
  function helloHTML() {
    const p = S.profile, dog = dogOfProfile(p), fr = franjaDe(new Date().getHours()), n = pendientesDe(S.tasks, p);
    const sub = subtitulo(p, fr, n, p + fr + n + new Date().toDateString());
    const d = new Date().toLocaleDateString('es-CO', {weekday: 'long', day: 'numeric', month: 'long'});
    return `<div class="view-head rv hello" style="--i:0"><div class="hello-tx"><div class="eyebrow">// ${d}</div><div class="hi">${F.saludoTexto[fr]}</div><h1><span class="hl">${nameOf(p)}</span></h1><p class="hsub">${sub}</p>
      <div class="hello-acts"><button class="pill c1" data-act="tips">${ic('bulb')}Consejos del día</button></div></div>
      <div class="hdog"><div class="bubble tg" id="hBub" role="status"></div><button class="dogbtn" id="hBtn" aria-label="Tocar a ${NAMES[dog]} para que te hable"><span class="hslot" id="hSlot"></span></button><div class="mdots" aria-hidden="true"><i></i><i></i><i></i></div></div></div>`;
  }
  const hSay = (tag, text, ms) => M.bubbleSay(q('#hBub'), NAMES[hDog.key], tag, text, ms);
  const hDots = () => qq('.mdots i').forEach((d, i) => d.classList.toggle('on', i === tapN[hDog.key] % 3));
  const calmExpr = key => key === 'coral' ? 'happy' : 'chill';
  function afterRender() {
    if (hDog) { M.dispose(hDog); hDog = null; clearTimeout(hTimer); }
    const host = q('#hSlot'); if (!host || document.body.classList.contains('locked')) return;
    const key = dogOfProfile(S.profile);
    hDog = M.mount(host, key, 'front', {bubble: q('#hBub'), expr: calmExpr(key)});
    hDots();
    if (!greetPending) return;
    greetPending = false;
    const dg = hDog, fr = franjaDe(new Date().getHours());
    if (!R.matches) {
      dg.f(dg.root, M.kf([[0,'translateY(0) scale(1,1)',M.E.out],[.3,'translateY(-16px) scale(.95,1.08)',M.E.in],[.62,'translateY(0) scale(1.1,.9)',M.E.out],[1,'translateY(0) scale(1)']]), 800);
      dg.f(dg.earL, M.wob(-22, 5), 800); dg.f(dg.earR, M.wob(22, 5), 800, {delay: 40});
    }
    hTimer = setTimeout(() => {
      if (dg.dead) return;
      dg.setExpr(key === 'coral' ? 'tender' : 'chill');
      const text = fr === 'madrugada' ? rot(F.madrugada[key], 'mad' + key) : rot(F.f[saludoKind(fr)][key], 's' + fr + key);
      hSay(CATLAB.saludo, text, 4800);
      if (key === 'coral') dg.hearts(3, 120, 70);
    }, R.matches ? 40 : 700);
  }
  function tapHello() {
    if (!hDog || hDog.dead) return;
    const key = hDog.key, c = ['animo', 'chiste', 'consejo'][tapN[key]++ % 3], list = F.ph[key][c], i = nextIdx(list.length, hDog.lastPhrase[c]);
    hDog.lastPhrase[c] = i;
    hSay(CATLAB[c], list[i], 5200);
    M.react(hDog, c === 'chiste' ? (key === 'coral' ? 'wink' : 'sly') : c === 'consejo' ? 'tender' : 'proud', 'alegre');
    hDog.hearts(key === 'coral' ? 4 : 3, 120, 70);
    clearTimeout(hTimer); const dg = hDog;
    hTimer = setTimeout(() => { if (!dg.dead) dg.setExpr(calmExpr(key)); }, 2600);
    hDots();
  }
  function greet() { greetPending = true; }

  /* ===== Llegada de avisos: pastilla en dúo ===== */
  const TIMING = {urgente: {land: 330, open: 700, react: 1250, quote: 1750}, alegre: {land: 520, open: 1000, react: 1500, quote: 2050}, calma: {land: 760, open: 1350, react: 1900, quote: 2400}};
  const arQ = []; let arBusy = false, runId = 0, cur = null, dogs = [];
  const wait = ms => new Promise(r => setTimeout(r, R.matches ? Math.min(ms, 40) : ms));
  const w = async (id, ms) => { await wait(ms); return id === runId; };
  function build(a, sp, co, phrase) {
    const t = F.tipos[a.kind], words = phrase.split(' ').map((x, k) => `<span class="qw" style="--i:${k}">${x} </span>`).join('');
    const host = q('#avw'); host.hidden = false;
    host.innerHTML = `<div class="aw pre" id="aw" data-tono="${t.tono}">
      <div class="aw-peek">${[co, sp].map(k => `<div class="aw-pk" data-dog="${k}"><button class="dogbtn" tabindex="-1" aria-label="Tocar a ${NAMES[k]}"><span class="dogslot"></span></button></div>`).join('')}</div>
      <span class="rip"></span><span class="rip"></span><span class="rip"></span><span class="vib l"></span><span class="vib r"></span><div class="ar-glow"></div>
      <div class="ai" id="ai">
        <div class="ai-top"><span class="ai-av">${M.miniSVG(sp, M.miniEx(t, sp), 34)}</span><span class="lbl">${t.chip}<small id="aiWho">${NAMES[sp]} y ${NAMES[co]} avisan</small></span><span class="tm">ahora</span></div>
        <div class="ai-body"><div class="ai-in"><div class="ai-pad" id="aiPad">
          <div class="nrow"><span class="ntile">${ic(t.icon)}</span><div class="tx"><b>${a.title}</b><span class="d">${a.detail}</span></div>${a.amount ? `<span class="amt mono">${fmt(a.amount)}</span>` : ''}</div>
          <p class="quote" style="--n:${phrase.split(' ').length}">${words}<em>${NAMES[sp]}</em></p>
          <div class="acts"><button class="b1" data-av="cta" tabindex="-1">${a.cta}</button><button class="b2" data-av="later" tabindex="-1">Luego</button></div>
        </div></div></div>
      </div><div class="arfx" id="arFx" aria-hidden="true"></div></div>`;
    dogs = qq('.aw-pk', host).map(pk => { const k = pk.dataset.dog, dg = M.mount(q('.dogslot', pk), k, 'peek'); dg.setExpr(M.exOf(t, k)); dg.pk = pk; return dg; });
  }
  function sparks(tono) {
    if (R.matches) return;
    const fx = q('#arFx'); if (!fx) return;
    const cols = ['#F2B458', '#FF9DAE', '#FFE2A8', '#8EE3B0', '#FFF4E0'], N = tono === 'alegre' ? 22 : tono === 'urgente' ? 8 : 6;
    for (let k = 0; k < N; k++) {
      let el; const sc = .6 + Math.random() * .9;
      if (tono === 'alegre' && k % 2) { el = document.createElement('span'); el.style.background = pick(cols); }
      else { el = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); el.setAttribute('viewBox', '-5 -5 10 10'); el.innerHTML = '<path d="M0-4.5Q.7-.7 4.5 0Q.7.7 0 4.5Q-.7.7-4.5 0Q-.7-.7 0-4.5Z"/>'; }
      el.style.left = (50 + (Math.random() - .5) * 70) + '%'; el.style.top = (30 + Math.random() * 40) + '%';
      fx.appendChild(el);
      const a = Math.random() * Math.PI * 2, d = 50 + Math.random() * 70;
      if (tono === 'urgente') { const sx = Math.cos(a) * (60 + Math.random() * 60), sy = Math.sin(a) * 30; el.animate([{opacity: 1, transform: 'translate(0,0) scale(.4)'}, {opacity: 1, transform: `translate(${sx * .6}px,${sy * .6}px) scale(${sc})`, offset: .3}, {opacity: 0, transform: `translate(${sx}px,${sy}px) scale(0)`}], {duration: 620 + Math.random() * 200, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'forwards'}); }
      else if (tono === 'calma') { const bx = (Math.random() - .5) * 90; el.animate([{opacity: 0, transform: 'translate(0,10px) scale(.2)'}, {opacity: .9, transform: `translate(${bx * .5}px,-18px) scale(${sc})`, offset: .4}, {opacity: 0, transform: `translate(${bx}px,-60px) scale(0)`}], {duration: 1900 + Math.random() * 700, delay: Math.random() * 300, easing: 'ease-out', fill: 'forwards'}); }
      else { el.animate([{opacity: 0, transform: 'translate(0,0) scale(0) rotate(0)'}, {opacity: 1, transform: `translate(${Math.cos(a) * d * .55}px,${Math.sin(a) * d * .55 - 20}px) scale(${sc}) rotate(120deg)`, offset: .35}, {opacity: 0, transform: `translate(${Math.cos(a) * d}px,${Math.sin(a) * d + 60}px) scale(.2) rotate(320deg)`}], {duration: 1000 + Math.random() * 600, delay: Math.random() * 120, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'forwards'}); }
    }
  }
  async function show(a) {
    const id = ++runId, t = F.tipos[a.kind], tn = t.tono, tm = TIMING[tn], sp = a.speaker || speakerOf(t, S.profile), co = OTHER[sp];
    cur = a; build(a, sp, co, rot(F.f[a.kind][sp], 'a' + a.kind + sp));
    const aw = q('#aw'), ai = q('#ai'), who = q('#aiWho'), spd = dogs.find(d => d.key === sp), cod = dogs.find(d => d.key === co);
    void aw.offsetWidth;
    if (!await w(id, 80)) return;
    aw.classList.remove('pre'); aw.classList.add('fall');
    if (!await w(id, tm.land)) return;
    aw.classList.add('land'); ai.classList.add('buzz');
    try { if (navigator.vibrate && navigator.userActivation && navigator.userActivation.hasBeenActive) navigator.vibrate(tn === 'urgente' ? [30, 40, 30] : [16]); } catch (e) { /* sin vibración */ }
    sparks(tn);
    if (!await w(id, tm.open - tm.land)) return;
    aw.classList.add('open'); qq('.ai-pad button', aw).forEach(b => { b.tabIndex = 0; }); qq('.dogbtn', aw).forEach(b => { b.tabIndex = 0; });
    if (!await w(id, tm.react - tm.open)) return;
    M.react(spd, M.exOf(t, sp), tn, {big: true}); who.textContent = `${NAMES[sp]}: ${rot(F.interj[tn][sp], 'i' + tn + sp)}`;
    if (!await w(id, tm.quote - tm.react)) return;
    q('#aiPad').classList.add('qgo'); M.react(cod, M.exOf(t, co), tn);
    setTimeout(() => { if (id === runId) who.textContent = `${NAMES[co]}: ${rot(F.interj[tn][co], 'i' + tn + co)}`; }, R.matches ? 40 : 1500);
    let held = 0;
    while (held < 8000) { if (!await w(id, 250)) return; if (!aw.matches(':hover,:focus-within')) held += 250; }
    closeAr(id);
  }
  async function closeAr(id, then) {
    if (id !== runId) return;
    runId++;
    const aw = q('#aw'); if (aw) aw.classList.remove('open');
    await wait(560); if (aw) aw.classList.add('out');
    await wait(480);
    dogs.forEach(M.dispose); dogs = [];
    const host = q('#avw'); host.hidden = true; host.innerHTML = '';
    arBusy = false; cur = null;
    if (then) then(); else setTimeout(next, 500);
  }
  function next() { if (arBusy) return; const a = arQ.shift(); if (!a) return; arBusy = true; show(a); }
  function enqueue(list) { arQ.push(...list); next(); }
  function clear() {
    arQ.length = 0; runId++; dogs.forEach(M.dispose); dogs = []; arBusy = false; cur = null;
    if (hDog) { M.dispose(hDog); hDog = null; clearTimeout(hTimer); }
    const host = q('#avw'); if (host) { host.hidden = true; host.innerHTML = ''; }
  }
  function runAct(act) {
    if (!act) return;
    if (act.type === 'go') location.hash = act.to;
    else if (typeof doAct === 'function') doAct(act.type, act.id, null);
  }
  /* Avisos al entrar: pagos automáticos reales (si no los vieron) y lo más urgente; máximo dos */
  /* ctx = {lead: avisos que van primero (vuelta), more: celebraciones (racha, día sin gastos, logros)} */
  function afterLogin(autoInfo, ctx) {
    const lead = [...((ctx && ctx.lead) || [])], more = (ctx && ctx.more) || [];
    if (autoInfo) lead.push({kind: 'pagoHecho', title: autoInfo.title, detail: autoInfo.detail, amount: 0, cta: 'Ver pagos', act: {type: 'go', to: '#finanzas'}});
    const der = alertsFrom({pays: S.pays, tasks: S.tasks, goals: S.goals, cats: S.cats, moves: S.moves, streak: S.streak}, today, daysInMonth - today);
    enqueue([...lead, ...der.filter(a => a.rank < 3), ...more, ...der.filter(a => a.rank >= 3)].slice(0, 2));
  }

  /* ===== Consejos y reflexión del día ===== */
  const TIPS = F.tips, REFLS = TIPS.map((t, i) => i).filter(i => TIPS[i].q);
  const doy = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 864e5);
  const tp = {cat: 'todos', i: REFLS[doy % REFLS.length], f: 0};
  const pool = () => TIPS.map((t, i) => i).filter(i => tp.cat === 'todos' || TIPS[i].c === tp.cat);
  function tipsHTML() {
    const r = TIPS[tp.i], rd = r.d, pl = pool(), f = TIPS[pl.includes(tp.f) ? tp.f : pl[0]], fd = f.d;
    return `<section class="rf"><div class="rf-dog" aria-hidden="true">${M.miniSVG(rd, 'tender', 56)}</div><div class="rf-tx"><small>Reflexión del día</small><p>«${r.t}»</p>${r.q ? `<p class="rf-q">${ic('spark')}<span>${r.q}</span></p>` : ''}<div class="rf-by">Lo dice ${NAMES[rd]} <button class="btn ghost" data-tp="refl">Otra reflexión</button></div></div></section>
      <div class="tp-chips" role="group" aria-label="Categoría de consejos">${[['todos', 'Todos'], ...Object.entries(F.cats)].map(([k, n]) => `<button class="chip" data-tp="cat" data-c="${k}" aria-pressed="${k === tp.cat}">${n}</button>`).join('')}</div>
      <section class="tp-feat"><div class="rf-dog" aria-hidden="true">${M.miniSVG(fd, fd === 'coral' ? 'happy' : 'alert', 48)}</div><div class="rf-tx"><small>Consejito de ${NAMES[fd]}</small><p>${f.t}</p><button class="btn pri" data-tp="tip">${ic('spark')}Otro consejo</button></div></section>`;
  }
  function openTips() {
    q('#tipsBody').innerHTML = tipsHTML(); q('#scrimTips').hidden = false;
    setTimeout(() => { const b = q('#tipsBody button'); b && b.focus(); }, 40);
  }
  const closeTips = () => { q('#scrimTips').hidden = true; };
  function tipsClick(e) {
    const b = e.target.closest('[data-tp]'); if (!b) return;
    const k = b.dataset.tp;
    if (k === 'refl') tp.i = REFLS[nextIdx(REFLS.length, REFLS.indexOf(tp.i))];
    else if (k === 'cat') { tp.cat = b.dataset.c; tp.f = pool()[0]; }
    else if (k === 'tip') { const pl = pool(); tp.f = pl[nextIdx(pl.length, pl.indexOf(tp.f))]; }
    q('#tipsBody').innerHTML = tipsHTML();
    const nb = q(`#tipsBody [data-tp="${k}"]${k === 'cat' ? `[data-c="${tp.cat}"]` : ''}`); nb && nb.focus();
  }

  /* ===== Perfil ===== */
  function setProfile(p) {
    if (p === S.profile) return;
    // v1.4: con la nube, cada uno entra con su cuenta; no se cambia de perfil desde adentro
    if (typeof Nube === 'object' && Nube.activo() && Nube.perfil() && p !== Nube.perfil()) { island({icon: 'lock', color: 'mu', title: `Entraste como ${nameOf(Nube.perfil())}`, sub: 'Para entrar como el otro, cierren sesión en Ajustes', dur: 3200}); syncAvatars(); return; }
    S.profile = p; save(); syncAvatars(); updateBell();
    const dog = dogOfProfile(p);
    if (current === 'inicio') { greetPending = true; render(false); }
    else island({icon: 'user', color: 'a1', title: `Hola, ${nameOf(p)}`, sub: 'Perfil activo', dur: 2200});
    if (current === 'perfil') render(false);
  }

  /* ===== Conexión con la página ===== */
  function init() {
    syncAvatars(); updateBell();
    q('.avatars').addEventListener('click', e => { const b = e.target.closest('.av[data-p]'); if (b) setProfile(b.dataset.p); });
    document.addEventListener('click', e => { if (e.target.closest('#hBtn')) tapHello(); });
    q('#avw').addEventListener('click', e => {
      const b = e.target.closest('[data-av]'), pk = e.target.closest('.aw-pk');
      if (b) { const a = cur; closeAr(runId, b.dataset.av === 'cta' ? () => { runAct(a && a.act); setTimeout(next, 700); } : null); return; }
      if (pk && cur) {
        const dg = dogs.find(d => d.pk === pk), t = F.tipos[cur.kind]; if (!dg) return;
        M.react(dg, M.exOf(t, dg.key), t.tono, {big: true}); q('#aiWho').textContent = `${NAMES[dg.key]}: ${rot(F.interj[t.tono][dg.key], 'i' + t.tono + dg.key)}`;
      }
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && cur) closeAr(runId); });
    q('#tipsBody').addEventListener('click', tipsClick);
    q('#closeTips').onclick = closeTips;
    q('#scrimTips').addEventListener('click', e => { if (e.target.id === 'scrimTips') closeTips(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !q('#scrimTips').hidden) closeTips(); });
  }

  return {init, items, panelHTML, updateBell, helloHTML, afterRender, greet, afterLogin, clear, openTips, setProfile, nameOf, dogOfProfile, phraseFor, quote, speakerFor, stable, rot,
    pure: {rot, franjaDe, subtitulo, alertsFrom, kindOf, speakerOf, pendientesDe}};
})();

/* Rumbo · Chat de la casa (v2.3). Burbuja flotante en todas las pantallas que abre un chat flotante con efecto cristal:
   - Conversación de Vale y David (cada uno ve lo del otro en vivo con la nube) y Coral/Oreo que ordenan y responden.
   - Rumbo aprende (aprende.js) clasifica cada mensaje y propone convertirlo con un toque (tarea, gasto, abono, paso del plan…).
   - Fotos, archivos, notas de voz, cámara (foto y video). Permisos solo al tocar; si los niegan se explica cómo activarlos.
   - Copiar cualquier mensaje. Avisos de no leídos en la burbuja.
   El fondo se desenfoca y oscurece mientras el chat está abierto: la atención queda en la conversación. */
const Apuntes = (function () {
  'use strict';
  const K = {tarea: ['check', 'a2', 'Tarea'], gasto: ['wallet', 'al', 'Gasto'], idea: ['bulb', 'gd', 'Idea'], plan: ['cal', 'a3', 'Plan'], meta: ['target', 'a1', 'Meta'],
    ajuste: ['sliders', 'mu', 'Ajuste'], nota: ['chat', 'mu', 'Mensaje'], pregunta: ['info', 'a1', 'Pregunta'], respuesta: ['chat', 'a1', 'Respuesta']};
  const FILTROS = [['todo', 'Todo'], ['tarea', 'Tareas'], ['gasto', 'Gastos'], ['idea', 'Ideas'], ['plan', 'Planes'], ['archivos', 'Archivos'], ['fav', 'Guardados']];
  const EJEMPLOS = ['Gasté 45 mil en cine', 'Hay que bañar a Coral y Oreo el sábado', 'Idea: noche de pizza los domingos', '¿Cuánto nos queda este mes?'];
  const VISTO = 'hogar:v1:chat-visto';
  const uid = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const pad = n => String(n).padStart(2, '0');
  const hora = s => { const d = new Date(s); return isNaN(d) ? '' : d.toLocaleTimeString('es-CO', {hour: 'numeric', minute: '2-digit'}); };
  const diaLbl = s => { const d = new Date(s); if (isNaN(d)) return ''; const h = new Date(), a = new Date(h.getFullYear(), h.getMonth(), h.getDate()), b = new Date(d.getFullYear(), d.getMonth(), d.getDate()), k = Math.round((a - b) / 864e5); return k === 0 ? 'Hoy' : k === 1 ? 'Ayer' : d.toLocaleDateString('es-CO', {weekday: 'long', day: 'numeric', month: 'short'}); };
  const dur = s => `${Math.floor(s / 60)}:${pad(Math.floor(s % 60))}`;
  const kb = n => n > 1048576 ? (n / 1048576).toFixed(1).replace('.', ',') + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB';
  const dogOf = w => w === 'D' ? 'orio' : 'coral';
  const otro = () => S.profile === 'D' ? 'V' : 'D', nom = w => w === 'D' ? 'David' : 'Vale';
  // Ícono propio: burbuja de chat con la huella de Coral y Oreo
  const ICONO = `<svg class="cht-ico" viewBox="0 0 32 32" aria-hidden="true"><path d="M16 4C9 4 3.5 8.6 3.5 14.4c0 3.2 1.7 6.1 4.4 8l-1.2 4.8 5.3-2.8c1.3.4 2.6.5 4 .5 7 0 12.5-4.6 12.5-10.4S23 4 16 4z" fill="currentColor"/><g fill="var(--ch-paw,#fff)"><ellipse cx="16" cy="16.6" rx="3.6" ry="3"/><circle cx="11.6" cy="12.6" r="1.6"/><circle cx="14.4" cy="10.6" r="1.6"/><circle cx="17.6" cy="10.6" r="1.6"/><circle cx="20.4" cy="12.6" r="1.6"/></g></svg>`;
  let filtro = 'todo', busca = '', urls = new Map(), abierto = false, vistos = 0;

  /* ===== Clasificación y acciones ===== */
  const ctx = () => ({cats: S.cats, hoy: new Date()});
  const info = n => n.by === 'bot' ? null : Aprende.clasificar(n.t, ctx());
  function acciones(n) {
    if (n.by === 'bot' || n.conv || n.k === 'pregunta' || !n.t || (n.k === 'nota' && !info(n).monto)) return '';
    const c = info(n), g = Aprende.metaDe(n.t, S.goals), b = (a, t, i) => `<button class="cht-act" data-ch="${a}" data-id="${esc(n.id)}">${ic(i)}${t}</button>`;
    const cat = c.cat && S.cats.find(x => x.id === c.cat), L = [];
    if (n.k === 'tarea') L.push(b('tarea', 'Crear tarea' + (c.quien === 'D' ? ' para David' : c.quien === 'V' ? ' para Vale' : ''), 'check'));
    if (n.k === 'gasto') L.push(c.monto ? b('gasto', `Registrar ${fmt(c.monto)}${cat ? ' · ' + esc(cat.n.split(' (')[0]) : ''}`, 'wallet') : b('gastoForm', 'Registrar gasto', 'wallet'));
    if (n.k === 'meta') L.push(g && c.monto ? b('abono', `Abonar ${fmt(c.monto)} a ${esc(g.n)}`, 'trend') : b('metaNueva', 'Crear meta', 'target'));
    if (n.k === 'plan') L.push(g ? b('paso', `Al plan de ${esc(g.n)}`, 'cal') : b('proyecto', 'Volverlo proyecto', 'target'));
    if (n.k === 'idea') { L.push(b('proyecto', 'Volverla proyecto', 'target')); L.push(b('tarea', 'Volverla tarea', 'check')); }
    if (n.k === 'ajuste') L.push(b('topes', 'Abrir topes', 'sliders'));
    if (n.k === 'nota' && c.monto) L.push(b('gasto', `¿Gasto de ${fmt(c.monto)}?`, 'wallet'));
    return L.length ? `<div class="cht-acts">${L.join('')}</div>` : '';
  }
  function convertir(act, n) {
    const c = info(n) || {}, t = c.titulo || n.t.slice(0, 80);
    if (act === 'tarea') {
      const w = c.quien === 'D' ? 'D' : c.quien === 'V' ? 'V' : S.profile, hoy = c.fecha && new Date().toDateString() === c.fecha.toDateString();
      const tk = {id: uid('t_'), n: t, i: 'check', w, p: 10, when: hoy ? 'Hoy' : 'Pendientes', rep: 'Una vez', done: false}; S.tasks.push(tk); n.conv = {tipo: 'tarea', id: tk.id};
      save(); pintar(); render(false); island({icon: 'check', color: 'ok', title: 'Quedó como tarea', sub: `${t} · para ${nom(w)}`, dur: 3200});
    } else if (act === 'gasto') {
      const cat = c.cat || 'g_17', mv = {n: t.slice(0, 40), cat: S.cats.some(x => x.id === cat) ? cat : S.cats[0].id, a: c.monto, d: new Date().getDate(), w: S.profile};
      S.moves.push(mv); n.conv = {tipo: 'gasto', id: ''}; save(); pintar(); render(false);
      island({icon: 'wallet', color: 'a1', title: `${fmt(mv.a)} registrados`, sub: (S.cats.find(x => x.id === mv.cat) || {}).n || '', action: 'Deshacer', dur: 5200, onAction: () => { const k = S.moves.indexOf(mv); if (k >= 0) S.moves.splice(k, 1); delete n.conv; save(); pintar(); render(false); }});
    } else if (act === 'gastoForm') { cerrar(); if (typeof openSheet === 'function') openSheet('gasto'); }
    else if (act === 'abono') { const g = Aprende.metaDe(n.t, S.goals); if (g && c.monto) { doAct('abono', g.id, null, c.monto); n.conv = {tipo: 'abono', id: g.id}; save(); pintar(); } }
    else if (act === 'metaNueva') { cerrar(); if (typeof MetaPlan === 'object') MetaPlan.create(); }
    else if (act === 'paso') {
      const g = Aprende.metaDe(n.t, S.goals); if (!g) return;
      g.plan = g.plan || {tipo: 'otro', lugar: '', nota: '', costos: [], itin: [], fotos: [], cover: ''}; g.plan.itin = g.plan.itin || [];
      g.plan.itin.push({id: uid('i'), n: t, d: c.fecha ? c.fecha.toLocaleDateString('es-CO', {day: 'numeric', month: 'short'}) : '', done: false}); n.conv = {tipo: 'paso', id: g.id}; save(); pintar();
      island({icon: 'cal', color: 'a3', title: `Al plan de ${g.n}`, sub: t, action: 'Ver', dur: 4200, onAction: () => { cerrar(); setTimeout(() => MetaPlan.open(g.id), 60); }});
    } else if (act === 'proyecto') {
      const due = c.fecha ? `${c.fecha.getFullYear()}-${pad(c.fecha.getMonth() + 1)}-${pad(c.fecha.getDate())}` : '';
      const pj = {id: uid('pj'), n: t.slice(0, 60), i: 'target', w: c.quien || 'A', due, why: '', done: false, steps: []}; S.projs.push(pj); n.conv = {tipo: 'proyecto', id: pj.id};
      save(); pintar(); render(false); island({icon: 'target', color: 'a2', title: 'Nuevo proyecto', sub: pj.n, action: 'Ver', dur: 4200, onAction: () => { cerrar(); location.hash = '#tareas'; }});
    } else if (act === 'topes') { cerrar(); if (typeof Cuentas === 'object') Cuentas.open('topes'); }
  }
  const convTxt = n => ({tarea: 'Ya es tarea', gasto: 'Gasto registrado', abono: 'Abonado a la meta', paso: 'Está en el plan de la meta', proyecto: 'Ya es proyecto'})[n.conv.tipo] || 'Listo';

  /* ===== Mensajes ===== */
  function attHTML(a) {
    const u = urls.get(a.id), cls = `cht-att ${({img: "cht-img", audio: "cht-audio", video: "cht-video"})[a.tipo] || "cht-file"}`;
    if (a.tipo === 'img') return `<button class="${cls}" data-ch="ver" data-att="${esc(a.id)}" aria-label="Ver foto">${u ? `<img src="${u}" alt="">` : '<span class="cu-spin"></span>'}</button>`;
    if (a.tipo === 'audio') return `<div class="${cls}" data-att="${esc(a.id)}">${u ? `<audio controls preload="metadata" src="${u}"></audio>` : '<span class="cu-spin"></span>'}<small>${a.dur ? dur(a.dur) : ''}</small></div>`;
    if (a.tipo === 'video') return `<div class="${cls}" data-att="${esc(a.id)}">${u ? `<video controls playsinline preload="metadata" src="${u}"></video>` : '<span class="cu-spin"></span>'}</div>`;
    return `<div class="${cls}" data-att="${esc(a.id)}">${ic('doc')}<span><b>${esc(a.nombre)}</b><small>${kb(a.size)}</small></span>${u ? `<a class="cht-dl" href="${u}" download="${esc(a.nombre)}" aria-label="Descargar">${ic('arrow')}</a>` : ''}</div>`;
  }
  function msgHTML(n, prev) {
    const bot = n.by === 'bot', mine = !bot && n.by === S.profile, [ki, , kn] = K[n.k] || K.nota, c = !bot && n.k !== 'pregunta' ? info(n) : null;
    const seguido = prev && prev.by === n.by && (new Date(n.at) - new Date(prev.at)) < 5 * 60000;
    const who = bot ? Avatares.dogSVG(dogOf(S.profile), 'happy', 30) : Avatares.head(n.by, 30, 'happy', '', true);
    const meta = c ? [c.monto && n.k === 'gasto' ? fmt(c.monto) : '', c.fecha ? c.fecha.toLocaleDateString('es-CO', {weekday: 'short', day: 'numeric'}) : '', n.k === 'tarea' && c.quien === 'D' ? 'para David' : n.k === 'tarea' && c.quien === 'V' ? 'para Vale' : ''].filter(Boolean).join(' · ') : '';
    const etiqueta = bot ? `<span class="cht-who">${S.profile === 'D' ? 'Oreo' : 'Coral'}</span>` : !mine && !seguido ? `<span class="cht-who">${nom(n.by)}</span>` : '';
    const tipo = !bot && n.k !== 'nota' ? `<span class="cht-kind k-${n.k}">${ic(ki)}${kn}${meta ? ' · ' + esc(meta) : ''}</span>` : '';
    return `<div class="cht-msg ${bot ? 'bot' : mine ? 'mine' : 'theirs'} ${n.by === 'D' ? 'd' : n.by === 'V' ? 'v' : ''}${seguido ? ' seguido' : ''}" data-nid="${esc(n.id)}">
      <span class="cht-av">${seguido ? '' : who}</span>
      <div class="cht-bub">${etiqueta}${tipo}
        ${n.t ? `<p class="cht-tx">${esc(n.t).replace(/\n/g, '<br>')}</p>` : ''}
        ${(n.att || []).length ? `<div class="cht-atts">${n.att.map(attHTML).join('')}</div>` : ''}
        ${n.cargando ? `<span class="cht-up"><span class="cu-spin" aria-hidden="true"></span>Guardando…</span>` : ''}
        ${n.conv ? `<span class="cht-done">${ic('ok')}${convTxt(n)}</span>` : acciones(n)}
        <div class="cht-foot"><time>${hora(n.at)}</time>
          ${n.t ? `<button class="cht-i" data-ch="copiar" data-id="${esc(n.id)}" aria-label="Copiar mensaje" title="Copiar">${ic('copy')}</button>` : ''}
          ${bot ? '' : `<button class="cht-i${n.fav ? ' on' : ''}" data-ch="fav" data-id="${esc(n.id)}" aria-pressed="${!!n.fav}" aria-label="Guardar" title="Guardar">${ic('star')}</button>`}
          ${bot || mine ? `<button class="cht-i" data-ch="mas" data-id="${esc(n.id)}" aria-label="Más opciones" title="Más">${ic('sliders')}</button>` : ''}
        </div>
        ${!bot && mine ? `<div class="cht-more" hidden><label>Es un(a) <select data-ch-k="${esc(n.id)}">${Object.keys(K).filter(k => k !== 'respuesta').map(k => `<option value="${k}"${k === n.k ? ' selected' : ''}>${K[k][2]}</option>`).join('')}</select></label><button class="cht-act del" data-ch="del" data-id="${esc(n.id)}">${ic('trash')}Borrar</button></div>` : bot ? `<div class="cht-more" hidden><button class="cht-act del" data-ch="del" data-id="${esc(n.id)}">${ic('trash')}Borrar</button></div>` : ''}
      </div></div>`;
  }
  const cuenta = k => (S.notas || []).filter(n => k === 'todo' ? n.by !== 'bot' : k === 'fav' ? n.fav : k === 'archivos' ? (n.att || []).length : n.k === k).length;
  function lista() {
    const q2 = Aprende.pure.quitar(busca);
    const ns = (S.notas || []).filter(n => (filtro === 'todo' || (filtro === 'fav' ? n.fav : filtro === 'archivos' ? (n.att || []).length : n.k === filtro)) && (!q2 || Aprende.pure.quitar(n.t).includes(q2)));
    if (!ns.length) return (S.notas || []).length ? `<p class="cht-empty">Nada por aquí con ese filtro.</p>` : bienvenida();
    let last = '', h = '', prev = null;
    ns.forEach(n => { const d = diaLbl(n.at); if (d !== last) { h += `<div class="cht-day"><span>${esc(d)}</span></div>`; last = d; prev = null; } h += msgHTML(n, prev); prev = n; });
    return h;
  }
  function bienvenida() {
    const dog = S.profile === 'D' ? 'Oreo' : 'Coral';
    return `<div class="cht-hello"><span class="cht-hello-dog">${Avatares.dogSVG(dogOf(S.profile), 'happy', 64)}</span>
      <b>El chat de la casa</b><p>Escríbanse aquí, tú y ${nom(otro())}. ${dog} ordena lo que digan: tareas, gastos, ideas y planes se convierten con un toque. Y si preguntan, responde con sus números.</p>
      <div class="cht-ej">${EJEMPLOS.map(e => `<button data-ch="ej" data-t="${esc(e)}">${esc(e)}</button>`).join('')}</div></div>`;
  }

  /* ===== Burbuja y panel ===== */
  let fab = null, pnl = null, scrim = null;
  function construir() {
    if (fab) return;
    fab = document.createElement('button'); fab.className = 'cht-fab'; fab.id = 'chFab'; fab.type = 'button';
    fab.setAttribute('aria-label', 'Abrir el chat de la casa'); fab.setAttribute('aria-expanded', 'false'); fab.setAttribute('aria-controls', 'chPanel');
    fab.innerHTML = `${ICONO}<b class="cht-badge" hidden>0</b>`;
    scrim = document.createElement('div'); scrim.className = 'cht-scrim'; scrim.hidden = true;
    pnl = document.createElement('section'); pnl.className = 'cht-panel'; pnl.id = 'chPanel'; pnl.hidden = true;
    pnl.setAttribute('role', 'dialog'); pnl.setAttribute('aria-modal', 'true'); pnl.setAttribute('aria-labelledby', 'chT');
    pnl.innerHTML = `<header class="cht-hd"><span class="cht-duo">${Avatares.head('V', 34, 'happy', '', true)}${Avatares.head('D', 34, 'happy', '', true)}</span>
        <div class="cht-ht"><h2 id="chT">Chat de la casa</h2><span>Vale y David · Coral y Oreo ordenan</span></div>
        <button class="cht-i" data-ch="buscar" aria-label="Buscar y filtrar" aria-expanded="false" title="Buscar y filtrar">${ic('sliders')}</button>
        <button class="cht-i" data-ch="cerrar" aria-label="Cerrar el chat" title="Cerrar">${ic('x')}</button></header>
      <div class="cht-tools" id="chTools" hidden><label class="cht-search">${ic('info')}<input type="search" id="chBusca" placeholder="Buscar en el chat" autocomplete="off"></label>
        <div class="cht-filtros" role="group" aria-label="Filtrar">${FILTROS.map(([k, t]) => `<button data-ch-f="${k}" aria-pressed="${filtro === k}">${t}<b>0</b></button>`).join('')}</div></div>
      <div class="cht-list" id="chList" aria-live="polite"></div>
      <div class="cht-comp">
        <div class="cht-pend" id="chPend" hidden></div>
        <div class="cht-recbar" id="chRec" hidden><span class="cht-dot"></span><b id="chRecT">0:00</b><span class="cht-wave" aria-hidden="true">${'<i></i>'.repeat(14)}</span><button class="cht-i" data-chc="recCancel" aria-label="Cancelar grabación">${ic('x')}</button><button class="cht-send" data-chc="recStop" aria-label="Terminar y adjuntar">${ic('ok')}</button></div>
        <div class="cht-row" id="chRow">
          <button class="cht-i" data-chc="mas" aria-expanded="false" aria-label="Adjuntar">${ic('plus')}</button>
          <div class="cht-menu" id="chMenu" hidden role="menu">
            <button role="menuitem" data-chc="foto">${ic('cam')}Tomar foto</button><button role="menuitem" data-chc="video">${ic('video')}Grabar video</button>
            <button role="menuitem" data-chc="galeria">${ic('clip')}Foto o video de la galería</button><button role="menuitem" data-chc="archivo">${ic('doc')}Archivo</button></div>
          <textarea id="chTx" rows="1" maxlength="1000" placeholder="Escribe o anota algo…" aria-label="Escribir mensaje"></textarea>
          <button class="cht-i" data-chc="voz" aria-label="Grabar nota de voz">${ic('mic')}</button>
          <button class="cht-send" data-chc="enviar" aria-label="Enviar">${ic('send')}</button></div>
        <input type="file" id="chFile" hidden multiple><input type="file" id="chGal" accept="image/*,video/*" hidden multiple></div>`;
    document.body.append(scrim, pnl, fab);
    fab.addEventListener('click', () => abierto ? cerrar() : abrir());
    scrim.addEventListener('click', cerrar);
    pnl.addEventListener('click', onClick);
    pnl.addEventListener('change', onChange);
    pnl.addEventListener('input', e => {
      if (e.target.id === 'chBusca') { busca = e.target.value; clearTimeout(construir.t); construir.t = setTimeout(pintar, 180); }
      if (e.target.id === 'chTx') { const tx = e.target; tx.style.height = 'auto'; tx.style.height = Math.min(120, tx.scrollHeight) + 'px'; }
    });
    pnl.querySelector('#chTx').addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && matchMedia('(hover:hover)').matches) { e.preventDefault(); mandar(); } });
    pnl.querySelector('#chFile').addEventListener('change', e => { agregarArchivos(e.target.files); e.target.value = ''; });
    pnl.querySelector('#chGal').addEventListener('change', e => { agregarArchivos(e.target.files); e.target.value = ''; });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && abierto && !document.querySelector('.ap-cam, .cu-lb')) cerrar(); });
  }
  const q = s => pnl.querySelector(s);
  function abrir() {
    construir(); if (abierto) return; abierto = true;
    // Despeja los avisos en pantalla (pago próximo, perritos) para que la atención quede en el chat
    try { Voces.callar(); } catch (e) {} try { if (typeof cheerOff === 'function') cheerOff(); } catch (e) {}
    scrim.hidden = false; pnl.hidden = false; fab.setAttribute('aria-expanded', 'true'); fab.classList.add('open'); document.body.classList.add('cht-on');
    q('#chTx').placeholder = `Escríbele a ${nom(otro())}…`;
    pintar(true); marcarVisto();
    setTimeout(() => { if (matchMedia('(hover:hover)').matches) q('#chTx').focus({preventScroll: true}); }, 80);
  }
  function cerrar() {
    if (!abierto) return; abierto = false; if (rec) parar(true);
    pnl.classList.add('saliendo'); scrim.classList.add('saliendo'); fab.classList.remove('open'); fab.setAttribute('aria-expanded', 'false'); document.body.classList.remove('cht-on');
    setTimeout(() => { if (abierto) return; pnl.hidden = true; scrim.hidden = true; pnl.classList.remove('saliendo'); scrim.classList.remove('saliendo'); }, T(260));
    q('#chMenu').hidden = true; badge();
  }
  const abajo = () => { const l = q('#chList'); requestAnimationFrame(() => { l.scrollTop = l.scrollHeight; }); };
  function pintar(alFondo) {
    if (!pnl || !abierto) { badge(); return; }
    const l = q('#chList'), cerca = l.scrollTop + l.clientHeight >= l.scrollHeight - 120;
    l.innerHTML = lista(); cargar(l);
    pnl.querySelectorAll('[data-ch-f] b').forEach(b => { b.textContent = cuenta(b.parentElement.dataset.chF); });
    if (alFondo === true || cerca) abajo();
    marcarVisto();
  }
  // No leídos: mensajes del otro desde la última vez que se abrió el chat en este aparato
  const visto = () => { try { return localStorage.getItem(VISTO) || ''; } catch (e) { return ''; } };
  function marcarVisto() { try { localStorage.setItem(VISTO, new Date().toISOString()); } catch (e) {} badge(); }
  function badge() {
    if (!fab) return;
    const v = visto(), n = abierto ? 0 : (S.notas || []).filter(x => x.by === otro() && x.at > v).length, b = fab.querySelector('.cht-badge');
    b.hidden = !n; b.textContent = n > 9 ? '9+' : n;
    if (n > vistos) { fab.classList.remove('ping'); void fab.offsetWidth; fab.classList.add('ping'); }
    vistos = n; fab.setAttribute('aria-label', n ? `Abrir el chat de la casa: ${n} ${n === 1 ? 'mensaje nuevo' : 'mensajes nuevos'} de ${nom(otro())}` : 'Abrir el chat de la casa');
  }
  function cargar(root) {
    root.querySelectorAll('[data-att]').forEach(el => {
      const id = el.dataset.att; if (urls.has(id) || el.dataset.loading) return; el.dataset.loading = '1';
      Cuentas.archivo(id).then(f => {
        if (!f || !f.blob) { el.classList.add('falta'); el.innerHTML = `${ic('info')}<small>Este archivo quedó en el otro aparato</small>`; return; }
        urls.set(id, URL.createObjectURL(f.blob)); const n = (S.notas || []).find(x => (x.att || []).some(a => a.id === id)), a = n && n.att.find(x => x.id === id);
        if (a) { const tmp = document.createElement('div'); tmp.innerHTML = attHTML(a); el.replaceWith(tmp.firstElementChild); }
      }).catch(() => {});
    });
  }

  /* ===== Enviar ===== */
  async function enviar(texto, adjuntos) {
    texto = String(texto || '').trim(); adjuntos = adjuntos || [];
    if (!texto && !adjuntos.length) return;
    const c = texto ? Aprende.clasificar(texto, ctx()) : {tipo: 'nota'};
    const n = {id: uid('n'), t: texto.slice(0, 1000), k: adjuntos.length && !texto ? 'nota' : c.tipo, at: new Date().toISOString(), by: S.profile, att: [], hecho: false, fav: false, cargando: adjuntos.length};
    S.notas = S.notas || []; S.notas.push(n);
    if (n.k === 'pregunta') { const r = Aprende.responder(texto, S, new Date()); S.notas.push({id: uid('n'), t: r.texto, k: 'respuesta', at: new Date(Date.now() + 1).toISOString(), by: 'bot', att: [], hecho: false, fav: false}); }
    if (S.notas.length > 400) S.notas.splice(0, S.notas.length - 400);
    save(); filtro = 'todo'; pintar(true);
    if (!adjuntos.length) return;
    for (const a of adjuntos) {
      const id = uid('na');
      try { await Cuentas.guardarArchivo(id, {blob: a.blob, tipo: a.tipo, nombre: a.nombre}); n.att.push({id, tipo: a.tipo, nombre: a.nombre, size: a.blob.size, dur: a.dur || 0, nube: a.blob.size < 900000}); urls.set(id, URL.createObjectURL(a.blob)); }
      catch (e) { island({icon: 'alert', color: 'alert', title: 'No se pudo guardar el archivo', sub: e.message || '', dur: 4000}); }
    }
    delete n.cargando; save(); pintar(true);
    if (n.att.some(a => a.size >= 900000)) island({icon: 'info', color: 'mu', title: 'Archivo pesado', sub: 'Se ve en este aparato; al otro le llegan los de menos de 900 KB', dur: 4200});
  }

  /* ===== Adjuntos, voz y cámara ===== */
  let pend = [], rec = null, cam = null;
  function pintarPend() {
    const p = q('#chPend'); p.hidden = !pend.length;
    p.innerHTML = pend.map((a, i) => `<span class="cht-chip">${a.tipo === 'img' && a.url ? `<img src="${a.url}" alt="">` : ic(a.tipo === 'audio' ? 'mic' : a.tipo === 'video' ? 'video' : 'doc')}<small>${a.tipo === 'audio' ? 'Voz ' + dur(a.dur || 0) : esc(a.nombre.slice(0, 16))}</small><button data-chc="quitar" data-i="${i}" aria-label="Quitar">${ic('x')}</button></span>`).join('');
  }
  const tipoDe = f => /^image\//.test(f.type) ? 'img' : /^audio\//.test(f.type) ? 'audio' : /^video\//.test(f.type) ? 'video' : 'file';
  function achicar(file) {
    return new Promise((res, rej) => {
      const u = URL.createObjectURL(file), im = new Image();
      im.onload = () => { const k = Math.min(1, 1600 / Math.max(im.naturalWidth, im.naturalHeight)), cv = document.createElement('canvas'); cv.width = Math.round(im.naturalWidth * k); cv.height = Math.round(im.naturalHeight * k); cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height); URL.revokeObjectURL(u); cv.toBlob(b => b ? res(b) : rej(new Error('img')), 'image/jpeg', .82); };
      im.onerror = () => { URL.revokeObjectURL(u); rej(new Error('img')); }; im.src = u;
    });
  }
  async function agregarArchivos(list) {
    for (const f of Array.from(list || [])) {
      if (f.size > 25e6) { island({icon: 'alert', color: 'alert', title: 'Muy pesado', sub: `${f.name} pasa de 25 MB`, dur: 3600}); continue; }
      let blob = f, tipo = tipoDe(f), nombre = f.name || 'archivo';
      if (tipo === 'img' && !/hei[cf]/i.test(f.type + f.name)) { try { blob = await achicar(f); nombre = nombre.replace(/\.[a-z0-9]+$/i, '') + '.jpg'; } catch (e) {} }
      pend.push({blob, tipo, nombre, url: tipo === 'img' ? URL.createObjectURL(blob) : ''});
    }
    pintarPend();
  }
  function mandar() {
    const tx = q('#chTx'), t = tx.value, ad = pend.slice();
    if (!t.trim() && !ad.length) { tx.focus(); return; }
    tx.value = ''; tx.style.height = 'auto'; pend = []; pintarPend(); enviar(t, ad);
  }
  function permisoError(e, que) {
    const n = e && e.name;
    const sub = n === 'NotAllowedError' ? `Den permiso de ${que}: en iPhone, Ajustes → Safari → ${que === 'micrófono' ? 'Micrófono' : 'Cámara'} → Permitir (en el computador, en el candado junto a la dirección).`
      : n === 'NotFoundError' ? `Este aparato no tiene ${que} disponible.` : !navigator.mediaDevices ? 'Este navegador no deja usarlo aquí. Funciona desde la página publicada (https).' : (e && e.message) || 'Intenten de nuevo.';
    island({icon: 'alert', color: 'alert', title: `Sin acceso al ${que}`, sub, dur: 7000});
  }
  const mime = cands => (window.MediaRecorder && cands.find(m => MediaRecorder.isTypeSupported(m))) || '';
  async function voz() {
    if (rec) return;
    let stream; try { stream = await navigator.mediaDevices.getUserMedia({audio: true}); } catch (e) { permisoError(e, 'micrófono'); return; }
    const mt = mime(['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg']), chunks = [], t0 = Date.now();
    let mr; try { mr = new MediaRecorder(stream, mt ? {mimeType: mt} : undefined); } catch (e) { stream.getTracks().forEach(t => t.stop()); permisoError(e, 'micrófono'); return; }
    rec = {mr, cancel: false, tick: setInterval(() => { const s = (Date.now() - t0) / 1000; q('#chRecT').textContent = dur(s); if (s >= 180) parar(); }, 250)};
    mr.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
    mr.onstop = () => {
      clearInterval(rec.tick); stream.getTracks().forEach(t => t.stop()); const r = rec; rec = null;
      q('#chRec').hidden = true; q('#chRow').hidden = false;
      if (r.cancel || !chunks.length) return;
      const type = (mr.mimeType || mt || 'audio/webm').split(';')[0], ext = /mp4/.test(type) ? 'm4a' : /ogg/.test(type) ? 'ogg' : 'webm';
      pend.push({blob: new Blob(chunks, {type}), tipo: 'audio', nombre: `nota-de-voz.${ext}`, dur: Math.round((Date.now() - t0) / 1000)}); pintarPend();
    };
    mr.start(250); q('#chRec').hidden = false; q('#chRow').hidden = true;
  }
  function parar(cancel) { if (!rec) return; rec.cancel = !!cancel; try { rec.mr.stop(); } catch (e) {} }
  async function camara(modo) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { const g = q('#chGal'); g.setAttribute('capture', 'environment'); g.click(); g.removeAttribute('capture'); return; }
    const ov = document.createElement('div'); ov.className = 'ap-cam'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-label', modo === 'video' ? 'Grabar video' : 'Tomar foto');
    ov.innerHTML = `<video playsinline muted autoplay></video><div class="ap-cam-top"><button class="cht-i" data-cam="x" aria-label="Cerrar">${ic('x')}</button><b class="ap-cam-t">${modo === 'video' ? 'Video · máx. 30 s' : 'Foto'}</b><button class="cht-i" data-cam="girar" aria-label="Cambiar cámara">${ic('repeat')}</button></div>
      <div class="ap-cam-bot"><button class="ap-shutter ${modo === 'video' ? 'vid' : ''}" data-cam="disparo" aria-label="${modo === 'video' ? 'Grabar' : 'Tomar foto'}"><i></i></button></div>`;
    document.body.appendChild(ov);
    cam = {ov, facing: 'environment', stream: null, mr: null};
    const start = async () => {
      if (cam.stream) cam.stream.getTracks().forEach(t => t.stop());
      try { cam.stream = await navigator.mediaDevices.getUserMedia({video: {facingMode: cam.facing, width: {ideal: 1280}}, audio: modo === 'video'}); }
      catch (e) { cerrarCam(); permisoError(e, 'cámara'); return false; }
      const v = ov.querySelector('video'); v.srcObject = cam.stream; try { await v.play(); } catch (e) {} return true;
    };
    if (!(await start())) return;
    ov.addEventListener('click', e => {
      const b = e.target.closest('[data-cam]'); if (!b || !cam) return; const k = b.dataset.cam;
      if (k === 'x') cerrarCam();
      else if (k === 'girar') { cam.facing = cam.facing === 'environment' ? 'user' : 'environment'; start(); }
      else if (modo !== 'video') {
        const v = ov.querySelector('video'), cv = document.createElement('canvas'), k2 = Math.min(1, 1600 / Math.max(v.videoWidth, v.videoHeight));
        cv.width = Math.round(v.videoWidth * k2); cv.height = Math.round(v.videoHeight * k2); cv.getContext('2d').drawImage(v, 0, 0, cv.width, cv.height);
        cv.toBlob(bl => { if (bl) { pend.push({blob: bl, tipo: 'img', nombre: 'foto.jpg', url: URL.createObjectURL(bl)}); pintarPend(); } cerrarCam(); }, 'image/jpeg', .85);
      } else {
        if (cam.mr) { cam.mr.stop(); return; }
        const mt = mime(['video/webm;codecs=vp9,opus', 'video/webm', 'video/mp4']), chunks = [], t0 = Date.now();
        cam.mr = new MediaRecorder(cam.stream, mt ? {mimeType: mt, videoBitsPerSecond: 1200000} : undefined);
        cam.mr.ondataavailable = ev => { if (ev.data && ev.data.size) chunks.push(ev.data); };
        cam.mr.onstop = () => { clearInterval(cam.tick); const type = (cam.mr.mimeType || mt || 'video/webm').split(';')[0]; pend.push({blob: new Blob(chunks, {type}), tipo: 'video', nombre: 'video.' + (/mp4/.test(type) ? 'mp4' : 'webm'), dur: Math.round((Date.now() - t0) / 1000)}); pintarPend(); cerrarCam(); };
        cam.mr.start(500); b.classList.add('rec');
        cam.tick = setInterval(() => { const s = (Date.now() - t0) / 1000; ov.querySelector('.ap-cam-t').textContent = 'Grabando ' + dur(s); if (s >= 30 && cam.mr) cam.mr.stop(); }, 250);
      }
    });
  }
  function cerrarCam() { if (!cam) return; clearInterval(cam.tick); if (cam.stream) cam.stream.getTracks().forEach(t => t.stop()); cam.ov.remove(); cam = null; }
  function verFoto(u) {
    const lb = document.createElement('div'); lb.className = 'cu-lb'; lb.setAttribute('role', 'dialog'); lb.setAttribute('aria-modal', 'true');
    lb.innerHTML = `<div class="cu-lb-card"><div class="cu-lb-hd"><div><b>Foto del chat</b></div><a class="btn ghost" href="${u}" download="foto.jpg">${ic('doc')}Descargar</a><button class="iconbtn sm" aria-label="Cerrar">${ic('x')}</button></div><div class="cu-lb-body"><img src="${u}" alt=""></div></div>`;
    lb.addEventListener('click', e => { if (e.target === lb || e.target.closest('.iconbtn')) lb.remove(); }); document.body.appendChild(lb);
  }
  async function copiar(t) {
    try { await navigator.clipboard.writeText(t); island({icon: 'ok', color: 'ok', title: 'Mensaje copiado', dur: 1800}); }
    catch (e) { const ta = document.createElement('textarea'); ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); island({icon: 'ok', color: 'ok', title: 'Mensaje copiado', dur: 1800}); } catch (er) {} ta.remove(); }
  }

  /* ===== Eventos del panel ===== */
  function onClick(e) {
    const c = e.target.closest('[data-chc]');
    if (c) {
      const k = c.dataset.chc, menu = q('#chMenu');
      if (k !== 'mas' && !menu.hidden) { menu.hidden = true; q('[data-chc="mas"]').setAttribute('aria-expanded', 'false'); }
      if (k === 'enviar') mandar();
      else if (k === 'mas') { menu.hidden = !menu.hidden; c.setAttribute('aria-expanded', String(!menu.hidden)); }
      else if (k === 'archivo') q('#chFile').click();
      else if (k === 'galeria') q('#chGal').click();
      else if (k === 'foto') camara('foto');
      else if (k === 'video') camara('video');
      else if (k === 'voz') voz();
      else if (k === 'recStop') parar(false);
      else if (k === 'recCancel') parar(true);
      else if (k === 'quitar') { const i = +c.dataset.i, a = pend[i]; if (a && a.url) URL.revokeObjectURL(a.url); pend.splice(i, 1); pintarPend(); }
      return;
    }
    const f = e.target.closest('[data-ch-f]'); if (f) { filtro = f.dataset.chF; pnl.querySelectorAll('[data-ch-f]').forEach(x => x.setAttribute('aria-pressed', String(x === f))); pintar(true); return; }
    const b = e.target.closest('[data-ch]'); if (!b) return; const k = b.dataset.ch;
    if (k === 'cerrar') return cerrar();
    if (k === 'buscar') { const t = q('#chTools'); t.hidden = !t.hidden; b.setAttribute('aria-expanded', String(!t.hidden)); if (!t.hidden) q('#chBusca').focus(); else if (busca || filtro !== 'todo') { busca = ''; filtro = 'todo'; q('#chBusca').value = ''; pnl.querySelectorAll('[data-ch-f]').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.chF === 'todo'))); pintar(true); } return; }
    if (k === 'ej') { const tx = q('#chTx'); tx.value = b.dataset.t; tx.focus(); tx.dispatchEvent(new Event('input', {bubbles: true})); return; }
    if (k === 'ver') { const u = urls.get(b.dataset.att); if (u) verFoto(u); return; }
    const n = (S.notas || []).find(x => x.id === b.dataset.id); if (!n) return;
    if (k === 'copiar') copiar(n.t);
    else if (k === 'fav') { n.fav = !n.fav; save(); pintar(); }
    else if (k === 'mas') { const m = b.closest('.cht-bub').querySelector('.cht-more'); if (m) m.hidden = !m.hidden; }
    else if (k === 'del') {
      const i = S.notas.indexOf(n); S.notas.splice(i, 1); save(); pintar();
      island({icon: 'trash', color: 'mu', title: 'Mensaje borrado', action: 'Deshacer', dur: 5000, onAction: () => { S.notas.splice(i, 0, n); save(); pintar(); }});
      setTimeout(() => { if (!S.notas.includes(n)) (n.att || []).forEach(a => { if (Cuentas.borrarArchivo) Cuentas.borrarArchivo(a.id); const u = urls.get(a.id); if (u) { URL.revokeObjectURL(u); urls.delete(a.id); } }); }, 6000);
    } else convertir(k, n);
  }
  function onChange(e) { const s = e.target.closest('[data-ch-k]'); if (!s) return; const n = (S.notas || []).find(x => x.id === s.dataset.chK); if (n) { n.k = s.value; save(); pintar(); } }

  /* ===== API ===== */
  // render() llama aquí: muestra u oculta la burbuja, actualiza el chat abierto y el contador (también con cambios de la nube)
  function sync(visible) { construir(); fab.hidden = !visible; if (!visible && abierto) cerrar(); if (abierto) pintar(); else badge(); }
  return {abrir, cerrar, sync, enviar, abierto: () => abierto, pure: {}};
})();

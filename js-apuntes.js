/* Rumbo · Apuntes (v2.0). Un chat de la casa para soltar lo que se les ocurra: tareas, gastos, ideas, planes, metas,
   ajustes y notas, con fotos, archivos, notas de voz, cámara y video.
   - Rumbo aprende (aprende.js) clasifica cada mensaje y propone convertirlo con un toque (tarea, gasto, abono, paso del plan…).
   - Si es una pregunta ("¿cuánto nos queda?"), responde Coral u Oreo con sus datos.
   - Archivos: en este aparato (IndexedDB vía Cuentas) y, si pesan menos de ~900 KB, también en la nube.
   - Permisos: micrófono y cámara se piden solo al tocar el botón; si los niegan, se explica cómo activarlos.
   Vista: views.apuntes → Apuntes.html(); el compositor vive fuera de #view para no perder lo escrito al redibujar. */
const Apuntes = (function () {
  'use strict';
  const K = {tarea: ['check', 'a2', 'Tarea'], gasto: ['wallet', 'al', 'Gasto'], idea: ['bulb', 'gd', 'Idea'], plan: ['cal', 'a3', 'Plan'], meta: ['target', 'a1', 'Meta'],
    ajuste: ['sliders', 'mu', 'Ajuste'], nota: ['doc', 'mu', 'Nota'], pregunta: ['info', 'a1', 'Pregunta'], respuesta: ['chat', 'a1', 'Respuesta']};
  const FILTROS = [['todo', 'Todo'], ['tarea', 'Tareas'], ['gasto', 'Gastos'], ['idea', 'Ideas'], ['plan', 'Planes'], ['archivos', 'Archivos'], ['fav', 'Guardados']];
  const EJEMPLOS = ['Gasté 45 mil en cine', 'Hay que bañar a Coral y Oreo el sábado', 'Idea: noche de pizza los domingos', '¿Cuánto nos queda este mes?', 'Para Argentina: reservar el tango'];
  const uid = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const pad = n => String(n).padStart(2, '0');
  const hora = s => { const d = new Date(s); return isNaN(d) ? '' : d.toLocaleTimeString('es-CO', {hour: 'numeric', minute: '2-digit'}); };
  const diaLbl = s => { const d = new Date(s); if (isNaN(d)) return ''; const h = new Date(), a = new Date(h.getFullYear(), h.getMonth(), h.getDate()), b = new Date(d.getFullYear(), d.getMonth(), d.getDate()), k = Math.round((a - b) / 864e5); return k === 0 ? 'Hoy' : k === 1 ? 'Ayer' : d.toLocaleDateString('es-CO', {weekday: 'long', day: 'numeric', month: 'short'}); };
  const dur = s => `${Math.floor(s / 60)}:${pad(Math.floor(s % 60))}`;
  const kb = n => n > 1048576 ? (n / 1048576).toFixed(1).replace('.', ',') + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB';
  const dogOf = w => w === 'D' ? 'orio' : 'coral';
  let filtro = 'todo', busca = '', urls = new Map(), primera = true;

  /* ===== Clasificación y acciones ===== */
  const ctx = () => ({cats: S.cats, hoy: new Date()});
  function info(n) { return n.by === 'bot' ? null : Aprende.clasificar(n.t, ctx()); }
  function acciones(n) {
    if (n.by === 'bot' || n.conv || n.k === 'pregunta' || !n.t) return '';
    const c = info(n), g = Aprende.metaDe(n.t, S.goals), b = (a, t, i) => `<button class="ap-act" data-ap="${a}" data-id="${esc(n.id)}">${ic(i)}${t}</button>`;
    const cat = c.cat && S.cats.find(x => x.id === c.cat);
    const L = [];
    if (n.k === 'tarea') L.push(b('tarea', 'Crear tarea' + (c.quien === 'D' ? ' para David' : c.quien === 'V' ? ' para Vale' : ''), 'check'));
    if (n.k === 'gasto') L.push(c.monto ? b('gasto', `Registrar ${fmt(c.monto)}${cat ? ' en ' + esc(cat.n.split(' (')[0]) : ''}`, 'wallet') : b('gastoForm', 'Registrar gasto', 'wallet'));
    if (n.k === 'meta') L.push(g && c.monto ? b('abono', `Abonar ${fmt(c.monto)} a ${esc(g.n)}`, 'trend') : b('metaNueva', 'Crear meta', 'target'));
    if (n.k === 'plan') L.push(g ? b('paso', `Agregar al plan de ${esc(g.n)}`, 'cal') : b('proyecto', 'Volverlo proyecto', 'target'));
    if (n.k === 'idea') { L.push(b('proyecto', 'Volverla proyecto', 'target')); L.push(b('tarea', 'Volverla tarea', 'check')); }
    if (n.k === 'ajuste') L.push(b('topes', 'Abrir topes', 'sliders'));
    if (n.k === 'nota' && c.monto) L.push(b('gasto', `¿Es un gasto de ${fmt(c.monto)}?`, 'wallet'));
    return L.length ? `<div class="ap-acts">${L.join('')}</div>` : '';
  }
  function convertir(act, n) {
    const c = info(n) || {}, t = c.titulo || n.t.slice(0, 80);
    if (act === 'tarea') {
      const w = c.quien === 'D' ? 'D' : c.quien === 'V' ? 'V' : S.profile, hoy = c.fecha && new Date().toDateString() === c.fecha.toDateString();
      const tk = {id: uid('t_'), n: t, i: 'check', w, p: 10, when: hoy ? 'Hoy' : 'Pendientes', rep: 'Una vez', done: false}; S.tasks.push(tk); n.conv = {tipo: 'tarea', id: tk.id};
      save(); repaint(); island({icon: 'check', color: 'ok', title: 'Quedó como tarea', sub: `${t} · para ${w === 'D' ? 'David' : 'Vale'}`, dur: 3200});
    } else if (act === 'gasto') {
      const cat = c.cat || 'g_17', mv = {n: t.slice(0, 40), cat: S.cats.some(x => x.id === cat) ? cat : S.cats[0].id, a: c.monto, d: new Date().getDate(), w: S.profile};
      S.moves.push(mv); n.conv = {tipo: 'gasto', id: ''}; save(); repaint();
      island({icon: 'wallet', color: 'a1', title: `${fmt(mv.a)} registrados`, sub: (S.cats.find(x => x.id === mv.cat) || {}).n || '', action: 'Deshacer', dur: 5200, onAction: () => { const k = S.moves.indexOf(mv); if (k >= 0) S.moves.splice(k, 1); delete n.conv; save(); repaint(); }});
      if (typeof compa === 'function') compa('onEvent', 'gasto');
    } else if (act === 'gastoForm') { if (typeof openSheet === 'function') openSheet('gasto'); }
    else if (act === 'abono') { const g = Aprende.metaDe(n.t, S.goals); if (g && c.monto) { doAct('abono', g.id, null, c.monto); n.conv = {tipo: 'abono', id: g.id}; save(); repaint(); } }
    else if (act === 'metaNueva') { if (typeof MetaPlan === 'object') MetaPlan.create(); }
    else if (act === 'paso') {
      const g = Aprende.metaDe(n.t, S.goals); if (!g) return;
      g.plan = g.plan || {tipo: 'otro', lugar: '', nota: '', costos: [], itin: [], fotos: [], cover: ''}; g.plan.itin = g.plan.itin || [];
      const d = c.fecha ? c.fecha.toLocaleDateString('es-CO', {day: 'numeric', month: 'short'}) : '';
      g.plan.itin.push({id: uid('i'), n: t, d, done: false}); n.conv = {tipo: 'paso', id: g.id}; save(); repaint();
      island({icon: 'cal', color: 'a3', title: `Al plan de ${g.n}`, sub: t, action: 'Ver', dur: 4200, onAction: () => { setTimeout(() => MetaPlan.open(g.id), 50); }});
    } else if (act === 'proyecto') {
      const due = c.fecha ? `${c.fecha.getFullYear()}-${pad(c.fecha.getMonth() + 1)}-${pad(c.fecha.getDate())}` : '';
      const pj = {id: uid('pj'), n: t.slice(0, 60), i: 'target', w: c.quien || 'A', due, why: '', done: false, steps: []}; S.projs.push(pj); n.conv = {tipo: 'proyecto', id: pj.id};
      save(); repaint(); island({icon: 'target', color: 'a2', title: 'Nuevo proyecto', sub: pj.n, action: 'Ver', dur: 4200, onAction: () => { location.hash = '#tareas'; }});
    } else if (act === 'topes') { if (typeof Cuentas === 'object') Cuentas.open('topes'); }
  }
  const convTxt = n => ({tarea: 'Ya es tarea', gasto: 'Gasto registrado', abono: 'Abonado a la meta', paso: 'Está en el plan de la meta', proyecto: 'Ya es proyecto'})[n.conv.tipo] || 'Listo';

  /* ===== Pintar ===== */
  function attHTML(a) {
    const u = urls.get(a.id), cls = `ap-att ap-${a.tipo}`;
    if (a.tipo === 'img') return `<button class="${cls}" data-ap="ver" data-att="${esc(a.id)}" aria-label="Ver foto">${u ? `<img src="${u}" alt="">` : '<span class="cu-spin"></span>'}</button>`;
    if (a.tipo === 'audio') return `<div class="${cls}" data-att="${esc(a.id)}">${ic('mic')}${u ? `<audio controls preload="metadata" src="${u}"></audio>` : '<span class="cu-spin"></span>'}<small>${a.dur ? dur(a.dur) : ''}</small></div>`;
    if (a.tipo === 'video') return `<div class="${cls}" data-att="${esc(a.id)}">${u ? `<video controls playsinline preload="metadata" src="${u}"></video>` : '<span class="cu-spin"></span>'}</div>`;
    return `<div class="${cls}" data-att="${esc(a.id)}">${ic('doc')}<span><b>${esc(a.nombre)}</b><small>${kb(a.size)}</small></span>${u ? `<a class="btn ghost" href="${u}" download="${esc(a.nombre)}">Descargar</a>` : ''}</div>`;
  }
  function msgHTML(n) {
    const bot = n.by === 'bot', mine = !bot && n.by === S.profile, [ki, kt, kn] = K[n.k] || K.nota, c = !bot && n.k !== 'pregunta' ? info(n) : null;
    const who = bot ? `<span class="ap-av">${Avatares.dogSVG(dogOf(S.profile), 'happy', 30)}</span>` : `<span class="ap-av">${Avatares.head(n.by, 30, 'happy', '', true)}</span>`;
    const meta = c ? [c.monto && n.k === 'gasto' ? fmt(c.monto) : '', c.fecha ? c.fecha.toLocaleDateString('es-CO', {weekday: 'short', day: 'numeric', month: 'short'}) : '', n.k === 'tarea' && c.quien === 'D' ? 'para David' : n.k === 'tarea' && c.quien === 'V' ? 'para Vale' : ''].filter(Boolean).join(' · ') : '';
    return `<article class="ap-msg ${bot ? 'bot' : mine ? 'mine' : 'theirs'} ${n.by === 'D' ? 'd' : n.by === 'V' ? 'v' : ''}" data-nid="${esc(n.id)}">
      ${who}<div class="ap-bub">
        ${!bot ? `<span class="ap-kind" style="--kc:var(--${kt === 'al' ? 'alert' : kt === 'mu' ? 'muted' : kt === 'gd' ? 'gold' : kt})">${ic(ki)}${kn}${meta ? ' · ' + esc(meta) : ''}</span>` : `<span class="ap-kind bot">${bot ? (S.profile === 'D' ? 'Oreo' : 'Coral') : ''}</span>`}
        ${n.t ? `<p class="ap-tx">${esc(n.t).replace(/\n/g, '<br>')}</p>` : ''}
        ${(n.att || []).length ? `<div class="ap-atts">${n.att.map(attHTML).join('')}</div>` : ''}
        ${n.cargando ? `<span class="ap-up"><span class="cu-spin" aria-hidden="true"></span>Guardando ${n.cargando === 1 ? 'el archivo' : n.cargando + ' archivos'}…</span>` : ''}
        ${n.conv ? `<span class="ap-done">${ic('ok')}${convTxt(n)}</span>` : acciones(n)}
        <div class="ap-foot"><time>${hora(n.at)}</time>${bot ? '' : `<button class="ap-ico ${n.fav ? 'on' : ''}" data-ap="fav" data-id="${esc(n.id)}" aria-pressed="${!!n.fav}" aria-label="Guardar">${ic('star')}</button>
          <label class="ap-sel"><span class="sr">Cambiar tipo</span><select data-ap-k="${esc(n.id)}" aria-label="Tipo de apunte">${Object.keys(K).filter(k => k !== 'respuesta').map(k => `<option value="${k}"${k === n.k ? ' selected' : ''}>${K[k][2]}</option>`).join('')}</select></label>`}
          <button class="ap-ico" data-ap="del" data-id="${esc(n.id)}" aria-label="Borrar">${ic('trash')}</button></div>
      </div></article>`;
  }
  function lista() {
    const q = Aprende.pure.quitar(busca);
    const ns = (S.notas || []).filter(n => (filtro === 'todo' || (filtro === 'fav' ? n.fav : filtro === 'archivos' ? (n.att || []).length : n.k === filtro)) && (!q || Aprende.pure.quitar(n.t).includes(q)));
    if (!ns.length) return (S.notas || []).length ? `<p class="ap-empty">Nada por aquí con ese filtro.</p>` : bienvenida();
    let last = '', h = '';
    ns.forEach(n => { const d = diaLbl(n.at); if (d !== last) { h += `<div class="ap-day"><span>${esc(d)}</span></div>`; last = d; } h += msgHTML(n); });
    return h;
  }
  function bienvenida() {
    const dog = S.profile === 'D' ? 'Oreo' : 'Coral';
    return `<div class="ap-hello"><span class="ap-hello-dog">${Avatares.dogSVG(dogOf(S.profile), 'happy', 74)}</span>
      <h2>Suelten aquí lo que sea</h2><p>Escriban, hablen o tomen una foto. ${dog} lo ordena: si es tarea, gasto, idea o plan, lo convierten con un toque. Y si preguntan, ${dog} responde con sus números.</p>
      <div class="ap-ej">${EJEMPLOS.map(e => `<button data-ap="ej" data-t="${esc(e)}">${esc(e)}</button>`).join('')}</div></div>`;
  }
  function html() {
    const cuenta = k => (S.notas || []).filter(n => k === 'todo' ? n.by !== 'bot' : k === 'fav' ? n.fav : k === 'archivos' ? (n.att || []).length : n.k === k).length;
    return `<div class="ap" data-ap-root>
      <div class="view-head rv" style="--i:0"><div class="eyebrow">// lo que se les ocurra, aquí</div><h1>Apuntes <span class="hl">de la casa</span></h1></div>
      <div class="ap-tools rv" style="--i:1"><label class="ap-search">${ic('info')}<input type="search" id="apBusca" placeholder="Buscar en sus apuntes" value="${esc(busca)}" autocomplete="off"></label>
        <div class="ap-filtros" role="group" aria-label="Filtrar apuntes">${FILTROS.map(([k, t]) => `<button data-ap-f="${k}" aria-pressed="${filtro === k}">${t}<b>${cuenta(k)}</b></button>`).join('')}</div></div>
      <div class="ap-list" id="apList" aria-live="polite">${lista()}</div></div>`;
  }
  function repaint() {
    const l = document.getElementById('apList'); if (!l) return;
    const nearBottom = innerHeight + scrollY >= document.documentElement.scrollHeight - 160;
    l.innerHTML = lista(); cargar(l);
    const r = document.querySelector('[data-ap-root]'); if (r) r.querySelectorAll('[data-ap-f] b').forEach(b => { const k = b.parentElement.dataset.apF; b.textContent = (S.notas || []).filter(n => k === 'todo' ? n.by !== 'bot' : k === 'fav' ? n.fav : k === 'archivos' ? (n.att || []).length : n.k === k).length; });
    if (nearBottom) abajo();
  }
  const abajo = smooth => requestAnimationFrame(() => window.scrollTo({top: document.documentElement.scrollHeight, behavior: smooth ? 'smooth' : 'auto'}));
  // Trae los archivos (fotos, audio, video) de este aparato o de la nube
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
    // El mensaje aparece de una; los archivos llegan cuando terminan de guardarse
    S.notas = S.notas || []; S.notas.push(n);
    if (n.k === 'pregunta') { const r = Aprende.responder(texto, S, new Date()); S.notas.push({id: uid('n'), t: r.texto, k: 'respuesta', at: new Date().toISOString(), by: 'bot', att: [], hecho: false, fav: false}); }
    if (S.notas.length > 400) S.notas.splice(0, S.notas.length - 400);
    save(); filtro = 'todo'; if (current === 'apuntes') { repaint(); abajo(true); }
    if (!adjuntos.length) return;
    for (const a of adjuntos) {
      const id = uid('na');
      try { await Cuentas.guardarArchivo(id, {blob: a.blob, tipo: a.tipo === 'img' ? 'img' : a.tipo, nombre: a.nombre}); n.att.push({id, tipo: a.tipo, nombre: a.nombre, size: a.blob.size, dur: a.dur || 0, nube: a.blob.size < 900000}); urls.set(id, URL.createObjectURL(a.blob)); }
      catch (e) { island({icon: 'alert', color: 'alert', title: 'No se pudo guardar el archivo', sub: e.message || '', dur: 4000}); }
    }
    delete n.cargando; save(); if (current === 'apuntes') { repaint(); abajo(true); }
    if (n.att.some(a => a.size >= 900000)) island({icon: 'info', color: 'mu', title: 'Archivo pesado', sub: 'Se ve en este aparato; a la nube solo suben los de menos de 900 KB', dur: 4200});
  }

  /* ===== Compositor (fuera de #view) ===== */
  let comp = null, pend = [], rec = null;
  function construir() {
    if (comp) return;
    comp = document.createElement('div'); comp.className = 'ap-comp'; comp.id = 'apComp'; comp.hidden = true;
    comp.innerHTML = `<div class="ap-pend" id="apPend" hidden></div>
      <div class="ap-recbar" id="apRec" hidden><span class="ap-dot"></span><b id="apRecT">0:00</b><span class="ap-wave" aria-hidden="true">${'<i></i>'.repeat(14)}</span><button class="ap-ico" data-apc="recCancel" aria-label="Cancelar grabación">${ic('x')}</button><button class="ap-send" data-apc="recStop" aria-label="Terminar y adjuntar">${ic('ok')}</button></div>
      <div class="ap-row" id="apRow">
        <button class="ap-ico" data-apc="mas" aria-expanded="false" aria-label="Adjuntar">${ic('plus')}</button>
        <div class="ap-menu" id="apMenu" hidden role="menu">
          <button role="menuitem" data-apc="foto">${ic('cam')}Tomar foto</button><button role="menuitem" data-apc="video">${ic('video')}Grabar video</button>
          <button role="menuitem" data-apc="galeria">${ic('clip')}Foto o video de la galería</button><button role="menuitem" data-apc="archivo">${ic('doc')}Archivo</button></div>
        <textarea id="apTx" rows="1" maxlength="1000" placeholder="Escriban una tarea, un gasto, una idea…" aria-label="Escribir apunte"></textarea>
        <button class="ap-ico" data-apc="voz" aria-label="Grabar nota de voz">${ic('mic')}</button>
        <button class="ap-send" data-apc="enviar" aria-label="Enviar">${ic('send')}</button>
      </div>
      <input type="file" id="apFile" hidden multiple><input type="file" id="apGal" accept="image/*,video/*" hidden multiple>`;
    document.body.appendChild(comp);
    const tx = comp.querySelector('#apTx');
    tx.addEventListener('input', () => { tx.style.height = 'auto'; tx.style.height = Math.min(140, tx.scrollHeight) + 'px'; });
    tx.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && matchMedia('(hover:hover)').matches) { e.preventDefault(); mandar(); } });
    comp.addEventListener('click', onComp);
    comp.querySelector('#apFile').addEventListener('change', e => { agregarArchivos(e.target.files); e.target.value = ''; });
    comp.querySelector('#apGal').addEventListener('change', e => { agregarArchivos(e.target.files); e.target.value = ''; });
  }
  function pintarPend() {
    const p = comp.querySelector('#apPend'); p.hidden = !pend.length;
    p.innerHTML = pend.map((a, i) => `<span class="ap-chip">${a.tipo === 'img' && a.url ? `<img src="${a.url}" alt="">` : ic(a.tipo === 'audio' ? 'mic' : a.tipo === 'video' ? 'video' : 'doc')}<small>${a.tipo === 'audio' ? 'Voz ' + dur(a.dur || 0) : esc(a.nombre.slice(0, 18))}</small><button data-apc="quitar" data-i="${i}" aria-label="Quitar">${ic('x')}</button></span>`).join('');
  }
  const tipoDe = f => /^image\//.test(f.type) ? 'img' : /^audio\//.test(f.type) ? 'audio' : /^video\//.test(f.type) ? 'video' : 'file';
  async function agregarArchivos(list) {
    for (const f of Array.from(list || [])) {
      if (f.size > 25e6) { island({icon: 'alert', color: 'alert', title: 'Muy pesado', sub: `${f.name} pasa de 25 MB`, dur: 3600}); continue; }
      let blob = f, tipo = tipoDe(f), nombre = f.name || 'archivo';
      if (tipo === 'img' && !/hei[cf]/i.test(f.type + f.name)) { try { blob = await achicar(f); nombre = nombre.replace(/\.[a-z0-9]+$/i, '') + '.jpg'; } catch (e) {} }
      pend.push({blob, tipo, nombre, url: tipo === 'img' ? URL.createObjectURL(blob) : ''});
    }
    pintarPend();
  }
  function achicar(file) {
    return new Promise((res, rej) => {
      const u = URL.createObjectURL(file), im = new Image();
      im.onload = () => { const k = Math.min(1, 1600 / Math.max(im.naturalWidth, im.naturalHeight)), cv = document.createElement('canvas'); cv.width = Math.round(im.naturalWidth * k); cv.height = Math.round(im.naturalHeight * k); cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height); URL.revokeObjectURL(u); cv.toBlob(b => b ? res(b) : rej(new Error('img')), 'image/jpeg', .82); };
      im.onerror = () => { URL.revokeObjectURL(u); rej(new Error('img')); }; im.src = u;
    });
  }
  function mandar() {
    const tx = comp.querySelector('#apTx'), t = tx.value, ad = pend.slice();
    if (!t.trim() && !ad.length) { tx.focus(); return; }
    tx.value = ''; tx.style.height = 'auto'; pend = []; pintarPend(); enviar(t, ad);
  }
  function permisoError(e, que) {
    const n = e && e.name;
    const sub = n === 'NotAllowedError' ? `Den permiso de ${que} en el candado junto a la dirección (o en Ajustes del celular → navegador) y vuelvan a intentar.`
      : n === 'NotFoundError' ? `Este aparato no tiene ${que} disponible.` : !navigator.mediaDevices ? 'Este navegador no deja usarlo aquí. En el celular funciona desde la página publicada (https).' : (e && e.message) || 'Intenten de nuevo.';
    island({icon: 'alert', color: 'alert', title: `Sin acceso al ${que}`, sub, dur: 6500});
  }
  const mime = (cands) => (window.MediaRecorder && cands.find(m => MediaRecorder.isTypeSupported(m))) || '';
  // Nota de voz
  async function voz() {
    if (rec) return;
    let stream; try { stream = await navigator.mediaDevices.getUserMedia({audio: true}); } catch (e) { permisoError(e, 'micrófono'); return; }
    const mt = mime(['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg']), chunks = [], t0 = Date.now();
    let mr; try { mr = new MediaRecorder(stream, mt ? {mimeType: mt} : undefined); } catch (e) { stream.getTracks().forEach(t => t.stop()); permisoError(e, 'micrófono'); return; }
    rec = {mr, stream, chunks, t0, cancel: false, tick: setInterval(() => { const s = (Date.now() - t0) / 1000; comp.querySelector('#apRecT').textContent = dur(s); if (s >= 180) parar(); }, 250)};
    mr.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
    mr.onstop = () => {
      clearInterval(rec.tick); stream.getTracks().forEach(t => t.stop()); const r = rec; rec = null;
      comp.querySelector('#apRec').hidden = true; comp.querySelector('#apRow').hidden = false;
      if (r.cancel || !chunks.length) return;
      const type = (mr.mimeType || mt || 'audio/webm').split(';')[0], ext = /mp4/.test(type) ? 'm4a' : /ogg/.test(type) ? 'ogg' : 'webm';
      pend.push({blob: new Blob(chunks, {type}), tipo: 'audio', nombre: `nota-de-voz.${ext}`, dur: Math.round((Date.now() - r.t0) / 1000)}); pintarPend();
      comp.querySelector('#apTx').focus();
    };
    mr.start(250); comp.querySelector('#apRec').hidden = false; comp.querySelector('#apRow').hidden = true;
  }
  function parar(cancel) { if (!rec) return; rec.cancel = !!cancel; try { rec.mr.stop(); } catch (e) {} }

  /* ===== Cámara: foto y video en vivo ===== */
  let cam = null;
  async function camara(modo) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { comp.querySelector('#apGal').setAttribute('capture', 'environment'); comp.querySelector('#apGal').click(); comp.querySelector('#apGal').removeAttribute('capture'); return; }
    const ov = document.createElement('div'); ov.className = 'ap-cam'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-label', modo === 'video' ? 'Grabar video' : 'Tomar foto');
    ov.innerHTML = `<video id="apCamV" playsinline muted autoplay></video><div class="ap-cam-top"><button class="ap-ico" data-cam="x" aria-label="Cerrar">${ic('x')}</button><b id="apCamT">${modo === 'video' ? 'Video · máx. 30 s' : 'Foto'}</b><button class="ap-ico" data-cam="girar" aria-label="Cambiar cámara">${ic('repeat')}</button></div>
      <div class="ap-cam-bot"><button class="ap-shutter ${modo === 'video' ? 'vid' : ''}" data-cam="disparo" aria-label="${modo === 'video' ? 'Grabar' : 'Tomar foto'}"><i></i></button></div>`;
    document.body.appendChild(ov);
    cam = {ov, modo, facing: 'environment', stream: null, mr: null};
    const start = async () => {
      if (cam.stream) cam.stream.getTracks().forEach(t => t.stop());
      try { cam.stream = await navigator.mediaDevices.getUserMedia({video: {facingMode: cam.facing, width: {ideal: 1280}}, audio: modo === 'video'}); }
      catch (e) { cerrarCam(); permisoError(e, 'cámara'); return false; }
      const v = ov.querySelector('#apCamV'); v.srcObject = cam.stream; try { await v.play(); } catch (e) {} return true;
    };
    if (!(await start())) return;
    ov.addEventListener('click', async e => {
      const b = e.target.closest('[data-cam]'); if (!b) return; const k = b.dataset.cam;
      if (k === 'x') cerrarCam();
      else if (k === 'girar') { cam.facing = cam.facing === 'environment' ? 'user' : 'environment'; start(); }
      else if (k === 'disparo' && modo !== 'video') {
        const v = ov.querySelector('#apCamV'), cv = document.createElement('canvas'), k2 = Math.min(1, 1600 / Math.max(v.videoWidth, v.videoHeight));
        cv.width = Math.round(v.videoWidth * k2); cv.height = Math.round(v.videoHeight * k2); cv.getContext('2d').drawImage(v, 0, 0, cv.width, cv.height);
        cv.toBlob(bl => { if (bl) { pend.push({blob: bl, tipo: 'img', nombre: 'foto.jpg', url: URL.createObjectURL(bl)}); pintarPend(); } cerrarCam(); }, 'image/jpeg', .85);
      } else if (k === 'disparo') {
        if (cam.mr) { cam.mr.stop(); return; }
        const mt = mime(['video/webm;codecs=vp9,opus', 'video/webm', 'video/mp4']), chunks = []; const t0 = Date.now();
        cam.mr = new MediaRecorder(cam.stream, mt ? {mimeType: mt, videoBitsPerSecond: 1200000} : undefined);
        cam.mr.ondataavailable = ev => { if (ev.data && ev.data.size) chunks.push(ev.data); };
        cam.mr.onstop = () => { clearInterval(cam.tick); const type = (cam.mr.mimeType || mt || 'video/webm').split(';')[0]; pend.push({blob: new Blob(chunks, {type}), tipo: 'video', nombre: 'video.' + (/mp4/.test(type) ? 'mp4' : 'webm'), dur: Math.round((Date.now() - t0) / 1000)}); pintarPend(); cerrarCam(); };
        cam.mr.start(500); b.classList.add('rec');
        cam.tick = setInterval(() => { const s = (Date.now() - t0) / 1000; ov.querySelector('#apCamT').textContent = 'Grabando ' + dur(s); if (s >= 30 && cam.mr) cam.mr.stop(); }, 250);
      }
    });
  }
  function cerrarCam() { if (!cam) return; clearInterval(cam.tick); if (cam.stream) cam.stream.getTracks().forEach(t => t.stop()); cam.ov.remove(); cam = null; }

  function onComp(e) {
    const b = e.target.closest('[data-apc]'); if (!b) return; const k = b.dataset.apc, menu = comp.querySelector('#apMenu');
    if (k !== 'mas' && !menu.hidden) { menu.hidden = true; comp.querySelector('[data-apc="mas"]').setAttribute('aria-expanded', 'false'); }
    if (k === 'enviar') mandar();
    else if (k === 'mas') { menu.hidden = !menu.hidden; b.setAttribute('aria-expanded', String(!menu.hidden)); }
    else if (k === 'archivo') comp.querySelector('#apFile').click();
    else if (k === 'galeria') comp.querySelector('#apGal').click();
    else if (k === 'foto') camara('foto');
    else if (k === 'video') camara('video');
    else if (k === 'voz') voz();
    else if (k === 'recStop') parar(false);
    else if (k === 'recCancel') parar(true);
    else if (k === 'quitar') { const i = +b.dataset.i, a = pend[i]; if (a && a.url) URL.revokeObjectURL(a.url); pend.splice(i, 1); pintarPend(); }
  }

  /* ===== Eventos de la lista ===== */
  let bound = false;
  function bind() {
    if (bound) return; const v = document.getElementById('view'); if (!v) return; bound = true;
    v.addEventListener('click', e => {
      if (!e.target.closest('[data-ap-root]')) return;
      const f = e.target.closest('[data-ap-f]'); if (f) { filtro = f.dataset.apF; document.querySelectorAll('[data-ap-f]').forEach(x => x.setAttribute('aria-pressed', String(x === f))); repaint(); return; }
      const b = e.target.closest('[data-ap]'); if (!b) return; const k = b.dataset.ap, n = (S.notas || []).find(x => x.id === b.dataset.id);
      if (k === 'ej') { construir(); const tx = comp.querySelector('#apTx'); tx.value = b.dataset.t; tx.focus(); tx.dispatchEvent(new Event('input')); return; }
      if (k === 'ver') { const u = urls.get(b.dataset.att); if (u) verFoto(u); return; }
      if (!n) return;
      if (k === 'fav') { n.fav = !n.fav; save(); repaint(); }
      else if (k === 'del') {
        const i = S.notas.indexOf(n); S.notas.splice(i, 1); save(); repaint();
        island({icon: 'trash', color: 'mu', title: 'Apunte borrado', action: 'Deshacer', dur: 5000, onAction: () => { S.notas.splice(i, 0, n); save(); repaint(); }});
        // Pasado el «Deshacer», se borran también sus archivos (aquí y en la nube)
        setTimeout(() => { if (!S.notas.includes(n)) (n.att || []).forEach(a => { if (Cuentas.borrarArchivo) Cuentas.borrarArchivo(a.id); const u = urls.get(a.id); if (u) { URL.revokeObjectURL(u); urls.delete(a.id); } }); }, 6000);
      } else convertir(k, n);
    });
    v.addEventListener('change', e => { const s = e.target.closest('[data-ap-k]'); if (!s) return; const n = (S.notas || []).find(x => x.id === s.dataset.apK); if (n) { n.k = s.value; save(); repaint(); } });
    v.addEventListener('input', e => { if (e.target.id !== 'apBusca') return; busca = e.target.value; clearTimeout(bind.t); bind.t = setTimeout(repaint, 180); });
  }
  function verFoto(u) {
    const lb = document.createElement('div'); lb.className = 'cu-lb'; lb.setAttribute('role', 'dialog'); lb.setAttribute('aria-modal', 'true');
    lb.innerHTML = `<div class="cu-lb-card"><div class="cu-lb-hd"><div><b>Foto del apunte</b></div><a class="btn ghost" href="${u}" download="foto.jpg">${ic('doc')}Descargar</a><button class="iconbtn sm" aria-label="Cerrar">${ic('x')}</button></div><div class="cu-lb-body"><img src="${u}" alt=""></div></div>`;
    lb.addEventListener('click', e => { if (e.target === lb || e.target.closest('.iconbtn')) lb.remove(); }); document.body.appendChild(lb);
  }

  /* ===== API ===== */
  function after(root) { bind(); construir(); cargar(root || document); if (primera) { primera = false; abajo(); } else abajo(); }
  function visible(on) { if (!on && rec) parar(true); if (!comp && !on) return; construir(); comp.hidden = !on; document.body.classList.toggle('ap-on', !!on); if (!on) { const m = comp.querySelector('#apMenu'); if (m) m.hidden = true; } }
  return {html, after, visible, enviar, pure: {}};
})();

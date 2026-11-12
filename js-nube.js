/* Rumbo · Nube (v1.4). Cada uno entra con su cuenta (correo y contraseña, o Google) y los dos ven la misma casa.
   - Solo se activa si NUBE_CONFIG tiene apiKey y la app está publicada (https o localhost). Con file:// todo sigue local.
   - La casa es un documento de Firestore `hogares/{casa}` con el mismo JSON que se guarda en localStorage (campo `json`).
     Cada cambio local se sube (con 0,7 s de espera) y los cambios del otro llegan en vivo. Gana el último que guarda.
   - Lo de cada aparato no viaja: tema, perfil activo, Face ID y Coral/Oreo en pantalla.
   - Comprobantes: además de este navegador, se suben comprimidos a `hogares/{casa}/archivos/{id}` (máx. ~900 KB).
   - Copia de seguridad: exportar/importar un .json con datos, comprobantes y fotos (funciona también sin nube).
   Usa globales de app.js en tiempo de ejecución (S, KEY, save, sanitize, syncDebts, rollMonth, runAuto, monthKey, render,
   syncTag, island, gateStep, gateOpen, pickProfile, esc, ic). No toca nada al cargar salvo leer la configuración. */
const Nube = (function () {
  'use strict';
  const C = typeof NUBE_CONFIG === 'object' ? NUBE_CONFIG : {firebase: {}, correos: {}};
  const WEB = /^https?:$/.test(location.protocol);
  const CONF = !!(C.firebase && C.firebase.apiKey && C.firebase.projectId);
  const ACTIVO = WEB && CONF;
  const SDK = 'https://www.gstatic.com/firebasejs/10.12.2/';
  const MEMO = 'hogar:v1:nube';
  let auth = null, db = null, ref = null, unsub = null, user = null, perfil = null, listo = false, cargando = null;
  let pt = 0, lastJson = '', rev = '', esperandoGate = false, avisoT = 0, errAviso = 0;

  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const memo = () => { try { return JSON.parse(localStorage.getItem(MEMO)); } catch (e) { return null; } };
  const setMemo = o => { try { if (o) localStorage.setItem(MEMO, JSON.stringify(o)); else localStorage.removeItem(MEMO); } catch (e) {} };
  // Los correos pueden estar en claro o como 'sha256:<huella>' (así van en la versión publicada, para no dejarlos a la vista)
  const sha = async t => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)))].map(b => b.toString(16).padStart(2, '0')).join('');
  async function perfilDe(email) {
    const e = String(email || '').trim().toLowerCase(), c = C.correos || {}; if (!e) return null;
    let h = ''; try { h = 'sha256:' + await sha(e); } catch (er) {}
    for (const k of ['V', 'D']) { const v = String(c[k] || '').trim().toLowerCase(); if (v && (v === e || v === h)) return k; }
    return null;
  }
  const nombre = p => p === 'D' ? 'David' : 'Valentina';
  const toData = blob => new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = () => rej(fr.error); fr.readAsDataURL(blob); });
  function fromData(u) { const [h, b64] = String(u).split(','), bin = atob(b64 || ''), a = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i); return new Blob([a], {type: (h.match(/data:([^;]+)/) || [])[1] || 'application/octet-stream'}); }
  const loadJs = src => new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('Sin conexión con Firebase')); document.head.appendChild(s); });

  /* ===== Arranque de Firebase ===== */
  function iniciar() {
    if (cargando) return cargando;
    cargando = (async () => {
      await loadJs(SDK + 'firebase-app-compat.js');
      await Promise.all([loadJs(SDK + 'firebase-auth-compat.js'), loadJs(SDK + 'firebase-firestore-compat.js')]);
      firebase.initializeApp(C.firebase);
      auth = firebase.auth(); auth.languageCode = 'es';
      db = firebase.firestore();
      try { await db.enablePersistence({synchronizeTabs: true}); } catch (e) { /* otra pestaña o navegador sin soporte: sigue sin caché */ }
      ref = db.collection('hogares').doc(C.casa || 'rumbo');
      try { await auth.getRedirectResult(); } catch (e) { mostrarError(e); }
      auth.onAuthStateChanged(cambioCuenta);
    })();
    cargando.catch(() => { cargando = null; });
    return cargando;
  }
  async function cambioCuenta(u) {
    if (!u) { user = null; perfil = null; listo = false; if (unsub) { unsub(); unsub = null; } if (gateOpen) pintar('login'); return; }
    const p = await perfilDe(u.email);
    if (!p) { await auth.signOut(); pintar('login', `El correo ${u.email} no tiene llave de esta casa.`); return; }
    if (!u.emailVerified && u.providerData.some(x => x.providerId === 'password')) {
      try { await u.reload(); } catch (e) {}
      if (!auth.currentUser || !auth.currentUser.emailVerified) { pintar('verificar', u.email); return; }
      await u.getIdToken(true);
    }
    user = u; perfil = p; setMemo({email: u.email, perfil: p});
    pintar('cargando', 'Trayendo los datos de la casa…');
    try { await conectar(); } catch (e) { pintar('error', mensaje(e)); return; }
    seguir();
  }
  async function conectar() {
    if (listo) return;
    const snap = await ref.get();
    if (snap.exists && snap.data().json) { aplicar(snap.data(), false); listo = true; escuchar(); return; }
    // La nube está vacía: hay que decidir de dónde salen los datos
    await new Promise(res => { conectar.fin = res; pintar('vacia'); });
  }
  // Sigue con la entrada normal (perfil nuevo, Face ID, carga) si la pantalla de entrada está esperando
  function seguir() { if (gateOpen && esperandoGate) { esperandoGate = false; pickProfile(perfil); } }

  /* ===== Sincronización ===== */
  // Aplica la casa que llegó de la nube; conserva lo que es de este aparato
  function aplicar(d, pintarApp) {
    let raw; try { raw = JSON.parse(d.json); } catch (e) { return false; }
    const ok = sanitize(raw); if (!ok) return false;
    const keep = {profile: perfil || S.profile, faceId: S.faceId, compas: S.compas};
    Object.assign(S, ok, keep);
    const n = new Date(), mk = monthKey(n), rolled = rollMonth(S, mk); syncDebts(S); const auto = runAuto(S, n.getDate(), mk).length;
    lastJson = d.json; save(true);
    if (rolled || auto) push();
    if (pintarApp && !gateOpen) { try { render(false); syncTag(); if (typeof renderChips === 'function') renderChips(); } catch (e) { console.error('Rumbo · Nube:', e); } }
    return true;
  }
  function escuchar() {
    if (unsub) unsub();
    unsub = ref.onSnapshot(s => {
      if (s.metadata.hasPendingWrites || !s.exists) return;
      const d = s.data(); if (!d || !d.json || (d.rev && d.rev === rev) || d.json === lastJson) return;
      if (aplicar(d, true) && d.by && d.by !== perfil && Date.now() - avisoT > 60000) {
        avisoT = Date.now(); island({icon: 'repeat', color: 'a2', title: `${nombre(d.by)} actualizó la casa`, sub: 'Ya ven lo mismo', dur: 2600});
      }
    }, e => console.warn('Rumbo · Nube:', e));
  }
  // save() llama aquí después de guardar en este navegador
  function push() { if (!ACTIVO || !listo || !ref) return; clearTimeout(pt); pt = setTimeout(subir, 700); }
  function subir() {
    pt = 0; if (!listo || !ref) return;
    let json = null; try { json = localStorage.getItem(KEY); } catch (e) {}
    if (!json || json === lastJson) return;
    lastJson = json; rev = uid();
    ref.set({json, rev, by: perfil, email: user ? user.email : '', at: firebase.firestore.FieldValue.serverTimestamp()}).catch(e => {
      console.warn('Rumbo · Nube:', e); lastJson = '';
      if (Date.now() - errAviso > 30000) { errAviso = Date.now(); island({icon: 'alert', color: 'alert', title: 'No se pudo subir a la nube', sub: 'Queda guardado aquí; se reintenta con el próximo cambio', dur: 4200}); }
    });
  }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && pt) { clearTimeout(pt); subir(); } });

  /* ===== Comprobantes en la nube ===== */
  const fref = id => ref.collection('archivos').doc(id);
  async function achicar(blob) {
    const bm = await createImageBitmap(blob);
    for (const [px, qy] of [[1400, .72], [1100, .66], [850, .6]]) {
      const k = Math.min(1, px / Math.max(bm.width, bm.height)), cv = document.createElement('canvas');
      cv.width = Math.round(bm.width * k); cv.height = Math.round(bm.height * k); cv.getContext('2d').drawImage(bm, 0, 0, cv.width, cv.height);
      const u = cv.toDataURL('image/jpeg', qy); if (u.length < 900000) return u;
    }
    return '';
  }
  async function subirArchivo(id, val) {
    if (!listo || !ref || !val || !val.blob) return;
    try {
      let data = await toData(val.blob);
      if (data.length > 900000 && val.tipo === 'img') data = await achicar(val.blob);
      if (!data || data.length > 950000) { island({icon: 'info', color: 'mu', title: 'Comprobante muy pesado para la nube', sub: 'Quedó guardado solo en este aparato', dur: 4000}); return; }
      await fref(id).set({data, tipo: val.tipo, nombre: val.nombre || 'comprobante'});
    } catch (e) { console.warn('Rumbo · Nube archivo:', e); }
  }
  async function bajarArchivo(id) {
    if (!listo || !ref) return null;
    try { const s = await fref(id).get(); if (!s.exists) return null; const o = s.data(); return {tipo: o.tipo, nombre: o.nombre, blob: fromData(o.data)}; } catch (e) { return null; }
  }
  function borrarArchivo(id) { if (listo && ref) fref(id).delete().catch(() => {}); }

  /* ===== Fotos de las metas (v1.5): mismo lugar que los comprobantes, como archivos/foto_<id> ===== */
  const SUBIDAS = 'hogar:v1:fotos-nube';
  const subidas = () => { try { return new Set(JSON.parse(localStorage.getItem(SUBIDAS)) || []); } catch (e) { return new Set(); } };
  const marcar = (id, on) => { const st = subidas(); if (on) st.add(id); else st.delete(id); try { localStorage.setItem(SUBIDAS, JSON.stringify([...st])); } catch (e) {} };
  async function subirFoto(id, data) {
    if (!listo || !ref || typeof data !== 'string' || !data.startsWith('data:image/') || data.length > 950000) return false;
    try { await fref('foto_' + id).set({data, tipo: 'img', nombre: 'foto'}); marcar(id, true); return true; } catch (e) { console.warn('Rumbo · Nube foto:', e); return false; }
  }
  // undefined = la nube aún no está lista (reintentar luego); null = no existe
  async function bajarFoto(id) {
    if (!listo || !ref) return undefined;
    try { const s = await fref('foto_' + id).get(); if (!s.exists) return null; marcar(id, true); return s.data().data || null; } catch (e) { return undefined; }
  }
  function borrarFoto(id) { if (listo && ref) { fref('foto_' + id).delete().catch(() => {}); marcar(id, false); } }
  // Sube las fotos que están en este aparato y aún no llegaron a la nube (las de antes de conectarla)
  async function subirPendientes(store) {
    if (!listo || !store) return 0;
    const ya = subidas(); let n = 0;
    for (const [id, d] of Object.entries(store)) { if (!ya.has(id) && await subirFoto(id, d)) n++; }
    return n;
  }

  /* ===== Copia de seguridad (.json) ===== */
  async function exportar() {
    let estado = null; try { estado = JSON.parse(localStorage.getItem(KEY)); } catch (e) {}
    if (!estado) { island({icon: 'alert', color: 'alert', title: 'No hay datos para copiar', dur: 2600}); return; }
    const soportes = {};
    for (const r of S.recibos || []) { try { const f = typeof Cuentas === 'object' && await Cuentas.archivo(r.id); if (f && f.blob) soportes[r.id] = {tipo: f.tipo, nombre: f.nombre, data: await toData(f.blob)}; } catch (e) {} }
    let fotos = {}; try { fotos = JSON.parse(localStorage.getItem('hogar:v1:fotos')) || {}; } catch (e) {}
    const d = new Date(), f = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const blob = new Blob([JSON.stringify({app: 'rumbo', version: '1.4', fecha: d.toISOString(), estado, soportes, fotos})], {type: 'application/json'});
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `rumbo-copia-${f}.json`; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
    island({icon: 'doc', color: 'ok', title: 'Copia descargada', sub: `${Object.keys(soportes).length} comprobantes incluidos`, dur: 3200});
  }
  // Lee un archivo de copia y devuelve {copia, resumen} o lanza un error con mensaje claro
  async function leerCopia(file) {
    let c; try { c = JSON.parse(await file.text()); } catch (e) { throw new Error('Ese archivo no es una copia de Rumbo.'); }
    if (!c || c.app !== 'rumbo' || !c.estado) throw new Error('Ese archivo no es una copia de Rumbo.');
    const ok = sanitize(c.estado); if (!ok) throw new Error('La copia está dañada; no se puede leer.');
    const fecha = c.fecha ? new Date(c.fecha).toLocaleDateString('es-CO', {day: 'numeric', month: 'long', year: 'numeric'}) : 'sin fecha';
    const n = (k, a, b) => k + ' ' + (k === 1 ? a : b);
    return {copia: c, resumen: `Copia del ${fecha}: ${n(ok.pays.length, 'pago', 'pagos')}, ${n(ok.debts.length, 'deuda', 'deudas')}, ${n(ok.goals.length, 'meta', 'metas')}, ${n(ok.tasks.length, 'tarea', 'tareas')} y ${n(Object.keys(c.soportes || {}).length, 'comprobante', 'comprobantes')}.`};
  }
  async function importar(c) {
    const ok = sanitize(c.estado); if (!ok) throw new Error('La copia está dañada.');
    try { const prev = localStorage.getItem(KEY); if (prev) localStorage.setItem(KEY + ':respaldo', prev); } catch (e) {}
    Object.assign(S, ok, {profile: perfil || S.profile, faceId: S.faceId, compas: S.compas}); syncDebts(S); save();
    for (const [id, f] of Object.entries(c.soportes || {})) { try { if (f && f.data && typeof Cuentas === 'object') await Cuentas.guardarArchivo(id, {blob: fromData(f.data), tipo: f.tipo === 'pdf' ? 'pdf' : 'img', nombre: f.nombre || 'comprobante'}); } catch (e) {} }
    if (c.fotos && typeof c.fotos === 'object') { subirPendientes(c.fotos); try { let cur = {}; try { cur = JSON.parse(localStorage.getItem('hogar:v1:fotos')) || {}; } catch (e) {} localStorage.setItem('hogar:v1:fotos', JSON.stringify({...cur, ...c.fotos})); } catch (e) { island({icon: 'info', color: 'mu', title: 'Las fotos de las metas no cupieron', sub: 'Lo demás sí quedó', dur: 3600}); } }
  }

  /* ===== Pantalla de entrada (dentro de la tarjeta del gate) ===== */
  let modoForm = 'entrar';
  function mensaje(e) {
    const c = e && e.code || '';
    if (/invalid-credential|wrong-password|user-not-found|invalid-login/.test(c)) return 'El correo o la contraseña no coinciden.';
    if (/too-many-requests/.test(c)) return 'Muchos intentos seguidos. Esperen un momento y vuelvan a probar.';
    if (/network-request-failed|unavailable/.test(c)) return 'No hay internet. Revisen la conexión.';
    if (/email-already-in-use/.test(c)) return 'Ese correo ya tiene contraseña. Entren con ella o usen «Olvidé mi contraseña».';
    if (/weak-password/.test(c)) return 'La contraseña debe tener al menos 6 caracteres.';
    if (/invalid-email/.test(c)) return 'Ese correo no está bien escrito.';
    if (/permission-denied/.test(c)) return 'La nube no dejó entrar: revisen que el correo esté en las reglas de Firestore.';
    if (/unauthorized-domain/.test(c)) return 'Falta autorizar esta dirección en Firebase (Authentication → Configuración → Dominios autorizados).';
    return (e && e.message) || 'Algo falló. Intenten de nuevo.';
  }
  function mostrarError(e) { if (e && !/popup-closed|cancelled-popup/.test(e.code || '')) pintar('login', mensaje(e)); }
  function pintar(modo, extra) {
    const h = document.getElementById('gateAuth'); if (!h) return;
    if (!h.dataset.bound) { h.dataset.bound = '1'; h.addEventListener('click', onClick); h.addEventListener('submit', onSubmit); h.addEventListener('change', onChange); }
    const spin = t => `<div class="na-load"><span class="cu-spin" aria-hidden="true"></span><p>${esc(t)}</p></div>`;
    if (modo === 'cargando') h.innerHTML = spin(extra || 'Conectando con la casa…');
    else if (modo === 'login') {
      const crear = modoForm === 'crear';
      h.innerHTML = `<h3 class="gp-q">${crear ? 'Crear mi contraseña' : 'Entrar a la casa'}</h3>
        ${crear ? '' : `<button class="btn na-g" data-na="google" type="button">${ic('user')}Continuar con Google</button><div class="na-or"><span>o con su correo</span></div>`}
        <form class="na-form" novalidate>
          <label class="na-f"><span>Correo</span><input class="cu-in" name="email" type="email" autocomplete="username" inputmode="email" required></label>
          <label class="na-f"><span>Contraseña</span><input class="cu-in" name="pass" type="password" autocomplete="${crear ? 'new-password' : 'current-password'}" minlength="6" required></label>
          <p class="na-err" role="alert">${extra ? esc(extra) : ''}</p>
          <button class="btn pri na-go" type="submit">${crear ? 'Crear y entrar' : 'Entrar'}</button>
        </form>
        <div class="na-links">${crear ? '<button type="button" data-na="entrar">Ya tengo contraseña</button>' : '<button type="button" data-na="crear">Primera vez: crear contraseña</button><button type="button" data-na="olvide">Olvidé mi contraseña</button>'}</div>`;
      const m = memo(), em = h.querySelector('[name="email"]'); if (m && m.email && em) em.value = m.email;
      setTimeout(() => { const f = h.querySelector(m && m.email ? '[name="pass"]' : '[name="email"]'); f && f.focus({preventScroll: true}); }, 60);
    } else if (modo === 'verificar') {
      h.innerHTML = `<h3 class="gp-q">Confirmen el correo</h3><p class="na-p">Les mandamos un enlace a <b>${esc(extra)}</b>. Ábranlo y vuelvan aquí.</p>
        <button class="btn pri na-go" data-na="yaconfirme" type="button">Ya lo confirmé</button>
        <div class="na-links"><button type="button" data-na="reenviar">Reenviar el correo</button><button type="button" data-na="salir">Usar otra cuenta</button></div>`;
    } else if (modo === 'vacia') {
      h.innerHTML = `<h3 class="gp-q">La casa en la nube está vacía</h3><p class="na-p">Es la primera vez. ¿De dónde traemos los datos?</p>
        <label class="na-opt">${ic('doc')}<span><b>Importar una copia</b><small>El archivo .json que descargaron en Ajustes → Copia de seguridad</small></span><input type="file" accept="application/json,.json" data-na="importar"></label>
        <button class="na-opt" data-na="local" type="button">${ic('home')}<span><b>Empezar con lo de este navegador</b><small>Sube lo que hay aquí como punto de partida</small></span></button>
        <p class="na-err" role="alert">${extra ? esc(extra) : ''}</p>`;
    } else if (modo === 'offline') {
      h.innerHTML = `<h3 class="gp-q">Sin conexión</h3><p class="na-p">Pueden entrar con lo guardado en este aparato. Los cambios se suben cuando vuelva el internet.</p>
        <button class="btn pri na-go" data-na="offline" type="button">Entrar como ${esc(nombre(extra.perfil))}</button><div class="na-links"><button type="button" data-na="reintentar">Reintentar</button></div>`;
    } else if (modo === 'error') {
      h.innerHTML = `<h3 class="gp-q">No pudimos conectar</h3><p class="na-p">${esc(extra || '')}</p><button class="btn pri na-go" data-na="reintentar" type="button">Reintentar</button><div class="na-links"><button type="button" data-na="salir">Usar otra cuenta</button></div>`;
    }
  }
  function err(t) { const p = document.querySelector('#gateAuth .na-err'); if (p) p.textContent = t; }
  async function onSubmit(e) {
    e.preventDefault();
    const f = e.target, email = f.email.value.trim(), pass = f.pass.value, go = f.querySelector('.na-go');
    if (!/^\S+@\S+\.\S+$/.test(email)) { err('Escriban su correo.'); f.email.focus(); return; }
    if (pass.length < 6) { err('La contraseña debe tener al menos 6 caracteres.'); f.pass.focus(); return; }
    if (!(await perfilDe(email))) { err('Ese correo no tiene llave de esta casa.'); return; }
    go.disabled = true; go.textContent = 'Un momento…';
    try {
      if (modoForm === 'crear') { const r = await auth.createUserWithEmailAndPassword(email, pass); await r.user.sendEmailVerification(); }
      else await auth.signInWithEmailAndPassword(email, pass);
    } catch (er) { go.disabled = false; go.textContent = modoForm === 'crear' ? 'Crear y entrar' : 'Entrar'; err(mensaje(er)); }
  }
  async function onClick(e) {
    const b = e.target.closest('[data-na]'); if (!b || b.tagName === 'INPUT') return;
    const k = b.dataset.na;
    if (k === 'google') {
      const pr = new firebase.auth.GoogleAuthProvider(); pr.setCustomParameters({prompt: 'select_account'});
      try { await auth.signInWithPopup(pr); }
      catch (er) { if (/popup-blocked|operation-not-supported|web-storage-unsupported/.test(er.code || '')) auth.signInWithRedirect(pr); else mostrarError(er); }
    } else if (k === 'crear' || k === 'entrar') { modoForm = k; pintar('login'); }
    else if (k === 'olvide') {
      const em = (document.querySelector('#gateAuth [name="email"]') || {}).value || '';
      if (!(await perfilDe(em))) { err('Escriban arriba su correo de la casa y vuelvan a tocar aquí.'); return; }
      try { await auth.sendPasswordResetEmail(em.trim()); err('Listo: les llegó un correo para crear una contraseña nueva.'); } catch (er) { err(mensaje(er)); }
    } else if (k === 'reenviar') { try { await auth.currentUser.sendEmailVerification(); island({icon: 'send', color: 'ok', title: 'Correo reenviado', dur: 2200}); } catch (er) { island({icon: 'alert', color: 'alert', title: mensaje(er), dur: 3000}); } }
    else if (k === 'yaconfirme') { pintar('cargando', 'Revisando…'); if (auth.currentUser) cambioCuenta(auth.currentUser); else pintar('login'); }
    else if (k === 'salir') { listo = false; await auth.signOut(); modoForm = 'entrar'; pintar('login'); }
    else if (k === 'reintentar') entrada();
    else if (k === 'offline') { const m = memo(); if (m && m.perfil) { perfil = m.perfil; esperandoGate = true; seguir(); } }
    else if (k === 'local') { listo = true; lastJson = ''; escuchar(); save(); subir(); if (conectar.fin) conectar.fin(); }
  }
  async function onChange(e) {
    const t = e.target; if (t.dataset.na !== 'importar' || !t.files || !t.files[0]) return;
    try { const {copia} = await leerCopia(t.files[0]); listo = true; lastJson = ''; escuchar(); await importar(copia); subir(); if (conectar.fin) conectar.fin(); }
    catch (er) { listo = false; pintar('vacia', er.message); }
  }

  /* ===== API para app.js ===== */
  // Llamada desde showGate() cuando la nube está activa
  async function entrada() {
    esperandoGate = true; gateStep('auth', true);
    if (user && listo) { seguir(); return; }
    pintar('cargando');
    try { await iniciar(); }
    catch (e) { const m = memo(); if (m && m.perfil) pintar('offline', m); else pintar('error', 'No hay internet para conectar con la casa.'); return; }
    // Espera a que Firebase sepa si hay sesión abierta; sin sesión, muestra el formulario (p. ej. después de cerrar sesión)
    await new Promise(r => { const off = auth.onAuthStateChanged(() => { off(); r(); }); });
    if (!auth.currentUser) pintar('login');
    // Si la sesión ya estaba abierta, onAuthStateChanged sigue solo; si no, muestra el formulario
  }
  async function salir() { listo = false; if (unsub) { unsub(); unsub = null; } setMemo(null); try { await auth.signOut(); } catch (e) {} }
  const estado = () => !CONF ? 'Sin configurar · los datos viven solo en este navegador' : !WEB ? 'Configurada · se activa cuando la app esté publicada' : user ? `Conectada como ${user.email}` : 'Sin sesión';

  return {activo: () => ACTIVO, configurada: () => CONF, lista: () => listo, perfil: () => perfil, entrada, push, salir, estado, subirArchivo, bajarArchivo, borrarArchivo, subirFoto, bajarFoto, borrarFoto, subirPendientes, exportar, leerCopia, importar, pure: {perfilDe}};
})();

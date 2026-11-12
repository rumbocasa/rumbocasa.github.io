/* Rumbo · Cuentas (v1.2). Pagos fijos editables, deudas, topes del mes y comprobantes de pago.
   - Cuentas.open(tab, id): pantalla completa con pestañas Pagos · Deudas · Topes · Comprobantes.
   - Cuentas.pay(id, at): flujo de pago (ir al portal de la entidad, adjuntar el comprobante, monto real).
   - Los comprobantes (foto, pantallazo o PDF) se guardan en IndexedDB ('rumbo-soportes'); el registro va en S.recibos.
   Usa globales de app.js en tiempo de ejecución (S, save, render, syncDebts, markPaid, fmt, esc, ic, tile, int, island,
   today, monthKey, payDay, daysInMonth). No toca nada al cargar. */
const Cuentas = (function () {
  'use strict';
  const TIPOS = {banco: ['Banco', 'coin', 'a1'], familia: ['Familia', 'heart', 'a3'], celular: ['Celular', 'phone', 'a2'], tarjeta: ['Tarjeta', 'wallet', 'gd'], otra: ['Otra', 'doc', 'mu']};
  const EJEMPLOS = [['Crédito del banco', 'banco'], ['Préstamo de mamá', 'familia'], ['Celulares', 'celular'], ['Tarjeta de crédito', 'tarjeta'], ['Otra deuda', 'otra']];
  const TABS = [['pagos', 'Pagos'], ['deudas', 'Deudas'], ['topes', 'Topes'], ['soportes', 'Comprobantes']];
  const uid = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const pad = n => String(n).padStart(2, '0');
  const digits = v => int(String(v || '').replace(/\D/g, '').slice(0, 11));
  const plural = (n, a, b) => n + ' ' + (n === 1 ? a : b);
  const mesLargo = d => d.toLocaleDateString('es-CO', {month: 'long', year: 'numeric'});
  const mkLabel = mk => { const [y, m] = mk.split('-').map(Number); return y && m ? mesLargo(new Date(y, m - 1, 1)) : 'Sin fecha'; };
  // Un enlace sin https:// (p. ej. "www.epm.com.co") se completa; lo demás se descarta
  function fixUrl(v) {
    let s = String(v || '').trim(); if (!s) return {v: ''};
    if (!/^[a-z]+:\/\//i.test(s) && /^[\w-]+(\.[\w-]+)+/.test(s)) s = 'https://' + s;
    return /^https?:\/\/[^\s<>"']{3,300}$/i.test(s) ? {v: s} : {err: 'Pega el enlace completo, por ejemplo https://www.epm.com.co'};
  }

  /* ===== Archivos de comprobantes (IndexedDB) ===== */
  // Si IndexedDB no responde (algunos navegadores con file://), se usa localStorage como respaldo (`hogar:v1:sop:<id>`)
  let dbp = null, idbOff = false;
  function db() {
    if (idbOff) return Promise.reject(new Error('sin archivero'));
    if (!dbp) {
      dbp = new Promise((res, rej) => {
        if (!('indexedDB' in window)) { rej(new Error('sin archivero')); return; }
        const t = setTimeout(() => rej(new Error('sin archivero')), 3000);
        try {
          const r = indexedDB.open('rumbo-soportes', 1);
          r.onupgradeneeded = () => r.result.createObjectStore('files');
          r.onsuccess = () => { clearTimeout(t); res(r.result); }; r.onerror = () => { clearTimeout(t); rej(r.error || new Error('sin archivero')); };
        } catch (e) { clearTimeout(t); rej(e); }
      });
      dbp.catch(() => { idbOff = true; dbp = null; });
    }
    return dbp;
  }
  const idb = (mode, fn) => db().then(d => new Promise((res, rej) => {
    const tx = d.transaction('files', mode), r = fn(tx.objectStore('files'));
    tx.oncomplete = () => res(r && r.result); tx.onerror = () => rej(tx.error); tx.onabort = () => rej(tx.error || new Error('Sin espacio para guardar.'));
  }));
  const LSK = id => 'hogar:v1:sop:' + id;
  const toData = blob => new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = () => rej(fr.error); fr.readAsDataURL(blob); });
  function fromData(u) { const [h, b64] = String(u).split(','), bin = atob(b64 || ''), a = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i); return new Blob([a], {type: (h.match(/data:([^;]+)/) || [])[1] || 'application/octet-stream'}); }
  async function putFile(id, val) {
    try { await idb('readwrite', s => s.put(val, id)); return; } catch (e) { if (!idbOff) throw e; }
    if (val.blob.size > 2.5e6) throw new Error('El archivo es muy pesado para este navegador; usa un pantallazo');
    try { localStorage.setItem(LSK(id), JSON.stringify({tipo: val.tipo, nombre: val.nombre, data: await toData(val.blob)})); }
    catch (e) { throw new Error('No queda espacio en este navegador'); }
  }
  async function getFile(id) {
    try { const v = await idb('readonly', s => s.get(id)); if (v) return v; } catch (e) { /* respaldo */ }
    try { const o = JSON.parse(localStorage.getItem(LSK(id))); if (o && o.data) return {tipo: o.tipo, nombre: o.nombre, blob: fromData(o.data)}; } catch (e) {}
    // v1.4: si lo subió el otro, se trae de la nube y se guarda aquí
    if (typeof Nube === 'object' && Nube.activo()) { const f = await Nube.bajarArchivo(id); if (f) { putFile(id, f).catch(() => {}); return f; } }
    return null;
  }
  const delFile = id => { try { localStorage.removeItem(LSK(id)); } catch (e) {} if (typeof Nube === 'object') Nube.borrarArchivo(id); return idb('readwrite', s => s.delete(id)).catch(() => {}); };
  // Guarda aquí y en la nube (si está activa)
  async function guardarArchivo(id, val) { await putFile(id, val); if (typeof Nube === 'object') Nube.subirArchivo(id, val); }

  // Foto o pantallazo: se reduce a 1800 px en JPG; PDF tal cual (hasta 10 MB)
  function prepFile(file) {
    return new Promise((res, rej) => {
      const name = String(file.name || 'comprobante').slice(0, 80);
      if (file.type === 'application/pdf' || /\.pdf$/i.test(name)) { if (file.size > 10e6) rej(new Error('El PDF pesa más de 10 MB.')); else res({blob: file, tipo: 'pdf', nombre: name}); return; }
      if (/hei[cf]/i.test(file.type) || /\.hei[cf]$/i.test(name)) { rej(new Error('Las fotos HEIC del iPhone no se leen aquí. Sube un pantallazo o expórtala como JPG.')); return; }
      if (!/^image\//.test(file.type)) { rej(new Error('Usa una foto, un pantallazo o un PDF.')); return; }
      const url = URL.createObjectURL(file), img = new Image();
      img.onload = () => {
        const k = Math.min(1, 1800 / Math.max(img.naturalWidth, img.naturalHeight)), cv = document.createElement('canvas');
        cv.width = Math.max(1, Math.round(img.naturalWidth * k)); cv.height = Math.max(1, Math.round(img.naturalHeight * k));
        const c = cv.getContext('2d'); c.fillStyle = '#fff'; c.fillRect(0, 0, cv.width, cv.height); c.drawImage(img, 0, 0, cv.width, cv.height);
        URL.revokeObjectURL(url);
        cv.toBlob(b => b ? res({blob: b, tipo: 'img', nombre: name.replace(/\.[a-z0-9]+$/i, '') + '.jpg'}) : rej(new Error('No se pudo leer la imagen.')), 'image/jpeg', .85);
      };
      img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('No se pudo leer la imagen.')); };
      img.src = url;
    });
  }
  async function guardarRecibo(p, prep, a) {
    const id = uid('r'), d = new Date();
    await guardarArchivo(id, {blob: prep.blob, tipo: prep.tipo, nombre: prep.nombre});
    S.recibos.push({id, pay: p.id, n: p.n, a, f: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, mk: monthKey(d), tipo: prep.tipo, nombre: prep.nombre, by: S.profile});
    return id;
  }
  // Borra un comprobante (registro y archivo). Lo usa Deshacer de un pago.
  function dropRecibo(id) {
    const k = S.recibos.findIndex(r => r.id === id); if (k >= 0) S.recibos.splice(k, 1);
    S.pays.forEach(p => { if (p.rec === id) delete p.rec; });
    delFile(id);
  }

  /* ===== Visor de comprobantes ===== */
  let lb = null, lbUrl = '', lbBack = null;
  function closeLb() {
    if (!lb || lb.hidden) return;
    lb.hidden = true; lb.innerHTML = ''; if (lbUrl) { URL.revokeObjectURL(lbUrl); lbUrl = ''; }
    if (lbBack && lbBack.focus) lbBack.focus({preventScroll: true}); lbBack = null;
  }
  async function verRecibo(id) {
    const r = S.recibos.find(x => x.id === id);
    let f = null; try { f = await getFile(id); } catch (e) { f = null; }
    if (!r || !f || !f.blob) { island({icon: 'alert', color: 'alert', title: 'No encontramos ese comprobante', sub: 'Pudo borrarse con los datos del navegador', dur: 3200}); return; }
    if (!lb) {
      lb = document.createElement('div'); lb.className = 'cu-lb'; lb.hidden = true; lb.setAttribute('role', 'dialog'); lb.setAttribute('aria-modal', 'true'); lb.setAttribute('aria-label', 'Comprobante');
      document.body.appendChild(lb);
      lb.addEventListener('click', e => { if (e.target === lb || e.target.closest('[data-lb="x"]')) closeLb(); });
    }
    lbBack = document.activeElement; lbUrl = URL.createObjectURL(f.blob);
    lb.innerHTML = `<div class="cu-lb-card"><div class="cu-lb-hd"><div><b>${esc(r.n)}</b><span>${fmt(r.a)} · ${esc(r.f || '')}${r.by ? ' · subió ' + (r.by === 'D' ? 'David' : 'Vale') : ''}</span></div>
      <a class="btn ghost" href="${lbUrl}" download="${esc(f.nombre || 'comprobante')}">${ic('doc')}Descargar</a><button class="iconbtn sm" data-lb="x" aria-label="Cerrar">${ic('x')}</button></div>
      <div class="cu-lb-body">${f.tipo === 'pdf' ? `<iframe src="${lbUrl}" title="Comprobante en PDF"></iframe>` : `<img src="${lbUrl}" alt="Comprobante de ${esc(r.n)}">`}</div></div>`;
    lb.hidden = false; setTimeout(() => { const b = lb.querySelector('[data-lb="x"]'); b && b.focus(); }, 30);
  }

  /* ===== Subir el comprobante después (pago ya marcado) ===== */
  let picker = null;
  function pick(accept, cb) {
    if (!picker) { picker = document.createElement('input'); picker.type = 'file'; picker.hidden = true; document.body.appendChild(picker); }
    picker.accept = accept || 'image/*,application/pdf';
    picker.onchange = () => { const f = picker.files && picker.files[0]; picker.value = ''; if (f) cb(f); };
    picker.click();
  }
  function soporte(payId) {
    const p = S.pays.find(x => x.id === payId); if (!p) return;
    pick('image/*,application/pdf', async f => {
      try { const prep = await prepFile(f), id = await guardarRecibo(p, prep, p.a); p.rec = id; save(); render(false); if (ov && !ov.hidden) paint();
        island({icon: 'clip', color: 'ok', title: 'Comprobante guardado', sub: p.n + ' · ' + fmt(p.a), action: 'Ver', dur: 4200, onAction: () => { setTimeout(() => verRecibo(id), 60); }});
      } catch (e) { island({icon: 'alert', color: 'alert', title: 'No se pudo guardar', sub: e.message || 'Intenta con otro archivo', dur: 4200}); }
    });
  }

  /* ===== Flujo de pago ===== */
  let ps = null, pst = null; // hoja y estado {id, at, file, prep, away}
  function payHTML(p) {
    const dbt = p.debt ? S.debts.find(d => d.id === p.debt) : null, dd = payDay(p) - today;
    const vence = dd < 0 ? `Vencido hace ${plural(-dd, 'día', 'días')}` : dd === 0 ? 'Vence hoy' : `Vence el ${payDay(p)} · en ${plural(dd, 'día', 'días')}`;
    const ent = p.ent || (dbt && dbt.ent) || '';
    return `<div class="cu-ph">${tile(p.i || 'repeat', dd <= 1 ? 'al' : 'a1', 'lg')}<div><h2 id="cuPayT">Pagar ${esc(p.n)}</h2><p>${ent ? esc(ent) + ' · ' : ''}${vence}</p></div>
        <button class="iconbtn sm" data-cp="x" aria-label="Cerrar">${ic('x')}</button></div>
      <ol class="cu-steps" aria-label="Pasos"><li class="${p.link ? 'on' : ''}">${ic('ext')}<span>Pagar en la entidad</span></li><li id="cuStep2">${ic('clip')}<span>Adjuntar comprobante</span></li><li>${ic('ok')}<span>Listo</span></li></ol>
      ${dbt ? `<p class="cu-note">${ic('coin')}Cuota de <b>${esc(dbt.n)}</b> · saldo ${fmt(dbt.saldo)}</p>` : ''}
      <label class="cu-f"><span>Monto que pagaron</span><input class="cu-in cu-big" id="cuPayA" data-money inputmode="numeric" autocomplete="off" value="${fmt(p.a)}"><small>Si el recibo llegó distinto este mes, cámbialo aquí.</small></label>
      ${p.ref ? `<div class="cu-ref"><span>Referencia o contrato</span><b class="mono">${esc(p.ref)}</b><button class="btn ghost" data-cp="copy">Copiar</button></div>` : ''}
      ${p.link ? `<a class="btn acc cu-go" href="${esc(p.link)}" target="_blank" rel="noopener noreferrer" data-cp="go">${ic('ext')}Ir a pagar${ent ? ' en ' + esc(ent) : ''}</a>`
        : `<button class="cu-add" data-cp="addlink">${ic('plus')}<span><b>Agregar el enlace de pago</b><small>Así la próxima vez los lleva directo al portal o a PSE</small></span></button>`}
      <div class="cu-back" id="cuBack" hidden>${ic('bell')}<span><b>¿Ya quedó pago?</b> Adjunten el comprobante y márquenlo.</span></div>
      <div id="cuFileZ">${fileZone()}</div>
      <p class="cu-err" id="cuPayE" role="alert"></p>
      <div class="cu-acts"><button class="btn ghost" data-cp="x">Ahora no</button><button class="btn pri" data-cp="ok" id="cuPayOk">${pst && pst.prep ? 'Guardar pago con comprobante' : 'Marcar como pagado'}</button></div>`;
  }
  function fileZone() {
    if (pst && pst.busy) return `<div class="cu-file busy"><span class="cu-spin" aria-hidden="true"></span><span>Preparando el archivo…</span></div>`;
    if (pst && pst.prep) {
      const th = pst.thumb ? `<img src="${pst.thumb}" alt="">` : ic('doc');
      return `<div class="cu-file ok"><span class="cu-th">${th}</span><span class="cu-fn"><b>${esc(pst.prep.nombre)}</b><small>${pst.prep.tipo === 'pdf' ? 'PDF' : 'Imagen'} · listo para guardar</small></span><button class="iconbtn sm" data-cp="rmfile" aria-label="Quitar el comprobante">${ic('x')}</button></div>`;
    }
    return `<button class="cu-drop" data-cp="file">${ic('clip')}<span><b>Adjuntar comprobante</b><small>Pantallazo, foto o PDF del pago</small></span></button>`;
  }
  function payRefresh() {
    if (!ps || !pst) return;
    ps.querySelector('#cuFileZ').innerHTML = fileZone();
    ps.querySelector('#cuPayOk').textContent = pst.prep ? 'Guardar pago con comprobante' : 'Marcar como pagado';
    ps.querySelector('#cuStep2').classList.toggle('on', !!pst.prep);
  }
  function onReturn() {
    if (!pst || !pst.away || document.visibilityState !== 'visible') return;
    pst.away = false; const b = ps.querySelector('#cuBack'); if (b) b.hidden = false;
    const f = ps.querySelector('[data-cp="file"]'); f && f.focus({preventScroll: true});
  }
  function closePay() {
    if (!ps || ps.hidden) return;
    if (pst && pst.thumb) URL.revokeObjectURL(pst.thumb);
    ps.hidden = true; ps.querySelector('.cu-sheet').innerHTML = ''; document.body.classList.remove('cu-lock-p');
    const back = pst && pst.back; pst = null; if (back && back.isConnected) back.focus({preventScroll: true});
  }
  function pay(id, at) {
    const p = S.pays.find(x => x.id === id); if (!p || p.paid) return;
    if (!ps) {
      ps = document.createElement('div'); ps.className = 'cu-scrim'; ps.hidden = true;
      ps.innerHTML = '<div class="cu-sheet" role="dialog" aria-modal="true" aria-labelledby="cuPayT"></div>';
      document.body.appendChild(ps);
      ps.addEventListener('click', onPayClick);
      ps.addEventListener('input', onMoney);
      document.addEventListener('visibilitychange', onReturn); addEventListener('focus', onReturn);
    }
    pst = {id, at, prep: null, thumb: '', away: false, busy: false, back: document.activeElement};
    ps.querySelector('.cu-sheet').innerHTML = payHTML(p); ps.hidden = false; document.body.classList.add('cu-lock-p');
    setTimeout(() => { const b = ps.querySelector('.cu-go') || ps.querySelector('#cuPayOk'); b && b.focus({preventScroll: true}); }, 40);
  }
  async function onPayClick(e) {
    if (e.target === ps) { closePay(); return; }
    const b = e.target.closest('[data-cp]'); if (!b || !pst) return;
    const p = S.pays.find(x => x.id === pst.id), k = b.dataset.cp, err = ps.querySelector('#cuPayE');
    if (!p) { closePay(); return; }
    if (k === 'x') closePay();
    else if (k === 'go') { pst.away = true; }
    else if (k === 'copy') { try { await navigator.clipboard.writeText(p.ref); island({icon: 'ok', color: 'ok', title: 'Referencia copiada', sub: p.ref, dur: 1800}); } catch (er) { island({icon: 'info', color: 'mu', title: 'Cópiala a mano', sub: p.ref, dur: 3000}); } }
    else if (k === 'addlink') { const dbt = p.debt; closePay(); open(dbt ? 'deudas' : 'pagos', dbt || p.id, 'cuLink'); }
    else if (k === 'rmfile') { if (pst.thumb) URL.revokeObjectURL(pst.thumb); pst.prep = null; pst.thumb = ''; payRefresh(); }
    else if (k === 'file') {
      pick('image/*,application/pdf', async f => {
        if (!pst) return; err.textContent = ''; pst.busy = true; payRefresh();
        try { const prep = await prepFile(f); if (!pst) return; pst.prep = prep; pst.thumb = prep.tipo === 'img' ? URL.createObjectURL(prep.blob) : ''; }
        catch (er) { err.textContent = er.message || 'No se pudo leer el archivo.'; }
        if (pst) { pst.busy = false; payRefresh(); }
      });
    } else if (k === 'ok') {
      if (pst.busy) return;
      const a = digits(ps.querySelector('#cuPayA').value);
      if (!(a > 0)) { err.textContent = 'Escribe cuánto pagaron.'; ps.querySelector('#cuPayA').focus(); return; }
      let rec = '';
      if (pst.prep) {
        b.disabled = true; b.textContent = 'Guardando…';
        try { rec = await guardarRecibo(p, pst.prep, a); }
        catch (er) { b.disabled = false; payRefresh(); err.textContent = 'No se pudo guardar el comprobante (' + (er && er.message || 'sin espacio') + '). Quítalo para marcar el pago sin soporte.'; return; }
      }
      const at = pst.at; closePay(); markPaid(p.id, {a, rec, at});
    }
  }
  function onMoney(e) {
    const t = e.target; if (!t.matches || !t.matches('[data-money]')) return;
    const v = digits(t.value); t.value = v ? fmt(v) : '';
    if (ov && !ov.hidden && t.closest('#cuTopes')) topesCheck();
  }

  /* ===== Pantalla de Cuentas ===== */
  let ov = null, tab = 'pagos', openId = '', draft = null;
  const q = s => ov.querySelector(s);
  const fld = (label, inner, hint, wide) => `<label class="cu-f${wide ? ' wide' : ''}"><span>${label}</span>${inner}${hint ? `<small>${hint}</small>` : ''}</label>`;
  const txt = (name, v, ph, max, extra) => `<input class="cu-in" name="${name}" value="${esc(v || '')}" placeholder="${esc(ph || '')}" maxlength="${max || 60}" autocomplete="off" ${extra || ''}>`;
  const mon = (name, v, ph) => `<input class="cu-in" name="${name}" data-money inputmode="numeric" autocomplete="off" value="${v ? fmt(v) : ''}" placeholder="${ph || '$0'}">`;
  const dayIn = v => `<input class="cu-in" name="d" type="number" min="1" max="31" inputmode="numeric" value="${v || ''}" placeholder="15">`;
  const catSel = v => `<select class="cu-in" name="cat">${S.cats.filter(c => !c.saving).map(c => `<option value="${esc(c.id)}"${c.id === v ? ' selected' : ''}>${esc(c.n)}</option>`).join('')}</select>`;
  const chev = `<svg class="cu-chev" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>`;

  function build() {
    if (ov) return;
    ov = document.createElement('div'); ov.className = 'cu'; ov.id = 'cu'; ov.hidden = true;
    ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-labelledby', 'cuT');
    ov.innerHTML = `<div class="cu-wrap"><header class="cu-hd"><div><span class="cu-ey">La casa</span><h1 id="cuT">Cuentas de la casa</h1></div><button class="btn pri" data-cu="close">Listo</button></header>
      <div class="cu-tabs" role="group" aria-label="Secciones">${TABS.map(([k, t]) => `<button data-cut="${k}" aria-pressed="false">${t}</button>`).join('')}</div>
      <div class="cu-body" id="cuBody"></div></div>`;
    document.body.appendChild(ov);
    ov.addEventListener('click', onClick);
    ov.addEventListener('input', onMoney);
    ov.addEventListener('submit', onSubmit);
    document.addEventListener('keydown', e => {
      if (e.key !== 'Escape') return;
      if (lb && !lb.hidden) { closeLb(); e.stopPropagation(); return; }
      if (ps && !ps.hidden) { closePay(); return; }
      if (ov && !ov.hidden) { if (openId) { openId = ''; draft = null; paint(); } else close(); }
    });
  }
  function open(t, id, focusName) {
    build();
    tab = TABS.some(x => x[0] === t) ? t : 'pagos'; openId = id || ''; draft = null;
    ov.hidden = false; document.body.classList.add('cu-lock'); ov.classList.remove('cu-enter'); void ov.offsetWidth; ov.classList.add('cu-enter');
    paint(focusName || 'n');
    if (!id) setTimeout(() => { const b = q('[data-cu="close"]'); b && b.focus({preventScroll: true}); }, 40);
  }
  function close() { if (!ov || ov.hidden) return; ov.hidden = true; document.body.classList.remove('cu-lock'); openId = ''; draft = null; render(false); }

  function paint(focusName) {
    ov.querySelectorAll('[data-cut]').forEach(b => b.setAttribute('aria-pressed', b.dataset.cut === tab));
    const body = q('#cuBody');
    try { body.innerHTML = ({pagos: pagosTab, deudas: deudasTab, topes: topesTab, soportes: soportesTab})[tab](); }
    catch (e) { console.error('Rumbo · Cuentas:', e); body.innerHTML = '<p class="cu-intro">Algo se enredó aquí. Sus datos siguen guardados.</p>'; }
    if (tab === 'topes') topesCheck();
    if (openId) setTimeout(() => {
      const card = q('.cu-card.open'); if (!card) return;
      card.scrollIntoView({block: 'nearest', behavior: 'smooth'});
      const inp = card.querySelector(`[name="${focusName === 'cuLink' ? 'link' : focusName || 'n'}"]`) || card.querySelector('input'); inp && inp.focus({preventScroll: true});
    }, 60);
  }

  /* --- Pagos fijos --- */
  function payForm(p) {
    const isNew = !p; p = p || draft || {n: '', a: 0, d: '', cat: (S.cats.find(c => !c.saving) || {}).id, ent: '', link: '', ref: ''};
    return `<form class="cu-form" data-form="pay" data-id="${isNew ? 'new' : esc(p.id)}" novalidate>
      ${fld('¿Qué se paga?', txt('n', p.n, 'Ej. Arriendo, Internet, Gimnasio', 50), '', true)}
      ${fld('Monto al mes', mon('a', p.a))}${fld('Día de pago', dayIn(p.d), 'Del 1 al 31')}
      ${fld('Categoría del presupuesto', catSel(p.cat), 'Cuenta contra el tope de esa categoría', true)}
      ${fld('Entidad', txt('ent', p.ent, 'Ej. EPM, Claro, Bancolombia', 50))}${fld('Referencia o contrato', txt('ref', p.ref, 'Opcional', 40))}
      ${fld('Enlace de pago', txt('link', p.link, 'https://… (portal de la entidad o PSE)', 300, 'inputmode="url" spellcheck="false"'), 'El botón «Ir a pagar» los lleva directo aquí', true)}
      <p class="cu-err" role="alert"></p>
      <div class="cu-acts">${isNew ? '<button type="button" class="btn ghost" data-cu="cancel">Cancelar</button>' : `<button type="button" class="btn ghost cu-del" data-cu="delpay" data-id="${esc(p.id)}">${ic('trash')}Eliminar</button>`}<button class="btn pri" type="submit">${isNew ? 'Agregar pago' : 'Guardar cambios'}</button></div></form>`;
  }
  function payCard(p) {
    const on = openId === p.id, dbt = p.debt && S.debts.find(d => d.id === p.debt);
    const sub = [`Día ${p.d}`, p.ent && esc(p.ent), p.auto && 'Se registra solo', p.link ? 'Con enlace de pago' : 'Sin enlace'].filter(Boolean).join(' · ');
    return `<article class="cu-card${on ? ' open' : ''}"><button class="cu-ch" data-cu="toggle" data-id="${esc(p.id)}" aria-expanded="${on}">${tile(p.i || 'repeat', p.paid ? 'ok' : 'a1')}
      <span class="cu-ct"><b>${esc(p.n)}</b><small>${sub}</small></span><span class="cu-cr"><b class="mono">${fmt(p.a)}</b>${p.paid ? '<small class="ok">Pagado</small>' : ''}</span>${chev}</button>
      ${on ? (dbt ? `<div class="cu-form"><p class="cu-intro">Esta es la cuota de la deuda <b>${esc(dbt.n)}</b>. El monto, el día y la entidad se cambian en la deuda.</p><div class="cu-acts"><button class="btn pri" data-cu="godebt" data-id="${esc(dbt.id)}">Editar la deuda</button></div></div>`
        : (pareceDeuda(p) ? `<div class="cu-conv">${ic('coin')}<span><b>¿Esto es una deuda?</b><small>Conviértanla para ver cuánto falta y en qué mes terminan.</small></span>${convBtn(p)}</div>` : '') + payForm(p)) : ''}</article>`;
  }
  function pagosTab() {
    const pays = [...S.pays].sort((a, b) => a.d - b.d), tot = pays.reduce((a, p) => a + p.a, 0), sinLink = pays.filter(p => !p.link).length;
    return `<p class="cu-intro">Lo que se paga cada mes. Toca uno para cambiar la fecha, el monto, la entidad o el enlace donde se paga.</p>
      <div class="cu-kpis"><div><span>Pagos fijos</span><b>${pays.length}</b></div><div><span>Suman al mes</span><b class="mono">${fmt(tot)}</b></div><div><span>Sin enlace de pago</span><b>${sinLink}</b></div></div>
      ${openId === 'new' ? `<article class="cu-card open new"><div class="cu-ch static">${tile('plus', 'a2')}<span class="cu-ct"><b>Nuevo pago fijo</b><small>Se repite cada mes</small></span></div>${payForm(null)}</article>`
        : `<button class="cu-add" data-cu="newpay">${ic('plus')}<span><b>Nuevo pago fijo</b><small>Arriendo, servicios, suscripciones, seguros…</small></span></button>`}
      <div class="cu-list">${pays.map(payCard).join('')}</div>`;
  }

  // v1.6: pagos fijos que en realidad son deudas (sin saldo ni fecha de fin): se pueden convertir
  const pareceDeuda = p => !p.debt && (['g_06', 'g_07'].includes(p.cat) || /deuda|pr[eé]stamo|cr[eé]dito|cuota/i.test(p.n));
  const convBtn = p => `<button class="btn acc" data-cu="convert" data-id="${esc(p.id)}">${ic('coin')}Convertir en deuda</button>`;

  /* --- Deudas --- */
  function finDe(d) {
    if (!(d.saldo > 0) || !(d.cuota > 0)) return null;
    const n = Math.ceil(d.saldo / d.cuota), p = S.pays.find(x => x.debt === d.id), yaEste = p && p.paid;
    const now = new Date(), last = new Date(now.getFullYear(), now.getMonth() + (yaEste ? n : n - 1), 1);
    return {n, cuando: mesLargo(last)};
  }
  function debtForm(d) {
    const isNew = !d || openId === 'new'; d = d || draft || {n: '', tipo: 'otra', ent: '', total: 0, saldo: 0, cuota: 0, d: '', cat: '', link: '', ref: '', nota: ''};
    const from = isNew && d.from && S.pays.find(x => x.id === d.from);
    return `<form class="cu-form" data-form="debt" data-id="${isNew ? 'new' : esc(d.id)}" novalidate>
      ${from ? `<p class="cu-intro">Reemplaza el pago fijo <b>${esc(from.n)}</b> (${fmt(from.a)} el día ${from.d}). Solo falta el saldo${from.paid ? ', <b>ya descontando la cuota que pagaron este mes</b>' : ''}, y el monto con que empezó la deuda.</p>` : ''}
      ${fld('¿Qué deuda es?', txt('n', d.n, 'Ej. Préstamo de mamá', 50), '', true)}
      <div class="cu-f wide"><span>Tipo</span><div class="cu-chips" role="group" aria-label="Tipo de deuda">${Object.entries(TIPOS).map(([k, [t, i]]) => `<button type="button" data-tipo="${k}" aria-pressed="${d.tipo === k}">${ic(i)}${t}</button>`).join('')}</div></div>
      ${fld('¿A quién se le paga?', txt('ent', d.ent, 'Ej. Bancolombia, mi mamá, Claro', 50), '', true)}
      ${fld('Monto total de la deuda', mon('total', d.total), 'Lo que se debía al empezar')}${fld('Saldo que falta hoy', mon('saldo', d.saldo), 'Si es nueva, igual al total')}
      ${fld('Cuota mensual', mon('cuota', d.cuota))}${fld('Día de pago', dayIn(d.d), 'Del 1 al 31')}
      ${fld('Categoría del presupuesto', catSel(d.cat || debtCat(S.cats)), '', true)}
      ${fld('Enlace de pago', txt('link', d.link, 'https://… (opcional)', 300, 'inputmode="url" spellcheck="false"'))}${fld('Referencia u obligación', txt('ref', d.ref, 'Opcional', 40))}
      ${fld('Nota', txt('nota', d.nota, 'Ej. sin intereses, se paga por Nequi', 200), '', true)}
      <p class="cu-err" role="alert"></p>
      <div class="cu-acts">${isNew ? '<button type="button" class="btn ghost" data-cu="cancel">Cancelar</button>' : `<button type="button" class="btn ghost cu-del" data-cu="deldebt" data-id="${esc(d.id)}">${ic('trash')}Eliminar</button>`}<button class="btn pri" type="submit">${isNew ? 'Agregar deuda' : 'Guardar cambios'}</button></div></form>`;
  }
  function debtCard(d) {
    const on = openId === d.id, [tn, ti, tt] = TIPOS[d.tipo] || TIPOS.otra, pct = d.total ? Math.round((d.total - d.saldo) / d.total * 100) : 0, fin = finDe(d);
    const sub = d.saldo <= 0 ? 'Saldada. ¡Qué alivio!' : fin ? `Faltan ${plural(fin.n, 'cuota', 'cuotas')} · terminan en ${fin.cuando}` : 'Sin cuota definida';
    return `<article class="cu-card${on ? ' open' : ''}${d.saldo <= 0 ? ' done' : ''}"><button class="cu-ch" data-cu="toggle" data-id="${esc(d.id)}" aria-expanded="${on}">${tile(ti, d.saldo <= 0 ? 'ok' : tt)}
      <span class="cu-ct"><b>${esc(d.n)}</b><small>${tn}${d.ent ? ' · ' + esc(d.ent) : ''} · día ${d.d}</small></span><span class="cu-cr"><b class="mono">${fmt(d.saldo)}</b><small>cuota ${fmt(d.cuota)}</small></span>${chev}</button>
      <div class="cu-prog"><div class="cu-bar" role="img" aria-label="Pagado ${pct}%"><i style="transform:scaleX(${pct / 100})"></i></div><small>${pct}% pagado · ${sub}</small></div>
      ${on ? debtForm(d) : ''}</article>`;
  }
  function deudasTab() {
    const ds = S.debts, act = ds.filter(d => d.saldo > 0), saldo = act.reduce((a, d) => a + d.saldo, 0), cuotas = act.reduce((a, d) => a + Math.min(d.cuota, d.saldo), 0);
    const total = ds.reduce((a, d) => a + d.total, 0), pag = ds.reduce((a, d) => a + d.total - d.saldo, 0);
    const nuevos = openId === 'new' ? `<article class="cu-card open new"><div class="cu-ch static">${tile('plus', 'a2')}<span class="cu-ct"><b>Nueva deuda</b><small>Su cuota entra sola a los pagos de cada mes</small></span></div>${debtForm(null)}</article>`
      : `<div class="cu-ej"><span>Agregar una deuda</span><div class="cu-chips">${EJEMPLOS.map(([n, t]) => `<button data-cu="newdebt" data-n="${esc(n)}" data-tipo="${t}">${ic(TIPOS[t][1])}${esc(n)}</button>`).join('')}</div></div>`;
    const conv = openId === 'new' ? [] : S.pays.filter(pareceDeuda);
    return `<p class="cu-intro">Préstamos, créditos y cuotas que se pagan cada mes. Cada deuda pone su cuota en los pagos del mes y, al pagarla, baja el saldo solita.</p>
      ${conv.length ? `<div class="cu-pend"><b>${conv.length === 1 ? 'Este pago fijo parece una deuda' : 'Estos pagos fijos parecen deudas'}</b><small class="cu-pend-s">Conviértanlos para saber cuánto falta y cuándo terminan. Su pago de este mes se conserva.</small>${conv.map(p => `<div class="cu-row">${tile('coin', 'al')}<span class="cu-ct"><b>${esc(p.n)}</b><small>${fmt(p.a)} · día ${p.d}${p.paid ? ' · pagado este mes' : ''}</small></span>${convBtn(p)}</div>`).join('')}</div>` : ''}
      ${ds.length ? `<div class="cu-kpis"><div><span>Deben en total</span><b class="mono">${fmt(saldo)}</b></div><div><span>Cuotas al mes</span><b class="mono">${fmt(cuotas)}</b></div><div><span>Ya pagado</span><b>${total ? Math.round(pag / total * 100) : 0}%</b></div></div>` : ''}
      ${nuevos}<div class="cu-list">${[...ds].sort((a, b) => (a.saldo <= 0) - (b.saldo <= 0) || a.d - b.d).map(debtCard).join('') || (openId === 'new' ? '' : '<p class="cu-empty">Sin deudas anotadas. Si no tienen, ¡felicitaciones!</p>')}</div>`;
  }

  /* --- Topes del mes --- */
  function topesTab() {
    const gast = {}; S.moves.forEach(m => { gast[m.cat] = (gast[m.cat] || 0) + m.a; });
    return `<p class="cu-intro">El tope es lo máximo que quieren gastar al mes en cada cosa. Si se acercan, Coral y Oreo les avisan.</p>
      <form id="cuTopes" class="cu-form flat" data-form="topes" novalidate>
        ${fld('Ingreso mensual de la casa', mon('income', S.income), '', true)}
        <div class="cu-tops">${S.cats.map(c => `<label class="cu-top">${tile(c.i, c.saving ? 'ok' : c.t)}<span class="cu-ct"><b>${esc(c.n)}</b><small>${c.saving ? 'Ahorro del mes' : `Gastado ${fmt(gast[c.id] || 0)} este mes`}</small></span><input class="cu-in" data-money data-cat="${esc(c.id)}" inputmode="numeric" autocomplete="off" value="${fmt(c.b)}" aria-label="Tope de ${esc(c.n)}"></label>`).join('')}</div>
        <div class="cu-sumrow"><span>Suma de topes</span><b class="mono" id="cuTopT"></b></div><p class="cu-msg" id="cuTopM" aria-live="polite"></p>
        <div class="cu-acts sticky"><button class="btn pri" type="submit">Guardar topes</button></div></form>`;
  }
  function topesCheck() {
    const f = q('#cuTopes'); if (!f) return;
    const inc = digits(f.querySelector('[name="income"]').value), tot = Array.from(f.querySelectorAll('[data-cat]')).reduce((a, i) => a + digits(i.value), 0);
    q('#cuTopT').textContent = fmt(tot);
    const m = q('#cuTopM'); m.classList.toggle('warn', tot > inc);
    m.textContent = !inc ? 'Escriban el ingreso del mes.' : tot > inc ? `Se pasan ${fmt(tot - inc)} del ingreso. Pueden guardarlo así o bajar algún tope.` : tot === inc ? 'Cuadra perfecto con el ingreso.' : `Quedan ${fmt(inc - tot)} sin asignar.`;
  }

  /* --- Comprobantes --- */
  function soportesTab() {
    const rs = [...S.recibos].sort((a, b) => (b.f || '').localeCompare(a.f || ''));
    const sin = S.pays.filter(p => p.paid && !p.rec);
    const grupos = {}; rs.forEach(r => { (grupos[r.mk] = grupos[r.mk] || []).push(r); });
    return `<p class="cu-intro">Cada comprobante queda guardado con su pago${typeof Nube === 'object' && Nube.activo() ? ' y lo ven los dos' : ' en este navegador'}.</p>
      ${sin.length ? `<div class="cu-pend"><b>Pagados sin comprobante este mes</b>${sin.map(p => `<div class="cu-row">${tile(p.i || 'repeat', 'mu')}<span class="cu-ct"><b>${esc(p.n)}</b><small>${fmt(p.a)}</small></span><button class="btn ghost" data-act="soporte" data-id="${esc(p.id)}">${ic('clip')}Subir</button></div>`).join('')}</div>` : ''}
      ${rs.length ? Object.keys(grupos).map(mk => `<h3 class="cu-mh">${esc(mkLabel(mk))}</h3><div class="cu-list">${grupos[mk].map(r => `<div class="cu-row">${tile(r.tipo === 'pdf' ? 'doc' : 'clip', 'a1')}<span class="cu-ct"><b>${esc(r.n)}</b><small>${esc(r.f)} · ${fmt(r.a)}${r.by ? ' · ' + (r.by === 'D' ? 'David' : 'Vale') : ''}</small></span><button class="btn ghost" data-act="recibo" data-id="${esc(r.id)}">Ver</button><button class="iconbtn sm" data-cu="delrec" data-id="${esc(r.id)}" aria-label="Borrar comprobante de ${esc(r.n)}">${ic('trash')}</button></div>`).join('')}</div>`).join('')
        : '<p class="cu-empty">Aún no hay comprobantes. Al pagar, adjunten el pantallazo o el PDF y quedará aquí.</p>'}`;
  }

  /* --- Eventos --- */
  function readForm(f) { const o = {}; f.querySelectorAll('[name]').forEach(i => { o[i.name] = i.value; }); return o; }
  function onClick(e) {
    const tb = e.target.closest('[data-cut]');
    if (tb) { tab = tb.dataset.cut; openId = ''; draft = null; paint(); return; }
    const tp = e.target.closest('[data-tipo]');
    if (tp && tp.closest('form')) { tp.parentElement.querySelectorAll('[data-tipo]').forEach(x => x.setAttribute('aria-pressed', x === tp)); return; }
    const b = e.target.closest('[data-cu]'); if (!b) return;
    const k = b.dataset.cu, id = b.dataset.id;
    if (k === 'close') close();
    else if (k === 'toggle') { openId = openId === id ? '' : id; draft = null; paint(); }
    else if (k === 'cancel') { openId = ''; draft = null; paint(); }
    else if (k === 'newpay') { openId = 'new'; draft = null; paint(); }
    else if (k === 'newdebt') { openId = 'new'; draft = {n: b.dataset.n === 'Otra deuda' ? '' : b.dataset.n, tipo: b.dataset.tipo, ent: b.dataset.tipo === 'familia' ? 'Mi mamá' : '', total: 0, saldo: 0, cuota: 0, d: '', cat: '', link: '', ref: '', nota: ''}; paint(b.dataset.n === 'Otra deuda' ? 'n' : 'total'); }
    else if (k === 'godebt') { tab = 'deudas'; openId = id; paint(); }
    else if (k === 'convert') {
      const p = S.pays.find(x => x.id === id); if (!p) return;
      const tipo = /celular|claro|movistar|tigo/i.test(p.n + ' ' + (p.ent || '')) ? 'celular' : /tarjeta/i.test(p.n) ? 'tarjeta' : /mam[aá]|pap[aá]|familia|t[ií]a|herman/i.test(p.n + ' ' + (p.ent || '')) ? 'familia' : /banco|cr[eé]dito|bancolombia|davivienda|bbva|nequi/i.test(p.n + ' ' + (p.ent || '')) ? 'banco' : 'otra';
      tab = 'deudas'; openId = 'new'; draft = {n: p.n, tipo, ent: p.ent || '', total: 0, saldo: 0, cuota: p.a, d: p.d, cat: p.cat, link: p.link || '', ref: p.ref || '', nota: '', from: p.id};
      paint('saldo');
    }
    else if (k === 'delpay') delPay(id);
    else if (k === 'deldebt') delDebt(id);
    else if (k === 'delrec') delRec(id);
  }
  function onSubmit(e) {
    e.preventDefault();
    const f = e.target, kind = f.dataset.form, err = f.querySelector('.cu-err');
    const fail = (m, name) => { if (err) err.textContent = m; const i = name && f.querySelector(`[name="${name}"]`); if (i) { i.setAttribute('aria-invalid', 'true'); i.focus(); } };
    f.querySelectorAll('[aria-invalid]').forEach(i => i.removeAttribute('aria-invalid'));
    if (kind === 'topes') {
      const inc = digits(f.querySelector('[name="income"]').value); if (!(inc > 0)) { q('#cuTopM').textContent = 'El ingreso debe ser mayor a cero.'; return; }
      S.income = inc; f.querySelectorAll('[data-cat]').forEach(i => { const c = S.cats.find(x => x.id === i.dataset.cat); if (c) c.b = digits(i.value); });
      save(); render(false); island({icon: 'ok', color: 'ok', title: 'Topes guardados', sub: 'Ingreso ' + fmt(inc), dur: 2600}); return;
    }
    const v = readForm(f), n = String(v.n || '').trim().replace(/\s+/g, ' '), d = int(v.d), url = fixUrl(v.link), cat = S.cats.some(c => c.id === v.cat) ? v.cat : debtCat(S.cats);
    if (n.length < 2) return fail('Escribe el nombre.', 'n');
    if (!(d >= 1 && d <= 31)) return fail('El día debe estar entre 1 y 31.', 'd');
    if (url.err) return fail(url.err, 'link');
    const base = {n: n.slice(0, 50), d, cat, ent: String(v.ent || '').trim().slice(0, 50), link: url.v, ref: String(v.ref || '').trim().slice(0, 40)};
    if (kind === 'pay') {
      const a = digits(v.a); if (!(a > 0)) return fail('Escribe el monto del mes.', 'a');
      const icon = (S.cats.find(c => c.id === cat) || {}).i || 'repeat';
      if (f.dataset.id === 'new') { const p = {id: uid('p'), i: icon, a, paid: false, auto: false, ...base}; S.pays.push(p); openId = ''; island({icon: 'plus', color: 'ok', title: `${p.n} quedó en los pagos fijos`, sub: `Día ${d} · ${fmt(a)}`, dur: 2800}); }
      else { const p = S.pays.find(x => x.id === f.dataset.id); if (!p) return; Object.assign(p, base, {a, i: p.cat === cat ? p.i : icon}); openId = ''; island({icon: 'ok', color: 'ok', title: 'Cambios guardados', sub: p.n, dur: 2200}); }
    } else if (kind === 'debt') {
      const saldo = digits(v.saldo), total = Math.max(digits(v.total) || saldo, saldo), cuota = digits(v.cuota);
      if (!(total > 0)) return fail('Escribe el monto total o el saldo.', 'total');
      if (saldo > 0 && !(cuota > 0)) return fail('Escribe la cuota mensual.', 'cuota');
      const tipo = (f.querySelector('[data-tipo][aria-pressed="true"]') || {dataset: {tipo: 'otra'}}).dataset.tipo;
      const o = {...base, tipo: TIPOS[tipo] ? tipo : 'otra', total, saldo, cuota, nota: String(v.nota || '').trim().slice(0, 200)};
      if (f.dataset.id === 'new') {
        const nd = {id: uid('d'), ...o}, old = draft && draft.from ? S.pays.find(x => x.id === draft.from && !x.debt) : null;
        S.debts.push(nd); syncDebts(S);
        if (old) {
          // La cuota nueva hereda lo del pago viejo (pagado este mes, quién, comprobante, automático) y el viejo sale
          const np = S.pays.find(x => x.debt === nd.id);
          if (np) {
            if (old.paid) { np.paid = true; np.a = old.a; if (old.by) np.by = old.by; if (old.rec) np.rec = old.rec; }
            if (old.auto) { np.auto = true; if (old.autoFrom) np.autoFrom = old.autoFrom; }
            S.recibos.forEach(r => { if (r.pay === old.id) r.pay = np.id; });
          }
          S.pays.splice(S.pays.indexOf(old), 1);
        }
        const fin = finDe(nd);
        island({icon: 'coin', color: 'a1', title: old ? `${o.n} ahora es una deuda` : `${o.n} quedó anotada`, sub: !saldo ? 'Ya está saldada' : fin ? `Faltan ${plural(fin.n, 'cuota', 'cuotas')} · terminan en ${fin.cuando}` : `Cuota de ${fmt(cuota)} el día ${d}`, dur: 3800});
      }
      else { const x = S.debts.find(y => y.id === f.dataset.id); if (!x) return; Object.assign(x, o); island({icon: 'ok', color: 'ok', title: 'Deuda actualizada', sub: x.n, dur: 2200}); }
      openId = ''; draft = null; syncDebts(S);
    }
    save(); render(false); paint();
  }
  function delPay(id) {
    const k = S.pays.findIndex(p => p.id === id); if (k < 0) return;
    const p = S.pays.splice(k, 1)[0]; openId = ''; save(); render(false); paint();
    island({icon: 'trash', color: 'mu', title: `${p.n} salió de los pagos fijos`, sub: 'Los gastos ya registrados se quedan', action: 'Deshacer', dur: 5200, onAction: () => { S.pays.splice(k, 0, p); save(); render(false); if (ov && !ov.hidden) paint(); }});
  }
  function delDebt(id) {
    const k = S.debts.findIndex(d => d.id === id); if (k < 0) return;
    const d = S.debts.splice(k, 1)[0], before = S.pays.slice(); syncDebts(S); openId = ''; save(); render(false); paint();
    island({icon: 'trash', color: 'mu', title: `${d.n} se borró`, sub: 'Su cuota sale de los pagos del mes', action: 'Deshacer', dur: 5200, onAction: () => { S.debts.splice(k, 0, d); S.pays = before; syncDebts(S); save(); render(false); if (ov && !ov.hidden) paint(); }});
  }
  function delRec(id) {
    const k = S.recibos.findIndex(r => r.id === id); if (k < 0) return;
    const r = S.recibos.splice(k, 1)[0], p = S.pays.find(x => x.rec === id); if (p) delete p.rec;
    let undone = false; save(); render(false); paint();
    setTimeout(() => { if (!undone) delFile(id); }, 7000);
    island({icon: 'trash', color: 'mu', title: 'Comprobante borrado', sub: r.n, action: 'Deshacer', dur: 5600, onAction: () => { undone = true; S.recibos.splice(k, 0, r); if (p) p.rec = id; save(); render(false); if (ov && !ov.hidden) paint(); }});
  }

  /* ===== Tarjeta de deudas para Finanzas ===== */
  function resumenHTML() {
    const ds = (S.debts || []).filter(d => d.saldo > 0);
    if (!ds.length) return `<section class="glass cu-fin" style="--i:4"><div class="cu-fin-empty">${tile('coin', 'a1')}<div><b>¿Tienen deudas o préstamos?</b><span>Anótenlos y Rumbo les dice cuándo terminan de pagarlos.</span></div><button class="btn acc" data-act="cuentas" data-id="deudas">${ic('plus')}Anotar</button></div></section>`;
    const saldo = ds.reduce((a, d) => a + d.saldo, 0), cuotas = ds.reduce((a, d) => a + Math.min(d.cuota, d.saldo), 0);
    return `<section class="glass cu-fin" style="--i:4"><div class="gx-ch"><h2>Deudas</h2><p>Deben ${fmt(saldo)} · cuotas de ${fmt(cuotas)} al mes</p></div>
      <div class="cu-list">${ds.slice(0, 5).map(d => { const pct = d.total ? Math.round((d.total - d.saldo) / d.total * 100) : 0, fin = finDe(d), [, ti, tt] = TIPOS[d.tipo] || TIPOS.otra;
        return `<div class="cu-frow">${tile(ti, tt)}<span class="cu-ct"><b>${esc(d.n)}</b><small>${fin ? `Terminan en ${fin.cuando}` : ''}</small><span class="cu-bar"><i style="transform:scaleX(${pct / 100})"></i></span></span><span class="cu-cr"><b class="mono">${fmt(d.saldo)}</b><small>${pct}% pagado</small></span></div>`; }).join('')}</div>
      <div class="gx-cta"><button class="btn ghost" data-act="cuentas" data-id="deudas">${ic('edit')}Ver y editar deudas</button></div></section>`;
  }

  return {open, close, pay, soporte, verRecibo, dropRecibo, resumenHTML, archivo: getFile, guardarArchivo, borrarArchivo: delFile, isOpen: () => !!ov && !ov.hidden, pure: {fixUrl, digits}};
})();

// Rumbo · Robot de avisos. Corre gratis en GitHub Actions cada 15 minutos.
// Lee la casa en Firestore y manda avisos push a los iPhone de Vale y David:
// pagos que vencen, mensajes nuevos del chat y cofres listos para abrir.
// Secretos (GitHub › Settings › Secrets › Actions): FIREBASE_SA (JSON de la cuenta de servicio) y VAPID_PRIVATE.
import admin from 'firebase-admin';
import webpush from 'web-push';
import fs from 'node:fs';
import vm from 'node:vm';

const TZ = 'America/Bogota', APP = 'https://rumbocasa.github.io/';
const NOMBRE = {V: 'Vale', D: 'David'}, OTRO = {V: 'D', D: 'V'};

// Mientras no estén los secretos configurados, el robot espera tranquilo (sin fallar ni mandar correos de error)
if (!process.env.FIREBASE_SA || !process.env.VAPID_PRIVATE) { console.log('Faltan los secretos FIREBASE_SA o VAPID_PRIVATE: no se envía nada todavía.'); process.exit(0); }
admin.initializeApp({credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SA))});
const db = admin.firestore();
webpush.setVapidDetails(APP, process.env.VAPID_PUBLIC, process.env.VAPID_PRIVATE);
const casa = db.collection('hogares').doc('rumbo');

const fmt = n => '$' + Math.round(+n || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
function ahora() {
  const p = new Intl.DateTimeFormat('en-CA', {timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23'}).formatToParts(new Date());
  const g = k => p.find(x => x.type === k).value;
  return {iso: `${g('year')}-${g('month')}-${g('day')}`, d: +g('day'), h: +g('hour')};
}

/* ===== Buzón automático: Siri y los mensajes del banco ===== */
// El mismo cerebro de Coral que usa la app (js-aprende.js + js-asistente.js del repositorio), cargado en una caja aislada
let cerebro = null;
function cargarCerebro() {
  if (cerebro) return cerebro;
  const fmt = n => (n < 0 ? '−$' : '$') + Math.round(Math.abs(+n || 0)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const ctx = vm.createContext({fmt, console, Date, Math, JSON, Intl, RegExp, String, Number, Array, Object, setTimeout, clearTimeout, setInterval, clearInterval});
  for (const f of ['js-aprende.js', 'js-asistente.js']) vm.runInContext(fs.readFileSync(f, 'utf8').replace(/^const (Aprende|Asistente) =/m, 'var $1 ='), ctx, {filename: f});
  cerebro = {Aprende: ctx.Aprende, Asistente: ctx.Asistente};
  return cerebro;
}
// Resumen para el widget (igual que resumenCasa() de la app)
function resumenDe(S) {
  const n = new Date(), out = (S.moves || []).reduce((a, m) => a + m.a, 0), dim = new Date(n.getFullYear(), n.getMonth() + 1, 0).getDate();
  const pend = (S.pays || []).filter(p => !p.paid).sort((a, b) => a.d - b.d)[0];
  const metas = (S.goals || []).filter(g => !g.open && g.t > 0 && g.s < g.t).sort((a, b) => (a.by ? +new Date(a.by) : 9e15) - (b.by ? +new Date(b.by) : 9e15)), m = metas[0];
  const t = (S.pts.V || 0) + (S.pts.D || 0), ult = [...(S.notas || [])].reverse().find(x => (x.by === 'V' || x.by === 'D') && x.c !== 'a');
  const cofres = (S.goals || []).reduce((a, g) => g.open || !(g.t > 0) ? a : a + [25, 50, 75, 100].filter(s => g.s / g.t >= s / 100 && !(g.cofres || []).some(c => +c.s === s)).length, 0);
  return {disp: S.income - out, ingreso: S.income, gastado: out, dias: dim - n.getDate(), mes: n.toLocaleDateString('es-CO', {month: 'long', timeZone: TZ}),
    prox: pend ? {n: pend.n, a: pend.a, d: pend.d} : null, pendientes: (S.pays || []).filter(p => !p.paid).length,
    meta: m ? {n: m.n, pct: Math.round(m.s / m.t * 100), s: m.s, t: m.t} : null, racha: S.streak || 0, nivel: Math.floor(t / 100) + 1, pts: {V: S.pts.V || 0, D: S.pts.D || 0}, cofres,
    chat: ult ? {by: ult.by, t: String(ult.t).slice(0, 120), at: ult.at} : null, at: n.toISOString()};
}
const leerM = m => { const [tok, para, origen, ...resto] = String(m || '').split('|'); let texto = resto.join('|').trim(); if (/^b64:/.test(texto)) texto = Buffer.from(texto.slice(4).replace(/\s+/g, ''), 'base64').toString('utf8'); return {tok, para: para === 'D' ? 'D' : 'V', origen: (origen || 'voz').slice(0, 12), texto: texto.replace(/\s+/g, ' ').trim().slice(0, 1000)}; };
async function buzon(subs) {
  const docs = (await casa.collection('buzon').limit(20).get()).docs; if (!docs.length) return;
  const {Asistente} = cargarCerebro(), hechos = [];
  await db.runTransaction(async tx => {
    hechos.length = 0;
    const snap = await tx.get(casa), d = snap.data(), raw = JSON.parse(d.json), S = raw.data || raw;
    (S.goals || []).forEach(g => { if (g.by) g.by = new Date(g.by); });
    S.notas = S.notas || []; S.recordatorios = S.recordatorios || []; S.debts = S.debts || [];
    const uid = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    for (const doc of docs) {
      const e = leerM(doc.data().m);
      if (!d.buzonTok || e.tok !== d.buzonTok || !e.texto) { hechos.push({doc, nada: true}); continue; }
      const ahora = new Date(), nota = {id: uid('n'), t: (e.origen === 'banco' ? 'Desde mi banco: ' : '') + e.texto, k: 'nota', at: ahora.toISOString(), by: e.para, att: [], hecho: false, fav: false, c: 'a', para: e.para};
      S.notas.push(nota);
      let r; try { r = Asistente.ejecutar(e.texto, S, e.para, ahora, nota.id); } catch (er) { console.error('Coral:', er.message); r = {texto: 'Me llegó algo que no entendí: «' + e.texto.slice(0, 80) + '». Revísalo en el chat.'}; }
      const card = r.card ? {...r.card} : null; if (card && !card.ref) card.ref = nota.id;
      S.notas.push({id: uid('n'), t: r.texto, k: 'respuesta', at: new Date(ahora.getTime() + 1).toISOString(), by: 'bot', att: [], hecho: false, fav: false, c: 'a', para: e.para, ...(card ? {card} : {})});
      hechos.push({doc, para: e.para, texto: r.texto, origen: e.origen});
    }
    if (S.notas.length > 600) S.notas.splice(0, S.notas.length - 600);
    const json = JSON.stringify(raw), resumen = resumenDe(S);
    tx.set(casa, {...d, json, rev: 'robot' + Date.now().toString(36), by: 'robot', at: admin.firestore.FieldValue.serverTimestamp(), resumen});
    if (S.widgetTok) tx.set(casa.collection('widget').doc(S.widgetTok), {resumen, at: admin.firestore.FieldValue.serverTimestamp()});
  });
  for (const h of hechos) {
    await h.doc.ref.delete();
    if (h.nada) continue;
    for (const s of subs.filter(x => x.perfil === h.para)) {
      try { await webpush.sendNotification(s.sub, JSON.stringify({title: `${h.para === 'D' ? 'Oreo' : 'Coral'} ${h.origen === 'banco' ? 'vio tu banco' : 'anotó'}`, body: h.texto.slice(0, 180), url: APP + '#apuntes', tag: 'buzon'}), {TTL: 6 * 3600}); } catch (er) { console.log('No se pudo avisar', s.id, er.statusCode || er.message); }
    }
  }
  console.log(`Buzón: ${hechos.filter(h => !h.nada).length} procesados`);
}

async function vuelta() {
  const snap = await casa.get(); if (!snap.exists || !snap.data().json) { console.log('Sin casa todavía'); return; }
  const raw = JSON.parse(snap.data().json), S = raw.data || raw;
  const estRef = casa.collection('robot').doc('estado'), est = (await estRef.get()).data() || {};
  const enviados = est.enviados || {}, primeraVez = !est.chatDesde;
  const chatDesde = est.chatDesde || new Date().toISOString();
  const subs = (await casa.collection('push').get()).docs.map(d => ({id: d.id, ...d.data()}));
  // Prueba manual (botón «Run workflow» con «prueba» marcado): un aviso a todos los celulares, sin tocar nada más
  if (process.env.PRUEBA === 'si') {
    let ok = 0;
    for (const s of subs) { try { await webpush.sendNotification(s.sub, JSON.stringify({title: 'Rumbo · prueba de avisos', body: `Hola ${NOMBRE[s.perfil] || ''}: si ves esto, los avisos funcionan.`, url: APP, tag: 'prueba'}), {TTL: 3600}); ok++; } catch (e) { console.log('Falló', s.id, e.statusCode || e.message); } }
    console.log(`Prueba: ${ok} de ${subs.length} celulares`); return;
  }
  try { await buzon(subs); } catch (e) { console.error('Buzón con error:', e.message || e); }
  const H = ahora(), avisos = [];

  // 1. Pagos: mañana, hoy y vencidos (entre 8 a. m. y 9 p. m., uno por día y por pago)
  if (H.h >= 8 && H.h <= 21) for (const p of S.pays || []) {
    if (p.paid || !p.id) continue;
    const dd = (+p.d || 0) - H.d;
    const t = dd === 1 ? `Mañana vence ${p.n}` : dd === 0 ? `Hoy vence ${p.n}` : dd < 0 ? `${p.n} está vencido` : null;
    if (t) avisos.push({para: 'A', title: t, body: `${fmt(p.a)} · Páguenlo desde Rumbo y guarden el comprobante.`, url: APP + '#finanzas', key: `pago:${p.id}:${H.iso}`, tag: `pago-${p.id}`});
  }
  // 2. Chat de la pareja (no el privado con el asistente): lo que escribe uno le llega al otro
  let ultimo = chatDesde;
  for (const n of S.notas || []) {
    if ((n.by !== 'V' && n.by !== 'D') || n.c === 'a' || !n.at || n.at <= chatDesde) continue;
    if (n.at > ultimo) ultimo = n.at;
    if (primeraVez) continue; // la primera vez no se manda lo viejo
    const txt = String(n.t || '').trim();
    avisos.push({para: OTRO[n.by], title: `${NOMBRE[n.by]} escribió en el chat`, body: txt ? txt.slice(0, 140) : 'Mandó una foto o un archivo', url: APP + '#apuntes', key: `chat:${n.id}`, tag: 'chat'});
  }
  // 3. Cofres listos en la ruta de metas (25, 50, 75 y 100 %)
  for (const g of S.goals || []) {
    if (g.open || !(g.t > 0)) continue;
    const abiertos = new Set((g.cofres || []).map(c => +c.s));
    for (const s of [25, 50, 75, 100]) if (g.s / g.t >= s / 100 && !abiertos.has(s))
      avisos.push({para: 'A', title: '¡Hay un cofre listo!', body: `${g.n} llegó al ${s} %. Ábranlo en Planes › Metas y vean su premio.`, url: APP + '#tareas', key: `cofre:${g.id}:${s}`, tag: `cofre-${g.id}`});
  }

  // 4. Recordatorios del asistente (Coral para Vale, Oreo para David), a su hora
  const ahoraMs = Date.now();
  for (const r of S.recordatorios || []) {
    if (r.hecho || r.avisado || !r.at) continue;
    const t = new Date(r.at).getTime();
    if (t > ahoraMs + 60e3 || ahoraMs - t > 6 * 3600e3) continue;
    avisos.push({para: r.para === 'D' || r.para === 'V' ? r.para : 'A', title: `${r.para === 'D' ? 'Oreo' : 'Coral'} te recuerda`, body: r.t, url: APP + '#apuntes', key: `rec:${r.id}:${r.at}`, tag: `rec-${r.id}`});
  }

  // 5. Lo que hizo el otro: pagos marcados, gastos y abonos anotados, tareas hechas (de 7 a. m. a 10 p. m.;
  //    lo de la noche espera a la mañana). Varios seguidos se agrupan en un solo aviso.
  const hechos = est.hechos || {}, movsAntes = est.movs || null, movsAhora = {}, nuevos = {V: [], D: []};
  for (const m of S.moves || []) { const k = `${m.n}|${m.a}|${m.d}|${m.w}`; movsAhora[k] = (movsAhora[k] || 0) + 1; }
  const despierto = H.h >= 7 && H.h <= 22, base = !est.hechos;
  if (despierto || base) {
    const catN = id => ((S.cats || []).find(c => c.id === id) || {}).n || 'Gastos';
    for (const p of S.pays || []) {
      const k = `pago:${p.id}`;
      if (!p.paid) { delete hechos[k]; continue; }
      if (hechos[k]) continue; hechos[k] = 1;
      if (!base && (p.by === 'V' || p.by === 'D')) nuevos[p.by].push(`pagó ${p.n} · ${fmt(p.a)}`);
    }
    for (const t of S.tasks || []) {
      const k = `tarea:${t.id}`;
      if (!t.done) { delete hechos[k]; continue; }
      if (hechos[k]) continue; hechos[k] = 1;
      if (!base && (t.w === 'V' || t.w === 'D')) nuevos[t.w].push(`hizo «${t.n}»`);
    }
    if (movsAntes && !base) for (const [k, c] of Object.entries(movsAhora)) {
      const extra = c - (movsAntes[k] || 0); if (extra <= 0) continue;
      const m = (S.moves || []).find(x => `${x.n}|${x.a}|${x.d}|${x.w}` === k);
      if (!m || (m.w !== 'V' && m.w !== 'D') || /^Pago ·/.test(m.n) || (S.pays || []).some(p => p.n === m.n && p.a === m.a)) continue; // los pagos ya se avisan arriba
      for (let i = 0; i < extra; i++) nuevos[m.w].push(m.cat === 'ahorro' ? `abonó ${fmt(m.a)} a ${m.n.replace(/^Abono · /, '')}` : `anotó ${fmt(m.a)} en ${m.n || catN(m.cat)}`);
    }
    for (const q of ['V', 'D']) {
      const l = nuevos[q]; if (!l.length) continue;
      const firma = l.join('·').slice(0, 60);
      avisos.push({para: OTRO[q], title: l.length === 1 ? `${NOMBRE[q]} ${l[0].split(' · ')[0]}` : `${NOMBRE[q]} registró ${l.length} cosas`, body: l.length === 1 ? `${l[0][0].toUpperCase() + l[0].slice(1)}. Ya quedó en Rumbo.` : l.map(x => x[0].toUpperCase() + x.slice(1)).join('\n').slice(0, 220), url: APP + '#finanzas', key: `hizo:${q}:${Date.now()}:${firma}`, tag: `hizo-${q}`});
    }
  }

  // 6. El widget se refresca solo cuando cambian los datos (también si nadie abre la app: días que quedan, etc.)
  if (S.widgetTok) {
    const r = resumenDe(S), {at, ...sin} = r, firma = JSON.stringify(sin);
    if (firma !== est.widgetFirma) { await casa.collection('widget').doc(S.widgetTok).set({resumen: r, at: admin.firestore.FieldValue.serverTimestamp()}); est.widgetFirma = firma; }
  }

  let n = 0;
  for (const a of avisos) {
    if (enviados[a.key]) continue;
    const destino = subs.filter(s => a.para === 'A' || s.perfil === a.para);
    for (const s of destino) {
      try { await webpush.sendNotification(s.sub, JSON.stringify({title: a.title, body: a.body, url: a.url, tag: a.tag}), {TTL: 6 * 3600, urgency: 'normal'}); n++; }
      catch (e) {
        console.log('No se pudo enviar a', s.id, e.statusCode || e.message);
        if (e.statusCode === 404 || e.statusCode === 410) await casa.collection('push').doc(s.id).delete(); // suscripción vencida
      }
    }
    enviados[a.key] = Date.now();
  }
  // Se olvidan las marcas de más de 40 días para que el estado no crezca
  const lim = Date.now() - 40 * 864e5;
  for (const k of Object.keys(enviados)) if (enviados[k] < lim) delete enviados[k];
  await estRef.set({enviados, chatDesde: ultimo, corrida: new Date().toISOString(), avisos: avisos.length, enviadosAhora: n,
    hechos, movs: despierto || base ? movsAhora : (movsAntes || movsAhora), widgetFirma: est.widgetFirma || null});
  console.log(`Avisos: ${avisos.length} posibles · ${n} enviados · ${subs.length} celulares`);
}
// Cada corrida (GitHub la lanza más o menos cada hora) se queda ~52 minutos revisando cada 2 minutos:
// así los recordatorios llegan a su hora y los mensajes del chat en pocos minutos.
async function main() {
  const fin = Date.now() + (process.env.PRUEBA === 'si' ? 0 : 52 * 60e3);
  do {
    try { await vuelta(); } catch (e) { console.error('Vuelta con error:', e.message || e); }
    if (Date.now() + 120e3 >= fin) break;
    await new Promise(r => setTimeout(r, 120e3));
  } while (Date.now() < fin);
}
main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });

// Rumbo · Robot de avisos. Corre gratis en GitHub Actions cada 15 minutos.
// Lee la casa en Firestore y manda avisos push a los iPhone de Vale y David:
// pagos que vencen, mensajes nuevos del chat y cofres listos para abrir.
// Secretos (GitHub › Settings › Secrets › Actions): FIREBASE_SA (JSON de la cuenta de servicio) y VAPID_PRIVATE.
import admin from 'firebase-admin';
import webpush from 'web-push';

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
  await estRef.set({enviados, chatDesde: ultimo, corrida: new Date().toISOString(), avisos: avisos.length, enviadosAhora: n});
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

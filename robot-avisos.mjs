// Rumbo · Robot de avisos. Corre gratis en GitHub Actions cada 15 minutos.
// Lee la casa en Firestore y manda avisos push a los iPhone de Vale y David:
// pagos que vencen, mensajes nuevos del chat y cofres listos para abrir.
// Secretos (GitHub › Settings › Secrets › Actions): FIREBASE_SA (JSON de la cuenta de servicio) y VAPID_PRIVATE.
import admin from 'firebase-admin';
import webpush from 'web-push';

const TZ = 'America/Bogota', APP = 'https://rumbocasa.github.io/';
const NOMBRE = {V: 'Vale', D: 'David'}, OTRO = {V: 'D', D: 'V'};

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

async function main() {
  const snap = await casa.get(); if (!snap.exists || !snap.data().json) { console.log('Sin casa todavía'); return; }
  const raw = JSON.parse(snap.data().json), S = raw.data || raw;
  const estRef = casa.collection('robot').doc('estado'), est = (await estRef.get()).data() || {};
  const enviados = est.enviados || {}, primeraVez = !est.chatDesde;
  const chatDesde = est.chatDesde || new Date().toISOString();
  const subs = (await casa.collection('push').get()).docs.map(d => ({id: d.id, ...d.data()}));
  const H = ahora(), avisos = [];

  // 1. Pagos: mañana, hoy y vencidos (entre 8 a. m. y 9 p. m., uno por día y por pago)
  if (H.h >= 8 && H.h <= 21) for (const p of S.pays || []) {
    if (p.paid || !p.id) continue;
    const dd = (+p.d || 0) - H.d;
    const t = dd === 1 ? `Mañana vence ${p.n}` : dd === 0 ? `Hoy vence ${p.n}` : dd < 0 ? `${p.n} está vencido` : null;
    if (t) avisos.push({para: 'A', title: t, body: `${fmt(p.a)} · Páguenlo desde Rumbo y guarden el comprobante.`, url: APP + '#finanzas', key: `pago:${p.id}:${H.iso}`, tag: `pago-${p.id}`});
  }
  // 2. Chat: lo que escribe uno le llega al otro
  let ultimo = chatDesde;
  for (const n of S.notas || []) {
    if ((n.by !== 'V' && n.by !== 'D') || !n.at || n.at <= chatDesde) continue;
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
main().catch(e => { console.error(e); process.exit(1); });

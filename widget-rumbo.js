// Rumbo · Widget para iPhone (app gratuita Scriptable).
// Muestra lo disponible del mes, el próximo pago, la meta que sigue, la racha y los cofres.
// Al tocarlo abre Rumbo. Parámetro del widget (opcional): "chat", "metas" o "plata" para abrir esa parte.
// La primera vez, ábranlo dentro de Scriptable (▶) para entrar con su correo y contraseña de Rumbo.

const API_KEY = 'AIzaSyCryL2V5_gyrj16zzzSfzoENVZaOpnqIEs'; // clave web de Firebase (no es secreta; la protegen las reglas)
const PROYECTO = 'rumbo-24d13', CASA = 'rumbo', APP = 'https://rumbocasa.github.io/';
const K = {mail: 'rumbo.mail', refresh: 'rumbo.refresh', cache: 'rumbo.cache'};
const C = {fondo1: new Color('#FFE7CC'), fondo2: new Color('#F9C6D6'), tinta: new Color('#1B100B'), suave: new Color('#4A3F38'), marron: new Color('#7A2E1E'), rosa: new Color('#C2477A'), verde: new Color('#2E8B6A'), oro: new Color('#E8A93A')};
const fmt = n => '$' + Math.round(+n || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const corto = n => { n = +n || 0; return n >= 1e6 ? '$' + (n / 1e6).toFixed(1).replace('.', ',').replace(',0', '') + 'M' : n >= 1e3 ? '$' + Math.round(n / 1e3) + 'k' : fmt(n); };

async function post(url, body) {
  const r = new Request(url); r.method = 'POST'; r.headers = {'Content-Type': 'application/json'}; r.body = JSON.stringify(body);
  const j = await r.loadJSON(); if (j.error) throw new Error(j.error.message || 'Error de Firebase'); return j;
}
async function entrar() {
  const a = new Alert(); a.title = 'Rumbo'; a.message = 'Entren con el correo y la contraseña de Rumbo (si entran con Google, primero creen una contraseña con «Olvidé mi contraseña» en Rumbo).';
  a.addTextField('Correo', Keychain.contains(K.mail) ? Keychain.get(K.mail) : ''); a.addSecureTextField('Contraseña', '');
  a.addAction('Entrar'); a.addCancelAction('Cancelar');
  if (await a.presentAlert() < 0) throw new Error('Cancelado');
  const email = a.textFieldValue(0).trim(), password = a.textFieldValue(1);
  const j = await post(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`, {email, password, returnSecureToken: true});
  Keychain.set(K.mail, email); Keychain.set(K.refresh, j.refreshToken);
  return j.idToken;
}
async function token() {
  if (!Keychain.contains(K.refresh)) { if (config.runsInWidget) throw new Error('Abran el widget en Scriptable para entrar'); return entrar(); }
  try {
    const r = new Request(`https://securetoken.googleapis.com/v1/token?key=${API_KEY}`); r.method = 'POST';
    r.headers = {'Content-Type': 'application/x-www-form-urlencoded'}; r.body = 'grant_type=refresh_token&refresh_token=' + encodeURIComponent(Keychain.get(K.refresh));
    const j = await r.loadJSON(); if (j.error) throw new Error(j.error.message);
    Keychain.set(K.refresh, j.refresh_token); return j.id_token;
  } catch (e) { Keychain.remove(K.refresh); if (config.runsInWidget) throw e; return entrar(); }
}
// Firestore REST devuelve valores tipados: los convertimos a JS normal
function val(v) {
  if (!v) return null;
  if ('stringValue' in v) return v.stringValue; if ('integerValue' in v) return +v.integerValue; if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue; if ('nullValue' in v) return null; if ('timestampValue' in v) return v.timestampValue;
  if ('mapValue' in v) { const o = {}; for (const [k, x] of Object.entries(v.mapValue.fields || {})) o[k] = val(x); return o; }
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(val);
  return null;
}
async function datos() {
  try {
    const t = await token(), r = new Request(`https://firestore.googleapis.com/v1/projects/${PROYECTO}/databases/(default)/documents/hogares/${CASA}`);
    r.headers = {Authorization: 'Bearer ' + t};
    const j = await r.loadJSON(); if (j.error) throw new Error(j.error.message);
    const res = val(j.fields && j.fields.resumen); if (!res) throw new Error('Abran Rumbo una vez para preparar el widget');
    Keychain.set(K.cache, JSON.stringify(res)); return {res, viejo: false};
  } catch (e) {
    if (Keychain.contains(K.cache)) return {res: JSON.parse(Keychain.get(K.cache)), viejo: true, error: e.message};
    throw e;
  }
}
function texto(st, s, size, color, peso) { const t = st.addText(s); t.font = peso === 'b' ? Font.boldRoundedSystemFont(size) : peso === 'h' ? Font.heavyRoundedSystemFont(size) : Font.mediumRoundedSystemFont(size); t.textColor = color || C.tinta; t.lineLimit = 1; t.minimumScaleFactor = 0.6; return t; }
function barra(st, pct, ancho, color) {
  const dc = new DrawContext(); dc.size = new Size(ancho, 8); dc.opaque = false; dc.respectScreenScale = true;
  const fondo = new Path(); fondo.addRoundedRect(new Rect(0, 0, ancho, 8), 4, 4); dc.addPath(fondo); dc.setFillColor(new Color('#000000', 0.08)); dc.fillPath();
  const w = Math.max(8, ancho * Math.min(1, pct / 100)), p = new Path(); p.addRoundedRect(new Rect(0, 0, w, 8), 4, 4); dc.addPath(p); dc.setFillColor(color); dc.fillPath();
  const img = st.addImage(dc.getImage()); img.imageSize = new Size(ancho, 8);
}
function crear({res, viejo}) {
  const w = new ListWidget(), fam = config.widgetFamily || 'medium', p = (args.widgetParameter || '').toLowerCase();
  const g = new LinearGradient(); g.colors = [C.fondo1, C.fondo2]; g.locations = [0, 1]; g.startPoint = new Point(0, 0); g.endPoint = new Point(1, 1); w.backgroundGradient = g;
  w.setPadding(14, 16, 14, 16);
  w.url = APP + (p === 'chat' ? '#apuntes' : p === 'metas' ? '#tareas' : p === 'plata' ? '#finanzas' : '#inicio');
  w.refreshAfterDate = new Date(Date.now() + 30 * 60 * 1000);
  const top = w.addStack(); top.centerAlignContent();
  texto(top, 'Rumb♥', 13, C.marron, 'h'); top.addSpacer();
  if (res.racha) { const f = top.addImage(SFSymbol.named('flame.fill').image); f.imageSize = new Size(11, 11); f.tintColor = new Color('#E8762E'); top.addSpacer(3); texto(top, String(res.racha), 11, C.suave, 'b'); }
  w.addSpacer(6);
  texto(w, 'Disponible de ' + (res.mes || 'este mes'), 11, C.suave);
  texto(w, fmt(res.disp), fam === 'small' ? 24 : 28, res.disp < 0 ? new Color('#B3261E') : C.tinta, 'h');
  texto(w, `quedan ${res.dias} días`, 11, C.suave);
  if (fam !== 'small') {
    w.addSpacer(8);
    const fila = w.addStack(); fila.spacing = 14;
    const a = fila.addStack(); a.layoutVertically();
    texto(a, 'Próximo pago', 10, C.suave);
    texto(a, res.prox ? `${res.prox.n} · día ${res.prox.d}` : 'Todo pagado', 12, C.tinta, 'b');
    if (res.prox) texto(a, fmt(res.prox.a), 11, C.rosa, 'b');
    const b = fila.addStack(); b.layoutVertically();
    texto(b, res.meta ? res.meta.n : 'Metas', 10, C.suave);
    if (res.meta) { texto(b, `${res.meta.pct} % · ${corto(res.meta.s)} de ${corto(res.meta.t)}`, 12, C.tinta, 'b'); b.addSpacer(3); barra(b, res.meta.pct, 110, C.verde); }
    if (res.cofres) { w.addSpacer(6); texto(w, res.cofres === 1 ? '¡Hay un cofre listo para abrir!' : `¡Hay ${res.cofres} cofres listos!`, 11, C.oro, 'b'); }
  }
  if (fam === 'large' && res.chat) {
    w.addSpacer(10);
    texto(w, `${res.chat.by === 'D' ? 'David' : 'Vale'} en el chat`, 10, C.suave);
    const t = w.addText(res.chat.t || 'Mandó una foto'); t.font = Font.mediumRoundedSystemFont(13); t.textColor = C.tinta; t.lineLimit = 3;
  }
  w.addSpacer();
  if (viejo) texto(w, 'Sin conexión · últimos datos', 9, C.suave);
  return w;
}
async function run() {
  let w;
  try { w = crear(await datos()); }
  catch (e) {
    w = new ListWidget(); w.backgroundColor = C.fondo1; w.url = APP;
    texto(w, 'Rumb♥', 14, C.marron, 'h'); w.addSpacer(6);
    const t = w.addText(e.message === 'Cancelado' ? 'Toquen para abrir Rumbo' : e.message); t.font = Font.mediumRoundedSystemFont(12); t.textColor = C.suave;
  }
  if (config.runsInWidget) Script.setWidget(w); else await w.presentMedium();
  Script.complete();
}
await run();

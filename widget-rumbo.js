// Rumbo · Widget para iPhone (app gratuita Scriptable). v3.1: sin contraseña.
// Lee el resumen de la casa desde su enlace secreto y lo muestra con los colores de Rumbo.
// Tamaños: pequeño, mediano y grande. Al tocarlo abre Rumbo.
// Parámetro del widget (opcional): "chat", "metas" o "plata" para abrir esa parte.
const TOKEN = '__TOKEN__';
const API_KEY = 'AIzaSyCryL2V5_gyrj16zzzSfzoENVZaOpnqIEs', PROYECTO = 'rumbo-24d13', CASA = 'rumbo', APP = 'https://rumbocasa.github.io/';
const CACHE = 'rumbo.widget.cache';

const hora = new Date().getHours(), noche = hora >= 19 || hora < 6;
const T = noche
  ? {f1: '#1E2160', f2: '#5B2A6E', tinta: '#FFFFFF', suave: '#E6DDF5', card: new Color('#FFFFFF', 0.14), acento: '#FFD27A', verde: '#7FE0B0', rosa: '#FF9AB0', pista: new Color('#FFFFFF', 0.22)}
  : {f1: '#FFE7CC', f2: '#F7BFD0', tinta: '#1B100B', suave: '#5A4A42', card: new Color('#FFFFFF', 0.62), acento: '#9A3F1E', verde: '#2E8B6A', rosa: '#C2477A', pista: new Color('#000000', 0.08)};
const col = c => typeof c === 'string' ? new Color(c) : c;
const fmt = n => (n < 0 ? '−$' : '$') + Math.round(Math.abs(+n || 0)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const corto = n => { n = +n || 0; return n >= 1e6 ? '$' + (n / 1e6).toFixed(1).replace('.', ',').replace(',0', '') + 'M' : n >= 1e3 ? '$' + Math.round(n / 1e3) + 'k' : fmt(n); };

function val(v) {
  if (!v) return null;
  if ('stringValue' in v) return v.stringValue; if ('integerValue' in v) return +v.integerValue; if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue; if ('nullValue' in v) return null; if ('timestampValue' in v) return v.timestampValue;
  if ('mapValue' in v) { const o = {}; for (const [k, x] of Object.entries(v.mapValue.fields || {})) o[k] = val(x); return o; }
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(val);
  return null;
}
async function datos() {
  if (!/^[a-f0-9]{32}$/.test(TOKEN)) throw new Error('Copien el widget desde Rumbo › Ajustes › Widget');
  try {
    const r = new Request(`https://firestore.googleapis.com/v1/projects/${PROYECTO}/databases/(default)/documents/hogares/${CASA}/widget/${TOKEN}?key=${API_KEY}`);
    r.timeoutInterval = 15;
    const j = await r.loadJSON(); if (j.error) throw new Error(j.error.status === 'NOT_FOUND' ? 'Abran Rumbo una vez para preparar el widget' : j.error.message);
    const res = val(j.fields && j.fields.resumen); if (!res) throw new Error('Abran Rumbo una vez para preparar el widget');
    Keychain.set(CACHE, JSON.stringify(res)); return {res, viejo: false};
  } catch (e) {
    if (Keychain.contains(CACHE)) return {res: JSON.parse(Keychain.get(CACHE)), viejo: true};
    throw e;
  }
}

// --- piezas de diseño ---
function txt(st, s, size, color, peso, lineas) {
  const t = st.addText(String(s)); t.textColor = col(color || T.tinta); t.lineLimit = lineas || 1; t.minimumScaleFactor = 0.55;
  t.font = peso === 'h' ? Font.heavyRoundedSystemFont(size) : peso === 'b' ? Font.boldRoundedSystemFont(size) : Font.mediumRoundedSystemFont(size);
  return t;
}
function icono(st, nombre, size, color) { const s = SFSymbol.named(nombre); if (!s) return; s.applyFont(Font.boldSystemFont(size)); const i = st.addImage(s.image); i.imageSize = new Size(size, size); i.tintColor = col(color); return i; }
function barra(st, pct, ancho, color, alto) {
  alto = alto || 6; const dc = new DrawContext(); dc.size = new Size(ancho, alto); dc.opaque = false; dc.respectScreenScale = true;
  const p0 = new Path(); p0.addRoundedRect(new Rect(0, 0, ancho, alto), alto / 2, alto / 2); dc.addPath(p0); dc.setFillColor(T.pista); dc.fillPath();
  const w = Math.max(alto, ancho * Math.max(0, Math.min(1, pct))); const p1 = new Path(); p1.addRoundedRect(new Rect(0, 0, w, alto), alto / 2, alto / 2); dc.addPath(p1); dc.setFillColor(col(color)); dc.fillPath();
  const im = st.addImage(dc.getImage()); im.imageSize = new Size(ancho, alto); return im;
}
function tarjeta(st, pad) { const c = st.addStack(); c.layoutVertically(); c.backgroundColor = T.card; c.cornerRadius = 16; c.setPadding(pad || 9, 11, pad || 9, 11); return c; }
function cabecera(w, res) {
  const top = w.addStack(); top.centerAlignContent();
  txt(top, 'Rumb', 14, T.acento, 'h'); icono(top, 'heart.fill', 11, T.rosa);
  top.addSpacer();
  if (res.racha) { icono(top, 'flame.fill', 12, '#F07A2E'); top.addSpacer(2); txt(top, res.racha, 12, T.tinta, 'b'); }
}
function disponible(st, res, grande) {
  txt(st, 'Disponible · ' + (res.mes || 'este mes'), 11, T.suave, 'b');
  txt(st, fmt(res.disp), grande ? 34 : 26, res.disp < 0 ? '#D93B3B' : T.tinta, 'h');
  st.addSpacer(4);
  const usado = res.ingreso > 0 ? res.gastado / res.ingreso : 0;
  barra(st, usado, grande ? 132 : 120, usado > 0.95 ? T.rosa : T.verde, 6);
  st.addSpacer(3);
  txt(st, `${Math.round(usado * 100)} % usado · quedan ${res.dias} días`, 10, T.suave);
}
function crear({res, viejo}) {
  const w = new ListWidget(), fam = config.widgetFamily || 'medium', p = (args.widgetParameter || '').toLowerCase().trim();
  const g = new LinearGradient(); g.colors = [col(T.f1), col(T.f2)]; g.locations = [0, 1]; g.startPoint = new Point(0, 0); g.endPoint = new Point(1, 1); w.backgroundGradient = g;
  w.url = APP + ({chat: '#apuntes', metas: '#tareas', plata: '#finanzas'}[p] || '#inicio');
  w.refreshAfterDate = new Date(Date.now() + 20 * 60 * 1000);
  w.setPadding(14, 15, 12, 15);
  cabecera(w, res); w.addSpacer(fam === 'small' ? 8 : 6);

  if (fam === 'small') {
    disponible(w, res, false);
    w.addSpacer();
    if (res.cofres) { const f = w.addStack(); f.centerAlignContent(); icono(f, 'gift.fill', 11, T.acento); f.addSpacer(4); txt(f, res.cofres === 1 ? 'Cofre listo' : `${res.cofres} cofres listos`, 11, T.acento, 'b'); }
    else if (res.prox) { const f = w.addStack(); f.centerAlignContent(); icono(f, 'calendar', 10, T.suave); f.addSpacer(4); txt(f, `${res.prox.n} · día ${res.prox.d}`, 10, T.suave, 'b'); }
    else txt(w, 'Todo pagado este mes', 10, T.verde, 'b');
  } else {
    const fila = w.addStack(); fila.topAlignContent();
    const izq = fila.addStack(); izq.layoutVertically(); disponible(izq, res, false);
    fila.addSpacer(10);
    const der = fila.addStack(); der.layoutVertically(); der.spacing = 6;
    const a = tarjeta(der);
    const ah = a.addStack(); ah.centerAlignContent(); icono(ah, res.prox ? 'calendar' : 'checkmark.seal.fill', 11, res.prox ? T.rosa : T.verde); ah.addSpacer(4); txt(ah, res.prox ? 'Próximo pago' : 'Pagos', 10, T.suave, 'b');
    txt(a, res.prox ? res.prox.n : 'Todo pagado', 12, T.tinta, 'b');
    if (res.prox) txt(a, `${fmt(res.prox.a)} · día ${res.prox.d}`, 10, T.suave);
    const b = tarjeta(der);
    const bh = b.addStack(); bh.centerAlignContent(); icono(bh, 'airplane', 11, T.verde); bh.addSpacer(4); txt(bh, res.meta ? `${res.meta.pct} %` : 'Metas', 10, T.suave, 'b');
    txt(b, res.meta ? res.meta.n : 'Sin metas abiertas', 12, T.tinta, 'b');
    if (res.meta) { b.addSpacer(3); barra(b, res.meta.pct / 100, 112, T.verde, 5); }
    w.addSpacer();
    if (fam === 'large') {
      if (res.chat) {
        const c = tarjeta(w, 10);
        const ch = c.addStack(); ch.centerAlignContent(); icono(ch, 'bubble.left.fill', 11, T.rosa); ch.addSpacer(4); txt(ch, `${res.chat.by === 'D' ? 'David' : 'Vale'} en el chat`, 10, T.suave, 'b');
        txt(c, res.chat.t || 'Mandó una foto', 13, T.tinta, 'm', 3);
        w.addSpacer(8);
      }
      const n = w.addStack(); n.centerAlignContent(); n.spacing = 6;
      icono(n, 'star.fill', 11, '#E8A93A'); txt(n, `Nivel ${res.nivel}`, 11, T.tinta, 'b');
      if (res.pts) { txt(n, `· Vale ${res.pts.V} · David ${res.pts.D}`, 11, T.suave); }
      w.addSpacer(6);
    }
    if (res.cofres) { const f = w.addStack(); f.centerAlignContent(); icono(f, 'gift.fill', 11, T.acento); f.addSpacer(4); txt(f, res.cofres === 1 ? '¡Hay un cofre listo para abrir!' : `¡Hay ${res.cofres} cofres listos!`, 11, T.acento, 'b'); }
  }
  if (viejo) { w.addSpacer(2); txt(w, 'Sin conexión · últimos datos', 9, T.suave); }
  return w;
}
async function run() {
  let w;
  try { w = crear(await datos()); }
  catch (e) {
    w = new ListWidget(); const g = new LinearGradient(); g.colors = [col(T.f1), col(T.f2)]; g.locations = [0, 1]; w.backgroundGradient = g; w.url = APP;
    const top = w.addStack(); top.centerAlignContent(); txt(top, 'Rumb', 14, T.acento, 'h'); icono(top, 'heart.fill', 11, T.rosa);
    w.addSpacer(8); txt(w, e.message, 12, T.suave, 'b', 4);
  }
  if (config.runsInWidget) Script.setWidget(w);
  else { const f = (args.widgetParameter || '').includes('grande') ? 'presentLarge' : 'presentMedium'; await w[f](); }
  Script.complete();
}
await run();

/* Rumbo · Asistente (v3.2). Coral (para Vale) y Oreo (para David): el chat privado de cada uno con su asistente.
   Entiende lo que le escriben y lo convierte de una vez: tareas (con su recordatorio si tienen fecha), recordatorios
   con hora, gastos y respuestas con sus propios números. Da consejos basados en los datos reales de la casa.
   Regla de oro: NUNCA inventa. Si un dato no está en Rumbo, lo dice y ofrece lo que sí sabe.
   Todo corre en el aparato (sin IA externa ni servidores). Las funciones de lenguaje son puras; `ejecutar` toca el estado S. */
const Asistente = (function () {
  'use strict';
  const Q = s => Aprende.pure.quitar(s);
  const has = (t, ws) => ws.some(w => t.includes(w));
  const pad = n => String(n).padStart(2, '0');
  const nom = w => w === 'D' ? 'David' : w === 'V' ? 'Vale' : 'los dos';
  const perro = w => w === 'D' ? 'Oreo' : 'Coral';
  const fmtN = n => typeof fmt === 'function' ? fmt(n) : '$' + n;
  const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

  /* ===== 1. Lenguaje: hora y momento ===== */
  // "a las 8", "8:30", "8 am", "3 pm", "a las 3 de la tarde", "mediodía", "esta noche"
  function hora(texto) {
    const t = Q(texto);
    if (/medio ?dia/.test(t)) return {h: 12, m: 0};
    if (/media ?noche/.test(t)) return {h: 23, m: 59};
    let m = t.match(/(?:a las|a la|tipo|como a las|sobre las)\s*(\d{1,2})(?:[:.h](\d{2}))?\s*(am|a\.? ?m\.?|pm|p\.? ?m\.?|de la manana|de la tarde|de la noche)?/) ||
      t.match(/\b(\d{1,2})(?:[:.](\d{2}))\s*(am|a\.? ?m\.?|pm|p\.? ?m\.?|de la manana|de la tarde|de la noche)?\b/) ||
      t.match(/\b(\d{1,2})\s*(am|a\.? ?m\.?|pm|p\.? ?m\.?|de la manana|de la tarde|de la noche)\b/);
    if (m) {
      let h = +m[1], mi = 0, suf = '';
      if (m.length === 4) { mi = m[2] ? +m[2] : 0; suf = m[3] || ''; } else { suf = m[2] || ''; }
      if (h > 23 || mi > 59) return null;
      const pmw = /p|tarde|noche/.test(suf), amw = /a|manana/.test(suf) && !pmw;
      if (pmw && h < 12) h += 12; else if (amw && h === 12) h = 0;
      else if (!suf && h >= 1 && h <= 6) h += 12; // "a las 3" casi siempre es de la tarde
      return {h, m: mi};
    }
    if (/esta noche|en la noche|por la noche/.test(t)) return {h: 20, m: 0};
    if (/esta tarde|en la tarde|por la tarde/.test(t)) return {h: 15, m: 0};
    if (/en la manana|por la manana|temprano/.test(t)) return {h: 8, m: 0};
    return null;
  }
  // Momento exacto del recordatorio, o null si el mensaje no dice cuándo
  function cuando(texto, ahora) {
    const t = Q(texto);
    let m = t.match(/en (\d{1,3}|un|una|media) (minutos?|mins?|horas?)/);
    if (m) { const n = m[1] === 'media' ? 30 : /^un/.test(m[1]) ? 1 : +m[1]; return new Date(ahora.getTime() + (/^h/.test(m[2]) ? n * 60 : n) * 60000); }
    if (/en media hora/.test(t)) return new Date(ahora.getTime() + 30 * 60000);
    const d = Aprende.pure.fecha(texto, ahora), h = hora(texto);
    if (!d && !h) return null;
    const base = d ? new Date(d) : new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
    if (h) base.setHours(h.h, h.m, 0, 0);
    else if (base.toDateString() === ahora.toDateString()) { // hoy sin hora: 6 p. m., o en una hora si ya pasó
      base.setHours(18, 0, 0, 0); if (base <= ahora) return new Date(Math.ceil((ahora.getTime() + 60 * 60000) / (15 * 60000)) * 15 * 60000);
    } else base.setHours(8, 0, 0, 0); // otro día sin hora: 8 a. m.
    if (!d && base <= ahora) base.setDate(base.getDate() + 1); // "a las 7" y ya pasaron las 7: mañana
    return base;
  }
  // "hoy 6:00 p. m.", "mañana 8:00 a. m.", "viernes 21 nov, 3:00 p. m."
  function cuandoTxt(at, ahora) {
    const d = new Date(at), h = d.toLocaleTimeString('es-CO', {hour: 'numeric', minute: '2-digit'});
    const a = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate()), b = new Date(d.getFullYear(), d.getMonth(), d.getDate()), k = Math.round((b - a) / 864e5);
    const dia = k === 0 ? 'hoy' : k === 1 ? 'mañana' : k === 2 ? 'pasado mañana' : `el ${DIAS[d.getDay()]} ${d.getDate()} ${MES[d.getMonth()]}`;
    return `${dia} a las ${h}`;
  }
  const whenTarea = (d, ahora) => { if (!d) return 'Pendientes'; const a = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate()), k = Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()) - a) / 864e5); return k <= 0 ? 'Hoy' : k === 1 ? 'Mañana' : `${DIAS[d.getDay()].slice(0, 3)} ${d.getDate()} ${MES[d.getMonth()]}`; };
  // Limpia el texto para que quede como título: "recuérdame pagar el internet mañana a las 8" → "Pagar el internet"
  function titulo(texto) {
    let s = ' ' + String(texto).trim().replace(/\s+/g, ' ') + ' ';
    const quitarRx = [/\b(por favor|porfa|plis)\b/gi, /^\s*(coral|oreo)[,:]?\s*/i,
      /\b(recu[eé]rd(a|á)me|recu[eé]rdanos|recu[eé]rdale a (david|vale)|record(a|á)rme|av[ií]same|av[ií]sanos|no me dejes olvidar|no olvidar|pon(me)? (un|una) (recordatorio|alarma)( de| para)?|recordatorio( de| para)?|alarma( de| para)?)\b/gi,
      /\b(necesito|necesitamos|tengo que|tenemos que|hay que|toca|debo|debemos|me toca|nos toca|pendiente:?)\b/gi,
      /\b(para |de )?(hoy|mañana|manana|pasado mañana|esta noche|esta tarde|en la mañana|en la tarde|en la noche|temprano)\b/gi,
      /\b(el |este |el próximo |el proximo )?(lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo)\b/gi,
      /\b(a las|a la|tipo|sobre las|como a las)\s*\d{1,2}([:.h]\d{2})?\s*(am|pm|a\.? ?m\.?|p\.? ?m\.?|de la mañana|de la manana|de la tarde|de la noche)?/gi,
      /\b\d{1,2}([:.]\d{2})\s*(am|pm|a\.? ?m\.?|p\.? ?m\.?)?\b/gi, /\b\d{1,2}\s*(am|pm|a\.? ?m\.?|p\.? ?m\.?)\b/gi,
      /\ben (\d{1,3}|un|una|media) (minutos?|mins?|horas?)\b/gi, /\bel \d{1,2}( de)? (ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)[a-z]*\b/gi, /\bmedio ?d[ií]a\b/gi, /\bque\s+/i];
    quitarRx.forEach(r => { s = s.replace(r, ' '); });
    s = s.replace(/\s+/g, ' ').replace(/^[\s,.:;-]+|[\s,.:;-]+$/g, '').trim();
    return s ? s.charAt(0).toUpperCase() + s.slice(1, 80) : '';
  }

  /* ===== 1b. Pagos y tareas mencionados (para «ya pagué…» / «ya hice…» y mensajes del banco) ===== */
  const palabras = s => Q(s).split(/[^a-z0-9ñ]+/).filter(w => w.length >= 4 && !/^(para|pague|pagamos|ya|hice|cuota|pago|pagado|valor|desde|cuenta|banco|bancolombia|compra|transferencia|informa|realizaste|realizo)$/.test(w));
  // El pago pendiente que más se parece: por nombre/entidad y por monto (±3 %)
  function pagoDe(texto, st, monto) {
    const ws = palabras(texto); let best = null, bs = 0;
    (st.pays || []).filter(p => !p.paid).forEach(p => {
      const nombre = Q(`${p.n} ${p.ent || ''} ${p.ref || ''}`); let sc = ws.filter(w => nombre.includes(w)).length * 2;
      if (monto && p.a && Math.abs(monto - p.a) <= p.a * .03) sc += 3;
      if (sc > bs) { bs = sc; best = p; }
    });
    return bs >= 2 ? best : null;
  }
  function tareaDe(texto, st) {
    const ws = palabras(texto).map(w => w.replace(/(e|é)$/, '')); let best = null, bs = 0;
    (st.tasks || []).filter(t => !t.done).forEach(t => { const n = Q(t.n); const sc = ws.filter(w => n.includes(w.slice(0, Math.max(4, w.length - 1)))).length; if (sc > bs) { bs = sc; best = t; } });
    return bs >= 1 ? best : null;
  }
  // Marca un pago igual que el botón «Pagar» (movimiento, puntos y saldo de la deuda). Devuelve lo necesario para deshacer.
  function pagar(st, p, quien, ahora, monto) {
    const a = monto > 0 ? monto : p.a, prevA = p.a;
    p.paid = true; p.by = quien; p.a = a;
    st.moves.push({n: p.n, cat: p.cat, a, d: ahora.getDate(), w: quien});
    st.pts[quien] = (+st.pts[quien] || 0) + 15;
    const dbt = p.debt ? (st.debts || []).find(x => x.id === p.debt) : null, red = dbt ? Math.min(a, dbt.saldo) : 0;
    if (dbt) dbt.saldo -= red;
    return {prevA, red, mv: st.moves.length - 1};
  }
  // ¿Es un mensaje de un banco? (Bancolombia, Nequi, Davivienda…) y qué tipo de movimiento
  const BANCO = /\b(bancolombia|nequi|davivienda|daviplata|bbva|banco de bogota|bogota|scotiabank|colpatria|av villas|falabella|nu colombia|itau|banco popular|occidente|caja social|lulo|rappipay|movii)\b/;
  function banco(texto) {
    const t = Q(texto); if (!BANCO.test(t)) return null;
    const monto = Aprende.pure.monto(texto); if (!monto) return null;
    const entra = /\b(recibiste|te consignaron|consignacion recibida|abono a tu cuenta|te enviaron|recibio una transferencia|deposito)\b/.test(t);
    const m = t.match(/\b(?:en|a|por compra en|pago a|pago en|transferencia a)\s+([a-z0-9ñ&.* ]{3,40}?)(?:\s+(?:desde|con|el|por|t\.?|cta|tarjeta|\d)|[.,]|$)/);
    return {monto, entra, comercio: m ? m[1].trim() : ''};
  }

  /* ===== 2. Intención ===== */
  const RX = {
    recordar: /\b(recuerd[ae]me|recuerdanos|recuerdale|recordarme|recordarnos|avisame|avisanos|no me dejes olvidar|recordatorio|alarma)\b/,
    tarea: /^(necesito|necesitamos|tengo que|tenemos que|hay que|toca|debo|debemos|me toca|nos toca|pendiente|no olvidar)\b/,
    consejo: /\b(consejo|consejos|recomienda|recomendacion|tip|tips|que me sugieres|que hago|como ahorr|ayudame a ahorrar|como mejor|ideas para ahorrar|estoy (estresad|cansad|agotad|triste|preocupad|ansios)|me siento|animo|motivame|motivacion|peleamos|discutimos|pelea|discusion)\w*/,
    listaRec: /\b(mis recordatorios|recordatorios|que tengo pendiente|que me toca|mi agenda|agenda de hoy)\b/,
    saludo: /^(hola|holi|buenas|buenos dias|buenas tardes|buenas noches|hey|que mas|q mas|ey)\b/,
    gracias: /^(gracias|mil gracias|muchas gracias|te quiero|eres la mejor|eres el mejor|genial|perfecto|listo|ok|okay|dale)\b/,
    ayuda: /^(ayuda|que puedes hacer|que sabes hacer|como funcionas|que haces)\b/
  };
  function intencion(texto, st, ahora) {
    const t = Q(texto).trim(), c = Aprende.clasificar(texto, {cats: st.cats, hoy: ahora});
    if (RX.ayuda.test(t)) return {tipo: 'ayuda'};
    const bk = banco(texto); if (bk) return {tipo: 'banco', bk, c};
    if (/\b(ya )?(pague|pagamos|pagaron|pagó|pago listo|cancele|cancelamos|ya quedo pago|quedo pago)\b/.test(t) && !/\b(gaste|gastamos|compre|compramos)\b/.test(t)) { const p = pagoDe(texto, st, c.monto); if (p) return {tipo: 'pagado', p, c}; }
    if (/^(ya )?(hice|hicimos|lave|lavamos|limpie|limpiamos|saque|sacamos|bane|banamos|organice|organizamos|arregle|arreglamos|termine|terminamos|recogi|recogimos|cocine|barri|trapee|compre|compramos|llame|llamamos|listo|hecho|ya quedo)\b/.test(t) && !c.monto) { const tk = tareaDe(texto, st); if (tk) return {tipo: 'hecho', tk}; }
    if (RX.listaRec.test(t) && !RX.recordar.test(t.replace(/\b(mis recordatorios|recordatorios)\b/, ''))) return {tipo: 'listaRec'};
    if (RX.recordar.test(t)) return {tipo: 'recordatorio', c};
    if (RX.consejo.test(t)) return {tipo: 'consejo'};
    if (c.tipo === 'pregunta') return {tipo: 'pregunta'};
    if (c.tipo === 'gasto' && c.monto) return {tipo: 'gasto', c};
    if (c.tipo === 'meta' && c.monto && Aprende.metaDe(texto, st.goals)) return {tipo: 'abono', c};
    const primera = t.split(/\s+/)[0] || '';
    if (RX.tarea.test(t) || c.tipo === 'tarea' || /^(comprar|llamar|pagar|lavar|organizar|sacar|llevar|arreglar|limpiar|recoger|cocinar|barrer|trapear|revisar|agendar|reservar|enviar|mandar|banar|instalar|cotizar|buscar|renovar|cancelar|devolver)$/.test(primera)) return {tipo: 'tarea', c};
    if (RX.saludo.test(t) && t.split(/\s+/).length <= 4) return {tipo: 'saludo'};
    if (RX.gracias.test(t) && t.split(/\s+/).length <= 5) return {tipo: 'gracias'};
    if (c.tipo === 'idea' || c.tipo === 'plan') return {tipo: c.tipo, c};
    return {tipo: 'nota', c};
  }

  /* ===== 3. Consejos con datos reales (nada inventado) ===== */
  const TIPS = {
    ahorro: ['Separen el ahorro apenas llegue el sueldo, no con lo que sobre: lo que no se ve no se gasta.',
      'Antes de una compra que no estaba en el plan, esperen 24 horas. La mitad de los antojos se pasan solos.',
      'Revisen las suscripciones: la que no usaron este mes, se cancela y se vuelve a tomar si hace falta.',
      'Pongan un tope semanal para salidas y domicilios; cuando se acaba, toca plan casero.'],
    pareja: ['Hablen del tema cuando los dos estén tranquilos, no en caliente. Empiecen por lo que sienten, no por lo que el otro hizo.',
      'Escuchen para entender, no para responder. A veces basta con decir: “te entiendo, sigamos juntos en esto”.',
      'La plata y las tareas se discuten con datos en la mano: abran Rumbo juntos y decidan en equipo.'],
    animo: ['Respira profundo: un paso a la vez. No tienes que resolver todo hoy.',
      'Escoge una sola cosa pequeña para hoy y celébrala cuando la termines. Lo demás puede esperar.',
      'Pide ayuda: para eso son dos. Cuéntale a la otra persona cómo te sientes.'],
    casa: ['Repartan las tareas por gusto y por tiempo, no por costumbre. Lo que a uno le pesa, al otro a veces le da igual.',
      'Diez minutos de orden cada noche evitan la limpieza maratónica del sábado.',
      'Las tareas con fecha se cumplen; las que no tienen fecha se vuelven “algún día”.']
  };
  const elegir = (xs, semilla) => xs[Math.abs(semilla) % xs.length];
  function consejo(texto, st, ahora) {
    const t = Q(texto), dia = ahora.getDate(), dim = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0).getDate(), restan = Math.max(1, dim - dia);
    const out = st.moves.reduce((a, m) => a + m.a, 0), disp = st.income - out, usado = st.income ? out / st.income : 0, L = [];
    const tema = /pele|discu|pareja|novio|novia/.test(t) ? 'pareja' : /estres|cansad|agotad|triste|preocup|ansios|animo|motiv|siento/.test(t) ? 'animo' : /orden|casa|tarea|aseo|limpi/.test(t) ? 'casa' : 'ahorro';
    if (tema === 'ahorro' || tema === 'casa' || /plata|gast|ahorr|mes/.test(t)) {
      if (disp < 0) L.push(`Este mes ya se pasaron por ${fmtN(-disp)}: gastaron ${fmtN(out)} de ${fmtN(st.income)}. Lo que queda del mes, solo lo esencial.`);
      else L.push(`Llevan el ${Math.round(usado * 100)} % del ingreso: les quedan ${fmtN(disp)} para ${restan} ${restan === 1 ? 'día' : 'días'}, unos ${fmtN(Math.floor(disp / restan))} por día.`);
      const r = Aprende.pure.ritmo(st, dia, dim), pasadas = Object.entries(r).filter(([id, x]) => x.b > 0 && x.g > x.b && !st.pays.some(p => p.cat === id) && !(st.debts || []).some(d => d.cat === id)).map(([, x]) => x).sort((a, b) => (b.g - b.b) - (a.g - a.b)); // solo gasto variable: las cuotas fijas no son «fugas»
      if (pasadas.length) L.push(`${pasadas[0].n.split(' (')[0]} va en ${fmtN(pasadas[0].g)} con un tope de ${fmtN(pasadas[0].b)}: ahí está la mayor fuga.`);
      const at = Aprende.pure.metas(st, ahora).filter(m => m.atrasada)[0];
      if (at) L.push(`${at.n}: para llegar a tiempo necesitan ${fmtN(at.necesita)} al mes y hoy aportan ${fmtN(at.aporte)}.`);
      const pend = st.pays.filter(p => !p.paid).sort((a, b) => a.d - b.d)[0];
      if (pend) L.push(`Ojo con ${pend.n}: ${fmtN(pend.a)} el día ${pend.d}.`);
    }
    if (tema === 'casa') { const tt = Aprende.pure.tareas(st).map(x => `${nom(x.w)} ${x.pend.length}`).join(' · '); L.push(`Tareas pendientes: ${tt}.`); }
    L.push('Un consejo: ' + elegir(TIPS[tema], dia + t.length));
    return {texto: L.join('\n'), tema};
  }

  /* ===== 4. Respuestas ===== */
  const AYUDA = (w) => `Soy ${perro(w)}, tu asistente. Escríbeme como a una amiga:\n• «Necesito comprar leche para hoy» → creo la tarea y te la recuerdo.\n• «Recuérdame pagar el internet mañana a las 8» → recordatorio con aviso.\n• «Gasté 45 mil en el cine» → registro el gasto.\n• «Ya pagué el arriendo» → lo marco pago. «Ya lavé la loza» → tarea hecha.\n• «¿Cuánto nos queda?», «pagos pendientes», «mis recordatorios».\n• «Dame un consejo» → te respondo con sus números reales.\nSolo te digo lo que está en Rumbo: si no tengo un dato, te lo digo.`;
  function pregunta(texto, st, ahora) {
    const r = Aprende.responder(texto, st, ahora);
    if (/^No supe responder/.test(r.texto)) return {texto: 'Eso no lo tengo en Rumbo, así que prefiero no inventarlo. Sí te puedo decir cuánto les queda, los gastos de la semana, los pagos pendientes, cómo van las metas, las tareas o el marcador.'};
    return r;
  }
  function listaRec(st, perfil, ahora) {
    const xs = (st.recordatorios || []).filter(r => !r.hecho && (r.para === perfil || r.para === 'A') && new Date(r.at) > new Date(ahora.getTime() - 864e5)).sort((a, b) => a.at.localeCompare(b.at));
    const tk = st.tasks.filter(x => !x.done && x.w === perfil);
    if (!xs.length && !tk.length) return {texto: 'No tienes recordatorios ni tareas pendientes. Día libre para ti.'};
    return {texto: [xs.length ? 'Recordatorios:\n' + xs.slice(0, 6).map(r => `• ${r.t} — ${cuandoTxt(r.at, ahora)}`).join('\n') : '', tk.length ? 'Tareas:\n' + tk.slice(0, 6).map(x => `• ${x.n} (${x.when})`).join('\n') : ''].filter(Boolean).join('\n\n')};
  }

  /* ===== 5. Ejecutar: cambia el estado y devuelve la respuesta con su tarjeta ===== */
  const uid = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const isoMin = d => new Date(Math.round(d.getTime() / 60000) * 60000).toISOString();
  function ejecutar(texto, st, perfil, ahora, deNota) {
    const it = intencion(texto, st, ahora), otroW = perfil === 'D' ? 'V' : 'D';
    if (it.tipo === 'pagado') {
      const p = it.p, u = pagar(st, p, perfil, ahora, it.c.monto && Math.abs(it.c.monto - p.a) <= p.a * .5 ? it.c.monto : 0);
      const dbt = p.debt ? (st.debts || []).find(x => x.id === p.debt) : null;
      return {texto: `Listo: ${p.n} quedó pago por ${fmtN(p.a)} · +15 puntos para ${perfil === 'D' ? 'David' : 'Vale'}.${dbt ? (dbt.saldo > 0 ? ` A la deuda le faltan ${fmtN(dbt.saldo)}.` : ' ¡Y la deuda quedó saldada!') : ''}`, card: {tipo: 'pago', ref: p.id, a: u.prevA, t: String(u.red)}};
    }
    if (it.tipo === 'hecho') {
      const tk = it.tk; tk.done = true; st.pts[tk.w] = (+st.pts[tk.w] || 0) + tk.p;
      (st.recordatorios || []).forEach(r => { if (r.tarea === tk.id) r.hecho = true; });
      return {texto: `¡Bien! Marqué «${tk.n}» como hecha · +${tk.p} puntos para ${nom(tk.w)}.`, card: {tipo: 'hechoTarea', ref: tk.id}};
    }
    if (it.tipo === 'banco') {
      const bk = it.bk;
      if (bk.entra) return {texto: `Vi en tu banco un ingreso de ${fmtN(bk.monto)}. No lo sumo solo: dime si es parte del sueldo o algo aparte.`};
      const p = pagoDe(`${bk.comercio} ${texto}`, st, bk.monto);
      if (p && Math.abs(bk.monto - p.a) <= p.a * .03) {
        const u = pagar(st, p, perfil, ahora, bk.monto), dbt = p.debt ? (st.debts || []).find(x => x.id === p.debt) : null;
        return {texto: `Lo vi en tu banco: ${p.n} quedó pago por ${fmtN(bk.monto)}.${dbt && dbt.saldo > 0 ? ` A la deuda le faltan ${fmtN(dbt.saldo)}.` : ''}`, card: {tipo: 'pago', ref: p.id, a: u.prevA, t: String(u.red)}};
      }
      const cat = Aprende.pure.categoria(`${bk.comercio} ${texto}`, st.cats), catOk = st.cats.some(x => x.id === cat) ? cat : (st.cats.find(x => !x.saving) || {}).id;
      const nombre = bk.comercio ? bk.comercio.replace(/\b\w/g, l => l.toUpperCase()).slice(0, 40) : 'Compra con tarjeta';
      st.moves.push({n: nombre, cat: catOk, a: bk.monto, d: ahora.getDate(), w: perfil});
      const out = st.moves.reduce((a, m) => a + m.a, 0), catN = ((st.cats.find(x => x.id === catOk) || {}).n || '').split(' (')[0];
      return {texto: `Lo vi en tu banco: ${fmtN(bk.monto)} en ${nombre}. Lo anoté en ${catN || 'gastos'}. Les quedan ${fmtN(st.income - out)} este mes.`, card: {tipo: 'gasto', ref: String(st.moves.length - 1), a: bk.monto}};
    }
    if (it.tipo === 'recordatorio') {
      const at = cuando(texto, ahora), t = titulo(texto) || 'Lo que me pediste';
      if (!at) return {texto: `¿Para cuándo te recuerdo «${t}»? Escríbeme por ejemplo «hoy a las 6 pm» o «mañana a las 8».`, card: {tipo: 'pedirHora', t}};
      const quien = Aprende.pure.persona(texto), para = /recuerdale a (david|vale)/.test(Q(texto)) ? (quien || otroW) : /recuerdanos|avisanos/.test(Q(texto)) ? 'A' : perfil;
      const r = {id: uid('r'), t, at: isoMin(at), para, hecho: false, avisado: false, de: deNota || ''};
      st.recordatorios = st.recordatorios || []; st.recordatorios.push(r);
      return {texto: `Listo. Te aviso ${cuandoTxt(r.at, ahora)}: «${t}»${para !== perfil ? ` (para ${nom(para)})` : ''}.`, card: {tipo: 'recordatorio', ref: r.id}};
    }
    if (it.tipo === 'tarea') {
      const c = it.c, f = c.fecha || Aprende.pure.fecha(texto, ahora), t = titulo(texto) || c.titulo, w = c.quien === 'D' || c.quien === 'V' ? c.quien : perfil;
      const tk = {id: uid('t_'), n: t.slice(0, 80), i: 'check', w, p: 10, when: whenTarea(f, ahora), rep: 'Una vez', done: false}; st.tasks.push(tk);
      let r = null; const at = f ? cuando(texto, ahora) : null;
      if (at) { r = {id: uid('r'), t: tk.n, at: isoMin(at), para: w, hecho: false, avisado: false, de: deNota || '', tarea: tk.id}; st.recordatorios = st.recordatorios || []; st.recordatorios.push(r); }
      const fin = x => /\.$/.test(x) ? x : x + '.';
      return {texto: `Anotado: «${tk.n}» para ${w === perfil ? 'ti' : nom(w)}, ${tk.when === 'Pendientes' ? 'sin fecha' : tk.when.toLowerCase()}.${r ? ` Te aviso ${fin(cuandoTxt(r.at, ahora))}` : ' Si quieres, te lo recuerdo.'} Suma ${tk.p} puntos al hacerla.`, card: {tipo: 'tarea', ref: tk.id, rec: r ? r.id : ''}};
    }
    if (it.tipo === 'gasto') {
      const c = it.c, cat = st.cats.some(x => x.id === c.cat) ? c.cat : (st.cats.find(x => x.id === 'g_17') || st.cats.find(x => !x.saving) || {}).id;
      const mv = {n: (titulo(texto) || c.titulo).replace(/^(gaste|gastamos|pague|pagamos|compre|compramos)\s+/i, '').slice(0, 40) || 'Gasto', cat, a: c.monto, d: ahora.getDate(), w: perfil};
      st.moves.push(mv);
      const out = st.moves.reduce((a, m) => a + m.a, 0), catN = ((st.cats.find(x => x.id === cat) || {}).n || '').split(' (')[0];
      return {texto: `Registré ${fmtN(mv.a)} en ${catN || 'gastos'}. Les quedan ${fmtN(st.income - out)} este mes.`, card: {tipo: 'gasto', ref: String(st.moves.length - 1), a: mv.a}};
    }
    if (it.tipo === 'abono') { const g = Aprende.metaDe(texto, st.goals); return {texto: `¿Abono ${fmtN(it.c.monto)} a ${g.n}? Tócalo y queda hecho.`, card: {tipo: 'abonar', ref: g.id, a: it.c.monto}}; }
    if (it.tipo === 'consejo') { const r = consejo(texto, st, ahora); return {texto: r.texto, card: {tipo: 'consejo'}}; }
    if (it.tipo === 'pregunta') return pregunta(texto, st, ahora);
    if (it.tipo === 'listaRec') return listaRec(st, perfil, ahora);
    if (it.tipo === 'ayuda') return {texto: AYUDA(perfil)};
    if (it.tipo === 'saludo') { const h = ahora.getHours(); return {texto: `${h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches'}, ${nom(perfil)}. ¿Qué anotamos hoy? Puedes escribirme una tarea, un recordatorio, un gasto o pedirme un consejo.`}; }
    if (it.tipo === 'gracias') return {texto: elegir(['Con gusto. Aquí estoy.', '¡Para eso estoy! Cualquier cosa, me escribes.', 'De nada. Un paso a la vez, y juntos.'], texto.length)};
    if (it.tipo === 'idea' || it.tipo === 'plan') return {texto: `Guardé tu ${it.tipo === 'idea' ? 'idea' : 'plan'}. ¿Lo vuelvo proyecto o tarea?`, card: {tipo: 'idea'}};
    return {texto: 'Lo guardé como nota. ¿Qué es?', card: {tipo: 'preguntarTipo'}};
  }

  /* ===== 6. Recordatorios con la app abierta (cerrada, los manda el robot de avisos) ===== */
  let timer = 0;
  function vigilar() {
    clearInterval(timer);
    const tick = async () => {
      if (typeof S !== 'object' || !S.recordatorios || (typeof gateOpen !== 'undefined' && gateOpen)) return;
      const ahora = Date.now(), mios = S.recordatorios.filter(r => !r.hecho && !r.avisado && (r.para === S.profile || r.para === 'A') && new Date(r.at).getTime() <= ahora && ahora - new Date(r.at).getTime() < 6 * 3600e3);
      if (!mios.length) return;
      mios.forEach(r => { r.avisado = true; });
      save();
      for (const r of mios) {
        try { if (typeof island === 'function') island({icon: 'bell', color: 'gold', title: `${perro(S.profile)} te recuerda`, sub: r.t, dur: 7000}); } catch (e) {}
        try { if (Notification.permission === 'granted') { const reg = await navigator.serviceWorker.ready; reg.showNotification(`${perro(S.profile)} te recuerda`, {body: r.t, tag: 'rec-' + r.id, icon: (document.querySelector('link[rel="apple-touch-icon"]') || {}).href}); } } catch (e) {}
      }
    };
    timer = setInterval(tick, 30000); setTimeout(tick, 4000);
  }

  return {ejecutar, vigilar, perro, cuandoTxt, pure: {hora, cuando, titulo, intencion, consejo, whenTarea, banco, pagoDe, tareaDe}};
})();

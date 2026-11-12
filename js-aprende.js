/* Rumbo · Aprende (v2.0). El "cerebro" de la casa, 100 % en el aparato (sin servidores ni IA externa):
   1. Lee lo que escriben en Apuntes: clasifica (tarea, gasto, idea, plan, meta, ajuste, nota), saca montos, fechas,
      responsable y categoría, y propone convertirlo con un toque.
   2. Responde preguntas sobre sus datos ("¿cuánto nos queda?", "gastos de la semana", "¿cómo va Argentina?").
   3. Analiza el uso: ritmo de gasto y proyección a fin de mes por categoría, gastos fuera de lo normal (media + 2σ),
      metas atrasadas, tareas por persona, pagos que vencen. De ahí salen las tarjetas de "Hoy" en Inicio.
   4. Guarda una foto diaria de los números (S.diario) para ver tendencias; al cumplir el primer mes avisa que ya hay
      datos para afinar la app con el desarrollador.
   Las funciones de análisis son puras (reciben el estado); solo `diario()` y `hoy()` leen el estado global S en tiempo de ejecución. */
const Aprende = (function () {
  'use strict';
  const quitar = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const has = (t, ws) => ws.some(w => t.includes(w));
  // Palabra o frase completa (evita que "para" active "ara")
  const hasW = (t, ws) => ws.some(w => new RegExp('(^|[^a-z0-9ñ])' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '($|[^a-z0-9ñ])').test(t));
  const pad = n => String(n).padStart(2, '0');
  const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const DIAS = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
  const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

  /* ===== 1. Lenguaje: montos, fechas, persona, categoría y tipo ===== */
  // "$45.000", "45 mil", "45k", "1,5 millones", "1.2M", "45000"
  function monto(texto) {
    const t = quitar(texto).replace(/(\d)\s+(?=\d{3}\b)/g, '$1');
    const m = t.match(/\$?\s*(\d+(?:[.,]\d+)*)\s*(millones|millon|mill?|mil|k|m)?\b/);
    if (!m) return 0;
    let raw = m[1], mult = 1; const u = m[2] || '';
    if (/^mill/.test(u) || u === 'm') mult = 1e6; else if (u === 'mil' || u === 'k') mult = 1e3;
    let n;
    if (mult > 1) n = parseFloat(raw.replace(/\.(?=\d{3}\b)/g, '').replace(',', '.'));
    else n = parseInt(raw.replace(/[.,]/g, ''), 10);
    n = Math.round(n * mult);
    return Number.isFinite(n) && n >= 100 && n < 1e11 ? n : 0;
  }
  // Fecha relativa a `ref`: hoy, mañana, pasado mañana, en N días, el viernes, 15 nov, 15 de noviembre
  function fecha(texto, ref) {
    const t = quitar(texto), r = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
    const add = n => new Date(r.getFullYear(), r.getMonth(), r.getDate() + n);
    if (/pasado manana/.test(t)) return add(2);
    if (/\bmanana\b/.test(t)) return add(1);
    if (/\bhoy\b|esta noche|esta tarde/.test(t)) return r;
    let m = t.match(/en (\d{1,2}) dias?/); if (m) return add(+m[1]);
    m = t.match(/\b(\d{1,2})(?: de)? (ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)[a-z]*/);
    if (m) { let d = new Date(r.getFullYear(), MESES.indexOf(m[2]), +m[1]); if (d < r) d = new Date(r.getFullYear() + 1, d.getMonth(), d.getDate()); return d; }
    for (let i = 0; i < 7; i++) { if (new RegExp('\\b(el |este |el proximo )?' + DIAS[i] + '\\b').test(t)) { let k = (i - r.getDay() + 7) % 7; if (k === 0) k = 7; return add(k); } }
    if (/fin de semana|finde/.test(t)) return add((6 - r.getDay() + 7) % 7 || 7);
    return null;
  }
  const persona = texto => { const t = quitar(texto); const d = /\bdavid\b|\bdavo\b/.test(t), v = /\bvale\b|\bvalentina\b/.test(t); return d && !v ? 'D' : v && !d ? 'V' : /\bambos\b|\blos dos\b|juntos/.test(t) ? 'A' : null; };
  // Palabras → categoría del presupuesto (solo si existe en sus categorías)
  const CAT_KW = [
    ['g_11', ['rappi', 'domicilio', 'pizza', 'hamburguesa', 'ifood', 'antojo', 'helado']],
    ['g_02', ['mercado', 'supermercado', 'exito', 'carulla', 'd1', 'ara', 'olimpica', 'jumbo', 'verduras', 'frutas', 'leche', 'huevos']],
    ['g_10', ['cine', 'bar', 'restaurante', 'cerveza', 'salida', 'concierto', 'rumba', 'trago', 'almuerzo afuera', 'comida afuera', 'cafe']],
    ['g_12', ['uber', 'taxi', 'didi', 'indriver', 'pasaje', 'metro', 'bus', 'cabify']],
    ['g_13', ['gasolina', 'tanqueada', 'lavada', 'moto', 'parqueadero']],
    ['g_14', ['coral', 'oreo', 'perro', 'perros', 'veterinario', 'concentrado', 'cuido', 'snack', 'guarderia']],
    ['g_09', ['farmacia', 'drogueria', 'medicamento', 'cita medica', 'medico', 'odontologo', 'examen']],
    ['g_15', ['gimnasio', 'gym', 'peluqueria', 'unas', 'barberia', 'spa', 'masaje']],
    ['g_16', ['ropa', 'zapatos', 'tenis', 'maquillaje', 'camisa', 'vestido', 'crema']],
    ['g_04', ['luz', 'agua', 'gas', 'epm', 'energia', 'servicios']],
    ['g_03', ['internet', 'claro', 'tigo', 'movistar', 'wifi']],
    ['g_05', ['netflix', 'spotify', 'youtube', 'icloud', 'disney', 'hbo', 'suscripcion']],
    ['g_20', ['regalo', 'cumpleanos', 'aniversario', 'detalle']],
    ['g_01', ['arriendo', 'administracion']]
  ];
  function categoria(texto, cats) {
    const t = quitar(texto), ok = id => (cats || []).some(c => c.id === id);
    for (const [id, ws] of CAT_KW) if (ok(id) && hasW(t, ws)) return id;
    return ok('g_17') ? 'g_17' : ((cats || []).find(c => !c.saving) || {}).id || null;
  }
  const VERBOS_TAREA = ['comprar', 'llamar', 'pagar', 'lavar', 'organizar', 'sacar', 'llevar', 'arreglar', 'limpiar', 'recoger', 'cocinar', 'barrer', 'trapear', 'cambiar', 'revisar', 'agendar', 'reservar', 'enviar', 'mandar', 'banar', 'poner', 'instalar', 'cotizar', 'buscar', 'hacer', 'renovar', 'cancelar', 'devolver'];
  // Clasifica una nota: {tipo, monto, fecha, quien, cat, confianza, titulo}
  function clasificar(texto, ctx) {
    ctx = ctx || {};
    const t = quitar(texto).trim(), a = monto(texto), f = fecha(texto, ctx.hoy || new Date()), quien = persona(texto);
    const score = {gasto: 0, tarea: 0, idea: 0, plan: 0, meta: 0, ajuste: 0, pregunta: 0, nota: .5};
    if (/^(cuanto|cuantos|cuantas|como|que|quien|cual|donde)\b|\?$|^¿/.test(t) || has(t, ['resumen', 'como vamos', 'ayuda'])) score.pregunta += 3;
    if (a) score.gasto += 1.2;
    if (has(t, ['gaste', 'gastamos', 'pague', 'pagamos', 'compre', 'compramos', 'costo', 'salio', 'me cobraron', 'nos cobraron', 'valio'])) score.gasto += 2.5;
    if (categoria(texto, ctx.cats) && a && !/^g_17$/.test(categoria(texto, ctx.cats))) score.gasto += 1;
    const primera = t.split(/\s+/)[0] || '';
    if (VERBOS_TAREA.includes(primera)) score.tarea += 2;
    if (has(t, ['hay que', 'toca ', 'tengo que', 'tenemos que', 'no olvidar', 'recordar', 'recordarme', 'pendiente', 'acuerdate', 'acordarse'])) score.tarea += 2.2;
    if (f && !a) score.tarea += .6;
    if (has(t, ['idea', 'podriamos', 'que tal si', 'seria bueno', 'se me ocurrio', 'y si '])) score.idea += 2.4;
    if (has(t, ['plan', 'viaje', 'paseo', 'salir a', 'cita', 'fin de semana', 'finde', 'vacaciones', 'itinerario', 'reservar'])) score.plan += 1.6;
    if (hasW(t, ['ahorrar', 'meta', 'juntar', 'abonar', 'abono', 'ahorremos'])) { score.meta += 2.6; score.gasto -= 1; }
    if (has(t, ['cambiar el tope', 'ajustar', 'configurar', 'subir el tope', 'bajar el tope', 'presupuesto de'])) score.ajuste += 2.4;
    const tipo = Object.entries(score).sort((x, y) => y[1] - x[1])[0][0];
    const tot = Object.values(score).reduce((s, v) => s + v, 0) || 1;
    const titulo = String(texto).trim().replace(/\s+/g, ' ').replace(/^(hay que|toca|tengo que|tenemos que|no olvidar|recordar|recordarme)\s+/i, '').replace(/^./, c => c.toUpperCase()).slice(0, 80);
    return {tipo, monto: a, fecha: f, quien, cat: (tipo === 'gasto' || a) ? categoria(texto, ctx.cats) : null, confianza: Math.round(score[tipo] / tot * 100) / 100, titulo};
  }
  // Meta mencionada por nombre (palabra larga en común): "argentina" → Viaje Aniversario Argentina
  function metaDe(texto, goals) {
    const t = quitar(texto), ws = t.split(/[^a-z0-9ñ]+/).filter(w => w.length >= 4);
    let best = null, bs = 0;
    (goals || []).forEach(g => { const n = quitar(g.n); const s = ws.filter(w => n.includes(w)).length; if (s > bs) { bs = s; best = g; } });
    return best;
  }

  /* ===== 2. Análisis ===== */
  const stats = xs => { const n = xs.length; if (!n) return {n: 0, m: 0, sd: 0}; const m = xs.reduce((a, x) => a + x, 0) / n; return {n, m, sd: Math.sqrt(xs.reduce((a, x) => a + (x - m) * (x - m), 0) / n)}; };
  // Por categoría: gastado, tope, proyección lineal a fin de mes y riesgo
  function ritmo(st, dia, dim) {
    const out = {};
    st.cats.filter(c => !c.saving).forEach(c => {
      const g = st.moves.filter(m => m.cat === c.id).reduce((a, m) => a + m.a, 0);
      const fijo = st.pays.some(p => p.cat === c.id);
      const proy = fijo ? g : Math.round(g / Math.max(1, dia) * dim);
      out[c.id] = {n: c.n, g, b: c.b, proy, pct: c.b ? g / c.b : 0, riesgo: c.b > 0 && !fijo && dia >= 5 && proy > c.b * 1.05};
    });
    return out;
  }
  // Gastos fuera de lo normal: mayores a media + 2σ de su categoría (con al menos 4 datos) o > 40 % del tope
  function raros(st) {
    const res = [];
    const porCat = {}; st.moves.forEach(m => { (porCat[m.cat] = porCat[m.cat] || []).push(m); });
    Object.entries(porCat).forEach(([cat, ms]) => {
      if (cat === 'ahorro') return;
      const s = stats(ms.map(m => m.a)), c = st.cats.find(x => x.id === cat);
      ms.forEach(m => { if ((s.n >= 4 && m.a > s.m + 2 * s.sd) || (c && c.b > 0 && !st.pays.some(p => p.cat === cat) && m.a > c.b * .4)) res.push({...m, catN: c ? c.n : cat}); });
    });
    return res;
  }
  // Ritmo de cada meta: cuánto haría falta al mes vs. el aporte planeado
  function metas(st, ref) {
    return st.goals.filter(g => !g.open && g.t > g.s).map(g => {
      const meses = g.by ? Math.max(1, (g.by.getFullYear() - ref.getFullYear()) * 12 + g.by.getMonth() - ref.getMonth()) : null;
      const falta = g.t - g.s, necesita = meses ? Math.ceil(falta / meses) : null;
      return {id: g.id, n: g.n, pct: g.s / g.t, falta, meses, necesita, aporte: g.m, atrasada: !!(necesita && g.m && necesita > g.m * 1.1)};
    });
  }
  const tareas = st => ['V', 'D'].map(w => { const ts = st.tasks.filter(t => t.w === w); return {w, total: ts.length, hechas: ts.filter(t => t.done).length, pend: ts.filter(t => !t.done)}; });

  /* ===== 3. Respuestas del chat ===== */
  const fmtN = n => typeof fmt === 'function' ? fmt(n) : '$' + n;
  const nom = w => w === 'D' ? 'David' : 'Vale';
  function responder(texto, st, ref) {
    const t = quitar(texto), dia = ref.getDate(), dim = new Date(ref.getFullYear(), ref.getMonth() + 1, 0).getDate();
    const out = st.moves.reduce((a, m) => a + m.a, 0), sv = st.moves.filter(m => m.cat === 'ahorro').reduce((a, m) => a + m.a, 0);
    if (has(t, ['ayuda', 'que puedes', 'que sabes'])) return {texto: 'Puedo guardar tareas, gastos, ideas y planes; si escriben "gasté 45 mil en cine" lo registro con un toque. Y respondo: "¿cuánto nos queda?", "gastos de la semana", "¿cómo va Argentina?", "pagos pendientes", "tareas de David", "¿quién va ganando?" o "resumen".'};
    if (has(t, ['queda', 'disponible', 'plata', 'cuanto tenemos', 'saldo'])) return {texto: `Les quedan ${fmtN(st.income - out)} de ${fmtN(st.income)} este mes, con ${dim - dia} días por delante. Gastado: ${fmtN(out - sv)} · ahorrado: ${fmtN(sv)}.`};
    if (has(t, ['gasto', 'gastado', 'gastamos', 'en que se fue'])) {
      const sem = has(t, ['semana']), hoy = has(t, ['hoy']);
      const ms = st.moves.filter(m => m.cat !== 'ahorro' && (hoy ? m.d === dia : sem ? m.d > dia - 7 : true));
      const cat = (CAT_KW.find(([, ws]) => hasW(t, ws)) || [])[0];
      const sel = cat ? ms.filter(m => m.cat === cat) : ms, tot = sel.reduce((a, m) => a + m.a, 0);
      const top = Object.entries(sel.reduce((o, m) => { o[m.cat] = (o[m.cat] || 0) + m.a; return o; }, {})).sort((a, b) => b[1] - a[1]).slice(0, 3)
        .map(([id, v]) => `${(st.cats.find(c => c.id === id) || {n: id}).n} ${fmtN(v)}`).join(', ');
      return {texto: `${hoy ? 'Hoy' : sem ? 'En los últimos 7 días' : 'Este mes'} van ${fmtN(tot)} en ${sel.length} ${sel.length === 1 ? 'gasto' : 'gastos'}${top && !cat ? '. Lo que más pesa: ' + top : ''}.`};
    }
    if (has(t, ['pago', 'pagos', 'vence', 'vencen', 'cuentas'])) {
      const pend = st.pays.filter(p => !p.paid).sort((a, b) => a.d - b.d);
      return {texto: pend.length ? `Faltan ${pend.length} pagos por ${fmtN(pend.reduce((a, p) => a + p.a, 0))}. El próximo: ${pend[0].n} el día ${pend[0].d}${pend[0].d < dia ? ' (ya se pasó)' : ''}.` : 'Todos los pagos del mes están al día. Qué descanso.'};
    }
    const g = metaDe(texto, st.goals);
    if (g || has(t, ['meta', 'metas', 'ahorro', 'ahorrado'])) {
      if (g) { const r = metas(st, ref).find(x => x.id === g.id); return {texto: g.open ? `${g.n}: llevan ${fmtN(g.s)} acumulados.` : `${g.n}: llevan ${fmtN(g.s)} de ${fmtN(g.t)} (${Math.round(g.s / g.t * 100)} %).${r && r.necesita ? ` Para llegar a tiempo necesitan ${fmtN(r.necesita)} al mes${r.atrasada ? ', más de lo que están aportando' : ''}.` : ''}`, meta: g.id}; }
      return {texto: st.goals.filter(x => !x.open).map(x => `${x.n}: ${Math.round(x.s / x.t * 100)} %`).join(' · ') || 'Aún no tienen metas con monto.'};
    }
    if (has(t, ['tarea', 'tareas', 'pendiente', 'oficio'])) {
      const w = persona(texto); const ts = st.tasks.filter(x => !x.done && (!w || w === 'A' || x.w === w));
      return {texto: ts.length ? `${w && w !== 'A' ? 'A ' + nom(w) + ' le' : 'Les'} quedan ${ts.length}: ${ts.slice(0, 4).map(x => x.n).join(', ')}${ts.length > 4 ? '…' : '.'}` : 'No hay tareas pendientes. A disfrutar la casa.'};
    }
    if (has(t, ['punto', 'puntos', 'marcador', 'ganando', 'gana'])) { const v = st.pts.V, d = st.pts.D; return {texto: v === d ? `Van empatados con ${v} puntos.` : `Va ganando ${v > d ? 'Vale' : 'David'}: ${Math.max(v, d)} contra ${Math.min(v, d)}.`}; }
    if (has(t, ['racha'])) return {texto: `Llevan ${st.streak} ${st.streak === 1 ? 'día' : 'días'} de racha.`};
    if (has(t, ['resumen', 'como vamos', 'como va todo'])) return {texto: resumen(st, ref)};
    return {texto: 'No supe responder eso todavía. Prueben con "¿cuánto nos queda?", "gastos de la semana", "pagos pendientes" o "resumen".'};
  }
  function resumen(st, ref) {
    const dia = ref.getDate(), dim = new Date(ref.getFullYear(), ref.getMonth() + 1, 0).getDate();
    const out = st.moves.reduce((a, m) => a + m.a, 0), r = ritmo(st, dia, dim), riesgo = Object.values(r).filter(x => x.riesgo);
    const pend = st.pays.filter(p => !p.paid), tk = tareas(st);
    return [`Les quedan ${fmtN(st.income - out)} este mes.`, pend.length ? `${pend.length} pagos pendientes.` : 'Pagos al día.',
      riesgo.length ? `Ojo con ${riesgo.map(x => x.n).slice(0, 2).join(' y ')}: a este ritmo se pasan del tope.` : 'Ninguna categoría va a pasarse del tope.',
      `Tareas: Vale ${tk[0].hechas}/${tk[0].total} · David ${tk[1].hechas}/${tk[1].total}.`].join(' ');
  }

  /* ===== 4. Tarjetas de "Hoy" para Inicio (máx. 4, de más a menos urgente) ===== */
  function tarjetas(st, ref, perfil) {
    const dia = ref.getDate(), dim = new Date(ref.getFullYear(), ref.getMonth() + 1, 0).getDate(), res = [];
    st.pays.filter(p => !p.paid && Math.min(p.d, dim) <= dia + 1).sort((a, b) => a.d - b.d).slice(0, 2).forEach(p => {
      const d = Math.min(p.d, dim) - dia;
      res.push({p: d < 0 ? 100 : 90, i: 'repeat', t: d < 0 ? 'al' : 'gd', titulo: `${p.n} ${d < 0 ? 'está vencido' : d === 0 ? 'vence hoy' : 'vence mañana'}`, texto: fmtN(p.a) + (p.ent ? ' · ' + p.ent : ''), act: 'pay', id: p.id, label: 'Pagar'});
    });
    const mias = st.tasks.filter(x => !x.done && x.w === perfil);
    if (mias.length) res.push({p: 70, i: 'check', t: 'a2', titulo: `Tienes ${mias.length} ${mias.length === 1 ? 'tarea' : 'tareas'}`, texto: mias.slice(0, 2).map(x => x.n).join(' · '), act: 'task', id: mias[0].id, label: 'Hecha la primera'});
    const r = ritmo(st, dia, dim), riesgo = Object.entries(r).filter(([, x]) => x.riesgo).sort((a, b) => b[1].proy / b[1].b - a[1].proy / a[1].b)[0];
    if (riesgo) res.push({p: 80, i: 'alert', t: 'al', titulo: `${riesgo[1].n} va rápido`, texto: `A este ritmo cierran el mes en ${fmtN(riesgo[1].proy)} y el tope es ${fmtN(riesgo[1].b)}.`, act: 'cuentas', id: 'topes', label: 'Ver topes'});
    const rar = raros(st).slice(-1)[0];
    if (rar) res.push({p: 60, i: 'spark', t: 'gd', titulo: 'Un gasto fuera de lo normal', texto: `${rar.n}: ${fmtN(rar.a)} en ${rar.catN}.`, act: 'go', id: 'finanzas', label: 'Revisar'});
    const atr = metas(st, ref).filter(x => x.atrasada).sort((a, b) => (a.meses || 99) - (b.meses || 99))[0];
    if (atr) res.push({p: 65, i: 'target', t: 'a3', titulo: `${atr.n} necesita un empujón`, texto: `Faltan ${fmtN(atr.falta)}: para llegar a tiempo son ${fmtN(atr.necesita)} al mes.`, act: 'plan', id: atr.id, label: 'Abrir plan'});
    const sin = (st.notas || []).filter(n => !n.hecho && !n.conv && n.k && n.k !== 'nota' && n.k !== 'pregunta' && n.by !== 'bot').length;
    if (sin) res.push({p: 50, i: 'bulb', t: 'a1', titulo: `${sin} ${sin === 1 ? 'apunte espera' : 'apuntes esperan'}`, texto: 'Ideas y tareas del chat que aún no convierten.', act: 'go', id: 'apuntes', label: 'Abrir apuntes'});
    if (!res.length) res.push({p: 10, i: 'heart', t: 'ok', titulo: 'Todo en orden', texto: 'Nada urgente hoy. Buen día para avanzar una meta o escribir una idea en Apuntes.', act: 'go', id: 'apuntes', label: 'Escribir'});
    return res.sort((a, b) => b.p - a.p).slice(0, 4);
  }

  /* ===== 5. Foto diaria y aviso del primer mes ===== */
  function foto(st, ref) {
    return {f: iso(ref), out: st.moves.reduce((a, m) => a + m.a, 0), sv: st.moves.filter(m => m.cat === 'ahorro').reduce((a, m) => a + m.a, 0),
      pend: st.pays.filter(p => !p.paid).length, td: st.tasks.filter(t => t.done).length, tt: st.tasks.length, notas: (st.notas || []).length, pV: st.pts.V, pD: st.pts.D, racha: st.streak};
  }
  // Una vez al día: agrega la foto; devuelve {nuevo, dias, mesListo}
  function diario(st, ref) {
    st.diario = st.diario || [];
    const f = iso(ref), last = st.diario[st.diario.length - 1];
    if (!st.aprendeDesde) st.aprendeDesde = f;
    let nuevo = false;
    if (!last || last.f !== f) { st.diario.push(foto(st, ref)); nuevo = true; } else st.diario[st.diario.length - 1] = foto(st, ref);
    if (st.diario.length > 400) st.diario.splice(0, st.diario.length - 400);
    const d0 = new Date(st.aprendeDesde + 'T00:00:00'), dias = Math.floor((new Date(f + 'T00:00:00') - d0) / 864e5) + 1;
    return {nuevo, dias, mesListo: dias >= 30 && !st.aprendeAviso};
  }
  // Paquete para el desarrollador: números agregados, sin texto de los apuntes ni archivos
  function paquete(st) {
    const tiposNotas = (st.notas || []).reduce((o, n) => { o[n.k || 'nota'] = (o[n.k || 'nota'] || 0) + 1; return o; }, {});
    return {app: 'rumbo-aprende', version: '2.0', desde: st.aprendeDesde, generado: new Date().toISOString(), diario: st.diario || [], tiposNotas,
      categorias: st.cats.map(c => ({id: c.id, n: c.n, tope: c.b})), gastosPorCategoria: st.moves.reduce((o, m) => { o[m.cat] = (o[m.cat] || 0) + m.a; return o; }, {}),
      tareas: tareas(st).map(x => ({w: x.w, total: x.total, hechas: x.hechas})), metas: metas(st, new Date()).map(x => ({n: x.n, pct: Math.round(x.pct * 100), atrasada: x.atrasada}))};
  }

  return {clasificar, responder, resumen, tarjetas, diario, paquete, metaDe, pure: {monto, fecha, persona, categoria, ritmo, raros, metas, tareas, stats, quitar}};
})();

// Finanzas: Graficas.page() devuelve TODA la página bajo el título (resumen + segmentos Avance · Presupuesto · Pagos · Movimientos).
// Graficas.after(root) la anima. Graficas.html() (bloque de gráficas anterior) sigue funcionando por compatibilidad.
// Usa globales de app.js (S, fmt, short, ic, tile, tone, payRow, today, daysInMonth, monthName, monthShort, Avatares).
const Graficas = (() => {
  const PAL = ['var(--a1)', 'var(--a2)', 'var(--a3)', 'var(--gold)', 'var(--ok)'];
  const num = n => Number.isFinite(n) ? n : 0;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
  const pctTxt = n => Math.round(num(n) * 100) + '%';
  const diasMes = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); };

  // ---------- Lógica pura ----------
  // Categorías de gasto (sin ahorro) con lo gastado, de mayor a menor
  function gastoPorCat(cats, moves) {
    return (cats || []).filter(c => !c.saving).map(c => {
      const s = (moves || []).filter(m => m.cat === c.id).reduce((a, m) => a + num(m.a), 0);
      return {id: c.id, n: c.n, i: c.i, t: c.t, b: num(c.b), s};
    }).filter(c => c.s > 0 || c.b > 0).sort((a, b) => b.s - a.s);
  }
  // Las 5 mayores + "Otras"
  function segmentos(lista) {
    const con = lista.filter(c => c.s > 0), total = con.reduce((a, c) => a + c.s, 0);
    if (!total) return {total: 0, segs: []};
    const top = con.slice(0, 5).map((c, k) => ({n: c.n, v: c.s, col: PAL[k]}));
    const resto = con.slice(5).reduce((a, c) => a + c.s, 0);
    if (resto > 0) top.push({n: 'Otras', v: resto, col: 'var(--muted)'});
    let acc = 0;
    return {total, segs: top.map(s => { const p = s.v / total * 100, r = {...s, p, ini: acc}; acc += p; return r; })};
  }
  // Gasto acumulado por día (1..hoy)
  function acumulado(moves, cats, hoy) {
    const ahorro = new Set((cats || []).filter(c => c.saving).map(c => c.id)), por = new Array(hoy + 1).fill(0);
    (moves || []).forEach(m => { if (ahorro.has(m.cat)) return; por[Math.min(hoy, Math.max(1, Math.round(num(m.d)) || 1))] += num(m.a); });
    const out = []; let s = 0;
    for (let d = 1; d <= hoy; d++) { s += por[d]; out.push(s); }
    return out;
  }

  // ---------- Tarjetas ----------
  const head = (icono, t, pill) => `<div class="card-h"><h2>${ic(icono)}${t}</h2>${pill || ''}</div>`;
  const vacio = (icono, t, txt) => `<div class="gx-empty">${ic(icono)}<b>${t}</b><span>${txt}</span></div>`;

  function dona(lista, i) {
    const {total, segs} = segmentos(lista);
    if (!total) return `<section class="glass gx-card" style="--i:${i}">${head('wallet', 'A dónde se va la plata')}${vacio('wallet', 'Aún no hay gastos', 'Cuando registren el primero, aquí verán el reparto.')}</section>`;
    const R = 52, circ = '<circle class="gx-trk" cx="70" cy="70" r="52" pathLength="100"/>';
    const arcos = segs.map((s, k) => {
      const len = Math.max(0.5, s.p - (segs.length > 1 ? 1.2 : 0)), tip = `${s.n}: ${fmt(s.v)} (${pctTxt(s.v / total)})`;
      return `<circle class="gx-seg" data-tip="${esc(tip)}" tabindex="0" role="img" aria-label="${esc(tip)}" style="--l:${len.toFixed(2)};--d:${k * 90}ms;stroke:${s.col}" cx="70" cy="70" r="${R}" pathLength="100" transform="rotate(${(s.ini * 3.6 - 90).toFixed(2)} 70 70)"><title>${esc(tip)}</title></circle>`;
    }).join('');
    const ley = segs.map(s => { const tip = `${s.n}: ${fmt(s.v)} (${pctTxt(s.v / total)})`;
      return `<li data-tip="${esc(tip)}" tabindex="0" aria-label="${esc(tip)}" title="${esc(tip)}"><i style="background:${s.col}"></i><span class="gx-nm">${esc(s.n)}</span><b class="mono">${short(s.v)}</b></li>`; }).join('');
    return `<section class="glass gx-card" style="--i:${i}">${head('wallet', 'A dónde se va la plata', `<span class="pill c1">${segs.length} ${segs.length === 1 ? 'grupo' : 'grupos'}</span>`)}
      <div class="gx-donut"><div class="gx-dwrap"><svg viewBox="0 0 140 140" role="group" aria-label="Gasto por categoría, total ${fmt(total)}">${circ}${arcos}</svg>
        <div class="gx-center"><b class="mono">${short(total)}</b><span>gastado</span></div></div>
        <ul class="gx-leg">${ley}</ul></div></section>`;
  }

  function barras(lista, i) {
    const l = lista.slice(0, 6);
    if (!l.length) return `<section class="glass gx-card" style="--i:${i}">${head('target', 'Presupuesto vs gastado')}${vacio('target', 'Sin presupuesto todavía', 'Cuando haya categorías con presupuesto, las comparamos aquí.')}</section>`;
    const filas = l.map((c, k) => {
      const raw = c.b ? c.s / c.b : (c.s ? 1.01 : 0), over = raw > .9, col = over ? 'var(--alert)' : (tone[c.t] || tone.a1)[0];
      const tip = `${c.n}: ${fmt(c.s)} de ${fmt(c.b)} (${pctTxt(raw)})${raw > 1 ? ', te pasaste' : over ? ', casi al tope' : ''}`;
      return `<div class="gx-bar" data-tip="${esc(tip)}" tabindex="0" role="img" aria-label="${esc(tip)}" title="${esc(tip)}">
        <div class="gx-bt"><span class="gx-nm">${esc(c.n)}</span><span class="mono ${over ? 'gx-warn' : ''}">${pctTxt(raw)}</span></div>
        <div class="gx-trackb"><i style="--p:${Math.min(1, raw).toFixed(3)};--d:${k * 80}ms;background:${col}"></i></div>
        <div class="gx-bs mono">${short(c.s)} <span>de ${short(c.b)}</span></div></div>`;
    }).join('');
    const alertas = l.filter(c => c.b && c.s / c.b > .9).length;
    return `<section class="glass gx-card" style="--i:${i}">${head('target', 'Presupuesto vs gastado', alertas ? `<span class="pill al">${alertas} al tope</span>` : '<span class="pill ok">Todo en orden</span>')}<div class="gx-bars">${filas}</div></section>`;
  }

  function ritmo(i) {
    const N = diasMes(), hoy = Math.min(N, Math.max(1, num(today) || 1));
    const presu = (S.cats || []).filter(c => !c.saving).reduce((a, c) => a + num(c.b), 0), acum = acumulado(S.moves, S.cats, hoy);
    if (!presu || !acum[hoy - 1]) return `<section class="glass gx-card" style="--i:${i}">${head('trend', 'Ritmo del mes')}${vacio('trend', 'El mes apenas arranca', 'Con los primeros gastos dibujamos su ritmo contra el ideal.')}</section>`;
    const W = 320, H = 140, px = 8, py = 12, top = Math.max(presu, ...acum) * 1.08;
    const X = d => px + (d - 1) / Math.max(1, N - 1) * (W - px * 2), Y = v => H - py - v / top * (H - py * 2);
    const pts = acum.map((v, k) => [X(k + 1), Y(v)]), linea = pts.map((p, k) => (k ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
    const area = `${linea} L${pts[pts.length - 1][0].toFixed(1)} ${H - py} L${pts[0][0].toFixed(1)} ${H - py} Z`;
    const ideal = presu * hoy / N, dif = acum[hoy - 1] - ideal, ok = dif <= 0, col = ok ? 'var(--ok)' : 'var(--alert)';
    const msg = dif === 0 ? 'Justo en el ritmo ideal. Qué orden, parceros.' : ok ? `Van ${short(-dif)} por debajo del ritmo ideal. Así sí, parceros.` : `Van ${short(dif)} por encima del ritmo ideal. Toca frenar un poquito.`;
    const last = pts[pts.length - 1], tipHoy = `Día ${hoy}: ${fmt(acum[hoy - 1])} gastados; lo ideal sería ${fmt(Math.round(ideal))}`;
    return `<section class="glass gx-card" style="--i:${i}">${head('trend', 'Ritmo del mes', `<span class="pill ${ok ? 'ok' : 'al'}">${ok ? 'Buen ritmo' : 'Ojo al ritmo'}</span>`)}
      <svg class="gx-line" viewBox="0 0 ${W} ${H}" style="--c:${col}" tabindex="0" role="img" data-tip="${esc(tipHoy)}" data-n="${N}" data-hoy="${hoy}" aria-label="Gasto acumulado del mes. ${esc(tipHoy)}. ${esc(msg)}">
        <defs><linearGradient id="gx-ar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:${col};stop-opacity:.35"/><stop offset="1" style="stop-color:${col};stop-opacity:0"/></linearGradient></defs>
        <line class="gx-grid" x1="${px}" x2="${W - px}" y1="${H - py}" y2="${H - py}"/>
        <line class="gx-ideal" x1="${X(1)}" y1="${Y(presu / N)}" x2="${X(N)}" y2="${Y(presu)}"/>
        <path class="gx-area" d="${area}" fill="url(#gx-ar)"/>
        <path class="gx-path" d="${linea}" pathLength="1" style="stroke:${col}"/>
        <g class="gx-dot" transform="translate(${last[0].toFixed(1)} ${last[1].toFixed(1)})"><circle class="gx-pulse" r="7" style="fill:${col}"/><circle r="4.5" style="fill:${col}"/><circle r="1.8" fill="var(--bg)"/></g>
        <rect class="gx-hit" x="0" y="0" width="${W}" height="${H}" fill="transparent"/></svg>
      <div class="gx-ax mono"><span>1 ${esc(monthShort)}</span><span>${Math.round(N / 2)}</span><span>${N}</span></div>
      <div class="gx-leg2"><span><i style="background:${col}"></i>Lo gastado</span><span><i class="gx-dash"></i>Ideal (${short(presu)})</span></div>
      <p class="gx-msg">${msg}</p>
      <script type="application/json" class="gx-data">${JSON.stringify(acum)}</script></section>`.replace(/<script[\s\S]*?<\/script>/, '');
  }

  const mesCorto = k => { const m = /^(\d{4})-(\d{2})$/.exec(String(k)); return m ? new Date(+m[1], +m[2] - 1, 1).toLocaleDateString('es-CO', {month: 'short'}).replace('.', '') : String(k); };
  function tendencia(i) {
    const h = (S.hist || []).filter(x => x && Number.isFinite(x.out)).slice(-6).map(x => ({...x, g: Math.max(0, num(x.out) - num(x.sv))}));
    if (h.length < 2) return `<section class="glass gx-card" style="--i:${i}">${head('clock', 'Meses anteriores')}${vacio('clock', 'Todavía no hay historia', 'Con dos meses cerrados verán aquí cómo van gastando y ahorrando.')}</section>`;
    const mx = Math.max(1, ...h.map(x => Math.max(num(x.g), num(x.sv)))), ahorroPrev = h.reduce((a, x) => a + num(x.sv), 0);
    const cols = h.map((x, k) => { const tip = `${x.m}: gastaron ${fmt(num(x.g))} y ahorraron ${fmt(num(x.sv))}`;
      return `<div class="gx-col" data-tip="${esc(tip)}" tabindex="0" role="img" aria-label="${esc(tip)}" title="${esc(tip)}"><div class="gx-pair">
        <i class="gx-b1" style="height:${Math.max(3, num(x.g) / mx * 100).toFixed(1)}%;--d:${k * 70}ms"></i><i class="gx-b2" style="height:${Math.max(3, num(x.sv) / mx * 100).toFixed(1)}%;--d:${k * 70 + 40}ms"></i></div><span>${esc(mesCorto(x.m))}</span></div>`; }).join('');
    return `<section class="glass gx-card" style="--i:${i}">${head('clock', 'Meses anteriores', `<span class="pill ok">${short(ahorroPrev)} ahorrados</span>`)}
      <div class="gx-cols">${cols}</div><div class="gx-leg2"><span><i style="background:var(--a1)"></i>Gastado</span><span><i style="background:var(--ok)"></i>Ahorrado</span></div></section>`;
  }

  // ================= Página Finanzas (v3) =================
  // Estado propio del módulo: sección visible y si se ven todas las categorías
  const TABS = [['avance', 'Avance', 'trend'], ['presupuesto', 'Presupuesto', 'target'], ['pagos', 'Pagos', 'repeat'], ['movimientos', 'Movimientos', 'clock']];
  const TIPOS = [['fijo', 'Gastos fijos'], ['variable', 'Gastos variables'], ['fondo_anual', 'Fondos del año'], ['otros', 'Otros gastos'], ['ahorro', 'Ahorro e inversión']];
  let tab = 'avance', todas = false;

  const esAhorro = c => !!c && (c.saving === true || c.id === 'ahorro');
  const idsAhorro = cats => { const s = new Set((cats || []).filter(esAhorro).map(c => c.id)); s.add('ahorro'); return s; };
  const pos = n => Math.max(0, Math.round(num(n)));
  const plata = n => { n = Math.round(num(n)); return n < 0 ? '−' + fmt(-n) : fmt(n); };
  const corto = n => { n = Math.round(num(n)); return n < 0 ? '−' + corto(-n) : n < 1000 ? fmt(n) : short(n); };
  const dia = (d, N) => Math.min(N, Math.max(1, Math.round(num(d)) || 1));
  const mayus = t => t ? t.charAt(0).toUpperCase() + t.slice(1) : '';
  const plural = (n, uno, varios) => n + ' ' + (n === 1 ? uno : varios);
  const tono = t => (typeof tone === 'object' && tone[t]) ? t : 'mu';
  const calendario = () => {
    const N = num(typeof daysInMonth === 'number' ? daysInMonth : 0) || diasMes();
    return {N, hoy: dia(typeof today === 'number' ? today : new Date().getDate(), N), mes: typeof monthName === 'string' ? monthName : 'este mes', mesC: typeof monthShort === 'string' ? monthShort : ''};
  };

  // ---------- Lógica pura ----------
  // Resumen del mes: ingreso, lo que salió, ahorro, gasto real, pendiente y disponible
  function resumen(st) {
    const ah = idsAhorro(st.cats); let out = 0, sv = 0;
    (st.moves || []).forEach(m => { const a = pos(m.a); out += a; if (ah.has(m.cat)) sv += a; });
    const pend = (st.pays || []).filter(p => !p.paid), porPagar = pend.reduce((a, p) => a + pos(p.a), 0), ingreso = pos(st.income);
    return {ingreso, out, sv, gastado: out - sv, porPagar, nPend: pend.length, disp: ingreso - out, uso: ingreso ? Math.min(1, out / ingreso) : (out ? 1 : 0)};
  }
  // Semanas del mes (1–7, 8–14, …) con gasto, ahorro y pagos de cada una
  function semanas(st, hoy, N) {
    const ah = idsAhorro(st.cats), out = [];
    for (let a = 1, k = 1; a <= N; a += 7, k++) {
      const b = Math.min(N, a + 6), en = d => { const x = dia(d, N); return x >= a && x <= b; };
      let g = 0, sv = 0, n = 0;
      (st.moves || []).forEach(m => { if (!en(m.d)) return; n++; if (ah.has(m.cat)) sv += pos(m.a); else g += pos(m.a); });
      const ps = (st.pays || []).filter(p => en(p.d)).sort((x, y) => dia(x.d, N) - dia(y.d, N));
      const est = hoy > b ? 'past' : hoy < a ? 'future' : 'now';
      out.push({k, a, b, g, sv, n, est, hechos: ps.filter(p => p.paid), pend: ps.filter(p => !p.paid), p: est === 'past' ? 1 : est === 'now' ? (hoy - a + 1) / (b - a + 1) : 0});
    }
    return out;
  }
  // Categorías agrupadas por tipo (c.k), con subtotales; `rel` = ids de las más relevantes
  function porTipo(cats, moves, cuantas) {
    const g = new Map(); (moves || []).forEach(m => g.set(m.cat, (g.get(m.cat) || 0) + pos(m.a)));
    const filas = (cats || []).map(c => { const b = pos(c.b), s = g.get(c.id) || 0;
      return {id: c.id, n: c.n, t: c.t, b, s, ah: esAhorro(c), k: esAhorro(c) ? 'ahorro' : (TIPOS.some(x => x[0] === c.k) ? c.k : 'otros'), raw: b ? s / b : (s ? 1.01 : 0)}; }).filter(f => f.b > 0 || f.s > 0);
    const gasto = filas.filter(f => !f.ah);
    const rel = new Set([...gasto].sort((x, y) => (y.s - x.s) || (y.b - x.b)).slice(0, cuantas).map(f => f.id));
    const grupos = TIPOS.map(([k, n]) => { const l = filas.filter(f => f.k === k); return {k, n, filas: l, s: l.reduce((a, f) => a + f.s, 0), b: l.reduce((a, f) => a + f.b, 0)}; }).filter(x => x.filas.length);
    return {grupos, rel, total: filas.length, s: gasto.reduce((a, f) => a + f.s, 0), b: gasto.reduce((a, f) => a + f.b, 0), alTope: gasto.filter(f => f.b && f.raw > .9).length};
  }
  // Últimos movimientos agrupados por día (más reciente primero)
  function porDia(moves, N, max) {
    const l = (moves || []).map((m, k) => ({m, k, d: dia(m.d, N)})).sort((x, y) => (y.d - x.d) || (y.k - x.k)).slice(0, max), dias = [];
    l.forEach(x => { let g = dias[dias.length - 1]; if (!g || g.d !== x.d) dias.push(g = {d: x.d, items: [], tot: 0}); g.items.push(x.m); g.tot += pos(x.m.a); });
    return dias;
  }
  const mesLargo = k => { const m = /^(\d{4})-(\d{2})$/.exec(String(k)); return m ? mayus(new Date(+m[1], +m[2] - 1, 1).toLocaleDateString('es-CO', {month: 'long', year: 'numeric'})) : String(k); };
  // Frase de cierre del hilo: chiste, enseñanza y ánimo
  function frase(r, vencidos, hayMovs) {
    if (!hayMovs) return 'Plata que no se anota, plata que se va de paseo sin avisar. Anoten el primero y el hilo empieza a tejerse.';
    if (r.disp < 0) return 'Este mes se estiró más la cobija que la cama. Tranquilos: el que anota la caída ya se está levantando.';
    if (vencidos) return 'Hay un pago mirándolos feo desde atrás. Cuentas claras y chocolate espeso: salgan de él y sigan livianos.';
    if (r.sv > 0) return 'Paso a paso se teje el mes. Y lo que ya guardaron no es plata quieta: es un abrazo para los dos de mañana.';
    return 'Paso a paso se teje el mes: lo que hoy anotan juntos, mañana no los asusta.';
  }

  // ---------- Piezas de vista ----------
  const titulo = (t, sub) => `<div class="gx-ch"><h2>${t}</h2>${sub ? `<p>${sub}</p>` : ''}</div>`;
  const barra = (p, col, d) => `<div class="gx-trackb" aria-hidden="true"><i style="--p:${Math.min(1, Math.max(0, num(p))).toFixed(3)};--d:${d || 0}ms;background:${col}"></i></div>`;
  const hito = (cls, icono, txt, estado, monto) => `<li class="${cls}">${ic(icono)}<span class="gx-nm">${txt}${estado ? ` <em>${estado}</em>` : ''}</span>${monto == null ? '' : `<span class="mono">${corto(monto)}</span>`}</li>`;

  function resumenHTML(r, c) {
    const neg = r.disp < 0, p = Math.round(r.uso * 100), quedan = Math.max(0, c.N - c.hoy);
    const leyenda = !r.ingreso ? 'Aún no han anotado el ingreso del mes' : `de ${fmt(r.ingreso)} · ${quedan ? 'quedan ' + plural(quedan, 'día', 'días') : 'último día del mes'}`;
    const kp = (col, t, v) => `<div><dt><i style="background:${col}"></i>${t}</dt><dd class="mono" title="${fmt(v)}"><span aria-hidden="true">${corto(v)}</span><span class="gx-sr">${fmt(v)}</span></dd></div>`;
    return `<section class="glass gx-hero${neg ? ' gx-neg' : ''}" style="--i:1" aria-label="Resumen de ${esc(c.mes)}">
      <div class="gx-gauge"><svg viewBox="0 0 200 108" role="img" aria-label="Han usado el ${p}% del ingreso del mes">
        <defs><linearGradient id="gx-hg" x1="0" y1="0" x2="1" y2="0"><stop offset="0" style="stop-color:var(--a1)"/><stop offset="1" style="stop-color:var(--a3)"/></linearGradient></defs>
        <path class="gx-gt" d="M14 100A86 86 0 0 1 186 100" pathLength="100"/>
        ${p > 0 ? `<path class="gx-gf" d="M14 100A86 86 0 0 1 186 100" pathLength="100" style="--o:${100 - p}"/>` : ''}</svg>
        <div class="gx-gin"><span class="gx-eb">${neg ? 'Se pasaron por' : 'Disponible este mes'}</span>
          <div class="gx-amt mono"${neg ? '' : ` data-count="${r.disp}"`}><span class="cur">${neg ? '−$' : '$'}</span><span class="num">${fmt(Math.abs(r.disp)).slice(1)}</span></div></div></div>
      <p class="gx-sub">${leyenda}</p>
      <dl class="gx-kps">${kp('var(--a1)', 'Gastado', r.gastado)}${kp('var(--ok)', 'Ahorrado', r.sv)}${kp('var(--alert)', 'Por pagar', r.porPagar)}</dl></section>`;
  }

  function avanceHTML(r, c) {
    const sem = semanas(S, c.hoy, c.N), mx = Math.max(1, ...sem.map(w => w.g)), N = c.N;
    const diaSem = new Date().toLocaleDateString('es-CO', {weekday: 'long'});
    let vencidos = 0;
    const nodos = sem.map((w, k) => {
      const hs = [];
      w.hechos.forEach(p => hs.push(hito('ok', 'ok', esc(p.n), 'pagado', p.a)));
      w.pend.forEach(p => { const d = dia(p.d, N), tarde = d < c.hoy; if (tarde) vencidos++;
        hs.push(hito(tarde || d === c.hoy ? 'al' : 'mu', tarde ? 'alert' : 'clock', esc(p.n), tarde ? 'vencido' : d === c.hoy ? 'vence hoy' : 'el ' + d, p.a)); });
      if (w.sv > 0) hs.push(hito('ok', 'trend', 'Ahorro', 'guardado', w.sv));
      const vis = hs.slice(0, 4), mas = hs.length - vis.length, pendT = w.pend.reduce((a, p) => a + pos(p.a), 0);
      const fut = w.est === 'future', cifra = fut ? (pendT ? fmt(pendT) : '') : fmt(w.g), rot = fut ? (pendT ? 'por pagar' : 'por venir') : w.est === 'now' ? 'van gastados' : w.g ? 'gastado' : 'sin gastos';
      const lbl = `Semana ${w.k}, del ${w.a} al ${w.b}: ${fut ? (pendT ? fmt(pendT) + ' por pagar' : 'por venir') : fmt(w.g) + ' gastados'}${w.est === 'now' ? '. Semana actual' : ''}`;
      return `<li class="gx-nd gx-${w.est}" style="--k:${k};--p:${w.p.toFixed(3)}" aria-label="${esc(lbl)}"${w.est === 'now' ? ' aria-current="step"' : ''}>
        <span class="gx-ln" aria-hidden="true"><i></i></span>
        <span class="gx-pt" aria-hidden="true">${w.est === 'past' ? ic('ok') : w.est === 'now' ? '' : `<b class="mono">${w.k}</b>`}</span>
        <div class="gx-nb"><div class="gx-nh"><div class="gx-nt"><b>Semana ${w.k}</b><span>${w.a}–${w.b} ${esc(c.mesC)}</span></div>
            <div class="gx-nv">${cifra ? `<b class="mono">${cifra}</b>` : ''}<span>${rot}</span></div></div>
          ${w.est === 'now' ? `<span class="pill c1 gx-hoy">${ic('cal')}Hoy · ${esc(diaSem)} ${c.hoy}</span>` : ''}
          ${!fut && w.g > 0 ? barra(w.g / mx, 'var(--a1)', k * 130 + 300) : ''}
          ${vis.length ? `<ul class="gx-hitos">${vis.join('')}${mas > 0 ? `<li class="mu gx-mas">y ${plural(mas, 'hito más', 'hitos más')}</li>` : ''}</ul>` : ''}</div></li>`;
    }).join('');
    const cierre = r.disp - r.porPagar, kf = sem.length;
    const fin = `<li class="gx-nd gx-fin" style="--k:${kf}" aria-label="Fin de mes"><span class="gx-pt" aria-hidden="true">${ic('star')}</span>
      <div class="gx-nb"><div class="gx-nh"><div class="gx-nt"><b>Fin de mes</b><span>${N} ${esc(c.mesC)}</span></div>
        <div class="gx-nv"><b class="mono${cierre < 0 ? ' gx-warn' : ''}">${plata(cierre)}</b><span>${cierre < 0 ? 'les faltaría' : 'les quedaría'}</span></div></div>
        <p class="gx-nota">${r.porPagar ? `Después de pagar los ${fmt(r.porPagar)} que faltan.` : 'Ya no hay pagos pendientes: lo que queda es de ustedes.'}</p></div></li>`;
    const hilo = `<section class="glass" style="--i:3">${titulo('El hilo de ' + esc(c.mes), `Día ${c.hoy} de ${N} · semana a semana`)}
      <ol class="gx-hilo">${nodos}${fin}</ol><p class="gx-say">${frase(r, vencidos, (S.moves || []).length > 0)}</p></section>`;

    const h = (S.hist || []).filter(x => x && Number.isFinite(x.out)).slice(-6).reverse().map(x => ({m: x.m, sv: pos(x.sv), g: Math.max(0, pos(x.out) - pos(x.sv))}));
    const mh = Math.max(1, ...h.map(x => x.g));
    const meses = h.length ? `<ol class="gx-hilo gx-hist">${h.map((x, k) => `<li class="gx-nd gx-past" style="--k:${k};--p:1" aria-label="${esc(mesLargo(x.m))}: gastaron ${fmt(x.g)} y ahorraron ${fmt(x.sv)}">
        ${k < h.length - 1 ? '<span class="gx-ln" aria-hidden="true"><i></i></span>' : ''}<span class="gx-pt" aria-hidden="true"></span>
        <div class="gx-nb"><div class="gx-nh"><div class="gx-nt"><b>${esc(mesLargo(x.m))}</b></div><div class="gx-nv"><b class="mono">${fmt(x.g)}</b><span>gastado</span></div></div>
          ${barra(x.g / mh, 'var(--a1)', k * 130 + 300)}${x.sv > 0 ? `<ul class="gx-hitos">${hito('ok', 'trend', 'Ahorro', 'guardado', x.sv)}</ul>` : ''}</div></li>`).join('')}</ol>`
      : vacio('clock', 'La historia empieza aquí', 'Cuando cierren este mes, quedará guardado como el primer nudo del hilo.');
    return hilo + `<section class="glass" style="--i:4">${titulo('Meses anteriores', h.length ? 'Lo que gastaron y lo que guardaron' : '')}${meses}</section>`;
  }

  function presupuestoHTML(c) {
    const P = porTipo(S.cats, S.moves, 6);
    if (!P.grupos.length) return `<section class="glass" style="--i:3">${titulo('Presupuesto de ' + esc(c.mes))}${vacio('target', 'Sin presupuesto todavía', 'Cuando pongan un tope a sus categorías, aquí verán cómo van.')}</section>`;
    const raw = P.b ? P.s / P.b : (P.s ? 1 : 0), pct = Math.round(raw * 100);
    const anillo = typeof ring === 'function' ? ring(num(raw), 92, 9, raw > 1 ? 'var(--alert)' : 'var(--a1)', raw > 1 ? 'var(--alert)' : 'var(--a3)', 'gxPr', `<b>${pct}%</b>`) : '';
    let ocultas = 0, k = 0;
    const grupos = P.grupos.map(g => {
      const filas = g.filas.filter(f => todas || P.rel.has(f.id) || g.k === 'ahorro'); ocultas += g.filas.length - filas.length;
      const rows = filas.map(f => {
        const over = !f.ah && f.raw > 1, casi = !f.ah && f.raw > .9, col = casi ? 'var(--alert)' : (tone[f.t] || tone.a1)[0], pt = f.b ? Math.min(999, Math.round(f.raw * 100)) + '%' : '—';
        const lbl = `${f.n}: ${fmt(f.s)} de ${fmt(f.b)}${f.b ? ', ' + pt : ''}${over ? ', se pasaron' : casi ? ', casi al tope' : ''}`;
        return `<div class="gx-row" role="group" aria-label="${esc(lbl)}"><span class="gx-nm" title="${esc(f.n)}">${esc(f.n)}</span>
          <span class="gx-fig mono"><b class="${casi ? 'gx-warn' : ''}">${fmt(f.s)}</b> / ${corto(f.b)}</span>
          <div class="gx-rb">${barra(f.raw, col, (k++) * 60)}<span class="mono gx-pc${casi ? ' gx-warn' : ''}">${pt}</span></div></div>`;
      }).join('');
      const n = g.filas.length;
      return `<div class="gx-grp"><div class="gx-gh"><h3>${g.n}<small>${plural(n, 'categoría', 'categorías')}</small></h3><span class="mono"><b>${corto(g.s)}</b> / ${corto(g.b)}</span></div>${rows}</div>`;
    }).join('');
    const boton = (ocultas || todas) && P.total > 6 ? `<button class="gx-more" data-gx-more aria-expanded="${todas}">${todas ? 'Ver solo las principales' : `Ver todas <span class="mono">(${ocultas} más)</span>`}</button>` : '';
    return `<section class="glass" style="--i:3">${titulo('Presupuesto de ' + esc(c.mes), 'Gastado / presupuesto, por tipo de gasto')}
      <div class="gx-tot">${anillo}<div class="gx-totx"><b class="mono">${fmt(P.s)}</b><span>gastado de <span class="mono">${fmt(P.b)}</span></span>
        <span class="pill ${P.alTope ? 'al' : 'ok'}">${P.alTope ? plural(P.alTope, 'categoría', 'categorías') + ' al tope' : 'Todo en orden'}</span></div></div>
      ${grupos}${boton}</section>`;
  }

  function pagosHTML(r, c) {
    const pays = S.pays || [];
    if (!pays.length) return `<section class="glass" style="--i:3">${titulo('Pagos de ' + esc(c.mes))}${vacio('repeat', 'Sin pagos recurrentes', 'Cuando agreguen el arriendo, el internet y compañía, aquí los verán en fila.')}<div class="gx-cta"><button class="btn acc" data-act="cuentas" data-id="pagos">${ic('plus')}Agregar pagos</button></div></section>${typeof Cuentas === 'object' ? Cuentas.resumenHTML() : ''}`;
    const hechos = pays.length - r.nPend, total = pays.reduce((a, p) => a + pos(p.a), 0), orden = [...pays].sort((a, b) => (!!a.paid - !!b.paid) || (num(a.d) - num(b.d)));
    const filas = typeof payRow === 'function' ? orden.map(payRow).join('') : '';
    return `<section class="glass" style="--i:3">${titulo('Pagos de ' + esc(c.mes), r.nPend ? 'Pendientes primero' : 'Todo al día. Qué descanso.')}
      <div class="gx-tot gx-col1"><div class="gx-totx"><span>Por pagar</span><b class="mono">${fmt(r.porPagar)}</b>
        <span class="pill ${r.nPend ? 'al' : 'ok'}">${hechos} de ${plural(pays.length, 'pago listo', 'pagos listos')}</span></div>
        ${barra(total ? (total - r.porPagar) / total : 0, 'var(--ok)', 200)}</div>
      <div class="list gx-list">${filas}</div><div class="gx-cta"><button class="btn ghost" data-act="cuentas" data-id="pagos">${ic('edit')}Editar pagos</button><button class="btn ghost" data-act="cuentas" data-id="soportes">${ic('clip')}Comprobantes</button></div></section>${typeof Cuentas === 'object' ? Cuentas.resumenHTML() : ''}`;
  }

  function movimientosHTML(c) {
    const dias = porDia(S.moves, c.N, 10), ah = idsAhorro(S.cats), reg = `<button class="btn acc gx-reg" data-act="open">${ic('plus')}Registrar</button>`;
    if (!dias.length) return `<section class="glass" style="--i:3">${titulo('Movimientos')}${vacio('clock', 'Aún no hay movimientos', 'El primero siempre es el más difícil. Después el hilo se teje solo.')}<div class="gx-cta">${reg}</div></section>`;
    const n = dias.reduce((a, d) => a + d.items.length, 0), tot = (S.moves || []).length;
    const lista = dias.map(d => {
      const et = d.d === c.hoy ? 'Hoy' : d.d === c.hoy - 1 ? 'Ayer' : '';
      const rows = d.items.map(m => { const k = (S.cats || []).find(x => x.id === m.cat) || {i: 'wallet', t: 'mu', n: 'Sin categoría'}, sv = ah.has(m.cat);
        return `<div class="row">${tile(k.i || 'wallet', tono(sv ? 'ok' : k.t))}<div style="min-width:0"><div class="t" title="${esc(m.n)}">${esc(m.n)}</div><span class="sub">${esc(k.n)}</span></div>
          <div class="r">${m.w && typeof Avatares === 'object' ? Avatares.head(m.w === 'D' ? 'D' : 'V', 26, 'happy') : ''}<span class="amt">${sv ? '' : '−'}${fmt(pos(m.a))}</span></div></div>`; }).join('');
      return `<div class="gx-day"><h3>${et ? et + ' · ' : ''}${d.d} ${esc(c.mesC)}</h3><span class="mono">${fmt(d.tot)}</span></div><div class="list gx-list">${rows}</div>`;
    }).join('');
    return `<section class="glass" style="--i:3">${titulo('Movimientos', tot > n ? `Los últimos ${n} de ${tot}` : plural(n, 'movimiento este mes', 'movimientos este mes'))}
      <div class="gx-cta">${reg}</div>${lista}</section>`;
  }

  function seccion() {
    const c = calendario(), r = resumen(S);
    try { return tab === 'presupuesto' ? presupuestoHTML(c) : tab === 'pagos' ? pagosHTML(r, c) : tab === 'movimientos' ? movimientosHTML(c) : avanceHTML(r, c); }
    catch (e) { if (typeof console !== 'undefined') console.error('Rumbo:', e); return `<section class="glass">${vacio('info', 'Esta sección se enredó', 'Sus datos siguen guardados. Prueben otra pestaña.')}</section>`; }
  }

  // ---------- API ----------
  // Contenido completo de Finanzas bajo el título
  function page() {
    try {
      const c = calendario(), r = resumen(S);
      const tabs = TABS.map(([id, t, i]) => `<button class="gx-tab" data-gx-tab="${id}" aria-pressed="${tab === id}">${ic(i)}<span>${t}</span></button>`).join('');
      return `<div class="gx-page">${resumenHTML(r, c)}
        <div class="gx-tabs rv" style="--i:2" role="group" aria-label="Secciones de Finanzas">${tabs}</div>
        <div class="gx-panel" role="region" aria-label="${(TABS.find(x => x[0] === tab) || TABS[0])[1]}">${seccion()}</div></div>`;
    } catch (e) { if (typeof console !== 'undefined') console.error('Rumbo:', e); return ''; }
  }
  // Re-pintado propio de la sección (sin recargar la vista). `quieto` = sin animación de entrada
  function pinta(pg, quieto) {
    const panel = pg.querySelector('.gx-panel'); if (!panel) return;
    pg.classList.toggle('gx-still', !!quieto);
    panel.classList.toggle('gx-sw', !quieto);
    panel.setAttribute('aria-label', (TABS.find(x => x[0] === tab) || TABS[0])[1]);
    panel.innerHTML = seccion();
    pg.classList.add('gx-go');
    pg.querySelectorAll('[data-gx-tab]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.gxTab === tab)));
  }
  // Un solo listener global para segmentos y «Ver todas» (no se acumula por render)
  if (typeof document !== 'undefined') document.addEventListener('click', e => {
    const t = e.target && e.target.closest ? e.target.closest('[data-gx-tab],[data-gx-more]') : null; if (!t) return;
    const pg = t.closest('.gx-page'); if (!pg) return;
    if (t.hasAttribute('data-gx-more')) { todas = !todas; pinta(pg, true); const b = pg.querySelector('[data-gx-more]'); if (b) b.focus(); return; }
    const id = t.dataset.gxTab; if (id === tab || !TABS.some(x => x[0] === id)) return;
    tab = id; pinta(pg, false);
  });

  function html() {
    try {
      const lista = gastoPorCat(S.cats, S.moves);
      return `<div class="gfx">${dona(lista, 8)}${barras(lista, 9)}${ritmo(10)}${tendencia(11)}<div class="gx-tip" role="status" aria-live="polite" hidden></div></div>`;
    } catch (e) { return ''; }
  }

  function after(root) {
    const pg = (root || document).querySelector('.gx-page');
    if (pg) {
      // Solo se anima al entrar a la vista; si la app redibuja por una acción (pagar, registrar), queda quieta
      if (root && root.classList && !root.classList.contains('enter')) pg.classList.add('gx-still');
      requestAnimationFrame(() => requestAnimationFrame(() => pg.classList.add('gx-go')));
    }
    const g = (root || document).querySelector('.gfx');
    if (!g) return;
    const tip = g.querySelector('.gx-tip');
    const show = (el, txt, cx) => {
      if (!tip || !txt) return;
      tip.textContent = txt; tip.hidden = false;
      const gb = g.getBoundingClientRect(), eb = el.getBoundingClientRect(), tw = tip.offsetWidth;
      const x = (cx == null ? eb.left + eb.width / 2 : cx) - gb.left;
      tip.style.left = Math.max(4, Math.min(gb.width - tw - 4, x - tw / 2)) + 'px';
      tip.style.top = Math.max(0, eb.top - gb.top - tip.offsetHeight - 8) + 'px';
    };
    const hide = () => { if (tip) tip.hidden = true; };
    g.querySelectorAll('[data-tip]').forEach(el => {
      if (el.classList.contains('gx-line')) return;
      el.addEventListener('pointerenter', () => show(el, el.getAttribute('data-tip')));
      el.addEventListener('focus', () => show(el, el.getAttribute('data-tip')));
      el.addEventListener('pointerleave', hide); el.addEventListener('blur', hide);
      el.addEventListener('click', () => show(el, el.getAttribute('data-tip')));
    });
    const ln = g.querySelector('.gx-line');
    if (ln) {
      const N = +ln.dataset.n, hoy = +ln.dataset.hoy;
      ln.addEventListener('focus', () => show(ln, ln.dataset.tip));
      ln.addEventListener('blur', hide); ln.addEventListener('pointerleave', hide);
      ln.addEventListener('pointermove', e => { const b = ln.getBoundingClientRect(); if (b.width) { const d = Math.min(hoy, Math.max(1, Math.round(((e.clientX - b.left) / b.width * 320 - 8) / 304 * (N - 1)) + 1)); show(ln, d === hoy ? ln.dataset.tip : 'Día ' + d, e.clientX); } });
    }
    document.addEventListener('keydown', function esc1(e) { if (!g.isConnected) return document.removeEventListener('keydown', esc1); if (e.key === 'Escape') hide(); });
    requestAnimationFrame(() => requestAnimationFrame(() => g.classList.add('gx-go')));
  }

  return {page, html, after, pure: {resumen, semanas, porTipo, porDia}};
})();

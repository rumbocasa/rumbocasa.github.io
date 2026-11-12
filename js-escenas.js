/* Rumbo · Escenas (v2.0). Ilustraciones vivas para metas y proyectos (SVG + CSS, solo transform/opacity/offset):
   - Cada meta tiene su paisaje según su ícono: el avión vuela (viaje), la casita titila (casa), el carro rueda,
     la cama duerme bajo la luna, el regalo rebota, las monedas brillan. Un camino punteado con una marca que avanza
     hasta el % ahorrado: la meta como un recorrido.
   - Si la meta tiene portada (foto del planeador), se usa la foto.
   - Escenas.goalCard reemplaza la tarjeta de meta: toda la portada abre la meta y su planificación.
   - Escenas.hoy() pinta las tarjetas inteligentes de Inicio (de Aprende.tarjetas). */
const Escenas = (function () {
  'use strict';
  const RUTA = 'M-10 132 C 60 112, 110 128, 160 118 S 260 100, 330 108';
  // Punto del camino a cierta fracción (la marca vive dentro del SVG para escalar igual en cualquier tamaño)
  const SEG = [[[-10, 132], [60, 112], [110, 128], [160, 118]], [[160, 118], [210, 108], [260, 100], [330, 108]]];
  const bez = (s, t) => { const u = 1 - t; return [0, 1].map(k => u * u * u * s[0][k] + 3 * u * u * t * s[1][k] + 3 * u * t * t * s[2][k] + t * t * t * s[3][k]); };
  function punto(f) { const x = -10 + 340 * Math.max(.03, Math.min(.97, f)); let best = [x, 120], d = 1e9; SEG.forEach(sg => { for (let i = 0; i <= 60; i++) { const p = bez(sg, i / 60), e = Math.abs(p[0] - x); if (e < d) { d = e; best = p; } } }); return best; }
  function motivo(i) {
    if (i === 'plane') return `<g class="esc-fly"><g transform="translate(0 0)"><path d="M0 0 L26 -4 L36 -12 L40 -11 L34 -2 L44 0 L34 2 L40 11 L36 12 L26 4 Z" fill="#fff"/><path d="M8 0 h-22" stroke="#fff" stroke-width="1.5" stroke-dasharray="3 4" opacity=".7"/></g></g>`;
    if (i === 'car') return `<g class="esc-car"><rect x="196" y="98" width="62" height="18" rx="7" fill="#fff"/><path d="M208 98 L218 86 H240 L250 98 Z" fill="#fff" opacity=".9"/><path d="M220 88 H238 L244 97 H214 Z" fill="var(--g1)" opacity=".5"/><g class="esc-wheel" style="transform-origin:212px 117px"><circle cx="212" cy="117" r="7" fill="#26324a"/><path d="M212 111 V123 M206 117 H218" stroke="#fff" stroke-width="1.5"/></g><g class="esc-wheel" style="transform-origin:244px 117px"><circle cx="244" cy="117" r="7" fill="#26324a"/><path d="M244 111 V123 M238 117 H250" stroke="#fff" stroke-width="1.5"/></g></g>`;
    if (i === 'bed') return `<g><path d="M196 104 v-18 a6 6 0 0 1 6 -6 h44 a8 8 0 0 1 8 8 v16" fill="#fff"/><rect x="190" y="102" width="70" height="12" rx="5" fill="#fff"/><rect x="200" y="88" width="18" height="10" rx="5" fill="var(--g0)" opacity=".55"/><path d="M190 114 v8 M260 114 v8" stroke="#fff" stroke-width="4" stroke-linecap="round"/><text class="esc-z" x="232" y="76" fill="#fff" font-size="14" font-weight="700">z</text><text class="esc-z z2" x="244" y="66" fill="#fff" font-size="11" font-weight="700">z</text></g>`;
    if (i === 'gift' || i === 'bag') return `<g class="esc-hop" style="transform-origin:226px 118px"><rect x="204" y="86" width="44" height="34" rx="6" fill="#fff"/><rect x="200" y="78" width="52" height="12" rx="4" fill="#fff"/><rect x="222" y="78" width="8" height="42" fill="var(--g0)" opacity=".7"/><path d="M226 78 C 214 64, 206 76, 226 78 C 246 76, 238 64, 226 78" fill="none" stroke="var(--g0)" stroke-width="3"/></g><g class="esc-spark"><path d="M268 70 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3z" fill="#fff"/></g>`;
    if (i === 'trend' || i === 'coin') return `<g class="esc-coins">${[0, 1, 2, 3].map(k => `<ellipse cx="226" cy="${116 - k * 8}" rx="18" ry="6" fill="#FFE08A" stroke="#C98A1C" stroke-width="1.5"/>`).join('')}</g><g class="esc-spark"><path d="M254 70 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3z" fill="#fff"/></g>`;
    if (i === 'key' || i === 'home') return `<g><path d="M200 96 L226 74 L252 96 V120 H200 Z" fill="#fff"/><path d="M196 98 L226 70 L256 98" fill="none" stroke="var(--g1)" stroke-width="5" stroke-linejoin="round" opacity=".75"/><rect class="esc-win" x="208" y="100" width="12" height="11" rx="2" fill="#FFD36E"/><path d="M232 120 V106 a5 5 0 0 1 10 0 V120" fill="var(--g1)" opacity=".6"/><g class="esc-smoke"><circle cx="244" cy="66" r="4" fill="#fff" opacity=".6"/><circle cx="249" cy="58" r="5" fill="#fff" opacity=".4"/></g><rect x="240" y="72" width="7" height="12" fill="#fff"/></g>`;
    return `<g class="esc-flag" style="transform-origin:226px 118px"><path d="M226 120 V70" stroke="#fff" stroke-width="3" stroke-linecap="round"/><path class="esc-wave" d="M228 72 C 240 66, 250 78, 262 72 V92 C 250 98, 240 86, 228 92 Z" fill="#fff"/></g>`;
  }
  // Paisaje de una meta (sin foto)
  function escena(g, pct, ancho) {
    const id = 'e' + String(g.id).replace(/[^a-z0-9]/gi, ''), noche = g.i === 'bed';
    const W = ancho ? 180 : 0; // panorámica: 180 unidades más a cada lado para portadas anchas
    return `<svg class="esc" viewBox="${-W} 0 ${320 + 2 * W} 150" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <defs><linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:color-mix(in srgb,var(--g0) ${noche ? '35%,#0b1736' : '45%,#ffffff'})"/><stop offset="1" style="stop-color:color-mix(in srgb,var(--g1) 70%,${noche ? '#1b2550' : '#ffffff'})"/></linearGradient></defs>
      <rect x="${-W}" width="${320 + 2 * W}" height="150" fill="url(#${id}s)"/>
      ${W ? `<g class="esc-cloud c2"><ellipse cx="-90" cy="44" rx="30" ry="9" fill="#fff" opacity="${noche ? .15 : .7}"/><ellipse cx="420" cy="36" rx="34" ry="10" fill="#fff" opacity="${noche ? .15 : .7}"/></g><path d="M${-W} 96 C -120 84, -50 102, 0 104 V150 H${-W}Z M320 86 C 380 74, 440 98, ${320 + W} 92 V150 H320Z" fill="var(--g1)" opacity=".38"/>` : ''}
      ${noche ? `<circle class="esc-sun" cx="70" cy="44" r="18" fill="#FFF6D8"/><circle cx="78" cy="38" r="16" fill="color-mix(in srgb,var(--g0) 35%,#0b1736)"/>${[[120, 26], [168, 46], [260, 30], [300, 58], [210, 18]].map(([x, y], k) => `<circle class="esc-star" style="animation-delay:${k * .4}s" cx="${x}" cy="${y}" r="1.8" fill="#fff"/>`).join('')}`
        : `<g class="esc-sun"><circle cx="262" cy="46" r="30" fill="#FFF6D8" opacity=".35"/><circle cx="262" cy="46" r="19" fill="#FFF3C4"/></g><g class="esc-cloud"><ellipse cx="70" cy="40" rx="26" ry="9" fill="#fff" opacity=".85"/><ellipse cx="88" cy="34" rx="15" ry="9" fill="#fff" opacity=".85"/></g><g class="esc-cloud c2"><ellipse cx="170" cy="58" rx="20" ry="7" fill="#fff" opacity=".6"/></g>`}
      <path d="M0 104 C 70 80, 130 100, 190 88 S 290 74, 320 86 V150 H0Z" fill="var(--g1)" opacity=".38"/>
      ${motivo(g.i)}
      <path d="M0 124 C 60 106, 120 128, 175 116 S 270 100, 320 110 V150 H0Z" fill="var(--g0)" opacity=".62"/>
      ${W ? `<path d="M${-W} 126 C -120 114, -40 130, 0 124 V150 H${-W}Z M320 110 C 380 100, 440 124, ${320 + W} 116 V150 H320Z" fill="var(--g0)" opacity=".62"/>` : ''}
      <path class="esc-ruta" d="${RUTA}" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="2 7" opacity=".9"/>
      ${(() => { const [x, y] = punto(pct); return `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)})"><g class="esc-pin"><path d="M0 0 C -9 -10, -9 -22, 0 -22 C 9 -22, 9 -10, 0 0 Z" fill="#fff" stroke="var(--g0)" stroke-width="3"/><circle cx="0" cy="-14" r="3.5" fill="var(--g0)"/></g></g>`; })()}
    </svg>`;
  }

  // Tarjeta de meta: la portada entera abre la meta y su planificación
  function goalCard(g, i, big) {
    const pct = g.open ? 0 : Math.min(1, g.t ? g.s / g.t : 0), m = g.by ? monthsTo(g.by) : 1;
    const cover = typeof MetaPlan === 'object' && MetaPlan.coverSrc ? MetaPlan.coverSrc(g) : '';
    const dias = g.by ? Math.ceil((new Date(g.by.getFullYear(), g.by.getMonth(), g.by.getDate()) - new Date(new Date().toDateString())) / 864e5) : null;
    const add = g.m && g.m !== 100000 ? g.m : 0, pasos = g.plan && g.plan.itin ? g.plan.itin : [], hechos = pasos.filter(x => x.done).length;
    return `<article class="glass gv${big ? ' big' : ''}" style="--i:${i};--g0:${g.c[0]};--g1:${g.c[1]};--pp:${pct}">
      <button class="gv-hero" data-act="plan" data-id="${esc(g.id)}" aria-label="Abrir ${esc(g.n)} y su planificación">
        ${cover ? `<img class="gv-img" src="${cover}" alt="">` : escena(g, pct)}
        <span class="gv-shade"></span>
        <span class="gv-badge">${ic(g.i)}</span>
        ${dias !== null ? `<span class="gv-when">${ic('clock')}${dias > 1 ? `faltan ${dias} días` : dias === 1 ? 'es mañana' : dias === 0 ? '¡es hoy!' : 'fecha pasada'}</span>` : ''}
        <span class="gv-open">Abrir plan${ic('arrow')}</span>
      </button>
      <div class="gv-body">
        <div class="gv-row"><h3 class="gv-nm">${esc(g.n)}</h3>${g.open ? '' : `<b class="gv-pct">${Math.round(pct * 100)}<small>%</small></b>`}</div>
        <div class="gv-money"><b>${fmt(g.s)}</b><span>${g.open ? 'acumulados' : 'de ' + fmt(g.t)}</span>${pasos.length ? `<span class="gv-steps">${ic('check')}${hechos}/${pasos.length} del plan</span>` : ''}</div>
        ${g.open ? '' : `<div class="gv-bar" role="img" aria-label="${Math.round(pct * 100)} % ahorrado"><i></i></div>`}
        <p class="gv-sug">${goalPace(g, m)}</p>
        <div class="gv-acts"><button class="btn ghost" data-act="abono" data-id="${esc(g.id)}" data-a="100000">${ic('plus')}$100.000</button>${add ? `<button class="btn acc" data-act="abono" data-id="${esc(g.id)}" data-a="${add}">${ic('plus')}${fmt(add)}</button>` : ''}<button class="btn pri" data-act="plan" data-id="${esc(g.id)}">${ic('spark')}Planear</button></div>
      </div></article>`;
  }

  // Tarjetas de "Hoy" en Inicio
  function hoy() {
    if (typeof Aprende !== 'object') return '';
    const cs = Aprende.tarjetas(S, new Date(), S.profile), name = S.profile === 'D' ? 'David' : 'Vale';
    const btn = c => c.act === 'go' ? `<a class="btn ${c.p >= 80 ? 'pri' : 'ghost'}" href="#${c.id}">${c.label}${ic('arrow')}</a>` : `<button class="btn ${c.p >= 80 ? 'pri' : 'ghost'}" data-act="${c.act}" data-id="${esc(c.id)}">${c.label}</button>`;
    return `<section class="hoy rv" style="--i:1" aria-label="Lo de hoy"><div class="hoy-h"><h2>${ic('spark')}Lo de hoy, ${esc(name)}</h2><span class="hoy-s">Rumbo lo ordenó por urgencia</span></div>
      <div class="hoy-row">${cs.map((c, k) => `<article class="hoy-c t-${c.t}" style="--k:${k}">${tile(c.i, c.t)}<div class="hoy-tx"><b>${esc(c.titulo)}</b><span>${esc(c.texto)}</span></div>${btn(c)}</article>`).join('')}</div></section>`;
  }
  // Nota rápida desde Inicio (va a Apuntes)
  const notaRapida = () => `<form class="glass hoy-nota rv" id="hoyNota" style="--i:7" autocomplete="off">${tile('chat', 'a1')}<input id="hoyNotaTx" maxlength="300" placeholder="¿Algo que no se les olvide? Escríbanlo aquí" aria-label="Escribir en Apuntes"><button class="btn pri" type="submit">${ic('send')}<span>Guardar</span></button></form>`;

  return {escena, goalCard, hoy, notaRapida};
})();

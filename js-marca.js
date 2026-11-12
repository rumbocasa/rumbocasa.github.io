/* Rumbo · Marca. Logo "Valle al atardecer" (Opción 4) con casita en la loma, y logotipo D "Chewy con corazón",
   copiados de docs/diseno/marca-opciones-v8.html. Paleta "Atardecer paisa" en estilos.css (--br-*).
   Solo genera SVG/HTML; no depende de app.js. Expone window.Marca. */
const Marca = (function () {
  let uidN = 0;
  const uidify = s => { uidN++; return s.split('§').join('m' + uidN + '_'); };

  /* Degradados y sombra compartidos del logo */
  const DEFS = '<defs>' +
    '<linearGradient id="§d" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--br-c3)"/><stop offset="1" style="stop-color:var(--br-dk)"/></linearGradient>' +
    '<radialGradient id="§g" cx=".5" cy=".42" r=".62"><stop offset="0" stop-color="#FFF8DC"/><stop offset=".55" style="stop-color:var(--br-c1)"/><stop offset="1" style="stop-color:var(--br-c2)"/></radialGradient>' +
    '<filter id="§f" x="-25%" y="-25%" width="150%" height="160%"><feDropShadow dx="0" dy="2.5" stdDeviation="2.2" flood-color="#3a1a08" flood-opacity=".32"/></filter>' +
    '</defs>';

  /* v0.8 · Logo simplificado (menos saturado): cielo, sol que respira detrás de la casa, una loma atrás y una adelante.
     Casita centrada: techo terracota, una ventana encendida que titila y puerta en arco. Sin chimenea ni lucecitas. */
  const HOUSE = '<g class="an" style="--k:lg-rise;--dl:.55s"><g transform="translate(30 47) scale(.4)">' +
    '<rect x="24" y="46" width="52" height="40" rx="7" fill="url(#§h)"/>' +
    '<path d="M14 50L46 22Q50 18.5 54 22L86 50Q88 53 84.5 53H15.5Q12 53 14 50Z" fill="url(#§t)"/>' +
    '<rect class="win" x="31" y="59" width="13" height="13" rx="3.5" fill="#FFD36E"/>' +
    '<path d="M55 86V70Q55 63.5 61.5 63.5Q68 63.5 68 70V86Z" fill="var(--br-dk)"/></g></g>';

  const BODY = '<defs><clipPath id="§c"><circle cx="50" cy="50" r="44"/></clipPath>' +
    '<linearGradient id="§k" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--br-s1)"/><stop offset="1" style="stop-color:var(--br-c1)"/></linearGradient>' +
    '<linearGradient id="§h" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFBF3"/><stop offset="1" stop-color="#FFEBC6"/></linearGradient>' +
    '<linearGradient id="§t" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--br-s2)"/><stop offset="1" stop-color="#A8324C"/></linearGradient></defs>' +
    '<g filter="url(#§f)"><circle cx="50" cy="50" r="44" fill="url(#§k)"/><g clip-path="url(#§c)">' +
    '<g class="an" style="--k:lg-rise;--dl:.15s"><circle class="halo" cx="50" cy="44" r="25" fill="#FFF6DC" opacity=".35"/><circle class="sunb" cx="50" cy="44" r="17" fill="url(#§g)"/></g>' +
    '<path class="an" style="--k:lg-rise;--dl:.3s" d="M0 66Q28 52 54 62T100 58V100H0Z" fill="var(--br-s2)" opacity=".42"/>' +
    HOUSE +
    '<path class="an" style="--k:lg-rise;--dl:.42s" d="M0 80Q25 70 50 76T100 73V100H0Z" fill="url(#§d)"/></g>' +
    '<circle cx="50" cy="50" r="43" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="2"/></g>';

  const mark = label => uidify('<svg viewBox="0 0 100 100" role="img" aria-label="' + (label || 'Rumbo: valle al atardecer con su casita') + '">' + DEFS + BODY + '</svg>');

  /* Ícono de app: baldosa oscura cálida con el valle adentro */
  function icon(px) {
    return uidify('<svg viewBox="0 0 100 100" width="' + px + '" height="' + px + '" role="img" aria-label="Ícono de Rumbo">' + DEFS +
      '<linearGradient id="§i" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--br-ib1)"/><stop offset="1" style="stop-color:var(--br-ib2)"/></linearGradient>' +
      '<radialGradient id="§w" cx=".5" cy="0" r=".9"><stop offset="0" style="stop-color:var(--br-c2);stop-opacity:.55"/><stop offset="1" style="stop-color:var(--br-c2);stop-opacity:0"/></radialGradient>' +
      '<rect width="100" height="100" rx="22.5" fill="url(#§i)"/><rect width="100" height="100" rx="22.5" fill="url(#§w)"/>' +
      '<rect x=".75" y=".75" width="98.5" height="98.5" rx="21.8" fill="none" stroke="#fff" stroke-opacity=".18" stroke-width="1.5"/>' +
      '<g transform="translate(10 10) scale(.8)">' + BODY + '</g></svg>');
  }

  /* La "o" es un corazón */
  const heart = () => uidify('<svg class="og" viewBox="0 0 40 40" aria-hidden="true"><defs><linearGradient id="§r" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--br-s1)"/><stop offset="1" style="stop-color:var(--br-s2)"/></linearGradient></defs><path d="M20 36C3 25 5 8 13 8C17 8 20 11 20 14C20 11 23 8 27 8C35 8 37 25 20 36Z" fill="url(#§r)"/></svg>');

  /* Logotipo D: Chewy saltarín, cada letra con su color e inclinación */
  const word = () => '<span class="lgw d" role="img" aria-label="Rumbo">' +
    ['R', 'u', 'm', 'b'].map((c, i) => `<span class="l l${i + 1}" style="--i:${i}" aria-hidden="true">${c}</span>`).join('') +
    '<span class="l lh" style="--i:4" aria-hidden="true">' + heart() + '</span></span>';

  /* Logo + logotipo juntos (encabezado) */
  const lockup = () => '<span class="mk">' + mark() + '</span>' + word();

  /* Reproduce la animación de entrada del logo y del logotipo */
  function play(el) {
    if (!el) return;
    el.classList.remove('play'); void el.offsetWidth; el.classList.add('play');
    clearTimeout(el._pt); el._pt = setTimeout(() => el.classList.remove('play'), 3400);
  }

  /* Rellena los espacios de marca de la página: encabezado, pantalla de ingreso y hoja de «acerca de» */
  function mount() {
    const hd = document.getElementById('brandHd'); if (hd) hd.innerHTML = lockup();
    const g = document.getElementById('gateBrand');
    if (g) g.innerHTML = '<span class="mk big">' + mark() + '</span>' + word() + '<span class="tagl">de a dos pa\' la casa</span>';
  }

  return {mark, icon, word, heart, lockup, play, mount};
})();
Marca.mount();

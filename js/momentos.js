/* Rumbo · Momentos. Lógica PURA (sin DOM) de los momentos que disparan frases:
   visitas y racha, vuelta tras ausencia, día sin gastos, presupuesto superado y logros.
   Todo se calcula con datos reales del estado; no inventa nada. Montos como enteros. */
const Momentos = (function () {
  'use strict';
  const pad = n => String(n).padStart(2, '0');
  const dayKey = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const parseKey = k => { const [y, m, d] = String(k).split('-').map(Number); return new Date(y, m - 1, d); };
  const diffDays = (a, b) => Math.round((parseKey(b) - parseKey(a)) / 864e5);
  const validKey = k => typeof k === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(k);

  /* Visita de hoy. `last` = día de la última visita (o null), `streak` = racha guardada.
     Devuelve la nueva racha, los días desde la última visita (away) y si es un día nuevo. */
  function visit(last, streak, todayK) {
    const s = Math.max(0, Math.round(+streak) || 0);
    if (!validKey(last)) return {last: todayK, streak: Math.max(1, s), away: 0, newDay: true, prev: null};
    const g = diffDays(last, todayK);
    if (g < 0) return {last, streak: s, away: 0, newDay: false, prev: last};
    if (g === 0) return {last, streak: Math.max(1, s), away: 0, newDay: false, prev: last};
    return {last: todayK, streak: g === 1 ? s + 1 : 1, away: g, newDay: true, prev: last};
  }
  /* ¿Cuántos días dicen «volvieron»? Desde 3 días sin entrar */
  const isReturn = away => away >= 3;

  /* Día sin gastos: entraron ayer y ayer no hay gastos registrados (sin contar ahorro).
     El día 1 se excluye porque ahí caen los gastos previos a Rumbo. */
  function sinGastoAyer(moves, prevKey, todayK) {
    if (!validKey(prevKey) || diffDays(prevKey, todayK) !== 1) return false;
    const y = parseKey(prevKey), t = parseKey(todayK);
    if (y.getMonth() !== t.getMonth() || y.getDate() < 2) return false;
    return !moves.some(m => m.d === y.getDate() && m.cat !== 'ahorro');
  }

  /* Presupuesto superado: lo gastado (sin ahorro) menos lo presupuestado (sin ahorro); 0 si no se pasan */
  function overBy(cats, moves) {
    const sv = new Set(cats.filter(c => c.saving).map(c => c.id));
    const pres = cats.filter(c => !c.saving).reduce((a, c) => a + c.b, 0);
    const gast = moves.filter(m => !sv.has(m.cat)).reduce((a, m) => a + m.a, 0);
    return pres > 0 ? Math.max(0, gast - pres) : 0;
  }

  /* Logros: se calculan desde el estado. Una vez desbloqueado, queda desbloqueado. */
  const CATALOGO = [
    {id: 'primer-pago', n: 'Primer pago', d: 'Pagaron juntos su primer recibo', i: 'coin', need: 1, val: st => st.pays.filter(p => p.paid).length},
    {id: 'casa-3', n: 'Casa en marcha', d: 'Tres tareas de la casa hechas', i: 'check', need: 3, val: st => st.tasks.filter(t => t.done).length},
    {id: 'primer-abono', n: 'Primer abono', d: 'Le sumaron a una meta de ahorro', i: 'target', need: 1, val: st => st.moves.filter(m => m.cat === 'ahorro' && /^Abono/.test(m.n)).length},
    {id: 'cuentas-5', n: 'Cuentas claras', d: 'Cinco movimientos anotados en Rumbo', i: 'wallet', need: 5, val: st => st.moves.filter(m => m.n !== 'Gastado antes de Rumbo').length},
    {id: 'racha-3', n: 'Tres días seguidos', d: 'Abrieron Rumbo tres días seguidos', i: 'flame', need: 3, val: st => st.streak},
    {id: 'racha-7', n: 'Una semana juntos', d: 'Siete días seguidos en Rumbo', i: 'flame', need: 7, val: st => st.streak},
    {id: 'puntos-100', n: 'Nivel 2', d: 'Llegaron a 100 puntos entre los dos', i: 'star', need: 100, val: st => st.pts.V + st.pts.D}
  ];
  /* Devuelve la lista nueva y cuáles se desbloquearon ahora (frente a la lista guardada `prev`) */
  function badgesFrom(prev, st) {
    const was = new Map((Array.isArray(prev) ? prev : []).map(b => [b.id, !!b.on]));
    const list = CATALOGO.map(c => { const v = Math.max(0, c.val(st)), on = was.get(c.id) || v >= c.need; return {id: c.id, n: c.n, d: c.d, i: c.i, on, prog: [Math.min(v, c.need), c.need]}; });
    return {list, fresh: list.filter(b => b.on && !was.get(b.id))};
  }

  return {dayKey, validKey, visit, isReturn, sinGastoAyer, overBy, badgesFrom, CATALOGO};
})();

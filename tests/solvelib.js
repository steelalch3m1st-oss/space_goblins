/* Спільна бібліотека генерації прохідних планів (витягнуто з solve.js). */
function edges(tasks, env) {
  const ids = new Set(tasks.map(t => t.id)); const out = [];
  const isOut = t => { const z = env.zones[t.z]; return !!(z && z.out); };
  const eg = tasks.find(t => t.egress), ing = tasks.find(t => t.ingress);
  for (const t of tasks) {
    for (const r of t.after || []) if (ids.has(r)) out.push([r, t.id]);
    for (const r of t.before || []) if (ids.has(r)) out.push([t.id, r]);
    if (t.gap && ids.has(t.gap.ref)) out.push([t.gap.ref, t.id]);
    if (t.within && ids.has(t.within.ref)) out.push([t.within.ref, t.id]);
    if (t.last) for (const o of tasks) if (o.id !== t.id) out.push([o.id, t.id]);
    if (eg && isOut(t) && t.id !== eg.id) out.push([eg.id, t.id]);
    if (ing && isOut(t) && t.id !== ing.id) out.push([t.id, ing.id]);
  }
  if (eg && ing) out.push([eg.id, ing.id]);
  return out;
}
function reach(ids, es) {
  const m = {}; ids.forEach(i => m[i] = new Set());
  es.forEach(([u, v]) => m[u] && m[u].add(v));
  let ch = true;
  while (ch) { ch = false; for (const u of ids) for (const v of [...m[u]]) for (const w of m[v] || []) if (!m[u].has(w)) { m[u].add(w); ch = true; } }
  return m;
}
function topo(ids, es, r) {
  const indeg = {}, adj = {};
  ids.forEach(i => { indeg[i] = 0; adj[i] = []; });
  es.forEach(([u, v]) => { if (indeg[v] != null && adj[u]) { adj[u].push(v); indeg[v]++; } });
  const ready = ids.filter(i => !indeg[i]), order = [];
  while (ready.length) { const k = Math.floor(r() * ready.length), n = ready.splice(k, 1)[0]; order.push(n); for (const v of adj[n]) if (--indeg[v] === 0) ready.push(v); }
  return order.length === ids.length ? order : null;
}
function candidate(day, r, pExtra) {
  const env = day.env;
  const req = day.tasks.filter(t => t.k === 'main' || t.k === 'life' || (t.k === 'extra' && r() < pExtra));
  const ids = req.map(t => t.id); const es = edges(req, env);
  const isOut = t => { const z = env.zones[t.z]; return !!(z && z.out); };
  const eg = req.find(t => t.egress), ing = req.find(t => t.ingress);
  if (!eg || !ing) return topo(ids, es, r);
  const R = reach(ids, es);
  const outIds = req.filter(isOut).map(t => t.id);
  const inner = new Set([eg.id, ing.id, ...outIds]);
  const before = [], after = [];
  for (const t of req) {
    if (inner.has(t.id)) continue;
    const z = env.zones[t.z] || {};
    if (z.lock || t.z === 'ANY') { if (r() < 0.5) { before.push(t.id); continue; } }
    if (R[t.id] && [...inner].some(i => R[t.id].has(i))) before.push(t.id);
    else if ([...inner].some(i => R[i] && R[i].has(t.id))) after.push(t.id);
    else (r() < 0.5 ? before : after).push(t.id);
  }
  const sub = list => topo(list, es.filter(([u, v]) => list.includes(u) && list.includes(v)), r);
  const a = sub(before), b = sub([eg.id, ...outIds, ing.id]), c = sub(after);
  return (a && b && c) ? [...a, ...b, ...c] : null;
}
module.exports = { edges, reach, topo, candidate };

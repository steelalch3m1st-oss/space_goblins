/* Перевірка прохідності: чи для кожної комбінації «місія + день + ускладнення»
   у ПОТОЧНОМУ index.html існує хоча б один порядок завдань, який проходить
   двигун без зламу.

   Шукаємо випадковим перебором із урахуванням обмежень: топологічне сортування
   за залежностями, блок «назовні» між виходом і поверненням, фіксований час.
   Беремо лише обов'язкові завдання й побут — додаткові домішуємо поступово,
   бо інколи вони необхідні (з'їдають час і відсувають задачу за вікно мовчання). */

const { extractEngine } = require('./extract-engine.js');
const E = require(extractEngine());

const rng = s => () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };

function edges(tasks, env) {
  const ids = new Set(tasks.map(t => t.id));
  const out = [];
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
  while (ch) {
    ch = false;
    for (const u of ids) for (const v of [...m[u]]) for (const w of m[v] || []) if (!m[u].has(w)) { m[u].add(w); ch = true; }
  }
  return m;
}

function topo(ids, es, r) {
  const indeg = {}, adj = {};
  ids.forEach(i => { indeg[i] = 0; adj[i] = []; });
  es.forEach(([u, v]) => { if (indeg[v] != null && adj[u]) { adj[u].push(v); indeg[v]++; } });
  const ready = ids.filter(i => !indeg[i]), order = [];
  while (ready.length) {
    const k = Math.floor(r() * ready.length), n = ready.splice(k, 1)[0];
    order.push(n);
    for (const v of adj[n]) if (--indeg[v] === 0) ready.push(v);
  }
  return order.length === ids.length ? order : null;
}

function candidate(day, r, pExtra) {
  const env = day.env;
  const req = day.tasks.filter(t => t.k === 'main' || t.k === 'life'
    || (t.k === 'extra' && r() < (pExtra || 0)));
  const ids = req.map(t => t.id);
  const es = edges(req, env);
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

function solve(day, tries) {
  const r = rng(12345);
  let best = null;
  for (let i = 0; i < tries; i++) {
    const ord = candidate(day, r, i < tries / 4 ? 0 : (i / tries));
    if (!ord) continue;
    const res = E.run(day, ord, false);
    if (res.passed) return { ok: true, order: ord, pts: res.pts, tries: i + 1 };
    if (!best || (res.brk && best.brk && res.brk.i > best.brk.i)) best = res;
  }
  return { ok: false, brk: best && best.brk };
}

const TRIES = +(process.argv[2] || 4000);
let total = 0, ok = 0; const fails = [];

for (const lk in E.LOCS) {
  const L = E.LOCS[lk];
  for (const M of L.missions) {
    for (let di = 0; di < M.days.length; di++) {
      const specs = [{ s: null, n: 'без ускладнення' }];
      if (M.days[di].comp) specs.push({ s: { kind: 'script' }, n: 'сценарне: ' + M.days[di].comp.t });
      for (const g of E.GEN_OK[M.id + ':' + di] || []) specs.push({ s: { kind: 'gen', id: g }, n: 'подія: ' + L.gen[g].t });
      for (const sp of specs) {
        const plan = new Array(M.days.length).fill(null); plan[di] = sp.s;
        const day = E.buildDay(L, M, di, [], sp.s, plan);
        const res = solve(day, TRIES);
        total++;
        if (res.ok) ok++;
        else fails.push({ m: M.id, d: di + 1, t: M.days[di].t, c: sp.n, brk: res.brk });
      }
    }
  }
}

console.log('ПРОХІДНІСТЬ: ' + ok + ' із ' + total + ' комбінацій «день + ускладнення»');
if (fails.length) {
  console.log('\nНЕ ЗНАЙДЕНО ЖОДНОГО РОЗВ\'ЯЗКУ (' + fails.length + '):');
  for (const f of fails) {
    const why = f.brk ? (f.brk.key + ' на «' + (f.brk.v && f.brk.v.x || '?') + '»') : 'порядок не побудувався';
    console.log('  ' + f.m + ' д.' + f.d + ' «' + f.t + '» · ' + f.c + '\n      найдальший злам: ' + why);
  }
  process.exitCode = 1;
} else {
  console.log('Кожну комбінацію можна пройти.');
}

/* Розширений набір досягнень для зонної механіки + перевірка досяжності.

   Для кожної комбінації «місія + день + ускладнення» генеруємо багато
   прохідних планів (різна частка додаткових завдань), і для кожного плану
   перевіряємо кожен предикат досягнення. Питання до кожного одне:
   чи воно відкривається хоч раз — і чи не відкривається завжди.

   Жодне досягнення не використовує нічого, чого рушій уже не пише. */

const { extractEngine } = require('./extract-engine.js');
const E = require(extractEngine());
const { LOCS, buildDay, run, GEN_OK, P, toMin } = E;

/* ---------- генератор прохідних планів (з solve.js) ---------- */
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
  while (ch) { ch = false; for (const u of ids) for (const v of [...m[u]]) for (const w of m[v] || []) if (!m[u].has(w)) { m[u].add(w); ch = true; } }
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
  const req = day.tasks.filter(t => t.k === 'main' || t.k === 'life' || (t.k === 'extra' && r() < pExtra));
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

/* ---------- метрики плану, усі з того, що рушій уже пише ---------- */
function metrics(day, res, L) {
  const rows = res.rows, env = day.env;
  const m = {
    pens: res.pens.length,
    partial: !!res.partial,
    end: res.end,
    spare: day.start + day.len - res.end,
    travel: rows.reduce((a, r) => a + r.travel, 0),
    wait: rows.reduce((a, r) => a + r.wait, 0),
    extras: res.extrasDone.length,
    extrasAll: day.tasks.filter(t => t.k === 'extra').length,
    mainAll: day.tasks.filter(t => t.k === 'main').length,
    zonesSeq: rows.map(r => r.loc),
    comp: !!day.comp,
    blackout: !!day.blackout,
    fixedN: day.tasks.filter(t => t.fixed).length,
    o2left: null, o2used: null,
    commSlack: null,
    startBySlack: null,
    farDone: false,
    crewUSD: 0,
  };
  // кисень: точно як у рушії
  if (env.suit) {
    const egR = rows.find(r => r.b.egress), ingR = rows.find(r => r.b.ingress);
    if (egR && ingR) {
      let used = 0;
      for (const r of rows) {
        if (!r.suit || r.b.egress) continue;
        const v = (r.b.ingress ? r.start : r.end) - egR.end;
        if (v > used) used = v;
      }
      m.o2used = used; m.o2left = day.suitMax - used;
    }
  }
  // найменший зазор між завданням зі зв'язком і вікном мовчання
  if (day.los && day.los.length) {
    let best = Infinity;
    for (const r of rows) {
      if (!r.b.comm || r.b.k === 'blocked') continue;
      for (const [a, c] of day.los) {
        const A = toMin(a), C = toMin(c);
        if (r.end <= A) best = Math.min(best, A - r.end);
        else if (r.start >= C) best = Math.min(best, r.start - C);
      }
    }
    if (best !== Infinity) m.commSlack = best;
  }
  // найменший зазор до межі startBy
  let sb = Infinity;
  for (const r of rows) if (r.b.startBy) sb = Math.min(sb, toMin(r.b.startBy) - r.start);
  if (sb !== Infinity) m.startBySlack = sb;
  // найдальша зона місії від дому
  const d = env.dist[env.home] || {};
  let far = null, fd = -1;
  for (const z in d) if (d[z] !== Infinity && d[z] > fd) { fd = d[z]; far = z; }
  if (far && fd > 0) m.farDone = rows.some(r => r.loc === far && !r.fail);
  // ціна часу екіпажу: година екіпажу × тривалість зміни
  m.crewUSD = Math.round((res.end - day.start) / 60 * 130000);
  m.dur = res.end - day.start;
  // які саме важелі смикнуло ускладнення цього дня
  m.cutSuit = !!(day.comp && day.comp.suitMax);
  m.cutLen = !!(day.comp && day.comp.len);
  m.addedLos = !!(day.comp && day.comp.los);
  // окремі зони назовні, де справді щось зроблено
  const outZ = new Set();
  for (const r of rows) { const z = env.zones[r.loc]; if (z && z.out && !r.fail) outZ.add(r.loc); }
  m.outZones = outZ.size;
  // усі завдання зі зв'язком виконано, при наявному вікні мовчання
  const commAll = day.tasks.filter(t => t.comm && t.k !== 'blocked');
  const commDone = rows.filter(r => r.b.comm && r.b.k !== 'blocked' && !r.fail).length;
  m.commPerfect = (day.los || []).length > 0 && commAll.length > 0 && commDone === commAll.length;
  return m;
}

/* ---------- набір досягнень ---------- */
// src: 'game' — уже в грі; 'new' — пропозиція
const ACH = [
  // --- уже в грі (12) ---
  { id: 'first', src: 'game', n: 'Перший політ', d: 'Пройти перший день будь-якої місії', f: () => true },
  { id: 'clean', src: 'game', n: 'Чистий розклад', d: 'День без жодного штрафу', f: m => m.pens === 0 && !m.partial },
  { id: 'science', src: 'game', n: 'Науковий максимум', d: 'Виконати всі додаткові завдання дня', f: m => m.extrasAll > 0 && m.extras === m.extrasAll },
  { id: 'storm', src: 'game', n: 'Попри бурю', d: 'Пройти день з ускладненням', f: m => m.comp },
  { id: 'spare', src: 'game', n: 'Запас часу', d: 'Закінчити зміну щонайменше за 2 години до кінця', f: m => m.spare >= 120 },
  // nohint, aim, hands, team, mission, flawless, worlds — поза однією зміною, не перевіряються тут

  // --- нові: кисень скафандра ---
  { id: 'o2spare', src: 'new', n: 'Запас кисню', d: 'Повернутися зі щонайменше 45 хв кисню в запасі', f: m => m.o2left !== null && m.o2left >= 45 },
  { id: 'o2edge', src: 'new', n: 'На межі', d: 'Повернутися, витративши майже весь кисень — і без зламу', f: m => m.o2left !== null && m.o2left < 20 },
  { id: 'o2half', src: 'new', n: 'Половина ранця', d: 'Зробити весь вихід на половині ресурсу скафандра', f: (m, d) => m.o2used !== null && m.o2used <= d.suitMax / 2 },

  // --- нові: маршрут по зонах ---
  { id: 'noloop', src: 'new', n: 'Без зайвих ходок', d: 'Не зайти жодного разу в зону, де вже був', f: m => { const s = m.zonesSeq.filter((z, i) => i === 0 || z !== m.zonesSeq[i - 1]); return new Set(s).size === s.length; } },
  { id: 'farzone', src: 'new', n: 'Дальня ділянка', d: 'Виконати завдання в найдальшій зоні місії', f: m => m.farDone },
  { id: 'nowait', src: 'new', n: 'Без простоїв', d: 'День із завданням на точний час — і ні хвилини очікування', f: m => m.fixedN >= 1 && m.wait === 0 },
  { id: 'light', src: 'new', n: 'Легка нога', d: 'Витратити на переходи менше 30 хвилин за день', f: m => m.travel < 30 },

  // --- нові: зв'язок ---
  { id: 'window', src: 'new', n: 'Точно у вікно', d: 'Завершити розмову з Землею за 10 хв до мовчання', f: m => m.commSlack !== null && m.commSlack <= 10 },
  { id: 'dark', src: 'new', n: 'Крізь мовчання', d: 'Пройти день, коли зв\'язку з Землею немає зовсім', f: m => m.blackout },

  { id: 'commall', src: 'new', n: 'Тиша не на шкоді', d: 'У день із вікном мовчання виконати всі завдання зі зв\'язком', f: m => m.commPerfect },

  // --- нові: дисципліна часу ---
  { id: 'ontime', src: 'new', n: 'За розкладом', d: 'Пройти без штрафів день із завданням на точний час', f: m => m.fixedN >= 1 && m.pens === 0 },
  { id: 'jit', src: 'new', n: 'Встиг до межі', d: 'Почати завдання за 20 хв до його крайнього строку', f: m => m.startBySlack !== null && m.startBySlack <= 20 && m.pens === 0 },
  { id: 'cheap', src: 'new', n: 'Економний графік', d: 'Закрити всю зміну менш ніж за 6 годин', f: m => m.dur <= 360 },
  { id: 'crew', src: 'new', n: 'Ціна години', d: 'Зміна, що коштувала екіпажу менше за $700 000', f: m => m.crewUSD < 700000 },

  // --- нові: за типом ускладнення (по одному на кожен важіль подій) ---
  { id: 'dust', src: 'new', n: 'Крізь пил', d: 'Пройти день, коли ресурс скафандра врізано', f: m => m.cutSuit },
  { id: 'short', src: 'new', n: 'Коротка зміна', d: 'Пройти день, скорочений до 6 годин', f: m => m.cutLen },
  { id: 'norelay', src: 'new', n: 'Без ретранслятора', d: 'Пройти день, коли подія відрізала вікно зв\'язку', f: m => m.addedLos },

  // --- нові: обсяг виходу ---
  { id: 'marathon', src: 'new', n: 'Марафон назовні', d: 'Провести назовні щонайменше 4 години', f: m => m.o2used !== null && m.o2used >= 240 },
  { id: 'threez', src: 'new', n: 'Три станції', d: 'Відпрацювати три різні ділянки за один вихід', f: m => m.outZones >= 3 },

  // --- нові: повнота ---
  { id: 'priority', src: 'new', n: 'Рішення на ходу', d: 'Закрити день частково', f: m => m.partial },
  { id: 'full', src: 'new', n: 'Повний день', d: 'Виконати і всі обов\'язкові, і всі додаткові завдання', f: m => m.extrasAll > 0 && m.extras === m.extrasAll && m.pens === 0 && !m.partial },
];

/* ---------- прогін ---------- */
const PLANS = +(process.argv[2] || 2500);
const stat = {}; ACH.forEach(a => stat[a.id] = { hit: 0, plans: 0, combos: new Set(), locs: new Set() });
let combos = 0, found = 0;

for (const lk in LOCS) {
  const L = LOCS[lk];
  for (const M of L.missions) {
    for (let di = 0; di < M.days.length; di++) {
      const specs = [{ s: null }];
      if (M.days[di].comp) specs.push({ s: { kind: 'script' } });
      for (const g of GEN_OK[M.id + ':' + di] || []) specs.push({ s: { kind: 'gen', id: g } });
      for (const sp of specs) {
        combos++;
        const plan = new Array(M.days.length).fill(null); plan[di] = sp.s;
        const day = buildDay(L, M, di, [], sp.s, plan);
        const r = rng(9901 + combos * 7);
        const key = M.id + ':' + (di + 1) + (sp.s ? ':' + (sp.s.id || 'script') : '');
        let passing = 0;
        const softIds = new Set(day.tasks.filter(t => t.soft).map(t => t.id));
        for (let i = 0; i < PLANS; i++) {
          let ord = candidate(day, r, i / PLANS);
          if (!ord) continue;
          // частину спроб пробуємо без soft-завдань: так генеруються частково зараховані дні
          if (softIds.size && i % 3 === 0) ord = ord.filter(id => !softIds.has(id));
          const res = run(day, ord, false);
          if (!res.passed) continue;
          passing++;
          const m = metrics(day, res, L);
          for (const a of ACH) {
            stat[a.id].plans++;
            let ok = false; try { ok = !!a.f(m, day); } catch (e) { ok = false; }
            if (ok) { stat[a.id].hit++; stat[a.id].combos.add(key); stat[a.id].locs.add(lk); }
          }
        }
        if (passing) found++;
      }
    }
  }
}

console.log('Комбінацій «день + ускладнення»: ' + combos + ', з прохідним планом: ' + found);
console.log('Планів на комбінацію: до ' + PLANS + '\n');
console.log('  id         дж.  досягнення            частка планів  комбінацій  локацій  вердикт');
console.log('  ' + '-'.repeat(94));
const bad = [];
for (const a of ACH) {
  const s = stat[a.id];
  const pct = s.plans ? (100 * s.hit / s.plans) : 0;
  let v;
  if (s.hit === 0) { v = '✗ НЕДОСЯЖНЕ'; bad.push(a.id + ': недосяжне'); }
  else if (a.id === 'first') { v = '✓ туторіал'; }
  else if (pct > 97) { v = '✗ майже завжди'; bad.push(a.id + ': відкривається у ' + pct.toFixed(0) + '% планів'); }
  else if (s.combos.size < 3) { v = '⚠ лише ' + s.combos.size + ' комб.'; }
  else v = '✓';
  console.log('  ' + a.id.padEnd(10) + ' ' + a.src.padEnd(5) + a.n.slice(0, 21).padEnd(23)
    + (pct.toFixed(1) + '%').padStart(12) + String(s.combos.size).padStart(12)
    + String(s.locs.size).padStart(9) + '  ' + v);
}
console.log('\n' + (bad.length ? 'ПРОБЛЕМНІ (' + bad.length + '):\n  ' + bad.join('\n  ') : 'Усі перевірені досягнення досяжні й жодне не видається автоматично.'));

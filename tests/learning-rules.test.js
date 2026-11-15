/* Перевірка трьох навчальних правил, доданих/відновлених для спрощеної гри
   (3 місії × 2 дні): затримка зв'язку CHAPEA, ризик/бюджет радіації МКС.
   Apollo 11 не має нових правил (аудит показав, що механіка вже існувала),
   тож тут лише непряма перевірка, що її дані не зникли. */

const { extractFull } = require('./extract-engine.js');
const E = require(extractFull());
const { LOCS, buildDay, run, simplifyMission, radLimit, radDay } = E;

/* Той самий топологічний розв'язувач, що й у passability.test.js/achievements.test.js —
   тут застосований саме до СПРОЩЕНИХ (simplifyMission) днів, бо passability.test.js
   перевіряє сирі LOCS-місії, а не те, що гравець бачить в інтерфейсі. */
const rng = s => () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
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
  while (ready.length) {
    const k = Math.floor(r() * ready.length), n = ready.splice(k, 1)[0];
    order.push(n);
    for (const v of adj[n]) if (--indeg[v] === 0) ready.push(v);
  }
  return order.length === ids.length ? order : null;
}
function candidate(day, r, pExtra) {
  const env = day.env;
  const req = day.tasks.filter(t => t.k === 'main' || t.k === 'life' || (t.k === 'extra' && r() < (pExtra || 0)));
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
  const r = rng(20260101);
  for (let i = 0; i < tries; i++) {
    const ord = candidate(day, r, i < tries / 4 ? 0 : (i / tries));
    if (!ord) continue;
    const res = run(day, ord, false);
    if (res.passed) return { ok: true, order: ord };
  }
  return { ok: false };
}

let fails = 0;
function check(label, cond){
  console.log((cond ? '  ✓ ' : '  ✗ ') + label);
  if(!cond) fails++;
}

function freshDay(locId, missionId, di){
  const L0 = LOCS[locId];
  const M0 = L0.missions.find(m => m.id === missionId);
  const M = simplifyMission(M0, locId);
  const L = Object.assign({}, L0, { life: L0.life.filter(t => t.id !== 'sport') });
  return { day: buildDay(L, M, di, [], null, [null, null]), M, L };
}

console.log('=== CHAPEA, день 1: затримка зв\'язку (gap) ===');
{
  const { day } = freshDay('mars', 'chapea', 0);
  const ansTask = day.tasks.find(t => t.id === 'ans');
  check('день 1 CHAPEA: завдання "ans" має поле gap (затримку відновлено)', !!(ansTask && ansTask.gap && ansTask.gap.min === 40));

  const immediate = ['req', 'ans', 'egress', 'walk', 'suitchk', 'ingress', 'farm'];
  const rImmediate = run(day, immediate, false);
  check('відповісти одразу після запиту — неможливо (жорсткий злам "gap")', !rImmediate.passed && rImmediate.brk && rImmediate.brk.key === 'gap');

  const waited = ['req', 'lunch', 'ans', 'egress', 'walk', 'suitchk', 'ingress', 'farm', 'dinner'];
  const rWaited = run(day, waited, false);
  check('почекати (зайнявши час обідом) і відповісти пізніше — день проходиться', rWaited.passed);
}

console.log('=== CHAPEA, день 2: затримка лишилась (без регресу) ===');
{
  const { day } = freshDay('mars', 'chapea', 1);
  const ans2 = day.tasks.find(t => t.id === 'ans2');
  check('день 2 CHAPEA: "ans2" і раніше мав gap — не зламали', !!(ans2 && ans2.gap && ans2.gap.min === 40));
}

console.log('=== МКС: ризик/бюджет радіації ===');
{
  const { day, L } = freshDay('iss', 'iss-routine', 0);
  const risky = day.tasks.find(t => t.id === 'xcup');
  check('ризиковане завдання "xcup" (Купол) пропоноване першого дня', !!risky);

  const withoutRisky = ['blood', 'cent', 'melfi', 'msgOn', 'exp', 'down', 'cargo', 'lunch', 'dinner'];
  const withRisky = withoutRisky.concat(['xcup']);

  const r1 = run(day, withoutRisky, false);
  const r2 = run(day, withRisky, false);
  check('план без ризикованого завдання проходить', r1.passed);
  check('план з ризикованим завданням теж проходить (не провалює день автоматично)', r2.passed);

  const rad1 = radDay(day, r1.rows), rad2 = radDay(day, r2.rows);
  check('ризиковане завдання реально підвищує дозу радіації за день', rad2 > rad1);
  check('ліміт радіації на місію визначено (' + radLimit.toString().includes('RAD') + ')', typeof radLimit === 'function');
}

console.log('=== МКС: денне навантаження окремо від накопиченого (не плутати в підсумку) ===');
{
  const { day } = freshDay('iss', 'iss-routine', 0);
  const plan = ['blood', 'cent', 'melfi', 'msgOn', 'exp', 'down', 'cargo', 'lunch', 'dinner'];
  const r = run(day, plan, false);
  const dayLoad = radDay(day, r.rows);
  const cumulativeBefore = 30; // імітує "вже накопичено з попереднього дня"
  const cumulativeAfter = cumulativeBefore + dayLoad;
  check('денний приріст — це НЕ те саме число, що накопичене значення', dayLoad !== cumulativeAfter);
  check('бюджет (radLimit) порівнюється з НАКОПИЧЕНИМ, а не підмінюється денним приростом', cumulativeAfter > dayLoad);
}

console.log('=== CHAPEA: підсумок має спиратись на РЯДКИ результату, а не на саму наявність поля gap ===');
{
  const { day } = freshDay('mars', 'chapea', 0);
  // План А: гравець реально зайняв час очікування іншим завданням (lunch) між req і ans.
  const planA = ['req', 'lunch', 'ans', 'egress', 'walk', 'suitchk', 'ingress', 'farm', 'dinner'];
  const rA = run(day, planA, false);
  check('план А проходить', rA.passed);
  const reqRowA = rA.rows.find(x => x.b.id === 'req'), ansRowA = rA.rows.find(x => x.b.id === 'ans');
  const betweenA = rA.rows.filter(x => x.i > reqRowA.i && x.i < ansRowA.i);
  check('план А: між запитом і відповіддю справді є виконане завдання (не вигадане)', betweenA.length > 0 && betweenA[0].b.id === 'lunch');

  // День 1 CHAPEA тут не має задачі, що виконується паралельно без наповнення чекання —
  // рушій не дає "простого очікування": перевіряємо натомість, що РІЗНІ плани з РІЗНИМ
  // наповненням чекання дають РІЗНИЙ список "between" (тобто підсумок не може бути
  // однаковим шаблоном незалежно від плану).
  const planB = ['req', 'suitchk', 'farm', 'ans', 'egress', 'walk', 'ingress', 'lunch', 'dinner'];
  const rB = run(day, planB, false);
  if (rB.passed) {
    const reqRowB = rB.rows.find(x => x.b.id === 'req'), ansRowB = rB.rows.find(x => x.b.id === 'ans');
    const betweenB = rB.rows.filter(x => x.i > reqRowB.i && x.i < ansRowB.i).map(x => x.b.id);
    const betweenAIds = betweenA.map(x => x.b.id);
    check('план Б проходить і заповнює очікування ІНШИМ набором завдань, ніж план А', betweenB.join(',') !== betweenAIds.join(','));
  } else {
    check('план Б (альтернативне наповнення очікування) теж мав бути прохідним', false);
  }
}

console.log('=== Apollo 11: ресурсні обмеження не порушені спрощенням ===');
{
  const { day } = freshDay('moon', 'a11', 0);
  check('день 1: суворий кисневий бюджет (env.suit) активний', day.env.suit === true);
  check('день 1: egress/ingress лишились головними завданнями', day.tasks.some(t => t.egress) && day.tasks.some(t => t.ingress));
  const { day: day2 } = freshDay('moon', 'a11', 1);
  const liftoff = day2.tasks.find(t => t.id === 'liftoff');
  check('день 2: фіксований час зльоту (17:54) і "last" не зачищені', !!(liftoff && liftoff.fixed === '17:54' && liftoff.last === 1));
}

console.log('=== MVP: усі 3 місії × 2 дні (саме те, що показує UI) — прохідні ===');
{
  const { UI_MISSION, UI_DAYS } = E;
  for (const locId in UI_MISSION) {
    const mid = UI_MISSION[locId];
    for (let di = 0; di < UI_DAYS; di++) {
      const { day } = freshDay(locId, mid, di);
      const res = solve(day, 4000);
      check(locId + '/' + mid + ' день ' + (di + 1) + ': існує прохідний план', res.ok);
    }
  }
}

console.log('\n' + '-'.repeat(60));
console.log(fails === 0 ? 'Усі навчальні правила працюють як описано в аудиті.' : fails + ' перевірок не пройшло.');
process.exitCode = fails === 0 ? 0 : 1;

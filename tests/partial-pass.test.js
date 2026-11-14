/* Перевірка часткового зарахування дня.

   Для кожного дня з позначеними soft-завданнями перевіряємо три випадки:
     1. повний план            → день зараховано повністю, +150
     2. план без soft-завдань  → день зараховано частково,  +75, названо пропущене
     3. план без твердого      → день НЕ зараховано (злам «missing»)

   А також: що жодне тверде завдання не залежить від пропущеного. */

const { extractEngine } = require('./extract-engine.js');
const E = require(extractEngine());
const S = require('./solvelib.js');
const rng = s => () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };

/* знайти прохідний порядок із заданої підмножини завдань */
function findOrder(day, keep, tries) {
  const r = rng(4242);
  const sub = { ...day, tasks: day.tasks.filter(t => keep.has(t.id)) };
  for (let i = 0; i < tries; i++) {
    const ord = S.candidate(sub, r, 1);
    if (!ord) continue;
    const res = E.run(day, ord, false);
    if (res.passed) return { ord, res };
  }
  return null;
}

let fail = 0, n = 0;
const say = (ok, txt) => { if (!ok) fail++; console.log('  ' + (ok ? '✓' : '✗ ПРОВАЛ') + ' ' + txt); };

for (const lk in E.LOCS) {
  const L = E.LOCS[lk];
  for (const M of L.missions) {
    for (let di = 0; di < M.days.length; di++) {
      const day = E.buildDay(L, M, di, [], null, new Array(M.days.length).fill(null));
      const soft = day.tasks.filter(t => t.soft);
      if (!soft.length) continue;
      n++;
      console.log('\n' + M.id + ' D' + (di + 1) + ' «' + day.D.t + '» · soft: ' + soft.map(t => t.id).join(', '));

      const req = day.tasks.filter(t => t.k === 'main' || t.k === 'life').map(t => t.id);
      const hardIds = day.tasks.filter(t => (t.k === 'main' || t.k === 'life') && !t.soft).map(t => t.id);

      /* 1. повний план */
      const a = findOrder(day, new Set(req), 4000);
      say(!!a, 'повний план проходиться');
      if (a) {
        say(!a.res.partial, 'повний план не позначено частковим');
        say(a.res.pts >= E.P.pass, 'бали включають повне зарахування (' + a.res.pts + ')');
      }

      /* 2. план без soft-завдань */
      const b = findOrder(day, new Set(hardIds), 4000);
      say(!!b, 'план без пропущених проходиться');
      if (b) {
        say(!!b.res.partial, 'день позначено частковим');
        if (b.res.partial) {
          const got = b.res.partial.map(x => x.id).sort().join(',');
          const want = soft.map(x => x.id).sort().join(',');
          say(got === want, 'названо саме пропущене: ' + got);
        }
        const diff = (a ? a.res.pts : 0) - b.res.pts;
        say(diff > 0, 'частковий день дає менше балів (' + b.res.pts + ' проти ' + (a ? a.res.pts : '—') + ')');
      }

      /* 3. план без одного твердого завдання — має зламатися */
      let brokeAll = true, checked = 0;
      for (const hid of hardIds) {
        const keep = new Set(req.filter(x => x !== hid));
        const c = findOrder(day, keep, 600);
        checked++;
        if (c) { brokeAll = false; console.log('      ⚠ без «' + hid + '» день усе одно зараховано'); }
      }
      say(brokeAll, 'кожне з ' + checked + ' твердих завдань лишається обов\'язковим');

      /* 4. жодне тверде не залежить від пропущеного */
      const softSet = new Set(soft.map(t => t.id));
      const bad = [];
      for (const t of day.tasks) {
        if (t.soft || (t.k !== 'main' && t.k !== 'life')) continue;
        for (const f of ['after', 'before', 'softAfter']) for (const r of t[f] || []) if (softSet.has(r)) bad.push(t.id + '.' + f + '→' + r);
        if (t.gap && softSet.has(t.gap.ref)) bad.push(t.id + '.gap→' + t.gap.ref);
        if (t.within && softSet.has(t.within.ref)) bad.push(t.id + '.within→' + t.within.ref);
      }
      say(!bad.length, bad.length ? 'залежність від пропущеного: ' + bad.join(', ') : 'жодне тверде завдання не залежить від пропущеного');
    }
  }
}

console.log('\n' + '-'.repeat(60));
console.log('днів із частковим зарахуванням: ' + n + ' | провалів: ' + fail);
console.log(fail ? 'Є ПРОБЛЕМИ — дивись ✗ вище' : 'Механіка працює на всіх перевірених днях.');
if (fail) process.exitCode = 1;

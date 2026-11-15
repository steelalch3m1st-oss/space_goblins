// Витягує ігровий рушій (чиста логіка днів/балів/перевірок) з ../index.html
// між мітками ENGINE-START / ENGINE-END і робить з нього Node-модуль
// для автоматичних тестів нижче. Запускати перед кожним тестом — тести
// завжди перевіряють актуальний index.html, а не застарілий знімок.
const fs = require('fs');
const path = require('path');

function extractEngine() {
  const htmlPath = path.join(__dirname, '..', 'index.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const s = html.indexOf('/*ENGINE-START*/');
  const e = html.indexOf('/*ENGINE-END*/');
  if (s < 0 || e < 0) {
    throw new Error('Не знайдено міток /*ENGINE-START*/ /*ENGINE-END*/ в index.html — рушій витягнути неможливо.');
  }
  let body = html.slice(s, e);
  body += '\nmodule.exports={LOCS,buildDay,run,planComps,missionEnv,GEN_OK,P,toMin,fmt};';
  const outPath = path.join(__dirname, '_engine.generated.js');
  fs.writeFileSync(outPath, body);
  return outPath;
}

// Те саме, але разом із навчальним шаром поверх рушія: UI_MISSION/UI_DAYS,
// simplifyMission(), RISKY_EXTRAS, SIMPLE_STRIP, RAD/radLimit/radDay.
// Потрібно окремо, бо ці речі лежать ПІСЛЯ /*ENGINE-END*/, а між ними в
// index.html є код, що звертається до DOM (document/SPR-спрайти) — його
// пропускаємо, він не потрібен для правил.
function extractFull() {
  const htmlPath = path.join(__dirname, '..', 'index.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const s = html.indexOf('/*ENGINE-START*/');
  const e = html.indexOf('/*ENGINE-END*/');
  if (s < 0 || e < 0) throw new Error('Не знайдено міток ENGINE-START/END.');
  const engine = html.slice(s, e);
  const uiStart = html.indexOf('const UI_MISSION');
  const spriteStart = html.indexOf('(function(){ /* знак радіації');
  const spriteEnd = html.indexOf('})();', spriteStart) + 5;
  const uiEnd = html.indexOf('function startMission');
  if (uiStart < 0 || spriteStart < 0 || uiEnd < 0) throw new Error('Не знайдено навчального шару (UI_MISSION.. startMission) в index.html.');
  const uiBlock = html.slice(uiStart, spriteStart) + html.slice(spriteEnd, uiEnd);
  const body = engine + '\n' + uiBlock +
    '\nmodule.exports={LOCS,buildDay,run,planComps,missionEnv,GEN_OK,P,toMin,fmt,' +
    'simplifyMission,UI_MISSION,UI_DAYS,RISKY_EXTRAS,SIMPLE_STRIP,RAD,radLimit,radDay};';
  const outPath = path.join(__dirname, '_engine-full.generated.js');
  fs.writeFileSync(outPath, body);
  return outPath;
}

module.exports = { extractEngine, extractFull };

if (require.main === module) {
  const p = extractEngine();
  console.log('Рушій витягнуто у', p);
}

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

module.exports = { extractEngine };

if (require.main === module) {
  const p = extractEngine();
  console.log('Рушій витягнуто у', p);
}

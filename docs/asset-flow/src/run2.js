const X = require('./designs.js'), F = require('./final.js'); const { CARDS } = require('./data.js'); const { gradeAll } = require('./grade.js');
const path = { review: CARDS.some(c => c.kind === 'review'), sections: new Set(CARDS.map(c => c.sec)).size };
const r = gradeAll({ main: [...X.MAIN, F.M7], list: [...X.LIST, F.L7], card: [...X.CARD, F.C7] }, path);
for (const [p, l] of Object.entries(r.pages)) { console.log('\n==', p); l.forEach(x => { console.log(x.id, x.score, JSON.stringify(x.parts)); if (/7/.test(x.id)) x.deductions.forEach(d => console.log('   -', d)); }); }
require('fs').writeFileSync('round2.json', JSON.stringify(r, null, 1));

const { MAIN, LIST, CARD } = require('./designs.js'); const { CARDS } = require('./data.js'); const { gradeAll } = require('./grade.js');
const path = { review: CARDS.some(c => c.kind === 'review'), sections: new Set(CARDS.map(c => c.sec)).size };
const r = gradeAll({ main: MAIN, list: LIST, card: CARD }, path);
console.log('contrast', r.contrast);
for (const [p, l] of Object.entries(r.pages)) { console.log('\n==', p); l.forEach(x => { console.log(x.id, x.name, x.score, JSON.stringify(x.parts)); x.deductions.forEach(d => console.log('   -', d)); }); }
require('fs').writeFileSync('round1.json', JSON.stringify(r, null, 1));

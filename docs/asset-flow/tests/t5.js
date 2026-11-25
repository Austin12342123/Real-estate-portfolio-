const { JSDOM } = require('jsdom'); const fs = require('fs');
const html = fs.readFileSync('../out/asset-flow.html', 'utf8');
const dom = new JSDOM('<!doctype html><html><head></head><body>' + html + '</body></html>', { runScripts: 'dangerously', pretendToBeVisual: true });
const w = dom.window, d = w.document; w.matchMedia = () => ({ matches: false }); w.HTMLElement.prototype.scrollIntoView = () => {};
const errs = []; w.addEventListener('error', (e) => errs.push(e.message));
const wait = (ms) => new Promise((r) => setTimeout(r, ms)); const res = [];
const ok = (name, cond, info) => res.push((cond ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? ' (' + info + ')' : ''));
(async () => { await wait(200);
  const deck = d.getElementById('deck'), q = () => deck.querySelector('.q').textContent.replace(/ i$/, '');
  const click = (el) => { for (const t of ['pointerdown', 'pointerup']) { const e = new w.Event(t, { bubbles: true }); e.clientX = 1; e.clientY = 1; el.dispatchEvent(e); } el.dispatchEvent(new w.MouseEvent('click', { bubbles: true })); };
  const picks = () => [...deck.querySelectorAll('[data-pick]')].map((b) => b.dataset.pick);
  const pick = async (t) => { click([...deck.querySelectorAll('[data-pick]')].find((b) => b.dataset.pick === t)); await wait(320); };
  const nextB = () => click(deck.querySelector('.ft [data-nav="1"]'));
  const type = (v, i = 0) => { const inp = deck.querySelectorAll('input')[i]; inp.value = v; inp.dispatchEvent(new w.Event('input', { bubbles: true })); };
  const on = () => [...deck.querySelectorAll('#cardEl .chip.on')].map((x) => x.textContent).join(',');
  const toCard = async (txt) => { for (let n = 0; n < 40 && q() !== txt; n++) { const o = deck.querySelector('[data-pick]'); if (o && !deck.querySelector('.nx')) { click(o); await wait(300); } else { const nx = deck.querySelector('.nx') || deck.querySelector('[data-skip]'); if (!nx) break; click(nx); await wait(5); } } };
  const toEnd = async () => { const seen = []; for (let n = 0; n < 45 && !deck.querySelector('.save'); n++) { seen.push(q()); const o = deck.querySelector('[data-pick]'); if (o && !deck.querySelector('.nx')) { click(o); await wait(300); } else { nextB(); await wait(5); } } return seen; };
  const main = d.getElementById('f-main'), btn = (act, cat) => main.querySelector(`[data-act="${act}"][data-cat="${cat}"]`);
  const rv = () => deck.querySelector('.rvs') ? deck.textContent : '';
  // owned commercial keeps a commercial value
  click(btn('add', 'commercial')); await wait(5); await pick('I already own it'); await toEnd();
  ok('owned commercial value follows its price', /Worth today\$650,000/.test(deck.textContent) && !/Equity( i)?\$-/.test(deck.textContent), (deck.textContent.match(/Worth today\$[\d,]+/) || [''])[0] + ' ' + (deck.textContent.match(/Equity( i)?\$-?\d+k/) || [''])[0]);
  ok('worth help fits commercial', !/Zillow/.test(deck.textContent));
  // 5+ units default loan and no HOA
  click(btn('add', 'homes')); await wait(5); await pick('Multi-family'); await pick('5 or more'); nextB(); await wait(5); await pick('Planning to buy'); const s5 = await toEnd();
  ok('5+ units skips HOA', !s5.includes('Is there an HOA?'), s5.join(' / ')); click(btn('add', 'homes')); await wait(5); await pick('Multi-family'); await pick('5 or more'); nextB(); await wait(5); await pick('Planning to buy'); await toCard('How will you pay for it?'); click(deck.querySelector('[data-skip]')); await wait(5); await toEnd();
  ok('5+ default loan is apartment when skipped', /Apartment loan/.test(deck.textContent), (deck.textContent.match(/Loan[A-Z][^,]*/) || [''])[0]);
  // loan cleared when units change
  click(btn('add', 'homes')); await wait(5); await pick('Multi-family'); await pick('5 or more'); nextB(); await wait(5); await pick('Planning to buy'); await toCard('How will you pay for it?'); await pick('Apartment loan (5+ units)');
  click(deck.querySelector('[data-nav="-1"]')); await wait(5); for (let n = 0; n < 10 && q() !== 'How many units?'; n++) { click(deck.querySelector('[data-nav="-1"]')); await wait(5); }
  await pick('2 (duplex)'); await toEnd(); ok('Apartment loan cleared for a duplex', !/Apartment loan/.test(deck.textContent) && /Conventional 2 to 4 units/.test(deck.textContent), (deck.textContent.match(/Loan[A-Z][^,]*/) || [''])[0]);
  // pack of houses
  click(btn('add', 'homes')); await wait(5); await pick('Multi-family'); await pick('A pack of houses'); nextB(); await wait(5); await pick('Planning to buy'); await toCard('How will you pay for it?');
  ok('pack hides 2 to 4 unit loans', !picks().some((p) => /Conventional 2|FHA|Apartment/.test(p)), picks().join('|'));
  // live strip after passing price with skips
  click(btn('add', 'homes')); await wait(5); await pick('Single-family home'); await pick('Planning to buy'); await toCard('How will you pay for it?');
  ok('live strip shows numbers after price is passed', !/Cash flow-/.test(deck.querySelector('.live').textContent), deck.querySelector('.live').textContent);
  // owned balance placeholder matches review
  click(btn('add', 'homes')); await wait(5); await pick('Single-family home'); await pick('I already own it'); await toCard('How much is left on the loan?');
  const ph = deck.querySelector('input').placeholder; await toEnd(); ok('balance placeholder matches review', deck.textContent.includes('Loan left$' + ph), ph);
  // stale units after going back
  click(btn('add', 'homes')); await wait(5); await pick('Multi-family'); await pick('5 or more'); type('12'); nextB(); await wait(5);
  click(deck.querySelector('[data-nav="-1"]')); await wait(5); click(deck.querySelector('[data-nav="-1"]')); await wait(5); await pick('2 (duplex)'); click(deck.querySelector('[data-nav="-1"]')); await wait(5); await pick('5 or more');
  ok('typed unit count comes back', deck.querySelector('input').value === '12' || deck.querySelector('input').placeholder === '12', deck.querySelector('input').value + '/' + deck.querySelector('input').placeholder);
  nextB(); await wait(5); await pick('Planning to buy'); await toCard('How will you pay for it?'); ok('12 units offers the apartment loan', picks().some((p) => p.startsWith('Apartment')), picks().join('|'));
  click(deck.querySelector('[data-skip]')); await wait(5); await toEnd(); ok('review uses 12 units', /12 units ×/.test(deck.textContent));
  // 15-year chip moves the rate
  click(btn('add', 'homes')); await wait(5); await pick('Single-family home'); await pick('Planning to buy'); await toCard('How will you pay for it?'); await pick('Conventional 30-year');
  click([...deck.querySelectorAll('.chip')].find((x) => x.textContent === '15 years')); await wait(5); await toEnd(); ok('15-year conventional uses its rate', /Conventional 15-year, 7%, 15 years/.test(deck.textContent), (deck.textContent.match(/LoanConventional[^E]*/) || [''])[0]);
  // picked month holds the buy back
  click(btn('add', 'homes')); await wait(5); await pick('Single-family home'); await pick('Planning to buy'); await toCard('When should it be bought?'); await pick('Not before a month I pick'); click([...deck.querySelectorAll('.chip')].find((x) => x.textContent === 'Dec')); await wait(5); click([...deck.querySelectorAll('.chip')].find((x) => x.textContent === '2031')); await wait(5);
  ok('month and year buttons change trust months', /in 61 mo/.test(deck.querySelector('.live').textContent), deck.querySelector('.live').textContent);
  // commercial rehab sizes
  click(btn('add', 'commercial')); await wait(5); await pick('Planning to buy'); await toCard('Does it need work?'); ok('commercial rehab sized for a building', /\$50k/.test(deck.textContent) && /\$150k/.test(deck.textContent));
  click(btn('add', 'homes')); await wait(5); await pick('Single-family home'); await pick('Planning to buy'); await toCard('When should it be bought?'); await pick('Not before a month I pick'); click([...deck.querySelectorAll('.chip')].find((x) => x.textContent === 'Jun')); await wait(5); click([...deck.querySelectorAll('.chip')].find((x) => x.textContent === '2031')); await wait(5);
  ok('other month and year', /in 55 mo/.test(deck.querySelector('.live').textContent), deck.querySelector('.live').textContent);
  click(btn('add', 'homes')); await wait(5); await pick('Multi-family'); await pick('2 (duplex)'); await pick('Planning to buy'); await toCard('Does it need work?'); await pick('Big rehab');
  for (let n = 0; n < 15 && q() !== 'How many units?'; n++) { click(deck.querySelector('[data-nav="-1"]')); await wait(5); } await pick('4 (fourplex)'); for (let n = 0; n < 40 && !deck.querySelector('.save'); n++) { click(deck.querySelector('[data-skip]') || deck.querySelector('.nx')); await wait(5); }
  ok('rehab budget follows unit count', /Fix-up\$80,000 rehab budget/.test(deck.textContent), (deck.textContent.match(/Fix-up\$[\d,]+/) || ['none'])[0]);
  click(btn('add', 'homes')); await wait(5); await pick('Single-family home'); await pick('Planning to buy'); await toCard('How will you pay for it?'); await pick('FHA (you live there)');
  ok('loan pick stays and shows rate', q().startsWith('How will you pay') && deck.querySelector('[data-f="rate:0"]').value === '6.9' && !!deck.querySelector('.nx'), q());
  click(deck.querySelector('[data-reopen]')); await wait(5); ok('Change loan brings the list back', picks().length >= 5, picks().length); await pick('Cash'); ok('Cash moves on by itself', q() === 'Closing costs', q());
  click(btn('add', 'homes')); await wait(5); await pick('Single-family home'); await pick('Planning to buy'); await toCard('How will you pay for it?'); await pick('Conventional 30-year');
  click([...deck.querySelectorAll('#cardEl .chip')].find((x) => x.textContent === '15 years')); await wait(5); type('6.5'); click(deck.querySelector('#cardEl .o.on')); await wait(320);
  ok('tapping the chosen loan keeps the typed rate', deck.querySelector('[data-f="rate:0"]').value === '6.5' && q().startsWith('How will you pay'), q());
  nextB(); ok('old card flies off as a ghost', !!deck.querySelector('.ghost') && !deck.querySelector('.ghost [data-f]'));
  await toCard('When should it be bought?'); await pick('Not before a month I pick'); ok('years start when the trust can afford it', [...deck.querySelectorAll('#cardEl .chip')].filter((x) => /^20\d\d$/.test(x.textContent))[0].textContent === '2030', [...deck.querySelectorAll('#cardEl .chip')].map((x) => x.textContent).join(','));
  ok('month starts on the ready month', /Held until Sep 2030, 46 mo/.test(deck.querySelector('.lv').textContent), deck.querySelector('.lv').textContent);
  click([...deck.querySelectorAll('#cardEl .chip')].find((x) => x.textContent === 'Jan')); await wait(5);
  ok('month line says when the hold does nothing', /can't afford it until/.test(deck.querySelector('.lv').textContent), deck.querySelector('.lv').textContent);
  click(btn('add', 'homes')); await wait(5); await pick('Single-family home'); await pick('Planning to buy'); await toCard('How will you pay for it?'); await pick('DSCR investor loan'); type('6.25');
  click(deck.querySelector('[data-reopen]')); await wait(5); await pick('DSCR investor loan'); ok('re-picking the same loan keeps the typed rate', deck.querySelector('[data-f="rate:0"]').value === '6.25', deck.querySelector('[data-f="rate:0"]').value);
  click(deck.querySelector('[data-reopen]')); await wait(5); click(deck.querySelector('.nx')); await wait(5); click(deck.querySelector('[data-nav="-1"]')); await wait(5);
  ok('leaving the card closes the loan list', !!deck.querySelector('[data-f="rate:0"]'), q());
  for (let n = 0; n < 8 && q() !== 'Do you own it yet?'; n++) { click(deck.querySelector('[data-nav="-1"]')); await wait(5); } ok('answered pick card offers Next', !!deck.querySelector('.nx') && !deck.querySelector('[data-skip]'), q());
  console.log(res.join('\n')); console.log('errors', errs); console.log(res.filter((r) => r.startsWith('PASS')).length + ' of ' + res.length + ' passed');
})();

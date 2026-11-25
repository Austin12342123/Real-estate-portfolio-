const { JSDOM } = require('jsdom'); const fs = require('fs');
const html = fs.readFileSync('../out/asset-flow.html', 'utf8');
const dom0 = 0; const dom = new JSDOM('<!doctype html><html><head></head><body>' + html + '</body></html>', { runScripts: 'dangerously', pretendToBeVisual: true });
const w = dom.window, d = w.document; w.matchMedia = () => ({ matches: false }); w.HTMLElement.prototype.scrollIntoView = () => {};
const errs = []; w.addEventListener('error', (e) => errs.push(e.message));
const wait = (ms) => new Promise((r) => setTimeout(r, ms)); const res = [];
const ok = (name, cond, info) => res.push((cond ? 'PASS ' : 'FAIL ') + name + (info ? ' (' + info + ')' : ''));
(async () => { await wait(200);
  const deck = d.getElementById('deck'), q = () => deck.querySelector('.q').textContent.replace(/ i$/, ''), count = () => deck.querySelector('.top span:last-child').textContent;
  const click = (el) => { const e = new w.Event('pointerdown', { bubbles: true }); e.clientX = 1; e.clientY = 1; el.dispatchEvent(e); const u = new w.Event('pointerup', { bubbles: true }); u.clientX = 1; u.clientY = 1; el.dispatchEvent(u); el.dispatchEvent(new w.MouseEvent('click', { bubbles: true })); };
  const pick = async (t) => { click([...deck.querySelectorAll('[data-pick]')].find((b) => b.dataset.pick === t)); await wait(320); };
  const nextB = () => click(deck.querySelector('.ft [data-nav="1"]')); const back = () => click(deck.querySelector('[data-nav="-1"]'));
  const type = (v, i = 0) => { const inp = deck.querySelectorAll('input')[i]; inp.value = v; inp.dispatchEvent(new w.Event('input', { bubbles: true })); };
  const live = () => deck.querySelector('.live').textContent;
  const toCard = async (txt) => { for (let n = 0; n < 40 && q() !== txt; n++) { const nx = deck.querySelector('.nx') || deck.querySelector('[data-skip]'); if (!nx) break; click(nx); await wait(10); } };
  ok('live strip hidden before price', /Cash flow-/.test(live()), live());
  // double-tap guard
  const b = deck.querySelector('[data-pick]'); click(b); click(b); await wait(400); ok('double tap moves one card', q() === 'Do you own it yet?', q());
  await pick('Planning to buy'); nextB(); nextB(); ok('at price', q() === "What's the purchase price?", q());
  type('300,000'); ok('live strip shows after price', /\$/.test(live()), live()); nextB(); await pick('FHA (you live there)');
  ok('rate prefilled from loan', deck.querySelector('input').value === '6.9', deck.querySelector('input').value); nextB();
  ok('dp chip from loan', deck.querySelector('.chip.on') && deck.querySelector('.chip.on').textContent === '3.5%', deck.querySelector('.chip.on') && deck.querySelector('.chip.on').textContent);
  nextB(); ok('closing prefilled from loan', deck.querySelector('input').value === '4', deck.querySelector('input').value);
  back(); back(); back(); ok('back keeps typed price', deck.querySelector('input').value === '300,000', deck.querySelector('input') && deck.querySelector('input').value);
  await toCard('Property tax'); type('2400'); const before = live(); click([...deck.querySelectorAll('[data-chip]')].find((c) => c.dataset.v === 'Per year')); await wait(10);
  nextB(); back(); ok('per year chip kept', deck.querySelector('.chip.on').textContent === 'Per year');
  await toCard('7 Maple Ct is ready'); const taxRow = [...deck.querySelectorAll('.rv')].find((r) => /Property tax/.test(r.textContent)).textContent; ok('per year tax shown monthly', /\$200\/mo/.test(taxRow), taxRow);
  ok('plan label', deck.querySelector('.save').textContent === 'Add to my plan'); click(deck.querySelector('.save')); click(deck.querySelector('#again')); await wait(10);
  ok('start again resets', q() === 'What kind of home?' && /Cash flow-/.test(live()), q() + ' / ' + live());
  // owned path
  await pick('Single-family home'); await pick('I already own it'); await toCard("What's it worth today?"); ok('owned gets value card', q() === "What's it worth today?");
  await toCard('When did you buy it?'); ok('owned gets bought-on card', q() === 'When did you buy it?');
  for (let n = 0; n < 20 && !deck.querySelector('.save'); n++) { const nx = deck.querySelector('.nx') || deck.querySelector('[data-skip]'); click(nx); await wait(10); }
  ok('owned save label', deck.querySelector('.save').textContent === 'Add to what I own', deck.querySelector('.save').textContent);
  ok('owned review edits bought card', !!deck.querySelector('[data-jump="owned"]'));
  click(deck.querySelector('.save')); click(deck.querySelector('#again')); await wait(10);
  // business path
  click(d.querySelector('#f-main [data-act="add"][data-cat="business"]')); await wait(5); const P = JSON.parse(JSON.stringify([...Array(1)])); let seen = [];
  for (let n = 0; n < 40 && !deck.querySelector('.save'); n++) { seen.push(q()); const o = deck.querySelector('[data-pick]'); if (o && !deck.querySelector('.nx')) { click(o); await wait(320); } else { nextB(); await wait(10); } }
  ok('business skips rent/tax/hoa', !seen.some((s) => /rent for|Property tax|HOA|Insurance|manage/.test(s)), seen.join(' / '));
  ok('business asks revenue and margin', seen.includes('Yearly revenue') && seen.includes('Profit margin'));
  click(deck.querySelector('.save')); click(deck.querySelector('#again')); await wait(10);
  // multi path, 5 or more
  click(d.querySelector('#f-main [data-act="add"][data-cat="homes"]')); await wait(5); await pick('Multi-family'); ok('multi asks units', q() === 'How many units?'); await pick('5 or more'); ok('5+ asks the number', q() === 'How many units or houses?' && !!deck.querySelector('input'));
  // sell later asks year
  nextB(); seen = [];
  for (let n = 0; n < 40 && q() !== "What's the long-term plan?"; n++) { const o = deck.querySelector('[data-pick]'); if (o && !deck.querySelector('.nx')) { click(o); await wait(320); } else { nextB(); await wait(10); } seen.push(q()); }
  ok('multi asks rent per unit', seen.includes('Rent per unit'), seen.join(' / ')); await pick('Sell it later'); ok('sell later asks year', q() === 'In what year?', q());
  // swipe
  const cd = () => deck.querySelector('#cardEl'); const ev = (t, x, y) => deck.dispatchEvent(new w.PointerEvent ? new w.MouseEvent(t, { bubbles: true, clientX: x, clientY: y }) : null);
  const qb = q(); const pe = (t, x, y) => { const e = new w.Event(t, { bubbles: true }); e.clientX = x; e.clientY = y; e.pointerId = 1; cd().dispatchEvent(e); };
  pe('pointerdown', 200, 300); pe('pointermove', 290, 302); pe('pointerup', 290, 302); ok('swipe right goes back', q() !== qb, qb + ' -> ' + q());
  const q2 = q(); pe('pointerdown', 200, 300); pe('pointermove', 205, 400); pe('pointerup', 205, 400); ok('vertical drag does not navigate', q() === q2);
  console.log(res.join('\n')); console.log('errors', errs); console.log(res.filter((r) => r.startsWith('PASS')).length + ' of ' + res.length + ' passed');
})();

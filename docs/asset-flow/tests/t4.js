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
  ok('empty header not repeated', !/None yet/.test(main.textContent) && /No properties yet/.test(main.textContent));
  const L = d.querySelector('#f-list .L7'), mo = L.querySelector('[data-more]'); const panel = d.getElementById(mo.getAttribute('aria-controls'));
  ok('More starts closed', panel.hidden && mo.getAttribute('aria-expanded') === 'false'); click(mo); ok('More opens loan and extra numbers', !panel.hidden && /Payment/.test(panel.textContent) && /%/.test(panel.textContent));
  ok('owned card has no cash to close', ![...L.querySelectorAll('.ac')].slice(0, 2).some((a) => /Cash to close|to close/.test(a.textContent)));
  // business SBA term
  click(btn('add', 'business')); await wait(5); await pick('Planning to buy'); nextB(); nextB(); await pick('SBA 7(a)');
  ok('SBA 7(a) shows 10 years', on() === '10 years', on()); ok('rate sits on the loan card', /^SBA 7\(a\)/.test(deck.querySelector('.o.on').textContent) && /over 10 years/.test(deck.querySelector('.lv').textContent) && !!deck.querySelector('[data-f="rate:0"]'), deck.querySelector('.lv').textContent);
  click([...deck.querySelectorAll('.chip')].find((x) => x.textContent === '7 years')); ok('term chip changes payment line', /7 years/.test(deck.querySelector('.lv').textContent) && on() === '7 years');
  nextB(); ok('SBA down 10% chip on', on() === '10%', on()); type('15'); ok('typed down payment', /\$135,000 down/.test(deck.querySelector('.lv').textContent) && on() === '', deck.querySelector('.lv').textContent + ' / ' + on());
  // commercial DSCR 30%
  click(btn('add', 'commercial')); await wait(5); await pick('Planning to buy'); nextB(); nextB(); await pick('DSCR investor loan');
  ok('commercial 25-year chip', on() === '30 years' || on() === '25 years', on()); nextB(); ok('commercial DSCR 30% chip on', on() === '30%', on());
  // pack of houses + rehab
  click(btn('add', 'homes')); await wait(5); await pick('Multi-family'); await pick('A pack of houses'); ok('pack placeholder matches math', deck.querySelector('input').placeholder === '6', deck.querySelector('input').placeholder);
  await toCard('Does it need work?'); await pick('Light refresh'); ok('rehab budget follows pick', deck.querySelector('input').placeholder === '36,000', deck.querySelector('input').placeholder);
  type('330000', 2); await toEnd(); ok('value after work in review', /Value after the work\$330,000/.test(deck.textContent));
  // owned
  click(btn('add', 'homes')); await wait(5); await pick('Single-family home'); await pick('I already own it'); const seen = await toEnd();
  ok('owned skips closing costs', !seen.includes('Closing costs'), seen.join(' / '));
  ok('owned review shows equity', /Equity/.test(deck.querySelector('.rvs').textContent) && !/Cash to close/.test(deck.querySelector('.rvs').textContent), deck.querySelector('.rvs').textContent);
  click(deck.querySelector('[data-jump="bal"]')); type('150000', 0); click(deck.querySelector('.nx')); await toEnd();
  ok('loan balance feeds equity', /Equity( i)?\$89k/.test(deck.querySelector('.rvs').textContent), deck.querySelector('.rvs').textContent);
  click(deck.querySelector('[data-jump="growth"]')); ok('growth shows 10-year value', /worth about \$\d+k in 10 years/.test(deck.textContent));
  // keyboard
  click(btn('add', 'homes')); await wait(5); const fr = d.getElementById('f-deck'); fr.focus(); fr.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
  ok('arrow key works when the frame has focus', q() === 'Do you own it yet?', q());
  console.log(res.join('\n')); console.log('errors', errs); console.log(res.filter((r) => r.startsWith('PASS')).length + ' of ' + res.length + ' passed');
})();

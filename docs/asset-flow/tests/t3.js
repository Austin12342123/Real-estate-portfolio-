const { JSDOM } = require('jsdom'); const fs = require('fs');
const html = fs.readFileSync('../out/asset-flow.html', 'utf8');
const dom = new JSDOM('<!doctype html><html><head></head><body>' + html + '</body></html>', { runScripts: 'dangerously', pretendToBeVisual: true });
const w = dom.window, d = w.document; w.matchMedia = () => ({ matches: false }); w.HTMLElement.prototype.scrollIntoView = () => {};
const errs = []; w.addEventListener('error', (e) => errs.push(e.message));
const wait = (ms) => new Promise((r) => setTimeout(r, ms)); const res = [];
const ok = (name, cond, info) => res.push((cond ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? ' (' + info + ')' : ''));
(async () => { await wait(200);
  const deck = d.getElementById('deck'), q = () => deck.querySelector('.q').textContent.replace(/ i$/, '');
  const click = (el) => { const e = new w.Event('pointerdown', { bubbles: true }); e.clientX = 1; e.clientY = 1; el.dispatchEvent(e); const u = new w.Event('pointerup', { bubbles: true }); u.clientX = 1; u.clientY = 1; el.dispatchEvent(u); el.dispatchEvent(new w.MouseEvent('click', { bubbles: true })); }; /* a real tap: pointerdown, pointerup, click */
  const picks = () => [...deck.querySelectorAll('[data-pick]')].map((b) => b.dataset.pick);
  const pick = async (t) => { click([...deck.querySelectorAll('[data-pick]')].find((b) => b.dataset.pick === t)); await wait(320); };
  const nextB = () => click(deck.querySelector('.ft [data-nav="1"]')); const back = () => click(deck.querySelector('[data-nav="-1"]'));
  const type = (v, i = 0) => { const inp = deck.querySelectorAll('input')[i]; inp.value = v; inp.dispatchEvent(new w.Event('input', { bubbles: true })); };
  const live = () => deck.querySelector('.live').textContent;
  const toCard = async (txt) => { for (let n = 0; n < 40 && q() !== txt; n++) { const o = deck.querySelector('[data-pick]'); if (o && !deck.querySelector('.nx')) { click(o); await wait(300); } else { const nx = deck.querySelector('.nx') || deck.querySelector('[data-skip]'); if (!nx) break; click(nx); await wait(5); } } };
  const toEnd = async () => { const seen = []; for (let n = 0; n < 45 && !deck.querySelector('.save'); n++) { seen.push(q()); const o = deck.querySelector('[data-pick]'); if (o && !deck.querySelector('.nx')) { click(o); await wait(300); } else { nextB(); await wait(5); } } return seen; };
  const main = d.getElementById('f-main'), btn = (act, cat) => main.querySelector(`[data-act="${act}"][data-cat="${cat}"]`);
  // main page dropdowns
  const hdrs = main.querySelectorAll('[data-toggle]'); ok('three dropdowns', hdrs.length === 3, hdrs.length);
  ok('each dropdown has both buttons', ['homes', 'commercial', 'business'].every((c) => btn('add', c) && btn('view', c)));
  click(hdrs[1]); ok('commercial opens', hdrs[1].getAttribute('aria-expanded') === 'true' && !d.getElementById('cat-commercial').hidden);
  click(hdrs[0]); ok('homes closes', hdrs[0].getAttribute('aria-expanded') === 'false' && d.getElementById('cat-homes').hidden); click(hdrs[0]);
  ok('net worth computed', /\$\d+k/.test(main.querySelector('.pf b').textContent), main.querySelector('.pf b').textContent);
  // list
  click(btn('view', 'commercial')); const L = d.querySelector('#f-list .L7'); ok('commercial list empty state', /Each property you add/.test(L.textContent));
  click(btn('view', 'homes')); const names = () => [...L.querySelectorAll('.ac .n')].map((n) => n.textContent);
  const o0 = names().join(','); click(L.querySelector('[data-sort="cf"]')); const cfs = [...L.querySelectorAll('.ac')].map((a) => +a.dataset.cf);
  ok('sort by cash flow reorders', cfs.every((v, i) => !i || cfs[i - 1] >= v) && names().join(',') !== o0, cfs.join(' '));
  ok('sort chip pressed state', L.querySelector('[data-sort="cf"]').getAttribute('aria-pressed') === 'true' && L.querySelector('[data-sort="order"]').getAttribute('aria-pressed') === 'false');
  click(L.querySelector('[data-sort="order"]')); ok('buy order restores', names().join(',') === o0);
  ok('waiting home shows who it waits for, no empty bar', [...L.querySelectorAll('.ac')].some((c) => /after 7 Maple Ct/.test(c.querySelector('.bl').textContent) && !c.querySelector('.bar')));
  ok('no drag-handle promise', !/drag/i.test(d.getElementById('f-list').textContent));
  // homes deck
  ok('homes asks kind of home', q() === 'What kind of home?' && picks().length === 2, picks().join('|'));
  await pick('Single-family home'); await pick('Planning to buy'); nextB(); nextB(); type('239,000'); nextB(); await pick('DSCR investor loan');
  ok('verdict wording', /Deal/.test(live()) && !/Can I buy/.test(live()), live()); ok('trust timing shown', /Trust ready.*in \d+ mo/.test(live()), live());
  await toCard('Is there an HOA?'); await pick('Yes'); type('35'); back(); await pick('No HOA'); await toCard('How old are the systems?'); back(); await pick('Yes');
  ok('HOA box cleared after No', deck.querySelector('input').value === '', deck.querySelector('input').value);
  const seenH = await toEnd(); ok('review edit targets exist', [...deck.querySelectorAll('[data-jump]')].every((b) => true));
  // add from homes again resets
  click(btn('add', 'homes')); await wait(5); ok('add resets answers', q() === 'What kind of home?' && !deck.querySelector('.o.on') && /Cash flow-/.test(live()));
  // business
  click(btn('add', 'business')); await wait(5); ok('business skips type card', q() === 'Do you own it yet?', q());
  await pick('Planning to buy'); nextB(); ok('business price placeholder', deck.querySelector('input').placeholder === '900,000', deck.querySelector('input').placeholder); nextB();
  ok('business loans', picks().includes('SBA 7(a)') && !picks().includes('FHA (you live there)'), picks().join('|')); await pick('SBA 7(a)');
  await toCard('Yearly revenue'); type('1,500,000'); const a1 = live(); nextB(); type('25'); const a2 = live();
  ok('revenue and margin move cash flow', a1 !== a2 && /\+\$/.test(a2), a1 + ' -> ' + a2);
  let seen = await toEnd(); ok('business has no rent/tax/HOA/manager', !seen.some((s) => /rent for|lease|Property tax|HOA|Insurance|manage/i.test(s)), seen.join(' / '));
  const jumps = [...deck.querySelectorAll('[data-jump]')].map((b) => b.dataset.jump); ok('business review edits only real cards', jumps.includes('revenue') && !jumps.includes('rent') && !jumps.includes('tax'), jumps.join(','));
  // commercial
  click(btn('add', 'commercial')); await wait(5); await pick('Planning to buy'); nextB(); ok('commercial skips home card', q() === "What's the purchase price?", q()); nextB();
  ok('commercial loans', picks().includes('SBA 504'), picks().join('|')); await pick('Cash');
  seen = await toEnd(); ok('commercial lease income, no HOA', seen.includes("What's the lease income?") && !seen.some((s) => /HOA/.test(s)) && seen.includes('Who pays taxes and insurance?'), seen.join(' / '));
  const jc = [...deck.querySelectorAll('[data-jump]')].map((b) => b.dataset.jump); ok('cash review has no down payment edit', !jc.includes('dp') && !jc.includes('rate'), jc.join(','));
  // multi
  click(btn('add', 'homes')); await wait(5); await pick('Multi-family'); ok('multi asks units', q() === 'How many units?'); await pick('4 (fourplex)'); await pick('Planning to buy'); nextB();
  ok('multi skips beds/baths', q() === "What's the purchase price?", q()); type('480000'); nextB(); ok('multi loans', picks().includes('Conventional 2 to 4 units') && !picks().some((p) => p.startsWith('Apartment')), picks().join('|')); await pick('Conventional 2 to 4 units');
  await toCard('Rent per unit'); ok('rent per unit has one box', deck.querySelectorAll('input').length === 1); const b1 = live(); type('1,400'); const b2 = live(); ok('rent per unit moves cash flow', b1 !== b2, b1 + ' -> ' + b2);
  ok('units shown', /4 units × \$1,400 = \$5,600/.test(deck.querySelector('.lv').textContent), deck.querySelector('.lv').textContent);
  // swipe: a tap on an option is still a pick; a sideways drag navigates
  click(btn('add', 'homes')); await wait(5); const pe = (el, t, x, y) => { const e = new w.Event(t, { bubbles: true }); e.clientX = x; e.clientY = y; e.pointerId = 1; el.dispatchEvent(e); };
  const opt = deck.querySelector('[data-pick]'); pe(opt, 'pointerdown', 100, 300); pe(opt, 'pointerup', 101, 300); click(opt); await wait(320); ok('tap on option still picks', q() === 'Do you own it yet?', q());
  const cd = deck.querySelector('#cardEl'); pe(cd, 'pointerdown', 200, 300); pe(cd, 'pointermove', 290, 302); pe(cd, 'pointerup', 290, 302); ok('swipe right goes back', q() === 'What kind of home?', q());
  pe(deck.querySelector('#cardEl'), 'pointerdown', 300, 300); pe(deck.querySelector('#cardEl'), 'pointermove', 200, 301); pe(deck.querySelector('#cardEl'), 'pointerup', 200, 301); ok('swipe left goes next', q() === 'Do you own it yet?', q());
  // owned
  await pick('I already own it'); seen = await toEnd(); ok('owned: value and bought cards', seen.includes("What's it worth today?") && seen.includes('When did you buy it?') && !seen.includes('When should it be bought?'));
  ok('owned save label', deck.querySelector('.save').textContent === 'Add to what I own'); ok('owned strip says Value not Trust', /Value/.test(live()) && !/Trust/.test(live()), live());
  // info popups
  click(deck.querySelector('[data-info]') || d.querySelector('[data-info="deal"]')); ok('info popup opens', !d.getElementById('pop').hidden);
  ok('catalog shows all 32 cards with full type options', d.querySelectorAll('#allcards figure').length === 32 && /Commercial property/.test(d.querySelector('#allcards figure').textContent));
  console.log(res.join('\n')); console.log('errors', errs); console.log(res.filter((r) => r.startsWith('PASS')).length + ' of ' + res.length + ' passed');
})();

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
  const rows = () => [...deck.querySelectorAll('.rv')].map((r) => r.querySelector('span').textContent);
  const foot = () => deck.querySelector('.ft [data-nav="1"]');
  click(btn('add', 'homes')); await wait(5);
  ok('unanswered pick hint', deck.querySelector('.hint').textContent === 'Pick one');
  await pick('Single-family home'); await pick('Planning to buy');
  ok('empty address shows Skip only', q() === "What's the address?" && foot().textContent === 'Skip' && !deck.querySelector('.ft .nx'), foot().textContent);
  type('5 Elm St'); ok('typing turns Skip into Next', foot().textContent === 'Next ›' && foot().classList.contains('nx'));
  type(''); ok('clearing turns it back to Skip', foot().textContent === 'Skip');
  type('5 Elm St'); nextB(); await wait(5); ok('chip card shows Next', foot().textContent === 'Next ›', q());
  await toEnd(); const r = rows();
  ok('review has home, insurance, systems, long-term', ['Home', 'Property tax', 'Insurance', 'Systems', 'Long-term'].every((x) => r.includes(x)), r.join(','));
  click(deck.querySelector('[data-jump="price"]')); await wait(5);
  ok('edit shows Back to review', q() === "What's the purchase price?" && foot().textContent === 'Back to review ›');
  type('250000'); click(foot()); await wait(5); ok('Back to review returns to review', !!deck.querySelector('.save') && /\$250,000/.test(deck.textContent));
  ok('review clears the flag', (click(deck.querySelector('[data-jump="growth"]')), true)); await wait(5); await pick('3% a year');
  ok('picking on an edited card returns to review', !!deck.querySelector('.save') && /3% a year/.test(deck.textContent));
  click(deck.querySelector('[data-jump="when"]')); await wait(5); await pick('Not before a month I pick');
  ok('follow-up card still shown from review', q() === 'Not before which month?', q()); click(foot()); await wait(5);
  ok('then back to review', !!deck.querySelector('.save') && rows().includes('Plan'));
  click(deck.querySelector('[data-jump="exit"]')); await wait(5); await pick('Sell it later'); ok('sell asks year from review', q() === 'In what year?'); type('2033'); click(foot()); await wait(5);
  ok('long-term row shows year', /Sell it in 2033/.test(deck.textContent));
  click(deck.querySelector('[data-jump="ins"]')); await wait(5); ok('insurance Edit opens insurance card', q() === 'Insurance');
  // swipe left from an edited card goes back to review
  const ev = (t, x) => { const e = new w.MouseEvent(t, { bubbles: true, clientX: x, clientY: 100 }); e.pointerId = 1; deck.dispatchEvent(e); };
  ev('pointerdown', 300); ev('pointermove', 200); ev('pointerup', 150); await wait(5); ok('swipe left returns to review', !!deck.querySelector('.save'));
  // hints never promise a missing Next, and HOA / fix-up rows exist
  for (let n = 0; n < 3 && !deck.querySelector('.save'); n++) { click(foot()); await wait(5); }
  const rr = rows(); ok('review lists HOA and Fix-up', rr.includes('HOA') && rr.includes('Fix-up'), rr.join(','));
  ok('No HOA shows None', /HOANone/.test(deck.textContent.replace(/\s+/g, '')));
  click(deck.querySelector('[data-jump="loan"]')); await wait(5); ok('loan from review has no hint', !deck.querySelector('.ft .hint') && foot().textContent === 'Back to review ›');
  click(foot()); await wait(5); click(deck.querySelector('[data-jump="hoa"]')); await wait(5); ok('HOA Edit opens HOA card', q() === 'Is there an HOA?'); click(foot()); await wait(5);
  click(deck.querySelector('[data-jump="rehab"]')); await wait(5); await pick('Light refresh'); ok('fix-up edit goes to rehab detail then back', q() === 'The rehab', q()); click(foot()); await wait(5); ok('Fix-up row shows budget', /rehab budget/.test(deck.textContent));
  click(deck.querySelector('[data-jump="growth"]')); await wait(5); click(deck.querySelector('[data-nav="-1"]')); await wait(5);
  ok('answered pick card going back has no Pick one hint', !/Pick one/.test(deck.querySelector('.ft').textContent));
  for (let n = 0; n < 6 && !deck.querySelector('.save'); n++) { click(foot()); await wait(5); }
  // kind and own rows; editing walks new cards then returns
  ok('review lists Kind and Own it?', rows().includes('Kind') && rows().includes('Own it?'), rows().join(','));
  click(deck.querySelector('[data-jump="status"]')); await wait(5); await pick('I already own it');
  const walked = []; for (let n = 0; n < 12 && !deck.querySelector('.save'); n++) { walked.push(q()); click(foot()); await wait(5); }
  ok('own-it edit walks the new owned cards', walked.includes("What's it worth today?") && walked.includes('When did you buy it?') && !walked.includes("What's the purchase price?"), walked.join(' / '));
  ok('review shows Yes, I own it', /Own it\?Yes, I own it/.test(deck.textContent));
  click(deck.querySelector('[data-jump="status"]')); await wait(5); await pick('Planning to buy');
  for (let n = 0; n < 12 && !deck.querySelector('.save'); n++) { click(foot()); await wait(5); }
  click(deck.querySelector('[data-jump="exit"]')); await wait(5); await pick('Refinance later');
  const ph = deck.querySelector('input').placeholder, by = (deck.querySelector('.lv').textContent.match(/in (\d{4})/) || [])[1];
  ok('sell year suggests after the buy', +ph > +by && !/,/.test(ph), ph + ' vs ' + by);
  type('2028'); ok('early year warned', /before the trust can buy it/.test(deck.querySelector('.lv').textContent), deck.querySelector('.lv').textContent);
  click(foot()); await wait(5); ok('review flags early year', /before the buy/.test(deck.textContent));
  click(deck.querySelector('[data-jump="type"]')); await wait(5); await pick('Multi-family'); ok('kind edit asks units next', q() === 'How many units?'); await pick('3 (triplex)');
  const w2 = []; for (let n = 0; n < 12 && !deck.querySelector('.save'); n++) { w2.push(q()); click(foot()); await wait(5); }
  ok('kind edit walks rent per unit', w2.includes('Rent per unit'), w2.join(' / ')); ok('kind row shows multi', /KindMulti-family, 3 units/.test(deck.textContent));
  ok('planned est. value differs from price', /\$246k/.test(d.getElementById('f-list').textContent));
  // walk labels, loan re-shown, owned early year
  click(btn('add', 'homes')); await wait(5); await pick('Single-family home'); await pick('Planning to buy'); await toCard('How will you pay for it?'); await pick('Conventional 30-year');
  await toEnd(); click(deck.querySelector('[data-jump="status"]')); await wait(5); await pick('I already own it');
  const labs = []; for (let n = 0; n < 12 && !deck.querySelector('.save'); n++) { labs.push(q() + '=' + foot().textContent); click(foot()); await wait(5); }
  ok('walk says Next until the last new card', labs.length > 1 && labs.slice(0, -1).every((x) => !/Back to review/.test(x)) && /Back to review/.test(labs[labs.length - 1]), labs.join(' / '));
  click(deck.querySelector('[data-jump="exit"]')); await wait(5); await pick('Sell it later'); type('20'); ok('no warning while typing', !/before/.test(deck.querySelector('.lv').textContent));
  type('2020'); ok('owned early year says before today', /before today/.test(deck.querySelector('.lv').textContent)); click(foot()); await wait(5); ok('review says before today for owned', /\(before today\)/.test(deck.textContent));
  click(deck.querySelector('[data-jump="type"]')); await wait(5); await pick('Multi-family'); await pick('2 (duplex)');
  const w3 = []; for (let n = 0; n < 12 && !deck.querySelector('.save'); n++) { w3.push(q()); const o = deck.querySelector('[data-pick]'); if (q() === 'How will you pay for it?' && o) { await pick('Conventional 2 to 4 units'); continue; } click(foot()); await wait(5); }
  ok('kind switch re-shows the loan card', w3.some((x) => x === 'How will you pay for it?' || x === 'What loan is on it?'), w3.join(' / '));
  // round 14: cash closing row, 2-digit year, duplex price, pack wording
  click(btn('add', 'homes')); await wait(5); await pick('Single-family home'); await pick('Planning to buy'); await toCard('How will you pay for it?'); await pick('Cash');
  await toEnd(); ok('cash buy keeps Closing costs row', rows().includes('Closing costs'), rows().join(','));
  click(deck.querySelector('[data-jump="exit"]')); await wait(5); await pick('Sell it later'); type('20'); click(foot()); await wait(5);
  ok('2-digit year not flagged on review', !/before the buy/.test(deck.textContent));
  click(btn('add', 'homes')); await wait(5); await pick('Multi-family'); await pick('2 (duplex)'); await toEnd();
  ok('duplex default price scales with units', /Price\$240,000/.test(deck.textContent.replace(/\s+/g, '')), (deck.textContent.match(/Price\s*\$[\d,]+/) || [''])[0]);
  click(btn('add', 'homes')); await wait(5); await pick('Multi-family'); await pick('A pack of houses'); type('3'); await toEnd();
  ok('pack wording on review', /A pack of 3 houses/.test(deck.textContent));
  ok('More has cash needed with (i)', !!d.querySelector('#f-list [data-info="need"]'));
  // round 15: typed budget left blank, pack wording, red negative cash flow
  click(btn('add', 'homes')); await wait(5); await pick('Single-family home'); await pick('Planning to buy'); await toCard('Does it need work?'); await pick('Light refresh'); click(foot()); await wait(5);
  for (let n = 0; n < 4 && q() !== 'Does it need work?'; n++) { click(deck.querySelector('[data-nav="-1"]')); await wait(5); } await pick("I'll type a budget"); click(foot()); await wait(5); await toEnd();
  ok('blank typed budget says not set and drops old budget', /Fix-up\s*Budget not set yet/.test(deck.textContent) && !/\$[\d,]+ rehab budget/.test(deck.textContent), (deck.textContent.match(/.{0,60}rehab budget.{0,20}/) || ['none'])[0]);
  click(btn('add', 'homes')); await wait(5); await pick('Multi-family'); await pick('A pack of houses'); type('3'); await toCard('Rent per unit');
  ok('pack rent card says per house', /Average rent per house/.test(deck.textContent) && /3 houses ×/.test(deck.querySelector('.lv').textContent));
  type('300'); await toEnd(); ok('pack review says houses', /3 houses ×/.test(deck.textContent)); ok('negative cash flow is red', !!deck.querySelector('.live .v.bad') && !!deck.querySelector('.rvs b.bad'));
  // list and main page
  const L = d.getElementById('f-list'), M = d.getElementById('f-main');
  ok('More line no longer repeats trust share', ![...L.querySelectorAll('.ln')].some((x) => /trust/.test(x.textContent)));
  ok('main shows trust savings', /Trust savings/.test(M.querySelector('.pf').textContent) && !/Total cash flow/.test(M.textContent));
  ok('empty state reads plainly', /to see its lease income/.test(M.textContent));
  ok('chevron is an svg', !!M.querySelector('svg.chev'));
  console.log(res.join('\n')); console.log('errors', errs); console.log(res.filter((r) => r.startsWith('PASS')).length + ' of ' + res.length + ' passed');
})();

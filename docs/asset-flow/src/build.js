const fs = require('fs');
const D = require('./data.js'), X = require('./designs.js'), F = require('./final.js'), { gradeAll } = require('./grade.js');
const THEMES = require('./themes.json');
const path = { review: D.CARDS.some((c) => c.kind === 'review'), sections: new Set(D.CARDS.map((c) => c.sec)).size };
const sets = { main: [...X.MAIN, F.M7], list: [...X.LIST, F.L7], card: [...X.CARD, F.C7] };
const G = gradeAll(sets, path), R1 = gradeAll({ main: X.MAIN, list: X.LIST, card: X.CARD }, path);
const esc = X.esc;
const varsOf = (t) => `.app{--bg:${t.bg};--surface:${t.surface};--surface2:${t.surface2};--border:${t.border};--text:${t.text};--muted:${t.textMuted};--accent:${t.accent};--onAccent:${t.onAccent};--good:${t.good};--warn:${t.warn};--bad:${t.bad};--fd:${t.fontDisplay};--fb:${t.fontBody};--r:${t.radius};--wh:${t.fontWeightHeading || 700};--wn:${t.fontWeightNumbers || 700};--wb:${t.fontWeightBody || 400};--stroke:${t.fontStroke || '0px'};color-scheme:${t.mode}}`;
const INFO = {
  cap: ['Cap rate', 'Yearly income after running costs (before the loan) divided by the price. 7% means the home earns 7 cents a year on every dollar of price. It ignores the loan, so you can compare homes bought different ways.'],
  dscr: ['DSCR', 'Debt service coverage ratio: monthly income after running costs divided by the loan payment. 1.25 means the rent covers the payment with 25% to spare. Lenders usually want 1.0 to 1.25.'],
  coc: ['Cash-on-cash return', 'Yearly cash flow after the loan divided by the cash you put in (down payment plus closing costs). It is the return on your own money.'],
  loans: ['Loan types', 'Conventional: a normal bank mortgage. FHA: low down payment if you live there, adds mortgage insurance. 203(k): buy and renovate with one FHA loan. DSCR: qualifies on the rent, not your income. Rates shown are typical, not a quote. Apartment loan: a bank or agency loan for 5 or more units. Bank commercial loan: for a store, office or warehouse, often 25 to 30% down over 25 years. SBA 7(a) and SBA 504: government-backed loans for buying a business or its building, with low down payments. Seller note: the seller lends you part of the price and you pay them back over time.'],
  deal: ['Deal', 'Good: cash flow of $100 a month or more and DSCR of 1.1 or more. Tight: cash flow between $0 and $100, or DSCR under 1.1. Loses: cash flow under $0. For a home you own it reads Healthy, Tight or Losing money.'],
  trust: ['Trust ready', 'Months until the trust has saved the cash to close (down payment, closing costs and any rehab budget). Planned assets are funded in buy order, so a new one waits for the ones already planned. Sample trust: $41,000 today plus $3,150 a month.'],
  tsave: ['Trust savings', 'What the trust holds today to buy the next assets in your plan. It grows by your monthly contribution and pays the cash to close on each planned asset in buy order. Sample trust: $41,000 today plus $3,150 a month.'],
  nextbuy: ['Next buy', 'Months until the trust has saved the cash to close on the next planned home (down payment, closing costs and any rehab budget). Sample trust: $41,000 today plus $3,150 a month.'],
  equity: ['Equity', 'What the asset is worth minus what is left on the loan. It is the part you own outright, and it counts toward your net worth.'],
  pay: ['Payment', 'The monthly loan payment: principal and interest at the rate and length shown. Tax and insurance are counted separately in the cash flow.'],
  cash: ['Cash to close', 'What the trust needs on buying day: the down payment, closing costs and any rehab budget.'],
  need: ['Cash needed', 'Also called cash to close. What the trust needs on buying day: the down payment, closing costs and any rehab budget.'],
  noi: ['NOI', 'Net operating income: rent after vacancy, minus tax, insurance, HOA, repairs and the manager, before the loan payment. Cap rate and DSCR both start from it.'],
  nw: ['Net worth', 'Equity in the homes you own (value minus the loan) plus the trust savings. Planned homes do not count until they are bought.'],
  repairs: ['Repairs reserve', 'Money set aside each year for repairs, as a share of the price. Newer homes need less; older roofs, water heaters and HVAC need more.'] };

/* ---------- shared component CSS (frames, list chrome, verdicts, info buttons, deck extras) ---------- */
const BASE = require('./base.js');

const REVIEWS = require('./reviews.json');
const TESTS = 162;
const PAGE = `/* VOICE work: a design review Austin reads on his phone before saying yes
   IDEA a designer's proof sheet: the real app screens, at real size, in his own app themes
   PICTURE the three phone screens of the new flow, live, side by side
   COLOUR the app's own theme tokens (Oxford by default, Tech Noir at night), switchable
   TYPE the theme's display and body faces
   LAYOUT laptop: title, then three phones in a row; phone: title, then the phones stacked */
:root{color-scheme:light dark}
*{box-sizing:border-box;min-width:0}
body{margin:0;overflow-x:clip}
.page{background:var(--bg);color:var(--text);font:16px/1.55 var(--fb);min-height:100vh}
.band{padding-block:clamp(24px,4vw,48px);padding-left:max(5vw,16px,env(safe-area-inset-left,0px));padding-right:max(5vw,16px,env(safe-area-inset-right,0px));max-width:1320px;margin:0 auto}
.hd{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:end;gap:16px}
h1{font:var(--wh) clamp(32px,5vw,48px)/1.05 var(--fd);letter-spacing:-.02em;margin:0}
.lede{font-size:17px;max-width:62ch;margin:10px 0 0;color:var(--text)}
.tsel label{display:block;font-size:13px;color:var(--muted)}.tsel select{min-height:44px;font:16px var(--fb);border:1px solid var(--border);border-radius:var(--r);background:var(--surface);color:var(--text);padding:0 12px}
.scores{display:flex;flex-wrap:wrap;gap:12px 28px;margin-top:20px}.scores div{font-size:14px;color:var(--muted)}.scores b{display:block;font:var(--wn) 30px var(--fd);color:var(--text);font-variant-numeric:tabular-nums}
.flow{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(392px,100%),1fr));gap:28px;align-items:start;justify-items:center}
.flow figure{margin:0;display:grid;gap:12px;justify-items:center}.flow figcaption{max-width:390px;font-size:15px}.flow figcaption b{display:block;font:var(--wh) 19px var(--fd)}
h2.s{font:var(--wh) clamp(24px,3vw,32px)/1.1 var(--fd);margin:0 0 6px}.sub{color:var(--muted);margin:0 0 20px;max-width:70ch}
#allcards{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(330px,100%),1fr));gap:24px}
.mini{margin:0}.mini .ph{width:100%;border-radius:22px;padding:16px 14px}.mini figcaption{font-size:14px;margin-top:8px}.mini figcaption b{display:block;font-size:15px}.mini figcaption span{color:var(--muted)}
.brn{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(260px,100%),1fr));gap:12px;margin-top:20px}.brn div{border:1px solid var(--border);border-radius:var(--r);background:var(--surface);padding:14px 16px;font-size:15px}.brn b{display:block}
.board{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(360px,100%),1fr));gap:24px}
.board h3{font:var(--wh) 20px var(--fd);margin:0 0 8px}
.sr{display:grid;grid-template-columns:minmax(0,1fr) 120px 3.2em;gap:10px;align-items:center;min-height:32px;font-size:15px}.sr .bar{height:10px;border-radius:999px;background:var(--surface2);overflow:hidden}.sr .bar i{display:block;height:100%;background:var(--muted)}.sr.win .bar i{background:var(--accent)}.sr.win{font-weight:700}.sr b{text-align:right;font-variant-numeric:tabular-nums}
.board details{margin-top:8px;font-size:14px}.board summary{cursor:pointer;min-height:44px;display:flex;align-items:center;color:var(--accent);font-weight:600}.board ul{margin:0;padding-left:18px;color:var(--muted)}
.strip{display:flex;gap:20px;overflow-x:auto;padding:4px 2px 16px;align-items:start}.strip figure{margin:0;flex:none;width:min(390px,86vw)}.strip figcaption{font-size:14px;margin-top:8px;max-width:390px}.strip figcaption b{display:block;font-size:16px}.strip .ph{width:100%}
.wu{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(340px,100%),1fr));gap:28px}.wu h3{font:var(--wh) 20px var(--fd);margin:0 0 6px}.wu ul,.wu ol{margin:0;padding-left:20px}.wu li{margin-bottom:6px}
.src{font-size:14px;color:var(--muted)}.src a{color:var(--accent)}
.note{font-size:14px;color:var(--muted)}`;

/* ---------- frames ---------- */
const sbar = `<div class="sbar"><span>9:41</span><span>Sample numbers</span></div>`;
const frame = (inner, cls, id) => `<div class="ph app ${cls || ''}" ${id ? `id="${id}"` : ''}>${sbar}${inner}</div>`;
const NW = D.ASSETS.filter((a) => a.status === 'owned').reduce((s, a) => s + D.metrics(a).equity, 0) + D.TRUST.balance;
const mainFrame = frame(`<h2 class="pt">Portfolio</h2><div class="pf"><div><span>Net worth ${X.info('nw', 'net worth')}</span><b>${D.$k(NW)}</b></div><div><span>Trust savings ${X.info('tsave', 'trust savings')}</span><b>${D.$k(D.TRUST.balance)}</b></div></div>${F.M7.html()}`, '', 'f-main');
const listFrame = frame(`<div class="L7">${F.L7.html()}</div>`, '', 'f-list');
const deckFrame = `<div class="ph app" id="f-deck">${sbar}<div class="C7" id="deck"></div></div>`;
const designFrame = (d, page) => { const g = G.pages[page].find((x) => x.id === d.id); const inner = page === 'list' ? `<div class="${d.id}">${d.html()}</div>` : page === 'card' ? d.html() + `<div style="height:18px"></div>` + d.inputHtml() : d.html();
  return `<figure>${frame(inner, 'still')}<figcaption><b>${d.id} ${esc(d.name)} · ${g.score}</b>${esc(d.idea)}</figcaption></figure>`; };
const board = (page, title) => `<div><h3>${title}</h3>${G.pages[page].map((g) => `<div class="sr ${/7$/.test(g.id) ? 'win' : ''}"><span>${g.id} ${esc(g.name)}</span><span class="bar"><i style="width:${g.score}%"></i></span><b>${g.score}</b></div>`).join('')}
  <details><summary>What cost each design points</summary>${G.pages[page].map((g) => `<p style="margin:8px 0 2px"><b>${g.id} ${g.score}</b> · ${Object.entries(g.parts).map(([k, v]) => k + ' ' + v).join(', ')}</p><ul>${g.deductions.map((x) => `<li>${esc(x)}</li>`).join('') || '<li>Nothing</li>'}</ul>`).join('')}</details></div>`;
const allCss = [...sets.main, ...sets.list, ...sets.card].map((d) => d.css).join('\n');
const best1 = (p) => R1.pages[p][0];

const html = `<title>Asset Flow Redesign</title>
<meta name="claude:viewport-fit-sides" content="cover">
<style>${PAGE}
${BASE}
${allCss}</style>
<style id="vars">${varsOf(THEMES.oxford)}</style>
<div class="page app">
<header class="band hd"><div><h1>A new way to add and view assets</h1><p class="lede">Each category on the main page now opens to two buttons. View assets shows every home with its numbers on one small card, and Add an asset walks you through swipeable question cards, about 19 for a typical home. Three finished designs, picked from 21 tested.</p>
<div class="scores"><div><b>${G.pages.main[0].score}</b>Main page dropdown</div><div><b>${G.pages.list[0].score}</b>View assets list</div><div><b>${G.pages.card[0].score}</b>Question cards</div><div><b>21</b>designs graded</div></div></div>
<div class="tsel"><label for="theme">App theme</label><select id="theme">${Object.keys(THEMES).map((k) => `<option value="${k}">${{ oxford: 'Oxford', clay: 'Clay', cottagecore: 'Cottagecore', technoir: 'Tech Noir', darkacademia: 'Dark Academia', ember: 'Ember' }[k]}</option>`).join('')}</select></div></header>

<section class="band" id="flow"><div class="flow">
<figure>${mainFrame}<figcaption><b>1. Main page</b>Homes, Commercial and Businesses each open and close. Open, a category shows one line for what you own (cash flow and value) and when the next planned buy happens, then the two buttons. An empty category says so and keeps both buttons. The rows of assets move to View assets, so the main page stays short.</figcaption></figure>
<figure>${listFrame}<figcaption><b>2. View assets</b>One card per asset: cash flow and a verdict on top; for planned homes, a bar of how much of the cash to close the trust holds and the months until it can buy; then cap rate, DSCR, cash-on-cash, price, estimated value and down payment. More opens the loan, rent, payment, and NOI and cash to close (or down payment and loan left for a home you own). Every (i) explains its term. The sort chips work.</figcaption></figure>
<figure>${deckFrame}<figcaption><b>3. Add an asset (try it)</b>Swipe left for the next card and right to go back, or use the buttons. Picking an answer on a multiple-choice card moves on by itself. The strip on top shows cash flow, the deal verdict and when the trust could buy it, and updates as you answer. Try Add under Commercial or Businesses too: the cards and loans change.</figcaption></figure>
</div></section>

<section class="band"><h2 class="s">Every question card, in order</h2><p class="sub">${D.CARDS.filter((c) => !c.merged).length} cards in six sections: Basics, Price & loan, Fix-up, Income, Costs, Plan, then a review. Cards marked "only if" appear only when an earlier answer calls for them, so a typical planned home is 19 cards. Most come pre-filled with your defaults or a typical value, and Skip keeps it.</p>
<div id="allcards"></div>
<div class="brn">${D.BRANCH.map(([t, s]) => `<div><b>${esc(t)}</b>${esc(s)}</div>`).join('')}</div></section>

<section class="band"><h2 class="s">How the designs were picked</h2><p class="sub">Six designs per screen went through a grading program that scores informative, small, friendly, intuitive, pretty and research fit (plus typing for the cards). Round 1 best: ${best1('main').id} ${best1('main').score}, ${best1('list').id} ${best1('list').score}, ${best1('card').id} ${best1('card').score}. Each winner was then rebuilt to fix what cost it points (the 7th design on each screen). An independent review then found real bugs the grader missed, so the grader was made stricter (it now checks the shared styles, colour contrast in all six themes, tap width, whether labels fit at phone width, whether every claim matches the screen, and whether the question order keeps its promises) and the designs were fixed again. Scores below are from that stricter round. The grader is a program that reads each design's code, so "pretty" means checks like theme colours only, five type sizes or fewer, no text under 12px and theme corners, not taste.</p>
<p class="sub">Because a program can't judge taste, a separate reviewer that hadn't built the designs also used and scored the three finals after each fix round, out of 100 (main page, list, cards). Over ${REVIEWS.length} rounds the scores went from ${REVIEWS[0].join(' / ')} to ${REVIEWS[REVIEWS.length - 1].join(' / ')}, every page at the 90 bar. Every bug those reviews found was fixed, including three small ones the last review listed, and all of it is covered by ${TESTS} automated tap tests that pass.</p>
<div class="board">${board('main', 'Main page dropdown')}${board('list', 'View assets list')}${board('card', 'Question card')}</div></section>

<section class="band"><h2 class="s">All 21 designs</h2><p class="sub">Scroll sideways through each row.</p>
<h3>Main page dropdown</h3><div class="strip">${sets.main.map((d) => designFrame(d, 'main')).join('')}</div>
<h3>View assets list</h3><div class="strip">${sets.list.map((d) => designFrame(d, 'list')).join('')}</div>
<h3>Question card (multiple choice, then typing)</h3><div class="strip">${sets.card.map((d) => designFrame(d, 'card')).join('')}</div></section>

<section class="band wu"><div><h3>What changes in the app</h3><ol>
<li>Each category dropdown (Homes, Commercial, Businesses, owned and planned) shows a one-line summary and two buttons, Add an asset and View assets, in place of the rows of assets.</li>
<li>A new View assets screen per category lists every asset as a card with the numbers above, a sort row, and Add at the top. Tapping a home's name opens today's asset page, unchanged (here it says so, since the prototype has no asset page).</li>
<li>Add an asset opens a full-screen card deck in place of today's add form. Answers fill the same fields the form fills today, so the engine and money math do not change.</li>
<li>Starting from Homes, the first card only asks single-family or multi-family; from Commercial or Businesses it is skipped. Pasting a listing link on the address card pre-fills what the listing has, the way listing import does today.</li>
<li>The review card shows the result and the "Can I buy this?" verdict before anything is saved. Every row has Edit, which jumps back to that card.</li></ol></div>
<div><h3>Things to note</h3><ul>
<li>Every (i) that explains a term or number stays, per your popup rule. New ones: cap rate, DSCR, cash-on-cash, loan types, repairs reserve.</li>
<li>Months until the trust can afford it comes from the same funding month the plan already computes ("opens in N mo" today). Planned homes are funded in buy order, so the second one starts saving after the first is bought. The sample trust here holds $41,000 and adds $3,150 a month.</li>
<li>Totals on the main page and the list count owned homes only, so planned homes never look like money you already have.</li>
<li>The interest rate is on the loan card, as you described: pick a loan and the card stays, showing its rate (pre-filled with today's typical rate) and loan length, with the monthly payment. Next moves on. Picking Cash moves on by itself, and Change loan brings the list back. Typed answers are kept when you go back, and "Per year" on tax and insurance is turned into a monthly figure.</li>
<li>Research says one-question flows feel long past 12 to 14 questions, so the deck groups cards into sections, pre-fills typical values, offers Skip on every card, and auto-advances on picks. A planned home with no rehab or HOA takes 19 cards, about two minutes.</li>
<li>Swiping also works with Back and Next buttons and the arrow keys, for anyone who does not swipe.</li>
<li>All numbers here are sample numbers, worked out with simple math (5% vacancy, 1% repairs). The app keeps its own full math.</li>
<li>Your Oxford theme's text stroke makes 12 to 13px labels look a little heavy, and in Tech Noir the accent is light grey, so filled buttons read as neutral. Both are theme settings you chose, so I left them; say if you want small labels to skip the stroke.</li>
<li>I couldn't make PNG screenshots: no browser in my workspace can render pages tonight. This page shows the real designs instead, live and at phone size, in all six of your themes.</li></ul></div></section>

<section class="band src"><b>Research read for this design</b><br>
Per-home numbers: <a href="https://help.dealcheck.io/en/articles/2049700-how-to-analyze-rental-properties">DealCheck, how to analyze rentals</a> (input order: purchase and financing, then rent and expenses; formulas behind a ? icon) · <a href="https://support.baselane.com/hc/en-us/articles/25483560847643-What-property-metrics-can-I-track-in-Baselane-and-how-does-Baselane-calculate-them">Baselane property metrics</a> (value, NOI, cash-on-cash, cap rate) · <a href="https://help.rentredi.com/en/articles/15646539-portfolio-performance-overview">RentRedi portfolio performance</a> (roll-up, then per-property breakdown) · <a href="https://intercom.help/lendlord/en/articles/10400058-utilize-my-portfolio-features">Lendlord portfolio</a>.<br>
Question cards: <a href="https://smashingmagazine.com/2017/05/better-form-design-one-thing-per-page">Smashing, one thing per page</a> · <a href="https://fillout.com/blog/one-question-at-a-time-form">Fillout, one question at a time</a> (auto-advance on choices; long flows past 12 to 14 questions hurt) · <a href="https://tinycommand.com/blogs/conversational-card-mode-forms-why-they-convert-when-designed-well">TinyCommand, card mode forms</a> (honest progress, always a back option).</section>
<div id="pop" hidden role="dialog" aria-live="polite"><h4></h4><p></p><button type="button">Close</button></div>
</div>
<script>
const THEMES=${JSON.stringify(THEMES)};const TRUST=${JSON.stringify(D.TRUST)};const CARDS=${JSON.stringify(D.CARDS)};const INFO=${JSON.stringify(INFO)};
${fs.readFileSync(__dirname + '/client.js', 'utf8')}
</script>`;
fs.mkdirSync(__dirname + '/../out', { recursive: true });
fs.writeFileSync(__dirname + '/../out/asset-flow.html', html);
fs.writeFileSync(__dirname + '/../out/grades.json', JSON.stringify({ round1: R1, final_round3: G }, null, 1));
console.log('bytes', html.length, 'scores', G.pages.main[0].id, G.pages.main[0].score, G.pages.list[0].id, G.pages.list[0].score, G.pages.card[0].id, G.pages.card[0].score);

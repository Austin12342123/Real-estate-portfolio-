  /* ---------- Add an asset deck (route #add) and View assets (route #assets-<type>). The deck keeps answers in memory; every number it shows comes from the engine (E.newAsset, E.noiOf, E.payment, E.needFor, E.plan). Save appends the asset through the same path the old add form used (E.register + S.houses.push). ---------- */
  const AFL = {
    single: [['Conventional 30-year', 'conv30'], ['Conventional 15-year', 'conv15'], ['FHA (you live there)', 'fha'], ['FHA 203(k) rehab', 'k203'], ['DSCR investor loan', 'dscr'], ['Cash', 'cashh']],
    multi: [['Conventional 2 to 4 units', 'mfConvInv'], ['FHA, you live in one unit', 'mfFha'], ['DSCR investor loan', 'mfDscr'], ['Apartment loan (5+ units)', 'mfAgency'], ['Cash', 'mfCash']],
    commercial: [['Bank commercial loan', 'comm25'], ['SBA 504', 'sba504'], ['DSCR investor loan', 'dscr'], ['Cash', 'cashh']],
    business: [['SBA 7(a)', 'sba7a'], ['Bank term loan', 'bankbiz'], ['Seller note', 'sellerb'], ['Cash', 'cashb']],
  };
  const AFDEF = { single: 'DSCR investor loan', multi: 'Conventional 2 to 4 units', commercial: 'Bank commercial loan', business: 'SBA 7(a)' };
  const AFV = { ok: ['Good deal', 'Healthy'], warn: ['Tight deal', 'Tight'], bad: ['Loses money', 'Losing money'] };
  const AF = { ans: {}, inp: {}, chip: {}, seen: {}, pos: 0, fromReview: false, loanOpen: false, owned: false, fixed: false, tmr: 0, saved: false, dir: '' };
  function afReset(tp, owned) {
    Object.assign(AF, { ans: {}, inp: {}, chip: {}, seen: {}, pos: 0, fromReview: false, loanOpen: false, owned: !!owned, fixed: tp === 'commercial' || tp === 'business', saved: false, dir: '' });
    if (AF.fixed) AF.ans.type = tp === 'commercial' ? 'Commercial property' : 'Business';
    if (owned) AF.ans.status = 'I already own it';
  }
  const afKind = () => ({ 'Multi-family': 'multi', 'Commercial property': 'commercial', Business: 'business' })[AF.ans.type] || 'single';
  const afOwn = () => AF.ans.status === 'I already own it';
  const afNum = (id, i = 0) => {
    const v = parseFloat(String(AF.inp[id + ':' + i] === undefined ? '' : AF.inp[id + ':' + i]).replace(/[^0-9.]/g, ''));
    return isFinite(v) ? v : undefined;
  };
  const afPack = () => afKind() === 'multi' && AF.ans.units === 'A pack of houses';
  function afUnits() {
    if (afKind() !== 'multi') return 1;
    const a = AF.ans.units || '',
      t = afNum('unitsn');
    return Math.min(500, Math.max(2, Math.round(/^[234] /.test(a) ? +a[0] : t || (a === 'A pack of houses' ? 5 : a === '5 or more' ? 6 : 2))));
  }
  function afLoans() {
    const k = afKind(),
      u = afUnits(),
      L = AFL[k];
    if (k !== 'multi') return L;
    return L.filter(([t]) => (afPack() ? t === 'Cash' || t.startsWith('DSCR') : u >= 5 ? !t.startsWith('Conventional 2') && !t.startsWith('FHA') : !t.startsWith('Apartment')));
  }
  /* a loan that no longer fits the type or unit count is cleared and asked again (with the rate, down and closing typed for it) */
  function afFixLoan() {
    if (AF.ans.loan && !afLoans().some(([t]) => t === AF.ans.loan)) {
      delete AF.ans.loan;
      ['dp', 'rate', 'closing'].forEach((x) => delete AF.inp[x + ':0']);
      delete AF.chip.dp0;
      delete AF.chip.rate0;
    }
  }
  const afLoanName = () => (AF.ans.loan && afLoans().some(([t]) => t === AF.ans.loan) ? AF.ans.loan : afLoans().some(([t]) => t === AFDEF[afKind()]) ? AFDEF[afKind()] : afLoans()[0][0]);
  const afLoanId = () => (afLoans().find(([t]) => t === afLoanName()) || afLoans()[0])[1];
  const AFMO = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const afNow = () => new Date();
  const afBoughtMonths = () => {
    const m = /([A-Za-z]{3})[a-z]*\.?\s*(\d{4})/.exec(AF.inp['owned:0'] || ''),
      i = m ? AFMO.findIndex((x) => x.toLowerCase() === m[1].toLowerCase()) : -1;
    if (i < 0) return 12;
    const n = afNow();
    return Math.max(0, (n.getFullYear() - +m[2]) * 12 + n.getMonth() - i);
  };
  const afRehab = () => { const k = afKind(); return k === 'commercial' ? [50000, 150000] : k === 'multi' ? [afUnits() * 6000, afUnits() * 20000] : [10000, 40000]; };
  const AFSTAT = (c) => (c.kind === 'review' ? 'review' : c.id);
  /* build the asset the answers describe: the engine's own defaults for the type and loan, then only what was typed or picked */
  function afBuild() {
    const k = afKind(), type = k === 'single' || k === 'multi' ? 'house' : k, own = afOwn(), u = afUnits(), pack = afPack();
    const o = { fresh: true };
    if (k === 'multi') Object.assign(o, { kind: 'multi', units: u, pack }, E.mfDefaults(u, pack));
    if (own) Object.assign(o, { status: 'owned', paid: afBoughtMonths() });
    const h = E.newAsset(type, afLoanId(), o),
      N = afNum,
      set = (f, v) => { if (v !== undefined) h[f] = v; };
    const nm = (AF.inp['addr:0'] || '').trim();
    if (nm) h.addr = nm;
    if ((AF.inp['addr:1'] || '').trim()) h.nick = AF.inp['addr:1'].trim();
    if (k === 'single' && (AF.chip.home0 || AF.chip.home1 || N('home') || N('home', 1)))
      h.info = Object.assign({}, h.info, { beds: parseFloat(AF.chip.home0) || undefined, baths: parseFloat(AF.chip.home1) || undefined, sqft: N('home'), yearBuilt: N('home', 1) });
    set('price', N('price'));
    const yr = (id) => (AF.chip[id + '0'] === 'Per year' ? 12 : 1);
    set('tax', N('tax') === undefined ? undefined : N('tax') / yr('tax'));
    set('ins', N('ins') === undefined ? undefined : N('ins') / yr('ins'));
    if (k === 'single' || k === 'commercial') { set('rent', N('rent')); }
    if (k === 'multi') set('rent', N('unitmix') === undefined ? undefined : N('unitmix') * u);
    if (k === 'commercial') set('nnn', N('nnn'));
    if (k === 'business') {
      set('margin', N('margin'));
      if (N('revenue') !== undefined) { h.revenue = N('revenue') / 12; h.rent = Math.round((h.revenue * E.marginOf(h)) / 100); }
    }
    if (AF.ans.hoa === 'No HOA') h.hoa = 0; else set('hoa', N('hoaamt'));
    const mg = { 'I will': 0, 'A property manager': 8, 'A full-service manager': 10 }[AF.ans.manage];
    if (mg !== undefined) h.mgmtPct = mg;
    const mt = AF.ans.repairs ? (AF.ans.repairs.startsWith('Newer') ? 0.5 : AF.ans.repairs.startsWith('Older') ? 1.5 : 1) : undefined;
    if (mt !== undefined) h.maintPct = mt;
    if (AF.ans.growth) h.growth = parseFloat(AF.ans.growth) || h.growth;
    const rz = afRehab(), cx = { 'Move-in ready': 0, 'Light refresh': rz[0], 'Big rehab': rz[1] }[AF.ans.rehab];
    if (cx !== undefined) h.capex = cx;
    set('capex', N('rehabd')); set('capexMonths', N('rehabd', 1));
    if (N('rehabd', 2) !== undefined) { h.arv = N('rehabd', 2); h.arvAuto = false; }
    if (AF.chip.rate0 || N('rate') !== undefined || N('dp') !== undefined || AF.chip.dp0 || N('closing') !== undefined) {
      if (AF.chip.dp0) h.dp = parseFloat(AF.chip.dp0);
      set('dp', N('dp')); set('rate', N('rate')); set('closingPct', N('closing'));
      if (AF.chip.rate0) h.term = parseFloat(AF.chip.rate0) * 12;
    }
    if (own) {
      const d = AF.inp['owned:0'] || '', m = /([A-Za-z]{3})[a-z]*\.?\s*(\d{4})/.exec(d), i = m ? AFMO.findIndex((x) => x.toLowerCase() === m[1].toLowerCase()) : -1;
      if (i >= 0) h.boughtOn = m[2] + '-' + String(i + 1).padStart(2, '0') + '-01';
    }
    if ((AF.ans.exit === 'Sell it later') && afNum('sellyr') !== undefined) {
      const n = afNow(), by = afBuyYear(), y = Math.max(afNum('sellyr'), by);
      h.exit = 'sell'; h.exitMonth = Math.max(1, (y - n.getFullYear()) * 12 - n.getMonth() + 11);
    }
    return h;
  }
  /* engine numbers for a draft or a saved asset: cash flow, DSCR, cash to close (S = the app's assumptions) */
  function afMetrics(h) {
    const noi = E.noiOf(S, h), pay = E.payment(h) + E.mipMonthly(h), dn = E.downAmt(h);
    const cl = (h.price * (h.closingPct == null ? S.g.closing : h.closingPct)) / 100;
    return { noi, pay, cf: noi - pay, dscr: pay > 0.5 ? noi / pay : Infinity, cash: E.needFor(S, h), down: dn, close: cl, cap: h.price > 0 ? ((noi * 12) / h.price) * 100 : 0, loan: E.loan(h) };
  }
  const afVerdict = (m) => (m.cf >= 100 && m.dscr >= 1.1 ? 'ok' : m.cf >= 0 ? 'warn' : 'bad');
  /* months until the trust buys this draft as the LAST planned asset (the same trust queue as the plan) */
  function afMonths(h) {
    try {
      const pl = E.plan(Object.assign({}, S, { houses: S.houses.concat([h]) }));
      return pl.purchase[h.id];
    } catch (e) {
      return NaN;
    }
  }
  const afBuyYear = () => afNow().getFullYear() + (afOwn() ? 0 : Math.floor((afNow().getMonth() + (afMonthsCache || 0)) / 12));
  let afMonthsCache = 0;
  const afMoTxt = (m) => (!isFinite(m) ? 'not soon' : m <= 0 ? 'now' : 'in ' + m + ' mo');
  const afApplies = (c) => {
    const a = (x) => AF.ans[x], K = afKind(), O = afOwn(), cash = afLoanName() === 'Cash', hasHoa = K === 'single' || (K === 'multi' && a('units') !== '5 or more');
    switch (c.id) {
      case 'type': return !AF.fixed;
      case 'units': return K === 'multi';
      case 'unitsn': return K === 'multi' && (a('units') === '5 or more' || a('units') === 'A pack of houses');
      case 'home': return K === 'single';
      case 'unitmix': return K === 'multi';
      case 'rent': return K === 'single' || K === 'commercial';
      case 'nnn': return K === 'commercial';
      case 'revenue': case 'margin': return K === 'business';
      case 'hoa': return hasHoa;
      case 'hoaamt': return hasHoa && a('hoa') === 'Yes';
      case 'tax': case 'ins': case 'repairs': case 'manage': return K !== 'business';
      case 'value': case 'owned': return O;
      case 'when': return !O;
      case 'whenm': return !O && a('when') === 'Not before a month I pick';
      case 'sellyr': return a('exit') === 'Sell it later' || a('exit') === 'Refinance later';
      case 'rate': return false;
      case 'dp': return !cash;
      case 'closing': return !O;
      case 'rehab': return K !== 'business';
      case 'rehabd': return K !== 'business' && !!a('rehab') && a('rehab') !== 'Move-in ready';
      case 'bal': return O && !cash;
      default: return true;
    }
  };
  const afPath = () => AF_CARDS.filter(afApplies);
  const afPos = () => (AF.pos = Math.max(0, Math.min(AF.pos, afPath().length - 1)));
  const afOpts = (c) => {
    if (c.id === 'loan') return afLoans().map(([t, id]) => { const l = E.loanById(id); return [t, l ? (l.dp >= 100 ? 'No loan' : l.dp + '% down · about ' + l.rate + '% · ' + r(l.term / 12, 0) + ' years') : '']; });
    if (c.id === 'type' && !AF.owned && !AF.fixed) return c.opts.slice(0, 2);
    if (c.id === 'type') return c.opts;
    if (c.id === 'rehab' && afKind() !== 'single') { const z = afRehab(); return c.opts.map(([t, s]) => [t, t === 'Light refresh' ? 'About ' + $k(z[0]) : t === 'Big rehab' ? 'About ' + $k(z[1]) : s]); }
    return c.opts;
  };
  const afQ = (c) => {
    const K = afKind(), O = afOwn();
    if (c.id === 'price' && O) return 'What did you pay for it?';
    if (c.id === 'loan' && O) return 'What loan is on it?';
    if (c.id === 'rent' && K === 'commercial') return "What's the lease income?";
    if (c.id === 'type' && !AF.fixed) return 'What kind of home?';
    if (c.id === 'review') return (AF.inp['addr:0'] || { single: 'Your home', multi: 'Your multi-family home', commercial: 'Your commercial property', business: 'Your business' }[K]) + ' is ready';
    return c.q;
  };
  const afHelp = (c) => (c.id === 'rate' && afOwn() ? "Your loan's rate and length, from your mortgage statement." : c.id === 'value' && afKind() !== 'single' ? "A broker's opinion or a recent appraisal is fine." : c.help || '');
  function afChips(c, o, d, ci) {
    if (c.id === 'rate') { const t = [...new Set([...{ single: [360, 180], multi: [360, 180], commercial: [300, 240, 120], business: [120, 84, 60] }[afKind()], afBuild().term])]; return [t.map((m) => m / 12 + ' years'), (afBuild().term / 12) + ' years']; }
    if (c.id === 'dp') { const h = afBuild(), p = [...new Set([...{ single: [3.5, 5, 10, 20, 25], multi: [3.5, 15, 20, 25], commercial: [10, 20, 25, 30], business: [10, 20, 25] }[afKind()], h.dp])].sort((x, y) => x - y); return [p.map((x) => x + '%'), h.dp + '%']; }
    return [o, d];
  }
  const afInputs = (c) =>
    (c.inputs || []).map((f, i) => {
      if (f.homeOnly && afKind() !== 'single') return '';
      const id = 'dk-' + c.id + i, h = afBuild(), k = afKind();
      const def = { price: h.price, value: h.price, rate: h.rate, closing: h.closingPct == null ? S.g.closing : h.closingPct, rent: h.rent, tax: h.tax, ins: h.ins, hoaamt: h.hoa || '', unitmix: afUnits() > 0 ? Math.round(h.rent / afUnits()) : '', revenue: Math.round(E.revOf(h) * 12), margin: E.marginOf(h), nnn: h.nnn, unitsn: afUnits() }[c.id];
      const ph = f.t === 'num' && def !== undefined && def !== '' && i === 0 ? Math.round(def * 100) / 100 : f.ph;
      const typed = AF.inp[c.id + ':' + i];
      const label = c.id === 'rent' && i === 0 && k === 'commercial' ? 'Monthly lease income' : c.id === 'unitmix' && afPack() ? 'Average rent per house' : f.l;
      return `<label class="dk-tl" for="${id}">${esc(label)}</label><div class="dk-in">${f.pre ? `<span>${f.pre}</span>` : ''}<input id="${id}" ${f.t === 'num' ? 'inputmode="decimal"' : 'type="text"'} placeholder="${esc(typeof ph === 'number' ? ph.toLocaleString('en-US') : ph)}" ${typed !== undefined ? `value="${esc(typed)}"` : ''} data-dkf="${c.id}:${i}" enterkeyhint="next">${f.post ? `<span>${esc(f.post)}</span>` : ''}</div>`;
    }).join('');
  function afLive(c) {
    const h = afBuild(), m = afMetrics(h);
    if (c.id === 'rate') return `${r(h.rate, 2)}% over ${r(h.term / 12, 0)} years is ${$f(m.pay)}/mo.`;
    if (c.id === 'dp') return `That is ${$f(m.down)} down on ${$f(h.price)}.`;
    if (c.id === 'closing') return `About ${$f(m.close)}. Cash to close: ${$f(m.cash)}.`;
    if (c.id === 'unitmix') return `${afUnits()} ${afPack() ? 'houses' : 'units'} × ${$f(afNum('unitmix') === undefined ? h.rent / afUnits() : afNum('unitmix'))} = ${$f(h.rent)}/mo.`;
    if (c.id === 'rehabd') return `Cash to close goes up by ${$f(h.capex || 0)}.`;
    if (c.id === 'sellyr') { const by = afBuyYear(), y = afNum('sellyr'); return y && y < by ? `That is before ${afOwn() ? 'today' : 'the trust can buy it in ' + by}. Pick ${by} or later.` : afOwn() ? 'Any year from now on.' : `The trust can buy it in ${by}, so pick ${by} or later.`; }
    return '';
  }
  const afSeen = () => { const pi = afPath().findIndex((x) => x.id === 'price'); return !!(AF.inp['price:0'] || AF.ans.loan || AF.seen.price || (pi >= 0 && AF.pos > pi)); };
  function afStrip() {
    const s = afSeen(), O = afOwn(), h = s ? afBuild() : null, m = h ? afMetrics(h) : null, v = m ? afVerdict(m) : '';
    let mo = '-';
    if (h && !O) { const q = afMonths(h); afMonthsCache = isFinite(q) ? q : 0; mo = afMoTxt(q); }
    return `<div class="dk-live" data-testid="dk-strip" aria-live="polite"><div><span class="k">Cash flow</span><b class="v ${m ? (m.cf >= 0 ? 'ok' : 'bad') : ''}">${m ? $s(m.cf) + '/mo' : '-'}</b></div><div><span class="k">Deal ${infoBtn('deal')}</span><b class="v">${m ? AFV[v][O ? 1 : 0] : '-'}</b></div><div><span class="k">${O ? 'Value' : 'Trust ready ' + infoBtn('trust')}</span><b class="v">${m ? (O ? $k(h.price) : mo) : '-'}</b></div></div>`;
  }
  function afBody(c) {
    if (c.kind === 'review') return afReview();
    const q = `<h3 class="dk-q">${esc(afQ(c))}${c.info ? infoBtn(c.id === 'loan' ? 'loans' : 'repairs') : ''}</h3>`;
    if (c.kind === 'mc') {
      const rateOpen = c.withRate && AF.ans.loan && afLoanName() !== 'Cash' && !AF.loanOpen;
      if (rateOpen) {
        const o = afOpts(c).find(([t]) => t === AF.ans.loan) || [AF.ans.loan, ''];
        return `${q}<div class="dk-o on">${esc(o[0])}<span>${esc(o[1])}</span></div><button class="dk-chg" data-dkreopen>Change loan</button>${afParts(AF_CARDS.find((x) => x.id === 'rate'))}`;
      }
      return q + afOpts(c).map(([t, s]) => `<button class="dk-o${AF.ans[c.id] === t ? ' on' : ''}" data-dkpick="${esc(t)}">${esc(t)}${s ? `<span>${esc(s)}</span>` : ''}</button>`).join('');
    }
    return q + afParts(c);
  }
  function afParts(c) {
    const chips = (c.chips || []).map(([l, o0, d0], ci) => {
      const [o, d] = afChips(c, o0, d0, ci), key = c.id + ci;
      return `<span class="dk-tl">${esc(l)}</span><div class="dk-chips">${o.map((x) => `<button class="dk-chip${(AF.chip[key] || d) === x ? ' on' : ''}" data-dkchip="${key}" data-v="${esc(x)}">${esc(x)}</button>`).join('')}</div>`;
    }).join('');
    const lv = afLive(c);
    return `${c.merged ? '<p class="dk-tl">Rate and length</p>' : ''}${chips}${afInputs(c)}${lv ? `<p class="dk-lv" data-dklive>${esc(lv)}</p>` : ''}${afHelp(c) ? `<p class="dk-help">${esc(afHelp(c))}</p>` : ''}`;
  }
  function afReview() {
    const h = afBuild(), m = afMetrics(h), K = afKind(), O = afOwn(), P = afPath(), inP = (id) => P.some((x) => x.id === id), v = afVerdict(m), mo = O ? 0 : afMonths(h);
    const row = (l, val, id) => `<div class="dk-rv"><span>${l}</span><b>${val}</b>${inP(id) ? `<button class="dk-ed" data-dkjump="${id}" aria-label="Edit ${esc(l)}">Edit</button>` : '<span></span>'}</div>`;
    const cash = afLoanName() === 'Cash';
    return `<h3 class="dk-q">${esc(afQ({ id: 'review' }))}</h3><p class="dk-help">Check it once, then add it. You can change anything later.</p>
    ${row('Kind', esc(K === 'multi' ? (afPack() ? 'A pack of ' + afUnits() + ' houses' : 'Multi-family, ' + afUnits() + ' units') : AF.ans.type || 'Single-family home'), 'type')}${row('Own it?', O ? 'Yes, I own it' : 'Planning to buy', 'status')}${row('Address', esc(h.addr), 'addr')}${inP('home') && h.info ? row('Home', esc((h.info.beds || '-') + ' beds, ' + (h.info.baths || '-') + ' baths' + (h.info.sqft ? ', ' + h.info.sqft + ' sq ft' : '')), 'home') : ''}${row('Price', $f(h.price), 'price')}${row('Loan', esc(afLoanName()) + (cash ? '' : ', ' + r(h.rate, 2) + '%, ' + r(h.term / 12, 0) + ' years'), 'loan')}${cash ? '' : row('Down payment', $f(m.down) + ' (' + r(h.dp, 1) + '%)', 'dp')}${K === 'business' ? row('Revenue and margin', $f(E.revOf(h) * 12) + '/yr at ' + r(E.marginOf(h), 0) + '%', 'revenue') : row(K === 'multi' ? 'Rent' : K === 'commercial' ? 'Lease income' : 'Rent', $f(h.rent) + '/mo', K === 'multi' ? 'unitmix' : 'rent')}${K === 'business' ? '' : row('Property tax', $f(h.tax) + '/mo', 'tax') + row('Insurance', $f(h.ins) + '/mo', 'ins') + row('Manager', E.mgmtOf(S, h) ? r(E.mgmtOf(S, h), 0) + '% of rent' : 'You (no fee)', 'manage')}${O ? '' : row('Closing costs', $f(m.close), 'closing')}${inP('hoa') ? row('HOA', h.hoa ? $f(h.hoa) + '/mo' : 'None', h.hoa ? 'hoaamt' : 'hoa') : ''}${inP('rehab') ? row('Fix-up', h.capex > 0 ? $f(h.capex) + ' rehab budget' : 'Move-in ready', 'rehab') : ''}${row('Growth', r(h.growth, 1) + '% a year', 'growth')}
    <div class="dk-rvs"><div><span class="k">Cash flow</span><b class="${m.cf < 0 ? 'bad' : 'ok'}">${$s(m.cf)}/mo</b></div><div><span class="k">${O ? 'Value' : 'Cash to close ' + infoBtn('cash')}</span><b>${$k(O ? h.price : m.cash)}</b></div><div><span class="k">${O ? 'Deal ' : 'Trust ready '}${infoBtn(O ? 'deal' : 'trust')}</span><b>${O ? AFV[v][1] : afMoTxt(mo)}</b></div></div>
    <p class="dk-help">${O ? '' : 'Deal: ' + AFV[v][0].toLowerCase() + ' (DSCR ' + (isFinite(m.dscr) ? r(m.dscr, 2) : 'no loan') + '). The trust is funded in buy order, so this one is bought after the assets already planned.'}</p><button class="dk-save" data-dksave data-testid="dk-save">${O ? 'Add to what I own' : 'Add to my plan'}</button>`;
  }
  function afPage() {
    const P = afPath(), pos = afPos(), c = P[pos], last = c.kind === 'review';
    AF.seen[c.id] = 1;
    const rateOpen = c.withRate && AF.ans.loan && afLoanName() !== 'Cash' && !AF.loanOpen, mc = c.kind === 'mc' && !rateOpen;
    const nxt = afTarget(), backR = !last && AF.fromReview && P[nxt] && P[nxt].kind === 'review';
    const has = afHas(c);
    const foot = backR ? '<button class="dk-nx" data-dknav="1">Back to review ›</button>' : last ? '' : has || rateOpen ? '<button class="dk-nx" data-dknav="1">Next ›</button>' : '<button class="dk-bb" data-dknav="1" data-skip="1">Skip</button>';
    const hint = backR || last ? '' : mc && !AF.ans[c.id] ? `<span class="dk-hint">${c.withRate ? 'Pick one, then check the rate' : 'Pick one'}</span>` : '';
    return `<div class="dk" data-testid="deck">${afStrip()}<div class="dk-top"><button class="dk-x" data-go="" aria-label="Close and go back">×</button><span>${esc(c.sec)}</span><span data-testid="dk-count">${pos + 1} of ${P.length}</span></div><div class="dk-pb" role="progressbar" aria-valuenow="${pos + 1}" aria-valuemin="1" aria-valuemax="${P.length}"><i style="width:${Math.round(((pos + 1) / P.length) * 100)}%"></i></div>
    <div class="dk-stack"><div class="dk-card ${AF.dir ? 'in-' + AF.dir : ''}" id="dkcard" data-card="${c.id}">${afBody(c)}</div></div>
    <div class="dk-ft"><button class="dk-bb" data-dknav="-1" ${pos ? '' : 'disabled'} aria-label="Previous question">‹ Back</button>${hint}${foot}</div>${pos === 0 ? '<button class="dk-classic" data-dkclassic>Use the classic add form</button>' : ''}</div>`;
  }
  function afHas(c) {
    if (c.kind === 'mc') return !!AF.ans[c.id];
    if (c.chips && c.chips.length) return true;
    return (c.inputs || []).some((f, i) => (AF.inp[c.id + ':' + i] || '').trim() !== '');
  }
  function afTarget() {
    const P = afPath(), pos = afPos();
    if (AF.fromReview) {
      const n = P[pos + 1];
      if (!(n && n.follows === P[pos].id)) {
        const u = P.findIndex((x, i) => i > pos && x.kind !== 'review' && !AF.seen[x.id]);
        const rv = u >= 0 ? u : P.findIndex((x) => x.kind === 'review');
        if (rv >= 0) return rv;
      }
    }
    return pos < P.length - 1 ? pos + 1 : pos;
  }
  const afGo = (to, dir) => { clearTimeout(AF.tmr); AF.tmr = 0; AF.loanOpen = false; AF.pos = to; AF.dir = dir || ''; if (afPath()[afPos()].kind === 'review') AF.fromReview = false; render(); };
  const afNext = () => { const t = afTarget(); if (t !== AF.pos) afGo(t, 'right'); };
  const afPrev = () => { if (AF.pos > 0) afGo(AF.pos - 1, 'left'); };
  function afStart(tp, owned) { afReset(tp || 'house', owned); goto('add'); render(); }
  function afSave() {
    const h = afBuild(), own = afOwn();
    E.register(S, h);
    S.houses.push(h);
    UI.coll[(own ? 'cat-owned-' : 'cat-') + (h.type || 'house')] = false;
    selId = null;
    page = own ? 'real' : 'planned';
    save();
    afReset('house', false);
    goto('h/' + h.id);
  }
  function afPick(t) {
    const c = afPath()[afPos()], prevV = AF.ans[c.id];
    AF.ans[c.id] = t;
    if (c.id === 'type' || c.id === 'units') afFixLoan();
    if (c.id === 'loan' && t !== prevV) ['dp', 'rate', 'closing'].forEach((x) => { delete AF.inp[x + ':0']; delete AF.chip[x + '0']; });
    if (c.id === 'hoa' && t === 'No HOA') delete AF.inp['hoaamt:0'];
    if (c.id === 'rehab' && t !== 'Move-in ready') delete AF.inp['rehabd:0'];
    if (c.id === 'loan' && t !== 'Cash') { render(); return; }
    clearTimeout(AF.tmr);
    const at = AF.pos;
    AF.tmr = setTimeout(() => { AF.tmr = 0; if (AF.pos === at && routeOf() === 'add') afNext(); }, 260);
    render();
  }
  function afRefresh() {
    const live = app.querySelector('[data-dklive]'), c = afPath()[afPos()], strip = app.querySelector('.dk-live'), has = afHas(c), b = app.querySelector('.dk-ft [data-dknav="1"]');
    if (live) live.textContent = afLive(c);
    if (strip) strip.outerHTML = afStrip();
    if (b && !b.textContent.startsWith('Back')) { b.className = has ? 'dk-nx' : 'dk-bb'; b.textContent = has ? 'Next ›' : 'Skip'; }
  }
  let afSwiped = false, afSx = null, afSy = null, afCap = false;
  app.addEventListener('click', (e) => {
    const t = e.target;
    if (routeOf() !== 'add' || UI.addClassic || t.closest('[data-info]')) return;
    if (afSwiped) { afSwiped = false; return; }
    let n;
    if ((n = t.closest('[data-dkpick]'))) return afPick(n.dataset.dkpick);
    if ((n = t.closest('[data-dkchip]'))) {
      const key = n.dataset.dkchip;
      AF.chip[key] = n.dataset.v;
      if (key === 'dp0') delete AF.inp['dp:0'];
      render();
      return;
    }
    if (t.closest('[data-dkreopen]')) { AF.loanOpen = true; render(); return; }
    if ((n = t.closest('[data-dkjump]'))) { const i = afPath().findIndex((x) => x.id === n.dataset.dkjump); if (i >= 0) { AF.fromReview = true; afGo(i, 'left'); AF.fromReview = true; } return; }
    if (t.closest('[data-dksave]')) return afSave();
    if (t.closest('[data-dkclassic]')) { UI.addClassic = true; render(); return; }
    if ((n = t.closest('[data-dknav]'))) return n.dataset.dknav === '1' ? afNext() : afPrev();
  });
  app.addEventListener('input', (e) => {
    const f = e.target.dataset && e.target.dataset.dkf;
    if (!f || routeOf() !== 'add') return;
    AF.inp[f] = e.target.value;
    if (f === 'unitsn:0') afFixLoan();
    afRefresh();
  });
  app.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.closest && e.target.closest('[data-dkf]') && routeOf() === 'add') { e.preventDefault(); afNext(); } });
  /* swipe left = next, right = back; the pointer is captured only once the drag is clearly sideways, so taps still reach the buttons */
  app.addEventListener('pointerdown', (e) => { if (routeOf() !== 'add') return; afSwiped = false; afCap = false; if (e.target.closest('input,.dk-ft,.dk-top')) { afSx = null; return; } afSx = e.clientX; afSy = e.clientY; });
  app.addEventListener('pointermove', (e) => {
    if (afSx === null) return;
    const el = app.querySelector('#dkcard'), dx = e.clientX - afSx, dy = e.clientY - afSy;
    if (!afCap && Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) { afCap = true; try { app.setPointerCapture(e.pointerId); } catch (x) {} }
    if (afCap && el) el.style.transform = `translateX(${dx}px)`;
  });
  const afEnd = (e) => {
    if (afSx === null) return;
    const dx = e.clientX - afSx, dy = e.clientY - afSy, el = app.querySelector('#dkcard');
    afSx = null;
    if (el) el.style.transform = '';
    if (!afCap) return;
    afCap = false; afSwiped = true;
    if (Math.abs(dy) > Math.abs(dx) || Math.abs(dx) <= 70) return;
    if (dx < 0) afNext(); else afPrev();
  };
  app.addEventListener('pointerup', afEnd);
  app.addEventListener('pointercancel', () => { afSx = null; afCap = false; });

  /* ---------- View assets: one screen per category ---------- */
  function afValue(pl, h) {
    const x = pl.assetsAt(0).find((q) => q.id === h.id);
    return x && x.value > 0 ? x.value : h.price;
  }
  /* what a category dropdown on the main page opens to: owned cash flow, owned value, next buy, then the two buttons */
  function afCatBody(tp, pl, bno) {
    const all = S.houses.filter((h) => (h.type || 'house') === tp && !(pl.exits[h.id] && pl.sellAt[h.id] <= pl.planM)),
      own = all.filter((h) => h.status === 'owned'),
      nxt = all.filter((h) => h.status !== 'owned').sort((a, b) => bno[a.id] - bno[b.id])[0],
      btns = `<div class="cat-actions"><button class="btn" data-add="${tp}" data-testid="add-${tp}">+ Add an asset</button><button class="btn plain" data-viewassets="${tp}" data-testid="view-${tp}">View assets</button></div>`;
    if (!all.length) return `<p class="none" data-testid="cat-empty-${tp}">Add one to see its ${tp === 'business' ? 'profit, cash flow and buy date' : tp === 'commercial' ? 'lease income, cap rate and buy date' : 'cash flow, value and buy date'}.</p>${btns}`;
    const cf = own.length ? E.todayTotals(S, pl, own.map((h) => h.id)).cf : 0,
      val = own.reduce((a, h) => a + afValue(pl, h), 0),
      bm = nxt ? pl.purchase[nxt.id] : NaN;
    return `<div class="cat-sum" data-testid="cat-sum-${tp}"><div><span class="k">Owned cash flow</span><b class="${cf < -0.5 ? 'bad' : 'ok'}" data-testid="cat-cf-${tp}">${own.length ? $s(cf) + '/mo' : '-'}</b></div><div><span class="k">Owned value</span><b>${own.length ? $k(val) : '-'}</b></div><div><span class="k">Next buy ${infoBtn('nextbuy')}</span><b data-testid="cat-next-${tp}">${nxt ? (isFinite(bm) ? (bm <= 0 ? 'now' : 'in ' + bm + ' mo') : 'not soon') : '-'}</b></div></div>${btns}`;
  }
  const AFCAT = { house: ['Homes', 'homes'], commercial: ['Commercial', 'commercial properties'], business: ['Businesses', 'businesses'] };
  let afSort = 'order';
  function assetsPage(tp) {
    const pl = PLAN(S), bno = buyOrder(pl), snapBy = {};
    pl.snap.forEach((x) => (snapBy[x.id] = x));
    const list = S.houses.filter((h) => (h.type || 'house') === tp && !(pl.exits[h.id] && pl.sellAt[h.id] <= pl.planM));
    const rows = list.map((h, i) => {
      const own = h.status === 'owned', m = afMetrics(h), v = pl.V[h.id], tt = E.todayTotals(S, pl, [h.id]), vd = verdictFor(pl, h), tr = pl.trust[h.id] || {}, bm = pl.purchase[h.id], need = tr.need || m.cash;
      const planned = list.filter((q) => q.status !== 'owned').sort((a, b) => bno[a.id] - bno[b.id]), pi = planned.indexOf(h), prevA = pi > 0 ? planned[pi - 1] : null;
      const have = Math.min(need, Math.max(0, +tr.have || 0)), pct = need > 0 ? Math.min(100, (have / need) * 100) : 100;
      const when = !isFinite(bm) ? 'not funded in the plan' : bm <= 0 ? 'ready now' : 'ready in <b>' + bm + ' mo</b>';
      const line = own ? 'Owned' : pi === 0 ? `Trust has ${$k(have)} of ${$k(need)} · ${when}` : `Trust ${when}${prevA ? ' · after ' + esc(prevA.addr) : ''}`;
      const g = (k, val, inf) => `<div><span class="k">${k}${inf ? infoBtn(inf) : ''}</span><b class="v">${val}</b></div>`;
      const cocv = m.cash > 0 ? ((m.cf * 12) / m.cash) * 100 : 0;
      return { h, m, key: { order: own ? -1000 + (bno[h.id] || 0) : bno[h.id] || i, cf: -m.cf, cap: -m.cap, dscr: -(isFinite(m.dscr) ? m.dscr : 99) }, html: `<article class="va" data-testid="va-card" data-id="${h.id}"><div class="va-top"><div><button class="va-n" data-go="h/${h.id}" aria-label="Open ${esc(h.addr)}">${esc(h.addr)} ›</button><div class="va-s">${own ? 'Owned' : 'Planned'} · <span class="vchip sm ${vd.cls}">${vd.word}</span></div></div><div class="va-cf ${m.cf < 0 ? 'bad' : 'ok'}" data-testid="va-cf">${$s(m.cf)}<small>cash flow / mo</small></div></div>
      ${own || pi > 0 ? '' : `<div class="bar" role="progressbar" aria-label="Trust savings toward cash to close" aria-valuenow="${Math.round(pct)}" aria-valuemin="0" aria-valuemax="100"><i style="width:${pct.toFixed(1)}%"></i></div>`}<div class="va-bl"><span>${line}</span><button class="va-mo" data-vmore="${h.id}" aria-expanded="false" aria-controls="more-${h.id}">More</button></div>
      <div class="va-g">${g('Cap rate', r(m.cap, 1) + '%', 'caprate')}${g('DSCR', isFinite(m.dscr) ? r(m.dscr, 2) : 'no loan', 'dscr')}${g('Cash-on-cash', r(cocv, 1) + '%', 'coc')}${g('Price', $k(h.price))}${g('Est. value', $k(own ? afValue(pl, h) : h.price))}${own ? g('Equity', $k(tt.eq), 'equity') : g('Down payment', $k(m.down))}</div>
      <div class="va-more" id="more-${h.id}" hidden><p class="va-ln">${esc(h.loanId && E.loanById(h.loanId) ? E.loanById(h.loanId).name : 'Custom loan')} · ${r(h.rate, 2)}% · ${r(h.dp, 1)}% down</p><div class="va-g">${g('Rent', $f(h.rent) + '/mo')}${g('Payment', $f(m.pay) + '/mo', 'pay')}${own ? g('Down payment', $k(m.down)) : g('NOI', $f(m.noi) + '/mo', 'noi')}${own ? g('Loan left', $k(v ? v.B0 : 0)) : g('Cash needed', $k(m.cash), 'need')}</div></div></article>` };
    });
    rows.sort((a, b) => a.key[afSort] - b.key[afSort]);
    const ownL = rows.filter((x) => x.h.status === 'owned'), cf = ownL.reduce((a, x) => a + x.m.cf, 0), val = ownL.reduce((a, x) => a + afValue(pl, x.h), 0);
    return `<div class="va-head"><div class="va-hr"><button class="va-bk" data-go="" aria-label="Back to Portfolio" data-testid="va-back">‹ Portfolio</button><button class="va-add" data-add="${tp}" data-testid="va-add">+ Add</button></div><h2 class="va-t">${AFCAT[tp][0]}</h2><p class="va-sum" data-testid="va-sum">${ownL.length} owned: <b class="${cf < 0 ? 'bad' : 'ok'}">${$s(cf)}/mo</b>, ${$k(val)} value · ${rows.length - ownL.length} planned</p><div class="va-so" role="group" aria-label="Sort by">${[['order', 'Buy order'], ['cf', 'Cash flow'], ['cap', 'Cap rate'], ['dscr', 'DSCR']].map(([k, l]) => `<button data-vsort="${k}" class="${afSort === k ? 'on' : ''}" aria-pressed="${afSort === k}">${l}</button>`).join('')}</div></div>${rows.length ? rows.map((x) => x.html).join('') : `<p class="note" data-testid="va-empty">Nothing here yet. Tap + Add to start.</p>`}`;
  }
  app.addEventListener('click', (e) => {
    const t = e.target;
    let n;
    if ((n = t.closest('[data-vsort]'))) { afSort = n.dataset.vsort; render(); return; }
    if ((n = t.closest('[data-vmore]'))) { const o = n.getAttribute('aria-expanded') !== 'true', box = document.getElementById('more-' + n.dataset.vmore); n.setAttribute('aria-expanded', String(o)); if (box) box.hidden = !o; return; }
    if ((n = t.closest('[data-viewassets]'))) { afSort = 'order'; goto('assets/' + n.dataset.viewassets); }
  });

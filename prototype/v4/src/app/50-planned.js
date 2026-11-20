  /* ---------- main page ---------- */
  function main() {
    const pl = PLAN(S);
    LASTPL = { S, pl, rn: RN };
    const t0 = pl.today,
      tf = pl.final,
      th = pl.horizon,
      g = S.g,
      yrs = g.planYears,
      owned = S.houses.filter((h) => h.status === 'owned');
    /* The Planned page totals cover the planned assets only: take the bought (Real) assets out of the plan totals, so each page's finances are its own */
    const ownSn = pl.snap.filter(
        (x) => x.type !== 'cash' && S.houses.some((q) => q.id === x.id && q.status === 'owned'),
      ),
      osum = (k) => ownSn.reduce((a, x) => a + (x[k] || 0), 0);
    const subOwn = (px) => {
        const th = px.horizon,
          ownSn = px.snap.filter(
            (x) => x.type !== 'cash' && S.houses.some((q) => q.id === x.id && q.status === 'owned'),
          ),
          osum = (k) => ownSn.reduce((a, x) => a + (x[k] || 0), 0);
        if (!ownSn.length) return th;
        const o = Object.assign({}, th);
        o.nw = th.nw - osum('equity');
        o.monthly = th.monthly - osum('payment');
        o.cf = th.cf - osum('cf');
        o.cfx = th.cfx - osum('cf');
        o.noi = th.noi - osum('income');
        o.value = th.value - osum('value');
        o.debt = th.debt - osum('debt');
        o.count = Math.max(0, (th.count || 0) - ownSn.length);
        o.extra = Math.max(0, th.extra - osum('extra'));
        const dsv = o.noi - o.cf;
        o.ds = dsv;
        o.dscr = dsv > 0.5 ? o.noi / dsv : 0;
        o.cltv = o.value > 0 ? (o.debt / o.value) * 100 : 0;
        return o;
      },
      sn = subOwn(pl),
      snAlt = subOwn(isToday() ? pl.raw : E.realPlan(S, pl)),
      snapBy = {};
    pl.snap.forEach((x) => (snapBy[x.id] = x));
    const tot = S.houses.reduce((s, h) => s + E.view(S, h).X, 0),
      totNow = Math.max(
        0,
        pl.extraNow -
          pl
            .assetsAt(0)
            .filter((x) => S.houses.some((q) => q.id === x.id && q.status === 'owned'))
            .reduce((s, x) => s + (x.extra || 0), 0),
      ) /* the bought assets' extra belongs to the Real page */,
      totLater = pl.extraLater;
    const n = S.houses.length,
      sched = n - pl.unfunded.length;
    const paySub = (h2, v2) => {
      const parts = [];
      if (v2.P > 0) parts.push((h2.io ? 'interest ' : 'P&amp;I ') + $f(v2.P));
      if (v2.X > 0.5) parts.push('extra ' + $f(v2.X));
      if (v2.escrow > 0) parts.push('costs ' + $f(v2.escrow));
      if (v2.mip > 0) parts.push('insurance ' + $f(v2.mip));
      return parts.length > 1 ? parts.join(' + ') : '';
    };
    /* the expanded panel under a selected row: the extra payment and what it does, plus move / duplicate / details / remove */
    const panelOf = (h, soldBy, vis, ci) => {
      const v = pl.V[h.id],
        X = v.X,
        P = 'h.' + h.id + '.';
      let eff = '';
      if (!soldBy) {
        const p0 = X > 0.5 ? planWith(h, 0) : pl,
          pay0 = lifeOf(p0, h),
          payX = lifeOf(pl, h),
          hasLoan = v.L > 0;
        const term = !hasLoan
          ? 'No loan on this asset'
          : !isFinite(payX)
            ? h.io
              ? 'Interest-only: not paid off'
              : 'Not paid off in this plan'
            : 'Paid off in ' + ym(payX) + (h.status === 'owned' ? '' : ' after it is bought');
        const termSub = !hasLoan
          ? ''
          : X > 0.5
            ? !isFinite(pay0)
              ? isFinite(payX)
                ? 'it never pays off without the extra'
                : ''
              : pay0 - payX > 0
                ? ym(pay0 - payX) + ' sooner than with no extra'
                : 'same as with no extra'
            : 'extra payments pay it off sooner';
        let nxt,
          nxtSub = '',
          nxtAttr = '';
        const nx = nextPlanned(h);
        if (!nx) {
          nxt = 'Nothing left to buy';
          nxtSub = 'No planned asset below this one in the list, so no purchase is waiting on its cash flow.';
        } else {
          const open = pl.purchase[nx.id],
            m0 = p0.purchase[nx.id],
            soon = isFinite(open) && isFinite(m0) ? m0 - open : 0,
            tr = pl.trust[nx.id];
          nxt = !isFinite(open) ? 'not reachable' : open <= 0 ? 'now' : monY(open);
          nxtSub =
            (X > 0.5
              ? soon > 0
                ? ym(soon) + ' sooner than with no extra'
                : 'no faster than with no extra'
              : 'extra payments make it sooner') +
            ' · ' +
            (tr && tr.pooled
              ? 'the trust reinvests ' + $f(tr.cf) + '/mo of cash flow toward it'
              : 'bought with cash on hand');
          nxtAttr = ` data-open="${isFinite(open) ? open : ''}" data-sooner="${soon}"`;
        }
        eff = `<div class="eff" data-testid="extra-effects">
          <div class="el"><span class="elk">Loan</span><b data-testid="eff-term" data-k="eff-term-${h.id}" data-months="${isFinite(payX) ? payX : ''}" data-base="${isFinite(pay0) ? pay0 : ''}">${term}</b><small>${termSub}</small></div>
          <div class="el"><span class="elk">Payment now</span><b data-testid="eff-payment" data-k="eff-pay-${h.id}">${$f(v.payment)}</b><small>${paySub(h, v) || 'no loan payment'}</small></div>
          <div class="el"><span class="elk">Next the trust funds${nx ? ' · ' + esc(nx.addr) : ''}${infoBtn('nextdp')}</span><b data-testid="eff-next" data-k="eff-next-${h.id}"${nxtAttr}>${nxt}</b><small>${nxtSub}</small></div></div>`;
      }
      const mv =
        !soldBy &&
        h.status !== 'owned' &&
        vis.length > 1; /* only planned assets have an order that matters; owned ones sit oldest first */
      return `<div class="panel" data-testid="asset-panel" data-for="${h.id}">
        ${soldBy ? '<p class="note" style="margin:0 0 6px">Sold in this plan, so there is no extra payment to set.</p>' : `<label class="f ex"><span class="lb">Extra payment / month${infoBtn('extra')}</span><span class="iw"><em>$</em><input inputmode="text" data-num="1" data-pre="$" data-suf="" enterkeyhint="done" autocapitalize="off" autocorrect="off" spellcheck="false" data-testid="extra-input" data-p="${P}extra" data-k="x-${h.id}" aria-label="Extra monthly payment for ${esc(h.addr)}" value="${grp(X)}"></span></label>`}
        ${eff}
        ${!soldBy && h.status !== 'owned' ? field('Buy position', P + 'pos', bno[h.id], { info: 'buypos' }) : ''}
        <div class="pact">${mv ? `<button class="pbtn" data-move="${h.id}:-1" data-testid="move-up" ${ci === 0 ? 'disabled' : ''}>↑ Move up</button><button class="pbtn" data-move="${h.id}:1" data-testid="move-down" ${ci === vis.length - 1 ? 'disabled' : ''}>↓ Move down</button>` : ''}<button class="pbtn" data-dup="${h.id}" data-testid="row-duplicate">Duplicate</button><button class="pbtn" data-go="h/${h.id}" data-testid="open-details">Open details ›</button></div>
        ${ask === 'del:' + h.id ? confirmBox('Remove ' + esc(h.addr) + '? The trust re-works the funding of every asset after it.', 'data-del-yes="' + h.id + '"', 'Yes, remove') : `<button class="rm" data-del="${h.id}" data-testid="row-remove" aria-label="Remove ${esc(h.addr)}">Remove</button>`}</div>`;
    };
    const isSold = (h) => !!(pl.exits[h.id] && pl.sellAt[h.id] <= pl.planM);
    const bno = buyOrder(pl);
    const verdictOf = (h) => verdictFor(pl, h),
      mathOf = (h) => mathFor(pl, h),
      shortMath = (h) => shortFor(pl, h);
    /* Planned rows show only whether the plan works and the math. Bought rows show the loan: what is still due, the credit line it opens, and when it is paid off. Neither says how long ago anything was bought, and no row compares itself with the asset before it. */
    const factsOf = (h, soldBy) => {
      if (soldBy) return null;
      const v = pl.V[h.id];
      if (h.status === 'owned') {
        const due = v.B0,
          end = pl.loanEnd[h.id];
        return `<span class="fx" data-testid="loan-due" data-v="${Math.round(due)}">Loan due <b>${$f(due)}</b></span> · <span class="fx" data-testid="line-avail" data-v="${Math.round(v.head0)}">Credit line <b>${$f(v.head0)}</b></span> · <span class="fx" data-testid="payoff-in">${due <= 0.5 ? 'No loan to pay off' : 'Paid off in <b>' + ym(end) + '</b>'}</span>`;
      }
      const vd = verdictOf(h),
        tr = pl.trust[h.id],
        need = tr.need || E.needFor(S, h),
        bm = pl.purchase[h.id];
      const when = !isFinite(bm)
        ? 'never funded'
        : bm <= 0
          ? 'today'
          : 'in ' +
            bm +
            ' mo (' +
            '<span class="nb">' +
            dtm(bm) +
            '</span>)'; /* months from today, with the calendar date */
      const needTxt =
        tr.ok && !tr.pooled && S.p
          ? 'uses ' + $f(tr.savings) + ' saved cash'
          : 'needs ' +
            $f(
              need,
            ); /* the first asset has nothing to borrow against: it is paid from the saved cash above the cushion plus job pay */
      return `<span class="vchip sm ${vd.cls}" data-testid="plan-verdict">${vd.word}</span><span class="vsep" aria-hidden="true"> · </span><span data-testid="plan-math">${needTxt}</span><span class="vsep" aria-hidden="true"> · </span><span data-testid="plan-when" data-month="${isFinite(bm) ? bm : ''}">${vd.cls === 'bad' && vd.why ? '<span class="badtxt">' + esc(vd.why) + '</span>' : when}</span>`; /* a "Not possible" row says what is short instead of a date */
    };
    const endYr = Math.round(
      pl.planM / 12,
    ); /* the row shows cash flow at the end of the plan, and the asset's own cash flow on today's terms */
    const rowOf = (h, vis, ci) => {
      const v = pl.V[h.id],
        type = h.type || 'house',
        sel = selId === h.id;
      const exitTxt =
        h.exit === 'sell' && isFinite(pl.sellAt[h.id])
          ? `sells in ${mm(pl.sellAt[h.id])}`
          : h.exit === 'merge' && isFinite(pl.mergeAt[h.id])
            ? `merges${H(h.mergeInto) ? ' into ' + esc(H(h.mergeInto).addr) : ''} in ${mm(pl.mergeAt[h.id])}`
            : '';
      const sp = snapBy[h.id],
        soldBy = isSold(h),
        pm = (t) => t.replace(/\.0M$/, 'M');
      const loses =
        type === 'house' && v.cf < 0 ? '<span class="hi">loses money at today\'s terms</span>' : '';
      const hi = v.X > 2000 && v.X > 3 * v.P ? '<span class="hi">unusually high extra</span>' : '';
      return `<div class="rw" data-rw="${h.id}"><div class="row${soldBy ? ' sold' : ''}${sel ? ' sel' : ''}" data-row="${h.id}" data-testid="ledger-row"${soldBy || h.status === 'owned' ? ' data-nodrag' : ''}><div class="r1"><span class="nm"><button type="button" class="addrbtn" aria-expanded="${sel}" data-testid="row-toggle"><span class="addr" data-go="h/${h.id}" data-testid="row-edit"><b class="bn" data-testid="buy-no" aria-label="Buy number ${bno[h.id]}">${bno[h.id]}</b>${addrNb(h.addr, '<i class="ed" aria-hidden="true">edit ›</i>')}</span><span class="pay" data-testid="row-payment" data-k="pay-${h.id}" data-equity="${sp ? Math.round(sp.equity) : ''}" data-pay="${sp && !soldBy ? Math.round(v.payment) : ''}">${E.isMulti(h) ? `<span class="tag" data-testid="row-units">${h.pack ? 'Pack of ' + E.unitsOf(h) + ' houses' : E.unitsOf(h) + ' units'}</span>` : ''}${soldBy ? '' : pm($c(h.price)) + ' · ' + $f(h.rent) + '/mo ' + (type === 'business' ? 'profit' : 'rent') + (h.capex > 0 ? ' · +' + $k(h.capex) + ' reno' : '')} ${hi}${loses}</span>${(() => {
        const parts = [];
        if (soldBy) parts.push('sold for ' + $c(pl.exits[h.id].price) + ' in ' + inmH(pl.sellAt[h.id]));
        else if (exitTxt) parts.push(exitTxt);
        return parts.length ? `<span class="exitline">${parts.join(' · ')}</span>` : '';
      })()}</button></span>
        <span class="cfl ${soldBy ? (pl.exits[h.id].profit < 0 ? 'bad' : 'ok') : (sp ? v.cf : 0) < 0 ? 'bad' : 'ok'}" data-testid="row-cashflow"><b data-k="cf-${h.id}" ${soldBy ? 'data-profit="' + Math.round(pl.exits[h.id].profit) + '"' : ''}>${soldBy ? $cs(pl.exits[h.id].profit) : !sp ? '—' : $s(v.cf) + '/mo'}</b><small>${soldBy ? 'cash profit' : !sp ? 'not counted' : v.cf < -0.5 ? 'Negative income' : 'Positive income'}</small></span></div>
        <div class="r2"><div class="fcol">${(() => {
          const w = factsOf(h, soldBy);
          return w ? `<span class="locline" data-testid="dp-line">${w}</span>` : '';
        })()}</div>${soldBy ? '' : `<button type="button" class="xtog" data-panel="${h.id}" aria-expanded="${sel}" data-testid="row-extra-toggle" aria-label="Extra payment">Extra ${sel ? '▴' : '▾'}</button>`}</div></div>${sel ? panelOf(h, soldBy, vis, ci) : ''}</div>`;
    };
    const NOUN = {
        house: ['home', 'homes'],
        commercial: ['commercial property', 'commercial properties'],
        business: ['business', 'businesses'],
      },
      ADD = { house: 'home', commercial: 'commercial property', business: 'business' };
    const empty = !S.houses.length;
    const fin = S.p ? E.finance(S, pl) : null;
    /* the strip under a category name: number of assets, cash flow before and after the loans, total worth, DSCR, and how long cash lasts if ~45% of the assets stop earning (the biggest earners, rent gone, costs and loans still due) */
    const statStrip = (tp, list, key) => {
      const sn2 = pl.snap.filter((x) => x.type === tp && list.some((h) => h.id === x.id)),
        n2 = list.length;
      if (!tp) {
        const pr = list.reduce((a2, h2) => a2 + ((pl.exits[h2.id] || {}).profit || 0), 0);
        return `<span class="cnt" data-testid="cat-count-${key}">${n2}</span><span class="sc"><b class="${pr < 0 ? 'bad' : ''}" data-testid="cat-profit-${key}">${$cs(pr)}</b><small>cash profit</small></span>`;
      }
      const nn = NOUN[tp][n2 === 1 ? 0 : 1];
      if (!sn2.length)
        return `<span class="cstrip" data-testid="cat-strip-${key}"><b data-testid="cat-count-${key}">${n2}</b> ${nn} · not funded in the plan</span>`;
      const tt = E.todayTotals(
        S,
        pl,
        sn2.map((x) => x.id),
      ); /* today's terms (2026*): the assets' own numbers, nothing grown */
      return `<span class="cstrip" data-testid="cat-strip-${key}"><b data-testid="cat-count-${key}">${n2}</b> ${nn} · <b class="${tt.cf < -0.5 ? 'bad' : ''}" data-testid="cat-cf-${key}">${$s(tt.cf)}/mo</b> · <span data-testid="cat-price-${key}">${$k(tt.price)}</span></span>`;
    };
    /* income and expenses per month for a list of assets, in today's terms (month 0): every line is summed from the assets' own numbers and the last line equals the sum of the "now" cash flows on the rows */
    const costBreakdown = (list, tid) => {
      const g = S.g,
        T = {
          rent: 0,
          reimb: 0,
          vac: 0,
          tax: 0,
          ins: 0,
          hoa: 0,
          maint: 0,
          mgmt: 0,
          res: 0,
          oth: 0,
          pay: 0,
          mip: 0,
          noi: 0,
          cf: 0,
        };
      let biz = 0,
        nb = 0,
        rev = 0;
      const own = list.some(
        (h) =>
          ((h.type || 'house') !== 'business' && h.mgmtPct != null) || (E.isMulti(h) && h.maintPct != null),
      ); /* an asset with its own management / repairs % makes those two lines a mix */
      list.forEach((h) => {
        const v = pl.V[h.id];
        if (!v) return;
        if ((h.type || 'house') === 'business') {
          biz += h.rent;
          rev += E.revOf(h);
          T.rent += h.rent;
          T.noi += v.noi;
          T.pay += v.P;
          T.mip += v.mip;
          T.cf += v.cf;
          return;
        }
        const inc = h.rent + v.reimb;
        T.rent += h.rent;
        T.reimb += v.reimb;
        T.vac += inc - v.egi;
        T.tax += h.tax;
        T.ins += h.ins;
        T.hoa += h.hoa;
        T.maint += ((E.maintOf(S, h) / 100) * h.price) / 12;
        T.mgmt += (E.mgmtOf(S, h) / 100) * v.egi;
        T.res += E.mfReserve(h);
        T.oth += E.mfOther(h);
        T.noi += v.noi;
        T.pay += v.P;
        T.mip += v.mip;
        T.cf += v.cf;
      });
      const L = (label, val, cls, tip) =>
          `<div class="bkr ${cls || ''}"><span>${label}</span><b>${val}</b></div>`,
        m = (x) => '−' + $f(Math.abs(x)),
        inc = T.rent + T.reimb;
      const allBiz =
        biz > 0 &&
        list.every(
          (h) => (h.type || 'house') === 'business',
        ); /* a list of businesses: Revenue, then the costs it takes to keep only the margin, so the lines add up to owner profit */
      const rows = [
        allBiz
          ? L('Revenue per month', $f(rev)) +
            L(
              'Operating costs (' + r(rev > 0 ? 100 - (T.rent / rev) * 100 : 0, 1) + '% of revenue)',
              m(Math.max(0, rev - T.rent)),
            )
          : L((biz && !T.tax && !T.maint ? 'Owner profit' : 'Rent') + ' per month', $f(T.rent)),
        T.reimb > 0.5 ? L('Costs tenants pay back (NNN)', $f(T.reimb)) : '',
        L('Total income <small>(cash flow without any expense)</small>', $f(inc), 'tot'),
        T.vac > 0.5 ? L('Vacancy (' + r(g.vac, 1) + '% of income)', m(T.vac)) : '',
        T.tax > 0.5 ? L('Property tax', m(T.tax)) : '',
        T.ins > 0.5 ? L('Insurance', m(T.ins)) : '',
        T.hoa > 0.5 ? L('HOA', m(T.hoa)) : '',
        T.maint > 0.5
          ? L(
              own ? 'Maintenance and repairs' : 'Maintenance (' + r(g.maint, 1) + '% of price a year)',
              m(T.maint),
            )
          : '',
        T.mgmt > 0.5
          ? L(own ? 'Property management' : 'Property management (' + r(g.mgmt, 1) + '%)', m(T.mgmt))
          : '',
        T.res > 0.5 ? L('Replacement reserves', m(T.res)) : '',
        T.oth > 0.5 ? L('Other owner-paid costs', m(T.oth)) : '',
        L('Cash flow before the loan payment', $s(T.noi), 'tot'),
        T.pay > 0.5 ? L('Loan payment (principal and interest)', m(T.pay)) : L('Loan payment', 'none'),
        T.mip > 0.5 ? L('Mortgage insurance', m(T.mip)) : '',
        L('Cash flow after all expenses', $s(T.cf), 'tot fin'),
      ].join('');
      return `<div class="bk" data-testid="cat-breakdown"><h4>Monthly income and expenses <small>today</small></h4>${rows}</div>`;
    };
    const secOf = (id, title, list, tp, pre) => {
      CDEF[id] = id === 'cat-house' || id === 'cat-owned-house' || empty ? false : true;
      const open = !(UI.coll[id] === undefined ? CDEF[id] : UI.coll[id]),
        tid = (pre || '') + (tp || 'sold'),
        lt = E.latestOf(list);
      const nn = tp ? NOUN[tp] : ['sold', 'sold'],
        sub = list.length ? statStrip(tp, list, tid) : 'None yet';
      return `<section class="card cat${open ? ' open' : ''}${tp ? '' : ' soldcat'}" data-testid="cat-${tid}"><div class="cathw"><div class="cath" data-coll="${id}" role="button" tabindex="0" aria-expanded="${open}" data-testid="cat-header-${tid}"><span class="catt"><b>${title}</b></span><span class="chev" aria-hidden="true">›</span></div><div class="cats" data-testid="cat-sub-${tid}" aria-label="Latest added, for information only">${sub}</div></div>
        ${open ? `<div class="catbody" data-catbody="${tid}">${list.length ? list.map((h, i) => rowOf(h, list, i)).join('') : `<p class="none" data-testid="cat-empty-${tid}">None yet</p>`}${tp && !pre ? `<button class="addrow" data-add="${tp}" data-testid="add-${tp}">+ Add ${ADD[tp]}</button>` : ''}${list.length && tp ? costBreakdown(list, tid) : ''}${!tp && list.length ? '<p class="note" data-testid="sold-note">Numbers follow purchase order, counted from 1 on this page only (Planned and Real number their own assets). A sold asset keeps its place in that order, so its number is missing from the other lists here. Cash profit is after selling costs, the loan, tax and the cash you put in.</p>' : ''}${list.length > 1 && tp && !pre ? '<p class="note hold">Hold and drag ⋮⋮ to reorder. An asset is never bought before the ones above it, and they fund it.</p>' : ''}</div>` : ''}</section>`;
    };
    const CATS = [
      ['house', 'Homes'],
      ['commercial', 'Commercial'],
      ['business', 'Businesses'],
    ];
    const soldAll = S.houses.filter(isSold),
      soldOwned = soldAll.filter((h) => h.status === 'owned').sort((a, b) => bno[a.id] - bno[b.id]),
      soldPlanned = soldAll.filter((h) => h.status !== 'owned').sort((a, b) => bno[a.id] - bno[b.id]);
    const typeList = (tp, own) =>
      S.houses
        .filter((h) => (h.type || 'house') === tp && (h.status === 'owned') === own && !isSold(h))
        .sort(
          own ? (a, b) => bno[a.id] - bno[b.id] : () => 0,
        ); /* bought rows are shown oldest first = by their number; planned rows stay in list order (stable sort) */
    const ownedAll = S.houses.filter((h) => h.status === 'owned' && !isSold(h)),
      plannedAll = S.houses.filter((h) => h.status !== 'owned');
    const ownedSecs = CATS.filter(([tp]) => typeList(tp, true).length)
      .map(([tp, title]) => secOf('cat-owned-' + tp, title, typeList(tp, true), tp, 'owned-'))
      .join('');
    const plannedSecs = CATS.map(([tp, title]) =>
      secOf('cat-' + tp, title, typeList(tp, false), tp, ''),
    ).join('');
    const soldSecP = soldPlanned.length ? secOf('cat-sold', 'Sold', soldPlanned, null) : '',
      soldSecO = soldOwned.length ? secOf('cat-owned-sold', 'Sold', soldOwned, null, 'owned-') : '';
    const sections = plannedSecs + soldSecP;
    const dueTot = ownedAll.reduce((a2, h) => a2 + pl.V[h.id].B0, 0),
      lineTot = ownedAll.reduce((a2, h) => a2 + pl.V[h.id].head0, 0);
    const lastPayoff = Math.max(
      0,
      ...ownedAll.filter((h) => pl.V[h.id].B0 > 0.5).map((h) => pl.loanEnd[h.id]),
    );
    const head = `<div class="mast"><span class="kick"><span class="kl">The </span>Portfolio<span class="kl"> Review</span></span><span class="hb">${page === 'planned' && S.houses.filter((x) => x.status !== 'owned').length > 1 ? '<button type="button" class="btn reorderbtn" data-go="order" data-testid="reorder-main-btn" aria-label="Reorder the buy order"><span class="ri" aria-hidden="true">⇅</span><span class="rl">Reorder</span></button>' : ''}<button class="txtbtn" data-go="finances" data-testid="finances-link">Finances</button><button class="ic" data-go="settings" aria-label="Settings" data-testid="settings-link">⚙</button></span></div><h1 class="disp sr">Portfolio</h1>
        ${storageOK ? '' : '<div class="warnbox">⚠ Storage is unavailable, so changes will not be saved. Export a backup from Assumptions.</div>'}
    <div class="seg pagetabs pill" role="tablist" aria-label="Portfolio pages" data-testid="page-tabs">${[
      ['planned', 'Planned'],
      ['real', 'Real'],
      ['saved', 'Saved'],
    ]
      .map(
        ([k, l]) =>
          `<button type="button" role="tab" id="tab-${k}" data-page="${k}" class="${page === k ? 'on' : ''}" aria-selected="${page === k}" data-testid="tab-${k}">${l}</button>`,
      )
      .join(
        '',
      )}</div>${page === 'planned' ? notesHtml() : ''}${page === 'planned' && UI.migNote ? `<div class="migrate" role="status" data-testid="migrate-note"><span>Your earlier portfolio is saved in Saved as “${esc(UI.migNote)}”.</span><button type="button" class="chip link" data-mig-dismiss data-testid="migrate-dismiss" aria-label="Dismiss this note">Dismiss</button></div>` : ''}`;
    /* the quiet group at the bottom of Planned: the actions that are not the plan itself */
    const manage =
      page === 'planned'
        ? `<section class="card listg" data-testid="manage">${S.houses.filter((x) => x.status !== 'owned').length > 1 ? '<button type="button" class="rowbtn" data-go="order" data-testid="buy-order-link"><span>Change the buy order</span><span class="chev" aria-hidden="true">›</span></button>' : ''}<button class="rowbtn" data-go="import/new" data-testid="import-link"><span>Import from a listing</span><span class="chev" aria-hidden="true">›</span></button><button class="rowbtn dngrow" data-clear-ask data-testid="clear-plan-btn"><span>Remove all planned assets</span></button>${ask === 'clearplan' ? clearBox() : ''}</section>`
        : '';
    if (page === 'saved') return head + savedPage(pl);
    /* ---------- Real: only what you have bought. Its totals are the sums of the rows shown (plan-end numbers, like every row) ---------- */
    if (page === 'real') {
      if (!ownedAll.length && !soldOwned.length)
        return (
          head +
          `<section class="card realempty" data-testid="real-empty"><b data-testid="bought-empty">Nothing bought yet</b><p class="note">This page shows what you have really bought: the loan still due, the line of credit it opens and when each loan is paid off. Add something you already own to see it here. Your plan on the Planned page does not need anything bought.</p><button class="btn" data-add-owned data-testid="add-owned" aria-label="Add something you already own">+ Add owned</button></section>`
        );
      const rSn = pl.snap.filter((x) => ownedAll.some((h) => h.id === x.id)),
        rs = rSn.reduce((a, x) => ({ nw: a.nw + x.equity, pay: a.pay + x.payment, cf: a.cf + x.cf }), {
          nw: 0,
          pay: 0,
          cf: 0,
        }),
        plAlt = isToday() ? pl.raw : E.realPlan(S, pl),
        rsA = plAlt.snap
          .filter((x) => ownedAll.some((h) => h.id === x.id))
          .reduce((a, x) => ({ nw: a.nw + x.equity, pay: a.pay + x.payment, cf: a.cf + x.cf }), {
            nw: 0,
            pay: 0,
            cf: 0,
          });
      const tdR = E.todayTotals(
          S,
          pl,
          ownedAll.map((h) => h.id),
        ),
        xOwn = pl
          .assetsAt(0)
          .filter((x) => S.houses.some((h) => h.id === x.id && h.status === 'owned'))
          .reduce(
            (a, x) => a + (x.extra || 0),
            0,
          ); /* the engine's extra now for the bought assets, so Planned + Real = the whole plan */
      const y28 = isToday() ? rsA : rs,
        y28inc = ((pl.raw || pl).snap || [])
          .filter((x) => ownedAll.some((h) => h.id === x.id))
          .reduce((a, x) => a + x.income, 0),
        y28ds = y28inc - y28.cf,
        y28dscr =
          y28ds > 0.5 ? y28inc / y28ds : null; /* year-28 amounts in future dollars (the small lines) */
      const signR = tdR.cf < -0.5 ? 'Negative income' : 'Positive total income',
        fut = ' (future dollars)';
      const badOwn = ownedAll.filter((h) => (h.type || 'house') === 'house' && pl.V[h.id].cf < 0);
      const payTxt = !ownedAll.some((h) => pl.V[h.id].B0 > 0.5)
        ? 'no loans to pay off'
        : isFinite(lastPayoff)
          ? 'every loan paid off in <b>' + ym(lastPayoff) + '</b>'
          : 'not every loan is paid off within the plan';
      return (
        head +
        `<section class="card" data-testid="summary"><div class="kg">
        ${kpi('kpi-networth', 'Net worth', $f(tdR.nw), `${ownedAll.length} bought asset${ownedAll.length === 1 ? '' : 's'}`, '', 0, `${$f(rsA.nw)} at year ${endYr}${isToday() ? '' : ' (' + altLbl() + ')'}`, $f(rs.nw))}
        ${kpi('kpi-monthly', 'Total monthly payments', $f(tdR.payment), signR, '', 0, `${$f(y28.pay)}/mo at year ${endYr}${fut}`)}
        ${kpi('kpi-cashflow', 'Cash flow / mo', $s(tdR.cf), signR, tdR.cf < 0 ? 'bad' : '', 1, `${$s(y28.cf)}/mo at year ${endYr}${fut}`)}
        ${kpi('kpi-dscr', 'DSCR', tdR.dscr !== null ? r(tdR.dscr, 2) : '—', tdR.dscr !== null ? signR : 'no loan left', tdR.dscr !== null && tdR.dscr < 1 ? 'bad' : '', 1, y28dscr !== null ? `${r(y28dscr, 2)} at year ${endYr}${fut}` : '')}</div>
        <p class="plan-line" data-testid="real-loans">Loans due today <b data-testid="real-due">${$f(dueTot)}</b> · credit line <b data-testid="real-line">${$f(lineTot)}</b>${infoBtn('creditline')} · ${payTxt}.</p><p class="note unitnote" data-testid="unit-note">${isToday() ? "2026*: net worth is in today's dollars (no inflation); payments, cash flow and DSCR are today's. The small lines are the year-" + endYr + ' amounts.' : "Net worth is in future dollars; payments, cash flow and DSCR are today's. The small lines are the year-" + endYr + ' amounts.'}</p></section>
      <section class="card" id="ledger" style="margin-top:10px" data-testid="ledger"><div class="row totrow" data-testid="ledger-total"><div class="r1"><span class="nm"><span class="addr">Bought total</span><div class="pay">${$f(tdR.payment)}/mo payments<br><span data-testid="total-extra" data-k="tot">${$f(xOwn)}/mo extra now</span></div></span><span class="cfl ${tdR.cf < 0 ? 'bad' : 'ok'}"><b data-testid="total-cf">${$s(tdR.cf)}/mo</b><small>${tdR.cf < -0.5 ? 'Negative income' : 'Positive income'}</small></span></div></div></section>
      ${badOwn.length ? `<div class="warnbox" data-testid="home-warning">⚠ Homes must cash flow positive. Losing money each month at today's terms: ${badOwn.map((h) => esc(h.addr)).join(', ')}.</div>` : ''}
      <div class="sech" data-testid="sec-bought"><b>Bought</b><span class="sechs" data-testid="bought-sum">${ownedAll.length} asset${ownedAll.length === 1 ? '' : 's'} · loans due <b>${$f(dueTot)}</b> · credit line <b>${$f(lineTot)}</b></span></div>${ownedSecs}${ownedAll.length ? '<button class="addrow" data-add-owned data-testid="add-owned">+ Add something you already own</button>' : ''}${soldSecO}`
      );
    }
    /* ---------- Planned (the default page): the plan and its math ---------- */
    const nOwn0 = S.houses.filter((x) => x.status === 'owned').length;
    /* with nothing planned there is no plan to grade: the owned assets are shown and judged on Real, so no zero KPIs, verdict, Checks or target line here */
    if (empty || nOwn0 === S.houses.length)
      return (
        head +
        `<p class="note" style="margin:0 4px 8px" data-testid="empty-note">${empty ? 'Nothing added yet.' : 'Nothing planned yet.'} Add a home, a commercial property or a business to see your plan.</p>${nOwn0 ? `<p class="note" style="margin:0 4px 8px" data-testid="empty-bought-note">${nOwn0} bought asset${nOwn0 === 1 ? ' is' : 's are'} counted on Real. <button type="button" class="linkbtn" data-page="real" data-testid="empty-real-link">Open Real</button></p>` : ''}${sections}${manage}`
      );
    const c3 = (label, a, b, c, f, cls) =>
      `<tr><td>${label}</td><td data-k="c-${label}-a">${f(a)}</td><td data-k="c-${label}-b">${f(b)}</td><td class="${cls || ''}" data-k="c-${label}-c"><b>${f(c)}</b></td></tr>`;
    const restSn = pl.snap.filter((x) => !ownSn.includes(x)),
      td = E.todayTotals(
        S,
        pl,
        restSn.map((x) => x.id),
      ),
      bt = (tp) => {
        const rs2 = restSn.filter((x) => x.type === tp),
          o = rs2.reduce((a, x) => ({ n: a.n + 1, value: a.value + x.value, equity: a.equity + x.equity }), {
            n: 0,
            value: 0,
            equity: 0,
          });
        o.cf = E.todayTotals(
          S,
          pl,
          rs2.map((x) => x.id),
        ).cf;
        return o;
      }; /* value and equity are at the plan end (2026* dollars); cash flow is today's (2026*) */
    const bRow = (label, o, cls) =>
      `<tr class="${cls || ''}"><td>${label}</td><td>${$c(o.value)}</td><td>${$c(o.equity)}</td><td class="${o.cf < 0 ? 'bad' : ''}">${$cs(o.cf)}</td></tr>`;
    const breakdown = `<table class="cmp" data-testid="breakdown"><thead><tr><th></th><th>Value</th><th><span class="nw">Equity${infoBtn('equity')}</span></th><th><span class="nw">Cash flow/mo</span></th></tr></thead><tbody>
      ${['house', 'commercial', 'business']
        .map((tp) => {
          const o = bt(tp);
          return o.n ? bRow(TPL[tp] + ' (' + o.n + ')', o) : '';
        })
        .join('')}
      ${sn.cash > 0.5 ? bRow('Trust cash', { value: sn.cash, equity: sn.cash, cf: 0 }) : ''}
      ${bRow('Portfolio', { value: restSn.reduce((a, x) => a + x.value, 0), equity: sn.nw, cf: td.cf }, 'tot')}</tbody></table>`;
    /* Checks: one plain row per number; a row is highlighted only when its number passes a safe amount (see SAFE). One root cause is one row: debt-to-income covers the lenders too. */
    const kp = fin ? fin.kpis : null,
      hasCap = !!(S.p && S.p.capital.some((c) => c.amount > 0));
    const dtiOver = pl.worst.dti > g.dti,
      affS = fin
        ? dtiOver && fin.status === 'tight'
          ? 'no'
          : fin.status
        : null; /* lenders who would decline mean "not yet" everywhere: chip, Checks and rows agree */
    const chkRows = [],
      nPlan0 = S.houses.filter((h) => h.status !== 'owned').length,
      noStart = nPlan0 > 0 && pl.unfunded.length === nPlan0,
      anyOwned = S.houses.some(
        (h) => h.status === 'owned',
      ); /* noStart: not one planned asset can be funded, so there is no plan to measure (no purchase month, no loan, no peak) */
    /* every check the app runs, from the engine's one list (E.checkList): value, limit, status, (i). The card cannot drift from the tests because it is generated from them. */
    const LVMAP = { ok: 'ok', caution: 'warn', fail: 'bad' },
      STW = { ok: 'Safe', caution: 'Watch', fail: 'Over the limit' };
    const checkItems = E.checkList(S, pl, fin);
    checkItems.forEach((c) =>
      chkRows.push({
        id: c.id,
        lvl: LVMAP[c.status],
        label: esc(c.label),
        val: esc(c.value),
        info: c.info,
        sub: `<b class="cst" data-testid="${c.id}-status">${STW[c.status]}</b>${c.limit ? ' · limit: <span data-testid="' + c.id + '-limit">' + esc(c.limit) + '</span>' : ''} · ${esc(c.how)}`,
      }),
    );
    const chkWorst = Math.max(0, ...chkRows.map((x) => LV[x.lvl])),
      chkAll = chkWorst === 0,
      chkCollapsed = UI.coll.checks === undefined ? chkAll : UI.coll.checks,
      chkOpen = !chkCollapsed;
    CDEF.checks =
      chkAll; /* all safe: the rows stay folded behind Details; something to look at: they start open. The Details button is there in both states and never moves. */
    const nFlag = chkRows.filter((x) => x.lvl !== 'ok').length;
    const chkList = chkRows
      .map(
        (x) =>
          `<div class="chk lv-${x.lvl}" data-testid="${x.id}" data-lvl="${x.lvl}"><div class="ct"><b>${x.label}</b>${infoBtn(x.info)}<span class="cv lv-${x.lvl}">${x.val}</span></div><small>${x.sub}</small></div>`,
      )
      .join('');
    const checks = `<section class="card checks ${chkAll ? 'safe' : chkWorst === 2 ? 'over' : 'caution'}" data-testid="checks" data-n="${chkRows.length}"><div class="chkh"><h2 class="chkt">Health${infoBtn('checks')}</h2><button type="button" class="chip link chkbtn" data-coll="checks" aria-expanded="${chkOpen}" data-testid="checks-details">Details ${chkOpen ? '▾' : '▸'}</button></div>${chkAll ? `<p class="chkok" data-testid="checks-ok">✓ All ${chkRows.length} checks are in the safe range</p>` : `<p class="chkflag ${chkWorst === 2 ? 'bad' : 'warn'}" data-testid="checks-flag">${nFlag} of ${chkRows.length} to look at</p>`}${chkOpen ? `<div class="chklist" data-testid="checks-list">${chkList}</div>` : ''}${fin ? '<button type="button" class="linkbtn leftbtn" data-go="finances" data-testid="checks-finances">Open Finances ›</button>' : ''}</section>`;
    const badHomes = S.houses.filter((h) => (h.type || 'house') === 'house' && pl.V[h.id].cf < 0);
    const homeWarn = badHomes.length
      ? `<div class="warnbox" data-testid="home-warning">⚠ Homes must cash flow positive. Losing money each month at today's terms: ${badHomes.map((h) => esc(h.addr)).join(', ')}.</div>`
      : '';
    const tab = UI.tab,
      nb = S.houses
        .filter((h) => h.status === 'planned' && isFinite(pl.purchase[h.id]))
        .sort((a, b) => pl.purchase[a.id] - pl.purchase[b.id])[0];
    const nPl = S.houses.filter((h) => h.status !== 'owned').length,
      lastReady = Math.max(
        0,
        ...S.houses
          .filter((h) => h.status !== 'owned')
          .map((h) => pl.purchase[h.id])
          .filter(isFinite),
      );
    const extraCash = S.p
      ? Math.max(0, pl.outsideTotal - (+S.p.cash || 0))
      : 0; /* the cash beyond your savings the plan needs: the headline and Checks say the same thing */
    const headline = nPl
      ? pl.unfunded.length
        ? `${n - nPl ? n - nPl + ' bought. ' : 'Nothing bought yet. '}${nPl - pl.unfunded.length} of ${nPl} planned ${nPl === 1 ? 'is' : 'are'} possible; ${pl.unfunded.length} cannot. `
        : `${n - nPl ? n - nPl + ' bought. ' : 'Nothing bought yet. '}${nPl === 1 ? 'The 1 planned asset is possible; it is' : extraCash > 0.5 ? 'All ' + nPl + ' planned are possible once you add ' + $f(extraCash) + ' from your own pocket; the last is' : 'All ' + nPl + ' planned are possible; the last is'} funded at <b>${mond(lastReady)}</b>. `
      : n === 1
        ? 'Your 1 asset is bought. '
        : `All ${n} assets are bought. `;
    const drv = pl
        .assetsAt(pl.planM)
        .filter((x) => !ownSn.some((o) => o.id === x.id))
        .sort((a, b) => b.equity - a.equity),
      drvOpen = !UI.coll.drivers;
    const drivers = `<button class="linkbtn leftbtn" data-coll="drivers" aria-expanded="${drvOpen}">What drives net worth ${drvOpen ? '▾' : '▸'}</button>${
      drvOpen
        ? `<div data-testid="drivers">${drv
            .slice(0, 6)
            .map(
              (d) =>
                `<div class="drv"><span>${esc(d.addr)}</span><span><b>${$f(d.equity)}</b> <small>${sn.nw > 0 ? r((d.equity / sn.nw) * 100) : 0}%</small></span></div>`,
            )
            .join(
              '',
            )}<p class="note">Equity = value − loans − credit lines drawn. A sample like this leans on a few fast-growing businesses; check the growth rate on each.</p></div>`
        : ''
    }`;
    const bar = `<div class="bar"><i class="${sn.cltv > g.cap ? 'over' : ''}" style="width:${Math.min(100, (sn.cltv / g.cap) * 100)}%"></i></div><div class="cap"><span data-k="cltv">Debt ${r(sn.cltv)}% of value</span><span>cap ${g.cap}%</span></div>`;
    const nwNow = E.todayTotals(
      S,
      pl,
      ownedAll.map((h) => h.id),
    ).nw; /* net worth NOW: bought assets + savings (one engine function, same as the Real page) */
    const plSn = pl.snap.filter((x) => x.type !== 'cash'),
      isOwnSn = (x) => S.houses.some((h) => h.id === x.id && h.status === 'owned'),
      bCf = plSn.filter(isOwnSn).reduce((a, x) => a + x.cf, 0),
      bN = plSn.filter(isOwnSn).length;
    return (
      head +
      `
    <div class="pg"><aside class="side">
    <section class="card hero" data-testid="summary"><p class="plantarget" data-testid="plan-target"><b data-testid="unit-label">${isToday() ? '2026*' : 'Future dollars'}</b>${infoBtn('units')}${isToday() ? '' : '<span class="note" data-testid="unit-foot"> each figure in the dollars of its own year</span>'}</p>
      <div class="kg herokg">
      ${kpi('kpi-networth', 'Net worth', $f(nwNow), `${n - nPl} bought${nPl ? ' · ' + nPl + ' planned' : ''}`, '', 0, `${$f(snAlt.nw)} at year ${yrs}${isToday() ? '' : ' (' + altLbl() + ')'}`, $f(sn.nw))}
      ${kpi('kpi-cashflow', 'Cash flow / mo', $s(td.cf), td.cf < -0.5 ? 'Negative income' : 'Positive total income', td.cf < -0.5 ? 'bad' : '', 1, '')}</div>
      ${fin ? `<div class="vrow big ${affS}" data-go="finances" data-testid="afford-line" role="link"><span class="vq"><b>Can I afford this?</b><span class="note">${esc(affS !== fin.status ? 'Lenders may decline a loan around ' + mond(pl.worst.month) + '.' : fin.headline.replace(/^(Yes|Tight|Not yet)\.\s*/, ''))}</span></span><span class="vgo"><span class="vchip ${affS}" data-testid="afford-chip" data-lvl="${affS === 'yes' ? 'ok' : affS === 'tight' ? 'warn' : 'bad'}">${VL[affS]}</span> ›</span></div>` : ''}
      ${(() => {
        CDEF.afford = true;
        const ao = !(UI.coll.afford === undefined ? CDEF.afford : UI.coll.afford);
        return `<button type="button" class="chip link chkbtn" data-coll="afford" aria-expanded="${ao}" data-testid="afford-details">Details ${ao ? '▾' : '▸'}</button><div class="fold" data-testid="afford-body"${ao ? '' : ' hidden'}><p class="plan-line${extraCash > 0.5 ? ' warn' : ''}" data-testid="plan-headline">${headline}</p></div>`;
      })()}</section>
    ${checks}
    <section class="card foldc" data-testid="more-figures">${(() => {
      CDEF.more = true;
      const mo = !(UI.coll.more === undefined ? CDEF.more : UI.coll.more);
      return `<button type="button" class="rowbtn" data-coll="more" aria-expanded="${mo}" data-testid="more-toggle"><span>More figures</span><span class="chev" aria-hidden="true">›</span></button><div class="fold" data-testid="more-body"${mo ? '' : ' hidden'}>`;
    })()}
      ${(() => {
        const pe = fin && fin.kpis && fin.kpis.planEnd,
          v = pe ? (isToday() ? pe.cfAfter : pe.cfAfter / E.dfac(S, pe.month)) : null;
        /* progress = the AFTER-TAX cash flow at plan end, always in today's dollars (2026*) */ return `<p class="plantarget" data-testid="cf-target"><b data-testid="cf-target-label">After-tax cash flow target $1.3M/mo (2026*)</b>${v === null || !isFinite(v) ? '' : `<span class="note" data-testid="cf-progress" data-pct="${Math.round((v / E.CF_TARGET) * 100)}"> Plan end, after tax: ${$f(v)}/mo, ${Math.round((v / E.CF_TARGET) * 100)}% of the target</span>`}</p>`;
      })()}<div class="kg">
      ${kpi('kpi-monthly', 'Total monthly payments', $f(td.payment), td.cf < -0.5 ? 'Negative income' : 'Positive total income', '', 0, '')}
      ${kpi('kpi-dscr', 'DSCR', td.dscr !== null ? r(td.dscr, 2) : '—', td.cf < -0.5 ? 'Negative income' : 'Positive total income', td.dscr !== null && td.dscr < 1 ? 'bad' : '', 1)}</div>
      ${(() => {
        const pp = S.p || {},
          inf = +pp.inflation || 0,
          open = !!UI.coll.tgt,
          snT = isToday() ? sn : snAlt,
          snF = isToday() ? snAlt : sn;
        return `<div class="tgt" data-testid="target-years"><button type="button" class="linkbtn leftbtn tgtb" data-coll="tgt" aria-expanded="${open}" data-testid="target-toggle">By year ${yrs}: ${$f(snAlt.nw)} ${isToday() ? 'in future' : "in today's"} <span class="nw">dollars ${open ? '▾' : '▸'}</span></button>${open ? `<div class="tgtf">${field('Years to reach this net worth', 'g.planYears', g.planYears, { info: 'projection' })}${S.p ? field('Cost increase / year', 'p.inflation', r(pp.inflation, 2), { suf: '%', info: 'inflation' }) : ''}</div><p class="note" data-testid="real-nw">${$f(snF.nw)} in ${yrs} year${+yrs === 1 ? '' : 's'} buys what ${$f(snT.nw)} buys today, at ${r(inf, 1)}% cost increase a year. Planned prices are today's; nothing is inflated. Change the years to move the target date.</p>` : ''}</div>`;
      })()}
    <section class="card plain" id="ledger" data-testid="ledger"><div class="row totrow" data-testid="ledger-total"><div class="r1"><span class="nm"><span class="addr">Portfolio total</span><div class="pay">${$f(td.payment)}/mo payments<br><span data-testid="total-extra" data-k="tot">${$f(totNow)}/mo extra now${totLater > 0.5 ? ' · +' + $f(totLater) + ' later' : ''}</span></div></span><span class="cfl ${td.cf < 0 ? 'bad' : 'ok'}"><b data-testid="total-cf">${$s(td.cf)}/mo</b><small>${td.cf < -0.5 ? 'Negative income' : 'Positive income'}</small></span></div></div></section>
    </div></section>${soldSecP}</aside>
    <div class="mainc">
    <div class="listh"><h2>The buy order</h2></div>
    ${plannedSecs}
    <section class="card" data-testid="plan-card"><b>Portfolio breakdown</b> <span class="note">${nPl} asset${nPl === 1 ? '' : 's'} · ${noStart ? 'no purchase can be funded' : 'last purchase ' + mond(pl.lastBuy)}${infoBtn('planpace')}</span>
      ${bar}<p class="note" data-testid="bd-unit">${isToday() ? '2026*' : 'Future dollars'}: value and equity at the end of the plan (${dtm(pl.planM)}); cash flow today. Planned prices are today's prices; nothing is inflated.</p>${breakdown}
      ${homeWarn}${sn.cash > 0.5 ? `<p class="note" data-testid="cash-note">Trust cash = cash the trust holds: what is kept after selling costs and the loan payoff, and pooled cash flow not yet spent${infoBtn('cashfromselling')}. It counts in net worth.</p>` : ''}${drivers}
      <div class="seg" role="tablist"><button data-tab="timeline" class="${tab === 'timeline' && UI.open ? 'on' : ''}" data-testid="timeline-toggle">Timeline</button><button data-tab="nw" class="${tab === 'nw' && UI.open ? 'on' : ''}" data-testid="networth-toggle">Net worth</button><button data-tab="hide" class="${!UI.open ? 'on' : ''}">Hide</button></div>
      ${UI.open ? (tab === 'nw' ? nwChart(pl) : timeline(pl)) : ''}</section>
    ${manage}</div></div>`
    );
  }


  /* The whole-portfolio plan: purchase months, sales, cash, month-by-month series, plan-level KPIs.
     THE TRUST MODEL. Every asset sits in one trust and the trust borrows against all of it. Walking the list in order, a planned asset is bought the first month the POOL of
     everything before it (assets owned today plus the planned assets above it that are already bought) can pay its cash need (down payment + closing + improvements):
       pool room   = sum over pool assets of max(0, cap% x (1 - appraisal cut) x value - loan balance - liens), minus what the trust has drawn on its line so far
       cash        = cash the trust is holding: the pool's cash flow reinvested (after the line is paid off) and sale proceeds
       bought when   max(0, room) + cash >= need   (and not before the asset's own "not before" month, buyIn)
     The purchase uses held cash first and draws the rest on the line (the draw is charged to the new asset, at the Assumptions line rate). Each month the pool's total cash flow (income minus costs,
     loan payments, insurance and line interest; only a positive total) is swept first into paying the line down, which raises the room, then into cash. Extra payments (owner money) only speed up loan principal.
     The first asset of the whole list, with nothing before it, is bought on its own month with outside cash. An asset the trust can never fund (within 50 years) is skipped and shows as not funded. */
  function plan(S) {
    const hs = S.houses,
      g = S.g,
      V = {};
    hs.forEach((h) => (V[h.id] = view(S, h)));
    const planM = Math.round(Math.max(1, g.planYears || 20) * 12),
      hz = isFinite(+g.horizon) ? +g.horizon : GDEF.horizon,
      TS = Math.max(600, Math.min(2400, Math.round(hz)));
    const queue0 = hs.filter((h) => h.status !== 'owned'),
      skipped = {},
      hel = isFinite(+g.hrate) ? +g.hrate : GDEF.hrate;
    let P0,
      sellAt,
      mergeAt,
      dr,
      cur,
      exits,
      fund,
      readyAt,
      cashA,
      outsideA,
      reinv,
      bought,
      blocked,
      BAL,
      PAY,
      RAT,
      LS,
      AUTO,
      JOBX,
      CALLS,
      FUT = null,
      JS,
      JU,
      JLN,
      JC,
      JLO,
      JSH,
      JCR,
      LQ,
      SALET,
      best;
    const exitTimes = (h) => {
      const p = P0[h.id];
      sellAt[h.id] = Infinity;
      mergeAt[h.id] = Infinity;
      if (!isFinite(p)) return;
      const m = Math.max(Math.round(h.exitMonth || 0), p + 1);
      if (h.exit === 'sell') sellAt[h.id] = m;
      else if (h.exit === 'merge') mergeAt[h.id] = m;
    };
    /* state of an asset at month t, ignoring whether it has been sold (hl = its line draw this month) */
    function st(h, t, hl) {
      const p = P0[h.id];
      if (!isFinite(p) || t < p) return null;
      const v = V[h.id],
        age = t - p,
        B = BAL[h.id][t] || 0,
        live =
          B >
          0.005; /* the balance is simulated month by month (scheduled payments, your extra, the profit and job money that go to the loan) */
      const improved = (+h.arv > 0 || h.liftIncome) && age >= Math.max(0, h.capexMonths || 0),
        merged = t >= mergeAt[h.id];
      const fv = merged ? 1 + (h.exitLift || 0) / 100 : 1;
      const fi = (improved ? 1 + (h.liftIncome || 0) / 100 : 1) * (merged ? 1 + (h.exitLift || 0) / 100 : 1);
      const val = valAt(S, h, age) * fv,
        heloc = hl === undefined ? (dr[h.id] ? dr[h.id][Math.min(t, TS)] : 0) : hl;
      return {
        v,
        age,
        live,
        B,
        val,
        heloc,
        depAge: age0(h) + age,
        gfi: (h.price > 0 ? valK(S, h, age) / valK(S, h, 0) : 1) * fi,
      }; /* income and costs grow from TODAY's entered rent: growth since the purchase (paid months) is already in today's rent */
    }
    const held = (h, t) => t < sellAt[h.id];
    /* what the pool of held assets looks like at month t (draws are the trust's line balances, charged to the assets they bought) */
    function snapOf(t) {
      const out = [];
      for (const h of bought) {
        if (!held(h, t)) continue;
        const a = st(h, t, cur[h.id]);
        if (!a) continue;
        const v = a.v,
          hi = (cur[h.id] * hel) / 1200,
          sched = a.live ? PAY[h.id][t] + mipNow(h, a) : 0;
        const intr = (a.live ? a.B * RAT[h.id][t] : 0) + hi,
          dep = depCum(S, h, a.depAge + 1) - depCum(S, h, a.depAge),
          biz = (h.type || 'house') === 'business';
        out.push({
          h,
          a,
          tx: v.noi * a.gfi - intr - dep,
          biz,
          live: t < mergeAt[h.id],
          inc: v.noi * a.gfi,
          sched,
          hi,
          draw: cur[h.id],
          room: Math.max(0, (capOf(S, h) / 100) * (1 - g.haircut / 100) * a.val - a.B - (h.liens || 0)),
        });
      }
      return out;
    }
    /* pooled numbers for a snapshot at month t: room, line drawn, cash flow (income minus costs, loan payments and line interest), and the part of it the trust can reinvest: the trust pays the managers of businesses you do not run and the income tax on the portfolio's profit first (only when there is a personal profile) */
    const pp = S.p || null;
    const sumSnap = (sn, t) => {
      let room = 0,
        draw = 0,
        cf = 0,
        re = 0,
        bz = 0,
        nb = 0;
      sn.forEach((x) => {
        room += x.room;
        draw += x.draw;
        cf += x.inc - x.sched - x.hi;
        if (x.biz) {
          bz += x.tx;
          if (x.live) nb++;
        } else re += x.tx;
      });
      const tax = pp ? portTaxAt(S, t, re, bz) : 0,
        gm = pp
          ? Math.max(0, nb - (pp.operating || 0)) *
            (pp.gmMonthly || 0) *
            Math.pow(1 + (pp.inflation || 0) / 100, t / 12)
          : 0;
      return {
        n: sn.length,
        room,
        draw,
        head: room - draw,
        cf,
        tax,
        gm,
        re,
        bz,
        sweep: Math.max(0, cf - tax - gm),
      };
    };
    /* equal (or weighted) split of x over loans, each limited to what is still owed; what no loan can take comes back */
    function spread(x, items) {
      const got = {};
      let rem = x,
        act = items.filter((i) => i.cap > 0.005 && i.w > 0);
      for (let g2 = 0; g2 < 8 && rem > 0.005 && act.length; g2++) {
        const W = act.reduce((a2, i) => a2 + i.w, 0),
          nxt = [];
        let used = 0;
        act.forEach((i) => {
          const give = Math.min(i.cap - (got[i.id] || 0), (rem * i.w) / W);
          got[i.id] = (got[i.id] || 0) + give;
          used += give;
          if (i.cap - got[i.id] > 0.005) nxt.push(i);
        });
        rem -= used;
        act = nxt;
      }
      return { got, left: Math.max(0, rem) };
    }
    /* the loan of asset h at month t starts from balance B (and refinances when it comes due) */
    function setMonth(h, t, B) {
      const id = h.id,
        L = LS[id],
        age = t - P0[id];
      if (L.m === age && !L.refi && B > 0.005) {
        L.refi = true;
        L.ir = refiRateOf(S, h) / 1200;
        L.Pr = amort(B, L.ir, refiTermOf(S, h));
      }
      BAL[id][t] = B;
      PAY[id][t] = B > 0.005 ? (L.refi ? L.Pr : L.P) : 0;
      RAT[id][t] = L.refi ? L.ir : L.i;
    }
    const startLoan = (h, t) => {
      const B0 = balToday(h),
        m0 = matOf(h);
      LS[h.id] = {
        P: payment(h),
        i: mi(h),
        m: m0 > 0 && B0 > 0.005 ? Math.max(0, m0 - age0(h)) : Infinity,
        refi: false,
        ir: 0,
        Pr: 0,
      };
      BAL[h.id] = new Array(TS + 2).fill(0);
      PAY[h.id] = new Array(TS + 2).fill(0);
      RAT[h.id] = new Array(TS + 2).fill(0);
      AUTO[h.id] = new Array(TS + 2).fill(0);
      JOBX[h.id] = new Array(TS + 2).fill(0);
      setMonth(h, t, B0);
    };
    /* balance after month t's scheduled payment and the owner's extra payment (before any automatic extra) */
    const nextBal = (h, t) => {
      const B = BAL[h.id][t];
      return B > 0.005 ? Math.max(0, B * (1 + RAT[h.id][t]) - PAY[h.id][t] - V[h.id].X) : 0;
    };
    function run() {
      P0 = {};
      sellAt = {};
      mergeAt = {};
      dr = {};
      cur = {};
      exits = {};
      fund = {};
      readyAt = {};
      bought = [];
      blocked = null;
      best = {};
      BAL = {};
      PAY = {};
      RAT = {};
      LS = {};
      AUTO = {};
      JOBX = {};
      CALLS = new Array(TS + 1).fill(0);
      cashA = new Array(TS + 1).fill(0);
      outsideA = new Array(TS + 1).fill(0);
      reinv = new Array(TS + 1).fill(0);
      JS = new Array(TS + 1).fill(0);
      JU = new Array(TS + 1).fill(0);
      JLN = new Array(TS + 1).fill(0);
      JC = new Array(TS + 1).fill(0);
      JLO = new Array(TS + 1).fill(0);
      JSH = new Array(TS + 1).fill(0);
      JCR = new Array(TS + 1).fill(0);
      LQ = new Array(TS + 1).fill(0);
      SALET = new Array(TS + 1).fill(0);
      hs.forEach((h) => {
        cur[h.id] = 0;
        P0[h.id] = h.status === 'owned' ? 0 : Infinity;
        exitTimes(h);
        if (h.status === 'owned') {
          bought.push(h);
          dr[h.id] = new Array(TS + 1).fill(0);
          startLoan(h, 0);
        }
      });
      const queue = queue0.filter((h) => !skipped[h.id]);
      let C = 0,
        out = 0,
        qi = 0,
        L = pp ? +pp.cash || 0 : 0,
        outPrev = 0;
      const autoPay = g.autoPay !== false,
        infl = pp ? (pp.inflation || 0) / 100 : 0,
        apy = pp ? (pp.cashApy || 0) / 1200 : 0;
      for (let t = 0; t <= TS; t++) {
        if (t === 0)
          hs.forEach((h) => {
            if (h.status === 'owned' && !h.finCapex && h.capex > 0) out += h.capex;
          }); /* improvements on assets owned today are paid with outside money */
        /* 1) sales put net proceeds (after the sold asset's own line draw) in the trust's cash */
        for (const h of bought)
          if (sellAt[h.id] === t) {
            const a = st(h, t, cur[h.id]);
            if (!a) continue;
            const proceeds = a.val * (1 - (h.sellCost || 0) / 100) - a.B - (h.liens || 0);
            exits[h.id] = {
              month: t,
              proceeds,
              price: a.val,
              net: a.val * (1 - (h.sellCost || 0) / 100),
              age: a.depAge,
              dep: depCum(S, h, a.depAge),
              cost: costBasis(S, h),
            };
            let taxNow = 0;
            if (pp) {
              const m0 = sumSnap(snapOf(t), t);
              taxNow =
                (
                  saleTax(S, { exits, T: TS, series: { txRE: { [t]: m0.re }, txBiz: { [t]: m0.bz } } }, h) || {
                    tax: 0,
                  }
                ).tax || 0;
              SALET[t] += taxNow;
            } /* the tax on the sale is paid out of the sale proceeds (below); only what the proceeds cannot cover comes out of your savings */
            /* the proceeds (after the sold asset's own loan) go to the trust's cash; the sold asset's own line draw stays with the trust and moves to the oldest asset still held (with nothing left, cash pays it) */
            let x = proceeds;
            if (x < 0) {
              out += -x;
              x = 0;
            }
            const own = cur[h.id];
            cur[h.id] = 0;
            if (own > 0.005) {
              const o = bought.find((q) => q !== h && held(q, t));
              if (o) cur[o.id] += own;
              else {
                const p0 = Math.min(own, x);
                x -= p0;
                out += own - p0;
              }
            }
            if (taxNow > 0 && x > 0) {
              const fromSale = Math.min(taxNow, x);
              x -= fromSale;
              SALET[t] -= fromSale;
            }
            C += x;
          }
        /* 2) the next planned asset in the list is bought when the pool can pay for it. Nothing is ever bought before an asset above it in the list: the queue is walked in list order and stops at the first one that is not ready. */
        let snap = snapOf(t);
        const rsv0 = pp
          ? (pp.emergencyMonths || 0) * ((pp.living || 0) * Math.pow(1 + infl, t / 12) + (g.otherDebt || 0))
          : 0; /* the cash cushion stays in your savings */
        while (qi < queue.length) {
          const N = queue[qi],
            pool = bought.length > 0,
            bi = Math.max(0, Math.round(N.buyIn || 0)),
            base = downAmt(N) + (N.price * clPct(S, N)) / 100;
          const cap0 = N.finCapex ? 0 : Math.max(0, N.capex || 0),
            needAmt = base + cap0,
            sm = sumSnap(snap, t),
            avail = Math.max(0, sm.head) + C;
          const jso = N.jobSavedOverride,
            own = pp
              ? jso !== null && jso !== undefined && !pool
                ? Math.max(0, (+pp.cash || 0) - rsv0) + jso
                : Math.max(0, L - rsv0)
              : Infinity; /* jso: the job money saved up is typed in (Auto = null) and replaces the accrued amount for a first purchase */ /* nothing is owned yet: the first purchase is paid from your savings above the cushion plus the job money saved since */
          if (pool && (!best[N.id] || avail > best[N.id].avail)) best[N.id] = { avail, month: t };
          if (!pool && pp && (!best[N.id] || own > best[N.id].avail)) best[N.id] = { avail: own, month: t };
          if (pool && readyAt[N.id] === undefined && avail >= needAmt - 1e-6) readyAt[N.id] = t;
          if (t < bi || (pool && readyAt[N.id] === undefined)) break;
          if (pool && avail < needAmt - 1e-6) break;
          if (!pool && pp && own < needAmt - 1e-6) break;
          P0[N.id] = t;
          exitTimes(N);
          dr[N.id] = new Array(TS + 1).fill(0);
          startLoan(N, t);
          if (pool) {
            const C0 = C,
              useC = Math.min(C, needAmt);
            C -= useC;
            cur[N.id] = needAmt - useC;
            fund[N.id] = {
              pool: true,
              n: sm.n,
              room: Math.max(0, sm.head),
              heldCash: C0,
              have: avail,
              cf: sm.sweep,
              gross: sm.cf,
              cash: useC,
              draw: needAmt - useC,
              need: needAmt,
            };
          } else {
            const nd = base + cap0;
            out += nd;
            if (pp && jso !== null && jso !== undefined) {
              const dj = jso - Math.max(0, L - (+pp.cash || 0));
              L += dj;
              JCR[t] += dj;
            }
            /* the typed job money is REAL cash: it replaces the job money accrued so far (L - today's savings), counted once, at the purchase month */ fund[
              N.id
            ] = {
              pool: false,
              n: 0,
              room: 0,
              cf: 0,
              cash: 0,
              draw: 0,
              need: nd,
              have: pp ? own : nd,
              savings: pp ? Math.min(nd, Math.max(0, (+pp.cash || 0) - rsv0)) : nd,
              rsv: rsv0,
            };
          }
          bought.push(N);
          qi++;
          snap = snapOf(t);
        }
        /* 3) record the state and sweep the month's pooled cash flow. Order of use: (a) pay the trust's line down (oldest draw first); (b) while a planned asset is still waiting, hold the rest as cash for it; (c) once nothing is left to buy, the rest goes to each
           asset's own loan as an automatic extra payment, in proportion to the cash flow each asset earned. Your job money left after living costs and your cash cushion follows the same order, but is split equally across the loans. */
        snap.forEach((x) => {
          dr[x.h.id][t] = cur[x.h.id];
        });
        cashA[t] = C;
        outsideA[t] = out;
        const sm1 = sumSnap(snap, t),
          cf = sm1.sweep,
          pending = qi < queue.length,
          cap = {};
        let anyLoan = false;
        snap.forEach((x) => {
          const b = nextBal(x.h, t);
          if (b > 0.005) {
            cap[x.h.id] = b;
            anyLoan = true;
          }
        });
        const payLine = (amt) => {
          let y = amt;
          for (const h of bought) {
            if (y <= 0) break;
            if (!held(h, t) || !(cur[h.id] > 0)) continue;
            const pay = Math.min(cur[h.id], y);
            cur[h.id] -= pay;
            y -= pay;
          }
          return y;
        };
        let x = cf > 0 ? payLine(cf) : 0;
        if (cf > 0 && pending) {
          C += x;
          x = 0;
        } /* x = the part of the pooled cash flow left once the line is paid and nothing is waiting: it is yours unless it can go to a loan */
        let Xu = 0;
        snap.forEach((x2) => {
          if (x2.a.live) Xu += x2.a.v.X;
        });
        const liv = pp ? (pp.living || 0) * Math.pow(1 + infl, t / 12) : 0,
          dbt = pp ? g.otherDebt || 0 : 0,
          inc = jobsNet(S, t),
          port = sm1.cf - sm1.tax - sm1.gm;
        let intr = 0,
          cI = 0,
          oT = 0,
          pCand = x,
          jCand = 0,
          scale = autoPay ? 1 : 0;
        if (pp) {
          /* Your own month first: take-home pay minus living costs, other debts and your extra payments (a portfolio loss comes out of it too). If that is not enough to live on, the portfolio profit left over pays for living first. What is left after that
             goes to the loans (profit in proportion to what each asset earned, job money equally), as long as your cash stays at or above the emergency cushion. */
          intr = t > 0 ? Math.max(0, L + cashA[t - 1]) * apy : 0;
          cI = pp.capital.reduce((a2, c) => a2 + (c.month === t ? c.amount : 0), 0);
          oT = pp.planned.reduce((a2, c) => a2 + (c.month === t ? c.amount : 0), 0);
          const calls = out - outPrev + oT + SALET[t] - cI - intr,
            G = inc - liv - dbt - Xu + Math.min(0, port),
            rsv = (pp.emergencyMonths || 0) * (liv + dbt);
          CALLS[t] = Math.max(0, out - outPrev + oT + SALET[t]); /* one-time costs this month */
          const cand = pending ? (bought.length ? Math.max(0, G) : 0) : Math.max(0, G + x);
          /* with nothing owned yet there is no trust to send job money to: it stays in your cash for the first purchase */ pCand =
            pending ? 0 : Math.min(x, cand);
          jCand = cand - pCand;
          const flow =
            inc -
            liv -
            dbt -
            Xu +
            port -
            (t > 0 ? reinv[t - 1] : 0) +
            intr +
            cI -
            oT -
            (out - outPrev) -
            SALET[
              t
            ]; /* what your cash does this month before the loan money; your cash after = L + flow - what moves, and the trust's cash (cashA[t]) counts in the cushion */
          scale =
            autoPay && cand > 0
              ? Math.min(cand, Math.max(0, L + cashA[t] + flow - rsv - (FUT ? FUT[t] : 0))) / cand
              : 0;
          /* FUT = costs still to come (one-time expenses, sale taxes, outside cash for purchases): that money stays in your cash */ JS[
            t
          ] = Math.max(0, G);
        }
        let pSpent = 0;
        if (!pending && pCand > 0.005 && scale > 0 && anyLoan) {
          const r = spread(
            pCand * scale,
            snap.map((x2) => ({
              id: x2.h.id,
              w: Math.max(0, x2.inc - x2.sched - x2.hi),
              cap: cap[x2.h.id] || 0,
            })),
          );
          Object.keys(r.got).forEach((id) => {
            AUTO[id][t] = r.got[id];
            cap[id] -= r.got[id];
            pSpent += r.got[id];
          });
        }
        if (cf > 0) reinv[t] = cf - (x - pSpent);
        if (jCand * scale > 0.005) {
          const J0 = jCand * scale;
          let J = J0,
            want = 0;
          /* your own amount for a home (jobPay, set on its page) is paid to that loan first, never more than the loan, never more than the job money there is; what it could not get is recorded (JSH) so the page can warn */
          const jfac = Math.pow(
            1 + infl,
            t / 12,
          ); /* the amount is in today's dollars (2026*), like everything the page shows; the plan works in future dollars, so it grows with the cost increase */
          snap.forEach((x2) => {
            const jp0 = x2.h.jobPay,
              jp = jp0 === null || jp0 === undefined ? jp0 : jp0 * jfac;
            if (jp === null || jp === undefined || !(cap[x2.h.id] > 0.005)) return;
            want += jp;
            const give = Math.min(jp, cap[x2.h.id], J);
            if (give > 0) {
              JOBX[x2.h.id][t] += give;
              cap[x2.h.id] -= give;
              JLO[t] += give;
              J -= give;
            }
          });
          const fixedPaid = J0 - J;
          JSH[t] = Math.max(0, want - fixedPaid);
          let y = payLine(J);
          JLN[t] = J - y;
          if (pending) {
            C += y;
            JC[t] = y;
            y = 0;
          } else if (y > 0.005 && anyLoan) {
            const r = spread(
              y,
              snap.map((x2) => ({
                id: x2.h.id,
                w: x2.h.jobPay === null || x2.h.jobPay === undefined ? 1 : 0,
                cap: cap[x2.h.id] || 0,
              })),
            );
            Object.keys(r.got).forEach((id) => {
              JOBX[id][t] += r.got[id];
              cap[id] -= r.got[id];
              JLO[t] += r.got[id];
            });
            y = r.left;
          }
          JU[t] = J0 - y;
        }
        if (pp) {
          L +=
            inc -
            liv -
            dbt -
            Xu +
            port -
            (t > 0 ? reinv[t - 1] : 0) -
            JU[t] +
            intr +
            cI -
            oT -
            (out - outPrev) -
            SALET[t];
          LQ[t] = L;
        }
        outPrev = out;
        /* 4) next month's loan balances: the scheduled payment, your extra, and the automatic extra from the asset's own profit and from your job */
        for (const h of bought) {
          if (!held(h, t) || !(BAL[h.id][t] > 0.005) || t + 1 > TS) continue;
          /* a loan keeps running through the month an asset is sold: the sale pays off its balance */ setMonth(
            h,
            t + 1,
            Math.max(0, nextBal(h, t) - (AUTO[h.id][t] || 0) - (JOBX[h.id][t] || 0)),
          );
        }
      }
      blocked = qi < queue.length ? queue[qi] : null;
    }
    const keepBest =
      {}; /* the closest an unfunded asset got to its cash (recorded in the run where it blocked the queue; the final run leaves it out) */
    const settle = () => {
      for (let i = 0; i <= queue0.length + 1; i++) {
        run();
        if (!blocked) break;
        if (best[blocked.id]) keepBest[blocked.id] = best[blocked.id];
        skipped[blocked.id] = 1;
      }
    };
    settle();
    if (pp && g.autoPay !== false && CALLS.some((c) => c > 0.5)) {
      /* second pass: now the costs still to come are known, so loan payments never use up the cash they need */
      FUT = new Array(TS + 2).fill(0);
      for (let t = TS - 1; t >= 0; t--) FUT[t] = FUT[t + 1] + CALLS[t + 1];
      settle();
    }
    const sellKeys = hs.map((h) => (isFinite(sellAt[h.id]) ? sellAt[h.id] : 0)),
      mergeKeys = hs.map((h) => (isFinite(mergeAt[h.id]) ? mergeAt[h.id] : 0));
    const finiteBuys = hs.map((h) => P0[h.id]).filter(isFinite);
    const lastEvent = Math.max(0, ...finiteBuys, ...sellKeys, ...mergeKeys);
    const lastBuy = finiteBuys.length ? Math.max.apply(null, finiteBuys) : 0;
    const T = Math.min(TS, g.horizon, Math.max(120, lastEvent + 60, planM));
    const keys = [
      'nw',
      'monthly',
      'extra',
      'noi',
      'ds',
      'cf',
      'cfx',
      'debt',
      'value',
      'rent',
      'dsti',
      'dti',
      'count',
      'outside',
      'sav',
      'cash',
      'intr',
      'dep',
      'txRE',
      'txBiz',
    ];
    const s = {};
    keys.forEach((k) => (s[k] = new Array(T + 1).fill(0)));
    const dpCash = new Array(T + 1).fill(0),
      savA = new Array(T + 1).fill(0);
    for (let t = 1; t <= T; t++)
      dpCash[t] =
        reinv[
          Math.min(TS, t - 1)
        ]; /* pooled cash flow that moved into the trust (line paydown or cash) is no longer yours to spend */
    for (let t = 0; t <= T; t++) {
      let incAdd = 0,
        debtAdd = 0;
      for (const h of hs) {
        if (!held(h, t)) continue;
        const a = st(h, t);
        if (!a) continue;
        const { v } = a,
          hi = (a.heloc * hel) / 1200,
          sched = a.live ? PAY[h.id][t] + mipNow(h, a) : 0,
          ex = a.live ? v.X : 0,
          rentG = h.rent * a.gfi,
          reimbG = v.reimb * a.gfi;
        const intr = (a.live ? a.B * RAT[h.id][t] : 0) + hi,
          dep = depCum(S, h, a.depAge + 1) - depCum(S, h, a.depAge),
          tx = v.noi * a.gfi - intr - dep;
        s.intr[t] += intr;
        s.dep[t] += dep;
        if ((h.type || 'house') === 'business') s.txBiz[t] += tx;
        else s.txRE[t] += tx;
        s.count[t]++;
        s.value[t] += a.val;
        s.debt[t] += a.B + (h.liens || 0) + a.heloc;
        s.nw[t] += a.val - a.B - (h.liens || 0) - a.heloc;
        s.noi[t] += v.noi * a.gfi;
        s.ds[t] += sched + hi;
        s.extra[t] += ex;
        s.rent[t] += rentG;
        s.monthly[t] += sched + ex + v.escrow + hi;
        s.dsti[t] += sched + v.escrow + hi;
        const net = (g.rentCount / 100) * (rentG + reimbG) - (sched + v.escrow + hi);
        if (net >= 0) incAdd += net;
        else debtAdd += -net;
      }
      savA[t] = pp ? (t === 0 ? (+pp.cash || 0) - outsideA[0] : LQ[t]) : 0;
      s.nw[t] = netWorth(
        s.nw[t],
        savA[t],
        cashA[t],
      ); /* plan net worth = equity + your savings + the trust's cash, the same formula as today's (todayTotals). Month 0 = today's savings less what is paid out of them that month; later months = the plan's savings after every cost, so a purchase month drops net worth only by its closing costs */
      s.sav[t] = savA[t];
      s.cash[t] = cashA[t];
      s.outside[t] = outsideA[t];
      s.cf[t] = s.noi[t] - s.ds[t];
      s.cfx[t] = s.cf[t] - s.extra[t];
      const inc = (g.p1 + g.p2) / 12 + jobsGross(S, t) + incAdd,
        debts = g.otherDebt + housingAt(S, t) + debtAdd;
      s.dti[t] = inc > 0 ? Math.min(999, (debts / inc) * 100) : debts > 0 ? 999 : 0;
    }
    const at = (t) => {
      t = Math.max(0, Math.min(T, Math.round(t)));
      const o = { month: t };
      keys.forEach((k) => (o[k] = s[k][t]));
      o.cltv = o.value ? (o.debt / o.value) * 100 : 0;
      o.dscr = o.ds ? o.noi / o.ds : 0;
      return o;
    };
    /* every asset's contribution to the portfolio totals at month t; the entries sum exactly to the series values */
    const assetsAt = (t) => {
      t = Math.min(T, Math.round(t));
      const list = hs
        .map((h) => {
          if (!held(h, t)) return null;
          const a = st(h, t);
          if (!a) return null;
          const v = a.v,
            hi = (a.heloc * hel) / 1200,
            sched = a.live ? PAY[h.id][t] + mipNow(h, a) : 0,
            ex = a.live ? v.X : 0,
            inc = v.noi * a.gfi;
          return {
            id: h.id,
            addr: h.addr,
            type: h.type || 'house',
            equity: a.val - a.B - (h.liens || 0) - a.heloc,
            value: a.val,
            debt: a.B + (h.liens || 0) + a.heloc,
            payment: sched + ex + v.escrow + hi,
            cf: inc - sched - hi,
            income: inc,
            extra: ex,
          };
        })
        .filter(Boolean);
      if (Math.abs(savA[t]) > 0.5)
        list.push({
          id: '__savings',
          addr: 'Your savings',
          type: 'cash',
          equity: savA[t],
          value: 0,
          debt: 0,
          payment: 0,
          cf: 0,
          income: 0,
        });
      if (s.cash[t] > 0.5)
        list.push({
          id: '__cash',
          addr: 'Cash in the trust',
          type: 'cash',
          equity: s.cash[t],
          value: s.cash[t],
          debt: 0,
          payment: 0,
          cf: 0,
          income: 0,
        });
      return list;
    };
    /* the pool at the END of month t: how many assets, borrowing room, line drawn, room left, pooled monthly cash flow, cash held */
    const poolAt = (t) => {
      t = Math.max(0, Math.min(TS, Math.round(t)));
      const sn = [];
      for (const h of bought) {
        if (!held(h, t)) continue;
        const a = st(h, t);
        if (!a) continue;
        const v = a.v,
          hi = (a.heloc * hel) / 1200,
          sched = a.live ? PAY[h.id][t] + mipNow(h, a) : 0;
        sn.push({
          inc: v.noi * a.gfi,
          sched,
          hi,
          draw: a.heloc,
          biz: (h.type || 'house') === 'business',
          live: t < mergeAt[h.id],
          tx:
            v.noi * a.gfi -
            ((a.live ? a.B * RAT[h.id][t] : 0) + hi) -
            (depCum(S, h, a.depAge + 1) - depCum(S, h, a.depAge)),
          room: Math.max(0, (capOf(S, h) / 100) * (1 - g.haircut / 100) * a.val - a.B - (h.liens || 0)),
        });
      }
      const m = sumSnap(sn, t);
      return {
        month: t,
        n: m.n,
        room: m.room,
        drawn: m.draw,
        head: Math.max(0, m.head),
        cf: m.cf,
        tax: m.tax,
        gm: m.gm,
        sweep: m.sweep,
        cash: cashA[t],
      };
    };
    const order = queue0.filter((h) => !skipped[h.id]).concat(queue0.filter((h) => skipped[h.id]));
    const funds = {};
    hs.forEach((h) => {
      funds[h.id] = !!(fund[h.id] && fund[h.id].pool);
    });
    const trust = {};
    let prevM = 0;
    hs.forEach((h) => {
      if (h.status === 'owned') return;
      const m = P0[h.id],
        f = fund[h.id] || null,
        bi = Math.max(0, Math.round(h.buyIn || 0)),
        rd = readyAt[h.id] === undefined ? Infinity : readyAt[h.id];
      /* month = the one clock everywhere: months from today. ready = the first month the pool could pay (room + cash >= need); month = ready, or the 'not before' month if that is later (held = true). */
      trust[h.id] = {
        month: m,
        ready: rd,
        held: isFinite(m) && isFinite(rd) && m > rd,
        buyIn: bi,
        ok: isFinite(m),
        pooled: funds[h.id],
        n: f ? f.n : 0,
        room: f ? f.room : 0,
        cf: f ? f.cf : 0,
        cash: f ? f.cash : 0,
        draw: f ? f.draw : 0,
        heldCash: f ? f.heldCash : 0,
        have: f ? f.have : 0,
        need: f ? f.need : needFor(S, h),
        savings: f ? f.savings || 0 : 0,
        rsv: f ? f.rsv || 0 : 0,
        gross: f ? f.gross : 0,
        best: best[h.id] || keepBest[h.id] || null,
      };
    });
    /* loans: balance at any month, and the month each loan is paid off (with the extra from your own profit and your job); 0 = no loan, Infinity = not within the plan horizon */
    const loanEnd = {},
      balAt = (id, t) => (BAL[id] ? BAL[id][Math.max(0, Math.min(TS, Math.round(t)))] || 0 : 0);
    hs.forEach((h) => {
      const p = P0[h.id];
      if (!isFinite(p)) {
        loanEnd[h.id] = Infinity;
        return;
      }
      let e = Infinity;
      for (let t = p; t <= TS; t++)
        if (!(BAL[h.id][t] > 0.005)) {
          e = t;
          break;
        }
      loanEnd[h.id] = e;
    });
    const shareAt = (A) => (id, t) => (A[id] ? A[id][Math.max(0, Math.min(TS, Math.round(t)))] || 0 : 0);
    const firstPos = (A) => (id) => {
      const a = A[id];
      if (!a) return -1;
      for (let t = 0; t <= TS; t++) if (a[t] > 0.005) return t;
      return -1;
    };
    const jobs = {
      short: JSH.slice(0, T + 1),
      surplus: JS.slice(0, T + 1),
      used: JU.slice(0, T + 1),
      line: JLN.slice(0, T + 1),
      cash: JC.slice(0, T + 1),
      loans: JLO.slice(0, T + 1),
      credit: JCR.slice(0, T + 1),
      liquid: LQ.slice(0, T + 1),
    };
    const rows = queue0.map((h) => {
      const m = P0[h.id],
        r = {
          id: h.id,
          target: h.id,
          start: prevM,
          locM: isFinite(m) ? Math.max(0, m - prevM) : Infinity,
          end: m,
          ok: isFinite(m),
          funds: funds[h.id],
          ready: trust[h.id].ready,
        };
      if (isFinite(m)) prevM = Math.max(prevM, m);
      return r;
    });
    let worst = { dti: 0, month: 0 };
    for (let t = 0; t <= T; t++) if (s.dti[t] > worst.dti) worst = { dti: s.dti[t], month: t };
    let extraLater = 0;
    hs.forEach((h) => {
      const v = V[h.id];
      if (isFinite(P0[h.id]) && P0[h.id] > 0 && v.L > 0 && v.payoff > 0) extraLater += v.X;
    });
    const res = {
      dpCash,
      jobUsed: jobs.used,
      outsideTotal: s.outside[T],
      extraNow: s.extra[0],
      extraLater,
      purchase: P0,
      sellAt,
      mergeAt,
      exits,
      series: s,
      T,
      lastBuy,
      lastEvent,
      planM: Math.min(T, planM),
      today: at(0),
      final: at(Math.min(T, lastEvent)),
      horizon: at(Math.min(T, planM)),
      saleTaxPersonal: SALET.slice(0, T + 1) /* sale tax the proceeds could not cover (comes out of savings) */,
      at,
      assetsAt,
      poolAt,
      snap: assetsAt(Math.min(T, planM)),
      rows,
      jobs,
      loanEnd,
      balAt,
      autoAt: shareAt(AUTO),
      jobAt: shareAt(JOBX),
      autoFrom: firstPos(AUTO),
      jobFrom: firstPos(JOBX),
      funds,
      fundedByLOC: funds,
      trust,
      V,
      worst,
      unfunded: hs.filter((h) => !isFinite(P0[h.id])).map((h) => h.id),
      skipped: Object.keys(skipped),
      queue: order.map((h) => h.id),
    };
    /* CASH PROFIT of a sold asset = what the sale leaves in cash (sale price - selling costs - the loan and liens paid off) - the tax on the sale - the cash you put in (down payment + closing costs + improvements paid in cash). exits[id].profit; a loss is negative. */
    hs.forEach((h) => {
      const ex = exits[h.id];
      if (!ex) return;
      const sx = saleTax(S, res, h);
      ex.tax = sx ? sx.tax : 0;
      ex.cashIn = needFor(S, h);
      ex.profit = ex.proceeds - ex.tax - ex.cashIn;
    });
    return res;
  }


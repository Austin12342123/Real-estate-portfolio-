import { describe, it, expect } from 'vitest';
import fx from '../fixtures/money.js';
const { E, t1, t2, t4, t5, G: G0, P: P0, A: A0 } = fx;
const close = (a, b, d = 0.005) => expect(Math.abs(a - b)).toBeLessThan(d);

describe('T1 one asset, month-0 money', () => {
  const S = t1(), h = S.houses[0], pl = E.plan(S), td = E.todayTotals(S, pl);
  it('EGI 2232, management 178.56, NOI 1383.44, cash flow 183.44, DSCR 1.15', () => {
    close(E.view(S, h).egi, 2232); close(E.mgmtAmt(S, h), 178.56); close(td.noi, 1383.44); close(td.cf, 183.44);
    expect(td.dscr.toFixed(2)).toBe('1.15');
  });
  it('cushion 6900 = 3 months x 2300', () => expect(S.p.emergencyMonths * (S.p.living + S.g.otherDebt)).toBe(6900));
  it('net worth today = equity 100000 + savings 50000 + trust 0', () => {
    expect([td.eq, td.cash, td.trust, td.nw]).toEqual([100000, 50000, 0, 150000]);
  });
});

describe('T2 job money for the first purchase', () => {
  const best = (typed) => { const r = E.plan(t2(typed)).trust.w; return r.have || r.best.avail; };
  it('automatic 21050', () => close(best(null), 21050));
  it('typed 15000 gives 28100', () => close(best(15000), 28100));
  it('typed 5000 (Replace) gives 18100 and the plan is short by 1900', () => {
    const pl = E.plan(t2(5000));
    close(pl.trust.w.best.avail, 18100); expect(pl.unfunded).toEqual(['w']);
    close(pl.trust.w.need - pl.trust.w.best.avail, 1900);
  });
});

describe('T3 credit line (fixture: owned 200000 with 115000 loan; planned 85000 home bought at month 0 on the line)', () => {
  const { E: Ee, G, P, A } = fx;
  const S = { g: G(), p: P({ cash: 0, emergencyMonths: 0, living: 0 }), houses: [A({ id: 'a', price: 200000, dp: 42.5, rate: 6, rent: 1500, tax: 0, ins: 0 }), A({ id: 'w', status: 'planned', price: 85000, dp: 20, rate: 6, rent: 800, tax: 0, ins: 0 })] };
  const pl = Ee.plan(S), m = pl.poolAt(0);
  it('draw 17000 (the 85000 home needs 17000 down and the trust has no cash)', () => close(m.drawn, 17000));
  it('room 59250 = 55000 on the owned home + 4250 on the new one (0.85 x 85000 - 68000)', () => close(m.room, 59250));
  it('room left 42250 = 59250 - 17000 (card: 38000 from room 55000)', () => close(m.head, 42250));
  it('trust cash 0: month-0 trust cash is always 0 (sales start at month 1, sweep is recorded from month 1); card: 10000', () => close(m.cash, 0));
  it('net worth 85000 = owned equity 85000 + new home 85000 - 68000 loan - 17000 line + 0 savings; card: -4500', () => close(pl.series.nw[0], 85000));
});

describe('T3b a month when the trust holds cash (same fixture, planned home bought at month 36 with 3% closing)', () => {
  const { E: Ee, G, P, A } = fx;
  const mk = (cl) => ({ g: G(), p: P({ cash: 0, emergencyMonths: 0, living: 0 }), houses: [A({ id: 'a', price: 200000, dp: 42.5, rate: 6, rent: 1500, tax: 0, ins: 0 }), A({ id: 'w', status: 'planned', price: 85000, dp: 20, rate: 6, rent: 800, tax: 0, ins: 0, buyIn: 36, closingPct: cl })] });
  const a = Ee.plan(mk(0)), b = Ee.plan(mk(3));
  it('the trust holds cash the month before and pays the purchase from it (no line draw)', () => { expect(b.poolAt(35).cash).toBeGreaterThan(17000 + 2550 - 1000); expect(b.trust.w.month).toBe(36); expect(b.poolAt(36).drawn).toBe(0); });
  it('net worth in the purchase month is lower by exactly the closing costs (2550), and stays lower by that', () => { close(a.series.nw[36] - b.series.nw[36], 2550, 0.01); close(a.series.nw[37] - b.series.nw[37], 2550, 0.01); });
  it('room gap 59250 vs 55000: the pool is read at the END of month 0, after the 85000 home is bought, so it counts that home own room (0.85 x 85000 - 68000 = 4250) on top of the owned home 55000; with only the owned home it is 55000', () => {
    const only = Ee.plan({ g: G(), p: P({ cash: 0, emergencyMonths: 0, living: 0 }), houses: [mk(0).houses[0]] });
    const both = Ee.plan({ g: G(), p: P({ cash: 0, emergencyMonths: 0, living: 0 }), houses: [mk(0).houses[0], Object.assign({}, mk(0).houses[1], { buyIn: 0 })] });
    close(only.poolAt(0).room, 55000); close(both.poolAt(0).room - only.poolAt(0).room, 4250);
  });
});

describe('T6 savings fund the first purchase (cushion 0, house at month 3: price 200000, down 40000, closing 6000)', () => {
  const mk = (cash) => ({ g: Object.assign(G0(), { maint: 0 }), p: P0({ cash, emergencyMonths: 0, living: 0 }), houses: [A0({ id: 'w', status: 'planned', price: 200000, dp: 20, rate: 0, rent: 0, tax: 0, ins: 0, buyIn: 3, closingPct: 3 })] });
  const pl = E.plan(mk(60000));
  it('savings 60000 -> savings 14000 and net worth 54000 at month 3; month 2 is still 60000', () => {
    close(pl.jobs.liquid[3], 14000); close(pl.series.nw[3], 54000); close(pl.series.nw[2], 60000); expect(pl.trust.w.month).toBe(3);
  });
  it('savings 30000 -> not bought, short by 16000 and never borrowed', () => {
    const S = mk(30000), p2 = E.plan(S), F = E.feasible(S, p2, null).assets.w;
    expect(p2.unfunded).toEqual(['w']); close(F.cash.short, 16000); close(p2.jobs.liquid[3], 30000); expect(p2.poolAt(3).drawn).toBe(0);
    expect(F.short).toMatch(/16,000/);
  });
});

describe('T4 sale', () => {
  it('proceeds 72000, profit 12000', () => {
    const ex = E.plan(t4()).exits.s;
    close(ex.proceeds, 72000); close(ex.profit, 12000);
  });
});

describe('T5 plan net worth = equity + savings + trust cash (one shared netWorth)', () => {
  const S = t5(), pl = E.plan(S), td = E.todayTotals(S, pl);
  it('plan start matches today (100000 + 50000 + 0 trust)', () => { expect(td.nw).toBe(150000); close(pl.series.nw[0], td.nw); });
  it('plan end = equity + personal savings + trust cash', () => {
    const T = pl.T, eq = pl.assetsAt(T).filter((x) => x.type !== 'cash').reduce((a, x) => a + x.equity, 0);
    close(pl.series.nw[T], eq + pl.jobs.liquid[T] + pl.series.cash[T], 0.01);
  });
  it('E.netWorth exists and adds the three parts', () => expect(E.netWorth(1, 2, 3)).toBe(6));
});

describe('CAN-I-BUY fixture (price 170839, financed reno 35000, cash to close 15747, savings 25849)', () => {
  const S = { g: G0(), p: P0({ cash: 25849, emergencyMonths: 0, living: 0 }), houses: [A0({ id: 'w', status: 'planned', price: 170839, dp: 4.1498, rate: 7, rent: 2000, tax: 0, ins: 0, closingPct: 4.2175, capex: 35000, finCapex: true })] };
  const pl = E.plan(S), sf = E.shortfall(S, pl, null, 'w');
  it('cash to close is about 15747 and savings cover it with about 10102 to spare', () => { close(sf.cash.need, 15747, 1); close(sf.cash.have - sf.cash.need, 10102, 1); });
  it('Money still uncovered compares cash you can pull out with cash to close (nothing is uncovered), not the full price (was -144990)', () => {
    expect(sf.lines.uncovered.value).toBe(0); expect(sf.cash.uncovered).toBe(0); expect(sf.lines.uncovered.how).toMatch(/cash to close/);
  });
  it('Down payment covered shows the amount to spare, never "short $0"', () => {
    const l = sf.lines.downShort; expect(l.label).toBe('Down payment covered'); close(l.value, 10102, 1); expect(l.how).toMatch(/to spare/); expect(l.how).not.toMatch(/short \$0/);
  });
});

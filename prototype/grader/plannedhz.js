/* Expected page totals, computed from the engine the way the pages define them:
   Planned page = the plan horizon minus what the bought (owned) assets contribute; Real page = only the bought assets. */
module.exports = function (E) {
  const isOwn = (S, id) => S.houses.some((q) => q.id === id && q.status === 'owned');
  const split = (S, pl) => { const own = pl.snap.filter((x) => x.type !== 'cash' && isOwn(S, x.id)); return { own, rest: pl.snap.filter((x) => !own.includes(x)) }; };
  const sum = (a, k) => a.reduce((s, x) => s + (x[k] || 0), 0);
  /* TODAY'S TERMS (2026*), worked out here from the engine's per-asset month-0 numbers (pl.V), not from E.todayTotals: cash flow, payments, income, debt service and DSCR of a list of assets.
     The main-page KPIs show these; the plan-end (year 28) figures stay under .y28 */
  function todayOf(S, pl, ids) {
    const o = { cf: 0, monthly: 0, noi: 0, ds: 0 }; ids.forEach((id) => { const v = pl.V[id]; if (!v) return; o.cf += v.noi - v.P - v.mip; o.monthly += v.P + v.X + v.escrow + v.mip; o.noi += v.noi; o.ds += v.P + v.mip; });
    o.cfx = o.cf; o.dscr = o.ds > 0.5 ? o.noi / o.ds : 0; return o;
  }
  /* planned-only horizon (all fields the Planned KPIs show): net worth, value, debt at the plan end; cash flow, payments, DSCR in today's terms */
  function plannedHz(S, pl) {
    pl = pl || E.planR(JSON.parse(JSON.stringify(S))); const th = pl.horizon, { own, rest } = split(S, pl), y28 = (o) => ({ cf: o.cf, monthly: o.monthly, noi: o.noi, ds: o.ds, dscr: o.dscr });
    const fin = (o) => { const y = y28(o), t = todayOf(S, pl, rest.filter((x) => x.type !== 'cash').map((x) => x.id)); return Object.assign(o, t, { y28: y }); };
    if (!own.length) return fin(Object.assign({}, th));
    const o = Object.assign({}, th); o.nw = th.nw - sum(own, 'equity'); o.monthly = th.monthly - sum(own, 'payment'); o.cf = th.cf - sum(own, 'cf'); o.cfx = th.cfx - sum(own, 'cf'); o.noi = th.noi - sum(own, 'income'); o.value = th.value - sum(own, 'value'); o.debt = th.debt - sum(own, 'debt');
    o.extra = Math.max(0, th.extra - sum(own, 'extra')); o.count = Math.max(0, (th.count || 0) - own.length); const dsv = o.noi - o.cf; o.ds = dsv; o.dscr = dsv > 0.5 ? o.noi / dsv : 0; o.cltv = o.value > 0 ? (o.debt / o.value) * 100 : 0; return fin(o);
  }
  /* bought-only horizon: just the owned assets' shares */
  function realHz(S, pl) {
    pl = pl || E.planR(JSON.parse(JSON.stringify(S))); const { own } = split(S, pl), o = { nw: sum(own, 'equity'), monthly: sum(own, 'payment'), cf: sum(own, 'cf'), noi: sum(own, 'income'), value: sum(own, 'value'), debt: sum(own, 'debt'), extra: sum(own, 'extra'), count: own.length };
    o.ds = o.noi - o.cf; o.dscr = o.ds > 0.5 ? o.noi / o.ds : 0; o.cltv = o.value > 0 ? (o.debt / o.value) * 100 : 0; o.y28 = { cf: o.cf, monthly: o.monthly, noi: o.noi, ds: o.ds, dscr: o.dscr }; Object.assign(o, todayOf(S, pl, own.map((x) => x.id))); return o;
  }
  /* extra payments being paid now by the planned assets (bought assets' extra belongs to the Real page) */
  const plannedExtraNow = (S, pl) => Math.max(0, pl.extraNow - pl.assetsAt(0).filter((x) => x.type !== 'cash' && isOwn(S, x.id)).reduce((a, x) => a + (x.extra || 0), 0));
  return { plannedExtraNow, plannedHz, realHz, split, isOwn, todayOf };
};

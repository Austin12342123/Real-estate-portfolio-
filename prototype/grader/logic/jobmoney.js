/* "Your job money in the trust" (h.jobPay): engine rules, each returning { pass, detail }. Used by logic-grade.js (L9.J1-J5) and runnable on its own against any engine copy. */
const sig = (E) => JSON.stringify(['seed', 'seedPlan', 'seedStretch'].map((nm) => { const S = E.normalize(E[nm]()), pl = E.plan(S), f = E.finance(S, pl); return [Object.values(pl.loanEnd).reduce((a, b) => a + (isFinite(b) ? b : 1e6), 0), Math.round(pl.jobs.used.reduce((a, b) => a + b, 0)), Math.round(pl.snap.reduce((a, x) => a + x.equity, 0)), Math.round(f.kpis.planEnd.cfAfter), pl.lastBuy]; }));
/* golden numbers of the three default plans BEFORE the feature existed (engine at commit 8300277): the default must not move */
const GOLDEN = '[[1436,200796,21555991,234677,100],[10913,1056844,301214033,3157996,271],[3257,18336,542250657,1083061,170]]';
const clone = (o) => JSON.parse(JSON.stringify(o));
exports.checks = (E) => ({
  'L9.J1': { name: 'Job money per home: with no amount set (the default) the three default plans give exactly the numbers they gave before the feature (loan payoffs, job money used, equity, after-tax cash flow, last purchase)', fn: () => { const s = sig(E); return { pass: s === GOLDEN, detail: s }; } },
  'L9.J2': { name: 'Job money per home: an amount set on a bought home goes to that home\'s loan every month it has a balance (500 on Maple: 500 at month 5), pays it off sooner, and the engine exposes the plan\'s own default amount (E.jobDefault) as a positive number', fn: () => {
    if (!E.jobDefault || !E.jobMoney) return { pass: false, detail: 'E.jobDefault / E.jobMoney missing' };
    const S = E.normalize(E.seed()), pl = E.plan(S), S2 = clone(S); S2.houses.find((h) => h.id === 'maple').jobPay = 500; const p2 = E.plan(S2), d = E.jobDefault(S, 'maple', pl);
    const want5 = 500 * Math.pow(1 + S.p.inflation / 100, 5 / 12); /* the amount is in today's dollars (2026*); the plan works in future dollars, so month 5 carries the cost increase */
    const ok = Math.abs(p2.jobAt('maple', 5) - want5) < 0.01 && p2.loanEnd.maple < pl.loanEnd.maple && d.amount > 0 && d.from >= 0;
    return { pass: ok, detail: 'at5 ' + p2.jobAt('maple', 5) + ' want ' + want5 + ' end ' + pl.loanEnd.maple + '->' + p2.loanEnd.maple + ' default ' + JSON.stringify(d) }; } },
  'L9.J3': { name: 'Job money per home: amounts above the job pay left after living costs are reported (E.jobMoney.over, shortMonths) and never create money (the job money that reaches the loans never exceeds the plan\'s job surplus, month by month)', fn: () => {
    if (!E.jobMoney) return { pass: false, detail: 'E.jobMoney missing' };
    const S = E.normalize(E.seed()), S3 = clone(S); S3.houses.forEach((h) => { if (h.status === 'owned') h.jobPay = 5000; }); const p3 = E.plan(S3), jm = E.jobMoney(S3, p3);
    let worst = 0; for (let t = 0; t < p3.jobs.used.length; t++) worst = Math.max(worst, p3.jobs.used[t] - p3.jobs.surplus[t]);
    return { pass: jm.over === true && jm.assigned === 15000 && jm.shortMonths > 0 && worst < 0.01 && E.jobMoney(S, E.plan(S)).over === false, detail: JSON.stringify(jm) + ' worst ' + worst }; } },
  'L9.J4': { name: 'Job money per home: the amount survives normalize (blank or junk = null = the plan\'s split, negative = 0, a number stays) and a home with its own amount is taken out of the equal split', fn: () => {
    const S = E.normalize(E.seed()), a = clone(S); a.houses[0].jobPay = ''; a.houses[1].jobPay = -40; a.houses[2].jobPay = 250; a.houses[3].jobPay = 'x'; const n = E.normalize(a);
    const ok = n.houses[0].jobPay === null && n.houses[1].jobPay === 0 && n.houses[2].jobPay === 250 && n.houses[3].jobPay === null;
    const pl = E.plan(S), S5 = clone(S); S5.houses.find((h) => h.id === 'maple').jobPay = 0; const p5 = E.plan(S5); /* 0 = none for Maple: the others share its part */
    return { pass: ok && p5.jobAt('maple', 105) === 0 && p5.jobAt('cedar', 105) > pl.jobAt('cedar', 105) - 1e-9, detail: JSON.stringify(n.houses.slice(0, 4).map((h) => h.jobPay)) + ' maple ' + p5.jobAt('maple', 105) }; } }
});
if (require.main === module) { const E = require(process.argv[2]); const c = exports.checks(E); Object.keys(c).forEach((k) => { let r; try { r = c[k].fn(); } catch (e) { r = { pass: false, detail: 'CRASH ' + e.message }; } console.log(k, r.pass ? 'PASS' : 'FAIL', String(r.detail).slice(0, 200)); }); }

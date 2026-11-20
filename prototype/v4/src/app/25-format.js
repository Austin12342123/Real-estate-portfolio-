  /* ---------- formatting ---------- */
  const num = (n) => (isFinite(n) ? n : 0);
  const $f = (n) => {
    const a = Math.abs(num(n)),
      sg = n < -0.5 ? '−' : '';
    return a >= 1e9
      ? sg + '$' + (a / 1e9).toFixed(2) + 'B'
      : a >= 1e7
        ? sg + '$' + (a / 1e6).toFixed(1) + 'M'
        : sg + '$' + Math.round(a).toLocaleString('en-US');
  };
  const $s = (n) => (n < -0.5 ? '−' : '+') + $f(Math.abs(n));
  const $k = (n) => {
    const a = Math.abs(num(n)),
      sg = n < 0 ? '−' : '';
    return a >= 1e6
      ? sg + '$' + (a / 1e6).toFixed(a >= 1e7 ? 1 : 2) + 'M'
      : a >= 1e3
        ? sg + '$' + Math.round(a / 1e3) + 'K'
        : sg + '$' + Math.round(a);
  };
  const $c = (n) => {
    const a = Math.abs(num(n));
    return a >= 1e9
      ? $f(n)
      : a >= 1e7
        ? (n < 0 ? '−' : '') + '$' + (a / 1e6).toFixed(1) + 'M'
        : a >= 1e6
          ? (n < 0 ? '−' : '') + '$' + (a / 1e6).toFixed(2) + 'M'
          : $f(n);
  };
  const $cs = (n) => (n < -0.5 ? '−' : '+') + $c(Math.abs(n));
  /* ONE rounded source for a sale: every line is whole dollars, net proceeds is the rounded proceeds, the loan payoff and the cash put in are the remainders, so the card, the note and the proceeds field agree to the dollar and the card adds up exactly */
  const saleParts = (ex) => {
    const R0 = Math.round,
      P = R0(ex.price),
      C = R0(ex.price - ex.net),
      N = R0(ex.proceeds),
      L = P - C - N,
      T = R0(ex.tax),
      F = R0(ex.profit);
    return { P, C, L, N, T, F, I: N - T - F };
  };
  const VL = { yes: 'Yes', tight: 'Tight', no: 'Not yet' };
  /* THE SAFE RANGES, in one place. A check is plain (neutral) while its number is inside the safe range, amber past the caution line, red past the limit.
     Debt-to-income: caution above 85% of the lender limit (36% of a 43% limit), over above the limit. Cash cushion: caution when your cash dips below the emergency cushion, over when it runs out.
     Cash beyond the trust: caution when it is more than all of your savings, over when your cash would run short. Pace: caution when the last purchase lands in the last 10% of the plan or after it ends, over when an asset is never funded. Lasts: caution under 3 months, over under 1 month. A check that is over its limit is red everywhere (row, header, the Can I afford this chip); amber only means caution. */
  const SAFE = {
    dtiCaution: 0.85,
    savingsCaution: 1,
    paceCaution: 0.9,
    lastsCaution: 3,
    lastsOver: 1,
  }; /* lasts: months your cash covers the shortfall if the biggest earners stop paying; amber under 3 months, red under 1 */
  const LV = { ok: 0, warn: 1, bad: 2 };
  const TL = { house: 'Home', commercial: 'Commercial', business: 'Business' },
    TPL = { house: 'Single-family homes', commercial: 'Commercial properties', business: 'Businesses' };
  const grp = (n) => Math.round(num(n)).toLocaleString('en-US');
  const mo = (m) =>
    !isFinite(m) ? 'never' : m <= 0 ? 'now' : m < 24 ? m + ' mo' : Math.floor(m / 12) + 'y ' + (m % 12) + 'm';
  const mm = (m) =>
    !isFinite(m) ? 'never' : m <= 0 ? 'now' : m + ' mo'; /* credit-line timing: plain months */
  /* ONE clock for every purchase and funding time: months from today. mond(): the month number itself; ym(): a length of time (a loan's remaining life). A gap between two assets is never shown. */
  const mon = (m) =>
    !isFinite(m) ? 'never' : m <= 0 ? 'now' : m + (m === 1 ? ' month' : ' months') + ' from today';
  const monY = (m) => mond(m);
  const ym = (m) =>
    !isFinite(m)
      ? 'never'
      : m <= 0
        ? 'now'
        : m < 12
          ? m + ' mo'
          : Math.floor(m / 12) + ' yr' + (m % 12 ? ' ' + (m % 12) + ' mo' : '');
  const mmy = (m) =>
    !isFinite(m)
      ? 'never'
      : m <= 0
        ? 'now'
        : m < 24
          ? m + ' mo'
          : m + ' mo (' + Math.floor(m / 12) + 'y ' + (m % 12) + 'm)';
  const r = (n, d = 0) => (isFinite(n) ? String(+n.toFixed(d)) : '—');
  /* ---------- ONE clock: month 0 is today; month N is today + N months (the day of the month is kept, or the last day of a shorter month). window.REP_TODAY = 'YYYY-MM-DD' (or ?today=YYYY-MM-DD) fixes today, so tests are stable. ---------- */
  const TODAY0 = (() => {
    let q = window.REP_TODAY;
    if (!q) {
      try {
        q = new URLSearchParams(location.search).get('today');
      } catch (e) {}
    }
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(q || '');
    return m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date();
  })();
  const dateAt = (m) => {
    const t = new Date(TODAY0.getFullYear(), TODAY0.getMonth() + Math.round(+m || 0), 1),
      last = new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate();
    t.setDate(Math.min(TODAY0.getDate(), last));
    return t;
  };
  /* one unambiguous format everywhere: 'Nov 12, 2026' (long) and 'Nov 2026' (month only); never 11/12/26, which reads as 11 December outside the U.S. */
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dt = (m) => {
    const t = dateAt(m);
    return MON[t.getMonth()] + ' ' + t.getDate() + ', ' + t.getFullYear();
  };
  const isoToday = () =>
    TODAY0.getFullYear() +
    '-' +
    String(TODAY0.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(TODAY0.getDate()).padStart(2, '0'); /* today as YYYY-MM-DD (the test date when one is set) */
  const isoLong = (q) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(q || '');
    return m ? MON[+m[2] - 1] + ' ' + +m[3] + ', ' + m[1] : '';
  };
  const dtm = (m) => {
    const t = dateAt(m);
    return MON[t.getMonth()] + ' ' + t.getFullYear();
  };
  /* a point in time is always written 'N months from today (Mon YYYY)'; month 0 is always 'today' */
  const mAgo = (m) => m + (m === 1 ? ' month' : ' months') + ' from today';
  const mond = (m) => (!isFinite(m) ? 'never' : m <= 0 ? 'today' : mAgo(m) + ' (' + dtm(m) + ')');
  /* the last word of a name stays on one line with the "edit ›" link that follows it */
  const addrNb = (a, tail) => {
    const t = String(a),
      k = t.lastIndexOf(' ');
    return (
      (k > 0
        ? esc(t.slice(0, k)) + ' <span class="nb">' + esc(t.slice(k + 1))
        : '<span class="nb">' + esc(t)) +
      ' ' +
      tail +
      '</span>'
    );
  };
  const cap = (t) => String(t).charAt(0).toUpperCase() + String(t).slice(1);
  const mondH = (m) =>
    !isFinite(m)
      ? 'never'
      : m <= 0
        ? 'today'
        : mAgo(m) +
          ' (<span class="nb">' +
          dtm(m) +
          '</span>)'; /* the same text as mond(), with the date kept on one line (row text only) */
  const at = (m) => mond(m),
    inm = (m) => mond(m),
    inmH = (m) => mondH(m);
  window.RepDate = { dt, dtm, mond, today: () => dt(0) };

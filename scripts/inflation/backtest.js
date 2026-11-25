'use strict';
// Spec section 5. Errors = actual average CPI inflation over the next H years minus r(H).
const { centralRate } = require('./blend');

const MIN_CASES = 60;

function monthIndex(m) { const [y, mo] = m.split('-').map(Number); return y * 12 + (mo - 1); }
function monthStr(i) { const y = Math.floor(i / 12); return y + '-' + String(i % 12 + 1).padStart(2, '0'); }

// Linear-interpolated percentile of a sorted array, p in 0..1.
function percentile(sorted, p) {
  if (!sorted.length) return NaN;
  const x = (sorted.length - 1) * p, lo = Math.floor(x), hi = Math.ceil(x);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (x - lo);
}

// Trailing 12-month average CPI level ending at month index i, or null if any month is missing.
function avg12(cpi, i) {
  let s = 0;
  for (let k = 0; k < 12; k++) {
    const v = cpi[monthStr(i - k)];
    if (v == null) return null;
    s += v;
  }
  return s / 12;
}

// clevHist: [{month, points:[30]}]; surveyHist: [{month, s}] ascending; cpi: {'YYYY-MM': index}.
// Returns { errLow[50], errHigh[50], cases[50], supported[50] }; index i = horizon i+1 years.
function backtest(clevHist, surveyHist, cpi, opts) {
  const maxH = (opts && opts.maxH) || 50;
  const minCases = (opts && opts.minCases) || MIN_CASES;
  const errs = Array.from({ length: maxH }, () => []);
  const sv = surveyHist.slice().sort((a, b) => monthIndex(a.month) - monthIndex(b.month));
  let sp = -1;
  const clev = clevHist.slice().sort((a, b) => monthIndex(a.month) - monthIndex(b.month));
  for (const row of clev) {
    const mi = monthIndex(row.month);
    while (sp + 1 < sv.length && monthIndex(sv[sp + 1].month) <= mi) sp++;
    if (sp < 0) continue; // no survey value yet (starts 1991)
    const S = sv[sp].s;
    const base = avg12(cpi, mi);
    if (base == null) continue;
    for (let H = 1; H <= maxH; H++) {
      const end = avg12(cpi, mi + 12 * H);
      if (end == null) continue;
      const actual = Math.pow(end / base, 1 / H) - 1;
      errs[H - 1].push(actual - centralRate(H, row.points, S));
    }
  }
  const cases = errs.map(e => e.length);
  const supported = cases.map(n => n >= minCases);
  const errLow = new Array(maxH).fill(null), errHigh = new Array(maxH).fill(null);
  let last = -1;
  for (let i = 0; i < maxH; i++) {
    if (!supported[i]) continue;
    const s = errs[i].slice().sort((a, b) => a - b);
    // clip so the band always contains the central rate
    errLow[i] = Math.min(0, percentile(s, 0.16));
    errHigh[i] = Math.max(0, percentile(s, 0.84));
    last = i;
  }
  if (last < 0) throw new Error('backtest: no horizon has ' + minCases + ' cases');
  for (let i = 0; i < maxH; i++) {
    if (!supported[i]) { errLow[i] = errLow[last]; errHigh[i] = errHigh[last]; }
  }
  return { errLow, errHigh, cases, supported };
}

// Band for today: smoothed central rates plus the error offsets.
function bandFromOffsets(smoothR, band) {
  return {
    low: smoothR.map((r, i) => r + band.errLow[i]),
    high: smoothR.map((r, i) => r + band.errHigh[i]),
    bandSupported: band.supported ? band.supported.slice() : band.cases.map(n => n >= MIN_CASES),
  };
}

module.exports = { MIN_CASES, backtest, bandFromOffsets, percentile, monthIndex, monthStr };

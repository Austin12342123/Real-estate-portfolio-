import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const blend = require('../../scripts/inflation/blend.js');
const bt = require('../../scripts/inflation/backtest.js');
const fetchers = require('../../scripts/inflation/fetch.js');
const { writeXlsx } = require('../../scripts/inflation/xlsx.js');
const { assemble } = require('../../scripts/inflation/build.js');

// Spec T7 fixture: Cleveland 2.0% at 1 year rising in a straight line to 2.6% at 30; S = 2.30%.
const C = Array.from({ length: 30 }, (_, i) => (2.0 + 0.6 * i / 29) / 100);
const S = 0.023;
const near = (a, b, d = 1e-9) => expect(Math.abs(a - b)).toBeLessThan(d);

describe('T7 central rate', () => {
  // hand-worked values (percent): C(2)=2.020689655, C(5)=2.082758621, C(10)=2.186206897
  it('H=1 and H=2 follow Cleveland alone', () => {
    near(blend.centralRate(1, C, S), 0.02);
    near(blend.centralRate(2, C, S), 0.02020689655);
  });
  it('H=5 uses w = 0.8125 (1 at H=2 falling to 0.5 at H=10)', () => {
    near(blend.centralRate(5, C, S), 0.8125 * 0.02082758621 + 0.1875 * 0.023);
    near(blend.centralRate(5, C, S), 0.02123491379);
  });
  it('H=10 is 0.5 C(10) + 0.5 S', () => {
    near(blend.centralRate(10, C, S), 0.5 * 0.02186206897 + 0.5 * 0.023);
    near(blend.centralRate(10, C, S), 0.02243103448);
  });
  it('H=30 and H=40 (uses C(30)) are 2.45%', () => {
    near(blend.centralRate(30, C, S), 0.0245);
    near(blend.centralRate(40, C, S), 0.0245);
  });
  it('interpolates linearly between yearly points', () => {
    near(blend.clevelandAt(C, 1.5), (C[0] + C[1]) / 2);
  });
  it('spec today example: 10-year 2.67 and S 2.30 gives 2.485%', () => {
    const flat = Array(30).fill(0.0267);
    near(blend.centralRate(10, flat, 0.023), 0.02485);
  });
});

describe('T8 path', () => {
  const p = blend.buildPath(C, S);
  it('P(0)=1, monthly level has 601 points and hits P(t) at each year', () => {
    expect(p.level.length).toBe(601);
    near(p.level[0], 1);
    for (const t of [1, 10, 30, 50]) near(p.level[12 * t], p.P[t], 1e-9);
  });
  it('cost growth in year t equals P(t)/P(t-1) - 1 exactly and 0 <= f <= 6%', () => {
    for (let t = 1; t <= 50; t++) {
      expect(p.P[t] / p.P[t - 1] - 1).toBeCloseTo(p.f[t - 1], 12);
      expect(p.f[t - 1]).toBeGreaterThanOrEqual(0);
      expect(p.f[t - 1]).toBeLessThanOrEqual(0.06);
      near(p.level[12 * t] / p.level[12 * (t - 1)] - 1, p.f[t - 1], 1e-9);
    }
  });
  it('a 1-point jump between C(9) and C(10) gives no f outside 0..6%', () => {
    const J = C.map((v, i) => (i >= 9 ? v + 0.01 : v));
    const q = blend.buildPath(J, S);
    expect(Math.max(...q.f)).toBeLessThanOrEqual(0.06);
    expect(Math.min(...q.f)).toBeGreaterThanOrEqual(0);
  });
  it('a huge jump is clamped at 6% and a collapse at 0%', () => {
    expect(Math.max(...blend.buildPath(C.map((v, i) => (i >= 9 ? 0.3 : v)), S).f)).toBe(0.06);
    expect(Math.min(...blend.buildPath(Array(30).fill(-0.05), -0.05).f)).toBe(0);
  });
  it('centered 5-year moving average, shorter at the ends', () => {
    expect(blend.smooth5([1, 2, 3, 4, 5, 6, 7])).toEqual([2, 2.5, 3, 4, 5, 5.5, 6]);
  });
});

describe('T9 adjustment', () => {
  const adj = (points) => ({ points, reason: 'test', date: '2026-11-01', expires: '2027-02-01' });
  it('+0.3 shifts r, low and high by 0.3 points', () => {
    const o = blend.applyAdjust(0.025, 0.02, 0.03, adj(0.3), '2026-12-01');
    near(o.r, 0.028); near(o.low, 0.023); near(o.high, 0.033);
  });
  it('+0.9 is clamped to 0.5', () => {
    near(blend.effectiveAdjust(adj(0.9), '2026-12-01'), 0.005);
    near(blend.effectiveAdjust(adj(-0.9), '2026-12-01'), -0.005);
  });
  it('applies the day before expiry and not on the expiry date', () => {
    near(blend.effectiveAdjust(adj(0.3), '2027-01-31'), 0.003);
    expect(blend.effectiveAdjust(adj(0.3), '2027-02-01')).toBe(0);
    expect(blend.effectiveAdjust(adj(0.3), '2027-02-02')).toBe(0);
  });
  it('default / missing adjustment is 0', () => {
    expect(blend.effectiveAdjust(null, '2026-12-01')).toBe(0);
    expect(blend.effectiveAdjust({ points: 0, reason: '', date: '', expires: '' }, '2026-12-01')).toBe(0);
  });
});

// Deterministic backtest fixture: CPI 1985-01..2026-10, Cleveland monthly 1991-01..2026-10, survey quarterly.
function fixture() {
  const cpi = {};
  let level = 100;
  for (let i = bt.monthIndex('1985-01'); i <= bt.monthIndex('2026-10'); i++) {
    level *= 1 + (0.025 + 0.012 * Math.sin(i / 17)) / 12;
    cpi[bt.monthStr(i)] = level;
  }
  const clev = [], surv = [];
  for (let i = bt.monthIndex('1991-01'); i <= bt.monthIndex('2026-10'); i++) {
    const d = 0.004 * Math.sin(i / 23);
    clev.push({ month: bt.monthStr(i), points: C.map(v => v + d) });
    if ((i % 12) % 3 === 1) surv.push({ month: bt.monthStr(i), s: 0.023 + 0.002 * Math.cos(i / 40) });
  }
  return { cpi, clev, surv };
}

describe('T11 band', () => {
  const f = fixture();
  const b = bt.backtest(f.clev, f.surv, f.cpi);
  const p = blend.buildPath(C, S);
  const band = bt.bandFromOffsets(p.smoothR, b);
  it('uses at least 60 cases for every supported horizon, fewer marks rough', () => {
    b.cases.forEach((n, i) => expect(b.supported[i]).toBe(n >= 60));
    expect(b.supported[0]).toBe(true);
    expect(b.supported[49]).toBe(false);
    expect(b.cases[39]).toBe(0);
  });
  it('supported flags are true up to a limit and false beyond', () => {
    const lim = b.supported.lastIndexOf(true);
    expect(lim).toBeGreaterThan(5);
    expect(lim).toBeLessThan(49);
    b.supported.forEach((s, i) => expect(s).toBe(i <= lim));
    expect(band.bandSupported).toEqual(b.supported);
  });
  it('low <= r <= high at every horizon', () => {
    for (let i = 0; i < 50; i++) {
      expect(band.low[i]).toBeLessThanOrEqual(p.smoothR[i]);
      expect(band.high[i]).toBeGreaterThanOrEqual(p.smoothR[i]);
    }
  });
  it('horizons past the limit reuse the longest supported band', () => {
    const lim = b.supported.lastIndexOf(true);
    for (let i = lim + 1; i < 50; i++) { expect(b.errLow[i]).toBe(b.errLow[lim]); expect(b.errHigh[i]).toBe(b.errHigh[lim]); }
  });
  it('percentiles are the 16th and 84th (interpolated)', () => {
    const s = Array.from({ length: 101 }, (_, i) => i);
    near(bt.percentile(s, 0.16), 16); near(bt.percentile(s, 0.84), 84);
  });
  it('throws instead of guessing when no horizon has 60 cases', () => {
    expect(() => bt.backtest(f.clev.slice(0, 20), f.surv, f.cpi)).toThrow(/no horizon/);
  });
});

describe('parsers and build (offline fixtures)', () => {
  it('reads a Cleveland-shaped workbook', () => {
    const head = ['Model Output Date', ...Array.from({ length: 30 }, (_, i) => `${i + 1} year Expected Inflation`)];
    const row = (d, v) => [d, ...Array.from({ length: 30 }, () => v)];
    const buf = writeXlsx([{ name: 'Expected Inflation', rows: [['Title'], head, row(46000, 2.5), row(46031, 2.67)] }]);
    const out = fetchers.parseCleveland(buf);
    expect(out.length).toBe(2);
    expect(out[1].points.length).toBe(30);
    near(out[1].points[9], 0.0267);
  });
  it('computes breakeven = nominal - real from Treasury CSVs', () => {
    const nom = fetchers.parseTreasuryCsv('"Date","1 Mo","5 Yr","10 Yr"\n"11/19/2026","3.9","4.00","4.40"\n');
    const real = fetchers.parseTreasuryCsv('"Date","5 YR","10 YR"\n"11/19/2026","1.70","2.24"\n');
    const be = fetchers.breakevens(nom, real);
    expect(be.date).toBe('2026-11-19');
    near(be.byMaturity[10].breakeven, 2.16, 1e-6);
  });
  it('parses BLS flat file and SPF history', () => {
    const cpi = fetchers.parseBlsCpi('series_id\tyear\tperiod\tvalue\nCUUR0000SA0\t2026\tM10\t337.511\nCUUR0000SA0\t2026\tM13\t300\nOTHER\t2026\tM10\t1\n');
    expect(cpi).toEqual({ '2026-10': 337.511 });
    expect(fetchers.parseSpfHistory('YEAR,QUARTER,CPI10\n2026,3,2.30\n')[0]).toEqual({ month: '2026-08', s: 0.023 });
  });
  it('a failed source keeps its last value and is named in the PR text; band is never guessed', () => {
    const f = fixture();
    const ok = d => ({ ok: true, url: 'u', data: d });
    const res = { cleveland: ok(f.clev), spf: ok({ value: 2.3, quarter: '2026Q3' }), treasury: ok({ date: '2026-11-19', byMaturity: { 10: { breakeven: 2.16 } } }), spfHistory: ok(f.surv), cpi: ok(f.cpi) };
    const first = assemble(res, null, '2026-11-23');
    expect(first.failures).toEqual([]);
    expect(first.json.level.length).toBe(601);
    const res2 = Object.assign({}, res, { spf: { ok: false, url: 'u', error: 'HTTP 403' }, spfHistory: { ok: false, url: '', error: 'x' } });
    const second = assemble(res2, first.json, '2026-12-11');
    expect(second.failures.join('|')).toMatch(/Philadelphia Fed SPF.*HTTP 403/);
    second.json.low.forEach((v, i) => near(v, first.json.low[i], 2e-6));
    expect(second.json.sources.find(s => /Philadelphia/.test(s.name)).value).toBe(2.3);
    expect(() => assemble(res2, null, '2026-12-11')).toThrow(/never guessed|no Cleveland|survey/);
  });
});

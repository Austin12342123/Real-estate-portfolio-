'use strict';
// Spec section 1 and 2. Free sources only. Parsers are pure and take text/buffers (testable offline);
// layouts are in README.md (not yet verified against the real files, see there).
const { readXlsx, excelDate } = require('./xlsx');

const URLS = {
  cleveland: 'https://www.clevelandfed.org/-/media/files/webcharts/inflationexpectations/inflation-expectations.xlsx',
  treasuryReal: y => `https://home.treasury.gov/resource-center/data-chart-center/interest-rates/daily-treasury-rates.csv/${y}/all?type=daily_treasury_real_yield_curve&field_tdr_date_value=${y}&page&_format=csv`,
  treasuryNominal: y => `https://home.treasury.gov/resource-center/data-chart-center/interest-rates/daily-treasury-rates.csv/${y}/all?type=daily_treasury_yield_curve&field_tdr_date_value=${y}&page&_format=csv`,
  spfRelease: (q, y) => `https://www.philadelphiafed.org/surveys-and-data/real-time-data-research/spf-q${q}-${y}`,
  spfHistory: process.env.SPF_HISTORY_URL || '',
  fredCpi: 'https://fred.stlouisfed.org/graph/fredgraph.csv?id=CPIAUCNS',
};

async function getBuf(url, headers) {
  const res = await fetch(url, { headers: Object.assign({ 'User-Agent': process.env.BLS_USER_AGENT || 'inflation-data-pipeline (GitHub Actions; repository maintainers)' }, headers), signal: AbortSignal.timeout(60000) });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return Buffer.from(await res.arrayBuffer());
}
const getText = async (url, h) => (await getBuf(url, h)).toString('utf8');

// ---- Cleveland Fed: -> [{month:'YYYY-MM', points:[30 decimals]}] ascending
function parseCleveland(buf) {
  const sheets = readXlsx(buf);
  for (const sh of sheets) {
    const hi = sh.rows.findIndex(r => r && r.filter(c => typeof c === 'string' && /^(\d+)\s*-?\s*year/i.test(c.trim())).length >= 10);
    if (hi < 0) continue;
    if (!/expected inflation/i.test(sh.name + ' ' + sh.rows.slice(0, hi + 1).flat().join(' '))) continue;
    const head = sh.rows[hi], cols = {};
    head.forEach((c, i) => { const m = typeof c === 'string' && /^(\d+)\s*-?\s*year/i.exec(c.trim()); if (m) cols[Number(m[1])] = i; });
    for (let n = 1; n <= 30; n++) if (cols[n] == null) throw new Error('Cleveland: no column for ' + n + ' year in sheet ' + sh.name);
    const dateCol = head.findIndex(c => typeof c === 'string' && /date/i.test(c));
    if (dateCol < 0) throw new Error('Cleveland: no date column in sheet ' + sh.name);
    const out = [];
    for (const r of sh.rows.slice(hi + 1)) {
      const d = r[dateCol];
      const iso = typeof d === 'number' ? excelDate(d) : typeof d === 'string' && /^\d{4}-\d{2}/.test(d) ? d : null;
      if (!iso) continue;
      const pts = [];
      for (let n = 1; n <= 30; n++) pts.push(r[cols[n]]);
      if (pts.some(v => typeof v !== 'number')) continue;
      // real file stores fractions (0.0267); accept percent (2.67) too
      const div = Math.max(...pts) > 0.5 ? 100 : 1;
      out.push({ month: iso.slice(0, 7), points: pts.map(v => v / div) });
    }
    if (!out.length) throw new Error('Cleveland: sheet ' + sh.name + ' has no data rows');
    out.sort((a, b) => a.month < b.month ? -1 : 1);
    // keep one row per month (the last)
    return out.filter((r, i) => i === out.length - 1 || out[i + 1].month !== r.month);
  }
  throw new Error('Cleveland: no sheet with "N year" columns and expected inflation found');
}

// ---- Treasury CSV: -> { 'YYYY-MM-DD': { maturityYears: percent } } (columns "N YR"; "Mo" columns ignored)
function csvRows(text) {
  return text.replace(/^﻿/, '').split(/\r?\n/).filter(l => l.trim()).map(l => {
    const out = []; let cur = '', q = false;
    for (const ch of l) { if (ch === '"') q = !q; else if (ch === ',' && !q) { out.push(cur); cur = ''; } else cur += ch; }
    out.push(cur); return out.map(s => s.trim());
  });
}
function parseTreasuryCsv(text) {
  const rows = csvRows(text);
  const head = rows[0] || [];
  const di = head.findIndex(h => /^date$/i.test(h));
  if (di < 0) throw new Error('Treasury CSV: no Date column');
  const cols = {};
  head.forEach((h, i) => { const m = /^(\d+)\s*yr$/i.exec(h); if (m) cols[Number(m[1])] = i; });
  if (!Object.keys(cols).length) throw new Error('Treasury CSV: no "N YR" columns, header was ' + head.join('|'));
  const out = {};
  for (const r of rows.slice(1)) {
    const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(r[di] || ''); if (!m) continue;
    const day = {};
    for (const [n, i] of Object.entries(cols)) { const v = parseFloat(r[i]); if (!isNaN(v)) day[n] = v; }
    out[`${m[3]}-${m[1]}-${m[2]}`] = day;
  }
  return out;
}
// Latest date present in both curves -> { date, byMaturity:{n:{nominal,real,breakeven}} } (percent)
function breakevens(nominal, real) {
  const dates = Object.keys(real).filter(d => nominal[d]).sort();
  if (!dates.length) throw new Error('Treasury: no common date in nominal and real curves');
  const date = dates[dates.length - 1], byMaturity = {};
  for (const n of Object.keys(real[date])) if (nominal[date][n] != null) byMaturity[n] = { nominal: nominal[date][n], real: real[date][n], breakeven: +(nominal[date][n] - real[date][n]).toFixed(4) };
  if (!Object.keys(byMaturity).length) throw new Error('Treasury: no shared maturities on ' + date);
  return { date, byMaturity };
}

// ---- Philadelphia Fed
// Release page text -> 10-year CPI percent. Looks for a "CPI" line near "10" in the long-term table.
function parseSpfRelease(html) {
  const t = html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');
  const m = /10[- ]year[^.]{0,200}?\bCPI\b[^0-9]{0,80}(\d\.\d{1,2})\s*(?:percent|%)?/i.exec(t) || /\bCPI\b[^0-9]{0,60}10[- ]year[^0-9]{0,80}(\d\.\d{1,2})/i.exec(t);
  if (!m) throw new Error('SPF release: no 10-year CPI value found');
  return parseFloat(m[1]);
}
// History CSV (YEAR,QUARTER,<10-year CPI col>) -> [{month, s decimal}]; survey is released mid second month of its quarter.
function parseSpfHistory(text) {
  const rows = csvRows(text), head = rows[0] || [];
  const yi = head.findIndex(h => /^year$/i.test(h)), qi = head.findIndex(h => /^quarter$/i.test(h));
  const ci = head.findIndex(h => /cpi10|10.?year.*cpi/i.test(h));
  if (yi < 0 || qi < 0 || ci < 0) throw new Error('SPF history: need YEAR, QUARTER and a 10-year CPI column, header was ' + head.join('|'));
  const out = [];
  for (const r of rows.slice(1)) {
    const y = +r[yi], q = +r[qi], v = parseFloat(r[ci]);
    if (!y || !q || isNaN(v)) continue;
    out.push({ month: y + '-' + String((q - 1) * 3 + 2).padStart(2, '0'), s: v / 100 });
  }
  if (!out.length) throw new Error('SPF history: no rows');
  return out;
}

// ---- FRED CPIAUCNS (CPI-U all items NSA, same series as BLS CUUR0000SA0): CSV observation_date,CPIAUCNS
function parseFredCpi(text) {
  const rows = csvRows(text), head = rows[0] || [];
  if (!/date/i.test(head[0] || '') || !/CPIAUCNS/i.test(head[1] || '')) throw new Error('FRED CPI: unexpected header ' + head.join('|'));
  const out = {};
  for (const r of rows.slice(1)) {
    const m = /^(\d{4}-\d{2})-\d{2}$/.exec(r[0] || ''); const v = parseFloat(r[1]);
    if (m && !isNaN(v)) out[m[1]] = v;
  }
  if (!Object.keys(out).length) throw new Error('FRED CPI: no rows');
  return out;
}

// ---- network wrappers; each returns { ok, data?, error?, url }
async function attempt(url, fn) {
  try { return { ok: true, url, data: await fn() }; } catch (e) { return { ok: false, url, error: String(e.message || e) }; }
}
async function fetchAll(now) {
  const y = (now || new Date()).getUTCFullYear(), q = Math.floor((now || new Date()).getUTCMonth() / 3) + 1;
  const res = {};
  res.cleveland = await attempt(URLS.cleveland, async () => parseCleveland(await getBuf(URLS.cleveland)));
  res.treasury = await attempt(URLS.treasuryReal(y), async () => breakevens(parseTreasuryCsv(await getText(URLS.treasuryNominal(y))), parseTreasuryCsv(await getText(URLS.treasuryReal(y)))));
  // latest survey: try this quarter then the previous three
  res.spf = { ok: false, url: URLS.spfRelease(q, y), error: 'not attempted' };
  for (let k = 0, yy = y, qq = q; k < 4 && !res.spf.ok; k++, qq--) {
    if (qq < 1) { qq = 4; yy--; }
    const u = URLS.spfRelease(qq, yy);
    const r = await attempt(u, async () => ({ value: parseSpfRelease(await getText(u)), quarter: yy + 'Q' + qq }));
    if (r.ok || k === 0) res.spf = r;
  }
  res.spfHistory = URLS.spfHistory ? await attempt(URLS.spfHistory, async () => parseSpfHistory(await getText(URLS.spfHistory))) : { ok: false, url: '', error: 'SPF_HISTORY_URL not set' };
  res.cpi = await attempt(URLS.fredCpi, async () => parseFredCpi(await getText(URLS.fredCpi)));
  return res;
}

module.exports = { URLS, parseCleveland, parseTreasuryCsv, breakevens, parseSpfRelease, parseSpfHistory, parseFredCpi, fetchAll };

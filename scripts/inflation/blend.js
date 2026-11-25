'use strict';
// Spec section 3 (and 4 for the adjustment rule). Rates are decimals (0.0267 = 2.67%).
// cPoints[i] = Cleveland expected inflation at horizon i+1 years (30 points).

function clevelandAt(cPoints, H) {
  const n = cPoints.length;
  if (H <= 1) return cPoints[0];
  if (H >= n) return cPoints[n - 1];
  const lo = Math.floor(H);
  const frac = H - lo;
  return cPoints[lo - 1] + (cPoints[lo] - cPoints[lo - 1]) * frac;
}

// Central rate before the manual adjustment.
function centralRate(H, cPoints, S) {
  const h = Math.min(Math.max(H, 0), 50);
  const C = clevelandAt(cPoints, h);
  if (h <= 2) return C;
  if (h > 10) return 0.5 * C + 0.5 * S;
  const w = 1 - 0.5 * ((h - 2) / 8);
  return w * C + (1 - w) * S;
}

// Manual adjustment: clamp to +-0.5 points (decimals: 0.005); applies before expiry only.
// today and adjust.expires are 'YYYY-MM-DD' strings (compared as strings).
function effectiveAdjust(adjust, today) {
  if (!adjust || !adjust.points || !adjust.expires || !today) return 0;
  if (today >= adjust.expires) return 0;
  const p = adjust.points / 100; // file stores percentage points
  return Math.max(-0.005, Math.min(0.005, p));
}

function applyAdjust(r, low, high, adjust, today) {
  const a = effectiveAdjust(adjust, today);
  return { r: r + a, low: low + a, high: high + a };
}

// Centered 5-year moving average over yearly array (index 0 = year 1); shorter at the ends.
function smooth5(rs) {
  return rs.map((_, i) => {
    const a = Math.max(0, i - 2), b = Math.min(rs.length - 1, i + 2);
    let s = 0;
    for (let k = a; k <= b; k++) s += rs[k];
    return s / (b - a + 1);
  });
}

// Returns { rawR[50], smoothR[50], f[50], P[51] (yearly, P[0]=1), level[601] (monthly) }.
function buildPath(cPoints, S) {
  const rawR = [];
  for (let t = 1; t <= 50; t++) rawR.push(centralRate(t, cPoints, S));
  const smoothR = smooth5(rawR);
  const f = [], P = [1];
  for (let t = 1; t <= 50; t++) {
    const prev = t === 1 ? 1 : Math.pow(1 + smoothR[t - 2], t - 1);
    let ft = Math.pow(1 + smoothR[t - 1], t) / prev - 1;
    ft = Math.min(0.06, Math.max(0, ft));
    f.push(ft);
    P.push(P[t - 1] * (1 + ft));
  }
  const level = [];
  for (let m = 0; m <= 600; m++) {
    const t = Math.floor(m / 12), frac = (m % 12) / 12;
    level.push(t >= 50 ? P[50] : P[t] * Math.pow(P[t + 1] / P[t], frac));
  }
  return { rawR, smoothR, f, P, level };
}

module.exports = { clevelandAt, centralRate, effectiveAdjust, applyAdjust, smooth5, buildPath };

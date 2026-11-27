import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import path from 'path';
const require = createRequire(import.meta.url);
/* ENGINE_PATH lets the same test run against the old and the new engine.js (card CC1b) */
const E = require(process.env.ENGINE_PATH || path.resolve(__dirname, '../../../prototype/v4/engine.js'));
const state = (houses, closing = 2) => ({ v: 21, g: Object.assign({}, E.GDEF, { closing }), houses });
const cl = (S, h) => (h.price * (h.closingPct == null ? S.g.closing : h.closingPct)) / 100;
describe('CC1b closing cost source rules', () => {
  it('a loan pick still writes the loan closing % (203(k) 5% of 200,000 = 10,000), normalize keeps it', () => {
    const a = E.newAsset('house', 'k203', { id: 'a', price: 200000 });
    expect(a.closingPct).toBe(5);
    const S = E.normalize(state([a], 2));
    expect(S.houses[0].closingPct).toBe(5);
    expect(cl(S, S.houses[0])).toBe(10000);
  });
  it('a home with no loan follows the portfolio %; a typed value survives a portfolio change', () => {
    const n = E.newAsset('house', 'custom', { id: 'n', price: 200000, closingPct: null });
    const t = Object.assign(E.newAsset('house', 'conv30', { id: 't', price: 200000 }), { closingPct: 1 });
    const S = E.normalize(state([n, t], 3));
    S.g.closing = 2;
    expect(S.houses.map((h) => cl(S, h))).toEqual([4000, 2000]);
  });
  it('how-line shows dollars and percent: closing $4,000 (2% of $200,000)', () => {
    const S = E.normalize(state([E.newAsset('house', 'custom', { id: 'a', price: 200000, rent: 2000, closingPct: null })], 2));
    S.p = E.samplePersonal();
    const pl = E.plan(S);
    expect(JSON.stringify(E.feasible(S, pl, E.finance(S, pl)))).toMatch(/closing \$4,000 \(2% of \$200,000\)/);
  });
});

import { describe, it, expect } from 'vitest';
import fx from '../fixtures/money.js';
const { E, t5 } = fx;
/* PR1: the Real view of Finances runs the engine on a copy of the portfolio with only the owned assets. */
describe('PR1 Real view copy (E.realOnly)', () => {
  it('exists, has only owned assets, and does not touch the original', () => {
    expect(typeof E.realOnly).toBe('function');
    const S = t5(), before = JSON.stringify(S);
    const R = E.realOnly(S);
    expect(R).not.toBe(S);
    expect(R.houses.length).toBeGreaterThan(0);
    expect(R.houses.every((h) => h.status === 'owned')).toBe(true);
    expect(S.houses.some((h) => h.status === 'planned')).toBe(true);
    expect(JSON.stringify(S)).toBe(before);
  });
  it('lowest cash ignores the planned closing costs and draws', () => {
    const S = t5();
    S.g.closing = 3; /* closing costs on: the planned 2,000,000 home costs money */
    const fp = E.finance(S, E.plan(S)), R = E.realOnly(S), fr = E.finance(R, E.plan(R));
    const alone = { g: S.g, p: S.p, houses: S.houses.filter((h) => h.status === 'owned') };
    expect(fr.kpis.minLiquid).toBe(E.finance(alone, E.plan(alone)).kpis.minLiquid);
    expect(fr.kpis.minLiquid).toBeGreaterThan(fp.kpis.minLiquid);
  });
  it('nothing owned gives an empty copy', () => {
    const S = { g: fx.G(), p: fx.P(), houses: [fx.A({ id: 'z', status: 'planned' })] };
    expect(E.realOnly(S).houses.length).toBe(0);
  });
});

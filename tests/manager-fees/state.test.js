import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const { stateFromAddress: f, STATES } = createRequire(import.meta.url)('../../scripts/manager-fees/state.js');
describe('stateFromAddress', () => {
  it('2-letter code', () => {
    expect(f('123 Main St, Austin, TX 78701')).toBe('TX');
    expect(f('123 Main St, Austin, TX')).toBe('TX');
    expect(f('45 Oak Ave Tampa FL 33601-1234')).toBe('FL');
    expect(f('1 A St, Reno, nv 89501, USA')).toBe('NV');
  });
  it('full names, longest first', () => {
    expect(f('9 Elm, Charleston, West Virginia')).toBe('WV');
    expect(f('9 Elm, Richmond, Virginia 23220')).toBe('VA');
    expect(f('Albany, New York')).toBe('NY');
    expect(f('Ohio')).toBe('OH');
  });
  it('null for unknown or bad input', () => {
    expect(f('')).toBeNull();
    expect(f(null)).toBeNull();
    expect(f(42)).toBeNull();
    expect(f('123 Main Street')).toBeNull();
    expect(f('Paris, France')).toBeNull();
    expect(f('5 Road, Toronto, ON')).toBeNull();
  });
  it('51 entries incl DC', () => { expect(Object.keys(STATES).length).toBe(51); });
});

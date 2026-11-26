import { describe, it, expect } from 'vitest';
import fs from 'fs';
const d = JSON.parse(fs.readFileSync(new URL('../../data/manager-fees.json', import.meta.url)));
const cells = [];
for (const [t, v] of Object.entries(d.types)) {
  cells.push([t + '.national', v.national]);
  for (const [s, c] of Object.entries(v.byState || {})) cells.push([t + '.' + s, c]);
}
describe('manager-fees.json', () => {
  it('has all types and gaps', () => {
    expect(Object.keys(d.types).sort()).toEqual(['business', 'commercial', 'home', 'multi']);
    expect(Array.isArray(d.gaps)).toBe(true);
  });
  it.each(cells)('%s has source URL and asOf; pct numeric or null', (_, c) => {
    expect(c.source).toMatch(/^https:\/\//);
    expect(c.asOf).toBeTruthy();
    if (c.pct !== null) expect(typeof c.pct).toBe('number');
    else expect(c.note).toBeTruthy();
  });
});

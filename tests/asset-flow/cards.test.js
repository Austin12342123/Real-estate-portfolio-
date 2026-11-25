import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
const src = fs.readFileSync(path.resolve(__dirname, '../../prototype/v4/src/app/71-asset-cards.js'), 'utf8');
const CARDS = JSON.parse(/const AF_CARDS = (\[.*\]);/s.exec(src)[1]);
describe('AF1 card list', () => {
  it('has 32 visible cards (the rate card is merged into the loan card)', () => {
    expect(CARDS.filter((c) => !c.merged).length).toBe(32);
  });
  it('ends with the review and every card has an id and a kind', () => {
    expect(CARDS[CARDS.length - 1].kind).toBe('review');
    CARDS.forEach((c) => { expect(c.id).toBeTruthy(); expect(c.kind).toBeTruthy(); });
  });
});

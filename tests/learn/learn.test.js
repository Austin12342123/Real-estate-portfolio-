import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire(import.meta.url);
const C = require('../../prototype/v4/src/learn/content.js');
const P = require('../../prototype/v4/src/learn/progress.js');
const B = require('../../prototype/v4/src/learn/board.js');
const real = JSON.parse(fs.readFileSync(new URL('../../data/learn.json', import.meta.url), 'utf8'));
const good = () => ({
  course: { modules: [{ id: 'a', title: 'A', keyPoints: ['k'], vocab: ['t1'], links: [{ url: 'https://x.org/a' }], check: { question: 'q?', choices: ['1', '2'], answer: 1 } },
    { id: 'b', title: 'B', keyPoints: ['k'], check: { question: 'q?' } }] },
  vocab: [{ id: 't1', term: 'Equity', definition: 'Value minus loan.' }, { id: 't2', term: 'Cap rate', definition: 'NOI over price' }],
  board: [{ title: 'p', url: 'https://p.com', tags: ['podcast', 'deals'] }, { title: 'b', url: 'https://b.com', tags: ['book'] }]
});
const has = (r, s) => r.errors.some((e) => e.indexOf(s) >= 0);

describe('L1a content', () => {
  it('valid data passes', () => { const r = C.validate(good()); expect(r.errors).toEqual([]); expect(r.ok).toBe(true); });
  it('real data/learn.json validates', () => { const r = C.validate(real); expect(r.errors).toEqual([]); });
  it('accepts a JSON string; bad JSON returns an error, no throw', () => {
    expect(C.validate(JSON.stringify(good())).ok).toBe(true);
    expect(C.validate('{nope').ok).toBe(false);
  });
  it('never throws on garbage', () => { [null, undefined, 5, [], {}, { course: 3 }].forEach((x) => { expect(() => C.validate(x)).not.toThrow(); expect(C.validate(x).ok).toBe(false); expect(() => C.load(x)).not.toThrow(); }); });
  it('module without key points', () => { const d = good(); d.course.modules[0].keyPoints = []; expect(has(C.validate(d), 'key point')).toBe(true); });
  it('module without check question', () => { const d = good(); delete d.course.modules[1].check; expect(has(C.validate(d), 'check question')).toBe(true); });
  it('check answer out of range', () => { const d = good(); d.course.modules[0].check.answer = 5; expect(has(C.validate(d), 'out of range')).toBe(true); });
  it('vocab without definition', () => { const d = good(); d.vocab[0].definition = ' '; expect(has(C.validate(d), 'missing definition')).toBe(true); });
  it('non-https link in module and board', () => {
    const d = good(); d.course.modules[0].links[0].url = 'http://x.org'; d.board[0].url = 'ftp://p';
    const r = C.validate(d); expect(has(r, 'module[0] (a) link[0]')).toBe(true); expect(has(r, 'board[0]')).toBe(true);
  });
  it('unknown vocab id and duplicate ids', () => {
    const d = good(); d.course.modules[0].vocab = ['zzz']; d.course.modules[1].id = 'a';
    const r = C.validate(d); expect(has(r, 'unknown vocab id zzz')).toBe(true); expect(has(r, 'duplicate id')).toBe(true);
  });
  it('load returns arrays even on bad data', () => { const r = C.load(null); expect(r.modules).toEqual([]); expect(r.vocab).toEqual([]); expect(r.board).toEqual([]); expect(C.load(good()).modules.length).toBe(2); });
});

describe('L1a progress', () => {
  const meta = { theme: 'oxford', learn: { done: [] } };
  it('done then undone, original untouched', () => {
    const m1 = P.markDone(meta, 'a'); expect(P.isDone(m1, 'a')).toBe(true); expect(meta.learn.done).toEqual([]); expect(m1.theme).toBe('oxford');
    const m2 = P.markUndone(m1, 'a'); expect(P.isDone(m2, 'a')).toBe(false); expect(m1.learn.done).toEqual(['a']);
  });
  it('marking twice does not duplicate', () => expect(P.markDone(P.markDone(meta, 'a'), 'a').learn.done).toEqual(['a']));
  it('unknown id ignored when known list given; undone of unknown is a no-op', () => {
    expect(P.markDone(meta, 'zz', ['a', 'b']).learn.done).toEqual([]);
    expect(P.markUndone(meta, 'zz').learn.done).toEqual([]);
    expect(P.markDone(meta, '', ['a']).learn.done).toEqual([]);
  });
  it('tolerates missing meta / learn', () => { expect(P.markDone(undefined, 'a').learn.done).toEqual(['a']); expect(P.doneList({})).toEqual([]); expect(P.markDone({ learn: { done: 'x' } }, 'a').learn.done).toEqual(['a']); });
  it('summary counts only current modules', () => {
    const m = { learn: { done: ['a', 'old'] } };
    expect(P.summary(m, ['a', 'b'])).toEqual({ done: 1, total: 2, pct: 50 }); expect(P.summary(m, [])).toEqual({ done: 0, total: 0, pct: 0 });
  });
});

describe('L1a board', () => {
  const d = good();
  it('filter by tag, case-insensitive; all/empty returns everything', () => {
    expect(B.filterByTag(d.board, 'podcast').map((r) => r.title)).toEqual(['p']);
    expect(B.filterByTag(d.board, 'BOOK').length).toBe(1);
    expect(B.filterByTag(d.board, 'nope')).toEqual([]);
    expect(B.filterByTag(d.board, '').length).toBe(2); expect(B.filterByTag(d.board, 'all').length).toBe(2); expect(B.filterByTag(null, 'x')).toEqual([]);
  });
  it('tags list', () => expect(B.tags(d.board)).toEqual(['book', 'deals', 'podcast']));
  it('search by term and by definition, case-insensitive', () => {
    expect(B.searchVocab(d.vocab, 'EQUITY').map((x) => x.id)).toEqual(['t1']);
    expect(B.searchVocab(d.vocab, 'noi').map((x) => x.id)).toEqual(['t2']);
    expect(B.searchVocab(d.vocab, 'zzz')).toEqual([]);
  });
  it('empty or blank query returns all, sorted by term', () => { expect(B.searchVocab(d.vocab, '').map((x) => x.id)).toEqual(['t2', 't1']); expect(B.searchVocab(d.vocab, '  ').length).toBe(2); expect(B.searchVocab(null, 'a')).toEqual([]); });
});

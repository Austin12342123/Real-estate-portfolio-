import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const E = require('../../prototype/v4/engine.js');
const SCH = require('../../data/schema.js');
const { createStore, MAJOR } = require('../../data/store.js');
const { migrateFromLocalStorage, FLAG } = require('../../data/migrate.js');

const DATA_V = 21;
/* 40 portfolios: the 5 seeds, then the default plan cut to 1..35 assets */
const corpus = () => {
  const out = ['seed', 'seedPlan', 'seedStradella', 'seedBig', 'seedStretch'].map((f) => [f, E[f]()]);
  for (let n = 1; n <= 35; n++) { const s = E.seedPlan(); s.houses = s.houses.slice(0, n); out.push(['plan-' + n, s]); }
  return out.map(([name, s]) => { s.v = DATA_V; E.normalize(s); return [name, s]; });
};
/* the engine figures a user sees: any difference in a saved/loaded portfolio shows up here */
const figures = (S) => {
  const pl = E.plan(S);
  return JSON.stringify({ today: E.todayTotals(S, pl), purchase: pl.purchase, loanEnd: pl.loanEnd, final: pl.final, nw: E.netWorth ? E.netWorth(S, pl) : null, num: E.numbering(S, pl).num });
};
class LS { constructor(o) { this.m = new Map(Object.entries(o || {})); this.writes = 0; }
  getItem(k) { return this.m.has(k) ? this.m.get(k) : null; }
  setItem(k, v) { this.writes++; this.m.set(k, String(v)); }
  removeItem(k) { this.writes++; this.m.delete(k); }
  dump() { return JSON.stringify([...this.m.entries()]); } }
const fresh = (extra) => createStore(Object.assign({ indexedDB: new IDBFactory(), locks: null, BroadcastChannel: null }, extra));

describe('B1 schema v22', () => {
  it('has the top-level collections and meta defaults so later cards need no migration', () => {
    const p = SCH.toV22(E.seedPlan());
    expect(SCH.validate(p)).toEqual([]);
    expect(p.schemaVersion).toBe(22);
    ['entities', 'accounts', 'assets', 'units', 'leases', 'loans', 'ledger', 'rules', 'notes'].forEach((k) => expect(Array.isArray(p[k])).toBe(true));
    expect(p.meta).toMatchObject({ moneyView: 'today', futureYear: null, inflationMode: 'auto', theme: 'oxford', learn: { done: [] } });
  });
  it('money is in cents', () => {
    const S = E.seedPlan(), p = SCH.toV22(S);
    expect(p.assets[0].price).toBe(Math.round(S.houses[0].price * 100));
    expect(p.assets[0].rent).toBe(Math.round(S.houses[0].rent * 100));
    expect(p.personal.cash).toBe(4500000);
  });
  it('a value that is not a whole number of cents is kept exactly (nothing rounded)', () => {
    const S = E.seedPlan(); S.houses[0].rent = 1234.567;
    const b = SCH.fromV22(JSON.parse(JSON.stringify(SCH.toV22(S))));
    expect(b.houses[0].rent).toBe(1234.567);
  });
  it('the moneyView follows the old Show-in setting', () => {
    expect(SCH.toV22(E.seedPlan(), { ui: { unit: 'future' } }).meta.moneyView).toBe('future');
  });
  it('a multi-unit asset gets Unit records', () => {
    const S = E.seedPlan(); const h = S.houses[0]; h.kind = 'multi'; h.units = 4;
    expect(SCH.toV22(S).units.map((u) => u.assetId)).toEqual([h.id, h.id, h.id, h.id]);
  });
});

describe('B1 migration localStorage -> IndexedDB (copy, verify, flag)', () => {
  it('round trip on all 40 portfolios: identical figures (engine-diff 0), old keys untouched', async () => {
    const all = corpus();
    expect(all.length).toBe(40);
    for (const [name, S] of all) {
      const before = figures(S);
      const ls = new LS({ 'rep-v4': JSON.stringify(S), 'rep-v4-ui': JSON.stringify({ unit: 'today' }) });
      const dump0 = ls.dump(), store = fresh();
      const r = await migrateFromLocalStorage({ ls, store });
      expect(r.status, name).toBe('migrated');
      expect(r.assets, name).toBe(S.houses.length);
      const back = SCH.fromV22((await store.load()).portfolio);
      E.normalize(back);
      expect(figures(back), name + ' figures').toBe(before);
      expect(SCH.hashOf(JSON.parse(JSON.stringify(back))), name + ' hash').toBe(SCH.hashOf(JSON.parse(JSON.stringify(S))));
      expect(ls.dump(), name + ' localStorage untouched').toBe(dump0);
      expect(ls.writes).toBe(0);
      expect((await migrateFromLocalStorage({ ls, store })).status).toBe('already');
      store.close();
    }
  });
  it('also moves the saved list, ui and examples, and carries up to 3 old safety copies', async () => {
    const S = E.seedPlan(), A = E.seedStradella(); S.v = A.v = DATA_V;
    const ls = new LS({ 'rep-v4': JSON.stringify(S), 'rep-v4-saved': JSON.stringify([{ id: 's1', name: 'Old', ts: 5, state: A }]),
      'rep-v4-safety': JSON.stringify({ v: 1, items: [1, 2, 3, 4, 5].map((i) => ({ ts: i, reason: 'daily copy', state: S })) }), 'rep-v4-examples': '{"a":1}' });
    const store = fresh();
    expect((await migrateFromLocalStorage({ ls, store })).status).toBe('migrated');
    const saved = await store.getSaved();
    expect(saved.length).toBe(1);
    expect(SCH.countAssets(saved[0].data)).toBe(A.houses.length);
    expect((await store.snapshots()).length).toBe(3);
    expect(await store.kvGet('examples')).toEqual({ a: 1 });
  });
  it('rolls back on a forced mismatch: nothing left, no flag, old keys untouched, and a retry works', async () => {
    const S = E.seedPlan(); S.v = DATA_V;
    const ls = new LS({ 'rep-v4': JSON.stringify(S) }), dump0 = ls.dump(), store = fresh();
    const r = await migrateFromLocalStorage({ ls, store, afterCopy: async (db) => {
      const tx = db.transaction('portfolio', 'readwrite'); const s = tx.objectStore('portfolio');
      const cur = await new Promise((res) => { const g = s.get('current'); g.onsuccess = () => res(g.result); });
      cur.data.assets[0].price += 1; s.put(cur);
      await new Promise((res) => { tx.oncomplete = res; });
    } });
    expect(r.status).toBe('rolled-back');
    expect(r.reason).toMatch(/hash/);
    expect(await store.load()).toBeNull();
    expect(await store.kvGet(FLAG)).toBeUndefined();
    expect((await store.getSaved()).length).toBe(0);
    expect(ls.dump()).toBe(dump0);
    expect((await migrateFromLocalStorage({ ls, store })).status).toBe('migrated');
  });
  it('rolls back on a wrong asset count', async () => {
    const S = E.seedPlan(); S.v = DATA_V;
    const ls = new LS({ 'rep-v4': JSON.stringify(S) }), store = fresh();
    const r = await migrateFromLocalStorage({ ls, store, afterCopy: async (db) => {
      const tx = db.transaction('portfolio', 'readwrite'); const s = tx.objectStore('portfolio');
      const cur = await new Promise((res) => { const g = s.get('current'); g.onsuccess = () => res(g.result); });
      cur.data.assets.pop(); s.put(cur); await new Promise((res) => { tx.oncomplete = res; });
    } });
    expect(r.status).toBe('rolled-back'); expect(r.reason).toMatch(/asset count/);
    expect(await store.load()).toBeNull();
  });
  it('nothing / unreadable leave everything alone', async () => {
    const store = fresh();
    expect((await migrateFromLocalStorage({ ls: new LS(), store })).status).toBe('nothing');
    const ls = new LS({ 'rep-v4': '{broken' });
    expect((await migrateFromLocalStorage({ ls, store })).status).toBe('unreadable');
    expect(await store.kvGet(FLAG)).toBeUndefined();
  });
});

describe('B1 safety copies: only before a major change, newest 3 kept', () => {
  const P = (n) => { const S = E.seedPlan(); S.houses = S.houses.slice(0, n); return SCH.toV22(S); };
  it('a fourth major change leaves exactly 3 copies and the newest are kept', async () => {
    let t = 1000; const store = fresh({ now: () => ++t });
    await store.open(); await store.claimWriter(); await store.load();
    expect((await store.save(P(1))).ok).toBe(true);
    const reasons = ['data migration', 'backup import', 'delete asset', 'csv import', 'restore'];
    for (let i = 0; i < reasons.length; i++) expect((await store.saveMajor(reasons[i], P(i + 2))).ok).toBe(true);
    const s = await store.snapshots();
    expect(s.length).toBe(3);
    expect(s.map((x) => x.reason)).toEqual(['restore', 'csv import', 'delete asset']); /* newest first; the 2 oldest pruned */
    expect(s.map((x) => x.assets)).toEqual([5, 4, 3]); /* each is the portfolio as it was BEFORE that change */
  });
  it('an ordinary save takes no copy; a non-major reason is refused (no daily or weekly copies)', async () => {
    const store = fresh(); await store.open(); await store.load();
    await store.save(P(2)); await store.save(P(3)); await store.save(P(4));
    expect((await store.snapshots()).length).toBe(0);
    expect((await store.saveMajor('daily copy', P(5))).ok).toBe(false);
    expect((await store.snapshotNow('weekly')).ok).toBe(false);
    expect((await store.snapshots()).length).toBe(0);
    expect(MAJOR).toEqual(['data migration', 'backup import', 'restore', 'csv import', 'delete asset', 'delete entity']);
  });
  it('restoring a copy files the current portfolio first and brings the old one back', async () => {
    const store = fresh(); await store.open(); await store.load();
    await store.save(P(3)); await store.saveMajor('delete asset', P(2));
    const [c] = await store.snapshots();
    expect((await store.restoreSnapshot(c.seq)).ok).toBe(true);
    expect(SCH.countAssets((await store.load()).portfolio)).toBe(3);
    expect((await store.snapshots())[0].reason).toBe('restore');
    expect((await store.snapshots()).length).toBe(2);
  });
});

describe('B1 stale-save guard (carried from A72F: tests/diag/a72-stale-save.js)', () => {
  it('a page still open on old data cannot overwrite a newer stored portfolio', async () => {
    const idb = new IDBFactory();
    const a = createStore({ indexedDB: idb, locks: null, BroadcastChannel: null }), b = createStore({ indexedDB: idb, locks: null, BroadcastChannel: null });
    await a.open(); await b.open();
    const S36 = SCH.toV22(E.seedPlan()), S5 = E.seedPlan(); S5.houses = S5.houses.slice(0, 5);
    await a.load(); expect((await a.save(S36)).ok).toBe(true);
    await b.load(); /* page b is open on the 36-asset portfolio */
    expect((await a.save(SCH.toV22(S5))).ok).toBe(true); /* the stored one is replaced meanwhile by a 5-asset portfolio */
    const r = await b.save(S36); /* the stale page saves */
    expect(r).toMatchObject({ ok: false, stale: true });
    expect(SCH.countAssets((await a.load()).portfolio)).toBe(5);
    expect((await b.save(S36)).stale).toBe(true); /* stays refused until it reloads */
    await b.load(); expect((await b.save(S36)).ok).toBe(true);
  });
});

/* a minimal Web Locks stand-in: exclusive named locks, ifAvailable, queued requests */
const makeLocks = () => {
  const held = new Map(), queue = new Map();
  const grant = (name, cb, resolve) => {
    held.set(name, true);
    Promise.resolve(cb({ name })).then(() => { held.delete(name); const q = (queue.get(name) || []).shift(); if (q) grant(name, q.cb, q.resolve); resolve(); });
  };
  return { request(name, opts, cb) {
    if (typeof opts === 'function') { cb = opts; opts = {}; }
    return new Promise((resolve) => {
      if (!held.get(name)) return grant(name, cb, resolve);
      if (opts.ifAvailable) return Promise.resolve(cb(null)).then(resolve);
      if (!queue.has(name)) queue.set(name, []);
      queue.get(name).push({ cb, resolve });
    });
  } };
};
const tick = (ms = 20) => new Promise((r) => setTimeout(r, ms));

describe('B1 two tabs: Web Locks + BroadcastChannel, only one tab writes', () => {
  it('the second tab is read-only, is told about saves, and takes over after the first closes', async () => {
    const idb = new IDBFactory(), locks = makeLocks();
    const mk = () => createStore({ indexedDB: idb, locks, BroadcastChannel });
    const t1 = mk(), t2 = mk(), ev = [];
    await t1.open(); await t2.open();
    t2.onChange((e) => ev.push(e.type));
    expect(await t1.claimWriter()).toBe(true);
    expect(await t2.claimWriter()).toBe(false);
    await t1.load(); await t2.load();
    expect((await t2.save(SCH.toV22(E.seedPlan()))).readonly).toBe(true); /* tab 2 cannot write */
    expect(await t1.load()).toBeNull();
    const S = SCH.toV22(E.seedPlan());
    expect((await t1.save(S)).ok).toBe(true);
    await tick();
    expect(ev).toContain('stale'); /* tab 2 heard about it through the BroadcastChannel */
    expect(t2.needsReload).toBe(true);
    t1.close(); /* tab 1 closes: tab 2 gets the lock but must reload first */
    await tick();
    expect(t2.isWriter).toBe(true);
    expect(ev).toContain('writer');
    expect((await t2.save(S)).stale).toBe(true);
    const r = await t2.load();
    expect(SCH.countAssets(r.portfolio)).toBe(36);
    expect((await t2.save(r.portfolio)).ok).toBe(true);
    t2.close();
  });
  it('simultaneous saves from two writer-less tabs cannot both win (rev guard in the transaction)', async () => {
    const idb = new IDBFactory();
    const a = createStore({ indexedDB: idb, locks: null, BroadcastChannel: null }), b = createStore({ indexedDB: idb, locks: null, BroadcastChannel: null });
    await a.open(); await b.open(); await a.load(); await b.load();
    const [ra, rb] = await Promise.all([a.save(SCH.toV22(E.seedPlan())), b.save(SCH.toV22(E.seedStradella()))]);
    expect([ra.ok, rb.ok].filter(Boolean).length).toBe(1);
  });
});

describe('B1 persistent storage', () => {
  it('asks the browser and records the answer; unsupported is not an error', async () => {
    const store = fresh(); await store.open();
    expect(await store.persist()).toBeNull(); /* node has no navigator.storage */
    let asked = 0;
    const nav0 = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
    Object.defineProperty(globalThis, 'navigator', { value: { storage: { persisted: async () => false, persist: async () => { asked++; return true; } } }, configurable: true });
    expect(await store.persist()).toBe(true);
    expect(asked).toBe(1);
    expect(await store.kvGet('persistGranted')).toBe(true);
    if (nav0) Object.defineProperty(globalThis, 'navigator', nav0);
  });
});

describe('B1 jobPay / jobSavedOverride round trip (J57/J59 follow-up)', () => {
  it('null, empty string, 0 and a number survive toV22 then fromV22 exactly, including through the store', async () => {
    const S = E.seedPlan(); S.v = DATA_V;
    const vals = [[null, null], ['', null], [0, 0], [300, 12.5], [null, 0], [1234.5, null]];
    vals.forEach(([jp, js], i) => { S.houses[i].jobPay = jp; S.houses[i].jobSavedOverride = js; });
    const store = fresh(); await store.open(); await store.load();
    expect((await store.save(SCH.toV22(S))).ok).toBe(true);
    const back = SCH.fromV22((await store.load()).portfolio);
    vals.forEach(([jp, js], i) => { expect(back.houses[i].jobPay, 'jobPay ' + i).toBe(jp); expect(back.houses[i].jobSavedOverride, 'jobSavedOverride ' + i).toBe(js); });
    expect(SCH.hashOf(back)).toBe(SCH.hashOf(S));
  });
});

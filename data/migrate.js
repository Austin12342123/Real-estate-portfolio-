/* localStorage -> IndexedDB migration (card B1). copy, verify (asset count + hash), then flag; roll back on any mismatch.
   The old localStorage keys are NEVER written or removed here (they stay as the user's untouched fallback).
   migrateFromLocalStorage({ ls, store, now, afterCopy }) resolves { status, ... } with status one of:
     'already'    the flag is set: nothing to do
     'nothing'    no portfolio in localStorage (fresh start: the app creates its first v22 portfolio itself)
     'unreadable' the stored text is not a portfolio: left alone, no flag (the app's own recovery handles it)
     'migrated'   copied, verified, flagged
     'rolled-back' verification failed: everything written was removed, no flag, localStorage untouched (reason says why)
   afterCopy (tests only) runs between copy and verify. */
(function (root, factory) {
  const isNode = typeof require === 'function' && typeof module === 'object';
  const api = factory(isNode ? require('./schema.js') : root.RepData);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.RepData = Object.assign(root.RepData || {}, api);
})(typeof self !== 'undefined' ? self : this, function (SCH) {
  const KEYS = { state: 'rep-v4', ui: 'rep-v4-ui', saved: 'rep-v4-saved', safety: 'rep-v4-safety', examples: 'rep-v4-examples', backup: 'rep-v4-backup', diag: 'rep-v4-diag' };
  const FLAG = 'migratedFromLocalStorage';
  const req = (r) => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  const done = (tx) => new Promise((res, rej) => { tx.oncomplete = () => res(); tx.onabort = () => rej(tx.error || new Error('aborted')); tx.onerror = () => rej(tx.error); });
  const readLS = (ls, k) => { try { return ls.getItem(k); } catch (e) { return null; } };
  const parse = (t) => { try { return JSON.parse(t); } catch (e) { return null; } };
  const okLegacy = (s) => !!(s && typeof s === 'object' && Array.isArray(s.houses) && s.g);

  async function migrateFromLocalStorage(o) {
    const { ls, store } = o, now = o.now || (() => Date.now());
    await store.open();
    if (await store.kvGet(FLAG)) return { status: 'already' };
    const raw = readLS(ls, KEYS.state);
    if (raw === null || raw === '') return { status: 'nothing' };
    const legacy = parse(raw);
    if (!okLegacy(legacy)) return { status: 'unreadable' };
    const ui = parse(readLS(ls, KEYS.ui)) || {};
    const savedList = (() => { const a = parse(readLS(ls, KEYS.saved)); return Array.isArray(a) ? a.filter((x) => x && x.id && okLegacy(x.state)) : []; })();
    const safety = (() => { const j = parse(readLS(ls, KEYS.safety)); return j && Array.isArray(j.items) ? j.items.filter((x) => x && okLegacy(x.state)).slice(0, 3) : []; })();
    const t = now();
    const portfolio = SCH.toV22(legacy, { ui, now: t });
    const want = { assets: SCH.countAssets(legacy), hash: SCH.hashOf(legacy) };
    const savedRecs = savedList.map((x) => ({ id: String(x.id), name: x.name, ts: x.ts, data: SCH.toV22(x.state, { now: t, id: String(x.id) }), want: { assets: SCH.countAssets(x.state), hash: SCH.hashOf(x.state) } }));
    const db = store._db();
    const written = { portfolio: false, saved: [], snaps: [], kv: [] };
    const rollback = async () => {
      const tx = db.transaction(['portfolio', 'saved', 'snapshots', 'kv'], 'readwrite');
      if (written.portfolio) tx.objectStore('portfolio').delete('current');
      written.saved.forEach((id) => tx.objectStore('saved').delete(id));
      written.snaps.forEach((s) => tx.objectStore('snapshots').delete(s));
      written.kv.forEach((k) => tx.objectStore('kv').delete(k));
      tx.objectStore('kv').delete(FLAG);
      await done(tx);
    };
    try {
      /* 1. copy, in one transaction (all or nothing) */
      const tx = db.transaction(['portfolio', 'saved', 'snapshots', 'kv'], 'readwrite');
      const ps = tx.objectStore('portfolio');
      const existing = await req(ps.get('current'));
      if (existing) { try { tx.abort(); } catch (e) {} await done(tx).catch(() => {}); return { status: 'rolled-back', reason: 'the store already holds a portfolio; not overwritten' }; }
      ps.put({ id: 'current', rev: 1, hash: SCH.hashOf(portfolio), savedAt: t, data: portfolio });
      written.portfolio = true;
      savedRecs.forEach((r) => { tx.objectStore('saved').put({ id: r.id, name: r.name, ts: r.ts, data: r.data }); written.saved.push(r.id); });
      for (const it of safety.slice().reverse()) {
        const k = await req(tx.objectStore('snapshots').add({ ts: it.ts, reason: 'carried over: ' + (it.reason || 'safety copy'), build: it.build || '', hash: SCH.hashOf(SCH.toV22(it.state, { now: t })), assets: SCH.countAssets(it.state), rev: 0, data: SCH.toV22(it.state, { now: t }) }));
        written.snaps.push(k);
      }
      [['ui', ui], ['examples', parse(readLS(ls, KEYS.examples))], ['backupAt', readLS(ls, KEYS.backup)]].forEach(([k, v]) => {
        if (v !== null && v !== undefined) { tx.objectStore('kv').put({ key: k, value: v }); written.kv.push(k); }
      });
      await done(tx);
      if (o.afterCopy) await o.afterCopy(db);
      /* 2. verify by reading everything back */
      const rtx = db.transaction(['portfolio', 'saved'], 'readonly');
      const back = await req(rtx.objectStore('portfolio').get('current'));
      const backSaved = await req(rtx.objectStore('saved').getAll());
      const bad = (what, got, w) => {
        const g = { assets: SCH.countAssets(got), hash: SCH.hashOf(got) };
        return g.assets !== w.assets ? what + ': asset count ' + g.assets + ' vs ' + w.assets : g.hash !== w.hash ? what + ': hash ' + g.hash + ' vs ' + w.hash : '';
      };
      let why = '';
      if (!back) why = 'portfolio missing after copy';
      else {
        try { why = bad('portfolio', SCH.fromV22(back.data), want); } catch (e) { why = 'portfolio unreadable: ' + e.message; }
      }
      for (const r of savedRecs) {
        if (why) break;
        const b = backSaved.find((x) => x.id === r.id);
        if (!b) why = 'saved ' + r.id + ' missing';
        else { try { why = bad('saved ' + r.id, SCH.fromV22(b.data), r.want); } catch (e) { why = 'saved ' + r.id + ' unreadable'; } }
      }
      if (why) { await rollback(); return { status: 'rolled-back', reason: why }; }
      /* 3. flag last */
      await store.kvSet(FLAG, { at: t, assets: want.assets, hash: want.hash, saved: savedRecs.length });
      return { status: 'migrated', assets: want.assets, hash: want.hash, saved: savedRecs.length, carriedCopies: safety.length };
    } catch (e) {
      try { await rollback(); } catch (e2) {}
      return { status: 'rolled-back', reason: 'error: ' + ((e && e.message) || e) };
    }
  }
  return { migrateFromLocalStorage, KEYS, FLAG };
});

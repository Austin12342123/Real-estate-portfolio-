/* IndexedDB store for the v22 portfolio (card B1). Browser global RepData.createStore, or require() in node (tests pass fake-indexeddb).
   Stores: portfolio (one record 'current' { id, rev, hash, savedAt, data }), saved (saved portfolios), snapshots (safety copies, newest 3),
   kv (flags and small values). Everything is injectable: createStore({ indexedDB, locks, BroadcastChannel, now, name }).
   Rules:
   - STALE GUARD (carried from A72F): a page remembers the rev it loaded; a save is refused (stale:true) when the stored rev differs, so a page that is
     still open on old data can never overwrite a newer stored portfolio. The check and the write are ONE transaction.
   - ONE WRITER: a tab saves only while it holds the Web Lock 'rep-v4-writer'. Other tabs are read-only and are told through a BroadcastChannel when the
     writer saved (they must reload). When the writer closes, a waiting tab gets the lock, but must reload before its first save.
   - SAFETY COPIES: only before a major change (MAJOR below). The copy and the change are one transaction; the 3 newest copies are kept and older ones are
     deleted in that same transaction. There are no daily or weekly copies. */
(function (root, factory) {
  const api = factory(typeof require === 'function' && typeof module === 'object' ? require('./schema.js') : root.RepData);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.RepData = Object.assign(root.RepData || {}, api);
})(typeof self !== 'undefined' ? self : this, function (SCH) {
  const DB_NAME = 'rep-v4-store', DB_VER = 1, SAFE_KEEP = 3, LOCK_NAME = 'rep-v4-writer', CHAN_NAME = 'rep-v4-store';
  /* the only reasons a safety copy may be taken (a reason must start with one of these) */
  const MAJOR = ['data migration', 'backup import', 'restore', 'csv import', 'delete asset', 'delete entity'];
  const isMajor = (r) => typeof r === 'string' && MAJOR.some((m) => r.indexOf(m) === 0);
  const req = (r) => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  const done = (tx) => new Promise((res, rej) => { tx.oncomplete = () => res(); tx.onabort = () => rej(tx.error || new Error('transaction aborted')); tx.onerror = () => rej(tx.error); });

  function createStore(o) {
    o = o || {};
    const idb = o.indexedDB || (typeof indexedDB !== 'undefined' ? indexedDB : null);
    const locks = o.locks !== undefined ? o.locks : typeof navigator !== 'undefined' && navigator.locks ? navigator.locks : null;
    const BC = o.BroadcastChannel !== undefined ? o.BroadcastChannel : typeof BroadcastChannel !== 'undefined' ? BroadcastChannel : null;
    const now = o.now || (() => Date.now());
    const name = o.name || DB_NAME;
    let db = null, rev = null, isWriter = !locks, needsReload = false, chan = null, releaseLock = null, listeners = [];
    const st = {
      get rev() { return rev; },
      get isWriter() { return isWriter; },
      get needsReload() { return needsReload; },
      onChange(fn) { listeners.push(fn); },
      async open() {
        if (db) return st;
        if (!idb) throw new Error('IndexedDB is not available');
        db = await new Promise((res, rej) => {
          const r = idb.open(name, DB_VER);
          r.onupgradeneeded = () => {
            const d = r.result;
            d.createObjectStore('portfolio', { keyPath: 'id' });
            d.createObjectStore('saved', { keyPath: 'id' });
            d.createObjectStore('snapshots', { keyPath: 'seq', autoIncrement: true });
            d.createObjectStore('kv', { keyPath: 'key' });
          };
          r.onsuccess = () => res(r.result);
          r.onerror = () => rej(r.error);
          r.onblocked = () => rej(new Error('open blocked'));
        });
        db.onversionchange = () => { db.close(); db = null; };
        if (BC) {
          chan = new BC(CHAN_NAME);
          chan.onmessage = (e) => {
            const m = e.data || {};
            if (m.type === 'saved' && m.rev !== rev) { needsReload = true; listeners.forEach((f) => f({ type: 'stale', rev: m.rev })); }
          };
        }
        return st;
      },
      close() {
        if (releaseLock) releaseLock();
        if (chan) chan.close();
        if (db) db.close();
        db = null; chan = null;
      },
      /* take the writer lock. Resolves true when this tab is the writer now, false when another tab is (this tab stays read-only and is promoted later: onChange gets {type:'writer'}) */
      async claimWriter() {
        if (!locks) { isWriter = true; return true; }
        const got = await new Promise((resolve) => {
          const hold = (granted) => {
            if (!granted) { resolve(false); return undefined; }
            resolve(true);
            return new Promise((rel) => { releaseLock = rel; });
          };
          locks.request(LOCK_NAME, { ifAvailable: true }, hold).catch(() => resolve(false));
        });
        isWriter = got;
        if (!got) {
          locks.request(LOCK_NAME, () => {
            isWriter = true; needsReload = true; /* the data this tab holds may be older than the stored one: reload before the first save */
            listeners.forEach((f) => f({ type: 'writer' }));
            return new Promise((rel) => { releaseLock = rel; });
          }).catch(() => {});
        }
        return got;
      },
      /* read the working portfolio; remembers its rev for the stale guard */
      async load() {
        const tx = db.transaction('portfolio', 'readonly');
        const r = await req(tx.objectStore('portfolio').get('current'));
        rev = r ? r.rev : 0;
        needsReload = false;
        return r ? { portfolio: r.data, rev: r.rev, hash: r.hash } : null;
      },
      /* save the working portfolio. { ok:true, rev } | { ok:false, readonly | stale | error } ; never overwrites a newer stored portfolio */
      async save(portfolio) { return st._write(portfolio, null); },
      /* a major change: the stored portfolio is filed as a safety copy and the new one written in ONE transaction; the 3 newest copies are kept */
      async saveMajor(reason, portfolio, build) {
        if (!isMajor(reason)) return { ok: false, error: 'not a major change: ' + reason };
        return st._write(portfolio, { reason, build });
      },
      /* a major change that is not a save (nothing new to write, e.g. before deleting rows elsewhere): file a copy of the stored portfolio now */
      async snapshotNow(reason, build) {
        if (!isMajor(reason)) return { ok: false, error: 'not a major change: ' + reason };
        const tx = db.transaction(['portfolio', 'snapshots'], 'readwrite');
        const cur = await req(tx.objectStore('portfolio').get('current'));
        if (cur) addSnap(tx, cur, reason, build);
        await done(tx);
        return { ok: true };
      },
      async _write(portfolio, major) {
        if (!isWriter) return { ok: false, readonly: true };
        if (needsReload) return { ok: false, stale: true };
        const errs = SCH.validate(portfolio);
        if (errs.length) return { ok: false, error: 'invalid portfolio: ' + errs.join(', ') };
        const tx = db.transaction(['portfolio', 'snapshots'], 'readwrite');
        const ps = tx.objectStore('portfolio');
        const cur = await req(ps.get('current'));
        if ((cur ? cur.rev : 0) !== rev) { try { tx.abort(); } catch (e) {} await done(tx).catch(() => {}); needsReload = true; return { ok: false, stale: true }; }
        if (major && cur) addSnap(tx, cur, major.reason, major.build);
        const next = rev + 1, data = Object.assign({}, portfolio, { updatedAt: now() });
        ps.put({ id: 'current', rev: next, hash: SCH.hashOf(data), savedAt: now(), data });
        await done(tx);
        rev = next;
        if (chan) chan.postMessage({ type: 'saved', rev });
        return { ok: true, rev };
      },
      async snapshots() {
        const tx = db.transaction('snapshots', 'readonly');
        const all = await req(tx.objectStore('snapshots').getAll());
        return all.sort((a, b) => b.seq - a.seq);
      },
      async restoreSnapshot(seq, build) { /* restoring is itself a major change: the current portfolio is filed first */
        const tx0 = db.transaction('snapshots', 'readonly');
        const s = await req(tx0.objectStore('snapshots').get(seq));
        if (!s) return { ok: false, error: 'no such copy' };
        return st.saveMajor('restore', Object.assign({}, s.data), build);
      },
      async getSaved() { return req(db.transaction('saved', 'readonly').objectStore('saved').getAll()); },
      async putSaved(list) { /* replace the saved list */
        const tx = db.transaction('saved', 'readwrite');
        const s = tx.objectStore('saved');
        s.clear();
        (list || []).forEach((x) => s.put(x));
        await done(tx);
      },
      async kvGet(key) { const r = await req(db.transaction('kv', 'readonly').objectStore('kv').get(key)); return r ? r.value : undefined; },
      async kvSet(key, value) { const tx = db.transaction('kv', 'readwrite'); tx.objectStore('kv').put({ key, value }); await done(tx); },
      async kvDelete(key) { const tx = db.transaction('kv', 'readwrite'); tx.objectStore('kv').delete(key); await done(tx); },
      /* raw transaction for the migration (copy / verify / roll back) */
      _db: () => db,
      /* ask the browser not to evict this origin's storage; resolves true / false / null (unsupported) and records the answer */
      async persist() {
        try {
          const s = typeof navigator !== 'undefined' ? navigator.storage : null;
          if (!s || !s.persist) return null;
          const ok = (s.persisted && (await s.persisted())) || (await s.persist());
          await st.kvSet('persistGranted', !!ok);
          return !!ok;
        } catch (e) { return null; }
      },
    };
    function addSnap(tx, cur, reason, build) {
      const ss = tx.objectStore('snapshots');
      ss.add({ ts: now(), reason, build: build || '', hash: cur.hash, assets: SCH.countAssets(cur.data), rev: cur.rev, data: cur.data });
      /* prune in the same transaction: keep the SAFE_KEEP newest by seq */
      const k = ss.getAllKeys();
      k.onsuccess = () => { const keys = k.result.slice().sort((a, b) => a - b); keys.slice(0, Math.max(0, keys.length - SAFE_KEEP)).forEach((x) => ss.delete(x)); };
    }
    return st;
  }
  return { createStore, MAJOR, isMajor, SAFE_KEEP, DB_NAME };
});

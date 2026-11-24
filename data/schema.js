/* Data schema v22 (docs/schema-v22.md). Pure functions, no storage. Works in the browser (global RepData) and in node (require).
   toV22(legacy)  : the app's working portfolio ({ g, p, houses, v, ... }, money in dollars) -> a v22 Portfolio (money in cents).
   fromV22(p)     : the exact inverse, so the engine keeps running on its own shape. toV22 then fromV22 returns the same portfolio (same figures).
   Ids of existing records are KEPT (the engine refers to them: mergeInto, planned ids); only new records get UUIDs. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.RepData = Object.assign(root.RepData || {}, api);
})(typeof self !== 'undefined' ? self : this, function () {
  const SCHEMA_V = 22;
  const THEMES = ['oxford', 'clay', 'cottagecore', 'technoir', 'darkacademia', 'ember'];
  const MONEY_VIEWS = ['today', 'future', 'todaySub'];
  /* dollar fields that become cents. Ambiguous ones (percent-like: nnn, mipUp, mipAnn, liftIncome) are NOT converted. */
  const ASSET_MONEY = ['price', 'liens', 'paid', 'buyIn', 'capex', 'arv', 'rent', 'tax', 'ins', 'hoa', 'mfRes', 'mfOther', 'revenue', 'extra', 'jobPay', 'jobSavedOverride', 'comp'];
  const PERSONAL_MONEY = ['cash', 'living', 'housing', 'gmMonthly'];
  const JOB_MONEY = ['gross', 'wage', 'tips'];
  const CAP_MONEY = ['amount'];
  const G_MONEY = ['p1', 'p2', 'otherDebt'];
  const LEGACY_TOP = ['g', 'p', 'houses']; /* these map to schema fields; EVERY other top-level key of the working portfolio (v, added, orderV, seq, ...) is kept in meta.legacyTop so a round trip loses nothing */
  const uuid = () => {
    const c = typeof crypto !== 'undefined' && crypto;
    if (c && c.randomUUID) return c.randomUUID();
    const b = new Uint8Array(16);
    for (let i = 0; i < 16; i++) b[i] = Math.floor(Math.random() * 256);
    b[6] = (b[6] & 15) | 64;
    b[8] = (b[8] & 63) | 128;
    const h = Array.from(b, (x) => ('0' + x.toString(16)).slice(-2)).join('');
    return h.slice(0, 8) + '-' + h.slice(8, 12) + '-' + h.slice(12, 16) + '-' + h.slice(16, 20) + '-' + h.slice(20);
  };
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const isNum = (v) => typeof v === 'number' && isFinite(v);
  const toCents = (d) => Math.round(d * 100);
  const fromCents = (c) => c / 100;
  /* canonical text (sorted keys) and a 53-bit hash of it (cyrb53): the same portfolio always gives the same hash */
  const canon = (v) => {
    if (Array.isArray(v)) return '[' + v.map(canon).join(',') + ']';
    if (v && typeof v === 'object')
      return '{' + Object.keys(v).filter((k) => v[k] !== undefined).sort().map((k) => JSON.stringify(k) + ':' + canon(v[k])).join(',') + '}';
    return JSON.stringify(v === undefined ? null : v);
  };
  const hash = (s) => {
    let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (let i = 0; i < s.length; i++) {
      const ch = s.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(14, '0');
  };
  const hashOf = (v) => hash(canon(v));
  /* convert the listed dollar fields of o to cents in place; a value that is not an exact number of cents is kept verbatim in o.exact so nothing is rounded */
  function moneyOut(o, fields) {
    const exact = {};
    fields.forEach((k) => {
      if (!isNum(o[k])) return;
      const c = toCents(o[k]);
      if (fromCents(c) !== o[k]) exact[k] = o[k];
      o[k] = c;
    });
    if (Object.keys(exact).length) o.exact = exact;
  }
  function moneyIn(o, fields) {
    const exact = o.exact || {};
    fields.forEach((k) => {
      if (k in exact) o[k] = exact[k];
      else if (isNum(o[k])) o[k] = fromCents(o[k]);
    });
    delete o.exact;
  }
  const mapNum = (arr, fields, fn) =>
    Array.isArray(arr)
      ? arr.map((x) => {
          const y = clone(x);
          fn(y, fields);
          return y;
        })
      : arr;
  function defaultMeta() {
    return { goal: null, deviceId: uuid(), csvProfiles: [], lastBackupAt: null, theme: 'oxford', moneyView: 'today', futureYear: null, inflationMode: 'auto', learn: { done: [] }, legacyTop: {} };
  }
  /* legacy = the working portfolio. opts = { ui: legacy UI object (unit), now, deviceId, entityId, id } */
  function toV22(legacy, opts) {
    opts = opts || {};
    const L = clone(legacy), now = opts.now || Date.now();
    const meta = Object.assign(defaultMeta(), opts.meta ? clone(opts.meta) : {});
    meta.legacyTop = {};
    if (opts.deviceId) meta.deviceId = opts.deviceId;
    if (opts.ui && opts.ui.unit === 'future') meta.moneyView = 'future';
    Object.keys(L).forEach((k) => {
      if (LEGACY_TOP.indexOf(k) < 0) meta.legacyTop[k] = L[k];
    });
    const entityId = opts.entityId || 'ent-personal';
    const units = [];
    const assets = (L.houses || []).map((a) => {
      a.entityId = entityId;
      a.updatedAt = a.created || now;
      moneyOut(a, ASSET_MONEY);
      if (a.kind === 'multi' && a.units >= 2)
        for (let i = 1; i <= a.units; i++) units.push({ id: a.id + '~u' + i, assetId: a.id, label: 'Unit ' + i, createdAt: a.created || now, updatedAt: a.created || now });
      return a;
    });
    const personal = L.p ? clone(L.p) : null;
    if (personal) {
      moneyOut(personal, PERSONAL_MONEY);
      personal.jobs = mapNum(personal.jobs, JOB_MONEY, moneyOut);
      personal.capital = mapNum(personal.capital, CAP_MONEY, moneyOut);
    }
    const assumptions = L.g ? clone(L.g) : null;
    if (assumptions) moneyOut(assumptions, G_MONEY);
    return {
      id: opts.id || 'current',
      schemaVersion: SCHEMA_V,
      updatedAt: now,
      assumptions,
      personal,
      entities: [{ id: entityId, name: 'Me', kind: 'personal', createdAt: now, updatedAt: now }],
      accounts: [],
      assets,
      units,
      leases: [],
      loans: [],
      ledger: [],
      rules: [],
      notes: [],
      meta,
    };
  }
  function fromV22(p) {
    if (!p || p.schemaVersion !== SCHEMA_V) throw new Error('not a v22 portfolio');
    const out = {};
    const top = (p.meta && p.meta.legacyTop) || {};
    Object.keys(top).forEach((k) => {
      out[k] = clone(top[k]);
    });
    out.g = p.assumptions ? clone(p.assumptions) : undefined;
    if (out.g) moneyIn(out.g, G_MONEY);
    if (p.personal) {
      out.p = clone(p.personal);
      moneyIn(out.p, PERSONAL_MONEY);
      out.p.jobs = mapNum(out.p.jobs, JOB_MONEY, moneyIn);
      out.p.capital = mapNum(out.p.capital, CAP_MONEY, moneyIn);
    }
    out.houses = p.assets.map((a) => {
      const h = clone(a);
      delete h.entityId;
      delete h.updatedAt;
      moneyIn(h, ASSET_MONEY);
      return h;
    });
    return out;
  }
  const countAssets = (p) => (p && Array.isArray(p.assets) ? p.assets.length : p && Array.isArray(p.houses) ? p.houses.length : 0);
  function validate(p) {
    const err = [];
    if (!p || typeof p !== 'object') return ['not an object'];
    if (p.schemaVersion !== SCHEMA_V) err.push('schemaVersion ' + p.schemaVersion);
    ['entities', 'accounts', 'assets', 'units', 'leases', 'loans', 'ledger', 'rules', 'notes'].forEach((k) => {
      if (!Array.isArray(p[k])) err.push(k + ' missing');
    });
    const m = p.meta || {};
    if (MONEY_VIEWS.indexOf(m.moneyView) < 0) err.push('meta.moneyView');
    if (THEMES.indexOf(m.theme) < 0) err.push('meta.theme');
    if (['auto', 'custom'].indexOf(m.inflationMode) < 0) err.push('meta.inflationMode');
    if (!('futureYear' in m)) err.push('meta.futureYear');
    if (!m.learn || !Array.isArray(m.learn.done)) err.push('meta.learn');
    return err;
  }
  return { SCHEMA_V, THEMES, MONEY_VIEWS, ASSET_MONEY, toV22, fromV22, validate, canon, hash, hashOf, countAssets, uuid, defaultMeta, toCents, fromCents };
});

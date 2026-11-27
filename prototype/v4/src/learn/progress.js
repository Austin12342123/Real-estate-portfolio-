/* Learn progress: meta.learn.done (array of module ids, schema v22). Pure; every writer returns a NEW meta; no storage. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else { root.RepLearn = root.RepLearn || {}; root.RepLearn.progress = api; }
})(typeof self !== 'undefined' ? self : this, function () {
  function doneList(meta) {
    const d = meta && meta.learn && meta.learn.done;
    return Array.isArray(d) ? d.filter((x) => typeof x === 'string') : [];
  }
  function isDone(meta, id) { return doneList(meta).indexOf(id) >= 0; }
  function withDone(meta, list) {
    const m = Object.assign({}, meta || {});
    m.learn = Object.assign({}, m.learn, { done: list });
    return m;
  }
  /* knownIds (optional array): when given, ids not in it are ignored */
  function known(id, knownIds) { return typeof id === 'string' && id && (!Array.isArray(knownIds) || knownIds.indexOf(id) >= 0); }
  function markDone(meta, id, knownIds) {
    const l = doneList(meta);
    if (!known(id, knownIds) || l.indexOf(id) >= 0) return withDone(meta, l);
    return withDone(meta, l.concat([id]));
  }
  function markUndone(meta, id) { return withDone(meta, doneList(meta).filter((x) => x !== id)); }
  /* { done, total, pct } over the given module ids (stale ids in meta are not counted) */
  function summary(meta, moduleIds) {
    const ids = Array.isArray(moduleIds) ? moduleIds : [];
    const done = ids.filter((id) => isDone(meta, id)).length;
    return { done, total: ids.length, pct: ids.length ? Math.round(100 * done / ids.length) : 0 };
  }
  return { doneList, isDone, markDone, markUndone, summary };
});

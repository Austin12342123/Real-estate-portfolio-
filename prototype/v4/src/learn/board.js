/* Learn board: filter resources by tag, search vocab. Pure, no DOM. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else { root.RepLearn = root.RepLearn || {}; root.RepLearn.board = api; }
})(typeof self !== 'undefined' ? self : this, function () {
  const lc = (s) => String(s == null ? '' : s).toLowerCase();
  /* tag empty/null/'all' -> every resource; else those whose tags include it (case-insensitive) */
  function filterByTag(board, tag) {
    const b = Array.isArray(board) ? board : [];
    const t = lc(tag).trim();
    if (!t || t === 'all') return b.slice();
    return b.filter((r) => r && Array.isArray(r.tags) && r.tags.some((x) => lc(x) === t));
  }
  function tags(board) {
    const s = {};
    (Array.isArray(board) ? board : []).forEach((r) => (r && Array.isArray(r.tags) ? r.tags : []).forEach((x) => { s[x] = 1; }));
    return Object.keys(s).sort();
  }
  /* term or definition contains the query, case-insensitive; empty query -> all, sorted by term */
  function searchVocab(vocab, query) {
    const v = (Array.isArray(vocab) ? vocab : []).filter((x) => x && typeof x === 'object');
    const q = lc(query).trim();
    const out = q ? v.filter((x) => lc(x.term).indexOf(q) >= 0 || lc(x.definition).indexOf(q) >= 0) : v.slice();
    return out.sort((a, b) => lc(a.term).localeCompare(lc(b.term)));
  }
  return { filterByTag, tags, searchVocab };
});

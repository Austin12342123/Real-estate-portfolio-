/* Learn content: load + validate data/learn.json. Pure, no DOM, never throws on bad data.
   validate(data) -> { ok, errors:[string], data }.  Browser global RepLearn.content; node require. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else { root.RepLearn = root.RepLearn || {}; root.RepLearn.content = api; }
})(typeof self !== 'undefined' ? self : this, function () {
  const isStr = (s) => typeof s === 'string' && s.trim().length > 0;
  const isHttps = (u) => typeof u === 'string' && /^https:\/\/[^\s/]+/i.test(u);
  function checkLink(l, where, err) {
    if (!l || typeof l !== 'object') { err.push(where + ': link is not an object'); return; }
    if (!isHttps(l.url)) err.push(where + ': link url must be https (' + String(l.url) + ')');
  }
  function validate(data) {
    const err = [];
    if (typeof data === 'string') { try { data = JSON.parse(data); } catch (e) { return { ok: false, errors: ['learn: not valid JSON'], data: null }; } }
    if (!data || typeof data !== 'object' || Array.isArray(data)) return { ok: false, errors: ['learn: root must be an object'], data: null };
    const mods = data.course && data.course.modules;
    const vocab = Array.isArray(data.vocab) ? data.vocab : null;
    if (!Array.isArray(mods)) err.push('course.modules must be an array');
    if (!vocab) err.push('vocab must be an array');
    if (!Array.isArray(data.board)) err.push('board must be an array');
    const vocabIds = {};
    (vocab || []).forEach((t, i) => {
      const w = 'vocab[' + i + ']' + (t && t.id ? ' (' + t.id + ')' : '');
      if (!t || typeof t !== 'object') { err.push(w + ': not an object'); return; }
      if (!isStr(t.id)) err.push(w + ': missing id'); else if (vocabIds[t.id]) err.push(w + ': duplicate id'); else vocabIds[t.id] = 1;
      if (!isStr(t.term)) err.push(w + ': missing term');
      if (!isStr(t.definition)) err.push(w + ': missing definition');
    });
    const modIds = {};
    (Array.isArray(mods) ? mods : []).forEach((m, i) => {
      const w = 'module[' + i + ']' + (m && m.id ? ' (' + m.id + ')' : '');
      if (!m || typeof m !== 'object') { err.push(w + ': not an object'); return; }
      if (!isStr(m.id)) err.push(w + ': missing id'); else if (modIds[m.id]) err.push(w + ': duplicate id'); else modIds[m.id] = 1;
      if (!isStr(m.title)) err.push(w + ': missing title');
      if (!Array.isArray(m.keyPoints) || !m.keyPoints.length || !m.keyPoints.every(isStr)) err.push(w + ': needs at least one key point');
      const c = m.check;
      if (!c || typeof c !== 'object' || !isStr(c.question)) err.push(w + ': needs one check question');
      else if (Array.isArray(c.choices) && (!Number.isInteger(c.answer) || c.answer < 0 || c.answer >= c.choices.length)) err.push(w + ': check answer index out of range');
      (Array.isArray(m.vocab) ? m.vocab : []).forEach((id) => { if (vocab && !vocabIds[id]) err.push(w + ': unknown vocab id ' + id); });
      (Array.isArray(m.links) ? m.links : []).forEach((l, j) => checkLink(l, w + ' link[' + j + ']', err));
    });
    (Array.isArray(data.board) ? data.board : []).forEach((l, i) => {
      checkLink(l, 'board[' + i + ']', err);
      if (l && typeof l === 'object' && !Array.isArray(l.tags)) err.push('board[' + i + ']: tags must be an array');
    });
    return { ok: err.length === 0, errors: err, data: data };
  }
  /* parse + validate a JSON string or object; modules/vocab/board are always arrays in the result */
  function load(src) {
    const r = validate(src);
    const d = r.data || {};
    return { ok: r.ok, errors: r.errors, modules: (d.course && Array.isArray(d.course.modules)) ? d.course.modules : [],
      vocab: Array.isArray(d.vocab) ? d.vocab : [], board: Array.isArray(d.board) ? d.board : [] };
  }
  return { validate, load };
});

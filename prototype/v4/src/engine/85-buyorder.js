  /* ---------- list order = buy order; the trust (everything earlier in the list) funds each purchase ---------- */
  const catOf = (h) => h.type || 'house';
  /* Sort the list once into purchase order (owned first; ties keep their order). S.orderV marks it done so a saved order is never re-sorted. */
  /* Sort key of purchase order: an owned asset was bought 'paid' months ago, so the oldest comes first; a planned one goes by its purchase month (unfunded last). */
  const buyKey = (h, pl) =>
    h.status === 'owned' ? -(+h.paid || 0) : isFinite(pl.purchase[h.id]) ? pl.purchase[h.id] : 1e9;
  /* THE numbering policy, the one source of truth for every '#N' and buy-number badge. Numbers are contiguous from 1 in purchase order inside the portfolio view an asset belongs to:
     Planned view = every asset that is not owned (sold-in-plan ones keep their place), counted in list order, because the trust buys in list order and an asset is never bought before one above it
     (so list order IS purchase order; an unfunded asset keeps its list place instead of jumping to the end). Real view = every owned asset, oldest first (ties keep list order).
     Nothing is stored on the asset; numbers are recomputed from the list on every render, so removing an asset shifts every later number down by one at once.
     Returns { num: {id: n}, view: {id: 'planned' | 'owned'}, count: {planned, owned} }. pl is the plan (kept as a parameter so a future rule can use purchase months). */
  function numbering(S, pl) {
    const num = {},
      view = {},
      count = { planned: 0, owned: 0 };
    ['planned', 'owned'].forEach((v) => {
      const own = v === 'owned',
        list = S.houses.map((h, i) => [h, i]).filter(([h]) => (h.status === 'owned') === own);
      if (own) list.sort((a, b) => buyKey(a[0], pl) - buyKey(b[0], pl) || a[1] - b[1]);
      list.forEach(([h], k) => {
        num[h.id] = k + 1;
        view[h.id] = v;
      });
      count[v] = list.length;
    });
    return { num, view, count };
  }
  function orderByBuy(S) {
    const pl = plan(S),
      rk = (h) => buyKey(h, pl);
    S.houses = S.houses
      .map((h, i) => [h, i])
      .sort((a, b) => rk(a[0]) - rk(b[0]) || a[1] - b[1])
      .map((x) => x[0]);
    S.orderV = 2;
    return S;
  }
  /* Funding no longer uses per-asset links: the trust (everything earlier in the list plus what is owned today) funds each purchase, so the list order IS the funding order and nothing needs relinking.
     The old h.target field is kept only so old saves load; it is ignored by plan(). relink() just clears it. */
  function relink(S) {
    S.houses.forEach((h) => {
      h.target = '';
    });
    return S;
  }
  /* creation sequence: the latest asset added in a category is the one with the highest seq (assets from before this feature have none: list position decides) */
  function register(S, h) {
    S.seq = (+S.seq || 0) + 1;
    h.seq = S.seq;
    h.created = Date.now();
    return h;
  }
  function latestOf(list) {
    let best = null,
      bs = -Infinity;
    list.forEach((h) => {
      const q = h.seq != null && isFinite(+h.seq) ? +h.seq : -1;
      if (q >= bs) {
        bs = q;
        best = h;
      }
    });
    return best;
  }
  /* copy names: "<base> (copy)", "<base> (copy1)", "<base> (copy2)" ...; <base> is the name without a trailing (copy) / (copyN); the first suffix no asset uses is taken; the whole suffix survives the 80-character limit */
  function copyName(S, name) {
    const base = String(name == null ? '' : name)
        .replace(/\s*\(copy\d*\)\s*$/, '')
        .replace(/\s+$/, ''),
      used = new Set(S.houses.map((h) => h.addr));
    for (let n = 0; ; n++) {
      const suf = ' (copy' + (n ? n : '') + ')',
        nm = base.slice(0, Math.max(0, 80 - suf.length)).replace(/\s+$/, '') + suf;
      if (!used.has(nm)) return nm;
    }
  }
  function duplicate(S, id) {
    const i = S.houses.findIndex((h) => h.id === id);
    if (i < 0) return null;
    const o = S.houses[i],
      c = JSON.parse(JSON.stringify(o));
    c.id = 'h' + Date.now().toString(36) + uid++;
    c.addr = copyName(S, o.addr);
    c.status = 'planned';
    c.paid = 0;
    c.target = '';
    c.fresh = false;
    c.listingUrl = '';
    register(S, c);
    S.houses.splice(i + 1, 0, c);
    return c;
  }
  /* move an asset one step inside its category (visible = ids shown in the category, in order); returns true if the order changed */
  function reorder(S, ids) {
    const set = new Set(ids),
      slots = [];
    S.houses.forEach((h, i) => {
      if (set.has(h.id)) slots.push(i);
    });
    const cur = slots.map((i) => S.houses[i].id);
    if (cur.join() === ids.join()) return false;
    const by = {};
    S.houses.forEach((h) => {
      by[h.id] = h;
    });
    ids.forEach((id, k) => {
      S.houses[slots[k]] = by[id];
    });
    return true;
  }
  /* the buy order = the list order of the planned (not owned) assets, across categories. moveTo puts asset id at position n (1 = first), clamping to 1..count; returns { changed, pos, clamped, ids }. */
  const plannedIds = (S) => S.houses.filter((h) => h.status !== 'owned').map((h) => h.id);
  function moveTo(S, id, n) {
    const ids = plannedIds(S),
      i = ids.indexOf(id);
    if (i < 0) return { changed: false, pos: 0, clamped: false, ids };
    const want = Math.round(+n),
      bad = !isFinite(want),
      pos = bad ? i + 1 : Math.max(1, Math.min(ids.length, want)),
      clamped = bad || pos !== want;
    ids.splice(i, 1);
    ids.splice(pos - 1, 0, id);
    const changed = reorder(S, ids);
    return { changed, pos, clamped, ids };
  }

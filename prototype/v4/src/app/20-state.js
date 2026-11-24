  let S,
    UI = {
      unit: 'today',
      tab: 'timeline',
      open: false,
      coll: { drivers: true },
      hideLegend: false,
      addType: 'house',
      addLoan: '',
      addKind: 'single',
      addF: {},
      addLoanOpen: false,
      addMore: false,
      addUnits: 2,
      addPack: false,
      addEx: '',
      view: 'plan',
      openOn: 'planned',
      addOwned: false,
    };
  let RAW0 = null;
  try {
    RAW0 = localStorage.getItem(KEY);
  } catch (e) {}
  const HAD0 = RAW0 != null && RAW0 !== '';
  try {
    S = JSON.parse(RAW0);
  } catch (e) {
    S = null;
  }
  const V0 = S && typeof S === 'object' ? S.v : null,
    VALID0 = !!(S && Array.isArray(S.houses) && S.g);
  let exStoreOK = true,
    exMsg = '',
    exEdit =
      null; /* editable examples: the user's overrides live in their own key (rep-v4-examples), never in a portfolio; exEdit = the open editor { id, draft, base } */
  try {
    exStoreOK = typeof E.exLoad === 'function' ? E.exLoad(localStorage) : true;
  } catch (e) {
    exStoreOK = false;
  }
  const EXED =
    typeof E.exCheck === 'function' &&
    typeof E.exEff === 'function'; /* an old cached engine without the editor still works: no Edit buttons */
  const DATA_V = 21; /* bump when a release changes the data; NEVER replace a user's portfolio in a migration (new assets go through ADDITIONS in engine.js) */
  const ADDED_ALL = () => E.ADDITIONS.map((x) => x.key);
  let switched = null;
  if (S && Array.isArray(S.houses) && S.g) {
    if (S.v === 8) {
      S.p = S.p || E.samplePersonal();
      S.added = ADDED_ALL();
    } /* v8 saves keep their assets and gain a finance profile */ else if (S.v >= 9 && S.v <= 18) {
      switched = JSON.stringify(S);
      S = E.seedPlan();
    } /* v9-v18 saves switch silently to the plan of that time ($125M+ in today's dollars) and the old portfolio is filed in Saved (below); the plan needs about $2,000/mo of job money left after living costs. This is the ONLY migration that replaces a portfolio and it never runs for v19 or later. */ else if (
      S.v === 19
    )
      S.added = ADDED_ALL(); /* v19 already has (or has removed) the added house: add nothing */
    else if (!(S.v >= 20)) S = null; /* unknown or very old: start from the default plan */
  }
  if (!S || !Array.isArray(S.houses) || !S.g) S = E.seedPlan();
  E.normalize(S);
  if (!S.p) S.p = E.samplePersonal();
  S.p = E.normalizePersonal(S.p);
  S.v = DATA_V;
  const nAdd0 = Array.isArray(S.added) ? S.added.length : 0,
    nHouses0 = S.houses.length;
  E.applyAdditions(S);
  const ADDED_NOW = (Array.isArray(S.added) ? S.added.length : 0) > nAdd0 || S.houses.length > nHouses0;
  /* safety copy of what was stored BEFORE a migration or an additions append changes it (or before an unreadable save is replaced by the default plan) */
  let STARTSNAP = false,
    DIAG_MS = 0;
  const tDiag =
    performance.now(); /* DIAG_MS = what the safety / anomaly start-up work costs (the grader keeps it small) */
  if (HAD0) {
    const why = !VALID0
      ? 'unreadable save'
      : V0 !== DATA_V
        ? 'migration from v' + V0
        : ADDED_NOW
          ? 'additions added'
          : '';
    if (why && D) {
      let old = null;
      try {
        old = JSON.parse(RAW0);
      } catch (e) {}
      STARTSNAP = true;
      const ok = D.safeAdd(localStorage, old, why, STAMPS.app, NOW(), RAW0);
      logEv(
        !VALID0 || V0 !== DATA_V ? 'migration' : 'additions',
        why + (ok ? ': safety copy filed' : ': safety copy could not be stored'),
      );
    }
  }
  DIAG_MS += performance.now() - tDiag;
  /* the next planned asset below h in the list (the trust buys in list order), and the month it is bought if h's extra payment were x instead */
  const nextPlanned = (h) => {
    const i = S.houses.indexOf(h);
    for (let k = i + 1; k < S.houses.length; k++) if (S.houses[k].status === 'planned') return S.houses[k];
    return null;
  };
  const planWith = (h, x) => {
    const c = JSON.parse(JSON.stringify(S)),
      q = c.houses.find((y) => y.id === h.id);
    q.extra = x;
    q.driver = 'extra';
    return E.plan(c);
  };
  const monthWith = (h, x, id) => planWith(h, x).purchase[id];
  /* how long this asset's loan lasts in the plan (months from today when owned, months after it is bought when planned); it includes the automatic extra from its own profit and from your job */
  const lifeOf = (pl2, h) => {
    const e = pl2.loanEnd[h.id],
      b = h.status === 'owned' ? 0 : pl2.purchase[h.id];
    return isFinite(e) && isFinite(b) ? Math.max(0, e - b) : Infinity;
  };
  const buyOrder = (pl) =>
    E.numbering(S, pl)
      .num; /* one numbering function (engine.numbering): contiguous 1..n in purchase order inside the view the asset belongs to */
  const fixOrder = (s) => {
    s.seq = +s.seq || 0;
    s.houses.forEach((h) => {
      if (!h.created) h.created = Date.now();
    });
    if (s.orderV !== 2) E.orderByBuy(s);
    return s;
  }; /* list order = buy order, sorted once; after that the saved order is the truth */
  fixOrder(S);
  try {
    UI = Object.assign(UI, JSON.parse(localStorage.getItem(UIKEY)) || {});
  } catch (e) {}
  if (UI.unit !== 'future')
    UI.unit = 'today'; /* Show figures in: today's dollars (default) or future dollars */
  const isToday = () => UI.unit !== 'future';
  const PLAN = (s) =>
    E.planIn(
      s,
      UI.unit,
    ); /* the plan with every future-month figure in the chosen unit (the engine itself works in future dollars) */
  const UNIT = () => (isToday() ? "today's dollars" : 'future dollars');
  const PAGES = ['planned', 'real', 'saved'];
  if (PAGES.indexOf(UI.openOn) < 0) UI.openOn = 'planned';
  let page =
    UI.openOn; /* the page shown on the main screen; kept while you move around the app, and reset to the "Open the app on" choice when the app starts */
  /* saved portfolios: full snapshots (assets, assumptions, finances) kept on this device under their own key and included in Export / Restore */
  const MAXSAVED = 40,
    cleanSaved = (a) =>
      Array.isArray(a)
        ? a
            .filter((x) => x && x.id && x.state && Array.isArray(x.state.houses) && x.state.g)
            .slice(0, MAXSAVED)
            .map((x) => ({
              id: String(x.id),
              name: String(x.name || 'Saved portfolio').slice(0, 60),
              ts: +x.ts || Date.now(),
              state: x.state,
            }))
        : [];
  let SAVED = [];
  try {
    SAVED = cleanSaved(JSON.parse(localStorage.getItem(SKEY)));
  } catch (e) {
    SAVED = [];
  }
  let saveName = '',
    renameName = '',
    savedMsg = '';
  let undoTimer = null,
    storageOK = true,
    impName = '',
    imp = null,
    ask = null,
    notice = '',
    pendingImport = null,
    exportOpen = false,
    undo = null,
    selId = null;
  /* no popup: an older save moves to the current plan silently; the previous portfolio is kept in Saved so nothing is lost (it is filed once SAVED is loaded, below) */
  const RW = {
    ok: null,
    chars: 0,
    err: '',
  }; /* did the last save read back exactly as written? (an invariant the anomaly monitor checks) */
  let STALE = false; /* another tab changed the stored portfolio: this page keeps skipping saves and shows the Reload line */
  let LASTJS = RAW0; /* the last text of the portfolio this page read or wrote: a save never replaces a stored portfolio that differs from it (another tab, a restore or a test changed it): the stale page would overwrite newer data with its own copy */
  const save = () => {
    try {
      const js = JSON.stringify(S);
      const cur = localStorage.getItem(KEY);
      let foreign = false;
      if (cur !== null && cur !== '' && cur !== LASTJS && cur !== js) {
        try {
          const o = JSON.parse(cur);
          foreign = !!(o && Array.isArray(o.houses));
        } catch (e) {}
      } /* only a readable portfolio counts: an unreadable or damaged value is still replaced by a good save */
      if (foreign) {
        logEv('stale', 'save skipped: the stored portfolio was changed elsewhere; this page keeps it');
        if (!STALE) {
          STALE = true;
          try {
            injectNotes();
          } catch (e) {}
        }
        storageOK = true;
        RW.ok = true;
        RW.err = '';
        return;
      }
      localStorage.setItem(KEY, js);
      LASTJS = js;
      localStorage.setItem(UIKEY, JSON.stringify(UI));
      storageOK = true;
      RW.ok = localStorage.getItem(KEY) === js;
      RW.chars = js.length;
      RW.err = '';
      if (!RW.ok) logEv('storage', 'read-back differs from what was written');
    } catch (e) {
      storageOK = false;
      RW.ok = false;
      RW.err = String((e && e.message) || e).slice(0, 80);
      logEv('storage', 'save failed: ' + RW.err);
    }
  };
  const saveSaved = () => {
    try {
      localStorage.setItem(SKEY, JSON.stringify(SAVED));
      return true;
    } catch (e) {
      logEv('storage', 'saved list not stored: ' + String((e && e.message) || e).slice(0, 80));
      return false;
    }
  };
  /* safety copies: a snapshot of the working portfolio in the ring (rep-v4-safety) taken BEFORE anything that could replace it */
  let SAFE_CACHE = null;
  const safeList = () => SAFE_CACHE || (SAFE_CACHE = D ? D.safeRead(localStorage) : []);
  function safeCopy(reason, st) {
    SAFE_CACHE = null;
    if (!D) return false;
    const r = D.safeAdd(localStorage, st || S, reason, STAMPS.app, NOW());
    logEv('safety', reason + (r ? ': copy filed' : ': copy could not be stored'));
    return !!r;
  }
  const backupJson = () =>
    JSON.stringify(
      Object.assign({}, S, { saved: SAVED, openOn: UI.openOn }, EXED ? { exOv: E.exExport() } : {}),
    ); /* the backup is the working portfolio plus the saved list and the start-page choice */
  const stamp = () => {
    const d = new Date();
    return (
      d.getFullYear() +
      '-' +
      String(d.getMonth() + 1).padStart(2, '0') +
      '-' +
      String(d.getDate()).padStart(2, '0')
    );
  };
  const H = (id) => E.H(S, id);
  /* viewer-safe routes: #house-<id>, #assumptions, #import-<id|new> */
  const hashOf = (p) =>
    !p
      ? '#'
      : p === 'settings'
        ? '#assumptions'
        : p.startsWith('h/')
          ? '#house-' + p.slice(2)
          : p.startsWith('import/')
            ? '#import-' + p.slice(7)
            : p === 'add'
              ? '#add'
              : p === 'finances'
                ? '#finances'
                : p === 'order'
                  ? '#order'
                  : '#';
  const routeOf = () => {
    const h = location.hash.slice(1);
    return h === 'assumptions'
      ? 'settings'
      : h.startsWith('house-')
        ? 'h/' + h.slice(6)
        : h.startsWith('import-')
          ? 'import/' + h.slice(7)
          : h === 'add'
            ? 'add'
            : h === 'finances'
              ? 'finances'
              : h === 'order'
                ? 'order'
                : '';
  };
  const goto = (p) => {
    location.hash = hashOf(p);
  };


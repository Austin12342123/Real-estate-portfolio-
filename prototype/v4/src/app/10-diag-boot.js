  const E = window.Engine,
    KEY = 'rep-v4',
    UIKEY = 'rep-v4-ui',
    SKEY = 'rep-v4-saved';
  const D =
    E.Diag ||
    null; /* safety copies, checks and the bug report live in engine.js (E.Diag); an old cached engine without it just means those parts stay quiet */
  /* ---------- diagnostics core. Everything stays on this device (rep-v4-diag, rep-v4-safety); nothing is ever sent. Written to work even when engine.js is an old file. ---------- */
  const DGKEY = 'rep-v4-diag',
    NOW = () => Date.now();
  let DG = { v: 1, ev: [], act: [], fp: null, flags: {} },
    ERRN = 0,
    STARTED = false;
  try {
    const j = JSON.parse(localStorage.getItem(DGKEY));
    if (j && j.v === 1)
      DG = {
        v: 1,
        ev: (Array.isArray(j.ev) ? j.ev : [])
          .filter((x) => x && isFinite(+x.t) && typeof x.k === 'string')
          .slice(-60),
        act: (Array.isArray(j.act) ? j.act : [])
          .filter((x) => x && isFinite(+x.t) && typeof x.a === 'string')
          .slice(-10),
        fp: j.fp && typeof j.fp === 'object' && j.fp.ids ? j.fp : null,
        flags: j.flags && typeof j.flags === 'object' ? j.flags : {},
      };
  } catch (e) {}
  const dgSave = () => {
    try {
      if (STARTED && DG.fp && localStorage.getItem(KEY) === null) {
        DG.fp = null;
        DG.flags = {};
        DG.ev.push({
          t: NOW(),
          k: 'cleared',
          m: 'the saved portfolio was cleared from this device while the app was open',
        });
      }
      /* the saved portfolio vanished while the app was open (site data cleared): that was a clear, not a replacement, so forget the old fingerprint; otherwise the next start would call the default plan a replaced portfolio */ let t =
        JSON.stringify(DG);
      while (t.length > 30000 && (DG.ev.length > 5 || DG.act.length > 3)) {
        if (DG.ev.length > 5) DG.ev.shift();
        else DG.act.shift();
        t = JSON.stringify(DG);
      }
      localStorage.setItem(DGKEY, t);
    } catch (e) {}
  };
  const trimStack = (s) =>
    String(s || '')
      .split('\n')
      .slice(0, 5)
      .map((l) => l.split(location.origin).join('').trim().slice(0, 160))
      .join('\n');
  function logEv(k, m, s) {
    /* the event ring: last 60 { t, k (kind), m (short message), s (stack, trimmed) } */
    try {
      m = String(m == null ? '' : m).slice(0, 200);
      const last = DG.ev[DG.ev.length - 1];
      if (/^(error|unhandledrejection|sw|storage)$/.test(k)) ERRN++;
      if (last && last.k === k && last.m === m && NOW() - last.t < 30000) {
        last.n = (last.n || 1) + 1;
        last.t = NOW();
      } else {
        DG.ev.push({ t: NOW(), k, m, s: s ? trimStack(s) : undefined });
        if (DG.ev.length > 60) DG.ev.splice(0, DG.ev.length - 60);
      }
      dgSave();
      if (STARTED && /^(error|unhandledrejection|sw|storage)$/.test(k)) scheduleMonitor();
    } catch (e) {}
  }
  window.addEventListener('error', (e) => {
    const m = String((e && e.message) || '');
    if (/ResizeObserver loop/.test(m)) return;
    logEv(
      'error',
      m + (e && e.filename ? ' @ ' + String(e.filename).split('/').pop() + ':' + e.lineno : ''),
      e && e.error && e.error.stack,
    );
  });
  window.addEventListener('unhandledrejection', (e) => {
    const r = e && e.reason;
    logEv('unhandledrejection', r && r.message ? r.message : String(r), r && r.stack);
  });
  let USED = false;
  ['pointerdown', 'keydown', 'input', 'touchstart'].forEach((n) =>
    document.addEventListener(
      n,
      () => {
        USED = true;
      },
      true,
    ),
  ); /* the person has touched the page: from then on the app never reloads itself */
  /* ---------- build stamp: engine.js, info.js, app.js and style.css each carry the same short hash of all four (stamp.py). If they differ, this page is running MIXED versions
     (for example a new app.js with an old cached engine.js): purge the caches, remove the service worker and reload ONCE, before anything is read or written. ---------- */
  const BLD = window.__BUILD || {},
    HEALKEY = 'rep-v4-heal';
  const STAMPS = {
    engine: BLD.engine || '',
    info: BLD.info || '',
    app: BLD.app || '',
    css: (() => {
      try {
        return String(getComputedStyle(document.documentElement).getPropertyValue('--build') || '').replace(
          /["'\s]/g,
          '',
        );
      } catch (e) {
        return '';
      }
    })(),
  };
  const STAMP_OK =
    !!STAMPS.app && STAMPS.engine === STAMPS.app && STAMPS.info === STAMPS.app && STAMPS.css === STAMPS.app;
  const healTried = () => {
    try {
      const t = +sessionStorage.getItem(HEALKEY);
      return !!t && NOW() - t < 600000;
    } catch (e) {
      return true;
    }
  }; /* one automatic reload per 10 minutes per tab: never a loop */
  let reloading = false;
  function healReload() {
    try {
      sessionStorage.setItem(HEALKEY, String(NOW()));
    } catch (e) {}
    try {
      const a = document.getElementById('app');
      if (a) a.textContent = 'Updating the app…';
    } catch (e) {}
    const done = () => {
      if (reloading) return;
      reloading = true;
      try {
        location.reload();
      } catch (e) {}
    };
    const p1 =
      window.caches && caches.keys
        ? caches.keys().then((ks) => Promise.all(ks.map((k) => caches.delete(k))))
        : Promise.resolve();
    const p2 =
      navigator.serviceWorker && navigator.serviceWorker.getRegistrations
        ? navigator.serviceWorker.getRegistrations().then((rs) => Promise.all(rs.map((r) => r.unregister())))
        : Promise.resolve();
    Promise.all([p1.catch(() => {}), p2.catch(() => {})]).then(done, done);
    setTimeout(done, 2500);
  }
  let MIXED = false;
  if (!STAMP_OK) {
    const why =
      'engine ' +
      (STAMPS.engine || 'none') +
      ', info ' +
      (STAMPS.info || 'none') +
      ', app ' +
      (STAMPS.app || 'none') +
      ', css ' +
      (STAMPS.css || 'none');
    if (!healTried()) {
      logEv(
        'heal',
        'mixed versions (' + why + '): purging caches, removing the service worker, reloading once',
      );
      healReload();
      return;
    }
    MIXED = true;
    logEv('heal', 'still mixed after one reload (' + why + '): not reloading again');
  }

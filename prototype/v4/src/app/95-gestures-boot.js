  /* ---------- touch gestures: swipe right from the left edge = back; swipe down = close the keyboard ---------- */
  function swipeBack() {
    if (infoKey) {
      closeInfo();
      return;
    }
    if (exEdit && routeOf() === 'add' && !UI.addOwned) {
      exBack();
      return;
    }
    if (!routeOf()) return;
    if (navSeen > 0 && history.length > 1) history.back();
    else goto('');
  }
  let sw = null,
    kb = null,
    pgSw = null;
  const FIELD =
    'input:not([type=range]):not([type=checkbox]):not([type=radio]):not([type=file]),textarea,select';
  document.addEventListener(
    'touchstart',
    (e) => {
      const t = e.touches[0];
      sw = null;
      kb = null;
      if (!t || e.touches.length !== 1) return;
      if (
        t.clientX <= 24 &&
        !drag &&
        !(e.target.closest && e.target.closest('input,select,textarea,[type=range],.infopop'))
      )
        sw = { x: t.clientX, y: t.clientY };
      if (!(e.target.closest && e.target.closest(FIELD))) kb = { y: t.clientY };
      pgSw =
        !routeOf() &&
        t.clientX > 24 &&
        !drag &&
        !infoKey &&
        !(
          e.target.closest &&
          (e.target.closest('input,select,textarea,[type=range],.infopop,svg.nw,.panel') ||
            (e.target.closest('.row') && !e.target.closest('.totrow')))
        )
          ? { x: t.clientX, y: t.clientY }
          : null; /* the total row is not draggable, so a sideways swipe on it still changes the page */
    },
    { passive: true },
  );
  document.addEventListener(
    'touchmove',
    (e) => {
      const t = e.touches[0];
      if (!t) return;
      if (sw && (Math.abs(t.clientY - sw.y) > 45 || drag)) sw = null;
      if (pgSw && (Math.abs(t.clientY - pgSw.y) > 45 || drag)) pgSw = null;
      const a = document.activeElement;
      if (kb && a && a.matches && a.matches(FIELD) && t.clientY - kb.y > 28 && !drag) {
        kb = null;
        a.blur();
      }
    },
    { passive: true },
  );
  document.addEventListener(
    'touchend',
    (e) => {
      const t = e.changedTouches[0];
      if (sw && t && t.clientX - sw.x > 70 && Math.abs(t.clientY - sw.y) < 45 && !drag) swipeBack();
      else if (
        pgSw &&
        t &&
        !routeOf() &&
        Math.abs(t.clientX - pgSw.x) > 70 &&
        Math.abs(t.clientY - pgSw.y) < 45 &&
        !drag
      ) {
        const i = PAGES.indexOf(page) + (t.clientX < pgSw.x ? 1 : -1);
        if (i >= 0 && i < PAGES.length) showPage(PAGES[i]);
      }
      sw = null;
      kb = null;
      pgSw = null;
    },
    { passive: true },
  );
  document.addEventListener(
    'touchcancel',
    () => {
      sw = null;
      kb = null;
      pgSw = null;
    },
    { passive: true },
  );
  app.addEventListener('keydown', (e) => {
    if (
      e.key === 'Enter' &&
      e.target.tagName === 'INPUT' &&
      !/^(checkbox|radio|file|range)$/.test(e.target.type)
    )
      e.target.blur();
  });

  window.addEventListener('storage', (e) => {
    if (!EXED || (e.key !== null && e.key !== E.EXKEY)) return;
    try {
      E.exLoad(localStorage);
    } catch (x) {}
    const a = document.activeElement;
    if (routeOf() === 'add' && !(a && a.tagName === 'INPUT')) render();
  }); /* another tab changed the example edits: read them again (validated) */
  render();
  STARTED = true;
  act('route ' + routeSafe());
  /* local-first plumbing: ask the browser to keep our data, and cache the app for offline use */
  try {
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist();
  } catch (e) {}
  /*SW*/ if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    const had = !!navigator.serviceWorker.controller;
    let rl = false,
      wait = false;
    const typing = () => {
      const a = document.activeElement;
      return !!(
        a &&
        a.matches &&
        a.matches('input:not([type=file]):not([type=checkbox]):not([type=radio]),textarea,[contenteditable]')
      );
    };
    /* a new service worker taking over reloads the page, but never while you are typing (a reload would drop the keyboard and the half-typed number): it waits until you leave the box */ const go =
      () => {
        if (rl) return;
        rl = true;
        location.reload();
      };
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (had && !rl) {
        logEv(
          'swupdate',
          'a new service worker took over: ' + (typing() ? 'reloading when you leave the box' : 'reloading'),
        );
        if (typing()) wait = true;
        else go();
      }
    });
    document.addEventListener('focusout', () => {
      if (wait)
        setTimeout(() => {
          if (wait && !typing()) go();
        }, 400);
    });
    navigator.serviceWorker
      .register('sw.js')
      .catch((e) => logEv('sw', 'register failed: ' + (e && e.message)));
  } /*ENDSW*/
  window.__app = {
    get state() {
      return S;
    },
    get renders() {
      return RN;
    },
    get softRenders() {
      return SRN;
    },
    stamps: STAMPS,
    get bootMs() {
      return DIAG_MS;
    },
    get monMs() {
      return MON_MS;
    },
    get mixed() {
      return MIXED;
    },
    check: () => {
      runMonitor();
      return ANOM.slice();
    },
    report: (nums) => makeReport(!!nums).text,
    get diag() {
      return DG;
    },
  }; /* read-only handles for the graders */

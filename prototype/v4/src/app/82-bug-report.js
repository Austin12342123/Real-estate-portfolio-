  /* ---------- anomaly monitor, notices, safety copies and the bug report. Cheap, debounced after each render, never throws; nothing leaves this device. ---------- */
  let bugDesc = '',
    bugNums = false,
    bugShown = false,
    bugText = '',
    bugMsg = '',
    safeText = null,
    ANOM = [],
    ANOMDIS = {},
    ANOMCOPIED = false,
    LASTPL = null,
    RN = 0,
    SWC = { caches: [], ctl: false },
    monTimer = null,
    MON_MS = 0,
    lastDailyChk = NOW(),
    swLogged = false;
  const fmtDT = (ts) => {
    const d = new Date(ts);
    return isNaN(d)
      ? ''
      : d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  };
  const moneyOf = (t) => {
    const m = /([−\-+])?\s*\$([\d,]+(?:\.\d+)?)\s*([MB])?/.exec(String(t || ''));
    if (!m) return NaN;
    let v = parseFloat(m[2].replace(/,/g, ''));
    if (m[3] === 'M') v *= 1e6;
    else if (m[3] === 'B') v *= 1e9;
    return m[1] === '−' || m[1] === '-' ? -v : v;
  };
  const routeSafe = () => {
    const r = routeOf();
    return r === ''
      ? 'main/' + page
      : r.startsWith('h/')
        ? 'asset/h:' + (D ? D.hash(r.slice(2)) : '')
        : r.startsWith('import/')
          ? 'import'
          : r;
  }; /* never an asset id in clear */
  const exCount = () => {
    try {
      return EXED && E.exExport ? Object.keys((E.exExport() || {}).ov || {}).length : 0;
    } catch (e) {
      return 0;
    }
  };
  function gatherChecks(full) {
    const onMain = routeOf() === '',
      ap = document.getElementById('app');
    let pl = LASTPL && LASTPL.S === S && LASTPL.rn === RN && onMain ? LASTPL.pl : null,
      kpi = [],
      domCf = NaN;
    if (!pl && full) {
      try {
        pl = PLAN(S);
      } catch (e) {
        pl = null;
      }
    }
    if (onMain && ap) {
      kpi = [...ap.querySelectorAll('[data-testid^=kpi-]')].map((n) => n.textContent);
      const tc = ap.querySelector('[data-testid=total-cf]');
      if (tc && page === 'planned') domCf = moneyOf(tc.textContent);
    }
    return {
      pl,
      cs: D.checks({
        S,
        dataV: DATA_V,
        pl,
        kpiTexts: kpi,
        domCf,
        rw: RW,
        stamps: STAMPS,
        swCaches: SWC.caches,
        replaced: !!DG.flags.replaced,
        errCount: ERRN,
      }),
    };
  }
  function envInfo() {
    let ls = true,
      ss = true;
    const keys = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.indexOf('rep-v4') === 0) keys.push([k, (localStorage.getItem(k) || '').length]);
      }
      if (IDBMODE && !keys.some((k) => k[0] === 'rep-v4-safety')) keys.push(['rep-v4-safety', JSON.stringify(safeList()).length]); /* B1: the safety copies live in IndexedDB; their size is reported under the old name */
      keys.sort((a, b) => (a[0] < b[0] ? -1 : 1));
    } catch (e) {
      ls = false;
    }
    try {
      sessionStorage.length;
    } catch (e) {
      ss = false;
    }
    let mode = 'browser';
    try {
      if ((window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone)
        mode = 'standalone';
    } catch (e) {}
    let tz = '';
    try {
      tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch (e) {}
    return {
      mode,
      ua: navigator.userAgent,
      vw: window.innerWidth,
      vh: window.innerHeight,
      dpr: window.devicePixelRatio,
      lang: navigator.language,
      tz,
      online: navigator.onLine,
      ls,
      ss,
      keys,
    };
  }
  function makeReport(nums) {
    const g = gatherChecks(true),
      pl = g.pl,
      env = envInfo(),
      codes = D.anomalies(g.cs);
    const sum = {
      numbers: nums,
      saved: SAVED.length,
      exov: exCount(),
      unit: UI.unit,
      page,
      sold: pl ? S.houses.filter((h) => pl.exits[h.id] && pl.sellAt[h.id] <= pl.planM).length : null,
      nw: pl ? pl.horizon.nw : null,
      cf: pl ? pl.horizon.cf : null,
    };
    return {
      text: D.report({
        now: NOW(),
        desc: bugDesc,
        numbers: nums,
        names: S.houses.map((h) => h.addr),
        anomalies: codes,
        build: Object.assign(
          {
            stamps: STAMPS,
            dataV: DATA_V,
            stateV: S.v,
            swCaches: SWC.caches,
            swCtl: SWC.ctl,
            routeSafe: routeSafe(),
            route: location.hash || '#',
          },
          env,
        ),
        S,
        sum,
        checks: g.cs,
        events: DG.ev,
        actions: DG.act,
      }),
      codes,
    };
  }
  /* write a text to the clipboard; if that is not allowed, say so and let the caller select the text by hand (the same fallback the backup uses) */
  function toClipboard(text, ok, fail) {
    try {
      navigator.clipboard.writeText(text).then(ok, fail);
    } catch (x) {
      fail();
    }
  }
  function copyBug() {
    bugText = makeReport(bugNums).text;
    bugShown = true;
    bugMsg = 'Copying…';
    render();
    const ta = document.getElementById('bugout'),
      fail = () => {
        bugMsg = 'Select the text above and copy it by hand.';
        const m = document.getElementById('bugmsg'),
          t2 = document.getElementById('bugout');
        if (m) m.textContent = bugMsg;
        if (t2) {
          t2.focus();
          t2.select();
        }
      };
    toClipboard(
      bugText,
      () => {
        bugMsg = 'Copied. Paste it into your Claude chat.';
        const m = document.getElementById('bugmsg');
        if (m) m.textContent = bugMsg;
      },
      fail,
    );
    void ta;
  }
  function openIssue() {
    const r = makeReport(bugNums);
    bugText = r.text;
    bugShown = true;
    bugMsg = 'Copying…';
    render();
    const title =
        'In-app bug report: ' +
        (r.codes.length
          ? r.codes.join(', ')
          : (bugNums
              ? bugDesc
              : D.scrub(
                  bugDesc,
                  S.houses.map((h) => h.addr),
                )
            )
              .replace(/\s+/g, ' ')
              .trim()
              .slice(0, 60) || 'problem'),
      u = D.issueUrl(title, bugText);
    toClipboard(
      bugText,
      () => {
        bugMsg = 'Copied. The report is also in the GitHub issue.';
        const m = document.getElementById('bugmsg');
        if (m) m.textContent = bugMsg;
      },
      () => {
        bugMsg = 'Select the text above and copy it by hand.';
        const m = document.getElementById('bugmsg'),
          t2 = document.getElementById('bugout');
        if (m) m.textContent = bugMsg;
        if (t2) {
          t2.focus();
          t2.select();
        }
      },
    );
    try {
      window.open(u.url, '_blank', 'noopener');
    } catch (e) {}
  }
  function quickCopy() {
    /* the Planned-page notice: one tap copies the report with numbers OFF */
    const text = makeReport(false).text,
      chip = document.querySelector('[data-testid=anomaly-copy]');
    toClipboard(
      text,
      () => {
        ANOMCOPIED = true;
        if (chip) chip.textContent = 'Copied. Paste it into your Claude chat.';
      },
      () => {
        bugText = text;
        bugShown = true;
        bugNums = false;
        bugMsg = 'Select the text above and copy it by hand.';
        UI.coll.report = false;
        save();
        goto('settings');
      },
    );
  }
  function restoreSafety(ts, fromBanner) {
    const it = safeList().find((x) => x.ts === +ts && x.state);
    ask = null;
    if (!it) {
      render();
      return false;
    }
    safeCopy('before restoring a safety copy');
    logEv('restore', 'restored a safety copy (' + it.reason + ')');
    setUndo({
      text:
        'Restored the safety copy from ' +
        fmtDT(it.ts) +
        '. Your previous portfolio is kept: tap Undo to bring it back.',
      label: 'previous portfolio',
      snap: JSON.stringify(S),
    });
    S = E.normalize(JSON.parse(JSON.stringify(it.state)));
    if (!S.p) S.p = E.samplePersonal();
    S.p = E.normalizePersonal(S.p);
    S.v = DATA_V;
    E.applyAdditions(S);
    S.seq = +S.seq || 0;
    selId = null;
    page = 'planned';
    prev = {};
    savedMsg = '';
    if (fromBanner) {
      delete DG.flags.replaced;
      DG.fp = D.fingerprint(S, NOW());
      dgSave();
    }
    save();
    goto('');
    render();
    window.scrollTo(0, 0);
    return true;
  }
  function safeCopyText(ts) {
    const it = safeList().find((x) => x.ts === +ts);
    if (!it) return;
    const text = it.state ? JSON.stringify(it.state) : it.raw || '';
    safeText = { ts: it.ts, text, msg: 'Copying…' };
    render();
    toClipboard(
      text,
      () => {
        safeText.msg = 'Copied.';
        const m = document.getElementById('safem');
        if (m) m.textContent = 'Copied.';
      },
      () => {
        safeText.msg = 'Select the text above and copy it by hand.';
        const m = document.getElementById('safem'),
          t2 = document.getElementById('safeout');
        if (m) m.textContent = safeText.msg;
        if (t2) {
          t2.focus();
          t2.select();
        }
      },
    );
  }
  const anomActive = () =>
    ANOM.filter(
      (c) => !ANOMDIS[c] && !(c === 'state-replaced' && DG.flags.replaced),
    ); /* the replaced banner already says it */
  const notesHtml = () => {
    let h = '';
    if (!D) return h;
    if (DG.flags.replaced) {
      const cand = D.restoreCandidate(safeList(), S);
      h += `<div class="warnbox" role="status" data-testid="replaced-note"><b>Your portfolio may have been replaced by the default plan.</b> ${cand ? 'A safety copy from ' + fmtDT(cand.ts) + ' is ready.' : 'No safety copy was found.'}<div class="chips">${cand ? '<button type="button" class="chip link" data-replaced-restore data-testid="replaced-restore">Restore my previous portfolio</button>' : ''}<button type="button" class="chip link" data-replaced-dismiss data-testid="replaced-dismiss" aria-label="Dismiss this note">Dismiss</button></div></div>`;
    }
    if (anomActive().length)
      h += `<div class="migrate" role="status" data-testid="anomaly-note"><span><button type="button" class="chip link" data-anom-copy data-testid="anomaly-copy">${ANOMCOPIED ? 'Copied. Paste it into your Claude chat.' : 'Something looked wrong. Tap to copy a bug report'}</button></span><button type="button" class="chip link" data-anom-dismiss data-testid="anomaly-dismiss" aria-label="Dismiss this note">Dismiss</button></div>`;
    return h;
  };
  /* the stale / read-only line: shown at the top of the app on EVERY page (any page can save), outside #app so no redraw touches it. Same testids and text as before; a read-only tab (another tab holds the write lock) says what to do. */
  function injectStale() {
    let el = document.getElementById('stale-host');
    if (!STALE) {
      if (el) el.remove();
      return;
    }
    const ap = document.getElementById('app');
    if (!ap || !ap.parentNode) return;
    const msg = STALEKIND === 'readonly' ? 'Close the other tab, then reload.' : 'Another tab changed your portfolio.';
    const h = `<div class="migrate" role="status" data-testid="stale-note"><span>${msg}</span><button type="button" class="chip link" data-stale-reload data-testid="stale-reload">Reload</button></div>`;
    if (!el) {
      el = document.createElement('div');
      el.id = 'stale-host';
      el.addEventListener('click', (e) => {
        if (e.target.closest && e.target.closest('[data-stale-reload]')) location.reload();
      }); /* outside #app, so the app's own click handler does not see it */
      ap.parentNode.insertBefore(el, ap);
    }
    if (el.innerHTML !== h) el.innerHTML = h;
  }
  function injectNotes() {
    injectStale();
    if (routeOf() !== '' || page !== 'planned') return;
    const ap = document.getElementById('app'),
      tabs = ap && ap.querySelector('[data-testid=page-tabs]');
    if (!tabs) return;
    const old = [...ap.querySelectorAll('[data-testid=anomaly-note],[data-testid=replaced-note]')],
      h = notesHtml();
    if (old.map((n) => n.outerHTML).join('') === h) return;
    old.forEach((n) => n.remove());
    if (h) tabs.insertAdjacentHTML('afterend', h);
  }
  function refreshSW() {
    try {
      if (!(window.caches && caches.keys)) return;
      caches
        .keys()
        .then((ks) => {
          SWC.caches = ks.filter((k) => k.indexOf('portfolio-v4') === 0);
          try {
            SWC.ctl = !!(navigator.serviceWorker && navigator.serviceWorker.controller);
          } catch (e) {}
          if (SWC.caches.length && !SWC.caches.some((k) => k.slice(-8) === STAMPS.app) && !swLogged) {
            swLogged = true;
            if (!USED && !healTried()) {
              logEv(
                'heal',
                'old service-worker cache (' +
                  SWC.caches.join(', ') +
                  ') under new files: purging caches, removing the service worker, reloading once',
              );
              healReload();
            } else
              logEv('heal', 'old service-worker cache in use (' + SWC.caches.join(', ') + '): not reloading');
          }
        })
        .catch(() => {});
    } catch (e) {}
  }
  function runMonitor() {
    monTimer = null;
    if (!D || !STARTED) return;
    try {
      const t1 = performance.now(),
        g = gatherChecks(false);
      ANOM = D.anomalies(g.cs);
      MON_MS = performance.now() - t1;
      Object.keys(ANOMDIS).forEach((c) => {
        if (ANOM.indexOf(c) < 0) delete ANOMDIS[c];
      }); /* a dismissed problem that went away and came back shows again */
      if (!DG.flags.replaced) {
        const fp = D.fingerprint(S, NOW()),
          o = DG.fp;
        if (!o || o.ids !== fp.ids || o.n !== fp.n || o.own !== fp.own || NOW() - o.ts > 3600000) {
          DG.fp = fp;
          dgSave();
        }
      } /* the last-known fingerprint: asset ids hash, counts, time */
      refreshSW();
      injectNotes();
    } catch (e) {}
  }
  function scheduleMonitor() {
    clearTimeout(monTimer);
    monTimer = setTimeout(runMonitor, 500);
  }
  /* the last 10 things the person did: button ids and routes only, never anything typed */
  let actTimer = null;
  const act = (a) => {
    if (!a) return;
    DG.act.push({ t: NOW(), a: String(a).slice(0, 60) });
    if (DG.act.length > 10) DG.act.shift();
    clearTimeout(actTimer);
    actTimer = setTimeout(dgSave, 800);
  };
  const actId = (el) => {
    try {
      const b =
          el.closest('button,[data-go],[role=button],[role=tab],[role=radio],a,summary,label,[data-row]') ||
          el,
        tid = b.getAttribute && b.getAttribute('data-testid');
      if (tid) return 'click testid:' + tid;
      const n = (b.getAttributeNames ? b.getAttributeNames() : []).filter((x) => x.indexOf('data-') === 0);
      return n.length ? 'click attr:' + n[0] : 'click tag:' + String(b.tagName || '').toLowerCase();
    } catch (e) {
      return '';
    }
  };
  document.addEventListener(
    'click',
    (e) => {
      try {
        act(actId(e.target));
      } catch (x) {}
    },
    true,
  );
  window.addEventListener('hashchange', () => act('route ' + routeSafe()));
  window.addEventListener('pagehide', dgSave);
  window.addEventListener('storage', (e) => {
    /* another tab saved the portfolio: say so now, before this page edits anything (this page's saves are skipped from here on) */
    try {
      if (e.key !== KEY || !e.newValue || e.newValue === LASTJS) return;
      const o = JSON.parse(e.newValue);
      if (o && Array.isArray(o.houses) && !STALE) {
        STALE = true;
        injectNotes();
      }
    } catch (x) {}
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) dgSave();
  });
  /* Assumptions: Safety copies and Report a problem */
  const isOpenSec = (id, def) => !(UI.coll[id] === undefined ? !!def : UI.coll[id]);
  const lazySec = (id, title, sum, fn, def) => colSec(id, title, sum, isOpenSec(id, def) ? fn() : '', def);
  const safeStats = (it) => (it.state ? statsOf({ id: 'sc' + it.ts, ts: it.ts, state: it.state }) : null);
  function safetyCard() {
    const items = safeList();
    const head = `<section class="card" data-testid="safety-card"><p class="note" style="margin:0">The app keeps its last ${D ? D.SAFE_MAX : 3} copies here, each taken just before a major change: an update, a restore, an import or a delete.${infoBtn('safety')}</p>${items.length ? '' : '<p class="note" data-testid="safety-empty">No copies yet. The first one is taken before your next change.</p>'}</section>`;
    return (
      head +
      items
        .map((it) => {
          const m = safeStats(it),
            c = D.safeInfo(it.state),
            why = it.reason.charAt(0).toUpperCase() + it.reason.slice(1);
          return `<section class="card scard" data-testid="safety-item" data-ts="${it.ts}"><b class="sname" data-testid="safety-reason">${esc(why)}</b><div class="smeta" data-testid="safety-date">${esc(fmtDT(it.ts))}</div>
        ${it.state ? `<div class="sstat"><span data-testid="safety-assets"><b>${c.n}</b> asset${c.n === 1 ? '' : 's'} (${c.planned} planned, ${c.own} bought)</span>${m ? `<span data-testid="safety-nw">Net worth <b>${$f(m.nw)}</b></span>` : ''}</div>` : '<p class="note">This copy could not be read as a portfolio, but you can copy its text.</p>'}
        ${ask === 'srest:' + it.ts ? confirmBox('Replace your working portfolio with this copy? Your current one is filed as a safety copy first, and Undo brings it back.', 'data-safe-restore-yes="' + it.ts + '" data-testid="safety-restore-confirm"', 'Yes, restore it') : `<div class="sact">${it.state ? `<button type="button" class="btn plain" data-safe-restore="${it.ts}" data-testid="safety-restore">Restore</button>` : ''}<button type="button" class="pbtn" data-safe-copy="${it.ts}" data-testid="safety-copy">Copy</button></div>`}
        ${safeText && safeText.ts === it.ts ? `<textarea readonly rows="4" id="safeout" aria-label="Safety copy text" data-testid="safety-text">${esc(safeText.text)}</textarea><p class="note" id="safem">${esc(safeText.msg)}</p>` : ''}</section>`;
        })
        .join('')
    );
  }
  function reportCard() {
    return `<section class="card scard" data-testid="report-card"><p class="note" style="margin:0">Something wrong? Copy a report and paste it into your Claude chat. This app sends nothing by itself.${infoBtn('bugreport')}</p>
      <label class="f stack"><span class="lb">What went wrong? (optional)</span><textarea rows="3" maxlength="500" data-bugdesc id="bugdesc" data-testid="bug-desc" aria-label="What went wrong" placeholder="A few words">${esc(bugDesc)}</textarea></label>
      <div class="f" style="border-top:0;min-height:36px"><span class="lb">Include my numbers</span></div><div class="seg" style="margin-top:0" role="radiogroup" aria-label="Include my numbers">${[
        ['off', 'Off'],
        ['on', 'On'],
      ]
        .map(
          ([k, l]) =>
            `<button type="button" role="radio" data-bugnum="${k}" class="${bugNums === (k === 'on') ? 'on' : ''}" aria-checked="${bugNums === (k === 'on')}" data-testid="bug-num-${k}">${l}</button>`,
        )
        .join('')}</div>
      <p class="note" data-testid="bug-num-help">${bugNums ? "On: adds net worth, cash flow and each asset's price and rent. Never addresses." : 'Off: counts and codes only. No names, addresses or dollar amounts.'}</p>
      <button type="button" class="btn" data-bugcopy data-testid="bug-copy">Copy bug report</button><button type="button" class="btn plain" data-bugissue data-testid="bug-issue">Open as GitHub issue</button>
      ${bugShown ? `<textarea readonly rows="6" id="bugout" aria-label="Bug report" data-testid="bug-text">${esc(bugText)}</textarea><p class="note" id="bugmsg" data-testid="bug-msg">${esc(bugMsg)}</p>` : ''}</section>`;
  }
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && infoKey) {
      closeInfo();
    } else if (e.key === 'Escape' && exEdit && routeOf() === 'add' && !UI.addOwned) {
      exBack();
    } else if (e.key === 'Escape' && exOpen && routeOf() === 'add') {
      exOpen = false;
      render();
      const n = app.querySelector('[data-exopen]');
      if (n) n.focus();
    }
  });
  /* keyboard shortcuts (desktop, fine pointer only; documented in the (i) on Assumptions and opened with ?) */
  window.addEventListener('keydown', (e) => {
    if (
      e.ctrlKey ||
      e.metaKey ||
      e.altKey ||
      !(window.matchMedia && window.matchMedia('(pointer:fine)').matches)
    )
      return;
    const t = e.target;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    if (infoKey && e.key !== '?') return;
    const k = e.key;
    if (k === '?') {
      if (infoKey) closeInfo();
      else {
        infoKey = 'shortcuts';
        infoIdx = -1;
        placeInfo();
      }
    } else if (k === '1' || k === '2' || k === '3') {
      page = PAGES[+k - 1];
      if (routeOf()) goto('');
      render();
    } else if (k === 'n') {
      goto('add');
    } else if (k === 'o') {
      goto('order');
    } else if (k === 'f') {
      goto('finances');
    } else if (k === ',') {
      goto('settings');
    } else return;
    e.preventDefault();
  });
  try {
    window.matchMedia('(min-width:900px)').addEventListener('change', () => {
      if (routeOf().startsWith('h/')) render();
    });
  } catch (e) {} /* desktop: the asset page moves beside or under the list */
  window.addEventListener('hashchange', () => {
    if (
      exEdit &&
      routeOf() !== 'add' &&
      !E.exDirty(E.exampleShipped(exEdit.id) || { cat: '' }, exEdit.draft, exEdit.base)
    )
      exEdit = null;
    /* an unsaved draft stays in memory until you decide */ navSeen++;
    closeInfo();
    prev = {};
    ask = null;
    pendingImport = null;
    exportOpen = false;
    notice = '';
    window.scrollTo(0, 0);
    render();
  });


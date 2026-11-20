  /* ---------- router + render ---------- */
  let prev = {};
  let inRender = false; /* a box removed by a re-render fires focusout: that is not the user leaving it */
  function render() {
    inRender = true;
    try {
      render0();
    } finally {
      inRender = false;
    }
  }
  /* A number or text box that has the focus is NEVER replaced: replacing it dismisses the phone keyboard and brings back the letter layer, even when the new box is given the focus again. So while a box in the page is focused (typing, or tapping from one box to the next) the page is redrawn "softly": the new page is built off-screen and the live page is patched to match it, node by node, leaving the focused box (and the box you just tapped) exactly as it is. A full redraw only happens when no box is focused or when the screen itself changes. */
  const syncAttrs = (a, b) => {
    [...a.attributes].forEach((x) => {
      if (!b.hasAttribute(x.name)) a.removeAttribute(x.name);
    });
    [...b.attributes].forEach((x) => {
      if (a.getAttribute(x.name) !== x.value) a.setAttribute(x.name, x.value);
    });
  };
  /* patchAround: keep the focused box and the chain of elements it sits in (label, wrapper, card ...) exactly as they are, and swap everything beside them for the freshly built page. Nothing is touched unless the new page has the same box in the same nesting (returns false, and the page simply keeps what it shows). */
  function patchAround(app, host, act) {
    const key = act.dataset && act.dataset.p;
    if (key === undefined) return false;
    const pick = (root) =>
        [...root.querySelectorAll('input[data-p],textarea[data-p]')].filter((x) => x.dataset.p === key),
      idx = pick(app).indexOf(act),
      fa = pick(host)[idx];
    if (!fa || fa.nodeName !== act.nodeName) return false;
    const lp = [],
      fp = [];
    for (let e = act; e && e !== app; e = e.parentNode) lp.unshift(e);
    for (let e = fa; e && e !== host; e = e.parentNode) fp.unshift(e);
    if (lp.length !== fp.length || lp.some((x, k) => x.nodeName !== fp[k].nodeName)) return false;
    let L = app,
      F = host;
    for (let k = 0; k < lp.length; k++) {
      const lc = lp[k],
        fc = fp[k];
      while (L.firstChild !== lc) L.removeChild(L.firstChild);
      while (lc.nextSibling) L.removeChild(lc.nextSibling);
      while (F.firstChild !== fc) L.insertBefore(F.firstChild, lc);
      while (fc.nextSibling) L.appendChild(fc.nextSibling);
      if (lc !== act) syncAttrs(lc, fc);
      L = lc;
      F = fc;
    }
    if (
      act.dataset.num !== undefined &&
      editGood &&
      editGood.p === key &&
      act.value === editGood.text &&
      fa.value !== act.value
    ) {
      act.value = fa.value;
      editGood.text = fa.value;
    } /* the box you are in, still untouched: if the number it shows changed because of the box you just left (down payment $ after a % edit), show the new number so leaving it never writes the old one back */
    return true;
  }
  let SRN = 0,
    lastSig = null;
  function render0() {
    if (txt)
      flushText(
        false,
      ); /* a pending name always lands before anything is redrawn (route change, Back, another control) */
    const route = routeOf(),
      a = document.activeElement,
      app = document.getElementById('app');
    if (selId && !H(selId)) selId = null;
    const sig = route + '|' + page + '|' + selId,
      boxFocus = !!(
        a &&
        app.contains(a) &&
        (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA') &&
        a.dataset &&
        a.dataset.p !== undefined &&
        !/^(file|checkbox|radio|button)$/.test(a.type)
      );
    let soft = boxFocus && sig === lastSig;
    const id = !soft && a && a.dataset && a.dataset.sel;
    const host = soft ? document.createElement('div') : app;
    const wide =
      route.startsWith('h/') &&
      H(route.slice(2)) &&
      window.matchMedia &&
      window.matchMedia('(min-width:900px)')
        .matches; /* desktop: the asset page opens beside the list (master-detail) */
    app.dataset.pg = wide
      ? 'md'
      : route === ''
        ? page
        : route.startsWith('h/')
          ? 'asset'
          : route.split('/')[0]; /* lets the stylesheet give Planned and Add their wide desktop layout */
    if (!soft) {
      RN++;
      app.innerHTML = '';
    }
    host.innerHTML =
      route === 'finances'
        ? finances()
        : route === 'order'
          ? orderPage()
          : route === 'add'
            ? addPage()
            : route.startsWith('import/')
              ? importPage(route.slice(7))
              : route === 'settings'
                ? settings()
                : route.startsWith('h/') && H(route.slice(2))
                  ? wide
                    ? `<div class="mdw"><div class="mdl">${main()}</div><div class="mdd" data-testid="md-detail">${house(H(route.slice(2)))}</div></div>`
                    : house(H(route.slice(2)))
                  : main();
    if (undo && (route === '' || (undo.order && (route === 'order' || route.startsWith('h/')))))
      host.insertAdjacentHTML(
        'beforeend',
        `<div class="toast" role="status" aria-live="polite" data-testid="undo-banner"><span class="tmsg">${undo.text ? esc(undo.text) : 'Removed ' + esc(undo.label) + '.'}</span><button class="chip link" data-undo>Undo</button><button class="tx" data-undo-dismiss aria-label="Dismiss this message">×</button></div>`,
      ); /* a floating note that never moves the page; it goes away by itself after 10 seconds */
    if (route.startsWith('h/') && !UI.seenLegend) {
      UI.seenLegend = true;
      save();
    }
    if (soft) {
      app.querySelectorAll('.chint').forEach((n) => n.remove());
      if (patchAround(app, host, a)) SRN++;
      else {
        RN++;
        soft = false;
        app.innerHTML = '';
        while (host.firstChild) app.appendChild(host.firstChild);
      }
    } /* the new screen has no such box (the editor closed, a section went away): a full redraw, as before */
    if (id) {
      const el = app.querySelector(`[data-sel="${id}"]`);
      if (el) el.focus();
    }
    lastSig = sig;
    if (wide)
      app
        .querySelectorAll('.mdl [data-row="' + route.slice(2) + '"]')
        .forEach((el) => el.classList.add('cur'));
    placeHint();
    placeInfo();
    const cur = {};
    app.querySelectorAll('[data-k]').forEach((el) => {
      const k = el.dataset.k,
        v = el.tagName === 'INPUT' ? el.value : el.textContent;
      cur[k] = v;
      if (k in prev && prev[k] !== v && el !== document.activeElement)
        (el.closest('label,.kpi,tr') || el).classList.add('flash');
    });
    prev = cur;
    scheduleMonitor();
  }

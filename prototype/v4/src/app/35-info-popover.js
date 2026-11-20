  const GL = (window.Info && window.Info) || { INFO: {}, LABEL: {}, LOAN: {} },
    INFO = GL.INFO;
  const infoBtn = (k) =>
    INFO[k]
      ? `<button type="button" class="info" data-info="${k}" aria-expanded="false" aria-label="What does ${(INFO[k].t || '').replace(/"/g, '')} mean?"><span aria-hidden="true">i</span></button>`
      : '';
  /* (i) help: a small non-modal popover, opened only by a click or tap on an (i). It is a fixed-position element on <body> (never clipped by an ancestor), no dimming, no button, no focus trap. */
  let infoKey = null,
    infoIdx = -1;
  const closeInfo = () => {
    infoKey = null;
    infoIdx = -1;
    const e = document.getElementById('infopop');
    if (e) e.remove();
    document.querySelectorAll('[data-info][aria-expanded=true]').forEach((b) => {
      b.setAttribute('aria-expanded', 'false');
      b.removeAttribute('aria-describedby');
    });
  };
  const placeInfo = () => {
    if (!infoKey) return;
    const d = INFO[infoKey];
    if (!d) {
      closeInfo();
      return;
    }
    const anchor = infoIdx >= 0 ? app.querySelectorAll(`[data-info="${infoKey}"]`)[infoIdx] : null;
    if (infoIdx >= 0 && !anchor) {
      closeInfo();
      return;
    }
    let pop = document.getElementById('infopop');
    if (!pop || pop.dataset.key !== infoKey) {
      if (pop) pop.remove();
      pop = document.createElement('div');
      pop.id = 'infopop';
      pop.className = 'infopop';
      pop.setAttribute('role', 'note');
      pop.setAttribute('data-testid', 'info-pop');
      pop.setAttribute('aria-labelledby', 'infot');
      pop.dataset.key = infoKey;
      pop.innerHTML = `<h3 id="infot">${esc(d.t)}</h3><p>${esc(d.b)}</p>${d.e ? `<p class="eg"><b>Example:</b> ${esc(d.e)}</p>` : ''}`;
      document.body.appendChild(pop);
    }
    document.querySelectorAll('[data-info][aria-expanded=true]').forEach((b) => {
      if (b !== anchor) {
        b.setAttribute('aria-expanded', 'false');
        b.removeAttribute('aria-describedby');
      }
    });
    if (anchor) {
      anchor.setAttribute('aria-expanded', 'true');
      anchor.setAttribute('aria-describedby', 'infopop');
    }
    const vw = document.documentElement.clientWidth,
      vh = window.innerHeight,
      g = Math.max(
        16,
        parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--gpage')) || 0,
      ),
      w = Math.min(340, vw - 2 * g);
    pop.style.width = w + 'px';
    pop.style.maxHeight = vh - 2 * g + 'px';
    const h = pop.offsetHeight;
    let left, top;
    if (anchor) {
      const r = anchor.getBoundingClientRect();
      left = r.left + r.width / 2 - w / 2;
      top = r.bottom + 8;
      if (top + h > vh - g && r.top - 8 - h >= g) top = r.top - 8 - h;
    } else {
      left = (vw - w) / 2;
      top = g;
    }
    pop.style.left = Math.max(g, Math.min(left, vw - w - g)) + 'px';
    pop.style.top = Math.max(g, Math.min(top, vh - h - g)) + 'px';
  };
  window.addEventListener('resize', () => placeInfo());
  window.addEventListener('scroll', () => placeInfo(), { passive: true });
  document.addEventListener(
    'click',
    (e) => {
      if (
        infoKey &&
        e.target &&
        e.target.closest &&
        !e.target.closest('#infopop') &&
        !e.target.closest('[data-info]')
      )
        closeInfo();
    },
    true,
  );
  const esc = (s) =>
    String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);


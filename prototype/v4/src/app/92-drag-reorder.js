  /* ---------- reorder: Move up/down buttons and press-and-hold drag. List order = buy order; the trust funds each asset from everything before it, so nothing needs relinking. ---------- */
  let lastDragEnd = 0,
    drag = null,
    press = null,
    navSeen = 0;
  const visibleIds = (h0) => {
    const pl = E.plan(S);
    return S.houses
      .filter(
        (x) =>
          (x.type || 'house') === (h0.type || 'house') &&
          (x.status === 'owned') === (h0.status === 'owned') &&
          !(pl.exits[x.id] && pl.sellAt[x.id] <= pl.planM),
      )
      .map((x) => x.id);
  }; /* the rows of one list: same kind of asset, bought or planned */
  function moveBy(id, d) {
    const h = H(id);
    if (!h) return;
    const vis = visibleIds(h),
      i = vis.indexOf(id),
      j = i + d;
    if (i < 0 || j < 0 || j >= vis.length) return;
    const before = JSON.stringify(S);
    [vis[i], vis[j]] = [vis[j], vis[i]];
    E.reorder(S, vis);
    setUndo({
      text: 'Moved ' + h.addr + ' ' + (d < 0 ? 'up' : 'down') + '. Every number below it is updated.',
      label: h.addr,
      snap: before,
      order: true,
    });
    save();
    render();
    const nb =
      app.querySelector(`[data-move="${id}:${d}"]`) || app.querySelector(`[data-move="${id}:${-d}"]`);
    if (nb && !nb.disabled) nb.focus();
  }
  const LONG = 400;
  const clearPress = () => {
    document.querySelectorAll('.rw.pressing').forEach((el) => el.classList.remove('pressing'));
  }; /* the 'about to lift' tint */
  function startDrag() {
    if (!press) return;
    const row = press.el,
      wrap = row.closest('.rw'),
      body = wrap && wrap.parentElement;
    if (!body) {
      press = null;
      return;
    }
    app.classList.add('dragmode'); /* open panels fold away so every row is the same size while it moves */
    const items = [...body.children].filter((c) => c.classList && c.classList.contains('rw')),
      sy = window.scrollY;
    const rects = items.map((el) => ({ el, top: el.getBoundingClientRect().top + sy, h: el.offsetHeight })),
      idx = items.indexOf(wrap);
    drag = {
      id: press.id,
      items,
      rects,
      idx,
      to: idx,
      h: rects[idx].h,
      off: press.y + sy - rects[idx].top,
      y: press.y,
      wrap,
    };
    clearPress();
    wrap.classList.add('lift');
    try {
      row.setPointerCapture(press.pid);
    } catch (e) {}
    if (body.classList.contains('ordlist')) {
      drag.line = document.createElement('div');
      drag.line.className = 'dropline';
      drag.line.setAttribute('data-testid', 'drop-line');
      drag.bodyTop = body.getBoundingClientRect().top + sy;
      body.appendChild(drag.line);
    } /* the drop indicator: a line where the row will land */
    selId = null;
    ask = null;
    press = null;
    dragLoop();
  }
  function dragUpdate() {
    const d = drag;
    if (!d) return;
    const sy = window.scrollY,
      first = d.rects[0].top,
      last = d.rects[d.rects.length - 1].top + d.rects[d.rects.length - 1].h - d.h;
    const top = Math.min(last, Math.max(first, d.y + sy - d.off));
    d.wrap.style.transform = `translateY(${top - d.rects[d.idx].top}px)`;
    const c = d.y + sy;
    let to = 0;
    /* where the finger is, not the dragged row's centre: rows differ in height, so a taller row could never pass a shorter one above it */ d.rects.forEach(
      (r, j) => {
        if (j !== d.idx && r.top + r.h / 2 < c) to++;
      },
    );
    d.to = to;
    if (d.line)
      d.line.style.top = (to > d.idx ? d.rects[to].top + d.rects[to].h : d.rects[to].top) - d.bodyTop + 'px';
    d.rects.forEach((r, j) => {
      if (j === d.idx) return;
      const sh = d.idx < to && j > d.idx && j <= to ? -d.h : d.idx > to && j >= to && j < d.idx ? d.h : 0;
      r.el.style.transform = sh ? `translateY(${sh}px)` : '';
    });
  }
  function dragLoop() {
    if (!drag) return;
    const z = 90,
      y = drag.y,
      H0 = window.innerHeight;
    let v = 0;
    if (y < z) v = -Math.min(18, (z - y) / 4);
    else if (y > H0 - z) v = Math.min(18, (y - (H0 - z)) / 4);
    if (v) window.scrollBy(0, v);
    dragUpdate();
    drag.raf = requestAnimationFrame(dragLoop);
  }
  function endDrag(commit) {
    const d = drag;
    drag = null;
    press = null;
    if (!d) return;
    cancelAnimationFrame(d.raf);
    d.items.forEach((el) => {
      el.style.transform = '';
      el.classList.remove('lift');
    });
    app.classList.remove('dragmode');
    lastDragEnd = Date.now();
    if (commit && d.to !== d.idx) {
      const ids = d.items.map((el) => el.dataset.rw),
        before = JSON.stringify(S),
        mv = H(d.id);
      ids.splice(d.to, 0, ids.splice(d.idx, 1)[0]);
      if (E.reorder(S, ids))
        setUndo({
          text: 'Moved ' + (mv ? mv.addr : 'an asset') + '. Every number below it is updated.',
          label: mv ? mv.addr : 'asset',
          snap: before,
          order: true,
        });
      save();
    }
    render();
  }
  app.addEventListener('pointerdown', (e) => {
    if (drag) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const row = e.target.closest && e.target.closest('.row[data-row]');
    if (!row || row.hasAttribute('data-nodrag') || e.target.closest('select,input,textarea,a,[data-info]'))
      return;
    if (row.hasAttribute('data-handle') && !e.target.closest('.draghandle')) return;
    if (row.classList.contains('ord') && e.target.closest('button:not(.draghandle),label'))
      return; /* Buy order rows: hold anywhere on the row, except on its own buttons and box */
    clearTimeout(press && press.timer);
    clearPress();
    press = {
      id: row.dataset.row,
      el: row,
      x: e.clientX,
      y: e.clientY,
      pid: e.pointerId,
      mouse: e.pointerType === 'mouse' && row.classList.contains('ord'),
    };
    press.timer = setTimeout(startDrag, LONG);
    if (row.classList.contains('ord')) row.closest('.rw').classList.add('pressing');
  });
  document.addEventListener('pointermove', (e) => {
    if (drag) {
      drag.y = e.clientY;
      dragUpdate();
      return;
    }
    if (press && press.mouse && e.buttons & 1 && Math.hypot(e.clientX - press.x, e.clientY - press.y) > 4) {
      clearTimeout(press.timer);
      startDrag();
      drag.y = e.clientY;
      dragUpdate();
      return;
    } /* a mouse on the Buy order page drags at once: no hold needed */
    if (press && Math.hypot(e.clientX - press.x, e.clientY - press.y) > 10) {
      clearTimeout(press.timer);
      press = null;
      clearPress();
    }
  });
  const pend = (commit) => (e) => {
    if (drag) {
      if (e.type === 'pointerup') {
        drag.y = e.clientY;
        dragUpdate();
      }
      endDrag(commit);
    } else if (press) {
      clearTimeout(press.timer);
      press = null;
      clearPress();
    }
  };
  document.addEventListener('pointerup', pend(true));
  document.addEventListener('pointercancel', pend(false));
  document.addEventListener(
    'touchmove',
    (e) => {
      if (drag && e.cancelable) e.preventDefault();
    },
    { passive: false },
  ); /* iOS: stop the page scrolling under the dragged row */
  app.addEventListener('contextmenu', (e) => {
    if (e.target.closest && e.target.closest('.row[data-row]')) e.preventDefault();
  });


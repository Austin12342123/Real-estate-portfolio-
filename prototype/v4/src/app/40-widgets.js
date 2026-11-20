  /* ---------- reusable bits ---------- */
  const lblOf = (label, info) => {
    const ib = infoBtn(info),
      m = /^([\s\S]*\S)\s+(\S+)$/.exec(label);
    return m
      ? m[1] + ' <span class="nw">' + m[2] + ib + '</span>'
      : '<span class="nw">' + label + ib + '</span>';
  }; /* the last word and its (i) never split across lines */
  /* the keyboard a number box asks for. Dollar boxes (and boxes that can go below zero) keep the text keyboard: the number pad has no * / + - for math like 650*3 and no minus on iOS. Every other box (months, buy position, counts, percents, rates, years, hours, ratios) never needs math, so it opens the number pad: numeric (no point) for whole numbers, decimal for the rest. */
  const imFor = (p, pre) =>
    pre === '$' || /\.(growth|gain|raise)$/.test(p) || p === 'g.appr'
      ? 'text'
      : /\.(buyIn|wait|paid|mat|payoff|capexMonths|exitMonth|pos|units|end|start|month|operating|rentCount)$/.test(
            p,
          )
        ? 'numeric'
        : 'decimal';
  const field = (label, p, val, o = {}) =>
    `<label class="f ${o.calc ? 'calc' : ''}"><span class="lb">${lblOf(label, o.info || GL.LABEL[label])}${o.calc ? ' <i class="auto">auto</i>' : ''}${o.date ? `<small class="dh" data-testid="date-hint" data-dh="${p}" data-m="${isFinite(+val) && String(val) !== '' ? Math.round(+val) : ''}">${isFinite(+val) && String(val) !== '' ? (+val <= 0 ? 'today (' + dt(0) + ')' : 'on ' + dt(+val)) : 'no date yet'}</small>` : ''}</span><span class="iw">${o.pre ? `<em>${o.pre}</em>` : ''}<input inputmode="${o.ro ? 'decimal' : imFor(p, o.pre)}" ${o.ro ? '' : `data-num="1" data-pre="${esc(o.pre || '')}" data-suf="${esc(o.suf || '')}" ${o.per ? 'data-per="1"' : ''} enterkeyhint="done" autocapitalize="off" autocorrect="off" spellcheck="false"`} data-p="${p}" data-k="${p}" aria-label="${esc(label)}" ${o.ro ? 'readonly tabindex="-1"' : ''} ${o.ph ? 'placeholder="' + esc(o.ph) + '"' : ''} value="${val}">${o.suf ? `<em>${o.suf}</em>` : ''}</span></label>`;
  const kpiLbl = (label, ib) => {
    const m = /^([\s\S]*\S)\s+(\S+)$/.exec(label);
    return m
      ? m[1] + ' <span class="nw">' + m[2] + ib + '</span>'
      : '<span class="nw">' + label + ib + '</span>';
  }; /* the last word and its (i) never split across lines */
  const CAPW = {
    good: 'Good',
    ok: 'Okay',
    low: 'Low',
  }; /* the word is always shown: the colour is never the only signal */
  const capChip = (h, cap) => {
    const k = E.capKind(h),
      v = E.capVerdict(k, cap);
    return v
      ? `<span class="capv capv-${v}" data-testid="cap-verdict" data-verdict="${v}" data-kind="${k}"><span aria-hidden="true">●</span> ${CAPW[v]}</span> `
      : '';
  };
  const kpi = (id, label, val, sub, cls, sm, alt, pe) =>
    `<div class="kpi ${sm ? 'sm' : ''}"><small>${kpiLbl(label, infoBtn(GL.LABEL[label]))}</small><b class="${cls || ''}" data-testid="${id}" data-k="${id}"${pe ? ' data-plan-end="' + pe + '"' : ''}>${val}</b>${sub ? `<span class="sub">${sub}</span>` : ''}${alt ? `<span class="alt" data-testid="alt-${id}">${alt}</span>` : ''}</div>`;
  const altLbl = () => (isToday() ? 'future dollars' : "today's dollars");

  const CDEF = {};
  const colSec = (id, title, sum, inner, defCollapsed) => {
    CDEF[id] = !!defCollapsed;
    const open = !(UI.coll[id] === undefined ? !!defCollapsed : UI.coll[id]);
    return `<div class="sec cs" data-coll="${id}" role="button" tabindex="0" aria-expanded="${open}"><span>${title}</span><span class="cx">${open ? 'Hide ▾' : esc(sum) + ' ▸'}</span></div>${open ? inner : ''}`;
  };
  const confirmBox = (msg, yesAttr, yesLabel) =>
    `<div class="confirm" role="alertdialog"><p>${msg}</p><button class="btn danger" ${yesAttr}>${yesLabel}</button><button class="btn plain" data-ask-cancel>Cancel</button></div>`;

  /* ---------- plan visuals ---------- */
  function timeline(pl) {
    const steps = pl.rows.filter((x) => H(x.id));
    if (!steps.length)
      return '<p class="note">No planned assets yet. Add one and the trust works out when it can pay for it.</p>';
    const fin = steps.filter((x) => x.ok).map((x) => x.end),
      max = Math.max(12, ...fin) * 1.06,
      pc = (m) => (m / max) * 100;
    const ys = max <= 60 ? 1 : max <= 120 ? 2 : 5,
      tk = [];
    for (let y = 0; y * 12 <= max; y += ys) tk.push(y);
    const grid = tk
      .map((y) => `<i class="tk" style="left:${pc(y * 12)}%"><span>${y ? y + 'y' : 'Now'}</span></i>`)
      .join('');
    const rows = steps
      .map((x) => {
        const h = H(x.id),
          tr = pl.trust[x.id];
        return `<div class="tr" data-go="h/${h.id}"><div class="tl">${esc(h.addr)}</div><div class="trk">${grid}${x.ok ? `<span class="seg2 pl" style="left:0%;width:${Math.max(1.5, pc(x.end))}%"></span><span class="dot" style="left:${pc(x.end)}%"></span>` : '<span class="nr">not reachable</span>'}</div>
      <div class="tm">${x.ok ? `${tr && tr.pooled ? 'the trust can pay at' : 'paid from your savings + job money at'} <b>${mond(x.end)}</b>${tr && tr.pooled ? ` · pool of ${tr.n} asset${tr.n === 1 ? '' : 's'}` : ''}${tr && tr.held ? ` · held until your date, ${mond(tr.buyIn)}` : ''}` : 'the trust cannot pay for it within 50 years'}</div></div>`;
      })
      .join('');
    return `<div class="tlw" data-testid="timeline">${rows}</div><p class="note">Every bar and dot counts months from today: ● = the month the trust (everything above it in the list) can pay for it. Assets are never funded before the ones above them. Tap a row to edit.</p>`;
  }
  function nwChart(pl) {
    const T = Math.max(12, Math.min(pl.T, pl.planM)),
      s = pl.series.nw.slice(0, T + 1);
    /* the Planned page covers the planned assets only: take the bought assets' equity out of the curve */
    if (S.houses.some((h) => h.status === 'owned'))
      for (let t = 0; t <= T; t++)
        s[t] -= pl
          .assetsAt(t)
          .filter((x) => S.houses.some((q) => q.id === x.id && q.status === 'owned'))
          .reduce((a, x) => a + x.equity, 0);
    const W = 340,
      Hh = 170,
      pad = 10,
      min = Math.min(0, ...s),
      max = Math.max(1, ...s);
    const x = (t) => pad + (t / T) * (W - 2 * pad),
      y = (v) => Hh - 24 - ((v - min) / (max - min || 1)) * (Hh - 44);
    const step = Math.max(1, Math.ceil(T / 160));
    let d = '';
    for (let t = 0; t <= T; t += step) d += (d ? 'L' : 'M') + x(t).toFixed(1) + ' ' + y(s[t]).toFixed(1);
    d += 'L' + x(T).toFixed(1) + ' ' + y(s[T]).toFixed(1);
    const ys = T <= 60 ? 1 : T <= 120 ? 2 : T <= 240 ? 5 : 10;
    let ticks = '';
    for (let yr = 0; yr * 12 <= T; yr += ys)
      ticks += `<text x="${x(yr * 12)}" y="${Hh - 8}" text-anchor="${yr === 0 ? 'start' : 'middle'}">${yr ? yr + 'y' : 'Now'}</text>`;
    const buyList = S.houses.filter(
      (h) => isFinite(pl.purchase[h.id]) && pl.purchase[h.id] > 0 && pl.purchase[h.id] <= T,
    );
    const buys = buyList
      .map(
        (h) =>
          `<circle cx="${x(pl.purchase[h.id])}" cy="${y(s[pl.purchase[h.id]])}" r="4.5" class="buy"><title>${esc(h.addr)} funded ${at(pl.purchase[h.id])}</title></circle>`,
      )
      .join('');
    const ev = buyList.map((h) => pl.purchase[h.id] + ':' + h.addr.replace(/[|:]/g, ' ')).join('|');
    return `<div class="chartwrap"><svg class="nw" data-testid="networth-chart" viewBox="0 0 ${W} ${Hh}" data-w="${W}" data-h="${Hh}" data-pad="${pad}" data-t="${T}" data-min="${min}" data-max="${max}" data-nw="${s.map((v) => Math.round(v)).join(',')}" data-ev="${esc(ev)}" role="img" aria-label="Net worth over time in ${UNIT()}, ${$f(s[0])} now to ${$f(s[T])} in ${mo(T)}. Hover or drag to read values.">
      <line class="ax" x1="${pad}" x2="${W - pad}" y1="${y(0)}" y2="${y(0)}"/><path class="ar" d="${d}L${x(T)} ${y(0)}L${x(0)} ${y(0)}Z"/><path class="ln" d="${d}"/>${buys}${ticks}
      <text x="${pad}" y="12">${$f(max)}</text>${min < 0 ? `<text x="${pad}" y="${y(min) - 4}">${$f(min)}</text>` : ''}
      <line class="xh" id="nwx" y1="14" y2="${Hh - 24}" x1="0" x2="0" visibility="hidden"/><circle class="hv" id="nwd" r="5.5" cx="0" cy="0" visibility="hidden"/><rect class="hit" x="0" y="0" width="${W}" height="${Hh}"/></svg>
      <div class="tip" id="nwtip" hidden></div></div><p class="note">Net worth in ${UNIT()} = value − loans − other liens − lines of credit drawn. Hover or drag across the line to read it. ● = the trust can pay for an asset.</p>`;
  }
  function nwHover(e) {
    const svg = e.target.closest && e.target.closest('svg.nw');
    if (!svg) return;
    const d = svg.dataset,
      r0 = svg.getBoundingClientRect(),
      W = +d.w,
      Hh = +d.h,
      pad = +d.pad,
      T = +d.t,
      min = +d.min,
      max = +d.max,
      sc = r0.width / W;
    const t = Math.max(0, Math.min(T, Math.round((((e.clientX - r0.left) / sc - pad) / (W - 2 * pad)) * T)));
    const v = +d.nw.split(',')[t],
      cx = pad + (t / T) * (W - 2 * pad),
      cy = Hh - 24 - ((v - min) / (max - min || 1)) * (Hh - 44);
    const ln = svg.querySelector('#nwx'),
      dot = svg.querySelector('#nwd'),
      tip = document.getElementById('nwtip');
    ln.setAttribute('x1', cx);
    ln.setAttribute('x2', cx);
    dot.setAttribute('cx', cx);
    dot.setAttribute('cy', cy);
    ln.setAttribute('visibility', 'visible');
    dot.setAttribute('visibility', 'visible');
    const hit = (d.ev || '')
      .split('|')
      .map((q) => q.split(':'))
      .filter((q) => q[0] && +q[0] === t)
      .map((q) => q[1]);
    tip.innerHTML = `<b>${$f(v)}</b><span>${t === 0 ? 'today' : 'in ' + mm(t) + (t >= 24 ? ' (' + mo(t) + ')' : '')}${hit.length ? ' · funded: ' + esc(hit.join(', ')) : ''}</span>`;
    tip.hidden = false;
    const w = tip.offsetWidth,
      left = Math.min(Math.max(cx * sc - w / 2, 0), r0.width - w);
    tip.style.left = left + 'px';
    tip.style.top = Math.max(cy * sc - tip.offsetHeight - 12, 0) + 'px';
  }
  function nwLeave(e) {
    const svg = e.target && e.target.closest && e.target.closest('svg.nw');
    if (!svg) return;
    ['#nwx', '#nwd'].forEach((q) => svg.querySelector(q).setAttribute('visibility', 'hidden'));
    const tip = document.getElementById('nwtip');
    if (tip) tip.hidden = true;
  }


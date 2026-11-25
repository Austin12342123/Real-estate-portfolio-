  /* ---------- Saved page: portfolios kept on this device ---------- */
  const savedMemo = new Map();
  const statsOf = (rec) => {
    const k = rec.id + ':' + rec.ts + ':' + UI.unit;
    let m = savedMemo.get(k);
    if (!m) {
      try {
        const st = E.normalize(JSON.parse(JSON.stringify(rec.state)));
        if (!st.p) st.p = E.samplePersonal();
        st.p = E.normalizePersonal(st.p);
        const p = E.plan(st),
          q = E.realPlan(st, p),
          pf = UI.unit === 'future' ? p : q,
          pa = UI.unit === 'future' ? q : p;
        m = {
          n: st.houses.length,
          nw: pf.horizon.nw,
          cf: pf.horizon.cf,
          nwA: pa.horizon.nw,
          cfA: pa.horizon.cf,
          yrs: Math.round(p.planM / 12),
        };
        savedMemo.set(k, m);
      } catch (e) {
        m = null;
      }
    }
    return m;
  };
  function savedPage(pl) {
    const th = pl.horizon,
      yrs = Math.round(pl.planM / 12),
      nm = (id) => {
        const x = SAVED.find((q) => q.id === id);
        return x ? x.name : '';
      };
    const form =
      ask === 'save'
        ? `<div class="confirm" data-testid="save-form" role="group" aria-label="Save current portfolio"><label class="f"><span class="lb">Name</span><span class="iw"><input type="text" data-saved-name autocorrect="on" autocapitalize="words" spellcheck="true" autocomplete="off" enterkeyhint="done" data-testid="save-name" maxlength="60" aria-label="Name for this saved portfolio" value="${esc(saveName)}"></span></label><button class="btn" data-save-yes data-testid="save-confirm">Save</button><button class="btn plain" data-ask-cancel>Cancel</button></div>`
        : `<button class="btn" data-save-open data-testid="save-current">Save current portfolio</button>`;
    const cards = SAVED.map((rec) => {
      const m = statsOf(rec),
        id = rec.id,
        d = new Date(rec.ts);
      return `<section class="card scard" data-testid="saved-card" data-sid="${id}">
        ${ask === 'ren:' + id ? `<label class="f"><span class="lb">Name</span><span class="iw"><input type="text" data-renamed-name autocorrect="on" autocapitalize="words" spellcheck="true" autocomplete="off" enterkeyhint="done" data-testid="rename-input" maxlength="60" aria-label="New name" value="${esc(renameName)}"></span></label><button class="btn" data-ren-yes="${id}" data-testid="rename-confirm">Save name</button><button class="btn plain" data-ask-cancel>Cancel</button>` : `<b class="sname" data-testid="saved-name">${esc(rec.name)}</b>`}
        <div class="smeta" data-testid="saved-date">Saved ${isNaN(d) ? '' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
        ${m ? `<div class="sstat"><span data-testid="saved-assets"><b>${m.n}</b> asset${m.n === 1 ? '' : 's'}</span><span data-testid="saved-nw">Net worth <b>${$f(m.nw)}</b></span><span data-testid="saved-cf">Cash flow <b>${$s(m.cf)}/mo</b></span></div><div class="smeta" data-testid="saved-alt">${$f(m.nwA)} and ${$s(m.cfA)}/mo ${altLbl()}</div><div class="smeta" data-testid="saved-scope">whole portfolio (planned and bought) · numbers at year ${m.yrs}, in ${UNIT()}</div>` : '<p class="note">This saved portfolio could not be read.</p>'}
        ${ask === 'load:' + id ? confirmBox('Replace your working portfolio with “' + esc(rec.name) + '”? Tap Undo afterwards to get your current one back.', 'data-load-yes="' + id + '" data-testid="load-confirm"', 'Yes, open it') : ask === 'sdel:' + id ? confirmBox('Delete “' + esc(rec.name) + '”? This cannot be undone.', 'data-sdel-yes="' + id + '" data-testid="delete-confirm"', 'Yes, delete') : `<div class="sact"><button class="btn" data-load="${id}" data-testid="saved-open">Open</button><button class="pbtn" data-rename="${id}" data-testid="saved-rename">Rename</button><button class="pbtn" data-sdup="${id}" data-testid="saved-duplicate">Duplicate</button><button class="pbtn" data-sdel="${id}" data-testid="saved-delete">Delete</button></div>`}</section>`;
    }).join('');
    return `<div class="sec">Saved portfolios${infoBtn('saved')}</div><section class="card" data-testid="save-card"><p class="note" style="margin:4px 0 8px" data-testid="save-now">Working portfolio now (whole portfolio, planned and bought): ${S.houses.length} asset${S.houses.length === 1 ? '' : 's'} · net worth ${$f(th.nw)} · cash flow ${$s(th.cf)}/mo in year ${yrs} (${UNIT()}). The Planned and Real pages each show their own part of this.</p>${savedMsg ? `<div class="warnbox okbox" data-testid="saved-msg">${esc(savedMsg)}</div>` : ''}${form}</section>
      ${SAVED.length ? cards : '<p class="note" style="margin:8px 4px" data-testid="saved-empty">Nothing saved yet.</p>'}
      ${SAVED.length ? '<p class="note" style="margin:0 4px">Stays on this device and in your backup. Opening one replaces your portfolio; Undo brings it back.</p>' : ''}<section class="card" data-testid="clear-card"><b class="sn">Planned portfolio</b><p class="note" style="margin:4px 0 8px">${planCount()} planned asset${planCount() === 1 ? '' : 's'} in the working portfolio.</p>${ask === 'clearplan' ? clearBox() : `<button class="btn danger-o" data-clear-ask data-testid="saved-clear-plan">Remove every planned asset</button>`}</section>`; /* the saved list comes before the destructive clear-the-plan card */
  }


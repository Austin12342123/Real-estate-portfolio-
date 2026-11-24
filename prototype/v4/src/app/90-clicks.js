  app.addEventListener('click', (e) => {
    const t = e.target;
    if (t.closest('input,select,textarea,label.filebtn')) return;
    if (t.dataset.copyprompt !== undefined) {
      const m = document.getElementById('cpm');
      try {
        navigator.clipboard.writeText(PROMPT).then(
          () => {
            m.textContent = '✓ Copied. Paste it into a Claude chat.';
          },
          () => {
            m.textContent = 'Could not copy — open “Show the prompt” and copy it by hand.';
          },
        );
      } catch (x) {
        m.textContent = 'Could not copy — open “Show the prompt” and copy it by hand.';
      }
      return;
    }
    if (t.dataset.readListing !== undefined) {
      const ta = document.querySelector('[data-listing-text]');
      readListing(ta ? ta.value : '');
      return;
    }
    if (t.dataset.applyListing) {
      applyListing(t.dataset.applyListing);
      return;
    }
    const ap = t.closest('[data-autopay]');
    if (ap) {
      S.g.autoPay = ap.dataset.autopay === 'on';
      setUndo(null);
      save();
      render();
      return;
    }
    const pg = t.closest('[data-page]');
    if (pg) {
      showPage(pg.dataset.page);
      return;
    }
    const un = t.closest('[data-unit]');
    if (un) {
      UI.unit = un.dataset.unit === 'future' ? 'future' : 'today';
      save();
      render();
      return;
    }
    const oo = t.closest('[data-openon]');
    if (oo) {
      UI.openOn = PAGES.indexOf(oo.dataset.openon) >= 0 ? oo.dataset.openon : 'planned';
      save();
      render();
      return;
    }
    if (t.dataset.saveOpen !== undefined) {
      saveName = 'Portfolio ' + portNo();
      savedMsg = '';
      ask = 'save';
      render();
      const i = app.querySelector('[data-saved-name]');
      if (i) {
        i.focus();
        try {
          i.select();
        } catch (x) {}
      }
      return;
    }
    if (t.dataset.saveYes !== undefined) {
      if (doSave(saveName)) ask = null;
      render();
      return;
    }
    if (t.dataset.rename) {
      const x = SAVED.find((q) => q.id === t.dataset.rename);
      if (x) {
        renameName = x.name;
        savedMsg = '';
        ask = 'ren:' + x.id;
        render();
        const i = app.querySelector('[data-renamed-name]');
        if (i) {
          i.focus();
          try {
            i.select();
          } catch (e2) {}
        }
      }
      return;
    }
    if (t.dataset.renYes) {
      const x = SAVED.find((q) => q.id === t.dataset.renYes),
        old = x && x.name;
      if (x) {
        x.name = String(renameName).trim().slice(0, 60) || old;
        if (saveSaved()) savedMsg = 'Renamed to “' + x.name + '”.';
        else {
          x.name = old;
          savedMsg = 'Could not rename: this device has no storage space left.';
        }
      }
      ask = null;
      render();
      return;
    }
    if (t.dataset.sdup) {
      const x = SAVED.find((q) => q.id === t.dataset.sdup);
      if (x) {
        if (SAVED.length >= MAXSAVED)
          savedMsg = 'You can keep up to ' + MAXSAVED + ' saved portfolios. Delete one first.';
        else {
          SAVED.splice(SAVED.indexOf(x) + 1, 0, {
            id: newSid(),
            name: (x.name + ' (copy)').slice(0, 60),
            ts: Date.now(),
            state: JSON.parse(JSON.stringify(x.state)),
          });
          if (saveSaved()) savedMsg = 'Duplicated “' + x.name + '”.';
          else {
            SAVED.splice(SAVED.indexOf(x) + 1, 1);
            savedMsg = 'Could not duplicate: this device has no storage space left.';
          }
        }
      }
      ask = null;
      render();
      return;
    }
    if (t.dataset.sdel) {
      ask = 'sdel:' + t.dataset.sdel;
      savedMsg = '';
      render();
      return;
    }
    if (t.dataset.sdelYes) {
      const i = SAVED.findIndex((q) => q.id === t.dataset.sdelYes);
      if (i >= 0) {
        const gone = SAVED.splice(i, 1)[0];
        if (saveSaved()) savedMsg = 'Deleted “' + gone.name + '”.';
        else {
          SAVED.splice(i, 0, gone);
          savedMsg = 'Could not delete: storage is unavailable.';
        }
      }
      ask = null;
      render();
      return;
    }
    if (t.dataset.load) {
      ask = 'load:' + t.dataset.load;
      savedMsg = '';
      render();
      return;
    }
    if (t.dataset.loadYes) {
      loadSaved(t.dataset.loadYes);
      return;
    }
    if (t.dataset.addOwned !== undefined) {
      UI.addOwned = true;
      UI.addType = 'house';
      UI.addLoan = '';
      UI.addKind = 'single';
      UI.addUnits = 2;
      UI.addPack = false;
      UI.addEx = '';
      exOpen = false;
      goto('add');
      return;
    }
    const vw = t.closest('[data-view]');
    if (vw) {
      UI.view = vw.dataset.view;
      prev = {};
      save();
      render();
      return;
    }
    const ex = t.closest('[data-exit]');
    if (ex) {
      const hh = H(routeOf().slice(2));
      if (hh) {
        hh.exit = ex.dataset.exit;
        save();
        render();
      }
      return;
    }
    if (t.dataset.tab) {
      if (t.dataset.tab === 'hide') UI.open = false;
      else {
        UI.open = true;
        UI.tab = t.dataset.tab;
      }
      save();
      render();
      return;
    }
    const ib = t.closest('[data-info]');
    if (ib) {
      const key = ib.dataset.info,
        idx = [...app.querySelectorAll(`[data-info="${key}"]`)].indexOf(ib);
      if (infoKey === key && infoIdx === idx) closeInfo();
      else {
        infoKey = key;
        infoIdx = idx;
        placeInfo();
      }
      return;
    }
    if (t.dataset.addjob !== undefined) {
      const hourly = t.dataset.addjob === 'hourly';
      S.p.jobs.push(
        hourly
          ? {
              id: 'job' + Date.now().toString(36),
              name: 'Hourly job',
              kind: 'hourly',
              wage: 15,
              tips: 0,
              weeks: 50,
              hours: 25,
              raise: 0,
              tax: null,
              start: 0,
              end: null,
            }
          : {
              id: 'job' + Date.now().toString(36),
              name: 'New job',
              kind: 'salary',
              gross: 60000,
              raise: 0,
              tax: null,
              hours: 40,
              start: 0,
              end: null,
            },
      );
      S.p = E.normalizePersonal(S.p);
      save();
      render();
      return;
    }
    const jk = t.closest('[data-jobkind]');
    if (jk) {
      const [jid, kind] = jk.dataset.jobkind.split(':'),
        jb = S.p.jobs.find((q) => q.id === jid);
      if (jb) {
        jb.kind = kind;
        if (kind === 'hourly' && !(jb.wage > 0)) {
          jb.wage = 15;
          jb.hours = Math.min(jb.hours || 25, 40);
        }
        S.p = E.normalizePersonal(S.p);
        save();
        render();
      }
      return;
    }
    if (t.dataset.addplanned !== undefined) {
      S.p.planned.push({ id: 'pl' + Date.now().toString(36), name: 'New expense', amount: 10000, month: 12 });
      save();
      render();
      return;
    }
    if (t.dataset.addcap !== undefined) {
      S.p.capital.push({
        id: 'cap' + Date.now().toString(36),
        name: 'Partner or investor',
        amount: 100000,
        month: 12,
      });
      save();
      render();
      return;
    }
    if (t.dataset.dp) {
      ask = 'dp:' + t.dataset.dp;
      render();
      return;
    }
    if (t.dataset.dpYes) {
      const [kind, id] = t.dataset.dpYes.split(':'),
        key = { job: 'jobs', pl: 'planned', cap: 'capital' }[kind];
      if (key) S.p[key] = S.p[key].filter((q) => q.id !== id);
      ask = null;
      save();
      render();
      return;
    }
    if (t.dataset.add !== undefined) {
      if (E.TYPES[t.dataset.add]) {
        UI.addType = t.dataset.add;
        UI.addLoan = '';
      }
      UI.addKind = 'single';
      UI.addUnits = 2;
      UI.addPack = false;
      UI.addOwned = false;
      UI.addEx = '';
      exOpen = false;
      goto('add');
      return;
    }
    const at = t.closest('[data-addtype]');
    if (at) {
      UI.addType = at.dataset.addtype;
      UI.addLoan = '';
      UI.addEx = '';
      exOpen = false;
      render();
      return;
    }
    const ak = t.closest('[data-kind]');
    if (ak) {
      UI.addKind = ak.dataset.kind === 'multi' ? 'multi' : 'single';
      UI.addLoan = '';
      UI.addEx = '';
      exOpen = false;
      save();
      render();
      return;
    }
    const apr = t.closest('[data-preset]');
    if (apr) {
      const pk = /p$/.test(apr.dataset.preset);
      UI.addUnits = parseInt(apr.dataset.preset, 10);
      UI.addPack = pk;
      UI.addLoan = '';
      UI.addEx = '';
      save();
      render();
      return;
    }
    const apk = t.closest('[data-addpack]');
    if (apk) {
      UI.addPack = apk.dataset.addpack === '1';
      UI.addLoan = '';
      UI.addEx = '';
      save();
      render();
      return;
    }
    const hpk = t.closest('[data-pack]');
    if (hpk) {
      const hh = H(routeOf().slice(2));
      if (hh && E.isMulti(hh)) {
        hh.pack = hpk.dataset.pack === '1';
        save();
        render();
      }
      return;
    }
    const jsa = t.closest('[data-jobsaved-auto]');
    if (jsa) {
      const hj = H(jsa.dataset.jobsavedAuto);
      if (hj) {
        hj.jobSavedOverride = null;
        save();
        render();
      }
      return;
    }
    const jr = t.closest('[data-jobreset]');
    if (jr) {
      const hj = H(jr.dataset.jobreset);
      if (hj) {
        hj.jobPay = null;
        save();
        render();
      }
      return;
    }
    const lo2 = t.closest('[data-loanopen]');
    if (lo2) {
      UI.addLoanOpen = !UI.addLoanOpen;
      save();
      render();
      const n = app.querySelector('[data-loanopen]');
      if (n) n.focus();
      return;
    }
    const am = t.closest('[data-addmore]');
    if (am) {
      UI.addMore = !UI.addMore;
      save();
      render();
      const n = app.querySelector('[data-addmore]');
      if (n) n.focus();
      return;
    }
    const pk = t.closest('[data-pickloan]');
    if (pk) {
      UI.addLoan = pk.dataset.pickloan;
      UI.addEx = '';
      render();
      return;
    }
    if (EXED) {
      const ee = t.closest('[data-exedit]');
      if (ee) {
        const sx = E.exampleShipped(ee.dataset.exedit);
        if (sx) {
          const cur = Object.assign({}, E.exOverrides()[sx.id] || {});
          exEdit = { id: sx.id, draft: cur, base: Object.assign({}, cur) };
          ask = null;
          exMsg = '';
          render();
          window.scrollTo(0, 0);
          const f0 = app.querySelector('[data-testid=ex-fields] input');
          if (f0) f0.focus({ preventScroll: true });
        }
        return;
      }
      if (t.closest('[data-exback],[data-excancel]')) {
        exBack();
        return;
      }
      if (t.closest('[data-exsave]')) {
        if (!exEdit) return;
        const sx = E.exampleShipped(exEdit.id),
          ok = E.exCommit(localStorage, sx.id, exEdit.draft);
        exStoreOK = ok;
        exCloseEditor(
          ok
            ? 'Saved: “' + sx.name + '” now starts from your numbers.'
            : 'Saved for now, but this device would not keep it.',
        );
        return;
      }
      if (t.closest('[data-exreset]')) {
        ask = 'exreset';
        render();
        const n = app.querySelector('[data-testid=ex-reset-confirm]');
        if (n) {
          n.scrollIntoView({ block: 'center' });
          n.focus();
        }
        return;
      }
      if (t.closest('[data-exreset-yes]')) {
        if (!exEdit) return;
        const sx = E.exampleShipped(exEdit.id);
        exStoreOK = E.exCommit(localStorage, sx.id, {});
        exCloseEditor('Reset “' + sx.name + '” to the original numbers.');
        return;
      }
      if (t.closest('[data-exdiscard-yes]')) {
        exCloseEditor('');
        return;
      }
    }
    const exo = t.closest('[data-exopen]');
    if (exo) {
      exOpen = !exOpen;
      exMsg = '';
      render();
      const n = app.querySelector('[data-exopen]');
      if (n) n.focus();
      return;
    }
    const exp = t.closest('[data-expick]');
    if (exp) {
      const ex = E.exampleById(exp.dataset.expick);
      if (ex) {
        UI.addEx = ex.id;
        UI.addLoan = ex.loanId;
        if (ex.cat === 'multi') {
          UI.addUnits = ex.units;
          UI.addPack = !!ex.pack;
        }
        exOpen = false;
        save();
        render();
        const n = app.querySelector('[data-exopen]');
        if (n) n.focus();
      }
      return;
    }
    if (t.closest('[data-exclear]')) {
      UI.addEx = '';
      UI.addLoan = '';
      save();
      render();
      const n = app.querySelector('[data-exopen]');
      if (n) n.focus();
      return;
    }
    if (t.dataset.confirmAdd) {
      const [tp, lid] = t.dataset.confirmAdd.split('|');
      const own = !!UI.addOwned,
        mf = tp === 'house' && UI.addKind === 'multi',
        mu = Math.min(500, Math.max(2, Math.round(+UI.addUnits) || 2)),
        mp = mf && !!UI.addPack,
        ex = !own && UI.addEx ? E.exampleById(UI.addEx) : null,
        usex = ex && ex.type === tp && ex.cat === E.exCat(tp, mf),
        h = usex
          ? E.exampleAsset(ex)
          : E.newAsset(
              tp,
              lid,
              Object.assign(
                { fresh: true },
                own ? { status: 'owned', paid: 12 } : {},
                mf ? Object.assign({ kind: 'multi', units: mu, pack: mp }, E.mfDefaults(mu, mp)) : {},
              ),
            );
      UI.addEx = '';
      exOpen = false;
      UI.addKind = 'single';
      UI.addPack = false;
      UI.addOwned = false;
      E.register(S, h);
      S.houses.push(h);
      {
        const AF = UI.addF || {};
        if (AF.addr && AF.addr.trim()) h.addr = AF.addr.trim();
        if (AF.price > 0) setField('h.' + h.id + '.price', String(AF.price));
        if (AF.rent > 0)
          setField(
            'h.' + h.id + '.' + (tp === 'business' ? 'revenue' : 'rent'),
            String(tp === 'business' ? Math.round((AF.rent * 100) / Math.max(1, E.marginOf(h))) : AF.rent),
          );
        if (AF.job !== undefined && !own) h.jobPay = Math.max(0, +AF.job || 0);
        UI.addF = {};
        UI.addMore = false;
        UI.addLoanOpen = false;
      }
      UI.coll[(own ? 'cat-owned-' : 'cat-') + tp] = false;
      selId = null;
      page = own ? 'real' : 'planned';
      save();
      goto('h/' + h.id);
      return;
    }
    if (t.dataset.del) {
      ask = 'del:' + t.dataset.del;
      render();
      return;
    }
    if (t.dataset.clearAsk !== undefined) {
      ask = 'clearplan';
      render();
      return;
    }
    if (t.dataset.clearYes !== undefined) {
      clearPlanned();
      return;
    }
    if (t.dataset.delYes) {
      const gone = H(t.dataset.delYes);
      safeCopy('before removing an asset');
      logEv('removed', 'removed one asset');
      setUndo(gone ? { label: gone.addr, snap: JSON.stringify(S) } : null);
      S = E.without(S, t.dataset.delYes);
      E.relink(S);
      if (selId === t.dataset.delYes) selId = null;
      ask = null;
      save();
      goto('');
      render();
      return;
    }
    if (t.dataset.undo !== undefined) {
      if (undo) {
        logEv('undo', 'undo');
        S = E.normalize(JSON.parse(undo.snap));
        S.v = DATA_V;
        E.applyAdditions(S);
        if (undo.sid) {
          SAVED = SAVED.filter((q) => q.id !== undo.sid);
          saveSaved();
        }
        setUndo(null);
        page = 'planned';
        selId = null;
        save();
        render();
      }
      return;
    }
    if (t.dataset.migDismiss !== undefined) {
      UI.migNote = null;
      save();
      render();
      return;
    }
    if (t.dataset.undoDismiss !== undefined) {
      setUndo(null);
      render();
      return;
    }
    if (t.dataset.askCancel !== undefined) {
      ask = null;
      pendingImport = null;
      render();
      return;
    }
    if (t.dataset.hidelegend !== undefined) {
      UI.hideLegend = true;
      save();
      render();
      return;
    }
    if (t.dataset.togglepaste !== undefined) {
      UI.paste = !UI.paste;
      render();
      return;
    }
    if (D) {
      /* safety copies, the anomaly notices and the bug report */
      const sr = t.closest('[data-safe-restore]');
      if (sr) {
        ask = 'srest:' + sr.dataset.safeRestore;
        render();
        return;
      }
      const sry = t.closest('[data-safe-restore-yes]');
      if (sry) {
        restoreSafety(+sry.dataset.safeRestoreYes);
        return;
      }
      const scp = t.closest('[data-safe-copy]');
      if (scp) {
        safeCopyText(+scp.dataset.safeCopy);
        return;
      }
      const bn = t.closest('[data-bugnum]');
      if (bn) {
        bugNums = bn.dataset.bugnum === 'on';
        bugShown = false;
        render();
        return;
      }
      if (t.closest('[data-bugcopy]')) {
        copyBug();
        return;
      }
      if (t.closest('[data-bugissue]')) {
        openIssue();
        return;
      }
      if (t.closest('[data-stale-reload]')) {
        location.reload();
        return;
      }
      if (t.closest('[data-anom-copy]')) {
        quickCopy();
        return;
      }
      if (t.closest('[data-anom-dismiss]')) {
        anomActive().forEach((c) => {
          ANOMDIS[c] = 1;
        });
        ANOMCOPIED = false;
        injectNotes();
        return;
      }
      if (t.closest('[data-replaced-restore]')) {
        const cand = D.restoreCandidate(safeList(), S);
        if (cand) restoreSafety(cand.ts, true);
        return;
      }
      if (t.closest('[data-replaced-dismiss]')) {
        delete DG.flags.replaced;
        DG.fp = D.fingerprint(S, NOW());
        dgSave();
        injectNotes();
        return;
      }
    }
    const cs = t.closest('[data-coll]');
    if (cs) {
      const id = cs.dataset.coll,
        cur = UI.coll[id] === undefined ? !!CDEF[id] : UI.coll[id],
        had = document.activeElement === cs;
      UI.coll[id] = !cur;
      save();
      render();
      if (had) {
        const n = app.querySelector(`[data-coll="${id}"]`);
        if (n) n.focus();
      }
      return;
    }
    if (t.dataset.status) {
      const h = H(routeOf().slice(2)),
        was = h.status;
      h.status = t.dataset.status;
      if (h.status === 'owned' && was !== 'owned') h.boughtOn = isoToday();
      else if (h.status !== 'owned') h.boughtOn = null;
      /* the day it was marked bought */ save();
      render();
      return;
    }
    const au = t.closest('[data-arv-auto]');
    if (au) {
      const hh = H(au.dataset.arvAuto);
      if (hh && (hh.capex > 0 || hh.comp > 0)) {
        hh.arvAuto = true;
        hh.gain = null;
        hh.arv = E.autoArv(hh);
        save();
        render();
      }
      return;
    } /* Use auto: the appraisal follows the budget again */
    if (t.dataset.export !== undefined) {
      exportOpen = !exportOpen;
      if (exportOpen) {
        try {
          localStorage.setItem('rep-v4-backup', String(Date.now()));
        } catch (x) {}
      }
      render();
      return;
    }
    if (t.dataset.copybackup !== undefined) {
      const m = document.getElementById('cbm'),
        ta = document.getElementById('bkout');
      const fail = () => {
        ta.focus();
        ta.select();
        m.textContent = 'Select the text above and copy it by hand.';
      };
      try {
        navigator.clipboard.writeText(ta.value).then(() => {
          m.textContent = 'Copied.';
        }, fail);
      } catch (x) {
        fail();
      }
      return;
    }
    if (t.dataset.restoreText !== undefined) {
      const ta = document.getElementById('bkin');
      stageBackup(ta ? ta.value : '');
      return;
    }
    if (t.dataset.importYes !== undefined) {
      safeCopy('before restoring a backup');
      logEv('import', 'backup restored');
      const bk = { saved: pendingImport.saved, openOn: pendingImport.openOn, exOv: pendingImport.exOv };
      S = E.normalize(pendingImport);
      delete S.saved;
      delete S.openOn;
      delete S.exOv;
      if (EXED && bk.exOv && typeof bk.exOv === 'object') {
        try {
          exStoreOK = E.exImport(bk.exOv, localStorage);
        } catch (e2) {
          exStoreOK = false;
        }
      }
      /* an old backup without example edits leaves the ones on this device alone */ if (!S.p)
        S.p = E.samplePersonal();
      S.v = DATA_V;
      E.applyAdditions(S);
      fixOrder(S);
      if (Array.isArray(bk.saved)) {
        SAVED = cleanSaved(bk.saved);
        saveSaved();
      }
      if (PAGES.indexOf(bk.openOn) >= 0) UI.openOn = bk.openOn;
      page = UI.openOn;
      pendingImport = null;
      notice = '';
      save();
      goto('');
      render();
      return;
    }
    {
      const bt = t.closest('button') || t,
        sc = SCN.find((x) => bt.dataset[x.k] !== undefined || bt.dataset[x.k + 'Yes'] !== undefined);
      if (sc) {
        if (bt.dataset[sc.k + 'Yes'] !== undefined) loadScenario(sc);
        else {
          ask = sc.k;
          render();
        }
        return;
      }
    }
    const om = t.closest('[data-ordmove]');
    if (om) {
      const [id, d] = om.dataset.ordmove.split(':'),
        ids = E.plannedIds(S),
        i = ids.indexOf(id),
        j = i + +d;
      if (i >= 0 && j >= 0 && j < ids.length) {
        const before = JSON.stringify(S),
          hh = H(id),
          r0 = E.moveTo(S, id, j + 1);
        if (r0.changed) {
          setUndo({
            text: 'Moved ' + hh.addr + ' to #' + r0.pos + '. Every number is updated.',
            label: hh.addr,
            snap: before,
            order: true,
          });
          save();
        }
        render();
        const nb =
          app.querySelector(`[data-ordmove="${id}:${d}"]`) ||
          app.querySelector(`[data-ordmove="${id}:${-d}"]`);
        if (nb && !nb.disabled) nb.focus();
      }
      return;
    }
    const ot = t.closest('[data-ordtop]');
    if (ot) {
      const id = ot.dataset.ordtop,
        hh = H(id),
        before = JSON.stringify(S),
        r0 = E.moveTo(S, id, 1);
      if (r0.changed) {
        setUndo({
          text: 'Moved ' + hh.addr + ' to the top (#1). Every number is updated.',
          label: hh.addr,
          snap: before,
          order: true,
        });
        save();
      }
      render();
      return;
    }
    const mvb = t.closest('[data-move]');
    if (mvb) {
      const [id, d] = mvb.dataset.move.split(':');
      moveBy(id, +d);
      return;
    }
    const dpb = t.closest('[data-dup]');
    if (dpb) {
      const c = E.duplicate(S, dpb.dataset.dup);
      if (c) {
        ask = null;
        UI.coll['cat-' + (c.type || 'house')] = false;
        save();
        if (routeOf().startsWith('h/')) {
          selId = null;
          goto('h/' + c.id);
        } else {
          selId = c.id;
          page = 'planned';
          /* the copy is always planned */ render();
        }
      }
      return;
    }
    const rwEl = t.closest('[data-row]');
    if (rwEl && !t.closest('[data-go]') && !t.closest('.panel')) {
      if (Date.now() - lastDragEnd < 350) return;
      if (t.closest('[data-panel]')) {
        selId = selId === rwEl.dataset.row ? null : rwEl.dataset.row;
        ask = null;
        render();
        return;
      }
      if (!t.closest('select,input,textarea,a,[data-info],button:not(.addrbtn)')) {
        goto('h/' + rwEl.dataset.row);
        return;
      }
    }
    const go = t.closest('[data-go]');
    if (go) goto(go.dataset.go);
  });

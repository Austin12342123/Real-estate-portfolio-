  /* what a number box cannot hold: a percent in a box that is not a percent box, and a negative number where the value cannot be below zero. Returns null when the text is fine. */
  const UNITSBOX = (p) => p === 'a.add.units' || p === 'x.units' || /^h\.[^.]+\.units$/.test(p);
  const NEGOK = (p) => /\.(growth|gain|raise)$/.test(p) || p === 'g.appr';
  function boxBad(el, c) {
    const t = String(el.value),
      pct = /%/.test(t) && el.dataset.suf !== '%';
    if (pct)
      return {
        live: el.dataset.pre === '$' ? 'No % in a dollar box' : 'No % in this box',
        end: el.dataset.pre === '$' ? 'No % in a dollar box, kept' : 'No % in this box, kept',
      };
    const v = c.kind === 'plain' ? parseFloat(t.replace(/[,$%\s]/g, '')) : c.ok ? c.v : NaN;
    if (UNITSBOX(el.dataset.p) && isFinite(v) && (v !== Math.round(v) || v < 2 || v > 500))
      return {
        live: 'Use a whole number, 2 to 500',
        end: 'Use 2 to 500, kept',
      }; /* the unit count: a whole number from 2 to 500 */
    if (/^x\./.test(el.dataset.p) && exEdit && isFinite(v)) {
      const sh = E.exampleShipped(exEdit.id),
        q = sh && E.exCheck(sh.cat, el.dataset.p.slice(2), v);
      if (q && !q.ok) return { live: q.msg, end: q.msg + ', kept' };
    } /* the example editor's own ranges */
    if (v < 0 && !NEGOK(el.dataset.p)) return { live: "Can't be negative", end: "Can't be negative, kept" };
    return null;
  }
  /* a box where blank is a real answer (no end date, estimate the tax): everywhere else a blank box is not a value */
  const EMPTYOK = (p) =>
    /^j\.[^.]+\.(end|tax)$/.test(p) ||
    /^p\.(portfolioTaxPct|salesTaxPct)$/.test(p) ||
    /^h\.[^.]+\.(refiRate|refiTermY|mgmtPct|jobPay|comp|jobSavedOverride)$/.test(p) ||
    /^a\.add\.(price|rent|job)$/.test(p);
  /* whole-month boxes (dates counted in months from today, months already paid, ...): rounded to a whole number and capped at 600 months (or the plan length + 10 years when that is longer), with a 'Rounded / Capped' note */
  const MONTHSBOX = (p) =>
    /^h\.[^.]+\.(buyIn|wait|paid|mat|payoff|capexMonths|exitMonth)$/.test(p) ||
    p === 'x.capexMonths' ||
    /^[oc]\.[^.]+\.month$/.test(p) ||
    /^j\.[^.]+\.(end|start)$/.test(p);
  const POSBOX = (p) =>
    /^h\.[^.]+\.pos$/.test(
      p,
    ); /* the buy position: a whole number from 1 to the number of planned assets, moved on blur / Enter */
  const monthsCap = () => Math.max(600, Math.round((S.g.planYears || 20) * 12) + 120);
  let pendT = null;
  const clearHintDom = () => {
    clearTimeout(hintTimer);
    calcHint = null;
    document.querySelectorAll('#app .chint').forEach((n) => n.remove());
  };
  /* what a box shows when it is at rest: the number without %, $ or typed math; thousands grouped in dollar-style boxes */
  const fmtBox = (el, v, was) => {
    const t = (Math.round(v * 1e4) / 1e4).toLocaleString('en-US', {
      maximumFractionDigits: 4,
      useGrouping: el.dataset.suf !== '%' && (el.dataset.pre === '$' || /,/.test(was || '')),
    });
    return t;
  };
  const boxNum = (el, c) =>
    c.kind === 'plain' ? parseFloat(String(el.value).replace(/[,$%\s]/g, '')) : c.ok ? c.v : NaN;
  /* commit what is in the box right now, only if it is a complete valid entry for this box (never a prefix of something that turns out invalid) */
  const liveCommit = (el, quiet) => {
    const p = el.dataset.p,
      c = evalBox(el);
    if (boxBad(el, c)) return false;
    let ok = false;
    if (c.kind === 'plain') ok = setField(p, el.value);
    else if (c.ok) ok = setField(p, String(c.v));
    if (ok) {
      save();
      if (!quiet) render();
    }
    return ok;
  };
  app.addEventListener('input', (e) => {
    const d = e.target.dataset;
    if (d.bugdesc !== undefined) {
      bugDesc = e.target.value.slice(0, 500);
      return;
    }
    if (d.savedName !== undefined) {
      saveName = e.target.value;
      return;
    }
    if (d.renamedName !== undefined) {
      renameName = e.target.value;
      return;
    }
    const p = d.p;
    if (!p) return;
    if (d.num !== undefined) {
      /* a number box: the answer to complete math shows as a hint ('= 1,950'); half-typed or invalid math (650*, 5/0, 5%) changes nothing at all. The value itself lands only on blur / Enter. */
      const c = evalBox(e.target),
        bd = boxBad(e.target, c);
      clearTimeout(hintTimer);
      clearTimeout(pendT);
      if (bd) {
        calcHint = { p, text: bd.live, bad: true };
        placeHint();
        return;
      }
      if (c.kind !== 'plain' && !c.ok) {
        calcHint = { p, text: c.msg || 'Check the math', bad: true };
        placeHint();
        return;
      }
      calcHint =
        c.kind === 'plain'
          ? null
          : { p, text: c.hint || '= ' + c.v.toLocaleString('en-US', { maximumFractionDigits: 4 }) };
      const dh = e.target.closest('label') && e.target.closest('label').querySelector('.dh');
      if (dh) {
        const tv = boxNum(e.target, c);
        if (isFinite(tv) && String(e.target.value).trim() !== '') {
          const mv = Math.min(Math.round(tv), monthsCap());
          dh.textContent = mv <= 0 ? 'today (' + dt(0) + ')' : 'on ' + dt(mv);
        }
      } /* the date under a months box follows what you type (display only) */
      if (
        c.kind === 'plain' &&
        !dh &&
        !POSBOX(p) &&
        String(e.target.value).trim() !== '' &&
        isFinite(boxNum(e.target, c))
      ) {
        const el = e.target;
        pendT = setTimeout(() => {
          if (document.activeElement === el && el.dataset.p === p && setField(p, el.value)) {
            save();
            render();
          }
        }, 700);
      } /* a plain number you stop typing for a moment lands by itself so the calculated boxes beside it (down payment $, loan amount, ratios) always match what the box shows; math (650*3, 5/0) and % never land until you leave the box */
      placeHint();
      return;
    } /* nothing is committed while you type: the value lands when you leave the box or press Enter, so a half-typed prefix ('5' of '5/0') can never become the live number */
    txtInput(e.target);
  }); /* free text (names): nothing is redrawn while you type, so the keyboard's autocorrect and predictions keep working and typing stays fast */
  /* A name box keeps the SAME element while you type. The text is saved after a short pause and the page is redrawn only when you leave the box (blur / Enter / Back / another tap / leaving the app); Escape puts the old name back. */
  let txt = null,
    txtT = 0;
  const TXT_IDLE = 800;
  function txtInput(el) {
    const p = el.dataset.p;
    if (!txt || txt.el !== el) {
      flushText();
      txt = {
        p,
        el,
        orig: el._orig != null ? el._orig : el.defaultValue,
        val: el.value,
        saved: true,
        dirty: false,
      };
    }
    txt.val = el.value;
    txt.saved = false;
    clearTimeout(txtT);
    txtT = setTimeout(() => {
      if (txt && !txt.saved) {
        txt.saved = true;
        if (setField(txt.p, txt.val)) {
          txt.dirty = true;
          save();
        }
      }
    }, TXT_IDLE);
  }
  function flushText(draw) {
    clearTimeout(txtT);
    const t = txt;
    txt = null;
    if (!t) return false;
    let ch = t.dirty;
    if (!t.saved) {
      if (setField(t.p, t.val)) {
        ch = true;
        save();
      }
    }
    if (ch && draw) render();
    return ch;
  }
  app.addEventListener('focusin', (e) => {
    const el = e.target;
    if (el.tagName === 'INPUT' && el.dataset && el.dataset.p && el.dataset.num === undefined)
      el._orig = el.value;
  });
  app.addEventListener('focusout', (e) => {
    const el = e.target;
    if (inRender || !txt || txt.el !== el) return;
    const nxt = e.relatedTarget;
    flushText(false);
    if (nxt && !(nxt.dataset && nxt.dataset.p)) deferRender();
    else if (nxt) setTimeout(render, 0);
    else render();
  });
  app.addEventListener('keydown', (e) => {
    const el = e.target;
    if (
      e.key !== 'Escape' ||
      !el ||
      el.tagName !== 'INPUT' ||
      !el.dataset ||
      !el.dataset.p ||
      el.dataset.num !== undefined
    )
      return;
    const o = el._orig;
    if (o == null) return;
    e.preventDefault();
    const t = txt && txt.el === el ? txt : null;
    clearTimeout(txtT);
    txt = null;
    el.value = o;
    if (t) {
      setField(t.p, o);
      save();
    }
    el.blur();
    if (t) render();
  });
  window.addEventListener('pagehide', () => flushText(false));
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) flushText(false);
  });
  /* section headers are role=button divs, so Enter and Space must open them like a real button */
  app.addEventListener('keydown', (e) => {
    const cs = e.target.closest && e.target.closest('[data-coll][role=button]');
    if (cs && cs === e.target && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      cs.click();
    }
  });
  app.addEventListener('keydown', (e) => {
    const tb = e.target.closest && e.target.closest('[data-page]');
    if (tb && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
      const i = PAGES.indexOf(page) + (e.key === 'ArrowRight' ? 1 : -1);
      if (i >= 0 && i < PAGES.length) {
        showPage(PAGES[i]);
        const n = app.querySelector('[data-page="' + PAGES[i] + '"]');
        if (n) n.focus();
      }
    }
  });
  app.addEventListener('pointermove', nwHover);
  app.addEventListener('pointerdown', nwHover);
  app.addEventListener('pointerleave', nwLeave, true);
  app.addEventListener('pointerup', (e) => {
    if (e.pointerType === 'mouse') return;
  });
  /* leaving a number box that holds math: the box shows the answer. A half-typed or invalid expression goes back to the last valid value and says so for a moment ("Kept $3,600"). */
  app.addEventListener('focusin', (e) => {
    const el = e.target;
    if (el.dataset && el.dataset.num !== undefined && el.tagName === 'INPUT') {
      if (inRender && editGood && editGood.p === el.dataset.p) return;
      editGood = { p: el.dataset.p, text: el.value };
    }
  }); /* editGood = the value the box had when you tapped into it; a re-render that gives the box its focus back never overwrites it with half-typed text */
  let clickRender = false; /* a state change made as you leave a box for a button is drawn after that tap's click, so the tap is never swallowed */
  const deferRender = () => {
    if (clickRender) return;
    clickRender = true;
    const go = () => {
      if (!clickRender) return;
      clickRender = false;
      document.removeEventListener('click', go);
      setTimeout(render, 0);
    };
    document.addEventListener('click', go);
    setTimeout(go, 1500);
  };
  app.addEventListener('focusout', (e) => {
    const el = e.target;
    if (!(el.dataset && el.dataset.num !== undefined && el.tagName === 'INPUT') || inRender) return;
    clearTimeout(pendT);
    const p = el.dataset.p,
      nxt = e.relatedTarget,
      nxtP = !!(nxt && nxt.dataset && nxt.dataset.p),
      c = evalBox(el),
      bd = boxBad(el, c),
      blank = String(el.value).trim() === '',
      n = boxNum(el, c);
    const fix =
      (blank && !EMPTYOK(p)) || (c.kind === 'expr' && !c.ok) || (c.kind === 'plain' && !blank && isNaN(n))
        ? 'Kept'
        : bd
          ? bd.end
          : null;
    if (fix) {
      /* back to what the box held when you started (always the stored value it showed then, never a blank or half-typed text): the value, the data and every total */
      const orig = editGood && editGood.p === p ? editGood.text : '';
      if (!setField(p, orig) && String(orig).trim() === '') {
        /* nothing was stored as text: leave the stored value alone */
      }
      save();
      el.value = orig;
      showNote(
        p,
        fix +
          ' ' +
          (String(orig).trim() === '' ? 'blank' : (el.dataset.pre || '') + orig + (el.dataset.suf || '')),
      );
      if (nxtP) setTimeout(render, 0);
      else if (nxt) deferRender();
      else render();
      return;
    }
    let mnote = null,
      n2 = n;
    if (!blank && POSBOX(p) && isFinite(n)) {
      const cnt = E.plannedIds(S).length,
        rn = Math.round(n),
        q = Math.max(1, Math.min(cnt, rn));
      n2 = q;
      mnote = q !== n ? (q !== rn ? 'Moved to ' + q + ' (1 to ' + cnt + ')' : 'Rounded to ' + q) : null;
      if (n2 !== n) el.value = String(n2);
    }
    if (!blank && MONTHSBOX(p) && isFinite(n)) {
      const cp = monthsCap(),
        rn = Math.round(n);
      n2 = Math.min(cp, rn);
      if (n2 > cp) n2 = cp;
      mnote = n > cp ? 'Capped at ' + cp + ' months' : rn !== n ? 'Rounded to ' + rn + ' months' : null;
      if (n2 !== n) {
        el.value = String(n2);
      }
    }
    const had = !!calcHint || !!document.querySelector('#app .chint');
    clearHintDom();
    const changed = liveCommit(el, true),
      txt = blank ? '' : fmtBox(el, n2, editGood && editGood.p === p ? editGood.text : '');
    if (mnote) showNote(p, mnote);
    if (el.value !== txt) el.value = txt;
    if (nxtP) {
      if (changed || had) setTimeout(render, 0);
    } else if (nxt) {
      if (changed) deferRender();
    } else if (changed || had) render();
  });
  app.addEventListener('focusout', (e) => {
    if (e.target.dataset && e.target.dataset.p && e.target.tagName === 'INPUT' && !e.relatedTarget)
      setTimeout(() => {
        const a = document.activeElement;
        if (!(a && a.dataset && (a.dataset.p || a.dataset.sel))) render();
      }, 0);
  });
  app.addEventListener('change', (e) => {
    if (e.target.dataset.exloan !== undefined && exEdit) {
      const r2 = E.exDraftSet(E.exampleShipped(exEdit.id), exEdit.draft, 'loanId', e.target.value);
      if (r2.ok) exEdit.draft = r2.draft;
      render();
      return;
    }
    const ln = e.target.dataset.loan;
    if (ln) {
      const h = H(ln);
      if (e.target.value === 'custom') h.loanId = 'custom';
      else E.applyLoan(h, e.target.value);
      save();
      render();
      return;
    }
    const bo = e.target.dataset.bought;
    if (bo) {
      const hh = H(bo),
        v0 = String(e.target.value || '');
      if (
        hh &&
        hh.status === 'owned' &&
        (v0 === '' || (/^\d{4}-\d{2}-\d{2}$/.test(v0) && isFinite(Date.parse(v0)) && v0 <= isoToday()))
      ) {
        hh.boughtOn = v0 || null;
        save();
        render();
      }
      return;
    }
    const mg = e.target.dataset.merge;
    if (mg) {
      H(mg).mergeInto = e.target.value;
      save();
      render();
      return;
    }
    if (e.target.dataset.listingFile !== undefined && e.target.files[0]) {
      impName = e.target.files[0].name;
      const rd = new FileReader();
      rd.onload = () => readListing(String(rd.result));
      rd.readAsText(e.target.files[0]);
      return;
    }
    if (e.target.id === 'imp' && e.target.files[0]) {
      const rd = new FileReader();
      rd.onload = () => stageBackup(String(rd.result));
      rd.readAsText(e.target.files[0]);
    }
  });

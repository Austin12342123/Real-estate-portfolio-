  /* ---------- simple math in a number box: digits . + - * / x X × ÷ ( ) , $ and a trailing %. A hand-written parser, never eval. Returns { kind:'plain' } for an ordinary number, { kind:'expr', ok, v } for math. ---------- */
  function calcEval(raw) {
    const s0 = String(raw == null ? '' : raw);
    if (/^\s*\$?\s*[-+]?\s*[\d,]*\.?\d*\s*%?\s*$/.test(s0)) return { kind: 'plain' };
    if (s0.length > 80) return { kind: 'expr', ok: false };
    let s = s0
        .replace(/[\s,$]/g, '')
        .replace(/%$/, '')
        .replace(/[xX×]/g, '*')
        .replace(/÷/g, '/'),
      i = 0,
      bad = false;
    if (!/^[\d.+\-*/()]+$/.test(s)) return { kind: 'expr', ok: false };
    const peek = () => s[i];
    function num() {
      const m = /^(\d+\.?\d*|\.\d+)/.exec(s.slice(i));
      if (!m) {
        bad = true;
        return 0;
      }
      i += m[0].length;
      return parseFloat(m[0]);
    }
    function prim() {
      if (peek() === '(') {
        i++;
        const v = add();
        if (peek() === ')') i++;
        else bad = true;
        return v;
      }
      return num();
    }
    function un() {
      if (peek() === '-') {
        i++;
        return -un();
      }
      if (peek() === '+') {
        i++;
        return un();
      }
      return prim();
    }
    function mul() {
      let v = un();
      while (!bad && (peek() === '*' || peek() === '/')) {
        const o = s[i++],
          w = un();
        if (o === '*') v *= w;
        else if (w === 0) bad = true;
        else v /= w;
      }
      return v;
    }
    function add() {
      let v = mul();
      while (!bad && (peek() === '+' || peek() === '-')) {
        const o = s[i++],
          w = mul();
        v = o === '+' ? v + w : v - w;
      }
      return v;
    }
    const v = add();
    if (bad || i !== s.length || !isFinite(v)) return { kind: 'expr', ok: false };
    return { kind: 'expr', ok: true, v: Math.round(v * 1e6) / 1e6 };
  }
  let calcHint = null,
    hintTimer = null,
    editGood =
      null; /* calcHint = { p, text, bad }: the small '= 1,950' / 'Check the math' / 'Kept $3,600' callout above the field being typed in; it floats over the page (position:absolute), so a field never moves while you type. editGood = the last valid text of the box being edited. */
  const hintHtml = (c) =>
    `<small class="chint${c.bad ? ' bad' : ''}" role="status" aria-live="polite" data-testid="calc-hint">${esc(c.text)}</small>`;
  const placeHint = () => {
    document.querySelectorAll('#app .chint').forEach((n) => n.remove());
    if (!calcHint) return;
    const el = document.querySelector(`#app input[data-p="${calcHint.p}"]`),
      iw = el && el.closest('.iw');
    if (iw) iw.insertAdjacentHTML('beforeend', hintHtml(calcHint));
  };
  const showNote = (p, text) => {
    clearTimeout(hintTimer);
    calcHint = { p, text };
    placeHint();
    hintTimer = setTimeout(() => {
      calcHint = null;
      document.querySelectorAll('#app .chint').forEach((n) => n.remove());
    }, 2800);
  };
  /* a revenue box: an amount (plain, math, or with k / m) and an optional period, per month or per year ('1,200,000/yr', '$1.2M per year', '100k/month', '90000 mo', '15000*12/yr'). Always answers in dollars PER MONTH. A bare trailing m is a million ('1.2m'); '/m' or 'per m' is a month. No period = per month. */
  const PER_M = '(?:\\/\\s*(?:months?|mo|m)|per\\s*(?:months?|mo|m)|a\\s*month|monthly|months?|mo)',
    PER_Y =
      '(?:\\/\\s*(?:years?|yr|y)|per\\s*(?:years?|yr|y)|a\\s*year|annually|annual|yearly|years?|yr|p\\.a\\.|pa|y)';
  const RE_PM = new RegExp('\\s*' + PER_M + '\\s*$', 'i'),
    RE_PY = new RegExp('\\s*' + PER_Y + '\\s*$', 'i'),
    RE_OTHER = /(?:\/\s*|per\s*|a\s*|every\s*)?(?:weeks?|wk|w|days?|d|quarters?|qtr|q|hours?|hr|h)\s*$/i;
  function perEval(raw) {
    const s0 = String(raw == null ? '' : raw).trim();
    if (s0 === '') return { kind: 'plain' };
    let per = null,
      body = s0,
      m;
    if ((m = RE_PM.exec(s0)) && m.index > 0) {
      per = 'm';
      body = s0.slice(0, m.index);
    } else if ((m = RE_PY.exec(s0)) && m.index > 0) {
      per = 'y';
      body = s0.slice(0, m.index);
    } else if (RE_OTHER.test(s0) && /[\d)]\s*(?:\/|per|a|every)?\s*[a-z]+\s*$/i.test(s0))
      return { kind: 'expr', ok: false, msg: 'Use per month or per year' };
    let hasKM = false,
      bad = false;
    const expr = body.replace(/,/g, '').replace(/(\d+\.?\d*|\.\d+)\s*([kKmM])(?![a-zA-Z])/g, (_, n, u) => {
      hasKM = true;
      return '(' + n + '*' + (/[kK]/.test(u) ? '1000' : '1000000') + ')';
    });
    if (!per && !hasKM) return calcEval(raw);
    if (/[a-zA-Z]/.test(expr) && !/^[\d.+\-*/()xX×÷\s$]+$/.test(expr)) bad = true;
    if (/%/.test(expr)) return { kind: 'expr', ok: false };
    if (bad || /^\s*$/.test(expr)) return { kind: 'expr', ok: false };
    let c = calcEval(expr);
    if (c.kind === 'plain') {
      const v = parseFloat(expr.replace(/[$\s]/g, ''));
      c = isFinite(v) ? { kind: 'expr', ok: true, v } : { kind: 'expr', ok: false };
    }
    if (!c.ok || !isFinite(c.v)) return { kind: 'expr', ok: false };
    const mo = per === 'y' ? c.v / 12 : c.v,
      f = (x) => '$' + Math.round(x).toLocaleString('en-US');
    const v = Math.round(mo * 100) / 100;
    return {
      kind: 'expr',
      ok: true,
      v,
      hint: per === 'y' ? '= ' + f(c.v) + ' a year · ' + f(v) + ' a month' : '= ' + f(v) + ' a month',
    };
  }
  const evalBox = (el) =>
    el.dataset && el.dataset.per !== undefined ? perEval(el.value) : calcEval(el.value);
  window.RepCalc = calcEval;
  window.RepPer = perEval;

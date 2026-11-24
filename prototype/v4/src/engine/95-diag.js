  /* ---------- diagnostics: safety copies, anomaly checks and the bug report. All of it stays on this device; nothing here sends anything anywhere. ---------- */
  const Diag = (function () {
    const SAFEKEY = 'rep-v4-safety',
      DIAGKEY = 'rep-v4-diag',
      SAFE_MAX = 3,
      SAFE_BYTES = 700000,
      EV_MAX = 60,
      ACT_MAX = 10,
      DIAG_BYTES = 30000,
      REPORT_MAX = 8000,
      URL_MAX = 7400;
    const ISSUE = 'https://github.com/Austin12342123/Real-estate-portfolio-/issues/new';
    const hash = (s) => {
      s = String(s);
      let x = 0x811c9dc5;
      for (let i = 0; i < s.length; i++) {
        x ^= s.charCodeAt(i);
        x = Math.imul(x, 0x01000193) >>> 0;
      }
      return ('0000000' + x.toString(16)).slice(-8);
    }; /* FNV-1a, 8 hex: a stable short fingerprint of a text (ids are hashed this way in reports) */
    const okState = (s) =>
      !!(s && typeof s === 'object' && Array.isArray(s.houses) && s.g && typeof s.g === 'object');
    const idsHash = (S) => hash(((S && S.houses) || []).map((h) => h.id).join('|'));
    const fingerprint = (S, now) => {
      const hs = (S && S.houses) || [];
      return {
        ids: idsHash(S),
        n: hs.length,
        own: hs.filter((h) => h.status === 'owned').length,
        ts: now || Date.now(),
        v: S ? S.v : null,
      };
    };
    /* ----- safety copies: a ring of the last SAFE_MAX snapshots under their own key { v:1, items:[{ ts, reason, build, state }] }, newest first. storage = anything with getItem / setItem. Nothing here throws. ----- */
    function safeRead(st) {
      try {
        const j = JSON.parse(st.getItem(SAFEKEY));
        if (!j || j.v !== 1 || !Array.isArray(j.items)) return [];
        return j.items
          .filter(
            (x) =>
              x &&
              isFinite(+x.ts) &&
              typeof x.reason === 'string' &&
              (okState(x.state) || typeof x.raw === 'string'),
          )
          .slice(0, SAFE_MAX)
          .map((x) => {
            const o = {
              ts: +x.ts,
              reason: x.reason.slice(0, 80),
              build: String(x.build || '').slice(0, 16),
              state: okState(x.state) ? x.state : null,
            };
            if (typeof x.raw === 'string') o.raw = x.raw;
            return o;
          });
      } catch (e) {
        return [];
      }
    }
    /* write the ring: too big or over quota drops the OLDEST copy and tries again; returns the items kept, or false when nothing could be stored */
    function safeWrite(st, items) {
      let it = items.slice(0, SAFE_MAX);
      for (let guard = 0; guard < 12 && it.length; guard++) {
        let txt;
        try {
          txt = JSON.stringify({ v: 1, items: it });
        } catch (e) {
          return false;
        }
        if (txt.length > SAFE_BYTES) {
          if (it.length <= 1) return false;
          it = it.slice(0, -1);
          continue;
        }
        try {
          st.setItem(SAFEKEY, txt);
          return it;
        } catch (e) {
          if (it.length <= 1) return false;
          it = it.slice(0, -1);
        }
      }
      return false;
    }
    function safeAdd(st, state, reason, build, now, raw) {
      try {
        const item = {
          ts: now || Date.now(),
          reason: String(reason).slice(0, 80),
          build: String(build || '').slice(0, 16),
        };
        if (okState(state)) item.state = JSON.parse(JSON.stringify(state));
        else if (typeof raw === 'string' && raw) {
          item.state = null;
          item.raw = raw.slice(0, 200000);
        } else return false;
        return safeWrite(st, [item].concat(safeRead(st)));
      } catch (e) {
        return false;
      }
    }
    const dayOf = (t) => {
      const d = new Date(t);
      return d.getFullYear() * 10000 + d.getMonth() * 100 + d.getDate();
    };
    /* at most one copy a day: only when nothing else took one today and the newest copy is not already the same portfolio */
    function safeDaily(st, state, build, now) {
      try {
        now = now || Date.now();
        const it = safeRead(st);
        if (it.some((x) => dayOf(x.ts) === dayOf(now))) return null;
        if (it.length && it[0].state && JSON.stringify(it[0].state) === JSON.stringify(state)) return null;
        return safeAdd(st, state, 'daily copy', build, now);
      } catch (e) {
        return null;
      }
    }
    const safeInfo = (s) => {
      const hs = (s && s.houses) || [];
      return {
        n: hs.length,
        own: hs.filter((h) => h.status === 'owned').length,
        planned: hs.filter((h) => h.status !== 'owned').length,
      };
    };
    /* ----- 'portfolio replaced' detection: the stored last-known fingerprint against this start. Flags only when the portfolio now is the shipped default plan, it is a different set of assets than before, and no logged migration, sample, restore, import or open explains it. ----- */
    const EXPLAIN = [
      'migration',
      'scenario',
      'restore',
      'import',
      'open-saved',
      'clear-planned',
      'undo',
      'removed',
    ];
    function replacedCheck(S, fp, events) {
      try {
        if (!fp || !fp.ids || !okState(S)) return false;
        const cur = idsHash(S);
        if (cur === fp.ids) return false;
        if (cur !== idsHash(E.seedPlan())) return false;
        return !(events || []).some((e) => e && EXPLAIN.indexOf(e.k) >= 0 && +e.t >= (fp.ts || 0) - 2000);
      } catch (e) {
        return false;
      }
    }
    /* the newest safety copy that is a different portfolio from the one on screen */
    const restoreCandidate = (items, S) => {
      const cur = idsHash(S);
      return (items || []).find((x) => x.state && idsHash(x.state) !== cur) || null;
    };
    /* ----- invariants: each returns { code, ok, m (measured, no dollar amounts), n (the same with amounts, shown only when numbers are included) } ----- */
    const BADRE = /(^|[^A-Za-z])(NaN|-?Infinity|undefined|\[object)([^A-Za-z]|$)/;
    const plannedParts = (S, pl) => {
      const own = {};
      S.houses.forEach((h) => {
        if (h.status === 'owned') own[h.id] = 1;
      });
      const sn = pl.snap.filter((x) => x.type !== 'cash'),
        sum = (a) => a.reduce((s, x) => s + (+x.cf || 0), 0);
      return {
        top: pl.horizon.cf - sum(sn.filter((x) => own[x.id])),
        rows: sum(sn.filter((x) => !own[x.id])),
        today: E.todayTotals(
          S,
          pl,
          sn.filter((x) => !own[x.id]).map((x) => x.id),
        ).cf,
      };
    }; /* top / rows: the plan-end total and the sum of its rows (engine consistency); today: the Planned total shown on screen is in today's terms (2026*) */
    function checks(c) {
      const out = [],
        add = (code, ok, m, n) =>
          out.push({ code, ok: !!ok, m: String(m), n: n === undefined ? '' : String(n) }),
        S = c.S;
      try {
        const a = JSON.parse(JSON.stringify(S));
        E.normalize(a);
        const ja = JSON.stringify(a),
          b = JSON.parse(ja);
        E.normalize(b);
        const idem = JSON.stringify(b) === ja;
        add(
          'state-shape',
          okState(S) && idem && S.v === c.dataV,
          'S.v ' +
            S.v +
            ' of DATA_V ' +
            c.dataV +
            ', ' +
            S.houses.length +
            ' assets, normalize ' +
            (idem ? 'idempotent' : 'NOT idempotent'),
        );
      } catch (e) {
        add('state-shape', false, 'threw: ' + String(e && e.message).slice(0, 80));
      }
      try {
        const pl = c.pl,
          bad = [];
        if (pl && pl.horizon)
          ['nw', 'monthly', 'cf', 'noi', 'debt', 'value'].forEach((k) => {
            if (typeof pl.horizon[k] !== 'number' || !isFinite(pl.horizon[k])) bad.push(k);
          });
        (c.kpiTexts || []).forEach((t, i) => {
          if (BADRE.test(t)) bad.push('kpi text ' + (i + 1));
        });
        add(
          'kpi-finite',
          !bad.length,
          !pl && !(c.kpiTexts || []).length
            ? 'skipped: the plan is not on screen'
            : bad.length
              ? 'not finite or unreadable: ' + bad.join(', ')
              : 'plan fields finite' +
                (c.kpiTexts && c.kpiTexts.length ? ', ' + c.kpiTexts.length + ' KPI texts clean' : ''),
        );
      } catch (e) {
        add('kpi-finite', false, 'threw: ' + String(e && e.message).slice(0, 80));
      }
      try {
        if (!c.pl) add('total-equals-rows', true, 'skipped: the plan is not on screen');
        else {
          const p = plannedParts(S, c.pl),
            tol = 1 + 0.002 * Math.abs(p.rows),
            d1 = Math.abs(p.top - p.rows);
          let ok = d1 <= tol,
            m =
              'Planned total matches the sum of its rows (diff ' +
              (Math.abs(p.rows) > 1 ? ((d1 / Math.abs(p.rows)) * 100).toFixed(3) : '0') +
              '%)';
          if (isFinite(c.domCf)) {
            const d2 = Math.abs(c.domCf - p.today),
              t2 = 1 + 0.003 * Math.abs(p.today);
            if (d2 > t2) {
              ok = false;
              m =
                'the total shown on screen differs from the engine (diff ' +
                (Math.abs(p.today) > 1 ? ((d2 / Math.abs(p.today)) * 100).toFixed(2) : '0') +
                '%)';
            }
          }
          if (!ok && d1 > tol)
            m =
              'Planned total differs from the sum of its rows (diff ' +
              (Math.abs(p.rows) > 1 ? ((d1 / Math.abs(p.rows)) * 100).toFixed(2) : '0') +
              '%)';
          add(
            'total-equals-rows',
            ok,
            m,
            'top ' +
              Math.round(p.top) +
              ', rows ' +
              Math.round(p.rows) +
              (isFinite(c.domCf) ? ', today ' + Math.round(p.today) + ', shown ' + Math.round(c.domCf) : ''),
          );
        }
      } catch (e) {
        add('total-equals-rows', false, 'threw: ' + String(e && e.message).slice(0, 80));
      }
      {
        const rw = c.rw;
        add(
          'storage-readback',
          !rw || rw.ok !== false,
          !rw || rw.ok === null
            ? 'no write yet this session'
            : rw.ok
              ? 'last save read back equal (' + rw.chars + ' chars)'
              : 'last save did NOT read back equal' + (rw.err ? ': ' + String(rw.err).slice(0, 60) : ''),
        );
      }
      {
        const s = c.stamps || {},
          v = [s.engine, s.info, s.app, s.css],
          agree = !!s.app && v.every((x) => x === s.app),
          cn = c.swCaches || [],
          swOk = !cn.length || cn.some((n) => String(n).slice(-8) === s.app);
        add(
          'build-stamps',
          agree && swOk,
          'engine ' +
            (s.engine || 'none') +
            ', info ' +
            (s.info || 'none') +
            ', app ' +
            (s.app || 'none') +
            ', css ' +
            (s.css || 'none') +
            (cn.length ? ', cache ' + cn.map((n) => String(n).slice(-8)).join('/') : '') +
            (agree && swOk ? ': all agree' : ': MISMATCH'),
        );
      }
      add(
        'portfolio-not-replaced',
        !c.replaced,
        c.replaced
          ? 'now the default plan with different assets than the last known portfolio, and no logged migration, sample, restore or import explains it'
          : 'matches the last known portfolio or has an explanation',
      );
      {
        const n = c.errCount || 0;
        add(
          'no-runtime-errors',
          n === 0,
          n + ' error / rejection / service-worker / storage event(s) captured this session',
        );
      }
      return out;
    }
    const CODE = {
      'state-shape': 'state-shape',
      'kpi-finite': 'kpi-nonfinite',
      'total-equals-rows': 'total-mismatch',
      'storage-readback': 'storage-readback',
      'build-stamps': 'build-mismatch',
      'portfolio-not-replaced': 'state-replaced',
      'no-runtime-errors': 'runtime-error',
    };
    const anomalies = (cs) => cs.filter((x) => !x.ok).map((x) => CODE[x.code] || x.code);
    /* ----- the bug report ----- */
    const scrub = (s, names) => {
      s = String(s == null ? '' : s);
      (names || []).forEach((n) => {
        if (n && String(n).length >= 3) s = s.split(String(n)).join('[address]');
      });
      return s.replace(/[−-]?\$\s?\d[\d,]*(?:\.\d+)?\s?[KkMmBb]?\b/g, '$#');
    };
    const one = (s) =>
      String(s == null ? '' : s)
        .replace(/\s*[\r\n]+\s*/g, ' / ')
        .trim();
    const iso = (t) => {
      try {
        return new Date(t).toISOString().slice(0, 19) + 'Z';
      } catch (e) {
        return String(t);
      }
    };
    function stateLines(S, o) {
      const hs = S.houses || [],
        L = [],
        pc = hs.filter((h) => h.status !== 'owned').length;
      L.push(['assets_total', hs.length], ['planned', pc], ['owned', hs.length - pc]);
      ['house', 'commercial', 'business'].forEach((t) => {
        const a = hs.filter((h) => (h.type || 'house') === t);
        L.push(
          [t + '_planned', a.filter((h) => h.status !== 'owned').length],
          [t + '_owned', a.filter((h) => h.status === 'owned').length],
        );
      });
      const mf = hs.filter(isMulti);
      L.push(
        ['multifamily_assets', mf.length],
        ['multifamily_units_total', mf.reduce((a, h) => a + unitsOf(h), 0)],
        ['sold_in_plan', o.sold == null ? 'n/a' : o.sold],
      );
      const ad = Array.isArray(S.added) ? S.added : [];
      L.push(
        ['added_keys', ad.length + (ad.length ? ' (' + ad.map((k) => 'h:' + hash(k)).join(', ') + ')' : '')],
        ['additions_shipped', ADDITIONS.length],
        ['saved_portfolios', o.saved],
        ['example_overrides', o.exov],
        ['unit_setting', o.unit],
        ['page', o.page],
        ['asset_ids_hash', idsHash(S)],
      );
      if (o.numbers) {
        if (o.nw != null)
          L.push(
            ['net_worth_plan_end', Math.round(o.nw)],
            ['cash_flow_per_month_plan_end', Math.round(o.cf)],
          );
        hs.forEach((h, i) =>
          L.push([
            'asset_' + (i + 1),
            (h.type || 'house') +
              ' ' +
              (h.status === 'owned' ? 'owned' : 'planned') +
              ' price=' +
              Math.round(+h.price || 0) +
              ' rent=' +
              Math.round(+h.rent || 0),
          ]),
        );
      }
      return L;
    }
    const FORCLAUDE =
      "Paste this whole report into the Claude chat for the Real-estate-portfolio- repo. Claude: (1) read section 2: the four stamps must be equal (if not, the phone ran mixed files; the app heals itself once, so look at the events), then section 4 (failed invariants) and sections 5-7 (events, errors, last actions); (2) reproduce it with Playwright against prototype/v4 with the state described in section 3 (graders in prototype/grader show how to load a state); (3) fix the root cause in v4/engine.js, app.js, info.js or style.css and run python3 prototype/v4/stamp.py; (4) add a regression check to the graders (ux-grade.js J, design-grade.js K); (5) follow CLAUDE.md: never replace a user's portfolio in a migration, run the full grader, push to main and publish the Artifact as usual. Ids are shown as h:xxxxxxxx = Engine.Diag.hash(text). The app cannot send this report by itself: the person copies it and pastes it into the chat.";
    function report(inp) {
      const nums = !!inp.numbers,
        names = nums ? [] : inp.names || [],
        sc = (s) => (nums ? String(s == null ? '' : s) : scrub(s, names)),
        kv = (k, v) => '- ' + k + ': ' + one(v);
      const b = inp.build || {},
        st = b.stamps || {},
        cs = inp.checks || [],
        an = inp.anomalies || [],
        strip = (s) => String(s || '').replace(/https?:\/\/[^\s)]*\//g, '');
      const sec = (n, t, lines) => '## ' + n + '. ' + t + '\n' + lines.join('\n') + '\n';
      const build = (nEv, nErr, nAct, stackLines) => {
        const evs = (inp.events || []).slice(-nEv),
          errs = (inp.events || [])
            .filter((e) => ['error', 'unhandledrejection', 'sw', 'storage'].indexOf(e.k) >= 0)
            .slice(-nErr),
          acts = (inp.actions || []).slice(-nAct);
        return (
          '<!-- rep-bug-report v1 | generated ' +
          iso(inp.now || Date.now()) +
          ' -->\n# Portfolio app bug report\n\n' +
          sec(1, 'Summary', [
            kv('anomalies', an.length ? an.join(', ') : 'none detected'),
            kv('description', inp.desc ? sc(inp.desc).slice(0, 500) : '(none)'),
            kv('numbers_included', nums ? 'yes' : 'no (counts and hashes only)'),
          ]) +
          '\n' +
          sec(
            2,
            'Build',
            [
              kv('stamp_engine', st.engine || 'none'),
              kv('stamp_info', st.info || 'none'),
              kv('stamp_app', st.app || 'none'),
              kv('stamp_css', st.css || 'none'),
              kv(
                'stamps_agree',
                st.app && [st.engine, st.info, st.css].every((x) => x === st.app) ? 'yes' : 'NO',
              ),
              kv('data_v', b.dataV),
              kv('state_v', b.stateV),
              kv('sw_cache', b.swCaches && b.swCaches.length ? b.swCaches.join(', ') : 'none'),
              kv('sw_controller', b.swCtl ? 'yes' : 'no'),
              kv('display_mode', b.mode),
              kv('route', nums ? b.route : b.routeSafe),
              kv('user_agent', b.ua),
              kv('viewport', b.vw + 'x' + b.vh),
              kv('dpr', b.dpr),
              kv('language', b.lang),
              kv('timezone', b.tz),
              kv('online', b.online ? 'yes' : 'no'),
              kv('storage_local', b.ls ? 'ok' : 'unavailable'),
              kv('storage_session', b.ss ? 'ok' : 'unavailable'),
            ].concat((b.keys || []).map((x) => kv('bytes_' + x[0], x[1]))),
          ) +
          '\n' +
          sec(
            3,
            'State summary',
            stateLines(inp.S, inp.sum || {}).map((x) => kv(x[0], x[1])),
          ) +
          '\n' +
          sec(
            4,
            'Invariants',
            cs.map(
              (x) =>
                '- [' +
                (x.ok ? 'PASS' : 'FAIL') +
                '] ' +
                x.code +
                ': ' +
                one(x.m) +
                (nums && x.n ? ' (' + one(x.n) + ')' : ''),
            ),
          ) +
          '\n' +
          sec(
            5,
            'Events (last ' + evs.length + ')',
            evs.length ? evs.map((e) => '- ' + iso(e.t) + ' ' + e.k + ': ' + sc(strip(e.m))) : ['- none'],
          ) +
          '\n' +
          sec(
            6,
            'Errors',
            errs.length
              ? errs.map(
                  (e) =>
                    '- ' +
                    iso(e.t) +
                    ' ' +
                    e.k +
                    ': ' +
                    sc(strip(e.m)) +
                    (e.s && stackLines
                      ? '\n' +
                        String(e.s)
                          .split('\n')
                          .slice(0, stackLines)
                          .map((l) => '    ' + sc(strip(l)).slice(0, 140))
                          .join('\n')
                      : ''),
                )
              : ['- none'],
          ) +
          '\n' +
          sec(
            7,
            'Last user actions (oldest first; button ids and routes only, never typed text)',
            acts.length ? acts.map((a) => '- ' + iso(a.t).slice(11) + ' ' + one(a.a)) : ['- none'],
          ) +
          '\n' +
          sec(8, 'For Claude', [FORCLAUDE])
        );
      };
      let nEv = 30,
        nErr = 6,
        nAct = 10,
        sl = 4,
        txt = build(nEv, nErr, nAct, sl);
      while (txt.length > REPORT_MAX && nEv > 4) {
        nEv -= 4;
        txt = build(nEv, nErr, nAct, sl);
      } /* events are trimmed first, then error stacks, then actions */
      while (txt.length > REPORT_MAX && sl > 0) {
        sl--;
        txt = build(nEv, nErr, nAct, sl);
      }
      while (txt.length > REPORT_MAX && nAct > 3) {
        nAct--;
        txt = build(nEv, nErr, nAct, sl);
      }
      if (txt.length > REPORT_MAX)
        txt = txt.slice(0, REPORT_MAX - 60) + '\n[trimmed to fit ' + REPORT_MAX + ' characters]\n';
      return txt;
    }
    /* turn a report back into { sections: { 1: { title, lines, kv } ... } } (the format is stable so Claude and the graders can parse it) */
    function parseReport(t) {
      const out = { version: null, sections: {} },
        m = /<!-- rep-bug-report v(\d+)/.exec(t);
      out.version = m ? +m[1] : null;
      let cur = null;
      String(t)
        .split('\n')
        .forEach((l) => {
          const h = /^## (\d+)\. (.*)$/.exec(l);
          if (h) {
            cur = out.sections[+h[1]] = { title: h[2], lines: [], kv: {} };
            return;
          }
          if (!cur || !l.trim()) return;
          cur.lines.push(l);
          const k = /^- ([A-Za-z0-9_\-]+): (.*)$/.exec(l);
          if (k) cur.kv[k[1]] = k[2];
        });
      return out;
    }
    /* the prefilled GitHub issue link: the body is cut so the whole address stays under URL_MAX characters */
    function issueUrl(title, body) {
      const foot = '\n\nFull report was copied to the clipboard.',
        t = String(title || 'In-app bug report').slice(0, 100),
        mk = (x) => ISSUE + '?title=' + encodeURIComponent(t) + '&body=' + encodeURIComponent(x + foot);
      let b = String(body || ''),
        trimmed = false,
        u = mk(b);
      for (let i = 0; i < 60 && u.length > URL_MAX && b.length > 100; i++) {
        b = b.slice(0, Math.max(100, b.length - Math.ceil((u.length - URL_MAX) / 3) - 20));
        if (/[\ud800-\udbff]$/.test(b)) b = b.slice(0, -1);
        trimmed = true;
        u = mk(b + '\n[trimmed]');
      }
      if (u.length > URL_MAX) u = mk('');
      return { url: u, trimmed };
    }
    return {
      SAFEKEY,
      DIAGKEY,
      SAFE_MAX,
      SAFE_BYTES,
      EV_MAX,
      ACT_MAX,
      DIAG_BYTES,
      REPORT_MAX,
      URL_MAX,
      ISSUE,
      hash,
      idsHash,
      fingerprint,
      okState,
      safeRead,
      safeWrite,
      safeAdd,
      safeDaily,
      safeInfo,
      replacedCheck,
      restoreCandidate,
      EXPLAIN,
      checks,
      anomalies,
      plannedParts,
      scrub,
      report,
      parseReport,
      issueUrl,
      CODE,
    };
  })();

  /* ---------- sample portfolios: loading one never loses the current plan ---------- */
  const SCN = [
    {
      k: 'reset',
      test: 'load-realistic',
      title: 'Realistic sample',
      name: 'realistic sample',
      sub: 'A few assets already bought; market-checked prices and loans',
      seed: () => E.seed(),
      what: 'It keeps a few assets already bought, to show the Real page.',
    },
    {
      k: 'stretch',
      test: 'load-stretch',
      title: 'Stretch: 607 Siena Way',
      name: 'stretch scenario (607 Siena Way)',
      sub: 'Stretch scenario: buys 607 Siena Way, Bel Air ($135M) in month 170',
      seed: () => E.seedStretch(),
      what: 'It buys 607 Siena Way, Bel Air, for $135M in month 170 and needs 21-25% yearly business growth.',
    },
    {
      k: 'big',
      test: 'load-big',
      title: '$120M scenario',
      name: '$120M scenario',
      sub: 'The trust buys a $35M waterfront estate in month 200',
      seed: () => E.seedBig(),
      what: 'The trust buys a $35M waterfront estate in month 200.',
    },
    {
      k: 'stradella',
      test: 'load-stradella',
      title: '$38.7M house scenario',
      name: '$38.7M house scenario',
      sub: 'Buys 900 Stradella Rd for cash in month 200',
      seed: () => E.seedStradella(),
      what: 'It buys 900 Stradella Rd for cash in month 200.',
    },
  ];
  const scnConfirm = (sc) => {
    let ny = null;
    try {
      ny = sc.seed().g.planYears;
    } catch (e) {}
    const cy = S.g.planYears;
    return (
      'Load the ' +
      esc(sc.name) +
      '? ' +
      (S.houses.length
        ? 'Your current plan (' +
          S.houses.length +
          ' asset' +
          (S.houses.length === 1 ? '' : 's') +
          ') is kept in Saved first, and Undo brings it back. '
        : '') +
      (ny && ny !== cy
        ? 'The projection length changes from ' + cy + ' to ' + ny + (ny === 1 ? ' year. ' : ' years. ')
        : '') +
      esc(sc.what)
    );
  };
  const planCount = () => S.houses.filter((h) => h.status !== 'owned').length;
  const clearBox = () => {
    const n = planCount();
    return n
      ? confirmBox(
          'Remove all ' +
            n +
            ' planned asset' +
            (n === 1 ? '' : 's') +
            '? ' +
            (S.houses.length > n
              ? S.houses.length -
                n +
                ' bought asset' +
                (S.houses.length - n === 1 ? ' stays' : 's stay') +
                '. '
              : '') +
            'Your current portfolio is kept in Saved first, and Undo brings it back.',
          'data-clear-yes data-testid="clear-plan-confirm"',
          'Yes, remove all',
        )
      : '<div class="confirm" role="status"><p>There are no planned assets to remove.</p><button class="btn plain" data-ask-cancel>OK</button></div>';
  };
  function clearPlanned() {
    ask = null;
    const n = planCount();
    if (!n) {
      render();
      return;
    }
    safeCopy('before removing all planned assets');
    logEv('clear-planned', 'removed ' + n + ' planned assets');
    const snap = JSON.stringify(S);
    let sid = null;
    if (SAVED.length < MAXSAVED) {
      const rec = {
        id: newSid(),
        name: ('Portfolio ' + portNo() + ' (before removing planned assets)').slice(0, 60),
        ts: Date.now(),
        state: JSON.parse(snap),
      };
      SAVED.unshift(rec);
      if (saveSaved()) sid = rec.id;
      else SAVED.shift();
    }
    setUndo({
      text:
        'Removed ' +
        n +
        ' planned asset' +
        (n === 1 ? '' : 's') +
        '. ' +
        (sid
          ? 'The earlier portfolio is kept in Saved.'
          : 'It could not be filed in Saved, but Undo brings it back.'),
      label: 'planned assets',
      snap,
      sid,
    });
    S.houses
      .filter((h) => h.status !== 'owned')
      .forEach((h) => {
        S = E.without(S, h.id);
      });
    E.relink(S);
    selId = null;
    prev = {};
    save();
    goto('');
    render();
  }
  function loadScenario(sc) {
    ask = null;
    safeCopy('before loading a sample portfolio');
    logEv('scenario', 'loaded the ' + sc.k + ' sample');
    const snap = JSON.stringify(S);
    let sid = null;
    if (S.houses.length && SAVED.length < MAXSAVED) {
      const rec = {
        id: newSid(),
        name: ('Portfolio ' + portNo() + ' (before ' + sc.title + ')').slice(0, 60),
        ts: Date.now(),
        state: JSON.parse(snap),
      };
      SAVED.unshift(rec);
      if (saveSaved()) sid = rec.id;
      else SAVED.shift();
    }
    setUndo({
      text:
        'Loaded the ' +
        sc.name +
        '. ' +
        (sid
          ? 'Your previous plan is kept in Saved.'
          : 'Your previous plan could not be filed in Saved, but Undo brings it back.'),
      label: 'previous plan',
      snap,
      sid,
    });
    S = sc.seed();
    S.v = DATA_V;
    fixOrder(S);
    selId = null;
    page = 'planned';
    prev = {};
    savedMsg = '';
    save();
    goto('');
    render();
    window.scrollTo(0, 0);
  }
  /* ---------- settings ---------- */
  function settings() {
    const g = S.g,
      F = (l, k, o) => field(l, 'g.' + k, o && o.pre === '$' ? grp(g[k]) : g[k], o);
    return `<div class="top"><button class="ic" data-go="" aria-label="Back">‹</button><h2>Assumptions</h2></div>
    <p class="note" style="margin:0 4px 6px">Defaults work for most people. Change them when you know your lender. You can type simple math in any number box, like 650*3.${infoBtn('calc')} Keyboard shortcuts${infoBtn('shortcuts')}</p>
    <div class="sec">Borrowing</div><section class="card">${F('Max loan vs value', 'cap', { suf: '%' })}${F('Max loan vs value (business)', 'capBiz', { suf: '%' })}${F('Appraisal cut', 'haircut', { suf: '%' })}${F('Closing costs', 'closing', { suf: '%' })}${F('Line of credit rate', 'hrate', { suf: '%' })}${F('Refinance rate', 'refiRate', { suf: '%' })}${field('Refinance term (years)', 'g.refiTermY', r(g.refiTerm / 12, 1), { info: 'refi' })}<p class="note">Appraisal cut: what lenders subtract from a home's value. Rent counted: the share of rent lenders accept as income.</p></section>
    ${colSec('set-pay', 'Paying loans down', g.autoPay === false ? 'off' : 'on', `<section class="card" data-testid="autopay-card"><div class="subh"><h3>Paying loans down</h3>${infoBtn('autopay')}</div><div class="f" style="border-top:0;min-height:36px"><span class="lb">Send profit and job money to loans</span></div><div class="seg" style="margin-top:0" role="tablist" aria-label="Send profit and job money to loans"><button data-autopay="on" class="${g.autoPay !== false ? 'on' : ''}" data-testid="autopay-on">On</button><button data-autopay="off" class="${g.autoPay === false ? 'on' : ''}" data-testid="autopay-off">Off</button></div><p class="note">On: while a planned asset is waiting, the pooled cash flow (and your job money left after living costs and your cash cushion) pays the trust's line of credit and builds cash for it. Once nothing is left to buy, each asset's profit pays down its own loan, and your job money is split equally across the loans. Off: the old behavior, where only your typed extra payments reduce a loan.</p></section>`, true)}
    ${colSec('set-qual', 'Who helps you qualify', 'DTI limit ' + g.dti + '%', `<section class="card"><div class="subh"><h3>Who helps you qualify</h3>${infoBtn('qualifying')}</div>${F('Co-signer 1 / yr', 'p1', { pre: '$' })}${F('Co-signer 2 / yr', 'p2', { pre: '$' })}<p class="note">Leave 0 if none. Co-signers help you qualify for loans. Their income counts toward the lender's limit.</p>${F('Debt-to-income limit', 'dti', { suf: '%' })}${F('Rent counted', 'rentCount', { suf: '%' })}${F('Other monthly debts', 'otherDebt', { pre: '$' })}</section>`, true)}
    ${colSec('set-ops', 'Operating costs', 'vacancy ' + g.vac + '%', `<section class="card">${F('Vacancy', 'vac', { suf: '%' })}${F('Management (of rent)', 'mgmt', { suf: '%' })}${F('Repairs / yr', 'maint', { suf: '%' })}${F('Growth / yr', 'appr', { suf: '%' })}${F('Projection length (years)', 'planYears', {})}</section>`, true)}
    <div class="sec">Show figures in${infoBtn('units')}</div><section class="card" data-testid="unit-card"><div class="seg" style="margin-top:0" role="radiogroup" aria-label="Show figures in">${[
      ['today', "Today's dollars"],
      ['future', 'Future dollars'],
    ]
      .map(
        ([k, l]) =>
          `<button type="button" role="radio" data-unit="${k}" class="${isToday() === (k === 'today') ? 'on' : ''}" aria-checked="${isToday() === (k === 'today')}" data-testid="unit-${k}">${l}</button>`,
      )
      .join(
        '',
      )}</div><p class="note" data-testid="unit-help">${isToday() ? 'Every figure at the end of the plan is divided by the cost increase of those years, so it reads in what money buys today; the future-dollar amount is shown smaller.' : "Every figure at the end of the plan is shown in the dollars of that year (rents, values and costs have grown). Today's-dollar amounts are shown smaller."} Prices of planned assets are today's prices; nothing is inflated.</p></section>
    <div class="sec">Open the app on${infoBtn('openon')}</div><section class="card" data-testid="openon-card"><div class="seg" style="margin-top:0" role="radiogroup" aria-label="Open the app on">${[
      ['planned', 'Planned'],
      ['real', 'Real'],
      ['saved', 'Saved'],
    ]
      .map(
        ([k, l]) =>
          `<button type="button" role="radio" data-openon="${k}" class="${UI.openOn === k ? 'on' : ''}" aria-checked="${UI.openOn === k}" data-testid="openon-${k}">${l}</button>`,
      )
      .join(
        '',
      )}</div><p class="note">The page you see first when you open the app. Planned is the default. You can switch pages with the buttons at the top of the main screen.</p></section>
    <details class="card" data-testid="model-notes" style="margin:0 0 8px;padding:10px 12px"><summary style="cursor:pointer;font-weight:600">How the numbers are built</summary><ul class="note" style="margin:8px 0 0 16px;padding:0">
      <li>The main screen has three pages. Planned is the plan and its math (net worth and cash flow at the end of the plan, every planned asset). Real is only what you have already bought: its totals are the sum of its rows. Saved holds copies of whole portfolios (assets, assumptions and finances) that you can open later; they are kept on this device and are part of the backup. Choose which page opens first at the top of this screen.</li>
      <li>Any number box accepts simple math: type 650*3 or (2000-300)/2 and the box shows the answer when you leave it. Every month number is counted from today (month 0), and the date it falls on is shown beside it.</li>
      <li>Figures for a future month are shown in today's dollars by default (choose Future dollars at the top of this screen): each is divided by the cost increase of those years (3% a year by default), so $1 reads as what $1 buys today. Prices of planned assets are today's prices; nothing is inflated. Inside the math, rents and values grow at each asset's growth rate, living costs and manager pay rise by the cost-increase rate, and loan payments stay fixed.</li>
      <li>Rent, profit and costs of each asset grow at that asset's growth rate, the same rate as its value. Property taxes are assumed to rise with value (some states cap this).</li>
      <li>Every asset sits in one trust and the trust borrows against all of it. Walking down the list, each planned asset is bought the first month the pool of everything before it (what you own today plus the planned assets above it) can pay its down payment, closing costs and improvements: the pool's borrowing room plus the cash it holds. Each asset adds room up to the max loan vs value (85% is the regulators' ceiling for real estate) less the appraisal cut, its own loan balance and other liens; a business is not backed by real estate, so it uses a separate, lower cap (50% by default, a conservative choice you can change). What the trust has already drawn on its line is subtracted. The pool's whole cash flow (income minus costs, loan payments and line interest, after the managers and taxes) goes first to paying the line down, which raises the room, then is held for the next purchase. Each asset's cash flow grows with its income, and extra payments still shorten loans and raise room. Move an asset up or down the list and the funding order changes with it. Savings are not counted; sale proceeds are held as cash. Planned assets are always funded in list order, so none is bought before one above it. Every time on screen is one clock: months from today.</li>
      <li>Where the money goes, in order: (1) the trust's pooled cash flow pays the line of credit down; (2) while a planned asset is waiting, the rest is held as cash for it; (3) once nothing is left to buy, each asset's profit pays down its own loan as an automatic extra payment (in proportion to the profit it earned), so its payoff comes sooner. Your job's take-home pay minus living costs, other debts and your extra payments is split the same way (equally across the loans at the end), and it never takes your cash below the emergency cushion. Both can be switched off under Paying loans down.</li>
      <li>Debt-to-income counts 75% of rent (minus the property's payment) plus your other debts and your own rent or mortgage (set in Finances). Banks also look at each asset's DSCR (income over loan payment): about 1.25 for bank loans, 1.15 for SBA.</li>
      <li>Taxes are worked out: profit = net operating income - loan interest - depreciation (27.5 / 39 years for buildings, 15 years for business goodwill, 7 for equipment), taxed at the extra rate your wages plus the profit owe, plus 3.8% where it applies. Sales pay capital-gains rates, up to 25% on depreciation taken, and 3.8% where it applies. State tax is 0 until you enter it. You can type your own flat rates. Closing costs are a percent of price. FHA insurance is charged on the falling loan balance.</li>
      <li>Interest-only and short loans come due: the balance left is refinanced at the refinance rate and term below, so payments and DSCR change after that month. Commercial tenants repay part of tax, insurance and CAM (NNN %), set on each commercial asset.</li>
      <li>Vacancy defaults to 7%, about the Census Bureau's rental vacancy rate. Business growth defaults to 4% a year, about the Federal Reserve's long-run nominal growth of the economy. Growth rates, management and repair costs are assumptions, not forecasts.</li></ul></details>
    ${colSec(
      'backup',
      'Backup and restore',
      'copy or restore',
      `<section class="card">
      ${notice ? `<div class="warnbox">${esc(notice)}</div>` : ''}
      <button class="btn plain" data-export data-testid="export">${exportOpen ? 'Hide backup' : 'Show backup to copy'}</button>
      ${exportOpen ? `<textarea readonly rows="5" id="bkout" aria-label="Backup data" data-testid="backup-text">${esc(backupJson())}</textarea><button class="btn plain" data-copybackup>Copy backup</button><p class="note" id="cbm">Save this text somewhere safe, such as a note or file. Paste it below to restore.</p>` : ''}
      <label class="btn plain filebtn">Restore from backup file<input type="file" accept="application/json,.json,text/plain" hidden id="imp" aria-label="Choose backup file" data-testid="import-file"></label>
      <textarea rows="2" id="bkin" aria-label="Or paste backup text" placeholder="…or paste backup text here"></textarea><button class="btn plain" data-restore-text>Restore from pasted text</button>
      ${pendingImport ? confirmBox('Replace all current data with this backup?', 'data-import-yes', 'Yes, replace') : ''}
      <p class="note">${(() => {
        try {
          const t = localStorage.getItem('rep-v4-backup');
          return t
            ? 'Backup last shown: ' + new Date(+t).toLocaleDateString()
            : 'No backup yet. Copy one regularly.';
        } catch (e) {
          return '';
        }
      })()}</p></section>`,
      true,
    )}
    ${colSec(
      'samples',
      'Sample portfolios',
      'load a sample',
      `<section class="card" data-testid="samples-card">${SCN.map((sc) => (ask === sc.k ? confirmBox(scnConfirm(sc), 'data-' + sc.k + '-yes', 'Yes, load it') : `<button type="button" class="scn" data-${sc.k} data-testid="${sc.test}"><b>${sc.title}</b><span>${sc.sub}</span></button>`)).join('')}
      <p class="note">Loading one files your current plan in Saved first (as “Portfolio N (before …)”) and shows an Undo, so nothing is lost. The samples keep a few assets already bought, to show the Real page; your default plan starts with nothing bought. Every scenario is funded by the trust: an asset is bought when the pooled cash flow and borrowing room of the assets before it can pay for it. None of them needs outside money for the purchases.</p></section>`,
      true,
    )}
    ${D ? lazySec('safety', 'Safety copies', safeList().length + (safeList().length === 1 ? ' copy' : ' copies'), safetyCard, true) : ''}
    ${D ? lazySec('report', 'Report a problem', 'copy a bug report', reportCard, true) : ''}`;
  }


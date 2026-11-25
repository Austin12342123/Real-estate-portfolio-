  /* ---------- Buy order: every planned asset in one list, across homes, commercial and businesses. The list order IS the buy order (E.reorder); an asset is never bought before one above it. ---------- */
  function orderPage() {
    const pl = PLAN(S),
      list = S.houses.filter((h) => h.status !== 'owned'),
      n = list.length;
    const rows = list
      .map((h, i) => {
        const vd = verdictFor(pl, h),
          tr = pl.trust[h.id],
          type = h.type || 'house',
          P = 'h.' + h.id + '.',
          sold = !!(pl.exits[h.id] && pl.sellAt[h.id] <= pl.planM);
        const when = !tr || !tr.ok ? 'never funded in the plan' : 'funded ' + mond(tr.month),
          why = vd.why ? ' · ' + esc(vd.why) : '';
        return `<div class="rw" data-rw="${h.id}"><div class="row ord" data-row="${h.id}" data-testid="order-row" data-pos="${i + 1}"><div class="r1"><span class="nm"><button type="button" class="draghandle" data-testid="order-handle" aria-label="Hold and drag to move ${esc(h.addr)}">⋮⋮</button><span class="addr" data-go="h/${h.id}" data-testid="order-name"><b class="bn" data-testid="order-no" aria-label="Buy number ${i + 1}">${i + 1}</b>${addrNb(h.addr, '')}</span><span class="pay"><span class="tag">${TL[type]}</span> price ${$c(h.price)}${sold ? ' · sold in the plan' : ''}</span></span></div>
        <div class="r2"><div class="fcol"><span class="locline" data-testid="order-status"><span class="vchip sm ${vd.cls}">${vd.word}</span><span class="vsep" aria-hidden="true"> · </span>${when}${why}</span></div></div>
        <div class="ordact"><button type="button" class="pbtn" data-ordmove="${h.id}:-1" data-testid="order-up" aria-label="Move ${esc(h.addr)} up" ${i === 0 ? 'disabled' : ''}>↑ Up</button><button type="button" class="pbtn" data-ordmove="${h.id}:1" data-testid="order-down" aria-label="Move ${esc(h.addr)} down" ${i === n - 1 ? 'disabled' : ''}>↓ Down</button><button type="button" class="pbtn" data-ordtop="${h.id}" data-testid="order-top" aria-label="Move ${esc(h.addr)} to the top" ${i === 0 ? 'disabled' : ''}>⤒ Top</button>
        <label class="ordto"><span class="lb">Move to #</span><input inputmode="numeric" data-num="1" data-pre="" data-suf="" enterkeyhint="done" autocapitalize="off" autocorrect="off" spellcheck="false" data-testid="order-pos" data-p="${P}pos" data-k="ord-${h.id}" aria-label="Buy position for ${esc(h.addr)}" value="${i + 1}"></label></div></div></div>`;
      })
      .join('');
    return `<div class="top"><button class="ic" data-go="" aria-label="Back" data-testid="order-back">‹</button><h2>Buy order</h2></div>
    <section class="card" data-testid="order-intro"><p class="note" style="margin:0">The first asset is bought first, paid for by the trust from everything above it. Drag a row, use the arrows or type a number. Assets you already own are not in this list.</p></section>
    ${n > 1 ? '<p class="note hold ordhint" data-testid="order-hint">On a phone or tablet, press and hold a row before dragging.</p>' : ''}
    ${n ? `<section class="card ordlist" data-testid="order-list">${rows}</section>` : '<section class="card"><p class="note" style="margin:0" data-testid="order-empty">Nothing is planned yet.</p></section>'}`;
  }


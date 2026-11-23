  /* ---------- import from listing ---------- */
  const PROMPT = `Here is a Zillow listing: <PASTE THE LINK HERE, or paste the listing text / attach screenshots>

Create a file named house.json for my real estate portfolio app. Use only facts you can actually read from the listing. Do not guess. If a value is not shown, set it to null and mark its source "missing". If you can only estimate a value (for example insurance), mark its source "estimate" and say how in "note".

Reply with JSON only, in exactly this format:

{
  "schema": "house-listing/1",
  "listingUrl": "<url or null>",
  "capturedOn": "YYYY-MM-DD",
  "address": "street, city, state zip",
  "price":       { "value": 0, "source": "listing" },
  "rentMonthly": { "value": 0, "source": "listing|estimate|missing", "note": "" },
  "taxAnnual":   { "value": 0, "source": "listing|estimate|missing" },
  "insuranceAnnual": { "value": 0, "source": "listing|estimate|missing" },
  "hoaMonthly":  { "value": 0, "source": "listing|missing" },
  "info": { "beds": 0, "baths": 0, "sqft": 0, "yearBuilt": 0, "propertyType": "" }
}

Money is US dollars as plain numbers. taxAnnual and insuranceAnnual are per YEAR; rentMonthly and hoaMonthly are per MONTH. Do not include interest rate or down payment.`;
  function importPage(id) {
    const target = id === 'new' ? null : H(id),
      res = imp && imp.res;
    const badge = (x) => `<span class="src ${x}">${x}</span>`;
    const preview = !res
      ? ''
      : res.ok
        ? `<section class="card" data-testid="import-preview"><b>Preview of ${esc((imp && imp.name) || 'your file')}</b><br><span class="note">listing = from the page · estimate = a guess</span><table class="cmp">${res.rows.map((x) => `<tr><td>${x[0]}</td><td>${esc(x[1])}</td><td>${badge(x[2])}</td></tr>`).join('')}</table>
      ${res.rows.some((x) => x[2] === 'missing') ? '<p class="note">Anything missing keeps a default; edit it afterward.</p>' : ''}
      <button class="btn" style="width:100%;margin-top:8px" data-apply-listing="${id}" data-testid="import-apply">${target ? 'Fill this house' : 'Add it, then review'}</button></section>`
        : `<div class="warnbox" data-testid="import-error">⚠ ${esc(res.error)}</div>`;
    return `<div class="top"><button class="ic" data-go="${target ? 'h/' + id : ''}" aria-label="Back">‹</button><h2>Import from listing</h2></div>
    <section class="card"><p class="note" style="margin:0 0 6px">Takes about a minute.</p><ol class="steps"><li>Copy the prompt.</li><li>Paste it into a Claude chat with your Zillow link. If Claude cannot open the page, paste the listing text or screenshots instead.</li><li>Save Claude's reply as a <code>.json</code> file and choose it below.</li></ol>
      <button class="btn plain" data-copyprompt data-testid="copy-prompt">Copy Claude prompt</button><p class="note" id="cpm"></p>
      <details><summary class="note" style="font-size:14px;padding:8px 0">Show the prompt</summary><pre class="pre">${esc(PROMPT)}</pre></details>
      <label class="btn ${res && res.ok ? 'plain ' : ''}filebtn" style="margin-top:8px">${res && res.ok ? 'Choose a different file' : 'Choose listing file'}<input type="file" accept=".json,application/json,text/plain" hidden data-listing-file data-testid="import-listing-file" aria-label="Choose listing file"></label>
      <button class="linkbtn" data-togglepaste>${UI.paste ? 'Hide pasted text' : 'Or paste the file contents'}</button>
      ${UI.paste ? `<textarea data-listing-text id="lt" rows="4" aria-label="Paste the listing file contents" placeholder="Paste the JSON Claude gave you"></textarea><button class="btn plain" data-read-listing>Read pasted text</button>` : ''}</section>${preview}`;
  }
  function readListing(text) {
    let o = null;
    try {
      o = JSON.parse(text);
    } catch (e) {
      o = null;
    }
    imp = {
      name: impName,
      res: o === null ? { ok: false, error: 'That text is not valid JSON.' } : E.fromListing(o),
    };
    render();
  }
  function applyListing(id) {
    if (!imp || !imp.res || !imp.res.ok) return;
    const x = imp.res,
      extra = { listingUrl: x.url || '', info: x.info || {}, fresh: false };
    let h = id === 'new' ? null : H(id);
    if (h) Object.assign(h, x.patch, extra);
    else {
      h = E.newHouse(Object.assign({}, x.patch, extra));
      E.register(S, h);
      S.houses.push(h);
    }
    imp = null;
    save();
    goto('h/' + h.id);
  }

  function stageBackup(text) {
    try {
      const d = JSON.parse(text);
      if (!d || !Array.isArray(d.houses) || !d.g) throw 0;
      pendingImport = d;
      notice = '';
    } catch (x) {
      pendingImport = null;
      notice = 'That is not a valid backup. Nothing was changed.';
    }
    render();
  }

/* Build-stamp check (the grader side of v4/stamp.py). The stamp is a short hash of app.js + engine.js + info.js + style.css (each file's own stamp marker left out),
   written into each of those files and into the service worker cache name. check(dir) re-computes it and reports every file whose stamp is stale, so an edit
   without a restamp is caught. Never writes anything: the grader re-stamps nothing. */
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const FILES = [['app', 'app.js'], ['engine', 'engine.js'], ['info', 'info.js'], ['css', 'style.css']];
const MARK = /\/\*STAMP\*\/[\s\S]*?\/\*ENDSTAMP\*\//g, EMPTY = '/*STAMP*//*ENDSTAMP*/';
const stampOf = (t) => { const m = /\/\*STAMP\*\/[\s\S]*?\/\*ENDSTAMP\*\//.exec(t), r = m && /[0-9a-f]{8}/.exec(m[0]); return r ? r[0] : null; };
function check(dir) {
  dir = dir || path.resolve(__dirname, '../v4');
  const texts = FILES.map(([, fn]) => fs.readFileSync(path.join(dir, fn), 'utf8')), h = crypto.createHash('sha1');
  FILES.forEach(([name], i) => { h.update(name + '\0'); h.update(Buffer.from(texts[i].replace(MARK, EMPTY), 'utf8')); h.update('\0'); });
  const want = h.digest('hex').slice(0, 8), got = {}, stale = [];
  FILES.forEach(([name, fn], i) => { got[name] = stampOf(texts[i]); if (got[name] !== want) stale.push(fn); });
  const sw = fs.readFileSync(path.join(dir, 'sw.js'), 'utf8'), m = /const CACHE = '([^']*)' \+ \/\*STAMP\*\/'([0-9a-f]*)'\/\*ENDSTAMP\*\//.exec(sw);
  const swStamp = m ? m[2] : null, swName = m ? m[1] + m[2] : null; if (swStamp !== want) stale.push('sw.js');
  return { ok: stale.length === 0, want, got, sw: swStamp, swName, stale, agree: FILES.every(([n]) => got[n] === got.app) };
}
module.exports = { check, FILES };
if (require.main === module) { const r = check(); console.log(r.ok ? 'stamps ok ' + r.want : 'STALE stamps: ' + r.stale.join(', ') + ' (want ' + r.want + '; run: cd v4 && python3 stamp.py)'); process.exit(r.ok ? 0 : 1); }

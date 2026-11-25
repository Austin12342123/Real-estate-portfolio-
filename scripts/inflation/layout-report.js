'use strict';
// Prints the real layout of each source file (no parsing assumptions) so README.md can be checked.
// Usage: node scripts/inflation/layout-report.js [outfile]
const fs = require('fs');
const { URLS } = require('./fetch');
const { readXlsx } = require('./xlsx');

const UA = process.env.BLS_USER_AGENT || 'inflation-data-pipeline (GitHub Actions; repository maintainers)';
const out = [];
const log = s => { out.push(s); console.log(s); };

async function get(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA }, redirect: 'follow', signal: AbortSignal.timeout(60000) });
  log(`GET ${url}\n  -> HTTP ${res.status} ${res.headers.get('content-type')}`);
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return Buffer.from(await res.arrayBuffer());
}
async function section(name, fn) {
  log('\n===== ' + name);
  try { await fn(); } catch (e) { log('  FAILED: ' + e.message); }
}

(async () => {
  const y = new Date().getUTCFullYear();
  await section('Cleveland Fed xlsx', async () => {
    const buf = await get(URLS.cleveland);
    log('  bytes ' + buf.length + ', parsing');
    for (const sh of readXlsx(buf)) {
      log(`  SHEET "${sh.name}" rows=${sh.rows.length}`);
      sh.rows.slice(0, 6).forEach((r, i) => log(`    row${i}: ` + JSON.stringify(r).slice(0, 700)));
      log('    last row: ' + JSON.stringify(sh.rows[sh.rows.length - 1]).slice(0, 300));
    }
  });
  for (const [label, url] of [['Treasury real yield CSV', URLS.treasuryReal(y)], ['Treasury nominal yield CSV', URLS.treasuryNominal(y)]]) {
    await section(label, async () => {
      const lines = (await get(url)).toString('utf8').split(/\r?\n/).filter(Boolean);
      log(`  lines ${lines.length}`);
      lines.slice(0, 3).forEach(l => log('  ' + l));
    });
  }
  await section('BLS CPI flat file', async () => {
    const lines = (await get(URLS.blsCpi)).toString('utf8').split(/\r?\n/);
    log('  header: ' + JSON.stringify(lines[0]));
    const cu = lines.filter(l => l.startsWith('CUUR0000SA0'));
    log(`  CUUR0000SA0 rows ${cu.length}; first ${JSON.stringify(cu[0])}; last ${JSON.stringify(cu[cu.length - 1])}`);
  });
  await section('Philadelphia Fed SPF release pages', async () => {
    const now = new Date(), q = Math.floor(now.getUTCMonth() / 3) + 1;
    for (let k = 0, yy = y, qq = q; k < 4; k++, qq--) {
      if (qq < 1) { qq = 4; yy--; }
      const u = URLS.spfRelease(qq, yy);
      try {
        const t = (await get(u)).toString('utf8');
        const text = t.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
        log('  text length ' + text.length);
        for (const m of text.matchAll(/.{0,160}(10[- ]year|long[- ]term).{0,260}/gi)) { log('  CTX: ' + m[0]); if (out.length > 400) break; }
        const links = [...t.matchAll(/href="([^"]+\.(?:xlsx?|csv|pdf))"/gi)].map(m => m[1]);
        log('  data links: ' + JSON.stringify([...new Set(links)].slice(0, 30)));
        break;
      } catch (e) { log('  ' + u + ' failed: ' + e.message); }
    }
  });
  await section('Philadelphia Fed SPF landing page links', async () => {
    const t = (await get('https://www.philadelphiafed.org/surveys-and-data/real-time-data-research/survey-of-professional-forecasters')).toString('utf8');
    const links = [...t.matchAll(/href="([^"]*(?:spf|long-term|cpi10|mean|median)[^"]*)"/gi)].map(m => m[1]);
    log('  links: ' + JSON.stringify([...new Set(links)].slice(0, 40)));
  });
  if (process.argv[2]) fs.writeFileSync(process.argv[2], out.join('\n') + '\n');
})();

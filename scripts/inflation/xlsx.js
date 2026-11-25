'use strict';
// Minimal .xlsx reader (zip + XML), no dependencies. readXlsx(buffer) -> [{name, rows:[[cell,...],...]}].
const zlib = require('zlib');

function unzip(buf) {
  let e = buf.length - 22;
  while (e >= 0 && buf.readUInt32LE(e) !== 0x06054b50) e--;
  if (e < 0) throw new Error('xlsx: not a zip file');
  const n = buf.readUInt16LE(e + 10);
  let p = buf.readUInt32LE(e + 16);
  const files = {};
  for (let i = 0; i < n; i++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error('xlsx: bad central directory');
    const method = buf.readUInt16LE(p + 10), csize = buf.readUInt32LE(p + 20);
    const nlen = buf.readUInt16LE(p + 28), elen = buf.readUInt16LE(p + 30), clen = buf.readUInt16LE(p + 32);
    const off = buf.readUInt32LE(p + 42);
    const name = buf.toString('utf8', p + 46, p + 46 + nlen);
    const ds = off + 30 + buf.readUInt16LE(off + 26) + buf.readUInt16LE(off + 28);
    const raw = buf.subarray(ds, ds + csize);
    files[name] = method === 0 ? raw : zlib.inflateRawSync(raw);
    p += 46 + nlen + elen + clen;
  }
  return files;
}

const unesc = s => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');

function colIndex(ref) {
  const m = /^([A-Z]+)/.exec(ref); let n = 0;
  for (const ch of m[1]) n = n * 26 + ch.charCodeAt(0) - 64;
  return n - 1;
}

function readXlsx(buf) {
  const f = unzip(buf);
  const txt = k => (f[k] ? f[k].toString('utf8') : '');
  const shared = [];
  for (const m of txt('xl/sharedStrings.xml').matchAll(/<si>([\s\S]*?)<\/si>/g)) {
    shared.push(unesc([...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map(x => x[1]).join('')));
  }
  const wb = txt('xl/workbook.xml');
  const rels = txt('xl/_rels/workbook.xml.rels');
  const relTarget = {};
  for (const m of rels.matchAll(/<Relationship\b[^>]*>/g)) {
    const id = /Id="([^"]+)"/.exec(m[0]), t = /Target="([^"]+)"/.exec(m[0]);
    if (id && t) relTarget[id[1]] = t[1].replace(/^\/?(xl\/)?/, 'xl/');
  }
  const sheets = [];
  for (const m of wb.matchAll(/<sheet\b[^>]*>/g)) {
    const name = /name="([^"]*)"/.exec(m[0]), rid = /r:id="([^"]+)"/.exec(m[0]);
    if (!name || !rid || !relTarget[rid[1]]) continue;
    const xml = txt(relTarget[rid[1]]);
    const rows = [];
    for (const r of xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
      const row = [];
      for (const c of r[1].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
        const ref = /r="([A-Z]+\d+)"/.exec(c[1]); if (!ref) continue;
        const t = /t="(\w+)"/.exec(c[1]);
        const v = c[2] ? /<v>([\s\S]*?)<\/v>/.exec(c[2]) : null;
        const is = c[2] ? /<is>[\s\S]*?<t[^>]*>([\s\S]*?)<\/t>/.exec(c[2]) : null;
        let val = null;
        if (t && t[1] === 's' && v) val = shared[Number(v[1])];
        else if (t && t[1] === 'inlineStr' && is) val = unesc(is[1]);
        else if (v) val = t && (t[1] === 'str' || t[1] === 'e') ? unesc(v[1]) : Number(v[1]);
        row[colIndex(ref[1])] = val;
      }
      rows.push(row);
    }
    sheets.push({ name: unesc(name[1]), rows });
  }
  return sheets;
}

// Excel serial day number -> 'YYYY-MM-DD'.
function excelDate(n) { return new Date(Math.round((n - 25569) * 86400000)).toISOString().slice(0, 10); }

// Build a tiny xlsx in memory (used by tests as a fixture). sheets: [{name, rows}] with string/number cells.
function writeXlsx(sheets) {
  const strs = [], idx = s => { let i = strs.indexOf(s); if (i < 0) { i = strs.length; strs.push(s); } return i; };
  const colName = i => (i >= 26 ? String.fromCharCode(64 + Math.floor(i / 26)) : '') + String.fromCharCode(65 + (i % 26));
  const parts = {};
  parts['xl/workbook.xml'] = '<workbook><sheets>' + sheets.map((s, i) => `<sheet name="${s.name}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('') + '</sheets></workbook>';
  parts['xl/_rels/workbook.xml.rels'] = '<Relationships>' + sheets.map((s, i) => `<Relationship Id="rId${i + 1}" Target="worksheets/sheet${i + 1}.xml"/>`).join('') + '</Relationships>';
  sheets.forEach((s, i) => {
    parts[`xl/worksheets/sheet${i + 1}.xml`] = '<worksheet><sheetData>' + s.rows.map((row, r) => `<row r="${r + 1}">` + row.map((v, c) => v == null ? '' : typeof v === 'number' ? `<c r="${colName(c)}${r + 1}"><v>${v}</v></c>` : `<c r="${colName(c)}${r + 1}" t="s"><v>${idx(v)}</v></c>`).join('') + '</row>').join('') + '</sheetData></worksheet>';
  });
  parts['xl/sharedStrings.xml'] = '<sst>' + strs.map(s => `<si><t>${s}</t></si>`).join('') + '</sst>';
  const crc = b => { let c, t = [], x = 0xffffffff; for (let n = 0; n < 256; n++) { c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } for (const byte of b) x = t[(x ^ byte) & 255] ^ (x >>> 8); return (x ^ 0xffffffff) >>> 0; };
  const locals = [], central = []; let off = 0;
  for (const [name, text] of Object.entries(parts)) {
    const data = zlib.deflateRawSync(Buffer.from(text)), raw = Buffer.from(text), nb = Buffer.from(name);
    const lh = Buffer.alloc(30); lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(8, 8);
    lh.writeUInt32LE(crc(raw), 14); lh.writeUInt32LE(data.length, 18); lh.writeUInt32LE(raw.length, 22); lh.writeUInt16LE(nb.length, 26);
    const ch = Buffer.alloc(46); ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6); ch.writeUInt16LE(8, 10);
    ch.writeUInt32LE(crc(raw), 16); ch.writeUInt32LE(data.length, 20); ch.writeUInt32LE(raw.length, 24); ch.writeUInt16LE(nb.length, 28); ch.writeUInt32LE(off, 42);
    locals.push(lh, nb, data); central.push(ch, nb); off += 30 + nb.length + data.length;
  }
  const cd = Buffer.concat(central), end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(Object.keys(parts).length, 8); end.writeUInt16LE(Object.keys(parts).length, 10);
  end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(off, 16);
  return Buffer.concat([...locals, cd, end]);
}

module.exports = { readXlsx, writeXlsx, excelDate };

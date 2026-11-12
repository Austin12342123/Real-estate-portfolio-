/* Independent reference for the app's one clock: month 0 = today, month N = today + N calendar months (same day of month, or the last day of a shorter month), shown MM/DD/YY. Integer math, no Date arithmetic. */
const TODAY = '2026-11-12'; /* the graders pin the app's "today" with window.REP_TODAY */
const dim = (y, m) => [31, (y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0)) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1];
function dateAt(m, today) { const [y0, m0, d0] = (today || TODAY).split('-').map(Number); const k = (y0 * 12 + (m0 - 1)) + Math.round(m), y = Math.floor(k / 12), mo = (k % 12) + 1, d = Math.min(d0, dim(y, mo)); return [mo, d, y]; }
const fmt = (m, today) => { const [mo, d, y] = dateAt(m, today); return String(mo).padStart(2, '0') + '/' + String(d).padStart(2, '0') + '/' + String(y % 100).padStart(2, '0'); };
const mond = (m, today) => (m <= 0 ? 'now (' + fmt(0, today) + ')' : 'month ' + m + ' (' + fmt(m, today) + ')');
module.exports = { TODAY, dateAt, fmt, mond };

/* Independent reference for the app's one clock: month 0 = today, month N = today + N calendar months (same day of month, or the last day of a shorter month), shown 'Nov 12, 2026' (long) / 'Nov 2026' (month only). Integer math, no Date arithmetic. */
const TODAY = '2026-11-12'; /* the graders pin the app's "today" with window.REP_TODAY */
const dim = (y, m) => [31, (y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0)) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1];
function dateAt(m, today) { const [y0, m0, d0] = (today || TODAY).split('-').map(Number); const k = (y0 * 12 + (m0 - 1)) + Math.round(m), y = Math.floor(k / 12), mo = (k % 12) + 1, d = Math.min(d0, dim(y, mo)); return [mo, d, y]; }
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmt = (m, today) => { const [mo, d, y] = dateAt(m, today); return MON[mo - 1] + ' ' + d + ', ' + y; };
const fmtM = (m, today) => { const [mo, , y] = dateAt(m, today); return MON[mo - 1] + ' ' + y; };
const mond = (m, today) => (m <= 0 ? 'today' : 'month ' + m + ' (' + fmtM(m, today) + ')');
module.exports = { TODAY, dateAt, fmt, fmtM, mond };

/* Pure helper: derive a US state code from a free-text address. CommonJS + browser global. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.MFState = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  var N = {AL:'Alabama',AK:'Alaska',AZ:'Arizona',AR:'Arkansas',CA:'California',CO:'Colorado',CT:'Connecticut',DE:'Delaware',DC:'District of Columbia',FL:'Florida',GA:'Georgia',HI:'Hawaii',ID:'Idaho',IL:'Illinois',IN:'Indiana',IA:'Iowa',KS:'Kansas',KY:'Kentucky',LA:'Louisiana',ME:'Maine',MD:'Maryland',MA:'Massachusetts',MI:'Michigan',MN:'Minnesota',MS:'Mississippi',MO:'Missouri',MT:'Montana',NE:'Nebraska',NV:'Nevada',NH:'New Hampshire',NJ:'New Jersey',NM:'New Mexico',NY:'New York',NC:'North Carolina',ND:'North Dakota',OH:'Ohio',OK:'Oklahoma',OR:'Oregon',PA:'Pennsylvania',RI:'Rhode Island',SC:'South Carolina',SD:'South Dakota',TN:'Tennessee',TX:'Texas',UT:'Utah',VT:'Vermont',VA:'Virginia',WA:'Washington',WV:'West Virginia',WI:'Wisconsin',WY:'Wyoming'};
  var byName = {};
  Object.keys(N).forEach(function (k) { byName[N[k].toLowerCase()] = k; });
  // Longest names first so "west virginia" wins over "virginia".
  var names = Object.keys(byName).sort(function (a, b) { return b.length - a.length; });
  function stateFromAddress(addr) {
    if (typeof addr !== 'string') return null;
    var s = addr.replace(/[. ]/g, ' ').replace(/\s+/g, ' ').trim();
    s = s.replace(/[\s,]*(USA|US|United States)$/i, '').trim();
    s = s.replace(/[\s,]*\d{5}(-\d{4})?$/, '').trim(); // drop trailing ZIP
    s = s.replace(/[\s,]+$/, '');
    var m = s.match(/(?:^|[\s,])([A-Za-z]{2})$/);
    if (m) { var c = m[1].toUpperCase(); if (N[c]) return c; }
    var low = s.toLowerCase();
    for (var i = 0; i < names.length; i++) {
      var n = names[i];
      if (low === n || low.slice(-(n.length + 1)) === ' ' + n || low.slice(-(n.length + 1)) === ',' + n) return byName[n];
    }
    return null;
  }
  return { stateFromAddress: stateFromAddress, STATES: N };
});

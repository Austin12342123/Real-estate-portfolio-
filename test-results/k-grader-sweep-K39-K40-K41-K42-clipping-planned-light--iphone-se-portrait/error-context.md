# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: k-grader.spec.js >> sweep K39 K40 K41 K42 clipping: planned (light)
- Location: tests/e2e/k-grader.spec.js:18:3

# Error details

```
Error: K42 planned@320x568 light

expect(received).toEqual(expected) // deep equality

- Expected  - 1
+ Received  + 7

- Array []
+ Array [
+   "small text SMALL=10px",
+   "small text pay=11.5px",
+   "small text SMALL=10px",
+   "small text pay=11.5px",
+   "small text SMALL=10px",
+ ]
```

# Page snapshot

```yaml
- main [ref=f1e2]:
  - generic [ref=f1e3]:
    - generic [ref=f1e4]: Portfolio
    - generic [ref=f1e5]:
      - button "Reorder the buy order" [ref=f1e6] [cursor=pointer]:
        - generic [aria-hidden]: ⇅
        - generic: Reorder
      - button "Finances" [ref=f1e7] [cursor=pointer]
      - button "Settings" [ref=f1e8] [cursor=pointer]: ⚙
  - heading "Portfolio" [level=1] [ref=f1e9]
  - tablist "Portfolio pages" [ref=f1e10]:
    - tab "Planned" [selected] [ref=f1e11] [cursor=pointer]
    - tab "Real" [ref=f1e12] [cursor=pointer]
    - tab "Saved" [ref=f1e13] [cursor=pointer]
  - generic [ref=f1e14]:
    - complementary [ref=f1e15]:
      - generic [ref=f1e16]:
        - paragraph [ref=f1e17]:
          - text: 2026*
          - button "What does Show figures in mean?" [ref=f1e18] [cursor=pointer]:
            - generic [aria-hidden] [ref=f1e19]: i
        - generic [ref=f1e20]:
          - generic [ref=f1e21]:
            - generic [ref=f1e22]:
              - text: Net
              - generic [ref=f1e23]:
                - text: worth
                - button "What does Net worth mean?" [ref=f1e24] [cursor=pointer]:
                  - generic [aria-hidden] [ref=f1e25]: i
            - generic [ref=f1e26]: $45,000
            - generic [ref=f1e27]: $317.4M at year 28
          - generic [ref=f1e28]:
            - generic [ref=f1e29]:
              - text: Cash flow /
              - generic [ref=f1e30]:
                - text: mo
                - button "What does Cash flow mean?" [ref=f1e31] [cursor=pointer]:
                  - generic [aria-hidden] [ref=f1e32]: i
            - generic [ref=f1e33]: +$1,192,171
        - link "Can I afford this? You can carry this plan. Yes ›" [ref=f1e34] [cursor=pointer]:
          - generic [ref=f1e35]:
            - generic [ref=f1e36]: Can I afford this?
            - generic [ref=f1e37]: You can carry this plan.
          - generic [ref=f1e38]:
            - generic [ref=f1e39]: "Yes"
            - text: ›
        - button "Details ▸" [ref=f1e40] [cursor=pointer]
      - generic [ref=f1e41]:
        - generic [ref=f1e42]:
          - heading [level=2] [ref=f1e43]:
            - text: Health
            - button "What does Checks and safe ranges mean?" [ref=f1e44] [cursor=pointer]:
              - generic [aria-hidden] [ref=f1e45]: i
          - button "Details ▸" [ref=f1e46] [cursor=pointer]
        - paragraph [ref=f1e47]: ✓ All 10 checks are in the safe range
      - button "More figures" [ref=f1e49] [cursor=pointer]:
        - generic [aria-hidden]: ›
      - generic [ref=f1e51]:
        - button "Sold" [ref=f1e52] [cursor=pointer]:
          - generic [aria-hidden] [ref=f1e55]: ›
        - generic "Latest added, for information only":
          - generic: "1"
          - generic:
            - generic: +$21,093
            - generic: cash profit
    - generic [ref=f1e56]:
      - heading "The buy order" [level=2] [ref=f1e58]
      - generic [ref=f1e59]:
        - generic [ref=f1e60]:
          - button "Homes" [expanded] [ref=f1e61] [cursor=pointer]:
            - generic [aria-hidden] [ref=f1e64]: ›
          - generic "Latest added, for information only": 12 homes · +$1,719/mo · $1.76M
        - generic [ref=f1e65]:
          - generic [ref=f1e67] [cursor=pointer]:
            - generic [ref=f1e68]:
              - button "Buy number 1 1412 Maple Ridge Dr $35,000 · $470/mo rent · +$25K reno" [ref=f1e70]:
                - generic [ref=f1e71]:
                  - generic "Buy number 1" [ref=f1e72]: "1"
                  - text: 1412 Maple Ridge
                  - generic [ref=f1e73]:
                    - text: Dr
                    - generic [aria-hidden] [ref=f1e74]: edit ›
                - generic [ref=f1e75]: $35,000 · $470/mo rent · +$25K reno
              - generic [ref=f1e76]:
                - generic [ref=f1e77]: +$64/mo
                - generic [ref=f1e78]: Positive income
            - generic [ref=f1e79]:
              - generic [ref=f1e81]:
                - generic [ref=f1e82]: Possible
                - text: · uses $20,378 saved cash ·
                - generic [ref=f1e83]: in 6 mo (May 2027)
              - button "Extra payment" [ref=f1e84]: Extra ▾
          - generic [ref=f1e86] [cursor=pointer]:
            - generic [ref=f1e87]:
              - button "Buy number 2 2207 Cedar Hollow Ln $45,000 · $570/mo rent · +$30K reno" [ref=f1e89]:
                - generic [ref=f1e90]:
                  - generic "Buy number 2" [ref=f1e91]: "2"
                  - text: 2207 Cedar Hollow
                  - generic [ref=f1e92]:
                    - text: Ln
                    - generic [aria-hidden] [ref=f1e93]: edit ›
                - generic [ref=f1e94]: $45,000 · $570/mo rent · +$30K reno
              - generic [ref=f1e95]:
                - generic [ref=f1e96]: +$63/mo
                - generic [ref=f1e97]: Positive income
            - generic [ref=f1e98]:
              - generic [ref=f1e100]:
                - generic [ref=f1e101]: Possible
                - text: · needs $40,350 ·
                - generic [ref=f1e102]: in 11 mo (Oct 2027)
              - button "Extra payment" [ref=f1e103]: Extra ▾
          - generic [ref=f1e105] [cursor=pointer]:
            - generic [ref=f1e106]:
              - button "Buy number 4 3350 Willow Bend Rd $65,000 · $770/mo rent · +$15K reno" [ref=f1e108]:
                - generic [ref=f1e109]:
                  - generic "Buy number 4" [ref=f1e110]: "4"
                  - text: 3350 Willow Bend
                  - generic [ref=f1e111]:
                    - text: Rd
                    - generic [aria-hidden] [ref=f1e112]: edit ›
                - generic [ref=f1e113]: $65,000 · $770/mo rent · +$15K reno
              - generic [ref=f1e114]:
                - generic [ref=f1e115]: +$62/mo
                - generic [ref=f1e116]: Positive income
            - generic [ref=f1e117]:
              - generic [ref=f1e119]:
                - generic [ref=f1e120]: Possible
                - text: · needs $29,950 ·
                - generic [ref=f1e121]: in 18 mo (May 2028)
              - button "Extra payment" [ref=f1e122]: Extra ▾
          - generic [ref=f1e124] [cursor=pointer]:
            - generic [ref=f1e125]:
              - button "Buy number 5 2914 Linden Way $80,000 · $920/mo rent · +$10K reno" [ref=f1e127]:
                - generic [ref=f1e128]:
                  - generic "Buy number 5" [ref=f1e129]: "5"
                  - text: 2914 Linden
                  - generic [ref=f1e130]:
                    - text: Way
                    - generic [aria-hidden] [ref=f1e131]: edit ›
                - generic [ref=f1e132]: $80,000 · $920/mo rent · +$10K reno
              - generic [ref=f1e133]:
                - generic [ref=f1e134]: +$62/mo
                - generic [ref=f1e135]: Positive income
            - generic [ref=f1e136]:
              - generic [ref=f1e138]:
                - generic [ref=f1e139]: Possible
                - text: · needs $28,400 ·
                - generic [ref=f1e140]: in 18 mo (May 2028)
              - button "Extra payment" [ref=f1e141]: Extra ▾
          - generic [ref=f1e143] [cursor=pointer]:
            - generic [ref=f1e144]:
              - button "Buy number 6 5521 Ridgeview Ct $100,000 · $1,170/mo rent" [ref=f1e146]:
                - generic [ref=f1e147]:
                  - generic "Buy number 6" [ref=f1e148]: "6"
                  - text: 5521 Ridgeview
                  - generic [ref=f1e149]:
                    - text: Ct
                    - generic [aria-hidden] [ref=f1e150]: edit ›
                - generic [ref=f1e151]: $100,000 · $1,170/mo rent
              - generic [ref=f1e152]:
                - generic [ref=f1e153]: +$125/mo
                - generic [ref=f1e154]: Positive income
            - generic [ref=f1e155]:
              - generic [ref=f1e157]:
                - generic [ref=f1e158]: Possible
                - text: · needs $29,000 ·
                - generic [ref=f1e159]: in 21 mo (Aug 2028)
              - button "Extra payment" [ref=f1e160]: Extra ▾
          - generic [ref=f1e162] [cursor=pointer]:
            - generic [ref=f1e163]:
              - button "Buy number 7 7702 Sycamore Dr $120,000 · $1,330/mo rent" [ref=f1e165]:
                - generic [ref=f1e166]:
                  - generic "Buy number 7" [ref=f1e167]: "7"
                  - text: 7702 Sycamore
                  - generic [ref=f1e168]:
                    - text: Dr
                    - generic [aria-hidden] [ref=f1e169]: edit ›
                - generic [ref=f1e170]: $120,000 · $1,330/mo rent
              - generic [ref=f1e171]:
                - generic [ref=f1e172]: +$68/mo
                - generic [ref=f1e173]: Positive income
            - generic [ref=f1e174]:
              - generic [ref=f1e176]:
                - generic [ref=f1e177]: Possible
                - text: · needs $27,600 ·
                - generic [ref=f1e178]: in 21 mo (Aug 2028)
              - button "Extra payment" [ref=f1e179]: Extra ▾
          - generic [ref=f1e181] [cursor=pointer]:
            - generic [ref=f1e182]:
              - button "Buy number 8 418 Elm Street $150,000 · $1,630/mo rent" [ref=f1e184]:
                - generic [ref=f1e185]:
                  - generic "Buy number 8" [ref=f1e186]: "8"
                  - text: 418 Elm
                  - generic [ref=f1e187]:
                    - text: Street
                    - generic [aria-hidden] [ref=f1e188]: edit ›
                - generic [ref=f1e189]: $150,000 · $1,630/mo rent
              - generic [ref=f1e190]:
                - generic [ref=f1e191]: +$66/mo
                - generic [ref=f1e192]: Positive income
            - generic [ref=f1e193]:
              - generic [ref=f1e195]:
                - generic [ref=f1e196]: Possible
                - text: · needs $34,500 ·
                - generic [ref=f1e197]: in 29 mo (Apr 2029)
              - button "Extra payment" [ref=f1e198]: Extra ▾
          - generic [ref=f1e200] [cursor=pointer]:
            - generic [ref=f1e201]:
              - 'button "Buy number 9 1412 Maple Ridge Dr #2 $185,000 · $2,120/mo rent" [ref=f1e203]':
                - generic [ref=f1e204]:
                  - generic "Buy number 9" [ref=f1e205]: "9"
                  - text: 1412 Maple Ridge Dr
                  - generic [ref=f1e206]:
                    - text: "#2"
                    - generic [aria-hidden] [ref=f1e207]: edit ›
                - generic [ref=f1e208]: $185,000 · $2,120/mo rent
              - generic [ref=f1e209]:
                - generic [ref=f1e210]: +$223/mo
                - generic [ref=f1e211]: Positive income
            - generic [ref=f1e212]:
              - generic [ref=f1e214]:
                - generic [ref=f1e215]: Possible
                - text: · needs $53,650 ·
                - generic [ref=f1e216]: in 39 mo (Feb 2030)
              - button "Extra payment" [ref=f1e217]: Extra ▾
          - generic [ref=f1e219] [cursor=pointer]:
            - generic [ref=f1e220]:
              - 'button "Buy number 10 2207 Cedar Hollow Ln #2 $225,000 · $2,430/mo rent" [ref=f1e222]':
                - generic [ref=f1e223]:
                  - generic "Buy number 10" [ref=f1e224]: "10"
                  - text: 2207 Cedar Hollow Ln
                  - generic [ref=f1e225]:
                    - text: "#2"
                    - generic [aria-hidden] [ref=f1e226]: edit ›
                - generic [ref=f1e227]: $225,000 · $2,430/mo rent
              - generic [ref=f1e228]:
                - generic [ref=f1e229]: +$102/mo
                - generic [ref=f1e230]: Positive income
            - generic [ref=f1e231]:
              - generic [ref=f1e233]:
                - generic [ref=f1e234]: Possible
                - text: · needs $51,750 ·
                - generic [ref=f1e235]: in 45 mo (Aug 2030)
              - button "Extra payment" [ref=f1e236]: Extra ▾
          - generic [ref=f1e238] [cursor=pointer]:
            - generic [ref=f1e239]:
              - 'button "Buy number 11 908 Birchwood Ct #2 $275,000 · $2,970/mo rent" [ref=f1e241]':
                - generic [ref=f1e242]:
                  - generic "Buy number 11" [ref=f1e243]: "11"
                  - text: 908 Birchwood Ct
                  - generic [ref=f1e244]:
                    - text: "#2"
                    - generic [aria-hidden] [ref=f1e245]: edit ›
                - generic [ref=f1e246]: $275,000 · $2,970/mo rent
              - generic [ref=f1e247]:
                - generic [ref=f1e248]: +$133/mo
                - generic [ref=f1e249]: Positive income
            - generic [ref=f1e250]:
              - generic [ref=f1e252]:
                - generic [ref=f1e253]: Possible
                - text: · needs $63,250 ·
                - generic [ref=f1e254]: in 53 mo (Apr 2031)
              - button "Extra payment" [ref=f1e255]: Extra ▾
          - generic [ref=f1e257] [cursor=pointer]:
            - generic [ref=f1e258]:
              - 'button "Buy number 12 3350 Willow Bend Rd #2 $340,000 · $3,860/mo rent" [ref=f1e260]':
                - generic [ref=f1e261]:
                  - generic "Buy number 12" [ref=f1e262]: "12"
                  - text: 3350 Willow Bend Rd
                  - generic [ref=f1e263]:
                    - text: "#2"
                    - generic [aria-hidden] [ref=f1e264]: edit ›
                - generic [ref=f1e265]: $340,000 · $3,860/mo rent
              - generic [ref=f1e266]:
                - generic [ref=f1e267]: +$409/mo
                - generic [ref=f1e268]: Positive income
            - generic [ref=f1e269]:
              - generic [ref=f1e271]:
                - generic [ref=f1e272]: Possible
                - text: · needs $98,600 ·
                - generic [ref=f1e273]: in 64 mo (Mar 2032)
              - button "Extra payment" [ref=f1e274]: Extra ▾
          - generic [ref=f1e276] [cursor=pointer]:
            - generic [ref=f1e277]:
              - button "Buy number 36 704 Lost Creek Cir, Stone Mountain, GA 30088 $140,000 · $1,887/mo rent · +$17K reno" [ref=f1e279]:
                - generic [ref=f1e280]:
                  - generic "Buy number 36" [ref=f1e281]: "36"
                  - text: 704 Lost Creek Cir, Stone Mountain, GA
                  - generic [ref=f1e282]:
                    - text: "30088"
                    - generic [aria-hidden] [ref=f1e283]: edit ›
                - generic [ref=f1e284]: $140,000 · $1,887/mo rent · +$17K reno
              - generic [ref=f1e285]:
                - generic [ref=f1e286]: +$342/mo
                - generic [ref=f1e287]: Positive income
            - generic [ref=f1e288]:
              - generic [ref=f1e290]:
                - generic [ref=f1e291]: Possible
                - text: · needs $49,200 ·
                - generic [ref=f1e292]: in 269 mo (Apr 2049)
              - button "Extra payment" [ref=f1e293]: Extra ▾
          - button "+ Add home" [ref=f1e294] [cursor=pointer]
          - generic [ref=f1e295]:
            - heading "Monthly income and expenses today" [level=4] [ref=f1e296]
            - generic [ref=f1e297]:
              - generic [ref=f1e298]: Rent per month
              - generic [ref=f1e299]: $20,127
            - generic [ref=f1e300]:
              - generic [ref=f1e301]: Total income (cash flow without any expense)
              - generic [ref=f1e302]: $20,127
            - generic [ref=f1e303]:
              - generic [ref=f1e304]: Vacancy (7% of income)
              - generic [ref=f1e305]: −$1,409
            - generic [ref=f1e306]:
              - generic [ref=f1e307]: Property tax
              - generic [ref=f1e308]: −$2,930
            - generic [ref=f1e309]:
              - generic [ref=f1e310]: Insurance
              - generic [ref=f1e311]: −$1,398
            - generic [ref=f1e312]:
              - generic [ref=f1e313]: Maintenance (1% of price a year)
              - generic [ref=f1e314]: −$1,467
            - generic [ref=f1e315]:
              - generic [ref=f1e316]: Property management (8%)
              - generic [ref=f1e317]: −$1,497
            - generic [ref=f1e318]:
              - generic [ref=f1e319]: Cash flow before the loan payment
              - generic [ref=f1e320]: +$11,426
            - generic [ref=f1e321]:
              - generic [ref=f1e322]: Loan payment (principal and interest)
              - generic [ref=f1e323]: −$9,707
            - generic [ref=f1e324]:
              - generic [ref=f1e325]: Cash flow after all expenses
              - generic [ref=f1e326]: +$1,719
          - paragraph [ref=f1e327]: Hold and drag ⋮⋮ to reorder. An asset is never bought before the ones above it, and they fund it.
      - generic [ref=f1e329]:
        - button "Commercial" [ref=f1e330] [cursor=pointer]:
          - generic [aria-hidden] [ref=f1e333]: ›
        - generic "Latest added, for information only": 9 commercial properties · +$111,414/mo · $48.4M
      - generic [ref=f1e335]:
        - button "Businesses" [ref=f1e336] [cursor=pointer]:
          - generic [aria-hidden] [ref=f1e339]: ›
        - generic "Latest added, for information only": 14 businesses · +$1,079,038/mo · $163.1M
      - generic [ref=f1e340]:
        - text: Portfolio breakdown
        - generic [ref=f1e341]:
          - text: 36 assets · last purchase 269 months from today (Apr 2049)
          - button "What does Last purchase mean?" [ref=f1e342] [cursor=pointer]:
            - generic [aria-hidden] [ref=f1e343]: i
        - generic [ref=f1e345]:
          - generic [ref=f1e346]: Debt 0% of value
          - generic [ref=f1e347]: cap 85%
        - paragraph [ref=f1e348]: "2026*: value and equity at the end of the plan (Nov 2054); cash flow today. Planned prices are today's prices; nothing is inflated."
        - table [ref=f1e349]:
          - rowgroup [ref=f1e350]:
            - row [ref=f1e351]:
              - columnheader [ref=f1e352]
              - columnheader "Value" [ref=f1e353]
              - columnheader "Equity What does Equity mean?" [ref=f1e354]:
                - generic [ref=f1e355]:
                  - text: Equity
                  - button "What does Equity mean?" [ref=f1e356] [cursor=pointer]:
                    - generic [aria-hidden] [ref=f1e357]: i
              - columnheader "Cash flow/mo" [ref=f1e358]
          - rowgroup [ref=f1e360]:
            - row [ref=f1e361]:
              - cell "Single-family homes (12)" [ref=f1e362]
              - cell "$2.13M" [ref=f1e363]
              - cell "$2.13M" [ref=f1e364]
              - cell "+$1,719" [ref=f1e365]
            - row [ref=f1e366]:
              - cell "Commercial properties (9)" [ref=f1e367]
              - cell "$30.8M" [ref=f1e368]
              - cell "$30.8M" [ref=f1e369]
              - cell "+$111,414" [ref=f1e370]
            - row [ref=f1e371]:
              - cell "Businesses (14)" [ref=f1e372]
              - cell "$99.6M" [ref=f1e373]
              - cell "$99.6M" [ref=f1e374]
              - cell "+$1.08M" [ref=f1e375]
            - row [ref=f1e376]:
              - cell "Your savings" [ref=f1e377]
              - cell "$6.23M" [ref=f1e378]
              - cell "$6.23M" [ref=f1e379]
              - cell "+$0" [ref=f1e380]
            - row [ref=f1e381]:
              - cell "Portfolio" [ref=f1e382]
              - cell "$132.5M" [ref=f1e383]
              - cell "$138.7M" [ref=f1e384]
              - cell "+$1.19M" [ref=f1e385]
        - button "What drives net worth ▸" [ref=f1e386] [cursor=pointer]
        - tablist [ref=f1e387]:
          - button "Timeline" [ref=f1e388] [cursor=pointer]
          - button "Net worth" [ref=f1e389] [cursor=pointer]
          - button "Hide" [ref=f1e390] [cursor=pointer]
      - generic [ref=f1e391]:
        - button "Change the buy order" [ref=f1e392] [cursor=pointer]:
          - generic [aria-hidden]: ›
        - button "Import from a listing" [ref=f1e393] [cursor=pointer]:
          - generic [aria-hidden]: ›
        - button "Remove all planned assets" [ref=f1e394] [cursor=pointer]
```

# Test source

```ts
  1   | /* M1.4 Grader checks K38-K58 (prototype/grader/design-grade.js) ported as named Playwright tests. One Playwright project per profile (8), 60 s per test.
  2   |    PORT STATUS: K38-K43, K46, K50 (touch pages) are faithful ports of the grader's measurements (same in-page sweep). K47, K48, K52, K53 are reduced ports (the core assertion, not every sub-rule).
  3   |    K54-K58 are REDUCED: they assert the copy / structure exists on the screen, not the engine-derived numbers. K44 (touch drag) and K45 (screenshots) are not ported (listed as skipped).
  4   |    The grader stays the full authority; these tests exist to name each phone / iPad problem. Real Safari is only exercised in CI (WebKit); a local Chromium stand-in is labelled in the hand-back. */
  5   | const { test, expect } = require('@playwright/test');
  6   | const L = require('./lib');
  7   | const SCHEMES = ['light', 'dark'];
  8   | test.beforeEach(async ({ context }) => { await L.pin(context); });
  9   | const vwOf = (page) => page.viewportSize().width;
  10  | const where = (page, name, sc) => name + '@' + vwOf(page) + 'x' + page.viewportSize().height + (sc ? ' ' + sc : '');
  11  | 
  12  | /* per-screen sweep: ONE page load per screen and colour scheme runs K39 (overflow + clipped), K40 (tap size, light), K41 (contrast), K42 (fonts, radii, input size, light) and the clipping detector.
  13  |    Each rule is an expect.soft with its K-number in the message, so every failure is still named (screen, size, scheme, element). Merged from 5 loads to 1 to fit the 10-minute CI limit; assertions unchanged. */
  14  | const K42_JS = () => { const bad = []; document.querySelectorAll('#app *').forEach((el) => { if (el.closest('svg') || el.closest('.info')) return; const rc = el.getBoundingClientRect(), s = getComputedStyle(el); if (rc.width < 1 || s.display === 'none') return;
  15  |   if ([...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && parseFloat(s.fontSize) < 12) bad.push('small text ' + (el.className || el.tagName) + '=' + s.fontSize);
  16  |   if ((el.tagName === 'INPUT' && !/^(hidden|checkbox|radio|file|range)$/.test(el.type) || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') && parseFloat(s.fontSize) < 16) bad.push('input under 16px (iOS zooms) ' + (el.dataset.p || el.dataset.testid || el.tagName) + '=' + s.fontSize); }); return bad.slice(0, 5); };
  17  | for (const name of L.PAGE_NAMES) for (const sc of SCHEMES) {
  18  |   test('sweep K39 K40 K41 K42 clipping: ' + name + ' (' + sc + ')', async ({ page }) => {
  19  |     await page.emulateMedia({ colorScheme: sc }); await L.goPage(page, name);
  20  |     const r = await page.evaluate(L.SWEEP_JS), clip = await page.evaluate(L.CLIP_JS), w = where(page, name, sc);
  21  |     expect.soft([r.ov ? 'page scrolls sideways' : null].concat(r.wide.slice(0, 3), r.clipped.slice(0, 3)).filter(Boolean), 'K39 ' + w).toEqual([]);
  22  |     expect.soft(clip, 'clipping ' + w).toEqual([]);
  23  |     expect.soft(r.low.slice(0, 3), 'K41 contrast ' + w).toEqual([]);
  24  |     if (sc === 'light') { expect.soft(r.small.slice(0, 6), 'K40 tap targets ' + w).toEqual([]);
> 25  |       expect.soft([].concat(r.fonts.slice(0, 3), r.radii.slice(0, 3), await page.evaluate(K42_JS)), 'K42 ' + w).toEqual([]); }
      |                                                                                                                 ^ Error: K42 planned@320x568 light
  26  |   });
  27  | }
  28  | 
  29  | test('K38 layout mode follows the width (phone column < 600, tablet column 600-899, master-detail >= 900)', async ({ page }) => {
  30  |   const w = vwOf(page); await L.goPage(page, 'asset');
  31  |   const T = await page.evaluate(() => { const a = document.getElementById('app'), r = a.getBoundingClientRect(); return { appW: Math.round(r.width), pl: parseFloat(getComputedStyle(a).paddingLeft), mdw: !!document.querySelector('.mdw'), mdd: (() => { const l = document.querySelector('.mdl'), d = document.querySelector('.mdd'); return l && d ? [l.getBoundingClientRect().right, d.getBoundingClientRect().left] : null; })() }; });
  32  |   const msg = where(page, 'asset') + ' ' + JSON.stringify(T);
  33  |   if (w < 600) { expect(T.appW <= Math.min(w, 520) && !T.mdw, msg).toBe(true); }
  34  |   else if (w < 900) { expect(T.appW >= Math.min(w, 720) - 2 && T.appW <= 720 && !T.mdw && T.pl >= 32, msg).toBe(true); }
  35  |   else { expect(T.mdw && T.mdd && T.mdd[0] <= T.mdd[1] + 1, msg).toBe(true); await L.goPage(page, 'planned'); const cols = await page.evaluate(() => getComputedStyle(document.querySelector('#app .pg')).gridTemplateColumns.split(' ').filter(Boolean).length); expect(cols, 'landscape Planned: two columns').toBe(2); }
  36  | });
  37  | test('K38b turning the device changes the layout live (no reload)', async ({ page }) => {
  38  |   const vp = page.viewportSize(); await L.goPage(page, 'asset'); await page.evaluate(() => { window.__stay = 1; });
  39  |   const mode = () => page.evaluate(() => ({ mdw: !!document.querySelector('.mdw'), stay: window.__stay === 1, ov: document.documentElement.scrollWidth > innerWidth + 1 }));
  40  |   const a = await mode(); await page.setViewportSize({ width: vp.height, height: vp.width }); await page.waitForTimeout(250); const b = await mode();
  41  |   expect(b.stay && !b.ov, 'after rotating ' + vp.width + 'x' + vp.height + ' -> ' + vp.height + 'x' + vp.width + ': ' + JSON.stringify(b)).toBe(true);
  42  |   expect(b.mdw, 'master-detail follows the new width (' + vp.height + ')').toBe(vp.height >= 900);
  43  |   expect(a.mdw).toBe(vp.width >= 900);
  44  | });
  45  | test('K43 page tabs float at the bottom on a tablet, inside the screen, and a tap switches page', async ({ page }) => {
  46  |   test.skip(vwOf(page) < 600, 'tablet only');
  47  |   await L.goPage(page, 'planned'); const t = await page.evaluate(() => { const e = document.querySelector('[data-testid=page-tabs]'), r = e.getBoundingClientRect(); return { pos: getComputedStyle(e).position, bottom: r.bottom, vh: innerHeight, h: Math.round(r.height), btnH: Math.min.apply(null, [...e.querySelectorAll('button')].map((b) => Math.round(b.getBoundingClientRect().height))) }; });
  48  |   expect(t.pos, 'tabs position on ' + where(page, 'planned')).toBe('fixed'); expect(t.bottom).toBeLessThanOrEqual(t.vh); expect(t.btnH, 'tab button height >= 48').toBeGreaterThanOrEqual(48);
  49  |   await page.click('[data-testid=tab-real]'); await expect(page.locator('[data-testid=tab-real]')).toHaveAttribute('aria-selected', 'true');
  50  | });
  51  | /* K44 port: WebKit has no CDP, so the touch is dispatched as real PointerEvents (pointerType 'touch') on the row; the app's hold / move / up handlers see the same events a finger produces. */
  52  | const touchSeq = (page, fromSel, toSel, holdMs, steps) => page.evaluate(async ([fromSel, toSel, holdMs, steps]) => {
  53  |   const pt = (sel) => { const r = document.querySelector(sel).getBoundingClientRect(); return { x: r.left + 30, y: r.top + r.height / 2 }; };
  54  |   const f = pt(fromSel), t = pt(toSel), el = document.querySelector(fromSel), sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  55  |   const ev = (type, x, y, tgt) => (tgt || document).dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, composed: true, pointerId: 7, pointerType: 'touch', isPrimary: true, clientX: x, clientY: y, button: 0, buttons: type === 'pointerup' ? 0 : 1 }));
  56  |   ev('pointerdown', f.x, f.y, el); await sleep(holdMs);
  57  |   const lifted = !!document.querySelector('.rw.lift') && document.getElementById('app').classList.contains('dragmode');
  58  |   for (let i = 1; i <= steps; i++) { ev('pointermove', f.x, f.y + (t.y - f.y - 6) * i / steps, document); await sleep(16); }
  59  |   ev('pointerup', f.x, t.y, document); await sleep(150);
  60  |   return { lifted, left: !!document.querySelector('.rw.lift') };
  61  | }, [fromSel, toSel, holdMs, steps]);
  62  | test('K44 touch drag on Buy order: hold lifts a row and a drag reorders it; a quick swipe moves nothing; O / N / ? do nothing on touch', async ({ page }) => {
  63  |   test.skip(vwOf(page) < 600 && page.viewportSize().height < 600 || vwOf(page) < 600, 'the grader runs K44 on iPad only (phone rows scroll off screen in landscape)');
  64  |   const ids = () => page.evaluate(() => [...document.querySelectorAll('[data-testid=order-row]')].map((e) => e.dataset.row));
  65  |   await L.boot(page, L.seedS(), '#order'); const a = await ids();
  66  |   const row = (id) => '[data-row="' + id + '"] [data-testid=order-status]';
  67  |   const r1 = await touchSeq(page, row(a[2]), row(a[0]), 560, 10); const b = await ids();
  68  |   expect(r1.lifted && b[0] === a[2] && b.length === a.length, where(page, 'order') + ' hold 560 ms lifts the row and a drag moves row 3 to the top ' + JSON.stringify([r1, a.slice(0, 3), b.slice(0, 3)])).toBe(true);
  69  |   await L.boot(page, L.seedS(), '#order'); const r2 = await touchSeq(page, row(a[2]), row(a[0]), 0, 6); const c = await ids();
  70  |   expect(c.join() === a.join() && !r2.left, where(page, 'order') + ' a quick swipe moves nothing ' + c.slice(0, 3)).toBe(true);
  71  |   await L.boot(page, L.seedS(), '#'); for (const k of ['o', 'n', 'f', '?', '2']) { await page.keyboard.press(k); await page.waitForTimeout(40); }
  72  |   const st = await page.evaluate(() => ({ h: location.hash, sheet: !!document.querySelector('#infopop'), real: document.querySelector('[data-testid=tab-planned]').getAttribute('aria-selected') }));
  73  |   expect(st.h === '' || st.h === '#', 'O / N / F do not navigate on touch: ' + st.h).toBe(true); expect(!st.sheet && st.real === 'true', '? and 2 do nothing on touch ' + JSON.stringify(st)).toBe(true);
  74  | });
  75  | /* K45 port: every page screenshotted light and dark at this project's size (PNGs go to test-results/, uploaded by CI) */
  76  | test('K45 screenshots of every page, light and dark, at this size', async ({ page }, info) => {
  77  |   test.skip(vwOf(page) < 600, 'the grader runs K45 on iPad only');
  78  |   const bad = []; let n = 0;
  79  |   for (const sc of SCHEMES) { await page.emulateMedia({ colorScheme: sc });
  80  |     for (const name of L.PAGE_NAMES) { try { await L.goPage(page, name); const buf = await page.screenshot({ fullPage: false }); if (buf.length < 1000) throw new Error('empty'); await info.attach('v7-' + name + '-' + info.project.name + '-' + sc + '.png', { body: buf, contentType: 'image/png' }); n++; } catch (e) { bad.push(name + ' ' + sc); } } }
  81  |   expect(bad, n + ' screenshots saved').toEqual([]); expect(n).toBe(L.PAGE_NAMES.length * 2);
  82  | });
  83  | 
  84  | test('K46 page margin: gutter >= 20px phone / 32px tablet on every screen', async ({ page }) => {
  85  |   const w = vwOf(page), need = w < 600 ? 20 : 32, bad = [];
  86  |   for (const name of ['planned', 'real', 'saved', 'asset', 'finances', 'assumptions', 'order', 'add', 'import']) {
  87  |     await L.goPage(page, name);
  88  |     const g = await page.evaluate(() => { let minL = 1e9, maxR = 0; document.querySelectorAll('#app *').forEach((el) => { const r = el.getBoundingClientRect(), s = getComputedStyle(el); if (r.width < 1 || r.height < 1 || el.closest('svg') || s.display === 'none' || s.visibility === 'hidden') return; if (s.position !== 'fixed' && !el.closest('.infopop,.toast,.pagetabs,.info,.chint,.dropline')) { minL = Math.min(minL, r.left); maxR = Math.max(maxR, r.right); } }); return [Math.round(minL), Math.round(innerWidth - maxR)]; });
  89  |     if (g[0] < need - 0.5 || g[1] < need - 0.5) bad.push(where(page, name) + ' gutter left/right ' + g.join('/') + ' < ' + need);
  90  |   }
  91  |   expect(bad).toEqual([]);
  92  | });
  93  | test('K47 Planned order: Health, More figures, then Sold directly after it', async ({ page }) => {
  94  |   await L.goPage(page, 'planned');
  95  |   const o = await page.evaluate(() => { const m = document.querySelector('[data-testid=more-figures]'), s = document.querySelector('[data-testid=cat-sold]'); return m && s ? { next: m.nextElementSibling === s } : { miss: true }; });
  96  |   expect(o, where(page, 'planned')).toEqual({ next: true });
  97  | });
  98  | test('K48 cap rate chip (Good / Okay / Low word) on the asset page', async ({ page }) => {
  99  |   await L.goPage(page, 'asset'); const txt = await page.evaluate(() => document.getElementById('app').innerText);
  100 |   expect(/\b(Good|Okay|Low)\b/.test(txt) && /cap rate/i.test(txt), where(page, 'asset') + ' cap rate chip').toBe(true);
  101 | });
  102 | test('K50 one scroll only: no element other than the page scrolls', async ({ page }) => {
  103 |   const bad = [];
  104 |   for (const name of ['planned', 'asset', 'real', 'saved', 'finances', 'assumptions', 'order', 'add', 'import', 'health', 'shortfall']) { await L.goPage(page, name);
  105 |     const r = await page.evaluate(() => [...document.querySelectorAll('body *')].filter((e) => { if (/^(TEXTAREA|SELECT|INPUT|svg)$/i.test(e.tagName) || e.closest('svg') || e.id === 'infopop') return false; const s = getComputedStyle(e); return /(auto|scroll|overlay)/.test(s.overflowY) && e.scrollHeight > e.clientHeight + 1; }).map((e) => (e.className || e.tagName) + ' ' + e.scrollHeight + '>' + e.clientHeight).slice(0, 3));
  106 |     if (r.length) bad.push(where(page, name) + ': ' + r.join(', ')); }
  107 |   expect(bad).toEqual([]);
  108 | });
  109 | test('K52 info popover: opens on tap of (i), sits inside the screen, closes on Escape', async ({ page }) => {
  110 |   await L.goPage(page, 'asset'); const i = page.locator('#app .info, #app [data-info]').first(); await i.scrollIntoViewIfNeeded(); await i.click();
  111 |   const pop = page.locator('#infopop'); await expect(pop, 'popover opens on ' + where(page, 'asset')).toBeVisible();
  112 |   const r = await pop.boundingBox(); const vp = page.viewportSize(); expect(r.x >= 0 && r.x + r.width <= vp.width + 1, 'popover inside the screen ' + JSON.stringify(r)).toBe(true);
  113 |   await page.keyboard.press('Escape'); await expect(pop).toBeHidden();
  114 | });
  115 | test('K53 accent token is calm blue, not red/orange', async ({ page }) => {
  116 |   await L.goPage(page, 'planned');
  117 |   const hues = await page.evaluate(() => { const out = {}; for (const sc of ['light']) { const c = getComputedStyle(document.documentElement).getPropertyValue('--acc').trim(); const cv = document.createElement('canvas').getContext('2d'); cv.fillStyle = c; cv.fillRect(0, 0, 1, 1); const [r, g, b] = cv.getImageData(0, 0, 1, 1).data; const mx = Math.max(r, g, b), mn = Math.min(r, g, b); let h = 0; if (mx !== mn) { const d = mx - mn; h = mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; } out[sc] = Math.round(h); out.c = c; } return out; });
  118 |   expect(hues.light >= 180 && hues.light <= 290, '--acc ' + hues.c + ' hue ' + hues.light).toBe(true);
  119 | });
  120 | 
  121 | /* K54-K58: REDUCED ports (copy / structure exists on the screen) */
  122 | const appText = (page) => page.evaluate(() => document.getElementById('app').innerText);
  123 | test('K54 hero: net worth TODAY; status sentence is not in the hero by default (reduced)', async ({ page }) => {
  124 |   await L.goPage(page, 'planned'); const t = await appText(page);
  125 |   expect(/Nothing bought yet[^\n]*is funded at/.test(t), 'status sentence "Nothing bought yet ... is funded at" must not show in the hero by default').toBe(false);
```
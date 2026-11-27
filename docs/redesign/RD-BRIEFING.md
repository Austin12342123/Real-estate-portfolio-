Cards RD1-RD18 + PE1: the Briefing redesign (Austin approved Nov 27 02:12Z: "Send it", with the page editor added as PE1).
Starts after TH1 v2 lands. Push rule applies (cards/AUTOPUSH.md), card by card.

Design reference (read before RD1):
- Plan doc "Portfolio app redesign plan" (claude.ai artifact KC8ZXyKzQfqVAKSPjo8d5c): what each screen borrows and why, and the phase order below.
- Final mockups: docs/redesign/briefing-v9/ (12 screens x desktop + phone). Graded 92 and 94 (average 93) against Stessa, DealCheck, Baselane, Kubera, BiggerPockets and others; grader notes in docs/redesign/grader/scores-D-v9-g1.md and -g2.md.
- Mockup generator (exact copy, spacing, labels): docs/redesign/source/gen2-v9.py.
- Briefing is a layout, not a theme: it was drawn in Dark Academia, but every color, font and radius comes from the active theme's tokens (TH1 v2). All six themes must work.
- The mockup numbers are illustrative. Every figure on screen comes from the engine. No engine math changes in any RD card; engine-diff must be 0 unless a card says otherwise.

Austin's rules that every RD card keeps:
- Keep every (i) that explains a term or number; no info popup for something already shown.
- Gains and losses show a sign and an arrow, never color alone. Every status shows an icon plus a word.
- Rounded corners on every box; each theme's own font; 4 palette colors.
- Say "current dollars", never "today" (TD1).
- No ads, pricing or upsell. App quality before product.
- 44px tap targets, 16px inputs, no sideways scroll; phone 393px, iPad portrait and landscape, laptop 1280.

Scale (Austin, Nov 27 02:15Z, 100+ assets): every RD card and PE1 meets the scale rule in docs/redesign/SC1.md part A and is tested on fixtures/scale-150 and scale-300.

Phases (each starts once the cards it depends on land; S ~60k, M ~120k, L ~200k):
Phase 1, design kit (after TH1 v2)
- RD1 (M): component kit (tile, card, metric strip, table, chart, empty state) on theme tokens.
- RD2 (S): number formatting and chart style rules, applied to existing screens.
- SC1 (M): 100+ asset fixtures, engine caching and worker, speed budgets in CI (docs/redesign/SC1.md part B). Beside RD1.
Phase 2, navigation (after RD1, M2, AF1)
- RD3 (M): tab bar on phone, side rail on iPad and desktop, account button with Settings, Learn and notes.
- RD4 (M): move existing sections into Home, Properties, Buy, Money and Plan, no figure changes. Build every section as a registered section (see PE1's section registry) so PE1 can move and hide it later.
Phase 3, dashboard (after RD4, C2)
- RD5 (M): headline tiles and the attention list (ranked alerts, each with its fix).
- RD6 (M): net worth chart with ranges, and the allocation ring.
- RD7: folded into PE1 (the page editor covers reordering and hiding Home tiles).
Phase 4, property pages (after RD4, AF1); runs beside phase 3 on separate files
- RD8 (L): property page shell, metric strip, equity or gross switch, Overview tab.
- RD9 (M): Money and Loan tabs (FHA MIP shown in every payment figure).
- RD10 (S): Units and leases, and Notes tabs.
- RD11 (M): spreadsheet view of all assets.
Phase 5, deal analysis (after BA0-BA7 and the Can I buy this? cards)
- RD12 (M): my buy rules and pass or fail rows; results strip before the rules.
- RD13 (S): max offer.
- RD14 (M): what-if sliders and the 10, 20 and 30 year projection.
- RD15 (M): compare planned assets.
Phase 6, reports (alongside tax books); runs beside phase 5
- RD16 (M): property report and portfolio summary with print styles.
- RD17 (M): income statement and cash flow by period, property and bucket.

<!-- Saved from the relayed messages "Part 1 of 7" and "Part 2 of 7" (2026-11-27). Parts 3-7 (RD18, PE1.md, SC1.md and the rest) are appended as they arrive; mockups and grader notes were not included. -->

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

<!-- Saved from the relayed message "Part 1 of 7" (2026-11-27). Parts 2-7 (the individual RD cards, PE1.md and SC1.md) are appended as they arrive; mockups and grader notes were not included. -->

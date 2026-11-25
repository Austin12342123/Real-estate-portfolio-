# Asset flow redesign (design only, nothing changed in the app)

Open asset-flow.html (or the published page "Asset Flow Redesign") for the live designs, every question card, all 21 designs and the grades.

- Main page: each category dropdown shows one summary line (owned cash flow, owned value, next buy) and two buttons, Add an asset and View assets. The Portfolio card shows net worth and trust savings.
- View assets: one card per asset with cash flow and a verdict, a trust bar and months until the trust can buy it, then cap rate, DSCR, cash-on-cash, price, estimated value and down payment (equity for owned). More opens the loan, rent, payment, NOI (or down payment and loan left for owned) and cash needed. Sort by buy order, cash flow, cap rate or DSCR. Every term has its (i).
- Add an asset: a swipeable card deck, 32 cards in six sections (19 for a planned single-family home). The interest rate and loan length sit on the loan card. Picks auto-advance; swipe left for next, right for back. Cards change by type (single, multi-family, commercial, business) and by owned or planned. The review lists every answer with Edit; Edit walks any new cards, then returns to the review.
- Grader (program, stricter round 3): M7 97, L7 100, C7 100.
- Independent reviewer, 15 rounds: from 86 / 80 / 78 to 91 / 90 / 90 (main page / list / cards), all at the 90 bar. The three small items from the last review are fixed too.
- Comparable apps read: DealCheck, Baselane, RentRedi, Lendlord; form research from Smashing Magazine, Fillout, TinyCommand.
- 162 tap tests in tests/ (jsdom, run from a folder next to out/). Source in src/ (build with node src/build.js).
- No PNG screenshots: no browser here could render pages. The live page shows every screen.
- Handing this to the build waits for Austin's yes.

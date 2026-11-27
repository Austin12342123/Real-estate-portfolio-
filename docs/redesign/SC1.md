Card SC1: built for 100+ assets (Austin, Nov 27 02:15Z: "Ensure the new design will allow for a large number of assets. (100+)").
Two parts: (A) a scale rule every RD card and PE1 must meet, checked in its own handback; (B) the SC1 card itself, which runs in Phase 1 beside RD1, so every later card is built and tested against a large portfolio from the start. Push rule (AUTOPUSH.md).

A. Scale rule for every RD card and PE1
Test portfolios: fixtures/scale-150.json and fixtures/scale-300.json (made by SC1), mixed types (homes, duplexes, 4-plexes, businesses, planned and real), several markets and loans. Every card's done-when adds: its screens pass on scale-150 and scale-300 on phone, iPad and laptop, with no clipping and within the budgets below.

- Lists (Properties, Buy order, Compare picker, Add section, page picker items): search box, filters (type, Real or Planned, market or city, loan type, has an alert), sort by any shown figure, and group by type, market, status or loan, with collapsible groups that show a count and a subtotal. Lists over 50 rows are virtualized (only visible rows in the page). Filters, sort and group are saved per page (meta.layout) and shown as chips with Clear.
- Table view: virtualized rows, frozen name column and header, column picker (searchable), totals row for the filtered set, CSV export of what is shown.
- Home rolls up: headline tiles are portfolio totals, never one tile per asset. The attention list shows the top 5 ranked items and "Show all N". The allocation ring shows the 6 biggest groups and folds the rest into "Other (N)", with a tap to break it down. The net worth chart is the portfolio total, with a per-group breakdown on demand.
- Charts with many series show the top 8 and fold the rest into "Other"; legends scroll, never wrap past two lines.
- Property page: a switcher with search and next or previous, so any of 300 assets is two taps away.
- Compare: pick up to 4 assets from a searchable picker.
- Plan and Buy order: rows grouped by year, collapsed past the current and next year.
- Reports: filter by asset, group or market; print pages break per group; a 300-asset report prints without cut rows.
- Page editor: section and column pickers are searchable; edit mode stays smooth at 300 assets.
- Numbers keep their (i), sign plus arrow, and icon plus word at every size.

B. SC1 card (Phase 1, beside RD1; size M, budget 120k; stop and hand back at 120k)
1. Fixtures: scripts/make-scale-fixtures.* writes scale-150 and scale-300 from the engine's own asset types; checked in under fixtures/.

<!-- Saved from the relayed messages "Part 5 of 7" and "Part 6 of 7" (2026-11-27). The rest of part B (items 2 onward, the speed budgets) is appended as it arrives. -->

# Design consistency grader (DESIGN_ONLY)

Run: 2026-11-16T11:00:29.009Z

## K. Design consistency and flow: **98.72 / 100** (separate scale; the multi-family screens against the existing design language)

| ID | Check | Pts | Earned | Detail |
|---|---|---|---|---|
| K1 | Colours come only from the existing CSS variables: no hard-coded colour in the new CSS rules or in the new screens' inline styles, and every var() used is a defined token | 3.85 | 3.85 | 5/5 sub-checks pass |
| K2 | Every piece of text on the new screens has contrast >= 4.5:1 in light and dark mode (greyed options, chips, hints, tables, the guide) | 4.49 | 4.49 | 2/2 sub-checks pass |
| K3 | The new UI is built from the existing components: field rows (label + (i) + box), .card sections with the same collapsible header, segmented controls like Home / Commercial / Business, chips, loan cards with an (i), the cmp table, the warning box; at most a handful of new classes, all defined with tokens | 5.13 | 5.13 | 7/7 sub-checks pass |
| K4 | Tap targets are >= 44px and nothing scrolls sideways at 320, 390 and 430 on every new screen; nothing is wider than its card | 3.85 | 3.85 | 6/6 sub-checks pass |
| K5 | No text overlaps: the bounding boxes of every line of text on the new screens (and the greyed reasons, chips, table cells, (i) buttons) never collide, at 320 and 390 | 3.85 | 3.85 | 2/2 sub-checks pass |
| K6 | Spacing, font sizes and corner radii on the new screens come from the sets the existing screens already use (no new size, margin, padding or radius) | 3.85 | 2.56 | 2/3 sub-checks pass. FAIL: margins and paddings (1 2 4 5 6 8 10 12 14 16 20 34 34.6 37.2 79.1 79.6 80.1 83.9 94.4 95.8 98.8 102.7 116.1 121.3 132.7 138.5 140.5 141.8 152 155.2 167.9 168.4 169.5 189 212.3 212.4) are all on the existing scale [new: 102.7,212.3,168.4,140.5,98.8,116.1,37.2,83.9,167.9,79.1,79.6,121.3,141.8,80.1,212.4,152,34.6,94.4,169.5,95.8,132.7] |
| K7 | The same state looks the same: the new Single / Multi and Building / Pack controls match the Home / Commercial / Business tabs; a selected multi-family loan card matches a selected single-family card; greyed cards are visibly different but readable | 2.56 | 2.56 | 4/4 sub-checks pass |
| K8 | No walls of text on the new screens: every note is short (<= 170 characters), the guide shows scannable rows and a short checklist, and the long explanations live in (i) buttons | 2.56 | 2.56 | 2/2 sub-checks pass |
| K9 | First-time flow: from the Add screen a multi-family asset is 3 taps away (Multi-family, a preset, Add); from the portfolio 3 taps with the default duplex; Back returns without adding anything; presets are one tap; the unit box has the numeric keyboard settings of the other boxes; the result opens on the asset page | 3.21 | 3.21 | 6/6 sub-checks pass |
| K10 | Screenshots (dpr 2) of the new screens at 390 and 320 in light and dark are saved to grader/screens/mf-*.png, full height, with no sideways overflow | 1.92 | 1.92 | 1/1 sub-checks pass |
| K11 | Examples control: colours come only from tokens (no hard-coded colour in its CSS or its inline styles), it reuses the loan card, (i), chip, link-button and empty-line components, and adds at most 2 new classes | 3.85 | 3.85 | 5/5 sub-checks pass |
| K12 | Every piece of text on the example screens (closed line, 4 rows for each category, the chosen line) has contrast >= 4.5:1 in light and dark | 4.49 | 4.49 | 2/2 sub-checks pass |
| K13 | Example screens: every button is >= 44px tall, nothing scrolls sideways or passes the edge, and no two lines of text overlap, at 320, 390 and 430 | 4.49 | 4.49 | 9/9 sub-checks pass |
| K14 | Discreet and short flow: closed by default as one quiet 44px line (the same size and weight as the other link buttons) that adds at most 56px to the Add screen; the Add button stays in the first screen (390x844) wherever it was before; spacing, fonts and radii come from the existing sets; 3 taps to add; Back adds nothing | 4.49 | 4.49 | 9/9 sub-checks pass |
| K15 | Screenshots (dpr 2) of the example screens at 390 and 320 in light and dark are saved to grader/screens/ex-*.png | 1.92 | 1.92 | 1/1 sub-checks pass |
| K16 | Editor reuses the app: colours only from tokens (CSS and inline styles), no new class (only existing card, field, loan select, warning box, tag, chip, button, (i), confirm and live-line components), the loan picker is the same select as the asset page, fields use the same label + (i) + box | 4.49 | 4.49 | 4/4 sub-checks pass |
| K17 | Every piece of text on the editor screens (fields, live line, warnings, tags, confirm, list with Edit and Edited) has contrast >= 4.5:1 in light and dark | 4.49 | 4.49 | 2/2 sub-checks pass |
| K18 | Editor screens: every button, select and box is >= 44px tall, nothing scrolls sideways or passes the edge, no two lines of text overlap, at 320, 390 and 430 (also the list with the Edit buttons) | 4.49 | 4.49 | 9/9 sub-checks pass |
| K19 | Flow and keyboard: first time = open the list, Edit, change a field, Save (4 taps) and the Add button is still there; Back asks before dropping changes and not otherwise; Escape closes; Tab reaches Edit and Enter opens the editor with focus on the first field; Escape returns focus to Edit; short on-screen text (notes <= 170 characters); the long text is in the (i) | 3.85 | 3.85 | 6/6 sub-checks pass |
| K20 | Screenshots (dpr 2) of the editor screens at 390 and 320 in light and dark are saved to grader/screens/ex-edit-*.png | 1.92 | 1.92 | 1/1 sub-checks pass |
| K21 | The safety and report UI adds no CSS of its own: style.css equals the shipped file apart from the build stamp line; no colour, hex or rgb in its templates; every inline style it uses is already used elsewhere in the app | 3.21 | 3.21 | 4/4 sub-checks pass |
| K22 | Every piece of text on the new screens (copies list, confirm, report card, text box, both notices) has contrast >= 4.5:1 in light and dark mode | 4.49 | 4.49 | 2/2 sub-checks pass |
| K23 | Built only from existing components: every class on the new screens is already used by the old screens (card, scard, sname, smeta, sstat, sact, btn, pbtn, plain, chip, link, migrate, warnbox, chips, seg, f, lb, note, confirm, info); no new class; the sections use the same collapsible header | 3.21 | 3.21 | 6/6 sub-checks pass |
| K24 | Tap targets are >= 44px and nothing scrolls sideways or passes the edge at 320, 390 and 430 on every new screen | 3.85 | 3.85 | 6/6 sub-checks pass |
| K25 | No text overlaps on the new screens (copies, confirm, report box, both notices), at 320 and 390 | 3.21 | 3.21 | 2/2 sub-checks pass |
| K26 | Spacing, font sizes and corner radii on the new screens come from the sets the existing screens already use | 2.56 | 2.56 | 3/3 sub-checks pass |
| K27 | Short first-time flow and short text: Assumptions to a copied bug report is 2 taps (open the section, Copy), the Planned notice copies in 1 tap, Restore is 3 taps (open, Restore, confirm); every note on the new screens is <= 170 characters and the long explanations are in the (i) entries | 3.85 | 3.85 | 6/6 sub-checks pass |
| K28 | Screenshots (dpr 2) of the new screens at 390 and 320 in light and dark are saved to grader/screens/diag-*.png | 1.92 | 1.92 | 1/1 sub-checks pass |

### K failures

- **K6 Spacing, font sizes and corner radii on the new screens come from the sets the existing screens already use (no new size, margin, padding or radius)** (-1.29): 2/3 sub-checks pass. FAIL: margins and paddings (1 2 4 5 6 8 10 12 14 16 20 34 34.6 37.2 79.1 79.6 80.1 83.9 94.4 95.8 98.8 102.7 116.1 121.3 132.7 138.5 140.5 141.8 152 155.2 167.9 168.4 169.5 189 212.3 212.4) are all on the existing scale [new: 102.7,212.3,168.4,140.5,98.8,116.1,37.2,83.9,167.9,79.1,79.6,121.3,141.8,80.1,212.4,152,34.6,94.4,169.5,95.8,132.7]
  - Reproduce: collect computed font-size / margin / padding / radius on the existing screens, then on the new screens, and compare the sets

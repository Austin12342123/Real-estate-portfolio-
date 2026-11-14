# Design consistency grader (DESIGN_ONLY)

Run: 2026-11-14T20:45:11.021Z

## K. Design consistency and flow: **100.00 / 100** (separate scale; the multi-family screens against the existing design language)

| ID | Check | Pts | Earned | Detail |
|---|---|---|---|---|
| K1 | Colours come only from the existing CSS variables: no hard-coded colour in the new CSS rules or in the new screens' inline styles, and every var() used is a defined token | 7.06 | 7.06 | 5/5 sub-checks pass |
| K2 | Every piece of text on the new screens has contrast >= 4.5:1 in light and dark mode (greyed options, chips, hints, tables, the guide) | 8.24 | 8.24 | 2/2 sub-checks pass |
| K3 | The new UI is built from the existing components: field rows (label + (i) + box), .card sections with the same collapsible header, segmented controls like Home / Commercial / Business, chips, loan cards with an (i), the cmp table, the warning box; at most a handful of new classes, all defined with tokens | 9.41 | 9.41 | 7/7 sub-checks pass |
| K4 | Tap targets are >= 44px and nothing scrolls sideways at 320, 390 and 430 on every new screen; nothing is wider than its card | 7.06 | 7.06 | 6/6 sub-checks pass |
| K5 | No text overlaps: the bounding boxes of every line of text on the new screens (and the greyed reasons, chips, table cells, (i) buttons) never collide, at 320 and 390 | 7.06 | 7.06 | 2/2 sub-checks pass |
| K6 | Spacing, font sizes and corner radii on the new screens come from the sets the existing screens already use (no new size, margin, padding or radius) | 7.06 | 7.06 | 3/3 sub-checks pass |
| K7 | The same state looks the same: the new Single / Multi and Building / Pack controls match the Home / Commercial / Business tabs; a selected multi-family loan card matches a selected single-family card; greyed cards are visibly different but readable | 4.71 | 4.71 | 4/4 sub-checks pass |
| K8 | No walls of text on the new screens: every note is short (<= 170 characters), the guide shows scannable rows and a short checklist, and the long explanations live in (i) buttons | 4.71 | 4.71 | 2/2 sub-checks pass |
| K9 | First-time flow: from the Add screen a multi-family asset is 3 taps away (Multi-family, a preset, Add); from the portfolio 3 taps with the default duplex; Back returns without adding anything; presets are one tap; the unit box has the numeric keyboard settings of the other boxes; the result opens on the asset page | 5.88 | 5.88 | 6/6 sub-checks pass |
| K10 | Screenshots (dpr 2) of the new screens at 390 and 320 in light and dark are saved to grader/screens/mf-*.png, full height, with no sideways overflow | 3.53 | 3.53 | 1/1 sub-checks pass |
| K11 | Examples control: colours come only from tokens (no hard-coded colour in its CSS or its inline styles), it reuses the loan card, (i), chip, link-button and empty-line components, and adds at most 2 new classes | 7.06 | 7.06 | 5/5 sub-checks pass |
| K12 | Every piece of text on the example screens (closed line, 4 rows for each category, the chosen line) has contrast >= 4.5:1 in light and dark | 8.24 | 8.24 | 2/2 sub-checks pass |
| K13 | Example screens: every button is >= 44px tall, nothing scrolls sideways or passes the edge, and no two lines of text overlap, at 320, 390 and 430 | 8.24 | 8.24 | 9/9 sub-checks pass |
| K14 | Discreet and short flow: closed by default as one quiet 44px line (the same size and weight as the other link buttons) that adds at most 56px to the Add screen; the Add button stays in the first screen (390x844) wherever it was before; spacing, fonts and radii come from the existing sets; 3 taps to add; Back adds nothing | 8.24 | 8.24 | 9/9 sub-checks pass |
| K15 | Screenshots (dpr 2) of the example screens at 390 and 320 in light and dark are saved to grader/screens/ex-*.png | 3.53 | 3.53 | 1/1 sub-checks pass |

### K failures

None.

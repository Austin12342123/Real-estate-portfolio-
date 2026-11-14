# Design consistency grader (DESIGN_ONLY)

Run: 2026-11-14T19:50:19.160Z

## K. Design consistency and flow: **100.00 / 100** (separate scale; the multi-family screens against the existing design language)

| ID | Check | Pts | Earned | Detail |
|---|---|---|---|---|
| K1 | Colours come only from the existing CSS variables: no hard-coded colour in the new CSS rules or in the new screens' inline styles, and every var() used is a defined token | 10.91 | 10.91 | 5/5 sub-checks pass |
| K2 | Every piece of text on the new screens has contrast >= 4.5:1 in light and dark mode (greyed options, chips, hints, tables, the guide) | 12.73 | 12.73 | 2/2 sub-checks pass |
| K3 | The new UI is built from the existing components: field rows (label + (i) + box), .card sections with the same collapsible header, segmented controls like Home / Commercial / Business, chips, loan cards with an (i), the cmp table, the warning box; at most a handful of new classes, all defined with tokens | 14.55 | 14.55 | 7/7 sub-checks pass |
| K4 | Tap targets are >= 44px and nothing scrolls sideways at 320, 390 and 430 on every new screen; nothing is wider than its card | 10.91 | 10.91 | 6/6 sub-checks pass |
| K5 | No text overlaps: the bounding boxes of every line of text on the new screens (and the greyed reasons, chips, table cells, (i) buttons) never collide, at 320 and 390 | 10.91 | 10.91 | 2/2 sub-checks pass |
| K6 | Spacing, font sizes and corner radii on the new screens come from the sets the existing screens already use (no new size, margin, padding or radius) | 10.91 | 10.91 | 3/3 sub-checks pass |
| K7 | The same state looks the same: the new Single / Multi and Building / Pack controls match the Home / Commercial / Business tabs; a selected multi-family loan card matches a selected single-family card; greyed cards are visibly different but readable | 7.27 | 7.27 | 4/4 sub-checks pass |
| K8 | No walls of text on the new screens: every note is short (<= 170 characters), the guide shows scannable rows and a short checklist, and the long explanations live in (i) buttons | 7.27 | 7.27 | 2/2 sub-checks pass |
| K9 | First-time flow: from the Add screen a multi-family asset is 3 taps away (Multi-family, a preset, Add); from the portfolio 3 taps with the default duplex; Back returns without adding anything; presets are one tap; the unit box has the numeric keyboard settings of the other boxes; the result opens on the asset page | 9.09 | 9.09 | 6/6 sub-checks pass |
| K10 | Screenshots (dpr 2) of the new screens at 390 and 320 in light and dark are saved to grader/screens/mf-*.png, full height, with no sideways overflow | 5.45 | 5.45 | 1/1 sub-checks pass |

### K failures

None.

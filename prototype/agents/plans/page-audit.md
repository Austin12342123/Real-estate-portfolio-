# Page audit and redesign map (stage 1, owner impl-design1)
Goal (user, verbatim intent): "Go through every page and determine if there is anything that can be removed ... Remove/restructure/redesign until it looks like a professional app that is modern and sleek. Don't be afraid to conceal information behind a new page, information button, or dropdown menu." Theme chosen: 4 Editorial (serif headlines, ivory/ink, hairline rules), made rounder like theme 3 (Soft Cards).

Legend: KEEP = stays in place; MOVE = moves behind (i) / dropdown ("More details") / sub-page / Health row; REMOVE = dropped from the screen (information is still reachable elsewhere, no number or data is deleted); STAGE = which stage builds it (S1 = this stage, S2+ = later; the DOM and every data-testid stay until the page is rebuilt).

## Research: comparable apps and the 8 patterns adopted
Sources and how reliable they are (search results are mostly review sites; label per integrity I12):
| # | App / source | Pattern seen | Adopted as | Evidence |
|---|---|---|---|---|
| 1 | Monarch (reviews: thecollegeinvestor.com/35342/monarch-review, sacra.com/research/monarch-money) | dashboard leads with net worth and a trend chart, then summary widgets | Hero net worth + sparkline first on Planned; one secondary figure | snippet-only (review sites; no official design doc found) |
| 2 | Copilot Money (9to5mac.com/2026/01/01/..., thepennyhoarder.com review) | "clean, uncluttered dashboard that surfaces what matters"; detail behind tap/charts | One status line, everything else on row tap or a Health row | snippet-only (affiliate reviews; progressive disclosure not confirmed by a design source) |
| 3 | Stessa (realtrends.com/stessa-helps-rental-property-investors, BiggerPockets review) | portfolio "bird's-eye" home showing monthly net cash flow at a glance; per-property detail one tap down | Cash flow as the single secondary hero figure; property rows = name, price, cash flow | snippet-only (2018 press + review) |
| 4 | DealCheck (help.dealcheck.io 2049700 "how to analyze rental properties", 2047838 copy property) | Add Property = a short wizard with several entry routes (manual, import from listing, copy); expenses first as one % then itemised on demand | Add flow = address, price, rent, loan; "More details" groups; import / example demoted to a quiet "Start from..." link | read in the help articles (summary via search) |
| 5 | Zillow listing redesign Oct 2023 (zillow.mediaroom.com, onlinemarketplaces.com) | listing grouped into sections "What's Special / Market Value / Monthly Cost" that open on tap, to limit scrolling; single-scroll key facts first | Asset page: 4 key figures, then collapsed Loan / Rent and costs / Can I buy this? sections | press release (summary via search) |
| 6 | Perchwell listing detail (intercom.help article 12012657) | collapsible tiles: expand to review, collapse to keep the page focused; financial inputs update live | Collapsed cards remember their state; live-updating inputs (already in app) stay | help article (summary via search) |
| 7 | Apple HIG: lists and tables, large titles (developer.apple.com/design/human-interface-guidelines/lists-and-tables) | lists express hierarchy and navigation; keep text short to avoid truncation; large title orients on top-level screens | Grouped list rows with chevrons (Health, Finances, Settings), short row text, large serif title | official page excerpt (via search) |
| 8 | Apple Health / Wallet (memory; the search did not return a Health-specific source: UNVERIFIED) | summary cards that open to a detail screen; one status colour | "Health" row replaces the Checks card: one colour dot + one sentence, tap for the list of only what needs attention | memory, unverified |
| 9 | Editorial layouts (Apple News / Stripe Press, from the mock-up README) | serif headline, italic dek, hairline rules, small-caps labels, 2 columns on desktop | The theme itself | mock-ups themes/theme4-*.png |

## Information order rule (every page)
1. The one answer the page exists for (hero figure or the asset's name and price).
2. One sentence of status (is the plan / this asset okay).
3. The main list or the main inputs.
4. Everything else behind a row with a chevron, an (i), or "More details".

## 1. Planned (Portfolio home)
Target order: masthead -> page tabs -> hero (net worth, "2026*" in the dek) -> one secondary figure (cash flow / mo) -> status line -> afford/Health rows -> buy-order list (Homes open, other categories folded strips) -> More figures -> breakdown -> manage actions.
| element | decision | reason |
|---|---|---|
| Title "Portfolio" + Remove / Finances / gear buttons | KEEP the title and gear; MOVE Finances to a list row; MOVE "Remove" to the bottom Manage area | three competing buttons beside the title; Remove is destructive and rare |
| Reorder buy order button | KEEP, but as a quiet round button next to the list heading | main action for the list, but not a full-width hero button |
| Page tabs Planned / Real / Saved | KEEP as rounded pill segmented control (44 px) | primary navigation |
| 2026* line + (i) | MOVE into the hero dek ("in today's dollars, 2026*") | same fact, no separate line |
| After-tax cash-flow target line (cf-target, plan-target) | MOVE into "More figures" | progress meter, not the first answer |
| KPI grid: net worth | KEEP as hero | main feature |
| KPI: cash flow / mo | KEEP as the one secondary hero figure | the number the user chose as the goal (R11) |
| KPI: total monthly payments, DSCR (+ 4 "alt" year-28 lines) | MOVE into "More figures" fold | secondary; detail numbers |
| "By year N" future-dollars toggle and its two fields | MOVE into "More figures" | rarely changed |
| Plan headline sentence | KEEP as the single status line under the hero | answers "is the plan ok" |
| "Can I afford this?" row | KEEP as list row with chevron | key decision, one tap away |
| Checks card (14 rows) | MOVE behind a "Health" row: one dot + one sentence; Details opens the list; failing items only listed first | most of the time all pass |
| Portfolio total row (ledger-total) | MOVE into More figures (kept in DOM) | duplicates hero cash flow |
| Category sections (Homes / Commercial / Businesses) | KEEP as collapsible strips; Homes open, others folded | already the pattern; restyled |
| Row: number, name, price, rent, cash flow | KEEP | |
| Row: "Positive income" caption under cash flow | REMOVE visually (kept for screen readers) | colour + sign already say it |
| Row: verdict chip / need / when line | KEEP as one quiet muted line (S2: move to asset page) | graders read it; stage 2 rebuilds rows |
| Row "Extra" toggle + panel (extra payment, effects, move, duplicate, remove) | KEEP as a small pill (S2: move to asset page) | gestures grader depends on it |
| "Hold and drag" note, "Buy order" link, Import link | MOVE: note becomes a hint in the list header; links into the Manage area | repeated instructions |
| Cost breakdown tables per category | MOVE (kept) inside the category body below the rows | detail |
| Portfolio breakdown card, bar, drivers, timeline/net-worth tabs | KEEP at the bottom as "Details" card; S2: sub-page | long tail of numbers |

## 2. Real
| element | decision | reason |
|---|---|---|
| Empty state card | KEEP, restyled with one action | |
| KPI grid (4) + unit note | MOVE: net worth hero + cash flow; payments and DSCR in More figures (S2) | same as Planned |
| Loans due / credit line sentence | KEEP as dek | |
| Bought total row, Bought header, per-category strips | KEEP (S2 rebuild) | |
| Add something you already own | KEEP as the list's last row | |

## 3. Saved
| element | decision | reason |
|---|---|---|
| Saved portfolios list | KEEP as grouped list rows (S2) | |
| Backup / restore / safety card | MOVE to a "Backup" sub-page behind a row (S3) | rarely used |
| Report / diagnostics card | MOVE behind "Help and diagnostics" row (S3) | developer information |

## 4. Asset page (planned / owned / selling) - S2, except the job-money section built now
Target: name + price header -> status line (Can the plan buy it?) -> 4 figures (Payment now, Cash flow now, Cash needed, Buy month) -> cards collapsed: Loan, Rent and costs, Your job money in the trust (NEW), Value-add and exit, Impact, Trust section.
| element | decision | reason |
|---|---|---|
| Purchase terms fields | KEEP in "Loan" card | |
| Rent and expense fields, vacancy, management % | MOVE to "Rent and costs" fold | 14 fields at once |
| Auto split lines (h-auto, h-job) | KEEP inside job-money section | explains the default |
| NEW "Your job money in the trust" | ADD (this stage) | user request (b) |
| Sale card, exits, merge | MOVE to "Exit" fold | uncommon |
| Impact / what-if | KEEP, folded | |
| Owned: bought-on, loan due, line of credit, payoff | KEEP, 3 figures first | |

## 5. Add a house (rebuilt now)
| element | decision | reason |
|---|---|---|
| Type segmented control (Home / Commercial / Business) | KEEP, rounded pills | |
| "Have a Zillow listing? Import it" | MOVE to a quiet "Start from a listing or an example" link row | secondary entry route (DealCheck pattern) |
| Home type, units, building-or-pack, presets | MOVE to "More details" (shown inline only when Multi-family chosen) | |
| Blurb "You will set the price and income on the next screen" | REMOVE | explained by the form |
| 22 loan option cards | MOVE behind one "Loan" row showing the chosen option, opening a list sheet | biggest clutter source |
| Loan fit sentences, group headings, "typical not a quote" | MOVE inside the loan sheet; one footnote | |
| "Start from an example" list | MOVE behind a discreet link | |
| Fields: address, price, rent, loan | KEEP as the 4 essentials (address and price/rent are applied on the asset page; see assumption in hand-back) | essentials first |
| Job money section | ADD in More details | request (b) |
| Add button | KEEP, full-width ink pill | |

## 6. Add-owned
| element | decision | reason |
|---|---|---|
| Add-owned note | KEEP as dek | |
| Same loan list | MOVE behind Loan row (shares the new Add layout) | consistency |
| Months already paid | KEEP (asset page) | |

## 7. Import listing
| element | decision | reason |
|---|---|---|
| Paste box + parse result list | KEEP; show parsed fields as grouped rows (S3) | |
| Field source tags (listing/estimate/missing) | MOVE behind (i) (S3) | noise |

## 8. Finances
| element | decision | reason |
|---|---|---|
| "Can I afford this?" verdict + reasons | KEEP at the top | |
| Cash over time chart | KEEP | |
| Your income / cash and expenses / month now vs plan end | MOVE into three collapsed groups (S2) | |
| Outside capital, planned one-time expenses | MOVE behind "Money coming in / going out" rows (S2) | |
| "At plan end" and "What would fix it" (shortfall panel) | KEEP; "what would fix it" as tappable cards | |

## 9. Assumptions (Settings)
| element | decision | reason |
|---|---|---|
| Borrowing, Operating costs, Paying loans down, Units, Who helps qualify | MOVE to grouped list rows each opening a short sub-page (S3) | long single scroll |
| Open the app on | KEEP | |
| Backup export / import | MOVE to Saved > Backup | |

## 10. Checks
Today a card with 14 rows. New: Health row on Planned (this stage); sheet lists only items to look at, "All good" otherwise, with "Show all 14" at the end (S2). Info buttons stay.

## 11. Buy order page
KEEP the drag list; numbers become large serif numerals (S2); the hold-and-drag hint stays as one line. Mouse drag on desktop (S2).

## 12. Shortfall panel ("What would fix it")
KEEP; pull-quote style callout with one figure; options as cards; NEW: if personal job money assigned to homes exceeds job pay left after living costs, a warning line appears here (this stage).

## 13. Saved / backup / diagnostics / report
Moved behind rows (S3). Never auto-expanded; the user can still copy the bug report.

## Stage 1 build list
Design system (tokens, radii, type, components), Planned home, Add flow, job-money engine + UI, desktop layout (>= 900 px) for these two screens. Everything else keeps its DOM and is re-skinned automatically by the tokens.

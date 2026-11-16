# Page order audit (impl-asset, 2026-11-16)
Rule used: the main feature of a page comes first, secondary and destructive items later. "Main feature" = what the user opened the page to see or do. Order read from the rendered DOM at 390 px (Playwright), not from the code.

| page | order found (top to bottom) | main feature | verdict | change applied |
|---|---|---|---|---|
| Planned (Portfolio) | title, page tabs, Buy order link, headline card (2026* net worth, payments, cash flow, DSCR), asset list by category, sold, Checks, Import link, Portfolio breakdown | the headline numbers and the asset list | Buy order (a secondary action) sat above the headline | Buy order link moved down next to Import (after the asset list and Checks). Numbers and list now come first. |
| Real | title, tabs, headline card, ledger, Bought categories, "Add something you already own" | what you really own | already main-first | none |
| Real (empty) | title, tabs, "Nothing bought yet" card | the empty state with the way forward | fine | none |
| Saved | title, tabs, "Saved portfolios", Save card, Clear-planned card, saved list | the saved portfolios and saving the current one | the destructive "Remove every planned asset" card sat between Save and the list | Save card, then the saved list and its note, then the clear card last. |
| Asset page, planned | title, Can I buy this? panel, key numbers (payment, cash flow, DSCR, cap rate), plan for this asset (hold/sell/merge, status, buy position), plan card, purchase, loan, rent and costs, trust funding, value-add and exit, Impact, duplicate, remove | can the plan buy it, then its numbers | fine | none |
| Asset page, bought | title, key numbers, Bought on and loan due, purchase, loan, rent, trust, exit, Impact, duplicate, remove | its numbers and loan state | fine | none |
| Asset page, selling (sold in the plan) | before: title, key numbers, status, then Sale card after the status card | what the sale pays | the Sale card was below the key numbers and status | Sale card now directly under the title (planned and bought assets). |
| Add flow | title, type and home kind, loan options, Start from an example, Add button | choose what to add and add it | fine (the button is last because it is the action after the choices) | none |
| Finances | title, verdict card, Your income, Your cash and expenses, Your month now and at plan end, Cash over time, Taxes, Time and managers, planned expenses, outside capital | can I afford it (verdict), then what the month looks like | the month picture (a result) sat under three input cards | Verdict, then Your month, then the inputs (income, cash), then cash over time and the rest. |
| Assumptions | title, intro note, Show figures in, Open the app on, How the numbers are built, Borrowing, Paying loans down, Who helps you qualify, Operating costs, Backup, Samples, Safety, Report | the lender and cost assumptions the intro tells you to change | display switches and a long explainer came before the assumptions | Borrowing, Paying loans down, Who helps you qualify, Operating costs first; then Show figures in, Open the app on, How the numbers are built; then Backup and the rest. |
| Buy order | title, intro, order list | the list to reorder | fine | none |
| Import from a listing | not reworked | the file picker | out of scope (not in the list the user named) | none |

Checks added: A73 (DOM order of Planned, Saved, Assumptions, Finances) and A69 (Sale card first). Existing graders that depended on the old order were run in the slices listed in the hand-back.

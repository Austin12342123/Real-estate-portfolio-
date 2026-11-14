# UX grader (UX_ONLY)

Run: 2026-11-14T18:45:55.470Z

## J. Dates, number-box math, Checks, sold profit, migration, stretch house: **100.00 / 100** (separate scale)

| ID | Check | Pts | Earned | Detail |
|---|---|---|---|---|
| J31 | Business Total revenue box: an amount plus per month / per year in any common form ("1,200,000/yr", "$1.2M per year", "100k/month", "90000 mo", "15000*12/yr", "1.2m/y") lands as the MONTHLY revenue; a bare trailing m is million, "/m" is a month; "8000/week" is rejected politely; "100/yr/mo" says Check the math and keeps the number | 32.00 | 32.00 | 29/29 sub-checks pass |
| J32 | Business asset page: Total revenue + Profit margin are the inputs, Owner profit (per month and per year) is auto and read-only = revenue x margin; it drives the engine (rent), the row and the Monthly income and expenses lines; a margin edit changes owner profit; there is no editable Monthly owner profit box | 28.00 | 28.00 | 8/8 sub-checks pass |
| J33 | Seeded businesses keep their owner profit and show revenue = profit / 20%; default plan numbers are unchanged; an old portfolio / backup without revenue or margin loads unchanged (revenue and margin stay empty, nothing rewritten) | 24.00 | 24.00 | 5/5 sub-checks pass |
| J34 | New business asset page at 320 and 390: no horizontal scroll, every box and button at least 44px tall, nothing overflows its row | 16.00 | 16.00 | 4/4 sub-checks pass |

### J failures

None.

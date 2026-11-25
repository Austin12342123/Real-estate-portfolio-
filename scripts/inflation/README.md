# Inflation data pipeline (card IF1a)

Spec: docs/inflation-spec.md on branch claude/plan-docs, sections 1, 2, 3, 5.
Output: data/inflation.json. Engine and Settings use it in card IF1b, not here.

## Source layouts (read this before the parsers)

STATUS: layouts VERIFIED against the real files on 2026-11-25 by a GitHub Actions run
(run 45613926226, layout-report.js). From the build sandbox the Fed, Treasury and BLS hosts
were blocked (proxy 403); from the GitHub runner Cleveland, Treasury and Philadelphia Fed
answered HTTP 200 and download.bls.gov answered 403. CPI therefore now comes from FRED.
Real facts (corrections to the earlier guesses are marked CORRECTED):
- Cleveland: workbook has sheets "Data Key For Graphs", "Expected Inflation" (540 rows),
  "Ten-year Expected Chart", "Real Interest Rate". Sheet "Expected Inflation": header
  "Model Output Date", then " 1 year Expected Inflation" ... " 30 year Expected Inflation"
  (leading space). Dates are Excel serial numbers (29952 = Nov 1980 start of rows; last 46327).
  CORRECTED: values in this sheet are FRACTIONS (0.0266630958 = 2.666%), not percent. The
  "Ten-year Expected Chart" sheet is in percent (2.6663096). Last row 10-year = 2.6663%,
  equal to FRED EXPINF10YR for 2026-11.
- Treasury real curve: header Date,"5 YR","7 YR","10 YR","20 YR","30 YR" (as guessed),
  dates MM/DD/YYYY newest first, 226 lines for 2026. Nominal header has "1 Mo","1.5 Month",
  "2 Mo",...,"1 Yr","2 Yr","3 Yr","5 Yr","7 Yr","10 Yr","20 Yr","30 Yr". 2026-11-24: real 10 YR
  2.79, nominal 10 Yr 4.91, breakeven 2.12. Each request takes about 19 seconds.
- Philadelphia Fed: release page spf-q4-2026 exists (CPI 10-year 2.49, previous survey 2.30;
  PCE 2.23). Sentence: "Over the next 10 years, 2026 to 2035, ... headline CPI inflation will
  be at an annual-average rate of 2.49 percent". CORRECTED: it is "10 years" in prose, and the
  table row is "2026-2035 2.30 2.49 N.A. N.A. 2.20 2.23" (previous, current CPI; previous,
  current PCE). The landing page links no data file; it links mean-forecasts and
  median-forecasts pages (the history file link is still being located, see layout report).
- BLS: download.bls.gov returned 403 from the runner. REPLACED by FRED, see below.

### Cleveland Fed expected inflation (inflation-expectations.xlsx), expected layout
- URL: https://www.clevelandfed.org/-/media/files/webcharts/inflationexpectations/inflation-expectations.xlsx
- Workbook with several sheets. The one used has a header row with a date column
  ("Model Output Date") and columns "1 year Expected Inflation" ... "30 year Expected
  Inflation" (30 yearly horizons). Other sheets (real rate, risk premium) have a similar
  shape and are ignored.
- Values are percent (2.67 means 2.67%). One row per month, 1982 to now.
- Parser: scripts/inflation/xlsx.js (small zip and XML reader, no dependency). It takes
  the first sheet whose text mentions "expected inflation" and reads every column whose
  header matches /^(\d+)\s*-?\s*year/i as horizon N.
- Cross-check from FRED (reachable here): EXPINF10YR read 2.73553113 for 2026-10 and
  2.66630958 for 2026-11 when read on 2026-11-23.

### Treasury Par Real Yield Curve and Par Yield Curve CSV, expected layout
- URL pattern: https://home.treasury.gov/resource-center/data-chart-center/interest-rates/daily-treasury-rates.csv/{YEAR}/all?type=daily_treasury_real_yield_curve&field_tdr_date_value={YEAR}&page&_format=csv
  and type=daily_treasury_yield_curve for the nominal curve.
- Real curve header: "Date","5 YR","7 YR","10 YR","20 YR","30 YR" (expected maturities
  5, 7, 10, 20, 30). Dates MM/DD/YYYY, newest first, values percent.
- Nominal curve: "Date","1 Mo",...,"2 Yr","3 Yr","5 Yr","7 Yr","10 Yr","20 Yr","30 Yr".
- Breakeven(maturity) = nominal - real, same date and maturity. The parser matches
  /^(\d+)\s*yr$/i and ignores "Mo" columns. Cross-check: FRED T10YIE read 2.16 on 2026-11-19.
- Breakevens are shown in the sources list only. They never move the band (spec 5).

### Philadelphia Fed Survey of Professional Forecasters, expected layout
- Release page: https://www.philadelphiafed.org/surveys-and-data/real-time-data-research/spf-q{Q}-{YYYY}
  Its long-term table lists the 10-year average CPI and PCE forecasts (Q3 2026: CPI 2.30).
- History for the backtest: a CSV with YEAR, QUARTER and a 10-year CPI column (header
  matches /cpi10|10.?year.*cpi/i). The exact SPF file name is unverified; set it in
  SPF_HISTORY_URL (env) or sources.js.
- If the history cannot be fetched or parsed the build keeps the last good band (spec 5).

### CPI-U all items, not seasonally adjusted: FRED CPIAUCNS (replaces BLS file)
- URL: https://fred.stlouisfed.org/graph/fredgraph.csv?id=CPIAUCNS (free, no key). Same
  series as BLS CUUR0000SA0. CSV, header observation_date,CPIAUCNS, rows YYYY-MM-01,value.
  Read 2026-11-23: 2026-10 = 337.511, 2026-09 = 336.940.
- Assumption (user did not name the source): FRED CPIAUCNS. [ask-user-if-wrong]

## data/inflation.json shape

    { generatedAt, sources:[{name,url,asOf,value}], level:[P(0)..P(600)],
      low:[50], high:[50], bandSupported:[50], adjust:{points,reason,date,expires},
      inputs:{cleveland:{asOf,points:[30]}, survey10:{asOf,value}},
      band:{errLow:[50], errHigh:[50], cases:[50], asOf} }

- low, high, bandSupported: index i is horizon H = i+1 years (H = 1..50). low and high are
  annual rates centred on the smoothed central rate (so low <= r <= high), without the
  manual adjustment. The engine adds the adjustment (spec 4) to r, low and high.
- level excludes the manual adjustment too. IF1b decides how to apply it to the path.
- inputs and band are extras kept so a failed source can keep its last good value.

## Assumptions (the spec leaves these open)
- Backtest actual inflation = annualised growth of the trailing 12-month average CPI level
  at the start month to the same at start + H years.
- The survey value for a month = the latest quarterly value at or before that month.
- Band edges = r + 16th and 84th percentile of (actual - r), clipped so the band always
  contains r (low offset at most 0, high offset at least 0).
- Horizons are whole years 1..50; beyond 30 years Cleveland C(30) is reused (spec 3).
- Smoothing needs r(1)..r(50); r(0) is taken as 0 for the forward formula (P(0) = 1).

## Commands
    node scripts/inflation/build.js        (needs network; writes data/inflation.json and out/pr-body.md)
    npx vitest run tests/inflation

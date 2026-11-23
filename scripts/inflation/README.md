# Inflation data pipeline (card IF1a)

Spec: docs/inflation-spec.md on branch claude/plan-docs, sections 1, 2, 3, 5.
Output: data/inflation.json. Engine and Settings use it in card IF1b, not here.

## Source layouts (read this before the parsers)

STATUS: the layouts below are NOT verified against the real files. On 2026-11-23 this
build environment could not reach clevelandfed.org, home.treasury.gov, www.treasury.gov,
philadelphiafed.org, api.bls.gov or download.bls.gov (proxy 403 on CONNECT). The spec's
"not checked yet" item (which maturities the real curve CSV covers) is therefore still
open. What follows is the expected layout, from public descriptions. The parsers find
columns by header text, not by position, and throw a clear error when a header they need
is missing, so a wrong guess fails loudly in the workflow instead of producing wrong
numbers. On the first run from a machine that can reach the hosts: open each file,
correct this section, and fix the parsers if needed.

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

### BLS CPI-U all items, not seasonally adjusted (CUUR0000SA0)
- URL: https://download.bls.gov/pub/time.series/cu/cu.data.0.Current (tab separated:
  series_id, year, period, value, footnote_codes). Rows with series_id CUUR0000SA0 are
  used; period M13 (annual average) is skipped.
- BLS asks for a descriptive User-Agent with contact info; the fetcher sends BLS_USER_AGENT
  from the environment (generic default otherwise).
- FRED CPIAUCNS (same index, reachable here) read 337.511 for 2026-10 and 336.940 for
  2026-09. It is NOT used by the pipeline.

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

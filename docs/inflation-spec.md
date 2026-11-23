# Inflation estimate and future-dollars year: spec (PM, Nov 20 2026)

Austin (Nov 20): "The user should be able to change the year "future dollars" would predict. Also the system behind the estimated value of money c years from now should be reliable and a good indicator of what the value would be."

Today the app uses one typed rate, "Cost increases per year" (default 3%), both to grow living costs and to turn future dollars into today's dollars, and future dollars always mean the plan's last year.

No method forecasts inflation 10 to 30 years out precisely. The most reliable free signals are what bond markets price in and what professional forecasters expect. So the app blends those, follows them as they update, and shows a likely range around one central number.

## 1. Sources (all free, no key, no sign-up)

| Source | What it gives | Cadence | Value read Nov 20 2026 |
|---|---|---|---|
| Cleveland Fed expected inflation (inflation-expectations.xlsx, "Download our spreadsheet" on clevelandfed.org/indicators-and-data/inflation-expectations) | Expected CPI inflation for every horizon 1 to 30 years, 1982 to now. Model blends Treasury yields, inflation swaps and survey forecasts. | Monthly, on CPI release day. Last Nov 10 2026, next Dec 10 2026. | 10-year 2.67% (FRED EXPINF10YR: 2.67 Nov 2026, 2.74 Oct 2026) |
| Philadelphia Fed Survey of Professional Forecasters | 10-year average headline CPI forecast (long-run anchor) | Quarterly. The Q4 2026 page was not up on Nov 20. | Q3 2026 (Aug 14): 10-year CPI 2.30%, PCE 2.20% |
| Treasury Daily Par Yield Curve and Par Real Yield Curve (CSV on home.treasury.gov daily rate archives) | Nominal minus real yield = breakeven inflation by maturity | Daily | 10-year breakeven 2.16% on Nov 19 (FRED T10YIE) |

Breakevens run below the Cleveland figure (2.16 vs 2.67 at 10 years) because TIPS carry a liquidity premium. They are used as a cross-check and as one edge of the range, not as the central number.

Not used: news or geopolitics as a model input. No source turns headlines into a reliable inflation number. The only path for them is the manual adjustment in section 4.

Not checked yet: which maturities the real curve CSV covers (expected 5, 7, 10, 20, 30 years). The build card checks this first.

## 2. Update path

- A GitHub Actions workflow in the app repo runs monthly on the 11th (after Cleveland's release) and on demand. It downloads the sources, computes the tables below and writes data/inflation.json, then opens a pull request to dev. Nothing reaches main or the live app without Austin's merge.
- data/inflation.json: { sources: [{name, url, asOf, value}], level: [P(0)..P(600)] monthly price level with P(0) = 1, low: [..], high: [..], bandSupported: [..] (true where the backtest had enough cases), adjust: {points, reason, date, expires} }.
- The app bundles the file. No network call at runtime, so it works offline and avoids browser cross-site blocks. Settings shows each source's date.
- Out of date: Cleveland older than 60 days, or the survey older than 150 days (it is quarterly). Settings only says so.
- If a source fails in the workflow, it keeps that source's last value and writes the failure into the PR text.
- First build task: open the Cleveland spreadsheet and the Treasury real-curve CSV and write down their sheet, column and maturity layout in scripts/inflation/README.md before writing parsers.

## 3. Central rate by horizon

H = years from today to the target year, in months / 12, at most 50. C(H) = Cleveland expected inflation at H, linear between its yearly points; H over 30 uses C(30). S = Philadelphia Fed survey 10-year CPI.

- H up to 2: r(H) = C(H). Near-term expectations move with current prices; the survey's 10-year average doesn't.
- H from 2 to 10: r(H) = w C(H) + (1 - w) S, with w falling in a straight line from 1.0 at H = 2 to 0.5 at H = 10.
- H over 10: r(H) = 0.5 C(H) + 0.5 S.
- Then add the manual adjustment (default 0) to r and to the band edges alike.

Cleveland's model already uses survey data, so S partly counts twice. That is deliberate: it pulls long horizons toward the professional consensus.

Today, at 10 years: 0.5 x 2.67 + 0.5 x 2.30 = 2.485% a year.

Cost growth and conversion use one smoothed path, so they always agree:
1. Take yearly r(1)..r(50) and smooth them with a centered 5-year moving average (shorter at the ends).
2. Yearly forward rate f(t) = (1 + r(t))^t / (1 + r(t-1))^(t-1) - 1 from the smoothed r, clamped to 0% to 6%.
3. Price level P(t) = product of (1 + f) for years 1..t, monthly in between by geometric interpolation. Living costs grow by f(t) in year t, and future dollars in year t = today's dollars x P(t).

## 4. Manual adjustment (the only place news goes)

- Owner-only field in data/inflation.json, set by a commit, never by the app at runtime.
- Clamped to plus or minus 0.5 points, needs a one-line reason and an expiry date (at most 6 months). It has no effect on and after its expiry date.
- Shown in Settings next to the data dates when not zero, with its reason.

## 5. Likely range

- The workflow backtests the blend itself: for each past month with both a Cleveland and a survey value (the survey's 10-year CPI starts in 1991), it computes r(H) and compares it with actual average CPI inflation over the next H years. Actual inflation is CPI-U all items, not seasonally adjusted (BLS series CUUR0000SA0), 12-month averages.
- Per horizon, it takes the errors' 16th and 84th percentiles. A horizon needs at least 60 monthly cases (5 years of starting points). Longer horizons, with fewer cases, use the band of the longest supported horizon and are marked bandSupported false.
- low and high are annual rates. The dollar range shown is today's amount x (1 + low)^H to (1 + high)^H.
- Breakevens are not used to move the band: they sit low because of a TIPS liquidity premium, and understating future costs is the riskier mistake for a planner.
- Display: future figures show the central amount with a small line "likely $A to $B". Where bandSupported is false the line reads "rough range $A to $B". Today's figures have no range.
- If the backtest can't run, the workflow keeps the last good band and says so in the PR. The first build sets the band only from the backtest, never from a guess.

## 6. User controls (Settings, with card C2)

- Money view: Today's money only (default), Future money only, Today's money with future as a small line.
- Future year: any year from next year to the plan's last year. Default is the plan's last year. Figures shown are the plan's figures in that year, in that year's dollars. Saved as meta.futureYear (null = plan's last year).
- Inflation: Automatic (this spec), Automatic, high case (uses the band's high edge, for cautious planning), or My own rate (the old typed field). Saved as meta.inflationMode auto | autoHigh | custom and the custom rate.

## 7. Tests

- T1 to T5 fixtures pin My own rate at 3%, so their figures never move.
- T7 central rate: with a fixed fixture (Cleveland 2.0 at 1 year rising in a straight line to 2.6 at 30, S = 2.30, adjust 0), check r at H = 1, 2, 5, 10, 30 and 40 (40 uses C(30)) against hand-worked values, including the w line at 5. At 10: 0.5 x C(10) + 0.5 x 2.30.
- T8 path: cost growth in year t equals P(t) / P(t-1) - 1 exactly; every f(t) is between 0% and 6%; a fixture with a 1-point jump between C(9) and C(10) gives no f(t) above 6% or below 0%.
- T9 adjustment: +0.3 shifts r, low and high by 0.3; +0.9 is clamped to 0.5; it applies the day before expiry and not on the expiry date.
- T10 settings: changing Future year, Money view or Inflation mode changes no saved number.
- T11 band: low <= r <= high at every horizon; horizons past the supported limit are marked rough.
- T12 modes and files: My own rate ignores data/inflation.json; a missing file falls back to My own rate at 3% with a note in Settings; a stale file still works and shows the out-of-date note; today's figures never show a range.

## 8. Limits to say in the app (one line in Settings)

CPI measures a national basket. Housing, insurance and local costs can rise faster or slower, so My own rate stays available.

## 9. Decided: one rate drives everything

Austin (Nov 20): "Yeah the inflation rate should include both living costs and whatever else"

- In Automatic (and Automatic, high case), the yearly rate f(t) from section 3 replaces the typed "Cost increases per year" everywhere the engine uses it today: living costs, other debts tied to living costs, the cash cushion, and the future-dollar conversion. Asset growth rates (value, rent and property costs) stay per asset as now.
- New portfolios start on Automatic. An existing portfolio whose rate is the old 3% default moves to Automatic when the migration runs; one with any other typed rate stays on My own rate, since someone chose it.
- The build handback lists which saved and shown figures change: run engine-diff over the 40 test portfolios and Austin's own exported portfolio, and report per figure (living costs by year, cushion, lowest cash, plan-end net worth in both views, any purchase month that moves) the before and after values.

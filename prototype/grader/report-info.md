# Help / hourly-job grader (INFO_ONLY)

Run: 2026-11-22T15:57:03.378Z  |  48s

## H. Help buttons and hourly jobs: **64.96 / 100** (separate scale; not included in the A-E + R total, F or G)

| ID | Check | Pts | Earned | Detail |
|---|---|---|---|---|
| H1 | Glossary integrity: complete entries, plain wording, every label / loan mapped to a real and sensible entry, acronyms explained | 8.00 | 6.77 | 7/8 sub-checks pass. FAIL: every acronym used in a definition is itself explained (own entry, title or spelled out) [loanamount:FHA] |
| H2 | Info-button coverage: every jargon label on every page (Portfolio, asset types, Assumptions, Finances, Add) has an (i) with the right definition; no orphan glossary entries | 16.00 | 14.19 | 42/47 sub-checks pass. FAIL: Add multi-family: Home type, Number of units, Building or pack have an (i); loan cards carry none [loan cards with (i): ]; Example editor (home-va): (i) beside the title, the loan option, selling costs, down payment [exedit,capexmonths,growth]; Example editor (multi-hack): (i) beside the title, the loan option, selling costs, down payment and the number of units [exedit,unitcount,capexmonths,rentunit,growth]; Example editor (comm-nnn): (i) beside the title, the loan option, selling costs, down payment [exedit,nnn,growth]; Example editor (biz-vend): (i) beside the title, the loan option, selling costs, down payment, revenue and margin [exedit,revenue,growth] |
| H3 | Info popover: opens with the right content on click / tap only, closes by a second click / Escape / an outside click / navigation, accessible names and roles, keyboard, contrast, fits small screens, never changes data | 16.00 | 0.00 | CRASH in check: page.click: Timeout 4000ms exceeded. Call log: [2m  - waiting for locator('[data-info=dscr]')[22m      at /home/user/Real-estate-portfolio-/.claude/worktrees/agent-a2b456f1ef5ee48e2/prototype/grader/info-grade.js:180:18     at async hcheck (/home/user/Real-estate-portfolio-/.claude/worktrees/agent-a2b456f1ef5ee48e2/prototype/grader/info-grade.js:20:15)     at async Object.run (/home/user/Real-estate-portfolio-/.claude/worktrees/agent-a2b456f1ef5ee48e2/prototype/grader/info-grade.js:175:3)      |
| H4 | Definitions are accurate: numbers quoted match the engine constants and loan table, examples do their own arithmetic, stated rules behave that way in the engine | 16.00 | 0.00 | CRASH in check: TypeError: Cannot read properties of undefined (reading 'b')     at /home/user/Real-estate-portfolio-/.claude/worktrees/agent-a2b456f1ef5ee48e2/prototype/grader/info-grade.js:246:27     at hcheck (/home/user/Real-estate-portfolio-/.claude/worktrees/agent-a2b456f1ef5ee48e2/prototype/grader/info-grade.js:20:21)     at Object.run (/home/user/Real-estate-portfolio-/.claude/worktrees/agent-a2b456f1ef5ee48e2/prototype/grader/info-grade.js:241:9)     at async /home/user/Real-estate-portfolio-/.claude/w |
| H5 | Hourly jobs: add, gross = (wage + tips) x hours x weeks, automatic vs typed tax, blank tax returns to automatic, temporary end month, switching kind, clamps, persistence | 12.00 | 12.00 | 28/28 sub-checks pass |
| H6 | Optional fields left blank never break the plan or the finance verdict (job extras, improvements, exit fields, co-signers) | 8.00 | 8.00 | 16/16 sub-checks pass |
| H7 | Old saves migrate: v8 (assets only) and pre-hourly jobs (no kind / wage / tips / weeks) load, keep their numbers and show correctly | 6.00 | 6.00 | 10/10 sub-checks pass |
| H8 | Automatic tax estimate: matches an independent 2026 single-filer calculation (IRS Rev. Proc. 2025-32, Pub. 15) (federal after standard deduction + Social Security + Medicare, no state tax), is monotone and bounded | 6.00 | 6.00 | 6/6 sub-checks pass |
| H9 | Disclosure defaults and new wording: collapsed sections open on tap (and stay open), renamed labels, Hold/Sell/Merge + Status, loan grouping, import preview title | 8.00 | 8.00 | 12/12 sub-checks pass |
| H10 | Clean run: no console / page errors and no network requests outside localhost during all help and hourly-job flows | 4.00 | 4.00 | 2/2 sub-checks pass |

### H failures

- **H1 Glossary integrity: complete entries, plain wording, every label / loan mapped to a real and sensible entry, acronyms explained** (-1.23): 7/8 sub-checks pass. FAIL: every acronym used in a definition is itself explained (own entry, title or spelled out) [loanamount:FHA]
  - Reproduce: node: inspect v4/info.js INFO / LABEL / LOAN
- **H2 Info-button coverage: every jargon label on every page (Portfolio, asset types, Assumptions, Finances, Add) has an (i) with the right definition; no orphan glossary entries** (-1.81): 42/47 sub-checks pass. FAIL: Add multi-family: Home type, Number of units, Building or pack have an (i); loan cards carry none [loan cards with (i): ]; Example editor (home-va): (i) beside the title, the loan option, selling costs, down payment [exedit,capexmonths,growth]; Example editor (multi-hack): (i) beside the title, the loan option, selling costs, down payment and the number of units [exedit,unitcount,capexmonths,rentunit,growth]; Example editor (comm-nnn): (i) beside the title, the loan option, selling costs, down payment [exedit,nnn,growth]; Example editor (biz-vend): (i) beside the title, the loan option, selling costs, down payment, revenue and margin [exedit,revenue,growth]
  - Reproduce: Open each page without expanding anything extra, expand its sections as a user would, list the (i) buttons beside labels
- **H3 Info popover: opens with the right content on click / tap only, closes by a second click / Escape / an outside click / navigation, accessible names and roles, keyboard, contrast, fits small screens, never changes data** (-16.00): CRASH in check: page.click: Timeout 4000ms exceeded.
Call log:
[2m  - waiting for locator('[data-info=dscr]')[22m

    at /home/user/Real-estate-portfolio-/.claude/worktrees/agent-a2b456f1ef5ee48e2/prototype/grader/info-grade.js:180:18
    at async hcheck (/home/user/Real-estate-portfolio-/.claude/worktrees/agent-a2b456f1ef5ee48e2/prototype/grader/info-grade.js:20:15)
    at async Object.run (/home/user/Real-estate-portfolio-/.claude/worktrees/agent-a2b456f1ef5ee48e2/prototype/grader/info-grade.js:175:3)
    
  - Reproduce: Playwright 390x844 and 320x568: open (i), inspect dialog, close every way
- **H4 Definitions are accurate: numbers quoted match the engine constants and loan table, examples do their own arithmetic, stated rules behave that way in the engine** (-16.00): CRASH in check: TypeError: Cannot read properties of undefined (reading 'b')
    at /home/user/Real-estate-portfolio-/.claude/worktrees/agent-a2b456f1ef5ee48e2/prototype/grader/info-grade.js:246:27
    at hcheck (/home/user/Real-estate-portfolio-/.claude/worktrees/agent-a2b456f1ef5ee48e2/prototype/grader/info-grade.js:20:21)
    at Object.run (/home/user/Real-estate-portfolio-/.claude/worktrees/agent-a2b456f1ef5ee48e2/prototype/grader/info-grade.js:241:9)
    at async /home/user/Real-estate-portfolio-/.claude/w
  - Reproduce: node: parse numbers out of v4/info.js and compare with engine.js constants and engine calculations

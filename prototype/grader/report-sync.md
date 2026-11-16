# Number-sync grader (SYNC_ONLY)

Run: 2026-11-16T04:28:01.797Z  |  51s

## G. Number sync: **22.56 / 26** (separate scale; not included in the A-E + R total or in F)

| ID | Check | Pts | Earned | Detail |
|---|---|---|---|---|
| G2 | Asset page <-> Portfolio sync (share line, hero, impact, edits propagate) | 14.00 | 14.00 | 74/74 sub-checks pass |
| G6 | Cross-page navigation & persistence (nav, reload, backup restore, second tab, v8 migration, dark/light) | 12.00 | 8.56 | 10/12 sub-checks pass. FAIL: backup restore brings every number back exactly (0/1 ok) [changed after restore: #assumptions]; second tab shows identical numbers (0/1 ok) [tab 2 changed: #assumptions] |

### G failures

- **G6 Cross-page navigation & persistence (nav, reload, backup restore, second tab, v8 migration, dark/light)** (-3.44): 10/12 sub-checks pass. FAIL: backup restore brings every number back exactly (0/1 ok) [changed after restore: #assumptions]; second tab shows identical numbers (0/1 ok) [tab 2 changed: #assumptions]
  - Reproduce: Digest every page; navigate around, reload, export a backup, edit, restore, open a second tab, load a v8 save, toggle dark mode; numbers must be identical / correct

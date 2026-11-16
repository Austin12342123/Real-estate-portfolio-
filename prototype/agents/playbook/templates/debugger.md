# TEMPLATE: debugger (investigates a failure; WRITES only a notes file unless told otherwise)
<COMMON HEADER>
TYPE: debugger.
Required:
- FIRST rule out environmental causes: `tools/preflight.sh`, ledger entries for the failing run (tree hash, concurrent runs), `tools/audit-now.sh` overlap pairs, process list at failure time. Concurrency is the prime suspect when a failure appears only in full runs (ae94d3 spent 41 min; the only common factor was overlapping runs).
- Reproduce ALONE twice with ledger run ids before theorising; then bisect (git stash is forbidden; use a worktree or a temp copy).
- Time box: 30 min or 3 full-run equivalents. At the box: hand back the evidence table (what was ruled out) and the best hypothesis; do not keep looping.
- Output: root cause (or 'unknown'), evidence, proposed fix (not applied unless told), regression check proposal.

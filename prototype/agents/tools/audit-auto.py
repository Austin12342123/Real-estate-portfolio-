"""Rule-based audit summary from the auditor's intermediate JSON (no hand judgments). Usage: audit-auto.py OUTDIR REPORT.md METRICS.jsonl [label]
Computes per-agent flags and standing metrics (format: playbook/metrics-format.md) and appends ONE line to METRICS.jsonl."""
import json, sys, os, datetime, collections
out, rep, mj = sys.argv[1:4]; label = sys.argv[4] if len(sys.argv) > 4 else ''
A = json.load(open(f'{out}/agents.json')); OV = json.load(open(f'{out}/overlap.json')); OC = json.load(open(f'{out}/orch_collisions.json'))
M = json.load(open(f'{out}/main.json')); ags = [a for a in A.values() if isinstance(a, dict)]
f = lambda x, d=0.0: float(x) if x not in (None, '', 'None') else d
rows = []; tot = collections.Counter()
for a in ags:
    nt = collections.Counter(); 
    fl = []
    if f(a.get('n_grader')) > 40: fl.append('grader-runs>40')
    if f(a.get('full_runs')) > 2: fl.append('full-runs>2')
    if f(a.get('slice_runs')) > 10: fl.append('slice-runs>10')
    if f(a.get('dur_min')) and f(a.get('active_min')) and f(a.get('active_min')) > 60: fl.append('active>60min')
    if a.get('concurrent') not in ('[]', [], None, ''): fl.append('concurrent-agents')
    if str(a.get('edit_after_last_full')) == 'True' or f(a.get('last_v4_edit_after_full_min')) > 0: fl.append('unverified-tail')
    if str(a.get('grader_file_edit_after_full')) == 'True': fl.append('grader-edit-after-full')
    if f(a.get('n_followups')) > 0: fl.append(f"handbacks+{a.get('n_followups')}")
    if f(a.get('tool_errors')) >= 8: fl.append('tool-errors>=8')
    rows.append((a['id'][:6], a.get('desc', '')[:48], f(a.get('active_min')), int(f(a.get('n_tools'))), int(f(a.get('n_grader'))), int(f(a.get('full_runs'))), int(f(a.get('slice_runs'))), int(f(a.get('tool_errors'))), ','.join(fl)))
    for k, v in (('active_min', f(a.get('active_min'))), ('tools', f(a.get('n_tools'))), ('grader_runs', f(a.get('n_grader'))), ('full_runs', f(a.get('full_runs'))), ('slice_runs', f(a.get('slice_runs'))), ('tool_errors', f(a.get('tool_errors'))), ('followup_handbacks', f(a.get('n_followups')))): tot[k] += v
    for x in fl: tot['flag:' + x.split('+')[0]] += 1
users = M.get('users', [])
m = {'ts': datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'), 'label': label, 'agents': len(ags), 'active_min': round(tot['active_min'], 1), 'tools': int(tot['tools']),
     'grader_runs': int(tot['grader_runs']), 'full_runs': int(tot['full_runs']), 'slice_runs': int(tot['slice_runs']), 'tool_errors': int(tot['tool_errors']),
     'followup_handbacks': int(tot['followup_handbacks']), 'agent_overlap_min': OV.get('total_overlap_min'), 'orch_grader_cmds': OC.get('orch_grader_cmds'),
     'orch_cmds_inside_agent_windows': sum(len(v) for v in OC.get('orch_cmds_inside_agent_windows', {}).values()), 'user_msgs': len(users),
     'flag_counts': {k[5:]: int(v) for k, v in tot.items() if k.startswith('flag:')}}
open(mj, 'a').write(json.dumps(m) + '\n')
with open(rep, 'w') as r:
    r.write(f"# AUTO audit {m['ts']} {label}\n\nRule-based only (no hand judgments). Compare with the baseline in agents/audit/REPORT.md and playbook/metrics-format.md.\n\n```json\n{json.dumps(m, indent=1)}\n```\n\n")
    r.write('| id | task | active min | tools | grader runs | full | slice | tool errs | flags |\n|---|---|---|---|---|---|---|---|---|\n')
    for x in sorted(rows, key=lambda x: -x[2]): r.write('| ' + ' | '.join(str(i) for i in x) + ' |\n')
    r.write(f"\nOrchestrator commands inside agent windows: {json.dumps(OC.get('orch_cmds_inside_agent_windows'))}\nAgent-vs-agent overlap pairs: {json.dumps(OV.get('overlap_pairs'))}\n")
print(json.dumps(m))

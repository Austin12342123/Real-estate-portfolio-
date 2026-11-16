"""Build per-agent md files, inventory, audit.json from agents.json + notes.py. Usage: generate.py OUTDIR AUDITDIR"""
import json,sys,os
sys.path.insert(0,os.path.dirname(__file__))
from notes import NOTES
OUT,AUD=sys.argv[1],sys.argv[2]
A=json.load(open(OUT+'/agents.json'))
W=dict(E=25,H=20,V=15,F=15,A=15,G=10)
DN=dict(E='Effectiveness (25)',H='Accuracy/honesty of report (20)',V='Verification rigor (15)',F='Efficiency (15)',A='Instruction adherence/scope (15)',G='Final-state hygiene (10)')
# price ratios calibrated so main+agents sum ~= session cost-state ($207.76): in 1.43, out 7.2, cache-write 1.8, cache-read 0.143 per M tokens
def cost(t):return (t['input_tokens']*1.43+t['output_tokens']*7.2+t['cache_creation_input_tokens']*1.8+t['cache_read_input_tokens']*0.143)/1e6
def grade(x):return 'A' if x>=90 else 'B' if x>=80 else 'C' if x>=70 else 'D' if x>=60 else 'F'
L=sorted(A.values(),key=lambda a:a['first']);rows=[]
for n,a in enumerate(L,1):
    nt=NOTES[a['id'][:6]];sc=nt['sc'];tot=round(sum(W[k]*sc[k] for k in W)/100,1)
    a['n']=n;a['score']=tot;a['grade']=grade(tot) if a['id'][:6]!='a96f4a' else 'n/a';a['cost']=round(cost(a['tokens']),2)
    a['waste_min']=nt['waste'];a['waste_usd']=round(a['cost']*nt['waste']/max(a['active_min'],1),2) if nt['waste'] else 0
    rows.append(a)
# inventory
inv=['# 01 Inventory of all agents and data sources\n','Times are UTC, 2026-11-08 .. 2026-11-16. Tokens are de-duplicated per assistant message (a streamed message repeats its usage on every content block; summing raw lines overstates output ~2x). "New tok" = input+output+cache-write; cache-read shown separately. Cost = estimate calibrated against the session cost-state total ($207.76).\n',
'## Agents (44 subagent transcripts; #44 is this auditor)\n','| # | id | task | start | wall min | active min | tools | out tok | new tok | cache-read tok | est $ | grader runs (full/slice) | builds | png views | tool errs |','|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|']
for a in rows:
    inv.append(f"| {a['n']} | {a['id'][:6]} | {a['desc']} | {a['first'][5:16]} | {a['dur_min']} | {a['active_min']} | {a['n_tools']} | {a['tokens']['output_tokens']//1000}k | {a['tokens_new']//1000}k | {a['tokens']['cache_read_input_tokens']//1000000}M | {a['cost']} | {a['full_runs']}/{a['slice_runs']} | {a['builds']} | {a['png_views']} | {a['tool_errors']} |")
tot=lambda k:sum(a[k] for a in rows)
inv+=['',f"Totals: active {round(tot('active_min'))} min, tools {tot('n_tools')}, output tokens {sum(a['tokens']['output_tokens'] for a in rows)//1000}k, est cost ${round(tot('cost'),1)} (agents) + ~$66 orchestrator = ~$215 vs cost-state $207.76 (calibration error <4%).",
'','## Data sources and what was used','',
'| source | location | classification | used for |','|---|---|---|---|',
'| Subagent transcripts | /root/.claude/projects/.../subagents/agent-*.jsonl (+ .meta.json, .prefix.json) | 44 agent transcripts (JSONL) | all per-agent metrics, prompts, hand-backs, bash traces |',
'| tasks/*.output symlinks | scratchpad/../tasks/a*.output | 44 symlinks to the same transcripts | mapping agent id -> transcript |',
'| tasks/*.output Bash/Monitor logs | same dir | 197 files: 71 >200 B (63 contain grader output), 126 tiny exit-status stubs | evidence of full-run results (e.g. b0bwsgpqy = 100/100 run; b3rqo3gg1 = A35/C01 failures) |',
'| Orchestrator transcript | .../7dc1946d-....jsonl (45 MB, 994 assistant msgs, 121 real user messages, 457 queue ops) | main | user requests, launch prompts, hand-backs, complaints, pushes, publishes, cost-state |',
'| git history | `git log` (129 commits, 24 "WIP", 126 by Claude, 3 merges by owner) | commits/stat | WIP sweep analysis, escaped-defect fixes, grader-report churn |',
'| Grader outputs | prototype/grader/report*.md, result*.json, numbering-bugs.md, multifamily-research.md, logic/ | current tree | claim-vs-reality (current report.md at 04:46 shows 84.53/85) |',
'| CLAUDE.md | repo root | standing rules (ADDITIONS/DATA_V, never replace user portfolios) | adherence + attribution |',
'| notifications | queue-operation <task-notification> usage lines | 270 task notifications | duplicate hand-back detection |',
'','## Missing / limited data','',
'- User-attached screenshots (images in user messages) were not available as pixels; user bug descriptions used as text only.',
'- No per-agent cost figures exist; costs are estimates calibrated to the session total. Orchestrator thinking blocks are not in the transcript.',
'- Agent edits made through `python3 - <<EOF` / `sed -i` in Bash are not captured by Edit/Write counts, so "files edited" is incomplete (git diff per WIP commit used instead).',
'- Artifact publishes (55 calls) were counted, not content-verified (no network; versions not read).',
'- a74ba5 and abd0ce were still running when the audit was taken (04:47); abd0ce has no final report; their grades are provisional. This auditor (a96f4a) is not graded.',
'- Foreground grader durations are measured exactly; background runs (nohup/run_in_background) are only visible as launch + Monitor/sleep, so grader minutes are a lower bound.']
open(AUD+'/01-inventory.md','w').write('\n'.join(inv)+'\n')
# per agent files
for a in rows:
    nt=NOTES[a['id'][:6]];sc=nt['sc'];p=f"{AUD}/agent-{a['id']}.md"
    if a['id'][:6]=='a96f4a':
        open(p,'w').write("# agent-a96f4a284bbdf078e: this auditor\n\nNot graded (self). See REPORT.md.\n");continue
    m=['# agent-%s: %s\n'%(a['id'],a['desc']),
    f"**Grade {a['grade']} ({a['score']}/100)**{' (PROVISIONAL: still running at audit time)' if nt['prov'] else ''} | type: {nt['kind']} | started {a['first']} | wall {a['dur_min']} min, active {a['active_min']} min | tools {a['n_tools']} | out tokens {a['tokens']['output_tokens']//1000}k | est cost ${a['cost']}\n",
    '**Top issue:** '+nt['top']+'\n','## Scores','| dimension | weight | score |','|---|---|---|']+[f"| {DN[k]} | {W[k]} | {sc[k]} |" for k in W]
    m+=['',f"## Task\n\n{a['desc']}. Prompt length {a['prompt_len']} chars. First prompt line: _{a['prompt'][:230].replace(chr(10),' ')}_\n",
    '## Prompt quality\n\n'+nt['prompt_q']+'\n',
    '## Process trace and metrics\n\n'+nt['trace']+f"\n\nMeasured: tools {json.dumps(a['tools'])}; graders full/slice {a['full_runs']}/{a['slice_runs']}, grader wall (foreground only) {a['grader_total_min']} min; builds {a['builds']}; png views {a['png_views']}; tool errors {a['tool_errors']}; re-read files (>2x): {len(a['rereads'])}; idle gaps >12 min: {a['idle_gaps']}; concurrent agents (overlap min): {a.get('concurrent')}; hand-backs {a['tools'].get('SubagentHandback',0)}.\n",
    '## Instruction adherence\n\n'+nt['adh']+('\n\nGit mutating commands run: '+'; '.join(a['git_cmds'])[:400] if a['git_cmds'] else '\n\nNo commit/push/add by the agent (checked all Bash commands).')+'\n',
    '## Claims vs reality\n\n'+nt['claims']+'\n\nFinal report excerpt: _'+(a['final'] or '')[:320].replace('\n',' ')+'_\n',
    '## Escaped defects (user-reported later)\n\n'+nt['escaped']+'\n',
    f"## Efficiency\n\nEstimated waste: ~{nt['waste']} min (~${a['waste_usd']}). {nt['wnote']}\n",
    '## Improvements\n']+['- '+i for i in nt['impr']]
    open(p,'w').write('\n'.join(m)+'\n')
aj={'generated':'auditor a96f4a284bbdf078e','weights':W,'agents':[{'n':a['n'],'id':a['id'],'task':a['desc'],'type':NOTES[a['id'][:6]]['kind'],'grade':a['grade'],'score':a['score'],'scores':NOTES[a['id'][:6]]['sc'],'start':a['first'],'wall_min':a['dur_min'],'active_min':a['active_min'],'tools':a['n_tools'],'output_tokens':a['tokens']['output_tokens'],'new_tokens':a['tokens_new'],'cache_read_tokens':a['tokens']['cache_read_input_tokens'],'est_cost_usd':a['cost'],'grader_runs_full':a['full_runs'],'grader_runs_slice':a['slice_runs'],'builds':a['builds'],'est_waste_min':a['waste_min'],'est_waste_usd':a['waste_usd'],'top_issue':NOTES[a['id'][:6]]['top'],'improvements':NOTES[a['id'][:6]]['impr'],'provisional':NOTES[a['id'][:6]]['prov']} for a in rows]}
aj['totals']={'agents':len(rows),'active_min':round(tot('active_min')),'est_cost_usd':round(tot('cost'),1),'est_waste_min':tot('waste_min'),'est_waste_usd':round(tot('waste_usd'),1)}
json.dump(aj,open(AUD+'/audit.json','w'),indent=1)
json.dump(rows,open(OUT+'/rows.json','w'))
print(aj['totals']);
for a in rows:print(a['n'],a['id'][:6],a['grade'],a['score'],a['active_min'],a['cost'],a['waste_min'],a['waste_usd'])

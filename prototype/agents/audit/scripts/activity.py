"""Active time (gaps>GAP min split), idle gaps, concurrency between agents and orchestrator grader runs. Usage: activity.py OUTDIR"""
import json,sys,glob,re,os
from datetime import datetime
OUT=sys.argv[1];GAP=12
P=lambda t:datetime.fromisoformat(t.replace('Z','+00:00'))
A=json.load(open(OUT+'/agents.json'))
SUB='/root/.claude/projects/-home-user-Real-estate-portfolio-/7dc1946d-079b-5fd1-ab6e-c2df61093438/subagents'
for a in A.values():
    ts=[P(json.loads(l)['timestamp']) for l in open(f"{SUB}/agent-{a['id']}.jsonl") if '"timestamp"' in l]
    ts.sort();act=0;wins=[];s=ts[0];idle=[]
    for x,y in zip(ts,ts[1:]):
        g=(y-x).total_seconds()/60
        if g>GAP: wins.append((s,x));idle.append((x.isoformat()[5:16],round(g,1)));s=y
        else: act+=g
    wins.append((s,ts[-1]))
    a['active_min']=round(act,1);a['idle_gaps']=idle;a['wins']=[(w[0].isoformat(),w[1].isoformat()) for w in wins]
# concurrency among agents (active windows)
L=sorted(A.values(),key=lambda x:x['first'])
for a in L:
    a['concurrent']=[]
    for b in L:
        if b is a:continue
        ov=0
        for w in a['wins']:
            for v in b['wins']:
                lo=max(P(w[0]),P(v[0]));hi=min(P(w[1]),P(v[1]))
                if hi>lo:ov+=(hi-lo).total_seconds()/60
        if ov>1:a['concurrent'].append((b['id'][:6],round(ov,1)))
# orchestrator grader runs (foreground+background start) overlapping agent active windows that ran graders
MAIN='/root/.claude/projects/-home-user-Real-estate-portfolio-/7dc1946d-079b-5fd1-ab6e-c2df61093438.jsonl'
mg=[]
for l in open(MAIN):
    d=json.loads(l)
    if d['type']=='assistant':
        for b in d['message']['content']:
            if b.get('type')=='tool_use' and b['name']=='Bash' and re.search(r'node[^|;&]*grade\.js|grade\.js',b['input'].get('command','')) and not re.search(r'^\s*(grep|sed|cat)',b['input'].get('command','')):
                mg.append(d['timestamp'])
coll={}
for t in mg:
    tt=P(t)
    for a in L:
        if a['n_grader']==0 or a['id'].startswith('a96f4a'):continue
        for w in a['wins']:
            if P(w[0])<=tt<=P(w[1]): coll.setdefault(a['id'][:6],[]).append(t[5:16])
json.dump({'orch_grader_cmds':len(mg),'orch_cmds_inside_agent_windows':coll},open(OUT+'/orch_collisions.json','w'),indent=1)
json.dump(A,open(OUT+'/agents.json','w'),indent=1)
for a in L: print(a['id'][:6],a['dur_min'],a['active_min'],a['idle_gaps'][:3],a['concurrent'][:4])
print(len(mg),{k:len(v) for k,v in coll.items()})

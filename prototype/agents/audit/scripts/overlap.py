"""Find concurrent grader runs across agents (collision risk). Usage: overlap.py OUTDIR"""
import json,sys
from datetime import datetime
OUT=sys.argv[1];A=json.load(open(OUT+'/agents.json'))
P=lambda t:datetime.fromisoformat(t.replace('Z','+00:00'))
runs=[]
for a in A.values():
    for g in a['graders']:
        if g['end'] and g['dur_s'] is not None and g['dur_s']>20: runs.append((P(g['start']),P(g['end']),a['id'],g['cmd'][:60]))
runs.sort();pairs={};tot=0
for i,r in enumerate(runs):
    for s in runs[i+1:]:
        if s[0]>=r[1]:break
        if s[2]!=r[2]:
            k=tuple(sorted((r[2],s[2])));ov=(min(r[1],s[1])-s[0]).total_seconds()/60
            pairs.setdefault(k,[0,0]);pairs[k][0]+=1;pairs[k][1]+=ov;tot+=ov
res={'long_runs':len(runs),'overlap_pairs':{'|'.join(k):{'n':v[0],'min':round(v[1],1)} for k,v in pairs.items()},'total_overlap_min':round(tot,1)}
json.dump(res,open(OUT+'/overlap.json','w'),indent=1);print(json.dumps(res,indent=1)[:3000])
# per-agent grader stats
for a in A.values():
    d=[g['dur_s'] for g in a['graders'] if g['dur_s']]
    a['grader_total_min']=round(sum(d)/60,1)
json.dump(A,open(OUT+'/agents.json','w'),indent=1)

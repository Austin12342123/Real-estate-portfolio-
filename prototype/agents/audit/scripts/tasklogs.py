"""Classify tasks/*.output files. Usage: tasklogs.py OUTDIR"""
import os,json,re,sys,collections
T='/tmp/claude-0/-home-user-Real-estate-portfolio-/7dc1946d-079b-5fd1-ab6e-c2df61093438/tasks'
OUT=sys.argv[1];rows=[]
for f in sorted(os.listdir(T)):
    p=os.path.join(T,f);link=os.path.islink(p)
    sz=os.path.getsize(p) if os.path.exists(p) else -1
    kind='agent-transcript' if link else 'bash/monitor-log'
    txt=''
    if not link: txt=open(p,errors='replace').read()
    rows.append({'file':f,'kind':kind,'size':sz,'mtime':os.path.getmtime(p) if os.path.exists(p) else 0,
      'head':txt[:200].replace('\n',' | '),'has_pass_fail':bool(re.search(r'FAIL|<--|TOTAL|Grade|/100',txt)),'exit_nonzero':bool(re.search(r'exit code [1-9]|Exit code [1-9]',txt))})
json.dump(rows,open(OUT+'/tasklogs.json','w'),indent=1)
c=collections.Counter((r['kind'],r['size']<200) for r in rows);print(c)
print(sum(r['has_pass_fail'] for r in rows),'logs with grader output;', sum(1 for r in rows if r['kind']!='agent-transcript' and r['size']<60),'tiny (<60B) logs')

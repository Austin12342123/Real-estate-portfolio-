"""Verification/efficiency metrics per agent: full vs slice grader runs, edit-after-last-full-run, png views, retries. Usage: metrics.py OUTDIR"""
import json,sys,re,collections
from datetime import datetime
OUT=sys.argv[1]
P=lambda t:datetime.fromisoformat(t.replace('Z','+00:00'))
A=json.load(open(OUT+'/agents.json'))
SUB='/root/.claude/projects/-home-user-Real-estate-portfolio-/7dc1946d-079b-5fd1-ab6e-c2df61093438/subagents'
SLICE=re.compile(r'(MAIN|FINANCE|INFO|GEST|UX|DESIGN|SYNC|LOGIC|J|K|G|N|NUMB)_ONLY=|ONLY_CHECKS=')
for a in A.values():
    pend={};full=[];sl=[];edits=[];png=0;readsrc=0;paths=collections.Counter();v4edit=[];errs=0;reports=[]
    for l in open(f"{SUB}/agent-{a['id']}.jsonl"):
        d=json.loads(l);ts=d.get('timestamp')
        if d['type']=='assistant':
            for b in d['message']['content']:
                if b.get('type')!='tool_use':continue
                i=b['input'];n=b['name']
                if n=='Read' and str(i.get('file_path','')).endswith('.png'):png+=1
                if n=='Bash':
                    c=i.get('command','')
                    if re.search(r'node\s+(\S*/)?grade\.js|node \S*grade\.js',c) and not re.match(r'\s*(grep|cat|sed|head|tail)\b',c):
                        (sl if SLICE.search(c) else full).append({'ts':ts,'bg':bool(i.get('run_in_background')),'cmd':c[:120]})
                    if re.search(r"(sed -i|>\s*\S*v4/|python3? - .*v4|cat > \S*v4)",c) and 'v4' in c: v4edit.append(ts)
                    if 'build-artifact' in c: v4edit.append(ts)
                if n in('Edit','Write'):
                    fp=i.get('file_path','')
                    if '/v4/' in fp and not fp.endswith('.png'): v4edit.append(ts)
                    elif '/grader/' in fp: edits.append(ts)
        elif d['type']=='user' and isinstance(d['message']['content'],list):
            for b in d['message']['content']:
                if b.get('type')=='tool_result' and b.get('is_error'):errs+=1
    lastfull=max([x['ts'] for x in full],default=None);lastv4=max(v4edit,default=None);lastg=max(edits,default=None)
    a['full_runs']=len(full);a['slice_runs']=len(sl);a['png_views']=png;a['tool_errors']=errs
    a['edit_after_last_full']=bool(lastfull and lastv4 and lastv4>lastfull and not re.search(r'build-artifact',''))
    a['minutes_between_last_full_and_end']=round((P(a['last'])-P(lastfull)).total_seconds()/60,1) if lastfull else None
    a['last_v4_edit_after_full_min']=round((P(lastv4)-P(lastfull)).total_seconds()/60,1) if lastfull and lastv4 and lastv4>lastfull else 0
    a['grader_file_edit_after_full']=bool(lastfull and lastg and lastg>lastfull)
json.dump(A,open(OUT+'/agents.json','w'),indent=1)
for a in sorted(A.values(),key=lambda x:x['first']):
    print(a['id'][:6],'full',a['full_runs'],'slice',a['slice_runs'],'png',a['png_views'],'err',a['tool_errors'],'v4edit_after_full_min',a['last_v4_edit_after_full_min'],'grader_edit_after',a['grader_file_edit_after_full'],'active',a['active_min'])

"""Per-agent metrics from subagent transcripts + launch metadata. Usage: inventory.py OUTDIR"""
import json,sys,os,re,glob,collections
from datetime import datetime
SUB='/root/.claude/projects/-home-user-Real-estate-portfolio-/7dc1946d-079b-5fd1-ab6e-c2df61093438/subagents'
OUT=sys.argv[1]
main=json.load(open(OUT+'/main.json'))
def P(ts):return datetime.fromisoformat(ts.replace('Z','+00:00'))
def txt(c):
    if isinstance(c,str):return c
    return '\n'.join((b.get('text') or '') if b.get('type')=='text' else (str(b.get('content',''))[:0]) for b in c if isinstance(b,dict))
launch_by_tu={l['id']:l for l in main['launches']}
agents={}
for f in sorted(glob.glob(SUB+'/agent-*.jsonl')):
    aid=os.path.basename(f)[6:-6]
    meta=json.load(open(f[:-6]+'.meta.json'))
    recs=[json.loads(l) for l in open(f)]
    a={'id':aid,'desc':meta.get('description'),'toolUseId':meta.get('toolUseId'),'type':meta.get('agentType')}
    L=launch_by_tu.get(a['toolUseId'])
    a['launch_ts']=L['ts'] if L else None
    a['prompt']=''
    tools=collections.Counter();tok=collections.Counter();bash=[];edits=[];final=None;turns=0
    seen={};first=last=None;followups=[];pending={};graders=[];reads=collections.Counter()
    for r in recs:
        ts=r.get('timestamp')
        if ts:
            first=first or ts;last=ts
        if r['type']=='user':
            m=r['message'];c=m['content']
            if isinstance(c,str) and not r.get('isMeta'):
                if not a['prompt']:a['prompt']=c
                else:followups.append({'ts':ts,'text':c[:600]})
            elif isinstance(c,list):
                for b in c:
                    if b.get('type')=='tool_result' and b.get('tool_use_id') in pending:
                        p=pending.pop(b['tool_use_id']);p['end']=ts
                        s=b.get('content');s=s if isinstance(s,str) else txt(s)
                        p['err']=bool(b.get('is_error'));p['out']=s[:300]
                    if b.get('type')=='text' and not a['prompt'] and not b['text'].startswith('<system'):a['prompt']=b['text']
        if r['type']=='assistant':
            m=r['message'];u=m.get('usage') or {}
            mid=m.get('id')
            for k in('input_tokens','output_tokens','cache_read_input_tokens','cache_creation_input_tokens'):
                seen.setdefault(mid,{})[k]=max(seen.get(mid,{}).get(k,0),u.get(k,0) or 0)  # dedupe: usage repeated per content block
            turns+=1
            for b in m['content']:
                if b.get('type')=='tool_use':
                    n=b['name'];tools[n]+=1
                    i=b['input'];rec={'ts':ts,'name':n,'id':b['id']}
                    if n=='Bash':
                        rec['cmd']=i.get('command','');bash.append(rec);pending[b['id']]=rec
                    elif n in('Edit','Write'):
                        edits.append({'ts':ts,'file':i.get('file_path'),'tool':n})
                    elif n=='Read':reads[i.get('file_path')]+=1
                    elif n=='SubagentHandback':final=i.get('message')
                elif b.get('type')=='text' and b['text'].strip():
                    last_text=b['text']
    for u in seen.values():
        for k,v in u.items():tok[k]+=v
    if final is None: final=locals().get('last_text','')
    for b in bash:
        c=b['cmd']
        if re.search(r'grade\.js|grade-|Playwright|playwright|run-all|node .*grade',c):
            b['dur']=(P(b['end'])-P(b['ts'])).total_seconds() if b.get('end') else None
            graders.append({'start':b['ts'],'end':b.get('end'),'dur_s':b['dur'],'cmd':c[:200],'bg':'run_in_background' in c})
    a.update(first=first,last=last,dur_min=round((P(last)-P(first)).total_seconds()/60,1) if first else None,
      turns=turns,tools=dict(tools),n_tools=sum(tools.values()),tokens=dict(tok),
      tokens_total=sum(tok.values()),tokens_new=tok['input_tokens']+tok['output_tokens']+tok['cache_creation_input_tokens'],
      n_edits=len(edits),edited_files=sorted({e['file'] for e in edits if e['file']}),
      graders=graders,n_grader=len(graders),
      git_cmds=[b['cmd'][:160] for b in bash if re.search(r'\bgit (commit|push|add|stash|reset|checkout|rebase)',b['cmd'])],
      sleeps=[b['cmd'][:100] for b in bash if re.search(r'\bsleep\b',b['cmd'])],
      builds=sum(1 for b in bash if 'build-artifact' in b['cmd']),
      rereads={k:v for k,v in reads.items() if v>2},
      bash_errors=sum(1 for b in bash if b.get('err')),
      final=final,followups=followups,n_followups=len(followups),
      prompt_len=len(a['prompt']),bash_n=len(bash))
    agents[aid]=a
json.dump(agents,open(OUT+'/agents.json','w'),indent=1)
print(len(agents))
for a in sorted(agents.values(),key=lambda x:x['first']):
    print(a['id'][:6],a['first'][5:16],a['dur_min'],a['n_tools'],a['tokens_new']//1000,'k new g=',a['n_grader'],'b=',a['builds'],a['desc'][:50])

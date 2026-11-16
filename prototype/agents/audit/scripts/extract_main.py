"""Extract user messages, Agent launches, task notifications from the main transcript -> OUT dir json."""
import json,sys,re
MAIN='/root/.claude/projects/-home-user-Real-estate-portfolio-/7dc1946d-079b-5fd1-ab6e-c2df61093438.jsonl'
OUT=sys.argv[1]
users=[];launches=[];notes=[];qops=[];asst=[]
def txt(c):
    if isinstance(c,str):return c
    return '\n'.join(b.get('text','') for b in c if isinstance(b,dict) and b.get('type')=='text')
for i,l in enumerate(open(MAIN)):
    try:d=json.loads(l)
    except:continue
    t=d.get('type');ts=d.get('timestamp')
    if t=='queue-operation' and d.get('operation')=='enqueue':
        qops.append({'i':i,'ts':ts,'content':d.get('content','')})
    if t=='user':
        m=d['message'];c=m['content']
        if isinstance(c,list) and any(b.get('type')=='tool_result' for b in c if isinstance(b,dict)):
            for b in c:
                if b.get('type')=='tool_result':
                    s=b.get('content');s=txt(s) if not isinstance(s,str) else s
                    if 'agentId' in s[:3000] or 'Async agent' in s[:300] or 'task-id' in s[:300]:
                        notes.append({'i':i,'ts':ts,'tool_use_id':b.get('tool_use_id'),'text':s[:1500]})
            continue
        users.append({'i':i,'ts':ts,'text':txt(c),'meta':d.get('isMeta')})
    if t=='assistant':
        for b in d['message']['content']:
            if b.get('type')=='tool_use' and b['name'] in('Agent','Task'):
                launches.append({'i':i,'ts':ts,'id':b['id'],'input':b['input']})
        asst.append({'i':i,'ts':ts,'u':d['message'].get('usage')})
json.dump({'users':users,'launches':launches,'notes':notes,'qops':qops},open(OUT+'/main.json','w'))
print(len(users),len(launches),len(notes),len(qops))

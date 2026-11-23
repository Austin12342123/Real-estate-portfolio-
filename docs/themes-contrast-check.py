import json,sys
import os
T=json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)),"themes.json")))
def lum(h):
    h=h.lstrip('#'); c=[int(h[i:i+2],16)/255 for i in (0,2,4)]
    c=[x/12.92 if x<=0.03928 else ((x+0.055)/1.055)**2.4 for x in c]
    return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]
def cr(a,b):
    A,B=lum(a),lum(b); return (max(A,B)+0.05)/(min(A,B)+0.05)
bad=0
for n,t in T.items():
    pairs=[(f,b) for f in("text","textMuted","accent","good","warn","bad") for b in("bg","surface","surface2")]+[("onAccent","accent")]
    worst=min((cr(t[f],t[b]),f,b) for f,b in pairs)
    fails=[(f,b,round(cr(t[f],t[b]),2)) for f,b in pairs if cr(t[f],t[b])<4.5]
    bad+=len(fails)
    print(n,"worst",round(worst[0],2),worst[1],"on",worst[2],"FAILS" if fails else "ok",fails)
sys.exit(1 if bad else 0)

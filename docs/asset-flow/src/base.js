/* shared component CSS (frames, list chrome, verdicts, info buttons, deck extras); the grader checks it too */
module.exports = `.app{background:var(--bg);color:var(--text);font-family:var(--fb);font-weight:var(--wb);-webkit-text-stroke:var(--stroke)}
.ph{width:390px;max-width:100%;border:1px solid var(--border);border-radius:32px;padding:20px 16px 24px;background:var(--bg);color:var(--text);font-family:var(--fb);font-size:16px;line-height:1.4;position:relative;overflow:hidden}
.ph button{font-family:inherit;cursor:pointer}.ph h2,.ph h3{margin:0}
.sbar{display:flex;justify-content:space-between;font:600 13px var(--fb);color:var(--text);margin:-6px 4px 14px}
.cardx{background:var(--surface);border:1px solid var(--border);border-radius:var(--r);padding:16px;margin-top:12px}
.lhr{display:flex;justify-content:space-between;align-items:center}
.bk{background:none;border:0;color:var(--accent);font:600 16px var(--fb);min-height:44px;padding:0}
.add{min-height:44px;border-radius:var(--r);background:var(--accent);color:var(--onAccent);border:0;padding:0 16px;font:600 16px var(--fb)}
.lt{font:var(--wh) 28px var(--fd);margin:2px 0 2px}.ls{font-size:13px;color:var(--muted);margin:0}.ls b.good{color:var(--good)}.ls b.bad{color:var(--bad)}
.so{display:flex;gap:6px;overflow-x:auto;margin:12px -16px 0;padding:0 16px}.so button{flex:none;min-height:44px;border-radius:999px;border:1px solid var(--border);background:var(--surface);color:var(--text);font:500 13px var(--fb);padding:0 14px}.so .on{background:var(--text);color:var(--bg);border-color:var(--text)}
.vd{font-size:13px;font-weight:600;white-space:nowrap}.vd.ok{color:var(--good)}.vd.warn{color:var(--warn)}.vd.bad{color:var(--bad)}
.i{position:relative;flex:none;width:18px;height:18px;padding:0;border-radius:50%;border:1px solid var(--muted);background:none;color:var(--muted);font:600 12px/16px var(--fb);text-align:center;margin-left:4px;vertical-align:middle;-webkit-text-stroke:0}.i::before{content:"";position:absolute;inset:-13px}
.pf{background:var(--surface);border:1px solid var(--border);border-radius:var(--r);padding:14px 16px;display:grid;grid-template-columns:1fr 1fr;gap:10px}.pf span{display:block;font-size:13px;color:var(--muted)}.pf b{font:var(--wn) 22px var(--fd);font-variant-numeric:tabular-nums}
.pt{font:var(--wh) 34px var(--fd);margin:0 0 12px}
.cc{display:flex;justify-content:space-between;align-items:center;min-height:56px;background:var(--surface);border:1px solid var(--border);border-radius:var(--r);padding:0 16px;margin-top:12px;font:var(--wh) 20px var(--fd)}.cc small{font:400 13px var(--fb);color:var(--muted);margin-right:auto;margin-left:10px}.cc span{color:var(--muted);font-size:16px}
.C7 .stack{position:relative}.C7 .cd{position:relative;touch-action:pan-y;transition:transform .22s ease}.C7 .in-right,.C7 .in-left{animation:rise .22s ease}.C7 .ghost{position:absolute;top:0;left:0;right:0;z-index:2;pointer-events:none;transition:transform .24s ease-in,opacity .24s ease-in}.chips.m6{display:grid;grid-template-columns:repeat(6,minmax(0,1fr))}.chips.m6 .chip{padding:0}
@keyframes rise{from{transform:scale(.96);opacity:.5}}
@media (prefers-reduced-motion:reduce){.C7 .in-right,.C7 .in-left{animation:none}.C7 .ghost{display:none}.C7 .cd{transition:none}}
.C7 .q .i{width:22px;height:22px;line-height:20px}
.C7 .chips{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px}.C7 .chip{min-height:44px;padding:0 14px;border-radius:999px;border:1px solid var(--border);background:var(--surface2);color:var(--text);font:600 16px var(--fb)}.C7 .chip.on{background:var(--accent);color:var(--onAccent);border-color:var(--accent)}
.C7 .tin.sm{min-height:48px;font-size:16px;margin-bottom:10px}.C7 .tin .post{font-size:13px;color:var(--muted);white-space:nowrap}.C7 .tin{margin-bottom:10px}
.C7 .lv{font-size:16px;color:var(--text);margin:4px 0 0;font-weight:600}
.C7 .rv{display:grid;grid-template-columns:minmax(6.5em,auto) minmax(0,1fr) auto;gap:10px;align-items:center;min-height:44px;border-bottom:1px solid var(--border);font-size:16px}.C7 .rv span{color:var(--muted)}.C7 .rv b{font-variant-numeric:tabular-nums;text-align:right;min-width:0;overflow-wrap:anywhere}.C7 .ed{background:none;border:0;color:var(--accent);font:600 16px var(--fb);min-height:44px;min-width:44px;padding:0 0 0 4px}
.C7 .rvs{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:14px 0;padding:10px 12px;border-radius:var(--r);background:var(--surface2)}.C7 .rvs b{font:var(--wn) 16px var(--fd)}
.C7 .save{width:100%;min-height:52px;border:0;border-radius:var(--r);background:var(--accent);color:var(--onAccent);font:600 16px var(--fb)}
.C7 .bb[disabled]{opacity:.45}.C7 .ft{flex-wrap:nowrap}.C7 .ft .hint{flex:1;min-width:0;text-align:center;line-height:1.3}.C7 .ft button{flex:none}
.still{pointer-events:none}.still .cd{box-shadow:none}
#pop{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);width:min(360px,calc(100vw - 32px));z-index:9;background:var(--surface);color:var(--text);border:1px solid var(--border);border-radius:var(--r);padding:16px;box-shadow:0 10px 30px rgba(0,0,0,.25)}#pop h4{margin:0 0 6px;font:var(--wh) 18px var(--fd)}#pop p{margin:0 0 12px;font-size:15px}#pop button{min-height:44px;padding:0 16px;border-radius:var(--r);border:1px solid var(--border);background:var(--surface2);color:var(--text);font:600 15px var(--fb)}.chg{display:inline-flex;align-items:center;min-height:44px;background:none;border:0;padding:0;margin:-4px 0 4px;color:var(--accent);font:600 14px var(--fb);cursor:pointer}.rtw{border-top:1px solid var(--border);padding-top:10px}.rth{font:600 14px var(--fb);margin:0 0 2px;color:var(--text)}`;

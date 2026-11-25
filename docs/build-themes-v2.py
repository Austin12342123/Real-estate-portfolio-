#!/usr/bin/env python3
"""Themes v2 (Austin, Nov 25): 4 colors per theme, rounded corners, rounder unique font.
Every color token is one of the theme's 4 palette colors or a mix of two of them.
Writes themes-v2.json next to this file and prints the contrast results."""
import json, os, sys
H = os.path.dirname(os.path.abspath(__file__))
def rgb(h): h = h.lstrip('#'); return [int(h[i:i+2], 16) for i in (0, 2, 4)]
def hexs(c): return '#%02X%02X%02X' % tuple(round(x) for x in c)
def mix(a, b, t): A, B = rgb(a), rgb(b); return hexs([A[i] + (B[i] - A[i]) * t for i in range(3)])
def lum(h):
    c = [x / 255 for x in rgb(h)]; c = [x / 12.92 if x <= 0.03928 else ((x + 0.055) / 1.055) ** 2.4 for x in c]
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
def cr(a, b): A, B = lum(a), lum(b); return (max(A, B) + 0.05) / (min(A, B) + 0.05)

# palette order: paper, ink, accent color, alert color. Roles name which palette color does what.
SPEC = {
 'oxford':      dict(mode='light', palette=['#F7F3EA', '#14213D', '#1F5135', '#7A1F2B'], accent='ink', good='c3', bad='c4',
                     names=['ivory', 'navy', 'Oxford green', 'oxblood'],
                     font='Lora', fontFile='lora-latin-wght-normal.woff2', numbers='Lora', wBody=500, wHead=700, wNum=700, radius=[10, 14, 20],
                     style='Rounded brushed serif in place of Times New Roman; heavier text kept'),
 'clay':        dict(mode='light', palette=['#F4F2EF', '#171513', '#4D6A48', '#9C3E25'], accent='ink', good='c3', bad='c4',
                     names=['off-white', 'near-black', 'sage', 'terracotta'],
                     font='Nunito', fontFile='nunito-latin-wght-normal.woff2', numbers='Nunito', wBody=450, wHead=750, wNum=700, radius=[14, 20, 28],
                     style='Soft round-ended sans; black controls, terracotta highlight'),
 'cottagecore': dict(mode='light', palette=['#F4F0E1', '#3A2E24', '#4A6A36', '#98413A'], accent='c3', good='c3', bad='c4',
                     names=['cream', 'bark brown', 'moss', 'rosewood'],
                     font='M PLUS Rounded 1c', fontFile='m-plus-rounded-1c-latin-500-normal.woff2 + -700-normal.woff2', numbers='M PLUS Rounded 1c', wBody=500, wHead=700, wNum=700, radius=[12, 18, 24],
                     style='Fully rounded sans; heavier text kept'),
 'technoir':    dict(mode='dark', palette=['#0B0C0F', '#E3E6EC', '#5CC8D6', '#FF6B85'], accent='c3', good='c3', bad='c4',
                     names=['black', 'silver', 'cyan', 'neon rose'],
                     font='Recursive (Casual)', fontFile='recursive-latin-casl-normal.woff2', numbers='Recursive (Casual)', wBody=420, wHead=700, wNum=600, radius=[10, 12, 16],
                     style='Rounded casual tech sans (CASL 1)'),
 'darkacademia':dict(mode='dark', palette=['#111A14', '#E8DFCB', '#C8A75E', '#D98A8A'], accent='c3', good='c3', bad='c4',
                     names=['forest black', 'parchment', 'brass', 'claret rose'],
                     font='Fraunces (Soft)', fontFile='fraunces-latin-soft-normal.woff2', numbers='Young Serif', numbersFile='young-serif-latin-400-normal.woff2', wBody=420, wHead=650, wNum=400, radius=[10, 12, 16],
                     style='Old-style serif at SOFT 100 (rounded serifs); figures in Young Serif because Fraunces has no tabular digits'),
 'ember':       dict(mode='dark', palette=['#161311', '#F2EBE3', '#E9B65A', '#F0775A'], accent='c3', good='c3', bad='c4',
                     names=['charcoal', 'cream', 'flame gold', 'ember red'],
                     font='Baloo 2', fontFile='baloo-2-latin-wght-normal.woff2', numbers='Baloo 2', wBody=450, wHead=700, wNum=600, radius=[14, 18, 24],
                     style='Chunky warm rounded sans'),
}
def solve(paper, ink, surfaces, need):
    for i in range(1, 101):
        c = mix(paper, ink, i / 100)
        if all(cr(c, s) >= need for s in surfaces): return c, i / 100
    raise SystemExit('cannot reach %s' % need)
out, fails = {}, 0
for n, s in SPEC.items():
    p, k, c3, c4 = s['palette']; role = {'ink': k, 'c3': c3, 'c4': c4}
    if s['mode'] == 'light': bg, surface, surface2 = mix(p, k, .05), p, mix(p, k, .09)
    else: bg, surface, surface2 = p, mix(p, k, .06), mix(p, k, .11)
    surf = [bg, surface, surface2]
    control, tc = solve(p, k, surf, 3.2)
    muted, tm = solve(p, k, surf, 4.7)
    accent = role[s['accent']]
    on = max([p, k], key=lambda x: cr(x, accent))
    t = dict(mode=s['mode'], palette=s['palette'], bg=bg, surface=surface, surface2=surface2, border=mix(p, k, .16), control=control,
             text=k, textMuted=muted, accent=accent, onAccent=on, good=role[s['good']], warn=role[s['bad']], bad=role[s['bad']],
             fontDisplay=s['font'], fontBody=s['font'], fontNumbers=s['numbers'], fontWeightBody=str(s['wBody']), fontWeightHeading=str(s['wHead']),
             fontWeightNumbers=str(s['wNum']), radiusSm='%dpx' % s['radius'][0], radius='%dpx' % s['radius'][1], radiusLg='%dpx' % s['radius'][2], radiusPill='999px',
             mixes=dict(bg=('paper', 'ink', .05) if s['mode'] == 'light' else ('paper',), surface=('paper',) if s['mode'] == 'light' else ('paper', 'ink', .06),
                        surface2=('paper', 'ink', .09 if s['mode'] == 'light' else .11), border=('paper', 'ink', .16), control=('paper', 'ink', tc), textMuted=('paper', 'ink', tm)))
    pairs = [(f, b) for f in ('text', 'textMuted', 'accent', 'good', 'warn', 'bad') for b in ('bg', 'surface', 'surface2')] + [('onAccent', 'accent')]
    fl = [(f, b, round(cr(t[f], t[b]), 2)) for f, b in pairs if cr(t[f], t[b]) < 4.5]
    fl += [('control', b, round(cr(t['control'], t[b]), 2)) for b in ('bg', 'surface', 'surface2') if cr(t['control'], t[b]) < 3.0]
    worst = min((cr(t[f], t[b]), f, b) for f, b in pairs)
    # four-color rule: every color token is a palette color or a recorded mix of two palette colors
    pal = set(s['palette']); direct = {t[x] for x in ('text', 'accent', 'onAccent', 'good', 'warn', 'bad')}
    if not direct <= pal: fl.append(('four-color', 'direct tokens outside palette', sorted(direct - pal)))
    if len(pal) != 4: fl.append(('four-color', 'palette size', len(pal)))
    gb = cr(t['good'], t['bad']) if t['good'] != t['bad'] else 0
    fails += len(fl); out[n] = t
    print('%-12s worst %.2f (%s on %s)  control %.2f  good-vs-bad hue pair %s  %s' % (n, worst[0], worst[1], worst[2], min(cr(control, x) for x in surf), 'distinct' if t['good'] != t['bad'] else 'SAME', 'FAILS %s' % fl if fl else 'ok'))
    out[n]['fontFile'] = s['fontFile']; out[n]['style'] = s['style']; out[n]['paletteNames'] = s['names']
    if 'numbersFile' in s: out[n]['fontNumbersFile'] = s['numbersFile']
json.dump(out, open(os.path.join(H, 'themes-v2.json'), 'w'), indent=1)
sys.exit(1 if fails else 0)

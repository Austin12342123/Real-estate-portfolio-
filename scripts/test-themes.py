#!/usr/bin/env python3
"""Checks: themes.css matches docs/themes.json token-for-token; contrast script runs; inventory script runs."""
import json, os, re, subprocess, sys
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
T = json.load(open(os.path.join(R, 'docs/themes.json')))
css = open(os.path.join(R, 'ui/shared/themes.css')).read()
kebab = lambda s: ''.join('-' + c.lower() if c.isupper() else c for c in s)
errs = []
blocks = dict(re.findall(r'\[data-theme=(\w+)\]\{(.*?)\n\}', css, re.S))
if set(blocks) != set(T): errs.append('theme set differs: %s vs %s' % (sorted(blocks), sorted(T)))
for n, t in T.items():
    decl = dict(re.findall(r'--th-([\w-]+):(.*?);', blocks.get(n, '')))
    want = {kebab(k): v for k, v in t.items() if k != 'mode'}
    if decl != want: errs.append('%s: css != json (%s)' % (n, sorted(set(decl.items()) ^ set(want.items()))[:3]))
    if 'color-scheme:%s;' % t['mode'] not in blocks.get(n, ''): errs.append(n + ': color-scheme')
if re.search(r'@import|url\(|@font-face', css): errs.append('font download / url() in themes.css')
r = subprocess.run([sys.executable, os.path.join(R, 'scripts/color-inventory.py')], capture_output=True, text=True)
if r.returncode: errs.append('color-inventory failed: ' + r.stderr[-200:])
r = subprocess.run([sys.executable, os.path.join(R, 'scripts/themes-contrast-check.py')], capture_output=True, text=True)
if r.returncode not in (0, 1) or len(r.stdout.strip().split('\n')) != len(T): errs.append('contrast script malformed output')
print('FAIL' if errs else 'PASS', *errs, sep='\n')
sys.exit(1 if errs else 0)

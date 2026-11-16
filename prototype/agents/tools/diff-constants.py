"""Show changed numeric constants/thresholds in a unified diff. Usage: git diff -U0 -- files | diff-constants.py [--self-test]
Pairs removed/added lines inside each hunk; reports every pair whose multiset of numbers differs, with a LOOSEN? flag when a comparison
floor went down (>, >=) or a ceiling/tolerance went up (<, <=, 'tol', 'near', 'abs', 'rel'). Added lines with new numeric comparisons and removed checks (a deleted line containing t(/check( ) are reported too.
Exit 0 always (informational); the caller decides. Prints 'NO CONSTANT CHANGES' when clean."""
import re, sys
NUM = re.compile(r'(?<![\w.])-?\d+(?:\.\d+)?(?:e-?\d+)?(?![\w])')
def nums(s): return sorted(NUM.findall(re.sub(r"(['\"]).*?\1", '""', s)))  # ignore string literals
def loosen(old, new):
    o = [float(x) for x in nums(old)]; n = [float(x) for x in nums(new)]
    if len(o) != len(n): return False
    floor = re.search(r'>=?|\bmin\b|floor', new) and not re.search(r'<=?', new)
    ceil = re.search(r'<=?|\btol|near|abs|rel|max', new)
    for a, b in zip(o, n):
        if a != b and ((floor and b < a) or (ceil and not floor and b > a)): return True
    return False
def run(text):
    f = ''; ln = 0; rem = []; add = []; out = []; deleted_checks = []
    def flush():
        nonlocal rem, add
        for i in range(min(len(rem), len(add))):
            if nums(rem[i][1]) != nums(add[i][1]):
                out.append(f"CONSTANT CHANGE {f}:{add[i][0]}\n   - {rem[i][1].strip()[:200]}\n   + {add[i][1].strip()[:200]}" + ("\n   !! LOOSEN? a floor went down or a ceiling/tolerance went up: must be disclosed old->new + why, and needs orchestrator sign-off" if loosen(rem[i][1], add[i][1]) else ""))
        for r in rem[len(add):]:
            if re.search(r'\b(t|check)\(', r[1]): deleted_checks.append(f"REMOVED CHECK {f}:{r[0]}  {r[1].strip()[:160]}")
        rem, add = [], []
    for l in text.splitlines():
        if l.startswith('+++ '): flush(); f = l[6:] if l.startswith('+++ b/') else l[4:]
        elif l.startswith('@@'):
            flush(); m = re.search(r'\+(\d+)', l); ln = int(m.group(1)) if m else 0
        elif l.startswith('-') and not l.startswith('---'): rem.append((ln, l[1:]))
        elif l.startswith('+') and not l.startswith('+++'): add.append((ln, l[1:])); ln += 1
    flush(); return out + deleted_checks
if __name__ == '__main__':
    if len(sys.argv) > 1 and sys.argv[1] == '--self-test':
        d = "+++ b/g.js\n@@ -5 +5 @@\n-  t(n > 1500, 'runs')\n+  t(n > 1000, 'runs')\n@@ -9 +9 @@\n-  t(a === 'x', 'name')\n+  t(a === 'y', 'name')\n@@ -20 +20 @@\n-near(a, b, 0.5)\n+near(a, b, 2)\n@@ -30,1 +29,0 @@\n-  t(ok, 'dropped')\n"
        r = run(d); ok = len(r) == 3 and 'LOOSEN' in r[0] and 'LOOSEN' in r[1] and 'REMOVED CHECK' in r[2]
        print('diff-constants.py self-test ' + ('PASS' if ok else 'FAIL: ' + repr(r))); sys.exit(0 if ok else 1)
    r = run(sys.stdin.read()); print('\n'.join(r) if r else 'NO CONSTANT CHANGES')

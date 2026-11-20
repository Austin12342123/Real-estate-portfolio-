"""Module build: bundles prototype/v4/src/engine/*.js -> engine.js and prototype/v4/src/app/*.js -> app.js.
The modules are consecutive pieces of ONE closure (an IIFE): 00-head.js opens it, 99-tail.js closes it, and the files in
between are joined in file-name order with nothing added, so the bundle has the same scope and the same order of
execution as a hand-written single file. Edit src/, then run `python3 build.py`; never edit engine.js or app.js by hand.
info.js and style.css are not generated (edit them directly). The build stamp (stamp.py) is written after bundling.
  python3 build.py          rebuild engine.js and app.js from src/, then restamp every file
  python3 build.py --check  exit 1 if engine.js or app.js differ from what src/ builds (ignoring the stamp line)
See ../MODULES.md for the module list."""
import glob, os, sys

import stamp

D = os.path.dirname(os.path.abspath(__file__))
BUNDLES = [("engine.js", "src/engine"), ("app.js", "src/app")]


def build(srcdir):
    files = sorted(glob.glob(os.path.join(D, srcdir, "*.js")))
    if not files:
        raise SystemExit("no modules in " + srcdir)
    parts = []
    for f in files:
        with open(f, encoding="utf-8", newline="") as fh:
            parts.append(fh.read())
    return stamp.EMPTY + "\n" + "".join(parts)


def stale():
    bad = []
    for out, srcdir in BUNDLES:
        want = build(srcdir)
        got = stamp.MARK.sub(stamp.EMPTY, stamp.read(out))
        if got != want:
            bad.append(out)
    return bad


if __name__ == "__main__":
    if "--check" in sys.argv:
        bad = stale()
        print("bundles " + ("STALE vs src: " + ", ".join(bad) + " (run: python3 build.py)" if bad else "ok"))
        sys.exit(1 if bad else 0)
    for out, srcdir in BUNDLES:
        with open(os.path.join(D, out), "w", encoding="utf-8", newline="") as fh:
            fh.write(build(srcdir))
    print("stamp", stamp.restamp())

"""Build stamp: one short hash of app.js + engine.js + info.js + style.css, written into each of those files
(and into the service worker cache name) so the running app can tell when it is running MIXED versions
(for example a new app.js with an old cached engine.js) and heal itself.
The stamp is a marker /*STAMP*/...../*ENDSTAMP*/ that is left out of the hash, so stamping is repeatable.
Run:  python3 stamp.py          (restamp every file)   |   python3 stamp.py --check   (exit 1 if a stamp is stale)
build-artifact.py calls restamp() first. The stamped files are committed, so GitHub Pages serves them without a build."""
import hashlib, os, re, sys

D = os.path.dirname(os.path.abspath(__file__))
FILES = [("app", "app.js"), ("engine", "engine.js"), ("info", "info.js"), ("css", "style.css")]
MARK = re.compile(r"/\*STAMP\*/.*?/\*ENDSTAMP\*/", re.S)
EMPTY = "/*STAMP*//*ENDSTAMP*/"


def line(name, h):
    if name == "css":
        return '/*STAMP*/html{--build:"%s"}/*ENDSTAMP*/' % h
    return "/*STAMP*/globalThis.__BUILD=Object.assign(globalThis.__BUILD||{},{%s:'%s'});/*ENDSTAMP*/" % (name, h)


def read(fn):
    with open(os.path.join(D, fn), encoding="utf-8", newline="") as f:
        return f.read()


def digest(texts):
    h = hashlib.sha1()
    for (name, fn), t in zip(FILES, texts):
        h.update((name + "\0").encode())
        h.update(MARK.sub(EMPTY, t).encode("utf-8"))
        h.update(b"\0")
    return h.hexdigest()[:8]


def restamp():
    texts = []
    for name, fn in FILES:
        t = read(fn)
        if not MARK.search(t):
            t = line(name, "00000000") + "\n" + t
        texts.append(t)
    h = digest(texts)
    for (name, fn), t in zip(FILES, texts):
        t2 = MARK.sub(lambda m: line(name, h), t, count=1)
        if t2 != read(fn):
            with open(os.path.join(D, fn), "w", encoding="utf-8", newline="") as f:
                f.write(t2)
    sw = read("sw.js")
    sw2 = re.sub(r"/\*STAMP\*/'[0-9a-f]*'/\*ENDSTAMP\*/", "/*STAMP*/'%s'/*ENDSTAMP*/" % h, sw)
    if sw2 != sw:
        with open(os.path.join(D, "sw.js"), "w", encoding="utf-8", newline="") as f:
            f.write(sw2)
    return h


def stamp_of(t):
    m = MARK.search(t)
    r = re.search(r"[0-9a-f]{8}", m.group(0)) if m else None
    return r.group(0) if r else None


def check():
    texts = [read(fn) for _, fn in FILES]
    return digest(texts), [stamp_of(t) for t in texts]


if __name__ == "__main__":
    if "--check" in sys.argv:
        want, got = check()
        bad = [FILES[i][1] for i, g in enumerate(got) if g != want]
        print("stamp", want, "stale: " + ", ".join(bad) if bad else "ok")
        if os.path.isdir(os.path.join(D, "src")):  # engine.js and app.js are bundles of src/ (see build.py, ../MODULES.md)
            import build
            stale = build.stale()
            print("bundles", "STALE vs src: " + ", ".join(stale) + " (run: python3 build.py)" if stale else "ok")
            bad = bad or stale
        sys.exit(1 if bad else 0)
    print(restamp())

import re
c=open("style.css").read(); eng=open("engine.js").read(); inf=open("info.js").read()
app=re.sub(r"/\*SW\*/.*?/\*ENDSW\*/","",open("app.js").read(),flags=re.S)
assert "</script" not in eng+app+inf
open("artifact.html","w").write(f"""<title>Real Estate Portfolio</title>
<meta name="claude:viewport-fit-sides" content="cover">
<style>
{c}
</style>
<main id="app" aria-live="polite"></main>
<script>
{eng}
</script>
<script>
{inf}
</script>
<script>
{app}
</script>
""")

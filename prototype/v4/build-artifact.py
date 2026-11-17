import re, stamp, base64
stamp.restamp()  # one build stamp in app.js, engine.js, info.js, style.css and the service worker cache name
c=open("style.css").read()
c=re.sub(r"url\(fonts/([\w.-]+\.woff2)\)",lambda m:"url(data:font/woff2;base64,"+base64.b64encode(open("fonts/"+m.group(1),"rb").read()).decode()+")",c)  # fonts inline: artifact.html stays self-contained
eng=open("engine.js").read(); inf=open("info.js").read()
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

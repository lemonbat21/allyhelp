#!/usr/bin/env python3
"""Pack the app into ONE self-contained HTML file.

    python3 tools/build_artifact.py
      → dist/cloud-cat.html   for publishing on claude.ai (the cat chats with the viewer's Claude)
      → cloud-cat.html        a standalone file you can open in any browser (paste an OpenAI key in Settings)

Inlines the CSS, the SVG artwork and every JS module (no network requests except
Google Fonts). The normal multi-file app (index.html) is unchanged.
"""
import base64
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MODULES = ["persona", "data", "storage", "audio", "ai", "app"]  # dependency order
ASSETS = ["cloud-cat", "running-cat", "scene-suitcase", "scene-train", "scene-airport", "star"]

IMPORT_NAMED = re.compile(r"^import\s*\{([^}]*)\}\s*from\s*'\./([\w-]+)\.js';\s*$", re.M)
IMPORT_STAR = re.compile(r"^import\s*\*\s*as\s+(\w+)\s+from\s*'\./([\w-]+)\.js';\s*$", re.M)
EXPORT = re.compile(r"^export\s+(async\s+function|function|const|let)\s+(\w+)", re.M)


def wrap_module(name: str) -> str:
    src = (ROOT / "js" / f"{name}.js").read_text()
    # `import { a as b }` becomes destructuring `const { a: b }`
    src = IMPORT_NAMED.sub(lambda m: f"const {{{re.sub(r'(\w+)\s+as\s+(\w+)', r'\1: \2', m.group(1))}}} = __mod_{m.group(2)};", src)
    src = IMPORT_STAR.sub(lambda m: f"const {m.group(1)} = __mod_{m.group(2)};", src)
    names = [m.group(2) for m in EXPORT.finditer(src)]
    src = EXPORT.sub(lambda m: f"{m.group(1)} {m.group(2)}", src)
    if re.search(r"^\s*(import|export)\b", src, re.M):
        raise SystemExit(f"{name}.js has an import/export this build can't handle")
    return f"const __mod_{name} = (() => {{\n{src}\nreturn {{ {', '.join(names)} }};\n}})();\n"


def main():
    base_css = (ROOT / "styles.css").read_text()
    # claude.ai already pads the page for the phone's top inset.
    css = base_css + "\n/* claude.ai page */\n.sky { padding-top: 0; }\n.cloudcat { top: 36px; animation-name: float-artifact; }\n@keyframes float-artifact { 0%, 100% { top: 36px; } 50% { top: 29px; } }\n.bubble { top: 46px; }\n"

    html = (ROOT / "index.html").read_text()
    body = html[html.index("<body>") + len("<body>"): html.index("</body>")]
    body = body.replace('<script type="module" src="js/app.js"></script>', "").strip()

    svgs = {n: (ROOT / "assets" / f"{n}.svg").read_text() for n in ASSETS}
    svg_json = json.dumps(svgs).replace("</", "<\\/")
    icons = {p.stem: "data:image/png;base64," + base64.b64encode(p.read_bytes()).decode()
             for p in sorted((ROOT / "assets" / "icons").glob("*.png"))}
    icon_json = json.dumps(icons)
    bundle = "".join(wrap_module(m) for m in MODULES)
    if "</script" in bundle.lower():
        raise SystemExit("bundle contains </script")

    page = f"""<title>Cloud Cat</title>
<meta name="claude:viewport-fit-sides" content="cover">
<meta name="color-scheme" content="light only">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Nunito:wght@500;700;800;900&display=swap" rel="stylesheet">
<style>
{css}
</style>
{body}
<script>window.__ARTIFACT = true; window.__INLINE_SVG = {svg_json}; window.__INLINE_ICONS = {icon_json};</script>
<script type="module">
{bundle}
</script>
"""
    out = ROOT / "dist" / "cloud-cat.html"
    out.parent.mkdir(exist_ok=True)
    out.write_text(page)
    print(f"wrote {out.relative_to(ROOT)} ({len(page) // 1024} KB)")

    # Standalone file: a complete page that runs from anywhere (file, Drive, any host).
    icon_svg = base64.b64encode((ROOT / "assets" / "icon.svg").read_bytes()).decode()
    standalone = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Cloud Cat</title>
<meta name="theme-color" content="#EDE6FF">
<meta name="color-scheme" content="light only">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Cloud Cat">
<link rel="icon" href="data:image/svg+xml;base64,{icon_svg}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Nunito:wght@500;700;800;900&display=swap" rel="stylesheet">
<style>
{base_css}
</style>
</head>
<body>
{body}
<script>window.__STANDALONE = true; window.__INLINE_SVG = {svg_json}; window.__INLINE_ICONS = {icon_json};</script>
<script type="module">
{bundle}
</script>
</body>
</html>
"""
    out2 = ROOT / "cloud-cat.html"
    out2.write_text(standalone)
    print(f"wrote {out2.relative_to(ROOT)} ({len(standalone) // 1024} KB)")


if __name__ == "__main__":
    main()

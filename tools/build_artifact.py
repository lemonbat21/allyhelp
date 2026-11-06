#!/usr/bin/env python3
"""Pack the app into ONE self-contained HTML file for publishing on claude.ai.

    python3 tools/build_artifact.py        # writes dist/cloud-cat.html

Inlines the CSS, the SVG artwork and every JS module (no network requests except
Google Fonts). The normal multi-file app (index.html) is unchanged.
"""
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
    src = IMPORT_NAMED.sub(lambda m: f"const {{{m.group(1)}}} = __mod_{m.group(2)};", src)
    src = IMPORT_STAR.sub(lambda m: f"const {m.group(1)} = __mod_{m.group(2)};", src)
    names = [m.group(2) for m in EXPORT.finditer(src)]
    src = EXPORT.sub(lambda m: f"{m.group(1)} {m.group(2)}", src)
    if re.search(r"^\s*(import|export)\b", src, re.M):
        raise SystemExit(f"{name}.js has an import/export this build can't handle")
    return f"const __mod_{name} = (() => {{\n{src}\nreturn {{ {', '.join(names)} }};\n}})();\n"


def main():
    css = (ROOT / "styles.css").read_text()
    # claude.ai already pads the page for the phone's top inset.
    css += "\n/* claude.ai page */\n.sky { padding-top: 0; }\n.cloudcat { top: 36px; }\n.bubble { top: 46px; }\n"

    html = (ROOT / "index.html").read_text()
    body = html[html.index("<body>") + len("<body>"): html.index("</body>")]
    body = body.replace('<script type="module" src="js/app.js"></script>', "").strip()

    svgs = {n: (ROOT / "assets" / f"{n}.svg").read_text() for n in ASSETS}
    svg_json = json.dumps(svgs).replace("</", "<\\/")
    bundle = "".join(wrap_module(m) for m in MODULES)
    if "</script" in bundle.lower():
        raise SystemExit("bundle contains </script")

    page = f"""<title>Cloud Cat</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Nunito:wght@500;700;800;900&display=swap" rel="stylesheet">
<style>
{css}
</style>
{body}
<script>window.__ARTIFACT = true; window.__INLINE_SVG = {svg_json};</script>
<script type="module">
{bundle}
</script>
"""
    out = ROOT / "dist" / "cloud-cat.html"
    out.parent.mkdir(exist_ok=True)
    out.write_text(page)
    print(f"wrote {out.relative_to(ROOT)} ({len(page) // 1024} KB)")


if __name__ == "__main__":
    main()

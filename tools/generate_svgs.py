#!/usr/bin/env python3
"""Generate the app's SVG illustrations with OpenAI (model gpt-6.1-sol).

Usage:
    OPENAI_API_KEY=sk-... python3 tools/generate_svgs.py            # all assets
    OPENAI_API_KEY=sk-... python3 tools/generate_svgs.py scene-train  # just one

The two reference screenshots in tools/reference/ are sent as a style guide.
Output goes to assets/<name>.svg. Re-run any asset you don't like.
"""
import base64
import concurrent.futures as cf
import json
import os
import re
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MODEL = os.environ.get("SVG_MODEL", "gpt-6.1-sol")
API = "https://api.openai.com/v1/responses"
KEY = os.environ.get("OPENAI_API_KEY", "proxy-injected")

STYLE = """You are an expert SVG illustrator for a cute, calming mobile app.
Output ONLY one valid, self-contained SVG document. No markdown fences, no commentary.

STYLE (match the attached reference screenshots closely):
- Kawaii pastel illustration, soft lavender / lilac world, rounded chunky friendly shapes.
- Smooth dark-purple outlines: stroke #3D2B66, stroke-width about 3 (at the given viewBox scale),
  stroke-linecap="round" stroke-linejoin="round".
- Flat fills, at most gentle linear gradients. Little 4-point sparkles (#A98BE8) as accents.
- Palette: outline #3D2B66, deep purple #7B5CC4, lavender #C9B8F5, pale lilac #EDE6FF,
  near-white #F7F3FF, white #FFFFFF, blush pink #F9B9CF, cloud pink #FBE3EE,
  mint #BDEBD8, leaf green #7CC79A, soft yellow #FFE6A3, sky #DCE9FF.
- THE CAT (when present): pale lavender-grey fur #E9E3F5, darker lilac tabby stripes #9C88C9
  on forehead and back, pink inner ears #F9B9CF, white muzzle, round pink blush cheeks,
  tiny 'w' mouth. Exactly like the cat in the references.

TECHNICAL RULES:
- Use exactly the viewBox requested, plus width/height attributes equal to the viewBox size.
- No <script>, no <foreignObject>, no event attributes, no external href/images/fonts, no @import.
- Use presentation attributes (fill=, stroke=...) rather than CSS classes.
- Use unique id prefixes for any gradients/clipPaths (e.g. the asset name) to avoid clashes when inlined.
- Keep the file compact (under ~30 KB). Well-formed XML.
"""

ASSETS = {
    "cloud-cat": """viewBox="0 0 240 180". Transparent background.
A big fluffy cloud (white #FFFFFF with soft pink #FBE3EE shading underneath) filling the bottom ~45%,
and THE CAT lying on top of it, chin resting on its two front paws which drape over the cloud's top edge,
like the sleeping cat in reference image 1. Tail curls along the cloud.
REQUIRED structure with these exact ids (the app animates/toggles them):
  <g id="cloud"> ... the cloud ... </g>
  <g id="cat">
     <g id="tail"> ...whole tail only... </g>
     ... body, head, ears, stripes, cheeks, paws ...
     <g id="eyes-closed"> happy closed curved eyes (like reference) </g>
     <g id="eyes-open" display="none"> big round shiny open eyes, same position </g>
     <g id="mouth-smile"> tiny 'w' mouth </g>
     <g id="mouth-meow" display="none"> small open rounded pink mouth (meowing), same position </g>
  </g>
Draw the cloud first, then the cat. The cat's head should be roughly centred horizontally.""",

    "running-cat": """viewBox="0 0 120 90". Transparent background.
THE CAT seen from the side, facing RIGHT, in a cheerful trotting/running pose, eyes happy (closed curves),
small smile, tail up behind. Same design as the references.
REQUIRED structure with exact ids so legs can be rotated for a run cycle:
  <g id="tail">...</g>
  <g id="leg-bl">, <g id="leg-br"> (back legs), <g id="leg-fl">, <g id="leg-fr"> (front legs):
     each leg is ONE rounded shape hanging STRAIGHT DOWN from its hip/shoulder joint,
     with its top edge at the joint (the app rotates each leg around its top-centre).
     Draw the far-side legs (leg-br, leg-fr) slightly darker (#D6CCEB) and BEFORE the body.
  <g id="body"> torso + head + ears + face (drawn after the far legs, before the near legs) </g>
Near legs (leg-bl, leg-fl) are drawn last, on top of the body.""",

    "scene-suitcase": """viewBox="0 0 400 220".
A cosy PACKING scene drawn as a rounded card: clip everything to a rounded rect (x=0 y=0 w=400 h=220 rx=24)
with a soft lilac background (#EDE6FF) and a window with a white grid and pastel clouds behind (like the
window in reference image 2). A soft rug / floor at the bottom.
Centre: a cute OPEN lavender suitcase (lid up, rounded corners, a little handle and buckle straps),
neatly packed and with items peeking out: a passport (purple booklet with a tiny gold globe), a small zip pouch,
a clear liquids bag with 3 tiny bottles, a folded sweater, small headphones, and a little white plush bunny
sitting in it. Left: a potted plant. Right: a small stack of folded clothes. A few sparkles.
HANGING SIGN at the top, NOTHING may overlap it:
  two short strings from the top edge to a rounded rect x=100 y=14 width=200 height=42 rx=12
  fill="#F7F3FF" stroke="#3D2B66" stroke-width="3", and inside it exactly:
  <text id="sign-text" x="200" y="42" text-anchor="middle" font-family="Nunito, Quicksand, sans-serif"
   font-weight="800" font-size="20" fill="#3D2B66">Packing</text>
Keep all other artwork below y=62.""",

    "scene-train": """viewBox="0 0 400 220".
A calm TRAIN PLATFORM scene drawn as a rounded card: clip everything to a rounded rect
(x=0 y=0 w=400 h=220 rx=24). Pale sky (#DCE9FF to #EDE6FF) with pastel clouds, a glass platform canopy.
A cute, rounded modern commuter train stopped at the platform, in a clean SIDE VIEW facing RIGHT, taking up
the middle/right (from about x=150 to x=385). The train is ONE continuous body drawn as a single outlined shape:
a long rounded rectangle whose right end curves smoothly into a gently sloped, rounded nose (like a modern
commuter/regional train). The nose is part of the same body path: NOT a separate box, cab or car stuck on.
White lower body, lilac (#C9B8F5) upper body, one purple (#7B5CC4) stripe running the full length including
the nose, a row of 3 rounded square windows, one door with a small window, a slanted windscreen window on the
nose, one round headlight low on the nose, simple dark-purple wheels/bogies under the body. NO face. Platform at the bottom with a soft-yellow safety line, a little bench on the left,
a round platform clock on a pole, a small potted plant. A few sparkles.
HANGING SIGN at the top, NOTHING may overlap it:
  two short strings from the top edge to a rounded rect x=100 y=14 width=200 height=42 rx=12
  fill="#F7F3FF" stroke="#3D2B66" stroke-width="3", and inside it exactly:
  <text id="sign-text" x="200" y="42" text-anchor="middle" font-family="Nunito, Quicksand, sans-serif"
   font-weight="800" font-size="20" fill="#3D2B66">Lund C</text>
Keep all other artwork below y=62.""",

    "scene-airport": """viewBox="0 0 400 220".
An AIRPORT hall scene closely matching reference image 2, drawn as a rounded card: clip everything to a
rounded rect (x=0 y=0 w=400 h=220 rx=24). Lilac background (#EDE6FF), a large window with a white grid and
pastel clouds, two lavender check-in desks each with a small laptop/monitor, queue posts with ropes in front,
a potted plant on the left, a lilac rolling suitcase on the right, soft floor. A few sparkles.
(Do NOT draw the cat.)
HANGING SIGN at the top, NOTHING may overlap it:
  two short strings from the top edge to a rounded rect x=90 y=14 width=220 height=42 rx=12
  fill="#F7F3FF" stroke="#3D2B66" stroke-width="3". Inside it, on the left, a small dark-purple airplane
  icon (fill #3D2B66) fitting within x=100..126, y=22..48. And exactly:
  <text id="sign-text" x="214" y="42" text-anchor="middle" font-family="Nunito, Quicksand, sans-serif"
   font-weight="800" font-size="20" fill="#3D2B66">Check In</text>
Keep all other artwork below y=62.""",

    "star": """viewBox="0 0 64 64". Transparent background.
A cute chunky rounded 5-point star with a tiny kawaii face (two happy closed-curve eyes, tiny smile,
pink blush dots). The star body MUST use fill="currentColor" (so the app can recolour it),
outline stroke #3D2B66 stroke-width 3 round joins, plus a small white highlight shape (opacity 0.6)
near the top-left. Centred, filling ~90% of the box.""",

    "icon": """viewBox="0 0 512 512". FULL-BLEED app icon: the background must fill the entire 512x512 square
(no transparent corners) with a soft lilac gradient (#EDE6FF top to #C9B8F5 bottom).
Centre: a white fluffy cloud with THE CAT sleeping on it (closed happy eyes, paws over the edge),
a small soft-yellow crescent moon and 3-4 purple sparkles around. Keep important content inside the
central 80% (safe zone for maskable icons). No text.""",
}


def call(prompt: str) -> str:
    content = [{"type": "input_text", "text": STYLE + "\n\nASSET:\n" + prompt}]
    for ref in sorted((ROOT / "tools" / "reference").glob("*.png")):
        b64 = base64.b64encode(ref.read_bytes()).decode()
        content.append({"type": "input_image", "image_url": f"data:image/png;base64,{b64}"})
    body = json.dumps({"model": MODEL, "stream": True,
                       "input": [{"role": "user", "content": content}]}).encode()
    req = urllib.request.Request(API, data=body, headers={
        "Authorization": f"Bearer {KEY}", "Content-Type": "application/json"})
    # Stream (server-sent events) so long generations don't hit gateway timeouts.
    text, final = "", ""
    with urllib.request.urlopen(req, timeout=900) as r:
        for raw in r:
            line = raw.decode("utf-8", "replace").strip()
            if not line.startswith("data:"):
                continue
            payload = line[5:].strip()
            if payload == "[DONE]":
                break
            ev = json.loads(payload)
            if ev.get("type") == "response.output_text.delta":
                text += ev.get("delta", "")
            elif ev.get("type") == "response.output_text.done":
                final = ev.get("text", "")
            elif ev.get("type") in ("response.failed", "error"):
                raise RuntimeError(json.dumps(ev)[:500])
    return final or text


def clean(svg_text: str) -> str:
    m = re.search(r"<svg[\s\S]*</svg>", svg_text)
    if not m:
        raise ValueError("no <svg> in response")
    svg = m.group(0)
    # Defence in depth: strip anything executable.
    svg = re.sub(r"<script[\s\S]*?</script>", "", svg, flags=re.I)
    svg = re.sub(r"<foreignObject[\s\S]*?</foreignObject>", "", svg, flags=re.I)
    svg = re.sub(r"\son[a-z]+\s*=\s*(\"[^\"]*\"|'[^']*')", "", svg, flags=re.I)
    return svg + "\n"


def make(name: str) -> str:
    svg = clean(call(ASSETS[name]))
    (ROOT / "assets" / f"{name}.svg").write_text(svg)
    return f"{name}: {len(svg)} bytes"


if __name__ == "__main__":
    names = sys.argv[1:] or list(ASSETS)
    with cf.ThreadPoolExecutor(max_workers=min(3, len(names))) as ex:
        futs = {ex.submit(make, n): n for n in names}
        for f in cf.as_completed(futs):
            try:
                print(f.result(), flush=True)
            except Exception as e:  # noqa: BLE001
                print(f"{futs[f]}: FAILED {e}", flush=True)

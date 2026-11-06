#!/usr/bin/env python3
"""Generate the app's little pastel icons with OpenAI gpt-image-2.6-sunburst (quality: low).

    OPENAI_API_KEY=sk-... python3 tools/generate_icons.py           # all icons
    OPENAI_API_KEY=sk-... python3 tools/generate_icons.py train bed # just some

Each icon is generated on a plain white background, then the background is cut
out, trimmed, and saved as a 128x128 transparent PNG in assets/icons/.
"""
import base64
import concurrent.futures as cf
import io
import json
import os
import sys
import urllib.request
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "icons"
MODEL = os.environ.get("ICON_MODEL", "gpt-image-2.6-sunburst")
KEY = os.environ.get("OPENAI_API_KEY", "proxy-injected")

STYLE = (
    "A single cute, simplified app icon of {subject}. "
    "Soft pastel colours only: lavender #C9B8F5, mint #BDEBD8, baby pink #F9B9CF, peach #FFCFAE, "
    "butter yellow #FFE6A3, sky blue #BFDCFF, with a slightly deeper shade of the same pastel for small details. "
    "Smooth, chunky, rounded shapes with fully rounded corners, very minimal detail, flat colour. "
    "No outlines, no text, no letters, no shadow, no glow, no gradient, no background shape. "
    "Centred with generous empty space around it, on a plain solid pure white background."
)

ICONS = {
    "plane": "a small airplane seen from above, flying diagonally up-right",
    "train": "a friendly modern train seen from the front",
    "phone": "a smartphone with a blank screen",
    "camera": "a compact photo camera",
    "passport": "a passport booklet with a simple globe on the cover",
    "backpack": "a small backpack",
    "bath": "a bathtub with a few bubbles",
    "paw": "a cat paw print",
    "bed": "a bed with a pillow and blanket, side view",
    "broom": "a broom",
    "car": "a small car, side view",
    "lift": "an escalator going up",
    "security": "an airport security scanner arch with a tray",
    "magnifier": "a magnifying glass",
    "chair": "a comfy waiting-room chair",
    "seat": "an airplane seat, side view",
    "landing": "an airplane landing, tilted down toward a short runway line",
    "alarm": "a round alarm clock with two bells",
    "house": "a cosy little house",
    "star": "a five-pointed star",
    "ticket": "a travel ticket with a notch on each side",
    "gear": "a settings gear cog",
    "calendar": "a desk calendar page",
    "return": "two curved arrows forming a circle (return trip)",
}


def generate(name: str) -> bytes:
    body = json.dumps({
        "model": MODEL, "prompt": STYLE.format(subject=ICONS[name]),
        "quality": "low", "size": "1024x1024", "background": "opaque", "output_format": "png", "n": 1,
    }).encode()
    req = urllib.request.Request("https://api.openai.com/v1/images/generations", data=body, headers={
        "Authorization": f"Bearer {KEY}", "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=300) as r:
        data = json.load(r)
    return base64.b64decode(data["data"][0]["b64_json"])


def cut_out(png: bytes) -> Image.Image:
    """Remove the white background connected to the edges, trim, pad, resize to 128."""
    im = Image.open(io.BytesIO(png)).convert("RGB")
    w, h = im.size
    marker = (255, 0, 255)
    filled = im.copy()
    for x in range(0, w, 32):
        for y in (0, h - 1):
            if filled.getpixel((x, y)) != marker:
                ImageDraw.floodfill(filled, (x, y), marker, thresh=40)
    for y in range(0, h, 32):
        for x in (0, w - 1):
            if filled.getpixel((x, y)) != marker:
                ImageDraw.floodfill(filled, (x, y), marker, thresh=40)
    rgba = im.convert("RGBA")
    px, fp = rgba.load(), filled.load()
    for y in range(h):
        for x in range(w):
            if fp[x, y] == marker:
                px[x, y] = (255, 255, 255, 0)
            else:  # soften the light anti-aliased fringe next to the background
                r, g, b, _ = px[x, y]
                light = min(r, g, b)
                if light > 235:
                    px[x, y] = (r, g, b, max(0, int((255 - light) * 12)))
    bbox = rgba.getbbox()
    if bbox:
        rgba = rgba.crop(bbox)
    side = int(max(rgba.size) * 1.08)
    canvas = Image.new("RGBA", (side, side), (255, 255, 255, 0))
    canvas.paste(rgba, ((side - rgba.width) // 2, (side - rgba.height) // 2))
    return canvas.resize((128, 128), Image.LANCZOS)


def make(name: str) -> str:
    img = cut_out(generate(name))
    OUT.mkdir(parents=True, exist_ok=True)
    img.save(OUT / f"{name}.png", optimize=True)
    return f"{name}: ok"


if __name__ == "__main__":
    names = sys.argv[1:] or list(ICONS)
    with cf.ThreadPoolExecutor(max_workers=6) as ex:
        futs = {ex.submit(make, n): n for n in names}
        for f in cf.as_completed(futs):
            try:
                print(f.result(), flush=True)
            except Exception as e:  # noqa: BLE001
                print(f"{futs[f]}: FAILED {e}", flush=True)

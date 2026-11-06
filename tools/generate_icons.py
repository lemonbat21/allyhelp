#!/usr/bin/env python3
"""Generate the app's little icons with OpenAI gpt-image-2.6-flare (quality: medium).

    OPENAI_API_KEY=sk-... python3 tools/generate_icons.py           # all icons
    OPENAI_API_KEY=sk-... python3 tools/generate_icons.py train bed # just some

Each icon is a single-colour glyph generated on white. The darkness of each pixel
becomes its opacity, so the result is one flat colour with smooth edges; the app
tints it to the theme colour. Saved as 128x128 transparent PNGs in assets/icons/.
"""
import base64
import concurrent.futures as cf
import io
import json
import os
import sys
import urllib.request
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "icons"
MODEL = os.environ.get("ICON_MODEL", "gpt-image-2.6-flare")
QUALITY = os.environ.get("ICON_QUALITY", "medium")
COLOUR = (123, 92, 196)  # #7B5CC4
KEY = os.environ.get("OPENAI_API_KEY", "proxy-injected")

STYLE = (
    "A simple flat glyph icon of {subject}. "
    "One single solid colour only: a filled purple (#7B5CC4) silhouette on a plain pure white background. "
    "Bold, chunky, rounded shapes with fully rounded corners and thick parts, very minimal detail, "
    "designed to be instantly readable at 24 pixels. Small details are cut out as white gaps, never drawn in another colour. "
    "No face, no eyes, no mouth, no text, no letters, no outline in another colour, no shading, no gradient, no shadow. "
    "Centred with generous empty space around it."
)

ICONS = {
    "plane": "a small airplane seen from above, flying diagonally up-right",
    "train": "a friendly modern train seen from the front",
    "phone": "a smartphone with a blank screen",
    "camera": "a compact photo camera",
    "passport": "a passport booklet with a simple globe on the cover",
    "backpack": "a small backpack",
    "bath": "a bathtub with a shower head",
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
    "star": "a five-pointed star with rounded points",
    "ticket": "a travel ticket with a notch on each side",
    "gear": "a settings gear cog",
    "calendar": "a desk calendar page",
    "return": "two curved arrows forming a circle (return trip)",
}


def generate(name: str) -> bytes:
    body = json.dumps({
        "model": MODEL, "prompt": STYLE.format(subject=ICONS[name]),
        "quality": QUALITY, "size": "1024x1024", "background": "opaque", "output_format": "png", "n": 1,
    }).encode()
    req = urllib.request.Request("https://api.openai.com/v1/images/generations", data=body, headers={
        "Authorization": f"Bearer {KEY}", "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=300) as r:
        data = json.load(r)
    return base64.b64decode(data["data"][0]["b64_json"])


def cut_out(png: bytes) -> Image.Image:
    """Turn the purple-on-white drawing into one flat colour with an alpha mask; trim, pad, resize to 128."""
    im = Image.open(io.BytesIO(png)).convert("L")  # luminance
    ink = 0.299 * COLOUR[0] + 0.587 * COLOUR[1] + 0.114 * COLOUR[2]
    alpha = im.point(lambda v: max(0, min(255, int((255 - v) * 255 / (255 - ink)))))
    alpha = alpha.point(lambda a: 0 if a < 18 else a)  # drop faint paper noise
    bbox = alpha.getbbox()
    if bbox:
        alpha = alpha.crop(bbox)
    side = int(max(alpha.size) * 1.08)
    mask = Image.new("L", (side, side), 0)
    mask.paste(alpha, ((side - alpha.width) // 2, (side - alpha.height) // 2))
    out = Image.new("RGBA", (side, side), COLOUR + (0,))
    out.putalpha(mask)
    return out.resize((128, 128), Image.LANCZOS)


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

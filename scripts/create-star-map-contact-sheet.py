#!/usr/bin/env python3
"""Build the final visual audit sheet from the production plan."""

import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps


MANAGEMENT_ROOT = Path("design-assets/star-map")
RUNTIME_ROOT = Path("public/assets/star-map")
PLAN = json.loads((MANAGEMENT_ROOT / "production-plan.json").read_text())
ITEMS = {item["id"]: item for item in PLAN["items"]}
WIDTH = 3000
MARGIN = 90
PANEL = (390, 390)
GAP = 24
BG = (16, 18, 38)
PANEL_DARK = (28, 31, 58)


def font(size: int):
    candidates = [
        "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ]
    for candidate in candidates:
        if Path(candidate).exists():
            return ImageFont.truetype(candidate, size)
    return ImageFont.load_default()


TITLE = font(54)
HEADING = font(36)
LABEL = font(20)


def checker(size):
    image = Image.new("RGB", size, (231, 232, 239))
    draw = ImageDraw.Draw(image)
    step = 24
    for y in range(0, size[1], step):
        for x in range(0, size[0], step):
            if (x // step + y // step) % 2:
                draw.rectangle((x, y, x + step - 1, y + step - 1), fill=(194, 197, 209))
    return image


def draw_asset(canvas, item, box, label=True):
    x, y, w, h = box
    image = Image.open(RUNTIME_ROOT / item["output"])
    if item["alpha"]:
        panel = checker((w, h))
        rendered = ImageOps.contain(image.convert("RGBA"), (w - 24, h - 24), Image.Resampling.LANCZOS)
        px = (w - rendered.width) // 2
        py = (h - rendered.height) // 2
        panel.paste(rendered, (px, py), rendered)
    else:
        panel = Image.new("RGB", (w, h), PANEL_DARK)
        rendered = ImageOps.contain(image.convert("RGB"), (w - 24, h - 24), Image.Resampling.LANCZOS)
        px = (w - rendered.width) // 2
        py = (h - rendered.height) // 2
        panel.paste(rendered, (px, py))
    canvas.paste(panel, (x, y))
    if label:
        ImageDraw.Draw(canvas).text((x, y + h + 8), item["id"], font=LABEL, fill=(232, 235, 255))


groups = [
    ("Rarity bases · 4", [item for item in PLAN["items"] if item["type"] == "rarity-base"]),
    ("Constellation totems · 8", [item for item in PLAN["items"] if item["type"] == "constellation"]),
    ("Achievement stars · 30", [item for item in PLAN["items"] if item["type"] == "star"]),
    ("Effects · 6", [item for item in PLAN["items"] if item["type"] == "effect"]),
    ("Mascots · 2", [item for item in PLAN["items"] if item["type"] == "mascot"]),
]

rows = 1 + 1 + 2 + 5 + 1 + 1
height = 130 + 720 + rows * 470 + 280
canvas = Image.new("RGB", (WIDTH, height), BG)
draw = ImageDraw.Draw(canvas)
draw.text((MARGIN, 42), "Grammar Star Map · 53 Production Assets", font=TITLE, fill=(247, 220, 132))

y = 130
draw.text((MARGIN, y), "Opaque backgrounds and cover · 3", font=HEADING, fill=(185, 206, 255))
y += 58
opaque = [ITEMS["background-mobile-v1"], ITEMS["background-desktop-v1"], ITEMS["empty-state-cover-v1"]]
opaque_boxes = [(90, y, 630, 560), (760, y, 1480, 560), (2280, y, 630, 560)]
for item, box in zip(opaque, opaque_boxes):
    draw_asset(canvas, item, box)
y += 650

for heading, items in groups:
    draw.text((MARGIN, y), heading, font=HEADING, fill=(185, 206, 255))
    y += 52
    columns = 7
    for index, item in enumerate(items):
        row, column = divmod(index, columns)
        x = MARGIN + column * (PANEL[0] + GAP)
        draw_asset(canvas, item, (x, y + row * 470, *PANEL))
    y += ((len(items) + columns - 1) // columns) * 470 + 28

draw.text((MARGIN, height - 90), "All files are production status · generated sources and prompts are retained in the asset library", font=LABEL, fill=(168, 174, 205))
canvas.save(MANAGEMENT_ROOT / "review/final-assets-v1-contact-sheet.jpg", "JPEG", quality=92, subsampling=0)
print(MANAGEMENT_ROOT / "review/final-assets-v1-contact-sheet.jpg", canvas.size)

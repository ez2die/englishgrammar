#!/usr/bin/env python3
"""Return pixel metadata used by the star-map asset verifier."""

import json
import sys
from pathlib import Path

from PIL import Image


def inspect(path_string: str) -> dict:
    path = Path(path_string)
    with Image.open(path) as image:
        image.load()
        result = {
            "path": path_string,
            "dimensions": list(image.size),
            "mode": image.mode,
        }

        if "A" in image.mode or "transparency" in image.info:
            alpha = image.convert("RGBA").getchannel("A")
            width, height = image.size
            result["hasAlpha"] = True
            result["alphaExtrema"] = list(alpha.getextrema())
            result["alphaCorners"] = [
                alpha.getpixel((0, 0)),
                alpha.getpixel((width - 1, 0)),
                alpha.getpixel((0, height - 1)),
                alpha.getpixel((width - 1, height - 1)),
            ]
            bbox = alpha.getbbox()
            result["contentBbox"] = list(bbox) if bbox else None
        else:
            result["hasAlpha"] = False

        return result


print(json.dumps([inspect(path) for path in sys.argv[1:]], ensure_ascii=False))

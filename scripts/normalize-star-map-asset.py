#!/usr/bin/env python3
"""Normalize an RGBA star-map asset without changing its aspect ratio."""

import argparse
from pathlib import Path

from PIL import Image


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--out", required=True)
    parser.add_argument("--size", type=int, default=1024)
    parser.add_argument("--occupancy", type=float, default=0.74)
    return parser.parse_args()


def main():
    args = parse_args()
    source = Image.open(args.input).convert("RGBA")
    alpha = source.getchannel("A")
    bbox = alpha.getbbox()
    if bbox is None:
        raise SystemExit("input has no visible pixels")

    cropped = source.crop(bbox)
    target_longest = round(args.size * args.occupancy)
    scale = target_longest / max(cropped.size)
    resized = cropped.resize(
        (max(1, round(cropped.width * scale)), max(1, round(cropped.height * scale))),
        Image.Resampling.LANCZOS,
    )

    canvas = Image.new("RGBA", (args.size, args.size), (0, 0, 0, 0))
    offset = ((args.size - resized.width) // 2, (args.size - resized.height) // 2)
    canvas.alpha_composite(resized, offset)

    output = Path(args.out)
    output.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(output, optimize=True)

    final_bbox = canvas.getchannel("A").getbbox()
    print(
        {
            "source_size": source.size,
            "source_bbox": bbox,
            "crop_size": cropped.size,
            "output_size": canvas.size,
            "output_bbox": final_bbox,
            "occupancy": args.occupancy,
        }
    )


if __name__ == "__main__":
    main()

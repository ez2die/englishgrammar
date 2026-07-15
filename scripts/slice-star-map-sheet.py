#!/usr/bin/env python3
"""Slice an evenly spaced star-map sprite sheet into named source cells."""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--out-dir", required=True, type=Path)
    parser.add_argument("--names", required=True, help="Comma-separated output stems in row-major order")
    parser.add_argument("--cols", required=True, type=int)
    parser.add_argument("--rows", type=int, default=1)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    names = [name.strip() for name in args.names.split(",")]
    expected = args.cols * args.rows
    if len(names) != expected:
        raise SystemExit(f"Expected {expected} names, got {len(names)}")

    image = Image.open(args.input)
    args.out_dir.mkdir(parents=True, exist_ok=True)
    width, height = image.size

    for index, name in enumerate(names):
        row, col = divmod(index, args.cols)
        left = round(col * width / args.cols)
        right = round((col + 1) * width / args.cols)
        top = round(row * height / args.rows)
        bottom = round((row + 1) * height / args.rows)
        if name in {"", "-", "_"}:
            print({"skipped": True, "cell": [left, top, right, bottom], "size": [right - left, bottom - top]})
            continue
        output = args.out_dir / f"{name}.png"
        image.crop((left, top, right, bottom)).save(output)
        print({"output": str(output), "cell": [left, top, right, bottom], "size": [right - left, bottom - top]})


if __name__ == "__main__":
    main()

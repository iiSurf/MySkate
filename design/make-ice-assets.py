#!/usr/bin/env python3
"""Generate the small ice assets.

- assets/ice-texture.svg: fine scratches and a few faint long marks, the quiet
  base layer under the skill tracks.
- assets/tile-trace.svg: a little etched spiral and glide, used inside big tiles.

The skill tracks themselves are drawn live by js/ice-tracks.js. Run from the
repo root:

    python3 design/make-ice-assets.py
"""
import math
import pathlib
import random

random.seed(23)
root = pathlib.Path(__file__).resolve().parent.parent
out_dir = root / "assets"
out_dir.mkdir(exist_ok=True)


def n(x):
    return f"{x:.1f}"


def scratch(x, y, angle, length, bend):
    x2 = x + length * math.cos(angle)
    y2 = y + length * math.sin(angle)
    cx = (x + x2) / 2 - bend * math.sin(angle)
    cy = (y + y2) / 2 + bend * math.cos(angle)
    return f"M{n(x)} {n(y)}Q{n(cx)} {n(cy)} {n(x2)} {n(y2)}"


short = []
for _ in range(210):
    x = random.uniform(-40, 1640)
    y = random.uniform(0, 1000)
    angle = -0.25 + random.uniform(-0.8, 0.8)
    short.append(
        f'<path d="{scratch(x, y, angle, random.uniform(14, 90), random.uniform(-12, 12))}" '
        f'stroke-width="{random.uniform(0.5, 1.1):.2f}" opacity="{random.uniform(0.25, 0.9):.2f}"/>'
    )

long_marks = []
for _ in range(9):
    x = random.uniform(-100, 1500)
    y = random.uniform(40, 960)
    angle = -0.2 + random.uniform(-0.5, 0.5)
    long_marks.append(
        f'<path d="{scratch(x, y, angle, random.uniform(260, 620), random.uniform(-40, 40))}" '
        f'stroke-width="{random.uniform(0.6, 1.0):.2f}" opacity="{random.uniform(0.18, 0.4):.2f}"/>'
    )

texture = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice">
  <g fill="none" stroke="#ffffff" stroke-linecap="round">
    {chr(10).join('    ' + s for s in short)}
    {chr(10).join('    ' + s for s in long_marks)}
  </g>
</svg>
"""
(out_dir / "ice-texture.svg").write_text(texture)

# Etched tile art: spiral, glide, dotted toe trail.
pts = []
steps = 5 * 56
for i in range(steps + 1):
    t = i / steps
    a = 0.6 + t * 5 * 2 * math.pi
    r = 3 + 42 * t ** 0.92
    pts.append((118 + r * math.cos(a), 66 + r * math.sin(a) * 0.82))
spiral = "M" + " L".join(f"{n(x)} {n(y)}" for x, y in pts)

tile = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 190 130">
  <g fill="none" stroke-linecap="round" stroke-linejoin="round">
    <path d="{spiral}" stroke="#bff3ff" stroke-width="1.3"/>
    <path d="M-10 112C30 84 70 120 112 100S168 60 200 70" stroke="#ffffff" stroke-width="1.5"/>
    <path d="M4 36C40 12 78 30 104 16" stroke="#bff3ff" stroke-width="1.1"/>
    <path d="M20 90C44 70 62 66 84 70" stroke="#ffffff" stroke-width="2.6" stroke-dasharray="1 7"/>
  </g>
  <path d="M170 24l1.6 4.4 4.4 1.6-4.4 1.6-1.6 4.4-1.6-4.4-4.4-1.6 4.4-1.6z" fill="#ffffff"/>
</svg>
"""
(out_dir / "tile-trace.svg").write_text(tile)
print("wrote ice-texture.svg and tile-trace.svg")

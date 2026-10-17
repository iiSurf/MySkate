#!/usr/bin/env python3
"""Generate assets/ice-traces.svg: skate traces seen from underneath the ice.

Glide lines, a crossover scallop, a figure eight, two spin spirals, a dotted
toe-pick trail, and fine scratches. Run from the repo root:

    python3 design/make-ice-traces.py
"""
import math
import pathlib
import random

random.seed(11)


def n(x):
    return f"{x:.1f}"


def smooth(points):
    """Catmull-Rom points to a smooth cubic path."""
    d = f"M{n(points[0][0])} {n(points[0][1])}"
    for i in range(len(points) - 1):
        p0 = points[i - 1] if i > 0 else points[i]
        p1, p2 = points[i], points[i + 1]
        p3 = points[i + 2] if i + 2 < len(points) else p2
        c1 = (p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6)
        c2 = (p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6)
        d += f" C{n(c1[0])} {n(c1[1])} {n(c2[0])} {n(c2[1])} {n(p2[0])} {n(p2[1])}"
    return d


def spiral(cx, cy, r0, r1, turns, rot=0.0):
    steps = int(turns * 56)
    pts = []
    for i in range(steps + 1):
        t = i / steps
        a = rot + t * turns * 2 * math.pi
        r = r0 + (r1 - r0) * t ** 0.92
        pts.append((cx + r * math.cos(a), cy + r * math.sin(a) * 0.8))
    return "M" + " L".join(f"{n(x)} {n(y)}" for x, y in pts)


def scallops(x, y, radius, count):
    d = f"M{n(x)} {n(y)}"
    for i in range(count):
        sweep = 1 if i % 2 == 0 else 0
        d += f" a{radius} {radius} 0 0 {sweep} {radius * 2} 0"
    return d


traces = []

glides = [
    [(-80, 760), (260, 640), (560, 730), (900, 560), (1250, 615), (1700, 420)],
    [(-80, 890), (300, 820), (640, 905), (1000, 760), (1380, 825), (1700, 700)],
    [(-80, 215), (240, 300), (520, 200), (840, 262), (1160, 150), (1700, 240)],
    [(190, 1060), (380, 790), (700, 565), (1000, 500), (1400, 545), (1700, 650)],
]
for g in glides:
    traces.append(f'<path d="{smooth(g)}"/>')

traces.append(f'<path d="{scallops(120, 440, 36, 12)}" transform="rotate(-9 120 440)"/>')

for dx, dy, wob in ((0, 0, 0), (7, -5, 3)):
    traces.append(f'<ellipse cx="{1180 + dx}" cy="{300 + dy}" rx="152" ry="92" transform="rotate({-14 + wob} {1180 + dx} {300 + dy})"/>')
    traces.append(f'<ellipse cx="{1335 + dx}" cy="{385 + dy}" rx="132" ry="82" transform="rotate({12 - wob} {1335 + dx} {385 + dy})"/>')

traces.append(f'<path d="{spiral(360, 330, 3, 138, 5.2, 0.4)}"/>')
traces.append(f'<path d="{spiral(1160, 790, 3, 74, 4.2, 1.9)}"/>')

toe_trail = [(600, 120), (700, 215), (775, 330), (825, 450), (885, 570)]
dotted = f'<path d="{smooth(toe_trail)}" stroke-dasharray="1 11" stroke-width="3.4"/>'

scratches = []
for _ in range(120):
    x = random.uniform(-40, 1640)
    y = random.uniform(0, 1000)
    angle = -0.28 + random.uniform(-0.7, 0.7)
    length = random.uniform(16, 96)
    bend = random.uniform(-14, 14)
    x2 = x + length * math.cos(angle)
    y2 = y + length * math.sin(angle)
    cx = (x + x2) / 2 - bend * math.sin(angle)
    cy = (y + y2) / 2 + bend * math.cos(angle)
    width = random.uniform(0.5, 1.1)
    opacity = random.uniform(0.35, 1.0)
    scratches.append(
        f'<path d="M{n(x)} {n(y)} Q{n(cx)} {n(cy)} {n(x2)} {n(y2)}" stroke-width="{width:.2f}" opacity="{opacity:.2f}"/>'
    )

svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice">
  <defs>
    <linearGradient id="ln" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#d9f8ff" stop-opacity="0"/>
      <stop offset="0.18" stop-color="#e6fbff" stop-opacity="0.95"/>
      <stop offset="0.65" stop-color="#8fe8ff" stop-opacity="0.9"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
    <filter id="glow" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="3.6"/></filter>
  </defs>
  <g fill="none" stroke-linecap="round" stroke-linejoin="round">
    <g filter="url(#glow)" stroke="#7fe3ff" stroke-width="5.5" opacity="0.42">
      {chr(10).join('      ' + t for t in traces)}
    </g>
    <g stroke="url(#ln)" stroke-width="1.6" opacity="0.9">
      {chr(10).join('      ' + t for t in traces)}
    </g>
    <g stroke="#f2fdff" opacity="0.9">
      {dotted}
    </g>
    <g stroke="#ffffff">
      {chr(10).join('      ' + s for s in scratches)}
    </g>
  </g>
</svg>
"""

out = pathlib.Path(__file__).resolve().parent.parent / "assets" / "ice-traces.svg"
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(svg)
print(f"wrote {out} ({len(svg) // 1024} KB)")

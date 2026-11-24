"""Generate the install icons for the Ka’illisto web app using only Python's standard library."""

from math import ceil, cos, floor, pi, sin, sqrt
from pathlib import Path
import struct
import zlib


SIZE = 512
BACKGROUND = (9, 9, 13, 255)
PIXELS = bytearray(BACKGROUND * (SIZE * SIZE))


def paint(x: int, y: int, color: tuple[int, int, int, int]) -> None:
    if 0 <= x < SIZE and 0 <= y < SIZE:
        offset = (y * SIZE + x) * 4
        PIXELS[offset : offset + 4] = bytes(color)


def disc(cx: float, cy: float, radius: float, color: tuple[int, int, int, int]) -> None:
    radius_sq = radius * radius
    for y in range(max(0, floor(cy - radius)), min(SIZE, ceil(cy + radius + 1))):
        for x in range(max(0, floor(cx - radius)), min(SIZE, ceil(cx + radius + 1))):
            if (x - cx) ** 2 + (y - cy) ** 2 <= radius_sq:
                paint(x, y, color)


def line(start: tuple[float, float], end: tuple[float, float], width: float, color: tuple[int, int, int, int]) -> None:
    x0, y0 = start
    x1, y1 = end
    steps = max(1, ceil(sqrt((x1 - x0) ** 2 + (y1 - y0) ** 2) * 1.2))
    for step in range(steps + 1):
        ratio = step / steps
        disc(x0 + (x1 - x0) * ratio, y0 + (y1 - y0) * ratio, width / 2, color)


def intersections_y(polygon: list[tuple[int, int]], y: int) -> list[float]:
    intersections = []
    for index, (x1, y1) in enumerate(polygon):
        x2, y2 = polygon[(index + 1) % len(polygon)]
        if (y1 <= y < y2) or (y2 <= y < y1):
            intersections.append(x1 + (y - y1) * (x2 - x1) / (y2 - y1))
    return sorted(intersections)


def intersections_x(polygon: list[tuple[int, int]], x: int) -> list[float]:
    intersections = []
    for index, (x1, y1) in enumerate(polygon):
        x2, y2 = polygon[(index + 1) % len(polygon)]
        if (x1 <= x < x2) or (x2 <= x < x1):
            intersections.append(y1 + (x - x1) * (y2 - y1) / (x2 - x1))
    return sorted(intersections)


sun = (358, 130)
ray_color = (194, 148, 255, 255)
for angle in range(0, 360, 45):
    radians = angle * pi / 180
    line(
        (sun[0] + cos(radians) * 54, sun[1] + sin(radians) * 54),
        (sun[0] + cos(radians) * 72, sun[1] + sin(radians) * 72),
        8,
        ray_color,
    )
disc(*sun, 39, (215, 183, 255, 255))

panel = [(86, 266), (384, 266), (430, 402), (132, 402)]
panel_fill = (101, 47, 164, 255)
panel_line = (232, 220, 255, 235)
for y in range(panel[0][1], panel[2][1] + 1):
    crossings = intersections_y(panel, y)
    if len(crossings) >= 2:
        for x in range(max(0, ceil(crossings[0])), min(SIZE, floor(crossings[-1]) + 1)):
            paint(x, y, panel_fill)

for y in (305, 349, 390):
    crossings = intersections_y(panel, y)
    if len(crossings) >= 2:
        line((crossings[0], y), (crossings[-1], y), 3, panel_line)
for x in (158, 230, 302, 374):
    crossings = intersections_x(panel, x)
    if len(crossings) >= 2:
        line((x, crossings[0]), (x, crossings[-1]), 3, panel_line)
for index, point in enumerate(panel):
    line(point, panel[(index + 1) % len(panel)], 5, panel_line)
line((105, 438), (428, 438), 8, ray_color)


def chunk(kind: bytes, data: bytes) -> bytes:
    return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data) & 0xFFFFFFFF)


def write_png(size: int, path: Path) -> None:
    rows = []
    for y in range(size):
        source_y = min(SIZE - 1, y * SIZE // size)
        row = bytearray([0])
        for x in range(size):
            source_x = min(SIZE - 1, x * SIZE // size)
            offset = (source_y * SIZE + source_x) * 4
            row.extend(PIXELS[offset : offset + 4])
        rows.append(row)
    header = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)
    payload = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", header) + chunk(b"IDAT", zlib.compress(b"".join(rows), 9)) + chunk(b"IEND", b"")
    path.write_bytes(payload)


public_dir = Path(__file__).resolve().parents[1] / "public"
write_png(192, public_dir / "pwa-icon-192.png")
write_png(512, public_dir / "pwa-icon-512.png")

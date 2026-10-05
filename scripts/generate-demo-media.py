"""
Generates NomNoms' demo media: soft, film-like "photographs" of light and
texture (window light, linen, beaches, gardens, winter, candlelight...) plus a
handful of short MP4 clips with drifting light.

These stand in for a real family's photos so the prototype runs with zero
setup and no stock imagery of real people. Replace public/demo/* with real
photos (and update src/data/seed.ts) to see the book with your own family.

Usage:  python3 scripts/generate-demo-media.py
Needs:  numpy, Pillow, ffmpeg on PATH
"""
import os, subprocess, random, math
import numpy as np
from PIL import Image, ImageFilter, ImageDraw

OUT = os.path.join(os.path.dirname(__file__), "..", "public", "demo")
os.makedirs(OUT, exist_ok=True)

W, H = 960, 1200  # portrait 4:5
LW, LH = 1200, 900  # landscape


def lerp(a, b, t):
    return a + (b - a) * t


def hexrgb(h):
    h = h.lstrip("#")
    return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], dtype=np.float32)


def vgrad(w, h, stops):
    """Vertical gradient from list of (pos, hex)."""
    ys = np.linspace(0, 1, h)[:, None]
    img = np.zeros((h, w, 3), np.float32)
    for i in range(len(stops) - 1):
        p0, c0 = stops[i]
        p1, c1 = stops[i + 1]
        m = ((ys >= p0) & (ys <= p1)).astype(np.float32)
        t = np.clip((ys - p0) / max(p1 - p0, 1e-6), 0, 1)
        col = hexrgb(c0)[None, None, :] * (1 - t[..., None]) + hexrgb(c1)[None, None, :] * t[..., None]
        img = img * (1 - m[..., None]) + col * m[..., None]
    return img


def blur(arr, r):
    im = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))
    return np.asarray(im.filter(ImageFilter.GaussianBlur(r))).astype(np.float32)


def glow(img, cx, cy, radius, color, strength):
    h, w, _ = img.shape
    yy, xx = np.mgrid[0:h, 0:w]
    d = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2) / radius
    a = np.exp(-d ** 2) * strength
    return img * (1 - a[..., None]) + hexrgb(color)[None, None, :] * a[..., None]


def bokeh_layer(w, h, rng, n, rmin, rmax, colors, alpha=(0.25, 0.7), region=None):
    layer = np.zeros((h, w, 3), np.float32)
    mask = np.zeros((h, w), np.float32)
    im = Image.new("RGB", (w, h))
    mk = Image.new("L", (w, h))
    d = ImageDraw.Draw(im)
    dm = ImageDraw.Draw(mk)
    for _ in range(n):
        x0, x1, y0, y1 = region or (0, w, 0, h)
        x = rng.uniform(x0, x1)
        y = rng.uniform(y0, y1)
        r = rng.uniform(rmin, rmax)
        c = tuple(int(v) for v in hexrgb(rng.choice(colors)))
        a = int(255 * rng.uniform(*alpha))
        d.ellipse([x - r, y - r, x + r, y + r], fill=c)
        dm.ellipse([x - r, y - r, x + r, y + r], fill=a)
    im = im.filter(ImageFilter.GaussianBlur(3))
    mk = mk.filter(ImageFilter.GaussianBlur(3))
    return np.asarray(im).astype(np.float32), np.asarray(mk).astype(np.float32) / 255.0


def comp(base, layer, mask):
    return base * (1 - mask[..., None]) + np.maximum(base, layer) * mask[..., None]


def finish(img, rng, warmth=1.0, vignette=0.35, grain=3.5):
    h, w, _ = img.shape
    yy, xx = np.mgrid[0:h, 0:w]
    d = np.sqrt(((xx - w / 2) / (w / 2)) ** 2 + ((yy - h / 2) / (h / 2)) ** 2)
    v = 1 - vignette * np.clip(d - 0.35, 0, 1) ** 1.6
    img = img * v[..., None]
    # gentle film tone: lift blacks, warm highlights
    img = 14 + img * 0.94
    img[..., 0] *= 1.0 + 0.03 * warmth
    img[..., 2] *= 1.0 - 0.04 * warmth
    img += rng.normal(0, grain, (h, w, 1)).astype(np.float32)
    return np.clip(img, 0, 255).astype(np.uint8)


# ---------- scenes ----------

def scene_window(w, h, rng):
    wall = rng.choice([("#d9c6ae", "#b79f86"), ("#e5d6c4", "#c4ad94"), ("#d8c3b0", "#a98f7d")])
    img = vgrad(w, h, [(0, wall[0]), (1, wall[1])])
    # window light parallelogram with mullions
    light = Image.new("L", (w, h), 0)
    d = ImageDraw.Draw(light)
    ox = rng.uniform(0.1, 0.45) * w
    oy = rng.uniform(0.05, 0.35) * h
    sk = rng.uniform(0.15, 0.35) * w
    pw, ph = rng.uniform(0.3, 0.45) * w, rng.uniform(0.35, 0.55) * h
    for i in range(2):
        for j in range(2):
            x = ox + i * (pw / 2 + 8)
            y = oy + j * (ph / 2 + 8)
            d.polygon([(x, y), (x + pw / 2, y), (x + pw / 2 + sk * 0.5, y + ph / 2), (x + sk * 0.5, y + ph / 2)], fill=255)
    light = np.asarray(light.filter(ImageFilter.GaussianBlur(rng.uniform(10, 22)))).astype(np.float32) / 255
    sun = hexrgb("#fff1d6")
    img = img * (1 - 0.65 * light[..., None]) + sun * 0.65 * light[..., None]
    # leafy shadow speckle
    if rng.random() < 0.6:
        lay, m = bokeh_layer(w, h, rng, 60, 8, 40, ["#6b5848"], (0.1, 0.3))
        img = img * (1 - m[..., None] * 0.6) + lay * m[..., None] * 0.6
    return img


def scene_linen(w, h, rng):
    base = rng.choice(["#efe7dc", "#e9dfd2", "#f2ebe3", "#e4d9cf"])
    img = np.ones((h, w, 3), np.float32) * hexrgb(base)
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    field = np.zeros((h, w), np.float32)
    for _ in range(6):
        a = rng.uniform(0, math.pi)
        f = rng.uniform(0.004, 0.014)
        ph = rng.uniform(0, 6.28)
        field += np.sin((xx * math.cos(a) + yy * math.sin(a)) * f + ph) * rng.uniform(0.3, 1)
    field = (field - field.min()) / (field.max() - field.min())
    shade = 0.78 + 0.32 * field
    img = img * shade[..., None]
    img = glow(img, rng.uniform(0, w), rng.uniform(0, h * 0.5), w * 0.8, "#fff6ea", 0.35)
    return blur(img, 2)


def scene_bokeh(w, h, rng, dark=True):
    if dark:
        img = vgrad(w, h, [(0, "#2a2019"), (1, "#4a382a")])
    else:
        img = vgrad(w, h, [(0, "#d7c2a5"), (1, "#a88768")])
    lay, m = bokeh_layer(w, h, rng, 45, 25, 90, ["#f3c983", "#f6dcae", "#e9a96b", "#fff0d0"], (0.25, 0.75))
    img = comp(img, lay, m)
    return blur(img, 6)


def scene_field(w, h, rng):
    hz = rng.uniform(0.5, 0.68)
    img = vgrad(w, h, [(0, "#f1d9b3"), (hz - 0.08, "#f6e5c6"), (hz, "#e8c891"), (hz + 0.02, "#b99657"), (1, "#7c6a3c")])
    img = glow(img, rng.uniform(0.2, 0.8) * w, hz * h - 30, w * 0.35, "#fff4dc", 0.9)
    lay, m = bokeh_layer(w, h, rng, 120, 3, 12, ["#f5d590", "#fff0c9"], (0.2, 0.6), (0, w, hz * h, h))
    img = comp(img, lay, m)
    return blur(img, 3)


def scene_beach(w, h, rng):
    hz = rng.uniform(0.38, 0.5)
    shore = hz + rng.uniform(0.18, 0.3)
    img = vgrad(w, h, [(0, "#cfdde0"), (hz, "#eef0ea"), (hz + 0.005, "#9fb4b3"), (shore - 0.02, "#bccac4"),
                       (shore, "#f2ece0"), (shore + 0.03, "#e2d4bd"), (1, "#d6c4a7")])
    img = glow(img, rng.uniform(0.2, 0.8) * w, hz * h, w * 0.45, "#fffaf0", 0.55)
    lay, m = bokeh_layer(w, h, rng, 80, 2, 7, ["#ffffff"], (0.3, 0.8), (0, w, hz * h, shore * h))
    img = comp(img, lay, m)
    return blur(img, 2.5)


def scene_garden(w, h, rng):
    img = vgrad(w, h, [(0, "#c8cfae"), (0.5, "#8f9a6c"), (1, "#5d6b45")])
    lay, m = bokeh_layer(w, h, rng, 70, 30, 110, ["#a9b77f", "#6f7f4a", "#d5dcb2", "#4f5e38"], (0.3, 0.8))
    img = comp(img * 0.95, lay, m)
    lay, m = bokeh_layer(w, h, rng, 25, 15, 45, ["#fff3d6", "#f4e3b5", "#f1c9c0"], (0.4, 0.8))
    img = comp(img, lay, m)
    return blur(img, 7)


def scene_winter(w, h, rng):
    img = vgrad(w, h, [(0, "#dfe3e3"), (0.6, "#c9d0d2"), (1, "#aab3b5")])
    img = glow(img, rng.uniform(0, w), rng.uniform(0, h * 0.4), w * 0.7, "#f6efe6", 0.5)
    lay, m = bokeh_layer(w, h, rng, 90, 4, 18, ["#ffffff", "#f2f4f4"], (0.3, 0.8))
    img = comp(img, lay, m)
    return blur(img, 3)


def scene_holiday(w, h, rng):
    img = vgrad(w, h, [(0, "#1f2420"), (1, "#3a3127")])
    lay, m = bokeh_layer(w, h, rng, 30, 40, 120, ["#2f4a3a", "#3c5a45"], (0.4, 0.8))
    img = comp(img, lay, m)
    lay, m = bokeh_layer(w, h, rng, 55, 14, 50, ["#f6c66f", "#fbe2a8", "#e88f5a", "#fff2cf"], (0.35, 0.85))
    img = comp(img, lay, m)
    return blur(img, 5)


def scene_night(w, h, rng):
    img = vgrad(w, h, [(0, "#1e2228"), (1, "#2c2722")])
    img = glow(img, rng.uniform(0.6, 0.9) * w, rng.uniform(0.2, 0.5) * h, w * 0.5, "#e7a865", 0.75)
    img = glow(img, rng.uniform(0.6, 0.9) * w, rng.uniform(0.2, 0.5) * h, w * 0.2, "#ffe0b0", 0.6)
    return blur(img, 4)


def scene_morning(w, h, rng):
    c = rng.choice([("#f4d6c0", "#e6b79b"), ("#f3e0c8", "#dcbf9d"), ("#f1d2c4", "#d9a891")])
    img = vgrad(w, h, [(0, c[0]), (1, c[1])])
    img = glow(img, rng.uniform(0, w), rng.uniform(0, h * 0.4), w * 0.7, "#fff7ec", 0.75)
    lay, m = bokeh_layer(w, h, rng, 18, 30, 90, ["#fff3e4", "#f8d9bf"], (0.2, 0.5))
    img = comp(img, lay, m)
    return blur(img, 5)


def scene_autumn(w, h, rng):
    img = vgrad(w, h, [(0, "#e8d2b0"), (0.5, "#c58a54"), (1, "#7e5434")])
    lay, m = bokeh_layer(w, h, rng, 60, 20, 80, ["#d2803f", "#e3a15d", "#a8562c", "#f0c27d"], (0.3, 0.8))
    img = comp(img, lay, m)
    return blur(img, 6)


SCENES = {
    "window": (scene_window, 10), "linen": (scene_linen, 10), "bokeh": (scene_bokeh, 6),
    "field": (scene_field, 6), "beach": (scene_beach, 8), "garden": (scene_garden, 10),
    "winter": (scene_winter, 8), "holiday": (scene_holiday, 7), "night": (scene_night, 6),
    "morning": (scene_morning, 10), "autumn": (scene_autumn, 9),
}


def make(scene, idx, w, h):
    rng = np.random.default_rng(abs(hash((scene, idx))) % (2 ** 31) if False else (sum(map(ord, scene)) * 97 + idx * 7919))
    fn = SCENES[scene][0]
    if scene == "bokeh":
        arr = fn(w, h, rng, dark=idx % 2 == 0)
    else:
        arr = fn(w, h, rng)
    return finish(arr, rng)


def main():
    count = 0
    for scene, (fn, n) in SCENES.items():
        for i in range(1, n + 1):
            land = i % 4 == 0
            w, h = (LW, LH) if land else (W, H)
            arr = make(scene, i, w, h)
            im = Image.fromarray(arr)
            im.save(os.path.join(OUT, f"{scene}-{i:02d}.jpg"), quality=72, optimize=True, progressive=True)
            im.thumbnail((360, 360))
            im.save(os.path.join(OUT, f"{scene}-{i:02d}.thumb.jpg"), quality=70, optimize=True)
            count += 1
    print("images", count)
    if "--no-video" not in __import__("sys").argv:
        make_videos()


VIDEOS = [
    ("linen", 11), ("morning", 11), ("night", 7), ("autumn", 10), ("bokeh", 7), ("holiday", 8),
    ("winter", 9), ("morning", 12), ("garden", 11), ("garden", 12), ("beach", 9), ("field", 7), ("bokeh", 8),
]


def make_videos():
    vw, vh = 540, 676
    for k, (scene, seed) in enumerate(VIDEOS, start=1):
        rng = np.random.default_rng(seed * 31 + k)
        base = make(scene, seed, vw + 80, vh + 80).astype(np.float32)
        secs = [9, 14, 7, 12, 17, 10, 8, 11, 13, 6, 15, 9, 12][k - 1]
        fps = 24
        frames = secs * fps
        # light motes that drift
        motes = [(rng.uniform(0, vw), rng.uniform(0, vh), rng.uniform(10, 46), rng.uniform(-0.6, 0.6), rng.uniform(-0.5, 0.2),
                  rng.uniform(0.08, 0.3), rng.uniform(0, 6.28)) for _ in range(16)]
        name = f"clip-{k:02d}"
        path = os.path.join(OUT, name + ".mp4")
        p = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{vw}x{vh}",
                              "-r", str(fps), "-i", "-", "-c:v", "libx264", "-preset", "slow", "-crf", "31", "-pix_fmt", "yuv420p",
                              "-movflags", "+faststart", path], stdin=subprocess.PIPE)
        for f in range(frames):
            t = f / frames
            z = 1 + 0.08 * t
            cw, ch = int((vw + 80) / z), int((vh + 80) / z)
            ox = int(((vw + 80) - cw) * (0.3 + 0.4 * t))
            oy = int(((vh + 80) - ch) * 0.5)
            crop = Image.fromarray(base[oy:oy + ch, ox:ox + cw].astype(np.uint8)).resize((vw, vh), Image.BILINEAR)
            im = crop.convert("RGBA")
            ov = Image.new("RGBA", (vw, vh), (0, 0, 0, 0))
            d = ImageDraw.Draw(ov)
            for (x, y, r, dx, dy, a, ph) in motes:
                xx = (x + dx * f) % vw
                yy = (y + dy * f) % vh
                al = int(255 * a * (0.6 + 0.4 * math.sin(ph + f / 18)))
                d.ellipse([xx - r, yy - r, xx + r, yy + r], fill=(255, 240, 214, al))
            ov = ov.filter(ImageFilter.GaussianBlur(6))
            im = Image.alpha_composite(im, ov).convert("RGB")
            p.stdin.write(im.tobytes())
            if f == int(frames * 0.35):
                poster = im.copy()
        p.stdin.close()
        p.wait()
        poster.save(os.path.join(OUT, name + ".jpg"), quality=78, optimize=True)
        print(name, secs, "s", os.path.getsize(path) // 1024, "KB")


if __name__ == "__main__":
    main()

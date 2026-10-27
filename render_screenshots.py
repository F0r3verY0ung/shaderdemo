import subprocess
import os
import time
from PIL import Image, ImageStat

BASE = "/Users/snowyyai/Desktop/Test/shaderdemo"
RAW = os.path.join(BASE, "screenshots", "raw")
OUT = os.path.join(BASE, "screenshots")
BIN = "/opt/homebrew/bin/glslViewer"
SIZE = 512
os.makedirs(RAW, exist_ok=True)

jobs = [
    ("004color.frag", 1.0),
    ("005color.frag", None),
    ("006circleshape.frag", None),
    ("007rectshape.frag", None),
    ("008polugonshape.frag", None),
    ("009translate.frag", None),
    ("010sincos.frag", 0.5),
    ("011scale.frag", 0.0),
    ("012rotate.frag", 1.0),
    ("013warpgrid.frag", 2.0),
    ("014watercolor.frag", 3.0),
    ("015watercolor2.frag", 2.5),
    ("015xwatercolor3.frag", 3.0),
    ("016wraplin.frag", 1.0),
    ("016wrapline.frag", 2.0),
    ("017waveline.frag", 2.0),
    ("018rainbowswirl.frag", 2.0),
    ("019scanningline.frag", 3.0),
    ("test.frag", 4.0),
]

for fname, t in jobs:
    stem = os.path.splitext(fname)[0]
    raw_png = os.path.join(RAW, stem + ".png")
    if os.path.exists(raw_png):
        os.remove(raw_png)

    lines = []
    if t is not None:
        lines.append(f"u_time,{t}")
    lines.append(f"screenshot,{raw_png}")
    lines.append("exit")
    cmd_text = "\n".join(lines) + "\n"

    try:
        subprocess.run(
            [BIN, "--headless", fname],
            input=cmd_text.encode("utf-8"),
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            cwd=BASE,
            timeout=25,
        )
        ok = os.path.exists(raw_png) and os.path.getsize(raw_png) > 0
        print(f"{'OK' if ok else 'MISSING':8s} {stem}")
    except subprocess.TimeoutExpired:
        print(f"TIMEOUT  {stem}")
    time.sleep(0.5)

print("--- compositing black background + resize ---")
for fname, _ in jobs:
    stem = os.path.splitext(fname)[0]
    raw_png = os.path.join(RAW, stem + ".png")
    out_png = os.path.join(OUT, stem + ".png")
    im = Image.open(raw_png).convert("RGBA")
    bg = Image.new("RGBA", im.size, (0, 0, 0, 255))
    comp = Image.alpha_composite(bg, im).convert("RGB")
    comp = comp.resize((SIZE, SIZE), Image.LANCZOS)
    comp.save(out_png)
    st = ImageStat.Stat(comp)
    std = round(max(st.stddev), 1)
    flag = "  <-- near-flat" if std < 5 else ""
    print(f"{stem:24s} std={std:6.1f}{flag}")

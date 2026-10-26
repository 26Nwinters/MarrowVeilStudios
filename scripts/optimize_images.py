#!/usr/bin/env python3
"""Create faster WebP variants without deleting original studio source artwork.

Run from repository root after: python3 -m pip install Pillow==11.3.0
The script only rewrites references to variants that were successfully created.
Original PNG/JPEG files are retained for downloads, social previews and archiving.
"""
from pathlib import Path
import json
import re
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
FOLDERS = ["assets/HG", "assets/home", "assets/games", "assets/shop"]
new = {}
report = []
for folder in FOLDERS:
    for source in sorted((ROOT / folder).glob("*")):
        if source.suffix.lower() not in {".png", ".jpg", ".jpeg"}:
            continue
        target = source.with_suffix(".webp")
        try:
            with Image.open(source) as im:
                im = ImageOps.exif_transpose(im)
                if max(im.size) > 1920:
                    im.thumbnail((1920, 1920), Image.Resampling.LANCZOS)
                if im.mode not in {"RGB", "RGBA"}:
                    im = im.convert("RGBA" if "A" in im.getbands() else "RGB")
                im.save(target, "WEBP", quality=82, method=6)
            if target.stat().st_size >= source.stat().st_size:
                target.unlink()
                continue
            relative = source.relative_to(ROOT).as_posix()
            new[relative] = target.relative_to(ROOT).as_posix()
            report.append({"source": relative, "original_bytes": source.stat().st_size,
                           "webp_bytes": target.stat().st_size})
        except (OSError, ValueError) as error:
            print(f"Unable to optimize {source}: {error}")

# Rewrite page resource links and background images; do NOT rewrite Open Graph
# URLs or downloadable press artwork, which intentionally remain PNG files.
def new_src(match):
    quote, old = match.groups()
    return "src=" + quote + new.get(old, old) + quote

def new_css(match):
    quote, old = match.groups()
    return "url(" + quote + new.get(old, old) + quote + ")"

def new_preload(match):
    before, old, after = match.groups()
    updated = new.get(old.lstrip("/"), old.lstrip("/"))
    return before + "/" + updated + after

for file in sorted(ROOT.rglob("*")):
    if file.suffix.lower() not in {".html", ".css"} or ".git" in file.parts:
        continue
    text = file.read_text(encoding="utf-8")
    changed = re.sub(r'src=(["\x27])(assets/[^"\x27]+\.(?:png|jpe?g))\1', new_src, text)
    changed = re.sub(r'url\((["\x27]?)(assets/[^)"\x27]+\.(?:png|jpe?g))\1\)', new_css, changed)
    changed = re.sub(r'(<link rel="preload" as="image" href=")(/assets/[^"]+\.(?:png|jpe?g))(")', new_preload, changed)
    if changed != text:
        file.write_text(changed, encoding="utf-8")

report_file = ROOT / "docs" / "image-optimization-report.json"
report_file.parent.mkdir(exist_ok=True)
report_file.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
original = sum(item["original_bytes"] for item in report)
optimized = sum(item["webp_bytes"] for item in report)
print(f"Optimized {len(report)} assets: {original:,} -> {optimized:,} bytes ({(1-optimized/max(original,1))*100:.1f}% smaller)")

"""Optional maintainer tool. Requires fontTools with Brotli and Debian Noto sources.
Usage: python3 scripts/build-auth-fonts.py /usr/share/fonts
The application and its normal build do not require Python or fontTools.
"""
import json
import sys
from pathlib import Path
from fontTools import subset
from fontTools.ttLib import TTFont

root = Path(__file__).resolve().parents[1]
source = Path(sys.argv[1])
output = root / "public/fonts"
output.mkdir(parents=True, exist_ok=True)
text = " ".join(
    value
    for folder in ["messages", "panel"]
    for locale in ["zh", "ja", "en"]
    for value in json.loads((root / f"src/lib/i18n/{folder}/{locale}.json").read_text()).values()
) + " ".join(item["name"] for item in json.loads((root / "src/config/languages.json").read_text()).values())
for name, file, number in [
    ("Arabic", "truetype/noto/NotoSansArabic-Regular.ttf", None),
    ("Devanagari", "truetype/noto/NotoSansDevanagari-Regular.ttf", None),
    ("Chinese", "opentype/noto/NotoSansCJK-Regular.ttc", 2),
    ("Japanese", "opentype/noto/NotoSansCJK-Regular.ttc", 0),
]:
    font = TTFont(source / file, **({"fontNumber": number} if number is not None else {}))
    if number is not None:
        options = subset.Options()
        options.layout_features = ["*"]
        sub = subset.Subsetter(options=options)
        sub.populate(text=text)
        sub.subset(font)
    # Modified fonts use a distinct family name. Arabic/Devanagari retain all glyphs.
    for record in font["name"].names:
        if record.nameID in [1, 2, 3, 4, 6, 16, 17]:
            value = "Regular" if record.nameID in [2, 17] else f"TBA {name}"
            if record.nameID == 6:
                value = value.replace(" ", "") + "-Regular"
            record.string = value.encode(record.getEncoding())
    font.flavor = "woff2"
    target = output / f"auth-{name.lower()}.woff2"
    font.save(target)
    print(f"{target.relative_to(root)}: {target.stat().st_size} bytes")

"""从 AI 生成的主图标制作 PWA 图标和 iPhone 启动画面。

用法: python scripts/gen_icons.py
需要 Pillow。
"""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "icons"
MASTER = OUT / "icon-master.png"

CREAM = (247, 243, 236, 255)
ACCENT = (217, 108, 71, 255)

FONT_CANDIDATES = [
    Path(r"C:\Windows\Fonts\msyhbd.ttc"),
    Path(r"C:\Windows\Fonts\msyh.ttc"),
    Path(r"C:\Windows\Fonts\simhei.ttf"),
]

ICON_SPECS = [
    ("icon-180.png", 180),
    ("icon-192.png", 192),
    ("icon-512.png", 512),
    ("icon-512-maskable.png", 512),
    ("favicon-32.png", 32),
]

# iPhone 竖屏启动图尺寸（像素 = 逻辑分辨率 × 3 或 × 2）
SPLASH_SIZES = [
    (1206, 2622),
    (1320, 2868),
    (1260, 2736),
    (1179, 2556),
    (1290, 2796),
    (1170, 2532),
    (1125, 2436),
    (750, 1334),
]


def load_font(size: int):
    for path in FONT_CANDIDATES:
        if path.exists():
            return ImageFont.truetype(str(path), size)
    return ImageFont.load_default()


def load_master() -> Image.Image:
    if not MASTER.exists():
        raise FileNotFoundError(f"缺少主图标: {MASTER}")
    return Image.open(MASTER).convert("RGB")


def squircle_mask(size: int) -> Image.Image:
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        (0, 0, size - 1, size - 1), radius=int(size * 0.225), fill=255
    )
    return mask


def make_splash(master: Image.Image, width: int, height: int) -> Image.Image:
    canvas = Image.new("RGBA", (width, height), CREAM)
    icon_size = int(min(width, height) * 0.26)
    icon = master.resize((icon_size, icon_size), Image.Resampling.LANCZOS).convert("RGBA")
    icon.putalpha(squircle_mask(icon_size))

    icon_x = (width - icon_size) // 2
    icon_y = int(height * 0.40) - icon_size // 2
    canvas.alpha_composite(icon, (icon_x, icon_y))

    draw = ImageDraw.Draw(canvas)
    font = load_font(int(width * 0.055))
    draw.text(
        (width / 2, icon_y + icon_size + int(width * 0.085)),
        "这周值得",
        font=font,
        fill=ACCENT,
        anchor="mm",
    )
    return canvas.convert("RGB")


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    master = load_master()

    for name, size in ICON_SPECS:
        icon = master.resize((size, size), Image.Resampling.LANCZOS)
        icon.save(OUT / name, optimize=True)
        print("ok", name)

    for width, height in SPLASH_SIZES:
        name = f"splash-{width}x{height}.png"
        make_splash(master, width, height).save(OUT / name, optimize=True)
        print("ok", name)


if __name__ == "__main__":
    main()

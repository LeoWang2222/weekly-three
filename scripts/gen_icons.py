"""生成 App 图标:暖陶土色圆角方块 + 白色「值」字。
用法: python scripts/gen_icons.py
需要 Pillow;Windows 下使用微软雅黑字体绘制中文。
"""
import os
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.join(os.path.dirname(__file__), "..")
OUT = os.path.join(ROOT, "icons")

BG = (217, 108, 71, 255)      # --accent 暖陶土色
FG = (255, 250, 244, 255)     # 暖白
RADIUS_RATIO = 0.22           # 圆角(iOS 风格 squircle 的近似)

FONT_CANDIDATES = [
    r"C:\Windows\Fonts\msyhbd.ttc",   # 微软雅黑 Bold
    r"C:\Windows\Fonts\msyh.ttc",
    r"C:\Windows\Fonts\simhei.ttf",
]


def load_font(size):
    for path in FONT_CANDIDATES:
        if os.path.exists(path):
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def rounded_square(size, radius_ratio=RADIUS_RATIO):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    mask = Image.new("L", (size, size), 0)
    d = ImageDraw.Draw(mask)
    d.rounded_rectangle([0, 0, size - 1, size - 1],
                        radius=int(size * radius_ratio), fill=255)
    img.paste(Image.new("RGBA", (size, size), BG), (0, 0), mask)
    return img


def draw_icon(size, full_bleed=False):
    img = rounded_square(size, radius_ratio=0 if full_bleed else RADIUS_RATIO)
    font = load_font(int(size * 0.58))
    d = ImageDraw.Draw(img)
    d.text((size / 2, size / 2), "值", font=font, fill=FG,
           anchor="mm")
    return img


def main():
    os.makedirs(OUT, exist_ok=True)
    specs = [
        ("icon-180.png", 180, False),          # apple-touch-icon
        ("icon-192.png", 192, False),
        ("icon-512.png", 512, False),
        ("icon-512-maskable.png", 512, True),  # maskable 全幅,安全区内居中
        ("favicon-32.png", 32, False),
    ]
    for name, size, full_bleed in specs:
        icon = draw_icon(size, full_bleed)
        if full_bleed:
            # maskable:缩小字形,留出安全区
            icon = rounded_square(size, radius_ratio=0)
            font = load_font(int(size * 0.46))
            d = ImageDraw.Draw(icon)
            d.text((size / 2, size / 2), "值", font=font, fill=FG, anchor="mm")
        icon.save(os.path.join(OUT, name))
        print("ok", name)
    for w, h in SPLASH_SIZES:
        name = "splash-%dx%d.png" % (w, h)
        make_splash(w, h).save(os.path.join(OUT, name))
        print("ok", name)


# iPhone 竖屏启动图尺寸(像素 = 逻辑分辨率 × 3 或 ×2)
SPLASH_SIZES = [
    (1206, 2622),  # iPhone 17 / 17 Pro(6.3")
    (1320, 2868),  # iPhone 17 Pro Max(6.9")
    (1260, 2736),  # iPhone Air(6.5")
    (1179, 2556),  # iPhone 14 Pro / 15 / 16(6.1")
    (1290, 2796),  # iPhone 15/16 Plus / Pro Max(6.7")
    (1170, 2532),  # iPhone 12 / 13 / 14(6.1")
    (1125, 2436),  # iPhone X / XS / 11 Pro(5.8")
    (750, 1334),   # iPhone 8 / SE2/3(4.7")
]

CREAM = (247, 243, 236, 255)   # --bg 浅色
ACCENT = (217, 108, 71, 255)


def make_splash(w, h):
    """暖白底 + 居中圆角图标 + 下方「这周值得」字样。"""
    img = Image.new("RGBA", (w, h), CREAM)
    icon_size = int(min(w, h) * 0.26)
    icon = draw_icon(icon_size)
    ix = (w - icon_size) // 2
    iy = int(h * 0.40) - icon_size // 2
    img.paste(icon, (ix, iy), icon)
    d = ImageDraw.Draw(img)
    font = load_font(int(w * 0.055))
    d.text((w / 2, iy + icon_size + int(w * 0.06)), "这周值得",
           font=font, fill=ACCENT, anchor="mm")
    return img


if __name__ == "__main__":
    main()

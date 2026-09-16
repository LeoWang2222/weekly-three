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


if __name__ == "__main__":
    main()

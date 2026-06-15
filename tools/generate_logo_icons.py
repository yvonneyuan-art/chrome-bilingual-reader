from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "chrome-extension" / "icons"


def rounded_rectangle(draw, xy, radius, fill, outline=None, width=1):
    draw.rounded_rectangle(xy, radius=radius, fill=fill, outline=outline, width=width)


def draw_icon(size):
    scale = size / 128
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    def s(value):
        return round(value * scale)

    rounded_rectangle(draw, (0, 0, size - 1, size - 1), s(28), (246, 248, 251, 255))

    shadow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow)
    rounded_rectangle(
        shadow_draw,
        (s(24), s(20), s(104), s(112)),
        s(18),
        (24, 50, 79, 36),
    )
    shadow = shadow.filter(ImageFilter.GaussianBlur(s(5)))
    img.alpha_composite(shadow)

    rounded_rectangle(
        draw,
        (s(24), s(18), s(104), s(110)),
        s(18),
        (248, 251, 255, 255),
        (216, 226, 240, 255),
        max(1, s(3)),
    )
    draw.rounded_rectangle((s(24), s(18), s(104), s(44)), radius=s(18), fill=(76, 141, 246, 255))
    draw.rectangle((s(24), s(34), s(104), s(44)), fill=(45, 173, 196, 255))

    draw.line((s(64), s(51), s(64), s(96)), fill=(216, 226, 240, 255), width=max(1, s(3)))

    line_width = max(2, s(5))
    for y, length in [(62, 16), (74, 13), (86, 17)]:
        draw.line((s(42), s(y), s(42 + length), s(y)), fill=(76, 141, 246, 255), width=line_width)
    for y, start, length in [(62, 74, 13), (74, 70, 19), (86, 73, 15)]:
        draw.line((s(start), s(y), s(start + length), s(y)), fill=(31, 183, 166, 255), width=line_width)

    draw.ellipse((s(55), s(31), s(73), s(49)), fill=(255, 255, 255, 255))
    plus_width = max(1, s(3.5))
    draw.line((s(57.5), s(40), s(70.5), s(40)), fill=(49, 82, 116, 255), width=plus_width)
    draw.line((s(64), s(33.5), s(64), s(46.5)), fill=(49, 82, 116, 255), width=plus_width)

    return img


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for size in (16, 32, 48, 128):
        icon = draw_icon(size)
        icon.save(OUT / f"icon-{size}.png")


if __name__ == "__main__":
    main()

from __future__ import annotations

import math
import subprocess
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
ASSET_DIR = ROOT / "public" / "brand" / "qalam-film"
OUTPUT = ASSET_DIR / "qalam-brand-film.mp4"

WIDTH = 1920
HEIGHT = 1080
FPS = 24
DURATION = 8.0
FRAMES = int(FPS * DURATION)

TEAL = (7, 43, 45)
IVORY = (244, 236, 218)
GOLD = (219, 168, 74)
GOLD_LIGHT = (246, 212, 133)
ZINC = (151, 158, 151)


def clamp(value: float, low: float = 0.0, high: float = 1.0) -> float:
    return max(low, min(high, value))


def smoothstep(edge0: float, edge1: float, value: float) -> float:
    x = clamp((value - edge0) / (edge1 - edge0))
    return x * x * (3.0 - 2.0 * x)


def ease_out_cubic(value: float) -> float:
    x = clamp(value)
    return 1.0 - (1.0 - x) ** 3


def cover(image: Image.Image, width: int, height: int) -> Image.Image:
    scale = max(width / image.width, height / image.height)
    size = (round(image.width * scale), round(image.height * scale))
    resized = image.resize(size, Image.Resampling.LANCZOS)
    left = (resized.width - width) // 2
    top = (resized.height - height) // 2
    return resized.crop((left, top, left + width, top + height))


def fit_height(image: Image.Image, height: int) -> Image.Image:
    width = round(image.width * height / image.height)
    return image.resize((width, height), Image.Resampling.LANCZOS)


def alpha_scaled(image: Image.Image, opacity: float) -> Image.Image:
    result = image.copy()
    alpha = result.getchannel("A").point(lambda value: round(value * clamp(opacity)))
    result.putalpha(alpha)
    return result


def font(path: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(path, size=size)


FONT_SANS = "C:/Windows/Fonts/arial.ttf"
FONT_SANS_BOLD = "C:/Windows/Fonts/arialbd.ttf"
FONT_SERIF = "C:/Windows/Fonts/georgia.ttf"


def tracked_text_layer(text: str, size: int, tracking: int, color: tuple[int, int, int, int]) -> Image.Image:
    face = font(FONT_SANS_BOLD, size)
    widths = [face.getlength(char) for char in text]
    total_width = round(sum(widths) + tracking * max(0, len(text) - 1))
    layer = Image.new("RGBA", (total_width + 20, size + 40), (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    x = 10.0
    for char, char_width in zip(text, widths):
        draw.text((x, 2), char, font=face, fill=color)
        x += char_width + tracking
    return layer


def load_mark() -> Image.Image:
    source = Image.open(ROOT / "public" / "byqalam-mark-gold.png").convert("RGB")
    array = np.asarray(source)
    blue_separation = 245 - array[:, :, 2].astype(np.int16)
    alpha = np.clip((blue_separation - 18) * 2.5, 0, 255).astype(np.uint8)
    rgba = np.zeros((source.height, source.width, 4), dtype=np.uint8)
    rgba[:, :, :3] = GOLD
    rgba[:, :, 3] = alpha
    mark = Image.fromarray(rgba, "RGBA")
    bbox = mark.getbbox()
    return mark.crop(bbox) if bbox else mark


def bezier(points: list[tuple[float, float]], count: int = 240) -> list[tuple[float, float]]:
    p0, p1, p2, p3 = points
    result = []
    for index in range(count):
        t = index / (count - 1)
        mt = 1.0 - t
        x = mt**3 * p0[0] + 3 * mt**2 * t * p1[0] + 3 * mt * t**2 * p2[0] + t**3 * p3[0]
        y = mt**3 * p0[1] + 3 * mt**2 * t * p1[1] + 3 * mt * t**2 * p2[1] + t**3 * p3[1]
        result.append((x, y))
    return result


INK_PATH = (
    bezier([(720, 420), (910, 250), (1110, 320), (1220, 470)], 110)
    + bezier([(1220, 470), (1340, 610), (1180, 740), (1010, 700)], 100)[1:]
    + bezier([(1010, 700), (850, 670), (790, 545), (910, 505)], 80)[1:]
)


def draw_glowing_path(base: Image.Image, progress: float, opacity: float = 1.0) -> None:
    if progress <= 0:
        return
    count = max(2, round(len(INK_PATH) * clamp(progress)))
    points = INK_PATH[:count]
    glow = Image.new("RGBA", base.size, (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    glow_draw.line(points, fill=(*GOLD, round(130 * opacity)), width=18, joint="curve")
    glow = glow.filter(ImageFilter.GaussianBlur(14))
    base.alpha_composite(glow)
    crisp = Image.new("RGBA", base.size, (0, 0, 0, 0))
    crisp_draw = ImageDraw.Draw(crisp)
    crisp_draw.line(points, fill=(*GOLD_LIGHT, round(235 * opacity)), width=5, joint="curve")
    if points:
        x, y = points[-1]
        crisp_draw.ellipse((x - 7, y - 7, x + 7, y + 7), fill=(*GOLD_LIGHT, round(255 * opacity)))
    base.alpha_composite(crisp)


def draw_ripple(base: Image.Image, center: tuple[int, int], age: float) -> None:
    if age < 0 or age > 0.75:
        return
    progress = age / 0.75
    radius_x = 18 + 105 * progress
    radius_y = 6 + 28 * progress
    opacity = round(120 * (1.0 - progress) ** 2)
    layer = Image.new("RGBA", base.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    draw.ellipse(
        (center[0] - radius_x, center[1] - radius_y, center[0] + radius_x, center[1] + radius_y),
        outline=(*GOLD_LIGHT, opacity),
        width=3,
    )
    layer = layer.filter(ImageFilter.GaussianBlur(2.5))
    base.alpha_composite(layer)


def draw_editorial_cards(base: Image.Image, time: float) -> None:
    appear = smoothstep(4.0, 4.35, time) * (1.0 - smoothstep(5.35, 5.75, time))
    if appear <= 0:
        return
    layer = Image.new("RGBA", base.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    cards = [
        (930, 260, 1240, 330, "OPEN WITH CLARITY"),
        (1275, 365, 1535, 500, "PROFILE"),
        (1040, 560, 1280, 735, "RESUME"),
    ]
    title_face = font(FONT_SANS_BOLD, 18)
    copy_face = font(FONT_SANS, 14)
    for index, (x1, y1, x2, y2, label) in enumerate(cards):
        local = clamp(appear * 1.4 - index * 0.12)
        offset = round((1.0 - local) * 18)
        fill_alpha = round(140 * local)
        line_alpha = round(125 * local)
        draw.rounded_rectangle(
            (x1, y1 + offset, x2, y2 + offset),
            radius=12,
            fill=(7, 43, 45, fill_alpha),
            outline=(*GOLD, line_alpha),
            width=2,
        )
        draw.text((x1 + 18, y1 + 15 + offset), label, font=title_face, fill=(*IVORY, round(220 * local)))
        draw.line((x1 + 18, y1 + 45 + offset, x2 - 18, y1 + 45 + offset), fill=(*ZINC, round(90 * local)), width=2)
        if index > 0:
            draw.text((x1 + 18, y1 + 62 + offset), "Authority  |  Signal  |  Proof", font=copy_face, fill=(*ZINC, round(180 * local)))
    signal_x, signal_y = 1450, 610
    for ring in range(3):
        radius = 18 + ring * 16 + 6 * math.sin(time * 4.0)
        draw.ellipse(
            (signal_x - radius, signal_y - radius, signal_x + radius, signal_y + radius),
            outline=(*GOLD_LIGHT, round((110 - ring * 28) * appear)),
            width=2,
        )
    base.alpha_composite(layer)


def add_vignette(image: Image.Image) -> Image.Image:
    if not hasattr(add_vignette, "layer"):
        yy, xx = np.mgrid[0:HEIGHT, 0:WIDTH]
        nx = (xx - WIDTH / 2) / (WIDTH / 2)
        ny = (yy - HEIGHT / 2) / (HEIGHT / 2)
        radius = np.sqrt(nx * nx + ny * ny)
        alpha = np.clip((radius - 0.48) / 0.62, 0, 1) ** 1.7 * 105
        layer = np.zeros((HEIGHT, WIDTH, 4), dtype=np.uint8)
        layer[:, :, 3] = alpha.astype(np.uint8)
        add_vignette.layer = Image.fromarray(layer, "RGBA")
    image.alpha_composite(add_vignette.layer)
    return image


def render_frame(
    frame_index: int,
    background: Image.Image,
    character: Image.Image,
    mark: Image.Image,
    qalam_text: Image.Image,
) -> Image.Image:
    time = frame_index / FPS

    camera = smoothstep(0.0, 6.3, time)
    zoom = 1.0 + 0.055 * camera
    bg_w = round(WIDTH * zoom)
    bg_h = round(HEIGHT * zoom)
    bg_scaled = background.resize((bg_w, bg_h), Image.Resampling.LANCZOS)
    pan_x = round(22 * camera)
    left = (bg_w - WIDTH) // 2 + pan_x
    top = (bg_h - HEIGHT) // 2
    frame = bg_scaled.crop((left, top, left + WIDTH, top + HEIGHT)).convert("RGBA")

    mood = Image.new("RGBA", frame.size, (*TEAL, 28))
    frame.alpha_composite(mood)

    entrance = ease_out_cubic(time / 2.8)
    char_height = round(980 * (1.0 + 0.02 * camera))
    char_plate = fit_height(character, char_height)
    char_x = round(-520 + entrance * 780 - 18 * camera)
    bob_strength = (1.0 - entrance) * 13
    bob = math.sin(time * math.pi * 4.2) * bob_strength
    settle = math.sin(max(0.0, time - 2.8) * 2.2) * 2.0 * math.exp(-max(0.0, time - 2.8) * 1.3)
    char_y = round(84 + bob + settle)

    shadow = Image.new("RGBA", frame.size, (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow)
    foot_center = (char_x + char_plate.width // 2, 1010)
    shadow_draw.ellipse(
        (foot_center[0] - 210, 978, foot_center[0] + 235, 1032),
        fill=(0, 18, 18, round(130 * entrance)),
    )
    shadow = shadow.filter(ImageFilter.GaussianBlur(20))
    frame.alpha_composite(shadow)

    for step_time, side in [(0.78, -1), (1.34, 1), (1.92, -1), (2.48, 1)]:
        step_progress = ease_out_cubic(step_time / 2.8)
        step_char_x = round(-520 + step_progress * 780)
        center = (step_char_x + char_plate.width // 2 + side * 82, 1007)
        draw_ripple(frame, center, time - step_time)

    frame.alpha_composite(char_plate, (char_x, char_y))

    path_progress = smoothstep(3.0, 4.7, time)
    path_fade = 1.0 - smoothstep(5.55, 6.2, time)
    draw_glowing_path(frame, path_progress, path_fade)
    draw_editorial_cards(frame, time)

    mark_reveal = smoothstep(5.15, 6.15, time)
    mark_pulse = 1.0 + 0.045 * math.sin((time - 6.05) * math.pi * 3.0) * math.exp(-max(0.0, time - 6.05) * 3.2)
    mark_size = round(250 * mark_pulse)
    mark_layer = mark.resize((mark_size, mark_size), Image.Resampling.LANCZOS)
    mark_layer = alpha_scaled(mark_layer, mark_reveal)
    mark_x = 1095 - mark_size // 2
    mark_y = 210 - mark_size // 2
    if mark_reveal > 0:
        glow = Image.new("RGBA", frame.size, (0, 0, 0, 0))
        glow_mark = alpha_scaled(mark_layer, 0.62).filter(ImageFilter.GaussianBlur(24))
        glow.alpha_composite(glow_mark, (mark_x, mark_y))
        frame.alpha_composite(glow)
        frame.alpha_composite(mark_layer, (mark_x, mark_y))

    final = smoothstep(5.82, 6.45, time)
    if final > 0:
        final_layer = Image.new("RGBA", frame.size, (0, 0, 0, 0))
        panel = Image.new("RGBA", (750, 460), (2, 30, 31, round(128 * final)))
        panel = panel.filter(ImageFilter.GaussianBlur(32))
        final_layer.alpha_composite(panel, (990, 160))

        qalam = alpha_scaled(qalam_text, final)
        final_layer.alpha_composite(qalam, (1170, 315))

        draw = ImageDraw.Draw(final_layer)
        serif = font(FONT_SERIF, 42)
        sans = font(FONT_SANS, 28)
        copy_alpha = round(255 * final)
        draw.text((1172, 440), "Write with authority.", font=serif, fill=(*IVORY, copy_alpha))
        draw.text((1173, 506), "Be seen for what you know.", font=sans, fill=(*ZINC, round(235 * final)))
        draw.line((1173, 407, 1560, 407), fill=(*GOLD, round(150 * final)), width=2)
        frame.alpha_composite(final_layer)

    add_vignette(frame)
    return frame.convert("RGB")


def main() -> None:
    background = cover(Image.open(ASSET_DIR / "qalam-studio.png").convert("RGB"), WIDTH, HEIGHT)
    background = ImageEnhance.Color(background).enhance(0.92)
    character = Image.open(ASSET_DIR / "qalam-rabbit.png").convert("RGBA")
    mark = load_mark()
    qalam_text = tracked_text_layer("QALAM", 88, 15, (*IVORY, 255))

    command = [
        "ffmpeg",
        "-y",
        "-f",
        "rawvideo",
        "-vcodec",
        "rawvideo",
        "-pix_fmt",
        "rgb24",
        "-s",
        f"{WIDTH}x{HEIGHT}",
        "-r",
        str(FPS),
        "-i",
        "-",
        "-an",
        "-c:v",
        "libx264",
        "-preset",
        "medium",
        "-crf",
        "16",
        "-pix_fmt",
        "yuv420p",
        "-movflags",
        "+faststart",
        str(OUTPUT),
    ]
    process = subprocess.Popen(command, stdin=subprocess.PIPE)
    assert process.stdin is not None
    for frame_index in range(FRAMES):
        frame = render_frame(frame_index, background, character, mark, qalam_text)
        process.stdin.write(frame.tobytes())
        if frame_index % 24 == 0:
            print(f"Rendered {frame_index // 24}s of {int(DURATION)}s", flush=True)
    process.stdin.close()
    return_code = process.wait()
    if return_code != 0:
        raise SystemExit(return_code)
    print(OUTPUT)


if __name__ == "__main__":
    main()

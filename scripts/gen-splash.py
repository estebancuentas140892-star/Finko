"""
gen-splash.py — Genera splash screens PWA para iOS (apple-touch-startup-image)

Tamaños: 5 variantes para iPhones modernos (2020–2025)
Diseño:  fondo #0f1117, logo 3 barras #00dc82 centrado, nombre + tagline

Uso:
    python scripts/gen-splash.py

Requisito: Pillow  →  pip install Pillow
"""

from PIL import Image, ImageDraw, ImageFont
import os

OUT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'splash')
os.makedirs(OUT, exist_ok=True)

BG     = '#0f1117'
ACCENT = '#00dc82'
MUTED  = '#475569'

# (width, height, label)
SIZES = [
    (750,  1334, 'iPhone SE / 8'),
    (1170, 2532, 'iPhone 12/13/14'),
    (1179, 2556, 'iPhone 14 Pro / 15'),
    (1284, 2778, 'iPhone 14 Plus / 15 Plus'),
    (1290, 2796, 'iPhone 14 Pro Max / 15 Pro Max'),
]

def hex_to_rgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))

def get_font(size, bold=False):
    try:
        return ImageFont.truetype('arialbd.ttf' if bold else 'arial.ttf', size)
    except Exception:
        return ImageFont.load_default()

def draw_bars(draw, cx, cy, unit):
    """
    Dibuja el logo de 3 barras ascendentes centrado en (cx, cy).
    unit: altura de la barra más alta en píxeles.
    """
    bar_w   = round(unit * 0.42)
    gap     = round(unit * 0.18)
    radius  = round(bar_w * 0.30)
    heights = [round(unit * 0.45), round(unit * 0.70), unit]
    total_w = bar_w * 3 + gap * 2
    x0      = cx - total_w // 2

    for i, h in enumerate(heights):
        x1 = x0 + i * (bar_w + gap)
        x2 = x1 + bar_w
        y1 = cy - h // 2
        y2 = y1 + h
        draw.rounded_rectangle([x1, y1, x2, y2], radius=radius,
                                fill=hex_to_rgb(ACCENT))

def make_splash(w, h, label):
    img  = Image.new('RGB', (w, h), hex_to_rgb(BG))
    draw = ImageDraw.Draw(img)

    scale   = w / 750            # escala relativa al tamaño base
    unit    = round(160 * scale) # altura de barra más alta
    cy_logo = round(h * 0.44)    # centro vertical ligeramente arriba del centro

    draw_bars(draw, w // 2, cy_logo, unit)

    # Nombre "Finko"
    font_name = get_font(round(72 * scale), bold=True)
    name_y    = cy_logo + unit // 2 + round(28 * scale)
    bbox      = draw.textbbox((0, 0), 'Finko', font=font_name)
    draw.text((w // 2 - (bbox[2] - bbox[0]) // 2, name_y),
              'Finko', fill=hex_to_rgb(ACCENT), font=font_name)

    # Tagline
    font_tag = get_font(round(28 * scale))
    tagline  = 'Tu plata bajo control'
    tag_y    = name_y + (bbox[3] - bbox[1]) + round(16 * scale)
    bbox2    = draw.textbbox((0, 0), tagline, font=font_tag)
    draw.text((w // 2 - (bbox2[2] - bbox2[0]) // 2, tag_y),
              tagline, fill=hex_to_rgb(MUTED), font=font_tag)

    fname = f'splash-{w}x{h}.png'
    img.save(os.path.join(OUT, fname), 'PNG', optimize=True)
    print(f'OK  {fname}  ({label})')

for w, h, label in SIZES:
    make_splash(w, h, label)

print('Done — splash screens en assets/splash/')

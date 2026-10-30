"""
gen-splash.py - Genera splash screens PWA para iOS (apple-touch-startup-image)

Tamaños: 5 variantes para iPhones modernos (2020-2025)
Diseño:  fondo #0f1117, el isotipo en su teja (ADR 103) centrado, nombre + tagline.
         El isotipo sale de assets/svg/identidad/isotipo.svg (scripts/isotipo.py).

Uso:
    python scripts/gen-splash.py

Requisito: Pillow  →  pip install Pillow
"""

from PIL import Image, ImageDraw, ImageFont
import os

from isotipo import FONDO_MARCA, dibujar_isotipo

OUT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'splash')
os.makedirs(OUT, exist_ok=True)

BG     = '#0f1117'
TEXTO  = '#e9ebf3'   # --fk-text-primary del tema oscuro
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

def draw_marca(draw, cx, cy, lado):
    """
    Dibuja la teja de marca (fondo fijo, esquinas al 22 %) con el isotipo
    centrado en (cx, cy). lado: ancho y alto de la teja en píxeles.
    """
    x0, y0 = cx - lado // 2, cy - lado // 2
    draw.rounded_rectangle([x0, y0, x0 + lado, y0 + lado], radius=round(lado * 0.22),
                           fill=hex_to_rgb(FONDO_MARCA))
    dibujar_isotipo(draw, (cx, cy), lado * 0.64)

def make_splash(w, h, label):
    img  = Image.new('RGB', (w, h), hex_to_rgb(BG))
    draw = ImageDraw.Draw(img)

    scale   = w / 750            # escala relativa al tamaño base
    unit    = round(160 * scale) # lado de la teja de marca
    cy_logo = round(h * 0.44)    # centro vertical ligeramente arriba del centro

    draw_marca(draw, w // 2, cy_logo, unit)

    # Nombre "Finko"
    font_name = get_font(round(72 * scale), bold=True)
    name_y    = cy_logo + unit // 2 + round(28 * scale)
    bbox      = draw.textbbox((0, 0), 'Finko', font=font_name)
    draw.text((w // 2 - (bbox[2] - bbox[0]) // 2, name_y),
              'Finko', fill=hex_to_rgb(TEXTO), font=font_name)

    # Tagline
    font_tag = get_font(round(28 * scale))
    tagline  = 'Tu dinero bajo control'
    # bbox[3] y no el alto: el bbox de textbbox((0, 0)) ya trae el margen de
    # ascendente arriba, y restarlo pegaba el lema al nombre.
    tag_y    = name_y + bbox[3] + round(16 * scale)
    bbox2    = draw.textbbox((0, 0), tagline, font=font_tag)
    draw.text((w // 2 - (bbox2[2] - bbox2[0]) // 2, tag_y),
              tagline, fill=hex_to_rgb(MUTED), font=font_tag)

    fname = f'splash-{w}x{h}.png'
    img.save(os.path.join(OUT, fname), 'PNG', optimize=True)
    print(f'OK  {fname}  ({label})')

for w, h, label in SIZES:
    make_splash(w, h, label)

print('Done - splash screens en assets/splash/')

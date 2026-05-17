"""
gen-icons.py — Genera los íconos PNG para el manifest de Finko PWA.

Íconos generados:
  assets/icons/icon-192.png  (192×192)
  assets/icons/icon-512.png  (512×512)

Diseño: fondo #1a2334 (azul oscuro neutro), círculo verde #00dc82,
texto "F" centrado en blanco.
"""

import os
from PIL import Image, ImageDraw, ImageFont

# ── Colores del design system de Finko ──────────────────────────────────────
BG_COLOR    = (15,  17,  23)    # --fk-bg-base  #0f1117
CIRCLE_COLOR= (0,  220, 130)    # --fk-accent   #00dc82
TEXT_COLOR  = (15,  17,  23)    # texto oscuro sobre círculo verde

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'assets', 'icons')
os.makedirs(OUTPUT_DIR, exist_ok=True)


def make_icon(size: int, path: str) -> None:
    img  = Image.new('RGBA', (size, size), BG_COLOR + (255,))
    draw = ImageDraw.Draw(img)

    # Círculo verde centrado (80% del tamaño del ícono, con antialiasing)
    margin = int(size * 0.10)
    draw.ellipse(
        [margin, margin, size - margin, size - margin],
        fill=CIRCLE_COLOR + (255,),
    )

    # Letra "F" centrada
    font_size = int(size * 0.45)
    try:
        # Intentar fuente del sistema
        font = ImageFont.truetype('arial.ttf', font_size)
    except OSError:
        try:
            font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', font_size)
        except OSError:
            font = ImageFont.load_default(size=font_size)

    # Calcular posición centrada de la letra
    bbox = draw.textbbox((0, 0), 'F', font=font)
    text_w = bbox[2] - bbox[0]
    text_h = bbox[3] - bbox[1]
    x = (size - text_w) // 2 - bbox[0]
    y = (size - text_h) // 2 - bbox[1]

    draw.text((x, y), 'F', fill=TEXT_COLOR + (255,), font=font)

    # Guardar como PNG (sin metadatos innecesarios)
    img.save(path, 'PNG', optimize=True)
    print(f'  OK {path}  ({size}x{size})')


if __name__ == '__main__':
    print('Generando iconos Finko PWA...')
    make_icon(192, os.path.join(OUTPUT_DIR, 'icon-192.png'))
    make_icon(512, os.path.join(OUTPUT_DIR, 'icon-512.png'))
    print('Listo!')

"""
gen-icons.py — Genera los íconos PNG de producción para Finko PWA.

Íconos generados:
  assets/icons/icon-192.png          (192×192) — manifest any + maskable
  assets/icons/icon-512.png          (512×512) — manifest any + maskable
  assets/icons/apple-touch-icon.png  (180×180) — iOS Safari / homescreen

Diseño: 3 barras crecientes (gráfico financiero) en #00dc82 sobre fondo #0f1117.
  - Contenido dentro del safe zone 80% (cumple spec maskable).
  - Esquinas redondeadas en todas las barras (estética moderna).

Técnica: supersampling 4× + downscale LANCZOS para anti-aliasing de producción.
"""

import os
from PIL import Image, ImageDraw

# ── Colores del design system de Finko ──────────────────────────────────────
BG     = (15,  17,  23, 255)   # --fk-bg-base  #0f1117
ACCENT = (0,  220, 130, 255)   # --fk-accent   #00dc82

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'assets', 'icons')
os.makedirs(OUTPUT_DIR, exist_ok=True)

SCALE = 4   # Factor de supersampling. 4× → anti-aliasing premium.


def make_icon(final_size: int, path: str) -> None:
    """
    Genera un ícono cuadrado con 3 barras crecientes centradas.

    La safe zone para maskable es el 80% central (10% de margen por lado).
    Todo el contenido visual queda dentro de esa zona.
    """
    s = final_size * SCALE      # Tamaño de trabajo (supersampled)

    img  = Image.new('RGBA', (s, s), BG)
    draw = ImageDraw.Draw(img)

    # ── Safe zone ────────────────────────────────────────────────────────────
    # Maskable spec: contenido importante dentro del centro 80%.
    # Margen = 10% por lado → zona segura cuadrada centrada.
    margin = int(s * 0.10)
    sz     = s - 2 * margin     # ancho/alto de la safe zone

    # ── Dimensiones de las barras ────────────────────────────────────────────
    bar_w   = int(sz * 0.23)    # cada barra ocupa 23% del ancho de la safe zone
    gap     = int(sz * 0.065)   # hueco entre barras: 6.5%
    total_w = 3 * bar_w + 2 * gap

    # Centrar el grupo de barras horizontalmente dentro de la safe zone
    bars_x0 = margin + (sz - total_w) // 2

    # Base de las barras: 94% del alto de la safe zone desde arriba (6% de margen abajo)
    base_y = margin + sz - int(sz * 0.06)

    # Alturas relativas al alto de la safe zone (barras crecientes)
    heights = [
        int(sz * 0.36),   # barra izquierda  — corta
        int(sz * 0.57),   # barra central    — media
        int(sz * 0.80),   # barra derecha    — alta
    ]

    radius = int(bar_w * 0.28)  # radio de esquinas redondeadas

    for i, h in enumerate(heights):
        x0 = bars_x0 + i * (bar_w + gap)
        x1 = x0 + bar_w
        y0 = base_y - h
        y1 = base_y
        draw.rounded_rectangle([x0, y0, x1, y1], radius=radius, fill=ACCENT)

    # ── Downscale → tamaño final ─────────────────────────────────────────────
    img = img.resize((final_size, final_size), Image.LANCZOS)
    img.save(path, 'PNG', optimize=True)
    print(f'  OK  {os.path.basename(path)}  ({final_size}x{final_size})')


if __name__ == '__main__':
    print('Generando iconos Finko PWA...')
    make_icon(512, os.path.join(OUTPUT_DIR, 'icon-512.png'))
    make_icon(192, os.path.join(OUTPUT_DIR, 'icon-192.png'))
    make_icon(180, os.path.join(OUTPUT_DIR, 'apple-touch-icon.png'))
    print('Listo.')

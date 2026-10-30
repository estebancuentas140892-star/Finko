"""
gen-icons.py - Genera los íconos de producción para Finko PWA.

Íconos generados:
  assets/icons/icon-192.png          (192×192) - manifest any + maskable
  assets/icons/icon-512.png          (512×512) - manifest any + maskable
  assets/icons/apple-touch-icon.png  (180×180) - iOS Safari / homescreen
  assets/icons/favicon.svg           (vectorial) - pestaña del navegador

Diseño (ADR 103): el isotipo de assets/svg/identidad/isotipo.svg sobre el
fondo fijo de su teja (--fk-marca-fondo). El SVG es la única fuente: este
script no dibuja un logo propio, lo lee con scripts/isotipo.py.
  - Contenido dentro del safe zone 80% (cumple spec maskable).
  - El fondo llega al borde: el sistema recorta la forma del ícono.

Técnica: supersampling 4× + downscale LANCZOS para anti-aliasing de producción.
"""

import os
import re
from PIL import Image, ImageDraw

from isotipo import FONDO_MARCA, RUTA_SVG, dibujar_isotipo, hex_a_rgba

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'assets', 'icons')
os.makedirs(OUTPUT_DIR, exist_ok=True)

SCALE = 4   # Factor de supersampling. 4× → anti-aliasing premium.

# Alto del isotipo respecto del lado del ícono. 0.62 de alto da 0.53 de
# ancho: queda dentro del safe zone maskable (círculo de 0.80 de diámetro).
ALTO_ISOTIPO_PNG = 0.62
# En la pestaña no hay recorte del sistema: el isotipo puede crecer.
ALTO_ISOTIPO_FAVICON = 0.80


def make_icon(final_size: int, path: str) -> None:
    """Genera un ícono cuadrado con el isotipo centrado sobre su fondo."""
    s = final_size * SCALE      # Tamaño de trabajo (supersampled)

    img  = Image.new('RGBA', (s, s), hex_a_rgba(FONDO_MARCA))
    draw = ImageDraw.Draw(img)
    dibujar_isotipo(draw, (s / 2, s / 2), s * ALTO_ISOTIPO_PNG)

    # ── Downscale → tamaño final ─────────────────────────────────────────────
    img = img.resize((final_size, final_size), Image.LANCZOS)
    img.save(path, 'PNG', optimize=True)
    print(f'  OK  {os.path.basename(path)}  ({final_size}x{final_size})')


def make_favicon(path: str) -> None:
    """Favicon vectorial: la teja redondeada y los trazos del isotipo, tal cual."""
    with open(RUTA_SVG, encoding='utf-8') as f:
        svg = f.read()
    _, _, w, h = (float(v) for v in re.search(r'viewBox="([^"]+)"', svg).group(1).split())
    lado = round(h / ALTO_ISOTIPO_FAVICON, 1)
    x0 = round(-(lado - w) / 2, 1)
    y0 = round(-(lado - h) / 2, 1)
    trazos = [t.replace(' stroke="none"', '') for t in re.findall(r'<path [^>]*/>', svg)]
    lineas = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{x0} {y0} {lado} {lado}">',
        f'  <rect x="{x0}" y="{y0}" width="{lado}" height="{lado}" rx="{round(lado * 0.18, 1)}" fill="{FONDO_MARCA}"/>',
        *(f'  {t}' for t in trazos),
        '</svg>',
    ]
    with open(path, 'w', encoding='utf-8', newline='\n') as f:
        f.write('\n'.join(lineas) + '\n')
    print(f'  OK  {os.path.basename(path)}')


if __name__ == '__main__':
    print('Generando iconos Finko PWA...')
    make_icon(512, os.path.join(OUTPUT_DIR, 'icon-512.png'))
    make_icon(192, os.path.join(OUTPUT_DIR, 'icon-192.png'))
    make_icon(180, os.path.join(OUTPUT_DIR, 'apple-touch-icon.png'))
    make_favicon(os.path.join(OUTPUT_DIR, 'favicon.svg'))
    print('Listo.')

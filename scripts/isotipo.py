"""
isotipo.py - Lee el isotipo de Finko (assets/svg/identidad/isotipo.svg) y lo
dibuja con Pillow (ADR 103).

El SVG es la única fuente de la marca: gen-icons.py y gen-splash.py derivan de
aquí sus PNG en vez de dibujar un logo propio. Pillow no dibuja curvas, así que
cada bezier cúbica se aproxima con segmentos rectos; con el supersampling de
los scripts la diferencia no se ve.

Solo entiende lo que exporta Illustrator para formas rellenas: M, L, H, V, C,
S y Z, absolutos y relativos. Un comando distinto es un error explícito, no un
dibujo a medias.
"""

import os
import re

RUTA_SVG = os.path.join(os.path.dirname(__file__), '..', 'assets', 'svg', 'identidad', 'isotipo.svg')

# Fondo de la teja del isotipo: el mismo valor que --fk-marca-fondo (tokens.css).
FONDO_MARCA = '#fbf6ec'

_RE_VIEWBOX = re.compile(r'viewBox="([^"]+)"')
_RE_PATH = re.compile(r'<path d="([^"]+)" fill="(#[0-9a-fA-F]{6})"')
_RE_TOKEN = re.compile(r'[MmLlHhVvCcSsZz]|-?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?')
_PASOS_CURVA = 24


def hex_a_rgba(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)) + (255,)


def _bezier(p0, p1, p2, p3):
    puntos = []
    for i in range(1, _PASOS_CURVA + 1):
        t = i / _PASOS_CURVA
        u = 1 - t
        puntos.append((
            u ** 3 * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t ** 3 * p3[0],
            u ** 3 * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t ** 3 * p3[1],
        ))
    return puntos


def _poligonos(d):
    """Convierte el atributo d de un path en polígonos (uno por subtrazo)."""
    tokens = _RE_TOKEN.findall(d)
    poligonos, actual = [], []
    x = y = 0.0
    inicio = (0.0, 0.0)
    control_previo = None
    cmd = None
    i = 0

    def num():
        nonlocal i
        valor = float(tokens[i])
        i += 1
        return valor

    while i < len(tokens):
        if tokens[i].isalpha():
            cmd = tokens[i]
            i += 1
            if cmd in 'Zz':
                if actual:
                    poligonos.append(actual)
                actual = []
                x, y = inicio
                control_previo = None
                continue
        rel = cmd.islower()
        c = cmd.upper()
        if c == 'M':
            x, y = (x + num(), y + num()) if rel else (num(), num())
            if actual:
                poligonos.append(actual)
            actual = [(x, y)]
            inicio = (x, y)
            cmd = 'l' if rel else 'L'  # pares siguientes son líneas implícitas
            control_previo = None
        elif c == 'L':
            x, y = (x + num(), y + num()) if rel else (num(), num())
            actual.append((x, y))
            control_previo = None
        elif c == 'H':
            x = x + num() if rel else num()
            actual.append((x, y))
            control_previo = None
        elif c == 'V':
            y = y + num() if rel else num()
            actual.append((x, y))
            control_previo = None
        elif c in 'CS':
            if c == 'C':
                p1 = (x + num(), y + num()) if rel else (num(), num())
            else:
                p1 = (2 * x - control_previo[0], 2 * y - control_previo[1]) if control_previo else (x, y)
            p2 = (x + num(), y + num()) if rel else (num(), num())
            p3 = (x + num(), y + num()) if rel else (num(), num())
            actual.extend(_bezier((x, y), p1, p2, p3))
            control_previo = p2
            x, y = p3
        else:
            raise ValueError(f'isotipo.svg: comando de trazo no soportado "{cmd}"')
    if actual:
        poligonos.append(actual)
    return poligonos


def leer_isotipo():
    """Devuelve (ancho, alto, [(color_rgba, [poligonos])]) en unidades del viewBox."""
    with open(RUTA_SVG, encoding='utf-8') as f:
        svg = f.read()
    _, _, ancho, alto = (float(v) for v in _RE_VIEWBOX.search(svg).group(1).split())
    formas = [(hex_a_rgba(color), _poligonos(d)) for d, color in _RE_PATH.findall(svg)]
    if not formas:
        raise ValueError('isotipo.svg: no se encontró ningún <path d="..." fill="#rrggbb">')
    return ancho, alto, formas


def dibujar_isotipo(draw, centro, alto_px):
    """Dibuja el isotipo centrado en `centro` con `alto_px` de alto."""
    ancho, alto, formas = leer_isotipo()
    escala = alto_px / alto
    x0 = centro[0] - ancho * escala / 2
    y0 = centro[1] - alto_px / 2
    for color, poligonos in formas:
        for poligono in poligonos:
            draw.polygon([(x0 + px * escala, y0 + py * escala) for px, py in poligono], fill=color)

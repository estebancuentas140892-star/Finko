"""
gen-screenshots.py - Genera 2 screenshots PWA para manifest.json
  screenshot-1-dashboard.png  → Vista principal (dashboard con tarjetas)
  screenshot-2-gastos.png     → Vista de gastos con listado

Tamaño: 540x720 (ratio 3:4, resolución móvil estándar)
Tema:   oscuro (--fk-bg-app #0f1117, --fk-accent #22c55e)
"""

from PIL import Image, ImageDraw
import os

OUT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'screenshots')
W, H = 540, 720

# ── Paleta Finko ────────────────────────────────────────────────────────────
BG_APP     = '#0f1117'
BG_SURFACE = '#1a1d27'
BG_CARD    = '#1e2130'
BORDER     = '#2a2d3d'
ACCENT     = '#22c55e'
ACCENT_DIM = '#16a34a'
TEXT_PRI   = '#e2e8f0'
TEXT_SEC   = '#94a3b8'
TEXT_MUTED = '#4b5563'
WARN       = '#f59e0b'
DANGER     = '#ef4444'
BLUE       = '#3b82f6'

def hex_to_rgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))

def rgb(h):
    return hex_to_rgb(h)

def rounded_rect(draw, xy, radius, fill, outline=None, outline_width=1):
    x1, y1, x2, y2 = xy
    r = radius
    draw.rounded_rectangle([x1, y1, x2, y2], radius=r, fill=fill,
                            outline=outline, width=outline_width)

def text_center(draw, text, y, font_size, color, x1=0, x2=W, bold=False):
    from PIL import ImageFont
    try:
        if bold:
            font = ImageFont.truetype("arialbd.ttf", font_size)
        else:
            font = ImageFont.truetype("arial.ttf", font_size)
    except Exception:
        font = ImageFont.load_default()
    bbox = draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    cx = x1 + (x2 - x1 - tw) // 2
    draw.text((cx, y), text, fill=rgb(color), font=font)
    return font

def get_font(size, bold=False):
    from PIL import ImageFont
    try:
        return ImageFont.truetype("arialbd.ttf" if bold else "arial.ttf", size)
    except Exception:
        return ImageFont.load_default()

def draw_bottom_nav(draw, active_idx):
    """Dibuja la barra de navegación inferior."""
    bar_h = 64
    y0 = H - bar_h
    # Fondo
    draw.rectangle([0, y0, W, H], fill=rgb(BG_SURFACE))
    draw.line([0, y0, W, y0], fill=rgb(BORDER), width=1)

    items = [
        ('💰', 'Dashboard'),
        ('🪙', 'Ingresos'),
        ('💸', 'Gastos'),
        ('🔗', 'Compromisos'),
        ('🏦', 'Tesorería'),
    ]
    item_w = W // len(items)
    for i, (icon, label) in enumerate(items):
        cx = i * item_w + item_w // 2
        color = ACCENT if i == active_idx else TEXT_MUTED
        # Indicador activo
        if i == active_idx:
            rounded_rect(draw, [cx-24, y0+4, cx+24, y0+bar_h-4], 8, fill='#1a3a28')
        # Ícono (emoji como texto)
        f_icon = get_font(18)
        bbox = draw.textbbox((0,0), icon, font=f_icon)
        tw = bbox[2] - bbox[0]
        draw.text((cx - tw//2, y0 + 6), icon, fill=rgb(color), font=f_icon)
        # Label
        f_label = get_font(9)
        bbox2 = draw.textbbox((0,0), label, font=f_label)
        lw = bbox2[2] - bbox2[0]
        draw.text((cx - lw//2, y0 + 30), label, fill=rgb(color), font=f_label)

def draw_header(draw, title):
    """Encabezado de sección."""
    f = get_font(15, bold=True)
    draw.text((20, 20), title, fill=rgb(TEXT_PRI), font=f)

# ── SCREENSHOT 1: DASHBOARD ─────────────────────────────────────────────────
def make_dashboard():
    img = Image.new('RGB', (W, H), rgb(BG_APP))
    draw = ImageDraw.Draw(img)

    # Header
    draw.rectangle([0, 0, W, 56], fill=rgb(BG_SURFACE))
    draw.line([0, 56, W, 56], fill=rgb(BORDER), width=1)
    f_logo = get_font(20, bold=True)
    draw.text((20, 16), 'Finko', fill=rgb(ACCENT), font=f_logo)
    f_sub = get_font(10)
    draw.text((W-140, 22), 'Mayo 2026', fill=rgb(TEXT_SEC), font=f_sub)

    # Tarjeta hero: Saldo disponible
    rounded_rect(draw, [16, 72, W-16, 178], 14, fill=rgb(BG_CARD), outline=rgb(BORDER))
    f_label = get_font(11)
    draw.text((28, 86), 'Saldo disponible', fill=rgb(TEXT_SEC), font=f_label)
    f_amount = get_font(34, bold=True)
    draw.text((28, 106), '$ 2.340.000', fill=rgb(ACCENT), font=f_amount)
    f_meta = get_font(10)
    draw.text((28, 156), '↑ +12% vs mes anterior', fill=rgb(ACCENT_DIM), font=f_meta)

    # Fila de tarjetas pequeñas
    y = 192
    cards = [
        ('Ingresos', '$ 4.800.000', ACCENT),
        ('Gastos', '$ 2.460.000', DANGER),
    ]
    cw = (W - 48) // 2
    for i, (lbl, val, col) in enumerate(cards):
        x1 = 16 + i * (cw + 16)
        rounded_rect(draw, [x1, y, x1+cw, y+90], 12, fill=rgb(BG_CARD), outline=rgb(BORDER))
        draw.text((x1+12, y+12), lbl, fill=rgb(TEXT_SEC), font=get_font(11))
        draw.text((x1+12, y+36), val, fill=rgb(col), font=get_font(16, bold=True))
        draw.text((x1+12, y+66), 'este mes', fill=rgb(TEXT_MUTED), font=get_font(9))

    # Tarjeta presupuesto
    y = 300
    rounded_rect(draw, [16, y, W-16, y+110], 12, fill=rgb(BG_CARD), outline=rgb(BORDER))
    draw.text((28, y+12), 'Presupuesto del mes', fill=rgb(TEXT_SEC), font=get_font(11))
    draw.text((28, y+34), '$ 1.890.000 / $ 3.200.000', fill=rgb(TEXT_PRI), font=get_font(14, bold=True))
    # Barra de progreso
    bar_w = W - 72
    draw.rounded_rectangle([28, y+68, 28+bar_w, y+82], radius=4, fill=rgb(BG_APP))
    draw.rounded_rectangle([28, y+68, 28+int(bar_w*0.59), y+82], radius=4, fill=rgb(ACCENT))
    draw.text((28, y+88), '59% usado', fill=rgb(TEXT_SEC), font=get_font(10))

    # Tarjeta compromisos próximos
    y = 424
    rounded_rect(draw, [16, y, W-16, y+86], 12, fill=rgb(BG_CARD), outline=rgb(BORDER))
    draw.text((28, y+12), 'Próximos compromisos', fill=rgb(TEXT_SEC), font=get_font(11))
    items = [
        ('Arriendo', '22 may', '$ 1.200.000', WARN),
        ('Internet', '28 may', '$ 89.900', TEXT_MUTED),
    ]
    for j, (nom, fecha, monto, col) in enumerate(items):
        ry = y + 34 + j*22
        draw.text((28, ry), f'• {nom}', fill=rgb(TEXT_PRI), font=get_font(10))
        draw.text((190, ry), fecha, fill=rgb(col), font=get_font(10))
        draw.text((340, ry), monto, fill=rgb(TEXT_PRI), font=get_font(10))

    # Barra nav
    draw_bottom_nav(draw, 0)

    img.save(os.path.join(OUT, 'screenshot-1-dashboard.png'), 'PNG', optimize=True)
    print('OK screenshot-1-dashboard.png')

# ── SCREENSHOT 2: GASTOS ─────────────────────────────────────────────────────
def make_gastos():
    img = Image.new('RGB', (W, H), rgb(BG_APP))
    draw = ImageDraw.Draw(img)

    # Header
    draw.rectangle([0, 0, W, 56], fill=rgb(BG_SURFACE))
    draw.line([0, 56, W, 56], fill=rgb(BORDER), width=1)
    f_logo = get_font(20, bold=True)
    draw.text((20, 16), 'Gastos', fill=rgb(TEXT_PRI), font=f_logo)
    # Botón nuevo
    rounded_rect(draw, [W-110, 14, W-16, 42], 8, fill=rgb(ACCENT))
    draw.text((W-100, 20), '+ Nuevo', fill=rgb(BG_APP), font=get_font(11, bold=True))

    # Total mes
    rounded_rect(draw, [16, 68, W-16, 130], 12, fill=rgb(BG_CARD), outline=rgb(BORDER))
    draw.text((28, 80), 'Total mayo 2026', fill=rgb(TEXT_SEC), font=get_font(11))
    draw.text((28, 100), '$ 2.460.000', fill=rgb(DANGER), font=get_font(22, bold=True))

    # Lista de gastos
    gastos = [
        ('Arriendo', 'Vivienda', '01 may', '$ 1.200.000'),
        ('Mercado éxito', 'Alimentación', '05 may', '$ 320.000'),
        ('Netflix', 'Entretenimiento', '10 may', '$ 49.900'),
        ('Gasolina', 'Transporte', '12 may', '$ 185.000'),
        ('Farmacia', 'Salud', '14 may', '$ 87.500'),
        ('Restaurante', 'Alimentación', '16 may', '$ 68.000'),
        ('Gym', 'Salud', '17 may', '$ 120.000'),
    ]

    cat_colors = {
        'Vivienda': BLUE,
        'Alimentación': ACCENT,
        'Entretenimiento': '#a855f7',
        'Transporte': WARN,
        'Salud': '#06b6d4',
    }

    y = 144
    for nom, cat, fecha, monto in gastos:
        if y + 56 > H - 70:
            break
        rounded_rect(draw, [16, y, W-16, y+50], 10, fill=rgb(BG_CARD), outline=rgb(BORDER))
        # Dot categoría
        col = cat_colors.get(cat, TEXT_MUTED)
        draw.ellipse([28, y+18, 42, y+32], fill=rgb(col))
        # Texto
        draw.text((52, y+10), nom, fill=rgb(TEXT_PRI), font=get_font(12, bold=True))
        draw.text((52, y+30), cat, fill=rgb(TEXT_SEC), font=get_font(10))
        draw.text((W-130, y+10), fecha, fill=rgb(TEXT_MUTED), font=get_font(10))
        draw.text((W-130, y+28), monto, fill=rgb(TEXT_PRI), font=get_font(12, bold=True))
        y += 58

    # Barra nav
    draw_bottom_nav(draw, 2)

    img.save(os.path.join(OUT, 'screenshot-2-gastos.png'), 'PNG', optimize=True)
    print('OK screenshot-2-gastos.png')

make_dashboard()
make_gastos()
print('Done')

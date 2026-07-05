#!/usr/bin/env python3
"""
sync-sprite.py - Regenera el sprite <symbol> de index.html desde la
biblioteca assets/svg/ (ADR 026, BR.2).

assets/svg/ es la fuente de verdad de diseno; el sprite de index.html es
un artefacto derivado. El script:

  1. Recorre iconos/{secciones,simbolos,utilitarios} (prefijo i-),
     iconos/categorias (prefijo c-) y logos/** en cualquier subcarpeta
     (prefijo b-). identidad/ e ilustraciones/ son "futuro" (README
     seccion 2) y todavia no se conectan al sprite.
  2. Excluye los archivos con data-placeholder="true" (recurso aun sin
     disenar): el fallback de iniciales los cubre mientras tanto.
  3. Convierte los colores centinela de Illustrator a los 3 roles finales
     (README seccion 7) y valida el estandar tecnico (seccion 4): raiz
     limpia, solo path/circle/rect/line, sin transform/clase/estilo.
  4. Un archivo que no cumple el estandar (ej. export crudo de Illustrator
     a medio pulir) NO bloquea la corrida completa: se excluye del sprite
     como si fuera plantilla y se reporta como error de ese recurso
     puntual (README: "nada se rompe" mientras se itera en Illustrator).
     El sync SI se detiene sin escribir nada cuando eso implicaria borrar
     de forma silenciosa un simbolo que ya estaba publicado (proteccion
     de produccion): ahi hay que arreglar el archivo o retirar su fila de
     catalogo antes de seguir.
  5. Reescribe el bloque entre los marcadores de index.html preservando
     el orden historico de los ids ya publicados (reemplazar un archivo
     produce el menor diff posible) y agregando los nuevos al final.

Uso: python scripts/sync-sprite.py
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SVG_ROOT = ROOT / 'assets' / 'svg'
INDEX_HTML = ROOT / 'index.html'

MARCADOR_INICIO = (
    '<!-- INICIO bloque generado por scripts/sync-sprite.py (BR.2). '
    'No editar a mano: sobrescribir el .svg en assets/svg/ y correr el script. -->'
)
MARCADOR_FIN = '<!-- FIN bloque generado por scripts/sync-sprite.py -->'

# Carpetas de iconos/ (prefijo i- salvo categorias, que usa c-). Cualquier
# subcarpeta de logos/ usa b- sin importar el nombre (organizacion humana,
# README seccion 2).
CARPETAS_ICONOS = {
    'secciones': 'i-',
    'simbolos': 'i-',
    'utilitarios': 'i-',
    'categorias': 'c-',
}

# Un recurso puede cambiar de nombre de archivo sin perder su lugar en el
# sprite (BR.2 normaliza gemini.svg, antes googlegemini.svg). Este mapa
# {id nuevo: id anterior} solo sirve para PRESERVAR POSICION en la corrida
# que sigue al rename; el id que se escribe siempre sale del archivo actual.
ID_ANTERIOR = {
    'b-gemini': 'b-googlegemini',
}

ETIQUETAS_PROHIBIDAS = {
    'g', 'defs', 'clippath', 'mask', 'filter', 'text', 'image', 'style',
    'lineargradient', 'radialgradient', 'symbol', 'use', 'title', 'desc',
    'foreignobject',
}
PRIMITIVAS_PERMITIDAS = {'path', 'circle', 'rect', 'line'}
# Un logo a color (data-fullcolor) puede traer degradados: se permite el set
# ampliado, pero se sigue bloqueando lo peligroso o no reproducible por <use>
# (script, foreignObject, image, text, filtros, mascaras).
ETIQUETAS_FULLCOLOR = {
    'path', 'circle', 'rect', 'line', 'polygon', 'polyline', 'ellipse',
    'g', 'defs', 'lineargradient', 'radialgradient', 'stop',
}
ATRIBUTOS_PROHIBIDOS_RAIZ = {'width', 'height', 'id', 'class', 'style'}

RE_TAG = re.compile(r'<([a-zA-Z][\w-]*)')
RE_ATTR = re.compile(r'([a-zA-Z_:][\w:.-]*)\s*=\s*"([^"]*)"')
RE_ROOT = re.compile(r'^<svg\b([^>]*)>([\s\S]*)</svg>$')
RE_DECIMALES_LARGOS = re.compile(r'\d+\.\d{3,}')


class ErrorProduccion(Exception):
    """Borraria un simbolo ya publicado: el sync se detiene sin escribir nada."""


class ErrorRecurso(Exception):
    """Un archivo puntual no cumple el estandar: se excluye del sprite, no aborta la corrida."""


def prefijo_de(ruta_relativa: Path):
    partes = ruta_relativa.parts
    if partes[0] == 'logos':
        return 'b-'
    if partes[0] == 'iconos' and len(partes) >= 2 and partes[1] in CARPETAS_ICONOS:
        return CARPETAS_ICONOS[partes[1]]
    return None  # identidad/, ilustraciones/: fuera del alcance del sync


def es_plantilla(contenido: str) -> bool:
    primer_tag = contenido.split('>', 1)[0]
    return 'data-placeholder="true"' in primer_tag


def descubrir_archivos():
    """Devuelve (candidatos, colisiones, n_plantillas).

    candidatos = {id: (ruta, contenido_crudo)} para ids sin colision.
    colisiones = {id: [rutas]} para ids con mas de un archivo fuente.
    """
    por_id = {}
    n_plantillas = 0
    for ruta in sorted(SVG_ROOT.rglob('*.svg')):
        rel = ruta.relative_to(SVG_ROOT)
        prefijo = prefijo_de(rel)
        if prefijo is None:
            continue
        contenido = ruta.read_text(encoding='utf-8').strip()
        if es_plantilla(contenido):
            n_plantillas += 1
            continue
        id_symbol = prefijo + ruta.stem
        por_id.setdefault(id_symbol, []).append((rel, contenido))

    candidatos = {}
    colisiones = {}
    for id_symbol, entradas in por_id.items():
        if len(entradas) > 1:
            colisiones[id_symbol] = [rel for rel, _ in entradas]
        else:
            candidatos[id_symbol] = entradas[0]
    return candidatos, colisiones, n_plantillas


def _convertir_centinela(id_symbol: str, cuerpo: str, es_logo: bool) -> str:
    if es_logo:
        # Silueta monocroma: cualquier fill autoral (menos none/currentColor)
        # pasa a currentColor; el color real vive en el catalogo (MARCAS /
        # BANCOS_CO), nunca en el archivo.
        def _fill_a_currentcolor(m):
            valor = m.group(1)
            if valor.lower() in ('none', 'currentcolor'):
                return m.group(0)
            return 'fill="currentColor"'

        cuerpo = re.sub(r'fill="([^"]*)"', _fill_a_currentcolor, cuerpo)
        return cuerpo

    # Iconos: los 3 roles centinela de la seccion 7 del README.
    # Trazo: negro sentinela -> elemento desnudo, sin atributos de color
    # (grosor y color los pone la clase CSS .icon).
    cuerpo = re.sub(
        r'\s*fill="none"\s*stroke="#000000"(\s*stroke-width="[^"]*")?',
        '', cuerpo, flags=re.IGNORECASE,
    )
    cuerpo = re.sub(
        r'\s*stroke="#000000"(\s*stroke-width="[^"]*")?',
        '', cuerpo, flags=re.IGNORECASE,
    )
    # Cuerpo duotono: cian sentinela -> currentColor al 22%.
    cuerpo = re.sub(r'fill="#00FFFF"', 'fill="currentColor" fill-opacity=".22"', cuerpo, flags=re.IGNORECASE)
    # Chispa: magenta sentinela -> variable de acento encendible por contexto.
    cuerpo = re.sub(r'fill="#FF00FF"', 'fill="var(--fk-icon-dot, currentColor)"', cuerpo, flags=re.IGNORECASE)
    return cuerpo


def _validar_fullcolor(id_symbol: str, cuerpo: str, advertencias: list) -> str:
    """Valida un logo a color (data-fullcolor) sin convertir sus colores.

    Permite degradados (defs/linearGradient/stop) ademas de las primitivas, y
    conserva el cuerpo tal cual para que la biblioteca y el sprite queden
    identicos byte a byte (el guardarrail vigila esa igualdad).
    """
    for etiqueta in RE_TAG.findall(cuerpo):
        nombre = etiqueta.lower()
        if nombre not in ETIQUETAS_FULLCOLOR:
            raise ErrorRecurso(
                f'{id_symbol}: elemento <{etiqueta}> no permitido ni en logo a color '
                f'(peligroso o no reproducible por <use>)'
            )
    if 'transform=' in cuerpo:
        raise ErrorRecurso(f'{id_symbol}: transform no permitido (coordenadas deben venir "horneadas")')
    if re.search(r'\bclass\s*=', cuerpo) or re.search(r'\bstyle\s*=', cuerpo):
        raise ErrorRecurso(f'{id_symbol}: class/style no permitidos (usar atributos de presentacion, ej. stop-color)')
    if RE_DECIMALES_LARGOS.search(cuerpo):
        advertencias.append(f'{id_symbol}: coordenadas con mas de 2 decimales')
    return cuerpo


def validar_y_convertir(id_symbol: str, contenido: str, advertencias: list) -> str:
    m = RE_ROOT.match(contenido)
    if not m:
        raise ErrorRecurso(f'{id_symbol}: no tiene la forma <svg ...>...</svg> esperada (revisar export)')
    attrs_raiz, cuerpo = m.groups()
    atributos = dict(RE_ATTR.findall(attrs_raiz))

    if atributos.get('viewBox') != '0 0 24 24':
        raise ErrorRecurso(f'{id_symbol}: viewBox debe ser "0 0 24 24"')
    prohibidos = ATRIBUTOS_PROHIBIDOS_RAIZ & atributos.keys()
    if prohibidos:
        raise ErrorRecurso(f'{id_symbol}: atributo(s) prohibido(s) en la raiz: {", ".join(sorted(prohibidos))}')
    if '<!--' in cuerpo:
        raise ErrorRecurso(f'{id_symbol}: comentarios solo se permiten en plantillas (data-placeholder)')

    # Logo de marca a color (data-fullcolor="true"): excepcion deliberada a la
    # silueta monocroma de ADR 025 para marcas cuya identidad ES el color
    # (ej. Bancolombia: bandera roja/amarilla/azul sobre blanco; Banco de
    # Bogota: remolino con degradados sobre azul). El archivo es autonomo: trae
    # sus propios fills, su fondo y sus <defs>/degradados, y su teja de catalogo
    # se pinta del color de ese fondo. El sync lo conserva tal cual, sin
    # convertir colores; valida forma con el set ampliado (permite degradados)
    # y verifica que los IDs de gradiente sean unicos en todo el sprite.
    if atributos.get('data-fullcolor') == 'true':
        return _validar_fullcolor(id_symbol, cuerpo, advertencias)

    for etiqueta in RE_TAG.findall(cuerpo):
        nombre = etiqueta.lower()
        if nombre in ETIQUETAS_PROHIBIDAS:
            raise ErrorRecurso(f'{id_symbol}: elemento prohibido <{etiqueta}>')
        if nombre not in PRIMITIVAS_PERMITIDAS:
            raise ErrorRecurso(f'{id_symbol}: elemento no permitido <{etiqueta}> (solo path/circle/rect/line)')

    if 'transform=' in cuerpo:
        raise ErrorRecurso(f'{id_symbol}: transform no permitido (coordenadas deben venir "horneadas")')
    if re.search(r'\bclass\s*=', cuerpo) or re.search(r'\bstyle\s*=', cuerpo):
        raise ErrorRecurso(f'{id_symbol}: class/style no permitidos (solo atributos de presentacion)')

    es_logo = id_symbol.startswith('b-')
    cuerpo = _convertir_centinela(id_symbol, cuerpo, es_logo)

    if es_logo:
        colores = {v.lower() for v in re.findall(r'fill="([^"]*)"', cuerpo)} - {'currentcolor', 'none'}
        if colores:
            raise ErrorRecurso(
                f'{id_symbol}: color(es) propio(s) en el archivo ({", ".join(sorted(colores))}); '
                f'los logos son silueta monocroma (fill="currentColor"), el color vive en el catalogo'
            )
    else:
        n_elementos = len(RE_TAG.findall(cuerpo))
        if n_elementos > 6:
            advertencias.append(f'{id_symbol}: {n_elementos} elementos (guia: maximo ~6)')
        peso = len(cuerpo.encode('utf-8'))
        if peso > 1024:
            advertencias.append(f'{id_symbol}: {peso} bytes (guia: ~1 KB)')
    if RE_DECIMALES_LARGOS.search(cuerpo):
        advertencias.append(f'{id_symbol}: coordenadas con mas de 2 decimales')

    return cuerpo


def orden_actual_del_sprite() -> list:
    html = INDEX_HTML.read_text(encoding='utf-8')
    inicio = html.index(MARCADOR_INICIO)
    fin = html.index(MARCADOR_FIN)
    return re.findall(r'<symbol id="([\w-]+)"', html[inicio:fin])


def orden_final(ids_actuales: set, orden_previo: list) -> list:
    """Preserva el orden historico; aborta si un id publicado desaparece."""
    orden = []
    vistos = set()
    id_actual_por_anterior = {v: k for k, v in ID_ANTERIOR.items()}

    for id_previo in orden_previo:
        id_actual = id_actual_por_anterior.get(id_previo, id_previo)
        if id_actual in vistos:
            continue
        if id_actual not in ids_actuales:
            raise ErrorProduccion(
                f'"{id_previo}" esta publicado en el sprite pero ya no hay un archivo valido que '
                f'lo genere: se perderia silenciosamente. Arregla el archivo en assets/svg/ o, si el '
                f'recurso se retiro a proposito, borra su fila de catalogo primero.'
            )
        orden.append(id_actual)
        vistos.add(id_actual)

    orden.extend(sorted(id_ for id_ in ids_actuales if id_ not in vistos))
    return orden


def main():
    if not SVG_ROOT.is_dir():
        print(f'No existe {SVG_ROOT}', file=sys.stderr)
        return 1

    orden_previo = orden_actual_del_sprite()
    candidatos, colisiones, n_plantillas = descubrir_archivos()

    errores = []
    advertencias = []
    cuerpos = {}
    for id_symbol, (rel, contenido) in sorted(candidatos.items()):
        try:
            cuerpos[id_symbol] = validar_y_convertir(id_symbol, contenido, advertencias)
        except ErrorRecurso as e:
            errores.append(f'{rel}: {e}')

    for id_symbol, rutas in sorted(colisiones.items()):
        errores.append(f'"{id_symbol}": colision de id entre {" vs ".join(str(r) for r in rutas)}')

    # Los logos a color con degradados traen sus <defs id="..."> dentro del
    # symbol. Como el sprite es un unico documento, esos IDs deben ser unicos en
    # todo el sprite (dos logos con el mismo id de gradiente se pisarian). Se
    # exige el prefijo del propio id de symbol como espacio de nombres.
    ids_internos = {}
    for id_symbol, cuerpo in cuerpos.items():
        for interno in re.findall(r'\bid="([^"]+)"', cuerpo):
            ids_internos.setdefault(interno, []).append(id_symbol)
    for interno, duenos in sorted(ids_internos.items()):
        if len(duenos) > 1:
            errores.append(
                f'id interno "{interno}" repetido en {", ".join(sorted(duenos))}: '
                f'prefija cada uno con el slug de su symbol para evitar colisiones en el sprite'
            )

    try:
        orden = orden_final(set(cuerpos), orden_previo)
    except ErrorProduccion as e:
        print(f'ERROR: {e}', file=sys.stderr)
        return 1

    bloque_nuevo = '\n'.join(
        f'    <symbol id="{id_}" viewBox="0 0 24 24">{cuerpos[id_]}</symbol>'
        for id_ in orden
    )

    html = INDEX_HTML.read_text(encoding='utf-8')
    inicio = html.index(MARCADOR_INICIO) + len(MARCADOR_INICIO)
    fin = html.index(MARCADOR_FIN)
    nuevo_html = (
        html[:inicio] + '\n'
        + bloque_nuevo + '\n'
        + '    ' + html[fin:]
    )

    cambio = nuevo_html != html
    if cambio:
        INDEX_HTML.write_text(nuevo_html, encoding='utf-8', newline='\n')

    print(f'Simbolos publicados: {len(orden)}')
    print(f'Plantillas excluidas: {n_plantillas}')
    print('index.html actualizado.' if cambio else 'index.html ya estaba sincronizado (sin cambios).')
    if errores:
        print(f'\nRecursos excluidos por error ({len(errores)}):')
        for e in errores:
            print(f'  - {e}')
    if advertencias:
        print(f'\nAdvertencias ({len(advertencias)}):')
        for a in advertencias:
            print(f'  - {a}')

    return 0


if __name__ == '__main__':
    sys.exit(main())

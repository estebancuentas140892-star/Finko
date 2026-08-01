import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { MARCAS, BANCOS_CO } from '../../modules/core/constants.js';

/**
 * BR.2 (ADR 026): guardarraíl hermano de TX.4. TX.4 vigila catálogo ↔
 * catálogo y catálogo ↔ sprite para las categorías; este test cierra el
 * triángulo biblioteca (assets/svg/) ↔ sprite (index.html) ↔ catálogos
 * de marca (MARCAS, BANCOS_CO). Falla si scripts/sync-sprite.py no se
 * corrió después de tocar un archivo, si un id quedó huérfano en el
 * sprite, o si un catálogo apunta a un símbolo que no existe en ninguno
 * de los dos lados.
 */

const ROOT = process.cwd();
const SVG_ROOT = resolve(ROOT, 'assets/svg');
const INDEX_HTML = readFileSync(resolve(ROOT, 'index.html'), 'utf8');

// Misma tabla carpeta -> prefijo que scripts/sync-sprite.py.
const PREFIJO_ICONOS = {
  secciones: 'i-',
  simbolos: 'i-',
  utilitarios: 'i-',
  categorias: 'c-',
};

function listarSvgRecursivo(dir, base = dir) {
  const resultado = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const ruta = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      resultado.push(...listarSvgRecursivo(ruta, base));
    } else if (entry.isFile() && entry.name.endsWith('.svg')) {
      resultado.push(relative(base, ruta).split('\\').join('/'));
    }
  }
  return resultado;
}

function prefijoDe(rutaRelativa) {
  const partes = rutaRelativa.split('/');
  if (partes[0] === 'logos') return 'b-';
  if (partes[0] === 'decoracion') return 'd-';
  if (partes[0] === 'iconos' && PREFIJO_ICONOS[partes[1]]) return PREFIJO_ICONOS[partes[1]];
  return null; // identidad/, ilustraciones/: fuera del alcance del sync (README seccion 2)
}

function esPlantilla(contenido) {
  return contenido.split('>', 1)[0].includes('data-placeholder="true"');
}

function cuerpoDe(contenido) {
  const m = contenido.trim().match(/^<svg\b[^>]*>([\s\S]*)<\/svg>$/);
  return m ? m[1] : null;
}

function symbolBody(id) {
  const m = INDEX_HTML.match(new RegExp(`<symbol id="${id}"[^>]*>([\\s\\S]*?)</symbol>`));
  return m ? m[1] : null;
}

const archivos = listarSvgRecursivo(SVG_ROOT)
  .map((rel) => ({ rel, prefijo: prefijoDe(rel) }))
  .filter(({ prefijo }) => prefijo !== null)
  .map(({ rel, prefijo }) => {
    const contenido = readFileSync(resolve(SVG_ROOT, rel), 'utf8');
    const stem = rel.split('/').pop().replace(/\.svg$/, '');
    return { rel, id: prefijo + stem, contenido, plantilla: esPlantilla(contenido) };
  });

const publicados = archivos.filter((a) => !a.plantilla);

describe('BR.2 - Sincronía biblioteca (assets/svg/) <-> sprite (index.html)', () => {
  it('hay recursos publicados para comparar (smoke del propio guardarraíl)', () => {
    expect(publicados.length).toBeGreaterThan(0);
  });

  it('ningún archivo publicado colisiona de id con otro', () => {
    const porId = {};
    for (const a of publicados) (porId[a.id] ??= []).push(a.rel);
    const colisiones = Object.entries(porId).filter(([, rutas]) => rutas.length > 1);
    expect(colisiones, JSON.stringify(colisiones)).toHaveLength(0);
  });

  it('ninguna plantilla (data-placeholder) llega al sprite', () => {
    for (const { id, rel } of archivos.filter((a) => a.plantilla)) {
      expect(symbolBody(id), `${rel}: es plantilla pero "${id}" está en el sprite`).toBeNull();
    }
  });

  // Nota: no todo archivo no-plantilla esta necesariamente publicado. Un
  // archivo puede estar a medio pulir (export crudo de Illustrator sin
  // pasar el estandar todavia) y el sync lo excluye sin bloquear el resto
  // (ver scripts/sync-sprite.py, ErrorRecurso). Por eso la comparacion va
  // en la direccion sprite -> archivo, nunca archivo -> sprite.
  it('todo <symbol> del sprite tiene su archivo fuente en la biblioteca y coincide (sin huérfanos ni drift)', () => {
    const porId = new Map(publicados.map((a) => [a.id, a]));
    const idsSprite = [...INDEX_HTML.matchAll(/<symbol id="([\w-]+)"/g)].map((m) => m[1]);
    for (const id of idsSprite) {
      const archivo = porId.get(id);
      expect(archivo, `"${id}" está en el sprite pero ningún archivo de assets/svg/ lo genera`).toBeDefined();
      const cuerpoArchivo = cuerpoDe(archivo.contenido);
      expect(cuerpoArchivo, `${archivo.rel}: no tiene la forma <svg ...>...</svg> esperada`).not.toBeNull();
      expect(symbolBody(id), `${archivo.rel}: el sprite no coincide con la biblioteca para "${id}"`).toBe(cuerpoArchivo);
    }
  });

  it('todo campo `simbolo` de MARCAS/BANCOS_CO existe como <symbol> en el sprite', () => {
    const idsSprite = new Set([...INDEX_HTML.matchAll(/<symbol id="([\w-]+)"/g)].map((m) => m[1]));
    for (const { id, simbolo } of [...MARCAS, ...BANCOS_CO]) {
      if (!simbolo) continue;
      expect(idsSprite.has(simbolo), `"${id}": simbolo "${simbolo}" no está en el sprite`).toBe(true);
    }
  });

  it('todo campo `simbolo` de MARCAS/BANCOS_CO tiene su archivo fuente en assets/svg/', () => {
    const idsPublicados = new Set(publicados.map((a) => a.id));
    for (const { id, simbolo } of [...MARCAS, ...BANCOS_CO]) {
      if (!simbolo) continue;
      expect(idsPublicados.has(simbolo), `"${id}": simbolo "${simbolo}" no tiene archivo en assets/svg/`).toBe(true);
    }
  });

  // La clase CSS .icon pone fill:none / stroke:currentColor en el <svg>
  // anfitrión y esas propiedades SE HEREDAN hacia adentro del <use>: un
  // elemento pintable sin stroke propio recibe un contorno del color `texto`
  // de la teja (el contorno blanco de Banco de Bogotá y el morado que se
  // comía el acento rosa de Nequi, 2026-07-05), y uno sin fill desaparece.
  // El atributo de presentación en el elemento gana a la herencia; por eso
  // todo logo a color debe declarar ambos en cada elemento pintable.
  it('todo elemento pintable de un logo a color (data-fullcolor) declara fill y stroke explícitos', () => {
    const fullcolor = publicados.filter((a) =>
      a.contenido.split('>', 1)[0].includes('data-fullcolor="true"'));
    expect(fullcolor.length).toBeGreaterThan(0);
    for (const { rel, contenido } of fullcolor) {
      const cuerpo = cuerpoDe(contenido);
      for (const m of cuerpo.matchAll(/<(path|circle|rect|line|polygon|polyline|ellipse)\b([^>]*)>/gi)) {
        const [, etiqueta, attrs] = m;
        expect(/\bfill\s*=/.test(attrs), `${rel}: <${etiqueta}> sin fill explícito`).toBe(true);
        expect(/\bstroke\s*=/.test(attrs), `${rel}: <${etiqueta}> sin stroke explícito (heredaría el contorno de .icon)`).toBe(true);
      }
    }
  });
});

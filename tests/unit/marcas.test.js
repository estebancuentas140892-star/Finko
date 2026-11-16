import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { normalizarAlias, resolverMarca, tejaMarca, marcasDeCategoriaAgenda, marcaPorId, marcaEnCategoriaAgenda } from '../../modules/infra/marcas.js';
import { MARCAS, BANCOS_CO } from '../../modules/core/constants.js';

/**
 * MK.2 (ADR 025 D4): resolución de marca por nombre libre. resolverMarca()
 * compara aliases normalizados por palabra o frase completa contra el texto
 * del usuario, buscando primero en MARCAS y después en bancos y billeteras
 * de BANCOS_CO. tejaMarca() es el render único de la teja (D1).
 */

describe('normalizarAlias', () => {
  it('pasa a minúsculas y quita tildes y diacríticos', () => {
    expect(normalizarAlias('Telefonía Móvil')).toBe('telefonia movil');
    expect(normalizarAlias('EDUCACIÓN')).toBe('educacion');
  });

  it('colapsa signos y símbolos a un espacio', () => {
    expect(normalizarAlias('Disney+ Premium')).toBe('disney premium');
    expect(normalizarAlias('  Netflix - plan (familiar) ')).toBe('netflix plan familiar');
  });

  it('con entrada vacía o nula devuelve cadena vacía', () => {
    expect(normalizarAlias('')).toBe('');
    expect(normalizarAlias(null)).toBe('');
    expect(normalizarAlias(undefined)).toBe('');
  });
});

describe('resolverMarca - marcas globales', () => {
  it('resuelve el nombre exacto de la marca', () => {
    expect(resolverMarca('Netflix')?.id).toBe('netflix');
    expect(resolverMarca('Spotify')?.id).toBe('spotify');
  });

  it('resuelve la marca dentro de una frase ("Netflix Premium")', () => {
    expect(resolverMarca('Netflix Premium')?.id).toBe('netflix');
    expect(resolverMarca('Plan familiar de Spotify')?.id).toBe('spotify');
  });

  it('normaliza mayúsculas y signos antes de comparar', () => {
    expect(resolverMarca('NETFLIX')?.id).toBe('netflix');
    expect(resolverMarca('Disney+')?.id).toBe('disneyplus');
    expect(resolverMarca('disney plus')?.id).toBe('disneyplus');
  });

  it('matchea aliases de frase completa ("Mercado Pago", "mercadopago")', () => {
    expect(resolverMarca('Cuota Mercado Pago')?.id).toBe('mercadopago');
    expect(resolverMarca('mercadopago')?.id).toBe('mercadopago');
  });

  it('el orden del catálogo decide: "Google Gemini" es Gemini, "Google One" es Google', () => {
    expect(resolverMarca('Google Gemini')?.id).toBe('gemini');
    expect(resolverMarca('Google One')?.id).toBe('google');
  });

  it('match por palabra completa, nunca substring ("clarooscuro" no es Claro)', () => {
    expect(resolverMarca('clarooscuro')).toBeNull();
    expect(resolverMarca('reclamo del servicio')).toBeNull();
    expect(resolverMarca('Claro hogar')?.id).toBe('claro');
  });

  it('sin match devuelve null (fallback a la teja de categoría)', () => {
    expect(resolverMarca('Arriendo')).toBeNull();
    expect(resolverMarca('Tarjeta Visa')).toBeNull();
  });

  it('con entrada vacía o nula devuelve null', () => {
    expect(resolverMarca('')).toBeNull();
    expect(resolverMarca('   ')).toBeNull();
    expect(resolverMarca(null)).toBeNull();
    expect(resolverMarca(undefined)).toBeNull();
  });
});

describe('resolverMarca - bancos y billeteras (BANCOS_CO)', () => {
  it('una deuda que nombra un banco hereda su identidad', () => {
    const m = resolverMarca('Tarjeta Bancolombia');
    expect(m?.id).toBe('Bancolombia');
    expect(m?.iniciales).toBe('BC');
  });

  it('una deuda que nombra una billetera con glifo trae su simbolo', () => {
    expect(resolverMarca('Crédito Nequi')?.simbolo).toBe('b-nequi');
  });

  it('respeta los aliases cortos del catálogo de bancos', () => {
    expect(resolverMarca('Tarjeta BBVA')?.id).toBe('BBVA Colombia');
    expect(resolverMarca('Crédito Colpatria')?.id).toBe('Scotiabank Colpatria');
    expect(resolverMarca('Tarjeta Nu')?.id).toBe('Nubank');
  });

  it('las tildes del nombre del banco no impiden el match', () => {
    expect(resolverMarca('Cuota Banco de Bogotá')?.id).toBe('Banco de Bogotá');
    expect(resolverMarca('cuota banco de bogota')?.id).toBe('Banco de Bogotá');
  });

  it('Efectivo y Otro nunca matchean ("otro" es palabra común)', () => {
    expect(resolverMarca('Otro gasto')).toBeNull();
    expect(resolverMarca('Pago en efectivo')).toBeNull();
  });
});

describe('MARCAS - integridad del catálogo', () => {
  it('color y texto son hex válidos en toda entrada', () => {
    for (const m of MARCAS) {
      expect(m.color, `${m.id}: color`).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(m.texto, `${m.id}: texto`).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });

  it('toda entrada tiene iniciales de fallback (ADR 025 D2)', () => {
    for (const m of MARCAS) {
      expect(typeof m.iniciales, `${m.id}: iniciales`).toBe('string');
      expect(m.iniciales.length, `${m.id}: iniciales no vacias`).toBeGreaterThan(0);
    }
  });

  it('todo alias viene ya normalizado (minúsculas, sin tildes, sin signos)', () => {
    for (const m of MARCAS) {
      expect(Array.isArray(m.aliases) && m.aliases.length > 0, `${m.id}: aliases`).toBe(true);
      for (const alias of m.aliases) {
        expect(alias, `${m.id}: alias "${alias}" sin normalizar`).toBe(normalizarAlias(alias));
      }
    }
  });

  it('ningún alias se repite entre marcas ni choca con un banco', () => {
    const vistos = new Map();
    const registrar = (alias, dueno) => {
      expect(vistos.has(alias), `alias "${alias}" repetido: ${vistos.get(alias)} y ${dueno}`).toBe(false);
      vistos.set(alias, dueno);
    };
    for (const m of MARCAS) {
      for (const alias of m.aliases) registrar(alias, m.id);
    }
    for (const b of BANCOS_CO) {
      if (b.clase !== 'banco' && b.clase !== 'billetera') continue;
      registrar(normalizarAlias(b.id), b.id);
      for (const alias of b.aliases ?? []) registrar(alias, b.id);
    }
  });

  it('todo simbolo declarado existe como <symbol> b-* en el sprite de index.html', () => {
    const indexHtml = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');
    for (const m of MARCAS) {
      if ('simbolo' in m) {
        expect(m.simbolo, `${m.id}: prefijo b-`).toMatch(/^b-[a-z0-9-]+$/);
        expect(indexHtml, `${m.id}: falta <symbol id="${m.simbolo}"> en el sprite`)
          .toContain(`<symbol id="${m.simbolo}"`);
      }
    }
  });
});

describe('tejaMarca - render de la teja (ADR 025 D1)', () => {
  it('marca con simbolo renderiza el glifo del sprite', () => {
    const html = tejaMarca(MARCAS.find(m => m.id === 'netflix'));
    expect(html).toContain('<use href="#b-netflix"/>');
    expect(html).toContain('bank-avatar__glifo');
    expect(html).toContain('background:#E50914');
  });

  it('marca sin simbolo cae a las iniciales', () => {
    // Entrada sintética: el catálogo se va llenando de glifos y una marca
    // real sin símbolo deja de existir en cuanto llega su vector.
    const html = tejaMarca({ color: '#123456', texto: '#ffffff', iniciales: 'ZZ' });
    expect(html).toContain('ZZ');
    expect(html).toContain('background:#123456');
    expect(html).not.toContain('<use');
  });

  it('entrada null devuelve la teja genérica con "?" y gris', () => {
    const html = tejaMarca(null);
    expect(html).toContain('?');
    expect(html).toContain('background:#6B7280');
  });

  it('la teja se marca como decorativa (aria-hidden)', () => {
    expect(tejaMarca(MARCAS[0])).toContain('aria-hidden="true"');
  });
});

// ── SUS.1a (ADR 146 D3 y D4): el catálogo por categoría de gasto fijo ──

describe('MARCAS - tags y nombres (SUS.1a)', () => {
  const TAGS = new Set(['streaming', 'musica', 'ia', 'nube', 'telefonia', 'pagos', 'transporte', 'domicilios', 'gaming', 'educacion']);

  it('toda marca declara sus tags, todos conocidos', () => {
    for (const m of MARCAS) {
      expect(Array.isArray(m.categorias), `${m.id}: categorias`).toBe(true);
      for (const t of m.categorias) expect(TAGS.has(t), `${m.id}: tag "${t}"`).toBe(true);
    }
  });

  it('el nombre de cada marca resuelve a esa misma marca (el fijo con plataforma se llama así)', () => {
    for (const m of MARCAS) {
      expect(resolverMarca(m.nombre)?.id, `${m.nombre}`).toBe(m.id);
    }
  });

  it('los ids no se repiten', () => {
    const ids = MARCAS.map(m => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('el nombre compuesto gana a la genérica que contiene', () => {
    expect(resolverMarca('YouTube Music Premium')?.id).toBe('youtubemusic');
    expect(resolverMarca('YouTube Premium')?.id).toBe('youtube');
    expect(resolverMarca('Apple TV+')?.id).toBe('appletv');
    expect(resolverMarca('Apple Music familiar')?.id).toBe('applemusic');
    expect(resolverMarca('Apple One')?.id).toBe('apple');
    expect(resolverMarca('Amazon Music Unlimited')?.id).toBe('amazonmusic');
    expect(resolverMarca('Amazon Prime')?.id).toBe('primevideo');
  });

  it('los vectores de Esteban (BR.6 y BR.6b) traen glifo y la teja usa el fondo del archivo', () => {
    // El `color` de la teja es el fondo del propio SVG (README de assets/svg
    // 6b): si divergen, se ve un marco de otro color alrededor del logo.
    // Apple Music es silueta monocroma: su `color` es el de la teja.
    const esperado = {
      chatgpt: '#ffffff', claro: '#cc2229', disneyplus: '#000000', primevideo: '#0c7aff',
      rappi: '#f04e46', tigo: '#27348b', xbox: '#0f7c10',
      applemusic: '#fa243c', appletv: '#ffffff', deezer: '#ffffff', paramountplus: '#0064ff',
      spotify: '#1ed760',
    };
    for (const [id, fondo] of Object.entries(esperado)) {
      const m = MARCAS.find(x => x.id === id);
      expect(m.simbolo, id).toBe(`b-${id}`);
      expect(m.color.toLowerCase(), id).toBe(fondo);
      expect(tejaMarca(m)).toContain(`<use href="#b-${id}"/>`);
    }
  });

  it('las plataformas que esperan su vector siguen con iniciales', () => {
    for (const id of ['youtubemusic', 'amazonmusic']) {
      const m = MARCAS.find(x => x.id === id);
      expect(m, id).toBeDefined();
      expect(m.simbolo, id).toBeUndefined();
      expect(tejaMarca(m)).toContain(`>${m.iniciales}</span>`);
    }
  });
});

describe('marcasDeCategoriaAgenda / marcaPorId / marcaEnCategoriaAgenda (SUS.1a)', () => {
  it('Streaming ofrece primero el video y después la música, sin repetir', () => {
    const ids = marcasDeCategoriaAgenda('Streaming').map(m => m.id);
    expect(ids.slice(0, 4)).toEqual(['netflix', 'primevideo', 'disneyplus', 'hbomax']);
    expect(ids).toContain('spotify');
    expect(ids.indexOf('spotify')).toBeGreaterThan(ids.indexOf('crunchyroll'));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('Suscripciones ofrece IA, nube, juegos, educación y domicilios', () => {
    const ids = marcasDeCategoriaAgenda('Suscripciones').map(m => m.id);
    for (const id of ['claude', 'chatgpt', 'icloud', 'playstation', 'duolingo', 'rappi']) expect(ids).toContain(id);
    expect(ids).not.toContain('netflix');
  });

  it('Telefonía e Internet ofrecen los operadores', () => {
    expect(marcasDeCategoriaAgenda('Telefonía').map(m => m.id)).toEqual(['claro', 'movistar', 'tigo']);
    expect(marcasDeCategoriaAgenda('Internet').map(m => m.id)).toEqual(['claro', 'movistar', 'tigo']);
  });

  it('una categoría sin tags no ofrece nada', () => {
    expect(marcasDeCategoriaAgenda('Arriendo')).toEqual([]);
    expect(marcasDeCategoriaAgenda('')).toEqual([]);
    expect(marcasDeCategoriaAgenda(undefined)).toEqual([]);
  });

  it('marcaPorId devuelve la fila o null', () => {
    expect(marcaPorId('netflix')?.nombre).toBe('Netflix');
    expect(marcaPorId('no-existe')).toBeNull();
    expect(marcaPorId(null)).toBeNull();
  });

  it('marcaEnCategoriaAgenda solo acepta marcas de esa categoría', () => {
    expect(marcaEnCategoriaAgenda('netflix', 'Streaming')).toBe(true);
    expect(marcaEnCategoriaAgenda('spotify', 'Streaming')).toBe(true);
    expect(marcaEnCategoriaAgenda('netflix', 'Telefonía')).toBe(false);
    expect(marcaEnCategoriaAgenda('claro', 'Streaming')).toBe(false);
    expect(marcaEnCategoriaAgenda('', 'Streaming')).toBe(false);
    expect(marcaEnCategoriaAgenda(null, 'Streaming')).toBe(false);
  });
});

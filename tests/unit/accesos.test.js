/**
 * accesos.test.js - accesos rápidos personalizables de Inicio (IN.4a, ADR 028 D2).
 *
 * Cubre:
 * - Lógica pura: accesosVisibles() (resolución contra el catálogo, orden,
 *   ids desconocidos) y alternarAcceso() (agregar/quitar, inmutable).
 * - renderAccesosInicio(): tiles, hrefs, botón "Personalizar" siempre visible.
 * - renderModalPersonalizarAccesos(): lista completa, estado activo/inactivo.
 * - Toggle end-to-end vía dispatch(): agrega/quita y persiste en S.config.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { accesosVisibles, alternarAcceso } from '../../modules/dominio/accesos/logic.js';
import { renderAccesosInicio, renderModalPersonalizarAccesos } from '../../modules/dominio/accesos/view.js';
import { initAccesos } from '../../modules/dominio/accesos/index.js';
import { dispatch } from '../../modules/ui/actions.js';
import { ACCESOS_INICIO } from '../../modules/core/constants.js';
import { S } from '../../modules/core/state.js';

// ── accesosVisibles() ──────────────────────────────────────────────

describe('accesosVisibles()', () => {
  it('resuelve los ids contra el catálogo en el orden guardado', () => {
    const r = accesosVisibles(['analisis', 'tesoreria'], ACCESOS_INICIO);
    expect(r.map(a => a.id)).toEqual(['analisis', 'tesoreria']);
  });

  it('descarta ids que ya no existen en el catálogo (sección eliminada)', () => {
    const r = accesosVisibles(['tesoreria', 'seccion-fantasma'], ACCESOS_INICIO);
    expect(r.map(a => a.id)).toEqual(['tesoreria']);
  });

  // Ficha 02 (ADR 069): Ahorro salió del catálogo por dejar de ahorrar un
  // toque. Quien lo tenía configurado no necesita migración: la teja se cae
  // sola por esta misma regla y el resto de su selección se conserva.
  it('quien tenía "ahorro" guardado conserva el resto de su selección', () => {
    const r = accesosVisibles(['tesoreria', 'ahorro', 'personales'], ACCESOS_INICIO);
    expect(r.map(a => a.id)).toEqual(['tesoreria', 'personales']);
  });

  it('sin ids devuelve []', () => {
    expect(accesosVisibles([], ACCESOS_INICIO)).toEqual([]);
    expect(accesosVisibles(undefined, ACCESOS_INICIO)).toEqual([]);
  });

  it('argumentos no-array no revientan', () => {
    expect(accesosVisibles(null, null)).toEqual([]);
  });
});

// ── alternarAcceso() ───────────────────────────────────────────────

describe('alternarAcceso()', () => {
  it('agrega un id ausente al final', () => {
    expect(alternarAcceso(['tesoreria'], 'analisis')).toEqual(['tesoreria', 'analisis']);
  });

  it('quita un id ya presente', () => {
    expect(alternarAcceso(['tesoreria', 'analisis'], 'tesoreria')).toEqual(['analisis']);
  });

  it('no muta el array original', () => {
    const original = ['tesoreria'];
    alternarAcceso(original, 'analisis');
    expect(original).toEqual(['tesoreria']);
  });

  it('desde vacío o undefined, agrega igual', () => {
    expect(alternarAcceso([], 'analisis')).toEqual(['analisis']);
    expect(alternarAcceso(undefined, 'analisis')).toEqual(['analisis']);
  });
});

// ── renderAccesosInicio() ────────────────────────────────────────────

describe('renderAccesosInicio()', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="accesos-inicio-grid"></div>`;
    S.config = { accesosInicio: ['tesoreria', 'analisis', 'presupuesto'] };
  });

  it('no-op si el contenedor no existe', () => {
    document.body.innerHTML = '';
    expect(() => renderAccesosInicio()).not.toThrow();
  });

  it('renderiza un tile por acceso guardado, con su href e ícono', () => {
    renderAccesosInicio();
    const grid = document.getElementById('accesos-inicio-grid');
    const tiles = grid.querySelectorAll('.menu-mas__item');
    expect(tiles).toHaveLength(3);
    expect(grid.innerHTML).toContain('href="#tesoreria"');
    expect(grid.innerHTML).toContain('Mis cuentas');
  });

  it('sin accesos guardados, la grilla queda vacía (el botón Personalizar vive fuera)', () => {
    S.config.accesosInicio = [];
    renderAccesosInicio();
    expect(document.getElementById('accesos-inicio-grid').innerHTML).toBe('');
  });

  it('tolera S.config sin accesosInicio (usuario recién migrado a medias)', () => {
    S.config = {};
    expect(() => renderAccesosInicio()).not.toThrow();
    expect(document.getElementById('accesos-inicio-grid').innerHTML).toBe('');
  });

  // ── DSK.1a (ADR 070 D2): la copia de escritorio de IN.9d ya no existe ──
  // En monitor la barra lateral muestra 15 destinos con su nombre, siempre
  // visibles, así que cuatro atajos en el cuerpo solo la duplicaban. Estos
  // tests son la compuerta: si alguien reintroduce la grilla, esta función no
  // debe volver a llenarla sola.

  it('no llena ninguna grilla de escritorio: esa columna ya no es suya', () => {
    document.body.innerHTML += '<div id="accesos-inicio-grid-escritorio"></div>';
    renderAccesosInicio();
    expect(document.getElementById('accesos-inicio-grid').querySelectorAll('.menu-mas__item')).toHaveLength(3);
    expect(document.getElementById('accesos-inicio-grid-escritorio').innerHTML).toBe('');
  });

  it('no-op si solo existe la grilla retirada de escritorio', () => {
    document.body.innerHTML = '<div id="accesos-inicio-grid-escritorio"></div>';
    expect(() => renderAccesosInicio()).not.toThrow();
    expect(document.getElementById('accesos-inicio-grid-escritorio').innerHTML).toBe('');
  });
});

// ── renderModalPersonalizarAccesos() ──────────────────────────────

describe('renderModalPersonalizarAccesos()', () => {
  beforeEach(() => {
    document.body.innerHTML = `<div id="modal-personalizar-accesos-body"></div>`;
    S.config = { accesosInicio: ['tesoreria'] };
  });

  it('no-op si el contenedor no existe', () => {
    document.body.innerHTML = '';
    expect(() => renderModalPersonalizarAccesos()).not.toThrow();
  });

  it('lista el catálogo completo, no solo las guardadas', () => {
    renderModalPersonalizarAccesos();
    const filas = document.getElementById('modal-personalizar-accesos-body').querySelectorAll('.accesos-row');
    expect(filas).toHaveLength(ACCESOS_INICIO.length);
  });

  it('marca aria-pressed="true" solo en los accesos activos', () => {
    renderModalPersonalizarAccesos();
    const el = document.getElementById('modal-personalizar-accesos-body');
    const activa = el.querySelector('[data-id="tesoreria"]');
    const inactiva = el.querySelector('[data-id="analisis"]');
    expect(activa.getAttribute('aria-pressed')).toBe('true');
    expect(inactiva.getAttribute('aria-pressed')).toBe('false');
  });
});

// ── Toggle end-to-end (dispatch) ───────────────────────────────────

describe('accesos-toggle (dispatch end-to-end)', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="accesos-inicio-grid"></div>
      <div id="modal-personalizar-accesos-body"></div>`;
    S.config = { accesosInicio: ['tesoreria'] };
    initAccesos();
  });

  it('tocar una fila inactiva la agrega a S.config.accesosInicio y re-renderiza ambas vistas', () => {
    renderModalPersonalizarAccesos();
    const fila = document.getElementById('modal-personalizar-accesos-body').querySelector('[data-id="analisis"]');

    dispatch(fila, new Event('click'));

    expect(S.config.accesosInicio).toEqual(['tesoreria', 'analisis']);
    expect(document.getElementById('modal-personalizar-accesos-body').querySelector('[data-id="analisis"]').getAttribute('aria-pressed')).toBe('true');
  });

  it('tocar una fila activa la quita', () => {
    renderModalPersonalizarAccesos();
    const fila = document.getElementById('modal-personalizar-accesos-body').querySelector('[data-id="tesoreria"]');

    dispatch(fila, new Event('click'));

    expect(S.config.accesosInicio).toEqual([]);
  });
});

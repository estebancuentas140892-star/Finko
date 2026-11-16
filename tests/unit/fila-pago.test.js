/**
 * fila-pago.test.js - la teja y la pastilla de estado de un pago (AH.1,
 * ADR 150 D1 y D2).
 *
 * Cubre:
 * - tejaDePago(): la marca guardada gana, después la que menciona el nombre
 *   (también un banco), y sin marca la teja de su categoría en Por pagar.
 * - chipEstadoPago(): ícono y palabra por estado; texto escapado; un estado
 *   desconocido no inventa color.
 */

import { describe, it, expect } from 'vitest';
import { tejaDePago, chipEstadoPago, ICONO_ESTADO_PAGO } from '../../modules/infra/fila-pago.js';

const div = (html) => { const d = document.createElement('div'); d.innerHTML = html; return d; };
const simbolo = (html) => div(html).querySelector('use')?.getAttribute('href');

describe('tejaDePago()', () => {
  it('la marca guardada gana sobre el nombre', () => {
    expect(simbolo(tejaDePago({ descripcion: 'Plan familiar', marcaId: 'spotify', tipo: 'fijo' }))).toBe('#b-spotify');
  });

  it('el nombre que menciona una marca o un banco trae su logo', () => {
    expect(simbolo(tejaDePago({ descripcion: 'Netflix Premium', tipo: 'fijo' }))).toBe('#b-netflix');
    expect(simbolo(tejaDePago({ descripcion: 'Tarjeta Bancolombia', tipo: 'deuda-entidad' }))).toBe('#b-bancolombia');
  });

  it('sin marca, la teja de su categoría en el color de Por pagar', () => {
    const fijo = div(tejaDePago({ descripcion: 'Arriendo', tipo: 'fijo', categoria: 'Vivienda' })).firstElementChild;
    expect(fijo.classList.contains('cat-teja')).toBe(true);
    expect(fijo.dataset.dom).toBe('compromisos');
    const deuda = div(tejaDePago({ descripcion: 'Crédito carro', tipo: 'deuda-entidad', categoria: 'Vehículo' })).firstElementChild;
    expect(deuda.querySelector('use').getAttribute('href')).toBe('#c-carro');
  });

  it('sin compromiso, usa el nombre de la fila; sin nada, la teja de deudas', () => {
    expect(simbolo(tejaDePago(null, 'Disney+'))).toBe('#b-disneyplus');
    expect(simbolo(tejaDePago(undefined, 'Algo raro'))).toBe('#i-deudas');
  });
});

describe('chipEstadoPago()', () => {
  it('cada estado lleva su ícono y su clase', () => {
    for (const [estado, glifo] of Object.entries(ICONO_ESTADO_PAGO)) {
      const chip = div(chipEstadoPago(estado, 'x')).firstElementChild;
      expect(chip.className).toBe(`chip-estado chip-estado--${estado}`);
      expect(chip.querySelector('use').getAttribute('href')).toBe(`#i-${glifo}`);
      expect(chip.querySelector('svg').getAttribute('aria-hidden')).toBe('true');
    }
  });

  it('el texto se escapa', () => {
    expect(div(chipEstadoPago('vencido', '<b>x</b>')).textContent).toBe('<b>x</b>');
  });

  it('estado desconocido: el texto sin pastilla de color; sin texto, nada', () => {
    expect(div(chipEstadoPago(null, 'Pronto')).firstElementChild.className).toBe('chip-estado');
    expect(chipEstadoPago(null, '')).toBe('');
  });
});

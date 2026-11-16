/**
 * fila-pago.test.js - la teja y la pastilla de estado de un pago (AH.1,
 * ADR 150 D1 y D2).
 *
 * Cubre:
 * - tejaDePago(): la marca guardada gana, después la que menciona el nombre
 *   (también un banco), y sin marca la teja de su categoría en Por pagar.
 * - chipEstadoPago(): ícono y palabra por estado; texto escapado; un estado
 *   desconocido no inventa color.
 * - marcaDePago() y marcaDeGasto() (OB.1b, ADR 151 D6): la regla de la teja
 *   expuesta, y el servicio de un gasto heredado de su fijo por compromisoId.
 */

import { describe, it, expect } from 'vitest';
import { tejaDePago, chipEstadoPago, ICONO_ESTADO_PAGO, marcaDePago, marcaDeGasto } from '../../modules/infra/fila-pago.js';

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

// OB.1b: el servicio de un gasto se hereda de su gasto fijo por
// `compromisoId`, con la misma regla de la teja; no se copia al gasto (ADR 146,
// alternativa 3).
describe('marcaDePago() / marcaDeGasto()', () => {
  const netflix = { id: 'f1', tipo: 'fijo', categoria: 'Streaming', descripcion: 'Netflix', marcaId: 'netflix' };
  const disney  = { id: 'f2', tipo: 'fijo', categoria: 'Streaming', descripcion: 'Disney+', marcaId: 'disneyplus' };
  const hbo     = { id: 'f3', tipo: 'fijo', categoria: 'Streaming', descripcion: 'HBO Max', marcaId: 'hbomax' };
  const prime   = { id: 'f4', tipo: 'fijo', categoria: 'Streaming', descripcion: 'Prime Video', marcaId: 'primevideo' };
  const compromisos = [netflix, disney, hbo, prime];

  it('la marca guardada manda, aunque el nombre ya no la mencione', () => {
    expect(marcaDePago(netflix).id).toBe('netflix');
    expect(marcaDePago({ ...disney, descripcion: 'Plan familiar' }).id).toBe('disneyplus');
  });

  it('sin marcaId cae al nombre o la nota; sin compromiso, al nombre de la fila', () => {
    expect(marcaDePago({ id: 'x', descripcion: 'HBO Max' }).id).toBe('hbomax');
    expect(marcaDePago({ id: 'x', descripcion: 'Plan', nota: 'Prime Video' }).id).toBe('primevideo');
    expect(marcaDePago(null, 'Netflix').id).toBe('netflix');
    expect(marcaDePago({ id: 'x', descripcion: 'Arriendo' })).toBeNull();
  });

  it('el pago de un fijo hereda su plataforma: Netflix, Disney+, HBO Max y Prime Video', () => {
    const pago = (compromisoId) => ({ id: 'g', categoria: 'Gastos fijos', descripcion: 'Pago: x', compromisoId });
    expect(compromisos.map(c => marcaDeGasto(pago(c.id), compromisos).id))
      .toEqual(['netflix', 'disneyplus', 'hbomax', 'primevideo']);
  });

  it('si el fijo cambia de plataforma, sus pagos la siguen (no hay copia que se quede vieja)', () => {
    const pago = { id: 'g', compromisoId: 'f1', descripcion: 'Pago: Netflix' };
    expect(marcaDeGasto(pago, [{ ...netflix, descripcion: 'Disney+', marcaId: 'disneyplus' }]).id).toBe('disneyplus');
  });

  it('con el fijo borrado, el pago se reconoce por su descripción "Pago: Netflix"', () => {
    expect(marcaDeGasto({ id: 'g', compromisoId: 'borrado', descripcion: 'Pago: Netflix' }, compromisos).id).toBe('netflix');
  });

  it('un gasto suelto no tiene servicio, aunque su nota mencione una marca', () => {
    expect(marcaDeGasto({ id: 'g', categoria: 'Entretenimiento', descripcion: 'Netflix', nota: 'Bancolombia' }, compromisos)).toBeNull();
    expect(marcaDeGasto(null, compromisos)).toBeNull();
  });
});

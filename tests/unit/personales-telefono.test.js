/**
 * personales-telefono.test.js - Me deben en el teléfono (ADR 135 D7 y D8).
 *
 * La línea de cuándo de cada préstamo, el total con lo devuelto, los grupos
 * con su suma, el círculo de "Me pagó", la hoja de un préstamo y que bajo
 * 1024px la sección se pinta en filas.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { cuandoPrestamo, htmlPersonalesTelefono, htmlDetallePrestamo } from '../../modules/dominio/personales/telefono.js';
import { renderListaPersonales } from '../../modules/dominio/personales/view.js';
import { S } from '../../modules/core/state.js';

const HOY = new Date(2026, 10, 13); // viernes 13 nov 2026

const prestamo = (extra = {}) => ({
  id: 'p1', persona: 'Andrés', monto: 250_000, pagado: 0, fecha: '2026-10-02',
  fechaLimite: null, motivo: '', cuentaId: 'c1', liquidado: false, ...extra,
});

describe('cuandoPrestamo (ADR 135 D7)', () => {
  it('con fecha por delante, en cuántos días y en ámbar', () => {
    expect(cuandoPrestamo(prestamo({ fechaLimite: '2026-11-30' }), HOY)).toEqual({ texto: 'Pactó devolver en 17 días', tono: 'atencion' });
  });

  it('con la fecha lejos, la fecha y sin color', () => {
    expect(cuandoPrestamo(prestamo({ fechaLimite: '2027-03-20' }), HOY).tono).toBe('');
  });

  it('con la fecha pasada, la fecha en rojo', () => {
    const r = cuandoPrestamo(prestamo({ fechaLimite: '2026-10-31' }), HOY);
    expect(r.tono).toBe('peligro');
    expect(r.texto).toMatch(/^Pactó devolver el /);
  });

  it('sin fecha, desde cuándo', () => {
    expect(cuandoPrestamo(prestamo({ fecha: '2026-10-13' }), HOY)).toEqual({ texto: 'Prestado hace 1 mes', tono: '' });
  });
});

describe('htmlPersonalesTelefono (ADR 135 D7)', () => {
  beforeEach(() => { S.config = {}; S.cuentas = [{ id: 'c1', nombre: 'Bancolombia', activa: true }]; });

  it('el total, lo devuelto y los grupos con su suma; los pagados al final, sin círculo', () => {
    const lista = [
      prestamo({ id: 'a', persona: 'Mamá', monto: 120_000, cuentaId: null, motivo: 'mercado', fecha: '2026-10-13' }),
      prestamo({ id: 'b', persona: 'Andrés', monto: 250_000, pagado: 100_000, fechaLimite: '2026-11-30', motivo: 'arreglo del carro' }),
      prestamo({ id: 'c', persona: 'Camila', monto: 80_000, pagado: 80_000, liquidado: true, motivo: 'boletas' }),
    ];
    document.body.innerHTML = htmlPersonalesTelefono({ lista, hoy: HOY, oculto: false });

    expect(document.querySelector('.medeben-total__cifra').textContent).toBe('$270.000');
    expect(document.querySelector('.medeben-total__chip').textContent).toBe('Te han devuelto $180.000 de $450.000');
    const grupos = [...document.querySelectorAll('.medeben-grupo')].map(g => [
      g.querySelector('.medeben-grupo__titulo').textContent,
      g.querySelector('.medeben-grupo__suma')?.textContent ?? null,
    ]);
    expect(grupos).toEqual([
      ['Sin fecha pactada', '$120.000'],
      ['Con fecha por delante', '$150.000'],
      ['Ya te pagaron', null],
    ]);

    const mama = document.querySelector('[data-id="a"].medeben-fila__abrir').closest('.medeben-fila');
    expect(mama.querySelector('.medeben-fila__detalle').textContent).toBe('Prestado hace 1 mes · mercado · solo seguimiento');
    const andres = document.querySelector('[data-id="b"].medeben-fila__abrir').closest('.medeben-fila');
    expect(andres.querySelectorAll('.medeben-fila__linea')[0].textContent).toBe('$150.000 por cobrar · de $250.000');
    expect(andres.querySelector('.medeben-barra--fila')).not.toBeNull();
    expect(andres.querySelector('[data-action="pagar-personal"]').getAttribute('aria-label')).toBe('Me pagó Andrés');

    const camila = document.querySelector('.medeben-fila--pagado');
    expect(camila.textContent.replace(/\s+/g, ' ').trim()).toBe('Camila $80.000 · boletas · te pagó todo');
    expect(camila.querySelector('[data-action="pagar-personal"]')).toBeNull();
  });

  it('con el saldo oculto no dice ningún monto', () => {
    document.body.innerHTML = htmlPersonalesTelefono({ lista: [prestamo()], hoy: HOY, oculto: true });
    expect(document.body.textContent).not.toContain('250.000');
  });
});

describe('htmlDetallePrestamo (ADR 135 D8)', () => {
  beforeEach(() => { S.config = {}; S.cuentas = [{ id: 'c1', nombre: 'Bancolombia', activa: true }]; });

  it('cuánto falta, lo devuelto, cuándo y de dónde, el motivo, los abonos y sus tres acciones', () => {
    vi.useFakeTimers();
    vi.setSystemTime(HOY);
    const p = prestamo({ pagado: 100_000, fechaLimite: '2026-11-30', motivo: 'Arreglo del carro', abonos: [{ fecha: '2026-11-01', monto: 100_000 }] });
    document.body.innerHTML = htmlDetallePrestamo(p, HOY);
    expect(document.getElementById('detalle-fila-titulo').textContent).toBe('Andrés');
    expect(document.querySelector('.detalle-fila__monto').textContent).toBe('$150.000');
    expect(document.querySelector('.detalle-prestamo__devuelto').textContent).toBe('Te devolvió $100.000 de $250.000 · 40%');
    const datos = Object.fromEntries([...document.querySelectorAll('.detalle-gasto__dato')]
      .map(d => [d.querySelector('dt').textContent, d.querySelector('dd').textContent]));
    expect(datos['Le prestaste']).toMatch(/ · de Bancolombia$/);
    expect(datos['Pactó devolver']).toMatch(/ · en 17 días$/);
    expect(datos.Motivo).toBe('Arreglo del carro');
    expect(Object.keys(datos)).toContain('Abonos');
    const acciones = [...document.querySelectorAll('[data-action="registrar-abrir"]')].map(b => b.dataset.targetAction);
    expect(acciones).toEqual(['pagar-personal', 'editar-personal', 'eliminar-personal']);
    vi.useRealTimers();
  });

  it('liquidado: sin "Me pagó" y con "te pagó todo"', () => {
    document.body.innerHTML = htmlDetallePrestamo(prestamo({ pagado: 250_000, liquidado: true }), HOY);
    expect(document.querySelector('.detalle-prestamo__que').textContent).toBe('te pagó todo');
    expect(document.querySelector('[data-target-action="pagar-personal"]')).toBeNull();
  });
});

describe('Me deben bajo 1024px (ADR 135 D7)', () => {
  const matchMediaReal = window.matchMedia;
  beforeEach(() => {
    window.matchMedia = q => ({ matches: /max-width/.test(q), addEventListener() {} });
    document.body.innerHTML = '<div id="lista-personales"></div>';
    S.config = {};
    S.cuentas = [];
    S.personales = [prestamo(), prestamo({ id: 'p2', persona: 'Sebas', monto: 30_000 })];
  });
  afterEach(() => { window.matchMedia = matchMediaReal; });

  it('pinta las filas y no la lista de escritorio', () => {
    renderListaPersonales();
    expect(document.querySelector('.medeben-total')).not.toBeNull();
    expect(document.querySelectorAll('.medeben-fila')).toHaveLength(2);
    expect(document.querySelector('.personales-resumen')).toBeNull();
  });
});

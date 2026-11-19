/**
 * GAS.9d (ADR 183 D4): la tarjeta de crédito nace y se administra en Mis
 * cuentas. Sin cambiar el modelo del ADR 051: es una deuda con entidad con
 * cupo; cada compra (`consumoTC`) sube la deuda sin tocar ninguna cuenta y
 * cada pago (abono) la baja y sale de una cuenta.
 *
 * Cubre: Deudas ya no ofrece crear una tarjeta y dice dónde se agrega; la
 * hoja de la tarjeta dice su cupo y lleva a Mis cuentas o a su deuda; y la
 * contabilidad: la tarjeta no es dinero propio ni ingreso, y una compra se
 * cuenta una vez.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderFormDeuda } from '../../modules/dominio/compromisos/views/formularios.js';
import { htmlDetalleCompromiso } from '../../modules/dominio/compromisos/views/detalle.js';
import { montoDeLaHoja } from '../../modules/dominio/compromisos/views/lista.js';
import {
  normalizarGasto, deltasPorEdicionEnDeuda, deltasPorEdicionDeGasto, esDelDiaADia,
} from '../../modules/dominio/gastos/logic.js';
import { calcularTotalCuentas } from '../../modules/dominio/tesoreria/logic/cuentas.js';
import { renderTarjetasTC } from '../../modules/dominio/tesoreria/view.js';
import { esConsumo, saleDelIngreso } from '../../modules/infra/naturaleza.js';
import { S } from '../../modules/core/state.js';

// ── FIXTURES (inventados) ────────────────────────────────────────

const visa = (o = {}) => ({
  id: 'visa', descripcion: 'Visa Bancolombia', tipo: 'deuda-entidad', categoria: 'Tarjeta de crédito',
  cupoTotal: 3_000_000, saldoTotal: 800_000, cuotaMensual: 120_000, tasa: 0.2293, tasaUnidad: 'EA',
  frecuencia: 'Mensual', diaPago: 25, activo: true, fechaCreacion: '2026-11-01T15:00:00.000Z', ...o,
});

const credito = (o = {}) => visa({ id: 'credito', descripcion: 'Crédito libre inversión', categoria: 'Libre inversión', cupoTotal: undefined, ...o });

const chips = (html) => {
  const div = document.createElement('div');
  div.innerHTML = html;
  return { div, valores: [...div.querySelectorAll('[name="categoria"]')].map(i => i.value) };
};

// ── LA PUERTA ────────────────────────────────────────────────────

describe('Deudas no crea tarjetas; Mis cuentas sí', () => {
  it('desde Deudas, el formulario de una deuda con entidad no ofrece la tarjeta y dice dónde se agrega', () => {
    const { div, valores } = chips(renderFormDeuda('deuda-entidad', null, { sinTarjeta: true }));
    expect(valores).not.toContain('Tarjeta de crédito');
    expect(valores.length).toBeGreaterThan(0);
    const ir = div.querySelector('.deuda-sin-tarjeta [data-action="tc-agregar"]');
    expect(ir.textContent).toBe('Agrégala en Mis cuentas');
  });

  it('desde "Agregar cuenta", la tarjeta está entre las opciones y no hay pista', () => {
    const { div, valores } = chips(renderFormDeuda('deuda-entidad', null));
    expect(valores).toContain('Tarjeta de crédito');
    expect(div.querySelector('.deuda-sin-tarjeta')).toBeNull();
  });

  it('una deuda personal no habla de tarjetas', () => {
    const { div } = chips(renderFormDeuda('deuda-personal', null, { sinTarjeta: true }));
    expect(div.querySelector('.deuda-sin-tarjeta')).toBeNull();
  });
});

// ── LA HOJA DE LA TARJETA ────────────────────────────────────────

describe('la hoja de la tarjeta', () => {
  let hashAntes;
  beforeEach(() => { hashAntes = location.hash; S.gastos = []; S.compromisos = [visa()]; });
  afterEach(() => { location.hash = hashAntes; });

  const hoja = (c) => {
    const div = document.createElement('div');
    div.innerHTML = htmlDetalleCompromiso(c, { prefijoMes: '2026-11', monto: 120_000 });
    return div;
  };
  const datos = (div) => Object.fromEntries([...div.querySelectorAll('.detalle-gasto__dato')]
    .map(d => [d.querySelector('dt').textContent, d.querySelector('dd').textContent]));

  it('dice su cupo y lo que queda de él', () => {
    const d = datos(hoja(visa()));
    expect(d.Cupo).toBe('$3.000.000');
    expect(d.Disponible).toBe('$2.200.000');
    expect(d['Te falta pagar']).toBe('$800.000');
  });

  it('desde Deudas lleva a Mis cuentas, donde se administra', () => {
    location.hash = 'deudas';
    const ir = hoja(visa()).querySelector('[data-action="tc-ver-en-cuentas"]');
    expect(ir.textContent).toBe('Ver en Mis cuentas');
  });

  it('desde Mis cuentas lleva a su deuda', () => {
    location.hash = 'tesoreria';
    const ir = hoja(visa()).querySelector('[data-action="tc-ver-deuda"]');
    expect([ir.textContent, ir.dataset.id]).toEqual(['Ver la deuda en Deudas', 'visa']);
  });

  it('una deuda que no es tarjeta no trae cupo ni la salida', () => {
    const div = hoja(credito());
    expect(datos(div).Cupo).toBeUndefined();
    expect(div.querySelector('[data-action^="tc-ver"]')).toBeNull();
  });

  it('el monto de la hoja: lo que falta de la cuota o, pagada, lo abonado', () => {
    expect(montoDeLaHoja(visa(), '2026-11')).toBe(120_000);
    S.gastos = [{ id: 'a1', compromisoId: 'visa', monto: 120_000, fecha: '2026-11-20', categoria: 'Deudas' }];
    expect(montoDeLaHoja(visa(), '2026-11')).toBe(120_000);
    expect(montoDeLaHoja(visa({ saldoTotal: 0 }), '2026-11')).toBe(0);
  });
});

// ── LA FILA EN MIS CUENTAS ───────────────────────────────────────

describe('la fila de la tarjeta en Mis cuentas (GAS.9g)', () => {
  it('lleva el nombre que se guardó (`descripcion`) y el logo de su banco', () => {
    document.body.innerHTML = '<div id="tesoreria-tarjetas"></div>';
    S.compromisos = [visa()];
    renderTarjetasTC();
    const fila = document.querySelector('#tesoreria-tarjetas .cuenta-card--tarjeta');
    expect(fila.querySelector('.cuenta-card__nombre').textContent).toBe('Visa Bancolombia');
    expect(fila.querySelector('.list-item__detalle').getAttribute('aria-label')).toBe('Ver detalle: Visa Bancolombia, disponible $2.200.000');
    expect(fila.querySelector('.cuenta-card__icon').innerHTML).not.toContain('?');
  });
});

// ── LA CONTABILIDAD ──────────────────────────────────────────────

describe('la tarjeta no es dinero propio y una compra se cuenta una vez', () => {
  const cuentas = [{ id: 'nequi', nombre: 'Nequi', saldo: 500_000, activa: true }];

  it('el total de tus cuentas no suma el cupo ni la tarjeta', () => {
    S.compromisos = [visa()];
    expect(calcularTotalCuentas(cuentas)).toBe(500_000);
  });

  it('una compra con la tarjeta sube su deuda y no toca ninguna cuenta', () => {
    const compra = normalizarGasto({ monto: '90000', categoria: 'Restaurantes', fecha: '2026-11-19', cuentaId: 'tc:visa' });
    expect(compra).toMatchObject({ consumoTC: true, compromisoId: 'visa', cuentaId: null });
    expect(deltasPorEdicionEnDeuda(null, compra, [visa()])).toEqual({ visa: 90_000 });
    expect(deltasPorEdicionDeGasto(null, compra)).toEqual({});
  });

  it('el pago a la tarjeta la baja y sale de la cuenta', () => {
    const abono = { monto: 120_000, categoria: 'Deudas', fecha: '2026-11-25', cuentaId: 'nequi', compromisoId: 'visa', consumoTC: false };
    expect(deltasPorEdicionEnDeuda(null, abono, [visa()])).toEqual({ visa: -120_000 });
    expect(deltasPorEdicionDeGasto(null, abono)).toEqual({ nequi: -120_000 });
  });

  it('la compra es el gasto (Día a día y consumo); el pago no lo vuelve a contar', () => {
    const compra = { monto: 90_000, categoria: 'Restaurantes', compromisoId: 'visa', consumoTC: true };
    const abono = { monto: 120_000, categoria: 'Deudas', compromisoId: 'visa', consumoTC: false };
    expect([esDelDiaADia(compra), esConsumo(compra), saleDelIngreso(compra)]).toEqual([true, true, false]);
    expect([esDelDiaADia(abono), esConsumo(abono), saleDelIngreso(abono)]).toEqual([false, false, true]);
  });
});

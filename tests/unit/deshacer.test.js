/**
 * deshacer.test.js - "Deshacer movimiento" (MOV.3, ADR 154).
 *
 * Cada caso registra con las funciones reales de la app, guarda cómo estaba
 * todo antes de registrar y comprueba que, al deshacer, cuentas, obligaciones
 * y registros quedan exactamente como antes: como si nunca se hubiera
 * anotado, sin registros de reversa.
 *
 * Los ocho casos del pedido: gasto, ingreso, pago completo, pago parcial,
 * transferencia, pago desde varias cuentas, deshacer dos veces y deshacer con
 * algo posterior que depende de la operación. Más: todo o nada, la huella y
 * el mensaje de la confirmación.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { S, createInitialState } from '../../modules/core/state.js';
import { guardar, editar } from '../../modules/infra/crud.js';
import { aplicarPagosCompromisos } from '../../modules/infra/pago-compromiso.js';
import { pagosPendientesDelMes } from '../../modules/infra/estado-obligacion.js';
import { movimientosCompletos } from '../../modules/dominio/movimientos/logic.js';
import { calcularTotalCuentas } from '../../modules/dominio/tesoreria/logic/cuentas.js';
import {
  planDeshacer, aplicarDeshacer, mismaOperacion, huellaPlan, mensajeDeshacer,
} from '../../modules/infra/deshacer.js';

const HOY = '2026-11-16';
const MES = '2026-11';

const cuenta = (id, nombre, saldo) => ({ id, nombre, banco: 'Otro', tipo: 'Ahorros', saldo, activa: true, fechaCreacion: '2025-01-01T00:00:00.000Z' });
const fijo = (id, descripcion, monto, diaPago) => ({ id, descripcion, tipo: 'fijo', categoria: 'Servicios', monto, frecuencia: 'Mensual', diaPago, activo: true, fechaCreacion: '2025-01-01T00:00:00.000Z' });
const deuda = (id, descripcion, saldoTotal, cuotaMensual, diaPago) => ({ id, descripcion, tipo: 'deuda-entidad', categoria: 'Crédito de libre inversión', saldoTotal, cuotaMensual, frecuencia: 'Mensual', diaPago, activo: true, fechaCreacion: '2025-01-01T00:00:00.000Z' });

/** Lo que importa del estado para "como si nunca se hubiera registrado". */
const foto = () => JSON.parse(JSON.stringify({
  cuentas: S.cuentas,
  compromisos: S.compromisos,
  gastos: S.gastos,
  ingresosPuntuales: S.ingresosPuntuales,
  transferencias: S.transferencias,
}));

/** Deshace y comprueba que se aplicó. */
function deshacer(id) {
  const plan = planDeshacer(S, id);
  expect(plan.ok).toBe(true);
  expect(aplicarDeshacer(plan)).toBe(true);
  return plan;
}

beforeEach(() => {
  Object.assign(S, createInitialState());
  S.cuentas = [cuenta('c1', 'Bancolombia', 1_000_000), cuenta('c2', 'Nequi', 300_000)];
  S.compromisos = [fijo('k1', 'Netflix', 38_900, 16), deuda('d1', 'Crédito moto', 2_000_000, 410_000, 10)];
  S.gastos = [];
  S.ingresosPuntuales = [];
  S.transferencias = [];
});

describe('1. deshacer un gasto', () => {
  it('quita el gasto y devuelve el monto a su cuenta', () => {
    const antes = foto();
    const g = guardar('gastos', { monto: 50_000, categoria: 'Mercado', fecha: HOY, cuentaId: 'c1', nota: '' });
    editar('cuentas', 'c1', { saldo: 950_000 });

    const plan = deshacer(g.id);
    expect(plan.cuentas).toEqual({ c1: 50_000 });
    expect(foto()).toEqual(antes);
    expect(movimientosCompletos({ gastos: S.gastos })).toHaveLength(0);
  });
});

describe('2. deshacer un ingreso', () => {
  it('quita el ingreso y lo descuenta de su cuenta', () => {
    const antes = foto();
    const i = guardar('ingresosPuntuales', { descripcion: 'Venta bici', monto: 400_000, categoria: null, cuentaId: 'c2', fecha: HOY });
    editar('cuentas', 'c2', { saldo: 700_000 });

    expect(deshacer(i.id).cuentas).toEqual({ c2: -400_000 });
    expect(foto()).toEqual(antes);
  });
});

describe('3. deshacer un pago completo', () => {
  it('el fijo vuelve a quedar pendiente y el saldo vuelve', () => {
    const antes = foto();
    expect(pagosPendientesDelMes(S.compromisos, S.gastos, MES, HOY).map(p => p.id)).toContain('k1');
    aplicarPagosCompromisos([{ comp: S.compromisos[0], fecha: HOY, partes: [{ cuentaId: 'c1', monto: 38_900 }] }]);
    expect(pagosPendientesDelMes(S.compromisos, S.gastos, MES, HOY).map(p => p.id)).not.toContain('k1');

    const plan = deshacer(S.gastos[0].id);
    expect(plan.pendientes).toEqual(['k1']);
    expect(foto()).toEqual(antes);
    expect(pagosPendientesDelMes(S.compromisos, S.gastos, MES, HOY).map(p => p.id)).toContain('k1');
  });
});

describe('4. deshacer un pago parcial', () => {
  it('la deuda recupera solo ese abono: el abono anterior se queda', () => {
    // Un abono legítimo de antes, que no se toca.
    aplicarPagosCompromisos([{ comp: S.compromisos[1], fecha: '2026-11-02', partes: [{ cuentaId: 'c1', monto: 200_000 }] }]);
    const conPrimerAbono = foto();
    expect(S.compromisos[1].saldoTotal).toBe(1_800_000);

    // El que se registró por error.
    aplicarPagosCompromisos([{ comp: S.compromisos[1], fecha: HOY, partes: [{ cuentaId: 'c2', monto: 100_000 }] }]);
    expect(S.compromisos[1].saldoTotal).toBe(1_700_000);

    const errado = S.gastos.find(g => g.fecha === HOY);
    const plan = deshacer(errado.id);
    expect(plan.deudas).toEqual({ d1: 100_000 });
    expect(foto()).toEqual(conPrimerAbono);
    expect(S.compromisos[1].saldoTotal).toBe(1_800_000);
    expect(S.gastos).toHaveLength(1);
  });
});

describe('5. deshacer una transferencia', () => {
  it('recupera los dos saldos, con el 4x1000, y quita el registro', () => {
    const antes = foto();
    const t = guardar('transferencias', { cuentaOrigenId: 'c1', cuentaDestinoId: 'c2', monto: 100_000, costoGMF: 400, fecha: HOY });
    editar('cuentas', 'c1', { saldo: 1_000_000 - 100_400 });
    editar('cuentas', 'c2', { saldo: 400_000 });

    expect(deshacer(t.id).cuentas).toEqual({ c1: 100_400, c2: -100_000 });
    expect(foto()).toEqual(antes);
    expect(calcularTotalCuentas(S.cuentas)).toBe(1_300_000);
  });
});

describe('5b. deshacer un retiro con lo que cobró el cajero (MC.20a, ADR 171 D4)', () => {
  it('al origen vuelven el monto, el 4x1000 y la comisión; del efectivo sale el monto', () => {
    const antes = foto();
    const t = guardar('transferencias', { cuentaOrigenId: 'c1', cuentaDestinoId: 'c2', monto: 200_000, costoGMF: 800, comision: 7_200, fecha: HOY });
    editar('cuentas', 'c1', { saldo: 1_000_000 - 208_000 });
    editar('cuentas', 'c2', { saldo: 500_000 });

    expect(deshacer(t.id).cuentas).toEqual({ c1: 208_000, c2: -200_000 });
    expect(foto()).toEqual(antes);
  });
});

describe('6. deshacer un pago realizado desde varias cuentas', () => {
  it('las dos partes salen juntas, desde cualquiera de las dos filas', () => {
    const antes = foto();
    aplicarPagosCompromisos([{ comp: S.compromisos[1], fecha: HOY, partes: [{ cuentaId: 'c1', monto: 300_000 }, { cuentaId: 'c2', monto: 110_000 }] }]);
    expect(S.gastos).toHaveLength(2);
    expect(S.gastos[0].operacionId).toBeTruthy();
    expect(S.gastos[1].operacionId).toBe(S.gastos[0].operacionId);

    const plan = deshacer(S.gastos[1].id);
    expect(plan.registros).toHaveLength(2);
    expect(plan.cuentas).toEqual({ c1: 300_000, c2: 110_000 });
    expect(plan.deudas).toEqual({ d1: 410_000 });
    expect(foto()).toEqual(antes);
  });

  it('en el lote, deshacer un pago no toca los otros pagos de esa misma vez', () => {
    aplicarPagosCompromisos([
      { comp: S.compromisos[0], fecha: HOY, partes: [{ cuentaId: 'c1', monto: 20_000 }, { cuentaId: 'c2', monto: 18_900 }] },
      { comp: S.compromisos[1], fecha: HOY, partes: [{ cuentaId: 'c1', monto: 410_000 }] },
    ]);
    const netflix = S.gastos.find(g => g.compromisoId === 'k1');
    expect(planDeshacer(S, netflix.id).registros).toHaveLength(2);
    deshacer(netflix.id);
    expect(S.gastos.map(g => g.compromisoId)).toEqual(['d1']);
    expect(S.compromisos[1].saldoTotal).toBe(1_590_000);
  });

  it('las partes de antes de MOV.3, sin operacionId, se reconocen por su nota y su momento', () => {
    const parte = (id, cuentaId, monto, creado) => ({
      id, monto, cuentaId, fecha: HOY, categoria: 'Gastos fijos', descripcion: 'Pago: Netflix',
      nota: 'Pago repartido entre varias cuentas', compromisoId: 'k1', fechaCreacion: creado,
    });
    const a = parte('a', 'c1', 20_000, '2026-11-16T10:00:00.100Z');
    const b = parte('b', 'c2', 18_900, '2026-11-16T10:00:00.140Z');
    const otroDia = parte('c', 'c2', 18_900, '2026-11-16T11:30:00.000Z');
    expect(mismaOperacion(a, b)).toBe(true);
    expect(mismaOperacion(a, otroDia)).toBe(false);
    // Un gasto suelto, sin la nota, nunca se junta con otro.
    expect(mismaOperacion({ ...a, nota: '' }, { ...b, nota: '' })).toBe(false);
  });
});

describe('7. intentar deshacer dos veces la misma operación', () => {
  it('la segunda vez no encuentra nada y no mueve ningún saldo', () => {
    const g = guardar('gastos', { monto: 50_000, categoria: 'Mercado', fecha: HOY, cuentaId: 'c1', nota: '' });
    editar('cuentas', 'c1', { saldo: 950_000 });
    const plan = planDeshacer(S, g.id);
    expect(aplicarDeshacer(plan)).toBe(true);
    const despues = foto();

    const otra = planDeshacer(S, g.id);
    expect(otra).toMatchObject({ ok: false, motivo: 'no-existe' });
    // Aun con el plan viejo en la mano, no se aplica dos veces.
    expect(aplicarDeshacer(plan)).toBe(false);
    expect(foto()).toEqual(despues);
    expect(S.cuentas[0].saldo).toBe(1_000_000);
  });
});

describe('8. deshacer con algo posterior que depende de la operación', () => {
  it('un ingreso ya repartido con "Distribuir" no se deshace y nada cambia', () => {
    const i = guardar('ingresosPuntuales', { descripcion: 'Salario', monto: 2_000_000, cuentaId: 'c1', fecha: HOY, origen: 'distribucion', repartido: true });
    const antes = foto();
    const plan = planDeshacer(S, i.id);
    expect(plan).toMatchObject({ ok: false, motivo: 'distribuido' });
    expect(aplicarDeshacer(plan)).toBe(false);
    expect(foto()).toEqual(antes);
  });

  it('una compra con tarjeta que ya se pagó después no se deshace', () => {
    S.compromisos.push({ ...deuda('tc', 'Visa', 0, 0, 20), categoria: 'Tarjeta de crédito', cupoTotal: 3_000_000 });
    // Compra de 200.000 y después el pago total de la tarjeta: queda en 0.
    guardar('gastos', { monto: 200_000, categoria: 'Mercado', fecha: '2026-11-03', cuentaId: null, compromisoId: 'tc', consumoTC: true, cuotas: 1 });
    const compra = S.gastos.at(-1);
    expect(planDeshacer(S, compra.id)).toMatchObject({ ok: false, motivo: 'ya-pagada' });
  });

  it('un abono a una deuda que después se archivó no se deshace', () => {
    aplicarPagosCompromisos([{ comp: S.compromisos[1], fecha: HOY, partes: [{ cuentaId: 'c1', monto: 410_000 }] }]);
    editar('compromisos', 'd1', { activo: false });
    expect(planDeshacer(S, S.gastos[0].id)).toMatchObject({ ok: false, motivo: 'deuda-archivada' });
  });

  it('el gasto que dejó "Ya lo usé" de una reserva no se deshace aquí', () => {
    const g = guardar('gastos', { monto: 300_000, categoria: 'Otros', descripcion: 'Viaje', fecha: HOY, apartadoId: 'ap1', sinEfectoSaldo: true });
    expect(planDeshacer(S, g.id)).toMatchObject({ ok: false, motivo: 'reserva' });
  });

  it('lo que pasó después en la misma cuenta se respeta: se devuelve el delta, no un saldo viejo', () => {
    const g = guardar('gastos', { monto: 50_000, categoria: 'Mercado', fecha: HOY, cuentaId: 'c1', nota: '' });
    editar('cuentas', 'c1', { saldo: 950_000 });
    // Después entra un ingreso legítimo a la misma cuenta.
    guardar('ingresosPuntuales', { descripcion: 'Bono', monto: 80_000, cuentaId: 'c1', fecha: HOY });
    editar('cuentas', 'c1', { saldo: 1_030_000 });
    deshacer(g.id);
    expect(S.cuentas[0].saldo).toBe(1_080_000);
    expect(S.ingresosPuntuales).toHaveLength(1);
  });
});

describe('todo o nada', () => {
  it('si un registro del plan ya no está, no toca nada', () => {
    const g = guardar('gastos', { monto: 50_000, categoria: 'Mercado', fecha: HOY, cuentaId: 'c1', nota: '' });
    editar('cuentas', 'c1', { saldo: 950_000 });
    const plan = planDeshacer(S, g.id);
    const antes = foto();
    plan.registros.push({ coleccion: 'gastos', id: 'no-existe' });
    expect(aplicarDeshacer(plan)).toBe(false);
    expect(foto()).toEqual(antes);
  });

  it('si algo falla a mitad, lo ya aplicado se devuelve', () => {
    aplicarPagosCompromisos([{ comp: S.compromisos[1], fecha: HOY, partes: [{ cuentaId: 'c1', monto: 410_000 }] }]);
    const plan = planDeshacer(S, S.gastos[0].id);
    // La deuda desaparece entre el plan y su aplicación: las cuentas ya se
    // tocaron cuando falla la deuda.
    S.compromisos = S.compromisos.filter(c => c.id !== 'd1');
    const antes = foto();
    expect(aplicarDeshacer(plan)).toBe(false);
    expect(foto()).toEqual(antes);
  });
});

describe('huella y mensaje', () => {
  it('la huella cambia si cambia lo que se iba a tocar', () => {
    aplicarPagosCompromisos([{ comp: S.compromisos[1], fecha: HOY, partes: [{ cuentaId: 'c1', monto: 300_000 }, { cuentaId: 'c2', monto: 110_000 }] }]);
    const id = S.gastos[0].id;
    const h1 = huellaPlan(planDeshacer(S, id));
    editar('gastos', S.gastos[1].id, { monto: 100_000 });
    expect(huellaPlan(planDeshacer(S, id))).not.toBe(h1);
  });

  it('el mensaje dice las partes, lo que vuelve a cada cuenta y el saldo de la deuda', () => {
    aplicarPagosCompromisos([{ comp: S.compromisos[1], fecha: HOY, partes: [{ cuentaId: 'c1', monto: 300_000 }, { cuentaId: 'c2', monto: 110_000 }] }]);
    const plan = planDeshacer(S, S.gastos[0].id);
    expect(mensajeDeshacer(plan, S)).toBe('"Abono: Crédito moto" de $410.000 (sus 2 partes, una por cuenta) sale de tus registros, como si no se hubiera anotado. Vuelven $300.000 a Bancolombia, vuelven $110.000 a Nequi y "Crédito moto" vuelve a deber $2.000.000.');
  });

  it('el pago de un fijo dice que vuelve a quedar por pagar', () => {
    aplicarPagosCompromisos([{ comp: S.compromisos[0], fecha: HOY, partes: [{ cuentaId: 'c1', monto: 38_900 }] }]);
    expect(mensajeDeshacer(planDeshacer(S, S.gastos[0].id), S)).toBe('"Pago: Netflix" de $38.900 sale de tus registros, como si no se hubiera anotado. Vuelven $38.900 a Bancolombia y "Netflix" vuelve a quedar por pagar.');
  });
});

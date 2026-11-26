/**
 * helpers/movimientos.js - un historial con todos los criterios de la hoja
 * de filtros de Movimientos (MOV.4, ADR 200): día a día, fijos con marca,
 * una deuda con entidad y otra con persona, un ingreso, una transferencia y
 * un préstamo con su abono. Fechas relativas a hoy, nunca en el futuro.
 */

const _iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Hace `n` días, 'YYYY-MM-DD'. */
export function haceDias(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return _iso(d);
}

/** El día `dia` del mes de hace `meses` meses, si no cae en el futuro. */
function _diaDelMes(meses, dia) {
  const hoy = new Date();
  const d = new Date(hoy.getFullYear(), hoy.getMonth() - meses, dia);
  return d <= hoy ? _iso(d) : null;
}

/** Primer día del mes de hace `meses` meses, como fecha de creación. */
function _creado(meses) {
  const hoy = new Date();
  return new Date(hoy.getFullYear(), hoy.getMonth() - meses, 1, 12).toISOString();
}

export function estadoMovimientos(extra = {}) {
  const pagos = [];
  const pago = (id, compromisoId, categoria, monto, fecha, cuentaId) => {
    if (fecha) pagos.push({ id, monto, categoria, compromisoId, fecha, cuentaId });
  };
  for (const k of [2, 1, 0]) pago(`nf${k}`, 'netflix', 'Gastos fijos', 44_900, _diaDelMes(k, 10), 'bc');
  for (const k of [1, 0]) pago(`ms${k}`, 'm365', 'Gastos fijos', 37_000, _diaDelMes(k, 24), 'bc');
  pago('arr0', 'arriendo', 'Gastos fijos', 1_200_000, _diaDelMes(0, 5) ?? _diaDelMes(1, 5), 'bc');
  pago('visa0', 'visa', 'Deudas', 300_000, _diaDelMes(0, 15) ?? _diaDelMes(1, 15), 'bc');
  pago('tia0', 'tia', 'Deudas', 100_000, _diaDelMes(0, 20) ?? _diaDelMes(1, 20), 'ef');

  return {
    version: 1,
    perfil: { nombre: 'Usuaria de prueba', smmlv: 1_750_905 },
    onboarded: true,
    cuentas: [
      { id: 'bc', nombre: 'Bancolombia', banco: 'Bancolombia', tipo: 'Ahorros', saldo: 3_500_000, activa: true, fechaCreacion: '2026-01-01T00:00:00.000Z' },
      { id: 'nq', nombre: 'Nequi', banco: 'Nequi', tipo: 'Nequi', saldo: 420_000, activa: true, fechaCreacion: '2026-01-01T00:00:00.000Z' },
      { id: 'ef', nombre: 'Efectivo', banco: 'Efectivo', tipo: 'Efectivo', saldo: 80_000, activa: true, fechaCreacion: '2026-01-01T00:00:00.000Z' },
    ],
    ingresos: [],
    compromisos: [
      { id: 'netflix', tipo: 'fijo', descripcion: 'Netflix', categoria: 'Streaming', marcaId: 'netflix', monto: 44_900, frecuencia: 'Mensual', diaPago: 10, activo: true, fechaCreacion: _creado(2) },
      { id: 'm365', tipo: 'fijo', descripcion: 'Microsoft 365', categoria: 'Suscripciones', monto: 37_000, frecuencia: 'Mensual', diaPago: 24, activo: true, fechaCreacion: _creado(1) },
      { id: 'arriendo', tipo: 'fijo', descripcion: 'Arriendo', categoria: 'Arriendo', monto: 1_200_000, frecuencia: 'Mensual', diaPago: 5, activo: true, fechaCreacion: _creado(1) },
      { id: 'visa', tipo: 'deuda-entidad', descripcion: 'Visa Bancolombia', categoria: 'Tarjeta de crédito', saldoTotal: 2_000_000, cuotaMensual: 300_000, tasa: null, frecuencia: 'Mensual', diaPago: 15, activo: true, fechaCreacion: _creado(1) },
      { id: 'tia', tipo: 'deuda-personal', descripcion: 'Tía Rosa', categoria: 'Familiar', saldoTotal: 500_000, cuotaMensual: 100_000, tasa: 0, frecuencia: 'Mensual', diaPago: 20, activo: true, fechaCreacion: _creado(1) },
    ],
    gastos: [
      { id: 'g1', monto: 45_000, categoria: 'Restaurantes', nota: 'Almuerzo', fecha: haceDias(0), cuentaId: 'nq' },
      { id: 'g2', monto: 22_000, categoria: 'Restaurantes', nota: 'Almuerzo', fecha: haceDias(5), cuentaId: 'nq' },
      { id: 'g3', monto: 8_000, categoria: 'Bus, taxi y apps', subcategoriaId: 'transp-taxi', fecha: haceDias(7), cuentaId: 'ef' },
      { id: 'g4', monto: 3_200, categoria: 'Bus, taxi y apps', subcategoriaId: 'transp-bus', fecha: haceDias(8), cuentaId: 'nq' },
      { id: 'g5', monto: 150_000, categoria: 'Mercado', fecha: haceDias(10), cuentaId: 'bc' },
      ...pagos,
    ],
    ingresosPuntuales: [
      { id: 'i1', monto: 2_150_000, categoria: 'Salario', descripcion: 'Quincena', fecha: haceDias(9), cuentaId: 'bc' },
    ],
    transferencias: [
      { id: 'tr1', monto: 200_000, cuentaOrigenId: 'bc', cuentaDestinoId: 'nq', fecha: haceDias(3), costoGMF: 800 },
    ],
    personales: [
      { id: 'p1', persona: 'Camila', monto: 50_000, pagado: 20_000, cuentaId: 'nq', fecha: haceDias(20), liquidado: false, fechaCreacion: `${haceDias(20)}T12:00:00.000Z`,
        abonos: [{ id: 'ab1', monto: 20_000, fecha: haceDias(2), cuentaId: 'nq' }] },
    ],
    config: { busquedasRecientes: ['almuerzo', 'arriendo', 'Camila'] },
    ...extra,
  };
}

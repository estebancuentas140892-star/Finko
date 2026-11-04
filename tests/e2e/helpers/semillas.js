/**
 * semillas.js - las cuatro cantidades de información del canvas móvil
 * (ADR 121 D4): vacío, poca, normal y años de uso. Las usan las pruebas de
 * reflujo y de zonas táctiles.
 */

import { construirEstadoGrande } from '../../../scripts/perf/seed.js';
import { VERSION_LEGAL } from '../../../modules/dominio/config/legal.js';

const hoyIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const _base = (extra = {}) => ({
  version: 1,
  perfil: { nombre: 'Usuaria de prueba', smmlv: 1_750_905 },
  onboarded: true,
  ...extra,
});

/** Recién instalada: una cuenta y nada más. */
export function semillaVacia() {
  return _base({
    cuentas: [{ id: 'c1', nombre: 'Nequi', banco: 'Nequi', tipo: 'Nequi', saldo: 0, activa: true, fechaCreacion: '2026-01-01T00:00:00.000Z' }],
  });
}

/** Una semana de uso: un ingreso, dos gastos, un fijo. */
export function semillaPoca() {
  const fecha = hoyIso();
  return _base({
    cuentas: [{ id: 'c1', nombre: 'Nequi', banco: 'Nequi', tipo: 'Nequi', saldo: 850_000, activa: true, fechaCreacion: '2026-01-01T00:00:00.000Z' }],
    ingresos: [{ id: 'i1', descripcion: 'Salario', monto: 2_400_000, frecuencia: 'Mensual', diaPago: 30, activo: true, fechaCreacion: '2026-01-01' }],
    gastos: [
      { id: 'g1', descripcion: '', monto: 45_000, categoria: 'Mercado', fecha, cuentaId: 'c1' },
      { id: 'g2', descripcion: '', monto: 12_000, categoria: 'Transporte', fecha, cuentaId: 'c1' },
    ],
    compromisos: [{ id: 'f1', tipo: 'fijo', descripcion: 'Arriendo', monto: 900_000, frecuencia: 'Mensual', diaPago: 5, activo: true }],
  });
}

/** Un mes normal con nombres largos y montos de ocho dígitos. */
export function semillaNormal() {
  const fecha = hoyIso();
  return _base({
    cuentas: [
      { id: 'c1', nombre: 'Bancolombia Ahorros', banco: 'Bancolombia', tipo: 'Ahorros', saldo: 12_345_678, activa: true, fechaCreacion: '2026-01-01T00:00:00.000Z' },
      { id: 'c2', nombre: 'Efectivo', banco: 'Efectivo', tipo: 'Efectivo', saldo: 987_654, activa: true, fechaCreacion: '2026-01-01T00:00:00.000Z' },
    ],
    ingresos: [{ id: 'i1', descripcion: 'Salario mensual', monto: 3_500_000, frecuencia: 'Mensual', activo: true, fechaCreacion: '2026-01-01' }],
    gastos: [
      { id: 'g1', descripcion: 'Mercado quincenal completo', monto: 385_500, categoria: 'Mercado', fecha, cuentaId: 'c1' },
      { id: 'g2', descripcion: 'Restaurantes con amigos', monto: 125_000, categoria: 'Restaurantes', fecha, cuentaId: 'c2' },
    ],
    compromisos: [
      { id: 'd1', tipo: 'deuda-entidad', descripcion: 'Tarjeta de crédito Bancolombia', saldoTotal: 4_850_000, cuotaMensual: 385_000, tasa: null, frecuencia: 'Mensual', diaPago: 15, categoria: 'Tarjeta de crédito', activo: true },
      { id: 'd2', tipo: 'deuda-personal', descripcion: 'Préstamo de la tía Marta', saldoTotal: 1_200_000, cuotaMensual: 100_000, tasa: 0, frecuencia: 'Mensual', diaPago: 28, activo: true },
      { id: 'f1', tipo: 'fijo', descripcion: 'Arriendo apartamento centro', monto: 1_200_000, frecuencia: 'Mensual', diaPago: 1, categoria: 'Arriendo', activo: true },
    ],
    metas: [{ id: 'm1', nombre: 'Viaje a San Andrés en diciembre', montoObjetivo: 4_000_000, montoActual: 1_250_000, fechaCreacion: '2026-01-01' }],
    personales: [{ id: 'p1', persona: 'Compañera de oficina', monto: 850_000, pagado: 200_000, fecha: '2025-06-15', fechaLimite: '2026-01-15', liquidado: false, fechaCreacion: '2025-06-15T00:00:00.000Z' }],
    presupuestos: [{ id: 'pr1', categoria: 'Restaurantes', montoMensual: 300_000, activo: true }],
    ahorro: {
      fondoEmergencia: { activo: true, metaMeses: 3, montoActual: 1_000_000 },
      aportes: [{ id: 'ap1', monto: 250_000, fecha, nota: 'Aporte de la quincena' }],
    },
  });
}

/** Años de uso: el estado grande de PERF.0 (4.000 gastos en cuatro años). */
export function semillaGrande() {
  const estado = construirEstadoGrande({ gastos: 4000, anios: 4, cuentas: 4, seed: 7 });
  // El estado de PERF.0 nace con el esquema actual y sin aceptar el paquete
  // legal: sin esto, el aviso bloqueante taparía todas las secciones.
  return {
    ...estado,
    onboarded: true,
    config: { ...estado.config, legalAceptado: { version: VERSION_LEGAL, fecha: '2026-01-01' } },
  };
}

export const SEMILLAS = { vacia: semillaVacia, poca: semillaPoca, normal: semillaNormal, grande: semillaGrande };

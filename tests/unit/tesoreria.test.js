import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  cuentasActivas,
  calcularTotalCuentas,
  tarjetasCredito,
  composicionCuentas,
  resumenCuentas,
  validarCuenta,
  normalizarCuenta,
  diasParaPrimaSemestral,
  estimarSalarioMensual,
  sugerirDistribucionPrima,
  parseCuotaManejo,
  parseDatosTransferencia,
  compromisoDesdeCuotaManejo,
  compromisoCuotaManejoDeCuenta,
  calcularCostoGMF,
  detectarNudgeGMF,
  validarIngreso,
  normalizarIngreso,
  validarIngresoPuntual,
  normalizarIngresoPuntual,
  diasParaProximoPago,
  detectarNudgeProximoIngreso,
  sugerirDistribucionIngreso,
  construirContextoDistribucion,
  calcularGastoVariablePromedio,
  calcularAporteMensualObjetivos,
  construirDesgloseAhorroPorObjetivo,
  construirDesgloseNecesidades,
  presupuestosSobreRemanente,
  calcularGastosFijosMensuales,
  calcularFijosNoEsencialesMensuales,
  esDistribucionPersonalizadaValida,
  resumirPlanDistribucion,
  planComplementoDeficit,
  topeAbonoExtraDeuda,
  construirPlanInversiones,
  construirFilasTransferenciaCuentas,
  cuentaIngresoPrincipal,
  ultimoPagoHasta,
  estadoDistribucion,
  calcularSalarioMinimo,
  montoSalarioMinimoPorPeriodo,
  validarTransferencia,
  saldoSuficiente,
  costoGMFRetiro,
  origenSujetoAGMF,
  normalizarTransferencia,
  calcularTransferencia,
} from '../../modules/dominio/tesoreria/logic.js';
import { aportePorPeriodo } from '../../modules/infra/vencimientos.js';
import { CATEGORIAS_INGRESO, CATEGORIA_INGRESO_ICONO, SMMLV, AUXILIO_TRANSPORTE, TIPOS_LLAVE } from '../../modules/core/constants.js';
import { renderFormIngreso, renderFormIngresoPuntual, renderListaIngresos, renderListaIngresosPuntuales, renderAltasIngreso, renderNudgeDistribucionInicio, renderDistribucionIngreso, renderAsistenteDistribucion, renderFormCuenta, renderListaCuentas, renderTarjetasTC, renderHeroTesoreria, renderGMFIndicador, renderBotonTransferir, renderFormTransferencia, renderParTransferencia, renderSeccionGMF } from '../../modules/dominio/tesoreria/view.js';
import { initAccionesDistribucion } from '../../modules/dominio/tesoreria/acciones/distribucion.js';
import { initAccionesCuentas, inyectarFormCuenta } from '../../modules/dominio/tesoreria/acciones/cuentas.js';
import { initAccionesTransferencias } from '../../modules/dominio/tesoreria/acciones/transferencias.js';
import { dispatch } from '../../modules/ui/actions.js';
import { S, EventBus } from '../../modules/core/state.js';

// ── FIXTURES ─────────────────────────────────────────────────────

const cuentaBase = (overrides = {}) => ({
  id: 'c1',
  nombre: 'Nequi principal',
  banco: 'Nequi',
  tipo: 'Ahorros',
  saldo: 500_000,
  icono: '💚',
  activa: true,
  fechaCreacion: '2026-05-12T00:00:00Z',
  ...overrides,
});

const datosFormValidos = {
  nombre: 'Cuenta corriente',
  banco: 'Bancolombia',
  tipo: 'Corriente',
  saldo: '1500000',
};

// ── cuentasActivas() ─────────────────────────────────────────────

describe('cuentasActivas()', () => {
  it('devuelve todas las cuentas cuando todas están activas', () => {
    const cuentas = [cuentaBase(), cuentaBase({ id: 'c2', nombre: 'BBVA' })];
    expect(cuentasActivas(cuentas)).toHaveLength(2);
  });

  it('excluye cuentas con activa === false', () => {
    const cuentas = [cuentaBase(), cuentaBase({ id: 'c2', activa: false })];
    expect(cuentasActivas(cuentas)).toHaveLength(1);
    expect(cuentasActivas(cuentas)[0].id).toBe('c1');
  });

  it('incluye cuentas sin campo activa (undefined ≠ false)', () => {
    const { activa: _, ...sinActiva } = cuentaBase();
    expect(cuentasActivas([sinActiva])).toHaveLength(1);
  });

  it('devuelve array vacío si no hay cuentas', () => {
    expect(cuentasActivas([])).toEqual([]);
  });
});

// ── calcularTotalCuentas() ───────────────────────────────────────

describe('calcularTotalCuentas()', () => {
  it('suma los saldos de todas las cuentas activas', () => {
    const cuentas = [
      cuentaBase({ saldo: 500_000 }),
      cuentaBase({ id: 'c2', saldo: 1_000_000 }),
    ];
    expect(calcularTotalCuentas(cuentas)).toBe(1_500_000);
  });

  it('ignora cuentas inactivas en el cálculo', () => {
    const cuentas = [
      cuentaBase({ saldo: 500_000 }),
      cuentaBase({ id: 'c2', saldo: 999_999, activa: false }),
    ];
    expect(calcularTotalCuentas(cuentas)).toBe(500_000);
  });

  it('devuelve 0 con array vacío', () => {
    expect(calcularTotalCuentas([])).toBe(0);
  });

  it('devuelve 0 si todas las cuentas están inactivas', () => {
    const cuentas = [cuentaBase({ activa: false })];
    expect(calcularTotalCuentas(cuentas)).toBe(0);
  });

  it('trata saldo undefined como 0', () => {
    const { saldo: _, ...sinSaldo } = cuentaBase();
    expect(calcularTotalCuentas([sinSaldo])).toBe(0);
  });
});

// ── tarjetasCredito() (MC.16c) ────────────────────────────────────

describe('tarjetasCredito()', () => {
  const tarjeta = (overrides = {}) => ({
    id: 'tc1',
    nombre: 'Tarjeta Bancolombia',
    tipo: 'deuda-entidad',
    categoria: 'Tarjeta de crédito',
    cupoTotal: 5_000_000,
    saldoTotal: 1_000_000,
    activo: true,
    ...overrides,
  });

  it('devuelve la tarjeta con cupo registrado', () => {
    expect(tarjetasCredito([tarjeta()])).toHaveLength(1);
  });

  it('excluye la deuda de tarjeta sin cupo (deuda vieja, no producto operable)', () => {
    expect(tarjetasCredito([tarjeta({ cupoTotal: null })])).toEqual([]);
    expect(tarjetasCredito([tarjeta({ cupoTotal: 0 })])).toEqual([]);
  });

  it('excluye otras categorías de deuda y las deudas personales', () => {
    expect(tarjetasCredito([tarjeta({ categoria: 'Vehículo' })])).toEqual([]);
    expect(tarjetasCredito([tarjeta({ tipo: 'deuda-personal' })])).toEqual([]);
  });

  it('excluye la tarjeta archivada: ya no recibe consumos', () => {
    expect(tarjetasCredito([tarjeta({ activo: false })])).toEqual([]);
  });

  it('tolera undefined y lista vacía', () => {
    expect(tarjetasCredito(undefined)).toEqual([]);
    expect(tarjetasCredito([])).toEqual([]);
  });
});

// ── validarCuenta() ──────────────────────────────────────────────

describe('validarCuenta()', () => {
  it('retorna array vacío cuando los datos son válidos', () => {
    expect(validarCuenta(datosFormValidos)).toEqual([]);
  });

  it('nombre vacío NO genera error (es opcional)', () => {
    // El nombre se autogenera en normalizarCuenta() a partir de banco + tipo.
    const errores = validarCuenta({ ...datosFormValidos, nombre: '' });
    expect(errores).toEqual([]);
  });

  it('nombre con solo espacios NO genera error (se autogenera)', () => {
    const errores = validarCuenta({ ...datosFormValidos, nombre: '   ' });
    expect(errores).toEqual([]);
  });

  it('reporta error si banco no se seleccionó', () => {
    const errores = validarCuenta({ ...datosFormValidos, banco: '' });
    expect(errores).toHaveLength(1);
    expect(errores[0]).toMatch(/banco/i);
  });

  it('reporta error si tipo no se seleccionó (banco es banco tradicional)', () => {
    const errores = validarCuenta({ ...datosFormValidos, tipo: '' });
    expect(errores).toHaveLength(1);
    expect(errores[0]).toMatch(/tipo/i);
  });

  it('banco Efectivo: tipo vacío NO genera error (campo oculto, no aplica)', () => {
    const errores = validarCuenta({ banco: 'Efectivo', tipo: '', saldo: '0' });
    expect(errores).toEqual([]);
  });

  it('banco Efectivo: tipo con valor también es válido', () => {
    const errores = validarCuenta({ banco: 'Efectivo', tipo: 'Efectivo', saldo: '0' });
    expect(errores).toEqual([]);
  });

  it('billetera (Nequi): tipo vacío NO genera error (selector oculto, no aplica)', () => {
    const errores = validarCuenta({ banco: 'Nequi', tipo: '', saldo: '0' });
    expect(errores).toEqual([]);
  });

  it('billetera (Daviplata): tipo vacío también es válido', () => {
    const errores = validarCuenta({ banco: 'Daviplata', tipo: '', saldo: '0' });
    expect(errores).toEqual([]);
  });

  it('reporta error si saldo no es número', () => {
    const errores = validarCuenta({ ...datosFormValidos, saldo: 'abc' });
    expect(errores).toHaveLength(1);
    expect(errores[0]).toMatch(/saldo/i);
  });

  it('reporta error si saldo es negativo', () => {
    const errores = validarCuenta({ ...datosFormValidos, saldo: '-100' });
    expect(errores).toHaveLength(1);
  });

  it('acepta saldo 0 como válido', () => {
    expect(validarCuenta({ ...datosFormValidos, saldo: '0' })).toEqual([]);
  });

  it('puede tener múltiples errores a la vez', () => {
    const errores = validarCuenta({ nombre: '', banco: '', tipo: '', saldo: 'x' });
    expect(errores.length).toBeGreaterThanOrEqual(3);
  });

  it('BUG-008: reporta error si saldo es Infinity (ej. "1e999")', () => {
    const errores = validarCuenta({ ...datosFormValidos, saldo: '1e999' });
    expect(errores).toHaveLength(1);
    expect(errores[0]).toMatch(/saldo/i);
  });

  it('BUG-008: reporta error si saldo es -Infinity', () => {
    const errores = validarCuenta({ ...datosFormValidos, saldo: '-1e999' });
    expect(errores).toHaveLength(1);
  });
});

// ── normalizarCuenta() ───────────────────────────────────────────

describe('normalizarCuenta()', () => {
  it('convierte el saldo string a número', () => {
    const result = normalizarCuenta(datosFormValidos);
    expect(typeof result.saldo).toBe('number');
    expect(result.saldo).toBe(1_500_000);
  });

  it('recorta espacios del nombre', () => {
    const result = normalizarCuenta({ ...datosFormValidos, nombre: '  Mi cuenta  ' });
    expect(result.nombre).toBe('Mi cuenta');
  });

  it('marca activa en true', () => {
    expect(normalizarCuenta(datosFormValidos).activa).toBe(true);
  });

  it('CAT.2e: un banco con glifo propio (no "Otro") nunca guarda ícono, aunque venga en los datos', () => {
    const result = normalizarCuenta({ ...datosFormValidos, banco: 'Nequi', icono: 'c-avion' });
    expect(result.icono).toBeNull();
  });

  it('CAT.2e: banco "Bancolombia" tampoco guarda ícono (ya tiene su glifo oficial)', () => {
    const result = normalizarCuenta({ ...datosFormValidos, banco: 'Bancolombia', icono: 'c-avion' });
    expect(result.icono).toBeNull();
  });

  it('CAT.2e: banco "Otro" con un ícono válido del catálogo lo guarda', () => {
    const result = normalizarCuenta({ ...datosFormValidos, banco: 'Otro', icono: 'c-avion' });
    expect(result.icono).toBe('c-avion');
  });

  it('CAT.2e: banco "Otro" sin ícono elegido queda null (no obligatorio)', () => {
    const result = normalizarCuenta({ ...datosFormValidos, banco: 'Otro' });
    expect(result.icono).toBeNull();
  });

  it('CAT.2e: banco "Otro" con un valor fuera del catálogo (manipulación del DOM) se ignora', () => {
    const result = normalizarCuenta({ ...datosFormValidos, banco: 'Otro', icono: 'algo-inventado' });
    expect(result.icono).toBeNull();
  });

  it('no incluye id ni fechaCreacion (los asigna crud.js)', () => {
    const result = normalizarCuenta(datosFormValidos);
    expect(result).not.toHaveProperty('id');
    expect(result).not.toHaveProperty('fechaCreacion');
  });

  it('autogenera nombre "{banco} {tipo}" si el usuario lo deja vacío', () => {
    const result = normalizarCuenta({ ...datosFormValidos, nombre: '', banco: 'Davivienda', tipo: 'Ahorros' });
    expect(result.nombre).toBe('Davivienda Ahorros');
  });

  it('billetera (Nequi): tipo se normaliza al id del banco, autogenera nombre sin duplicar', () => {
    const result = normalizarCuenta({ ...datosFormValidos, nombre: '   ', banco: 'Nequi', tipo: 'Otro' });
    // Para billeteras el tipo es el banco id ('Nequi'). _autoNombre evita "Nequi Nequi".
    expect(result.tipo).toBe('Nequi');
    expect(result.nombre).toBe('Nequi');
  });

  it('evita duplicar "Efectivo Efectivo" cuando banco y tipo coinciden', () => {
    const result = normalizarCuenta({ ...datosFormValidos, nombre: '', banco: 'Efectivo', tipo: 'Efectivo' });
    expect(result.nombre).toBe('Efectivo');
  });

  it('banco Efectivo sin tipo: normaliza tipo a "Efectivo" y nombre a "Efectivo"', () => {
    const result = normalizarCuenta({ banco: 'Efectivo', tipo: '', saldo: '0', nombre: '' });
    expect(result.tipo).toBe('Efectivo');
    expect(result.nombre).toBe('Efectivo');
  });

  it('aplica4x1000 es false si el checkbox no se marcó', () => {
    expect(normalizarCuenta(datosFormValidos).aplica4x1000).toBe(false);
  });

  it('aplica4x1000 es true cuando el checkbox manda "on"', () => {
    const result = normalizarCuenta({ ...datosFormValidos, aplica4x1000: 'on' });
    expect(result.aplica4x1000).toBe(true);
  });

  it('aplica4x1000 se fuerza a false para Efectivo aunque venga marcado', () => {
    const result = normalizarCuenta({ banco: 'Efectivo', tipo: '', saldo: '0', aplica4x1000: 'on' });
    expect(result.aplica4x1000).toBe(false);
  });

  it('respeta el nombre del usuario si lo provee', () => {
    const result = normalizarCuenta({ ...datosFormValidos, nombre: 'Mi cuenta favorita', banco: 'Davivienda', tipo: 'Ahorros' });
    expect(result.nombre).toBe('Mi cuenta favorita');
  });

  it('billetera con nombre explícito conserva el nombre del usuario', () => {
    const result = normalizarCuenta({ banco: 'Nequi', tipo: '', saldo: '0', nombre: 'Nequi del trabajo' });
    expect(result.nombre).toBe('Nequi del trabajo');
    expect(result.tipo).toBe('Nequi');
  });
});

// ── estimarSalarioMensual() (G.3.F8) ──────────────────────────────

const ingresoBase = (overrides = {}) => ({
  id: 'i1',
  descripcion: 'Salario',
  monto: 2_000_000,
  frecuencia: 'Mensual',
  activo: true,
  ...overrides,
});

describe('estimarSalarioMensual()', () => {
  it('retorna 0 con array vacio', () => {
    expect(estimarSalarioMensual([])).toBe(0);
  });

  it('convierte todas las frecuencias a equivalente mensual', () => {
    const ingresos = [
      ingresoBase({ monto: 2_000_000, frecuencia: 'Mensual' }),   // x1 = 2_000_000
      ingresoBase({ id: 'i2', monto: 500_000, frecuencia: 'Quincenal' }), // x2 = 1_000_000
    ];
    expect(estimarSalarioMensual(ingresos)).toBe(3_000_000);
  });

  it('convierte frecuencia Semanal (x4.33)', () => {
    const ingresos = [ingresoBase({ monto: 200_000, frecuencia: 'Semanal' })];
    expect(estimarSalarioMensual(ingresos)).toBeCloseTo(866_000, -3);
  });

  it('excluye frecuencias desconocidas (factor 0)', () => {
    const ingresos = [ingresoBase({ monto: 1_000_000, frecuencia: 'Bimestral' })];
    expect(estimarSalarioMensual(ingresos)).toBe(0);
  });

  it('suma multiples ingresos mensuales', () => {
    const ingresos = [
      ingresoBase({ id: 'i1', monto: 2_000_000 }),
      ingresoBase({ id: 'i2', monto: 800_000 }),
    ];
    expect(estimarSalarioMensual(ingresos)).toBe(2_800_000);
  });

  it('excluye ingresos inactivos', () => {
    const ingresos = [
      ingresoBase({ monto: 2_000_000, activo: false }),
    ];
    expect(estimarSalarioMensual(ingresos)).toBe(0);
  });

  it('trata activo undefined como activo', () => {
    const ingreso = { id: 'i1', descripcion: 'S', monto: 1_500_000, frecuencia: 'Mensual' };
    expect(estimarSalarioMensual([ingreso])).toBe(1_500_000);
  });
});

// ── calcularGastosFijosMensuales() ───────────────────────────────

const compFijoBase = (overrides = {}) => ({
  id: 'cf1',
  tipo: 'fijo',
  frecuencia: 'Mensual',
  monto: 300_000,
  activo: true,
  ...overrides,
});

describe('calcularGastosFijosMensuales()', () => {
  it('retorna 0 con array vacio', () => {
    expect(calcularGastosFijosMensuales([])).toBe(0);
  });

  it('retorna 0 con argumento no-array', () => {
    expect(calcularGastosFijosMensuales(null)).toBe(0);
    expect(calcularGastosFijosMensuales(undefined)).toBe(0);
  });

  it('suma compromisos fijos mensuales', () => {
    const comps = [
      compFijoBase({ id: 'c1', monto: 300_000 }),
      compFijoBase({ id: 'c2', monto: 200_000 }),
    ];
    expect(calcularGastosFijosMensuales(comps)).toBe(500_000);
  });

  it('convierte fijo quincenal a mensual (x2)', () => {
    const comps = [compFijoBase({ monto: 150_000, frecuencia: 'Quincenal' })];
    expect(calcularGastosFijosMensuales(comps)).toBe(300_000);
  });

  it('excluye compromisos tipo deuda-entidad', () => {
    const comps = [
      compFijoBase({ id: 'c1', monto: 300_000 }),
      compFijoBase({ id: 'c2', tipo: 'deuda-entidad', monto: 500_000 }),
    ];
    expect(calcularGastosFijosMensuales(comps)).toBe(300_000);
  });

  it('excluye compromisos inactivos', () => {
    const comps = [compFijoBase({ monto: 300_000, activo: false })];
    expect(calcularGastosFijosMensuales(comps)).toBe(0);
  });

  it('LIM.1b: sigue devolviendo el total, no esenciales incluidos (el fondo depende de esta cifra)', () => {
    const comps = [
      compFijoBase({ id: 'c1', categoria: 'Arriendo',  monto: 800_000 }),
      compFijoBase({ id: 'c2', categoria: 'Streaming', monto: 30_000 }),
    ];
    expect(calcularGastosFijosMensuales(comps)).toBe(830_000);
  });
});

// ── calcularFijosNoEsencialesMensuales() (LIM.1b, ADR 014) ───────

describe('calcularFijosNoEsencialesMensuales()', () => {
  it('solo suma Streaming y Suscripciones', () => {
    const comps = [
      compFijoBase({ id: 'c1', categoria: 'Arriendo',      monto: 800_000 }),
      compFijoBase({ id: 'c2', categoria: 'Streaming',     monto: 30_000 }),
      compFijoBase({ id: 'c3', categoria: 'Suscripciones', monto: 90_000 }),
    ];
    expect(calcularFijosNoEsencialesMensuales(comps)).toBe(120_000);
  });

  it('Gimnasio y Telefonia quedan como esenciales (decision explicita del ADR 014)', () => {
    const comps = [
      compFijoBase({ id: 'c1', categoria: 'Gimnasio',  monto: 120_000 }),
      compFijoBase({ id: 'c2', categoria: 'Telefonía', monto: 60_000 }),
    ];
    expect(calcularFijosNoEsencialesMensuales(comps)).toBe(0);
  });

  it('usa el mismo factor de frecuencia que el total', () => {
    const comps = [compFijoBase({ categoria: 'Streaming', monto: 15_000, frecuencia: 'Quincenal' })];
    expect(calcularFijosNoEsencialesMensuales(comps)).toBe(30_000);
  });

  it('excluye inactivos, deudas y argumentos no-array', () => {
    expect(calcularFijosNoEsencialesMensuales([compFijoBase({ categoria: 'Streaming', activo: false })])).toBe(0);
    expect(calcularFijosNoEsencialesMensuales([compFijoBase({ categoria: 'Suscripciones', tipo: 'deuda-entidad' })])).toBe(0);
    expect(calcularFijosNoEsencialesMensuales(null)).toBe(0);
    expect(calcularFijosNoEsencialesMensuales([])).toBe(0);
  });

  it('nunca supera el total de fijos: restarlo da la parte esencial', () => {
    const comps = [
      compFijoBase({ id: 'c1', categoria: 'Arriendo',  monto: 800_000 }),
      compFijoBase({ id: 'c2', categoria: 'Streaming', monto: 30_000 }),
    ];
    const total = calcularGastosFijosMensuales(comps);
    const noEsenciales = calcularFijosNoEsencialesMensuales(comps);
    expect(total - noEsenciales).toBe(800_000);
  });
});

// ── construirDesgloseNecesidades() (MC.7d, ADR 018 rev. 2026-07-02; MC.13c-2: pasa a consumir el motor de ADR 041) ──

const compDeudaBase = (overrides = {}) => ({
  id: 'd1',
  tipo: 'deuda-entidad',
  descripcion: 'Tarjeta Bancolombia',
  categoria: 'Tarjeta de crédito',
  cuotaMensual: 250_000,
  saldoTotal: 500_000, // mayor que la cuota: el tope de BUG-004 no interfiere por defecto
  diaPago: 20,
  activo: true,
  ...overrides,
});

// Escenario: cobro mensual el 15 de junio de 2026 (el default de la función
// cuando no se le pasa cobro es "el cobro es hoy").
//   ventana del cobro = [2026-06-15, 2026-07-14]
// Un fijo del día 20 cae dentro; el gasto que lo paga tiene que caer ahí también.
const HOY_TEST = new Date(2026, 5, 15); // 15 jun 2026
const fijoNec = (overrides = {}) => compFijoBase({ diaPago: 20, ...overrides });
const gastoEnVentana = (overrides = {}) => ({
  id: 'g1', descripcion: 'Pago', monto: 800_000, categoria: 'Gastos fijos',
  fecha: '2026-06-20', ...overrides,
});

describe('construirDesgloseNecesidades()', () => {
  it('sin compromisos devuelve array vacío', () => {
    expect(construirDesgloseNecesidades([])).toEqual([]);
    expect(construirDesgloseNecesidades()).toEqual([]);
  });

  it('un fijo mensual aparece con su monto tal cual, tipo "fijo", con día de pago y sin pagar', () => {
    const comps = [fijoNec({ id: 'cf1', descripcion: 'Arriendo', categoria: 'Arriendo', monto: 800_000 })];
    expect(construirDesgloseNecesidades(comps, [], HOY_TEST)).toEqual([
      { id: 'cf1', nombre: 'Arriendo', categoria: 'Arriendo', icono: null, tipo: 'fijo', monto: 800_000, diaPago: 20, pagado: false, ocurrencias: 1, nota: '' },
    ]);
  });

  // MC.7g, cerrado por MC.13c-2: antes estos NO aparecían porque una fila no
  // sabía cuántas ocurrencias del periodo representaba. El motor las cuenta.
  it('MC.7g: un fijo quincenal aparece y cobra por las dos veces que cae en la ventana', () => {
    // Quincenal día 5 → junio [5, 20], julio [5, 20]; en [15 jun, 14 jul]: 20 jun y 5 jul.
    const comps = [fijoNec({ id: 'q1', frecuencia: 'Quincenal', diaPago: 5, monto: 150_000 })];
    const r = construirDesgloseNecesidades(comps, [], HOY_TEST);
    expect(r).toHaveLength(1);
    expect(r[0].ocurrencias).toBe(2);
    expect(r[0].monto).toBe(300_000);
  });

  it('MC.7g: un fijo semanal cobra por cada semana de la ventana', () => {
    // Semanal día 3 → junio 17 y 24; julio 3 y 10 (el 17 de julio ya sale de la ventana).
    const comps = [fijoNec({ id: 's1', frecuencia: 'Semanal', diaPago: 3, monto: 50_000 })];
    const r = construirDesgloseNecesidades(comps, [], HOY_TEST);
    expect(r[0].ocurrencias).toBe(4);
    expect(r[0].monto).toBe(200_000);
  });

  it('MC.7g: un fijo diario cobra por todos los días de la ventana', () => {
    const comps = [fijoNec({ id: 'dd1', frecuencia: 'Diario', diaPago: 1, monto: 10_000 })];
    const r = construirDesgloseNecesidades(comps, [], HOY_TEST);
    expect(r[0].ocurrencias).toBe(30); // 16 de junio + 14 de julio
    expect(r[0].monto).toBe(300_000);
  });

  it('un fijo de baja periodicidad aparece sólo cuando su ciclo cae en la ventana', () => {
    const enCiclo  = fijoNec({ id: 'a1', frecuencia: 'Anual', monto: 1_200_000, fechaCreacion: '2026-06-01' });
    const fuera    = fijoNec({ id: 'a2', frecuencia: 'Anual', monto: 900_000,   fechaCreacion: '2026-01-01' });
    expect(construirDesgloseNecesidades([enCiclo], [], HOY_TEST).map(it => it.id)).toEqual(['a1']);
    expect(construirDesgloseNecesidades([fuera], [], HOY_TEST)).toEqual([]);
  });

  it('una deuda usa cuotaMensual, tipo "deuda"', () => {
    const comps = [compDeudaBase()];
    expect(construirDesgloseNecesidades(comps, [], HOY_TEST)[0]).toMatchObject(
      { id: 'd1', nombre: 'Tarjeta Bancolombia', categoria: 'Tarjeta de crédito', tipo: 'deuda', monto: 250_000 },
    );
  });

  it('CAT.2d: propaga el ícono elegido para la categoría "Otra" de una deuda', () => {
    const comps = [compDeudaBase({ categoria: 'Otra', icono: 'c-avion' })];
    expect(construirDesgloseNecesidades(comps, [], HOY_TEST)[0].icono).toBe('c-avion');
  });

  it('una deuda sin ícono propio queda con icono=null', () => {
    const comps = [compDeudaBase()];
    expect(construirDesgloseNecesidades(comps, [], HOY_TEST)[0].icono).toBeNull();
  });

  it('MC.13e-2c: propaga la nota de una deuda a la fila', () => {
    const comps = [compDeudaBase({ nota: 'Termina en 4532' })];
    expect(construirDesgloseNecesidades(comps, [], HOY_TEST)[0].nota).toBe('Termina en 4532');
  });

  it('MC.13e-2c: una deuda sin nota queda con nota=""', () => {
    const comps = [compDeudaBase()];
    expect(construirDesgloseNecesidades(comps, [], HOY_TEST)[0].nota).toBe('');
  });

  it('deuda-personal también cuenta como Necesidad', () => {
    const comps = [compDeudaBase({ tipo: 'deuda-personal' })];
    expect(construirDesgloseNecesidades(comps, [], HOY_TEST)[0].tipo).toBe('deuda');
  });

  it('excluye compromisos inactivos', () => {
    const comps = [fijoNec({ activo: false }), compDeudaBase({ activo: false })];
    expect(construirDesgloseNecesidades(comps, [], HOY_TEST)).toEqual([]);
  });

  it('excluye compromisos que no son fijo ni deuda (ej. otro tipo futuro)', () => {
    const comps = [{ id: 'x1', tipo: 'otro-tipo', descripcion: 'X', monto: 100_000, diaPago: 20, activo: true }];
    expect(construirDesgloseNecesidades(comps, [], HOY_TEST)).toEqual([]);
  });

  it('excluye una deuda sin cuotaMensual (0 o ausente)', () => {
    const comps = [compDeudaBase({ cuotaMensual: 0 }), compDeudaBase({ id: 'd2', cuotaMensual: undefined })];
    expect(construirDesgloseNecesidades(comps, [], HOY_TEST)).toEqual([]);
  });

  it('BUG-004: topa la cuota de una deuda al saldo pendiente cuando la cuota lo supera', () => {
    const comps = [compDeudaBase({ cuotaMensual: 200_000, saldoTotal: 50_000 })];
    expect(construirDesgloseNecesidades(comps, [], HOY_TEST)[0].monto).toBe(50_000);
  });

  it('BUG-004: la cuota no se topa cuando el saldo pendiente la cubre de sobra', () => {
    const comps = [compDeudaBase({ cuotaMensual: 200_000, saldoTotal: 1_000_000 })];
    expect(construirDesgloseNecesidades(comps, [], HOY_TEST)[0].monto).toBe(200_000);
  });

  it('BUG-004: el tope aguanta aunque la deuda caiga varias veces en la ventana', () => {
    // Quincenal: 2 ocurrencias × 100.000 = 200.000, pero sólo se deben 150.000.
    const comps = [compDeudaBase({ frecuencia: 'Quincenal', diaPago: 5, cuotaMensual: 100_000, saldoTotal: 150_000 })];
    const r = construirDesgloseNecesidades(comps, [], HOY_TEST);
    expect(r[0].ocurrencias).toBe(2);
    expect(r[0].monto).toBe(150_000);
  });

  it('BUG-004: excluye una deuda ya saldada (saldoTotal 0) aunque siga activa y con cuotaMensual', () => {
    const comps = [compDeudaBase({ saldoTotal: 0 })];
    expect(construirDesgloseNecesidades(comps, [], HOY_TEST)).toEqual([]);
  });

  it('BUG-004: excluye una deuda con saldoTotal negativo', () => {
    const comps = [compDeudaBase({ saldoTotal: -100 })];
    expect(construirDesgloseNecesidades(comps, [], HOY_TEST)).toEqual([]);
  });

  it('ordena los no pagados de mayor a menor monto, mezclando fijos y deudas', () => {
    const comps = [
      fijoNec({ id: 'cf1', descripcion: 'Internet', monto: 100_000 }),
      compDeudaBase({ id: 'd1', descripcion: 'Tarjeta', cuotaMensual: 400_000, saldoTotal: 1_000_000 }),
      fijoNec({ id: 'cf2', descripcion: 'Arriendo', monto: 800_000 }),
    ];
    expect(construirDesgloseNecesidades(comps, [], HOY_TEST).map(it => it.id)).toEqual(['cf2', 'd1', 'cf1']);
  });

  it('categoria null cuando el compromiso no tiene categoría asignada', () => {
    const comps = [fijoNec({ categoria: undefined })];
    expect(construirDesgloseNecesidades(comps, [], HOY_TEST)[0].categoria).toBeNull();
  });

  // Contrato nuevo (MC.13c-2): sin un día de pago válido no hay forma de ubicar
  // el compromiso en la ventana, así que no entra. Es el mismo criterio con el
  // que Agenda no lo pinta en el calendario (`ocurrenciasEnMes` → []). El
  // formulario de compromiso exige diaPago, así que en datos reales no ocurre.
  it('un compromiso sin día de pago válido no se puede ubicar en la ventana y no aparece', () => {
    expect(construirDesgloseNecesidades([fijoNec({ diaPago: undefined })], [], HOY_TEST)).toEqual([]);
    expect(construirDesgloseNecesidades([fijoNec({ diaPago: 0 })], [], HOY_TEST)).toEqual([]);
    expect(construirDesgloseNecesidades([fijoNec({ diaPago: 99 })], [], HOY_TEST)).toEqual([]);
  });

  it('un fijo con un gasto vinculado en la ventana queda pagado=true, sin importar el monto del gasto', () => {
    const comps  = [fijoNec({ id: 'cf1', monto: 800_000 })];
    const gastos = [gastoEnVentana({ compromisoId: 'cf1', monto: 800_000 })];
    expect(construirDesgloseNecesidades(comps, gastos, HOY_TEST)[0].pagado).toBe(true);
  });

  it('un fijo con un gasto vinculado de otro periodo sigue pagado=false', () => {
    const comps  = [fijoNec({ id: 'cf1', monto: 800_000 })];
    const gastos = [gastoEnVentana({ compromisoId: 'cf1', fecha: '2026-05-10' })];
    expect(construirDesgloseNecesidades(comps, gastos, HOY_TEST)[0].pagado).toBe(false);
  });

  // El cambio de semántica de MC.13c-2: "ya pagado" es por la ventana del
  // cobro, no por el mes del calendario. Un pago del 10 de junio es del mismo
  // mes, pero lo cubrió el cobro anterior: no cuenta para este.
  it('un gasto del mismo mes pero anterior a la ventana no cuenta como pagado', () => {
    const comps  = [fijoNec({ id: 'cf1', monto: 800_000 })];
    const gastos = [gastoEnVentana({ compromisoId: 'cf1', fecha: '2026-06-10' })];
    expect(construirDesgloseNecesidades(comps, gastos, HOY_TEST)[0].pagado).toBe(false);
  });

  it('una deuda con abonos de la ventana que cubren la cuota queda pagado=true', () => {
    const comps  = [compDeudaBase({ cuotaMensual: 250_000 })];
    const gastos = [gastoEnVentana({ compromisoId: 'd1', monto: 250_000, categoria: 'Deudas' })];
    expect(construirDesgloseNecesidades(comps, gastos, HOY_TEST)[0].pagado).toBe(true);
  });

  it('una deuda con abono parcial de la ventana sigue pagado=false', () => {
    const comps  = [compDeudaBase({ cuotaMensual: 250_000 })];
    const gastos = [gastoEnVentana({ compromisoId: 'd1', monto: 100_000, categoria: 'Deudas' })];
    expect(construirDesgloseNecesidades(comps, gastos, HOY_TEST)[0].pagado).toBe(false);
  });

  it('las ya pagadas quedan al final, incluso si su monto es mayor', () => {
    const comps = [
      fijoNec({ id: 'cf1', descripcion: 'Arriendo', monto: 900_000 }),
      fijoNec({ id: 'cf2', descripcion: 'Internet', monto: 100_000 }),
    ];
    const gastos = [gastoEnVentana({ compromisoId: 'cf1', monto: 900_000 })];
    expect(construirDesgloseNecesidades(comps, gastos, HOY_TEST).map(it => it.id)).toEqual(['cf2', 'cf1']);
  });

  it('la frecuencia del cobro acorta la ventana: un cobro quincenal pide menos', () => {
    // Ventana quincenal [15 jun, 29 jun]: el fijo quincenal del día 5 sólo cae el 20.
    const comps = [fijoNec({ id: 'q1', frecuencia: 'Quincenal', diaPago: 5, monto: 150_000 })];
    const r = construirDesgloseNecesidades(comps, [], HOY_TEST, { frecuencia: 'Quincenal', fechaISO: '2026-06-15' });
    expect(r[0].ocurrencias).toBe(1);
    expect(r[0].monto).toBe(150_000);
  });

  // Lo vencido lo calcula el motor pero NO entra en esta checklist: sumarlo
  // diría "debes dos arriendos" a quien no lleve el registro de pagos al día.
  // Tiene su propio copy en el asistente v2 (MC.13e).
  it('lo que ya venció no infla la fila: sólo se cobra lo que vence en la ventana', () => {
    // Fijo del día 5: el 5 de junio ya pasó sin pagarse (vencido) y el 5 de
    // julio cae en la ventana. La fila vale UN arriendo, no dos.
    const comps = [fijoNec({ id: 'cf1', diaPago: 5, monto: 800_000 })];
    const r = construirDesgloseNecesidades(comps, [], HOY_TEST);
    expect(r[0].ocurrencias).toBe(1);
    expect(r[0].monto).toBe(800_000);
  });
});

// ── sugerirDistribucionPrima() (G.3.F8) ───────────────────────────

describe('sugerirDistribucionPrima()', () => {
  it('prima = salario / 2 (180/360 dias)', () => {
    const r = sugerirDistribucionPrima(2_000_000, false);
    expect(r.prima).toBe(1_000_000);
  });

  it('sin deudas: 50% fondo, 0% deudas, 50% ahorro', () => {
    const r = sugerirDistribucionPrima(2_000_000, false);
    expect(r.fondoPct).toBe(50);
    expect(r.deudasPct).toBe(0);
    expect(r.ahorroPct).toBe(50);
    expect(r.deudas).toBe(0);
    expect(r.fondo).toBe(500_000);
    expect(r.ahorro).toBe(500_000);
  });

  it('con deudas: 50% fondo, 30% deudas, 20% ahorro', () => {
    const r = sugerirDistribucionPrima(2_000_000, true);
    expect(r.fondoPct).toBe(50);
    expect(r.deudasPct).toBe(30);
    expect(r.ahorroPct).toBe(20);
    expect(r.fondo).toBe(500_000);
    expect(r.deudas).toBe(300_000);
    expect(r.ahorro).toBe(200_000);
  });

  it('los montos suman la prima total', () => {
    const r = sugerirDistribucionPrima(2_000_000, true);
    expect(r.fondo + r.deudas + r.ahorro).toBe(r.prima);
  });

  it('los montos suman la prima cuando no hay deudas', () => {
    const r = sugerirDistribucionPrima(2_000_000, false);
    expect(r.fondo + r.ahorro).toBe(r.prima);
  });

  it('prima 0 cuando salario 0', () => {
    const r = sugerirDistribucionPrima(0, false);
    expect(r.prima).toBe(0);
    expect(r.fondo).toBe(0);
  });
});

// ── diasParaPrimaSemestral() (G.3.F9) ─────────────────────────────

describe('diasParaPrimaSemestral()', () => {
  it('retorna shape con dias, fecha y semestre', () => {
    const r = diasParaPrimaSemestral(new Date(2026, 0, 1));
    expect(typeof r.dias).toBe('number');
    expect(typeof r.fecha).toBe('string');
    expect(r.semestre === 1 || r.semestre === 2).toBe(true);
  });

  it('desde 1-jun-2026 apunta al 30-jun-2026 (29 días, semestre 1)', () => {
    const r = diasParaPrimaSemestral(new Date(2026, 5, 1));
    expect(r.dias).toBe(29);
    expect(r.semestre).toBe(1);
    expect(r.fecha).toBe('2026-06-30');
  });

  it('en el día exacto de prima primer semestre: dias = 0', () => {
    const r = diasParaPrimaSemestral(new Date(2026, 5, 30));
    expect(r.dias).toBe(0);
    expect(r.semestre).toBe(1);
  });

  it('en el día exacto de prima segundo semestre: dias = 0', () => {
    const r = diasParaPrimaSemestral(new Date(2026, 11, 20));
    expect(r.dias).toBe(0);
    expect(r.semestre).toBe(2);
  });

  it('después del 30-jun apunta al 20-dic del mismo año (semestre 2)', () => {
    const r = diasParaPrimaSemestral(new Date(2026, 6, 1));
    expect(r.semestre).toBe(2);
    expect(r.fecha).toBe('2026-12-20');
    expect(r.dias).toBeGreaterThan(0);
  });

  it('después del 20-dic apunta al 30-jun del año siguiente (semestre 1)', () => {
    const r = diasParaPrimaSemestral(new Date(2026, 11, 21));
    expect(r.semestre).toBe(1);
    expect(r.fecha).toBe('2027-06-30');
    expect(r.dias).toBeGreaterThan(0);
  });

  it('dias siempre es >= 0 para cualquier fecha conocida', () => {
    [
      new Date(2026, 0, 15),
      new Date(2026, 5, 30),
      new Date(2026, 6, 15),
      new Date(2026, 11, 20),
    ].forEach(fecha => {
      expect(diasParaPrimaSemestral(fecha).dias).toBeGreaterThanOrEqual(0);
    });
  });
});

// ── parseCuotaManejo() ───────────────────────────────────────────

describe('parseCuotaManejo()', () => {
  it('devuelve null si el toggle no está activo', () => {
    expect(parseCuotaManejo({})).toBeNull();
    expect(parseCuotaManejo({ cuotaManejoActiva: '' })).toBeNull();
    expect(parseCuotaManejo({ cuotaManejoActiva: 'false' })).toBeNull();
  });

  it('devuelve el objeto cuota cuando el toggle está activo (checkbox HTML manda "on")', () => {
    const c = parseCuotaManejo({
      cuotaManejoActiva: 'on',
      cuotaManejoMonto: '15000',
      cuotaManejoDia:   '20',
    });
    expect(c).toEqual({ monto: 15_000, diaCobro: 20 });
  });

  it('también acepta "true" o "1" como activo', () => {
    expect(parseCuotaManejo({ cuotaManejoActiva: 'true', cuotaManejoMonto: '1', cuotaManejoDia: '1' }))
      .toEqual({ monto: 1, diaCobro: 1 });
    expect(parseCuotaManejo({ cuotaManejoActiva: '1',    cuotaManejoMonto: '1', cuotaManejoDia: '1' }))
      .toEqual({ monto: 1, diaCobro: 1 });
  });
});

// ── validarCuenta() con cuota ────────────────────────────────────

describe('validarCuenta() con cuota de manejo', () => {
  const validBase = { ...datosFormValidos };

  it('toggle apagado: no exige monto ni día', () => {
    expect(validarCuenta(validBase)).toEqual([]);
  });

  it('toggle encendido sin monto: error', () => {
    const errs = validarCuenta({ ...validBase, cuotaManejoActiva: 'on', cuotaManejoMonto: '0', cuotaManejoDia: '15' });
    expect(errs.some(e => /monto.*cuota/i.test(e))).toBe(true);
  });

  it('toggle encendido con día inválido: error', () => {
    const errs = validarCuenta({ ...validBase, cuotaManejoActiva: 'on', cuotaManejoMonto: '15000', cuotaManejoDia: '32' });
    expect(errs.some(e => /día.*cobro/i.test(e))).toBe(true);
  });

  it('toggle encendido válido: sin errores', () => {
    const errs = validarCuenta({ ...validBase, cuotaManejoActiva: 'on', cuotaManejoMonto: '15000', cuotaManejoDia: '20' });
    expect(errs).toEqual([]);
  });

  it('BUG-008: toggle encendido con monto Infinity ("1e999"): error', () => {
    const errs = validarCuenta({ ...validBase, cuotaManejoActiva: 'on', cuotaManejoMonto: '1e999', cuotaManejoDia: '20' });
    expect(errs.some(e => /monto.*cuota/i.test(e))).toBe(true);
  });
});

// ── normalizarCuenta() con cuota ─────────────────────────────────

describe('normalizarCuenta() con cuota de manejo', () => {
  it('cuotaManejo es null si el toggle no se marcó', () => {
    const c = normalizarCuenta(datosFormValidos);
    expect(c.cuotaManejo).toBeNull();
  });

  it('cuotaManejo se setea con monto y día si el toggle está activo', () => {
    const c = normalizarCuenta({
      ...datosFormValidos,
      cuotaManejoActiva: 'on',
      cuotaManejoMonto: '15000',
      cuotaManejoDia:   '20',
    });
    expect(c.cuotaManejo).toEqual({ monto: 15_000, diaCobro: 20 });
  });
});

// ── MC.14 - datos de transferencia ────────────────────────────────

describe('validarCuenta() con datos de transferencia (MC.14)', () => {
  const validBase = { ...datosFormValidos };

  it('toggle apagado: no exige nada, sin errores', () => {
    expect(validarCuenta(validBase)).toEqual([]);
  });

  it('toggle encendido sin ningún campo: sin errores (todo opcional)', () => {
    expect(validarCuenta({ ...validBase, transferenciaActiva: 'on' })).toEqual([]);
  });

  it('toggle encendido con llave pero sin tipo de llave: error', () => {
    const errs = validarCuenta({ ...validBase, transferenciaActiva: 'on', llave: '3001234567' });
    expect(errs.some(e => /tipo de llave/i.test(e))).toBe(true);
  });

  it('toggle encendido con llave y tipo de llave: sin errores', () => {
    const errs = validarCuenta({
      ...validBase, transferenciaActiva: 'on', llave: '3001234567', tipoLlave: 'Celular',
    });
    expect(errs).toEqual([]);
  });

  it('tipo de llave fuera del catálogo: error', () => {
    const errs = validarCuenta({
      ...validBase, transferenciaActiva: 'on', llave: '3001234567', tipoLlave: 'Inventado',
    });
    expect(errs.some(e => /tipo de llave/i.test(e))).toBe(true);
  });

  it('numeroCuenta y alias solos, sin llave: sin errores (no exigen tipoLlave)', () => {
    const errs = validarCuenta({
      ...validBase, transferenciaActiva: 'on', numeroCuenta: '1234567890', alias: '@mi-alias',
    });
    expect(errs).toEqual([]);
  });
});

describe('parseDatosTransferencia()', () => {
  it('devuelve null si el toggle no está activo', () => {
    expect(parseDatosTransferencia({})).toBeNull();
    expect(parseDatosTransferencia({ transferenciaActiva: '' })).toBeNull();
    expect(parseDatosTransferencia({ transferenciaActiva: 'false' })).toBeNull();
  });

  it('devuelve null si el toggle está activo pero no se llenó ningún campo', () => {
    expect(parseDatosTransferencia({ transferenciaActiva: 'on' })).toBeNull();
    expect(parseDatosTransferencia({ transferenciaActiva: 'on', numeroCuenta: '   ' })).toBeNull();
  });

  it('incluye solo los campos con contenido, recortando espacios', () => {
    const dt = parseDatosTransferencia({
      transferenciaActiva: 'on',
      numeroCuenta: '  1234567890  ',
      llave: '3001234567',
      tipoLlave: 'Celular',
      alias: '  @mi-alias  ',
    });
    expect(dt).toEqual({
      numeroCuenta: '1234567890',
      llave:        '3001234567',
      tipoLlave:    'Celular',
      alias:        '@mi-alias',
    });
  });

  it('numeroCuenta solo, sin llave ni alias', () => {
    const dt = parseDatosTransferencia({ transferenciaActiva: 'on', numeroCuenta: '1234567890' });
    expect(dt).toEqual({ numeroCuenta: '1234567890' });
  });

  it('llave sin tipoLlave (caso defensivo, no debería llegar tras validarCuenta): tipoLlave queda null', () => {
    const dt = parseDatosTransferencia({ transferenciaActiva: 'on', llave: '3001234567' });
    expect(dt).toEqual({ llave: '3001234567', tipoLlave: null });
  });

  it('también acepta "true" o "1" como toggle activo', () => {
    expect(parseDatosTransferencia({ transferenciaActiva: 'true', alias: '@x' })).toEqual({ alias: '@x' });
    expect(parseDatosTransferencia({ transferenciaActiva: '1',    alias: '@x' })).toEqual({ alias: '@x' });
  });
});

describe('normalizarCuenta() con datos de transferencia (MC.14)', () => {
  it('datosTransferencia es null si el toggle no se marcó', () => {
    const c = normalizarCuenta(datosFormValidos);
    expect(c.datosTransferencia).toBeNull();
  });

  it('datosTransferencia se setea si el toggle está activo con contenido', () => {
    const c = normalizarCuenta({
      ...datosFormValidos,
      transferenciaActiva: 'on',
      numeroCuenta: '1234567890',
      llave: 'correo@ejemplo.com',
      tipoLlave: 'Correo',
    });
    expect(c.datosTransferencia).toEqual({
      numeroCuenta: '1234567890',
      llave:        'correo@ejemplo.com',
      tipoLlave:    'Correo',
    });
  });
});

describe('renderFormCuenta() - aviso de cuota de manejo (MC.15c)', () => {
  it('incluye el aviso de confirmación, visible por defecto (checkbox sin marcar)', () => {
    const html = renderFormCuenta();
    expect(html).toContain('id="cuenta-cuota-hint"');
    expect(html).toContain('¿Seguro que esta cuenta no cobra cuota de manejo');
    expect(html).not.toMatch(/id="cuenta-cuota-hint"[^>]*hidden/);
  });

  it('marcar el toggle oculta el aviso; desmarcarlo lo vuelve a mostrar', () => {
    document.body.innerHTML = `
      <div class="app-shell"></div>
      <div class="modal-overlay" id="modal-cuenta" aria-hidden="true">
        <div class="modal">
          <h2 class="modal__title">x</h2>
          <div id="modal-cuenta-body"></div>
        </div>
      </div>`;
    initAccionesCuentas();
    inyectarFormCuenta();

    const toggle = document.getElementById('cuenta-cuota-toggle');
    const hint   = document.getElementById('cuenta-cuota-hint');
    expect(hint.hidden).toBe(false);

    toggle.checked = true;
    toggle.dispatchEvent(new Event('change'));
    expect(hint.hidden).toBe(true);

    toggle.checked = false;
    toggle.dispatchEvent(new Event('change'));
    expect(hint.hidden).toBe(false);
  });
});

// ── CAT.2e: picker de ícono para el banco "Otro" ──────────────────

describe('renderFormCuenta() - picker de ícono para "Otro" (CAT.2e)', () => {
  it('incluye el grupo del picker, oculto por defecto', () => {
    const html = renderFormCuenta();
    expect(html).toMatch(/id="form-group-icono"[^>]*hidden/);
    expect(html).toContain('data-icono-picker="cuenta-icono"');
  });

  it('elegir "Otro" en el bank-picker revela el grupo del ícono; volver a un banco con glifo lo oculta', () => {
    document.body.innerHTML = `
      <div class="app-shell"></div>
      <div class="modal-overlay" id="modal-cuenta" aria-hidden="true">
        <div class="modal">
          <h2 class="modal__title">x</h2>
          <div id="modal-cuenta-body"></div>
        </div>
      </div>`;
    initAccionesCuentas();
    inyectarFormCuenta();

    const bancoInput = document.querySelector('#form-cuenta [name="banco"]');
    const grupoIcono = document.getElementById('form-group-icono');
    expect(grupoIcono.hidden).toBe(true);

    bancoInput.value = 'Otro';
    bancoInput.dispatchEvent(new Event('change'));
    expect(grupoIcono.hidden).toBe(false);

    bancoInput.value = 'Nequi';
    bancoInput.dispatchEvent(new Event('change'));
    expect(grupoIcono.hidden).toBe(true);
  });
});

describe('renderFormCuenta() - bloque de datos de transferencia (MC.14)', () => {
  it('incluye el toggle y el fieldset oculto por defecto', () => {
    const html = renderFormCuenta();
    expect(html).toContain('id="cuenta-transferencia-toggle"');
    expect(html).toMatch(/id="cuenta-transferencia-fieldset"[^>]*hidden/);
    expect(html).not.toMatch(/id="cuenta-transferencia-toggle"[^>]*checked/);
  });

  it('el selector de tipo de llave incluye todo TIPOS_LLAVE', () => {
    const html = renderFormCuenta();
    for (const t of TIPOS_LLAVE) {
      expect(html).toContain(`<option value="${t}">${t}</option>`);
    }
  });
});

describe('renderListaCuentas() - chip de datos de transferencia (MC.14, chip desde MC.18b)', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="lista-tesoreria"></div>';
  });

  it('sin datosTransferencia, no muestra el chip de llave', () => {
    S.cuentas = [cuentaBase({ datosTransferencia: null })];
    renderListaCuentas();
    expect(document.getElementById('lista-tesoreria').innerHTML).not.toContain('#i-key');
  });

  // MC-DIS.9 C1 (bug H1): con los tres campos guardados el chip medía 377,8px
  // dentro de un contenedor de 222,7px y pasaba por debajo de editar/eliminar.
  it('con los tres datos guardados, el chip muestra solo la llave con su tipo', () => {
    S.cuentas = [cuentaBase({
      datosTransferencia: {
        numeroCuenta: '1234567890',
        llave: '3001234567',
        tipoLlave: 'Celular',
        alias: '@mi-alias',
      },
    })];
    renderListaCuentas();
    const html = document.getElementById('lista-tesoreria').innerHTML;
    expect(html).toContain('#i-key');
    expect(html).toContain('Celular 3001234567');
    expect(html).not.toContain('N.° 1234567890');
    expect(html).not.toContain('@mi-alias');
  });

  it('sin llave, el chip cae al número de cuenta; sin número, al alias', () => {
    S.cuentas = [cuentaBase({ datosTransferencia: { numeroCuenta: '1234567890', alias: '@mi-alias' } })];
    renderListaCuentas();
    expect(document.getElementById('lista-tesoreria').innerHTML).toContain('N.° 1234567890');

    S.cuentas = [cuentaBase({ datosTransferencia: { alias: '@mi-alias' } })];
    renderListaCuentas();
    expect(document.getElementById('lista-tesoreria').innerHTML).toContain('@mi-alias');
  });

  it('la etiqueta del chip viaja en .chip__label, para poder truncarse (C1)', () => {
    S.cuentas = [cuentaBase({
      datosTransferencia: { llave: '3001234567', tipoLlave: 'Celular' },
      cuotaManejo: { monto: 15_000, diaCobro: 15 },
    })];
    renderListaCuentas();
    const labels = [...document.querySelectorAll('.cuenta-card__chips .chip__label')];
    expect(labels).toHaveLength(2);
    expect(labels.map(l => l.textContent)).toEqual(['Cuota $15.000 · día 15', 'Celular 3001234567']);
  });
});

// -- renderListaCuentas() - salida a Movimientos (ficha 15, M3) ---

describe('renderListaCuentas() - salida al historial de la cuenta (ficha 15, M3)', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="lista-tesoreria"></div>';
  });

  it('cada tarjeta ofrece ver sus movimientos, con su propio id', () => {
    S.cuentas = [cuentaBase({ id: 'c1', nombre: 'Bancolombia' })];
    renderListaCuentas();
    const btn = document.querySelector('[data-action="cuenta-ver-movimientos"]');
    expect(btn).not.toBeNull();
    expect(btn.dataset.id).toBe('c1');
    expect(btn.textContent.trim()).toBe('Ver sus movimientos');
  });

  it('va con las acciones de la tarjeta y con texto, no como icono suelto', () => {
    S.cuentas = [cuentaBase({ id: 'c1' })];
    renderListaCuentas();
    const btn = document.querySelector('[data-action="cuenta-ver-movimientos"]');
    expect(btn.closest('.cuenta-card__actions')).not.toBeNull();
    expect(btn.classList.contains('btn-icon')).toBe(false);
  });
});

// ── renderListaCuentas() - MC.18b: tarjeta con chips (ADR 035 D2) ─

describe('renderListaCuentas() - MC.18b: tarjeta de cuenta con nombre + tipo + chips', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="lista-tesoreria"></div>';
  });

  it('con nombre autogenerado, el título se reduce al banco y el tipo va debajo (banco)', () => {
    S.cuentas = [cuentaBase({ nombre: 'Davivienda Ahorros', banco: 'Davivienda', tipo: 'Ahorros' })];
    renderListaCuentas();
    const el = document.getElementById('lista-tesoreria');
    expect(el.querySelector('.cuenta-card__nombre').textContent).toBe('Davivienda');
    expect(el.querySelector('.cuenta-card__tipo').textContent).toBe('Ahorros');
  });

  it('con nombre autogenerado donde banco === tipo (billetera), el tipo muestra "Billetera digital"', () => {
    S.cuentas = [cuentaBase({ nombre: 'Nequi', banco: 'Nequi', tipo: 'Nequi' })];
    renderListaCuentas();
    const el = document.getElementById('lista-tesoreria');
    expect(el.querySelector('.cuenta-card__nombre').textContent).toBe('Nequi');
    expect(el.querySelector('.cuenta-card__tipo').textContent).toBe('Billetera digital');
  });

  // MC-DIS.9 C11: antes decía "Efectivo" y debajo "Dinero en efectivo".
  it('con clase efectivo, la tarjeta no emite subtítulo', () => {
    S.cuentas = [cuentaBase({ nombre: 'Efectivo', banco: 'Efectivo', tipo: 'Efectivo' })];
    renderListaCuentas();
    const el = document.getElementById('lista-tesoreria');
    expect(el.querySelector('.cuenta-card__nombre').textContent).toBe('Efectivo');
    expect(el.querySelector('.cuenta-card__tipo')).toBeNull();
    expect(el.innerHTML).not.toContain('Dinero en efectivo');
  });

  it('con un nombre explícito que difiere de "banco tipo", el subtítulo vuelve a ser "banco · tipo"', () => {
    S.cuentas = [cuentaBase({ nombre: 'Nequi principal', banco: 'Nequi', tipo: 'Ahorros' })];
    renderListaCuentas();
    const el = document.getElementById('lista-tesoreria');
    expect(el.querySelector('.cuenta-card__nombre').textContent).toBe('Nequi principal');
    expect(el.querySelector('.cuenta-card__tipo').textContent).toBe('Nequi · Ahorros');
  });
});

// ── renderTarjetasTC() (MC.16c, ADR 051 D6) ───────────────────────

describe('renderTarjetasTC()', () => {
  const tarjeta = (overrides = {}) => ({
    id: 'tc1',
    nombre: 'Tarjeta Bancolombia Visa',
    tipo: 'deuda-entidad',
    categoria: 'Tarjeta de crédito',
    cupoTotal: 1_000_000,
    saldoTotal: 320_000,
    activo: true,
    ...overrides,
  });

  beforeEach(() => {
    document.body.innerHTML = '<div id="tesoreria-tarjetas"></div>';
  });

  // DSK.6b (ADR 075 D4): el rótulo es lo único que separa un cupo de un saldo,
  // y el cupo de una tarjeta no es dinero del usuario (el código ya la deja
  // fuera del total). La clase lo oculta bajo 1440px, no lo borra.
  it('DSK.6b: el bloque rotula que lo suyo no son cuentas, con un h2 real', () => {
    S.compromisos = [tarjeta()];
    renderTarjetasTC();
    const h2 = document.querySelector('#tesoreria-tarjetas h2');
    expect(h2).not.toBeNull();
    expect(h2.textContent.trim()).toBe('Tus tarjetas de crédito');
    expect(h2.className).toBe('tesoreria-lb');
  });

  it('sin tarjetas operables, no pinta nada', () => {
    S.compromisos = [];
    renderTarjetasTC();
    expect(document.getElementById('tesoreria-tarjetas').innerHTML).toBe('');
  });

  it('muestra cupo, usado y disponible (derivado, nunca almacenado)', () => {
    S.compromisos = [tarjeta()];
    renderTarjetasTC();
    const el = document.getElementById('tesoreria-tarjetas');
    expect(el.querySelector('.cuenta-card__nombre').textContent).toBe('Tarjeta Bancolombia Visa');
    expect(el.querySelector('.cuenta-card__tipo').textContent).toBe('Cupo $1.000.000');
    expect(el.querySelector('.cuenta-card__saldo').textContent).toBe('$680.000');
    expect(el.querySelector('.chip__label').textContent).toBe('Usado $320.000');
  });

  // ADR 080 D5: era <a href="#compromisos">Ver en Deudas</a>. El hash ya era
  // el correcto (la lente "Por pagar" es #compromisos desde el ADR 069 D1); lo
  // que mentía era el rótulo, y además la salida tiene que llegar a ESTA deuda.
  it('la salida nombra "Por pagar" y lleva el id de su deuda', () => {
    S.compromisos = [tarjeta()];
    renderTarjetasTC();
    const boton = document.querySelector('#tesoreria-tarjetas [data-action="tc-ver-en-por-pagar"]');
    expect(boton).not.toBeNull();
    expect(boton.dataset.id).toBe('tc1');
    expect(boton.textContent.trim()).toBe('Ver en Por pagar');
  });

  it('ninguna superficie de la sección sigue nombrando "Deudas" como destino', () => {
    S.compromisos = [tarjeta()];
    renderTarjetasTC();
    expect(document.getElementById('tesoreria-tarjetas').innerHTML).not.toContain('Ver en Deudas');
  });

  it('no cuenta las deudas de tarjeta sin cupo (deuda vieja capturada a posteriori)', () => {
    S.compromisos = [tarjeta({ cupoTotal: null })];
    renderTarjetasTC();
    expect(document.getElementById('tesoreria-tarjetas').innerHTML).toBe('');
  });
});

describe('renderListaCuentas() - MC.18b: cuota de manejo y GMF como chips', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="lista-tesoreria"></div>';
  });

  it('cuota de manejo y GMF se muestran como chips con su icono', () => {
    S.cuentas = [cuentaBase({
      cuotaManejo: { monto: 15_000, diaCobro: 15 },
      aplica4x1000: true,
    })];
    renderListaCuentas();
    const html = document.getElementById('lista-tesoreria').innerHTML;
    expect(html).toContain('#i-agenda');
    expect(html).toContain('Cuota $15.000 · día 15');
    expect(html).toContain('#i-percent');
    expect(html).toContain('4x1000');
  });

  it('el saldo se enmascara cuando S.config.ocultarSaldo es true', () => {
    S.cuentas = [cuentaBase({ saldo: 500_000 })];
    S.config = { ...(S.config ?? {}), ocultarSaldo: true };
    renderListaCuentas();
    const el = document.getElementById('lista-tesoreria');
    expect(el.querySelector('.cuenta-card__saldo').textContent).toBe('••••');
    expect(el.innerHTML).not.toContain('500.000');
    S.config.ocultarSaldo = false;
  });

  it('CAT.2e: banco "Otro" con ícono elegido lo muestra en la teja en vez de "?"', () => {
    S.cuentas = [cuentaBase({ nombre: 'Mi cuenta rara', banco: 'Otro', tipo: 'Otro', icono: 'c-avion' })];
    renderListaCuentas();
    const teja = document.getElementById('lista-tesoreria').querySelector('.cuenta-card__icon .bank-avatar');
    expect(teja.innerHTML).toContain('#c-avion');
  });

  it('CAT.2e: banco "Otro" sin ícono elegido conserva el fallback de iniciales "?"', () => {
    S.cuentas = [cuentaBase({ nombre: 'Mi cuenta rara', banco: 'Otro', tipo: 'Otro', icono: null })];
    renderListaCuentas();
    const teja = document.getElementById('lista-tesoreria').querySelector('.cuenta-card__icon .bank-avatar');
    expect(teja.textContent).toBe('?');
  });
});

// ── composicionCuentas() y resumenCuentas() (MC.18a, ADR 035 D3) ─

describe('composicionCuentas()', () => {
  it('ordena por saldo descendente con la porción del total en pct y el banco', () => {
    const cuentas = [
      cuentaBase({ id: 'chica',  banco: 'Nequi',       saldo: 100_000 }),
      cuentaBase({ id: 'grande', banco: 'Bancolombia', saldo: 600_000 }),
      cuentaBase({ id: 'media',  banco: 'Davivienda',  saldo: 300_000 }),
    ];
    const compo = composicionCuentas(cuentas);
    expect(compo.map(c => c.id)).toEqual(['grande', 'media', 'chica']);
    expect(compo.map(c => c.pct)).toEqual([60, 30, 10]);
    expect(compo.map(c => c.nombre)).toEqual(['Bancolombia', 'Davivienda', 'Nequi']);
  });

  it('excluye cuentas inactivas y con saldo 0; [] si no hay saldo que repartir', () => {
    const cuentas = [
      cuentaBase({ id: 'activa',   saldo: 200_000 }),
      cuentaBase({ id: 'inactiva', saldo: 800_000, activa: false }),
      cuentaBase({ id: 'vacia',    saldo: 0 }),
    ];
    const compo = composicionCuentas(cuentas);
    expect(compo).toHaveLength(1);
    expect(compo[0]).toEqual({ id: 'activa', nombre: 'Nequi', pct: 100 });

    expect(composicionCuentas([])).toEqual([]);
    expect(composicionCuentas([cuentaBase({ saldo: 0 })])).toEqual([]);
  });

  // MC-DIS.9 C4: con una entrada por cuenta, del tercer segmento en adelante la
  // opacidad caía por debajo del umbral no textual y los dos últimos ni se
  // distinguían entre sí. El tope es 3 segmentos, el último agrupado.
  it('con más de tres cuentas con saldo, agrupa el resto en un segmento "otras"', () => {
    const cuentas = [
      cuentaBase({ id: 'c1', banco: 'Bancolombia', saldo: 3_240_000 }),
      cuentaBase({ id: 'c2', banco: 'Davivienda',  saldo: 1_150_000 }),
      cuentaBase({ id: 'c3', banco: 'Nequi',       saldo:   480_500 }),
      cuentaBase({ id: 'c4', banco: 'Efectivo',    saldo:   220_000 }),
    ];
    const compo = composicionCuentas(cuentas);
    expect(compo).toHaveLength(3);
    expect(compo.map(c => c.nombre)).toEqual(['Bancolombia', 'Davivienda', 'otras']);
    expect(compo.map(c => c.id)).toEqual(['c1', 'c2', null]);
    // El agrupado suma Nequi + Efectivo; los tres pct siguen sumando 100.
    expect(compo[2].pct).toBeCloseTo(13.76, 2);
    expect(compo.reduce((acc, c) => acc + c.pct, 0)).toBeCloseTo(100, 6);
  });

  it('con exactamente tres cuentas con saldo, no agrupa nada', () => {
    const cuentas = [
      cuentaBase({ id: 'c1', banco: 'Bancolombia', saldo: 500_000 }),
      cuentaBase({ id: 'c2', banco: 'Davivienda',  saldo: 300_000 }),
      cuentaBase({ id: 'c3', banco: 'Nequi',       saldo: 200_000 }),
    ];
    const compo = composicionCuentas(cuentas);
    expect(compo.map(c => c.nombre)).toEqual(['Bancolombia', 'Davivienda', 'Nequi']);
    expect(compo.every(c => c.id !== null)).toBe(true);
  });
});

// MC-DIS.9 C4 (regla R23): el resumen dice lo que dibuja la barra. Antes contaba
// cuentas ("4 cuentas · 1 billetera · efectivo"), un dato distinto sobre lo
// mismo que no servía de alternativa no visual (SC 1.4.11).
describe('resumenCuentas()', () => {
  it('devuelve "" cuando no hay barra que explicar', () => {
    expect(resumenCuentas([])).toBe('');
    expect(resumenCuentas([cuentaBase({ activa: false })])).toBe('');
    expect(resumenCuentas([cuentaBase({ saldo: 0 })])).toBe('');
  });

  it('nombra cada segmento con su porcentaje redondeado', () => {
    const cuentas = [
      cuentaBase({ id: 'c1', banco: 'Bancolombia', saldo: 3_240_000 }),
      cuentaBase({ id: 'c2', banco: 'Davivienda',  saldo: 1_150_000 }),
      cuentaBase({ id: 'c3', banco: 'Nequi',       saldo:   480_500 }),
      cuentaBase({ id: 'c4', banco: 'Efectivo',    saldo:   220_000 }),
    ];
    expect(resumenCuentas(cuentas)).toBe('Bancolombia 64% · Davivienda 23% · otras 14%');
  });

  it('con una sola cuenta con saldo, el segmento se lleva el 100%', () => {
    expect(resumenCuentas([cuentaBase({ banco: 'Bancolombia' })])).toBe('Bancolombia 100%');
  });
});

// ── renderHeroTesoreria() (MC.18a, ADR 035 D1+D3+D5) ─────────────

describe('renderHeroTesoreria()', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="tesoreria-hero"></div>';
    S.config = { ...(S.config ?? {}), ocultarSaldo: false };
  });

  afterEach(() => {
    S.config.ocultarSaldo = false;
  });

  it('con cuentas: label, total formateado, ojo con aria-pressed=false y resumen', () => {
    S.cuentas = [
      cuentaBase({ id: 'c1', banco: 'Bancolombia', saldo: 1_450_000 }),
      cuentaBase({ id: 'c2', banco: 'Nequi',       saldo: 685_000 }),
    ];
    renderHeroTesoreria();
    const el = document.getElementById('tesoreria-hero');
    expect(el.querySelector('.hero-tesoreria__label').textContent).toBe('Tu dinero en cuentas');
    expect(el.querySelector('.hero-tesoreria__valor').textContent).toBe('$2.135.000');
    const ojo = el.querySelector('#tesoreria-saldo-ojo');
    expect(ojo.getAttribute('aria-pressed')).toBe('false');
    expect(ojo.innerHTML).toContain('#i-eye');
    expect(ojo.innerHTML).not.toContain('#i-eye-off');
    expect(el.querySelector('.hero-tesoreria__resumen').textContent).toBe('Bancolombia 68% · Nequi 32%');
  });

  it('la barra de composición pinta un segmento por cuenta con saldo, con ancho y opacidad por peso', () => {
    S.cuentas = [
      cuentaBase({ id: 'c1', saldo: 600_000 }),
      cuentaBase({ id: 'c2', saldo: 300_000 }),
      cuentaBase({ id: 'c3', saldo: 100_000 }),
      cuentaBase({ id: 'c4', saldo: 0 }),
    ];
    renderHeroTesoreria();
    const segs = document.querySelectorAll('.hero-tesoreria__compo-seg');
    expect(segs).toHaveLength(3);
    expect(segs[0].style.width).toBe('60.00%');
    expect(segs[1].style.width).toBe('30.00%');
    expect(segs[2].style.width).toBe('10.00%');
    // MC-DIS.9 C4: piso de 0,62 (3,01:1 medido); eran 1 / 0,62 / 0,34 con 0,2
    // de la cuarta cuenta en adelante.
    expect(segs[0].style.opacity).toBe('1');
    expect(segs[1].style.opacity).toBe('0.81');
    expect(segs[2].style.opacity).toBe('0.62');
  });

  // MC-DIS.9 C4: el tope de tres segmentos también aplica al dibujo.
  it('con cuatro cuentas con saldo, la barra sigue pintando tres segmentos', () => {
    S.cuentas = [
      cuentaBase({ id: 'c1', banco: 'Bancolombia', saldo: 3_240_000 }),
      cuentaBase({ id: 'c2', banco: 'Davivienda',  saldo: 1_150_000 }),
      cuentaBase({ id: 'c3', banco: 'Nequi',       saldo:   480_500 }),
      cuentaBase({ id: 'c4', banco: 'Efectivo',    saldo:   220_000 }),
    ];
    renderHeroTesoreria();
    const segs = document.querySelectorAll('.hero-tesoreria__compo-seg');
    expect(segs).toHaveLength(3);
    expect([...segs].every(s => Number(s.style.opacity) >= 0.62)).toBe(true);
    expect(document.querySelector('.hero-tesoreria__resumen').textContent)
      .toBe('Bancolombia 64% · Davivienda 23% · otras 14%');
  });

  it('con el saldo oculto: máscara en el total, aria-pressed=true e icono de ojo tachado', () => {
    S.cuentas = [cuentaBase({ saldo: 500_000 })];
    S.config.ocultarSaldo = true;
    renderHeroTesoreria();
    const el = document.getElementById('tesoreria-hero');
    expect(el.querySelector('.hero-tesoreria__valor').textContent).toBe('$••••••');
    expect(el.innerHTML).not.toContain('500.000');
    const ojo = el.querySelector('#tesoreria-saldo-ojo');
    expect(ojo.getAttribute('aria-pressed')).toBe('true');
    expect(ojo.innerHTML).toContain('#i-eye-off');
    // La barra sigue: muestra proporciones, no montos.
    expect(el.querySelector('.hero-tesoreria__compo')).not.toBeNull();
  });

  it('sin cuentas: label de vacío, $0, sin ojo, sin barra y sin resumen', () => {
    S.cuentas = [cuentaBase({ activa: false })];
    renderHeroTesoreria();
    const el = document.getElementById('tesoreria-hero');
    expect(el.querySelector('.hero-tesoreria__label').textContent).toBe('Aún no tienes cuentas');
    expect(el.querySelector('.hero-tesoreria__valor').textContent).toBe('$0');
    expect(el.querySelector('#tesoreria-saldo-ojo')).toBeNull();
    expect(el.querySelector('.hero-tesoreria__compo')).toBeNull();
    expect(el.querySelector('.hero-tesoreria__resumen')).toBeNull();
  });
});

describe('acción tesoreria-saldo-visibilidad (MC.18a, ADR 035 D5)', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="tesoreria-hero"></div>';
    S.cuentas = [cuentaBase({ saldo: 500_000 })];
    S.config = { ...(S.config ?? {}), ocultarSaldo: false };
    window.location.hash = '#tesoreria';
  });

  afterEach(() => {
    S.config.ocultarSaldo = false;
    window.location.hash = '';
  });

  it('alterna S.config.ocultarSaldo y re-renderiza el hero enmascarado', () => {
    initAccionesCuentas();
    renderHeroTesoreria();
    const ojo = document.getElementById('tesoreria-saldo-ojo');
    expect(ojo.getAttribute('aria-pressed')).toBe('false');

    dispatch(ojo, new Event('click'));

    expect(S.config.ocultarSaldo).toBe(true);
    const el = document.getElementById('tesoreria-hero');
    expect(el.querySelector('.hero-tesoreria__valor').textContent).toBe('$••••••');
    expect(el.querySelector('#tesoreria-saldo-ojo').getAttribute('aria-pressed')).toBe('true');
  });
});

// ── compromisoDesdeCuotaManejo() ─────────────────────────────────

describe('compromisoDesdeCuotaManejo()', () => {
  it('devuelve null si la cuenta no tiene cuota', () => {
    expect(compromisoDesdeCuotaManejo(cuentaBase())).toBeNull();
    expect(compromisoDesdeCuotaManejo(cuentaBase({ cuotaManejo: null }))).toBeNull();
  });

  it('genera el shape de un compromiso fijo mensual ligado a la cuenta', () => {
    const cuenta = cuentaBase({
      id: 'c-nequi',
      nombre: 'Nequi',
      cuotaManejo: { monto: 12_000, diaCobro: 5 },
    });
    expect(compromisoDesdeCuotaManejo(cuenta)).toEqual({
      descripcion:    'Cuota de manejo Nequi',
      monto:          12_000,
      frecuencia:     'Mensual', // BUG-005: capitalizada, para contar en los cálculos mensuales
      diaPago:        5,
      tipo:           'fijo',
      activo:         true,
      cuentaId:       'c-nequi',
      esCuotaManejo:  true,
    });
  });

  it('BUG-005: la cuota generada cuenta en los gastos fijos mensuales y en el checklist de Necesidades', () => {
    const cuenta = cuentaBase({ id: 'c1', nombre: 'Nequi', cuotaManejo: { monto: 15_000, diaCobro: 5 } });
    const comp = { ...compromisoDesdeCuotaManejo(cuenta), id: 'cm1' };
    expect(calcularGastosFijosMensuales([comp])).toBe(15_000);
    const filas = construirDesgloseNecesidades([comp], [], new Date());
    expect(filas).toHaveLength(1);
    expect(filas[0].monto).toBe(15_000);
  });

  it('propaga el estado activo de la cuenta al compromiso', () => {
    const inactiva = cuentaBase({
      activa: false,
      cuotaManejo: { monto: 10_000, diaCobro: 1 },
    });
    expect(compromisoDesdeCuotaManejo(inactiva).activo).toBe(false);
  });
});

// ── compromisoCuotaManejoDeCuenta() ──────────────────────────────

describe('compromisoCuotaManejoDeCuenta()', () => {
  const cuotaC1 = { id: 'k1', cuentaId: 'c1', esCuotaManejo: true };
  const fijoNormal = { id: 'k2', cuentaId: undefined, esCuotaManejo: false, tipo: 'fijo' };
  const cuotaOtra  = { id: 'k3', cuentaId: 'c2', esCuotaManejo: true };

  it('encuentra el compromiso vinculado a la cuenta', () => {
    const r = compromisoCuotaManejoDeCuenta([cuotaC1, fijoNormal, cuotaOtra], 'c1');
    expect(r?.id).toBe('k1');
  });

  it('ignora compromisos sin esCuotaManejo aunque tengan cuentaId', () => {
    const compromisos = [{ id: 'x', cuentaId: 'c1', esCuotaManejo: false }];
    expect(compromisoCuotaManejoDeCuenta(compromisos, 'c1')).toBeUndefined();
  });

  it('devuelve undefined si no hay compromisos', () => {
    expect(compromisoCuotaManejoDeCuenta([], 'c1')).toBeUndefined();
  });

  it('robusto a input no-array', () => {
    expect(compromisoCuotaManejoDeCuenta(null,      'c1')).toBeUndefined();
    expect(compromisoCuotaManejoDeCuenta(undefined, 'c1')).toBeUndefined();
  });
});

// ── calcularCostoGMF() (K.1) ─────────────────────────────────────

const cuentaConGMF = (id = 'c1') => ({
  id,
  nombre: 'Bancolombia Corriente',
  banco:  'Bancolombia',
  tipo:   'Corriente',
  saldo:  2_000_000,
  activa: true,
  aplica4x1000: true,
  fechaCreacion: '2026-01-01T00:00:00Z',
});

const cuentaSinGMF = (id = 'c2') => ({
  ...cuentaConGMF(id),
  nombre: 'Nequi',
  banco:  'Nequi',
  aplica4x1000: false,
});

const gastoDesde = (cuentaId, monto, fecha = '2026-06-15') => ({
  id:          `g-${cuentaId}-${monto}`,
  descripcion: 'Compra',
  monto,
  categoria:   'Alimentación',
  fecha,
  cuentaId,
});

describe('calcularCostoGMF()', () => {
  it('devuelve ceros cuando ninguna cuenta tiene GMF', () => {
    const r = calcularCostoGMF([gastoDesde('c1', 100_000)], [cuentaSinGMF('c1')], 2026, 6);
    expect(r).toEqual({ cantidadCuentasGMF: 0, gastosGravados: 0, costoGMF: 0 });
  });

  it('devuelve ceros cuando hay cuentas GMF pero sin gastos del mes', () => {
    const r = calcularCostoGMF([], [cuentaConGMF('c1')], 2026, 6);
    expect(r).toEqual({ cantidadCuentasGMF: 1, gastosGravados: 0, costoGMF: 0 });
  });

  it('calcula correctamente: gasto 1.000.000 genera GMF 4.000', () => {
    const r = calcularCostoGMF(
      [gastoDesde('c1', 1_000_000)],
      [cuentaConGMF('c1')],
      2026, 6,
    );
    expect(r.gastosGravados).toBe(1_000_000);
    expect(r.costoGMF).toBe(4_000);
    expect(r.cantidadCuentasGMF).toBe(1);
  });

  it('ignora gastos de otros meses', () => {
    const r = calcularCostoGMF(
      [
        gastoDesde('c1', 500_000, '2026-05-10'),
        gastoDesde('c1', 200_000, '2026-06-15'),
      ],
      [cuentaConGMF('c1')],
      2026, 6,
    );
    expect(r.gastosGravados).toBe(200_000);
    expect(r.costoGMF).toBe(800);
  });

  it('ignora gastos de cuentas sin GMF', () => {
    const r = calcularCostoGMF(
      [
        gastoDesde('c1', 300_000, '2026-06-10'),
        gastoDesde('c2', 700_000, '2026-06-10'),
      ],
      [cuentaConGMF('c1'), cuentaSinGMF('c2')],
      2026, 6,
    );
    expect(r.gastosGravados).toBe(300_000);
    expect(r.costoGMF).toBe(1_200);
  });

  it('ignora gastos sin cuentaId', () => {
    const r = calcularCostoGMF(
      [{ id: 'g1', monto: 500_000, fecha: '2026-06-10', categoria: 'Otro' }],
      [cuentaConGMF('c1')],
      2026, 6,
    );
    expect(r.gastosGravados).toBe(0);
  });

  it('suma gastos de varias cuentas con GMF', () => {
    const r = calcularCostoGMF(
      [
        gastoDesde('c1', 200_000, '2026-06-01'),
        gastoDesde('c2', 300_000, '2026-06-15'),
      ],
      [cuentaConGMF('c1'), cuentaConGMF('c2')],
      2026, 6,
    );
    expect(r.gastosGravados).toBe(500_000);
    expect(r.costoGMF).toBe(2_000);
    expect(r.cantidadCuentasGMF).toBe(2);
  });

  it('arrays vacíos devuelven ceros', () => {
    const r = calcularCostoGMF([], [], 2026, 6);
    expect(r).toEqual({ cantidadCuentasGMF: 0, gastosGravados: 0, costoGMF: 0 });
  });
});

// ── detectarNudgeGMF() (K.1) ─────────────────────────────────────

describe('detectarNudgeGMF()', () => {
  it('retorna null cuando costoGMF es 0', () => {
    expect(detectarNudgeGMF({ cantidadCuentasGMF: 1, gastosGravados: 0, costoGMF: 0 })).toBeNull();
  });

  it('retorna null cuando gmfData es null o undefined', () => {
    expect(detectarNudgeGMF(null)).toBeNull();
    expect(detectarNudgeGMF(undefined)).toBeNull();
  });

  it('devuelve nudge-info con id gmf-costo cuando hay costo > 0', () => {
    const n = detectarNudgeGMF({ cantidadCuentasGMF: 1, gastosGravados: 500_000, costoGMF: 2_000 });
    expect(n).not.toBeNull();
    expect(n.nivel).toBe('nudge-info');
    expect(n.id).toBe('gmf-costo');
    expect(n.icono).toBe('gastos');
  });

  it('nudge expone los valores numéricos del mes para que la vista los formatee', () => {
    const n = detectarNudgeGMF({ cantidadCuentasGMF: 2, gastosGravados: 1_000_000, costoGMF: 4_000 });
    expect(n.costoGMF).toBe(4_000);
    expect(n.gastosGravados).toBe(1_000_000);
    expect(n.cantidadCuentasGMF).toBe(2);
  });
});

// ── renderGMFIndicador() - MC.18c: tarjeta insight (ADR 035 D4) ──

describe('renderGMFIndicador() - tarjeta insight del 4x1000', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="tesoreria-gmf"></div>';
  });

  it('sin costo GMF este mes, el contenedor queda vacío', () => {
    S.cuentas = [cuentaBase({ aplica4x1000: false })];
    S.gastos = [];
    renderGMFIndicador();
    expect(document.getElementById('tesoreria-gmf').innerHTML).toBe('');
  });

  it('con costo GMF este mes, pinta la tarjeta con icono, monto y detalle', () => {
    const d = new Date();
    const fechaHoy = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    S.cuentas = [cuentaBase({ id: 'c1', aplica4x1000: true })];
    S.gastos = [
      { id: 'g1', cuentaId: 'c1', monto: 500_000, fecha: fechaHoy, categoria: 'Mercado' },
    ];
    renderGMFIndicador();
    const el = document.getElementById('tesoreria-gmf');
    expect(el.querySelector('.gmf-insight')).not.toBeNull();
    expect(el.innerHTML).toContain('#i-percent');
    expect(el.querySelector('.gmf-insight__title').textContent).toContain('4x1000 estimado este mes');
    expect(el.querySelector('.gmf-insight__desc').textContent).toContain('1 cuenta');
  });

  // MC-DIS.9 C10 (regla R24): es informativa y estable, y la sección la
  // repinta en cada state:change; el lector la reanunciaba sin cambio alguno.
  it('la tarjeta no es una región viva', () => {
    const d = new Date();
    const fechaHoy = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    S.cuentas = [cuentaBase({ id: 'c1', aplica4x1000: true })];
    S.gastos = [{ id: 'g1', cuentaId: 'c1', monto: 500_000, fecha: fechaHoy, categoria: 'Mercado' }];
    renderGMFIndicador();
    expect(document.querySelector('.gmf-insight').getAttribute('role')).toBeNull();
  });
});

// ── validarIngreso() ──────────────────────────────────────────────

describe('validarIngreso()', () => {
  const valid = { descripcion: 'Salario empresa', monto: '3500000', frecuencia: 'Mensual' };

  it('devuelve [] para datos válidos', () => {
    expect(validarIngreso(valid)).toEqual([]);
  });

  it('error si descripcion está vacía', () => {
    const errs = validarIngreso({ ...valid, descripcion: '' });
    expect(errs).toHaveLength(1);
    expect(errs[0]).toMatch(/descripción/i);
  });

  it('error si descripcion es solo espacios', () => {
    expect(validarIngreso({ ...valid, descripcion: '   ' })).toHaveLength(1);
  });

  it('error si monto es 0', () => {
    const errs = validarIngreso({ ...valid, monto: '0' });
    expect(errs).toHaveLength(1);
    expect(errs[0]).toMatch(/monto/i);
  });

  it('error si monto es negativo', () => {
    expect(validarIngreso({ ...valid, monto: '-100' })).toHaveLength(1);
  });

  it('error si monto no es número', () => {
    expect(validarIngreso({ ...valid, monto: 'abc' })).toHaveLength(1);
  });

  it('BUG-008: error si monto es Infinity (ej. "1e999")', () => {
    const errs = validarIngreso({ ...valid, monto: '1e999' });
    expect(errs).toHaveLength(1);
    expect(errs[0]).toMatch(/monto/i);
  });

  it('error si frecuencia no está en la lista de FRECUENCIAS', () => {
    const errs = validarIngreso({ ...valid, frecuencia: 'Cada-dos-meses' });
    expect(errs).toHaveLength(1);
    expect(errs[0]).toMatch(/frecuencia/i);
  });

  it('error si frecuencia está vacía', () => {
    expect(validarIngreso({ ...valid, frecuencia: '' })).toHaveLength(1);
  });

  it('acepta todas las frecuencias válidas de FRECUENCIAS', () => {
    for (const frec of ['Diario', 'Semanal', 'Quincenal', 'Mensual', 'Anual', 'Única vez']) {
      expect(validarIngreso({ ...valid, frecuencia: frec })).toEqual([]);
    }
  });
});

// ── validarIngreso() - diaPago ────────────────────────────────────

describe('validarIngreso() - diaPago', () => {
  const base = { descripcion: 'Salario', monto: '3500000', frecuencia: 'Mensual' };

  it('sin diaPago en frecuencia soportada → válido', () => {
    expect(validarIngreso(base)).toEqual([]);
  });

  it('diaPago vacío → se ignora, sin error', () => {
    expect(validarIngreso({ ...base, diaPago: '' })).toEqual([]);
  });

  it('diaPago 30 en Mensual → válido', () => {
    expect(validarIngreso({ ...base, diaPago: '30' })).toEqual([]);
  });

  it('diaPago 1 en Mensual → válido', () => {
    expect(validarIngreso({ ...base, diaPago: '1' })).toEqual([]);
  });

  it('diaPago 0 en Mensual → error de rango', () => {
    const errs = validarIngreso({ ...base, diaPago: '0' });
    expect(errs).toHaveLength(1);
    expect(errs[0]).toMatch(/día de pago/i);
  });

  it('diaPago 32 en Mensual → error de rango', () => {
    expect(validarIngreso({ ...base, diaPago: '32' })).toHaveLength(1);
  });

  it('diaPago 15 en Quincenal → válido', () => {
    expect(validarIngreso({ ...base, frecuencia: 'Quincenal', diaPago: '15' })).toEqual([]);
  });

  it('diaPago 16 en Quincenal → error (máximo 15)', () => {
    const errs = validarIngreso({ ...base, frecuencia: 'Quincenal', diaPago: '16' });
    expect(errs).toHaveLength(1);
    expect(errs[0]).toMatch(/quincena/i);
  });

  it('diaPago en frecuencia no soportada (Diario) → se ignora, sin error', () => {
    expect(validarIngreso({ ...base, frecuencia: 'Diario', diaPago: '99' })).toEqual([]);
  });
});

// ── normalizarIngreso() ───────────────────────────────────────────

describe('normalizarIngreso()', () => {
  it('convierte monto a número', () => {
    const r = normalizarIngreso({ descripcion: 'Salario', monto: '3500000', frecuencia: 'Mensual' });
    expect(r.monto).toBe(3_500_000);
  });

  it('recorta espacios de la descripción', () => {
    const r = normalizarIngreso({ descripcion: '  Arriendo  ', monto: '500000', frecuencia: 'Mensual' });
    expect(r.descripcion).toBe('Arriendo');
  });

  it('activo es true por defecto', () => {
    const r = normalizarIngreso({ descripcion: 'x', monto: '1', frecuencia: 'Anual' });
    expect(r.activo).toBe(true);
  });

  it('preserva la frecuencia tal cual', () => {
    const r = normalizarIngreso({ descripcion: 'x', monto: '1', frecuencia: 'Quincenal' });
    expect(r.frecuencia).toBe('Quincenal');
  });

  it('con diaPago en Mensual → guarda número', () => {
    const r = normalizarIngreso({ descripcion: 'x', monto: '1', frecuencia: 'Mensual', diaPago: '30' });
    expect(r.diaPago).toBe(30);
  });

  it('con diaPago en Quincenal → guarda número', () => {
    const r = normalizarIngreso({ descripcion: 'x', monto: '1', frecuencia: 'Quincenal', diaPago: '15' });
    expect(r.diaPago).toBe(15);
  });

  it('sin diaPago → diaPago es null', () => {
    const r = normalizarIngreso({ descripcion: 'x', monto: '1', frecuencia: 'Mensual' });
    expect(r.diaPago).toBeNull();
  });

  it('diaPago vacío → diaPago es null', () => {
    const r = normalizarIngreso({ descripcion: 'x', monto: '1', frecuencia: 'Mensual', diaPago: '' });
    expect(r.diaPago).toBeNull();
  });

  it('diaPago en frecuencia no soportada (Diario) → diaPago es null', () => {
    const r = normalizarIngreso({ descripcion: 'x', monto: '1', frecuencia: 'Diario', diaPago: '3' });
    expect(r.diaPago).toBeNull();
  });

  it('con categoria válida → guarda la categoria', () => {
    const r = normalizarIngreso({ descripcion: 'x', monto: '1', frecuencia: 'Mensual', categoria: 'Salario' });
    expect(r.categoria).toBe('Salario');
  });

  it('sin categoria → categoria es null', () => {
    const r = normalizarIngreso({ descripcion: 'x', monto: '1', frecuencia: 'Mensual' });
    expect(r.categoria).toBeNull();
  });

  it('categoria vacía → categoria es null', () => {
    const r = normalizarIngreso({ descripcion: 'x', monto: '1', frecuencia: 'Mensual', categoria: '' });
    expect(r.categoria).toBeNull();
  });

  it('categoria inválida → categoria es null', () => {
    const r = normalizarIngreso({ descripcion: 'x', monto: '1', frecuencia: 'Mensual', categoria: 'Inexistente' });
    expect(r.categoria).toBeNull();
  });
});

// ── validarIngreso() categoria ──────────────────────────────────────

describe('validarIngreso() categoria', () => {
  it('categoria válida → sin errores de categoria', () => {
    const errores = validarIngreso({ descripcion: 'x', monto: '100', frecuencia: 'Mensual', categoria: 'Honorarios' });
    expect(errores).toEqual([]);
  });

  it('categoria vacía → sin errores (es opcional)', () => {
    const errores = validarIngreso({ descripcion: 'x', monto: '100', frecuencia: 'Mensual', categoria: '' });
    expect(errores).toEqual([]);
  });

  it('categoria inválida → error', () => {
    const errores = validarIngreso({ descripcion: 'x', monto: '100', frecuencia: 'Mensual', categoria: 'Inventada' });
    expect(errores).toContain('La categoría seleccionada no es válida.');
  });
});

// ── validarIngreso() / normalizarIngreso() - crédito automático (PA.1b) ──

describe('validarIngreso() - crédito automático (PA.1b, ADR 052 D2)', () => {
  const base = { descripcion: 'Salario', monto: '3500000', frecuencia: 'Mensual' };

  it('creditoAutomatico sin cuentaId → error', () => {
    const errores = validarIngreso({ ...base, creditoAutomatico: 'on' });
    expect(errores).toContain('Elige la cuenta a la que llega el abono automático.');
  });

  it('creditoAutomatico con cuentaId → sin error', () => {
    expect(validarIngreso({ ...base, creditoAutomatico: 'on', cuentaId: 'c1' })).toEqual([]);
  });

  it('sin creditoAutomatico, sin cuentaId → sin error (no aplica la regla)', () => {
    expect(validarIngreso(base)).toEqual([]);
  });

  it('creditoAutomatico true (booleano) sin cuentaId → error', () => {
    const errores = validarIngreso({ ...base, creditoAutomatico: true });
    expect(errores).toContain('Elige la cuenta a la que llega el abono automático.');
  });
});

describe('normalizarIngreso() - crédito automático (PA.1b)', () => {
  it('creditoAutomatico "on" → true', () => {
    const r = normalizarIngreso({ descripcion: 'x', monto: '1', frecuencia: 'Mensual', creditoAutomatico: 'on', cuentaId: 'c1' });
    expect(r.creditoAutomatico).toBe(true);
  });

  it('sin creditoAutomatico → false explícito, no ausente', () => {
    const r = normalizarIngreso({ descripcion: 'x', monto: '1', frecuencia: 'Mensual' });
    expect(r.creditoAutomatico).toBe(false);
    expect('creditoAutomatico' in r).toBe(true);
  });
});

// ── validarIngresoPuntual() (NAV.A1) ────────────────────────────────

describe('validarIngresoPuntual()', () => {
  const base = { monto: '150000', cuentaId: 'c1', fecha: '2026-07-04' };

  it('datos válidos → sin errores', () => {
    expect(validarIngresoPuntual(base)).toEqual([]);
  });

  it('válido con categoría y descripción opcionales', () => {
    expect(validarIngresoPuntual({ ...base, categoria: 'Venta', descripcion: 'Bici' })).toEqual([]);
  });

  it('monto 0 o negativo → error', () => {
    expect(validarIngresoPuntual({ ...base, monto: '0' })).toContain('El monto debe ser un número mayor a 0.');
    expect(validarIngresoPuntual({ ...base, monto: '-5' })).toContain('El monto debe ser un número mayor a 0.');
  });

  it('monto no numérico → error', () => {
    expect(validarIngresoPuntual({ ...base, monto: 'abc' })).toContain('El monto debe ser un número mayor a 0.');
  });

  it('sin cuentaId → error', () => {
    expect(validarIngresoPuntual({ ...base, cuentaId: '' })).toContain('Debes elegir la cuenta donde recibiste el dinero.');
  });

  it('fecha ausente o con formato inválido → error', () => {
    expect(validarIngresoPuntual({ ...base, fecha: '' })).toContain('La fecha es obligatoria.');
    expect(validarIngresoPuntual({ ...base, fecha: '04/07/2026' })).toContain('La fecha es obligatoria.');
  });

  it('categoría inválida → error', () => {
    expect(validarIngresoPuntual({ ...base, categoria: 'Inventada' })).toContain('La categoría seleccionada no es válida.');
  });
});

// ── normalizarIngresoPuntual() (NAV.A1) ─────────────────────────────

describe('normalizarIngresoPuntual()', () => {
  const base = { monto: '150000', cuentaId: 'c1', fecha: '2026-07-04' };

  it('mapea al shape esperado con monto numérico', () => {
    const r = normalizarIngresoPuntual({ ...base, descripcion: 'Venta bici', categoria: 'Venta' });
    expect(r).toEqual({
      descripcion: 'Venta bici',
      monto: 150000,
      categoria: 'Venta',
      cuentaId: 'c1',
      fecha: '2026-07-04',
    });
  });

  it('descripción vacía se autogenera desde la categoría', () => {
    expect(normalizarIngresoPuntual({ ...base, descripcion: '  ', categoria: 'Venta' }).descripcion).toBe('Venta');
  });

  it('sin descripción ni categoría cae a "Ingreso"', () => {
    const r = normalizarIngresoPuntual(base);
    expect(r.descripcion).toBe('Ingreso');
    expect(r.categoria).toBeNull();
  });

  it('categoría inválida se normaliza a null', () => {
    expect(normalizarIngresoPuntual({ ...base, categoria: 'Inventada' }).categoria).toBeNull();
  });
});

// ── calcularSalarioMinimo() ─────────────────────────────────────────

describe('calcularSalarioMinimo()', () => {
  it('sin subsidio devuelve SMMLV sin auxilio', () => {
    const r = calcularSalarioMinimo(false);
    expect(r.smmlv).toBe(SMMLV);
    expect(r.auxilio).toBe(0);
    expect(r.total).toBe(SMMLV);
  });

  it('con subsidio suma el auxilio de transporte', () => {
    const r = calcularSalarioMinimo(true);
    expect(r.smmlv).toBe(SMMLV);
    expect(r.auxilio).toBe(AUXILIO_TRANSPORTE);
    expect(r.total).toBe(SMMLV + AUXILIO_TRANSPORTE);
  });
});

// ── montoSalarioMinimoPorPeriodo() ──────────────────────────────────

describe('montoSalarioMinimoPorPeriodo()', () => {
  it('Mensual devuelve el ancla mensual completa', () => {
    expect(montoSalarioMinimoPorPeriodo(false, 'Mensual')).toBe(SMMLV);
  });

  it('Mensual con subsidio incluye el auxilio', () => {
    expect(montoSalarioMinimoPorPeriodo(true, 'Mensual')).toBe(SMMLV + AUXILIO_TRANSPORTE);
  });

  it('Quincenal divide el ancla entre 2', () => {
    expect(montoSalarioMinimoPorPeriodo(false, 'Quincenal')).toBe(Math.round(SMMLV / 2));
  });

  it('Semanal divide el ancla entre 4.33', () => {
    expect(montoSalarioMinimoPorPeriodo(false, 'Semanal')).toBe(Math.round(SMMLV / 4.33));
  });

  it('Diario divide el ancla entre 30', () => {
    expect(montoSalarioMinimoPorPeriodo(false, 'Diario')).toBe(Math.round(SMMLV / 30));
  });

  it('frecuencia no reconocida cae al valor mensual completo (factor 1)', () => {
    expect(montoSalarioMinimoPorPeriodo(false, 'Anual')).toBe(SMMLV);
  });

  it('el monto por período no duplica el ingreso mensual estimado (regresión MC.8)', () => {
    // Antes del fix, monto = ancla mensual completa y estimarSalarioMensual la
    // multiplicaba por el factor: Quincenal quedaba ≈ 2 × SMMLV.
    const monto    = montoSalarioMinimoPorPeriodo(false, 'Quincenal');
    const estimado = estimarSalarioMensual([{ monto, frecuencia: 'Quincenal', activo: true }]);
    expect(Math.abs(estimado - SMMLV)).toBeLessThanOrEqual(5);
  });
});

// ── CATEGORIAS_INGRESO ──────────────────────────────────────────────

describe('CATEGORIAS_INGRESO', () => {
  it('contiene 12 categorías predefinidas', () => {
    expect(CATEGORIAS_INGRESO).toHaveLength(12);
  });

  it('incluye Salario mínimo (dispara automatización)', () => {
    expect(CATEGORIAS_INGRESO).toContain('Salario mínimo');
  });

  it('todas son strings no vacíos', () => {
    for (const c of CATEGORIAS_INGRESO) {
      expect(typeof c).toBe('string');
      expect(c.length).toBeGreaterThan(0);
    }
  });
});

// ── CATEGORIA_INGRESO_ICONO ──────────────────────────────────────────

describe('CATEGORIA_INGRESO_ICONO', () => {
  it('tiene un ícono para cada categoría de CATEGORIAS_INGRESO', () => {
    for (const c of CATEGORIAS_INGRESO) {
      expect(CATEGORIA_INGRESO_ICONO[c]).toBeTruthy();
      expect(typeof CATEGORIA_INGRESO_ICONO[c]).toBe('string');
    }
  });

  it('no tiene entradas huérfanas fuera del catálogo', () => {
    for (const key of Object.keys(CATEGORIA_INGRESO_ICONO)) {
      expect(CATEGORIAS_INGRESO).toContain(key);
    }
  });
});

// ── renderFormIngreso() - selector de categorías (MC.9, texto plano en ID.3) ──

describe('renderFormIngreso() - selector de categorías', () => {
  it('cada <option> del selector de categoría va en texto plano', () => {
    const html = renderFormIngreso();
    for (const c of CATEGORIAS_INGRESO) {
      expect(html).toContain(`>${c}</option>`);
    }
  });

  it('la categoría seleccionada en edición queda marcada', () => {
    const html = renderFormIngreso({ categoria: 'Arriendo', frecuencia: 'Mensual', descripcion: 'Apto' });
    expect(html).toContain('value="Arriendo" selected');
    expect(html).toContain('>Arriendo</option>');
  });
});

describe('renderListaIngresos() - iconografía de categorías (MC.9, teja en ID.3)', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="lista-ingresos"></div>';
    S.ingresos = [];
  });

  it('muestra la teja de la categoría (tinte de ingresos) y su nombre en el subtítulo', () => {
    S.ingresos = [{
      id: 'i1', descripcion: 'Apto centro', monto: 1_200_000,
      frecuencia: 'Mensual', categoria: 'Arriendo', activo: true,
    }];
    renderListaIngresos();
    const teja = document.querySelector('.list-item__icon .cat-teja');
    expect(teja).not.toBeNull();
    expect(teja.getAttribute('data-dom')).toBe('ingresos');
    expect(teja.innerHTML).toContain(`#${CATEGORIA_INGRESO_ICONO['Arriendo']}`);
    expect(document.querySelector('.list-item__subtitle').textContent).toContain('· Arriendo');
  });

  it('sin categoría no muestra separador y la teja cae a la moneda i-saldo', () => {
    S.ingresos = [{
      id: 'i2', descripcion: 'Freelance', monto: 500_000,
      frecuencia: 'Quincenal', categoria: null, activo: true,
    }];
    renderListaIngresos();
    const html = document.getElementById('lista-ingresos').innerHTML;
    expect(document.querySelector('.list-item__subtitle').textContent).not.toContain('·');
    expect(html).toContain('#i-saldo');
  });
});

describe('renderListaIngresos() - MC.15 (20): sin subtítulo redundante', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="lista-ingresos"></div>';
    S.ingresos = [];
  });

  it('descripción igual a la categoría (mismo texto): el subtítulo omite la categoría', () => {
    S.ingresos = [{
      id: 'i3', descripcion: 'Salario mínimo', monto: 1_300_000,
      frecuencia: 'Quincenal', categoria: 'Salario mínimo', activo: true,
    }];
    renderListaIngresos();
    const el = document.getElementById('lista-ingresos');
    expect(el.querySelector('.list-item__title').textContent).toBe('Salario mínimo');
    expect(el.querySelector('.list-item__subtitle').textContent).toBe('Quincenal');
  });

  it('coincide ignorando mayúsculas/espacios: igual se omite', () => {
    S.ingresos = [{
      id: 'i4', descripcion: '  salario mínimo  ', monto: 1_300_000,
      frecuencia: 'Mensual', categoria: 'Salario mínimo', activo: true,
    }];
    renderListaIngresos();
    expect(document.querySelector('.list-item__subtitle').textContent).toBe('Mensual');
  });

  it('descripción distinta de la categoría: el subtítulo conserva ambas', () => {
    S.ingresos = [{
      id: 'i5', descripcion: 'Sueldo Claro', monto: 1_300_000,
      frecuencia: 'Quincenal', categoria: 'Salario mínimo', activo: true,
    }];
    renderListaIngresos();
    expect(document.querySelector('.list-item__subtitle').textContent).toBe('Quincenal · Salario mínimo');
  });
});

// ── renderListaIngresos()/renderListaIngresosPuntuales() - MC.18d: ──
// ── máscara de privacidad compartida (ADR 035 D5) ────────────────

describe('renderListaIngresos() / renderListaIngresosPuntuales() - máscara del ojo (MC.18d, ADR 035 D5)', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="lista-ingresos"></div><div id="lista-ingresos-puntuales"></div>';
    S.ingresos = [{
      id: 'i1', descripcion: 'Salario empresa', monto: 1_850_000,
      frecuencia: 'Mensual', categoria: null, activo: true,
    }];
    S.ingresosPuntuales = [{
      id: 'p1', descripcion: 'Venta de la bici', monto: 450_000,
      fecha: '2026-07-05', categoria: null, cuentaId: null,
    }];
    S.config = { ...(S.config ?? {}), ocultarSaldo: false };
  });

  afterEach(() => {
    S.config.ocultarSaldo = false;
  });

  it('con el saldo visible, muestra los montos reales', () => {
    renderListaIngresos();
    renderListaIngresosPuntuales();
    expect(document.querySelector('#lista-ingresos .list-item__value').textContent).toBe('$1.850.000');
    expect(document.querySelector('#lista-ingresos-puntuales .list-item__value').textContent).toBe('+$450.000');
  });

  it('con S.config.ocultarSaldo, enmascara ambos montos sin exponer la cifra real', () => {
    S.config.ocultarSaldo = true;
    renderListaIngresos();
    renderListaIngresosPuntuales();
    expect(document.querySelector('#lista-ingresos .list-item__value').textContent).toBe('••••');
    expect(document.querySelector('#lista-ingresos-puntuales .list-item__value').textContent).toBe('+••••');
    expect(document.getElementById('lista-ingresos').innerHTML).not.toContain('1.850.000');
    expect(document.getElementById('lista-ingresos-puntuales').innerHTML).not.toContain('450.000');
  });
});

// ── MC-DIS.9 C5 y C6: un solo vacío bajo el encabezado único, e ícono ─

// ── renderAltasIngreso() - ADR 080 D2 (ficha 06, regla R87) ───────

describe('renderAltasIngreso()', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="ingresos-altas"></div>';
  });

  it('emite dos altas y ninguna es primaria: el único primario es "Nueva cuenta"', () => {
    renderAltasIngreso();
    const botones = document.querySelectorAll('#ingresos-altas button');
    expect(botones).toHaveLength(2);
    expect(document.querySelectorAll('#ingresos-altas .btn-primary')).toHaveLength(0);
  });

  it('la fuente fija es un alta de regla y vive en esta sección', () => {
    renderAltasIngreso();
    const boton = document.querySelector('[data-action="nuevo-ingreso"]');
    expect(boton).not.toBeNull();
    expect(boton.textContent).toContain('Fuente fija');
    // No es un atajo: la regla pertenece a la lista que la administra.
    expect(boton.querySelector('.chip')).toBeNull();
  });

  it('el ingreso puntual se declara atajo con la etiqueta de la teja de Registrar (R72)', () => {
    renderAltasIngreso();
    const boton = document.querySelector('[data-action="nuevo-ingreso-puntual"]');
    expect(boton).not.toBeNull();
    expect(boton.textContent).toContain('Ingreso');
    expect(boton.querySelector('.chip')?.textContent.trim()).toBe('Atajo');
    // Mismo ícono que la teja "Ingreso" de la hoja Registrar.
    expect(boton.innerHTML).toContain('#i-saldo');
  });

  it('no-op si el contenedor no existe', () => {
    document.body.innerHTML = '';
    expect(() => renderAltasIngreso()).not.toThrow();
  });
});

describe('renderListaIngresos() / renderListaIngresosPuntuales() - un solo estado vacío (MC-DIS.9 C5)', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="lista-ingresos"></div><div id="lista-ingresos-puntuales"></div>';
    S.ingresos = [];
    S.ingresosPuntuales = [];
  });

  it('con las dos listas vacías, emite un mensaje único que nombra las dos entradas', () => {
    renderListaIngresos();
    renderListaIngresosPuntuales();
    const fijos     = document.getElementById('lista-ingresos');
    const puntuales = document.getElementById('lista-ingresos-puntuales');
    expect(fijos.querySelectorAll('.empty-state')).toHaveLength(1);
    expect(fijos.querySelector('.empty-state__desc').textContent)
      .toBe('Aún no registras de dónde entra tu dinero. Agrega un ingreso fijo para tu salario o arriendo, o uno puntual para una venta o un trabajo suelto.');
    expect(puntuales.innerHTML).toBe('');
  });

  it('con ingresos fijos y ningún puntual, cada lista conserva su propio vacío', () => {
    S.ingresos = [{
      id: 'i1', descripcion: 'Salario empresa', monto: 1_850_000,
      frecuencia: 'Mensual', categoria: null, activo: true,
    }];
    renderListaIngresos();
    renderListaIngresosPuntuales();
    expect(document.querySelectorAll('#lista-ingresos .empty-state')).toHaveLength(0);
    expect(document.querySelector('#lista-ingresos-puntuales .empty-state__desc').textContent)
      .toContain('Sin ingresos puntuales registrados');
  });

  it('con puntuales y ningún fijo, el vacío de fijos vuelve a su copy propio', () => {
    S.ingresosPuntuales = [{
      id: 'p1', descripcion: 'Venta de la bici', monto: 450_000,
      fecha: '2026-07-05', categoria: null, cuentaId: null,
    }];
    renderListaIngresos();
    renderListaIngresosPuntuales();
    expect(document.querySelector('#lista-ingresos .empty-state__desc').textContent)
      .toContain('Sin fuentes de ingreso registradas');
  });

  // MC-DIS.9 C6: el 📅 pasa a i-agenda del sprite (MC.18b lo hizo en la
  // tarjeta de cuenta y dejó intacta esta lista, en la misma pantalla).
  it('el hint del día de pago usa el ícono del sprite, no el emoji', () => {
    S.ingresos = [{
      id: 'i1', descripcion: 'Salario empresa', monto: 1_850_000,
      frecuencia: 'Mensual', diaPago: 30, categoria: null, activo: true,
    }];
    renderListaIngresos();
    const hint = document.querySelector('#lista-ingresos .list-item__hint');
    expect(hint.classList.contains('list-item__hint--icono')).toBe(true);
    expect(hint.innerHTML).toContain('#i-agenda');
    expect(hint.textContent).not.toContain('📅');
    expect(hint.textContent.trim()).toBe('día 30 de cada período');
  });
});

// ── diasParaProximoPago() ─────────────────────────────────────────

describe('diasParaProximoPago()', () => {
  it('Mensual: diaPago en el mismo mes, días positivos', () => {
    const hoy = new Date(2026, 5, 25); // 25 jun 2026
    const r = diasParaProximoPago('Mensual', 30, hoy);
    expect(r).not.toBeNull();
    expect(r.dias).toBe(5);
    expect(r.fechaISO).toBe('2026-06-30');
  });

  it('Mensual: diaPago es hoy → 0 días', () => {
    const hoy = new Date(2026, 5, 30); // 30 jun 2026
    const r = diasParaProximoPago('Mensual', 30, hoy);
    expect(r.dias).toBe(0);
    expect(r.fechaISO).toBe('2026-06-30');
  });

  it('Mensual: diaPago ya pasó este mes → pasa al mes siguiente', () => {
    const hoy = new Date(2026, 6, 1); // 1 jul 2026
    const r = diasParaProximoPago('Mensual', 30, hoy);
    expect(r.dias).toBe(29);
    expect(r.fechaISO).toBe('2026-07-30');
  });

  it('Mensual: diaPago 31 en mes de 30 días → se ajusta al último día', () => {
    const hoy = new Date(2026, 5, 1); // 1 jun 2026 (junio tiene 30 días)
    const r = diasParaProximoPago('Mensual', 31, hoy);
    expect(r.fechaISO).toBe('2026-06-30');
    expect(r.dias).toBe(29);
  });

  it('Mensual: diaPago 31 en febrero → se ajusta al 28', () => {
    const hoy = new Date(2026, 1, 1); // 1 feb 2026
    const r = diasParaProximoPago('Mensual', 31, hoy);
    expect(r.fechaISO).toBe('2026-02-28');
  });

  it('Quincenal: próximo es el primer día de quincena', () => {
    const hoy = new Date(2026, 5, 10); // 10 jun 2026
    const r = diasParaProximoPago('Quincenal', 15, hoy);
    expect(r.dias).toBe(5);
    expect(r.fechaISO).toBe('2026-06-15');
  });

  it('Quincenal: primer día ya pasó → próximo es diaPago+15', () => {
    const hoy = new Date(2026, 5, 20); // 20 jun 2026
    const r = diasParaProximoPago('Quincenal', 15, hoy);
    expect(r.dias).toBe(10);
    expect(r.fechaISO).toBe('2026-06-30');
  });

  it('Quincenal: ambos días del mes pasaron → pasa al mes siguiente', () => {
    const hoy = new Date(2026, 6, 1); // 1 jul 2026
    const r = diasParaProximoPago('Quincenal', 15, hoy);
    expect(r.fechaISO).toBe('2026-07-15');
  });

  it('devuelve null si diaPago es null', () => {
    expect(diasParaProximoPago('Mensual', null)).toBeNull();
  });

  it('devuelve null para frecuencia no soportada (Bimestral)', () => {
    expect(diasParaProximoPago('Bimestral', 15)).toBeNull();
  });

  it('devuelve null para frecuencia no soportada (Semanal)', () => {
    expect(diasParaProximoPago('Semanal', 3)).toBeNull();
  });
});

// ── detectarNudgeProximoIngreso() ─────────────────────────────────

describe('detectarNudgeProximoIngreso()', () => {
  const hoy = new Date(2026, 5, 25); // 25 jun 2026

  it('lista vacía → null', () => {
    expect(detectarNudgeProximoIngreso([], hoy)).toBeNull();
  });

  it('argumento no-array → null', () => {
    expect(detectarNudgeProximoIngreso(null, hoy)).toBeNull();
  });

  it('ingreso con diaPago null → null', () => {
    const ingresos = [{ id: 'i1', descripcion: 'Salario', monto: 3_000_000, frecuencia: 'Mensual', activo: true, diaPago: null }];
    expect(detectarNudgeProximoIngreso(ingresos, hoy)).toBeNull();
  });

  it('ingreso con frecuencia no soportada (Semanal) → null', () => {
    const ingresos = [{ id: 'i1', descripcion: 'Jornada', monto: 50_000, frecuencia: 'Semanal', activo: true, diaPago: 3 }];
    expect(detectarNudgeProximoIngreso(ingresos, hoy)).toBeNull();
  });

  it('ingreso inactivo → excluido → null', () => {
    const ingresos = [{ id: 'i1', descripcion: 'Salario', monto: 3_000_000, frecuencia: 'Mensual', activo: false, diaPago: 30 }];
    expect(detectarNudgeProximoIngreso(ingresos, hoy)).toBeNull();
  });

  it('ingreso activo con diaPago → devuelve principal', () => {
    const ingresos = [{ id: 'i1', descripcion: 'Salario', monto: 3_000_000, frecuencia: 'Mensual', activo: true, diaPago: 30 }];
    const r = detectarNudgeProximoIngreso(ingresos, hoy);
    expect(r).not.toBeNull();
    expect(r.principal.descripcion).toBe('Salario');
    expect(r.principal.dias).toBe(5);
    expect(r.otrosProximos).toBe(0);
  });

  it('múltiples ingresos → principal es el más próximo', () => {
    const ingresos = [
      { id: 'i1', descripcion: 'Arriendo', monto: 800_000, frecuencia: 'Mensual', activo: true, diaPago: 30 },
      { id: 'i2', descripcion: 'Salario', monto: 3_000_000, frecuencia: 'Quincenal', activo: true, diaPago: 25 },
    ];
    const r = detectarNudgeProximoIngreso(ingresos, hoy);
    // hoy=25jun: Salario-quincenal→día 25 (hoy, 0 días), Arriendo-mensual→día 30 (5 días)
    expect(r.principal.descripcion).toBe('Salario');
    expect(r.principal.dias).toBe(0);
  });

  it('otro ingreso dentro de 7 días → otrosProximos > 0', () => {
    const ingresos = [
      { id: 'i1', descripcion: 'Salario', monto: 3_000_000, frecuencia: 'Quincenal', activo: true, diaPago: 25 },
      { id: 'i2', descripcion: 'Arriendo', monto: 800_000, frecuencia: 'Mensual', activo: true, diaPago: 30 },
    ];
    const r = detectarNudgeProximoIngreso(ingresos, hoy);
    // Salario→0 días, Arriendo→5 días (ambos dentro de 7)
    expect(r.otrosProximos).toBe(1);
  });

  it('otro ingreso más allá de 7 días → otrosProximos = 0', () => {
    const ingresos = [
      { id: 'i1', descripcion: 'Salario', monto: 3_000_000, frecuencia: 'Mensual', activo: true, diaPago: 26 },
      { id: 'i2', descripcion: 'Arriendo', monto: 800_000, frecuencia: 'Mensual', activo: true, diaPago: 10 },
    ];
    // hoy=25jun: Salario→26jun(1 día), Arriendo→siguiente mes (10 jul = 15 días)
    const r = detectarNudgeProximoIngreso(ingresos, hoy);
    expect(r.principal.descripcion).toBe('Salario');
    expect(r.otrosProximos).toBe(0);
  });
});

// ── ultimoPagoHasta() (MC.4d) ─────────────────────────────────────

describe('ultimoPagoHasta()', () => {
  it('Mensual: el día de pago ya pasó este mes → ese mismo día', () => {
    const hoy = new Date(2026, 6, 5); // 5 jul 2026
    expect(ultimoPagoHasta({ frecuencia: 'Mensual', diaPago: 30 }, hoy)).toBe('2026-06-30');
  });

  it('Mensual: hoy es el día de pago → hoy', () => {
    const hoy = new Date(2026, 5, 30); // 30 jun 2026
    expect(ultimoPagoHasta({ frecuencia: 'Mensual', diaPago: 30 }, hoy)).toBe('2026-06-30');
  });

  it('Mensual: el día de pago aún no llega este mes → el del mes anterior', () => {
    const hoy = new Date(2026, 5, 10); // 10 jun 2026
    expect(ultimoPagoHasta({ frecuencia: 'Mensual', diaPago: 30 }, hoy)).toBe('2026-05-30');
  });

  it('Mensual: día 31 en mes corto → último día del mes', () => {
    const hoy = new Date(2026, 1, 15); // 15 feb 2026
    expect(ultimoPagoHasta({ frecuencia: 'Mensual', diaPago: 31 }, hoy)).toBe('2026-01-31');
  });

  it('Quincenal: tras la segunda quincena → día+15', () => {
    const hoy = new Date(2026, 5, 20); // 20 jun 2026
    expect(ultimoPagoHasta({ frecuencia: 'Quincenal', diaPago: 15 }, hoy)).toBe('2026-06-15');
  });

  it('Quincenal: entre las dos quincenas del mes → primera quincena', () => {
    const hoy = new Date(2026, 5, 16); // 16 jun 2026
    expect(ultimoPagoHasta({ frecuencia: 'Quincenal', diaPago: 15 }, hoy)).toBe('2026-06-15');
  });

  it('null cuando no hay diaPago', () => {
    expect(ultimoPagoHasta({ frecuencia: 'Mensual', diaPago: null }, new Date(2026, 5, 20))).toBeNull();
  });

  it('Anual: ya se data desde MC.13c-3, con el ciclo desde fechaCreacion', () => {
    const ingreso = { frecuencia: 'Anual', diaPago: 15, fechaCreacion: '2026-01-10' };
    expect(ultimoPagoHasta(ingreso, new Date(2026, 5, 20))).toBe('2026-01-15');
  });

  it('null para frecuencia sin día del mes (Semanal)', () => {
    expect(ultimoPagoHasta({ frecuencia: 'Semanal', diaPago: 3 }, new Date(2026, 5, 20))).toBeNull();
  });
});

// ── estadoDistribucion() (MC.4d) ──────────────────────────────────

describe('estadoDistribucion()', () => {
  const hoy = new Date(2026, 6, 5); // 5 jul 2026; cobro mensual día 30 → 30 jun

  it('sin-fecha: ningún ingreso con día de pago', () => {
    const ingresos = [{ id: 'i1', descripcion: 'Salario', frecuencia: 'Mensual', activo: true, diaPago: null }];
    const r = estadoDistribucion(ingresos, null, hoy);
    expect(r.estado).toBe('sin-fecha');
    expect(r.periodoISO).toBeNull();
  });

  it('sin-fecha: argumento no-array', () => {
    expect(estadoDistribucion(null, null, hoy).estado).toBe('sin-fecha');
  });

  it('sin-fecha: solo frecuencias sin día del mes (Semanal, Diario)', () => {
    const ingresos = [
      { id: 'i1', descripcion: 'Ventas',   frecuencia: 'Semanal', activo: true, diaPago: 3 },
      { id: 'i2', descripcion: 'Propinas', frecuencia: 'Diario',  activo: true, diaPago: 1 },
    ];
    expect(estadoDistribucion(ingresos, null, hoy).estado).toBe('sin-fecha');
  });

  it('MC.13c-3: una frecuencia larga ya se data y gana su guard de de-duplicación', () => {
    // Anual con día 15 creado en enero: el cobro del 15 ene es el último. Antes
    // de MC.13c-3 caía en 'sin-fecha' y la acción quedaba sin llave de de-dup,
    // así que el mismo cobro se podía repartir cuantas veces se abriera.
    const ingresos = [{ id: 'i1', descripcion: 'Arriendo anual', frecuencia: 'Anual', activo: true, diaPago: 15, fechaCreacion: '2026-01-10T00:00:00.000Z' }];
    expect(estadoDistribucion(ingresos, null, hoy)).toMatchObject({
      estado: 'listo', periodoISO: '2026-01-15',
    });
    expect(estadoDistribucion(ingresos, '2026-01-15', hoy).estado).toBe('distribuido');
  });

  it('MC.13c-3: el ingreso más reciente manda cuando conviven Mensual y Semestral', () => {
    const ingresos = [
      { id: 'i1', descripcion: 'Salario',   frecuencia: 'Mensual',   activo: true, diaPago: 30, fechaCreacion: '2026-01-01T00:00:00.000Z' },
      { id: 'i2', descripcion: 'Dividendo', frecuencia: 'Semestral', activo: true, diaPago: 10, fechaCreacion: '2026-01-05T00:00:00.000Z' },
    ];
    expect(estadoDistribucion(ingresos, null, hoy).periodoISO).toBe('2026-06-30');
  });

  it('listo: el cobro del periodo ya llegó y no se ha distribuido', () => {
    const ingresos = [{ id: 'i1', descripcion: 'Salario', frecuencia: 'Mensual', activo: true, diaPago: 30, fechaCreacion: '2026-01-01T00:00:00.000Z' }];
    const r = estadoDistribucion(ingresos, null, hoy);
    expect(r.estado).toBe('listo');
    expect(r.periodoISO).toBe('2026-06-30');
    expect(r.esHoy).toBe(false);
  });

  it('listo con esHoy cuando el cobro es hoy', () => {
    const hoyPago = new Date(2026, 5, 30); // 30 jun 2026
    const ingresos = [{ id: 'i1', descripcion: 'Salario', frecuencia: 'Mensual', activo: true, diaPago: 30, fechaCreacion: '2026-01-01T00:00:00.000Z' }];
    const r = estadoDistribucion(ingresos, null, hoyPago);
    expect(r.estado).toBe('listo');
    expect(r.esHoy).toBe(true);
  });

  it('distribuido: el periodo ya distribuido coincide con la marca', () => {
    const ingresos = [{ id: 'i1', descripcion: 'Salario', frecuencia: 'Mensual', activo: true, diaPago: 30, fechaCreacion: '2026-01-01T00:00:00.000Z' }];
    const r = estadoDistribucion(ingresos, '2026-06-30', hoy);
    expect(r.estado).toBe('distribuido');
    expect(r.periodoISO).toBe('2026-06-30');
  });

  it('por-confirmar: ingreso creado después del último cobro, con la fecha candidata (MC.13f)', () => {
    // Creado el 2 jul; el último día 30 (30 jun) es anterior a la creación, así
    // que no se data solo: se ofrece como candidato para que el usuario confirme.
    const ingresos = [{ id: 'i1', descripcion: 'Salario', frecuencia: 'Mensual', activo: true, diaPago: 30, fechaCreacion: '2026-07-02T00:00:00.000Z' }];
    const r = estadoDistribucion(ingresos, null, hoy);
    expect(r.estado).toBe('por-confirmar');
    expect(r.periodoISO).toBe('2026-06-30');
    expect(r.esHoy).toBe(false);
  });

  it('MC.13f: confirmar el candidato lo vuelve un cobro recibido (listo)', () => {
    const ingresos = [{ id: 'i1', descripcion: 'Salario', frecuencia: 'Mensual', activo: true, diaPago: 30, fechaCreacion: '2026-07-02T00:00:00.000Z' }];
    const r = estadoDistribucion(ingresos, null, hoy, '2026-06-30');
    expect(r.estado).toBe('listo');
    expect(r.periodoISO).toBe('2026-06-30');
  });

  it('MC.13f: confirmar otra fecha no desbloquea el candidato vigente', () => {
    const ingresos = [{ id: 'i1', descripcion: 'Salario', frecuencia: 'Mensual', activo: true, diaPago: 30, fechaCreacion: '2026-07-02T00:00:00.000Z' }];
    const r = estadoDistribucion(ingresos, null, hoy, '2026-05-30');
    expect(r.estado).toBe('por-confirmar');
    expect(r.periodoISO).toBe('2026-06-30');
  });

  it('MC.13f: un cobro confirmado y ya distribuido no se puede repartir dos veces', () => {
    const ingresos = [{ id: 'i1', descripcion: 'Salario', frecuencia: 'Mensual', activo: true, diaPago: 30, fechaCreacion: '2026-07-02T00:00:00.000Z' }];
    const r = estadoDistribucion(ingresos, '2026-06-30', hoy, '2026-06-30');
    expect(r.estado).toBe('distribuido');
    expect(r.periodoISO).toBe('2026-06-30');
  });

  it('MC.13f: una confirmación vieja no estorba a un cobro datado después', () => {
    // Creado el 1 ene: el cobro del 30 jun se data solo. La confirmación de un
    // periodo anterior no debe cambiar ni el estado ni la llave de de-dup.
    const ingresos = [{ id: 'i1', descripcion: 'Salario', frecuencia: 'Mensual', activo: true, diaPago: 30, fechaCreacion: '2026-01-01T00:00:00.000Z' }];
    const r = estadoDistribucion(ingresos, null, hoy, '2026-05-30');
    expect(r.estado).toBe('listo');
    expect(r.periodoISO).toBe('2026-06-30');
  });

  it('MC.13f: con varios candidatos descartados se ofrece el más reciente', () => {
    const ingresos = [
      { id: 'i1', descripcion: 'Arriendo', frecuencia: 'Mensual', activo: true, diaPago: 1, fechaCreacion: '2026-07-04T00:00:00.000Z' },
      { id: 'i2', descripcion: 'Salario',  frecuencia: 'Mensual', activo: true, diaPago: 3, fechaCreacion: '2026-07-04T00:00:00.000Z' },
    ];
    // hoy=5 jul: candidatos 1 jul y 3 jul, ambos anteriores a la creación (4 jul).
    const r = estadoDistribucion(ingresos, null, hoy);
    expect(r.estado).toBe('por-confirmar');
    expect(r.periodoISO).toBe('2026-07-03');
  });

  it('MC.13f: un cobro datable convive con un candidato descartado sin preguntar', () => {
    const ingresos = [
      { id: 'i1', descripcion: 'Salario', frecuencia: 'Mensual', activo: true, diaPago: 30, fechaCreacion: '2026-01-01T00:00:00.000Z' },
      { id: 'i2', descripcion: 'Extra',   frecuencia: 'Mensual', activo: true, diaPago: 3,  fechaCreacion: '2026-07-04T00:00:00.000Z' },
    ];
    const r = estadoDistribucion(ingresos, null, hoy);
    expect(r.estado).toBe('listo');
    expect(r.periodoISO).toBe('2026-06-30');
  });

  it('toma el cobro más reciente entre varios ingresos', () => {
    const ingresos = [
      { id: 'i1', descripcion: 'Arriendo', frecuencia: 'Mensual', activo: true, diaPago: 5, fechaCreacion: '2026-01-01T00:00:00.000Z' },
      { id: 'i2', descripcion: 'Salario', frecuencia: 'Mensual', activo: true, diaPago: 30, fechaCreacion: '2026-01-01T00:00:00.000Z' },
    ];
    // hoy=5 jul: Arriendo→5 jul, Salario→30 jun. El más reciente es 5 jul.
    const r = estadoDistribucion(ingresos, null, hoy);
    expect(r.periodoISO).toBe('2026-07-05');
    expect(r.esHoy).toBe(true);
  });

  it('ingreso inactivo no cuenta para el estado', () => {
    const ingresos = [{ id: 'i1', descripcion: 'Salario', frecuencia: 'Mensual', activo: false, diaPago: 30, fechaCreacion: '2026-01-01T00:00:00.000Z' }];
    expect(estadoDistribucion(ingresos, null, hoy).estado).toBe('sin-fecha');
  });
});

// ── renderNudgeDistribucionInicio() (CAL.1, ADR 028 D4) ───────────

describe('renderNudgeDistribucionInicio()', () => {
  const elNudge = () => document.getElementById('panel-distribuir-inicio');

  beforeEach(() => {
    document.body.innerHTML = '<div id="panel-distribuir-inicio" hidden></div>';
    S.ingresos = [];
    S.config   = { notificaciones: false };
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('no-op si el contenedor no existe', () => {
    document.body.innerHTML = '';
    expect(() => renderNudgeDistribucionInicio()).not.toThrow();
  });

  it('oculto sin ingresos con día de pago (sin-fecha)', () => {
    renderNudgeDistribucionInicio();
    expect(elNudge().hidden).toBe(true);
    expect(elNudge().innerHTML).toBe('');
  });

  it('oculto mientras el cobro del periodo aún no llega (pendiente)', () => {
    vi.setSystemTime(new Date(2026, 6, 5)); // 5 jul
    S.ingresos = [{ id: 'i1', descripcion: 'Salario', frecuencia: 'Mensual', activo: true, diaPago: 30, fechaCreacion: '2026-07-02T00:00:00.000Z' }];
    renderNudgeDistribucionInicio();
    expect(elNudge().hidden).toBe(true);
  });

  it('visible con "Hoy recibes tu ingreso" cuando el cobro es hoy', () => {
    vi.setSystemTime(new Date(2026, 5, 30)); // 30 jun, coincide con diaPago
    S.ingresos = [{ id: 'i1', descripcion: 'Salario', frecuencia: 'Mensual', activo: true, diaPago: 30, fechaCreacion: '2026-01-01T00:00:00.000Z' }];
    renderNudgeDistribucionInicio();
    expect(elNudge().hidden).toBe(false);
    expect(elNudge().innerHTML).toContain('Hoy recibes tu ingreso');
    expect(elNudge().querySelector('[data-action="distribuir-desde-inicio"]')).not.toBeNull();
  });

  it('visible con la fecha del cobro cuando ya pasó (atrasado, sin distribuir)', () => {
    vi.setSystemTime(new Date(2026, 6, 5)); // 5 jul; cobro mensual día 30 → 30 jun
    S.ingresos = [{ id: 'i1', descripcion: 'Salario', frecuencia: 'Mensual', activo: true, diaPago: 30, fechaCreacion: '2026-01-01T00:00:00.000Z' }];
    renderNudgeDistribucionInicio();
    expect(elNudge().hidden).toBe(false);
    expect(elNudge().innerHTML).toContain('Recibiste tu ingreso el');
    expect(elNudge().innerHTML).not.toContain('Hoy recibes');
  });

  it('oculto una vez distribuido el periodo (guard de-dup, mismo marcador que Mis cuentas)', () => {
    vi.setSystemTime(new Date(2026, 6, 5));
    S.ingresos = [{ id: 'i1', descripcion: 'Salario', frecuencia: 'Mensual', activo: true, diaPago: 30, fechaCreacion: '2026-01-01T00:00:00.000Z' }];
    S.config.ultimaDistribucionPeriodo = '2026-06-30';
    renderNudgeDistribucionInicio();
    expect(elNudge().hidden).toBe(true);
  });

  it('el CTA emite distribuir:abrir (mismo evento que el recordatorio del Calendario, ADR 021)', () => {
    vi.setSystemTime(new Date(2026, 5, 30));
    S.ingresos = [{ id: 'i1', descripcion: 'Salario', frecuencia: 'Mensual', activo: true, diaPago: 30, fechaCreacion: '2026-01-01T00:00:00.000Z' }];
    renderNudgeDistribucionInicio();

    initAccionesDistribucion();
    const spy = vi.fn();
    EventBus.on('distribuir:abrir', spy);

    const boton = elNudge().querySelector('[data-action="distribuir-desde-inicio"]');
    dispatch(boton, new Event('click'));

    expect(spy).toHaveBeenCalledTimes(1);
  });
});

// ── renderDistribucionIngreso() - tarjeta de Mis cuentas (MC.13e-2a) ──

describe('renderDistribucionIngreso() - tarjeta sin accesos cruzados (punto 11)', () => {
  const elCard = () => document.getElementById('ingresos-distribucion');

  beforeEach(() => {
    document.body.innerHTML = '<div id="ingresos-distribucion"></div>';
    S.ingresos = [{ id: 'i1', descripcion: 'Salario', monto: 3_000_000, frecuencia: 'Mensual', activo: true }];
    S.cuentas  = [];
    S.metas = []; S.apartados = []; S.compromisos = []; S.inversiones = [];
    S.ahorro = { fondoEmergencia: { activo: false } };
    S.config = { ...S.config };
  });

  it('no renderiza ningún acceso cruzado ("Ver progreso del fondo", "Ver tu seguimiento en Límites de gasto"...)', () => {
    renderDistribucionIngreso();
    expect(elCard().querySelector('.distribucion-ctas')).toBeNull();
    expect(elCard().innerHTML).not.toContain('Ver tu seguimiento en Límites de gasto');
    expect(elCard().innerHTML).not.toContain('href="#presupuesto"');
  });

  it('el aviso "recibiste tu ingreso" es un bloque aparte de la tarjeta (punto 12)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 6, 10));
    S.ingresos = [{ id: 'i1', descripcion: 'Salario', monto: 3_000_000, frecuencia: 'Mensual', activo: true, diaPago: 5, fechaCreacion: '2026-01-01T00:00:00.000Z' }];
    renderDistribucionIngreso();

    const aviso = elCard().querySelector('.distribuir-aviso');
    expect(aviso).not.toBeNull();
    expect(aviso.textContent).toContain('Recibiste tu ingreso el');
    // El aviso no vive dentro de .distribuir-card: son dos bloques separados.
    expect(elCard().querySelector('.distribuir-card .distribuir-aviso')).toBeNull();
    // La tarjeta mantiene su invitación genérica, no la duplica.
    expect(elCard().querySelector('.distribuir-card__sub').textContent)
      .toBe('Reparte tu ingreso entre necesidades, estilo de vida y ahorro.');
    vi.useRealTimers();
  });

  it('sin fecha datable, no hay aviso pero la tarjeta sigue mostrándose', () => {
    renderDistribucionIngreso();
    expect(elCard().querySelector('.distribuir-aviso')).toBeNull();
    expect(elCard().querySelector('.distribuir-card')).not.toBeNull();
  });

  // MC-DIS.9 C10 (regla R24): el aviso es informativo y estable, y la tarjeta
  // se repinta en cada state:change de la sección.
  it('el aviso no es una región viva', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 6, 10));
    S.ingresos = [{ id: 'i1', descripcion: 'Salario', monto: 3_000_000, frecuencia: 'Mensual', activo: true, diaPago: 5, fechaCreacion: '2026-01-01T00:00:00.000Z' }];
    renderDistribucionIngreso();
    expect(elCard().querySelector('.distribuir-aviso').getAttribute('role')).toBeNull();
    vi.useRealTimers();
  });

  // MC-DIS.9 C6: ⚠ pasa a i-alert del sprite. La alerta de fondo incompleto
  // aparece cuando el fondo está activo y aún no llega a su meta.
  it('las alertas de la tarjeta usan el ícono del sprite, no el emoji', () => {
    S.ahorro = {
      fondoEmergencia: { activo: true, montoActual: 0, mesesObjetivo: 3 },
    };
    S.compromisos = [{
      id: 'k1', descripcion: 'Arriendo', monto: 900_000,
      tipo: 'fijo', frecuencia: 'Mensual', diaPago: 5, activo: true,
    }];
    renderDistribucionIngreso();
    const alertas = elCard().querySelectorAll('.distribucion-alerta');
    expect(alertas.length).toBeGreaterThan(0);
    alertas.forEach(a => {
      expect(a.innerHTML).toContain('#i-alert');
      expect(a.textContent).not.toContain('⚠');
    });
  });

  // MC.13f: registrar un ingreso a mitad de periodo (la quincena ya cobrada)
  // dejaba la tarjeta en un aviso de espera sin salida hasta el cobro siguiente.
  it('MC.13f: con un cobro anterior a la creación, la tarjeta pregunta en vez de hacer esperar', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 6, 10)); // 10 jul
    S.ingresos = [{ id: 'i1', descripcion: 'Salario', monto: 3_000_000, frecuencia: 'Mensual', activo: true, diaPago: 5, fechaCreacion: '2026-07-08T00:00:00.000Z' }];
    renderDistribucionIngreso();

    const cta = elCard().querySelector('[data-action="confirmar-cobro-recibido"]');
    expect(cta).not.toBeNull();
    expect(cta.dataset.periodo).toBe('2026-07-05');
    expect(elCard().textContent).toContain('no sabemos si ese pago te llegó');
    expect(elCard().textContent).not.toContain('cuando recibas tu próximo pago');
    vi.useRealTimers();
  });

  it('MC.13f: confirmado el cobro, la tarjeta vuelve a ofrecer distribuir', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 6, 10));
    S.ingresos = [{ id: 'i1', descripcion: 'Salario', monto: 3_000_000, frecuencia: 'Mensual', activo: true, diaPago: 5, fechaCreacion: '2026-07-08T00:00:00.000Z' }];
    S.config = { ...S.config, cobroConfirmadoPeriodo: '2026-07-05' };
    renderDistribucionIngreso();

    expect(elCard().querySelector('[data-action="confirmar-cobro-recibido"]')).toBeNull();
    expect(elCard().querySelector('.distribuir-aviso').textContent).toContain('Recibiste tu ingreso el');
    vi.useRealTimers();
  });

  it('un ingreso quincenal muestra UNA quincena, no el mes (BUG-2)', () => {
    // `monto` es por período: la quincena vale 1.000.000; el mes-equivalente son
    // 2.000.000. La tarjeta y el asistente reparten el cobro, no el mes.
    S.ingresos = [{ id: 'i1', descripcion: 'Salario', monto: 1_000_000, frecuencia: 'Quincenal', activo: true }];
    renderDistribucionIngreso();

    const titulo = elCard().querySelector('.distribuir-card__title').textContent;
    expect(titulo).toContain('$1.000.000');
    expect(titulo).not.toContain('$2.000.000');
    // La leyenda también se lee sobre el cobro: ningún monto puede superarlo.
    elCard().querySelectorAll('.distribuir-card__monto').forEach(el => {
      const valor = Number(el.textContent.replace(/[^\d]/g, ''));
      expect(valor).toBeLessThanOrEqual(1_000_000);
    });
  });
});

// ── renderAsistenteDistribucion() - MC.13e-2g: bloque educativo + accesos por paso ──

describe('renderAsistenteDistribucion() - bloque educativo (punto 9)', () => {
  const elBody = () => document.getElementById('modal-distribuir-body');

  beforeEach(() => {
    document.body.innerHTML = '<div id="modal-distribuir-body"></div>';
    S.ingresos = [{ id: 'i1', descripcion: 'Salario', monto: 3_000_000, frecuencia: 'Mensual', activo: true }];
    S.cuentas  = [{ id: 'c1', nombre: 'Nequi', banco: 'Nequi', tipo: 'Ahorros', saldo: 1_000_000, activa: true }];
    S.compromisos = [
      { id: 'cf1', descripcion: 'Arriendo', tipo: 'fijo', categoria: 'Arriendo', frecuencia: 'Mensual', diaPago: 5, monto: 800_000, activo: true },
      { id: 'd1', descripcion: 'Tarjeta', tipo: 'deuda-entidad', categoria: 'Tarjeta de crédito', saldoTotal: 2_000_000, cuotaMensual: 250_000, diaPago: 15, activo: true },
    ];
    S.metas = [{ id: 'm1', nombre: 'Viaje', montoObjetivo: 1_200_000, montoActual: 0, fechaLimite: null, completada: false }];
    S.apartados = []; S.inversiones = []; S.gastos = []; S.presupuestos = [];
    S.ahorro = { fondoEmergencia: { activo: false } };
    S.config = { ...S.config, presetDistribucion: 'auto', ultimaDistribucionPeriodo: null };
  });

  it('el asistente abre con la referencia 50/30/20 y qué entra en cada grupo', () => {
    renderAsistenteDistribucion();

    const edu = elBody().querySelector('.distribuir-edu');
    expect(edu).not.toBeNull();
    expect(edu.querySelector('.distribuir-edu__titulo').textContent).toContain('Así reparten los expertos');

    const refs = [...edu.querySelectorAll('.distribuir-edu__ref')].map(el => el.textContent);
    expect(refs).toEqual(['50%', '30%', '20%']);

    const labels = [...edu.querySelectorAll('.distribuir-edu__label')].map(el => el.textContent);
    expect(labels).toEqual(['Necesidades', 'Estilo de vida', 'Ahorro']);

    // Lo que convierte la barra en educación: cada grupo dice qué contiene.
    expect(edu.querySelectorAll('.distribuir-edu__que')).toHaveLength(3);
  });

  it('al lado de la referencia va el porcentaje del usuario (la comparación es la enseñanza)', () => {
    renderAsistenteDistribucion();

    const tuyos = [...elBody().querySelectorAll('.distribuir-edu__tuyo')].map(el => el.textContent.trim());
    expect(tuyos).toHaveLength(3);
    tuyos.forEach(t => expect(t).toMatch(/^tú \d+%$/));
    // Los tres porcentajes del usuario suman 100 (es su split real, no la referencia).
    const suma = tuyos.reduce((s, t) => s + Number(t.replace(/[^\d]/g, '')), 0);
    expect(suma).toBe(100);
  });

  it('la barra es decorativa y sus 3 segmentos toman el ancho del preset de referencia', () => {
    renderAsistenteDistribucion();

    const barra = elBody().querySelector('.distribuir-edu__barra');
    expect(barra.getAttribute('aria-hidden')).toBe('true');
    const anchos = [...barra.querySelectorAll('.distribuir-edu__seg')].map(s => s.style.width);
    expect(anchos).toEqual(['50%', '30%', '20%']);
  });

  it('la razón del cálculo vive dentro del bloque educativo, no en un bloque suelto', () => {
    renderAsistenteDistribucion();

    expect(elBody().querySelector('.distribuir-edu__razon').textContent.length).toBeGreaterThan(0);
    expect(elBody().querySelector('.distribucion-rows')).toBeNull();
  });

  it('la educación va delante del reparto, pero no lo bloquea: el panel se renderiza en el mismo scroll', () => {
    renderAsistenteDistribucion();

    const edu   = elBody().querySelector('.distribuir-edu');
    const panel = elBody().querySelector('#distribuir-ingreso-panel');
    expect(panel).not.toBeNull();
    // 4 = DOCUMENT_POSITION_FOLLOWING (el panel va después del bloque educativo).
    expect(edu.compareDocumentPosition(panel) & 4).toBeTruthy();
    // El bloque educativo no es un paso paginado: no suma un clic al flujo.
    expect(edu.hasAttribute('data-dist-paso')).toBe(false);
    expect(elBody().querySelector('[data-dist-paso-indicador]').textContent).toContain('Paso 1 de 3');
  });
});

describe('renderAsistenteDistribucion() - accesos cruzados por paso (punto 10)', () => {
  const elBody = () => document.getElementById('modal-distribuir-body');
  /** Paso (por título) que contiene un acceso cruzado a `seccion`. */
  const pasoDelCta = (seccion) => elBody()
    .querySelector(`.distribuir__cta[href="#${seccion}"]`)
    ?.closest('[data-dist-paso]')?.dataset.distPasoTitulo ?? null;

  beforeEach(() => {
    document.body.innerHTML = '<div id="modal-distribuir-body"></div>';
    S.ingresos = [{ id: 'i1', descripcion: 'Salario', monto: 3_000_000, frecuencia: 'Mensual', activo: true }];
    S.cuentas  = [{ id: 'c1', nombre: 'Nequi', banco: 'Nequi', tipo: 'Ahorros', saldo: 1_000_000, activa: true }];
    S.compromisos = [
      { id: 'cf1', descripcion: 'Arriendo', tipo: 'fijo', categoria: 'Arriendo', frecuencia: 'Mensual', diaPago: 5, monto: 800_000, activo: true },
      { id: 'd1', descripcion: 'Tarjeta', tipo: 'deuda-entidad', categoria: 'Tarjeta de crédito', saldoTotal: 2_000_000, cuotaMensual: 250_000, diaPago: 15, activo: true },
    ];
    S.metas = [{ id: 'm1', nombre: 'Viaje', montoObjetivo: 1_200_000, montoActual: 0, fechaLimite: null, completada: false }];
    S.apartados = []; S.inversiones = []; S.gastos = []; S.presupuestos = [];
    S.ahorro = { fondoEmergencia: { activo: false } };
    S.config = { ...S.config, presetDistribucion: 'auto', ultimaDistribucionPeriodo: null };
  });

  it('cada acceso aparece en el paso de su categoría, ninguno antes de empezar', () => {
    renderAsistenteDistribucion();

    expect(pasoDelCta('compromisos')).toBe('Necesidades');
    expect(pasoDelCta('ahorro')).toBe('Ahorro, deudas e inversiones');
    expect(pasoDelCta('presupuesto')).toBe('Estilo de vida');

    // Ninguno vive fuera de la paginación (que es "todos juntos al inicio").
    elBody().querySelectorAll('.distribuir__cta').forEach(a => {
      expect(a.closest('[data-dist-paso]')).not.toBeNull();
    });
  });

  it('los accesos cierran el modal antes de navegar (viven dentro del asistente)', () => {
    renderAsistenteDistribucion();

    const ctas = [...elBody().querySelectorAll('.distribuir__cta')];
    expect(ctas.length).toBeGreaterThan(0);
    ctas.forEach(a => expect(a.dataset.action).toBe('ir-a-seccion'));
  });

  it('un acceso cuyo paso no existe se descarta, no se reubica en otro', () => {
    // Deuda activa sin día de pago: cuenta para "tienes deudas" (el acceso a su
    // estrategia se calcula), pero no produce fila de checklist, así que el paso
    // de Necesidades no existe.
    S.compromisos = [{
      id: 'd1', descripcion: 'Tarjeta', tipo: 'deuda-entidad', categoria: 'Tarjeta de crédito',
      saldoTotal: 2_000_000, cuotaMensual: 250_000, diaPago: null, activo: true,
    }];
    renderAsistenteDistribucion();

    expect(elBody().querySelector('[data-dist-paso-titulo="Necesidades"]')).toBeNull();
    expect(elBody().querySelector('.distribuir__cta[href="#compromisos"]')).toBeNull();
    // El de Límites sí sobrevive: su paso (Estilo de vida) siempre existe.
    expect(pasoDelCta('presupuesto')).toBe('Estilo de vida');
  });

  it('el hint de "ponle fecha" también cierra el modal antes de navegar', () => {
    renderAsistenteDistribucion();

    const hint = elBody().querySelector('.distribuir__hint a[href="#metas"]');
    expect(hint).not.toBeNull();
    expect(hint.dataset.action).toBe('ir-a-seccion');
  });
});

// ── construirContextoDistribucion() (MC.5b, ADR 017) ──────────────
describe('construirContextoDistribucion()', () => {
  it('estado vacío: contexto con ceros y defaults', () => {
    expect(construirContextoDistribucion({})).toMatchObject({
      gastosFijosMensuales:      0,
      cuotasDeudaMensuales:      0,
      faltanteFondo:             0,
      aporteMensualObjetivos:    0,
      sumaLimites:               0,
      tieneDeudas:               false,
      tieneFondoActivo:          false,
      fondoCompleto:             false,
      tieneInversiones:          false,
      presetId:                  'auto',
      distribucionPersonalizada: null,
    });
  });

  it('sin argumento no rompe', () => {
    expect(construirContextoDistribucion().presetId).toBe('auto');
  });

  it('deriva gastos fijos, cuotas de deuda y tieneDeudas de compromisos', () => {
    const ctx = construirContextoDistribucion({
      compromisos: [
        compFijoBase({ id: 'f1', monto: 400_000 }),
        { id: 'd1', tipo: 'deuda-entidad', activo: true, cuotaMensual: 250_000 },
      ],
    });
    expect(ctx.gastosFijosMensuales).toBe(400_000);
    expect(ctx.cuotasDeudaMensuales).toBe(250_000);
    expect(ctx.tieneDeudas).toBe(true);
  });

  it('lee el preset y la distribución personalizada de config', () => {
    const ctx = construirContextoDistribucion({
      config: {
        presetDistribucion:        'personalizado',
        distribucionPersonalizada: { n: 50, e: 30, a: 20 },
      },
    });
    expect(ctx.presetId).toBe('personalizado');
    expect(ctx.distribucionPersonalizada).toEqual({ n: 50, e: 30, a: 20 });
  });

  it('suma los límites de gasto (presupuestos)', () => {
    const ctx = construirContextoDistribucion({
      presupuestos: [{ montoMensual: 100_000 }, { montoMensual: 50_000 }],
    });
    expect(ctx.sumaLimites).toBe(150_000);
  });

  it('detecta inversiones activas', () => {
    expect(construirContextoDistribucion({ inversiones: [{ id: 'x' }] }).tieneInversiones).toBe(true);
    expect(construirContextoDistribucion({ inversiones: [] }).tieneInversiones).toBe(false);
  });

  it('MC.11: gastosDelMes suma solo los gastos del mes calendario actual', () => {
    const d = new Date();
    const mesActual = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const ctx = construirContextoDistribucion({
      gastos: [
        { monto: 100_000, fecha: `${mesActual}-05` },
        { monto: 50_000,  fecha: `${mesActual}-20` },
        { monto: 999_000, fecha: '2020-01-15' }, // mes viejo: fuera
      ],
    });
    expect(ctx.gastosDelMes).toBe(150_000);
    expect(construirContextoDistribucion({}).gastosDelMes).toBe(0);
  });

  it('el contexto derivado produce el mismo split que pasar los inputs a mano', () => {
    const ctx      = construirContextoDistribucion({ compromisos: [compFijoBase({ id: 'f1', monto: 1_200_000 })] });
    const derivado = sugerirDistribucionIngreso(3_000_000, ctx);
    const aMano    = sugerirDistribucionIngreso(3_000_000, { gastosFijosMensuales: 1_200_000 });
    expect(derivado.split).toEqual(aMano.split);
  });

  it('LIM.1b: expone fijosNoEsencialesMensuales sin tocar gastosFijosMensuales', () => {
    const ctx = construirContextoDistribucion({
      compromisos: [
        compFijoBase({ id: 'f1', categoria: 'Arriendo',  monto: 1_200_000 }),
        compFijoBase({ id: 'f2', categoria: 'Streaming', monto: 100_000 }),
      ],
    });
    expect(ctx.gastosFijosMensuales).toBe(1_300_000);
    expect(ctx.fijosNoEsencialesMensuales).toBe(100_000);
    expect(construirContextoDistribucion({}).fijosNoEsencialesMensuales).toBe(0);
  });

  it('LIM.1b: el objetivo del fondo sigue saliendo del total de fijos, no de la parte esencial', () => {
    const ctx = construirContextoDistribucion({
      compromisos: [
        compFijoBase({ id: 'f1', categoria: 'Arriendo',  monto: 1_200_000 }),
        compFijoBase({ id: 'f2', categoria: 'Streaming', monto: 100_000 }),
      ],
      ahorro: { fondoEmergencia: { activo: true, metaMeses: 3, montoActual: 0 }, aportes: [] },
    });
    expect(ctx.faltanteFondo).toBe(1_300_000 * 3);
  });
});

// ── sugerirDistribucionIngreso() (Fase 3) ─────────────────────────
describe('sugerirDistribucionIngreso()', () => {
  it('devuelve null cuando ingresoMensual es 0', () => {
    expect(sugerirDistribucionIngreso(0)).toBeNull();
  });

  it('devuelve null cuando ingresoMensual es negativo', () => {
    expect(sugerirDistribucionIngreso(-1_000)).toBeNull();
  });

  it('MC.6a: sin datos registrados usa base saludable 20% ahorro y razón invita a registrar', () => {
    const r = sugerirDistribucionIngreso(3_000_000);
    expect(r.metodo).toBe('pisos');
    // Sin obligaciones: necesidades=0, ahorro=20% base sana, estiloVida=80%
    expect(r.split.necesidades.pct).toBe(0);
    expect(r.split.ahorro.pct).toBe(20);
    expect(r.split.estiloVida.pct).toBe(80);
    expect(r.razon).toContain('Registra');
  });

  it('MC.6a: gastos fijos 40% → necesidades=40, ahorro=20 base sana, estiloVida=40', () => {
    const r = sugerirDistribucionIngreso(3_000_000, { gastosFijosMensuales: 1_200_000 }); // 40%
    expect(r.metodo).toBe('pisos');
    expect(r.pctFijos).toBe(40);
    expect(r.split.necesidades.pct).toBe(40);
    expect(r.split.ahorro.pct).toBe(20);
    expect(r.split.estiloVida.pct).toBe(40);
  });

  it('MC.6a: gastos fijos 60% → necesidades=60, ahorro=20 base, estiloVida=20 (piso EV)', () => {
    const r = sugerirDistribucionIngreso(3_000_000, { gastosFijosMensuales: 1_800_000 }); // 60%
    expect(r.metodo).toBe('pisos');
    expect(r.split.necesidades.pct).toBe(60);
    expect(r.split.necesidades.pct + r.split.estiloVida.pct + r.split.ahorro.pct).toBe(100);
    expect(r.split.estiloVida.pct).toBeGreaterThanOrEqual(10); // piso EV
    expect(r.split.ahorro.pct).toBeGreaterThan(0);
  });

  it('MC.6a: gastos fijos 80% → necesidades=80, ahorro capado, alerta de obligaciones altas', () => {
    const r = sugerirDistribucionIngreso(3_000_000, { gastosFijosMensuales: 2_400_000 }); // 80%
    expect(r.metodo).toBe('pisos');
    expect(r.split.necesidades.pct + r.split.estiloVida.pct + r.split.ahorro.pct).toBe(100);
    expect(r.split.ahorro.pct).toBeGreaterThanOrEqual(0);
    expect(r.alertas.some(a => a.includes('80%') || a.includes('obligaciones'))).toBe(true);
  });

  it('LIM.1b: los fijos no esenciales salen de Necesidades y caen en el residuo de Estilo de vida', () => {
    const conNoEsenciales = sugerirDistribucionIngreso(3_000_000, {
      gastosFijosMensuales:       1_500_000,
      fijosNoEsencialesMensuales:   300_000,
    });
    const soloEsenciales = sugerirDistribucionIngreso(3_000_000, { gastosFijosMensuales: 1_200_000 });
    expect(conNoEsenciales.split).toEqual(soloEsenciales.split);
    expect(conNoEsenciales.pctFijos).toBe(40);
  });

  it('LIM.1b: sin fijos no esenciales el reparto es el de antes', () => {
    const r = sugerirDistribucionIngreso(3_000_000, {
      gastosFijosMensuales:       1_200_000,
      fijosNoEsencialesMensuales:         0,
    });
    expect(r.split).toEqual(sugerirDistribucionIngreso(3_000_000, { gastosFijosMensuales: 1_200_000 }).split);
  });

  it('LIM.1b: pctObligaciones tampoco carga los no esenciales', () => {
    const r = sugerirDistribucionIngreso(3_000_000, {
      gastosFijosMensuales:       1_500_000,
      fijosNoEsencialesMensuales:   300_000,
      cuotasDeudaMensuales:         300_000,
    });
    expect(r.pctObligaciones).toBe(50); // (1.2M esenciales + 300k cuota) / 3M
  });

  it('LIM.1b: un dato inconsistente (no esenciales mayor al total) no produce un piso negativo', () => {
    const r = sugerirDistribucionIngreso(3_000_000, {
      gastosFijosMensuales:         300_000,
      fijosNoEsencialesMensuales: 9_000_000,
    });
    expect(r.pctFijos).toBe(0);
    expect(r.split.necesidades.pct).toBe(0);
    expect(r.split.necesidades.pct + r.split.estiloVida.pct + r.split.ahorro.pct).toBe(100);
  });

  it('el split siempre suma 100 para distintos niveles de pctFijos', () => {
    [0, 30, 50, 60, 70, 75, 85, 95].forEach(pct => {
      const fijos = pct === 0 ? 0 : Math.round(3_000_000 * pct / 100);
      const r = sugerirDistribucionIngreso(3_000_000, { gastosFijosMensuales: fijos });
      const suma = r.split.necesidades.pct + r.split.estiloVida.pct + r.split.ahorro.pct;
      expect(suma, `pctFijos=${pct}`).toBe(100);
    });
  });

  it('MC.10: con obligaciones al 92% el ahorro no queda en 0 (piso de ahorro compite con el de EV)', () => {
    // Residuo 8% < pisoEV (10%) + pisoAhorro (5%): antes todo el margen iba a
    // Estilo de vida y el ahorro quedaba en $0; ahora se reparte proporcional
    // a los pisos (ahorro recibe 1/3 del margen).
    const r = sugerirDistribucionIngreso(3_000_000, {
      gastosFijosMensuales: 2_760_000, // 92%
      tieneFondoActivo: true, fondoCompleto: false, faltanteFondo: 6_000_000,
    });
    expect(r.split.necesidades.pct).toBe(92);
    expect(r.split.ahorro.pct).toBeGreaterThan(0);
    expect(r.split.estiloVida.pct).toBeGreaterThan(r.split.ahorro.pct); // EV conserva la mayor parte
    expect(r.split.necesidades.pct + r.split.estiloVida.pct + r.split.ahorro.pct).toBe(100);
  });

  it('MC.10: el reparto proporcional nunca supera el ahorro ideal', () => {
    // Ideal chico (objetivo con fecha de 30.000/mes) y margen corto: el ahorro
    // se topa al ideal aunque la proporción de pisos permitiera más.
    const r = sugerirDistribucionIngreso(3_000_000, {
      gastosFijosMensuales: 2_760_000, // 92%, residuo 240.000
      aporteMensualObjetivos: 30_000,
    });
    expect(r.split.ahorro.monto).toBeLessThanOrEqual(31_000); // ideal + redondeo de pct
  });

  it('MC.10: el ahorro solo queda en 0 cuando de verdad no hay margen', () => {
    const r = sugerirDistribucionIngreso(3_000_000, { gastosFijosMensuales: 3_000_000 });
    expect(r.split.ahorro.pct).toBe(0);
    expect(r.split.necesidades.pct).toBe(100);
  });

  it('MC.11: gastos del mes por encima del ingreso → déficit real, ahorro 0 y alerta accionable', () => {
    const r = sugerirDistribucionIngreso(3_000_000, {
      gastosFijosMensuales: 1_200_000,
      gastosDelMes: 3_400_000, // 113% del ingreso
    });
    expect(r.split.ahorro.pct).toBe(0);
    expect(r.razon).toContain('113%');
    expect(r.razon).toContain('más de lo que entra');
    // Ficha 05 (ADR 069): la alerta manda a registrar el fijo donde ahora se
    // registra, "Por pagar", no al Calendario.
    expect(r.alertas.some(a => a.includes('Análisis') && a.includes('Por pagar'))).toBe(true);
  });

  it('MC.11: con gastos del mes por debajo del ingreso no cambia nada', () => {
    const conGastos = sugerirDistribucionIngreso(3_000_000, {
      gastosFijosMensuales: 1_200_000, gastosDelMes: 1_500_000,
    });
    const sinGastos = sugerirDistribucionIngreso(3_000_000, {
      gastosFijosMensuales: 1_200_000,
    });
    expect(conGastos.split).toEqual(sinGastos.split);
    expect(conGastos.razon).toBe(sinGastos.razon);
  });

  it('MC.11: el déficit real no toca los presets explícitos', () => {
    const r = sugerirDistribucionIngreso(3_000_000, {
      presetId: '50-30-20', gastosDelMes: 4_000_000,
    });
    expect(r.split.necesidades.pct).toBe(50);
    expect(r.split.ahorro.pct).toBe(20);
  });

  it('agrega alerta y CTA a ahorro cuando no hay fondo activo', () => {
    const r = sugerirDistribucionIngreso(3_000_000, { tieneFondoActivo: false });
    expect(r.alertas.some(a => a.includes('fondo'))).toBe(true);
    expect(r.ctas.some(c => c.seccion === 'ahorro')).toBe(true);
  });

  it('agrega CTA a ahorro cuando el fondo esta activo pero incompleto', () => {
    const r = sugerirDistribucionIngreso(3_000_000, { tieneFondoActivo: true, fondoCompleto: false });
    expect(r.ctas.some(c => c.seccion === 'ahorro')).toBe(true);
  });

  it('agrega CTA a inversion cuando el fondo esta completo y no hay inversiones', () => {
    const r = sugerirDistribucionIngreso(3_000_000, {
      tieneFondoActivo: true, fondoCompleto: true, tieneInversiones: false,
    });
    expect(r.ctas.some(c => c.seccion === 'inversion')).toBe(true);
  });

  it('MC.6c: con fondo completo y usuario que ya invierte, la CTA invita a aportar (no a explorar)', () => {
    const r = sugerirDistribucionIngreso(3_000_000, {
      tieneFondoActivo: true, fondoCompleto: true, tieneInversiones: true,
    });
    const inv = r.ctas.filter(c => c.seccion === 'inversion');
    expect(inv).toHaveLength(1);
    expect(inv[0].label).toBe('Aportar a tus inversiones');
  });

  it('agrega alerta y CTA a compromisos cuando hay deudas activas', () => {
    const r = sugerirDistribucionIngreso(3_000_000, { tieneDeudas: true });
    expect(r.alertas.some(a => a.includes('deuda'))).toBe(true);
    expect(r.ctas.some(c => c.seccion === 'compromisos')).toBe(true);
  });

  it('MC.5e: siempre agrega un CTA cruzado a Límites de gasto (presupuesto)', () => {
    // Sin contexto (caso más simple) y con varios flags activos: el CTA de
    // seguimiento en Límites siempre está presente, independiente del resto.
    expect(sugerirDistribucionIngreso(3_000_000).ctas.some(c => c.seccion === 'presupuesto')).toBe(true);
    expect(sugerirDistribucionIngreso(3_000_000, {
      tieneFondoActivo: true, fondoCompleto: true, tieneInversiones: true, tieneDeudas: true,
    }).ctas.some(c => c.seccion === 'presupuesto')).toBe(true);
    expect(sugerirDistribucionIngreso(3_000_000, { presetId: '50-30-20' })
      .ctas.some(c => c.seccion === 'presupuesto')).toBe(true);
  });

  it('la alerta de deudas invita a recortar estilo de vida, no el ahorro', () => {
    const r = sugerirDistribucionIngreso(3_000_000, { tieneDeudas: true });
    const alerta = r.alertas.find(a => a.includes('deuda'));
    expect(alerta).toContain('estilo de vida');
    expect(alerta).not.toContain('destina el porcentaje de ahorro al pago');
  });

  it('usa label "Ahorro e inversión" cuando el usuario ya invierte', () => {
    const r = sugerirDistribucionIngreso(3_000_000, {
      tieneFondoActivo: true, fondoCompleto: true, tieneInversiones: true,
    });
    expect(r.split.ahorro.label).toBe('Ahorro e inversión');
  });

  it('los montos del split son coherentes con ingresoMensual (tolerancia redondeo)', () => {
    const r = sugerirDistribucionIngreso(2_500_000);
    const sumaMontos = r.split.necesidades.monto + r.split.estiloVida.monto + r.split.ahorro.monto;
    expect(Math.abs(sumaMontos - 2_500_000)).toBeLessThanOrEqual(3);
  });

  it('usa la distribución personalizada cuando presetId es "personalizado" y es válida', () => {
    const r = sugerirDistribucionIngreso(3_000_000, {
      presetId: 'personalizado',
      distribucionPersonalizada: { n: 80, e: 10, a: 10 },
    });
    expect(r.metodo).toBe('Personalizada');
    expect(r.split.necesidades.pct).toBe(80);
    expect(r.split.estiloVida.pct).toBe(10);
    expect(r.split.ahorro.pct).toBe(10);
  });

  it('cae al ajuste automático si presetId es "personalizado" pero la distribución es inválida', () => {
    const r = sugerirDistribucionIngreso(3_000_000, {
      presetId: 'personalizado',
      distribucionPersonalizada: { n: 80, e: 10, a: 5 }, // suma 95, no 100
    });
    expect(r.metodo).not.toBe('Personalizada');
    expect(r.split.necesidades.pct + r.split.estiloVida.pct + r.split.ahorro.pct).toBe(100);
  });

  it('cae al ajuste automático si presetId es "personalizado" sin distribución guardada', () => {
    const r = sugerirDistribucionIngreso(3_000_000, { presetId: 'personalizado' });
    expect(r.metodo).not.toBe('Personalizada');
  });

  // ── Tests nuevos del modelo de pisos (MC.6a) ──────────────────

  it('MC.6a: cuotasDeudaMensuales sube las necesidades', () => {
    const r = sugerirDistribucionIngreso(3_000_000, {
      gastosFijosMensuales: 600_000,  // 20%
      cuotasDeudaMensuales: 600_000,  // 20% → obligaciones 40%
    });
    expect(r.pctObligaciones).toBe(40);
    expect(r.split.necesidades.pct).toBe(40);
  });

  it('MC.6a: faltanteFondo activa prioridad de ahorro (base sana no aplica)', () => {
    // Faltante 1.2M → ceil(1.2M/12) = 100k/mes como prioridad específica.
    // La base sana (20%) no aplica porque hay una prioridad activa.
    const r = sugerirDistribucionIngreso(3_000_000, {
      faltanteFondo: 1_200_000,
      fondoCompleto: false,
    });
    expect(r.metodo).toBe('pisos');
    // 100k / 3M ≈ 3% → el ahorro refleja el aporte al fondo, no la base sana.
    expect(r.split.ahorro.pct).toBeGreaterThanOrEqual(3);
    // monto = round(3M * 3/100) = 90k ≥ ceil(1.2M/12/3M*100)% de 3M
    expect(r.split.ahorro.monto).toBeGreaterThanOrEqual(80_000);
    expect(r.split.necesidades.pct + r.split.estiloVida.pct + r.split.ahorro.pct).toBe(100);
  });

  it('MC.6a: faltanteFondo eleva ahorro por encima de la base sana cuando es grande', () => {
    // Faltante 3.6M → 300k/mes. Base sana 600k → el mayor gana (600k). Pero con
    // fondo incompleto el ideal es 300k; como base sana (600k) > 300k, gana base.
    // Caso donde fondo manda: faltante 4.8M → 400k/mes < base sana → base sana 600k
    // Forzamos faltante alto para que domine: faltante 9.6M → 800k/mes > 600k base.
    const r = sugerirDistribucionIngreso(3_000_000, {
      faltanteFondo: 9_600_000,
      fondoCompleto: false,
    });
    expect(r.split.ahorro.monto).toBeGreaterThan(600_000); // supera la base sana
  });

  it('MC.6a: aporteMensualObjetivos sube el ahorro', () => {
    const r = sugerirDistribucionIngreso(3_000_000, {
      aporteMensualObjetivos: 500_000,
      fondoCompleto: true,
    });
    // Ahorro ideal = 500k (objetivos). Base sana no aplica (hay prioridad específica).
    expect(r.metodo).toBe('pisos');
    expect(r.razon).toContain('objetivos');
    expect(r.split.ahorro.monto).toBeGreaterThanOrEqual(500_000);
  });

  it('MC.6a: obligaciones mayores que ingreso → 100/0/0 y alerta fuerte', () => {
    const r = sugerirDistribucionIngreso(3_000_000, {
      gastosFijosMensuales: 2_000_000,
      cuotasDeudaMensuales: 1_500_000, // total 3.5M > 3M
    });
    expect(r.split.necesidades.pct).toBe(100);
    expect(r.split.estiloVida.pct).toBe(0);
    expect(r.split.ahorro.pct).toBe(0);
    expect(r.alertas.some(a => a.includes('todo tu ingreso') || a.includes('100%'))).toBe(true);
  });

  it('MC.6a: piso de estilo de vida nunca cede ante el ahorro ideal', () => {
    // Obligaciones 50% + ahorro ideal muy alto → EV queda en el piso 10%.
    const r = sugerirDistribucionIngreso(3_000_000, {
      gastosFijosMensuales: 1_500_000, // 50%
      aporteMensualObjetivos: 1_800_000, // ideal imposible de cumplir completo
      fondoCompleto: true,
    });
    expect(r.split.estiloVida.pct).toBeGreaterThanOrEqual(10);
    expect(r.split.necesidades.pct + r.split.estiloVida.pct + r.split.ahorro.pct).toBe(100);
  });

  it('MC.6a: razon menciona el pct de obligaciones cuando hay datos registrados', () => {
    const r = sugerirDistribucionIngreso(3_000_000, {
      gastosFijosMensuales: 900_000,
      cuotasDeudaMensuales: 300_000, // 40% total
    });
    expect(r.razon).toContain('40%');
  });

  it('MC.6a: sumaLimites mayor que montoEV genera alerta informativa', () => {
    // Gastos fijos 50% → EV sugerido ~30% → montoEV ~900k. sumaLimites=3M >> 900k.
    const r = sugerirDistribucionIngreso(3_000_000, {
      gastosFijosMensuales: 1_500_000,
      sumaLimites: 3_000_000,
    });
    expect(r.alertas.some(a => a.includes('límites de gasto'))).toBe(true);
  });

  it('MC.6a: pctObligaciones está siempre en el resultado', () => {
    const r = sugerirDistribucionIngreso(3_000_000);
    expect(typeof r.pctObligaciones).toBe('number');
    expect(r.pctObligaciones).toBe(0); // sin cuotas ni fijos
  });

  it('avisa "tu distribución" (no "el preset") cuando los fijos superan lo personalizado', () => {
    const r = sugerirDistribucionIngreso(3_000_000, {
      gastosFijosMensuales: 2_800_000, // 93%, supera el 80% de necesidades
      presetId: 'personalizado',
      distribucionPersonalizada: { n: 80, e: 10, a: 10 },
    });
    expect(r.alertas.some(a => a.includes('tu distribución'))).toBe(true);
    expect(r.alertas.some(a => a.includes('el preset'))).toBe(false);
  });
});

// ── esDistribucionPersonalizadaValida() ───────────────────────────
// ── calcularAporteMensualObjetivos() (MC.6a) ──────────────────────
describe('calcularAporteMensualObjetivos()', () => {
  const hoy = new Date('2026-07-01');

  it('devuelve 0 sin metas ni apartados', () => {
    expect(calcularAporteMensualObjetivos([], [], hoy)).toBe(0);
  });

  it('ignora metas completadas', () => {
    const m = [{ montoObjetivo: 1_000_000, montoActual: 0, fechaLimite: '2026-12-01', completada: true }];
    expect(calcularAporteMensualObjetivos(m, [], hoy)).toBe(0);
  });

  it('ignora metas sin fechaLimite', () => {
    const m = [{ montoObjetivo: 1_000_000, montoActual: 0, fechaLimite: null, completada: false }];
    expect(calcularAporteMensualObjetivos(m, [], hoy)).toBe(0);
  });

  it('ignora metas con fechaLimite ya pasada', () => {
    const m = [{ montoObjetivo: 1_000_000, montoActual: 0, fechaLimite: '2026-01-01', completada: false }];
    expect(calcularAporteMensualObjetivos(m, [], hoy)).toBe(0);
  });

  it('calcula el aporte mensual para una meta con faltante y fecha futura', () => {
    // faltante 1.2M en 6 meses → ceil(1.2M/6) = 200k
    const m = [{ montoObjetivo: 1_200_000, montoActual: 0, fechaLimite: '2027-01-01', completada: false }];
    const resultado = calcularAporteMensualObjetivos(m, [], hoy);
    expect(resultado).toBeGreaterThan(0);
    expect(resultado).toBeLessThanOrEqual(1_200_000); // no puede superar el faltante total
  });

  it('suma los aportes de varias metas y apartados', () => {
    const metas = [
      { montoObjetivo: 600_000, montoActual: 0, fechaLimite: '2027-01-01', completada: false },
    ];
    const apartados = [
      { montoObjetivo: 360_000, montoActual: 0, fechaObjetivo: '2027-01-01', completado: false },
    ];
    const solo1 = calcularAporteMensualObjetivos(metas, [], hoy);
    const solo2 = calcularAporteMensualObjetivos([], apartados, hoy);
    const ambos = calcularAporteMensualObjetivos(metas, apartados, hoy);
    expect(ambos).toBe(solo1 + solo2);
  });

  it('ignora apartados sin fechaObjetivo', () => {
    const a = [{ montoObjetivo: 500_000, montoActual: 0, fechaObjetivo: null, completado: false }];
    expect(calcularAporteMensualObjetivos([], a, hoy)).toBe(0);
  });
});

// ── construirDesgloseAhorroPorObjetivo() (MC.7a, ADR 018) ─────────
describe('construirDesgloseAhorroPorObjetivo()', () => {
  const hoy = new Date('2026-07-01');

  const metaConFecha = (overrides = {}) => ({
    id: 'm1', nombre: 'Viaje', montoObjetivo: 1_200_000, montoActual: 0,
    fechaLimite: '2027-01-01', completada: false,
    ...overrides,
  });
  const apartadoConFecha = (overrides = {}) => ({
    id: 'ap1', nombre: 'SOAT', montoObjetivo: 360_000, montoActual: 0,
    fechaObjetivo: '2027-01-01', completado: false,
    ...overrides,
  });

  it('sin metas, apartados ni fondo devuelve array vacío', () => {
    expect(construirDesgloseAhorroPorObjetivo({ hoy })).toEqual([]);
    expect(construirDesgloseAhorroPorObjetivo()).toEqual([]);
  });

  it('una meta con fecha sugiere la cuota del período vía el motor aportePorPeriodo (MC.13e-2d)', () => {
    const metas = [metaConFecha()];
    const filas = construirDesgloseAhorroPorObjetivo({ metas, budgetAhorro: 1_000_000, hoy });
    const esperado = aportePorPeriodo(1_200_000, '2027-01-01', 'Mensual', '2026-07-01').montoPorPeriodo;
    expect(filas).toEqual([{ tipo: 'meta', id: 'm1', nombre: 'Viaje', monto: esperado, sinFecha: false, icono: null, nota: '' }]);
    expect(esperado).toBeGreaterThan(0);
  });

  it('una meta con fecha, con frecuencia Quincenal, reparte la cuota por quincena', () => {
    const metas = [metaConFecha()];
    const filas = construirDesgloseAhorroPorObjetivo({ metas, budgetAhorro: 1_000_000, frecuencia: 'Quincenal', hoy });
    const esperado = aportePorPeriodo(1_200_000, '2027-01-01', 'Quincenal', '2026-07-01').montoPorPeriodo;
    expect(filas[0].monto).toBe(esperado);
    expect(esperado).toBeGreaterThan(0);
  });

  it('una meta sin fechaLimite sugiere 0 (no adivina) y marca sinFecha', () => {
    const metas = [metaConFecha({ fechaLimite: null })];
    const filas = construirDesgloseAhorroPorObjetivo({ metas, budgetAhorro: 1_000_000, hoy });
    expect(filas).toEqual([{ tipo: 'meta', id: 'm1', nombre: 'Viaje', monto: 0, sinFecha: true, icono: null, nota: '' }]);
  });

  it('un apartado sin fechaObjetivo sugiere 0 y marca sinFecha', () => {
    const apartados = [apartadoConFecha({ fechaObjetivo: null })];
    const filas = construirDesgloseAhorroPorObjetivo({ apartados, budgetAhorro: 1_000_000, hoy });
    expect(filas).toEqual([{ tipo: 'apartado', id: 'ap1', nombre: 'SOAT', monto: 0, sinFecha: true, icono: null, nota: '' }]);
  });

  it('una meta con fecha NO marca sinFecha, aunque su fecha ya haya pasado', () => {
    const metas = [metaConFecha({ fechaLimite: '2026-01-01' })];
    const filas = construirDesgloseAhorroPorObjetivo({ metas, budgetAhorro: 1_000_000, hoy });
    expect(filas[0].sinFecha).toBe(false);
  });

  it('la fila del fondo siempre tiene sinFecha en false (no aplica)', () => {
    const fondo = { activo: true, completado: false };
    const filas = construirDesgloseAhorroPorObjetivo({ fondo, budgetAhorro: 1_000_000, hoy });
    expect(filas[0].sinFecha).toBe(false);
  });

  it('una meta con fechaLimite ya pasada sugiere 0', () => {
    const metas = [metaConFecha({ fechaLimite: '2026-01-01' })];
    const filas = construirDesgloseAhorroPorObjetivo({ metas, budgetAhorro: 1_000_000, hoy });
    expect(filas[0].monto).toBe(0);
  });

  it('una meta ya cumplida (faltante 0) sugiere 0', () => {
    const metas = [metaConFecha({ montoActual: 1_200_000 })];
    const filas = construirDesgloseAhorroPorObjetivo({ metas, budgetAhorro: 1_000_000, hoy });
    expect(filas[0].monto).toBe(0);
  });

  it('una meta completada no aparece en el desglose', () => {
    const metas = [metaConFecha({ completada: true })];
    const filas = construirDesgloseAhorroPorObjetivo({ metas, budgetAhorro: 1_000_000, hoy });
    expect(filas).toEqual([]);
  });

  it('un apartado completado no aparece en el desglose', () => {
    const apartados = [apartadoConFecha({ completado: true })];
    const filas = construirDesgloseAhorroPorObjetivo({ apartados, budgetAhorro: 1_000_000, hoy });
    expect(filas).toEqual([]);
  });

  it('metas y apartados aparecen en ese orden (metas primero, luego apartados)', () => {
    const metas     = [metaConFecha()];
    const apartados = [apartadoConFecha()];
    const filas = construirDesgloseAhorroPorObjetivo({ metas, apartados, budgetAhorro: 2_000_000, hoy });
    expect(filas.map(f => f.tipo)).toEqual(['meta', 'apartado']);
  });

  it('el fondo activo e incompleto recibe el excedente tras los aportes a objetivos', () => {
    const metas = [metaConFecha()]; // aporte ~200.000 (1.2M/6 meses)
    const aporteMeta = aportePorPeriodo(1_200_000, '2027-01-01', 'Mensual', '2026-07-01').montoPorPeriodo;
    const fondo = { activo: true, completado: false };
    const filas = construirDesgloseAhorroPorObjetivo({ metas, fondo, budgetAhorro: 1_000_000, hoy });
    expect(filas[0]).toEqual({ tipo: 'fondo', id: null, nombre: 'Fondo de emergencia', monto: 1_000_000 - aporteMeta, sinFecha: false, autoExcedente: true });
  });

  it('el fondo va primero en el orden (fondo, metas, apartados)', () => {
    const metas     = [metaConFecha()];
    const apartados = [apartadoConFecha()];
    const fondo = { activo: true, completado: false };
    const filas = construirDesgloseAhorroPorObjetivo({ metas, apartados, fondo, budgetAhorro: 2_000_000, hoy });
    expect(filas.map(f => f.tipo)).toEqual(['fondo', 'meta', 'apartado']);
  });

  it('el fondo completo siempre queda en 0, aunque haya excedente, y no sigue el excedente en vivo', () => {
    const fondo = { activo: true, completado: true };
    const filas = construirDesgloseAhorroPorObjetivo({ fondo, budgetAhorro: 1_000_000, hoy });
    expect(filas).toEqual([{ tipo: 'fondo', id: null, nombre: 'Fondo de emergencia', monto: 0, sinFecha: false, autoExcedente: false }]);
  });

  it('el fondo inactivo no aparece en el desglose', () => {
    const fondo = { activo: false, completado: false };
    const filas = construirDesgloseAhorroPorObjetivo({ fondo, budgetAhorro: 1_000_000, hoy });
    expect(filas).toEqual([]);
  });

  it('el excedente nunca es negativo: si los objetivos superan el budget, el fondo queda en 0', () => {
    // faltante 12M en 6 meses -> aporte sugerido 2M, muy por encima del budget de 500k.
    const metas = [metaConFecha({ montoObjetivo: 12_000_000, montoActual: 0 })];
    const fondo = { activo: true, completado: false };
    const filas = construirDesgloseAhorroPorObjetivo({ metas, fondo, budgetAhorro: 500_000, hoy });
    const fila = filas.find(f => f.tipo === 'fondo');
    expect(fila.monto).toBe(0);
  });

  it('sin budgetAhorro (0) el fondo no recibe nada y los aportes a objetivos no se ven afectados', () => {
    const metas = [metaConFecha()];
    const fondo = { activo: true, completado: false };
    const filas = construirDesgloseAhorroPorObjetivo({ metas, fondo, hoy });
    const filaFondo = filas.find(f => f.tipo === 'fondo');
    const filaMeta  = filas.find(f => f.tipo === 'meta');
    expect(filaFondo.monto).toBe(0);
    expect(filaMeta.monto).toBeGreaterThan(0);
  });

  it('varias metas y apartados sin fecha: todas sugieren 0 y el fondo recibe todo el budget', () => {
    const metas     = [metaConFecha({ id: 'm1', fechaLimite: null }), metaConFecha({ id: 'm2', fechaLimite: null })];
    const apartados = [apartadoConFecha({ id: 'ap1', fechaObjetivo: null })];
    const fondo = { activo: true, completado: false };
    const filas = construirDesgloseAhorroPorObjetivo({ metas, apartados, fondo, budgetAhorro: 800_000, hoy });
    expect(filas.filter(f => f.tipo !== 'fondo').every(f => f.monto === 0)).toBe(true);
    expect(filas.find(f => f.tipo === 'fondo').monto).toBe(800_000);
  });
});

// ── presupuestosSobreRemanente() (MC.7d, ADR 018 revisión R3) ─────
describe('presupuestosSobreRemanente()', () => {
  it('con las Necesidades marcadas iguales a su % teórico devuelve los presupuestos del split', () => {
    // 50/30/20 sobre 3M: Necesidades teóricas 1.5M; ahorro 600K, estilo de vida 900K.
    expect(presupuestosSobreRemanente(3_000_000, 1_500_000, 20, 30))
      .toEqual({ remanente: 1_500_000, ahorro: 600_000, estiloVida: 900_000 });
  });

  it('Necesidades altas encogen ambos grupos en proporción al split (R3)', () => {
    // Remanente 300K con proporción ahorro:estilo de vida = 20:30.
    expect(presupuestosSobreRemanente(3_000_000, 2_700_000, 20, 30))
      .toEqual({ remanente: 300_000, ahorro: 120_000, estiloVida: 180_000 });
  });

  it('marcar menos Necesidades no infla el ahorro: tope en el teórico del split', () => {
    // Nada marcado: el remanente es todo el cobro, pero lo no marcado sigue
    // comprometido; el ahorro se queda en su 20% teórico.
    expect(presupuestosSobreRemanente(3_000_000, 0, 20, 30))
      .toEqual({ remanente: 3_000_000, ahorro: 600_000, estiloVida: 900_000 });
  });

  it('Necesidades que consumen todo el cobro (o más) dejan ambos presupuestos en 0', () => {
    expect(presupuestosSobreRemanente(3_000_000, 3_000_000, 20, 30))
      .toEqual({ remanente: 0, ahorro: 0, estiloVida: 0 });
    expect(presupuestosSobreRemanente(3_000_000, 4_000_000, 20, 30))
      .toEqual({ remanente: 0, ahorro: 0, estiloVida: 0 });
  });

  it('ahorro + estilo de vida nunca superan el remanente (sin fuga por redondeo)', () => {
    const r = presupuestosSobreRemanente(1_000_001, 500_000, 33, 33);
    expect(r.ahorro + r.estiloVida).toBeLessThanOrEqual(r.remanente);
  });

  it('con estilo de vida 0% el ahorro puede tomar todo el remanente, hasta su teórico', () => {
    expect(presupuestosSobreRemanente(1_000_000, 800_000, 20, 0))
      .toEqual({ remanente: 200_000, ahorro: 200_000, estiloVida: 0 });
  });

  it('con ahorro 0% todo el presupuesto flexible es estilo de vida', () => {
    expect(presupuestosSobreRemanente(1_000_000, 400_000, 0, 30))
      .toEqual({ remanente: 600_000, ahorro: 0, estiloVida: 300_000 });
  });

  it('monto no numérico, 0 o negativo devuelve todo en 0', () => {
    expect(presupuestosSobreRemanente(NaN, 0, 20, 30)).toEqual({ remanente: 0, ahorro: 0, estiloVida: 0 });
    expect(presupuestosSobreRemanente(0, 0, 20, 30)).toEqual({ remanente: 0, ahorro: 0, estiloVida: 0 });
    expect(presupuestosSobreRemanente(-5, 0, 20, 30)).toEqual({ remanente: 0, ahorro: 0, estiloVida: 0 });
  });
});

describe('esDistribucionPersonalizadaValida()', () => {
  it('acepta 3 porcentajes que suman exactamente 100', () => {
    expect(esDistribucionPersonalizadaValida({ n: 80, e: 10, a: 10 })).toBe(true);
    expect(esDistribucionPersonalizadaValida({ n: 0, e: 0, a: 100 })).toBe(true);
  });

  it('rechaza si la suma no es exactamente 100', () => {
    expect(esDistribucionPersonalizadaValida({ n: 80, e: 10, a: 5 })).toBe(false);
    expect(esDistribucionPersonalizadaValida({ n: 80, e: 10, a: 15 })).toBe(false);
  });

  it('rechaza valores fuera de 0-100', () => {
    expect(esDistribucionPersonalizadaValida({ n: -10, e: 50, a: 60 })).toBe(false);
    expect(esDistribucionPersonalizadaValida({ n: 110, e: -10, a: 0 })).toBe(false);
  });

  it('rechaza valores no numéricos o ausentes', () => {
    expect(esDistribucionPersonalizadaValida({ n: NaN, e: 10, a: 10 })).toBe(false);
    expect(esDistribucionPersonalizadaValida({ n: 80, e: 10 })).toBe(false);
  });

  it('rechaza null, undefined y no-objetos', () => {
    expect(esDistribucionPersonalizadaValida(null)).toBe(false);
    expect(esDistribucionPersonalizadaValida(undefined)).toBe(false);
    expect(esDistribucionPersonalizadaValida('80-10-10')).toBe(false);
  });
});

// ── resumirPlanDistribucion() (MC.4a) ─────────────────────────────
describe('resumirPlanDistribucion()', () => {
  it('suma lo asignado y calcula lo que queda del ingreso', () => {
    const r = resumirPlanDistribucion(3_000_000, [{ monto: 400_000 }, { monto: 200_000 }]);
    expect(r.asignado).toBe(600_000);
    expect(r.sinAsignar).toBe(2_400_000);
    expect(r.excede).toBe(false);
  });

  it('marca excede cuando lo asignado supera el ingreso', () => {
    const r = resumirPlanDistribucion(500_000, [{ monto: 400_000 }, { monto: 300_000 }]);
    expect(r.excede).toBe(true);
    expect(r.sinAsignar).toBe(0);
  });

  it('ignora montos no numéricos y trata el plan vacío como 0', () => {
    expect(resumirPlanDistribucion(1_000_000, [{ monto: NaN }, {}]).asignado).toBe(0);
    expect(resumirPlanDistribucion(1_000_000, []).sinAsignar).toBe(1_000_000);
  });

  it('expone el déficit cuando excede, y 0 cuando no (MC.13e-2e)', () => {
    expect(resumirPlanDistribucion(500_000, [{ monto: 700_000 }]).deficit).toBe(200_000);
    expect(resumirPlanDistribucion(500_000, [{ monto: 300_000 }]).deficit).toBe(0);
    expect(resumirPlanDistribucion(500_000, [{ monto: 500_000 }]).deficit).toBe(0);
  });
});

// ── planComplementoDeficit() (MC.13e-2e) ──────────────────────────
describe('planComplementoDeficit()', () => {
  const CUENTAS = [
    { id: 'c1', nombre: 'Nómina',      saldo: 100_000 },
    { id: 'c2', nombre: 'Ahorros',     saldo: 500_000 },
    { id: 'c3', nombre: 'Bolsillo',    saldo: 300_000 },
  ];

  it('reparte el déficit entre las otras cuentas, mayor saldo primero', () => {
    const r = planComplementoDeficit(CUENTAS, 600_000, 'c1');
    expect(r.cubre).toBe(true);
    expect(r.deficit).toBe(600_000);
    expect(r.splits).toEqual([
      { cuentaId: 'c2', monto: 500_000 },
      { cuentaId: 'c3', monto: 100_000 },
    ]);
  });

  it('excluye la cuenta de origen: su saldo no cuenta como disponible', () => {
    const r = planComplementoDeficit(CUENTAS, 850_000, 'c2');
    expect(r.disponible).toBe(400_000);   // c1 + c3, sin los 500.000 de c2
    expect(r.cubre).toBe(false);
    expect(r.splits).toEqual([]);
  });

  it('sin cuenta de origen conocida, todas las activas son elegibles', () => {
    const r = planComplementoDeficit(CUENTAS, 900_000, null);
    expect(r.disponible).toBe(900_000);
    expect(r.cubre).toBe(true);
  });

  it('no alcanza: cubre false y ningún split, para no dejar cuentas en negativo', () => {
    const r = planComplementoDeficit(CUENTAS, 1_000_000, 'c1');
    expect(r.cubre).toBe(false);
    expect(r.splits).toEqual([]);
    expect(r.disponible).toBe(800_000);
  });

  it('ignora cuentas inactivas y las de saldo 0 o negativo', () => {
    const cuentas = [
      { id: 'c1', saldo: 400_000, activa: false },
      { id: 'c2', saldo: 0 },
      { id: 'c3', saldo: -50_000 },
      { id: 'c4', saldo: 200_000 },
    ];
    const r = planComplementoDeficit(cuentas, 200_000, null);
    expect(r.disponible).toBe(200_000);
    expect(r.splits).toEqual([{ cuentaId: 'c4', monto: 200_000 }]);
  });

  it('sin déficit no hay nada que completar', () => {
    const r = planComplementoDeficit(CUENTAS, 0, 'c1');
    expect(r.deficit).toBe(0);
    expect(r.cubre).toBe(false);
    expect(r.splits).toEqual([]);
  });

  it('tolera entradas inválidas sin romper', () => {
    expect(planComplementoDeficit(null, NaN, null).cubre).toBe(false);
    expect(planComplementoDeficit(undefined, 100, null).disponible).toBe(0);
  });
});

// ── topeAbonoExtraDeuda() (BUG-009) ───────────────────────────────
describe('topeAbonoExtraDeuda()', () => {
  it('sin cuota marcada, topa solo al saldo (comportamiento previo)', () => {
    expect(topeAbonoExtraDeuda(1_000_000, 0, 300_000)).toBe(300_000);
    expect(topeAbonoExtraDeuda(1_000_000, 0, 1_500_000)).toBe(1_000_000);
  });

  it('resta la cuota marcada del saldo antes de topar el extra', () => {
    // saldo 100.000, cuota 100.000 (topada), extra pedido 100.000: no queda nada.
    expect(topeAbonoExtraDeuda(100_000, 100_000, 100_000)).toBe(0);
  });

  it('permite el extra hasta lo que queda tras la cuota', () => {
    // saldo 500.000, cuota 200.000: queda 300.000 disponibles para el extra.
    expect(topeAbonoExtraDeuda(500_000, 200_000, 1_000_000)).toBe(300_000);
    expect(topeAbonoExtraDeuda(500_000, 200_000, 100_000)).toBe(100_000);
  });

  it('nunca devuelve negativo si la cuota supera el saldo', () => {
    expect(topeAbonoExtraDeuda(50_000, 100_000, 200_000)).toBe(0);
  });

  it('trata valores no numéricos como 0', () => {
    expect(topeAbonoExtraDeuda(NaN, undefined, 'x')).toBe(0);
  });
});

// ── cuentaIngresoPrincipal() (MC.13e-2f-1) ────────────────────────
describe('cuentaIngresoPrincipal()', () => {
  it('sin ingresos activos, devuelve null', () => {
    expect(cuentaIngresoPrincipal([])).toBeNull();
    expect(cuentaIngresoPrincipal([{ activo: false, frecuencia: 'Mensual', cuentaId: 'c1' }])).toBeNull();
  });

  it('devuelve el cuentaId del ingreso de la frecuencia principal', () => {
    const ingresos = [
      { activo: true, frecuencia: 'Mensual', cuentaId: 'c1' },
      { activo: true, frecuencia: 'Mensual' },
    ];
    expect(cuentaIngresoPrincipal(ingresos)).toBe('c1');
  });

  it('ignora ingresos de una frecuencia minoritaria aunque tengan cuentaId', () => {
    const ingresos = [
      { activo: true, frecuencia: 'Quincenal', cuentaId: 'c1' },
      { activo: true, frecuencia: 'Quincenal' },
      { activo: true, frecuencia: 'Anual', cuentaId: 'c2' },
    ];
    expect(cuentaIngresoPrincipal(ingresos)).toBe('c1');
  });

  it('sin ningún ingreso de la frecuencia principal con cuentaId, devuelve null', () => {
    const ingresos = [{ activo: true, frecuencia: 'Mensual' }];
    expect(cuentaIngresoPrincipal(ingresos)).toBeNull();
  });
});

// ── construirPlanInversiones() (MC.4e) ────────────────────────────
describe('construirPlanInversiones()', () => {
  it('arma una fila por holding con monto 0 y capital actual como contexto', () => {
    const plan = construirPlanInversiones({ inversiones: [
      { id: 'inv1', nombre: 'CDT Bancolombia', tipo: 'CDT', monto: 5_000_000 },
    ]});
    expect(plan[0]).toMatchObject({ tipo: 'inversion', id: 'inv1', nombre: 'CDT Bancolombia', monto: 0, invertido: 5_000_000 });
  });

  it('ordena de mayor a menor capital invertido', () => {
    const plan = construirPlanInversiones({ inversiones: [
      { id: 'chica',  nombre: 'Cripto', monto: 500_000 },
      { id: 'grande', nombre: 'Fondo',  monto: 9_000_000 },
    ]});
    expect(plan.map(p => p.id)).toEqual(['grande', 'chica']);
  });

  it('nombre por defecto y capital 0 cuando faltan datos', () => {
    const plan = construirPlanInversiones({ inversiones: [{ id: 'inv1' }] });
    expect(plan[0]).toMatchObject({ tipo: 'inversion', id: 'inv1', nombre: 'Inversión', monto: 0, invertido: 0 });
  });

  it('sin inversiones devuelve un plan vacío', () => {
    expect(construirPlanInversiones({ inversiones: [] })).toEqual([]);
    expect(construirPlanInversiones({})).toEqual([]);
    expect(construirPlanInversiones({ inversiones: null })).toEqual([]);
  });
});

// ── construirFilasTransferenciaCuentas() (MC.7e, ADR 018 decisión 4) ──
describe('construirFilasTransferenciaCuentas()', () => {
  it('arma una fila por cuenta con monto 0 (sin marcar) y el saldo actual como contexto', () => {
    const filas = construirFilasTransferenciaCuentas([
      { id: 'c1', nombre: 'Nequi', saldo: 300_000 },
    ]);
    expect(filas).toEqual([{ tipo: 'cuenta', id: 'c1', nombre: 'Nequi', monto: 0, saldoActual: 300_000, banco: undefined, icono: null }]);
  });

  it('ordena de mayor a menor saldo actual', () => {
    const filas = construirFilasTransferenciaCuentas([
      { id: 'chica',  nombre: 'Efectivo', saldo: 50_000 },
      { id: 'grande', nombre: 'Bancolombia', saldo: 2_000_000 },
    ]);
    expect(filas.map(f => f.id)).toEqual(['grande', 'chica']);
  });

  it('nombre por defecto y saldo 0 cuando faltan datos', () => {
    const filas = construirFilasTransferenciaCuentas([{ id: 'c1' }]);
    expect(filas[0]).toEqual({ tipo: 'cuenta', id: 'c1', nombre: 'Cuenta', monto: 0, saldoActual: 0, banco: undefined, icono: null });
  });

  it('sin cuentas devuelve un array vacío', () => {
    expect(construirFilasTransferenciaCuentas([])).toEqual([]);
    expect(construirFilasTransferenciaCuentas()).toEqual([]);
    expect(construirFilasTransferenciaCuentas(null)).toEqual([]);
  });
});

// ── MC.6c: gasto variable como proxy de estilo de vida ───────────

describe('calcularGastoVariablePromedio (MC.6c)', () => {
  // Referencia fija: 15 de junio de 2026. Meses completos: mar, abr, may.
  const HOY = new Date(2026, 5, 15);

  it('promedia los meses completos anteriores y excluye el mes corriente', () => {
    const gastos = [
      { id: '1', monto: 300_000, categoria: 'Mercado',   fecha: '2026-05-10' },
      { id: '2', monto: 500_000, categoria: 'Transporte', fecha: '2026-04-20' },
      { id: '3', monto: 999_999, categoria: 'Mercado',   fecha: '2026-06-01' },  // mes corriente: fuera
    ];
    // (300.000 + 500.000) / 2 meses con datos = 400.000
    expect(calcularGastoVariablePromedio(gastos, HOY)).toBe(400_000);
  });

  it('excluye abonos, aportes, pagos de fijos y gastos vinculados a compromisos', () => {
    const gastos = [
      { id: '1', monto: 200_000, categoria: 'Café',         fecha: '2026-05-10' },
      { id: '2', monto: 900_000, categoria: 'Deudas',       fecha: '2026-05-11' },
      { id: '3', monto: 900_000, categoria: 'Ahorro',       fecha: '2026-05-12' },
      { id: '4', monto: 900_000, categoria: 'Gastos fijos', fecha: '2026-05-13' },
      { id: '5', monto: 900_000, categoria: 'Mercado',      fecha: '2026-05-14', compromisoId: 'c1' },
    ];
    expect(calcularGastoVariablePromedio(gastos, HOY)).toBe(200_000);
  });

  it('un mes sin gastos no diluye el promedio', () => {
    const gastos = [
      { id: '1', monto: 600_000, categoria: 'Mercado', fecha: '2026-03-10' },
      // abril y mayo sin registros
    ];
    expect(calcularGastoVariablePromedio(gastos, HOY)).toBe(600_000);
  });

  it('sin historial devuelve 0 (señal apagada)', () => {
    expect(calcularGastoVariablePromedio([], HOY)).toBe(0);
    expect(calcularGastoVariablePromedio(null, HOY)).toBe(0);
    // Solo gastos del mes corriente: también 0.
    expect(calcularGastoVariablePromedio(
      [{ id: '1', monto: 100_000, categoria: 'Mercado', fecha: '2026-06-05' }], HOY,
    )).toBe(0);
  });
});

describe('sugerirDistribucionIngreso - señales MC.6c', () => {
  // Base: ingreso 2M, obligaciones 1M (50%), fondo incompleto con ritmo
  // ideal de 200.000/mes (faltante 2.4M / 12). Piso EV base: 200.000 (10%).
  const base = {
    gastosFijosMensuales: 800_000,
    cuotasDeudaMensuales: 200_000,
    faltanteFondo:        2_400_000,
    tieneFondoActivo:     true,
    fondoCompleto:        false,
  };

  it('sin historial de gasto variable, el reparto no cambia (retrocompatible)', () => {
    const r = sugerirDistribucionIngreso(2_000_000, { ...base });
    expect(r.split.ahorro.pct).toBe(10);       // 200.000: el ritmo ideal cabe
    expect(r.split.estiloVida.pct).toBe(40);
  });

  it('el historial eleva el piso de Estilo de vida y aprieta el ahorro honestamente', () => {
    const r = sugerirDistribucionIngreso(2_000_000, {
      ...base,
      gastoVariablePromedio: 900_000,  // vida real: 45% del ingreso
    });
    // residuo 1M >= pisoAhorro 100k + pisoEV 900k → ahorro = residuo - pisoEV = 100.000
    expect(r.split.ahorro.monto).toBe(100_000);
    expect(r.split.estiloVida.pct).toBe(45);
    expect(r.razon).toContain('gasto variable');
    expect(r.alertas.join(' ')).toMatch(/gasto variable .* limita cuánto puedes ahorrar/i);
  });

  it('un historial menor al piso base no infla el estilo de vida', () => {
    const r = sugerirDistribucionIngreso(2_000_000, {
      ...base,
      gastoVariablePromedio: 100_000,  // 5%: por debajo del piso del 10%
    });
    expect(r.split.ahorro.pct).toBe(10);
    expect(r.razon).not.toContain('gasto variable');
  });

  it('con fondo completo y usuario que ya invierte, el ahorro apunta a inversiones', () => {
    const r = sugerirDistribucionIngreso(2_000_000, {
      gastosFijosMensuales: 500_000,
      tieneFondoActivo:     true,
      fondoCompleto:        true,
      tieneInversiones:     true,
    });
    expect(r.razon).toContain('puede ir a tus inversiones');
    expect(r.ctas.map(c => c.label)).toContain('Aportar a tus inversiones');
    expect(r.split.ahorro.label).toBe('Ahorro e inversión');
  });

  it('sin inversiones, la CTA sigue siendo explorar (no aportar)', () => {
    const r = sugerirDistribucionIngreso(2_000_000, {
      gastosFijosMensuales: 500_000,
      tieneFondoActivo:     true,
      fondoCompleto:        true,
      tieneInversiones:     false,
    });
    const labels = r.ctas.map(c => c.label);
    expect(labels).toContain('Explorar inversiones');
    expect(labels).not.toContain('Aportar a tus inversiones');
  });

  it('construirContextoDistribucion expone gastoVariablePromedio', () => {
    const ctx = construirContextoDistribucion({ gastos: [] });
    expect(ctx.gastoVariablePromedio).toBe(0);
  });
});

// ── CTA unificado "necesitas una cuenta" ─────────────────────────
// Al intentar registrar un ingreso/gasto/abono sin ninguna cuenta, el mensaje
// no debe limitarse a informar: lleva directo a crear la cuenta (ir-a-crear-cuenta
// → EventBus 'cuenta:crear' → abre el formulario de nueva cuenta).
describe('registro sin cuentas: el CTA lleva directo a crear la cuenta', () => {
  afterEach(() => {
    EventBus._listeners['cuenta:crear'] = [];
    document.body.innerHTML = '';
  });

  it('renderFormIngresoPuntual() sin cuentas: empty state con CTA ir-a-crear-cuenta', () => {
    S.cuentas = [];
    const html = renderFormIngresoPuntual();
    expect(html).toContain('form-empty');
    expect(html).not.toContain('id="form-ingreso-puntual"');
    expect(html).toContain('Crear una cuenta');
    expect(html).toContain('data-action="ir-a-crear-cuenta"');
    // El bug reportado: antes solo cerraba el modal y dejaba al usuario perdido.
    expect(html).not.toContain('data-action="modal-close"');
    expect(html).not.toContain('Entendido');
  });

  it('MC.15d: categoría precede a descripción (mismo orden que renderFormIngreso)', () => {
    S.cuentas = [{ id: 'c1', nombre: 'Efectivo', activa: true }];
    const html = renderFormIngresoPuntual();
    const idxCat  = html.indexOf('id="ingreso-p-cat"');
    const idxDesc = html.indexOf('id="ingreso-p-desc"');
    expect(idxCat).toBeGreaterThan(-1);
    expect(idxDesc).toBeGreaterThan(-1);
    expect(idxCat).toBeLessThan(idxDesc);
  });

  it('el evento cuenta:crear abre el formulario de nueva cuenta', () => {
    document.body.innerHTML = `
      <div class="app-shell"></div>
      <div class="modal-overlay" id="modal-cuenta" aria-hidden="true">
        <div class="modal">
          <h2 class="modal__title">x</h2>
          <form id="form-cuenta"></form>
        </div>
      </div>`;
    initAccionesCuentas();

    const overlay = document.getElementById('modal-cuenta');
    expect(overlay.dataset.open).toBeUndefined();

    EventBus.emit('cuenta:crear');

    // _nuevaCuenta abrió el modal en modo creación.
    expect(overlay.dataset.open).toBe('');
    expect(overlay.querySelector('.modal__title').textContent).toBe('Nueva cuenta');
  });
});

// ── TRANSFERENCIAS ENTRE CUENTAS (MC.17a) ────────────────────────

describe('validarTransferencia', () => {
  const cuentas = [
    cuentaBase({ id: 'c1', saldo: 300_000 }),
    cuentaBase({ id: 'c2', nombre: 'Bancolombia', banco: 'Bancolombia', saldo: 50_000 }),
    cuentaBase({ id: 'c3', nombre: 'Vieja', activa: false, saldo: 900_000 }),
  ];
  const datosValidos = () => ({
    cuentaOrigenId: 'c1', cuentaDestinoId: 'c2', monto: '100000', fecha: '2026-07-12',
  });

  it('acepta una transferencia bien formada entre dos cuentas activas distintas', () => {
    expect(validarTransferencia(datosValidos(), cuentas)).toEqual([]);
  });

  it('exige cuenta de origen', () => {
    const errores = validarTransferencia({ ...datosValidos(), cuentaOrigenId: '' }, cuentas);
    expect(errores).toContain('Debes elegir la cuenta de origen.');
  });

  it('exige cuenta de destino', () => {
    const errores = validarTransferencia({ ...datosValidos(), cuentaDestinoId: '  ' }, cuentas);
    expect(errores).toContain('Debes elegir la cuenta de destino.');
  });

  it('rechaza origen y destino iguales', () => {
    const errores = validarTransferencia({ ...datosValidos(), cuentaDestinoId: 'c1' }, cuentas);
    expect(errores).toContain('El origen y el destino deben ser cuentas distintas.');
  });

  it('rechaza una cuenta inactiva como origen', () => {
    const errores = validarTransferencia({ ...datosValidos(), cuentaOrigenId: 'c3' }, cuentas);
    expect(errores).toContain('La cuenta de origen no existe o no está activa.');
  });

  it('rechaza una cuenta inexistente como destino', () => {
    const errores = validarTransferencia({ ...datosValidos(), cuentaDestinoId: 'zzz' }, cuentas);
    expect(errores).toContain('La cuenta de destino no existe o no está activa.');
  });

  it('rechaza monto no positivo o no numérico', () => {
    expect(validarTransferencia({ ...datosValidos(), monto: '0' }, cuentas))
      .toContain('El monto debe ser un número mayor a 0.');
    expect(validarTransferencia({ ...datosValidos(), monto: '-5' }, cuentas))
      .toContain('El monto debe ser un número mayor a 0.');
    expect(validarTransferencia({ ...datosValidos(), monto: 'abc' }, cuentas))
      .toContain('El monto debe ser un número mayor a 0.');
  });

  it('exige una fecha con formato ISO', () => {
    expect(validarTransferencia({ ...datosValidos(), fecha: '' }, cuentas))
      .toContain('La fecha es obligatoria.');
    expect(validarTransferencia({ ...datosValidos(), fecha: '12/07/2026' }, cuentas))
      .toContain('La fecha es obligatoria.');
  });

  it('el saldo insuficiente NO es un error de validación (lo resuelve la confirmación de la UI)', () => {
    // c2 tiene 50.000; transferir 100.000 desde c2 supera el saldo, pero valida.
    const errores = validarTransferencia({
      cuentaOrigenId: 'c2', cuentaDestinoId: 'c1', monto: '100000', fecha: '2026-07-12',
    }, cuentas);
    expect(errores).toEqual([]);
  });

  it('no duplica el error de "distintas" cuando falta una cuenta', () => {
    const errores = validarTransferencia({
      cuentaOrigenId: 'c1', cuentaDestinoId: '', monto: '100000', fecha: '2026-07-12',
    }, cuentas);
    expect(errores).not.toContain('El origen y el destino deben ser cuentas distintas.');
  });
});

describe('saldoSuficiente', () => {
  const cuentas = [cuentaBase({ id: 'c1', saldo: 300_000 })];

  it('true cuando el saldo cubre el monto', () => {
    expect(saldoSuficiente(cuentas, 'c1', 300_000)).toBe(true);
    expect(saldoSuficiente(cuentas, 'c1', 100_000)).toBe(true);
  });

  it('false cuando el monto supera el saldo', () => {
    expect(saldoSuficiente(cuentas, 'c1', 300_001)).toBe(false);
  });

  it('false cuando la cuenta no existe', () => {
    expect(saldoSuficiente(cuentas, 'zzz', 1)).toBe(false);
  });
});

describe('normalizarTransferencia', () => {
  it('convierte los datos crudos al shape del schema', () => {
    const t = normalizarTransferencia({
      cuentaOrigenId: ' c1 ', cuentaDestinoId: ' c2 ', monto: '150000', fecha: '2026-07-12', nota: ' arriendo ',
    });
    expect(t).toEqual({
      cuentaOrigenId: 'c1', cuentaDestinoId: 'c2', monto: 150_000, fecha: '2026-07-12', nota: 'arriendo',
    });
  });

  it('omite la nota cuando viene vacía tras recortar', () => {
    const t = normalizarTransferencia({
      cuentaOrigenId: 'c1', cuentaDestinoId: 'c2', monto: '150000', fecha: '2026-07-12', nota: '   ',
    });
    expect(t).not.toHaveProperty('nota');
  });

  it('omite la nota cuando no viene', () => {
    const t = normalizarTransferencia({
      cuentaOrigenId: 'c1', cuentaDestinoId: 'c2', monto: '150000', fecha: '2026-07-12',
    });
    expect(t).not.toHaveProperty('nota');
  });

  // ── GMF (MC.17d) ──────────────────────────────────────────────
  it('agrega costoGMF cuando es positivo', () => {
    const t = normalizarTransferencia({
      cuentaOrigenId: 'c1', cuentaDestinoId: 'c2', monto: '200000', fecha: '2026-07-12',
    }, 800);
    expect(t.costoGMF).toBe(800);
  });

  it('omite costoGMF cuando es 0 o no se pasa (campo opcional, sin migración)', () => {
    const sinGmf = normalizarTransferencia({ cuentaOrigenId: 'c1', cuentaDestinoId: 'c2', monto: '200000', fecha: '2026-07-12' });
    expect(sinGmf).not.toHaveProperty('costoGMF');
    const cero = normalizarTransferencia({ cuentaOrigenId: 'c1', cuentaDestinoId: 'c2', monto: '200000', fecha: '2026-07-12' }, 0);
    expect(cero).not.toHaveProperty('costoGMF');
  });
});

describe('costoGMFRetiro (MC.17d)', () => {
  it('calcula el 4x1000 del monto, redondeado al peso', () => {
    expect(costoGMFRetiro(200_000)).toBe(800);
    expect(costoGMFRetiro(137_500)).toBe(550);
    expect(costoGMFRetiro(12_345)).toBe(49); // 49.38 → 49
  });

  it('monto no positivo o inválido devuelve 0', () => {
    expect(costoGMFRetiro(0)).toBe(0);
    expect(costoGMFRetiro(-100)).toBe(0);
    expect(costoGMFRetiro('abc')).toBe(0);
    expect(costoGMFRetiro(undefined)).toBe(0);
  });
});

describe('origenSujetoAGMF (MC.17d)', () => {
  const cuentas = [
    cuentaBase({ id: 'c1', aplica4x1000: true }),
    cuentaBase({ id: 'c2', aplica4x1000: false }),
    cuentaBase({ id: 'c3' }), // sin el campo
  ];

  it('true solo cuando la cuenta tiene aplica4x1000 === true', () => {
    expect(origenSujetoAGMF(cuentas, 'c1')).toBe(true);
  });

  it('false cuando la cuenta está exenta, no tiene el campo, o no existe', () => {
    expect(origenSujetoAGMF(cuentas, 'c2')).toBe(false);
    expect(origenSujetoAGMF(cuentas, 'c3')).toBe(false);
    expect(origenSujetoAGMF(cuentas, 'zzz')).toBe(false);
  });
});

describe('calcularTransferencia', () => {
  const cuentas = () => [
    cuentaBase({ id: 'c1', saldo: 300_000 }),
    cuentaBase({ id: 'c2', nombre: 'Bancolombia', banco: 'Bancolombia', saldo: 50_000 }),
  ];

  it('debita el origen y acredita el destino por el monto', () => {
    const plan = calcularTransferencia({ cuentaOrigenId: 'c1', cuentaDestinoId: 'c2', monto: 100_000 }, cuentas());
    expect(plan.actualizaciones).toEqual([
      { cuentaId: 'c1', saldo: 200_000 },
      { cuentaId: 'c2', saldo: 150_000 },
    ]);
  });

  it('invariante: la suma de los deltas es 0 (patrimonio neto sin cambio)', () => {
    const plan = calcularTransferencia({ cuentaOrigenId: 'c1', cuentaDestinoId: 'c2', monto: 137_500 }, cuentas());
    const suma = plan.deltas.reduce((s, d) => s + d.delta, 0);
    expect(suma).toBe(0);
    expect(plan.deltas).toEqual([
      { cuentaId: 'c1', delta: -137_500 },
      { cuentaId: 'c2', delta:  137_500 },
    ]);
  });

  it('permite dejar el origen en negativo (sobregiro): el guard es solo estructural', () => {
    const plan = calcularTransferencia({ cuentaOrigenId: 'c2', cuentaDestinoId: 'c1', monto: 80_000 }, cuentas());
    expect(plan.actualizaciones).toEqual([
      { cuentaId: 'c2', saldo: -30_000 },
      { cuentaId: 'c1', saldo: 380_000 },
    ]);
  });

  it('devuelve null si el origen no existe o está inactivo', () => {
    expect(calcularTransferencia({ cuentaOrigenId: 'zzz', cuentaDestinoId: 'c2', monto: 100_000 }, cuentas())).toBeNull();
    const conInactiva = [...cuentas(), cuentaBase({ id: 'c3', activa: false, saldo: 900_000 })];
    expect(calcularTransferencia({ cuentaOrigenId: 'c3', cuentaDestinoId: 'c2', monto: 100_000 }, conInactiva)).toBeNull();
  });

  it('devuelve null si origen y destino son la misma cuenta', () => {
    expect(calcularTransferencia({ cuentaOrigenId: 'c1', cuentaDestinoId: 'c1', monto: 100_000 }, cuentas())).toBeNull();
  });

  it('devuelve null si el monto no es positivo', () => {
    expect(calcularTransferencia({ cuentaOrigenId: 'c1', cuentaDestinoId: 'c2', monto: 0 }, cuentas())).toBeNull();
    expect(calcularTransferencia({ cuentaOrigenId: 'c1', cuentaDestinoId: 'c2', monto: -1 }, cuentas())).toBeNull();
  });

  it('trata un saldo ausente como 0', () => {
    const sinSaldo = [
      { id: 'c1', nombre: 'A', banco: 'Nequi', tipo: 'Ahorros', activa: true },
      cuentaBase({ id: 'c2', saldo: 50_000 }),
    ];
    const plan = calcularTransferencia({ cuentaOrigenId: 'c1', cuentaDestinoId: 'c2', monto: 20_000 }, sinSaldo);
    expect(plan.actualizaciones).toEqual([
      { cuentaId: 'c1', saldo: -20_000 },
      { cuentaId: 'c2', saldo:  70_000 },
    ]);
  });

  // ── GMF del retiro (MC.17d) ───────────────────────────────────
  it('con costoGMF: del origen sale monto + GMF, al destino entra solo el monto', () => {
    const plan = calcularTransferencia(
      { cuentaOrigenId: 'c1', cuentaDestinoId: 'c2', monto: 200_000, costoGMF: 800 }, cuentas(),
    );
    expect(plan.actualizaciones).toEqual([
      { cuentaId: 'c1', saldo: 99_200 },   // 300.000 - 200.000 - 800
      { cuentaId: 'c2', saldo: 250_000 },  // 50.000 + 200.000
    ]);
  });

  it('con costoGMF: el patrimonio neto baja exactamente el GMF (Σ deltas = -costoGMF)', () => {
    const plan = calcularTransferencia(
      { cuentaOrigenId: 'c1', cuentaDestinoId: 'c2', monto: 200_000, costoGMF: 800 }, cuentas(),
    );
    const suma = plan.deltas.reduce((s, d) => s + d.delta, 0);
    expect(suma).toBe(-800);
    expect(plan.deltas).toEqual([
      { cuentaId: 'c1', delta: -200_800 },
      { cuentaId: 'c2', delta:  200_000 },
    ]);
  });

  it('costoGMF ausente o 0 se comporta como MC.17a (Σ deltas = 0)', () => {
    const plan = calcularTransferencia(
      { cuentaOrigenId: 'c1', cuentaDestinoId: 'c2', monto: 100_000, costoGMF: 0 }, cuentas(),
    );
    expect(plan.deltas.reduce((s, d) => s + d.delta, 0)).toBe(0);
  });
});

// ── TRANSFERENCIAS: VISTA + ACCIONES (MC.17b) ────────────────────

describe('renderBotonTransferir()', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="tesoreria-transferir"></div>';
  });

  it('sin cuentas: contenedor vacío', () => {
    S.cuentas = [];
    renderBotonTransferir();
    expect(document.getElementById('tesoreria-transferir').innerHTML).toBe('');
  });

  it('con 1 cuenta activa: contenedor vacío (no hay dos endpoints)', () => {
    S.cuentas = [cuentaBase({ id: 'c1' })];
    renderBotonTransferir();
    expect(document.getElementById('tesoreria-transferir').innerHTML).toBe('');
  });

  it('con 2+ cuentas activas: botón visible con su data-action', () => {
    S.cuentas = [cuentaBase({ id: 'c1' }), cuentaBase({ id: 'c2', nombre: 'Bancolombia', banco: 'Bancolombia' })];
    renderBotonTransferir();
    const boton = document.querySelector('[data-action="abrir-transferencia"]');
    expect(boton).not.toBeNull();
    // ADR 080 D2: conserva su etiqueta y gana la marca de atajo, porque el
    // verbo es un movimiento y su casa canónica es la teja de Registrar.
    expect(boton.textContent).toContain('Transferir entre cuentas');
    expect(boton.querySelector('.chip')?.textContent.trim()).toBe('Atajo');
  });

  // MC-DIS.9 C3 (regla R21): era btn-ghost btn-sm sin ícono, el control más
  // discreto de la sección siendo el único que mueve dinero real.
  it('el botón deja de ser ghost pequeño y gana el ícono de transferencia', () => {
    S.cuentas = [cuentaBase({ id: 'c1' }), cuentaBase({ id: 'c2', nombre: 'Bancolombia', banco: 'Bancolombia' })];
    renderBotonTransferir();
    const boton = document.querySelector('[data-action="abrir-transferencia"]');
    expect(boton.classList.contains('transferir-entrada')).toBe(true);
    expect(boton.classList.contains('btn-sm')).toBe(false);
    expect(boton.classList.contains('btn-ghost')).toBe(false);
    expect(boton.innerHTML).toContain('#i-transferencia');
  });

  it('una cuenta inactiva no cuenta para el umbral de 2', () => {
    S.cuentas = [cuentaBase({ id: 'c1' }), cuentaBase({ id: 'c2', activa: false })];
    renderBotonTransferir();
    expect(document.getElementById('tesoreria-transferir').innerHTML).toBe('');
  });
});

describe('renderFormTransferencia()', () => {
  it('con menos de 2 cuentas activas: string vacío', () => {
    S.cuentas = [cuentaBase({ id: 'c1' })];
    expect(renderFormTransferencia()).toBe('');
  });

  it('con exactamente 2 cuentas: usa el widget de par (botón invertir, sin radiogroup)', () => {
    S.cuentas = [
      cuentaBase({ id: 'c1', saldo: 300_000 }),
      cuentaBase({ id: 'c2', nombre: 'Bancolombia', banco: 'Bancolombia', saldo: 900_000 }),
    ];
    const html = renderFormTransferencia();
    expect(html).toContain('transferir-par');
    expect(html).toContain('data-action="invertir-transferencia"');
    expect(html).not.toContain('role="radiogroup"');
    // Origen por defecto = cuenta de mayor saldo (c2).
    expect(html).toContain('name="cuentaOrigenId" value="c2"');
    expect(html).toContain('name="cuentaDestinoId" value="c1"');
  });

  it('con 3+ cuentas: dos selectores independientes origen/destino', () => {
    S.cuentas = [
      cuentaBase({ id: 'c1' }),
      cuentaBase({ id: 'c2', nombre: 'Bancolombia', banco: 'Bancolombia' }),
      cuentaBase({ id: 'c3', nombre: 'Nu', banco: 'Nu' }),
    ];
    const html = renderFormTransferencia();
    expect(html).not.toContain('transferir-par');
    expect(html).toContain('name="cuentaOrigenId"');
    expect(html).toContain('name="cuentaDestinoId"');
    expect((html.match(/role="radiogroup"/g) ?? []).length).toBe(2);
  });

  it('incluye monto, fecha y nota opcional', () => {
    S.cuentas = [cuentaBase({ id: 'c1' }), cuentaBase({ id: 'c2', nombre: 'Bancolombia', banco: 'Bancolombia' })];
    const html = renderFormTransferencia();
    expect(html).toContain('id="transferencia-monto"');
    expect(html).toContain('id="transferencia-fecha"');
    expect(html).toContain('id="transferencia-nota"');
  });

  // ── GMF (MC.17d) ──────────────────────────────────────────────
  it('siempre incluye el slot del GMF (contenedor estable)', () => {
    S.cuentas = [cuentaBase({ id: 'c1' }), cuentaBase({ id: 'c2', nombre: 'Bancolombia', banco: 'Bancolombia' })];
    expect(renderFormTransferencia()).toContain('id="transferencia-gmf-slot"');
  });

  it('con origen inicial (mayor saldo) NO exento: el checkbox del 4x1000 aparece marcado', () => {
    S.cuentas = [
      cuentaBase({ id: 'c1', saldo: 300_000, aplica4x1000: false }),
      cuentaBase({ id: 'c2', nombre: 'Bancolombia', banco: 'Bancolombia', saldo: 900_000, aplica4x1000: true }),
    ];
    const html = renderFormTransferencia();
    expect(html).toContain('name="aplicarGMF"');
    expect(html).toContain('id="transferencia-gmf"');
  });

  it('con origen inicial exento: no aparece la sección del 4x1000', () => {
    S.cuentas = [
      cuentaBase({ id: 'c1', saldo: 300_000, aplica4x1000: true }),
      cuentaBase({ id: 'c2', nombre: 'Bancolombia', banco: 'Bancolombia', saldo: 900_000, aplica4x1000: false }),
    ];
    // Origen inicial = mayor saldo = c2 (exento) → sin checkbox.
    expect(renderFormTransferencia()).not.toContain('name="aplicarGMF"');
  });
});

describe('renderSeccionGMF() (MC.17d)', () => {
  it('cuenta no exenta: checkbox marcado + hint', () => {
    const html = renderSeccionGMF(cuentaBase({ id: 'c1', nombre: 'Nequi', aplica4x1000: true }));
    expect(html).toContain('name="aplicarGMF"');
    expect(html).toContain('checked');
    expect(html).toContain('id="transferencia-gmf-hint"');
    expect(html).toContain('Nequi');
  });

  it('cuenta exenta, sin el campo, o sin origen: string vacío', () => {
    expect(renderSeccionGMF(cuentaBase({ id: 'c1', aplica4x1000: false }))).toBe('');
    expect(renderSeccionGMF(cuentaBase({ id: 'c1' }))).toBe('');
    expect(renderSeccionGMF(undefined)).toBe('');
  });
});

describe('renderParTransferencia()', () => {
  it('pinta nombre + saldo de cada cuenta y los inputs hidden con sus ids', () => {
    const origen  = cuentaBase({ id: 'c1', nombre: 'Nequi', saldo: 300_000 });
    const destino = cuentaBase({ id: 'c2', nombre: 'Bancolombia', banco: 'Bancolombia', saldo: 900_000 });
    const html = renderParTransferencia(origen, destino);
    expect(html).toContain('Nequi');
    expect(html).toContain('Bancolombia');
    expect(html).toContain('$300.000');
    expect(html).toContain('$900.000');
    expect(html).toContain('name="cuentaOrigenId" value="c1"');
    expect(html).toContain('name="cuentaDestinoId" value="c2"');
  });

  // MC-DIS.9 C6: el glifo ⇄ pasa al símbolo i-transferencia del sprite.
  it('el botón de invertir usa el ícono del sprite, no el carácter ⇄', () => {
    const html = renderParTransferencia(
      cuentaBase({ id: 'c1' }),
      cuentaBase({ id: 'c2', banco: 'Bancolombia' }),
    );
    expect(html).toContain('#i-transferencia');
    expect(html).not.toContain('⇄');
  });
});

describe('acciones de transferencias (MC.17b)', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div class="app-shell"></div>
      <div id="tesoreria-transferir"></div>
      <div class="modal-overlay" id="modal-transferencia" aria-hidden="true">
        <div class="modal">
          <div class="modal__body" id="modal-transferencia-body"></div>
        </div>
      </div>`;
    S.cuentas = [
      cuentaBase({ id: 'c1', nombre: 'Nequi', saldo: 300_000 }),
      cuentaBase({ id: 'c2', nombre: 'Bancolombia', banco: 'Bancolombia', saldo: 900_000 }),
    ];
    S.transferencias = [];
    initAccionesTransferencias();
    renderBotonTransferir();
  });

  it('abrir-transferencia inyecta el form y abre el modal con la fecha precargada', () => {
    dispatch(document.querySelector('[data-action="abrir-transferencia"]'), new Event('click'));

    const overlay = document.getElementById('modal-transferencia');
    expect(overlay.dataset.open).toBe('');
    expect(document.getElementById('form-transferencia')).not.toBeNull();
    expect(document.getElementById('transferencia-fecha').value).not.toBe('');
  });

  it('invertir-transferencia intercambia origen y destino (2 cuentas)', () => {
    dispatch(document.querySelector('[data-action="abrir-transferencia"]'), new Event('click'));

    const wrapAntes    = document.getElementById('transferencia-par-wrap');
    const origenAntes  = wrapAntes.querySelector('input[name="cuentaOrigenId"]').value;
    const destinoAntes = wrapAntes.querySelector('input[name="cuentaDestinoId"]').value;

    dispatch(document.querySelector('[data-action="invertir-transferencia"]'), new Event('click'));

    const wrapDespues = document.getElementById('transferencia-par-wrap');
    expect(wrapDespues.querySelector('input[name="cuentaOrigenId"]').value).toBe(destinoAntes);
    expect(wrapDespues.querySelector('input[name="cuentaDestinoId"]').value).toBe(origenAntes);
  });

  it('confirmar con saldo suficiente: descuenta origen, acredita destino, guarda historial y cierra el modal', () => {
    dispatch(document.querySelector('[data-action="abrir-transferencia"]'), new Event('click'));

    const wrap      = document.getElementById('transferencia-par-wrap');
    const origenId  = wrap.querySelector('input[name="cuentaOrigenId"]').value;  // c2, mayor saldo
    const destinoId = wrap.querySelector('input[name="cuentaDestinoId"]').value; // c1

    document.getElementById('transferencia-monto').value = '100000';

    const form = document.getElementById('form-transferencia');
    form.dispatchEvent(new Event('submit', { cancelable: true }));

    const cOrigen  = S.cuentas.find(c => c.id === origenId);
    const cDestino = S.cuentas.find(c => c.id === destinoId);
    expect(cOrigen.saldo).toBe(800_000);   // 900.000 - 100.000
    expect(cDestino.saldo).toBe(400_000);  // 300.000 + 100.000

    expect(S.transferencias).toHaveLength(1);
    expect(S.transferencias[0]).toMatchObject({
      cuentaOrigenId:  origenId,
      cuentaDestinoId: destinoId,
      monto:           100_000,
    });

    const overlay = document.getElementById('modal-transferencia');
    expect(overlay.dataset.open).toBeUndefined();
  });

  it('errores de validación se muestran y no tocan S (monto inválido)', () => {
    dispatch(document.querySelector('[data-action="abrir-transferencia"]'), new Event('click'));

    document.getElementById('transferencia-monto').value = '0';
    const form = document.getElementById('form-transferencia');
    form.dispatchEvent(new Event('submit', { cancelable: true }));

    expect(S.transferencias).toHaveLength(0);
    expect(S.cuentas.find(c => c.id === 'c1').saldo).toBe(300_000);
    expect(S.cuentas.find(c => c.id === 'c2').saldo).toBe(900_000);
    expect(document.querySelector('.form-errors')).not.toBeNull();
  });
});

describe('acciones de transferencias: GMF del retiro (MC.17d)', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div class="app-shell"></div>
      <div id="tesoreria-transferir"></div>
      <div class="modal-overlay" id="modal-transferencia" aria-hidden="true">
        <div class="modal">
          <div class="modal__body" id="modal-transferencia-body"></div>
        </div>
      </div>`;
    // Origen por defecto = mayor saldo = c2 (Bancolombia), NO exento del 4x1000.
    S.cuentas = [
      cuentaBase({ id: 'c1', nombre: 'Nequi', saldo: 300_000, aplica4x1000: false }),
      cuentaBase({ id: 'c2', nombre: 'Bancolombia', banco: 'Bancolombia', saldo: 900_000, aplica4x1000: true }),
    ];
    S.transferencias = [];
    initAccionesTransferencias();
    renderBotonTransferir();
  });

  it('con el checkbox marcado: del origen sale monto + GMF, al destino entra el monto, y guarda costoGMF', () => {
    dispatch(document.querySelector('[data-action="abrir-transferencia"]'), new Event('click'));
    expect(document.querySelector('input[name="aplicarGMF"]').checked).toBe(true);

    document.getElementById('transferencia-monto').value = '200000';
    document.getElementById('form-transferencia').dispatchEvent(new Event('submit', { cancelable: true }));

    expect(S.cuentas.find(c => c.id === 'c2').saldo).toBe(699_200); // 900.000 - 200.000 - 800
    expect(S.cuentas.find(c => c.id === 'c1').saldo).toBe(500_000); // 300.000 + 200.000
    expect(S.transferencias[0].costoGMF).toBe(800);
  });

  it('desmarcando el checkbox: no descuenta el 4x1000 ni lo guarda', () => {
    dispatch(document.querySelector('[data-action="abrir-transferencia"]'), new Event('click'));
    document.querySelector('input[name="aplicarGMF"]').checked = false;

    document.getElementById('transferencia-monto').value = '200000';
    document.getElementById('form-transferencia').dispatchEvent(new Event('submit', { cancelable: true }));

    expect(S.cuentas.find(c => c.id === 'c2').saldo).toBe(700_000); // 900.000 - 200.000, sin GMF
    expect(S.transferencias[0]).not.toHaveProperty('costoGMF');
  });

  it('invertir hacia un origen exento: la sección del 4x1000 desaparece', () => {
    dispatch(document.querySelector('[data-action="abrir-transferencia"]'), new Event('click'));
    expect(document.querySelector('input[name="aplicarGMF"]')).not.toBeNull(); // origen c2 no exento

    dispatch(document.querySelector('[data-action="invertir-transferencia"]'), new Event('click'));
    // Ahora el origen es c1 (exento): sin checkbox.
    expect(document.querySelector('input[name="aplicarGMF"]')).toBeNull();
  });
});

describe('acciones de transferencias: deshacer (MC.17f)', () => {
  const botonEliminar = (id) => {
    document.body.insertAdjacentHTML('beforeend',
      `<button data-action="eliminar-transferencia" data-id="${id}"></button>`);
    return document.querySelector(`[data-action="eliminar-transferencia"][data-id="${id}"]`);
  };

  beforeEach(() => {
    document.body.innerHTML = '<div class="app-shell"></div>';
    S.cuentas = [
      cuentaBase({ id: 'c1', nombre: 'Nequi', saldo: 400_000 }),
      cuentaBase({ id: 'c2', nombre: 'Bancolombia', banco: 'Bancolombia', saldo: 700_200 }),
    ];
    S.transferencias = [];
    initAccionesTransferencias();
  });

  it('confirmar: devuelve el monto al origen, lo descuenta del destino y borra el registro', async () => {
    S.transferencias = [{ id: 't1', cuentaOrigenId: 'c2', cuentaDestinoId: 'c1', monto: 100_000, fecha: '2026-08-01', fechaCreacion: 'x' }];

    dispatch(botonEliminar('t1'), new Event('click'));
    document.querySelector('[data-role="confirmar"]')?.click();
    await new Promise(r => setTimeout(r, 0));

    expect(S.cuentas.find(c => c.id === 'c2').saldo).toBe(800_200); // 700.200 + 100.000
    expect(S.cuentas.find(c => c.id === 'c1').saldo).toBe(300_000); // 400.000 - 100.000
    expect(S.transferencias).toHaveLength(0);
  });

  it('confirmar con GMF: el origen recupera también el costoGMF cobrado', async () => {
    S.transferencias = [{ id: 't1', cuentaOrigenId: 'c2', cuentaDestinoId: 'c1', monto: 100_000, costoGMF: 400, fecha: '2026-08-01', fechaCreacion: 'x' }];

    dispatch(botonEliminar('t1'), new Event('click'));
    document.querySelector('[data-role="confirmar"]')?.click();
    await new Promise(r => setTimeout(r, 0));

    expect(S.cuentas.find(c => c.id === 'c2').saldo).toBe(800_600); // 700.200 + 100.000 + 400
    expect(S.cuentas.find(c => c.id === 'c1').saldo).toBe(300_000);
  });

  it('cancelar: no toca saldos ni borra el registro', async () => {
    S.transferencias = [{ id: 't1', cuentaOrigenId: 'c2', cuentaDestinoId: 'c1', monto: 100_000, fecha: '2026-08-01', fechaCreacion: 'x' }];

    dispatch(botonEliminar('t1'), new Event('click'));
    document.querySelector('[data-role="cancelar"]')?.click();
    await new Promise(r => setTimeout(r, 0));

    expect(S.cuentas.find(c => c.id === 'c2').saldo).toBe(700_200);
    expect(S.cuentas.find(c => c.id === 'c1').saldo).toBe(400_000);
    expect(S.transferencias).toHaveLength(1);
  });

  it('cuenta destino ya eliminada: revierte solo lo que existe y borra el registro igual', async () => {
    S.transferencias = [{ id: 't1', cuentaOrigenId: 'c2', cuentaDestinoId: 'ya-no-existe', monto: 100_000, fecha: '2026-08-01', fechaCreacion: 'x' }];

    dispatch(botonEliminar('t1'), new Event('click'));
    document.querySelector('[data-role="confirmar"]')?.click();
    await new Promise(r => setTimeout(r, 0));

    expect(S.cuentas.find(c => c.id === 'c2').saldo).toBe(800_200); // 700.200 + 100.000
    expect(S.transferencias).toHaveLength(0);
  });
});

// ── cuentaId del ingreso fijo (MC.13d) ────────────────────────────

describe('normalizarIngreso() - cuentaId (MC.13d)', () => {
  const base = { descripcion: 'Salario', monto: '3500000', frecuencia: 'Mensual' };

  it('guarda la cuenta elegida', () => {
    expect(normalizarIngreso({ ...base, cuentaId: 'c1' }).cuentaId).toBe('c1');
  });

  it('recorta espacios de la cuenta', () => {
    expect(normalizarIngreso({ ...base, cuentaId: '  c1  ' }).cuentaId).toBe('c1');
  });

  it('omite el campo cuando no se eligió cuenta (no lo pone en undefined)', () => {
    // Omitirlo es lo que permite que editar() conserve la cuenta ya guardada.
    expect('cuentaId' in normalizarIngreso({ ...base })).toBe(false);
    expect('cuentaId' in normalizarIngreso({ ...base, cuentaId: '' })).toBe(false);
    expect('cuentaId' in normalizarIngreso({ ...base, cuentaId: '   ' })).toBe(false);
  });

  it('el resto del ingreso no cambia por llevar cuenta', () => {
    const r = normalizarIngreso({ ...base, diaPago: '30', cuentaId: 'c1' });
    expect(r).toMatchObject({ descripcion: 'Salario', monto: 3_500_000, frecuencia: 'Mensual', activo: true, diaPago: 30 });
  });
});

describe('renderFormIngreso() - bloque de cuenta (MC.13d)', () => {
  afterEach(() => { S.cuentas = []; });

  it('sin cuentas activas no pregunta nada (el ingreso puede existir antes que la cuenta)', () => {
    S.cuentas = [];
    const html = renderFormIngreso();
    expect(html).not.toContain('name="cuentaId"');
    expect(html).not.toContain('¿Dónde recibes este dinero?');
  });

  it('con una sola cuenta no pregunta: informa y manda el id en un hidden', () => {
    S.cuentas = [{ id: 'c1', nombre: 'Bancolombia', saldo: 900_000, activa: true }];
    const html = renderFormIngreso();
    expect(html).toContain('¿Dónde recibes este dinero?');
    expect(html).toContain('Bancolombia');
    expect(html).toContain('<input type="hidden" name="cuentaId" value="c1"');
  });

  it('ignora las cuentas inactivas al contar', () => {
    S.cuentas = [
      { id: 'c1', nombre: 'Bancolombia', saldo: 900_000, activa: true },
      { id: 'c2', nombre: 'Vieja', saldo: 0, activa: false },
    ];
    expect(renderFormIngreso()).toContain('<input type="hidden" name="cuentaId" value="c1"');
  });

  it('con varias cuentas muestra el selector y NO preselecciona ninguna', () => {
    S.cuentas = [
      { id: 'c1', nombre: 'Bancolombia', saldo: 900_000, activa: true },
      { id: 'c2', nombre: 'Nequi', saldo: 100_000, activa: true },
    ];
    const html = renderFormIngreso();
    expect(html).toContain('¿En qué cuenta recibes este ingreso?');
    expect(html).toContain('name="cuentaId"');
    // Adivinar dónde entra el sueldo guardaría un dato inventado: sin checked.
    expect(html).not.toContain('checked');
  });

  it('al editar, preselecciona la cuenta ya guardada', () => {
    S.cuentas = [
      { id: 'c1', nombre: 'Bancolombia', saldo: 900_000, activa: true },
      { id: 'c2', nombre: 'Nequi', saldo: 100_000, activa: true },
    ];
    const ingreso = { id: 'i1', descripcion: 'Salario', monto: 3_500_000, frecuencia: 'Mensual', diaPago: 30, cuentaId: 'c2' };
    const html = renderFormIngreso(ingreso);
    expect(html).toContain('value="c2" checked');
  });

  it('el bloque es opcional y lo dice', () => {
    S.cuentas = [
      { id: 'c1', nombre: 'Bancolombia', saldo: 900_000, activa: true },
      { id: 'c2', nombre: 'Nequi', saldo: 100_000, activa: true },
    ];
    expect(renderFormIngreso()).toContain('Opcional.');
  });
});

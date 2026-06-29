import { describe, it, expect } from 'vitest';
import {
  cuentasActivas,
  calcularTotalCuentas,
  validarCuenta,
  normalizarCuenta,
  diasParaPrimaSemestral,
  estimarSalarioMensual,
  sugerirDistribucionPrima,
  parseCuotaManejo,
  compromisoDesdeCuotaManejo,
  compromisoCuotaManejoDeCuenta,
  calcularCostoGMF,
  detectarNudgeGMF,
  validarIngreso,
  normalizarIngreso,
  diasParaProximoPago,
  detectarNudgeProximoIngreso,
  sugerirDistribucionIngreso,
  calcularGastosFijosMensuales,
  esDistribucionPersonalizadaValida,
  construirPlanAhorro,
  resumirPlanDistribucion,
} from '../../modules/dominio/tesoreria/logic.js';

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

  it('asigna emoji según banco si no viene icono', () => {
    const result = normalizarCuenta({ ...datosFormValidos, banco: 'Nequi' });
    expect(result.icono).toBe('💚');
  });

  it('usa emoji genérico para banco no mapeado', () => {
    const result = normalizarCuenta({ ...datosFormValidos, banco: 'Bancolombia' });
    expect(result.icono).toBe('🏦');
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
      frecuencia:     'mensual',
      diaPago:        5,
      tipo:           'fijo',
      activo:         true,
      cuentaId:       'c-nequi',
      esCuotaManejo:  true,
    });
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

// ── sugerirDistribucionIngreso() (Fase 3) ─────────────────────────
describe('sugerirDistribucionIngreso()', () => {
  it('devuelve null cuando ingresoMensual es 0', () => {
    expect(sugerirDistribucionIngreso(0)).toBeNull();
  });

  it('devuelve null cuando ingresoMensual es negativo', () => {
    expect(sugerirDistribucionIngreso(-1_000)).toBeNull();
  });

  it('usa 50/30/20 cuando no hay gastos fijos registrados', () => {
    const r = sugerirDistribucionIngreso(3_000_000);
    expect(r.metodo).toBe('50/30/20');
    expect(r.split.necesidades.pct).toBe(50);
    expect(r.split.estiloVida.pct).toBe(30);
    expect(r.split.ahorro.pct).toBe(20);
  });

  it('usa 50/30/20 cuando pctFijos <= 50 (fijos sanos)', () => {
    const r = sugerirDistribucionIngreso(3_000_000, { gastosFijosMensuales: 1_200_000 }); // 40%
    expect(r.metodo).toBe('50/30/20');
    expect(r.pctFijos).toBe(40);
  });

  it('ajusta el split cuando pctFijos esta entre 50 y 70', () => {
    const r = sugerirDistribucionIngreso(3_000_000, { gastosFijosMensuales: 1_800_000 }); // 60%
    expect(r.metodo).toBe('ajustado');
    expect(r.split.necesidades.pct).toBe(60);
    expect(r.split.necesidades.pct + r.split.estiloVida.pct + r.split.ahorro.pct).toBe(100);
    expect(r.split.ahorro.pct).toBeGreaterThanOrEqual(10);
  });

  it('aplica ajuste agresivo cuando pctFijos es mayor que 70', () => {
    const r = sugerirDistribucionIngreso(3_000_000, { gastosFijosMensuales: 2_400_000 }); // 80%
    expect(r.metodo).toBe('ajustado-fijos-altos');
    expect(r.split.necesidades.pct + r.split.estiloVida.pct + r.split.ahorro.pct).toBe(100);
    expect(r.split.ahorro.pct).toBeGreaterThanOrEqual(5);
    expect(r.alertas.length).toBeGreaterThan(0);
  });

  it('el split siempre suma 100 para distintos niveles de pctFijos', () => {
    [0, 30, 50, 60, 70, 75, 85, 95].forEach(pct => {
      const fijos = pct === 0 ? 0 : Math.round(3_000_000 * pct / 100);
      const r = sugerirDistribucionIngreso(3_000_000, { gastosFijosMensuales: fijos });
      const suma = r.split.necesidades.pct + r.split.estiloVida.pct + r.split.ahorro.pct;
      expect(suma, `pctFijos=${pct}`).toBe(100);
    });
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

  it('no agrega CTA a inversion cuando el usuario ya invierte', () => {
    const r = sugerirDistribucionIngreso(3_000_000, {
      tieneFondoActivo: true, fondoCompleto: true, tieneInversiones: true,
    });
    expect(r.ctas.some(c => c.seccion === 'inversion')).toBe(false);
  });

  it('agrega alerta y CTA a compromisos cuando hay deudas activas', () => {
    const r = sugerirDistribucionIngreso(3_000_000, { tieneDeudas: true });
    expect(r.alertas.some(a => a.includes('deuda'))).toBe(true);
    expect(r.ctas.some(c => c.seccion === 'compromisos')).toBe(true);
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

// ── construirPlanAhorro() (MC.4a) ─────────────────────────────────
describe('construirPlanAhorro()', () => {
  it('con fondo activo e incompleto sugiere todo el presupuesto al fondo', () => {
    const plan = construirPlanAhorro({
      budget: 600_000,
      fondo: { activo: true, completado: false },
      metas: [{ id: 'm1', nombre: 'Viaje' }],
      apartados: [{ id: 'a1', nombre: 'SOAT' }],
    });
    const fondo = plan.find(d => d.tipo === 'fondo');
    expect(fondo.monto).toBe(600_000);
    expect(plan.find(d => d.id === 'm1').monto).toBe(0);
    expect(plan.find(d => d.id === 'a1').monto).toBe(0);
  });

  it('con fondo completo lo deja en 0 (no sobre-fondea)', () => {
    const plan = construirPlanAhorro({
      budget: 600_000,
      fondo: { activo: true, completado: true },
      metas: [], apartados: [],
    });
    expect(plan.find(d => d.tipo === 'fondo').monto).toBe(0);
  });

  it('sin fondo activo no incluye fila de fondo', () => {
    const plan = construirPlanAhorro({
      budget: 600_000,
      fondo: { activo: false, completado: false },
      metas: [{ id: 'm1', nombre: 'Viaje' }],
      apartados: [],
    });
    expect(plan.some(d => d.tipo === 'fondo')).toBe(false);
    expect(plan).toHaveLength(1);
  });

  it('lista una fila por cada meta y apartado, en 0 por defecto', () => {
    const plan = construirPlanAhorro({
      budget: 0,
      fondo: null,
      metas: [{ id: 'm1', nombre: 'Viaje' }, { id: 'm2', nombre: 'Carro' }],
      apartados: [{ id: 'a1', nombre: 'SOAT' }],
    });
    expect(plan).toHaveLength(3);
    expect(plan.every(d => d.monto === 0)).toBe(true);
  });

  it('sin destinos devuelve un plan vacío', () => {
    expect(construirPlanAhorro({ budget: 500_000, fondo: null })).toEqual([]);
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
});

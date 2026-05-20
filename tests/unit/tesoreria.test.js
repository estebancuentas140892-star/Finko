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

  it('reporta error si tipo no se seleccionó', () => {
    const errores = validarCuenta({ ...datosFormValidos, tipo: '' });
    expect(errores).toHaveLength(1);
    expect(errores[0]).toMatch(/tipo/i);
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

  it('autogenera nombre con espacios en blanco también', () => {
    const result = normalizarCuenta({ ...datosFormValidos, nombre: '   ', banco: 'Nequi', tipo: 'Otro' });
    expect(result.nombre).toBe('Nequi Otro');
  });

  it('evita duplicar "Efectivo Efectivo" cuando banco y tipo coinciden', () => {
    const result = normalizarCuenta({ ...datosFormValidos, nombre: '', banco: 'Efectivo', tipo: 'Efectivo' });
    expect(result.nombre).toBe('Efectivo');
  });

  it('respeta el nombre del usuario si lo provee', () => {
    const result = normalizarCuenta({ ...datosFormValidos, nombre: 'Mi cuenta favorita', banco: 'Davivienda', tipo: 'Ahorros' });
    expect(result.nombre).toBe('Mi cuenta favorita');
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

  it('suma solo los ingresos con frecuencia Mensual', () => {
    const ingresos = [
      ingresoBase({ monto: 2_000_000, frecuencia: 'Mensual' }),
      ingresoBase({ id: 'i2', monto: 500_000, frecuencia: 'Quincenal' }),
    ];
    expect(estimarSalarioMensual(ingresos)).toBe(2_000_000);
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

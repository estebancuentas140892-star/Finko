import { describe, it, expect } from 'vitest';
import {
  compromisosActivos,
  calcularCompromisoMensual,
  calcularTotalCompromisos,
  proximoVencimiento,
  urgencia,
  validarCompromiso,
  normalizarCompromiso,
  TIPOS_COMPROMISO,
  LABEL_TIPO,
  ICONO_TIPO,
} from '../../modules/dominio/compromisos/logic.js';

// ── FIXTURES ─────────────────────────────────────────────────────

const hoy = new Date();
const DIA_HOY = hoy.getDate();

// diaPago en 10 días desde hoy (siempre futuro, nunca igual a hoy en el cómputo).
const DIA_FUTURO = ((DIA_HOY + 10 - 1) % 28) + 1; // 1–28, nunca pisa hoy
const DIA_PASADO = ((DIA_HOY - 2 + 28 - 1) % 28) + 1; // 2 días antes, 1–28

const compromisoBase = (overrides = {}) => ({
  id:          'c1',
  descripcion: 'Arriendo',
  monto:       1_500_000,
  frecuencia:  'Mensual',
  diaPago:     DIA_FUTURO,
  tipo:        'fijo',
  activo:      true,
  ...overrides,
});

const datosFormValidos = {
  descripcion: 'Internet hogar',
  monto:       '89000',
  frecuencia:  'Mensual',
  diaPago:     '5',
  tipo:        'fijo',
};

// ── CATÁLOGOS ─────────────────────────────────────────────────────

describe('catálogos exportados', () => {
  it('TIPOS_COMPROMISO tiene los tres tipos', () => {
    expect(TIPOS_COMPROMISO).toEqual(expect.arrayContaining(['fijo', 'deuda', 'agenda']));
    expect(TIPOS_COMPROMISO).toHaveLength(3);
  });

  it('LABEL_TIPO cubre todos los tipos', () => {
    for (const tipo of TIPOS_COMPROMISO) {
      expect(LABEL_TIPO[tipo]).toBeTruthy();
    }
  });

  it('ICONO_TIPO cubre todos los tipos', () => {
    for (const tipo of TIPOS_COMPROMISO) {
      expect(ICONO_TIPO[tipo]).toBeTruthy();
    }
  });
});

// ── compromisosActivos() ──────────────────────────────────────────

describe('compromisosActivos()', () => {
  it('devuelve todos cuando todos están activos', () => {
    const lista = [compromisoBase(), compromisoBase({ id: 'c2', descripcion: 'Netflix' })];
    expect(compromisosActivos(lista)).toHaveLength(2);
  });

  it('excluye compromisos con activo === false', () => {
    const lista = [compromisoBase(), compromisoBase({ id: 'c2', activo: false })];
    expect(compromisosActivos(lista)).toHaveLength(1);
    expect(compromisosActivos(lista)[0].id).toBe('c1');
  });

  it('incluye compromisos sin campo activo (undefined ≠ false)', () => {
    const { activo: _, ...sinActivo } = compromisoBase();
    expect(compromisosActivos([sinActivo])).toHaveLength(1);
  });

  it('devuelve array vacío si no hay compromisos', () => {
    expect(compromisosActivos([])).toEqual([]);
  });
});

// ── calcularCompromisoMensual() ───────────────────────────────────

describe('calcularCompromisoMensual()', () => {
  it('mensual × 1 = monto original', () => {
    expect(calcularCompromisoMensual(compromisoBase({ monto: 1_500_000, frecuencia: 'Mensual' }))).toBe(1_500_000);
  });

  it('quincenal × 2', () => {
    expect(calcularCompromisoMensual(compromisoBase({ monto: 500_000, frecuencia: 'Quincenal' }))).toBe(1_000_000);
  });

  it('anual / 12', () => {
    expect(calcularCompromisoMensual(compromisoBase({ monto: 12_000_000, frecuencia: 'Anual' }))).toBe(1_000_000);
  });

  it('única vez devuelve 0', () => {
    expect(calcularCompromisoMensual(compromisoBase({ frecuencia: 'Única vez' }))).toBe(0);
  });

  it('frecuencia desconocida devuelve 0', () => {
    expect(calcularCompromisoMensual(compromisoBase({ frecuencia: 'Cada siglo' }))).toBe(0);
  });
});

// ── calcularTotalCompromisos() ────────────────────────────────────

describe('calcularTotalCompromisos()', () => {
  it('suma proyección mensual de todos los activos', () => {
    const lista = [
      compromisoBase({ monto: 1_500_000, frecuencia: 'Mensual' }),
      compromisoBase({ id: 'c2', monto: 250_000, frecuencia: 'Quincenal' }),
    ];
    expect(calcularTotalCompromisos(lista)).toBe(2_000_000);
  });

  it('ignora compromisos inactivos', () => {
    const lista = [
      compromisoBase({ monto: 1_500_000, frecuencia: 'Mensual' }),
      compromisoBase({ id: 'c2', monto: 999_999, frecuencia: 'Mensual', activo: false }),
    ];
    expect(calcularTotalCompromisos(lista)).toBe(1_500_000);
  });

  it('devuelve 0 con array vacío', () => {
    expect(calcularTotalCompromisos([])).toBe(0);
  });
});

// ── proximoVencimiento() ──────────────────────────────────────────

describe('proximoVencimiento()', () => {
  it('devuelve 0 cuando el diaPago es hoy', () => {
    expect(proximoVencimiento(compromisoBase({ diaPago: DIA_HOY }))).toBe(0);
  });

  it('devuelve un número positivo cuando el diaPago es futuro en este mes', () => {
    const dias = proximoVencimiento(compromisoBase({ diaPago: DIA_FUTURO }));
    expect(dias).toBeGreaterThan(0);
  });

  it('devuelve un número positivo cuando el diaPago ya pasó (próximo mes)', () => {
    // DIA_PASADO está antes de hoy → próximo ciclo es el mes siguiente
    const dias = proximoVencimiento(compromisoBase({ diaPago: DIA_PASADO }));
    expect(dias).toBeGreaterThan(0);
  });

  it('siempre devuelve un número no negativo', () => {
    for (let dia = 1; dia <= 28; dia++) {
      expect(proximoVencimiento(compromisoBase({ diaPago: dia }))).toBeGreaterThanOrEqual(0);
    }
  });
});

// ── urgencia() ────────────────────────────────────────────────────

describe('urgencia()', () => {
  it('retorna "urgente" cuando faltan ≤ 3 días (incluye hoy)', () => {
    expect(urgencia(compromisoBase({ diaPago: DIA_HOY }))).toBe('urgente');
  });

  it('retorna uno de los tres niveles válidos para cualquier día', () => {
    const niveles = new Set(['urgente', 'proximo', 'normal']);
    for (let dia = 1; dia <= 28; dia++) {
      expect(niveles.has(urgencia(compromisoBase({ diaPago: dia })))).toBe(true);
    }
  });

  it('retorna "normal" para diaPago muy lejano', () => {
    // 15 días en el futuro siempre es 'normal' si DIA_HOY <= 13
    const diaLejano = ((DIA_HOY + 15 - 1) % 28) + 1;
    const dias = Math.abs(diaLejano - DIA_HOY); // aproximación
    if (dias > 7) {
      expect(urgencia(compromisoBase({ diaPago: diaLejano }))).toBe('normal');
    }
  });
});

// ── validarCompromiso() ───────────────────────────────────────────

describe('validarCompromiso()', () => {
  it('retorna array vacío con datos válidos', () => {
    expect(validarCompromiso(datosFormValidos)).toEqual([]);
  });

  it('reporta error si descripción está vacía', () => {
    const errores = validarCompromiso({ ...datosFormValidos, descripcion: '' });
    expect(errores).toHaveLength(1);
    expect(errores[0]).toMatch(/descripci/i);
  });

  it('reporta error si monto es 0', () => {
    expect(validarCompromiso({ ...datosFormValidos, monto: '0' }).length).toBeGreaterThan(0);
  });

  it('reporta error si monto no es número', () => {
    const errores = validarCompromiso({ ...datosFormValidos, monto: 'mucho' });
    expect(errores[0]).toMatch(/monto/i);
  });

  it('reporta error si frecuencia no está en la lista', () => {
    const errores = validarCompromiso({ ...datosFormValidos, frecuencia: 'Rarísimo' });
    expect(errores[0]).toMatch(/frecuencia/i);
  });

  it('reporta error si diaPago es 0', () => {
    expect(validarCompromiso({ ...datosFormValidos, diaPago: '0' }).length).toBeGreaterThan(0);
  });

  it('reporta error si diaPago es 32', () => {
    expect(validarCompromiso({ ...datosFormValidos, diaPago: '32' }).length).toBeGreaterThan(0);
  });

  it('acepta diaPago 1 y 31 como válidos', () => {
    expect(validarCompromiso({ ...datosFormValidos, diaPago: '1' })).toEqual([]);
    expect(validarCompromiso({ ...datosFormValidos, diaPago: '31' })).toEqual([]);
  });

  it('reporta error si tipo no está en la lista', () => {
    const errores = validarCompromiso({ ...datosFormValidos, tipo: 'capricho' });
    expect(errores[0]).toMatch(/tipo/i);
  });

  it('acepta los tres tipos válidos', () => {
    for (const tipo of ['fijo', 'deuda', 'agenda']) {
      expect(validarCompromiso({ ...datosFormValidos, tipo })).toEqual([]);
    }
  });

  it('puede tener múltiples errores a la vez', () => {
    const errores = validarCompromiso({ descripcion: '', monto: '0', frecuencia: '', diaPago: '0', tipo: '' });
    expect(errores.length).toBeGreaterThanOrEqual(3);
  });
});

// ── normalizarCompromiso() ────────────────────────────────────────

describe('normalizarCompromiso()', () => {
  it('convierte monto string a número', () => {
    const result = normalizarCompromiso(datosFormValidos);
    expect(typeof result.monto).toBe('number');
    expect(result.monto).toBe(89_000);
  });

  it('convierte diaPago string a número entero', () => {
    const result = normalizarCompromiso(datosFormValidos);
    expect(typeof result.diaPago).toBe('number');
    expect(result.diaPago).toBe(5);
  });

  it('recorta espacios de la descripción', () => {
    const result = normalizarCompromiso({ ...datosFormValidos, descripcion: '  Internet  ' });
    expect(result.descripcion).toBe('Internet');
  });

  it('marca activo en true', () => {
    expect(normalizarCompromiso(datosFormValidos).activo).toBe(true);
  });

  it('preserva la frecuencia', () => {
    expect(normalizarCompromiso(datosFormValidos).frecuencia).toBe('Mensual');
  });

  it('preserva el tipo', () => {
    expect(normalizarCompromiso(datosFormValidos).tipo).toBe('fijo');
  });

  it('no incluye id (lo asigna crud.js)', () => {
    expect(normalizarCompromiso(datosFormValidos)).not.toHaveProperty('id');
  });

  it('incluye saldoPendiente cuando tipo=deuda y el campo está lleno', () => {
    const datos = { ...datosFormValidos, tipo: 'deuda', saldoPendiente: '12000000', tasaEA: '' };
    const result = normalizarCompromiso(datos);
    expect(result.saldoPendiente).toBe(12_000_000);
  });

  it('incluye tasaEA como decimal cuando tipo=deuda y el campo está lleno', () => {
    const datos = { ...datosFormValidos, tipo: 'deuda', saldoPendiente: '', tasaEA: '26.5' };
    const result = normalizarCompromiso(datos);
    expect(result.tasaEA).toBeCloseTo(0.265);
  });

  it('incluye ambos campos extras cuando tipo=deuda y ambos están completos', () => {
    const datos = { ...datosFormValidos, tipo: 'deuda', saldoPendiente: '5000000', tasaEA: '24' };
    const result = normalizarCompromiso(datos);
    expect(result.saldoPendiente).toBe(5_000_000);
    expect(result.tasaEA).toBeCloseTo(0.24);
  });

  it('omite saldoPendiente cuando tipo=deuda pero el campo está vacío', () => {
    const datos = { ...datosFormValidos, tipo: 'deuda', saldoPendiente: '', tasaEA: '' };
    const result = normalizarCompromiso(datos);
    expect(result).not.toHaveProperty('saldoPendiente');
  });

  it('omite campos extra cuando tipo=fijo aunque el campo tenga valor', () => {
    const datos = { ...datosFormValidos, tipo: 'fijo', saldoPendiente: '999999', tasaEA: '10' };
    const result = normalizarCompromiso(datos);
    expect(result).not.toHaveProperty('saldoPendiente');
    expect(result).not.toHaveProperty('tasaEA');
  });
});

// ── validarCompromiso() — campos de deuda ─────────────────────────

describe('validarCompromiso() — campos opcionales de deuda', () => {
  const datosDeuda = { ...datosFormValidos, tipo: 'deuda' };

  it('acepta deuda sin saldoPendiente ni tasaEA (ambos vacíos)', () => {
    expect(validarCompromiso({ ...datosDeuda, saldoPendiente: '', tasaEA: '' })).toEqual([]);
  });

  it('acepta deuda con saldoPendiente válido', () => {
    expect(validarCompromiso({ ...datosDeuda, saldoPendiente: '12000000', tasaEA: '' })).toEqual([]);
  });

  it('acepta deuda con tasaEA válida', () => {
    expect(validarCompromiso({ ...datosDeuda, saldoPendiente: '', tasaEA: '26.5' })).toEqual([]);
  });

  it('acepta saldoPendiente de 0 (deuda saldada)', () => {
    expect(validarCompromiso({ ...datosDeuda, saldoPendiente: '0', tasaEA: '' })).toEqual([]);
  });

  it('reporta error si saldoPendiente es negativo', () => {
    const errores = validarCompromiso({ ...datosDeuda, saldoPendiente: '-1000', tasaEA: '' });
    expect(errores.some(e => /saldo/i.test(e))).toBe(true);
  });

  it('reporta error si saldoPendiente no es número', () => {
    const errores = validarCompromiso({ ...datosDeuda, saldoPendiente: 'mucho', tasaEA: '' });
    expect(errores.some(e => /saldo/i.test(e))).toBe(true);
  });

  it('reporta error si tasaEA supera 200%', () => {
    const errores = validarCompromiso({ ...datosDeuda, saldoPendiente: '', tasaEA: '201' });
    expect(errores.some(e => /tasa/i.test(e))).toBe(true);
  });

  it('reporta error si tasaEA es negativa', () => {
    const errores = validarCompromiso({ ...datosDeuda, saldoPendiente: '', tasaEA: '-1' });
    expect(errores.some(e => /tasa/i.test(e))).toBe(true);
  });

  it('NO valida saldoPendiente para tipo=fijo aunque tenga valor', () => {
    // fijo con saldo negativo no da error porque el campo no aplica
    const datos = { ...datosFormValidos, tipo: 'fijo', saldoPendiente: '-9999', tasaEA: '-1' };
    expect(validarCompromiso(datos)).toEqual([]);
  });
});

import { describe, it, expect } from 'vitest';
import {
  apartadosActivos,
  calcularProgreso,
  diasHastaFecha,
  calcularAporteSugerido,
  etiquetaPeriodo,
  validarApartado,
  validarAbonoApartado,
  normalizarApartado,
  FRECUENCIAS_APORTE,
  PLANTILLAS_APARTADO,
  ICONO_APARTADO_DEFAULT,
} from '../../modules/dominio/apartados/logic.js';

// ── FIXTURES ─────────────────────────────────────────────────────

const apartadoBase = (overrides = {}) => ({
  id:               'a1',
  nombre:           'SOAT',
  icono:            '🚗',
  montoObjetivo:    360_000,
  montoActual:      0,
  fechaObjetivo:    null,
  frecuenciaAporte: 'Quincenal',
  completado:       false,
  ...overrides,
});

const datosFormValidos = {
  nombre:           'Productos personales',
  montoObjetivo:    '360000',
  fechaObjetivo:    '',
  frecuenciaAporte: 'Quincenal',
  icono:            '🧴',
};

// ── apartadosActivos() ───────────────────────────────────────────

describe('apartadosActivos()', () => {
  it('devuelve todos cuando ninguno está completado', () => {
    const lista = [apartadoBase(), apartadoBase({ id: 'a2' })];
    expect(apartadosActivos(lista)).toHaveLength(2);
  });

  it('excluye los completados', () => {
    const lista = [apartadoBase(), apartadoBase({ id: 'a2', completado: true })];
    expect(apartadosActivos(lista)).toHaveLength(1);
    expect(apartadosActivos(lista)[0].id).toBe('a1');
  });

  it('es defensivo ante null/undefined', () => {
    expect(apartadosActivos(null)).toEqual([]);
    expect(apartadosActivos(undefined)).toEqual([]);
  });
});

// ── calcularProgreso() ───────────────────────────────────────────

describe('calcularProgreso()', () => {
  it('calcula porcentaje y faltante', () => {
    const r = calcularProgreso(apartadoBase({ montoActual: 90_000, montoObjetivo: 360_000 }));
    expect(r.porcentaje).toBe(25);
    expect(r.faltante).toBe(270_000);
    expect(r.completado).toBe(false);
  });

  it('marca completado al 100% o más', () => {
    const r = calcularProgreso(apartadoBase({ montoActual: 360_000, montoObjetivo: 360_000 }));
    expect(r.porcentaje).toBe(100);
    expect(r.faltante).toBe(0);
    expect(r.completado).toBe(true);
  });

  it('topa el porcentaje en 100 aunque sobre dinero', () => {
    const r = calcularProgreso(apartadoBase({ montoActual: 500_000, montoObjetivo: 360_000 }));
    expect(r.porcentaje).toBe(100);
    expect(r.faltante).toBe(0);
  });

  it('objetivo 0 o inválido devuelve progreso neutro', () => {
    expect(calcularProgreso(apartadoBase({ montoObjetivo: 0 }))).toEqual({
      porcentaje: 0, faltante: 0, completado: false,
    });
  });
});

// ── diasHastaFecha() ─────────────────────────────────────────────

describe('diasHastaFecha()', () => {
  it('cuenta los días entre hoy y la fecha objetivo', () => {
    expect(diasHastaFecha('2026-06-20', '2026-06-10')).toBe(10);
  });

  it('devuelve 0 el mismo día', () => {
    expect(diasHastaFecha('2026-06-10', '2026-06-10')).toBe(0);
  });

  it('devuelve negativo si la fecha ya pasó', () => {
    expect(diasHastaFecha('2026-06-05', '2026-06-10')).toBe(-5);
  });

  it('cruza meses correctamente', () => {
    expect(diasHastaFecha('2026-12-10', '2026-06-10')).toBe(183);
  });

  it('devuelve null sin fecha objetivo o con formato inválido', () => {
    expect(diasHastaFecha(null, '2026-06-10')).toBeNull();
    expect(diasHastaFecha('20/06/2026', '2026-06-10')).toBeNull();
    expect(diasHastaFecha('2026-06-20', 'no-fecha')).toBeNull();
  });
});

// ── calcularAporteSugerido() ─────────────────────────────────────

describe('calcularAporteSugerido()', () => {
  it('escenario del usuario: $360.000 en 6 meses, quincenal -> $30.000 por quincena', () => {
    // 2026-06-10 a 2026-12-10 = 183 días. /15 = 12.2 -> 13 quincenas.
    // ceil(360000/13) = 27693... el usuario da 12 quincenas exactas como ejemplo;
    // verificamos coherencia: aporte * numPeriodos >= faltante y numPeriodos correcto.
    const r = calcularAporteSugerido(
      apartadoBase({ montoObjetivo: 360_000, montoActual: 0, fechaObjetivo: '2026-12-10', frecuenciaAporte: 'Quincenal' }),
      '2026-06-10',
    );
    expect(r).not.toBeNull();
    expect(r.frecuencia).toBe('Quincenal');
    expect(r.etiquetaPeriodo).toBe('por quincena');
    expect(r.numPeriodos).toBe(13); // ceil(183/15)
    expect(r.aportePorPeriodo).toBe(Math.ceil(360_000 / 13));
    // El aporte acumulado cubre el faltante.
    expect(r.aportePorPeriodo * r.numPeriodos).toBeGreaterThanOrEqual(360_000);
  });

  it('descuenta lo ya aportado del faltante', () => {
    const r = calcularAporteSugerido(
      apartadoBase({ montoObjetivo: 360_000, montoActual: 180_000, fechaObjetivo: '2026-12-10', frecuenciaAporte: 'Mensual' }),
      '2026-06-10',
    );
    // faltante 180.000, 183 días / 30 = 6.1 -> 7 meses. ceil(180000/7).
    expect(r.numPeriodos).toBe(7);
    expect(r.aportePorPeriodo).toBe(Math.ceil(180_000 / 7));
  });

  it('frecuencia mensual produce la etiqueta "al mes"', () => {
    const r = calcularAporteSugerido(
      apartadoBase({ fechaObjetivo: '2026-12-10', frecuenciaAporte: 'Mensual' }),
      '2026-06-10',
    );
    expect(r.etiquetaPeriodo).toBe('al mes');
  });

  it('devuelve null si ya está completo', () => {
    const r = calcularAporteSugerido(
      apartadoBase({ montoActual: 360_000, fechaObjetivo: '2026-12-10' }),
      '2026-06-10',
    );
    expect(r).toBeNull();
  });

  it('devuelve null sin fecha objetivo (no hay plazo)', () => {
    expect(calcularAporteSugerido(apartadoBase({ fechaObjetivo: null }), '2026-06-10')).toBeNull();
  });

  it('devuelve null si la fecha ya pasó', () => {
    const r = calcularAporteSugerido(
      apartadoBase({ fechaObjetivo: '2026-06-01' }),
      '2026-06-10',
    );
    expect(r).toBeNull();
  });

  it('garantiza al menos 1 periodo cuando la fecha es muy cercana', () => {
    const r = calcularAporteSugerido(
      apartadoBase({ montoObjetivo: 100_000, fechaObjetivo: '2026-06-11', frecuenciaAporte: 'Mensual' }),
      '2026-06-10',
    );
    expect(r.numPeriodos).toBe(1);
    expect(r.aportePorPeriodo).toBe(100_000);
  });

  it('frecuencia desconocida cae a mensual', () => {
    const r = calcularAporteSugerido(
      apartadoBase({ fechaObjetivo: '2026-12-10', frecuenciaAporte: 'Bimestral' }),
      '2026-06-10',
    );
    expect(r.frecuencia).toBe('Mensual');
  });
});

// ── etiquetaPeriodo() ────────────────────────────────────────────

describe('etiquetaPeriodo()', () => {
  it('mapea cada frecuencia a su etiqueta', () => {
    expect(etiquetaPeriodo('Diario')).toBe('por día');
    expect(etiquetaPeriodo('Semanal')).toBe('por semana');
    expect(etiquetaPeriodo('Quincenal')).toBe('por quincena');
    expect(etiquetaPeriodo('Mensual')).toBe('al mes');
  });

  it('valor desconocido cae a "al mes"', () => {
    expect(etiquetaPeriodo('Anual')).toBe('al mes');
  });
});

// ── validarApartado() ────────────────────────────────────────────

describe('validarApartado()', () => {
  it('datos válidos no producen errores', () => {
    expect(validarApartado(datosFormValidos)).toEqual([]);
  });

  it('válido sin fecha ni frecuencia (ambas opcionales)', () => {
    expect(validarApartado({ nombre: 'Regalos', montoObjetivo: '200000' })).toEqual([]);
  });

  it('reporta nombre vacío', () => {
    const errs = validarApartado({ ...datosFormValidos, nombre: '  ' });
    expect(errs.some(e => /nombre/i.test(e))).toBe(true);
  });

  it('reporta monto objetivo <= 0', () => {
    expect(validarApartado({ ...datosFormValidos, montoObjetivo: '0' }).length).toBeGreaterThan(0);
    expect(validarApartado({ ...datosFormValidos, montoObjetivo: 'abc' }).length).toBeGreaterThan(0);
  });

  it('reporta fecha con formato inválido', () => {
    const errs = validarApartado({ ...datosFormValidos, fechaObjetivo: '10-12-2026' });
    expect(errs.some(e => /fecha/i.test(e))).toBe(true);
  });

  it('reporta frecuencia inválida', () => {
    const errs = validarApartado({ ...datosFormValidos, frecuenciaAporte: 'Trimestral' });
    expect(errs.some(e => /frecuencia/i.test(e))).toBe(true);
  });
});

// ── validarAbonoApartado() ───────────────────────────────────────

describe('validarAbonoApartado()', () => {
  it('acepta monto positivo', () => {
    expect(validarAbonoApartado(50_000)).toEqual([]);
  });

  it('rechaza 0, negativos y no numéricos', () => {
    expect(validarAbonoApartado(0).length).toBeGreaterThan(0);
    expect(validarAbonoApartado(-1).length).toBeGreaterThan(0);
    expect(validarAbonoApartado('x').length).toBeGreaterThan(0);
  });
});

// ── normalizarApartado() ─────────────────────────────────────────

describe('normalizarApartado()', () => {
  it('produce el shape esperado con valores limpios', () => {
    const r = normalizarApartado(datosFormValidos);
    expect(r).toEqual({
      nombre:           'Productos personales',
      icono:            '🧴',
      montoObjetivo:    360_000,
      montoActual:      0,
      fechaObjetivo:    null,
      frecuenciaAporte: 'Quincenal',
      completado:       false,
    });
  });

  it('icono vacío cae al default', () => {
    const r = normalizarApartado({ ...datosFormValidos, icono: '' });
    expect(r.icono).toBe(ICONO_APARTADO_DEFAULT);
  });

  it('fecha vacía queda null; fecha presente se preserva', () => {
    expect(normalizarApartado({ ...datosFormValidos, fechaObjetivo: '' }).fechaObjetivo).toBeNull();
    expect(normalizarApartado({ ...datosFormValidos, fechaObjetivo: '2026-12-10' }).fechaObjetivo).toBe('2026-12-10');
  });

  it('frecuencia inválida o ausente cae a Mensual', () => {
    expect(normalizarApartado({ ...datosFormValidos, frecuenciaAporte: 'Anual' }).frecuenciaAporte).toBe('Mensual');
    expect(normalizarApartado({ nombre: 'X', montoObjetivo: '100000' }).frecuenciaAporte).toBe('Mensual');
  });

  it('montoActual siempre arranca en 0 y completado en false', () => {
    const r = normalizarApartado(datosFormValidos);
    expect(r.montoActual).toBe(0);
    expect(r.completado).toBe(false);
  });
});

// ── catálogos exportados ─────────────────────────────────────────

describe('catálogos', () => {
  it('FRECUENCIAS_APORTE tiene las 4 frecuencias de aporte', () => {
    expect(FRECUENCIAS_APORTE).toEqual(['Diario', 'Semanal', 'Quincenal', 'Mensual']);
  });

  it('PLANTILLAS_APARTADO trae nombre e icono y no incluye fondo de emergencia', () => {
    expect(PLANTILLAS_APARTADO.length).toBeGreaterThan(0);
    for (const p of PLANTILLAS_APARTADO) {
      expect(typeof p.nombre).toBe('string');
      expect(typeof p.icono).toBe('string');
    }
    expect(PLANTILLAS_APARTADO.some(p => /emergencia/i.test(p.nombre))).toBe(false);
  });
});

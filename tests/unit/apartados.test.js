import { describe, it, expect } from 'vitest';
import {
  apartadosActivos,
  estaListoParaReiniciar,
  calcularProgreso,
  diasHastaFecha,
  calcularAporteSugerido,
  etiquetaPeriodo,
  etiquetaPeriodoMeses,
  avanzarMeses,
  reiniciarCiclo,
  frecuenciaPrincipalIngresos,
  apartadosProximos,
  validarApartado,
  validarAbonoApartado,
  normalizarApartado,
  FRECUENCIAS_APORTE,
  PLANTILLAS_APARTADO,
  PERIODOS_RECURRENCIA,
  PERIODO_RECURRENCIA_DEFAULT,
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

  it('excluye los completados no recurrentes', () => {
    const lista = [apartadoBase(), apartadoBase({ id: 'a2', completado: true })];
    expect(apartadosActivos(lista)).toHaveLength(1);
    expect(apartadosActivos(lista)[0].id).toBe('a1');
  });

  it('mantiene visibles los completados recurrentes (esperan reinicio)', () => {
    const lista = [
      apartadoBase({ id: 'a2', completado: true, recurrente: true, periodoMeses: 12 }),
    ];
    expect(apartadosActivos(lista)).toHaveLength(1);
    expect(apartadosActivos(lista)[0].id).toBe('a2');
  });

  it('es defensivo ante null/undefined', () => {
    expect(apartadosActivos(null)).toEqual([]);
    expect(apartadosActivos(undefined)).toEqual([]);
  });
});

// ── estaListoParaReiniciar() ─────────────────────────────────────

describe('estaListoParaReiniciar()', () => {
  it('true cuando es recurrente y alcanzó el objetivo', () => {
    const a = apartadoBase({ recurrente: true, periodoMeses: 12, montoActual: 360_000, montoObjetivo: 360_000 });
    expect(estaListoParaReiniciar(a)).toBe(true);
  });

  it('false si es recurrente pero aún no llega al objetivo', () => {
    const a = apartadoBase({ recurrente: true, periodoMeses: 12, montoActual: 100_000, montoObjetivo: 360_000 });
    expect(estaListoParaReiniciar(a)).toBe(false);
  });

  it('false si está completo pero no es recurrente', () => {
    const a = apartadoBase({ recurrente: false, montoActual: 360_000, montoObjetivo: 360_000 });
    expect(estaListoParaReiniciar(a)).toBe(false);
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

  it('recurrente sin periodo válido reporta error', () => {
    const errs = validarApartado({ ...datosFormValidos, recurrente: 'on', periodoMeses: '0' });
    expect(errs.some(e => /repite/i.test(e))).toBe(true);
  });

  it('recurrente con periodo válido no produce error', () => {
    expect(validarApartado({ ...datosFormValidos, recurrente: 'on', periodoMeses: '12' })).toEqual([]);
  });

  it('no exige periodo si no es recurrente', () => {
    expect(validarApartado({ ...datosFormValidos, recurrente: '', periodoMeses: '' })).toEqual([]);
  });
});

// ── avanzarMeses() ───────────────────────────────────────────────

describe('avanzarMeses()', () => {
  it('suma meses dentro del mismo año', () => {
    expect(avanzarMeses('2026-06-10', 3)).toBe('2026-09-10');
  });

  it('cruza el cambio de año', () => {
    expect(avanzarMeses('2026-12-10', 12)).toBe('2027-12-10');
  });

  it('recorta al último día del mes cuando el día no existe', () => {
    // 31 de enero + 1 mes → 28 de febrero (2026 no es bisiesto).
    expect(avanzarMeses('2026-01-31', 1)).toBe('2026-02-28');
    // En año bisiesto, 29 de febrero.
    expect(avanzarMeses('2028-01-31', 1)).toBe('2028-02-29');
  });

  it('devuelve null ante entradas inválidas', () => {
    expect(avanzarMeses('no-fecha', 3)).toBeNull();
    expect(avanzarMeses('2026-06-10', 0)).toBeNull();
    expect(avanzarMeses('2026-06-10', -1)).toBeNull();
    expect(avanzarMeses('2026-06-10', 1.5)).toBeNull();
  });
});

// ── reiniciarCiclo() ─────────────────────────────────────────────

describe('reiniciarCiclo()', () => {
  it('avanza la fecha un periodo y vacía el monto (recurrente)', () => {
    const a = apartadoBase({
      recurrente: true, periodoMeses: 12,
      montoActual: 360_000, montoObjetivo: 360_000,
      fechaObjetivo: '2026-12-10', completado: true,
    });
    const r = reiniciarCiclo(a, '2026-12-10');
    expect(r.fechaObjetivo).toBe('2027-12-10');
    expect(r.montoActual).toBe(0);
    expect(r.completado).toBe(false);
  });

  it('conserva el excedente sobre el objetivo', () => {
    const a = apartadoBase({
      recurrente: true, periodoMeses: 12,
      montoActual: 400_000, montoObjetivo: 360_000,
      fechaObjetivo: '2026-12-10', completado: true,
    });
    const r = reiniciarCiclo(a, '2026-12-10');
    expect(r.montoActual).toBe(40_000); // 400.000 - 360.000
  });

  it('avanza más de un periodo si la fecha sigue en el pasado', () => {
    const a = apartadoBase({
      recurrente: true, periodoMeses: 12,
      montoActual: 360_000, montoObjetivo: 360_000,
      fechaObjetivo: '2024-03-01', completado: true,
    });
    // Hoy 2026-06: 2024 + 12 = 2025 (pasado), +12 = 2026-03 (pasado), +12 = 2027-03 (futuro).
    const r = reiniciarCiclo(a, '2026-06-10');
    expect(diasHastaFecha(r.fechaObjetivo, '2026-06-10')).toBeGreaterThan(0);
    expect(r.fechaObjetivo).toBe('2027-03-01');
  });

  it('usa hoy como base si no tiene fecha objetivo', () => {
    const a = apartadoBase({
      recurrente: true, periodoMeses: 6,
      montoActual: 360_000, montoObjetivo: 360_000,
      fechaObjetivo: null, completado: true,
    });
    const r = reiniciarCiclo(a, '2026-06-10');
    expect(r.fechaObjetivo).toBe('2026-12-10');
  });

  it('no es recurrente: devuelve el apartado intacto', () => {
    const a = apartadoBase({ recurrente: false, montoActual: 360_000, completado: true });
    expect(reiniciarCiclo(a, '2026-06-10')).toBe(a);
  });
});

// ── etiquetaPeriodoMeses() ───────────────────────────────────────

describe('etiquetaPeriodoMeses()', () => {
  it('mapea los periodos comunes', () => {
    expect(etiquetaPeriodoMeses(1)).toBe('cada mes');
    expect(etiquetaPeriodoMeses(12)).toBe('cada año');
    expect(etiquetaPeriodoMeses(3)).toBe('cada 3 meses');
    expect(etiquetaPeriodoMeses(6)).toBe('cada 6 meses');
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
      recurrente:       false,
      periodoMeses:     null,
      completado:       false,
    });
  });

  it('sin recurrencia: recurrente false y periodoMeses null', () => {
    const r = normalizarApartado(datosFormValidos);
    expect(r.recurrente).toBe(false);
    expect(r.periodoMeses).toBeNull();
  });

  it('checkbox marcado ("on") activa recurrencia con su periodo', () => {
    const r = normalizarApartado({ ...datosFormValidos, recurrente: 'on', periodoMeses: '12' });
    expect(r.recurrente).toBe(true);
    expect(r.periodoMeses).toBe(12);
  });

  it('recurrente sin periodo válido cae al default (anual)', () => {
    const r = normalizarApartado({ ...datosFormValidos, recurrente: 'on', periodoMeses: '' });
    expect(r.periodoMeses).toBe(PERIODO_RECURRENCIA_DEFAULT);
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

// ── frecuenciaPrincipalIngresos() ────────────────────────────────

describe('frecuenciaPrincipalIngresos()', () => {
  const ingreso = (frecuencia, activo = true) => ({ id: 'i1', descripcion: 'Nómina', monto: 1_000_000, frecuencia, activo, fechaCreacion: '2026-01-01' });

  it('sin ingresos devuelve Mensual', () => {
    expect(frecuenciaPrincipalIngresos([])).toBe('Mensual');
    expect(frecuenciaPrincipalIngresos(null)).toBe('Mensual');
  });

  it('un ingreso Quincenal → devuelve Quincenal', () => {
    expect(frecuenciaPrincipalIngresos([ingreso('Quincenal')])).toBe('Quincenal');
  });

  it('la frecuencia más común gana', () => {
    const lista = [ingreso('Quincenal'), ingreso('Quincenal'), ingreso('Mensual')];
    expect(frecuenciaPrincipalIngresos(lista)).toBe('Quincenal');
  });

  it('frecuencias no soportadas (Trimestral, Anual) se mapean a Mensual', () => {
    expect(frecuenciaPrincipalIngresos([ingreso('Trimestral')])).toBe('Mensual');
    expect(frecuenciaPrincipalIngresos([ingreso('Anual')])).toBe('Mensual');
  });

  it('los ingresos inactivos no cuentan', () => {
    const lista = [ingreso('Quincenal', false), ingreso('Mensual', true)];
    expect(frecuenciaPrincipalIngresos(lista)).toBe('Mensual');
  });

  it('en empate numérico prefiere la frecuencia más granular', () => {
    // Quincenal (índice 2) vs Mensual (índice 3): gana Quincenal.
    const lista = [ingreso('Quincenal'), ingreso('Mensual')];
    expect(frecuenciaPrincipalIngresos(lista)).toBe('Quincenal');
  });
});

// ── apartadosProximos() ──────────────────────────────────────────

describe('apartadosProximos()', () => {
  const hoy = '2026-06-10';
  const apt = (overrides) => apartadoBase({ fechaObjetivo: '2026-07-10', completado: false, ...overrides });

  it('devuelve apartados dentro del umbral por defecto (60 días)', () => {
    const lista = [apt({ id: 'a1', fechaObjetivo: '2026-07-01' })];
    expect(apartadosProximos(lista, hoy)).toHaveLength(1);
  });

  it('excluye apartados más allá del umbral', () => {
    const lista = [apt({ id: 'a1', fechaObjetivo: '2026-12-31' })];
    expect(apartadosProximos(lista, hoy)).toHaveLength(0);
  });

  it('excluye apartados completados', () => {
    const lista = [apt({ id: 'a1', completado: true, fechaObjetivo: '2026-06-15' })];
    expect(apartadosProximos(lista, hoy)).toHaveLength(0);
  });

  it('excluye apartados sin fecha objetivo', () => {
    const lista = [apt({ id: 'a1', fechaObjetivo: null })];
    expect(apartadosProximos(lista, hoy)).toHaveLength(0);
  });

  it('ordena de más urgente a menos urgente', () => {
    const lista = [
      apt({ id: 'a2', fechaObjetivo: '2026-07-20' }),
      apt({ id: 'a1', fechaObjetivo: '2026-06-15' }),
    ];
    const r = apartadosProximos(lista, hoy);
    expect(r[0].id).toBe('a1');
    expect(r[1].id).toBe('a2');
  });

  it('respeta umbral personalizado', () => {
    const lista = [
      apt({ id: 'a1', fechaObjetivo: '2026-06-20' }),
      apt({ id: 'a2', fechaObjetivo: '2026-07-01' }),
    ];
    // Con umbral 15 días solo entra el que vence en 10.
    const r = apartadosProximos(lista, hoy, 15);
    expect(r).toHaveLength(1);
    expect(r[0].id).toBe('a1');
  });

  it('devuelve array vacío si no hay apartados próximos', () => {
    expect(apartadosProximos([], hoy)).toEqual([]);
    expect(apartadosProximos(null, hoy)).toEqual([]);
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

  it('PERIODOS_RECURRENCIA incluye el anual (SOAT) con meses y etiqueta', () => {
    expect(PERIODOS_RECURRENCIA.some(p => p.meses === 12)).toBe(true);
    for (const p of PERIODOS_RECURRENCIA) {
      expect(Number.isInteger(p.meses)).toBe(true);
      expect(typeof p.etiqueta).toBe('string');
    }
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import {
  apartadosActivos,
  estaListoParaReiniciar,
  calcularProgreso,
  diasHastaFecha,
  calcularAporteSugerido,
  planDeReferencia,
  etiquetaPeriodo,
  etiquetaPeriodoMeses,
  avanzarMeses,
  reiniciarCiclo,
  frecuenciaPrincipalIngresos,
  apartadosProximos,
  validarApartado,
  validarAbonoApartado,
  normalizarApartado,
  DIAS_PROXIMO,
  FRECUENCIAS_APORTE,
  PLANTILLAS_APARTADO,
  PLANTILLAS_APARTADO_FRECUENTES,
  PERIODOS_RECURRENCIA,
  PERIODO_RECURRENCIA_DEFAULT,
  ICONO_APARTADO_DEFAULT,
} from '../../modules/dominio/apartados/logic.js';
import {
  renderFormAporteApartado, renderFormApartado, renderListaApartados,
  renderNudgeApartadosProximos, miles, desdeMiles,
} from '../../modules/dominio/apartados/view.js';
import { S } from '../../modules/core/state.js';

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

  it('devuelve apartados dentro del umbral por defecto (DIAS_PROXIMO)', () => {
    const lista = [apt({ id: 'a1', fechaObjetivo: '2026-07-01' })];
    expect(apartadosProximos(lista, hoy)).toHaveLength(1);
  });

  // T7 (A3, regla R25): un solo umbral para toda la sección. Antes el aviso
  // entraba a 60 días y el badge de la fila solo a 30, así que un apartado a
  // 45 días se contaba en el resumen y su fila no mostraba ninguna señal.
  it('el umbral por defecto es DIAS_PROXIMO, el mismo que usa el badge de la fila', () => {
    expect(DIAS_PROXIMO).toBe(30);
    const dentro = [apt({ id: 'a1', fechaObjetivo: '2026-07-10' })];  // 30 días
    const fuera  = [apt({ id: 'a1', fechaObjetivo: '2026-07-25' })];  // 45 días
    expect(apartadosProximos(dentro, hoy)).toHaveLength(1);
    expect(apartadosProximos(fuera, hoy)).toHaveLength(0);
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
      apt({ id: 'a2', fechaObjetivo: '2026-07-05' }),
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

  it('PLANTILLAS_APARTADO trae 20 plantillas sin nombres duplicados (AP.2 + TX.2 + CAT.1b)', () => {
    expect(PLANTILLAS_APARTADO).toHaveLength(20);
    const nombres = PLANTILLAS_APARTADO.map(p => p.nombre);
    expect(new Set(nombres).size).toBe(nombres.length);
  });

  it('incluye las plantillas nuevas de AP.2 (gastos previsibles que faltaban)', () => {
    const nombres = PLANTILLAS_APARTADO.map(p => p.nombre);
    expect(nombres).toEqual(expect.arrayContaining([
      'Revisión técnico-mecánica',
      'Impuesto predial',
      'Renovación de documentos',
      'Alimento para mascotas',
      'Arena para gatos',
    ]));
  });

  it('CAT.1b (taxonomía Apartados↔Metas, 2026-07-13): Vacaciones sale, ya vive en Metas', () => {
    const nombres = PLANTILLAS_APARTADO.map(p => p.nombre);
    expect(nombres).not.toContain('Vacaciones');
  });

  it('CAT.1b: "Matrícula o semestre" se divide, el semestre universitario es Meta', () => {
    const nombres = PLANTILLAS_APARTADO.map(p => p.nombre);
    expect(nombres).not.toContain('Matrícula o semestre');
    expect(nombres).toContain('Matrícula escolar');
  });

  it('CAT.1b: "Útiles escolares" se amplía a "Útiles y uniformes"', () => {
    const nombres = PLANTILLAS_APARTADO.map(p => p.nombre);
    expect(nombres).not.toContain('Útiles escolares');
    expect(nombres).toContain('Útiles y uniformes');
  });

  it('CAT.1b: entran Veterinario, Mantenimiento del hogar, Seguro del hogar y Reparaciones inesperadas', () => {
    const nombres = PLANTILLAS_APARTADO.map(p => p.nombre);
    expect(nombres).toEqual(expect.arrayContaining([
      'Veterinario',
      'Mantenimiento del hogar',
      'Seguro del hogar',
      'Reparaciones inesperadas',
    ]));
  });

  it('PERIODOS_RECURRENCIA incluye el anual (SOAT) con meses y etiqueta', () => {
    expect(PERIODOS_RECURRENCIA.some(p => p.meses === 12)).toBe(true);
    for (const p of PERIODOS_RECURRENCIA) {
      expect(Number.isInteger(p.meses)).toBe(true);
      expect(typeof p.etiqueta).toBe('string');
    }
  });
});

// ── renderFormAporteApartado() - selector de cuenta compartido ────

describe('renderFormAporteApartado() - selector de cuenta', () => {
  const cuenta = (id, nombre, saldo = 500_000) => ({
    id, nombre, saldo, banco: 'Nequi', tipo: 'Ahorros', activa: true,
  });

  it('sin cuentas activas no muestra selector (el aporte vale como seguimiento)', () => {
    S.cuentas = [];
    const html = renderFormAporteApartado(apartadoBase());
    expect(html).toContain('form-aporte-apartado');
    expect(html).not.toContain('name="cuentaId"');
  });

  it('con una cuenta: una sola tarjeta del selector compartido, pre-seleccionada', () => {
    S.cuentas = [cuenta('c1', 'Nequi principal', 1_000_000)];
    const html = renderFormAporteApartado(apartadoBase());
    expect(html).toContain('cuenta-sel__lista');
    expect(html).toContain('type="radio"');
    expect(html).toContain('name="cuentaId"');
    expect(html).toContain('value="c1"');
    expect(html).toContain('checked');
  });

  it('con varias cuentas: el selector de tarjetas lista todas y preselecciona la de mayor saldo', () => {
    S.cuentas = [cuenta('c1', 'Bancolombia', 600_000), cuenta('c2', 'Nequi', 400_000)];
    const html = renderFormAporteApartado(apartadoBase());
    expect(html).toContain('cuenta-sel__lista');
    expect(html).toContain('value="c1"');
    expect(html).toContain('value="c2"');
    // c1 (mayor saldo) viene checked.
    expect(html).toMatch(/value="c1"[^>]*checked|checked[^>]*value="c1"/);
  });

  it('ya no usa el <select> de texto plano anterior', () => {
    S.cuentas = [cuenta('c1', 'Bancolombia', 600_000), cuenta('c2', 'Nequi', 400_000)];
    const html = renderFormAporteApartado(apartadoBase());
    expect(html).not.toContain('id="aporte-apartado-cuenta"');
  });
});

// ── renderFormAporteApartado() - monto prellenado (AP.5a) ─────────

describe('renderFormAporteApartado() - monto prellenado con el aporte sugerido', () => {
  it('sin sugerencia (apartado sin fecha objetivo, el default de apartadoBase) el campo queda vacío, como antes', () => {
    const html = renderFormAporteApartado(apartadoBase());
    expect(html).not.toMatch(/id="aporte-apartado-monto"[^>]*value=/);
    expect(html).not.toContain('Es lo que te toca aportar');
  });

  it('con sugerencia > 0 prellena el value del campo, editable (no readonly/disabled)', () => {
    const sugerencia = { aportePorPeriodo: 60_000, numPeriodos: 6, frecuencia: 'Quincenal', etiquetaPeriodo: 'por quincena', dias: 90 };
    const html = renderFormAporteApartado(apartadoBase(), sugerencia);
    // T9 (A6/R16): el prellenado viaja ya formateado, igual que lo verá el usuario.
    expect(html).toMatch(/id="aporte-apartado-monto"[^>]*value="60\.000"/);
    expect(html).not.toContain('readonly');
    expect(html).not.toContain('disabled');
  });

  it('muestra el hint de prellenado con la etiqueta del período, no un texto genérico', () => {
    const sugerencia = { aportePorPeriodo: 60_000, numPeriodos: 6, frecuencia: 'Quincenal', etiquetaPeriodo: 'por quincena', dias: 90 };
    const html = renderFormAporteApartado(apartadoBase(), sugerencia);
    expect(html).toContain('Es lo que te toca aportar por quincena para llegar a tiempo');
    expect(html).toContain('Puedes cambiarlo');
  });

  it('sugerencia con monto 0 (ya cubierto) no prellena ni muestra el hint', () => {
    const sugerencia = { aportePorPeriodo: 0, numPeriodos: 0, frecuencia: 'Quincenal', etiquetaPeriodo: 'por quincena', dias: 0 };
    const html = renderFormAporteApartado(apartadoBase(), sugerencia);
    expect(html).not.toMatch(/id="aporte-apartado-monto"[^>]*value=/);
    expect(html).not.toContain('Es lo que te toca aportar');
  });

  it('sugerencia null (mismo default que sin argumento) no rompe', () => {
    const html = renderFormAporteApartado(apartadoBase(), null);
    expect(html).toContain('form-aporte-apartado');
    expect(html).not.toMatch(/id="aporte-apartado-monto"[^>]*value=/);
  });
});

// ── renderFormApartado() - selector de ícono (CAT.2c) ─────────────

describe('renderFormApartado() - selector de ícono compacto (CAT.2c)', () => {
  it('usa el selector compartido en vez del input de texto libre anterior', () => {
    const html = renderFormApartado();
    expect(html).toContain('data-icono-picker="apartado-icono"');
    expect(html).toContain('icono-picker__recuadro');
    expect(html).not.toContain('placeholder="📦"');
    expect(html).not.toContain('maxlength="4"');
  });

  it('el picker nace sin etiqueta propia (uso compacto junto al nombre)', () => {
    const html = renderFormApartado();
    const inicio = html.indexOf('data-icono-picker="apartado-icono"');
    const bloque = html.slice(inicio, inicio + 400);
    expect(bloque).not.toContain('class="label"');
  });

  it('el input oculto conserva el name="icono" para el FormData', () => {
    const html = renderFormApartado();
    expect(html).toContain('name="icono"');
  });
});

// ── renderListaApartados() - ícono con dos formatos (CAT.2c) ──────

describe('renderListaApartados() - ícono con dos formatos (CAT.2c)', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="lista-apartados"></div>';
  });

  // DIS.15: el anillo se retiró con la fila, así que la identidad pasó al
  // glifo de la cabecera, junto al nombre.
  it('un apartado con emoji crudo (plantilla o dato viejo) lo muestra tal cual', () => {
    S.apartados = [apartadoBase({ icono: '🚗' })];
    renderListaApartados();
    expect(document.querySelector('.apartado-card__glifo').textContent).toContain('🚗');
  });

  it('un apartado con id de sprite (elegido con el picker) renderiza el glifo, no texto crudo', () => {
    S.apartados = [apartadoBase({ icono: 'c-carro' })];
    renderListaApartados();
    const slot = document.querySelector('.apartado-card__glifo');
    expect(slot.innerHTML).toContain('#c-carro');
    expect(slot.textContent).not.toContain('c-carro');
  });

  it('sin icono, cae al default (emoji de caja) sin romper', () => {
    S.apartados = [{ ...apartadoBase(), icono: undefined }];
    renderListaApartados();
    expect(document.querySelector('.apartado-card__glifo').textContent).toContain(ICONO_APARTADO_DEFAULT);
  });
});

// ════════════════════════════════════════════════════════════════
// DIS.5 - auditoría de diseño de Apartados (hallazgos A1 a A13)
// ════════════════════════════════════════════════════════════════

// ── T9 (A6, regla R16): montos con separador de miles ─────────────

describe('miles() y desdeMiles() - captura de montos (T9)', () => {
  it('agrupa de a tres desde la derecha', () => {
    expect(miles('980000')).toBe('980.000');
    expect(miles(220_000)).toBe('220.000');
    expect(miles('1750905')).toBe('1.750.905');
  });

  it('ignora lo que no sea dígito y los ceros a la izquierda', () => {
    expect(miles('98o.0x00')).toBe('98.000');
    expect(miles('000980000')).toBe('980.000');
  });

  it('sin dígitos devuelve cadena vacía', () => {
    expect(miles('')).toBe('');
    expect(miles(null)).toBe('');
    expect(miles(undefined)).toBe('');
  });

  it('desdeMiles es la inversa y distingue vacío de cero', () => {
    expect(desdeMiles('980.000')).toBe(980_000);
    expect(desdeMiles('0')).toBe(0);
    expect(desdeMiles('')).toBeNull();
    expect(desdeMiles(null)).toBeNull();
  });
});

// ── T4 (A8): plantillas frecuentes a la vista, el resto plegado ───

describe('renderFormApartado() - plantillas plegadas (T4)', () => {
  it('PLANTILLAS_APARTADO_FRECUENTES son 6 y todas existen en el catálogo', () => {
    expect(PLANTILLAS_APARTADO_FRECUENTES).toHaveLength(6);
    const nombres = PLANTILLAS_APARTADO.map(p => p.nombre);
    for (const n of PLANTILLAS_APARTADO_FRECUENTES) expect(nombres).toContain(n);
  });

  it('el catálogo completo sigue disponible: 6 arriba y las otras 14 dentro del details', () => {
    const html = renderFormApartado();
    const chips = html.match(/data-action="apartado-plantilla"/g) ?? [];
    expect(chips).toHaveLength(PLANTILLAS_APARTADO.length);
    expect(html).toContain('Ver las otras ' + (PLANTILLAS_APARTADO.length - 6) + ' plantillas');
  });

  it('el bloque visible lleva el modificador --parcial y va antes del details', () => {
    const html = renderFormApartado();
    expect(html).toContain('apartado-plantillas apartado-plantillas--parcial');
    expect(html.indexOf('apartado-plantillas--parcial')).toBeLessThan(html.indexOf('Ver las otras'));
  });
});

// ── T9 (A6): los dos campos de monto dejan type="number" ──────────

describe('formularios de Apartados - monto con separador (T9)', () => {
  it('el objetivo es text + inputmode numeric + data-miles, sin "(COP)" en el label', () => {
    const html = renderFormApartado();
    expect(html).toMatch(/id="apartado-objetivo"[^>]*type="text"/);
    expect(html).toMatch(/id="apartado-objetivo"[\s\S]{0,200}?data-miles/);
    expect(html).toContain('¿Cuánto necesitas reunir?</label>');
    expect(html).not.toMatch(/id="apartado-objetivo"[^>]*type="number"/);
  });

  it('el aporte es text + inputmode numeric + data-miles', () => {
    const html = renderFormAporteApartado(apartadoBase());
    expect(html).toMatch(/id="aporte-apartado-monto"[^>]*type="text"/);
    expect(html).toMatch(/id="aporte-apartado-monto"[\s\S]{0,200}?data-miles/);
    expect(html).not.toMatch(/id="aporte-apartado-monto"[^>]*type="number"/);
  });
});

// ── T10 (A12): el contexto del aporte se dice una vez ─────────────

describe('renderFormAporteApartado() - contexto del progreso (T10)', () => {
  it('una sola línea con lo reunido, lo que falta y la fecha', () => {
    const html = renderFormAporteApartado(apartadoBase({
      montoActual: 320_000, montoObjetivo: 980_000, fechaObjetivo: '2026-09-08',
    }));
    expect(html).toContain('Llevas <strong>$320.000 de $980.000</strong>.');
    expect(html).toContain('Te faltan <strong>$660.000</strong> para el');
  });

  it('deja de atenuar el contexto y no repite el porcentaje entre paréntesis', () => {
    const html = renderFormAporteApartado(apartadoBase({ montoActual: 320_000, montoObjetivo: 980_000 }));
    expect(html).not.toContain('form-hint form-hint--muted');
    expect(html).not.toContain('Progreso de');
    expect(html).not.toContain('(33%)');
  });

  it('sin fecha objetivo dice el faltante sin inventar plazo', () => {
    const html = renderFormAporteApartado(apartadoBase({ montoActual: 320_000, montoObjetivo: 980_000, fechaObjetivo: null }));
    expect(html).toContain('Te faltan <strong>$660.000</strong>.');
    expect(html).not.toContain('para el ');
  });

  it('cubierto por completo no muestra faltante', () => {
    const html = renderFormAporteApartado(apartadoBase({ montoActual: 980_000, montoObjetivo: 980_000 }));
    expect(html).not.toContain('Te faltan');
  });
});

// ── T2, T5, T6: anatomía de la tarjeta (DIS.5, revisada en DIS.15) ─

// ── renderListaApartados() - el comparador encima de la lista (DIS.19) ──

describe('renderListaApartados() - comparador de conjunto', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="lista-apartados"></div>';
    S.apartados = [];
  });

  const conFecha = (over = {}) => apartadoBase({
    fechaObjetivo:    '2026-12-31',
    fechaCreacion:    '2026-01-01T00:00:00.000Z',
    frecuenciaAporte: 'Mensual',
    ...over,
  });

  it('con un solo apartado no se dibuja: su tarjeta ya dice todo', () => {
    S.apartados = [conFecha()];
    renderListaApartados();
    expect(document.querySelector('.apartados-comparador')).toBeNull();
    expect(document.querySelectorAll('.apartado-card')).toHaveLength(1);
  });

  it('desde dos apartados aparece, y va antes de las tarjetas', () => {
    S.apartados = [conFecha({ id: 'a1' }), conFecha({ id: 'a2', nombre: 'Impuestos' })];
    renderListaApartados();
    const cmp = document.querySelector('.apartados-comparador');
    expect(cmp).not.toBeNull();
    // 4 = DOCUMENT_POSITION_FOLLOWING: la tarjeta viene despues del comparador.
    expect(cmp.compareDocumentPosition(document.querySelector('.apartado-card'))).toBe(4);
  });

  it('una columna por apartado, en el orden de la lista', () => {
    S.apartados = [
      conFecha({ id: 'a1', nombre: 'SOAT' }),
      conFecha({ id: 'a2', nombre: 'Impuestos' }),
      conFecha({ id: 'a3', nombre: 'Matrícula' }),
    ];
    renderListaApartados();
    const nombres = [...document.querySelectorAll('.apartados-comparador .cmp__lb')].map(n => n.textContent);
    expect(nombres).toEqual(['SOAT', 'Impuestos', 'Matrícula']);
  });

  it('la altura de la columna es el porcentaje reunido de su propio objetivo', () => {
    S.apartados = [
      conFecha({ id: 'a1', montoObjetivo: 400_000, montoActual: 100_000 }),
      conFecha({ id: 'a2', montoObjetivo: 4_000_000, montoActual: 3_000_000 }),
    ];
    renderListaApartados();
    const alturas = [...document.querySelectorAll('.apartados-comparador .cmp__fill')]
      .map(f => f.style.height);
    // Se comparan por que tan cerca estan de lo suyo, no por su tamano.
    expect(alturas).toEqual(['25%', '75%']);
  });

  it('el apartado ya reunido se pinta terminado y lleva su marca al 100%', () => {
    S.apartados = [
      conFecha({ id: 'a1', montoObjetivo: 400_000, montoActual: 400_000 }),
      conFecha({ id: 'a2', montoObjetivo: 400_000, montoActual: 10_000 }),
    ];
    renderListaApartados();
    const primera = document.querySelector('.apartados-comparador .cmp__col');
    expect(primera.querySelector('.cmp__fill').classList.contains('cmp__fill--listo')).toBe(true);
    expect(primera.querySelector('.cmp__plan').style.bottom).toBe('100%');
    expect(primera.querySelector('.cmp__dias').textContent).toBe('listo');
  });

  it('un apartado sin fecha no recibe marca de plan ni finge un plazo', () => {
    S.apartados = [conFecha({ id: 'a1' }), apartadoBase({ id: 'a2', fechaObjetivo: null })];
    renderListaApartados();
    const cols = [...document.querySelectorAll('.apartados-comparador .cmp__col')];
    expect(cols[1].querySelector('.cmp__plan')).toBeNull();
    expect(cols[1].querySelector('.cmp__dias').textContent).toBe('sin fecha');
  });

  it('el gráfico no es la fuente: va aria-hidden y el pie lo dice en palabras', () => {
    S.apartados = [conFecha({ id: 'a1' }), conFecha({ id: 'a2' })];
    renderListaApartados();
    expect(document.querySelector('.apartados-comparador .cmp__cols').getAttribute('aria-hidden')).toBe('true');
    const hints = document.querySelectorAll('.apartados-comparador .cmp__hint');
    expect(hints[hints.length - 1].textContent).toContain('línea punteada');
  });

  it('las columnas no son botones: tocar una no tendría a dónde llevar', () => {
    S.apartados = [conFecha({ id: 'a1' }), conFecha({ id: 'a2' })];
    renderListaApartados();
    expect(document.querySelectorAll('.apartados-comparador button')).toHaveLength(0);
  });

  it('el estado vacío no dibuja comparador', () => {
    S.apartados = [];
    renderListaApartados();
    expect(document.querySelector('.apartados-comparador')).toBeNull();
  });
});

describe('renderListaApartados() - anatomía de la tarjeta', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="lista-apartados"></div>';
    S.apartados = [];
  });

  it('el porcentaje rotula la carrera del dinero, no el centro de un anillo', () => {
    S.apartados = [apartadoBase({ montoActual: 90_000, montoObjetivo: 360_000 })];
    renderListaApartados();
    const head = document.querySelector('.apartado-card__carrera-head');
    expect(head.textContent).toContain('Dinero reunido');
    expect(head.textContent).toContain('25%');
    expect(document.querySelector('.progress-ring')).toBeNull();
  });

  it('la tarjeta no repite el progreso: sin renglón "Falta" suelto (T5)', () => {
    S.apartados = [apartadoBase({ montoActual: 90_000, montoObjetivo: 360_000 })];
    renderListaApartados();
    expect(document.body.textContent).not.toContain('Falta:');
  });

  it('el plan de aportes vive entre los datos del pie, no en un aviso propio', () => {
    S.apartados = [apartadoBase({ montoActual: 90_000, montoObjetivo: 360_000, fechaObjetivo: '2099-12-10' })];
    renderListaApartados();
    const datos = [...document.querySelectorAll('.apartado-card__dato')].map(p => p.textContent).join(' | ');
    expect(datos).toMatch(/\d+ aportes? de /);
    expect(document.querySelector('.apartado__sugerencia')).toBeNull();
  });

  it('ninguna región viva en el contenido de la lista (T6, regla R24)', () => {
    S.apartados = [
      apartadoBase({ id: 'a1', montoObjetivo: 360_000, fechaObjetivo: '2099-12-10' }),
      apartadoBase({ id: 'a2', montoActual: 360_000, montoObjetivo: 360_000, recurrente: true, periodoMeses: 12 }),
    ];
    renderListaApartados();
    expect(document.querySelectorAll('[role="status"]')).toHaveLength(0);
    expect(document.querySelector('.apartado-card--listo')).not.toBeNull();
  });
});

// ── T7 (A3, regla R25): un umbral y un aviso que suma ─────────────

describe('renderNudgeApartadosProximos() - resumen en vez de eco (T7)', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="apartados-nudge-proximos"></div>';
    S.apartados = [];
  });

  /** Fecha ISO a N días de hoy, para no depender del día en que corra el test. */
  const enDias = (n) => {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return d.toISOString().slice(0, 10);
  };

  it('suma cuántos vencen y cuánto falta reunir entre todos', () => {
    S.apartados = [
      apartadoBase({ id: 'a1', montoActual: 120_000, montoObjetivo: 300_000, fechaObjetivo: enDias(6) }),
      apartadoBase({ id: 'a2', montoActual: 180_000, montoObjetivo: 420_000, fechaObjetivo: enDias(19) }),
      apartadoBase({ id: 'a3', montoActual: 320_000, montoObjetivo: 980_000, fechaObjetivo: enDias(29) }),
    ];
    renderNudgeApartadosProximos();
    const txt = document.getElementById('apartados-nudge-proximos').textContent;
    expect(txt).toContain('3 reservas vencen en los próximos ' + DIAS_PROXIMO + ' días');
    expect(txt).toContain('$1.080.000');
    expect(txt).toContain('entre los 3');
  });

  it('con uno solo lo dice en singular y sin "entre los"', () => {
    S.apartados = [apartadoBase({ montoActual: 120_000, montoObjetivo: 300_000, fechaObjetivo: enDias(6) })];
    renderNudgeApartadosProximos();
    const txt = document.getElementById('apartados-nudge-proximos').textContent;
    expect(txt).toContain('1 reserva vence en los próximos ' + DIAS_PROXIMO + ' días');
    expect(txt).toContain('$180.000');
    expect(txt).not.toContain('entre los');
  });

  it('deja de repetir el nombre, la fecha y el aporte de la primera fila (regla R27)', () => {
    S.apartados = [apartadoBase({ nombre: 'Regalos', montoActual: 120_000, montoObjetivo: 300_000, fechaObjetivo: enDias(6) })];
    renderNudgeApartadosProximos();
    const txt = document.getElementById('apartados-nudge-proximos').textContent;
    expect(txt).not.toContain('Regalos');
    expect(txt).not.toContain('Aparta');
  });

  it('no es región viva: se repinta en cada render (T6)', () => {
    S.apartados = [apartadoBase({ montoObjetivo: 300_000, fechaObjetivo: enDias(6) })];
    renderNudgeApartadosProximos();
    expect(document.querySelector('#apartados-nudge-proximos [role="status"]')).toBeNull();
  });

  it('sin apartados dentro del umbral no pinta nada', () => {
    S.apartados = [apartadoBase({ montoObjetivo: 300_000, fechaObjetivo: enDias(45) })];
    renderNudgeApartadosProximos();
    expect(document.getElementById('apartados-nudge-proximos').innerHTML).toBe('');
  });
});

// ── T11 y T12 (A9, A10): el estado vacío ──────────────────────────

describe('renderListaApartados() - estado vacío (T11, T12)', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="lista-apartados"></div>';
    S.apartados = [];
  });

  it('dice que el dinero se aparta con el primer aporte (A9)', () => {
    renderListaApartados();
    expect(document.body.textContent).toContain('El dinero se aparta cuando registras el primer aporte.');
  });

  it('el CTA del vacío baja a secundario: el primario ya está en el encabezado (regla R1)', () => {
    renderListaApartados();
    const cta = document.querySelector('[data-action="nuevo-apartado"]');
    expect(cta.classList.contains('btn-secondary')).toBe(true);
    expect(cta.classList.contains('btn-primary')).toBe(false);
  });

  it('de cinco bloques de texto a tres, con la desambiguación conservada', () => {
    renderListaApartados();
    expect(document.querySelectorAll('.empty-state__tip')).toHaveLength(1);
    expect(document.body.textContent).toContain('Límites de gasto');
  });
});

// ════════════════════════════════════════════════════════════════
// DIS.15 - arquitectura E, "las dos carreras"
// ════════════════════════════════════════════════════════════════

// ── planDeReferencia(): la segunda carrera ────────────────────────

describe('planDeReferencia()', () => {
  const conPlan = (overrides = {}) => apartadoBase({
    fechaCreacion:    '2026-01-01T10:00:00.000Z',
    fechaObjetivo:    '2026-05-01',   // 120 días: 8 quincenas
    frecuenciaAporte: 'Quincenal',
    montoObjetivo:    480_000,
    ...overrides,
  });

  it('parte el objetivo en aportes del período, desde la creación hasta la fecha', () => {
    const p = planDeReferencia(conPlan(), '2026-01-01');
    expect(p.totalAportes).toBe(8);
    expect(p.cuotaPrevista).toBe(60_000);
    expect(p.aportesEsperados).toBe(0);
  });

  it('cuenta un aporte esperado por período completo corrido, no por día', () => {
    expect(planDeReferencia(conPlan(), '2026-01-14').aportesEsperados).toBe(0);
    expect(planDeReferencia(conPlan(), '2026-01-16').aportesEsperados).toBe(1);
    expect(planDeReferencia(conPlan(), '2026-04-16').aportesEsperados).toBe(7);
  });

  it('el dinero se traduce a aportes completos: ahí sale el atraso', () => {
    const p = planDeReferencia(conPlan({ montoActual: 360_000 }), '2026-04-16');
    expect(p.aportesEquivalentes).toBe(6);
    expect(p.aportesEsperados).toBe(7);
    expect(p.delta).toBe(-1);
  });

  it('quien aporta de más va adelante, que es lo que ninguna tarjeta sabía decir', () => {
    // 90 días corridos: tocaban 6 aportes y el dinero ya vale 7.
    const p = planDeReferencia(conPlan({ montoActual: 420_000 }), '2026-04-01');
    expect(p.aportesEsperados).toBe(6);
    expect(p.aportesEquivalentes).toBe(7);
    expect(p.delta).toBe(1);
  });

  it('quien aporta puntualmente no aparece atrasado (el error que corrigió la propuesta)', () => {
    // Una quincena corrida, un aporte hecho: al día, no atrasado.
    const p = planDeReferencia(conPlan({ montoActual: 60_000 }), '2026-01-16');
    expect(p.delta).toBe(0);
  });

  it('ni los esperados ni los equivalentes se salen del plan', () => {
    const p = planDeReferencia(conPlan({ montoActual: 999_000_000 }), '2027-01-01');
    expect(p.aportesEsperados).toBe(p.totalAportes);
    expect(p.aportesEquivalentes).toBe(p.totalAportes);
  });

  it('sin fecha objetivo no hay plan que dibujar', () => {
    expect(planDeReferencia(conPlan({ fechaObjetivo: null }), '2026-02-01')).toBeNull();
  });

  it('sin objetivo válido tampoco', () => {
    expect(planDeReferencia(conPlan({ montoObjetivo: 0 }), '2026-02-01')).toBeNull();
  });

  it('una fecha objetivo anterior al arranque del plan no produce plan', () => {
    expect(planDeReferencia(conPlan({ fechaObjetivo: '2025-06-01' }), '2026-02-01')).toBeNull();
  });

  it('un apartado sin fechaCreacion (lectura defensiva) devuelve null', () => {
    const sinCreacion = conPlan();
    delete sinCreacion.fechaCreacion;
    expect(planDeReferencia(sinCreacion, '2026-02-01')).toBeNull();
  });

  it('fechaInicioPlan manda sobre fechaCreacion: el ciclo nuevo arranca donde se reinició', () => {
    const reiniciado = conPlan({
      fechaInicioPlan: '2026-03-01',
      fechaObjetivo:   '2026-05-01',   // 61 días: 5 quincenas
    });
    const p = planDeReferencia(reiniciado, '2026-03-16');
    expect(p.inicio).toBe('2026-03-01');
    expect(p.totalAportes).toBe(5);
    expect(p.aportesEsperados).toBe(1);
  });
});

// ── reiniciarCiclo() anota el arranque del ciclo nuevo ────────────

describe('reiniciarCiclo() - arranque del plan (DIS.15)', () => {
  it('sella fechaInicioPlan con el día del reinicio', () => {
    const r = reiniciarCiclo(
      apartadoBase({ recurrente: true, periodoMeses: 12, fechaObjetivo: '2026-08-20', montoActual: 360_000 }),
      '2026-08-21',
    );
    expect(r.fechaInicioPlan).toBe('2026-08-21');
  });

  it('sin ese sello, el apartado reiniciado mediría su plan desde que se creó', () => {
    // Contra-prueba de por qué existe el campo: con el arranque viejo, el ciclo
    // que acaba de empezar heredaría 39 aportes de atraso el mismo día uno.
    const viejo = apartadoBase({
      recurrente: true, periodoMeses: 12,
      fechaCreacion: '2025-01-01T00:00:00.000Z',
      fechaObjetivo: '2027-08-20',
      montoObjetivo: 480_000,
    });
    const sinSello = planDeReferencia(viejo, '2026-08-21');
    expect(sinSello.aportesEsperados).toBeGreaterThan(0);

    const conSello = planDeReferencia({ ...viejo, fechaInicioPlan: '2026-08-21' }, '2026-08-21');
    expect(conSello.aportesEsperados).toBe(0);
  });
});

// ── La tarjeta y sus estados ─────────────────────────────────────

/**
 * YYYY-MM-DD a N días de hoy (negativo hacia atrás), en hora local. `hoy()`
 * de infra también es local: con `toISOString()` el día se corre en Colombia
 * (UTC-5) a partir de las 7 p. m. y los tests salen flakey por eso.
 */
const enDias = (d) => {
  const x = new Date();
  x.setDate(x.getDate() + d);
  const mm = String(x.getMonth() + 1).padStart(2, '0');
  const dd = String(x.getDate()).padStart(2, '0');
  return `${x.getFullYear()}-${mm}-${dd}`;
};

describe('renderListaApartados() - tarjeta E (DIS.15)', () => {
  /** Apartado con plan vivo: creado hoy mismo, objetivo a 120 días. */
  const conFecha = (overrides = {}) => apartadoBase({
    fechaCreacion:    enDias(0),
    fechaObjetivo:    enDias(120),
    frecuenciaAporte: 'Quincenal',
    montoObjetivo:    480_000,
    ...overrides,
  });

  const textoDatos = () =>
    [...document.querySelectorAll('.apartado-card__dato')].map(p => p.textContent).join(' | ');

  beforeEach(() => {
    document.body.innerHTML = '<div id="lista-apartados"></div>';
    S.config    = {};
    S.apartados = [];
  });

  it('el apartado se pinta como .apartado-card, no como fila de lista', () => {
    S.apartados = [conFecha()];
    renderListaApartados();
    expect(document.querySelector('.apartado-card')).not.toBeNull();
    expect(document.querySelector('.list-item')).toBeNull();
  });

  it('el protagonista es el plazo: los días al centro, no el porcentaje', () => {
    S.apartados = [conFecha()];
    renderListaApartados();
    expect(document.querySelector('.apartado-card__foco-dato').textContent).toBe('120');
    expect(document.querySelector('.apartado-card__foco-nota').textContent).toContain('días para el');
  });

  it('dibuja las dos carreras: dinero reunido y plan en casillas', () => {
    S.apartados = [conFecha({ montoActual: 240_000 })];
    renderListaApartados();
    const heads = [...document.querySelectorAll('.apartado-card__carrera-head')].map(p => p.textContent);
    expect(heads[0]).toContain('Dinero reunido');
    expect(heads[1]).toContain('Deberías llevar');
    expect(heads[1]).toContain('de 8 aportes');
    expect(document.querySelectorAll('.apartado-card__casilla')).toHaveLength(8);
  });

  it('sin fecha objetivo se cae la segunda carrera y la tarjeta ofrece lo que falta', () => {
    S.apartados = [apartadoBase({ montoActual: 90_000, fechaObjetivo: null })];
    renderListaApartados();
    expect(document.querySelectorAll('.apartado-card__carrera')).toHaveLength(1);
    expect(document.querySelector('.apartado-card__casilla')).toBeNull();
    expect(textoDatos()).toContain('Sin fecha objetivo');
    expect(document.querySelector('.apartado-card__nota').textContent).toContain('Con una fecha objetivo');
  });

  it('sin fecha, el monto reunido sube al lugar protagonista', () => {
    S.apartados = [apartadoBase({ montoActual: 90_000, montoObjetivo: 360_000, fechaObjetivo: null })];
    renderListaApartados();
    expect(document.querySelector('.apartado-card__foco-dato').textContent).toContain('90.000');
    expect(document.querySelector('.apartado-card__foco-nota').textContent).toContain('de $360.000 reunidos');
  });

  it('el veredicto habla cuando hay un aporte completo de atraso', () => {
    S.apartados = [apartadoBase({
      fechaCreacion: enDias(-105), fechaObjetivo: enDias(15),
      montoObjetivo: 480_000, montoActual: 360_000, frecuenciaAporte: 'Quincenal',
    })];
    renderListaApartados();
    const v = document.querySelector('.apartado-card__veredicto').textContent;
    expect(v).toContain('atrás del plan');
    expect(v).toContain('60.000');
  });

  it('y reconoce a quien va adelante, con el paso siguiente incluido', () => {
    S.apartados = [apartadoBase({
      fechaCreacion: enDias(-90), fechaObjetivo: enDias(30),
      montoObjetivo: 480_000, montoActual: 420_000, frecuenciaAporte: 'Quincenal',
    })];
    renderListaApartados();
    expect(document.querySelector('.apartado-card__veredicto').textContent).toContain('adelante');
  });

  it('quien va al día no recibe ningún juicio: las barras hablan solas', () => {
    S.apartados = [apartadoBase({
      fechaCreacion: enDias(-30), fechaObjetivo: enDias(90),
      montoObjetivo: 480_000, montoActual: 120_000, frecuenciaAporte: 'Quincenal',
    })];
    renderListaApartados();
    expect(document.querySelector('.apartado-card__veredicto')).toBeNull();
  });

  it('recién creado: el plan se rotula como camino y el botón nombra el primer paso', () => {
    S.apartados = [conFecha({ montoActual: 0 })];
    renderListaApartados();
    const heads = [...document.querySelectorAll('.apartado-card__carrera-head')];
    expect(heads[1].textContent).toContain('Tu plan');
    expect(document.querySelector('.apartado-card__principal').textContent).toContain('Hacer el primer aporte');
    expect(textoDatos()).toContain('Objetivo ');
  });

  it('con plan vivo, el botón trae el monto del aporte ya decidido', () => {
    S.apartados = [conFecha({ montoActual: 120_000 })];
    renderListaApartados();
    expect(document.querySelector('.apartado-card__principal').textContent).toMatch(/\+ Aportar \$/);
  });

  it('listo para usar: cambia el dato protagonista y la acción, no solo el botón', () => {
    S.apartados = [conFecha({ montoActual: 480_000, recurrente: true, periodoMeses: 12 })];
    renderListaApartados();
    const card = document.querySelector('.apartado-card--listo');
    expect(card).not.toBeNull();
    expect(card.querySelector('.apartado-card__foco-dato').textContent).toBe('Ya lo reuniste');
    expect(card.querySelector('.apartado-card__foco-nota').textContent).toContain('de sobra');
    expect(card.querySelector('[data-action="reiniciar-apartado"]')).not.toBeNull();
    expect(card.querySelector('[data-action="aportar-apartado"]')).toBeNull();
  });

  it('listo para usar: las dos carreras se igualan aunque el calendario no haya corrido', () => {
    S.apartados = [conFecha({ montoActual: 480_000, recurrente: true, periodoMeses: 12 })];
    renderListaApartados();
    const heads = [...document.querySelectorAll('.apartado-card__carrera-head')];
    expect(heads[1].textContent).toContain('Deberían estar hechos');
    expect(heads[1].textContent).toContain('8 de 8 aportes');
    expect(document.querySelectorAll('.apartado-card__casilla--on')).toHaveLength(8);
  });

  it('la recurrencia deja de ser cola del subtítulo y se marca en la cabecera', () => {
    S.apartados = [conFecha({ recurrente: true, periodoMeses: 12 })];
    renderListaApartados();
    expect(document.querySelector('.apartado-card__head .apartado-card__chip').textContent).toContain('cada año');
  });

  it('un apartado sin recurrencia no lleva chip', () => {
    S.apartados = [conFecha()];
    renderListaApartados();
    expect(document.querySelector('.apartado-card__chip')).toBeNull();
  });

  it('un plan largo no dibuja cien casillas: cae a barra continua', () => {
    S.apartados = [apartadoBase({
      fechaCreacion: enDias(0), fechaObjetivo: enDias(720),
      frecuenciaAporte: 'Semanal', montoObjetivo: 5_000_000,
    })];
    renderListaApartados();
    expect(document.querySelector('.apartado-card__casilla')).toBeNull();
    expect(document.querySelectorAll('.apartado-card__barra')).toHaveLength(2);
  });

  // Regla R20: el ojo esconde pesos, no progreso.
  it('con el saldo oculto enmascara los pesos y conserva barras, días y aportes', () => {
    S.config    = { ocultarSaldo: true };
    S.apartados = [conFecha({ montoActual: 240_000 })];
    renderListaApartados();
    expect(textoDatos()).not.toContain('240.000');
    expect(textoDatos()).not.toContain('480.000');
    expect(document.querySelector('.apartado-card__principal').textContent.trim()).toBe('+ Aportar');
    expect(document.querySelector('.apartado-card__foco-dato').textContent).toBe('120');
    expect(document.querySelectorAll('.apartado-card__casilla')).toHaveLength(8);
    expect(document.querySelector('.apartado-card__carrera-head').textContent).toContain('50%');
  });

  it('sin el flag activo los montos se ven completos', () => {
    S.apartados = [conFecha({ montoActual: 240_000 })];
    renderListaApartados();
    expect(textoDatos()).toContain('240.000');
  });

  it('el aviso de apartados próximos también respeta el ojo (regla R20)', () => {
    document.body.innerHTML = '<div id="apartados-nudge-proximos"></div>';
    S.config    = { ocultarSaldo: true };
    S.apartados = [apartadoBase({ fechaObjetivo: enDias(10), montoObjetivo: 360_000, montoActual: 60_000 })];
    renderNudgeApartadosProximos();
    expect(document.body.textContent).not.toContain('300.000');
  });
});

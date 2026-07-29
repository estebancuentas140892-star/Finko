import { describe, it, expect, beforeEach } from 'vitest';
import { S } from '../../modules/core/state.js';
import { initAhorro } from '../../modules/dominio/ahorro/index.js';
import { dispatch } from '../../modules/ui/actions.js';
import { SALDO_MASCARA_CUENTA } from '../../modules/infra/render.js';
import {
  calcularObjetivoFondo,
  calcularProgresoFondo,
  mesesDeColchon,
  calcularTasaAhorro,
  validarMetaMeses,
  validarMontoActual,
  normalizarMetaMeses,
  normalizarMontoActual,
  META_MESES_MIN,
  META_MESES_MAX,
  META_MESES_DEFAULT,
  // J.1b
  calcularTotalAportes,
  calcularMontoTotalFondo,
  ordenarAportesPorFecha,
  validarMontoAporte,
  validarFechaAporte,
  normalizarMontoAporte,
  validarCompromisoMensual,
  normalizarCompromisoMensual,
  // F6 + DIS.18
  casaAhorro,
  diasAlProximoApartado,
  MODALIDADES_AHORRO,
  // AH.2
  calcularAporteSugerido,
  HORIZONTE_FONDO_MESES,
  // DIS.16
  nivelesFondo,
  mesesEnPalabras,
  fechaCobertura,
  bloquesCobertura,
  franjaCobertura,
  aportadoEnMes,
  progresoCompromiso,
  MESES_FRANJA_MIN,
  MAX_ROTULOS_MES,
  NIVELES_FONDO,
} from '../../modules/dominio/ahorro/logic.js';
import {
  renderFormAporte,
  renderFormFondo,
  renderAhorro,
  renderCasaAhorro,
} from '../../modules/dominio/ahorro/view.js';

// ── calcularObjetivoFondo ────────────────────────────────────────

describe('calcularObjetivoFondo', () => {
  it('multiplica gastos fijos por meta de meses', () => {
    expect(calcularObjetivoFondo(2_000_000, 3)).toBe(6_000_000);
    expect(calcularObjetivoFondo(1_500_000, 6)).toBe(9_000_000);
  });

  it('redondea el resultado a entero', () => {
    expect(calcularObjetivoFondo(1_234_567, 3)).toBe(3_703_701);
  });

  it('devuelve 0 si los gastos fijos no son válidos o no positivos', () => {
    expect(calcularObjetivoFondo(0, 3)).toBe(0);
    expect(calcularObjetivoFondo(-100, 3)).toBe(0);
    expect(calcularObjetivoFondo(NaN, 3)).toBe(0);
    expect(calcularObjetivoFondo(undefined, 3)).toBe(0);
  });

  it('devuelve 0 si la meta de meses no es válida o no positiva', () => {
    expect(calcularObjetivoFondo(1_000_000, 0)).toBe(0);
    expect(calcularObjetivoFondo(1_000_000, -3)).toBe(0);
    expect(calcularObjetivoFondo(1_000_000, NaN)).toBe(0);
  });
});

// ── calcularProgresoFondo ────────────────────────────────────────

describe('calcularProgresoFondo', () => {
  it('calcula porcentaje y faltante con valores intermedios', () => {
    expect(calcularProgresoFondo(1_500_000, 6_000_000))
      .toEqual({ porcentaje: 25, faltante: 4_500_000, completado: false });
  });

  it('redondea el porcentaje al entero más cercano', () => {
    expect(calcularProgresoFondo(1_000_000, 3_000_000).porcentaje).toBe(33);
    expect(calcularProgresoFondo(2_000_000, 3_000_000).porcentaje).toBe(67);
  });

  it('marca completado cuando montoActual alcanza el objetivo', () => {
    const r = calcularProgresoFondo(6_000_000, 6_000_000);
    expect(r.porcentaje).toBe(100);
    expect(r.faltante).toBe(0);
    expect(r.completado).toBe(true);
  });

  it('limita porcentaje a 100 cuando hay exceso de ahorro', () => {
    const r = calcularProgresoFondo(10_000_000, 6_000_000);
    expect(r.porcentaje).toBe(100);
    expect(r.faltante).toBe(0);
    expect(r.completado).toBe(true);
  });

  it('devuelve estructura vacía si el objetivo no es positivo', () => {
    expect(calcularProgresoFondo(500_000, 0))
      .toEqual({ porcentaje: 0, faltante: 0, completado: false });
    expect(calcularProgresoFondo(500_000, -100))
      .toEqual({ porcentaje: 0, faltante: 0, completado: false });
  });

  it('trata monto negativo o no válido como 0', () => {
    expect(calcularProgresoFondo(-500_000, 1_000_000).porcentaje).toBe(0);
    expect(calcularProgresoFondo(NaN, 1_000_000).porcentaje).toBe(0);
  });
});

// ── mesesDeColchon ───────────────────────────────────────────────

describe('mesesDeColchon', () => {
  it('cuenta los meses que cubre el monto actual con 1 decimal', () => {
    expect(mesesDeColchon(3_000_000, 1_500_000)).toBe(2);
    expect(mesesDeColchon(2_250_000, 1_500_000)).toBe(1.5);
  });

  it('redondea a 1 decimal', () => {
    expect(mesesDeColchon(1_000_000, 750_000)).toBe(1.3);
  });

  it('devuelve null si no hay gastos fijos > 0 (ratio indefinido)', () => {
    expect(mesesDeColchon(1_000_000, 0)).toBeNull();
    expect(mesesDeColchon(1_000_000, -50_000)).toBeNull();
    expect(mesesDeColchon(1_000_000, NaN)).toBeNull();
  });

  it('devuelve 0 si el usuario aún no ha apartado nada', () => {
    expect(mesesDeColchon(0, 1_500_000)).toBe(0);
  });

  it('trata monto negativo o no válido como 0', () => {
    expect(mesesDeColchon(-500_000, 1_000_000)).toBe(0);
    expect(mesesDeColchon(NaN, 1_000_000)).toBe(0);
  });
});

// ── calcularTasaAhorro ───────────────────────────────────────────

describe('calcularTasaAhorro', () => {
  it('devuelve el porcentaje de ingresos no gastados', () => {
    expect(calcularTasaAhorro(4_000_000, 3_000_000)).toBe(25);
    expect(calcularTasaAhorro(2_000_000, 1_500_000)).toBe(25);
  });

  it('devuelve 0 cuando gastos = ingresos', () => {
    expect(calcularTasaAhorro(2_000_000, 2_000_000)).toBe(0);
  });

  it('permite resultado negativo si los gastos superan ingresos', () => {
    expect(calcularTasaAhorro(2_000_000, 2_500_000)).toBe(-25);
  });

  it('devuelve null si los ingresos no son > 0', () => {
    expect(calcularTasaAhorro(0, 100_000)).toBeNull();
    expect(calcularTasaAhorro(-100, 50_000)).toBeNull();
    expect(calcularTasaAhorro(NaN, 50_000)).toBeNull();
  });

  it('devuelve null si los gastos no son numéricos', () => {
    expect(calcularTasaAhorro(2_000_000, NaN)).toBeNull();
  });
});

// ── validarMetaMeses ─────────────────────────────────────────────

describe('validarMetaMeses', () => {
  it('acepta enteros dentro del rango permitido', () => {
    expect(validarMetaMeses(3)).toEqual([]);
    expect(validarMetaMeses('6')).toEqual([]);
    expect(validarMetaMeses(META_MESES_MIN)).toEqual([]);
    expect(validarMetaMeses(META_MESES_MAX)).toEqual([]);
  });

  it('rechaza valores fuera del rango', () => {
    expect(validarMetaMeses(0).length).toBe(1);
    expect(validarMetaMeses(META_MESES_MAX + 1).length).toBe(1);
    expect(validarMetaMeses(-3).length).toBe(1);
  });

  it('rechaza decimales y NaN', () => {
    expect(validarMetaMeses(2.5).length).toBe(1);
    expect(validarMetaMeses('abc').length).toBe(1);
    expect(validarMetaMeses(NaN).length).toBe(1);
  });
});

// ── validarMontoActual ───────────────────────────────────────────

describe('validarMontoActual', () => {
  it('acepta 0 y positivos', () => {
    expect(validarMontoActual(0)).toEqual([]);
    expect(validarMontoActual('1500000')).toEqual([]);
  });

  it('rechaza negativos y no-numéricos', () => {
    expect(validarMontoActual(-100).length).toBe(1);
    expect(validarMontoActual('abc').length).toBe(1);
    expect(validarMontoActual(NaN).length).toBe(1);
  });
});

// ── normalizarMetaMeses ──────────────────────────────────────────

describe('normalizarMetaMeses', () => {
  it('clampa al rango permitido', () => {
    expect(normalizarMetaMeses(0)).toBe(META_MESES_MIN);
    expect(normalizarMetaMeses(99)).toBe(META_MESES_MAX);
  });

  it('redondea decimales', () => {
    expect(normalizarMetaMeses(3.7)).toBe(4);
  });

  it('cae al default ante valores no numéricos', () => {
    expect(normalizarMetaMeses('abc')).toBe(META_MESES_DEFAULT);
    expect(normalizarMetaMeses(NaN)).toBe(META_MESES_DEFAULT);
  });
});

// ── normalizarMontoActual ────────────────────────────────────────

describe('normalizarMontoActual', () => {
  it('redondea a entero', () => {
    expect(normalizarMontoActual(1_500_000.7)).toBe(1_500_001);
    expect(normalizarMontoActual('2000000')).toBe(2_000_000);
  });

  it('convierte negativos y no-numéricos a 0', () => {
    expect(normalizarMontoActual(-500)).toBe(0);
    expect(normalizarMontoActual('abc')).toBe(0);
    expect(normalizarMontoActual(NaN)).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════
// J.1b - Aportes + Compromiso mensual
// ═══════════════════════════════════════════════════════════════

// ── calcularTotalAportes ─────────────────────────────────────────

describe('calcularTotalAportes', () => {
  it('suma los montos de todos los aportes', () => {
    const aportes = [
      { id: '1', monto: 200_000, fecha: '2026-05-01' },
      { id: '2', monto: 300_000, fecha: '2026-05-15' },
    ];
    expect(calcularTotalAportes(aportes)).toBe(500_000);
  });

  it('devuelve 0 para array vacío', () => {
    expect(calcularTotalAportes([])).toBe(0);
  });

  it('devuelve 0 si el argumento no es un array', () => {
    expect(calcularTotalAportes(null)).toBe(0);
    expect(calcularTotalAportes(undefined)).toBe(0);
    expect(calcularTotalAportes(500_000)).toBe(0);
  });

  it('ignora montos no-numéricos en los aportes', () => {
    const aportes = [
      { id: '1', monto: 100_000, fecha: '2026-05-01' },
      { id: '2', monto: 'abc',   fecha: '2026-05-10' },
      { id: '3', monto: NaN,     fecha: '2026-05-20' },
    ];
    expect(calcularTotalAportes(aportes)).toBe(100_000);
  });
});

// ── calcularMontoTotalFondo ──────────────────────────────────────

describe('calcularMontoTotalFondo', () => {
  it('suma el monto base con el total de aportes', () => {
    const aportes = [
      { id: '1', monto: 200_000, fecha: '2026-05-01' },
    ];
    expect(calcularMontoTotalFondo(500_000, aportes)).toBe(700_000);
  });

  it('funciona con array de aportes vacío', () => {
    expect(calcularMontoTotalFondo(1_000_000, [])).toBe(1_000_000);
  });

  it('trata monto base no-numérico como 0', () => {
    const aportes = [{ id: '1', monto: 300_000, fecha: '2026-05-01' }];
    expect(calcularMontoTotalFondo(NaN, aportes)).toBe(300_000);
    expect(calcularMontoTotalFondo(undefined, aportes)).toBe(300_000);
  });

  it('nunca devuelve negativo', () => {
    expect(calcularMontoTotalFondo(-500_000, [])).toBe(0);
  });
});

// ── ordenarAportesPorFecha ───────────────────────────────────────

describe('ordenarAportesPorFecha', () => {
  it('ordena de más reciente a más antiguo', () => {
    const aportes = [
      { id: '1', monto: 100_000, fecha: '2026-01-10' },
      { id: '2', monto: 200_000, fecha: '2026-03-15' },
      { id: '3', monto: 150_000, fecha: '2026-02-01' },
    ];
    const resultado = ordenarAportesPorFecha(aportes);
    expect(resultado[0].fecha).toBe('2026-03-15');
    expect(resultado[1].fecha).toBe('2026-02-01');
    expect(resultado[2].fecha).toBe('2026-01-10');
  });

  it('no muta el array original', () => {
    const aportes = [
      { id: '1', monto: 100_000, fecha: '2026-01-10' },
      { id: '2', monto: 200_000, fecha: '2026-03-15' },
    ];
    const copia = [...aportes];
    ordenarAportesPorFecha(aportes);
    expect(aportes[0].fecha).toBe(copia[0].fecha);
  });

  it('devuelve array vacío para entradas inválidas', () => {
    expect(ordenarAportesPorFecha(null)).toEqual([]);
    expect(ordenarAportesPorFecha(undefined)).toEqual([]);
  });
});

// ── validarMontoAporte ───────────────────────────────────────────

describe('validarMontoAporte', () => {
  it('acepta montos positivos', () => {
    expect(validarMontoAporte(100_000)).toEqual([]);
    expect(validarMontoAporte('250000')).toEqual([]);
  });

  it('rechaza 0 (a diferencia de validarMontoActual)', () => {
    expect(validarMontoAporte(0).length).toBe(1);
  });

  it('rechaza negativos y no-numéricos', () => {
    expect(validarMontoAporte(-1_000).length).toBe(1);
    expect(validarMontoAporte('abc').length).toBe(1);
    expect(validarMontoAporte(NaN).length).toBe(1);
  });
});

// ── validarFechaAporte ───────────────────────────────────────────

describe('validarFechaAporte', () => {
  it('acepta fechas en formato YYYY-MM-DD', () => {
    expect(validarFechaAporte('2026-05-01')).toEqual([]);
    expect(validarFechaAporte('2025-12-31')).toEqual([]);
  });

  it('rechaza cadena vacía y null/undefined', () => {
    expect(validarFechaAporte('').length).toBe(1);
    expect(validarFechaAporte(null).length).toBe(1);
    expect(validarFechaAporte(undefined).length).toBe(1);
  });

  it('rechaza formatos incorrectos', () => {
    expect(validarFechaAporte('01-05-2026').length).toBe(1);
    expect(validarFechaAporte('2026/05/01').length).toBe(1);
    expect(validarFechaAporte('abc').length).toBe(1);
  });
});

// ── normalizarMontoAporte ────────────────────────────────────────

describe('normalizarMontoAporte', () => {
  it('redondea a entero positivo', () => {
    expect(normalizarMontoAporte('150000')).toBe(150_000);
    expect(normalizarMontoAporte(99_999.6)).toBe(100_000);
  });

  it('convierte 0 y negativos a 0', () => {
    expect(normalizarMontoAporte(0)).toBe(0);
    expect(normalizarMontoAporte(-500)).toBe(0);
  });

  it('convierte no-numéricos a 0', () => {
    expect(normalizarMontoAporte('abc')).toBe(0);
    expect(normalizarMontoAporte(NaN)).toBe(0);
  });
});

// ── validarCompromisoMensual ─────────────────────────────────────

describe('validarCompromisoMensual', () => {
  it('acepta 0 (sin compromiso) y positivos', () => {
    expect(validarCompromisoMensual(0)).toEqual([]);
    expect(validarCompromisoMensual('500000')).toEqual([]);
  });

  it('rechaza negativos', () => {
    expect(validarCompromisoMensual(-1_000).length).toBe(1);
  });

  it('rechaza no-numéricos', () => {
    expect(validarCompromisoMensual('abc').length).toBe(1);
    expect(validarCompromisoMensual(NaN).length).toBe(1);
  });
});

// ── normalizarCompromisoMensual ──────────────────────────────────

describe('normalizarCompromisoMensual', () => {
  it('redondea a entero no-negativo', () => {
    expect(normalizarCompromisoMensual('200000')).toBe(200_000);
    expect(normalizarCompromisoMensual(0)).toBe(0);
    expect(normalizarCompromisoMensual(149_999.9)).toBe(150_000);
  });

  it('convierte negativos y no-numéricos a 0', () => {
    expect(normalizarCompromisoMensual(-100)).toBe(0);
    expect(normalizarCompromisoMensual('abc')).toBe(0);
    expect(normalizarCompromisoMensual(NaN)).toBe(0);
  });
});

// ── casaAhorro (F6 + DIS.18) ─────────────────────────────────────

describe('casaAhorro', () => {
  it('suma las cuatro modalidades', () => {
    const r = casaAhorro({ montos: { fondo: 500_000, metas: 300_000, apartados: 100_000, inversiones: 100_000 } });
    expect(r.total).toBe(1_000_000);
    expect(r.filas.map(fila => fila.monto)).toEqual([500_000, 100_000, 300_000, 100_000]);
  });

  // DIS.19 (item 2): el orden lo fija una sola pregunta, cuando vas a usar este
  // dinero. Antes era "del mas urgente al mas lejano", que decia casi lo mismo
  // sin poder explicarse.
  it('mantiene el orden del momento de uso, no el de los montos', () => {
    const r = casaAhorro({ montos: { fondo: 1, metas: 999_999, apartados: 500, inversiones: 700 } });
    expect(r.filas.map(fila => fila.clave)).toEqual(['fondo', 'apartados', 'metas', 'inversiones']);
  });

  it('cada modalidad dice cuándo se usa su dinero, y las cuatro respuestas difieren', () => {
    const cuandos = casaAhorro().filas.map(fila => fila.cuando);
    expect(cuandos).toEqual([
      'Ojalá nunca lo uses',
      'En una fecha que no elegiste',
      'Algún día, cuando quieras',
      'Además, creciendo',
    ]);
    expect(new Set(cuandos).size).toBe(4);
  });

  it('muestra las cuatro filas también en cero: una modalidad que no aparece no se descubre', () => {
    const r = casaAhorro();
    expect(r.total).toBe(0);
    expect(r.filas).toHaveLength(4);
    expect(r.filas.map(fila => fila.estado)).toEqual([
      'sin empezar', 'ninguno todavía', 'ninguna todavía', 'ninguna todavía',
    ]);
  });

  it('cada fila lleva su propósito y su destino', () => {
    const r = casaAhorro();
    expect(r.filas.every(fila => fila.proposito.length > 0)).toBe(true);
    expect(r.filas.map(fila => fila.seccion)).toEqual(['fondo', 'apartados', 'metas', 'inversion']);
  });

  it('trata negativos y no-numéricos como 0', () => {
    const r = casaAhorro({ montos: { fondo: -100, metas: 'abc', apartados: NaN, inversiones: 80_000 } });
    expect(r.total).toBe(80_000);
    expect(r.filas[0].monto).toBe(0);
  });

  it('el estado del fondo se dice en tiempo cubierto (DIS.16)', () => {
    const r = casaAhorro({ montos: { fondo: 400_000 }, mesesCubiertos: 1.75 });
    expect(r.filas[0].estado).toBe('1 mes y 3 semanas cubiertos');
  });

  it('el estado de Metas cuenta las que están en curso', () => {
    expect(casaAhorro({ metasEnCurso: 1 }).filas[2].estado).toBe('1 en curso');
    expect(casaAhorro({ metasEnCurso: 3 }).filas[2].estado).toBe('3 en curso');
  });

  it('el estado de Apartados es el próximo cobro, y avisa si ya venció', () => {
    expect(casaAhorro({ diasProximoApartado: 23 }).filas[1].estado).toBe('el más próximo, en 23 días');
    expect(casaAhorro({ diasProximoApartado: 1 }).filas[1].estado).toBe('el más próximo, mañana');
    expect(casaAhorro({ diasProximoApartado: 0 }).filas[1].estado).toBe('uno vence hoy');
    expect(casaAhorro({ diasProximoApartado: -4 }).filas[1].estado).toBe('uno ya venció');
  });

  it('con dinero apartado pero sin fecha por delante no inventa un plazo', () => {
    const r = casaAhorro({ montos: { apartados: 300_000 }, diasProximoApartado: null });
    expect(r.filas[1].estado).toBe('sin fecha próxima');
  });

  it('el estado de Inversión cuenta las inversiones abiertas', () => {
    expect(casaAhorro({ inversionesAbiertas: 1 }).filas[3].estado).toBe('1 inversión');
    expect(casaAhorro({ inversionesAbiertas: 2 }).filas[3].estado).toBe('2 inversiones');
  });

  it('MODALIDADES_AHORRO apunta al fondo en #fondo, no en #ahorro (la casa)', () => {
    expect(MODALIDADES_AHORRO.find(m => m.clave === 'fondo').seccion).toBe('fondo');
  });
});

// ── diasAlProximoApartado (DIS.18) ───────────────────────────────

describe('diasAlProximoApartado', () => {
  it('devuelve los días al apartado con la fecha más cercana', () => {
    const dias = diasAlProximoApartado([
      { fechaObjetivo: '2026-09-10' },
      { fechaObjetivo: '2026-08-20' },
    ], '2026-08-01');
    expect(dias).toBe(19);
  });

  it('ignora los apartados sin fecha y los inactivos', () => {
    const dias = diasAlProximoApartado([
      { fechaObjetivo: '2026-08-05', activo: false },
      { montoActual: 100 },
      { fechaObjetivo: '2026-08-30' },
    ], '2026-08-01');
    expect(dias).toBe(29);
  });

  it('devuelve negativo si el más próximo ya venció', () => {
    expect(diasAlProximoApartado([{ fechaObjetivo: '2026-07-25' }], '2026-08-01')).toBe(-7);
  });

  it('devuelve null sin fechas, sin lista o con hoy inválido', () => {
    expect(diasAlProximoApartado([{ montoActual: 5 }], '2026-08-01')).toBe(null);
    expect(diasAlProximoApartado(null, '2026-08-01')).toBe(null);
    expect(diasAlProximoApartado([{ fechaObjetivo: '2026-08-05' }], 'ayer')).toBe(null);
  });
});

// ── calcularAporteSugerido (AH.2) ────────────────────────────────

describe('calcularAporteSugerido (AH.2)', () => {
  it('fondo completo: monto 0, base completo', () => {
    const r = calcularAporteSugerido({ faltanteFondo: 0, ingresosMensuales: 2_000_000 });
    expect(r.monto).toBe(0);
    expect(r.base).toBe('completo');
    expect(r.meses).toBe(0);
    expect(r.razones[0]).toMatch(/completo/i);
  });

  it('sin ingresos: sugiere faltante/12 y pide el promedio mensual', () => {
    // 2.400.000 / 12 = 200.000
    const r = calcularAporteSugerido({ faltanteFondo: 2_400_000, ingresosMensuales: 0 });
    expect(r.monto).toBe(200_000);
    expect(r.base).toBe('sin-ingreso');
    expect(r.meses).toBe(HORIZONTE_FONDO_MESES);
    expect(r.razones.join(' ')).toMatch(/cuánto recibes al mes/i);
  });

  it('redondea el ritmo hacia arriba a miles', () => {
    // 1.000.000 / 12 = 83.333,3 → 84.000
    const r = calcularAporteSugerido({ faltanteFondo: 1_000_000, ingresosMensuales: 0 });
    expect(r.monto).toBe(84_000);
  });

  it('con margen holgado sugiere el ritmo de 12 meses y explica por qué alcanza', () => {
    // Ingreso 3M, fijos 1M, cuotas 200k → margen 1.8M; piso EV 300k;
    // capacidad 1.5M ≥ ritmo 200k → base meta.
    const r = calcularAporteSugerido({
      faltanteFondo: 2_400_000,
      ingresosMensuales: 3_000_000,
      gastosFijosMensuales: 1_000_000,
      cuotasDeudaMensuales: 200_000,
    });
    expect(r.monto).toBe(200_000);
    expect(r.base).toBe('meta');
    expect(r.meses).toBe(12);
    expect(r.razones.join(' ')).toMatch(/te alcanza/i);
    expect(r.razones.join(' ')).toContain('$3.000.000');
  });

  it('las otras metas con fecha reducen la capacidad disponible', () => {
    // Ingreso 2M, fijos 1M → margen 1M; piso EV 200k; objetivos 700k
    // → capacidad 100k < ritmo 200k, y 100k ≥ piso ahorro (100k) → base capacidad.
    const r = calcularAporteSugerido({
      faltanteFondo: 2_400_000,
      ingresosMensuales: 2_000_000,
      gastosFijosMensuales: 1_000_000,
      aporteMensualObjetivos: 700_000,
    });
    expect(r.base).toBe('capacidad');
    expect(r.monto).toBe(100_000);
    expect(r.meses).toBe(24);
    expect(r.razones.join(' ')).toMatch(/otras metas con fecha/i);
  });

  it('margen corto: parte proporcional del piso de ahorro (margen/3)', () => {
    // Ingreso 2M, fijos 1.7M, cuotas 150k → margen 150k; piso EV 200k
    // → capacidad negativa → piso: 150k × 5/15 = 50.000.
    const r = calcularAporteSugerido({
      faltanteFondo: 2_400_000,
      ingresosMensuales: 2_000_000,
      gastosFijosMensuales: 1_700_000,
      cuotasDeudaMensuales: 150_000,
    });
    expect(r.base).toBe('piso');
    expect(r.monto).toBe(50_000);
    expect(r.razones.join(' ')).toMatch(/apretado/i);
  });

  it('sin margen: monto 0 y la verdad, sin inventar porcentaje', () => {
    const r = calcularAporteSugerido({
      faltanteFondo: 2_400_000,
      ingresosMensuales: 1_500_000,
      gastosFijosMensuales: 1_200_000,
      cuotasDeudaMensuales: 400_000,
    });
    expect(r.monto).toBe(0);
    expect(r.base).toBe('deficit');
    expect(r.meses).toBeNull();
    expect(r.razones.join(' ')).toMatch(/igualan o superan/i);
  });

  it('con más de 36 meses de plazo no promete fechas: invita a recortar', () => {
    // Ingreso 2M, fijos 1M → margen 1M; piso EV 200k; objetivos 700k
    // → capacidad 100k; faltante 6M → 60 meses.
    const r = calcularAporteSugerido({
      faltanteFondo: 6_000_000,
      ingresosMensuales: 2_000_000,
      gastosFijosMensuales: 1_000_000,
      aporteMensualObjetivos: 700_000,
    });
    expect(r.base).toBe('capacidad');
    expect(r.razones.join(' ')).toMatch(/más de 3 años/i);
  });

  it('inputs vacíos o inválidos degradan con gracia', () => {
    const r = calcularAporteSugerido();
    expect(r.base).toBe('completo');
    const r2 = calcularAporteSugerido({ faltanteFondo: NaN, ingresosMensuales: 'abc' });
    expect(r2.base).toBe('completo');
  });
});

// ── BUG-012: aviso de desactivar el fondo, sin jerga técnica ─────

describe('BUG-012: desactivar el fondo no muestra jerga técnica', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    S.ahorro = { fondoEmergencia: { activo: true, metaMeses: 3, montoActual: 0 }, aportes: [] };
    initAhorro();
  });

  it('el mensaje de confirmación no contiene el literal "empty state"', () => {
    dispatch({ dataset: { action: 'ahorro-desactivar' } }, { preventDefault: () => {} });
    const mensaje = document.querySelector('.confirm__mensaje')?.textContent ?? '';
    expect(mensaje.toLowerCase()).not.toContain('empty state');
    expect(mensaje).toContain('pantalla inicial');
  });
});

// ── renderFormAporte() - monto prellenado (AH.5a) ────────────────

describe('renderFormAporte() - monto prellenado con el aporte sugerido', () => {
  it('sin sugerencia el campo queda vacío, como antes', () => {
    const html = renderFormAporte({ fecha: '2026-07-21', sugerencia: null });
    expect(html).not.toMatch(/id="aporte-monto"[^>]*value=/);
    expect(html).not.toContain('Prellenado con lo que te conviene apartar');
  });

  it('con sugerencia > 0 prellena el value del campo, editable', () => {
    const html = renderFormAporte({ fecha: '2026-07-21', sugerencia: { monto: 150_000, base: 'meta' } });
    expect(html).toMatch(/id="aporte-monto"[^>]*value="150000"/);
    expect(html).not.toContain('readonly');
    expect(html).not.toContain('disabled');
    expect(html).toContain('Prellenado con lo que te conviene apartar este mes');
    expect(html).toContain('Puedes cambiarlo');
  });

  it('sigue explicando que el aporte no descuenta cuentas, prellenado o no', () => {
    const conSugerencia = renderFormAporte({ fecha: '2026-07-21', sugerencia: { monto: 150_000, base: 'meta' } });
    const sinSugerencia = renderFormAporte({ fecha: '2026-07-21', sugerencia: null });
    expect(conSugerencia).toContain('no descuenta tus cuentas');
    expect(sinSugerencia).toContain('no descuenta tus cuentas');
  });

  it('sugerencia con monto 0 (fondo completo o déficit) no prellena ni muestra el hint', () => {
    const html = renderFormAporte({ fecha: '2026-07-21', sugerencia: { monto: 0, base: 'completo' } });
    expect(html).not.toMatch(/id="aporte-monto"[^>]*value=/);
    expect(html).not.toContain('Prellenado con lo que te conviene apartar');
  });
});

// ── AH.5a: el handler real llega prellenado (fondo activo con gastos fijos) ─

describe('AH.5a: "Registrar aporte" abre el form ya prellenado', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div class="modal-overlay" id="modal-ahorro">
        <h2 class="modal__title"></h2>
        <div class="modal__body" id="modal-ahorro-body"></div>
      </div>`;
    S.compromisos = [{ id: 'f1', tipo: 'fijo', activo: true, monto: 500_000, frecuencia: 'Mensual' }];
    S.ingresos = [];
    S.gastos = [];
    S.ahorro = { fondoEmergencia: { activo: true, metaMeses: 3, montoActual: 0 }, aportes: [] };
    initAhorro();
  });

  it('con el fondo activo y gastos fijos registrados, el campo de monto no llega vacío', () => {
    dispatch({ dataset: { action: 'ahorro-nuevo-aporte' } }, { preventDefault: () => {} });
    const input = document.getElementById('aporte-monto');
    expect(input).not.toBeNull();
    expect(Number(input.value)).toBeGreaterThan(0);
  });

  it('el monto prellenado sigue siendo editable', () => {
    dispatch({ dataset: { action: 'ahorro-nuevo-aporte' } }, { preventDefault: () => {} });
    const input = document.getElementById('aporte-monto');
    expect(input.readOnly).toBe(false);
    expect(input.disabled).toBe(false);
  });
});

// ── DIS.12: auditoría de diseño de Fondo de emergencia ───────────
// Hallazgos A1 a A9 del informe "Auditoría Fondo de emergencia". Todo es
// markup y CSS: ni logic.js ni el schema cambian.

// DIS.19 (items 1 y 2) reescribe la casa: las cuatro filas de monto y estado en
// texto pasan a cuatro carriles con su grafico propio. Los hallazgos A2 (nada de
// emoji del sistema) y A8 (el enlace de 18px) del informe de DIS.12 siguen
// verificados aca: el simbolo del sprite viaja al encabezado del carril y el
// enlace "Ver todo" cumple los 44px de la regla R4.
describe('DIS.19 - el hub de cuatro carriles', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="panel-casa-ahorro"></div>';
    S.config       = {};
    S.ahorro       = { fondoEmergencia: { activo: true, metaMeses: 3, montoActual: 2_000_000 }, aportes: [] };
    S.metas        = [{ id: 'm1', nombre: 'Viaje', categoria: 'Viajes', montoObjetivo: 4_000_000, montoActual: 1_000_000 }];
    S.apartados    = [{ id: 'a1', nombre: 'SOAT', icono: 'c-carro', montoObjetivo: 1_200_000, montoActual: 600_000,
                        fechaObjetivo: '2026-12-31', fechaCreacion: '2026-01-01T00:00:00.000Z', frecuenciaAporte: 'Mensual' }];
    S.inversiones  = [{ id: 'i1', nombre: 'CDT', tipo: 'CDT', monto: 400_000, tasaEA: 10, plazoMeses: 12 }];
    renderCasaAhorro(1_000_000);
  });

  it('dibuja los cuatro carriles, en el orden del momento de uso', () => {
    const ids = [...document.querySelectorAll('.lane')].map(l => l.id);
    expect(ids).toEqual(['carril-fondo', 'carril-apartados', 'carril-metas', 'carril-inversiones']);
  });

  it('cada carril encabeza con cuándo se usa ese dinero, encima del nombre', () => {
    const primero = document.querySelector('.lane');
    expect(primero.querySelector('.lane__cuando').textContent.trim()).toBe('Ojalá nunca lo uses');
    expect(primero.querySelector('.lane__nombre').textContent).toContain('Fondo de emergencia');
  });

  it('cada carril mide en su propia unidad: cuatro gráficos distintos', () => {
    expect(document.querySelector('#carril-fondo .cov')).not.toBeNull();
    expect(document.querySelector('#carril-apartados .cmp')).not.toBeNull();
    expect(document.querySelector('#carril-metas .silrow')).not.toBeNull();
    expect(document.querySelector('#carril-inversiones .grow')).not.toBeNull();
  });

  it('el total baja al pie en una línea, ya no es la cifra grande de la pantalla', () => {
    const total = document.querySelector('.hub__total');
    expect(total.textContent).toContain('Todo lo que tienes guardado');
    expect(total.textContent).toContain('$4.000.000');
    // La vieja cabecera con el total en grande ya no existe.
    expect(document.querySelector('.casa-ahorro__valor')).toBeNull();
  });

  it('A2: ninguna modalidad se identifica con un emoji del sistema operativo', () => {
    expect(document.body.innerHTML).not.toMatch(/\u{1F6E1}|\u{1F3AF}|\u{1F4E6}|\u{1F4C8}/u);
  });

  it('A2: cada carril usa el símbolo del sprite que le corresponde', () => {
    const usos = [...document.querySelectorAll('.lane__ico use')].map(u => u.getAttribute('href'));
    expect(usos).toEqual(['#i-ahorro', '#i-apartados', '#i-metas', '#i-inversion']);
  });

  it('el carril declara su dominio, que es de donde el CSS toma el acento', () => {
    const doms = [...document.querySelectorAll('.lane')].map(l => l.dataset.dom);
    expect(doms).toEqual(['ahorro', 'ahorro', 'metas', 'inversion']);
  });

  it('A8: "Ver todo" lleva a la sección y ya no es un enlace de 18px', () => {
    const vers = [...document.querySelectorAll('.lane__ver')];
    expect(vers.map(a => a.getAttribute('href'))).toEqual(['#fondo', '#apartados', '#metas', '#inversion']);
    expect(vers[0].getAttribute('aria-label')).toContain('Fondo de emergencia');
  });

  it('el gráfico va aria-hidden y el estado en palabras vive en el encabezado', () => {
    expect(document.querySelector('#carril-fondo .cov').getAttribute('aria-hidden')).toBe('true');
    expect(document.querySelector('#carril-fondo .lane__estado').textContent)
      .toContain('2 meses cubiertos');
  });

  it('los chips saltan de carril con acción, no con hash: el router no los conoce', () => {
    const chips = [...document.querySelectorAll('.hub .chip')];
    expect(chips).toHaveLength(4);
    expect(chips.every(c => c.tagName === 'BUTTON')).toBe(true);
    expect(chips.map(c => c.dataset.action)).toEqual(Array(4).fill('ahorro-ir-a-carril'));
    expect(chips.map(c => c.dataset.id)).toEqual(['fondo', 'apartados', 'metas', 'inversiones']);
  });

  it('la columna de un apartado es el aporte a ese apartado: un toque, no dos', () => {
    const col = document.querySelector('#carril-apartados .cmp__col');
    expect(col.tagName).toBe('BUTTON');
    expect(col.dataset.action).toBe('aportar-apartado');
    expect(col.dataset.id).toBe('a1');
    expect(col.getAttribute('aria-label')).toContain('Aportar a SOAT');
  });

  it('la silueta de una meta es el aporte a esa meta, y se llena con su avance', () => {
    const btn = document.querySelector('#carril-metas .silbtn');
    expect(btn.dataset.action).toBe('abonar-meta');
    expect(btn.dataset.id).toBe('m1');
    expect(btn.querySelector('.silbtn__pct').textContent).toBe('25%');
    expect(btn.querySelector('.silueta__llena')).not.toBeNull();
  });

  it('cada silueta del carril recorta con su propio id, aparte del de la sección Metas', () => {
    const id = document.querySelector('#carril-metas clipPath').getAttribute('id');
    expect(id).toBe('silueta-carril-m1');
  });

  it('el carril de Inversión dice cuánto le suma el tiempo', () => {
    expect(document.querySelector('#carril-inversiones .grow__seg--tiempo')).not.toBeNull();
    expect(document.querySelector('#carril-inversiones .lane__hint').textContent)
      .toContain('El tiempo le suma');
  });

  it('respeta el ojo de privacidad: ni el total ni los montos tocan el DOM', () => {
    S.config = { ocultarSaldo: true };
    renderCasaAhorro(1_000_000);
    expect(document.querySelector('#casa-ahorro-total').textContent).toBe(SALDO_MASCARA_CUENTA);
    expect(document.body.innerHTML).not.toContain('4.000.000');
  });
});

describe('DIS.19 - los carriles en cero nombran el primer paso', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="panel-casa-ahorro"></div>';
    S.config      = {};
    S.ahorro      = { fondoEmergencia: { activo: false }, aportes: [] };
    S.metas       = [];
    S.apartados   = [];
    S.inversiones = [];
    renderCasaAhorro(1_000_000);
  });

  it('los cuatro carriles siguen ahí: una modalidad que no aparece no se descubre', () => {
    expect(document.querySelectorAll('.lane')).toHaveLength(4);
  });

  it('ningún carril en cero muestra un gráfico vacío: muestra qué hace y cómo empezar', () => {
    expect(document.querySelectorAll('.cov')).toHaveLength(0);
    expect(document.querySelectorAll('.cmp')).toHaveLength(0);
    expect(document.querySelectorAll('.silrow')).toHaveLength(0);
    expect(document.querySelectorAll('.grow')).toHaveLength(0);
    expect(document.querySelectorAll('.lane__nota')).toHaveLength(4);
  });

  it('cada carril en cero ofrece su primer paso con la acción de su dominio', () => {
    const acciones = [...document.querySelectorAll('.lane__cta')].map(b => b.dataset.action);
    expect(acciones).toEqual([
      'ahorro-activar-fondo', 'nuevo-apartado', 'nueva-meta', 'inversion-nueva',
    ]);
  });

  it('ninguna cifra grande dice $0: el total al pie es la única cifra', () => {
    expect(document.querySelector('.hub__total').textContent).toContain('$0');
    expect(document.querySelectorAll('.hub__total')).toHaveLength(1);
  });
});

describe('DIS.19 - el carril del fondo sin gastos fijos registrados', () => {
  it('no dibuja la franja y pide el dato que falta, en vez de una franja vacía', () => {
    document.body.innerHTML = '<div id="panel-casa-ahorro"></div>';
    S.config      = {};
    S.ahorro      = { fondoEmergencia: { activo: true, metaMeses: 3, montoActual: 500_000 }, aportes: [] };
    S.metas       = [];
    S.apartados   = [];
    S.inversiones = [];
    renderCasaAhorro(0);
    expect(document.querySelector('#carril-fondo .cov')).toBeNull();
    expect(document.querySelector('#carril-fondo .lane__nota').textContent)
      .toContain('Registra tus gastos fijos');
  });
});

// DIS.16: el anillo de progreso se retiró de esta sección. El hallazgo A4 de
// DIS.12 (el contenedor que ocultaba su propio subárbol) deja de aplicar porque
// deja de haber contenedor: el porcentaje es ahora un rótulo de texto al pie de
// los bloques, que ningún `aria-hidden` envuelve.
describe('DIS.16 - la tarjeta del fondo ya no usa anillo', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="panel-ahorro"></div>';
    S.config = {};
    S.ahorro = { fondoEmergencia: { activo: true, metaMeses: 3, montoActual: 1_800_000 }, aportes: [] };
    renderAhorro(1_000_000, null, null);
  });

  it('no queda ningún anillo de progreso en la sección', () => {
    expect(document.querySelector('.progress-ring')).toBeNull();
    expect(document.querySelector('.progress-ring-wrap')).toBeNull();
  });

  // DIS.19 (item 6): el pie deja el porcentaje y pasa a decir el tiempo cubierto
  // y lo guardado. El porcentaje era el ultimo resto de la medida vieja, y la
  // seccion se mide en tiempo desde DIS.16.
  it('el pie de la franja dice el tiempo cubierto y lo guardado, sin aria-hidden encima', () => {
    const pie = document.querySelector('.cov__pie');
    expect(pie.textContent).toContain('1 mes y 3 semanas de 3 meses');
    expect(pie.textContent).toContain('$1.800.000');
    expect(pie.textContent).not.toContain('60%');
    expect(pie.closest('[aria-hidden="true"]')).toBeNull();
  });
});

describe('DIS.12 - lista de aportes y compromiso (A5, A6)', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="panel-ahorro"></div>';
    S.ahorro = {
      fondoEmergencia:   { activo: true, metaMeses: 3, montoActual: 1_000_000 },
      compromisoMensual: 250_000,
      aportes: [
        { id: 'ap1', monto: 250_000, fecha: '2026-07-22' },
        { id: 'ap2', monto: 184_000, fecha: '2026-07-15', nota: 'Distribución de ingreso' },
      ],
    };
    renderAhorro(1_000_000, null, null);
  });

  it('A5: el título de la fila es la fecha, no el monto', () => {
    const primera = document.querySelector('.ahorro-habito__lista .list-item');
    expect(primera.querySelector('.list-item__title').textContent).toMatch(/22 de julio/i);
    expect(primera.querySelector('.list-item__title').textContent).not.toContain('$');
  });

  it('A5: el monto vive en su columna derecha, como en el resto de las listas', () => {
    const montos = [...document.querySelectorAll('.ahorro-habito__lista .list-item__meta .list-item__amount')]
      .map(p => p.textContent);
    expect(montos).toEqual(['+$250.000', '+$184.000']);
  });

  it('A5: la fila tiene teja de identidad y la nota baja a subtítulo', () => {
    const filas = [...document.querySelectorAll('.ahorro-habito__lista .list-item')];
    expect(filas[0].querySelector('.list-item__icon .cat-teja')).not.toBeNull();
    expect(filas[0].querySelector('.list-item__subtitle').textContent).toBe('Aporte al fondo');
    expect(filas[1].querySelector('.list-item__subtitle').textContent).toBe('Distribución de ingreso');
  });

  // DIS.19 (item 7): la fila de texto pasa a medidor, asi que el simbolo de
  // recurrencia sale con ella. Lo que A6 vino a evitar sigue en pie: el
  // compromiso no toma prestado el simbolo de Deudas en ninguna parte.
  it('A6: el compromiso mensual no toma prestado el símbolo de Deudas', () => {
    const bloque = document.querySelector('.ahorro-habito__compromiso');
    expect(bloque.innerHTML).not.toContain('#i-deudas');
  });

  it('el compromiso se mide con la gota, no se informa con una fila de texto', () => {
    const bloque = document.querySelector('.ahorro-habito__compromiso');
    expect(bloque.querySelector('.liq .silueta')).not.toBeNull();
    expect(bloque.querySelector('.liq__pct').textContent).toBe('100%');
    expect(bloque.querySelector('.ahorro-habito__compromiso-nota').textContent)
      .toContain('El 1 vuelve a empezar');
  });
});

describe('DIS.12 - rol ARIA del aviso de tasa (A7)', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="panel-ahorro"></div>';
    S.ahorro = { fondoEmergencia: { activo: true, metaMeses: 3, montoActual: 1_000_000 }, aportes: [] };
  });

  it('el nivel alto (gastos por encima de ingresos) interrumpe: role="alert"', () => {
    renderAhorro(1_000_000, -12, null);
    expect(document.querySelector('.nudge-high').getAttribute('role')).toBe('alert');
  });

  it('los demás niveles siguen siendo avisos corteses: role="status"', () => {
    renderAhorro(1_000_000, 25, null);
    expect(document.querySelector('.nudge-success').getAttribute('role')).toBe('status');
  });
});

describe('DIS.12 - formulario del fondo (A3)', () => {
  const opts = { metaMeses: 3, montoActual: 1_800_000, gastosFijosMensuales: 1_000_000 };

  it('al editar, Cancelar vuelve a su sitio en el pie del formulario', () => {
    const html = renderFormFondo({ editando: true, ...opts });
    expect(html).toMatch(/<div class="modal__footer">[\s\S]*data-action="modal-close"[\s\S]*Cancelar/);
  });

  it('al editar, desactivar baja a su propia fila y viste btn-danger', () => {
    const html = renderFormFondo({ editando: true, ...opts });
    expect(html).toContain('modal__footer-secundario');
    expect(html).toMatch(/class="btn btn-danger btn-sm" data-action="ahorro-desactivar"/);
    expect(html).not.toMatch(/btn-ghost" data-action="ahorro-desactivar"/);
  });

  it('al activar no hay acción destructiva: solo Cancelar y el primario', () => {
    const html = renderFormFondo({ editando: false, ...opts });
    expect(html).not.toContain('modal__footer-secundario');
    expect(html).not.toContain('ahorro-desactivar');
    expect(html).toContain('Activar fondo');
  });
});

// ════════════════════════════════════════════════════════════════
// DIS.16 - arquitectura I con la prueba de H
// ════════════════════════════════════════════════════════════════

describe('nivelesFondo()', () => {
  it('los tres niveles son fijos: 1, 3 y 6 meses', () => {
    expect(NIVELES_FONDO.map(n => n.meses)).toEqual([1, 3, 6]);
  });

  it('sin nada cubierto, el primero es el actual y los otros dos quedan lejos', () => {
    const n = nivelesFondo(0);
    expect(n.map(x => x.estado)).toEqual(['actual', 'lejano', 'lejano']);
    expect(n[0].pct).toBe(0);
  });

  it('el porcentaje del nivel en curso es relativo a su tramo, no al objetivo', () => {
    // 1,8 meses: el primer nivel está logrado y del tramo 1 a 3 lleva el 40%.
    const n = nivelesFondo(1.8);
    expect(n[0].estado).toBe('logrado');
    expect(n[1].estado).toBe('actual');
    expect(n[1].pct).toBe(40);
    expect(n[2].estado).toBe('lejano');
  });

  it('un nivel logrado no se retira aunque falte mucho para el siguiente', () => {
    expect(nivelesFondo(1).map(x => x.estado)).toEqual(['logrado', 'actual', 'lejano']);
  });

  it('con seis meses cubiertos los tres quedan logrados y no hay actual', () => {
    const n = nivelesFondo(6);
    expect(n.every(x => x.estado === 'logrado')).toBe(true);
  });

  it('lectura defensiva: null o negativo se tratan como cero', () => {
    expect(nivelesFondo(null)[0].estado).toBe('actual');
    expect(nivelesFondo(-3)[0].pct).toBe(0);
  });
});

describe('mesesEnPalabras()', () => {
  it('1,8 se dice "1 mes y 3 semanas", no en decimales', () => {
    expect(mesesEnPalabras(1.8)).toBe('1 mes y 3 semanas');
  });

  it('un entero no arrastra semanas', () => {
    expect(mesesEnPalabras(3)).toBe('3 meses');
    expect(mesesEnPalabras(1)).toBe('1 mes');
  });

  it('menos de un mes se dice solo en semanas', () => {
    expect(mesesEnPalabras(0.5)).toBe('2 semanas');
    expect(mesesEnPalabras(0.25)).toBe('1 semana');
  });

  it('una fracción que redondea a cuatro semanas sube el mes', () => {
    expect(mesesEnPalabras(1.95)).toBe('2 meses');
  });

  it('una cobertura mínima no dice "0"', () => {
    expect(mesesEnPalabras(0.05)).toBe('menos de una semana');
  });

  it('cero y lo no calculable dicen "0 meses"', () => {
    expect(mesesEnPalabras(0)).toBe('0 meses');
    expect(mesesEnPalabras(null)).toBe('0 meses');
  });
});

describe('fechaCobertura()', () => {
  it('traduce los meses cubiertos a un día concreto del calendario', () => {
    expect(fechaCobertura(1, '2026-07-28')).toBe('2026-08-27');
  });

  it('más cobertura, fecha más lejana: cada aporte mueve la fecha', () => {
    const antes   = fechaCobertura(1, '2026-07-28');
    const despues = fechaCobertura(1.8, '2026-07-28');
    expect(despues > antes).toBe(true);
  });

  it('sin cobertura no hay fecha que datar', () => {
    expect(fechaCobertura(0, '2026-07-28')).toBeNull();
    expect(fechaCobertura(null, '2026-07-28')).toBeNull();
    expect(fechaCobertura(2, 'no-es-fecha')).toBeNull();
  });
});

describe('bloquesCobertura()', () => {
  it('dibuja tantos bloques como meses de meta, desde el mes actual', () => {
    const b = bloquesCobertura(1.8, 3, '2026-07-28');
    expect(b).toHaveLength(3);
    expect(b.map(x => x.mesISO)).toEqual(['2026-07-01', '2026-08-01', '2026-09-01']);
  });

  it('el relleno se reparte mes a mes: entero, parcial y vacío', () => {
    expect(bloquesCobertura(1.8, 3, '2026-07-28').map(x => x.pct)).toEqual([100, 80, 0]);
  });

  it('en cero todos los bloques van vacíos', () => {
    expect(bloquesCobertura(0, 3, '2026-07-28').map(x => x.pct)).toEqual([0, 0, 0]);
  });

  it('cubierto de sobra, ningún bloque pasa de lleno', () => {
    expect(bloquesCobertura(9, 3, '2026-07-28').map(x => x.pct)).toEqual([100, 100, 100]);
  });

  it('cruza el fin de año sin saltarse meses', () => {
    const b = bloquesCobertura(1, 3, '2026-11-15');
    expect(b.map(x => x.mesISO)).toEqual(['2026-11-01', '2026-12-01', '2027-01-01']);
  });

  it('sin meta válida no hay bloques', () => {
    expect(bloquesCobertura(2, 0, '2026-07-28')).toEqual([]);
  });
});

describe('renderAhorro() - tarjeta del fondo (DIS.16)', () => {
  const textoDatos = () =>
    [...document.querySelectorAll('.fondo-card__dato')].map(p => p.textContent).join(' | ');

  beforeEach(() => {
    document.body.innerHTML = '<div id="panel-ahorro"></div>';
    S.config = {};
    S.ahorro = { fondoEmergencia: { activo: true, metaMeses: 3, montoActual: 1_800_000 }, aportes: [], compromisoMensual: 0 };
  });

  it('el dato protagonista es el nivel alcanzado, no el monto', () => {
    renderAhorro(1_000_000, null, null);
    expect(document.querySelector('.fondo-card__kicker').textContent).toContain('Ya tienes');
    expect(document.querySelector('.fondo-card__nivel-nombre').textContent).toBe('Un mes cubierto');
  });

  // DIS.19 (item 6): la franja llega hasta el ultimo nivel (6 meses) aunque la
  // meta sea de 3, porque el eje rotula los niveles y "seis meses" sobre una
  // franja de tres caeria fuera del dibujo.
  it('la cobertura se prueba con la franja de meses y una fecha hipotética', () => {
    renderAhorro(1_000_000, null, null);
    expect(document.querySelectorAll('.cov__mes')).toHaveLength(6);
    expect(document.querySelector('.fondo-card__frase').textContent).toContain('Si hoy dejaras de recibir ingresos');
  });

  it('los meses sin nada cubierto se dibujan igual, con contorno: la franja es la promesa', () => {
    renderAhorro(1_000_000, null, null);
    const futuros = [...document.querySelectorAll('.cov__mes')].filter(b => b.className.includes('--futuro'));
    // 1,8 meses cubiertos: los dos primeros bloques llevan relleno y los cuatro
    // restantes son promesa.
    expect(futuros).toHaveLength(4);
  });

  it('los meses cubiertos se dicen en palabras, sin decimales', () => {
    renderAhorro(1_000_000, null, null);
    const pie = document.querySelector('.cov__pie').textContent;
    expect(pie).toContain('1 mes y 3 semanas de 3 meses');
    expect(pie).not.toContain('1,8');
  });

  it('los tres niveles rotulan el eje, y el logrado se distingue del que falta', () => {
    renderAhorro(1_000_000, null, null);
    const niveles = [...document.querySelectorAll('.cov__nivel')];
    expect(niveles.map(n => n.textContent)).toEqual(['un mes', 'tres meses', 'seis meses']);
    expect(niveles[0].className).toContain('--logrado');
    expect(niveles[1].className).toContain('--actual');
    expect(niveles[2].className).toContain('--lejano');
  });

  it('la lista de niveles ya no vive aparte en la tarjeta activa', () => {
    renderAhorro(1_000_000, null, null);
    expect(document.querySelector('.fondo-card__nivel-fila')).toBeNull();
  });

  it('con la meta cubierta el pie no repite la cifra: dice completos', () => {
    S.ahorro.fondoEmergencia.montoActual = 3_000_000;
    renderAhorro(1_000_000, null, null);
    const pie = document.querySelector('.cov__pie').textContent;
    expect(pie).toContain('3 meses completos');
    expect(pie).not.toContain('3 meses de 3 meses');
    expect(pie).toContain('$3.000.000');
  });

  it('con la meta cumplida el siguiente nivel sigue a la vista: la tarjeta no se apaga', () => {
    S.ahorro.fondoEmergencia.montoActual = 3_000_000;
    renderAhorro(1_000_000, null, null);
    expect(document.querySelector('.fondo-card__kicker').textContent).toContain('Lo lograste');
    const niveles = [...document.querySelectorAll('.cov__nivel')];
    expect(niveles[1].className).toContain('--logrado');
    expect(niveles[2].className).toContain('--actual');
    expect(document.querySelector('.fondo-card__veredicto').textContent).toContain('Cumpliste tu meta');
  });

  it('con la meta cumplida la acción secundaria ofrece subirla y nombra el destino', () => {
    S.ahorro.fondoEmergencia.montoActual = 3_000_000;
    renderAhorro(1_000_000, null, null);
    expect(document.querySelector('.fondo-card__secundaria').textContent).toContain('Subir mi meta a 6 meses');
  });

  it('con la meta ya en el último nivel la secundaria vuelve a ser Editar', () => {
    S.ahorro.fondoEmergencia.metaMeses   = 6;
    S.ahorro.fondoEmergencia.montoActual = 6_000_000;
    renderAhorro(1_000_000, null, null);
    expect(document.querySelector('.fondo-card__secundaria').textContent.trim()).toBe('Editar');
  });

  it('en cero se nombra el nivel al que va, no "0 meses"', () => {
    S.ahorro.fondoEmergencia.montoActual = 0;
    renderAhorro(1_000_000, null, null);
    expect(document.querySelector('.fondo-card__kicker').textContent).toContain('Vas a empezar');
    expect(document.querySelector('.fondo-card__nivel-nombre').textContent).toBe('Tu primer mes');
    expect(document.querySelector('.fondo-card__frase').textContent).toContain('Todavía no tienes días cubiertos');
    expect(document.querySelector('.fondo-card__principal').textContent).toContain('Hacer mi primer aporte');
  });

  it('en cero el primer nivel es el que sigue, y ninguno aparece logrado', () => {
    S.ahorro.fondoEmergencia.montoActual = 0;
    renderAhorro(1_000_000, null, null);
    const niveles = [...document.querySelectorAll('.cov__nivel')];
    expect(niveles[0].className).toContain('--actual');
    expect(document.querySelector('.cov__nivel--logrado')).toBeNull();
    // Ningun bloque con relleno: la franja completa es promesa.
    expect([...document.querySelectorAll('.cov__mes')].every(b => b.className.includes('--futuro'))).toBe(true);
  });

  it('en cero el veredicto apunta al primer nivel, no a la meta completa', () => {
    S.ahorro.fondoEmergencia.montoActual = 0;
    renderAhorro(1_000_000, null, { monto: 200_000, meses: 15 });
    const veredicto = document.querySelector('.fondo-card__veredicto').textContent;
    expect(veredicto).toContain('llegas a tu primer nivel');
    expect(veredicto).toContain('$200.000');
    // 1 mes de colchón son $1.000.000: a $200.000 al mes, 5 meses.
    expect(veredicto).toContain('en 5 meses');
    expect(veredicto).not.toContain('Te faltan');
  });

  it('en cero y sin sugerencia, el veredicto igual dice cuánto cuesta el primer nivel', () => {
    S.ahorro.fondoEmergencia.montoActual = 0;
    renderAhorro(1_000_000, null, null);
    expect(document.querySelector('.fondo-card__veredicto').textContent)
      .toContain('Tu primer nivel son $1.000.000');
  });

  it('en cero el objetivo se dice como meta, no como "tienes $0 de"', () => {
    S.ahorro.fondoEmergencia.montoActual = 0;
    renderAhorro(1_000_000, null, null);
    const datos = textoDatos();
    expect(datos).toContain('Tu meta es cubrir 3 meses: hoy son $3.000.000');
    expect(datos).not.toContain('Tienes $0');
  });

  it('sin gastos fijos registrados no inventa cobertura', () => {
    renderAhorro(0, null, null);
    expect(document.querySelector('.fondo-card__bloque')).toBeNull();
    expect(document.querySelector('.fondo-card__frase').textContent).toContain('Registra tus gastos fijos');
  });

  it('el hábito se dice sin porcentajes que obliguen a una cuenta mental', () => {
    S.ahorro.compromisoMensual = 250_000;
    renderAhorro(1_000_000, 23, null);
    expect(textoDatos()).toContain('Te propusiste guardar $250.000 cada mes');
    expect(textoDatos()).toContain('de cada $100 que recibes, guardas $23');
  });

  it('la nota del ADR 009 se conserva: el dinero no se mueve', () => {
    renderAhorro(1_000_000, null, null);
    expect(document.querySelector('.fondo-card__nota').textContent).toContain('sigue en tus cuentas');
  });

  // Regla R20: el ojo esconde pesos, no progreso.
  it('con el saldo oculto enmascara los pesos y conserva nivel, bloques y fecha', () => {
    S.config = { ocultarSaldo: true };
    S.ahorro.compromisoMensual = 250_000;
    renderAhorro(1_000_000, 23, null);
    expect(textoDatos()).not.toContain('1.800.000');
    expect(textoDatos()).not.toContain('3.000.000');
    expect(document.querySelector('.fondo-card__nivel-nombre').textContent).toBe('Un mes cubierto');
    expect(document.querySelectorAll('.cov__mes')).toHaveLength(6);
    // El tiempo cubierto no es una magnitud de dinero, asi que no se enmascara;
    // el monto del pie si.
    expect(document.querySelector('.cov__pie').textContent).toContain('1 mes y 3 semanas de 3 meses');
    // Una proporción no revela cuánto dinero hay.
    expect(textoDatos()).toContain('guardas $23');
  });

  it('sin el flag activo los montos se ven completos', () => {
    renderAhorro(1_000_000, null, null);
    expect(textoDatos()).toContain('1.800.000');
  });

  it('el botón de registrar vive solo en la tarjeta, no también en el encabezado de aportes', () => {
    renderAhorro(1_000_000, null, null);
    expect(document.querySelectorAll('[data-action="ahorro-nuevo-aporte"]')).toHaveLength(1);
    expect(document.querySelector('.fondo-card__principal').dataset.action).toBe('ahorro-nuevo-aporte');
  });
});

describe('renderAhorro() - sin fondo activo (DIS.16, estado 1)', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="panel-ahorro"></div>';
    S.config = {};
    S.ahorro = { fondoEmergencia: { activo: false, metaMeses: 3, montoActual: 0 }, aportes: [] };
  });

  it('los tres niveles se ven desde el primer momento, apagados', () => {
    renderAhorro(1_000_000, null, null);
    const filas = [...document.querySelectorAll('.fondo-card__nivel-fila')];
    expect(filas).toHaveLength(3);
    expect(filas.every(f => f.className.includes('--lejano'))).toBe(true);
  });

  it('traduce el primer nivel a pesos para que la decisión no se tome a ciegas', () => {
    renderAhorro(1_000_000, null, null);
    expect(document.querySelector('.fondo-card__veredicto').textContent).toContain('$1.000.000');
  });

  it('sin gastos fijos dice cómo conseguir el dato en vez de un monto inventado', () => {
    renderAhorro(0, null, null);
    expect(document.querySelector('.fondo-card__veredicto').textContent).toContain('Registra tus gastos fijos');
  });

  it('la acción de arranque conserva su data-action', () => {
    renderAhorro(1_000_000, null, null);
    expect(document.querySelector('[data-action="ahorro-activar-fondo"]').textContent).toContain('Empezar mi fondo');
  });
});

// ── franjaCobertura() (DIS.19, item 6) ───────────────────────────

describe('franjaCobertura()', () => {
  it('llega hasta el último nivel aunque la meta sea menor: el eje lo rotula', () => {
    const { bloques } = franjaCobertura(1, 3, '2026-07-29');
    expect(bloques).toHaveLength(MESES_FRANJA_MIN);
    expect(MESES_FRANJA_MIN).toBe(6);
  });

  it('con una meta mayor que el último nivel manda la meta: es su situación real', () => {
    const { bloques } = franjaCobertura(9, 12, '2026-07-29');
    expect(bloques).toHaveLength(12);
  });

  it('los bloques sin nada cubierto se marcan futuro, no se omiten', () => {
    const { bloques } = franjaCobertura(1.8, 3, '2026-07-29');
    expect(bloques.map(b => b.futuro)).toEqual([false, false, true, true, true, true]);
    expect(bloques[0].pct).toBe(100);
    expect(bloques[1].pct).toBe(80);
  });

  it('el rótulo del nivel cae en el bloque que lo completa', () => {
    const { eje } = franjaCobertura(1, 3, '2026-07-29');
    expect(eje.map(e => e.rotulo)).toEqual(['un mes', '', 'tres meses', '', '', 'seis meses']);
  });

  it('el eje dice qué nivel ya está logrado: es lo único que la lista decía y el dibujo no', () => {
    const { eje } = franjaCobertura(3.5, 3, '2026-07-29');
    expect(eje[0].estado).toBe('logrado');
    expect(eje[2].estado).toBe('logrado');
    expect(eje[5].estado).toBe('actual');
    // Los bloques sin nivel no llevan estado: no hay nada que decir de ellos.
    expect(eje[1].estado).toBe('');
  });

  it('pasados los ocho bloques se dejan de rotular los meses, no los niveles', () => {
    expect(franjaCobertura(1, 8, '2026-07-29').conRotulos).toBe(true);
    expect(franjaCobertura(1, 9, '2026-07-29').conRotulos).toBe(false);
    expect(MAX_ROTULOS_MES).toBe(8);
    // El eje sobrevive: es el que hace legible la franja.
    expect(franjaCobertura(1, 12, '2026-07-29').eje.filter(e => e.rotulo)).toHaveLength(3);
  });

  it('sin meta válida dibuja la franja mínima en vez de nada', () => {
    expect(franjaCobertura(0, 0, '2026-07-29').bloques).toHaveLength(MESES_FRANJA_MIN);
    expect(franjaCobertura(0, null, '2026-07-29').bloques).toHaveLength(MESES_FRANJA_MIN);
  });

  it('sin fecha válida no hay franja', () => {
    expect(franjaCobertura(2, 3, '').bloques).toEqual([]);
    expect(franjaCobertura(2, 3, 'julio').bloques).toEqual([]);
  });
});

// ── aportadoEnMes() + progresoCompromiso() (DIS.19, item 7) ──────

describe('aportadoEnMes()', () => {
  const aportes = [
    { id: '1', monto: 120_000, fecha: '2026-07-03' },
    { id: '2', monto: 140_000, fecha: '2026-07-28' },
    { id: '3', monto: 500_000, fecha: '2026-06-30' },
    { id: '4', monto: 900_000, fecha: '2026-08-01' },
  ];

  it('suma solo los aportes del mes calendario de hoy', () => {
    expect(aportadoEnMes(aportes, '2026-07-29')).toBe(260_000);
  });

  it('el 1 vuelve a cero: la promesa se renueva, no arrastra los últimos 30 días', () => {
    expect(aportadoEnMes(aportes, '2026-08-01')).toBe(900_000);
  });

  it('ignora montos que no son números positivos y fechas que no son texto', () => {
    expect(aportadoEnMes([
      { monto: -100, fecha: '2026-07-05' },
      { monto: 'x', fecha: '2026-07-05' },
      { monto: 50_000, fecha: null },
      { monto: 50_000, fecha: '2026-07-05' },
    ], '2026-07-29')).toBe(50_000);
  });

  it('sin aportes o con input inválido devuelve 0', () => {
    expect(aportadoEnMes([], '2026-07-29')).toBe(0);
    expect(aportadoEnMes(null, '2026-07-29')).toBe(0);
    expect(aportadoEnMes(aportes, 'hoy')).toBe(0);
  });
});

describe('progresoCompromiso()', () => {
  it('sin compromiso definido no hay promesa que medir', () => {
    expect(progresoCompromiso(0, 100_000, '2026-07-29')).toBeNull();
    expect(progresoCompromiso(null, 100_000, '2026-07-29')).toBeNull();
  });

  it('mide lo aportado contra lo prometido y dice lo que falta', () => {
    const p = progresoCompromiso(400_000, 260_000, '2026-07-29');
    expect(p.pct).toBe(65);
    expect(p.faltante).toBe(140_000);
    expect(p.completo).toBe(false);
  });

  it('pasarse de la promesa no pasa del 100% ni deja faltante negativo', () => {
    const p = progresoCompromiso(400_000, 900_000, '2026-07-29');
    expect(p.pct).toBe(100);
    expect(p.faltante).toBe(0);
    expect(p.completo).toBe(true);
  });

  it('los días restantes cuentan hoy: el último día del mes todavía sirve', () => {
    expect(progresoCompromiso(400_000, 0, '2026-07-31').diasRestantes).toBe(1);
    expect(progresoCompromiso(400_000, 0, '2026-07-29').diasRestantes).toBe(3);
    expect(progresoCompromiso(400_000, 0, '2026-07-01').diasRestantes).toBe(31);
  });

  it('cuenta bien un mes de 30 días y febrero de año bisiesto', () => {
    expect(progresoCompromiso(400_000, 0, '2026-06-01').diasRestantes).toBe(30);
    expect(progresoCompromiso(400_000, 0, '2028-02-01').diasRestantes).toBe(29);
  });
});

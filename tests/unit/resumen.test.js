import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  gastoUltimos7Dias,
  gastoSemanaPrevia,
  registrosUltimos7Dias,
  compararSemanas,
  categoriaTopSemana,
  diasActivosMes,
  serieDiaria,
  resumenSemanal,
  hayResumen,
} from '../../modules/dominio/resumen/logic.js';
import { renderPanelResumen, renderPanelAvisos } from '../../modules/dominio/resumen/view.js';
import { S } from '../../modules/core/state.js';

// ── FIXTURES ─────────────────────────────────────────────────────
//
// Hoy de referencia: 2026-06-13.
//   Semana actual (0-6 días atrás): 2026-06-07 .. 2026-06-13
//   Semana previa  (7-13 días atrás): 2026-05-31 .. 2026-06-06

const HOY = '2026-06-13';

const gasto = (overrides = {}) => ({
  id: 'g',
  descripcion: 'Gasto',
  monto: 10_000,
  categoria: 'Alimentación',
  fecha: '2026-06-13',
  cuentaId: null,
  nota: '',
  ...overrides,
});

// ── gastoUltimos7Dias() ──────────────────────────────────────────

describe('gastoUltimos7Dias()', () => {
  it('suma solo los gastos de los últimos 7 días (hoy incluido)', () => {
    const gastos = [
      gasto({ fecha: '2026-06-13', monto: 5_000 }),   // hoy
      gasto({ fecha: '2026-06-07', monto: 3_000 }),   // hace 6 días (límite)
      gasto({ fecha: '2026-06-06', monto: 9_000 }),   // hace 7 días (fuera)
    ];
    expect(gastoUltimos7Dias(gastos, HOY)).toBe(8_000);
  });

  it('ignora gastos futuros', () => {
    const gastos = [gasto({ fecha: '2026-06-20', monto: 4_000 })];
    expect(gastoUltimos7Dias(gastos, HOY)).toBe(0);
  });

  it('devuelve 0 con lista vacía o nula', () => {
    expect(gastoUltimos7Dias([], HOY)).toBe(0);
    expect(gastoUltimos7Dias(undefined, HOY)).toBe(0);
  });
});

// ── gastoSemanaPrevia() ──────────────────────────────────────────

describe('gastoSemanaPrevia()', () => {
  it('suma solo los gastos de la semana anterior (7-13 días atrás)', () => {
    const gastos = [
      gasto({ fecha: '2026-06-06', monto: 2_000 }),   // hace 7 días (entra)
      gasto({ fecha: '2026-05-31', monto: 6_000 }),   // hace 13 días (límite)
      gasto({ fecha: '2026-05-30', monto: 1_000 }),   // hace 14 días (fuera)
      gasto({ fecha: '2026-06-13', monto: 9_000 }),   // hoy (fuera)
    ];
    expect(gastoSemanaPrevia(gastos, HOY)).toBe(8_000);
  });
});

// ── registrosUltimos7Dias() ──────────────────────────────────────

describe('registrosUltimos7Dias()', () => {
  it('cuenta cuántos gastos hay en la última semana', () => {
    const gastos = [
      gasto({ fecha: '2026-06-13' }),
      gasto({ fecha: '2026-06-10' }),
      gasto({ fecha: '2026-06-01' }),   // fuera de la ventana
    ];
    expect(registrosUltimos7Dias(gastos, HOY)).toBe(2);
  });
});

// ── compararSemanas() ────────────────────────────────────────────

describe('compararSemanas()', () => {
  it('detecta subida con su porcentaje', () => {
    expect(compararSemanas(150, 100)).toEqual({ direccion: 'subió', delta: 50, pct: 50 });
  });

  it('detecta bajada con su porcentaje', () => {
    expect(compararSemanas(75, 100)).toEqual({ direccion: 'bajó', delta: -25, pct: 25 });
  });

  it('detecta igualdad cuando ambas tienen el mismo gasto', () => {
    expect(compararSemanas(100, 100)).toEqual({ direccion: 'igual', delta: 0, pct: 0 });
  });

  it('marca sin-previa cuando la semana pasada no tuvo gasto', () => {
    expect(compararSemanas(80, 0)).toEqual({ direccion: 'sin-previa', delta: 80, pct: null });
  });

  it('redondea el porcentaje al entero más cercano', () => {
    expect(compararSemanas(133, 100).pct).toBe(33);
    expect(compararSemanas(100, 99).pct).toBe(1);
  });
});

// ── categoriaTopSemana() ─────────────────────────────────────────

describe('categoriaTopSemana()', () => {
  it('devuelve la categoría con más gasto de la semana', () => {
    const gastos = [
      gasto({ fecha: '2026-06-13', categoria: 'Alimentación', monto: 30_000 }),
      gasto({ fecha: '2026-06-12', categoria: 'Transporte',   monto: 50_000 }),
      gasto({ fecha: '2026-06-11', categoria: 'Alimentación', monto: 10_000 }),
    ];
    expect(categoriaTopSemana(gastos, HOY)).toEqual({ categoria: 'Transporte', total: 50_000 });
  });

  it('solo considera gastos de la última semana', () => {
    const gastos = [
      gasto({ fecha: '2026-06-13', categoria: 'Salud',        monto: 5_000 }),
      gasto({ fecha: '2026-05-01', categoria: 'Vivienda',     monto: 99_000 }),  // viejo
    ];
    expect(categoriaTopSemana(gastos, HOY)).toEqual({ categoria: 'Salud', total: 5_000 });
  });

  it('agrupa "Otros" cuando la categoría falta', () => {
    const gastos = [gasto({ fecha: '2026-06-13', categoria: undefined, monto: 7_000 })];
    expect(categoriaTopSemana(gastos, HOY)).toEqual({ categoria: 'Otros', total: 7_000 });
  });

  it('devuelve null si no hubo gasto en la semana', () => {
    const gastos = [gasto({ fecha: '2026-05-01' })];
    expect(categoriaTopSemana(gastos, HOY)).toBeNull();
  });

  it('excluye gastos con compromisoId (fijos y abonos a deuda)', () => {
    const gastos = [
      gasto({ fecha: '2026-06-13', categoria: 'Deudas', monto: 500_000, compromisoId: 'c1' }),
      gasto({ fecha: '2026-06-12', categoria: 'Alimentación', monto: 20_000 }),
    ];
    expect(categoriaTopSemana(gastos, HOY)).toEqual({ categoria: 'Alimentación', total: 20_000 });
  });

  it('devuelve null si todos los gastos de la semana son de compromisoId', () => {
    const gastos = [gasto({ fecha: '2026-06-13', categoria: 'Vivienda', monto: 800_000, compromisoId: 'c1' })];
    expect(categoriaTopSemana(gastos, HOY)).toBeNull();
  });
});

// ── diasActivosMes() ─────────────────────────────────────────────

describe('diasActivosMes()', () => {
  it('cuenta días distintos del mes con al menos un gasto', () => {
    const gastos = [
      gasto({ fecha: '2026-06-01' }),
      gasto({ fecha: '2026-06-01' }),   // mismo día, no suma
      gasto({ fecha: '2026-06-13' }),
    ];
    expect(diasActivosMes(gastos, '2026-06')).toBe(2);
  });

  it('ignora gastos de otros meses', () => {
    const gastos = [
      gasto({ fecha: '2026-06-10' }),
      gasto({ fecha: '2026-05-31' }),
      gasto({ fecha: '2026-07-01' }),
    ];
    expect(diasActivosMes(gastos, '2026-06')).toBe(1);
  });

  it('acepta un ISO completo y usa solo el prefijo del mes', () => {
    const gastos = [gasto({ fecha: '2026-06-10' })];
    expect(diasActivosMes(gastos, HOY)).toBe(1);
  });

  it('devuelve 0 con mes inválido', () => {
    expect(diasActivosMes([gasto()], '')).toBe(0);
    expect(diasActivosMes([gasto()], undefined)).toBe(0);
  });
});

// ── serieDiaria() (IN.8f, ADR 034 D6) ─────────────────────────────
//
// HOY = '2026-06-13' cae sábado (verificado con `new Date(2026,5,13).getDay()`).

describe('serieDiaria()', () => {
  it('devuelve 7 días ordenados de más antiguo a más reciente (hoy al final)', () => {
    const r = serieDiaria([], HOY);
    expect(r).toHaveLength(7);
    expect(r[6]).toEqual({ dia: 'Sáb', diaCompleto: 'sábado', total: 0 });
    expect(r[0].total).toBe(0);
  });

  it('suma el gasto de cada día dentro de la ventana de 7 días, ignora lo de afuera', () => {
    const gastos = [
      gasto({ fecha: '2026-06-13', monto: 5_000 }),  // hoy
      gasto({ fecha: '2026-06-13', monto: 3_000 }),  // mismo día, suma
      gasto({ fecha: '2026-06-07', monto: 9_000 }),  // hace 6 días, primer día de la ventana
      gasto({ fecha: '2026-06-06', monto: 1_000 }),  // hace 7 días, fuera
    ];
    const r = serieDiaria(gastos, HOY);
    expect(r[6].total).toBe(8_000);
    expect(r[0].total).toBe(9_000);
    expect(r.reduce((s, d) => s + d.total, 0)).toBe(17_000);
  });

  it('devuelve array vacío con hoyISO inválido', () => {
    expect(serieDiaria([], '')).toEqual([]);
    expect(serieDiaria([], undefined)).toEqual([]);
  });
});

// ── resumenSemanal() ─────────────────────────────────────────────

describe('resumenSemanal()', () => {
  it('compone todos los agregados en un solo objeto', () => {
    const gastos = [
      gasto({ fecha: '2026-06-13', categoria: 'Transporte',   monto: 60_000 }),
      gasto({ fecha: '2026-06-10', categoria: 'Alimentación', monto: 40_000 }),
      gasto({ fecha: '2026-06-02', categoria: 'Vivienda',     monto: 50_000 }),  // semana previa
    ];
    const r = resumenSemanal(gastos, HOY);
    expect(r.actual).toBe(100_000);
    expect(r.previa).toBe(50_000);
    expect(r.comparacion.direccion).toBe('subió');
    expect(r.comparacion.pct).toBe(100);
    expect(r.top).toEqual({ categoria: 'Transporte', total: 60_000 });
    expect(r.registros).toBe(2);
    expect(r.diasActivos).toBe(3);
  });

  it('incluye la serie diaria, días activos de la semana y el día pico (IN.8f)', () => {
    const gastos = [
      gasto({ fecha: '2026-06-13', monto: 60_000 }), // hoy = sábado, pico
      gasto({ fecha: '2026-06-10', monto: 40_000 }),
    ];
    const r = resumenSemanal(gastos, HOY);
    expect(r.serie).toHaveLength(7);
    expect(r.diasActivosSemana).toBe(2);
    expect(r.diaPico).toBe('sábado');
  });

  it('diaPico es null cuando no hubo gasto en la ventana', () => {
    const r = resumenSemanal([gasto({ fecha: '2026-05-01', monto: 10_000 })], HOY);
    expect(r.diaPico).toBeNull();
    expect(r.diasActivosSemana).toBe(0);
  });
});

// ── hayResumen() ─────────────────────────────────────────────────

describe('hayResumen()', () => {
  it('es true cuando hay al menos un gasto esta semana', () => {
    expect(hayResumen([gasto({ fecha: '2026-06-13' })], HOY)).toBe(true);
  });

  it('es false cuando no hubo gasto en los últimos 7 días', () => {
    expect(hayResumen([gasto({ fecha: '2026-06-01' })], HOY)).toBe(false);
    expect(hayResumen([], HOY)).toBe(false);
  });
});

// ── renderPanelResumen() (PERF.7b) ──────────────────────────────────

describe('renderPanelResumen()', () => {
  const elPanel = () => document.getElementById('panel-resumen');

  beforeEach(() => {
    document.body.innerHTML = '<section id="panel-resumen"></section>';
    S.categoriasPersonalizadas = [];
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 13)); // 2026-06-13, mismo HOY que el resto del archivo
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('no revienta si el contenedor no existe', () => {
    document.body.innerHTML = '';
    S.gastos = [gasto({ fecha: '2026-06-13' })];
    expect(() => renderPanelResumen()).not.toThrow();
  });

  it('oculta el panel y lo vacía sin gastos en los últimos 7 días (PERF.7b: r.registros === 0 reemplaza a hayResumen)', () => {
    S.gastos = [gasto({ fecha: '2026-06-01' })]; // fuera de la ventana de 7 días
    renderPanelResumen();
    expect(elPanel().hidden).toBe(true);
    expect(elPanel().innerHTML).toBe('');
  });

  it('oculta el panel sin ningún gasto registrado', () => {
    S.gastos = [];
    renderPanelResumen();
    expect(elPanel().hidden).toBe(true);
  });

  it('muestra el panel con al menos un gasto en los últimos 7 días', () => {
    S.gastos = [gasto({ fecha: '2026-06-13', monto: 20_000 })];
    renderPanelResumen();
    expect(elPanel().hidden).toBe(false);
    expect(elPanel().innerHTML).toContain('Resumen de la semana');
    expect(elPanel().innerHTML).toContain('$20.000');
  });

  // IN.9d (ADR 057 D4): título propio; ya no depende del label de un grupo
  // externo, que en escritorio ahora también podría contener Actividad
  // reciente (fila final 6+6).
  it('trae su propio título, no depende de un label externo', () => {
    S.gastos = [gasto({ fecha: '2026-06-13', monto: 20_000 })];
    renderPanelResumen();
    const titulo = elPanel().querySelector('.accesos-actividad__label');
    expect(titulo).not.toBeNull();
    expect(titulo.textContent).toBe('Resumen de la semana');
  });

  // ── IN.8f (ADR 034 D6): bloque visual con barras + chip + categoría top ──

  it('dibuja 7 barras, una por día de la ventana', () => {
    S.gastos = [gasto({ fecha: '2026-06-13', monto: 20_000 })];
    renderPanelResumen();
    const barras = elPanel().querySelectorAll('.resumen-semana__barra');
    expect(barras).toHaveLength(7);
  });

  it('el chip dice "N% menos" en verde cuando el gasto bajó', () => {
    S.gastos = [
      gasto({ fecha: '2026-06-13', monto: 50_000 }),
      gasto({ fecha: '2026-06-02', monto: 100_000 }), // semana previa
    ];
    renderPanelResumen();
    const chip = elPanel().querySelector('.resumen-semana__chip');
    expect(chip.textContent.trim()).toContain('50% menos');
    expect(chip.className).toContain('resumen-semana__chip--positivo');
  });

  it('el chip dice "N% más" en tono neutro cuando el gasto subió (sin rojo, ADR 019)', () => {
    S.gastos = [
      gasto({ fecha: '2026-06-13', monto: 100_000 }),
      gasto({ fecha: '2026-06-02', monto: 50_000 }), // semana previa
    ];
    renderPanelResumen();
    const chip = elPanel().querySelector('.resumen-semana__chip');
    expect(chip.textContent.trim()).toContain('100% más');
    expect(chip.className).toContain('resumen-semana__chip--neutro');
  });

  it('muestra la categoría top con "N de 7 días activos" y el día pico', () => {
    S.gastos = [
      gasto({ fecha: '2026-06-13', categoria: 'Mercado', monto: 180_000 }), // hoy = sábado
      gasto({ fecha: '2026-06-10', categoria: 'Transporte', monto: 20_000 }),
    ];
    renderPanelResumen();
    const html = elPanel().innerHTML;
    expect(html).toContain('Mercado fue tu categoría top');
    expect(html).toContain('2 de 7 días activos');
    expect(html).toContain('mayor gasto el sábado');
    expect(html).toContain('$180.000');
  });

  // CAT.3b (ADR 058 D3): la categoría top leía el mapa nativo crudo y una
  // personalizada caía siempre a 'c-otros'.
  it('la categoría top personalizada usa su ícono, no el genérico', () => {
    S.categoriasPersonalizadas = [{ id: 'c1', nombre: 'Domicilios', icono: 'c-tienda' }];
    S.gastos = [gasto({ fecha: '2026-06-13', categoria: 'Domicilios', monto: 180_000 })];
    renderPanelResumen();
    const uso = elPanel().querySelector('.resumen-semana__top use');
    expect(uso.getAttribute('href')).toBe('#c-tienda');
  });

  it('sin categoría top (imposible con registros > 0, pero defensivo) no rompe el render', () => {
    S.gastos = [gasto({ fecha: '2026-06-13', categoria: 'Deudas', monto: 500_000, compromisoId: 'c1' })];
    expect(() => renderPanelResumen()).not.toThrow();
    // Sin top (categoriaTopSemana excluye compromisoId), no se dibuja la fila.
    expect(elPanel().innerHTML).not.toContain('resumen-semana__top-titulo');
  });
});

// ── renderPanelAvisos() (CFG.3b, ADR 066) ────────────────────────────

describe('renderPanelAvisos()', () => {
  const elPanel = () => document.getElementById('panel-avisos');

  const apartado = (overrides = {}) => ({
    id: 'a1', nombre: 'SOAT', montoObjetivo: 500_000, montoActual: 500_000,
    fechaObjetivo: null, recurrente: true, completado: true, ...overrides,
  });

  const prestamo = (overrides = {}) => ({
    id: 'pe1', persona: 'Juan', monto: 300_000, pagado: 0,
    fecha: '2026-04-01', fechaLimite: '2026-06-01', liquidado: false, ...overrides,
  });

  const ingreso = (overrides = {}) => ({
    id: 'i1', descripcion: 'Salario', monto: 2_000_000, frecuencia: 'Mensual',
    diaPago: 13, activo: true, fechaCreacion: '2025-01-01T00:00:00.000Z', ...overrides,
  });

  beforeEach(() => {
    document.body.innerHTML = '<section id="panel-avisos"></section>';
    S.compromisos  = [];
    S.gastos       = [];
    S.presupuestos = [];
    S.apartados    = [];
    S.personales   = [];
    S.ingresos     = [];
    S.cuentas      = [];
    S.metas        = [];
    S.inversiones  = [];
    S.config       = { ...S.config, ultimoRespaldoISO: null, primerUsoISO: null };
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 13)); // 2026-06-13, mismo HOY que el resto del archivo
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('no revienta si el contenedor no existe', () => {
    document.body.innerHTML = '';
    S.apartados = [apartado()];
    expect(() => renderPanelAvisos()).not.toThrow();
  });

  it('sin avisos de los tres tipos que le tocan, el panel queda oculto y vacío', () => {
    renderPanelAvisos();
    expect(elPanel().hidden).toBe(true);
    expect(elPanel().innerHTML).toBe('');
  });

  it('un apartado listo para reiniciar se muestra con badge "Listo"', () => {
    S.apartados = [apartado()];
    renderPanelAvisos();
    expect(elPanel().hidden).toBe(false);
    expect(elPanel().innerHTML).toContain('SOAT');
    expect(elPanel().innerHTML).toContain('Ya reuniste $500.000');
    expect(elPanel().innerHTML).toContain('avisos-card__badge--listo');
    expect(elPanel().innerHTML).toContain('Listo');
  });

  it('un ingreso que cae hoy se muestra con badge "Hoy"', () => {
    S.ingresos = [ingreso()];
    renderPanelAvisos();
    expect(elPanel().innerHTML).toContain('Salario');
    expect(elPanel().innerHTML).toContain('Te llega hoy · $2.000.000');
    expect(elPanel().innerHTML).toContain('Hoy');
  });

  it('un préstamo con la fecha pactada pasada dice hace cuántos días, sin lenguaje de cobro', () => {
    S.personales = [prestamo()];
    renderPanelAvisos();
    const html = elPanel().innerHTML;
    expect(html).toContain('Juan');
    expect(html).toContain('Acordaron esta fecha hace 12 días');
    expect(html).not.toMatch(/cobra|debe|reclama|exige/i);
  });

  it('no repite lo que ya muestran Pendientes del mes / Próximas prioridades / Alertas de límites', () => {
    S.compromisos = [{
      id: 'c1', descripcion: 'Arriendo', tipo: 'fijo', monto: 1_500_000,
      frecuencia: 'Mensual', diaPago: 1, activo: true, fechaCreacion: '2025-01-01T00:00:00.000Z',
    }];
    S.presupuestos = [{ id: 'p1', categoria: 'Restaurantes', montoMensual: 100_000, activo: true, fechaCreacion: '2025-01-01T00:00:00.000Z' }];
    S.gastos = [{ id: 'g1', descripcion: 'Cena', monto: 150_000, categoria: 'Restaurantes', fecha: '2026-06-10' }];
    S.apartados = [apartado({ id: 'a2', completado: false, recurrente: false, fechaObjetivo: '2026-06-15' })];
    renderPanelAvisos();
    // Vencido de arriendo (compromiso-vencido) y tope excedido (limite-excedido)
    // y apartado próximo (apartado-proximo) ya viven en otros paneles: acá no aparecen.
    expect(elPanel().hidden).toBe(true);
  });

  it('avisos de varias fuentes conviven en el mismo panel, con el conteo correcto', () => {
    S.apartados  = [apartado()];
    S.ingresos   = [ingreso()];
    S.personales = [prestamo()];
    renderPanelAvisos();
    expect(elPanel().innerHTML).toContain('3 avisos');
  });

  it('un respaldo atrasado se muestra con badge "Respaldo" (CFG.4b)', () => {
    S.apartados = [apartado()]; // hay algo que perder
    S.config.ultimoRespaldoISO = '2026-04-15'; // 59 días antes del 2026-06-13
    renderPanelAvisos();
    const html = elPanel().innerHTML;
    expect(html).toContain('Respaldo de tus datos');
    expect(html).toContain('Hace 59 días que no lo respaldas');
    expect(html).toContain('Respaldo');
  });

  it('sin nada que perder, un respaldo atrasado no avisa aunque nunca se haya exportado', () => {
    S.config.primerUsoISO = '2026-01-01';
    renderPanelAvisos();
    expect(elPanel().hidden).toBe(true);
  });

  it('una sección apagada en Ajustes también apaga el respaldo atrasado', () => {
    S.apartados = [apartado()];
    S.config.ultimoRespaldoISO = '2026-04-15';
    S.config.avisosPorSeccion = { respaldo: false };
    renderPanelAvisos();
    expect(elPanel().innerHTML).not.toContain('Respaldo de tus datos');
  });

  it('más del tope visible resume el resto en un texto, sin recortar el conteo del título', () => {
    S.apartados = [
      apartado({ id: 'a1', nombre: 'SOAT' }),
      apartado({ id: 'a2', nombre: 'Seguro' }),
      apartado({ id: 'a3', nombre: 'Impuesto' }),
    ];
    S.ingresos = [ingreso({ id: 'i1', descripcion: 'Salario' }), ingreso({ id: 'i2', descripcion: 'Freelance' })];
    renderPanelAvisos();
    const html = elPanel().innerHTML;
    expect(html).toContain('5 avisos');
    expect(html).toContain('y 1 más');
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import {
  metasActivas,
  metasCumplidas,
  calcularProgreso,
  calcularAhorroPorPeriodo,
  frecuenciaPrincipalIngresos,
  etiquetaPeriodoAhorro,
  diasHastaFecha,
  validarMeta,
  validarAbono,
  normalizarMeta,
} from '../../modules/dominio/metas/logic.js';
import { renderFormAbonoMeta, renderFormMeta, renderListaMetas } from '../../modules/dominio/metas/view.js';
import { CATEGORIAS_META } from '../../modules/core/constants.js';
import { S } from '../../modules/core/state.js';

// ── FIXTURES ─────────────────────────────────────────────────────

const metaBase = (overrides = {}) => ({
  id: 'm1',
  nombre: 'Fondo de emergencia',
  montoObjetivo: 5_000_000,
  montoActual:   1_000_000,
  fechaLimite:   null,
  icono:         '🛡️',
  completada:    false,
  ...overrides,
});

const datosFormValidos = {
  nombre:        'Viaje a Cartagena',
  montoObjetivo: '2000000',
  fechaLimite:   '',
  icono:         '✈️',
};

/**
 * Fecha `YYYY-MM-DD` a N días desde hoy, en hora local (no UTC).
 * `toISOString()` puede desplazar un día en zonas UTC-negativas (Colombia)
 * según la hora en que corra el test; este helper evita ese off-by-one,
 * igual que `hoyLocal()` en los E2E.
 */
function isoEnDias(dias) {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// ── metasActivas() ────────────────────────────────────────────────

describe('metasActivas()', () => {
  it('devuelve todas cuando ninguna está completada', () => {
    const metas = [metaBase(), metaBase({ id: 'm2', nombre: 'Vacaciones' })];
    expect(metasActivas(metas)).toHaveLength(2);
  });

  it('excluye metas con completada === true', () => {
    const metas = [metaBase(), metaBase({ id: 'm2', completada: true })];
    expect(metasActivas(metas)).toHaveLength(1);
    expect(metasActivas(metas)[0].id).toBe('m1');
  });

  it('incluye metas sin campo completada (undefined ≠ true)', () => {
    const { completada: _, ...sinCompletada } = metaBase();
    expect(metasActivas([sinCompletada])).toHaveLength(1);
  });

  it('devuelve array vacío si no hay metas', () => {
    expect(metasActivas([])).toEqual([]);
  });
});

// ── metasCumplidas() (DIS.13, MT.d) ───────────────────────────────

describe('metasCumplidas()', () => {
  it('devuelve solo las marcadas como completadas', () => {
    const metas = [metaBase(), metaBase({ id: 'm2', completada: true })];
    expect(metasCumplidas(metas)).toHaveLength(1);
    expect(metasCumplidas(metas)[0].id).toBe('m2');
  });

  it('excluye las metas sin campo completada (undefined ≠ true)', () => {
    const { completada: _, ...sinCompletada } = metaBase();
    expect(metasCumplidas([sinCompletada])).toEqual([]);
  });

  it('junto con metasActivas() reparte todas las metas sin dejar ninguna fuera', () => {
    const metas = [metaBase(), metaBase({ id: 'm2', completada: true }), metaBase({ id: 'm3' })];
    expect(metasActivas(metas).length + metasCumplidas(metas).length).toBe(metas.length);
  });

  it('devuelve array vacío si no hay metas', () => {
    expect(metasCumplidas([])).toEqual([]);
  });
});

// ── calcularProgreso() ────────────────────────────────────────────

describe('calcularProgreso()', () => {
  it('calcula porcentaje correctamente (20%)', () => {
    const meta = metaBase({ montoActual: 1_000_000, montoObjetivo: 5_000_000 });
    expect(calcularProgreso(meta).porcentaje).toBe(20);
  });

  it('devuelve completada: true cuando alcanza el 100%', () => {
    const meta = metaBase({ montoActual: 5_000_000, montoObjetivo: 5_000_000 });
    const { completada, porcentaje, faltante } = calcularProgreso(meta);
    expect(completada).toBe(true);
    expect(porcentaje).toBe(100);
    expect(faltante).toBe(0);
  });

  it('no supera 100% aunque montoActual > montoObjetivo', () => {
    const meta = metaBase({ montoActual: 6_000_000, montoObjetivo: 5_000_000 });
    expect(calcularProgreso(meta).porcentaje).toBe(100);
    expect(calcularProgreso(meta).faltante).toBe(0);
  });

  it('faltante es objetivo − actual cuando incompleto', () => {
    const meta = metaBase({ montoActual: 2_000_000, montoObjetivo: 5_000_000 });
    expect(calcularProgreso(meta).faltante).toBe(3_000_000);
  });

  it('devuelve 0 porcentaje y 0 faltante cuando montoObjetivo es 0', () => {
    const meta = metaBase({ montoObjetivo: 0 });
    const result = calcularProgreso(meta);
    expect(result.porcentaje).toBe(0);
    expect(result.faltante).toBe(0);
    expect(result.completada).toBe(false);
  });

  it('trata montoActual undefined como 0', () => {
    const { montoActual: _, ...sinActual } = metaBase();
    expect(calcularProgreso(sinActual).porcentaje).toBe(0);
  });

  it('redondea al entero más cercano', () => {
    const meta = metaBase({ montoActual: 1_000_000, montoObjetivo: 3_000_000 });
    expect(calcularProgreso(meta).porcentaje).toBe(33);
  });
});

// ── diasHastaFecha() ──────────────────────────────────────────────

describe('diasHastaFecha()', () => {
  it('devuelve null si fechaLimite es null', () => {
    expect(diasHastaFecha(null)).toBeNull();
  });

  it('devuelve null si fechaLimite es undefined', () => {
    expect(diasHastaFecha(undefined)).toBeNull();
  });

  it('devuelve null si fechaLimite es string vacío', () => {
    expect(diasHastaFecha('')).toBeNull();
  });

  it('devuelve un número positivo para fechas futuras', () => {
    const futura = new Date();
    futura.setDate(futura.getDate() + 30);
    const iso = futura.toISOString().slice(0, 10);
    const dias = diasHastaFecha(iso);
    expect(dias).toBeGreaterThan(0);
    expect(dias).toBeLessThanOrEqual(31);
  });

  it('devuelve un número ≤ 0 para fechas pasadas', () => {
    expect(diasHastaFecha('2020-01-01')).toBeLessThanOrEqual(0);
  });
});

// ── frecuenciaPrincipalIngresos() (MT.4) ──────────────────────────

describe('frecuenciaPrincipalIngresos()', () => {
  const ingreso = (frecuencia, activo = true) => ({
    id: 'i1', descripcion: 'Nómina', monto: 1_000_000, frecuencia, activo, fechaCreacion: '2026-01-01',
  });

  it('sin ingresos devuelve Mensual', () => {
    expect(frecuenciaPrincipalIngresos([])).toBe('Mensual');
    expect(frecuenciaPrincipalIngresos(null)).toBe('Mensual');
  });

  it('un ingreso Quincenal devuelve Quincenal', () => {
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
    const lista = [ingreso('Quincenal'), ingreso('Mensual')];
    expect(frecuenciaPrincipalIngresos(lista)).toBe('Quincenal');
  });
});

// ── etiquetaPeriodoAhorro() (MT.4) ─────────────────────────────────

describe('etiquetaPeriodoAhorro()', () => {
  it('mapea cada frecuencia a su etiqueta', () => {
    expect(etiquetaPeriodoAhorro('Diario')).toBe('por día');
    expect(etiquetaPeriodoAhorro('Semanal')).toBe('por semana');
    expect(etiquetaPeriodoAhorro('Quincenal')).toBe('por quincena');
    expect(etiquetaPeriodoAhorro('Mensual')).toBe('al mes');
  });

  it('una frecuencia desconocida cae a "al mes"', () => {
    expect(etiquetaPeriodoAhorro('Trimestral')).toBe('al mes');
    expect(etiquetaPeriodoAhorro(undefined)).toBe('al mes');
  });
});

// ── calcularAhorroPorPeriodo() (MT.4) ──────────────────────────────

describe('calcularAhorroPorPeriodo()', () => {
  it('devuelve null si la meta ya está completa', () => {
    const meta = metaBase({ montoActual: 5_000_000, montoObjetivo: 5_000_000 });
    expect(calcularAhorroPorPeriodo(meta, 'Mensual')).toBeNull();
  });

  it('devuelve null si no hay fechaLimite', () => {
    const meta = metaBase({ fechaLimite: null });
    expect(calcularAhorroPorPeriodo(meta, 'Mensual')).toBeNull();
  });

  it('devuelve null si la fecha ya venció', () => {
    const meta = metaBase({ fechaLimite: '2020-01-01' });
    expect(calcularAhorroPorPeriodo(meta, 'Mensual')).toBeNull();
  });

  it('con frecuencia Quincenal reparte entre quincenas, no entre días', () => {
    const meta = metaBase({ montoActual: 0, montoObjetivo: 600_000, fechaLimite: isoEnDias(90) });

    const r = calcularAhorroPorPeriodo(meta, 'Quincenal');
    expect(r).not.toBeNull();
    expect(r.frecuencia).toBe('Quincenal');
    expect(r.etiqueta).toBe('por quincena');
    // 90 días / 15 = 6 quincenas.
    expect(r.numPeriodos).toBe(6);
    expect(r.montoPorPeriodo).toBe(Math.ceil(600_000 / 6));
    // El monto acumulado por periodo cubre el faltante.
    expect(r.montoPorPeriodo * r.numPeriodos).toBeGreaterThanOrEqual(600_000);
  });

  it('con frecuencia Semanal reparte entre semanas', () => {
    const meta = metaBase({ montoActual: 0, montoObjetivo: 700_000, fechaLimite: isoEnDias(70) });

    const r = calcularAhorroPorPeriodo(meta, 'Semanal');
    expect(r.frecuencia).toBe('Semanal');
    expect(r.etiqueta).toBe('por semana');
    expect(r.numPeriodos).toBe(10); // 70 / 7
    expect(r.montoPorPeriodo).toBe(Math.ceil(700_000 / 10));
  });

  it('una frecuencia no soportada cae a Mensual (lectura defensiva)', () => {
    const meta = metaBase({ montoActual: 0, montoObjetivo: 300_000, fechaLimite: isoEnDias(90) });
    const r = calcularAhorroPorPeriodo(meta, 'Trimestral');
    expect(r.frecuencia).toBe('Mensual');
  });

  it('descuenta lo ya ahorrado del faltante', () => {
    const meta = metaBase({ montoActual: 400_000, montoObjetivo: 1_000_000, fechaLimite: isoEnDias(100) });
    const r = calcularAhorroPorPeriodo(meta, 'Mensual');
    expect(r.montoPorPeriodo * r.numPeriodos).toBeGreaterThanOrEqual(600_000);
  });

  it('garantiza al menos 1 periodo cuando la fecha es muy cercana', () => {
    const meta = metaBase({ montoActual: 0, montoObjetivo: 100_000, fechaLimite: isoEnDias(1) });
    const r = calcularAhorroPorPeriodo(meta, 'Mensual');
    expect(r.numPeriodos).toBeGreaterThanOrEqual(1);
  });
});

// ── validarMeta() ─────────────────────────────────────────────────

describe('validarMeta()', () => {
  it('retorna array vacío con datos válidos', () => {
    expect(validarMeta(datosFormValidos)).toEqual([]);
  });

  it('reporta error si nombre está vacío', () => {
    const errores = validarMeta({ ...datosFormValidos, nombre: '' });
    expect(errores).toHaveLength(1);
    expect(errores[0]).toMatch(/nombre/i);
  });

  it('reporta error si nombre es solo espacios', () => {
    const errores = validarMeta({ ...datosFormValidos, nombre: '   ' });
    expect(errores.length).toBeGreaterThan(0);
  });

  it('reporta error si montoObjetivo es 0', () => {
    const errores = validarMeta({ ...datosFormValidos, montoObjetivo: '0' });
    expect(errores).toHaveLength(1);
    expect(errores[0]).toMatch(/monto/i);
  });

  it('reporta error si montoObjetivo es negativo', () => {
    const errores = validarMeta({ ...datosFormValidos, montoObjetivo: '-500' });
    expect(errores.length).toBeGreaterThan(0);
  });

  it('reporta error si montoObjetivo no es número', () => {
    const errores = validarMeta({ ...datosFormValidos, montoObjetivo: 'mucho' });
    expect(errores).toHaveLength(1);
  });

  it('acepta fechaLimite vacío (campo opcional)', () => {
    expect(validarMeta({ ...datosFormValidos, fechaLimite: '' })).toEqual([]);
  });

  it('puede tener múltiples errores a la vez', () => {
    const errores = validarMeta({ nombre: '', montoObjetivo: '0' });
    expect(errores.length).toBeGreaterThanOrEqual(2);
  });
});

// ── validarAbono() ────────────────────────────────────────────────

describe('validarAbono()', () => {
  it('retorna array vacío con monto válido', () => {
    expect(validarAbono('100000')).toEqual([]);
  });

  it('reporta error si el monto es 0', () => {
    expect(validarAbono('0').length).toBeGreaterThan(0);
  });

  it('reporta error si el monto es negativo', () => {
    expect(validarAbono('-1000').length).toBeGreaterThan(0);
  });

  it('reporta error si el monto no es número', () => {
    expect(validarAbono('nada').length).toBeGreaterThan(0);
  });
});

// ── normalizarMeta() ──────────────────────────────────────────────

describe('normalizarMeta()', () => {
  it('convierte montoObjetivo string a número', () => {
    const result = normalizarMeta(datosFormValidos);
    expect(typeof result.montoObjetivo).toBe('number');
    expect(result.montoObjetivo).toBe(2_000_000);
  });

  it('inicia montoActual en 0', () => {
    expect(normalizarMeta(datosFormValidos).montoActual).toBe(0);
  });

  it('recorta espacios del nombre', () => {
    const result = normalizarMeta({ ...datosFormValidos, nombre: '  Viaje  ' });
    expect(result.nombre).toBe('Viaje');
  });

  it('marca completada en false', () => {
    expect(normalizarMeta(datosFormValidos).completada).toBe(false);
  });

  it('ID.3: sin emoji del usuario, icono queda null (nada que almacenar)', () => {
    const result = normalizarMeta({ ...datosFormValidos, icono: '' });
    expect(result.icono).toBeNull();
  });

  it('preserva el icono si se proporciona', () => {
    expect(normalizarMeta(datosFormValidos).icono).toBe('✈️');
  });

  it('fechaLimite vacía queda como null', () => {
    const result = normalizarMeta({ ...datosFormValidos, fechaLimite: '' });
    expect(result.fechaLimite).toBeNull();
  });

  it('fechaLimite con fecha queda como string', () => {
    const result = normalizarMeta({ ...datosFormValidos, fechaLimite: '2026-12-31' });
    expect(result.fechaLimite).toBe('2026-12-31');
  });

  it('no incluye id (lo asigna crud.js)', () => {
    expect(normalizarMeta(datosFormValidos)).not.toHaveProperty('id');
  });
});

// ── normalizarMeta() - categoría (MT.1) ───────────────────────────

describe('normalizarMeta() - categoría', () => {
  it('categoria vacía o ausente queda como null', () => {
    expect(normalizarMeta(datosFormValidos).categoria).toBeNull();
    expect(normalizarMeta({ ...datosFormValidos, categoria: '' }).categoria).toBeNull();
  });

  it('preserva la categoria elegida', () => {
    const result = normalizarMeta({ ...datosFormValidos, categoria: 'Boda', icono: '' });
    expect(result.categoria).toBe('Boda');
  });

  it('ID.3: sin emoji explícito no almacena ícono (la vista lo resuelve desde la categoría)', () => {
    const result = normalizarMeta({ ...datosFormValidos, categoria: 'Boda', icono: '' });
    expect(result.icono).toBeNull();
  });

  it('un emoji explícito se conserva como dato del usuario', () => {
    const result = normalizarMeta({ ...datosFormValidos, categoria: 'Otra', icono: '🎉' });
    expect(result.icono).toBe('🎉');
  });

  it('sin categoria ni emoji, icono queda null (la vista cae a la diana i-metas)', () => {
    const result = normalizarMeta({ ...datosFormValidos, categoria: '', icono: '' });
    expect(result.icono).toBeNull();
  });
});

// ── renderFormMeta() - selector de categoría (MT.1) ───────────────

describe('renderFormMeta() - selector de categoría', () => {
  it('incluye un select con name="categoria"', () => {
    const html = renderFormMeta();
    expect(html).toContain('id="meta-categoria"');
    expect(html).toContain('name="categoria"');
  });

  it('la opción "Sin categoría" tiene value vacío', () => {
    const html = renderFormMeta();
    expect(html).toContain('<option value="">Sin categoría</option>');
  });

  it('lista todas las CATEGORIAS_META en texto plano (ID.3)', () => {
    const html = renderFormMeta();
    for (const cat of CATEGORIAS_META) {
      expect(html).toContain(`<option value="${cat}">${cat}</option>`);
    }
  });

  it('conserva el campo de emoji libre, oculto por defecto (MT.3)', () => {
    const html = renderFormMeta();
    expect(html).toContain('id="meta-icono"');
    expect(html).toContain('name="icono"');
    expect(html).toMatch(/<div class="form-group" id="form-group-meta-icono" hidden>/);
  });

  it('CAT.2b: el campo de ícono usa el selector compacto compartido, no un input de texto libre', () => {
    const html = renderFormMeta();
    expect(html).toContain('data-icono-picker="meta-icono"');
    expect(html).toContain('icono-picker__recuadro');
    expect(html).not.toContain('placeholder="🎯"');
  });
});

// ── renderListaMetas() - ícono de categoría en la lista (MT.1/ID.3) ──

describe('renderListaMetas() - ícono de categoría en la lista', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="lista-metas"></div>';
  });

  it('una meta creada con categoría "Boda" muestra el anillo del sprite junto al nombre', () => {
    S.metas = [{
      ...normalizarMeta({ ...datosFormValidos, nombre: 'Fiesta de bodas', categoria: 'Boda', icono: '' }),
      id: 'm1',
    }];
    renderListaMetas();
    const titulo = document.querySelector('.list-item__title');
    expect(titulo.innerHTML).toContain('#c-anillo');
    expect(titulo.textContent).toContain('Fiesta de bodas');
  });

  it('una meta vieja con categoría y emoji almacenado migra sola al glifo del sprite', () => {
    S.metas = [{
      id: 'm1', nombre: 'Viaje a la playa', categoria: 'Viajes', icono: '✈️',
      montoObjetivo: 1_000_000, montoActual: 0, fechaLimite: null, completada: false,
    }];
    renderListaMetas();
    const titulo = document.querySelector('.list-item__title');
    expect(titulo.innerHTML).toContain('#c-avion');
    expect(titulo.textContent).not.toContain('✈️');
  });

  it('el emoji elegido a mano (categoría "Otra") se conserva como dato del usuario', () => {
    S.metas = [{
      ...normalizarMeta({ ...datosFormValidos, nombre: 'Consola retro', categoria: 'Otra', icono: '🕹️' }),
      id: 'm1',
    }];
    renderListaMetas();
    const titulo = document.querySelector('.list-item__title');
    expect(titulo.textContent).toContain('🕹️');
    expect(titulo.innerHTML).not.toContain('#c-otros');
  });

  it('categoría "Otra" sin emoji manual cae a la caja c-otros', () => {
    S.metas = [{
      ...normalizarMeta({ ...datosFormValidos, nombre: 'Lo que sea', categoria: 'Otra', icono: '' }),
      id: 'm1',
    }];
    renderListaMetas();
    expect(document.querySelector('.list-item__title').innerHTML).toContain('#c-otros');
  });

  it('una meta sin categoría ni emoji muestra la diana i-metas', () => {
    S.metas = [{
      ...normalizarMeta({ ...datosFormValidos, nombre: 'Objetivo libre', categoria: '', icono: '' }),
      id: 'm1',
    }];
    renderListaMetas();
    expect(document.querySelector('.list-item__title').innerHTML).toContain('#i-metas');
  });

  it('CAT.2b: categoría "Otra" con ícono elegido del picker (id de sprite) renderiza el glifo, no texto crudo', () => {
    S.metas = [{
      ...normalizarMeta({ ...datosFormValidos, nombre: 'Bicicleta', categoria: 'Otra', icono: 'c-carro' }),
      id: 'm1',
    }];
    renderListaMetas();
    const titulo = document.querySelector('.list-item__title');
    expect(titulo.innerHTML).toContain('#c-carro');
    expect(titulo.textContent).not.toContain('c-carro');
  });
});

// ── renderListaMetas() - ritmo de ahorro según frecuencia (MT.4) ──
//
// DIS.13 (MT.c, FM3): el ritmo de ahorro dejó de ser el cuarto fragmento del
// subtítulo y pasó a su propia línea (`.list-item__progress-label`), que es
// donde el consejo se lee como consejo.

describe('renderListaMetas() - ritmo de ahorro según frecuencia', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="lista-metas"></div>';
    S.config = {};
  });

  it('con ingreso Quincenal, la meta muestra el monto "por quincena", no "por día"', () => {
    S.ingresos = [{ id: 'i1', descripcion: 'Nómina', monto: 1_500_000, frecuencia: 'Quincenal', activo: true, fechaCreacion: '2026-01-01' }];
    S.metas = [{
      ...normalizarMeta(datosFormValidos),
      id: 'm1',
      montoObjetivo: 600_000,
      montoActual: 0,
      fechaLimite: isoEnDias(90),
    }];

    renderListaMetas();
    const ritmo = document.querySelector('.list-item__progress-label').textContent;
    expect(ritmo).toContain('por quincena');
    expect(ritmo).toContain('para llegar a tiempo');
    expect(ritmo).not.toContain('/día');
  });

  it('sin ingresos registrados, cae a "al mes" (Mensual por defecto)', () => {
    S.ingresos = [];
    S.metas = [{
      ...normalizarMeta(datosFormValidos),
      id: 'm1',
      montoObjetivo: 600_000,
      montoActual: 0,
      fechaLimite: isoEnDias(90),
    }];

    renderListaMetas();
    expect(document.querySelector('.list-item__progress-label').textContent).toContain('al mes');
  });

  it('sin fecha límite, no muestra ninguna línea de ritmo de ahorro', () => {
    S.ingresos = [];
    S.metas = [{ ...normalizarMeta(datosFormValidos), id: 'm1', fechaLimite: null }];

    renderListaMetas();
    expect(document.querySelector('.list-item__progress-label')).toBeNull();
  });
});

// ── renderListaMetas() - fila v2 de la auditoría de diseño (DIS.13) ──

describe('renderListaMetas() - fila de meta (DIS.13)', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="lista-metas" class="lista-metas"></div>';
    S.config   = {};
    S.ingresos = [];
    S.metas    = [];
  });

  // FM1 (MT.a, regla R56): la clase que activa el layout móvil de dos filas.
  it('la fila emite .list-item__meta, la columna que activa el layout móvil', () => {
    S.metas = [metaBase({ id: 'm1', nombre: 'Viaje', montoActual: 1_200_000, montoObjetivo: 3_500_000 })];
    renderListaMetas();
    expect(document.querySelector('.list-item .list-item__meta')).not.toBeNull();
  });

  // FM2 (MT.a y MT.c): el monto sube a su columna, el objetivo debajo.
  it('el acumulado va en .list-item__amount y el objetivo en .meta-item__de', () => {
    S.metas = [metaBase({ id: 'm1', montoActual: 1_200_000, montoObjetivo: 3_500_000 })];
    renderListaMetas();
    expect(document.querySelector('.list-item__meta .list-item__amount').textContent).toContain('1.200.000');
    expect(document.querySelector('.list-item__meta .meta-item__de').textContent).toContain('3.500.000');
  });

  it('"+ Abonar" vive en la columna de monto, no entre los botones de acción', () => {
    S.metas = [metaBase({ id: 'm1' })];
    renderListaMetas();
    expect(document.querySelector('.list-item__meta [data-action="abonar-meta"]')).not.toBeNull();
    expect(document.querySelector('.list-item__action [data-action="abonar-meta"]')).toBeNull();
  });

  // FM3 (MT.c): dos datos, no cuatro, y ningún número repetido.
  it('el subtítulo dice el faltante y la fecha, sin "días restantes" ni "X / Y"', () => {
    S.metas = [metaBase({ id: 'm1', montoActual: 1_200_000, montoObjetivo: 3_500_000, fechaLimite: isoEnDias(120) })];
    renderListaMetas();
    const subtitulo = document.querySelector('.list-item__subtitle').textContent;
    expect(subtitulo).toContain('Faltan');
    expect(subtitulo).toContain('2.300.000');
    expect(subtitulo).not.toContain('días restantes');
    expect(subtitulo).not.toContain('/');
  });

  it('sin fecha límite el subtítulo lo dice en palabras', () => {
    S.metas = [metaBase({ id: 'm1', fechaLimite: null })];
    renderListaMetas();
    expect(document.querySelector('.list-item__subtitle').textContent).toContain('sin fecha límite');
  });

  // FM6 (MT.e, regla R11): el envoltorio no oculta lo que envuelve.
  it('el contenedor del anillo ya no lleva aria-hidden y la etiqueta nombra la meta', () => {
    S.metas = [metaBase({ id: 'm1', nombre: 'Viaje', montoActual: 1_000_000, montoObjetivo: 5_000_000 })];
    renderListaMetas();
    const wrap = document.querySelector('.list-item__icon--ring');
    expect(wrap.getAttribute('aria-hidden')).toBeNull();
    expect(wrap.querySelector('svg').getAttribute('aria-label')).toBe('Viaje: 20% de tu objetivo');
  });

  // FM5 (MT.b, regla R20): el ojo de privacidad también rige en Metas.
  it('con el saldo oculto enmascara montos y conserva el porcentaje del anillo', () => {
    S.config = { ocultarSaldo: true };
    S.metas  = [metaBase({ id: 'm1', nombre: 'Viaje', montoActual: 1_000_000, montoObjetivo: 5_000_000 })];
    renderListaMetas();
    expect(document.querySelector('.list-item__amount').textContent).not.toContain('1.000.000');
    expect(document.querySelector('.meta-item__de').textContent).not.toContain('5.000.000');
    expect(document.querySelector('.list-item__subtitle').textContent).not.toContain('4.000.000');
    expect(document.querySelector('.progress-ring').getAttribute('aria-label')).toContain('20%');
  });

  it('sin el flag activo los montos se ven completos', () => {
    S.metas = [metaBase({ id: 'm1', montoActual: 1_000_000, montoObjetivo: 5_000_000 })];
    renderListaMetas();
    expect(document.querySelector('.list-item__amount').textContent).toContain('1.000.000');
  });
});

// ── renderListaMetas() - bloque de metas cumplidas (DIS.13, FM4) ──

describe('renderListaMetas() - metas cumplidas (DIS.13)', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="lista-metas" class="lista-metas"></div>';
    S.config   = {};
    S.ingresos = [];
    S.metas    = [];
  });

  it('una meta cumplida deja de desaparecer: se lista bajo su propio rótulo', () => {
    S.metas = [
      metaBase({ id: 'm1', nombre: 'Viaje' }),
      metaBase({ id: 'm2', nombre: 'Regalo', montoActual: 180_000, montoObjetivo: 180_000, completada: true }),
    ];
    renderListaMetas();
    expect(document.querySelector('.metas-cumplidas__label').textContent).toContain('Metas cumplidas');
    expect(document.querySelectorAll('.list-item')).toHaveLength(2);
    expect(document.querySelector('.list-item--cumplida').dataset.id).toBe('m2');
  });

  it('las cumplidas van después de las activas', () => {
    S.metas = [
      metaBase({ id: 'm2', nombre: 'Regalo', montoActual: 180_000, montoObjetivo: 180_000, completada: true }),
      metaBase({ id: 'm1', nombre: 'Viaje' }),
    ];
    renderListaMetas();
    const ids = [...document.querySelectorAll('.list-item')].map(a => a.dataset.id);
    expect(ids).toEqual(['m1', 'm2']);
  });

  it('la meta cumplida sigue siendo editable y eliminable, y ya no ofrece abonar', () => {
    S.metas = [metaBase({ id: 'm2', nombre: 'Regalo', montoActual: 180_000, montoObjetivo: 180_000, completada: true })];
    renderListaMetas();
    const fila = document.querySelector('.list-item--cumplida');
    expect(fila.querySelector('[data-action="editar-meta"]')).not.toBeNull();
    expect(fila.querySelector('[data-action="eliminar-meta"]')).not.toBeNull();
    expect(fila.querySelector('[data-action="abonar-meta"]')).toBeNull();
    expect(fila.querySelector('.list-item__subtitle').textContent).toContain('Meta cumplida');
    expect(fila.querySelector('.meta-item__de').textContent).toContain('completa');
  });

  it('sin metas activas pero con cumplidas no aparece el estado vacío', () => {
    S.metas = [metaBase({ id: 'm2', montoActual: 180_000, montoObjetivo: 180_000, completada: true })];
    renderListaMetas();
    expect(document.querySelector('.empty-state')).toBeNull();
    expect(document.querySelector('.list-item--cumplida')).not.toBeNull();
  });

  it('sin ninguna meta sigue apareciendo el estado vacío', () => {
    S.metas = [];
    renderListaMetas();
    expect(document.querySelector('.empty-state')).not.toBeNull();
    expect(document.querySelector('.metas-cumplidas__label')).toBeNull();
  });
});

// ── renderFormAbonoMeta() ─────────────────────────────────────────

describe('renderFormAbonoMeta()', () => {
  it('genera un form con id "form-abono-meta"', () => {
    const html = renderFormAbonoMeta(metaBase());
    expect(html).toContain('id="form-abono-meta"');
  });

  it('incluye el id de la meta en un campo oculto', () => {
    const meta = metaBase({ id: 'meta-abc' });
    const html = renderFormAbonoMeta(meta);
    expect(html).toContain('name="metaId"');
    expect(html).toContain('value="meta-abc"');
  });

  it('incluye el input de monto con name="monto"', () => {
    const html = renderFormAbonoMeta(metaBase());
    expect(html).toContain('name="monto"');
    expect(html).toContain('id="abono-meta-monto"');
  });

  it('muestra el porcentaje de progreso actual', () => {
    const meta = metaBase({ montoActual: 1_000_000, montoObjetivo: 5_000_000 });
    const html = renderFormAbonoMeta(meta);
    expect(html).toContain('20%');
  });

  it('muestra "Faltante" cuando la meta no está completada', () => {
    const meta = metaBase({ montoActual: 1_000_000, montoObjetivo: 5_000_000 });
    const html = renderFormAbonoMeta(meta);
    expect(html).toContain('Faltante');
  });

  it('no muestra "Faltante" cuando la meta está al 100%', () => {
    const meta = metaBase({ montoActual: 5_000_000, montoObjetivo: 5_000_000 });
    const html = renderFormAbonoMeta(meta);
    expect(html).not.toContain('Faltante');
  });

  it('incluye botón "Registrar abono"', () => {
    const html = renderFormAbonoMeta(metaBase());
    expect(html).toContain('Registrar abono');
  });

  it('incluye botón Cancelar con data-action="modal-close"', () => {
    const html = renderFormAbonoMeta(metaBase());
    expect(html).toContain('data-action="modal-close"');
    expect(html).toContain('Cancelar');
  });

  it('escapa el nombre de la meta para prevenir XSS', () => {
    const meta = metaBase({ nombre: '<script>alert(1)</script>' });
    const html = renderFormAbonoMeta(meta);
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });
});

// ── renderFormAbonoMeta() - selector de cuenta compartido (MT.5) ──

describe('renderFormAbonoMeta() - selector de cuenta', () => {
  const cuenta = (id, nombre, saldo = 500_000) => ({
    id, nombre, saldo, banco: 'Nequi', tipo: 'Ahorros', activa: true,
  });

  beforeEach(() => {
    S.cuentas = [];
  });

  it('sin cuentas activas no muestra selector (el abono vale como seguimiento)', () => {
    S.cuentas = [];
    const html = renderFormAbonoMeta(metaBase());
    expect(html).not.toContain('name="cuentaId"');
  });

  it('con una cuenta: una sola tarjeta del selector compartido, pre-seleccionada', () => {
    S.cuentas = [cuenta('c1', 'Nequi principal', 1_000_000)];
    const html = renderFormAbonoMeta(metaBase());
    expect(html).toContain('cuenta-sel__lista');
    expect(html).toContain('type="radio"');
    expect(html).toContain('name="cuentaId"');
    expect(html).toContain('value="c1"');
    expect(html).toContain('checked');
  });

  it('1 cuenta inactiva: no renderiza selector', () => {
    S.cuentas = [{ ...cuenta('c1', 'Inactiva'), activa: false }];
    const html = renderFormAbonoMeta(metaBase());
    expect(html).not.toContain('name="cuentaId"');
  });

  it('con varias cuentas: el selector de tarjetas lista todas y preselecciona la de mayor saldo', () => {
    S.cuentas = [cuenta('c1', 'Bancolombia', 600_000), cuenta('c2', 'Nequi', 400_000)];
    const html = renderFormAbonoMeta(metaBase());
    expect(html).toContain('cuenta-sel__lista');
    expect(html).toContain('value="c1"');
    expect(html).toContain('value="c2"');
    // c1 (mayor saldo) viene checked.
    expect(html).toMatch(/value="c1"[^>]*checked|checked[^>]*value="c1"/);
  });

  it('ya no usa el <select> de texto plano anterior', () => {
    S.cuentas = [cuenta('c1', 'Bancolombia', 600_000), cuenta('c2', 'Nequi', 400_000)];
    const html = renderFormAbonoMeta(metaBase());
    expect(html).not.toContain('id="abono-meta-cuenta"');
    expect(html).not.toContain('<select');
  });
});

// ── normalizarMeta(datos, metaExistente) - EDIT.1 ─────────────────

describe('normalizarMeta() - modo edición (EDIT.1)', () => {
  it('sin metaExistente, se comporta igual que antes: montoActual 0, completada false', () => {
    const r = normalizarMeta(datosFormValidos);
    expect(r.montoActual).toBe(0);
    expect(r.completada).toBe(false);
  });

  it('con metaExistente, conserva montoActual tal cual (no lo resetea a 0)', () => {
    const existente = metaBase({ montoActual: 2_000_000 });
    const r = normalizarMeta(datosFormValidos, existente);
    expect(r.montoActual).toBe(2_000_000);
  });

  it('recalcula completada al bajar el objetivo por debajo de lo ya aportado', () => {
    const existente = metaBase({ montoActual: 2_000_000, completada: false });
    const r = normalizarMeta({ ...datosFormValidos, montoObjetivo: '1000000' }, existente);
    expect(r.montoActual).toBe(2_000_000);
    expect(r.completada).toBe(true);
  });

  it('recalcula completada al subir el objetivo por encima de lo ya aportado', () => {
    const existente = metaBase({ montoActual: 5_000_000, montoObjetivo: 5_000_000, completada: true });
    const r = normalizarMeta({ ...datosFormValidos, montoObjetivo: '10000000' }, existente);
    expect(r.montoActual).toBe(5_000_000);
    expect(r.completada).toBe(false);
  });

  it('actualiza nombre, fecha y categoría normalmente', () => {
    const existente = metaBase({ montoActual: 500_000 });
    const r = normalizarMeta(
      { ...datosFormValidos, nombre: 'Viaje renombrado', fechaLimite: '2027-01-15', categoria: 'Viajes', icono: '' },
      existente,
    );
    expect(r.nombre).toBe('Viaje renombrado');
    expect(r.fechaLimite).toBe('2027-01-15');
    expect(r.categoria).toBe('Viajes');
    expect(r.montoActual).toBe(500_000);
  });

  it('metaExistente sin montoActual (defensivo) trata el histórico como 0', () => {
    const existente = { id: 'm1', nombre: 'X', montoObjetivo: 100 };
    const r = normalizarMeta(datosFormValidos, existente);
    expect(r.montoActual).toBe(0);
  });
});

// ── renderFormMeta(meta) - modo edición (EDIT.1) ──────────────────

describe('renderFormMeta() - modo edición (EDIT.1)', () => {
  it('sin meta, arranca en modo creación: botón "Guardar meta", campos vacíos', () => {
    const html = renderFormMeta();
    expect(html).toContain('>Guardar meta<');
    expect(html).not.toContain('>Actualizar meta<');
    expect(html).toMatch(/id="meta-nombre"[^>]*value=""/);
  });

  it('con una meta, prellena nombre, objetivo y fecha límite', () => {
    const meta = metaBase({ nombre: 'Viaje a Cartagena', montoObjetivo: 3_000_000, fechaLimite: '2026-12-01' });
    const html = renderFormMeta(meta);
    expect(html).toMatch(/id="meta-nombre"[^>]*value="Viaje a Cartagena"/);
    expect(html).toMatch(/id="meta-objetivo"[^>]*value="3000000"/);
    expect(html).toMatch(/id="meta-fecha"[^>]*value="2026-12-01"/);
  });

  it('con una meta, el botón dice "Actualizar meta"', () => {
    const html = renderFormMeta(metaBase());
    expect(html).toContain('>Actualizar meta<');
    expect(html).not.toContain('>Guardar meta<');
  });

  it('marca la categoría actual como seleccionada en el <select>', () => {
    const meta = metaBase({ categoria: 'Boda' });
    const html = renderFormMeta(meta);
    expect(html).toContain(`<option value="Boda" selected>Boda</option>`);
  });

  it('con categoría "Otra", el grupo de ícono NO viene oculto', () => {
    const meta = metaBase({ categoria: 'Otra', icono: 'c-otros' });
    const html = renderFormMeta(meta);
    expect(html).toMatch(/<div class="form-group" id="form-group-meta-icono" >/);
  });

  it('con categoría "Otra" y un ícono de sprite válido (del catálogo), lo prellena en el picker', () => {
    const meta = metaBase({ categoria: 'Otra', icono: 'c-avion' });
    const html = renderFormMeta(meta);
    expect(html).toContain('value="c-avion"');
    expect(html).toContain('aria-pressed="true"');
  });

  it('con un emoji legacy (no id de sprite), el picker NO intenta usarlo como valor', () => {
    const meta = metaBase({ categoria: 'Otra', icono: '🎉' });
    const html = renderFormMeta(meta);
    // El input oculto del picker queda vacío: ningún botón coincide con un emoji.
    expect(html).toContain('id="meta-icono" value=""');
  });

  it('sin categoría "Otra", el grupo de ícono sigue oculto aunque haya meta', () => {
    const meta = metaBase({ categoria: 'Viajes' });
    const html = renderFormMeta(meta);
    expect(html).toMatch(/<div class="form-group" id="form-group-meta-icono" hidden>/);
  });
});

// ── renderListaMetas() - botón "Editar" (EDIT.1) ──────────────────

describe('renderListaMetas() - botón Editar (EDIT.1)', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="lista-metas"></div>';
  });

  it('cada meta trae un botón "editar-meta" con su id', () => {
    S.metas = [metaBase({ id: 'm1', nombre: 'Viaje' })];
    renderListaMetas();
    const btn = document.querySelector('[data-action="editar-meta"]');
    expect(btn).not.toBeNull();
    expect(btn.dataset.id).toBe('m1');
    expect(btn.getAttribute('aria-label')).toBe('Editar meta Viaje');
  });

  it('con varias metas, cada botón de editar lleva el id de SU propia meta', () => {
    S.metas = [
      metaBase({ id: 'm1', nombre: 'Viaje' }),
      metaBase({ id: 'm2', nombre: 'Laptop' }),
    ];
    renderListaMetas();
    const ids = [...document.querySelectorAll('[data-action="editar-meta"]')].map(b => b.dataset.id);
    expect(ids).toEqual(['m1', 'm2']);
  });
});

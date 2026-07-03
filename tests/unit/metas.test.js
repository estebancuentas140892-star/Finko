import { describe, it, expect, beforeEach } from 'vitest';
import {
  metasActivas,
  calcularProgreso,
  calcularAhorroDiario,
  diasHastaFecha,
  validarMeta,
  validarAbono,
  normalizarMeta,
} from '../../modules/dominio/metas/logic.js';
import { renderFormAbonoMeta, renderFormMeta, renderListaMetas } from '../../modules/dominio/metas/view.js';
import { CATEGORIAS_META, CATEGORIA_META_EMOJI } from '../../modules/core/constants.js';
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

// ── calcularAhorroDiario() ────────────────────────────────────────

describe('calcularAhorroDiario()', () => {
  it('devuelve 0 si la meta ya está completa', () => {
    const meta = metaBase({ montoActual: 5_000_000, montoObjetivo: 5_000_000 });
    expect(calcularAhorroDiario(meta)).toBe(0);
  });

  it('devuelve null si no hay fechaLimite', () => {
    const meta = metaBase({ fechaLimite: null });
    expect(calcularAhorroDiario(meta)).toBeNull();
  });

  it('devuelve null si la fecha ya venció', () => {
    const meta = metaBase({ fechaLimite: '2020-01-01' });
    expect(calcularAhorroDiario(meta)).toBeNull();
  });

  it('devuelve número positivo con fecha futura', () => {
    const futura = new Date();
    futura.setDate(futura.getDate() + 100);
    const iso = futura.toISOString().slice(0, 10);
    const meta = metaBase({
      montoActual: 0,
      montoObjetivo: 1_000_000,
      fechaLimite: iso,
    });
    const diario = calcularAhorroDiario(meta);
    expect(diario).toBeGreaterThan(0);
    expect(diario).toBeLessThanOrEqual(10_500); // ~1_000_000 / 100 + rounding
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

  it('usa 🎯 como icono por defecto si no viene', () => {
    const result = normalizarMeta({ ...datosFormValidos, icono: '' });
    expect(result.icono).toBe('🎯');
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

  it('sin emoji explícito, usa el emoji de la categoría elegida', () => {
    const result = normalizarMeta({ ...datosFormValidos, categoria: 'Boda', icono: '' });
    expect(result.icono).toBe(CATEGORIA_META_EMOJI['Boda']);
  });

  it('un emoji explícito gana sobre el de la categoría', () => {
    const result = normalizarMeta({ ...datosFormValidos, categoria: 'Boda', icono: '🎉' });
    expect(result.icono).toBe('🎉');
  });

  it('sin categoria ni emoji, usa 🎯 por defecto', () => {
    const result = normalizarMeta({ ...datosFormValidos, categoria: '', icono: '' });
    expect(result.icono).toBe('🎯');
  });

  it('categoria "Otra" sin emoji explícito usa 📦', () => {
    const result = normalizarMeta({ ...datosFormValidos, categoria: 'Otra', icono: '' });
    expect(result.icono).toBe('📦');
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

  it('lista todas las CATEGORIAS_META con su emoji', () => {
    const html = renderFormMeta();
    for (const cat of CATEGORIAS_META) {
      expect(html).toContain(`<option value="${cat}">${CATEGORIA_META_EMOJI[cat]} ${cat}</option>`);
    }
  });

  it('conserva el campo de emoji libre, oculto por defecto (MT.3)', () => {
    const html = renderFormMeta();
    expect(html).toContain('id="meta-icono"');
    expect(html).toContain('name="icono"');
    expect(html).toMatch(/<div class="form-group" id="form-group-meta-icono" hidden>/);
  });
});

// ── renderListaMetas() - emoji de categoría en la lista (MT.1) ────

describe('renderListaMetas() - emoji de categoría en la lista', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="lista-metas"></div>';
  });

  it('una meta creada con categoría "Boda" muestra 💍 junto al nombre', () => {
    S.metas = [{
      ...normalizarMeta({ ...datosFormValidos, nombre: 'Fiesta de bodas', categoria: 'Boda', icono: '' }),
      id: 'm1',
    }];
    renderListaMetas();
    const titulo = document.querySelector('.list-item__title').textContent;
    expect(titulo).toContain('💍');
    expect(titulo).toContain('Fiesta de bodas');
  });

  it('una meta sin categoría ni emoji muestra el default 🎯', () => {
    S.metas = [{
      ...normalizarMeta({ ...datosFormValidos, nombre: 'Objetivo libre', categoria: '', icono: '' }),
      id: 'm1',
    }];
    renderListaMetas();
    expect(document.querySelector('.list-item__title').textContent).toContain('🎯');
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

import { describe, it, expect, beforeEach } from 'vitest';
import {
  gastosMes,
  ordenarRecientesPrimero,
  totalGastos,
  totalGastosMes,
  gastosPorCategoria,
  detectarHormigas,
  validarGasto,
  normalizarGasto,
  aplicarGastoASaldo,
  revertirGastoDeSaldo,
  deltasPorEdicionDeGasto,
  filtrarGastos,
  iconoPorOrigen,
  validarCategoriaPersonalizada,
} from '../../modules/dominio/gastos/logic.js';
import { renderFormGasto, renderListaGastos, renderFiltrosGastos, CATEGORIA_NUEVA_VALUE } from '../../modules/dominio/gastos/view.js';
import { CATEGORIAS_TIPICAMENTE_FIJAS, ICONOS_CATEGORIA_PERSONALIZADA } from '../../modules/core/constants.js';
import { S } from '../../modules/core/state.js';

// ── FIXTURES ─────────────────────────────────────────────────────

const gastoBase = (overrides = {}) => ({
  id: 'g1',
  descripcion: 'Almuerzo',
  monto: 15_000,
  categoria: 'Alimentación',
  fecha: '2026-05-10',
  cuentaId: null,
  nota: '',
  ...overrides,
});

const datosFormValidos = {
  descripcion: 'Gasolina',
  monto: '80000',
  categoria: 'Transporte',
  fecha: '2026-05-12',
  cuentaId: 'c1',
  nota: '',
};

// ── gastosMes() ──────────────────────────────────────────────────

describe('gastosMes()', () => {
  it('filtra solo los gastos del mes y año indicados', () => {
    const gastos = [
      gastoBase({ fecha: '2026-05-10' }),
      gastoBase({ id: 'g2', fecha: '2026-04-30' }),
      gastoBase({ id: 'g3', fecha: '2026-05-31' }),
    ];
    const resultado = gastosMes(gastos, 2026, 5);
    expect(resultado).toHaveLength(2);
    expect(resultado.map(g => g.id)).toEqual(['g1', 'g3']);
  });

  it('devuelve vacío si no hay gastos en ese mes', () => {
    const gastos = [gastoBase({ fecha: '2026-04-10' })];
    expect(gastosMes(gastos, 2026, 5)).toEqual([]);
  });

  it('maneja meses con padding de cero (mes 1 = enero)', () => {
    const gastos = [gastoBase({ fecha: '2026-01-15' })];
    expect(gastosMes(gastos, 2026, 1)).toHaveLength(1);
  });

  it('devuelve vacío con array de gastos vacío', () => {
    expect(gastosMes([], 2026, 5)).toEqual([]);
  });
});

// ── ordenarRecientesPrimero() ────────────────────────────────────

describe('ordenarRecientesPrimero()', () => {
  it('ordena por fecha descendente (más reciente primero)', () => {
    const gastos = [
      gastoBase({ id: 'g1', fecha: '2026-05-02' }),
      gastoBase({ id: 'g2', fecha: '2026-05-20' }),
      gastoBase({ id: 'g3', fecha: '2026-05-11' }),
    ];
    expect(ordenarRecientesPrimero(gastos).map(g => g.id)).toEqual(['g2', 'g3', 'g1']);
  });

  it('a igualdad de fecha, deja primero el último registrado (orden de inserción inverso)', () => {
    const gastos = [
      gastoBase({ id: 'viejo',    fecha: '2026-05-10' }),
      gastoBase({ id: 'medio',    fecha: '2026-05-10' }),
      gastoBase({ id: 'reciente', fecha: '2026-05-10' }),
    ];
    expect(ordenarRecientesPrimero(gastos).map(g => g.id)).toEqual(['reciente', 'medio', 'viejo']);
  });

  it('combina ambos criterios: fecha desc y, en empate, último registrado primero', () => {
    const gastos = [
      gastoBase({ id: 'a', fecha: '2026-05-10' }),
      gastoBase({ id: 'b', fecha: '2026-05-15' }),
      gastoBase({ id: 'c', fecha: '2026-05-10' }),
    ];
    expect(ordenarRecientesPrimero(gastos).map(g => g.id)).toEqual(['b', 'c', 'a']);
  });

  it('no muta el array recibido', () => {
    const gastos = [
      gastoBase({ id: 'g1', fecha: '2026-05-02' }),
      gastoBase({ id: 'g2', fecha: '2026-05-20' }),
    ];
    ordenarRecientesPrimero(gastos);
    expect(gastos.map(g => g.id)).toEqual(['g1', 'g2']);
  });

  it('devuelve vacío con array vacío', () => {
    expect(ordenarRecientesPrimero([])).toEqual([]);
  });
});

// ── totalGastos() ────────────────────────────────────────────────

describe('totalGastos()', () => {
  it('suma los montos de todos los gastos', () => {
    const gastos = [
      gastoBase({ monto: 15_000 }),
      gastoBase({ id: 'g2', monto: 80_000 }),
    ];
    expect(totalGastos(gastos)).toBe(95_000);
  });

  it('devuelve 0 con array vacío', () => {
    expect(totalGastos([])).toBe(0);
  });

  it('trata monto undefined como 0', () => {
    const { monto: _, ...sinMonto } = gastoBase();
    expect(totalGastos([sinMonto])).toBe(0);
  });
});

// ── totalGastosMes() ─────────────────────────────────────────────

describe('totalGastosMes()', () => {
  it('combina el filtro por mes con la suma', () => {
    const gastos = [
      gastoBase({ monto: 15_000, fecha: '2026-05-10' }),
      gastoBase({ id: 'g2', monto: 80_000, fecha: '2026-05-15' }),
      gastoBase({ id: 'g3', monto: 999_999, fecha: '2026-04-01' }),
    ];
    expect(totalGastosMes(gastos, 2026, 5)).toBe(95_000);
  });

  it('devuelve 0 si no hay gastos en el mes', () => {
    expect(totalGastosMes([gastoBase()], 2025, 5)).toBe(0);
  });
});

// ── gastosPorCategoria() ─────────────────────────────────────────

describe('gastosPorCategoria()', () => {
  it('agrupa y suma por categoría correctamente', () => {
    const gastos = [
      gastoBase({ monto: 15_000, categoria: 'Alimentación' }),
      gastoBase({ id: 'g2', monto: 10_000, categoria: 'Alimentación' }),
      gastoBase({ id: 'g3', monto: 80_000, categoria: 'Transporte' }),
    ];
    const result = gastosPorCategoria(gastos);
    expect(result['Alimentación']).toBe(25_000);
    expect(result['Transporte']).toBe(80_000);
  });

  it('usa "Otros" si la categoría es undefined', () => {
    const { categoria: _, ...sinCat } = gastoBase({ monto: 5_000 });
    const result = gastosPorCategoria([sinCat]);
    expect(result['Otros']).toBe(5_000);
  });

  it('devuelve objeto vacío con array vacío', () => {
    expect(gastosPorCategoria([])).toEqual({});
  });
});

// ── detectarHormigas() ───────────────────────────────────────────

describe('detectarHormigas()', () => {
  it('detecta categorías con muchos gastos pequeños que suman bastante', () => {
    const gastos = Array.from({ length: 8 }, (_, i) =>
      gastoBase({ id: `g${i}`, monto: 15_000, categoria: 'Alimentación' })
    );
    const hormigas = detectarHormigas(gastos, 20_000, 100_000);
    expect(hormigas).toHaveLength(1);
    expect(hormigas[0].categoria).toBe('Alimentación');
    expect(hormigas[0].total).toBe(120_000);
    expect(hormigas[0].cantidad).toBe(8);
  });

  it('no incluye categorías que no superan el umbral total', () => {
    const gastos = [
      gastoBase({ monto: 15_000, categoria: 'Alimentación' }),
      gastoBase({ id: 'g2', monto: 15_000, categoria: 'Alimentación' }),
    ];
    const hormigas = detectarHormigas(gastos, 20_000, 100_000);
    expect(hormigas).toHaveLength(0);
  });

  it('excluye transacciones que superan el umbral de monto individual', () => {
    const gastos = [
      gastoBase({ monto: 50_000, categoria: 'Alimentación' }),
      gastoBase({ id: 'g2', monto: 50_000, categoria: 'Alimentación' }),
      gastoBase({ id: 'g3', monto: 50_000, categoria: 'Alimentación' }),
    ];
    const hormigas = detectarHormigas(gastos, 20_000, 100_000);
    expect(hormigas).toHaveLength(0);
  });

  it('ordena por total descendente', () => {
    const gastosAlim = Array.from({ length: 7 }, (_, i) =>
      gastoBase({ id: `a${i}`, monto: 18_000, categoria: 'Alimentación' })
    );
    const gastosTransp = Array.from({ length: 10 }, (_, i) =>
      gastoBase({ id: `t${i}`, monto: 12_000, categoria: 'Transporte' })
    );
    const hormigas = detectarHormigas([...gastosAlim, ...gastosTransp], 20_000, 100_000);
    expect(hormigas[0].total).toBeGreaterThanOrEqual(hormigas[1].total);
  });

  it('calcula el promedio correctamente', () => {
    const gastos = Array.from({ length: 7 }, (_, i) =>
      gastoBase({ id: `g${i}`, monto: 16_000, categoria: 'Entretenimiento' })
    );
    const hormigas = detectarHormigas(gastos, 20_000, 100_000);
    expect(hormigas).toHaveLength(1);
    expect(hormigas[0].promedio).toBe(16_000);
  });

  it('devuelve array vacío con gastos vacíos', () => {
    expect(detectarHormigas([], 20_000, 100_000)).toEqual([]);
  });
});

// ── validarGasto() ────────────────────────────────────────────────

describe('validarGasto()', () => {
  it('retorna array vacío con datos válidos', () => {
    expect(validarGasto(datosFormValidos)).toEqual([]);
  });

  it('no reporta error si descripción está vacía (TX.9a: ya no es obligatoria)', () => {
    const errores = validarGasto({ ...datosFormValidos, descripcion: '' });
    expect(errores).toEqual([]);
  });

  it('no reporta error sin campo descripcion en absoluto (el form ya no lo pide)', () => {
    const { descripcion: _omitida, ...sinDescripcion } = datosFormValidos;
    expect(validarGasto(sinDescripcion)).toEqual([]);
  });

  it('reporta error si monto es 0', () => {
    const errores = validarGasto({ ...datosFormValidos, monto: '0' });
    expect(errores).toHaveLength(1);
  });

  it('reporta error si monto no es número', () => {
    const errores = validarGasto({ ...datosFormValidos, monto: 'texto' });
    expect(errores).toHaveLength(1);
    expect(errores[0]).toMatch(/monto/i);
  });

  it('reporta error si categoría está vacía', () => {
    const errores = validarGasto({ ...datosFormValidos, categoria: '' });
    expect(errores).toHaveLength(1);
    expect(errores[0]).toMatch(/categor/i);
  });

  it('reporta error si fecha está vacía', () => {
    const errores = validarGasto({ ...datosFormValidos, fecha: '' });
    expect(errores).toHaveLength(1);
    expect(errores[0]).toMatch(/fecha/i);
  });

  it('reporta error si no se eligió cuenta', () => {
    const errores = validarGasto({ ...datosFormValidos, cuentaId: '' });
    expect(errores).toHaveLength(1);
    expect(errores[0]).toMatch(/cuenta/i);
  });

  it('puede tener múltiples errores a la vez', () => {
    const errores = validarGasto({ descripcion: '', monto: '0', categoria: '', fecha: '', cuentaId: '' });
    expect(errores.length).toBeGreaterThanOrEqual(4);
  });
});

// ── validarCategoriaPersonalizada() (TX.9b) ───────────────────────

describe('validarCategoriaPersonalizada()', () => {
  it('acepta nombre e ícono válidos, sin duplicados', () => {
    expect(validarCategoriaPersonalizada({ nombre: 'Gimnasio', icono: 'c-pesa' }, [])).toEqual([]);
  });

  it('reporta error si el nombre está vacío', () => {
    const errores = validarCategoriaPersonalizada({ nombre: '', icono: 'c-pesa' }, []);
    expect(errores.some(e => /nombre/i.test(e))).toBe(true);
  });

  it('reporta error si el nombre es solo espacios', () => {
    const errores = validarCategoriaPersonalizada({ nombre: '   ', icono: 'c-pesa' }, []);
    expect(errores.some(e => /nombre/i.test(e))).toBe(true);
  });

  it('reporta error si no se eligió ícono', () => {
    const errores = validarCategoriaPersonalizada({ nombre: 'Gimnasio', icono: '' }, []);
    expect(errores.some(e => /ícono/i.test(e))).toBe(true);
  });

  it('reporta error si el ícono no está en el catálogo curado (defensivo)', () => {
    const errores = validarCategoriaPersonalizada({ nombre: 'Gimnasio', icono: 'c-mercado' }, []);
    expect(errores.some(e => /ícono/i.test(e))).toBe(true);
  });

  it('reporta error si el nombre duplica una categoría nativa', () => {
    const errores = validarCategoriaPersonalizada({ nombre: 'Mercado', icono: 'c-pesa' }, []);
    expect(errores.some(e => /existe/i.test(e))).toBe(true);
  });

  it('la duplicación de nativa no distingue mayúsculas ni tildes', () => {
    const errores = validarCategoriaPersonalizada({ nombre: 'mercadó', icono: 'c-pesa' }, []);
    expect(errores.some(e => /existe/i.test(e))).toBe(true);
  });

  it('reporta error si el nombre duplica una categoría personalizada ya creada', () => {
    const existentes = [{ nombre: 'Gimnasio', icono: 'c-pesa' }];
    const errores = validarCategoriaPersonalizada({ nombre: 'Gimnasio', icono: 'c-carro' }, existentes);
    expect(errores.some(e => /existe/i.test(e))).toBe(true);
  });

  it('puede tener múltiples errores a la vez', () => {
    const errores = validarCategoriaPersonalizada({ nombre: '', icono: '' }, []);
    expect(errores.length).toBeGreaterThanOrEqual(2);
  });
});

// ── normalizarGasto() ─────────────────────────────────────────────

describe('normalizarGasto()', () => {
  it('convierte monto string a número', () => {
    const result = normalizarGasto(datosFormValidos);
    expect(typeof result.monto).toBe('number');
    expect(result.monto).toBe(80_000);
  });

  it('recorta espacios de la descripción', () => {
    const result = normalizarGasto({ ...datosFormValidos, descripcion: '  Gasolina  ' });
    expect(result.descripcion).toBe('Gasolina');
  });

  it('preserva la categoría exacta', () => {
    expect(normalizarGasto(datosFormValidos).categoria).toBe('Transporte');
  });

  it('preserva la fecha exacta', () => {
    expect(normalizarGasto(datosFormValidos).fecha).toBe('2026-05-12');
  });

  it('nota vacía queda como string vacío', () => {
    const result = normalizarGasto({ ...datosFormValidos, nota: '' });
    expect(result.nota).toBe('');
  });

  it('recorta espacios de la nota', () => {
    const result = normalizarGasto({ ...datosFormValidos, nota: '  con descuento  ' });
    expect(result.nota).toBe('con descuento');
  });

  it('preserva cuentaId si viene', () => {
    const result = normalizarGasto(datosFormValidos);
    expect(result.cuentaId).toBe('c1');
  });

  it('cuentaId null si no viene', () => {
    const { cuentaId: _omitido, ...sinCuenta } = datosFormValidos;
    const result = normalizarGasto(sinCuenta);
    expect(result.cuentaId).toBeNull();
  });

  it('no incluye id (lo asigna crud.js)', () => {
    expect(normalizarGasto(datosFormValidos)).not.toHaveProperty('id');
  });
});

// ── aplicarGastoASaldo() ─────────────────────────────────────────

describe('aplicarGastoASaldo()', () => {
  it('descuenta el monto del saldo', () => {
    expect(aplicarGastoASaldo(100_000, 30_000)).toBe(70_000);
  });
  it('permite saldo negativo (no impide sobregirar)', () => {
    expect(aplicarGastoASaldo(10_000, 50_000)).toBe(-40_000);
  });
  it('trata saldo undefined como 0', () => {
    expect(aplicarGastoASaldo(undefined, 25_000)).toBe(-25_000);
  });
  it('trata monto undefined como 0', () => {
    expect(aplicarGastoASaldo(100_000, undefined)).toBe(100_000);
  });
});

// ── revertirGastoDeSaldo() ───────────────────────────────────────

describe('revertirGastoDeSaldo()', () => {
  it('devuelve el monto al saldo', () => {
    expect(revertirGastoDeSaldo(70_000, 30_000)).toBe(100_000);
  });
  it('aplicar + revertir es idempotente', () => {
    const inicial = 250_000;
    const monto   = 80_000;
    const tras = revertirGastoDeSaldo(aplicarGastoASaldo(inicial, monto), monto);
    expect(tras).toBe(inicial);
  });
});

// ── deltasPorEdicionDeGasto() ────────────────────────────────────

describe('deltasPorEdicionDeGasto()', () => {
  it('misma cuenta, mismo monto: no genera deltas', () => {
    const antes   = { cuentaId: 'c1', monto: 50_000 };
    const despues = { cuentaId: 'c1', monto: 50_000 };
    expect(deltasPorEdicionDeGasto(antes, despues)).toEqual({});
  });

  it('misma cuenta, monto sube: delta negativo (descontar la diferencia)', () => {
    const antes   = { cuentaId: 'c1', monto: 50_000 };
    const despues = { cuentaId: 'c1', monto: 80_000 };
    expect(deltasPorEdicionDeGasto(antes, despues)).toEqual({ c1: -30_000 });
  });

  it('misma cuenta, monto baja: delta positivo (devolver la diferencia)', () => {
    const antes   = { cuentaId: 'c1', monto: 80_000 };
    const despues = { cuentaId: 'c1', monto: 50_000 };
    expect(deltasPorEdicionDeGasto(antes, despues)).toEqual({ c1: 30_000 });
  });

  it('cambia de cuenta: revierte en la vieja, descuenta en la nueva', () => {
    const antes   = { cuentaId: 'c1', monto: 40_000 };
    const despues = { cuentaId: 'c2', monto: 40_000 };
    expect(deltasPorEdicionDeGasto(antes, despues)).toEqual({ c1: 40_000, c2: -40_000 });
  });

  it('cambia cuenta y monto', () => {
    const antes   = { cuentaId: 'c1', monto: 40_000 };
    const despues = { cuentaId: 'c2', monto: 60_000 };
    expect(deltasPorEdicionDeGasto(antes, despues)).toEqual({ c1: 40_000, c2: -60_000 });
  });

  it('el gasto antes no tenía cuenta (migración de gasto viejo)', () => {
    const antes   = { cuentaId: null, monto: 40_000 };
    const despues = { cuentaId: 'c2', monto: 40_000 };
    expect(deltasPorEdicionDeGasto(antes, despues)).toEqual({ c2: -40_000 });
  });

  it('el gasto pierde la cuenta (caso defensivo)', () => {
    const antes   = { cuentaId: 'c1', monto: 40_000 };
    const despues = { cuentaId: null, monto: 40_000 };
    expect(deltasPorEdicionDeGasto(antes, despues)).toEqual({ c1: 40_000 });
  });

  it('ambos sin cuenta: no genera deltas', () => {
    const antes   = { cuentaId: null, monto: 40_000 };
    const despues = { cuentaId: null, monto: 60_000 };
    expect(deltasPorEdicionDeGasto(antes, despues)).toEqual({});
  });
});

// ── FILTRAR GASTOS ───────────────────────────────────────────────

describe('filtrarGastos()', () => {
  const gastos = [
    gastoBase({ id: 'g1', categoria: 'Alimentación' }),
    gastoBase({ id: 'g2', categoria: 'Transporte'   }),
    gastoBase({ id: 'g3', categoria: 'Alimentación' }),
    gastoBase({ id: 'g4', categoria: 'Salud'        }),
  ];

  it('devuelve todos cuando categoria es null', () => {
    expect(filtrarGastos(gastos, null)).toHaveLength(4);
  });

  it('devuelve todos cuando categoria es cadena vacía', () => {
    expect(filtrarGastos(gastos, '')).toHaveLength(4);
  });

  it('devuelve todos cuando categoria es undefined', () => {
    expect(filtrarGastos(gastos, undefined)).toHaveLength(4);
  });

  it('filtra por categoría exacta', () => {
    const r = filtrarGastos(gastos, 'Alimentación');
    expect(r).toHaveLength(2);
    expect(r.map(g => g.id).sort()).toEqual(['g1', 'g3']);
  });

  it('devuelve array vacío si ningún gasto coincide', () => {
    expect(filtrarGastos(gastos, 'Vivienda')).toEqual([]);
  });

  it('trata gasto sin categoría como "Otros"', () => {
    const sinCat = [gastoBase({ id: 'x', categoria: undefined })];
    expect(filtrarGastos(sinCat, 'Otros')).toHaveLength(1);
    expect(filtrarGastos(sinCat, 'Alimentación')).toHaveLength(0);
  });

  it('no muta el array original', () => {
    const copia = [...gastos];
    filtrarGastos(gastos, 'Salud');
    expect(gastos).toEqual(copia);
  });

  it('devuelve array vacío con input vacío', () => {
    expect(filtrarGastos([], 'Alimentación')).toEqual([]);
  });
});

// ── renderFormGasto() - selector de cuenta ───────────────────────

describe('renderFormGasto() - selector de cuenta', () => {
  const cuenta = (id, nombre, saldo = 500_000) => ({
    id, nombre, saldo, banco: 'Nequi', tipo: 'Ahorros', activa: true,
  });

  beforeEach(() => {
    S.cuentas = [];
  });

  it('sin cuentas: empty state guiado, sin form, CTA que crea la cuenta', () => {
    S.cuentas = [];
    const html = renderFormGasto();
    expect(html).not.toContain('form-gasto');
    expect(html).toContain('Crear una cuenta');
    // El CTA no debe limitarse a informar: lleva directo a crear la cuenta.
    expect(html).toContain('data-action="ir-a-crear-cuenta"');
    expect(html).not.toContain('data-action="modal-close"');
  });

  it('con varias cuentas: selector de tarjetas (radios name="cuentaId") con todas las activas', () => {
    S.cuentas = [cuenta('c1', 'Bancolombia', 600_000), cuenta('c2', 'Nequi', 400_000)];
    const html = renderFormGasto();
    expect(html).toContain('form-gasto');
    expect(html).toContain('cuenta-sel__lista');
    expect(html).toContain('type="radio"');
    expect(html).toContain('name="cuentaId"');
    expect(html).toContain('value="c1"');
    expect(html).toContain('value="c2"');
  });

  it('pre-selecciona la cuenta de mayor saldo', () => {
    S.cuentas = [cuenta('c1', 'Bancolombia', 600_000), cuenta('c2', 'Nequi', 400_000)];
    const html = renderFormGasto();
    // El radio con value="c1" (mayor saldo) debe venir checked.
    expect(html).toMatch(/value="c1"[^>]*checked|checked[^>]*value="c1"/);
  });

  it('1 cuenta activa: una sola tarjeta pre-seleccionada', () => {
    S.cuentas = [cuenta('c1', 'Nequi principal', 1_000_000)];
    const html = renderFormGasto();
    expect(html).toContain('name="cuentaId"');
    expect(html).toContain('value="c1"');
    expect(html).toContain('checked');
  });

  it('incluye hint-categoria-fija oculto por defecto', () => {
    S.cuentas = [cuenta('c1', 'Nequi', 500_000)];
    const html = renderFormGasto();
    expect(html).toContain('id="hint-categoria-fija"');
    expect(html).toContain('hidden');
  });

  it('TX.9a: categoría es el primer campo del formulario', () => {
    S.cuentas = [cuenta('c1', 'Nequi', 500_000)];
    const html = renderFormGasto();
    expect(html.indexOf('name="categoria"')).toBeLessThan(html.indexOf('name="monto"'));
    expect(html.indexOf('name="categoria"')).toBeLessThan(html.indexOf('name="cuentaId"'));
    expect(html.indexOf('name="categoria"')).toBeLessThan(html.indexOf('name="fecha"'));
    expect(html.indexOf('name="categoria"')).toBeLessThan(html.indexOf('name="nota"'));
  });

  it('TX.9a: ya no pide descripción (la categoría es el concepto principal)', () => {
    S.cuentas = [cuenta('c1', 'Nequi', 500_000)];
    const html = renderFormGasto();
    expect(html).not.toContain('name="descripcion"');
  });

  it('TX.9a: Nota sigue siendo opcional, al final del formulario', () => {
    S.cuentas = [cuenta('c1', 'Nequi', 500_000)];
    const html = renderFormGasto();
    const inputNota = html.slice(html.indexOf('id="gasto-nota"'), html.indexOf('/>', html.indexOf('id="gasto-nota"')));
    expect(inputNota).not.toContain('required');
  });

  it('TX.9b: incluye la opción "+ Otra categoría…"', () => {
    S.cuentas = [cuenta('c1', 'Nequi', 500_000)];
    S.categoriasPersonalizadas = [];
    const html = renderFormGasto();
    expect(html).toContain(`value="${CATEGORIA_NUEVA_VALUE}"`);
    expect(html).toContain('Otra categoría');
  });

  it('TX.9b: las categorías personalizadas ya creadas aparecen como opción normal', () => {
    S.cuentas = [cuenta('c1', 'Nequi', 500_000)];
    S.categoriasPersonalizadas = [{ id: 'cat1', nombre: 'Gimnasio', icono: 'c-pesa' }];
    const html = renderFormGasto();
    expect(html).toContain('<option value="Gimnasio">Gimnasio</option>');
  });

  it('TX.9b: sin personalizadas, no agrega el optgroup', () => {
    S.cuentas = [cuenta('c1', 'Nequi', 500_000)];
    S.categoriasPersonalizadas = [];
    const html = renderFormGasto();
    expect(html).not.toContain('optgroup');
  });

  it('TX.9b: los campos de categoría nueva empiezan ocultos', () => {
    S.cuentas = [cuenta('c1', 'Nequi', 500_000)];
    const html = renderFormGasto();
    const bloque = html.slice(html.indexOf('id="categoria-nueva-fields"'), html.indexOf('id="categoria-nueva-fields"') + 60);
    expect(bloque).toContain('hidden');
  });

  it('TX.9b: la grilla de íconos tiene un botón por ícono del catálogo curado', () => {
    S.cuentas = [cuenta('c1', 'Nequi', 500_000)];
    const html = renderFormGasto();
    const botones = html.match(/icono-picker__btn/g) ?? [];
    expect(botones).toHaveLength(ICONOS_CATEGORIA_PERSONALIZADA.length);
  });

  it('CAT.2: el selector de ícono nace como recuadro colapsado, no como grilla siempre visible', () => {
    S.cuentas = [cuenta('c1', 'Nequi', 500_000)];
    const html = renderFormGasto();
    expect(html).toContain('icono-picker__recuadro');
    const div = document.createElement('div');
    div.innerHTML = html;
    expect(div.querySelector('.icono-picker__panel').hidden).toBe(true);
  });
});

// ── CATEGORIAS_TIPICAMENTE_FIJAS ────────────────────────────────

describe('CATEGORIAS_TIPICAMENTE_FIJAS', () => {
  it('marca Vivienda, Servicios públicos y Educación como fijas', () => {
    expect(CATEGORIAS_TIPICAMENTE_FIJAS.has('Vivienda')).toBe(true);
    expect(CATEGORIAS_TIPICAMENTE_FIJAS.has('Servicios públicos')).toBe(true);
    expect(CATEGORIAS_TIPICAMENTE_FIJAS.has('Educación')).toBe(true);
  });

  it('no marca categorías variables como fijas', () => {
    expect(CATEGORIAS_TIPICAMENTE_FIJAS.has('Mercado')).toBe(false);
    expect(CATEGORIAS_TIPICAMENTE_FIJAS.has('Restaurantes')).toBe(false);
    expect(CATEGORIAS_TIPICAMENTE_FIJAS.has('Transporte')).toBe(false);
    expect(CATEGORIAS_TIPICAMENTE_FIJAS.has('Entretenimiento')).toBe(false);
    expect(CATEGORIAS_TIPICAMENTE_FIJAS.has('Otros')).toBe(false);
  });
});

// ── ÍCONO POR ORIGEN (TX.6 / TX.7, ids de sprite desde ID.3) ─────

describe('iconoPorOrigen (TX.6/TX.7)', () => {
  const compromisos = [
    { id: 'c-fijo',    tipo: 'fijo',           categoria: 'Arriendo' },
    { id: 'c-sin-cat', tipo: 'fijo',           categoria: null },
    { id: 'c-banco',   tipo: 'deuda-entidad',  categoria: 'Tarjeta de crédito' },
    { id: 'c-primo',   tipo: 'deuda-personal', categoria: 'Familiar' },
  ];

  it('TX.6: un gasto nacido de un fijo hereda el ícono de su categoría de Agenda', () => {
    const gasto = { id: 'g1', categoria: 'Otros', compromisoId: 'c-fijo' };
    expect(iconoPorOrigen(gasto, compromisos)).toBe('i-home');
  });

  it('TX.7: un abono a deuda con entidad muestra la institución (i-cuentas)', () => {
    const gasto = { id: 'g2', categoria: 'Deudas', compromisoId: 'c-banco' };
    expect(iconoPorOrigen(gasto, compromisos)).toBe('i-cuentas');
  });

  it('TX.7: un abono a deuda personal muestra la persona (i-personales)', () => {
    const gasto = { id: 'g3', categoria: 'Deudas', compromisoId: 'c-primo' };
    expect(iconoPorOrigen(gasto, compromisos)).toBe('i-personales');
  });

  it('sin compromisoId devuelve null (el caller usa la categoría del gasto)', () => {
    expect(iconoPorOrigen({ id: 'g4', categoria: 'Mercado' }, compromisos)).toBeNull();
  });

  it('compromiso eliminado devuelve null (fallback del caller)', () => {
    const gasto = { id: 'g5', categoria: 'Deudas', compromisoId: 'no-existe' };
    expect(iconoPorOrigen(gasto, compromisos)).toBeNull();
  });

  it('fijo sin categoría devuelve null (fallback del caller)', () => {
    const gasto = { id: 'g6', categoria: 'Otros', compromisoId: 'c-sin-cat' };
    expect(iconoPorOrigen(gasto, compromisos)).toBeNull();
  });

  it('tolera lista de compromisos ausente', () => {
    const gasto = { id: 'g7', categoria: 'Otros', compromisoId: 'c-fijo' };
    expect(iconoPorOrigen(gasto, undefined)).toBeNull();
    expect(iconoPorOrigen(gasto, [])).toBeNull();
  });
});

// ── renderListaGastos() / renderFiltrosGastos() - categorías internas (TX.8b) ──

describe('Gastos deja de listar categorías internas (TX.8b)', () => {
  /** Fecha dentro del mes que _ensureMes() usa por defecto (mes real actual). */
  const mesActual = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-15`;
  };

  beforeEach(() => {
    document.body.innerHTML = `
      <div id="panel-filtros-gastos"></div>
      <div id="lista-gastos"></div>`;
    S.gastos = [];
  });

  it('un gasto con categoría "Deudas" no aparece en la lista', () => {
    S.gastos = [gastoBase({ id: 'g1', categoria: 'Deudas', descripcion: 'Abono: Préstamo', fecha: mesActual() })];
    renderListaGastos();
    expect(document.getElementById('lista-gastos').innerHTML).not.toContain('Abono: Préstamo');
  });

  it('un gasto con categoría "Gastos fijos" no aparece en la lista', () => {
    S.gastos = [gastoBase({ id: 'g1', categoria: 'Gastos fijos', descripcion: 'Pago: Arriendo', fecha: mesActual() })];
    renderListaGastos();
    expect(document.getElementById('lista-gastos').innerHTML).not.toContain('Pago: Arriendo');
  });

  it('si solo hay gastos internos ese mes, muestra el estado vacío normal', () => {
    S.gastos = [gastoBase({ id: 'g1', categoria: 'Deudas', fecha: mesActual() })];
    renderListaGastos();
    expect(document.getElementById('lista-gastos').querySelector('.empty-state')).not.toBeNull();
  });

  it('un gasto cotidiano sigue apareciendo junto a uno interno', () => {
    S.gastos = [
      gastoBase({ id: 'g1', categoria: 'Deudas', fecha: mesActual() }),
      gastoBase({ id: 'g2', categoria: 'Mercado', descripcion: 'Mercado semana', fecha: mesActual() }),
    ];
    renderListaGastos();
    expect(document.getElementById('lista-gastos').innerHTML).toContain('Mercado semana');
  });

  it('el total del resumen excluye los gastos internos', () => {
    S.gastos = [
      gastoBase({ id: 'g1', categoria: 'Deudas', monto: 200_000, fecha: mesActual() }),
      gastoBase({ id: 'g2', categoria: 'Mercado', monto: 15_000, fecha: mesActual() }),
    ];
    renderListaGastos();
    const html = document.getElementById('lista-gastos').innerHTML;
    expect(html).toContain('$15.000');
    expect(html).not.toContain('$200.000');
  });

  it('los chips de categoría no ofrecen "Deudas" ni "Gastos fijos"', () => {
    S.gastos = [
      gastoBase({ id: 'g1', categoria: 'Deudas', fecha: mesActual() }),
      gastoBase({ id: 'g2', categoria: 'Mercado', fecha: mesActual() }),
    ];
    renderFiltrosGastos();
    const html = document.getElementById('panel-filtros-gastos').innerHTML;
    expect(html).not.toContain('data-cat="Deudas"');
    expect(html).not.toContain('data-cat="Gastos fijos"');
    expect(html).toContain('data-cat="Mercado"');
  });
});

// ── renderListaGastos() - categoría como título del ítem (TX.9a) ──

describe('renderListaGastos() - categoría como título del ítem (TX.9a)', () => {
  const mesActual = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-15`;
  };

  beforeEach(() => {
    document.body.innerHTML = '<div id="lista-gastos"></div>';
    S.gastos = [];
  });

  it('el título del ítem es la categoría, no la descripción', () => {
    S.gastos = [gastoBase({ categoria: 'Transporte', descripcion: 'Uber al trabajo', fecha: mesActual() })];
    renderListaGastos();
    const titulo = document.querySelector('#lista-gastos .list-item__title').textContent;
    expect(titulo).toContain('Transporte');
  });

  it('sin descripción (formulario nuevo, TX.9a), el título sigue siendo la categoría', () => {
    S.gastos = [gastoBase({ categoria: 'Restaurantes', descripcion: undefined, fecha: mesActual() })];
    renderListaGastos();
    const item = document.querySelector('#lista-gastos .list-item');
    expect(item.querySelector('.list-item__title').textContent).toContain('Restaurantes');
    expect(item.innerHTML).not.toContain('undefined');
  });

  it('una descripción legacy (gastos de antes de TX.9a) se preserva en el subtítulo', () => {
    S.gastos = [gastoBase({ categoria: 'Mercado', descripcion: 'Mercado de fin de mes', fecha: mesActual() })];
    renderListaGastos();
    const subtitulo = document.querySelector('#lista-gastos .list-item__subtitle').textContent;
    expect(subtitulo).toContain('Mercado de fin de mes');
  });

  it('la nota sigue apareciendo en el subtítulo', () => {
    S.gastos = [gastoBase({ categoria: 'Salud', nota: 'Con receta médica', fecha: mesActual() })];
    renderListaGastos();
    const subtitulo = document.querySelector('#lista-gastos .list-item__subtitle').textContent;
    expect(subtitulo).toContain('Con receta médica');
  });
});

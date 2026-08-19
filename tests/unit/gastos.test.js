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
  variacionMensualGasto,
  agruparPorDia,
  gastosFrecuentes,
  tarjetasDeCredito,
  efectoEnDeuda,
  deltasPorEdicionEnDeuda,
  efectoEnCuotaMensual,
  deltasPorEdicionEnCuotaMensual,
  excesoDeCupo,
  consecuenciaDeGasto,
} from '../../modules/dominio/gastos/logic.js';
import { renderFormGasto, renderListaGastos, renderFiltrosGastos, setFiltroCategoria, navegarMesGastos, irAMesActual, CATEGORIA_NUEVA_VALUE } from '../../modules/dominio/gastos/view.js';
import { CATEGORIAS_GASTO, CATEGORIAS_GASTO_USUARIO, ICONOS_CATEGORIA_PERSONALIZADA } from '../../modules/core/constants.js';
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

/** Mismos nombres que el array MONTHS de la vista, en minúscula (DIS.4/G1). */
const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];
const mesActual = () => MESES[new Date().getMonth()];

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
    expect(validarCategoriaPersonalizada({ nombre: 'Suplementos', icono: 'c-pesa' }, [])).toEqual([]);
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
    const errores = validarCategoriaPersonalizada({ nombre: 'Suplementos', icono: '' }, []);
    expect(errores.some(e => /ícono/i.test(e))).toBe(true);
  });

  it('reporta error si el ícono no está en el catálogo curado (defensivo)', () => {
    const errores = validarCategoriaPersonalizada({ nombre: 'Suplementos', icono: 'c-mercado' }, []);
    expect(errores.some(e => /ícono/i.test(e))).toBe(true);
  });

  it('reporta error si el nombre duplica una categoría nativa de Gastos', () => {
    const errores = validarCategoriaPersonalizada({ nombre: 'Mercado', icono: 'c-pesa' }, []);
    expect(errores.some(e => /existe/i.test(e))).toBe(true);
  });

  it('reporta error si el nombre duplica una categoría nativa de Gastos fijos (D4, ADR 058)', () => {
    const errores = validarCategoriaPersonalizada({ nombre: 'Gimnasio', icono: 'c-pesa' }, []);
    expect(errores.some(e => /existe/i.test(e))).toBe(true);
  });

  it('la duplicación de nativa no distingue mayúsculas ni tildes', () => {
    const errores = validarCategoriaPersonalizada({ nombre: 'mercadó', icono: 'c-pesa' }, []);
    expect(errores.some(e => /existe/i.test(e))).toBe(true);
  });

  it('reporta error si el nombre duplica una categoría personalizada ya creada', () => {
    const existentes = [{ nombre: 'Suplementos', icono: 'c-pesa' }];
    const errores = validarCategoriaPersonalizada({ nombre: 'Suplementos', icono: 'c-carro' }, existentes);
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

  // MC.16b (ADR 051 D3): el selector de origen es uno solo y una tarjeta llega
  // prefijada; el consumo no descuenta cuenta y apunta a la tarjeta.
  it('MC.16b: origen con prefijo tc: deja cuentaId en null y apunta a la tarjeta', () => {
    const result = normalizarGasto({ ...datosFormValidos, cuentaId: 'tc:d1' });
    expect(result.cuentaId).toBeNull();
    expect(result.compromisoId).toBe('d1');
    expect(result.consumoTC).toBe(true);
  });

  it('MC.16b: un gasto pagado con cuenta marca consumoTC en false', () => {
    const result = normalizarGasto(datosFormValidos);
    expect(result.consumoTC).toBe(false);
    expect(result.compromisoId).toBeNull();
  });

  it('MC.16b: consumoTC false explícito limpia el flag al editar (editar() hace merge superficial)', () => {
    // Un consumo que pasa a pagarse con cuenta no puede quedarse con el flag.
    const result = normalizarGasto({ ...datosFormValidos, cuentaId: 'c1' });
    expect(result).toHaveProperty('consumoTC', false);
  });

  it('MC.16b: un abono (compromisoId sin prefijo) no se confunde con un consumo', () => {
    const result = normalizarGasto({ ...datosFormValidos, compromisoId: 'd9' });
    expect(result.compromisoId).toBe('d9');
    expect(result.consumoTC).toBe(false);
    expect(result.cuentaId).toBe('c1');
  });

  // MC.16d: cuotas solo aplica a un consumo con tarjeta.
  it('MC.16d: un consumo con tarjeta toma las cuotas elegidas', () => {
    const result = normalizarGasto({ ...datosFormValidos, cuentaId: 'tc:d1', cuotas: '6' });
    expect(result.cuotas).toBe(6);
  });

  it('MC.16d: sin cuotas en el form, un consumo con tarjeta cae a 1 (pago único)', () => {
    const result = normalizarGasto({ ...datosFormValidos, cuentaId: 'tc:d1' });
    expect(result.cuotas).toBe(1);
  });

  it('MC.16d: un gasto pagado con cuenta no lleva cuotas (null explícito, limpia el dato al editar)', () => {
    const result = normalizarGasto({ ...datosFormValidos, cuotas: '12' });
    expect(result.cuotas).toBeNull();
  });

  // MC.16e (ADR 051 D7): la marca del avance solo existe para el aviso de costo.
  it('MC.16e: un consumo marcado como avance guarda avanceTC', () => {
    const result = normalizarGasto({ ...datosFormValidos, cuentaId: 'tc:d1', avanceTC: '1' });
    expect(result.avanceTC).toBe(true);
  });

  it('MC.16e: un consumo sin la marca es una compra (checkbox ausente en FormData)', () => {
    const result = normalizarGasto({ ...datosFormValidos, cuentaId: 'tc:d1' });
    expect(result.avanceTC).toBe(false);
  });

  it('MC.16e: pagar con cuenta limpia avanceTC aunque el form lo traiga (merge superficial de editar())', () => {
    const result = normalizarGasto({ ...datosFormValidos, avanceTC: '1' });
    expect(result).toHaveProperty('avanceTC', false);
  });

  it('MC.16e: la marca no toca el saldo ni la cuota (solo dispara el aviso)', () => {
    const compra = normalizarGasto({ ...datosFormValidos, cuentaId: 'tc:d1', cuotas: '3' });
    const avance = normalizarGasto({ ...datosFormValidos, cuentaId: 'tc:d1', cuotas: '3', avanceTC: '1' });
    expect(efectoEnDeuda(avance)).toBe(efectoEnDeuda(compra));
    expect(efectoEnCuotaMensual(avance)).toBe(efectoEnCuotaMensual(compra));
  });
});

// ── excesoDeCupo() (MC.16e) ──────────────────────────────────────

describe('excesoDeCupo()', () => {
  const tarjeta = (overrides = {}) => ({
    id: 'd1', cupoTotal: 5_000_000, saldoTotal: 4_500_000, ...overrides,
  });

  it('devuelve null cuando el consumo cabe en el cupo disponible', () => {
    expect(excesoDeCupo(tarjeta(), 500_000)).toBeNull();
  });

  it('devuelve el exceso y el disponible cuando se pasa', () => {
    expect(excesoDeCupo(tarjeta(), 800_000)).toEqual({ disponible: 500_000, exceso: 300_000 });
  });

  it('el borde exacto del cupo no es exceso', () => {
    expect(excesoDeCupo(tarjeta(), 500_000)).toBeNull();
  });

  it('sin cupo registrado no hay con qué comparar (deuda vieja, no tarjeta operable)', () => {
    expect(excesoDeCupo(tarjeta({ cupoTotal: null }), 9_000_000)).toBeNull();
    expect(excesoDeCupo(null, 9_000_000)).toBeNull();
  });

  it('una tarjeta ya sobregirada deja el disponible en cero, nunca negativo', () => {
    const r = excesoDeCupo(tarjeta({ saldoTotal: 6_000_000 }), 100_000);
    expect(r).toEqual({ disponible: 0, exceso: 100_000 });
  });

  it('al editar, el monto anterior vuelve al cupo antes de comparar', () => {
    // El saldo de la tarjeta ya carga los $800.000 del consumo que se edita:
    // subirlo a $900.000 solo ocupa $100.000 más, no $900.000 otra vez.
    const t = tarjeta({ saldoTotal: 4_800_000 });
    expect(excesoDeCupo(t, 900_000, 800_000)).toBeNull();
    expect(excesoDeCupo(t, 900_000)).toEqual({ disponible: 200_000, exceso: 700_000 });
  });

  it('monto vacío o cero no avisa nada', () => {
    expect(excesoDeCupo(tarjeta({ saldoTotal: 5_000_000 }), 0)).toBeNull();
    expect(excesoDeCupo(tarjeta({ saldoTotal: 5_000_000 }), NaN)).toBeNull();
  });
});

// ── consecuenciaDeGasto() (GAS.2b, ADR 060) ──────────────────────

describe('consecuenciaDeGasto()', () => {
  const progresoOk       = { gastado: 100_000, asignado: 500_000, restante: 400_000, estado: 'ok' };
  const progresoAlerta   = { gastado: 400_000, asignado: 500_000, restante: 100_000, estado: 'alerta' };
  const progresoExcedido = { gastado: 600_000, asignado: 500_000, restante: -100_000, estado: 'excedido' };

  it('prioridad 1: límite excedido, con el monto pasado en la cifra', () => {
    const r = consecuenciaDeGasto({ progreso: progresoExcedido, categoria: 'Mercado', ocultarSaldo: false });
    expect(r).toEqual({ texto: 'Te pasaste $100.000 del límite de Mercado este mes.', tono: 'peligro' });
  });

  it('prioridad 2: límite en alerta (75%-100%), con lo que resta', () => {
    const r = consecuenciaDeGasto({ progreso: progresoAlerta, categoria: 'Mercado', ocultarSaldo: false });
    expect(r).toEqual({ texto: 'Te quedan $100.000 en Mercado este mes.', tono: 'alerta' });
  });

  it('prioridad 3: sin límite que avisar, cae al saldo de la cuenta usada', () => {
    const r = consecuenciaDeGasto({
      progreso: progresoOk, categoria: 'Mercado',
      saldoCuenta: 250_000, nombreCuenta: 'Bancolombia',
      ocultarSaldo: false,
    });
    expect(r).toEqual({ texto: 'Quedan $250.000 en Bancolombia.', tono: 'ok' });
  });

  it('sin presupuesto para la categoría (progreso null) también cae al saldo de cuenta', () => {
    const r = consecuenciaDeGasto({
      progreso: null, categoria: 'Otros',
      saldoCuenta: 900_000, nombreCuenta: 'Nequi',
      ocultarSaldo: false,
    });
    expect(r).toEqual({ texto: 'Quedan $900.000 en Nequi.', tono: 'ok' });
  });

  it('caso "nada que decir": sin límite y sin cuenta (repartido o consumo con tarjeta)', () => {
    expect(consecuenciaDeGasto({ progreso: progresoOk, categoria: 'Mercado', ocultarSaldo: false })).toBeNull();
    expect(consecuenciaDeGasto({ progreso: null, categoria: 'Mercado', ocultarSaldo: false })).toBeNull();
  });

  it('gasto repartido o consumo con tarjeta: sin cuenta única, el límite sigue avisando', () => {
    const r = consecuenciaDeGasto({ progreso: progresoExcedido, categoria: 'Mercado', saldoCuenta: null, ocultarSaldo: false });
    expect(r?.tono).toBe('peligro');
  });

  it('ojo de privacidad activo: ninguna cifra, ni de límite ni de saldo', () => {
    expect(consecuenciaDeGasto({
      progreso: progresoExcedido, categoria: 'Mercado',
      saldoCuenta: 250_000, nombreCuenta: 'Bancolombia',
      ocultarSaldo: true,
    })).toBeNull();
    expect(consecuenciaDeGasto({
      progreso: progresoAlerta, categoria: 'Mercado',
      ocultarSaldo: true,
    })).toBeNull();
  });
});

// ── deltasPorEdicionEnDeuda() ────────────────────────────────────

describe('deltasPorEdicionEnDeuda()', () => {
  const abono   = (monto, id = 'd1') => ({ compromisoId: id, monto, consumoTC: false });
  const consumo = (monto, id = 'd1') => ({ compromisoId: id, monto, consumoTC: true });

  it('crear un consumo sube el saldo de la tarjeta', () => {
    expect(deltasPorEdicionEnDeuda(null, consumo(200_000))).toEqual({ d1: 200_000 });
  });

  it('crear un abono baja el saldo de la deuda (ADR 002, signo contrario)', () => {
    expect(deltasPorEdicionEnDeuda(null, abono(200_000))).toEqual({ d1: -200_000 });
  });

  it('eliminar un consumo lo revierte: el saldo baja lo mismo que subió', () => {
    expect(deltasPorEdicionEnDeuda(consumo(200_000), null)).toEqual({ d1: -200_000 });
  });

  it('eliminar un abono lo revierte: el saldo vuelve a subir', () => {
    expect(deltasPorEdicionEnDeuda(abono(200_000), null)).toEqual({ d1: 200_000 });
  });

  it('subir el monto de un consumo mueve solo la diferencia', () => {
    expect(deltasPorEdicionEnDeuda(consumo(200_000), consumo(250_000))).toEqual({ d1: 50_000 });
  });

  it('bajar el monto de un consumo devuelve la diferencia', () => {
    expect(deltasPorEdicionEnDeuda(consumo(200_000), consumo(120_000))).toEqual({ d1: -80_000 });
  });

  it('editar un consumo sin cambiar el monto no mueve nada', () => {
    expect(deltasPorEdicionEnDeuda(consumo(200_000), consumo(200_000))).toEqual({});
  });

  it('cambiar de tarjeta revierte en una y aplica en la otra', () => {
    expect(deltasPorEdicionEnDeuda(consumo(200_000, 'd1'), consumo(200_000, 'd2')))
      .toEqual({ d1: -200_000, d2: 200_000 });
  });

  it('un consumo que pasa a pagarse con cuenta se revierte y no toca ninguna deuda nueva', () => {
    const conCuenta = { compromisoId: null, monto: 200_000, consumoTC: false };
    expect(deltasPorEdicionEnDeuda(consumo(200_000), conCuenta)).toEqual({ d1: -200_000 });
  });

  it('un gasto sin deuda editado a otro sin deuda no genera deltas', () => {
    const sinDeuda = { compromisoId: null, monto: 50_000 };
    expect(deltasPorEdicionEnDeuda(sinDeuda, sinDeuda)).toEqual({});
  });

  it('el signo no se invierte si un abono y un consumo comparten compromisoId', () => {
    // El caso que obliga a que exista consumoTC (ADR 051 D3): la misma tarjeta
    // recibe abonos y consumos, y el compromisoId solo no dice en qué sentido.
    expect(deltasPorEdicionEnDeuda(abono(100_000), consumo(100_000))).toEqual({ d1: 200_000 });
  });
});

// ── efectoEnDeuda() ──────────────────────────────────────────────

describe('efectoEnDeuda()', () => {
  it('un consumo suma su monto', () => {
    expect(efectoEnDeuda({ compromisoId: 'd1', monto: 90_000, consumoTC: true })).toBe(90_000);
  });

  it('un abono resta su monto', () => {
    expect(efectoEnDeuda({ compromisoId: 'd1', monto: 90_000 })).toBe(-90_000);
  });

  it('un gasto sin deuda no tiene efecto', () => {
    expect(efectoEnDeuda({ monto: 90_000 })).toBe(0);
    expect(efectoEnDeuda(null)).toBe(0);
  });
});

// ── efectoEnCuotaMensual() (MC.16d) ───────────────────────────────

describe('efectoEnCuotaMensual()', () => {
  it('un consumo a 1 cuota (pago único) suma el monto completo', () => {
    expect(efectoEnCuotaMensual({ compromisoId: 'd1', monto: 90_000, consumoTC: true, cuotas: 1 })).toBe(90_000);
  });

  it('un consumo a varias cuotas suma monto/cuotas, redondeado', () => {
    expect(efectoEnCuotaMensual({ compromisoId: 'd1', monto: 100_000, consumoTC: true, cuotas: 3 })).toBe(33_333);
  });

  it('sin cuotas en el dato (legacy) equivale a 1 cuota', () => {
    expect(efectoEnCuotaMensual({ compromisoId: 'd1', monto: 90_000, consumoTC: true })).toBe(90_000);
  });

  it('un abono no tiene efecto (opera sobre saldoTotal, no sobre la cuota proyectada)', () => {
    expect(efectoEnCuotaMensual({ compromisoId: 'd1', monto: 90_000, consumoTC: false })).toBe(0);
  });

  it('un gasto sin deuda no tiene efecto', () => {
    expect(efectoEnCuotaMensual({ monto: 90_000, consumoTC: true })).toBe(0);
    expect(efectoEnCuotaMensual(null)).toBe(0);
  });
});

// ── deltasPorEdicionEnCuotaMensual() (MC.16d) ─────────────────────

describe('deltasPorEdicionEnCuotaMensual()', () => {
  const consumo = (monto, cuotas = 1, id = 'd1') => ({ compromisoId: id, monto, consumoTC: true, cuotas });
  const abono   = (monto, id = 'd1') => ({ compromisoId: id, monto, consumoTC: false });

  it('crear un consumo a 1 cuota sube cuotaMensual el monto completo', () => {
    expect(deltasPorEdicionEnCuotaMensual(null, consumo(200_000))).toEqual({ d1: 200_000 });
  });

  it('crear un consumo diferido sube cuotaMensual solo la cuota mensual', () => {
    expect(deltasPorEdicionEnCuotaMensual(null, consumo(300_000, 3))).toEqual({ d1: 100_000 });
  });

  it('crear un abono no mueve cuotaMensual', () => {
    expect(deltasPorEdicionEnCuotaMensual(null, abono(200_000))).toEqual({});
  });

  it('eliminar un consumo revierte lo que había sumado', () => {
    expect(deltasPorEdicionEnCuotaMensual(consumo(300_000, 3), null)).toEqual({ d1: -100_000 });
  });

  it('cambiar de 1 a 6 cuotas sobre el mismo monto baja el aporte mensual', () => {
    expect(deltasPorEdicionEnCuotaMensual(consumo(600_000, 1), consumo(600_000, 6))).toEqual({ d1: -500_000 });
  });

  it('editar un consumo sin cambiar monto ni cuotas no mueve nada', () => {
    expect(deltasPorEdicionEnCuotaMensual(consumo(200_000, 2), consumo(200_000, 2))).toEqual({});
  });
});

// ── tarjetasDeCredito() ──────────────────────────────────────────

describe('tarjetasDeCredito()', () => {
  const tarjeta = (overrides = {}) => ({
    id: 'd1',
    descripcion: 'Tarjeta Bancolombia',
    tipo: 'deuda-entidad',
    categoria: 'Tarjeta de crédito',
    cupoTotal: 5_000_000,
    saldoTotal: 1_000_000,
    activo: true,
    ...overrides,
  });

  it('devuelve la tarjeta con cupo registrado', () => {
    expect(tarjetasDeCredito([tarjeta()])).toHaveLength(1);
  });

  it('excluye la deuda de tarjeta sin cupo (deuda vieja, no producto operable)', () => {
    expect(tarjetasDeCredito([tarjeta({ cupoTotal: null })])).toEqual([]);
    expect(tarjetasDeCredito([tarjeta({ cupoTotal: 0 })])).toEqual([]);
  });

  it('excluye otras categorías de deuda y las deudas personales', () => {
    expect(tarjetasDeCredito([tarjeta({ categoria: 'Vehículo' })])).toEqual([]);
    expect(tarjetasDeCredito([tarjeta({ tipo: 'deuda-personal' })])).toEqual([]);
  });

  it('excluye la tarjeta archivada: ya no recibe consumos', () => {
    expect(tarjetasDeCredito([tarjeta({ activo: false })])).toEqual([]);
  });

  it('tolera undefined y lista vacía', () => {
    expect(tarjetasDeCredito(undefined)).toEqual([]);
    expect(tarjetasDeCredito([])).toEqual([]);
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

  const tarjetaTC = (overrides = {}) => ({
    id: 'd1',
    descripcion: 'Tarjeta Bancolombia',
    tipo: 'deuda-entidad',
    categoria: 'Tarjeta de crédito',
    cupoTotal: 5_000_000,
    saldoTotal: 1_000_000,
    activo: true,
    ...overrides,
  });

  beforeEach(() => {
    S.cuentas = [];
    S.compromisos = [];
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

  // MC.16b (ADR 051 D4): Gastos es el único formulario que ofrece tarjetas.
  it('MC.16b: con tarjeta operable, el selector la ofrece prefijada y en su grupo', () => {
    S.cuentas = [cuenta('c1', 'Bancolombia', 600_000)];
    S.compromisos = [tarjetaTC()];
    const html = renderFormGasto();
    expect(html).toContain('value="tc:d1"');
    expect(html).toContain('cuenta-sel__grupo');
    expect(html).toContain('Tarjetas de crédito');
    // La pregunta deja de asumir que todo sale de una cuenta.
    expect(html).toContain('¿Con qué pagaste?');
  });

  it('MC.16b: la tarjeta nunca viene pre-seleccionada (el default sigue siendo una cuenta)', () => {
    S.cuentas = [cuenta('c1', 'Bancolombia', 600_000)];
    S.compromisos = [tarjetaTC()];
    const html = renderFormGasto();
    expect(html).not.toMatch(/value="tc:d1"[^>]*checked/);
    expect(html).toMatch(/value="c1"[^>]*checked/);
  });

  it('MC.16b: muestra el cupo disponible de la tarjeta, no un saldo', () => {
    S.cuentas = [cuenta('c1', 'Bancolombia', 600_000)];
    S.compromisos = [tarjetaTC({ cupoTotal: 5_000_000, saldoTotal: 1_000_000 })];
    expect(renderFormGasto()).toContain('Cupo $4.000.000');
  });

  it('MC.16b: sin tarjetas operables, el formulario no cambia de pregunta', () => {
    S.cuentas = [cuenta('c1', 'Bancolombia', 600_000)];
    S.compromisos = [tarjetaTC({ cupoTotal: null })];
    const html = renderFormGasto();
    expect(html).not.toContain('value="tc:d1"');
    expect(html).toContain('¿De qué cuenta sale el dinero?');
  });

  // MC.16d: "¿A cuántas cuotas?" vive en el form (radios, no <select>), oculto
  // por defecto: el JS de index.js lo revela al elegir una tarjeta.
  it('MC.16d: el bloque de cuotas existe oculto, con "1 cuota" pre-marcada', () => {
    S.cuentas = [cuenta('c1', 'Bancolombia', 600_000)];
    S.compromisos = [tarjetaTC()];
    const html = renderFormGasto();
    expect(html).toMatch(/id="grupo-gasto-cuotas"[^>]*hidden/);
    expect(html).toContain('name="cuotas"');
    expect(html).toMatch(/value="1"[^>]*checked/);
    expect(html).not.toContain('<select');
  });

  it('MC.16d: el bloque de cuotas existe aunque no haya tarjetas operables (siempre en el DOM)', () => {
    S.cuentas = [cuenta('c1', 'Bancolombia', 600_000)];
    const html = renderFormGasto();
    expect(html).toContain('name="cuotas"');
  });

  // MC.16e (ADR 051 D7): la marca del avance y sus dos avisos viven en el form,
  // ocultos; index.js los revela según el origen, la marca y el monto.
  it('MC.16e: el bloque del avance existe oculto y sin marcar', () => {
    S.cuentas = [cuenta('c1', 'Bancolombia', 600_000)];
    S.compromisos = [tarjetaTC()];
    const html = renderFormGasto();
    expect(html).toMatch(/id="grupo-gasto-avance"[^>]*hidden/);
    expect(html).toContain('name="avanceTC"');
    expect(html).not.toMatch(/name="avanceTC"[^>]*checked/);
  });

  it('MC.16e: el aviso del avance nombra su costo, sin calificar la decisión', () => {
    S.cuentas = [cuenta('c1', 'Bancolombia', 600_000)];
    S.compromisos = [tarjetaTC()];
    const html = renderFormGasto();
    expect(html).toMatch(/id="gasto-avance-nudge"[^>]*hidden/);
    expect(html).toContain('intereses desde el mismo día');
    expect(html).toContain('cajero de otra red');
  });

  it('MC.16e: el aviso de sobrecupo nace vacío y con aria-live (lo llena index.js)', () => {
    S.cuentas = [cuenta('c1', 'Bancolombia', 600_000)];
    S.compromisos = [tarjetaTC()];
    const html = renderFormGasto();
    expect(html).toMatch(/id="gasto-sobrecupo-nudge"[^>]*aria-live="polite"/);
    expect(html).toMatch(/id="gasto-sobrecupo-nudge"[^>]*hidden/);
  });

  it('CAT.1a: el hint "normalmente pertenece a fijos" ya no existe (retirado, ADR 014)', () => {
    S.cuentas = [cuenta('c1', 'Nequi', 500_000)];
    const html = renderFormGasto();
    expect(html).not.toContain('hint-categoria-fija');
  });

  it('CAT.1a: el formulario ya no ofrece Vivienda ni Servicios públicos como opción', () => {
    S.cuentas = [cuenta('c1', 'Nequi', 500_000)];
    const html = renderFormGasto();
    expect(html).not.toContain('value="Vivienda"');
    expect(html).not.toContain('value="Servicios públicos"');
  });

  it('FORM.1a: el monto es el primer campo (hero) y la categoría va antes de cuenta, fecha y nota', () => {
    // ADR 042 D2 revisa el orden de TX.9a: el monto pasa al frente ("el
    // monto es el protagonista", decisión del mockup de Esteban); la
    // categoría sigue antes que el resto de campos.
    S.cuentas = [cuenta('c1', 'Nequi', 500_000)];
    const html = renderFormGasto();
    expect(html.indexOf('name="monto"')).toBeLessThan(html.indexOf('name="categoria"'));
    expect(html.indexOf('name="categoria"')).toBeLessThan(html.indexOf('name="cuentaId"'));
    expect(html.indexOf('name="categoria"')).toBeLessThan(html.indexOf('name="fecha"'));
    expect(html.indexOf('name="categoria"')).toBeLessThan(html.indexOf('name="nota"'));
  });

  it('FORM.1a: la categoría son chips con radios reales, uno por categoría visible + "Otra categoría"', () => {
    S.cuentas = [cuenta('c1', 'Nequi', 500_000)];
    S.categoriasPersonalizadas = [];
    const html = renderFormGasto();
    expect(html).toContain('chips-cat');
    expect(html).not.toContain('<select');
    const radios = html.match(/name="categoria"/g) ?? [];
    expect(radios).toHaveLength(CATEGORIAS_GASTO_USUARIO.length + 1);
  });

  it('FORM.1a: el monto vive en el hero con el input grande centrado', () => {
    S.cuentas = [cuenta('c1', 'Nequi', 500_000)];
    const html = renderFormGasto();
    expect(html).toContain('monto-hero__box');
    expect(html).toContain('input--big-amount');
  });

  it('FORM.1a: la fecha ofrece atajos Hoy/Ayer/Otra fecha con Hoy por defecto y el date oculto', () => {
    S.cuentas = [cuenta('c1', 'Nequi', 500_000)];
    const html = renderFormGasto();
    const div = document.createElement('div');
    div.innerHTML = html;
    const hoyRadio = div.querySelector('input[name="fechaOpcion"][value="hoy"]');
    expect(hoyRadio?.checked).toBe(true);
    expect(div.querySelectorAll('input[name="fechaOpcion"]')).toHaveLength(3);
    expect(div.querySelector('#gasto-fecha-otra')?.hidden).toBe(true);
    // El input date real ya trae la fecha de hoy (regla CAT.4 en este form).
    expect(div.querySelector('#gasto-fecha')?.value).toMatch(/^\d{4}-\d{2}-\d{2}$/);
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

  it('TX.9b: las categorías personalizadas ya creadas aparecen como chip normal, con su ícono', () => {
    S.cuentas = [cuenta('c1', 'Nequi', 500_000)];
    S.categoriasPersonalizadas = [{ id: 'cat1', nombre: 'Gimnasio', icono: 'c-pesa' }];
    const html = renderFormGasto();
    expect(html).toContain('value="Gimnasio"');
    expect(html).toContain('#c-pesa');
  });

  it('TX.9b: sin personalizadas, solo las nativas + "Otra categoría"', () => {
    S.cuentas = [cuenta('c1', 'Nequi', 500_000)];
    S.categoriasPersonalizadas = [];
    const html = renderFormGasto();
    expect(html).not.toContain('value="Gimnasio"');
    const radios = html.match(/name="categoria"/g) ?? [];
    expect(radios).toHaveLength(CATEGORIAS_GASTO_USUARIO.length + 1);
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

// ── CAT.1a: taxonomía Gastos↔Fijos (2026-07-13) ─────────────────

describe('CATEGORIAS_GASTO_USUARIO (taxonomía CAT.1a)', () => {
  it('excluye Vivienda y Servicios públicos: son exclusivos de Gastos fijos', () => {
    expect(CATEGORIAS_GASTO_USUARIO).not.toContain('Vivienda');
    expect(CATEGORIAS_GASTO_USUARIO).not.toContain('Servicios públicos');
  });

  it('conserva Educación, Mercado, Transporte y Mascotas: doble cara real entre Gastos y Fijos', () => {
    expect(CATEGORIAS_GASTO_USUARIO).toContain('Educación');
    expect(CATEGORIAS_GASTO_USUARIO).toContain('Mercado');
    expect(CATEGORIAS_GASTO_USUARIO).toContain('Transporte');
    expect(CATEGORIAS_GASTO_USUARIO).toContain('Mascotas');
  });

  it('CATEGORIAS_GASTO (catálogo base) conserva Vivienda y Servicios públicos para registros existentes', () => {
    expect(CATEGORIAS_GASTO).toContain('Vivienda');
    expect(CATEGORIAS_GASTO).toContain('Servicios públicos');
  });
});

// ── ÍCONO POR ORIGEN (TX.6 / TX.7, ids de sprite desde ID.3) ─────

describe('iconoPorOrigen (TX.6/TX.7)', () => {
  const compromisos = [
    { id: 'c-fijo',    tipo: 'fijo',           categoria: 'Arriendo' },
    { id: 'c-sin-cat', tipo: 'fijo',           categoria: null },
    { id: 'c-banco',   tipo: 'deuda-entidad',  categoria: 'Tarjeta de crédito' },
    { id: 'c-primo',   tipo: 'deuda-personal', categoria: 'Familiar' },
    { id: 'c-otro-ic', tipo: 'fijo',           categoria: 'Otro', icono: 'c-cohete' },
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

  it('CAT.2f: un fijo con categoría "Otro" e ícono elegido hereda ese ícono en vez del genérico', () => {
    const gasto = { id: 'g8', categoria: 'Otros', compromisoId: 'c-otro-ic' };
    expect(iconoPorOrigen(gasto, compromisos)).toBe('c-cohete');
  });

  // CAT.3b (ADR 058 D3): la categoría del compromiso pasa por la resolutora
  // global en vez del mapa nativo crudo, lista para cuando CAT.3c habilite
  // personalizadas en Gastos fijos.
  it('la categoría de un fijo personalizada resuelve por la resolutora', () => {
    const conPersonalizada = [
      { id: 'c-personal', tipo: 'fijo', categoria: 'Streaming propio' },
    ];
    const gasto = { id: 'g9', categoria: 'Otros', compromisoId: 'c-personal' };
    const personalizadas = [{ nombre: 'Streaming propio', icono: 'c-play' }];
    expect(iconoPorOrigen(gasto, conPersonalizada, personalizadas)).toBe('c-play');
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
    expect(document.getElementById('lista-gastos').querySelector('.gastos-empty')).not.toBeNull();
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

// ── variacionMensualGasto() (GAS.1a, ADR 039 D2) ─────────────────

describe('variacionMensualGasto()', () => {
  it('devuelve null sin base de comparación (mes anterior en 0)', () => {
    expect(variacionMensualGasto(100_000, 0)).toBeNull();
  });

  it('detecta bajada con porcentaje redondeado', () => {
    expect(variacionMensualGasto(92_000, 100_000)).toEqual({ direccion: 'menos', pct: 8 });
  });

  it('detecta subida con porcentaje redondeado', () => {
    expect(variacionMensualGasto(115_000, 100_000)).toEqual({ direccion: 'mas', pct: 15 });
  });

  it('sin cambio reporta igual', () => {
    expect(variacionMensualGasto(100_000, 100_000)).toEqual({ direccion: 'igual', pct: 0 });
  });

  it('una diferencia que redondea a 0% se reporta como igual (no "0% menos")', () => {
    expect(variacionMensualGasto(100_300, 100_000)).toEqual({ direccion: 'igual', pct: 0 });
  });

  it('devuelve null con ambos meses en 0', () => {
    expect(variacionMensualGasto(0, 0)).toBeNull();
  });

  it('trata entradas no numéricas como 0 (defensivo)', () => {
    expect(variacionMensualGasto(undefined, undefined)).toBeNull();
    expect(variacionMensualGasto(undefined, 100_000)).toEqual({ direccion: 'menos', pct: 100 });
  });
});

// ── renderFiltrosGastos() - hero del mes (GAS.1a, ADR 039 D1/D2/D9) ──

describe('renderFiltrosGastos() - hero del mes (GAS.1a)', () => {
  /** Fecha 'YYYY-MM-15' desplazada `offsetMeses` desde el mes actual. */
  const fechaEnMes = (offsetMeses) => {
    const d = new Date();
    d.setDate(15);
    d.setMonth(d.getMonth() + offsetMeses);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-15`;
  };

  beforeEach(() => {
    document.body.innerHTML = `
      <div id="panel-filtros-gastos"></div>
      <div id="lista-gastos"></div>`;
    S.gastos = [];
    S.config.ocultarSaldo = false;
    setFiltroCategoria(null);
  });

  it('muestra el total del mes como protagonista con su label', () => {
    S.gastos = [
      gastoBase({ id: 'g1', categoria: 'Mercado', monto: 85_000, fecha: fechaEnMes(0) }),
      gastoBase({ id: 'g2', categoria: 'Transporte', monto: 15_000, fecha: fechaEnMes(0) }),
    ];
    renderFiltrosGastos();
    const el = document.getElementById('panel-filtros-gastos');
    expect(el.querySelector('.hero-gastos__valor').textContent.trim()).toBe('$100.000');
    expect(el.querySelector('.hero-gastos__label').textContent.trim()).toBe(`Gastaste en ${mesActual()}`);
  });

  it('la navegación de mes vive dentro del hero', () => {
    S.gastos = [gastoBase({ id: 'g1', fecha: fechaEnMes(0) })];
    renderFiltrosGastos();
    const hero = document.querySelector('.hero-gastos');
    expect(hero.querySelector('[data-action="gastos-prev-mes"]')).not.toBeNull();
    expect(hero.querySelector('[data-action="gastos-next-mes"]')).not.toBeNull();
  });

  it('con filtro activo el label nombra la categoría y el total es lo visible', () => {
    S.gastos = [
      gastoBase({ id: 'g1', categoria: 'Mercado', monto: 85_000, fecha: fechaEnMes(0) }),
      gastoBase({ id: 'g2', categoria: 'Transporte', monto: 15_000, fecha: fechaEnMes(0) }),
    ];
    setFiltroCategoria('Mercado');
    renderFiltrosGastos();
    const el = document.getElementById('panel-filtros-gastos');
    expect(el.querySelector('.hero-gastos__label').textContent.trim()).toBe(`Mercado en ${mesActual()}`);
    expect(el.querySelector('.hero-gastos__valor').textContent.trim()).toBe('$85.000');
  });

  it('comparativo verde con ícono al gastar menos que el mes anterior', () => {
    S.gastos = [
      gastoBase({ id: 'g1', monto: 92_000, fecha: fechaEnMes(0) }),
      gastoBase({ id: 'g2', monto: 100_000, fecha: fechaEnMes(-1) }),
    ];
    renderFiltrosGastos();
    const comp = document.querySelector('.hero-gastos__comp .chip');
    expect(comp.className).toContain('chip-success');
    expect(comp.textContent).toContain('8% menos que');
    expect(comp.innerHTML).toContain('#i-trending-down');
  });

  it('comparativo neutro (nunca alarmante) al gastar más, criterio IV.3/ADR 038 D4', () => {
    S.gastos = [
      gastoBase({ id: 'g1', monto: 115_000, fecha: fechaEnMes(0) }),
      gastoBase({ id: 'g2', monto: 100_000, fecha: fechaEnMes(-1) }),
    ];
    renderFiltrosGastos();
    const comp = document.querySelector('.hero-gastos__comp .chip');
    expect(comp.className).not.toContain('chip-success');
    expect(comp.className).not.toContain('chip-warning');
    expect(comp.className).not.toContain('chip-danger');
    expect(comp.textContent).toContain('15% más que');
    expect(comp.innerHTML).toContain('#i-trending-up');
  });

  it('los gastos internos no cuentan en la base de comparación (TX.8b)', () => {
    S.gastos = [
      gastoBase({ id: 'g1', monto: 92_000, fecha: fechaEnMes(0) }),
      gastoBase({ id: 'g2', categoria: 'Deudas', monto: 500_000, fecha: fechaEnMes(-1) }),
    ];
    renderFiltrosGastos();
    expect(document.querySelector('.hero-gastos__comp')).toBeNull();
  });

  it('sin base de comparación (mes anterior en 0) no hay chip', () => {
    S.gastos = [gastoBase({ id: 'g1', monto: 92_000, fecha: fechaEnMes(0) })];
    renderFiltrosGastos();
    expect(document.querySelector('.hero-gastos__comp')).toBeNull();
  });

  it('con filtro activo el comparativo se oculta', () => {
    S.gastos = [
      gastoBase({ id: 'g1', categoria: 'Mercado', monto: 92_000, fecha: fechaEnMes(0) }),
      gastoBase({ id: 'g2', categoria: 'Mercado', monto: 100_000, fecha: fechaEnMes(-1) }),
    ];
    setFiltroCategoria('Mercado');
    renderFiltrosGastos();
    expect(document.querySelector('.hero-gastos__comp')).toBeNull();
  });

  it('el ojo enmascara el total (flag único S.config.ocultarSaldo)', () => {
    S.gastos = [gastoBase({ id: 'g1', monto: 85_000, fecha: fechaEnMes(0) })];
    S.config.ocultarSaldo = true;
    renderFiltrosGastos();
    const el = document.getElementById('panel-filtros-gastos');
    expect(el.querySelector('.hero-gastos__valor').textContent.trim()).toBe('$••••••');
    const ojo = el.querySelector('[data-action="gastos-saldo-visibilidad"]');
    expect(ojo.getAttribute('aria-pressed')).toBe('true');
    expect(ojo.innerHTML).toContain('#i-eye-off');
  });

  it('mes vacío con historial: hero con $0, sin comparativo y sin chips', () => {
    // Con gastos en otro mes el hero se queda: ahí $0 sí es un dato (G8).
    S.gastos = [gastoBase({ id: 'g1', monto: 50_000, fecha: fechaEnMes(-2) })];
    renderFiltrosGastos();
    const el = document.getElementById('panel-filtros-gastos');
    expect(el.querySelector('.hero-gastos__valor').textContent.trim()).toBe('$0');
    expect(el.querySelector('.hero-gastos__comp')).toBeNull();
    expect(el.querySelector('.filtros-bar')).toBeNull();
  });

  // ── DIS.4/G1 y G7: el label nombra el mes visible y "›" se agota ──

  it('G1: al navegar al mes anterior el label nombra ESE mes, no "este mes"', () => {
    S.gastos = [gastoBase({ id: 'g1', monto: 40_000, fecha: fechaEnMes(-1) })];
    navegarMesGastos(-1);
    renderFiltrosGastos();
    const mesPrev = MESES[(new Date().getMonth() + 11) % 12];
    expect(document.querySelector('.hero-gastos__label').textContent.trim()).toBe(`Gastaste en ${mesPrev}`);
    irAMesActual(); // el mes visible es estado de módulo: no se filtra a otros tests
  });

  it('G8: sin ningún gasto registrado no se pinta el hero', () => {
    S.gastos = [];
    renderFiltrosGastos();
    const el = document.getElementById('panel-filtros-gastos');
    expect(el.querySelector('.hero-gastos')).toBeNull();
    expect(el.innerHTML.trim()).toBe('');
  });

  it('G7: "›" se deshabilita en el último mes navegable', () => {
    S.gastos = [gastoBase({ id: 'g1', monto: 40_000, fecha: fechaEnMes(0) })];
    renderFiltrosGastos();
    const next = document.querySelector('[data-action="gastos-next-mes"]');
    expect(next.disabled).toBe(true);
    expect(next.getAttribute('aria-disabled')).toBe('true');
    expect(document.querySelector('[data-action="gastos-prev-mes"]').disabled).toBe(false);
  });

  it('G7: en un mes anterior "›" vuelve a estar disponible', () => {
    S.gastos = [gastoBase({ id: 'g1', monto: 40_000, fecha: fechaEnMes(0) })];
    navegarMesGastos(-1);
    renderFiltrosGastos();
    expect(document.querySelector('[data-action="gastos-next-mes"]').disabled).toBe(false);
    irAMesActual();
  });

  it('G7: el tope sigue al gasto más reciente cuando está en el futuro', () => {
    S.gastos = [gastoBase({ id: 'g1', monto: 40_000, fecha: fechaEnMes(2) })];
    renderFiltrosGastos();
    expect(document.querySelector('[data-action="gastos-next-mes"]').disabled).toBe(false);
  });
});

// ── agruparPorDia() (GAS.1b, ADR 039 D3) ─────────────────────────

describe('agruparPorDia()', () => {
  it('agrupa por fecha exacta conservando el orden recibido', () => {
    const gastos = [
      gastoBase({ id: 'g1', fecha: '2026-05-20' }),
      gastoBase({ id: 'g2', fecha: '2026-05-20' }),
      gastoBase({ id: 'g3', fecha: '2026-05-11' }),
    ];
    const grupos = agruparPorDia(gastos);
    expect(grupos).toHaveLength(2);
    expect(grupos[0].fecha).toBe('2026-05-20');
    expect(grupos[0].items.map(g => g.id)).toEqual(['g1', 'g2']);
    expect(grupos[1].fecha).toBe('2026-05-11');
    expect(grupos[1].items.map(g => g.id)).toEqual(['g3']);
  });

  it('suma el total por día', () => {
    const gastos = [
      gastoBase({ id: 'g1', monto: 85_000, fecha: '2026-05-20' }),
      gastoBase({ id: 'g2', monto: 32_000, fecha: '2026-05-20' }),
      gastoBase({ id: 'g3', monto: 12_000, fecha: '2026-05-11' }),
    ];
    const grupos = agruparPorDia(gastos);
    expect(grupos[0].total).toBe(117_000);
    expect(grupos[1].total).toBe(12_000);
  });

  it('monto undefined cuenta como 0 en el total del día', () => {
    const { monto: _, ...sinMonto } = gastoBase({ fecha: '2026-05-20' });
    const grupos = agruparPorDia([sinMonto, gastoBase({ id: 'g2', monto: 5_000, fecha: '2026-05-20' })]);
    expect(grupos[0].total).toBe(5_000);
  });

  it('fecha undefined cae en un grupo propio (defensivo)', () => {
    const { fecha: _, ...sinFecha } = gastoBase();
    const grupos = agruparPorDia([sinFecha]);
    expect(grupos).toHaveLength(1);
    expect(grupos[0].fecha).toBe('');
  });

  it('devuelve vacío con array vacío', () => {
    expect(agruparPorDia([])).toEqual([]);
  });
});

// ── renderListaGastos() - lista agrupada por día (GAS.1b, ADR 039) ──

describe('renderListaGastos() - lista agrupada por día (GAS.1b)', () => {
  const hoyIso = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  /** Día del mes actual garantizado distinto de hoy y de ayer. */
  const otroDiaDelMes = () => {
    const d = new Date();
    const dia = d.getDate() <= 14 ? 25 : 3;
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
  };

  beforeEach(() => {
    document.body.innerHTML = `
      <div id="panel-filtros-gastos"></div>
      <div id="lista-gastos"></div>`;
    S.gastos = [];
    S.config.ocultarSaldo = false;
    setFiltroCategoria(null);
  });

  it('agrupa los gastos de hoy bajo el encabezado "Hoy" con el total del día', () => {
    S.gastos = [
      gastoBase({ id: 'g1', monto: 85_000, fecha: hoyIso() }),
      gastoBase({ id: 'g2', monto: 32_000, fecha: hoyIso() }),
    ];
    renderListaGastos();
    const grupo = document.querySelector('#lista-gastos .gastos-dia');
    expect(grupo.querySelector('.gastos-dia__label').textContent).toBe('Hoy');
    expect(grupo.querySelector('.gastos-dia__total').textContent).toBe('$117.000');
    expect(grupo.querySelectorAll('.list-item')).toHaveLength(2);
  });

  it('días distintos generan grupos distintos, más reciente primero', () => {
    S.gastos = [
      gastoBase({ id: 'g1', monto: 10_000, fecha: otroDiaDelMes() }),
      gastoBase({ id: 'g2', monto: 20_000, fecha: hoyIso() }),
    ];
    renderListaGastos();
    const grupos = document.querySelectorAll('#lista-gastos .gastos-dia');
    expect(grupos).toHaveLength(2);
    const labels = [...grupos].map(g => g.querySelector('.gastos-dia__label').textContent);
    const idx = labels.indexOf('Hoy');
    expect(idx).toBeGreaterThanOrEqual(0);
    // Un día que no es hoy ni ayer usa el formato humano corto, no el ISO.
    const otro = labels.find(l => l !== 'Hoy');
    expect(otro).not.toContain('-');
    expect(otro).toMatch(/\d{1,2}/);
    expect(otro.charAt(0)).toBe(otro.charAt(0).toUpperCase());
    // Si hoy es posterior al otro día, "Hoy" va primero (recientes primero);
    // si el otro día es futuro dentro del mes, va él primero. Ambos válidos:
    // el orden lo fija la fecha descendente.
    const fechas = [hoyIso(), otroDiaDelMes()].sort().reverse();
    expect(labels[0]).toBe(fechas[0] === hoyIso() ? 'Hoy' : otro);
  });

  it('el ojo enmascara el total del día y los montos de los ítems (D9)', () => {
    S.gastos = [gastoBase({ id: 'g1', monto: 85_000, fecha: hoyIso() })];
    S.config.ocultarSaldo = true;
    renderListaGastos();
    const el = document.getElementById('lista-gastos');
    expect(el.querySelector('.gastos-dia__total').textContent).toBe('••••');
    expect(el.querySelector('.list-item__amount').textContent).toBe('••••');
    expect(el.innerHTML).not.toContain('$85.000');
  });

  it('el subtítulo del ítem ya no repite la fecha (vive en el encabezado del día)', () => {
    S.gastos = [gastoBase({ id: 'g1', descripcion: undefined, nota: 'Con receta médica', fecha: hoyIso() })];
    renderListaGastos();
    const sub = document.querySelector('#lista-gastos .list-item__subtitle').textContent;
    expect(sub).toBe('Con receta médica');
  });

  it('sin nota ni descripción, el ítem no pinta subtítulo vacío', () => {
    S.gastos = [gastoBase({ id: 'g1', descripcion: undefined, nota: '', fecha: hoyIso() })];
    renderListaGastos();
    expect(document.querySelector('#lista-gastos .list-item__subtitle')).toBeNull();
  });

  it('los chips llevan la identidad de la sección (chip--gastos) y el activo el modificador', () => {
    S.gastos = [
      gastoBase({ id: 'g1', categoria: 'Mercado', fecha: hoyIso() }),
      gastoBase({ id: 'g2', categoria: 'Transporte', fecha: hoyIso() }),
    ];
    setFiltroCategoria('Mercado');
    renderFiltrosGastos();
    const activo = document.querySelector('.filtros-bar .chip--active');
    expect(activo.className).toContain('chip--gastos');
    expect(activo.textContent.trim()).toBe('Mercado');
    const todos = document.querySelector('.filtros-bar [data-cat=""]');
    expect(todos.className).toContain('chip--gastos');
    expect(todos.className).not.toContain('chip--active');
  });
});

// ── Insight de gastos hormiga + empty states v2 (GAS.1c, ADR 039 D4/D7) ──

describe('renderListaGastos() - insight de gastos hormiga (GAS.1c)', () => {
  const hoyIso = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  /** 6 domicilios de $18.000 (≤ $20.000 c/u, suman $108.000 ≥ $100.000). */
  const hormigasDomicilios = () => Array.from({ length: 6 }, (_, i) =>
    gastoBase({ id: `h${i}`, categoria: 'Domicilios', descripcion: undefined, monto: 18_000, fecha: hoyIso() })
  );

  beforeEach(() => {
    document.body.innerHTML = `
      <div id="panel-filtros-gastos"></div>
      <div id="lista-gastos"></div>`;
    S.gastos = [];
    S.config.ocultarSaldo = false;
    setFiltroCategoria(null);
  });

  it('muestra la tarjeta con la categoría top, el conteo y el total hormiga', () => {
    S.gastos = hormigasDomicilios();
    renderListaGastos();
    const insight = document.querySelector('#lista-gastos .gastos-insight');
    expect(insight).not.toBeNull();
    expect(insight.querySelector('.gastos-insight__title').textContent).toBe('Gastos hormiga: Domicilios');
    expect(insight.querySelector('.gastos-insight__desc').textContent).toContain('6 gastos pequeños suman');
    expect(insight.querySelector('.gastos-insight__desc').textContent).toContain('$108.000');
  });

  it('sin gastos hormiga no hay tarjeta', () => {
    S.gastos = [gastoBase({ id: 'g1', monto: 250_000, fecha: hoyIso() })];
    renderListaGastos();
    expect(document.querySelector('#lista-gastos .gastos-insight')).toBeNull();
  });

  it('con filtro de categoría activo la tarjeta se oculta (solo vista "Todos")', () => {
    S.gastos = hormigasDomicilios();
    setFiltroCategoria('Domicilios');
    renderListaGastos();
    expect(document.querySelector('#lista-gastos .gastos-insight')).toBeNull();
  });

  it('el ojo enmascara el total hormiga (D9)', () => {
    S.gastos = hormigasDomicilios();
    S.config.ocultarSaldo = true;
    renderListaGastos();
    const desc = document.querySelector('#lista-gastos .gastos-insight__desc').textContent;
    expect(desc).toContain('••••');
    expect(desc).not.toContain('$108.000');
  });
});

describe('renderListaGastos() - empty states v2 (GAS.1c)', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="panel-filtros-gastos"></div>
      <div id="lista-gastos"></div>`;
    S.gastos = [];
    S.config.ocultarSaldo = false;
    setFiltroCategoria(null);
  });

  it('mes vacío: card v2 con teja de dominio, copy cálido y CTA de registro', () => {
    renderListaGastos();
    const empty = document.querySelector('#lista-gastos .gastos-empty');
    expect(empty).not.toBeNull();
    expect(empty.querySelector('.gastos-empty__teja svg use').getAttribute('href')).toBe('#i-gastos');
    expect(empty.querySelector('.gastos-empty__title').textContent).toBe('Sin gastos este mes');
    expect(empty.querySelector('.gastos-empty__desc').textContent).toContain('a dónde se va tu dinero');
    expect(empty.querySelector('[data-action="nuevo-gasto"]')).not.toBeNull();
  });

  // DIS.4/G5 (hallazgo H6): un solo primario visible por sección. El del
  // encabezado manda; el CTA del vacío acompaña en secundario, con el mismo
  // verbo que dicen el encabezado y el botón central de la barra.
  it('G5: el CTA del vacío es secundario y dice "Registrar gasto"', () => {
    renderListaGastos();
    const cta = document.querySelector('#lista-gastos [data-action="nuevo-gasto"]');
    expect(cta.className).toContain('btn-secondary');
    expect(cta.className).not.toContain('btn-primary');
    expect(cta.textContent.trim()).toBe('Registrar gasto');
  });

  // DIS.4/G7 (hallazgo H8): en otro mes el CTA de registrar engañaba (el
  // formulario abre con la fecha de hoy, así que el gasto caía en el mes
  // corriente y desaparecía de la pantalla que lo pidió).
  it('G7: un mes pasado sin gastos nombra el mes y ofrece volver, no registrar', () => {
    S.gastos = [gastoBase({ id: 'g1', fecha: '2020-01-15' })];
    navegarMesGastos(-1);
    renderListaGastos();
    const empty = document.querySelector('#lista-gastos .gastos-empty');
    const mesPrev = MESES[(new Date().getMonth() + 11) % 12];
    expect(empty.querySelector('.gastos-empty__teja--neutra')).not.toBeNull();
    expect(empty.querySelector('.gastos-empty__teja svg use').getAttribute('href')).toBe('#i-search');
    expect(empty.querySelector('.gastos-empty__title').textContent).toBe(`No registraste gastos en ${mesPrev}`);
    expect(empty.querySelector('[data-action="nuevo-gasto"]')).toBeNull();
    const cta = empty.querySelector('[data-action="gastos-mes-actual"]');
    expect(cta.className).toContain('btn-secondary');
    expect(cta.textContent.trim()).toBe(`Volver a ${mesActual()}`);
    irAMesActual();
  });
});

// ── gastosFrecuentes (TX.12) ──────────────────────────────────────

describe('gastosFrecuentes', () => {
  const g = (overrides = {}) => ({
    id: 'x', monto: 15_000, categoria: 'Alimentación', fecha: '2026-06-10',
    cuentaId: 'c1', descripcion: '', compromisoId: null,
    ...overrides,
  });

  it('devuelve [] con historial vacío o inválido', () => {
    expect(gastosFrecuentes([], '2026-06-15')).toEqual([]);
    expect(gastosFrecuentes(null, '2026-06-15')).toEqual([]);
    expect(gastosFrecuentes([g()], 'basura')).toEqual([]);
  });

  it('agrupa por categoría + monto y respeta minRepeticiones (default 3)', () => {
    const gastos = [
      g({ id: 'a', fecha: '2026-06-01' }),
      g({ id: 'b', fecha: '2026-06-05' }),
      g({ id: 'c', fecha: '2026-06-10' }),
    ];
    const r = gastosFrecuentes(gastos, '2026-06-15');
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ categoria: 'Alimentación', monto: 15_000, veces: 3 });
  });

  it('con menos repeticiones que el mínimo, no aparece', () => {
    const gastos = [g({ id: 'a' }), g({ id: 'b' })];
    expect(gastosFrecuentes(gastos, '2026-06-15')).toEqual([]);
  });

  it('minRepeticiones configurable', () => {
    const gastos = [g({ id: 'a' }), g({ id: 'b' })];
    const r = gastosFrecuentes(gastos, '2026-06-15', { minRepeticiones: 2 });
    expect(r).toHaveLength(1);
    expect(r[0].veces).toBe(2);
  });

  it('excluye gastos con compromisoId (pagos de fijo/abono)', () => {
    const gastos = [
      g({ id: 'a', compromisoId: 'f1' }),
      g({ id: 'b', compromisoId: 'f1' }),
      g({ id: 'c', compromisoId: 'f1' }),
    ];
    expect(gastosFrecuentes(gastos, '2026-06-15')).toEqual([]);
  });

  it('excluye montos no positivos o no numéricos', () => {
    const gastos = [g({ id: 'a', monto: 0 }), g({ id: 'b', monto: -100 }), g({ id: 'c', monto: NaN })];
    expect(gastosFrecuentes(gastos, '2026-06-15')).toEqual([]);
  });

  it('excluye gastos sin categoría', () => {
    const gastos = [g({ id: 'a', categoria: null }), g({ id: 'b', categoria: null }), g({ id: 'c', categoria: null })];
    expect(gastosFrecuentes(gastos, '2026-06-15')).toEqual([]);
  });

  it('respeta la ventana de días (default 60): fuera de rango no cuenta', () => {
    const gastos = [
      g({ id: 'a', fecha: '2026-01-01' }),
      g({ id: 'b', fecha: '2026-01-02' }),
      g({ id: 'c', fecha: '2026-06-10' }),
    ];
    expect(gastosFrecuentes(gastos, '2026-06-15')).toEqual([]);
  });

  it('diasVentana configurable', () => {
    const gastos = [
      g({ id: 'a', fecha: '2026-01-01' }),
      g({ id: 'b', fecha: '2026-01-02' }),
      g({ id: 'c', fecha: '2026-01-03' }),
    ];
    const r = gastosFrecuentes(gastos, '2026-06-15', { diasVentana: 365 });
    expect(r).toHaveLength(1);
  });

  it('no cuenta gastos con fecha futura respecto a hoyISO', () => {
    const gastos = [
      g({ id: 'a', fecha: '2026-06-20' }),
      g({ id: 'b', fecha: '2026-06-21' }),
      g({ id: 'c', fecha: '2026-06-22' }),
    ];
    expect(gastosFrecuentes(gastos, '2026-06-15')).toEqual([]);
  });

  it('redondea el monto a la unidad de $1.000 para agrupar (absorbe variaciones menores)', () => {
    const gastos = [
      g({ id: 'a', monto: 14_600 }),
      g({ id: 'b', monto: 15_200 }),
      g({ id: 'c', monto: 14_900 }),
    ];
    const r = gastosFrecuentes(gastos, '2026-06-15');
    expect(r).toHaveLength(1);
    expect(r[0].veces).toBe(3);
  });

  it('distingue montos genuinamente distintos dentro de la misma categoría', () => {
    const gastos = [
      g({ id: 'a', monto: 15_000 }),
      g({ id: 'b', monto: 15_000 }),
      g({ id: 'c', monto: 15_000 }),
      g({ id: 'd', monto: 80_000 }),
      g({ id: 'e', monto: 80_000 }),
      g({ id: 'f', monto: 80_000 }),
    ];
    const r = gastosFrecuentes(gastos, '2026-06-15');
    expect(r.map(x => x.monto).sort((a, b) => a - b)).toEqual([15_000, 80_000]);
  });

  it('distingue descripciones distintas dentro de la misma categoría+monto', () => {
    const gastos = [
      g({ id: 'a', descripcion: 'Uber' }),
      g({ id: 'b', descripcion: 'Uber' }),
      g({ id: 'c', descripcion: 'Uber' }),
      g({ id: 'd', descripcion: 'Taxi' }),
      g({ id: 'e', descripcion: 'Taxi' }),
      g({ id: 'f', descripcion: 'Taxi' }),
    ];
    const r = gastosFrecuentes(gastos, '2026-06-15');
    expect(r.map(x => x.descripcion).sort()).toEqual(['Taxi', 'Uber']);
  });

  it('descripción sin distinguir tildes ni mayúsculas cae en el mismo grupo', () => {
    const gastos = [
      g({ id: 'a', descripcion: 'Café' }),
      g({ id: 'b', descripcion: 'CAFE' }),
      g({ id: 'c', descripcion: 'cafe' }),
    ];
    expect(gastosFrecuentes(gastos, '2026-06-15')).toHaveLength(1);
  });

  it('conserva la cuenta y la fecha del registro MÁS reciente del grupo', () => {
    const gastos = [
      g({ id: 'a', fecha: '2026-06-01', cuentaId: 'vieja' }),
      g({ id: 'b', fecha: '2026-06-10', cuentaId: 'nueva' }),
      g({ id: 'c', fecha: '2026-06-05', cuentaId: 'media' }),
    ];
    const r = gastosFrecuentes(gastos, '2026-06-15');
    expect(r[0]).toMatchObject({ cuentaId: 'nueva', ultimaFecha: '2026-06-10' });
  });

  it('TX.12b: ofrece el monto real del registro más reciente, no el redondeado de agrupación', () => {
    // 6 cafés de $6.500 agrupan bajo la clave redondeada $7.000, pero el
    // chip debe prellenar $6.500 (lo que de verdad se pagó), no el ancla.
    const gastos = [
      g({ id: 'a', monto: 6_500, fecha: '2026-06-01' }),
      g({ id: 'b', monto: 6_500, fecha: '2026-06-05' }),
      g({ id: 'c', monto: 6_500, fecha: '2026-06-10' }),
    ];
    const r = gastosFrecuentes(gastos, '2026-06-15');
    expect(r[0].monto).toBe(6_500);
  });

  it('TX.12b: si el precio sube, el monto ofrecido sigue al registro más reciente', () => {
    const gastos = [
      g({ id: 'a', monto: 6_500, fecha: '2026-06-01' }),
      g({ id: 'b', monto: 6_500, fecha: '2026-06-05' }),
      g({ id: 'c', monto: 6_800, fecha: '2026-06-10' }),
    ];
    const r = gastosFrecuentes(gastos, '2026-06-15');
    expect(r[0].monto).toBe(6_800);
  });

  it('ordena por más repetido primero; empate por más reciente', () => {
    const gastos = [
      // Café: 3 veces, última el 01.
      g({ id: 'a', categoria: 'Café', monto: 4_000, fecha: '2026-06-01' }),
      g({ id: 'b', categoria: 'Café', monto: 4_000, fecha: '2026-06-02' }),
      g({ id: 'c', categoria: 'Café', monto: 4_000, fecha: '2026-06-03' }),
      // Uber: 3 veces, última el 12 (más reciente que Café).
      g({ id: 'd', categoria: 'Uber', monto: 18_000, fecha: '2026-06-10' }),
      g({ id: 'e', categoria: 'Uber', monto: 18_000, fecha: '2026-06-11' }),
      g({ id: 'f', categoria: 'Uber', monto: 18_000, fecha: '2026-06-12' }),
    ];
    const r = gastosFrecuentes(gastos, '2026-06-15');
    expect(r.map(x => x.categoria)).toEqual(['Uber', 'Café']);
  });

  it('maxResultados limita la cantidad devuelta', () => {
    const gastos = [];
    for (const cat of ['A', 'B', 'C']) {
      for (let i = 0; i < 3; i++) {
        gastos.push(g({ id: `${cat}${i}`, categoria: cat, monto: 10_000, fecha: `2026-06-0${i + 1}` }));
      }
    }
    const r = gastosFrecuentes(gastos, '2026-06-15', { maxResultados: 2 });
    expect(r).toHaveLength(2);
  });

  it('tolera entradas malformadas dentro del array', () => {
    const gastos = [null, undefined, 'x', g({ id: 'a' }), g({ id: 'b' }), g({ id: 'c' })];
    expect(gastosFrecuentes(gastos, '2026-06-15')).toHaveLength(1);
  });
});

// ── renderFormGasto() - chips de gastos frecuentes (TX.12) ───────

describe('renderFormGasto() - chips de gastos frecuentes (TX.12)', () => {
  const cuenta = (id, nombre, saldo = 500_000) => ({
    id, nombre, saldo, banco: 'Nequi', tipo: 'Ahorros', activa: true,
  });
  // `renderFormGasto` deriva los frecuentes contra el reloj real (`hoy()`), no
  // contra una fecha inyectable: una fecha fija se sale de la ventana de 60
  // días con el paso del tiempo y el chip deja de pintarse.
  const haceNDias = (n) => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString().slice(0, 10);
  };
  const g = (overrides = {}) => ({
    id: 'x', monto: 15_000, categoria: 'Alimentación', fecha: haceNDias(5),
    cuentaId: 'c1', descripcion: '', compromisoId: null,
    ...overrides,
  });

  beforeEach(() => {
    S.cuentas = [cuenta('c1', 'Bancolombia')];
    S.gastos  = [];
  });

  it('sin patrones repetidos, no muestra la sección de frecuentes', () => {
    S.gastos = [g({ id: 'a' }), g({ id: 'b' })]; // solo 2, bajo el mínimo
    const html = renderFormGasto();
    expect(html).not.toContain('gastos-frecuentes__chip');
  });

  it('con un patrón repetido, pinta un chip con nombre y monto', () => {
    S.gastos = [g({ id: 'a' }), g({ id: 'b' }), g({ id: 'c' })];
    const html = renderFormGasto();
    expect(html).toContain('gastos-frecuentes__chip');
    expect(html).toContain('data-action="gastos-repetir-frecuente"');
    expect(html).toContain('data-categoria="Alimentación"');
    expect(html).toContain('data-monto="15000"');
    expect(html).toContain('data-cuenta-id="c1"');
  });

  it('TX.12b: el chip usa el monto real del gasto más reciente, no el redondeado a $1.000', () => {
    S.gastos = [
      g({ id: 'a', monto: 6_500, fecha: haceNDias(15) }),
      g({ id: 'b', monto: 6_500, fecha: haceNDias(10) }),
      g({ id: 'c', monto: 6_500, fecha: haceNDias(5) }),
    ];
    const html = renderFormGasto();
    expect(html).toContain('data-monto="6500"');
    expect(html).not.toContain('data-monto="7000"');
  });

  it('sugerencias: false omite los chips aunque haya patrones', () => {
    S.gastos = [g({ id: 'a' }), g({ id: 'b' }), g({ id: 'c' })];
    const html = renderFormGasto({ sugerencias: false });
    expect(html).not.toContain('gastos-frecuentes__chip');
  });

  it('usa la descripción como nombre del chip cuando existe', () => {
    S.gastos = [
      g({ id: 'a', descripcion: 'Uber' }),
      g({ id: 'b', descripcion: 'Uber' }),
      g({ id: 'c', descripcion: 'Uber' }),
    ];
    const html = renderFormGasto();
    expect(html).toContain('>Uber<');
  });

  // DIS.4/G9 (hallazgo H10): TX.12 insertó los chips ANTES del monto y el
  // formulario dejó de abrir con el dato que el usuario vino a escribir,
  // contra el ADR 042 D2. El atajo va después, y se lee como alternativa.
  it('G9: los chips van después del bloque del monto, no antes', () => {
    S.gastos = [g({ id: 'a' }), g({ id: 'b' }), g({ id: 'c' })];
    const html = renderFormGasto();
    expect(html.indexOf('monto-hero')).toBeLessThan(html.indexOf('gastos-frecuentes__lista'));
    expect(html).toContain('O repite un gasto frecuente');
  });
});

// ── _renderGastoItem() - botón "Repetir" (TX.12) ─────────────────

describe('renderListaGastos() - botón Repetir en cada fila (TX.12)', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="lista-gastos"></div>';
    const d = new Date();
    const fecha = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-10`;
    S.gastos = [gastoBase({ id: 'g1', fecha })];
    S.compromisos = [];
    S.categoriasPersonalizadas = [];
    S.config = { ...S.config, ocultarSaldo: false };
    setFiltroCategoria(null); // un test anterior en este archivo puede dejar un filtro activo
  });

  it('cada fila trae un botón "Repetir este gasto" con el id del gasto', () => {
    renderListaGastos();
    const btn = document.querySelector('[data-action="repetir-gasto"]');
    expect(btn).not.toBeNull();
    expect(btn.dataset.id).toBe('g1');
    expect(btn.getAttribute('aria-label')).toBe('Repetir este gasto');
  });
});

// ── DSK.3a (ADR 072 D1/D6) - cabecera de banda y chevrons del sistema ──

describe('renderFiltrosGastos() - cabecera de escritorio (DSK.3a)', () => {
  const fechaEnMes = (offsetMeses) => {
    const d = new Date();
    d.setDate(15);
    d.setMonth(d.getMonth() + offsetMeses);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-15`;
  };

  beforeEach(() => {
    document.body.innerHTML = `
      <div id="panel-filtros-gastos"></div>
      <div id="lista-gastos"></div>`;
    S.gastos = [];
    S.config.ocultarSaldo = false;
    setFiltroCategoria(null);
  });

  // D6: la app tiene un solo chevron y lo usa en `.section__volver`, en la
  // ficha de aviso y en los enlaces de salida. Estos dos se dibujaban con la
  // fuente de texto, así que no compartían grosor de trazo ni remate.
  it('los chevrons de mes son el glifo del sistema, no caracteres', () => {
    S.gastos = [gastoBase({ id: 'g1', fecha: fechaEnMes(0) })];
    renderFiltrosGastos();
    const prev = document.querySelector('[data-action="gastos-prev-mes"]');
    const next = document.querySelector('[data-action="gastos-next-mes"]');
    expect(prev.innerHTML).toContain('#i-chevron-right');
    expect(next.innerHTML).toContain('#i-chevron-right');
    expect(prev.textContent).not.toContain('‹');
    expect(next.textContent).not.toContain('›');
  });

  it('el de "mes anterior" es el mismo glifo girado, como .section__volver', () => {
    S.gastos = [gastoBase({ id: 'g1', fecha: fechaEnMes(0) })];
    renderFiltrosGastos();
    const prev = document.querySelector('[data-action="gastos-prev-mes"] .icon');
    expect(prev.classList.contains('hero-gastos__chev-prev')).toBe(true);
  });

  // D1: la pregunta "en qué gasté más" se contesta donde ya está contestada.
  // El enlace existe en todos los anchos y CSS lo enciende desde 1680px.
  it('la cabecera enlaza a Análisis en vez de reimplementar la clasificación', () => {
    S.gastos = [gastoBase({ id: 'g1', fecha: fechaEnMes(0) })];
    renderFiltrosGastos();
    const link = document.querySelector('.hero-gastos__link');
    expect(link).not.toBeNull();
    expect(link.getAttribute('href')).toBe('#analisis');
    expect(link.textContent.trim()).toBe('En qué gastaste');
  });

  it('el enlace vive en el bloque de la nav de mes, no suelto en el hero', () => {
    S.gastos = [gastoBase({ id: 'g1', fecha: fechaEnMes(0) })];
    renderFiltrosGastos();
    const top = document.querySelector('.hero-gastos__top');
    expect(top.querySelector('.hero-gastos__link')).not.toBeNull();
  });

  it('sin historial no hay hero, así que tampoco enlace', () => {
    renderFiltrosGastos();
    expect(document.querySelector('.hero-gastos__link')).toBeNull();
  });
});

// ── DSK.3b (ADR 072 D2) - la fila dice de qué cuenta salió el dinero ──

describe('renderListaGastos() - la cuenta en el subtítulo de la fila (DSK.3b)', () => {
  const hoyIso = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const sub = () => document.querySelector('.list-item__subtitle');

  beforeEach(() => {
    document.body.innerHTML = `
      <div id="panel-filtros-gastos"></div>
      <div id="lista-gastos"></div>`;
    S.gastos = [];
    S.cuentas = [
      { id: 'c1', nombre: 'Bancolombia Ahorros', saldo: 1_000_000 },
      { id: 'c2', nombre: 'Nequi', saldo: 100_000 },
    ];
    S.config.ocultarSaldo = false;
    setFiltroCategoria(null);
  });

  it('un gasto con cuenta la nombra en el subtítulo', () => {
    S.gastos = [gastoBase({ id: 'g1', categoria: 'Mercado', descripcion: '', fecha: hoyIso(), cuentaId: 'c1' })];
    renderListaGastos();
    expect(sub().textContent.trim()).toBe('Bancolombia Ahorros');
  });

  // Es el dato que diferencia dos gastos iguales del mismo día: el título es la
  // categoría y la teja ya la dice con su color y su glifo.
  it('dos gastos de la misma categoría el mismo día dejan de ser idénticos', () => {
    S.gastos = [
      gastoBase({ id: 'g1', categoria: 'Restaurantes', descripcion: '', monto: 62_000, fecha: hoyIso(), cuentaId: 'c1' }),
      gastoBase({ id: 'g2', categoria: 'Restaurantes', descripcion: '', monto: 45_000, fecha: hoyIso(), cuentaId: 'c2' }),
    ];
    renderListaGastos();
    const subs = [...document.querySelectorAll('.list-item__subtitle')].map(el => el.textContent.trim());
    expect(subs.sort()).toEqual(['Bancolombia Ahorros', 'Nequi']);
  });

  it('la cuenta abre el subtítulo y la nota la sigue, con el separador de siempre', () => {
    S.gastos = [gastoBase({
      id: 'g1', categoria: 'Mercado', descripcion: '', fecha: hoyIso(), cuentaId: 'c1', nota: 'Mercado quincenal',
    })];
    renderListaGastos();
    expect(sub().textContent.trim()).toBe('Bancolombia Ahorros · Mercado quincenal');
  });

  it('sin cuenta asignada el subtítulo se comporta como antes', () => {
    S.gastos = [gastoBase({ id: 'g1', categoria: 'Mercado', descripcion: '', fecha: hoyIso(), nota: 'Solo la nota' })];
    renderListaGastos();
    expect(sub().textContent.trim()).toBe('Solo la nota');
  });

  it('sin cuenta y sin nota, la fila sigue sin subtítulo', () => {
    S.gastos = [gastoBase({ id: 'g1', categoria: 'Mercado', descripcion: '', fecha: hoyIso() })];
    renderListaGastos();
    expect(sub()).toBeNull();
  });

  it('una cuenta eliminada no deja el subtítulo con un id suelto', () => {
    S.gastos = [gastoBase({ id: 'g1', categoria: 'Mercado', descripcion: '', fecha: hoyIso(), cuentaId: 'borrada' })];
    renderListaGastos();
    expect(sub()).toBeNull();
    S.cuentas = [];
  });
});

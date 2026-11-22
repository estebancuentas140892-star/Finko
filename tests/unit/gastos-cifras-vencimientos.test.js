/**
 * gastos-cifras-vencimientos.test.js - cada pestaña con su cifra y cada
 * vencimiento con su pago (GAS.12, ADR 187).
 *
 * Cubre:
 * - D1 (GAS.12a): la hoja "Elige el mes" de cada pestaña con sus propios
 *   registros, Fijos en un mes con solo sus vencimientos, "Pagaste" con todos
 *   los pagos de fijos y Límites con lo mismo que Día a día.
 * - D2 (GAS.12b): cada pago de un fijo salda el vencimiento más antiguo; los
 *   casos del pedido (mensual, quincenal, anual, cada 2, 3 y 6 meses, el día
 *   31, lo pagado, varios pendientes, lo que aún no vence, el pago atrasado y
 *   el adelantado) y que las deudas sigan con su regla.
 * - D3 (GAS.12c): "Ya lo había pagado" anota el vencimiento más viejo sin
 *   mover dinero.
 * - D4 (GAS.12d): la fecha del primer pago manda sobre el alta.
 *
 * Los datos son de ejemplo: el escenario del pedido (noviembre con $500.000
 * del día a día, $800.000 en fijos y $300.000 en abonos a deudas).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { S, createInitialState } from '../../modules/core/state.js';
import { aplicarPagosCompromisos, anotarPagadoPorFuera } from '../../modules/infra/pago-compromiso.js';
import { cuandoCompromiso, htmlDetalleCompromiso } from '../../modules/dominio/compromisos/views/detalle.js';
import { renderFormPagoLote } from '../../modules/dominio/compromisos/views/lote.js';
import { htmlListasMes } from '../../modules/dominio/agenda/listas.js';
import { normalizarCompromiso, validarCompromiso, fechaInicioValida } from '../../modules/dominio/compromisos/logic/modelo.js';
import { renderFormGastoFijo } from '../../modules/dominio/compromisos/views/formularios.js';
import { primerMesFinko } from '../../modules/infra/mes-bloque.js';
import { filasHojaMeses, totalesDeLaLente, lenteDeLaHoja } from '../../modules/ui/bloque-gastos.js';
import { totalesPagadosDelAnio } from '../../modules/dominio/compromisos/logic.js';
import { faltaPorPagarDelMes, resumenFijosDelMes, renderListaCompromisos, setFiltroPorPagar } from '../../modules/dominio/compromisos/views/lista.js';
import { irAMesActualBloque, navegarMesBloque } from '../../modules/infra/mes-bloque.js';
import { vencimientosDelMes, inicioDeVencimientos } from '../../modules/infra/vencimientos.js';
import {
  calcularGastadoCategoria, sinLimiteDelMes, resumenLimitesDelMes, totalesLimitesDelAnio, gastoPorSubcategoria,
} from '../../modules/dominio/presupuesto/logic.js';
import { totalesDiaADiaDelAnio } from '../../modules/dominio/gastos/logic.js';
import {
  coberturaDeVencimientos, vencimientosSinPagar, vencimientoCubierto, vencimientosSinPagarDelMes, estadoDelFijoEnMes,
} from '../../modules/infra/vencimientos.js';
import {
  pendientesDeObligacion, vencidosSinPagar, estadoPagoMes, compromisosProximos,
} from '../../modules/dominio/compromisos/logic.js';
import { pagosPendientesDelMes, textoEstadoObligacion } from '../../modules/infra/estado-obligacion.js';
import { formatearAvisoSistema } from '../../modules/infra/notificaciones.js';
import { pendientesDePagoDelMes, eventosDelMes } from '../../modules/dominio/agenda/logic.js';

// ── El escenario del pedido ─────────────────────────────────────

const fijos = [
  { id: 'arriendo', descripcion: 'Arriendo', tipo: 'fijo', monto: 700_000, frecuencia: 'Mensual', diaPago: 5, activo: true, fechaCreacion: '2026-06-01T12:00:00' },
  { id: 'disney', descripcion: 'Disney+', tipo: 'fijo', monto: 100_000, frecuencia: 'Mensual', diaPago: 15, activo: true, fechaCreacion: '2026-07-15T12:00:00' },
];
const deudas = [
  { id: 'visa', descripcion: 'Visa', tipo: 'deuda-entidad', saldoTotal: 2_000_000, cuotaMensual: 300_000, frecuencia: 'Mensual', diaPago: 10, activo: true, fechaCreacion: '2026-06-01T12:00:00' },
];
const gastosNoviembre = [
  // Día a día: $500.000, con una compra con la tarjeta (sí es día a día).
  { id: 'g1', categoria: 'Mercado', monto: 300_000, fecha: '2026-11-03' },
  { id: 'g2', categoria: 'Restaurantes', monto: 120_000, fecha: '2026-11-08' },
  { id: 'g3', categoria: 'Ropa', monto: 80_000, fecha: '2026-11-09', compromisoId: 'visa', consumoTC: true },
  // Fijos: $800.000.
  { id: 'p1', categoria: 'Gastos fijos', monto: 700_000, fecha: '2026-11-05', compromisoId: 'arriendo' },
  { id: 'p2', categoria: 'Gastos fijos', monto: 100_000, fecha: '2026-11-15', compromisoId: 'disney' },
  // Deudas: $300.000.
  { id: 'a1', categoria: 'Deudas', monto: 300_000, fecha: '2026-11-10', compromisoId: 'visa' },
];

describe('GAS.12a: la hoja "Elige el mes" habla de la pestaña que la abre (ADR 187 D1)', () => {
  const datos = { gastos: gastosNoviembre, compromisos: [...fijos, ...deudas], presupuestos: [] };

  it('Día a día $500.000, Fijos $800.000 y Deudas $300.000, sin mezclarse', () => {
    expect(totalesDeLaLente('gast', datos, 2026)[10]).toBe(500_000);
    expect(totalesDeLaLente('fijos', datos, 2026)[10]).toBe(800_000);
    expect(totalesDeLaLente('deudas', datos, 2026)[10]).toBe(300_000);
  });

  it('la compra con la tarjeta no es un abono, y un pago sin su compromiso se reconoce por la categoría', () => {
    const t = totalesPagadosDelAnio([
      ...gastosNoviembre,
      { id: 'x', categoria: 'Deudas', monto: 50_000, fecha: '2026-11-20', compromisoId: 'borrada' },
      { id: 'y', categoria: 'Gastos fijos', monto: 40_000, fecha: '2026-11-21', compromisoId: 'otra-borrada' },
    ], [...fijos, ...deudas], 2026, 'deuda');
    expect(t[10]).toBe(350_000);
    expect(totalesPagadosDelAnio(gastosNoviembre, [...fijos, ...deudas], 2025, 'fijo').every(n => n === 0)).toBe(true);
  });

  it('Límites suma lo gastado en sus categorías', () => {
    const presupuestos = [{ id: 'l1', categoria: 'Mercado', montoMensual: 400_000, activo: true }];
    expect(totalesDeLaLente('presupuesto', { ...datos, presupuestos }, 2026)[10]).toBe(300_000);
    expect(totalesLimitesDelAnio(presupuestos, gastosNoviembre, 2026)[9]).toBe(0);
  });

  it('las filas de Fijos llevan los totales de Fijos', () => {
    const filas = filasHojaMeses(2026, {
      ...datos, lente: 'fijos',
      tope: { anio: 2026, mes: 10 }, primero: { anio: 2026, mes: 9 }, visto: { anio: 2026, mes: 10 },
      hoyDate: new Date(2026, 10, 20),
    });
    expect(filas.map(f => [f.mes, f.total])).toEqual([[10, 800_000], [9, 0]]);
  });

  it('sin pestaña, la hoja sigue siendo la del día a día', () => {
    const filas = filasHojaMeses(2026, {
      gastos: gastosNoviembre,
      tope: { anio: 2026, mes: 10 }, primero: { anio: 2026, mes: 10 }, visto: { anio: 2026, mes: 10 },
    });
    expect(filas[0].total).toBe(totalesDiaADiaDelAnio(gastosNoviembre, 2026)[10]);
  });

  it('lenteDeLaHoja: la tarjeta donde se tocó el mes; Fijos y Deudas por el hash', () => {
    document.body.innerHTML = `
      <section id="sec-gast"><button id="b1"></button></section>
      <section id="sec-compromisos"><button id="b2"></button></section>
      <section id="sec-presupuesto"><button id="b3"></button></section>`;
    expect(lenteDeLaHoja(document.getElementById('b1'), 'gast')).toBe('gast');
    expect(lenteDeLaHoja(document.getElementById('b2'), 'fijos')).toBe('fijos');
    expect(lenteDeLaHoja(document.getElementById('b2'), 'deudas')).toBe('deudas');
    expect(lenteDeLaHoja(document.getElementById('b3'), 'presupuesto')).toBe('presupuesto');
  });
});

describe('GAS.12a: los vencimientos de un mes (ADR 187 D1)', () => {
  it('un quincenal trae dos; un anual fuera de su mes, ninguno; lo creado después, ninguno', () => {
    const quincenal = { frecuencia: 'Quincenal', diaPago: 5, fechaCreacion: '2026-01-10T12:00:00' };
    expect(vencimientosDelMes(quincenal, '2026-11')).toEqual(['2026-11-05', '2026-11-20']);
    const anual = { frecuencia: 'Anual', diaPago: 15, fechaCreacion: '2026-03-01T12:00:00' };
    expect(vencimientosDelMes(anual, '2026-11')).toEqual([]);
    expect(vencimientosDelMes(anual, '2027-03')).toEqual(['2027-03-15']);
    expect(vencimientosDelMes(fijos[1], '2026-06')).toEqual([]);
    expect(vencimientosDelMes(fijos[1], '2026-07')).toEqual(['2026-07-15']);
  });

  it('el día 31 cae el último día de los meses cortos', () => {
    const fin = { frecuencia: 'Mensual', diaPago: 31, fechaCreacion: '2026-01-01T12:00:00' };
    expect(vencimientosDelMes(fin, '2026-02')).toEqual(['2026-02-28']);
    expect(vencimientosDelMes(fin, '2028-02')).toEqual(['2028-02-29']);
    expect(vencimientosDelMes(fin, '2026-09')).toEqual(['2026-09-30']);
  });

  it('inicioDeVencimientos: el día local del alta; sin fecha, null', () => {
    expect(inicioDeVencimientos({ fechaCreacion: '2026-07-15' })).toBe('2026-07-15');
    expect(inicioDeVencimientos({})).toBeNull();
  });
});

describe('GAS.12a: Fijos en un mes cuenta solo sus vencimientos (ADR 187 D1)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 20, 12));
    document.body.innerHTML = '<div id="lista-compromisos"></div>';
    location.hash = '#fijos';
    setFiltroPorPagar('todo');
    irAMesActualBloque();
  });
  afterEach(() => {
    location.hash = '';
    irAMesActualBloque();
    vi.useRealTimers();
  });

  it('en octubre no queda "sin pagar" lo que se creó en noviembre ni el anual de marzo', () => {
    S.compromisos = [
      fijos[0],
      { id: 'nuevo', descripcion: 'Gimnasio', tipo: 'fijo', monto: 90_000, frecuencia: 'Mensual', diaPago: 2, activo: true, fechaCreacion: '2026-11-01T12:00:00' },
      { id: 'soat', descripcion: 'SOAT', tipo: 'fijo', monto: 600_000, frecuencia: 'Anual', diaPago: 15, activo: true, fechaCreacion: '2026-03-01T12:00:00' },
    ];
    S.gastos = [];
    navegarMesBloque(-1);
    expect(faltaPorPagarDelMes()).toMatchObject({ total: 700_000, cantidad: 1, esActual: false });
  });

  it('un quincenal sin pagar en octubre son dos vencimientos', () => {
    S.compromisos = [{ id: 'q', descripcion: 'Aseo', tipo: 'fijo', monto: 50_000, frecuencia: 'Quincenal', diaPago: 5, activo: true, fechaCreacion: '2026-01-01T12:00:00' }];
    S.gastos = [];
    navegarMesBloque(-1);
    expect(faltaPorPagarDelMes().total).toBe(100_000);
  });

  it('"Pagaste" suma todos los pagos de fijos del mes, y nada de deudas ni del día a día', () => {
    S.compromisos = [...fijos, ...deudas];
    S.gastos = gastosNoviembre;
    const r = resumenFijosDelMes();
    expect(r.pagado).toBe(800_000);
  });

  it('la lista de Fijos del teléfono en un mes pasado no trae lo que no existía', () => {
    const real = window.matchMedia;
    window.matchMedia = (q) => ({ matches: true, media: q, addEventListener() {}, removeEventListener() {} });
    try {
      S.compromisos = [
        fijos[0],
        { id: 'nuevo', descripcion: 'Gimnasio', tipo: 'fijo', monto: 90_000, frecuencia: 'Mensual', diaPago: 2, activo: true, fechaCreacion: '2026-11-01T12:00:00' },
      ];
      S.gastos = [];
      navegarMesBloque(-1);
      renderListaCompromisos();
      const ids = [...document.querySelectorAll('#lista-compromisos [data-id]')].map(e => e.dataset.id);
      expect(ids).toContain('arriendo');
      expect(ids).not.toContain('nuevo');
    } finally {
      window.matchMedia = real;
    }
  });
});

describe('GAS.12a: Límites cuenta lo mismo que Día a día (ADR 187 D1)', () => {
  const gastos = [
    { id: 'r1', categoria: 'Entretenimiento', monto: 30_000, fecha: '2026-11-02' },
    // Un pago de Disney+ al que se le puso Entretenimiento a mano.
    { id: 'r2', categoria: 'Entretenimiento', monto: 100_000, fecha: '2026-11-15', compromisoId: 'disney', subcategoriaId: 'x' },
    { id: 'r3', categoria: 'Gastos fijos', monto: 700_000, fecha: '2026-11-05', compromisoId: 'arriendo' },
    { id: 'r4', categoria: 'Deudas', monto: 300_000, fecha: '2026-11-10', compromisoId: 'visa' },
  ];

  it('un pago de un fijo no gasta el límite de su categoría', () => {
    expect(calcularGastadoCategoria(gastos, 'Entretenimiento', 2026, 11)).toBe(30_000);
    expect(gastoPorSubcategoria(gastos, 'Entretenimiento', 2026, 11)).toEqual({});
    const presupuestos = [{ id: 'l', categoria: 'Entretenimiento', montoMensual: 50_000, activo: true }];
    expect(resumenLimitesDelMes(presupuestos, gastos, 2026, 11).gastado).toBe(30_000);
  });

  it('las categorías sin límite no traen lo pagado en fijos ni en deudas', () => {
    expect(sinLimiteDelMes([], gastos, 2026, 11).map(s => s.categoria)).toEqual(['Entretenimiento']);
  });
});

// ── GAS.12b: cada pago salda el vencimiento más antiguo (ADR 187 D2) ──

const HOY = '2026-11-20';
const disney = (o = {}) => ({
  id: 'disney', descripcion: 'Disney+', tipo: 'fijo', monto: 100_000, frecuencia: 'Mensual',
  diaPago: 15, activo: true, fechaCreacion: '2026-07-15T12:00:00', ...o,
});
let _n = 0;
const pago = (fecha, o = {}) => ({ id: `p${++_n}`, compromisoId: 'disney', categoria: 'Gastos fijos', monto: 100_000, fecha, ...o });

describe('GAS.12b: Disney+ desde el 15 de julio sin pagos (el caso del pedido)', () => {
  it('los vencimientos son el 15 de julio, agosto, septiembre, octubre y noviembre', () => {
    expect(vencimientosSinPagar(disney(), [], HOY).pendientes)
      .toEqual(['2026-07-15', '2026-08-15', '2026-09-15', '2026-10-15', '2026-11-15']);
  });

  it('está vencido desde el 15 de julio, no desde el 15 de noviembre: "Venció hace 4 meses"', () => {
    const [v] = vencidosSinPagar([disney()], [], HOY);
    expect(v).toMatchObject({ desde: '2026-07-15', pendientes: 5, montoPendiente: 500_000, diasAtraso: 128 });
    expect(textoEstadoObligacion(-v.diasAtraso).texto).toBe('Venció hace 4 meses');
  });

  it('un pago salda el más antiguo: quedan 4, desde el 15 de agosto', () => {
    const p = pendientesDeObligacion(disney(), [pago(HOY)], HOY);
    expect(p).toMatchObject({ desde: '2026-08-15', montoPendiente: 400_000, ultimoPago: HOY });
    expect(p.pendientes).toHaveLength(4);
  });

  it('el pago de noviembre que saldó julio no deja pagado noviembre', () => {
    expect(estadoPagoMes([pago(HOY)], disney(), '2026-11')).toBe('ninguno');
    const cinco = ['2026-07-16', '2026-08-15', '2026-09-15', '2026-10-15', HOY].map(f => pago(f));
    expect(estadoPagoMes(cinco, disney(), '2026-11')).toBe('completo');
    expect(vencidosSinPagar([disney()], cinco, HOY)).toEqual([]);
  });

  it('el lote, Atención hoy y la fila dicen lo mismo: los 5 pagos, $500.000', () => {
    const [p] = pagosPendientesDelMes([disney()], [], '2026-11', HOY);
    expect(p).toMatchObject({ id: 'disney', monto: 500_000, periodos: 5, pendientes: 5, desde: '2026-07-15', estado: 'vencido' });
  });

  it('un pago que cubre los 5 (el lote) deja el fijo al día', () => {
    const lote = [pago(HOY, { monto: 500_000, periodos: 5 })];
    expect(vencimientosSinPagar(disney(), lote, HOY).pendientes).toEqual([]);
    expect(estadoPagoMes(lote, disney(), '2026-11')).toBe('completo');
  });

  it('la notificación del sistema lo dice en meses', () => {
    const { titulo } = formatearAvisoSistema({ tipo: 'compromiso-vencido', nombre: 'Disney+', dias: 128 });
    expect(titulo).toContain('Disney+ venció hace 4 meses');
    expect(formatearAvisoSistema({ tipo: 'compromiso-vencido', nombre: 'Agua', dias: 1 }).titulo).toContain('Agua venció ayer');
    expect(formatearAvisoSistema({ tipo: 'compromiso-vencido', nombre: 'Agua', dias: 5 }).titulo).toContain('Agua venció hace 5 días');
  });
});

describe('GAS.12b: los casos del pedido', () => {
  it('mensual pagado cada mes: nada pendiente y el mes completo', () => {
    const pagos = ['2026-07-15', '2026-08-14', '2026-09-15', '2026-10-16', '2026-11-15'].map(f => pago(f));
    expect(vencimientosSinPagar(disney(), pagos, HOY).pendientes).toEqual([]);
    expect(estadoDelFijoEnMes(disney(), pagos, '2026-11')).toBe('completo');
  });

  it('quincenal: cada quincena es un pago; uno al mes deja la otra pendiente', () => {
    const q = disney({ frecuencia: 'Quincenal', diaPago: 5, fechaCreacion: '2026-10-01T12:00:00' });
    const pagos = [pago('2026-10-05'), pago('2026-11-05')];
    expect(vencimientosSinPagar(q, pagos, HOY).pendientes).toEqual(['2026-11-05', '2026-11-20']);
    expect(vencimientoCubierto(q, pagos, '2026-10-05')).toBe(true);
    expect(vencimientoCubierto(q, pagos, '2026-10-20')).toBe(true);
    expect(vencimientoCubierto(q, pagos, '2026-11-05')).toBe(false);
  });

  it('anual: vence en su mes; pagado en marzo, en noviembre no debe nada', () => {
    const soat = disney({ frecuencia: 'Anual', diaPago: 15, fechaCreacion: '2026-03-01T12:00:00' });
    expect(vencimientosSinPagar(soat, [], HOY).pendientes).toEqual(['2026-03-15']);
    expect(vencimientosSinPagar(soat, [pago('2026-03-14')], HOY).pendientes).toEqual([]);
    expect(estadoDelFijoEnMes(soat, [], '2026-11')).toBe('ninguno');
    expect(vencimientosSinPagarDelMes(soat, [], '2026-11')).toEqual([]);
  });

  it('periodicidades personalizadas: cada 2, 3 y 6 meses caen en su ciclo', () => {
    const base = { fechaCreacion: '2026-05-10T12:00:00', diaPago: 10 };
    expect(vencimientosSinPagar(disney({ ...base, frecuencia: 'Bimestral' }), [], HOY).pendientes)
      .toEqual(['2026-05-10', '2026-07-10', '2026-09-10', '2026-11-10']);
    expect(vencimientosSinPagar(disney({ ...base, frecuencia: 'Trimestral' }), [], HOY).pendientes)
      .toEqual(['2026-05-10', '2026-08-10', '2026-11-10']);
    expect(vencimientosSinPagar(disney({ ...base, frecuencia: 'Semestral' }), [], HOY).pendientes)
      .toEqual(['2026-05-10', '2026-11-10']);
  });

  it('el día 31 vence el último día de los meses cortos', () => {
    const fin = disney({ diaPago: 31, fechaCreacion: '2026-08-31T12:00:00' });
    expect(vencimientosSinPagar(fin, [], HOY).pendientes).toEqual(['2026-08-31', '2026-09-30', '2026-10-31']);
  });

  it('lo que todavía no vence no está pendiente, y es el próximo', () => {
    const luz = disney({ id: 'luz', diaPago: 25, fechaCreacion: '2026-11-01T12:00:00' });
    expect(vencimientosSinPagar(luz, [], HOY).pendientes).toEqual([]);
    const [prox] = compromisosProximos([luz], 7, new Date(2026, 10, 20), []);
    expect(prox).toMatchObject({ id: 'luz', fechaVencimiento: '2026-11-25', diasRestantes: 5 });
  });

  it('un pago adelantado cubre el que viene: no avisa que vence', () => {
    const luz = disney({ id: 'luz', diaPago: 25, fechaCreacion: '2026-11-01T12:00:00' });
    expect(compromisosProximos([luz], 7, new Date(2026, 10, 20), [pago('2026-11-19', { compromisoId: 'luz' })])).toEqual([]);
  });

  it('un pago atrasado que cruza de mes cubre el mes que se debía', () => {
    const arriendo = disney({ id: 'arr', diaPago: 30, fechaCreacion: '2026-09-01T12:00:00' });
    const pagos = [pago('2026-10-01', { compromisoId: 'arr' }), pago('2026-11-02', { compromisoId: 'arr' })];
    expect(vencimientosSinPagar(arriendo, pagos, HOY).pendientes).toEqual([]);
    expect(estadoPagoMes(pagos, arriendo, '2026-10')).toBe('completo');
  });

  it('quien crea el fijo el 18 y anota que ya pagó el del 15 no queda debiendo', () => {
    const netflix = disney({ id: 'nf', diaPago: 15, fechaCreacion: '2026-10-18T12:00:00' });
    const pagos = [pago('2026-10-18', { compromisoId: 'nf' }), pago('2026-11-15', { compromisoId: 'nf' })];
    expect(vencimientosSinPagar(netflix, pagos, HOY).pendientes).toEqual([]);
    expect(estadoPagoMes(pagos, netflix, '2026-10')).toBe('completo');
    expect(estadoPagoMes(pagos, netflix, '2026-11')).toBe('completo');
  });

  it('un pago repartido entre cuentas es un pago, con operacionId o, antes de MOV.3, con la nota', () => {
    const op = [pago('2026-07-15', { monto: 60_000, operacionId: 'o1' }), pago('2026-07-15', { monto: 40_000, operacionId: 'o1' })];
    expect(coberturaDeVencimientos(disney(), op, HOY).cubiertas).toBe(1);
    const viejo = [
      pago('2026-07-15', { monto: 60_000, nota: 'Pago repartido entre varias cuentas' }),
      pago('2026-07-15', { monto: 40_000, nota: 'Pago repartido entre varias cuentas' }),
    ];
    expect(coberturaDeVencimientos(disney(), viejo, HOY).cubiertas).toBe(1);
  });

  it('una compra con la tarjeta no es un pago del fijo', () => {
    expect(coberturaDeVencimientos(disney(), [pago('2026-07-15', { consumoTC: true })], HOY).cubiertas).toBe(0);
  });

  it('no duplica: el mes en curso trae el fijo una vez, con todo lo de antes', () => {
    const lista = pagosPendientesDelMes([disney()], [], '2026-11', HOY);
    expect(lista).toHaveLength(1);
    expect(pagosPendientesDelMes([disney()], [], '2026-11', HOY)).toEqual(lista);
  });

  it('agenda: lo que el lote ofrece de un mes son sus vencimientos sin pago, con cuántos', () => {
    const q = disney({ frecuencia: 'Quincenal', diaPago: 5, fechaCreacion: '2026-10-01T12:00:00' });
    const ev = eventosDelMes([q], 2026, 9);
    const [p] = pendientesDePagoDelMes(ev, [], '2026-10', HOY);
    expect(p).toMatchObject({ id: 'disney', monto: 200_000, periodos: 2, dia: 5 });
    expect(pendientesDePagoDelMes(ev, [pago('2026-10-05'), pago('2026-10-21')], '2026-10', HOY)).toEqual([]);
  });
});

describe('GAS.12b: las deudas siguen con su regla (ADR 183 D3)', () => {
  const visa = {
    id: 'visa', descripcion: 'Visa', tipo: 'deuda-entidad', saldoTotal: 2_000_000, cuotaMensual: 300_000,
    frecuencia: 'Mensual', diaPago: 10, activo: true, fechaCreacion: '2026-07-01T12:00:00',
  };
  it('el abono que completa la cuota del mes deja la deuda al día', () => {
    const abono = { id: 'a', compromisoId: 'visa', categoria: 'Deudas', monto: 300_000, fecha: '2026-11-10' };
    expect(pendientesDeObligacion(visa, [abono], HOY).pendientes).toEqual([]);
    expect(pendientesDeObligacion(visa, [], HOY).pendientes).toHaveLength(5);
  });
});

describe('GAS.12b: el pago que cubre varios vencimientos y lo que dicen las vistas', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 20, 12));
    Object.assign(S, createInitialState());
    S.cuentas = [{ id: 'c1', nombre: 'Cuenta de prueba', banco: 'Otro', tipo: 'Ahorros', saldo: 1_000_000, activa: true }];
    S.compromisos = [disney()];
    S.gastos = [];
  });
  afterEach(() => { vi.useRealTimers(); });

  it('el lote registra un gasto con sus periodos: los 5 quedan pagados y la cuenta baja una vez', () => {
    aplicarPagosCompromisos([{ comp: S.compromisos[0], fecha: HOY, partes: [{ cuentaId: 'c1', monto: 500_000 }], periodos: 5 }]);
    expect(S.gastos).toHaveLength(1);
    expect(S.gastos[0]).toMatchObject({ compromisoId: 'disney', monto: 500_000, periodos: 5, categoria: 'Gastos fijos' });
    expect(S.cuentas[0].saldo).toBe(500_000);
    expect(vencidosSinPagar(S.compromisos, S.gastos, HOY)).toEqual([]);
  });

  it('repartido entre dos cuentas, las dos partes llevan los periodos y cuentan como un pago', () => {
    S.cuentas.push({ id: 'c2', nombre: 'Otra', banco: 'Otro', tipo: 'Ahorros', saldo: 1_000_000, activa: true });
    aplicarPagosCompromisos([{ comp: S.compromisos[0], fecha: HOY, partes: [{ cuentaId: 'c1', monto: 300_000 }, { cuentaId: 'c2', monto: 200_000 }], periodos: 5 }]);
    expect(S.gastos.map(g => g.periodos)).toEqual([5, 5]);
    expect(coberturaDeVencimientos(disney(), S.gastos, HOY).cubiertas).toBe(5);
  });

  it('un pago suelto no guarda periodos', () => {
    aplicarPagosCompromisos([{ comp: S.compromisos[0], fecha: HOY, partes: [{ cuentaId: 'c1', monto: 100_000 }] }]);
    expect(S.gastos[0].periodos).toBeUndefined();
  });

  it('la hoja del fijo dice desde cuándo y cuántos, no el día de este mes', () => {
    expect(cuandoCompromiso(disney(), '2026-11')).toBe('Venció el 15 de jul · 5 pagos');
    S.gastos = ['2026-07-15', '2026-08-15', '2026-09-15', '2026-10-15'].map(f => pago(f));
    expect(cuandoCompromiso(disney(), '2026-11')).toMatch(/^Venció el \S+ 15$/);
  });

  it('la fila del lote dice cuántos pagos y desde cuándo', () => {
    const pend = pagosPendientesDelMes(S.compromisos, S.gastos, '2026-11', HOY);
    document.body.innerHTML = renderFormPagoLote(pend);
    expect(document.querySelector('.lote-row__sub').textContent).toBe('5 pagos · desde el 15 de jul');
    expect(Number(document.querySelector('.lote-row__check').dataset.loteMonto)).toBe(500_000);
  });

  it('la lista "Vencido" del Calendario dice lo mismo que el lote', () => {
    const pend = pagosPendientesDelMes(S.compromisos, S.gastos, '2026-11', HOY);
    const html = htmlListasMes({
      eventos: eventosDelMes(S.compromisos, 2026, 10), year: 2026, month: 10, hoyISO: HOY,
      idsVencidos: new Map(pend.map(p => [p.id, p])),
    });
    document.body.innerHTML = html;
    const fila = document.querySelector('.cal-lista__fila');
    expect(fila.textContent).toContain('Venció el 15 de jul · 5 pagos');
    expect(fila.dataset.day).toBe('15');
    expect(document.querySelector('.cal-lista__suma').textContent).toContain('500.000');
  });
});

// ── GAS.12c: "Ya lo había pagado" (ADR 187 D3) ───────────────────

describe('GAS.12c: lo pagado por fuera de Finko se anota sin mover dinero', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 20, 12));
    Object.assign(S, createInitialState());
    S.cuentas = [{ id: 'c1', nombre: 'Cuenta de prueba', banco: 'Otro', tipo: 'Ahorros', saldo: 1_000_000, activa: true }];
    S.compromisos = [disney()];
    S.gastos = [];
  });
  afterEach(() => { vi.useRealTimers(); });

  it('anota el vencimiento más viejo con su fecha, sin cuenta y sin tocar ningún saldo', () => {
    anotarPagadoPorFuera(S.compromisos[0], '2026-07-15');
    expect(S.gastos).toHaveLength(1);
    expect(S.gastos[0]).toMatchObject({
      compromisoId: 'disney', fecha: '2026-07-15', monto: 100_000, categoria: 'Gastos fijos',
      cuentaId: null, sinEfectoSaldo: true, nota: 'Pagado por fuera de Finko',
    });
    expect(S.cuentas[0].saldo).toBe(1_000_000);
    expect(vencidosSinPagar(S.compromisos, S.gastos, HOY)).toMatchObject([{ desde: '2026-08-15', pendientes: 4 }]);
  });

  it('no es día a día ni gasta un límite, y Fijos lo cuenta en su mes', () => {
    anotarPagadoPorFuera(S.compromisos[0], '2026-07-15');
    expect(totalesDeLaLente('gast', { gastos: S.gastos }, 2026)[6]).toBe(0);
    expect(totalesDeLaLente('fijos', { gastos: S.gastos, compromisos: S.compromisos }, 2026)[6]).toBe(100_000);
    expect(calcularGastadoCategoria(S.gastos, 'Gastos fijos', 2026, 7)).toBe(0);
  });

  it('la hoja del fijo vencido trae "Ya lo había pagado"; al día, no', () => {
    document.body.innerHTML = htmlDetalleCompromiso(S.compromisos[0], { prefijoMes: '2026-11', monto: 500_000 });
    const btn = document.querySelector('[data-action="fijo-ya-pagado"]');
    expect(btn?.textContent.trim()).toBe('Ya lo había pagado');
    expect(btn.getAttribute('aria-label')).toContain('15 de jul');
    S.gastos = ['2026-07-15', '2026-08-15', '2026-09-15', '2026-10-15', '2026-11-15'].map(f => pago(f));
    document.body.innerHTML = htmlDetalleCompromiso(S.compromisos[0], { prefijoMes: '2026-11', monto: 0 });
    expect(document.querySelector('[data-action="fijo-ya-pagado"]')).toBeNull();
  });

  it('lo que vence hoy no se ofrece: todavía no está vencido', () => {
    S.compromisos = [disney({ diaPago: 20, fechaCreacion: '2026-11-01T12:00:00' })];
    document.body.innerHTML = htmlDetalleCompromiso(S.compromisos[0], { prefijoMes: '2026-11', monto: 100_000 });
    expect(document.querySelector('[data-action="fijo-ya-pagado"]')).toBeNull();
  });

  it('deshacer: sin ese gasto el vencimiento vuelve a estar pendiente', () => {
    const id = anotarPagadoPorFuera(S.compromisos[0], '2026-07-15');
    S.gastos = S.gastos.filter(g => g.id !== id);
    expect(vencidosSinPagar(S.compromisos, S.gastos, HOY)).toMatchObject([{ desde: '2026-07-15', pendientes: 5 }]);
  });
});

// ── GAS.12d: la fecha del primer pago (ADR 187 D4) ───────────────

describe('GAS.12d: la fecha del primer pago manda sobre el alta', () => {
  it('Disney+ registrado hoy "desde el 15 de julio" debe julio a noviembre', () => {
    const c = disney({ fechaCreacion: '2026-11-18T15:00:00.000Z', fechaInicio: '2026-07-15' });
    expect(vencimientosSinPagar(c, [], HOY).pendientes)
      .toEqual(['2026-07-15', '2026-08-15', '2026-09-15', '2026-10-15', '2026-11-15']);
    // Sin la fecha, el primero es el 15 de diciembre: el 15 de noviembre ya había pasado al crearlo.
    expect(vencimientosSinPagar(disney({ fechaCreacion: '2026-11-18T15:00:00.000Z' }), [], HOY).pendientes).toEqual([]);
  });

  it('un anual vence en el mes de su primer pago, no en el del alta', () => {
    const soat = disney({ frecuencia: 'Anual', diaPago: 15, fechaCreacion: '2026-11-18T15:00:00.000Z', fechaInicio: '2027-03-15' });
    expect(vencimientosDelMes(soat, '2026-11')).toEqual([]);
    expect(vencimientosDelMes(soat, '2027-03')).toEqual(['2027-03-15']);
    expect(vencimientosDelMes(soat, '2028-03')).toEqual(['2028-03-15']);
    // Un primer pago que todavía no llega no se debe ni se pinta antes.
    expect(eventosDelMes([{ ...soat, diaPago: 15 }], 2026, 2)).toEqual({});
  });

  it('un mensual que empieza el mes que viene no cae este mes', () => {
    const gym = disney({ diaPago: 5, fechaCreacion: '2026-11-18T15:00:00.000Z', fechaInicio: '2026-12-05' });
    expect(eventosDelMes([gym], 2026, 10)).toEqual({});
    expect(Object.keys(eventosDelMes([gym], 2026, 11))).toEqual(['5']);
    expect(compromisosProximos([gym], 30, new Date(2026, 10, 20), [])).toMatchObject([{ fechaVencimiento: '2026-12-05' }]);
  });

  it('el día de pago sale de la fecha y, sin ella, queda null', () => {
    const base = { tipo: 'fijo', descripcion: 'Disney+', monto: '38900', frecuencia: 'Mensual', diaPago: '3', categoria: 'Streaming' };
    expect(normalizarCompromiso({ ...base, fechaInicio: '2026-07-15' })).toMatchObject({ fechaInicio: '2026-07-15', diaPago: 15 });
    expect(normalizarCompromiso({ ...base, fechaInicio: '' })).toMatchObject({ fechaInicio: null, diaPago: 3 });
  });

  it('una fecha que no existe se rechaza; vacía, no', () => {
    const base = { tipo: 'fijo', descripcion: 'Disney+', monto: '38900', frecuencia: 'Mensual', diaPago: '15' };
    expect(validarCompromiso({ ...base, fechaInicio: '2026-02-30' })).toContain('Elige la fecha del primer pago con el calendario.');
    expect(validarCompromiso({ ...base, fechaInicio: '' })).toEqual([]);
    expect(fechaInicioValida('2026-07-15')).toBe('2026-07-15');
    expect(fechaInicioValida('15/07/2026')).toBeNull();
  });

  it('el formulario la pide en "Cuándo", opcional, y la factura la dice junto a la fecha de pago', () => {
    document.body.innerHTML = renderFormGastoFijo();
    const form = document.getElementById('form-gasto-fijo');
    const campo = form.querySelector('#gfijo-cuando input[name="fechaInicio"]');
    expect(campo?.type).toBe('date');
    expect(campo.required).toBe(false);
    // Sin fila nueva en la factura: va como detalle de "Se paga" (GAS.15i:
    // "próximo 24 nov").
    expect(form.dataset.resumenOpcionales).toBe('Débito automático|Para pagar|Nota');
    expect(form.querySelector('[data-resumen-parte="Se paga"] [data-resumen-sub]#gfijo-resumen-inicio')).not.toBeNull();
  });

  it('la hoja de meses llega hasta el primer pago', () => {
    const estado = { gastos: [], cuentas: [], compromisos: [disney({ fechaCreacion: '2026-11-18T15:00:00.000Z', fechaInicio: '2026-07-15' })] };
    expect(primerMesFinko(estado, new Date(2026, 10, 20))).toEqual({ anio: 2026, mes: 6 });
  });
});

describe('GAS.14b (ADR 189 D2): los vencimientos que faltaban', () => {
  it('un semanal sin fecha de inicio empieza en su primer pago; pagado el día del alta salda ese día', async () => {
    const { vencimientosSinPagar: sinPagar } = await import('../../modules/infra/vencimientos.js');
    const desde30 = disney({ id: 's', frecuencia: 'Semanal', diaPago: 30, fechaCreacion: '2026-11-15T12:00:00' });
    expect(sinPagar(desde30, [], '2026-11-29').pendientes).toEqual([]);
    expect(sinPagar(desde30, [], '2026-11-30').pendientes).toEqual(['2026-11-30']);
    const del28 = disney({ id: 'w', frecuencia: 'Semanal', diaPago: 28, fechaCreacion: '2026-10-28T12:00:00' });
    expect(sinPagar(del28, [pago('2026-10-28', { compromisoId: 'w' })], '2026-10-30').pendientes).toEqual([]);
  });

  it('un quincenal del 30 creado y pagado el 30 no queda debiendo', async () => {
    const { vencimientosSinPagar: sinPagar } = await import('../../modules/infra/vencimientos.js');
    const q = disney({ id: 'q', frecuencia: 'Quincenal', diaPago: 30, fechaCreacion: '2026-10-30T12:00:00' });
    expect(sinPagar(q, [pago('2026-10-30', { compromisoId: 'q' })], '2026-11-10').pendientes).toEqual([]);
    expect(sinPagar(q, [pago('2026-10-30', { compromisoId: 'q' })], '2026-11-20').pendientes).toEqual(['2026-11-15']);
  });

  it('un anual con un pago en un mes que no le toca no queda "pagado" ese mes', () => {
    const anual = disney({ id: 'a', frecuencia: 'Anual', diaPago: 10, fechaCreacion: '2025-03-10T12:00:00' });
    expect(estadoPagoMes([pago('2026-11-05', { compromisoId: 'a' })], anual, '2026-11')).toBe('ninguno');
  });

  it('la situación del fijo: el vencimiento real, desde cuándo y el último pago', async () => {
    const { situacionDelFijo } = await import('../../modules/infra/vencimientos.js');
    expect(situacionDelFijo(disney(), [], HOY)).toMatchObject({ fecha: '2026-07-15', vencido: true, pendientes: 5, inicio: '2026-07-15', ultimoPago: null });
    const al = [pago('2026-07-15'), pago('2026-08-15'), pago('2026-09-15'), pago('2026-10-15'), pago('2026-11-15')];
    expect(situacionDelFijo(disney(), al, HOY)).toMatchObject({ fecha: '2026-12-15', vencido: false, pendientes: 0, ultimoPago: '2026-11-15' });
    const anual = disney({ id: 'a', frecuencia: 'Anual', diaPago: 10, fechaCreacion: '2026-03-10T12:00:00' });
    expect(situacionDelFijo(anual, [pago('2026-03-10', { compromisoId: 'a' })], HOY).fecha).toBe('2027-03-10');
  });

  it('tras un cambio de frecuencia (reinicio), lo pagado antes es historia y el calendario nuevo empieza ahí', async () => {
    const { vencimientosSinPagar: sinPagar } = await import('../../modules/infra/vencimientos.js');
    const pagos = [pago('2026-07-15'), pago('2026-08-15'), pago('2026-09-15'), pago('2026-10-15')];
    const semanal = disney({ frecuencia: 'Semanal', reinicio: '2026-11-01' });
    // Sin reinicio, los cuatro pagos mensuales se repartirían entre ~18 semanas.
    expect(sinPagar(disney({ frecuencia: 'Semanal' }), pagos, HOY).pendientes.length).toBeGreaterThan(10);
    expect(sinPagar(semanal, pagos, HOY).pendientes.every(f => f >= '2026-11-01')).toBe(true);
    expect(sinPagar(semanal, pagos, HOY).pendientes.length).toBeLessThanOrEqual(3);
  });
});

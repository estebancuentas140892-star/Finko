/**
 * resumen-apartado.test.js - la hoja Resumen de cada pestaña de Gastos, como
 * la página 6 del lienzo "Gastos · Rediseño integral" (GAS.15d, ADR 192).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  cifraCorta, finDeVentana, moverVentana, mesesDeLaVentana, familiaDeFijo,
  htmlGraficaResumen, htmlCuerpoDiaADia, htmlCuerpoLimites, htmlCuerpoFijos, htmlCuerpoDeudas,
} from '../../modules/ui/resumen-apartado.js';
import { S } from '../../modules/core/state.js';
import { filasResumenDelMes } from '../../modules/dominio/compromisos/view.js';

const m = (n) => `$${String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
const div = (html) => { const d = document.createElement('div'); d.innerHTML = html; return d; };
const txt = (el) => el?.textContent.replace(/\s+/g, ' ').trim();

describe('la gráfica de seis meses (ADR 192 D1 y D2)', () => {
  it('cifraCorta: "989 mil", "1,2 M", sin el signo', () => {
    expect(cifraCorta(988_800)).toBe('989 mil');
    expect(cifraCorta(1_200_000)).toBe('1,2 M');
    expect(cifraCorta(1_584_800)).toBe('1,6 M');
    expect(cifraCorta(999_600)).toBe('1 M');
    expect(cifraCorta(800)).toBe('800');
    expect(cifraCorta(0)).toBe('0');
  });

  it('la ventana termina en el mes tope si el mes visto cabe en ella; si no, en el visto', () => {
    const tope = { anio: 2026, mes: 10 };
    expect(finDeVentana({ anio: 2026, mes: 10 }, tope)).toEqual(tope);
    expect(finDeVentana({ anio: 2026, mes: 5 }, tope)).toEqual(tope);
    expect(finDeVentana({ anio: 2026, mes: 4 }, tope)).toEqual({ anio: 2026, mes: 4 });
    expect(mesesDeLaVentana({ anio: 2026, mes: 1 }).map(x => `${x.anio}-${x.mes}`))
      .toEqual(['2025-8', '2025-9', '2025-10', '2025-11', '2026-0', '2026-1']);
  });

  it('"Meses anteriores" no empieza antes del primer mes; "Meses siguientes" no pasa del tope', () => {
    const lim = { tope: { anio: 2026, mes: 10 }, primero: { anio: 2026, mes: 1 } };
    expect(moverVentana({ anio: 2026, mes: 10 }, -6, lim)).toEqual({ anio: 2026, mes: 6 });
    expect(moverVentana({ anio: 2026, mes: 6 }, 6, lim)).toEqual({ anio: 2026, mes: 10 });
    expect(moverVentana({ anio: 2026, mes: 10 }, -6, { ...lim, primero: { anio: 2025, mes: 0 } })).toEqual({ anio: 2026, mes: 4 });
  });

  it('cada mes con su cifra, su barra y su nombre corto; el visto resaltado', () => {
    const serie = [5, 6, 7, 8, 9, 10].map((mes, i) => ({ anio: 2026, mes, valor: (i + 1) * 100_000, fuera: false }));
    const d = div(htmlGraficaResumen('gast', serie, { visto: { anio: 2026, mes: 10 }, oculto: false, hayAnteriores: true, haySiguientes: false, m }));
    const barras = d.querySelectorAll('.resumen-barra');
    expect(barras).toHaveLength(6);
    expect([...barras].map(b => b.querySelector('.resumen-barra__mes').textContent)).toEqual(['Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov']);
    expect(barras[5].getAttribute('aria-pressed')).toBe('true');
    expect(barras[5].querySelector('.resumen-barra__cifra').textContent).toBe('600 mil');
    expect(barras[5].querySelector('.resumen-barra__fill').getAttribute('style')).toContain('--alto: 100%');
    expect(barras[2].querySelector('.resumen-barra__fill').getAttribute('style')).toContain('--alto: 50%');
    expect(d.querySelector('[aria-label="Meses anteriores"]').disabled).toBe(false);
    expect(d.querySelector('[aria-label="Meses siguientes"]')).toBeNull();
    expect(txt(d.querySelector('.resumen-graf__anio'))).toBe('2026');
  });

  it('con el ojo puesto no van las cifras ni los altos', () => {
    const serie = [{ anio: 2026, mes: 10, valor: 500_000, fuera: false }];
    const d = div(htmlGraficaResumen('gast', serie, { visto: { anio: 2026, mes: 10 }, oculto: true, hayAnteriores: false, haySiguientes: false, m }));
    expect(d.querySelector('.resumen-barra__cifra').textContent).toBe('');
    expect(d.querySelector('.resumen-barra__fill').getAttribute('style')).toContain('--alto: 0%');
  });

  it('Límites en porcentaje con la raya del 100 %; Fijos con lo que falta punteado', () => {
    const lim = div(htmlGraficaResumen('presupuesto', [{ anio: 2026, mes: 10, valor: 49, fuera: false }],
      { visto: { anio: 2026, mes: 10 }, oculto: false, hayAnteriores: false, haySiguientes: false, m }));
    expect(lim.querySelector('.resumen-barra__cifra').textContent).toBe('49 %');
    expect(txt(lim.querySelector('.resumen-graf__tope'))).toBe('100 %');
    expect(lim.querySelector('.resumen-graf__que').textContent).toBe('Cuánto usaste de tus límites');
    const fij = div(htmlGraficaResumen('fijos', [{ anio: 2026, mes: 10, valor: 1_200_000, esperado: 1_584_800, fuera: false }],
      { visto: { anio: 2026, mes: 10 }, oculto: false, hayAnteriores: false, haySiguientes: false, m }));
    expect(fij.querySelector('.resumen-barra__esperado').getAttribute('style')).toContain('--alto: 100%');
    expect(fij.querySelector('.resumen-barra__fill').getAttribute('style')).toContain('--alto: 76%');
  });

  it('un mes antes del primero no se toca; la ventana de dos años dice los dos', () => {
    const serie = [{ anio: 2025, mes: 11, valor: 0, fuera: true }, { anio: 2026, mes: 0, valor: 10, fuera: false }];
    const d = div(htmlGraficaResumen('deudas', serie, { visto: { anio: 2026, mes: 0 }, oculto: false, hayAnteriores: false, haySiguientes: true, m }));
    expect(d.querySelectorAll('button.resumen-barra')).toHaveLength(1);
    expect(d.querySelector('.resumen-barra--fuera').tagName).toBe('SPAN');
    expect(txt(d.querySelector('.resumen-graf__anio'))).toBe('2025 · 2026');
    expect(d.querySelector('[aria-label="Meses siguientes"]').dataset.delta).toBe('6');
    expect(d.querySelector('.resumen-graf__que').textContent).toBe('Lo que debías al cierre de cada mes');
  });
});

describe('Día a día (ADR 192 D3)', () => {
  const g = (id, categoria, monto, fecha) => ({ id, categoria, monto, fecha });
  const cats = ['Mercado', 'Ropa', 'Restaurantes', 'Salud', 'Transporte', 'Hogar', 'Café'];
  const estado = { gastos: cats.map((c, i) => g(`g${i}`, c, (7 - i) * 10_000, `2026-11-0${i + 1}`)), categoriasPersonalizadas: [] };

  it('"Gastaste en noviembre", cuánto más que octubre y cuántos gastos', () => {
    const d = div(htmlCuerpoDiaADia(estado, 2026, 10, { oculto: false, m, anterior: 200_000 }));
    expect(txt(d.querySelector('.resumen__que'))).toBe('Gastaste en noviembre');
    expect(txt(d.querySelector('.resumen__cifra'))).toBe('$280.000');
    expect(txt(d.querySelector('.resumen__pastilla'))).toBe('$80.000 más que octubre');
    expect(txt(d.querySelector('.resumen__nota'))).toBe('7 gastos');
    expect(d.querySelectorAll('.resumen__reparto span')).toHaveLength(7);
    expect(txt(d.querySelector('.resumen__salida'))).toBe('Ver los 7 gastos en Movimientos');
    const menos = div(htmlCuerpoDiaADia(estado, 2026, 10, { oculto: false, m, anterior: 300_000 }));
    expect(txt(menos.querySelector('.resumen__pastilla'))).toBe('$20.000 menos que octubre');
    const sinAntes = div(htmlCuerpoDiaADia(estado, 2026, 10, { oculto: false, m, anterior: null }));
    expect(sinAntes.querySelector('.resumen__pastilla')).toBeNull();
  });

  it('cinco categorías y "Otras 2 categorías"; abiertas, todas y "Ver menos"', () => {
    const d = div(htmlCuerpoDiaADia(estado, 2026, 10, { oculto: false, m, anterior: null }));
    const filas = d.querySelectorAll('.resumen__parte');
    expect(filas).toHaveLength(6);
    expect(txt(filas[0].querySelector('.resumen__nombre'))).toBe('Mercado');
    expect(filas[0].querySelector('.resumen__barrita span').getAttribute('style')).toContain('width: 100%');
    expect(txt(filas[5].querySelector('.resumen__nombre'))).toBe('Otras 2 categorías');
    expect(filas[5].dataset.action).toBe('resumen-otras');
    const todas = div(htmlCuerpoDiaADia(estado, 2026, 10, { oculto: false, m, anterior: null, todas: true }));
    expect(todas.querySelectorAll('.resumen__parte')).toHaveLength(7);
    expect(txt(todas.querySelector('.resumen__menos'))).toBe('Ver menos');
  });
});

describe('Límites (ADR 192 D6)', () => {
  const estado = {
    gastos: [
      { id: 'a', categoria: 'Restaurantes', monto: 108_000, fecha: '2026-11-03' },
      { id: 'b', categoria: 'Mercado', monto: 431_400, fecha: '2026-11-04' },
    ],
    presupuestos: [
      { id: 'p1', categoria: 'Mercado', montoMensual: 800_000, activo: true },
      { id: 'p2', categoria: 'Restaurantes', montoMensual: 100_000, activo: true },
    ],
    categoriasPersonalizadas: [],
  };

  it('"Usaste en noviembre $X de $Y", cuántos se pasaron, los días que faltan y cada límite', () => {
    const d = div(htmlCuerpoLimites(estado, 2026, 10, { oculto: false, m, esActual: true, hoyDate: new Date(2026, 10, 22) }));
    expect(txt(d.querySelector('.resumen__que'))).toBe('Usaste en noviembre');
    expect(txt(d.querySelector('.resumen__grande'))).toBe('$539.400de $900.000');
    expect(txt(d.querySelector('.resumen__pastilla'))).toBe('1 de 2 límites se pasó');
    expect(txt(d.querySelector('.resumen__nota'))).toBe('faltan 8 días');
    const filas = d.querySelectorAll('.resumen__parte--limite');
    expect([...filas].map(x => x.dataset.categoria)).toEqual(['Restaurantes', 'Mercado']);
    expect(filas[0].dataset.estado).toBe('mal');
    expect(txt(filas[0].querySelector('.resumen__uso'))).toBe('$108.000 de $100.000');
    expect(txt(filas[0].querySelector('.resumen__pct'))).toBe('108 %');
    expect(txt(d.querySelector('.resumen__salida'))).toBe('Ver los gastos con límite en Movimientos');
  });

  it('sin límites pasados lo dice; un mes cerrado no cuenta días', () => {
    const d = div(htmlCuerpoLimites({ ...estado, gastos: [] }, 2026, 9, { oculto: false, m, esActual: false, hoyDate: new Date(2026, 10, 22) }));
    expect(txt(d.querySelector('.resumen__pastilla'))).toBe('Ningún límite se pasó');
    expect(d.querySelector('.resumen__nota')).toBeNull();
  });
});

describe('Fijos y Deudas (ADR 192 D4 y D5)', () => {
  it('familiaDeFijo: casa, conexión, salud, estudio u otros', () => {
    expect(familiaDeFijo('Arriendo')).toBe('casa');
    expect(familiaDeFijo('Streaming')).toBe('conexion');
    expect(familiaDeFijo('Gimnasio')).toBe('salud');
    expect(familiaDeFijo('Algo raro')).toBe('otros');
  });

  it('Fijos: "Pagaste … de …", "1 de 3 pagos · 1 vencido", la leyenda y cada fijo con su estado', () => {
    const filas = [
      { nombre: 'Netflix', teja: '', estado: 'vencido', fecha: '2026-11-12', monto: 44_900, familia: 'conexion' },
      { nombre: 'Arriendo', teja: '', estado: 'pagado', fecha: '2026-11-05', monto: 1_200_000, familia: 'casa' },
      { nombre: 'EPM', teja: '', estado: 'pendiente', fecha: '2026-11-24', monto: 185_000, familia: 'casa' },
    ];
    const d = div(htmlCuerpoFijos({ filas, pagado: 1_200_000, total: 1_429_900 }, 2026, 10, { oculto: false, m }));
    expect(txt(d.querySelector('.resumen__grande'))).toBe('$1.200.000de $1.429.900');
    expect(txt(d.querySelector('.resumen__pastilla'))).toBe('1 de 3 pagos · 1 vencido');
    expect([...d.querySelectorAll('.resumen__ley')].map(txt)).toEqual(['Casa 97 %', 'Conexión 3 %']);
    expect([...d.querySelectorAll('.resumen__pago-estado')].map(txt)).toEqual(['Venció el 12 nov', 'Pagado el 5 nov', 'Vence el 24 nov']);
    expect(txt(d.querySelector('.resumen__salida'))).toBe('Ver los pagos de fijos en Movimientos');
  });

  it('Deudas: "de $X en cuotas", "Tu deuda bajó", la tarjeta de las cuotas y el orden del lienzo', () => {
    const filas = [
      { nombre: 'Juan Diego', teja: '', estado: 'vencido', fecha: '2026-11-10', cuota: 100_000, pagado: 0, saldo: 600_000 },
      { nombre: 'Libre inversión', teja: '', estado: 'pendiente', fecha: '2026-11-28', cuota: 400_000, pagado: 0, saldo: 6_000_000 },
      { nombre: 'Tarjeta Bancolombia', teja: '', estado: 'pagado', fecha: '2026-11-14', cuota: 180_000, pagado: 180_000, saldo: 1_450_000 },
    ];
    const d = div(htmlCuerpoDeudas({ filas, abonado: 180_000, cuotas: 680_000, bajo: 180_000 }, 2026, 10, { oculto: false, m, esActual: true }));
    expect(txt(d.querySelector('.resumen__grande'))).toBe('$180.000de $680.000 en cuotas');
    expect(txt(d.querySelector('.resumen__pastilla'))).toBe('Tu deuda bajó $180.000');
    expect(txt(d.querySelector('.resumen__cuotas-fila'))).toBe('Cuotas de noviembre$180.000 de $680.000');
    expect(txt(d.querySelector('.resumen__cuotas-cuenta'))).toBe('1 al día1 por pagar1 vencida');
    expect([...d.querySelectorAll('.resumen__pago-nombre')].map(txt)).toEqual(['Tarjeta Bancolombia', 'Libre inversión', 'Juan Diego']);
    expect([...d.querySelectorAll('.resumen__pago-estado')].map(txt))
      .toEqual(['Abonaste $180.000 · al día', 'Cuota de $400.000 · vence el 28', 'Cuota de $100.000 · venció el 10']);
    expect(txt(d.querySelector('.resumen__pago-bajo'))).toBe('debes');
    const subio = div(htmlCuerpoDeudas({ filas, abonado: 0, cuotas: 680_000, bajo: -50_000 }, 2026, 9, { oculto: false, m, esActual: false }));
    expect(txt(subio.querySelector('.resumen__pastilla'))).toBe('Tu deuda subió $50.000');
    expect(subio.querySelector('.resumen__cuotas')).toBeNull();
    expect(txt(subio.querySelector('.resumen__grande'))).toBe('$0');
  });
});

describe('filasResumenDelMes (ADR 192 D4)', () => {
  let antes;
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date(2026, 10, 22, 12) });
    antes = { compromisos: S.compromisos, gastos: S.gastos };
  });
  afterEach(() => {
    S.compromisos = antes.compromisos;
    S.gastos = antes.gastos;
    vi.useRealTimers();
  });

  it('lo vencido, lo pagado con su fecha y lo que falta; otro mes, lo no pagado quedó vencido', () => {
    S.compromisos = [
      { id: 'f1', tipo: 'fijo', descripcion: 'Netflix', categoria: 'Streaming', monto: 44_900, diaPago: 12, frecuencia: 'Mensual', activo: true, fechaCreacion: '2026-11-01' },
      { id: 'f2', tipo: 'fijo', descripcion: 'Arriendo', categoria: 'Arriendo', monto: 1_200_000, diaPago: 5, frecuencia: 'Mensual', activo: true, fechaCreacion: '2026-10-01' },
      { id: 'f3', tipo: 'fijo', descripcion: 'EPM', categoria: 'Servicios públicos', monto: 185_000, diaPago: 24, frecuencia: 'Mensual', activo: true, fechaCreacion: '2026-11-01' },
    ];
    S.gastos = [
      { id: 'p1', compromisoId: 'f2', categoria: 'Gastos fijos', monto: 1_200_000, fecha: '2026-10-05' },
      { id: 'p2', compromisoId: 'f2', categoria: 'Gastos fijos', monto: 1_200_000, fecha: '2026-11-05' },
    ];
    const filas = filasResumenDelMes('fijo', '2026-11', new Date(2026, 10, 22, 12));
    expect(filas.map(x => [x.c.id, x.estado, x.fecha, x.monto])).toEqual([
      ['f1', 'vencido', '2026-11-12', 44_900],
      ['f2', 'pagado', '2026-11-05', 1_200_000],
      ['f3', 'pendiente', '2026-11-24', 185_000],
    ]);
  });
});

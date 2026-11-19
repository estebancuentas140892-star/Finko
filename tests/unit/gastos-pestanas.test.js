/**
 * gastos-pestanas.test.js - Gastos en cuatro pestañas (GAS.7, ADR 179).
 *
 * Cubre:
 * - D1 (GAS.7a): `#fijos` y `#deudas` son lentes de `sec-compromisos`
 *   (`seccionDelHash`, `renderSmart`, el ojo de la sección), la pestaña manda
 *   sobre el chip (`filtroDeLente`), sin chips en la lista, el hero suma solo
 *   su tipo, el lote paga lo vencido de su tipo y `lentePorPagar` decide a qué
 *   pestaña cae `#compromisos` en el teléfono.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { S } from '../../modules/core/state.js';
import { seccionDelHash } from '../../modules/infra/router.js';
import { renderSmart } from '../../modules/infra/render.js';
import { seccionVisible } from '../../modules/infra/privacidad.js';
import {
  renderListaCompromisos, setFiltroPorPagar, filtroDeLente, lentePorPagar, faltaPorPagarDelMes,
} from '../../modules/dominio/compromisos/views/lista.js';
import { irAMesActualBloque } from '../../modules/infra/mes-bloque.js';
import {
  renderFiltrosGastos, renderListaGastos, setFiltroCategoria, textosFilaGasto, abrirDiaGastos,
} from '../../modules/dominio/gastos/view.js';

const hoyIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const fijo = (o = {}) => ({
  id: 'f1', descripcion: 'Arriendo', tipo: 'fijo', monto: 900_000,
  frecuencia: 'Mensual', diaPago: 28, categoria: 'Vivienda', activo: true, ...o,
});
const deuda = (o = {}) => ({
  id: 'd1', descripcion: 'Tarjeta Visa', tipo: 'deuda-entidad', saldoTotal: 2_000_000,
  cuotaMensual: 200_000, frecuencia: 'Mensual', diaPago: 28, categoria: 'Tarjeta de crédito',
  activo: true, ...o,
});

describe('las pestañas Fijos y Deudas son lentes de Por pagar (ADR 179 D1)', () => {
  afterEach(() => { location.hash = ''; });

  it('seccionDelHash: fijos y deudas son de compromisos; el resto, de sí mismo', () => {
    expect(seccionDelHash('fijos')).toBe('compromisos');
    expect(seccionDelHash('deudas')).toBe('compromisos');
    expect(seccionDelHash('compromisos')).toBe('compromisos');
    expect(seccionDelHash('gast')).toBe('gast');
    expect(seccionDelHash('no-existe')).toBe('no-existe');
  });

  it('renderSmart pinta Por pagar en las dos pestañas y no en otra sección', () => {
    let veces = 0;
    for (const h of ['#fijos', '#deudas', '#compromisos', '#gast']) {
      location.hash = h;
      renderSmart(() => { veces += 1; }, 'compromisos');
    }
    expect(veces).toBe(3);
  });

  it('el ojo de una pestaña es el de Por pagar', () => {
    location.hash = '#deudas';
    expect(seccionVisible()).toBe('compromisos');
  });

  it('filtroDeLente: la pestaña da su tipo; Por pagar no da ninguno', () => {
    expect(filtroDeLente('fijos')).toBe('fijo');
    expect(filtroDeLente('deudas')).toBe('deuda');
    expect(filtroDeLente('compromisos')).toBeNull();
  });
});

describe('la lista y el hero dentro de una pestaña (ADR 179 D1)', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="lista-compromisos"></div>';
    S.compromisos = [fijo(), deuda()];
    S.gastos = [];
    setFiltroPorPagar('todo');
    irAMesActualBloque();
  });
  afterEach(() => {
    setFiltroPorPagar('todo');
    location.hash = '';
  });

  it('en Fijos no hay chips y solo van los fijos, aunque el chip diga Deudas', () => {
    setFiltroPorPagar('deuda');
    location.hash = '#fijos';
    renderListaCompromisos();
    expect(document.querySelector('.filtros-bar')).toBeNull();
    expect([...document.querySelectorAll('.deuda-card')].map(c => c.dataset.id)).toEqual(['f1']);
  });

  it('en Deudas solo van las deudas', () => {
    location.hash = '#deudas';
    renderListaCompromisos();
    expect([...document.querySelectorAll('.deuda-card')].map(c => c.dataset.id)).toEqual(['d1']);
  });

  it('en Por pagar (escritorio) siguen los cuatro chips', () => {
    location.hash = '#compromisos';
    renderListaCompromisos();
    expect(document.querySelectorAll('.filtros-bar .chip')).toHaveLength(4);
  });

  it('el hero suma solo el tipo de la pestaña', () => {
    location.hash = '#fijos';
    expect(faltaPorPagarDelMes().total).toBe(900_000);
    location.hash = '#deudas';
    expect(faltaPorPagarDelMes().total).toBe(200_000);
    location.hash = '#compromisos';
    expect(faltaPorPagarDelMes().total).toBe(1_100_000);
  });
});

describe('lentePorPagar(): a qué pestaña cae #compromisos en el teléfono', () => {
  beforeEach(() => {
    S.gastos = [];
    setFiltroPorPagar('todo');
  });
  afterEach(() => setFiltroPorPagar('todo'));

  it('el chip que trae quien llega manda', () => {
    S.compromisos = [fijo(), deuda()];
    setFiltroPorPagar('deuda');
    expect(lentePorPagar()).toBe('deudas');
    setFiltroPorPagar('fijo');
    expect(lentePorPagar()).toBe('fijos');
  });

  it('sin chip, la que tiene algo vencido', () => {
    const dia = new Date().getDate();
    if (dia < 2) return; // el día 1 no hay nada vencido todavía
    S.compromisos = [
      fijo({ diaPago: 28, fechaCreacion: '2020-01-01' }),
      deuda({ diaPago: 1, fechaCreacion: '2020-01-01' }),
    ];
    // Solo la deuda venció (el día 1); el fijo vence el 28.
    if (dia >= 28) return;
    expect(lentePorPagar()).toBe('deudas');
  });

  it('sin vencidos: Fijos si hay fijos, Deudas si solo hay deudas', () => {
    S.compromisos = [fijo({ diaPago: 28 }), deuda({ diaPago: 28 })];
    if (new Date().getDate() >= 28) return;
    expect(lentePorPagar()).toBe('fijos');
    S.compromisos = [deuda({ diaPago: 28 })];
    expect(lentePorPagar()).toBe('deudas');
    S.compromisos = [];
    expect(lentePorPagar()).toBe('fijos');
  });

  it('un fijo vencido y pagado no cuenta como vencido', () => {
    if (new Date().getDate() < 2) return;
    S.compromisos = [fijo({ id: 'f9', diaPago: 1, fechaCreacion: '2020-01-01' }), deuda({ diaPago: 28 })];
    S.gastos = [{ id: 'g1', compromisoId: 'f9', monto: 900_000, categoria: 'Gastos fijos', fecha: hoyIso() }];
    expect(lentePorPagar()).toBe('fijos');
  });
});

describe('Día a día en el teléfono (GAS.7c, ADR 179 D3)', () => {
  const original = window.matchMedia;
  const telefono = () => { window.matchMedia = (q) => ({ matches: true, media: q, addEventListener() {}, removeEventListener() {} }); };
  const g = (id, categoria, monto, fecha = hoyIso(), extra = {}) => ({ id, categoria, monto, fecha, cuentaId: 'c1', ...extra });

  beforeEach(() => {
    telefono();
    document.body.innerHTML = '<div id="panel-filtros-gastos"></div><div id="lista-gastos"></div><div id="gastos-compacta" hidden></div>';
    S.cuentas = [{ id: 'c1', nombre: 'Nequi', activa: true, saldo: 0 }];
    S.compromisos = [];
    S.presupuestos = [];
    S.config = {};
    irAMesActualBloque();
    setFiltroCategoria(null);
  });
  afterEach(() => {
    window.matchMedia = original;
    setFiltroCategoria(null);
    document.body.innerHTML = '';
  });

  it('cada chip dice cuánto lleva su categoría', () => {
    S.gastos = [g('a', 'Mercado', 412_000), g('b', 'Restaurantes', 45_000)];
    renderFiltrosGastos();
    const chip = document.querySelector('[data-action="gastos-filtrar-cat"][data-cat="Mercado"]');
    expect(chip.querySelector('.chip__monto').textContent).toBe('$412.000');
    expect(chip.getAttribute('aria-label')).toBe('Filtrar por Mercado, $412.000');
  });

  it('sin chip, la tarjeta cuenta los gastos y aclara lo que no cuenta', () => {
    S.gastos = [g('a', 'Mercado', 1_000), g('b', 'Café', 2_000), g('c', 'Gastos fijos', 9_000)];
    renderFiltrosGastos();
    expect(document.querySelector('.hero-gastos__lectura').textContent).toBe('2 gastos · sin contar fijos ni deudas');
  });

  it('con un chip y su límite pasado: la barra y "Te pasaste"', () => {
    S.gastos = [g('a', 'Restaurantes', 200_000), g('b', 'Restaurantes', 145_000), g('c', 'Mercado', 5_000)];
    S.presupuestos = [{ id: 'p1', categoria: 'Restaurantes', montoMensual: 300_000, activo: true }];
    setFiltroCategoria('Restaurantes');
    renderFiltrosGastos();
    expect(document.querySelector('.hero-gastos__comp .chip').textContent).toBe('2 gastos');
    expect(document.querySelector('.hero-gastos__barra--pasado')).not.toBeNull();
    expect(document.querySelector('.hero-gastos__lectura').textContent).toBe('Te pasaste $45.000 de tu límite de $300.000');
  });

  it('con un chip, la fila no repite la categoría', () => {
    expect(textosFilaGasto({ categoria: 'Restaurantes', descripcion: 'Cena', cuentaId: 'c1' }, S.cuentas, { conCategoria: false }).subtitulo).toBe('Nequi');
    expect(textosFilaGasto({ categoria: 'Restaurantes', descripcion: 'Cena', cuentaId: 'c1' }, S.cuentas).subtitulo).toBe('Restaurantes · Nequi');
  });

  it('un día con más de cinco gastos muestra cuatro y "N gastos más"; abrirlo los muestra todos', () => {
    const fecha = hoyIso();
    S.gastos = Array.from({ length: 6 }, (_, i) => g(`d${i}`, 'Café', 1_000 * (i + 1), fecha));
    renderListaGastos();
    expect(document.querySelectorAll('#lista-gastos .list-item--detalle')).toHaveLength(4);
    const mas = document.querySelector('[data-action="gastos-dia-mas"]');
    expect(mas.textContent.replace(/\s+/g, ' ').trim()).toMatch(/^2 gastos más de hoy \$/);
    abrirDiaGastos(fecha);
    renderListaGastos();
    expect(document.querySelectorAll('#lista-gastos .list-item--detalle')).toHaveLength(6);
  });

  it('el aviso de lo vencido nombra el pago más antiguo y lleva a su pestaña', () => {
    if (new Date().getDate() < 3) return;
    S.gastos = [g('a', 'Mercado', 1_000)];
    S.compromisos = [
      { id: 'f1', tipo: 'fijo', descripcion: 'Netflix', monto: 44_900, frecuencia: 'Mensual', diaPago: 1, activo: true, fechaCreacion: '2020-01-01' },
    ];
    renderFiltrosGastos();
    const aviso = document.querySelector('.gastos-vencido');
    expect(aviso.querySelector('.gastos-vencido__titulo').textContent).toMatch(/^Netflix venció /);
    expect(aviso.querySelector('.gastos-vencido__sub').textContent).toBe('Gasto fijo · $44.900');
    expect(aviso.querySelector('[data-action="gastos-ver-vencido"]').dataset.id).toBe('f1');
  });
});

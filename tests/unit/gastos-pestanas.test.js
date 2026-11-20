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
  setGrupoDeudas, grupoDeudasVisible,
} from '../../modules/dominio/compromisos/views/lista.js';
import { irAMesActualBloque } from '../../modules/infra/mes-bloque.js';
import {
  renderFiltrosGastos, renderListaGastos, setFiltroCategoria, textosFilaGasto, abrirDiaGastos, alternarSemanaGastos,
  complementoDiaGastos,
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


/**
 * El día 1 del mes en curso (o `meses` antes), a mediodía local. GAS.9c (ADR
 * 183 D3): sin pagos, lo que vence desde la creación está vencido, así que
 * un compromiso de prueba nace en el mes que el escenario mira.
 */
function _inicioDelMes(meses = 0) {
  const ahora = new Date();
  return new Date(ahora.getFullYear(), ahora.getMonth() + meses, 1, 12).toISOString();
}

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
      fijo({ diaPago: 28, fechaCreacion: _inicioDelMes() }),
      deuda({ diaPago: 1, fechaCreacion: _inicioDelMes() }),
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
    S.compromisos = [fijo({ id: 'f9', diaPago: 1, fechaCreacion: _inicioDelMes() }), deuda({ diaPago: 28 })];
    S.gastos = [{ id: 'g1', compromisoId: 'f9', monto: 900_000, categoria: 'Gastos fijos', fecha: hoyIso() }];
    expect(lentePorPagar()).toBe('fijos');
  });
});

describe('Día a día en el teléfono (GAS.7c, ADR 179 D3; GAS.8b, ADR 182 D2)', () => {
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

  it('los chips solo filtran: sin total, con la lupa y "Todo" delante (GAS.8b; GAS.10a, ADR 185 D1)', () => {
    S.gastos = [g('a', 'Mercado', 412_000), g('b', 'Restaurantes', 45_000)];
    renderFiltrosGastos();
    const chip = document.querySelector('[data-action="gastos-filtrar-cat"][data-cat="Mercado"]');
    expect(chip.querySelector('.chip__monto')).toBeNull();
    expect(chip.getAttribute('aria-label')).toBe('Filtrar por Mercado');
    const barra = document.querySelector('#panel-filtros-gastos .filtros-bar');
    expect(barra.firstElementChild.getAttribute('aria-label')).toBe('Buscar y filtrar en Movimientos');
    expect(barra.firstElementChild.querySelector('use').getAttribute('href')).toBe('#i-search');
    expect([...barra.querySelectorAll('.chip')].map(c => c.textContent.trim())).toEqual(['Todo', 'Mercado', 'Restaurantes']);
  });

  it('la categoría elegida pasa al frente, junto a "Todo" (GAS.8b)', () => {
    S.gastos = [g('a', 'Mercado', 412_000), g('b', 'Restaurantes', 45_000), g('c', 'Ropa', 9_000)];
    setFiltroCategoria('Ropa');
    renderFiltrosGastos();
    expect([...document.querySelectorAll('#panel-filtros-gastos .chip')].map(c => c.textContent.trim())).toEqual(['Todo', 'Ropa', 'Mercado', 'Restaurantes']);
  });

  it('sin chip, la barra por categoría en su tono y la leyenda de las dos primeras (GAS.8b)', () => {
    S.gastos = [g('a', 'Mercado', 540), g('b', 'Restaurantes', 220), g('c', 'Ropa', 220), g('d', 'Transporte', 20)];
    renderFiltrosGastos();
    const tramos = [...document.querySelectorAll('.hero-gastos__tramo')];
    expect(tramos).toHaveLength(4);
    expect(tramos[0].getAttribute('style')).toContain('--fk-cat-mercado-barra');
    const leyenda = [...document.querySelectorAll('.hero-gastos__ley')].map(l => l.textContent.trim());
    expect(leyenda).toEqual(['Mercado 54 %', 'Restaurantes 22 %']);
    expect(document.querySelector('.hero-gastos__categorias').getAttribute('href')).toBe('#analisis');
  });

  it('el ojo tapa la barra por categoría', () => {
    S.gastos = [g('a', 'Mercado', 540)];
    S.config = { ocultarPorSeccion: { gast: true } };
    renderFiltrosGastos();
    expect(document.querySelector('.hero-gastos__reparto')).toBeNull();
  });

  it('sin chip, la tarjeta cuenta los gastos y aclara lo que no cuenta', () => {
    S.gastos = [g('a', 'Mercado', 1_000), g('b', 'Café', 2_000), g('c', 'Gastos fijos', 9_000)];
    renderFiltrosGastos();
    expect(document.querySelector('.hero-gastos__lectura').textContent).toBe('2 gastos · sin contar fijos ni deudas');
  });

  it('con un chip y su límite pasado: la parte del mes y la ficha con "Te pasaste" (GAS.8b)', () => {
    S.gastos = [g('a', 'Restaurantes', 200_000), g('b', 'Restaurantes', 145_000), g('c', 'Mercado', 5_000)];
    S.presupuestos = [{ id: 'p1', categoria: 'Restaurantes', montoMensual: 300_000, activo: true }];
    setFiltroCategoria('Restaurantes');
    renderFiltrosGastos();
    expect(document.querySelector('.hero-gastos__lectura').textContent).toBe('2 gastos · el 99 % de lo que gastaste este mes');
    const ficha = document.querySelector('.hero-gastos__limite--pasado');
    expect(ficha.querySelector('.hero-gastos__limite-fila').textContent.replace(/\s+/g, ' ').trim()).toBe('Límite de Restaurantes Te pasaste $45.000');
    expect(ficha.querySelector('.hero-gastos__limite-pie').textContent).toMatch(/^115 % de \$300\.000/);
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

  it('sin franja de lo vencido: lo avisan Atención hoy y la pestaña (GAS.10a, ADR 185 D1)', () => {
    if (new Date().getDate() < 3) return;
    S.gastos = [g('a', 'Mercado', 1_000)];
    S.compromisos = [
      { id: 'f1', tipo: 'fijo', descripcion: 'Netflix', monto: 44_900, frecuencia: 'Mensual', diaPago: 1, activo: true, fechaCreacion: _inicioDelMes() },
    ];
    renderFiltrosGastos();
    expect(document.querySelector('#panel-filtros-gastos .franja-alerta')).toBeNull();
  });

  it('el día lleva su complemento: "jue 19" con Hoy y el mes con el nombre (GAS.10a)', () => {
    const fecha = hoyIso();
    S.gastos = [g('a', 'Mercado', 1_000, fecha)];
    renderListaGastos();
    const extra = document.querySelector('#lista-gastos .gastos-dia__extra');
    expect(extra.textContent).toBe(`· ${complementoDiaGastos(fecha)}`);
    expect(complementoDiaGastos(fecha)).toMatch(/^[a-zé]{3} \d{1,2}$/);
    expect(complementoDiaGastos('2026-11-17')).toBe('nov');
  });

  it('el mes sin gastos: Tino al lado de la frase, cuatro tejas con su categoría y la pista de Fijos (GAS.8c; GAS.10a, ADR 185 D2)', () => {
    S.gastos = [];
    renderListaGastos();
    const vacio = document.querySelector('#lista-gastos .dia-nuevo');
    expect(vacio.querySelector('.dia-nuevo__titulo').textContent).toBe('Aquí verás en qué se va tu dinero');
    expect(vacio.querySelector('.dia-nuevo__texto').textContent).toBe('Cada gasto que registres aparece aquí, ordenado por día.');
    expect(vacio.querySelector('.dia-nuevo__cta')).toBeNull();
    expect(vacio.querySelector('.tino-sol--libre')).not.toBeNull();
    const tejas = [...vacio.querySelectorAll('.dia-nuevo__teja')];
    expect(tejas.map(t => t.dataset.categoria)).toEqual(['Mercado', 'Restaurantes', 'Transporte', 'Café']);
    expect(tejas[0].querySelector('.cat-teja').dataset.cat).toBe('mercado');
    expect(tejas.map(t => t.textContent.trim())).toEqual(['Mercado', 'Restaurantes', 'Transporte', 'Café']);
    const pista = vacio.querySelector('.dia-nuevo__pista');
    expect(pista.getAttribute('href')).toBe('#fijos');
    expect(pista.textContent.replace(/\s+/g, ' ').trim()).toBe('¿Pagas algo cada mes? Anótalo en Fijos');
  });

  it('con un fijo no va la pista; con gastos de otro mes, el título dice el mes (GAS.8c)', () => {
    S.compromisos = [{ id: 'f1', tipo: 'fijo', descripcion: 'Arriendo', monto: 1, diaPago: 1, activo: true }];
    S.gastos = [g('a', 'Mercado', 1_000, '2020-01-05')];
    renderListaGastos();
    expect(document.querySelector('.dia-nuevo__pista')).toBeNull();
    expect(document.querySelector('.dia-nuevo__titulo').textContent).toMatch(/^Todavía no hay gastos en /);
  });

  it('Gastos fantasma va después del primer día; descartada en el mes, no sale (GAS.8c)', () => {
    const fecha = hoyIso();
    S.gastos = [g('x', 'Mercado', 300_000, fecha), ...Array.from({ length: 12 }, (_, i) => g(`c${i}`, 'Café', 9_000, fecha))];
    renderListaGastos();
    const lista = document.getElementById('lista-gastos');
    const fantasma = lista.querySelector('.gastos-fantasma');
    expect(fantasma.querySelector('.sugerencia__titulo').textContent).toBe('Gastos fantasma');
    expect(fantasma.querySelector('.sugerencia__texto').textContent).toBe('12 cafés y antojos pequeños ya suman $108.000 este mes.');
    expect(fantasma.querySelector('.sugerencia__enlace').dataset.hoja).toBe('hormiga');
    expect(fantasma.querySelector('.tino-sol').dataset.pose).toBe('con-lupa');
    expect(fantasma.previousElementSibling.classList.contains('gastos-dia')).toBe(true);

    S.config = { fantasmaDescartado: fantasma.querySelector('.sugerencia__cerrar').dataset.mes };
    renderListaGastos();
    expect(lista.querySelector('.gastos-fantasma')).toBeNull();
  });

  it('la semana más reciente va por día y las anteriores se pliegan (GAS.8b)', () => {
    const hoyD = new Date();
    if (hoyD.getDate() < 15) return; // hace falta otra semana dentro del mes
    const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const haceDias = (n) => iso(new Date(hoyD.getFullYear(), hoyD.getMonth(), hoyD.getDate() - n));
    S.gastos = [g('a', 'Mercado', 1_000, hoyIso()), g('b', 'Café', 2_000, haceDias(8)), g('c', 'Café', 3_000, haceDias(9))];
    renderListaGastos();
    const filas = document.querySelectorAll('.gastos-semana__fila');
    expect(filas.length).toBeGreaterThanOrEqual(1);
    expect(filas[0].getAttribute('aria-expanded')).toBe('false');
    expect(document.querySelector('.gastos-semanas__titulo').textContent).toBe('Semanas anteriores');
    expect(document.querySelectorAll('#lista-gastos .list-item--detalle')).toHaveLength(1);
    const clave = filas[0].dataset.semana;
    alternarSemanaGastos(clave);
    renderListaGastos();
    expect(document.querySelector('.gastos-semana__fila').getAttribute('aria-expanded')).toBe('true');
    expect(document.querySelectorAll('#lista-gastos .list-item--detalle').length).toBeGreaterThan(1);
    alternarSemanaGastos(clave);
  });
});

describe('Deudas como inventario (GAS.8e, ADR 182 D5)', () => {
  afterEach(() => setGrupoDeudas(null));

  it('la tarjeta suma lo que se debe, las cuotas y la parte de cada grupo', async () => {
    const { htmlHeroDeudas } = await import('../../modules/dominio/compromisos/views/hero.js');
    const div = document.createElement('div');
    div.innerHTML = htmlHeroDeudas([
      deuda({ saldoTotal: 2_000_000, cuotaMensual: 200_000 }),
      deuda({ id: 'p1', tipo: 'deuda-personal', saldoTotal: 500_000, cuotaMensual: 0 }),
      deuda({ id: 'z', saldoTotal: 0 }),
    ], false);
    expect(div.querySelector('.hero-compromisos__label').textContent).toBe('Debes en total');
    expect(div.querySelector('.hero-compromisos__valor').textContent).toBe('$2.500.000');
    expect(div.querySelector('.hero-compromisos__linea').textContent).toBe('Este mes pagas $200.000 en cuotas');
    expect([...div.querySelectorAll('.hero-gastos__ley')].map(e => e.textContent.trim()))
      .toEqual(['Entidades $2.000.000', 'Personas $500.000']);
  });

  it('con el ojo puesto no va la barra, y saldado todo lo dice', async () => {
    const { htmlHeroDeudas } = await import('../../modules/dominio/compromisos/views/hero.js');
    const div = document.createElement('div');
    div.innerHTML = htmlHeroDeudas([deuda()], true);
    expect(div.querySelector('.hero-gastos__reparto')).toBeNull();
    div.innerHTML = htmlHeroDeudas([deuda({ saldoTotal: 0 })], false);
    expect(div.querySelector('.hero-compromisos__linea').textContent).toBe('Ya no le debes nada a nadie');
  });

  it('la puerta sola cae en entidades, salvo que solo haya deudas con personas', () => {
    expect(grupoDeudasVisible(2, 1)).toBe('entidad');
    expect(grupoDeudasVisible(0, 1)).toBe('persona');
    expect(grupoDeudasVisible(0, 0)).toBe('entidad');
    setGrupoDeudas('persona');
    expect(grupoDeudasVisible(2, 0)).toBe('persona');
    setGrupoDeudas('otra');
    expect(grupoDeudasVisible(2, 0)).toBe('entidad');
  });
});

describe('Cada pestaña con su resumen (GAS.9b, ADR 183 D2)', () => {
  it('esDelDiaADia: fuera las internas y todo pago de un fijo o una deuda; la compra con tarjeta sí cuenta', async () => {
    const { esDelDiaADia } = await import('../../modules/dominio/gastos/logic.js');
    expect(esDelDiaADia({ categoria: 'Mercado' })).toBe(true);
    expect(esDelDiaADia({ categoria: 'Gastos fijos', compromisoId: 'f1' })).toBe(false);
    expect(esDelDiaADia({ categoria: 'Streaming', compromisoId: 'f1' })).toBe(false);
    expect(esDelDiaADia({ categoria: 'Restaurantes', compromisoId: 't1', consumoTC: true })).toBe(true);
    expect(esDelDiaADia({ categoria: 'Deudas' })).toBe(false);
  });

  it('la tarjeta de Deudas habla del mes del encabezado: lo pagado en cuotas', async () => {
    const { htmlHeroDeudas } = await import('../../modules/dominio/compromisos/views/hero.js');
    const div = document.createElement('div');
    const deudas = [deuda({ saldoTotal: 2_000_000, cuotaMensual: 200_000 })];
    const gastos = [
      { id: 'a', compromisoId: 'd1', categoria: 'Deudas', monto: 150_000, fecha: '2026-10-05' },
      { id: 'b', compromisoId: 'd1', categoria: 'Restaurantes', monto: 90_000, fecha: '2026-10-07', consumoTC: true },
    ];
    const hoyDate = new Date(2026, 10, 19);
    div.innerHTML = htmlHeroDeudas(deudas, false, { gastos, prefijoMes: '2026-10', hoyDate });
    expect(div.querySelector('.hero-compromisos__linea').textContent).toBe('En octubre pagaste $150.000 en cuotas');
    div.innerHTML = htmlHeroDeudas(deudas, false, { gastos, prefijoMes: '2026-11', hoyDate });
    expect(div.querySelector('.hero-compromisos__linea').textContent).toBe('Este mes pagas $200.000 en cuotas');
    gastos.push({ id: 'c', compromisoId: 'd1', categoria: 'Deudas', monto: 200_000, fecha: '2026-11-03' });
    div.innerHTML = htmlHeroDeudas(deudas, false, { gastos, prefijoMes: '2026-11', hoyDate });
    expect(div.querySelector('.hero-compromisos__linea').textContent).toBe('Este mes pagas $200.000 en cuotas · llevas $200.000');
  });
});

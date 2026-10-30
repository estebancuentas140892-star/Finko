/**
 * detalle-fila.test.js - la hoja de detalle de una fila en móvil (ADR 098 D4).
 *
 * Cubre:
 * - textoAccion() y esAccionPeligrosa(): el texto del botón sale del nombre
 *   accesible de la fila, y eliminar se reconoce para ir aparte.
 * - htmlDetalleFila(): lo que la fila dice, las acciones por el puente
 *   `registrar-abrir` (cierra la hoja y dispara la acción por su nombre) y
 *   eliminar en su propio bloque. Los datos se escapan.
 * - datosDeFila(): lee una fila real de Gastos, día incluido.
 * - Las filas de Gastos y de Movimientos traen el botón que abre la hoja.
 * - Mis cuentas (ADR 109): cuentas, tarjetas, fuentes fijas e ingresos
 *   puntuales traen la hoja; lo que la fila calla viaja como notas y el texto
 *   de cada acción nombra la acción, no la fila.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  textoAccion,
  esAccionPeligrosa,
  htmlDetalleFila,
  datosDeFila,
} from '../../modules/ui/detalle-fila.js';
import { S } from '../../modules/core/state.js';
import { renderListaGastos } from '../../modules/dominio/gastos/view.js';
import { renderMovimientosCompletos } from '../../modules/dominio/movimientos/view.js';
import {
  renderListaCuentas,
  renderTarjetasTC,
  renderListaIngresos,
  renderListaIngresosPuntuales,
} from '../../modules/dominio/tesoreria/view.js';
import { hoy } from '../../modules/infra/utils.js';

describe('textoAccion() / esAccionPeligrosa()', () => {
  it('quita el detalle después de los dos puntos', () => {
    expect(textoAccion('Editar gasto: Mercado Éxito')).toBe('Editar gasto');
    expect(textoAccion('Repetir este gasto')).toBe('Repetir este gasto');
    expect(textoAccion(undefined)).toBe('');
  });

  it('reconoce eliminar en cualquier dominio, y nada más', () => {
    expect(esAccionPeligrosa('eliminar-gasto')).toBe(true);
    expect(esAccionPeligrosa('ahorro-eliminar-aporte')).toBe(true);
    expect(esAccionPeligrosa('eliminar-ingreso-puntual')).toBe(true);
    expect(esAccionPeligrosa('editar-gasto')).toBe(false);
    expect(esAccionPeligrosa('repetir-gasto')).toBe(false);
  });
});

describe('htmlDetalleFila()', () => {
  const datos = {
    iconoHtml: '<span class="teja"></span>',
    titulo: 'Mercado <b>',
    subtitulo: 'Efectivo · Mercado Éxito',
    monto: '$192.870',
    montoClase: '',
    cuando: 'Hoy',
    acciones: [
      { accion: 'repetir-gasto', id: 'g1', etiqueta: 'Repetir este gasto', iconoHref: '#i-recurring' },
      { accion: 'editar-gasto', id: 'g1', etiqueta: 'Editar gasto', iconoHref: '#i-edit' },
      { accion: 'eliminar-gasto', id: 'g1', etiqueta: 'Eliminar gasto', iconoHref: '#i-trash' },
    ],
  };

  beforeEach(() => { document.body.innerHTML = htmlDetalleFila(datos); });

  it('pinta lo que la fila ya decía, escapado', () => {
    expect(document.getElementById('detalle-fila-titulo').textContent).toBe('Mercado <b>');
    expect(document.querySelector('.detalle-fila__monto').textContent).toBe('$192.870');
    expect(document.querySelector('.detalle-fila__cuando').textContent).toBe('Hoy');
  });

  it('las acciones pasan por registrar-abrir con su nombre y su id', () => {
    const botones = [...document.querySelectorAll('.detalle-fila__accion')];
    expect(botones.map(b => b.dataset.action)).toEqual(['registrar-abrir', 'registrar-abrir', 'registrar-abrir']);
    expect(botones.map(b => b.dataset.targetAction)).toEqual(['repetir-gasto', 'editar-gasto', 'eliminar-gasto']);
    for (const b of botones) expect(b.dataset.id).toBe('g1');
  });

  it('las notas van bajo el monto, escapadas; sin notas no hay lista', () => {
    expect(document.querySelector('.detalle-fila__notas')).toBeNull();
    document.body.innerHTML = htmlDetalleFila({ ...datos, notas: ['4x1000', '<i>llave</i>', ''] });
    const notas = [...document.querySelectorAll('.detalle-fila__notas li')];
    expect(notas.map(n => n.textContent)).toEqual(['4x1000', '<i>llave</i>']);
    expect(document.querySelector('.detalle-fila__notas i')).toBeNull();
  });

  it('eliminar va aparte, después de las demás (R53)', () => {
    expect(document.querySelectorAll('.detalle-fila__acciones .detalle-fila__accion')).toHaveLength(2);
    const peligro = document.querySelectorAll('.detalle-fila__peligro .detalle-fila__accion');
    expect(peligro).toHaveLength(1);
    expect(peligro[0].textContent.trim()).toBe('Eliminar gasto');
  });
});

describe('las filas traen la hoja', () => {
  const gasto = (o = {}) => ({
    id: 'g1', monto: 42_000, categoria: 'Cuidado personal', fecha: hoy(),
    descripcion: 'Peluquería', cuentaId: null, creado: hoy(), ...o,
  });

  beforeEach(() => {
    S.gastos = [gasto()];
    S.cuentas = [];
    S.config = { ...(S.config ?? {}), ocultarSaldo: false };
  });

  it('una fila de Gastos abre la hoja y la hoja lee su día, título y acciones', () => {
    document.body.innerHTML = '<div id="panel-filtros-gastos"></div><div id="lista-gastos"></div>';
    renderListaGastos();
    const fila = document.querySelector('#lista-gastos .list-item');
    expect(fila.classList.contains('list-item--detalle')).toBe(true);
    const abrir = fila.querySelector('.list-item__detalle');
    expect(abrir.dataset.action).toBe('fila-detalle');
    expect(abrir.getAttribute('aria-label')).toBe('Ver detalle: Cuidado personal, $42.000');

    const d = datosDeFila(fila);
    expect(d.cuando).toBe('Hoy');
    expect(d.titulo).toBe('Cuidado personal');
    expect(d.monto).toBe('$42.000');
    expect(d.acciones.map(a => a.accion)).toEqual(['repetir-gasto', 'editar-gasto', 'eliminar-gasto']);
  });

  it('con el saldo oculto, el nombre del botón no dice el monto', () => {
    S.config.ocultarSaldo = true;
    document.body.innerHTML = '<div id="panel-filtros-gastos"></div><div id="lista-gastos"></div>';
    renderListaGastos();
    const abrir = document.querySelector('#lista-gastos .list-item__detalle');
    expect(abrir.getAttribute('aria-label')).not.toContain('42.000');
    S.config.ocultarSaldo = false;
  });

  it('una fila de Movimientos con acciones también la trae', () => {
    S.ingresosPuntuales = [];
    S.ahorro = { fondoEmergencia: { activo: false, metaMeses: 3, montoActual: 0 }, aportes: [], compromisoMensual: 0 };
    S.transferencias = [];
    S.personales = [];
    document.body.innerHTML = '<div id="lista-movimientos"></div>';
    renderMovimientosCompletos();
    const fila = document.querySelector('#lista-movimientos .list-item');
    expect(fila.querySelector('.list-item__detalle')).not.toBeNull();
    expect(datosDeFila(fila).acciones.map(a => a.accion)).toEqual(['editar-gasto', 'eliminar-gasto']);
  });
});

describe('Mis cuentas trae la hoja (ADR 109)', () => {
  beforeEach(() => {
    S.config = { ...(S.config ?? {}), ocultarSaldo: false };
    S.cuentas = [
      { id: 'c1', nombre: 'Bancolombia Ahorros', banco: 'Bancolombia', tipo: 'Ahorros', saldo: 3_412_800, activa: true,
        aplica4x1000: true, cuotaManejo: { monto: 15_900, diaCobro: 5 } },
      { id: 'c2', nombre: 'Nequi', banco: 'Nequi', tipo: 'Nequi', saldo: 286_500, activa: true,
        datosTransferencia: { tipoLlave: 'Celular', llave: '3001234567' } },
    ];
    S.compromisos = [];
    S.ingresos = [{ id: 'i1', descripcion: 'Salario', categoria: 'Salario', monto: 4_200_000, frecuencia: 'Mensual', diaPago: 30, activo: true }];
    S.ingresosPuntuales = [{ id: 'ip1', descripcion: 'Prima de servicios', categoria: 'Prima', monto: 1_900_000, fecha: hoy(), cuentaId: 'c1' }];
    document.body.innerHTML = `
      <div id="lista-tesoreria"></div><div id="tesoreria-tarjetas"></div>
      <div id="lista-ingresos"></div><div id="lista-ingresos-puntuales"></div>`;
  });

  it('una cuenta: su nombre, su tipo, su saldo, sus chips como notas y tres acciones', () => {
    renderListaCuentas();
    const fila = document.querySelector('.cuenta-card[data-id="c1"]');
    expect(fila.classList.contains('list-item--detalle')).toBe(true);
    const abrir = fila.querySelector('.list-item__detalle');
    expect(abrir.dataset.action).toBe('fila-detalle');
    expect(abrir.getAttribute('aria-label')).toBe('Ver detalle: Bancolombia, $3.412.800');

    const d = datosDeFila(fila);
    expect([d.titulo, d.subtitulo, d.monto]).toEqual(['Bancolombia', 'Ahorros', '$3.412.800']);
    expect(d.notas).toEqual(['Cuota $15.900 · día 5', '4x1000']);
    expect(d.acciones.map(a => [a.accion, textoAccion(a.etiqueta)])).toEqual([
      ['cuenta-ver-movimientos', 'Ver sus movimientos'],
      ['editar-cuenta', 'Editar cuenta'],
      ['eliminar-cuenta', 'Eliminar cuenta'],
    ]);
    expect(d.acciones.every(a => a.id === 'c1')).toBe(true);
  });

  it('la llave de la cuenta llega a la hoja', () => {
    renderListaCuentas();
    expect(datosDeFila(document.querySelector('.cuenta-card[data-id="c2"]')).notas).toEqual(['Celular 3001234567']);
  });

  it('con el saldo oculto, ni la fila ni la hoja dicen el saldo', () => {
    S.config.ocultarSaldo = true;
    renderListaCuentas();
    const fila = document.querySelector('.cuenta-card[data-id="c1"]');
    expect(fila.querySelector('.list-item__detalle').getAttribute('aria-label')).not.toContain('3.412.800');
    expect(datosDeFila(fila).monto).not.toContain('3.412.800');
    S.config.ocultarSaldo = false;
  });

  it('una tarjeta de crédito: lo usado va como nota y su salida a Por pagar como acción', () => {
    S.compromisos = [{ id: 'tc1', nombre: 'Visa', tipo: 'deuda-entidad', categoria: 'Tarjeta de crédito',
      cupoTotal: 1_000_000, saldoTotal: 320_000, activo: true }];
    renderTarjetasTC();
    const fila = document.querySelector('#tesoreria-tarjetas .cuenta-card');
    expect(fila.querySelector('.list-item__detalle')).not.toBeNull();
    const d = datosDeFila(fila);
    expect(d.monto).toBe('$680.000');
    expect(d.notas).toEqual(['Usado $320.000']);
    expect(d.acciones.map(a => [a.accion, textoAccion(a.etiqueta), a.id])).toEqual([['tc-ver-en-por-pagar', 'Ver en Por pagar', 'tc1']]);
  });

  it('una fuente fija: el día de pago va como nota', () => {
    renderListaIngresos();
    const d = datosDeFila(document.querySelector('#lista-ingresos .list-item'));
    expect([d.titulo, d.monto]).toEqual(['Salario', '$4.200.000']);
    expect(d.notas).toEqual(['día 30 de cada período']);
    expect(d.acciones.map(a => textoAccion(a.etiqueta))).toEqual(['Editar fuente de ingreso', 'Eliminar fuente']);
  });

  it('un ingreso puntual: monto de ingreso, "Ver en Movimientos" y eliminar', () => {
    renderListaIngresosPuntuales();
    const fila = document.querySelector('#lista-ingresos-puntuales .list-item');
    expect(fila.classList.contains('list-item--detalle')).toBe(true);
    const d = datosDeFila(fila);
    expect(d.monto).toBe('+$1.900.000');
    expect(d.montoClase).toBe('detalle-fila__monto--ingreso');
    expect(d.acciones.map(a => [a.accion, textoAccion(a.etiqueta)])).toEqual([
      ['ingresos-ver-historial', 'Ver en Movimientos'],
      ['eliminar-ingreso-puntual', 'Eliminar ingreso'],
    ]);
    // "Ver en Movimientos" solo existe para la hoja: la fila no lo muestra.
    expect(fila.querySelector('[data-action="ingresos-ver-historial"]').classList.contains('list-item__solo-hoja')).toBe(true);
  });
});

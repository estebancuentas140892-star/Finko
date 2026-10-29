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

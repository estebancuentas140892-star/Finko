/**
 * atencion-hoy.test.js - "Atención hoy" de Inicio en móvil (MV2.15a, ADR 099).
 *
 * Cubre:
 * - esDeHoy(): lo que apunta a una fecha futura no es de hoy (D2).
 * - gruposAtencionHoy(): una fila por sección, en el orden del motor, y el
 *   "te llega hoy" que sobra si el ingreso por distribuir es de hoy (D3).
 * - contarAvisosDeHoy(): el número de la lente no cuenta lo de mañana (D3).
 * - contenidoGrupo(): la frase y la acción de cada clase (D1).
 * - htmlAtencionHoy() y htmlHojaAvisosHoy(): tope de tres filas, "Ver los N"
 *   solo si hay más, la línea verde sin avisos, y la hoja con el mismo número.
 */

import { describe, it, expect } from 'vitest';
import {
  esDeHoy,
  gruposAtencionHoy,
  totalAvisosHoy,
  contarAvisosDeHoy,
  contenidoGrupo,
  htmlAtencionHoy,
  htmlHojaAvisosHoy,
  MAX_FILAS_ATENCION,
} from '../../modules/ui/atencion-hoy.js';
import { recolectarAvisos } from '../../modules/infra/avisos.js';
import { f } from '../../modules/infra/utils.js';

const HOY = '2026-08-13';

/** Aviso mínimo con la forma del motor. */
const aviso = (o = {}) => ({
  id: `${o.tipo ?? 'compromiso-vencido'}:${o.idItem ?? 'x'}`,
  tipo: 'compromiso-vencido',
  severidad: 'urgente',
  nombre: 'Arriendo',
  monto: 100_000,
  dias: 3,
  sentido: 'atraso',
  seccion: 'compromisos',
  extra: null,
  ...o,
});

const pago = (nombre, dias, monto, o = {}) => aviso({ nombre, dias, monto, idItem: nombre, ...o });
const deHoy = (nombre, monto) => pago(nombre, 0, monto, { tipo: 'compromiso-proximo', severidad: 'alta', sentido: 'restante' });
const limite = (nombre, porcentaje, o = {}) => aviso({
  tipo: porcentaje > 100 ? 'limite-excedido' : 'limite-alerta',
  severidad: porcentaje > 100 ? 'alta' : 'media',
  nombre, idItem: nombre, monto: 100_000, dias: null, sentido: null, seccion: 'presupuesto',
  extra: { porcentaje, asignado: 120_000, estado: porcentaje > 100 ? 'excedido' : 'alerta' },
  ...o,
});
const reparto = (esHoy, periodoISO = HOY) => aviso({
  tipo: 'ingreso-por-distribuir', severidad: 'media', nombre: '', monto: null,
  dias: esHoy ? 0 : 8, sentido: 'atraso', seccion: 'tesoreria', extra: { periodoISO, esHoy },
});
const diaDePago = () => aviso({ tipo: 'dia-de-pago', severidad: 'media', nombre: 'Salario', monto: 2_000_000, dias: 0, sentido: 'restante', seccion: 'tesoreria' });

// ── D2: HOY ES HOY ───────────────────────────────────────────────

describe('esDeHoy()', () => {
  it('lo vencido, lo de hoy y lo que no tiene fecha son de hoy', () => {
    expect(esDeHoy(pago('Arriendo', 4, 1))).toBe(true);
    expect(esDeHoy(deHoy('Luz', 1))).toBe(true);
    expect(esDeHoy(limite('Café', 120))).toBe(true);
  });

  it('lo que vence mañana o después no es de hoy', () => {
    expect(esDeHoy(aviso({ tipo: 'compromiso-proximo', sentido: 'restante', dias: 1 }))).toBe(false);
    expect(esDeHoy(aviso({ tipo: 'apartado-proximo', sentido: 'restante', dias: 6 }))).toBe(false);
  });
});

// ── D1 y D3: GRUPOS Y NÚMERO ─────────────────────────────────────

describe('gruposAtencionHoy()', () => {
  it('una fila por sección de origen, en el orden en que llega su primer aviso', () => {
    const grupos = gruposAtencionHoy([
      pago('Arriendo', 24, 1_350_000),
      limite('Restaurantes', 112),
      deHoy('Plan Claro', 65_000),
      reparto(false),
    ]);
    expect(grupos.map(g => g.seccion)).toEqual(['compromisos', 'presupuesto', 'tesoreria']);
    expect(grupos[0].avisos).toHaveLength(2);
    expect(grupos[0].severidad).toBe('urgente');
  });

  it('deja fuera lo que no es de hoy', () => {
    const grupos = gruposAtencionHoy([
      pago('Arriendo', 2, 1),
      aviso({ tipo: 'prestamo-proximo', severidad: 'baja', sentido: 'restante', dias: 1, seccion: 'personales' }),
    ]);
    expect(grupos.map(g => g.seccion)).toEqual(['compromisos']);
  });

  it('si el ingreso por distribuir es de hoy, el "te llega hoy" no se cuenta dos veces', () => {
    expect(totalAvisosHoy(gruposAtencionHoy([reparto(true), diaDePago()]))).toBe(1);
    expect(totalAvisosHoy(gruposAtencionHoy([reparto(false, '2026-08-05'), diaDePago()]))).toBe(2);
  });
});

describe('contarAvisosDeHoy()', () => {
  it('cuenta lo que hay detrás de las filas, no lo de mañana', () => {
    const state = {
      compromisos: [{ id: 'c1', descripcion: 'Arriendo', tipo: 'fijo', categoria: 'Vivienda', monto: 1_500_000,
        frecuencia: 'Mensual', diaPago: 5, activo: true, fechaCreacion: '2025-01-01T00:00:00.000Z' }],
      gastos: [], presupuestos: [], apartados: [], cuentas: [], metas: [], inversiones: [],
      personales: [{ id: 'pe1', persona: 'Juan', monto: 300_000, pagado: 0, fecha: '2026-06-01',
        fechaLimite: '2026-08-14', liquidado: false, fechaCreacion: '2026-06-01T00:00:00.000Z' }],
      ingresos: [{ id: 'i1', descripcion: 'Salario', monto: 2_000_000, frecuencia: 'Mensual', categoria: 'Salario',
        diaPago: 5, activo: true, fechaCreacion: '2025-01-01T00:00:00.000Z' }],
      config: {},
    };
    // El motor devuelve tres: el arriendo vencido, el préstamo de mañana y el
    // ingreso por distribuir. Hoy son dos.
    const motor = recolectarAvisos({ ...state, distribucion: { ultimaPeriodo: null }, hoyISO: HOY });
    expect(motor.map(a => a.tipo).sort()).toEqual(['compromiso-vencido', 'ingreso-por-distribuir', 'prestamo-proximo']);
    expect(contarAvisosDeHoy(state, HOY)).toBe(2);
  });
});

// ── D1: LO QUE DICE CADA FILA ────────────────────────────────────

describe('contenidoGrupo()', () => {
  it('pagos: lo vencido y lo de hoy forman un lote que se paga con "Pagar"', () => {
    const avisos = [
      pago('Gimnasio', 27, 89_900), pago('Arriendo', 24, 1_350_000), pago('Crédito', 19, 510_000),
      pago('EPM', 11, 236_000), pago('Visa', 4, 420_000), deHoy('Plan Claro', 65_000),
    ];
    const c = contenidoGrupo({ seccion: 'compromisos', severidad: 'urgente', avisos });
    expect(c.titulo).toBe('6 pagos para hoy');
    expect(c.detalle).toBe(`${f(2_670_900)} · 5 ya vencidos`);
    expect(c.cta).toMatchObject({ texto: 'Pagar', largo: 'Pagar los 6', accion: 'inicio-pagar-lote' });
    expect(c.grupo.cta).toBe(`Pagar los 6 · ${f(2_670_900)}`);
  });

  it('un solo pago dice cuál es', () => {
    const c = contenidoGrupo({ seccion: 'compromisos', severidad: 'alta', avisos: [deHoy('Plan Claro', 65_000)] });
    expect(c.titulo).toBe('Plan Claro vence hoy');
    expect(c.cta.largo).toBe('Pagar Plan Claro');
  });

  it('límites: el primero da la frase y el segundo el detalle', () => {
    const c = contenidoGrupo({ seccion: 'presupuesto', severidad: 'alta', avisos: [limite('Restaurantes', 112), limite('Entretenimiento', 99)] });
    expect(c.titulo).toBe('Restaurantes pasó su límite');
    expect(c.detalle).toBe('Y Entretenimiento va al 99%');
    expect(c.cta).toMatchObject({ texto: 'Ver', href: '#presupuesto', largo: 'Ver los 2 límites' });
  });

  it('ingreso: distribuir manda, con la acción del aviso de Inicio', () => {
    const c = contenidoGrupo({ seccion: 'tesoreria', severidad: 'media', avisos: [reparto(true)] });
    expect(c.titulo).toBe('Hoy recibes tu ingreso');
    expect(c.cta).toMatchObject({ texto: 'Distribuir', accion: 'distribuir-desde-inicio' });
  });
});

// ── HTML: LISTA Y HOJA ───────────────────────────────────────────

describe('htmlAtencionHoy()', () => {
  const div = (html) => { const d = document.createElement('div'); d.innerHTML = html; return d; };

  it(`tope de ${MAX_FILAS_ATENCION} filas; "Ver los N" dice el total`, () => {
    const grupos = gruposAtencionHoy([
      pago('Arriendo', 3, 1), pago('Luz', 2, 1), limite('Café', 120), reparto(false),
      aviso({ tipo: 'respaldo-atrasado', severidad: 'media', nombre: 'Respaldo', seccion: 'respaldo', dias: 40 }),
    ]);
    const d = div(htmlAtencionHoy(grupos));
    expect(d.querySelectorAll('.atencion-hoy__fila')).toHaveLength(MAX_FILAS_ATENCION);
    expect(d.querySelector('[data-action="atencion-hoy-ver"]').textContent).toContain('Ver los 5');
  });

  it('sin más de lo que se ve, no hay "Ver los N"', () => {
    const d = div(htmlAtencionHoy(gruposAtencionHoy([pago('Arriendo', 3, 1), limite('Café', 120)])));
    expect(d.querySelector('[data-action="atencion-hoy-ver"]')).toBeNull();
  });

  it('la severidad se oye en cada fila, no solo se ve en el color', () => {
    const d = div(htmlAtencionHoy(gruposAtencionHoy([pago('Arriendo', 3, 1)])));
    expect(d.querySelector('.atencion-hoy__frase .sr-only').textContent).toBe('Urgente: ');
  });

  it('sin avisos, una línea verde dice qué se revisó', () => {
    const d = div(htmlAtencionHoy([]));
    expect(d.textContent).toContain('Nada que atender hoy');
    expect(d.querySelector('.atencion-hoy__lista')).toBeNull();
  });
});

describe('htmlHojaAvisosHoy()', () => {
  const div = (html) => { const d = document.createElement('div'); d.innerHTML = html; return d; };

  it('el título dice el mismo número que "Ver los N"', () => {
    const grupos = gruposAtencionHoy([pago('Arriendo', 3, 1), deHoy('Luz', 1), limite('Café', 120)]);
    const d = div(htmlHojaAvisosHoy(grupos));
    expect(d.querySelector('#avisos-hoy-titulo').textContent).toBe('Avisos de hoy · 3');
    expect(d.querySelectorAll('.avisos-hoy__item')).toHaveLength(3);
  });

  it('cada grupo dice su severidad en texto', () => {
    const d = div(htmlHojaAvisosHoy(gruposAtencionHoy([pago('Arriendo', 3, 1), limite('Café', 120)])));
    expect([...d.querySelectorAll('.avisos-hoy__sev')].map(s => s.textContent)).toEqual(['Urgente', 'Importante']);
  });

  it('las acciones cierran la hoja antes: el lote por registrar-abrir, la navegación por ir-a-seccion', () => {
    const d = div(htmlHojaAvisosHoy(gruposAtencionHoy([pago('Arriendo', 3, 1), limite('Café', 120)])));
    const [pagar, ver] = d.querySelectorAll('.avisos-hoy__cta');
    expect(pagar.dataset.action).toBe('registrar-abrir');
    expect(pagar.dataset.targetAction).toBe('inicio-pagar-lote');
    expect(ver.dataset.action).toBe('ir-a-seccion');
    expect(ver.getAttribute('href')).toBe('#presupuesto');
  });

  it('los nombres del usuario se escapan', () => {
    const d = div(htmlHojaAvisosHoy(gruposAtencionHoy([pago('<b>x</b>', 3, 1)])));
    expect(d.querySelector('.avisos-hoy__item-t').textContent).toBe('<b>x</b>');
  });
});

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
 * - INI.1 (ADR 149 D2): las novedades (límites, reserva lista, meta
 *   alcanzada, respaldo, suscripciones) salen de "Atención hoy" y van a
 *   "Novedades" (gruposNovedades, htmlNovedades).
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
  esNovedad,
  gruposNovedades,
  htmlNovedades,
  ordenarGruposAtencion,
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
// Me deben con la fecha pactada vencida: de hoy, severidad media, va a Me deben.
const prestamo = (nombre, dias) => aviso({
  tipo: 'prestamo-vencido', severidad: 'media', nombre, idItem: nombre, monto: 50_000,
  dias, sentido: 'atraso', seccion: 'personales',
});
// Débito automático sin saldo (HF.2b): de hoy, severidad alta, fila propia.
const debito = (nombre, dias) => aviso({
  tipo: 'debito-sin-saldo', severidad: 'alta', nombre, idItem: nombre, monto: 45_000, dias,
  sentido: 'restante', seccion: 'compromisos',
  extra: { cuentaId: 'nequi', cuentaNombre: 'Nequi', falta: 25_000, fecha: '2026-08-15' },
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
      prestamo('Ana', 5),
      deHoy('Plan Claro', 65_000),
      reparto(false),
    ]);
    expect(grupos.map(g => g.seccion)).toEqual(['compromisos', 'personales', 'tesoreria']);
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
    // INI.2b (ADR 152 D3): lo vencido junto con lo de hoy es "N pagos para
    // hoy" y debajo cuántos ya vencieron, en su color, como el tablero.
    expect(c.titulo).toBe('6 pagos para hoy');
    // ADR 126 D3: el estado del lote va aparte del monto, con su color.
    expect(c.detalle).toBe(f(2_670_900));
    expect(c.detalleMonto).toBe(true);
    expect(c.estado).toEqual({ texto: '5 ya vencidos', tono: 'danger' });
    // AH.1e (ADR 150 D7): el bloque se llama como en el tablero.
    expect(c.grupo.titulo).toBe('Pagos para hoy');
    expect(c.cta).toMatchObject({ texto: 'Pagar', largo: 'Pagar los 6 pagos para hoy', accion: 'inicio-pagar-lote', mueve: true, corto: true });
    expect(c.grupo.cta).toBe(`Pagar los 6 · ${f(2_670_900)}`);
  });

  // OB.1: el defecto que abrió la tarea. Dos pagos vencidos decían "2 pagos
  // para hoy" y debajo "2 ya vencidos".
  it('dos pagos vencidos son "2 pagos vencidos", sin desglose que lo repita', () => {
    const c = contenidoGrupo({ seccion: 'compromisos', severidad: 'urgente', avisos: [pago('Arriendo', 3, 1), pago('Luz', 2, 1)] });
    expect(c.titulo).toBe('2 pagos vencidos');
    expect(c.estado).toBeNull();
    expect(c.grupo.titulo).toBe('Pagos vencidos');
  });

  it('dos pagos de hoy son "2 pagos vencen hoy"', () => {
    const c = contenidoGrupo({ seccion: 'compromisos', severidad: 'alta', avisos: [deHoy('Plan Claro', 1), deHoy('Netflix', 1)] });
    expect(c.titulo).toBe('2 pagos vencen hoy');
    expect(c.estado).toBeNull();
    expect(c.grupo.titulo).toBe('Pagos para hoy');
  });

  it('cada pago de la hoja dice su estado, su tono y su clave de estado', () => {
    const c = contenidoGrupo({ seccion: 'compromisos', severidad: 'urgente', avisos: [pago('Arriendo', 1, 1), deHoy('Netflix', 1)] });
    expect(c.item(pago('Arriendo', 1, 1))).toMatchObject({ s: 'Venció ayer', tono: 'danger', estado: 'vencido' });
    expect(c.item(pago('Luz', 4, 1))).toMatchObject({ s: 'Venció hace 4 días', tono: 'danger', estado: 'vencido' });
    expect(c.item(deHoy('Netflix', 1))).toMatchObject({ s: 'Vence hoy', tono: 'warning', estado: 'hoy' });
  });

  it('un solo pago vencido dice cuál y desde cuándo', () => {
    const c = contenidoGrupo({ seccion: 'compromisos', severidad: 'urgente', avisos: [pago('Arriendo', 3, 1)] });
    expect(c.titulo).toBe('Arriendo: venció hace 3 días');
    expect(c.grupo.titulo).toBe('Pago vencido');
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

  // ADR 126 D3: el nombre puede ser largo y el monto nunca se corta, así que
  // el monto baja al detalle.
  it('me deben: la frase es el nombre y el detalle dice cuánto y desde cuándo', () => {
    const debe = aviso({ tipo: 'personal-vencido', severidad: 'media', nombre: 'Juan Sebastián', monto: 1_100_000, dias: 12, sentido: 'atraso', seccion: 'personales' });
    const c = contenidoGrupo({ seccion: 'personales', severidad: 'media', avisos: [debe] });
    expect(c.titulo).toBe('Juan Sebastián');
    expect(c.detalle).toBe(`Te debe ${f(1_100_000)} · fecha acordada hace 12 días`);
  });

  it('respaldo: el botón dice a qué lleva', () => {
    const c = contenidoGrupo({ seccion: 'respaldo', severidad: 'media', avisos: [aviso({ tipo: 'respaldo-atrasado', seccion: 'respaldo', dias: 40 })] });
    expect(c.grupo.cta).toBe('Ir a respaldar tus datos');
  });

  it('ingreso: distribuir manda, con la acción del aviso de Inicio', () => {
    const c = contenidoGrupo({ seccion: 'tesoreria', severidad: 'media', avisos: [reparto(true)] });
    expect(c.titulo).toBe('Hoy recibes tu ingreso');
    expect(c.cta).toMatchObject({ texto: 'Distribuir', accion: 'distribuir-desde-inicio' });
  });
});

describe('contenidoGrupo() con el ojo puesto (ADR 116 D2)', () => {
  it('los montos de la fila y de la hoja salen enmascarados; los conteos no', async () => {
    const { S } = await import('../../modules/core/state.js');
    const antes = S.config;
    S.config = { ...(antes ?? {}), ocultarSaldo: true };
    const c = contenidoGrupo({ seccion: 'compromisos', severidad: 'alta', avisos: [pago('Gimnasio', 27, 89_900), deHoy('Plan Claro', 65_000)] });
    const fila = c.item(deHoy('Plan Claro', 65_000));
    S.config = antes;
    expect(c.detalle).not.toContain('154.900');
    expect(c.estado.texto).toBe('1 ya vencido');
    expect(c.grupo.cta).not.toContain('154.900');
    expect(fila.v).not.toContain('65.000');
  });
});

// ── HTML: LISTA Y HOJA ───────────────────────────────────────────

describe('htmlAtencionHoy()', () => {
  const div = (html) => { const d = document.createElement('div'); d.innerHTML = html; return d; };

  it(`tope de ${MAX_FILAS_ATENCION} filas; "Ver los N" dice el total`, () => {
    const grupos = gruposAtencionHoy([
      pago('Arriendo', 3, 1), pago('Luz', 2, 1), prestamo('Ana', 5), reparto(false), debito('Netflix', 2),
    ]);
    const d = div(htmlAtencionHoy(grupos));
    expect(d.querySelectorAll('.atencion-hoy__fila')).toHaveLength(MAX_FILAS_ATENCION);
    expect(d.querySelector('[data-action="atencion-hoy-ver"]').textContent).toContain('Ver los 5');
  });

  it('sin más de lo que se ve, no hay "Ver los N"', () => {
    const d = div(htmlAtencionHoy(gruposAtencionHoy([pago('Arriendo', 3, 1), prestamo('Ana', 5)])));
    expect(d.querySelector('[data-action="atencion-hoy-ver"]')).toBeNull();
  });

  // ADR 126 D3: el primer aviso va destacado y dice su urgencia a la vista;
  // los demás la dicen al lector junto a su frase.
  it('la severidad se lee en el destacado y se oye en las demás filas', () => {
    const d = div(htmlAtencionHoy(gruposAtencionHoy([prestamo('Ana', 5), debito('Netflix', 2)])));
    const [destacada, fila] = d.querySelectorAll('.atencion-hoy__fila');
    expect(destacada.classList.contains('atencion-hoy__fila--destacada')).toBe(true);
    expect(destacada.querySelector('.atencion-hoy__sev').textContent).toBe('Para revisar');
    expect(fila.querySelector('.atencion-hoy__frase .sr-only').textContent).toBe('Importante: ');
  });

  // INI.2b (ADR 152 D3): el botón dice "Pagar" y su nombre lo completa.
  it('el botón de los pagos tiene el peso de lo que hace: pagar viste su sección', () => {
    const d = div(htmlAtencionHoy(gruposAtencionHoy([pago('Arriendo', 3, 1), pago('Luz', 2, 1)])));
    const boton = d.querySelector('.atencion-hoy__fila--destacada .atencion-hoy__accion');
    expect(boton.classList.contains('btn-dominio')).toBe(true);
    expect(boton.dataset.dom).toBe('compromisos');
    expect(boton.dataset.action).toBe('inicio-pagar-lote');
    expect(boton.textContent).toBe('Pagar');
    expect(boton.getAttribute('aria-label')).toBe('Pagar los 2 pagos vencidos');
    // OB.1: dos pagos vencidos no se dicen "para hoy".
    expect(d.querySelector('.atencion-hoy__fila--destacada .atencion-hoy__frase').textContent).toBe('2 pagos vencidos');
  });

  it('los pagos se resumen: "3 pagos para hoy", el total y "1 ya vencido" (ADR 152 D3)', () => {
    const d = div(htmlAtencionHoy(gruposAtencionHoy([
      pago('Arriendo', 1, 1_350_000), deHoy('Plan Claro', 65_000), deHoy('Netflix', 38_900),
    ])));
    const destacada = d.querySelector('.atencion-hoy__fila--destacada');
    expect(destacada.querySelector('.atencion-hoy__sev').textContent).not.toBe('');
    expect(destacada.querySelector('.atencion-hoy__frase').textContent).toBe('3 pagos para hoy');
    expect(destacada.querySelector('.atencion-hoy__monto').textContent).toBe(f(1_453_900));
    expect(destacada.querySelector('.atencion-hoy__estado--danger').textContent).toBe('1 ya vencido');
    expect(destacada.querySelector('.atencion-hoy__accion').getAttribute('aria-label')).toBe('Pagar los 3 pagos para hoy');
    // La lista de cada pago vive en la hoja del lote, no aquí.
    expect(d.querySelector('.chip-estado')).toBeNull();
  });

  it('"Ver los N" solo cuando hay filas que no caben (ADR 152 D9)', () => {
    const d = div(htmlAtencionHoy(gruposAtencionHoy([
      pago('Arriendo', 1, 1), deHoy('Plan Claro', 1), deHoy('Netflix', 1), reparto(false),
    ])));
    expect(d.querySelectorAll('.atencion-hoy__fila')).toHaveLength(2);
    expect(d.querySelector('[data-action="atencion-hoy-ver"]')).toBeNull();
  });

  it('ir a otro lugar es neutro, y la fila que no es la primera se toca entera', () => {
    const d = div(htmlAtencionHoy(gruposAtencionHoy([prestamo('Ana', 5), debito('Netflix', 2)])));
    const destacado = d.querySelector('.atencion-hoy__fila--destacada .atencion-hoy__accion');
    expect(destacado.classList.contains('btn-secondary')).toBe(true);
    expect(destacado.getAttribute('href')).toBe('#personales');
    const fila = d.querySelectorAll('.atencion-hoy__fila')[1].querySelector('.atencion-hoy__control');
    expect(fila.getAttribute('href')).toBe('#tesoreria');
    expect(fila.getAttribute('aria-label')).toBe('Ver tus cuentas');
    expect(d.querySelector(`#${fila.getAttribute('aria-describedby')}`)).not.toBeNull();
  });

  it('la teja dice la sección con su color, no la urgencia', () => {
    const d = div(htmlAtencionHoy(gruposAtencionHoy([prestamo('Ana', 5), reparto(false)])));
    // ADR 150 D7: tu ingreso va antes que lo demás.
    expect([...d.querySelectorAll('.atencion-hoy__icono')].map(t => t.dataset.dom)).toEqual(['tesoreria', 'personales']);
  });

  it('el orden es pagos, tu ingreso y lo demás, como el tablero (ADR 150 D7)', () => {
    const grupos = gruposAtencionHoy([debito('Netflix', 2), prestamo('Ana', 5), reparto(false), pago('Arriendo', 3, 1)]);
    expect(ordenarGruposAtencion(grupos).map(g => g.seccion)).toEqual(['compromisos', 'tesoreria', 'debitos', 'personales']);
    const filas = div(htmlAtencionHoy(grupos)).querySelectorAll('.atencion-hoy__fila');
    expect(filas[0].classList.contains('atencion-hoy__fila--destacada')).toBe(true);
    expect(filas[0].textContent).toContain('Arriendo');
    expect(filas[1].textContent).toContain('Recibiste tu ingreso');
    // La hoja sigue el mismo orden.
    const hoja = div(htmlHojaAvisosHoy(grupos));
    expect([...hoja.querySelectorAll('.avisos-hoy__grupo-titulo')].map(h => h.textContent).slice(0, 2))
      .toEqual([contenidoGrupo(grupos[3]).grupo.titulo, 'Tu ingreso']);
  });

  it('sin pagos, el ingreso es el destacado', () => {
    const d = div(htmlAtencionHoy(gruposAtencionHoy([prestamo('Ana', 5), reparto(false)])));
    const destacada = d.querySelector('.atencion-hoy__fila--destacada');
    expect(destacada.textContent).toContain('Recibiste tu ingreso');
  });

  it('la frase del ingreso: "del 30 de oct", con el mes en tres letras (ADR 152 D9)', () => {
    const anio = new Date().getFullYear();
    const c = contenidoGrupo({ seccion: 'tesoreria', severidad: 'media', avisos: [reparto(false, `${anio}-10-30`)] });
    expect(c.titulo).toBe('Recibiste tu ingreso del 30 de oct');
    const viejo = contenidoGrupo({ seccion: 'tesoreria', severidad: 'media', avisos: [reparto(false, '2020-08-01')] });
    expect(viejo.titulo).toBe('Recibiste tu ingreso del 1 de ago de 2020');
  });

  it('el débito sin saldo de una sola cuenta lleva el logo de esa cuenta', async () => {
    const { S } = await import('../../modules/core/state.js');
    const antes = S.cuentas;
    S.cuentas = [{ id: 'nequi', nombre: 'Nequi', banco: 'Nequi', saldo: 20_000, activa: true }];
    const d = div(htmlAtencionHoy(gruposAtencionHoy([prestamo('Ana', 5), debito('Netflix', 2)])));
    S.cuentas = antes;
    const teja = d.querySelectorAll('.atencion-hoy__fila')[1].querySelector('.atencion-hoy__icono');
    expect(teja.querySelector('.bank-avatar use').getAttribute('href')).toBe('#b-nequi');
  });

  it('sin avisos, Tino tranquilo y una línea dicen qué se revisó (ADR 129)', () => {
    const d = div(htmlAtencionHoy([]));
    expect(d.textContent).toContain('Nada que atender hoy');
    expect(d.querySelector('.atencion-hoy__lista')).toBeNull();
    expect(d.querySelector('.atencion-hoy__tino[data-pose="tranquilo"]')).not.toBeNull();
  });

  it('con avisos, Tino no aparece: la lista es lo que importa', () => {
    const d = div(htmlAtencionHoy(gruposAtencionHoy([pago('Arriendo', 3, 1)])));
    expect(d.querySelector('.tino-sol')).toBeNull();
  });
});

describe('htmlHojaAvisosHoy()', () => {
  const div = (html) => { const d = document.createElement('div'); d.innerHTML = html; return d; };

  it('el título dice el mismo número que "Ver los N"', () => {
    const grupos = gruposAtencionHoy([pago('Arriendo', 3, 1), deHoy('Luz', 1), prestamo('Ana', 5)]);
    const d = div(htmlHojaAvisosHoy(grupos));
    // El número va en pastilla; el lector sigue oyendo "Avisos de hoy · 3".
    expect(d.querySelector('#avisos-hoy-titulo').textContent).toBe('Avisos de hoy · 3');
    expect(d.querySelector('.avisos-hoy__cuenta').textContent).toBe(' · 3');
    expect(d.querySelectorAll('.avisos-hoy__item')).toHaveLength(3);
  });

  it('cada grupo dice su severidad en texto', () => {
    const d = div(htmlHojaAvisosHoy(gruposAtencionHoy([pago('Arriendo', 3, 1), debito('Netflix', 2)])));
    expect([...d.querySelectorAll('.avisos-hoy__sev')].map(s => s.textContent)).toEqual(['Urgente', 'Importante']);
  });

  it('las acciones cierran la hoja antes: el lote por registrar-abrir, la navegación por ir-a-seccion', () => {
    const d = div(htmlHojaAvisosHoy(gruposAtencionHoy([pago('Arriendo', 3, 1), prestamo('Ana', 5)])));
    const [pagar, ver] = d.querySelectorAll('.avisos-hoy__cta');
    expect(pagar.dataset.action).toBe('registrar-abrir');
    expect(pagar.dataset.targetAction).toBe('inicio-pagar-lote');
    expect(pagar.classList.contains('btn-dominio')).toBe(true);
    expect(ver.classList.contains('btn-secondary')).toBe(true);
    expect(ver.dataset.action).toBe('ir-a-seccion');
    expect(ver.getAttribute('href')).toBe('#personales');
  });

  it('los nombres del usuario se escapan', () => {
    const d = div(htmlHojaAvisosHoy(gruposAtencionHoy([pago('<b>x</b>', 3, 1)])));
    expect(d.querySelector('.avisos-hoy__item-t').textContent).toBe('<b>x</b>');
  });

  it('cada pago lleva su logo y su estado en pastilla, lo vencido primero (ADR 150)', () => {
    const d = div(htmlHojaAvisosHoy(gruposAtencionHoy([deHoy('Disney+', 1), pago('Netflix', 2, 1)])));
    const items = [...d.querySelectorAll('.avisos-hoy__item')];
    expect(items.map(i => i.querySelector('.avisos-hoy__item-t').textContent)).toEqual(['Netflix', 'Disney+']);
    expect(items.map(i => i.querySelector('.chip-estado').className)).toEqual([
      'chip-estado chip-estado--vencido', 'chip-estado chip-estado--hoy',
    ]);
    expect(items[0].querySelector('.avisos-hoy__logo .bank-avatar')).not.toBeNull();
  });
});

// ── ADR 122 D6: el conflicto de la nube en Atención hoy ───────────

describe('contenidoGrupo() - la nube', () => {
  it('dice qué falta decidir y lleva a decidirlo', () => {
    const avisos = recolectarAvisos({ nubePorDecidir: true, hoyISO: '2026-11-04' });
    const c = contenidoGrupo({ seccion: 'nube', severidad: 'media', avisos });
    expect(c.titulo).toBe('Falta decidir qué hacer con tus datos');
    expect(c.cta).toMatchObject({ texto: 'Decidir', href: '#config' });
  });
});

// ── HF.2b: el débito automático sin saldo ────────────────────────

describe('Atención hoy - débito automático sin saldo (HF.2b)', () => {
  const sinSaldo = (nombre, dias, o = {}) => aviso({
    tipo: 'debito-sin-saldo', severidad: 'alta', nombre, idItem: nombre, monto: 45_000, dias,
    sentido: 'restante', seccion: 'compromisos',
    extra: { cuentaId: 'nequi', cuentaNombre: 'Nequi', falta: 25_000, fecha: '2026-08-16' },
    ...o,
  });

  it('es de hoy aunque el débito sea en tres días: el dinero falta ahora', () => {
    expect(esDeHoy(sinSaldo('Netflix', 3))).toBe(true);
  });

  it('va en su propia fila, no en el lote de pagos', () => {
    const grupos = gruposAtencionHoy([pago('Arriendo', 2, 100_000), sinSaldo('Netflix', 3)]);
    expect(grupos.map(g => g.seccion)).toEqual(['compromisos', 'debitos']);
    expect(grupos[0].avisos.map(a => a.nombre)).toEqual(['Arriendo']);
  });

  it('dice qué cuenta no alcanza, cuándo y cuánto falta; la acción es ver las cuentas', () => {
    const c = contenidoGrupo({ seccion: 'debitos', severidad: 'alta', avisos: [sinSaldo('Netflix', 3)] });
    expect(c.titulo).toBe('Nequi no alcanza para Netflix');
    expect(c.detalle).toBe(`Se debita en 3 días · faltan ${f(25_000)}`);
    expect(c.cta.href).toBe('#tesoreria');
    expect(c.cta.mueve).toBeFalsy();
  });

  it('con varios, cuenta cuántos y nombra el primero', () => {
    const c = contenidoGrupo({ seccion: 'debitos', severidad: 'alta', avisos: [sinSaldo('Netflix', 1), sinSaldo('Spotify', 2)] });
    expect(c.titulo).toBe('2 débitos automáticos no alcanzan');
    expect(c.detalle).toBe('El primero, Netflix, mañana');
    expect(c.item(sinSaldo('Spotify', 0)).s).toBe(`Nequi · se debita hoy · faltan ${f(25_000)}`);
  });
});

// ── SUS.1c (ADR 146 D6): varias suscripciones ───────────────────

describe('Atención hoy: varias suscripciones (SUS.1c)', () => {
  const sus = aviso({
    tipo: 'suscripciones-varias', severidad: 'baja', nombre: 'Tus suscripciones', monto: 173_800,
    dias: null, sentido: null, seccion: 'compromisos', idItem: 'suscripciones',
    extra: { cuantas: 3, anual: 173_800 * 12, nombres: ['Netflix', 'Disney+', 'Claude'], mesISO: '2026-08' },
  });

  // INI.1 (ADR 149 D2): no pide nada hoy, así que es novedad.
  it('va a Novedades en su propia fila, no al lote de pagos de Atención hoy', () => {
    expect(gruposAtencionHoy([pago('Arriendo', 3, 1_000_000), sus]).map(g => g.seccion)).toEqual(['compromisos']);
    expect(gruposNovedades([pago('Arriendo', 3, 1_000_000), sus]).map(g => g.seccion)).toEqual(['suscripciones']);
  });

  it('pregunta, no acusa, y "Revisarlas" es su acción', () => {
    const c = contenidoGrupo({ seccion: 'suscripciones', severidad: 'baja', avisos: [sus] });
    expect(c.titulo).toBe('Pagas 3 suscripciones');
    expect(c.detalle).toBe(`${f(173_800)} al mes, ${f(173_800 * 12)} al año. ¿Las usas todas?`);
    expect(c.cta).toMatchObject({ accion: 'suscripciones-revisar', texto: 'Revisar' });
    expect(c.grupo.cta).toBe('Revisarlas');
    expect(c.item(sus).s).toBe('Netflix, Disney+, Claude');
  });
});

// ── INI.1 (ADR 149 D2 y D4): Novedades ───────────────────────────

describe('Novedades (INI.1, ADR 149 D2)', () => {
  const div = (html) => { const d = document.createElement('div'); d.innerHTML = html; return d; };
  const listo = aviso({ tipo: 'apartado-listo', severidad: 'baja', nombre: 'Viaje', idItem: 'ap1', monto: 900_000, dias: null, sentido: null, seccion: 'apartados' });
  const respaldo = aviso({ tipo: 'respaldo-atrasado', severidad: 'media', nombre: 'Respaldo de tus datos', idItem: 'respaldo', dias: 40, seccion: 'respaldo' });
  const meta = (nombre, dias) => aviso({ tipo: 'meta-alcanzada', severidad: 'baja', nombre, idItem: nombre, monto: 2_000_000, dias, sentido: 'atraso', seccion: 'metas' });

  it('son novedad los límites, la reserva lista, la meta alcanzada, el respaldo y las suscripciones', () => {
    for (const a of [limite('Café', 120), limite('Mercado', 80), listo, respaldo, meta('Moto', 2)]) {
      expect(esNovedad(a)).toBe(true);
    }
    for (const a of [pago('Arriendo', 3, 1), deHoy('Luz', 1), prestamo('Ana', 5), debito('Netflix', 2), reparto(true)]) {
      expect(esNovedad(a)).toBe(false);
    }
  });

  it('Atención hoy se queda con lo de hoy y Novedades con lo demás, sin repetir nada', () => {
    const avisos = [pago('Arriendo', 3, 1), limite('Café', 120), listo, reparto(false), meta('Moto', 2), respaldo];
    const hoy = gruposAtencionHoy(avisos);
    const nov = gruposNovedades(avisos);
    expect(hoy.map(g => g.seccion)).toEqual(['compromisos', 'tesoreria']);
    expect(nov.map(g => g.seccion)).toEqual(['presupuesto', 'apartados', 'metas', 'respaldo']);
    expect(totalAvisosHoy(hoy) + totalAvisosHoy(nov)).toBe(avisos.length);
  });

  it('la reserva que vence hoy sigue en Atención hoy; la que ya reunió el dinero es novedad', () => {
    const proxima = aviso({ tipo: 'apartado-proximo', severidad: 'media', nombre: 'Prima', idItem: 'ap2', monto: 0, dias: 0, sentido: 'restante', seccion: 'apartados' });
    expect(gruposAtencionHoy([proxima, listo]).map(g => g.avisos.map(a => a.nombre))).toEqual([['Prima']]);
    expect(gruposNovedades([proxima, listo]).map(g => g.avisos.map(a => a.nombre))).toEqual([['Viaje']]);
  });

  it('todas las clases van como filas que se tocan enteras, sin destacado ni "Ver los N"', () => {
    const d = div(htmlNovedades(gruposNovedades([limite('Café', 120), listo, respaldo, meta('Moto', 2)])));
    expect(d.querySelector('#novedades-titulo').textContent).toBe('Novedades');
    expect(d.querySelectorAll('.atencion-hoy__fila')).toHaveLength(4);
    expect(d.querySelector('.atencion-hoy__fila--destacada')).toBeNull();
    expect(d.querySelector('[data-action="atencion-hoy-ver"]')).toBeNull();
    // Los ids de las frases no chocan con los de Atención hoy.
    const ids = [...d.querySelectorAll('.atencion-hoy__control')].map(c => c.getAttribute('aria-describedby'));
    expect(ids.every(id => id.startsWith('novedades-frase-'))).toBe(true);
    expect([...d.querySelectorAll('.atencion-hoy__control')].map(c => c.getAttribute('href')))
      .toEqual(['#presupuesto', '#apartados', '#config', '#metas']);
  });

  it('la meta alcanzada dice cuál, cuánto reuniste y cuándo; lleva a Metas', () => {
    const c = contenidoGrupo({ seccion: 'metas', severidad: 'baja', avisos: [meta('Moto', 2)] });
    expect(c.titulo).toBe('Alcanzaste tu meta Moto');
    expect(c.detalle).toBe(`Reuniste ${f(2_000_000)} · hace 2 días`);
    expect(c.cta).toMatchObject({ texto: 'Ver', href: '#metas' });
    expect(contenidoGrupo({ seccion: 'metas', severidad: 'baja', avisos: [meta('Moto', 0)] }).detalle).toBe(`Reuniste ${f(2_000_000)} · hoy`);
  });

  it('con varias metas, cuenta cuántas y nombra la última', () => {
    const c = contenidoGrupo({ seccion: 'metas', severidad: 'baja', avisos: [meta('Moto', 1), meta('Viaje', 5)] });
    expect(c.titulo).toBe('Alcanzaste 2 metas');
    expect(c.detalle).toBe('La última, Moto, hace 1 día');
  });

  it('la teja de la meta es de Metas', () => {
    const d = div(htmlNovedades(gruposNovedades([meta('Moto', 2)])));
    expect(d.querySelector('.atencion-hoy__icono').dataset.dom).toBe('metas');
  });
});

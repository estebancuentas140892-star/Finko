/**
 * atencion-hoy.js - "Atención hoy" de Inicio en móvil: una lista que cuadra
 * (MV2.15a, [ADR 099](../../docs/DECISIONS/099-inicio-movil-hoy-en-una-lista.md) D1 a D3).
 *
 * Bajo 1024px los cuatro paneles de aviso de Inicio (ingreso por distribuir,
 * límites, avisos del motor y Pendientes del mes) medían 1.275px con uso
 * normal. Acá se reemplazan por una lista: una fila por clase de aviso, cada
 * una con su acción directa, tope de tres filas, y una hoja con todos.
 *
 * - La clase de una fila es la sección de origen del aviso (`seccion` del
 *   motor), la misma granularidad del interruptor de Ajustes (CFG.3c).
 * - El orden es el del motor (ADR 066 D4): una fila toma el lugar de su aviso
 *   más importante. Esta superficie no reordena.
 * - "Hoy es hoy" (D2): lo que apunta a una fecha futura no entra; vive en la
 *   lista de la semana.
 * - Un solo número (D3): la lente "Hoy", "Ver los N" y el título de la hoja
 *   cuentan lo mismo, `contarAvisosDeHoy()`.
 *
 * No hay acción nueva de dominio: "Pagar" es el lote de Pendientes del mes
 * (`inicio-pagar-lote`), "Distribuir" es el del aviso de Inicio
 * (`distribuir-desde-inicio`) y "Ver" navega. Desde la hoja viajan por
 * `registrar-abrir` e `ir-a-seccion`, que cierran la hoja antes.
 *
 * ADR 126 D3: el primer aviso va destacado, con su urgencia escrita y su
 * botón a todo el ancho; los demás son filas que se tocan enteras. La teja
 * dice la sección (su color de dominio) y la urgencia se lee. El botón que
 * mueve dinero viste su sección (`.btn-dominio`); el que lleva a otro lugar
 * es neutro.
 *
 * Los paneles de escritorio siguen en el DOM; responsive.css decide cuál se ve.
 *
 * INI.1 ([ADR 149](../../docs/DECISIONS/149-inicio-centro-de-atencion-rapida.md)
 * D2): lo que no es para hoy sino para saber (un límite pasado, una reserva o
 * una meta que se completó, el respaldo, las suscripciones) sale de esta lista
 * y va a "Novedades", que este mismo módulo pinta en los dos anchos con las
 * mismas filas. Así "Atención hoy" queda con lo que pide hacer algo ya.
 *
 * AH.1 ([ADR 150](../../docs/DECISIONS/150-estados-de-pago-y-logos-en-inicio.md)):
 * el débito sin saldo lleva el logo de la cuenta que no alcanza; lo que no es
 * un pago conserva la teja de su sección. La hoja "Avisos de hoy" lista cada
 * pago con su logo y su estado en pastilla.
 *
 * INI.2b ([ADR 152](../../docs/DECISIONS/152-inicio-rediseno-saldo-al-centro-y-pago-en-hojas.md)
 * D3): los pagos vuelven a ser un aviso destacado que se lee de un vistazo
 * ("3 pagos para hoy", el total y "1 ya vencido") con un botón "Pagar"; la
 * lista con logos vive en la hoja del lote, que ese botón abre.
 *
 * INI.7b ([ADR 184](../../docs/DECISIONS/184-inicio-dos-fichas-en-la-banda-y-atencion-hoy-en-filas.md)
 * D2): cada compromiso es una fila de cuatro piezas (logo, nombre, estado con
 * ícono y palabra en su color, valor) que abre su pago; hasta tres y "N pagos
 * más"; "Pagar los N" al pie. Lo que no es un pago va aparte, con las mismas
 * filas, en "También necesita tu atención". El destacado de antes queda solo
 * en "Novedades" y "Por completar", que usan `_htmlFila`.
 */

import { S, EventBus } from '../core/state.js';
import { save } from '../core/storage.js';
import { f, esc, hoy, fechaLegible } from '../infra/utils.js';
import { icon } from '../infra/icons.js';
import { bancoAvatar } from '../infra/bancos.js';
import { tejaDePago, chipEstadoPago, diaDelProximo } from '../infra/fila-pago.js';
import { avisosDeHoy } from '../infra/avisos.js';
import { compromisosProximos } from '../dominio/compromisos/logic.js';
import {
  textoEstadoObligacion, diasRestantesDeAviso, resumenObligaciones,
  fraseObligaciones, detalleObligaciones, tituloObligaciones,
} from '../infra/estado-obligacion.js';
import { registrarRender, programarRender, SALDO_MASCARA_CUENTA } from '../infra/render.js';
import { registrarAccion } from './actions.js';
import { abrirModal } from './modales.js';
import { montosOcultos } from '../infra/privacidad.js';

/**
 * Los montos de la lista y de su hoja obedecen al ojo de la pantalla (ADR 106
 * D3). El ADR 099 los dejó sin máscara hasta que el ojo subiera al
 * encabezado; el ADR 116 D2 cierra ese pendiente.
 * @param {number} n
 */
const _m = (n) => (montosOcultos('dash') ? SALDO_MASCARA_CUENTA : f(n));

/** Filas a la vista antes de mandar el resto a la hoja (D1). */
export const MAX_FILAS_ATENCION = 3;

/** La severidad dicha con palabras: la hoja la muestra, el lector la oye. */
const _SEVERIDAD_TEXTO = {
  urgente: 'Urgente',
  alta:    'Importante',
  media:   'Para revisar',
  baja:    'Para tu información',
};

/** Tono del rótulo de severidad. La teja ya no lo usa: dice la sección. */
const _TONO = { urgente: 'danger', alta: 'warning', media: 'info', baja: 'neutro' };

/**
 * El dominio de cada sección de aviso, para la teja y para el botón que mueve
 * dinero (ADR 126 D3). Respaldo y nube son de la app entera: tono de Análisis.
 */
const _DOM_POR_SECCION = {
  compromisos: 'compromisos',
  presupuesto: 'presupuesto',
  tesoreria:   'tesoreria',
  apartados:   'ahorro',
  personales:  'personales',
  respaldo:    'analisis',
  nube:        'analisis',
  // HF.2b: lo que se hace con un débito sin saldo es mover dinero entre cuentas.
  debitos:     'tesoreria',
  // SUS.1c: las suscripciones son fijos de Por pagar.
  suscripciones: 'compromisos',
  // INI.1: la meta alcanzada (ADR 149 D4).
  metas:       'metas',
  // AVC.1c: los avances son de la tarjeta, en Por pagar.
  avances:     'compromisos',
};

/**
 * Los tipos de aviso que son novedad y no urgencia (ADR 149 D2): no piden
 * hacer algo hoy, piden enterarse. Van a "Novedades", nunca a "Atención hoy".
 */
export const TIPOS_NOVEDAD = Object.freeze([
  'limite-excedido',
  'limite-alerta',
  'apartado-listo',
  'meta-alcanzada',
  'respaldo-atrasado',
  'suscripciones-varias',
  // AVC.1c (ADR 169 D8): un patrón para enterarse, no un pago para hoy.
  'avances-seguidos',
]);

/**
 * @param {import('../infra/avisos.js').Aviso} aviso
 * @returns {boolean}
 */
export function esNovedad(aviso) {
  return TIPOS_NOVEDAD.includes(aviso?.tipo);
}

/** @param {string} seccion */
const _dom = (seccion) => _DOM_POR_SECCION[seccion] ?? 'analisis';

// ── PURAS ────────────────────────────────────────────────────────

/**
 * Un aviso es de hoy si no apunta a una fecha futura (D2): lo vencido, lo que
 * vence hoy y lo que no tiene fecha (límites, apartado listo, el ingreso por
 * distribuir, el respaldo).
 *
 * El débito sin saldo (HF.2b) es de hoy aunque el débito sea en tres días: lo
 * que falta es dinero en la cuenta, y eso se resuelve ahora. Esperar a la
 * fecha para mostrarlo es mostrarlo cuando ya no hay tiempo.
 *
 * @param {import('../infra/avisos.js').Aviso} aviso
 * @returns {boolean}
 */
export function esDeHoy(aviso) {
  if (aviso?.tipo === 'debito-sin-saldo') return true;
  return aviso?.sentido !== 'restante' || aviso?.dias === 0;
}

/**
 * La fila a la que va un aviso. Es la sección de origen, salvo el débito sin
 * saldo (HF.2b): es de "Deudas y pagos fijos" para el interruptor de Ajustes,
 * pero su acción no es pagar sino pasar dinero a la cuenta, así que no entra
 * al lote de "Pagos para hoy".
 *
 * @param {import('../infra/avisos.js').Aviso} aviso
 * @returns {string}
 */
function _fila(aviso) {
  if (aviso.tipo === 'debito-sin-saldo') return 'debitos';
  // SUS.1c: es de "Deudas y pagos fijos" para el interruptor, pero no es un
  // pago para hoy: no entra al lote de "Pagar".
  if (aviso.tipo === 'suscripciones-varias') return 'suscripciones';
  // AVC.1c: tampoco es un pago: no entra al lote de "Pagar".
  if (aviso.tipo === 'avances-seguidos') return 'avances';
  return aviso.seccion;
}

/**
 * Agrupa los avisos de hoy por sección de origen, en el orden del motor.
 *
 * Una sola deduplicación (D3): si el ingreso por distribuir es de hoy, el
 * "te llega hoy" del mismo cobro sobra.
 *
 * @param {import('../infra/avisos.js').Aviso[]} avisos salida de `avisosDeHoy`, ya ordenada
 * @returns {Array<{ seccion: string, severidad: string, avisos: object[] }>}
 */
export function gruposAtencionHoy(avisos) {
  const deHoy = (Array.isArray(avisos) ? avisos : []).filter(a => esDeHoy(a) && !esNovedad(a));
  const repartoHoy = deHoy.some(a => a.tipo === 'ingreso-por-distribuir' && a.extra?.esHoy);
  const lista = repartoHoy ? deHoy.filter(a => a.tipo !== 'dia-de-pago') : deHoy;
  return _agrupar(lista);
}

/**
 * Las novedades (ADR 149 D2), agrupadas por clase igual que "Atención hoy" y
 * en el orden del motor. No pasan por `esDeHoy`: ninguna apunta a una fecha.
 *
 * @param {import('../infra/avisos.js').Aviso[]} avisos salida de `avisosDeHoy`
 * @returns {ReturnType<typeof gruposAtencionHoy>}
 */
export function gruposNovedades(avisos) {
  return _agrupar((Array.isArray(avisos) ? avisos : []).filter(esNovedad));
}

/** Una fila por clase, en el orden en que llega la lista. */
function _agrupar(lista) {
  const grupos = new Map();
  for (const a of lista) {
    const fila = _fila(a);
    if (!grupos.has(fila)) {
      grupos.set(fila, { seccion: fila, severidad: a.severidad, avisos: [] });
    }
    grupos.get(fila).avisos.push(a);
  }
  return [...grupos.values()];
}

/**
 * Cuántos avisos hay detrás de las filas: el único número de la superficie.
 *
 * @param {ReturnType<typeof gruposAtencionHoy>} grupos
 * @returns {number}
 */
export function totalAvisosHoy(grupos) {
  return grupos.reduce((n, g) => n + g.avisos.length, 0);
}

/**
 * El número que dicen la lente "Hoy", "Ver los N" y la hoja (D3).
 *
 * @param {typeof S} state
 * @param {string} hoyISO 'YYYY-MM-DD'
 * @returns {number}
 */
export function contarAvisosDeHoy(state, hoyISO) {
  return totalAvisosHoy(gruposAtencionHoy(avisosDeHoy(state, hoyISO)));
}

/**
 * SUS.1c: "Revisarlas" anota el mes (el aviso calla hasta el siguiente) y
 * lleva a Por pagar, donde viven los fijos. La comparten Atención hoy y el
 * panel de avisos de Inicio en escritorio.
 */
export function revisarSuscripciones() {
  S.config.suscripcionesRevisadas = hoy().slice(0, 7);
  save();
  EventBus.emit('state:change', { section: 'config' });
  location.hash = '#compromisos';
}

/** "hace 1 día", "hace 12 días". */
function _hace(dias) {
  const d = Number(dias) || 0;
  return d === 1 ? 'hace 1 día' : `hace ${d} días`;
}

function _suma(avisos) {
  return avisos.reduce((s, a) => s + (Number(a.monto) || 0), 0);
}

/**
 * "Recibiste tu ingreso del 30 de oct" (INI.2b, ADR 152 D9): la fecha como en
 * el resto de la app (ADR 102 D1), con el año solo si no es el de hoy.
 */
function _tituloReparto(a) {
  return a.extra?.esHoy ? 'Hoy recibes tu ingreso' : `Recibiste tu ingreso del ${fechaLegible(a.extra?.periodoISO)}`;
}

/**
 * Pagos: lo vencido y lo que vence hoy forman un lote. El estado de cada pago
 * y la forma de decirlo salen de `estado-obligacion.js` (OB.1, ADR 151), la
 * misma fuente del lote que abre "Pagar": dos vencidos son "2 pagos
 * vencidos", no "2 pagos para hoy". El desglose solo aparece si los estados
 * se mezclan; con uno solo, el título ya lo dice.
 *
 * INI.2b (ADR 152 D3): lo vencido junto con lo de hoy es "3 pagos para hoy ·
 * 1 ya vencido", como lo escribe el tablero (el mismo caso que AH.1e tituló
 * "Pagos para hoy"); la mezcla con lo próximo sigue con el desglose de OB.1.
 */
function _contenidoPagos(avisos) {
  const n = avisos.length;
  const total = _suma(avisos);
  const primero = avisos[0];
  const estados = avisos.map(a => textoEstadoObligacion(diasRestantesDeAviso(a)));
  const r = resumenObligaciones(estados);
  const paraHoy = r.vencidos > 0 && r.hoy > 0 && r.proximos === 0;
  const desglose = paraHoy
    ? (r.vencidos === 1 ? '1 ya vencido' : `${r.vencidos} ya vencidos`)
    : detalleObligaciones(r);
  const [e1] = estados;
  return {
    icono: 'deudas',
    titulo: n === 1
      ? (e1?.estado === 'vencido' ? `${primero.nombre}: ${_minuscula(e1.texto)}` : `${primero.nombre} vence hoy`)
      : (paraHoy ? `${n} pagos para hoy` : fraseObligaciones(r)),
    detalle: _m(total),
    // INI.2b (ADR 152 D3): el total se lee en el color del texto.
    detalleMonto: true,
    // ADR 126 D3: el estado del lote se lee en su color, aparte del monto.
    estado: desglose ? { texto: desglose, tono: r.vencidos > 0 ? 'danger' : 'warning' } : null,
    cta: {
      texto: 'Pagar',
      largo: n === 1 ? `Pagar ${primero.nombre}` : `Pagar los ${n} ${r.vencidos === n ? 'pagos vencidos' : 'pagos para hoy'}`,
      accion: 'inicio-pagar-lote',
      mueve: true,
      // INI.2b (ADR 152 D3): el botón del destacado dice solo "Pagar".
      corto: true,
    },
    grupo: {
      titulo: tituloObligaciones(r),
      cta: n === 1 ? `Pagar · ${_m(total)}` : `Pagar los ${n} · ${_m(total)}`,
    },
    item: (a) => {
      const e = textoEstadoObligacion(diasRestantesDeAviso(a));
      return {
        t: a.nombre,
        s: e?.texto ?? '',
        tono: e?.tono ?? '',
        estado: e?.estado ?? null,
        v: _m(Number(a.monto) || 0),
      };
    },
  };
}

/** "Venció ayer" → "venció ayer", para ir después de dos puntos. */
function _minuscula(texto) {
  return texto.charAt(0).toLowerCase() + texto.slice(1);
}

/** Límites: el primero manda la frase; el segundo, el detalle. */
function _contenidoLimites(avisos) {
  const n = avisos.length;
  const [a, b] = avisos;
  const excedido = (x) => x.tipo === 'limite-excedido';
  const pct = (x) => x.extra?.porcentaje ?? 0;
  const queda = (x) => Math.max(0, (Number(x.extra?.asignado) || 0) - (Number(x.monto) || 0));
  let detalle;
  if (n === 1) {
    detalle = `${excedido(a) ? 'Gastaste' : 'Llevas'} ${_m(Number(a.monto) || 0)} de ${_m(Number(a.extra?.asignado) || 0)}`;
  } else if (n === 2) {
    detalle = excedido(b) ? `Y ${b.nombre} también pasó su límite` : `Y ${b.nombre} va en el ${pct(b)} % de su límite`;
  } else {
    detalle = `Y ${n - 1} límites más`;
  }
  return {
    icono: 'presupuesto',
    titulo: excedido(a) ? `${a.nombre} pasó su límite` : `${a.nombre} va en el ${pct(a)} % de su límite`,
    detalle,
    cta: { texto: 'Ver', largo: n === 1 ? `Ver el límite de ${a.nombre}` : `Ver los ${n} límites`, href: '#presupuesto' },
    grupo: { titulo: 'Límites de gasto', cta: 'Ver los límites de gasto' },
    item: (x) => ({
      t: x.nombre,
      s: excedido(x) ? `Pasó su límite · ${pct(x)}%` : `Al ${pct(x)}% · quedan ${_m(queda(x))}`,
      tono: excedido(x) ? 'danger' : 'warning',
      v: _m(Number(x.monto) || 0),
    }),
  };
}

/** Tu ingreso: distribuir manda; el día de pago solo, si no hay reparto. */
function _contenidoIngreso(avisos) {
  const reparto = avisos.find(a => a.tipo === 'ingreso-por-distribuir');
  const pagos = avisos.filter(a => a.tipo === 'dia-de-pago');
  const item = (a) => (a.tipo === 'ingreso-por-distribuir'
    ? { t: _tituloReparto(a), s: 'Distribúyelo antes de empezar a gastarlo', tono: '', v: '' }
    : { t: a.nombre, s: 'Te llega hoy', tono: '', v: _m(Number(a.monto) || 0) });

  if (reparto) {
    return {
      icono: 'bolt',
      titulo: _tituloReparto(reparto),
      detalle: 'Distribúyelo antes de empezar a gastarlo',
      cta: { texto: 'Distribuir', largo: 'Distribuir tu ingreso', accion: 'distribuir-desde-inicio', mueve: true },
      grupo: { titulo: 'Tu ingreso', cta: 'Distribuir ahora' },
      item,
    };
  }
  return {
    icono: 'saldo',
    titulo: pagos.length === 1 ? `${pagos[0].nombre} te llega hoy` : `${pagos.length} ingresos te llegan hoy`,
    detalle: _m(_suma(pagos)),
    cta: { texto: 'Ver', largo: 'Ver tus ingresos', href: '#tesoreria' },
    grupo: { titulo: 'Tu ingreso', cta: 'Ver tus ingresos' },
    item,
  };
}

function _contenidoApartados(avisos) {
  const a = avisos[0];
  const listo = (x) => x.tipo === 'apartado-listo';
  const n = avisos.length;
  const resto = n > 1 ? `, y ${n - 1} más` : '';
  return {
    icono: 'apartados',
    titulo: listo(a) ? `${a.nombre}: ya reuniste el dinero` : `${a.nombre} es para hoy`,
    detalle: (listo(a) ? _m(Number(a.monto) || 0) : (Number(a.monto) > 0 ? `Te faltan ${_m(a.monto)}` : 'Ya está completo')) + resto,
    cta: { texto: 'Ver', largo: n === 1 ? `Ver ${a.nombre}` : 'Ver tus apartados', href: '#apartados' },
    grupo: { titulo: 'Apartados', cta: 'Ver tus apartados' },
    item: (x) => ({
      t: x.nombre,
      s: listo(x) ? 'Ya reuniste el dinero' : 'Su fecha es hoy',
      tono: '',
      v: _m(Number(x.monto) || 0),
    }),
  };
}

/** Me deben: recuerda la fecha pactada sin lenguaje de cobro (ADR 047). */
function _contenidoPersonales(avisos) {
  const a = avisos[0];
  const n = avisos.length;
  const cuando = (x) => (x.sentido === 'atraso' ? `Acordaron esta fecha ${_hace(x.dias)}` : 'Acordaron esta fecha para hoy');
  // ADR 126 D3: el nombre puede ser largo; el monto va en el detalle, que
  // nunca lo corta.
  const fecha = a.sentido === 'atraso' ? `fecha acordada ${_hace(a.dias)}` : 'fecha acordada para hoy';
  return {
    icono: 'personales',
    titulo: a.nombre,
    detalle: `Te debe ${_m(Number(a.monto) || 0)}, ${fecha}` + (n > 1 ? `, y ${n - 1} más` : ''),
    cta: { texto: 'Ver', largo: n === 1 ? `Ver lo que te debe ${a.nombre}` : 'Ver lo que te deben', href: '#personales' },
    grupo: { titulo: 'Me deben', cta: 'Ver lo que te deben' },
    item: (x) => ({ t: x.nombre, s: cuando(x), tono: '', v: _m(Number(x.monto) || 0) }),
  };
}

function _contenidoRespaldo(avisos) {
  const a = avisos[0];
  const hace = `Hace ${Number(a.dias) || 0} días que no lo haces`;
  return {
    icono: 'ajustes',
    titulo: 'Respalda tus datos',
    detalle: hace,
    cta: { texto: 'Ver', largo: 'Ir a respaldar tus datos', href: '#config' },
    grupo: { titulo: 'Respaldo de tus datos', cta: 'Ir a respaldar tus datos' },
    item: () => ({ t: 'Respaldo de tus datos', s: hace, tono: '', v: '' }),
  };
}

/** "hoy", "mañana", "en 3 días". */
function _cuandoDebito(dias) {
  const d = Number(dias) || 0;
  if (d === 0) return 'hoy';
  if (d === 1) return 'mañana';
  return `en ${d} días`;
}

/**
 * Débitos automáticos que la cuenta no alcanza a cubrir (HF.2b). La acción es
 * ver las cuentas, donde está Transferir: Finko no mueve el dinero solo.
 */
function _contenidoDebitos(avisos) {
  const n = avisos.length;
  const a = avisos[0];
  const cuenta = (x) => x.extra?.cuentaNombre || 'Tu cuenta';
  const falta = (x) => Number(x.extra?.falta) || 0;
  return {
    icono: 'saldo',
    titulo: n === 1
      ? `${cuenta(a)} no alcanza para ${a.nombre}`
      : `${n} débitos automáticos no alcanzan`,
    detalle: n === 1
      ? `Se debita ${_cuandoDebito(a.dias)} y faltan ${_m(falta(a))}`
      : `El primero, ${a.nombre}, ${_cuandoDebito(a.dias)}`,
    cta: { texto: 'Ver', largo: 'Ver tus cuentas', href: '#tesoreria' },
    grupo: { titulo: 'Débitos sin saldo', cta: 'Ver tus cuentas' },
    item: (x) => ({
      t: x.nombre,
      s: `${cuenta(x)} · se debita ${_cuandoDebito(x.dias)} · faltan ${_m(falta(x))}`,
      tono: 'warning',
      v: _m(Number(x.monto) || 0),
    }),
  };
}

/**
 * SUS.1c (ADR 146 D6): varias suscripciones. Pregunta, no acusa: Finko no
 * sabe si se usan. "Revisarlas" lleva a Por pagar y las calla hasta el mes
 * siguiente.
 */
function _contenidoSuscripciones(avisos) {
  const a = avisos[0];
  const n = Number(a.extra?.cuantas) || 0;
  const mensual = Number(a.monto) || 0;
  const anual = Number(a.extra?.anual) || mensual * 12;
  return {
    icono: 'recurring',
    titulo: `Pagas ${n} suscripciones`,
    detalle: `${_m(mensual)} al mes, ${_m(anual)} al año. ¿Las usas todas?`,
    cta: { texto: 'Revisar', largo: 'Revisar tus suscripciones', accion: 'suscripciones-revisar' },
    grupo: { titulo: 'Tus suscripciones', cta: 'Revisarlas' },
    item: (x) => ({ t: 'Tus suscripciones', s: (x.extra?.nombres ?? []).join(', '), tono: '', v: _m(Number(x.monto) || 0) }),
  };
}

/**
 * AVC.1c (ADR 169 D8): varios avances en tres meses. Dice el patrón sin
 * acusar y lleva al plan de salida, donde se ve cómo salir de la deuda.
 */
function _contenidoAvances(avisos) {
  const a = avisos[0];
  const n = Number(a.extra?.cuantos) || 0;
  const meses = Math.round((Number(a.extra?.dias) || 90) / 30);
  const enMeses = meses === 3 ? 'tres meses' : `${meses} meses`;
  return {
    icono: 'deudas',
    titulo: `Llevas ${n} avances en ${enMeses}`,
    detalle: `Suman ${_m(Number(a.monto) || 0)}. Es señal de que el mes no alcanza.`,
    cta: { texto: 'Ver', largo: 'Ver tu plan de salida', accion: 'compromisos-ver-plan' },
    grupo: { titulo: 'Tus avances', cta: 'Ver tu plan de salida' },
    item: (x) => ({ t: `${Number(x.extra?.cuantos) || 0} avances en ${enMeses}`, s: 'Es señal de que el mes no alcanza', tono: 'warning', v: _m(Number(x.monto) || 0) }),
  };
}

/** INI.1 (ADR 149 D4): la meta que se completó en la última semana. */
function _contenidoMetas(avisos) {
  const a = avisos[0];
  const n = avisos.length;
  const cuando = (x) => (Number(x.dias) === 0 ? 'hoy' : _hace(x.dias));
  return {
    icono: 'metas',
    titulo: n === 1 ? `Alcanzaste tu meta ${a.nombre}` : `Alcanzaste ${n} metas`,
    detalle: n === 1 ? `Reuniste ${_m(Number(a.monto) || 0)} ${cuando(a)}` : `La última, ${a.nombre}, ${cuando(a)}`,
    cta: { texto: 'Ver', largo: n === 1 ? `Ver tu meta ${a.nombre}` : 'Ver tus metas', href: '#metas' },
    grupo: { titulo: 'Metas alcanzadas', cta: 'Ver tus metas' },
    item: (x) => ({ t: x.nombre, s: `Alcanzada ${cuando(x)}`, tono: '', v: _m(Number(x.monto) || 0) }),
  };
}

/** ADR 122 D6: este teléfono y la nube tienen datos distintos. */
function _contenidoNube() {
  return {
    icono: 'alert',
    titulo: 'Falta decidir qué hacer con tus datos',
    detalle: 'Este teléfono y la nube tienen datos distintos',
    cta: { texto: 'Decidir', largo: 'Decidir qué hacer con tus datos en la nube', href: '#config' },
    grupo: { titulo: 'Tu copia en la nube', cta: 'Ir a decidir' },
    item: () => ({ t: 'Tu copia en la nube', s: 'Falta decidir qué hacer con tus datos', tono: 'warning', v: '' }),
  };
}

const _CONTENIDO_POR_SECCION = {
  compromisos: _contenidoPagos,
  presupuesto: _contenidoLimites,
  tesoreria:   _contenidoIngreso,
  apartados:   _contenidoApartados,
  personales:  _contenidoPersonales,
  respaldo:    _contenidoRespaldo,
  nube:        _contenidoNube,
  debitos:     _contenidoDebitos,
  suscripciones: _contenidoSuscripciones,
  metas:       _contenidoMetas,
  avances:     _contenidoAvances,
};

/**
 * Lo que dice una fila y su grupo en la hoja. Puro: el copy es de esta
 * superficie (ADR 066 D2) y sale solo de los datos del motor.
 *
 * @param {ReturnType<typeof gruposAtencionHoy>[number]} grupo
 */
export function contenidoGrupo(grupo) {
  const fn = _CONTENIDO_POR_SECCION[grupo.seccion];
  if (fn) return fn(grupo.avisos);
  const a = grupo.avisos[0];
  return {
    icono: 'info',
    titulo: a.nombre || 'Aviso',
    detalle: '',
    cta: { texto: 'Ver', largo: `Ver ${a.nombre || 'el aviso'}`, href: `#${grupo.seccion}` },
    grupo: { titulo: a.nombre || 'Avisos', cta: 'Ver' },
    item: (x) => ({ t: x.nombre || 'Aviso', s: '', tono: '', v: '' }),
  };
}

/**
 * Clases del botón de un grupo según su peso (ADR 126 D3, "Piezas de
 * Inicio"): mover dinero viste su sección; ir a otro lugar es neutro.
 * @returns {{ clase: string, dom: string }}
 */
function _pesoBoton(cta, dom) {
  return cta.mueve
    ? { clase: 'btn-dominio btn-dominio--bloque', dom: ` data-dom="${dom}"` }
    : { clase: 'btn btn-secondary', dom: '' };
}

/**
 * Acción del grupo dentro de la hoja: cierra la hoja antes de abrir el lote o
 * el asistente (`registrar-abrir`) o antes de navegar (`ir-a-seccion`).
 */
function _accionHoja(cta, texto, dom) {
  const { clase, dom: attr } = _pesoBoton(cta, dom);
  const cls = `${clase} avisos-hoy__cta`;
  if (cta.accion) {
    return `<button type="button" class="${cls}"${attr} data-action="registrar-abrir" data-target-action="${cta.accion}">${esc(texto)}</button>`;
  }
  return `<a class="${cls}" href="${cta.href}" data-action="ir-a-seccion">${esc(texto)}</a>`;
}

/** El detalle de una fila, con el estado del lote en su color si lo hay. */
function _htmlDetalle(c) {
  if (!c.detalle && !c.estado) return '';
  // SIT.1c (ADR 202 D2): el estado en su renglón, sin punto; el par "$X de
  // $Y", las cifras y los porcentajes no se parten.
  const estado = c.estado
    ? `<span class="atencion-hoy__estado atencion-hoy__estado--${c.estado.tono}">${esc(c.estado.texto)}</span>`
    : '';
  const detalle = c.detalleMonto && c.detalle
    ? `<span class="atencion-hoy__monto">${esc(c.detalle)}</span>`
    : _unidades(esc(c.detalle ?? ''));
  return `${detalle ? `<span class="atencion-hoy__detalle">${detalle}</span>` : ''}${estado}`;
}

/** Marca como unidad el par "$X de $Y", las cifras y los porcentajes de un texto ya escapado. */
function _unidades(html) {
  return html
    .replace(/\$[\d.]+ de \$[\d.]+|\$[\d.]+|\d+ %/g, m => `<span class="fk-unidad">${m}</span>`);
}

/** La teja de la sección del aviso. */
function _teja(c, dom) {
  return `<span class="cat-teja atencion-hoy__icono" data-dom="${dom}" aria-hidden="true">${icon(c.icono)}</span>`;
}

/**
 * La teja de una fila (AH.1, ADR 150 D2): el débito sin saldo de una sola
 * cuenta lleva el logo de esa cuenta, que es la que hay que llenar; lo demás,
 * la teja de su sección.
 */
function _tejaGrupo(g, c, dom) {
  if (g.seccion === 'debitos') {
    const ids = new Set(g.avisos.map(a => a.extra?.cuentaId));
    const cuenta = ids.size === 1 ? (S.cuentas ?? []).find(x => x.id === [...ids][0]) : null;
    if (cuenta) return `<span class="atencion-hoy__icono atencion-hoy__logo">${bancoAvatar(cuenta.banco, cuenta.icono)}</span>`;
  }
  return _teja(c, dom);
}

/**
 * El id del compromiso de un aviso: el motor arma el del aviso como
 * `tipo:idDelItem` (`infra/avisos.js`).
 */
function _idCompromiso(a) {
  const id = String(a?.id ?? '');
  const i = id.indexOf(':');
  return i >= 0 ? id.slice(i + 1) : id;
}

/**
 * La teja de un pago del motor: busca su compromiso por id (ADR 150 D2).
 * INI.7b (ADR 184 D2): sin logo, la teja de su categoría es neutra, para que
 * el frambuesa de Por pagar no se confunda con el rojo de lo vencido.
 */
function _tejaAviso(a, opciones = {}) {
  const compromiso = (S.compromisos ?? []).find(x => x.id === _idCompromiso(a));
  return tejaDePago(compromiso, a.nombre, S.categoriasPersonalizadas, opciones);
}

/**
 * El estado de un pago dentro de su fila: el que diga el contenido o, si no
 * lo dice, el que se lee en su tono (rojo vencido, ámbar para hoy).
 */
function _estadoItem(it) {
  return it.estado ?? (it.tono === 'danger' ? 'vencido' : it.tono === 'warning' ? 'hoy' : null);
}

/**
 * El orden de "Atención hoy" y de su hoja (AH.1b, ADR 150 D7): los pagos,
 * después tu ingreso, después lo demás en el orden del motor. Estable: dentro
 * de cada tramo no se mueve nada. Pura.
 *
 * @param {ReturnType<typeof gruposAtencionHoy>} grupos
 * @returns {ReturnType<typeof gruposAtencionHoy>}
 */
export function ordenarGruposAtencion(grupos) {
  const tramo = (g) => (g.seccion === 'compromisos' ? 0 : g.seccion === 'tesoreria' ? 1 : 2);
  return [...grupos].sort((a, b) => tramo(a) - tramo(b));
}

/**
 * Lo vencido va primero (ADR 150 D1), el más atrasado arriba; después lo de
 * hoy, en el orden del motor. Pura.
 *
 * @param {import('../infra/avisos.js').Aviso[]} avisos
 * @returns {import('../infra/avisos.js').Aviso[]}
 */
export function ordenarPagos(avisos) {
  const atraso = (a) => (a.sentido === 'atraso' ? Number(a.dias) || 0 : -1);
  return [...avisos].sort((a, b) => atraso(b) - atraso(a));
}

/** Una fila que se toca entera: lleva a su sección o abre su acción. */
function _htmlFila(g, i, prefijo = 'atencion-hoy') {
  const c = contenidoGrupo(g);
  const dom = _dom(g.seccion);
  const id = `${prefijo}-frase-${i}`;
  // SIT.1c (ADR 202 D7): sin "Ver" escrito, solo la flecha (el nombre
  // accesible ya lo dice); otro verbo ("Pagar", "Revisar") sí se escribe.
  const texto = c.cta.texto === 'Ver' ? '' : esc(c.cta.texto);
  const verbo = `<span class="atencion-hoy__verbo${c.cta.mueve ? ` atencion-hoy__verbo--dom" data-dom="${dom}` : ''}" aria-hidden="true">${texto}${icon('chevron-right', 'icon icon--sm')}</span>`;
  const dentro = `
            ${_tejaGrupo(g, c, dom)}
            <span class="atencion-hoy__textos" id="${id}">
              <span class="atencion-hoy__frase fk-balance"><span class="sr-only">${_SEVERIDAD_TEXTO[g.severidad] ?? ''}: </span>${_unidades(esc(c.titulo))}</span>
              ${_htmlDetalle(c)}
            </span>
            ${verbo}`;
  const comun = `class="atencion-hoy__accion atencion-hoy__control" aria-label="${esc(c.cta.largo)}" aria-describedby="${id}"`;
  const control = c.cta.accion
    ? `<button type="button" ${comun} data-action="${c.cta.accion}">${dentro}</button>`
    : `<a ${comun} href="${c.cta.href}">${dentro}</a>`;
  return `
        <li class="atencion-hoy__fila" data-seccion="${esc(g.seccion)}">${control}</li>`;
}

/** Filas a la vista de cada tarjeta antes de "N más" (INI.7b, ADR 184 D2). */
export const MAX_PAGOS_ATENCION = 3;

/** Ícono de cada estado de la fila (ADR 184 D2): triángulo, reloj, calendario, círculo. */
const _ICONO_ESTADO = Object.freeze({ vencido: 'alert', hoy: 'clock', proximo: 'agenda', info: 'info' });

/**
 * Lo que dice la fila de un pago: su estado con la palabra de
 * `estado-obligacion.js` (OB.1), la misma de la hoja del lote. Puro.
 *
 * @param {import('../infra/avisos.js').Aviso} a
 * @returns {{ nombre: string, estado: { clave: string, texto: string }|null, valor: string }}
 */
export function filaDePago(a) {
  const e = textoEstadoObligacion(diasRestantesDeAviso(a));
  return {
    nombre: a.nombre || 'Pago',
    estado: e ? { clave: e.estado, texto: e.texto } : null,
    valor: _m(Number(a.monto) || 0),
  };
}

/**
 * Las filas de lo que no es un pago (INI.7b, ADR 184 D2): una por aviso, con
 * su estado en azul ("requiere atención": no es un atraso, pide una acción).
 * La acción es la de su grupo. Puro respecto al estado, salvo el logo de la
 * cuenta del débito, que se busca en `S.cuentas`.
 *
 * @param {ReturnType<typeof gruposAtencionHoy>[number]} g
 * @returns {Array<{ logo: string, nombre: string, estado: { clave: string, texto: string }|null, valor: string, cta: object }>}
 */
export function filasDeGrupo(g) {
  const c = contenidoGrupo(g);
  const dom = _dom(g.seccion);
  const info = (texto) => (texto ? { clave: 'info', texto } : null);
  const teja = (icono) => _teja({ icono }, dom);
  const monto = (x) => (Number(x.monto) > 0 ? _m(Number(x.monto)) : '');
  switch (g.seccion) {
    case 'debitos':
      return g.avisos.map((x) => {
        const cuenta = (S.cuentas ?? []).find(k => k.id === x.extra?.cuentaId);
        return {
          logo: cuenta ? `<span class="atencion-hoy__icono atencion-hoy__logo">${bancoAvatar(cuenta.banco, cuenta.icono)}</span>` : teja(c.icono),
          nombre: `Débito automático de ${x.nombre}`,
          estado: info(`Falta saldo en ${x.extra?.cuentaNombre || 'tu cuenta'}`),
          valor: monto(x),
          cta: c.cta,
        };
      });
    case 'tesoreria': {
      const reparto = g.avisos.find(x => x.tipo === 'ingreso-por-distribuir');
      if (reparto) {
        return [{
          logo: teja('trending-up'),
          nombre: reparto.extra?.esHoy ? 'Tu ingreso de hoy' : `Tu ingreso del ${fechaLegible(reparto.extra?.periodoISO)}`,
          estado: info('Sin distribuir'),
          valor: Number(reparto.monto) > 0 ? `+${_m(Number(reparto.monto))}` : '',
          cta: c.cta,
        }];
      }
      return g.avisos.map(x => ({
        logo: teja('trending-up'), nombre: x.nombre || 'Tu ingreso', estado: info('Te llega hoy'),
        valor: Number(x.monto) > 0 ? `+${_m(Number(x.monto))}` : '', cta: c.cta,
      }));
    }
    case 'apartados':
      return g.avisos.map(x => ({
        logo: teja(c.icono), nombre: x.nombre,
        estado: info(x.tipo === 'apartado-listo' ? 'Ya reuniste el dinero' : 'Su fecha es hoy'),
        valor: monto(x), cta: c.cta,
      }));
    case 'personales':
      return g.avisos.map(x => ({
        logo: teja(c.icono), nombre: x.nombre,
        estado: info(x.sentido === 'atraso' ? `Acordaron pagarte ${_hace(x.dias)}` : 'Acordaron pagarte hoy'),
        valor: monto(x), cta: c.cta,
      }));
    case 'nube':
      return [{ logo: teja(c.icono), nombre: 'Tu copia en la nube', estado: info('Falta decidir qué hacer'), valor: '', cta: c.cta }];
    default:
      return [{ logo: teja(c.icono), nombre: c.titulo, estado: info(c.detalle), valor: '', cta: c.cta }];
  }
}

/**
 * Las piezas de una fila (ADR 184 D2), dentro del control que la abre.
 * SIT.1b (ADR 202 D1, cambia el ADR 184 D2): en el teléfono el valor sube
 * arriba a la derecha con la flecha (`.fila__der`, antes del nombre para
 * flotar) y el estado queda en su renglón, como en Fijos. La cifra de
 * arriba no se lee (`aria-hidden`); el lector la oye al final, después del
 * nombre y el estado (`.fila-atencion__valor`, solo para él).
 */
function _piezasFila(id, logo, f) {
  const unidad = f.estado && f.estado.clave !== 'info' ? ' fk-unidad' : '';
  const estado = f.estado
    ? `<span class="fila-atencion__estado fila-atencion__estado--${f.estado.clave}${unidad}">${icon(_ICONO_ESTADO[f.estado.clave] ?? 'info', 'icon fila-atencion__estado-icono')}<span class="fila-atencion__estado-texto">${esc(f.estado.texto)}</span></span>`
    : '';
  const der = `<span class="fila__der fila-atencion__der" aria-hidden="true">${f.valor ? `<span class="fila__cifra">${esc(f.valor)}</span>` : ''}${icon('chevron-right', 'icon fila__chev')}</span>`;
  return `
            <span class="fila-atencion__logo">${logo}</span>
            <span class="fila-atencion__textos fila__texto" id="${id}">${der}
              <span class="fila-atencion__nombre fila__nombre">${esc(f.nombre)}</span>
              ${estado}
              ${f.valor ? `<span class="fila-atencion__valor sr-only">${esc(f.valor)}</span>` : ''}
            </span>
            ${icon('chevron-right', 'icon fila-atencion__flecha')}`;
}

/**
 * TEL.1c (ADR 199 D18): el nombre accesible empieza por lo que se ve y suma
 * la acción ("Te pasaste en Café, ver el límite de Café"): quien maneja el
 * teléfono con la voz dice lo que lee.
 */
function _nombreVisible(visible, accion) {
  if (!visible || accion.toLowerCase().startsWith(visible.toLowerCase())) return accion;
  return `${visible}, ${accion.charAt(0).toLowerCase()}${accion.slice(1)}`;
}

/** La fila de un pago: se toca entera y abre ese pago (`inicio-pagar-uno`). */
function _htmlFilaPago(a, i) {
  const id = `atencion-hoy-pago-${i}`;
  const f = filaDePago(a);
  return `
        <li class="atencion-hoy__fila fila-atencion" data-seccion="compromisos">
          <button type="button" class="fila-atencion__control" data-action="inicio-pagar-uno" data-id="${esc(_idCompromiso(a))}"
                  aria-label="${esc(_nombreVisible(f.nombre, 'Pagar'))}" aria-describedby="${id}">${_piezasFila(id, _tejaAviso(a, { neutra: true }), f)}
          </button>
        </li>`;
}

/** La fila de lo que no es un pago: su acción es la de su grupo. */
function _htmlFilaOtra(seccion, f, i) {
  const id = `atencion-hoy-otro-${i}`;
  const comun = `class="fila-atencion__control" aria-label="${esc(_nombreVisible(f.nombre, f.cta.largo))}" aria-describedby="${id}"`;
  const dentro = _piezasFila(id, f.logo, f);
  const control = f.cta.accion
    ? `<button type="button" ${comun} data-action="${f.cta.accion}">${dentro}</button>`
    : `<a ${comun} href="${f.cta.href}">${dentro}</a>`;
  return `
        <li class="atencion-hoy__fila fila-atencion" data-seccion="${esc(seccion)}">${control}</li>`;
}

/**
 * "N pagos más · $X  Ver todos": los logos de los que no caben, hasta tres, y
 * la hoja con todos (`atencion-hoy-ver`).
 */
function _htmlMas(tejas, texto, monto) {
  const logos = tejas.slice(0, 3).map(t => `<span class="fila-atencion__mas-logo">${t}</span>`).join('');
  return `
        <li class="atencion-hoy__fila fila-atencion fila-atencion--mas">
          <button type="button" class="fila-atencion__control fila-atencion__control--mas" data-action="atencion-hoy-ver" aria-haspopup="dialog"
                  aria-label="${esc(`Ver todos: ${texto}${monto ? `, ${monto}` : ''}`)}">
            <span class="fila-atencion__mas-logos" aria-hidden="true">${logos}</span>
            <span class="fila-atencion__mas-texto"><span class="fila-atencion__mas-cuantos fk-unidad">${esc(texto)}</span>${monto ? ` <span class="fila-atencion__mas-monto fk-unidad">${esc(monto)}</span>` : ''}</span>
            <span class="fila-atencion__ver">Ver todos${icon('chevron-right', 'icon icon--sm')}</span>
          </button>
        </li>`;
}

/**
 * HTML de la lista. Puro respecto al estado (lee `S` solo para los logos).
 *
 * INI.7b (ADR 184 D2): "Atención hoy" y, con dos pagos o más, "N pagos · $X"
 * debajo; la tarjeta de los pagos (hasta tres filas, "N pagos más" y "Pagar
 * los N" al pie) y, aparte, lo que no es un pago. Sin pagos, lo demás va en
 * la única tarjeta, sin subtítulo.
 *
 * @param {ReturnType<typeof gruposAtencionHoy>} grupos
 * @returns {string}
 */
export function htmlAtencionHoy(grupos, { proximo = '' } = {}) {
  const cabeza = `
    <div class="atencion-hoy__cabeza">
      <h2 class="atencion-hoy__titulo" id="atencion-hoy-titulo">Atención hoy</h2>
    </div>`;

  // SIT.1d (ADR 202 D9): sin nada hoy, el bloque queda con una fila que lo
  // confirma y dice cuándo es lo próximo; no ocupa más que una fila normal.
  // Si tampoco hay nada en la semana, Tino descansa (identidad.css 12).
  if (grupos.length === 0) {
    return `${cabeza}
    <div class="atencion-hoy__ok atencion-hoy__ok--fila">
      <span class="cat-teja atencion-hoy__icono" data-dom="compromisos" aria-hidden="true">${icon('check-circle')}</span>
      <div class="atencion-hoy__textos fila__texto">
        <p class="atencion-hoy__frase fila__nombre">Nada pendiente hoy</p>
        <p class="atencion-hoy__detalle fila__dato">${proximo ? `Lo próximo es el <span class="fk-unidad">${esc(proximo)}</span>` : 'Ningún pago vencido y nada sin repartir.'}</p>
      </div>
    </div>`;
  }

  const ordenados = ordenarGruposAtencion(grupos);
  const gPagos = ordenados.find(g => g.seccion === 'compromisos');
  const pagos = gPagos ? ordenarPagos(gPagos.avisos) : [];
  const n = pagos.length;
  const resumen = n > 1
    ? `<p class="atencion-hoy__resumen"><span class="fk-unidad">${n} pagos</span> por <span class="atencion-hoy__resumen-total fk-unidad">${esc(_m(_suma(pagos)))}</span></p>`
    : '';

  let tarjetaPagos = '';
  if (n > 0) {
    const c = contenidoGrupo(gPagos);
    const visibles = pagos.slice(0, MAX_PAGOS_ATENCION);
    const resto = pagos.slice(MAX_PAGOS_ATENCION);
    const mas = resto.length
      ? _htmlMas(resto.map(a => _tejaAviso(a, { neutra: true })), resto.length === 1 ? '1 pago más' : `${resto.length} pagos más`, _m(_suma(resto)))
      : '';
    const texto = n === 1 ? `Pagar ${pagos[0].nombre}` : `Pagar los ${n}`;
    tarjetaPagos = `
    <ul class="atencion-hoy__lista atencion-hoy__lista--pagos" role="list">${visibles.map(_htmlFilaPago).join('')}${mas}
        <li class="fila-atencion__pie">
          <button type="button" class="btn-dominio btn-dominio--bloque atencion-hoy__boton" data-dom="compromisos"
                  data-action="inicio-pagar-lote" aria-label="${esc(c.cta.largo)}">${esc(texto)}</button>
        </li>
    </ul>`;
  }

  const otras = ordenados.filter(g => g.seccion !== 'compromisos')
    .flatMap(g => filasDeGrupo(g).map(f => ({ seccion: g.seccion, f })));
  let tarjetaOtras = '';
  if (otras.length) {
    const visibles = otras.slice(0, MAX_FILAS_ATENCION);
    const resto = otras.slice(MAX_FILAS_ATENCION);
    const mas = resto.length
      ? _htmlMas(resto.map(o => o.f.logo), resto.length === 1 ? '1 más' : `${resto.length} más`, '')
      : '';
    tarjetaOtras = `
    ${n > 0 ? '<p class="atencion-hoy__subtitulo">También necesita tu atención</p>' : ''}
    <ul class="atencion-hoy__lista atencion-hoy__lista--otras" role="list">${visibles.map((o, i) => _htmlFilaOtra(o.seccion, o.f, i)).join('')}${mas}
    </ul>`;
  }

  return `${cabeza}${resumen}${tarjetaPagos}${tarjetaOtras}`;
}

/**
 * HTML de "Novedades" (ADR 149 D2). Puro respecto al estado. Sin destacado ni
 * urgencia escrita: nada de esto es para hoy, así que todas las clases van
 * como filas que se tocan enteras, sin tope (son seis clases como mucho). Sin
 * novedades no hay bloque: quien llama oculta la celda.
 *
 * @param {ReturnType<typeof gruposNovedades>} grupos
 * @returns {string}
 */
export function htmlNovedades(grupos) {
  return `
    <div class="atencion-hoy__cabeza">
      <h2 class="atencion-hoy__titulo" id="novedades-titulo">Novedades</h2>
    </div>
    <ul class="atencion-hoy__lista" role="list">${grupos.map((g, i) => _htmlFila(g, i, 'novedades')).join('')}</ul>`;
}

/**
 * HTML de la hoja "Avisos de hoy". Puro respecto al estado.
 *
 * @param {ReturnType<typeof gruposAtencionHoy>} grupos
 * @returns {string}
 */
export function htmlHojaAvisosHoy(grupos) {
  const total = totalAvisosHoy(grupos);
  const secciones = ordenarGruposAtencion(grupos).map((g) => {
    const c = contenidoGrupo(g);
    const tono = _TONO[g.severidad] ?? 'info';
    const dom = _dom(g.seccion);
    // AH.1 (ADR 150 D3): cada pago con su logo y su estado en pastilla; el
    // débito sin saldo, con el logo de su cuenta.
    const esPago = g.seccion === 'compromisos';
    const items = (esPago ? ordenarPagos(g.avisos) : g.avisos).map((a) => {
      const it = c.item(a);
      let logo = '';
      if (esPago) logo = `<span class="avisos-hoy__logo">${_tejaAviso(a, { neutra: true })}</span>`;
      else if (g.seccion === 'debitos') {
        const cuenta = (S.cuentas ?? []).find(x => x.id === a.extra?.cuentaId);
        if (cuenta) logo = `<span class="avisos-hoy__logo">${bancoAvatar(cuenta.banco, cuenta.icono)}</span>`;
      }
      const sub = esPago
        ? chipEstadoPago(_estadoItem(it), it.s)
        : (it.s ? `<p class="avisos-hoy__item-s${it.tono ? ` avisos-hoy__item-s--${it.tono}` : ''}">${esc(it.s)}</p>` : '');
      return `
          <li class="avisos-hoy__item">
            ${logo}
            <div class="avisos-hoy__item-textos">
              <p class="avisos-hoy__item-t">${esc(it.t)}</p>
              ${sub}
            </div>
            ${it.v ? `<span class="avisos-hoy__item-v">${esc(it.v)}</span>` : ''}
          </li>`;
    }).join('');
    return `
      <section class="avisos-hoy__grupo" aria-labelledby="avisos-hoy-${esc(g.seccion)}">
        <div class="avisos-hoy__grupo-cabeza">
          ${_teja(c, dom)}
          <h3 class="avisos-hoy__grupo-titulo" id="avisos-hoy-${esc(g.seccion)}">${esc(c.grupo.titulo)}</h3>
          <span class="avisos-hoy__sev avisos-hoy__sev--${tono}">${_SEVERIDAD_TEXTO[g.severidad] ?? ''}</span>
        </div>
        <ul class="avisos-hoy__lista" role="list">${items}</ul>
        ${_accionHoja(c.cta, c.grupo.cta, dom)}
      </section>`;
  }).join('');

  return `
    <h2 class="avisos-hoy__titulo" id="avisos-hoy-titulo">Avisos de hoy<span class="avisos-hoy__cuenta"><span class="sr-only"> · </span>${total}</span></h2>
    ${secciones}
    <p class="avisos-hoy__nota">Lo que viene después de hoy está en Esta semana.</p>`;
}

// ── DOM ──────────────────────────────────────────────────────────

/** Mismo umbral que el resto de Inicio (DSK.1, ADR 070 D1). */
function _enEscritorio() {
  return window.matchMedia?.('(min-width: 1024px)').matches === true;
}

/**
 * Pinta la lista en `#panel-atencion-hoy`. Sin cuentas y sin avisos no hay
 * nada que decir: manda la guía del hero (IN.9e). En escritorio no se pinta.
 * No-op si el contenedor no existe.
 */
export function renderAtencionHoy() {
  const el = document.getElementById('panel-atencion-hoy');
  if (!el) return;

  if (_enEscritorio()) {
    el.innerHTML = '';
    el.hidden = true;
    return;
  }

  const grupos = gruposAtencionHoy(avisosDeHoy(S, hoy()));
  const hayCuentas = (S.cuentas ?? []).some(c => c.activa !== false);
  if (grupos.length === 0 && !hayCuentas) {
    el.innerHTML = '';
    el.hidden = true;
    return;
  }
  el.hidden = false;
  el.innerHTML = htmlAtencionHoy(grupos, { proximo: grupos.length ? '' : _proximoPago() });
}

/**
 * El día del próximo pago, después de hoy: "sábado 28" esta semana, "jueves 3
 * de diciembre" más adelante; '' si no hay ninguno en el próximo mes.
 */
function _proximoPago() {
  const [p] = compromisosProximos(S.compromisos ?? [], 31, new Date(), S.gastos ?? []).filter(c => c.diasRestantes > 0);
  return p ? diaDelProximo(p.diasRestantes) : '';
}


/**
 * Pinta "Novedades" en `#panel-novedades`, en los dos anchos (ADR 149 D2).
 * Sin novedades la celda se oculta: nada de tarjetas vacías. No-op si el
 * contenedor no existe.
 */
export function renderNovedades() {
  const el = document.getElementById('panel-novedades');
  if (!el) return;
  const grupos = gruposNovedades(avisosDeHoy(S, hoy()));
  if (grupos.length === 0) {
    el.innerHTML = '';
    el.hidden = true;
    return;
  }
  el.hidden = false;
  el.innerHTML = htmlNovedades(grupos);
}

/** "Ver los N": la hoja se arma al abrirla, con el estado de ese momento. */
function _abrirHoja() {
  const hoja = document.getElementById('modal-avisos-hoy');
  const cuerpo = document.getElementById('avisos-hoy-body');
  if (!hoja || !cuerpo) return;
  cuerpo.innerHTML = htmlHojaAvisosHoy(gruposAtencionHoy(avisosDeHoy(S, hoy())));
  abrirModal(hoja);
}

/** Identidad estable para el coalescer de renders (PERF.6). */
function _render() {
  renderAtencionHoy();
  renderNovedades();
}

/** Se llama una vez desde bootstrap.js. */
export function initAtencionHoy() {
  registrarAccion('atencion-hoy-ver', _abrirHoja);
  registrarAccion('suscripciones-revisar', revisarSuscripciones);
  registrarRender(_render);
  EventBus.on('state:change', () => programarRender(_render));
  // Cruzar los 1024px sin cambio de estado no repinta nada más.
  window.matchMedia?.('(min-width: 1024px)').addEventListener?.('change', () => programarRender(_render));
}

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
 * Los paneles de escritorio siguen en el DOM; responsive.css decide cuál se ve.
 */

import { S, EventBus } from '../core/state.js';
import { f, esc, hoy, formateadorFecha } from '../infra/utils.js';
import { icon } from '../infra/icons.js';
import { avisosDeHoy } from '../infra/avisos.js';
import { registrarRender, programarRender } from '../infra/render.js';
import { registrarAccion } from './actions.js';
import { abrirModal } from './modales.js';

/** Filas a la vista antes de mandar el resto a la hoja (D1). */
export const MAX_FILAS_ATENCION = 3;

/** La severidad dicha con palabras: la hoja la muestra, el lector la oye. */
const _SEVERIDAD_TEXTO = {
  urgente: 'Urgente',
  alta:    'Importante',
  media:   'Para revisar',
  baja:    'Para tu información',
};

/** Tono de la teja y del rótulo de severidad. */
const _TONO = { urgente: 'danger', alta: 'warning', media: 'info', baja: 'info' };

// ── PURAS ────────────────────────────────────────────────────────

/**
 * Un aviso es de hoy si no apunta a una fecha futura (D2): lo vencido, lo que
 * vence hoy y lo que no tiene fecha (límites, apartado listo, el ingreso por
 * distribuir, el respaldo).
 *
 * @param {import('../infra/avisos.js').Aviso} aviso
 * @returns {boolean}
 */
export function esDeHoy(aviso) {
  return aviso?.sentido !== 'restante' || aviso?.dias === 0;
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
  const deHoy = (Array.isArray(avisos) ? avisos : []).filter(esDeHoy);
  const repartoHoy = deHoy.some(a => a.tipo === 'ingreso-por-distribuir' && a.extra?.esHoy);
  const lista = repartoHoy ? deHoy.filter(a => a.tipo !== 'dia-de-pago') : deHoy;

  const grupos = new Map();
  for (const a of lista) {
    if (!grupos.has(a.seccion)) {
      grupos.set(a.seccion, { seccion: a.seccion, severidad: a.severidad, avisos: [] });
    }
    grupos.get(a.seccion).avisos.push(a);
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

/** "hace 1 día", "hace 12 días". */
function _hace(dias) {
  const d = Number(dias) || 0;
  return d === 1 ? 'hace 1 día' : `hace ${d} días`;
}

/** "15 oct": mismo formato del aviso de distribuir de Inicio. */
function _fechaCorta(iso) {
  const d = new Date(`${iso}T12:00:00Z`);
  return formateadorFecha('es-CO', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(d);
}

function _suma(avisos) {
  return avisos.reduce((s, a) => s + (Number(a.monto) || 0), 0);
}

function _tituloReparto(a) {
  return a.extra?.esHoy ? 'Hoy recibes tu ingreso' : `Recibiste tu ingreso el ${_fechaCorta(a.extra?.periodoISO)}`;
}

/** Pagos: lo vencido y lo que vence hoy forman un lote. */
function _contenidoPagos(avisos) {
  const n = avisos.length;
  const total = _suma(avisos);
  const vencidos = avisos.filter(a => a.sentido === 'atraso').length;
  const primero = avisos[0];
  const enLote = vencidos === 0 ? 'vencen hoy' : vencidos === 1 ? '1 ya vencido' : `${vencidos} ya vencidos`;
  return {
    icono: 'deudas',
    titulo: n === 1
      ? (primero.sentido === 'atraso' ? `${primero.nombre}: venció ${_hace(primero.dias)}` : `${primero.nombre} vence hoy`)
      : `${n} pagos para hoy`,
    detalle: n === 1 ? f(total) : `${f(total)} · ${enLote}`,
    cta: { texto: 'Pagar', largo: n === 1 ? `Pagar ${primero.nombre}` : `Pagar los ${n}`, accion: 'inicio-pagar-lote' },
    grupo: {
      titulo: 'Pagos para hoy',
      cta: n === 1 ? `Pagar · ${f(total)}` : `Pagar los ${n} · ${f(total)}`,
    },
    item: (a) => ({
      t: a.nombre,
      s: a.sentido === 'atraso' ? `Venció ${_hace(a.dias)}` : 'Vence hoy',
      tono: a.sentido === 'atraso' ? 'danger' : 'warning',
      v: f(Number(a.monto) || 0),
    }),
  };
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
    detalle = excedido(a)
      ? `Gastaste ${f(Number(a.monto) || 0)} de ${f(Number(a.extra?.asignado) || 0)}`
      : `Te quedan ${f(queda(a))}`;
  } else if (n === 2) {
    detalle = excedido(b) ? `Y ${b.nombre} también pasó su límite` : `Y ${b.nombre} va al ${pct(b)}%`;
  } else {
    detalle = `Y ${n - 1} límites más`;
  }
  return {
    icono: 'presupuesto',
    titulo: excedido(a) ? `${a.nombre} pasó su límite` : `${a.nombre} va al ${pct(a)}%`,
    detalle,
    cta: { texto: 'Ver', largo: n === 1 ? `Ver el límite de ${a.nombre}` : `Ver los ${n} límites`, href: '#presupuesto' },
    grupo: { titulo: 'Límites de gasto', cta: 'Ver los límites de gasto' },
    item: (x) => ({
      t: x.nombre,
      s: excedido(x) ? `Pasó su límite · ${pct(x)}%` : `Al ${pct(x)}% · quedan ${f(queda(x))}`,
      tono: excedido(x) ? 'danger' : 'warning',
      v: f(Number(x.monto) || 0),
    }),
  };
}

/** Tu ingreso: distribuir manda; el día de pago solo, si no hay reparto. */
function _contenidoIngreso(avisos) {
  const reparto = avisos.find(a => a.tipo === 'ingreso-por-distribuir');
  const pagos = avisos.filter(a => a.tipo === 'dia-de-pago');
  const item = (a) => (a.tipo === 'ingreso-por-distribuir'
    ? { t: _tituloReparto(a), s: 'Distribúyelo antes de empezar a gastarlo', tono: '', v: '' }
    : { t: a.nombre, s: 'Te llega hoy', tono: '', v: f(Number(a.monto) || 0) });

  if (reparto) {
    return {
      icono: 'bolt',
      titulo: _tituloReparto(reparto),
      detalle: 'Distribúyelo antes de empezar a gastarlo',
      cta: { texto: 'Distribuir', largo: 'Distribuir tu ingreso', accion: 'distribuir-desde-inicio' },
      grupo: { titulo: 'Tu ingreso', cta: 'Distribuir ahora' },
      item,
    };
  }
  return {
    icono: 'saldo',
    titulo: pagos.length === 1 ? `${pagos[0].nombre} te llega hoy` : `${pagos.length} ingresos te llegan hoy`,
    detalle: f(_suma(pagos)),
    cta: { texto: 'Ver', largo: 'Ver tus ingresos', href: '#tesoreria' },
    grupo: { titulo: 'Tu ingreso', cta: 'Ver tus ingresos' },
    item,
  };
}

function _contenidoApartados(avisos) {
  const a = avisos[0];
  const listo = (x) => x.tipo === 'apartado-listo';
  const n = avisos.length;
  const resto = n > 1 ? ` · y ${n - 1} más` : '';
  return {
    icono: 'apartados',
    titulo: listo(a) ? `${a.nombre}: ya reuniste el dinero` : `${a.nombre} es para hoy`,
    detalle: (listo(a) ? f(Number(a.monto) || 0) : (Number(a.monto) > 0 ? `Te faltan ${f(a.monto)}` : 'Ya está completo')) + resto,
    cta: { texto: 'Ver', largo: n === 1 ? `Ver ${a.nombre}` : 'Ver tus apartados', href: '#apartados' },
    grupo: { titulo: 'Apartados', cta: 'Ver tus apartados' },
    item: (x) => ({
      t: x.nombre,
      s: listo(x) ? 'Ya reuniste el dinero' : 'Su fecha es hoy',
      tono: '',
      v: f(Number(x.monto) || 0),
    }),
  };
}

/** Me deben: recuerda la fecha pactada sin lenguaje de cobro (ADR 047). */
function _contenidoPersonales(avisos) {
  const a = avisos[0];
  const n = avisos.length;
  const cuando = (x) => (x.sentido === 'atraso' ? `Acordaron esta fecha ${_hace(x.dias)}` : 'Acordaron esta fecha para hoy');
  return {
    icono: 'personales',
    titulo: `${a.nombre} te debe ${f(Number(a.monto) || 0)}`,
    detalle: cuando(a) + (n > 1 ? ` · y ${n - 1} más` : ''),
    cta: { texto: 'Ver', largo: n === 1 ? `Ver lo que te debe ${a.nombre}` : 'Ver lo que te deben', href: '#personales' },
    grupo: { titulo: 'Me deben', cta: 'Ver lo que te deben' },
    item: (x) => ({ t: x.nombre, s: cuando(x), tono: '', v: f(Number(x.monto) || 0) }),
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
    grupo: { titulo: 'Respaldo de tus datos', cta: 'Ir a Ajustes' },
    item: () => ({ t: 'Respaldo de tus datos', s: hace, tono: '', v: '' }),
  };
}

const _CONTENIDO_POR_SECCION = {
  compromisos: _contenidoPagos,
  presupuesto: _contenidoLimites,
  tesoreria:   _contenidoIngreso,
  apartados:   _contenidoApartados,
  personales:  _contenidoPersonales,
  respaldo:    _contenidoRespaldo,
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

/** Botón o enlace de la acción de una fila (fuera de la hoja). */
function _accionFila(cta) {
  const clase = 'btn btn-secondary btn-sm atencion-hoy__accion';
  if (cta.accion) {
    return `<button type="button" class="${clase}" data-action="${cta.accion}" aria-label="${esc(cta.largo)}">${esc(cta.texto)}</button>`;
  }
  return `<a class="${clase}" href="${cta.href}" aria-label="${esc(cta.largo)}">${esc(cta.texto)}</a>`;
}

/**
 * Acción del grupo dentro de la hoja: cierra la hoja antes de abrir el lote o
 * el asistente (`registrar-abrir`) o antes de navegar (`ir-a-seccion`).
 */
function _accionHoja(cta, texto) {
  const clase = 'btn btn-secondary avisos-hoy__cta';
  if (cta.accion) {
    return `<button type="button" class="${clase}" data-action="registrar-abrir" data-target-action="${cta.accion}">${esc(texto)}</button>`;
  }
  return `<a class="${clase}" href="${cta.href}" data-action="ir-a-seccion">${esc(texto)}</a>`;
}

/**
 * HTML de la lista. Puro respecto al estado.
 *
 * @param {ReturnType<typeof gruposAtencionHoy>} grupos
 * @returns {string}
 */
export function htmlAtencionHoy(grupos) {
  const total = totalAvisosHoy(grupos);
  const visibles = grupos.slice(0, MAX_FILAS_ATENCION);
  const verTodos = total > visibles.length
    ? `<button type="button" class="atencion-hoy__ver" data-action="atencion-hoy-ver" aria-haspopup="dialog">
         Ver los ${total}${icon('chevron-right', 'icon icon--sm')}
       </button>`
    : '';

  const cuerpo = visibles.length === 0
    ? `<div class="atencion-hoy__ok">
         <span class="atencion-hoy__icono atencion-hoy__icono--ok" aria-hidden="true">${icon('check')}</span>
         <div class="atencion-hoy__textos">
           <p class="atencion-hoy__frase">Nada que atender hoy</p>
           <p class="atencion-hoy__detalle">Ningún pago vencido, nada sin repartir y ningún límite pasado.</p>
         </div>
       </div>`
    : `<ul class="atencion-hoy__lista" role="list">${visibles.map((g) => {
        const c = contenidoGrupo(g);
        const tono = _TONO[g.severidad] ?? 'info';
        return `
        <li class="atencion-hoy__fila">
          <span class="atencion-hoy__icono atencion-hoy__icono--${tono}" aria-hidden="true">${icon(c.icono)}</span>
          <div class="atencion-hoy__textos">
            <p class="atencion-hoy__frase"><span class="sr-only">${_SEVERIDAD_TEXTO[g.severidad] ?? ''}: </span>${esc(c.titulo)}</p>
            ${c.detalle ? `<p class="atencion-hoy__detalle">${esc(c.detalle)}</p>` : ''}
          </div>
          ${_accionFila(c.cta)}
        </li>`;
      }).join('')}</ul>`;

  return `
    <div class="atencion-hoy__cabeza">
      <h2 class="atencion-hoy__titulo" id="atencion-hoy-titulo">Atención hoy</h2>
      ${verTodos}
    </div>
    ${cuerpo}`;
}

/**
 * HTML de la hoja "Avisos de hoy". Puro respecto al estado.
 *
 * @param {ReturnType<typeof gruposAtencionHoy>} grupos
 * @returns {string}
 */
export function htmlHojaAvisosHoy(grupos) {
  const total = totalAvisosHoy(grupos);
  const secciones = grupos.map((g) => {
    const c = contenidoGrupo(g);
    const tono = _TONO[g.severidad] ?? 'info';
    const items = g.avisos.map((a) => {
      const it = c.item(a);
      return `
          <li class="avisos-hoy__item">
            <div class="avisos-hoy__item-textos">
              <p class="avisos-hoy__item-t">${esc(it.t)}</p>
              ${it.s ? `<p class="avisos-hoy__item-s${it.tono ? ` avisos-hoy__item-s--${it.tono}` : ''}">${esc(it.s)}</p>` : ''}
            </div>
            ${it.v ? `<span class="avisos-hoy__item-v">${esc(it.v)}</span>` : ''}
          </li>`;
    }).join('');
    return `
      <section class="avisos-hoy__grupo" aria-labelledby="avisos-hoy-${esc(g.seccion)}">
        <div class="avisos-hoy__grupo-cabeza">
          <h3 class="avisos-hoy__grupo-titulo" id="avisos-hoy-${esc(g.seccion)}">${esc(c.grupo.titulo)}</h3>
          <span class="avisos-hoy__sev avisos-hoy__sev--${tono}">${_SEVERIDAD_TEXTO[g.severidad] ?? ''}</span>
        </div>
        <ul class="avisos-hoy__lista" role="list">${items}</ul>
        ${_accionHoja(c.cta, c.grupo.cta)}
      </section>`;
  }).join('');

  return `
    <h2 class="avisos-hoy__titulo" id="avisos-hoy-titulo">Avisos de hoy · ${total}</h2>
    ${secciones}
    <p class="avisos-hoy__nota">Lo que vence después de hoy está en Próximas prioridades.</p>`;
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
  el.innerHTML = htmlAtencionHoy(grupos);
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
}

/** Se llama una vez desde bootstrap.js. */
export function initAtencionHoy() {
  registrarAccion('atencion-hoy-ver', _abrirHoja);
  registrarRender(_render);
  EventBus.on('state:change', () => programarRender(_render));
  // Cruzar los 1024px sin cambio de estado no repinta nada más.
  window.matchMedia?.('(min-width: 1024px)').addEventListener?.('change', () => programarRender(_render));
}

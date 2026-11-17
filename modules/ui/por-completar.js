/**
 * por-completar.js - "Por completar" de Inicio (INI.1,
 * [ADR 149](../../docs/DECISIONS/149-inicio-centro-de-atencion-rapida.md) D3).
 *
 * Lo que el usuario dejó a medio registrar, en los dos anchos: los gastos en
 * "Otros" que no dicen en qué fueron y la pregunta "¿es un gusto o algo que
 * necesitas?" que hasta ahora solo aparecía dentro de Gastos. Los datos salen
 * de `infra/pendientes.js`; acá solo va el copy y el HTML.
 *
 * Usa las mismas filas que "Atención hoy" y "Novedades" (`.atencion-hoy__*`):
 * la pantalla se lee como una sola lista partida en bloques, no como tres
 * diseños distintos.
 *
 * No hay acción nueva: "Completar" abre el gasto con `editar-gasto` y las dos
 * respuestas son `gastos-gusto-o-necesidad`, las dos de Gastos, invocadas por
 * nombre (ningún dominio se importa, ADN 10).
 *
 * Sin nada por completar, la celda se oculta: no hay tarjetas vacías.
 */

import { S, EventBus } from '../core/state.js';
import { f, esc, hoy, fechaLegible } from '../infra/utils.js';
import { icon } from '../infra/icons.js';
import { topeHormiga, aprendidosDe } from '../infra/hormiga.js';
import { pendientesPorCompletar } from '../infra/pendientes.js';
import { registrarRender, programarRender, SALDO_MASCARA_CUENTA } from '../infra/render.js';

/** Los montos obedecen al ojo de la pantalla (ADR 106 D3), como en Atención hoy. */
const _m = (n) => (S.config?.ocultarSaldo === true ? SALDO_MASCARA_CUENTA : f(n));

/** "hoy", "ayer" o la fecha legible. */
function _cuando(fechaISO, hoyISO) {
  const fecha = String(fechaISO ?? '').slice(0, 10);
  if (fecha === hoyISO) return 'hoy';
  const ayer = new Date(`${hoyISO}T12:00:00`);
  ayer.setDate(ayer.getDate() - 1);
  const p = (n) => String(n).padStart(2, '0');
  if (fecha === `${ayer.getFullYear()}-${p(ayer.getMonth() + 1)}-${p(ayer.getDate())}`) return 'ayer';
  return `el ${fechaLegible(fecha)}`;
}

const _teja = (iconoId, dom) =>
  `<span class="cat-teja atencion-hoy__icono" data-dom="${dom}" aria-hidden="true">${icon(iconoId)}</span>`;

/**
 * Gastos en "Otros" sin nombre: la fila abre el más reciente para completarlo.
 * Al guardarlo sale de la lista y, si hay otro, la fila pasa a ese.
 */
function _htmlSinNombre(p, hoyISO) {
  const n = p.gastos.length;
  const primero = p.gastos[0];
  const titulo = n === 1
    ? 'Un gasto en Otros no dice en qué fue'
    : `${n} gastos en Otros no dicen en qué fueron`;
  const detalle = n === 1
    ? `${_m(Number(primero.monto) || 0)} · ${_cuando(primero.fecha, hoyISO)}`
    : `Suman ${_m(p.total)} · el último, ${_cuando(primero.fecha, hoyISO)}`;
  const largo = n === 1 ? 'Completar el gasto en Otros' : 'Completar el gasto más reciente en Otros';
  return `
        <li class="atencion-hoy__fila">
          <button type="button" class="atencion-hoy__accion atencion-hoy__control" data-action="editar-gasto"
                  data-id="${esc(primero.id)}" aria-label="${largo}" aria-describedby="por-completar-frase-0">
            ${_teja('gastos', 'gastos')}
            <span class="atencion-hoy__textos" id="por-completar-frase-0">
              <span class="atencion-hoy__frase">${esc(titulo)}</span>
              <span class="atencion-hoy__detalle">${esc(detalle)}</span>
            </span>
            <span class="atencion-hoy__verbo" aria-hidden="true">Completar${icon('chevron-right', 'icon icon--sm')}</span>
          </button>
        </li>`;
}

/**
 * La pregunta de SUS.2c, con sus dos respuestas a la vista: contestar desde
 * Inicio es un toque, igual que en Gastos.
 */
function _htmlPregunta(p) {
  const boton = (respuesta, texto) => `
              <button type="button" class="btn btn-secondary atencion-hoy__respuesta" data-action="gastos-gusto-o-necesidad"
                      data-concepto="${esc(p.concepto)}" data-etiqueta="${esc(p.etiqueta)}" data-respuesta="${respuesta}">${texto}</button>`;
  const veces = `${p.veces} ${p.veces === 1 ? 'vez' : 'veces'}`;
  return `
        <li class="atencion-hoy__fila atencion-hoy__fila--pregunta" role="group" aria-labelledby="por-completar-pregunta">
          <div class="atencion-hoy__destacado">
            ${_teja('gastos', 'gastos')}
            <div class="atencion-hoy__textos">
              <p class="atencion-hoy__frase" id="por-completar-pregunta">${esc(p.etiqueta)}: ¿es un gusto o algo que necesitas?</p>
              <p class="atencion-hoy__detalle">Va ${veces} este mes y suma ${esc(_m(p.total))}</p>
            </div>
          </div>
          <div class="atencion-hoy__respuestas">${boton('gusto', 'Es un gusto')}${boton('necesidad', 'Lo necesito')}
          </div>
        </li>`;
}

/**
 * HTML del bloque. Puro respecto al estado (salvo el ojo, que lee `S.config`
 * como el resto de Inicio).
 *
 * @param {ReturnType<typeof pendientesPorCompletar>} pendientes
 * @param {string} hoyISO
 * @returns {string}
 */
export function htmlPorCompletar(pendientes, hoyISO) {
  const filas = pendientes.map(p => (p.tipo === 'gastos-sin-nombre' ? _htmlSinNombre(p, hoyISO) : _htmlPregunta(p))).join('');
  return `
    <div class="atencion-hoy__cabeza">
      <h2 class="atencion-hoy__titulo" id="por-completar-titulo">${icon('check-circle', 'icon atencion-hoy__titulo-icono')}Por completar</h2>
    </div>
    <ul class="atencion-hoy__lista" role="list">${filas}</ul>`;
}

/** Lo que hay por completar hoy, con las mismas opciones que usa Gastos. */
export function pendientesDeHoy(state, hoyISO) {
  return pendientesPorCompletar({
    gastos: state.gastos ?? [],
    hoyISO,
    opcionesHormiga: {
      tope: topeHormiga(state.config),
      personalizadas: state.categoriasPersonalizadas ?? [],
      aprendidos: aprendidosDe(state.config),
    },
  });
}

/** Pinta `#panel-por-completar`. No-op si el contenedor no existe. */
export function renderPorCompletar() {
  const el = document.getElementById('panel-por-completar');
  if (!el) return;
  const hoyISO = hoy();
  const pendientes = pendientesDeHoy(S, hoyISO);
  if (pendientes.length === 0) {
    el.innerHTML = '';
    el.hidden = true;
    return;
  }
  el.hidden = false;
  el.innerHTML = htmlPorCompletar(pendientes, hoyISO);
}

/** Identidad estable para el coalescer de renders (PERF.6). */
function _render() {
  renderPorCompletar();
}

/** Se llama una vez desde bootstrap.js. */
export function initPorCompletar() {
  registrarRender(_render);
  EventBus.on('state:change', () => programarRender(_render));
}

/**
 * detalle-fila.js - la hoja de detalle de una fila de lista (móvil).
 *
 * ADR 098 D4 (hallazgo N4 de la auditoría móvil): a 390px cada fila de Gastos
 * medía 128px porque los tres botones de acción (repetir, editar, eliminar)
 * bajaban a una segunda línea. Con ocho gastos, la primera pantalla mostraba
 * uno y medio. En móvil la fila pasa a ser una sola línea tocable y sus
 * acciones viven en una hoja que se abre al tocarla, con eliminar aparte.
 *
 * No hay acción nueva ni lógica nueva: la hoja copia los botones que la fila ya
 * trae (mismo `data-action`, mismo `data-id`) y los dispara con
 * `registrar-abrir`, el mismo puente que usa la hoja "Registrar": cierra la
 * hoja, libera el foco y recién ahí invoca la acción por su nombre. Así editar
 * o eliminar abren su propio modal sin apilar dos.
 *
 * La fila declara que tiene hoja con un botón `.list-item__detalle` (lo pinta
 * la vista). En escritorio ese botón no se ve y la fila sigue como siempre.
 *
 * ADR 109 (MV2.9): Mis cuentas usa la misma hoja. La tarjeta de cuenta no es
 * un `.list-item`, así que cada pieza se busca en las dos anatomías; lo que la
 * fila de una línea calla (chips de la cuenta, día de pago de la fuente) viaja
 * como notas.
 */

import { registrarAccion } from './actions.js';
import { abrirModal } from './modales.js';
import { esc } from '../infra/utils.js';

const ID_HOJA = 'modal-detalle-fila';

// ── PURAS ────────────────────────────────────────────────────────

/**
 * Texto del botón en la hoja a partir del nombre accesible del de la fila.
 * "Editar gasto: Mercado" → "Editar gasto"; "Repetir este gasto" queda igual.
 *
 * @param {string} etiqueta
 * @returns {string}
 */
export function textoAccion(etiqueta) {
  return String(etiqueta ?? '').split(':')[0].trim();
}

/**
 * Eliminar va aparte y con tono de peligro: separado de editar para que el
 * pulgar no lo encuentre por accidente (R53).
 *
 * @param {string} accion valor de `data-action`
 * @returns {boolean}
 */
export function esAccionPeligrosa(accion) {
  return /(^|-)eliminar(-|$)/.test(String(accion ?? ''));
}

/**
 * Arma el HTML de la hoja con lo que la fila ya muestra. Pura respecto al
 * estado: recibe datos planos, sin leer S.
 *
 * @param {{
 *   iconoHtml: string, titulo: string, subtitulo: string, monto: string,
 *   montoClase: string, cuando: string, notas?: string[],
 *   acciones: Array<{accion: string, id: string, etiqueta: string, iconoHref: string}>
 * }} d
 * @returns {string}
 */
export function htmlDetalleFila(d) {
  const boton = (a) => `
      <button type="button"
              class="btn ${esAccionPeligrosa(a.accion) ? 'btn-ghost detalle-fila__accion--peligro' : 'btn-secondary'} detalle-fila__accion"
              data-action="registrar-abrir" data-target-action="${esc(a.accion)}"
              data-id="${esc(a.id)}">
        ${a.iconoHref ? `<svg class="icon" aria-hidden="true"><use href="${esc(a.iconoHref)}"/></svg>` : ''}
        ${esc(textoAccion(a.etiqueta))}
      </button>`;

  const normales = d.acciones.filter(a => !esAccionPeligrosa(a.accion));
  const peligro  = d.acciones.filter(a => esAccionPeligrosa(a.accion));
  const notas    = (d.notas ?? []).filter(Boolean);

  return `
    <div class="detalle-fila__cabeza">
      <div class="detalle-fila__icono" aria-hidden="true">${d.iconoHtml}</div>
      <div class="detalle-fila__textos">
        ${d.cuando ? `<p class="detalle-fila__cuando">${esc(d.cuando)}</p>` : ''}
        <h2 class="detalle-fila__titulo" id="detalle-fila-titulo">${esc(d.titulo)}</h2>
        ${d.subtitulo ? `<p class="detalle-fila__sub">${esc(d.subtitulo)}</p>` : ''}
      </div>
    </div>
    <p class="detalle-fila__monto ${esc(d.montoClase)}">${esc(d.monto)}</p>
    ${notas.length ? `<ul class="detalle-fila__notas">${notas.map(n => `<li>${esc(n)}</li>`).join('')}</ul>` : ''}
    ${normales.length ? `<div class="detalle-fila__acciones">${normales.map(boton).join('')}</div>` : ''}
    ${peligro.length ? `<div class="detalle-fila__peligro">${peligro.map(boton).join('')}</div>` : ''}`;
}

// ── DOM ──────────────────────────────────────────────────────────

/**
 * Lee de la fila lo que la hoja necesita. El ícono se copia tal cual (es un
 * SVG del proyecto); el resto viaja como texto y se vuelve a escapar.
 *
 * Cada selector nombra la pieza en las dos anatomías: `.list-item` (Gastos,
 * Movimientos, fuentes de ingreso) y `.cuenta-card` (Mis cuentas, ADR 109).
 * Una fila trae solo una de las dos.
 *
 * @param {HTMLElement} fila `.list-item--detalle`
 */
export function datosDeFila(fila) {
  const limpio = (el) => el?.textContent.replace(/\s+/g, ' ').trim() ?? '';
  const txt = (sel) => limpio(fila.querySelector(sel));
  const monto = fila.querySelector('.list-item__amount, .list-item__value, .cuenta-card__saldo');
  const acciones = [...fila.querySelectorAll('.list-item__action [data-action], .cuenta-card__actions [data-action]')].map(b => ({
    accion: b.dataset.action,
    id: b.dataset.id ?? '',
    // Un botón con texto se copia con su texto; uno de solo ícono, con su
    // nombre accesible (ADR 109 D4).
    etiqueta: limpio(b) || b.getAttribute('aria-label') || '',
    iconoHref: b.querySelector('use')?.getAttribute('href') ?? '',
  }));
  const ingreso = monto?.matches('.list-item__amount--ingreso, .list-item__value--in') === true;
  return {
    iconoHtml: fila.querySelector('.list-item__icon, .cuenta-card__icon')?.innerHTML ?? '',
    titulo: txt('.list-item__title, .cuenta-card__nombre'),
    subtitulo: txt('.list-item__subtitle, .cuenta-card__tipo'),
    monto: limpio(monto),
    montoClase: ingreso ? 'detalle-fila__monto--ingreso' : '',
    cuando: fila.closest('.gastos-dia')?.querySelector('.gastos-dia__label')?.textContent.trim() ?? '',
    notas: [...fila.querySelectorAll('.list-item__hint, .cuenta-card__chips .chip__label')].map(limpio),
    acciones,
  };
}

function _abrir(el) {
  const fila = el.closest('.list-item--detalle');
  const hoja = document.getElementById(ID_HOJA);
  const cuerpo = document.getElementById('detalle-fila-body');
  if (!fila || !hoja || !cuerpo) return;
  cuerpo.innerHTML = htmlDetalleFila(datosDeFila(fila));
  abrirModal(hoja);
}

// ── INIT ─────────────────────────────────────────────────────────

/** Se llama una vez desde bootstrap.js. */
export function initDetalleFila() {
  registrarAccion('fila-detalle', _abrir);
}

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
 *   montoClase: string, cuando: string,
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
    ${normales.length ? `<div class="detalle-fila__acciones">${normales.map(boton).join('')}</div>` : ''}
    ${peligro.length ? `<div class="detalle-fila__peligro">${peligro.map(boton).join('')}</div>` : ''}`;
}

// ── DOM ──────────────────────────────────────────────────────────

/**
 * Lee de la fila lo que la hoja necesita. El ícono se copia tal cual (es un
 * SVG del proyecto); el resto viaja como texto y se vuelve a escapar.
 *
 * @param {HTMLElement} fila `.list-item`
 */
export function datosDeFila(fila) {
  const txt = (sel) => fila.querySelector(sel)?.textContent.replace(/\s+/g, ' ').trim() ?? '';
  const monto = fila.querySelector('.list-item__amount');
  const acciones = [...fila.querySelectorAll('.list-item__action [data-action]')].map(b => ({
    accion: b.dataset.action,
    id: b.dataset.id ?? '',
    etiqueta: b.getAttribute('aria-label') || b.textContent,
    iconoHref: b.querySelector('use')?.getAttribute('href') ?? '',
  }));
  return {
    iconoHtml: fila.querySelector('.list-item__icon')?.innerHTML ?? '',
    titulo: txt('.list-item__title'),
    subtitulo: txt('.list-item__subtitle'),
    monto: monto?.textContent.trim() ?? '',
    montoClase: monto?.classList.contains('list-item__amount--ingreso') ? 'detalle-fila__monto--ingreso' : '',
    cuando: fila.closest('.gastos-dia')?.querySelector('.gastos-dia__label')?.textContent.trim() ?? '',
    acciones,
  };
}

function _abrir(el) {
  const fila = el.closest('.list-item');
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

/**
 * calendario-finko.js - "Otra fecha" abre el calendario de Finko, no el
 * selector del sistema (ADR 142 D2: nunca `type="date"` en el teléfono).
 *
 * Un mes a la vez, semanas de lunes a domingo, días de 44 px como botones
 * reales, con el elegido y el de hoy marcados. Escribe la fecha ISO en el
 * mismo campo `name="fecha"` de siempre (oculto), así `validar*` y
 * `normalizar*` no cambian.
 *
 * - Pura: `semanasDelMes`.
 * - DOM: `htmlCalendario` y `montarCalendario`.
 */

import { hoy } from '../infra/utils.js';

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio',
  'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

const _DIAS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const _DIAS_LARGOS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];

const _dos = (n) => String(n).padStart(2, '0');

/**
 * Las semanas de un mes, de lunes a domingo, con `null` en los huecos. Pura.
 *
 * @param {number} anio
 * @param {number} mes0 Mes de 0 a 11.
 * @returns {(number|null)[][]}
 */
export function semanasDelMes(anio, mes0) {
  const primero = new Date(anio, mes0, 1).getDay(); // 0 = domingo
  const hueco = (primero + 6) % 7;                  // lunes primero
  const dias = new Date(anio, mes0 + 1, 0).getDate();
  const celdas = [...Array(hueco).fill(null), ...Array.from({ length: dias }, (_, i) => i + 1)];
  while (celdas.length % 7 !== 0) celdas.push(null);
  const semanas = [];
  for (let i = 0; i < celdas.length; i += 7) semanas.push(celdas.slice(i, i + 7));
  return semanas;
}

/**
 * El mes de `vista` con `valor` elegido.
 *
 * @param {{ vista: { anio: number, mes0: number }, valor: string }} estado
 * @returns {string}
 */
function _htmlMes({ vista, valor }) {
  const { anio, mes0 } = vista;
  const hoyIso = hoy();
  const filas = semanasDelMes(anio, mes0).map(semana => `
        <div class="calf__semana" role="row">${semana.map((d, i) => {
    if (d === null) return '<span class="calf__hueco" role="gridcell"></span>';
    const iso = `${anio}-${_dos(mes0 + 1)}-${_dos(d)}`;
    const clases = ['calf__dia'];
    if (iso === hoyIso) clases.push('calf__dia--hoy');
    const elegido = iso === valor;
    return `<span role="gridcell"><button type="button" class="${clases.join(' ')}" data-calf-dia="${iso}" aria-pressed="${elegido}" aria-label="${_DIAS_LARGOS[i]} ${d} de ${MONTHS[mes0].toLowerCase()}${iso === hoyIso ? ', hoy' : ''}">${d}</button></span>`;
  }).join('')}</div>`).join('');
  return `
      <div class="calf__cab">
        <button type="button" class="btn btn-icon btn-ghost" data-calf-mover="-1" aria-label="Mes anterior"><svg class="icon" aria-hidden="true"><use href="#i-arrow-left"/></svg></button>
        <p class="calf__mes" aria-live="polite">${MONTHS[mes0]} ${anio}</p>
        <button type="button" class="btn btn-icon btn-ghost" data-calf-mover="1" aria-label="Mes siguiente"><svg class="icon" aria-hidden="true"><use href="#i-arrow-right"/></svg></button>
      </div>
      <div class="calf__rejilla" role="grid" aria-label="${MONTHS[mes0]} ${anio}">
        <div class="calf__semana calf__semana--nombres" role="row">${_DIAS.map((d, i) => `<span class="calf__nombre" role="columnheader" aria-label="${_DIAS_LARGOS[i]}">${d}</span>`).join('')}</div>
        ${filas}
      </div>`;
}

/**
 * El contenedor vacío del calendario; `montarCalendario` lo llena.
 *
 * @param {{ id?: string }} [opciones]
 * @returns {string}
 */
export function htmlCalendario({ id = '' } = {}) {
  return `<div class="calf"${id ? ` id="${id}"` : ''} data-calendario-finko></div>`;
}

/**
 * Pinta el mes de `valor` (o el de hoy) y atiende las flechas y los días.
 * Devuelve una función para mostrar otra fecha desde afuera.
 *
 * @param {HTMLElement} raiz `[data-calendario-finko]`
 * @param {{ valor?: string, alElegir: (iso: string) => void }} opciones
 * @returns {(iso: string) => void}
 */
export function montarCalendario(raiz, { valor = '', alElegir }) {
  if (!raiz) return () => {};
  const base = /^\d{4}-\d{2}-\d{2}$/.test(valor) ? valor : hoy();
  const estado = {
    valor,
    vista: { anio: Number(base.slice(0, 4)), mes0: Number(base.slice(5, 7)) - 1 },
  };
  const pintar = () => { raiz.innerHTML = _htmlMes(estado); };

  raiz.addEventListener('click', (e) => {
    const mover = e.target.closest('[data-calf-mover]');
    if (mover) {
      const d = new Date(estado.vista.anio, estado.vista.mes0 + Number(mover.dataset.calfMover), 1);
      estado.vista = { anio: d.getFullYear(), mes0: d.getMonth() };
      pintar();
      raiz.querySelector(`[data-calf-mover="${mover.dataset.calfMover}"]`)?.focus();
      return;
    }
    const dia = e.target.closest('[data-calf-dia]');
    if (dia) {
      estado.valor = dia.dataset.calfDia;
      pintar();
      alElegir(estado.valor);
    }
  });
  pintar();

  return (iso) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return;
    estado.valor = iso;
    estado.vista = { anio: Number(iso.slice(0, 4)), mes0: Number(iso.slice(5, 7)) - 1 };
    pintar();
  };
}

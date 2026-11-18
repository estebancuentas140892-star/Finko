/**
 * metas/detalle.js - la fila de una meta en el teléfono y su hoja (ADR 133 D5).
 *
 * El tablero "rediseño2" lleva cada meta a una fila compacta: su silueta (que
 * se llena con lo reunido), lo reunido de su objetivo, la fecha, la barra y
 * cuántos aportes faltan; a la derecha un círculo "+" que abre el aporte.
 * Tocar la fila abre esta hoja con lo que la tarjeta del arco decía: la
 * silueta grande, lo reunido y el porcentaje, la fecha, el plan y lo que
 * falta, "Aportar", "Editar" y "Eliminar". Desde 1024px sigue la tarjeta
 * (DIS.14).
 *
 * También viven acá la forma de la silueta y el ícono de una meta, que la
 * tarjeta de `view.js` comparte (antes eran privados de esa vista).
 *
 * Las acciones de la hoja viajan por `registrar-abrir`: cierra la hoja y
 * recién ahí abre el aporte, el formulario o la confirmación.
 *
 * Puede leer S. No puede mutarlo.
 */

import { S } from '../../core/state.js';
import { f, fechaLegible, hoy, esc as _esc } from '../../infra/utils.js';
import { iconoCategoria } from '../../infra/icons.js';
import { siluetaMeta } from '../../infra/svg.js';
import { diasHastaFecha } from '../../infra/bolsas.js';
import { SALDO_MASCARA_CUENTA } from '../../infra/render.js';
import { CATEGORIA_META_ICONO, CATEGORIA_META_SILUETA } from '../../core/constants.js';
import { calcularProgreso, calcularAhorroPorPeriodo, frecuenciaPrincipalIngresos } from './logic.js';
import { montosOcultos } from '../../infra/privacidad.js';

const _icono = (id) => `<svg class="icon" aria-hidden="true"><use href="#${id}"/></svg>`;

/**
 * Forma de la silueta de una meta, o `null` si le toca conservar su ícono:
 * sin categoría, o 'Otra' con un ícono elegido a mano (DIS.14).
 * @param {import('../../core/state.js').Meta} meta
 * @returns {string|null} clave de `SILUETAS`.
 */
export function formaSilueta(meta) {
  if (!meta?.categoria) return null;
  if (meta.categoria === 'Otra' && meta.icono) return null;
  return CATEGORIA_META_SILUETA[meta.categoria] ?? null;
}

/**
 * Ícono de una meta (ID.3, CAT.2b): con categoría predefinida, el glifo del
 * sprite; con 'Otra' o sin categoría, lo que haya en `meta.icono` (un id del
 * sprite o un emoji heredado); sin nada, la caja c-otros o la diana i-metas.
 *
 * @param {import('../../core/state.js').Meta} meta
 * @param {string} [cls='icon icon--sm'] clase del `<svg>` del sprite.
 * @returns {string}
 */
export function iconoMeta(meta, cls = 'icon icon--sm') {
  if (meta.categoria && meta.categoria !== 'Otra') {
    const simbolo = CATEGORIA_META_ICONO[meta.categoria];
    if (simbolo) return iconoCategoria(simbolo, cls);
  }
  if (meta.icono) {
    return /^[a-z]-/.test(meta.icono)
      ? iconoCategoria(meta.icono, cls)
      : _esc(meta.icono);
  }
  return iconoCategoria(meta.categoria === 'Otra' ? 'c-otros' : 'i-metas', cls);
}

/**
 * La figura de la teja: la silueta llena con lo reunido, o el ícono. La clave
 * del `clipPath` lleva un prefijo propio: la tarjeta de escritorio usa el id
 * a secas y dos siluetas con la misma clave se recortan con la figura
 * equivocada.
 */
function _figura(meta, porcentaje, prefijo) {
  const forma = formaSilueta(meta);
  return forma
    ? siluetaMeta(porcentaje, { forma, clave: `${prefijo}-${meta.id}`, decorativa: true })
    : iconoMeta(meta, 'icon');
}

/**
 * El plan dicho en una línea: "Faltan 2 aportes de $945.000, uno al mes",
 * "Falta 1 aporte de $300.000" o, en cero, "Tu primer aporte arranca el
 * camino: $700.000".
 */
export function planMeta(ahorro, enCero, m) {
  if (!ahorro) return '';
  const monto = m(ahorro.montoPorPeriodo);
  if (enCero) return `Tu primer aporte arranca el camino: ${monto}`;
  return ahorro.numPeriodos === 1
    ? `Falta 1 aporte de ${monto}`
    : `Faltan ${ahorro.numPeriodos} aportes de ${monto}, uno ${_esc(ahorro.etiqueta)}`;
}

/**
 * La fila de una meta en el teléfono. La fila entera abre su hoja
 * (`meta-detalle`); el círculo de la derecha aporta. Una meta cumplida no
 * tiene círculo.
 *
 * @param {import('../../core/state.js').Meta} meta
 * @param {string} frecuencia frecuencia de ingresos (MT.4).
 * @param {boolean} oculto `S.config.ocultarSaldo` (R20).
 * @returns {string}
 */
export function htmlFilaMeta(meta, frecuencia, oculto) {
  const id     = _esc(meta.id);
  const nombre = _esc(meta.nombre ?? 'Meta');
  const m      = (n) => (oculto ? SALDO_MASCARA_CUENTA : f(n));
  const { porcentaje, faltante, completada } = calcularProgreso(meta);
  const cumplida  = meta.completada === true || completada;
  const acumulado = Number(meta.montoActual) || 0;
  const objetivo  = Number(meta.montoObjetivo) || 0;

  let dato;
  let pie = '';
  if (cumplida) {
    dato = `<span class="meta-linea__cumplida">Cumplida</span> · ${m(acumulado)}${meta.fechaLimite ? ` · meta del ${fechaLegible(meta.fechaLimite)}` : ''}`;
  } else {
    dato = `<strong>${m(acumulado)}</strong> de ${m(objetivo)} · ${meta.fechaLimite ? fechaLegible(meta.fechaLimite) : 'sin fecha'}`;
    const ahorro = calcularAhorroPorPeriodo(meta, frecuencia);
    pie = `<p class="meta-linea__plan">${ahorro ? planMeta(ahorro, acumulado <= 0, m) : `Te faltan ${m(faltante)}`}</p>`;
  }

  const circulo = cumplida ? '' : `
      <button type="button" class="bolsa-circulo bolsa-circulo--metas" data-action="abonar-meta" data-id="${id}"
              aria-label="Aportar a ${nombre}">${_icono('i-plus')}</button>`;

  return `
    <article class="meta-linea list-item--detalle${cumplida ? ' meta-linea--cumplida' : ''}" data-id="${id}" data-dom="metas">
      <button type="button" class="list-item__detalle" data-action="meta-detalle" data-id="${id}"
              aria-label="Ver detalle: ${nombre}"></button>
      <span class="meta-linea__teja" aria-hidden="true">${_figura(meta, cumplida ? 100 : porcentaje, 'fila')}</span>
      <div class="meta-linea__info">
        <p class="meta-linea__nombre">${nombre}</p>
        <p class="meta-linea__dato">${dato}</p>
        ${cumplida ? '' : `<span class="meta-linea__barra" aria-hidden="true"><span style="width:${porcentaje}%"></span></span>`}
        ${pie}
      </div>${circulo}
    </article>`;
}

/**
 * HTML de la hoja de una meta. El título lleva el id que nombra a la hoja
 * (`#modal-detalle-fila`, `aria-labelledby`).
 *
 * @param {import('../../core/state.js').Meta} meta
 * @returns {string}
 */
export function htmlDetalleMeta(meta) {
  const oculto = montosOcultos('metas');
  const m      = (n) => (oculto ? SALDO_MASCARA_CUENTA : f(n));
  const id     = _esc(meta.id);
  const nombre = _esc(meta.nombre ?? 'Meta');
  const { porcentaje, faltante, completada } = calcularProgreso(meta);
  const cumplida  = meta.completada === true || completada;
  const acumulado = Number(meta.montoActual) || 0;
  const ahorro    = cumplida ? null : calcularAhorroPorPeriodo(meta, frecuenciaPrincipalIngresos(S.ingresos));
  const dias      = diasHastaFecha(meta.fechaLimite, hoy());

  const sub = ['Meta', meta.categoria && meta.categoria !== 'Otra' ? _esc(meta.categoria) : ''].filter(Boolean).join(' · ');
  const fecha = !meta.fechaLimite
    ? 'Sin fecha'
    : dias === null || dias < 0 ? fechaLegible(meta.fechaLimite)
      : dias === 0 ? `${fechaLegible(meta.fechaLimite)} · hoy`
        : `${fechaLegible(meta.fechaLimite)} · en ${dias} ${dias === 1 ? 'día' : 'días'}`;
  const datos = (cumplida
    ? [['Fecha de la meta', fecha], ['Reuniste', m(acumulado)]]
    : [
      ['Fecha de la meta', fecha],
      ['Para llegar', ahorro
        ? (ahorro.numPeriodos === 1 ? `1 aporte de ${m(ahorro.montoPorPeriodo)}` : `${ahorro.numPeriodos} aportes de ${m(ahorro.montoPorPeriodo)}, uno ${_esc(ahorro.etiqueta)}`)
        : 'Ponle fecha y Finko calcula cuánto guardar'],
      ['Te faltan', m(faltante)],
    ]).map(([k, v]) => `
      <div class="detalle-gasto__dato"><dt>${k}</dt><dd>${v}</dd></div>`).join('');

  const boton = (accion, etiqueta, clase) => `
        <button type="button" class="${clase} detalle-fila__accion" data-dom="metas"
                data-action="registrar-abrir" data-target-action="${accion}" data-id="${id}">${etiqueta}</button>`;
  const aportar = cumplida ? '' : boton('abonar-meta',
    `${_icono('i-plus')}${ahorro && !oculto ? `Aportar ${f(ahorro.montoPorPeriodo)}` : 'Aportar'}`, 'btn-dominio btn-dominio--bloque');

  return `
    <div class="detalle-fila__cabeza">
      <div class="detalle-fila__icono meta-linea__teja" aria-hidden="true">${iconoMeta(meta, 'icon')}</div>
      <div class="detalle-fila__textos">
        <h2 class="detalle-fila__titulo" id="detalle-fila-titulo">${nombre}</h2>
        <p class="detalle-fila__sub">${sub}</p>
      </div>
    </div>
    <div class="detalle-meta__cifra">
      <span class="detalle-meta__silueta" aria-hidden="true">${_figura(meta, cumplida ? 100 : porcentaje, 'hoja')}</span>
      <div>
        <p class="detalle-fila__monto">${m(acumulado)}</p>
        <p class="detalle-meta__de">${cumplida ? 'Meta cumplida' : `de ${m(Number(meta.montoObjetivo) || 0)} · <strong>${porcentaje}%</strong>`}</p>
      </div>
    </div>
    <span class="meta-linea__barra detalle-meta__barra" aria-hidden="true"><span style="width:${cumplida ? 100 : porcentaje}%"></span></span>
    <dl class="detalle-gasto__datos">${datos}
    </dl>
    <div class="detalle-fila__acciones detalle-compromiso__acciones">${aportar}${boton('editar-meta', `${_icono('i-edit')}Editar la meta`, 'btn btn-secondary')}
    </div>
    <div class="detalle-fila__peligro">${boton('eliminar-meta', `${_icono('i-trash')}Eliminar esta meta`, 'btn btn-ghost detalle-fila__accion--peligro')}
      <p class="detalle-gasto__al-borrar">Te pediremos confirmar.</p>
    </div>`;
}

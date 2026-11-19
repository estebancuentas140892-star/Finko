/**
 * apartados/detalle.js - la hoja de una reserva y su fila en el teléfono
 * (ADR 133 D4).
 *
 * El tablero "rediseño2" lleva cada reserva a una fila compacta: su emoji, lo
 * reunido de lo que necesita, la fecha, la barra con la rayita de dónde
 * deberías ir hoy y, si va atrás, cuántos aportes; a la derecha un círculo
 * "+" que abre "Aportar" (o un visto si ya está lista). Tocar la fila abre esta
 * hoja con lo que la tarjeta grande decía: cuánto reponer, cuándo vence, el
 * plan y lo que falta, la recurrencia como interruptor y las acciones de
 * siempre. Desde 1024px sigue la tarjeta (DIS.15).
 *
 * Las acciones viajan por `registrar-abrir`: cierra la hoja y recién ahí abre
 * el aporte, el formulario o la confirmación, con el mismo `data-id`. El
 * interruptor de la recurrencia actúa sin cerrar la hoja.
 *
 * Puede leer S. No puede mutarlo.
 */

import { f, fechaLegible, hoy, esc as _esc } from '../../infra/utils.js';
import { iconoCategoria } from '../../infra/icons.js';
import { SALDO_MASCARA_CUENTA } from '../../infra/render.js';
import { estadoDeBolsa } from '../../infra/bolsas.js';
import {
  estaListoParaReiniciar,
  calcularProgreso,
  calcularAporteSugerido,
  planDeReferencia,
  etiquetaPeriodoMeses,
  PERIODO_RECURRENCIA_DEFAULT,
  ICONO_APARTADO_DEFAULT,
} from './logic.js';
import { montosOcultos } from '../../infra/privacidad.js';
import { lugarGuardado } from '../../infra/guardado-en.js';
import { S } from '../../core/state.js';

/** Hasta cuántos días la fecha dice además "en N días" (dos veces el umbral de 30). */
const DIAS_CON_CUENTA = 60;

const _icono = (id) => `<svg class="icon" aria-hidden="true"><use href="#${id}"/></svg>`;

/** El emoji o el símbolo de la reserva (mismo criterio que la tarjeta). */
export function glifoApartado(apartado) {
  const valor = apartado.icono ?? ICONO_APARTADO_DEFAULT;
  return /^[a-z]-/.test(valor) ? iconoCategoria(valor) : _esc(valor);
}

/**
 * La fecha como la dice la fila: "10 de dic, en 27 días", "vence hoy",
 * "venció hace 3 días", o solo la fecha cuando falta mucho.
 *
 * @param {string|null} fechaISO
 * @param {number|null} dias
 * @returns {string}
 */
export function cuandoReserva(fechaISO, dias) {
  if (!fechaISO || dias === null) return 'sin fecha';
  if (dias === 0) return `${fechaLegible(fechaISO)}, vence hoy`;
  if (dias < 0) return `${fechaLegible(fechaISO)}, venció hace ${Math.abs(dias)} ${dias === -1 ? 'día' : 'días'}`;
  if (dias <= DIAS_CON_CUENTA) return `${fechaLegible(fechaISO)}, en ${dias} ${dias === 1 ? 'día' : 'días'}`;
  return fechaLegible(fechaISO);
}

/**
 * Si va atrás o adelante del plan, en aportes enteros: la misma regla del
 * veredicto de la tarjeta (calla por debajo de un aporte de diferencia).
 *
 * @param {ReturnType<typeof planDeReferencia>} plan
 * @returns {{ texto: string, tono: 'warning'|'ok' } | null}
 */
export function ritmoReserva(plan) {
  if (!plan) return null;
  const n = Math.abs(plan.delta);
  const cuantos = n === 1 ? 'un aporte' : `${n} aportes`;
  if (plan.delta <= -1) return { texto: `Vas ${cuantos} atrás`, tono: 'warning' };
  if (plan.delta >= 1) return { texto: `Vas ${cuantos} adelante`, tono: 'ok' };
  return null;
}

/** La barra con la rayita de dónde deberías ir hoy (`planPct`). */
function _barra(pct, planPct, clase) {
  const rayita = planPct === null || planPct >= 100 ? '' : `<i style="left:${planPct}%"></i>`;
  return `<span class="${clase}" aria-hidden="true"><span style="width:${pct}%"></span>${rayita}</span>`;
}

/**
 * La fila de una reserva en el teléfono. La fila entera abre su hoja
 * (`reserva-detalle`); el círculo de la derecha aporta, o la marca como usada
 * si ya está lista.
 *
 * @param {import('../../core/state.js').Apartado} apartado
 * @param {boolean} oculto `S.config.ocultarSaldo` (R20).
 * @returns {string}
 */
export function htmlFilaReserva(apartado, oculto) {
  const hoyISO = hoy();
  const id     = _esc(apartado.id);
  const nombre = _esc(apartado.nombre ?? 'Reserva');
  const m      = (n) => (oculto ? SALDO_MASCARA_CUENTA : f(n));
  const acumulado = Number(apartado.montoActual) || 0;
  const objetivo  = Number(apartado.montoObjetivo) || 0;
  const listo  = estaListoParaReiniciar(apartado);
  const { pct, planPct, dias } = estadoDeBolsa(apartado, hoyISO);

  let dato;
  let estado = '';
  let boton;
  if (listo) {
    dato = `<span class="reserva-fila__lista">Lista</span> · ${m(acumulado)}${apartado.fechaObjetivo ? ` · ${fechaLegible(apartado.fechaObjetivo)}` : ''}`;
    boton = `
      <button type="button" class="bolsa-circulo bolsa-circulo--hecho" data-action="reiniciar-apartado" data-id="${id}"
              aria-label="Ya usé ${nombre}">${_icono('i-check')}</button>`;
  } else {
    const repite = apartado.recurrente
      ? ` · ${_esc(etiquetaPeriodoMeses(apartado.periodoMeses ?? PERIODO_RECURRENCIA_DEFAULT))}`
      : '';
    dato = `<strong>${m(acumulado)}</strong> de ${m(objetivo)} · ${cuandoReserva(apartado.fechaObjetivo, dias)}${repite}`;
    const ritmo = ritmoReserva(planDeReferencia(apartado, hoyISO));
    if (ritmo) estado = `<p class="reserva-fila__estado reserva-fila__estado--${ritmo.tono}">${ritmo.texto}</p>`;
    const sugerido = calcularAporteSugerido(apartado, hoyISO);
    const cuanto = sugerido?.aportePorPeriodo > 0 && !oculto ? f(sugerido.aportePorPeriodo) : 'dinero';
    boton = `
      <button type="button" class="bolsa-circulo" data-action="aportar-apartado" data-id="${id}"
              aria-label="Aportar ${cuanto} a ${nombre}">${_icono('i-plus')}</button>`;
  }

  return `
    <article class="reserva-fila list-item--detalle" data-id="${id}" data-dom="ahorro">
      <button type="button" class="list-item__detalle" data-action="reserva-detalle" data-id="${id}"
              aria-label="Ver detalle: ${nombre}"></button>
      <span class="reserva-fila__glifo" aria-hidden="true">${glifoApartado(apartado)}</span>
      <div class="reserva-fila__info">
        <p class="reserva-fila__nombre">${nombre}</p>
        <p class="reserva-fila__dato">${dato}</p>
        ${listo ? '' : _barra(pct, planPct, 'reserva-fila__barra')}
        ${estado}
      </div>${boton}
    </article>`;
}

/**
 * HTML de la hoja de una reserva. El título lleva el id que nombra a la hoja
 * (`#modal-detalle-fila`, `aria-labelledby`).
 *
 * @param {import('../../core/state.js').Apartado} apartado
 * @returns {string}
 */
export function htmlDetalleApartado(apartado) {
  const hoyISO = hoy();
  const oculto = montosOcultos('apartados');
  const m      = (n) => (oculto ? SALDO_MASCARA_CUENTA : f(n));
  const id     = _esc(apartado.id);
  const nombre = _esc(apartado.nombre ?? 'Reserva');
  const acumulado = Number(apartado.montoActual) || 0;
  const objetivo  = Number(apartado.montoObjetivo) || 0;
  const listo  = estaListoParaReiniciar(apartado);
  const { faltante, completado } = calcularProgreso(apartado);
  const { pct, planPct, dias } = estadoDeBolsa(apartado, hoyISO);
  const plan     = planDeReferencia(apartado, hoyISO);
  const sugerido = listo ? null : calcularAporteSugerido(apartado, hoyISO);

  const leyenda = `
    <p class="detalle-reserva__leyenda">
      <span><i class="detalle-reserva__punto" aria-hidden="true"></i>Reunido: ${pct}%</span>
      ${planPct !== null && !listo ? `<span><i class="detalle-reserva__raya" aria-hidden="true"></i>Deberías ir en ${planPct}% hoy</span>` : ''}
    </p>`;

  let veredicto = '';
  if (listo) {
    veredicto = `<p class="detalle-reserva__veredicto">Ya la reuniste. Cuando pagues, márcala como usada y arranca el ciclo siguiente.</p>`;
  } else if (plan && plan.delta <= -1) {
    const n = Math.abs(plan.delta);
    veredicto = `<p class="detalle-reserva__veredicto detalle-reserva__veredicto--warning">Vas ${n === 1 ? 'un aporte' : `${n} aportes`} atrás. Repón ${m(plan.cuotaPrevista * n)} y quedas al día.</p>`;
  } else if (plan && plan.delta >= 1) {
    const n = plan.delta;
    veredicto = `<p class="detalle-reserva__veredicto detalle-reserva__veredicto--ok">Vas ${n === 1 ? 'un aporte' : `${n} aportes`} adelante.</p>`;
  }

  const vence = !apartado.fechaObjetivo
    ? 'Sin fecha'
    : dias === null ? fechaLegible(apartado.fechaObjetivo)
      : dias === 0 ? `${fechaLegible(apartado.fechaObjetivo)} · hoy`
        : dias < 0 ? `${fechaLegible(apartado.fechaObjetivo)} · hace ${Math.abs(dias)} ${dias === -1 ? 'día' : 'días'}`
          : `${fechaLegible(apartado.fechaObjetivo)} · en ${dias} ${dias === 1 ? 'día' : 'días'}`;
  const datos = [
    ['Vence', vence],
    sugerido && ['Tu plan', `${sugerido.numPeriodos} ${sugerido.numPeriodos === 1 ? 'aporte' : 'aportes'} de ${m(sugerido.aportePorPeriodo)} ${_esc(sugerido.etiquetaPeriodo)}`],
    !apartado.fechaObjetivo && ['Tu plan', 'Ponle fecha y Finko calcula cuánto separar en cada aporte'],
    ['Te faltan', m(faltante)],
    // AH.9 (ADR 174 D3): "Guardado en Nequi, bolsillo SOAT".
    lugarGuardado(apartado.guardadoEn, S.cuentas) && ['Guardado en', _esc(lugarGuardado(apartado.guardadoEn, S.cuentas))],
  ].filter(Boolean).map(([k, v]) => `
      <div class="detalle-gasto__dato"><dt>${k}</dt><dd>${v}</dd></div>`).join('');

  const periodo = _esc(etiquetaPeriodoMeses(apartado.periodoMeses ?? PERIODO_RECURRENCIA_DEFAULT));
  const recurrente = apartado.recurrente === true;
  // Apagar la recurrencia de una reserva ya reunida pide confirmar (se va de
  // la lista): esa confirmación no se apila sobre la hoja, la cierra primero.
  const accionSwitch = recurrente && completado
    ? 'data-action="registrar-abrir" data-target-action="toggle-recurrente-apartado"'
    : 'data-action="toggle-recurrente-apartado"';
  const interruptor = `
    <label class="detalle-reserva__repite" for="reserva-repite-${id}">
      ${_icono('i-recurring')}
      <span class="detalle-reserva__repite-textos">
        <span class="detalle-reserva__repite-titulo">Se repite ${periodo}</span>
        <span class="detalle-reserva__repite-sub">Cuando la uses, vuelve a empezar sola</span>
      </span>
      <span class="toggle">
        <input id="reserva-repite-${id}" type="checkbox" role="switch"${recurrente ? ' checked' : ''}
               ${accionSwitch} data-id="${id}" />
        <span class="toggle__track" aria-hidden="true"></span>
      </span>
    </label>`;

  const boton = (accion, etiqueta, clase) => `
        <button type="button" class="${clase} detalle-fila__accion" data-dom="ahorro"
                data-action="registrar-abrir" data-target-action="${accion}" data-id="${id}">${etiqueta}</button>`;
  const principal = listo
    ? boton('reiniciar-apartado', `${_icono('i-check')}Ya la usé`, 'btn-dominio btn-dominio--bloque')
    : completado ? ''
      : boton('aportar-apartado', `${_icono('i-plus')}${sugerido?.aportePorPeriodo > 0 && !oculto ? `Aportar ${f(sugerido.aportePorPeriodo)}` : 'Aportar'}`, 'btn-dominio btn-dominio--bloque');

  return `
    <div class="detalle-fila__cabeza" data-reserva-id="${id}">
      <div class="detalle-fila__icono reserva-fila__glifo" aria-hidden="true">${glifoApartado(apartado)}</div>
      <div class="detalle-fila__textos">
        <h2 class="detalle-fila__titulo" id="detalle-fila-titulo">${nombre}</h2>
        <p class="detalle-fila__sub">Reserva</p>
      </div>
    </div>
    <div class="detalle-limite__cifra">
      <p class="detalle-fila__monto">${m(acumulado)}</p>
      <span class="detalle-limite__tope">de ${m(objetivo)}</span>
    </div>
    ${_barra(pct, listo ? null : planPct, 'detalle-reserva__barra')}
    ${leyenda}
    ${veredicto}
    <dl class="detalle-gasto__datos">${datos}
    </dl>
    ${interruptor}
    <div class="detalle-fila__acciones detalle-compromiso__acciones">${principal}${boton('editar-apartado', `${_icono('i-edit')}Editar la reserva`, 'btn btn-secondary')}
    </div>
    <div class="detalle-fila__peligro">${boton('eliminar-apartado', `${_icono('i-trash')}Eliminar esta reserva`, 'btn btn-ghost detalle-fila__accion--peligro')}
      <p class="detalle-gasto__al-borrar">Te pediremos confirmar.</p>
    </div>`;
}

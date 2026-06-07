/**
 * compromisos/views/estrategia-impacto.js - renderers de "Tu impacto" para cada estrategia.
 *
 * Sub-módulo de `estrategia.js`. Aloja los bloques de métricas concretas
 * de Avalancha y Bola de nieve, más la comparativa Avalancha vs BN y el
 * formateador de duración compartido.
 *
 * Funciones puras: reciben todo lo necesario por parámetro, no leen S.
 */

import { f, esc as _esc } from '../../../infra/utils.js';

/**
 * Avalancha enfoca el ahorro financiero. Sus métricas (en orden):
 *   1. Apuntás primero a            → info (azul, la deuda que esta estrategia prioriza)
 *   2. Total en intereses           → danger (rojo, el costo real que esta estrategia minimiza)
 *   + Comparativa vs Bola de nieve  → banner siempre visible (3 escenarios)
 *
 * Decisión v7.10: removida "Libre de deudas en" porque en la práctica suele
 * coincidir entre estrategias (el tiempo total depende más del saldo y cuotas
 * que de la estrategia), así que no aportaba valor comparativo. Reemplazada
 * por un mensaje comparativo siempre visible que comunica el ahorro real
 * (o explica por qué no hay ahorro y cómo conseguirlo).
 *
 * "Apuntás primero a" muestra la deuda prioritaria de la estrategia (la de
 * mayor tasa), no la que se cierra primero (que podría ser otra si tiene
 * cuota grande o saldo chico). Es lo que el usuario debe atacar con su
 * presupuesto extra para que esta estrategia funcione.
 */
export function renderImpactoAvalancha(resultado, extraMensual) {
  const activa = resultado.avalancha;

  // El array `orden` viene ya ordenado según la estrategia (mayor tasa primero
  // para Avalancha). orden[0] = la deuda PRIORITARIA. No es necesariamente
  // la que se cierra primero (eso depende de saldos/cuotas/intereses); es la
  // que el usuario debe atacar con todo el extra para que la estrategia opere.
  const target = activa.orden?.[0];
  const filaTarget = target
    ? `<li class="estrategia-card__metrica">
         <span class="estrategia-card__metrica-label">Apuntás primero a</span>
         <strong class="estrategia-card__metrica-valor estrategia-card__metrica-valor--info">
           ${_esc(target.descripcion)}
         </strong>
         <span class="estrategia-card__metrica-tip">la deuda que más intereses te genera</span>
       </li>`
    : '';

  return `
    <ul class="estrategia-card__metricas">
      ${filaTarget}
      <li class="estrategia-card__metrica">
        <span class="estrategia-card__metrica-label">Total que pagás en intereses</span>
        <strong class="estrategia-card__metrica-valor estrategia-card__metrica-valor--danger">${f(activa.interesesTotales)}</strong>
      </li>
    </ul>
    ${_renderComparativa(resultado, extraMensual)}`;
}

/**
 * Bola de nieve enfoca el progreso psicológico. Sus métricas (en orden):
 *   1. Apuntás primero a            → info (azul, la deuda que esta estrategia prioriza)
 *   2. Cerrás tu primera deuda en   → success (verde, su victoria temprana)
 *
 * Decisión v7.10: removida "Libre de deudas en" igual que en Avalancha
 * (suele coincidir entre estrategias y no aportaba valor comparativo).
 * Bola de nieve no incluye comparativa Avalancha-vs-BN: el ahorro financiero
 * es la métrica de Avalancha; aquí la victoria propia es "Cerrás tu primera
 * deuda en" (impulso psicológico, motivación temprana).
 *
 * "Apuntás primero a" muestra la deuda prioritaria de la estrategia (la de
 * menor saldo). Suele coincidir con la primera que se cierra, así que evitamos
 * repetir su nombre como tip en la fila siguiente para no duplicar la info.
 */
export function renderImpactoBolaNieve(resultado, deudas, extraMensual) {
  const activa = resultado.bolaNieve;

  // orden[0] = la deuda PRIORITARIA de la estrategia (menor saldo en Bola de
  // nieve). Es la que el usuario debe atacar con el extra para que esta
  // estrategia opere y genere el efecto bola.
  const target = activa.orden?.[0];
  const filaTarget = target
    ? `<li class="estrategia-card__metrica">
         <span class="estrategia-card__metrica-label">Apuntás primero a</span>
         <strong class="estrategia-card__metrica-valor estrategia-card__metrica-valor--info">
           ${_esc(target.descripcion)}
         </strong>
         <span class="estrategia-card__metrica-tip">la deuda más chica</span>
       </li>`
    : '';

  const cerradas = activa.orden
    .filter(o => Number.isFinite(o.mesPagado))
    .sort((a, b) => a.mesPagado - b.mesPagado);
  const primera = cerradas[0];

  // En Bola de nieve la primera que se cierra suele ser la priorizada: si
  // coinciden, omitimos el nombre como tip para no repetirlo en filas
  // contiguas. Solo lo mostramos cuando difieren (edge case con saldos o
  // cuotas raras donde otra deuda se apaga antes que la target).
  const mostrarTipPrimera = primera && primera.id !== target?.id;
  const filaPrimera = primera
    ? `<li class="estrategia-card__metrica">
         <span class="estrategia-card__metrica-label">Cerrás tu primera deuda en</span>
         <strong class="estrategia-card__metrica-valor estrategia-card__metrica-valor--success">
           ${formatearDuracion(primera.mesPagado)}
         </strong>
         ${mostrarTipPrimera ? `<span class="estrategia-card__metrica-tip">${_esc(primera.descripcion)}</span>` : ''}
       </li>`
    : '';

  void extraMensual; void deudas;

  return `
    <ul class="estrategia-card__metricas">
      ${filaTarget}
      ${filaPrimera}
    </ul>`;
}

/**
 * Renderiza el mensaje comparativo Avalancha vs Bola de nieve. Siempre devuelve
 * algo (los 3 escenarios están cubiertos), para que el usuario entienda el
 * impacto real de elegir Avalancha en su situación actual.
 *
 * Escenarios:
 *   1. Hay ahorro real (intereses o tiempo): banner verde con el monto y el
 *      tiempo ganado, si difiere.
 *   2. Empate con extra = 0: banner azul invitando a probar un pago extra
 *      mensual para que aparezca el ahorro (caso típico: deudas con tasa 0
 *      mezcladas que igualan ambas estrategias sin acelerador).
 *   3. Empate con extra > 0: banner azul explicando que ambas dan lo mismo
 *      en este caso y el usuario puede elegir por preferencia.
 *
 * Solo se invoca desde Avalancha (es la estrategia óptima en términos
 * financieros; Bola de nieve no tiene "ahorro" que mostrar respecto a sí misma).
 */
function _renderComparativa(resultado, extraMensual) {
  const { ahorroIntereses, ahorroMeses } = resultado;
  const hayAhorroIntereses = ahorroIntereses > 0.5;
  const hayAhorroTiempo    = ahorroMeses > 0;
  const hayAhorro          = hayAhorroIntereses || hayAhorroTiempo;

  if (hayAhorro) {
    const partes = [];
    if (hayAhorroIntereses) partes.push(`<strong>${f(ahorroIntereses)}</strong> en intereses`);
    if (hayAhorroTiempo)    partes.push(`<strong>${formatearDuracion(ahorroMeses)}</strong>`);
    const detalle = partes.join(' y ');
    return `
      <p class="estrategia-card__ahorro">
        💰 Con Avalancha te ahorrarías ${detalle} frente a Bola de nieve.
      </p>`;
  }

  if (extraMensual > 0) {
    return `
      <p class="estrategia-card__ahorro estrategia-card__ahorro--info">
        ℹ️ Con este pago extra, ambas estrategias terminan en el mismo costo. Podés elegir por preferencia: orden financiero (Avalancha) o impulso psicológico (Bola de nieve).
      </p>`;
  }

  return `
    <p class="estrategia-card__ahorro estrategia-card__ahorro--info">
      ℹ️ Con tus deudas actuales, Avalancha y Bola de nieve dan el mismo costo. Probá agregar un pago extra mensual abajo para ver dónde empieza a aparecer el ahorro con Avalancha.
    </p>`;
}

/**
 * Convierte una cantidad de meses a una etiqueta legible en español.
 * Hasta 11 meses: "X meses" (o "1 mes"). Desde 12: "X años Y meses" omitiendo
 * la parte que sea 0 y respetando singulares.
 * @param {number} meses
 * @returns {string}
 */
export function formatearDuracion(meses) {
  const m = Math.max(0, Math.round(Number(meses) || 0));
  if (m < 12) return `${m} ${m === 1 ? 'mes' : 'meses'}`;
  const anios = Math.floor(m / 12);
  const resto = m % 12;
  const aTxt  = `${anios} ${anios === 1 ? 'año' : 'años'}`;
  if (resto === 0) return aTxt;
  const mTxt = `${resto} ${resto === 1 ? 'mes' : 'meses'}`;
  return `${aTxt} ${mTxt}`;
}

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
import { simularRenegociacion, tasaMensualToEA } from '../logic.js';

/**
 * Avalancha enfoca el ahorro financiero. Sus métricas (en orden):
 *   1. Apuntas primero a            → info (azul, la deuda que esta estrategia prioriza)
 *   2. Total en intereses           → danger (rojo, el costo real que esta estrategia minimiza)
 *   + Comparativa vs Bola de nieve  → banner siempre visible (3 escenarios)
 *
 * Decisión v7.10: removida "Libre de deudas en" porque en la práctica suele
 * coincidir entre estrategias (el tiempo total depende más del saldo y cuotas
 * que de la estrategia), así que no aportaba valor comparativo. Reemplazada
 * por un mensaje comparativo siempre visible que comunica el ahorro real
 * (o explica por qué no hay ahorro y cómo conseguirlo).
 *
 * "Apuntas primero a" muestra la deuda prioritaria de la estrategia (la de
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
         <span class="estrategia-card__metrica-label">Apuntas primero a</span>
         <strong class="estrategia-card__metrica-valor estrategia-card__metrica-valor--info">
           ${_esc(target.descripcion)}
         </strong>
         <span class="estrategia-card__metrica-tip">la deuda que más intereses te genera</span>
       </li>`
    : '';

  // Con el pago actual el plan puede no completarse (la cuota no cubre los
  // intereses y la deuda crece): en ese caso `interesesTotales` no es un total
  // finito sino una acumulación divergente, así que no se muestra como cifra.
  const filaIntereses = activa.completo
    ? `<li class="estrategia-card__metrica">
         <span class="estrategia-card__metrica-label">Total que pagas en intereses</span>
         <strong class="estrategia-card__metrica-valor estrategia-card__metrica-valor--danger">${f(activa.interesesTotales)}</strong>
       </li>`
    : `<li class="estrategia-card__metrica">
         <span class="estrategia-card__metrica-label">Total que pagas en intereses</span>
         <strong class="estrategia-card__metrica-valor estrategia-card__metrica-valor--danger">No se termina de pagar</strong>
         <span class="estrategia-card__metrica-tip">con la cuota actual la deuda crece: los intereses no paran de sumar</span>
       </li>`;

  return `
    <ul class="estrategia-card__metricas">
      ${filaTarget}
      ${filaIntereses}
    </ul>
    ${_renderComparativa(resultado, extraMensual)}`;
}

/**
 * Bola de nieve enfoca el progreso psicológico. Sus métricas (en orden):
 *   1. Apuntas primero a            → info (azul, la deuda que esta estrategia prioriza)
 *   2. Cierras tu primera deuda en   → success (verde, su victoria temprana)
 *
 * Decisión v7.10: removida "Libre de deudas en" igual que en Avalancha
 * (suele coincidir entre estrategias y no aportaba valor comparativo).
 * Bola de nieve no incluye comparativa Avalancha-vs-BN: el ahorro financiero
 * es la métrica de Avalancha; aquí la victoria propia es "Cierras tu primera
 * deuda en" (impulso psicológico, motivación temprana).
 *
 * "Apuntas primero a" muestra la deuda prioritaria de la estrategia (la de
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
         <span class="estrategia-card__metrica-label">Apuntas primero a</span>
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
         <span class="estrategia-card__metrica-label">Cierras tu primera deuda en</span>
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
  // Comparar el costo de las dos estrategias solo tiene sentido si ambas cierran
  // el plan. Si alguna no se completa, sus intereses son divergentes y restarlos
  // daría cifras absurdas; el banner de diagnóstico ya explica la situación.
  if (!resultado.avalancha.completo || !resultado.bolaNieve.completo) return '';

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
        ℹ️ Con este pago extra, ambas estrategias terminan en el mismo costo. Puedes elegir por preferencia: orden financiero (Avalancha) o impulso psicológico (Bola de nieve).
      </p>`;
  }

  return `
    <p class="estrategia-card__ahorro estrategia-card__ahorro--info">
      ℹ️ Con tus deudas actuales, Avalancha y Bola de nieve dan el mismo costo. Prueba agregar un pago extra mensual en "¿Puedes pagar más rápido?" para ver dónde empieza a aparecer el ahorro con Avalancha.
    </p>`;
}

/**
 * Resumen de impacto del extra mensual, siempre visible entre el input de extra
 * y las cards de estrategia. Compara "sin extra" vs "con extra" usando la mejor
 * estrategia (avalancha). Si el extra es 0, muestra una invitación a probar.
 * Si el plan base es inviable, no muestra resumen (el diagnóstico lo cubre).
 *
 * @param {ReturnType<import('../logic.js').compararEstrategias>|null} sinExtra resultado con extra=0
 * @param {ReturnType<import('../logic.js').compararEstrategias>|null} conExtra resultado con el extra del usuario
 * @param {number} extraMensual
 */
export function renderResumenExtra(sinExtra, conExtra, extraMensual) {
  if (!extraMensual || extraMensual <= 0) {
    return `
      <div class="estrategia-card__resumen-extra" role="status">
        <p class="estrategia-card__bloque-body">
          Escribe un monto arriba y mira al instante cuánto tiempo y dinero te ahorras.
        </p>
      </div>`;
  }

  if (!sinExtra || !conExtra) return '';

  const base  = sinExtra.avalancha;
  const extra = conExtra.avalancha;

  // Si ni con el extra el plan se completa, no hay impacto que mostrar: el banner
  // de diagnóstico ("estas deudas no se terminan de pagar") lo cubre por separado.
  // (extra incompleto implica base incompleto: con menos dinero tampoco se cierra.)
  if (!extra.completo) return '';

  // El plan base (sin extra) no se completa pero el extra sí lo vuelve viable.
  // No se puede decir "terminas X antes / ahorras $Y": la base es divergente (la
  // cuota no cubre los intereses, así que no hay un "antes" real ni un total de
  // intereses finito que comparar; restarlo daría cifras absurdas). Se comunica
  // el valor real del extra: vuelve pagable una deuda que sola no se terminaba.
  if (!base.completo) {
    return `
      <div class="estrategia-card__resumen-extra estrategia-card__resumen-extra--activo" role="status">
        <p class="estrategia-card__bloque-titulo">🎯 Impacto de tu pago extra</p>
        <p class="estrategia-card__bloque-body">
          Sin este pago extra, tus cuotas no alcanzan a cubrir los intereses y la deuda no se termina de pagar. Con <strong>${f(extraMensual)}/mes adicional</strong> sí logras saldarla en <strong>${formatearDuracion(extra.meses)}</strong>.
        </p>
      </div>`;
  }

  const mesesMenos     = Math.max(0, base.meses - extra.meses);
  const interesesMenos = Math.max(0, base.interesesTotales - extra.interesesTotales);

  if (mesesMenos <= 0 && interesesMenos <= 0) {
    return `
      <div class="estrategia-card__resumen-extra" role="status">
        <p class="estrategia-card__bloque-body">
          Con ${f(extraMensual)}/mes extra, el plan no cambia significativamente.
          Prueba con un monto mayor.
        </p>
      </div>`;
  }

  const partes = [];
  if (mesesMenos > 0)     partes.push(`<strong>${formatearDuracion(mesesMenos)} menos</strong>`);
  if (interesesMenos > 0) partes.push(`<strong>${f(interesesMenos)} menos en intereses</strong>`);

  return `
    <div class="estrategia-card__resumen-extra estrategia-card__resumen-extra--activo" role="status">
      <p class="estrategia-card__bloque-titulo">🎯 Impacto de tu pago extra</p>
      <p class="estrategia-card__bloque-body">
        Con ${f(extraMensual)}/mes adicional terminas ${partes.join(' y ')}.
      </p>
    </div>`;
}

/**
 * Formatea un porcentaje legible: entero sin decimales, fraccionario con uno.
 * @param {number} pct
 */
function _fmtPct(pct) {
  const n = Number(pct) || 0;
  return `${Number.isInteger(n) ? String(n) : n.toFixed(1)}%`;
}

/**
 * Herramienta interactiva "Renegociar la tasa" (D.3a). Vive dentro del bloque
 * inviable de la card. Aplica a las deudas con tasa conocida > 0: el usuario
 * elige una, escribe la tasa que cree poder conseguir (en la unidad nativa de
 * la deuda) y ve el impacto en vivo. El botón "Aplicar" (que escribe sobre la
 * deuda) queda habilitado solo si la nueva tasa mejora el plan.
 *
 * Función de presentación pura: recibe el estado UI por parámetro, no lee S.
 *
 * @param {ReturnType<import('../logic.js').filtrarDeudasPagables>} deudas
 * @param {{ renegociarDeudaId: string|null, renegociarTasaPct: number }} ui
 * @returns {string}
 */
export function renderRenegociar(deudas, ui) {
  const candidatas = deudas.filter(d => d.tasaEA > 0);
  if (candidatas.length === 0) return '';

  const selId = candidatas.some(d => d.id === ui.renegociarDeudaId)
    ? ui.renegociarDeudaId
    : candidatas[0].id;
  const sel = candidatas.find(d => d.id === selId);

  const esEA   = sel.tasaUnidad !== 'mensual';
  const sufijo = esEA ? 'EA' : 'mensual';
  // Tasa actual mostrada en la unidad nativa de la deuda.
  const tasaActualPct = esEA
    ? sel.tasaEA * 100
    : (Math.pow(1 + sel.tasaEA, 1 / 12) - 1) * 100;

  const nuevaPct = Number(ui.renegociarTasaPct) || 0;
  const sim = nuevaPct > 0
    ? simularRenegociacion(sel, esEA ? nuevaPct / 100 : tasaMensualToEA(nuevaPct / 100))
    : null;
  const puedeAplicar = !!(sim && sim.mejora);

  const selectorHtml = candidatas.length > 1
    ? `<div class="form-group">
         <label for="renegociar-deuda" class="label">¿Qué deuda quieres renegociar?</label>
         <select id="renegociar-deuda" class="input" data-action="cambiar-renegociar-deuda">
           ${candidatas.map(d => `<option value="${d.id}"${d.id === selId ? ' selected' : ''}>${_esc(d.descripcion)}</option>`).join('')}
         </select>
       </div>`
    : `<p class="estrategia-card__bloque-body">Deuda: <strong>${_esc(sel.descripcion)}</strong></p>`;

  return `
    <div class="estrategia-card__remedio estrategia-card__remedio--renegociar">
      <p class="estrategia-card__bloque-titulo">🤝 Renegociar la tasa</p>
      <p class="estrategia-card__bloque-body">
        Si tu entidad te baja la tasa, cada cuota abona más a lo que debes y la deuda cierra antes.
      </p>
      ${selectorHtml}
      <p class="estrategia-card__bloque-body">
        Tasa actual: <strong>${_fmtPct(tasaActualPct)} ${sufijo}</strong>
      </p>
      <div class="form-group">
        <label for="renegociar-tasa" class="label">Nueva tasa (% ${sufijo})</label>
        <input id="renegociar-tasa" class="input" type="number"
               min="0" step="0.1" value="${nuevaPct || ''}"
               placeholder="Ej. ${esEA ? '24' : '2'}" autocomplete="off" inputmode="decimal"
               data-action="cambiar-renegociar-tasa" data-deuda="${selId}" data-unidad="${sufijo}" />
      </div>
      <div class="estrategia-card__renegociar-comparativa">
        ${renderComparativaRenegociacion(sim, nuevaPct, sufijo)}
      </div>
      <button type="button" class="btn btn--primary estrategia-card__renegociar-aplicar"
              data-action="aplicar-renegociacion" data-deuda="${selId}" data-unidad="${sufijo}"
              ${puedeAplicar ? '' : 'disabled'}>
        Aplicar nueva tasa
      </button>
    </div>`;
}

/**
 * Renderiza la comparación "tasa actual vs nueva tasa" para una sola deuda
 * (D.3a). Cubre todos los escenarios de forma honesta, sin restar cifras
 * divergentes cuando algún plan no se termina de pagar.
 *
 * @param {ReturnType<import('../logic.js').simularRenegociacion>|null} sim
 * @param {number} nuevaPct  Tasa nueva que escribió el usuario (en su unidad).
 * @param {'EA'|'mensual'} unidad
 * @returns {string}
 */
export function renderComparativaRenegociacion(sim, nuevaPct, unidad) {
  const sufijo = unidad === 'mensual' ? 'mensual' : 'EA';

  if (!sim || !(nuevaPct > 0)) {
    return `
      <p class="estrategia-card__bloque-body">
        Escribe la tasa que crees poder conseguir y compárala con la actual.
      </p>`;
  }

  // La nueva tasa tampoco cubre los intereses: la deuda seguiría creciendo.
  if (!sim.nueva.completo) {
    return `
      <p class="estrategia-card__bloque-body estrategia-card__renegociar-msg--warn">
        Ni con <strong>${_fmtPct(nuevaPct)} ${sufijo}</strong> la cuota alcanza a cubrir los intereses: la deuda seguiría creciendo. Necesitas una tasa más baja o, además, aumentar la cuota.
      </p>`;
  }

  // Plan actual inviable y el nuevo sí cierra: mejora cualitativa.
  if (!sim.actual.completo) {
    return `
      <p class="estrategia-card__bloque-body estrategia-card__renegociar-msg--ok">
        🎯 Con la tasa actual esta deuda no se termina de pagar. Con <strong>${_fmtPct(nuevaPct)} ${sufijo}</strong> sí la saldas en <strong>${formatearDuracion(sim.nueva.meses)}</strong>.
      </p>`;
  }

  // Ambos cierran pero la nueva no mejora (igual o más alta).
  if (!sim.mejora) {
    return `
      <p class="estrategia-card__bloque-body">
        Con <strong>${_fmtPct(nuevaPct)} ${sufijo}</strong> tu plan no mejora: esa tasa es igual o más alta que la actual.
      </p>`;
  }

  const partes = [];
  if (sim.ahorroMeses > 0)     partes.push(`<strong>${formatearDuracion(sim.ahorroMeses)} menos</strong>`);
  if (sim.ahorroIntereses > 0) partes.push(`<strong>${f(sim.ahorroIntereses)} menos en intereses</strong>`);

  return `
    <p class="estrategia-card__bloque-body estrategia-card__renegociar-msg--ok">
      🎯 Con <strong>${_fmtPct(nuevaPct)} ${sufijo}</strong> pagas esta deuda en <strong>${formatearDuracion(sim.nueva.meses)}</strong>: ${partes.join(' y ')} frente a la tasa actual.
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

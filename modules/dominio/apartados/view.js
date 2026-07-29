/**
 * apartados/view.js - generación de HTML para el dominio de apartados.
 * Puede leer S. No puede mutarlo. Sin lógica de negocio.
 */

import { S } from '../../core/state.js';
import { f, fechaLegible, hoy, esc as _esc } from '../../infra/utils.js';
import { iconoCategoria, emptyArt } from '../../infra/icons.js';
import { SALDO_MASCARA_CUENTA } from '../../infra/render.js';
import { renderSelectorCuenta } from '../../infra/cuenta-helper.js';
import { renderIconoPicker } from '../../infra/icon-picker.js';
import { ICONOS_CATEGORIA_PERSONALIZADA } from '../../core/constants.js';
import {
  apartadosActivos,
  estaListoParaReiniciar,
  calcularProgreso,
  calcularAporteSugerido,
  planDeReferencia,
  diasHastaFecha,
  etiquetaPeriodoMeses,
  apartadosProximos,
  DIAS_PROXIMO,
  FRECUENCIAS_APORTE,
  PLANTILLAS_APARTADO,
  PLANTILLAS_APARTADO_FRECUENTES,
  PERIODOS_RECURRENCIA,
  PERIODO_RECURRENCIA_DEFAULT,
  ICONO_APARTADO_DEFAULT,
} from './logic.js';

/**
 * Tope de casillas que se dibujan para el plan (DIS.15). Un apartado a dos años
 * con aporte semanal preveía más de cien: dejarían de leerse como un camino y
 * pasarían a ser ruido de 1px. Pasado el tope, la segunda carrera se dibuja como
 * barra continua con la misma proporción, y su encabezado sigue diciendo el
 * conteo exacto ("34 de 104 aportes").
 */
const MAX_CASILLAS = 24;

// ── FORMATO DE MONTOS EN CAPTURA (T9, hallazgo A6, regla R16) ────
//
// `f()` no sirve dentro de un `value`: antepone "$". Mismo par que Ajustes
// escribió para los datos de renta (B4). Va duplicado a propósito: ADN #10
// impide que un dominio importe a otro, y promover el par a `infra/` toca
// Ajustes, que no está en el alcance de esta auditoría. Si se hace el barrido
// de R16 que pide el informe, las dos copias se unifican en infra.

/**
 * Agrupa miles con punto para mostrar dentro de un campo de texto.
 * Devuelve '' si no hay dígitos.
 *
 * @param {string | number | null | undefined} valor
 * @returns {string} - ej. `980.000`
 */
export function miles(valor) {
  const digitos = String(valor ?? '').replace(/\D/g, '').replace(/^0+(?=\d)/, '');
  if (digitos === '') return '';
  return digitos.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/**
 * Inversa de `miles()`: lee lo escrito en el campo y devuelve el número.
 * `null` si no quedó ningún dígito (campo vacío, distinto de cero).
 *
 * @param {string | number | null | undefined} texto
 * @returns {number | null}
 */
export function desdeMiles(texto) {
  const digitos = String(texto ?? '').replace(/\D/g, '');
  return digitos === '' ? null : Number(digitos);
}

// ── LISTA DE APARTADOS ───────────────────────────────────────────

/**
 * Renderiza la lista de apartados en `#lista-apartados`.
 * No-op si el contenedor no existe.
 */
export function renderListaApartados() {
  const el = document.getElementById('lista-apartados');
  if (!el) return;

  const activos = apartadosActivos(S.apartados);
  const oculto  = S.config?.ocultarSaldo === true;

  el.innerHTML = activos.length === 0
    ? _renderEmptyState()
    : activos.map(a => _renderApartadoCard(a, oculto)).join('');
}

/**
 * Ícono de un apartado (CAT.2c): `apartado.icono` puede tener dos formatos,
 * sin bump de schema. Un id de símbolo del sprite (elegido con el picker
 * compartido desde esta rebanada, ej. 'c-carro') o un emoji crudo (plantillas
 * rápidas de `PLANTILLAS_APARTADO`, que conservan su propio catálogo curado
 * de emojis por ser más específicas que el catálogo genérico del picker; o
 * apartados viejos creados con el campo de texto libre anterior a CAT.2c).
 * Se distingue por el patrón `letra-` que ningún emoji real produce (mismo
 * criterio que `_iconoMeta()` en metas/view.js, CAT.2b).
 *
 * @param {import('../../core/state.js').Apartado} apartado
 * @returns {string}
 */
function _iconoApartado(apartado) {
  const valor = apartado.icono ?? ICONO_APARTADO_DEFAULT;
  return /^[a-z]-/.test(valor) ? iconoCategoria(valor) : _esc(valor);
}

/**
 * DIS.15 (arquitectura E, "las dos carreras"): el apartado deja de ser una fila
 * de Metas con datos añadidos y pasa a ser una tarjeta propia. Un apartado no es
 * una meta: la fecha no es una aspiración sino un **vencimiento externo**, y el
 * logro no es llegar al 100% algún día sino no quedar corto el día del cobro.
 * De ahí sale toda la estructura:
 *
 * - **El protagonista es el plazo, no el dinero.** El bloque grande dice cuántos
 *   días faltan; el anillo de progreso se retira y el badge de días deja de ser
 *   un badge al final del subtítulo.
 * - **Dos carreras enfrentadas:** arriba el dinero reunido, abajo lo que el plan
 *   preveía tener hecho a hoy, dibujado en aportes. Se comparan por longitud,
 *   así que la tarjeta se entiende sin leer un solo número. Las dos filas usan
 *   la misma tinta a propósito: si una se dibujara más vistosa, ganaría el
 *   vistazo y la comparación se invertiría.
 * - **El veredicto habla solo con un aporte completo de diferencia.** Por debajo
 *   de eso calla y las barras hablan solas: sin ese umbral, quien aporta
 *   puntualmente aparecería atrasado los días previos a cada aporte.
 * - **Un dato que no existe se ofrece, no se rellena (regla R57):** sin fecha
 *   objetivo no hay días, ni plan, ni sugerencia, así que el monto reunido sube
 *   al lugar protagonista y la tarjeta dice qué ganaría con una fecha, en vez de
 *   fingir la segunda carrera.
 * - **El estado terminal cambia el dato, no solo el botón:** al completarse, el
 *   bloque grande pasa de "cuánto falta" a "cuánto sobró" y la acción principal
 *   deja de ser aportar para ser cerrar el ciclo.
 * - **Regla R20:** toda cifra en pesos pasa por la máscara del ojo. El
 *   porcentaje, las barras, los días y el conteo de aportes no: no revelan
 *   cuánto dinero hay.
 *
 * @param {import('../../core/state.js').Apartado} apartado
 * @param {boolean} [oculto=false] `S.config.ocultarSaldo`.
 */
function _renderApartadoCard(apartado, oculto = false) {
  const nombre = _esc(apartado.nombre);
  const id     = _esc(apartado.id);
  const icono  = _iconoApartado(apartado);
  const hoyISO = hoy();

  const { porcentaje, faltante, completado } = calcularProgreso(apartado);
  const listo    = estaListoParaReiniciar(apartado);
  const sugerido = listo ? null : calcularAporteSugerido(apartado, hoyISO);
  const plan     = planDeReferencia(apartado, hoyISO);
  const dias     = diasHastaFecha(apartado.fechaObjetivo, hoyISO);

  const objetivo  = apartado.montoObjetivo ?? 0;
  const acumulado = apartado.montoActual ?? 0;
  const enCero    = acumulado <= 0;
  const m         = (n) => oculto ? SALDO_MASCARA_CUENTA : f(n);

  const chipHtml = apartado.recurrente
    ? `<span class="apartado-card__chip">${_esc(etiquetaPeriodoMeses(apartado.periodoMeses ?? PERIODO_RECURRENCIA_DEFAULT))}</span>`
    : '';

  return `
    <article class="apartado-card${listo ? ' apartado-card--listo' : ''}" data-id="${id}" data-dom="ahorro">
      <div class="apartado-card__head">
        <p class="apartado-card__nombre"><span class="apartado-card__glifo" aria-hidden="true">${icono}</span> ${nombre}</p>
        ${chipHtml}
      </div>
      ${_renderFoco(apartado, { listo, dias, acumulado, objetivo, m })}
      ${_renderCarreras({ porcentaje, plan, listo, enCero })}
      ${_renderVeredicto({ apartado, plan, listo, enCero, m })}
      <div class="apartado-card__datos">
        ${_renderDatos({ apartado, listo, enCero, sugerido, acumulado, objetivo, faltante, m })}
      </div>
      ${apartado.fechaObjetivo || listo ? '' : `
      <p class="apartado-card__nota">Con una fecha objetivo, Finko calcula cuánto separar en cada pago para llegar a tiempo.</p>`}
      <div class="apartado-card__acciones">
        ${_renderAccionPrincipal({ nombre, id, listo, completado, enCero, sugerido, oculto })}
        <div class="apartado-card__secundarias">
          <button class="btn btn-ghost btn-sm apartado-card__secundaria"
                  type="button"
                  data-action="eliminar-apartado"
                  data-id="${id}"
                  aria-label="Eliminar apartado ${nombre}">Eliminar</button>
        </div>
      </div>
    </article>`;
}

/**
 * Bloque protagonista de la tarjeta. Cambia de dato, no solo de formato: días
 * que faltan mientras el apartado corre, cuánto sobró cuando ya está reunido, y
 * el monto acumulado cuando no hay fecha contra la que contar días.
 */
function _renderFoco(apartado, { listo, dias, acumulado, objetivo, m }) {
  let dato = '';
  let nota = '';
  let clase = '';

  if (listo) {
    clase = ' apartado-card__foco-dato--texto';
    dato  = 'Ya lo reuniste';
    nota  = dias !== null && dias >= 0
      ? `con ${dias === 1 ? '1 día' : `${dias} días`} de sobra`
      : 'listo para usar';
  } else if (!apartado.fechaObjetivo) {
    clase = ' apartado-card__foco-dato--monto';
    dato  = m(acumulado);
    nota  = `de ${m(objetivo)} reunidos`;
  } else if (dias === null) {
    return '';
  } else if (dias > 0) {
    dato = String(dias);
    nota = `${dias === 1 ? 'día' : 'días'} para el ${fechaLegible(apartado.fechaObjetivo)}`;
  } else if (dias === 0) {
    clase = ' apartado-card__foco-dato--texto';
    dato  = 'Es hoy';
    nota  = `vence el ${fechaLegible(apartado.fechaObjetivo)}`;
  } else {
    dato = String(Math.abs(dias));
    nota = `${dias === -1 ? 'día' : 'días'} de retraso · vencía el ${fechaLegible(apartado.fechaObjetivo)}`;
  }

  return `
      <div class="apartado-card__foco">
        <p class="apartado-card__foco-dato${clase}">${dato}</p>
        <p class="apartado-card__foco-nota">${nota}</p>
      </div>`;
}

/**
 * Las dos carreras. La primera siempre; la segunda solo cuando hay plan que
 * dibujar (necesita fecha objetivo). Pasado `MAX_CASILLAS` el plan se dibuja
 * como barra continua: el encabezado sigue diciendo el conteo exacto.
 */
function _renderCarreras({ porcentaje, plan, listo, enCero }) {
  const dinero = `
        <div class="apartado-card__carrera">
          <p class="apartado-card__carrera-head"><span>Dinero reunido</span><span>${porcentaje}%</span></p>
          <div class="apartado-card__barra"><div class="apartado-card__barra-fill" style="width:${porcentaje}%"></div></div>
        </div>`;

  if (!plan) {
    return `<div class="apartado-card__carreras">${dinero}</div>`;
  }

  const rotulo = listo ? 'Deberían estar hechos' : enCero ? 'Tu plan' : 'Deberías llevar';
  const { totalAportes } = plan;
  // Con el dinero ya reunido las dos carreras se igualan: el plan está cumplido
  // aunque el calendario no haya corrido entero (se puede adelantar cuotas).
  const aportesEsperados = listo ? totalAportes : plan.aportesEsperados;

  const planHtml = totalAportes <= MAX_CASILLAS
    ? `<div class="apartado-card__casillas" style="--fk-casillas:${totalAportes}">
             ${Array.from({ length: totalAportes }, (_, i) =>
               `<span class="apartado-card__casilla${i < aportesEsperados ? ' apartado-card__casilla--on' : ''}"></span>`).join('')}
           </div>`
    : `<div class="apartado-card__barra"><div class="apartado-card__barra-fill" style="width:${Math.round((aportesEsperados / totalAportes) * 100)}%"></div></div>`;

  return `
      <div class="apartado-card__carreras">
        ${dinero}
        <div class="apartado-card__carrera">
          <p class="apartado-card__carrera-head"><span>${rotulo}</span><span>${aportesEsperados} de ${totalAportes} aportes</span></p>
          ${planHtml}
        </div>
      </div>`;
}

/**
 * El veredicto: la única línea de la tarjeta que emite un juicio. Solo aparece
 * cuando hay algo que decir, y con el atraso el umbral es un aporte completo.
 */
function _renderVeredicto({ apartado, plan, listo, enCero, m }) {
  let texto = '';

  if (listo) {
    texto = `Cuando pagues ${_esc(apartado.nombre)}, marca "Ya lo usé" y arranca el ciclo siguiente.`;
  } else if (plan && plan.delta <= -1) {
    const cuantos = Math.abs(plan.delta);
    texto = `Vas ${cuantos === 1 ? 'un aporte' : `${cuantos} aportes`} atrás del plan. Repón ${m(plan.cuotaPrevista * cuantos)} y quedas al día.`;
  } else if (plan && plan.delta >= 1) {
    const cuantos = plan.delta;
    texto = `Vas ${cuantos === 1 ? 'un aporte' : `${cuantos} aportes`} adelante. Con ${m(calcularProgreso(apartado).faltante)} más quedas cubierto antes de la fecha.`;
  } else if (plan && enCero) {
    texto = 'Vas al día: el plan arranca ahora. Empieza con el primer aporte y el resto sale solo.';
  }

  return texto === '' ? '' : `<p class="apartado-card__veredicto">${texto}</p>`;
}

/** Las dos líneas de detalle del pie, distintas en cada estado. */
function _renderDatos({ apartado, listo, enCero, sugerido, acumulado, objetivo, faltante, m }) {
  const planLinea = sugerido
    ? `<p class="apartado-card__dato">${sugerido.numPeriodos} ${sugerido.numPeriodos === 1 ? 'aporte' : 'aportes'} de ${m(sugerido.aportePorPeriodo)} ${_esc(sugerido.etiquetaPeriodo)}</p>`
    : '';

  if (listo) {
    const vence = apartado.fechaObjetivo ? ` · vence el ${fechaLegible(apartado.fechaObjetivo)}` : '';
    return `<p class="apartado-card__dato apartado-card__dato--fuerte">${m(acumulado)} listos${vence}</p>`;
  }

  if (!apartado.fechaObjetivo) {
    return `<p class="apartado-card__dato apartado-card__dato--fuerte">Faltan ${m(faltante)}</p>
        <p class="apartado-card__dato apartado-card__dato--suave">Sin fecha objetivo</p>`;
  }

  if (enCero) {
    return `<p class="apartado-card__dato apartado-card__dato--fuerte">Objetivo ${m(objetivo)}</p>
        ${planLinea}`;
  }

  return `<p class="apartado-card__dato apartado-card__dato--fuerte">${m(acumulado)} de ${m(objetivo)} · faltan ${m(faltante)}</p>
        ${planLinea}`;
}

/**
 * La acción principal es contextual: cerrar el ciclo cuando el dinero ya está,
 * nombrar el primer paso cuando no hay nada aportado, y traer el monto ya
 * decidido cuando hay plan (con el saldo oculto el monto no se imprime: el
 * botón es la última cifra en pesos que quedaría a la vista).
 */
function _renderAccionPrincipal({ nombre, id, listo, completado, enCero, sugerido, oculto }) {
  if (listo) {
    return `<button class="apartado-card__principal"
                type="button"
                data-action="reiniciar-apartado"
                data-id="${id}"
                aria-label="Marcar ${nombre} como usado y reiniciar el ciclo">Ya lo usé</button>`;
  }
  if (completado) return '';

  const etiqueta = enCero
    ? '+ Hacer el primer aporte'
    : (sugerido && !oculto ? `+ Aportar ${f(sugerido.aportePorPeriodo)}` : '+ Aportar');

  return `<button class="apartado-card__principal"
                type="button"
                data-action="aportar-apartado"
                data-id="${id}"
                aria-label="Aportar a ${nombre}">${etiqueta}</button>`;
}

/**
 * Estado vacío (T11 y T12, hallazgos A9 y A10).
 *
 * Antes eran cinco bloques de texto con el botón en el medio (562px medidos),
 * y encima el banner de propósito: seis párrafos seguidos para el usuario
 * nuevo. El tip educativo se fusiona con la descripción y ahí mismo se cierra
 * el hueco de A9: crear un apartado NO mueve dinero (`normalizarApartado()`
 * nace en `montoActual: 0` y no toca ninguna cuenta), el dinero se aparta en
 * el primer aporte, y ninguna pantalla lo decía mientras el copy sugería lo
 * contrario. La desambiguación con Límites de gasto se queda (son dos
 * secciones que se confunden) en una línea debajo del CTA, que baja a
 * secundario porque "+ Apartado" del encabezado ya es el primario (regla R1).
 */
function _renderEmptyState() {
  return `
    <div class="empty-state">
      <div class="empty-state__icon">${emptyArt('apartados')}</div>
      <p class="empty-state__title">Sin apartados todavía</p>
      <p class="empty-state__desc">Ponle nombre, monto y fecha a un gasto que viene, y Finko te dice cuánto separar en cada pago. El dinero se aparta cuando registras el primer aporte.</p>
      <button class="btn btn-secondary" data-action="nuevo-apartado">+ Crear apartado</button>
      <p class="empty-state__tip empty-state__tip--muted">¿Buscabas ponerle un tope a lo que gastas al mes? Eso va en Límites de gasto.</p>
    </div>`;
}

// ── NUDGE DE PROXIMIDAD ──────────────────────────────────────────

/**
 * Renderiza un aviso cuando hay apartados con fecha objetivo dentro de
 * `DIAS_PROXIMO`. No-op si el contenedor no existe o no hay ninguno.
 */
export function renderNudgeApartadosProximos() {
  const el = document.getElementById('apartados-nudge-proximos');
  if (!el) return;

  const proximos = apartadosProximos(S.apartados, hoy());
  if (proximos.length === 0) { el.innerHTML = ''; return; }

  el.innerHTML = _renderNudgeProximos(proximos, S.config?.ocultarSaldo === true);
}

/**
 * Aviso de proximidad (T7, hallazgo A3, reglas R25 y R27).
 *
 * Antes mostraba el apartado más urgente con su fecha y su aporte sugerido, y
 * ese mismo apartado aparecía 60px más abajo en la lista con los mismos dos
 * datos: 86px para no agregar nada. Ahora hace lo único que la lista no puede,
 * que es sumar: cuántos vencen dentro del umbral y cuánto falta reunir entre
 * todos. Con la lista ordenada por urgencia, el primero es el que apura.
 * Sin `role="status"`: se repinta en cada render (T6, regla R24).
 *
 * DIS.15 (regla R20): la suma que este aviso muestra también es dinero, así que
 * respeta el ojo de privacidad como el resto de la sección.
 *
 * @param {import('../../core/state.js').Apartado[]} proximos - ordenados de más urgente.
 * @param {boolean} [oculto=false] `S.config.ocultarSaldo`.
 * @returns {string}
 */
function _renderNudgeProximos(proximos, oculto = false) {
  const cuantos  = proximos.length;
  const faltante = proximos.reduce((acc, a) => acc + calcularProgreso(a).faltante, 0);
  const monto    = oculto ? SALDO_MASCARA_CUENTA : f(faltante);

  const tituloStr = cuantos === 1
    ? `1 apartado vence en los próximos ${DIAS_PROXIMO} días`
    : `${cuantos} apartados vencen en los próximos ${DIAS_PROXIMO} días`;

  const descStr = cuantos === 1
    ? `Te falta reunir <strong>${monto}</strong>.`
    : `Te falta reunir <strong>${monto}</strong> entre los ${cuantos}.`;

  return `
    <div class="nudge nudge-info">
      <span class="nudge__icon" aria-hidden="true">📅</span>
      <div class="nudge__body">
        <p class="nudge__title">${tituloStr}</p>
        <p class="nudge__desc">${descStr}</p>
      </div>
    </div>`;
}

// ── FORMULARIO: NUEVO APARTADO ───────────────────────────────────

/**
 * Devuelve el HTML del formulario de nuevo apartado, con plantillas rápidas y
 * un hint en vivo del aporte sugerido (lo actualiza el listener en index.js).
 * @param {string} [frecuenciaPreferida] Pre-selección derivada de S.ingresos.
 * @returns {string}
 */
export function renderFormApartado(frecuenciaPreferida = 'Mensual') {
  // T4 (A8): las 6 frecuentes a la vista, las otras 14 plegadas.
  const chip = (p) => `
      <button type="button" class="chip"
              data-action="apartado-plantilla"
              data-nombre="${_esc(p.nombre)}" data-icono="${_esc(p.icono)}">
        ${_esc(p.icono)} ${_esc(p.nombre)}
      </button>`;

  const frecuentes = PLANTILLAS_APARTADO.filter(p => PLANTILLAS_APARTADO_FRECUENTES.includes(p.nombre));
  const resto      = PLANTILLAS_APARTADO.filter(p => !PLANTILLAS_APARTADO_FRECUENTES.includes(p.nombre));

  const plantillasHtml = frecuentes.map(chip).join('');
  const restoHtml      = resto.length === 0 ? '' : `
      <details class="form-details">
        <summary class="form-details__summary">Ver las otras ${resto.length} plantillas</summary>
        <div class="form-details__body">
          <div class="apartado-plantillas" role="group" aria-label="Más plantillas de apartado">
            ${resto.map(chip).join('')}
          </div>
        </div>
      </details>`;

  const frecOpts = FRECUENCIAS_APORTE
    .map(fr => `<option value="${_esc(fr)}"${fr === frecuenciaPreferida ? ' selected' : ''}>${_esc(fr)}</option>`)
    .join('');

  const periodoOpts = PERIODOS_RECURRENCIA
    .map(p => `<option value="${p.meses}"${p.meses === PERIODO_RECURRENCIA_DEFAULT ? ' selected' : ''}>${_esc(p.etiqueta)}</option>`)
    .join('');

  return `
    <form id="form-apartado" novalidate>
      <p class="form-hint form-hint--muted">¿Para qué gasto quieres prepararte? Toca uno o escribe el tuyo.</p>
      <div class="apartado-plantillas apartado-plantillas--parcial" role="group" aria-label="Plantillas de apartado">
        ${plantillasHtml}
      </div>
      ${restoHtml}

      <div class="form-group">
        <label for="apartado-nombre" class="label">Nombre del apartado</label>
        <div class="apartado-nombre-row">
          ${renderIconoPicker(ICONOS_CATEGORIA_PERSONALIZADA, { id: 'apartado-icono', nombreCampo: 'icono', label: '' })}
          <input id="apartado-nombre" name="nombre" class="input apartado-nombre-row__nombre" type="text"
                 placeholder="Ej. SOAT, Productos personales" required aria-required="true" autocomplete="off" />
        </div>
      </div>
      <div class="form-group">
        <label for="apartado-objetivo" class="label">¿Cuánto necesitas reunir?</label>
        <input id="apartado-objetivo" name="montoObjetivo" class="input" type="text"
               placeholder="0" required aria-required="true"
               inputmode="numeric" autocomplete="off" data-miles />
      </div>
      <div class="form-group">
        <label for="apartado-fecha" class="label">¿Para cuándo lo necesitas? (opcional)</label>
        <input id="apartado-fecha" name="fechaObjetivo" class="input" type="date" />
      </div>
      <div class="form-group">
        <label for="apartado-frecuencia" class="label">¿Cada cuánto puedes aportar?</label>
        <select id="apartado-frecuencia" name="frecuenciaAporte" class="input">
          ${frecOpts}
        </select>
        <p class="form-hint">Elige según la frecuencia con que recibes tu pago. Finko calcula cuánto separar en cada cobro.</p>
      </div>

      <details class="form-details">
        <summary class="form-details__summary">Este gasto se repite (SOAT, impuestos, matrícula...)</summary>
        <div class="form-details__body">
          <div class="form-group form-group--checkbox">
            <label class="checkbox-row">
              <input id="apartado-recurrente" name="recurrente" type="checkbox" />
              <span>Activar recurrencia</span>
            </label>
          </div>
          <div class="form-group" id="apartado-periodo-group" hidden>
            <label for="apartado-periodo" class="label">¿Cada cuánto tiempo se repite?</label>
            <select id="apartado-periodo" name="periodoMeses" class="input">
              ${periodoOpts}
            </select>
            <p class="form-hint">Cuando marques "Ya lo usé", el apartado arranca de cero para la próxima vez.</p>
          </div>
        </div>
      </details>

      <p id="apartado-sugerencia-live" class="form-hint form-hint--muted" aria-live="polite">
        Ponle un monto y una fecha para ver cuánto separar en cada pago.
      </p>

      <div class="modal__footer">
        <button type="button" class="btn btn-ghost" data-action="modal-close">Cancelar</button>
        <button type="submit" class="btn btn-primary">Crear apartado</button>
      </div>
    </form>`;
}

// ── FORMULARIO: APORTAR A UN APARTADO ────────────────────────────

/**
 * Devuelve el HTML del formulario para aportar dinero a un apartado existente.
 * Reusa el patrón 0/1/varias cuentas: con una sola cuenta activa la asume.
 *
 * @param {import('../../core/state.js').Apartado} apartado
 * @param {{aportePorPeriodo:number, etiquetaPeriodo:string}|null} [sugerencia]
 *   Salida de `calcularAporteSugerido()` (AP.5a): con fecha objetivo y
 *   frecuencia, el monto ya calculado prellena el campo en vez de dejarlo en
 *   blanco (el usuario ya vio este número en el hint del propio apartado; no
 *   tiene sentido pedirle que lo vuelva a escribir). Sigue siendo editable.
 * @returns {string}
 */
export function renderFormAporteApartado(apartado, sugerencia = null) {
  const { faltante } = calcularProgreso(apartado);

  // T10 (A12): una sola línea de contexto, legible, arriba del campo. Antes
  // iba con `form-hint--muted` (la clase de las ayudas atenuadas) y decía
  // "faltan" por tercera vez, después de la fila que el usuario acaba de tocar
  // y del anillo; el porcentaje entre paréntesis tampoco agregaba. La fecha,
  // que es el dato que faltaba en esta hoja, entra en su lugar.
  const faltanteStr = faltante > 0
    ? ` Te faltan <strong>${f(faltante)}</strong>${apartado.fechaObjetivo ? ` para el ${fechaLegible(apartado.fechaObjetivo)}` : ''}.`
    : '';

  const cuentasActivas = (S.cuentas ?? []).filter(c => c.activa !== false);
  const cuentaHtml     = renderSelectorCuenta(cuentasActivas, { label: '¿De qué cuenta sale el aporte?' });

  const montoSugerido = sugerencia?.aportePorPeriodo > 0 ? sugerencia.aportePorPeriodo : null;
  const valorHtml   = montoSugerido ? ` value="${miles(montoSugerido)}"` : '';
  const hintPrefill = montoSugerido
    ? `<p class="form-hint">Es lo que te toca aportar ${_esc(sugerencia.etiquetaPeriodo)} para llegar a tiempo. Puedes cambiarlo.</p>`
    : '';

  return `
    <form id="form-aporte-apartado" novalidate>
      <input type="hidden" name="apartadoId" value="${_esc(apartado.id)}" />
      <p class="form-hint">
        Llevas <strong>${f(apartado.montoActual ?? 0)} de ${f(apartado.montoObjetivo ?? 0)}</strong>.${faltanteStr}
      </p>
      <div class="form-group">
        <label for="aporte-apartado-monto" class="label">Monto del aporte</label>
        <input id="aporte-apartado-monto" name="monto" class="input" type="text"
               placeholder="0"${valorHtml}
               required aria-required="true"
               autocomplete="off" inputmode="numeric" data-miles />
        ${hintPrefill}
      </div>
      ${cuentaHtml}
      <div class="modal__footer">
        <button type="button" class="btn btn-ghost" data-action="modal-close">Cancelar</button>
        <button type="submit" class="btn btn-primary">Registrar aporte</button>
      </div>
    </form>`;
}

/**
 * apartados/view.js - generación de HTML para el dominio de apartados.
 * Puede leer S. No puede mutarlo. Sin lógica de negocio.
 */

import { S } from '../../core/state.js';
import { f, fechaLegible, hoy, esc as _esc } from '../../infra/utils.js';
import { icon, iconoCategoria, emptyArt } from '../../infra/icons.js';
import { progressRing } from '../../infra/svg.js';
import { renderSelectorCuenta } from '../../infra/cuenta-helper.js';
import { renderIconoPicker } from '../../infra/icon-picker.js';
import { ICONOS_CATEGORIA_PERSONALIZADA } from '../../core/constants.js';
import {
  apartadosActivos,
  estaListoParaReiniciar,
  calcularProgreso,
  calcularAporteSugerido,
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
  el.innerHTML = activos.length === 0
    ? _renderEmptyState()
    : activos.map(_renderApartadoItem).join('');
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

/** @param {import('../../core/state.js').Apartado} apartado */
function _renderApartadoItem(apartado) {
  const nombre = _esc(apartado.nombre);
  const icono  = _iconoApartado(apartado);
  const { porcentaje, completado } = calcularProgreso(apartado);
  const listo  = estaListoParaReiniciar(apartado);
  const sugerido = listo ? null : calcularAporteSugerido(apartado, hoy());

  const claseAnillo = (completado || listo) ? 'complete' : porcentaje >= 80 ? 'near' : 'default';

  const dias = diasHastaFecha(apartado.fechaObjetivo, hoy());

  const subtitleParts = [`${f(apartado.montoActual ?? 0)} / ${f(apartado.montoObjetivo ?? 0)}`];
  if (apartado.fechaObjetivo) {
    subtitleParts.push(`Para el ${fechaLegible(apartado.fechaObjetivo)}`);
  }
  if (apartado.recurrente) {
    subtitleParts.push(`${icon('recurring')} Recurrente: ${_esc(etiquetaPeriodoMeses(apartado.periodoMeses ?? PERIODO_RECURRENCIA_DEFAULT))}`);
  }
  // T7 (A3, regla R25): mismo umbral que usa el aviso de proximidad.
  if (dias !== null && !completado && !listo && dias >= 0 && dias <= DIAS_PROXIMO) {
    const clsBadge = dias <= 7 ? 'badge badge--danger' : 'badge badge--warn';
    const txtDias  = dias === 0 ? 'Hoy' : dias === 1 ? 'Mañana' : `${dias} días`;
    subtitleParts.push(`<span class="${clsBadge}">${txtDias}</span>`);
  }

  // T6 (A4, regla R24): sin `role="status"`. No son respuestas a una acción,
  // son contenido que se repinta en cada `state:change`, cada `hashchange` y
  // después de cada aporte, borrado o reinicio: con cuatro apartados había 5
  // regiones vivas y un solo aporte hacía que el lector anunciara las
  // sugerencias de todos. La retroalimentación real la da `announce()`.
  let mensajeHtml = '';
  if (listo) {
    mensajeHtml = `<p class="apartado__listo">
         ${icon('check-circle', 'icon icon--pop')} ¡Listo! Ya reuniste el dinero. Cuando lo uses, reinicia el ciclo para el próximo gasto.
       </p>`;
  } else if (sugerido) {
    mensajeHtml = `<p class="apartado__sugerencia">
         ${icon('lightbulb')} Aparta <strong>${f(sugerido.aportePorPeriodo)}</strong> ${_esc(sugerido.etiquetaPeriodo)}
         <span class="apartado__sugerencia-detalle">· ${sugerido.numPeriodos} ${sugerido.numPeriodos === 1 ? 'aporte' : 'aportes'}</span>
       </p>`;
  }

  let accionPrincipal = '';
  if (listo) {
    accionPrincipal = `<button class="btn btn-ghost btn-sm"
                data-action="reiniciar-apartado"
                data-id="${_esc(apartado.id)}"
                aria-label="Marcar ${nombre} como usado y reiniciar el ciclo">Ya lo usé</button>`;
  } else if (!completado) {
    accionPrincipal = `<button class="btn btn-ghost btn-sm"
                data-action="aportar-apartado"
                data-id="${_esc(apartado.id)}"
                aria-label="Aportar a ${nombre}">+ Aportar</button>`;
  }

  // T2b (A7, regla R28): la identidad va al centro del anillo y el porcentaje
  // baja a `.list-item__meta`, la columna donde el resto de la app pone su
  // cifra. El arco sigue contando el progreso. El ícono va sobrepuesto en vez
  // de como `etiqueta` de `progressRing()` porque `apartado.icono` puede ser
  // un emoji o un id del sprite (CAT.2c), y el segundo es marcado: dentro del
  // `<text>` del SVG se imprimiría escapado.
  // T5 (A2): tres líneas, no cuatro. Se va "Falta: $X", que es la resta de la
  // línea de arriba y que la sugerencia ya traduce en qué hacer.
  return `
    <article class="list-item${listo ? ' list-item--listo' : ''}" data-id="${_esc(apartado.id)}">
      <div class="list-item__icon list-item__icon--ring progress-ring-wrap progress-ring-wrap--${claseAnillo}" data-dom="ahorro" aria-hidden="true">
        ${progressRing(porcentaje, { size: 56, strokeWidth: 5, conLabel: false, ariaLabel: `Progreso de ${nombre}: ${porcentaje}%` })}
        <span class="apartado__anillo-icono">${icono}</span>
      </div>
      <div class="list-item__body">
        <p class="list-item__title">${nombre}</p>
        <p class="list-item__subtitle">${subtitleParts.join(' · ')}</p>
        ${mensajeHtml}
      </div>
      <div class="list-item__meta">
        <p class="list-item__amount">${porcentaje}%</p>
      </div>
      <div class="list-item__action">
        ${accionPrincipal}
        <button class="btn btn-ghost btn-icon"
                data-action="eliminar-apartado"
                data-id="${_esc(apartado.id)}"
                aria-label="Eliminar apartado ${nombre}"><svg class="icon" aria-hidden="true"><use href="#i-trash"/></svg></button>
      </div>
    </article>`;
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

  el.innerHTML = _renderNudgeProximos(proximos);
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
 * @param {import('../../core/state.js').Apartado[]} proximos - ordenados de más urgente.
 * @returns {string}
 */
function _renderNudgeProximos(proximos) {
  const cuantos  = proximos.length;
  const faltante = proximos.reduce((acc, a) => acc + calcularProgreso(a).faltante, 0);

  const tituloStr = cuantos === 1
    ? `1 apartado vence en los próximos ${DIAS_PROXIMO} días`
    : `${cuantos} apartados vencen en los próximos ${DIAS_PROXIMO} días`;

  const descStr = cuantos === 1
    ? `Te falta reunir <strong>${f(faltante)}</strong>.`
    : `Te falta reunir <strong>${f(faltante)}</strong> entre los ${cuantos}.`;

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

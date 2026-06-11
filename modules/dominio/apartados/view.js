/**
 * apartados/view.js - generación de HTML para el dominio de apartados.
 * Puede leer S. No puede mutarlo. Sin lógica de negocio.
 */

import { S } from '../../core/state.js';
import { f, fechaLegible, hoy, esc as _esc } from '../../infra/utils.js';
import {
  apartadosActivos,
  estaListoParaReiniciar,
  calcularProgreso,
  calcularAporteSugerido,
  diasHastaFecha,
  etiquetaPeriodo,
  etiquetaPeriodoMeses,
  apartadosProximos,
  FRECUENCIAS_APORTE,
  PLANTILLAS_APARTADO,
  PERIODOS_RECURRENCIA,
  PERIODO_RECURRENCIA_DEFAULT,
  ICONO_APARTADO_DEFAULT,
} from './logic.js';

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

/** @param {import('../../core/state.js').Apartado} apartado */
function _renderApartadoItem(apartado) {
  const nombre = _esc(apartado.nombre);
  const icono  = _esc(apartado.icono ?? ICONO_APARTADO_DEFAULT);
  const { porcentaje, faltante, completado } = calcularProgreso(apartado);
  const listo  = estaListoParaReiniciar(apartado);
  // Un apartado listo para reiniciar ya reunió el dinero: no mostramos sugerencia.
  const sugerido = listo ? null : calcularAporteSugerido(apartado, hoy());

  const claseProgreso = completado
    ? 'progress-bar--complete'
    : porcentaje >= 80 ? 'progress-bar--near' : '';

  const dias = diasHastaFecha(apartado.fechaObjetivo, hoy());

  const subtitleParts = [`${f(apartado.montoActual ?? 0)} / ${f(apartado.montoObjetivo ?? 0)}`];
  if (apartado.fechaObjetivo) {
    subtitleParts.push(`Para el ${fechaLegible(apartado.fechaObjetivo)}`);
  }
  if (apartado.recurrente) {
    subtitleParts.push(`🔁 Se repite ${_esc(etiquetaPeriodoMeses(apartado.periodoMeses ?? PERIODO_RECURRENCIA_DEFAULT))}`);
  }
  if (dias !== null && !completado && !listo && dias >= 0 && dias <= 30) {
    const clsBadge = dias <= 7 ? 'badge badge--danger' : 'badge badge--warn';
    const txtDias  = dias === 0 ? 'Hoy' : dias === 1 ? 'Mañana' : `${dias} días`;
    subtitleParts.push(`<span class="${clsBadge}">${txtDias}</span>`);
  }

  // Mensaje central: si ya reunió el dinero (recurrente), invitarlo a usarlo y
  // reiniciar; si aún le falta, la sugerencia de cuánto apartar por periodo.
  let mensajeHtml = '';
  if (listo) {
    mensajeHtml = `<p class="apartado__listo" role="status">
         ✅ ¡Listo! Ya reuniste el dinero. Cuando lo uses, reinicia el ciclo para el próximo gasto.
       </p>`;
  } else if (sugerido) {
    mensajeHtml = `<p class="apartado__sugerencia" role="status">
         💡 Aparta <strong>${f(sugerido.aportePorPeriodo)}</strong> ${_esc(sugerido.etiquetaPeriodo)}
         <span class="apartado__sugerencia-detalle">· ${sugerido.numPeriodos} ${sugerido.numPeriodos === 1 ? 'aporte' : 'aportes'} antes de la fecha</span>
       </p>`;
  }

  // Acción principal: "Ya lo usé" (reinicia el ciclo) si está listo; si no, aportar.
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

  return `
    <article class="list-item${listo ? ' list-item--listo' : ''}" data-id="${_esc(apartado.id)}">
      <div class="list-item__icon" aria-hidden="true">${icono}</div>
      <div class="list-item__body">
        <p class="list-item__title">${nombre}${listo ? ' ✅' : ''}</p>
        <p class="list-item__subtitle">${subtitleParts.join(' · ')}</p>
        <div class="progress" role="progressbar"
             aria-valuenow="${porcentaje}" aria-valuemin="0" aria-valuemax="100"
             aria-label="Progreso de ${nombre}: ${porcentaje}%">
          <div class="progress-bar ${claseProgreso}" style="width:${porcentaje}%"></div>
        </div>
        <p class="list-item__progress-label">${porcentaje}%${faltante > 0 ? ` · Faltan ${f(faltante)}` : ''}</p>
        ${mensajeHtml}
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

function _renderEmptyState() {
  return `
    <div class="empty-state">
      <p class="empty-state__icon" aria-hidden="true">📦</p>
      <p class="empty-state__title">Sin apartados todavía</p>
      <p class="empty-state__desc">Separa dinero poco a poco para los gastos que sabes que vienen (SOAT, impuestos, productos personales) y deja de afrontarlos como emergencias.</p>
      <button class="btn btn-primary" data-action="nuevo-apartado">+ Crear apartado</button>
      <p class="empty-state__tip">💡 Tip: dale una fecha objetivo y Finko te dice cuánto separar en cada pago para llegar a tiempo.</p>
    </div>`;
}

// ── NUDGE DE PROXIMIDAD ──────────────────────────────────────────

/**
 * Renderiza un aviso cuando hay apartados con fecha objetivo próxima (60 días).
 * Muestra el más urgente con cuánto falta y cuánto apartar. Si hay más, lo
 * menciona. No-op si el contenedor no existe o no hay apartados próximos.
 */
export function renderNudgeApartadosProximos() {
  const el = document.getElementById('apartados-nudge-proximos');
  if (!el) return;

  const proximos = apartadosProximos(S.apartados, hoy());
  if (proximos.length === 0) { el.innerHTML = ''; return; }

  el.innerHTML = _renderNudgeProximos(proximos);
}

/**
 * @param {import('../../core/state.js').Apartado[]} proximos - ordenados de más urgente.
 * @returns {string}
 */
function _renderNudgeProximos(proximos) {
  const principal = proximos[0];
  const otros     = proximos.length - 1;
  const nombre    = _esc(principal.nombre);
  const icono     = _esc(principal.icono ?? ICONO_APARTADO_DEFAULT);

  const dias      = diasHastaFecha(principal.fechaObjetivo, hoy()) ?? 0;
  const cuandoStr = dias === 0 ? 'hoy' : dias === 1 ? 'mañana' : `en ${dias} días`;

  const sugerido  = calcularAporteSugerido(principal, hoy());
  const sugerenciaStr = sugerido
    ? `Aparta <strong>${f(sugerido.aportePorPeriodo)}</strong> ${_esc(etiquetaPeriodo(principal.frecuenciaAporte))} para llegar a tiempo.`
    : `Faltan <strong>${f(calcularProgreso(principal).faltante)}</strong>.`;

  const otrosHtml = otros > 0
    ? `<p class="nudge__desc nudge__desc--muted">y ${otros} ${otros === 1 ? 'apartado más' : 'apartados más'} con fecha próxima</p>`
    : '';

  return `
    <div class="nudge nudge-info" role="status">
      <span class="nudge__icon" aria-hidden="true">${icono}</span>
      <div class="nudge__body">
        <p class="nudge__title">${nombre} vence ${cuandoStr}</p>
        <p class="nudge__desc">${sugerenciaStr}</p>
        ${otrosHtml}
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
  const plantillasHtml = PLANTILLAS_APARTADO
    .map(p => `
      <button type="button" class="chip"
              data-action="apartado-plantilla"
              data-nombre="${_esc(p.nombre)}" data-icono="${_esc(p.icono)}">
        ${_esc(p.icono)} ${_esc(p.nombre)}
      </button>`)
    .join('');

  const frecOpts = FRECUENCIAS_APORTE
    .map(fr => `<option value="${_esc(fr)}"${fr === frecuenciaPreferida ? ' selected' : ''}>${_esc(fr)}</option>`)
    .join('');

  const periodoOpts = PERIODOS_RECURRENCIA
    .map(p => `<option value="${p.meses}"${p.meses === PERIODO_RECURRENCIA_DEFAULT ? ' selected' : ''}>${_esc(p.etiqueta)}</option>`)
    .join('');

  return `
    <form id="form-apartado" novalidate>
      <p class="form-hint form-hint--muted">¿Para qué gasto quieres prepararte? Toca uno o escribe el tuyo.</p>
      <div class="apartado-plantillas" role="group" aria-label="Plantillas de apartado">
        ${plantillasHtml}
      </div>

      <div class="form-group">
        <label for="apartado-nombre" class="label">Nombre del apartado</label>
        <input id="apartado-nombre" name="nombre" class="input" type="text"
               placeholder="Ej. SOAT, Productos personales" required aria-required="true" autocomplete="off" />
      </div>
      <div class="form-group">
        <label for="apartado-objetivo" class="label">¿Cuánto necesitas reunir? (COP)</label>
        <input id="apartado-objetivo" name="montoObjetivo" class="input" type="number"
               min="1" step="10000" placeholder="0" required aria-required="true"
               inputmode="numeric" />
      </div>
      <div class="form-group">
        <label for="apartado-fecha" class="label">¿Para cuándo lo necesitas? (opcional)</label>
        <input id="apartado-fecha" name="fechaObjetivo" class="input" type="date" />
      </div>
      <div class="form-group">
        <label for="apartado-frecuencia" class="label">¿Cada cuánto recibes ingresos?</label>
        <select id="apartado-frecuencia" name="frecuenciaAporte" class="input">
          ${frecOpts}
        </select>
      </div>

      <div class="form-group form-group--checkbox">
        <label class="checkbox-row">
          <input id="apartado-recurrente" name="recurrente" type="checkbox" />
          <span>Este gasto se repite cada cierto tiempo (SOAT, impuesto predial, matrícula...)</span>
        </label>
      </div>
      <div class="form-group" id="apartado-periodo-group" hidden>
        <label for="apartado-periodo" class="label">¿Cada cuánto tiempo se repite?</label>
        <select id="apartado-periodo" name="periodoMeses" class="input">
          ${periodoOpts}
        </select>
        <p class="form-hint">Cuando marques "Ya lo usé", el apartado arranca de cero para la próxima vez.</p>
      </div>

      <div class="form-group">
        <label for="apartado-icono" class="label">Emoji (opcional)</label>
        <input id="apartado-icono" name="icono" class="input" type="text"
               maxlength="4" placeholder="📦" autocomplete="off" />
      </div>

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
 * @param {import('../../core/state.js').Apartado} apartado
 * @returns {string}
 */
export function renderFormAporteApartado(apartado) {
  const { porcentaje, faltante } = calcularProgreso(apartado);
  const faltanteHtml = faltante > 0
    ? ` · Faltan: <strong>${f(faltante)}</strong>`
    : '';

  const cuentasActivas = (S.cuentas ?? []).filter(c => c.activa !== false);
  const cuentaHtml     = _renderCuentaSelectorAporte(cuentasActivas);

  return `
    <form id="form-aporte-apartado" novalidate>
      <input type="hidden" name="apartadoId" value="${_esc(apartado.id)}" />
      <p class="form-hint form-hint--muted">
        Progreso de <strong>${_esc(apartado.nombre)}</strong>:
        <strong>${f(apartado.montoActual ?? 0)} de ${f(apartado.montoObjetivo ?? 0)}</strong> (${porcentaje}%)${faltanteHtml}
      </p>
      <div class="form-group">
        <label for="aporte-apartado-monto" class="label">Monto del aporte (COP)</label>
        <input id="aporte-apartado-monto" name="monto" class="input" type="number"
               min="1" step="10000" placeholder="0"
               required aria-required="true"
               autocomplete="off" inputmode="numeric" />
      </div>
      ${cuentaHtml}
      <div class="modal__footer">
        <button type="button" class="btn btn-ghost" data-action="modal-close">Cancelar</button>
        <button type="submit" class="btn btn-primary">Registrar aporte</button>
      </div>
    </form>`;
}

// ── HELPERS ──────────────────────────────────────────────────────

/**
 * Selector de cuenta de origen del aporte, patrón 0/1/varias.
 * - 0 cuentas: sin selector (el aporte vale como seguimiento).
 * - 1 cuenta:  hidden + hint (se asume sin preguntar).
 * - Varias:    select obligatorio.
 *
 * @param {import('../../core/state.js').Cuenta[]} cuentas - solo las activas.
 * @returns {string}
 */
function _renderCuentaSelectorAporte(cuentas) {
  if (cuentas.length === 0) return '';

  if (cuentas.length === 1) {
    const c = cuentas[0];
    const saldo = c.saldo ?? 0;
    return `
      <input type="hidden" name="cuentaId" value="${_esc(c.id)}" />
      <p class="form-hint quick-add__cuenta-hint${saldo <= 0 ? ' form-hint--danger' : ''}" role="status">
        💳 Sale de: <strong>${_esc(c.nombre)}</strong> · Disponible: ${f(saldo)}
      </p>`;
  }

  const opts = cuentas
    .map(c => `<option value="${_esc(c.id)}">${_esc(c.nombre)} (${f(c.saldo ?? 0)})</option>`)
    .join('');
  return `
    <div class="form-group">
      <label for="aporte-apartado-cuenta" class="label">¿Desde qué cuenta?</label>
      <select id="aporte-apartado-cuenta" name="cuentaId" class="input" required aria-required="true">
        <option value="">Elegir cuenta…</option>
        ${opts}
      </select>
    </div>`;
}

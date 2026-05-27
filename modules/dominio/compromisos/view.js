/**
 * compromisos/view.js - generación de HTML para el dominio de compromisos.
 * Puede leer S. No puede mutarlo. Sin lógica de negocio.
 */

import { S } from '../../core/state.js';
import { f } from '../../infra/utils.js';
import { FRECUENCIAS, tasaUsuraVigente } from '../../core/constants.js';
import {
  compromisosActivos,
  calcularCompromisoMensual,
  proximoVencimiento,
  urgencia,
  compromisosProximos,
  filtrarDeudasPagables,
  compararEstrategias,
  recomendarEstrategia,
  detectarFijosSinPagarEsteMes,
  detectarDeudasDurmiendo,
  detectarVencidosCompletos,
  agruparPorDiasRestantes,
  esDeuda,
  tasaEADe,
  LABEL_TIPO,
  ICONO_TIPO,
} from './logic.js';

// Estado UI local: extra mensual, estrategia activa, acordeón abierto.
// Persiste mientras la pestaña está abierta; al recargar vuelve a defaults.
// estrategia=null indica "no elegida aún" (mostramos solo las cards).
const _uiEstrategia = {
  extraMensual:   0,
  estrategia:     null,
  expandidoExtra: false,
};

// ── ALERTA: FIJOS SIN PAGAR ESTE MES (G.1) ───────────────────────

/**
 * Renderiza (o limpia) la alerta de fijos cuyo dia de pago ya paso este mes
 * en `#nudge-fijos-sin-pagar`. No-op si el contenedor no existe.
 */
export function renderAlertaFijosSinPagar() {
  const el = document.getElementById('nudge-fijos-sin-pagar');
  if (!el) return;

  const hoyISO = new Date().toISOString().slice(0, 10);
  const fijos  = detectarFijosSinPagarEsteMes(S.compromisos, hoyISO);

  if (fijos.length === 0) {
    el.innerHTML = '';
    return;
  }

  const hayUrgente = fijos.some(f => f.severidad === 'urgente');
  const nivel      = hayUrgente ? 'nudge-high' : 'nudge-medium';
  const icono      = hayUrgente ? '🔴' : '🟡';
  const n          = fijos.length;
  const titulo     = n === 1
    ? '1 gasto fijo venció este mes'
    : `${n} gastos fijos vencieron este mes`;

  const items = fijos.slice(0, 3).map(fx => {
    const desc  = _esc(fx.descripcion);
    const dias  = fx.diasAtraso;
    const label = dias === 0 ? 'venció hoy'
      : dias === 1           ? 'venció hace 1 dia'
      :                        `venció hace ${dias} dias`;
    return `<p class="nudge__desc"><strong>${desc}</strong>: ${label} · ${f(fx.monto)}</p>`;
  }).join('');

  const extra = fijos.length > 3
    ? `<p class="nudge__desc nudge__desc--muted">+${fijos.length - 3} mas...</p>`
    : '';

  el.innerHTML = `
    <div class="nudge ${nivel}" role="alert" aria-live="polite">
      <span class="nudge__icon" aria-hidden="true">${icono}</span>
      <div class="nudge__body">
        <p class="nudge__title">${titulo}. ¿Ya los registraste?</p>
        ${items}${extra}
      </div>
    </div>`;
}

// ── ALERTA: DEUDAS DURMIENDO (G.1) ───────────────────────────────

/**
 * Renderiza (o limpia) la alerta de deudas sin actividad en `#nudge-deudas-durmiendo`.
 * Aparece cuando hay deudas con saldo pendiente creadas hace >= 2 meses.
 * No-op si el contenedor no existe.
 */
export function renderAlertaDeudasDurmiendo() {
  const el = document.getElementById('nudge-deudas-durmiendo');
  if (!el) return;

  const hoyISO  = new Date().toISOString().slice(0, 10);
  const deudas  = detectarDeudasDurmiendo(S.compromisos, hoyISO);

  if (deudas.length === 0) {
    el.innerHTML = '';
    return;
  }

  const hayAlta = deudas.some(d => d.severidad === 'alta');
  const nivel   = hayAlta ? 'nudge-high' : 'nudge-medium';
  const icono   = hayAlta ? '⚠️' : '💤';
  const n       = deudas.length;
  const titulo  = n === 1
    ? '1 deuda lleva tiempo sin actividad'
    : `${n} deudas llevan tiempo sin actividad`;

  const items = deudas.slice(0, 3).map(d => {
    const desc    = _esc(d.descripcion);
    const meses   = d.mesesDesdeCreacion;
    const saldo   = f(d.saldoPendiente);
    const consejo = d.sugerencia === 'liquidar'
      ? 'podés liquidarla con la proxima cuota'
      : 'retomá los pagos para evitar intereses';
    return `<p class="nudge__desc"><strong>${desc}</strong>: ${meses} meses · ${saldo} pendiente · ${consejo}</p>`;
  }).join('');

  const extra = deudas.length > 3
    ? `<p class="nudge__desc nudge__desc--muted">+${deudas.length - 3} mas...</p>`
    : '';

  el.innerHTML = `
    <div class="nudge ${nivel}" role="alert" aria-live="polite">
      <span class="nudge__icon" aria-hidden="true">${icono}</span>
      <div class="nudge__body">
        <p class="nudge__title">${titulo}</p>
        ${items}${extra}
      </div>
    </div>`;
}

// ── LISTA DE DEUDAS ──────────────────────────────────────────────

/**
 * Renderiza la lista de deudas en `#lista-compromisos`.
 *
 * v6: la sección Compromisos solo muestra deudas (entidad + personal).
 * Los gastos fijos se gestionan desde Agenda.
 *
 * Orden:
 *  - Si hay ≥ 2 deudas pagables con la estrategia activa, se respeta el orden
 *    de pago de la estrategia (avalancha = tasa↓, bola = saldo↑).
 *  - Si no, se ordena por urgencia de vencimiento (días al próximo pago).
 *
 * No-op si el contenedor no existe.
 */
export function renderListaCompromisos() {
  const el = document.getElementById('lista-compromisos');
  if (!el) return;

  const activos = compromisosActivos(S.compromisos).filter(c => esDeuda(c.tipo));

  if (activos.length === 0) {
    el.innerHTML = _renderEmptyState();
    return;
  }

  // Orden estratégico: si la estrategia tiene un orden definido para las deudas
  // pagables, las priorizamos según ese orden (1°, 2°, 3°…). El resto va al final
  // por urgencia.
  const pagables = filtrarDeudasPagables(S.compromisos);
  let ordenEstrategia = null;
  if (pagables.length >= 1) {
    const { extraMensual, estrategia } = _uiEstrategia;
    const sortFn = estrategia === 'bolaNieve'
      ? (a, b) => a.saldo - b.saldo
      : (a, b) => b.tasaEA - a.tasaEA;
    const ordenadas = [...pagables].sort(sortFn);
    ordenEstrategia = new Map(ordenadas.map((d, i) => [d.id, i + 1]));
    void extraMensual; // referenciado para que ESLint no se queje si quedara unused
  }

  const ordenados = [...activos].sort((a, b) => {
    const posA = ordenEstrategia?.get(a.id) ?? Infinity;
    const posB = ordenEstrategia?.get(b.id) ?? Infinity;
    if (posA !== posB) return posA - posB;
    return proximoVencimiento(a) - proximoVencimiento(b);
  });

  el.innerHTML = ordenados.map((c) => {
    const orden = ordenEstrategia?.get(c.id) ?? null;
    return _renderCompromisoItem(c, orden);
  }).join('');
}

/**
 * @param {import('../../core/state.js').Compromiso} compromiso
 * @param {number | null} ordenEstrategia 1-based: posición en la estrategia activa.
 */
function _renderCompromisoItem(compromiso, ordenEstrategia = null) {
  const desc     = _esc(compromiso.descripcion);
  const tipo     = compromiso.tipo;
  const icono    = _esc(ICONO_TIPO[tipo] ?? '💳');
  const label    = _esc(LABEL_TIPO[tipo] ?? tipo);
  const frec     = _esc(compromiso.frecuencia);
  const dias     = proximoVencimiento(compromiso);
  const nivel    = urgencia(compromiso);
  const cuota    = Number(compromiso.cuotaMensual) || 0;
  const saldo    = Number(compromiso.saldoTotal) || 0;
  const tasaEA   = tasaEADe(compromiso) * 100;

  const chipClase = nivel === 'urgente'
    ? 'chip chip--danger'
    : nivel === 'proximo'
    ? 'chip chip--warning'
    : 'chip chip--neutral';

  const diasLabel = dias === 0
    ? 'Vence hoy'
    : dias === 1
    ? 'Mañana'
    : `${dias} días`;

  // Tasa mostrada en la unidad original para que coincida con la entrada.
  const tasaMostrada = compromiso.tasa > 0
    ? (compromiso.tasaUnidad === 'mensual'
        ? `${Math.round(compromiso.tasa * 100)}% mensual`
        : `${Math.round(tasaEA)}%`)
    : 'sin interés';

  const subtitleParts = [
    `Día ${compromiso.diaPago} · ${frec}`,
    label,
    tasaMostrada,
  ];

  const ordenBadge = ordenEstrategia
    ? `<span class="orden-badge" aria-label="Orden ${ordenEstrategia} en la estrategia">${ordenEstrategia}°</span>`
    : '';

  const esTipoDeuda = esDeuda(tipo);
  const saldada     = esTipoDeuda && saldo <= 0;

  const metaHtml = saldada
    ? `<span class="chip chip-success abono-saldada" role="status">Saldada</span>`
    : `<p class="list-item__amount">${f(saldo)}</p>
       ${esTipoDeuda
         ? `<button class="btn btn-primary btn-sm abono-btn"
                    data-action="abrir-abono"
                    data-id="${_esc(compromiso.id)}"
                    aria-label="Abonar a ${desc}">Abonar</button>`
         : ''}`;

  const accionHtml = saldada
    ? `<button class="btn btn-ghost btn-icon"
               data-action="archivar-compromiso"
               data-id="${_esc(compromiso.id)}"
               title="Archivar"
               aria-label="Archivar deuda saldada ${desc}">✓</button>`
    : `<button class="btn btn-ghost btn-icon"
               data-action="eliminar-compromiso"
               data-id="${_esc(compromiso.id)}"
               aria-label="Eliminar deuda ${desc}">✕</button>`;

  return `
    <article class="list-item" data-id="${_esc(compromiso.id)}">
      <div class="list-item__icon" aria-hidden="true">${ordenBadge || icono}</div>
      <div class="list-item__body">
        <p class="list-item__title">${desc}
          <span class="${chipClase}" aria-label="Vence en ${diasLabel}">${diasLabel}</span>
        </p>
        <p class="list-item__subtitle">${subtitleParts.join(' · ')}</p>
        <p class="list-item__hint">Saldo: ${f(saldo)} · Cuota: ${f(cuota)}/mes</p>
      </div>
      <div class="list-item__meta">
        ${metaHtml}
      </div>
      <div class="list-item__action">
        ${accionHtml}
      </div>
    </article>`;
}

// ── FORMULARIO MODAL: ABONAR A DEUDA (ADR 002) ───────────────────

/**
 * Devuelve el HTML del formulario para registrar un abono a una deuda.
 * Si no hay cuentas activas, devuelve un estado vacío con instrucción.
 * @param {import('../../core/state.js').Compromiso} deuda
 * @returns {string}
 */
export function renderFormAbono(deuda) {
  const cuentas = S.cuentas.filter(c => c.activa !== false);
  if (cuentas.length === 0) {
    return `
      <div class="empty-state">
        <p class="empty-state__desc">Necesitás tener al menos una cuenta activa para registrar un abono.</p>
        <div class="modal__footer">
          <button type="button" class="btn btn-ghost" data-action="modal-close">Cerrar</button>
        </div>
      </div>`;
  }

  const saldo = Number(deuda.saldoTotal) || 0;
  const cuota = Number(deuda.cuotaMensual) || 0;
  const cuentaOpts = cuentas.map(c =>
    `<option value="${_esc(c.id)}">${_esc(c.nombre)}</option>`
  ).join('');
  const fechaHoy = new Date().toISOString().slice(0, 10);

  return `
    <form id="form-abono" novalidate
          data-saldo="${saldo}"
          data-cuota="${cuota}">
      <input type="hidden" name="compromisoId" value="${_esc(deuda.id)}" />

      <p class="form-hint form-hint--muted">
        Saldo pendiente de <strong>${_esc(deuda.descripcion)}</strong>:
        <strong>${f(saldo)}</strong>
      </p>

      <div class="form-group">
        <label for="abono-monto" class="label">Monto del abono (COP)</label>
        <input id="abono-monto" name="monto" class="input" type="number"
               min="1" step="10000" placeholder="0"
               required aria-required="true"
               autocomplete="off" inputmode="numeric" />
        <p class="form-hint form-hint--muted">Máximo ${f(saldo)}. Si abonás más, se ajusta al saldo pendiente.</p>
        <p id="abono-tip-proyeccion" class="form-hint form-hint--muted" aria-live="polite"></p>
      </div>

      <div class="form-group">
        <label for="abono-cuenta" class="label">¿De qué cuenta sale la plata?</label>
        <select id="abono-cuenta" name="cuentaId" class="input"
                required aria-required="true">
          <option value="">Elegí una cuenta</option>
          ${cuentaOpts}
        </select>
        <p id="abono-saldo-disponible" class="form-hint form-hint--muted" aria-live="polite">
          Elegí una cuenta para ver el saldo disponible.
        </p>
      </div>

      <div class="form-group">
        <label for="abono-fecha" class="label">Fecha del abono</label>
        <input id="abono-fecha" name="fecha" class="input" type="date"
               value="${_esc(fechaHoy)}" required aria-required="true" />
      </div>

      <div class="form-group">
        <label for="abono-nota" class="label">Nota (opcional)</label>
        <input id="abono-nota" name="nota" class="input" type="text"
               placeholder="Ej. Cuota extra de mayo" autocomplete="off" />
      </div>

      <div class="modal__footer">
        <button type="button" class="btn btn-ghost" data-action="modal-close">Cancelar</button>
        <button type="submit" class="btn btn-primary">Registrar abono</button>
      </div>
    </form>`;
}

function _renderEmptyState() {
  return `
    <div class="empty-state">
      <p class="empty-state__icon" aria-hidden="true">💳</p>
      <p class="empty-state__title">Sin deudas registradas</p>
      <p class="empty-state__desc">Agregá tus créditos con entidad (banco, tarjeta) o personales (familiar, gota a gota). Finko te muestra el orden óptimo de pago según la estrategia que elijas.</p>
      <button class="btn btn-primary" data-action="nuevo-compromiso">+ Agregar deuda</button>
      <p class="empty-state__tip">💡 Tip: los gastos fijos recurrentes (arriendo, servicios) se agregan desde la sección Agenda.</p>
    </div>`;
}

// ── FORMULARIO DEL MODAL: PASO 1 - CHOOSER ───────────────────────

/**
 * Devuelve el HTML del paso 1 del modal: dos botones grandes para elegir
 * si la deuda es con entidad o personal. Al hacer click en uno, index.js
 * oculta este paso y muestra el formulario tailored (paso 2).
 *
 * @returns {string}
 */
export function renderChooserCompromiso() {
  return `
    <p class="comp-chooser__pregunta">¿Con quién es la deuda?</p>
    <div class="comp-chooser" role="group" aria-label="Elegir tipo de deuda">
      <button type="button" class="comp-chooser__btn"
              data-action="comp-elegir-tipo" data-tipo="deuda-entidad"
              aria-label="Deuda con entidad: banco, fintech, tarjeta de crédito">
        <span class="comp-chooser__icon" aria-hidden="true">🏦</span>
        <strong class="comp-chooser__label">Entidad</strong>
        <span class="comp-chooser__desc">
          Banco, fintech, tarjeta de crédito, ICETEX.
          La tasa va en % EA (anual efectivo).
        </span>
      </button>
      <button type="button" class="comp-chooser__btn"
              data-action="comp-elegir-tipo" data-tipo="deuda-personal"
              aria-label="Deuda personal: familiar, amigo o prestamista particular">
        <span class="comp-chooser__icon" aria-hidden="true">🤝</span>
        <strong class="comp-chooser__label">Personal</strong>
        <span class="comp-chooser__desc">
          Familiar, amigo, natillera o prestamista particular.
          La tasa en % mensual es opcional.
        </span>
      </button>
    </div>
    <div class="modal__footer">
      <button type="button" class="btn btn-ghost" data-action="modal-close">Cancelar</button>
    </div>`;
}

// ── FORMULARIO DEL MODAL: PASO 2 - FORM TAILORED ─────────────────

/**
 * Devuelve el HTML del formulario tailored para el tipo de deuda elegido.
 *
 * Entidad: tasa EA obligatoria (usura como referencia).
 * Personal: tasa mensual opcional (gota a gota suele cobrar 5-20% mensual).
 *
 * El tipo va en un hidden para que `normalizarCompromiso` lo recoja sin que
 * el usuario tenga que seleccionarlo (ya eligió en el chooser del paso 1).
 *
 * @param {'deuda-entidad'|'deuda-personal'} tipo
 * @returns {string}
 */
export function renderFormDeuda(tipo) {
  const esEntidad = tipo === 'deuda-entidad';
  const frecOpts  = FRECUENCIAS
    .map(fr => `<option value="${_esc(fr)}"${fr === 'Mensual' ? ' selected' : ''}>${_esc(fr)}</option>`)
    .join('');
  const usura = tasaUsuraVigente();

  const tasaLabel = esEntidad
    ? 'Tasa de interés (%)'
    : 'Tasa de interés mensual (%) - opcional';

  const tasaPlaceholder = esEntidad ? '28.5' : '10';

  const tasaHint = esEntidad
    ? `La usura vigente es ~${Math.round(usura.tasa * 100)}% anual (SFC, ${usura.periodo}). Si tu tarjeta o banco supera ese límite, podés reportarlo.`
    : 'Si no cobra interés, dejá en blanco. Los prestamistas particulares (natilleras, persona natural) suelen cobrar entre 5% y 20% mensual.';

  const descPlaceholder = esEntidad
    ? 'Ej. Tarjeta Visa Bancolombia'
    : 'Ej. Préstamo de mamá, Crédito particular';

  return `
    <form id="form-compromiso" novalidate>
      <input type="hidden" name="tipo" value="${_esc(tipo)}" />

      <div class="form-group">
        <label for="comp-descripcion" class="label">¿Cuál es la deuda?</label>
        <input id="comp-descripcion" name="descripcion" class="input" type="text"
               placeholder="${_esc(descPlaceholder)}" required aria-required="true"
               autocomplete="off" />
      </div>

      <div class="form-group">
        <label for="comp-saldo" class="label">¿Cuánto debés en total? (COP)</label>
        <input id="comp-saldo" name="saldoTotal" class="input" type="number"
               min="1" step="10000" placeholder="0" required aria-required="true"
               autocomplete="off" />
        <p class="form-hint">Lo que falta por pagar hoy. Se descuenta de tu patrimonio neto.</p>
      </div>

      <div class="form-group">
        <label for="comp-cuota" class="label">¿Cuánto pagás cada mes? (COP)</label>
        <input id="comp-cuota" name="cuotaMensual" class="input" type="number"
               min="1" step="10000" placeholder="0" required aria-required="true"
               autocomplete="off" />
        <p class="form-hint">La cuota mensual se proyecta al Balance del mes.</p>
      </div>

      <div class="form-group">
        <label for="comp-tasa" class="label">${_esc(tasaLabel)}</label>
        <div class="tasa-input-group">
          <input id="comp-tasa" name="tasa" class="input" type="number"
                 min="0" max="${esEntidad ? '200' : '100'}" step="0.01"
                 placeholder="${_esc(tasaPlaceholder)}"
                 aria-describedby="comp-tasa-hint"
                 ${esEntidad ? 'required aria-required="true"' : ''}
                 autocomplete="off" />
          <input type="hidden" name="tasaUnidad" value="${esEntidad ? 'EA' : 'mensual'}" />
        </div>
        <p id="comp-tasa-hint" class="form-hint">${_esc(tasaHint)}</p>
      </div>

      <div class="form-group">
        <label for="comp-frecuencia" class="label">Frecuencia de pago</label>
        <select id="comp-frecuencia" name="frecuencia" class="input" required aria-required="true">
          ${frecOpts}
        </select>
      </div>

      <div class="form-group">
        <label for="comp-dia" class="label">Día de pago del mes (1-31)</label>
        <input id="comp-dia" name="diaPago" class="input" type="number"
               min="1" max="31" step="1" placeholder="1" required aria-required="true" />
      </div>

      <div class="modal__footer">
        <button type="button" class="btn btn-ghost"
                data-action="comp-volver-chooser">← Volver</button>
        <button type="submit" class="btn btn-primary">Guardar deuda</button>
      </div>
    </form>`;
}

// ── ESTRATEGIA DE PAGO (F.4) ─────────────────────────────────────

/**
 * Estado UI exportado para que index.js pueda actualizarlo desde handlers.
 */
export function setEstrategiaUI(patch) {
  if (patch.extraMensual !== undefined) {
    const n = Number(patch.extraMensual);
    _uiEstrategia.extraMensual = Number.isFinite(n) && n >= 0 ? n : 0;
  }
  if (patch.estrategia === 'avalancha' || patch.estrategia === 'bolaNieve') {
    _uiEstrategia.estrategia = patch.estrategia;
  }
  if (patch.expandidoExtra !== undefined) {
    _uiEstrategia.expandidoExtra = Boolean(patch.expandidoExtra);
  }
}

export function getEstrategiaUI() {
  return { ..._uiEstrategia };
}

/**
 * Renderiza la card de estrategia de pago en `#estrategia-pago`.
 *
 * v6: ahora vive arriba de la lista de deudas y aparece con cualquier cantidad
 * de deudas pagables (≥ 1). El selector Avalancha solo es relevante si hay
 * tasa > 0 en al menos una deuda; si no, se sugiere directamente Bola de Nieve.
 *
 * El orden definido por la estrategia se aplica también a `renderListaCompromisos`.
 */
export function renderEstrategiaPago() {
  const el = document.getElementById('estrategia-pago');
  if (!el) return;

  const deudas = filtrarDeudasPagables(S.compromisos);
  if (deudas.length === 0) {
    el.innerHTML = '';
    return;
  }
  // v7.6: con 1 sola deuda no hay nada que comparar entre estrategias.
  // Mostramos un mensaje útil en vez de cards sin recomendación posible.
  if (deudas.length === 1) {
    const d = deudas[0];
    el.innerHTML = `
      <article class="estrategia-card">
        <header class="estrategia-card__header">
          <h2 class="estrategia-card__title">💡 Estrategia de pago</h2>
        </header>
        <p class="estrategia-card__placeholder">
          Tenés una sola deuda activa (<strong>${_esc(d.descripcion)}</strong>).
          Cuando tengas dos o más, Finko te recomendará la mejor estrategia
          para pagarlas (Avalancha vs Bola de nieve).
        </p>
      </article>`;
    return;
  }

  const hayTasaPositiva = deudas.some(d => d.tasaEA > 0);
  // No forzamos cambio si avalancha no aplica: respetamos la elección del usuario
  // y mostramos un mensaje "no aplica" en el detalle (más educativo que cambiar
  // a sus espaldas).

  const { extraMensual, estrategia, expandidoExtra } = _uiEstrategia;
  const recomendacion = recomendarEstrategia(deudas);

  el.innerHTML = `
    <article class="estrategia-card">
      <header class="estrategia-card__header">
        <h2 class="estrategia-card__title">💡 Estrategia de pago</h2>
        <p class="estrategia-card__subtitle">
          Finko te ayuda a tomar mejores decisiones con tus deudas.
        </p>
      </header>

      <div class="estrategia-cards" role="group" aria-label="Elegí una estrategia">
        ${_renderCardEstrategia('avalancha', estrategia, recomendacion, hayTasaPositiva)}
        ${_renderCardEstrategia('bolaNieve', estrategia, recomendacion, true)}
      </div>

      ${_renderDetalleEstrategia(estrategia, recomendacion, deudas, extraMensual, hayTasaPositiva)}

      ${_renderAcordeonExtra(expandidoExtra, extraMensual, estrategia, deudas)}
    </article>`;
}

const _META_ESTRATEGIA = {
  avalancha: { icono: '🏔️', nombre: 'Avalancha' },
  bolaNieve: { icono: '⚪', nombre: 'Bola de nieve' },
};

// Resúmenes integrados (mecanismo + ideal en 1 párrafo). La razón de
// recomendación se prepende solo cuando la estrategia es la recomendada.
const _RESUMEN_ESTRATEGIA = {
  avalancha: 'Atacás primero la deuda con la tasa más alta, así cada peso va más al capital y menos a intereses. Puede que la primera deuda tarde un poco más en cerrarse, pero a la larga ahorrás más dinero.',
  bolaNieve: 'Atacás primero la deuda más chica; cuando la terminás, esa cuota se suma a la siguiente, generando un efecto acumulativo (la "bola" que crece). Ideal si necesitás ver progreso rápido para mantener el impulso.',
};

/**
 * Renderiza una card seleccionable de estrategia. Si `recomendacion.estrategia`
 * coincide, muestra "✨ Recomendada para vos" como subtítulo interno.
 *
 * NOTA: la card NUNCA está `disabled`. Cuando una estrategia no aplica con
 * las deudas actuales (Avalancha sin deudas con interés), igual es clicable
 * y el detalle muestra un mensaje explicativo. Esto es más educativo que
 * un botón gris no clicable (especialmente en mobile, donde tooltips no funcionan).
 */
function _renderCardEstrategia(tipo, activa, recomendacion, habilitada) {
  const meta = _META_ESTRATEGIA[tipo];
  const seleccionada = activa === tipo;
  const recomendada  = recomendacion.estrategia === tipo;
  const aria = seleccionada ? 'true' : 'false';
  const claseActiva   = seleccionada ? ' estrategia-card-pick--activa' : '';
  const claseInactiva = habilitada   ? '' : ' estrategia-card-pick--inactiva';
  const subtituloHtml = recomendada
    ? '<span class="estrategia-card-pick__sub">✨ Recomendada para vos</span>'
    : '<span class="estrategia-card-pick__sub estrategia-card-pick__sub--ghost" aria-hidden="true">&nbsp;</span>';
  return `
    <button type="button"
            class="estrategia-card-pick${claseActiva}${claseInactiva}"
            data-action="elegir-estrategia"
            data-estrategia="${tipo}"
            aria-pressed="${aria}">
      <span class="estrategia-card-pick__icono" aria-hidden="true">${meta.icono}</span>
      <strong class="estrategia-card-pick__nombre">${meta.nombre}</strong>
      ${subtituloHtml}
    </button>`;
}

/**
 * Muestra 2 bloques de la estrategia seleccionada:
 *   1. Resumen ("✨ Por qué te conviene" si es recomendada, "ℹ️ Cómo funciona" si no)
 *      → integra razón (si recomendada) + mecanismo + ideal en 1 párrafo
 *   2. 📊 Tu impacto (métricas concretas en orden consistente entre estrategias)
 *
 * Caso especial: si la estrategia elegida no aplica (Avalancha sin tasa > 0),
 * mostramos un mensaje educativo en lugar de los 2 bloques.
 *
 * Si no hay ninguna seleccionada, muestra un placeholder.
 */
function _renderDetalleEstrategia(estrategia, recomendacion, deudas, extraMensual, hayTasaPositiva) {
  if (!estrategia) {
    return `
      <p class="estrategia-card__placeholder">
        Tocá una estrategia para ver el detalle y cómo te ayuda.
      </p>`;
  }
  // Caso: Avalancha sin sentido → solo el mensaje "no aplica".
  if (estrategia === 'avalancha' && !hayTasaPositiva) {
    return _renderNoAplica('avalancha');
  }

  const esRecomendada = recomendacion.estrategia === estrategia;
  const resumenHtml = _renderResumenEstrategia(estrategia, esRecomendada, recomendacion);

  const resultado = compararEstrategias(deudas, extraMensual);
  const impactoHtml = estrategia === 'avalancha'
    ? _renderImpactoAvalancha(resultado, extraMensual)
    : _renderImpactoBolaNieve(resultado, deudas, extraMensual);

  return `
    <div class="estrategia-card__detalle">
      ${resumenHtml}
      <div class="estrategia-card__bloque">
        <p class="estrategia-card__bloque-titulo">📊 Tu impacto</p>
        ${impactoHtml}
      </div>
    </div>`;
}

/**
 * Renderiza el bloque-resumen único que integra razón (si es recomendada) +
 * mecanismo + ideal en 1 párrafo. El título cambia: "Por qué te conviene"
 * para la recomendada (vendiendo) vs "Cómo funciona" para la otra (explicando).
 */
function _renderResumenEstrategia(tipo, esRecomendada, recomendacion) {
  const titulo = esRecomendada ? '✨ Por qué te conviene' : 'ℹ️ Cómo funciona';
  const razon  = esRecomendada && recomendacion.razon ? `${recomendacion.razon} ` : '';
  const cuerpo = `${razon}${_RESUMEN_ESTRATEGIA[tipo]}`;
  return `
    <div class="estrategia-card__bloque">
      <p class="estrategia-card__bloque-titulo">${titulo}</p>
      <p class="estrategia-card__bloque-body">${_esc(cuerpo)}</p>
    </div>`;
}

/**
 * Mensaje educativo cuando una estrategia elegida no aplica con las deudas
 * actuales. Reemplaza completamente el bloque de detalle (sin métricas: no
 * tienen sentido si la estrategia no aplica).
 */
function _renderNoAplica(estrategia) {
  if (estrategia === 'avalancha') {
    return `
      <div class="estrategia-card__no-aplica" role="status">
        <p class="estrategia-card__bloque-titulo">🔒 No aplica con tus deudas actuales</p>
        <p class="estrategia-card__bloque-body">
          Avalancha solo tiene sentido si hay al menos una deuda con tasa de interés mayor a 0.
          Actualmente todas tus deudas son sin interés, así que cualquier orden de pago da el mismo resultado.
        </p>
        <p class="estrategia-card__bloque-body">
          <strong>Sugerencia:</strong> usá Bola de nieve para cerrar primero la más chica.
        </p>
      </div>`;
  }
  return '';
}

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
function _renderImpactoAvalancha(resultado, extraMensual) {
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
function _renderImpactoBolaNieve(resultado, deudas, extraMensual) {
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
           ${_formatearDuracion(primera.mesPagado)}
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
 * Acordeón opcional para pagar extra cada mes. Colapsado por defecto.
 * Cuando se expande, muestra el input y recalcula el detalle.
 */
function _renderAcordeonExtra(abierto, extraMensual, estrategia, deudas) {
  void estrategia; void deudas;
  if (!abierto) {
    return `
      <button type="button"
              class="estrategia-card__link"
              data-action="toggle-extra-estrategia"
              aria-expanded="false">
        💪 ¿Podés pagar algo extra cada mes? Calculá el impacto
      </button>`;
  }
  return `
    <div class="estrategia-card__acordeon">
      <div class="estrategia-card__acordeon-header">
        <p class="estrategia-card__acordeon-titulo">
          💪 Pagá un extra cada mes
        </p>
        <button type="button"
                class="btn btn-ghost btn-icon estrategia-card__acordeon-cerrar"
                data-action="toggle-extra-estrategia"
                aria-expanded="true"
                aria-label="Cerrar">✕</button>
      </div>
      <p class="estrategia-card__acordeon-desc">
        Cualquier monto adicional acelera el cierre y ahorra intereses.
        Probá con $50.000 y mirá la diferencia arriba.
      </p>
      <div class="form-group">
        <label for="estrategia-extra" class="label">Pago extra mensual (COP)</label>
        <input id="estrategia-extra" class="input" type="number"
               min="0" step="10000" value="${extraMensual}"
               placeholder="0" autocomplete="off" inputmode="numeric"
               data-action="cambiar-extra-estrategia" />
      </div>
    </div>`;
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
    if (hayAhorroTiempo)    partes.push(`<strong>${_formatearDuracion(ahorroMeses)}</strong>`);
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
function _formatearDuracion(meses) {
  const m = Math.max(0, Math.round(Number(meses) || 0));
  if (m < 12) return `${m} ${m === 1 ? 'mes' : 'meses'}`;
  const anios = Math.floor(m / 12);
  const resto = m % 12;
  const aTxt  = `${anios} ${anios === 1 ? 'año' : 'años'}`;
  if (resto === 0) return aTxt;
  const mTxt = `${resto} ${resto === 1 ? 'mes' : 'meses'}`;
  return `${aTxt} ${mTxt}`;
}

// ── DASHBOARD: PANEL VENCIDOS ────────────────────────────────────

/**
 * Renderiza en `#panel-vencidos` la lista de compromisos vencidos del mes
 * (fijo, deuda, agenda con día de pago ya pasado). Vacío si no hay nada,
 * y limpia el panel para no ocupar espacio.
 *
 * Muestra hasta `MAX_VISIBLES` items inicialmente; el resto queda accesible
 * por scroll vertical interno (max-height en CSS) para no inflar el dashboard.
 *
 * No-op si el contenedor no existe.
 */
export function renderPanelVencidos() {
  const el = document.getElementById('panel-vencidos');
  if (!el) return;

  const vencidos = detectarVencidosCompletos(S.compromisos, _hoyISOLocal());

  if (vencidos.length === 0) {
    el.innerHTML = '';
    return;
  }

  const n      = vencidos.length;
  const titulo = n === 1
    ? '1 pendiente del mes'
    : `${n} pendientes del mes`;

  const items = vencidos.map(v => {
    const tipo  = v.tipo ?? 'fijo';
    const icono = _esc(ICONO_TIPO[tipo] ?? '🔁');
    const desc  = _esc(v.descripcion);
    const monto = f(v.monto);
    const dias  = v.diasAtraso;
    const cuando = dias === 0 ? 'hoy'
      : dias === 1            ? 'ayer'
      :                         `hace ${dias} días`;
    return `
      <li class="vencidos-card__item vencidos-card__item--${v.severidad}">
        <span class="vencidos-card__icon cal-dot--${tipo}" aria-hidden="true">${icono}</span>
        <div class="vencidos-card__body">
          <p class="vencidos-card__name">${desc}</p>
          <p class="vencidos-card__sub">venció ${cuando}</p>
        </div>
        <p class="vencidos-card__amount">${monto}</p>
      </li>`;
  }).join('');

  el.innerHTML = `
    <section class="vencidos-card" aria-label="Compromisos vencidos">
      <header class="vencidos-card__header">
        <h2 class="vencidos-card__title">⚠️ ${titulo}</h2>
        <a href="#compromisos" class="vencidos-card__link"
           aria-label="Ir a compromisos">Gestionar</a>
      </header>
      <ul class="vencidos-card__list" role="list">
        ${items}
      </ul>
    </section>`;
}

// ── DASHBOARD: PANEL PRÓXIMAS PRIORIDADES ────────────────────────

/**
 * Renderiza en `#panel-prioridades` los compromisos de los próximos 7 días,
 * agrupados por día (HOY → mañana → en N días). Reemplaza a Card Hoy
 * unificando hoy + próximos en una sola sección.
 *
 * Si no hay compromisos activos, limpia el panel (sin ruido para usuarios
 * nuevos). Si hay activos pero ninguno en 7 días, muestra "Sin compromisos
 * próximos. 🎉".
 *
 * No-op si el contenedor no existe.
 */
export function renderPanelPrioridades() {
  const el = document.getElementById('panel-prioridades');
  if (!el) return;

  const activos = compromisosActivos(S.compromisos);
  if (activos.length === 0) {
    el.innerHTML = '';
    return;
  }

  const proximos = compromisosProximos(S.compromisos, 7);
  const grupos   = agruparPorDiasRestantes(proximos);

  let bodyHtml;
  if (grupos.length === 0) {
    bodyHtml = `<p class="prioridades-card__empty">Sin compromisos próximos. 🎉</p>`;
  } else {
    bodyHtml = grupos.map(g => {
      const items = g.items.map(c => {
        const tipo  = c.tipo ?? 'fijo';
        const icono = _esc(ICONO_TIPO[tipo] ?? '🔁');
        const desc  = _esc(c.descripcion ?? '(sin descripción)');
        const monto = Number.isFinite(Number(c.monto)) ? f(Number(c.monto)) : '';
        return `
          <li class="prioridades-card__item">
            <span class="prioridades-card__dot cal-dot--${tipo}" aria-hidden="true">${icono}</span>
            <span class="prioridades-card__name">${desc}</span>
            ${monto ? `<span class="prioridades-card__amount">${monto}</span>` : ''}
          </li>`;
      }).join('');

      const esHoy = g.dias === 0;
      return `
        <div class="prioridades-card__group${esHoy ? ' prioridades-card__group--hoy' : ''}">
          <p class="prioridades-card__group-label">${_esc(g.label)}</p>
          <ul class="prioridades-card__list" role="list">${items}</ul>
        </div>`;
    }).join('');
  }

  el.innerHTML = `
    <section class="prioridades-card" aria-label="Próximas prioridades">
      <header class="prioridades-card__header">
        <h2 class="prioridades-card__title">📅 Próximas prioridades</h2>
        <a href="#agenda" class="prioridades-card__link"
           aria-label="Ir a la agenda">Ver agenda</a>
      </header>
      <div class="prioridades-card__body">
        ${bodyHtml}
      </div>
    </section>`;
}

// ── HELPER ───────────────────────────────────────────────────────

/**
 * Devuelve la fecha local (no UTC) en formato YYYY-MM-DD.
 * Necesario para que el cómputo de "vencido hoy" use el día visible al usuario,
 * no el día UTC. En Colombia (GMT-5), `toISOString` arroja un día más
 * entre 19:00 y 23:59 local.
 */
function _hoyISOLocal() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function _esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

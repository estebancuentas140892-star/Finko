/**
 * tesoreria/view.js - generación de HTML para el módulo de tesorería.
 *
 * Reglas:
 * - Puede leer S. No puede mutarlo.
 * - Devuelve strings HTML o escribe en el DOM (no ambas cosas en la misma función).
 * - Sin lógica de negocio: delegar a logic.js.
 */

import { S } from '../../core/state.js';
import { f, hoy, esc as _esc } from '../../infra/utils.js';
import { icon, emptyArt } from '../../infra/icons.js';
import { bancoAvatar } from '../../infra/bancos.js';
import {
  BANCOS_CO, FRECUENCIAS, CATEGORIAS_INGRESO, CATEGORIA_INGRESO_EMOJI,
  CATEGORIA_AGENDA_EMOJI, CATEGORIA_DEUDA_EMOJI, CATEGORIA_DEUDA_PERSONAL_EMOJI,
} from '../../core/constants.js';
import {
  cuentasActivas,
  calcularCostoGMF,
  detectarNudgeGMF,
  FRECUENCIAS_CON_DIA,
  calcularSalarioMinimo,
  detectarNudgeProximoIngreso,
  estimarSalarioMensual,
  construirContextoDistribucion,
  sugerirDistribucionIngreso,
  PRESETS_DISTRIBUCION,
  esDistribucionPersonalizadaValida,
  construirDesgloseAhorroPorObjetivo,
  construirDesgloseNecesidades,
  presupuestosSobreRemanente,
  construirPlanDeudas,
  construirPlanInversiones,
  construirFilasTransferenciaCuentas,
  estadoDistribucion,
} from './logic.js';

// ── LISTA DE CUENTAS ─────────────────────────────────────────────

/**
 * Renderiza la lista de cuentas en `#lista-tesoreria`.
 * No-op si el contenedor no existe (sección no montada).
 */
export function renderListaCuentas() {
  const el = document.getElementById('lista-tesoreria');
  if (!el) return;

  const cuentas = cuentasActivas(S.cuentas);
  el.innerHTML = cuentas.length === 0
    ? _renderEmptyState()
    : cuentas.map(_renderCuentaItem).join('');
}

/**
 * @param {import('../../core/state.js').Cuenta} cuenta
 * @returns {string}
 */
function _renderCuentaItem(cuenta) {
  const nombre   = _esc(cuenta.nombre);
  const banco    = _esc(cuenta.banco);
  const tipo     = _esc(cuenta.tipo);
  const subtitulo = banco === tipo ? banco : `${banco} · ${tipo}`;

  // Si la cuenta tiene cuota de manejo, mostramos un hint adicional para que
  // el usuario sepa que hay un compromiso vinculado descontandose mes a mes.
  const cuotaHint = cuenta.cuotaManejo
    ? `<p class="list-item__hint">📅 Cuota de manejo: ${f(cuenta.cuotaManejo.monto)} el día ${cuenta.cuotaManejo.diaCobro}</p>`
    : '';

  // Hint informativo si la cuenta está sujeta al GMF (4x1000).
  const gmfHint = cuenta.aplica4x1000
    ? `<p class="list-item__hint">💸 Aplica 4x1000 (GMF)</p>`
    : '';

  return `
    <article class="list-item" data-id="${_esc(cuenta.id)}">
      <div class="list-item__icon" aria-hidden="true">${_bankAvatarHtml(cuenta.banco)}</div>
      <div class="list-item__body">
        <p class="list-item__title">${nombre}</p>
        <p class="list-item__subtitle">${subtitulo}</p>
        ${cuotaHint}
        ${gmfHint}
      </div>
      <div class="list-item__meta">
        <p class="list-item__value">${f(cuenta.saldo)}</p>
      </div>
      <div class="list-item__action">
        <button class="btn btn-ghost btn-icon"
                data-action="editar-cuenta"
                data-id="${_esc(cuenta.id)}"
                aria-label="Editar cuenta ${nombre}"><svg class="icon" aria-hidden="true"><use href="#i-edit"/></svg></button>
        <button class="btn btn-ghost btn-icon"
                data-action="eliminar-cuenta"
                data-id="${_esc(cuenta.id)}"
                aria-label="Eliminar cuenta ${nombre}"><svg class="icon" aria-hidden="true"><use href="#i-trash"/></svg></button>
      </div>
    </article>`;
}

function _renderEmptyState() {
  return `
    <div class="empty-state">
      <div class="empty-state__icon">${emptyArt('cuentas')}</div>
      <p class="empty-state__title">Agrega tu primera cuenta</p>
      <p class="empty-state__desc">Bancaria, billetera digital o efectivo: verás tu saldo real en Inicio.</p>
      <button class="btn btn-primary" data-action="nueva-cuenta">+ Agregar cuenta</button>
      <p class="empty-state__tip">${icon('lightbulb')} Tip: Nequi, Daviplata y el efectivo también cuentan. Todo lo que tienes, en un solo lugar.</p>
    </div>`;
}

// ── INGRESOS RECURRENTES ─────────────────────────────────────────

/**
 * Renderiza la lista de ingresos activos en `#lista-ingresos`.
 * No-op si el contenedor no existe.
 */
export function renderListaIngresos() {
  const el = document.getElementById('lista-ingresos');
  if (!el) return;

  const ingresos = Array.isArray(S.ingresos)
    ? S.ingresos.filter(i => i.activo !== false)
    : [];

  el.innerHTML = ingresos.length === 0
    ? _renderEmptyStateIngresos()
    : ingresos.map(_renderIngresoItem).join('');
}

function _renderEmptyStateIngresos() {
  return `
    <div class="empty-state empty-state--small">
      <p class="empty-state__desc">Sin fuentes de ingreso registradas. Agrega tu salario u otras fuentes para ver tu tasa de ahorro.</p>
    </div>`;
}

/**
 * @param {import('../../core/state.js').Ingreso} ing
 * @returns {string}
 */
function _renderIngresoItem(ing) {
  const desc = _esc(ing.descripcion);
  const frec = _esc(ing.frecuencia);
  const catLabel = ing.categoria
    ? ` · ${CATEGORIA_INGRESO_EMOJI[ing.categoria] ?? ''} ${_esc(ing.categoria)}`
    : '';

  let diaHint = '';
  if (ing.diaPago) {
    const diaStr = ing.frecuencia === 'Quincenal'
      ? `días ${ing.diaPago} y ${ing.diaPago + 15} de cada mes`
      : `día ${ing.diaPago} de cada período`;
    diaHint = `<p class="list-item__hint">📅 ${_esc(diaStr)}</p>`;
  }

  return `
    <article class="list-item" data-id="${_esc(ing.id)}">
      <div class="list-item__body">
        <p class="list-item__title">${desc}</p>
        <p class="list-item__subtitle">${frec}${catLabel}</p>
        ${diaHint}
      </div>
      <div class="list-item__meta">
        <p class="list-item__value">${f(ing.monto)}</p>
      </div>
      <div class="list-item__action">
        <button class="btn btn-ghost btn-icon"
                data-action="editar-ingreso"
                data-id="${_esc(ing.id)}"
                aria-label="Editar ${desc}"><svg class="icon" aria-hidden="true"><use href="#i-edit"/></svg></button>
        <button class="btn btn-ghost btn-icon"
                data-action="eliminar-ingreso"
                data-id="${_esc(ing.id)}"
                aria-label="Eliminar ${desc}"><svg class="icon" aria-hidden="true"><use href="#i-trash"/></svg></button>
      </div>
    </article>`;
}

/**
 * Devuelve el HTML del formulario de nuevo/editar ingreso.
 * @param {import('../../core/state.js').Ingreso|null} [ingreso]
 * @returns {string}
 */
export function renderFormIngreso(ingreso = null) {
  const frecOpts = FRECUENCIAS
    .map(fr => `<option value="${_esc(fr)}"${ingreso?.frecuencia === fr ? ' selected' : ''}>${_esc(fr)}</option>`)
    .join('');

  const catOpts = CATEGORIAS_INGRESO
    .map(c => `<option value="${_esc(c)}"${ingreso?.categoria === c ? ' selected' : ''}>${CATEGORIA_INGRESO_EMOJI[c] ?? ''} ${_esc(c)}</option>`)
    .join('');

  const esSalarioMin = ingreso?.categoria === 'Salario mínimo';
  const { smmlv, auxilio } = calcularSalarioMinimo(true);

  return `
    <form id="form-ingreso" novalidate>
      <div class="form-group">
        <label for="ingreso-cat" class="label">Categoría</label>
        <select id="ingreso-cat" name="categoria" class="input">
          <option value="">Seleccionar…</option>
          ${catOpts}
        </select>
      </div>
      <div class="form-group">
        <label for="ingreso-desc" class="label">Descripción</label>
        <input id="ingreso-desc" name="descripcion" class="input" type="text"
               value="${ingreso ? _esc(ingreso.descripcion) : ''}"
               placeholder="Ej. Salario empresa, Arriendo apartamento"
               required aria-required="true" autocomplete="off" />
      </div>
      <div id="form-group-salario-min" class="form-group form-group--checkbox"${esSalarioMin ? '' : ' hidden'}>
        <label class="checkbox-row">
          <input type="checkbox" id="ingreso-subsidio" name="conSubsidio" />
          <span>Recibo subsidio de transporte</span>
        </label>
        <p class="form-hint form-hint--muted">
          SMMLV ${f(smmlv)} + auxilio ${f(auxilio)} = ${f(smmlv + auxilio)}.
          Si marcas esta opción, Finko ajusta el monto automáticamente.
        </p>
      </div>
      <div class="form-group">
        <label for="ingreso-monto" class="label">Monto (COP)</label>
        <input id="ingreso-monto" name="monto" class="input" type="number"
               min="1" step="10000" placeholder="0"
               value="${ingreso ? ingreso.monto : ''}"
               required aria-required="true" inputmode="numeric" />
      </div>
      <div class="form-group">
        <label for="ingreso-frec" class="label">Frecuencia</label>
        <select id="ingreso-frec" name="frecuencia" class="input" required aria-required="true">
          <option value="">Seleccionar…</option>
          ${frecOpts}
        </select>
      </div>
      <div class="form-group" id="form-group-dia-pago"${ingreso && FRECUENCIAS_CON_DIA.includes(ingreso.frecuencia) ? '' : ' hidden'}>
        <label for="ingreso-dia-pago" class="label" id="label-dia-pago">${ingreso?.frecuencia === 'Quincenal' ? 'Día de la primera quincena (1-15)' : 'Día de pago (1-31)'}</label>
        <input id="ingreso-dia-pago" name="diaPago" class="input" type="number"
               min="1" max="${ingreso?.frecuencia === 'Quincenal' ? '15' : '31'}" step="1"
               placeholder="${ingreso?.frecuencia === 'Quincenal' ? 'Ej. 15' : 'Ej. 30'}"
               value="${ingreso?.diaPago ?? ''}"
               inputmode="numeric" />
        <p class="form-hint form-hint--muted">Opcional. ¿Qué día sueles recibir este pago?</p>
      </div>
      <div class="modal__footer">
        <button type="button" class="btn btn-ghost" data-action="modal-close">Cancelar</button>
        <button type="submit" class="btn btn-primary">${ingreso ? 'Actualizar' : 'Guardar'}</button>
      </div>
    </form>`;
}

// ── NUDGE PRÓXIMO INGRESO ────────────────────────────────────────

/**
 * Renderiza la alerta de próximo pago en `#ingresos-nudge-proximo`.
 * No-op si el contenedor no existe o no hay ingresos con próximo pago calculable.
 */
export function renderNudgeProximoIngreso() {
  const el = document.getElementById('ingresos-nudge-proximo');
  if (!el) return;
  const ingresos = Array.isArray(S.ingresos) ? S.ingresos : [];
  const nudge    = detectarNudgeProximoIngreso(ingresos);
  el.innerHTML   = nudge ? _renderNudgeProximo(nudge) : '';
}

/** Formatea una fecha ISO como texto corto en español: "30 jun", "1 jul". */
function _fechaCorta(iso) {
  const d = new Date(`${iso}T12:00:00Z`);
  return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', timeZone: 'UTC' });
}

/**
 * @param {{ principal: {descripcion: string, dias: number, fechaISO: string},
 *            otrosProximos: number }} nudge
 * @returns {string}
 */
function _renderNudgeProximo({ principal, otrosProximos }) {
  const { descripcion, dias, fechaISO } = principal;
  const urgencia  = dias === 0 ? 'hoy' : dias === 1 ? 'mañana' : `en ${dias} días`;
  const cuandoStr = dias <= 1 ? urgencia : `${urgencia} (${_fechaCorta(fechaISO)})`;
  const otrosHtml = otrosProximos > 0
    ? `<p class="nudge__desc">y ${otrosProximos} ${otrosProximos === 1 ? 'ingreso más próximo' : 'ingresos más próximos'} esta semana</p>`
    : '';
  return `
    <div class="nudge nudge-info" role="status">
      <span class="nudge__icon" aria-hidden="true">${icon('saldo')}</span>
      <div class="nudge__body">
        <p class="nudge__title">Recibes "${_esc(descripcion)}" ${cuandoStr}</p>
        ${otrosHtml}
      </div>
    </div>`;
}

// ── DISTRIBUCIÓN ADAPTATIVA ──────────────────────────────────────

/**
 * Renderiza la tarjeta de distribución sugerida en `#ingresos-distribucion`.
 * No-op si no hay ingresos mensuales registrados o el contenedor no existe.
 */
export function renderDistribucionIngreso() {
  const el = document.getElementById('ingresos-distribucion');
  if (!el) return;

  const ingresoMensual = estimarSalarioMensual(S.ingresos ?? []);
  if (!ingresoMensual) { el.innerHTML = ''; return; }

  // El contexto de la distribución (la "realidad registrada") lo centraliza
  // `construirContextoDistribucion`, compartido con Límites de gasto (MC.5).
  const contexto = construirContextoDistribucion(S);
  const { presetId, distribucionPersonalizada } = contexto;

  const dist = sugerirDistribucionIngreso(ingresoMensual, contexto);

  // Checklist accionable de Necesidades (Paso 1 del asistente, MC.7d, ADR 018
  // revisión 2026-07-02): el usuario marca cuáles cubre con este ingreso; al
  // confirmar, cada marca registra el mismo pago que su flujo individual.
  const itemsNecesidades = construirDesgloseNecesidades(S.compromisos ?? [], S.gastos ?? []);

  // Presupuestos sobre el remanente real (R3): el punto de partida asume el
  // estado inicial del checklist (todo lo no pagado llega marcado); index.js
  // los recalcula en vivo cuando cambian las marcas o el monto.
  const necesidadesIniciales = itemsNecesidades
    .filter(it => !it.pagado)
    .reduce((s, it) => s + it.monto, 0);
  const presupuestos = presupuestosSobreRemanente(
    ingresoMensual, necesidadesIniciales, dist.split.ahorro.pct, dist.split.estiloVida.pct,
  );

  // Destinos fondeables del grupo Ahorro para "Distribuir mi ingreso" (MC.4a):
  // fondo de emergencia (si está activo), metas y apartados aún no completados,
  // con un aporte sugerido por objetivo (MC.7a/MC.7b, ADR 018) en vez de todo
  // al fondo por defecto.
  const fondo = S.ahorro?.fondoEmergencia;
  const fondoParaPlan = (fondo && fondo.activo)
    ? { activo: true, completado: fondo.completado === true }
    : null;

  const destinosAhorro = construirDesgloseAhorroPorObjetivo({
    metas:        S.metas ?? [],
    apartados:    S.apartados ?? [],
    fondo:        fondoParaPlan,
    budgetAhorro: presupuestos.ahorro,
  });

  // Deudas con saldo pendiente (MC.4b): destinos fondeables vía abono real.
  const deudasPendientes = (S.compromisos ?? [])
    .filter(c => c.activo !== false
      && (c.tipo === 'deuda-entidad' || c.tipo === 'deuda-personal')
      && (Number(c.saldoTotal) || 0) > 0);
  const destinosDeudas = construirPlanDeudas({ deudas: deudasPendientes });

  // Inversiones (MC.4e): cada holding es un destino fondeable; el aporte
  // incrementa su capital. El descuento de la cuenta lo centraliza tesorería.
  const destinosInversiones = construirPlanInversiones({ inversiones: S.inversiones ?? [] });

  // Paso 3 (MC.7e, ADR 018 decisión 4): con 2+ cuentas activas, el usuario
  // puede repartir el Estilo de vida entre ellas (transferencias internas, no
  // gasto). Con una sola cuenta se omite (regla de cuenta única).
  const cuentasParaTransferir = cuentasActivas(S.cuentas ?? []);
  const destinosCuentas = cuentasParaTransferir.length > 1
    ? construirFilasTransferenciaCuentas(cuentasParaTransferir)
    : [];

  // Estado de "Distribuir mi ingreso" (MC.4d): la acción se habilita solo cuando
  // llega el cobro del periodo y aún no se distribuyó (guard de de-duplicación).
  const estadoDist = estadoDistribucion(
    S.ingresos ?? [],
    S.config?.ultimaDistribucionPeriodo ?? null,
  );

  el.innerHTML = dist
    ? _renderDistribucion(dist, presetId, distribucionPersonalizada, {
        montoIngreso:    ingresoMensual,
        ahorroPct:       dist.split.ahorro.pct,
        estiloVidaPct:   dist.split.estiloVida.pct,
        ahorroBudget:    presupuestos.ahorro,
        evBudget:        presupuestos.estiloVida,
        destinosAhorro,
        destinosDeudas,
        destinosInversiones,
        destinosCuentas,
        itemsNecesidades,
        estado:          estadoDist,
      })
    : '';
}

/** Sección a la que enlaza el hint de "sin fecha", según el tipo de objetivo. */
const _SECCION_OBJETIVO = { meta: 'metas', apartado: 'apartados' };

/**
 * Una fila de destino del panel: toggle (incluir) + monto editable. Para deudas
 * muestra el saldo pendiente, para inversiones el capital actual y para
 * cuentas (MC.7e) el saldo actual, todos como contexto. Para metas/apartados
 * sin fecha (`sinFecha`, MC.7a/MC.7b) agrega un hint que invita a ponerle
 * fecha, para que el aporte se pueda calcular la próxima vez.
 * `autoExcedente` (solo la fila del fondo, R3) marca el input con
 * `data-dist-auto` para que index.js re-absorba en vivo el excedente del
 * presupuesto de ahorro mientras el usuario no lo edite a mano.
 *
 * Las filas de tipo 'cuenta' (transferencias de Estilo de vida, MC.7e) arrancan
 * **sin marcar**, a diferencia de las demás: por defecto no se mueve nada (el
 * remanente completo queda en la cuenta de origen, como hoy); el usuario opta
 * por mover dinero a otra cuenta explícitamente.
 *
 * @param {{tipo:string, id:string|null, nombre:string, monto:number, saldoTotal?:number, invertido?:number, saldoActual?:number, sinFecha?:boolean, autoExcedente?:boolean}} d
 * @returns {string}
 */
function _filaDistribuir(d) {
  let sub = '';
  if (d.tipo === 'deuda' && d.saldoTotal != null) {
    sub = ` <span class="distribuir__saldo">saldo ${f(d.saldoTotal)}</span>`;
  } else if (d.tipo === 'inversion' && d.invertido != null) {
    sub = ` <span class="distribuir__saldo">invertido ${f(d.invertido)}</span>`;
  } else if (d.tipo === 'cuenta' && d.saldoActual != null) {
    sub = ` <span class="distribuir__saldo">saldo ${f(d.saldoActual)}</span>`;
  }

  const seccionHint = _SECCION_OBJETIVO[d.tipo];
  const hint = (d.sinFecha && seccionHint)
    ? `<p class="form-hint form-hint--muted distribuir__hint">Ponle una fecha en <a href="#${seccionHint}">${seccionHint === 'metas' ? 'Metas' : 'Apartados'}</a> para calcular cuánto aportar.</p>`
    : '';

  const marcada = d.tipo !== 'cuenta';

  return `
        <div class="distribuir__fila">
          <label class="checkbox-row distribuir__toggle">
            <input type="checkbox" data-dist-destino-toggle ${marcada ? 'checked' : ''} />
            <span>${_esc(d.nombre)}${sub}</span>
          </label>
          <input type="number" class="input distribuir__monto"
                 min="0" step="10000" inputmode="numeric" value="${d.monto}"
                 aria-label="Monto para ${_esc(d.nombre)}"
                 data-dist-tipo="${_esc(d.tipo)}" data-dist-id="${_esc(d.id ?? '')}"${d.autoExcedente ? ' data-dist-auto="1"' : ''}
                 ${marcada ? '' : 'disabled'}
                 data-action="recalcular-distribucion" />
        </div>
        ${hint}`;
}

/** Emoji de una fila de Necesidades: por categoría si existe, si no un genérico por tipo. */
function _emojiNecesidad(it) {
  const porCategoria = it.tipo === 'fijo'
    ? CATEGORIA_AGENDA_EMOJI[it.categoria]
    : (CATEGORIA_DEUDA_EMOJI[it.categoria] ?? CATEGORIA_DEUDA_PERSONAL_EMOJI[it.categoria]);
  return porCategoria ?? (it.tipo === 'fijo' ? '🏠' : '💳');
}

/**
 * Una fila de la checklist de Necesidades (Paso 1, MC.7d, ADR 018 revisión
 * 2026-07-02): checkbox + nombre + día de pago + monto. A diferencia de las
 * filas de Ahorro/Deudas/Inversiones, el monto no es editable: es la cuota
 * real de la obligación, no una asignación libre. Si ya se registró un pago
 * este periodo, aparece marcada, deshabilitada y con "Ya pagado" en vez del
 * monto, para que no se pueda volver a registrar (mismo guard que el badge
 * "Ya pagaste este mes" de Agenda).
 *
 * @param {{id:string, nombre:string, categoria:string|null, tipo:'fijo'|'deuda', monto:number, diaPago:number|null, pagado:boolean}} it
 * @returns {string}
 */
function _filaNecesidad(it) {
  const catSub = it.categoria ? ` <span class="distribuir__nec-item-cat">· ${_esc(it.categoria)}</span>` : '';
  const diaSub = it.diaPago ? ` <span class="distribuir__saldo">día ${it.diaPago}</span>` : '';
  const checkedAttr = it.pagado ? 'checked disabled' : 'checked';

  return `
        <div class="distribuir__fila${it.pagado ? ' distribuir__fila--pagado' : ''}">
          <label class="checkbox-row distribuir__toggle">
            <input type="checkbox" data-nec-toggle data-nec-tipo="${_esc(it.tipo)}"
                   data-nec-id="${_esc(it.id)}" data-nec-monto="${it.monto}" ${checkedAttr} />
            <span>${_emojiNecesidad(it)} ${_esc(it.nombre)}${catSub}${diaSub}</span>
          </label>
          <span class="distribuir__nec-monto">${it.pagado ? 'Ya pagado' : f(it.monto)}</span>
        </div>`;
}

/**
 * Botón "Distribuir mi ingreso" + asistente inline por pasos (ADR 012,
 * MC.4a/b/d/e; ADR 018, MC.7d: shell paginado con confirmación única al final;
 * MC.7e: Paso 3 accionable con 2+ cuentas). El panel arranca oculto; el botón
 * lo despliega ya en el primer paso. Solo se crean los pasos con contenido:
 *
 *   1. Necesidades (R1): checklist accionable; cada marca registra al confirmar
 *      el mismo pago que su flujo individual.
 *   2. Ahorro, deudas e inversiones: filas editables con la sugerencia de
 *      ahorro calculada sobre el remanente real tras las Necesidades marcadas
 *      (R3); abonos extra a deudas por prioridad de pago y aportes a inversiones.
 *   3. Estilo de vida: lo que queda disponible en la cuenta. Con una sola
 *      cuenta activa es puramente informativo (regla de cuenta única); con 2+
 *      cuentas (MC.7e) suma un reparto opcional: transferencias internas hacia
 *      otras cuentas, sin tocar el total del remanente. La confirmación única
 *      aplica todo al final.
 *
 * El monto a distribuir, el indicador de paso y el resumen en vivo quedan fuera
 * de la paginación (visibles en todos los pasos). La navegación avanzar/atrás,
 * el recálculo y el botón "Distribuir" se manejan desde index.js. Devuelve ''
 * si no hay ningún destino fondeable, Necesidad que marcar, ni cuenta a la que
 * repartir Estilo de vida (MC.7e: con 2+ cuentas el reparto es accionable
 * aunque no haya Necesidades/Ahorro/Deudas/Inversiones que mostrar).
 *
 * Gating por fecha (MC.4d): la acción solo aparece cuando el cobro del periodo
 * ya llegó y aún no se distribuyó ('listo') o cuando no hay fecha datable
 * ('sin-fecha', se mantiene disponible). Si ya se distribuyó este periodo
 * ('distribuido') o el cobro aún no llega ('pendiente'), se informa sin botón.
 *
 * @param {{montoIngreso:number, ahorroPct:number, estiloVidaPct:number, ahorroBudget:number, evBudget:number, destinosAhorro:Array, destinosDeudas:Array, destinosInversiones:Array, destinosCuentas?:Array, itemsNecesidades?:Array, estado:{estado:string, periodoISO:string|null, esHoy:boolean}}} d
 * @returns {string}
 */
function _renderPanelDistribuir(d) {
  const { montoIngreso, ahorroPct, estiloVidaPct, ahorroBudget, evBudget } = d;
  const necesidades = d.itemsNecesidades ?? [];
  const ahorro      = d.destinosAhorro ?? [];
  const deudas      = d.destinosDeudas ?? [];
  const inversiones = d.destinosInversiones ?? [];
  const cuentas     = d.destinosCuentas ?? [];
  if (necesidades.length === 0 && ahorro.length === 0 && deudas.length === 0 && inversiones.length === 0 && cuentas.length === 0) return '';

  const est = d.estado?.estado ?? 'sin-fecha';

  // Ya distribuido este periodo: confirmación, sin reabrir el panel (guard MC.4d).
  if (est === 'distribuido') {
    return `<p class="distribuir__hecho" role="status">✓ Ya distribuiste tu ingreso de este periodo.</p>`;
  }
  // El cobro de este periodo aún no llega: la acción se habilita al recibirlo.
  if (est === 'pendiente') {
    return `<p class="distribuir__pendiente form-hint form-hint--muted">💸 Podrás distribuir tu ingreso cuando recibas tu próximo pago.</p>`;
  }

  // 'listo' (o 'sin-fecha' como fallback): la acción está disponible. En 'listo'
  // antecede un nudge con la invitación a distribuir el cobro recién recibido.
  const cta = est === 'listo'
    ? `<p class="distribuir__cta" role="status">💸 ${d.estado.esHoy
        ? 'Hoy recibes tu ingreso.'
        : `Recibiste tu ingreso el ${_fechaCorta(d.estado.periodoISO)}.`} ¿Deseas distribuirlo ahora?</p>`
    : '';

  // Paso 1 (R1): checklist de Necesidades, marcadas por defecto salvo las ya
  // pagadas este periodo (checkbox deshabilitado, "Ya pagado"). Al confirmar,
  // cada marca registra el mismo pago que su flujo individual (ver index.js).
  const seccionNecesidades = `
          <p class="form-hint distribuir__subtitulo">📦 Necesidades · marca las que cubres con este ingreso:</p>
          <div class="distribuir-ingreso__destinos">
            ${necesidades.map(_filaNecesidad).join('')}
          </div>`;

  // Paso 2: título consistente con el resto de pasos (MC.7f), y la sugerencia
  // de ahorro sale del remanente real (R3); index.js la actualiza en vivo
  // (span data-dist-sugerencia-ahorro) al cambiar las marcas. El hint de
  // sugerencia solo tiene sentido si hay al menos una fila de Ahorro donde
  // ponerla (fondo, meta o apartado): sin ninguna, mostrarlo sería un estado
  // vacío confuso ("sugerencia: $X a ahorro" sin ningún destino de ahorro
  // debajo, MC.7f).
  const tituloAsignaciones = `<p class="form-hint distribuir__subtitulo">💰 Ahorro, deudas e inversiones · ajusta cuánto destinar a cada una:</p>`;
  const seccionAhorro = ahorro.length > 0
    ? `
          <p class="form-hint">Sugerencia: <span data-dist-sugerencia-ahorro>${f(ahorroBudget)}</span> a ahorro${necesidades.length > 0 ? ', calculada sobre lo que queda tras tus Necesidades marcadas' : ''}.</p>
          <div class="distribuir-ingreso__destinos">${ahorro.map(_filaDistribuir).join('')}</div>`
    : '';
  const seccionDeudas = deudas.length > 0
    ? `
          <p class="form-hint distribuir__subtitulo">Abonar extra a deudas (ordenadas por prioridad de pago):</p>
          <div class="distribuir-ingreso__destinos">
            ${deudas.map(_filaDistribuir).join('')}
          </div>`
    : '';
  const seccionInversiones = inversiones.length > 0
    ? `
          <p class="form-hint distribuir__subtitulo">Aportar a inversiones:</p>
          <div class="distribuir-ingreso__destinos">
            ${inversiones.map(_filaDistribuir).join('')}
          </div>`
    : '';
  const seccionAsignaciones = `
          ${tituloAsignaciones}
          ${seccionAhorro}
          ${seccionDeudas}
          ${seccionInversiones}`;

  // Paso final (MC.4c): Estilo de vida no se mueve entre gastos/ahorro/deudas en
  // este panel (se gasta a lo largo del mes). index.js recalcula su monto en
  // vivo sobre el remanente (R3). Con 2+ cuentas activas (MC.7e, ADR 018
  // decisión 4), el usuario puede repartir ese remanente entre sus cuentas:
  // transferencias internas, no gasto. Con una sola cuenta se omite (regla de
  // cuenta única): todo el remanente queda donde ya está.
  const seccionCuentas = cuentas.length > 0
    ? `
          <p class="form-hint distribuir__subtitulo">¿Quieres mover parte a otras cuentas?</p>
          <div class="distribuir-ingreso__destinos">
            ${cuentas.map(_filaDistribuir).join('')}
          </div>
          <p id="distribuir-cuentas-resumen" class="form-hint form-hint--muted" role="status"></p>`
    : '';

  const seccionInfo = `
          <p class="form-hint distribuir__subtitulo">Esto queda en tu cuenta (no se mueve):</p>
          <div class="distribuir__info">
            <p class="distribuir__info-fila">
              <span>🎯 Estilo de vida</span>
              <span data-dist-info="estiloVida">${f(evBudget)}</span>
            </p>
          </div>
          ${seccionCuentas}
          <p class="form-hint form-hint--muted">Revisa el resumen y confirma: se registrarán los pagos y aportes que marcaste.</p>`;

  // Shell paginado (MC.7d): un paso visible a la vez, avanzar/atrás inline.
  const pasos = [];
  if (necesidades.length > 0) pasos.push({ titulo: 'Necesidades', html: seccionNecesidades });
  if (ahorro.length > 0 || deudas.length > 0 || inversiones.length > 0) {
    pasos.push({ titulo: 'Ahorro, deudas e inversiones', html: seccionAsignaciones });
  }
  pasos.push({ titulo: 'Estilo de vida', html: seccionInfo });

  // `tabindex="-1"` (MC.7f, a11y): cada paso es un destino de foco programático
  // (no forma parte del tab order normal). Al avanzar/retroceder, index.js
  // enfoca el paso recién mostrado; su `aria-label` ya dice "Paso X de N: <título>",
  // así que el foco por sí solo anuncia el cambio a lectores de pantalla, sin
  // depender de que el usuario llegue justo al indicador con `role="status"`.
  const pasosHtml = pasos.map((p, i) => `
          <div class="distribuir__paso" data-dist-paso="${i}" data-dist-paso-titulo="${p.titulo}"
               role="group" aria-label="Paso ${i + 1} de ${pasos.length}: ${p.titulo}" tabindex="-1"${i > 0 ? ' hidden' : ''}>
            ${p.html}
          </div>`).join('');

  const esUnicoPaso = pasos.length === 1;
  // El indicador "Paso X de N" solo aporta con 2+ pasos: con uno solo no hay
  // progresión que comunicar (MC.7f, estado vacío más limpio).
  const indicadorPaso = esUnicoPaso ? '' : `
          <p class="form-hint distribuir__paso-indicador" data-dist-paso-indicador role="status">Paso 1 de ${pasos.length}: ${pasos[0].titulo}</p>`;
  return `
        ${cta}
        <button type="button" class="btn btn-primary btn-sm distribuir__abrir"
                data-action="toggle-distribuir-ingreso"
                aria-expanded="false" aria-controls="distribuir-ingreso-panel">
          💸 Distribuir mi ingreso
        </button>
        <fieldset id="distribuir-ingreso-panel" class="distribuir-ingreso" hidden
                  data-ahorro-pct="${ahorroPct}" data-estilo-vida-pct="${estiloVidaPct}">
          <legend>Reparte hacia tus necesidades, ahorros, deudas e inversiones. El resto queda disponible en tu cuenta.</legend>
          <div class="form-group">
            <label for="distribuir-monto" class="label">Monto a distribuir (COP)</label>
            <input id="distribuir-monto" type="number" class="input"
                   min="0" step="10000" inputmode="numeric" value="${montoIngreso}"
                   data-action="recalcular-distribucion" />
          </div>
          ${indicadorPaso}
          ${pasosHtml}
          <p id="distribuir-resumen" class="form-hint" role="status"></p>
          <div class="distribuir__nav">
            <button type="button" class="btn btn-ghost btn-sm distribuir__nav-atras"
                    data-action="distribuir-paso-atras" hidden>← Atrás</button>
            <button type="button" class="btn btn-primary btn-sm"
                    data-action="distribuir-paso-siguiente"${esUnicoPaso ? ' hidden' : ''}>Siguiente →</button>
            <button type="button" class="btn btn-primary btn-sm" data-action="confirmar-distribucion"${esUnicoPaso ? '' : ' hidden'}>
              Distribuir
            </button>
          </div>
        </fieldset>`;
}

/**
 * @param {ReturnType<typeof sugerirDistribucionIngreso>} dist
 * @param {string} presetActivo
 * @param {{n:number, e:number, a:number}|null} distribucionPersonalizada
 * @param {{montoIngreso:number, ahorroPct:number, estiloVidaPct:number, ahorroBudget:number, evBudget:number, destinosAhorro:Array, destinosDeudas:Array}} distribuir
 */
function _renderDistribucion({ ingresoMensual, split, razon, alertas, ctas }, presetActivo, distribucionPersonalizada, distribuir) {
  const { necesidades, estiloVida, ahorro } = split;

  const autoActivo = presetActivo === 'auto';
  const autoChip = `
      <button type="button"
              class="chip${autoActivo ? ' chip--active' : ''}"
              data-action="cambiar-preset-distribucion"
              data-preset="auto"
              aria-pressed="${autoActivo}">
        Automático
      </button>`;

  const clasicosActivo = ['50-30-20', '70-20-10', '60-20-20'].includes(presetActivo);
  const clasicosChips = PRESETS_DISTRIBUCION
    .filter(p => p.id !== 'auto')
    .map(p => {
      const activo = p.id === presetActivo;
      return `
        <button type="button"
                class="chip${activo ? ' chip--active' : ''}"
                data-action="cambiar-preset-distribucion"
                data-preset="${_esc(p.id)}"
                aria-pressed="${activo}">
          ${_esc(p.label)}
        </button>`;
    }).join('');

  const personalizadaValida = esDistribucionPersonalizadaValida(distribucionPersonalizada);
  const personalizadaActiva = presetActivo === 'personalizado' && personalizadaValida;
  const personalizadaLabel  = personalizadaValida
    ? `${distribucionPersonalizada.n}/${distribucionPersonalizada.e}/${distribucionPersonalizada.a}`
    : 'Personalizar';

  const personalizadaChip = `
      <button type="button"
              class="chip${personalizadaActiva ? ' chip--active' : ''}"
              data-action="toggle-distribucion-personalizada"
              aria-expanded="false"
              aria-controls="distribucion-personalizada-fieldset">
        ✎ ${_esc(personalizadaLabel)}
      </button>`;

  // Punto de partida del editor: lo ya guardado si existe; si no, el split
  // activo (siempre suma 100), para ajustar en vez de partir de cero.
  const prefillN = personalizadaValida ? distribucionPersonalizada.n : necesidades.pct;
  const prefillE = personalizadaValida ? distribucionPersonalizada.e : estiloVida.pct;
  const prefillA = personalizadaValida ? distribucionPersonalizada.a : ahorro.pct;

  const editorPersonalizada = `
    <fieldset id="distribucion-personalizada-fieldset" class="distribucion-personalizada" hidden>
      <legend>Crea tu distribución: los 3 porcentajes deben sumar 100%.</legend>
      <div class="distribucion-personalizada__inputs">
        <div class="form-group">
          <label for="dist-pct-n" class="label">📦 Necesidades</label>
          <input id="dist-pct-n" type="number" class="input" min="0" max="100" step="1"
                 inputmode="numeric" value="${prefillN}"
                 data-action="ajustar-distribucion-personalizada" data-dist-pct="n" />
        </div>
        <div class="form-group">
          <label for="dist-pct-e" class="label">🎯 Estilo de vida</label>
          <input id="dist-pct-e" type="number" class="input" min="0" max="100" step="1"
                 inputmode="numeric" value="${prefillE}"
                 data-action="ajustar-distribucion-personalizada" data-dist-pct="e" />
        </div>
        <div class="form-group">
          <label for="dist-pct-a" class="label">💰 Ahorro</label>
          <input id="dist-pct-a" type="number" class="input" min="0" max="100" step="1"
                 inputmode="numeric" value="${prefillA}"
                 data-action="ajustar-distribucion-personalizada" data-dist-pct="a" />
        </div>
      </div>
      <p id="distribucion-personalizada-msg" class="form-hint" role="status"></p>
      <button type="button" class="btn btn-primary btn-sm" data-action="guardar-distribucion-personalizada">
        Guardar mi distribución
      </button>
    </fieldset>`;

  const rowsHtml = [
    { icn: '📦', ...necesidades },
    { icn: '🎯', ...estiloVida },
    { icn: '💰', ...ahorro },
  ].map(({ icn, label, pct, monto }) =>
    `<p class="nudge__desc"><strong>${icn} ${_esc(label)}</strong> ${pct}% · ${f(monto)}</p>`
  ).join('');

  const alertasHtml = alertas.map(a =>
    `<p class="nudge__desc">⚠ ${_esc(a)}</p>`
  ).join('');

  const ctasHtml = ctas.map(c =>
    `<a href="#${_esc(c.seccion)}" class="btn btn-ghost btn-sm">${_esc(c.label)} →</a>`
  ).join('');

  return `
    <div class="nudge nudge-info" role="region" aria-label="Distribución sugerida del ingreso">
      <span class="nudge__icon" aria-hidden="true">${icon('lightbulb')}</span>
      <div class="nudge__body">
        <p class="nudge__title">¿Cómo distribuir ${f(ingresoMensual)}?</p>
        <div class="filtros-bar" role="group" aria-label="Preset de distribución">
          ${autoChip}
          ${personalizadaChip}
        </div>
        <details class="distribucion-clasicos"${clasicosActivo ? ' open' : ''}>
          <summary class="distribucion-clasicos__toggle">Métodos clásicos</summary>
          <div class="filtros-bar" role="group" aria-label="Métodos clásicos de distribución">
            ${clasicosChips}
          </div>
          <p class="form-hint form-hint--muted">Porcentajes fijos. No consideran tus gastos reales.</p>
        </details>
        ${editorPersonalizada}
        <div class="distribucion-rows">
          <p class="nudge__desc">${_esc(razon)}</p>
          ${rowsHtml}
          ${alertasHtml}
          ${ctasHtml}
        </div>
        ${_renderPanelDistribuir(distribuir)}
      </div>
    </div>`;
}

// ── FORMULARIO DEL MODAL ─────────────────────────────────────────

/**
 * Devuelve el HTML del formulario de nueva cuenta para inyectar en `#modal-cuenta-body`.
 * La función es pura: no toca el DOM.
 *
 * @returns {string}
 */
export function renderFormCuenta() {
  const bancoItems = BANCOS_CO.map(b => `
    <li role="option"
        class="bank-picker__item"
        data-value="${_esc(b.id)}"
        aria-selected="false"
        tabindex="-1">
      ${_bankAvatarHtml(b.id)}
      <span>${_esc(b.id)}</span>
    </li>`).join('');

  return `
    <form id="form-cuenta" novalidate>
      <div class="form-group">
        <label id="label-banco" class="label">Banco o billetera</label>
        <div class="bank-picker"
             role="combobox"
             aria-expanded="false"
             aria-haspopup="listbox"
             aria-labelledby="label-banco">
          <button type="button"
                  class="bank-picker__trigger"
                  aria-controls="banco-list"
                  aria-expanded="false">
            <span class="bank-picker__display">
              <span class="bank-picker__placeholder">Seleccionar…</span>
            </span>
            <span class="bank-picker__chevron" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5"
                      stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </span>
          </button>
          <input type="hidden" name="banco" value="" />
          <ul class="bank-picker__list"
              id="banco-list"
              role="listbox"
              aria-label="Banco o billetera"
              tabindex="-1"
              hidden>
            ${bancoItems}
          </ul>
        </div>
      </div>

      <div class="form-group" id="form-group-tipo" hidden>
        <label for="cuenta-tipo" class="label">Tipo de cuenta</label>
        <select id="cuenta-tipo" name="tipo" class="input" required aria-required="true">
          <option value="">Seleccionar…</option>
        </select>
      </div>
      <div class="form-group">
        <label for="cuenta-saldo" class="label">Saldo actual (COP)</label>
        <input id="cuenta-saldo" name="saldo" class="input" type="number"
               min="0" step="1000" placeholder="0" value="0" />
      </div>

      <div class="form-group form-group--checkbox" id="form-group-4x1000">
        <label class="checkbox-row">
          <input type="checkbox"
                 id="cuenta-4x1000"
                 name="aplica4x1000" />
          <span>A esta cuenta le aplica el 4x1000 (GMF)</span>
        </label>
      </div>

      <div class="form-group form-group--checkbox">
        <label class="checkbox-row">
          <input type="checkbox"
                 id="cuenta-cuota-toggle"
                 name="cuotaManejoActiva"
                 data-cuota-toggle />
          <span>Esta cuenta cobra cuota de manejo mensual</span>
        </label>
      </div>

      <fieldset id="cuenta-cuota-fieldset" class="cuota-fieldset" hidden>
        <div class="form-group">
          <label for="cuenta-cuota-monto" class="label">
            Monto de la cuota (COP)
          </label>
          <input id="cuenta-cuota-monto"
                 name="cuotaManejoMonto"
                 class="input"
                 type="number"
                 min="1"
                 step="100"
                 placeholder="Ej. 15000" />
        </div>
        <div class="form-group">
          <label for="cuenta-cuota-dia" class="label">Día de cobro (1-31)</label>
          <input id="cuenta-cuota-dia"
                 name="cuotaManejoDia"
                 class="input"
                 type="number"
                 min="1" max="31" step="1"
                 placeholder="Ej. 15" />
        </div>
        <p class="form-hint form-hint--muted">
          Finko crea un gasto fijo mensual con este monto y día. Lo verás en Calendario.
        </p>
      </fieldset>

      <div class="modal__footer">
        <button type="button" class="btn btn-ghost" data-action="modal-close">
          Cancelar
        </button>
        <button type="submit" class="btn btn-primary">
          Guardar cuenta
        </button>
      </div>
    </form>`;
}

// ── INDICADOR GMF (K.1) ──────────────────────────────────────────

/**
 * Renderiza el nudge de costo del GMF en `#tesoreria-gmf`.
 * Muestra el costo estimado del 4x1000 para el mes actual basado en
 * los gastos registrados desde cuentas con GMF. No-op si el contenedor
 * no existe o si no hay costo que reportar este mes.
 */
export function renderGMFIndicador() {
  const el = document.getElementById('tesoreria-gmf');
  if (!el) return;

  const fechaHoy = hoy();
  const anio = Number(fechaHoy.slice(0, 4));
  const mes  = Number(fechaHoy.slice(5, 7));

  const gmfData = calcularCostoGMF(S.gastos, S.cuentas, anio, mes);
  const nudge   = detectarNudgeGMF(gmfData);

  el.innerHTML = nudge ? _renderNudgeGMF(nudge) : '';
}

/**
 * @param {{ icono: string, nivel: string, cantidadCuentasGMF: number,
 *           gastosGravados: number, costoGMF: number }} nudge
 * @returns {string}
 */
function _renderNudgeGMF(nudge) {
  const n = nudge.cantidadCuentasGMF === 1 ? '1 cuenta' : `${nudge.cantidadCuentasGMF} cuentas`;
  return `
    <div class="nudge nudge-info" role="status">
      <span class="nudge__icon" aria-hidden="true">${icon(nudge.icono)}</span>
      <div class="nudge__body">
        <p class="nudge__title">4x1000 estimado este mes: ${f(nudge.costoGMF)}</p>
        <p class="nudge__desc">Calculado desde ${f(nudge.gastosGravados)} en gastos registrados desde ${_esc(n)} con GMF. Las cuentas de nómina y AFC están exentas: consulta con tu banco si aplica.</p>
      </div>
    </div>`;
}

// ── HELPERS ──────────────────────────────────────────────────────

/**
 * Devuelve el HTML de un avatar circular con las iniciales y el color
 * corporativo del banco. Si el banco no se encuentra en BANCOS_CO,
 * devuelve un avatar generico con "?" y color gris.
 *
 * @param {string} bancoId - valor guardado en cuenta.banco.
 * @returns {string} HTML span del avatar.
 */
function _bankAvatarHtml(bancoId) {
  return bancoAvatar(bancoId);
}


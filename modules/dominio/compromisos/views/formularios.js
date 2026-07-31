/**
 * compromisos/views/formularios.js - formularios modales del dominio.
 *
 * Tres formularios:
 *   - Chooser de tipo de deuda (paso 1 del modal de nueva deuda)
 *   - Form tailored entidad / personal (paso 2)
 *   - Form de abono a deuda existente (ADR 002)
 *
 * Puede leer S. No puede mutarlo. Sin lógica de negocio.
 */

import { S } from '../../../core/state.js';
import { f, esc as _esc } from '../../../infra/utils.js';
import {
  FRECUENCIAS,
  CATEGORIAS_DEUDA,
  CATEGORIAS_DEUDA_PERSONAL,
  CATEGORIA_DEUDA_ICONO,
  CATEGORIA_DEUDA_PERSONAL_ICONO,
  ICONOS_CATEGORIA_PERSONALIZADA,
} from '../../../core/constants.js';
import { renderSelectorCuenta } from '../../../infra/cuenta-helper.js';
import { renderIconoPicker } from '../../../infra/icon-picker.js';

// ── FORMULARIO MODAL: ABONAR A DEUDA (ADR 002) ───────────────────

/**
 * Devuelve el HTML del formulario para registrar un abono a una deuda.
 *
 * Incluye el selector de tarjetas (mismo patrón que Gastos): el usuario elige
 * la cuenta de origen y, si no alcanza para cubrir el abono, el reparto entre
 * varias cuentas se resuelve al confirmar (`resolverPagoConPreferida`), sin
 * dejar ninguna en negativo. Si no hay ninguna cuenta activa, muestra un
 * estado vacío con instrucción.
 *
 * @param {import('../../../core/state.js').Compromiso} deuda
 * @returns {string}
 */
export function renderFormAbono(deuda) {
  const cuentas = (S.cuentas ?? []).filter(c => c.activa !== false);
  if (cuentas.length === 0) {
    return `
      <div class="empty-state">
        <p class="empty-state__desc">Un abono necesita una cuenta activa de donde salga el dinero. Créala aquí y sigues sin perder el hilo.</p>
        <div class="modal__footer">
          <button type="button" class="btn btn-ghost" data-action="modal-close">Ahora no</button>
          <button type="button" class="btn btn-primary" data-action="ir-a-crear-cuenta">Crear una cuenta</button>
        </div>
      </div>`;
  }

  const saldo = Number(deuda.saldoTotal) || 0;
  const cuota = Number(deuda.cuotaMensual) || 0;
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
               value="${cuota > 0 ? Math.min(cuota, saldo) : ''}"
               required aria-required="true"
               autocomplete="off" inputmode="numeric" />
        <p class="form-hint form-hint--muted">${cuota > 0 ? `Pre-llenado con tu cuota mensual. ` : ''}Máximo ${f(saldo)}.</p>
        <p id="abono-tip-proyeccion" class="form-hint form-hint--muted" aria-live="polite"></p>
      </div>

      ${renderSelectorCuenta(cuentas, { label: '¿De qué cuenta sale el abono?' })}

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

      <p class="form-hint form-hint--info">
        Cada abono, grande o pequeño, es un paso real hacia quedar libre de esta deuda.
      </p>

      <div class="modal__footer">
        <button type="button" class="btn btn-ghost" data-action="modal-close">Cancelar</button>
        <button type="submit" class="btn btn-primary">Registrar abono</button>
      </div>
    </form>`;
}

// ── FORMULARIO DEL MODAL: NUEVA DEUDA ────────────────────────────

/**
 * Devuelve el HTML del formulario de deuda (FORM.1b, ADR 042 D4).
 *
 * El segmented Entidad/Personal vive INLINE al tope del form (reemplaza el
 * chooser de dos pasos que existía antes de FORM.1b: mismo contrato `tipo`
 * en un hidden, un paso menos). Solo se muestra al crear: al editar, el
 * tipo de una deuda ya guardada no cambia (mismo criterio que tenía el
 * flujo de dos pasos, que tampoco lo permitía).
 *
 * Entidad: tasa EA opcional (muchas personas no la conocen; si falta, se guarda
 *          null y la app invita a consultarla para análisis más precisos).
 * Personal: tasa mensual opcional (gota a gota suele cobrar 5-20% mensual).
 *
 * @param {'deuda-entidad'|'deuda-personal'} tipo
 * @param {import('../../../core/state.js').Compromiso|null} [deuda] Cuando se pasa, activa el modo edición (pre-rellena los campos).
 * @returns {string}
 */
export function renderFormDeuda(tipo, deuda = null) {
  const esEntidad = tipo === 'deuda-entidad';
  const modoEdit  = deuda !== null;
  const frecOpts  = FRECUENCIAS
    .map(fr => {
      const selFr = modoEdit ? deuda.frecuencia : 'Mensual';
      return `<option value="${_esc(fr)}"${fr === selFr ? ' selected' : ''}>${_esc(fr)}</option>`;
    })
    .join('');

  const tasaLabel = esEntidad
    ? 'Tasa de interés anual % EA (opcional)'
    : 'Tasa de interés mensual % (opcional)';

  const tasaPlaceholder = esEntidad ? '28.5' : '10';

  const tasaHint = esEntidad
    ? 'La encuentras en tu extracto, contrato o la app del banco. ¿No conoces tu tasa? Puedes continuar sin este dato, pero te recomendamos consultarla con tu banco o entidad financiera para obtener recomendaciones más precisas sobre tus deudas.'
    : 'Si no cobra interés, deja el campo en blanco. Los prestamistas particulares (natilleras, persona natural) suelen cobrar entre 5% y 20% mensual.';

  const descPlaceholder = esEntidad
    ? 'Ej. Tarjeta Visa Bancolombia'
    : 'Ej. Préstamo de mamá, Crédito particular';

  const vDesc  = modoEdit ? _esc(deuda.descripcion ?? '') : '';
  const vSaldo = modoEdit ? (deuda.saldoTotal ?? '') : '';
  const vCuota = modoEdit && deuda.cuotaMensual > 0 ? deuda.cuotaMensual : '';
  const vTasa  = modoEdit && deuda.tasa != null ? deuda.tasa : '';
  const vDia   = modoEdit ? (deuda.diaPago ?? '') : '';
  const vCupo  = modoEdit && deuda.cupoTotal != null ? deuda.cupoTotal : '';

  // D.10: el eje "qué/con quién" usa un catálogo distinto según Entidad/Personal.
  // Entidad clasifica el producto (Tarjeta, Vivienda...); Personal, la relación
  // (Familiar, Amigo, Fiado...). Mismo campo `categoria` en el schema.
  const catalogo  = esEntidad ? CATEGORIAS_DEUDA : CATEGORIAS_DEUDA_PERSONAL;
  const iconoCat  = esEntidad ? CATEGORIA_DEUDA_ICONO : CATEGORIA_DEUDA_PERSONAL_ICONO;
  const catLabel  = esEntidad ? 'Tipo de deuda' : '¿Con quién es la deuda?';
  const catSel    = modoEdit ? deuda.categoria : null;
  const chipsCategoria = catalogo.map(c => `
        <label class="chip-cat">
          <input type="radio" name="categoria" class="chip-cat__radio" value="${_esc(c)}"${c === catSel ? ' checked' : ''} />
          <svg class="icon" aria-hidden="true"><use href="#${_esc(iconoCat[c])}"/></svg>
          <span class="chip-cat__label">${_esc(c)}</span>
        </label>`).join('');

  // CAT.2d: con 'Otra' (entidad) / 'Otro' (personal), el usuario puede elegir
  // un ícono del picker compartido en vez del fijo c-otros. Grupo oculto salvo
  // que la categoría guardada ya sea la de "otro" (modo edición).
  const categoriaOtra = esEntidad ? 'Otra' : 'Otro';
  const iconoOculto = !(modoEdit && deuda.categoria === categoriaOtra);
  const vIcono = modoEdit ? (deuda.icono ?? null) : null;

  // FORM.1b (ADR 042 D4): "Condiciones del crédito" agrupa solo la TASA en un
  // colapsable. Frecuencia y día de pago quedan siempre visibles a propósito:
  // ambos son obligatorios y el día no tiene un valor por defecto seguro para
  // ocultar (a diferencia de frecuencia, que ya trae 'Mensual' preseleccionado).
  // Abre por defecto si se está editando una deuda que ya tiene tasa guardada.
  const condicionesAbiertas = modoEdit && vTasa !== '';

  // D.14: solo al crear (no al editar) y solo si hay cuentas activas donde
  // acreditar. Toggle apagado por defecto: muchas deudas no entregan dinero
  // directo (tarjeta ya consumida, deuda vieja, crédito que paga a un tercero).
  const cuentasActivas = (S.cuentas ?? []).filter(c => c.activa !== false);
  const bloqueOrigen = (modoEdit || cuentasActivas.length === 0) ? '' : `
      <div class="form-group">
        <label class="toggle-row">
          <span class="toggle">
            <input type="checkbox" id="comp-recibio-dinero" name="recibioDinero" />
            <span class="toggle__track" aria-hidden="true"></span>
          </span>
          <span class="toggle-row__text">
            <span class="toggle-row__label">Recibí este dinero en una cuenta</span>
            <span class="toggle-row__hint">Actívalo si esta deuda te dio dinero disponible ahora, por ejemplo un préstamo o un giro. Si es una tarjeta ya usada, una deuda vieja o el dinero fue directo a otra persona, déjalo desactivado.</span>
          </span>
        </label>
      </div>
      <div id="grupo-comp-cuenta-origen" hidden>
        ${renderSelectorCuenta(cuentasActivas, { label: '¿En qué cuenta entró el dinero?' })}
      </div>`;

  // El segmented solo aparece al crear: al editar el tipo ya está fijado.
  const segmented = modoEdit ? '' : `
      <div class="tipo-segmented" role="group" aria-label="Tipo de deuda">
        <button type="button" class="tipo-segmented__btn${esEntidad ? ' active' : ''}"
                data-action="comp-elegir-tipo" data-tipo="deuda-entidad"
                aria-pressed="${esEntidad}">Entidad</button>
        <button type="button" class="tipo-segmented__btn${esEntidad ? '' : ' active'}"
                data-action="comp-elegir-tipo" data-tipo="deuda-personal"
                aria-pressed="${!esEntidad}">Personal</button>
      </div>`;

  return `
    <form id="form-compromiso" novalidate>
      <input type="hidden" name="tipo" value="${_esc(tipo)}" />

      ${segmented}

      <div class="form-group">
        <span class="label" id="comp-categoria-label">${_esc(catLabel)}</span>
        <div class="chips-cat chips-cat--2col" role="radiogroup" aria-labelledby="comp-categoria-label">
          ${chipsCategoria}
        </div>
      </div>

      <div class="form-group"${iconoOculto ? ' hidden' : ''} id="grupo-comp-icono">
        ${renderIconoPicker(ICONOS_CATEGORIA_PERSONALIZADA, { id: 'comp-icono', valorActual: vIcono, label: 'Ícono' })}
      </div>

      <div class="form-group">
        <label for="comp-descripcion" class="label">¿Cuál es la deuda?</label>
        <input id="comp-descripcion" name="descripcion" class="input" type="text"
               placeholder="${_esc(descPlaceholder)}" required aria-required="true"
               autocomplete="off" value="${vDesc}" />
      </div>

      <div class="monto-hero">
        <label class="monto-hero__label" for="comp-saldo">¿Cuánto debes en total?</label>
        <div class="monto-hero__box">
          <span class="monto-hero__prefijo" aria-hidden="true">$</span>
          <input id="comp-saldo" name="saldoTotal" class="input input--big-amount" type="number"
                 min="1" step="10000" placeholder="0" required aria-required="true"
                 autocomplete="off" value="${vSaldo}" />
        </div>
        <span class="monto-hero__hint">COP</span>
      </div>

      <div class="form-group" id="grupo-comp-cupo"${esEntidad && catSel === 'Tarjeta de crédito' ? '' : ' hidden'}>
        <label for="comp-cupo" class="label">Cupo aprobado de la tarjeta <span class="form-optional">opcional</span></label>
        <div class="input-group">
          <span class="input-prefix" aria-hidden="true">$</span>
          <input id="comp-cupo" name="cupoTotal" class="input input--has-prefix" type="number"
                 min="1" step="10000" placeholder="0"
                 autocomplete="off" value="${vCupo}" />
        </div>
        <p class="form-hint">Con el cupo, Finko calcula tu disponible y habilita pagar con esta tarjeta desde Gastos.</p>
      </div>

      <div class="form-group" id="grupo-comp-cuota">
        <label for="comp-cuota" class="label">¿Cuánto pagas cada mes?${esEntidad ? '' : ' <span class="form-optional">opcional</span>'}</label>
        <div class="input-group">
          <span class="input-prefix" aria-hidden="true">$</span>
          <input id="comp-cuota" name="cuotaMensual" class="input input--has-prefix" type="number"
                 min="1" step="10000" placeholder="0"${esEntidad ? ' required aria-required="true"' : ''}
                 autocomplete="off" value="${vCuota}" />
        </div>
        ${esEntidad ? '' : '<p class="form-hint">Si no acordaron una cuota fija, déjalo en blanco: registras abonos cuando pagues.</p>'}
      </div>

      <div class="form-disclosure" id="grupo-comp-tasa">
        <button type="button" class="form-disclosure__trigger" aria-expanded="${condicionesAbiertas}" aria-controls="comp-tasa-panel">
          <svg class="icon" aria-hidden="true"><use href="#i-percent"/></svg>
          <span class="form-disclosure__text">
            <span class="form-disclosure__title">Condiciones del crédito</span>
            <span class="form-disclosure__desc">Tasa de interés &middot; opcional</span>
          </span>
          <svg class="icon form-disclosure__chevron" aria-hidden="true"><use href="#i-chevron-right"/></svg>
        </button>
        <div class="form-disclosure__panel" id="comp-tasa-panel"${condicionesAbiertas ? '' : ' hidden'}>
          <div class="form-group">
            <label for="comp-tasa" class="label">${_esc(tasaLabel)}</label>
            <div class="tasa-input-group">
              <input id="comp-tasa" name="tasa" class="input" type="number"
                     min="0" max="${esEntidad ? '200' : '100'}" step="0.01"
                     placeholder="${_esc(tasaPlaceholder)}"
                     aria-describedby="comp-tasa-hint"
                     autocomplete="off" value="${vTasa}" />
              <input type="hidden" name="tasaUnidad" value="${esEntidad ? 'EA' : 'mensual'}" />
            </div>
            <p id="comp-tasa-hint" class="form-hint">${_esc(tasaHint)}</p>
          </div>
        </div>
      </div>

      <div class="form-group" id="grupo-comp-frecuencia">
        <label for="comp-frecuencia" class="label">Frecuencia de pago</label>
        <select id="comp-frecuencia" name="frecuencia" class="input" required aria-required="true">
          ${frecOpts}
        </select>
      </div>

      <div class="form-group">
        <label for="comp-dia" class="label">Día de pago del mes (1-31)</label>
        <input id="comp-dia" name="diaPago" class="input" type="number"
               min="1" max="31" step="1" placeholder="1" required aria-required="true"
               value="${vDia}" />
        ${esEntidad ? '' : '<p class="form-hint">Si acordaron una fecha, usa ese día; si no, uno que te sirva de recordatorio.</p>'}
      </div>

      ${bloqueOrigen}

      <div class="modal__footer modal__footer--principal">
        <button type="button" class="btn btn-ghost" data-action="modal-close">Cancelar</button>
        <button type="submit" class="btn btn-primary"><svg class="icon" aria-hidden="true"><use href="#i-check-circle"/></svg>${modoEdit ? 'Actualizar deuda' : 'Guardar deuda'}</button>
      </div>
    </form>`;
}

/**
 * cuenta-helper.js - selección inteligente de cuenta para movimientos financieros.
 *
 * Resuelve qué cuenta usar antes de registrar cualquier pago/gasto:
 *   - 0 cuentas activas: muestra diálogo guiado y navega a Mis Cuentas. Devuelve null.
 *   - 1 cuenta activa: auto-selecciona sin interrumpir al usuario. Devuelve el id.
 *   - Varias cuentas: muestra un picker tipo-modal. Devuelve el id elegido o null si cancela.
 *
 * Sin DOM en la función pura `resolverCuenta`: solo construye el resultado.
 * La capa de presentación (diálogos) vive en las funciones privadas `_*`.
 *
 * Reglas ADN:
 *   - Sin S directo: recibe las cuentas como parámetro.
 *   - Sin imports de dominios: solo infra.
 */

import { EventBus } from '../core/state.js';
import { TARJETA_PREFIJO, CATEGORIA_DEUDA_ICONO } from '../core/constants.js';
import { trapFocus, releaseFocus, despertarOverlay } from './a11y.js';
import { esc as _esc, f } from './utils.js';
import { navigate } from './router.js';
import { bancoAvatar } from './bancos.js';
import { resolverMarca, tejaMarca } from './marcas.js';
import { tejaCategoria } from './icons.js';
import { distribuirPago } from './distribuir-pago.js';

// ── API PÚBLICA ──────────────────────────────────────────────────

/**
 * Renderiza un selector de cuenta en-formulario: una tarjeta seleccionable por
 * cuenta activa, con su avatar de entidad, nombre y saldo. El valor elegido se
 * lee del radio `name` (por defecto `"cuentaId"`; MC.17b pasa `"cuentaOrigenId"`/
 * `"cuentaDestinoId"` para renderizar dos selectores independientes en el mismo
 * formulario). Pre-selecciona `selectedId` si se indica, o la cuenta de mayor
 * saldo. Devuelve '' si no hay cuentas activas (el caller muestra su propio
 * estado vacío).
 *
 * `preseleccionar: false` deja el grupo sin ninguna opción marcada, para los
 * casos en que adivinar sería inventar un dato en vez de ahorrar un clic: en un
 * pago, la cuenta de mayor saldo es un default razonable; en "¿en qué cuenta
 * recibes este ingreso?" (MC.13d) no hay default posible, y un valor no elegido
 * se guardaría como un hecho del usuario. El caller debe tolerar que no venga.
 *
 * `tarjetas` (MC.16b, ADR 051 D4) agrega las tarjetas de crédito operables en
 * un grupo aparte, debajo de las cuentas y con su cupo disponible en vez de un
 * saldo: no son dinero real. **El caller pasa la lista**, el helper nunca lee
 * `S.compromisos`, así infra no gana conocimiento de un dominio y cada
 * formulario decide si las ofrece (hoy solo Gastos). Su valor lleva el prefijo
 * `TARJETA_PREFIJO`; nunca se pre-seleccionan.
 *
 * @param {import('../core/state.js').Cuenta[]} cuentas
 * @param {{ selectedId?: string|null, label?: string, name?: string, preseleccionar?: boolean, tarjetas?: import('../core/state.js').Compromiso[] }} [opts]
 * @returns {string}
 */
export function renderSelectorCuenta(cuentas, { selectedId = null, label = '¿De qué cuenta sale?', name = 'cuentaId', preseleccionar = true, tarjetas = [], opcional = false } = {}) {
  const activas = (cuentas ?? []).filter(c => c.activa !== false);
  const tjs     = tarjetas ?? [];
  if (activas.length === 0 && tjs.length === 0) return '';

  const valores = new Set([...activas.map(c => c.id), ...tjs.map(t => TARJETA_PREFIJO + t.id)]);
  const elegida = (selectedId && valores.has(selectedId)) ? selectedId : null;
  const sel = elegida
    ?? ((preseleccionar && activas.length > 0) ? [...activas].sort((a, b) => (b.saldo ?? 0) - (a.saldo ?? 0))[0].id : null);

  // ADR 132 D9: con una opción ya elegida y más de una para elegir, el
  // selector se pliega en el teléfono a la elegida con "Cambiar" (CSS). Sin
  // elegida (`preseleccionar: false`) no hay nada que mostrar plegado.
  const plegable = sel !== null && activas.length + tjs.length > 1;

  // "Tienes" solo se ve con el selector plegado: en la lista abierta el saldo
  // se lee al lado del nombre, como siempre.
  const fila = (valor, avatar, nombre, cifra, antes = '') => `
      <label class="cuenta-sel__row">
        <input type="radio" name="${_esc(name)}" class="cuenta-sel__radio"
               value="${_esc(valor)}" ${valor === sel ? 'checked' : ''} />
        <span class="cuenta-picker__main">
          ${avatar}
          <span class="cuenta-picker__nombre">${_esc(nombre)}</span>
        </span>
        <span class="cuenta-picker__saldo">${antes ? `<span class="cuenta-picker__antes">${antes} </span>` : ''}${cifra}</span>
      </label>`;

  const filas = activas.map(c => fila(c.id, bancoAvatar(c.banco, c.icono), c.nombre, f(c.saldo ?? 0), 'Tienes')).join('');

  // El cupo disponible se deriva (cupoTotal - saldoTotal, acotado a cero) y se
  // rotula como cupo: es capacidad de endeudamiento, no dinero (ADR 051 D5).
  const filasTarjetas = tjs.length === 0 ? '' : `
        <p class="cuenta-sel__grupo">Tarjetas de crédito</p>
        ${tjs.map(t => fila(
          TARJETA_PREFIJO + t.id,
          tejaTarjeta(t),
          t.descripcion,
          `Cupo ${f(Math.max((Number(t.cupoTotal) || 0) - (Number(t.saldoTotal) || 0), 0))}`,
        )).join('')}`;

  const cambiar = plegable ? `
      <button type="button" class="cuenta-sel__cambiar" data-action="cuenta-sel-cambiar" aria-expanded="false">Cambiar<svg class="icon" aria-hidden="true"><use href="#i-chevron-down"/></svg></button>` : '';

  return `
    <div class="form-group cuenta-sel${plegable ? ' cuenta-sel--plegable' : ''}">
      <span class="label">${_esc(label)}${opcional ? ' <span class="form-optional">Opcional</span>' : ''}</span>
      <div class="cuenta-sel__lista" role="radiogroup" aria-label="${_esc(label)}">
        ${filas}${filasTarjetas}
      </div>${cambiar}
    </div>`;
}

/**
 * Bloque de captura del débito automático (PA.1a, ADR 052): el toggle "Se
 * descuenta automáticamente" más el selector de la cuenta de la que sale,
 * oculto mientras el toggle esté apagado.
 *
 * Vive en infra y no en un dominio porque lo usan dos formularios de dominios
 * distintos (el gasto fijo en Agenda y la deuda en Compromisos) y ADN 10 impide
 * que uno importe del otro. El contrato de `FormData` que produce es el que
 * leen `validarCompromiso` y `normalizarCompromiso`: `debitoAutomatico` ('on' o
 * ausente) y `cuentaDebitoId`.
 *
 * **La cuenta no se pre-selecciona**: no es una comodidad de pago (donde la de
 * mayor saldo es un default razonable) sino un hecho del arreglo del usuario con
 * su banco. Adivinarlo guardaría un dato que nadie eligió.
 *
 * Devuelve '' si no hay cuentas activas: sin cuenta no hay débito que preparar.
 *
 * @param {import('../core/state.js').Cuenta[]} cuentas
 * @param {{ id?: string, activo?: boolean, selectedId?: string|null }} [opts]
 *   `id` prefija los ids del DOM (dos formularios distintos, ninguno colisiona).
 * @returns {string}
 */
export function renderBloqueDebitoAutomatico(cuentas, { id = 'debito-auto', activo = false, selectedId = null } = {}) {
  const activas = (cuentas ?? []).filter(c => c.activa !== false);
  if (activas.length === 0) return '';

  return `
      <div class="form-group">
        <label class="toggle-row">
          <span class="toggle">
            <input type="checkbox" id="${_esc(id)}-check" name="debitoAutomatico"${activo ? ' checked' : ''} />
            <span class="toggle__track" aria-hidden="true"></span>
          </span>
          <span class="toggle-row__text">
            <span class="toggle-row__label">Se descuenta automáticamente de mi cuenta</span>
            <span class="toggle-row__hint">Actívalo si tu banco lo debita solo cada vez que vence. Finko no registra el pago por su cuenta: al abrir la app te lo deja listo y tú lo confirmas de un toque.</span>
          </span>
        </label>
      </div>
      <div id="grupo-${_esc(id)}-cuenta"${activo ? '' : ' hidden'}>
        ${renderSelectorCuenta(activas, {
          label:          '¿De qué cuenta lo descuentan?',
          name:           'cuentaDebitoId',
          selectedId,
          preseleccionar: false,
        })}
      </div>`;
}

/**
 * Conecta el toggle de débito automático con su selector de cuenta, que arranca
 * oculto, y sincroniza la visibilidad inicial (el caller puede haber marcado el
 * checkbox al pre-rellenar un formulario de edición). No-op si el bloque no se
 * renderizó (sin cuentas activas).
 *
 * @param {ParentNode} root Contenedor del formulario ya inyectado.
 * @param {string} [id] El mismo `id` que se pasó a `renderBloqueDebitoAutomatico`.
 */
export function wireToggleDebitoAutomatico(root, id = 'debito-auto') {
  const check = root?.querySelector(`#${id}-check`);
  const grupo = root?.querySelector(`#grupo-${id}-cuenta`);
  if (!check || !grupo) return;
  grupo.hidden = !check.checked;
  check.addEventListener('change', () => { grupo.hidden = !check.checked; });
}

/**
 * Teja de una tarjeta en el selector: la marca que mencione su descripción
 * ("Tarjeta Bancolombia"), y si no hay match, la teja de tipo de deuda. Misma
 * cadena que la card de Deudas, para que la tarjeta se vea igual en los dos
 * lados.
 * @param {import('../core/state.js').Compromiso} tarjeta
 * @returns {string}
 */
export function tejaTarjeta(tarjeta) {
  const marca = resolverMarca(tarjeta.descripcion);
  return marca
    ? tejaMarca(marca)
    : tejaCategoria(CATEGORIA_DEUDA_ICONO['Tarjeta de crédito'], 'compromisos');
}

/**
 * Resuelve la cuenta a usar para un movimiento de forma inteligente.
 *
 * @param {import('../core/state.js').Cuenta[]} cuentas - lista completa de S.cuentas.
 * @param {string} [contexto] - texto corto para mensajes: "registrar el pago", etc.
 * @returns {Promise<string|null>}
 *   - string: id de la cuenta elegida (auto o por el usuario).
 *   - null: el flujo fue cancelado o se redirigió a Mis Cuentas (el caller debe abortar).
 */
export async function resolverCuenta(cuentas, contexto = 'completar esta operación') {
  const activas = (cuentas ?? []).filter(c => c.activa !== false);

  if (activas.length === 0) {
    _mostrarGuiadoCero(contexto);
    return null;
  }

  if (activas.length === 1) {
    return activas[0].id;
  }

  return _mostrarPickerCuenta(activas, contexto);
}

/**
 * Resuelve el reparto de un pago entre una o varias cuentas, sin dejar ninguna
 * en negativo. Cobra de la(s) cuenta(s) con más saldo primero.
 *
 *   - 0 cuentas activas: diálogo guiado a Mis Cuentas. Devuelve null.
 *   - 1 cuenta activa: la usa por el monto completo (el caller confirma si
 *     queda en negativo, igual que el flujo de una sola cuenta).
 *   - Varias cuentas: picker multi-selección con reparto automático.
 *
 * @param {import('../core/state.js').Cuenta[]} cuentas - lista completa de S.cuentas.
 * @param {number} monto - total a cubrir (COP).
 * @param {string} [contexto] - texto corto para mensajes.
 * @returns {Promise<Array<{cuentaId:string, monto:number}>|null>}
 *   - array: cuánto sacar de cada cuenta (suma = monto cuando cubre).
 *   - null: cancelado o redirigido a Mis Cuentas (el caller aborta).
 */
export async function resolverPagoMultiCuenta(cuentas, monto, contexto = 'completar esta operación') {
  const activas = (cuentas ?? []).filter(c => c.activa !== false);

  if (activas.length === 0) {
    _mostrarGuiadoCero(contexto);
    return null;
  }

  if (activas.length === 1) {
    // Una sola cuenta: la usa por el monto completo. El caller decide si
    // confirma el sobregiro (no hay alternativa para repartir).
    return [{ cuentaId: activas[0].id, monto: Number(monto) || 0 }];
  }

  return _mostrarPickerMultiCuenta(activas, Number(monto) || 0, contexto);
}

/**
 * Resuelve el reparto de un pago partiendo de una cuenta preferida (la que el
 * usuario eligió en el formulario):
 *   - 0 cuentas: diálogo guiado a Mis Cuentas. Devuelve null.
 *   - La preferida cubre el monto: la usa por el total. Devuelve un split.
 *   - La preferida no alcanza y es la única cuenta: devuelve un split por el
 *     total (el caller confirma el sobregiro, no hay con qué repartir).
 *   - La preferida no alcanza y hay más cuentas: abre el picker de reparto
 *     pre-sembrado con la preferida, para completar sin dejar negativos.
 *
 * @param {import('../core/state.js').Cuenta[]} cuentas
 * @param {number} monto
 * @param {string|null} preferidaId - cuenta elegida en el formulario.
 * @param {string} [contexto]
 * @returns {Promise<Array<{cuentaId:string, monto:number}>|null>}
 */
export async function resolverPagoConPreferida(cuentas, monto, preferidaId, contexto = 'completar esta operación') {
  const activas = (cuentas ?? []).filter(c => c.activa !== false);
  if (activas.length === 0) {
    _mostrarGuiadoCero(contexto);
    return null;
  }

  const m = Number(monto) || 0;
  const preferida = activas.find(c => c.id === preferidaId) || activas[0];
  const saldoPref = preferida.saldo ?? 0;

  // La cuenta elegida cubre el monto: úsala directamente, sin negativo.
  if (saldoPref >= m) {
    return [{ cuentaId: preferida.id, monto: m }];
  }

  // No alcanza y no hay con qué repartir: un solo split (el caller confirma).
  if (activas.length === 1) {
    return [{ cuentaId: preferida.id, monto: m }];
  }

  // No alcanza y hay más cuentas: repartir, avisando y pre-sembrando la preferida.
  const aviso = `${preferida.nombre} no alcanza para cubrir ${f(m)} (saldo ${f(saldoPref)}). Completa con otra(s) cuenta(s).`;
  return _mostrarPickerMultiCuenta(activas, m, contexto, preferida.id, aviso);
}

/**
 * La cuenta habitual de un compromiso: la de su último pago (HF.2a, R-HF5 del
 * [ADR 091](../../docs/DECISIONS/091-un-hecho-financiero-se-informa-una-vez.md)).
 * Se deriva de los gastos vinculados, sin campo nuevo: el pago que el usuario
 * ya registró dice de dónde suele salir.
 *
 * - El último es el de fecha más reciente; a igual fecha, el de mayor monto (un
 *   pago repartido entre dos cuentas sale sobre todo de una) y, si empatan, el
 *   registrado después.
 * - Una compra con la tarjeta (`consumoTC`) no es un pago de la deuda (BUG-037).
 * - Si la cuenta de ese último pago ya no existe o está inactiva, no hay
 *   habitual: no se adivina con un pago más viejo.
 *
 * Pura: no lee `S`.
 *
 * @param {string} compromisoId
 * @param {Array<{compromisoId?:string, cuentaId?:string, fecha?:string, monto?:number, consumoTC?:boolean}>} gastos
 * @param {import('../core/state.js').Cuenta[]} cuentas
 * @returns {string|null} `Cuenta.id` o null.
 */
export function cuentaHabitualDe(compromisoId, gastos, cuentas) {
  if (!compromisoId) return null;
  let ultimo = null;
  for (const g of Array.isArray(gastos) ? gastos : []) {
    if (!g || g.compromisoId !== compromisoId || !g.cuentaId || g.consumoTC) continue;
    if (typeof g.fecha !== 'string' || !g.fecha) continue;
    if (!ultimo
      || g.fecha > ultimo.fecha
      || (g.fecha === ultimo.fecha && (Number(g.monto) || 0) >= (Number(ultimo.monto) || 0))) {
      ultimo = g;
    }
  }
  if (!ultimo) return null;
  const activa = (cuentas ?? []).some(c => c?.id === ultimo.cuentaId && c.activa !== false);
  return activa ? ultimo.cuentaId : null;
}

/**
 * Resuelve el reparto de un pago cuando NO hay un selector de cuenta en el
 * formulario (flujos de un solo clic, como "Marcar pagado" de Agenda):
 *   - 0 cuentas: diálogo guiado a Mis Cuentas. Devuelve null.
 *   - 1 cuenta: la usa por el total sin preguntar (regla de cuenta única). El
 *     caller confirma el sobregiro si el saldo no alcanza.
 *   - Varias cuentas: muestra el selector de tarjetas para elegir la cuenta
 *     preferida y luego aplica el reparto-fallback de `resolverPagoConPreferida`
 *     (solo abre el picker de reparto si la elegida no cubre el monto).
 *
 * @param {import('../core/state.js').Cuenta[]} cuentas
 * @param {number} monto
 * @param {string} [contexto]
 * @param {{preferidaId?: string|null}} [opciones] `preferidaId`: la cuenta que
 *   el selector trae marcada (HF.2a, la habitual del compromiso). Sin ella, la
 *   de mayor saldo, como siempre.
 * @returns {Promise<Array<{cuentaId:string, monto:number}>|null>}
 */
export async function resolverPagoConSelector(cuentas, monto, contexto = 'completar esta operación', { preferidaId = null } = {}) {
  const activas = (cuentas ?? []).filter(c => c.activa !== false);
  if (activas.length === 0) {
    _mostrarGuiadoCero(contexto);
    return null;
  }

  const m = Number(monto) || 0;

  // Regla de cuenta única: no se pregunta. El caller confirma el sobregiro.
  if (activas.length === 1) {
    return [{ cuentaId: activas[0].id, monto: m }];
  }

  // Varias cuentas: primero elegir la preferida con el selector de tarjetas.
  const elegidaId = await _mostrarSelectorPreferida(activas, m, contexto, preferidaId);
  if (elegidaId === null) return null; // canceló

  // Reparto-fallback: usa la preferida si cubre; si no, abre el picker.
  return resolverPagoConPreferida(cuentas, m, elegidaId, contexto);
}

// ── CASO 0 CUENTAS ───────────────────────────────────────────────

/**
 * Muestra un diálogo informativo y navega a Tesorería.
 * @param {string} contexto
 */
function _mostrarGuiadoCero(contexto) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  despertarOverlay(overlay);
  overlay.dataset.open = '';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'cta-sin-cuentas-title');

  overlay.innerHTML = `
    <div class="modal modal--confirm" role="document">
      <header class="modal__header">
        <h2 id="cta-sin-cuentas-title" class="modal__title">Necesitas una cuenta primero</h2>
      </header>
      <div class="modal__body">
        <p class="confirm__mensaje">Para ${_esc(contexto)}, primero necesitas una cuenta donde entre o de donde salga el dinero. Te llevamos directo al formulario para crearla.</p>
      </div>
      <div class="modal__footer">
        <button type="button" class="btn btn-ghost" data-role="cancelar">Ahora no</button>
        <button type="button" class="btn btn-primary" data-role="ir">Crear una cuenta</button>
      </div>
    </div>`;

  document.body.appendChild(overlay);

  const panel = overlay.querySelector('.modal');
  trapFocus(panel);
  setTimeout(() => overlay.querySelector('[data-role="ir"]')?.focus(), 0);

  function _cerrar() {
    releaseFocus();
    overlay.remove();
    document.removeEventListener('keydown', _onKey);
  }

  function _onKey(e) {
    if (e.key === 'Escape') { e.stopPropagation(); _cerrar(); }
  }

  overlay.addEventListener('click', e => {
    const btn = e.target.closest('[data-role]');
    if (btn?.dataset.role === 'ir') {
      _cerrar();
      navigate('tesoreria');
      // Abre el formulario de nueva cuenta sin importar el dominio: tesoreria
      // escucha este evento en initAccionesCuentas() (mismo CTA que el resto).
      EventBus.emit('cuenta:crear');
    } else if (btn?.dataset.role === 'cancelar' || e.target === overlay) {
      _cerrar();
    }
  });

  document.addEventListener('keydown', _onKey);
}

// ── CASO VARIAS CUENTAS ──────────────────────────────────────────

/**
 * Muestra un picker de cuenta y resuelve con el id elegido o null si cancela.
 * @param {import('../core/state.js').Cuenta[]} activas
 * @param {string} contexto
 * @returns {Promise<string|null>}
 */
function _mostrarPickerCuenta(activas, contexto) {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    despertarOverlay(overlay);
    overlay.dataset.open = '';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'cuenta-picker-title');

    const botones = activas.map(c => `
      <button type="button"
              class="cuenta-picker__btn"
              data-role="elegir"
              data-cuenta-id="${_esc(c.id)}"
              aria-label="Usar cuenta ${_esc(c.nombre)}, saldo ${f(c.saldo ?? 0)}">
        <span class="cuenta-picker__main">
          ${bancoAvatar(c.banco, c.icono)}
          <span class="cuenta-picker__nombre">${_esc(c.nombre)}</span>
        </span>
        <span class="cuenta-picker__saldo">${f(c.saldo ?? 0)}</span>
      </button>`).join('');

    overlay.innerHTML = `
      <div class="modal modal--confirm" role="document">
        <header class="modal__header">
          <h2 id="cuenta-picker-title" class="modal__title">¿Desde qué cuenta?</h2>
        </header>
        <div class="modal__body">
          <p class="confirm__mensaje">Elige la cuenta desde la que quieres ${_esc(contexto)}.</p>
          <div class="cuenta-picker__lista" role="list">
            ${botones}
          </div>
        </div>
        <div class="modal__footer">
          <button type="button" class="btn btn-ghost" data-role="cancelar">Cancelar</button>
        </div>
      </div>`;

    document.body.appendChild(overlay);

    const panel = overlay.querySelector('.modal');
    trapFocus(panel);
    setTimeout(() => overlay.querySelector('[data-role="elegir"]')?.focus(), 0);

    function _cerrar(valor) {
      releaseFocus();
      overlay.remove();
      document.removeEventListener('keydown', _onKey);
      resolve(valor);
    }

    function _onKey(e) {
      if (e.key === 'Escape') { e.stopPropagation(); _cerrar(null); }
    }

    overlay.addEventListener('click', e => {
      const btn = e.target.closest('[data-role]');
      if (btn?.dataset.role === 'elegir') {
        _cerrar(btn.dataset.cuentaId || null);
      } else if (btn?.dataset.role === 'cancelar' || e.target === overlay) {
        _cerrar(null);
      }
    });

    document.addEventListener('keydown', _onKey);
  });
}

/** "Cuenta de ahorros", "Cuenta corriente"; los demás tipos, tal cual. */
const _TIPO_CUENTA = { Ahorros: 'Cuenta de ahorros', Corriente: 'Cuenta corriente' };

/**
 * La cuenta que la hoja del pago propone (AH.1c, ADR 150 D5): la preferida
 * si está activa; si no, la de mayor saldo. Pura.
 *
 * @param {import('../core/state.js').Cuenta[]} activas
 * @param {string|null} preferidaId
 * @returns {import('../core/state.js').Cuenta}
 */
export function cuentaPropuesta(activas, preferidaId = null) {
  return activas.find(c => c.id === preferidaId)
    ?? [...activas].sort((a, b) => (b.saldo ?? 0) - (a.saldo ?? 0))[0];
}

/**
 * Cómo queda una cuenta frente al pago: lo que sobra si alcanza, lo que
 * falta si no. Pura.
 *
 * @param {{ saldo?: number }} cuenta
 * @param {number} monto
 * @returns {{ alcanza: boolean, queda: number, falta: number }}
 */
export function cuentaFrenteAlPago(cuenta, monto) {
  const saldo = Number(cuenta?.saldo) || 0;
  const m = Number(monto) || 0;
  return { alcanza: saldo >= m, queda: Math.max(0, saldo - m), falta: Math.max(0, m - saldo) };
}

/**
 * HTML de la hoja "¿Desde qué cuenta vas a realizar el pago?" (AH.1c, ADR 150
 * D5). Dos vistas en el mismo cuerpo: plegada (la cuenta propuesta, su saldo y
 * lo que queda después del pago, con "Cambiar") y la lista de todas las
 * cuentas como opciones. Los radios viven siempre en la lista: plegada o
 * abierta, la elegida se lee igual. Pura respecto al estado.
 *
 * @param {import('../core/state.js').Cuenta[]} activas
 * @param {number} monto
 * @param {string|null} [preferidaId]
 * @returns {string}
 */
export function htmlHojaCuentaPago(activas, monto, preferidaId = null) {
  const propuesta = cuentaPropuesta(activas, preferidaId);
  const frente = cuentaFrenteAlPago(propuesta, monto);
  const tipo = _TIPO_CUENTA[propuesta.tipo] ?? propuesta.tipo ?? '';
  const despues = frente.alcanza
    ? `<p class="cuenta-pago__despues"><svg class="icon cuenta-pago__despues-icono cuenta-pago__despues-icono--ok" aria-hidden="true"><use href="#i-check-circle"/></svg><span>Después del pago te quedan <strong>${f(frente.queda)}</strong></span></p>`
    : `<p class="cuenta-pago__despues"><svg class="icon cuenta-pago__despues-icono cuenta-pago__despues-icono--falta" aria-hidden="true"><use href="#i-alert"/></svg><span>No alcanza sola: faltan <strong>${f(frente.falta)}</strong>. Al pagar eliges con qué completar.</span></p>`;

  const opciones = activas.map((c) => {
    const fc = cuentaFrenteAlPago(c, monto);
    return `
        <label class="cuenta-pago__opcion">
          <input type="radio" name="cuentaId" class="cuenta-pago__radio" value="${_esc(c.id)}" ${c.id === propuesta.id ? 'checked' : ''} />
          <span class="cuenta-pago__logo cuenta-pago__logo--opcion">${bancoAvatar(c.banco, c.icono)}</span>
          <span class="cuenta-pago__opcion-textos">
            <span class="cuenta-pago__opcion-nombre">${_esc(c.nombre)}</span>
            <span class="cuenta-pago__opcion-saldo">${f(c.saldo ?? 0)}</span>
            ${fc.alcanza ? '' : `<span class="cuenta-pago__opcion-falta">No alcanza sola · faltan ${f(fc.falta)}</span>`}
          </span>
          <span class="cuenta-pago__marca" aria-hidden="true"><svg class="icon" aria-hidden="true"><use href="#i-check"/></svg></span>
        </label>`;
  }).join('');

  return `
      <div class="cuenta-pago" data-vista="plegada">
        <div class="cuenta-pago__elegida">
          <div class="cuenta-pago__cabeza">
            <span class="cuenta-pago__logo">${bancoAvatar(propuesta.banco, propuesta.icono)}</span>
            <div class="cuenta-pago__nombres">
              <p class="cuenta-pago__nombre">${_esc(propuesta.nombre)}</p>
              ${tipo ? `<p class="cuenta-pago__tipo">${_esc(tipo)}</p>` : ''}
            </div>
            <button type="button" class="cuenta-pago__cambiar" data-role="cambiar" aria-expanded="false" aria-label="Cambiar de cuenta"><svg class="icon" aria-hidden="true"><use href="#i-transferencia"/></svg>Cambiar</button>
          </div>
          <div class="cuenta-pago__division" aria-hidden="true"></div>
          <p class="cuenta-pago__rotulo">Saldo disponible</p>
          <p class="cuenta-pago__saldo">${f(propuesta.saldo ?? 0)}</p>
          ${despues}
        </div>
        <div class="cuenta-pago__lista" role="radiogroup" aria-labelledby="cuenta-pref-title">${opciones}
        </div>
      </div>`;
}

/**
 * La hoja para elegir la cuenta de un pago (AH.1c, ADR 150 D5), en los flujos
 * sin formulario: "Marcar pagado" y el lote de Inicio. Abre plegada en la
 * cuenta propuesta; "Cambiar" muestra todas. Resuelve con el id de la cuenta
 * elegida o null si el usuario cierra. El reparto, si la elegida no alcanza,
 * lo sigue haciendo `resolverPagoConPreferida`.
 *
 * @param {import('../core/state.js').Cuenta[]} activas
 * @param {number} monto
 * @param {string} _contexto (ya no se dice en la hoja: el título basta)
 * @param {string|null} [preferidaId]
 * @returns {Promise<string|null>}
 */
function _mostrarSelectorPreferida(activas, monto, _contexto, preferidaId = null) {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    despertarOverlay(overlay);
    overlay.dataset.open = '';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'cuenta-pref-title');

    // OB.1 (ADR 151 D5): una instrucción directa y nada más, sin la frase que
    // repetía lo que el usuario acababa de marcar.
    overlay.innerHTML = `
      <div class="modal modal--confirm modal--cuenta-pago" role="document">
        <header class="modal__header">
          <h2 id="cuenta-pref-title" class="modal__title">¿Desde qué cuenta vas a realizar el pago?</h2>
          <button type="button" class="modal__close btn btn-icon btn-ghost" data-role="cancelar" aria-label="Cerrar"><svg class="icon" aria-hidden="true"><use href="#i-x"/></svg></button>
        </header>
        <div class="modal__body">${htmlHojaCuentaPago(activas, monto, preferidaId)}
        </div>
        <div class="modal__footer">
          <button type="button" class="btn btn-primary cuenta-pago__pagar" data-role="confirmar">Pagar ${f(monto)}</button>
        </div>
      </div>`;

    document.body.appendChild(overlay);

    const panel = overlay.querySelector('.modal');
    const hoja = overlay.querySelector('.cuenta-pago');
    trapFocus(panel);
    setTimeout(() => overlay.querySelector('[data-role="confirmar"]')?.focus(), 0);

    function _cerrar(valor) {
      releaseFocus();
      overlay.remove();
      document.removeEventListener('keydown', _onKey);
      resolve(valor);
    }

    function _onKey(e) {
      if (e.key === 'Escape') { e.stopPropagation(); _cerrar(null); }
    }

    overlay.addEventListener('click', e => {
      const btn = e.target.closest('[data-role]');
      if (btn?.dataset.role === 'cambiar') {
        hoja.dataset.vista = 'lista';
        btn.setAttribute('aria-expanded', 'true');
        overlay.querySelector('.cuenta-pago__radio:checked')?.focus();
      } else if (btn?.dataset.role === 'confirmar') {
        const elegida = overlay.querySelector('input[name="cuentaId"]:checked')?.value || null;
        _cerrar(elegida);
      } else if (btn?.dataset.role === 'cancelar' || e.target === overlay) {
        _cerrar(null);
      }
    });

    document.addEventListener('keydown', _onKey);
  });
}

// ── CASO VARIAS CUENTAS: PAGO REPARTIDO ──────────────────────────

/**
 * Conjunto de cuentas a pre-marcar partiendo de una preferida: incluye la
 * preferida y, si no alcanza, agrega las demás por mayor saldo hasta cubrir.
 *
 * @param {import('../core/state.js').Cuenta[]} activas
 * @param {number} monto
 * @param {string} preferidaId
 * @returns {Set<string>}
 */
function _preseleccionConPreferida(activas, monto, preferidaId) {
  const set = new Set();
  let acumulado = 0;
  const pref = activas.find(c => c.id === preferidaId);
  if (pref) {
    set.add(pref.id);
    acumulado += Math.max(0, pref.saldo ?? 0);
  }
  const otras = activas
    .filter(c => c.id !== preferidaId && (c.saldo ?? 0) > 0)
    .sort((a, b) => (b.saldo ?? 0) - (a.saldo ?? 0));
  for (const c of otras) {
    if (acumulado >= monto) break;
    set.add(c.id);
    acumulado += c.saldo ?? 0;
  }
  return set;
}

/**
 * Picker multi-selección: el usuario marca una o varias cuentas y el sistema
 * reparte el monto entre ellas (mayor saldo primero) sin dejar negativos.
 * Resuelve con el array de splits cuando el pago queda cubierto, o null.
 *
 * @param {import('../core/state.js').Cuenta[]} activas
 * @param {number} monto
 * @param {string} contexto
 * @param {string|null} [preferidaId] - cuenta a pre-sembrar (la elegida en el form).
 * @param {string} [aviso] - mensaje de advertencia (ej. "la cuenta no alcanza").
 * @returns {Promise<Array<{cuentaId:string, monto:number}>|null>}
 */
function _mostrarPickerMultiCuenta(activas, monto, contexto, preferidaId = null, aviso = '') {
  return new Promise(resolve => {
    // Pre-selección: si hay cuenta preferida, partir de ella y sumar las de
    // mayor saldo hasta cubrir. Si no, el conjunto mínimo (mayor saldo primero);
    // si ni todas alcanzan, se pre-marcan todas.
    let preSel;
    if (preferidaId) {
      preSel = _preseleccionConPreferida(activas, monto, preferidaId);
    } else {
      const previo = distribuirPago(activas, monto);
      preSel = new Set(
        previo.ok ? previo.splits.map(s => s.cuentaId) : activas.map(c => c.id),
      );
    }

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    despertarOverlay(overlay);
    overlay.dataset.open = '';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'cuenta-multi-title');

    const filas = activas.map(c => `
      <label class="cuenta-multi__row">
        <input type="checkbox" class="cuenta-multi__check"
               data-cuenta-id="${_esc(c.id)}" ${preSel.has(c.id) ? 'checked' : ''} />
        <span class="cuenta-picker__main">
          ${bancoAvatar(c.banco, c.icono)}
          <span class="cuenta-picker__nombre">${_esc(c.nombre)}</span>
        </span>
        <span class="cuenta-multi__cifras">
          <span class="cuenta-picker__saldo">${f(c.saldo ?? 0)}</span>
          <span class="cuenta-multi__draw" data-draw-for="${_esc(c.id)}"></span>
        </span>
      </label>`).join('');

    overlay.innerHTML = `
      <div class="modal modal--confirm" role="document">
        <header class="modal__header">
          <h2 id="cuenta-multi-title" class="modal__title">¿Desde qué cuentas?</h2>
        </header>
        <div class="modal__body">
          ${aviso ? `<p class="cuenta-multi__aviso">${_esc(aviso)}</p>` : ''}
          <p class="confirm__mensaje">Elige una o varias cuentas para ${_esc(contexto)} de <strong>${f(monto)}</strong>. Repartimos automáticamente desde la de mayor saldo, sin dejar ninguna en negativo.</p>
          <div class="cuenta-multi__lista">
            ${filas}
          </div>
          <p class="cuenta-multi__resumen" data-role="resumen" aria-live="polite"></p>
        </div>
        <div class="modal__footer">
          <button type="button" class="btn btn-ghost" data-role="cancelar">Cancelar</button>
          <button type="button" class="btn btn-primary" data-role="confirmar">Registrar pago</button>
        </div>
      </div>`;

    document.body.appendChild(overlay);

    const panel        = overlay.querySelector('.modal');
    const resumenEl    = overlay.querySelector('[data-role="resumen"]');
    const btnConfirmar = overlay.querySelector('[data-role="confirmar"]');
    let ultimo = { ok: false, splits: [] };

    function _seleccionActual() {
      return [...overlay.querySelectorAll('.cuenta-multi__check:checked')]
        .map(ch => activas.find(c => c.id === ch.dataset.cuentaId))
        .filter(Boolean)
        .map(c => ({ id: c.id, saldo: c.saldo ?? 0 }));
    }

    function _recalcular() {
      const sel = _seleccionActual();
      const r = distribuirPago(sel, monto, preferidaId);
      ultimo = r;

      const porCuenta = new Map(r.splits.map(s => [s.cuentaId, s.monto]));
      overlay.querySelectorAll('[data-draw-for]').forEach(el => {
        const id = el.dataset.drawFor;
        const checked = overlay.querySelector(`.cuenta-multi__check[data-cuenta-id="${id}"]`)?.checked;
        const usa = porCuenta.get(id) || 0;
        if (checked && usa > 0) {
          el.textContent = `Se usará ${f(usa)}`;
          el.classList.remove('cuenta-multi__draw--idle');
        } else if (checked) {
          el.textContent = 'No se usará (ya cubierto)';
          el.classList.add('cuenta-multi__draw--idle');
        } else {
          el.textContent = '';
        }
      });

      if (r.ok) {
        resumenEl.textContent = `✓ Cubre el pago de ${f(monto)}.`;
        resumenEl.classList.remove('cuenta-multi__resumen--danger');
        btnConfirmar.disabled = false;
      } else {
        resumenEl.textContent = sel.length === 0
          ? `Selecciona al menos una cuenta. Necesitas ${f(monto)}.`
          : `Cubres ${f(r.cubierto)} de ${f(monto)}. Faltan ${f(r.faltante)}.`;
        resumenEl.classList.add('cuenta-multi__resumen--danger');
        btnConfirmar.disabled = true;
      }
    }

    overlay.addEventListener('change', e => {
      if (e.target.classList?.contains('cuenta-multi__check')) _recalcular();
    });

    trapFocus(panel);
    _recalcular();
    setTimeout(() => btnConfirmar.focus(), 0);

    function _cerrar(valor) {
      releaseFocus();
      overlay.remove();
      document.removeEventListener('keydown', _onKey);
      resolve(valor);
    }

    function _onKey(e) {
      if (e.key === 'Escape') { e.stopPropagation(); _cerrar(null); }
    }

    overlay.addEventListener('click', e => {
      const btn = e.target.closest('[data-role]');
      if (btn?.dataset.role === 'confirmar') {
        if (ultimo.ok) _cerrar(ultimo.splits);
      } else if (btn?.dataset.role === 'cancelar' || e.target === overlay) {
        _cerrar(null);
      }
    });

    document.addEventListener('keydown', _onKey);
  });
}

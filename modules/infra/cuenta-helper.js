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
 *   - Sin imports de dominios salvo lógica pura: el nombre corto de una cuenta
 *     sale de Mis cuentas (INI.3), como `infra/avisos.js` lee la de cada dominio.
 */

import { EventBus } from '../core/state.js';
import { TARJETA_PREFIJO, CATEGORIA_DEUDA_ICONO } from '../core/constants.js';
import { trapFocus, releaseFocus, despertarOverlay } from './a11y.js';
import { esc as _esc, f } from './utils.js';
import { navigate } from './router.js';
import { bancoAvatar } from './bancos.js';
import { resolverMarca, tejaMarca } from './marcas.js';
import { tejaCategoria } from './icons.js';
import { tipoDeCuenta } from './render.js';
import { nombreCortoCuenta } from '../dominio/tesoreria/logic/cuentas.js';

/**
 * Lo que devuelve una hoja del pago cuando el usuario toca "Volver" (INI.2d,
 * ADR 152 D6): quien la abrió vuelve a mostrar la hoja anterior.
 */
export const VOLVER = 'volver';

/**
 * El nombre de una cuenta cuando su tipo va aparte (INI.3, ADR 153 D3). Se
 * reexporta para que un dominio que ya pinta cuentas con este helper (el
 * recibo de Registrar gasto, GAS.3) la nombre igual sin importar Mis cuentas.
 */
export { nombreCortoCuenta };

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
 * Resuelve el reparto de un pago partiendo de una cuenta preferida (la que el
 * usuario eligió en el formulario):
 *   - 0 cuentas: diálogo guiado a Mis Cuentas. Devuelve null.
 *   - La preferida cubre el monto: la usa por el total. Devuelve un split.
 *   - La preferida no alcanza y es la única cuenta: devuelve un split por el
 *     total (el caller confirma el sobregiro, no hay con qué repartir).
 *   - La preferida no alcanza y hay más cuentas: abre "Completa el pago" con
 *     la preferida marcada, para que el usuario elija con qué completar.
 *
 * INI.3 (ADR 153 D5): se retiró `resolverPagoMultiCuenta`, sin llamadores, que
 * abría el reparto ya marcado con las cuentas de mayor saldo: Finko no reparte
 * por su cuenta un pago que el usuario no eligió.
 *
 * @param {import('../core/state.js').Cuenta[]} cuentas
 * @param {number} monto
 * @param {string|null} preferidaId - cuenta elegida en el formulario.
 * @param {string} [contexto]
 * @returns {Promise<Array<{cuentaId:string, monto:number}>|null>}
 */
export async function resolverPagoConPreferida(cuentas, monto, preferidaId, contexto = 'completar esta operación', { volver = false } = {}) {
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

  // No alcanza y hay más cuentas: el usuario elige con qué completar.
  return _mostrarPickerMultiCuenta(activas, m, preferida.id, { volver });
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
export async function resolverPagoConSelector(cuentas, monto, contexto = 'completar esta operación', { preferidaId = null, volver = false } = {}) {
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

  // Varias cuentas: la hoja "¿Desde qué cuenta pagas?" (INI.2d, ADR 152 D6).
  // Si la elegida no alcanza, la hoja ya lo dijo y su botón lleva a completar
  // con otra; desde ahí, "Volver" regresa a esta hoja con la misma elegida.
  let elegidaId = preferidaId;
  for (;;) {
    elegidaId = await _mostrarSelectorPreferida(activas, m, contexto, elegidaId, { volver });
    if (elegidaId === null || elegidaId === VOLVER) return elegidaId; // cerró o volvió
    const splits = await resolverPagoConPreferida(cuentas, m, elegidaId, contexto, { volver: true });
    if (splits !== VOLVER) return splits;
  }
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
 * Lo que el usuario tiene a la mano cuando la cuenta marcada no alcanza
 * (INI.3, ADR 153 D4). Tres casos, porque cada uno pide hacer algo distinto:
 *
 * - `otra`: otra cuenta sola cubre el pago (por ejemplo, la que recibió el
 *   dinero que el usuario ya pasó para pagar): basta con elegirla.
 * - `varias`: ninguna sola alcanza, pero sumando varias sí.
 * - `ninguna`: ni sumando todas alcanza; primero hay que registrar el dinero.
 *
 * Solo cuenta el saldo positivo de cada cuenta, como `repartirEnOrden`: una
 * cuenta en negativo no aporta. Pura.
 *
 * @param {import('../core/state.js').Cuenta[]} activas
 * @param {number} monto
 * @param {string|null} [elegidaId]
 * @returns {null|{ caso: 'otra'|'varias'|'ninguna', falta: number, faltaTotal: number }}
 *   null si la marcada alcanza. `falta`: lo que le falta a la marcada;
 *   `faltaTotal`: lo que falta aun sumando todas las cuentas.
 */
export function opcionesSiNoAlcanza(activas, monto, elegidaId = null) {
  const lista = Array.isArray(activas) ? activas : [];
  if (lista.length === 0) return null;
  const m = Number(monto) || 0;
  const elegida = cuentaPropuesta(lista, elegidaId);
  const fc = cuentaFrenteAlPago(elegida, m);
  if (fc.alcanza) return null;
  const disponible = lista.reduce((s, c) => s + Math.max(0, Number(c.saldo) || 0), 0);
  const otra = lista.some(c => c.id !== elegida.id && (Number(c.saldo) || 0) >= m);
  const caso = otra ? 'otra' : disponible >= m ? 'varias' : 'ninguna';
  return { caso, falta: fc.falta, faltaTotal: Math.max(0, m - disponible) };
}

/**
 * El único mensaje de la hoja cuando la marcada no alcanza (INI.3, ADR 153
 * D4): dice cuánto falta y solo lo que se puede hacer en ese caso.
 *
 * @param {NonNullable<ReturnType<typeof opcionesSiNoAlcanza>>} op
 * @returns {string} HTML (las cifras van en `<strong>`).
 */
function _mensajeNoAlcanza(op) {
  if (op.caso === 'ninguna') {
    return `No tienes saldo suficiente para cubrir el pago, ni sumando todas tus cuentas: faltan <strong>${f(op.faltaTotal)}</strong>. Registra primero en tus cuentas el dinero que necesitas.`;
  }
  const inicio = `No tienes saldo suficiente en esta cuenta para cubrir el pago: faltan <strong>${f(op.falta)}</strong>.`;
  return op.caso === 'otra'
    ? `${inicio} Puedes elegir otra cuenta o varias para completar el valor. Si ya pasaste el dinero a una sola cuenta, elígela para registrar el pago.`
    : `${inicio} Puedes completar el valor con varias cuentas o pasar primero el dinero a una sola.`;
}

/**
 * Una fila de "¿Desde qué cuenta pagas?" (INI.2d, ADR 152 D6): el logo, la
 * entidad (`nombreCortoCuenta`), el tipo (`tipoDeCuenta`), el saldo y el
 * círculo de marcado, sobre un radio `name="cuentaId"` que cubre la fila. La
 * comparte "¿Con qué pagaste?" de Registrar gasto (GAS.3, ADR 156 D5).
 *
 * Una tarjeta de crédito entra con `tarjeta`: su teja, su nombre, "Cupo
 * disponible" y el valor con el prefijo `TARJETA_PREFIJO`. Pura.
 *
 * @param {import('../core/state.js').Cuenta | import('../core/state.js').Compromiso} c
 * @param {{ marcada?: boolean, saldo?: string, tarjeta?: boolean }} [opciones]
 *   `saldo`: la cifra ya escrita (con la máscara del ojo, si va); por
 *   defecto, el saldo de la cuenta.
 * @returns {string}
 */
export function htmlOpcionCuenta(c, { marcada = false, saldo, tarjeta = false } = {}) {
  const valor = tarjeta ? TARJETA_PREFIJO + c.id : c.id;
  const figura = tarjeta ? tejaTarjeta(c) : bancoAvatar(c.banco, c.icono);
  const nombre = tarjeta ? (c.descripcion ?? 'Tarjeta') : nombreCortoCuenta(c);
  const tipo = tarjeta ? 'Cupo disponible' : tipoDeCuenta(c, true);
  return `
          <label class="cuenta-pago__opcion">
            <input type="radio" name="cuentaId" class="cuenta-pago__radio" value="${_esc(valor)}"${marcada ? ' checked' : ''} />
            <span class="cuenta-pago__logo">${figura}</span>
            <span class="cuenta-pago__textos">
              <span class="cuenta-pago__nombre">${_esc(nombre)}</span>
              ${tipo ? `<span class="cuenta-pago__tipo">${_esc(tipo)}</span>` : ''}
            </span>
            <span class="cuenta-pago__saldo">${saldo ?? f(c.saldo ?? 0)}</span>
            <span class="cuenta-pago__marca" aria-hidden="true"></span>
          </label>`;
}

/**
 * El cuerpo de la hoja "¿Desde qué cuenta pagas?" (INI.2d, ADR 152 D6):
 * "Total a pagar $X" y las cuentas en una sola tarjeta, cada una con su
 * logo, su entidad, su tipo, su saldo y el círculo de marcado a la derecha.
 * Si la marcada no alcanza, debajo de su fila va un solo mensaje con cuánto
 * falta y qué hacer (INI.3, ADR 153 D3 y D4). Pura respecto al estado.
 *
 * @param {import('../core/state.js').Cuenta[]} activas
 * @param {number} monto
 * @param {string|null} [elegidaId] - la marcada; sin ella, la propuesta.
 * @returns {string}
 */
export function htmlHojaCuentaPago(activas, monto, elegidaId = null) {
  const elegida = cuentaPropuesta(activas, elegidaId);
  const op = opcionesSiNoAlcanza(activas, monto, elegida.id);
  const filas = activas.map((c) => {
    const marcada = c.id === elegida.id;
    const falta = marcada && op ? `
          <div class="cuenta-pago__falta" role="status">
            <p class="cuenta-pago__falta-caja"><svg class="icon" aria-hidden="true"><use href="#i-info"/></svg><span>${_mensajeNoAlcanza(op)}</span></p>
          </div>` : '';
    return htmlOpcionCuenta(c, { marcada }) + falta;
  }).join('');

  return `
        <p class="cuenta-pago__total">Total a pagar <strong>${f(monto)}</strong></p>
        <fieldset class="cuenta-pago__lista">
          <legend class="sr-only">Cuenta de origen</legend>${filas}
        </fieldset>`;
}

/**
 * El botón de la hoja: pagar si la marcada alcanza; completar si sumando
 * cuentas se puede (INI.2d); apagado si ni sumando todas alcanza (INI.3).
 * @returns {{ texto: string, apagado: boolean }}
 */
function _botonPagarCuenta(activas, monto, elegidaId) {
  const op = opcionesSiNoAlcanza(activas, monto, elegidaId);
  if (!op) return { texto: `Pagar ${f(monto)}`, apagado: false };
  if (op.caso === 'ninguna') return { texto: 'No alcanza con tus cuentas', apagado: true };
  return { texto: 'Completar con otra cuenta', apagado: false };
}

/** Pinta el botón de la hoja de la cuenta según la marcada. */
function _pintarBotonCuenta(boton, activas, monto, elegidaId) {
  const b = _botonPagarCuenta(activas, monto, elegidaId);
  boton.textContent = b.texto;
  boton.disabled = b.apagado;
}

/** El botón "Volver" de las hojas del pago: la flecha de "Siguiente", al revés. */
const _BOTON_VOLVER = '<button type="button" class="modal__volver" data-role="volver" aria-label="Volver"><svg class="icon" aria-hidden="true"><use href="#i-chevron-right"/></svg></button>';

/**
 * La hoja "¿Desde qué cuenta pagas?" (INI.2d, ADR 152 D6), en los flujos sin
 * formulario: "Marcar pagado" y el lote de Inicio. Abre marcada la cuenta
 * propuesta; marcar otra repinta la lista. Resuelve con el id de la cuenta
 * marcada (alcance o no: si no alcanza, quien llama abre "Completa el
 * pago"), con `VOLVER` si el usuario toca la flecha, o null si cierra.
 *
 * @param {import('../core/state.js').Cuenta[]} activas
 * @param {number} monto
 * @param {string} _contexto (ya no se dice en la hoja: el título basta)
 * @param {string|null} [preferidaId]
 * @param {{ volver?: boolean }} [opciones] - con `volver`, la flecha de volver.
 * @returns {Promise<string|null>}
 */
function _mostrarSelectorPreferida(activas, monto, _contexto, preferidaId = null, { volver = false } = {}) {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    despertarOverlay(overlay);
    overlay.dataset.open = '';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'cuenta-pref-title');

    let elegidaId = cuentaPropuesta(activas, preferidaId).id;
    overlay.innerHTML = `
      <div class="modal modal--confirm modal--cuenta-pago" role="document">
        <header class="modal__header">
          ${volver ? _BOTON_VOLVER : ''}
          <h2 id="cuenta-pref-title" class="modal__title">¿Desde qué cuenta pagas?</h2>
          <button type="button" class="modal__close btn btn-icon btn-ghost" data-role="cancelar" aria-label="Cerrar"><svg class="icon" aria-hidden="true"><use href="#i-x"/></svg></button>
        </header>
        <div class="modal__body" data-role="cuerpo">${htmlHojaCuentaPago(activas, monto, elegidaId)}
        </div>
        <div class="modal__footer">
          <button type="button" class="btn btn-primary cuenta-pago__pagar" data-role="confirmar"></button>
        </div>
      </div>`;

    document.body.appendChild(overlay);

    const panel = overlay.querySelector('.modal');
    const cuerpo = overlay.querySelector('[data-role="cuerpo"]');
    const boton = overlay.querySelector('[data-role="confirmar"]');
    _pintarBotonCuenta(boton, activas, monto, elegidaId);
    trapFocus(panel);
    // Con el botón apagado (ni sumando alcanza), el foco va a la cuenta marcada.
    setTimeout(() => (boton.disabled ? cuerpo.querySelector('.cuenta-pago__radio:checked') : boton)?.focus(), 0);

    function _cerrar(valor) {
      releaseFocus();
      overlay.remove();
      document.removeEventListener('keydown', _onKey);
      resolve(valor);
    }

    function _onKey(e) {
      if (e.key === 'Escape') { e.stopPropagation(); _cerrar(null); }
    }

    // Marcar otra cuenta repinta la lista (el aviso de lo que falta va debajo
    // de la marcada) y el botón; el foco se queda en la cuenta marcada.
    overlay.addEventListener('change', (e) => {
      if (!e.target.classList?.contains('cuenta-pago__radio')) return;
      elegidaId = e.target.value;
      cuerpo.innerHTML = htmlHojaCuentaPago(activas, monto, elegidaId);
      _pintarBotonCuenta(boton, activas, monto, elegidaId);
      cuerpo.querySelector('.cuenta-pago__radio:checked')?.focus();
    });

    overlay.addEventListener('click', e => {
      const btn = e.target.closest('[data-role]');
      if (btn?.dataset.role === 'confirmar') {
        if (btn.disabled) return;
        _cerrar(overlay.querySelector('input[name="cuentaId"]:checked')?.value || elegidaId);
      } else if (btn?.dataset.role === 'volver') {
        _cerrar(VOLVER);
      } else if (btn?.dataset.role === 'cancelar' || e.target === overlay) {
        _cerrar(null);
      }
    });

    document.addEventListener('keydown', _onKey);
  });
}

// ── CASO VARIAS CUENTAS: PAGO REPARTIDO ──────────────────────────

/**
 * El reparto de "Completa el pago" (INI.2e, ADR 152 D7): las cuentas en el
 * orden en que se marcaron; la primera pone lo que tiene (sin quedar en
 * negativo) y la siguiente lo que falta. Pura.
 *
 * @param {Array<{ id: string, saldo?: number }>} enOrden
 * @param {number} monto
 * @returns {{ ok: boolean, splits: Array<{cuentaId:string, monto:number}>, usa: Map<string, number>, cubierto: number, faltante: number }}
 */
export function repartirEnOrden(enOrden, monto) {
  const objetivo = Math.max(0, Math.round(Number(monto) || 0));
  let falta = objetivo;
  const usa = new Map();
  const splits = [];
  for (const c of Array.isArray(enOrden) ? enOrden : []) {
    if (!c || c.id == null) continue;
    const toma = Math.min(falta, Math.max(0, Number(c.saldo) || 0));
    usa.set(c.id, toma);
    if (toma > 0) {
      splits.push({ cuentaId: c.id, monto: toma });
      falta -= toma;
    }
  }
  return { ok: objetivo > 0 && falta === 0, splits, usa, cubierto: objetivo - falta, faltante: falta };
}

/**
 * Las filas de "Completa el pago" (INI.2e, ADR 152 D7): cada cuenta con su
 * logo, nombre y tipo; a la derecha su saldo y, si está marcada, cuánto usa
 * ("Usa $80.000") o "No hace falta"; la casilla al final. Pura.
 *
 * @param {import('../core/state.js').Cuenta[]} activas
 * @param {string[]} orden - ids marcados, en el orden en que se marcaron.
 * @param {Map<string, number>} usa
 * @returns {string}
 */
export function htmlFilasCompletar(activas, orden, usa) {
  return activas.map((c) => {
    const marcada = orden.includes(c.id);
    const u = usa.get(c.id) || 0;
    const uso = marcada ? (u > 0 ? `Usa ${f(u)}` : 'No hace falta') : '';
    const tipo = tipoDeCuenta(c, true);
    return `
          <label class="cuenta-pago__opcion cuenta-multi__row">
            <input type="checkbox" class="cuenta-multi__check" data-cuenta-id="${_esc(c.id)}"${marcada ? ' checked' : ''} />
            <span class="cuenta-pago__logo">${bancoAvatar(c.banco, c.icono)}</span>
            <span class="cuenta-pago__textos">
              <span class="cuenta-pago__nombre">${_esc(nombreCortoCuenta(c))}</span>
              ${tipo ? `<span class="cuenta-pago__tipo">${_esc(tipo)}</span>` : ''}
            </span>
            <span class="cuenta-multi__cifras">
              <span class="cuenta-pago__saldo">${f(c.saldo ?? 0)}</span>
              ${uso ? `<span class="cuenta-multi__usa${u > 0 ? '' : ' cuenta-multi__usa--nada'}">${uso}</span>` : ''}
            </span>
            <span class="cuenta-multi__caja" aria-hidden="true"><svg class="icon" aria-hidden="true"><use href="#i-check"/></svg></span>
          </label>`;
  }).join('');
}

/**
 * El único mensaje de "Completa el pago" (INI.3, ADR 153 D4 y D5), según cómo
 * va el reparto: qué falta hacer o, con el pago cubierto, cómo queda
 * registrado. Nunca dice algo que no aplique al momento. Pura.
 *
 * @param {import('../core/state.js').Cuenta[]} activas
 * @param {number} monto
 * @param {string[]} orden - ids marcados, en el orden en que se marcaron.
 * @param {ReturnType<typeof repartirEnOrden>} r
 * @returns {{ mensaje: string, boton: string }} el mensaje en HTML.
 */
export function estadoCompletar(activas, monto, orden, r) {
  if (r.ok) {
    if (r.splits.length === 1) {
      const c = activas.find(x => x.id === r.splits[0].cuentaId);
      return { mensaje: `El pago se registra completo desde <strong>${_esc(c ? nombreCortoCuenta(c) : 'esta cuenta')}</strong>.`, boton: `Pagar ${f(monto)}` };
    }
    return { mensaje: 'Se registra un pago desde cada cuenta marcada, por el valor que ves en cada una.', boton: `Pagar ${f(monto)}` };
  }
  const disponible = activas.reduce((s, c) => s + Math.max(0, Number(c.saldo) || 0), 0);
  if (disponible < monto) {
    return {
      mensaje: `Ni sumando todas tus cuentas alcanza: faltan <strong>${f(monto - disponible)}</strong>. Registra primero en tus cuentas el dinero que necesitas.`,
      boton: 'No alcanza con tus cuentas',
    };
  }
  return {
    mensaje: `${orden.length === 0 ? 'Elige las cuentas que vas a usar.' : 'Elige otra cuenta para completar el valor.'} Cada una pone lo que tiene, en el orden en que las eliges.`,
    boton: 'Elige otra cuenta',
  };
}

/**
 * "Completa el pago" (INI.2e, ADR 152 D7): el usuario marca una o varias
 * cuentas y el pago se reparte en el orden en que las marcó. Abre marcada la
 * cuenta que no alcanzó (la preferida). Al pie, "Pago completo" o "Faltan
 * $X", cuánto va cubierto y una barra; el botón paga solo con el pago
 * cubierto. Arriba, un solo mensaje según el caso (INI.3, `estadoCompletar`).
 * Resuelve con los splits, con `VOLVER` si se toca la flecha, o null si se
 * cierra.
 *
 * @param {import('../core/state.js').Cuenta[]} activas
 * @param {number} monto
 * @param {string|null} [preferidaId] - la cuenta que no alcanzó.
 * @param {{ volver?: boolean }} [opciones]
 * @returns {Promise<Array<{cuentaId:string, monto:number}>|null>}
 */
function _mostrarPickerMultiCuenta(activas, monto, preferidaId = null, { volver = false } = {}) {
  return new Promise(resolve => {
    // INI.3 (ADR 153 D5): sin preferida no se marca nada; el usuario elige.
    let orden = activas.some(c => c.id === preferidaId) ? [preferidaId] : [];

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    despertarOverlay(overlay);
    overlay.dataset.open = '';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'cuenta-multi-title');

    overlay.innerHTML = `
      <div class="modal modal--confirm modal--cuenta-pago modal--completar" role="document">
        <header class="modal__header">
          ${volver ? _BOTON_VOLVER : ''}
          <h2 id="cuenta-multi-title" class="modal__title">Completa el pago</h2>
          <button type="button" class="modal__close btn btn-icon btn-ghost" data-role="cancelar" aria-label="Cerrar"><svg class="icon" aria-hidden="true"><use href="#i-x"/></svg></button>
        </header>
        <div class="modal__body">
          <p class="cuenta-pago__intro" data-role="mensaje"></p>
          <fieldset class="cuenta-pago__lista">
            <legend class="sr-only">Cuentas para el pago</legend>
            <div data-role="filas"></div>
          </fieldset>
        </div>
        <div class="modal__footer cuenta-multi__pie">
          <div class="cuenta-multi__estado" aria-live="polite">
            <span class="cuenta-multi__resumen" data-role="resumen"></span>
            <span class="cuenta-multi__cubierto" data-role="cubierto"></span>
          </div>
          <div class="cuenta-multi__barra" aria-hidden="true"><span class="cuenta-multi__avance" data-role="avance"></span></div>
          <button type="button" class="btn btn-primary cuenta-pago__pagar" data-role="confirmar"></button>
        </div>
      </div>`;

    document.body.appendChild(overlay);

    const panel        = overlay.querySelector('.modal');
    const filasEl      = overlay.querySelector('[data-role="filas"]');
    const resumenEl    = overlay.querySelector('[data-role="resumen"]');
    const cubiertoEl   = overlay.querySelector('[data-role="cubierto"]');
    const avanceEl     = overlay.querySelector('[data-role="avance"]');
    const btnConfirmar = overlay.querySelector('[data-role="confirmar"]');
    const mensajeEl    = overlay.querySelector('[data-role="mensaje"]');
    let ultimo = { ok: false, splits: [] };

    function _recalcular() {
      const enOrden = orden.map(id => activas.find(c => c.id === id)).filter(Boolean);
      const r = repartirEnOrden(enOrden, monto);
      ultimo = r;
      filasEl.innerHTML = htmlFilasCompletar(activas, orden, r.usa);
      const estado = estadoCompletar(activas, monto, orden, r);
      mensajeEl.innerHTML = estado.mensaje;
      const completo = r.ok;
      resumenEl.innerHTML = completo
        ? '<svg class="icon" aria-hidden="true"><use href="#i-check"/></svg>Pago completo'
        : `Faltan ${f(r.faltante)}`;
      resumenEl.classList.toggle('cuenta-multi__resumen--falta', !completo);
      cubiertoEl.textContent = `${f(r.cubierto)} de ${f(monto)}`;
      const pct = monto > 0 ? Math.round((r.cubierto / monto) * 1000) / 10 : 0;
      avanceEl.style.width = `${pct}%`;
      avanceEl.classList.toggle('cuenta-multi__avance--falta', !completo);
      btnConfirmar.disabled = !completo;
      btnConfirmar.textContent = estado.boton;
    }

    // Marcar suma la cuenta al final del orden; desmarcar la saca.
    overlay.addEventListener('change', e => {
      const ch = e.target;
      if (!ch.classList?.contains('cuenta-multi__check')) return;
      const id = ch.dataset.cuentaId;
      orden = ch.checked ? [...orden.filter(x => x !== id), id] : orden.filter(x => x !== id);
      _recalcular();
      overlay.querySelector(`.cuenta-multi__check[data-cuenta-id="${CSS.escape(id)}"]`)?.focus();
    });

    trapFocus(panel);
    _recalcular();
    setTimeout(() => (btnConfirmar.disabled ? overlay.querySelector('.cuenta-multi__check:not(:checked)') : btnConfirmar)?.focus(), 0);

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
      } else if (btn?.dataset.role === 'volver') {
        _cerrar(VOLVER);
      } else if (btn?.dataset.role === 'cancelar' || e.target === overlay) {
        _cerrar(null);
      }
    });

    document.addEventListener('keydown', _onKey);
  });
}

/**
 * tesoreria/views/transferencias.js - entrada y formulario de "Transferir
 * dinero" entre cuentas propias (MC.17b, ADR ninguno: brief General 6-8).
 *
 * Sub-modulo de tesoreria/view.js (barrel). Reglas de la capa:
 * - Puede leer S. No puede mutarlo.
 * - Devuelve strings HTML o escribe en el DOM (no ambas cosas en la misma funcion).
 * - Sin logica de negocio: delegar a logic/.
 */

import { S } from '../../../core/state.js';
import { f, esc as _esc } from '../../../infra/utils.js';
import { icon } from '../../../infra/icons.js';
import { bancoAvatar } from '../../../infra/bancos.js';
import { renderSelectorCuenta } from '../../../infra/cuenta-helper.js';
import { cuentasActivas } from '../logic/cuentas.js';

/**
 * Renderiza el botón de entrada en `#tesoreria-transferir`. Patrón 0/1/2/varias
 * (extiende la regla de cuenta única): con menos de 2 cuentas activas no hay
 * dos endpoints posibles, así que la entrada no aparece. No-op si el
 * contenedor no existe.
 *
 * MC-DIS.9 C3 (regla R21): era `btn-ghost btn-sm` sin ícono, el control más
 * discreto de una sección donde tres primarios solo crean una ficha, y nacía
 * bajo el pliegue. Pasa a control de ancho completo con borde, 44px de alto y
 * el ícono `i-transferencia` (el mismo del ledger, MC.17c). Sigue sin ser
 * primario: el primario de la sección es uno solo, el del encabezado (R11).
 */
export function renderBotonTransferir() {
  const el = document.getElementById('tesoreria-transferir');
  if (!el) return;

  const activas = cuentasActivas(S.cuentas ?? []);
  if (activas.length < 2) { el.innerHTML = ''; return; }

  // ADR 080 D2: conserva su anatomía de R38 (ancho completo, 44px, borde) y
  // gana la marca de atajo. El verbo es un movimiento, así que su casa
  // canónica es la teja "Transferir" de Registrar; acá se declara la copia en
  // vez de fingir que son dos caminos distintos (R72).
  el.innerHTML = `
    <button type="button" class="transferir-entrada" data-action="abrir-transferencia">
      ${icon('transferencia')}
      Transferir entre cuentas
      <span class="chip">Atajo</span>
    </button>`;
}

/** Una cuenta del par en el widget de 2 cuentas: avatar + nombre + saldo. */
function _filaParCuenta(cuenta) {
  return `
      <div class="transferir-par__cuenta">
        ${bancoAvatar(cuenta.banco, cuenta.icono)}
        <div class="transferir-par__info">
          <span class="transferir-par__nombre">${_esc(cuenta.nombre)}</span>
          <span class="transferir-par__saldo">${f(cuenta.saldo ?? 0)}</span>
        </div>
      </div>`;
}

/**
 * Widget "De A a B" para exactamente 2 cuentas activas: par fijo + botón para
 * invertir la dirección (MC.17b). Los inputs hidden llevan los ids que lee
 * `validarTransferencia`/`normalizarTransferencia`. `acciones/transferencias.js`
 * reemplaza `#transferencia-par-wrap` por una nueva llamada a esta función con
 * origen/destino invertidos, sin re-renderizar el resto del formulario.
 *
 * @param {import('../../../core/state.js').Cuenta} origen
 * @param {import('../../../core/state.js').Cuenta} destino
 * @returns {string}
 */
export function renderParTransferencia(origen, destino) {
  return `
    <div class="form-group" id="transferencia-par-wrap">
      <span class="label">¿Entre qué cuentas?</span>
      <div class="transferir-par">
        ${_filaParCuenta(origen)}
        <button type="button" class="transferir-par__swap" data-action="invertir-transferencia"
                aria-label="Invertir origen y destino">
          ${icon('transferencia')}
        </button>
        ${_filaParCuenta(destino)}
      </div>
      <input type="hidden" name="cuentaOrigenId" value="${_esc(origen.id)}" />
      <input type="hidden" name="cuentaDestinoId" value="${_esc(destino.id)}" />
    </div>`;
}

/**
 * Sección opcional del 4x1000 (GMF, MC.17d). Solo se muestra cuando la cuenta
 * de origen NO está exenta (`aplica4x1000 === true`): un checkbox marcado por
 * defecto (refleja lo que el banco cobrará: el saldo queda exacto sin que el
 * usuario haga nada) que el usuario puede desmarcar si tiene el cupo exento del
 * mes disponible. Devuelve '' cuando el origen es exento o no hay origen, para
 * no complicar el flujo (mismo criterio "no molestar cuando no aplica" que el
 * hint de cuota de manejo). El monto del gravamen se calcula en vivo en la
 * acción (`_actualizarHintGMF`) a medida que el usuario escribe el monto.
 *
 * Va dentro de `#transferencia-gmf-slot` (contenedor estable): la acción lo
 * re-renderiza cuando cambia el origen (botón invertir o selector), sin tocar
 * el resto del formulario.
 *
 * @param {import('../../../core/state.js').Cuenta} [origen]
 * @returns {string}
 */
export function renderSeccionGMF(origen) {
  if (!origen || origen.aplica4x1000 !== true) return '';
  return `
    <div class="form-group form-group--checkbox" id="transferencia-gmf">
      <label class="checkbox-row">
        <input type="checkbox" name="aplicarGMF" checked />
        <span>Descontar el 4x1000 (GMF) de este retiro</span>
      </label>
      <p class="form-hint form-hint--muted" id="transferencia-gmf-hint">
        ${_esc(origen.nombre)} no está exenta del gravamen. Escribe el monto para ver el costo.
      </p>
    </div>`;
}

/**
 * Formulario completo del modal "Transferir dinero" (MC.17b). Automatización
 * por conteo de cuentas activas:
 *   - 2 cuentas: `renderParTransferencia()`, par fijo con botón invertir.
 *   - 3+ cuentas: dos `renderSelectorCuenta()` independientes (origen/destino,
 *     mismo componente que usan ingreso puntual y abono a deuda), sin excluir
 *     la cuenta ya elegida en el otro selector: elegir la misma en ambos se
 *     bloquea con un mensaje claro de `validarTransferencia` al confirmar, en
 *     vez de sumar lógica de filtrado en vivo entre dos radiogroups.
 *
 * Devuelve '' con menos de 2 cuentas activas (no hay nada que transferir).
 *
 * @returns {string}
 */
export function renderFormTransferencia() {
  const activas = cuentasActivas(S.cuentas ?? []);
  if (activas.length < 2) return '';

  // El origen inicial es la cuenta de mayor saldo, tanto en el widget de par
  // (par ordenado desc → origen = primera) como en los selectores 3+
  // (renderSelectorCuenta pre-selecciona la de mayor saldo). Con eso se decide
  // si la sección de GMF aparece de entrada.
  const ordenadas     = [...activas].sort((a, b) => (b.saldo ?? 0) - (a.saldo ?? 0));
  const origenInicial = ordenadas[0];

  const seccionCuentas = activas.length === 2
    ? renderParTransferencia(...ordenadas)
    : `
      ${renderSelectorCuenta(activas, { label: '¿De qué cuenta sale el dinero?', name: 'cuentaOrigenId' })}
      ${renderSelectorCuenta(activas, { label: '¿A qué cuenta entra el dinero?', name: 'cuentaDestinoId' })}`;

  return `
    <form id="form-transferencia" novalidate>
      ${seccionCuentas}
      <div class="form-group">
        <label for="transferencia-monto" class="label">Monto a transferir (COP)</label>
        <input id="transferencia-monto" name="monto" type="number" class="input"
               min="0" step="10000" inputmode="numeric" required />
      </div>
      <div id="transferencia-gmf-slot">${renderSeccionGMF(origenInicial)}</div>
      <div class="form-group">
        <label for="transferencia-fecha" class="label">Fecha</label>
        <input id="transferencia-fecha" name="fecha" type="date" class="input" required />
      </div>
      <div class="form-group">
        <label for="transferencia-nota" class="label">Nota (opcional)</label>
        <input id="transferencia-nota" name="nota" type="text" class="input"
               placeholder="Ej. arriendo, ahorro del mes" />
      </div>
      <div class="modal__footer">
        <button type="button" class="btn btn-ghost" data-action="modal-close">Cancelar</button>
        <button type="submit" class="btn btn-primary">Transferir</button>
      </div>
    </form>`;
}

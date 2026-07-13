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
import { bancoAvatar } from '../../../infra/bancos.js';
import { renderSelectorCuenta } from '../../../infra/cuenta-helper.js';
import { cuentasActivas } from '../logic/cuentas.js';

/**
 * Renderiza el botón de entrada en `#tesoreria-transferir`. Patrón 0/1/2/varias
 * (extiende la regla de cuenta única): con menos de 2 cuentas activas no hay
 * dos endpoints posibles, así que la entrada no aparece. No-op si el
 * contenedor no existe.
 */
export function renderBotonTransferir() {
  const el = document.getElementById('tesoreria-transferir');
  if (!el) return;

  const activas = cuentasActivas(S.cuentas ?? []);
  if (activas.length < 2) { el.innerHTML = ''; return; }

  el.innerHTML = `
    <button type="button" class="btn btn-ghost btn-sm transferir-entrada" data-action="abrir-transferencia">
      Transferir entre cuentas
    </button>`;
}

/** Una cuenta del par en el widget de 2 cuentas: avatar + nombre + saldo. */
function _filaParCuenta(cuenta) {
  return `
      <div class="transferir-par__cuenta">
        ${bancoAvatar(cuenta.banco)}
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
          <span aria-hidden="true">⇄</span>
        </button>
        ${_filaParCuenta(destino)}
      </div>
      <input type="hidden" name="cuentaOrigenId" value="${_esc(origen.id)}" />
      <input type="hidden" name="cuentaDestinoId" value="${_esc(destino.id)}" />
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

  const seccionCuentas = activas.length === 2
    ? renderParTransferencia(
        ...[...activas].sort((a, b) => (b.saldo ?? 0) - (a.saldo ?? 0)),
      )
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

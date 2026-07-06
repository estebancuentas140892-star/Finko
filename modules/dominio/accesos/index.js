/**
 * accesos/index.js - accesos rápidos personalizables de Inicio (IN.4a, ADR 028 D2).
 *
 * Sin colección propia en S: solo lee/escribe `S.config.accesosInicio`
 * (array de ids). Registra sus propias acciones (abrir el modal, alternar un
 * acceso) y su render en el ciclo de Inicio, mismo patrón que `movimientos`.
 */

import { S } from '../../core/state.js';
import { save } from '../../core/storage.js';
import { registrarAccion } from '../../ui/actions.js';
import { abrirModal } from '../../ui/modales.js';
import { renderSmart, registrarRender } from '../../infra/render.js';
import { alternarAcceso } from './logic.js';
import { renderAccesosInicio, renderModalPersonalizarAccesos } from './view.js';

function _renderTodo() {
  renderSmart(renderAccesosInicio, 'dash');
}

/** Abre el modal "Personalizar" con la lista siempre al día. */
function _abrirPersonalizar() {
  const overlay = document.getElementById('modal-personalizar-accesos');
  if (!overlay) return;
  renderModalPersonalizarAccesos();
  abrirModal(overlay);
}

/** Agrega o quita un acceso y refresca tanto el modal como los tiles de Inicio. */
function _alternar(el) {
  const id = el.dataset.id;
  if (!id) return;
  S.config.accesosInicio = alternarAcceso(S.config?.accesosInicio, id);
  save();
  renderModalPersonalizarAccesos();
  renderAccesosInicio();
}

export function initAccesos() {
  registrarAccion('accesos-personalizar', _abrirPersonalizar);
  registrarAccion('accesos-toggle', _alternar);

  // Re-render al volver a #dash - mismo motivo que movimientos/resumen: si el
  // usuario llega navegando desde otra sección, sin esto la fila queda vacía.
  window.addEventListener('hashchange', _renderTodo);

  // Para que renderAll() (bootstrap) también pinte la fila de tiles.
  registrarRender(_renderTodo);

  _renderTodo();
}

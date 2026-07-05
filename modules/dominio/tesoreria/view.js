/**
 * tesoreria/view.js - barrel de re-exports de la capa de presentacion.
 *
 * El view del dominio esta dividido en 3 sub-modulos bajo `views/`. Este
 * archivo re-exporta las funciones publicas (API estable para acciones/,
 * index.js y los tests) y expone `renderTesoreria()`, el render completo
 * del dominio que usan renderSmart y los handlers de cuentas.
 *
 * Sub-modulos:
 *   - views/cuentas.js      -> lista de cuentas, form del modal, indicador GMF
 *   - views/ingresos.js     -> listas y forms de ingresos, nudge proximo cobro
 *   - views/distribucion.js -> tarjeta de distribucion y asistente por pasos
 *
 * Regla: ninguno de los sub-modulos contiene logica de negocio (toda en
 * logic/); pueden leer S, no mutarlo. Cero imports cross-dominio.
 */

import { renderListaCuentas, renderFormCuenta, renderGMFIndicador } from './views/cuentas.js';
import {
  renderListaIngresos,
  renderFormIngreso,
  renderListaIngresosPuntuales,
  renderFormIngresoPuntual,
  renderNudgeProximoIngreso,
} from './views/ingresos.js';
import { renderDistribucionIngreso, renderNudgeDistribucionInicio } from './views/distribucion.js';

export {
  renderListaCuentas,
  renderFormCuenta,
  renderGMFIndicador,
  renderListaIngresos,
  renderFormIngreso,
  renderListaIngresosPuntuales,
  renderFormIngresoPuntual,
  renderNudgeProximoIngreso,
  renderDistribucionIngreso,
  renderNudgeDistribucionInicio,
};

/** Re-renderiza la vista completa del dominio (el `_renderTodo` historico). */
export function renderTesoreria() {
  renderListaCuentas();
  renderGMFIndicador();
  renderNudgeProximoIngreso();
  renderDistribucionIngreso();
  renderListaIngresos();
  renderListaIngresosPuntuales();
}

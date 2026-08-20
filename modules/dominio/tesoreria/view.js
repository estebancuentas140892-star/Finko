/**
 * tesoreria/view.js - barrel de re-exports de la capa de presentacion.
 *
 * El view del dominio esta dividido en 3 sub-modulos bajo `views/`. Este
 * archivo re-exporta las funciones publicas (API estable para acciones/,
 * index.js y los tests) y expone `renderTesoreria()`, el render completo
 * del dominio que usan renderSmart y los handlers de cuentas.
 *
 * Sub-modulos:
 *   - views/cuentas.js         -> lista de cuentas, form del modal, indicador GMF
 *   - views/ingresos.js        -> listas y forms de ingresos, nudge proximo cobro
 *   - views/distribucion.js    -> tarjeta de distribucion y asistente por pasos
 *   - views/transferencias.js  -> entrada y form de "Transferir dinero" (MC.17b)
 *
 * Regla: ninguno de los sub-modulos contiene logica de negocio (toda en
 * logic/); pueden leer S, no mutarlo. Cero imports cross-dominio.
 */

import {
  renderHeroTesoreria,
  renderListaCuentas,
  renderFormCuenta,
  renderGMFIndicador,
  renderTarjetasTC,
} from './views/cuentas.js';
import {
  renderListaIngresos,
  renderFormIngreso,
  renderListaIngresosPuntuales,
  renderFormIngresoPuntual,
  renderNudgeProximoIngreso,
  renderAltasIngreso,
} from './views/ingresos.js';
import {
  renderDistribucionIngreso,
  renderNudgeDistribucionInicio,
  renderAsistenteDistribucion,
} from './views/distribucion.js';
import {
  renderBotonTransferir,
  renderFormTransferencia,
  renderParTransferencia,
  renderSeccionGMF,
} from './views/transferencias.js';

export {
  renderHeroTesoreria,
  renderListaCuentas,
  renderFormCuenta,
  renderGMFIndicador,
  renderTarjetasTC,
  renderListaIngresos,
  renderFormIngreso,
  renderListaIngresosPuntuales,
  renderFormIngresoPuntual,
  renderNudgeProximoIngreso,
  renderAltasIngreso,
  renderDistribucionIngreso,
  renderNudgeDistribucionInicio,
  renderAsistenteDistribucion,
  renderBotonTransferir,
  renderFormTransferencia,
  renderParTransferencia,
  renderSeccionGMF,
};

/** Re-renderiza la vista completa del dominio (el `_renderTodo` historico). */
export function renderTesoreria() {
  // El orden de esta función es el de la pantalla (ADR 080 D1): cuentas y su
  // transferir, después las fuentes de ingreso con su fila de altas y su
  // tarjeta de reparto, y al final los dos bloques de solo lectura, que
  // bajaron a la banda "Solo informativo".
  renderHeroTesoreria();
  renderListaCuentas();
  renderBotonTransferir();
  renderNudgeProximoIngreso();
  renderListaIngresos();
  renderListaIngresosPuntuales();
  renderAltasIngreso();
  // Al final de la columna (ADR 035): la tarjeta de "Distribuir mi ingreso"
  // cierra el trabajo de los ingresos, después de las fuentes que resume.
  renderDistribucionIngreso();
  renderTarjetasTC();
  renderGMFIndicador();
}

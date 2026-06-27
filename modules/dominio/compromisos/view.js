/**
 * compromisos/view.js - barrel de re-exports de la capa de presentación.
 *
 * El view del dominio está dividido en 5 sub-módulos bajo `views/`. Este
 * archivo solo re-exporta las funciones públicas, manteniendo la API estable
 * para `index.js` y para cualquier consumidor externo.
 *
 * Sub-módulos:
 *   - views/alertas.js       → renderAlertaFijosSinPagar, renderAlertaDeudasDurmiendo
 *   - views/lista.js         → renderListaCompromisos
 *   - views/formularios.js   → renderChooserCompromiso, renderFormDeuda, renderFormAbono
 *   - views/estrategia.js    → setEstrategiaUI, getEstrategiaUI, renderEstrategiaPago
 *   - views/dashboard.js     → renderPanelVencidos, renderPanelPrioridades
 *
 * Regla: ninguno de los sub-módulos contiene lógica de negocio (toda en
 * logic.js); pueden leer S, no mutarlo. Cero imports cross-dominio.
 */

export { renderAlertaFijosSinPagar, renderAlertaDeudasDurmiendo } from './views/alertas.js';
export { renderListaCompromisos } from './views/lista.js';
export { renderFormAbono, renderChooserCompromiso, renderFormDeuda, renderSimulacion } from './views/formularios.js';
export { setEstrategiaUI, getEstrategiaUI, renderEstrategiaPago } from './views/estrategia.js';
export { renderPanelVencidos, renderPanelPrioridades } from './views/dashboard.js';

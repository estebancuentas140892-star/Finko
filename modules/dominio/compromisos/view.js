/**
 * compromisos/view.js - barrel de re-exports de la capa de presentación.
 *
 * El view del dominio está dividido en 7 sub-módulos bajo `views/`. Este
 * archivo solo re-exporta las funciones públicas, manteniendo la API estable
 * para `index.js` y para cualquier consumidor externo.
 *
 * Sub-módulos:
 *   - views/hero.js          → renderHeroCompromisos
 *   - views/alertas.js       → renderAlertaDeudasDurmiendo
 *   - views/lista.js         → renderListaCompromisos
 *   - views/formularios.js   → renderFormDeuda, renderFormAbono, renderFormAvance, renderFormGastoFijo
 *   - views/estrategia.js    → setEstrategiaUI, getEstrategiaUI, renderEstrategiaPago
 *   - views/dashboard.js     → renderPanelVencidos, renderPanelPrioridades
 *   - views/lote.js          → renderLoteCard, renderFormPagoLote (ficha 05, ADR 069)
 *
 * Regla: ninguno de los sub-módulos contiene lógica de negocio (toda en
 * logic.js); pueden leer S, no mutarlo. Cero imports cross-dominio.
 */

export { renderHeroCompromisos, saldoDeudaAlCierre } from './views/hero.js';
export { renderAlertaDeudasDurmiendo } from './views/alertas.js';
export { renderListaCompromisos, setFiltroPorPagar, getFiltroPorPagar, filtroDeLente, lentePorPagar, resumenFijosDelMes, setGrupoDeudas, filasResumenDelMes, tejaCompromiso, tejaDeudaInventario, tituloDeuda } from './views/lista.js';
export { renderFormAbono, renderFormAvance, renderFormDeuda, ENTIDADES_DEUDA, nombreDeudaEntidad, htmlFacturaQuienDeuda, inicialesNombre, etiquetaCategoriaDeuda, formaPagoDeDeuda, renderFormGastoFijo, textoBannerGastoFijo, textoFrecuenciaGastoFijo, textoSePagaFijo, htmlFacturaQuienFijo, htmlContextoGastoFijo, CATEGORIA_NUEVA_VALUE_FIJO, FRECUENCIAS_CHIP_FIJO, FRECUENCIA_OTRA_FIJO } from './views/formularios.js';
export { setEstrategiaUI, getEstrategiaUI, renderEstrategiaPago, renderEntradaPlanSalida } from './views/estrategia.js';
export { renderPanelVencidos, renderPanelPrioridades } from './views/dashboard.js';
export { renderLoteCard, renderFormPagoLote } from './views/lote.js';

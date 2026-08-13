/**
 * bootstrap.js - entry point de la aplicación.
 *
 * Orden de inicialización (no cambiar sin revisar dependencias):
 * 1. loadData()        - hidrata S desde localStorage antes de cualquier render.
 * 1b. initFlushOnHide() - flush inmediato de save() si la pestaña se oculta/cierra.
 * 2. initAcciones()    - registra delegación data-action en document.
 * 3. initShell()     - aplica tema guardado.
 * 4. initRouter()    - activa la sección del hash actual y escucha hashchange.
 * 5. initOnboarding()      - wizard si es primera vez, no-op si ya completó.
 * 5b. initBloqueoAcceso()  - candado de acceso (CFG.5a) si el usuario activó
 *                            PIN. Va antes del gate legal: mientras el candado
 *                            esté cerrado, ese gate y las novedades esperan.
 * 6. renderAll()     - pinta el estado inicial en el DOM.
 * 6b. initAceptacionLegal()- gate de re-aceptación si el usuario existente
 *                            quedó con una versión legal vieja (LEG.2).
 * 6c. revisarDebitosAutomaticos() - hoja de pagos automáticos vencidos (PA.1a).
 *                            Va detrás de todos los gates y no escribe nada.
 */

import { loadData, initFlushOnHide } from '../core/storage.js';
import { S, EventBus } from '../core/state.js';
import { initShell, markActiveNav, initSidebarCollapse } from './shell.js';
import { initRouter } from '../infra/router.js';
import { initAcciones } from './actions.js';
import { initOnboarding } from './onboarding.js';
import { initAceptacionLegal, faltaAceptarLegal } from './aceptacion-legal.js';
import { initBloqueoAcceso, faltaDesbloquear } from './bloqueo-acceso.js';
import { renderAll } from '../infra/render.js';
import { verificarYNotificar } from '../infra/notificaciones.js';
import { precalentarAnalisis } from '../dominio/analisis/view.js';
import { precalentarMovimientos } from '../dominio/movimientos/view.js';
import { initTesoreria } from '../dominio/tesoreria/index.js';
import { initGastos } from '../dominio/gastos/index.js';
import { initMetas } from '../dominio/metas/index.js';
import { initApartados } from '../dominio/apartados/index.js';
import { initAhorro } from '../dominio/ahorro/index.js';
import { initInversiones } from '../dominio/inversiones/index.js';
import { initCompromisos } from '../dominio/compromisos/index.js';
import { initResumen } from '../dominio/resumen/index.js';
import { initMovimientos } from '../dominio/movimientos/index.js';
import { initAccesos } from '../dominio/accesos/index.js';
import { initAgenda, revisarDebitosAutomaticos } from '../dominio/agenda/index.js';
import { initPersonales } from '../dominio/personales/index.js';
import { initPresupuesto } from '../dominio/presupuesto/index.js';
import { initAnalisis } from '../dominio/analisis/index.js';
import { initConfig } from '../dominio/config/index.js';
import { initImport } from '../dominio/import/index.js';
import { initLogros } from '../dominio/logros/index.js';
import { initMenuMas } from './menu-mas.js';
import { initRegistrar } from './registrar.js';
import { initInstallPrompt } from './install-prompt.js';
import { initSwAviso } from './sw-aviso.js';
import { mostrarNovedadesSiHay } from './novedades.js';

loadData();
initFlushOnHide();
initAcciones();

// Dominios: registran sus acciones antes de que el usuario pueda interactuar.
initTesoreria();
initGastos();
initMetas();
initApartados();
initAhorro();
initInversiones();
initCompromisos();
initResumen();
initMovimientos();
initAccesos();
initAgenda();
initPersonales();
initPresupuesto();
initAnalisis();
initConfig();
initImport();

initShell();
initSidebarCollapse();
initRouter(markActiveNav);
initOnboarding();
initBloqueoAcceso();
initMenuMas();
initRegistrar();
initInstallPrompt();
renderAll();
initLogros();
initSwAviso();
// Gates que van DETRÁS del candado (CFG.5a): dos overlays bloqueantes a la vez
// se pelean el foco y el opaco del candado taparía al de aceptación legal, así
// que si hay PIN pendiente esperan a que se abra.
// Si el gate de aceptación legal queda abierto (usuario existente con versión
// vieja), las novedades esperan: aceptacion-legal.js las dispara al aceptar.
function _gatesTrasCandado() {
  initAceptacionLegal();
  if (!faltaAceptarLegal()) mostrarNovedadesSiHay();
  // PA.1a (ADR 052 D1): el catch-up de pagos automáticos va al final de la
  // cadena y no escribe nada: solo abre la hoja de confirmación si hay débitos
  // vencidos. Si alguno de los gates de arriba dejó su overlay abierto, la hoja
  // se salta sola esta apertura (no se apilan dos diálogos modales).
  revisarDebitosAutomaticos();
}

if (faltaDesbloquear()) {
  const _alDesbloquear = () => {
    EventBus.off('bloqueo:abierto', _alDesbloquear);
    _gatesTrasCandado();
  };
  EventBus.on('bloqueo:abierto', _alDesbloquear);
} else {
  _gatesTrasCandado();
}

// Verificar compromisos próximos y mostrar notificación si el usuario optó-in.
// Se ejecuta después del primer render para no bloquear el arranque.
verificarYNotificar(S.compromisos);

// PERF.7c: precalienta en idle el bundle memoizado de Análisis y el
// historial completo de Movimientos, para que la primera navegación a esas
// secciones caiga en caché en vez de pagar el cómputo frío. Fallback
// `setTimeout` para navegadores sin `requestIdleCallback` (ej. Safari).
const _idleWarmUp = typeof window.requestIdleCallback === 'function'
  ? window.requestIdleCallback
  : (fn) => setTimeout(fn, 1);
_idleWarmUp(() => {
  precalentarAnalisis();
  precalentarMovimientos();
});

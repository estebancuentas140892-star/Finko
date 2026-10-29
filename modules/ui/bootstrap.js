/**
 * bootstrap.js - entry point de la aplicación.
 *
 * Orden de inicialización (no cambiar sin revisar dependencias):
 * 1. loadData()        - hidrata S desde localStorage antes de cualquier render.
 * 1b. initFlushOnHide() - flush inmediato de save() si la pestaña se oculta/cierra.
 * 1c. capturarEnlaceDeAcceso() - guarda la sesión que trae el enlace del correo de
 *                          la nube (NUBE.1) y limpia el hash antes del router.
 * 2. initAcciones()    - registra delegación data-action en document.
 * 3. initShell()     - aplica tema guardado.
 * 3b. initBloqueGastos() e initBloqueAhorro() - inyectan la franja de lentes
 *                          del bloque Gastos y la fila de chips del bloque
 *                          Ahorro, que markActiveNav necesita en el DOM desde
 *                          la primera pasada del router.
 * 4. initRouter()    - activa la sección del hash actual y escucha hashchange.
 * 4b. initVolver()   - en móvil, volver al origen real y recuperar el scroll
 *                      (ADR 098). Detrás del router: su hashchange corre con
 *                      la sección ya visible.
 * 5. initOnboarding()      - wizard si es primera vez, no-op si ya completó.
 * 5b. initPerfiles() o initBloqueoAcceso() - con niños, "¿Quién usa Finko?"
 *                            (APR.3a); si no, el candado de acceso (CFG.5a) si
 *                            el usuario activó PIN. Va antes del gate legal:
 *                            mientras esté cerrado, ese gate y las novedades
 *                            esperan.
 * 6. renderAll()     - pinta el estado inicial en el DOM.
 * 6b. initAceptacionLegal()- gate de re-aceptación si el usuario existente
 *                            quedó con una versión legal vieja (LEG.2).
 * 6c. revisarDebitosAutomaticos() - hoja de pagos automáticos vencidos (PA.1a).
 *                            Va detrás de todos los gates y no escribe nada.
 */

import { loadData, initFlushOnHide } from '../core/storage.js';
import { capturarEnlaceDeAcceso } from '../infra/nube.js';
import { EventBus } from '../core/state.js';
import { initShell, markActiveNav, initSidebarCollapse } from './shell.js';
import { initRouter } from '../infra/router.js';
import { initAcciones } from './actions.js';
import { initOnboarding } from './onboarding.js';
import { initAceptacionLegal, faltaAceptarLegal } from './aceptacion-legal.js';
import { initBloqueoAcceso, faltaDesbloquear } from './bloqueo-acceso.js';
import { initPerfiles } from './quien-usa.js';
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
import { initAprende } from '../dominio/aprende/index.js';
import { initNino } from '../dominio/nino/index.js';
import { initMenuMas } from './menu-mas.js';
import { initBloqueGastos } from './bloque-gastos.js';
import { initBloqueAhorro } from './bloque-ahorro.js';
import { initBloqueInicio } from './bloque-inicio.js';
import { initVolver } from './volver.js';
import { initDetalleFila } from './detalle-fila.js';
import { initAtencionHoy } from './atencion-hoy.js';
import { initHojaPerfil } from './hoja-perfil.js';
import { initTelefonoAdulto } from './telefono-adulto.js';
import { initRegistrar } from './registrar.js';
import { initInstallPrompt } from './install-prompt.js';
import { initSwAviso } from './sw-aviso.js';
import { mostrarNovedadesSiHay } from './novedades.js';

loadData();
initFlushOnHide();
// El enlace del correo de acceso (NUBE.1) trae la sesión en el hash: se
// guarda y se limpia antes de que el router lo lea como una ruta.
capturarEnlaceDeAcceso();
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
initAprende();
initNino();

initShell();
initSidebarCollapse();
// La franja de lentes del bloque Gastos (ADR 069) se inyecta ANTES del
// router: markActiveNav corre en la primera pasada de initRouter y necesita
// las pestañas ya en el DOM para marcar la activa.
initBloqueGastos();
initBloqueAhorro();
initBloqueInicio();
initRouter(markActiveNav);
// ADR 098 D1-D2: el volver de móvil (origen real y scroll recuperado). Va
// detrás del router para que su `hashchange` corra con la sección ya visible.
initVolver();
initDetalleFila();
// ADR 099 D1: "Atención hoy" de móvil en una lista, con su hoja.
initAtencionHoy();
// ADR 099 D6: el avatar de Inicio en móvil abre la hoja de perfil.
initHojaPerfil();
// ADR 100 D5: "Este teléfono es de un adulto" desde la app del niño.
initTelefonoAdulto();
initOnboarding();
// APR.3a (ADR 093 D1): con niños en el dispositivo, Finko abre en "¿Quién usa
// Finko?" y el adulto da su PIN ahí; sin niños, el candado de siempre.
if (!initPerfiles()) initBloqueoAcceso();
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

// CFG.3a (ADR 066): recolectar los avisos del día con el motor único y mostrar
// una notificación si el usuario optó-in y hay algo grave. Se ejecuta después
// del primer render para no bloquear el arranque.
verificarYNotificar();

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

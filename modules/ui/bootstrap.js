/**
 * bootstrap.js - entry point de la aplicación.
 *
 * Orden de inicialización (no cambiar sin revisar dependencias):
 * 1. loadData()      - hidrata S desde localStorage antes de cualquier render.
 * 2. initAcciones()  - registra delegación data-action en document.
 * 3. initShell()     - aplica tema guardado.
 * 4. initRouter()    - activa la sección del hash actual y escucha hashchange.
 * 5. initOnboarding()- wizard si es primera vez, no-op si ya completó.
 * 6. renderAll()     - pinta el estado inicial en el DOM.
 */

import { loadData } from '../core/storage.js';
import { S } from '../core/state.js';
import { initShell, markActiveNav, initSidebarCollapse } from './shell.js';
import { initRouter } from '../infra/router.js';
import { initAcciones } from './actions.js';
import { initOnboarding } from './onboarding.js';
import { renderAll } from '../infra/render.js';
import { verificarYNotificar } from '../infra/notificaciones.js';
import { initTesoreria } from '../dominio/tesoreria/index.js';
import { initIngresos } from '../dominio/ingresos/index.js';
import { initGastos } from '../dominio/gastos/index.js';
import { initMetas } from '../dominio/metas/index.js';
import { initCompromisos } from '../dominio/compromisos/index.js';
import { initPersonales } from '../dominio/personales/index.js';
import { initPresupuesto } from '../dominio/presupuesto/index.js';
import { initAnalisis } from '../dominio/analisis/index.js';
import { initCalculadoras } from '../dominio/calculadoras/index.js';
import { initConfig } from '../dominio/config/index.js';
import { initImport } from '../dominio/import/index.js';
import { initLogros } from '../dominio/logros/index.js';
import { initMenuMas } from './menu-mas.js';
import { initInstallPrompt } from './install-prompt.js';

loadData();
initAcciones();

// Dominios: registran sus acciones antes de que el usuario pueda interactuar.
initTesoreria();
initIngresos();
initGastos();
initMetas();
initCompromisos();
initPersonales();
initPresupuesto();
initAnalisis();
initCalculadoras();
initConfig();
initImport();

initShell();
initSidebarCollapse();
initRouter(markActiveNav);
initOnboarding();
initMenuMas();
initInstallPrompt();
renderAll();
initLogros();

// Verificar compromisos próximos y mostrar notificación si el usuario optó-in.
// Se ejecuta después del primer render para no bloquear el arranque.
verificarYNotificar(S.compromisos);

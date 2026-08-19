/**
 * shell.js - navigation state, theme toggle y sidebar colapsable.
 */

import { EventBus } from '../core/state.js';
import { updSaldo } from '../infra/render.js';

const THEME_KEY    = 'fk_theme';
const LIGHT_CLASS  = 'light-theme';
const SIDEBAR_KEY  = 'fk_sidebar_collapsed';

/**
 * Secciones que en móvil NO están en la barra inferior y viven dentro del
 * menú "Más". Cuando el usuario está en una de ellas, el botón "Más" se
 * resalta como activo (antes ninguna pestaña se resaltaba: cero "estás aquí").
 * Al sumar secciones nuevas al menú "Más", agregarlas aquí. Ahorro y sus 4
 * modalidades salieron del set en AH.7a (ADR 065): la casa subió a la barra
 * inferior y se resalta ella misma, con o sin hija adentro. Calendario entró
 * en el mismo movimiento, al bajar de la barra al menú. Deudas y Límites
 * salieron en la ficha 01 de la auditoría móvil (ADR 069): pasaron a ser
 * lentes del bloque Gastos, que se resalta él mismo.
 */
const MAS_SECTIONS = new Set([
  'tesoreria', 'movimientos', 'personales',
  'agenda', 'analisis', 'config',
]);

/**
 * Bloque Gastos (ADR 069): la portada (`gast`) y sus otras dos lentes. La
 * entrada de la barra inferior se resalta en las tres, igual que la de
 * Ahorro se resalta en sus 4 modalidades: en móvil es la única puerta al
 * bloque, así que sin esto navegar a "Por pagar" dejaba la barra sin
 * "estás aquí".
 */
const GRUPO_GASTOS = new Set(['gast', 'compromisos', 'presupuesto']);

/**
 * Grupo Ahorro: la casa (`ahorro`) y sus 4 hijas. Dos usos, uno por
 * plataforma:
 *
 * - Desktop (INT.1b, ADR 059 D6): `.nav-subnav` solo se despliega mientras el
 *   hash activo pertenece al set; el resto del tiempo el grupo paga 1 fila en
 *   vez de 5.
 * - Móvil (AH.7a, ADR 065 D3): la entrada de la barra inferior se resalta en
 *   toda la casa, hijas incluidas. En móvil es la única puerta al grupo, así
 *   que hereda el "estás aquí" de grupo que antes daba el botón "Más".
 */
const GRUPO_AHORRO = new Set(['ahorro', 'fondo', 'metas', 'apartados', 'inversion']);

// ── THEME ───────────────────────────────────────────────────────

// Timer para quitar .theme-transitioning. Se guarda para resetear si el
// usuario hace toggle varias veces seguidas.
let _transitionTimer = null;

/**
 * Aplica el tema (dark/light) y activa una transicion suave.
 *
 * CFG.7: si el navegador soporta View Transitions API y el usuario no pidio
 * reduced-motion, el crossfade lo hace el navegador en un solo paint
 * (document.startViewTransition). Es mejora progresiva: donde no hay soporte
 * (Firefox, navegadores viejos) cae a la tecnica "class transitioning"
 * existente (.theme-transitioning, 280ms en themes.css), sin regresion.
 *
 * @param {boolean} light - true = tema claro, false = tema oscuro.
 */
function applyTheme(light) {
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  const swap = () => {
    document.body.classList.toggle(LIGHT_CLASS, light);
    localStorage.setItem(THEME_KEY, light ? 'light' : 'dark');
    _syncThemeButton(light);
    EventBus.emit('theme:change', { light });
  };

  if (!reducedMotion && document.startViewTransition) {
    document.startViewTransition(swap);
    return;
  }

  // Fallback: tecnica previa (class transitioning con CSS).
  if (_transitionTimer) clearTimeout(_transitionTimer);
  document.body.classList.add('theme-transitioning');
  swap();
  _transitionTimer = setTimeout(() => {
    document.body.classList.remove('theme-transitioning');
    _transitionTimer = null;
  }, 350);
}

function _syncThemeButton(light) {
  // Puede haber más de un toggle a la vez: el checkbox de "Apariencia" en
  // Ajustes y el botón de icono del menú "Más" (NAV2.1a, ADR 040 D3).
  document.querySelectorAll('[data-action="theme-toggle"]').forEach((el) => {
    if (el.type === 'checkbox') {
      setTimeout(() => { el.checked = light; }, 0);
      return;
    }
    // Botón de icono: el glifo refleja el tema vigente (luna en oscuro,
    // sol en claro), misma convención que la sección Apariencia.
    const use = el.querySelector('.icon use');
    if (use) use.setAttribute('href', light ? '#i-sun' : '#i-moon');
    el.setAttribute('aria-pressed', String(light));
  });
}

export function toggleTheme() {
  applyTheme(!document.body.classList.contains(LIGHT_CLASS));
}

// ── ACTIVE NAV ──────────────────────────────────────────────────

export function markActiveNav(hash) {
  // .nav-item: sidebar + barra inferior. .mas-tile: tiles del menú "Más"
  // v2 (NAV2.1a, ADR 040 D2), que resaltan la sección activa con el
  // tinte de su dominio igual que el nav. .bloque-tabs__tab: las tres lentes
  // del bloque Gastos (ADR 069), que son navegación y ya traen data-section.
  // .bloque-chips__chip: la fila de modalidades del bloque Ahorro, misma idea.
  document.querySelectorAll(
    '.nav-item[data-section], .mas-tile[data-section],'
    + ' .bloque-tabs__tab[data-section], .bloque-chips__chip[data-section]'
  ).forEach(item => {
    const active = item.dataset.section === hash;
    item.classList.toggle('active', active);
    item.setAttribute('aria-current', active ? 'page' : 'false');
  });

  // El botón "Más" (barra inferior móvil) se resalta cuando el hash actual
  // pertenece a una sección que vive dentro del menú "Más", para que el
  // usuario nunca pierda el "estás aquí" al navegar en móvil.
  //
  // Ya no toma el nombre ni el ícono de esa sección (hallazgo H5 de la ficha
  // 01, ADR 069): el único rótulo estable del menú no puede cambiar de
  // palabra según dónde estés, o el control que abre el mapa deja de
  // reconocerse. Quién dice el lugar: el encabezado de sección (R33), que ya
  // es obligatorio y ya alimenta la barra superior.
  const masBtn = document.querySelector('.nav-item[data-modal="modal-mas"]');
  if (masBtn) {
    const enMas = MAS_SECTIONS.has(hash);
    masBtn.classList.toggle('active', enMas);
    masBtn.setAttribute('aria-current', enMas ? 'page' : 'false');
  }

  // La entrada de Gastos en la barra inferior (ADR 069) se resalta en las
  // tres lentes del bloque. Clase propia y no `active`: en escritorio esa
  // misma fila del sidebar convive con las filas de Deudas y de Límites, y
  // encender dos a la vez diría que el usuario está en dos sitios. La clase
  // solo se pinta bajo 1024px (responsive.css), donde esas filas no existen.
  const gastosBtn = document.querySelector('.nav-item[data-section="gast"]');
  if (gastosBtn) {
    gastosBtn.classList.toggle('nav-item--bloque-activo', GRUPO_GASTOS.has(hash) && hash !== 'gast');
  }

  // La entrada de Ahorro en la barra inferior (AH.7a) se resalta en la casa y
  // en sus 4 hijas: en móvil es la única puerta al grupo, y sin esto navegar
  // de la casa a Metas apagaba la pestaña y dejaba la barra sin "estás aquí".
  // La entrada de desktop no entra: allá cada hija tiene su propia fila.
  const ahorroBtn = document.querySelector('.nav-item--mobile-only[data-section="ahorro"]');
  if (ahorroBtn) {
    const enGrupo = GRUPO_AHORRO.has(hash);
    ahorroBtn.classList.toggle('active', enGrupo);
    ahorroBtn.setAttribute('aria-current', enGrupo ? 'page' : 'false');
  }

  // Sub-nivel del grupo Ahorro (INT.1b): se despliega solo dentro del grupo.
  // aria-controls, no data-section: la barra inferior también lleva una
  // entrada con data-section="ahorro" desde AH.7a, así que data-section no
  // identifica a la casa del sidebar.
  const subnav = document.getElementById('nav-subnav-ahorro');
  const triggerAhorro = document.querySelector('[aria-controls="nav-subnav-ahorro"]');
  if (subnav && triggerAhorro) {
    const abierto = GRUPO_AHORRO.has(hash);
    subnav.hidden = !abierto;
    triggerAhorro.setAttribute('aria-expanded', String(abierto));
  }

  _syncTopbar(hash);

  // Cinta de saldo de la barra (INT.1d): su visibilidad depende del hash
  // (no se pinta en Inicio) y no todos los dominios llaman updSaldo() en su
  // propio listener de hashchange. markActiveNav corre en las 13 secciones,
  // así que es el único punto que garantiza la sincronía sin agregar un
  // listener por dominio.
  updSaldo();
}

/**
 * Escribe la teja + título de la barra superior (INT.1c, ADR 059 D1).
 *
 * No duplica un mapa de nombres/íconos por sección: lee la teja y el h1 que
 * cada sección ya pinta en su `.section__header` (R33), que showSection()
 * ya marcó `.active` antes de que corra este handler (initRouter llama
 * onNavigate después de showSection). Único caso especial, Inicio: su
 * header es `.perfil-inicio`, sin `.cat-teja` propia (el hero ya nombra la
 * app), así que cae al rótulo neutro.
 *
 * @param {string} _hash
 */
function _syncTopbar(_hash) {
  const iconWrap = document.getElementById('topbar-icon');
  const iconUse  = document.getElementById('topbar-icon-use');
  const titleEl  = document.getElementById('topbar-title');
  if (!iconWrap || !iconUse || !titleEl) return;

  const activo = document.querySelector('.section.active');
  const teja   = activo?.querySelector('.section__header .cat-teja');
  const h1     = activo?.querySelector('.section__header .section__title');

  const dom   = teja?.dataset.dom;
  const icono = teja?.querySelector('use')?.getAttribute('href') ?? '#i-home';
  const titulo = h1?.textContent.trim() || 'Inicio';

  if (dom) iconWrap.dataset.dom = dom;
  else delete iconWrap.dataset.dom;
  iconUse.setAttribute('href', icono);
  titleEl.textContent = titulo;

  _syncPrimarioTopbar(activo);
}

/**
 * Espeja el primario del encabezado de la sección activa en la barra
 * (INT.1e, ADR 059 D3), en secundario. No duplica un mapa de acciones por
 * sección: lee el único `.btn-primary` que cada encabezado ya declara (R1,
 * un solo primario por pantalla) y copia texto + aria-label + data-action.
 * Sin ese botón (Análisis, Ahorro, Movimientos, Fondo, Inversión, Ajustes)
 * o con `hidden` propio del dominio (ej. Deudas sin deudas activas), el
 * botón de la barra se oculta.
 *
 * @param {Element|null} activo - `.section.active`.
 */
function _syncPrimarioTopbar(activo) {
  const btnTop = document.getElementById('topbar-primario');
  if (!btnTop) return;

  const origen = activo?.querySelector('.section__header > .btn-primary');
  if (!origen || origen.hidden) {
    btnTop.hidden = true;
    _syncJerarquiaPrimarios(false);
    return;
  }

  btnTop.textContent = origen.textContent.trim();
  const aria = origen.getAttribute('aria-label');
  if (aria) btnTop.setAttribute('aria-label', aria);
  else btnTop.removeAttribute('aria-label');
  btnTop.dataset.action = origen.dataset.action;
  if (origen.dataset.modal) btnTop.dataset.modal = origen.dataset.modal;
  else delete btnTop.dataset.modal;
  btnTop.hidden = false;
  _syncJerarquiaPrimarios(true);
}

/**
 * D2 del ADR 079 (DSK.10a): un solo botón lleno por pantalla, y es el de la
 * pantalla.
 *
 * Hasta acá el primario de la sección viajaba a la barra superior en
 * `.btn-secondary`, a la izquierda del `.btn-primary` de "Registrar": la
 * acción propia de la pantalla quedaba más callada que una que no le
 * pertenece (en Gastos las dos empezaban por la misma palabra).
 *
 * Es una regla, no un mapa por sección: la decide la misma condición que
 * `_syncPrimarioTopbar` ya evalúa. Cuando la sección no tiene primario propio
 * (Análisis, Ahorro, Movimientos, Fondo, Inversión, Ajustes), "Registrar"
 * recupera el lleno, porque entonces sí es la acción principal disponible.
 *
 * @param {boolean} seccionTienePrimario
 */
function _syncJerarquiaPrimarios(seccionTienePrimario) {
  const btnTop     = document.getElementById('topbar-primario');
  const registrar  = document.querySelector('.topbar__registrar');
  if (btnTop) {
    btnTop.classList.toggle('btn-primary',   seccionTienePrimario);
    btnTop.classList.toggle('btn-secondary', !seccionTienePrimario);
  }
  if (registrar) {
    registrar.classList.toggle('btn-primary',   !seccionTienePrimario);
    registrar.classList.toggle('btn-secondary', seccionTienePrimario);
  }
}

// ── SIDEBAR COLLAPSE ────────────────────────────────────────────

/**
 * Sincroniza el boton colapsar: aria-expanded, aria-label y label de texto.
 * @param {boolean} collapsed
 */
function _syncCollapseButton(collapsed) {
  const btn = document.querySelector('[data-action="sidebar-toggle"]');
  if (!btn) return;
  btn.setAttribute('aria-expanded', String(!collapsed));
  btn.setAttribute('aria-label', collapsed ? 'Expandir navegación' : 'Colapsar navegación');
  const label = btn.querySelector('.nav-item__label');
  if (label) label.textContent = collapsed ? 'Expandir' : 'Colapsar';
}

/**
 * Agrega/quita title en los nav items del sidebar para mostrar un tooltip
 * nativo del navegador cuando los labels estan ocultos (modo colapsado).
 * @param {boolean} collapsed
 */
function _syncNavTitles(collapsed) {
  document.querySelectorAll('#sidebar .nav-item').forEach(item => {
    const label = item.querySelector('.nav-item__label');
    if (!label) return;
    if (collapsed) {
      item.title = label.textContent.trim();
    } else {
      item.removeAttribute('title');
    }
  });
}

let _sidebarTimer = null;

/**
 * Alterna el estado colapsado del sidebar y persiste en localStorage.
 * Activa la transicion CSS solo durante el toggle (clase sidebar-animating),
 * no en la carga inicial ni al redimensionar la ventana.
 */
export function toggleSidebarCollapse() {
  // Activar transicion antes del toggle de clase
  if (_sidebarTimer) clearTimeout(_sidebarTimer);
  document.body.classList.add('sidebar-animating');

  const collapsed = document.body.classList.toggle('sidebar-collapsed');
  localStorage.setItem(SIDEBAR_KEY, String(collapsed));
  _syncCollapseButton(collapsed);
  _syncNavTitles(collapsed);

  // Limpiar la clase de transicion cuando el layout ya termino de animar
  _sidebarTimer = setTimeout(() => {
    document.body.classList.remove('sidebar-animating');
    _sidebarTimer = null;
  }, 300);
}

/**
 * Restaura el estado del sidebar desde localStorage al iniciar la app.
 * Se llama sincronamente antes del primer render para evitar parpadeo.
 */
export function initSidebarCollapse() {
  const collapsed = localStorage.getItem(SIDEBAR_KEY) === 'true';
  if (collapsed) {
    document.body.classList.add('sidebar-collapsed');
    _syncCollapseButton(true);
    _syncNavTitles(true);
  }
}

// ── INIT ────────────────────────────────────────────────────────

export function initShell() {
  const saved = localStorage.getItem(THEME_KEY);
  applyTheme(saved === 'light');

  // El primario de la barra (INT.1e) puede quedar desactualizado sin
  // navegar: Deudas oculta "+ Nueva deuda" al saldar la última, Límites
  // oculta "+ Límite" sin plan del mes. Un solo listener genérico evita un
  // mapa sección → evento (los nombres de section de state:change no son
  // 1:1 con el hash, ej. presupuesto emite 'presupuestos'), y el costo de
  // releer un `.btn-primary` en cada cambio es despreciable.
  EventBus.on('state:change', () => {
    _syncPrimarioTopbar(document.querySelector('.section.active'));
  });
}

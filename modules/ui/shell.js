/**
 * shell.js - navigation state, theme toggle y sidebar colapsable.
 */

import { EventBus } from '../core/state.js';

const THEME_KEY    = 'fk_theme';
const LIGHT_CLASS  = 'light-theme';
const SIDEBAR_KEY  = 'fk_sidebar_collapsed';

/**
 * Secciones que en móvil NO están en la barra inferior y viven dentro del
 * menú "Más". Cuando el usuario está en una de ellas, el botón "Más" se
 * resalta como activo (antes ninguna pestaña se resaltaba: cero "estás aquí").
 * Al sumar secciones nuevas al menú "Más", agregarlas aquí. Las 4 modalidades
 * de ahorro cuentan aunque el menú ya no las liste una por una (DIS.18): se
 * llega a ellas desde la casa, que sí es una teja de "Más".
 */
const MAS_SECTIONS = new Set([
  'compromisos', 'tesoreria', 'movimientos', 'personales',
  'ahorro', 'fondo', 'metas', 'apartados', 'inversion',
  'presupuesto', 'analisis', 'config',
]);

/**
 * Grupo Ahorro en el sidebar de desktop (INT.1b, ADR 059 D6): la casa
 * (`ahorro`) y sus 4 hijas. `.nav-subnav` solo se despliega mientras el
 * hash activo pertenece a este set; el resto del tiempo el grupo paga 1
 * fila en vez de 5.
 */
const GRUPO_AHORRO = new Set(['ahorro', 'fondo', 'metas', 'apartados', 'inversion']);

/**
 * Nombre corto e ícono del sprite de cada sección de MAS_SECTIONS
 * (DIS.6/C3, hallazgo H4, regla R30).
 *
 * Resaltar el botón "Más" no alcanzaba: al no tener data-section, el mapeo
 * de dominio de IV.2a no tenía de dónde tomar color y el botón caía al
 * acento genérico, el mismo de Inicio. Estar en Inicio y estar en
 * cualquiera de las 11 secciones del menú se veían idénticos.
 * Con este mapa el botón dice el nombre de la sección, muestra su ícono y
 * hereda su color sin un mapeo nuevo: markActiveNav le escribe el
 * data-section vigente y `[data-section="X"]` (layout.css) hace el resto.
 */
const SECCION_NAV = {
  compromisos: ['Deudas',      'i-deudas'],
  tesoreria:   ['Cuentas',     'i-cuentas'],
  movimientos: ['Movimientos', 'i-saldo'],
  personales:  ['Me deben',    'i-personales'],
  presupuesto: ['Límites',     'i-presupuesto'],
  analisis:    ['Análisis',    'i-analisis'],
  ahorro:      ['Ahorro',      'i-ahorro'],
  fondo:       ['Fondo',       'i-ahorro'],
  metas:       ['Metas',       'i-metas'],
  apartados:   ['Reservas',    'i-apartados'],
  inversion:   ['Inversión',   'i-inversion'],
  config:      ['Ajustes',     'i-ajustes'],
};

// Estado neutro del botón: lo que dice cuando estás en una sección de la barra.
const MAS_LABEL = 'Más';
const MAS_ICON  = 'i-mas';
const MAS_ARIA  = 'Mas opciones';

// ── THEME ───────────────────────────────────────────────────────

// Timer para quitar .theme-transitioning. Se guarda para resetear si el
// usuario hace toggle varias veces seguidas.
let _transitionTimer = null;

/**
 * Aplica el tema (dark/light) y activa una transicion CSS suave.
 *
 * Tecnica "class transitioning": se agrega .theme-transitioning al body
 * ANTES del cambio de clase para que los descendientes interpolen
 * background-color, border-color y color en lugar de cambiar de golpe.
 * La clase se quita despues de 350ms (ligeramente mayor que los 280ms
 * de la transicion CSS para dar margen a slow-mo mobile).
 *
 * @param {boolean} light - true = tema claro, false = tema oscuro.
 */
function applyTheme(light) {
  // Activar transicion antes del swap de clase de tema.
  if (_transitionTimer) clearTimeout(_transitionTimer);
  document.body.classList.add('theme-transitioning');

  document.body.classList.toggle(LIGHT_CLASS, light);
  localStorage.setItem(THEME_KEY, light ? 'light' : 'dark');
  _syncThemeButton(light);
  EventBus.emit('theme:change', { light });

  // Limpiar la clase cuando la transicion ya termino.
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
  // tinte de su dominio igual que el nav.
  document.querySelectorAll('.nav-item[data-section], .mas-tile[data-section]').forEach(item => {
    const active = item.dataset.section === hash;
    item.classList.toggle('active', active);
    item.setAttribute('aria-current', active ? 'page' : 'false');
  });

  // El botón "Más" (barra inferior móvil) se resalta cuando el hash actual
  // pertenece a una sección que vive dentro del menú "Más", para que el
  // usuario nunca pierda el "estás aquí" al navegar en móvil. Y además dice
  // en cuál está (DIS.6/C3): sigue abriendo la hoja, gana una segunda función.
  const masBtn = document.querySelector('.nav-item[data-modal="modal-mas"]');
  if (masBtn) {
    const enMas = MAS_SECTIONS.has(hash);
    masBtn.classList.toggle('active', enMas);
    masBtn.setAttribute('aria-current', enMas ? 'page' : 'false');
    _rotularMas(masBtn, enMas ? hash : null);
  }

  // Sub-nivel del grupo Ahorro (INT.1b): se despliega solo dentro del grupo.
  // aria-controls, no data-section: el botón "Más" también gana
  // data-section="ahorro" cuando el hash es 'ahorro' (_rotularMas, arriba),
  // y data-section no es único en ese caso.
  const subnav = document.getElementById('nav-subnav-ahorro');
  const triggerAhorro = document.querySelector('[aria-controls="nav-subnav-ahorro"]');
  if (subnav && triggerAhorro) {
    const abierto = GRUPO_AHORRO.has(hash);
    subnav.hidden = !abierto;
    triggerAhorro.setAttribute('aria-expanded', String(abierto));
  }
}

/**
 * Escribe en el botón "Más" el nombre, el ícono y el data-section de la
 * sección donde está el usuario, o lo devuelve a su estado neutro.
 *
 * El data-section es lo que le da el color de dominio (mapeo de IV.2a en
 * layout.css), así que se limpia al salir: si quedara escrito, el botón
 * seguiría teñido con una sección que ya no es la vigente.
 *
 * @param {HTMLElement} btn  - el botón "Más" de la barra inferior.
 * @param {string|null} hash - sección del menú "Más", o null para el estado neutro.
 */
function _rotularMas(btn, hash) {
  const [nombre, icono] = SECCION_NAV[hash] ?? [];
  const ubicado = Boolean(nombre);

  btn.classList.toggle('nav-item--mas-ubicado', ubicado);
  if (ubicado) {
    btn.dataset.section = hash;
  } else {
    delete btn.dataset.section;
  }
  // El botón nombra y abre: el nombre accesible dice las dos cosas.
  btn.setAttribute('aria-label', ubicado ? `${nombre}. Abrir más opciones` : MAS_ARIA);

  const label = btn.querySelector('.nav-item__label');
  if (label) label.textContent = ubicado ? nombre : MAS_LABEL;

  const use = btn.querySelector('.nav-item__icon use');
  if (use) use.setAttribute('href', `#${ubicado ? icono : MAS_ICON}`);
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
}

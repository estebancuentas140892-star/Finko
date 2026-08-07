/**
 * actions.js - delegador central de data-action.
 *
 * Contrato:
 * - Es el ÚNICO lugar que registra addEventListener en document.
 * - Los dominios llaman registrarAccion() en su propio bootstrap para añadir handlers.
 * - Las acciones built-in del shell (theme-toggle, modal-*) se registran en initAcciones().
 */

import { toggleTheme, toggleSidebarCollapse } from './shell.js';
import { abrirModal, cerrarModal } from './modales.js';
import { navigate } from '../infra/router.js';
import { S, EventBus } from '../core/state.js';
import { save } from '../core/storage.js';
import { updSaldo, alternarDetalleCuentas } from '../infra/render.js';

/** Mapa de acciones registradas: nombre → función handler. */
const _acciones = new Map();

/**
 * Registra una acción. Los dominios la llaman durante su inicialización.
 * Si el nombre ya existe, sobreescribe silenciosamente.
 *
 * @param {string} nombre - valor de `data-action` en el HTML.
 * @param {(el: HTMLElement, e: Event) => void} fn
 */
export function registrarAccion(nombre, fn) {
  _acciones.set(nombre, fn);
}

/**
 * Despacha un click al handler registrado.
 * Separada de _handleClick para facilitar tests.
 *
 * @param {HTMLElement} el - elemento con data-action.
 * @param {Event} e
 */
export function dispatch(el, e) {
  const fn = _acciones.get(el.dataset.action);
  if (fn) {
    e.preventDefault();
    fn(el, e);
  }
}

/** @param {MouseEvent} e */
function _handleClick(e) {
  const el = e.target.closest('[data-action]');
  if (el) dispatch(el, e);
}

// INT.1h: cuatro atajos de escritorio. N registra, G + inicial salta de
// sección, ? abre la ayuda, Esc cierra (ya existía). Letra → sección, elegida
// para no chocar entre sí (no es la inicial visible en todos los casos).
const _MAPA_SECCION_ATAJO = {
  i: 'dash',        // Inicio
  g: 'gast',        // Gastos
  c: 'agenda',      // Calendario
  f: 'compromisos', // Gastos fijos
  t: 'tesoreria',   // Mis cuentas (tesorería)
  m: 'movimientos', // Movimientos
  d: 'personales',  // Me deben
  l: 'presupuesto', // Límites
  a: 'analisis',    // Análisis
  h: 'ahorro',      // Ahorro
  j: 'config',      // Ajustes
};

/** Ventana para completar "G + letra" antes de que el prefijo caduque. */
const _G_TIMEOUT_MS = 900;
let _gArmado = false;
let _gTimer = null;

function _desarmarG() {
  _gArmado = false;
  clearTimeout(_gTimer);
  _gTimer = null;
}

/**
 * Riesgo P8 (ADR 059): un atajo de una sola tecla choca con el modo de
 * navegación por letras de un lector de pantalla y con la escritura normal.
 * Mitigación: campo de texto/contenteditable siempre gana, un modal abierto
 * siempre gana (foco atrapado), y el interruptor de Ajustes (WCAG 2.1.4)
 * apaga los tres atajos de letra sin tocar Escape.
 */
function _atajoBloqueado(e) {
  if (e.ctrlKey || e.altKey || e.metaKey) return true;
  const el = e.target;
  if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return true;
  if (document.querySelector('.modal-overlay[data-open]')) return true;
  return false;
}

/** @param {KeyboardEvent} e */
function _handleKeydown(e) {
  if (e.key === 'Escape') {
    const open = document.querySelector('.modal-overlay[data-open]');
    // data-bloqueante (LEG.2): gate de aceptación legal, sin salida hasta aceptar.
    if (open && !('bloqueante' in open.dataset)) cerrarModal(open);
    return;
  }

  if (S.config?.atajosTeclado === false) return;
  if (_atajoBloqueado(e)) { _desarmarG(); return; }

  if (_gArmado) {
    _desarmarG();
    const destino = _MAPA_SECCION_ATAJO[e.key.toLowerCase()];
    if (destino) navigate(destino);
    return;
  }

  if (e.key.toLowerCase() === 'g') {
    _gArmado = true;
    _gTimer = setTimeout(_desarmarG, _G_TIMEOUT_MS);
    return;
  }

  if (e.key.toLowerCase() === 'n') {
    _acciones.get('registrar-abrir-hoja')?.();
    return;
  }

  if (e.key === '?') {
    const overlay = document.getElementById('modal-atajos');
    if (overlay) abrirModal(overlay);
  }
}

/**
 * Registra las acciones built-in y activa la escucha en document.
 * Llamada una sola vez desde bootstrap.js.
 */
export function initAcciones() {
  registrarAccion('theme-toggle', () => toggleTheme());
  registrarAccion('sidebar-toggle', () => toggleSidebarCollapse());

  registrarAccion('modal-open', (el) => {
    const overlay = document.getElementById(el.dataset.modal);
    if (overlay) abrirModal(overlay);
  });

  registrarAccion('modal-close', (el) => {
    const overlay = el.closest('.modal-overlay');
    if (overlay) cerrarModal(overlay);
  });

  // Cierra el modal abierto (si lo hay) y navega a una sección. Necesaria
  // porque dispatch() hace e.preventDefault() para toda data-action, lo que
  // cancela la navegación nativa de un <a href="#seccion">: sin esta acción,
  // un enlace dentro de un modal solo cerraría el modal sin cambiar de sección.
  // El destino sale de data-target o, en su defecto, del hash del href.
  // Reutilizable por todos los CTA "ir a Mis cuentas / a otra sección".
  registrarAccion('ir-a-seccion', (el) => {
    const overlay = el.closest('.modal-overlay');
    if (overlay) cerrarModal(overlay);
    const destino = el.dataset.target
      || (el.getAttribute('href') || '').replace(/^#/, '');
    if (destino) navigate(destino);
  });

  // Falta una cuenta para completar una acción (registrar un ingreso o gasto,
  // abonar a una deuda...). En vez de solo informar el requisito, cierra el
  // modal actual, navega a Mis cuentas y abre de una vez el formulario de nueva
  // cuenta: el usuario resuelve el bloqueo sin salir a buscar dónde. Emite por
  // EventBus 'cuenta:crear' (tesoreria escucha y abre su modal), así el shell no
  // importa el dominio (ADN 10). CTA único reutilizable por todo "necesitas una
  // cuenta".
  registrarAccion('ir-a-crear-cuenta', (el) => {
    const overlay = el.closest('.modal-overlay');
    if (overlay) cerrarModal(overlay);
    navigate('tesoreria');
    EventBus.emit('cuenta:crear');
  });

  // Hoja "Registrar" (NAV.A2, ADR 024): cada teja cierra la hoja y dispara su
  // acción destino (nuevo-gasto, nuevo-ingreso-puntual...). Cerrar primero
  // libera el foco y el `inert` del fondo antes de que la acción destino abra
  // su propio modal, evitando dos modales anidados. Desacoplado: no importa
  // dominios, solo invoca por nombre la acción ya registrada.
  registrarAccion('registrar-abrir', (el, e) => {
    const overlay = el.closest('.modal-overlay');
    if (overlay) cerrarModal(overlay);
    const destino = el.dataset.targetAction;
    const fn = destino && _acciones.get(destino);
    if (fn) fn(el, e);
  });

  // Ojo del hero (IN.2): alterna entre monto visible y enmascarado, estilo
  // app bancaria, para usar Finko en lugares públicos. El flip con `!== true`
  // es defensivo: cualquier valor raro heredado en S.config cae en "ocultar".
  registrarAccion('saldo-visibilidad', () => {
    S.config.ocultarSaldo = S.config.ocultarSaldo !== true;
    save();
    updSaldo();
  });

  // Detalle por cuenta del hero (IN.8c, ADR 034 D4): expande/colapsa in situ.
  // Estado solo de UI en memoria: sin save(), sin tocar S.config.
  registrarAccion('saldo-detalle', () => {
    alternarDetalleCuentas();
  });

  document.addEventListener('click', _handleClick);
  document.addEventListener('keydown', _handleKeydown);
}

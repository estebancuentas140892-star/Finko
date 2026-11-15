/**
 * modales.js - factory de modales con contrato uniforme.
 *
 * Contrato:
 * - abrirModal: activa overlay, quita aria-hidden, marca el fondo inerte, atrapa foco.
 * - cerrarModal: desactiva overlay, restaura aria-hidden, libera el fondo y el foco.
 * - resetModal: limpia campos del formulario interno.
 */

import { trapFocus, releaseFocus, despertarOverlay } from '../infra/a11y.js';

/**
 * Fondo de la app (todo menos los modales, que viven como hermanos de este nodo).
 * Se marca `inert` mientras hay un modal abierto para que el lector de pantalla
 * no pueda navegar el contenido de atrás (WCAG 2.4.3, refuerza `aria-modal`).
 * En el perfil niño (APR.3a) el fondo es su propia app, `#nino-app`.
 * @returns {HTMLElement | null}
 */
const _fondo = () => (document.body.classList.contains('kid')
  ? document.getElementById('nino-app')
  : document.querySelector('.app-shell'));

/**
 * Abre un modal overlay.
 *
 * @param {HTMLElement} overlay - elemento `.modal-overlay` a abrir.
 */
/** Lo que corre en cada apertura, antes de atrapar el foco (FORM.2c). */
const _alAbrir = [];

/**
 * Registra algo que prepara una hoja cada vez que se abre, ya con lo que el
 * dominio llenó (ADR 142: los formularios del teléfono, `captura-telefono.js`).
 * @param {(overlay: HTMLElement) => void} fn
 */
export function registrarAlAbrir(fn) {
  _alAbrir.push(fn);
}

export function abrirModal(overlay) {
  // Primero (PERF.16): lo que prepara la hoja puede medirla, y un overlay sin
  // despertar no tiene layout por dentro.
  despertarOverlay(overlay);
  for (const fn of _alAbrir) fn(overlay);
  overlay.dataset.open = '';
  // Una hoja recién abierta no tiene cambios sin guardar (ADR 142 D8, hojas.js).
  delete overlay.dataset.cambios;
  overlay.removeAttribute('aria-hidden');
  // Atrapar foco en el panel interno del modal (no en el overlay/backdrop).
  const panel = overlay.querySelector('.modal') ?? overlay;
  trapFocus(panel);
  // Inertizar el fondo después de trapFocus: trapFocus ya guardó el botón que
  // abrió el modal para restaurarlo al cerrar, así que marcar el fondo inerte
  // ahora no le roba ese elemento (el foco ya está dentro del modal).
  //
  // Un cuadro después, no en el mismo: `inert` obliga a recalcular el estilo de
  // todo el fondo visible, y con la lista de Gastos a la vista son ~3.400
  // elementos, ~90 ms en un teléfono de gama media (PERF.11, medido con
  // scripts/perf/fluidez.js). Hecho acá retrasaba el primer cuadro de la hoja;
  // después del cuadro corre mientras la hoja entra animada en el compositor.
  // Mientras tanto el foco ya está atrapado y `aria-modal` ya avisa.
  requestAnimationFrame(() => setTimeout(() => {
    // Si se cerró antes de llegar acá, el fondo ya no debe quedar inerte.
    if ('open' in overlay.dataset) _fondo()?.setAttribute('inert', '');
  }, 0));
}

/** Las hojas que más se abren: se despiertan solas tras el arranque (PERF.16). */
const _VIVOS_EN_IDLE = ['modal-registrar', 'modal-mas', 'modal-gasto'];

/**
 * Despierta en idle las hojas más usadas, de a una y con un cuadro entre cada
 * una (PERF.16). El arranque ya no maqueta los overlays; sin esto, la primera
 * apertura de Registrar pagaba su estilo y su layout en el toque (INP de 64 a
 * 96 ms a 4x). Las demás se despiertan al abrirse por primera vez: hacerlo con
 * todas metía una tarea de 120 ms (la hoja de reservas, con su selector de
 * íconos) dentro del arranque.
 *
 * @param {(fn: () => void) => void} idle - `requestIdleCallback` o su reemplazo.
 */
export function despertarOverlaysEnIdle(idle) {
  const cola = _VIVOS_EN_IDLE.map((id) => document.getElementById(id)).filter(Boolean);
  const cuadro = typeof requestAnimationFrame === 'function' ? requestAnimationFrame : (fn) => setTimeout(fn, 16);
  const paso = () => {
    const overlay = cola.shift();
    if (!overlay) return;
    despertarOverlay(overlay);
    cuadro(() => idle(paso));
  };
  idle(paso);
}

/**
 * Cierra un modal overlay y devuelve el foco al elemento que lo abrió.
 *
 * @param {HTMLElement} overlay
 */
export function cerrarModal(overlay) {
  delete overlay.dataset.open;
  delete overlay.dataset.cambios;
  overlay.setAttribute('aria-hidden', 'true');
  // Liberar el fondo ANTES de restaurar el foco: el botón que abrió el modal
  // vive dentro del fondo y no puede recibir foco mientras siga inerte. Si
  // queda otra hoja abierta debajo (Escape cierra solo la de arriba, ADR
  // 118), el fondo sigue inerte.
  if (!document.querySelector('.modal-overlay[data-open]')) _fondo()?.removeAttribute('inert');
  releaseFocus();
}

/**
 * Resetea todos los campos de formulario dentro de un modal.
 * Llamar antes de abrir un modal en modo "nuevo" para evitar datos residuales.
 *
 * @param {HTMLElement} modal - puede ser el overlay o el panel `.modal`.
 */
export function resetModal(modal) {
  modal.querySelectorAll('input, select, textarea').forEach(el => {
    if (el.type === 'checkbox' || el.type === 'radio') {
      el.checked = false;
    } else {
      el.value = '';
    }
  });
}

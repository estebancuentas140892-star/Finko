/**
 * hojas.js - toda hoja se cierra de tres formas (ADR 118, MV2.3 tanda 3).
 *
 * Regla RN8 del canvas móvil: una hoja se cierra deslizándola hacia abajo,
 * con la ✕ y con el atrás del sistema en Android, y el foco vuelve al control
 * que la abrió. La ✕ y la vuelta del foco ya existían (`modales.js`,
 * `infra/a11y.js`); este módulo agrega las otras dos.
 *
 * Las dos hacen exactamente lo que hace Escape: despachan un Escape dentro de
 * la hoja y cada diálogo lo atiende como siempre (el cierre genérico de
 * `actions.js`, o el suyo: confirmar, la contraseña del respaldo, el selector
 * de cuenta). Ninguna hoja aprende un cierre nuevo, y una que no se deja
 * cerrar con Escape (las bloqueantes) tampoco se cierra con estas.
 *
 * - **Atrás del sistema**: un `CloseWatcher` por diálogo abierto. El navegador
 *   le entrega el atrás sin tocar el historial, así que `volver.js` y el
 *   router siguen igual. Sin la API (iOS no tiene atrás del sistema) no hace
 *   nada y el atrás sigue siendo el de la página.
 * - **Deslizar**: un arrastre hacia abajo que empieza en una hoja pegada al
 *   borde inferior con su contenido arriba del todo. Si no llega al umbral,
 *   la hoja vuelve a su sitio.
 *
 * Solo bajo 1024px, como el resto de las hojas del teléfono.
 */

import { observarTrap } from '../infra/a11y.js';

const MQ_MOVIL = '(max-width: 1023.98px)';

/** Lo que hay que arrastrar para que la hoja se cierre (o un cuarto de su alto, si es menos). */
export const UMBRAL_CIERRE_PX = 120;

/** Un arrastre corto pero rápido también cierra (px/ms). */
export const VELOCIDAD_CIERRE = 0.6;

/** Lo que hay que mover el dedo antes de que cuente como arrastre. */
const UMBRAL_INICIO_PX = 8;

// ── PURAS ────────────────────────────────────────────────────────

/**
 * ¿El arrastre cierra la hoja? Pura.
 *
 * @param {number} dy Lo bajado, en px.
 * @param {number} ms Lo que duró el gesto.
 * @param {number} altoHoja Alto de la hoja, en px.
 * @returns {boolean}
 */
export function arrastreCierra(dy, ms, altoHoja) {
  if (!(dy > 0)) return false;
  const umbral = Math.min(UMBRAL_CIERRE_PX, (altoHoja || Infinity) / 4);
  if (dy >= umbral) return true;
  return dy >= 40 && ms > 0 && dy / ms >= VELOCIDAD_CIERRE;
}

// ── DOM ──────────────────────────────────────────────────────────

const _esMovil = () => window.matchMedia?.(MQ_MOVIL).matches === true;

/** Una hoja que no se cierra con Escape no se cierra con estas (LEG.2). */
const _bloqueante = (el) => el?.closest?.('[data-bloqueante]') != null;

/**
 * Cierra la hoja como lo haría Escape: el evento nace en el foco, si está
 * dentro de la hoja, y sube hasta `document` pasando por los manejadores
 * propios del diálogo.
 *
 * @param {HTMLElement} panel
 */
export function cerrarComoEscape(panel) {
  const activo = document.activeElement;
  const origen = activo && panel.contains(activo) ? activo : panel;
  origen.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
}

// ── Atrás del sistema ──────────────────────────────────────────

/** Un vigía por hoja abierta: { panel, watcher }. */
const _vigias = [];

const _abierta = (panel) =>
  panel.isConnected && panel.closest('.modal-overlay')?.hasAttribute('data-open') === true;

/**
 * Suelta los vigías de las hojas que ya se cerraron. El trap no es una pila
 * (una hoja sobre otra lo pisa) y los diálogos propios sueltan el foco antes
 * de quitarse del documento, así que no alcanza con contar aperturas y
 * cierres: se mira si la hoja sigue abierta.
 */
function _podar() {
  for (let i = _vigias.length - 1; i >= 0; i--) {
    if (!_abierta(_vigias[i].panel)) _vigias.splice(i, 1)[0].watcher.destroy();
  }
}

function _alCambiarTrap(panel) {
  _podar();
  queueMicrotask(_podar);
  const Vigia = window.CloseWatcher;
  if (!panel || typeof Vigia !== 'function' || !_esMovil() || _bloqueante(panel)) return;
  if (_vigias.some(v => v.panel === panel)) return;
  const watcher = new Vigia();
  watcher.onclose = () => { if (_abierta(panel)) cerrarComoEscape(panel); };
  _vigias.push({ panel, watcher });
}

// ── Deslizar hacia abajo ───────────────────────────────────────

/** ¿La hoja está pegada al borde de abajo? Las centradas no se arrastran. */
function _pegadaAbajo(overlay) {
  return getComputedStyle(overlay).alignItems === 'flex-end';
}

/** ¿Algo entre el dedo y la hoja está desplazado hacia abajo? Ahí el gesto es leer. */
function _contenidoDesplazado(desde, panel) {
  for (let el = desde; el && el !== panel.parentElement; el = el.parentElement) {
    if (el.scrollTop > 0) return true;
  }
  return false;
}

function _alTocar(e) {
  if (e.touches.length !== 1 || !_esMovil()) return;
  const panel = e.target.closest?.('.modal-overlay[data-open] > .modal');
  if (!panel) return;
  const overlay = panel.parentElement;
  if (_bloqueante(overlay) || overlay.classList.contains('leccion-overlay')) return;
  if (e.target.closest('input, textarea, select, [contenteditable="true"], [data-sin-arrastre]')) return;
  if (!_pegadaAbajo(overlay) || _contenidoDesplazado(e.target, panel)) return;

  const x0 = e.touches[0].clientX;
  const y0 = e.touches[0].clientY;
  const t0 = performance.now();
  let dy = 0;
  let arrastrando = false;

  const mover = (ev) => {
    const t = ev.touches[0];
    dy = t.clientY - y0;
    if (!arrastrando) {
      // De lado o hacia arriba no es cerrar: se suelta el gesto.
      if (Math.abs(t.clientX - x0) > Math.abs(dy) || dy < -UMBRAL_INICIO_PX) return soltar();
      if (dy < UMBRAL_INICIO_PX) return;
      arrastrando = true;
      panel.dataset.arrastre = '';
    }
    ev.preventDefault();
    panel.style.setProperty('--fk-hoja-arrastre', `${Math.max(0, dy)}px`);
  };

  const terminar = () => {
    const cierra = arrastrando && arrastreCierra(dy, performance.now() - t0, panel.offsetHeight);
    soltar();
    if (cierra) cerrarComoEscape(panel);
  };

  function soltar() {
    panel.removeEventListener('touchmove', mover);
    panel.removeEventListener('touchend', terminar);
    panel.removeEventListener('touchcancel', soltar);
    delete panel.dataset.arrastre;
    panel.style.removeProperty('--fk-hoja-arrastre');
  }

  panel.addEventListener('touchmove', mover, { passive: false });
  panel.addEventListener('touchend', terminar);
  panel.addEventListener('touchcancel', soltar);
}

// ── INIT ─────────────────────────────────────────────────────────

/** Se llama una vez desde bootstrap.js. */
export function initHojas() {
  observarTrap(_alCambiarTrap);
  document.addEventListener('touchstart', _alTocar, { passive: true });
}

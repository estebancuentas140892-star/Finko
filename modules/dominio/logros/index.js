/**
 * logros/index.js - inicialización, detección y presentación de logros.
 *
 * Responsabilidades:
 * - Al arrancar: evaluar logros y mostrar los que se cumplan por primera vez.
 * - Al state:change: re-evaluar y mostrar los nuevos.
 * - Mostrar un toast animado con confetti por cada logro nuevo.
 *
 * CSS requerido (ya definido en styles/components.css + styles/base.css):
 *   .logro-toast, .logro-toast__emoji, .logro-toast__body,
 *   .logro-toast__label, .logro-toast__nombre, .confetti-piece,
 *   @keyframes toastIn, @keyframes toastOut, @keyframes confettiFall
 */

import { S, EventBus } from '../../core/state.js';
import { save }        from '../../core/storage.js';
import { evaluarLogros, LOGROS } from './logic.js';

// ── PUNTO DE ENTRADA ─────────────────────────────────────────────

/**
 * Inicializa el sistema de logros.
 * Llama evaluar al arrancar y se suscribe a state:change para futuras evaluaciones.
 */
export function initLogros() {
  _checkYMostrar();
  EventBus.on('state:change', _checkYMostrar);
}

// ── LOGICA INTERNA ───────────────────────────────────────────────

/**
 * Compara los logros cumplidos ahora contra los ya persistidos en S.logros.
 * Si hay logros nuevos, los persiste y muestra un toast por cada uno.
 */
function _checkYMostrar() {
  const cumplidos  = evaluarLogros(S);
  const yaLogrados = Array.isArray(S.logros) ? S.logros : [];
  const nuevos     = cumplidos.filter(id => !yaLogrados.includes(id));

  if (nuevos.length === 0) return;

  // Persistir antes de mostrar para que un reload no vuelva a mostrarlos.
  S.logros = [...yaLogrados, ...nuevos];
  save();

  // Mostrar de a uno con un pequeño delay para que no se solapen.
  nuevos.forEach((id, i) => {
    const logro = LOGROS.find(l => l.id === id);
    if (!logro) return;
    setTimeout(() => _mostrarToast(logro), i * 1400);
  });
}

// ── TOAST ────────────────────────────────────────────────────────

const DURACION_MS = 4000;

/**
 * Crea y muestra el toast de logro desbloqueado con confetti.
 * Se auto-elimina tras DURACION_MS ms.
 *
 * @param {{ emoji: string, nombre: string }} logro
 */
function _mostrarToast(logro) {
  const toast = document.createElement('div');
  toast.className = 'logro-toast';
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  toast.innerHTML = `
    <span class="logro-toast__emoji" aria-hidden="true">${logro.emoji}</span>
    <div class="logro-toast__body">
      <p class="logro-toast__label">Logro desbloqueado</p>
      <p class="logro-toast__nombre">${_esc(logro.nombre)}</p>
    </div>`;

  document.body.appendChild(toast);
  _lanzarConfetti();

  // Fade out y limpieza.
  const timeoutFade = setTimeout(() => {
    toast.classList.add('fade');
    const onEnd = () => { toast.remove(); };
    toast.addEventListener('animationend', onEnd, { once: true });
    // Fallback por si animationend no dispara (prefers-reduced-motion).
    setTimeout(onEnd, 400);
  }, DURACION_MS);

  // Limpiar timer si el elemento se borra externamente.
  toast.addEventListener('animationend', () => clearTimeout(timeoutFade), { once: true });
}

// ── CONFETTI ─────────────────────────────────────────────────────

const _CONFETTI_COLORS = [
  '#00dc82', '#34d399', '#fbbf24',
  '#f472b6', '#60a5fa', '#a78bfa',
];

/**
 * Lanza 24 piezas de confetti desde la zona inferior-central de la pantalla.
 * Cada pieza es un span.confetti-piece con posicion fixed y color aleatorio.
 */
function _lanzarConfetti() {
  for (let i = 0; i < 24; i++) {
    const p = document.createElement('span');
    p.className = 'confetti-piece';

    const color = _CONFETTI_COLORS[i % _CONFETTI_COLORS.length];
    // Dispersar horizontalmente alrededor del centro.
    const left  = 30 + Math.random() * 40; // 30%-70% del ancho
    const delay = (Math.random() * 0.4).toFixed(2);
    const rot   = Math.floor(Math.random() * 360);

    Object.assign(p.style, {
      position:         'fixed',
      bottom:           '90px',
      left:             `${left}%`,
      background:       color,
      transform:        `rotate(${rot}deg)`,
      animationDelay:   `${delay}s`,
      pointerEvents:    'none',
      zIndex:           'var(--fk-z-toast)',
    });

    document.body.appendChild(p);
    // Limpiar cuando termine la animación (1.1s + delay máximo 0.4s = 1.5s).
    setTimeout(() => p.remove(), 1600);
  }
}

// ── HELPER ───────────────────────────────────────────────────────

function _esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

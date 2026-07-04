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
import { esc as _esc } from '../../infra/utils.js';
import { renderSmart, registrarRender } from '../../infra/render.js';
import { evaluarLogros, LOGROS } from './logic.js';
import { renderPanelLogros } from './view.js';

// ── PUNTO DE ENTRADA ─────────────────────────────────────────────

/**
 * Inicializa el sistema de logros.
 * Llama evaluar al arrancar y se suscribe a state:change para futuras
 * evaluaciones. Además renderiza la vitrina de logros en Ajustes
 * (#panel-logros, LG.1b/ADR 022) al arrancar, en cada cambio de estado y
 * al navegar a #config.
 */
export function initLogros() {
  _checkYMostrar();
  EventBus.on('state:change', () => {
    _checkYMostrar();
    renderSmart(renderPanelLogros, 'config');
  });
  // Tambien escuchar el evento de onboarding, ya que setea s.onboarded=true
  // pero no emite state:change. Sin esto, el logro "primer-paso" no aparecia
  // al registrar el nombre - solo se mostraba en el siguiente reload.
  EventBus.on('onboarding:completado', _checkYMostrar);

  window.addEventListener('hashchange', () => {
    renderSmart(renderPanelLogros, 'config');
  });
  registrarRender(() => renderSmart(renderPanelLogros, 'config'));
  renderSmart(renderPanelLogros, 'config');
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

  // 3+ logros a la vez (ej. al restaurar un respaldo o importar un CSV) satura
  // la pantalla con un toast tras otro; un solo toast resume mejor.
  if (nuevos.length > 2) {
    _encolarToast({ emoji: '🏆', nombre: `${nuevos.length} logros nuevos` }, 'Logros desbloqueados');
    return;
  }

  nuevos.forEach(id => {
    const logro = LOGROS.find(l => l.id === id);
    if (!logro) return;
    _encolarToast(logro);
  });
}

// ── TOAST ────────────────────────────────────────────────────────

const DURACION_MS = 5000;

// Un toast a la vez: el siguiente entra cuando el anterior se va. Todos se
// posicionan en el mismo punto fijo, y con la pausa por hover la vida de un
// toast ya no es predecible como para escalonarlos con timers.
const _cola = [];
let _toastActivo = false;

function _encolarToast(logro, label) {
  _cola.push({ logro, label });
  if (!_toastActivo) _siguienteToast();
}

function _siguienteToast() {
  const sig = _cola.shift();
  if (!sig) { _toastActivo = false; return; }
  _toastActivo = true;
  _mostrarToast(sig.logro, sig.label);
}

/**
 * Crea y muestra el toast de logro desbloqueado con confetti.
 * Se auto-elimina tras DURACION_MS ms; pasar el cursor por encima pausa el
 * conteo y la ✕ lo cierra al instante. Al irse, avisa a la cola.
 *
 * @param {{ emoji: string, nombre: string }} logro
 * @param {string} [label] Texto de la etiqueta superior. Default: "Logro desbloqueado".
 */
function _mostrarToast(logro, label = 'Logro desbloqueado') {
  const toast = document.createElement('div');
  toast.className = 'logro-toast';
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  toast.innerHTML = `
    <span class="logro-toast__emoji" aria-hidden="true">${logro.emoji}</span>
    <div class="logro-toast__body">
      <p class="logro-toast__label">${_esc(label)}</p>
      <p class="logro-toast__nombre">${_esc(logro.nombre)}</p>
    </div>
    <button type="button" class="logro-toast__cerrar" aria-label="Cerrar aviso">&times;</button>`;

  document.body.appendChild(toast);
  _lanzarConfetti();

  // Nota: NO armar un `animationend` defensivo global. La animación de entrada
  // (`toastIn`) dispara `animationend` ~350ms despues; el listener del fade
  // se arma recién dentro de `cerrar()` para no confundirse con la entrada.
  let cerrado  = false;
  let removido = false;
  const cerrar = () => {
    if (cerrado || !toast.isConnected) return;
    cerrado = true;
    toast.classList.add('fade');
    const onEnd = () => {
      if (removido) return;   // animationend + fallback no deben avanzar la cola 2 veces
      removido = true;
      toast.remove();
      _siguienteToast();
    };
    toast.addEventListener('animationend', onEnd, { once: true });
    // Fallback por si animationend no dispara (prefers-reduced-motion).
    setTimeout(onEnd, 400);
  };

  // Autocierre pausable: al entrar el cursor se congela el tiempo restante,
  // al salir se retoma (con un mínimo para que no muera apenas salga).
  let restante = DURACION_MS;
  let inicio   = Date.now();
  let timer    = setTimeout(cerrar, restante);

  toast.addEventListener('mouseenter', () => {
    if (cerrado || timer === null) return;
    clearTimeout(timer);
    timer = null;
    restante -= Date.now() - inicio;
  });
  toast.addEventListener('mouseleave', () => {
    if (cerrado || timer !== null) return;
    inicio = Date.now();
    timer = setTimeout(cerrar, Math.max(restante, 1000));
  });
  toast.querySelector('.logro-toast__cerrar').addEventListener('click', () => {
    if (timer !== null) clearTimeout(timer);
    cerrar();
  });
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


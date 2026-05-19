/**
 * install-prompt.js - banner persuasivo para instalar Finko como PWA.
 *
 * Comportamiento:
 * - Aparece tras el onboarding (no espanta al recien llegado).
 * - Android/Chrome/Edge: captura beforeinstallprompt y dispara el prompt nativo.
 * - iOS Safari: muestra un modal con instrucciones paso a paso (no soporta
 *   beforeinstallprompt y los usuarios no saben donde esta "Agregar a inicio").
 * - Si ya esta instalada (display-mode: standalone) o el usuario descarto:
 *   no se muestra.
 * - Si descarto: vuelve a aparecer despues de 14 dias.
 */

import { S, EventBus } from '../core/state.js';
import { registrarAccion } from './actions.js';
import { abrirModal } from './modales.js';

const INSTALL_KEY     = 'fk_install';
const DISMISS_DAYS    = 14;
const DAY_MS          = 24 * 60 * 60 * 1000;

/** Evento beforeinstallprompt diferido (Chrome/Edge/Android). */
let _deferredPrompt = null;

// ── PUNTO DE ENTRADA ─────────────────────────────────────────────

/**
 * Inicializa el banner de instalacion. Se llama una sola vez desde bootstrap.js.
 */
export function initInstallPrompt() {
  // 1) Capturar el evento de instalacion (Chrome/Edge/Android).
  //    Se dispara cuando el navegador detecta que la PWA es instalable.
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    _deferredPrompt = e;
    _mostrarSiCorresponde();
  });

  // 2) Detectar instalacion completada (limpia el banner).
  window.addEventListener('appinstalled', () => {
    _setEstado('installed');
    _ocultarBanner();
  });

  // 3) Registrar handlers de los botones.
  registrarAccion('install-pwa',     _disparoInstall);
  registrarAccion('dismiss-install', _descartar);

  // 4) Mostrar al completar onboarding (no antes).
  EventBus.on('onboarding:completado', _mostrarSiCorresponde);

  // 5) Si ya estaba onboarded, evaluar al arrancar.
  //    iOS no dispara beforeinstallprompt, asi que ahi mostramos siempre que aplique.
  if (S.onboarded) _mostrarSiCorresponde();
}

// ── DECISION DE MOSTRAR ──────────────────────────────────────────

function _mostrarSiCorresponde() {
  if (_yaInstalada())  return;
  if (!_puedeMostrar()) return;
  if (!S.onboarded)     return;

  // Android/desktop: requiere haber capturado el evento. Si no llego todavia,
  // se mostrara cuando llegue (el handler de beforeinstallprompt vuelve a llamar).
  if (!_esIOS() && !_deferredPrompt) return;

  _mostrarBanner();
}

function _yaInstalada() {
  if (window.matchMedia?.('(display-mode: standalone)').matches) return true;
  // iOS Safari standalone (legacy property).
  if (navigator.standalone === true) return true;
  return false;
}

function _puedeMostrar() {
  let raw;
  try { raw = localStorage.getItem(INSTALL_KEY); }
  catch { return true; }

  if (!raw) return true;

  try {
    const data = JSON.parse(raw);
    if (data.estado === 'installed') return false;
    if (data.estado === 'dismissed' && typeof data.ts === 'number') {
      return (Date.now() - data.ts) > DISMISS_DAYS * DAY_MS;
    }
  } catch {
    return true;
  }
  return true;
}

function _setEstado(estado) {
  try {
    localStorage.setItem(INSTALL_KEY, JSON.stringify({ estado, ts: Date.now() }));
  } catch {
    // Privado o quota llena: aceptable, solo perderemos la decision al recargar.
  }
}

function _esIOS() {
  const ua = navigator.userAgent || '';
  return /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
}

// ── UI ───────────────────────────────────────────────────────────

function _mostrarBanner() {
  const banner = document.getElementById('install-banner');
  if (!banner) return;
  banner.hidden = false;
  banner.removeAttribute('aria-hidden');
}

function _ocultarBanner() {
  const banner = document.getElementById('install-banner');
  if (!banner) return;
  banner.hidden = true;
  banner.setAttribute('aria-hidden', 'true');
}

function _descartar() {
  _setEstado('dismissed');
  _ocultarBanner();
}

// ── DISPARAR INSTALACION ─────────────────────────────────────────

async function _disparoInstall() {
  if (_esIOS()) {
    const modal = document.getElementById('modal-install-ios');
    if (modal) abrirModal(modal);
    return;
  }

  if (_deferredPrompt) {
    _deferredPrompt.prompt();
    try {
      const choice = await _deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        _setEstado('installed');
      } else {
        _setEstado('dismissed');
      }
    } catch {
      // El usuario cerro sin elegir: tratar como descartado.
      _setEstado('dismissed');
    } finally {
      _deferredPrompt = null;
      _ocultarBanner();
    }
    return;
  }

  // Sin beforeinstallprompt y no es iOS: mostrar las instrucciones igual,
  // funcionan para la mayoria de navegadores que dejan "Instalar" en el menu.
  const modal = document.getElementById('modal-install-ios');
  if (modal) abrirModal(modal);
}

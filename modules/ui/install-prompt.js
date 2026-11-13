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
import { mostrarToast } from './toast.js';
import { announce } from '../infra/a11y.js';

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
    // Si el navegador vuelve a ofrecer instalar, la app ya no está instalada
    // (se desinstaló): lo que recordábamos deja de valer.
    if (instaladaDesdeEsteNavegador()) _setEstado('dismissed', 0);
    _mostrarSiCorresponde();
  });

  // 2) Detectar instalacion completada (limpia el banner). ADR 137 D3: y lo
  //    dice, porque en Android el navegador instala sin avisar en la página.
  window.addEventListener('appinstalled', () => {
    _setEstado('installed');
    _ocultarBanner();
    mostrarToast({ titulo: 'Finko quedó instalada', detalle: 'Ábrela desde la pantalla de inicio de tu teléfono.' });
    announce('Finko quedó instalada.');
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

// ── HELPERS EXPORTADOS ───────────────────────────────────────────

/**
 * Indica si Finko está instalada como PWA en este dispositivo.
 * Útil para que otras secciones (ej. Ajustes) muestren u oculten el botón.
 * @returns {boolean}
 */
export function estaInstalada() {
  if (window.matchMedia?.('(display-mode: standalone)').matches) return true;
  if (navigator.standalone === true) return true;
  return false;
}

/**
 * ADR 137 D3: true si la instalación se aceptó desde esta pestaña del
 * navegador. `estaInstalada()` mira si la página corre como app, y en la
 * pestaña desde la que se instaló sigue siendo falso: sin esto, Ajustes
 * seguía ofreciendo "Instalar Finko" después de instalarla.
 * @returns {boolean}
 */
export function instaladaDesdeEsteNavegador() {
  try {
    return JSON.parse(localStorage.getItem(INSTALL_KEY) ?? 'null')?.estado === 'installed';
  } catch {
    return false;
  }
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
  return estaInstalada();
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

function _setEstado(estado, ts = Date.now()) {
  try {
    localStorage.setItem(INSTALL_KEY, JSON.stringify({ estado, ts }));
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

/** @param {HTMLElement} [boton] - el botón tocado (banner o Ajustes). */
async function _disparoInstall(boton) {
  if (_esIOS()) {
    const modal = document.getElementById('modal-install-ios');
    if (modal) abrirModal(modal);
    return;
  }

  if (_deferredPrompt) {
    // ADR 137 D3: mientras el navegador pregunta, el botón no responde a un
    // segundo toque, y al aceptar Finko dice que está instalando.
    if (boton) boton.disabled = true;
    _deferredPrompt.prompt();
    try {
      const choice = await _deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        _setEstado('installed');
        mostrarToast({ titulo: 'Instalando Finko…', detalle: 'En unos segundos la encuentras en tu pantalla de inicio.' });
        announce('Instalando Finko.');
      } else {
        _setEstado('dismissed');
      }
    } catch {
      // El usuario cerro sin elegir: tratar como descartado.
      _setEstado('dismissed');
    } finally {
      _deferredPrompt = null;
      if (boton) boton.disabled = false;
      _ocultarBanner();
    }
    return;
  }

  // Sin beforeinstallprompt y no es iOS. ADR 137 D3: antes abría las
  // instrucciones del iPhone; ahora dice dónde está en el menú del navegador.
  mostrarToast({
    titulo: 'Instálala desde el menú del navegador',
    detalle: 'Toca el menú (los tres puntos) y elige "Instalar app" o "Agregar a la pantalla principal".',
  });
}

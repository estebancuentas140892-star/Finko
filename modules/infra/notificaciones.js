/**
 * infra/notificaciones.js - abstracción de la Web Notifications API.
 *
 * Diseño para PWA offline-first sin servidor:
 * - Las notificaciones se disparan al abrir la app (on-load), no en background.
 * - No requiere push server, VAPID keys ni suscripciones.
 * - El usuario opt-in explícito via un botón en Configuración.
 *
 * Flujo de uso:
 *   1. Usuario toca "Activar recordatorios" (gesto de usuario requerido).
 *   2. `pedirPermiso()` solicita Notification.permission.
 *   3. Si 'granted', `S.config.notificaciones = true` y se persiste.
 *   4. En cada apertura de la app: `verificarYNotificar(S.compromisos)` muestra
 *      una sola notificación si hay compromisos próximos.
 *
 * Constantes de umbral:
 * - DIAS_UMBRAL = 3  → días restantes para que un compromiso sea "próximo".
 *
 * Funciones testables en Node (sin DOM):
 * - `estadoPermiso()` - guardada como string, no lee API directamente.
 * - `formatearMensajeNotificacion(proximos)` - pura, sin side effects.
 */

import { S } from '../core/state.js';
import { compromisosProximos } from '../dominio/compromisos/logic.js';

/** Umbral en días para considerar un compromiso "próximo". */
const DIAS_UMBRAL = 3;

/** Flag de sesión: solo notificamos una vez por apertura de app. */
let _yaNotificadoEstasSesion = false;

// ── API PÚBLICA ──────────────────────────────────────────────────

/**
 * Estado actual del permiso de notificaciones en el navegador.
 * Devuelve 'unsupported' si el navegador no soporta la Notification API.
 *
 * @returns {'default' | 'granted' | 'denied' | 'unsupported'}
 */
export function estadoPermiso() {
  if (typeof Notification === 'undefined') return 'unsupported';
  return /** @type {'default'|'granted'|'denied'} */ (Notification.permission);
}

/**
 * Solicita permiso al navegador. Debe llamarse desde un gesto de usuario (click).
 * Idempotente: si ya está 'granted' o 'denied', retorna el estado actual sin volver
 * a preguntar.
 *
 * @returns {Promise<'granted' | 'denied' | 'default' | 'unsupported'>}
 */
export async function pedirPermiso() {
  if (typeof Notification === 'undefined') return 'unsupported';
  if (Notification.permission !== 'default') return Notification.permission;
  try {
    return await Notification.requestPermission();
  } catch {
    return 'denied';
  }
}

/**
 * Muestra una notificación al usuario. Prefiere el SW registration si está disponible
 * (más compatible con PWA). Cae a `new Notification()` como fallback.
 *
 * No-op si:
 * - El navegador no soporta la API.
 * - El permiso no es 'granted'.
 *
 * @param {string} titulo
 * @param {{ body?: string, icon?: string, tag?: string, badge?: string }} [opciones]
 * @returns {Promise<void>}
 */
export async function mostrarNotificacion(titulo, opciones = {}) {
  if (estadoPermiso() !== 'granted') return;

  const opts = {
    body:  opciones.body  ?? '',
    icon:  opciones.icon  ?? '/assets/icons/icon-192.png',
    badge: opciones.badge ?? '/assets/icons/icon-192.png',
    tag:   opciones.tag   ?? 'finko-recordatorio',
    ...opciones,
  };

  try {
    const reg = typeof navigator !== 'undefined'
      ? await navigator.serviceWorker?.getRegistration?.()
      : undefined;

    if (reg?.showNotification) {
      await reg.showNotification(titulo, opts);
    } else {
      new Notification(titulo, opts); // side-effect intencional
    }
  } catch (err) {
    console.warn('[notificaciones] mostrarNotificacion falló:', err);
  }
}

/**
 * Verifica si hay compromisos próximos y muestra una notificación si:
 * - El usuario optó-in (`S.config.notificaciones === true`).
 * - El permiso del navegador es 'granted'.
 * - Hay compromisos activos con vencimiento ≤ DIAS_UMBRAL días.
 * - No se ha notificado ya en esta sesión.
 *
 * Llama solo una notificación por sesión (no una por compromiso).
 *
 * @param {import('../core/state.js').Compromiso[]} compromisos
 * @returns {Promise<void>}
 */
export async function verificarYNotificar(compromisos) {
  if (_yaNotificadoEstasSesion) return;
  if (!S.config?.notificaciones) return;
  if (estadoPermiso() !== 'granted') return;

  const proximos = compromisosProximos(compromisos, DIAS_UMBRAL);
  if (proximos.length === 0) return;

  _yaNotificadoEstasSesion = true;

  const { titulo, cuerpo } = formatearMensajeNotificacion(proximos);
  await mostrarNotificacion(titulo, { body: cuerpo });
}

// ── HELPERS PUROS (testeables) ───────────────────────────────────

/**
 * Formatea el título y cuerpo de la notificación según cuántos compromisos
 * están próximos a vencer. Función pura - sin side effects, testeable en Node.
 *
 * @param {Array<{ descripcion: string, diasRestantes: number, monto: number }>} proximos
 * @returns {{ titulo: string, cuerpo: string }}
 */
export function formatearMensajeNotificacion(proximos) {
  if (proximos.length === 0) {
    return { titulo: '', cuerpo: '' };
  }

  if (proximos.length === 1) {
    const c = proximos[0];
    const cuandoLabel = c.diasRestantes === 0
      ? 'vence hoy'
      : c.diasRestantes === 1
        ? 'vence mañana'
        : `vence en ${c.diasRestantes} días`;
    return {
      titulo: `⏰ ${c.descripcion} ${cuandoLabel}`,
      cuerpo: `Recordatorio de Finko. No olvides este compromiso.`,
    };
  }

  const hoy    = proximos.filter(c => c.diasRestantes === 0).length;
  const manana = proximos.filter(c => c.diasRestantes === 1).length;

  let cuandoResumen = '';
  if (hoy > 0 && manana > 0)       cuandoResumen = 'hoy y mañana';
  else if (hoy > 0)                 cuandoResumen = 'hoy';
  else if (manana > 0)              cuandoResumen = 'mañana';
  else                              cuandoResumen = `en los próximos ${DIAS_UMBRAL} días`;

  const nombres = proximos
    .slice(0, 3) // máximo 3 en el cuerpo
    .map(c => c.descripcion)
    .join(', ');
  const extra = proximos.length > 3 ? ` y ${proximos.length - 3} más` : '';

  return {
    titulo: `⏰ ${proximos.length} compromisos vencen ${cuandoResumen}`,
    cuerpo: `${nombres}${extra}`,
  };
}

// ── UTILIDAD DE RESET (solo para tests) ─────────────────────────

/**
 * Restablece el flag de sesión. Solo para uso en tests.
 * @internal
 */
export function _resetNotificadoEstasSesion() {
  _yaNotificadoEstasSesion = false;
}

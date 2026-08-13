/**
 * infra/notificaciones.js - abstracción de la Web Notifications API.
 *
 * Diseño para PWA offline-first sin servidor
 * ([ADR 066](../../docs/DECISIONS/066-motor-unico-de-avisos.md) D1):
 * - Las notificaciones se disparan al abrir la app (on-load), no en background.
 *   Un service worker no puede leer `localStorage`, así que no tiene con qué
 *   calcular un vencimiento estando la app cerrada; ese límite es honesto y
 *   está escrito en el ADR, con PERF.5 como su único disparador de revisión.
 * - No requiere push server, VAPID keys ni suscripciones.
 * - El usuario opt-in explícito via un botón en Configuración.
 *
 * Flujo de uso:
 *   1. Usuario toca "Activar recordatorios" (gesto de usuario requerido).
 *   2. `pedirPermiso()` solicita Notification.permission.
 *   3. Si 'granted', `S.config.notificaciones = true` y se persiste.
 *   4. En cada apertura de la app: `verificarYNotificar()` recolecta los avisos
 *      del día con el motor único (`infra/avisos.js`) y muestra **una** sola
 *      notificación, con el más grave como protagonista.
 *
 * Qué interrumpe y qué no (ADR 066 D5): solo los avisos de severidad `urgente` o
 * `alta` llegan acá. Un apartado a seis días o un préstamo que te deben esperan
 * dentro de la app: interrumpir el teléfono queda para lo que el usuario debe.
 *
 * Esta es una **superficie**, así que el copy vive acá (ADR 066 D2): el motor
 * devuelve datos y cada superficie los redacta en el tono del
 * [ADR 003](../../docs/DECISIONS/003-tono-neutral-profesional.md).
 *
 * Funciones testables en Node (sin DOM):
 * - `estadoPermiso()` - guardada como string, no lee API directamente.
 * - `formatearAvisoSistema(aviso, total)` - pura, sin side effects.
 */

import { S } from '../core/state.js';
import { save } from '../core/storage.js';
import { f, hoy } from './utils.js';
import { recolectarAvisos, avisosQueInterrumpen, filtrarPorPreferencia } from './avisos.js';

/** Emoji por tipo de aviso. El título de una notificación sí los usa: es la única señal de qué es antes de leer. */
const _EMOJI = {
  'compromiso-vencido': '⏰',
  'compromiso-proximo': '⏰',
  'limite-excedido':    '⚠️',
  'limite-alerta':      '⚠️',
  'apartado-proximo':   '📦',
  'apartado-listo':     '📦',
  'prestamo-vencido':   '🤝',
  'prestamo-proximo':   '🤝',
  'dia-de-pago':        '💰',
};

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
 * Recolecta los avisos del día y muestra una notificación si:
 * - El usuario optó-in (`S.config.notificaciones === true`).
 * - El permiso del navegador es 'granted'.
 * - Hay al menos un aviso de severidad `urgente` o `alta` que su sección no
 *   tiene apagada (`S.config.avisosPorSeccion`, CFG.3c).
 * - No se avisó ya **hoy** (`S.config.ultimoAvisoISO`, CFG.3c, schema v40).
 *
 * El sello es persistido, no de sesión: antes, cerrar y volver a abrir la app
 * el mismo día repetía la notificación porque el guard vivía solo en memoria.
 * Una sola notificación por día, no una por aviso ni una por apertura.
 *
 * @param {string} [hoyISO] Fecha de referencia (inyectable; default: hoy).
 * @returns {Promise<void>}
 */
export async function verificarYNotificar(hoyISO = hoy()) {
  if (S.config?.ultimoAvisoISO === hoyISO) return;
  if (!S.config?.notificaciones) return;
  if (estadoPermiso() !== 'granted') return;

  const avisos = filtrarPorPreferencia(
    avisosQueInterrumpen(recolectarAvisos({
      compromisos:  S.compromisos,
      gastos:       S.gastos,
      presupuestos: S.presupuestos,
      apartados:    S.apartados,
      personales:   S.personales,
      ingresos:     S.ingresos,
      hoyISO,
    })),
    S.config?.avisosPorSeccion,
  );
  if (avisos.length === 0) return;

  if (!S.config) S.config = {};
  S.config.ultimoAvisoISO = hoyISO;
  save();

  const { titulo, cuerpo } = formatearAvisoSistema(avisos[0], avisos.length);
  await mostrarNotificacion(titulo, { body: cuerpo });
}

// ── HELPERS PUROS (testeables) ───────────────────────────────────

/**
 * Título y cuerpo de la notificación a partir del aviso más grave del día.
 * Función pura, sin side effects, testeable en Node.
 *
 * El aviso protagonista da el título; el cuerpo dice la cifra en juego y, si hay
 * más de un aviso, cuántos esperan en la app. Nunca lista los demás: una
 * notificación con seis nombres no se lee.
 *
 * @param {import('./avisos.js').Aviso} aviso Aviso protagonista (el primero de la lista ordenada).
 * @param {number} [total=1] Cuántos avisos interrumpen hoy, incluido este.
 * @returns {{ titulo: string, cuerpo: string }} Strings vacíos si no hay aviso.
 */
export function formatearAvisoSistema(aviso, total = 1) {
  if (!aviso || typeof aviso !== 'object') return { titulo: '', cuerpo: '' };

  const emoji  = _EMOJI[aviso.tipo] ?? '⏰';
  const nombre = aviso.nombre || 'Un pendiente';
  const titulo = `${emoji} ${_frase(aviso, nombre)}`;

  const restantes = Math.max(0, (Number(total) || 1) - 1);
  const partes = [];
  if (Number(aviso.monto) > 0) partes.push(f(aviso.monto));
  if (restantes === 1)         partes.push('Tienes otro aviso en Finko.');
  else if (restantes > 1)      partes.push(`Tienes ${restantes} avisos más en Finko.`);
  else if (partes.length === 0) partes.push('Recordatorio de Finko.');

  return { titulo, cuerpo: partes.join('. ') };
}

/** La frase del título según el tipo de aviso. Tuteo, sin presionar (ADR 003). */
function _frase(aviso, nombre) {
  const dias = Number(aviso.dias);

  switch (aviso.tipo) {
    case 'compromiso-vencido':
      return dias === 1
        ? `${nombre} venció ayer`
        : `${nombre} venció hace ${dias} días`;

    case 'compromiso-proximo':
      if (dias === 0) return `${nombre} vence hoy`;
      if (dias === 1) return `${nombre} vence mañana`;
      return `${nombre} vence en ${dias} días`;

    case 'limite-excedido':
      return `Pasaste tu tope de ${nombre}`;

    case 'limite-alerta':
      return `Vas en el ${Number(aviso.extra?.porcentaje) || 0}% de tu tope de ${nombre}`;

    case 'apartado-proximo':
      if (dias === 0) return `Hoy necesitas el dinero de ${nombre}`;
      if (dias === 1) return `Mañana necesitas el dinero de ${nombre}`;
      return `En ${dias} días necesitas el dinero de ${nombre}`;

    case 'apartado-listo':
      return `Ya reuniste el dinero de ${nombre}`;

    case 'prestamo-vencido':
      return `La fecha que acordaste con ${nombre} ya pasó`;

    case 'prestamo-proximo':
      return dias === 0
        ? `Hoy acordaste que ${nombre} te devuelve`
        : `${nombre} te devuelve en ${dias} días`;

    case 'dia-de-pago':
      return `Hoy te llega ${nombre}`;

    default:
      return nombre;
  }
}


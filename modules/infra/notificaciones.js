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
 * Lo que se ve fuera de la app ([ADR 144](../../docs/DECISIONS/144-lo-que-finko-muestra-fuera-de-la-app.md)):
 * con el candado la notificación no nombra ni muestra cifras (D1), el número
 * del ícono cuenta lo mismo que puede interrumpir (D2) y tocar la notificación
 * abre la sección de su aviso (D3, `data.url`, que atiende el service worker).
 *
 * Funciones testables en Node (sin DOM):
 * - `estadoPermiso()` - guardada como string, no lee API directamente.
 * - `formatearAvisoSistema(aviso, total, privacidad)` - pura, sin side effects.
 * - `avisosQueNotifican(state, hoyISO)` y `rutaDeAviso(aviso)` - puras.
 */

import { S, EventBus } from '../core/state.js';
import { save } from '../core/storage.js';
import { f, hoy } from './utils.js';
import { recolectarAvisos, avisosQueInterrumpen, filtrarPorPreferencia, hayDatosParaRespaldar } from './avisos.js';
import { candadoActivo } from '../dominio/config/bloqueo.js';
import { montosOcultos } from './privacidad.js';
import { textoEstadoObligacion } from './estado-obligacion.js';

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
  'respaldo-atrasado':  '💾',
  'debito-sin-saldo':   '⏰',
  'suscripciones-varias': '🔁',
  'avances-seguidos':   '💳',
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

  const avisos = avisosQueNotifican(S, hoyISO);
  if (avisos.length === 0) return;

  if (!S.config) S.config = {};
  S.config.ultimoAvisoISO = hoyISO;
  save();

  // ADR 144 D1: se mira al redactar, no al decidir si se avisa. Quien puso el
  // PIN igual quiere saber que algo vence; lo que protege es el contenido.
  const { titulo, cuerpo } = formatearAvisoSistema(avisos[0], avisos.length, {
    candado: candadoActivo(S.config?.bloqueo),
    oculto:  montosOcultos('dash'),
  });
  await mostrarNotificacion(titulo, { body: cuerpo, data: { url: rutaDeAviso(avisos[0]) } });
}

/**
 * Pone en el ícono de la app instalada cuántos avisos piden atención
 * (ADR 144 D2), o lo limpia en cero. Solo con los recordatorios activados:
 * lo que se ve fuera de la app es opt-in (CFG.3a). Sin la API (navegador sin
 * soporte o app sin instalar) no hace nada. El candado no lo apaga: un número
 * no dice montos.
 *
 * @param {string} [hoyISO] Fecha de referencia (inyectable; default: hoy).
 * @returns {Promise<void>}
 */
export async function actualizarInsignia(hoyISO = hoy()) {
  if (typeof navigator === 'undefined' || typeof navigator.setAppBadge !== 'function') return;
  const n = S.config?.notificaciones ? avisosQueNotifican(S, hoyISO).length : 0;
  try {
    if (n > 0) await navigator.setAppBadge(n);
    else await navigator.clearAppBadge?.();
  } catch {
    // Sin permiso o fuera de la app instalada: el número es un extra, no un error.
  }
}

/**
 * Mantiene el número del ícono al día (ADR 144 D2): al abrir, después de cada
 * cambio de datos (`state:change`, y `state:save` para los interruptores de
 * Ajustes, que guardan sin pasar por `crud`) y al volver a la app. Los cambios
 * de un mismo cuadro se recalculan una sola vez.
 */
export function initInsignia() {
  if (typeof navigator === 'undefined' || typeof navigator.setAppBadge !== 'function') return;
  let pendiente = false;
  const programar = () => {
    if (pendiente) return;
    pendiente = true;
    requestAnimationFrame(() => {
      pendiente = false;
      actualizarInsignia();
    });
  };
  EventBus.on('state:change', programar);
  EventBus.on('state:save', programar);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') actualizarInsignia();
  });
  actualizarInsignia();
}

// ── HELPERS PUROS (testeables) ───────────────────────────────────

/**
 * Los avisos que pueden volverse notificación hoy, en orden de gravedad: los
 * `urgente` y `alta` (ADR 066 D5) de las secciones que la persona no apagó
 * (CFG.3c). Lo leen la notificación y el número del ícono, para que cuenten
 * lo mismo (ADR 144 D2).
 *
 * @param {object} state - `S`.
 * @param {string} hoyISO - `YYYY-MM-DD`.
 * @returns {import('./avisos.js').Aviso[]}
 */
export function avisosQueNotifican(state, hoyISO) {
  return filtrarPorPreferencia(
    avisosQueInterrumpen(recolectarAvisos({
      compromisos:  state.compromisos,
      gastos:       state.gastos,
      presupuestos: state.presupuestos,
      apartados:    state.apartados,
      personales:   state.personales,
      ingresos:     state.ingresos,
      cuentas:      state.cuentas,
      ultimoRespaldoISO: state.config?.ultimoRespaldoISO ?? null,
      primerUsoISO:      state.config?.primerUsoISO ?? null,
      hayDatosParaRespaldar: hayDatosParaRespaldar({
        compromisos: state.compromisos, presupuestos: state.presupuestos, apartados: state.apartados,
        personales: state.personales, ingresos: state.ingresos, gastos: state.gastos,
        cuentas: state.cuentas, metas: state.metas, inversiones: state.inversiones,
      }),
      hoyISO,
    })),
    state.config?.avisosPorSeccion,
  );
}

/**
 * La sección de la app donde se resuelve cada aviso, por su `seccion` del
 * motor. El respaldo se guarda desde Ajustes.
 */
const _HASH_DE_SECCION = {
  compromisos: 'compromisos',
  presupuesto: 'presupuesto',
  apartados:   'apartados',
  personales:  'personales',
  tesoreria:   'tesoreria',
  respaldo:    'config',
  nube:        'config',
};

/**
 * Adónde lleva tocar la notificación (ADR 144 D3): la sección dueña del aviso,
 * no el elemento. La lista de cada sección pone arriba lo vencido y lo
 * próximo, que es justo lo que avisó. Sin sección conocida, Inicio.
 *
 * @param {import('./avisos.js').Aviso} aviso
 * @returns {string} `/#seccion`.
 */
export function rutaDeAviso(aviso) {
  return `/#${_HASH_DE_SECCION[aviso?.seccion] ?? 'dash'}`;
}

/**
 * Título y cuerpo de la notificación a partir del aviso más grave del día.
 * Función pura, sin side effects, testeable en Node.
 *
 * El aviso protagonista da el título; el cuerpo dice la cifra en juego y, si hay
 * más de un aviso, cuántos esperan en la app. Nunca lista los demás: una
 * notificación con seis nombres no se lee.
 *
 * Lo que se ve en la pantalla bloqueada (ADR 144 D1): con el candado, solo
 * cuántos avisos esperan, sin nombre, cifra ni emoji del tipo; con el ojo
 * puesto (`ocultarSaldo`), el aviso con su nombre pero sin la cifra.
 *
 * @param {import('./avisos.js').Aviso} aviso Aviso protagonista (el primero de la lista ordenada).
 * @param {number} [total=1] Cuántos avisos interrumpen hoy, incluido este.
 * @param {{ candado?: boolean, oculto?: boolean }} [privacidad]
 * @returns {{ titulo: string, cuerpo: string }} Strings vacíos si no hay aviso.
 */
export function formatearAvisoSistema(aviso, total = 1, { candado = false, oculto = false } = {}) {
  if (!aviso || typeof aviso !== 'object') return { titulo: '', cuerpo: '' };

  const cuantos = Math.max(1, Number(total) || 1);
  if (candado) {
    return cuantos === 1
      ? { titulo: 'Tienes un aviso en Finko', cuerpo: 'Ábrela para verlo.' }
      : { titulo: `Tienes ${cuantos} avisos en Finko`, cuerpo: 'Ábrela para verlos.' };
  }

  const emoji  = _EMOJI[aviso.tipo] ?? '⏰';
  const nombre = aviso.nombre || 'Un pendiente';
  const titulo = `${emoji} ${_frase(aviso, nombre)}`;

  const restantes = cuantos - 1;
  const partes = [];
  if (!oculto && Number(aviso.monto) > 0) partes.push(f(aviso.monto));
  if (restantes === 1)         partes.push('Tienes otro aviso en Finko.');
  else if (restantes > 1)      partes.push(`Tienes ${restantes} avisos más en Finko.`);
  else if (partes.length === 0) partes.push('Recordatorio de Finko.');

  return { titulo, cuerpo: partes.join('. ') };
}

/** La frase del título según el tipo de aviso. Tuteo, sin presionar (ADR 003). */
function _frase(aviso, nombre) {
  const dias = Number(aviso.dias);

  switch (aviso.tipo) {
    case 'compromiso-vencido': {
      // GAS.12b (ADR 187 D2): el mismo texto de la app; un atraso de meses se
      // dice en meses ("venció hace 4 meses"), no "hace 128 días".
      const t = textoEstadoObligacion(-dias)?.texto ?? `Venció hace ${dias} días`;
      return `${nombre} ${t.charAt(0).toLowerCase()}${t.slice(1)}`;
    }

    case 'debito-sin-saldo': {
      // HF.2b: lo que falta es dinero en la cuenta, no el pago.
      const cuenta = aviso.extra?.cuentaNombre || 'Tu cuenta';
      if (dias === 0) return `${cuenta} no alcanza para ${nombre}, que se debita hoy`;
      if (dias === 1) return `${cuenta} no alcanza para ${nombre}, que se debita mañana`;
      return `${cuenta} no alcanza para ${nombre}, que se debita en ${dias} días`;
    }

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

    case 'respaldo-atrasado':
      return `Hace ${dias} días que no respaldas tus datos`;

    default:
      return nombre;
  }
}


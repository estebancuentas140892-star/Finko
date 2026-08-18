/**
 * render.js - orquestador de renders y actualizaciones del DOM.
 *
 * Principios:
 * - `renderSmart` evita trabajo si la sección no está visible.
 * - `updSaldo` lee S directamente y actualiza el saldo total del dashboard.
 * - `renderAll` es el punto de entrada único para re-renderizar todo.
 * - Los renders de dominio (Fases 7-11) se registran vía `registrarRender`.
 */

import { S } from '../core/state.js';
import { f, esc as _esc } from './utils.js';
import { countUp, stopCount } from './animate.js';
import { bancoAvatar, bancoClase } from './bancos.js';

/**
 * Máscara del saldo cuando el usuario lo oculta (IN.2, estilo app bancaria).
 * Largo fijo: no revela la magnitud del monto real.
 */
export const SALDO_MASCARA = '$••••••';

/** Máscara por fila del detalle por cuenta (IN.8c): más corta que la del
 *  total, igual que el mockup del ADR 034; tampoco revela magnitud. */
export const SALDO_MASCARA_CUENTA = '••••';

/** @type {Array<() => void>} Funciones de render registradas por los dominios. */
const _renders = [];

/** Último saldo mostrado: permite animar solo cuando el valor cambia. */
let _prevSaldo = null;

/**
 * Detalle por cuenta del hero expandido o no (IN.8c, ADR 034 D4).
 * Estado SOLO de UI en memoria: colapsado en cada apertura de la app,
 * decisión explícita del ADR (no persistir hasta que el uso real lo pida).
 */
let _detalleCuentasAbierto = false;

/**
 * Alterna el detalle por cuenta del hero y re-renderiza el saldo.
 * La invoca la acción `saldo-detalle` (actions.js).
 */
export function alternarDetalleCuentas() {
  _detalleCuentasAbierto = !_detalleCuentasAbierto;
  updSaldo();
}

/**
 * Registra una función de render de dominio para que `renderAll` la invoque.
 * Cada dominio llama a esto en su `index.js` durante el bootstrap.
 *
 * @param {() => void} fn
 */
export function registrarRender(fn) {
  if (typeof fn === 'function') _renders.push(fn);
}

// ── RENDER CONDICIONAL ───────────────────────────────────────────

/**
 * Ejecuta `fn` solo si la sección `key` corresponde al hash actual de la URL.
 *
 * Por qué chequea hash y no `.active`:
 *   Los listeners de `hashchange` corren en orden de registro. Los dominios
 *   registran su listener ANTES que el router, así que cuando el listener del
 *   dominio se ejecuta, el router aún no ha actualizado la clase `.active`.
 *   En cambio, `location.hash` se actualiza sincrónicamente ANTES de que
 *   se disparen los listeners de hashchange, así que es el único valor
 *   confiable en ese momento.
 *
 * @param {() => void} fn - función de render del dominio.
 * @param {string} key - hash de la sección (ej. `'gast'`, `'metas'`).
 */
export function renderSmart(fn, key) {
  const hashActual = location.hash.slice(1) || 'dash';
  if (hashActual === key) fn();
}

// ── COALESCER DE RENDERS REACTIVOS (PERF.6) ─────────────────────

/**
 * Cola de renders agendados para el final del tick. `Set` porque la
 * deduplicación es por identidad de la función: agendar dos veces el mismo
 * render en el mismo tick pinta una sola vez.
 * @type {Set<() => void>}
 */
const _cola = new Set();

/** Hay un vaciado ya agendado para este tick. */
let _colaAgendada = false;

/**
 * Agenda `fn` para correr una sola vez al final del tick actual.
 *
 * Por qué existe (PERF.6, medido en `scripts/perf/BASELINE.md`): una sola
 * acción del usuario que muta varias colecciones emite un `state:change` por
 * mutación (contrato de `infra/crud.js`), y cada emisión repinta los paneles
 * que observan esa sección. Una distribución del ingreso estando en Inicio
 * emite 12 veces y pintaba los paneles del dashboard 6 veces: ~398 ms con
 * 10.000 gastos. Colapsado a un render por tick, ~62 ms.
 *
 * Solo para renders REACTIVOS (listeners de `state:change`). Los renders
 * directos (navegación, arranque, `renderAll`) siguen síncronos: ahí el
 * usuario espera ver el resultado en el mismo tick y no hay ráfaga que
 * colapsar.
 *
 * La `fn` que se pasa debe tener identidad estable entre llamadas (una función
 * de módulo, no una flecha creada en el propio listener), o la cola no puede
 * deduplicarla.
 *
 * @param {() => void} fn - render del dominio, idempotente.
 */
export function programarRender(fn) {
  if (typeof fn !== 'function') return;
  _cola.add(fn);
  if (_colaAgendada) return;
  _colaAgendada = true;
  queueMicrotask(vaciarRendersProgramados);
}

/**
 * Corre y limpia la cola de renders agendados. La llama el microtask de
 * `programarRender`; se exporta para los tests, que necesitan un punto de
 * vaciado síncrono sin depender del planificador de microtasks.
 *
 * Cada render se aísla con try/catch por la misma razón que `renderAll`: uno
 * que falla no puede dejar sin pintar a los demás de la cola.
 */
export function vaciarRendersProgramados() {
  _colaAgendada = false;
  // Copia y limpieza antes de correr: si un render agenda otro render, ese
  // entra en la cola del tick siguiente en vez de mutar la que se recorre.
  const pendientes = [..._cola];
  _cola.clear();
  for (const fn of pendientes) {
    try {
      fn();
    } catch (err) {
      console.error('[render] programarRender: un render agendado falló:', err);
    }
  }
}

// ── ACTUALIZACIONES DE ESTADO GLOBAL ────────────────────────────

/**
 * Recalcula el saldo total visible en el dashboard.
 *
 * - Suma `saldo` de todas las `S.cuentas` activas.
 * - Actualiza `#saldo-total` con el valor formateado, o con `SALDO_MASCARA`
 *   si el usuario ocultó el saldo con el ojo del hero (IN.2). La preferencia
 *   vive en `S.config.ocultarSaldo` (lectura defensiva: solo `true` oculta).
 * - Sincroniza el botón `#saldo-ojo`: icono ojo/ojo tachado + `aria-pressed`.
 * - Si el usuario aún no registró cuentas, muestra la guía de primeros pasos
 *   (`#hero-guia-saldo`) y oculta la descripción (`#saldo-desc`); con cuentas,
 *   al revés. Así un usuario nuevo sabe qué hacer ante el saldo en $0.
 */
export function updSaldo() {
  const cuentasActivas = S.cuentas.filter(c => c.activa !== false);
  const totalCuentas   = cuentasActivas.reduce((acc, c) => acc + (c.saldo ?? 0), 0);
  const sinCuentas     = cuentasActivas.length === 0;
  const oculto         = S.config?.ocultarSaldo === true;

  const elSaldo = document.getElementById('saldo-total');
  if (elSaldo) {
    if (sinCuentas) {
      elSaldo.textContent = f(0);
    } else if (oculto) {
      // El monto real nunca toca el DOM mientras está oculto. stopCount
      // cancela un countUp en vuelo que sobreescribiría la máscara.
      stopCount(elSaldo);
      elSaldo.textContent = SALDO_MASCARA;
    } else {
      const onDash = (location.hash.slice(1) || 'dash') === 'dash';
      // countUp respeta prefers-reduced-motion por su cuenta.
      if (onDash && _prevSaldo !== totalCuentas) {
        countUp(elSaldo, totalCuentas, { from: _prevSaldo ?? 0 });
      } else {
        elSaldo.textContent = f(totalCuentas);
      }
    }
    _prevSaldo = totalCuentas;
  }

  // Con cuentas: muestra el saldo normal y oculta la guía de primeros pasos.
  // Sin cuentas: oculta label, valor y ojo para no confundir; muestra la guía
  //              de onboarding con el CTA a Mis cuentas. (El ícono decorativo
  //              i-saldo del hero se eliminó en IN.8b, ADR 034 D2.)
  const guia  = document.getElementById('hero-guia-saldo');
  const desc  = document.getElementById('saldo-desc');
  const label = document.getElementById('hero-saldo-label');
  const valor = document.getElementById('saldo-total');

  if (guia)  guia.hidden  = !sinCuentas;
  if (desc)  desc.hidden  =  sinCuentas;
  if (label) label.hidden =  sinCuentas;
  if (valor) valor.hidden =  sinCuentas;

  // Botón del ojo (IN.2): estado presionado = saldo oculto. El icono refleja
  // el estado actual (ojo tachado mientras el monto está enmascarado).
  // Puede haber más de un ojo a la vez (hero de Inicio + cinta de la barra
  // superior, INT.1d): mismo patrón que _syncThemeButton (shell.js), un
  // solo selector por data-action en vez de un id.
  document.querySelectorAll('[data-action="saldo-visibilidad"]').forEach((ojo) => {
    ojo.hidden = sinCuentas;
    ojo.setAttribute('aria-pressed', String(oculto));
    const use = ojo.querySelector('use');
    if (use) use.setAttribute('href', oculto ? '#i-eye-off' : '#i-eye');
  });

  // Cinta de saldo de la barra superior (INT.1d, ADR 059 D9): no se pinta en
  // Inicio, donde el hero ya muestra el mismo dato (R27), ni sin cuentas.
  const cinta      = document.getElementById('topbar-saldo');
  const cintaValor = document.getElementById('topbar-saldo-value');
  if (cinta && cintaValor) {
    const enDash = (location.hash.slice(1) || 'dash') === 'dash';
    cinta.hidden = sinCuentas || enDash;
    cintaValor.textContent = oculto ? SALDO_MASCARA : f(totalCuentas);
  }

  // Detalle por cuenta. En móvil es el acordeón del hero (IN.8c, ADR 034 D4):
  // a 390px expandir es la única forma de mostrar las cuentas sin sacar al
  // usuario de la pantalla. Desde 1024px hay una columna libre al lado, así
  // que el mismo contenido vive ahí y deja de ser un estado (IN.9c, ADR 057
  // D3, regla R80). Las dos listas se llenan desde el mismo `oculto`: la
  // máscara del ojo cubre total Y detalle juntos (extensión de IN.2), y el
  // saldo real de cada cuenta no toca el DOM en ninguna de las dos.
  const enEscritorio = _enEscritorio();
  const abierto = _detalleCuentasAbierto && !sinCuentas && !enEscritorio;
  const pill    = document.getElementById('saldo-detalle-toggle');
  const detalle = document.getElementById('saldo-detalle');
  if (pill) {
    pill.hidden = sinCuentas || enEscritorio;
    pill.setAttribute('aria-expanded', String(abierto));
    const labelPill = document.getElementById('saldo-detalle-label');
    if (labelPill) labelPill.textContent = abierto ? 'Ocultar detalle' : 'Ver detalle por cuenta';
  }
  if (detalle) {
    if (!abierto) {
      detalle.hidden = true;
      detalle.innerHTML = '';
    } else {
      detalle.hidden = false;
      detalle.innerHTML = _filasCuentas(cuentasActivas, oculto);
    }
  }

  // Columna propia de escritorio (IN.9c). Vacía su lista al ocultarse por el
  // mismo motivo que el acordeón: nada de saldos en un DOM que no se ve.
  const panelCuentas = document.getElementById('panel-cuentas-detalle');
  if (panelCuentas) {
    const visible = enEscritorio && !sinCuentas;
    panelCuentas.hidden = !visible;
    const lista = document.getElementById('cuentas-detalle-lista');
    if (lista) lista.innerHTML = visible ? _filasCuentas(cuentasActivas, oculto) : '';
  }

  // "efectivo + N cuentas bancarias": se oculta solo cuando el acordeón está
  // expandido, que es cuando lo repite. En escritorio el detalle vive al lado
  // y no ocupa el sitio del conteo, así que los dos conviven.
  if (desc && !sinCuentas) {
    desc.hidden = abierto;
    if (!abierto) desc.textContent = _descCuentas(cuentasActivas);
  }
}

/**
 * ¿El ancho da para la columna propia del detalle por cuenta?
 *
 * Mismo umbral y misma forma que `_limiteRecientes()` de
 * `movimientos/view.js` y `_lanzarConfetti()` de `logros/index.js`: el corte
 * de escritorio de la app es 1024px.
 *
 * Se lee en cada `updSaldo()`. Un cambio de ancho sin cambio de estado no
 * repinta, así que el hero se queda con el reparto del último render hasta la
 * siguiente acción; misma limitación aceptada en IN.9b.
 *
 * @returns {boolean}
 */
function _enEscritorio() {
  return !window.matchMedia?.('(max-width: 1023.98px)').matches;
}

/**
 * Decide qué cierre de Inicio se ve según el ancho (DSK.1a, ADR 070 D2, que
 * acota IN.9d / ADR 057 D4).
 *
 * En escritorio Inicio avisa, no resume: se retiran Accesos rápidos (duplica
 * la barra lateral, que ya muestra 15 destinos con su nombre), Actividad
 * reciente (cuenta el pasado y comparte anatomía con la lista de
 * obligaciones) y Resumen de la semana (es tendencia, y la tendencia no
 * tiene fecha límite). Los dos primeros ya no existen en el DOM: escritorio
 * era su único hogar, así que IN.9d se revirtió en `index.html` en vez de
 * ocultarse. Acá solo queda el Resumen semanal, que sí sigue vivo bajo
 * 1024px y por eso se fuerza oculto por ancho.
 *
 * En móvil no cambia nada: la fusión Accesos + Actividad del ADR 034 D7
 * sigue igual, y el Resumen semanal lo sigue decidiendo resumen/view.js.
 *
 * El oculto se fuerza en una sola dirección, nunca al revés: revelar acá
 * dejaría un panel vacío cuando resumen/view.js ya lo escondió por falta de
 * datos. Mismo criterio que traía IN.9d con Actividad reciente.
 *
 * Se lee en cada `renderAll()`, misma limitación aceptada en IN.9b/IN.9c: un
 * cambio de ancho sin cambio de estado no repinta.
 */
function _repartoCierreInicio() {
  const enEscritorio = _enEscritorio();
  const movil   = document.getElementById('accesos-actividad-movil');
  const resumen = document.getElementById('panel-resumen');
  if (movil) movil.hidden = enEscritorio;
  if (resumen && enEscritorio) resumen.hidden = true;
}

/**
 * Filas del detalle por cuenta: teja del banco + nombre + saldo. Las comparten
 * el acordeón de móvil y la columna de escritorio, así que la máscara de
 * privacidad se decide en un solo sitio (PI4 del informe de Inicio).
 *
 * @param {import('../core/state.js').Cuenta[]} cuentas - activas.
 * @param {boolean} oculto - `S.config.ocultarSaldo`.
 * @returns {string} HTML de los `<li>`.
 */
function _filasCuentas(cuentas, oculto) {
  return cuentas.map(c => {
    // Cuentas viejas sin `banco` pero de efectivo caen a la teja Efectivo.
    const bancoId  = c.banco ?? (_esEfectivo(c) ? 'Efectivo' : undefined);
    const saldoTxt = oculto ? SALDO_MASCARA_CUENTA : f(c.saldo ?? 0);
    return `
      <li class="hero-inicio__cuenta">
        ${bancoAvatar(bancoId, c.icono)}
        <span class="hero-inicio__cuenta-nombre">${_esc(c.nombre ?? '')}</span>
        <span class="hero-inicio__cuenta-saldo">${saldoTxt}</span>
      </li>`;
  }).join('');
}

/**
 * ¿La cuenta es de efectivo? Por catálogo (`banco` → clase) y, defensivo,
 * por el tipo legacy cuando `banco` no existe en datos viejos.
 * @param {import('../core/state.js').Cuenta} c
 * @returns {boolean}
 */
function _esEfectivo(c) {
  if (c.banco) return bancoClase(c.banco) === 'efectivo';
  return /^efectivo$/i.test(c.tipo ?? '');
}

/**
 * Texto del conteo bajo el saldo (IN.8c): describe la composición real en
 * vez del "efectivo + cuentas bancarias" fijo de antes.
 * @param {import('../core/state.js').Cuenta[]} cuentas - activas.
 * @returns {string}
 */
function _descCuentas(cuentas) {
  const efectivo  = cuentas.filter(_esEfectivo).length;
  const bancarias = cuentas.length - efectivo;
  const txtBancarias = bancarias === 1 ? '1 cuenta bancaria' : `${bancarias} cuentas bancarias`;
  if (efectivo > 0 && bancarias > 0) return `efectivo + ${txtBancarias}`;
  if (bancarias > 0) return txtBancarias;
  return 'solo efectivo';
}

/**
 * Saludo dinámico del Inicio según la hora local (IN.6a, ADR 028 D3),
 * en dos líneas desde IN.8d (ADR 034 D8): franja horaria arriba
 * ("Buenas tardes,") y nombre abajo, junto al avatar de iniciales.
 * Usa `S.perfil.nombre` (ya existe desde el onboarding); sin nombre, la
 * franja saluda sola (sin coma) y nombre y avatar se ocultan.
 * Franjas: 5-11 días, 12-18 tardes, resto (19-23 y 0-4) noches.
 */
export function updSaludo() {
  const elFranja = document.getElementById('saludo-franja');
  const elNombre = document.getElementById('saludo-inicio');
  const avatar   = document.getElementById('perfil-avatar');
  if (!elFranja && !elNombre) return;

  const hora = new Date().getHours();
  const momento = hora >= 5 && hora < 12  ? 'Buenos días'
    :             hora >= 12 && hora < 19 ? 'Buenas tardes'
    :                                       'Buenas noches';

  const nombre = typeof S.perfil?.nombre === 'string' ? S.perfil.nombre.trim() : '';

  if (elFranja) elFranja.textContent = nombre ? `${momento},` : momento;
  if (elNombre) {
    elNombre.textContent = nombre;
    elNombre.hidden = !nombre;
  }
  if (avatar) {
    avatar.hidden = !nombre;
    avatar.textContent = nombre ? _iniciales(nombre) : '';
  }
}

/**
 * Iniciales para la teja de perfil (IN.8d): primera letra de las dos
 * primeras palabras del nombre, en mayúsculas ("Esteban" → "E",
 * "Juan Pérez" → "JP"). Spread para no partir caracteres de dos unidades.
 *
 * @param {string} nombre - ya validado no vacío.
 * @returns {string}
 */
function _iniciales(nombre) {
  return nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(p => [...p][0].toUpperCase())
    .join('');
}

// ── ORQUESTADOR ──────────────────────────────────────────────────

/**
 * Re-renderiza todo: métricas globales + todos los dominios registrados.
 * Se invoca tras cualquier mutación de S que afecte múltiples secciones.
 */
export function renderAll() {
  updSaldo();
  updSaludo();
  for (const fn of _renders) {
    try {
      fn();
    } catch (err) {
      console.error('[render] renderAll: un render de dominio falló:', err);
    }
  }
  // Después de los renders de dominio: _repartoCierreInicio() solo fuerza el
  // oculto del Resumen semanal en escritorio, nunca al revés, para no pisar
  // el oculto por falta de datos que ya aplicó resumen/view.js (registrado
  // arriba, en _renders).
  _repartoCierreInicio();
}

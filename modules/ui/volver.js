/**
 * volver.js - el "volver" de móvil: al lugar de donde viniste y a la altura
 * en que lo dejaste (ADR 098 D1 y D2).
 *
 * Lo que se comprobó en la auditoría móvil (MV2, hallazgos N1 y N2):
 * - Al volver con el gesto o el botón del sistema, la pantalla de origen
 *   arrancaba arriba: de un Gastos leído a 2500px se volvía a 0.
 * - Al entrar a una sección nueva se heredaba el scroll de la anterior: de un
 *   tope de Límites a Movimientos se aterrizaba a 900px, a mitad de lista.
 * - Movimientos decía "‹ Inicio" aunque se llegara desde Gastos o desde una
 *   cuenta: el volver estaba escrito a mano (TX.8b).
 *
 * Qué hace, sin tocar el router ni el modelo de hashes:
 * 1. Sella cada entrada del historial con un id propio (`history.state`).
 *    Una entrada sin sello es nueva: arranca arriba. Una con sello es un
 *    regreso: recupera su scroll.
 * 2. Si a la sección se llegó desde el contenido de otra (una tarjeta, un
 *    "Ver todo", un número), la entrada guarda de dónde. La sección pinta
 *    "‹ {origen}" y ese control hace `history.back()`, así que el regreso
 *    también recupera la altura. Si se llegó por la navegación principal
 *    (barra, menú Más, pestañas del bloque, chips de Ahorro) no hay origen:
 *    es un destino de primer nivel y la barra ya es la salida.
 * 3. Si la sección ya trae un volver propio que apunta al mismo origen (las
 *    hijas de Ahorro), no se agrega otro: el propio pasa a volver atrás.
 *
 * Solo móvil (< 1024px): en escritorio el scroll y los volver siguen como
 * estaban. El perfil niño no usa hashes, así que esto no lo toca.
 *
 * Escucha `click` en captura sobre document. No despacha acciones (eso es de
 * actions.js): solo anota de dónde salió el toque que va a navegar.
 */

import { registrarAccion } from './actions.js';

/** Nombre corto de cada sección, como lo dice la barra o el menú Más. */
export const NOMBRE_SECCION = {
  dash: 'Inicio',
  aprende: 'Aprende',
  progreso: 'Tu progreso',
  movimientos: 'Movimientos',
  gast: 'Gastos',
  compromisos: 'Por pagar',
  presupuesto: 'Límites',
  agenda: 'Calendario',
  personales: 'Me deben',
  tesoreria: 'Mis cuentas',
  ahorro: 'Ahorro',
  fondo: 'Fondo',
  metas: 'Metas',
  apartados: 'Reservas',
  inversion: 'Inversión',
  analisis: 'Análisis',
  config: 'Ajustes',
};

/**
 * Lo que es navegación principal: un toque acá no deja origen. Los volver
 * también, para que volver no se cuente como ir.
 */
export const RAIZ_NAVEGACION = [
  '#sidebar', '#modal-mas', '.bloque-tabs', '.bloque-chips', '.section__volver',
].join(', ');

/** Cuánto vale un toque como causa de la navegación que le sigue. */
const VENTANA_ORIGEN_MS = 1500;

const MQ_MOVIL = '(max-width: 1023px)';

/** id de entrada → scrollY. Vive lo que vive la pestaña. */
const _scrollPorEntrada = new Map();

/**
 * id de entrada → fila que estaba a la vista al salir ({ idDato, offset }).
 * El scrollY solo no alcanza: al volver, las listas se repintan y los días
 * fuera de pantalla miden lo que estima `content-visibility` (PERF.12), así
 * que la misma altura cae en otro gasto. La fila sí es la misma.
 */
const _anclaPorEntrada = new Map();

/** Momentos en que se reintenta la recuperación mientras la lista se pinta. */
const REINTENTOS_MS = [120, 300, 700];

let _secuencia = 0;
let _toque = null;          // { desde, t } del último toque en contenido
let _rafScroll = 0;
let _restauracion = 0;      // turno vigente; un toque del usuario lo cancela

// ── PURAS ────────────────────────────────────────────────────────

/**
 * Decide qué hacer con una llegada. Pura: recibe el estado de la entrada y el
 * último toque, así que se testea sin navegador.
 *
 * @param {object|null} estado `history.state` de la entrada a la que se llegó.
 * @param {{desde: string, t: number}|null} toque Último toque en contenido.
 * @param {string} hash Sección de llegada.
 * @param {number} ahora `performance.now()`.
 * @returns {{tipo: 'regreso'} | {tipo: 'nueva', origen: string|null}}
 */
export function clasificarLlegada(estado, toque, hash, ahora) {
  if (estado && estado.fkEntrada) return { tipo: 'regreso' };
  const vigente = toque && ahora - toque.t <= VENTANA_ORIGEN_MS;
  const origen = vigente && toque.desde !== hash && NOMBRE_SECCION[toque.desde]
    ? toque.desde
    : null;
  return { tipo: 'nueva', origen };
}

/**
 * HTML del volver contextual. Pura.
 *
 * @param {string} origen Hash de la sección de origen.
 * @returns {string}
 */
export function htmlVolverContexto(origen) {
  const nombre = NOMBRE_SECCION[origen] ?? 'Inicio';
  return `<a class="section__volver section__volver--contexto" href="#${origen}"
     data-action="volver-contexto" aria-label="Volver a ${nombre}">
    <svg class="icon" aria-hidden="true"><use href="#i-chevron-right"/></svg>${nombre}
  </a>`;
}

// ── DOM ──────────────────────────────────────────────────────────

function _esMovil() {
  return typeof window.matchMedia === 'function' && window.matchMedia(MQ_MOVIL).matches;
}

function _hashActual() {
  return location.hash.slice(1) || 'dash';
}

function _entradaActual() {
  return history.state?.fkEntrada ?? null;
}

/** Sella la entrada actual sin perder lo que otro haya guardado en ella. */
function _sellar(origen) {
  _secuencia += 1;
  const id = `e${Date.now().toString(36)}${_secuencia}`;
  history.replaceState({ ...(history.state ?? {}), fkEntrada: id, fkOrigen: origen }, '');
  return id;
}

/**
 * Pinta (o quita) el volver contextual de la sección activa según su entrada.
 * Si la sección trae un volver propio al mismo origen, ese pasa a volver
 * atrás en vez de duplicarse.
 */
function _pintarVolver() {
  document.querySelectorAll('.section__volver--contexto').forEach(el => el.remove());
  document.querySelectorAll('.section.tiene-volver-contexto')
    .forEach(el => el.classList.remove('tiene-volver-contexto'));
  document.querySelectorAll('.section__volver[data-volver-atras]')
    .forEach(el => el.removeAttribute('data-volver-atras'));

  const origen = history.state?.fkOrigen;
  if (!origen) return;
  const seccion = document.getElementById(`sec-${_hashActual()}`);
  if (!seccion) return;

  const propio = [...seccion.children]
    .find(el => el.matches(`.section__volver[href="#${origen}"]`));
  if (propio) {
    propio.setAttribute('data-volver-atras', '');
    return;
  }
  seccion.insertAdjacentHTML('afterbegin', htmlVolverContexto(origen));
  seccion.classList.add('tiene-volver-contexto');
}

/**
 * Salto sin animación. `reset.css` pone `scroll-behavior: smooth` en el
 * documento: sin `instant`, cambiar de sección se vería como un desplazamiento
 * largo por la pantalla nueva.
 *
 * @param {number} y
 */
function _saltar(y) {
  window.scrollTo({ top: y, left: 0, behavior: 'instant' });
}

/**
 * Anota qué fila estaba a la vista en la entrada actual, justo antes de
 * salir. `elementFromPoint` y no un recorrido de la lista: cuesta lo mismo con
 * 10 gastos que con 4000.
 */
function _anotarAncla() {
  const id = _entradaActual();
  if (!id) return;
  _scrollPorEntrada.set(id, window.scrollY);
  // Varias alturas: entre una fila y la siguiente puede caer el encabezado
  // de un día, que no es una fila.
  const x = Math.round(window.innerWidth / 2);
  for (const fy of [0.25, 0.35, 0.45, 0.55, 0.65]) {
    const el = document.elementFromPoint?.(x, Math.round(window.innerHeight * fy))
      ?.closest?.('.section.active [data-id]');
    if (el) {
      _anclaPorEntrada.set(id, { idDato: el.dataset.id, offset: el.getBoundingClientRect().top });
      return;
    }
  }
  _anclaPorEntrada.delete(id);
}

/**
 * Recupera la altura de una entrada: primero por su fila ancla, si existe;
 * si no, por el scrollY. El contenido puede pintarse unos cuadros después
 * (renderSmart), así que se reintenta un rato y se suelta en cuanto el
 * usuario toca la pantalla.
 *
 * @param {string} id
 */
function _restaurar(id) {
  const turno = ++_restauracion;
  const y = _scrollPorEntrada.get(id) ?? 0;
  const ancla = _anclaPorEntrada.get(id);
  const escapar = window.CSS?.escape ?? (v => v);

  const intento = () => {
    if (turno !== _restauracion) return;
    const el = ancla
      && document.querySelector(`.section.active [data-id="${escapar(ancla.idDato)}"]`);
    if (el) {
      const delta = el.getBoundingClientRect().top - ancla.offset;
      if (Math.abs(delta) > 2) _saltar(Math.max(0, window.scrollY + delta));
    } else if (Math.abs(window.scrollY - y) > 2) {
      _saltar(y);
    }
  };

  intento();
  if (y === 0 && !ancla) return;
  requestAnimationFrame(intento);
  for (const ms of REINTENTOS_MS) setTimeout(intento, ms);
}

function _alLlegar() {
  if (document.body.classList.contains('kid')) return;
  const llegada = clasificarLlegada(history.state, _toque, _hashActual(), performance.now());
  _toque = null;

  if (llegada.tipo === 'nueva') {
    _sellar(llegada.origen);
    if (_esMovil()) _saltar(0);
  } else if (_esMovil()) {
    _restaurar(_entradaActual());
  }
  _pintarVolver();
}

function _alHacerScroll() {
  if (_rafScroll) return;
  _rafScroll = requestAnimationFrame(() => {
    _rafScroll = 0;
    const id = _entradaActual();
    if (id) _scrollPorEntrada.set(id, window.scrollY);
  });
}

/** Anota el toque si sale del contenido; los de navegación principal no. */
function _alTocar(e) {
  const el = e.target?.closest?.('a[href^="#"], [data-action], [data-modal]');
  if (!el) return;
  if (_esMovil()) _anotarAncla();
  const atras = el.closest('.section__volver[data-volver-atras]');
  if (atras && _esMovil()) {
    e.preventDefault();
    history.back();
    return;
  }
  if (el.closest(RAIZ_NAVEGACION)) {
    _toque = null;
    return;
  }
  _toque = { desde: _hashActual(), t: performance.now() };
}

function _ajustarRestauracion() {
  if ('scrollRestoration' in history) {
    history.scrollRestoration = _esMovil() ? 'manual' : 'auto';
  }
}

// ── INIT ─────────────────────────────────────────────────────────

/**
 * Se llama una vez desde bootstrap.js, después de initRouter: su listener de
 * `hashchange` corre detrás del que muestra la sección.
 */
export function initVolver() {
  _ajustarRestauracion();
  window.matchMedia?.(MQ_MOVIL).addEventListener?.('change', _ajustarRestauracion);

  if (!_entradaActual()) _sellar(history.state?.fkOrigen ?? null);
  _pintarVolver();

  registrarAccion('volver-contexto', () => history.back());

  document.addEventListener('click', _alTocar, true);
  window.addEventListener('hashchange', _alLlegar);
  window.addEventListener('scroll', _alHacerScroll, { passive: true });
  // Si el usuario ya está moviendo la pantalla, la recuperación se suelta.
  const soltar = () => { _restauracion += 1; };
  for (const tipo of ['touchstart', 'wheel', 'keydown']) {
    window.addEventListener(tipo, soltar, { passive: true });
  }
}

/**
 * aprende/index.js - wiring de la capa Aprende (APR.1a, ADR 092).
 *
 * Dueño de dos superficies: la ruta (`#sec-aprende` → `#panel-aprende`) y la
 * lección a pantalla completa (`#modal-leccion`). La sesión de la lección es
 * estado de UI en memoria; lo único que se persiste es el avance para
 * retomar (`S.aprende.enCurso`) y la lección terminada (`S.aprende.hechas`).
 *
 * El contenido de cada unidad se carga con `import()` al abrir una lección
 * (D11): la ruta se pinta solo con los metadatos de logic.js.
 *
 * El niño usa este mismo motor con su ruta (APR.3c, ADR 093 D9): sus
 * lecciones `kN-lM` guardan el avance en su perfil, no en `S.aprende`, y
 * cierran con "Úsalo de verdad" en vez del Aplícalo.
 */

import { S, EventBus } from '../../core/state.js';
import { save } from '../../core/storage.js';
import { registrarAccion } from '../../ui/actions.js';
import { abrirModal, cerrarModal } from '../../ui/modales.js';
import { renderSmart, registrarRender, programarRender } from '../../infra/render.js';
import { announce } from '../../infra/a11y.js';
import { hoy } from '../../infra/utils.js';
import { topeHormiga, limiteHormiga } from '../../infra/hormiga.js';
import { navigate } from '../../infra/router.js';
import { perfilActivo, guardarAprendeNino, saldosFrascos } from '../../infra/perfiles.js';
import {
  unidadDeLeccion, metaLeccion, leccionDisponible, normalizarAprende,
  crearSesion, pasoActual, responderElegir, clasificarTarjeta, seguirClasificando,
  cambiarControl, moverItem, comprobarOrden, avanzar, pasoParaRetomar,
  registrarLeccionHecha, unidadTerminada, siguientePaso, registrarSemana,
  ofertaDeSeccion, OFERTAS_DE_SECCION,
  resultadoUbicacion, aplicarUbicacion,
} from './logic.js';
import { modeloAplica } from './aplica.js';
import { UVT, TOPES_RENTA_UVT, ANIO_VIGENTE } from '../../core/constants.js';
import { f } from '../../infra/utils.js';
import { renderRuta, htmlLeccion, htmlResultadoControl, htmlSiguientePaso, htmlOfertaLeccion } from './view.js';

/** Cargadores del contenido por unidad: un módulo por unidad, bajo demanda. */
const _CONTENIDO = {
  u1: () => import('./lecciones/u1.js'),
  u2: () => import('./lecciones/u2.js'),
  u3: () => import('./lecciones/u3.js'),
  u4: () => import('./lecciones/u4.js'),
  u5: () => import('./lecciones/u5.js'),
  u6: () => import('./lecciones/u6.js'),
  u7: () => import('./lecciones/u7.js'),
  u8: () => import('./lecciones/u8.js'),
  u9: () => import('./lecciones/u9.js'),
  // Ruta del niño (APR.3c): el contenido llega por unidad (APR.3f).
  k1: () => import('./lecciones/nino/k1.js'),
};

/** El progreso de quien usa Finko: el del niño activo o el del adulto. */
function _progreso() {
  return perfilActivo()?.aprende ?? S.aprende;
}

/** Guarda el progreso donde corresponde. Quien llama hace `save()`. */
function _guardarProgreso(aprende) {
  const nino = perfilActivo();
  if (nino) guardarAprendeNino(nino.id, aprende);
  else S.aprende = aprende;
}

/** La prueba de ubicación (D9): contenido aparte, se carga al abrirla. */
const _cargarUbicacion = () => import('./lecciones/ubicacion.js');

/** Distancia horizontal (px) que convierte un arrastre de tarjeta en respuesta. */
const _UMBRAL_DESLIZAR = 80;

/** Duración de `cardOut` (catálogo de animación, ADR 092 D10). */
const _MS_CARD_OUT = 220;

/** Estado de UI de la lección abierta. */
let _leccion = null;
let _sesion = null;
let _terminada = false;
/** Lo abierto es la prueba de ubicación y no una lección (D9). */
let _esUbicacion = false;
/** La lección que acaba de terminar completó su unidad por primera vez (insignia, D7). */
let _celebrarUnidad = false;
/** Se bloquea mientras una tarjeta sale animada, para no contar dos toques. */
let _animando = false;

const _overlay = () => document.getElementById('modal-leccion');
const _panel = () => document.getElementById('leccion-panel');
const _sinMovimiento = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * Valores legales del año para los marcadores de texto (ADN 12): la lección
 * los lee de `core/constants.js`, nunca los escribe a mano.
 */
const _VALORES_LEGALES = {
  uvt: f(UVT),
  exento4x1000: f(350 * UVT),
  topeRenta: f(TOPES_RENTA_UVT.ingresosBrutos * UVT),
  anio: String(ANIO_VIGENTE),
};

/** Tope hormiga vigente: el que el usuario configuró en Límites (APR.1b). */
function _tope() {
  return topeHormiga(S.config);
}

function _renderRuta() {
  renderRuta(_unidadAbierta);
}

/** "Tu siguiente paso" en Inicio (D5): una sola cosa, o nada. */
function _renderSiguientePaso() {
  const el = document.getElementById('panel-siguiente-paso');
  if (!el) return;
  const tope = _tope();
  const html = htmlSiguientePaso(siguientePaso({
    aprende: S.aprende, gastos: S.gastos, hoyISO: hoy(), tope, limite: limiteHormiga(S.config),
  }), tope);
  el.innerHTML = html;
  el.hidden = html === '';
}

/** Último dato que cada sección mandó al pintarse, para repintar su oferta sola. */
const _datosDeSeccion = {};

/**
 * Pinta la lección que ofrece una sección (D6) en uno de sus dos huecos:
 * bajo el bloque protagonista mientras no la hayas hecho, al pie como
 * "Repasar" después (R65). Los huecos y el dato los pone la sección dueña,
 * que avisa con `seccion:pintada`: ningún dominio importa al otro (ADN 10).
 */
function _pintarOferta(seccion) {
  const arriba = document.getElementById(`${seccion}-leccion`);
  const pie = document.getElementById(`${seccion}-leccion-pie`);
  if (!arriba && !pie) return;
  const oferta = ofertaDeSeccion(seccion, S.aprende);
  // Con el saldo oculto la fila no muestra cifras (las del fondo tampoco).
  const datos = S.config?.ocultarSaldo === true ? {} : _datosDeSeccion[seccion];
  const html = htmlOfertaLeccion(seccion, oferta, datos);
  const destino = oferta?.repasar ? pie : arriba;
  for (const el of [arriba, pie]) {
    if (!el) continue;
    el.innerHTML = el === destino ? html : '';
    el.hidden = el !== destino || html === '';
  }
}

function _renderTodo() {
  renderSmart(_renderRuta, 'aprende');
  renderSmart(_renderSiguientePaso, 'dash');
  for (const seccion of Object.keys(OFERTAS_DE_SECCION)) renderSmart(() => _pintarOferta(seccion), seccion);
}

/**
 * Registrar algo cuenta como semana activa (D3). Se guarda en el momento,
 * porque derivarla después de los registros la haría bajar al borrar uno.
 * Solo las secciones donde el usuario anota dinero; la propia `aprende` no,
 * para no reaccionar a sus propios guardados.
 */
const _SECCIONES_REGISTRO = new Set(['gastos', 'ingresosPuntuales', 'transferencias', 'compromisos', 'metas', 'apartados', 'ahorro']);
function _alRegistrar({ section } = {}) {
  if (!_SECCIONES_REGISTRO.has(section)) return;
  const antes = S.aprende;
  const despues = registrarSemana(antes, hoy());
  if (despues.semanas.length === normalizarAprende(antes).semanas.length) return;
  S.aprende = despues;
  save();
}

/** Contexto que la vista necesita además de la sesión. */
function _contexto(entrada) {
  if (_esUbicacion) {
    return {
      eyebrow: 'Prueba de ubicación', tope: _tope(), terminada: _terminada, entrada,
      valores: _VALORES_LEGALES, sinRepetir: true,
      ubicacion: _terminada ? resultadoUbicacion(_leccion, _sesion) : null,
    };
  }
  const unidad = unidadDeLeccion(_leccion.id);
  const meta = metaLeccion(_leccion.id);
  const nino = perfilActivo();
  const ctx = {
    eyebrow: `Unidad ${unidad.numero} · ${meta.titulo}`,
    tope: _tope(),
    terminada: _terminada,
    entrada,
    unidad,
    valores: _VALORES_LEGALES,
    nino: Boolean(nino),
  };
  if (_terminada && nino) {
    // "Úsalo de verdad" (D9): una pregunta sobre un frasco de su alcancía.
    const { hechas } = normalizarAprende(nino.aprende);
    ctx.avance = { hechas: unidad.lecciones.filter(l => hechas[l.id]).length, total: unidad.lecciones.length };
    const usalo = pasoActual(_sesion, _leccion)?.usalo;
    if (usalo) ctx.usalo = { frasco: usalo.frasco, saldo: saldosFrascos(nino)[usalo.frasco] ?? 0, pregunta: usalo.pregunta };
    ctx.celebrarUnidad = _celebrarUnidad;
  } else if (_terminada) {
    const { hechas } = normalizarAprende(S.aprende);
    ctx.avance = {
      hechas: unidad.lecciones.filter(l => hechas[l.id]).length,
      total: unidad.lecciones.length,
    };
    const paso = pasoActual(_sesion, _leccion);
    ctx.aplica = modeloAplica(paso?.calculo, {
      gastos: S.gastos, cuentas: S.cuentas, ingresos: S.ingresos, compromisos: S.compromisos,
      metas: S.metas, inversiones: S.inversiones, ahorro: S.ahorro,
      categoriasPersonalizadas: S.categoriasPersonalizadas,
      hoyISO: hoy(), tope: _tope(), limite: limiteHormiga(S.config), paso,
    });
    ctx.celebrarUnidad = _celebrarUnidad;
  }
  return ctx;
}

/**
 * Repinta el panel. `foco` dice qué recibe el foco después: el título del
 * paso (paso nuevo), el título del panel de retroalimentación (respuesta
 * revisada) o un selector puntual (el mismo botón que se tocó).
 */
function _pintar({ entrada = false, foco = 'titulo' } = {}) {
  const panel = _panel();
  if (!panel || !_sesion) return;
  const overlay = _overlay();
  overlay?.setAttribute('data-dom', unidadDeLeccion(_leccion.id)?.dominio ?? '');
  panel.innerHTML = htmlLeccion(_sesion, _leccion, _contexto(entrada));
  const destino = foco === 'titulo'
    ? panel.querySelector('#leccion-titulo')
    : foco === 'feedback'
      ? panel.querySelector('#leccion-fb-titulo')
      : panel.querySelector(foco);
  destino?.focus({ preventScroll: true });
}

/** Guarda en qué paso va la lección abierta, para retomarla (D7). */
function _guardarAvance() {
  // La prueba de ubicación es corta y no se retoma: salir la deja sin hacer.
  if (!_sesion || _terminada || _esUbicacion) return;
  const a = normalizarAprende(_progreso());
  _guardarProgreso({ ...a, enCurso: { id: _sesion.leccionId, paso: pasoParaRetomar(_sesion) } });
  save();
  EventBus.emit('state:change', { section: 'aprende' });
}

/** La lección llegó a su cierre: se registra una vez y se pinta el Aplícalo. */
function _terminar() {
  if (_esUbicacion) {
    _terminarUbicacion();
    return;
  }
  const { aprende, primeraVez } = registrarLeccionHecha(_progreso(), _sesion.leccionId, hoy());
  const unidad = unidadDeLeccion(_sesion.leccionId);
  _celebrarUnidad = primeraVez && unidadTerminada(unidad, aprende.hechas);
  _guardarProgreso(aprende);
  save();
  EventBus.emit('state:change', { section: 'aprende' });
  _terminada = true;
  _pintar({ entrada: true });
  announce(_celebrarUnidad
    ? `Terminaste la unidad ${unidad.numero}.`
    : primeraVez ? 'Lección lista.' : 'Lección repasada.');
}

/** La prueba terminó: marca lo que ya sabes y dice dónde empiezas (D9). */
function _terminarUbicacion() {
  const { sabidas, empieza } = resultadoUbicacion(_leccion, _sesion);
  S.aprende = aplicarUbicacion(S.aprende, sabidas, hoy());
  save();
  EventBus.emit('state:change', { section: 'aprende' });
  _terminada = true;
  _pintar({ entrada: true });
  announce(empieza ? `Empiezas en la unidad ${empieza.numero}.` : 'Prueba lista.');
}

/** Pone una lección, o la prueba de ubicación, en el overlay y lo abre. */
function _mostrar(leccion, desde, esUbicacion) {
  _leccion = leccion;
  _esUbicacion = esUbicacion;
  _terminada = false;
  _celebrarUnidad = false;
  _animando = false;
  _sesion = crearSesion(leccion, desde);
  _pintar({ entrada: true, foco: null });
  const overlay = _overlay();
  if (!overlay) return;
  abrirModal(overlay);
  _panel()?.querySelector('#leccion-titulo')?.focus({ preventScroll: true });
}

async function _abrirUbicacion() {
  const prueba = (await _cargarUbicacion())?.default;
  if (prueba) _mostrar(prueba, 0, true);
}

/** "Prefiero empezar desde la unidad 1" (D9): deshace lo que marcó la prueba. */
function _empezarDesdeUno() {
  S.aprende = { ...normalizarAprende(S.aprende), sabidas: [] };
  save();
  EventBus.emit('state:change', { section: 'aprende' });
  _salir();
  navigate('aprende');
}

async function _abrir(el) {
  const id = el?.dataset?.id;
  const meta = metaLeccion(id);
  const unidad = unidadDeLeccion(id);
  if (!leccionDisponible(meta) || !_CONTENIDO[unidad?.id]) return;
  const modulo = await _CONTENIDO[unidad.id]();
  const leccion = modulo?.default?.[id];
  if (!leccion) return;
  const { enCurso } = normalizarAprende(_progreso());
  _mostrar(leccion, enCurso?.id === id ? enCurso.paso : 0, false);
}

function _salir() {
  _guardarAvance();
  const overlay = _overlay();
  if (overlay) cerrarModal(overlay);
  _leccion = null;
  _sesion = null;
  _terminada = false;
  _esUbicacion = false;
  _renderTodo();
}

function _continuar() {
  if (!_sesion || _terminada) return;
  const { sesion, terminada } = avanzar(_sesion, _leccion);
  if (sesion === _sesion && !terminada) return;
  _sesion = sesion;
  if (terminada) {
    _terminar();
    return;
  }
  _guardarAvance();
  _pintar({ entrada: true });
}

function _elegir(el) {
  if (!_sesion) return;
  const antes = _sesion;
  _sesion = responderElegir(_sesion, _leccion, Number(el.dataset.idx));
  if (_sesion !== antes) _pintar({ foco: 'feedback' });
}

/** Clasifica la tarjeta de arriba; el acierto sale animado (`cardOut`). */
function _clasificar(esSi) {
  if (!_sesion || _animando) return;
  const antes = _sesion;
  const despues = clasificarTarjeta(_sesion, _leccion, esSi);
  if (despues === antes) return;
  _sesion = despues;
  const lado = esSi ? 'si' : 'no';
  if (despues.revision) {
    _pintar({ foco: 'feedback' });
    return;
  }
  announce('Así es.');
  const tarjeta = _panel()?.querySelector('[data-tarjeta]');
  const repintar = () => {
    _animando = false;
    const quedan = _sesion.tarjetas?.cola.length;
    _pintar({ foco: quedan ? `[data-lado="${lado}"]` : 'feedback' });
  };
  if (!tarjeta || _sinMovimiento()) {
    repintar();
    return;
  }
  _animando = true;
  tarjeta.style.transform = '';
  tarjeta.classList.add(`leccion-tarjeta--sale-${lado}`);
  setTimeout(repintar, _MS_CARD_OUT);
}

function _seguirClasificando() {
  if (!_sesion) return;
  _sesion = seguirClasificando(_sesion);
  _pintar({ foco: '[data-lado="si"]' });
}

/** Un chip de un paso "control": repinta y devuelve el foco al mismo chip. */
function _control(el) {
  if (!_sesion) return;
  const id = el.dataset.control;
  const valor = Number(el.dataset.valor);
  _sesion = cambiarControl(_sesion, _leccion, id, valor);
  _pintar({ foco: `[data-control="${id}"][data-valor="${valor}"]` });
}

/** El deslizador cambia en vivo solo su número y el resultado (D7). */
function _alMoverRango(e) {
  const input = e.target;
  if (!_sesion || !(input instanceof HTMLInputElement) || input.type !== 'range') return;
  const id = input.dataset.control;
  _sesion = cambiarControl(_sesion, _leccion, id, Number(input.value));
  const panel = _panel();
  const valor = panel?.querySelector(`[data-control-valor="${id}"]`);
  const control = pasoActual(_sesion, _leccion)?.controles?.find(c => c.id === id);
  if (valor) valor.textContent = `${_sesion.valores[id]}${control?.sufijo ?? ''}`;
  const resultado = panel?.querySelector('#leccion-resultado');
  const paso = pasoActual(_sesion, _leccion);
  if (resultado && paso) resultado.innerHTML = htmlResultadoControl(paso, _sesion.valores);
}

function _mover(el) {
  if (!_sesion) return;
  const indice = Number(el.dataset.idx);
  const dir = Number(el.dataset.dir) < 0 ? -1 : 1;
  _sesion = moverItem(_sesion, indice, dir);
  const destino = indice + dir;
  _pintar({ foco: `[data-action="leccion-mover"][data-idx="${destino}"][data-dir="${dir}"]` });
}

function _comprobar() {
  if (!_sesion) return;
  const antes = _sesion;
  _sesion = comprobarOrden(_sesion, _leccion);
  if (_sesion !== antes) _pintar({ foco: 'feedback' });
}

/**
 * "Poner un límite de $X" (Aplícalo de la unidad 3, R50): el dueño del límite
 * es Límites, así que se le pide por evento y se lleva al usuario allá, donde
 * lo ve puesto y lo ajusta.
 */
function _ponerLimiteHormiga(el) {
  const monto = Number(el?.dataset?.monto);
  if (!(monto > 0)) return;
  EventBus.emit('hormiga:limite', { monto });
  _salir();
  navigate('presupuesto');
}

/** Abre o cierra, en la ruta, las lecciones de una unidad que no es la actual. */
let _unidadAbierta = null;
function _alternarUnidad(el) {
  const id = el?.dataset?.id;
  _unidadAbierta = _unidadAbierta === id ? null : id;
  renderRuta(_unidadAbierta);
  document.querySelector(`[data-action="aprende-unidad"][data-id="${id}"]`)?.focus({ preventScroll: true });
}

// ── GESTO DE DESLIZAR (clasificar) ───────────────────────────────

let _arrastre = null;

function _alPresionar(e) {
  const tarjeta = e.target.closest?.('[data-tarjeta]');
  if (!tarjeta || _animando || _sesion?.revision) return;
  _arrastre = { x: e.clientX, tarjeta, id: e.pointerId };
  tarjeta.setPointerCapture?.(e.pointerId);
}

function _alArrastrar(e) {
  if (!_arrastre || e.pointerId !== _arrastre.id) return;
  const dx = e.clientX - _arrastre.x;
  _arrastre.tarjeta.style.transform = `translateX(${dx}px) rotate(${dx / 20}deg)`;
}

function _alSoltar(e) {
  if (!_arrastre || e.pointerId !== _arrastre.id) return;
  const dx = e.clientX - _arrastre.x;
  const { tarjeta } = _arrastre;
  _arrastre = null;
  if (Math.abs(dx) >= _UMBRAL_DESLIZAR) {
    _clasificar(dx > 0);
  } else {
    tarjeta.style.transform = '';
  }
}

// ── INIT ─────────────────────────────────────────────────────────

export function initAprende() {
  registrarAccion('leccion-abrir', _abrir);
  registrarAccion('leccion-salir', _salir);
  registrarAccion('leccion-continuar', _continuar);
  registrarAccion('leccion-elegir', _elegir);
  registrarAccion('leccion-clasificar', (el) => _clasificar(el.dataset.lado === 'si'));
  registrarAccion('leccion-seguir', _seguirClasificando);
  registrarAccion('leccion-control', _control);
  registrarAccion('leccion-mover', _mover);
  registrarAccion('leccion-comprobar', _comprobar);
  registrarAccion('leccion-limite-hormiga', _ponerLimiteHormiga);
  registrarAccion('aprende-unidad', _alternarUnidad);
  registrarAccion('ubicacion-abrir', _abrirUbicacion);
  // Cierre del niño: "Ver mi alcancía" o "Volver a la ruta" cierran la
  // lección y le piden la pantalla a su app (ADN 10: por evento).
  registrarAccion('leccion-salir-a', (el) => {
    _salir();
    EventBus.emit('nino:vista', { vista: el?.dataset?.vista ?? 'aprender' });
  });
  registrarAccion('ubicacion-inicio', () => { _salir(); navigate('dash'); });
  registrarAccion('ubicacion-desde-1', _empezarDesdeUno);
  // Los botones del Aplícalo usan acciones globales que ya existen:
  // `ir-a-seccion` (cierra el modal y navega) y `registrar-abrir` (cierra el
  // modal y dispara la acción que consigue el dato que falta, R57). Así la
  // lección no importa ningún dominio destino (ADN 10).

  const overlay = _overlay();
  if (overlay) {
    overlay.addEventListener('input', _alMoverRango);
    overlay.addEventListener('pointerdown', _alPresionar);
    overlay.addEventListener('pointermove', _alArrastrar);
    overlay.addEventListener('pointerup', _alSoltar);
    overlay.addEventListener('pointercancel', _alSoltar);
  }

  window.addEventListener('hashchange', _renderTodo);
  EventBus.on('state:change', (datos) => {
    _alRegistrar(datos);
    programarRender(_renderTodo);
  });
  // La sección que ofrece una lección se repinta entera y vacía sus huecos:
  // avisa al terminar y aquí se llenan en el mismo tick (D6).
  EventBus.on('seccion:pintada', ({ seccion, datos } = {}) => {
    if (typeof seccion !== 'string') return;
    _datosDeSeccion[seccion] = datos ?? {};
    _pintarOferta(seccion);
  });
  registrarRender(_renderTodo);
  _renderTodo();
}

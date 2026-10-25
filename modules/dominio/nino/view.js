/**
 * nino/view.js - lo que ve el niño (APR.3c, ADR 093 D9). Solo HTML.
 *
 * Cuatro pantallas con su barra: Inicio, Aprender, Alcancía y Yo. Voz del
 * niño (D6): frases de máximo 10 palabras y cifras redondas. Cada texto
 * lleva su ícono al lado y ningún color va solo (R49).
 */

import { f, esc } from '../../infra/utils.js';
import { icon, iconoCategoria } from '../../infra/icons.js';
import { htmlFrai, htmlDibujo, dibujoPorId, htmlFrasco } from '../../infra/ilustraciones.js';
import { saldosFrascos, FRASCOS } from '../../infra/perfiles.js';
import { UNIDADES_NINO } from '../../infra/ruta-aprende.js';
import { estadoRutaNino, siguienteLeccionNino, unidadesHechasNino } from './logic.js';

/** Barra de cuatro destinos (D9). */
const _BARRA = [
  { vista: 'inicio', texto: 'Inicio', icono: 'i-home' },
  { vista: 'aprender', texto: 'Aprender', icono: 'c-birrete' },
  { vista: 'alcancia', texto: 'Alcancía', icono: 'i-ahorro' },
  { vista: 'yo', texto: 'Yo', icono: 'i-star' },
];

/** Nombre e ícono de cada frasco (R49: nunca solo el color). */
export const FRASCO_INFO = {
  ahorrar: { nombre: 'Ahorrar', icono: 'i-ahorro' },
  gastar: { nombre: 'Gastar', icono: 'c-tienda' },
  compartir: { nombre: 'Compartir', icono: 'c-regalo' },
};

/** @param {string} vista */
export function htmlBarraNino(vista) {
  return _BARRA.map(b => `
    <button class="knav__it" type="button" data-action="nino-vista" data-vista="${b.vista}"${b.vista === vista ? ' aria-current="page"' : ''}>
      ${iconoCategoria(b.icono)}<span>${b.texto}</span>
    </button>`).join('');
}

/** El dibujo del niño en su teja, del color de su dibujo. */
function _avatar(perfil, tamano = 38) {
  const d = dibujoPorId(perfil.dibujo);
  return `<span class="kidav kidav--nino" style="--d: var(--fk-dom-${d?.dominio ?? 'ahorro'})">${htmlDibujo(perfil.dibujo, { tamano })}</span>`;
}

const _botonCambiar = `
  <button class="knino-cambiar" type="button" data-action="perfil-cambiar" aria-label="Cambiar de perfil">${icon('transferencia')}</button>`;

/** El título de la unidad con su número, para la ruta y el Inicio. */
function _chipUnidad(unidad, numeroLeccion) {
  return `<span class="kchip kchip--dom">Unidad ${unidad.numero} · lección ${numeroLeccion}</span>`;
}

/**
 * Inicio: el saludo de Frai y la lección que sigue (D9).
 * @param {import('../../infra/perfiles.js').PerfilNino} perfil
 */
export function htmlInicioNino(perfil) {
  const sig = siguienteLeccionNino(perfil.aprende);
  const leccion = sig ? `
    <section class="kcard kcard--dom" data-dom="${sig.unidad.dominio}" aria-labelledby="nino-siguiente">
      <div class="knino-fila">
        <span class="knino-teja">${iconoCategoria(sig.unidad.icono)}</span>
        <div class="knino-pila">
          ${_chipUnidad(sig.unidad, sig.numero)}
          <h2 class="k-h3" id="nino-siguiente">${esc(sig.leccion.titulo)}</h2>
        </div>
      </div>
      <button class="kbtn kbtn--block" type="button" data-action="leccion-abrir" data-id="${esc(sig.leccion.id)}">${iconoCategoria('c-birrete')}Empezar</button>
    </section>` : `
    <section class="kcard" aria-labelledby="nino-siguiente">
      <h2 class="k-h3" id="nino-siguiente">Hiciste todo lo que hay por ahora.</h2>
      <p class="k-body">Pronto llegan más lecciones.</p>
    </section>`;
  const saludo = sig ? `¿Aprendemos algo hoy? Son ${sig.leccion.minutos} minutos.` : '¡Qué bien vas! Repasa cuando quieras.';
  return `
    <header class="knino-cabeza">
      ${_avatar(perfil)}
      <h1 class="k-h1 knino-cabeza__hola" tabindex="-1">¡Hola, ${esc(perfil.nombre)}!</h1>
      ${_botonCambiar}
    </header>
    <div class="knino-fila">
      ${htmlFrai('saluda', { tamano: 96 })}
      <p class="bubble bubble--izq">${saludo}</p>
    </div>
    ${leccion}`;
}

/** Un nodo del camino: hecha (se repasa), la que sigue (Empezar) o después. */
function _nodo(l, unidad) {
  const titulo = esc(l.leccion.titulo);
  if (l.estado === 'hecha') {
    return `<button class="knode knode--hecha" type="button" data-action="leccion-abrir" data-id="${esc(l.leccion.id)}"
              aria-label="Lección ${l.numero}, ${titulo}, terminada. Repasar">${icon('check')}</button>`;
  }
  if (l.estado === 'actual') {
    return `<button class="knode knode--ahora" type="button" data-action="leccion-abrir" data-id="${esc(l.leccion.id)}"
              aria-label="Lección ${l.numero}: ${titulo}. Empezar">${iconoCategoria(unidad.icono)}<span class="knode__rotulo">Empezar</span></button>`;
  }
  return `<span class="knode knode--despues" role="img" aria-label="Lección ${l.numero}, ${titulo}, después">${iconoCategoria('c-birrete')}</span>`;
}

/**
 * Aprender: la ruta como camino, en orden (D9).
 * @param {import('../../infra/perfiles.js').PerfilNino} perfil
 */
export function htmlRutaNino(perfil) {
  const ruta = estadoRutaNino(perfil.aprende);
  const hechas = unidadesHechasNino(perfil.aprende);
  const filas = ruta.map(e => {
    const u = e.unidad;
    const cabeza = (rotulo, extra = '') => `
      <div class="kunit kunit--${e.estado}" data-dom="${u.dominio}">
        <span class="knino-teja">${iconoCategoria(u.icono)}</span>
        <span class="knino-pila"><span class="k-sm">${rotulo}</span><span class="k-h3">${esc(u.nombre)}</span></span>
        ${extra}
      </div>`;
    if (e.estado === 'hecha') {
      return `<li>${cabeza(`Unidad ${u.numero}`, `<span class="kchip kchip--hecha">${icon('check')}Lista</span>`)}</li>`;
    }
    if (e.estado === 'actual') {
      return `<li>${cabeza(`Unidad ${u.numero} · vas aquí`)}
        <ol class="kcamino" data-dom="${u.dominio}" aria-label="Lecciones de la unidad ${u.numero}">
          ${e.lecciones.map(l => `
            <li class="kcamino__paso kcamino__paso--${l.estado}">
              ${l.estado === 'actual' ? htmlFrai('explica', { tamano: 72 }) : ''}
              ${_nodo(l, u)}
            </li>`).join('')}
        </ol></li>`;
    }
    if (e.estado === 'preparacion') {
      return `<li>${cabeza(`Unidad ${u.numero} · muy pronto`)}</li>`;
    }
    return `<li>${cabeza(`Unidad ${u.numero} · después`)}</li>`;
  }).join('');
  return `
    <header class="knino-cabeza">
      <h1 class="k-h1 knino-titulo" tabindex="-1">${iconoCategoria('c-birrete')}Aprender</h1>
      <span class="kchip">${hechas} de ${UNIDADES_NINO.length} unidades</span>
    </header>
    <ol class="kruta">${filas}</ol>`;
}

/**
 * Alcancía: el total y los tres frascos (D9). Guardar, gastar, compartir,
 * la meta, la mesada y el premio llegan con APR.3d y APR.3e.
 * @param {import('../../infra/perfiles.js').PerfilNino} perfil
 */
export function htmlAlcanciaNino(perfil) {
  const s = saldosFrascos(perfil);
  const frascos = FRASCOS.map(fr => `
    <li class="jar" data-frasco="${fr}">
      ${htmlFrasco(fr, s.total > 0 ? s[fr] / s.total : 0)}
      <p class="jar__nombre">${iconoCategoria(FRASCO_INFO[fr].icono)}${FRASCO_INFO[fr].nombre}</p>
      <p class="jar__monto">${f(s[fr])}</p>
    </li>`).join('');
  return `
    <header class="knino-cabeza">
      <h1 class="k-h1 knino-titulo" tabindex="-1">${iconoCategoria('i-ahorro')}Mi alcancía</h1>
      <span class="k-h2 knino-total">${f(s.total)}</span>
    </header>
    <ul class="jars">${frascos}</ul>
    ${s.total === 0 ? `
    <div class="knino-fila">
      ${htmlFrai('explica', { tamano: 80 })}
      <p class="bubble bubble--izq">Cuando recibas dinero, aquí lo verás.</p>
    </div>` : ''}`;
}

/**
 * Yo: sus insignias y "Cambiar de perfil" (D9).
 * @param {import('../../infra/perfiles.js').PerfilNino} perfil
 */
export function htmlYoNino(perfil) {
  const ruta = estadoRutaNino(perfil.aprende);
  const insignias = ruta.map(e => e.estado === 'hecha' ? `
      <li class="kinsignia" data-dom="${e.unidad.dominio}">
        <svg class="kinsignia__dibujo" viewBox="0 0 120 120" aria-hidden="true"><use href="#il-insignia"/></svg>
        <span class="k-sm">${esc(e.unidad.nombre)}</span>
      </li>` : `
      <li class="kinsignia kinsignia--pendiente" aria-label="Unidad ${e.unidad.numero}, insignia por ganar">
        <span class="kinsignia__vacia" aria-hidden="true">${e.unidad.numero}</span>
        <span class="k-sm">Unidad ${e.unidad.numero}</span>
      </li>`).join('');
  return `
    <header class="knino-cabeza">
      ${_avatar(perfil, 48)}
      <div class="knino-pila">
        <h1 class="k-h1" tabindex="-1">${esc(perfil.nombre)}</h1>
        <p class="k-sm">${perfil.edad} años</p>
      </div>
    </header>
    <section class="kcard" aria-labelledby="nino-insignias">
      <h2 class="k-h3" id="nino-insignias">${icon('star')}Mis insignias</h2>
      <ul class="kinsignias">${insignias}</ul>
    </section>
    <button class="kbtn kbtn--soft kbtn--block" type="button" data-action="perfil-cambiar">${icon('transferencia')}Cambiar de perfil</button>`;
}

/**
 * onboarding-nino.js - el camino del niño en la primera visita (APR.6a,
 * [ADR 100](../../docs/DECISIONS/100-el-nino-empieza-solo.md) D2 a D4).
 *
 * Un niño que descarga Finko solo llega a su app en tres pantallas, una
 * decisión en cada una, en su voz (ADR 093 D6):
 * 1. Cómo te llamas y cuántos años tienes (7 a 12).
 * 2. Tu dibujo (el catálogo de Familia, sin fotos).
 * 3. Antes de empezar: "Un adulto de mi familia sabe que uso Finko" (D3).
 *
 * Ni PIN, ni correo, ni cuenta. El teléfono queda como teléfono propio del
 * niño (`S.config.dispositivoNino`, el modo de NUBE.3): entra directo a su
 * perfil y no ofrece "Cambiar de perfil". Todo se queda en el teléfono.
 *
 * Vive dentro del mismo overlay del onboarding (`#onboarding`): onboarding.js
 * le pasa sus formularios.
 */

import { S } from '../core/state.js';
import { save } from '../core/storage.js';
import { cerrarModal } from './modales.js';
import { announce } from '../infra/a11y.js';
import { esc, hoy } from '../infra/utils.js';
import { icon, iconoCategoria } from '../infra/icons.js';
import { DIBUJOS, htmlDibujo, htmlTino } from '../infra/ilustraciones.js';
import { crearNino, entrarComo, EDAD_MIN, EDAD_MAX, NOMBRE_MAX } from '../infra/perfiles.js';
import { mostrarErroresForm } from '../infra/form-errors.js';
import { registrarAvisoNino } from './aceptacion-legal.js';

/** Cómo nombra el perfil a su adulto cuando nadie lo nombró (ADR 100 D4). */
export const TE_NOMBRA_SIN_TUTOR = 'Tu familia';

/** Lo que el niño va eligiendo, en memoria hasta la tercera pantalla. */
let _datos = { nombre: '', edad: null, dibujo: '' };

// ── PURAS ────────────────────────────────────────────────────────

/**
 * Valida lo que el niño eligió, con su voz. Pura.
 *
 * @param {{ nombre?: unknown, edad?: unknown, dibujo?: unknown }} d
 * @param {'nombre' | 'dibujo'} paso qué pantalla se está validando
 * @returns {string[]}
 */
export function validarPasoNino(d, paso) {
  const errores = [];
  if (paso === 'nombre') {
    if (!String(d.nombre ?? '').trim()) errores.push('Escribe tu nombre.');
    const edad = Number(d.edad);
    if (!Number.isInteger(edad) || edad < EDAD_MIN || edad > EDAD_MAX) errores.push('Elige cuántos años tienes.');
  } else if (!DIBUJOS.some(x => x.id === d.dibujo)) {
    errores.push('Elige tu dibujo.');
  }
  return errores;
}

/**
 * Lo que cambia en el estado cuando el niño termina: su perfil, el teléfono
 * como suyo y el aviso legal del niño. Pura: devuelve las piezas, no toca S.
 *
 * @param {{ nombre: string, edad: number, dibujo: string }} d
 * @param {string} hoyISO
 * @param {string} id
 */
export function perfilNinoSolo(d, hoyISO, id) {
  return crearNino({ nombre: d.nombre, edad: d.edad, dibujo: d.dibujo, teNombra: TE_NOMBRA_SIN_TUTOR }, hoyISO, id);
}

/** Arriba de cada pantalla: "Volver" y en qué paso va, con puntos (ADR 124 D9). */
function _arriba(paso) {
  const puntos = [1, 2, 3].map(n => `<i${n === paso ? ' class="is-ahora"' : n < paso ? ' class="is-on"' : ''}></i>`).join('');
  return `
      <div class="kprimera__arriba">
        <button type="button" class="knino-cambiar kprimera__volver onboarding__volver" data-action="onboarding-volver">${icon('arrow-left')}<span>Volver</span></button>
        <span class="kpasos" role="img" aria-label="Paso ${paso} de 3">${puntos}</span>
      </div>`;
}

/** Tino y lo que dice, que es el título de la pantalla. */
function _tino(pose, texto) {
  return `
      <div class="knino-fila knino-tino kprimera__tino">
        ${htmlTino(pose, { tamano: 96 })}
        <h2 class="bubble kprimera__globo" id="onboarding-nino-titulo" tabindex="-1">${texto}</h2>
      </div>`;
}

/** Pantalla 1: nombre y edad. */
export function htmlNinoNombre(d = _datos) {
  const edades = [];
  for (let e = EDAD_MIN; e <= EDAD_MAX; e++) {
    edades.push(`
          <label class="onboarding-edad"><input class="sr-only" type="radio" name="edad" value="${e}"${Number(d.edad) === e ? ' checked' : ''} /><span>${e}</span></label>`);
  }
  return `
    <form class="kform kprimera" id="form-onboarding-nino-nombre" novalidate>
      ${_arriba(1)}
      ${_tino('saluda', '¡Hola! Soy Tino. ¿Cómo te llamas?')}
      <div class="kfield">
        <label for="onboarding-nino-nombre" class="kfield__etiqueta">Tu nombre</label>
        <input id="onboarding-nino-nombre" name="nombre" class="kin-texto" type="text"
               value="${esc(d.nombre)}" maxlength="${NOMBRE_MAX}" autocomplete="given-name" />
      </div>
      <fieldset class="kfield onboarding-edades">
        <legend class="kfield__etiqueta">¿Cuántos años tienes?</legend>
        <div class="kedades">${edades.join('')}
        </div>
        <button type="button" class="kprimera__enlace" data-action="onboarding-adulto">Tengo 13 años o más</button>
      </fieldset>
      <div class="kprimera__pie">
        <button type="submit" class="kbtn kbtn--block">Siguiente</button>
      </div>
    </form>`;
}

/** Pantalla 2: su dibujo, del catálogo de Familia (ADR 093 D8). */
export function htmlNinoDibujo(d = _datos) {
  const opciones = DIBUJOS.map((x, i) => `
          <label class="familia-dibujo kdibujo kdibujo--propio" style="--d: var(--fk-dom-${x.dominio})"><input class="sr-only" type="radio" name="dibujo" value="${x.id}"${(d.dibujo ? d.dibujo === x.id : i === 0) ? ' checked' : ''} />${htmlDibujo(x.id, { tamano: 48 })}<span class="sr-only">${esc(x.nombre)}</span></label>`).join('');
  return `
    <form class="kform kprimera" id="form-onboarding-nino-dibujo" novalidate>
      ${_arriba(2)}
      ${_tino('explica', `Elige tu dibujo, ${esc(d.nombre)}. Así te reconoces.`)}
      <fieldset class="kfield">
        <legend class="sr-only">Tu dibujo</legend>
        <div class="kdibujos">${opciones}
        </div>
        <p class="kfield__ayuda">Aquí no usamos fotos tuyas. Así te cuidas.</p>
      </fieldset>
      <div class="kprimera__pie">
        <button type="submit" class="kbtn kbtn--block">Siguiente</button>
      </div>
    </form>`;
}

/** Pantalla 3: antes de empezar (D3). El botón es el aviso. */
export function htmlNinoAntes(_d = _datos) {
  return `
    <form class="kform kprimera" id="form-onboarding-nino-antes" novalidate>
      ${_arriba(3)}
      <div class="kprimera__antes">
        ${htmlTino('saluda', { tamano: 120 })}
        <h2 class="k-h1" id="onboarding-nino-titulo" tabindex="-1">Antes de empezar</h2>
        <p class="kprimera__linea">Finko es para aprender a cuidar tu dinero.</p>
        <p class="kprimera__linea kprimera__linea--fuerte">Úsalo con alguien de tu familia.</p>
      </div>
      <p class="kprimera__nota">${iconoCategoria('c-escudo')}<span>Todo se queda en este teléfono. No necesitas correo ni internet.</span></p>
      <div class="kprimera__pie">
        <button type="submit" class="kbtn kbtn--block">Un adulto de mi familia sabe que uso Finko</button>
        <p class="kprimera__legal">Para el adulto:
          <button type="button" class="kprimera__enlace kprimera__enlace--acento" data-action="abrir-legal" data-doc="terminos-y-condiciones">términos</button>
          y
          <button type="button" class="kprimera__enlace kprimera__enlace--acento" data-action="abrir-legal" data-doc="politica-de-privacidad">privacidad</button>
        </p>
      </div>
    </form>`;
}

// ── DOM ──────────────────────────────────────────────────────────

function _pintar(html) {
  const body = document.querySelector('#onboarding #onboarding-body');
  if (!body) return;
  // El camino del niño va con su piel (ADR 124 D9), como la primera pantalla.
  document.getElementById('onboarding')?.classList.add('kid-piel');
  body.innerHTML = html;
  body.querySelector('#onboarding-nino-titulo')?.focus({ preventScroll: true });
}

/** Empieza el camino del niño (desde "Soy niño o niña"). */
export function empezarCaminoNino() {
  _datos = { nombre: '', edad: null, dibujo: '' };
  _pintar(htmlNinoNombre());
}

function _terminar() {
  const perfil = perfilNinoSolo(_datos, hoy(), `n-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`);
  S.perfiles = [...(Array.isArray(S.perfiles) ? S.perfiles : []), perfil];
  if (!S.config || typeof S.config !== 'object') S.config = {};
  S.config.dispositivoNino = perfil.id;
  S.config.primerUsoISO = hoy();
  registrarAvisoNino();
  S.onboarded = true;
  save();

  // Como al arrancar un teléfono del niño (quien-usa.js): su piel, sin
  // "Cambiar de perfil". No se avisa `onboarding:completado`: lo escuchan
  // piezas del adulto (logros, instalar).
  const overlay = document.getElementById('onboarding');
  if (overlay) cerrarModal(overlay);
  document.body.classList.add('kid-propio');
  entrarComo(perfil.id);
  announce(`¡Hola, ${perfil.nombre}! Ya puedes empezar.`);
}

/**
 * Atiende los formularios del camino del niño. Devuelve true si el
 * formulario era suyo.
 *
 * @param {HTMLFormElement} form
 * @returns {boolean}
 */
export function manejarFormNino(form) {
  const datos = new FormData(form);
  if (form.id === 'form-onboarding-nino-nombre') {
    _datos.nombre = String(datos.get('nombre') ?? '').trim();
    _datos.edad = datos.get('edad') === null ? null : Number(datos.get('edad'));
    const errores = validarPasoNino(_datos, 'nombre');
    if (errores.length) mostrarErroresForm(form, errores, 'Falta un dato:');
    else _pintar(htmlNinoDibujo());
    return true;
  }
  if (form.id === 'form-onboarding-nino-dibujo') {
    _datos.dibujo = String(datos.get('dibujo') ?? '');
    const errores = validarPasoNino(_datos, 'dibujo');
    if (errores.length) mostrarErroresForm(form, errores, 'Falta un dato:');
    else _pintar(htmlNinoAntes());
    return true;
  }
  if (form.id === 'form-onboarding-nino-antes') {
    _terminar();
    return true;
  }
  return false;
}

/**
 * "Volver" dentro del camino del niño: una pantalla atrás. Devuelve false en
 * la primera, para que onboarding.js vuelva a "¿Quién va a usar Finko?".
 *
 * @param {HTMLElement} el
 * @returns {boolean}
 */
export function volverEnCaminoNino(el) {
  const id = el.closest('form')?.id;
  if (id === 'form-onboarding-nino-dibujo') { _pintar(htmlNinoNombre()); return true; }
  if (id === 'form-onboarding-nino-antes') { _pintar(htmlNinoDibujo()); return true; }
  return false;
}

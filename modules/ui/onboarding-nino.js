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
import { icon } from '../infra/icons.js';
import { DIBUJOS, htmlDibujo } from '../infra/ilustraciones.js';
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

const _volver = `<button type="button" class="btn btn-ghost btn-sm onboarding__volver" data-action="onboarding-volver">${icon('arrow-left')}Volver</button>`;

/** Pantalla 1: nombre y edad. */
export function htmlNinoNombre(d = _datos) {
  const edades = [];
  for (let e = EDAD_MIN; e <= EDAD_MAX; e++) {
    edades.push(`
          <label class="onboarding-edad"><input class="sr-only" type="radio" name="edad" value="${e}"${Number(d.edad) === e ? ' checked' : ''} /><span>${e}</span></label>`);
  }
  return `
    <form id="form-onboarding-nino-nombre" novalidate>
      ${_volver}
      <h2 class="onboarding__title" id="onboarding-nino-titulo" tabindex="-1">¡Hola! ¿Cómo te llamas?</h2>
      <div class="form-group">
        <label for="onboarding-nino-nombre" class="label">Tu nombre</label>
        <input id="onboarding-nino-nombre" name="nombre" class="input" type="text"
               value="${esc(d.nombre)}" maxlength="${NOMBRE_MAX}" autocomplete="given-name" />
      </div>
      <fieldset class="form-group onboarding-edades">
        <legend class="label">¿Cuántos años tienes?</legend>
        <div class="onboarding-edades__fila">${edades.join('')}
        </div>
      </fieldset>
      <p class="onboarding__note">
        <button type="button" class="btn btn-ghost btn-sm" data-action="onboarding-adulto">Tengo 13 años o más</button>
      </p>
      <div class="onboarding__footer">
        <button type="submit" class="btn btn-primary btn-lg">Siguiente</button>
      </div>
    </form>`;
}

/** Pantalla 2: su dibujo, del catálogo de Familia (ADR 093 D8). */
export function htmlNinoDibujo(d = _datos) {
  const opciones = DIBUJOS.map((x, i) => `
          <label class="familia-dibujo"><input class="sr-only" type="radio" name="dibujo" value="${x.id}"${(d.dibujo ? d.dibujo === x.id : i === 0) ? ' checked' : ''} />${htmlDibujo(x.id, { tamano: 48 })}<span>${esc(x.nombre)}</span></label>`).join('');
  return `
    <form id="form-onboarding-nino-dibujo" novalidate>
      ${_volver}
      <h2 class="onboarding__title" id="onboarding-nino-titulo" tabindex="-1">Elige tu dibujo, ${esc(d.nombre)}</h2>
      <fieldset class="form-group">
        <legend class="sr-only">Tu dibujo</legend>
        <div class="familia-dibujos">${opciones}
        </div>
      </fieldset>
      <div class="onboarding__footer">
        <button type="submit" class="btn btn-primary btn-lg">Siguiente</button>
      </div>
    </form>`;
}

/** Pantalla 3: antes de empezar (D3). El botón es el aviso. */
export function htmlNinoAntes(d = _datos) {
  return `
    <form id="form-onboarding-nino-antes" novalidate>
      ${_volver}
      <div class="onboarding-nino__dibujo" aria-hidden="true">${htmlDibujo(d.dibujo, { tamano: 72 })}</div>
      <h2 class="onboarding__title" id="onboarding-nino-titulo" tabindex="-1">Antes de empezar, ${esc(d.nombre)}</h2>
      <p class="onboarding__desc">Finko es para aprender a cuidar tu dinero. Úsalo con alguien de tu familia.</p>
      <div class="onboarding__footer">
        <button type="submit" class="btn btn-primary btn-lg">Un adulto de mi familia sabe que uso Finko</button>
      </div>
      <p class="onboarding__note">
        Para el adulto:
        <button type="button" class="onboarding__link" data-action="abrir-legal" data-doc="terminos-y-condiciones">Términos y condiciones</button>
        y
        <button type="button" class="onboarding__link" data-action="abrir-legal" data-doc="politica-de-privacidad">Política de privacidad</button>.
        Todo se guarda en este teléfono.
      </p>
    </form>`;
}

// ── DOM ──────────────────────────────────────────────────────────

function _pintar(html) {
  const body = document.querySelector('#onboarding #onboarding-body');
  if (!body) return;
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

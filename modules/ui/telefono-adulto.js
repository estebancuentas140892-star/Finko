/**
 * telefono-adulto.js - "Este teléfono es de un adulto" (APR.6b,
 * [ADR 100](../../docs/DECISIONS/100-el-nino-empieza-solo.md) D5).
 *
 * Un teléfono que empezó como del niño (APR.6a) no deja a nadie atrapado: un
 * enlace discreto en la pestaña "Yo" del niño, con confirmación, crea el
 * adulto. Dos pasos dentro del modal de bienvenida:
 * 1. Tu nombre y tu PIN, dos veces (el ADR 093 D1 exige candado con niños).
 * 2. La aceptación completa de los documentos (LEG.2): la del niño era solo
 *    un aviso (`via: 'nino'`).
 *
 * Nada se guarda hasta el final. Entonces el teléfono deja de ser del niño,
 * el adulto entra (acaba de crear su PIN) y el niño queda como su perfil, con
 * todo lo suyo. Al volver a abrir, "¿Quién usa Finko?".
 *
 * No se ofrece en un teléfono del niño unido a la nube de su familia (NUBE.3):
 * ahí el adulto ya existe, en su propio teléfono, y lo maneja desde Familia.
 */

import { S, EventBus } from '../core/state.js';
import { save } from '../core/storage.js';
import { abrirModal, cerrarModal } from './modales.js';
import { registrarAccion } from './actions.js';
import { confirmar } from './confirm.js';
import { announce } from '../infra/a11y.js';
import { renderAll } from '../infra/render.js';
import { esc } from '../infra/utils.js';
import { icon } from '../infra/icons.js';
import { mostrarErroresForm } from '../infra/form-errors.js';
import { leerVinculo } from '../infra/nube.js';
import { perfilActivo, entrarComo, NOMBRE_MAX } from '../infra/perfiles.js';
import { validarPin, crearBloqueo, limpiarFallos, PIN_LARGO_MIN, PIN_LARGO_MAX } from '../dominio/config/bloqueo.js';
import { renderBloqueAceptacion, registrarAceptacion } from './aceptacion-legal.js';

/** Nombre y PIN del paso 1, en memoria hasta que el paso 2 los guarda. */
let _pendiente = null;

// ── PURAS ────────────────────────────────────────────────────────

/**
 * Se ofrece solo en un teléfono propio del niño que no está unido a la nube
 * de su familia.
 *
 * @param {object} config `S.config`
 * @param {object | null} vinculo `leerVinculo()`
 * @returns {boolean}
 */
export function ofrecerTelefonoAdulto(config, vinculo) {
  return Boolean(config?.dispositivoNino) && !vinculo;
}

/**
 * Valida el nombre y los dos PIN del paso 1.
 *
 * @param {{ nombre?: unknown, pin?: unknown, pin2?: unknown }} d
 * @returns {string[]}
 */
export function validarDatosAdulto(d) {
  const errores = [];
  if (!String(d.nombre ?? '').trim()) errores.push('Escribe tu nombre.');
  const errorPin = validarPin(d.pin);
  if (errorPin) errores.push(errorPin);
  else if (String(d.pin) !== String(d.pin2 ?? '')) errores.push('Los dos PIN no coinciden.');
  return errores;
}

/** Paso 1: tu nombre y tu PIN. */
export function htmlDatosAdulto(nino, nombre = '') {
  return `
    <form id="form-telefono-adulto" novalidate>
      <button type="button" class="btn btn-ghost btn-sm onboarding__volver" data-action="telefono-adulto-cancelar">${icon('arrow-left')}Volver</button>
      <h2 class="onboarding__title" id="telefono-adulto-titulo" tabindex="-1">Tu perfil en este teléfono</h2>
      <p class="onboarding__desc">${esc(nino)} sigue con todo lo suyo. Para entrar a tu parte, Finko te pedirá este PIN.</p>
      <div class="form-group">
        <label for="telefono-adulto-nombre" class="label">Tu nombre</label>
        <input id="telefono-adulto-nombre" name="nombre" class="input" type="text"
               value="${esc(nombre)}" maxlength="${NOMBRE_MAX}" autocomplete="given-name" />
      </div>
      <div class="form-group">
        <label for="telefono-adulto-pin" class="label">Tu PIN nuevo</label>
        <input id="telefono-adulto-pin" name="pin" class="input" type="password" inputmode="numeric"
               autocomplete="new-password" maxlength="${PIN_LARGO_MAX}" placeholder="${PIN_LARGO_MIN} a ${PIN_LARGO_MAX} números" />
      </div>
      <div class="form-group">
        <label for="telefono-adulto-pin2" class="label">Repite el PIN</label>
        <input id="telefono-adulto-pin2" name="pin2" class="input" type="password" inputmode="numeric"
               autocomplete="new-password" maxlength="${PIN_LARGO_MAX}" placeholder="Otra vez" />
        <p class="form-hint">No cifra tus datos: tapa la pantalla, nada más. Si lo olvidas, la única salida es borrar todo, también lo de ${esc(nino)}.</p>
      </div>
      <div class="onboarding__footer">
        <button type="submit" class="btn btn-primary btn-lg">Siguiente</button>
      </div>
    </form>`;
}

/** Paso 2: la aceptación de verdad (LEG.2), con el bloque de siempre. */
export function htmlLegalAdulto(nombre) {
  return `
    <form id="form-telefono-adulto-legal" novalidate>
      <button type="button" class="btn btn-ghost btn-sm onboarding__volver" data-action="telefono-adulto-atras">${icon('arrow-left')}Volver</button>
      <h2 class="onboarding__title" id="telefono-adulto-titulo" tabindex="-1">Un último paso, ${esc(nombre)}</h2>
      <p class="onboarding__desc">Revisa y acepta estos documentos.</p>
      ${renderBloqueAceptacion()}
      <div class="onboarding__footer">
        <button type="submit" class="btn btn-primary btn-lg">Entrar a Finko</button>
      </div>
    </form>`;
}

// ── DOM ──────────────────────────────────────────────────────────

const _overlay = () => document.getElementById('onboarding');

function _pintar(html) {
  const body = _overlay()?.querySelector('#onboarding-body');
  if (!body) return;
  body.innerHTML = html;
  body.querySelector('#telefono-adulto-titulo')?.focus({ preventScroll: true });
}

function _cerrar() {
  const overlay = _overlay();
  if (overlay && 'open' in overlay.dataset) cerrarModal(overlay);
  _pendiente = null;
}

async function _empezar() {
  if (!ofrecerTelefonoAdulto(S.config, leerVinculo())) return;
  const nino = perfilActivo()?.nombre ?? 'El niño';
  const ok = await confirmar({
    titulo: 'Este teléfono es de un adulto',
    mensaje: `Vas a crear el perfil de un adulto, con su PIN. ${nino} sigue con todo lo suyo, y para volver a la parte del adulto se pedirá el PIN.`,
    confirmarTexto: 'Sí, soy un adulto',
  });
  if (!ok) return;
  _pendiente = null;
  const overlay = _overlay();
  if (!overlay) return;
  _pintar(htmlDatosAdulto(nino));
  abrirModal(overlay);
}

function _enviarDatos(form) {
  const d = Object.fromEntries(new FormData(form));
  const errores = validarDatosAdulto(d);
  if (errores.length) {
    mostrarErroresForm(form, errores, 'Revisa lo que escribiste:');
    return;
  }
  _pendiente = { nombre: String(d.nombre).trim(), pin: String(d.pin) };
  _pintar(htmlLegalAdulto(_pendiente.nombre));
}

async function _enviarLegal(form) {
  if (!_pendiente) return;
  if (form.querySelector('[name="acepto"]')?.checked !== true) {
    mostrarErroresForm(form, ['Marca la casilla para confirmar que aceptas los documentos.'], 'Falta un paso:');
    return;
  }
  const { nombre, pin } = _pendiente;
  if (!S.config || typeof S.config !== 'object') S.config = {};
  S.config.bloqueo = await crearBloqueo(pin);
  limpiarFallos();
  S.perfil = { ...(S.perfil ?? {}), nombre };
  registrarAceptacion();
  delete S.config.dispositivoNino;
  save();
  EventBus.emit('state:change', { section: 'perfiles' });

  // Acaba de crear su PIN: entra al adulto como si lo hubiera escrito en
  // "¿Quién usa Finko?" (mismo `bloqueo:abierto` del candado).
  _cerrar();
  document.body.classList.remove('kid-propio');
  entrarComo(null);
  // El saludo y el resto del adulto se pintaron sin nombre: igual que al
  // terminar el onboarding.
  renderAll();
  announce(`Listo, ${nombre}. Entraste a tu perfil.`);
  EventBus.emit('bloqueo:abierto');
}

/** Se llama una vez desde bootstrap.js. */
export function initTelefonoAdulto() {
  // El enlace de la pestaña "Yo" solo se ve en un teléfono del niño sin
  // nube (nino.css); el teléfono unido a su familia lleva esta clase.
  document.body.classList.toggle('kid-vinculado', Boolean(leerVinculo()));

  registrarAccion('telefono-adulto', _empezar);
  registrarAccion('telefono-adulto-cancelar', _cerrar);
  registrarAccion('telefono-adulto-atras', () => {
    if (_pendiente) _pintar(htmlDatosAdulto(perfilActivo()?.nombre ?? 'El niño', _pendiente.nombre));
  });

  _overlay()?.addEventListener('submit', (e) => {
    const form = /** @type {HTMLFormElement} */ (e.target);
    if (form.id === 'form-telefono-adulto') { e.preventDefault(); _enviarDatos(form); }
    else if (form.id === 'form-telefono-adulto-legal') { e.preventDefault(); _enviarLegal(form); }
  });
}

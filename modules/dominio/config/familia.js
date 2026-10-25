/**
 * familia.js - acciones del bloque Familia de Ajustes (APR.3a, ADR 093 D1 y D2).
 *
 * Contrato:
 * - Agregar un niño exige el candado (D1): si el adulto no tiene PIN, el alta
 *   lo crea antes de guardar el perfil.
 * - Entrar como un niño es libre: el adulto ya está dentro.
 * - Eliminar un perfil pide confirmación y el PIN (como las acciones críticas
 *   de CFG.5b): se borran sus lecciones, su alcancía y sus metas.
 * - Vive en el dominio config porque crea el PIN con `bloqueo.js` sin importar
 *   otro dominio (ADN 10). Quién usa Finko ahora lo maneja `infra/perfiles.js`.
 */

import { S, EventBus } from '../../core/state.js';
import { save } from '../../core/storage.js';
import { registrarAccion } from '../../ui/actions.js';
import { abrirModal, cerrarModal } from '../../ui/modales.js';
import { confirmar } from '../../ui/confirm.js';
import { confirmarPin } from '../../ui/bloqueo-acceso.js';
import { mostrarToast } from '../../ui/toast.js';
import { mostrarErroresForm } from '../../infra/form-errors.js';
import { announce } from '../../infra/a11y.js';
import { hoy } from '../../infra/utils.js';
import { ninos, validarNino, crearNino, entrarComo } from '../../infra/perfiles.js';
import { candadoActivo, validarPin, crearBloqueo, limpiarFallos } from './bloqueo.js';
import { htmlAltaNino, htmlAltaPin } from './familia-view.js';

const _modal = () => document.getElementById('modal-familia');
const _cuerpo = () => document.getElementById('modal-familia-body');

/** Lo que el tutor ya escribió en el paso 1, mientras crea su PIN. */
let _pendiente = null;

/** Repinta el panel de Ajustes (lo pasa config/index.js). */
let _repintar = () => {};

/** Id nuevo para un niño. No es secreto: solo tiene que ser único. */
function _idNuevo() {
  return `n-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

function _pintar(html, foco) {
  const cuerpo = _cuerpo();
  if (!cuerpo) return;
  cuerpo.innerHTML = html;
  cuerpo.querySelector(foco)?.focus({ preventScroll: true });
}

/** Abre el alta del niño en su paso 1. */
export function abrirAlta() {
  const modal = _modal();
  if (!modal) return;
  _pendiente = null;
  _pintar(htmlAltaNino({ candado: candadoActivo(S.config?.bloqueo) }), '#familia-nombre');
  abrirModal(modal);
  document.getElementById('familia-nombre')?.focus({ preventScroll: true });
}

/** Guarda el niño ya validado y cierra el alta. */
function _guardarNino(datos) {
  const perfil = crearNino(datos, hoy(), _idNuevo());
  S.perfiles = [...(Array.isArray(S.perfiles) ? S.perfiles : []), perfil];
  save();
  _pendiente = null;
  const modal = _modal();
  if (modal) cerrarModal(modal);
  EventBus.emit('state:change', { section: 'perfiles' });
  _repintar();
  mostrarToast({
    titulo: `Listo: el perfil de ${perfil.nombre} está creado`,
    detalle: 'Con niños en el teléfono, Finko abre preguntando quién lo usa.',
  });
}

/** Paso 1: quién es el niño. Sin candado, el siguiente paso es crear el PIN. */
function _enviarDatos(form) {
  const crudo = Object.fromEntries(new FormData(form));
  const datos = {
    nombre: String(crudo.nombre ?? '').trim(),
    edad: crudo.edad === undefined ? '' : Number(crudo.edad),
    dibujo: String(crudo.dibujo ?? ''),
    teNombra: crudo.teNombra === 'otro' ? String(crudo.teNombraOtro ?? '').trim() : String(crudo.teNombra ?? ''),
  };
  const errores = validarNino(datos);
  if (errores.length) {
    mostrarErroresForm(form, errores);
    return;
  }
  if (candadoActivo(S.config?.bloqueo)) {
    _guardarNino(datos);
    return;
  }
  _pendiente = datos;
  _pintar(htmlAltaPin(datos.nombre), '#familia-pin');
}

/** Paso del PIN: lo crea y recién ahí guarda al niño. */
async function _enviarPin(form) {
  if (!_pendiente) return;
  const crudo = Object.fromEntries(new FormData(form));
  const pin = String(crudo.pin ?? '');
  const error = validarPin(pin);
  if (error) {
    mostrarErroresForm(form, [error], 'Revisa lo que escribiste:');
    return;
  }
  if (pin !== String(crudo.pin2 ?? '')) {
    mostrarErroresForm(form, ['Los dos PIN no coinciden.'], 'Revisa lo que escribiste:');
    return;
  }
  if (!S.config || typeof S.config !== 'object') S.config = {};
  S.config.bloqueo = await crearBloqueo(pin);
  limpiarFallos();
  _guardarNino(_pendiente);
}

/** @param {SubmitEvent} e */
function _onSubmit(e) {
  const form = /** @type {HTMLFormElement} */ (e.target);
  if (form.id === 'form-familia-nino') {
    e.preventDefault();
    _enviarDatos(form);
  } else if (form.id === 'form-familia-pin') {
    e.preventDefault();
    _enviarPin(form);
  }
}

/** De adulto a niño es libre (D1): la app cambia de piel, no de lugar. */
function _entrar(el) {
  const id = el?.dataset?.id;
  if (!ninos().some(p => p.id === id)) return;
  entrarComo(id);
}

async function _eliminar(el) {
  const perfil = ninos().find(p => p.id === el?.dataset?.id);
  if (!perfil) return;
  const ok = await confirmar({
    titulo: `Eliminar el perfil de ${perfil.nombre}`,
    mensaje: `Se borran sus lecciones, su alcancía y sus metas. Tus datos no se tocan. No se puede deshacer.`,
    confirmarTexto: 'Eliminar perfil',
    peligroso: true,
  });
  if (!ok) return;
  if (!(await confirmarPin({ titulo: 'Confirma tu PIN', mensaje: `Escribe tu PIN para eliminar el perfil de ${perfil.nombre}.` }))) return;
  S.perfiles = (Array.isArray(S.perfiles) ? S.perfiles : []).filter(p => p?.id !== perfil.id);
  save();
  EventBus.emit('state:change', { section: 'perfiles' });
  _repintar();
  announce(`Perfil de ${perfil.nombre} eliminado.`);
}

/**
 * @param {{ repintar: () => void }} opciones
 */
export function initFamilia({ repintar }) {
  _repintar = repintar;
  registrarAccion('familia-agregar', abrirAlta);
  registrarAccion('familia-entrar', _entrar);
  registrarAccion('familia-eliminar', _eliminar);
  _modal()?.addEventListener('submit', _onSubmit);
  // "Agregar un niño" desde "¿Quién usa Finko?": el adulto ya dio su PIN y
  // quedó en Ajustes; aquí se abre el alta.
  EventBus.on('familia:agregar', abrirAlta);
}

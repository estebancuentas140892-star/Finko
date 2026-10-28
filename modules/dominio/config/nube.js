/**
 * nube.js - la cuenta en la nube desde Ajustes (NUBE.1, ADR 096).
 *
 * Contrato:
 * - Entrar: correo invitado y autorización; Supabase manda un correo con
 *   enlace (y código, según la plantilla). Sin autorización no se pide nada.
 * - Al entrar se compara con la nube (`decidirAlEntrar`): sin respaldo, sube
 *   lo de este dispositivo; con respaldo y este dispositivo vacío, lo trae;
 *   con datos en los dos lados, la persona elige, y mientras tanto no se sube
 *   nada. Nunca se pisa un lado sin preguntar.
 * - Con sesión, cada guardado (`state:save`) agenda una subida a los 5 s.
 *   Sin red queda pendiente y se sube con el evento `online`.
 * - Traer de la nube reemplaza los datos de este dispositivo: pide
 *   confirmación y el PIN, como importar un respaldo. El PIN no viaja (D1).
 * - Borrar de la nube también cierra la sesión: si siguiera abierta, el
 *   siguiente guardado volvería a subir todo.
 */

import { S, EventBus } from '../../core/state.js';
import { save, restaurarBlob, SCHEMA_VERSION } from '../../core/storage.js';
import { registrarAccion } from '../../ui/actions.js';
import { confirmar } from '../../ui/confirm.js';
import { confirmarPin } from '../../ui/bloqueo-acceso.js';
import { mostrarToast } from '../../ui/toast.js';
import { announce } from '../../infra/a11y.js';
import {
  ErrorNube, leerSesion, guardarSesion, resultadoEnlace, pedirAcceso, entrarConCodigo, cerrarSesion,
  leerRespaldo, guardarRespaldo, borrarRespaldo, decidirAlEntrar, copiaParaNube, prepararRestauracion,
  nombreDispositivo,
} from '../../infra/nube.js';
import { MENSAJES_NUBE, haceCuanto } from './nube-view.js';

/** Espera tras un guardado antes de subir: agrupa una ráfaga de cambios. */
const _ESPERA_SUBIDA_MS = 5000;

const _RE_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Versión del texto de autorización que se acepta (docs/legal/nube/autorizaciones.md). */
export const VERSION_AUTORIZACION_NUBE = '0.2';

const _estado = {
  /** @type {'correo'|'codigo'} */ paso: 'correo',
  correo: '',
  autoriza: false,
  ocupado: false,
  error: '',
  ultimaSubida: '',
  pendiente: false,
  /** @type {{ actualizado: string, dispositivo?: string } | null} */ eleccion: null,
};

let _repintar = () => {};
let _timer = null;

/** Lo que pinta `htmlNube()`. */
export function estadoNube() {
  return { ..._estado, sesion: leerSesion() };
}

/** Cambia el estado y repinta el panel. */
function _set(cambios) {
  Object.assign(_estado, cambios);
  _repintar();
}

/**
 * Cambia el estado de la subida sin repintar el panel: una subida corre
 * sola cada pocos segundos y repintar borraría lo que la persona está
 * escribiendo en otro bloque de Ajustes.
 */
function _setSubida(cambios) {
  Object.assign(_estado, cambios);
  const linea = document.getElementById('nube-estado');
  if (!linea) return;
  linea.textContent = _estado.ocupado ? 'Guardando en la nube…'
    : _estado.error ? (MENSAJES_NUBE[_estado.error] ?? MENSAJES_NUBE.servidor)
    : _estado.pendiente ? 'Hay cambios por subir: se suben solos cuando haya conexión.'
    : _estado.ultimaSubida ? `Último respaldo en la nube: ${haceCuanto(_estado.ultimaSubida)}.`
    : 'Todavía no hay respaldo en la nube.';
}

const _codigo = (err) => (err instanceof ErrorNube ? err.codigo : 'servidor');

/** La sesión ya comparó con la nube: desde ahora se sube sola. */
function _marcarDecidido() {
  const s = leerSesion();
  if (s) guardarSesion({ ...s, porDecidir: false });
}

// ── ENTRAR ───────────────────────────────────────────────────────

/** @param {HTMLFormElement} form */
async function _enviarCorreo(form) {
  const correo = String(new FormData(form).get('correo') ?? '').trim();
  const autoriza = Boolean(form.querySelector('#nube-autoriza')?.checked);
  if (!_RE_CORREO.test(correo)) return _set({ error: 'correo', correo, autoriza });
  if (!autoriza) return _set({ error: 'autorizacion', correo, autoriza });
  _set({ ocupado: true, error: '', correo, autoriza });
  try {
    await pedirAcceso(correo);
    _set({ ocupado: false, paso: 'codigo' });
    announce(`Te enviamos un correo a ${correo}.`);
  } catch (err) {
    _set({ ocupado: false, error: _codigo(err) });
  }
}

/** @param {HTMLFormElement} form */
async function _entrarConCodigo(form) {
  const codigo = String(new FormData(form).get('codigo') ?? '').trim();
  if (!codigo) return _set({ error: 'codigo-invalido' });
  _set({ ocupado: true, error: '' });
  try {
    await entrarConCodigo(_estado.correo, codigo);
    _estado.paso = 'correo';
    await _alEntrar();
  } catch (err) {
    _set({ ocupado: false, error: _codigo(err) });
  }
}

/**
 * Deja constancia de la autorización en los datos (versión y fecha), que
 * viajan con el respaldo: es la prueba que el titular puede pedir.
 */
function _registrarAutorizacion() {
  S.config.autorizacionNube = { version: VERSION_AUTORIZACION_NUBE, fecha: new Date().toISOString() };
  save();
}

/** Recién entró: compara con la nube y decide qué hacer. */
async function _alEntrar() {
  const s = leerSesion();
  if (!s?.porDecidir) return;
  _set({ ocupado: true, error: '' });
  try {
    const respaldo = await leerRespaldo();
    const decision = decidirAlEntrar({ local: S, respaldo });
    if (decision === 'traer') {
      _marcarDecidido();
      _restaurar(respaldo);
      return;
    }
    if (decision === 'preguntar') {
      _set({ ocupado: false, eleccion: { actualizado: respaldo.actualizado, dispositivo: respaldo.dispositivo } });
      return;
    }
    _marcarDecidido();
    if (!S.config.autorizacionNube) _registrarAutorizacion();
    await _subir();
    _set({ ocupado: false });
    mostrarToast({ titulo: 'Tus datos quedaron en la nube', detalle: 'Cada cambio se guarda solo.' });
  } catch (err) {
    _set({ ocupado: false, error: _codigo(err) });
  }
}

// ── SUBIR Y TRAER ────────────────────────────────────────────────

/** Sube el estado completo (menos el PIN). Solo con la sesión ya decidida. */
async function _subir() {
  const s = leerSesion();
  if (!s || s.porDecidir) return;
  clearTimeout(_timer);
  _timer = null;
  _setSubida({ ocupado: true, error: '' });
  try {
    const fecha = await guardarRespaldo(copiaParaNube(S), SCHEMA_VERSION, nombreDispositivo());
    const actual = leerSesion();
    if (actual) guardarSesion({ ...actual, ultimaSubida: fecha });
    _setSubida({ ocupado: false, pendiente: false, ultimaSubida: fecha });
  } catch (err) {
    const codigo = _codigo(err);
    if (codigo === 'sesion-vencida') return _set({ ocupado: false, pendiente: false, error: codigo });
    _setSubida({ ocupado: false, pendiente: true, error: codigo === 'sin-red' ? '' : codigo });
  }
}

function _programarSubida() {
  const s = leerSesion();
  if (!s || s.porDecidir) return;
  _estado.pendiente = true;
  clearTimeout(_timer);
  _timer = setTimeout(_subir, _ESPERA_SUBIDA_MS);
}

/**
 * Reemplaza lo de este dispositivo por el respaldo de la nube y recarga.
 * @param {import('../../infra/nube.js').RespaldoNube} respaldo
 */
function _restaurar(respaldo) {
  clearTimeout(_timer);
  _timer = null;
  const datos = prepararRestauracion(respaldo.datos, S.config?.bloqueo);
  if (restaurarBlob(JSON.stringify(datos)) === 'ok') {
    announce('Datos traídos de la nube. Recargando…');
    setTimeout(() => location.reload(), 600);
    return;
  }
  _set({ ocupado: false, error: 'servidor' });
}

async function _traer() {
  const ok = await confirmar({
    titulo:         'Traer los datos de la nube',
    mensaje:        'Los datos de este dispositivo se reemplazan por los que están en la nube.',
    confirmarTexto: 'Traer de la nube',
    peligroso:      true,
  });
  if (!ok || !(await confirmarPin())) return;
  _set({ ocupado: true, error: '' });
  try {
    const respaldo = await leerRespaldo();
    if (!respaldo) return _set({ ocupado: false, error: 'sin-respaldo' });
    _marcarDecidido();
    _set({ eleccion: null });
    _restaurar(respaldo);
  } catch (err) {
    _set({ ocupado: false, error: _codigo(err) });
  }
}

async function _subirLocal() {
  const ok = await confirmar({
    titulo:         'Subir los datos de este dispositivo',
    mensaje:        'La copia de la nube se reemplaza por los datos de este dispositivo.',
    confirmarTexto: 'Subir estos datos',
    peligroso:      true,
  });
  if (!ok) return;
  _marcarDecidido();
  if (!S.config.autorizacionNube) _registrarAutorizacion();
  _set({ eleccion: null });
  await _subir();
  _set({});
}

async function _respaldarAhora() {
  await _subir();
  if (!_estado.error && !_estado.pendiente) announce('Respaldo guardado en la nube.');
}

// ── SALIR ────────────────────────────────────────────────────────

/** @param {boolean} todos */
async function _cerrar(todos) {
  clearTimeout(_timer);
  _timer = null;
  await cerrarSesion({ todos });
  _set({ paso: 'correo', eleccion: null, ultimaSubida: '', pendiente: false, error: '', ocupado: false });
  announce(todos ? 'Sesión cerrada en todos tus dispositivos.' : 'Sesión cerrada en este dispositivo.');
}

async function _borrar() {
  const ok = await confirmar({
    titulo:         'Borrar tu respaldo de la nube',
    mensaje:        'Se borra la copia en la nube y se cierra la sesión en este dispositivo. Lo que hay aquí no se toca.',
    confirmarTexto: 'Borrar de la nube',
    peligroso:      true,
  });
  if (!ok) return;
  _set({ ocupado: true, error: '' });
  try {
    await borrarRespaldo();
    await _cerrar(false);
    mostrarToast({ titulo: 'Borraste tu respaldo de la nube' });
  } catch (err) {
    _set({ ocupado: false, error: _codigo(err) });
  }
}

// ── INIT ─────────────────────────────────────────────────────────

/**
 * @param {{ repintar: () => void }} opciones
 */
export function initNube({ repintar }) {
  _repintar = repintar;
  registrarAccion('nube-otro-correo', () => _set({ paso: 'correo', error: '' }));
  registrarAccion('nube-respaldar',   _respaldarAhora);
  registrarAccion('nube-traer',       _traer);
  registrarAccion('nube-subir-local', _subirLocal);
  registrarAccion('nube-cerrar',      () => _cerrar(false));
  registrarAccion('nube-cerrar-todo', () => _cerrar(true));
  registrarAccion('nube-borrar',      _borrar);

  // Los dos formularios se repintan con el panel: delegación en el documento.
  document.addEventListener('submit', (e) => {
    const form = /** @type {HTMLFormElement} */ (e.target);
    if (form?.id === 'form-nube-correo') { e.preventDefault(); _enviarCorreo(form); }
    else if (form?.id === 'form-nube-codigo') { e.preventDefault(); _entrarConCodigo(form); }
  });

  EventBus.on('state:save', _programarSubida);
  window.addEventListener('online', () => { if (_estado.pendiente) _subir(); });

  const s = leerSesion();
  _estado.ultimaSubida = s?.ultimaSubida ?? '';
  if (resultadoEnlace() === 'error') _estado.error = 'enlace';
  if (s?.porDecidir) _alEntrar();
}

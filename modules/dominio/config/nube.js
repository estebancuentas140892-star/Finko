/**
 * nube.js - la cuenta en la nube desde Ajustes (NUBE.1, NUBE.2 y NUBE.2b,
 * ADR 096).
 *
 * Contrato:
 * - Entrar: correo invitado y autorización; Supabase manda un correo con
 *   enlace (y código, según la plantilla). Sin autorización no se pide nada.
 * - Al entrar se mira la nube (`decidirAlEntrar`): vacía, sube todo lo de
 *   este dispositivo; con datos y este dispositivo vacío, los trae; con
 *   datos en los dos lados, la persona elige, y mientras tanto no se
 *   sincroniza nada. Nunca se pisa un lado sin preguntar.
 * - Ya decidido, cada pasada (`_sincronizar`) marca lo que cambió aquí,
 *   baja lo que cambió en la nube, resuelve por registro (gana el cambio más
 *   reciente) y sube lo pendiente. Corre 3 s después de cada guardado, al
 *   volver a la app, al recuperar la red y cada minuto con la app a la vista.
 * - Traer de la nube reemplaza los datos de este dispositivo: pide
 *   confirmación y el PIN, como importar un respaldo. El PIN no viaja (D1).
 * - Borrar de la nube también cierra la sesión: si siguiera abierta, la
 *   siguiente pasada volvería a subir todo.
 * - Borrar la cuenta (NUBE.2b) pide escribir BORRAR y el PIN, borra el
 *   usuario y todo lo suyo en el servidor y deja la app sin cuenta. Los
 *   datos de este dispositivo no se tocan; la autorización de la nube sí se
 *   olvida, porque era para esa cuenta.
 * - Familia (NUBE.3): el padre, con su cuenta, genera en "Su teléfono" un
 *   código de un solo uso tras autorizar; el teléfono del niño lo canjea
 *   desde el onboarding por un token que solo abre lo suyo. Ese teléfono
 *   sincroniza solo su perfil y nunca escribe lo que fija el padre.
 */

import { S, EventBus } from '../../core/state.js';
import { save, restaurarBlob, SCHEMA_VERSION } from '../../core/storage.js';
import { registrarAccion } from '../../ui/actions.js';
import { confirmar } from '../../ui/confirm.js';
import { confirmarPin, PALABRA_BORRAR } from '../../ui/bloqueo-acceso.js';
import { mostrarToast } from '../../ui/toast.js';
import { announce } from '../../infra/a11y.js';
import { renderAll } from '../../infra/render.js';
import { hoy } from '../../infra/utils.js';
import { ninos } from '../../infra/perfiles.js';
import { abrirModal, cerrarModal } from '../../ui/modales.js';
import { volverAlInicio } from '../../ui/onboarding.js';
import {
  ErrorNube, leerSesion, guardarSesion, resultadoEnlace, pedirAcceso, entrarConCodigo, cerrarSesion,
  leerLibro, guardarLibro, olvidarLibro, hayRegistros, ultimoCambioNube, bajarRegistros, subirRegistros,
  borrarRegistros, borrarCuenta, decidirAlEntrar, nombreDispositivo, leerVinculo, guardarVinculo, olvidarVinculo,
  crearCodigoNino, canjearCodigoNino, ninoBajar, ninoSubir, vinculosNino, desvincularNino,
} from '../../infra/nube.js';
import {
  libroVacio, marcarCambios, aplicarRemotas, filasPendientes, confirmarSubidas, estadoDesdeNube,
  libroParaReemplazarNube, cursorConMargen, proyeccionNino, soloLecturaNino,
} from '../../infra/nube-sync.js';
import { MENSAJES_NUBE, haceCuanto, htmlVincularNino, htmlCodigoNino } from './nube-view.js';
import { VERSION_LEGAL } from './legal.js';

/** Espera tras un guardado antes de sincronizar: agrupa una ráfaga de cambios. */
const _ESPERA_MS = 3000;

/** Cada cuánto se mira la nube con la app a la vista. */
const _CADA_MS = 60000;

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
let _sincronizando = false;
let _otraVez = false;

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
 * Cambia el estado de la sincronización sin repintar el panel: corre sola
 * cada pocos segundos y repintar borraría lo que la persona está
 * escribiendo en otro bloque de Ajustes.
 */
function _setSync(cambios) {
  Object.assign(_estado, cambios);
  const linea = document.getElementById('nube-estado');
  if (!linea) return;
  linea.textContent = _estado.ocupado ? 'Sincronizando…'
    : _estado.error ? (MENSAJES_NUBE[_estado.error] ?? MENSAJES_NUBE.servidor)
    : _estado.pendiente ? 'Hay cambios por sincronizar: se suben solos cuando haya conexión.'
    : _estado.ultimaSubida ? `Sincronizado ${haceCuanto(_estado.ultimaSubida)}.`
    : 'Todavía no se ha sincronizado.';
}

const _codigo = (err) => (err instanceof ErrorNube ? err.codigo : 'servidor');

/** La sesión ya comparó con la nube: desde ahora sincroniza sola. */
function _marcarDecidido() {
  const s = leerSesion();
  if (s) guardarSesion({ ...s, porDecidir: false });
}

/**
 * Deja constancia de la autorización en los datos (versión y fecha), que
 * viajan a la nube: es la prueba que el titular puede pedir.
 */
function _registrarAutorizacion() {
  S.config.autorizacionNube = { version: VERSION_AUTORIZACION_NUBE, fecha: new Date().toISOString() };
  save();
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

/** Recién entró: mira la nube y decide qué hacer. */
async function _alEntrar() {
  if (!leerSesion()?.porDecidir) return;
  _set({ ocupado: true, error: '' });
  try {
    const decision = decidirAlEntrar({ local: S, hayEnNube: await hayRegistros() });
    if (decision === 'traer') {
      _marcarDecidido();
      await _traerTodo();
      return;
    }
    if (decision === 'preguntar') {
      const ultimo = await ultimoCambioNube();
      _set({ ocupado: false, eleccion: { actualizado: ultimo?.actualizado ?? '', dispositivo: ultimo?.dispositivo } });
      return;
    }
    _marcarDecidido();
    guardarLibro(libroVacio());
    if (!S.config.autorizacionNube) _registrarAutorizacion();
    _set({ ocupado: false });
    await _sincronizar();
    mostrarToast({ titulo: 'Tus datos quedaron en la nube', detalle: 'Cada cambio se sincroniza solo.' });
  } catch (err) {
    _set({ ocupado: false, error: _codigo(err) });
  }
}

// ── SINCRONIZAR ──────────────────────────────────────────────────

/**
 * Lleva a la pantalla lo que bajó de la nube: arreglos nuevos (la memoria
 * de `infra/memo.js` lo nota por referencia), guardado y repintado.
 * @param {Record<string, any>} parcial
 */
function _aplicarEnPantalla(parcial) {
  Object.assign(S, parcial);
  save();
  for (const section of Object.keys(parcial)) EventBus.emit('state:change', { section });
  renderAll();
}

/**
 * Lo bajado venía de una app con un schema más viejo: se guarda con esa
 * versión y se recarga, para que las migraciones (idempotentes, ADN 6)
 * completen lo que le falte.
 * @param {number} version
 */
function _remigrar(version) {
  if (restaurarBlob(JSON.stringify({ ...S, _version: version })) === 'ok') {
    announce('Llegaron datos de una versión anterior de Finko. Actualizando…');
    setTimeout(() => location.reload(), 600);
  }
}

/**
 * Cómo sincroniza este dispositivo: con la cuenta del adulto (todo su
 * estado), con el vínculo del teléfono de un niño (solo su perfil, sin
 * escribir lo que fija el padre) o nada.
 */
function _modo() {
  const v = leerVinculo();
  if (v) {
    return {
      nino: v,
      proyectar: () => proyeccionNino(S, v.ninoId),
      soloLectura: soloLecturaNino,
      bajar: (desde) => ninoBajar(v.token, desde),
      subir: (filas) => ninoSubir(v.token, filas.filter(f => !soloLecturaNino(`${f.coleccion}/${f.id}`))),
    };
  }
  const s = leerSesion();
  if (!s || s.porDecidir) return null;
  return { nino: null, proyectar: () => S, soloLectura: null, bajar: bajarRegistros, subir: subirRegistros };
}

/** Una pasada completa: marcar, bajar, resolver, subir. Una a la vez. */
async function _sincronizar() {
  const m = _modo();
  if (!m) return;
  if (_sincronizando) { _otraVez = true; return; }
  _sincronizando = true;
  clearTimeout(_timer);
  _timer = null;
  _setSync({ ocupado: true, error: '' });
  try {
    let libro = marcarCambios(m.proyectar(), leerLibro() ?? libroVacio(), Date.now(), { soloLectura: m.soloLectura });
    const remotas = await m.bajar(cursorConMargen(libro.cursor));
    const res = aplicarRemotas(m.proyectar(), libro, remotas, { version: SCHEMA_VERSION });
    libro = res.libro;
    guardarLibro(libro);
    if (res.aplicadas) _aplicarEnPantalla(res.parcial);

    const pendientes = filasPendientes(m.proyectar(), libro, { version: SCHEMA_VERSION, dispositivo: nombreDispositivo() })
      .filter(f => !m.soloLectura?.(`${f.coleccion}/${f.id}`));
    if (pendientes.length) {
      await m.subir(pendientes);
      guardarLibro(confirmarSubidas(leerLibro() ?? libro, pendientes));
    }
    const ahora = new Date().toISOString();
    const actual = leerSesion();
    if (actual) guardarSesion({ ...actual, ultimaSubida: ahora });
    _setSync({ ocupado: false, pendiente: false, ultimaSubida: ahora });
    if (res.deAppNueva) {
      mostrarToast({ titulo: 'Hay cambios de una versión más nueva de Finko', detalle: 'Recarga la app para verlos.', tono: 'alerta' });
    }
    if (res.versionMinima < SCHEMA_VERSION) _remigrar(res.versionMinima);
  } catch (err) {
    const codigo = _codigo(err);
    if (codigo === 'vinculo-invalido' && m.nino) _vinculoPerdido();
    else if (codigo === 'sesion-vencida') _set({ ocupado: false, pendiente: false, error: codigo });
    // La sesión se cerró o la cuenta se borró con la pasada en camino: su error no es de nadie.
    // El teléfono del niño nunca tiene sesión, así que el suyo sí cuenta.
    else if (!m.nino && !leerSesion()) _setSync({ ocupado: false, pendiente: false });
    else _setSync({ ocupado: false, pendiente: true, error: codigo === 'sin-red' ? '' : codigo });
  } finally {
    _sincronizando = false;
    if (_otraVez) { _otraVez = false; _programar(); }
  }
}

function _programar() {
  if (!_modo()) return;
  _estado.pendiente = true;
  clearTimeout(_timer);
  _timer = setTimeout(_sincronizar, _ESPERA_MS);
}

/** Reemplaza lo de este dispositivo por todo lo de la nube y recarga. */
async function _traerTodo() {
  clearTimeout(_timer);
  _timer = null;
  const filas = await bajarRegistros(null);
  const { estado, libro } = estadoDesdeNube(S, filas, SCHEMA_VERSION);
  guardarLibro(libro);
  if (restaurarBlob(JSON.stringify(estado)) === 'ok') {
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
  _set({ ocupado: true, error: '', eleccion: null });
  try {
    if (!(await hayRegistros())) return _set({ ocupado: false, error: 'sin-respaldo' });
    _marcarDecidido();
    await _traerTodo();
  } catch (err) {
    _set({ ocupado: false, error: _codigo(err) });
  }
}

async function _subirLocal() {
  const ok = await confirmar({
    titulo:         'Subir los datos de este dispositivo',
    mensaje:        'Lo que hay en la nube se reemplaza por los datos de este dispositivo, también en tus otros dispositivos.',
    confirmarTexto: 'Subir estos datos',
    peligroso:      true,
  });
  if (!ok) return;
  _set({ ocupado: true, error: '', eleccion: null });
  try {
    const nube = await bajarRegistros(null);
    guardarLibro(libroParaReemplazarNube(S, nube, Date.now()));
    _marcarDecidido();
    if (!S.config.autorizacionNube) _registrarAutorizacion();
    _set({ ocupado: false });
    await _sincronizar();
  } catch (err) {
    _set({ ocupado: false, error: _codigo(err) });
  }
}

async function _sincronizarAhora() {
  await _sincronizar();
  if (!_estado.error && !_estado.pendiente) announce('Sincronizado.');
}

// ── SALIR ────────────────────────────────────────────────────────

/** @param {boolean} todos */
async function _cerrar(todos) {
  clearTimeout(_timer);
  _timer = null;
  await cerrarSesion({ todos });
  olvidarLibro();
  _set({ paso: 'correo', eleccion: null, ultimaSubida: '', pendiente: false, error: '', ocupado: false });
  announce(todos ? 'Sesión cerrada en todos tus dispositivos.' : 'Sesión cerrada en este dispositivo.');
}

async function _borrar() {
  const ok = await confirmar({
    titulo:         'Borrar tus datos de la nube',
    mensaje:        'Se borra todo lo que hay en la nube y se cierra la sesión en este dispositivo. Lo que hay aquí no se toca; tus otros dispositivos dejan de sincronizar.',
    confirmarTexto: 'Borrar de la nube',
    peligroso:      true,
  });
  if (!ok) return;
  _set({ ocupado: true, error: '' });
  try {
    await borrarRegistros();
    await _cerrar(false);
    mostrarToast({ titulo: 'Borraste tus datos de la nube' });
  } catch (err) {
    _set({ ocupado: false, error: _codigo(err) });
  }
}

/**
 * Borra la cuenta completa (NUBE.2b). Los otros dispositivos se enteran
 * cuando su sesión vence: el servidor ya no la renueva.
 */
async function _borrarCuenta() {
  const ok = await confirmar({
    titulo:         'Borrar mi cuenta',
    mensaje:        'Se borra tu cuenta y la copia en la nube, también la de tus niños. Lo de este dispositivo se queda hasta que lo borres aquí. No se puede deshacer.',
    confirmarTexto: 'Borrar mi cuenta',
    peligroso:      true,
    palabra:        PALABRA_BORRAR,
  });
  if (!ok || !(await confirmarPin())) return;
  clearTimeout(_timer);
  _timer = null;
  _set({ ocupado: true, error: '' });
  try {
    await borrarCuenta();
  } catch (err) {
    return _set({ ocupado: false, error: _codigo(err) });
  }
  olvidarLibro();
  delete S.config.autorizacionNube;
  save();
  _set({ paso: 'correo', correo: '', autoriza: false, eleccion: null, ultimaSubida: '', pendiente: false, error: '', ocupado: false });
  mostrarToast({ titulo: 'Borraste tu cuenta', detalle: 'Tus datos siguen en este dispositivo.' });
}

// ── FAMILIA: EL TELÉFONO DEL NIÑO (NUBE.3) ───────────────────────

const _vinc = {
  ninoId: '',
  /** @type {'autorizar'|'codigo'} */ paso: 'autorizar',
  codigo: '',
  /** @type {any[]} */ vinculos: [],
  error: '',
  ocupado: false,
};

const _modalFamilia = () => document.getElementById('modal-familia');

/** Pinta el modal "Su teléfono" de Familia. */
function _pintarVinculo() {
  const nino = ninos().find(p => p.id === _vinc.ninoId);
  const modal = _modalFamilia();
  const cuerpo = document.getElementById('modal-familia-body');
  if (!nino || !modal || !cuerpo) return;
  const titulo = document.getElementById('modal-familia-title');
  if (titulo) titulo.textContent = `Su teléfono: ${nino.nombre}`;
  cuerpo.innerHTML = htmlVincularNino({
    nino, sesion: Boolean(leerSesion()), paso: _vinc.paso, codigo: _vinc.codigo,
    vinculos: _vinc.vinculos.filter(v => v.nino_id === nino.id), error: _vinc.error, ocupado: _vinc.ocupado,
  });
  if (!('open' in modal.dataset)) abrirModal(modal);
}

async function _abrirVinculo(el) {
  Object.assign(_vinc, { ninoId: el?.dataset?.id ?? '', paso: 'autorizar', codigo: '', vinculos: [], error: '', ocupado: false });
  _pintarVinculo();
  if (!leerSesion()) return;
  try {
    _vinc.vinculos = await vinculosNino();
    _pintarVinculo();
  } catch { /* sin la lista se puede igual generar el código */ }
}

/** @param {HTMLFormElement} form */
async function _generarCodigo(form) {
  const representante = form.querySelector('#nube-representante')?.checked;
  const escuchado = form.querySelector('#nube-escuchado')?.checked;
  if (!representante || !escuchado) { _vinc.error = 'autorizacion-nino'; return _pintarVinculo(); }
  Object.assign(_vinc, { ocupado: true, error: '' });
  _pintarVinculo();
  try {
    // El niño tiene que estar en la nube antes de pedir su código.
    await _sincronizar();
    _vinc.codigo = await crearCodigoNino(_vinc.ninoId, {
      version: VERSION_AUTORIZACION_NUBE, fecha: new Date().toISOString(), representante: true, escuchado: true,
    });
    Object.assign(_vinc, { paso: 'codigo', ocupado: false });
    announce('Código generado. Vence en 10 minutos.');
  } catch (err) {
    Object.assign(_vinc, { ocupado: false, error: _codigo(err) });
  }
  _pintarVinculo();
}

async function _desvincular(el) {
  const nino = ninos().find(p => p.id === el?.dataset?.id);
  if (!nino) return;
  const ok = await confirmar({
    titulo:         `Desvincular el teléfono de ${nino.nombre}`,
    mensaje:        'Su teléfono deja de sincronizar. Lo que anotó hasta ahora se queda en tu nube.',
    confirmarTexto: 'Desvincular',
    peligroso:      true,
  });
  if (!ok) return;
  try {
    await desvincularNino(nino.id);
    _vinc.vinculos = _vinc.vinculos.filter(v => v.nino_id !== nino.id);
    announce('Teléfono desvinculado.');
  } catch (err) {
    _vinc.error = _codigo(err);
  }
  _pintarVinculo();
}

// El teléfono del niño, desde el onboarding.

const _canje = { error: '', ocupado: false };

function _pintarCanje() {
  const cuerpo = document.querySelector('#onboarding #onboarding-body');
  if (!cuerpo) return;
  cuerpo.innerHTML = htmlCodigoNino(_canje);
  cuerpo.querySelector('#nube-codigo-nino')?.focus();
}

/** @param {HTMLFormElement} form */
async function _canjear(form) {
  const codigo = String(new FormData(form).get('codigo') ?? '').trim();
  if (!codigo) { _canje.error = 'codigo-vacio'; return _pintarCanje(); }
  Object.assign(_canje, { ocupado: true, error: '' });
  _pintarCanje();
  try {
    const vinculo = await canjearCodigoNino(codigo, nombreDispositivo());
    const filas = await ninoBajar(vinculo.token, null);
    // Un teléfono sin adulto: onboarding hecho, la aceptación la dio el padre
    // al autorizar, y el niño como dueño del dispositivo.
    const base = JSON.parse(JSON.stringify(S));
    base.onboarded = true;
    base.config = {
      ...(base.config ?? {}),
      dispositivoNino: vinculo.ninoId,
      legalAceptado: { version: VERSION_LEGAL, fecha: hoy() },
    };
    const { estado, libro } = estadoDesdeNube(base, filas, SCHEMA_VERSION);
    if (!estado.perfiles?.some(p => p.id === vinculo.ninoId)) throw new ErrorNube('nino-sin-sincronizar');
    guardarVinculo(vinculo);
    guardarLibro(libro);
    if (restaurarBlob(JSON.stringify(estado)) === 'ok') {
      announce('¡Listo! Entrando…');
      setTimeout(() => location.reload(), 400);
      return;
    }
    throw new ErrorNube('servidor');
  } catch (err) {
    Object.assign(_canje, { ocupado: false, error: _codigo(err) });
    _pintarCanje();
  }
}

/** El padre desvinculó este teléfono: deja de sincronizar y lo dice. */
function _vinculoPerdido() {
  olvidarVinculo();
  olvidarLibro();
  _setSync({ ocupado: false, pendiente: false, error: '' });
  mostrarToast({
    titulo: 'Este teléfono ya no se sincroniza',
    detalle: 'Lo que anotaste se queda aquí. Pide un código nuevo para volver a conectarte.',
    tono: 'alerta',
  });
}

// ── INIT ─────────────────────────────────────────────────────────

/**
 * @param {{ repintar: () => void }} opciones
 */
export function initNube({ repintar }) {
  _repintar = repintar;
  registrarAccion('nube-otro-correo',  () => _set({ paso: 'correo', error: '' }));
  registrarAccion('nube-sincronizar',  _sincronizarAhora);
  registrarAccion('nube-traer',        _traer);
  registrarAccion('nube-subir-local',  _subirLocal);
  registrarAccion('nube-cerrar',       () => _cerrar(false));
  registrarAccion('nube-cerrar-todo',  () => _cerrar(true));
  registrarAccion('nube-borrar',       _borrar);
  registrarAccion('nube-borrar-cuenta', _borrarCuenta);
  registrarAccion('nube-vincular-nino', _abrirVinculo);
  registrarAccion('nube-desvincular-nino', _desvincular);
  registrarAccion('nube-cerrar-modal', () => { const m = _modalFamilia(); if (m && 'open' in m.dataset) cerrarModal(m); });
  registrarAccion('nube-codigo-nino', () => { Object.assign(_canje, { error: '', ocupado: false }); _pintarCanje(); });
  registrarAccion('nube-codigo-nino-volver', volverAlInicio);

  // Los dos formularios se repintan con el panel: delegación en el documento.
  document.addEventListener('submit', (e) => {
    const form = /** @type {HTMLFormElement} */ (e.target);
    if (form?.id === 'form-nube-correo') { e.preventDefault(); _enviarCorreo(form); }
    else if (form?.id === 'form-nube-codigo') { e.preventDefault(); _entrarConCodigo(form); }
    else if (form?.id === 'form-nube-vincular') { e.preventDefault(); _generarCodigo(form); }
    else if (form?.id === 'form-nube-codigo-nino') { e.preventDefault(); _canjear(form); }
  });

  EventBus.on('state:save', _programar);
  window.addEventListener('online', () => _sincronizar());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') _sincronizar();
  });
  setInterval(() => {
    if (document.visibilityState === 'visible') _sincronizar();
  }, _CADA_MS);

  const s = leerSesion();
  _estado.ultimaSubida = s?.ultimaSubida ?? '';
  if (resultadoEnlace() === 'error') _estado.error = 'enlace';
  if (s?.porDecidir) _alEntrar();
  else if (s || leerVinculo()) _sincronizar();
}

/**
 * familia.js - acciones del bloque Familia de Ajustes (APR.3a y APR.3e,
 * ADR 093 D1 a D4).
 *
 * Contrato:
 * - Agregar un niño exige el candado (D1): si el adulto no tiene PIN, el alta
 *   lo crea antes de guardar el perfil. El paso 2 es la mesada.
 * - Entrar como un niño es libre: el adulto ya está dentro.
 * - Eliminar un perfil pide confirmación y el PIN (como las acciones críticas
 *   de CFG.5b): se borran sus lecciones, su alcancía y sus metas.
 * - "Entregada" es un solo hecho con dos consecuencias (091 R-HF1): un gasto
 *   del tutor en Familia y la entrada a los frascos del niño según su reparto.
 *   El gasto lo anota Gastos, su dueño, por `gasto:registrar` (ADN 10). Lo
 *   mismo el premio por ahorrar (D4). Finko no mueve dinero: lo anota (D3).
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
import { hoy, f } from '../../infra/utils.js';
import { ninos, validarNino, crearNino, entrarComo, actualizarNino } from '../../infra/perfiles.js';
import {
  repartoPorDefecto, validarMesada, mesadaPendiente, premioPendiente, proximoPremio, TASAS_PREMIO, TASA_POR_DEFECTO,
} from '../../infra/mesada.js';
import { candadoActivo, validarPin, crearBloqueo, limpiarFallos } from './bloqueo.js';
import {
  htmlAltaNino, htmlAltaPin, htmlMesada, htmlPremio, htmlProgresoNino, opcionesDia, fechaCorta,
} from './familia-view.js';

const _modal = () => document.getElementById('modal-familia');
const _cuerpo = () => document.getElementById('modal-familia-body');

/** Lo que el tutor ya escribió en el paso 1, mientras crea su PIN. */
let _pendiente = null;

/** El niño que se está editando (mesada, premio, progreso). */
let _idActual = null;

/** La mesada se fija como paso 2 del alta (y no desde el progreso). */
let _esAlta = false;

/** Repinta el panel de Ajustes (lo pasa config/index.js). */
let _repintar = () => {};

/** Id nuevo. No es secreto: solo tiene que ser único. */
function _idNuevo(prefijo = 'n') {
  return `${prefijo}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

const _nino = (id = _idActual) => ninos().find(p => p.id === id) ?? null;

/** Monto en pesos a partir de lo que escribe el tutor ("20.000" → 20000). */
const _monto = (texto) => Number(String(texto ?? '').replace(/\D/g, '')) || 0;

/** Pinta una pantalla del modal Familia con su título y abre el modal. */
function _pintar(titulo, html, foco) {
  const modal = _modal();
  const cuerpo = _cuerpo();
  if (!modal || !cuerpo) return;
  const t = document.getElementById('modal-familia-title');
  if (t) t.textContent = titulo;
  cuerpo.innerHTML = html;
  if (!('open' in modal.dataset)) abrirModal(modal);
  cuerpo.querySelector(foco)?.focus({ preventScroll: true });
}

function _cerrar() {
  const modal = _modal();
  if (modal && 'open' in modal.dataset) cerrarModal(modal);
}

/** Guarda un cambio del perfil de un niño. */
function _guardarNino(id, cambio) {
  actualizarNino(id, cambio);
  save();
  EventBus.emit('state:change', { section: 'perfiles' });
  _repintar();
}

// ── ALTA (D1, D2) ────────────────────────────────────────────────

/** Abre el alta del niño en su paso 1. */
export function abrirAlta() {
  _pendiente = null;
  _pintar('Agregar un niño', htmlAltaNino({ candado: candadoActivo(S.config?.bloqueo) }), '#familia-nombre');
}

/** Guarda el niño ya validado y sigue con su mesada (paso 2). */
function _guardarAlta(datos) {
  const perfil = crearNino(datos, hoy(), _idNuevo());
  S.perfiles = [...(Array.isArray(S.perfiles) ? S.perfiles : []), perfil];
  save();
  _pendiente = null;
  EventBus.emit('state:change', { section: 'perfiles' });
  _repintar();
  announce(`Perfil de ${perfil.nombre} creado.`);
  _idActual = perfil.id;
  _esAlta = true;
  _pintar(`Mesada de ${perfil.nombre}`, htmlMesada({ nombre: perfil.nombre, cuentas: S.cuentas, paso2: true }), '.familia-alta__titulo');
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
    _guardarAlta(datos);
    return;
  }
  _pendiente = datos;
  _pintar('Agregar un niño', htmlAltaPin(datos.nombre), '#familia-pin');
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
  _guardarAlta(_pendiente);
}

// ── MESADA (D2, D3) ──────────────────────────────────────────────

function _abrirMesada(el) {
  const p = _nino(el?.dataset?.id ?? _idActual);
  if (!p) return;
  _idActual = p.id;
  _esAlta = false;
  _pintar(`Mesada de ${p.nombre}`, htmlMesada({ nombre: p.nombre, mesada: p.mesada, cuentas: S.cuentas, paso2: false }), '.familia-alta__titulo');
}

function _enviarMesada(form) {
  const p = _nino();
  if (!p) return;
  const d = Object.fromEntries(new FormData(form));
  const mesada = {
    monto: _monto(d.monto),
    frecuencia: String(d.frecuencia ?? ''),
    dia: Number(d.dia),
    reparto: { ahorrar: _monto(d['reparto-ahorrar']), gastar: _monto(d['reparto-gastar']), compartir: _monto(d['reparto-compartir']) },
    puedeMover: d.puedeMover === 'on',
    anotarGasto: d.anotarGasto === 'on',
    cuentaId: d.cuentaId ? String(d.cuentaId) : null,
  };
  const errores = validarMesada(mesada);
  if (errores.length) {
    mostrarErroresForm(form, errores);
    return;
  }
  const anterior = p.mesada;
  _guardarNino(p.id, x => ({
    ...x,
    mesada: { ...mesada, desde: anterior?.desde ?? hoy(), entregas: Array.isArray(anterior?.entregas) ? anterior.entregas : [] },
  }));
  if (_esAlta) {
    _cerrar();
    mostrarToast({ titulo: `Listo: el perfil de ${p.nombre} está creado`, detalle: `Mesada de ${f(mesada.monto)}. Con niños en el teléfono, Finko abre preguntando quién lo usa.` });
    _esAlta = false;
    return;
  }
  // Dentro del progreso el resultado ya se ve en pantalla: un aviso encima
  // del modal solo taparía sus botones.
  announce(`Mesada guardada: ${f(mesada.monto)} para ${p.nombre}.`);
  _abrirProgreso({ dataset: { id: p.id } });
}

/** Al cambiar el monto, el reparto por defecto lo sigue mientras nadie lo toque. */
function _onInputMesada(e) {
  const t = /** @type {HTMLInputElement} */ (e.target);
  const form = t.closest?.('#form-familia-mesada');
  if (!form) return;
  if (t.name?.startsWith('reparto-')) {
    form.dataset.repartoEditado = '1';
  } else if (t.name === 'monto' && !form.dataset.repartoEditado) {
    const r = repartoPorDefecto(_monto(t.value));
    for (const k of ['ahorrar', 'gastar', 'compartir']) {
      const campo = /** @type {HTMLInputElement|null} */ (form.querySelector(`[name="reparto-${k}"]`));
      if (campo) campo.value = r[k].toLocaleString('es-CO');
    }
  } else if (t.name === 'frecuencia') {
    const sel = form.querySelector('[name="dia"]');
    if (sel) sel.innerHTML = opcionesDia(t.value, t.value === 'mensual' ? 1 : 6);
  } else if (t.name === 'tasa') {
    const p = _nino();
    const r = document.getElementById('familia-premio-resumen');
    if (p && r) {
      const prox = proximoPremio(p, hoy(), t.value);
      r.innerHTML = `Con lo que tiene en Ahorrar (${f(prox.ahorrado)}), el ${fechaCorta(prox.fechaISO)} le sumas <strong>${f(prox.monto)}</strong>.`;
    }
  }
}

/**
 * "Entregada" (D3): un solo hecho con dos consecuencias. Entran los frascos
 * del niño según su reparto y, si el tutor lo pidió, Gastos anota el gasto
 * en Familia. Solo la mesada que toca: no se entrega dos veces.
 */
function _entregada(el) {
  const p = _nino(el?.dataset?.id);
  const fecha = mesadaPendiente(p?.mesada, hoy());
  if (!p || !fecha) return;
  const entregaId = _idNuevo('e');
  const r = p.mesada.reparto ?? {};
  const movs = ['ahorrar', 'gastar', 'compartir']
    .filter(k => Number(r[k]) > 0)
    .map(k => ({ id: _idNuevo('m'), fecha: hoy(), frasco: k, monto: Number(r[k]), tipo: 'mesada', entrega: entregaId, nota: 'Mesada' }));
  _guardarNino(p.id, x => ({
    ...x,
    movimientos: [...x.movimientos, ...movs],
    mesada: { ...x.mesada, entregas: [...(x.mesada?.entregas ?? []), { id: entregaId, fecha, entregada: hoy() }] },
  }));
  if (p.mesada.anotarGasto && p.mesada.cuentaId) {
    EventBus.emit('gasto:registrar', {
      gasto: {
        monto: p.mesada.monto, categoria: 'Familia', fecha: hoy(), cuentaId: p.mesada.cuentaId,
        descripcion: `Mesada de ${p.nombre}`, origen: { tipo: 'mesada', perfilId: p.id, entregaId },
      },
    });
  }
  announce(`Mesada anotada: ${f(p.mesada.monto)} en los frascos de ${p.nombre}.`);
  _abrirProgreso({ dataset: { id: p.id } });
}

// ── PREMIO POR AHORRAR (D4) ──────────────────────────────────────

function _abrirPremio(el) {
  const p = _nino(el?.dataset?.id ?? _idActual);
  if (!p) return;
  _idActual = p.id;
  _pintar('Premio por ahorrar', htmlPremio(p, hoy()), '.familia-alta__titulo');
}

function _enviarPremio(form) {
  const p = _nino();
  if (!p) return;
  const tasa = String(new FormData(form).get('tasa') ?? TASA_POR_DEFECTO);
  if (!Object.hasOwn(TASAS_PREMIO, tasa)) return;
  _guardarNino(p.id, x => ({
    ...x,
    premio: { tasa, desde: x.premio?.desde ?? hoy(), pagados: Array.isArray(x.premio?.pagados) ? x.premio.pagados : [] },
  }));
  announce(`Premio activo: ${TASAS_PREMIO[tasa].texto} que ${p.nombre} tiene en Ahorrar.`);
  _abrirProgreso({ dataset: { id: p.id } });
}

async function _quitarPremio() {
  const p = _nino();
  if (!p?.premio) return;
  const ok = await confirmar({
    titulo: 'Quitar el premio por ahorrar',
    mensaje: `${p.nombre} deja de recibir el premio. Lo que ya recibió se queda en su alcancía.`,
    confirmarTexto: 'Quitar el premio',
  });
  if (!ok) return;
  _guardarNino(p.id, x => ({ ...x, premio: null }));
  _abrirProgreso({ dataset: { id: p.id } });
}

/** Suma el premio del mes pasado: entra a Ahorrar y Gastos anota el gasto. */
function _pagarPremio(el) {
  const p = _nino(el?.dataset?.id);
  const pend = premioPendiente(p, hoy());
  if (!p || !pend || pend.monto <= 0) return;
  const mov = { id: _idNuevo('m'), fecha: hoy(), frasco: 'ahorrar', monto: pend.monto, tipo: 'premio', nota: `Premio de ${pend.mes}` };
  _guardarNino(p.id, x => ({
    ...x,
    movimientos: [...x.movimientos, mov],
    premio: { ...x.premio, pagados: [...(x.premio?.pagados ?? []), pend.mes] },
  }));
  const cuentaId = p.mesada?.cuentaId;
  if (cuentaId) {
    EventBus.emit('gasto:registrar', {
      gasto: {
        monto: pend.monto, categoria: 'Familia', fecha: hoy(), cuentaId,
        descripcion: `Premio por ahorrar de ${p.nombre}`, origen: { tipo: 'premio', perfilId: p.id, mes: pend.mes },
      },
    });
  }
  announce(`Premio anotado: ${f(pend.monto)} en Ahorrar de ${p.nombre}.`);
  _abrirProgreso({ dataset: { id: p.id } });
}

// ── PROGRESO DEL NIÑO (D2) ───────────────────────────────────────

function _abrirProgreso(el) {
  const p = _nino(el?.dataset?.id);
  if (!p) return;
  _idActual = p.id;
  _pintar(`Progreso de ${p.nombre}`, htmlProgresoNino(p, hoy()), '.familia-alta__titulo');
}

// ── ENTRAR Y ELIMINAR ────────────────────────────────────────────

/** De adulto a niño es libre (D1): la app cambia de piel, no de lugar. */
function _entrar(el) {
  const id = el?.dataset?.id;
  if (!ninos().some(p => p.id === id)) return;
  _cerrar();
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

/** @param {SubmitEvent} e */
function _onSubmit(e) {
  const form = /** @type {HTMLFormElement} */ (e.target);
  const manejadores = {
    'form-familia-nino': _enviarDatos,
    'form-familia-pin': _enviarPin,
    'form-familia-mesada': _enviarMesada,
    'form-familia-premio': _enviarPremio,
  };
  const fn = manejadores[form.id];
  if (!fn) return;
  e.preventDefault();
  fn(form);
}

/**
 * @param {{ repintar: () => void }} opciones
 */
export function initFamilia({ repintar }) {
  _repintar = repintar;
  registrarAccion('familia-agregar', abrirAlta);
  registrarAccion('familia-entrar', _entrar);
  registrarAccion('familia-eliminar', _eliminar);
  registrarAccion('familia-progreso', _abrirProgreso);
  registrarAccion('familia-mesada', _abrirMesada);
  registrarAccion('familia-entregada', _entregada);
  registrarAccion('familia-premio', _abrirPremio);
  registrarAccion('familia-quitar-premio', _quitarPremio);
  registrarAccion('familia-pagar-premio', _pagarPremio);
  registrarAccion('familia-sin-mesada', () => {
    const p = _nino();
    _cerrar();
    _esAlta = false;
    if (p) mostrarToast({ titulo: `Listo: el perfil de ${p.nombre} está creado`, detalle: 'Puedes fijar su mesada cuando quieras, desde su progreso.' });
  });
  const modal = _modal();
  modal?.addEventListener('submit', _onSubmit);
  modal?.addEventListener('input', _onInputMesada);
  modal?.addEventListener('change', _onInputMesada);
  // "Agregar un niño" desde "¿Quién usa Finko?": el adulto ya dio su PIN y
  // quedó en Ajustes; aquí se abre el alta.
  EventBus.on('familia:agregar', abrirAlta);
}

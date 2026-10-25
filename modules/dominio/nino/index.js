/**
 * nino/index.js - la app del niño (APR.3c y APR.3d, ADR 093 D9).
 *
 * Pinta `#nino-main` y su barra `#nino-nav` cuando Finko entra al perfil de
 * un niño, y los vacía al volver al adulto: el niño nunca ve nada del adulto
 * y lo suyo no queda en el DOM del adulto. Quién está activo lo dice
 * `infra/perfiles.js`; el cambio de piel lo hace `ui/quien-usa.js`; la
 * lección la abre Aprende (`leccion-abrir`), con el mismo motor.
 *
 * Las pantallas son estado de la app del niño, no rutas del hash: el router
 * del adulto no las conoce y el niño no puede llegar a una sección adulta
 * escribiendo una dirección.
 *
 * La alcancía solo anota (D3): Finko no mueve dinero. Cada "Guardé",
 * "Gasté", "Compartí" o mover es un movimiento del perfil del niño.
 */

import { EventBus } from '../../core/state.js';
import { save } from '../../core/storage.js';
import { registrarAccion } from '../../ui/actions.js';
import { abrirModal, cerrarModal } from '../../ui/modales.js';
import { confirmar } from '../../ui/confirm.js';
import { mostrarToast } from '../../ui/toast.js';
import { programarRender } from '../../infra/render.js';
import { announce } from '../../infra/a11y.js';
import { hoy, f } from '../../infra/utils.js';
import { perfilActivo, actualizarNino, saldosFrascos } from '../../infra/perfiles.js';
import {
  VISTAS_NINO, leerMonto, validarMovimiento, crearMovimientos, metaActiva, validarMeta,
} from './logic.js';
import {
  htmlBarraNino, htmlInicioNino, htmlRutaNino, htmlAlcanciaNino, htmlYoNino,
  htmlMovimientoNino, htmlMetaNino, htmlPlanMeta, FRASCO_INFO,
} from './view.js';

/** Pantallas: las cuatro de la barra y crear una meta. */
const _VISTAS = [...VISTAS_NINO, 'meta'];

const _VISTA_HTML = {
  inicio: (p) => htmlInicioNino(p, hoy()),
  aprender: htmlRutaNino,
  alcancia: (p) => htmlAlcanciaNino(p, hoy()),
  yo: htmlYoNino,
  meta: (p) => htmlMetaNino(p, _borrador, hoy()),
};

/** Pantalla actual del niño. */
let _vista = 'inicio';

/** Lo que el niño va eligiendo en "Nueva meta", mientras no la crea. */
let _borrador = {};

/** Último HTML pintado: repintar lo mismo le quitaría el foco al niño. */
let _ultimo = null;

const _modal = () => document.getElementById('modal-nino');

/** Id nuevo para un movimiento o una meta. No es secreto: solo único. */
function _idNuevo() {
  return `m-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

function _render() {
  const main = document.getElementById('nino-main');
  const nav = document.getElementById('nino-nav');
  if (!main) return;
  const perfil = perfilActivo();
  // La pantalla de la meta se pinta una vez: repintarla por un state:change
  // le borraría al niño lo que va escribiendo.
  if (perfil && _vista === 'meta' && main.querySelector('#form-nino-meta')) return;
  const html = perfil ? _VISTA_HTML[_vista](perfil) : '';
  if (nav) nav.innerHTML = perfil ? htmlBarraNino(_vista) : '';
  if (html === _ultimo) return;
  _ultimo = html;
  main.innerHTML = html;
}

/** Cambia de pantalla y lleva el foco a su título. */
function _irA(vista) {
  if (!_VISTAS.includes(vista) || !perfilActivo()) return;
  if (vista === 'meta') _borrador = {};
  _vista = vista;
  _ultimo = null;
  _render();
  window.scrollTo?.(0, 0);
  document.querySelector('#nino-main h1')?.focus({ preventScroll: true });
}

/** Guarda un cambio del perfil del niño y repinta su app. */
function _guardar(cambio) {
  const perfil = perfilActivo();
  if (!perfil) return;
  actualizarNino(perfil.id, cambio);
  save();
  EventBus.emit('state:change', { section: 'perfiles' });
}

// ── ANOTAR DINERO (D9) ───────────────────────────────────────────

function _abrirMovimiento(el) {
  const perfil = perfilActivo();
  const modal = _modal();
  const cuerpo = document.getElementById('modal-nino-body');
  if (!perfil || !modal || !cuerpo) return;
  cuerpo.innerHTML = htmlMovimientoNino(el?.dataset?.tipo ?? 'guarde', perfil);
  abrirModal(modal);
  document.getElementById('nino-monto')?.focus({ preventScroll: true });
}

function _ponerMonto(el) {
  const campo = /** @type {HTMLInputElement|null} */ (document.getElementById('nino-monto'));
  if (!campo) return;
  campo.value = f(Number(el?.dataset?.monto) || 0).replace('$', '');
  campo.focus();
}

/** Mensaje de lo anotado, en la voz del niño. */
function _confirmacion(mov) {
  if (mov.tipo === 'guarde') return `Guardaste ${f(mov.monto)} en ${FRASCO_INFO[mov.frasco].nombre}.`;
  if (mov.tipo === 'gaste') return `Anotaste un gasto de ${f(mov.monto)}.`;
  if (mov.tipo === 'comparti') return `Compartiste ${f(mov.monto)}.`;
  return `Moviste ${f(mov.monto)} a ${FRASCO_INFO[mov.hacia].nombre}.`;
}

function _enviarMovimiento(form) {
  const perfil = perfilActivo();
  if (!perfil) return;
  const datos = Object.fromEntries(new FormData(form));
  const mov = {
    tipo: form.dataset.tipo,
    monto: leerMonto(datos.monto),
    frasco: datos.frasco,
    desde: datos.desde,
    hacia: datos.hacia,
    nota: datos.nota,
  };
  const errores = validarMovimiento(mov, perfil);
  const error = document.getElementById('nino-mov-error');
  if (errores.length) {
    if (error) error.textContent = errores.join(' ');
    announce(errores.join(' '), 'assertive');
    return;
  }
  const nuevos = crearMovimientos(mov, hoy(), _idNuevo);
  _guardar(p => ({ ...p, movimientos: [...p.movimientos, ...nuevos] }));
  const modal = _modal();
  if (modal) cerrarModal(modal);
  mostrarToast({ titulo: '¡Anotado!', detalle: _confirmacion(mov) });
}

// ── LA META (D9) ─────────────────────────────────────────────────

/** Repinta solo la respuesta en semanas y fecha, sin tocar lo que escribe. */
function _actualizarPlan() {
  const perfil = perfilActivo();
  const plan = document.getElementById('nino-meta-plan');
  if (perfil && plan) plan.innerHTML = htmlPlanMeta(perfil, _borrador.precio, _borrador.semanal ?? 2_000, hoy());
}

function _onInputMeta(e) {
  const form = /** @type {HTMLElement} */ (e.target).closest?.('#form-nino-meta');
  if (!form) return;
  const t = /** @type {HTMLInputElement} */ (e.target);
  if (t.name === 'precio') _borrador.precio = leerMonto(t.value);
  else if (t.name === 'nombre') _borrador.nombre = t.value;
  else if (t.name === 'dibujo') _borrador.dibujo = t.value;
  _actualizarPlan();
}

function _cambiarSemanal(el) {
  const actual = _borrador.semanal ?? 2_000;
  _borrador.semanal = Math.max(1_000, actual + (Number(el?.dataset?.paso) || 0));
  const salida = document.getElementById('nino-meta-semanal');
  if (salida) salida.textContent = f(_borrador.semanal);
  _actualizarPlan();
}

function _crearMeta(form) {
  const datos = Object.fromEntries(new FormData(form));
  const meta = {
    dibujo: String(datos.dibujo ?? ''),
    nombre: String(datos.nombre ?? '').trim(),
    precio: leerMonto(datos.precio),
    semanal: _borrador.semanal ?? 2_000,
  };
  const errores = validarMeta(meta);
  const error = document.getElementById('nino-meta-error');
  if (errores.length) {
    if (error) error.textContent = errores.join(' ');
    announce(errores.join(' '), 'assertive');
    return;
  }
  _guardar(p => ({ ...p, metas: [...p.metas.filter(m => m?.lograda), { id: _idNuevo(), ...meta, creada: hoy() }] }));
  _borrador = {};
  mostrarToast({ titulo: '¡Meta creada!', detalle: `Vas por tu ${meta.nombre}.` });
  _irA('alcancia');
}

/** "Lo compré": sale de Ahorrar y la meta queda lograda. */
function _compre() {
  const perfil = perfilActivo();
  const meta = metaActiva(perfil);
  if (!perfil || !meta || saldosFrascos(perfil).ahorrar < meta.precio) return;
  const mov = { id: _idNuevo(), fecha: hoy(), frasco: 'ahorrar', monto: -meta.precio, tipo: 'meta', nota: meta.nombre };
  _guardar(p => ({
    ...p,
    movimientos: [...p.movimientos, mov],
    metas: p.metas.map(m => (m?.id === meta.id ? { ...m, lograda: hoy() } : m)),
  }));
  mostrarToast({ titulo: '¡Lo lograste!', detalle: `Ahorraste para tu ${meta.nombre}.` });
}

async function _quitarMeta() {
  const meta = metaActiva(perfilActivo());
  if (!meta) return;
  const ok = await confirmar({
    titulo: '¿Quitar tu meta?',
    mensaje: `Tu dinero se queda en Ahorrar. Puedes crear otra meta cuando quieras.`,
    confirmarTexto: 'Quitar meta',
  });
  if (!ok) return;
  _guardar(p => ({ ...p, metas: p.metas.filter(m => m?.id !== meta.id) }));
}

// ── INIT ─────────────────────────────────────────────────────────

/** @param {SubmitEvent} e */
function _onSubmit(e) {
  const form = /** @type {HTMLFormElement} */ (e.target);
  if (form.id === 'form-nino-mov') {
    e.preventDefault();
    _enviarMovimiento(form);
  } else if (form.id === 'form-nino-meta') {
    e.preventDefault();
    _crearMeta(form);
  }
}

export function initNino() {
  // Entrar a un perfil siempre empieza en Inicio. El foco al saludo lo pone
  // ui/quien-usa.js cuando la piel ya cambió.
  EventBus.on('perfil:cambio', () => {
    _vista = 'inicio';
    _borrador = {};
    _render();
  });
  EventBus.on('state:change', () => {
    if (perfilActivo()) programarRender(_render);
  });
  registrarAccion('nino-vista', (el) => _irA(el?.dataset?.vista));
  registrarAccion('nino-mov', _abrirMovimiento);
  registrarAccion('nino-monto', _ponerMonto);
  registrarAccion('nino-meta-semana', _cambiarSemanal);
  registrarAccion('nino-meta-compre', _compre);
  registrarAccion('nino-meta-quitar', _quitarMeta);
  _modal()?.addEventListener('submit', _onSubmit);
  const main = document.getElementById('nino-main');
  main?.addEventListener('submit', _onSubmit);
  main?.addEventListener('input', _onInputMeta);
  main?.addEventListener('change', _onInputMeta);
  // El cierre de la lección pide una pantalla ("Ver mi alcancía", "Volver a
  // la ruta") sin importar este dominio (ADN 10).
  EventBus.on('nino:vista', ({ vista } = {}) => _irA(vista));
}

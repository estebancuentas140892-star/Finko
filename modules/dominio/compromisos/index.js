/**
 * compromisos/index.js - API pública del dominio de compromisos.
 *
 * Responsabilidades:
 * - Registrar acciones data-action propias del dominio.
 * - Inyectar el formulario en el modal en el arranque.
 * - Suscribirse a EventBus para re-renderizar cuando el estado cambia.
 * - Coordinar logic.js + view.js sin hacer cálculos ni generar HTML aquí.
 */

import { S, EventBus } from '../../core/state.js';
import { guardar, editar, eliminar } from '../../infra/crud.js';
import { registrarAccion } from '../../ui/actions.js';
import { abrirModal, cerrarModal, resetModal } from '../../ui/modales.js';
import { renderSmart, updateBadge, updSaldo, registrarRender } from '../../infra/render.js';
import { announce } from '../../infra/a11y.js';
import { mostrarErroresForm } from '../../infra/form-errors.js';
import { f } from '../../infra/utils.js';
import { confirmar } from '../../ui/confirm.js';
import { validarCompromiso, normalizarCompromiso, validarAbono, ajustarMontoAbono } from './logic.js';
import {
  renderListaCompromisos,
  renderChooserCompromiso,
  renderFormDeuda,
  renderFormAbono,
  renderEstrategiaPago,
  setEstrategiaUI,
  getEstrategiaUI,
  renderAlertaFijosSinPagar,
  renderAlertaDeudasDurmiendo,
  renderPanelVencidos,
  renderPanelPrioridades,
} from './view.js';

/**
 * Re-renderiza los paneles del dashboard que dependen de compromisos.
 * Se invoca en cada renderAll() (via registrarRender) para que el dashboard
 * refleje cambios cross-domain (ej. al pagar un gasto que cierra un compromiso).
 */
function _renderDashboardPanels() {
  renderPanelVencidos();
  renderPanelPrioridades();
}

/**
 * Re-renderiza ambas vistas del dominio. Se usa cuando cambian datos o
 * el estado UI de la estrategia (extra mensual, toggle).
 */
function _renderTodo() {
  // En v6 la card de estrategia va ARRIBA (define el orden de pago).
  renderEstrategiaPago();
  renderAlertaFijosSinPagar();
  renderAlertaDeudasDurmiendo();
  renderListaCompromisos();
}

// ── HANDLERS DE ACCIÓN ───────────────────────────────────────────

function _nuevoCompromiso() {
  const overlay = document.getElementById('modal-compromiso');
  if (!overlay) return;
  // Volvemos al chooser (paso 1) y reseteamos el título. Así si el usuario
  // cerró habiendo llegado al form (paso 2) y vuelve a abrir, ve el chooser.
  _mostrarChooser(overlay);
  abrirModal(overlay);
}

function _guardarCompromiso() {
  const form = document.getElementById('form-compromiso');
  if (!form) return;

  const datos = Object.fromEntries(new FormData(form));
  const errores = validarCompromiso(datos);

  if (errores.length > 0) {
    mostrarErroresForm(form, errores);
    return;
  }

  guardar('compromisos', normalizarCompromiso(datos));

  const overlay = document.getElementById('modal-compromiso');
  if (overlay) cerrarModal(overlay);

  _renderTodo();
  updateBadge();
  announce('Compromiso guardado correctamente.');
}

/** @param {HTMLElement} el */
async function _eliminarCompromiso(el) {
  const id = el.dataset.id;
  if (!id) return;

  const compromiso = S.compromisos.find(c => c.id === id);
  if (!compromiso) return;

  const ok = await confirmar({
    titulo:         'Eliminar compromiso',
    mensaje:        `¿Querés eliminar "${compromiso.descripcion}"? Esta acción no se puede deshacer.`,
    confirmarTexto: 'Eliminar',
    peligroso:      true,
  });
  if (!ok) return;

  eliminar('compromisos', id);
  _renderTodo();
  updateBadge();
  announce(`Compromiso "${compromiso.descripcion}" eliminado.`);
}

// ── HANDLERS DEL MODAL: FLUJO DE 2 PASOS ────────────────────────

/**
 * Pone el modal en el paso 1 (chooser). Reinyecta el HTML limpio y resetea el título.
 * @param {HTMLElement} overlay - el modal-overlay
 */
function _mostrarChooser(overlay) {
  const body = overlay.querySelector('.modal__body');
  const titulo = overlay.querySelector('.modal__title');
  if (body)   body.innerHTML = renderChooserCompromiso();
  if (titulo) titulo.textContent = 'Nueva deuda';
}

/**
 * Cuando el usuario elige el tipo (entidad | personal), pasamos al paso 2.
 * @param {HTMLElement} el - botón con data-tipo
 */
function _elegirTipoDeuda(el) {
  const tipo = el.dataset.tipo;
  if (tipo !== 'deuda-entidad' && tipo !== 'deuda-personal') return;

  const overlay = document.getElementById('modal-compromiso');
  if (!overlay) return;

  const body   = overlay.querySelector('.modal__body');
  const titulo = overlay.querySelector('.modal__title');
  if (!body) return;

  body.innerHTML = renderFormDeuda(tipo);

  const tituloTexto = tipo === 'deuda-entidad' ? 'Deuda con entidad' : 'Deuda personal';
  if (titulo) titulo.textContent = tituloTexto;

  // Adjuntar submit handler al nuevo form.
  body.querySelector('#form-compromiso')?.addEventListener('submit', (e) => {
    e.preventDefault();
    _guardarCompromiso();
  });

  // Foco en el primer campo visible para accesibilidad.
  body.querySelector('input:not([type=hidden])')?.focus();
}

/**
 * Vuelve al chooser (paso 1) desde el form (paso 2).
 */
function _volverChooser() {
  const overlay = document.getElementById('modal-compromiso');
  if (!overlay) return;
  _mostrarChooser(overlay);
}

// ── HANDLERS ABONO A DEUDAS (ADR 002) ───────────────────────────

/** @param {HTMLElement} el */
function _abrirAbono(el) {
  const compromisoId = el.dataset.id;
  if (!compromisoId) return;

  const deuda = S.compromisos.find(c => c.id === compromisoId);
  if (!deuda) return;

  const overlay = document.getElementById('modal-abono');
  if (!overlay) return;

  const titulo = overlay.querySelector('.modal__title');
  if (titulo) titulo.textContent = `Abonar: ${deuda.descripcion}`;

  const body = overlay.querySelector('.modal__body');
  if (body) {
    body.innerHTML = renderFormAbono(deuda);

    body.querySelector('#form-abono')?.addEventListener('submit', (e) => {
      e.preventDefault();
      _guardarAbono();
    });

    body.querySelector('#abono-cuenta')?.addEventListener('change', _actualizarSaldoDisponibleAbono);
  }

  abrirModal(overlay);
}

function _guardarAbono() {
  const form = document.getElementById('form-abono');
  if (!form) return;

  const datos = Object.fromEntries(new FormData(form));
  const deudaId = datos.compromisoId;
  const deuda   = S.compromisos.find(c => c.id === deudaId);

  const errores = validarAbono(datos, deuda);
  if (errores.length > 0) {
    mostrarErroresForm(form, errores);
    return;
  }

  const { montoAjustado, saldaDeuda } = ajustarMontoAbono(
    Number(datos.monto),
    Number(deuda.saldoTotal),
  );

  // Crear el gasto-abono en el dominio de gastos.
  guardar('gastos', {
    descripcion:       `Abono: ${deuda.descripcion}`,
    monto:             montoAjustado,
    categoria:         'Deudas',
    fecha:             datos.fecha,
    cuentaId:          datos.cuentaId || null,
    nota:              datos.nota?.trim() || '',
    compromisoId:      deudaId,
    pendienteCompletar: false,
  });

  // Descontar de la cuenta elegida.
  if (datos.cuentaId) {
    const cuenta = S.cuentas.find(c => c.id === datos.cuentaId);
    if (cuenta) {
      editar('cuentas', datos.cuentaId, { saldo: (cuenta.saldo ?? 0) - montoAjustado });
    }
  }

  // Reducir el saldo de la deuda.
  const nuevoSaldo = saldaDeuda ? 0 : Math.max(0, (Number(deuda.saldoTotal) || 0) - montoAjustado);
  editar('compromisos', deudaId, { saldoTotal: nuevoSaldo });

  const overlay = document.getElementById('modal-abono');
  if (overlay) cerrarModal(overlay);

  _renderTodo();
  updateBadge();
  updSaldo();

  const msg = saldaDeuda
    ? `Deuda "${deuda.descripcion}" saldada.`
    : `Abono de ${f(montoAjustado)} registrado en "${deuda.descripcion}".`;
  announce(msg);
}

/** @param {HTMLElement} el */
async function _archivarCompromiso(el) {
  const id = el.dataset.id;
  if (!id) return;

  const compromiso = S.compromisos.find(c => c.id === id);
  if (!compromiso) return;

  const ok = await confirmar({
    titulo:         'Archivar deuda saldada',
    mensaje:        `"${compromiso.descripcion}" tiene saldo $0. ¿Querés archivarla para que no aparezca más en la lista?`,
    confirmarTexto: 'Archivar',
    peligroso:      false,
  });
  if (!ok) return;

  editar('compromisos', id, { activo: false });
  _renderTodo();
  updateBadge();
  announce(`Deuda "${compromiso.descripcion}" archivada.`);
}

function _actualizarSaldoDisponibleAbono() {
  const sel = document.getElementById('abono-cuenta');
  const tip = document.getElementById('abono-saldo-disponible');
  if (!sel || !tip) return;

  const cuentaId = sel.value;
  if (!cuentaId) {
    tip.textContent = 'Elegí una cuenta para ver el saldo disponible.';
    tip.classList.remove('form-hint--danger');
    tip.classList.add('form-hint--muted');
    return;
  }

  const cuenta = S.cuentas.find(c => c.id === cuentaId);
  if (!cuenta) {
    tip.textContent = 'Cuenta no encontrada.';
    return;
  }

  const saldo = cuenta.saldo ?? 0;
  tip.textContent = `Saldo disponible en ${cuenta.nombre}: ${f(saldo)}`;
  tip.classList.toggle('form-hint--danger', saldo <= 0);
  tip.classList.toggle('form-hint--muted',  saldo >  0);
}

// ── HANDLERS ESTRATEGIA ──────────────────────────────────────────

// Handlers de la card de estrategia (F.4). En v6 la estrategia también
// define el orden de la lista de deudas, así que re-renderizamos ambas.
function _elegirEstrategia(el) {
  const estrategia = el.dataset.estrategia;
  if (estrategia !== 'avalancha' && estrategia !== 'bolaNieve') return;
  setEstrategiaUI({ estrategia });
  renderEstrategiaPago();
  renderListaCompromisos();
}

function _cambiarExtraEstrategia(el) {
  setEstrategiaUI({ extraMensual: el.value });
  renderEstrategiaPago();
}

function _toggleExtraEstrategia() {
  const actual = getEstrategiaUI().expandidoExtra;
  setEstrategiaUI({ expandidoExtra: !actual });
  renderEstrategiaPago();
  // Si abrimos, hacemos focus al input para que el usuario pueda escribir directo.
  if (!actual) {
    queueMicrotask(() => document.getElementById('estrategia-extra')?.focus());
  }
}

// ── INICIALIZACIÓN ───────────────────────────────────────────────

function _inyectarForm() {
  // Paso 1: al arrancar inyectamos el chooser en el modal.
  // El form (paso 2) se inyecta dinámicamente cuando el usuario elige tipo.
  const overlay = document.getElementById('modal-compromiso');
  if (overlay) _mostrarChooser(overlay);
}

export function initCompromisos() {
  registrarAccion('nuevo-compromiso',        _nuevoCompromiso);
  registrarAccion('eliminar-compromiso',     _eliminarCompromiso);
  registrarAccion('abrir-abono',             _abrirAbono);
  registrarAccion('archivar-compromiso',     _archivarCompromiso);
  registrarAccion('elegir-estrategia',       _elegirEstrategia);
  registrarAccion('toggle-extra-estrategia', _toggleExtraEstrategia);
  registrarAccion('comp-elegir-tipo',        _elegirTipoDeuda);
  registrarAccion('comp-volver-chooser',     _volverChooser);

  _inyectarForm();

  // El input de "extra mensual" usa `change` (al blur) en vez de click,
  // así no perdemos focus durante el tipeo. Delegado a nivel documento.
  document.addEventListener('change', (e) => {
    const t = e.target;
    if (t instanceof HTMLInputElement && t.dataset.action === 'cambiar-extra-estrategia') {
      _cambiarExtraEstrategia(t);
    }
  });

  // Los paneles de Dashboard (Vencidos + Prioridades) se actualizan en cada
  // renderAll() para reflejar cambios cross-domain (ej. al cerrar un compromiso
  // desde otra sección). renderSmart corta si el dashboard no está activo.
  registrarRender(() => renderSmart(_renderDashboardPanels, 'dash'));

  EventBus.on('state:change', ({ section }) => {
    if (section === 'compromisos') {
      renderSmart(_renderTodo, 'compromisos');
      // El dashboard también depende de compromisos: si el usuario crea/edita/
      // elimina uno y luego vuelve a #dash, el panel debe reflejarlo. renderSmart
      // corta si la sección activa no es 'dash', así que es barato llamarlo siempre.
      renderSmart(_renderDashboardPanels, 'dash');
      updateBadge();
    }
  });

  // Re-render al navegar a #compromisos o #dash.
  window.addEventListener('hashchange', () => {
    const hash = location.hash.slice(1) || 'dash';
    if (hash === 'compromisos') renderSmart(_renderTodo, 'compromisos');
    if (hash === 'dash')        renderSmart(_renderDashboardPanels, 'dash');
  });

  renderSmart(_renderTodo, 'compromisos');
  renderSmart(_renderDashboardPanels, 'dash');
  updateBadge();
}

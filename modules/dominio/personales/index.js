/**
 * personales/index.js - API pública del dominio de préstamos personales.
 *
 * Responsabilidades:
 * - Registrar acciones data-action (nuevo, pagar, eliminar).
 * - Inyectar el formulario del modal al arranque.
 * - Suscribirse a EventBus para re-renderizar cuando cambia S.personales.
 * - Coordinar logic.js + view.js sin hacer cálculos ni generar HTML aquí.
 */

import { S, EventBus } from '../../core/state.js';
import { guardar, editar, eliminar } from '../../infra/crud.js';
import { registrarAccion } from '../../ui/actions.js';
import { abrirModal, cerrarModal } from '../../ui/modales.js';
import { renderSmart, registrarRender } from '../../infra/render.js';
import { announce } from '../../infra/a11y.js';
import { mostrarErroresForm } from '../../infra/form-errors.js';
import { confirmar } from '../../ui/confirm.js';
import {
  validarPersonal,
  normalizarPersonal,
  aplicarPago,
  desglosarPago,
  calcularPendiente,
  tieneInteres,
} from './logic.js';
import { f } from '../../infra/utils.js';
import { updSaldo } from '../../infra/render.js';
import { renderListaPersonales, renderFormPersonal, renderFormPagoPersonal } from './view.js';
import { renderBannerProposito } from '../../ui/proposito.js';

/**
 * Ajusta el saldo de una cuenta en `delta` (positivo suma, negativo descuenta).
 * No-op si no hay cuenta o no existe. Mismo helper que usan Compromisos (D.14)
 * y Apartados: `personales` no puede importar de otro dominio (ADN 10), así que
 * la copia es intencional (candidata a unificarse en ARQ.2).
 *
 * @param {string|null|undefined} cuentaId
 * @param {number} delta
 */
function _ajustarSaldoCuenta(cuentaId, delta) {
  if (!cuentaId || delta === 0) return;
  const cuenta = (S.cuentas ?? []).find(c => c.id === cuentaId);
  if (!cuenta) return;
  editar('cuentas', cuentaId, { saldo: (cuenta.saldo ?? 0) + delta });
}

/**
 * Devuelve el foco a un ancla visible DESPUÉS de repintar la lista (DIS.3, V-5 y
 * V-6, regla R13).
 *
 * `cerrarModal()` llama `releaseFocus()`, que devuelve el foco al botón que abrió
 * el modal, y acto seguido `renderListaPersonales()` reemplaza el `innerHTML` de
 * `#lista-personales`: ese botón deja de existir y el foco cae al `body`. Con
 * teclado eso obliga a tabular desde el principio de la página en cada alta,
 * cobro o borrado. Llamar esto siempre después del render, nunca antes.
 *
 * @param {string|null} id id del préstamo a enfocar; `null` vuelve al encabezado.
 */
function _enfocarTrasRender(id) {
  const destino = id
    ? document.querySelector(`#lista-personales article[data-id="${id}"]`)
    : document.getElementById('sec-personales');
  destino?.focus();
}

// ── HANDLERS NUEVO / GUARDAR ─────────────────────────────────────

function _nuevoPersonal() {
  const overlay = document.getElementById('modal-personal');
  if (!overlay) return;
  // PE.7: re-inyectar en cada apertura, no solo al arrancar. El form ahora
  // depende de `S.cuentas` (selector de cuenta de origen): si se inyectara una
  // sola vez en el init, crear una cuenta después dejaría el selector invisible
  // hasta recargar la app. Mismo patrón que `_nuevoApartado`.
  //
  // Re-inyectar YA deja el form pristino, así que `resetModal()` sobra y además
  // estorbaba: pone `checked = false` en todos los radios (borraría la cuenta
  // preseleccionada) y vacía los `value` del HTML (dejaba en blanco la fecha
  // del préstamo, que el propio form rellena con hoy).
  _inyectarForm();
  abrirModal(overlay);
}

function _guardarPersonal() {
  const form = document.getElementById('form-personal');
  if (!form) return;

  const datos   = Object.fromEntries(new FormData(form));
  const errores = validarPersonal(datos);

  if (errores.length > 0) {
    mostrarErroresForm(form, errores);
    return;
  }

  const nuevo    = normalizarPersonal(datos);
  const guardado = guardar('personales', nuevo);

  // PE.7: prestar saca el dinero de la cuenta elegida. No destruye riqueza (el
  // capital pendiente entra al patrimonio como "Por cobrar", ver
  // `calcularTotalPorCobrar`): convierte efectivo en un derecho de cobro.
  // Sin cuenta vinculada, el préstamo vale como seguimiento y no toca saldos.
  if (nuevo.cuentaId) {
    _ajustarSaldoCuenta(nuevo.cuentaId, -nuevo.monto);
    updSaldo();
  }

  const overlay = document.getElementById('modal-personal');
  if (overlay) cerrarModal(overlay);

  renderListaPersonales();
  _enfocarTrasRender(guardado.id);
  announce(nuevo.cuentaId
    ? `Préstamo guardado. Se descontaron ${f(nuevo.monto)} de tu cuenta.`
    : 'Préstamo guardado correctamente.'
  );
}

// ── HANDLERS PAGAR ───────────────────────────────────────────────

function _abrirPagoPersonal(el) {
  const id = el.dataset.id;
  if (!id) return;
  const prestamo = S.personales.find(p => p.id === id);
  if (!prestamo) return;

  const overlay = document.getElementById('modal-pago-personal');
  const body    = document.getElementById('modal-pago-personal-body');
  if (!overlay || !body) return;

  body.innerHTML = renderFormPagoPersonal(prestamo);
  body.querySelector('#form-pago-personal')?.addEventListener('submit', (e) => {
    e.preventDefault();
    _confirmarPagoPersonal();
  });

  abrirModal(overlay);
}

function _confirmarPagoPersonal() {
  const form = document.getElementById('form-pago-personal');
  if (!form) return;

  const datosForm = new FormData(form);
  const id    = form.dataset.id;
  const monto = Number(datosForm.get('monto'));
  const cuentaDestinoId = String(datosForm.get('cuentaId') ?? '').trim() || null;

  const prestamo = S.personales.find(p => p.id === id);
  if (!prestamo) return;

  if (!Number.isFinite(monto) || monto <= 0) {
    announce('Pon un monto mayor a 0.', 'assertive');
    return;
  }

  const pendiente = calcularPendiente(prestamo);
  if (pendiente <= 0) {
    announce('Este préstamo ya está liquidado.', 'assertive');
    return;
  }

  const desglose    = desglosarPago(prestamo, monto);
  const actualizado = aplicarPago(prestamo, monto);
  const patch = {
    pagado:     actualizado.pagado,
    liquidado:  actualizado.liquidado,
    ultimoPago: actualizado.ultimoPago,
  };
  if (tieneInteres(prestamo)) {
    patch.capitalPagado    = actualizado.capitalPagado;
    patch.interesPagado    = actualizado.interesPagado;
    patch.interesPendiente = actualizado.interesPendiente;
  }
  editar('personales', id, patch);

  // PE.7: el dinero cobrado vuelve a entrar a la cuenta elegida. Se acredita
  // `desglose.aplicado` (ya recortado al pendiente por `desglosarPago`), no el
  // monto tecleado: si el usuario escribe de más, no se infla el saldo.
  if (cuentaDestinoId && desglose.aplicado > 0) {
    _ajustarSaldoCuenta(cuentaDestinoId, desglose.aplicado);
    updSaldo();
  }

  const overlay = document.getElementById('modal-pago-personal');
  if (overlay) cerrarModal(overlay);

  renderListaPersonales();
  _enfocarTrasRender(id);
  // Con tasa, el anuncio informa cuánto del abono fue a capital y cuánto a
  // interés (PE.1); sin tasa, el copy de siempre.
  if (actualizado.liquidado) {
    announce(`Préstamo de ${prestamo.persona} marcado como liquidado.`);
  } else if (tieneInteres(prestamo) && desglose.aInteres > 0) {
    announce(`Pago de ${prestamo.persona} registrado: ${f(desglose.aCapital)} a capital y ${f(desglose.aInteres)} a interés.`);
  } else {
    announce(`Pago de ${prestamo.persona} registrado.`);
  }
}

// ── HANDLER ELIMINAR ─────────────────────────────────────────────

/** @param {HTMLElement} el */
async function _eliminarPersonal(el) {
  const id = el.dataset.id;
  if (!id) return;

  const prestamo = S.personales.find(p => p.id === id);
  if (!prestamo) return;

  // PE.7: borrar NO revierte los movimientos de cuenta, a diferencia de una
  // deuda (D.14, que acredita una sola vez al crearse y por eso puede revertir
  // exacto). Un préstamo es un flujo: desembolso más N abonos, posiblemente a
  // cuentas distintas; revertir solo el desembolso sobre-acreditaría en cuanto
  // hubiera un abono, y revertir el neto con fiabilidad necesita el historial
  // de abonos que planea PE.6b (hoy solo existe el acumulador `pagado`).
  // El copy lo dice explícitamente para que no sorprenda.
  const avisoSaldo = prestamo.cuentaId
    ? ' Los movimientos que ya hiciste en tus cuentas se quedan como están.'
    : '';
  const ok = await confirmar({
    titulo:         'Borrar préstamo',
    mensaje:        `¿Borrar el préstamo a ${prestamo.persona}? Esto no devuelve el dinero, solo limpia el registro.${avisoSaldo}`,
    confirmarTexto: 'Borrar',
    peligroso:      true,
  });
  if (!ok) return;

  eliminar('personales', id);
  renderListaPersonales();
  // La tarjeta ya no existe: el ancla es la sección (V-6).
  _enfocarTrasRender(null);
  announce(`Préstamo a ${prestamo.persona} eliminado.`);
}

// ── INIT ─────────────────────────────────────────────────────────

function _inyectarForm() {
  const body = document.getElementById('modal-personal-body');
  if (!body) return;
  body.innerHTML = renderFormPersonal();
  body.querySelector('#form-personal')?.addEventListener('submit', (e) => {
    e.preventDefault();
    _guardarPersonal();
  });
}

export function initPersonales() {
  registrarAccion('nuevo-personal',    _nuevoPersonal);
  registrarAccion('pagar-personal',    _abrirPagoPersonal);
  registrarAccion('eliminar-personal', _eliminarPersonal);

  _inyectarForm();

  EventBus.on('state:change', ({ section }) => {
    if (section === 'personales') {
      renderBannerProposito('personales', S.personales.length > 0);
      renderSmart(renderListaPersonales, 'personales');
    }
  });

  // Re-render en cada navegación a #personales (sigue patrón de calculadoras).
  window.addEventListener('hashchange', () => {
    renderBannerProposito('personales', S.personales.length > 0);
    renderSmart(renderListaPersonales, 'personales');
  });

  // Render inicial: si la sección está activa al bootstrap.
  // registrarRender garantiza que renderAll() lo dispare después del initRouter.
  registrarRender(() => renderSmart(renderListaPersonales, 'personales'));
  renderBannerProposito('personales', S.personales.length > 0);
  renderSmart(renderListaPersonales, 'personales');
}

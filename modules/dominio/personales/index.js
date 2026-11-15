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
import { guardar, editar, eliminar, genId } from '../../infra/crud.js';
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
  reversionAlBorrar,
} from './logic.js';
import { f } from '../../infra/utils.js';
import { desdeMiles } from '../../infra/miles.js';
import { updSaldo } from '../../infra/render.js';
import { renderListaPersonales, renderFormPersonal, renderFormPagoPersonal } from './view.js';
import { htmlDetallePrestamo } from './telefono.js';
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
  const titulo = overlay.querySelector('.modal__title');
  if (titulo) titulo.textContent = 'Nuevo préstamo';
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

/**
 * Abre el modal de préstamo en modo edición (EDIT.1) con los datos actuales
 * prellenados. La cuenta de origen no se vuelve a preguntar (ver
 * `_renderCuentaEditable` en `view.js`).
 * @param {HTMLElement} el - botón con data-id del préstamo.
 */
function _editarPersonal(el) {
  const id = el.dataset.id;
  if (!id) return;

  const prestamo = S.personales.find(p => p.id === id);
  if (!prestamo) return;

  const overlay = document.getElementById('modal-personal');
  if (!overlay) return;
  const titulo = overlay.querySelector('.modal__title');
  if (titulo) titulo.textContent = 'Editar préstamo';

  _inyectarForm(prestamo);
  abrirModal(overlay);
}

function _inyectarForm(prestamo = null) {
  const body = document.getElementById('modal-personal-body');
  if (!body) return;
  body.innerHTML = renderFormPersonal({ prestamo });

  const form = body.querySelector('#form-personal');
  if (!form) return;
  if (prestamo) form.dataset.id = prestamo.id;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    _guardarPersonal();
  });
}

async function _guardarPersonal() {
  const form = document.getElementById('form-personal');
  if (!form) return;

  const datos   = Object.fromEntries(new FormData(form));
  const errores = validarPersonal(datos);

  if (errores.length > 0) {
    mostrarErroresForm(form, errores, undefined, () => validarPersonal(Object.fromEntries(new FormData(form))));
    return;
  }

  const idEdit = form.dataset.id || null;

  if (idEdit) {
    const existente = S.personales.find(p => p.id === idEdit);
    if (!existente) return;

    const actualizado = normalizarPersonal(datos, existente);

    // ADR 053 I3: con cuenta de origen, el monto editado ajusta el saldo por
    // delta contra lo que ya estaba descontado, no solo la cifra guardada.
    // `delta` > 0 devuelve dinero a la cuenta (monto bajó); < 0 descuenta de
    // más (monto subió).
    let delta = 0;
    if (actualizado.cuentaId) {
      delta = existente.monto - actualizado.monto;
      if (delta < 0) {
        const cuenta = (S.cuentas ?? []).find(c => c.id === actualizado.cuentaId);
        const saldo  = cuenta?.saldo ?? 0;
        if (saldo + delta < 0) {
          const ok = await confirmar({
            titulo:         'Editar préstamo',
            mensaje:        `¿Actualizar el préstamo a ${actualizado.persona} a ${f(actualizado.monto)}? Se descontarán ${f(-delta)} más de ${cuenta?.nombre ?? 'la cuenta'}: el saldo disponible es ${f(saldo)} y quedará en negativo.`,
            confirmarTexto: 'Actualizar préstamo',
            peligroso:      true,
          });
          if (!ok) return;
        }
      }
    }

    editar('personales', idEdit, actualizado);

    if (delta !== 0) {
      _ajustarSaldoCuenta(actualizado.cuentaId, delta);
      updSaldo();
    }

    const overlay = document.getElementById('modal-personal');
    if (overlay) cerrarModal(overlay);

    renderListaPersonales();
    _enfocarTrasRender(idEdit);
    announce(`Préstamo a ${actualizado.persona} actualizado.`);
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
  const form = body.querySelector('#form-pago-personal');
  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    _confirmarPagoPersonal();
  });
  // ADR 135 D8: el título dice quién pagó y el botón, cuánto se registra.
  const titulo = document.getElementById('modal-pago-personal-title');
  if (titulo) titulo.textContent = `Te pagó ${prestamo.persona}`;
  form?.addEventListener('input', (e) => {
    if (e.target.name !== 'monto') return;
    const texto = form.querySelector('[data-pago-texto]');
    const monto = desdeMiles(e.target.value) ?? 0;
    if (texto) texto.textContent = monto > 0 ? `Registrar ${f(monto)}` : 'Registrar el pago';
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
  // PE.6b: la cuenta destino entra al abono del historial, no solo al saldo. Es
  // lo que permite saber después por dónde volvió el dinero de cada cobro.
  const actualizado = aplicarPago(prestamo, monto, undefined, cuentaDestinoId);
  // ADR 143 D5: el abono nuevo trae su id (su fila en Movimientos lo usa).
  const abonoNuevo = actualizado.abonos?.at(-1);
  if (abonoNuevo && !abonoNuevo.id && abonoNuevo !== prestamo.abonos?.at(-1)) abonoNuevo.id = genId();
  const patch = {
    pagado:     actualizado.pagado,
    liquidado:  actualizado.liquidado,
    ultimoPago: actualizado.ultimoPago,
    abonos:     actualizado.abonos ?? prestamo.abonos ?? [],
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

  // HF.1d-1 (ADR 143 D4, cambia PE.7): borrar deja las cuentas como si el
  // préstamo no hubiera existido. Desde PE.6b cada abono guarda su cuenta, así
  // que el desembolso vuelve a la suya y cada abono sale de donde entró; uno
  // sin cuenta no movió ninguna. La confirmación lo dice antes.
  const { deltas, abonosSinCuenta } = reversionAlBorrar(prestamo);
  const nombreDe = (cid) => S.cuentas.find(c => c.id === cid)?.nombre ?? 'una cuenta';
  const efectos = Object.entries(deltas).map(([cid, d]) => d > 0
    ? `${f(d)} vuelven a ${nombreDe(cid)}`
    : `${f(-d)} salen de ${nombreDe(cid)}`);
  const avisoSaldo = efectos.length > 0
    ? ` En tus cuentas: ${efectos.join(' y ')}.${abonosSinCuenta > 0 ? ' Los cobros que no anotaste en una cuenta no se tocan.' : ''}`
    : ' No mueve ninguna cuenta.';
  const ok = await confirmar({
    titulo:         'Borrar préstamo',
    mensaje:        `¿Borrar el préstamo a ${prestamo.persona}? Queda como si no hubiera existido.${avisoSaldo}`,
    confirmarTexto: 'Borrar',
    peligroso:      true,
  });
  if (!ok) return;

  for (const [cid, d] of Object.entries(deltas)) _ajustarSaldoCuenta(cid, d);
  if (Object.keys(deltas).length > 0) updSaldo();
  eliminar('personales', id);
  renderListaPersonales();
  // La tarjeta ya no existe: el ancla es la sección (V-6).
  _enfocarTrasRender(null);
  announce(`Préstamo a ${prestamo.persona} eliminado.`);
}

// ── INIT ─────────────────────────────────────────────────────────

export function initPersonales() {
  registrarAccion('nuevo-personal',    _nuevoPersonal);
  registrarAccion('pagar-personal',    _abrirPagoPersonal);
  // ADR 135 D8: en el teléfono cada préstamo es una fila que abre su hoja
  // (`#modal-detalle-fila`).
  registrarAccion('personal-detalle', (el) => {
    const prestamo = (S.personales ?? []).find(p => p.id === el?.dataset?.id);
    const hoja   = document.getElementById('modal-detalle-fila');
    const cuerpo = document.getElementById('detalle-fila-body');
    if (!prestamo || !hoja || !cuerpo) return;
    cuerpo.innerHTML = htmlDetallePrestamo(prestamo);
    abrirModal(hoja);
  });
  // ADR 135 D7: bajo 1024px la sección tiene otra anatomía; al cruzar el
  // ancho se vuelve a pintar (patrón de Análisis, ADR 134 D7).
  window.matchMedia?.('(max-width: 1023.98px)').addEventListener?.('change', () => {
    renderSmart(renderListaPersonales, 'personales');
  });
  registrarAccion('editar-personal',   _editarPersonal);
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

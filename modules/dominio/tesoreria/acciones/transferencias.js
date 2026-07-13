/**
 * tesoreria/acciones/transferencias.js - handlers de "Transferir dinero"
 * entre cuentas propias (MC.17b): abrir el modal, invertir el par de 2
 * cuentas, validar, confirmar sobregiro y aplicar el traslado atómico.
 *
 * Sub-modulo de tesoreria/index.js. Reglas de la capa:
 * - Handlers de data-action y wiring de formularios del subsistema.
 * - Coordina logic/ + views/ sin hacer calculos ni generar HTML aqui.
 */

import { S } from '../../../core/state.js';
import { guardar, editar } from '../../../infra/crud.js';
import { registrarAccion } from '../../../ui/actions.js';
import { abrirModal, cerrarModal } from '../../../ui/modales.js';
import { confirmar } from '../../../ui/confirm.js';
import { updSaldo } from '../../../infra/render.js';
import { announce } from '../../../infra/a11y.js';
import { mostrarErroresForm } from '../../../infra/form-errors.js';
import { f, hoy } from '../../../infra/utils.js';
import {
  validarTransferencia,
  saldoSuficiente,
  costoGMFRetiro,
  origenSujetoAGMF,
  normalizarTransferencia,
  calcularTransferencia,
} from '../logic/transferencias.js';
import { renderFormTransferencia, renderParTransferencia, renderSeccionGMF } from '../view.js';

/** Cuenta por id en S.cuentas, o undefined. */
function _cuenta(id) {
  return (S.cuentas ?? []).find(c => c.id === id);
}

/**
 * Id de la cuenta de origen elegida ahora mismo en el formulario. Con 2 cuentas
 * viene del input hidden del widget de par; con 3+, del radio marcado. Ambos
 * usan `name="cuentaOrigenId"`.
 * @returns {string|null}
 */
function _origenActualId() {
  const form = document.getElementById('form-transferencia');
  if (!form) return null;
  const radio = form.querySelector('input[type="radio"][name="cuentaOrigenId"]:checked');
  if (radio) return radio.value || null;
  return form.querySelector('input[type="hidden"][name="cuentaOrigenId"]')?.value || null;
}

/**
 * Re-renderiza la sección del 4x1000 (`#transferencia-gmf-slot`) según la cuenta
 * de origen actual: aparece si el origen no está exento, desaparece si lo está.
 * Se llama cuando cambia el origen (botón invertir o selector de 3+).
 */
function _refrescarSeccionGMF() {
  const slot = document.getElementById('transferencia-gmf-slot');
  if (!slot) return;
  slot.innerHTML = renderSeccionGMF(_cuenta(_origenActualId()));
  _actualizarHintGMF();
}

/**
 * Actualiza el texto del hint del 4x1000 en vivo con el costo calculado desde
 * el monto y el estado del checkbox. No-op si la sección de GMF no está presente
 * (origen exento). El costo real se recalcula al guardar; esto es solo la guía
 * visual mientras el usuario escribe.
 */
function _actualizarHintGMF() {
  const hint = document.getElementById('transferencia-gmf-hint');
  if (!hint) return;
  const form = document.getElementById('form-transferencia');
  const monto   = Number(form?.querySelector('[name="monto"]')?.value) || 0;
  const aplicar = form?.querySelector('[name="aplicarGMF"]')?.checked;

  if (!aplicar) {
    hint.textContent = 'No se descontará el 4x1000: tu saldo bajará solo el monto transferido.';
  } else if (monto <= 0) {
    hint.textContent = 'Escribe el monto para ver el costo del gravamen.';
  } else {
    const gmf = costoGMFRetiro(monto);
    hint.textContent = `Se descontarán ${f(gmf)} de 4x1000, además de los ${f(monto)} que se transfieren.`;
  }
}

/** Abre el modal de transferencia en modo creación. */
function _abrirTransferencia() {
  const overlay = document.getElementById('modal-transferencia');
  if (!overlay) return;
  const body = document.getElementById('modal-transferencia-body');
  if (body) {
    body.innerHTML = renderFormTransferencia();
    const form = body.querySelector('#form-transferencia');
    if (form) {
      // La fecha por defecto es hoy (se puede cambiar), mismo patrón que el
      // ingreso puntual.
      const inputFecha = form.querySelector('[name="fecha"]');
      if (inputFecha) inputFecha.value = hoy();
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        _guardarTransferencia();
      });
      // GMF en vivo (MC.17d): el monto recalcula el costo; cambiar el origen en
      // los selectores de 3+ decide si la sección aparece; el checkbox actualiza
      // el hint. El botón invertir del widget de 2 lo maneja _invertirTransferencia.
      form.addEventListener('input', (e) => {
        if (e.target.name === 'monto') _actualizarHintGMF();
      });
      form.addEventListener('change', (e) => {
        if (e.target.name === 'cuentaOrigenId') _refrescarSeccionGMF();
        else if (e.target.name === 'aplicarGMF') _actualizarHintGMF();
      });
    }
  }
  abrirModal(overlay);
}

/**
 * Invierte el par de 2 cuentas del widget (solo aplica cuando hay exactamente
 * 2 cuentas activas: con 3+ el formulario usa dos selectores independientes,
 * sin este botón). Reemplaza `#transferencia-par-wrap` con los ids leídos de
 * los inputs hidden actuales, ya invertidos.
 */
function _invertirTransferencia() {
  const wrap = document.getElementById('transferencia-par-wrap');
  if (!wrap) return;
  const origenId  = wrap.querySelector('input[name="cuentaOrigenId"]')?.value;
  const destinoId = wrap.querySelector('input[name="cuentaDestinoId"]')?.value;
  const origen  = _cuenta(origenId);
  const destino = _cuenta(destinoId);
  if (!origen || !destino) return;
  wrap.outerHTML = renderParTransferencia(destino, origen);
  // El origen cambió: la sección del 4x1000 puede aparecer o desaparecer.
  _refrescarSeccionGMF();
}

/**
 * Lee el formulario, valida, confirma el sobregiro si el saldo no alcanza y
 * aplica el traslado atómico de MC.17a: descuenta la cuenta origen, acredita
 * la destino y guarda el registro en `S.transferencias` (historial, MC.17c lo
 * mostrará en el ledger de Movimientos). El saldo insuficiente NO bloquea el
 * envío (mismo criterio que `validarTransferencia`, MC.17a): se confirma con
 * el usuario, como el resto de flujos de la app que permiten sobregiro
 * consciente (ver `_guardarCompromiso`, "Registrar igual").
 */
async function _guardarTransferencia() {
  const form = document.getElementById('form-transferencia');
  if (!form) return;

  const datos = Object.fromEntries(new FormData(form));
  const errores = validarTransferencia(datos, S.cuentas ?? []);
  if (errores.length > 0) {
    mostrarErroresForm(form, errores);
    return;
  }

  const monto = Number(datos.monto);
  // GMF del retiro (MC.17d): solo si el origen NO está exento y el usuario dejó
  // marcado el descuento (checkbox de la sección, ausente = origen exento o
  // desmarcado). El chequeo de `origenSujetoAGMF` es la salvaguarda dura: nunca
  // se descuenta el 4x1000 de una cuenta exenta aunque el form dijera lo contrario.
  const aplicarGMF = datos.aplicarGMF === 'on' && origenSujetoAGMF(S.cuentas ?? [], datos.cuentaOrigenId);
  const costoGMF   = aplicarGMF ? costoGMFRetiro(monto) : 0;
  const totalRetiro = monto + costoGMF;

  if (!saldoSuficiente(S.cuentas ?? [], datos.cuentaOrigenId, totalRetiro)) {
    const origen = _cuenta(datos.cuentaOrigenId);
    const detalleGMF = costoGMF > 0 ? ` (incluye ${f(costoGMF)} de 4x1000)` : '';
    const ok = await confirmar({
      titulo:         'Saldo insuficiente',
      mensaje:        `${origen?.nombre ?? 'La cuenta de origen'} tiene ${f(origen?.saldo ?? 0)} y este retiro suma ${f(totalRetiro)}${detalleGMF}. La cuenta quedará en negativo. ¿Quieres continuar?`,
      confirmarTexto: 'Transferir igual',
      peligroso:      true,
    });
    if (!ok) return;
  }

  const transferencia = normalizarTransferencia(datos, costoGMF);
  const plan = calcularTransferencia(transferencia, S.cuentas ?? []);
  // Guard defensivo: no debería pasar tras validarTransferencia, pero calcularTransferencia
  // es la última palabra antes de tocar saldos (mismo criterio que su JSDoc en MC.17a).
  if (!plan) return;

  for (const { cuentaId, saldo } of plan.actualizaciones) {
    editar('cuentas', cuentaId, { saldo });
  }
  guardar('transferencias', transferencia);

  const overlay = document.getElementById('modal-transferencia');
  if (overlay) cerrarModal(overlay);

  updSaldo();
  announce(costoGMF > 0
    ? `Transferiste ${f(transferencia.monto)}. Se descontaron ${f(costoGMF)} de 4x1000.`
    : `Transferiste ${f(transferencia.monto)}.`);
}

// ── REGISTRO ─────────────────────────────────────────────────────

/** Registra los data-action del subsistema de transferencias. */
export function initAccionesTransferencias() {
  registrarAccion('abrir-transferencia',    _abrirTransferencia);
  registrarAccion('invertir-transferencia', _invertirTransferencia);
}

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
  normalizarTransferencia,
  calcularTransferencia,
} from '../logic/transferencias.js';
import { renderFormTransferencia, renderParTransferencia } from '../view.js';

/** Cuenta por id en S.cuentas, o undefined. */
function _cuenta(id) {
  return (S.cuentas ?? []).find(c => c.id === id);
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
  if (!saldoSuficiente(S.cuentas ?? [], datos.cuentaOrigenId, monto)) {
    const origen = _cuenta(datos.cuentaOrigenId);
    const ok = await confirmar({
      titulo:         'Saldo insuficiente',
      mensaje:        `${origen?.nombre ?? 'La cuenta de origen'} tiene ${f(origen?.saldo ?? 0)} y quieres transferir ${f(monto)}. La cuenta quedará en negativo. ¿Quieres continuar?`,
      confirmarTexto: 'Transferir igual',
      peligroso:      true,
    });
    if (!ok) return;
  }

  const transferencia = normalizarTransferencia(datos);
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
  announce(`Transferiste ${f(transferencia.monto)}.`);
}

// ── REGISTRO ─────────────────────────────────────────────────────

/** Registra los data-action del subsistema de transferencias. */
export function initAccionesTransferencias() {
  registrarAccion('abrir-transferencia',    _abrirTransferencia);
  registrarAccion('invertir-transferencia', _invertirTransferencia);
}

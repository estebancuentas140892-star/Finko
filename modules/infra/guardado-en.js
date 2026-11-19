/**
 * guardado-en.js - "¿Dónde lo guardas?" (AH.9, ADR 174 D2 a D4).
 *
 * La meta, la reserva y el fondo pueden decir en qué cuenta están y, si se
 * quiere, el nombre del bolsillo en el banco ("Nequi, bolsillo Viaje"). Es
 * solo referencia: ningún cálculo de saldo, patrimonio ni distribución lee
 * `guardadoEn`. Sin migración: sin el dato todo se ve como antes; si la
 * cuenta se elimina o se desactiva, el dato se ignora.
 *
 * Vive en infra porque lo usan cuatro dominios (metas, apartados, ahorro y
 * Mis cuentas) y ninguno importa a otro (ADN 10).
 *
 * El campo de los formularios es un bloque `data-opcional`: en el teléfono va
 * en "Agrega si quieres" (ADR 142 D5) y su fila del resumen dice "Nequi,
 * bolsillo Viaje" (el `[data-resumen-valor]` que se mantiene al día solo).
 */

import { esc } from './utils.js';
import { renderSelectorCuenta } from './cuenta-helper.js';

/** Largo máximo del nombre del bolsillo. */
export const BOLSILLO_MAX = 40;

/**
 * @typedef {{ cuentaId: string, bolsillo: string|null }} GuardadoEn
 */

/**
 * Lee "¿Dónde lo guardas?" de los datos crudos de un formulario
 * (`guardadoCuentaId`, `guardadoBolsillo`). `null` sin cuenta: el bolsillo
 * solo no dice dónde está.
 * @param {Record<string, unknown>} datos
 * @returns {GuardadoEn|null}
 */
export function leerGuardadoEn(datos) {
  const cuentaId = String(datos?.guardadoCuentaId ?? '').trim();
  if (!cuentaId) return null;
  const bolsillo = String(datos?.guardadoBolsillo ?? '').trim().slice(0, BOLSILLO_MAX);
  return { cuentaId, bolsillo: bolsillo || null };
}

/**
 * Lo que falla en "¿Dónde lo guardas?": una cuenta que ya no está activa o un
 * bolsillo demasiado largo. Vacío no es error (es opcional).
 * @param {Record<string, unknown>} datos
 * @param {Array} cuentas - S.cuentas
 * @returns {string[]}
 */
export function validarGuardadoEn(datos, cuentas) {
  const errores = [];
  const cuentaId = String(datos?.guardadoCuentaId ?? '').trim();
  if (cuentaId && !(cuentas ?? []).some(c => c?.id === cuentaId && c.activa !== false)) {
    errores.push('Esa cuenta ya no está activa: elige otra o deja el campo vacío.');
  }
  if (String(datos?.guardadoBolsillo ?? '').trim().length > BOLSILLO_MAX) {
    errores.push(`El nombre del bolsillo puede tener hasta ${BOLSILLO_MAX} letras.`);
  }
  return errores;
}

/**
 * La cuenta donde está guardado, si sigue activa.
 * @param {GuardadoEn|null|undefined} guardadoEn
 * @param {Array} cuentas
 * @returns {object|null}
 */
export function cuentaDeGuardado(guardadoEn, cuentas) {
  if (!guardadoEn?.cuentaId) return null;
  return (cuentas ?? []).find(c => c?.id === guardadoEn.cuentaId && c.activa !== false) ?? null;
}

/**
 * "Nequi, bolsillo Viaje" o "Nequi"; '' si no hay dato o la cuenta ya no
 * está.
 * @param {GuardadoEn|null|undefined} guardadoEn
 * @param {Array} cuentas
 * @returns {string}
 */
export function lugarGuardado(guardadoEn, cuentas) {
  const cuenta = cuentaDeGuardado(guardadoEn, cuentas);
  if (!cuenta) return '';
  return guardadoEn.bolsillo ? `${cuenta.nombre}, bolsillo ${guardadoEn.bolsillo}` : cuenta.nombre;
}

/**
 * Las metas, reservas y el fondo que dicen estar en una cuenta (ADR 174 D3).
 * @param {string} cuentaId
 * @param {{ metas?: Array, apartados?: Array, ahorro?: object }} estado
 * @returns {{ bolsas: Array<{ tipo: 'meta'|'reserva', nombre: string, bolsillo: string|null, monto: number }>,
 *             fondo: { bolsillo: string|null, monto: number }|null }}
 */
export function guardadoEnCuenta(cuentaId, { metas, apartados, ahorro } = {}) {
  const aqui = (x) => x?.guardadoEn?.cuentaId === cuentaId;
  const bolsas = [
    ...(metas ?? []).filter(aqui).map(m => ({ tipo: 'meta', nombre: m.nombre, bolsillo: m.guardadoEn.bolsillo ?? null, monto: Number(m.montoActual) || 0 })),
    ...(apartados ?? []).filter(aqui).map(a => ({ tipo: 'reserva', nombre: a.nombre, bolsillo: a.guardadoEn.bolsillo ?? null, monto: Number(a.montoActual) || 0 })),
  ];
  const f = ahorro?.fondoEmergencia;
  const montoFondo = (Number(f?.montoActual) || 0)
    + (Array.isArray(ahorro?.aportes) ? ahorro.aportes.reduce((s, a) => s + (Number(a?.monto) || 0), 0) : 0);
  const fondo = f?.activo && aqui(f) ? { bolsillo: f.guardadoEn.bolsillo ?? null, monto: montoFondo } : null;
  return { bolsas, fondo };
}

// ── EL CAMPO DEL FORMULARIO ──────────────────────────────────────

let _escuchando = false;

/**
 * Mantiene al día el valor del bloque para el resumen del teléfono: la
 * cuenta elegida y el bolsillo escrito. Un solo oyente para todos los
 * formularios.
 */
function _escuchar() {
  if (_escuchando || typeof document === 'undefined') return;
  _escuchando = true;
  const pintar = (e) => {
    const bloque = e.target?.closest?.('[data-guardado-en]');
    if (!bloque) return;
    const radio = bloque.querySelector('input[name="guardadoCuentaId"]:checked');
    const nombre = radio?.closest('label')?.querySelector('.cuenta-picker__nombre')?.textContent?.trim() ?? '';
    const bolsillo = bloque.querySelector('input[name="guardadoBolsillo"]')?.value?.trim() ?? '';
    const valor = bloque.querySelector('[data-resumen-valor]');
    if (valor) valor.textContent = nombre ? (bolsillo ? `${nombre}, bolsillo ${bolsillo}` : nombre) : '';
  };
  document.addEventListener('change', pintar);
  document.addEventListener('input', pintar);
}

/**
 * El bloque "¿Dónde lo guardas?" de un formulario: la cuenta (sin elegir de
 * entrada) y el nombre del bolsillo. '' sin cuentas activas.
 * @param {{ guardadoEn?: GuardadoEn|null, cuentas?: Array, prefijo: string }} opciones
 * @returns {string}
 */
export function htmlCampoGuardadoEn({ guardadoEn = null, cuentas = [], prefijo }) {
  const activas = (cuentas ?? []).filter(c => c && c.activa !== false);
  if (activas.length === 0) return '';
  _escuchar();
  const actual = cuentaDeGuardado(guardadoEn, activas);
  return `
      <div class="form-group guardado-en" data-guardado-en data-opcional="Dónde lo guardas" data-resumen="Guardado en">
        <span hidden data-resumen-valor>${esc(lugarGuardado(guardadoEn, activas))}</span>
        ${renderSelectorCuenta(activas, { label: '¿En qué cuenta lo guardas?', name: 'guardadoCuentaId', preseleccionar: false, selectedId: actual?.id ?? null, opcional: true })}
        <label for="${esc(prefijo)}-bolsillo" class="label">Nombre del bolsillo <span class="form-optional">Opcional</span></label>
        <input id="${esc(prefijo)}-bolsillo" name="guardadoBolsillo" class="input" type="text" maxlength="${BOLSILLO_MAX}"
               placeholder="Ej. Viaje, Colchón" autocomplete="off" value="${esc(actual ? (guardadoEn?.bolsillo ?? '') : '')}" />
        <p class="form-hint">Es para que sepas dónde está y lo compares con tu banco: no mueve dinero.</p>
      </div>`;
}

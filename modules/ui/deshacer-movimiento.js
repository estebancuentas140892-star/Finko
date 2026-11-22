/**
 * deshacer-movimiento.js - el recorrido de "Deshacer movimiento" (MOV.3 y
 * MOV.3b, [ADR 154](../../docs/DECISIONS/154-deshacer-un-movimiento.md)): el
 * único que quita un gasto, un ingreso o una transferencia de la app. Lo usan
 * Movimientos ("Deshacer movimiento") y las secciones dueñas ("Eliminar" de
 * Gastos y de Mis cuentas), cada una con sus palabras.
 *
 * El cálculo y la aplicación viven en `infra/deshacer.js`; acá, lo que ve el
 * usuario: el aviso si no es seguro, la confirmación con lo que de verdad va
 * a pasar, el recálculo al confirmar y el aviso al terminar.
 */

import { S } from '../core/state.js';
import { f } from '../infra/utils.js';
import { announce } from '../infra/a11y.js';
import { updSaldo } from '../infra/render.js';
import { planDeshacer, aplicarDeshacer, huellaPlan, mensajeDeshacer, efectosDeshacer } from '../infra/deshacer.js';
import { confirmar } from './confirm.js';
import { mostrarToast } from './toast.js';

/** Hay un deshacer en curso: un segundo toque no abre otra confirmación. */
let _enCurso = false;

/**
 * Pregunta y, si el usuario confirma, deshace la operación del registro `id`
 * con todas sus partes. Si no es seguro, lo dice con un solo botón y no toca
 * nada. Entre preguntar y aplicar se vuelve a calcular: si algo cambió, no se
 * aplica.
 *
 * @param {string} id - el id del registro (gasto, ingreso puntual o transferencia).
 * @param {{ titulo?: string, confirmarTexto?: string, listo?: string, aviso?: string,
 *   mensaje?: string, icono?: string, tarjeta?: string, apilado?: boolean, cuentaVisible?: string|null }} [palabras]
 *   Cómo lo dice la sección que lo pide. Movimientos: "Deshacer movimiento".
 *   GAS.15f (ADR 194 D2): con `mensaje`, la frase es esa; los efectos se
 *   agregan solo si van más allá de devolver el dinero a `cuentaVisible` (la
 *   que la tarjeta ya muestra): otras partes, una deuda, un pago que se reabre.
 * @returns {Promise<boolean>} true si se deshizo.
 */
export async function deshacerConConfirmacion(id, {
  titulo = 'Deshacer movimiento',
  confirmarTexto = 'Deshacer',
  listo = 'Movimiento deshecho',
  aviso = '',
  mensaje: mensajeFijo = '',
  icono = '',
  tarjeta = '',
  apilado = false,
  cuentaVisible = null,
} = {}) {
  if (!id || _enCurso) return false;
  _enCurso = true;
  try {
    const plan = planDeshacer(S, id);
    if (!plan.ok) {
      await confirmar({ titulo: 'No se puede deshacer', mensaje: plan.mensaje, confirmarTexto: 'Entendido', soloAceptar: true });
      return false;
    }
    // GAS.13b (ADR 188 D2): la papelera de un gasto dice para qué es antes
    // de lo que corrige; no promete devoluciones.
    let mensaje = `${aviso ? `${aviso} ` : ''}${mensajeDeshacer(plan, S)}`;
    if (mensajeFijo) {
      const cuentas = Object.keys(plan.cuentas);
      const simple = plan.registros.length === 1 && Object.keys(plan.deudas).length === 0
        && (plan.pendientes ?? []).length === 0 && cuentas.length <= 1 && (cuentas.length === 0 || cuentas[0] === cuentaVisible);
      const partes = plan.registros.length > 1 ? ` Se borran sus ${plan.registros.length} partes, una por cuenta.` : '';
      mensaje = simple ? mensajeFijo : `${mensajeFijo}${partes} ${efectosDeshacer(plan, S)}`.trim();
    }
    const ok = await confirmar({ titulo, mensaje, confirmarTexto, peligroso: true, icono, tarjeta, apilado });
    if (!ok) return false;

    const vigente = planDeshacer(S, id);
    if (huellaPlan(vigente) !== huellaPlan(plan)) {
      announce('Este movimiento cambió mientras lo confirmabas: no se deshizo nada. Revísalo y vuelve a intentarlo.', 'assertive');
      return false;
    }
    if (!aplicarDeshacer(vigente)) {
      mostrarToast({ titulo: 'No se pudo deshacer', detalle: 'Tus datos quedaron como estaban.', tono: 'peligro' });
      return false;
    }
    updSaldo();
    mostrarToast({ titulo: listo, detalle: `"${vigente.nombre}" de ${f(vigente.monto)} ya no está en tus registros.` });
    return true;
  } finally {
    _enCurso = false;
  }
}

/**
 * form-errors.js - feedback visible de errores de validacion en formularios.
 *
 * Antes: los dominios solo llamaban `announce(errores[0], 'assertive')` que es
 * solo para screen readers. Los usuarios sin a11y NO veian ningun feedback al
 * guardar un formulario invalido - parecia que el boton "Guardar" no hacia nada.
 *
 * ADR 123 D2 (tablero 3 del canvas movil: "errores debajo del campo, con icono
 * y texto visible, ademas de announce()"): cada error que se puede atar a un
 * campo se escribe debajo de ese campo, con el icono de alerta, y el campo
 * queda marcado (`.field-invalid`, `aria-invalid`, `aria-describedby`). Arriba
 * queda un resumen corto (cuantos campos revisar) y, en lista, solo los errores
 * que no tienen un campo al que atarse. El bloque y los errores se limpian
 * cuando el usuario empieza a tipear de nuevo.
 */

import { announce } from './a11y.js';
import { esc as _esc } from './utils.js';

const _ICONO = '<svg class="icon" aria-hidden="true"><use href="#i-alert"/></svg>';

/**
 * Qué campo nombra cada mensaje: [lo que dice el mensaje, campos posibles].
 * Lo específico va antes que lo general ("monto objetivo" antes que "monto").
 * Cada formulario llama distinto a su campo de dinero o de fecha, así que una
 * regla ofrece varios nombres y gana el primero que el formulario tenga; si no
 * tiene ninguno, se prueba la regla siguiente.
 */
const _CAMPOS = [
  ['monto objetivo',           ['montoObjetivo']],
  ['límite del mes',           ['montoMensual', 'limite']],
  ['monto mensual',            ['montoMensual', 'limite']],
  ['compra pequeña',           ['tope']],
  ['cupo',                     ['cupoTotal']],
  ['cuota de manejo',          ['cuotaManejoMonto']],
  ['cuota mensual',            ['cuotaMensual']],
  ['saldo total',              ['saldoTotal']],
  ['día de cobro',             ['cuotaManejoDia']],
  ['día de pago',              ['diaPago']],
  ['dia de pago',              ['diaPago']],
  ['unidad de tasa',           ['tasaUnidad']],
  ['tasa',                     ['tasa', 'tasaEA']],
  ['fecha pactada',            ['fechaLimite']],
  ['fecha objetivo',           ['fechaObjetivo']],
  ['fecha',                    ['fecha', 'fechaInicio']],
  ['frecuencia de aporte',     ['frecuenciaAporte']],
  ['frecuencia',               ['frecuencia']],
  ['cuenta de destino',        ['cuentaDestinoId']],
  ['cuenta de origen',         ['cuentaOrigenId']],
  ['débito automático',        ['cuentaDebitoId']],
  ['cuenta',                   ['cuentaId']],
  ['tipo de llave',            ['tipoLlave']],
  ['tipo',                     ['tipo']],
  ['banco',                    ['banco']],
  ['billetera',                ['banco']],
  ['nombre para tu categor',   ['categoriaNuevaNombre']],
  ['categoría con ese nombre', ['categoriaNuevaNombre']],
  ['categor',                  ['categoria']],
  ['persona',                  ['persona']],
  ['nombre',                   ['nombre', 'persona']],
  ['descripci',                ['descripcion']],
  ['monto',                    ['monto', 'montoObjetivo', 'montoMensual']],
  ['saldo',                    ['saldo']],
  ['edad',                     ['edad']],
  ['años',                     ['edad']],
  ['dibujo',                   ['dibujo']],
];

/**
 * Los campos del formulario que nombra un mensaje de error (todos los de ese
 * `name`: un grupo de radios son varios). Vacío si no nombra ninguno que el
 * formulario tenga.
 * @param {HTMLFormElement} form
 * @param {string} mensaje
 * @returns {HTMLElement[]}
 */
function _camposDeError(form, mensaje) {
  const m = mensaje.toLowerCase();
  for (const [dice, nombres] of _CAMPOS) {
    if (!m.includes(dice)) continue;
    for (const nombre of nombres) {
      const campos = [...form.querySelectorAll(`[name="${nombre}"]`)];
      if (campos.length > 0) return campos;
    }
  }
  return [];
}

/** Quita los errores de un formulario: el resumen, los de cada campo y las marcas. */
function _limpiar(form) {
  form.querySelector('.form-errors')?.remove();
  form.querySelectorAll('.form-error').forEach(el => el.remove());
  form.querySelectorAll('.field-invalid').forEach(el => el.classList.remove('field-invalid'));
  form.querySelectorAll('[aria-invalid="true"]').forEach((el) => {
    el.removeAttribute('aria-invalid');
    const quedan = (el.getAttribute('aria-describedby') ?? '').split(/\s+/)
      .filter(id => id && !id.includes('-error-'));
    if (quedan.length) el.setAttribute('aria-describedby', quedan.join(' '));
    else el.removeAttribute('aria-describedby');
  });
}

/**
 * Muestra los errores de validacion visualmente dentro de un formulario.
 * Llama tambien `announce()` para que los lectores de pantalla los escuchen.
 *
 * @param {HTMLFormElement} form      Formulario donde insertar el bloque de errores.
 * @param {string[]}        errores   Array de mensajes de error (de validarX()).
 * @param {string}          [titulo]  Encabezado del bloque. El default habla de
 *   campos que faltan, que es el caso de la mayoría de formularios; un
 *   formulario donde el error no es "falta algo" (ej. un PIN que no coincide,
 *   CFG.5a) pasa el suyo en vez de heredar una frase que miente.
 */
export function mostrarErroresForm(form, errores, titulo) {
  if (!form || !Array.isArray(errores) || errores.length === 0) return;

  // Quitar lo anterior si existe (re-render).
  _limpiar(form);

  // Cada error que tiene campo va debajo de ese campo.
  const sueltos = [];
  const marcados = [];
  const prefijo = form.id || 'form';
  errores.forEach((error, i) => {
    const campos = _camposDeError(form, error);
    // Un campo oculto (el banco elegido en su selector, la cuenta única) no se
    // marca ni recibe el foco, pero su grupo sí es el lugar del error. Suelto
    // en el formulario, sin grupo, no tiene lugar y el error va arriba.
    const visibles = campos.filter(c => c.type !== 'hidden');
    const lugar = (visibles[0] ?? campos[0])?.closest('.form-group, fieldset, .monto-hero') ?? visibles[0]?.parentElement;
    if (!lugar) { sueltos.push(error); return; }
    const id = `${prefijo}-error-${i}`;
    lugar.insertAdjacentHTML('beforeend', `<p class="form-error" id="${id}">${_ICONO}<span>${_esc(error)}</span></p>`);
    for (const campo of visibles) {
      campo.classList.add('field-invalid');
      campo.setAttribute('aria-invalid', 'true');
      campo.setAttribute('aria-describedby', [campo.getAttribute('aria-describedby'), id].filter(Boolean).join(' '));
    }
    marcados.push(visibles[0] ?? lugar);
  });

  // Arriba, el resumen: los que no tienen campo van en lista; los demás ya
  // están debajo del suyo y no se repiten.
  const box = document.createElement('div');
  box.className = 'form-errors';
  box.setAttribute('role', 'alert');
  let encabezado = titulo;
  if (encabezado == null && sueltos.length === 0) {
    encabezado = errores.length === 1 ? 'Revisa el campo marcado.' : `Revisa los ${errores.length} campos marcados.`;
  } else if (encabezado == null) {
    // Con campos marcados, la lista de arriba no los cuenta a todos: un
    // "Faltan 3 campos" sobre una lista de uno no cuadraría.
    encabezado = errores.length === 1 || marcados.length > 0
      ? 'Falta información para guardar:'
      : `Faltan ${errores.length} campos por completar:`;
  }
  box.innerHTML = `
    <span class="form-errors__icon" aria-hidden="true">${_ICONO}</span>
    <div class="form-errors__content">
      <p class="form-errors__title">${_esc(encabezado)}</p>
      ${sueltos.length > 0 ? `<ul class="form-errors__list">
        ${sueltos.map(e => `<li>${_esc(e)}</li>`).join('')}
      </ul>` : ''}
    </div>`;

  // Insertar al principio del form, antes del primer hijo.
  form.insertBefore(box, form.firstChild);

  // El foco va al primer campo marcado: el navegador lo trae a la vista.
  const primero = marcados.find(el => el.matches?.('input, select, textarea, button'));
  if (primero) setTimeout(() => primero.focus({ preventScroll: false }), 0);

  // A11y: anunciar el primer error.
  announce(errores[0], 'assertive');

  // Limpiar errores al editar - listener una sola vez.
  if (!form.dataset.formErrorsBound) {
    form.dataset.formErrorsBound = '1';
    form.addEventListener('input', () => _limpiar(form), { passive: true });
  }
}

/** Limpia el bloque de errores manualmente (ej. al cerrar el modal). */
export function limpiarErroresForm(form) {
  if (!form) return;
  _limpiar(form);
}

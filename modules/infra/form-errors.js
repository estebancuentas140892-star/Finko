/**
 * form-errors.js - feedback visible de errores de validacion en formularios.
 *
 * Antes: los dominios solo llamaban `announce(errores[0], 'assertive')` que es
 * solo para screen readers. Los usuarios sin a11y NO veian ningun feedback al
 * guardar un formulario invalido - parecia que el boton "Guardar" no hacia nada.
 *
 * Ahora: ademas del announce, se inserta un bloque .form-errors visible con
 * los mensajes en rojo, y se marca el primer campo problematico con clase
 * .field-invalid (estilo rojo de borde). El bloque se limpia automaticamente
 * cuando el usuario empieza a tipear de nuevo.
 */

import { announce } from './a11y.js';

/**
 * Mapea un mensaje de error a la clave del campo del formulario.
 * Heuristico basado en palabras clave del mensaje.
 * @param {string} mensaje
 * @returns {string|null}
 */
function _campoDeError(mensaje) {
  const m = mensaje.toLowerCase();
  if (m.includes('nombre'))         return 'nombre';
  if (m.includes('descripci'))      return 'descripcion';
  if (m.includes('monto'))          return 'monto';
  if (m.includes('categor'))        return 'categoria';
  if (m.includes('fecha pactada'))  return 'fechaPactada';
  if (m.includes('fecha'))          return 'fecha';
  if (m.includes('frecuencia'))     return 'frecuencia';
  if (m.includes('tipo'))           return 'tipo';
  if (m.includes('banco') || m.includes('billetera')) return 'banco';
  if (m.includes('saldo pendiente')) return 'saldoPendiente';
  if (m.includes('saldo'))          return 'saldo';
  if (m.includes('tasa'))           return 'tasaEA';
  if (m.includes('día de pago') || m.includes('dia de pago')) return 'diaPago';
  return null;
}

/**
 * Muestra los errores de validacion visualmente dentro de un formulario.
 * Llama tambien `announce()` para que los lectores de pantalla los escuchen.
 *
 * @param {HTMLFormElement} form      Formulario donde insertar el bloque de errores.
 * @param {string[]}        errores   Array de mensajes de error (de validarX()).
 */
export function mostrarErroresForm(form, errores) {
  if (!form || !Array.isArray(errores) || errores.length === 0) return;

  // Quitar bloque anterior si existe (re-render).
  form.querySelector('.form-errors')?.remove();
  form.querySelectorAll('.field-invalid').forEach(el => el.classList.remove('field-invalid'));

  // Crear bloque visible.
  const box = document.createElement('div');
  box.className = 'form-errors';
  box.setAttribute('role', 'alert');
  const titulo = errores.length === 1
    ? 'Falta información para guardar:'
    : `Faltan ${errores.length} campos por completar:`;
  box.innerHTML = `
    <span class="form-errors__icon" aria-hidden="true">⚠️</span>
    <div class="form-errors__content">
      <p class="form-errors__title">${titulo}</p>
      <ul class="form-errors__list">
        ${errores.map(e => `<li>${_esc(e)}</li>`).join('')}
      </ul>
    </div>`;

  // Insertar al principio del form, antes del primer hijo.
  form.insertBefore(box, form.firstChild);

  // Marcar el campo del primer error (mejor heuristica que tenemos).
  const campo = _campoDeError(errores[0]);
  if (campo) {
    const input = form.querySelector(`[name="${campo}"]`);
    if (input) {
      input.classList.add('field-invalid');
      // Hacer scroll y focus despues de un tick para que el DOM se actualice.
      setTimeout(() => {
        input.focus({ preventScroll: false });
      }, 0);
    }
  }

  // A11y: anunciar el primer error.
  announce(errores[0], 'assertive');

  // Limpiar errores al editar - listener una sola vez.
  if (!form.dataset.formErrorsBound) {
    form.dataset.formErrorsBound = '1';
    form.addEventListener('input', () => {
      form.querySelector('.form-errors')?.remove();
      form.querySelectorAll('.field-invalid').forEach(el => el.classList.remove('field-invalid'));
    }, { passive: true });
  }
}

/** Limpia el bloque de errores manualmente (ej. al cerrar el modal). */
export function limpiarErroresForm(form) {
  if (!form) return;
  form.querySelector('.form-errors')?.remove();
  form.querySelectorAll('.field-invalid').forEach(el => el.classList.remove('field-invalid'));
}

function _esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

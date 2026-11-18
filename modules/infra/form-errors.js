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
 * queda marcado (`.field-invalid`, `aria-invalid`, `aria-describedby`).
 *
 * ADR 142 D9 (FORM.2a), que cambia el 123 D2:
 * - Corregir un campo limpia solo ese campo; los demas errores siguen.
 * - El aviso de arriba aparece solo con dos errores o mas (o con uno que no
 *   tiene campo al que atarse) y lleva al primero ("Ir al primero").
 * - Se valida al salir del dato: despues del primer intento de guardar, el
 *   formulario que pasa `revalidar` vuelve a mirar cada campo que se deja.
 */

import { announce } from './a11y.js';
import { esc as _esc } from './utils.js';

const _ICONO = '<svg class="icon" aria-hidden="true"><use href="#i-alert"/></svg>';

/**
 * Qué campo nombra cada mensaje: [lo que dice el mensaje, campos posibles].
 * Lo específico va antes que lo general ("cuánto necesitas reunir" antes que
 * "cuánto"). Cada formulario llama distinto a su campo de dinero o de fecha,
 * así que una regla ofrece varios nombres y gana el primero que el formulario
 * tenga; si no tiene ninguno, se prueba la regla siguiente. Un mensaje
 * reescrito debe conservar una de estas frases o sumar la suya acá.
 */
const _CAMPOS = [
  ['necesidad o un deseo',     ['caracter']],
  ['cuánto necesitas reunir',  ['montoObjetivo']],
  ['monto objetivo',           ['montoObjetivo']],
  ['ya tienes apartado',       ['montoActual']],
  ['quieres apartar',          ['compromisoMensual']],
  ['cuántos meses',            ['metaMeses']],
  ['límite del mes',           ['montoMensual', 'limite']],
  ['monto mensual',            ['montoMensual', 'limite']],
  ['compra pequeña',           ['tope']],
  ['cupo',                     ['cupoTotal']],
  ['cuota de manejo',          ['cuotaManejoMonto']],
  ['cuánto pagas cada mes',    ['cuotaMensual']],
  ['cuota mensual',            ['cuotaMensual']],
  ['cuánto debes',             ['saldoTotal']],
  ['saldo total',              ['saldoTotal']],
  ['día de cobro',             ['cuotaManejoDia']],
  ['día de pago',              ['diaPago']],
  ['dia de pago',              ['diaPago']],
  ['un día del',               ['diaPago']],
  ['tasa es al año',           ['tasaUnidad']],
  ['unidad de tasa',           ['tasaUnidad']],
  ['tasa',                     ['tasa', 'tasaEA']],
  ['% al año',                 ['tasa', 'tasaEA']],
  ['% al mes',                 ['tasa']],
  ['plazo',                    ['plazoMeses']],
  ['fecha pactada',            ['fechaLimite']],
  ['fecha objetivo',           ['fechaObjetivo']],
  ['para cuándo',              ['fechaObjetivo', 'fechaLimite']],
  ['fecha',                    ['fecha', 'fechaInicio']],
  ['frecuencia de aporte',     ['frecuenciaAporte']],
  ['cada cuánto',              ['frecuenciaAporte', 'frecuencia']],
  ['frecuencia',               ['frecuencia']],
  ['de qué cuenta sale',       ['cuentaOrigenId', 'cuentaId']],
  ['a qué cuenta entra',       ['cuentaDestinoId']],
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
  ['en qué fue',               ['categoria']],
  ['categor',                  ['categoria']],
  ['a quién',                  ['persona']],
  ['persona',                  ['persona']],
  ['nombre',                   ['nombre', 'persona', 'descripcion']],
  ['descripci',                ['descripcion']],
  ['escribe qué es',           ['descripcion']],
  ['cuánto',                   ['monto', 'montoObjetivo', 'montoMensual']],
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

/**
 * Lo que cada formulario recuerda de sus errores: el título propio del aviso,
 * los errores sin campo y cómo volver a validar.
 * @type {WeakMap<HTMLFormElement, { titulo?: string, sueltos: string[], revalidar?: () => string[], n: number }>}
 */
const _estado = new WeakMap();

/** Desata un campo de sus errores: marcas y `aria-describedby`, sin perder su pista. */
function _desmarcar(el) {
  el.classList.remove('field-invalid');
  el.removeAttribute('aria-invalid');
  const quedan = (el.getAttribute('aria-describedby') ?? '').split(/\s+/)
    .filter(id => id && !id.includes('-error-'));
  if (quedan.length) el.setAttribute('aria-describedby', quedan.join(' '));
  else el.removeAttribute('aria-describedby');
}

/** Quita los errores de un formulario: el resumen, los de cada campo y las marcas. */
function _limpiar(form) {
  form.querySelector('.form-errors')?.remove();
  form.querySelectorAll('.form-error').forEach(el => el.remove());
  form.querySelectorAll('.field-invalid, [aria-invalid="true"]').forEach(_desmarcar);
  const estado = _estado.get(form);
  if (estado) estado.sueltos = [];
}

/** Quita el error de un campo (por su `name`) y solo ese. */
function _limpiarCampo(form, nombre) {
  form.querySelectorAll(`.form-error[data-campo="${CSS.escape(nombre)}"]`).forEach(el => el.remove());
  form.querySelectorAll(`[name="${CSS.escape(nombre)}"]`).forEach(_desmarcar);
}

/**
 * Escribe un error debajo de su campo y lo marca. Si no tiene campo al que
 * atarse, devuelve `null` y el error va al aviso de arriba.
 * @returns {HTMLElement | null} El campo que recibe el foco, o el lugar.
 */
function _pintarError(form, error) {
  const campos = _camposDeError(form, error);
  // Un campo oculto (el banco elegido en su selector, la cuenta única) no se
  // marca ni recibe el foco, pero su grupo sí es el lugar del error. Suelto
  // en el formulario, sin grupo, no tiene lugar y el error va arriba.
  const visibles = campos.filter(c => c.type !== 'hidden');
  const lugar = (visibles[0] ?? campos[0])?.closest('.form-group, fieldset, .monto-hero') ?? visibles[0]?.parentElement;
  if (!lugar) return null;
  const estado = _estado.get(form);
  const id = `${form.id || 'form'}-error-${estado.n++}`;
  const nombre = campos[0].getAttribute('name');
  lugar.insertAdjacentHTML('beforeend',
    `<p class="form-error" id="${id}" data-campo="${_esc(nombre)}">${_ICONO}<span>${_esc(error)}</span></p>`);
  for (const campo of visibles) {
    campo.classList.add('field-invalid');
    campo.setAttribute('aria-invalid', 'true');
    campo.setAttribute('aria-describedby', [campo.getAttribute('aria-describedby'), id].filter(Boolean).join(' '));
  }
  return visibles[0] ?? lugar;
}

/** El primer campo marcado que puede recibir el foco. */
const _primerMarcado = (form) => form.querySelector('.field-invalid');

/**
 * Pinta, rehace o quita el aviso de arriba según lo que quede: aparece con
 * dos errores o más, o con alguno que no tiene campo. Lleva al primero.
 */
function _resumen(form) {
  const previo = form.querySelector('.form-errors');
  const estado = _estado.get(form);
  const marcados = form.querySelectorAll('.form-error').length;
  const sueltos = estado?.sueltos ?? [];
  const total = marcados + sueltos.length;
  if (sueltos.length === 0 && total < 2) { previo?.remove(); return; }

  const encabezado = estado?.titulo
    ?? (sueltos.length === 0 ? `Revisa ${total} datos para guardar.` : 'Antes de guardar:');
  // Si dice lo mismo, no se rehace: un `role="alert"` nuevo se vuelve a leer.
  const clave = JSON.stringify([encabezado, sueltos, marcados > 0]);
  if (previo?.dataset.clave === clave) return;
  previo?.remove();
  const box = document.createElement('div');
  box.dataset.clave = clave;
  box.className = 'form-errors';
  box.setAttribute('role', 'alert');
  box.innerHTML = `
    <span class="form-errors__icon" aria-hidden="true">${_ICONO}</span>
    <div class="form-errors__content">
      <p class="form-errors__title">${_esc(encabezado)}</p>
      ${sueltos.length > 0 ? `<ul class="form-errors__list">
        ${sueltos.map(e => `<li>${_esc(e)}</li>`).join('')}
      </ul>` : ''}
    </div>
    ${marcados > 0 ? '<button type="button" class="btn btn-ghost btn-sm form-errors__ir">Ir al primero</button>' : ''}`;
  box.querySelector('.form-errors__ir')?.addEventListener('click', () => _primerMarcado(form)?.focus());
  form.insertBefore(box, form.firstChild);
}

/** Al corregir un campo: se limpia ese campo; lo que no tiene campo, también. */
function _alEditar(e) {
  const form = e.currentTarget;
  const estado = _estado.get(form);
  const nombre = e.target?.getAttribute?.('name');
  const suyo = nombre && form.querySelector(`.form-error[data-campo="${CSS.escape(nombre)}"]`);
  if (!suyo && !estado?.sueltos.length) return;
  if (suyo) _limpiarCampo(form, nombre);
  estado.sueltos = [];
  _resumen(form);
}

/** Los textos de error que hoy muestra un campo. */
const _erroresDe = (form, nombre) =>
  [...form.querySelectorAll(`.form-error[data-campo="${CSS.escape(nombre)}"]`)].map(p => p.textContent);

/**
 * Al salir de un campo, después del primer intento de guardar: se vuelve a
 * validar ese dato y solo ese. El aviso de arriba se rehace, sin mover el foco.
 */
function _alSalir(e) {
  const form = e.currentTarget;
  const estado = _estado.get(form);
  const nombre = e.target?.getAttribute?.('name');
  if (!estado?.revalidar || !nombre) return;
  // Un formulario de una hoja que se cerró ya no muestra nada.
  if (form.closest('.modal-overlay') && !form.closest('.modal-overlay[data-open]')) return;
  const nuevos = estado.revalidar().filter(error => _camposDeError(form, error)[0]?.getAttribute('name') === nombre);
  if (JSON.stringify(nuevos) === JSON.stringify(_erroresDe(form, nombre))) return;
  _limpiarCampo(form, nombre);
  nuevos.forEach(error => _pintarError(form, error));
  _resumen(form);
}

/**
 * Muestra los errores de validacion visualmente dentro de un formulario.
 * Llama tambien `announce()` para que los lectores de pantalla los escuchen.
 *
 * @param {HTMLFormElement} form      Formulario donde insertar el bloque de errores.
 * @param {string[]}        errores   Array de mensajes de error (de validarX()).
 * @param {string}          [titulo]  Encabezado del aviso de arriba, cuando lo
 *   hay. Un formulario donde el error no es de un campo (ej. un PIN que no
 *   coincide, CFG.5a) pasa el suyo.
 * @param {() => string[]}  [revalidar] Los errores del formulario tal como
 *   está ahora. Con ella, cada campo se vuelve a validar al dejarlo (ADR 142 D9).
 */
export function mostrarErroresForm(form, errores, titulo, revalidar) {
  if (!form || !Array.isArray(errores) || errores.length === 0) return;

  if (!_estado.has(form)) _estado.set(form, { sueltos: [], n: 0 });
  const estado = _estado.get(form);

  // Quitar lo anterior si existe (re-render).
  _limpiar(form);
  estado.n = 0;
  estado.titulo = titulo ?? undefined;
  estado.revalidar = revalidar ?? estado.revalidar;

  // Cada error que tiene campo va debajo de ese campo.
  const marcados = [];
  for (const error of errores) {
    const lugar = _pintarError(form, error);
    if (lugar) marcados.push(lugar);
    else estado.sueltos.push(error);
  }

  _resumen(form);

  // El foco va al primer campo marcado: el navegador lo trae a la vista.
  const primero = marcados.find(el => el.matches?.('input, select, textarea, button'));
  if (primero) setTimeout(() => primero.focus({ preventScroll: false }), 0);

  // A11y: anunciar el primer error.
  announce(errores[0], 'assertive');

  // Corregir limpia ese campo; salir de él lo vuelve a validar. Una sola vez.
  if (!form.dataset.formErrorsBound) {
    form.dataset.formErrorsBound = '1';
    form.addEventListener('input', _alEditar, { passive: true });
    form.addEventListener('change', _alEditar, { passive: true });
    form.addEventListener('focusout', _alSalir, { passive: true });
  }
}

/** Limpia el bloque de errores manualmente (ej. al cerrar el modal). */
export function limpiarErroresForm(form) {
  if (!form) return;
  _limpiar(form);
}

/**
 * tesoreria/acciones/cuentas.js - handlers de cuentas: crear/editar/eliminar, cuota de
 * manejo sincronizada como compromiso, campos por clase de banco y bank picker.
 *
 * Sub-modulo de tesoreria/index.js. Reglas de la capa:
 * - Handlers de data-action y wiring de formularios del subsistema.
 * - Coordina logic/ + views/ sin hacer calculos ni generar HTML aqui.
 */

import { htmlMiniHoja, abrirMiniHoja, cerrarMiniHoja } from '../../../ui/mini-hoja.js';
import { miles } from '../../../infra/miles.js';
import { S, EventBus } from '../../../core/state.js';
import { guardar, editar, eliminar } from '../../../infra/crud.js';
import { registrarAccion } from '../../../ui/actions.js';
import { abrirModal, cerrarModal, resetModal } from '../../../ui/modales.js';
import { confirmar } from '../../../ui/confirm.js';
import { updSaldo, renderSmart } from '../../../infra/render.js';
import { save } from '../../../core/storage.js';
import { announce } from '../../../infra/a11y.js';
import { mostrarErroresForm } from '../../../infra/form-errors.js';
import { esc as _esc, hoy, f } from '../../../infra/utils.js';
import { puedeSerMarcada, esBajoMonto, TOPE_GMF_MARCADA } from '../../../infra/gmf.js';
import { BANCOS_CO, TIPOS_POR_CLASE, MAX_LLAVES_CUENTA } from '../../../core/constants.js';
import { copiarTexto } from '../../../infra/portapapeles.js';
import { mostrarToast } from '../../../ui/toast.js';
import { wireIconoPicker, resetIconoPicker, setIconoPickerValor } from '../../../infra/icon-picker.js';
import { iconoCategoria } from '../../../infra/icons.js';
import {
  validarCuenta,
  normalizarCuenta,
  compromisoDesdeCuotaManejo,
  compromisoCuotaManejoDeCuenta,
  textoLlave,
} from '../logic/cuentas.js';
import { renderFormCuenta, renderTesoreria, htmlDetalleCuenta, htmlFilaLlave, datosParaRecibir, nombreDatoRecibir } from '../view.js';
import { alternarMontosOcultos } from '../../../infra/privacidad.js';

// ── HANDLERS DE ACCIÓN ───────────────────────────────────────────

/** Abre el modal y resetea el formulario (modo creacion). */
function _nuevaCuenta() {
  const overlay = document.getElementById('modal-cuenta');
  if (!overlay) return;
  resetModal(overlay);
  // resetModal limpia inputs/selects pero NO el display visual del bank-picker
  // (que vive fuera del overlay tras moverlo a body). Hay que resetearlo aparte
  // para no mostrar el banco anterior con el hidden value ya vacio.
  _resetBankPicker();

  // Limpiar marcador de edicion si quedo de una sesion anterior.
  const form = document.getElementById('form-cuenta');
  if (form) {
    delete form.dataset.id;
    // ADR 142 D5: en el teléfono, de a una pregunta desde la primera.
    form.dataset.preguntas = 'Nueva cuenta';
    form.dataset.preguntasInicio = '';
    _pintarLlaves(form, []);
  }
  // resetModal desmarca checkboxes pero no dispara `change`, así que
  // sincronizamos manualmente el estado de los campos según la clase del banco
  // (ninguno seleccionado tras resetModal → tipo oculto, resto visible).
  _toggleCamposPorClase();
  const titulo = overlay.querySelector('.modal__title');
  if (titulo) titulo.textContent = 'Nueva cuenta';

  abrirModal(overlay);
}

/**
 * Restaura el bank-picker a su estado inicial:
 * - El display visual vuelve al placeholder.
 * - Se quita aria-selected de todos los items.
 *
 * El input hidden name="banco" ya lo limpia resetModal() (vive dentro del overlay).
 */
function _resetBankPicker() {
  const display = document.querySelector('#modal-cuenta .bank-picker__display');
  if (display) {
    display.innerHTML = '<span class="bank-picker__placeholder">Seleccionar…</span>';
  }
  // Items estan fuera del overlay (en body), por eso hay que buscarlos por id.
  document.querySelectorAll('#banco-list [role="option"]').forEach(item => {
    item.setAttribute('aria-selected', 'false');
  });
  // CAT.2e: el form de cuenta es un singleton reusado (como Metas, no como
  // Gastos/Deudas/Apartados): resetModal() limpia el input oculto pero no el
  // estado VISUAL del picker, hay que resetearlo aparte.
  resetIconoPicker(document.querySelector('#modal-cuenta [data-icono-picker="cuenta-icono"]'));
}

/**
 * GMF.1 (ADR 165): "¿Es tu cuenta marcada exenta del 4x1000?" se pregunta
 * solo donde puede haberla (ahorros de un banco, "Otro" o una billetera que
 * no es de bajo monto). Oculta, sus radios quedan deshabilitados y fuera de
 * FormData. La pista dice cuál es la marcada hoy, si es otra.
 */
function _sincronizarGMF() {
  const form = document.getElementById('form-cuenta');
  const grupo = document.getElementById('form-group-4x1000');
  if (!form || !grupo) return;
  const banco = form.querySelector('[name="banco"]')?.value ?? '';
  const clase = BANCOS_CO.find(b => b.id === banco)?.clase ?? null;
  const tipo  = clase === 'billetera' ? banco : (form.querySelector('[name="tipo"]')?.value ?? '');
  const ver   = Boolean(banco) && puedeSerMarcada({ banco, tipo });
  grupo.hidden = !ver;
  for (const r of grupo.querySelectorAll('input[name="exenta4x1000"]')) {
    r.disabled = !ver;
    if (!ver) r.checked = false;
  }
  const hint = document.getElementById('cuenta-4x1000-hint');
  const otra = (S.cuentas ?? []).find(c => c.exenta4x1000 === true && c.activa !== false && c.id !== form.dataset.id);
  if (hint) {
    hint.textContent = otra
      ? `Tu cuenta marcada hoy es ${otra.nombre}. Solo puede haber una: no paga 4x1000 hasta ${f(TOPE_GMF_MARCADA)} al mes.`
      : `Casi siempre es la de nómina y solo puede haber una: no paga 4x1000 hasta ${f(TOPE_GMF_MARCADA)} al mes. Las demás pagan en cada retiro.`;
  }
}

/**
 * Los datos del formulario: lo de `FormData` y la lista de llaves (MC.19), que
 * se lee de sus filas porque cada una tiene su propio grupo de radios.
 * @param {HTMLFormElement} form
 */
function _leerDatosCuenta(form) {
  const datos = Object.fromEntries(new FormData(form));
  datos.llaves = [...form.querySelectorAll('[data-llave-fila]')].map(fila => ({
    tipo:  fila.querySelector('input[type="radio"]:checked')?.value ?? '',
    valor: fila.querySelector('[name="llaveValor"]')?.value ?? '',
  }));
  return datos;
}

/**
 * Las filas de llaves del formulario (MC.19, ADR 170 D6): las guardadas, o
 * una vacía para escribir la primera. "Agregar otra llave" se va al llegar a 7.
 * @param {HTMLFormElement} form
 * @param {Array<{tipo: string, valor: string}>} llaves
 */
function _pintarLlaves(form, llaves) {
  const lista = form.querySelector('[data-llaves-lista]');
  if (!lista) return;
  const filas = (Array.isArray(llaves) && llaves.length ? llaves : [{}]);
  lista.innerHTML = filas.map(l => htmlFilaLlave(l)).join('');
  _sincronizarLlaves(form);
}

/** El botón de agregar se esconde con 7 llaves; cada valor pide su teclado. */
function _sincronizarLlaves(form) {
  const filas = form.querySelectorAll('[data-llave-fila]');
  const agregar = form.querySelector('[data-action="cuenta-llave-agregar"]');
  if (agregar) agregar.hidden = filas.length >= MAX_LLAVES_CUENTA;
  for (const fila of filas) {
    const tipo = fila.querySelector('input[type="radio"]:checked')?.value;
    const campo = fila.querySelector('[name="llaveValor"]');
    if (!campo) continue;
    campo.inputMode = tipo === 'Celular' ? 'tel' : tipo === 'Correo' ? 'email' : 'text';
    campo.placeholder = _EJEMPLO_LLAVE[tipo] ?? 'Ej. 300 123 4567, @maria123';
  }
}

const _EJEMPLO_LLAVE = {
  'Celular':      'Ej. 300 123 4567',
  'Documento':    'Ej. 1020304050',
  'Correo':       'Ej. nombre@correo.com',
  'Alfanumérica': 'Ej. @maria123',
  'Otro':         'La llave como te la dio tu banco',
};

/** Lo que `validarCuenta` no sabe: la pregunta del 4x1000, si está a la vista. */
function _validarConGMF(form, datos) {
  const errores = validarCuenta(datos, { cuentas: S.cuentas ?? [], idEdit: form.dataset.id || null });
  const grupo = document.getElementById('form-group-4x1000');
  if (grupo && !grupo.hidden && datos.exenta4x1000 !== 'si' && datos.exenta4x1000 !== 'no') {
    errores.push('Dinos si es tu cuenta marcada exenta del 4x1000.');
  }
  return errores;
}

/** Lee el formulario, valida, guarda (o edita) y actualiza el DOM. */
async function _guardarCuenta() {
  const form = document.getElementById('form-cuenta');
  if (!form) return;

  const datos = _leerDatosCuenta(form);
  const errores = _validarConGMF(form, datos);

  if (errores.length > 0) {
    mostrarErroresForm(form, errores, undefined, () => _validarConGMF(form, _leerDatosCuenta(form)));
    return;
  }

  const idEdit  = form.dataset.id || null;
  const cuenta  = normalizarCuenta(datos);

  // GMF.1: un Nequi o Daviplata que antes decía pagar 4x1000 lo sigue
  // diciendo al editarlo (el formulario ya no trae esa casilla).
  const antes = idEdit ? (S.cuentas ?? []).find(c => c.id === idEdit) : null;
  if (antes && antes.banco === cuenta.banco && !esBajoMonto(antes) && esBajoMonto(cuenta)) {
    cuenta.bajoMonto = false;
    cuenta.aplica4x1000 = true;
  }

  // GMF.1 (ADR 165): una sola marcada. Si ya hay otra, se pregunta si la
  // marca pasa a esta; la de antes queda pagando en cada retiro.
  if (cuenta.exenta4x1000 === true) {
    const otra = (S.cuentas ?? []).find(c => c.exenta4x1000 === true && c.activa !== false && c.id !== idEdit);
    if (otra) {
      const ok = await confirmar({
        titulo:         'Cuenta marcada',
        mensaje:        `${otra.nombre} es hoy tu cuenta marcada exenta del 4x1000. Solo puede haber una: ¿la cambiamos por esta?`,
        confirmarTexto: 'Sí, esta',
        cancelarTexto:  'Dejar la de antes',
      });
      if (!ok) return;
      editar('cuentas', otra.id, { exenta4x1000: false, aplica4x1000: true });
    }
  }

  let persistida;
  if (idEdit) {
    // Modo edicion: preservar campos no editables (fechaCreacion, activa).
    const saldoAntes = Number(S.cuentas.find(c => c.id === idEdit)?.saldo) || 0;
    persistida = editar('cuentas', idEdit, cuenta);
    // HF.1d-1 (ADR 143 D3): igualar el saldo a mano deja su registro, así el
    // historial de la cuenta sigue cuadrando con su saldo (R-HF2).
    const saldoDespues = Number(persistida?.saldo) || 0;
    if (persistida && saldoDespues !== saldoAntes) {
      guardar('ajustesSaldo', {
        cuentaId: idEdit, fecha: hoy(), monto: saldoDespues - saldoAntes, saldoAntes, saldoDespues,
      });
    }
    // editar() devuelve el item actualizado de S, asi tenemos el id real
    // para sincronizar el compromiso vinculado.
    if (persistida) _sincronizarCuotaManejo(persistida);
  } else {
    persistida = guardar('cuentas', cuenta);
    if (persistida) _sincronizarCuotaManejo(persistida);
  }

  const overlay = document.getElementById('modal-cuenta');
  if (overlay) cerrarModal(overlay);

  updSaldo();
  renderTesoreria();
  announce(idEdit ? 'Cuenta actualizada.' : 'Cuenta guardada correctamente.');
}

/**
 * Sincroniza el compromiso de cuota de manejo vinculado a la cuenta.
 *
 * Tres casos:
 *   - Cuenta tiene cuotaManejo y NO existe compromiso → crear.
 *   - Cuenta tiene cuotaManejo y SÍ existe compromiso → actualizar campos.
 *   - Cuenta NO tiene cuotaManejo y SÍ existe compromiso → eliminar.
 *
 * Idempotente: si llamada con el mismo estado dos veces, la segunda es no-op.
 *
 * @param {import('../../../core/state.js').Cuenta} cuenta
 */
function _sincronizarCuotaManejo(cuenta) {
  if (!cuenta?.id) return;
  const existente = compromisoCuotaManejoDeCuenta(S.compromisos, cuenta.id);
  const shape     = compromisoDesdeCuotaManejo(cuenta);

  if (shape && existente) {
    // Actualizar: solo si algun campo cambió evitamos un editar() innecesario.
    const cambios = {};
    for (const k of ['descripcion', 'monto', 'frecuencia', 'diaPago', 'tipo', 'activo']) {
      if (existente[k] !== shape[k]) cambios[k] = shape[k];
    }
    if (Object.keys(cambios).length > 0) {
      editar('compromisos', existente.id, cambios);
    }
  } else if (shape && !existente) {
    guardar('compromisos', shape);
  } else if (!shape && existente) {
    eliminar('compromisos', existente.id);
  }
}

/**
 * Abre el modal en modo edicion con los datos pre-rellenados.
 * @param {HTMLElement} el - el boton con data-id.
 */
function _editarCuenta(el) {
  const id = el.dataset.id;
  if (!id) return;
  const cuenta = S.cuentas.find(c => c.id === id);
  if (!cuenta) return;

  const overlay = document.getElementById('modal-cuenta');
  if (!overlay) return;

  // Resetear primero por si quedo estado de un edit/create anterior.
  resetModal(overlay);
  _resetBankPicker();

  const form = document.getElementById('form-cuenta');
  if (!form) return;
  form.dataset.id = id; // marcador para que _guardarCuenta haga editar() en vez de guardar()

  // 1. Setear banco PRIMERO: _toggleCamposPorClase necesita el valor del banco
  //    para saber qué tipos de cuenta y qué campos mostrar.
  const hiddenBanco = form.querySelector('[name="banco"]');
  if (hiddenBanco) hiddenBanco.value = cuenta.banco ?? '';
  _setBankPickerDisplay(cuenta.banco);

  // 2. Adaptar campos según la clase de la entidad (y poblar el select de tipos).
  _toggleCamposPorClase();

  // CAT.2e: pre-rellenar el ícono elegido si el banco es "Otro" y la cuenta
  // ya tiene uno guardado (`_resetBankPicker()` ya limpió el picker arriba).
  if (cuenta.banco === 'Otro' && cuenta.icono) {
    setIconoPickerValor(
      form.querySelector('[data-icono-picker="cuenta-icono"]'),
      cuenta.icono,
      iconoCategoria(cuenta.icono),
    );
  }

  // 3. Pre-rellenar saldo y tipo DESPUÉS del toggle (el select ya tiene las opciones).
  form.querySelector('[name="saldo"]').value = miles(cuenta.saldo ?? 0);
  form.querySelector('[name="tipo"]').value  = cuenta.tipo  ?? '';

  // 4. GMF.1 (ADR 165): la marcada. Una cuenta de antes que no lo dice
  // queda sin respuesta, así se pregunta al guardar.
  _sincronizarGMF();
  const marcada = cuenta.exenta4x1000 === true ? 'si'
    : (cuenta.exenta4x1000 === false || cuenta.aplica4x1000 === true) ? 'no' : '';
  const radioGMF = marcada ? form.querySelector(`input[name="exenta4x1000"][value="${marcada}"]:not([disabled])`) : null;
  if (radioGMF) radioGMF.checked = true;

  // 5. Pre-rellenar la cuota de manejo y actualizar la visibilidad del fieldset.
  const cuotaToggle = form.querySelector('[data-cuota-toggle]');
  const cuotaMonto  = form.querySelector('[name="cuotaManejoMonto"]');
  const cuotaDia    = form.querySelector('[name="cuotaManejoDia"]');
  const tieneCuota  = !!cuenta.cuotaManejo;
  if (cuotaToggle) cuotaToggle.checked = tieneCuota;
  if (cuotaMonto)  cuotaMonto.value    = tieneCuota ? miles(cuenta.cuotaManejo.monto) : '';
  if (cuotaDia)    cuotaDia.value      = tieneCuota ? cuenta.cuotaManejo.diaCobro : '';
  _toggleCuotaFieldset();

  // 6. MC.14: pre-rellenar los datos de transferencia y actualizar el fieldset.
  const transfToggle = form.querySelector('[data-transferencia-toggle]');
  const numeroCuenta  = form.querySelector('[name="numeroCuenta"]');
  const dt            = cuenta.datosTransferencia;
  const tieneTransf   = !!dt;
  if (transfToggle)  transfToggle.checked = tieneTransf;
  if (numeroCuenta)   numeroCuenta.value  = dt?.numeroCuenta ?? '';
  // MC.19: las llaves guardadas, cada una en su fila.
  _pintarLlaves(form, dt?.llaves ?? []);
  _toggleTransferenciaFieldset();

  // Cambiar titulo del modal para que la persona sepa que esta editando.
  const titulo = overlay.querySelector('.modal__title');
  if (titulo) titulo.textContent = 'Editar cuenta';
  // ADR 142 D5: editar abre en el resumen de las preguntas.
  const formCuenta = document.getElementById('form-cuenta');
  if (formCuenta) {
    formCuenta.dataset.preguntas = 'Tu cuenta';
    formCuenta.dataset.preguntasInicio = 'resumen';
  }

  abrirModal(overlay);
}

/** Actualiza el display visual del bank-picker mostrando el avatar + nombre del banco. */
function _setBankPickerDisplay(bancoId) {
  if (!bancoId) return;
  const display = document.querySelector('#modal-cuenta .bank-picker__display');
  if (!display) return;
  // Buscar el item correspondiente y replicar su contenido en el display.
  const item = document.querySelector(`#banco-list [data-value="${CSS.escape(bancoId)}"]`);
  if (item) {
    display.innerHTML = item.innerHTML;
    // Marcar el item como seleccionado.
    document.querySelectorAll('#banco-list [role="option"]').forEach(it => {
      it.setAttribute('aria-selected', it === item ? 'true' : 'false');
    });
  }
}

/**
 * Pide confirmación y elimina la cuenta por id.
 * @param {HTMLElement} el - el botón con data-id.
 */
async function _eliminarCuenta(el) {
  const id = el.dataset.id;
  if (!id) return;

  const cuenta = S.cuentas.find(c => c.id === id);
  if (!cuenta) return;

  const ok = await confirmar({
    titulo:         'Eliminar cuenta',
    mensaje:        `¿Quieres eliminar "${cuenta.nombre}"? Esta acción no se puede deshacer.`,
    confirmarTexto: 'Eliminar',
    peligroso:      true,
  });
  if (!ok) return;

  // Si la cuenta tenía cuota de manejo, eliminar también el compromiso vinculado.
  const compromisoVinc = compromisoCuotaManejoDeCuenta(S.compromisos, id);
  if (compromisoVinc) eliminar('compromisos', compromisoVinc.id);

  eliminar('cuentas', id);
  updSaldo();
  renderTesoreria();
  announce(`Cuenta "${cuenta.nombre}" eliminada.`);
}

// ── INICIALIZACIÓN ───────────────────────────────────────────────

/**
 * Inyecta el formulario en el modal y registra acciones.
 * Llamada una sola vez desde el index.js del dominio.
 */
export function inyectarFormCuenta() {
  const body = document.getElementById('modal-cuenta-body');
  if (!body) return;

  body.innerHTML = renderFormCuenta();

  // El submit del form no va por data-action para respetar el contrato HTML5 de validación.
  body.querySelector('#form-cuenta')?.addEventListener('submit', (e) => {
    e.preventDefault();
    _guardarCuenta();
  });

  // Toggle para mostrar/ocultar el fieldset de cuota de manejo.
  body.querySelector('[data-cuota-toggle]')?.addEventListener('change', _toggleCuotaFieldset);

  // MC.14: toggle para mostrar/ocultar el fieldset de datos de transferencia.
  body.querySelector('[data-transferencia-toggle]')?.addEventListener('change', _toggleTransferenciaFieldset);
  // MC.19: el tipo de una llave cambia su teclado y su ejemplo.
  body.querySelector('[data-llaves-lista]')?.addEventListener('change', (e) => {
    if (e.target.matches('[data-llave-fila] input[type="radio"]')) _sincronizarLlaves(body.querySelector('#form-cuenta'));
  });

  // Adaptar campos (tipo, 4x1000, cuota) según la clase de la entidad elegida.
  body.querySelector('[name="banco"]')?.addEventListener('change', _toggleCamposPorClase);
  body.querySelector('[name="tipo"]')?.addEventListener('change', _sincronizarGMF);

  // Inicializar el custom bank picker.
  const picker = body.querySelector('.bank-picker');
  if (picker) _initBankPicker(picker);

  // CAT.2e: picker de ícono para el banco "Otro". Form singleton (como
  // Metas): se wirea una sola vez aquí, no en cada apertura del modal.
  wireIconoPicker(body.querySelector('[data-icono-picker="cuenta-icono"]'));
}

/**
 * Muestra u oculta el bloque de campos de cuota según el checkbox (MC.14) y
 * el aviso de confirmación cuando NO está marcado (MC.15c): invita a
 * verificar que la cuenta de verdad no cobra cuota de manejo, sin bloquear
 * el guardado. El aviso vive dentro del mismo `.form-group--checkbox` que el
 * toggle, así que el caso "efectivo" de `_toggleCamposPorClase()` ya lo
 * oculta al ocultar todo el grupo, sin wiring adicional.
 */
function _toggleCuotaFieldset() {
  const cb   = document.getElementById('cuenta-cuota-toggle');
  const set  = document.getElementById('cuenta-cuota-fieldset');
  const hint = document.getElementById('cuenta-cuota-hint');
  if (!cb || !set) return;
  set.hidden = !cb.checked;
  if (hint) hint.hidden = cb.checked;
}

/** MC.14: muestra u oculta el bloque de datos de transferencia según el checkbox. */
function _toggleTransferenciaFieldset() {
  const cb  = document.getElementById('cuenta-transferencia-toggle');
  const set = document.getElementById('cuenta-transferencia-fieldset');
  if (!cb || !set) return;
  set.hidden = !cb.checked;
}

/**
 * Adapta el formulario según la clase de la entidad elegida en el bank-picker.
 *
 * - banco:     muestra tipo (Corriente / Ahorros), 4x1000 y cuota.
 * - billetera: oculta tipo (saldo único, no hay "tipo bancario"), muestra 4x1000 y cuota.
 * - efectivo:  oculta tipo, 4x1000 y cuota (no aplican).
 * - otro / sin selección: muestra tipo (Ahorros / Otro), 4x1000 y cuota.
 *
 * Reemplaza la antigua `_toggleCamposEfectivo` que solo manejaba el caso Efectivo.
 */
function _toggleCamposPorClase() {
  const bancoId = document.querySelector('#form-cuenta [name="banco"]')?.value ?? '';
  const entrada = BANCOS_CO.find(b => b.id === bancoId);
  // null = sin banco elegido → ocultamos tipo, mostramos el resto (comportamiento seguro).
  const clase   = entrada?.clase ?? null;

  // ── Ícono para "Otro" (CAT.2e) ────────────────────────────────────
  // 'Otro' no tiene glifo propio en BANCOS_CO (fallback "?" gris); el picker
  // solo tiene sentido con esa clase exacta, no con billetera/banco/efectivo
  // (que ya traen su glifo oficial) ni sin selección.
  const grupoIcono = document.getElementById('form-group-icono');
  if (grupoIcono) grupoIcono.hidden = clase !== 'otro';

  // ── Tipo de cuenta ───────────────────────────────────────────────
  const tiposDisponibles = clase ? (TIPOS_POR_CLASE[clase] ?? []) : [];
  const grupoTipo = document.getElementById('form-group-tipo');
  if (grupoTipo) {
    grupoTipo.hidden = tiposDisponibles.length === 0;
    if (!grupoTipo.hidden) {
      const sel = document.getElementById('cuenta-tipo');
      if (sel) {
        const valorActual = sel.value;
        sel.innerHTML = '<option value="">Seleccionar…</option>' +
          tiposDisponibles
            .map(t => `<option value="${_esc(t)}"${valorActual === t ? ' selected' : ''}>${_esc(t)}</option>`)
            .join('');
        // Si el tipo actual no existe en la nueva lista (clase cambió), limpiar.
        if (!tiposDisponibles.includes(valorActual)) sel.value = '';
      }
    }
  }

  // ── 4x1000 (GMF.1, ADR 165) ──────────────────────────────────────
  _sincronizarGMF();

  // ── Cuota de manejo ──────────────────────────────────────────────
  const toggleCuota  = document.getElementById('cuenta-cuota-toggle');
  const grupoCuota   = toggleCuota?.closest('.form-group--checkbox');
  const fieldsetCuota = document.getElementById('cuenta-cuota-fieldset');
  if (clase === 'efectivo') {
    if (grupoCuota)     grupoCuota.hidden = true;
    if (fieldsetCuota)  fieldsetCuota.hidden = true;
    if (toggleCuota)    toggleCuota.checked = false;
  } else {
    if (grupoCuota)     grupoCuota.hidden = false;
    _toggleCuotaFieldset(); // el fieldset lo controla el toggle, no la clase
  }

  // ── Datos de transferencia (MC.14) ────────────────────────────────
  // El efectivo no tiene número de cuenta ni llave a la que consignar.
  const toggleTransf   = document.getElementById('cuenta-transferencia-toggle');
  const grupoTransf    = document.getElementById('form-group-transferencia');
  const fieldsetTransf = document.getElementById('cuenta-transferencia-fieldset');
  if (clase === 'efectivo') {
    if (grupoTransf)    grupoTransf.hidden = true;
    if (fieldsetTransf) fieldsetTransf.hidden = true;
    if (toggleTransf)   toggleTransf.checked = false;
  } else {
    if (grupoTransf)    grupoTransf.hidden = false;
    _toggleTransferenciaFieldset(); // el fieldset lo controla el toggle, no la clase
  }
}

/**
 * Inicializa el comportamiento del custom bank picker:
 * toggle, seleccion de banco, navegacion por teclado y cierre al click externo.
 *
 * El dropdown (.bank-picker__list) se MUEVE a <body> al inicializar. Razon:
 * el .modal padre tiene `transform: translateY/scale` (animacion de entrada),
 * y cualquier elemento con `transform != none` crea un containing block para
 * los descendientes con `position: fixed`, lo que desplaza el dropdown
 * respecto al viewport. Como hijo directo de <body> queda anclado al viewport
 * real y los coords de getBoundingClientRect funcionan correctamente.
 *
 * @param {HTMLElement} picker - el elemento .bank-picker raiz.
 */
function _initBankPicker(picker) {
  const trigger = picker.querySelector('.bank-picker__trigger');
  const list    = picker.querySelector('.bank-picker__list');
  const hidden  = picker.querySelector('input[name="banco"]');
  if (!trigger || !list || !hidden) return;

  // Mover el dropdown a <body> (ver explicacion arriba).
  document.body.appendChild(list);

  // Posicionar el dropdown con position:fixed debajo del trigger.
  // Si el dropdown se saldria del viewport por abajo, se abre hacia arriba.
  function _posicionar() {
    const r = trigger.getBoundingClientRect();
    const vh = window.innerHeight;
    const altoMax = 260; // coincide con max-height del CSS
    const espacioAbajo = vh - r.bottom;
    const espacioArriba = r.top;

    list.style.left  = `${r.left}px`;
    list.style.width = `${r.width}px`;

    if (espacioAbajo < altoMax && espacioArriba > espacioAbajo) {
      // Abrir hacia arriba: usar bottom en lugar de top.
      list.style.top    = 'auto';
      list.style.bottom = `${vh - r.top + 4}px`;
    } else {
      list.style.bottom = 'auto';
      list.style.top    = `${r.bottom + 4}px`;
    }
  }

  function _open() {
    _posicionar();
    list.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
    picker.setAttribute('aria-expanded', 'true');
    // Foco al item seleccionado o al primero.
    const sel = list.querySelector('[aria-selected="true"]')
             ?? list.querySelector('[role="option"]');
    sel?.focus();
  }

  function _close() {
    list.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
    picker.setAttribute('aria-expanded', 'false');
  }

  function _selectItem(item) {
    const val = item.dataset.value;
    if (!val) return;

    hidden.value = val;
    hidden.dispatchEvent(new Event('change', { bubbles: true }));

    // Actualizar display del trigger con el avatar + nombre del banco.
    const display = trigger.querySelector('.bank-picker__display');
    if (display) display.innerHTML = item.innerHTML;

    // Actualizar aria-selected.
    list.querySelectorAll('[role="option"]').forEach(i => {
      i.setAttribute('aria-selected', i === item ? 'true' : 'false');
    });
  }

  // ADR 142 D2 (FORM.2h): en el teléfono, el banco se busca en el
  // desplegable de Finko, una mini-hoja con buscador, no en la lista flotante.
  const _esMovil = () => window.matchMedia?.('(max-width: 1023.98px)').matches === true;
  function _abrirHojaBancos() {
    const form = picker.closest('form');
    if (!form) return;
    let mini = form.querySelector('#cuenta-banco-mini');
    if (!mini) {
      form.insertAdjacentHTML('beforeend', htmlMiniHoja({
        id: 'cuenta-banco-mini',
        titulo: 'Banco o billetera',
        cuerpo: `
          <label class="buscar-finko"><svg class="icon" aria-hidden="true"><use href="#i-search"/></svg><span class="sr-only">Buscar banco o billetera</span><input type="search" class="buscar-finko__in" placeholder="Buscar" autocomplete="off" data-banco-buscar /></label>
          <div class="desplegable" role="listbox" aria-label="Banco o billetera" data-banco-lista></div>`,
      }));
      mini = form.querySelector('#cuenta-banco-mini');
      const listaMini = mini.querySelector('[data-banco-lista]');
      const buscar = mini.querySelector('[data-banco-buscar]');
      const norm = (t) => t.toLocaleLowerCase('es').normalize('NFD').replace(/\p{Diacritic}/gu, '');
      buscar.addEventListener('input', () => {
        const q = norm(buscar.value.trim());
        listaMini.querySelectorAll('[data-valor]').forEach((b) => { b.hidden = q !== '' && !norm(b.textContent).includes(q); });
      });
      listaMini.addEventListener('click', (e) => {
        const b = e.target.closest('[data-valor]');
        if (!b) return;
        const item = [...list.querySelectorAll('[role="option"]')].find(i => i.dataset.value === b.dataset.valor);
        if (item) _selectItem(item);
        cerrarMiniHoja(mini);
      });
    }
    const listaMini = mini.querySelector('[data-banco-lista]');
    listaMini.innerHTML = [...list.querySelectorAll('[role="option"]')].map(i => `
          <button type="button" class="desplegable__f" role="option" aria-selected="${i.dataset.value === hidden.value}" data-valor="${i.dataset.value}">
            <span class="desplegable__txt">${i.innerHTML}</span><span class="desplegable__ok" aria-hidden="true"></span>
          </button>`).join('');
    mini.querySelector('[data-banco-buscar]').value = '';
    abrirMiniHoja(mini, { origen: trigger });
  }

  // Toggle al click en el trigger.
  trigger.addEventListener('click', () => {
    if (_esMovil()) { _abrirHojaBancos(); return; }
    if (list.hidden) _open(); else _close();
  });

  // Seleccion al click en un item.
  list.addEventListener('click', (e) => {
    const item = e.target.closest('[role="option"]');
    if (!item) return;
    _selectItem(item);
    _close();
    trigger.focus();
  });

  // Teclado dentro de la lista.
  list.addEventListener('keydown', (e) => {
    const items = [...list.querySelectorAll('[role="option"]')];
    const idx   = items.indexOf(document.activeElement);

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      items[Math.min(idx + 1, items.length - 1)]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      items[Math.max(idx - 1, 0)]?.focus();
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const focused = document.activeElement;
      if (focused.getAttribute('role') === 'option') {
        _selectItem(focused);
        _close();
        trigger.focus();
      }
    } else if (e.key === 'Escape') {
      _close();
      trigger.focus();
    }
  });

  // Abrir con flecha abajo desde el trigger.
  trigger.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      _open();
    }
  });

  // Cerrar al click fuera del picker Y de la lista (que esta en position:fixed).
  document.addEventListener('pointerdown', (e) => {
    if (!picker.contains(e.target) && !list.contains(e.target)) {
      _close();
    }
  }, { capture: true });
}

/**
 * Salida de la tarjeta de crédito hacia la lente "Por pagar" (ADR 080 D5).
 *
 * Emite en vez de navegar y filtrar acá: el filtro de la lente es estado de
 * `compromisos`, y ningún dominio importa a otro (ADN 10). Mismo mecanismo con
 * el que Calendario e Inicio abren el asistente de distribución de esta
 * sección, en el sentido contrario (`distribuir:abrir`).
 *
 * @param {HTMLElement} el Elemento con `data-id` = id del compromiso.
 */
function _verEnPorPagar(el) {
  const id = el?.dataset?.id;
  if (!id) return;
  EventBus.emit('porPagar:ver-compromiso', { id });
}

/**
 * Salida de una cuenta hacia el historial completo (ficha 15, M3).
 *
 * Mismo reparto que `_verEnPorPagar`: el emisor nombra lo que conoce (esta
 * cuenta) y la pantalla destino pone su filtro, porque los filtros de
 * Movimientos son estado de ese modulo y ningun dominio importa a otro (ADN 10).
 *
 * @param {HTMLElement} el Elemento con `data-id` = id de la cuenta.
 */
function _verMovimientosDeCuenta(el) {
  const id = el?.dataset?.id;
  if (!id) return;
  EventBus.emit('movimientos:ver', { cuentaId: id });
}

// ── COPIAR (MC.19, ADR 170 D4) ───────────────────────────────────

/** La cuenta y el dato que nombra un botón (`data-cuenta-id` y `data-llave`). */
function _datoDeCuenta(el) {
  const cuenta = (S.cuentas ?? []).find(c => c.id === el?.dataset?.cuentaId);
  const dato = datosParaRecibir(cuenta).find(d => d.llave === el?.dataset?.llave);
  return cuenta && dato ? { ...dato, cuenta } : null;
}

/**
 * Copia el dato completo y sin formato (el celular, solo sus 10 dígitos) y lo
 * dice: "Copiaste tu llave de celular de Nequi". Si no se pudo, lo dice y
 * deja el dato a la vista para copiarlo a mano.
 */
async function _copiarDatoCuenta(el) {
  const dato = _datoDeCuenta(el);
  if (!dato) return;
  const que = `${nombreDatoRecibir(dato.tipo)} de ${dato.cuenta.nombre}`;
  if (await copiarTexto(dato.valor)) {
    mostrarToast({ titulo: `Copiaste ${que}` });
    return;
  }
  mostrarToast({ titulo: 'No se pudo copiar', detalle: `Aquí está ${que}: ${dato.valor}`, tono: 'alerta' });
  const fila = el.closest('.detalle-cuenta__llave');
  const ver = fila?.querySelector('[data-action="cuenta-llave-ver"]');
  if (ver) ver.click();
}

// ── REGISTRO ─────────────────────────────────────────────────────

/** Registra los data-action del subsistema de cuentas. */
export function initAccionesCuentas() {
  registrarAccion('nueva-cuenta', _nuevaCuenta);
  registrarAccion('tc-ver-en-por-pagar', _verEnPorPagar);
  registrarAccion('cuenta-ver-movimientos', _verMovimientosDeCuenta);
  // ADR 135 D4: la fila de una cuenta abre su hoja propia (tipo, 4x1000,
  // cuota de manejo, sus movimientos), en `#modal-detalle-fila`.
  registrarAccion('cuenta-detalle', (el) => {
    const cuenta = (S.cuentas ?? []).find(c => c.id === el?.dataset?.id);
    const hoja   = document.getElementById('modal-detalle-fila');
    const cuerpo = document.getElementById('detalle-fila-body');
    if (!cuenta || !hoja || !cuerpo) return;
    cuerpo.innerHTML = htmlDetalleCuenta(cuenta);
    abrirModal(hoja);
  });
  registrarAccion('editar-cuenta', _editarCuenta);
  registrarAccion('eliminar-cuenta', _eliminarCuenta);

  // MC.19 (ADR 170 D4 a D6): las llaves de la cuenta.
  registrarAccion('cuenta-llave-agregar', (el) => {
    const form = el.closest('form');
    const lista = form?.querySelector('[data-llaves-lista]');
    if (!lista || lista.querySelectorAll('[data-llave-fila]').length >= MAX_LLAVES_CUENTA) return;
    lista.insertAdjacentHTML('beforeend', htmlFilaLlave());
    _sincronizarLlaves(form);
    lista.querySelector('[data-llave-fila]:last-child [name="llaveValor"]')?.focus();
  });
  registrarAccion('cuenta-llave-quitar', (el) => {
    const form = el.closest('form');
    el.closest('[data-llave-fila]')?.remove();
    if (form && !form.querySelector('[data-llave-fila]')) _pintarLlaves(form, []);
    else if (form) _sincronizarLlaves(form);
  });
  registrarAccion('cuenta-llave-copiar', _copiarDatoCuenta);
  registrarAccion('cuenta-llave-ver', (el) => {
    const dato = _datoDeCuenta(el);
    if (!dato) return;
    const span = document.createElement('span');
    span.className = 'detalle-cuenta__valor';
    span.textContent = textoLlave(dato.tipo, dato.valor, { ver: true });
    el.replaceWith(span);
  });

  // MC.18a (ADR 035 D5): el ojo del hero de la sección comparte el flag
  // S.config.ocultarSaldo con el ojo de Inicio (IN.2): un solo control de
  // privacidad en toda la app. El flip con `!== true` es defensivo, igual
  // que en 'saldo-visibilidad' (ui/actions.js). updSaldo() mantiene el hero
  // de Inicio en sincronía; el re-render de la sección enmascara el total
  // (y, cuando MC.18b/18d extiendan la máscara, los saldos por cuenta y
  // los montos de ingresos).
  registrarAccion('tesoreria-saldo-visibilidad', () => {
    alternarMontosOcultos('tesoreria');
    save();
    updSaldo();
    renderSmart(renderTesoreria, 'tesoreria');
  });

  // Cualquier flujo bloqueado por "falta una cuenta" (ingreso, gasto, abono...)
  // emite 'cuenta:crear' para abrir directo el formulario de nueva cuenta, sin
  // que el shell ni infra importen este dominio. Ver `ir-a-crear-cuenta` en
  // ui/actions.js y `_mostrarGuiadoCero` en infra/cuenta-helper.js.
  EventBus.on('cuenta:crear', _nuevaCuenta);
}

/**
 * tesoreria/index.js - API pública del dominio de tesorería.
 *
 * Responsabilidades:
 * - Registrar acciones data-action propias del dominio.
 * - Inyectar el formulario en el modal en el arranque.
 * - Suscribirse a EventBus para re-renderizar cuando el estado cambia.
 * - Coordinar logic.js + view.js sin hacer cálculos ni generar HTML aquí.
 */

import { S, EventBus } from '../../core/state.js';
import { guardar, editar, eliminar } from '../../infra/crud.js';
import { registrarAccion } from '../../ui/actions.js';
import { abrirModal, cerrarModal, resetModal } from '../../ui/modales.js';
import { confirmar } from '../../ui/confirm.js';
import { renderSmart, updSaldo } from '../../infra/render.js';
import { announce } from '../../infra/a11y.js';
import { mostrarErroresForm } from '../../infra/form-errors.js';
import { esc as _esc } from '../../infra/utils.js';
import { BANCOS_CO, TIPOS_POR_CLASE } from '../../core/constants.js';
import {
  validarCuenta,
  normalizarCuenta,
  compromisoDesdeCuotaManejo,
  compromisoCuotaManejoDeCuenta,
  validarIngreso,
  normalizarIngreso,
  FRECUENCIAS_CON_DIA,
} from './logic.js';
import {
  renderListaCuentas,
  renderFormCuenta,
  renderGMFIndicador,
  renderNudgeProximoIngreso,
  renderDistribucionIngreso,
  renderListaIngresos,
  renderFormIngreso,
} from './view.js';

// ── RENDER COMPLETO ──────────────────────────────────────────────

/** Re-renderiza la vista del dominio. */
function _renderTodo() {
  renderListaCuentas();
  renderGMFIndicador();
  renderNudgeProximoIngreso();
  renderDistribucionIngreso();
  renderListaIngresos();
}

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
  if (form) delete form.dataset.id;
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
}

/** Lee el formulario, valida, guarda (o edita) y actualiza el DOM. */
function _guardarCuenta() {
  const form = document.getElementById('form-cuenta');
  if (!form) return;

  const datos = Object.fromEntries(new FormData(form));
  const errores = validarCuenta(datos);

  if (errores.length > 0) {
    mostrarErroresForm(form, errores);
    return;
  }

  const idEdit  = form.dataset.id || null;
  const cuenta  = normalizarCuenta(datos);

  let persistida;
  if (idEdit) {
    // Modo edicion: preservar campos no editables (fechaCreacion, activa).
    persistida = editar('cuentas', idEdit, cuenta);
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
  _renderTodo();
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
 * @param {import('../../core/state.js').Cuenta} cuenta
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

  // 3. Pre-rellenar saldo y tipo DESPUÉS del toggle (el select ya tiene las opciones).
  form.querySelector('[name="saldo"]').value = cuenta.saldo ?? 0;
  form.querySelector('[name="tipo"]').value  = cuenta.tipo  ?? '';

  // 4. Pre-rellenar el flag 4x1000 (GMF).
  const cb4x1000 = form.querySelector('[name="aplica4x1000"]');
  if (cb4x1000) cb4x1000.checked = !!cuenta.aplica4x1000;

  // 5. Pre-rellenar la cuota de manejo y actualizar la visibilidad del fieldset.
  const cuotaToggle = form.querySelector('[data-cuota-toggle]');
  const cuotaMonto  = form.querySelector('[name="cuotaManejoMonto"]');
  const cuotaDia    = form.querySelector('[name="cuotaManejoDia"]');
  const tieneCuota  = !!cuenta.cuotaManejo;
  if (cuotaToggle) cuotaToggle.checked = tieneCuota;
  if (cuotaMonto)  cuotaMonto.value    = tieneCuota ? cuenta.cuotaManejo.monto    : '';
  if (cuotaDia)    cuotaDia.value      = tieneCuota ? cuenta.cuotaManejo.diaCobro : '';
  _toggleCuotaFieldset();

  // Cambiar titulo del modal para que la persona sepa que esta editando.
  const titulo = overlay.querySelector('.modal__title');
  if (titulo) titulo.textContent = 'Editar cuenta';

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
  _renderTodo();
  announce(`Cuenta "${cuenta.nombre}" eliminada.`);
}

// ── INICIALIZACIÓN ───────────────────────────────────────────────

/**
 * Inyecta el formulario en el modal y registra acciones.
 * Llamada una sola vez desde bootstrap.js.
 */
function _inyectarForm() {
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

  // Adaptar campos (tipo, 4x1000, cuota) según la clase de la entidad elegida.
  body.querySelector('[name="banco"]')?.addEventListener('change', _toggleCamposPorClase);

  // Inicializar el custom bank picker.
  const picker = body.querySelector('.bank-picker');
  if (picker) _initBankPicker(picker);
}

/** Muestra u oculta el bloque de campos de cuota según el checkbox. */
function _toggleCuotaFieldset() {
  const cb  = document.getElementById('cuenta-cuota-toggle');
  const set = document.getElementById('cuenta-cuota-fieldset');
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

  // ── 4x1000 ───────────────────────────────────────────────────────
  const grupo4x1000 = document.getElementById('form-group-4x1000');
  if (grupo4x1000) {
    const ocultarGMF = clase === 'efectivo';
    grupo4x1000.hidden = ocultarGMF;
    if (ocultarGMF) {
      const cb = document.getElementById('cuenta-4x1000');
      if (cb) cb.checked = false;
    }
  }

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

  // Toggle al click en el trigger.
  trigger.addEventListener('click', () => {
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

// ── INGRESOS RECURRENTES ─────────────────────────────────────────

/**
 * Conecta el toggle de visibilidad del campo diaPago al select de frecuencia.
 * Debe llamarse después de inyectar el HTML del form de ingreso.
 * Actualiza max/placeholder/label según la frecuencia seleccionada.
 *
 * @param {HTMLFormElement} form
 */
function _attachDiaPagoToggle(form) {
  const selFrec  = form.querySelector('[name="frecuencia"]');
  const grupoDia = form.querySelector('#form-group-dia-pago');
  const inputDia = form.querySelector('[name="diaPago"]');
  const labelDia = form.querySelector('#label-dia-pago');
  if (!selFrec || !grupoDia || !inputDia) return;

  function _sync() {
    const frec    = selFrec.value;
    const mostrar = FRECUENCIAS_CON_DIA.includes(frec);
    grupoDia.hidden = !mostrar;
    if (!mostrar) inputDia.value = '';
    if (frec === 'Quincenal') {
      inputDia.max         = '15';
      inputDia.placeholder = 'Ej. 15';
      if (labelDia) labelDia.textContent = 'Día de la primera quincena (1-15)';
    } else {
      inputDia.max         = '31';
      inputDia.placeholder = 'Ej. 30';
      if (labelDia) labelDia.textContent = 'Día de pago (1-31)';
    }
  }

  selFrec.addEventListener('change', _sync);
  _sync();
}

/** Abre el modal de ingreso en modo creación. */
function _nuevoIngreso() {
  const overlay = document.getElementById('modal-ingreso');
  if (!overlay) return;
  const titulo = overlay.querySelector('.modal__title');
  if (titulo) titulo.textContent = 'Nuevo ingreso';
  const body = document.getElementById('modal-ingreso-body');
  if (body) {
    body.innerHTML = renderFormIngreso();
    const form = body.querySelector('#form-ingreso');
    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      _guardarIngreso();
    });
    if (form) _attachDiaPagoToggle(form);
  }
  abrirModal(overlay);
}

/** Lee el formulario, valida y guarda (o edita) el ingreso. */
function _guardarIngreso() {
  const form = document.getElementById('form-ingreso');
  if (!form) return;

  const datos = Object.fromEntries(new FormData(form));
  const errores = validarIngreso(datos);
  if (errores.length > 0) {
    mostrarErroresForm(form, errores);
    return;
  }

  const idEdit = form.dataset.id || null;
  if (idEdit) {
    editar('ingresos', idEdit, normalizarIngreso(datos));
  } else {
    guardar('ingresos', normalizarIngreso(datos));
  }

  const overlay = document.getElementById('modal-ingreso');
  if (overlay) cerrarModal(overlay);

  renderListaIngresos();
  EventBus.emit('state:change', { section: 'ingresos' });
  announce(idEdit ? 'Ingreso actualizado.' : 'Ingreso guardado.');
}

/** @param {HTMLElement} el */
function _editarIngreso(el) {
  const id = el.dataset.id;
  if (!id) return;
  const ing = (S.ingresos ?? []).find(i => i.id === id);
  if (!ing) return;

  const overlay = document.getElementById('modal-ingreso');
  if (!overlay) return;
  const titulo = overlay.querySelector('.modal__title');
  if (titulo) titulo.textContent = 'Editar ingreso';
  const body = document.getElementById('modal-ingreso-body');
  if (body) {
    body.innerHTML = renderFormIngreso(ing);
    const form = body.querySelector('#form-ingreso');
    if (form) {
      form.dataset.id = id;
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        _guardarIngreso();
      });
      _attachDiaPagoToggle(form);
    }
  }
  abrirModal(overlay);
}

/** @param {HTMLElement} el */
async function _eliminarIngreso(el) {
  const id = el.dataset.id;
  if (!id) return;
  const ing = (S.ingresos ?? []).find(i => i.id === id);
  if (!ing) return;

  const ok = await confirmar({
    titulo:         'Eliminar ingreso',
    mensaje:        `¿Quieres eliminar el ingreso "${ing.descripcion}"? Esta acción no se puede deshacer.`,
    confirmarTexto: 'Eliminar',
    peligroso:      true,
  });
  if (!ok) return;

  eliminar('ingresos', id);
  renderListaIngresos();
  EventBus.emit('state:change', { section: 'ingresos' });
  announce(`Ingreso "${ing.descripcion}" eliminado.`);
}

/**
 * Inicializa el dominio de tesorería.
 * Registra acciones, inyecta el form, suscribe al EventBus y hace el primer render.
 */
export function initTesoreria() {
  registrarAccion('nueva-cuenta', _nuevaCuenta);
  registrarAccion('editar-cuenta', _editarCuenta);
  registrarAccion('eliminar-cuenta', _eliminarCuenta);
  registrarAccion('nuevo-ingreso',   _nuevoIngreso);
  registrarAccion('editar-ingreso',  _editarIngreso);
  registrarAccion('eliminar-ingreso', _eliminarIngreso);

  _inyectarForm();

  EventBus.on('state:change', ({ section }) => {
    if (
      section === 'cuentas'    ||
      section === 'tesoreria'  ||
      section === 'compromisos' ||
      section === 'ingresos'   ||
      section === 'ahorro'     ||
      section === 'inversiones'
    ) {
      renderSmart(_renderTodo, 'tesoreria');
      updSaldo();
    }
  });

  // Re-render al navegar a #tesoreria - sin esto la sección aparece vacía
  // cuando el usuario llega navegando desde otra (no hay state:change que la dispare).
  window.addEventListener('hashchange', () => {
    renderSmart(_renderTodo, 'tesoreria');
  });

  // Render inicial si ya estamos en #tesoreria al cargar.
  renderSmart(_renderTodo, 'tesoreria');
}

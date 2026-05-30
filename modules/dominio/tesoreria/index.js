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
import { f } from '../../infra/utils.js';
import {
  calcularPrima,
  calcularPILA,
  calcularAportesEmpleado,
  calcularCesantias,
  validarCampos,
} from '../../infra/financiero.js';
import {
  validarCuenta,
  normalizarCuenta,
  compromisoDesdeCuotaManejo,
  compromisoCuotaManejoDeCuenta,
} from './logic.js';
import { renderListaCuentas, renderFormCuenta } from './view.js';

// ── RENDER COMPLETO ──────────────────────────────────────────────

/** Re-renderiza la vista del dominio. */
function _renderTodo() {
  renderListaCuentas();
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
  // ocultamos manualmente el fieldset de cuota por si quedó visible.
  _toggleCuotaFieldset();
  // Asegurar que tipo y 4x1000 sean visibles si el banco anterior era Efectivo.
  _toggleCamposEfectivo();
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

  // Pre-rellenar campos.
  form.querySelector('[name="saldo"]').value  = cuenta.saldo ?? 0;
  form.querySelector('[name="tipo"]').value   = cuenta.tipo  ?? '';

  // El banco usa el custom picker: setear el hidden + actualizar el display visual.
  const hiddenBanco = form.querySelector('[name="banco"]');
  if (hiddenBanco) hiddenBanco.value = cuenta.banco ?? '';
  _setBankPickerDisplay(cuenta.banco);

  // Pre-rellenar el flag 4x1000 (GMF).
  const cb4x1000 = form.querySelector('[name="aplica4x1000"]');
  if (cb4x1000) cb4x1000.checked = !!cuenta.aplica4x1000;

  _toggleCamposEfectivo();

  // Pre-rellenar la cuota de manejo si la cuenta la tiene.
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
    mensaje:        `¿Querés eliminar "${cuenta.nombre}"? Esta acción no se puede deshacer.`,
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

  // Ocultar "Tipo de cuenta" y "4x1000" cuando el banco seleccionado es Efectivo.
  body.querySelector('[name="banco"]')?.addEventListener('change', _toggleCamposEfectivo);

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
 * Oculta los campos que no aplican cuando el banco es Efectivo:
 * "Tipo de cuenta" (el efectivo no tiene tipo) y "4x1000" (el efectivo
 * no paga GMF). Limpia sus valores al ocultarlos.
 */
function _toggleCamposEfectivo() {
  const banco = document.querySelector('#form-cuenta [name="banco"]')?.value ?? '';
  const esEfectivo = banco === 'Efectivo';

  const grupoTipo = document.getElementById('form-group-tipo');
  if (grupoTipo) {
    grupoTipo.hidden = esEfectivo;
    if (esEfectivo) {
      const sel = document.getElementById('cuenta-tipo');
      if (sel) sel.value = '';
    }
  }

  const grupo4x1000 = document.getElementById('form-group-4x1000');
  if (grupo4x1000) {
    grupo4x1000.hidden = esEfectivo;
    if (esEfectivo) {
      const cb = document.getElementById('cuenta-4x1000');
      if (cb) cb.checked = false;
    }
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

// ── SIMULADOR LABORAL GATEADO (empleado vs independiente) ─────────
//
// Regla innegociable: NUNCA mezclar empleado e independiente en la misma
// salida. El gate pregunta el perfil primero y cada rama usa su propia
// lógica y funciones. Ver feedback_simulador_laboral.md.

/**
 * Renderiza el resultado para un empleado dependiente.
 * Muestra: descuentos mensuales (salud + pensión + FSP), auxilio de
 * transporte, prima semestral y cesantías (proyección anual).
 * No muestra PILA de independiente ni referencia a ese perfil.
 *
 * @param {Record<string, string>} datos - campos del formulario.
 * @param {HTMLElement} el - contenedor #result-simulador-laboral.
 */
function _calcularEmpleado(datos, el) {
  const errores = validarCampos(
    { salario: datos.salario ?? '', dias: datos.dias ?? '' },
    { salario: { min: 1 }, dias: { min: 1, max: 180, entero: true } },
  );
  if (errores.length > 0) {
    el.innerHTML = `<ul class="calc-result__errors">${errores.map(m => `<li>${m}</li>`).join('')}</ul>`;
    announce(errores[0], 'assertive');
    return;
  }

  const salario   = Number(datos.salario);
  const dias      = Number(datos.dias);
  const variables = (Number(datos.extras) || 0) + (Number(datos.bonos) || 0);

  const prima     = calcularPrima(salario, dias, variables);
  const aportes   = calcularAportesEmpleado(salario);
  // Cesantías: extrapolar el semestre a año completo (multiplicamos por 2, máx. 360 días).
  const cesantias = calcularCesantias(salario, Math.min(dias * 2, 360), variables);

  const variablesRow = prima.variablesAplicadas > 0
    ? `<dt>Variables (extras + bonos)</dt><dd>${f(prima.variablesAplicadas)}/mes</dd>`
    : '';

  const fspRow = aportes.fsp > 0
    ? `<dt>FSP (solidaridad pensional, ${(aportes.fspTasa * 100).toFixed(1)} %)</dt>
       <dd class="calc-result__deduct">${f(aportes.fsp)}</dd>`
    : `<dt>FSP (solidaridad pensional)</dt>
       <dd>No aplica (salario menor a 4 SMMLV)</dd>`;

  const auxilioFila = prima.incluyeAuxilio
    ? `<dt>Auxilio de transporte mensual</dt>
       <dd class="calc-result__highlight">${f(prima.auxilioAplicado)}</dd>`
    : `<dt>Auxilio de transporte</dt>
       <dd>No aplica (salario mayor a 2 SMMLV)</dd>`;

  el.innerHTML = `
    <h4 class="calc-result__subtitle">💸 Descuento mensual (vos pagás)</h4>
    <dl class="calc-result__grid">
      <dt>IBC base de cotización</dt><dd>${f(aportes.ibc)}</dd>
      <dt>Salud (4 %, aportás vos)</dt><dd class="calc-result__deduct">${f(aportes.salud)}</dd>
      <dt>Pensión (4 %, aportás vos)</dt><dd class="calc-result__deduct">${f(aportes.pension)}</dd>
      ${fspRow}
      <dt>Total descuento mensual</dt><dd class="calc-result__total">${f(aportes.totalDescuento)}</dd>
    </dl>

    <h4 class="calc-result__subtitle">🚌 Beneficio mensual</h4>
    <dl class="calc-result__grid">
      ${auxilioFila}
    </dl>

    <h4 class="calc-result__subtitle">🎁 Prima de servicios (${dias} días)</h4>
    <dl class="calc-result__grid">
      <dt>Salario base liquidación</dt><dd>${f(prima.salarioBase)}</dd>
      ${variablesRow}
      <dt>Prima estimada</dt><dd class="calc-result__total">${f(prima.prima)}</dd>
    </dl>

    <h4 class="calc-result__subtitle">📋 Cesantías (proyección año completo)</h4>
    <dl class="calc-result__grid">
      <dt>Cesantías estimadas</dt><dd>${f(cesantias.cesantias)}</dd>
      <dt>Intereses (12 % anual)</dt><dd class="calc-result__highlight">${f(cesantias.intereses)}</dd>
      <dt>Total cesantías</dt><dd class="calc-result__total">${f(cesantias.total)}</dd>
    </dl>

    <p class="herramienta-inline__desc">
      ARL, parafiscales y caja de compensación los paga tu empleador en su totalidad.
      Las cesantías son una proyección anual basada en los días del semestre ingresados.
      Las cifras son estimaciones: el valor exacto depende de tu nómina real.
    </p>`;
}

/**
 * Renderiza el resultado para un trabajador independiente.
 * Muestra: IBC (40 % del ingreso, piso 1 SMMLV), y aportes PILA completos
 * (salud 12.5 % + pensión 16 % + ARL). No muestra prima ni cesantías.
 *
 * @param {Record<string, string>} datos - campos del formulario.
 * @param {HTMLElement} el - contenedor #result-simulador-laboral.
 */
function _calcularIndependiente(datos, el) {
  const errores = validarCampos(
    { ingreso: datos.ingreso ?? '' },
    { ingreso: { min: 1 } },
  );
  if (errores.length > 0) {
    el.innerHTML = `<ul class="calc-result__errors">${errores.map(m => `<li>${m}</li>`).join('')}</ul>`;
    announce(errores[0], 'assertive');
    return;
  }

  const pila = calcularPILA(Number(datos.ingreso), Number(datos.arl));
  if (!pila) {
    el.innerHTML = '<p class="herramienta-inline__desc">Ingresá un ingreso válido para calcular.</p>';
    return;
  }

  el.innerHTML = `
    <h4 class="calc-result__subtitle">🧾 Aportes PILA mensuales (a tu cargo)</h4>
    <dl class="calc-result__grid">
      <dt>IBC (40 % del ingreso, mínimo 1 SMMLV)</dt><dd>${f(pila.ibc)}</dd>
      <dt>Salud (12.5 %)</dt><dd class="calc-result__deduct">${f(pila.salud)}</dd>
      <dt>Pensión (16 %)</dt><dd class="calc-result__deduct">${f(pila.pension)}</dd>
      <dt>ARL</dt><dd class="calc-result__deduct">${f(pila.arlMonto)}</dd>
      <dt>Total a pagar mensual</dt><dd class="calc-result__total">${f(pila.total)}</dd>
    </dl>
    <p class="herramienta-inline__desc">
      Como independiente pagás el 100 % de tus aportes de seguridad social.
      Prima, cesantías y auxilio de transporte aplican solo a empleados dependientes.
    </p>`;
}

/**
 * Despacha al calculador correcto según el perfil seleccionado.
 * Nunca mezcla empleado e independiente.
 */
function _onSubmitSimuladorLaboral(e) {
  e.preventDefault();
  const datos  = Object.fromEntries(new FormData(e.target));
  const perfil = datos.perfil;
  const el     = document.getElementById('result-simulador-laboral');
  if (!el) return;

  if (perfil === 'empleado') {
    _calcularEmpleado(datos, el);
  } else if (perfil === 'independiente') {
    _calcularIndependiente(datos, el);
  }
  announce('Simulación actualizada.');
}

/**
 * Inicializa el simulador laboral gateado:
 * - Al cambiar el perfil (radio), muestra los campos del perfil elegido,
 *   oculta los del otro y habilita el botón Calcular.
 * - Al enviar, delega a la rama correcta.
 */
function _initSimuladorLaboral() {
  const form = document.getElementById('form-simulador-laboral');
  if (!form) return;

  form.addEventListener('change', (e) => {
    if (e.target.name !== 'perfil') return;
    const perfil  = e.target.value;
    const elEmp   = document.getElementById('sim-fields-empleado');
    const elInd   = document.getElementById('sim-fields-independiente');
    const elBtn   = document.getElementById('sim-btn-calcular');
    const elRes   = document.getElementById('result-simulador-laboral');
    if (elEmp) elEmp.hidden = perfil !== 'empleado';
    if (elInd) elInd.hidden = perfil !== 'independiente';
    if (elBtn) elBtn.hidden = false;
    // Limpiar resultado anterior al cambiar de perfil para no confundir.
    if (elRes) elRes.innerHTML = '';
  });

  form.addEventListener('submit', _onSubmitSimuladorLaboral);
}

/**
 * Inicializa el dominio de tesorería.
 * Registra acciones, inyecta el form, suscribe al EventBus y hace el primer render.
 */
export function initTesoreria() {
  registrarAccion('nueva-cuenta', _nuevaCuenta);
  registrarAccion('editar-cuenta', _editarCuenta);
  registrarAccion('eliminar-cuenta', _eliminarCuenta);

  _inyectarForm();

  _initSimuladorLaboral();

  EventBus.on('state:change', ({ section }) => {
    if (section === 'cuentas' || section === 'tesoreria' || section === 'compromisos') {
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

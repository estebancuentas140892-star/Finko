/**
 * tesoreria/acciones/ingresos.js - handlers de ingresos recurrentes y puntuales:
 * formularios, toggles condicionales, acreditar saldo y oferta de distribucion.
 *
 * Sub-modulo de tesoreria/index.js. Reglas de la capa:
 * - Handlers de data-action y wiring de formularios del subsistema.
 * - Coordina logic/ + views/ sin hacer calculos ni generar HTML aqui.
 */

import { S, EventBus } from '../../../core/state.js';
import { guardar, editar, eliminar } from '../../../infra/crud.js';
import { registrarAccion } from '../../../ui/actions.js';
import { abrirModal, cerrarModal } from '../../../ui/modales.js';
import { confirmar } from '../../../ui/confirm.js';
import { updSaldo } from '../../../infra/render.js';
import { announce } from '../../../infra/a11y.js';
import { mostrarErroresForm } from '../../../infra/form-errors.js';
import { f, hoy } from '../../../infra/utils.js';
import {
  validarIngreso,
  normalizarIngreso,
  validarIngresoPuntual,
  normalizarIngresoPuntual,
  estimarSalarioMensual,
  montoSalarioMinimoPorPeriodo,
  FRECUENCIAS_CON_DIA,
} from '../logic/ingresos.js';
import {
  renderFormIngreso,
  renderListaIngresos,
  renderListaIngresosPuntuales,
  renderFormIngresoPuntual,
} from '../view.js';

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

  const hintDia = grupoDia.querySelector('.form-hint');

  function _sync() {
    const frec    = selFrec.value;
    const mostrar = FRECUENCIAS_CON_DIA.includes(frec);
    grupoDia.hidden = !mostrar;
    if (!mostrar) {
      inputDia.value = '';
    } else if (frec === 'Quincenal') {
      inputDia.max         = '15';
      inputDia.placeholder = 'Ej. 15';
      if (labelDia) labelDia.textContent = 'Día de la primera quincena (1-15)';
      if (Number(inputDia.value) > 15) inputDia.value = '';
      if (hintDia) hintDia.textContent = 'Ingresa el primer día (1 a 15). Finko calcula el segundo sumando 15. Ejemplo: ingresa 15 y verás los días 15 y 30.';
    } else {
      inputDia.max         = '31';
      inputDia.placeholder = 'Ej. 30';
      if (labelDia) labelDia.textContent = 'Día de pago (1-31)';
      if (hintDia) hintDia.textContent = 'Opcional. ¿Qué día sueles recibir este pago?';
    }
  }

  selFrec.addEventListener('change', _sync);
  _sync();
}

/**
 * Conecta la lógica condicional de la categoría al form de ingreso:
 * - Muestra/oculta el fieldset de subsidio de transporte al elegir "Salario mínimo".
 * - Pre-llena el monto por período (salario mínimo dividido por la frecuencia).
 * - Re-pre-llena al cambiar el subsidio o la frecuencia de pago.
 * - Al elegir "Salario mínimo", también pre-llena la descripción.
 *
 * El salario mínimo es un ancla mensual; el campo `monto` guarda el valor por
 * período. Por eso Quincenal pre-llena la mitad y Semanal una cuarta parte aprox.
 *
 * @param {HTMLFormElement} form
 */
function _attachCategoriaToggle(form) {
  const selCat      = form.querySelector('[name="categoria"]');
  const grupoSubsid = form.querySelector('#form-group-salario-min');
  const cbSubsidio  = form.querySelector('#ingreso-subsidio');
  const selFrec     = form.querySelector('[name="frecuencia"]');
  const inputMonto  = form.querySelector('[name="monto"]');
  const inputDesc   = form.querySelector('[name="descripcion"]');
  if (!selCat || !grupoSubsid || !cbSubsidio) return;

  function _prellenarMonto() {
    if (!inputMonto) return;
    const frec = selFrec?.value || 'Mensual';
    inputMonto.value = montoSalarioMinimoPorPeriodo(cbSubsidio.checked, frec);
  }

  function _syncCategoria() {
    const esSalMin = selCat.value === 'Salario mínimo';
    grupoSubsid.hidden = !esSalMin;
    if (!esSalMin) {
      cbSubsidio.checked = false;
      return;
    }
    _prellenarMonto();
    if (inputDesc && !inputDesc.value.trim()) inputDesc.value = 'Salario mínimo';
  }

  selCat.addEventListener('change', _syncCategoria);
  cbSubsidio.addEventListener('change', () => {
    if (selCat.value === 'Salario mínimo') _prellenarMonto();
  });
  selFrec?.addEventListener('change', () => {
    if (selCat.value === 'Salario mínimo') _prellenarMonto();
  });
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
    if (form) {
      _attachDiaPagoToggle(form);
      _attachCategoriaToggle(form);
    }
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
  announce(idEdit ? 'Ingreso fijo actualizado.' : 'Ingreso fijo guardado.');
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
  if (titulo) titulo.textContent = 'Editar ingreso fijo';
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
      _attachCategoriaToggle(form);
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
    titulo:         'Eliminar ingreso fijo',
    mensaje:        `¿Quieres eliminar el ingreso fijo "${ing.descripcion}"? Esta acción no se puede deshacer.`,
    confirmarTexto: 'Eliminar',
    peligroso:      true,
  });
  if (!ok) return;

  eliminar('ingresos', id);
  renderListaIngresos();
  EventBus.emit('state:change', { section: 'ingresos' });
  announce(`Ingreso fijo "${ing.descripcion}" eliminado.`);
}

// ── INGRESOS PUNTUALES (NAV.A1) ──────────────────────────────────

/**
 * Ajusta el saldo de una cuenta en `delta` (positivo suma, negativo descuenta).
 * No-op si la cuenta no existe. Espejo del helper de Gastos: el ledger mueve el
 * saldo. Usa `editar()` para disparar save() + state:change.
 *
 * @param {string} cuentaId
 * @param {number} delta
 */
function _ajustarSaldoCuenta(cuentaId, delta) {
  if (!cuentaId || delta === 0) return;
  const cuenta = (S.cuentas ?? []).find(c => c.id === cuentaId);
  if (!cuenta) return;
  editar('cuentas', cuentaId, { saldo: (cuenta.saldo ?? 0) + delta });
}

/** Abre el modal de ingreso puntual en modo creación. */
function _nuevoIngresoPuntual() {
  const overlay = document.getElementById('modal-ingreso-puntual');
  if (!overlay) return;
  const body = document.getElementById('modal-ingreso-puntual-body');
  if (body) {
    body.innerHTML = renderFormIngresoPuntual();
    const form = body.querySelector('#form-ingreso-puntual');
    if (form) {
      // La fecha por defecto es hoy (se puede cambiar).
      const inputFecha = form.querySelector('[name="fecha"]');
      if (inputFecha) inputFecha.value = hoy();
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        _guardarIngresoPuntual();
      });
    }
  }
  abrirModal(overlay);
}

/**
 * Lee el formulario, valida, acredita la cuenta destino y guarda el ingreso
 * puntual. Acreditar el saldo es el efecto principal (el registro solo lo hace
 * trazable). No toca Análisis ni el resumen semanal (v8.8: la app no rastrea
 * ingresos como flujo, solo su efecto vía patrimonio).
 */
async function _guardarIngresoPuntual() {
  const form = document.getElementById('form-ingreso-puntual');
  if (!form) return;

  const datos = Object.fromEntries(new FormData(form));
  const errores = validarIngresoPuntual(datos);
  if (errores.length > 0) {
    mostrarErroresForm(form, errores);
    return;
  }

  const ingreso = normalizarIngresoPuntual(datos);

  // Acreditar la cuenta destino (espejo de un gasto, que la descuenta).
  _ajustarSaldoCuenta(ingreso.cuentaId, +ingreso.monto);
  guardar('ingresosPuntuales', ingreso);

  const overlay = document.getElementById('modal-ingreso-puntual');
  if (overlay) cerrarModal(overlay);

  updSaldo();
  renderListaIngresosPuntuales();
  announce(`Ingreso de ${f(ingreso.monto)} registrado.`);

  // NAV.A2b s2: ofrecer repartir el ingreso recién acreditado (modo "ya
  // acreditado" del asistente). Tras cerrar el modal para no apilar diálogos.
  await _ofrecerDistribucion(ingreso);
}

/**
 * true si el asistente "Distribuir mi ingreso" está disponible. El panel solo se
 * renderiza con un ingreso recurrente registrado (estimarSalarioMensual > 0):
 * sin él no hay a dónde abrir la oferta.
 */
function _hayAsistenteDistribucion() {
  return estimarSalarioMensual(S.ingresos ?? []) > 0;
}

/**
 * Tras registrar un ingreso puntual (ya acreditado), ofrece repartirlo con el
 * asistente en modo "ya acreditado" (NAV.A2b s2, ADR 024 D3). Solo si el
 * asistente existe; si el usuario acepta, `distribuir:abrir` navega a Mis
 * cuentas y lo abre con el monto y la cuenta del ingreso.
 *
 * @param {{ cuentaId: string, monto: number }} ingreso
 */
async function _ofrecerDistribucion(ingreso) {
  if (!_hayAsistenteDistribucion()) return;

  const ok = await confirmar({
    titulo:         'Ingreso registrado',
    mensaje:        `Sumaste ${f(ingreso.monto)} a tu cuenta. ¿Quieres repartirlo ahora entre tus necesidades, ahorros, deudas y demás?`,
    confirmarTexto: 'Distribuir',
    cancelarTexto:  'Ahora no',
  });
  if (!ok) return;

  EventBus.emit('distribuir:abrir', {
    preacreditado: { cuentaId: ingreso.cuentaId, monto: ingreso.monto },
  });
}

/** @param {HTMLElement} el */
async function _eliminarIngresoPuntual(el) {
  const id = el.dataset.id;
  if (!id) return;
  const ing = (S.ingresosPuntuales ?? []).find(i => i.id === id);
  if (!ing) return;

  const ok = await confirmar({
    titulo:         'Eliminar ingreso',
    mensaje:        `¿Quieres eliminar "${ing.descripcion}" (${f(ing.monto)})? Se descontará de tu cuenta y esta acción no se puede deshacer.`,
    confirmarTexto: 'Eliminar',
    peligroso:      true,
  });
  if (!ok) return;

  // Revertir el abono al saldo de la cuenta (espejo del borrado de un gasto,
  // que devuelve el monto). Si la cuenta ya no existe, solo se borra el registro.
  _ajustarSaldoCuenta(ing.cuentaId, -ing.monto);
  eliminar('ingresosPuntuales', id);

  updSaldo();
  renderListaIngresosPuntuales();
  announce(`Ingreso "${ing.descripcion}" eliminado.`);
}

// ── REGISTRO ─────────────────────────────────────────────────────

/** Registra los data-action del subsistema de ingresos. */
export function initAccionesIngresos() {
  registrarAccion('nuevo-ingreso',   _nuevoIngreso);
  registrarAccion('editar-ingreso',  _editarIngreso);
  registrarAccion('eliminar-ingreso', _eliminarIngreso);
  registrarAccion('nuevo-ingreso-puntual',    _nuevoIngresoPuntual);
  registrarAccion('eliminar-ingreso-puntual', _eliminarIngresoPuntual);
}

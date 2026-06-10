/**
 * apartados/index.js - API pública del dominio de apartados.
 *
 * Responsabilidades:
 * - Registrar acciones data-action propias del dominio.
 * - Inyectar los formularios en sus modales.
 * - Suscribirse a EventBus para re-renderizar cuando el estado cambia.
 * - Coordinar logic.js + view.js sin hacer cálculos ni generar HTML aquí.
 */

import { S, EventBus } from '../../core/state.js';
import { guardar, editar, eliminar } from '../../infra/crud.js';
import { registrarAccion } from '../../ui/actions.js';
import { abrirModal, cerrarModal, resetModal } from '../../ui/modales.js';
import { renderSmart, updSaldo } from '../../infra/render.js';
import { announce } from '../../infra/a11y.js';
import { mostrarErroresForm } from '../../infra/form-errors.js';
import { confirmar } from '../../ui/confirm.js';
import { f, hoy } from '../../infra/utils.js';
import {
  validarApartado, normalizarApartado, validarAbonoApartado,
  calcularProgreso, calcularAporteSugerido, reiniciarCiclo,
} from './logic.js';
import { renderListaApartados, renderFormApartado, renderFormAporteApartado } from './view.js';

// ── HANDLERS: CREAR / ELIMINAR ───────────────────────────────────

function _nuevoApartado() {
  const overlay = document.getElementById('modal-apartado');
  if (!overlay) return;
  resetModal(overlay);
  _resetSugerenciaLive();
  // resetModal limpia los campos; el periodo vuelve a ocultarse con el checkbox.
  _togglePeriodoRecurrencia(false);
  abrirModal(overlay);
}

function _guardarApartado() {
  const form = document.getElementById('form-apartado');
  if (!form) return;

  const datos = Object.fromEntries(new FormData(form));
  const errores = validarApartado(datos);

  if (errores.length > 0) {
    mostrarErroresForm(form, errores);
    return;
  }

  guardar('apartados', normalizarApartado(datos));

  const overlay = document.getElementById('modal-apartado');
  if (overlay) cerrarModal(overlay);

  renderListaApartados();
  announce('Apartado creado correctamente.');
}

/** @param {HTMLElement} el */
async function _eliminarApartado(el) {
  const id = el.dataset.id;
  if (!id) return;

  const apartado = S.apartados.find(a => a.id === id);
  if (!apartado) return;

  const ok = await confirmar({
    titulo:         'Eliminar apartado',
    mensaje:        `¿Quieres eliminar el apartado "${apartado.nombre}"? Esta acción no se puede deshacer.`,
    confirmarTexto: 'Eliminar',
    peligroso:      true,
  });
  if (!ok) return;

  eliminar('apartados', id);
  renderListaApartados();
  announce(`Apartado "${apartado.nombre}" eliminado.`);
}

/**
 * El usuario ya usó el dinero de un apartado recurrente (pagó el SOAT): se
 * reinicia el ciclo para el próximo periodo.
 * @param {HTMLElement} el
 */
function _reiniciarApartado(el) {
  const id = el.dataset.id;
  if (!id) return;

  const apartado = S.apartados.find(a => a.id === id);
  if (!apartado) return;

  const reiniciado = reiniciarCiclo(apartado, hoy());
  editar('apartados', id, {
    montoActual:   reiniciado.montoActual,
    completado:    reiniciado.completado,
    fechaObjetivo: reiniciado.fechaObjetivo,
  });

  renderListaApartados();
  announce(`Apartado "${apartado.nombre}" reiniciado para el próximo ciclo.`);
}

// ── HANDLERS: PLANTILLAS + SUGERENCIA EN VIVO ────────────────────

/**
 * Rellena nombre e icono del form con una plantilla rápida (SOAT, etc.).
 * @param {HTMLElement} el
 */
function _aplicarPlantilla(el) {
  const form = document.getElementById('form-apartado');
  if (!form) return;
  const nombre = el.dataset.nombre ?? '';
  const icono  = el.dataset.icono ?? '';
  const nombreInput = form.querySelector('[name="nombre"]');
  const iconoInput  = form.querySelector('[name="icono"]');
  if (nombreInput) nombreInput.value = nombre;
  if (iconoInput)  iconoInput.value  = icono;
  form.querySelector('[name="montoObjetivo"]')?.focus();
}

/**
 * Recalcula el hint en vivo del aporte sugerido a partir de lo que el usuario
 * lleva escrito en el form (monto objetivo + fecha + frecuencia).
 */
function _actualizarSugerenciaLive() {
  const form = document.getElementById('form-apartado');
  const hint = document.getElementById('apartado-sugerencia-live');
  if (!form || !hint) return;

  const datos    = Object.fromEntries(new FormData(form));
  const objetivo = Number(datos.montoObjetivo);

  if (!Number.isFinite(objetivo) || objetivo <= 0 || !datos.fechaObjetivo) {
    hint.textContent = 'Ponle un monto y una fecha para ver cuánto separar en cada pago.';
    return;
  }

  const sugerido = calcularAporteSugerido({
    montoObjetivo:    objetivo,
    montoActual:      0,
    fechaObjetivo:    datos.fechaObjetivo,
    frecuenciaAporte: datos.frecuenciaAporte,
  }, hoy());

  hint.textContent = sugerido
    ? `💡 Aparta ${f(sugerido.aportePorPeriodo)} ${sugerido.etiquetaPeriodo} (${sugerido.numPeriodos} ${sugerido.numPeriodos === 1 ? 'aporte' : 'aportes'}) para llegar a tiempo.`
    : 'Revisa la fecha: debe ser futura para calcular el aporte.';
}

function _resetSugerenciaLive() {
  const hint = document.getElementById('apartado-sugerencia-live');
  if (hint) hint.textContent = 'Ponle un monto y una fecha para ver cuánto separar en cada pago.';
}

// ── HANDLERS: APORTAR ────────────────────────────────────────────

/** @param {HTMLElement} el */
function _abrirAporte(el) {
  const id = el.dataset.id;
  if (!id) return;

  const apartado = S.apartados.find(a => a.id === id);
  if (!apartado) return;

  const overlay = document.getElementById('modal-aporte-apartado');
  if (!overlay) return;

  const titulo = overlay.querySelector('.modal__title');
  if (titulo) titulo.textContent = `Aportar: ${apartado.nombre}`;

  const body = overlay.querySelector('.modal__body');
  if (body) {
    body.innerHTML = renderFormAporteApartado(apartado);
    body.querySelector('#form-aporte-apartado')?.addEventListener('submit', (e) => {
      e.preventDefault();
      _guardarAporte();
    });
    body.querySelector('#aporte-apartado-monto')?.focus();
  }

  abrirModal(overlay);
}

function _guardarAporte() {
  const form = document.getElementById('form-aporte-apartado');
  if (!form) return;

  const datos = Object.fromEntries(new FormData(form));

  // Si hay varias cuentas activas, elegir cuenta es obligatorio.
  const cuentasActivas = (S.cuentas ?? []).filter(c => c.activa !== false);
  const requiereCuenta = cuentasActivas.length > 1;
  const erroresCuenta  = requiereCuenta && !datos.cuentaId
    ? ['Debes elegir desde qué cuenta sale el dinero.']
    : [];
  const errores = [...validarAbonoApartado(datos.monto), ...erroresCuenta];

  if (errores.length > 0) {
    mostrarErroresForm(form, errores);
    return;
  }

  const apartado = S.apartados.find(a => a.id === datos.apartadoId);
  if (!apartado) return;

  const aporte     = Number(datos.monto);
  const nuevoMonto = (apartado.montoActual ?? 0) + aporte;
  const { completado } = calcularProgreso({ ...apartado, montoActual: nuevoMonto });

  editar('apartados', datos.apartadoId, { montoActual: nuevoMonto, completado });

  // Descontar del saldo de la cuenta de origen (si se eligió una).
  if (datos.cuentaId) {
    _ajustarSaldoCuenta(datos.cuentaId, -aporte);
  }

  const overlay = document.getElementById('modal-aporte-apartado');
  if (overlay) cerrarModal(overlay);

  renderListaApartados();
  updSaldo();
  announce(completado
    ? `¡Apartado "${apartado.nombre}" completado! 🎉`
    : `Aporte de ${f(aporte)} registrado en "${apartado.nombre}".`
  );
}

/**
 * Ajusta el saldo de la cuenta indicada en `delta` (positivo o negativo).
 * No-op si `cuentaId` es null/undefined o la cuenta no existe.
 * @param {string|null|undefined} cuentaId
 * @param {number} delta
 */
function _ajustarSaldoCuenta(cuentaId, delta) {
  if (!cuentaId || delta === 0) return;
  const cuenta = (S.cuentas ?? []).find(c => c.id === cuentaId);
  if (!cuenta) return;
  editar('cuentas', cuentaId, { saldo: (cuenta.saldo ?? 0) + delta });
}

// ── INICIALIZACIÓN ───────────────────────────────────────────────

function _inyectarFormApartado() {
  const body = document.getElementById('modal-apartado-body');
  if (!body) return;

  body.innerHTML = renderFormApartado();

  const form = body.querySelector('#form-apartado');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    _guardarApartado();
  });

  // Recalcular el aporte sugerido cada vez que cambian monto, fecha o frecuencia.
  form.addEventListener('input', _actualizarSugerenciaLive);
  form.addEventListener('change', _actualizarSugerenciaLive);

  // Mostrar/ocultar el periodo de recurrencia según el checkbox "Se repite".
  const checkRecurrente = form.querySelector('#apartado-recurrente');
  checkRecurrente?.addEventListener('change', () => _togglePeriodoRecurrencia(checkRecurrente.checked));
}

/** Muestra u oculta el campo "¿cada cuánto se repite?" según el checkbox. */
function _togglePeriodoRecurrencia(visible) {
  const group = document.getElementById('apartado-periodo-group');
  if (group) group.hidden = !visible;
}

export function initApartados() {
  registrarAccion('nuevo-apartado',     _nuevoApartado);
  registrarAccion('eliminar-apartado',  _eliminarApartado);
  registrarAccion('aportar-apartado',   _abrirAporte);
  registrarAccion('reiniciar-apartado', _reiniciarApartado);
  registrarAccion('apartado-plantilla', _aplicarPlantilla);

  _inyectarFormApartado();

  EventBus.on('state:change', ({ section }) => {
    if (section === 'apartados') {
      renderSmart(renderListaApartados, 'apartados');
    }
  });

  // Re-render al navegar a #apartados (no hay state:change que lo dispare).
  window.addEventListener('hashchange', () => {
    renderSmart(renderListaApartados, 'apartados');
  });

  renderSmart(renderListaApartados, 'apartados');
}

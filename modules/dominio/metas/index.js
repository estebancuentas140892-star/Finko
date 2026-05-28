/**
 * metas/index.js - API pública del dominio de metas de ahorro.
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
import { renderSmart } from '../../infra/render.js';
import { announce } from '../../infra/a11y.js';
import { mostrarErroresForm } from '../../infra/form-errors.js';
import { confirmar } from '../../ui/confirm.js';
import { validarMeta, normalizarMeta, validarAbono, calcularProgreso } from './logic.js';
import { renderListaMetas, renderFormMeta } from './view.js';
import { f } from '../../infra/utils.js';
import { calcularCDT, calcularInteresCompuesto, validarCampos } from '../../infra/financiero.js';

// ── HANDLERS DE ACCIÓN ───────────────────────────────────────────

function _nuevaMeta() {
  const overlay = document.getElementById('modal-meta');
  if (!overlay) return;
  resetModal(overlay);
  abrirModal(overlay);
}

function _guardarMeta() {
  const form = document.getElementById('form-meta');
  if (!form) return;

  const datos = Object.fromEntries(new FormData(form));
  const errores = validarMeta(datos);

  if (errores.length > 0) {
    mostrarErroresForm(form, errores);
    return;
  }

  guardar('metas', normalizarMeta(datos));

  const overlay = document.getElementById('modal-meta');
  if (overlay) cerrarModal(overlay);

  renderListaMetas();
  announce('Meta creada correctamente.');
}

/** @param {HTMLElement} el */
async function _eliminarMeta(el) {
  const id = el.dataset.id;
  if (!id) return;

  const meta = S.metas.find(m => m.id === id);
  if (!meta) return;

  const ok = await confirmar({
    titulo:         'Eliminar meta',
    mensaje:        `¿Querés eliminar la meta "${meta.nombre}"? Esta acción no se puede deshacer.`,
    confirmarTexto: 'Eliminar',
    peligroso:      true,
  });
  if (!ok) return;

  eliminar('metas', id);
  renderListaMetas();
  announce(`Meta "${meta.nombre}" eliminada.`);
}

/** @param {HTMLElement} el */
function _abonarMeta(el) {
  const id = el.dataset.id;
  if (!id) return;

  const meta = S.metas.find(m => m.id === id);
  if (!meta) return;

  const rawAbono = window.prompt(`¿Cuánto querés abonar a "${meta.nombre}"? (COP)`);
  if (rawAbono === null) return; // usuario canceló

  const errores = validarAbono(rawAbono);
  if (errores.length > 0) {
    announce(errores[0], 'assertive');
    return;
  }

  const abono = Number(rawAbono);
  const nuevoMonto = (meta.montoActual ?? 0) + abono;
  const { completada } = calcularProgreso({ ...meta, montoActual: nuevoMonto });

  editar('metas', id, { montoActual: nuevoMonto, completada });

  renderListaMetas();
  announce(completada
    ? `¡Meta "${meta.nombre}" completada! 🎉`
    : `Abono de ${abono.toLocaleString('es-CO')} registrado.`
  );
}

// ── HERRAMIENTAS INLINE ──────────────────────────────────────────

function _onSubmitHerramientaCDT(e) {
  e.preventDefault();
  const form = e.currentTarget;
  const datos = {
    capital: form.querySelector('#hcdt-capital').value,
    tasa:    form.querySelector('#hcdt-tasa').value,
    plazo:   form.querySelector('#hcdt-plazo').value,
  };
  const errores = validarCampos(datos, {
    capital: { min: 1 },
    tasa:    { min: 0.01, max: 200 },
    plazo:   { min: 1, max: 3650, entero: true },
  });
  const resultDiv = document.getElementById('result-herramienta-cdt');
  if (errores.length > 0) {
    resultDiv.innerHTML = `<ul class="calc-result__errors">${errores.map(err => `<li>${err}</li>`).join('')}</ul>`;
    return;
  }
  const res = calcularCDT(Number(datos.capital), Number(datos.tasa) / 100, Number(datos.plazo));
  resultDiv.innerHTML = `
    <dl class="calc-result__grid">
      <dt>Valor futuro bruto</dt>           <dd>${f(res.valorFuturo)}</dd>
      <dt>Retención en la fuente (7 %)</dt> <dd class="calc-result__deduct">- ${f(res.retencion)}</dd>
      <dt>Rendimiento neto</dt>             <dd class="calc-result__highlight">${f(res.rendimientoNeto)}</dd>
      <dt>Total a recibir</dt>              <dd class="calc-result__total">${f(res.totalNeto)}</dd>
    </dl>`;
}

function _onSubmitHerramientaIC(e) {
  e.preventDefault();
  const form = e.currentTarget;
  const datos = {
    principal:       form.querySelector('#hic-principal').value,
    tasa:            form.querySelector('#hic-tasa').value,
    periodosPorAnio: form.querySelector('#hic-periodos').value,
    anios:           form.querySelector('#hic-anios').value,
  };
  const errores = validarCampos(datos, {
    principal:       { min: 1 },
    tasa:            { min: 0.01, max: 200 },
    periodosPorAnio: { min: 1 },
    anios:           { min: 1, max: 50, entero: true },
  });
  const resultDiv = document.getElementById('result-herramienta-ic');
  if (errores.length > 0) {
    resultDiv.innerHTML = `<ul class="calc-result__errors">${errores.map(err => `<li>${err}</li>`).join('')}</ul>`;
    return;
  }
  const res = calcularInteresCompuesto(
    Number(datos.principal),
    Number(datos.tasa),
    Number(datos.periodosPorAnio),
    Number(datos.anios),
  );
  resultDiv.innerHTML = `
    <dl class="calc-result__grid">
      <dt>Monto final</dt>           <dd class="calc-result__total">${f(res.montoFinal)}</dd>
      <dt>Ganancia total</dt>        <dd class="calc-result__highlight">${f(res.ganancia)}</dd>
      <dt>Factor de crecimiento</dt> <dd>x${res.factorCrecimiento}</dd>
    </dl>`;
}

// ── INICIALIZACIÓN ───────────────────────────────────────────────

function _inyectarForm() {
  const body = document.getElementById('modal-meta-body');
  if (!body) return;

  body.innerHTML = renderFormMeta();

  body.querySelector('#form-meta')?.addEventListener('submit', (e) => {
    e.preventDefault();
    _guardarMeta();
  });
}

export function initMetas() {
  registrarAccion('nueva-meta',    _nuevaMeta);
  registrarAccion('eliminar-meta', _eliminarMeta);
  registrarAccion('abonar-meta',   _abonarMeta);

  _inyectarForm();

  document.getElementById('form-herramienta-cdt')?.addEventListener('submit', _onSubmitHerramientaCDT);
  document.getElementById('form-herramienta-ic')?.addEventListener('submit', _onSubmitHerramientaIC);

  EventBus.on('state:change', ({ section }) => {
    if (section === 'metas') {
      renderSmart(renderListaMetas, 'metas');
    }
  });

  // Re-render al navegar a #metas - sin esto la sección aparece vacía
  // cuando el usuario llega navegando desde otra (no hay state:change que la dispare).
  window.addEventListener('hashchange', () => {
    renderSmart(renderListaMetas, 'metas');
  });

  renderSmart(renderListaMetas, 'metas');
}

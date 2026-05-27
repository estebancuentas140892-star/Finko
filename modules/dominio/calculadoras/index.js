/**
 * calculadoras/index.js - API pública del dominio de calculadoras.
 *
 * Las calculadoras son stateless: no mutan S, no usan EventBus, no registran
 * acciones data-action. Solo inyectan HTML y manejan sus propios form-submit.
 */

import { f } from '../../infra/utils.js';
import { renderSmart } from '../../infra/render.js';
import { announce } from '../../infra/a11y.js';
import {
  calcularCDT,
  calcularCredito,
  calcularInteresCompuesto,
  calcularRegla72,
  calcularPrima,
  calcularPILA,
  calcularRentabilidadReal,
  validarCampos,
} from './logic.js';
import {
  renderPanelCalculadoras,
  renderResultCDT,
  renderResultCredito,
  renderResultIC,
  renderResultR72,
  renderResultPrima,
  renderResultPILA,
  renderResultRentabilidadReal,
  renderError,
} from './view.js';

// ── HANDLERS DE CADA FORM ────────────────────────────────────────

function _onSubmitCDT(e) {
  e.preventDefault();
  const datos = Object.fromEntries(new FormData(e.target));
  const errores = validarCampos(datos, {
    principal: { min: 1 },
    tasaEA:    { min: 0.001, max: 100 },
    plazo:     { min: 1, entero: true },
  });
  const el = document.getElementById('result-cdt');
  if (!el) return;
  if (errores.length > 0) {
    el.innerHTML = renderError(errores);
    announce(errores[0], 'assertive');
    return;
  }
  const r = calcularCDT(Number(datos.principal), Number(datos.tasaEA) / 100, Number(datos.plazo));
  el.innerHTML = renderResultCDT(r, f);
  announce('Resultado CDT actualizado.');
}

function _onSubmitCredito(e) {
  e.preventDefault();
  const datos = Object.fromEntries(new FormData(e.target));
  const errores = validarCampos(datos, {
    principal:   { min: 1 },
    tasaEA:      { min: 0.001, max: 100 },
    plazoMeses:  { min: 1, entero: true },
  });
  const el = document.getElementById('result-credito');
  if (!el) return;
  if (errores.length > 0) {
    el.innerHTML = renderError(errores);
    announce(errores[0], 'assertive');
    return;
  }
  const tasaEA = Number(datos.tasaEA) / 100;
  const r      = calcularCredito(Number(datos.principal), tasaEA, Number(datos.plazoMeses));

  el.innerHTML = renderResultCredito(r, f);
  announce('Resultado credito actualizado.');
}

function _onSubmitIC(e) {
  e.preventDefault();
  const datos = Object.fromEntries(new FormData(e.target));
  const errores = validarCampos(datos, {
    principal:       { min: 1 },
    tasaAnualPct:    { min: 0.001 },
    periodosPorAnio: { min: 1, entero: true },
    anios:           { min: 1, entero: true },
  });
  const el = document.getElementById('result-ic');
  if (!el) return;
  if (errores.length > 0) {
    el.innerHTML = renderError(errores);
    announce(errores[0], 'assertive');
    return;
  }
  const r = calcularInteresCompuesto(
    Number(datos.principal),
    Number(datos.tasaAnualPct),
    Number(datos.periodosPorAnio),
    Number(datos.anios)
  );
  el.innerHTML = renderResultIC(r, f);
  announce('Resultado interés compuesto actualizado.');
}

function _onSubmitR72(e) {
  e.preventDefault();
  const datos = Object.fromEntries(new FormData(e.target));
  const errores = validarCampos(datos, {
    tasaAnualPct: { min: 0.001 },
  });
  const el = document.getElementById('result-r72');
  if (!el) return;
  if (errores.length > 0) {
    el.innerHTML = renderError(errores);
    announce(errores[0], 'assertive');
    return;
  }
  const r = calcularRegla72(Number(datos.tasaAnualPct));
  el.innerHTML = renderResultR72(r);
  announce('Resultado regla 72 actualizado.');
}

function _onSubmitPrima(e) {
  e.preventDefault();
  const datos = Object.fromEntries(new FormData(e.target));
  const errores = validarCampos(datos, {
    salario: { min: 1 },
    dias:    { min: 1, max: 180, entero: true },
  });
  const el = document.getElementById('result-prima');
  if (!el) return;
  if (errores.length > 0) {
    el.innerHTML = renderError(errores);
    announce(errores[0], 'assertive');
    return;
  }
  const r = calcularPrima(Number(datos.salario), Number(datos.dias));
  el.innerHTML = renderResultPrima(r, f);
  announce('Resultado prima actualizado.');
}

function _onSubmitPILA(e) {
  e.preventDefault();
  const datos = Object.fromEntries(new FormData(e.target));
  const errores = validarCampos(datos, {
    ingreso: { min: 1 },
    arl:     { min: 0.0001, max: 0.1 },
  });
  const el = document.getElementById('result-pila');
  if (!el) return;
  if (errores.length > 0) {
    el.innerHTML = renderError(errores);
    announce(errores[0], 'assertive');
    return;
  }
  const r = calcularPILA(Number(datos.ingreso), Number(datos.arl));
  el.innerHTML = renderResultPILA(r, f);
  announce('Resultado PILA actualizado.');
}

function _onSubmitRentabilidadReal(e) {
  e.preventDefault();
  const datos = Object.fromEntries(new FormData(e.target));
  const errores = validarCampos(datos, {
    capital:      { min: 1 },
    tasaPct:      { min: 0 },
    inflacionPct: { min: 0 },
  });
  const el = document.getElementById('result-real');
  if (!el) return;
  if (errores.length > 0) {
    el.innerHTML = renderError(errores);
    announce(errores[0], 'assertive');
    return;
  }
  const r = calcularRentabilidadReal(
    Number(datos.capital),
    Number(datos.tasaPct),
    Number(datos.inflacionPct)
  );
  el.innerHTML = renderResultRentabilidadReal(r, f);
  announce('Resultado rentabilidad real actualizado.');
}

// ── INYECCIÓN ────────────────────────────────────────────────────

function _inyectarPanel() {
  const panel = document.getElementById('panel-calc');
  if (!panel || panel.dataset.init === 'true') return;

  panel.innerHTML = renderPanelCalculadoras();
  panel.dataset.init = 'true';

  panel.querySelector('#form-cdt')?.addEventListener('submit',     _onSubmitCDT);
  panel.querySelector('#form-credito')?.addEventListener('submit', _onSubmitCredito);
  panel.querySelector('#form-ic')?.addEventListener('submit',      _onSubmitIC);
  panel.querySelector('#form-r72')?.addEventListener('submit',     _onSubmitR72);
  panel.querySelector('#form-prima')?.addEventListener('submit',   _onSubmitPrima);
  panel.querySelector('#form-pila')?.addEventListener('submit',    _onSubmitPILA);
  panel.querySelector('#form-real')?.addEventListener('submit',    _onSubmitRentabilidadReal);
}

// ── INIT ─────────────────────────────────────────────────────────

export function initCalculadoras() {
  // Inyectar panel en el primer render de la sección #calc.
  // renderSmart solo ejecuta si la sección está activa.
  renderSmart(_inyectarPanel, 'calc');

  // Re-intentar en cada hashchange (la primera vez que el usuario navega a #calc).
  window.addEventListener('hashchange', () => {
    renderSmart(_inyectarPanel, 'calc');
  });
}

/**
 * analisis/index.js - API pública del dominio de análisis.
 *
 * Análisis es un dominio de sólo lectura: no registra acciones de mutación,
 * no tiene formulario. Se limita a re-renderizar cuando cualquier dato cambia.
 */

import { EventBus } from '../../core/state.js';
import { renderSmart, registrarRender } from '../../infra/render.js';
import { renderAnalisis } from './view.js';
import { f } from '../../infra/utils.js';
import { calcularRegla72, calcularRentabilidadReal, validarCampos } from '../../infra/financiero.js';

// Secciones cuyos cambios requieren re-análisis.
const SECCIONES_OBSERVADAS = new Set([
  'ingresos', 'gastos', 'compromisos', 'cuentas', 'metas',
]);

// ── HERRAMIENTAS INLINE ──────────────────────────────────────────

function _onSubmitHerramientaR72(e) {
  e.preventDefault();
  const form = e.currentTarget;
  const datos = { tasa: form.querySelector('#hr72-tasa').value };
  const errores = validarCampos(datos, { tasa: { min: 0.01, max: 200 } });
  const resultDiv = document.getElementById('result-herramienta-r72');
  if (errores.length > 0) {
    resultDiv.innerHTML = `<ul class="calc-result__errors">${errores.map(err => `<li>${err}</li>`).join('')}</ul>`;
    return;
  }
  const res = calcularRegla72(Number(datos.tasa));
  resultDiv.innerHTML = `
    <dl class="calc-result__grid">
      <dt>Tiempo aproximado (regla 72)</dt> <dd class="calc-result__highlight">${res.aniosAproximados} años</dd>
      <dt>Tiempo exacto (logarítmico)</dt>  <dd>${res.aniosExactos} años</dd>
    </dl>`;
}

function _onSubmitHerramientaRentabilidad(e) {
  e.preventDefault();
  const form = e.currentTarget;
  const datos = {
    capital:   form.querySelector('#hreal-capital').value,
    tasa:      form.querySelector('#hreal-tasa').value,
    inflacion: form.querySelector('#hreal-inflacion').value,
  };
  const errores = validarCampos(datos, {
    capital:   { min: 1 },
    tasa:      { min: 0, max: 200 },
    inflacion: { min: 0, max: 100 },
  });
  const resultDiv = document.getElementById('result-herramienta-rentabilidad');
  if (errores.length > 0) {
    resultDiv.innerHTML = `<ul class="calc-result__errors">${errores.map(err => `<li>${err}</li>`).join('')}</ul>`;
    return;
  }
  const res = calcularRentabilidadReal(Number(datos.capital), Number(datos.tasa), Number(datos.inflacion));
  const claseTasa = res.tasaRealPct >= 0 ? 'calc-result__highlight' : 'calc-result__deduct';
  resultDiv.innerHTML = `
    <dl class="calc-result__grid">
      <dt>Tasa real anual</dt>                     <dd class="${claseTasa}">${res.tasaRealPct.toFixed(2)} %</dd>
      <dt>Ganancia nominal</dt>                    <dd>${f(res.gananciaNominal)}</dd>
      <dt>Ganancia real (poder adquisitivo)</dt>   <dd class="calc-result__total">${f(res.gananciaReal)}</dd>
      <dt>Perdida por inflacion</dt>               <dd class="calc-result__deduct">- ${f(res.perdidaInflacion)}</dd>
    </dl>`;
}

export function initAnalisis() {
  // Registrar en renderAll para que se actualice con cualquier render global.
  registrarRender(() => renderSmart(renderAnalisis, 'analisis'));

  // Re-renderizar cuando cambia cualquier sección relevante.
  EventBus.on('state:change', ({ section }) => {
    if (SECCIONES_OBSERVADAS.has(section)) {
      renderSmart(renderAnalisis, 'analisis');
    }
  });

  // Re-render al navegar a #analisis (sin esto la sección aparece vacía
  // hasta que cambien datos relevantes).
  window.addEventListener('hashchange', () => {
    renderSmart(renderAnalisis, 'analisis');
  });

  // Render inicial si arrancamos directamente en #analisis.
  renderSmart(renderAnalisis, 'analisis');

  document.getElementById('form-herramienta-r72')?.addEventListener('submit', _onSubmitHerramientaR72);
  document.getElementById('form-herramienta-rentabilidad')?.addEventListener('submit', _onSubmitHerramientaRentabilidad);
}

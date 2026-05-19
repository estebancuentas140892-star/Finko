/**
 * calculadoras/view.js - HTML del panel de calculadoras financieras.
 * Sin efectos secundarios. Los resultados se inyectan desde index.js.
 */

import { SMMLV } from '../../core/constants.js';

// ── PANEL COMPLETO ───────────────────────────────────────────────

/**
 * Devuelve el HTML de todo el panel de calculadoras.
 * Cada calculadora es una sección independiente con su propio form.
 * @returns {string}
 */
export function renderPanelCalculadoras() {
  return `
    <div class="calc-panel">
      ${_renderCDT()}
      ${_renderCredito()}
      ${_renderInteresCompuesto()}
      ${_renderRegla72()}
      ${_renderPrima()}
      ${_renderPILA()}
      ${_renderRentabilidadReal()}
    </div>`;
}

// ── CALCULADORA CDT ──────────────────────────────────────────────

function _renderCDT() {
  return `
    <section class="calc-card" aria-labelledby="calc-cdt-title">
      <h2 class="calc-card__title" id="calc-cdt-title">🏦 CDT - Certificado de Depósito a Término</h2>
      <form id="form-cdt" class="calc-form" novalidate>
        <div class="calc-form__fields">
          <div class="form-group">
            <label for="cdt-capital" class="label">Capital invertido (COP)</label>
            <input id="cdt-capital" name="principal" class="input" type="number"
                   min="100000" step="100000" placeholder="5.000.000" required />
          </div>
          <div class="form-group">
            <label for="cdt-tasa" class="label">Tasa EA (%)</label>
            <input id="cdt-tasa" name="tasaEA" class="input" type="number"
                   min="0.1" max="100" step="0.1" placeholder="12.5" required />
          </div>
          <div class="form-group">
            <label for="cdt-plazo" class="label">Plazo (días)</label>
            <input id="cdt-plazo" name="plazo" class="input" type="number"
                   min="30" max="1825" step="30" placeholder="360" required />
          </div>
        </div>
        <button type="submit" class="btn btn-primary">Calcular</button>
      </form>
      <div id="result-cdt" class="calc-result" aria-live="polite"></div>
    </section>`;
}

/**
 * Renderiza el resultado del CDT.
 * @param {{ valorFuturo:number, rendimientoBruto:number, retencion:number,
 *            rendimientoNeto:number, totalNeto:number }} r
 * @param {Function} fmt - función de formateo COP.
 */
export function renderResultCDT(r, fmt) {
  return `
    <dl class="calc-result__grid">
      <dt>Valor futuro bruto</dt>       <dd>${fmt(r.valorFuturo)}</dd>
      <dt>Rendimiento bruto</dt>        <dd>${fmt(r.rendimientoBruto)}</dd>
      <dt>Retención en la fuente (7%)</dt><dd class="calc-result__deduct">− ${fmt(r.retencion)}</dd>
      <dt>Rendimiento neto</dt>         <dd class="calc-result__highlight">${fmt(r.rendimientoNeto)}</dd>
      <dt>Total a recibir</dt>          <dd class="calc-result__total">${fmt(r.totalNeto)}</dd>
    </dl>`;
}

// ── CALCULADORA CRÉDITO ──────────────────────────────────────────

function _renderCredito() {
  return `
    <section class="calc-card" aria-labelledby="calc-credito-title">
      <h2 class="calc-card__title" id="calc-credito-title">💳 Crédito - Cuota fija (sistema francés)</h2>
      <form id="form-credito" class="calc-form" novalidate>
        <div class="calc-form__fields">
          <div class="form-group">
            <label for="cred-monto" class="label">Monto del crédito (COP)</label>
            <input id="cred-monto" name="principal" class="input" type="number"
                   min="100000" step="100000" placeholder="10.000.000" required />
          </div>
          <div class="form-group">
            <label for="cred-tasa" class="label">Tasa EA (%)</label>
            <input id="cred-tasa" name="tasaEA" class="input" type="number"
                   min="0.1" max="100" step="0.1" placeholder="24" required />
          </div>
          <div class="form-group">
            <label for="cred-plazo" class="label">Plazo (meses)</label>
            <input id="cred-plazo" name="plazoMeses" class="input" type="number"
                   min="1" max="360" step="1" placeholder="36" required />
          </div>
        </div>
        <button type="submit" class="btn btn-primary">Calcular</button>
      </form>
      <div id="result-credito" class="calc-result" aria-live="polite"></div>
    </section>`;
}

export function renderResultCredito(r, fmt) {
  return `
    <dl class="calc-result__grid">
      <dt>Tasa mensual efectiva</dt>    <dd>${r.tasaMensual}%</dd>
      <dt>Cuota mensual fija</dt>       <dd class="calc-result__highlight">${fmt(r.cuotaMensual)}</dd>
      <dt>Total pagado</dt>             <dd>${fmt(r.totalPagado)}</dd>
      <dt>Total intereses</dt>          <dd class="calc-result__deduct">${fmt(r.totalIntereses)}</dd>
    </dl>`;
}

// ── CALCULADORA INTERÉS COMPUESTO ────────────────────────────────

function _renderInteresCompuesto() {
  return `
    <section class="calc-card" aria-labelledby="calc-ic-title">
      <h2 class="calc-card__title" id="calc-ic-title">📈 Interés compuesto</h2>
      <form id="form-ic" class="calc-form" novalidate>
        <div class="calc-form__fields">
          <div class="form-group">
            <label for="ic-capital" class="label">Capital inicial (COP)</label>
            <input id="ic-capital" name="principal" class="input" type="number"
                   min="1000" step="100000" placeholder="1.000.000" required />
          </div>
          <div class="form-group">
            <label for="ic-tasa" class="label">Tasa anual (%)</label>
            <input id="ic-tasa" name="tasaAnualPct" class="input" type="number"
                   min="0.1" max="200" step="0.1" placeholder="12" required />
          </div>
          <div class="form-group">
            <label for="ic-n" class="label">Períodos por año</label>
            <select id="ic-n" name="periodosPorAnio" class="input" required>
              <option value="1">Anual (1)</option>
              <option value="2">Semestral (2)</option>
              <option value="4">Trimestral (4)</option>
              <option value="12" selected>Mensual (12)</option>
              <option value="365">Diaria (365)</option>
            </select>
          </div>
          <div class="form-group">
            <label for="ic-anios" class="label">Años</label>
            <input id="ic-anios" name="anios" class="input" type="number"
                   min="1" max="50" step="1" placeholder="5" required />
          </div>
        </div>
        <button type="submit" class="btn btn-primary">Calcular</button>
      </form>
      <div id="result-ic" class="calc-result" aria-live="polite"></div>
    </section>`;
}

export function renderResultIC(r, fmt) {
  return `
    <dl class="calc-result__grid">
      <dt>Monto final</dt>        <dd class="calc-result__total">${fmt(r.montoFinal)}</dd>
      <dt>Ganancia total</dt>     <dd class="calc-result__highlight">${fmt(r.ganancia)}</dd>
      <dt>Factor de crecimiento</dt><dd>×${r.factorCrecimiento}</dd>
    </dl>`;
}

// ── REGLA DEL 72 ─────────────────────────────────────────────────

function _renderRegla72() {
  return `
    <section class="calc-card" aria-labelledby="calc-r72-title">
      <h2 class="calc-card__title" id="calc-r72-title">⚡ Regla del 72 - ¿En cuánto doblo mi plata?</h2>
      <form id="form-r72" class="calc-form" novalidate>
        <div class="calc-form__fields">
          <div class="form-group">
            <label for="r72-tasa" class="label">Tasa de rendimiento anual (%)</label>
            <input id="r72-tasa" name="tasaAnualPct" class="input" type="number"
                   min="0.1" max="200" step="0.1" placeholder="12" required />
          </div>
        </div>
        <button type="submit" class="btn btn-primary">Calcular</button>
      </form>
      <div id="result-r72" class="calc-result" aria-live="polite"></div>
    </section>`;
}

export function renderResultR72(r) {
  return `
    <dl class="calc-result__grid">
      <dt>Años aproximados (regla 72)</dt> <dd class="calc-result__highlight">${r.aniosAproximados} años</dd>
      <dt>Años exactos (logarítmico)</dt>  <dd>${r.aniosExactos} años</dd>
    </dl>`;
}

// ── PRIMA DE SERVICIOS ────────────────────────────────────────────

function _renderPrima() {
  return `
    <section class="calc-card" aria-labelledby="calc-prima-title">
      <h2 class="calc-card__title" id="calc-prima-title">🎁 Prima de servicios - Colombia</h2>
      <form id="form-prima" class="calc-form" novalidate>
        <div class="calc-form__fields">
          <div class="form-group">
            <label for="prima-salario" class="label">Salario mensual (COP)</label>
            <input id="prima-salario" name="salario" class="input" type="number"
                   min="${SMMLV}" step="100000"
                   placeholder="${SMMLV.toLocaleString('es-CO')}" required />
          </div>
          <div class="form-group">
            <label for="prima-dias" class="label">Días trabajados en el semestre (máx. 180)</label>
            <input id="prima-dias" name="dias" class="input" type="number"
                   min="1" max="180" step="1" placeholder="180" required />
          </div>
        </div>
        <button type="submit" class="btn btn-primary">Calcular</button>
      </form>
      <div id="result-prima" class="calc-result" aria-live="polite"></div>
    </section>`;
}

export function renderResultPrima(r, fmt) {
  const auxilioLabel = r.incluyeAuxilio
    ? `Sí (${fmt(r.auxilioAplicado)})`
    : 'No (salario > 2 SMMLV)';
  return `
    <dl class="calc-result__grid">
      <dt>Salario base liquidación</dt>   <dd>${fmt(r.salarioBase)}</dd>
      <dt>Incluye auxilio transporte</dt> <dd>${auxilioLabel}</dd>
      <dt>Prima a pagar</dt>              <dd class="calc-result__total">${fmt(r.prima)}</dd>
    </dl>`;
}

// ── CALCULADORA PILA (independientes) ─────────────────────────────

function _renderPILA() {
  return `
    <section class="calc-card" aria-labelledby="calc-pila-title">
      <h2 class="calc-card__title" id="calc-pila-title">🧾 PILA - Aportes de independiente</h2>
      <form id="form-pila" class="calc-form" novalidate>
        <div class="calc-form__fields">
          <div class="form-group">
            <label for="pila-ingreso" class="label">Ingreso mensual bruto (COP)</label>
            <input id="pila-ingreso" name="ingreso" class="input" type="number"
                   min="1" step="100000" placeholder="3.000.000" required />
          </div>
          <div class="form-group">
            <label for="pila-arl" class="label">Clase de riesgo ARL</label>
            <select id="pila-arl" name="arl" class="input">
              <option value="0.00522" selected>Clase I - riesgo mínimo (oficina) 0.522%</option>
              <option value="0.01044">Clase II - riesgo bajo 1.044%</option>
              <option value="0.02436">Clase III - riesgo medio 2.436%</option>
              <option value="0.04350">Clase IV - riesgo alto 4.350%</option>
              <option value="0.06960">Clase V - riesgo máximo 6.960%</option>
            </select>
          </div>
        </div>
        <button type="submit" class="btn btn-primary">Calcular</button>
      </form>
      <div id="result-pila" class="calc-result" aria-live="polite"></div>
    </section>`;
}

/**
 * @param {{ibc:number,salud:number,pension:number,arlMonto:number,total:number}} r
 * @param {Function} fmt
 */
export function renderResultPILA(r, fmt) {
  return `
    <dl class="calc-result__grid">
      <dt>IBC (base de cotización)</dt>     <dd>${fmt(r.ibc)}</dd>
      <dt>Salud (12.5 %)</dt>               <dd>${fmt(r.salud)}</dd>
      <dt>Pensión (16 %)</dt>               <dd>${fmt(r.pension)}</dd>
      <dt>ARL</dt>                          <dd>${fmt(r.arlMonto)}</dd>
      <dt>Total a pagar</dt>                <dd class="calc-result__total">${fmt(r.total)}</dd>
    </dl>`;
}

// ── CALCULADORA RENTABILIDAD REAL (Fisher) ────────────────────────

function _renderRentabilidadReal() {
  return `
    <section class="calc-card" aria-labelledby="calc-real-title">
      <h2 class="calc-card__title" id="calc-real-title">📉 Rentabilidad real - ajuste por inflación</h2>
      <form id="form-real" class="calc-form" novalidate>
        <div class="calc-form__fields">
          <div class="form-group">
            <label for="real-capital" class="label">Capital invertido (COP)</label>
            <input id="real-capital" name="capital" class="input" type="number"
                   min="1" step="100000" placeholder="10.000.000" required />
          </div>
          <div class="form-group">
            <label for="real-tasa" class="label">Tasa nominal anual (%)</label>
            <input id="real-tasa" name="tasaPct" class="input" type="number"
                   min="0" max="200" step="0.1" placeholder="12" required />
          </div>
          <div class="form-group">
            <label for="real-inflacion" class="label">Inflación anual (%)</label>
            <input id="real-inflacion" name="inflacionPct" class="input" type="number"
                   min="0" max="100" step="0.1" placeholder="5.2" required />
          </div>
        </div>
        <button type="submit" class="btn btn-primary">Calcular</button>
      </form>
      <div id="result-real" class="calc-result" aria-live="polite"></div>
    </section>`;
}

/**
 * @param {{tasaRealPct:number,gananciaNominal:number,gananciaReal:number,perdidaInflacion:number}} r
 * @param {Function} fmt
 */
export function renderResultRentabilidadReal(r, fmt) {
  const positiva = r.tasaRealPct >= 0;
  const claseTasa = positiva ? 'calc-result__highlight' : 'calc-result__deduct';
  return `
    <dl class="calc-result__grid">
      <dt>Tasa real anual</dt>              <dd class="${claseTasa}">${r.tasaRealPct.toFixed(2)} %</dd>
      <dt>Ganancia nominal</dt>             <dd>${fmt(r.gananciaNominal)}</dd>
      <dt>Ganancia real (poder adquisitivo)</dt><dd class="calc-result__total">${fmt(r.gananciaReal)}</dd>
      <dt>Pérdida por inflación</dt>        <dd class="calc-result__deduct">− ${fmt(r.perdidaInflacion)}</dd>
    </dl>`;
}

// ── BADGE DE CLASIFICACIÓN DE TASA (helper para Crédito) ──────────

/**
 * Devuelve un badge HTML con la clasificación de la tasa contra la usura SFC.
 * Usado como complemento del resultado del crédito.
 * @param {'usura'|'alta'|'estandar'|'razonable'} banda
 * @returns {string}
 */
export function renderBadgeTasa(banda) {
  const config = {
    usura:     { icon: '🚫', txt: 'Excede la usura legal (SFC)', cls: 'calc-result__deduct' },
    alta:      { icon: '⚠️', txt: 'Tasa alta - cercana al tope de usura', cls: 'calc-result__deduct' },
    estandar:  { icon: '✓',  txt: 'Tasa estándar de mercado', cls: '' },
    razonable: { icon: '✓',  txt: 'Tasa razonable', cls: 'calc-result__highlight' },
  };
  const c = config[banda] || config.estandar;
  return `<p class="calc-result__badge ${c.cls}">${c.icon} ${c.txt}</p>`;
}

// ── ALERTA DE USURA (G.3.F4) ─────────────────────────────────────

/**
 * Renderiza un bloque de alerta critica cuando la tasa del credito
 * supera el tope legal de usura vigente (SFC).
 *
 * Debe mostrarse ANTES del resultado del calculo para que el usuario
 * lo vea antes de interpretar las cifras.
 *
 * @param {number} tasaEAPct - Tasa ingresada en porcentaje (ej. 35.5 para 35.5% EA).
 * @param {{ tasa: number, periodo: string, fuente: string }} usuraInfo
 * @returns {string}
 */
export function renderAlertaUsura(tasaEAPct, usuraInfo) {
  const usuraPct  = (usuraInfo.tasa * 100).toFixed(2);
  const excedePct = (tasaEAPct - usuraInfo.tasa * 100).toFixed(2);
  return `
    <div class="nudge nudge-critical" role="alert" aria-live="assertive">
      <span class="nudge__icon" aria-hidden="true">🚫</span>
      <div class="nudge__body">
        <p class="nudge__title">Tasa por encima del limite legal de usura</p>
        <p class="nudge__desc">
          Ingresaste <strong>${tasaEAPct.toFixed(2)}% EA</strong>,
          pero el tope legal es <strong>${usuraPct}% EA</strong>
          (${usuraInfo.periodo} - ${usuraInfo.fuente}).
          Esta tasa supera en <strong>${excedePct} puntos</strong> el maximo permitido:
          cobrarla es ilegal en Colombia (Art. 68 Ley 45/1990).
        </p>
      </div>
      <a class="nudge__cta btn btn-sm btn-danger"
         href="https://www.sfc.gov.co" target="_blank" rel="noopener noreferrer"
         aria-label="Consultar tasas vigentes en la SFC (abre en nueva pestana)">
        Ver SFC
      </a>
    </div>`;
}

// ── MENSAJE DE ERROR GENÉRICO ─────────────────────────────────────

export function renderError(errores) {
  const items = errores.map(e => `<li>${e}</li>`).join('');
  return `<ul class="calc-result__errors" role="alert">${items}</ul>`;
}

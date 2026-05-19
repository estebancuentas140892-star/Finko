/**
 * analisis/view.js — generación de HTML del panel de análisis financiero.
 * Puede leer S. No puede mutarlo. Sin lógica de negocio.
 */

import { S } from '../../core/state.js';
import { f, hoy } from '../../infra/utils.js';
import { sparkline, donut, colorearSegmentos } from '../../infra/svg.js';
import { gastosMes } from '../gastos/logic.js';
import { generarResumen, serieGastosMensual, seriePorCategoria, calcularScoreSalud, clasificarScore } from './logic.js';

// ── PANEL PRINCIPAL ──────────────────────────────────────────────

/**
 * Renderiza el análisis completo en `#panel-analisis`.
 * No-op si el contenedor no existe.
 */
export function renderAnalisis() {
  const el = document.getElementById('panel-analisis');
  if (!el) return;

  const fechaHoy = hoy();
  const anio = Number(fechaHoy.slice(0, 4));
  const mes  = Number(fechaHoy.slice(5, 7));

  const resumen = generarResumen(
    S.ingresos, S.gastos, S.compromisos, S.cuentas, anio, mes, S.metas
  );

  // Series para gráficos (D.3). Se calculan aquí para no inflar generarResumen.
  const serieGastos    = serieGastosMensual(S.gastos, anio, mes, 12);
  const gastosDelMes   = gastosMes(S.gastos, anio, mes);
  const segmentosCat   = colorearSegmentos(seriePorCategoria(gastosDelMes, 6));

  el.innerHTML = `
    ${_renderMetricas(resumen)}
    ${_renderSalud(resumen.tasaAhorro, resumen.salud)}
    ${_renderScoreSalud(resumen)}
    ${_renderPatrimonio(resumen)}
    ${_renderTendencia(serieGastos)}
    ${_renderPorCategoria(resumen.porCategoria, resumen.gastoMes, segmentosCat)}
    ${_renderHormigas(resumen.hormigas)}
  `;
}

// ── SECCIONES INTERNAS ───────────────────────────────────────────

function _renderMetricas({ ingresoMensual, gastoMes, compromisoMensual, balance }) {
  const balanceClase = balance >= 0 ? 'metric-card--positive' : 'metric-card--negative';
  const balanceSigNo = balance >= 0 ? '+' : '';

  return `
    <section class="analisis__section" aria-labelledby="analisis-metricas-title">
      <h2 class="analisis__section-title" id="analisis-metricas-title">Resumen del mes</h2>
      <div class="metric-grid">
        <article class="metric-card">
          <p class="metric-card__label">Ingresos proyectados</p>
          <p class="metric-card__value">${f(ingresoMensual)}</p>
        </article>
        <article class="metric-card">
          <p class="metric-card__label">Gastos registrados</p>
          <p class="metric-card__value">${f(gastoMes)}</p>
        </article>
        <article class="metric-card">
          <p class="metric-card__label">Compromisos mensuales</p>
          <p class="metric-card__value">${f(compromisoMensual)}</p>
        </article>
        <article class="metric-card ${balanceClase}">
          <p class="metric-card__label">Balance neto</p>
          <p class="metric-card__value">${balanceSigNo}${f(balance)}</p>
        </article>
      </div>
    </section>`;
}

function _renderSalud(tasaAhorro, salud) {
  const LABELS = {
    excelente: { texto: 'Excelente 🌟',  desc: 'Estás ahorrando más del 20 % de tus ingresos.' },
    buena:     { texto: 'Buena 👍',       desc: 'Ahorrás entre el 10 % y el 19 % de tus ingresos.' },
    ajustada:  { texto: 'Ajustada ⚠️',   desc: 'Margen de ahorro menor al 10 %. Revisá tus gastos.' },
    critica:   { texto: 'Crítica 🔴',     desc: 'Gastás más de lo que ingresás. Atención urgente.' },
  };
  const { texto, desc } = LABELS[salud] ?? LABELS.ajustada;
  const porcentajeDisplay = Math.max(0, tasaAhorro);

  return `
    <section class="analisis__section" aria-labelledby="analisis-salud-title">
      <h2 class="analisis__section-title" id="analisis-salud-title">Salud financiera</h2>
      <div class="salud-card salud-card--${salud}">
        <p class="salud-card__nivel">${texto}</p>
        <p class="salud-card__desc">${desc}</p>
        <div class="progress" role="progressbar"
             aria-valuenow="${porcentajeDisplay}" aria-valuemin="0" aria-valuemax="100"
             aria-label="Tasa de ahorro: ${tasaAhorro}%">
          <div class="progress-bar progress-bar--salud-${salud}"
               style="width:${porcentajeDisplay}%"></div>
        </div>
        <p class="salud-card__tasa">Tasa de ahorro: <strong>${tasaAhorro}%</strong></p>
      </div>
    </section>`;
}

function _renderScoreSalud(resumen) {
  const score = calcularScoreSalud(resumen);
  const banda = clasificarScore(score.score);
  const ETIQUETAS = {
    excelente: { emoji: '🌟', label: 'Excelente' },
    buena:     { emoji: '👍', label: 'Buena' },
    ajustada:  { emoji: '⚠️', label: 'Ajustada' },
    critica:   { emoji: '🔴', label: 'Crítica' },
  };
  const { emoji, label } = ETIQUETAS[banda];

  return `
    <section class="analisis__section" aria-labelledby="analisis-score-title">
      <h2 class="analisis__section-title" id="analisis-score-title">📊 Score de salud</h2>
      <div class="score-card score-card--${banda}">
        <div class="score-card__hero">
          <p class="score-card__numero">${score.score}</p>
          <p class="score-card__sobre">/ 100</p>
          <p class="score-card__label">${emoji} ${label}</p>
        </div>

        <div class="progress score-card__bar" role="progressbar"
             aria-valuenow="${score.score}" aria-valuemin="0" aria-valuemax="100"
             aria-label="Score de salud: ${score.score} de 100">
          <div class="progress-bar progress-bar--score-${banda}"
               style="width:${score.score}%"></div>
        </div>

        <div class="score-card__factors">
          <div class="score-factor">
            <p class="score-factor__label">📈 Ahorro</p>
            <p class="score-factor__valor">${score.factors.tasaAhorro}</p>
            <div class="progress score-factor__bar">
              <div class="progress-bar" style="width:${score.factors.tasaAhorro}%"></div>
            </div>
          </div>
          <div class="score-factor">
            <p class="score-factor__label">💳 Deuda</p>
            <p class="score-factor__valor">${score.factors.deuda}</p>
            <div class="progress score-factor__bar">
              <div class="progress-bar" style="width:${score.factors.deuda}%"></div>
            </div>
          </div>
          <div class="score-factor">
            <p class="score-factor__label">💰 Liquidez</p>
            <p class="score-factor__valor">${score.factors.liquidez}</p>
            <div class="progress score-factor__bar">
              <div class="progress-bar" style="width:${score.factors.liquidez}%"></div>
            </div>
          </div>
          <div class="score-factor">
            <p class="score-factor__label">📊 Control</p>
            <p class="score-factor__valor">${score.factors.control}</p>
            <div class="progress score-factor__bar">
              <div class="progress-bar" style="width:${score.factors.control}%"></div>
            </div>
          </div>
        </div>

        <p class="score-card__explicacion">${_esc(score.explicacion)}</p>
      </div>
    </section>`;
}

function _renderPatrimonio({ activos, pasivos, patrimonioNeto, proyeccion, balance }) {
  const esPositivo  = patrimonioNeto >= 0;
  const heroClase   = esPositivo ? 'patrimonio-hero--positivo' : 'patrimonio-hero--negativo';
  const valorClase  = esPositivo ? 'patrimonio-hero__valor--positivo' : 'patrimonio-hero__valor--negativo';
  const signo       = esPositivo ? '' : '−';
  const valorAbs    = Math.abs(patrimonioNeto);

  // Proyección: color basado en el valor proyectado.
  const _claseProyeccion = (val) => val >= 0 ? 'proyeccion-card__valor--positivo' : 'proyeccion-card__valor--negativo';
  const _fProyeccion = (val) => `${val < 0 ? '−' : ''}${f(Math.abs(val))}`;

  // CTA si hay deudas sin saldo registrado.
  const ctaDeudas = pasivos.deudasSinSaldo > 0
    ? `<p class="analisis__hint">
        Tenés <strong>${pasivos.deudasSinSaldo} deuda${pasivos.deudasSinSaldo > 1 ? 's' : ''}</strong>
        sin saldo registrado. Completalas en
        <a href="#compromisos" class="link">Compromisos</a>
        para calcular tu patrimonio real.
      </p>`
    : '';

  // Texto de ahorro para proyección.
  const ahorroLabel = balance >= 0
    ? `Si mantenés tu ahorro actual de <strong>${f(balance)}/mes</strong>…`
    : `Con tu déficit actual de <strong>−${f(Math.abs(balance))}/mes</strong>…`;

  return `
    <section class="analisis__section" aria-labelledby="analisis-patrimonio-title">
      <h2 class="analisis__section-title" id="analisis-patrimonio-title">Patrimonio neto</h2>

      <div class="patrimonio-hero ${heroClase}">
        <p class="patrimonio-hero__label">Tu patrimonio neto hoy</p>
        <p class="patrimonio-hero__valor ${valorClase}" aria-label="Patrimonio neto: ${signo}${f(valorAbs)}">
          ${signo}${f(valorAbs)}
        </p>
        <p class="patrimonio-hero__hint">activos − pasivos</p>
      </div>

      <div class="metric-grid">
        <article class="metric-card">
          <p class="metric-card__label">Activos totales</p>
          <p class="metric-card__value">${f(activos.total)}</p>
          <p class="metric-card__desc">
            Cuentas ${f(activos.totalCuentas)}
            ${activos.totalMetas > 0 ? ` · Metas ${f(activos.totalMetas)}` : ''}
          </p>
        </article>
        <article class="metric-card">
          <p class="metric-card__label">Pasivos (deudas)</p>
          <p class="metric-card__value ${pasivos.total > 0 ? 'metric-card--negative' : ''}">${f(pasivos.total)}</p>
          <p class="metric-card__desc">
            ${pasivos.cantidadDeudas === 0
              ? 'Sin deudas registradas'
              : `${pasivos.cantidadDeudas} deuda${pasivos.cantidadDeudas > 1 ? 's' : ''} · ${pasivos.deudasSinSaldo > 0 ? `${pasivos.deudasSinSaldo} sin saldo` : 'todas con saldo'}`
            }
          </p>
        </article>
      </div>

      ${ctaDeudas}

      <h3 class="analisis__subsection-title">Proyección de patrimonio</h3>
      <p class="analisis__desc">${ahorroLabel}</p>
      <div class="proyeccion-grid">
        <article class="proyeccion-card">
          <p class="proyeccion-card__periodo">En 6 meses</p>
          <p class="proyeccion-card__valor ${_claseProyeccion(proyeccion.seisMeses)}">
            ${_fProyeccion(proyeccion.seisMeses)}
          </p>
        </article>
        <article class="proyeccion-card">
          <p class="proyeccion-card__periodo">En 1 año</p>
          <p class="proyeccion-card__valor ${_claseProyeccion(proyeccion.doceMeses)}">
            ${_fProyeccion(proyeccion.doceMeses)}
          </p>
        </article>
        <article class="proyeccion-card">
          <p class="proyeccion-card__periodo">En 2 años</p>
          <p class="proyeccion-card__valor ${_claseProyeccion(proyeccion.veinticuatroMeses)}">
            ${_fProyeccion(proyeccion.veinticuatroMeses)}
          </p>
        </article>
      </div>
    </section>`;
}

function _renderPorCategoria(porCategoria, gastoMes, segmentosColoreados = []) {
  const entradas = Object.entries(porCategoria)
    .sort(([, a], [, b]) => b - a);

  if (entradas.length === 0) {
    return `
      <section class="analisis__section" aria-labelledby="analisis-cat-title">
        <h2 class="analisis__section-title" id="analisis-cat-title">Gastos por categoría</h2>
        <p class="analisis__empty">Sin gastos registrados este mes.</p>
      </section>`;
  }

  const filas = entradas.map(([cat, total]) => {
    const pct = gastoMes > 0 ? Math.round((total / gastoMes) * 100) : 0;
    return `
      <li class="cat-row">
        <span class="cat-row__nombre">${_esc(cat)}</span>
        <div class="progress cat-row__bar" role="presentation">
          <div class="progress-bar" style="width:${pct}%"></div>
        </div>
        <span class="cat-row__pct">${pct}%</span>
        <span class="cat-row__monto">${f(total)}</span>
      </li>`;
  }).join('');

  // Donut + leyenda, solo si recibimos segmentos coloreados.
  const donutSvg = segmentosColoreados.length > 0
    ? donut(segmentosColoreados, { size: 160, strokeWidth: 22, ariaLabel: 'Distribución de gastos por categoría' })
    : '';
  const leyenda = segmentosColoreados.map(s => `
    <li class="chart-legend__item">
      <span class="chart-legend__swatch" style="background:${s.color}" aria-hidden="true"></span>
      <span class="chart-legend__label">${_esc(s.label)}</span>
      <span class="chart-legend__pct">${s.pct}%</span>
    </li>`).join('');

  const bloqueDonut = donutSvg
    ? `<div class="chart-donut-wrap">
        <div class="chart-donut__svg">${donutSvg}</div>
        <ul class="chart-legend" aria-label="Leyenda de categorías">${leyenda}</ul>
      </div>`
    : '';

  return `
    <section class="analisis__section" aria-labelledby="analisis-cat-title">
      <h2 class="analisis__section-title" id="analisis-cat-title">Gastos por categoría</h2>
      <div class="analisis__cat-layout">
        ${bloqueDonut}
        <ul class="cat-list" aria-label="Desglose de gastos por categoría">${filas}</ul>
      </div>
    </section>`;
}

function _renderTendencia(serie) {
  if (!serie || serie.length === 0) return '';

  const valores = serie.map(p => p.total);
  const hayDatos = valores.some(v => v > 0);

  if (!hayDatos) {
    return `
      <section class="analisis__section" aria-labelledby="analisis-tendencia-title">
        <h2 class="analisis__section-title" id="analisis-tendencia-title">Tendencia de gastos</h2>
        <p class="analisis__empty">Sin historial de gastos todavía. Vuelve cuando registres movimientos.</p>
      </section>`;
  }

  const max     = Math.max(...valores);
  const min     = Math.min(...valores);
  const actual  = valores[valores.length - 1];
  const anterior = valores.length >= 2 ? valores[valores.length - 2] : actual;
  const delta   = actual - anterior;
  const deltaPct = anterior > 0 ? Math.round((delta / anterior) * 100) : 0;

  // Tendencia: ⬆ = más gasto (malo), ⬇ = menos gasto (bueno).
  const tendenciaClase = delta > 0 ? 'chart-stat--negativo' : delta < 0 ? 'chart-stat--positivo' : '';
  const tendenciaIcono = delta > 0 ? '↑' : delta < 0 ? '↓' : '→';
  const tendenciaTexto = delta === 0
    ? 'Igual que el mes pasado'
    : `${tendenciaIcono} ${Math.abs(deltaPct)}% vs mes anterior`;

  const svg = sparkline(valores, {
    width: 600, height: 80, color: 'var(--fk-accent, #00dc82)',
    padding: 6, area: true,
    ariaLabel: `Gastos mensuales últimos ${serie.length} meses, máximo ${f(max)}, actual ${f(actual)}`,
  });

  const ejeX = serie.map((p, i) => {
    // Mostrar solo cada 2 meses para no saturar en mobile.
    const visible = i === 0 || i === serie.length - 1 || i % 2 === 0;
    return `<span class="chart-axis__label${visible ? '' : ' chart-axis__label--hidden'}">${p.label}</span>`;
  }).join('');

  return `
    <section class="analisis__section" aria-labelledby="analisis-tendencia-title">
      <h2 class="analisis__section-title" id="analisis-tendencia-title">Tendencia de gastos</h2>
      <p class="analisis__desc">Últimos ${serie.length} meses.</p>

      <div class="chart-sparkline-wrap">
        <div class="chart-sparkline__svg" aria-hidden="false">${svg}</div>
        <div class="chart-axis" aria-hidden="true">${ejeX}</div>
      </div>

      <div class="chart-stats">
        <div class="chart-stat">
          <p class="chart-stat__label">Este mes</p>
          <p class="chart-stat__valor">${f(actual)}</p>
        </div>
        <div class="chart-stat ${tendenciaClase}">
          <p class="chart-stat__label">Variación</p>
          <p class="chart-stat__valor">${tendenciaTexto}</p>
        </div>
        <div class="chart-stat">
          <p class="chart-stat__label">Máximo</p>
          <p class="chart-stat__valor">${f(max)}</p>
        </div>
        <div class="chart-stat">
          <p class="chart-stat__label">Mínimo</p>
          <p class="chart-stat__valor">${f(min)}</p>
        </div>
      </div>
    </section>`;
}

function _renderHormigas(hormigas) {
  if (hormigas.length === 0) return '';

  const items = hormigas.map(h => `
    <li class="hormiga-item">
      <p class="hormiga-item__cat">🐜 ${_esc(h.categoria)}</p>
      <p class="hormiga-item__detalle">
        ${h.cantidad} compras · promedio ${f(h.promedio)} c/u · total <strong>${f(h.total)}</strong>
      </p>
    </li>`).join('');

  return `
    <section class="analisis__section" aria-labelledby="analisis-hormiga-title">
      <h2 class="analisis__section-title" id="analisis-hormiga-title">⚠️ Alertas de gasto hormiga</h2>
      <p class="analisis__desc">Categorías con muchas compras pequeñas que suman montos significativos este mes.</p>
      <ul class="hormiga-list" aria-label="Alertas de gasto hormiga">${items}</ul>
    </section>`;
}

// ── HELPER ───────────────────────────────────────────────────────

function _esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

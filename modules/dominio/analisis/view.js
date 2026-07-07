/**
 * analisis/view.js - generación de HTML del panel de análisis financiero.
 * Puede leer S. No puede mutarlo. Sin lógica de negocio.
 */

import { S } from '../../core/state.js';
import { f, hoy, esc as _esc } from '../../infra/utils.js';
import { estadoVigenciaLegal } from '../../core/constants.js';
import { sparkline, donut, colorearSegmentos, progressRing } from '../../infra/svg.js';
import { icon } from '../../infra/icons.js';
import { memoizar } from '../../infra/memo.js';
import { gastosMes } from '../gastos/logic.js';
import {
  generarResumen, serieGastosMensual, seriePorCategoria,
  calcularScoreSalud, clasificarScore,
  calcularComparacionCategorias, detectarPatronGastoSemanal,
  calcularEstadoRenta, detectarNudgesRenta,
} from './logic.js';

// ── PANEL PRINCIPAL ──────────────────────────────────────────────

/**
 * PERF.2: `renderAnalisis()` hacía ~7 barridos completos de `S.gastos` (cada
 * uno con sub-barridos propios, ej. `serieGastosMensual` recorre 12 meses)
 * en cada `state:change` de `SECCIONES_OBSERVADAS`. Consolidar todo en una
 * sola función memoizada evita repetir el cómputo cuando ninguno de los
 * arrays de origen cambió desde el último render (ej. `renderAll()` vuelve
 * a pintar el dashboard sin que `gastos`/`compromisos`/etc. se hayan tocado).
 *
 * PERF.3: la comparación vs mes anterior y el patrón semanal ya no se calculan
 * aquí. Alimentan solo el grupo colapsado "Más detalle de tus gastos", así que
 * se difieren a cuando el usuario lo abre (ver `_calcularDetalleGastos`).
 *
 * @param {import('../../core/state.js').Gasto[]} gastos
 * @param {import('../../core/state.js').Compromiso[]} compromisos
 * @param {import('../../core/state.js').Cuenta[]} cuentas
 * @param {import('../../core/state.js').Meta[]} metas
 * @param {import('../../core/state.js').Apartado[]} apartados
 * @param {import('../../core/state.js').Inversion[]} inversiones
 * @param {number} anio
 * @param {number} mes
 */
function _calcularDatosAnalisis(gastos, compromisos, cuentas, metas, apartados, inversiones, anio, mes) {
  const resumen = generarResumen(gastos, compromisos, cuentas, anio, mes, metas, apartados, inversiones);

  // Series para gráficos (D.3). Se calculan aquí para no inflar generarResumen.
  const serieGastos  = serieGastosMensual(gastos, anio, mes, 12);
  const gastosDelMes = gastosMes(gastos, anio, mes);
  const segmentosCat = colorearSegmentos(seriePorCategoria(gastosDelMes, 6));

  return { resumen, serieGastos, segmentosCat };
}

const _calcularDatosAnalisisMemo = memoizar(
  _calcularDatosAnalisis,
  ['gastos', 'compromisos', 'cuentas', 'metas', 'apartados', 'inversiones'],
);

/**
 * PERF.3: cómputo diferido del grupo "Más detalle de tus gastos" (comparación
 * de categorías vs mes anterior + patrón de gasto semanal). Ambos hacen su
 * propio barrido de `gastos` y solo alimentan el grupo colapsable, así que se
 * calculan bajo demanda (al abrir el `<details>`) en vez de en cada render.
 * Las hormigas no entran aquí: ya vienen dentro de `generarResumen`.
 *
 * @param {import('../../core/state.js').Gasto[]} gastos
 * @param {number} anio
 * @param {number} mes
 * @param {string} fechaHoy  YYYY-MM-DD.
 */
function _calcularDetalleGastos(gastos, anio, mes, fechaHoy) {
  const comparacion   = calcularComparacionCategorias(gastos, anio, mes);
  const patronSemanal = detectarPatronGastoSemanal(gastos, fechaHoy);
  return { comparacion, patronSemanal };
}

const _calcularDetalleGastosMemo = memoizar(_calcularDetalleGastos, ['gastos']);

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

  const { resumen, serieGastos, segmentosCat } = _calcularDatosAnalisisMemo(
    S.gastos, S.compromisos, S.cuentas, S.metas, S.apartados, S.inversiones, anio, mes,
  );

  // PERF.3: el grupo "Más detalle de tus gastos" difiere su cuerpo al toggle.
  // Con gasto este mes, la comparación siempre tiene contenido, así que ese
  // chequeo barato basta para mostrar el grupo y dejar su cuerpo diferido
  // (`null`). Sin gasto este mes (caso menos común), calculamos el detalle ya
  // mismo para saber si el grupo tendría algo que mostrar (comparación con el
  // mes anterior o patrón de los últimos 90 días); si queda vacío, no se dibuja.
  let cuerpoDetalle  = null;
  let mostrarDetalle = true;
  if (resumen.gastoMes <= 0) {
    cuerpoDetalle  = _renderDetalleGastos(resumen.hormigas, anio, mes, fechaHoy);
    mostrarDetalle = cuerpoDetalle.trim() !== '';
  }

  // Orden de lectura (F8): primero "cómo estoy" (salud + patrimonio), luego
  // "a dónde va mi dinero" (tendencia + categorías). El detalle fino de gastos
  // y lo fiscal quedan colapsados para no enterrar lo importante.
  el.innerHTML = `
    ${_renderScoreSalud(resumen)}
    ${_renderPatrimonio(resumen)}
    ${_renderTendencia(serieGastos)}
    ${_renderPorCategoria(resumen.porCategoria, resumen.gastoMes, segmentosCat)}
    ${mostrarDetalle ? _renderGrupoDetalle(cuerpoDetalle) : ''}
    ${_renderEstadoRenta(anio)}
  `;

  // PERF.3: si el cuerpo quedó diferido, calcularlo la primera vez que el
  // usuario abre el grupo. Cada render recrea el `<details>`, así que el
  // listener se asocia al nodo nuevo (el anterior se descarta con su elemento,
  // sin listeners duplicados). `data-cargado` evita recomputar en aperturas y
  // cierres sucesivos sobre el mismo nodo.
  const detalle = el.querySelector('.analisis-grupo--detalle');
  if (detalle && detalle.dataset.cargado !== '1') {
    detalle.addEventListener('toggle', () => {
      if (!detalle.open || detalle.dataset.cargado === '1') return;
      detalle.dataset.cargado = '1';
      const cuerpo = detalle.querySelector('.analisis-grupo__body');
      if (cuerpo) cuerpo.innerHTML = _renderDetalleGastos(resumen.hormigas, anio, mes, fechaHoy);
    });
  }
}

// ── HELPER: GRUPO COLAPSABLE DE DETALLE ──────────────────────────

/**
 * Envuelve el detalle de gastos en un `<details>` colapsable. El cuerpo puede
 * venir diferido (PERF.3): `null` deja el cuerpo vacío para que `renderAnalisis`
 * lo calcule en el primer `toggle`; un string ya renderizado se inyecta de una
 * vez y marca el grupo como cargado (`data-cargado`), evitando el recálculo.
 *
 * @param {string|null} cuerpo  HTML del cuerpo, o `null` si está diferido.
 * @returns {string}
 */
function _renderGrupoDetalle(cuerpo) {
  const diferido = cuerpo === null;
  return `
    <details class="analisis-grupo analisis-grupo--detalle"${diferido ? '' : ' data-cargado="1"'}>
      <summary class="analisis-grupo__summary">Más detalle de tus gastos</summary>
      <div class="analisis-grupo__body">${diferido ? '' : cuerpo}</div>
    </details>`;
}

/**
 * Renderiza el cuerpo del grupo colapsable: comparación vs mes anterior +
 * patrón de gasto semanal (ambos diferidos, PERF.3) + hormigas (ya calculadas
 * en `generarResumen`). Devuelve un HTML que queda vacío al hacerle `.trim()`
 * si ninguna de las tres sub-cards tiene datos.
 *
 * @param {ReturnType<import('../gastos/logic.js').detectarHormigas>} hormigas
 * @param {number} anio
 * @param {number} mes
 * @param {string} fechaHoy  YYYY-MM-DD.
 * @returns {string}
 */
function _renderDetalleGastos(hormigas, anio, mes, fechaHoy) {
  const { comparacion, patronSemanal } = _calcularDetalleGastosMemo(S.gastos, anio, mes, fechaHoy);
  return `
    ${_renderComparacionCategorias(comparacion)}
    ${_renderPatronSemanal(patronSemanal)}
    ${_renderHormigas(hormigas)}
  `;
}

// ── SECCIONES INTERNAS ───────────────────────────────────────────

/**
 * Recomendación fiscal permanente (K.2). Visible cuando al menos un flag de
 * perfilFiscal está en true. Orienta al usuario a consultar con un contador.
 */
function _renderRecomendacionFiscal() {
  const pf = (typeof S.config?.perfilFiscal === 'object' && S.config.perfilFiscal !== null)
    ? S.config.perfilFiscal : null;
  if (!pf) return '';

  const motivos = [];
  if (pf.ivaResponsable)       motivos.push('responsable del IVA');
  if (pf.obligadoContabilidad) motivos.push('obligado a llevar contabilidad');
  if (pf.declaranteObligado)   motivos.push('declarante notificado por la DIAN');

  if (motivos.length === 0) return '';

  const lista = motivos.length === 1
    ? motivos[0]
    : `${motivos.slice(0, -1).join(', ')} y ${motivos[motivos.length - 1]}`;

  return `
    <div class="nudge nudge-info" role="status">
      <span class="nudge__icon" aria-hidden="true">📋</span>
      <div class="nudge__body">
        <p class="nudge__title">Tu perfil fiscal puede requerir atención</p>
        <p class="nudge__desc">Indicaste que eres ${_esc(lista)}. Estas situaciones
        pueden generar obligaciones de declaración o pago aunque no superes los topes
        de ingresos. Consulta con un contador. <a href="#config" class="link">Editar perfil fiscal</a>.</p>
      </div>
    </div>`;
}

/**
 * Card "Estado de tu renta" (K.3). Muestra los 5 criterios de obligación de
 * declarar con su tope (calculado en vivo desde la UVT del año vigente) y el
 * valor actual cuando Finko puede medirlo. Insertada después del Score.
 *
 * Decisión: criterios sin datos en Finko se muestran igualmente (tope visible,
 * barra gris) para que el usuario conozca el límite y sepa dónde consultar el
 * dato real.
 */
function _renderEstadoRenta(anio) {
  const estado = calcularEstadoRenta(S, anio);
  const pf     = (typeof S.config?.perfilFiscal === 'object' && S.config.perfilFiscal !== null)
    ? S.config.perfilFiscal : null;
  const nudges = detectarNudgesRenta(estado, pf);
  const vig    = estadoVigenciaLegal();

  const filas    = estado.criterios.map(_renderCriterioRenta).join('');
  const tieneAlerta = nudges.some(n => n.nivel === 'nudge-high' || n.nivel === 'nudge-medium');
  const bannerNudges = tieneAlerta
    ? nudges.filter(n => n.nivel !== 'nudge-info').map(_renderNudgeRenta).join('')
    : '';

  // Aviso de vigencia (P1): si empezó un año nuevo y aún no se cargaron los
  // valores oficiales, los topes salen de la UVT del año anterior. Se avisa.
  const avisoVigencia = vig.desactualizado
    ? `
      <div class="nudge nudge-medium" role="status">
        <span class="nudge__icon" aria-hidden="true">📅</span>
        <div class="nudge__body">
          <p class="nudge__title">Topes calculados con la UVT de ${vig.anioVigente}</p>
          <p class="nudge__desc">El año en curso es ${vig.anioActual}, pero Finko todavía usa la UVT de ${vig.anioVigente}: los valores oficiales de ${vig.anioActual} aún no se han cargado. Toma estos topes como referencia provisional y confírmalos con un contador.</p>
        </div>
      </div>`
    : '';

  // El grupo se abre solo si hay algo que el usuario debería ver ya: una alerta
  // de tope o una recomendación por su perfil fiscal. Si no, queda colapsado.
  const recomFiscal = _renderRecomendacionFiscal();
  const abierto     = tieneAlerta || recomFiscal !== '';

  return `
    <details class="analisis-grupo"${abierto ? ' open' : ''}>
      <summary class="analisis-grupo__summary">📋 Estado de tu renta (${anio})</summary>
      <div class="analisis-grupo__body">
        ${recomFiscal}
        <p class="analisis__hint">
          UVT vigente: ${f(estado.uvt)}. Topes calculados a partir de tus datos en Finko.
          Confirma con un contador antes de declarar.
        </p>
        ${avisoVigencia}
        ${bannerNudges}
        <div class="renta-criterios">
          ${filas}
        </div>
      </div>
    </details>`;
}

function _renderCriterioRenta(c) {
  const ESTADOS = {
    'sin-datos': { banda: '',          badge: 'Sin datos en Finko', valorTxt: 'N/D' },
    'ok':        { banda: 'excelente', badge: 'Dentro del límite',   valorTxt: f(c.valor) },
    'cerca':     { banda: 'ajustada',  badge: 'Cerca del tope',      valorTxt: f(c.valor) },
    'supera':    { banda: 'critica',   badge: 'Supera el tope',      valorTxt: f(c.valor) },
  };
  const { banda, badge, valorTxt } = ESTADOS[c.estado] ?? ESTADOS['sin-datos'];
  const pctClamp = Math.min(100, Math.max(0, c.porcentaje));
  const barra = c.estado === 'sin-datos'
    ? `<div class="progress score-factor__bar"><div class="progress-bar" style="width:0%"></div></div>`
    : `<div class="progress score-factor__bar"
            role="progressbar"
            aria-valuenow="${Math.round(c.porcentaje)}"
            aria-valuemin="0" aria-valuemax="100"
            aria-label="${_esc(c.etiqueta)}: ${Math.round(c.porcentaje)} por ciento del tope">
        <div class="progress-bar progress-bar--score-${banda}"
             style="width:${pctClamp}%"></div>
      </div>`;

  return `
    <article class="renta-criterio renta-criterio--${c.estado}">
      <div class="renta-criterio__head">
        <p class="renta-criterio__label">${_esc(c.etiqueta)}</p>
        <span class="renta-criterio__badge renta-criterio__badge--${c.estado}">${_esc(badge)}</span>
      </div>
      <p class="renta-criterio__valor">${valorTxt}<span class="renta-criterio__tope"> / ${f(c.tope)}</span></p>
      ${barra}
      <p class="renta-criterio__tip">${_esc(c.tip)}</p>
    </article>`;
}

function _renderNudgeRenta(n) {
  return `
    <div class="nudge ${n.nivel}" role="status">
      <span class="nudge__icon" aria-hidden="true">${n.icono}</span>
      <div class="nudge__body">
        <p class="nudge__title">${_esc(n.etiqueta)}</p>
        <p class="nudge__desc">${_esc(n.mensaje)}</p>
      </div>
    </div>`;
}

function _renderScoreSalud(resumen) {
  // Lee el estado del fondo para el 4to factor (J.1c).
  const fondo      = S.ahorro?.fondoEmergencia;
  const ahorroData = {
    activo:     fondo?.activo     === true,
    completado: fondo?.completado === true,
  };

  const score = calcularScoreSalud(resumen, ahorroData);
  const banda = clasificarScore(score.score);
  const ETIQUETAS = {
    excelente: { iconoBanda: 'trophy',       label: 'Excelente' },
    buena:     { iconoBanda: 'check-circle', label: 'Buena' },
    ajustada:  { iconoBanda: 'alert',        label: 'Ajustada' },
    critica:   { iconoBanda: 'alert',        label: 'Crítica' },
  };
  const { iconoBanda, label } = ETIQUETAS[banda];

  const nudgeFondo = !ahorroData.activo
    ? `<p class="analisis__hint">
        Sin fondo de emergencia: tu base financiera esta expuesta.
        <a href="#ahorro" class="link">Activarlo suma hasta 25 pts al score.</a>
      </p>`
    : '';

  return `
    <section class="analisis__section" aria-labelledby="analisis-score-title">
      <h2 class="analisis__section-title" id="analisis-score-title">Score de salud</h2>
      <div class="score-card score-card--${banda}">
        <div class="score-card__hero">
          ${progressRing(score.score, { size: 120, strokeWidth: 8, etiqueta: score.score, ariaLabel: `Score de salud: ${score.score} de 100` })}
          <p class="score-card__label">${icon(iconoBanda)} ${label}</p>
        </div>

        <div class="score-card__factors">
          <div class="score-factor">
            <p class="score-factor__label">${icon('deudas')} Deuda</p>
            <p class="score-factor__valor">${score.factors.deuda}</p>
            <div class="progress score-factor__bar">
              <div class="progress-bar" style="width:${score.factors.deuda}%"></div>
            </div>
          </div>
          <div class="score-factor">
            <p class="score-factor__label">${icon('saldo')} Liquidez</p>
            <p class="score-factor__valor">${score.factors.liquidez}</p>
            <div class="progress score-factor__bar">
              <div class="progress-bar" style="width:${score.factors.liquidez}%"></div>
            </div>
          </div>
          <div class="score-factor">
            <p class="score-factor__label">${icon('analisis')} Control</p>
            <p class="score-factor__valor">${score.factors.control}</p>
            <div class="progress score-factor__bar">
              <div class="progress-bar" style="width:${score.factors.control}%"></div>
            </div>
          </div>
          <div class="score-factor">
            <p class="score-factor__label">${icon('ahorro')} Ahorro</p>
            <p class="score-factor__valor">${score.factors.ahorro}</p>
            <div class="progress score-factor__bar">
              <div class="progress-bar" style="width:${score.factors.ahorro}%"></div>
            </div>
          </div>
        </div>

        <p class="score-card__explicacion">${_esc(score.explicacion)}</p>
      </div>
      ${nudgeFondo}
    </section>`;
}

function _renderPatrimonio({ activos, pasivos, patrimonioNeto }) {
  const esPositivo  = patrimonioNeto >= 0;
  const heroClase   = esPositivo ? 'patrimonio-hero--positivo' : 'patrimonio-hero--negativo';
  const valorClase  = esPositivo ? 'patrimonio-hero__valor--positivo' : 'patrimonio-hero__valor--negativo';
  const signo       = esPositivo ? '' : '−';
  const valorAbs    = Math.abs(patrimonioNeto);

  // CTA si hay deudas sin saldo registrado.
  const ctaDeudas = pasivos.deudasSinSaldo > 0
    ? `<p class="analisis__hint">
        Tienes <strong>${pasivos.deudasSinSaldo} deuda${pasivos.deudasSinSaldo > 1 ? 's' : ''}</strong>
        sin saldo registrado. Complétalas en
        <a href="#compromisos" class="link">Compromisos</a>
        para calcular tu patrimonio real.
      </p>`
    : '';

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
            Cuentas ${f(activos.totalCuentas)}${activos.totalMetas > 0 ? ` · Metas ${f(activos.totalMetas)}` : ''}${activos.totalApartados > 0 ? ` · Apartados ${f(activos.totalApartados)}` : ''}${activos.totalInversiones > 0 ? ` · Inversión ${f(activos.totalInversiones)}` : ''}
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

  // Paleta unificada dona + barras: cada barra usa el color que la dona le
  // asignó a su categoría (misma fuente: colorearSegmentos). Las categorías
  // agrupadas en "Otros" heredan el color de ese segmento, para que el color
  // cuente la misma historia en toda la sección. Sin dona (sin segmentos),
  // las barras conservan su color por defecto.
  const colorPorCategoria = Object.fromEntries(segmentosColoreados.map(s => [s.label, s.color]));
  const colorOtros = colorPorCategoria['Otros'] ?? '';

  const filas = entradas.map(([cat, total]) => {
    const pct = gastoMes > 0 ? Math.round((total / gastoMes) * 100) : 0;
    const color = colorPorCategoria[cat] ?? colorOtros;
    return `
      <li class="cat-row">
        <span class="cat-row__nombre">${_esc(cat)}</span>
        <div class="progress cat-row__bar" role="presentation">
          <div class="progress-bar" style="width:${pct}%${color ? `;background:${color}` : ''}"></div>
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
        <p class="analisis__empty">El análisis aparece cuando tengas gastos registrados. ¡Todo empieza con el primer apunte!</p>
      </section>`;
  }

  const max     = Math.max(...valores);
  const min     = Math.min(...valores);
  const actual  = valores[valores.length - 1];
  const anterior = valores.length >= 2 ? valores[valores.length - 2] : actual;
  const delta   = actual - anterior;
  // Sin gastos el mes anterior no hay base para un porcentaje: mostrar
  // "↑ 0%" en rojo confunde. Mismo criterio que el resumen semanal (F8).
  const sinBase  = anterior === 0 && delta > 0;
  const deltaPct = anterior > 0 ? Math.round((delta / anterior) * 100) : 0;

  // Gastar más no es incumplir (ADR 019): solo bajar el gasto se celebra
  // en verde; subir queda en el color neutro por defecto de chart-stat__valor.
  const tendenciaClase = sinBase ? ''
    : delta < 0 ? 'chart-stat--positivo'
    :             '';
  const tendenciaIcono = delta > 0 ? '↑' : delta < 0 ? '↓' : '→';
  const tendenciaTexto = sinBase
    ? 'Sin gastos el mes anterior para comparar'
    : delta === 0
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

// ── COMPARACIÓN DE CATEGORÍAS (G.2) ──────────────────────────────

/**
 * Renderiza la card de comparación de gastos vs el mes anterior.
 * Devuelve '' si no hay datos suficientes para comparar.
 *
 * @param {ReturnType<import('./logic.js').calcularComparacionCategorias>} comparacion
 */
function _renderComparacionCategorias(comparacion) {
  if (!comparacion || comparacion.categorias.length === 0) return '';

  const { highlights, categorias, totalActual, totalAnterior } = comparacion;

  const deltaTotal = totalActual - totalAnterior;
  const deltaLabel = deltaTotal >= 0
    ? `+${f(deltaTotal)} vs mes anterior`
    : `${f(deltaTotal)} vs mes anterior`;
  const deltaClase = deltaTotal >= 0 ? 'comparacion__delta--sube' : 'comparacion__delta--baja';

  const hilightHtml = highlights.map(h => {
    const icono = h.tipo === 'mejora' ? '✅' : '⚠️';
    return `<li class="comparacion__highlight comparacion__highlight--${h.tipo}">
      ${icono} ${_esc(h.mensaje)}
    </li>`;
  }).join('');

  const filasHtml = categorias.map(c => {
    const icono = c.direccion === 'bajo' || c.direccion === 'desaparecio' ? '↓'
      : c.direccion === 'subio' || c.direccion === 'nueva'                ? '↑'
      :                                                                      '→';
    const clase = c.direccion === 'bajo' || c.direccion === 'desaparecio'
      ? 'comparacion__row--baja'
      : c.direccion === 'subio' || c.direccion === 'nueva'
      ? 'comparacion__row--sube'
      : 'comparacion__row--igual';
    return `
      <tr class="comparacion__row ${clase}">
        <td class="comparacion__cat">${_esc(c.cat)}</td>
        <td class="comparacion__monto comparacion__monto--actual">${f(c.actual)}</td>
        <td class="comparacion__monto">${f(c.anterior)}</td>
        <td class="comparacion__dir">${icono} ${c.deltaPct > 0 ? '+' : ''}${c.deltaPct}%</td>
      </tr>`;
  }).join('');

  return `
    <section class="analisis__section" aria-labelledby="analisis-comparacion-title">
      <h2 class="analisis__section-title" id="analisis-comparacion-title">📊 Vs mes anterior</h2>
      <p class="analisis__desc">Comparación de gastos por categoría respecto al mes pasado.</p>
      <p class="comparacion__delta ${deltaClase}">${deltaLabel}</p>
      ${highlights.length > 0 ? `<ul class="comparacion__highlights" aria-label="Cambios destacados">${hilightHtml}</ul>` : ''}
      <div class="comparacion__tabla-wrap">
        <table class="comparacion__tabla" aria-label="Gastos por categoría">
          <thead>
            <tr>
              <th class="comparacion__th">Categoría</th>
              <th class="comparacion__th">Este mes</th>
              <th class="comparacion__th">Mes ant.</th>
              <th class="comparacion__th">Cambio</th>
            </tr>
          </thead>
          <tbody>${filasHtml}</tbody>
        </table>
      </div>
    </section>`;
}

// ── PATRÓN DE GASTO SEMANAL (G.2) ────────────────────────────────

/**
 * Renderiza la card de patrón de gasto semanal.
 * Devuelve '' si no hay datos suficientes o no hay días destacados.
 *
 * @param {ReturnType<import('./logic.js').detectarPatronGastoSemanal>} patron
 */
function _renderPatronSemanal(patron) {
  if (!patron || patron.diasDestacados.length === 0) return '';

  const { diasDestacados, promedioGlobalDia, gastosAnalizados } = patron;

  const itemsHtml = diasDestacados.map(d => {
    const nivel = d.severidad === 'alta' ? 'patron__item--alta' : 'patron__item--media';
    return `
      <li class="patron__item ${nivel}">
        <span class="patron__dia">${_esc(d.nombre)}</span>
        <span class="patron__factor">${d.factor}× el promedio</span>
        <span class="patron__etiqueta">${_esc(d.etiqueta)}</span>
      </li>`;
  }).join('');

  return `
    <section class="analisis__section" aria-labelledby="analisis-patron-title">
      <h2 class="analisis__section-title" id="analisis-patron-title">📅 Patrón de gasto semanal</h2>
      <p class="analisis__desc">Días donde gastas consistentemente más que el promedio (análisis de los últimos 90 días, ${gastosAnalizados} transacciones).</p>
      <ul class="patron__lista" aria-label="Días con mayor gasto">${itemsHtml}</ul>
      <p class="analisis__hint">Promedio por día activo: <strong>${f(promedioGlobalDia)}</strong></p>
    </section>`;
}


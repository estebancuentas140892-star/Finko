/**
 * gastos/view.js - generación de HTML para el dominio de gastos.
 * Puede leer S. No puede mutarlo. Sin lógica de negocio.
 */

import { S } from '../../core/state.js';
import { f, hoy, formateadorFecha, esc as _esc } from '../../infra/utils.js';
import { icon, tejaCategoria } from '../../infra/icons.js';
import { SALDO_MASCARA, SALDO_MASCARA_CUENTA } from '../../infra/render.js';
import { CATEGORIAS_GASTO_USUARIO, ICONOS_CATEGORIA_PERSONALIZADA, iconoDeCategoriaGasto } from '../../core/constants.js';
import { renderSelectorCuenta } from '../../infra/cuenta-helper.js';
import { renderIconoPicker } from '../../infra/icon-picker.js';
import { gastosMes, filtrarGastos, ordenarRecientesPrimero, agruparPorDia, totalGastos, variacionMensualGasto, detectarHormigas, iconoPorOrigen, gastosFrecuentes, tarjetasDeCredito } from './logic.js';

// ── CONSTANTES ───────────────────────────────────────────────────

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

/** Valor especial del `<select>` de categoría que revela los campos de "Otra categoría" (TX.9b). */
export const CATEGORIA_NUEVA_VALUE = '__nueva__';

/**
 * Categorías internas que el código asigna a pagos de deuda ('Deudas') y de
 * fijos del Calendario ('Gastos fijos'), no gasto cotidiano (TX.8b, ADR 028).
 * Gastos deja de listarlas para enfocarse en lo que el usuario sí decide
 * gastar día a día; siguen viviendo en `S.gastos` sin cambios, así que
 * Análisis y Límites (que leen todo el historial) no se ven afectados.
 */
const _CATEGORIAS_INTERNAS = new Set(['Deudas', 'Gastos fijos']);

/** @param {import('../../core/state.js').Gasto[]} gastos */
function _sinInternas(gastos) {
  return gastos.filter(g => !_CATEGORIAS_INTERNAS.has(g.categoria));
}

// ── ESTADO LOCAL DE VISTA ────────────────────────────────────────

/** Mes visualizado (0-indexed, igual que Date.getMonth()). `null` = mes actual. */
let _viewYear  = null;
let _viewMonth = null;

/** Categoría activa en el filtro de chips. `null` = "Todos". */
let _filtroCategoria = null;

/** Inicializa el mes al mes actual si aún no se ha establecido. */
function _ensureMes() {
  if (_viewYear === null || _viewMonth === null) {
    const hoyDate  = new Date();
    _viewYear  = hoyDate.getFullYear();
    _viewMonth = hoyDate.getMonth();
  }
}

/**
 * Mueve el mes visualizado en `delta` pasos (positivo = adelante, negativo = atrás).
 * Resetea el filtro de categoría al cambiar de mes (las categorías del nuevo mes
 * pueden ser distintas). El caller debe llamar renderFiltrosGastos + renderListaGastos.
 * @param {number} delta
 */
export function navegarMesGastos(delta) {
  _ensureMes();
  let m = _viewMonth + delta;
  let y = _viewYear;
  while (m < 0)  { m += 12; y -= 1; }
  while (m > 11) { m -= 12; y += 1; }
  _viewMonth        = m;
  _viewYear         = y;
  _filtroCategoria  = null; // reset al cambiar mes
}

/** Actualiza el filtro activo. Llamado desde index.js al hacer clic en un chip. */
export function setFiltroCategoria(cat) {
  _filtroCategoria = cat || null;
}

/**
 * Vuelve al mes corriente (DIS.4/G7): CTA del estado vacío de un mes que no
 * es el actual, donde "Registrar gasto" guardaría en un mes distinto al que
 * se está mirando. Resetea el filtro, igual que `navegarMesGastos`.
 */
export function irAMesActual() {
  const hoyDate = new Date();
  _viewYear        = hoyDate.getFullYear();
  _viewMonth       = hoyDate.getMonth();
  _filtroCategoria = null;
}

/**
 * Último mes que la navegación puede alcanzar (DIS.4/G7, hallazgo H8): el mes
 * corriente o, si hay gastos fechados más adelante, el del gasto más reciente.
 * Más allá no hay nada que ver y el vacío ofrecía registrar en la fecha de
 * HOY, así que el gasto caía en el mes corriente y desaparecía de la pantalla
 * que lo pidió. Se mide sobre los mismos gastos que la sección muestra (sin
 * las categorías internas de TX.8b).
 *
 * @returns {{ anio: number, mes: number }} mes 0-indexed, como Date.getMonth().
 */
function _mesTope() {
  const hoyDate = new Date();
  let anio = hoyDate.getFullYear();
  let mes  = hoyDate.getMonth();

  for (const g of _sinInternas(S.gastos ?? [])) {
    if (typeof g.fecha !== 'string' || g.fecha.length < 7) continue;
    const y = Number(g.fecha.slice(0, 4));
    const m = Number(g.fecha.slice(5, 7)) - 1;
    if (!Number.isFinite(y) || !Number.isFinite(m)) continue;
    if (y > anio || (y === anio && m > mes)) { anio = y; mes = m; }
  }

  return { anio, mes };
}

// ── HERO DEL MES + BARRA DE FILTROS ──────────────────────────────

/**
 * Renderiza el hero del mes + chips de categoría en `#panel-filtros-gastos`
 * (GAS.1a, ADR 039 D1/D2/D9). El hero integra la navegación de mes
 * (‹ Mes Año ›), el label contextual ("Gastaste este mes", o "Gastaste en
 * {categoría}" con un filtro activo), el total protagonista de lo visible
 * (regla existente: el total describe lo visible) y el chip comparativo
 * contra el mes anterior. Los chips filtran por categoría dentro del mes
 * seleccionado. Auto-resetea `_filtroCategoria` si la categoría activa ya
 * no existe en el mes.
 */
export function renderFiltrosGastos() {
  const el = document.getElementById('panel-filtros-gastos');
  if (!el) return;

  _ensureMes();

  const delMes = _sinInternas(gastosMes(S.gastos, _viewYear, _viewMonth + 1)); // gastosMes usa mes 1-indexed

  // Chips primero (solo si hay gastos en el mes): normalizan el filtro
  // activo antes de que el hero calcule el total de lo visible.
  let chipsHtml = '';
  if (delMes.length > 0) {
    const cats = [...new Set(delMes.map(g => g.categoria ?? 'Otros'))].sort();

    // Si la categoría activa desapareció, resetear a "Todos".
    if (_filtroCategoria !== null && !cats.includes(_filtroCategoria)) {
      _filtroCategoria = null;
    }

    // D5 (ADR 039): el chip activo viste la identidad de la sección
    // (modificador chip--gastos, patrón tinte+ink de D.16b); los chips de
    // otras secciones no cambian.
    const todosActivo = _filtroCategoria === null;
    const chips = cats.map(cat => {
      const activo = _filtroCategoria === cat;
      return `
        <button type="button"
                class="chip chip--gastos${activo ? ' chip--active' : ''}"
                data-action="gastos-filtrar-cat"
                data-cat="${_esc(cat)}"
                aria-pressed="${activo}"
                aria-label="Filtrar por ${_esc(cat)}">
          ${_esc(cat)}
        </button>`;
    }).join('');

    chipsHtml = `
      <div class="filtros-bar" role="group" aria-label="Filtrar gastos por categoría">
        <button type="button"
                class="chip chip--gastos${todosActivo ? ' chip--active' : ''}"
                data-action="gastos-filtrar-cat"
                data-cat=""
                aria-pressed="${todosActivo}"
                aria-label="Ver todos los gastos">
          Todos
        </button>
        ${chips}
      </div>`;
  } else {
    _filtroCategoria = null;
  }

  // DIS.4/G8 (hallazgo H9): con cero gastos registrados la pantalla apilaba
  // banner de propósito + hero de "$0" + card de vacío para decir lo mismo
  // tres veces. Un hero en $0 sin nada detrás no informa; con historial se
  // queda aunque el mes visible esté vacío (ahí $0 sí es un dato).
  const sinHistorial = (S.gastos ?? []).length === 0;

  el.innerHTML = (sinHistorial ? '' : _renderHeroGastos(delMes)) + chipsHtml;
}

/**
 * Hero del mes (GAS.1a, ADR 039 D1/D2/D9): navegación de mes integrada +
 * total protagonista de lo visible + comparativo contra el mes anterior.
 * Sexto consumidor del estreno parcial del ADR 033 (degradado de identidad
 * + sombra en reposo), espejo de _renderHeroMes() de Calendario (CAL.4a).
 *
 * - Total enmascarado con `SALDO_MASCARA` cuando `S.config.ocultarSaldo`
 *   es true (mismo flag que el ojo de Inicio, Mis cuentas, Deudas,
 *   Calendario y Análisis: un solo control, IN.2).
 * - El label nombra el MES VISIBLE, no "este mes" (DIS.4/G1, hallazgo H1):
 *   la nav de mes vive en el mismo hero, así que un label fijo atribuía el
 *   total al mes equivocado en cuanto se tocaba "‹". Con filtro de categoría
 *   activo pasa a "{categoría} en {mes}" y el comparativo se oculta (comparar
 *   una categoría contra el mes completo confundiría).
 * - "›" se deshabilita en el último mes navegable (DIS.4/G7, hallazgo H8).
 *
 * @param {import('../../core/state.js').Gasto[]} delMes gastos del mes visible, sin internas.
 * @returns {string}
 */
function _renderHeroGastos(delMes) {
  const visibles   = filtrarGastos(delMes, _filtroCategoria);
  const total      = totalGastos(visibles);
  const oculto     = S.config?.ocultarSaldo === true;
  const totalTxt   = oculto ? SALDO_MASCARA : f(total);
  const mesVisible = MONTHS[_viewMonth].toLowerCase();
  const label      = _filtroCategoria
    ? `${_esc(_filtroCategoria)} en ${mesVisible}`
    : `Gastaste en ${mesVisible}`;

  const tope   = _mesTope();
  const enTope = _viewYear === tope.anio && _viewMonth === tope.mes;

  return `
    <div class="hero-gastos">
      <div class="hero-gastos__top">
        <div class="hero-gastos__mes" role="group" aria-label="Seleccionar mes">
          <button type="button" class="hero-gastos__mes-btn"
                  data-action="gastos-prev-mes"
                  aria-label="Mes anterior">‹</button>
          <span class="hero-gastos__mes-label">${MONTHS[_viewMonth]} ${_viewYear}</span>
          <button type="button" class="hero-gastos__mes-btn"
                  data-action="gastos-next-mes"
                  ${enTope ? 'disabled aria-disabled="true"' : ''}
                  aria-label="Mes siguiente">›</button>
        </div>
        <button class="hero-gastos__ojo" type="button" id="gastos-saldo-ojo"
                data-action="gastos-saldo-visibilidad"
                aria-pressed="${oculto}"
                aria-label="${oculto ? 'Mostrar tus saldos' : 'Ocultar tus saldos'}">
          <svg class="icon" aria-hidden="true"><use href="#i-eye${oculto ? '-off' : ''}"/></svg>
        </button>
      </div>
      <p class="hero-gastos__label">${label}</p>
      <p class="hero-gastos__valor">${totalTxt}</p>
      ${_renderComparativo(delMes)}
    </div>`;
}

/**
 * Chip comparativo del hero (GAS.1a, ADR 039 D2), con el criterio único
 * IV.3/ADR 038 D4: verde solo cuando el gasto baja, neutro al subir o sin
 * cambio, nunca alarmante. Ícono + texto siempre que hay dirección
 * (SC 1.4.1). No se muestra con filtro activo, con el mes visible vacío,
 * ni sin base de comparación (mes anterior en cero).
 *
 * @param {import('../../core/state.js').Gasto[]} delMes gastos del mes visible, sin internas.
 * @returns {string}
 */
function _renderComparativo(delMes) {
  if (_filtroCategoria || delMes.length === 0) return '';

  const prevMonth = _viewMonth === 0 ? 11 : _viewMonth - 1;
  const prevYear  = _viewMonth === 0 ? _viewYear - 1 : _viewYear;
  const totalPrev = totalGastos(_sinInternas(gastosMes(S.gastos, prevYear, prevMonth + 1)));

  const v = variacionMensualGasto(totalGastos(delMes), totalPrev);
  if (v === null) return '';

  const mesPrev = MONTHS[prevMonth].toLowerCase();
  const baja    = v.direccion === 'menos';
  const icono   = v.direccion === 'igual'
    ? ''
    : icon(baja ? 'trending-down' : 'trending-up', 'icon');
  const texto   = v.direccion === 'igual'
    ? `Igual que ${mesPrev}`
    : `${v.pct}% ${baja ? 'menos' : 'más'} que ${mesPrev}`;

  return `
    <p class="hero-gastos__comp">
      <span class="chip${baja ? ' chip-success' : ''}">${icono}${texto}</span>
    </p>`;
}

// ── LISTA DE GASTOS ──────────────────────────────────────────────

/**
 * Renderiza la lista de gastos en `#lista-gastos`, aplicando el mes
 * seleccionado (`_viewYear`/`_viewMonth`) y el filtro de categoría activo.
 * Desde GAS.1b (ADR 039 D3) la lista va agrupada por día: encabezado
 * "Hoy / Ayer / Vie 11 jul" + total del día, ítems en su orden de siempre
 * (`ordenarRecientesPrimero`). No-op si el contenedor no existe.
 */
export function renderListaGastos() {
  const el = document.getElementById('lista-gastos');
  if (!el) return;

  _ensureMes();

  const delMes = _sinInternas(gastosMes(S.gastos, _viewYear, _viewMonth + 1)); // 1-indexed

  if (delMes.length === 0) {
    el.innerHTML = _renderEmptyState();
    return;
  }

  // No hay rama de "filtro sin resultados" (DIS.4/G10, hallazgo H12):
  // `renderFiltrosGastos()` normaliza el filtro (lo resetea a "Todos" si su
  // categoría ya no está en el mes) y corre ANTES que esta función en todos
  // los call-sites, así que un filtro activo siempre tiene al menos un gasto.
  const filtrados = filtrarGastos(delMes, _filtroCategoria);

  // Más recientes primero: el último gasto registrado queda al tope, visible
  // sin desplazarse. El total de lo visible vive en el hero (GAS.1a, ADR 039
  // D1); el ojo de privacidad enmascara también los montos de la lista (D9:
  // dejarlos visibles reconstruiría el total oculto sumándolos). El insight
  // de hormigas solo aparece en la vista "Todos" (GAS.1c, D4).
  const oculto    = S.config?.ocultarSaldo === true;
  const insight   = _filtroCategoria ? '' : _renderInsightHormigas(delMes, oculto);
  const ordenados = ordenarRecientesPrimero(filtrados);
  el.innerHTML = insight + agruparPorDia(ordenados)
    .map(grupo => _renderGrupoDia(grupo, oculto))
    .join('');
}

/**
 * Tarjeta insight de gastos hormiga (GAS.1c, ADR 039 D4): pone por fin en
 * pantalla `detectarHormigas()` (existía en logic.js sin ninguna vista).
 * Toma la categoría con mayor total hormiga del mes visible. Solo se pide
 * en la vista "Todos" (el caller la omite con filtro activo). Tono
 * informativo, no alarmante (ADR 019); la comparación tangible del mockup
 * ("más que tu recibo de luz") quedó fuera (pendiente 1 del ADR 039:
 * pertenece al motor de interpretación de ANL.1).
 *
 * @param {import('../../core/state.js').Gasto[]} delMes gastos del mes visible, sin internas.
 * @param {boolean} oculto flag de privacidad ya leído por el caller (D9).
 * @returns {string}
 */
function _renderInsightHormigas(delMes, oculto) {
  const hormigas = detectarHormigas(delMes);
  if (hormigas.length === 0) return '';

  const top      = hormigas[0];
  const totalTxt = oculto ? SALDO_MASCARA_CUENTA : f(top.total);

  return `
    <div class="gastos-insight" role="note">
      <span class="gastos-insight__icon" aria-hidden="true">
        <svg class="icon" aria-hidden="true"><use href="#i-lightbulb"/></svg>
      </span>
      <div class="gastos-insight__body">
        <p class="gastos-insight__title">Gastos hormiga: ${_esc(top.categoria)}</p>
        <p class="gastos-insight__desc">${top.cantidad} gastos pequeños suman <strong>${totalTxt}</strong> este mes. Pequeños, pero se acumulan.</p>
      </div>
    </div>`;
}

/**
 * Grupo de un día de la lista (GAS.1b, ADR 039 D3): encabezado con el label
 * humano del día + total del día, y los ítems `.list-item` de siempre.
 *
 * @param {{ fecha: string, items: import('../../core/state.js').Gasto[], total: number }} grupo
 * @param {boolean} oculto flag de privacidad ya leído por el caller.
 * @returns {string}
 */
function _renderGrupoDia(grupo, oculto) {
  const label    = _labelDia(grupo.fecha);
  const totalTxt = oculto ? SALDO_MASCARA_CUENTA : f(grupo.total);

  return `
    <section class="gastos-dia" aria-label="${_esc(label)}, total ${_esc(totalTxt)}">
      <div class="gastos-dia__header" aria-hidden="true">
        <span class="gastos-dia__label">${_esc(label)}</span>
        <span class="gastos-dia__total">${totalTxt}</span>
      </div>
      ${grupo.items.map(g => _renderGastoItem(g, oculto)).join('')}
    </section>`;
}

/**
 * Fecha local de ayer en formato ISO 'YYYY-MM-DD' (mismos getters locales
 * que hoy()). Exportada desde FORM.1a: el wiring del form (index.js) la usa
 * para el atajo "Ayer" de los chips de fecha (ADR 042 D1).
 */
export function ayerIso() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Label humano del encabezado de día (GAS.1b, ADR 039 D3): "Hoy", "Ayer",
 * o "Vie 11 jul" (+ año solo si no es el año en curso). Formateador
 * cacheado (PERF.7a); UTC mediodía para evitar off-by-one en GMT-N (mismo
 * criterio que fechaLegible).
 *
 * @param {string} iso 'YYYY-MM-DD'
 * @returns {string}
 */
function _labelDia(iso) {
  const hoyIso = hoy();
  if (iso === hoyIso) return 'Hoy';
  if (iso === ayerIso()) return 'Ayer';

  const opciones = { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' };
  if (iso?.slice(0, 4) !== hoyIso.slice(0, 4)) opciones.year = 'numeric';

  const d   = new Date(`${iso}T12:00:00Z`);
  const txt = formateadorFecha('es-CO', opciones).format(d).replace(/[.,]/g, '');
  return txt.charAt(0).toUpperCase() + txt.slice(1);
}

/**
 * TX.9a: la categoría es el concepto principal del gasto (título del ítem),
 * no la descripción libre (el formulario ya no la pide). Desde GAS.1b la
 * fecha vive en el encabezado del grupo del día, no en el subtítulo: ahí
 * quedan solo la descripción legacy y la nota (línea omitida si no hay
 * ninguna).
 *
 * @param {import('../../core/state.js').Gasto} gasto
 * @param {boolean} oculto flag de privacidad ya leído por el caller (D9).
 */
function _renderGastoItem(gasto, oculto) {
  const catKey = gasto.categoria ?? 'Otros';
  const cat    = _esc(catKey);
  // Descripción legacy (gastos de antes de TX.9a que ya la tenían) + nota:
  // ambas son detalle opcional del subtítulo.
  const detalle = [gasto.descripcion?.trim(), gasto.nota]
    .filter(Boolean)
    .map(_esc)
    .join(' · ');
  const subtitulo = detalle ? `<p class="list-item__subtitle">${detalle}</p>` : '';
  const montoTxt  = oculto ? SALDO_MASCARA_CUENTA : f(gasto.monto);

  // TX.6/TX.7: un gasto nacido de un fijo o de un abono a deuda hereda el
  // ícono de su compromiso de origen (categoría de Agenda, o i-cuentas /
  // i-personales por tipo de deuda); solo sin origen aplica el de la
  // categoría del gasto (nativa o personalizada, TX.9b). ID.3: el glifo va
  // en la teja teñida del dominio.
  const simbolo = iconoPorOrigen(gasto, S.compromisos) ?? iconoDeCategoriaGasto(catKey, S.categoriasPersonalizadas);

  return `
    <article class="list-item" data-id="${_esc(gasto.id)}">
      <div class="list-item__icon" aria-hidden="true">${tejaCategoria(simbolo, 'gastos')}</div>
      <div class="list-item__body">
        <p class="list-item__title">${cat}</p>
        ${subtitulo}
      </div>
      <div class="list-item__meta">
        <p class="list-item__amount">${montoTxt}</p>
      </div>
      <div class="list-item__action">
        <button class="btn btn-ghost btn-icon"
                data-action="repetir-gasto"
                data-id="${_esc(gasto.id)}"
                aria-label="Repetir este gasto"><svg class="icon" aria-hidden="true"><use href="#i-recurring"/></svg></button>
        <button class="btn btn-ghost btn-icon"
                data-action="editar-gasto"
                data-id="${_esc(gasto.id)}"
                aria-label="Editar gasto"><svg class="icon" aria-hidden="true"><use href="#i-edit"/></svg></button>
        <button class="btn btn-ghost btn-icon"
                data-action="eliminar-gasto"
                data-id="${_esc(gasto.id)}"
                aria-label="Eliminar gasto"><svg class="icon" aria-hidden="true"><use href="#i-trash"/></svg></button>
      </div>
    </article>`;
}

/**
 * Empty states v2 (GAS.1c, ADR 039 D7): misma anatomía que `.cal-empty`
 * (CAL.4b): card con teja de dominio + título + descripción + CTA.
 *
 * Dos textos, según el mes visible (DIS.4/G5 y G7):
 * - Mes corriente: la invitación de siempre, con el CTA en `.btn-secondary`
 *   porque el encabezado de la sección ya trae el único primario visible
 *   (hallazgo H6: dos primarios y tres nombres para la misma acción).
 * - Cualquier otro mes: el CTA de registrar engañaba, porque el formulario
 *   abre con la fecha de HOY y el gasto caía en el mes corriente,
 *   desapareciendo de la pantalla que lo pidió. El vacío dice de qué mes
 *   habla y ofrece volver al mes donde el gasto sí va a caer (hallazgo H8).
 */
function _renderEmptyState() {
  const hoyDate      = new Date();
  const mesCorriente = MONTHS[hoyDate.getMonth()].toLowerCase();

  if (_viewYear !== hoyDate.getFullYear() || _viewMonth !== hoyDate.getMonth()) {
    return `
    <div class="gastos-empty">
      <span class="gastos-empty__teja gastos-empty__teja--neutra" aria-hidden="true"><svg class="icon" aria-hidden="true"><use href="#i-search"/></svg></span>
      <p class="gastos-empty__title">No registraste gastos en ${MONTHS[_viewMonth].toLowerCase()}</p>
      <p class="gastos-empty__desc">Cualquier gasto que anotes hoy entra en ${mesCorriente}, el mes que ves al abrir la sección.</p>
      <button type="button" class="btn btn-secondary" data-action="gastos-mes-actual">Volver a ${mesCorriente}</button>
    </div>`;
  }

  return `
    <div class="gastos-empty">
      <span class="gastos-empty__teja" aria-hidden="true"><svg class="icon" aria-hidden="true"><use href="#i-gastos"/></svg></span>
      <p class="gastos-empty__title">Sin gastos este mes</p>
      <p class="gastos-empty__desc">Anota tu primera compra o pago y verás aquí a dónde se va tu dinero.</p>
      <button type="button" class="btn btn-secondary" data-action="nuevo-gasto">Registrar gasto</button>
    </div>`;
}

// ── GASTOS FRECUENTES (TX.12) ────────────────────────────────────

/**
 * Chips de un toque con los gastos frecuentes del historial (TX.12): cada
 * chip trae el monto/categoría/cuenta ya calculados en `data-*`, que
 * `gastos/index.js` lee para prellenar el formulario sin volver a derivar
 * nada (la vista no repite el cálculo de `gastosFrecuentes`, solo lo pinta).
 * Solo se ofrecen al crear (`_montarFormGasto` no la pide en modo edición):
 * repetir un patrón no tiene sentido mientras se edita un registro puntual.
 *
 * Van DESPUÉS del bloque `.monto-hero` (DIS.4/G9, hallazgo H10): TX.12 los
 * insertó antes y el formulario dejó de abrir con el monto, que es lo que
 * fija el [ADR 042](docs/DECISIONS/042-formularios-v2-visual.md) D2. El atajo
 * sigue arriba del pliegue y se lee como lo que es: una alternativa.
 *
 * @returns {string} '' si no hay ningún patrón repetido en el historial.
 */
function _renderChipsFrecuentes() {
  const frecuentes = gastosFrecuentes(S.gastos ?? [], hoy());
  if (frecuentes.length === 0) return '';

  const chips = frecuentes.map(gr => {
    const nombre = gr.descripcion || gr.categoria;
    return `
      <button type="button" class="gastos-frecuentes__chip"
              data-action="gastos-repetir-frecuente"
              data-categoria="${_esc(gr.categoria)}"
              data-monto="${gr.monto}"
              data-cuenta-id="${_esc(gr.cuentaId ?? '')}"
              aria-label="Repetir ${_esc(nombre)} de ${f(gr.monto)}">
        <svg class="icon" aria-hidden="true"><use href="#i-recurring"/></svg>
        <span class="gastos-frecuentes__nombre">${_esc(nombre)}</span>
        <span class="gastos-frecuentes__monto">${f(gr.monto)}</span>
      </button>`;
  }).join('');

  return `
    <div class="form-group">
      <span class="label" id="gasto-frecuentes-label">O repite un gasto frecuente</span>
      <div class="gastos-frecuentes__lista" role="group" aria-labelledby="gasto-frecuentes-label">
        ${chips}
      </div>
    </div>`;
}

// ── FORMULARIO DEL MODAL ─────────────────────────────────────────

/**
 * Devuelve el HTML del formulario de nuevo gasto.
 *
 * Selección de cuenta:
 *   - 0 cuentas: empty state guiado con CTA "Crear una cuenta".
 *   - Creación (`modoEdicion=false`): sin selector inline; la(s) cuenta(s) se
 *     se eligen al confirmar (reparto multi-cuenta).
 *
 * El formulario muestra el selector de cuenta (tarjetas con icono de entidad)
 * tanto en creación como en edición. En creación, si la cuenta elegida no
 * alcanza, el reparto entre varias se resuelve al confirmar (sin negativos);
 * en edición el registro sigue siendo de una sola cuenta. La pre-selección la
 * ajusta el caller (`_editarGasto`) en modo edición.
 *
 * MC.16b (ADR 051 D4): si hay tarjetas de crédito operables, el selector las
 * ofrece en un grupo aparte y la pregunta pasa a ser "¿con qué pagaste?": ya
 * no todas las respuestas son una cuenta. Gastos es el único formulario que
 * las ofrece (no se ahorra ni se transfiere con cupo de crédito).
 *
 * MC.16d: con una tarjeta elegida, revela "¿A cuántas cuotas?" (index.js la
 * oculta/muestra por delegación de `change`, mismo patrón que "Otra categoría").
 *
 * @param {{ sugerencias?: boolean }} [opciones] `sugerencias: false` omite los
 *   chips de gastos frecuentes (TX.12): el caller la pasa en modo edición.
 * @returns {string}
 */
export function renderFormGasto({ sugerencias = true } = {}) {
  const cuentas = (S.cuentas ?? []).filter(c => c.activa !== false);

  // Si no hay cuentas activas, mostramos un estado vacío en lugar del form.
  // El gasto no puede existir sin cuenta de origen.
  if (cuentas.length === 0) {
    return `
      <div class="form-empty">
        <span class="form-empty__teja" aria-hidden="true">${icon('cuentas')}</span>
        <p class="form-empty__title">Primero necesitas una cuenta</p>
        <p class="form-empty__desc">Un gasto necesita una cuenta de donde salga el dinero. Créala aquí y sigues sin perder el hilo.</p>
        <a class="btn btn-primary btn-lg" href="#tesoreria" data-action="ir-a-crear-cuenta">${icon('cuentas')} Crear una cuenta</a>
      </div>`;
  }

  // MC.16b: las tarjetas operables las pasa el caller, el helper nunca lee
  // S.compromisos (ADR 051 D4). Leer el singleton de otro dominio sí es la
  // norma (ADN 10 prohíbe importar el módulo, no leer S).
  const tarjetas    = tarjetasDeCredito(S.compromisos);
  const labelOrigen = tarjetas.length > 0 ? '¿Con qué pagaste?' : '¿De qué cuenta sale el dinero?';

  // FORM.1a (ADR 042 D2/D3): la categoría se elige con chips de ícono, no
  // con un desplegable. Radios reales name="categoria" dentro del label:
  // el contrato FormData y validarGasto() no cambian. Catálogo completo
  // visible (nativas + personalizadas TX.9b) y "Otra categoría" al final
  // revela los campos de categoría nueva, igual que antes.
  const personalizadas = S.categoriasPersonalizadas ?? [];
  const chipCat = (valor, etiqueta, simbolo) => `
        <label class="chip-cat">
          <input type="radio" name="categoria" class="chip-cat__radio" value="${_esc(valor)}" />
          <svg class="icon" aria-hidden="true"><use href="#${_esc(simbolo)}"/></svg>
          <span class="chip-cat__label">${_esc(etiqueta)}</span>
        </label>`;
  const chipsCategoria = [
    ...CATEGORIAS_GASTO_USUARIO.map(c => chipCat(c, c, iconoDeCategoriaGasto(c, personalizadas))),
    ...personalizadas.map(c => chipCat(c.nombre, c.nombre, iconoDeCategoriaGasto(c.nombre, personalizadas))),
    chipCat(CATEGORIA_NUEVA_VALUE, 'Otra categoría', 'i-plus'),
  ].join('');

  // ADR 042 D1: atajos de fecha. Radios de presentación (name="fechaOpcion");
  // el input date real (name="fecha") queda oculto y sincronizado por
  // _montarFormGasto(); "Otra fecha" lo revela. Hoy por defecto (CAT.4).
  const chipFecha = (valor, etiqueta, checked) => `
        <label class="chip-fecha">
          <input type="radio" name="fechaOpcion" class="chip-cat__radio" value="${valor}"${checked ? ' checked' : ''} />
          ${etiqueta}
        </label>`;

  return `
    <form id="form-gasto" novalidate>
      <div class="monto-hero">
        <label class="monto-hero__label" for="gasto-monto">Monto del gasto</label>
        <div class="monto-hero__box">
          <span class="monto-hero__prefijo" aria-hidden="true">$</span>
          <input id="gasto-monto" name="monto" class="input input--big-amount" type="number"
                 min="1" step="1000" placeholder="0" required aria-required="true"
                 autocomplete="off" inputmode="numeric" />
        </div>
        <span class="monto-hero__hint">COP</span>
      </div>
      ${sugerencias ? _renderChipsFrecuentes() : ''}
      <div class="form-group">
        <span class="label" id="gasto-categoria-label">Categoría</span>
        <div class="chips-cat" role="radiogroup" aria-labelledby="gasto-categoria-label">
          ${chipsCategoria}
        </div>
      </div>
      <div class="form-group" id="categoria-nueva-fields" hidden>
        <label for="categoria-nueva-nombre" class="label">Nombre de tu categoría</label>
        <input id="categoria-nueva-nombre" name="categoriaNuevaNombre" class="input" type="text"
               placeholder="Ej. Gimnasio" autocomplete="off" />
        ${renderIconoPicker(ICONOS_CATEGORIA_PERSONALIZADA, { id: 'categoria-nueva-icono', nombreCampo: 'categoriaNuevaIcono' })}
      </div>
      ${renderSelectorCuenta(cuentas, { tarjetas, label: labelOrigen })}
      <div class="form-group" id="grupo-gasto-cuotas" hidden>
        <span class="label" id="gasto-cuotas-label">¿A cuántas cuotas?</span>
        <div class="fecha-chips" role="radiogroup" aria-labelledby="gasto-cuotas-label">
          ${[1, 2, 3, 6, 9, 12, 18, 24].map(n => `
          <label class="chip-fecha">
            <input type="radio" name="cuotas" class="chip-cat__radio" value="${n}"${n === 1 ? ' checked' : ''} />
            ${n === 1 ? '1 cuota' : `${n} cuotas`}
          </label>`).join('')}
        </div>
      </div>
      <div class="form-group">
        <span class="label" id="gasto-fecha-label">Fecha</span>
        <div class="fecha-chips" role="radiogroup" aria-labelledby="gasto-fecha-label">
          ${chipFecha('hoy', 'Hoy', true)}
          ${chipFecha('ayer', 'Ayer', false)}
          ${chipFecha('otra', 'Otra fecha', false)}
        </div>
        <div class="fecha-otra" id="gasto-fecha-otra" hidden>
          <label for="gasto-fecha" class="sr-only">Fecha exacta</label>
          <input id="gasto-fecha" name="fecha" class="input" type="date"
                 value="${hoy()}" required aria-required="true" />
        </div>
      </div>
      <div class="form-group">
        <label for="gasto-nota" class="label">Nota <span class="form-optional">opcional</span></label>
        <input id="gasto-nota" name="nota" class="input" type="text"
               placeholder="Detalle adicional, ej. con quién fue" autocomplete="off" />
      </div>
      <div class="modal__footer modal__footer--principal">
        <button type="button" class="btn btn-ghost" data-action="modal-close">Cancelar</button>
        <button type="submit" class="btn btn-primary">${icon('check-circle')} Guardar gasto</button>
      </div>
    </form>`;
}


/**
 * gastos/view.js - generación de HTML para el dominio de gastos.
 * Puede leer S. No puede mutarlo. Sin lógica de negocio.
 */

import { S } from '../../core/state.js';
import { f, hoy, formateadorFecha, esc as _esc } from '../../infra/utils.js';
import { icon, tejaCategoria } from '../../infra/icons.js';
import { SALDO_MASCARA, SALDO_MASCARA_CUENTA } from '../../infra/render.js';
import { CATEGORIAS_GASTO_USUARIO, ICONOS_CATEGORIA_GASTO_PROPIA, SUBCATEGORIAS_GASTO, iconoDeCategoriaGasto, tonoDeCategoria } from '../../core/constants.js';
import { categoriasConHijos, hijosDeCategoria, hijoPorId } from '../../infra/taxonomia.js';
import { renderSelectorCuenta, htmlRenglonCuenta } from '../../infra/cuenta-helper.js';
import { presupuestosActivos } from '../presupuesto/logic.js';
import { renderIconoPicker } from '../../infra/icon-picker.js';
import { htmlTinoSol } from '../../infra/ilustraciones.js';
import { topeHormiga, aprendidosDe, preguntaHormiga, gastosHormiga, caracterDeGasto } from '../../infra/hormiga.js';
import { mesBloque, navegarMesBloque, irAMesActualBloque, htmlMesDelRotulo, primerMesFinko } from '../../infra/mes-bloque.js';
import { CATEGORIAS_INTERNAS_GASTO, esDelDiaADia, gastosMes, filtrarGastos, ordenarRecientesPrimero, agruparPorDia, totalGastos, variacionMensualGasto, detectarHormigas, iconoPorOrigen, gastosFrecuentes, tarjetasDeCredito, comparacionDelMes, repartoPorCategoria, semanasDelMes } from './logic.js';
import { montosOcultos } from '../../infra/privacidad.js';

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
const _CATEGORIAS_INTERNAS = CATEGORIAS_INTERNAS_GASTO;

/** El teléfono y la tableta: donde el bloque Gastos tiene su encabezado. */
const MQ_TELEFONO = '(max-width: 1023.98px)';

/**
 * Lo que es del día a día. Fuera las categorías internas y, desde GAS.9b
 * (ADR 183 D2), todo pago de un fijo o de una deuda aunque su categoría se
 * haya cambiado a mano: lo dice `compromisoId` sin `consumoTC`. Una compra
 * con la tarjeta (`consumoTC`) sí es día a día.
 *
 * @param {import('../../core/state.js').Gasto[]} gastos
 */
function _sinInternas(gastos) {
  return gastos.filter(esDelDiaADia);
}

// ── ESTADO LOCAL DE VISTA ────────────────────────────────────────

/**
 * Mes visualizado. Desde la ficha 07 (ADR 069 D8, hallazgo G4) el estado ya no
 * vive acá: sube a `infra/mes-bloque.js` y lo comparten las tres lentes del
 * bloque Gastos, para que navegar el mes en una no deje a las otras en otro.
 * Estos dos getters conservan los nombres que el resto del archivo usaba.
 */
function _mesVisible() { return mesBloque(); }

/** Categoría activa en el filtro de chips. `null` = "Todos". */
let _filtroCategoria = null;

/**
 * GAS.7c (ADR 179 D3): los días largos que la persona abrió con "N gastos
 * más". Estado de esta visita, como el filtro: no se persiste.
 * @type {Set<string>}
 */
const _diasAbiertos = new Set();

/**
 * GAS.8b (ADR 182 D2): las semanas anteriores que la persona abrió (por la
 * fecha de su lunes). Estado de esta visita, como los días largos.
 * @type {Set<string>}
 */
const _semanasAbiertas = new Set();

/** El teléfono, donde va la anatomía del tablero (ADR 179). */
function _enTelefono() {
  return window.matchMedia?.(MQ_TELEFONO).matches === true;
}

/** Abre un día largo (acción `gastos-dia-mas`). */
export function abrirDiaGastos(fecha) {
  if (fecha) _diasAbiertos.add(fecha);
}

/** Abre o cierra una semana anterior (acción `gastos-semana`, GAS.8b). */
export function alternarSemanaGastos(clave) {
  if (!clave) return;
  if (_semanasAbiertas.has(clave)) _semanasAbiertas.delete(clave);
  else _semanasAbiertas.add(clave);
}

/**
 * Mueve el mes visualizado en `delta` pasos (positivo = adelante, negativo = atrás).
 * Resetea el filtro de categoría al cambiar de mes (las categorías del nuevo mes
 * pueden ser distintas). El caller debe llamar renderFiltrosGastos + renderListaGastos.
 *
 * El mes lo mueve `infra/mes-bloque.js`; lo propio de esta lente es el reset
 * del filtro.
 *
 * @param {number} delta
 */
export function navegarMesGastos(delta) {
  navegarMesBloque(delta);
  _filtroCategoria = null; // reset al cambiar mes
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
  irAMesActualBloque();
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
 * Exportada desde la ficha 07 (ADR 069 D8): el selector de mes sube al
 * encabezado del bloque y necesita el mismo tope que usaba el hero, para que
 * los dos controles no discrepen sobre hasta dónde se puede navegar.
 *
 * @returns {{ anio: number, mes: number }} mes 0-indexed, como Date.getMonth().
 */
export function mesTopeGastos() {
  return _mesTope();
}

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

  const { anio: _viewYear, mes: _viewMonth } = _mesVisible();

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
    // GAS.4b (ADR 157 D5): en el teléfono las categorías van todas en una
    // fila que se desliza, de más a menos gasto en el mes; en escritorio la
    // barra envuelve y sigue siendo el índice alfabético (ADR 072 D1).
    const todosActivo = _filtroCategoria === null;
    const telefono = _enTelefono();
    // GAS.8b (ADR 182 D2): la categoría elegida pasa al frente, junto a "Todo".
    const porGasto = categoriasTopGastos(delMes, cats.length);
    const orden = !telefono ? cats
      : _filtroCategoria ? [_filtroCategoria, ...porGasto.filter(c => c !== _filtroCategoria)]
      : porGasto;
    // GAS.8b (ADR 182 D2): el chip solo filtra; su total salió (el reparto
    // por categoría lo dice la barra de la tarjeta).
    const chips = orden.map(cat => {
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

    // GAS.8b: en el teléfono "Todos" pasa a "Todo". GAS.10a (ADR 185 D1): el
    // embudo pasa a lupa, el único acceso a buscar desde Gastos: abre
    // Movimientos con Gastos marcado, donde viven el texto, la cuenta y las
    // fechas.
    // GAS.13d (ADR 188 D4): la lupa sube a la cabecera de Gastos, única
    // búsqueda del bloque; los filtros quedan solo con las categorías.
    const embudo = '';
    chipsHtml = `
      <div class="filtros-bar" role="group" aria-label="Filtrar gastos por categoría">${embudo}
        <button type="button"
                class="chip chip--gastos${todosActivo ? ' chip--active' : ''}"
                data-action="gastos-filtrar-cat"
                data-cat=""
                aria-pressed="${todosActivo}"
                aria-label="Ver todos los gastos">
          ${telefono ? 'Todo' : 'Todos'}
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

  // GAS.7g (ADR 179 D7): un mes pasado sin gastos cambia la tarjeta por
  // "Estás viendo agosto 2026 ⌄": un $0 grande no dice nada.
  const hoyDate = new Date();
  const mesPasadoVacio = !sinHistorial && delMes.length === 0 && _enTelefono()
    && (_viewYear !== hoyDate.getFullYear() || _viewMonth !== hoyDate.getMonth());
  const tarjeta = sinHistorial ? ''
    : mesPasadoVacio ? `<div class="mes-viendo">Estás viendo ${htmlMesDelRotulo(hoyDate, { conAnio: true })}</div>`
    : _renderHeroGastos(delMes);
  // GAS.10a (ADR 185 D1): lo vencido ya no tiene franja en Día a día: lo
  // avisan Atención hoy, en Inicio, y el punto rojo de su pestaña.
  el.innerHTML = tarjeta + chipsHtml;
  _pintarCompacta(sinHistorial ? null : delMes);
}

// ── LA TARJETA COMPACTA (GAS.7c, ADR 179 D3) ──

/** El observador que enciende la tarjeta compacta al pasar la grande. */
let _observadorHero = null;

/**
 * La tarjeta de una línea que queda pegada bajo las pestañas al desplazar
 * ("Noviembre ⌄ $1.284.600 38 gastos"). Vive en `#gastos-compacta`, hija de la
 * sección, y se enciende cuando la tarjeta grande sale por arriba.
 *
 * @param {import('../../core/state.js').Gasto[] | null} delMes null sin historial.
 */
function _pintarCompacta(delMes) {
  const slot = document.getElementById('gastos-compacta');
  if (!slot) return;
  if (!delMes || !_enTelefono()) {
    slot.innerHTML = '';
    slot.hidden = true;
    return;
  }
  const visibles = filtrarGastos(delMes, _filtroCategoria);
  const oculto = montosOcultos('gast');
  const n = visibles.length;
  const { mes } = _mesVisible();
  // SIT.1a (ADR 202 D2): "Restaurantes en nov", sin punto entre datos.
  const quien = _filtroCategoria ? `${_esc(_filtroCategoria)} en ` : '';
  slot.innerHTML = `
    <div class="gastos-compacta">
      <span class="gastos-compacta__mes">${quien}${_mesCompacto(mes)}</span>
      <span class="gastos-compacta__valor">${_conSigno(oculto ? SALDO_MASCARA : f(totalGastos(visibles)))}</span>
      <span class="gastos-compacta__cuantos">${n === 1 ? '1 gasto' : `${n} gastos`}</span>
    </div>`;

  const hero = document.querySelector('#panel-filtros-gastos .hero-gastos');
  _observadorHero?.disconnect();
  if (!hero || typeof IntersectionObserver !== 'function') { slot.hidden = true; return; }
  // GAS.9a: la compacta solo existe cuando la tarjeta grande salió por
  // arriba. Con Día a día oculta (otra pestaña) la tarjeta mide 0 y el
  // observador avisaba "no se cruza, top 0": la compacta quedaba encendida y
  // al volver se pintaba un cuadro bajo las pestañas (la raya café).
  _observadorHero = new IntersectionObserver(([e]) => {
    const r = e.boundingClientRect;
    slot.hidden = e.isIntersecting || r.height === 0 || r.top > 0;
  }, { rootMargin: '-64px 0px 0px 0px' });
  _observadorHero.observe(hero);
  _enlazarCompactaAlNavegar();
}

let _compactaEnlazada = false;

/**
 * GAS.9a: el observador solo avisa cuando cambia el cruce. Si la tarjeta ya
 * estaba fuera al cambiar de pestaña, no avisa nada y la compacta seguía
 * encendida en Día a día oculta. Al navegar se apaga en el acto y se vuelve
 * a observar desde cero, que siempre entrega un primer aviso con el estado
 * de la pestaña a la que se llegó (el listener del router ya mostró la
 * sección: se registró antes).
 */
function _enlazarCompactaAlNavegar() {
  if (_compactaEnlazada) return;
  _compactaEnlazada = true;
  window.addEventListener('hashchange', () => {
    const slot = document.getElementById('gastos-compacta');
    if (slot) slot.hidden = true;
    const hero = document.querySelector('#panel-filtros-gastos .hero-gastos');
    if (_observadorHero && hero) {
      _observadorHero.unobserve(hero);
      _observadorHero.observe(hero);
    }
  });
}

/** El mes de la tarjeta compacta: el botón de la hoja con el nombre en mayúscula. */
function _mesCompacto(mes) {
  const html = htmlMesDelRotulo();
  const nombre = MONTHS[mes];
  return html.replace(`>${nombre.toLowerCase()}`, `>${nombre}`);
}

/**
 * Las categorías del mes de mayor a menor gasto (ADR 132 D2): el orden del
 * riel de categorías en el teléfono (GAS.4b, ADR 157 D5). A igual monto, por
 * nombre.
 *
 * @param {ReadonlyArray<{ categoria?: string, monto: number }>} delMes
 * @param {number} [cuantas=3]
 * @returns {string[]}
 */
export function categoriasTopGastos(delMes, cuantas = 3) {
  const totales = new Map();
  for (const g of delMes) {
    const cat = g.categoria ?? 'Otros';
    totales.set(cat, (totales.get(cat) ?? 0) + (Number(g.monto) || 0));
  }
  return [...totales]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'es'))
    .slice(0, cuantas)
    .map(([cat]) => cat);
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
  const { anio: _viewYear, mes: _viewMonth } = _mesVisible();
  const visibles   = filtrarGastos(delMes, _filtroCategoria);
  const total      = totalGastos(visibles);
  const oculto     = montosOcultos('gast');
  const totalTxt   = oculto ? SALDO_MASCARA : f(total);
  // GAS.7b (ADR 179 D2): en el teléfono el mes es la palabra del rótulo y
  // abre la hoja de meses; en escritorio sigue siendo texto.
  const mesVisible = htmlMesDelRotulo();
  const label      = _filtroCategoria
    ? `${_esc(_filtroCategoria)} en ${mesVisible}`
    : `Gastaste en ${mesVisible}`;

  const tope   = _mesTope();
  const enTope = _viewYear === tope.anio && _viewMonth === tope.mes;

  // GAS.13d (ADR 188 D4): en el teléfono el ojo va pegado a la cifra; la fila
  // de arriba (mes con flechas y enlace) es de escritorio.
  const ojo = `
        <button class="hero-gastos__ojo" type="button" id="gastos-saldo-ojo"
                data-action="gastos-saldo-visibilidad"
                aria-pressed="${oculto}"
                aria-label="${oculto ? 'Mostrar tus saldos' : 'Ocultar tus saldos'}">
          <svg class="icon" aria-hidden="true"><use href="#i-eye${oculto ? '-off' : ''}"/></svg>
        </button>`;
  if (_enTelefono()) {
    return `
    <div class="hero-gastos">
      <p class="hero-gastos__label">${label}</p>
      <p class="hero-gastos__valor" data-cabe="tarjeta">${_conSigno(totalTxt)}</p>${ojo}
      ${_lecturaTelefono(delMes, visibles, total, oculto)}
    </div>`;
  }
  return `
    <div class="hero-gastos">
      <div class="hero-gastos__top">
        <div class="hero-gastos__mes" role="group" aria-label="Seleccionar mes">
          <button type="button" class="hero-gastos__mes-btn"
                  data-action="gastos-prev-mes"
                  aria-label="Mes anterior">${icon('chevron-right', 'icon hero-gastos__chev-prev')}</button>
          <span class="hero-gastos__mes-label">${MONTHS[_viewMonth]} ${_viewYear}</span>
          <button type="button" class="hero-gastos__mes-btn"
                  data-action="gastos-next-mes"
                  ${enTope ? 'disabled aria-disabled="true"' : ''}
                  aria-label="Mes siguiente">${icon('chevron-right', 'icon')}</button>
        </div>
        <a href="#analisis" class="hero-gastos__link"
           aria-label="Ver el desglose por categoría en Análisis">En qué gastaste</a>${ojo}
      </div>
      <p class="hero-gastos__label">${label}</p>
      <p class="hero-gastos__valor">${_conSigno(totalTxt)}</p>
      ${_filtroCategoria ? _lecturaFiltro(visibles.length, _filtroCategoria, oculto) : ''}
      ${_renderComparativo(delMes)}
    </div>`;
}

/**
 * GAS.8b (ADR 182 D2): lo que va bajo la cifra en el teléfono. Sin chip, la
 * comparación en pesos ("$48.000 menos que octubre a esta altura del mes"),
 * la barra por categoría en su tono y la leyenda de las dos primeras con
 * "Categorías ›". Con chip, cuántos gastos y qué parte del mes son y, si la
 * categoría tiene límite, su ficha: lo que queda, la barra y el porcentaje.
 * El ojo tapa los montos y la barra (como la hoja de meses, ADR 179 D2).
 *
 * @param {import('../../core/state.js').Gasto[]} delMes
 * @param {import('../../core/state.js').Gasto[]} visibles
 * @param {number} total
 * @param {boolean} oculto
 * @returns {string} HTML.
 */
function _lecturaTelefono(delMes, visibles, total, oculto) {
  // SIT.1a (ADR 202 D4): el mes corriente sin gastos lo dice con palabras, sin
  // barra ni leyenda vacías.
  if (delMes.length === 0) {
    const { anio, mes } = _mesVisible();
    const ahora = new Date();
    return anio === ahora.getFullYear() && mes === ahora.getMonth()
      ? '<p class="hero-gastos__lectura fk-balance">Aún no anotas gastos este mes.</p>'
      : '';
  }
  // GAS.13d (ADR 188 D4): con el ojo puesto salen la comparación, la barra y
  // la leyenda; queda la cifra tapada.
  if (oculto) return '';
  const m = (x) => (oculto ? SALDO_MASCARA : f(x));
  const n = visibles.length;
  const cuantos = n === 1 ? '1 gasto' : `${n} gastos`;
  if (_filtroCategoria) {
    const delTotal = totalGastos(delMes);
    const parte = delTotal > 0 ? Math.round((total / delTotal) * 100) : 0;
    // SIT.1a (ADR 202 D2): palabras en vez del punto entre datos.
    return `
      <p class="hero-gastos__lectura fk-balance">${cuantos}, el <span class="fk-unidad">${parte} %</span> de lo que gastaste este mes</p>
      ${_fichaLimite(total, m)}`;
  }
  return `${_comparacionTelefono(m)}${oculto ? '' : _repartoTelefono(delMes)}`;
}

/**
 * "$48.000 menos que a esta altura de octubre", o la cuenta de gastos sin
 * base. SIT.1a (ADR 202 D4): la frase termina en el mes y se reparte con
 * `balance`, así ninguna palabra queda sola en su renglón.
 */
function _comparacionTelefono(m) {
  const { anio, mes } = _mesVisible();
  const delMes = _sinInternas(S.gastos ?? []);
  const c = comparacionDelMes(delMes, anio, mes);
  if (!c) {
    const n = gastosMes(delMes, anio, mes + 1).length;
    return `<p class="hero-gastos__lectura fk-balance">${n === 1 ? '1 gasto' : `${n} gastos`}, sin contar fijos ni deudas</p>`;
  }
  const nombre = MONTHS[c.mesPrevio].toLowerCase();
  const cola = c.aLaAltura ? `a esta altura de ${nombre}` : nombre;
  // GAS.10a (ADR 185 D1): la diferencia en negrita, el resto en la línea.
  const frase = c.diferencia === 0
    ? `Lo mismo que ${cola}`
    : `<strong class="fk-unidad">${m(Math.abs(c.diferencia))} ${c.diferencia < 0 ? 'menos' : 'más'}</strong> que ${cola}`;
  return `<p class="hero-gastos__lectura fk-balance">${frase}</p>`;
}

/** La barra por categoría, cada una en su tono, y la leyenda de las dos primeras. */
function _repartoTelefono(delMes) {
  const reparto = repartoPorCategoria(delMes);
  if (reparto.length === 0) return '';
  const tramos = reparto.map(r =>
    `<span class="hero-gastos__tramo" style="flex-grow:${r.total};--tramo:var(--fk-cat-${tonoDeCategoria(r.categoria)}-barra)"></span>`).join('');
  const leyenda = reparto.slice(0, 2).map(r => `
        <span class="hero-gastos__ley"><span class="hero-gastos__punto" style="--tramo:var(--fk-cat-${tonoDeCategoria(r.categoria)}-barra)"></span>${_esc(r.categoria)} ${r.pct} %</span>`).join('');
  return `
      <div class="hero-gastos__reparto" aria-hidden="true">${tramos}</div>
      <div class="hero-gastos__leyenda">${leyenda}
        <button type="button" class="hero-gastos__categorias" data-action="bloque-elegir-mes" aria-haspopup="dialog">Resumen${icon('chevron-right')}</button>
      </div>`;
}

/**
 * Con un chip y un límite: "Límite de Restaurantes", "Quedan $15.500" (o "Te
 * pasaste $X"), la barra y "91 % de $170.000 · faltan 11 días" (los días,
 * solo en el mes corriente).
 */
function _fichaLimite(total, m) {
  const tope = presupuestosActivos(S.presupuestos).find(p => p.categoria === _filtroCategoria);
  const limite = Number(tope?.montoMensual) || 0;
  if (limite <= 0) return '';
  const pasado = total > limite;
  const pct = Math.round((total / limite) * 100);
  const hoyDate = new Date();
  const { anio, mes } = _mesVisible();
  const corriente = anio === hoyDate.getFullYear() && mes === hoyDate.getMonth();
  const faltan = corriente ? new Date(anio, mes + 1, 0).getDate() - hoyDate.getDate() : 0;
  // SIT.1a (ADR 202 D2): el uso y los días que faltan, dos unidades.
  const dias = corriente && faltan > 0 ? `<span class="fk-unidad">faltan ${faltan} ${faltan === 1 ? 'día' : 'días'}</span>` : '';
  return `
      <div class="hero-gastos__limite${pasado ? ' hero-gastos__limite--pasado' : ''}">
        <p class="hero-gastos__limite-fila">
          <span>Límite de ${_esc(_filtroCategoria)}</span>
          <strong>${pasado ? `Te pasaste ${m(total - limite)}` : `Quedan ${m(limite - total)}`}</strong>
        </p>
        <div class="hero-gastos__limite-barra" role="progressbar" aria-label="Lo que usaste del límite"
             aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.min(100, pct)}">
          <span class="hero-gastos__limite-fill" style="--gasto-pct: ${Math.min(100, pct)}%"></span>
        </div>
        <p class="hero-gastos__limite-pie"><span class="fk-unidad">${pct} % de ${m(limite)}</span>${dias}</p>
      </div>`;
}

/**
 * El signo de pesos en su propia caja (GAS.4b, ADR 157 D4): en el teléfono
 * va más chico y arriba, como en el tablero. La máscara también empieza por
 * "$", así que el ojo no mueve la cifra.
 * @param {string} txt
 */
function _conSigno(txt) {
  return txt.startsWith('$') ? `<span class="hero-gastos__signo">$</span>${txt.slice(1)}` : txt;
}

/**
 * ADR 122 D5: con una categoría filtrada, bajo el total, cuántos gastos son y,
 * si la categoría tiene límite, cuál es: "8 gastos · tu límite es $250.000".
 * Es la lectura que el canvas pone en lugar del comparativo, que con filtro se
 * oculta.
 *
 * @param {number} n Gastos de la categoría en el mes.
 * @param {string} categoria
 * @param {boolean} oculto
 */
function _lecturaFiltro(n, categoria, oculto) {
  const tope = presupuestosActivos(S.presupuestos).find(p => p.categoria === categoria);
  const cuantos = n === 1 ? '1 gasto' : `${n} gastos`;
  const limite = tope ? ` · tu límite es ${oculto ? SALDO_MASCARA : f(Number(tope.montoMensual) || 0)}` : '';
  return `<p class="hero-gastos__lectura">${cuantos}${limite}</p>`;
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
function _renderComparativo(delMes, corto = false) {
  if (_filtroCategoria || delMes.length === 0) return '';

  const { anio: _viewYear, mes: _viewMonth } = _mesVisible();
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
  // GAS.7c (ADR 179 D3): en el teléfono la flecha ya dice si sube o baja.
  const texto   = v.direccion === 'igual'
    ? `Igual que ${mesPrev}`
    : corto ? `${v.pct}% vs. ${mesPrev}` : `${v.pct}% ${baja ? 'menos' : 'más'} que ${mesPrev}`;

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

  const { anio: _viewYear, mes: _viewMonth } = _mesVisible();

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
  const oculto    = montosOcultos('gast');
  const plegar = _enTelefono();
  const insight   = _filtroCategoria ? '' : _renderInsightHormigas(delMes, oculto);
  // GAS.8c (ADR 182 D3): en el teléfono, la sugerencia de Gastos fantasma va
  // después del primer día (lo de hoy se lee primero); la pregunta de SUS.2c
  // sigue arriba.
  const fantasma = plegar && insight.includes('gastos-fantasma');
  const ordenados = ordenarRecientesPrimero(filtrados);
  const dias = agruparPorDia(ordenados);
  const cuerpo = plegar
    ? _renderPorSemanas(dias, oculto, _viewYear, _viewMonth, fantasma ? insight : '')
    : dias.map(grupo => _renderGrupoDia(grupo, oculto)).join('');
  el.innerHTML = (fantasma ? '' : insight) + cuerpo + _renderSalidaHistorial();
}

/**
 * GAS.8b (ADR 182 D2): en el teléfono la semana más reciente va día por día
 * y las anteriores del mes se pliegan bajo "Semanas anteriores": una fila
 * por semana ("Del 9 al 15 de noviembre", cuántos gastos y cuánto) que al
 * tocarla muestra sus días debajo. Con una sola semana no hay pliegue.
 *
 * @param {{ fecha: string, items: import('../../core/state.js').Gasto[], total: number }[]} dias
 * @param {boolean} oculto
 * @param {number} anio
 * @param {number} mes 0-indexado.
 * @returns {string}
 */
function _renderPorSemanas(dias, oculto, anio, mes, trasElPrimero = '') {
  const semanas = semanasDelMes(dias, anio, mes);
  const [actual, ...anteriores] = semanas;
  const deDias = (lista) => lista.map(grupo => _renderGrupoDia(grupo, oculto, true)).join('');
  if (!actual) return trasElPrimero;
  const [primero, ...resto] = actual.dias;
  const recientes = deDias([primero]) + trasElPrimero + deDias(resto);
  if (anteriores.length === 0) return recientes;
  const nombreMes = MONTHS[mes].toLowerCase();
  const filas = anteriores.map((s) => {
    const abierta = _semanasAbiertas.has(s.clave);
    const rango = s.desde === s.hasta ? `El ${s.desde} de ${nombreMes}` : `Del ${s.desde} al ${s.hasta} de ${nombreMes}`;
    const cuantos = s.cantidad === 1 ? '1 gasto' : `${s.cantidad} gastos`;
    const monto = oculto ? SALDO_MASCARA_CUENTA : f(s.total);
    return `
        <li class="gastos-semana${abierta ? ' gastos-semana--abierta' : ''}">
          <button type="button" class="gastos-semana__fila" data-action="gastos-semana" data-semana="${_esc(s.clave)}"
                  aria-expanded="${abierta}" aria-label="${_esc(rango)}, ${cuantos}, ${_esc(monto)}">
            <span class="gastos-semana__textos">
              <span class="gastos-semana__rango">${_esc(rango)}</span>
              <span class="gastos-semana__cuantos">${cuantos}</span>
            </span>
            <span class="gastos-semana__total">${monto}</span>
            ${icon('chevron-down', 'icon gastos-semana__chev')}
          </button>
          ${abierta ? `<div class="gastos-semana__dias">${deDias(s.dias)}</div>` : ''}
        </li>`;
  }).join('');
  return `${recientes}
    <section class="gastos-semanas" aria-labelledby="gastos-semanas-t">
      <div class="gastos-semanas__head">
        <h2 class="gastos-semanas__titulo" id="gastos-semanas-t">Semanas anteriores</h2>
        <span class="gastos-semanas__ayuda" aria-hidden="true">Toca para abrir</span>
      </div>
      <ul class="gastos-semanas__lista">${filas}
      </ul>
    </section>`;
}

/**
 * Salida al historial completo (ficha 15, M3). Esta lista solo ve el mes que
 * marca el reloj del bloque y solo ve gastos; la pregunta "y el mes pasado" o
 * "buscar por texto" no tiene respuesta acá. Es el mismo patrón de acceso
 * contextual prefiltrado que la ficha 07 definió y que ya usan Límites,
 * Mis cuentas y Calendario: el botón manda a Movimientos con su chip puesto.
 *
 * Va al pie y no al encabezado a propósito: es la salida de quien ya recorrió
 * el mes y no encontró lo que buscaba, no una opción que compita con la lista.
 *
 * @returns {string}
 */
function _renderSalidaHistorial() {
  return `
    <p class="lista-gastos__salida">
      <button class="btn btn-ghost btn-sm lista-gastos__historial"
              data-action="gastos-ver-historial"
              aria-label="Ver historial completo de movimientos">Ver historial completo<svg class="icon" aria-hidden="true"><use href="#i-chevron-right"/></svg></button>
    </p>`;
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
  // GAS.11b (ADR 186 D5): lo pequeño que se repite, mirado sobre todo el
  // historial (una repetición que cruza el cambio de mes cuenta).
  const opciones = {
    tope: topeHormiga(S.config),
    personalizadas: S.categoriasPersonalizadas ?? [],
    aprendidos: aprendidosDe(S.config),
  };
  // SUS.2c (ADR 147 D1): si algo "depende" se está repitiendo y el usuario
  // todavía no dijo qué es, se pregunta antes de mostrar cifras.
  const { anio, mes } = _mesVisible();
  const pregunta = preguntaHormiga(S.gastos ?? [], `${anio}-${String(mes + 1).padStart(2, '0')}`, opciones);
  if (pregunta) return htmlPreguntaHormiga(pregunta, oculto);

  const hormigas = detectarHormigas(delMes, opciones.tope, undefined, {
    historial: S.gastos ?? [],
    personalizadas: opciones.personalizadas,
    aprendidos: opciones.aprendidos,
  });
  if (hormigas.length === 0) return '';
  if (_enTelefono()) return _renderFantasma(hormigas, oculto);

  const top      = hormigas[0];
  const totalTxt = oculto ? SALDO_MASCARA_CUENTA : f(top.total);

  return `
    <div class="gastos-insight" role="note">
      <span class="gastos-insight__icon" aria-hidden="true">
        <svg class="icon" aria-hidden="true"><use href="#i-lightbulb"/></svg>
      </span>
      <div class="gastos-insight__body">
        <p class="gastos-insight__title">Gastos hormiga: ${_esc(top.categoria)}</p>
        <p class="gastos-insight__desc">${top.cantidad} compras pequeñas suman <strong>${totalTxt}</strong> este mes. Pequeñas, pero se acumulan.</p>
      </div>
    </div>`;
}

/** Las categorías que caben en "cafés y antojos" (la frase del tablero). */
const _ANTOJOS = new Set(['Café', 'Antojos', 'Gastos hormiga']);

/**
 * Gastos fantasma (GAS.8c, ADR 182 D3): la sugerencia girasol con Tino que,
 * en el teléfono, reemplaza el aviso de gastos hormiga. Suma todas las
 * compras pequeñas que se repiten en el mes ("9 cafés y antojos pequeños ya suman
 * $86.500 este mes"); "Ver cuáles" abre la hoja de Análisis y la equis la
 * descarta en ese mes (`S.config.fantasmaDescartado`).
 *
 * @param {{ categoria: string, cantidad: number, total: number }[]} hormigas
 * @param {boolean} oculto
 * @returns {string}
 */
function _renderFantasma(hormigas, oculto) {
  const { anio, mes } = _mesVisible();
  const clave = `${anio}-${String(mes + 1).padStart(2, '0')}`;
  if (S.config?.fantasmaDescartado === clave) return '';
  const n = hormigas.reduce((acc, h) => acc + (Number(h.cantidad) || 0), 0);
  const total = hormigas.reduce((acc, h) => acc + (Number(h.total) || 0), 0);
  const antojos = hormigas.every(h => _ANTOJOS.has(h.categoria));
  const que = antojos
    ? (n === 1 ? 'antojo pequeño' : 'cafés y antojos pequeños')
    : (n === 1 ? 'gasto pequeño' : 'gastos pequeños');
  const hoyDate = new Date();
  const cuando = anio === hoyDate.getFullYear() && mes === hoyDate.getMonth() ? 'este mes' : `en ${MONTHS[mes].toLowerCase()}`;
  const suma = oculto ? SALDO_MASCARA_CUENTA : f(total);
  return `
    <div class="sugerencia gastos-fantasma" role="note" aria-labelledby="gastos-fantasma-t">
      ${htmlTinoSol('fantasma', { tamano: 58, clase: 'sugerencia__tino' })}
      <div class="sugerencia__textos">
        <p class="sugerencia__titulo" id="gastos-fantasma-t">Gastos fantasma</p>
        <p class="sugerencia__texto">${n} ${que} ${n === 1 ? 'ya suma' : 'ya suman'} ${suma} ${cuando}.</p>
        <button type="button" class="sugerencia__enlace" data-action="analisis-hoja" data-hoja="hormiga" aria-haspopup="dialog">Ver cuáles</button>
      </div>
      <button type="button" class="sugerencia__cerrar" data-action="gastos-fantasma-descartar" data-mes="${clave}"
              aria-label="Descartar Gastos fantasma">${icon('x')}</button>
    </div>`;
}

/**
 * "¿Fue una necesidad o un deseo?" (SUS.2c, ADR 147 D1): la tarjeta del
 * aviso de la lista pregunta por el concepto que se repite sin respuesta.
 * La respuesta la guarda la acción `gastos-gusto-o-necesidad` (index.js) en
 * esos gastos; desde GAS.5c (ADR 162 D2) no se aprende para los que vienen,
 * que se preguntan al registrarlos. Nunca dice "hormiga".
 *
 * @param {{ concepto: string, etiqueta: string, veces: number, total: number }} pregunta
 * @param {boolean} oculto - el ojo de privacidad tapa el total.
 * @returns {string}
 */
export function htmlPreguntaHormiga(pregunta, oculto) {
  const totalTxt = oculto ? SALDO_MASCARA_CUENTA : f(pregunta.total);
  const boton = (respuesta, texto) => `
          <button type="button" class="btn btn-secondary btn-sm" data-action="gastos-gusto-o-necesidad"
                  data-concepto="${_esc(pregunta.concepto)}" data-etiqueta="${_esc(pregunta.etiqueta)}" data-respuesta="${respuesta}">${texto}</button>`;
  return `
    <div class="gastos-insight gastos-insight--pregunta" role="group" aria-labelledby="gastos-pregunta-t">
      <span class="gastos-insight__icon" aria-hidden="true">
        <svg class="icon" aria-hidden="true"><use href="#i-lightbulb"/></svg>
      </span>
      <div class="gastos-insight__body">
        <p class="gastos-insight__title" id="gastos-pregunta-t">${_esc(pregunta.etiqueta)}: ¿fue una necesidad o un deseo?</p>
        <p class="gastos-insight__desc">Va ${pregunta.veces} ${pregunta.veces === 1 ? 'vez' : 'veces'} este mes y suma <strong>${totalTxt}</strong>. Tu respuesta queda en esos gastos.</p>
        <div class="gastos-insight__acciones">${boton('necesidad', 'Necesidad')}${boton('gusto', 'Deseo')}
        </div>
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
/** Cuántas filas muestra un día antes de "N gastos más" (ADR 179 D3). */
const FILAS_POR_DIA = 4;

function _renderGrupoDia(grupo, oculto, plegar = false) {
  const label    = labelDiaGastos(grupo.fecha);
  const totalTxt = oculto ? SALDO_MASCARA_CUENTA : f(grupo.total);
  // GAS.7c (ADR 179 D3): con un chip, la fila no repite la categoría.
  const conCategoria = !_filtroCategoria;
  const plegado = plegar && grupo.items.length > FILAS_POR_DIA + 1 && !_diasAbiertos.has(grupo.fecha);
  const filas = plegado ? grupo.items.slice(0, FILAS_POR_DIA) : grupo.items;
  const resto = plegado ? grupo.items.slice(FILAS_POR_DIA) : [];
  const mas = resto.length === 0 ? '' : `
      <button type="button" class="gastos-dia__mas" data-action="gastos-dia-mas" data-fecha="${_esc(grupo.fecha)}">
        <span class="gastos-dia__mas-txt">${resto.length} gastos más ${_delDia(label)}</span>
        <span class="gastos-dia__mas-total">${oculto ? SALDO_MASCARA_CUENTA : f(totalGastos(resto))}</span>
        ${icon('chevron-down')}
      </button>`;

  // GAS.10a (ADR 185 D1): en el teléfono el rótulo lleva su complemento.
  // SIT.2a (ADR 203 D3): "Hoy, jueves 26" en un solo rótulo (antes "Hoy" y
  // "jueves 26" en dos pesos); los demás días ya lo dicen ("Martes 24").
  const complemento = plegar ? complementoDiaGastos(grupo.fecha) : '';
  const extra = complemento ? `<span class="gastos-dia__extra">, ${_esc(complemento)}</span>` : '';
  return `
    <section class="gastos-dia" aria-label="${_esc(label)}, total ${_esc(totalTxt)}">
      <div class="gastos-dia__header" aria-hidden="true">
        <span class="gastos-dia__label">${_esc(label)}${extra}</span>
        <span class="gastos-dia__total">${totalTxt}</span>
      </div>
      ${filas.map(g => _renderGastoItem(g, oculto, conCategoria, plegar)).join('')}${mas}
    </section>`;
}

/** "de hoy", "de ayer" o "del sábado", a partir del rótulo del día. */
function _delDia(label) {
  if (label === 'Hoy') return 'de hoy';
  if (label === 'Ayer') return 'de ayer';
  return `del ${label.split(' ')[0].toLowerCase()}`;
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
 * Label humano del encabezado de día (GAS.1b, ADR 039 D3): "Hoy", "Ayer"
 * o el día de la semana completo con su número, "Martes 10" (ADR 132 D3): la
 * lista es siempre la del mes del selector, así que el mes sobra. Formateador
 * cacheado (PERF.7a); UTC mediodía para evitar off-by-one en GMT-N (mismo
 * criterio que fechaLegible).
 *
 * @param {string} iso 'YYYY-MM-DD'
 * @returns {string}
 */
export function labelDiaGastos(iso) {
  const hoyIso = hoy();
  if (iso === hoyIso) return 'Hoy';
  if (iso === ayerIso()) return 'Ayer';

  const d   = new Date(`${iso}T12:00:00Z`);
  const txt = formateadorFecha('es-CO', { weekday: 'long', day: 'numeric', timeZone: 'UTC' })
    .format(d).replace(/[.,]/g, '').replace(/\s+/g, ' ').trim();
  return txt.charAt(0).toUpperCase() + txt.slice(1);
}

/**
 * Lo que acompaña al rótulo del día en el teléfono (GAS.10a, ADR 185 D1).
 * SIT.1a (ADR 202 D3): con "Hoy" y "Ayer", el día entero y su número
 * ("jueves 26"); con el nombre del día no lleva nada, porque "Martes 24" ya lo
 * dice y la lista es la del mes del selector.
 *
 * @param {string} iso 'YYYY-MM-DD'
 * @returns {string} '' si no hay complemento.
 */
export function complementoDiaGastos(iso) {
  if (iso !== hoy() && iso !== ayerIso()) return '';
  const d = new Date(`${iso}T12:00:00Z`);
  return formateadorFecha('es-CO', { weekday: 'long', day: 'numeric', timeZone: 'UTC' })
    .format(d).replace(/[.,]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
}

/**
 * Título y subtítulo de la fila de un gasto (ADR 132 D4). Lo que la persona
 * escribió (la descripción de antes de TX.9a o la nota) es lo que distingue
 * dos gastos de la misma categoría el mismo día, así que va arriba; debajo,
 * "Categoría · Cuenta". Sin texto propio, el título es la categoría y debajo
 * queda solo la cuenta (ADR 072 D2: la fila nunca esconde de dónde salió).
 * Un gasto viejo con descripción y nota pone la nota al final del subtítulo.
 *
 * SUS.2a (ADR 147 D5): sin texto propio, la subcategoría es el título
 * ("Helado", y debajo "Antojos · Nequi"); con texto propio, la subcategoría
 * acompaña a la categoría en el subtítulo.
 *
 * SIT.1a (ADR 202 D1): el teléfono no une los datos con puntos; lee
 * `clasificacion` (lo más específico que el título no dice: la subcategoría
 * bajo lo que la persona escribió, la categoría bajo la subcategoría, nada
 * bajo la categoría) y `cuenta` (la cuenta entera, para su logo, su nombre
 * corto y su tipo) en renglones propios. La nota no va en la fila. El
 * `subtitulo` unido sigue siendo el de escritorio.
 *
 * @param {import('../../core/state.js').Gasto} gasto
 * @param {ReadonlyArray<{ id: string, nombre: string }>} [cuentas]
 * @returns {{ titulo: string, subtitulo: string, clasificacion: string, cuenta: object|null }}
 *   textos planos, sin escapar.
 */
export function textosFilaGasto(gasto, cuentas = [], { conCategoria = true } = {}) {
  const categoria = gasto?.categoria ?? 'Otros';
  const laCuenta = gasto?.cuentaId ? cuentas.find(c => c.id === gasto.cuentaId) ?? null : null;
  const propios = [gasto?.descripcion, gasto?.nota].map(t => String(t ?? '').trim()).filter(Boolean);
  const sub = nombreSubcategoriaGasto(gasto);
  const titulo = propios[0] ?? sub ?? categoria;
  const subtitulo = [
    (propios.length || sub) && conCategoria ? categoria : null,
    propios.length ? sub : null,
    laCuenta?.nombre,
    ...propios.slice(1),
  ]
    .filter(Boolean)
    .join(' · ');
  // Lo que el título ya dice no se repite debajo ("Taxi" escrito sobre la
  // subcategoría Taxi lleva la categoría).
  const subDistinta = sub && sub.toLowerCase() !== titulo.toLowerCase() ? sub : null;
  const clasificacion = propios.length
    ? (subDistinta ?? (conCategoria ? categoria : ''))
    : (sub && conCategoria ? categoria : '');
  return { titulo, subtitulo, clasificacion, cuenta: laCuenta };
}

/**
 * Nombre de la subcategoría de un gasto, o null si no tiene una válida para
 * su categoría (ADR 147 D3).
 * @param {{ categoria?: string, subcategoriaId?: string|null }} gasto
 * @returns {string|null}
 */
export function nombreSubcategoriaGasto(gasto) {
  const sub = hijoPorId(SUBCATEGORIAS_GASTO, gasto?.subcategoriaId);
  return sub && sub.categorias.includes(gasto?.categoria) ? sub.nombre : null;
}

/**
 * Lo que va debajo de las categorías (SUS.2a, ADR 147 D3 a D5): un grupo
 * "¿En qué fue?" por cada categoría con subcategorías, con "Otra cosa" al
 * final, y la pregunta "¿Fue una necesidad o un deseo?" (GAS.5c, ADR 162
 * D2) cuando lo elegido depende del día (Taxi, Domicilio, Otros) y en las
 * categorías propias que todavía no lo dicen. Todo nace `hidden` **y** `disabled`: un `<fieldset
 * disabled>` saca sus radios de `FormData`, así que cambiar de categoría no
 * deja una subcategoría colgada de otra (mismo patrón que Metas, ADR 064).
 * `sincronizarDetalleCategoria` (index.js) deja a la vista el que toca.
 *
 * Lo comparten el formulario de escritorio (en línea) y el del teléfono
 * (su etapa "¿En qué fue?", GAS.5c), así los dos guardan los mismos campos.
 *
 * @returns {string}
 */
export function htmlDetalleCategoriaGasto() {
  // GAS.15e (ADR 193 D1): Necesidad y Deseo llevan su ícono (el teléfono lo
  // muestra; escritorio, no).
  const chip = (name, valor, etiqueta, simbolo = '') => `
          <label class="chip-cat">
            <input type="radio" name="${name}" class="chip-cat__radio" value="${_esc(valor)}" />
            ${simbolo ? `<svg class="icon chip-cat__icono" aria-hidden="true"><use href="#${simbolo}"/></svg>` : ''}<span class="chip-cat__label">${_esc(etiqueta)}</span>
          </label>`;
  const grupos = categoriasConHijos(SUBCATEGORIAS_GASTO).map((cat, i) => `
      <fieldset class="subcategoria-fieldset" data-sub-grupo="${_esc(cat)}" hidden disabled>
        <legend id="gasto-sub-l${i}">¿En qué fue? <span class="form-optional">Opcional</span></legend>
        <div class="chips-cat" role="radiogroup" aria-labelledby="gasto-sub-l${i}">${hijosDeCategoria(SUBCATEGORIAS_GASTO, cat).map(h => chip('subcategoriaId', h.id, h.nombre)).join('')}${chip('subcategoriaId', '', 'Otra cosa')}
        </div>
      </fieldset>`).join('');
  return `${grupos}
      <fieldset class="subcategoria-fieldset subcategoria-fieldset--caracter" data-caracter-grupo hidden disabled>
        <legend id="gasto-caracter-l">¿Fue una necesidad o un deseo?</legend>
        <div class="chips-cat chips-cat--2col" role="radiogroup" aria-labelledby="gasto-caracter-l">${chip('caracter', 'necesidad', 'Necesidad', 'i-check-circle')}${chip('caracter', 'gusto', 'Deseo', 'i-star')}
        </div>
        <p class="form-hint" data-caracter-ayuda>Depende del día: tu respuesta vale solo para este gasto.</p>
      </fieldset>`;
}

/**
 * La fila de un gasto (ADR 132 D4, ver `textosFilaGasto`). Desde GAS.1b la
 * fecha vive en el encabezado del grupo del día, no en el subtítulo.
 *
 * @param {import('../../core/state.js').Gasto} gasto
 * @param {boolean} oculto flag de privacidad ya leído por el caller (D9).
 */
/**
 * GAS.13f (ADR 188 D6): los gastos que dependen del momento, sin contestar y
 * que Finko ve repetirse (hormiga, ADR 186 D5). Se calcula una vez por lista.
 */
let _preguntan = { gastos: null, ids: new Set() };
function _preguntaCaracter(gasto) {
  if (_preguntan.gastos !== S.gastos) {
    const pers = S.categoriasPersonalizadas ?? [];
    const apr = aprendidosDe(S.config);
    const ids = new Set();
    for (const g of gastosHormiga(S.gastos ?? [])) {
      if (!g.caracter && caracterDeGasto(g, pers, apr) === 'depende') ids.add(g.id);
    }
    _preguntan = { gastos: S.gastos, ids };
  }
  return _preguntan.ids.has(gasto.id);
}

function _renderGastoItem(gasto, oculto, conCategoria = true, telefono = false) {
  const catKey = gasto.categoria ?? 'Otros';
  const textos = textosFilaGasto(gasto, Array.isArray(S.cuentas) ? S.cuentas : [], { conCategoria });
  const { titulo, subtitulo: detalle } = textos;
  const cat = _esc(titulo);
  const pregunta = _preguntaCaracter(gasto);
  const montoTxt  = oculto ? SALDO_MASCARA_CUENTA : f(gasto.monto);
  // SIT.1a (ADR 202 D1): en el teléfono, cada dato en su renglón y la cifra
  // arriba a la derecha (flota antes del título para que el título use todo
  // el ancho desde su segundo renglón). Escritorio sigue con su subtítulo.
  // SIT.2a (ADR 203 D2): en el teléfono la fila dice qué fue, cuánto y de
  // qué cuenta salió; la categoría la dice la ilustración y la subcategoría
  // vive en la factura (el lector la oye en el nombre del botón).
  const subtitulo = telefono
    ? (pregunta
      ? `<p class="list-item__subtitle fila__dato list-item__subtitle--pregunta">¿Necesidad o deseo?</p>`
      : htmlRenglonCuenta(textos.cuenta))
    : pregunta
      ? `<p class="list-item__subtitle list-item__subtitle--pregunta">¿Necesidad o deseo?</p>`
      : detalle ? `<p class="list-item__subtitle">${_esc(detalle)}</p>` : '';
  const cifra = telefono
    ? `<span class="fila__der" aria-hidden="true"><span class="fila__cifra">${montoTxt}</span>${icon('chevron-right', 'icon fila__chev')}</span>`
    : '';
  const meta = telefono ? '' : `
      <div class="list-item__meta">
        <p class="list-item__amount">${montoTxt}</p>
      </div>`;

  // TX.6/TX.7: un gasto nacido de un fijo o de un abono a deuda hereda el
  // ícono de su compromiso de origen (categoría de Agenda, o i-cuentas /
  // i-personales por tipo de deuda); solo sin origen aplica el de la
  // categoría del gasto (nativa o personalizada, TX.9b). ID.3: el glifo va
  // en la teja teñida del dominio.
  const simbolo = iconoPorOrigen(gasto, S.compromisos, S.categoriasPersonalizadas) ?? iconoDeCategoriaGasto(catKey, S.categoriasPersonalizadas);

  // ADR 098 D4: en móvil la fila entera abre la hoja de detalle y las tres
  // acciones viven ahí. En escritorio el botón no se ve. ADR 119 D2: la hoja
  // del gasto la arma `detalle.js` con sus datos, no la copia de la fila.
  return `
    <article class="list-item list-item--detalle${telefono ? ' list-item--fila' : ''}" data-id="${_esc(gasto.id)}">
      <button class="list-item__detalle" type="button" data-action="gasto-detalle"
              data-id="${_esc(gasto.id)}" aria-label="Ver detalle: ${cat}${telefono && textos.clasificacion ? `, ${_esc(textos.clasificacion)}` : ''}, ${montoTxt}"></button>
      <div class="list-item__icon" aria-hidden="true">${tejaCategoria(simbolo, 'gastos', tonoDeCategoria(catKey))}</div>
      <div class="list-item__body${telefono ? ' fila__texto' : ''}">
        ${cifra}<p class="list-item__title${telefono ? ' fila__nombre' : ''}">${cat}</p>
        ${subtitulo}
      </div>${meta}
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
 * - Mes corriente: "Anota tu primera compra", con Tino y, en el teléfono,
 *   el halo que late en el botón central; sin botón propio (GAS.3, ADR 156
 *   D2; GAS.5a, ADR 161 D1). La pose con libreta la dibuja Esteban: hasta
 *   que llegue su SVG, Tino explica.
 * - Cualquier otro mes: el CTA de registrar engañaba, porque el formulario
 *   abre con la fecha de HOY y el gasto caía en el mes corriente,
 *   desapareciendo de la pantalla que lo pidió. El vacío dice de qué mes
 *   habla y ofrece volver al mes donde el gasto sí va a caer (hallazgo H8).
 */
function _renderEmptyState() {
  const { anio: _viewYear, mes: _viewMonth } = _mesVisible();
  const hoyDate      = new Date();
  const mesCorriente = MONTHS[hoyDate.getMonth()].toLowerCase();

  if ((_viewYear !== hoyDate.getFullYear() || _viewMonth !== hoyDate.getMonth()) && _enTelefono()) {
    return _renderMesSinGastos(_viewYear, _viewMonth, hoyDate);
  }

  if (_viewYear !== hoyDate.getFullYear() || _viewMonth !== hoyDate.getMonth()) {
    return `
    <div class="gastos-empty">
      <span class="gastos-empty__teja gastos-empty__teja--neutra" aria-hidden="true"><svg class="icon" aria-hidden="true"><use href="#i-search"/></svg></span>
      <p class="gastos-empty__title">No registraste gastos en ${MONTHS[_viewMonth].toLowerCase()}</p>
      <p class="gastos-empty__desc">Cualquier gasto que anotes hoy entra en ${mesCorriente}, el mes que ves al abrir la sección.</p>
      <button type="button" class="btn btn-secondary" data-action="gastos-mes-actual">Volver a ${mesCorriente}</button>
    </div>`;
  }

  // GAS.8c (ADR 182 D3): en el teléfono el mes corriente sin gastos es la
  // tarjeta de Tino con "Registrar", las cuatro tejas y la pista de Por pagar.
  if (_enTelefono()) return _renderDiaNuevo();

  // GAS.3 (ADR 156 D2): sin botón propio. Registrar es del botón central de
  // la barra (ADR 148), y el halo late en él; en escritorio, del primario
  // del encabezado. Cada ancho lee su frase (CSS). GAS.5a (ADR 161 D1):
  // la flecha punteada se fue (era ruido).
  return `
    <div class="gastos-empty gastos-empty--primera">
      ${htmlTinoSol('explica', { tamano: 136, clase: 'gastos-empty__tino' })}
      <p class="gastos-empty__title">Anota tu primera compra</p>
      <p class="gastos-empty__desc gastos-empty__desc--movil">Toca el botón <b class="gastos-empty__mas">+</b> de abajo y regístrala en tres pasos.</p>
      <p class="gastos-empty__desc gastos-empty__desc--escritorio">Usa «Registrar gasto», arriba, y verás aquí a dónde se va tu dinero.</p>
      <span class="gastos-empty__guia gastos-empty__guia--halo" aria-hidden="true"></span>
    </div>`;
}

/**
 * Un mes pasado sin gastos en el teléfono (ADR 179 D7): lo dice, explica que
 * un gasto cae en el mes de su fecha y ofrece volver al mes corriente o ver
 * el siguiente. Si fue el primer mes en Finko, lo dice también.
 */
function _renderMesSinGastos(anio, mes, hoyDate) {
  const corriente = MONTHS[hoyDate.getMonth()].toLowerCase();
  const primero = primerMesFinko(S, hoyDate);
  const esPrimero = primero.anio === anio && primero.mes === mes;
  const sig = new Date(anio, mes + 1, 1);
  const sigEsCorriente = sig.getFullYear() === hoyDate.getFullYear() && sig.getMonth() === hoyDate.getMonth();
  const verSiguiente = sigEsCorriente ? '' : `
      <button type="button" class="btn btn-ghost mes-vacio__siguiente" data-action="gastos-mes-siguiente">Ver ${MONTHS[sig.getMonth()].toLowerCase()}</button>`;
  return `
    <div class="pestana-vacia mes-vacio">
      <span class="mes-vacio__teja" aria-hidden="true">${icon('agenda')}</span>
      <p class="pestana-vacia__titulo">No registraste gastos en ${MONTHS[mes].toLowerCase()}</p>
      <p class="pestana-vacia__texto">${esPrimero ? 'Fue tu primer mes en Finko. ' : ''}Cuando registras un gasto, aparece en el mes de su fecha.</p>
      <button type="button" class="btn btn-primary mes-vacio__volver" data-action="gastos-mes-actual">Volver a ${corriente}</button>${verSiguiente}
    </div>`;
}

/** Las cuatro tejas de "¿En qué gastaste hoy?": etiqueta, categoría e ícono. */
const _TEJAS_HOY = [
  ['Mercado', 'Mercado'],
  ['Restaurantes', 'Restaurantes'],
  ['Bus, taxi y apps', 'Bus, taxi y apps'],
  ['Café', 'Café'],
];

/**
 * El mes corriente sin gastos en el teléfono (GAS.8c, ADR 182 D3; cambia el
 * ADR 179 D7): Tino explica qué se verá aquí y lleva a registrar; debajo,
 * "¿En qué gastaste hoy?" con cuatro tejas que abren el gasto con su
 * categoría y, si todavía no hay nada que se pague cada mes, la pista de Por
 * pagar. Sin ningún gasto en Finko es "el primero"; con historia, el del mes.
 *
 * @returns {string}
 */
function _renderDiaNuevo() {
  const primero = _sinInternas(S.gastos ?? []).length === 0;
  const tejas = _TEJAS_HOY.map(([etiqueta, categoria]) => `
        <li>
          <button type="button" class="dia-nuevo__teja" data-action="nuevo-gasto" data-categoria="${_esc(categoria)}"
                  aria-label="Registrar un gasto en ${_esc(categoria)}">
            ${tejaCategoria(iconoDeCategoriaGasto(categoria), 'gastos', tonoDeCategoria(categoria))}
            <span>${etiqueta}</span>
          </button>
        </li>`).join('');
  const sinFijos = !(S.compromisos ?? []).some(c => c.activo !== false && c.tipo === 'fijo');
  // GAS.10a (ADR 185 D2): la pista va punteada, con el ícono de lo que se
  // repite, y dice el verbo.
  const pista = !sinFijos ? '' : `
      <a class="dia-nuevo__pista dia-nuevo__pista--punteada" href="#fijos">
        ${icon('recurring', 'icon dia-nuevo__pista-ciclo')}
        <span class="dia-nuevo__pista-texto fk-balance">¿Pagas algo cada mes? <strong class="fk-unidad">Anótalo en Fijos</strong></span>
        ${icon('chevron-right')}
      </a>`;
  // GAS.10a (ADR 185 D2): Tino al lado de la frase y sin botón: registrar
  // es el botón central y las cuatro tejas de abajo. SIT.1a (ADR 202 D4):
  // con historial, la tarjeta del mes ya dice "Aún no anotas gastos este
  // mes."; la de Tino solo queda la primera vez, cuando no hay tarjeta.
  const tarjeta = !primero ? '' : `
      <div class="dia-nuevo__tarjeta dia-nuevo__tarjeta--fila">
        ${htmlTinoSol('explica', { tamano: 76, clase: 'dia-nuevo__tino tino-sol--libre' })}
        <div class="dia-nuevo__textos">
          <p class="dia-nuevo__titulo fk-balance">Aquí verás en qué se va tu dinero</p>
          <p class="dia-nuevo__texto">Cada gasto que registres aparece aquí, ordenado por día.</p>
        </div>
      </div>`;
  return `
    <div class="dia-nuevo">${tarjeta}
      <p class="dia-nuevo__pregunta" id="dia-nuevo-q">¿En qué gastaste hoy?</p>
      <ul class="dia-nuevo__tejas" aria-labelledby="dia-nuevo-q">${tejas}
      </ul>${pista}
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
 * BUG-038: el pago de un fijo ("Gastos fijos") o el abono a una deuda
 * ("Deudas") llega con `categoriaFija`. Esas categorías no son chips del
 * catálogo, así que sin ella el formulario no tenía ninguna marcada y no
 * guardaba. Con ella la categoría se muestra sola y marcada (no se cambia: es
 * la que lo vincula a su compromiso) y el origen no ofrece tarjetas, porque
 * elegir una lo convertiría en una compra con la tarjeta.
 *
 * @param {{ sugerencias?: boolean, categoriaFija?: string|null }} [opciones]
 *   `sugerencias: false` omite los chips de gastos frecuentes (TX.12): el
 *   caller la pasa en modo edición.
 * @returns {string}
 */
export function renderFormGasto({ sugerencias = true, categoriaFija = null } = {}) {
  const cuentas = (S.cuentas ?? []).filter(c => c.activa !== false);

  // Si no hay cuentas activas, mostramos un estado vacío en lugar del form.
  // El gasto no puede existir sin cuenta de origen.
  if (cuentas.length === 0) {
    return `
      <div class="form-empty">
        ${htmlTinoSol('pensando', { tamano: 104, clase: 'form-empty__tino' })}
        <p class="form-empty__title">Primero necesitas una cuenta</p>
        <p class="form-empty__desc">Un gasto necesita una cuenta de donde salga el dinero. Créala aquí y sigues sin perder el hilo.</p>
        <a class="btn btn-primary btn-lg" href="#tesoreria" data-action="ir-a-crear-cuenta">${icon('cuentas')} Crear una cuenta</a>
      </div>`;
  }

  // MC.16b: las tarjetas operables las pasa el caller, el helper nunca lee
  // S.compromisos (ADR 051 D4). Leer el singleton de otro dominio sí es la
  // norma (ADN 10 prohíbe importar el módulo, no leer S).
  const tarjetas    = categoriaFija ? [] : tarjetasDeCredito(S.compromisos);
  const labelOrigen = tarjetas.length > 0 ? '¿Con qué pagaste?' : '¿De qué cuenta sale?';

  // FORM.1a (ADR 042 D2/D3): la categoría se elige con chips de ícono, no
  // con un desplegable. Radios reales name="categoria" dentro del label:
  // el contrato FormData y validarGasto() no cambian. Catálogo completo
  // visible (nativas + personalizadas TX.9b) y "Otra categoría" al final
  // revela los campos de categoría nueva, igual que antes.
  const personalizadas = S.categoriasPersonalizadas ?? [];
  const chipCat = (valor, etiqueta, simbolo, checked = false) => `
        <label class="chip-cat">
          <input type="radio" name="categoria" class="chip-cat__radio" value="${_esc(valor)}"${checked ? ' checked' : ''} />
          <svg class="icon" aria-hidden="true"><use href="#${_esc(simbolo)}"/></svg>
          <span class="chip-cat__label">${_esc(etiqueta)}</span>
        </label>`;
  const chipsCategoria = categoriaFija
    ? chipCat(categoriaFija, categoriaFija, iconoDeCategoriaGasto(categoriaFija, personalizadas), true)
    : [
      ...CATEGORIAS_GASTO_USUARIO.map(c => chipCat(c, c, iconoDeCategoriaGasto(c, personalizadas))),
      ...personalizadas.map(c => chipCat(c.nombre, c.nombre, iconoDeCategoriaGasto(c.nombre, personalizadas))),
      chipCat(CATEGORIA_NUEVA_VALUE, 'Otra categoría', 'i-plus'),
    ].join('');
  const hintCategoriaFija = categoriaFija
    ? '<p class="form-hint form-hint--muted">Es el pago de un compromiso de Por pagar: su categoría no cambia.</p>'
    : '';

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
        <label class="monto-hero__label" for="gasto-monto">¿Cuánto gastaste?</label>
        <div class="monto-hero__box">
          <span class="monto-hero__prefijo" aria-hidden="true">$</span>
          <input id="gasto-monto" name="monto" class="input input--big-amount" type="text" placeholder="0" required aria-required="true"
                 autocomplete="off" inputmode="numeric" data-miles />
        </div>
      </div>
      ${sugerencias ? _renderChipsFrecuentes() : ''}
      <div class="form-group">
        <span class="label" id="gasto-categoria-label">¿En qué?</span>
        <div class="chips-cat" role="radiogroup" aria-labelledby="gasto-categoria-label">
          ${chipsCategoria}
        </div>
        ${hintCategoriaFija}
      </div>
      <div class="form-group" id="categoria-nueva-fields" hidden>
        <label for="categoria-nueva-nombre" class="label">Nombre de tu categoría</label>
        <input id="categoria-nueva-nombre" name="categoriaNuevaNombre" class="input" type="text"
               placeholder="Ej. Gimnasio" autocomplete="off" />
        ${renderIconoPicker(ICONOS_CATEGORIA_GASTO_PROPIA, { id: 'categoria-nueva-icono', nombreCampo: 'categoriaNuevaIcono' })}
      </div>
      ${categoriaFija ? '' : htmlDetalleCategoriaGasto()}
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
      <div class="form-group form-group--checkbox" id="grupo-gasto-avance" hidden>
        <label class="checkbox-row">
          <input type="checkbox" name="avanceTC" value="1" />
          <span>Lo pagué con un avance</span>
        </label>
        <p class="form-hint form-hint--info" id="gasto-avance-nudge" hidden>
          Un avance cobra intereses desde el mismo día: no tiene los días sin intereses de una compra, y casi siempre suma un cobro fijo. Si el dinero llegó a tu cuenta o lo sacaste en efectivo, regístralo en la tarjeta, con Sacar un avance.
        </p>
      </div>
      <p class="form-hint form-hint--info" id="gasto-sobrecupo-nudge" aria-live="polite" hidden></p>
      <div class="form-group">
        <span class="label" id="gasto-fecha-label">¿Cuándo?</span>
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
        <label for="gasto-nota" class="label">Nota <span class="form-optional">Opcional</span></label>
        <input id="gasto-nota" name="nota" class="input" type="text"
               placeholder="Ej.: almuerzo con el equipo" autocomplete="off" />
      </div>
      <div class="modal__footer modal__footer--principal">
        <button type="button" class="btn btn-ghost" data-action="modal-close">Cancelar</button>
        <button type="submit" class="btn btn-primary">${icon('check-circle')} Guardar gasto</button>
      </div>
    </form>`;
}


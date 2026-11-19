/**
 * bloque-gastos.js - el encabezado del bloque Gastos en móvil.
 *
 * Ficha 01 de la auditoría móvil (ADR 069): en la barra inferior "Gastos"
 * deja de nombrar una sección y pasa a nombrar un bloque con tres lentes.
 * Ficha 07 (ADR 069 D8) le da su anatomía: un nombre, **un solo reloj** y las
 * tres pestañas. Las tres lentes siguen siendo secciones con hash propio; el
 * bloque es una capa de navegación, no un contenedor nuevo de estado, así que
 * no hay hash nuevo en router.js.
 *
 * El encabezado se inyecta en las tres secciones (`#tabs-{hash}`) con el mismo
 * patrón con el que proposito.js inyecta su banner. Quien marca la pestaña
 * activa es markActiveNav() (shell.js): las pestañas son navegación y el nav
 * ya sabe leer `data-section`.
 *
 * Solo se ve bajo 1024px (responsive.css): en escritorio el sidebar ya lista
 * las tres lentes en filas propias y cada una conserva su hero con su
 * selector de mes.
 */

import { S, EventBus } from '../core/state.js';
import { save } from '../core/storage.js';
import { hoy, f } from '../infra/utils.js';
import { registrarRender, renderAll, SALDO_MASCARA_CUENTA } from '../infra/render.js';
import { registrarAccion } from './actions.js';
import { abrirModal, cerrarModal } from './modales.js';
import { mesBloque, nombreMes } from '../infra/mes-bloque.js';
import { mesTopeGastos, navegarMesGastos } from '../dominio/gastos/view.js';
import { totalesDiaADiaDelAnio } from '../dominio/gastos/logic.js';
import { vencidosSinPagar } from '../dominio/compromisos/logic.js';
import { alertasLimites } from '../dominio/presupuesto/logic.js';
import { montosOcultos, alternarMontosOcultos } from '../infra/privacidad.js';

/**
 * Las tres lentes del bloque, en el orden en que se leen. La primera es la
 * portada: el bloque aterriza en ella porque domina a sus hermanas (R81).
 *
 * "Día a día" no es un nombre nuevo: sale del propio código. El filtro de
 * categorías internas existe para enfocarse en "lo que el usuario sí decide
 * gastar día a día", así que la etiqueta nombra con exactitud lo que la lente
 * muestra y, por contraste, explica qué no muestra.
 */
export const LENTES_BLOQUE_GASTOS = [
  { hash: 'gast',        etiqueta: 'Día a día' },
  // GAS.7a (ADR 179 D1): "Por pagar" se parte en las dos cosas que la persona
  // ya distingue, lo que paga cada mes y lo que debe. Las dos pestañas son
  // lentes de la misma sección (`sec-compromisos`), con su hash.
  { hash: 'fijos',       etiqueta: 'Fijos' },
  { hash: 'deudas',      etiqueta: 'Deudas' },
  { hash: 'presupuesto', etiqueta: 'Límites' },
];

/** Dónde se inyecta el encabezado: una vez por sección (Fijos y Deudas comparten la suya). */
const SLOTS_BLOQUE_GASTOS = ['gast', 'compromisos', 'presupuesto'];

// ── RENDER ───────────────────────────────────────────────────────

/**
 * Devuelve el HTML del encabezado del bloque. Pura: no lee S, no toca el DOM.
 *
 * Las etiquetas son constantes del módulo, no datos del usuario: no pasan por
 * esc(). Las pastillas nacen vacías y `hidden`; su estado lo escribe
 * sincronizarBloqueGastos().
 *
 * GAS.4a (ADR 157 D1): una sola fila, sin frase debajo y sin el primario
 * espejo ("+ Gasto"): registrar es el botón central de la barra de abajo, que
 * ya dispara el alta de la lente (ADR 148). El primario original sigue en el
 * encabezado de cada sección, oculto en el teléfono, porque es el que leen
 * ese botón y la barra superior de escritorio.
 *
 * GAS.7b (ADR 179 D2): la fila queda con el nombre y la lupa (ADR 098 D5,
 * busca en todo el historial). El mes y el ojo bajan a la tarjeta de cada
 * pestaña: el mes es la palabra de su rótulo y el ojo va junto a la cifra
 * que tapa.
 *
 * @returns {string} HTML listo para inyectar.
 */
export function htmlBloqueGastos() {
  const tabs = LENTES_BLOQUE_GASTOS.map(({ hash, etiqueta }) => `
        <a class="bloque-tabs__tab" href="#${hash}" data-section="${hash}" aria-label="${etiqueta}">
          <span class="bloque-tabs__label">${etiqueta}</span>
          <span class="badge bloque-tabs__badge" aria-hidden="true" hidden></span>
        </a>`).join('');

  return `
    <div class="bloque-gastos">
      <div class="bloque-gastos__cabecera">
        <p class="bloque-gastos__titulo">Gastos</p>
        <div class="bloque-gastos__herramientas">
          <button class="bloque-gastos__ojo bloque-gastos__lupa" type="button"
                  data-action="bloque-buscar" aria-label="Buscar en tus movimientos">
            <svg class="icon" aria-hidden="true"><use href="#i-search"/></svg>
          </button>
        </div>
      </div>
      <nav class="bloque-tabs" aria-label="Lentes de Gastos">${tabs}</nav>
    </div>`;
}

/**
 * El estado que cada pestaña muestra encima. Puro respecto al DOM: recibe el
 * estado y la fecha, así que se testea sin app.
 *
 * `vencidos` usa la misma llamada que el bloque "Atención hoy" de Inicio
 * (compromisos/views/dashboard.js), sin config propia: si los dos contaran
 * distinto, la barra diría un número y el inicio otro. Desde GAS.7a (ADR 179
 * D1) se parte por tipo: `vencidosFijos` va en la pestaña Fijos y
 * `vencidasDeudas` en la de Deudas; `vencidos` sigue siendo la suma.
 *
 * `excedidos` se cuenta, pero la pestaña "Límites" muestra un punto y no el
 * número (ficha 07): el dato importante es que pasó algo, no cuántos.
 *
 * @param {typeof S} [state=S]
 * @param {string} [hoyISO=hoy()] YYYY-MM-DD
 * @returns {{vencidos:number, vencidosFijos:number, vencidasDeudas:number, excedidos:number}}
 */
export function estadoLentesGastos(state = S, hoyISO = hoy()) {
  const anio = Number(hoyISO.slice(0, 4));
  const mes  = Number(hoyISO.slice(5, 7));

  const lista = vencidosSinPagar(state.compromisos ?? [], state.gastos ?? [], hoyISO);
  const tipoDe = new Map((state.compromisos ?? []).map(c => [c.id, c.tipo]));
  const vencidosFijos = lista.filter(v => tipoDe.get(v.id) === 'fijo').length;
  const excedidos = alertasLimites(state.presupuestos ?? [], state.gastos ?? [], anio, mes)
    .filter(a => a.estado === 'excedido').length;

  return {
    vencidos: lista.length,
    vencidosFijos,
    vencidasDeudas: lista.length - vencidosFijos,
    excedidos,
  };
}

/**
 * OJO.1 (ADR 166): de qué sección es un ojo. En el bloque Gastos, de la lente
 * de su encabezado (`#tabs-gast`, `#tabs-compromisos`, `#tabs-presupuesto`);
 * en el encabezado de otra sección, de esa sección (`#sec-movimientos`...).
 * Sin ninguna de las dos, la sección a la vista.
 * @param {Element | null | undefined} el
 * @returns {string | undefined}
 */
export function claveDelOjo(el) {
  const lente = el?.closest?.('[id^="tabs-"]')?.id.slice('tabs-'.length);
  if (lente) return lente;
  return el?.closest?.('[id^="sec-"]')?.id.slice('sec-'.length) || undefined;
}

/**
 * Escribe en las copias del encabezado lo que cambia con el estado: el ojo
 * de cada tarjeta y de cada encabezado (GAS.7b: el de la tarjeta lo pinta
 * cada dominio con `htmlOjoTarjeta`), y los conteos de las pestañas.
 * No-op si el encabezado no está en el DOM.
 *
 * @param {{vencidosFijos:number, vencidasDeudas:number, excedidos:number}} [estado]
 */
export function sincronizarBloqueGastos(estado = estadoLentesGastos()) {
  // OJO.1 (ADR 166): cada ojo dice el de su lente o su sección (los
  // encabezados de las demás secciones usan esta misma acción, ADR 106 D3).
  document.querySelectorAll('[data-action="bloque-saldo-visibilidad"]').forEach((btn) => {
    const oculto = montosOcultos(claveDelOjo(btn));
    btn.setAttribute('aria-pressed', String(oculto));
    btn.setAttribute('aria-label', oculto ? 'Mostrar tus saldos' : 'Ocultar tus saldos');
    const use = btn.querySelector('use');
    if (use) use.setAttribute('href', `#i-eye${oculto ? '-off' : ''}`);
  });

  pintarEstadoLente('fijos', estado.vencidosFijos ?? 0,
    'Fijos', n => `${n} ${n === 1 ? 'vencido' : 'vencidos'}`);
  pintarEstadoLente('deudas', estado.vencidasDeudas ?? 0,
    'Deudas', n => `${n} ${n === 1 ? 'cuota vencida' : 'cuotas vencidas'}`);
  // Punto y no número (ficha 07): en Límites lo que importa es que pasó algo.
  pintarEstadoLente('presupuesto', estado.excedidos,
    'Límites', n => `${n === 1 ? 'un tope excedido' : 'topes excedidos'}`, true);
}

/**
 * La pastilla es decorativa (`aria-hidden`): un número suelto leído en voz
 * alta no dice de qué. Lo que oye el lector es el nombre accesible de la
 * pestaña, que se reescribe con el conteo. La barra de Ahorro la usa para el
 * punto de Reservas (ADR 104 D3): es la misma barra.
 *
 * @param {string} hash
 * @param {number} n
 * @param {string} etiqueta
 * @param {(n:number) => string} frase
 * @param {boolean} [comoPunto=false] Muestra un punto en vez del número.
 */
export function pintarEstadoLente(hash, n, etiqueta, frase, comoPunto = false) {
  document.querySelectorAll(`.bloque-tabs__tab[data-section="${hash}"]`).forEach((tab) => {
    const badge = tab.querySelector('.bloque-tabs__badge');
    if (badge) {
      badge.textContent = n > 0 && !comoPunto ? String(n) : '';
      badge.classList.toggle('bloque-tabs__badge--punto', comoPunto);
      badge.hidden = n === 0;
    }
    tab.setAttribute('aria-label', n > 0 ? `${etiqueta}, ${frase(n)}` : etiqueta);
  });
}

// ── LA HOJA "ELIGE EL MES" (GAS.7b, ADR 179 D2) ──────────────────

/**
 * El primer mes de la persona en Finko: el del onboarding
 * (`config.primerUsoISO`) o el del dato más viejo, si es anterior (un
 * respaldo importado trae historia de antes): un gasto, o el alta de una
 * cuenta o de un fijo o una deuda. Sin ninguno, el mes de hoy.
 *
 * @param {typeof S} [state=S]
 * @param {Date} [hoyDate]
 * @returns {{ anio: number, mes: number }} mes 0-11.
 */
export function primerMesFinko(state = S, hoyDate = new Date()) {
  let iso = typeof state.config?.primerUsoISO === 'string' ? state.config.primerUsoISO : null;
  const fechas = [
    ...(state.gastos ?? []).map(g => g.fecha),
    ...(state.cuentas ?? []).map(c => c.fechaCreacion),
    ...(state.compromisos ?? []).map(c => c.fechaCreacion),
  ];
  for (const f of fechas) {
    if (typeof f === 'string' && /^\d{4}-\d{2}/.test(f) && (!iso || f < iso)) iso = f;
  }
  if (!iso) return { anio: hoyDate.getFullYear(), mes: hoyDate.getMonth() };
  return { anio: Number(iso.slice(0, 4)), mes: Number(iso.slice(5, 7)) - 1 };
}

/**
 * Las filas de la hoja para `anio`: del mes más reciente navegable al
 * primero de Finko, con el total del día a día, su barra contra el mes más
 * alto del año y sus marcas. Pura: recibe el estado y los límites.
 *
 * @param {number} anio
 * @param {{ gastos?: object[], tope: {anio:number, mes:number},
 *           primero: {anio:number, mes:number}, visto: {anio:number, mes:number},
 *           hoyDate?: Date }} datos
 * @returns {Array<{ mes:number, total:number, pct:number, esActual:boolean,
 *                   esPrimero:boolean, esVisto:boolean }>}
 */
export function filasHojaMeses(anio, { gastos = [], tope, primero, visto, hoyDate = new Date() }) {
  if (anio > tope.anio || anio < primero.anio) return [];
  const totales = totalesDiaADiaDelAnio(gastos, anio);
  const desde = anio === tope.anio ? tope.mes : 11;
  const hasta = anio === primero.anio ? primero.mes : 0;
  const max = Math.max(0, ...totales.slice(hasta, desde + 1));
  const filas = [];
  for (let m = desde; m >= hasta; m--) {
    filas.push({
      mes: m,
      total: totales[m],
      pct: max > 0 ? Math.round((totales[m] / max) * 100) : 0,
      esActual: anio === hoyDate.getFullYear() && m === hoyDate.getMonth(),
      esPrimero: anio === primero.anio && m === primero.mes,
      esVisto: anio === visto.anio && m === visto.mes,
    });
  }
  return filas;
}

/**
 * El cuerpo de la hoja: el año con sus flechas, la frase y una fila por mes.
 * Los montos respetan el ojo de Día a día (es su cifra); con el ojo puesto
 * tampoco van las barras, que dirían la proporción.
 *
 * @param {number} anio
 * @param {typeof S} [state=S]
 * @param {Date} [hoyDate]
 * @returns {string} HTML.
 */
export function htmlHojaMeses(anio, state = S, hoyDate = new Date()) {
  const tope = mesTopeGastos();
  const primero = primerMesFinko(state, hoyDate);
  const oculto = montosOcultos('gast');
  const filas = filasHojaMeses(anio, { gastos: state.gastos ?? [], tope, primero, visto: mesBloque(), hoyDate });

  const filasHtml = filas.map((r) => {
    const nombre = nombreMes(r.mes);
    const total = r.total > 0
      ? `<span class="mes-hoja__total">${oculto ? SALDO_MASCARA_CUENTA : f(r.total)}</span>`
      : '<span class="mes-hoja__total mes-hoja__total--vacio">Sin gastos</span>';
    const barra = r.total > 0 && !oculto
      ? `<span class="mes-hoja__barra" aria-hidden="true"><span class="mes-hoja__barra-fill" style="--mes-pct: ${r.pct}%"></span></span>`
      : '';
    return `
        <li>
          <button type="button" class="mes-hoja__fila${r.esVisto ? ' mes-hoja__fila--visto' : ''}"
                  data-action="bloque-ir-mes" data-anio="${anio}" data-mes="${r.mes}"
                  aria-current="${r.esVisto ? 'true' : 'false'}">
            <span class="mes-hoja__mes">
              <span class="mes-hoja__nombre">${nombre}${r.esActual ? ' <span class="mes-hoja__tag">Este mes</span>' : ''}</span>
              ${r.esPrimero ? '<span class="mes-hoja__sub">Tu primer mes en Finko</span>' : ''}
              ${barra}
            </span>
            ${total}
            ${r.esVisto ? '<svg class="icon mes-hoja__visto" aria-hidden="true"><use href="#i-check"/></svg>' : '<span class="mes-hoja__visto" aria-hidden="true"></span>'}
          </button>
        </li>`;
  }).join('');

  const antes = anio > primero.anio;
  const despues = anio < tope.anio;
  return `
      <div class="mes-hoja__anio">
        <button type="button" class="mes-hoja__flecha" data-action="bloque-mes-hoja-anio" data-delta="-1"
                aria-label="Año anterior"${antes ? '' : ' disabled'}>
          <svg class="icon mes-hoja__flecha--atras" aria-hidden="true"><use href="#i-chevron-right"/></svg>
        </button>
        <span class="mes-hoja__anio-num" aria-live="polite">${anio}</span>
        <button type="button" class="mes-hoja__flecha" data-action="bloque-mes-hoja-anio" data-delta="1"
                aria-label="Año siguiente"${despues ? '' : ' disabled'}>
          <svg class="icon" aria-hidden="true"><use href="#i-chevron-right"/></svg>
        </button>
      </div>
      <p class="mes-hoja__ayuda">Lo que gastaste cada mes, sin contar fijos ni deudas</p>
      <ul class="mes-hoja__lista" aria-label="Meses de ${anio}">${filasHtml}</ul>`;
}

/** Año que muestra la hoja abierta. */
let _anioHoja = null;

function _pintarHojaMeses() {
  const cuerpo = document.getElementById('elegir-mes-body');
  if (cuerpo) cuerpo.innerHTML = htmlHojaMeses(_anioHoja);
}

/**
 * Lleva el bloque al mes elegido. Pasa por `navegarMesGastos` para conservar
 * el reset del filtro de categoría de Día a día.
 *
 * @param {number} anio
 * @param {number} mes 0-11
 */
export function irAMesDelBloque(anio, mes) {
  const actual = mesBloque();
  const delta = (anio - actual.anio) * 12 + (mes - actual.mes);
  if (delta !== 0) navegarMesGastos(delta);
}

/**
 * Va a Movimientos sin filtros y pone el foco en la búsqueda. La lupa del
 * bloque y la de Inicio comparten esta salida (ADR 098 D5). El foco espera a
 * que Movimientos pinte su barra: `movimientos:ver` la repinta en un timeout.
 */
export function irABuscar() {
  EventBus.emit('movimientos:ver', {});
  setTimeout(() => document.getElementById('movimientos-buscar')?.focus(), 60);
}

// ── INIT ─────────────────────────────────────────────────────────

/**
 * Inyecta el encabezado en las tres lentes, registra las acciones del reloj y
 * del ojo, y engancha su estado al render global. Se llama una sola vez desde
 * bootstrap.js.
 */
export function initBloqueGastos() {
  for (const hash of SLOTS_BLOQUE_GASTOS) {
    const slot = document.getElementById(`tabs-${hash}`);
    if (slot) slot.innerHTML = htmlBloqueGastos();
  }

  // La lupa busca en todo el historial: Movimientos con los filtros limpios y
  // el foco en el campo de búsqueda. Va por EventBus (ADN 10), igual que la
  // salida de un tope de Límites.
  registrarAccion('bloque-buscar', irABuscar);

  // El reloj manda sobre las tres lentes (G4), así que repinta todo: cada
  // dominio decide con `renderSmart` si le toca. Delega en navegarMesGastos
  // para conservar el reset del filtro de categoría, que es propio de la
  // portada y no del bloque.
  registrarAccion('bloque-mes-prev', () => { navegarMesGastos(-1); renderAll(); });
  registrarAccion('bloque-mes-next', () => { navegarMesGastos(1);  renderAll(); });

  // GAS.7b (ADR 179 D2): el mes del rótulo de cada tarjeta abre la hoja.
  registrarAccion('bloque-elegir-mes', () => {
    const overlay = document.getElementById('modal-elegir-mes');
    if (!overlay) return;
    _anioHoja = mesBloque().anio;
    _pintarHojaMeses();
    abrirModal(overlay);
  });
  registrarAccion('bloque-mes-hoja-anio', (el) => {
    const delta = Number(el?.dataset?.delta) || 0;
    const tope = mesTopeGastos();
    const primero = primerMesFinko();
    _anioHoja = Math.min(tope.anio, Math.max(primero.anio, (_anioHoja ?? mesBloque().anio) + delta));
    _pintarHojaMeses();
  });
  registrarAccion('bloque-ir-mes', (el) => {
    const anio = Number(el?.dataset?.anio);
    const mes = Number(el?.dataset?.mes);
    const overlay = document.getElementById('modal-elegir-mes');
    if (overlay) cerrarModal(overlay);
    if (!Number.isInteger(anio) || !Number.isInteger(mes)) return;
    irAMesDelBloque(anio, mes);
    renderAll();
  });

  // OJO.1 (ADR 166): el ojo de cada lente tapa solo esa lente (Día a día,
  // Por pagar o Límites); la lente es la del encabezado donde se tocó.
  registrarAccion('bloque-saldo-visibilidad', (el) => {
    alternarMontosOcultos(claveDelOjo(el));
    save();
    renderAll();
  });

  sincronizarBloqueGastos();
  registrarRender(() => sincronizarBloqueGastos());
}

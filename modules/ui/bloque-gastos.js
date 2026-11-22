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
import { mesBloque, primerMesFinko, rangoMesBloque } from '../infra/mes-bloque.js';
import {
  RESUMEN_DE_LA_LENTE, finDeVentana, moverVentana, mesesDeLaVentana,
  htmlGraficaResumen, htmlCuerpoDiaADia, htmlCuerpoLimites, htmlCuerpoFijos, htmlCuerpoDeudas, familiaDeFijo,
} from './resumen-apartado.js';
import {
  filasResumenDelMes, tejaCompromiso, tejaDeudaInventario, tituloDeuda, saldoDeudaAlCierre,
} from '../dominio/compromisos/view.js';

export { primerMesFinko };
import { mesTopeGastos, navegarMesGastos } from '../dominio/gastos/view.js';
import { totalesDiaADiaDelAnio, esDelDiaADia, repartoPorCategoria } from '../dominio/gastos/logic.js';
import { CATEGORIA_AGENDA_ICONO, CATEGORIA_DEUDA_ICONO, iconoDeCategoriaGasto, tonoDeCategoria } from '../core/constants.js';
import { vencidosSinPagar, totalesPagadosDelAnio, esDeuda, compromisosActivos, calcularCompromisoMensual } from '../dominio/compromisos/logic.js';
import { alertasLimites, totalesLimitesDelAnio, presupuestosActivos, resumenLimitesDelMes } from '../dominio/presupuesto/logic.js';
import { montosOcultos, ojoDePorPagar, alternarMontosOcultos } from '../infra/privacidad.js';

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
  // GAS.7a (ADR 179 D1): "Por pagar" se parte en dos lentes de la misma
  // sección (`sec-compromisos`), con su hash. GAS.9b (ADR 183 D2): cada una
  // con lo suyo, los fijos y lo que debes (deja el "Por pagar" de GAS.8d).
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
 * busca en todo el historial). El mes baja a la tarjeta de cada pestaña: es
 * la palabra de su rótulo.
 *
 * GAS.8a (ADR 182 D1): la teja coral marca la sección y el ojo vuelve a la
 * fila, en un círculo junto a la lupa; tapa la lente de su encabezado
 * (`claveDelOjo`). Las pastillas de las pestañas siguen en el DOM para el
 * nombre accesible, pero no se ven: lo vencido lo avisa Día a día.
 *
 * GAS.10a (ADR 185 D1): la fila del nombre sale. La barra de abajo ya dice
 * dónde estás, así que las pestañas suben al primer renglón; el ojo vuelve
 * a la tarjeta de cada pestaña, junto a la cifra que tapa, y la lupa queda
 * en Día a día, al principio de los filtros. Lo vencido lo avisa el punto
 * rojo de su pestaña.
 *
 * @returns {string} HTML listo para inyectar.
 */
export function htmlBloqueGastos() {
  const tabs = LENTES_BLOQUE_GASTOS.map(({ hash, etiqueta }) => `
        <a class="bloque-tabs__tab" href="#${hash}" data-section="${hash}" aria-label="${etiqueta}">
          <span class="bloque-tabs__label">${etiqueta}</span>
          <span class="badge bloque-tabs__badge" aria-hidden="true" hidden></span>
        </a>`).join('');

  // GAS.13d (ADR 188 D4): vuelve la fila del nombre, con la anatomía de
  // Movimientos y Mis cuentas: la teja coral, "Gastos" y la lupa, la única
  // búsqueda del bloque (abre Movimientos con el apartado y el mes).
  return `
    <div class="bloque-gastos">
      <div class="bloque-gastos__cab">
        <span class="cat-teja bloque-gastos__teja" data-dom="gastos" aria-hidden="true"><svg class="icon" aria-hidden="true"><use href="#i-gastos"/></svg></span>
        <p class="bloque-gastos__titulo">Gastos</p>
        <button type="button" class="bloque-gastos__lupa" data-action="bloque-buscar"
                aria-label="Buscar en Movimientos"><svg class="icon" aria-hidden="true"><use href="#i-search"/></svg></button>
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
  // GAS.13d (ADR 188 D4): Fijos y Deudas comparten sección pero no ojo.
  if (lente === 'compromisos') return ojoDePorPagar();
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

  // GAS.13d (ADR 188 D4): una insignia roja con el número: pagos vencidos en
  // Fijos, cuotas vencidas en Deudas, límites pasados en Límites. Sin
  // pendientes no hay insignia; Día a día no la lleva.
  pintarEstadoLente('fijos', estado.vencidosFijos ?? 0,
    'Fijos', n => `${n} ${n === 1 ? 'vencido' : 'vencidos'}`);
  pintarEstadoLente('deudas', estado.vencidasDeudas ?? 0,
    'Deudas', n => `${n} ${n === 1 ? 'cuota vencida' : 'cuotas vencidas'}`);
  pintarEstadoLente('presupuesto', estado.excedidos,
    'Límites', n => `${n === 1 ? 'un límite pasado' : `${n} límites pasados`}`);
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
 * GAS.12a (ADR 187 D1): lo que la hoja dice en cada pestaña. Cada una con su
 * cifra y su ojo: la hoja se abre desde la tarjeta de la pestaña y habla de
 * ella, no siempre del día a día.
 */
const _HOJA_DE_LA_LENTE = {
  gast:        { ayuda: 'Lo que gastaste cada mes, sin contar fijos ni deudas', vacio: 'Sin gastos', ojo: 'gast' },
  fijos:       { ayuda: 'Lo que pagaste en gastos fijos cada mes', vacio: 'Sin pagos', ojo: 'fijos' },
  deudas:      { ayuda: 'Lo que abonaste a tus deudas cada mes', vacio: 'Sin abonos', ojo: 'deudas' },
  presupuesto: { ayuda: 'Lo que gastaste en tus categorías con límite cada mes', vacio: 'Sin gastos', ojo: 'presupuesto' },
};

/**
 * La pestaña de la tarjeta donde se tocó el mes: Día a día, Fijos, Deudas o
 * Límites. Fijos y Deudas comparten sección (`sec-compromisos`); las separa
 * el hash.
 *
 * @param {Element | null | undefined} el
 * @param {string} [hash]
 * @returns {'gast'|'fijos'|'deudas'|'presupuesto'}
 */
export function lenteDeLaHoja(el, hash = globalThis.location?.hash?.slice(1) ?? '') {
  const clave = claveDelOjo(el);
  // GAS.13d: la clave del ojo ya dice la pestaña; en escritorio, el hash.
  if (clave === 'fijos' || clave === 'deudas') return clave;
  if (clave === 'compromisos') return hash === 'deudas' ? 'deudas' : 'fijos';
  return clave === 'presupuesto' ? 'presupuesto' : 'gast';
}

/**
 * Los doce totales del año de una pestaña (GAS.12a, ADR 187 D1): lo gastado
 * en el día a día, lo pagado en fijos, lo abonado a deudas o lo gastado en
 * las categorías con límite. Cada uno con sus propios registros.
 *
 * @param {'gast'|'fijos'|'deudas'|'presupuesto'} lente
 * @param {{ gastos?: object[], compromisos?: object[], presupuestos?: object[] }} datos
 * @param {number} anio
 * @returns {number[]}
 */
export function totalesDeLaLente(lente, { gastos = [], compromisos = [], presupuestos = [] }, anio) {
  if (lente === 'fijos') return totalesPagadosDelAnio(gastos, compromisos, anio, 'fijo');
  if (lente === 'deudas') return totalesPagadosDelAnio(gastos, compromisos, anio, 'deuda');
  if (lente === 'presupuesto') return totalesLimitesDelAnio(presupuestos, gastos, anio);
  return totalesDiaADiaDelAnio(gastos, anio);
}

/**
 * Las filas de la hoja para `anio`: del mes más reciente navegable al
 * primero de Finko, con el total de la pestaña, su barra contra el mes más
 * alto del año y sus marcas. Pura: recibe el estado y los límites.
 *
 * @param {number} anio
 * @param {{ gastos?: object[], compromisos?: object[], presupuestos?: object[],
 *           lente?: 'gast'|'fijos'|'deudas'|'presupuesto',
 *           tope: {anio:number, mes:number},
 *           primero: {anio:number, mes:number}, visto: {anio:number, mes:number},
 *           hoyDate?: Date }} datos
 * @returns {Array<{ mes:number, total:number, pct:number, esActual:boolean,
 *                   esPrimero:boolean, esVisto:boolean }>}
 */
export function filasHojaMeses(anio, { gastos = [], compromisos = [], presupuestos = [], lente = 'gast', tope, primero, visto, hoyDate = new Date() }) {
  if (anio > tope.anio || anio < primero.anio) return [];
  const totales = totalesDeLaLente(lente, { gastos, compromisos, presupuestos }, anio);
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

/** El apartado de Movimientos de cada pestaña (GAS.13d y 13e). */
export const DOMINIO_DE_LA_LENTE = Object.freeze({ gast: 'gastos', fijos: 'fijos', deudas: 'deudas', presupuesto: 'gastos' });

/**
 * GAS.13e (ADR 188 D5): lo que hizo el total de un mes en una pestaña, de
 * mayor a menor. Día a día y Límites, por categoría (Límites, solo las que
 * tienen límite); Fijos y Deudas, por pago o por deuda. Pura.
 *
 * @param {'gast'|'fijos'|'deudas'|'presupuesto'} lente
 * @param {{ gastos?: object[], compromisos?: object[], presupuestos?: object[], categoriasPersonalizadas?: object[] }} state
 * @param {number} anio
 * @param {number} mes 0-11
 * @returns {Array<{ nombre: string, total: number, pct: number, icono: string, tono: string, categoria: string|null }>}
 */
export function partesDelMes(lente, { gastos = [], compromisos = [], presupuestos = [], categoriasPersonalizadas = [] }, anio, mes) {
  const prefijo = `${anio}-${String(mes + 1).padStart(2, '0')}-`;
  const delMes = (gastos ?? []).filter(g => typeof g?.fecha === 'string' && g.fecha.startsWith(prefijo));
  if (lente === 'gast' || lente === 'presupuesto') {
    const limites = new Map(presupuestosActivos(presupuestos).map(p => [p.categoria, p]));
    // GAS.14c (ADR 189 D3): un límite de "Solo una parte" cuenta solo esas
    // partes, como su tarjeta.
    const cuentaEnLimite = (g) => {
      const p = limites.get(g.categoria);
      if (!p) return false;
      const partes = p.soloParte && p.subcategorias && typeof p.subcategorias === 'object' ? Object.keys(p.subcategorias) : null;
      return !partes || partes.includes(g.subcategoriaId);
    };
    const propios = delMes.filter(g => esDelDiaADia(g) && (lente === 'gast' || cuentaEnLimite(g)));
    return repartoPorCategoria(propios).map(r => ({
      nombre: r.categoria, total: r.total, pct: r.pct,
      icono: iconoDeCategoriaGasto(r.categoria, categoriasPersonalizadas), tono: tonoDeCategoria(r.categoria), categoria: r.categoria,
    }));
  }
  const porId = new Map((compromisos ?? []).map(c => [c?.id, c]));
  const quiere = lente === 'fijos' ? (c, g) => (c ? c.tipo === 'fijo' : g.categoria === 'Gastos fijos')
    : (c, g) => (c ? esDeuda(c.tipo) : g.categoria === 'Deudas');
  const grupos = new Map();
  for (const g of delMes) {
    if (!g?.compromisoId || g.consumoTC) continue;
    const c = porId.get(g.compromisoId);
    if (!quiere(c, g)) continue;
    const clave = c?.id ?? g.compromisoId;
    const previo = grupos.get(clave) ?? {
      nombre: c?.descripcion || g.descripcion || (lente === 'fijos' ? 'Gasto fijo' : 'Deuda'),
      total: 0,
      icono: (lente === 'fijos' ? CATEGORIA_AGENDA_ICONO : CATEGORIA_DEUDA_ICONO)[c?.categoria] ?? (lente === 'fijos' ? 'c-otros' : 'i-deudas'),
      tono: 'servicios',
      categoria: null,
    };
    previo.total += Number(g.monto) || 0;
    grupos.set(clave, previo);
  }
  const lista = [...grupos.values()].filter(p => p.total > 0).sort((a, b) => b.total - a.total || a.nombre.localeCompare(b.nombre, 'es'));
  const suma = lista.reduce((a, p) => a + p.total, 0);
  return lista.map(p => ({ ...p, pct: suma > 0 ? Math.round((p.total / suma) * 100) : 0 }));
}

/**
 * GAS.15d (ADR 192 D5): lo que se debía al cierre de un mes, de las deudas
 * vivas (como "Debías al cierre de" de la tarjeta, GAS.13h); en el mes en
 * curso, lo que se debe hoy.
 *
 * @param {{ gastos?: object[], compromisos?: object[] }} datos
 * @param {number} anio
 * @param {number} mes 0-11
 * @param {Date} [hoyDate]
 * @returns {number}
 */
export function deudaAlCierreDelMes({ gastos = [], compromisos = [] }, anio, mes, hoyDate = new Date()) {
  const deudas = compromisosActivos(compromisos).filter(c => esDeuda(c.tipo));
  if (anio === hoyDate.getFullYear() && mes === hoyDate.getMonth()) {
    return deudas.reduce((a, c) => a + Math.max(0, Number(c.saldoTotal) || 0), 0);
  }
  const pre = `${anio}-${String(mes + 1).padStart(2, '0')}`;
  return deudas.reduce((a, c) => a + saldoDeudaAlCierre(c, gastos, pre), 0);
}

/**
 * GAS.15d (ADR 192 D2): lo que dice cada barra de la gráfica. En Límites, el
 * porcentaje usado de los topes del mes; en Deudas, lo que se debía al cierre
 * del mes (en el mes en curso, lo que se debe hoy); en las demás, el total
 * del mes.
 *
 * @param {'gast'|'fijos'|'deudas'|'presupuesto'} lente
 * @param {typeof S} state
 * @param {Array<{anio:number, mes:number}>} meses
 * @returns {Map<string, number>} 'anio-mes' → valor.
 */
function _valoresDeLaVentana(lente, state, meses, hoyDate = new Date()) {
  const datos = { gastos: state.gastos ?? [], compromisos: state.compromisos ?? [], presupuestos: state.presupuestos ?? [] };
  const porAnio = new Map();
  const valores = new Map();
  for (const { anio, mes } of meses) {
    if (lente === 'presupuesto') {
      const r = resumenLimitesDelMes(datos.presupuestos, datos.gastos, anio, mes + 1);
      valores.set(`${anio}-${mes}`, r.asignado > 0 ? Math.round((r.gastado / r.asignado) * 100) : 0);
      continue;
    }
    if (lente === 'deudas') {
      valores.set(`${anio}-${mes}`, deudaAlCierreDelMes(datos, anio, mes, hoyDate));
      continue;
    }
    if (!porAnio.has(anio)) porAnio.set(anio, totalesDeLaLente(lente, datos, anio));
    valores.set(`${anio}-${mes}`, porAnio.get(anio)[mes] ?? 0);
  }
  return valores;
}

/**
 * El cuerpo de la hoja (GAS.15d, ADR 192): la gráfica de seis meses y, debajo,
 * el mes visto con lo que lo hizo, como la página 6 del lienzo. Los montos
 * respetan el ojo de la pestaña que la abrió; con el ojo puesto no van las
 * cifras de las barras ni sus altos, que dirían la proporción.
 *
 * @param {{anio:number, mes:number} | null} fin último mes de la ventana; `null`, el de `finDeVentana`.
 * @param {typeof S} [state=S]
 * @param {Date} [hoyDate]
 * @param {'gast'|'fijos'|'deudas'|'presupuesto'} [lente='gast']
 * @param {{ todas?: boolean }} [opciones] `todas`: "Otras N categorías" abierta.
 * @returns {string} HTML.
 */
export function htmlHojaMeses(fin, state = S, hoyDate = new Date(), lente = 'gast', { todas = false } = {}) {
  const hoja = _HOJA_DE_LA_LENTE[lente] ?? _HOJA_DE_LA_LENTE.gast;
  const tope = mesTopeGastos();
  const primero = primerMesFinko(state, hoyDate);
  const visto = mesBloque();
  const oculto = montosOcultos(hoja.ojo);
  const m = (n) => (oculto ? SALDO_MASCARA_CUENTA : f(n));
  const final = fin ?? finDeVentana(visto, tope);
  const meses = mesesDeLaVentana(final);
  const idx = (x) => x.anio * 12 + x.mes;
  const valores = _valoresDeLaVentana(lente, state, meses, hoyDate);
  const hoyIdx = hoyDate.getFullYear() * 12 + hoyDate.getMonth();
  const serie = meses.map(x => ({
    ...x,
    valor: valores.get(`${x.anio}-${x.mes}`) ?? 0,
    fuera: idx(x) > idx(tope) || idx(x) < idx(primero),
    // En Fijos, el mes en curso dice también lo que falta (contorno punteado).
    ...(lente === 'fijos' && idx(x) === hoyIdx ? { esperado: _resumenFijos(x, hoyDate).total } : {}),
  }));
  const grafica = htmlGraficaResumen(lente, serie, {
    visto, oculto, m,
    hayAnteriores: idx(meses[0]) > idx(primero),
    haySiguientes: idx(final) < idx(tope),
  });

  // El mes visto fuera de la historia (no debería pasar: el reloj no sale de
  // ella) no lleva cuerpo.
  if (idx(visto) > idx(tope) || idx(visto) < idx(primero)) return grafica;
  const esActual = visto.anio === hoyDate.getFullYear() && visto.mes === hoyDate.getMonth();
  let cuerpo;
  if (lente === 'presupuesto') {
    cuerpo = htmlCuerpoLimites(state, visto.anio, visto.mes, { oculto, m, esActual, hoyDate });
  } else if (lente === 'gast') {
    const antes = { anio: visto.mes === 0 ? visto.anio - 1 : visto.anio, mes: (visto.mes + 11) % 12 };
    const anterior = idx(antes) < idx(primero) ? null
      : (totalesDeLaLente('gast', { gastos: state.gastos ?? [] }, antes.anio)[antes.mes] ?? 0);
    cuerpo = htmlCuerpoDiaADia(state, visto.anio, visto.mes, { oculto, m, anterior, todas });
  } else if (lente === 'fijos') {
    cuerpo = htmlCuerpoFijos(_resumenFijos(visto, hoyDate), visto.anio, visto.mes, { oculto, m });
  } else {
    const pre = `${visto.anio}-${String(visto.mes + 1).padStart(2, '0')}`;
    const datos = { gastos: state.gastos ?? [], compromisos: state.compromisos ?? [] };
    const abonado = totalesDeLaLente('deudas', datos, visto.anio)[visto.mes] ?? 0;
    const filas = filasResumenDelMes('deuda', pre, hoyDate).map(x => ({
      nombre: _nombreDeuda(x.c),
      teja: tejaDeudaInventario(x.c),
      estado: x.estado,
      fecha: x.fecha,
      cuota: calcularCompromisoMensual(x.c),
      pagado: x.pagado,
      saldo: esActual ? Math.max(0, Number(x.c.saldoTotal) || 0) : saldoDeudaAlCierre(x.c, datos.gastos, pre),
    })).filter(x => x.saldo > 0 || x.pagado > 0);
    const cuotas = esActual ? filas.reduce((a, x) => a + (x.cuota || 0), 0) : 0;
    const antes = { anio: visto.mes === 0 ? visto.anio - 1 : visto.anio, mes: (visto.mes + 11) % 12 };
    const bajo = idx(antes) < idx(primero) ? null
      : deudaAlCierreDelMes(datos, antes.anio, antes.mes, hoyDate) - (valores.get(`${visto.anio}-${visto.mes}`) ?? deudaAlCierreDelMes(datos, visto.anio, visto.mes, hoyDate));
    cuerpo = htmlCuerpoDeudas({ filas, abonado, cuotas, bajo }, visto.anio, visto.mes, { oculto, m, esActual });
  }
  return `${grafica}${cuerpo}`;
}

/**
 * Lo de Fijos en un mes: cada fijo con su estado (`filasResumenDelMes`), lo
 * pagado y lo que suma con lo que falta. Lee el estado global (como la lista).
 */
function _resumenFijos(x, hoyDate) {
  const pre = `${x.anio}-${String(x.mes + 1).padStart(2, '0')}`;
  const filas = filasResumenDelMes('fijo', pre, hoyDate).map(r => ({
    nombre: r.c.descripcion || 'Gasto fijo',
    teja: tejaCompromiso(r.c),
    estado: r.estado,
    fecha: r.fecha,
    monto: r.monto,
    familia: familiaDeFijo(r.c.categoria),
  }));
  const pagado = totalesPagadosDelAnio(S.gastos ?? [], S.compromisos ?? [], x.anio, 'fijo')[x.mes] ?? 0;
  const falta = filas.filter(r => r.estado !== 'pagado').reduce((a, r) => a + r.monto, 0);
  return { filas, pagado, total: pagado + falta };
}

/**
 * El nombre de una deuda en el resumen: lo que es ("Libre inversión"); una
 * tarjeta, con su banco ("Tarjeta Bancolombia"), que aquí no hay línea de
 * entidad debajo.
 */
function _nombreDeuda(c) {
  if (c.tipo !== 'deuda-entidad') return String(c.descripcion ?? '').trim() || 'Deuda';
  const titulo = tituloDeuda(c);
  return /^tarjeta de cr[eé]dito$/i.test(titulo) ? (String(c.descripcion ?? '').trim() || titulo) : titulo;
}

/** El título de la hoja: el punto en el color de la pestaña y su nombre. */
export function htmlTituloResumen(lente) {
  const r = RESUMEN_DE_LA_LENTE[lente] ?? RESUMEN_DE_LA_LENTE.gast;
  return `<span class="resumen__punto" aria-hidden="true"></span>Resumen · ${r.nombre}`;
}

/** El último mes de la ventana de la hoja abierta (GAS.15d). */
let _finHoja = null;
/** La pestaña que abrió la hoja (GAS.12a). */
let _lenteHoja = 'gast';
/** "Otras N categorías" abierta (GAS.15d). */
let _todasHoja = false;

function _pintarHojaMeses() {
  const cuerpo = document.getElementById('elegir-mes-body');
  if (cuerpo) cuerpo.innerHTML = htmlHojaMeses(_finHoja, S, new Date(), _lenteHoja, { todas: _todasHoja });
  const titulo = document.getElementById('modal-elegir-mes-title');
  if (titulo) titulo.innerHTML = htmlTituloResumen(_lenteHoja);
  document.getElementById('modal-elegir-mes')?.setAttribute('data-lente', _lenteHoja);
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
export function irABuscar(el) {
  // GAS.13d (ADR 188 D4): desde la cabecera de Gastos, con el apartado de la
  // pestaña y el mes a la vista; desde Inicio, sin filtros.
  const enBloque = Boolean(el?.closest?.('[id^="tabs-"]'));
  const lente = enBloque ? lenteDeLaHoja(el) : null;
  const dominio = { gast: 'gastos', fijos: 'fijos', deudas: 'deudas', presupuesto: 'gastos' }[lente] ?? null;
  EventBus.emit('movimientos:ver', dominio ? { dominio, ...rangoMesBloque() } : {});
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
  registrarAccion('bloque-elegir-mes', (el) => {
    const overlay = document.getElementById('modal-elegir-mes');
    if (!overlay) return;
    _lenteHoja = lenteDeLaHoja(el);
    _finHoja = finDeVentana(mesBloque(), mesTopeGastos());
    _todasHoja = false;
    _pintarHojaMeses();
    abrirModal(overlay);
  });
  // GAS.15d (ADR 192 D1): "Meses anteriores" y "Meses siguientes" mueven la
  // ventana de seis meses; el mes visto no cambia hasta que se toca uno.
  registrarAccion('bloque-resumen-ventana', (el) => {
    const delta = Number(el?.dataset?.delta) || 0;
    _finHoja = moverVentana(_finHoja ?? finDeVentana(mesBloque(), mesTopeGastos()), delta,
      { tope: mesTopeGastos(), primero: primerMesFinko() });
    _pintarHojaMeses();
    const flecha = document.querySelector(`#elegir-mes-body [data-action="bloque-resumen-ventana"][data-delta="${delta}"]:not(:disabled)`)
      ?? document.querySelector('#elegir-mes-body .resumen-barra[aria-pressed="true"], #elegir-mes-body .resumen-barra:not(.resumen-barra--fuera)');
    flecha?.focus();
  });
  registrarAccion('resumen-otras', () => {
    _todasHoja = !_todasHoja;
    _pintarHojaMeses();
    document.querySelector(`#elegir-mes-body [data-action="resumen-otras"]`)?.focus();
  });
  // GAS.13e (ADR 188 D5): tocar una barra cambia de mes y el resumen sigue
  // abierto con lo de ese mes.
  registrarAccion('bloque-ir-mes', (el) => {
    const anio = Number(el?.dataset?.anio);
    const mes = Number(el?.dataset?.mes);
    if (!Number.isInteger(anio) || !Number.isInteger(mes)) return;
    irAMesDelBloque(anio, mes);
    _todasHoja = false;
    renderAll();
    _pintarHojaMeses();
    document.querySelector(`#elegir-mes-body [data-action="bloque-ir-mes"][data-anio="${anio}"][data-mes="${mes}"]`)?.focus();
  });
  registrarAccion('resumen-ver', (el) => {
    const d = el?.dataset ?? {};
    const overlay = document.getElementById('modal-elegir-mes');
    if (overlay) cerrarModal(overlay);
    EventBus.emit('movimientos:ver', {
      dominio: d.dominio || null, categoria: d.categoria || null, desde: d.desde || '', hasta: d.hasta || '',
    });
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

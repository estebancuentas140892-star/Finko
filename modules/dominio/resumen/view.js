/**
 * resumen/view.js - card de resumen semanal en el dashboard (F8).
 *
 * Renderiza en `#panel-resumen` un panel de solo lectura con el gasto de la
 * semana, su comparación con la semana previa, la categoría top y los días
 * activos del mes. Aparece solo cuando hay actividad (patrón [hidden] del bento).
 *
 * Puede leer S. No puede mutarlo. Sin lógica de negocio (toda en logic.js).
 */

import { S } from '../../core/state.js';
import { f, esc as _esc, hoy } from '../../infra/utils.js';
import { icon, tejaCategoria } from '../../infra/icons.js';
import { iconoDeCategoriaGasto } from '../../core/constants.js';
import { memoizar } from '../../infra/memo.js';
import { resumenSemanal } from './logic.js';
import { recolectarAvisos, filtrarPorPreferencia, hayDatosParaRespaldar } from '../../infra/avisos.js';

/**
 * PERF.2: `resumenSemanal()` barre `S.gastos` varias veces (ventanas de 7 y
 * 14 días, top de categoría, días activos del mes). `renderAll()` invoca este
 * render en cada mutación relevante aunque el usuario esté en otra sección;
 * memoizar evita repetir el barrido cuando `gastos` no cambió desde el último
 * cálculo.
 */
const _resumenSemanalMemo = memoizar(resumenSemanal, ['gastos']);

/**
 * Texto compacto del chip comparativo (IN.8f, ADR 034 D6).
 * Tono neutral, sin castigo: la subida no se presenta como alarma (ADR 019,
 * mismo criterio que IV.3 en Análisis: solo bajar se celebra, subir queda neutro).
 *
 * @param {{ direccion: string, pct: number|null }} comp
 * @returns {string}
 */
function _chipTexto(comp) {
  switch (comp.direccion) {
    case 'subió': return `${comp.pct}% más`;
    case 'bajó':  return `${comp.pct}% menos`;
    case 'igual': return 'Igual que la semana pasada';
    default:      return 'Sin semana previa para comparar';
  }
}

/**
 * Modificador de color del chip. Solo bajar el gasto se refuerza en verde;
 * subir/igual/sin-previa quedan en el mismo tono neutro (ADR 019).
 * @param {string} direccion
 * @returns {string}
 */
function _chipClase(direccion) {
  return direccion === 'bajó' ? 'resumen-semana__chip--positivo' : 'resumen-semana__chip--neutro';
}

/**
 * Ícono de tendencia del chip: solo tiene sentido con un porcentaje real
 * (subió/bajó). Invertido (apuntando abajo) cuando el gasto bajó, para leer
 * "la línea de gasto va hacia abajo" como buena noticia.
 * @param {string} direccion
 * @returns {string}
 */
function _chipIcono(direccion) {
  if (direccion === 'bajó')  return icon('trending-up', 'icon icon--sm resumen-semana__chip-icon resumen-semana__chip-icon--invertido');
  if (direccion === 'subió') return icon('trending-up', 'icon icon--sm resumen-semana__chip-icon');
  return '';
}

/**
 * Renderiza la card de resumen semanal. No-op si el contenedor no existe.
 * Oculta el panel cuando no hay actividad suficiente esta semana.
 *
 * PERF.7b: antes se llamaba a `hayResumen()` (barrido propio, sin memoizar)
 * y luego a `_resumenSemanalMemo()`, duplicando el barrido de "registros de
 * los últimos 7 días" que `resumenSemanal()` ya calcula. Se llama al bundle
 * memoizado una sola vez y la condición de "sin actividad" se deriva de su
 * campo `registros` (misma regla que `hayResumen`: al menos 1 gasto en los
 * últimos 7 días).
 */
export function renderPanelResumen() {
  const el = document.getElementById('panel-resumen');
  if (!el) return;

  const hoyISO = hoy();
  const gastos = S.gastos;
  const r = _resumenSemanalMemo(gastos, hoyISO);

  if (r.registros === 0) {
    el.innerHTML = '';
    el.hidden = true;
    return;
  }
  el.hidden = false;

  // Mini gráfico de barras (IN.8f, ADR 034 D6): alto proporcional al pico de
  // la semana, tope al 72% del contenedor (deja aire arriba, mismo criterio
  // del mockup); min-height en CSS evita una barra invisible en días sin gasto.
  const maxDia = Math.max(0, ...r.serie.map(d => d.total));
  const barrasHtml = r.serie.map(d => {
    const esPico = maxDia > 0 && d.total === maxDia;
    const pct = maxDia > 0 ? Math.round((d.total / maxDia) * 72) : 0;
    return `
      <div class="resumen-semana__barra">
        <div class="resumen-semana__barra-fill${esPico ? ' resumen-semana__barra-fill--pico' : ''}" style="height:${pct}%"></div>
      </div>`;
  }).join('');
  const diasHtml = r.serie.map(d => {
    const esPico = maxDia > 0 && d.total === maxDia;
    return `<span class="resumen-semana__dia${esPico ? ' resumen-semana__dia--pico' : ''}">${d.dia}</span>`;
  }).join('');
  const ariaBarras = `Gasto diario de los últimos 7 días, máximo ${f(maxDia)}`;

  const diasActivosTxt = r.diasActivosSemana === 1
    ? '1 de 7 días activos'
    : `${r.diasActivosSemana} de 7 días activos`;
  const picoTxt = r.diaPico ? ` · mayor gasto el ${r.diaPico}` : '';

  const topHtml = r.top
    ? `
      <div class="resumen-semana__top">
        ${tejaCategoria(iconoDeCategoriaGasto(r.top.categoria, S.categoriasPersonalizadas), 'gastos')}
        <div class="resumen-semana__top-body">
          <p class="resumen-semana__top-titulo">${_esc(r.top.categoria)} fue tu categoría top</p>
          <p class="resumen-semana__top-sub">${diasActivosTxt}${picoTxt}</p>
        </div>
        <span class="resumen-semana__top-monto">${f(r.top.total)}</span>
      </div>`
    : '';

  // IN.9d (ADR 057 D4): título propio de vuelta. Desde IN.8a vivía en el
  // label del grupo externo, pero ese grupo ahora también podría contener
  // Actividad reciente (fila final 6+6 en escritorio) y un label compartido
  // la describiría mal.
  //
  // Ficha 02 (ADR 069): la etiqueta declara su alcance. Esta cifra suma TODO
  // S.gastos, cuotas de deuda y fijos incluidos, mientras el hero de Gastos
  // los excluye con _sinInternas(). Dos "gastaste" que no cuadran nunca es
  // peor que una etiqueta larga.
  el.innerHTML = `
    <section class="resumen-card" aria-label="Resumen de la semana">
      <div class="resumen-semana">
        <span class="accesos-actividad__label">Resumen de la semana</span>
        <div class="resumen-semana__header">
          <div>
            <p class="resumen-semana__label">Todo lo que salió esta semana</p>
            <p class="resumen-semana__monto">${f(r.actual)}</p>
            <p class="resumen-semana__alcance">incluye fijos y cuotas de deuda</p>
          </div>
          <span class="resumen-semana__chip ${_chipClase(r.comparacion.direccion)}">
            ${_chipIcono(r.comparacion.direccion)}${_chipTexto(r.comparacion)}
          </span>
        </div>

        <div class="resumen-semana__barras" role="img" aria-label="${ariaBarras}">${barrasHtml}</div>
        <div class="resumen-semana__dias" aria-hidden="true">${diasHtml}</div>

        ${topHtml}
      </div>
    </section>`;
}

// ── PANEL DE AVISOS (CFG.3b, ADR 066) ────────────────────────────

/**
 * Tipos de aviso que hoy no tienen ninguna superficie propia en Inicio: los
 * demás (compromiso-vencido/proximo, limite-excedido/alerta,
 * apartado-proximo, prestamo-proximo) ya viven en "Pendientes del mes",
 * "Próximas prioridades" y "Alertas de límites de gasto", con su propia
 * lógica de siempre (no pasan por el motor). Mostrarlos también acá sería el
 * mismo aviso dos veces en la misma pantalla.
 */
const _TIPOS_SIN_PANEL_PROPIO = ['apartado-listo', 'dia-de-pago', 'prestamo-vencido', 'respaldo-atrasado'];

/** Filas visibles antes de resumir el resto en un texto, mismo tope que "Pendientes del mes". */
const MAX_VISIBLES_AVISOS = 4;

const _ICONO_POR_TIPO_AVISO = {
  'apartado-listo':    () => icon('apartados'),
  'dia-de-pago':       () => icon('saldo'),
  'prestamo-vencido':  () => icon('personales'),
  'respaldo-atrasado': () => icon('ajustes'),
};

/**
 * Copy de una fila (ADR 066 D2: el motor devuelve datos, cada superficie
 * redacta el suyo). Tono neutral: "listo" nunca urgente, y el préstamo vencido
 * recuerda la fecha pactada sin lenguaje de cobro (ADR 047).
 */
function _filaAviso(a) {
  const monto = Number(a.monto) > 0 ? f(a.monto) : '';

  switch (a.tipo) {
    case 'apartado-listo':
      return { sub: monto ? `Ya reuniste ${monto}` : 'Ya reuniste el dinero', badge: 'Listo', clase: 'listo' };
    case 'dia-de-pago':
      return { sub: monto ? `Te llega hoy · ${monto}` : 'Te llega hoy', badge: 'Hoy', clase: 'info' };
    case 'prestamo-vencido': {
      const dias   = Number(a.dias) || 0;
      const cuando = dias === 1 ? 'hace 1 día' : `hace ${dias} días`;
      return { sub: monto ? `Acordaron esta fecha ${cuando} · ${monto}` : `Acordaron esta fecha ${cuando}`, badge: 'Recordatorio', clase: 'info' };
    }
    case 'respaldo-atrasado': {
      const dias = Number(a.dias) || 0;
      return { sub: `Hace ${dias} días que no lo respaldas`, badge: 'Respaldo', clase: 'info' };
    }
    default:
      return { sub: monto, badge: '', clase: 'info' };
  }
}

/**
 * Renderiza en `#panel-avisos` los avisos del motor único (`infra/avisos.js`,
 * CFG.3a) que ninguna otra superficie de Inicio muestra todavía: apartados
 * listos para reiniciar, ingresos que llegan hoy, préstamos personales con la
 * fecha pactada ya pasada y respaldo atrasado (CFG.4b). El resto de tipos ya
 * vive en sus paneles propios (`_TIPOS_SIN_PANEL_PROPIO`), así que este panel
 * no los repite. Respeta además el interruptor por sección (CFG.3c,
 * `S.config.avisosPorSeccion`): una sección apagada en Ajustes tampoco
 * aparece acá.
 *
 * No-op si el contenedor no existe.
 */
export function renderPanelAvisos() {
  const el = document.getElementById('panel-avisos');
  if (!el) return;

  const avisos = filtrarPorPreferencia(
    recolectarAvisos({
      compromisos:  S.compromisos,
      gastos:       S.gastos,
      presupuestos: S.presupuestos,
      apartados:    S.apartados,
      personales:   S.personales,
      ingresos:     S.ingresos,
      ultimoRespaldoISO: S.config?.ultimoRespaldoISO ?? null,
      primerUsoISO:      S.config?.primerUsoISO ?? null,
      hayDatosParaRespaldar: hayDatosParaRespaldar({
        compromisos: S.compromisos, presupuestos: S.presupuestos, apartados: S.apartados,
        personales: S.personales, ingresos: S.ingresos, gastos: S.gastos,
        cuentas: S.cuentas, metas: S.metas, inversiones: S.inversiones,
      }),
      hoyISO:       hoy(),
    }),
    S.config?.avisosPorSeccion,
  ).filter(a => _TIPOS_SIN_PANEL_PROPIO.includes(a.tipo));

  if (avisos.length === 0) {
    el.innerHTML = '';
    el.hidden = true;
    return;
  }
  el.hidden = false;

  const visibles = avisos.slice(0, MAX_VISIBLES_AVISOS);
  const resto    = avisos.length - visibles.length;

  const items = visibles.map(a => {
    const { sub, badge, clase } = _filaAviso(a);
    const icono = (_ICONO_POR_TIPO_AVISO[a.tipo] ?? (() => icon('info')))();
    return `
      <li class="avisos-card__item">
        <div class="avisos-card__body">
          <p class="avisos-card__name">${icono} ${_esc(a.nombre || 'Aviso')}</p>
          <p class="avisos-card__sub">${sub}</p>
        </div>
        <span class="avisos-card__badge avisos-card__badge--${clase}">${badge}</span>
      </li>`;
  }).join('');

  const n       = avisos.length;
  const titulo  = n === 1 ? '1 aviso' : `${n} avisos`;
  const masTexto = resto > 0 ? `<p class="avisos-card__mas">y ${resto} más</p>` : '';

  el.innerHTML = `
    <section class="avisos-card" aria-label="Avisos">
      <header class="avisos-card__header">
        <h2 class="avisos-card__title">${icon('alert', 'icon icon--sm')} ${titulo}</h2>
      </header>
      <ul class="avisos-card__list" role="list">
        ${items}
      </ul>
      ${masTexto}
    </section>`;
}

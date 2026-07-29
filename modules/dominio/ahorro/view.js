/**
 * ahorro/view.js - HTML del dominio Ahorro (J.1).
 * Puede leer S. No puede mutarlo. Sin lógica de negocio.
 */

import { S } from '../../core/state.js';
import { f, fechaLegible, formateadorFecha, hoy, esc as _esc } from '../../infra/utils.js';
import { icon, emptyArt, tejaCategoria } from '../../infra/icons.js';
import { SALDO_MASCARA_CUENTA } from '../../infra/render.js';
import {
  calcularObjetivoFondo,
  calcularProgresoFondo,
  mesesDeColchon,
  calcularMontoTotalFondo,
  ordenarAportesPorFecha,
  consolidarAhorro,
  nivelesFondo,
  mesesEnPalabras,
  fechaCobertura,
  bloquesCobertura,
  NIVELES_FONDO,
  META_MESES_MIN,
  META_MESES_MAX,
} from './logic.js';

// Mapa clave de vehículo → sección de destino + símbolo del sprite. Solo
// routing/UI, no lógica.
//
// DIS.12 (hallazgo A2): antes eran emoji del sistema operativo
// (🛡️🎯📦📈), glifos que traen su propio color fuera de los tokens, su propio
// peso y su propia caja, y que no responden al tema. El sprite ya tiene los
// cuatro símbolos exactos: los mismos que usan la pestaña del hub y la teja de
// cada sección. El color de cada uno lo pone `domain.css` por `data-vehiculo`.
const _VEHICULO_META = {
  fondo:       { seccion: 'ahorro',    icono: 'ahorro' },
  metas:       { seccion: 'metas',     icono: 'metas' },
  apartados:   { seccion: 'apartados', icono: 'apartados' },
  inversiones: { seccion: 'inversion', icono: 'inversion' },
};

// ── RENDER PRINCIPAL ─────────────────────────────────────────────

/**
 * Renderiza el panel de Ahorro en `#panel-ahorro`.
 *
 * @param {number}      gastosFijosMensuales COP/mes calculado por index.js desde
 *                                           S.compromisos (regla ADN #10: view no
 *                                           lee otros dominios).
 * @param {number|null} tasaAhorro           Tasa de ahorro mensual (%) calculada
 *                                           por index.js desde S.ingresos + S.gastos.
 *                                           null si no hay ingresos registrados.
 * @param {Object|null} sugerencia           Aporte sugerido (AH.2) calculado por
 *                                           index.js con calcularAporteSugerido.
 *                                           null si no se puede calcular.
 */
export function renderAhorro(gastosFijosMensuales, tasaAhorro = null, sugerencia = null) {
  const el = document.getElementById('panel-ahorro');
  if (!el) return;

  const fondo = S.ahorro?.fondoEmergencia ?? { activo: false, metaMeses: 3, montoActual: 0 };

  if (!fondo.activo) {
    el.innerHTML = _renderEmptyState(gastosFijosMensuales);
    return;
  }

  el.innerHTML = _renderFondoCard(fondo, gastosFijosMensuales, tasaAhorro, sugerencia);
}

// ── CONSOLIDADO DE AHORRO (F6, cabecera del hub Ahorros en NAV.B) ─

/**
 * Renderiza el total de ahorro repartido entre los cuatro vehículos (fondo,
 * metas, apartados, inversiones) en cada slot `[data-hub-consolidado]`: es la
 * cabecera común del hub Ahorros (ADR 024 D4), visible en las secciones
 * Fondo de emergencia, Metas, Apartados e Inversión. Solo lectura.
 *
 * Lee S directamente (permitido para un view), pero NO importa otros dominios:
 * suma inline los montos de cada slice, igual que compromisos/views/dashboard.js
 * lee S.personales y S.apartados sin importar esos módulos (regla ADN #10).
 * Los slots viven en el shell (index.html), no dentro de otro dominio.
 *
 * Cada slot declara en `data-hub-consolidado` la sección donde vive: la fila
 * de ese vehículo omite su enlace "Ver" (ya estás ahí). Se oculta cuando el
 * total es 0 (patrón [hidden] del resto de paneles). No-op sin slots.
 */
export function renderResumenAhorroConsolidado() {
  const slots = document.querySelectorAll('[data-hub-consolidado]');
  if (slots.length === 0) return;

  const fondo = S.ahorro?.fondoEmergencia ?? { activo: false };
  const fondoTotal = fondo.activo
    ? calcularMontoTotalFondo(fondo.montoActual, Array.isArray(S.ahorro?.aportes) ? S.ahorro.aportes : [])
    : 0;

  const metasTotal = (Array.isArray(S.metas) ? S.metas : [])
    .filter(m => m.completada !== true)
    .reduce((sum, m) => sum + (Number(m.montoActual) || 0), 0);

  const apartadosTotal = (Array.isArray(S.apartados) ? S.apartados : [])
    .reduce((sum, a) => sum + (Number(a.montoActual) || 0), 0);

  const inversionesTotal = (Array.isArray(S.inversiones) ? S.inversiones : [])
    .reduce((sum, i) => sum + (Number(i.monto) || 0), 0);

  const { total, desglose } = consolidarAhorro({
    fondo:       fondoTotal,
    metas:       metasTotal,
    apartados:   apartadosTotal,
    inversiones: inversionesTotal,
  });

  for (const el of slots) {
    if (total <= 0) {
      el.innerHTML = '';
      el.hidden = true;
      continue;
    }
    el.hidden = false;
    el.innerHTML = _htmlConsolidado(total, desglose, el.dataset.hubConsolidado);
  }
}

/**
 * HTML del consolidado para un slot del hub.
 * @param {number} total
 * @param {Array<{clave:string, label:string, monto:number, pct:number}>} desglose
 * @param {string} seccionActual - sección donde vive el slot (omite su enlace).
 */
function _htmlConsolidado(total, desglose, seccionActual) {
  const filas = desglose.map(d => {
    const meta = _VEHICULO_META[d.clave] ?? { seccion: 'ahorro', icono: 'ahorro' };
    const enlace = meta.seccion === seccionActual
      ? ''
      : `<a href="#${meta.seccion}" class="ahorro-total__link" aria-label="Ir a ${_esc(d.label)}">Ver →</a>`;
    return `
      <li class="ahorro-total__item" data-vehiculo="${_esc(d.clave)}">
        <span class="ahorro-total__nombre">${icon(meta.icono, 'icon ahorro-total__ico')} ${_esc(d.label)}</span>
        <span class="ahorro-total__barra" aria-hidden="true">
          <span class="ahorro-total__barra-fill" style="width:${d.pct}%"></span>
        </span>
        <span class="ahorro-total__monto">${f(d.monto)} <span class="ahorro-total__pct">${d.pct}%</span></span>
        ${enlace}
      </li>`;
  }).join('');

  return `
    <section class="ahorro-total" aria-label="Tu ahorro total">
      <header class="ahorro-total__header">
        <p class="ahorro-total__label">Tu ahorro total</p>
        <p class="ahorro-total__valor">${f(total)}</p>
        <p class="ahorro-total__sub">Suma de fondo, metas, apartados e inversiones.</p>
      </header>
      <ul class="ahorro-total__lista" role="list">
        ${filas}
      </ul>
    </section>`;
}

// ── EMPTY STATE ──────────────────────────────────────────────────

/**
 * Estado 1 (DIS.16): sin fondo todavía. La tarjeta no existe, así que hay que
 * explicar para qué sirve, y los tres niveles aparecen desde el primer momento
 * apagados: son la promesa de la sección. La última línea traduce el primer
 * nivel a pesos con los datos que Finko ya tiene, así que la decisión de
 * activarlo no se toma a ciegas.
 */
function _renderEmptyState(gastosFijosMensuales) {
  const primerNivel = calcularObjetivoFondo(gastosFijosMensuales, NIVELES_FONDO[0].meses);

  const nivelesHtml = NIVELES_FONDO.map(n => `
        <li class="fondo-card__nivel-fila fondo-card__nivel-fila--lejano">
          <span class="fondo-card__punto" aria-hidden="true"></span>
          <span class="fondo-card__nivel-tx">${_esc(n.titulo)} · ${_esc(n.consecuencia)}</span>
        </li>`).join('');

  const pistaHtml = primerNivel > 0
    ? `<p class="fondo-card__veredicto">Con lo que pagas cada mes, tu primer nivel serían <strong>${f(primerNivel)}</strong>.</p>`
    : `<p class="fondo-card__veredicto">Registra tus gastos fijos desde Calendario (arriendo, servicios, suscripciones) y Finko calcula cuánto necesitas.</p>`;

  return `
    <article class="fondo-card fondo-card--vacio" data-dom="ahorro" aria-label="Fondo de emergencia">
      <div class="empty-state__icon">${emptyArt('ahorro')}</div>
      <p class="fondo-card__pregunta">¿Cuánto tiempo aguantarías sin ingresos?</p>
      <p class="fondo-card__explica">Un fondo de emergencia es dinero que apartas para cuando algo se dañe o dejes de recibir. No se gasta: está ahí para que un imprevisto no se convierta en deuda.</p>
      <div class="fondo-card__escalera">
        <p class="fondo-card__kicker">Los tres niveles</p>
        <ul class="fondo-card__niveles" role="list">${nivelesHtml}</ul>
      </div>
      ${pistaHtml}
      <div class="fondo-card__acciones">
        <button class="fondo-card__principal" type="button" data-action="ahorro-activar-fondo">Empezar mi fondo</button>
      </div>
    </article>`;
}

// ── HERO DEL FONDO (estado activo) ───────────────────────────────

/**
 * DIS.16 (arquitectura I con la prueba de H): la tarjeta del fondo deja de
 * medirse en porcentaje y pasa a medirse en **tiempo**. El fondo no es ni una
 * meta ni un apartado, y eso obliga a resolver dos cosas que ninguna otra
 * sección tiene:
 *
 * - **El objetivo se mueve solo.** Si suben los gastos fijos, el porcentaje cae
 *   sin que el usuario haya gastado un peso. Con niveles definidos en meses eso
 *   se entiende: lo que cambió fue el costo de un mes, y **un nivel logrado no
 *   se retira**.
 * - **No hay final.** Llegar a la meta no apaga la tarjeta: el siguiente nivel
 *   sigue a la vista, porque tres meses no es el final del camino.
 *
 * Las cuatro piezas hacen un trabajo cada una: el **nombre del nivel** dice qué
 * logró, los **bloques de mes y la fecha** demuestran cuánto aguanta (una
 * afirmación de texto hay que creerla; agosto entero y casi todo septiembre se
 * ve), la **escalera** dice hacia dónde va y el **veredicto** dice qué hacer.
 *
 * El anillo de progreso se retira: el porcentaje pasa a ser un rótulo pequeño al
 * pie de los bloques, que es todo el peso que merece aquí.
 */
function _renderFondoCard(fondo, gastosFijosMensuales, tasaAhorro, sugerencia = null) {
  const { metaMeses, montoActual: montoBase } = fondo;
  const aportes    = Array.isArray(S.ahorro?.aportes) ? S.ahorro.aportes : [];
  const montoTotal = calcularMontoTotalFondo(montoBase, aportes);
  const objetivo   = calcularObjetivoFondo(gastosFijosMensuales, metaMeses);
  const colchon    = mesesDeColchon(montoTotal, gastosFijosMensuales);
  const { porcentaje, faltante, completado } = calcularProgresoFondo(montoTotal, objetivo);

  const oculto = S.config?.ocultarSaldo === true;
  const m      = (n) => oculto ? SALDO_MASCARA_CUENTA : f(n);
  const enCero = montoTotal <= 0;

  const niveles = nivelesFondo(colchon);
  const actual  = niveles.find(n => n.estado === 'actual') ?? null;
  const ultimoLogrado = [...niveles].reverse().find(n => n.estado === 'logrado') ?? null;

  // La oferta de seguir nombra su destino ("Subir mi meta a 6 meses"): un botón
  // que solo dice "subir" obliga a abrir el formulario para saber a cuánto.
  const siguienteNivel = NIVELES_FONDO.find(n => n.meses > metaMeses) ?? null;

  const compromisoMensual = Number(S.ahorro?.compromisoMensual) || 0;

  return `
    <article class="fondo-card" data-dom="ahorro" aria-label="Fondo de emergencia">
      ${_renderNivelActual({ enCero, completado, ultimoLogrado, actual })}
      ${_renderCobertura({ colchon, metaMeses, porcentaje, enCero })}
      ${_renderEscalera(niveles, completado, enCero)}
      ${_renderVeredictoFondo({ completado, faltante, objetivo, montoTotal, metaMeses, actual, sugerencia, enCero, m })}
      ${_renderDatosFondo({ montoTotal, objetivo, gastosFijosMensuales, compromisoMensual, tasaAhorro, metaMeses, enCero, m })}
      <p class="fondo-card__nota">Este dinero sigue en tus cuentas. Solo queda apartado para emergencias: a diferencia de Metas y Apartados, no descuenta saldo.</p>
      <div class="fondo-card__acciones">
        <button class="fondo-card__principal" type="button" data-action="ahorro-nuevo-aporte">
          ${enCero ? 'Hacer mi primer aporte' : 'Registrar un aporte'}
        </button>
        <div class="fondo-card__secundarias">
          <button class="btn btn-ghost btn-sm fondo-card__secundaria" type="button" data-action="ahorro-editar">
            ${completado && siguienteNivel ? `Subir mi meta a ${siguienteNivel.meses} meses` : 'Editar'}
          </button>
        </div>
      </div>
    </article>

    ${_renderHabitoSection(aportes, compromisoMensual, tasaAhorro, sugerencia)}`;
}

/**
 * El bloque de identidad de la tarjeta. En cero no se dice "0 meses cubiertos"
 * como cifra grande: se nombra el nivel al que va, que es la única lectura que
 * no desanima en el momento más frágil.
 */
function _renderNivelActual({ enCero, completado, ultimoLogrado, actual }) {
  let kicker = 'Ya tienes';
  let nombre = ultimoLogrado?.logrado ?? '';

  if (enCero || (!ultimoLogrado && actual)) {
    // Sin ningún nivel logrado el próximo es siempre el primero, así que el
    // nombre no se deriva: es el paso que el usuario tiene enfrente.
    kicker = 'Vas a empezar';
    nombre = 'Tu primer mes';
  } else if (completado) {
    kicker = 'Lo lograste';
  }

  return `
      <div class="fondo-card__nivel">
        <p class="fondo-card__kicker">${kicker}</p>
        <p class="fondo-card__nivel-nombre">${_esc(nombre)}</p>
      </div>`;
}

/**
 * La prueba: la fecha hasta la que alcanza el fondo y los meses del calendario
 * que cubre. La frase dice **"si hoy dejaras"** a propósito: la fecha es
 * hipotética y sin esa apertura parecería un pronóstico.
 */
function _renderCobertura({ colchon, metaMeses, porcentaje, enCero }) {
  if (colchon === null) {
    return `
      <p class="fondo-card__frase">Registra tus gastos fijos desde Calendario y Finko calcula cuánto tiempo te cubre el fondo.</p>`;
  }

  const bloques = bloquesCobertura(colchon, metaMeses, hoy());
  const mesCorto = formateadorFecha('es-CO', { month: 'short', timeZone: 'UTC' });

  const bloquesHtml = bloques.map(b => `
          <span class="fondo-card__bloque">
            <span class="fondo-card__bloque-fill" style="width:${b.pct}%"></span>
            <span class="fondo-card__bloque-mes">${_esc(mesCorto.format(new Date(`${b.mesISO}T12:00:00Z`)))}</span>
          </span>`).join('');

  const hasta = fechaCobertura(colchon, hoy());
  const frase = enCero || !hasta
    ? 'Todavía no tienes días cubiertos. El primer aporte ya te compra tiempo.'
    : `Si hoy dejaras de recibir ingresos, cubres tus gastos hasta el <strong>${fechaLegible(hasta)}</strong>`;

  return `
      <div class="fondo-card__cobertura">
        <p class="fondo-card__frase">${frase}</p>
        <div class="fondo-card__bloques" aria-hidden="true">${bloquesHtml}</div>
        <p class="fondo-card__bloques-pie">
          <span>${_pieCobertura(colchon, metaMeses)}</span>
          <span>${porcentaje}%</span>
        </p>
      </div>`;
}

/**
 * El rótulo bajo los bloques. Con la meta cubierta "3 meses de 3 meses" repite
 * la cifra dos veces para decir una sola cosa: que están completos.
 *
 * @param {number} colchon   meses cubiertos.
 * @param {number} metaMeses meses que el usuario apunta a cubrir.
 * @returns {string}
 */
function _pieCobertura(colchon, metaMeses) {
  const plural = metaMeses === 1 ? 'mes' : 'meses';
  return colchon >= metaMeses
    ? `${metaMeses} ${plural} completos`
    : `${mesesEnPalabras(colchon)} de ${metaMeses} ${plural}`;
}

/**
 * La escalera de niveles. Un porcentaje muy bajo se dice con palabras: recién
 * cruzada la meta, el avance hacia el nivel siguiente es del 3%, y mostrarlo
 * justo en el momento de celebrar convierte el logro en una cuenta pendiente.
 *
 * En cero no se dice ni un porcentaje ni "apenas empiezas": el nivel todavía no
 * se empezó, así que la palabra es **próximo**. Decir "apenas empiezas" cuando
 * no se ha puesto un peso suena a reproche.
 */
function _renderEscalera(niveles, completado, enCero) {
  const filas = niveles.map(n => {
    let estadoHtml = '';
    if (n.estado === 'logrado') {
      estadoHtml = '<span class="fondo-card__nivel-estado">logrado</span>';
    } else if (n.estado === 'actual') {
      if (enCero) {
        estadoHtml = '<span class="fondo-card__nivel-estado">próximo</span>';
      } else {
        estadoHtml = (completado || n.pct < 10)
          ? '<span class="fondo-card__nivel-estado">apenas empiezas</span>'
          : `<span class="fondo-card__nivel-estado">vas en ${n.pct}%</span>`;
      }
    }
    return `
        <li class="fondo-card__nivel-fila fondo-card__nivel-fila--${n.estado}">
          <span class="fondo-card__punto" aria-hidden="true"></span>
          <span class="fondo-card__nivel-tx">${_esc(n.titulo)} · ${_esc(n.consecuencia)}</span>
          ${estadoHtml}
        </li>`;
  }).join('');

  return `<ul class="fondo-card__niveles" role="list">${filas}</ul>`;
}

/**
 * La línea que dice qué hacer. Con la meta cumplida celebra primero y ofrece
 * después: seguir hasta el nivel siguiente es una oferta, no un reproche.
 */
function _renderVeredictoFondo({ completado, faltante, objetivo, montoTotal, metaMeses, actual, sugerencia, enCero, m }) {
  if (objetivo <= 0) return '';

  // Estado 2 (recién activado): en cero, "te faltan $4.382.700 para tu meta" es
  // la lectura que más desanima en el momento más frágil. El veredicto apunta al
  // primer nivel, que es el paso que el usuario tiene enfrente y cuesta un
  // tercio de la meta.
  if (enCero && actual) {
    const objetivoNivel = Math.round(actual.meses * (objetivo / metaMeses));
    if (sugerencia?.monto > 0 && objetivoNivel > 0) {
      const mesesNivel = Math.max(1, Math.ceil(objetivoNivel / sugerencia.monto));
      return `<p class="fondo-card__veredicto">Guardando ${m(sugerencia.monto)} al mes, en ${mesesNivel} ${mesesNivel === 1 ? 'mes' : 'meses'} llegas a tu primer nivel.</p>`;
    }
    return `<p class="fondo-card__veredicto">Tu primer nivel son ${m(objetivoNivel)}: un mes de lo que pagas sí o sí.</p>`;
  }

  if (completado) {
    if (!actual) {
      return `<p class="fondo-card__veredicto">Cumpliste tu meta de ${metaMeses} ${metaMeses === 1 ? 'mes' : 'meses'}. Cada aporte extra suma colchón.</p>`;
    }
    const costoMes      = objetivo / metaMeses;
    const objetivoNivel = Math.round(actual.meses * costoMes);
    const faltaNivel    = Math.max(0, objetivoNivel - montoTotal);
    return `<p class="fondo-card__veredicto">Cumpliste tu meta. Si quieres seguir, ${actual.titulo.toLowerCase()} son ${m(objetivoNivel)}: te faltan ${m(faltaNivel)}.</p>`;
  }

  const ritmo = sugerencia?.monto > 0 && sugerencia?.meses
    ? ` Guardando ${m(sugerencia.monto)} al mes llegas en ${sugerencia.meses} ${sugerencia.meses === 1 ? 'mes' : 'meses'}.`
    : '';

  return `<p class="fondo-card__veredicto">Te faltan ${m(faltante)} para tu meta.${ritmo}</p>`;
}

/** Las líneas de detalle del pie, en lenguaje de todos los días. */
function _renderDatosFondo({ montoTotal, objetivo, gastosFijosMensuales, compromisoMensual, tasaAhorro, metaMeses, enCero, m }) {
  const lineas = [];

  if (enCero && objetivo > 0) {
    // "Tienes $0 de $4.382.700" es la misma cifra dicha de la peor manera. El
    // "hoy" además advierte que el objetivo se mueve cuando cambian los gastos.
    lineas.push(`<p class="fondo-card__dato fondo-card__dato--fuerte">Tu meta es cubrir ${metaMeses} ${metaMeses === 1 ? 'mes' : 'meses'}: hoy son ${m(objetivo)}</p>`);
  } else {
    lineas.push(objetivo > 0
      ? `<p class="fondo-card__dato fondo-card__dato--fuerte">Tienes ${m(montoTotal)} de ${m(objetivo)}</p>`
      : `<p class="fondo-card__dato fondo-card__dato--fuerte">Tienes ${m(montoTotal)}</p>`);
  }

  if (gastosFijosMensuales > 0) {
    lineas.push(`<p class="fondo-card__dato">Cada nivel es un mes más de lo que pagas sí o sí (${m(gastosFijosMensuales)})</p>`);
  }

  const partesHabito = [];
  if (compromisoMensual > 0) partesHabito.push(`Te propusiste guardar ${m(compromisoMensual)} cada mes`);
  // Una proporción no revela cuánto dinero hay, así que no se enmascara.
  if (tasaAhorro !== null && tasaAhorro > 0) partesHabito.push(`de cada $100 que recibes, guardas $${tasaAhorro}`);
  if (partesHabito.length > 0) {
    lineas.push(`<p class="fondo-card__dato">${partesHabito.join(' · ')}</p>`);
  }

  return `<div class="fondo-card__datos">${lineas.join('')}</div>`;
}

// ── SECCIÓN DE HÁBITO (aportes + compromiso + tasa) ──────────────

function _renderHabitoSection(aportes, compromisoMensual, tasaAhorro, sugerencia = null) {
  const ordenados = ordenarAportesPorFecha(aportes);

  // AH.2: si no hay compromiso definido y hay una sugerencia con datos
  // reales, la pregunta viene acompañada del punto de partida.
  const hintSugerido = (sugerencia && sugerencia.monto > 0)
    ? ` Según tus números, ${f(sugerencia.monto)} es un buen punto de partida.`
    : '';

  // DIS.12 (hallazgo A6): el compromiso usaba `i-deudas`, el símbolo que
  // identifica la sección Deudas en la navegación y en cada tarjeta de crédito.
  // La metáfora era la contraria: lo que debes marcando lo que apartas.
  // `i-recurring` es el mismo símbolo de recurrencia que ya marca los gastos
  // fijos en Calendario e Inicio, que es exactamente lo que esto es.
  const compromisoHtml = compromisoMensual > 0
    ? `<div class="ahorro-habito__compromiso">
        <span>${icon('recurring')} Compromiso mensual: <strong>${f(compromisoMensual)}</strong></span>
        <button class="btn btn-ghost btn-sm" data-action="ahorro-editar-compromiso"
                aria-label="Editar compromiso mensual">Editar</button>
      </div>`
    : `<p class="ahorro-habito__sin-compromiso">
        ¿Cuánto quieres apartar cada mes?${hintSugerido}
        <button class="btn btn-ghost btn-sm" data-action="ahorro-editar-compromiso">Definir →</button>
      </p>`;

  const listaHtml = ordenados.length === 0
    ? `<p class="ahorro-habito__empty">Aún no has registrado aportes. Cada vez que apartes dinero para el fondo, regístralo aquí.</p>`
    : `<ul class="ahorro-habito__lista" role="list">
        ${ordenados.map(_renderAporteItem).join('')}
      </ul>`;

  const tasaHtml = tasaAhorro !== null
    ? _renderNudgeTasa(tasaAhorro)
    : '';

  // DIS.16: el botón de registrar se fue de este encabezado. La acción principal
  // de la sección vive ahora en la tarjeta, a ancho completo, y tenerla dos
  // veces en la misma pantalla la volvía ruido (regla R1: un primario).
  return `
    <section class="ahorro-habito" aria-label="Historial de aportes">
      <div class="ahorro-habito__header">
        <h2 class="ahorro-habito__title">Aportes al fondo</h2>
      </div>
      ${compromisoHtml}
      ${listaHtml}
      ${tasaHtml}
    </section>`;
}

/**
 * Fila de un aporte al fondo.
 *
 * DIS.12 (hallazgo A5, regla R2): antes el monto era el `list-item__title` y la
 * fecha el subtítulo, sin teja y sin `list-item__amount`. Quedaba una columna
 * de cifras grandes sin sujeto, alineadas a la izquierda, imposibles de
 * comparar de un vistazo. Acá vale la anatomía del resto de la app
 * (Movimientos, Deudas, Me deben): el título es el sujeto (la fecha), la nota
 * acompaña como subtítulo y el monto vive en su columna derecha, tabular.
 *
 * @param {{id:string, monto:number, fecha:string, nota?:string}} aporte
 */
function _renderAporteItem(aporte) {
  const nota = aporte.nota ? _esc(aporte.nota) : 'Aporte al fondo';
  return `
    <li class="list-item" data-id="${_esc(aporte.id)}">
      <div class="list-item__icon" aria-hidden="true">${tejaCategoria('i-ahorro', 'ahorro')}</div>
      <div class="list-item__body">
        <p class="list-item__title">${fechaLegible(aporte.fecha)}</p>
        <p class="list-item__subtitle">${nota}</p>
      </div>
      <div class="list-item__meta">
        <p class="list-item__amount">+${f(aporte.monto)}</p>
      </div>
      <div class="list-item__action">
        <button class="btn btn-ghost btn-icon"
                data-action="ahorro-eliminar-aporte"
                data-id="${_esc(aporte.id)}"
                aria-label="Eliminar aporte de ${f(aporte.monto)}">
          <svg class="icon" aria-hidden="true"><use href="#i-trash"/></svg>
        </button>
      </div>
    </li>`;
}

function _renderNudgeTasa(tasaAhorro) {
  let icono, titulo, desc, nivel;

  if (tasaAhorro >= 20) {
    icono = icon('trophy'); nivel = 'nudge-success';
    titulo = `Excelente: ahorras el ${tasaAhorro}% de tus ingresos este mes.`;
    desc   = 'Superas el umbral recomendado del 20%. ¡Sigue así!';
  } else if (tasaAhorro >= 10) {
    icono = icon('inversion'); nivel = 'nudge-info';
    titulo = `Ahorras el ${tasaAhorro}% de tus ingresos este mes.`;
    desc   = 'Vas bien. La meta recomendada es el 20%. Un poco más y llegas.';
  } else if (tasaAhorro > 0) {
    icono = icon('lightbulb'); nivel = 'nudge-medium';
    titulo = `Ahorras el ${tasaAhorro}% de tus ingresos este mes.`;
    desc   = 'Antes de recortar el ahorro, revisa tus gastos de estilo de vida (entretenimiento, salidas, suscripciones). Son los más fáciles de ajustar.';
  } else if (tasaAhorro === 0) {
    icono = icon('alert'); nivel = 'nudge-medium';
    titulo = 'Este mes tus gastos igualan tus ingresos.';
    desc   = 'Revisa primero tus gastos de estilo de vida: entretenimiento, salidas, suscripciones. Son más fáciles de reducir que los fijos.';
  } else {
    icono = icon('alert'); nivel = 'nudge-high';
    titulo = `Este mes tus gastos superan tus ingresos en ${Math.abs(tasaAhorro)}%.`;
    desc   = 'Antes de tocar el ahorro, reduce gastos de estilo de vida. Si no alcanza, revisa tus gastos fijos.';
  }

  // DIS.12 (hallazgo A7, regla R55): el nivel alto (los gastos del mes superan
  // los ingresos) interrumpe; `status` es un aviso cortés y el lector espera
  // una pausa. Mismo criterio que `_renderNudge()` en Límites de gasto.
  const rol = nivel === 'nudge-high' ? 'alert' : 'status';

  return `
    <div class="nudge ${nivel}" role="${rol}">
      <span class="nudge__icon" aria-hidden="true">${icono}</span>
      <div class="nudge__body">
        <p class="nudge__title">${titulo}</p>
        <p class="nudge__desc">${desc}</p>
      </div>
    </div>`;
}

// ── FORMULARIO MODAL - FONDO (activar / editar) ──────────────────

/**
 * HTML del formulario para activar el fondo o editarlo (monto base + meta de meses).
 *
 * @param {Object} opts
 * @param {boolean} opts.editando
 * @param {number}  opts.metaMeses
 * @param {number}  opts.montoActual
 * @param {number}  opts.gastosFijosMensuales
 * @returns {string}
 */
export function renderFormFondo({ editando, metaMeses, montoActual, gastosFijosMensuales }) {
  const objetivoPreview = calcularObjetivoFondo(gastosFijosMensuales, metaMeses);
  const previewHtml = objetivoPreview > 0
    ? `<p class="form-hint">Con esa meta tu objetivo sería <strong>${f(objetivoPreview)}</strong>: ${metaMeses} ${metaMeses === 1 ? 'mes' : 'meses'} × ${f(gastosFijosMensuales)}, que es lo que suman al mes tus gastos fijos de Calendario (arriendo, servicios, cuotas...).</p>`
    : `<p class="form-hint">Aún no hay gastos fijos registrados. Cuando los agregues desde Calendario, Finko calcula automáticamente el objetivo.</p>`;

  // DIS.12 (hallazgo A3, regla R53): al editar, "Desactivar fondo" ocupaba el
  // sitio de Cancelar con el mismo `btn-ghost` y el mismo aspecto, y Cancelar
  // no existía: en todos los demás formularios de Finko ese lugar es la salida
  // sin consecuencias. Ahora Cancelar vuelve a su sitio y la acción destructiva
  // baja a su propia fila, separada por un filete y con `.btn-danger`.
  const desactivarHtml = `
      <div class="modal__footer-secundario">
        <button type="button" class="btn btn-danger btn-sm" data-action="ahorro-desactivar">Desactivar fondo</button>
      </div>`;

  return `
    <form id="form-fondo" novalidate>
      <div class="form-group">
        <label for="fondo-meta-meses" class="label">Meses de gastos fijos que quieres cubrir</label>
        <input id="fondo-meta-meses" name="metaMeses" class="input" type="number"
               min="${META_MESES_MIN}" max="${META_MESES_MAX}" step="1"
               value="${metaMeses}" required aria-required="true"
               inputmode="numeric" />
        <p class="form-hint">Recomendado: 3 meses si tienes ingresos estables, 6 si son variables.</p>
      </div>

      <div class="form-group">
        <label for="fondo-monto-actual" class="label">¿Cuánto ya tienes apartado? (COP)</label>
        <input id="fondo-monto-actual" name="montoActual" class="input" type="number"
               min="0" step="10000" value="${montoActual}"
               placeholder="0" required aria-required="true"
               inputmode="numeric" />
        <p class="form-hint">Si todavía no tienes nada, déjalo en 0. Lo vas a ir sumando con cada aporte.</p>
      </div>

      ${previewHtml}

      <div class="modal__footer">
        <button type="button" class="btn btn-ghost" data-action="modal-close">Cancelar</button>
        <button type="submit" class="btn btn-primary">${editando ? 'Guardar cambios' : 'Activar fondo'}</button>
      </div>

      ${editando ? desactivarHtml : ''}
    </form>`;
}

// ── FORMULARIO MODAL - APORTE (J.1b) ─────────────────────────────

/**
 * HTML del formulario para registrar un nuevo aporte al fondo.
 *
 * @param {{ fecha: string, sugerencia?: {monto:number, base:string}|null }} opts
 *   `fecha` en YYYY-MM-DD (default: hoy). `sugerencia` (AH.5a) es la salida de
 *   `calcularAporteSugerido()` (AH.2): con un monto > 0 prellena el campo en
 *   vez de dejarlo en blanco (el mismo número que ya se sugiere para el
 *   compromiso mensual). Sigue siendo editable.
 * @returns {string}
 */
export function renderFormAporte({ fecha, sugerencia = null }) {
  const montoSugerido = sugerencia?.monto > 0 ? sugerencia.monto : null;
  const valorHtml   = montoSugerido ? ` value="${montoSugerido}"` : '';
  const hintPrefill = montoSugerido
    ? 'Prellenado con lo que te conviene apartar este mes, según tus ingresos y gastos. Puedes cambiarlo. Registrarlo no descuenta tus cuentas: el dinero sigue ahí, solo queda marcado como reservado.'
    : '¿Cuánto apartaste para el fondo? Registrarlo no descuenta tus cuentas: el dinero sigue ahí, solo queda marcado como reservado.';

  return `
    <form id="form-aporte" novalidate>
      <div class="form-group">
        <label for="aporte-monto" class="label">Monto del aporte (COP)</label>
        <input id="aporte-monto" name="monto" class="input" type="number"
               min="1" step="10000" placeholder="100000"${valorHtml}
               required aria-required="true" inputmode="numeric" autofocus />
        <p class="form-hint">${hintPrefill}</p>
      </div>

      <div class="form-group">
        <label for="aporte-fecha" class="label">Fecha</label>
        <input id="aporte-fecha" name="fecha" class="input" type="date"
               value="${_esc(fecha)}" required aria-required="true" />
      </div>

      <div class="form-group">
        <label for="aporte-nota" class="label">Nota (opcional)</label>
        <input id="aporte-nota" name="nota" class="input" type="text"
               maxlength="80" placeholder="Ej. Parte de la quincena de mayo"
               autocomplete="off" />
      </div>

      <div class="modal__footer">
        <button type="button" class="btn btn-ghost" data-action="modal-close">Cancelar</button>
        <button type="submit" class="btn btn-primary">Guardar aporte</button>
      </div>
    </form>`;
}

// ── FORMULARIO MODAL - COMPROMISO MENSUAL (J.1b) ─────────────────

/**
 * HTML del formulario para definir o editar el compromiso mensual de ahorro
 * ("págate primero": cuánto se compromete el usuario a apartar cada mes).
 *
 * @param {number}      compromisoMensual Valor actual. 0 = sin compromiso.
 * @param {Object|null} sugerencia        Aporte sugerido (AH.2), salida de
 *                                        calcularAporteSugerido. null = sin caja.
 * @returns {string}
 */
export function renderFormCompromisoMensual(compromisoMensual, sugerencia = null) {
  // AH.2: sin ingresos registrados, la sugerencia pide el promedio mensual
  // para afinarse. El valor no se guarda: solo recalcula la caja en vivo.
  const inputIngresoHtml = sugerencia?.base === 'sin-ingreso'
    ? `
      <div class="form-group">
        <label for="sugerencia-ingreso" class="label">¿Cuánto recibes al mes, aproximadamente? (COP) <span class="form-optional">opcional</span></label>
        <input id="sugerencia-ingreso" class="input" type="number"
               min="0" step="10000" placeholder="Ej. 1500000" inputmode="numeric" />
        <p class="form-hint">Solo se usa para afinar la sugerencia de abajo. No se guarda.</p>
      </div>`
    : '';

  const cajaHtml = sugerencia
    ? `<div id="caja-sugerencia">${renderCajaSugerencia(sugerencia)}</div>`
    : '';

  return `
    <form id="form-compromiso" novalidate>
      <div class="form-group">
        <label for="compromiso-monto" class="label">¿Cuánto quieres apartar por mes? (COP)</label>
        <input id="compromiso-monto" name="compromisoMensual" class="input" type="number"
               min="0" step="10000" value="${Number(compromisoMensual) || 0}"
               placeholder="0" inputmode="numeric" autofocus />
        <p class="form-hint">Pon 0 para quitar el compromiso. Es un recordatorio personal: no afecta tu saldo hasta que registres el aporte.</p>
      </div>

      ${inputIngresoHtml}
      ${cajaHtml}

      <div class="modal__footer">
        <button type="button" class="btn btn-ghost" data-action="modal-close">Cancelar</button>
        <button type="submit" class="btn btn-primary">Guardar</button>
      </div>
    </form>`;
}

/**
 * Caja con el aporte sugerido y su explicación (AH.2). Reutilizada por el
 * form del compromiso mensual (render inicial y recálculo en vivo cuando el
 * usuario escribe su ingreso promedio).
 *
 * @param {{ monto: number, base: string, razones: string[] }|null} sugerencia
 * @returns {string}
 */
export function renderCajaSugerencia(sugerencia) {
  if (!sugerencia) return '';
  const { monto, base, razones } = sugerencia;
  const razonesHtml = (razones ?? []).map(r => `<p class="nudge__desc">${r}</p>`).join('');

  if (monto <= 0) {
    const nivel = base === 'deficit' ? 'nudge-high' : 'nudge-success';
    const icono = base === 'deficit' ? icon('alert') : icon('trophy');
    return `
      <div class="nudge ${nivel}" role="status">
        <span class="nudge__icon" aria-hidden="true">${icono}</span>
        <div class="nudge__body">${razonesHtml}</div>
      </div>`;
  }

  return `
    <div class="nudge nudge-info" role="status">
      <span class="nudge__icon" aria-hidden="true">${icon('lightbulb')}</span>
      <div class="nudge__body">
        <p class="nudge__title">Sugerido: ${f(monto)} al mes</p>
        ${razonesHtml}
        <button type="button" class="btn btn-ghost btn-sm"
                data-action="ahorro-usar-sugerido" data-monto="${monto}">Usar este monto</button>
      </div>
    </div>`;
}

// `_fmtMeses` se retiró en DIS.16: decía "1,8 meses", que es lenguaje de hoja
// de cálculo para la cifra más importante de la sección. Lo reemplaza
// `mesesEnPalabras()` en logic.js, que dice "1 mes y 3 semanas".

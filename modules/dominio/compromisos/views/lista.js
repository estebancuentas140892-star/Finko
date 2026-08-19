/**
 * compromisos/views/lista.js - lista de deudas en la sección Compromisos.
 *
 * Renderiza `#lista-compromisos` con el orden estratégico aplicado (cuando hay
 * una estrategia activa) o por urgencia de vencimiento. El estado de la
 * estrategia se lee desde `views/estrategia.js` (singleton `_uiEstrategia`).
 *
 * Puede leer S. No puede mutarlo. Sin lógica de negocio.
 */

import { S } from '../../../core/state.js';
import { f, esc as _esc, formateadorFecha, hoy } from '../../../infra/utils.js';
import { icon, emptyArt, tejaCategoria } from '../../../infra/icons.js';
import { SALDO_MASCARA_CUENTA } from '../../../infra/render.js';
import { resolverMarca, tejaMarca } from '../../../infra/marcas.js';
import {
  compromisosActivos,
  proximoVencimiento,
  urgencia,
  filtrarDeudasPagables,
  fechaUltimoAbono,
  esDeuda,
  tasaEADe,
  estadoPagoMes,
  vencidosSinPagar,
  LABEL_TIPO,
  ICONO_TIPO,
} from '../logic.js';
import { getEstrategiaUI } from './estrategia.js';
import { CATEGORIA_DEUDA_ICONO, CATEGORIA_DEUDA_PERSONAL_ICONO, iconoDeCategoriaGasto } from '../../../core/constants.js';

// Lookup unificado: producto (entidad) + relación (personal). Sin colisiones:
// el único label compartido ('Otro'/'Otra') difiere y ambos usan c-otros.
const _ICONO_DEUDA = { ...CATEGORIA_DEUDA_ICONO, ...CATEGORIA_DEUDA_PERSONAL_ICONO };

/**
 * Los vencidos del mes en curso, indexados por id, con su atraso en días.
 *
 * **Fuente única del conjunto** (`vencidosSinPagar`): la misma que cuentan la
 * pastilla de la pestaña "Por pagar" y "Pendientes del mes" en Inicio (criterio
 * de la ficha 01), y la misma que filtra la tarjeta de pago en lote. Se calcula
 * una vez por render y se pasa a cada tarjeta.
 *
 * @returns {Map<string, number>} id → días de atraso.
 */
function _atrasoPorId() {
  const vencidos = vencidosSinPagar(S.compromisos ?? [], S.gastos ?? [], hoy());
  return new Map(vencidos.map(v => [v.id, v.diasAtraso]));
}

/**
 * Chip de vencimiento de una tarjeta de "Por pagar" (ficha 05, ADR 069).
 *
 * **Mira primero lo vencido de ESTE mes, y solo después el próximo pago.**
 * `proximoVencimiento()` siempre cuenta hacia adelante, así que una cuota que
 * venció el 8 y sigue sin pagar decía "Vence en 21 días": la tarjeta afirmaba
 * futuro sobre algo ya incumplido, justo debajo de la tarjeta de lote que
 * anunciaba esos mismos pagos como vencidos. Dos cifras del mismo dato en una
 * pantalla, y la de la tarjeta era la falsa.
 *
 * Qué cuenta como vencido no se decide acá: sale de `_atrasoPorId()`, para que
 * el chip, la tarjeta de lote y la pastilla de la pestaña nunca discrepen (un
 * compromiso registrado este mes después de su día de pago, por ejemplo, no
 * está vencido: no se puede deber lo que no existía).
 *
 * Cubierto el mes (fijo pagado, o cuota de deuda completa) el chip pasa a
 * neutro y afirma el pago: es el estado terminal del mes (regla R7).
 *
 * @param {import('../../../core/state.js').Compromiso} compromiso
 * @param {string} prefijoMes 'YYYY-MM' del mes en curso.
 * @param {Map<string, number>} atrasos Salida de `_atrasoPorId()`.
 * @returns {{clase:string, label:string}}
 */
function _chipVencimiento(compromiso, prefijoMes, atrasos) {
  if (estadoPagoMes(S.gastos ?? [], compromiso, prefijoMes) === 'completo') {
    return { clase: 'chip', label: 'Pagado este mes' };
  }

  const atraso = atrasos?.get(compromiso.id);
  if (Number.isInteger(atraso)) {
    return {
      clase: 'chip chip-danger',
      label: atraso === 0 ? 'Vence hoy'
        : atraso === 1 ? 'Venció ayer'
        : `Venció hace ${atraso} días`,
    };
  }

  const dias  = proximoVencimiento(compromiso);
  const nivel = urgencia(compromiso);
  const clase = nivel === 'urgente' ? 'chip chip-danger'
    : nivel === 'proximo' ? 'chip chip-warning'
    : 'chip';
  const label = dias === 0 ? 'Vence hoy'
    : dias === 1 ? 'Vence mañana'
    : `Vence en ${dias} días`;
  return { clase, label };
}

/**
 * Renderiza la lista de "Por pagar" en `#lista-compromisos`: fijos y deudas
 * (entidad + personal), los tres tipos que hoy cubre la sección (ficha 05,
 * ADR 069). Antes (v6) esta lista solo mostraba deudas: los fijos se creaban
 * y administraban desde Agenda.
 *
 * Orden de las deudas:
 *  - Si hay ≥ 2 deudas pagables con la estrategia activa, se respeta el orden
 *    de pago de la estrategia (avalancha = tasa↓, bola = saldo↑).
 *  - Si no, se ordena por urgencia de vencimiento (días al próximo pago).
 * Los fijos van en su propio grupo, ordenados por urgencia: no participan de
 * la estrategia de pago (no tienen tasa que optimizar).
 *
 * No-op si el contenedor no existe.
 */
export function renderListaCompromisos() {
  const el = document.getElementById('lista-compromisos');
  if (!el) return;

  const activos = compromisosActivos(S.compromisos);
  const fijos   = activos.filter(c => c.tipo === 'fijo');
  const deudas  = activos.filter(c => esDeuda(c.tipo));

  if (fijos.length === 0 && deudas.length === 0) {
    el.innerHTML = _renderEmptyState();
    return;
  }

  const oculto = S.config?.ocultarSaldo === true;
  // Un solo cálculo del conjunto de vencidos para todas las tarjetas del render.
  const atrasos = _atrasoPorId();

  el.innerHTML = _renderGrupoFijos(fijos, oculto, atrasos)
    + _renderGrupoDeudas(deudas, oculto, atrasos);
}

/**
 * Grupo "Tus gastos fijos": tarjetas simples, con lo vencido primero y el resto
 * por urgencia de vencimiento. Vacío si no hay ninguno (no repite el empty
 * state general).
 */
function _renderGrupoFijos(fijos, oculto, atrasos) {
  if (fijos.length === 0) return '';

  // Lo vencido va arriba, y entre vencidos manda el atraso más grande: es el
  // mismo orden con el que "Pendientes del mes" lista en Inicio.
  const ordenados = [...fijos].sort((a, b) => {
    const atA = atrasos.get(a.id);
    const atB = atrasos.get(b.id);
    if (Number.isInteger(atA) !== Number.isInteger(atB)) return Number.isInteger(atA) ? -1 : 1;
    if (Number.isInteger(atA) && atA !== atB) return atB - atA;
    return proximoVencimiento(a) - proximoVencimiento(b);
  });
  const prefijoMes = hoy().slice(0, 7);

  return `
    <div class="grupo-eyebrow-fila">
      <p class="grupo-eyebrow">Tus gastos fijos</p>
    </div>
    ${ordenados.map(c => _renderFijoItem(c, oculto, prefijoMes, atrasos)).join('')}`;
}

/**
 * Grupo "Tus deudas": mismo render y mismo orden estratégico de siempre.
 * Vacío si no hay ninguna (no repite el empty state general).
 */
function _renderGrupoDeudas(deudas, oculto, atrasos) {
  if (deudas.length === 0) return '';

  // Orden estratégico: si la estrategia tiene un orden definido para las deudas
  // pagables, las priorizamos según ese orden (1°, 2°, 3°…). El resto va al final
  // por urgencia.
  const pagables = filtrarDeudasPagables(S.compromisos);
  const { estrategia } = getEstrategiaUI();
  let ordenEstrategia = null;
  if (pagables.length >= 1) {
    const sortFn = estrategia === 'bolaNieve'
      ? (a, b) => a.saldo - b.saldo
      : (a, b) => b.tasaEA - a.tasaEA;
    const ordenadas = [...pagables].sort(sortFn);
    ordenEstrategia = new Map(ordenadas.map((d, i) => [d.id, i + 1]));
  }

  const ordenados = [...deudas].sort((a, b) => {
    const posA = ordenEstrategia?.get(a.id) ?? Infinity;
    const posB = ordenEstrategia?.get(b.id) ?? Infinity;
    if (posA !== posB) return posA - posB;
    return proximoVencimiento(a) - proximoVencimiento(b);
  });

  // D.16d (ADR 036 D5): encabezado de grupo con el indicador de la estrategia
  // activa a la derecha (solo cuando el usuario ya eligió una: el orden por
  // defecto no se anuncia como decisión).
  const extraHtml = (ordenEstrategia && estrategia)
    ? `<span class="grupo-eyebrow-fila__extra">
         ${icon(estrategia === 'bolaNieve' ? 'snowball' : 'mountain')}
         Orden ${estrategia === 'bolaNieve' ? 'Bola de nieve' : 'Avalancha'}
       </span>`
    : '';
  const headerHtml = `
    <div class="grupo-eyebrow-fila">
      <p class="grupo-eyebrow">Tus deudas</p>
      ${extraHtml}
    </div>`;

  const prefijoMes = hoy().slice(0, 7);

  return headerHtml + ordenados.map((c) => {
    const orden = ordenEstrategia?.get(c.id) ?? null;
    return _renderCompromisoItem(c, orden, oculto, prefijoMes, atrasos);
  }).join('');
}

/**
 * Tarjeta de gasto fijo (ficha 05, ADR 069): más simple que la de deuda, sin
 * saldo ni tasa ni orden de estrategia. "Marcar pagado" reusa el mismo
 * `data-action` del detalle del día del Calendario (`agenda-marcar-pagado-fijo`,
 * manejado por `agenda/index.js`); acá siempre es el mes en curso, porque
 * esta lista no navega meses.
 *
 * @param {import('../../../core/state.js').Compromiso} compromiso
 * @param {boolean} oculto `S.config.ocultarSaldo`
 * @param {string} prefijoMes 'YYYY-MM' del mes en curso.
 */
function _renderFijoItem(compromiso, oculto, prefijoMes, atrasos) {
  const desc  = _esc(compromiso.descripcion);
  const marca = resolverMarca(compromiso.descripcion);
  const iconoCat = compromiso.icono
    || (compromiso.categoria ? iconoDeCategoriaGasto(compromiso.categoria, S.categoriasPersonalizadas) : null);
  const icono = marca
    ? tejaMarca(marca)
    : tejaCategoria(iconoCat ?? 'i-recurring', 'agenda');

  const monto = Number(compromiso.monto) || 0;
  const montoTxt = oculto ? SALDO_MASCARA_CUENTA : f(monto);

  const pagado = estadoPagoMes(S.gastos ?? [], compromiso, prefijoMes) === 'completo';
  const { clase: chipClase, label: diasLabel } = _chipVencimiento(compromiso, prefijoMes, atrasos);

  const catChipLabel = compromiso.categoria ? _esc(compromiso.categoria) : 'Gasto fijo';
  const catChipIcono = iconoCat
    ? `<svg class="icon" aria-hidden="true"><use href="#${_esc(iconoCat)}"/></svg>`
    : icon('recurring');

  const btnPagar = pagado ? '' : `
       <button type="button" class="deuda-card__abonar"
               data-action="agenda-marcar-pagado-fijo" data-id="${_esc(compromiso.id)}"
               data-mes="${_esc(prefijoMes)}"
               aria-label="Marcar como pagado este mes: ${desc}">
         Marcar pagado</button>`;

  return `
    <article class="deuda-card" data-id="${_esc(compromiso.id)}">
      <div class="deuda-card__top">
        <div class="deuda-card__icon" aria-hidden="true">${icono}</div>
        <div class="deuda-card__info">
          <p class="deuda-card__nombre">${desc}</p>
          <p class="deuda-card__cuota">${_esc(compromiso.frecuencia)} · día ${compromiso.diaPago}</p>
        </div>
        <p class="deuda-card__saldo">${montoTxt}</p>
      </div>
      <div class="deuda-card__chips">
        <span class="${chipClase}" aria-label="${diasLabel}">${diasLabel}</span>
        <span class="chip">${catChipIcono} ${catChipLabel}</span>
      </div>
      <div class="deuda-card__acciones">
        ${btnPagar}
        <button class="btn btn-ghost btn-icon"
                data-action="agenda-editar-fijo"
                data-id="${_esc(compromiso.id)}"
                aria-label="Editar ${desc}"><svg class="icon" aria-hidden="true"><use href="#i-edit"/></svg></button>
        <button class="btn btn-ghost btn-icon"
                data-action="agenda-eliminar-fijo"
                data-id="${_esc(compromiso.id)}"
                aria-label="Eliminar ${desc}"><svg class="icon" aria-hidden="true"><use href="#i-trash"/></svg></button>
      </div>
    </article>`;
}

/**
 * Tarjeta de deuda (D.16d, ADR 036 D5/D6): teja de marca/categoría 44px con
 * el badge de orden superpuesto, chip de urgencia junto al nombre, saldo
 * prominente, chips de categoría y tasa, aviso de tasa desconocida como
 * callout ámbar, y acciones (Abonar con tinte de la sección + eliminar
 * ghost). Reemplaza al `.list-item` con hints apilados.
 *
 * @param {import('../../../core/state.js').Compromiso} compromiso
 * @param {number | null} ordenEstrategia 1-based: posición en la estrategia activa.
 * @param {boolean} oculto `S.config.ocultarSaldo`: enmascara el saldo (ADR 036 D7).
 * @param {string} prefijoMes 'YYYY-MM' del mes en curso (ficha 05: el chip de
 *   vencimiento mira lo vencido de este mes antes que el próximo pago).
 * @param {Map<string, number>} [atrasos] Salida de `_atrasoPorId()`. Se calcula
 *   una vez por render y baja a cada tarjeta; el default cubre a un caller
 *   suelto (ningún test la llama así hoy, pero la firma no debe romperse).
 */
function _renderCompromisoItem(compromiso, ordenEstrategia = null, oculto = false, prefijoMes = hoy().slice(0, 7), atrasos = _atrasoPorId()) {
  const desc     = _esc(compromiso.descripcion);
  const tipo     = compromiso.tipo;
  // MK.2/ID.3 (ADR 025): si el nombre de la deuda menciona una marca o
  // entidad conocida ("Tarjeta Bancolombia", "Crédito Nequi"), la teja de
  // marca es el ícono de la card; sin match, la teja de categoría (tipo de
  // deuda o relación) teñida con el color de su dominio; sin categoría, el
  // ícono genérico del tipo dentro de la misma teja.
  const dominio  = tipo === 'deuda-personal' ? 'personales' : 'compromisos';
  const marca    = resolverMarca(compromiso.descripcion);
  // CAT.2d: categoría 'Otra'/'Otro' con ícono elegido por el usuario prevalece
  // sobre el fijo `c-otros` del catálogo (`_ICONO_DEUDA` no tiene entrada para
  // ese ícono libre, así que va primero en la cadena de fallback).
  const iconoCat = compromiso.icono || _ICONO_DEUDA[compromiso.categoria];
  const icono    = marca
    ? tejaMarca(marca)
    : tejaCategoria(iconoCat ?? `i-${ICONO_TIPO[tipo] ?? 'recurring'}`, dominio);
  const label    = _esc(LABEL_TIPO[tipo] ?? tipo);
  const frec     = _esc(compromiso.frecuencia);
  const cuota    = Number(compromiso.cuotaMensual) || 0;
  const saldo    = Number(compromiso.saldoTotal) || 0;
  const tasaEA   = tasaEADe(compromiso) * 100;

  const esTipoDeuda = esDeuda(tipo);
  const saldada     = esTipoDeuda && saldo <= 0;

  // Ficha 05: el mismo chip que el gasto fijo, que mira lo vencido de este mes
  // antes que el próximo pago (ver `_chipVencimiento`). El label lleva siempre
  // su verbo para que se entienda solo: "17 días" a secas es ambiguo
  // (¿antigüedad? ¿atraso? ¿faltan?).
  const { clase: chipClase, label: diasLabel } = _chipVencimiento(compromiso, prefijoMes, atrasos);

  // R7 (estado terminal): una deuda saldada apaga todos sus indicadores de
  // futuro. Antes el chip de urgencia se emitía siempre, así que la última
  // cuota pagada se recibía con "Vence hoy" en rojo al lado de "Saldada" en
  // verde. Ahora el chip solo existe mientras quede saldo.
  const urgenciaChip = saldada
    ? ''
    : `<span class="${chipClase}" aria-label="${diasLabel}">${diasLabel}</span>`;

  // Tasa mostrada en la unidad original para que coincida con la entrada.
  // En entidad, tasa null = desconocida (el usuario no la registró): el chip
  // dice "Tasa por confirmar" y el callout de abajo lo explica, en vez de
  // afirmar "Sin interés".
  const tasaDesconocida  = compromiso.tasa === null || compromiso.tasa === undefined;
  const entidadSinTasa   = tasaDesconocida && tipo === 'deuda-entidad';

  // R7: la cuota y el día de pago también son futuro. En una deuda saldada el
  // subtítulo cuenta el cierre, no el próximo pago: la fecha del último abono
  // es el día en que quedó en cero. Sin abonos registrados (saldo editado a
  // mano) no hay fecha honesta, así que solo se afirma que no queda saldo.
  const subtitle = saldada
    ? _subtituloSaldada(fechaUltimoAbono(S.gastos ?? [], compromiso.id))
    : cuota > 0
    ? `Cuota ${f(cuota)}/mes · día ${compromiso.diaPago}`
    : `${frec} · día ${compromiso.diaPago}`;

  const ordenBadge = ordenEstrategia
    ? `<span class="orden-badge" aria-label="Orden ${ordenEstrategia} en la estrategia">${ordenEstrategia}°</span>`
    : '';

  // Chips de contexto (D.16d): categoría (o el tipo, si no hay categoría)
  // con el tinte de su dominio, y la tasa como chip propio. El color nunca
  // viaja solo: cada chip lleva ícono + texto (SC 1.4.11).
  const catChipLabel = compromiso.categoria ? _esc(compromiso.categoria) : label;
  const catChipMod   = tipo === 'deuda-personal' ? 'deuda-card__chip--personal' : 'deuda-card__chip--entidad';
  const catChipIcono = iconoCat
    ? `<svg class="icon" aria-hidden="true"><use href="#${iconoCat}"/></svg>`
    : icon(ICONO_TIPO[tipo] ?? 'recurring');

  let tasaChip;
  if (entidadSinTasa) {
    tasaChip = `<span class="chip deuda-card__chip--warn">${icon('percent')} Tasa por confirmar</span>`;
  } else if (compromiso.tasa > 0) {
    const tasaLabel = compromiso.tasaUnidad === 'mensual'
      ? `${Math.round(compromiso.tasa * 100)}% mensual`
      : `${Math.round(tasaEA)}% EA`;
    tasaChip = `<span class="chip">${icon('percent')} ${tasaLabel}</span>`;
  } else {
    tasaChip = `<span class="chip">${icon('check-circle')} Sin interés</span>`;
  }

  // MC.16a (ADR 051 D1): cupoTotal es el discriminador de "tarjeta operable".
  // disponible se deriva, nunca se almacena.
  const cupoChip = (Number(compromiso.cupoTotal) > 0)
    ? `<span class="chip">${icon('cuentas')} Disponible ${f(Math.max(Number(compromiso.cupoTotal) - saldo, 0))}</span>`
    : '';

  // D.12: aviso de tasa desconocida por deuda. D.16d lo asciende de línea de
  // texto con emoji a callout ámbar con ícono.
  const avisoTasa = (entidadSinTasa && !saldada)
    ? `<div class="deuda-card__aviso" role="note">
         ${icon('alert', 'icon icon--sm')}
         <p>Tasa por confirmar: la calculamos como 0% y eso subestima los intereses. Confírmala con tu banco.</p>
       </div>`
    : '';

  // ADR 036 D7: el saldo respeta el ojo de privacidad del hero.
  const saldoTxt = oculto ? SALDO_MASCARA_CUENTA : f(saldo);
  const metaHtml = saldada
    ? `<span class="chip chip-success abono-saldada" role="status">Saldada</span>`
    : `<p class="deuda-card__saldo">${saldoTxt}</p>`;

  // D.15b: botón de editar disponible siempre (activa o saldada). El flujo
  // `_editarCompromiso` + `renderFormDeuda(tipo, deuda)` ya existía (prellena
  // el form); solo faltaba este trigger visible en la tarjeta.
  const editarBtn = `<button class="btn btn-ghost btn-icon"
               data-action="editar-compromiso"
               data-id="${_esc(compromiso.id)}"
               aria-label="Editar deuda ${desc}"><svg class="icon" aria-hidden="true"><use href="#i-edit"/></svg></button>`;

  // ADR 002 sin cambios de flujo: Abonar abre el mismo modal; solo cambia el
  // vestido (tinte de compromisos, no verde: un abono no es un ingreso).
  const accionesHtml = saldada
    ? `${editarBtn}
       <button class="btn btn-ghost btn-icon"
               data-action="archivar-compromiso"
               data-id="${_esc(compromiso.id)}"
               title="Archivar"
               aria-label="Archivar deuda saldada ${desc}"><svg class="icon" aria-hidden="true"><use href="#i-check-circle"/></svg></button>`
    : `<button class="deuda-card__abonar"
               data-action="abrir-abono"
               data-id="${_esc(compromiso.id)}"
               aria-label="Abonar a ${desc}">${icon('plus', 'icon icon--sm')} Abonar</button>
       ${editarBtn}
       <button class="btn btn-ghost btn-icon deuda-card__eliminar"
               data-action="eliminar-compromiso"
               data-id="${_esc(compromiso.id)}"
               aria-label="Eliminar deuda ${desc}"><svg class="icon" aria-hidden="true"><use href="#i-trash"/></svg></button>`;

  // MK.2: el badge de orden no reemplaza al ícono, se superpone en la esquina
  // de la teja (CSS .deuda-card__icon .orden-badge): identidad de marca y
  // posición en la estrategia conviven.
  return `
    <article class="deuda-card" data-id="${_esc(compromiso.id)}">
      <div class="deuda-card__top">
        <div class="deuda-card__icon" aria-hidden="true">${icono}${ordenBadge}</div>
        <div class="deuda-card__info">
          <p class="deuda-card__nombre">${desc}</p>
          <p class="deuda-card__cuota">${subtitle}</p>
        </div>
        ${metaHtml}
      </div>
      <div class="deuda-card__chips">
        ${urgenciaChip}
        <span class="chip ${catChipMod}">${catChipIcono} ${catChipLabel}</span>
        ${tasaChip}
        ${cupoChip}
      </div>
      ${avisoTasa}
      <div class="deuda-card__acciones">
        ${accionesHtml}
      </div>
    </article>`;
}

/**
 * Subtítulo de una deuda saldada: "Saldada el 22 de julio". El año solo aparece
 * cuando no es el actual, porque una deuda saldada se archiva pronto y el año
 * repetido no aporta. Sin fecha (deuda que llegó a cero sin abonos) se afirma
 * el estado sin inventar un día.
 *
 * @param {string | null} iso 'YYYY-MM-DD' del último abono, o null.
 */
function _subtituloSaldada(iso) {
  if (!iso) return 'Sin saldo pendiente';
  // UTC mediodía: mismo truco que `fechaLegible` para no correrse un día en GMT-N.
  const d = new Date(`${iso}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return 'Sin saldo pendiente';
  const mismoAno = d.getUTCFullYear() === new Date().getFullYear();
  const opciones = mismoAno
    ? { day: 'numeric', month: 'long', timeZone: 'UTC' }
    : { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' };
  return `Saldada el ${formateadorFecha('es-CO', opciones).format(d)}`;
}

function _renderEmptyState() {
  return `
    <div class="empty-state pattern-dots">
      <div class="empty-state__icon" aria-hidden="true">${emptyArt('deudas')}</div>
      <p class="empty-state__title">Nada por pagar todavía</p>
      <p class="empty-state__desc">Agrega tu arriendo, un servicio, una tarjeta o un préstamo y Finko te avisa cuándo vence cada uno.</p>
      <button class="btn btn-primary" data-action="comp-elegir-tipo-nuevo">${icon('plus')} Agregar</button>
    </div>`;
}

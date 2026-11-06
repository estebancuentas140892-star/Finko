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
import { f, esc as _esc, fechaLegible, hoy } from '../../../infra/utils.js';
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
  calcularAbonosDelMes,
  LABEL_TIPO,
  ICONO_TIPO,
} from '../logic.js';
import { eventosDelMes, pendientesDePagoDelMes } from '../../agenda/logic.js';
import { getEstrategiaUI } from './estrategia.js';
import { prefijoMesBloque } from '../../../infra/mes-bloque.js';
import { CATEGORIA_DEUDA_ICONO, CATEGORIA_DEUDA_PERSONAL_ICONO, iconoDeCategoriaGasto } from '../../../core/constants.js';

// Lookup unificado: producto (entidad) + relación (personal). Sin colisiones:
// el único label compartido ('Otro'/'Otra') difiere y ambos usan c-otros.
const _ICONO_DEUDA = { ...CATEGORIA_DEUDA_ICONO, ...CATEGORIA_DEUDA_PERSONAL_ICONO };

// ── FILTRO DE LA LENTE (ficha 05, construido por el ADR 080 D6) ──

/**
 * Los cuatro chips de "Por pagar". "Fijos" y "Deudas" filtran la misma lista
 * sin cambiar la anatomía de la fila; "Pagado" revela la mitad del mes que
 * antes solo existía en el Calendario.
 */
const _FILTROS = [
  { id: 'todo',   label: 'Todo' },
  { id: 'fijo',   label: 'Fijos' },
  { id: 'deuda',  label: 'Deudas' },
  { id: 'pagado', label: 'Pagado' },
];

/**
 * Chip activo. Estado de UI del módulo, no del usuario: no se persiste y no
 * toca el schema, igual que los filtros de Movimientos (`_filtroTexto`,
 * `_filtroDominio`). Un recargado vuelve a "Todo", que es lo correcto: el
 * filtro es de esta visita, no una preferencia.
 * @type {'todo'|'fijo'|'deuda'|'pagado'}
 */
let _filtro = 'todo';

/**
 * Fija el chip activo. La llaman la acción del chip y quien llega prefiltrado
 * desde otro dominio (ADR 080 D5). Un id desconocido cae a "todo" en vez de
 * dejar la lista vacía sin explicación.
 *
 * @param {string} id
 */
export function setFiltroPorPagar(id) {
  _filtro = _FILTROS.some(x => x.id === id) ? id : 'todo';
}

/** Chip activo. Para los tests y para quien necesite leerlo. */
export function getFiltroPorPagar() {
  return _filtro;
}

/** La fila de chips, con el mismo vocabulario que los filtros de Movimientos. */
function _renderChips() {
  const chips = _FILTROS.map(({ id, label }) => {
    const activo = _filtro === id;
    return `
        <button type="button" class="chip${activo ? ' chip--active' : ''}"
                data-action="comp-filtrar" data-filtro="${id}"
                aria-pressed="${activo}" aria-label="Ver ${_esc(label.toLowerCase())}">
          ${_esc(label)}
        </button>`;
  }).join('');

  return `
    <div class="filtros-bar" role="group" aria-label="Filtrar lo que tienes por pagar">${chips}</div>`;
}

/**
 * El filtro no dejó nada. No es el estado vacío de la sección (ahí no hay nada
 * registrado): acá hay datos y el filtro los esconde, así que lo que se dice es
 * distinto y la salida es cambiar de chip, no crear algo.
 */
function _renderFiltroSinResultados() {
  const label = _FILTROS.find(x => x.id === _filtro)?.label ?? '';
  return `
    <div class="empty-state empty-state--small">
      <p class="empty-state__desc">Nada en "${_esc(label)}" este mes. Toca "Todo" para ver lo demás.</p>
    </div>`;
}

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
 * Días al próximo vencimiento para ordenar: lo que no vuelve a vencer
 * (`proximoVencimiento` en `null`) va al final, no al frente como si fuera hoy.
 */
function _diasAlProximo(compromiso) {
  return proximoVencimiento(compromiso) ?? Number.MAX_SAFE_INTEGER;
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
  // Una "Única vez" de un mes ya pasado no vuelve a vencer (HF.0d): el
  // Calendario ya no la pinta, así que tampoco se le inventa una fecha.
  if (dias === null) return { clase: 'chip', label: 'Sin próximo pago' };
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

  const activos    = compromisosActivos(S.compromisos);
  const fijosTodos = activos.filter(c => c.tipo === 'fijo');
  const deudasTodas = activos.filter(c => esDeuda(c.tipo));

  // Sin nada registrado no hay filtro que ofrecer: los chips filtrarían un
  // conjunto vacío y el estado vacío ya dice qué hacer.
  if (fijosTodos.length === 0 && deudasTodas.length === 0) {
    el.innerHTML = _renderEmptyState();
    return;
  }

  // ADR 080 D6: el chip decide qué grupos entran. "Pagado" cruza los dos, y su
  // criterio es el mismo con el que el chip de la fila afirma el pago del mes
  // (`estadoPagoMes`), para que la lista y las tarjetas nunca discrepen.
  // Ficha 08: el mes lo manda el reloj del bloque, no el calendario del
  // sistema. Sin esto la lente navegaba de mes en su lista pero seguia
  // diciendo "pagado" y ofreciendo "Marcar pagado" contra el mes en curso.
  const prefijoMes = prefijoMesBloque();
  const pagado = c => estadoPagoMes(S.gastos ?? [], c, prefijoMes) === 'completo';

  let fijos  = fijosTodos;
  let deudas = deudasTodas;
  if (_filtro === 'fijo')       deudas = [];
  else if (_filtro === 'deuda') fijos  = [];
  else if (_filtro === 'pagado') {
    fijos  = fijosTodos.filter(pagado);
    deudas = deudasTodas.filter(pagado);
  }

  const oculto = S.config?.ocultarSaldo === true;
  // Un solo cálculo del conjunto de vencidos para todas las tarjetas del render.
  const atrasos = _atrasoPorId();

  // ADR 117 D1-D2: bajo 1024px la lista va por urgencia y en filas; desde
  // 1024px sigue por tipo y en tarjetas (ADR 073).
  const cuerpo = (fijos.length === 0 && deudas.length === 0)
    ? _renderFiltroSinResultados()
    : _enMovil()
      ? _renderPorUrgencia([...fijos, ...deudas], oculto, atrasos, prefijoMes)
      : _renderGrupoFijos(fijos, oculto, atrasos) + _renderGrupoDeudas(deudas, oculto, atrasos);

  el.innerHTML = _renderChips() + cuerpo;
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
    return _diasAlProximo(a) - _diasAlProximo(b);
  });
  const prefijoMes = prefijoMesBloque();

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
    return _diasAlProximo(a) - _diasAlProximo(b);
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

  const prefijoMes = prefijoMesBloque();

  return headerHtml + ordenados.map((c) => {
    const orden = ordenEstrategia?.get(c.id) ?? null;
    return _renderCompromisoItem(c, orden, oculto, prefijoMes, atrasos);
  }).join('');
}

/**
 * Tarjeta de gasto fijo (ficha 05, ADR 069): más simple que la de deuda, sin
 * saldo ni tasa ni orden de estrategia. "Marcar pagado" reusa el mismo
 * `data-action` que registra `agenda/index.js` (`agenda-marcar-pagado-fijo`),
 * y desde la ficha 08 esta lista es su único emisor: el detalle del día del
 * Calendario dejó de tener acciones. El mes viaja en `data-mes` y es el del
 * reloj del bloque, que puede no ser el actual (BUG-015).
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
function _renderCompromisoItem(compromiso, ordenEstrategia = null, oculto = false, prefijoMes = prefijoMesBloque(), atrasos = _atrasoPorId()) {
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

// ── EN EL TELÉFONO: POR URGENCIA Y EN FILAS (ADR 117) ─────────────

/**
 * Bajo el corte de escritorio de la app (1024px). `compromisos/index.js`
 * repinta la lista al cruzar el corte, así que basta con leer el ancho al pintar.
 */
function _enMovil() {
  return window.matchMedia?.('(max-width: 1023.98px)').matches === true;
}

const _TIPO_TXT = { 'fijo': 'gasto fijo', 'deuda-entidad': 'deuda con entidad', 'deuda-personal': 'deuda personal' };
const _DIAS_CORTOS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const _MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
  'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/**
 * Lo vencido con lo que falta de cada uno: el mismo conjunto y los mismos
 * montos que paga el lote (`_pendientesDelMes` en `compromisos/index.js`), así
 * que "Pagar los N · $X" nunca promete otra cifra que la del modal.
 *
 * @param {string} prefijoMes
 * @returns {Map<string, number>} id → monto pendiente.
 */
function _montosVencidos(prefijoMes) {
  const m = /^(\d{4})-(\d{2})$/.exec(prefijoMes ?? '');
  if (!m) return new Map();
  const eventos = eventosDelMes(S.compromisos ?? [], +m[1], +m[2] - 1);
  const ids = new Set(vencidosSinPagar(S.compromisos ?? [], S.gastos ?? [], hoy()).map(v => v.id));
  return new Map(pendientesDePagoDelMes(eventos, S.gastos ?? [], prefijoMes, hoy())
    .filter(p => ids.has(p.id))
    .map(p => [p.id, Number(p.monto) || 0]));
}

/**
 * Lo que falta pagar de un compromiso en el mes: el fijo entero; de una deuda,
 * la cuota menos lo abonado, topada al saldo (el mismo criterio del lote).
 */
function _faltaDelMes(c, prefijoMes) {
  if (c.tipo === 'fijo') return Number(c.monto) || 0;
  const cuota = Number(c.cuotaMensual) || 0;
  const saldo = Number(c.saldoTotal) || 0;
  if (cuota <= 0) return saldo;
  return Math.min(Math.max(cuota - calcularAbonosDelMes(S.gastos ?? [], c.id, prefijoMes), 0), saldo);
}

/** "Mañana", "Vie 30" o "12 de noviembre": la fecha del próximo pago contada desde hoy. */
function _cuandoVence(dias, esteMes) {
  if (dias === 0) return 'Hoy';
  if (dias === 1) return 'Mañana';
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return esteMes ? `${_DIAS_CORTOS[d.getDay()]} ${d.getDate()}` : `${d.getDate()} de ${_MESES[d.getMonth()]}`;
}

/**
 * "Por pagar" en el teléfono (ADR 117 D1): lo vencido primero, del más antiguo
 * al más reciente, con lo que suma y "Pagar los N"; después lo que falta este
 * mes, lo que vence más adelante, lo pagado y lo saldado. Cada grupo declara
 * su orden (R89a). Sobre un mes que no es el actual no hay "vencido ni
 * próximo": va lo que quedó sin pagar y lo pagado.
 */
function _renderPorUrgencia(items, oculto, atrasos, prefijoMes) {
  const m = (n) => (oculto ? SALDO_MASCARA_CUENTA : f(n));
  const ahora = new Date();
  const esActual = prefijoMes === `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}`;
  const restanMes = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0).getDate() - ahora.getDate();
  const montosVencidos = esActual ? _montosVencidos(prefijoMes) : new Map();

  const g = { vencidos: [], mes: [], adelante: [], pagado: [], saldadas: [] };
  for (const c of items) {
    if (esDeuda(c.tipo) && (Number(c.saldoTotal) || 0) <= 0) g.saldadas.push(c);
    else if (estadoPagoMes(S.gastos ?? [], c, prefijoMes) === 'completo') g.pagado.push(c);
    else if (!esActual) g.mes.push(c);
    else if (Number.isInteger(atrasos.get(c.id))) g.vencidos.push(c);
    else if (_diasAlProximo(c) <= restanMes) g.mes.push(c);
    else g.adelante.push(c);
  }
  g.vencidos.sort((a, b) => atrasos.get(b.id) - atrasos.get(a.id));
  const porFecha = (a, b) => _diasAlProximo(a) - _diasAlProximo(b);
  g.mes.sort(porFecha);
  g.adelante.sort(porFecha);

  const falta = (c) => montosVencidos.get(c.id) ?? _faltaDelMes(c, prefijoMes);
  const suma = (lista) => lista.reduce((acc, c) => acc + falta(c), 0);
  const fila = (c, estado, tono, monto = falta(c), accion = true) =>
    _renderFila(c, { estado, tono, monto, accion, oculto, prefijoMes });

  const vencidos = g.vencidos.map((c) => {
    const at = atrasos.get(c.id);
    return fila(c, at === 0 ? 'Vence hoy' : at === 1 ? 'Venció ayer' : `Venció hace ${at} días`, 'danger');
  });
  // El pie es la puerta del lote y paga TODO lo vencido: con un chip que
  // esconde parte, el botón prometería algo que la lista no muestra.
  const nLote = montosVencidos.size;
  const totalLote = [...montosVencidos.values()].reduce((a, b) => a + b, 0);
  const pieLote = (_filtro === 'todo' && nLote >= 2) ? `
        <div class="porpagar-grupo__pie">
          <button type="button" class="btn-dominio btn-dominio--bloque" data-dom="compromisos"
                  data-action="compromisos-pagar-lote" data-mes="${_esc(prefijoMes)}"
                  aria-label="Pagar juntos los ${nLote} pagos vencidos">Pagar los ${nLote} · ${f(totalLote)}</button>
        </div>` : '';

  const delMes = g.mes.map((c) => {
    if (!esActual) return fila(c, 'Sin pagar', 'danger');
    const dias = _diasAlProximo(c);
    return fila(c, _cuandoVence(dias, true), dias <= 1 ? 'warning' : '');
  });
  const adelante = g.adelante.map(c => fila(c, _cuandoVence(_diasAlProximo(c), false), ''));
  const pagado = g.pagado.map(c =>
    fila(c, 'Pagado', 'ok', calcularAbonosDelMes(S.gastos ?? [], c.id, prefijoMes), false));
  const saldadas = g.saldadas.map(c =>
    fila(c, _subtituloSaldada(fechaUltimoAbono(S.gastos ?? [], c.id)), 'ok', 0, false));

  const mes = _MESES[Number(prefijoMes.slice(5, 7)) - 1] ?? '';
  return [
    _grupoPorPagar('vencidos', 'Vencidos · del más antiguo al más reciente', vencidos, m(suma(g.vencidos)), 'danger', pieLote),
    _grupoPorPagar('mes', esActual ? 'Lo que falta este mes' : `Sin pagar en ${mes}`, delMes, m(suma(g.mes))),
    _grupoPorPagar('adelante', 'Más adelante · el más cercano primero', adelante),
    _grupoPorPagar('pagado', esActual ? 'Pagado este mes' : `Pagado en ${mes}`, pagado),
    _grupoPorPagar('saldadas', 'Saldadas', saldadas),
  ].join('');
}

/** Un grupo: rótulo con su suma, las filas en una sola superficie y su pie. */
function _grupoPorPagar(id, titulo, filas, suma = '', tono = '', pie = '') {
  if (filas.length === 0) return '';
  return `
    <section class="porpagar-grupo" aria-labelledby="porpagar-${id}">
      <div class="porpagar-grupo__head${tono ? ` porpagar-grupo__head--${tono}` : ''}">
        <span id="porpagar-${id}">${_esc(titulo)}</span>
        ${suma ? `<span>${suma}</span>` : ''}
      </div>
      <div class="porpagar-grupo__lista">${filas.join('')}${pie}</div>
    </section>`;
}

/**
 * Fila de obligación (ADR 117 D2): teja, nombre, una sola línea de estado, el
 * monto y la acción a la vista (R19, R8, R50). Tocar la fila abre la hoja de
 * detalle (ADR 098 D4) con editar y eliminar, que la fila lleva sin mostrar,
 * y con lo que antes eran pastillas (cuota, categoría, tasa, cupo) como notas.
 */
function _renderFila(c, { estado, tono, monto, accion, oculto, prefijoMes }) {
  const desc = _esc(c.descripcion);
  const id = _esc(c.id);
  const m = (n) => (oculto ? SALDO_MASCARA_CUENTA : f(n));
  const esFijo = c.tipo === 'fijo';
  const saldo = Number(c.saldoTotal) || 0;
  const marca = resolverMarca(c.descripcion);
  const iconoCat = esFijo
    ? (c.icono || (c.categoria ? iconoDeCategoriaGasto(c.categoria, S.categoriasPersonalizadas) : null))
    : (c.icono || _ICONO_DEUDA[c.categoria]);
  const dominio = esFijo ? 'agenda' : c.tipo === 'deuda-personal' ? 'personales' : 'compromisos';
  const teja = marca ? tejaMarca(marca)
    : tejaCategoria(iconoCat ?? (esFijo ? 'i-recurring' : `i-${ICONO_TIPO[c.tipo] ?? 'recurring'}`), dominio);

  const estadoHtml = [
    `<span class="deuda-card__urgencia${tono ? ` deuda-card__urgencia--${tono}` : ''}">${_esc(estado)}</span>`,
    _TIPO_TXT[c.tipo],
    !esFijo && saldo > 0 && accion ? `faltan ${m(saldo)}` : '',
  ].filter(Boolean).join(' · ');

  const accionHtml = !accion ? '' : esFijo
    ? `<button type="button" class="btn-dominio" data-dom="compromisos" data-action="agenda-marcar-pagado-fijo"
               data-id="${id}" data-mes="${_esc(prefijoMes)}"
               aria-label="Marcar como pagado este mes: ${desc}">Marcar pagado</button>`
    : `<button type="button" class="btn-dominio" data-dom="compromisos" data-action="abrir-abono"
               data-id="${id}" aria-label="Abonar a ${desc}">${oculto || monto <= 0 ? 'Abonar' : `Abonar ${f(monto)}`}</button>`;

  // Solo para la hoja: editar y eliminar (archivar, si la deuda quedó en cero).
  const boton = (accionHoja, etiqueta, icono) =>
    `<button type="button" data-action="${accionHoja}" data-id="${id}" aria-label="${etiqueta}: ${desc}"><svg class="icon" aria-hidden="true"><use href="#${icono}"/></svg></button>`;
  const hoja = esFijo
    ? boton('agenda-editar-fijo', 'Editar', 'i-edit') + boton('agenda-eliminar-fijo', 'Eliminar', 'i-trash')
    : boton('editar-compromiso', 'Editar', 'i-edit') + (saldo <= 0
      ? boton('archivar-compromiso', 'Archivar', 'i-check-circle')
      : boton('eliminar-compromiso', 'Eliminar', 'i-trash'));

  const notas = [esFijo
    ? `${_esc(c.frecuencia)} · día ${c.diaPago}`
    : `Cuota ${m(Number(c.cuotaMensual) || 0)} al mes · día ${c.diaPago}`];
  if (c.categoria) notas.push(_esc(c.categoria));
  if (!esFijo) {
    const sinTasa = (c.tasa === null || c.tasa === undefined) && c.tipo === 'deuda-entidad';
    notas.push(sinTasa ? 'Tasa por confirmar: la calculamos como 0%'
      : c.tasa > 0 ? (c.tasaUnidad === 'mensual' ? `${Math.round(c.tasa * 100)}% mensual` : `${Math.round(tasaEADe(c) * 100)}% EA`)
      : 'Sin interés');
    if (Number(c.cupoTotal) > 0) notas.push(`Disponible ${m(Math.max(Number(c.cupoTotal) - saldo, 0))}`);
  }

  return `
    <article class="deuda-card deuda-card--fila list-item--detalle" data-id="${id}">
      <button type="button" class="list-item__detalle" data-action="fila-detalle"
              aria-label="Ver el detalle de ${desc}"></button>
      <div class="deuda-card__icon" aria-hidden="true">${teja}</div>
      <div class="deuda-card__info">
        <p class="deuda-card__nombre">${desc}</p>
        <p class="deuda-card__estado">${estadoHtml}</p>
      </div>
      <p class="deuda-card__saldo">${monto > 0 ? m(monto) : ''}</p>
      ${accionHtml ? `<div class="deuda-card__acciones">${accionHtml}</div>` : ''}
      <div class="list-item__action">${hoja}</div>
      ${notas.map(n => `<p class="list-item__hint">${n}</p>`).join('')}
    </article>`;
}

/**
 * Subtítulo de una deuda saldada: "Saldada el 22 de jul" (el año solo si no es
 * el actual, ADR 102). Sin fecha (deuda que llegó a cero sin abonos) se afirma
 * el estado sin inventar un día.
 *
 * @param {string | null} iso 'YYYY-MM-DD' del último abono, o null.
 */
function _subtituloSaldada(iso) {
  const fecha = fechaLegible(iso);
  return fecha ? `Saldada el ${fecha}` : 'Sin saldo pendiente';
}

/**
 * Los tres caminos del vacío de Por pagar (ADR 132 D6): abren su formulario de
 * una vez, con la misma acción que la hoja "¿Qué quieres agregar?".
 */
const _CAMINOS_POR_PAGAR = [
  { tipo: 'fijo',           icono: 'i-recurring',  titulo: 'Gasto fijo',         ejemplo: 'Arriendo, servicios, suscripciones' },
  { tipo: 'deuda-entidad',  icono: 'i-deudas',     titulo: 'Deuda con entidad',  ejemplo: 'Tarjeta de crédito, crédito de vivienda o de carro' },
  { tipo: 'deuda-personal', icono: 'i-personales', titulo: 'Deuda personal',     ejemplo: 'Lo que le debes a alguien conocido' },
];

function _renderEmptyState() {
  const caminos = _CAMINOS_POR_PAGAR.map(c => `
        <li>
          <button type="button" class="vacio-caminos__fila" data-action="comp-elegir-tipo-nuevo-ir" data-tipo="${c.tipo}">
            ${tejaCategoria(c.icono, 'compromisos')}
            <span class="vacio-caminos__textos">
              <span class="vacio-caminos__titulo">${c.titulo}</span>
              <span class="vacio-caminos__ejemplo">${c.ejemplo}</span>
            </span>
            ${icon('chevron-right')}
          </button>
        </li>`).join('');
  return `
    <div class="empty-state pattern-dots empty-state--caminos">
      <div class="empty-state__icon" aria-hidden="true">${emptyArt('deudas')}</div>
      <p class="empty-state__title">Nada por pagar todavía</p>
      <p class="empty-state__desc">Agrega tu arriendo, un servicio, una tarjeta o un préstamo y Finko te avisa cuándo vence cada uno.</p>
      <p class="vacio-caminos__pregunta" id="vacio-caminos-por-pagar">¿Qué quieres agregar primero?</p>
      <ul class="vacio-caminos" aria-labelledby="vacio-caminos-por-pagar">${caminos}</ul>
    </div>`;
}

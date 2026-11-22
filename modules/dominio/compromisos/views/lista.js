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
import { htmlTinoSol } from '../../../infra/ilustraciones.js';
import { SALDO_MASCARA_CUENTA, inicialesDe } from '../../../infra/render.js';
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
  esTarjetaOperable,
} from '../logic.js';
import {
  pagosPendientesDelMes, textoEstadoObligacion, resumenObligaciones, tituloObligaciones,
} from '../../../infra/estado-obligacion.js';
import { getEstrategiaUI, htmlEntradaPlanSalida } from './estrategia.js';
import { etiquetaCategoriaDeuda } from './formularios.js';
import { prefijoMesBloque } from '../../../infra/mes-bloque.js';
import { vencimientosSinPagarDelMes } from '../../../infra/vencimientos.js';
import { CATEGORIA_DEUDA_ICONO, CATEGORIA_DEUDA_PERSONAL_ICONO, iconoDeCategoriaGasto } from '../../../core/constants.js';
import { montosOcultos, ojoDePorPagar } from '../../../infra/privacidad.js';

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

/**
 * GAS.7a (ADR 179 D1): en el teléfono "Por pagar" se parte en dos pestañas
 * del bloque Gastos (`#fijos` y `#deudas`). La pestaña manda sobre el chip:
 * en ellas no hay chips.
 *
 * GAS.9b (ADR 183 D2): cada pestaña con lo suyo. `#fijos` es Fijos (solo
 * los gastos fijos) y `#deudas`, lo que debes con sus cuotas. Deja la lente
 * `'mes'` de GAS.8d (ADR 182 D4), que juntaba fijos y cuotas.
 */
const _FILTRO_DE_LENTE = { fijos: 'fijo', deudas: 'deuda' };

/** El filtro que fija la pestaña del hash, o null en `#compromisos`. */
export function filtroDeLente(hash = location.hash.slice(1)) {
  return _FILTRO_DE_LENTE[hash] ?? null;
}

/** El filtro con el que se pinta: el de la pestaña, si la hay; si no, el chip. */
function _filtroActivo() {
  return filtroDeLente() ?? _filtro;
}

/**
 * A qué pestaña lleva "Por pagar" en el teléfono (ADR 179 D1, de vuelta con
 * GAS.9b): la que pidió quien llega (chip "Fijos" o "Deudas"); si no pidió
 * ninguna, la que tiene algo vencido, y si no, la que tiene algo registrado.
 * Fijos gana el empate: es la que se paga todos los meses.
 *
 * @returns {'fijos'|'deudas'}
 */
export function lentePorPagar() {
  if (_filtro === 'deuda') return 'deudas';
  if (_filtro === 'fijo') return 'fijos';
  const activos = compromisosActivos(S.compromisos ?? []);
  const vencidos = vencidosSinPagar(S.compromisos ?? [], S.gastos ?? [], hoy());
  const tipoDe = new Map(activos.map(c => [c.id, c.tipo]));
  if (vencidos.some(v => tipoDe.get(v.id) === 'fijo')) return 'fijos';
  if (vencidos.some(v => esDeuda(tipoDe.get(v.id)))) return 'deudas';
  if (!activos.some(c => c.tipo === 'fijo') && activos.some(c => esDeuda(c.tipo))) return 'deudas';
  return 'fijos';
}

/**
 * GAS.8e (ADR 182 D5): la puerta elegida en Deudas ("Con entidades" o "Con
 * personas"). Estado de UI de esta visita, como el chip: no se persiste.
 * `null` deja que la pestaña elija sola (entidades, salvo que solo haya
 * deudas con personas).
 * @type {'entidad'|'persona'|null}
 */
let _grupoDeudas = null;

/**
 * Fija la puerta de Deudas. Otro valor la devuelve a la elección automática.
 * @param {string} [grupo]
 */
export function setGrupoDeudas(grupo) {
  _grupoDeudas = grupo === 'entidad' || grupo === 'persona' ? grupo : null;
}

/**
 * La puerta que se ve: la elegida o, sin elegir, entidades, salvo que solo
 * haya deudas con personas.
 *
 * @param {number} nEntidades
 * @param {number} nPersonas
 * @returns {'entidad'|'persona'}
 */
export function grupoDeudasVisible(nEntidades, nPersonas) {
  if (_grupoDeudas) return _grupoDeudas;
  return nEntidades === 0 && nPersonas > 0 ? 'persona' : 'entidad';
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
 * registrado): acá hay datos y el filtro los esconde.
 *
 * REV.1 (ADR 137 D2): con "Fijos" o "Deudas" vacíos, lo que falta es crear
 * uno de ese tipo, así que el vacío trae su botón a la vista (y el "+" del
 * encabezado se esconde, `empty-state--caminos`). Esos dos chips no dependen
 * del mes; "Pagado" sí, y su salida sigue siendo cambiar de chip.
 */
function _renderFiltroSinResultados() {
  const filtro = _filtroActivo();
  // GAS.7d y GAS.7e (ADR 179 D4 y D5): cada pestaña vacía tiene su página.
  if (filtroDeLente() === 'fijo') return _renderVacioFijos();
  if (filtroDeLente() === 'deuda') return _renderVacioDeudas();
  if (filtro === 'fijo') {
    return `
    <div class="empty-state empty-state--small empty-state--caminos porpagar-vacio-filtro">
      <p class="empty-state__title">Aún no tienes gastos fijos</p>
      <p class="empty-state__desc">El arriendo, los servicios o una suscripción: lo que pagas cada mes.</p>
      <button type="button" class="btn btn-primary porpagar-vacio-filtro__crear" data-action="comp-elegir-tipo-nuevo-ir" data-tipo="fijo">
        ${icon('plus')}Agregar gasto fijo
      </button>
    </div>`;
  }
  if (filtro === 'deuda') {
    const caminos = _CAMINOS_POR_PAGAR.filter(c => c.tipo !== 'fijo').map(_caminoPorPagar).join('');
    return `
    <div class="empty-state empty-state--small empty-state--caminos porpagar-vacio-filtro">
      <p class="empty-state__title">Aún no tienes deudas registradas</p>
      <p class="vacio-caminos__pregunta" id="vacio-caminos-deudas">¿Qué quieres agregar?</p>
      <ul class="vacio-caminos" aria-labelledby="vacio-caminos-deudas">${caminos}</ul>
    </div>`;
  }
  return `
    <div class="empty-state empty-state--small">
      <p class="empty-state__desc">Nada pagado este mes. Toca "Todo" para ver lo demás.</p>
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
 * GAS.12b (ADR 187 D2): lo que dice la fila de un fijo vencido, "Venció hace
 * 4 meses · 5 pagos": el atraso desde el vencimiento más viejo y, si son
 * varios, cuántos.
 *
 * @param {import('../../../core/state.js').Compromiso} c
 * @param {{ texto: string }} e `textoEstadoObligacion` del atraso.
 * @param {Map<string, number>} cuantos id → vencimientos pendientes.
 */
function _textoVencido(c, e, cuantos) {
  const n = c.tipo === 'fijo' ? (cuantos.get(c.id) ?? 1) : 1;
  return n > 1 ? `${e.texto} · ${n} pagos` : e.texto;
}

/** id → cuántos vencimientos pendientes tiene cada obligación. */
function _pendientesPorId() {
  return new Map(vencidosSinPagar(S.compromisos ?? [], S.gastos ?? [], hoy()).map(v => [v.id, v.pendientes ?? 1]));
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
    // OB.1 (ADR 151): el texto y el tono son los de toda la app; lo de hoy
    // va en ámbar, no en rojo (ADR 132 D7).
    const e = textoEstadoObligacion(-atraso);
    return { clase: e.tono === 'danger' ? 'chip chip-danger' : 'chip chip-warning', label: e.texto };
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
  // conjunto vacío y el estado vacío ya dice qué hacer. En una pestaña
  // (ADR 179 D4 y D5) el vacío es el de su tipo.
  if (fijosTodos.length === 0 && deudasTodas.length === 0) {
    el.innerHTML = filtroDeLente() ? _renderFiltroSinResultados() : _renderEmptyState();
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

  const filtro = _filtroActivo();
  let fijos  = fijosTodos;
  let deudas = deudasTodas;
  if (filtro === 'fijo')       deudas = [];
  else if (filtro === 'deuda') fijos  = [];
  else if (filtro === 'pagado') {
    fijos  = fijosTodos.filter(pagado);
    deudas = deudasTodas.filter(pagado);
  }

  const oculto = montosOcultos(ojoDePorPagar());
  // Un solo cálculo del conjunto de vencidos para todas las tarjetas del render.
  const atrasos = _atrasoPorId();

  // ADR 117 D1-D2: bajo 1024px la lista va por urgencia y en filas; desde
  // 1024px sigue por tipo y en tarjetas (ADR 073).
  const cuerpo = (fijos.length === 0 && deudas.length === 0)
    ? _renderFiltroSinResultados()
    : _enMovil()
      ? _renderPorUrgencia([...fijos, ...deudas], oculto, atrasos, prefijoMes)
      : _renderGrupoFijos(fijos, oculto, atrasos) + _renderGrupoDeudas(deudas, oculto, atrasos);

  // ADR 179 D1: en una pestaña del bloque no hay chips; la pestaña ya filtra.
  el.innerHTML = (filtroDeLente() ? '' : _renderChips()) + cuerpo;

  // ADR 137 D1: el "Agregar" del encabezado dice qué abre con el chip activo.
  const agregar = document.querySelector('#sec-compromisos [data-action="comp-elegir-tipo-nuevo"]');
  agregar?.setAttribute('aria-label', filtro === 'fijo' ? 'Agregar un gasto fijo'
    : filtro === 'deuda' ? 'Agregar una deuda' : 'Agregar un gasto fijo o una deuda');
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
          <p class="deuda-card__cuota">${Number(compromiso.diaPago) > 0 ? `${_esc(compromiso.frecuencia)} · día ${compromiso.diaPago}` : 'Sin fecha fija'}</p>
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
    // GAS.14d (ADR 189 D4): una deuda personal sin cuota puede no tener día.
    : !(Number(compromiso.diaPago) > 0)
    ? (cuota > 0 ? `Cuota ${f(cuota)}/mes` : 'Sin fecha fija')
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

  // AVC.1b (ADR 169 D1): una tarjeta con cupo saca avances, deba o no.
  const avanceBtn = esTarjetaOperable(compromiso)
    ? `<button class="btn btn-secondary btn-sm deuda-card__avance"
               data-action="abrir-avance"
               data-id="${_esc(compromiso.id)}"
               aria-label="Sacar un avance de ${desc}">Avance</button>`
    : '';

  // ADR 002 sin cambios de flujo: Abonar abre el mismo modal; solo cambia el
  // vestido (tinte de compromisos, no verde: un abono no es un ingreso).
  const accionesHtml = saldada
    ? `${avanceBtn}
       ${editarBtn}
       <button class="btn btn-ghost btn-icon"
               data-action="archivar-compromiso"
               data-id="${_esc(compromiso.id)}"
               title="Archivar"
               aria-label="Archivar deuda saldada ${desc}"><svg class="icon" aria-hidden="true"><use href="#i-check-circle"/></svg></button>`
    : `<button class="deuda-card__abonar"
               data-action="abrir-abono"
               data-id="${_esc(compromiso.id)}"
               aria-label="Abonar a ${desc}">${icon('plus', 'icon icon--sm')} Abonar</button>
       ${avanceBtn}
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
 * Lo vencido con lo que falta de cada uno: el conjunto y los montos que paga
 * el lote (`pagosPendientesDelMes`, OB.1), así que "Pagar los N · $X" nunca
 * promete otra cifra que la del modal.
 *
 * @param {string} prefijoMes
 * @returns {Map<string, number>} id → monto pendiente.
 */
function _montosVencidos(prefijoMes) {
  return new Map(pagosPendientesDelMes(S.compromisos ?? [], S.gastos ?? [], prefijoMes, hoy())
    .map(p => [p.id, Number(p.monto) || 0]));
}

/**
 * Lo que falta pagar de un compromiso en el mes: el fijo, una vez por cada
 * vencimiento del mes sin pago (GAS.12a y 12b, ADR 187: un quincenal son
 * dos); de una deuda, la cuota menos lo abonado, topada al saldo (el mismo
 * criterio del lote).
 */
function _faltaDelMes(c, prefijoMes) {
  if (c.tipo === 'fijo') return (Number(c.monto) || 0) * Math.max(1, vencimientosSinPagarDelMes(c, S.gastos ?? [], prefijoMes).length);
  const cuota = Number(c.cuotaMensual) || 0;
  const saldo = Number(c.saldoTotal) || 0;
  if (cuota <= 0) return saldo;
  return Math.min(Math.max(cuota - calcularAbonosDelMes(S.gastos ?? [], c.id, prefijoMes), 0), saldo);
}

/**
 * El monto de la hoja de una deuda: lo que falta de la cuota del mes o, si ya
 * se pagó, lo abonado. Lo usan la fila de Deudas y, desde GAS.9d (ADR 183
 * D4), la de la tarjeta en Mis cuentas.
 *
 * @param {import('../../../core/state.js').Compromiso} c
 * @param {string} prefijoMes 'YYYY-MM'
 * @returns {number}
 */
export function montoDeLaHoja(c, prefijoMes) {
  if ((Number(c.saldoTotal) || 0) <= 0 && c.tipo !== 'fijo') return 0;
  // GAS.12c: un fijo vencido dice lo mismo que su fila, todo lo pendiente.
  const vencido = c.tipo === 'fijo' ? _montosVencidos(prefijoMes).get(c.id) : undefined;
  if (vencido !== undefined) return vencido;
  return _faltaDelMes(c, prefijoMes) || calcularAbonosDelMes(S.gastos ?? [], c.id, prefijoMes);
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
  const { g, esActual, montosVencidos, falta } = _agruparPorUrgencia(items, atrasos, prefijoMes);
  const suma = (lista) => lista.reduce((acc, c) => acc + falta(c), 0);
  const fila = (c, estado, tono, monto = falta(c), accion = true) =>
    _renderFila(c, { estado, tono, monto, accion, oculto, prefijoMes });

  // ADR 132 D7: lo que vence hoy todavía no está vencido; va en ámbar, como
  // "Mañana", y el rojo queda para lo que ya pasó. Texto y tono, de
  // `textoEstadoObligacion` (OB.1): los mismos de Atención hoy y del lote.
  const cuantos = _pendientesPorId();
  const vencidos = g.vencidos.map((c) => {
    const e = textoEstadoObligacion(-atrasos.get(c.id));
    return fila(c, _textoVencido(c, e, cuantos), e.tono);
  });
  // El pie es la puerta del lote y paga TODO lo vencido: con un chip que
  // esconde parte, el botón prometería algo que la lista no muestra. En una
  // pestaña (ADR 179 D1) paga lo vencido de su tipo, que es lo que se ve.
  const lente = filtroDeLente();
  const enLista = new Set(items.map(c => c.id));
  const delLote = lente ? [...montosVencidos].filter(([id]) => enLista.has(id)) : [...montosVencidos];
  const nLote = delLote.length;
  const totalLote = delLote.reduce((a, [, monto]) => a + monto, 0);
  const pieLote = ((lente || _filtroActivo() === 'todo') && nLote >= 2) ? `
        <div class="porpagar-grupo__pie">
          <button type="button" class="btn-dominio btn-dominio--bloque" data-dom="compromisos"
                  data-action="compromisos-pagar-lote" data-mes="${_esc(prefijoMes)}"${lente ? ` data-tipo="${lente}"` : ''}
                  aria-label="Pagar juntos los ${nLote} pagos">Pagar los ${nLote} · ${f(totalLote)}</button>
        </div>` : '';

  const delMes = g.mes.map((c) => {
    if (!esActual) return fila(c, 'Sin pagar', 'danger');
    const dias = _diasAlProximo(c);
    return fila(c, _cuandoVence(dias, true), dias <= 1 ? 'warning' : '');
  });
  const adelante = g.adelante.map(c => fila(c, _cuandoVence(_diasAlProximo(c), false), ''));
  const pagado = g.pagado.map(c =>
    fila(c, _estadoPagado(c, prefijoMes), 'ok', calcularAbonosDelMes(S.gastos ?? [], c.id, prefijoMes), false));
  const saldadas = g.saldadas.map(c =>
    fila(c, _subtituloSaldada(fechaUltimoAbono(S.gastos ?? [], c.id)), 'ok', 0, false));

  // GAS.7d (ADR 179 D4): en la pestaña Fijos los grupos van por semana y
  // sin la línea de orden; la fila no repite "gasto fijo". GAS.9b (ADR 183
  // D2): solo fijos, sin las cuotas que GAS.8d sumaba.
  if (lente === 'fijo') {
    const r = resumenObligaciones(g.vencidos.map(c => ({ diasRestantes: -atrasos.get(c.id) })));
    const semana = g.mes.filter(c => esActual && _diasAlProximo(c) <= 6);
    const restoMes = g.mes.filter(c => !semana.includes(c));
    const filaFijo = (c, estado, tono, monto = falta(c), accion = true) =>
      _renderFila(c, { estado, tono, monto, accion, oculto, prefijoMes, sinTipo: true });
    const vencidosF = g.vencidos.map((c) => {
      const e = textoEstadoObligacion(-atrasos.get(c.id));
      return filaFijo(c, _textoVencido(c, e, cuantos), e.tono);
    });
    const deFecha = (c) => {
      if (!esActual) return filaFijo(c, 'Sin pagar', 'danger');
      const dias = _diasAlProximo(c);
      return filaFijo(c, _cuandoVence(dias, true), dias <= 1 ? 'warning' : '');
    };
    const mesNombre = _nombreMes(prefijoMes);
    return [
      _grupoPorPagar('vencidos', r.vencidos > 0 ? 'Vencido' : 'Para hoy', vencidosF,
        { suma: m(suma(g.vencidos)), tono: r.vencidos > 0 ? 'danger' : '', pie: pieLote }),
      _grupoPorPagar('semana', 'Esta semana', semana.map(deFecha), { suma: m(suma(semana)) }),
      _grupoPorPagar('mes', esActual ? `Más adelante en ${mesNombre}` : `Sin pagar en ${mesNombre}`,
        restoMes.map(deFecha), { suma: m(suma(restoMes)) }),
      _grupoPorPagar('adelante', 'Después', g.adelante.map(c => filaFijo(c, _cuandoVence(_diasAlProximo(c), false), ''))),
      _grupoPorPagar('pagado', esActual ? 'Pagado este mes' : `Pagado en ${mesNombre}`,
        g.pagado.map(c => filaFijo(c, _estadoPagado(c, prefijoMes), 'ok', calcularAbonosDelMes(S.gastos ?? [], c.id, prefijoMes), false))),
    ].join('');
  }

  // GAS.8e (ADR 182 D5): la pestaña Deudas es el inventario de lo que debes,
  // en dos puertas (entidades y personas); la lista del mes vive en Por pagar.
  if (lente === 'deuda') return _renderInventarioDeudas(items, oculto, atrasos);

  // ADR 132 D7: con algo por marcar, una línea dice qué hace el círculo.
  // VIS.1b (ADR 168 D5): solo hasta el primer pago; quien ya pagó algo lo
  // sabe, y la línea le quitaba lo próximo de la vista.
  const yaPago = (S.gastos ?? []).some(g => g.compromisoId);
  const ayuda = yaPago || vencidos.length + delMes.length + adelante.length === 0 ? '' : `
    <p class="porpagar-ayuda">${icon('check-circle')}<span>Toca el círculo cuando pagues algo. Finko te pregunta de qué cuenta salió.</span></p>`;

  // OB.1: el grupo trae también lo que vence hoy; su título lo dice
  // ("Pagos vencidos" o "Pagos para hoy", también con lo vencido dentro) en vez de
  // llamar vencido a lo de hoy.
  const rVencidos = resumenObligaciones(g.vencidos.map(c => ({ diasRestantes: -atrasos.get(c.id) })));
  const mes = _nombreMes(prefijoMes);
  return ayuda + [
    _grupoPorPagar('vencidos', tituloObligaciones(rVencidos), vencidos, { suma: m(suma(g.vencidos)), tono: rVencidos.vencidos > 0 ? 'danger' : '', pie: pieLote, orden: 'Del más antiguo al más reciente' }),
    _grupoPorPagar('mes', esActual ? 'Lo que falta este mes' : `Sin pagar en ${mes}`, delMes, { suma: m(suma(g.mes)) }),
    _grupoPorPagar('adelante', 'Más adelante', adelante, { orden: 'El más cercano primero' }),
    _grupoPorPagar('pagado', esActual ? 'Pagado este mes' : `Pagado en ${mes}`, pagado),
    _grupoPorPagar('saldadas', 'Saldadas', saldadas),
  ].join('');
}

/** "noviembre" a partir de 'YYYY-MM'. */
function _nombreMes(prefijoMes) {
  return _MESES[Number(String(prefijoMes).slice(5, 7)) - 1] ?? '';
}

/**
 * Reparte los compromisos en los grupos de "Por pagar" (ADR 117 D1) y dice
 * cuánto falta de cada uno. Es la única regla del reparto: la pintan las filas
 * del teléfono y la suma el hero (ADR 140), así que la cifra de arriba y las
 * sumas de "Vencidos" y "Lo que falta este mes" no pueden discrepar.
 *
 * @param {import('../../../core/state.js').Compromiso[]} items
 * @param {Map<string, number>} atrasos Salida de `_atrasoPorId()`.
 * @param {string} prefijoMes 'YYYY-MM' del mes que muestra el bloque.
 */
function _agruparPorUrgencia(items, atrasos, prefijoMes) {
  const ahora = new Date();
  const esActual = prefijoMes === `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}`;
  const restanMes = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0).getDate() - ahora.getDate();
  const montosVencidos = esActual ? _montosVencidos(prefijoMes) : new Map();

  const g = { vencidos: [], mes: [], adelante: [], pagado: [], saldadas: [] };
  for (const c of items) {
    if (esDeuda(c.tipo) && (Number(c.saldoTotal) || 0) <= 0) g.saldadas.push(c);
    else if (estadoPagoMes(S.gastos ?? [], c, prefijoMes) === 'completo') g.pagado.push(c);
    else if (!esActual) {
      // GAS.12a (ADR 187 D1): en otro mes, un fijo sin vencimiento sin pago
      // ese mes (creado después, o un anual fuera de su mes) no quedó sin pagar.
      if (c.tipo !== 'fijo' || vencimientosSinPagarDelMes(c, S.gastos ?? [], prefijoMes).length > 0) g.mes.push(c);
    }
    else if (Number.isInteger(atrasos.get(c.id))) g.vencidos.push(c);
    else if (_diasAlProximo(c) <= restanMes) g.mes.push(c);
    else g.adelante.push(c);
  }
  g.vencidos.sort((a, b) => atrasos.get(b.id) - atrasos.get(a.id));
  const porFecha = (a, b) => _diasAlProximo(a) - _diasAlProximo(b);
  g.mes.sort(porFecha);
  g.adelante.sort(porFecha);

  const falta = (c) => montosVencidos.get(c.id) ?? _faltaDelMes(c, prefijoMes);
  return { g, esActual, montosVencidos, falta };
}

/**
 * Lo que falta pagar en el mes que muestra el bloque (REV.2a, ADR 140): lo
 * vencido más lo que falta del mes, fijos y cuotas, con los montos de las
 * filas. Sobre otro mes, lo que quedó sin pagar. No mira el chip activo: el
 * hero dice el mes entero, y con "Todo" coincide con la suma de la lista. Sí
 * mira la pestaña (ADR 179 D1): en Fijos suma los fijos y en Deudas, las
 * cuotas, como la lista que tiene debajo.
 *
 * @returns {{total:number, cantidad:number, hayPagos:boolean, esActual:boolean, mes:string}}
 */
export function faltaPorPagarDelMes() {
  const prefijoMes = prefijoMesBloque();
  const lente = filtroDeLente();
  const activos = compromisosActivos(S.compromisos).filter(c =>
    lente === 'fijo' ? c.tipo === 'fijo'
      : lente === 'deuda' ? esDeuda(c.tipo)
      : c.tipo === 'fijo' || esDeuda(c.tipo));
  const { g, esActual, falta } = _agruparPorUrgencia(activos, _atrasoPorId(), prefijoMes);
  const pendientes = [...g.vencidos, ...g.mes];
  return {
    total:    pendientes.reduce((acc, c) => acc + falta(c), 0),
    cantidad: pendientes.length,
    hayPagos: activos.length > 0,
    esActual,
    mes:      _nombreMes(prefijoMes),
  };
}

/**
 * La tarjeta de Fijos (GAS.7d, ADR 179 D4): lo pagado en el mes y de cuánto,
 * en plata y en pagos ("Pagaste $340.000 de $2.251.900 · 3 de 10 pagos").
 * Con el mismo reparto que la lista, así la barra y los grupos no discrepan.
 *
 * @returns {{ pagado:number, total:number, pagados:number, cantidad:number }}
 */
export function resumenFijosDelMes() {
  const prefijoMes = prefijoMesBloque();
  // GAS.9b (ADR 183 D2): solo los fijos; las cuotas se cuentan en Deudas.
  const fijos = compromisosActivos(S.compromisos).filter(c => c.tipo === 'fijo');
  const { g, falta } = _agruparPorUrgencia(fijos, _atrasoPorId(), prefijoMes);
  const pendientes = [...g.vencidos, ...g.mes];
  // GAS.12a (ADR 187 D1): lo pagado en fijos ese mes, de todos los fijos,
  // no solo de los que quedaron al día.
  // GAS.14c (ADR 189 D3): también lo pagado a un fijo ya archivado: se pagó
  // ese mes, como dice la hoja de meses.
  const pagado = (S.compromisos ?? []).filter(c => c?.tipo === 'fijo')
    .reduce((acc, c) => acc + calcularAbonosDelMes(S.gastos ?? [], c.id, prefijoMes), 0);
  const faltaTotal = pendientes.reduce((acc, c) => acc + falta(c), 0);
  return {
    pagado,
    total: pagado + faltaTotal,
    pagados: g.pagado.length,
    cantidad: g.pagado.length + pendientes.length,
  };
}

/**
 * "Pagado el 2": el día del último pago si cae en el mes; sin pago con fecha
 * en el mes (un abono parcial que completó otro mes), solo "Pagado".
 */
function _estadoPagado(c, prefijoMes) {
  const iso = fechaUltimoAbono(S.gastos ?? [], c.id);
  return iso?.startsWith(prefijoMes) ? `Pagado el ${Number(iso.slice(8, 10))}` : 'Pagado';
}

/**
 * Un grupo (ADR 132 D7): el título en frase, su orden en una línea debajo,
 * la suma a la derecha, las filas en una sola superficie y su pie.
 *
 * @param {string} id
 * @param {string} titulo
 * @param {string[]} filas
 * @param {{ suma?: string, tono?: string, pie?: string, orden?: string }} [opciones]
 */
function _grupoPorPagar(id, titulo, filas, { suma = '', tono = '', pie = '', orden = '' } = {}) {
  if (filas.length === 0) return '';
  return `
    <section class="porpagar-grupo" aria-labelledby="porpagar-${id}">
      <div class="porpagar-grupo__head${tono ? ` porpagar-grupo__head--${tono}` : ''}">
        <span class="porpagar-grupo__titulo">
          <span id="porpagar-${id}">${_esc(titulo)}</span>
          ${orden ? `<span class="porpagar-grupo__orden">${_esc(orden)}</span>` : ''}
        </span>
        ${suma ? `<span class="porpagar-grupo__suma">${suma}</span>` : ''}
      </div>
      <div class="porpagar-grupo__lista">${filas.join('')}${pie}</div>
    </section>`;
}

/**
 * La teja de un compromiso: la marca si se reconoce (Bancolombia, Claro...);
 * si no, el ícono de su categoría con el color de su tipo. La comparten la
 * fila y su hoja (`views/detalle.js`).
 *
 * @param {import('../../../core/state.js').Compromiso} c
 * @returns {string}
 */
export function tejaCompromiso(c) {
  const esFijo = c.tipo === 'fijo';
  const marca = resolverMarca(c.descripcion);
  if (marca) return tejaMarca(marca);
  const iconoCat = esFijo
    ? (c.icono || (c.categoria ? iconoDeCategoriaGasto(c.categoria, S.categoriasPersonalizadas) : null))
    : (c.icono || _ICONO_DEUDA[c.categoria]);
  const dominio = esFijo ? 'agenda' : c.tipo === 'deuda-personal' ? 'personales' : 'compromisos';
  return tejaCategoria(iconoCat ?? (esFijo ? 'i-recurring' : `i-${ICONO_TIPO[c.tipo] ?? 'recurring'}`), dominio);
}

/**
 * Fila de obligación (ADR 117 D2, ADR 132 D7): teja, nombre con su monto al
 * lado, una línea de estado y, a la derecha, el círculo que marca el pago
 * (rojo vencido, ámbar hoy o mañana, neutro el resto; lleno y verde si ya se
 * pagó). Tocar la fila abre su hoja (`compromiso-detalle`), que se arma con
 * los datos del compromiso y trae editar y eliminar.
 */
function _renderFila(c, { estado, tono, monto, accion, oculto, prefijoMes, sinTipo = false }) {
  const desc = _esc(c.descripcion);
  const id = _esc(c.id);
  const m = (n) => (oculto ? SALDO_MASCARA_CUENTA : f(n));
  const esFijo = c.tipo === 'fijo';
  const saldo = Number(c.saldoTotal) || 0;

  const estadoHtml = [
    `<span class="deuda-card__urgencia${tono ? ` deuda-card__urgencia--${tono}` : ''}">${_esc(estado)}</span>`,
    sinTipo ? '' : c.tipo === 'deuda-entidad' ? 'deuda' : _TIPO_TXT[c.tipo],
    !esFijo && saldo > 0 && accion ? `faltan ${m(saldo)}` : '',
  ].filter(Boolean).join(' · ');

  const claseMarca = `porpagar-marca${tono ? ` porpagar-marca--${tono}` : ''}`;
  // GAS.13e (ADR 188 D5): lo vencido lleva la pastilla "Pagar", no un círculo.
  const vencido = accion && tono === 'danger';
  const marcaHtml = vencido
    ? `<button type="button" class="porpagar-pagar" data-action="${esFijo ? 'agenda-marcar-pagado-fijo' : 'abrir-abono'}"
               data-id="${id}"${esFijo ? ` data-mes="${_esc(prefijoMes)}"` : ''}
               aria-label="Pagar ${desc}">Pagar</button>`
    : !accion
    ? `<span class="${claseMarca}" aria-hidden="true">${icon('check')}</span>`
    : esFijo
      ? `<button type="button" class="${claseMarca}" data-action="agenda-marcar-pagado-fijo"
                 data-id="${id}" data-mes="${_esc(prefijoMes)}"
                 aria-label="Marcar como pagado este mes: ${desc}">${icon('check')}</button>`
      : `<button type="button" class="${claseMarca}" data-action="abrir-abono"
                 data-id="${id}" aria-label="Abonar a ${desc}">${icon('check')}</button>`;

  return `
    <article class="deuda-card deuda-card--fila list-item--detalle${accion ? '' : ' deuda-card--hecha'}" data-id="${id}">
      <button type="button" class="list-item__detalle" data-action="compromiso-detalle"
              data-id="${id}" data-mes="${_esc(prefijoMes)}" data-monto="${monto}"
              aria-label="Ver el detalle de ${desc}"></button>
      <div class="deuda-card__icon" aria-hidden="true">${tejaCompromiso(c)}</div>
      <div class="deuda-card__info">
        <p class="deuda-card__linea">
          <span class="deuda-card__nombre">${desc}</span>
          <span class="deuda-card__saldo">${monto > 0 ? m(monto) : ''}</span>
        </p>
        <p class="deuda-card__estado">${estadoHtml}</p>
      </div>
      ${marcaHtml}
    </article>`;
}

/** Una tarjeta de crédito: con cupo o con su categoría. */
function _esTarjeta(c) {
  return esTarjetaOperable(c) || /tarjeta/i.test(c.categoria ?? '');
}

/** "pagas hoy", "pagas mañana", "pagas el mié 25" o "pagas el 3 de diciembre". */
function _cuandoPagas(dias) {
  if (dias === 0) return 'pagas hoy';
  if (dias === 1) return 'pagas mañana';
  const d = new Date();
  d.setDate(d.getDate() + dias);
  const esteMes = d.getMonth() === new Date().getMonth();
  return esteMes
    ? `pagas el ${_DIAS_CORTOS[d.getDay()].toLowerCase()} ${d.getDate()}`
    : `pagas el ${d.getDate()} de ${_MESES[d.getMonth()]}`;
}

/**
 * GAS.15c ([ADR 191](../../../../docs/DECISIONS/191-las-deudas-del-lienzo.md) D8):
 * el título de una deuda con entidad es lo que es ("Libre inversión") y la
 * entidad va debajo. Del nombre se quita la entidad que se reconoce; si queda
 * poco ("Tarjeta"), lo dice su categoría ("Tarjeta de crédito"). Sin entidad
 * reconocida, el nombre tal cual.
 */
export function tituloDeuda(c) {
  const nombre = String(c?.descripcion ?? '').trim();
  if (c?.tipo !== 'deuda-entidad') return nombre;
  const marca = resolverMarca(nombre);
  const entidad = marca ? String(marca.nombre ?? marca.id ?? '') : '';
  if (!entidad) return nombre;
  const sin = nombre.replace(new RegExp(entidad.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), '').replace(/\s+/g, ' ').trim();
  const categoria = c.categoria && c.categoria !== 'Otra' ? etiquetaCategoriaDeuda(c.categoria) : '';
  if (!sin) return categoria || nombre;
  if (categoria && categoria.toLowerCase().startsWith(sin.toLowerCase())) return categoria;
  return sin;
}

/**
 * La segunda línea de una deuda en el inventario (ADR 182 D5): cómo se paga.
 * GAS.10g ([ADR 185](../../../../docs/DECISIONS/185-gastos-movil-cada-lugar-con-una-funcion.md) D8):
 * con cuota y día, "Cuota $400.000 · día 28" (el logo ya dice de quién es).
 * Sin cuota, como antes: "Bancolombia · pagas el mié 25" o "Sin fecha fija ·
 * te prestó el 2 de oct". La entidad sale de la marca que se reconoce en el
 * nombre; sin marca, de su categoría.
 */
function _metaDeuda(c, m) {
  const saldo = Number(c.saldoTotal) || 0;
  if (saldo <= 0) return _subtituloSaldada(fechaUltimoAbono(S.gastos ?? [], c.id));
  const cuota = Number(c.cuotaMensual) || 0;
  // GAS.15c (ADR 191 D8): la entidad o la relación primero, como el lienzo:
  // "Davivienda · día 28", "Familiar · $100.000 el 10".
  if (c.tipo === 'deuda-personal') {
    const relacion = c.categoria ? etiquetaCategoriaDeuda(c.categoria) : '';
    const con = (t) => [relacion, t].filter(Boolean).join(' · ');
    if (c.frecuencia === 'Única vez' && c.fechaInicio) return con(`todo el ${fechaLegible(String(c.fechaInicio).slice(0, 10))}`);
    if (cuota > 0 && Number(c.diaPago) > 0) return con(`${m(cuota)} el ${Number(c.diaPago)}`);
    if (cuota > 0) return con(`${m(cuota)} cada mes`);
    // GAS.15b: "Te prestó el" si se dijo; si no, cuando se anotó.
    const fecha = fechaLegible(String(c.fechaPrestamo ?? c.fechaCreacion ?? '').slice(0, 10));
    return fecha ? `Sin fecha fija · te prestó el ${fecha}` : 'Sin fecha fija';
  }
  const marca = resolverMarca(c.descripcion);
  const entidad = marca ? (marca.nombre ?? marca.id) : (c.categoria ? etiquetaCategoriaDeuda(c.categoria) : 'Con una entidad');
  if (Number(c.diaPago) > 0) return `${entidad} · día ${Number(c.diaPago)}`;
  if (_esTarjeta(c)) {
    const dias = proximoVencimiento(c);
    return dias === null ? entidad : `${entidad} · ${_cuandoPagas(dias)}`;
  }
  return cuota > 0 ? `${entidad} · cuota ${m(cuota)}` : entidad;
}

/**
 * La barra de una deuda (ADR 182 D5): en una tarjeta con cupo, cuánto del
 * cupo está usado, en gris; en las demás, cuánto se lleva pagado, en verde.
 * Sin abonos registrados no hay avance que mostrar.
 *
 * @returns {{ pct: number, texto: string, neutra: boolean } | null}
 */
function _barraDeuda(c) {
  const saldo = Math.max(0, Number(c.saldoTotal) || 0);
  if (saldo <= 0) return null;
  const cupo = Number(c.cupoTotal) || 0;
  if (cupo > 0) {
    const pct = Math.min(100, Math.round((saldo / cupo) * 100));
    return { pct, texto: `${pct} % del cupo`, neutra: true };
  }
  const abonado = (S.gastos ?? [])
    .filter(g => g.compromisoId === c.id)
    .reduce((acc, g) => acc + (Number(g.monto) || 0), 0);
  const total = Math.max(saldo + abonado, Number(c.montoAcreditado) || 0);
  if (total <= 0 || total - saldo <= 0) return null;
  const pct = Math.round(((total - saldo) / total) * 100);
  return { pct, texto: `${pct} % pagado`, neutra: false };
}

/**
 * La teja de una deuda en el inventario: la tarjeta dibujada (con el logo de
 * su banco, si se reconoce), las iniciales de la persona o la teja de
 * siempre (marca o categoría). GAS.15a: también la usa "El orden" del plan.
 */
export function tejaDeudaInventario(c) {
  if (c.tipo === 'deuda-personal') {
    return `<span class="deuda-inv__persona" aria-hidden="true">${_esc(inicialesDe(String(c.descripcion ?? '').trim() || '?'))}</span>`;
  }
  if (_esTarjeta(c)) {
    const marca = resolverMarca(c.descripcion);
    // GAS.10g (ADR 185 D8): con banco reconocido, su logo; sin él, la tarjeta dibujada.
    if (marca) return `<span class="deuda-inv__teja" aria-hidden="true">${tejaMarca(marca)}</span>`;
    return '<span class="deuda-inv__tarjeta" aria-hidden="true"><span class="deuda-inv__tarjeta-chip"></span><span class="deuda-inv__tarjeta-raya"></span></span>';
  }
  return `<span class="deuda-inv__teja" aria-hidden="true">${tejaCompromiso(c)}</span>`;
}

/**
 * Una deuda en el inventario (ADR 182 D5): la teja, el nombre y de quién es,
 * lo que falta con "te falta" debajo, la barra de su avance y, si la cuota
 * venció, la pastilla roja con "Pagar". Tocar la fila abre su hoja.
 */
function _renderFilaInventario(c, { oculto, atraso }) {
  const desc = _esc(c.descripcion);
  const id = _esc(c.id);
  const m = (n) => (oculto ? SALDO_MASCARA_CUENTA : f(n));
  const saldo = Math.max(0, Number(c.saldoTotal) || 0);
  const saldada = saldo <= 0;
  const barra = _barraDeuda(c);
  // GAS.15c (ADR 191 D8): con una entidad, la barra va siempre con la cuota
  // ("Cuota $400.000") o el cupo ("Cupo $3.000.000") a su lado; con una
  // persona, como el lienzo, sin barra.
  const cupo = Number(c.cupoTotal) || 0;
  const cuotaFila = Number(c.cuotaMensual) || 0;
  const textoBarra = cupo > 0 ? `Cupo ${m(cupo)}` : cuotaFila > 0 ? `Cuota ${m(cuotaFila)}` : (barra?.texto ?? '');
  const conBarra = !saldada && c.tipo === 'deuda-entidad' && (barra || textoBarra);
  const barraHtml = !conBarra ? '' : `
        <div class="deuda-inv__avance">
          <span class="deuda-inv__barra" aria-hidden="true"><span class="deuda-inv__barra-fill${barra?.neutra ? ' deuda-inv__barra-fill--neutra' : ''}" style="--deuda-pct: ${barra?.pct ?? 0}%"></span></span>
          <span class="deuda-inv__avance-texto">${textoBarra}</span>
        </div>`;
  // Sin cuota no hay fecha fija ("Sin fecha fija"): no se puede vencer.
  let vencidaHtml = '';
  if (!saldada && Number.isInteger(atraso) && (Number(c.cuotaMensual) || 0) > 0) {
    const texto = atraso === 0 ? 'La cuota vence hoy'
      : `Cuota vencida hace ${atraso} ${atraso === 1 ? 'día' : 'días'}`;
    // GAS.15c (ADR 191 D8): el aviso en su línea y "Pagar" aparte, como el lienzo.
    vencidaHtml = `
        <div class="deuda-inv__vencida${atraso === 0 ? ' deuda-inv__vencida--hoy' : ''}">
          <span class="deuda-inv__vencida-texto"><span class="deuda-inv__vencida-icono" aria-hidden="true">${icon('clock')}</span>${texto}</span>
          <button type="button" class="deuda-inv__pagar" data-action="abrir-abono" data-id="${id}" aria-label="Pagar la cuota de ${desc}">Pagar</button>
        </div>`;
  }
  // GAS.15c: "falta", "usado" en una tarjeta con cupo y "le debes" a una persona.
  const queEs = c.tipo === 'deuda-personal' ? 'le debes' : cupo > 0 ? 'usado' : 'falta';
  const derecha = saldada
    ? '<span class="chip chip-success abono-saldada">Saldada</span>'
    : `<span class="deuda-inv__monto">${m(saldo)}</span><span class="deuda-inv__falta">${queEs}</span>`;
  // La hoja habla de la cuota del mes, como desde Por pagar: lo que falta
  // de ella o, si ya se pagó, lo abonado.
  const prefijoMes = prefijoMesBloque();
  const montoMes = saldada ? 0 : montoDeLaHoja(c, prefijoMes);
  return `
      <article class="deuda-inv__fila list-item--detalle" data-id="${id}">
        <button type="button" class="list-item__detalle" data-action="compromiso-detalle"
                data-id="${id}" data-mes="${_esc(prefijoMes)}" data-monto="${montoMes}"
                aria-label="Ver el detalle de ${desc}"></button>
        <div class="deuda-inv__top">
          ${tejaDeudaInventario(c)}
          <div class="deuda-inv__info">
            <p class="deuda-inv__nombre">${_esc(tituloDeuda(c))}</p>
            <p class="deuda-inv__meta">${_esc(_metaDeuda(c, m))}</p>
          </div>
          <p class="deuda-inv__derecha">${derecha}</p>
        </div>${barraHtml}${vencidaHtml}
      </article>`;
}

/** Las dos puertas de Deudas (ADR 182 D5), con su ícono y su frase. */
const _PUERTAS_DEUDAS = [
  { grupo: 'entidad', tipo: 'deuda-entidad', titulo: 'Con entidades', icono: 'c-edificio',
    frase: 'Bancos, tarjetas de crédito, cooperativas y otras obligaciones financieras.',
    agregar: 'Agregar deuda con una entidad' },
  { grupo: 'persona', tipo: 'deuda-personal', titulo: 'Con personas', icono: 'i-personales',
    frase: 'Dinero que te prestó un familiar, un amigo u otra persona. Sin bancos de por medio.',
    agregar: 'Agregar deuda con una persona' },
];

/**
 * Deudas como inventario (GAS.8e, ADR 182 D5): las dos puertas con cuántas
 * deudas tiene cada una, la frase de qué va en la elegida, sus deudas (las
 * vencidas primero, después la que más falta) y el pie: con entidades, el
 * plan para salir y "Agregar deuda con una entidad"; con personas, la pista
 * de Me deben y "Agregar deuda con una persona".
 *
 * @param {import('../../../core/state.js').Compromiso[]} deudas
 * @param {boolean} oculto
 * @param {Map<string, number>} atrasos
 */
function _renderInventarioDeudas(deudas, oculto, atrasos) {
  const porGrupo = {
    entidad: deudas.filter(c => c.tipo === 'deuda-entidad'),
    persona: deudas.filter(c => c.tipo === 'deuda-personal'),
  };
  const grupo = grupoDeudasVisible(porGrupo.entidad.length, porGrupo.persona.length);
  const puerta = _PUERTAS_DEUDAS.find(p => p.grupo === grupo);

  // GAS.10g (ADR 185 D8): un selector de dos pestañas con su conteo, sin la
  // frase que repetía la pestaña.
  // GAS.15c (ADR 191 D8): cada pestaña dice cuántas y cuánto ("2 · $7.450.000").
  const puertas = _PUERTAS_DEUDAS.map((p) => {
    const n = porGrupo[p.grupo].length;
    const activa = p.grupo === grupo;
    const cuanto = porGrupo[p.grupo].reduce((a, c) => a + Math.max(0, Number(c.saldoTotal) || 0), 0);
    const montoTxt = oculto ? SALDO_MASCARA_CUENTA : f(cuanto);
    return `
        <button type="button" class="deudas-puerta${activa ? ' deudas-puerta--activa' : ''}"
                data-action="deudas-grupo" data-grupo="${p.grupo}" aria-pressed="${activa}"
                aria-label="${p.titulo}, ${n === 0 ? 'ninguna' : `${n} ${n === 1 ? 'deuda' : 'deudas'}, ${montoTxt}`}">
          <span class="deudas-puerta__titulo">${p.titulo}</span>
          <span class="deudas-puerta__sub" aria-hidden="true">${n === 0 ? 'Ninguna' : `${n} · ${montoTxt}`}</span>
        </button>`;
  }).join('');

  const saldoDe = c => Math.max(0, Number(c.saldoTotal) || 0);
  const vencida = c => saldoDe(c) > 0 && (Number(c.cuotaMensual) || 0) > 0 && Number.isInteger(atrasos.get(c.id));
  const ordenadas = [...porGrupo[grupo]].sort((a, b) => {
    if (vencida(a) !== vencida(b)) return vencida(a) ? -1 : 1;
    if ((saldoDe(a) > 0) !== (saldoDe(b) > 0)) return saldoDe(a) > 0 ? -1 : 1;
    return saldoDe(b) - saldoDe(a);
  });
  const filas = ordenadas.map(c => _renderFilaInventario(c, { oculto, atraso: atrasos.get(c.id) })).join('');
  const listaHtml = filas ? `<div class="deuda-inv">${filas}</div>` : '';

  const pista = grupo === 'persona' ? `
      <a class="dia-nuevo__pista deudas-pista" href="#personales">
        <span class="dia-nuevo__pista-icono" aria-hidden="true"><svg class="icon"><use href="#i-personales"/></svg></span>
        <span class="dia-nuevo__pista-texto">¿Alguien te debe a ti? Eso va en <strong>Me deben</strong></span>
        ${icon('chevron-right')}
      </a>` : '';

  // GAS.15c (ADR 191 D8): "Finko revisó tus N deudas" va bajo la tarjeta, en
  // las dos pestañas, como el lienzo.
  return `
    ${htmlEntradaPlanSalida({ sugerencia: true })}
    <div class="deudas-puertas" role="group" aria-label="Tipo de deuda">${puertas}</div>
    ${listaHtml}
    <button type="button" class="deudas-agregar" data-action="comp-elegir-tipo-nuevo-ir" data-tipo="${puerta.tipo}">
      ${icon('plus')}${puerta.agregar}
    </button>
    ${pista}`;
}

/** Los dos caminos del vacío de Deudas (ADR 182 D5). */
const _CAMINOS_DEUDAS = [
  // GAS.9d (ADR 183 D4): la tarjeta de crédito se agrega en Mis cuentas.
  // GAS.15b (ADR 191): los textos del lienzo (página 7).
  { tipo: 'deuda-entidad', icono: 'c-edificio', titulo: 'Con un banco o entidad', ejemplo: 'Créditos, libranzas, compras a cuotas' },
  { tipo: 'deuda-personal', icono: 'i-personales', titulo: 'Con una persona', ejemplo: 'Familia, amigos, natillera, fiado' },
];

/**
 * La pestaña Deudas sin deudas (GAS.8e, ADR 182 D5). GAS.10g (ADR 185 D8):
 * un solo Tino, sin el sol, la pregunta y lo que hace Finko, dos tarjetas
 * lado a lado (Con una entidad, Con una persona) con "+ Agregar", y la
 * calma en una línea. Cabe en 393 x 740 sin desplazar.
 */
function _renderVacioDeudas() {
  const caminos = _CAMINOS_DEUDAS.map(c => `
        <li>
          <button type="button" class="vacio-caminos__fila deudas-camino" data-action="comp-elegir-tipo-nuevo-ir" data-tipo="${c.tipo}">
            <span class="deudas-puerta__teja deudas-puerta__teja--${c.tipo === 'deuda-personal' ? 'persona' : 'entidad'}" aria-hidden="true"><svg class="icon"><use href="#${c.icono}"/></svg></span>
            <span class="vacio-caminos__titulo">${c.titulo}</span>
            <span class="vacio-caminos__ejemplo">${c.ejemplo}</span>
            <span class="deudas-camino__agregar" aria-hidden="true">${icon('plus')}Agregar</span>
          </button>
        </li>`).join('');
  return `
    <div class="deudas-vacio">
      <div class="deudas-vacio__cab">
        ${htmlTinoSol('con-lupa', { tamano: 104, clase: 'deudas-vacio__tino tino-sol--libre' })}
        <p class="dia-nuevo__titulo">¿Le debes dinero a alguien?</p>
        <p class="dia-nuevo__texto">Anótalo y Finko te dice cuánto debes, a quién y cuándo pagas.</p>
      </div>
      <ul class="vacio-caminos deudas-vacio__caminos" aria-label="Qué deuda quieres anotar">${caminos}</ul>
      <p class="deudas-vacio__calma">Si no le debes a nadie, no tienes que hacer nada aquí.</p>
    </div>`;
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
  { tipo: 'deuda-entidad',  icono: 'i-deudas',     titulo: 'Deuda con entidad',  ejemplo: 'Crédito de vivienda, de carro o de libre inversión' },
  { tipo: 'deuda-personal', icono: 'i-personales', titulo: 'Deuda personal',     ejemplo: 'Lo que le debes a alguien conocido' },
];

/** Una fila de camino: abre su formulario de una vez. */
function _caminoPorPagar(c) {
  return `
        <li>
          <button type="button" class="vacio-caminos__fila" data-action="comp-elegir-tipo-nuevo-ir" data-tipo="${c.tipo}">
            ${tejaCategoria(c.icono, 'compromisos')}
            <span class="vacio-caminos__textos">
              <span class="vacio-caminos__titulo">${c.titulo}</span>
              <span class="vacio-caminos__ejemplo">${c.ejemplo}</span>
            </span>
            ${icon('chevron-right')}
          </button>
        </li>`;
}

/**
 * Los ocho caminos del vacío de Fijos (ADR 179 D4): abren el gasto fijo con
 * su categoría ya elegida; Energía y Agua van en Servicios públicos con su
 * nombre. "Otro" lo abre sin categoría.
 */
const _FIJOS_SUGERIDOS = [
  { nombre: 'Arriendo',       categoria: 'Arriendo',           icono: 'i-home' },
  { nombre: 'Energía',        categoria: 'Servicios públicos', icono: 'i-bolt' },
  { nombre: 'Agua',           categoria: 'Servicios públicos', icono: 'c-servicios' },
  { nombre: 'Internet',       categoria: 'Internet y TV',      icono: 'c-internet' },
  { nombre: 'Celular',        categoria: 'Celular',            icono: 'c-telefono' },
  { nombre: 'Administración', categoria: 'Administración',     icono: 'c-edificio' },
  { nombre: 'Streaming',      categoria: 'Streaming',          icono: 'c-streaming' },
  { nombre: 'Otro',           categoria: '',                   icono: 'i-plus' },
];

/** La pestaña Fijos sin fijos: Tino con su calendario y por dónde empezar. */
function _renderVacioFijos() {
  const chips = _FIJOS_SUGERIDOS.map(x => `
        <li>
          <button type="button" class="fijos-vacio__chip" data-action="comp-nuevo-fijo-sugerido"
                  data-categoria="${_esc(x.categoria)}" data-nombre="${x.categoria && x.categoria !== x.nombre ? _esc(x.nombre) : ''}">
            ${tejaCategoria(x.icono, 'agenda')}
            <span>${_esc(x.nombre)}</span>
          </button>
        </li>`).join('');
  return `
    <div class="pestana-vacia">
      ${htmlTinoSol('con-calendario', { tamano: 132, clase: 'pestana-vacia__tino' })}
      <p class="pestana-vacia__titulo">Anota lo que pagas cada mes</p>
      <p class="pestana-vacia__texto">Finko te avisa antes de que venza cada pago y te dice cuánto te falta pagar en el mes.</p>
      <p class="fijos-vacio__pregunta" id="fijos-vacio-pregunta">¿Cuál pagas? Empieza con uno</p>
      <ul class="fijos-vacio__chips" aria-labelledby="fijos-vacio-pregunta">${chips}</ul>
    </div>`;
}

function _renderEmptyState() {
  const caminos = _CAMINOS_POR_PAGAR.map(_caminoPorPagar).join('');
  return `
    <div class="empty-state pattern-dots empty-state--caminos">
      <div class="empty-state__icon" aria-hidden="true">${emptyArt('deudas')}</div>
      <p class="empty-state__title">Nada por pagar todavía</p>
      <p class="empty-state__desc">Agrega tu arriendo, un servicio, una tarjeta o un préstamo y Finko te avisa cuándo vence cada uno.</p>
      <p class="vacio-caminos__pregunta" id="vacio-caminos-por-pagar">¿Qué quieres agregar primero?</p>
      <ul class="vacio-caminos" aria-labelledby="vacio-caminos-por-pagar">${caminos}</ul>
    </div>`;
}

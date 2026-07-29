/**
 * inversiones/view.js - HTML del dominio Inversión (J.2).
 * Puede leer S. No puede mutarlo. Sin lógica de negocio.
 */

import { S } from '../../core/state.js';
import { f, fechaLegible, formateadorFecha, esc as _esc } from '../../infra/utils.js';
import { icon, emptyArt } from '../../infra/icons.js';
import { ipcObservadoVigente } from '../../core/constants.js';
import { calcularRegla72 } from '../../infra/financiero.js';
import {
  calcularTotalInvertido,
  ordenarInversionesPorMonto,
  proyectarInversion,
  calcularRentabilidadRealPortafolio,
  columnasPortafolio,
  momentoInversion,
  fechaVencimientoInversion,
  rasgoTipo,
  TIPOS_INVERSION,
  TOTAL_MOMENTOS,
} from './logic.js';

/** IPC observado más reciente (E.5): el descuento real de poder adquisitivo. */
const IPC_VIGENTE = ipcObservadoVigente();
const IPC_PCT     = IPC_VIGENTE.valor * 100;

/** "marzo de 2027": la etiqueta de vencimiento, sin día, que es lo que importa. */
const MES_ANIO = formateadorFecha('es-CO', { month: 'long', year: 'numeric', timeZone: 'UTC' });

/** @param {string} iso 'YYYY-MM-DD' @returns {string} 'marzo de 2027'. */
function _mesAnio(iso) {
  return MES_ANIO.format(new Date(`${iso}T12:00:00Z`));
}

// ── RENDER PRINCIPAL ─────────────────────────────────────────────

/**
 * Renderiza el panel de Inversión en `#panel-inversion`.
 * No-op si el contenedor no existe.
 */
export function renderInversion() {
  const el = document.getElementById('panel-inversion');
  if (!el) return;

  const inversiones = Array.isArray(S.inversiones) ? S.inversiones : [];

  if (inversiones.length === 0) {
    el.innerHTML = _renderEmptyState();
    return;
  }

  el.innerHTML = `
    ${_renderMomento(inversiones)}
    ${_renderLista(inversiones)}`;
}

// ── EMPTY STATE ──────────────────────────────────────────────────

function _renderEmptyState() {
  return `
    <div class="empty-state">
      <div class="empty-state__icon">${emptyArt('inversion')}</div>
      <p class="empty-state__title">Registra tus inversiones</p>
      <p class="empty-state__desc">Registra tu primera inversión: CDT, fondo, acciones o cripto.</p>
      <button class="btn btn-primary" data-action="inversion-nueva">+ Registrar inversión</button>
      <p class="empty-state__tip">${icon('lightbulb')} Tip: primero asegura tu fondo de emergencia, en la pestaña Fondo (arriba). Invierte el dinero que no vas a necesitar a corto plazo.</p>
    </div>`;
}

// ── LA TARJETA DEL MOMENTO (DIS.17) ──────────────────────────────

/**
 * DIS.17 (arquitectura O con el gráfico de N): la cabecera de la sección deja
 * de ser un total y pasa a ser **la etapa en la que está el usuario**. El total
 * invertido no enseñaba nada por sí solo: no decía de qué está hecho ni qué le
 * aporta el tiempo, que es la única razón para invertir.
 *
 * Tres piezas hacen el trabajo que antes repartían el hero, la card de
 * proyección, la lista de porcentajes, los nudges y el tip permanente:
 *
 * - **La etapa y su frase** dicen quién es el usuario hoy, y la lección cambia
 *   cuando él cambia: con una inversión se explica qué compró, con varias se
 *   explica por qué conviene repartir. Una explicación que se repite para
 *   siempre deja de educar.
 * - **El gráfico de dos columnas** compara hoy contra al vencer, con la primera
 *   partida por tipo: diversificación y rendimiento en una sola figura.
 * - **El anticipo** dice qué va a ver después, no cuánto va a ganar. Es la
 *   única forma honesta de motivar en una sección de inversión.
 *
 * Ninguna barra de progreso: una inversión no tiene meta, y ponerle una sería
 * inventársela.
 */
function _renderMomento(inversiones) {
  // La vista puede leer S (no muta). Lee el estado del fondo sin importar el
  // dominio Ahorro (regla ADN #10): solo consulta el slice de estado.
  const fondo   = S.ahorro?.fondoEmergencia;
  const momento = momentoInversion(inversiones, {
    fondoActivo:     fondo?.activo === true,
    fondoCompletado: fondo?.completado === true,
  });
  if (!momento) return '';

  const total = calcularTotalInvertido(inversiones);
  const cols  = columnasPortafolio(inversiones);

  // En el momento 1 la segunda columna se rotula con el vencimiento real de la
  // única inversión ("marzo de 2027"), que dice mucho más que "al vencer".
  const unica       = momento.numero === 1
    ? inversiones.find(i => Number(i?.monto) > 0)
    : null;
  const vencimiento = unica ? fechaVencimientoInversion(unica) : null;

  const sumaHtml = cols && cols.rendimiento > 0
    ? `<p class="inversion-momento__suma">y el tiempo le suma <strong>${f(cols.rendimiento)}</strong> más</p>`
    : '';

  const avisoHtml = momento.aviso
    ? `<p class="inversion-momento__aviso"><strong>${_esc(momento.aviso.titulo)}.</strong> ${_esc(momento.aviso.desc)}</p>`
    : '';

  const pieHtml = cols && cols.proyectables > 0
    ? `<p class="inversion-momento__pie">Es un cálculo con la tasa y el plazo que registraste, no una promesa: confírmalo con tu entidad.</p>`
    : '';

  return `
    <article class="inversion-momento" data-dom="inversion" aria-label="Tu momento como inversionista">
      <div class="inversion-momento__cabecera">
        <span class="inversion-momento__kicker">Momento ${momento.numero} de ${TOTAL_MOMENTOS}</span>
        <span class="inversion-momento__chip">${_esc(momento.chip)}</span>
      </div>

      <div class="inversion-momento__intro">
        <p class="inversion-momento__titulo">${_esc(momento.titulo)}</p>
        <p class="inversion-momento__frase">${_esc(momento.frase)}</p>
      </div>

      ${_renderDuo(cols, vencimiento ? _mesAnio(vencimiento) : 'al vencer', Boolean(unica))}

      <div class="inversion-momento__construido">
        <p class="inversion-momento__kicker">Lo que has construido</p>
        <p class="inversion-momento__monto">${f(total)}</p>
        ${sumaHtml}
      </div>

      ${_renderNotaMomento(inversiones, cols, momento)}

      <div class="inversion-momento__anticipo">
        <p class="inversion-momento__kicker">${_esc(momento.anticipoKicker)}</p>
        <p class="inversion-momento__frase">${_esc(momento.anticipo)}</p>
      </div>

      ${avisoHtml}
      ${pieHtml}
      ${_renderAcciones(momento)}
    </article>`;
}

/**
 * El gráfico: dos columnas de altura comparada. La de hoy está partida por tipo
 * de inversión, así que la composición se ve sin nombrarla; la de al vencer
 * repite ese cuerpo y le añade encima lo que pone el tiempo. Ese segmento es
 * pequeño en un portafolio joven, y es honesto: invertir no es rápido, y quien
 * lo vea crecer con los años entiende el interés compuesto sin que se lo
 * expliquen.
 *
 * Sin nada proyectable (todo de retorno variable) la segunda columna no se
 * dibuja: repetir la primera fingiría una comparación que no existe.
 */
function _renderDuo(cols, etiquetaFuturo, esUnica) {
  if (!cols || cols.segmentos.length === 0) return '';

  const segs = cols.segmentos.map((s, i) => `
            <span class="inversion-momento__seg" data-seg="${Math.min(i, 4)}" style="height:${s.alto}%"></span>`).join('');

  const colFuturo = cols.altoTiempo > 0
    ? `
        <div class="inversion-momento__col" aria-hidden="true">
          <div class="inversion-momento__stack">
            <span class="inversion-momento__seg inversion-momento__seg--tiempo" style="height:${cols.altoTiempo}%"></span>${segs}
          </div>
          <span class="inversion-momento__col-lb">${_esc(etiquetaFuturo)}</span>
        </div>`
    : '';

  // La leyenda es la que lleva el dato: por eso las columnas van ocultas al
  // lector de pantalla y esta lista no.
  const leyenda = [];
  if (cols.altoTiempo > 0) leyenda.push({ seg: 'tiempo', tx: 'lo pone el tiempo' });
  if (esUnica) {
    leyenda.push({ seg: '0', tx: 'lo pusiste tú' });
  } else {
    cols.segmentos.forEach((s, i) => {
      const rasgo = rasgoTipo(s.tipo);
      leyenda.push({
        seg: String(Math.min(i, 4)),
        tx:  `${s.tipo} · ${s.pct}%${rasgo ? ` · ${rasgo}` : ''}`,
      });
    });
  }

  const leyendaHtml = leyenda.map(l => `
          <span class="inversion-momento__leg">
            <span class="inversion-momento__leg-sw" data-seg="${l.seg}" aria-hidden="true"></span>
            <span>${_esc(l.tx)}</span>
          </span>`).join('');

  return `
      <div class="inversion-momento__duo">
        <div class="inversion-momento__col" aria-hidden="true">
          <div class="inversion-momento__stack">${segs}</div>
          <span class="inversion-momento__col-lb">hoy</span>
        </div>
        ${colFuturo}
        <div class="inversion-momento__leyenda">${leyendaHtml}</div>
      </div>`;
}

/**
 * El matiz de la inflación, en palabras (E.5, el cálculo no cambia). La frase
 * de banco ("rentabilidad nominal 10,1% EA a real 4,7%") era la más difícil de
 * la app para quien está aprendiendo, y decía lo mismo.
 */
function _renderNotaMomento(inversiones, cols, momento) {
  if (!cols) return '';

  if (cols.proyectables === 0) {
    return `
      <p class="inversion-momento__nota">Agrega la tasa y el plazo de tus inversiones de plazo fijo (CDT, fondos) para ver cuánto tendrías al final.</p>`;
  }

  const partes = [];
  const real   = calcularRentabilidadRealPortafolio(inversiones, IPC_PCT);

  if (real) {
    partes.push(`Tu dinero crece ${_fmtTasa(real.tasaNominalPct)}% al año. Como los precios suben ${_fmtTasa(IPC_PCT)}%, lo que de verdad ganas es ${_fmtTasa(real.tasaRealPct)}%.`);
    // La regla del 72 solo en el momento 1: con una sola inversión duplicar es
    // una idea nueva; con varias, la nota ya dice bastante.
    if (momento.numero === 1) {
      const r72 = _fraseRegla72(real.tasaNominalPct);
      if (r72) partes.push(r72);
    }
  }

  if (cols.noProyectables > 0) {
    partes.push(cols.noProyectables === 1
      ? 'Una de tus inversiones no tiene una ganancia fija, así que no entra en ese cálculo.'
      : `${cols.noProyectables} de tus inversiones no tienen una ganancia fija, así que no entran en ese cálculo.`);
  }

  if (partes.length === 0) return '';
  return `
      <p class="inversion-momento__nota">${partes.join(' ')}</p>`;
}

/**
 * Cuánto tarda el dinero en duplicarse a esa tasa (regla del 72, ya
 * implementada en `infra/financiero.js`).
 *
 * @param {number} tasaNominalPct - Tasa EA en % (ej. 12).
 * @returns {string} '' si la tasa no da un plazo que valga la pena contar.
 */
function _fraseRegla72(tasaNominalPct) {
  if (!(tasaNominalPct > 0)) return '';
  const r = calcularRegla72(tasaNominalPct);
  if (!Number.isFinite(r.aniosExactos) || r.aniosExactos >= 100) return '';
  const anios = Math.max(1, Math.round(r.aniosExactos));
  return `Si no lo tocas, este dinero se duplica en unos ${anios} ${anios === 1 ? 'año' : 'años'}.`;
}

/**
 * La acción principal del conjunto, a lo ancho. En el momento 1, si el fondo de
 * emergencia todavía no existe, lo que la sección ofrece primero es ir al
 * fondo: registrar otra inversión sigue disponible, un peldaño más abajo.
 */
function _renderAcciones(momento) {
  const irAlFondo = momento.numero === 1 && momento.aviso?.id === 'fondo-primero';

  if (irAlFondo) {
    return `
      <div class="inversion-momento__acciones">
        <a class="inversion-momento__principal" href="#ahorro">Ir al Fondo de emergencia</a>
        <button class="btn btn-ghost btn-sm inversion-momento__secundaria" type="button" data-action="inversion-nueva">
          ${_esc(momento.accion)}
        </button>
      </div>`;
  }

  return `
      <div class="inversion-momento__acciones">
        <button class="inversion-momento__principal" type="button" data-action="inversion-nueva">
          ${_esc(momento.accion)}
        </button>
      </div>`;
}

// ── LISTA DE HOLDINGS ────────────────────────────────────────────

function _renderLista(inversiones) {
  const ordenadas = ordenarInversionesPorMonto(inversiones);

  // DIS.17: el botón de registrar se fue de este encabezado. La acción principal
  // de la sección vive en la tarjeta del momento, a ancho completo, y tenerla
  // dos veces en la misma pantalla la volvía ruido (regla R1: un primario).
  return `
    <section class="inversion-lista" aria-label="Mis inversiones">
      <div class="inversion-lista__header">
        <h2 class="inversion-lista__title">Mis inversiones</h2>
      </div>
      <ul class="inversion-lista__items" role="list">
        ${ordenadas.map(_renderItem).join('')}
      </ul>
    </section>`;
}

/**
 * @param {{id:string, tipo:string, nombre:string, monto:number,
 *          tasaEA:number, plazoMeses:number, fechaInicio:string}} inv
 */
function _renderItem(inv) {
  const tasaHtml = Number(inv.tasaEA) > 0
    ? `<span class="inversion-item__chip">Crece ${_fmtTasa(inv.tasaEA)}% al año</span>`
    : '';
  const plazoHtml = Number(inv.plazoMeses) > 0
    ? `<span class="inversion-item__chip">termina en ${inv.plazoMeses} ${inv.plazoMeses === 1 ? 'mes' : 'meses'}</span>`
    : '';
  const fechaHtml = inv.fechaInicio
    ? `<span class="inversion-item__fecha">Desde ${fechaLegible(inv.fechaInicio)}</span>`
    : '';

  // Proyección al vencimiento (solo holdings con tasa + plazo). La línea nombra
  // el mes en el que pasa y separa lo que puso el usuario de lo que pone el
  // tiempo: es la primera vez que la app explica de dónde sale una ganancia.
  const proy  = proyectarInversion(inv);
  const vence = proy ? fechaVencimientoInversion(inv) : null;
  const proyHtml = proy
    ? `<p class="inversion-item__proy">
        ${vence ? `En ${_esc(_mesAnio(vence))} tendrías` : 'Al vencer tendrías'} <strong>${f(proy.valorFuturo)}</strong>.
        De eso, <strong>${f(proy.rendimiento)}</strong> los pone el tiempo.
      </p>`
    : '';

  return `
    <li class="list-item" data-id="${_esc(inv.id)}">
      <div class="list-item__body">
        <p class="list-item__title">${_esc(inv.nombre)}</p>
        <p class="list-item__subtitle">
          <span class="inversion-item__tipo">${_esc(inv.tipo)}</span>
          ${tasaHtml}${plazoHtml}${fechaHtml}
        </p>
        ${proyHtml}
      </div>
      <div class="list-item__action">
        <span class="list-item__value">${f(inv.monto)}</span>
        <button class="btn btn-ghost btn-icon"
                data-action="inversion-eliminar"
                data-id="${_esc(inv.id)}"
                aria-label="Eliminar inversión ${_esc(inv.nombre)}">
          <svg class="icon" aria-hidden="true"><use href="#i-trash"/></svg>
        </button>
      </div>
    </li>`;
}

// ── FORMULARIO MODAL - ALTA ──────────────────────────────────────

/**
 * HTML del formulario para registrar una nueva inversión.
 *
 * @param {{ fechaInicio: string }} opts  fecha en YYYY-MM-DD (default: hoy).
 * @returns {string}
 */
export function renderFormInversion({ fechaInicio }) {
  const opciones = TIPOS_INVERSION
    .map(t => `<option value="${_esc(t)}">${_esc(t)}</option>`)
    .join('');

  return `
    <form id="form-inversion" novalidate>
      <div class="form-group">
        <label for="inv-tipo" class="label">Tipo de inversión</label>
        <select id="inv-tipo" name="tipo" class="input" required aria-required="true">
          ${opciones}
        </select>
      </div>

      <div class="form-group">
        <label for="inv-nombre" class="label">Nombre</label>
        <input id="inv-nombre" name="nombre" class="input" type="text"
               maxlength="60" placeholder="Ej. CDT Bancolombia, ETF S&amp;P 500, Bitcoin"
               required aria-required="true" autocomplete="off" autofocus />
      </div>

      <div class="form-group">
        <label for="inv-monto" class="label">Monto invertido (COP)</label>
        <input id="inv-monto" name="monto" class="input" type="number"
               min="1" step="10000" placeholder="1000000"
               required aria-required="true" inputmode="numeric" />
      </div>

      <div class="form-group">
        <label for="inv-tasa" class="label">Tasa EA estimada (%) <span class="label__opt">opcional</span></label>
        <input id="inv-tasa" name="tasaEA" class="input" type="number"
               min="0" max="100" step="0.1" placeholder="0"
               inputmode="decimal" />
        <p class="form-hint">Déjalo en 0 si la rentabilidad es variable (acciones, cripto).</p>
      </div>

      <div class="form-group">
        <label for="inv-plazo" class="label">Plazo (meses) <span class="label__opt">opcional</span></label>
        <input id="inv-plazo" name="plazoMeses" class="input" type="number"
               min="0" step="1" placeholder="0" inputmode="numeric" />
        <p class="form-hint">Pon 0 si no tiene un plazo fijo.</p>
      </div>

      <div class="form-group">
        <label for="inv-fecha" class="label">Fecha de inicio</label>
        <input id="inv-fecha" name="fechaInicio" class="input" type="date"
               value="${_esc(fechaInicio)}" required aria-required="true" />
      </div>

      <div class="modal__footer">
        <button type="button" class="btn btn-ghost" data-action="modal-close">Cancelar</button>
        <button type="submit" class="btn btn-primary">Guardar inversión</button>
      </div>
    </form>`;
}

// ── HELPERS ──────────────────────────────────────────────────────

/**
 * Formatea una tasa a máximo 2 decimales, suprimiendo el ".0" cuando es entera
 * y usando coma decimal. 12 → "12", 12.5 → "12,5", 7.2816 → "7,28".
 */
function _fmtTasa(n) {
  const num = Math.round((Number(n) || 0) * 100) / 100;
  const entero = Math.abs(num - Math.round(num)) < 0.005;
  return entero ? String(Math.round(num)) : num.toString().replace('.', ',');
}

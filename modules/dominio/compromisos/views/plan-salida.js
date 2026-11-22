/**
 * compromisos/views/plan-salida.js - la hoja del plan de deudas en el teléfono.
 *
 * GAS.15a ([ADR 190](../../../../docs/DECISIONS/190-el-plan-de-deudas-del-lienzo.md)):
 * la página 8 del lienzo "Gastos · Rediseño integral" en tres vistas de la
 * misma hoja:
 *
 * - **La recomendación** (`recomendacion`): Tino y "Tu plan para salir de
 *   deudas", la tarjeta bosque con lo que Finko recomienda y por qué, "Qué
 *   cambia si lo aplicas" (tres cifras), "El orden" y, al pie, "Aplicar este
 *   plan" y "Comparar con otras formas de pagar".
 * - **Comparar** (`comparar`): cuánto más al mes (chips), y cada forma de
 *   pagar con cuándo terminas y cuánto pagas en intereses.
 * - **Cómo funciona** (`como`): cuándo terminas cada deuda con el plan y
 *   como vas hoy, y lo que haces tú.
 *
 * Todo sale del motor (`analizarDeudas`, ADR 189 D5): solo las deudas con
 * tasa y cuota conocidas entran en las cuentas; las demás van al final de
 * "El orden" con lo que les falta. Desde 1024px el simulador sigue siendo la
 * tarjeta de `estrategia.js`, con "Tu plan" arriba (`htmlTuPlan`).
 *
 * Puede leer S. No puede mutarlo.
 */

import { miles } from '../../../infra/miles.js';
import { S } from '../../../core/state.js';
import { esc as _esc, f, hoy } from '../../../infra/utils.js';
import { icon } from '../../../infra/icons.js';
import { htmlTinoSol } from '../../../infra/ilustraciones.js';
import { estimarSalarioMensual } from '../../../infra/financiero.js';
import { resolverMarca } from '../../../infra/marcas.js';
import {
  recomendarEstrategia, calcularFijosMensuales, analizarDeudas, deudasUnibles,
  simularEstrategiaPago, simularPagoDeuda, mesMas,
} from '../logic.js';
import { calcularGastoVariablePromedio } from '../../tesoreria/logic.js';
import { formatearDuracion, renderRenegociar, renderConsolidar } from './estrategia-impacto.js';
import { tejaDeudaInventario } from './lista.js';

/** Diferencias por debajo de esto se leen como "lo mismo" (redondeo de la simulación). */
const _MISMO = 1_000;

/** Lo que se puede poner de más, en chips (el lienzo); "Otro" abre el monto. */
const EXTRAS_PLAN = Object.freeze([0, 100_000, 150_000, 250_000]);

const _ESTRATEGIA = {
  avalancha: {
    nombre: 'Avalancha',
    icono: 'mountain',
    corto: 'Primero la de interés más alto',
    mecanismo: 'Pon el dinero extra en la deuda con el interés más alto. Así pagas menos intereses.',
    como: 'Pagas la cuota de todas y el extra va a la deuda que cobra más interés. Cuando se acaba, ese dinero pasa a la siguiente.',
  },
  bolaNieve: {
    nombre: 'Bola de nieve',
    icono: 'snowball',
    corto: 'Primero la más pequeña',
    mecanismo: 'Pon el dinero extra en la deuda más pequeña. Terminarla pronto te libera su cuota para la siguiente.',
    como: 'Pagas la cuota de todas y el extra va a la deuda más pequeña. Cuando se acaba, ese dinero pasa a la siguiente.',
  },
};

const _MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const _MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const _mesLegible = (ym) => {
  const m = /^(\d{4})-(\d{2})$/.exec(String(ym ?? ''));
  return m ? `${_MESES[Number(m[2]) - 1]} de ${m[1]}` : '';
};
/** "nov 2027" */
const _mesCorto = (ym) => {
  const m = /^(\d{4})-(\d{2})$/.exec(String(ym ?? ''));
  return m ? `${_MESES_CORTOS[Number(m[2]) - 1]} ${m[1]}` : '';
};
const _lista = (nombres) => (nombres.length <= 1 ? nombres.join('')
  : `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}`);

/**
 * GAS.14e (ADR 189 D5): el análisis del motor con lo registrado. Sin el extra
 * que se está escribiendo: la estructura sale de los datos (BUG-011). La
 * capacidad usa el ingreso estimado, los fijos y el promedio del día a día de
 * los tres meses cerrados.
 */
export function analisisDelPlan() {
  return analizarDeudas(S.compromisos ?? [], {
    hoyISO: hoy(),
    ingresoMensual: estimarSalarioMensual(S.ingresos ?? []),
    fijosMensuales: calcularFijosMensuales(S.compromisos ?? []),
    // Sin ningún mes cerrado con gastos el promedio es desconocido (null),
    // no 0: restar 0 inflaría lo que queda libre.
    diaADia: calcularGastoVariablePromedio(S.gastos ?? []) || null,
  });
}

/** El orden que recomienda el motor; si recomienda otra cosa, el de siempre. */
function _recomendada(analisis) {
  const id = analisis.principal?.id;
  if (id === 'avalancha' || id === 'bolaNieve') return id;
  return recomendarEstrategia(analisis.simulables, 0).estrategia ?? 'bolaNieve';
}

/**
 * Lo elegido en la hoja: el orden (el del usuario o el recomendado) y el
 * extra al mes (el elegido; si no eligió, el mínimo que frena lo que crece).
 * Lo usan la hoja y "Aplicar este plan".
 *
 * @param {ReturnType<typeof analisisDelPlan>} analisis
 * @param {{ estrategia?: string|null, extraMensual?: number, extraElegido?: boolean }} ui
 * @returns {{ estrategia: 'avalancha'|'bolaNieve', recomendada: 'avalancha'|'bolaNieve', extra: number, nombre: string }}
 */
export function eleccionDelPlan(analisis, ui = {}) {
  const recomendada = _recomendada(analisis);
  const estrategia = ui.estrategia === 'avalancha' || ui.estrategia === 'bolaNieve' ? ui.estrategia : recomendada;
  const minimo = Number(analisis.principal?.extraMinimo) || 0;
  const extra = ui.extraElegido ? Math.max(0, Number(ui.extraMensual) || 0)
    : (Number(ui.extraMensual) > 0 ? Number(ui.extraMensual) : minimo);
  return { estrategia, recomendada, extra, nombre: _ESTRATEGIA[estrategia].nombre };
}

/** Las deudas que entran, en el orden en que reciben lo que sobra. */
function _prioridad(deudas, estrategia) {
  return [...deudas].sort(estrategia === 'bolaNieve'
    ? (a, b) => a.saldo - b.saldo
    : (a, b) => (b.tasaEA ?? 0) - (a.tasaEA ?? 0));
}

/** "Bancolombia · 28 % E.A.", "Sin interés", "Falta la tasa". */
function _subDeuda(d) {
  const c = (S.compromisos ?? []).find(x => x.id === d.id);
  const marca = d.tipo === 'deuda-entidad' ? resolverMarca(d.descripcion) : null;
  // La entidad, si el nombre de la deuda no la dice ya ("Libre inversión" de Davivienda).
  const entidad = marca ? String(marca.nombre ?? marca.id ?? '') : '';
  const quien = entidad && !String(d.descripcion).toLowerCase().includes(entidad.toLowerCase()) ? entidad : null;
  let tasa;
  if (!d.tasaConocida) tasa = 'Falta la tasa';
  else if (!(d.tasaEA > 0)) tasa = 'Sin interés';
  else if (c?.tasaUnidad === 'mensual' && Number(c.tasa) > 0) tasa = `${Number((Number(c.tasa) * 100).toFixed(2))} % mensual`;
  else tasa = `${Number((d.tasaEA * 100).toFixed(1))} % E.A.`;
  return [quien, tasa].filter(Boolean).join(' · ');
}

/** La teja de la deuda: la del inventario de Deudas. */
function _teja(d) {
  const c = (S.compromisos ?? []).find(x => x.id === d.id);
  return c ? tejaDeudaInventario(c) : '';
}

/** El encabezado de una vista interior: volver y su título. */
function _barra(titulo, subtitulo = '') {
  return `
    <header class="plan-hoja__barra">
      <button type="button" class="plan-hoja__volver" data-action="plan-volver" aria-label="Volver">${icon('arrow-left')}</button>
      <span class="plan-hoja__barra-textos">
        <h2 class="plan-hoja__titulo" id="plan-hoja-titulo" tabindex="-1">${_esc(titulo)}</h2>
        ${subtitulo ? `<span class="plan-hoja__subtitulo">${_esc(subtitulo)}</span>` : ''}
      </span>
    </header>`;
}

const _chipEstimado = (texto = 'Estimado con tus datos') =>
  `<span class="plan-hoja__chip">${icon('info')}${_esc(texto)}</span>`;

const _pie = (texto, accion = 'aplicar-plan') => `
    <div class="plan-hoja__pie">
      <button type="button" class="btn btn-primary plan-hoja__aplicar" data-action="${accion}">${_esc(texto)}</button>
    </div>`;

// ── La recomendación ────────────────────────────────────────────

/** Las tres cifras de "Qué cambia si lo aplicas". */
function _queCambia(plan, base, extra, primera, hoyISO) {
  const fin = (r) => (r.completo ? _mesCorto(mesMas(hoyISO, r.meses)) : '');
  const datos = [];
  if (!plan.completo) {
    datos.push({ cifra: 'No terminas', que: 'con estas cuotas', nota: 'pon más cada mes' });
  } else if (!base.completo) {
    datos.push({ cifra: fin(plan), que: 'terminas de pagar', nota: 'hoy no terminas' });
  } else if (base.meses > plan.meses) {
    datos.push({ cifra: formatearDuracion(base.meses - plan.meses), que: 'antes de lo previsto', nota: `${fin(plan)}, no ${fin(base)}` });
  } else {
    datos.push({ cifra: fin(plan), que: 'terminas de pagar', nota: 'igual que hoy' });
  }
  const intereses = Math.round(plan.interesesTotales ?? 0);
  if (plan.completo && base.completo && base.intereses - intereses >= _MISMO) {
    datos.push({ cifra: f(base.intereses - intereses), que: 'menos en intereses', nota: 'en todo el plan' });
  } else if (plan.completo) {
    datos.push({ cifra: f(intereses), que: 'en intereses', nota: 'en todo el plan' });
  } else {
    datos.push({ cifra: 'Crecen', que: 'los intereses', nota: 'más que tus cuotas' });
  }
  datos.push(extra > 0
    ? { cifra: f(extra), que: 'extra cada mes', nota: `a ${primera}` }
    : { cifra: f(0), que: 'extra cada mes', nota: 'lo que liberas pasa a la siguiente' });
  return `
      <div class="plan-cambia">${datos.map(d => `
        <div class="plan-cambia__dato">
          <span class="plan-cambia__cifra">${_esc(d.cifra)}</span>
          <span class="plan-cambia__que">${_esc(d.que)}</span>
          <span class="plan-cambia__nota">${_esc(d.nota)}</span>
        </div>`).join('')}
      </div>`;
}

/** La tarjeta bosque: qué recomienda Finko (o lo que eligió el usuario) y por qué. */
function _htmlRecomienda(analisis, eleccion) {
  const p = analisis.principal;
  const est = _ESTRATEGIA[eleccion.estrategia];
  let eyebrow = 'Finko te recomienda';
  let nombre = est.nombre;
  let icono = est.icono;
  let texto = est.mecanismo;
  if (p?.id === 'detener-crecimiento' || p?.id === 'completar-datos' || p?.id === 'cuota-actual') {
    nombre = p.titulo;
    icono = p.id === 'detener-crecimiento' ? 'alert' : p.id === 'completar-datos' ? 'info' : est.icono;
    texto = p.porque[0] ?? '';
  } else if (eleccion.estrategia !== eleccion.recomendada) {
    eyebrow = 'Tu elección';
  } else if (p?.porque?.[0]) {
    // El porqué del motor, con sus cifras (ADR 189 D5, regla 4).
    texto = p.porque[0];
  }
  return `
    <section class="plan-reco" aria-labelledby="plan-reco-nombre">
      <span class="plan-reco__eyebrow">${_esc(eyebrow)}</span>
      <p class="plan-reco__nombre" id="plan-reco-nombre">${icon(icono)}<span>${_esc(nombre)}</span></p>
      <p class="plan-reco__texto">${_esc(texto)}</p>
    </section>`;
}

/** "El orden": las que entran, en su orden; al final, las que no y por qué. */
function _htmlOrden(analisis, eleccion) {
  const orden = _prioridad(analisis.simulables, eleccion.estrategia);
  const fuera = analisis.inventario.filter(d => !analisis.simulables.some(x => x.id === d.id));
  const filas = orden.map((d, i) => `
        <li class="plan-orden__fila">
          <span class="plan-orden__num${i === 0 ? ' plan-orden__num--primera' : ''}" aria-hidden="true">${i + 1}</span>
          ${_teja(d)}
          <span class="plan-orden__textos"><span class="plan-orden__nombre">${_esc(d.descripcion)}</span>
          <span class="plan-orden__sub">${_esc(_subDeuda(d))}</span></span>
          <span class="plan-orden__estado${i === 0 ? ' plan-orden__estado--primera' : ''}">${i === 0 ? (eleccion.extra > 0 ? 'Aquí va el extra' : 'Va primero') : 'Sigue con su cuota'}</span>
        </li>`);
  for (const d of fuera) {
    filas.push(`
        <li class="plan-orden__fila plan-orden__fila--fuera">
          <span class="plan-orden__num" aria-hidden="true"></span>
          ${_teja(d)}
          <span class="plan-orden__textos"><span class="plan-orden__nombre">${_esc(d.descripcion)}</span>
          <span class="plan-orden__sub">${_esc(!d.tasaConocida ? 'Falta la tasa' : 'Sin cuota acordada')}</span></span>
          <span class="plan-orden__estado">Fuera del plan</span>
        </li>`);
  }
  return `
    <section class="plan-hoja__grupo" aria-labelledby="plan-orden-h">
      <h3 class="plan-hoja__h" id="plan-orden-h">El orden</h3>
      <ol class="plan-orden">${filas.join('')}
      </ol>
    </section>`;
}

function _htmlRecomendacion(analisis, ui) {
  const eleccion = eleccionDelPlan(analisis, ui);
  const deudas = analisis.simulables;
  const hayPlan = deudas.length > 0 && analisis.principal?.id !== 'completar-datos';
  const primera = _prioridad(deudas, eleccion.estrategia)[0]?.descripcion ?? '';
  const plan = hayPlan ? simularEstrategiaPago(deudas, eleccion.extra, eleccion.estrategia) : null;
  // ADR 189 D5, regla 10: los supuestos de toda simulación.
  const supuestos = analisis.supuestos.map(x => x.charAt(0).toLowerCase() + x.slice(1).replace(/\.$/, ''));
  return `
    <div class="plan-hoja plan-hoja--recomendacion">
      <header class="plan-hoja__cabeza">
        ${htmlTinoSol('pensando', { tamano: 58, clase: 'plan-hoja__tino' })}
        <span class="plan-hoja__cabeza-textos">
          <h2 class="plan-hoja__titulo" id="plan-hoja-titulo" tabindex="-1">Tu plan para salir de deudas</h2>
          ${_chipEstimado()}
        </span>
      </header>
      ${_htmlRecomienda(analisis, eleccion)}
      ${plan ? `
      <section class="plan-hoja__grupo" aria-labelledby="plan-cambia-h">
        <h3 class="plan-hoja__h" id="plan-cambia-h">Qué cambia si lo aplicas</h3>
        ${_queCambia(plan, analisis.escenarios.base, eleccion.extra, primera, hoy())}
      </section>` : ''}
      ${_htmlOrden(analisis, eleccion)}
      ${plan ? `
      <button type="button" class="plan-hoja__enlace" data-action="plan-ver-como">${icon('info')}<span>Cómo funciona, mes a mes</span>${icon('chevron-right')}</button>` : ''}
      <p class="plan-hoja__nota">Son estimados con las tasas y cuotas que registraste. Suponen que ${_esc(_lista(supuestos))}. Nada cambia hasta que apliques algo.</p>
      ${plan ? `
      <div class="plan-hoja__pie">
        <button type="button" class="btn btn-primary plan-hoja__aplicar" data-action="aplicar-plan">Aplicar este plan</button>
        ${deudas.length >= 2 ? `<button type="button" class="plan-hoja__comparar" data-action="plan-ver-comparar">Comparar con otras formas de pagar${icon('chevron-right')}</button>` : ''}
      </div>` : ''}
    </div>`;
}

// ── Comparar ────────────────────────────────────────────────────

/** Una forma de pagar: cuándo terminas (barra) y cuánto en intereses. */
function _htmlFin(r, horizonte, hoyISO, primaria) {
  if (!r.completo) {
    return `
        <span class="plan-cmp__linea"><span class="plan-cmp__barra"><span class="plan-cmp__barra-lleno plan-cmp__barra-lleno--no" style="width:100%"></span></span>
        <span class="plan-cmp__fin">No terminas</span></span>
        <span class="plan-cmp__intereses">Los intereses crecen más que las cuotas</span>`;
  }
  const ancho = Math.max(4, Math.min(100, Math.round((r.meses / Math.max(1, horizonte)) * 100)));
  return `
        <span class="plan-cmp__linea"><span class="plan-cmp__barra"><span class="plan-cmp__barra-lleno${primaria ? ' plan-cmp__barra-lleno--activa' : ''}" style="width:${ancho}%"></span></span>
        <span class="plan-cmp__fin">Terminas <b>${_mesCorto(mesMas(hoyISO, r.meses))}</b></span></span>
        <span class="plan-cmp__intereses">Intereses: <b>${f(Math.round(r.interesesTotales ?? r.intereses ?? 0))}</b></span>`;
}

/** Las tarjetas de Comparar (las repinta `refrescarExtraPlan` al escribir "Otro"). */
function _htmlOpcionesComparar(analisis, ui) {
  const eleccion = eleccionDelPlan(analisis, ui);
  const deudas = analisis.simulables;
  const hoyISO = hoy();
  const base = analisis.escenarios.base;
  const sims = {
    avalancha: simularEstrategiaPago(deudas, eleccion.extra, 'avalancha'),
    bolaNieve: simularEstrategiaPago(deudas, eleccion.extra, 'bolaNieve'),
  };
  const horizonte = Math.max(1, ...[sims.avalancha, sims.bolaNieve, base].filter(r => r.completo).map(r => r.meses));
  const tarjetas = ['avalancha', 'bolaNieve'].map((id) => {
    const est = _ESTRATEGIA[id];
    const activa = id === eleccion.estrategia;
    const primeraFin = Math.min(...sims[id].orden.map(o => o.mesPagado ?? Infinity));
    const sub = id === 'bolaNieve' && Number.isFinite(primeraFin)
      ? `${est.corto}: saldas una en ${formatearDuracion(primeraFin)}` : est.corto;
    return `
      <button type="button" class="plan-cmp__opcion${activa ? ' plan-cmp__opcion--activa' : ''}" data-action="elegir-estrategia" data-estrategia="${id}" aria-pressed="${activa}">
        <span class="plan-cmp__cabeza">${icon(est.icono)}<span class="plan-cmp__nombre">${est.nombre}</span>${id === eleccion.recomendada ? '<span class="plan-cmp__badge">Recomendada</span>' : ''}</span>
        <span class="plan-cmp__sub">${_esc(sub)}</span>
        ${_htmlFin(sims[id], horizonte, hoyISO, activa)}
      </button>`;
  });

  // Unir y renegociar se abren en su sitio (ADR 189 D5, reglas 6 y 7).
  const unibles = deudasUnibles(S.compromisos ?? []);
  if (unibles.length >= 2) {
    const abierta = ui.alternativaActiva === 'consolidar';
    const saldo = unibles.reduce((a, d) => a + d.saldo, 0);
    const promedio = saldo > 0 ? unibles.reduce((a, d) => a + d.tasaEA * d.saldo, 0) / saldo : 0;
    tarjetas.push(`
      <div class="plan-cmp__grupo">
        <button type="button" class="plan-cmp__opcion" data-action="elegir-alternativa" data-alternativa="consolidar" data-plegable="1" aria-expanded="${abierta}">
          <span class="plan-cmp__cabeza">${icon('cuentas')}<span class="plan-cmp__nombre">Unificar deudas</span>${icon(abierta ? 'chevron-down' : 'chevron-right')}</span>
          <span class="plan-cmp__sub">Un solo crédito para las que cobran interés</span>
          <span class="plan-cmp__intereses">Hoy pagas en promedio ${Number((promedio * 100).toFixed(1))} % E.A. Conviene si en total, con los costos, pagas menos. <b>Probar con una tasa</b></span>
        </button>${abierta ? `
        <div class="plan-cmp__herramienta">${renderConsolidar(unibles, ui)}</div>` : ''}
      </div>`);
  }
  if (analisis.alternativas.some(x => x.id === 'renegociar')) {
    const abierta = ui.alternativaActiva === 'renegociar';
    tarjetas.push(`
      <div class="plan-cmp__grupo">
        <button type="button" class="plan-cmp__opcion" data-action="elegir-alternativa" data-alternativa="renegociar" data-plegable="1" aria-expanded="${abierta}">
          <span class="plan-cmp__cabeza">${icon('handshake')}<span class="plan-cmp__nombre">Renegociar la tasa</span>${icon(abierta ? 'chevron-down' : 'chevron-right')}</span>
          <span class="plan-cmp__sub">Pedir una tasa más baja o una cuota distinta</span>
          <span class="plan-cmp__intereses">Finko no puede asegurar que te la acepten. <b>Probar con una tasa</b></span>
        </button>${abierta ? `
        <div class="plan-cmp__herramienta">${renderRenegociar(deudas, ui)}</div>` : ''}
      </div>`);
  }
  tarjetas.push(`
      <div class="plan-cmp__opcion plan-cmp__opcion--fija">
        <span class="plan-cmp__cabeza">${icon('clock')}<span class="plan-cmp__nombre">Seguir como vas</span></span>
        <span class="plan-cmp__sub">Solo las cuotas de hoy, cada deuda por su lado</span>
        ${_htmlFin({ ...base, interesesTotales: base.intereses }, horizonte, hoyISO, false)}
      </div>`);
  return tarjetas.join('');
}

function _htmlComparar(analisis, ui) {
  const eleccion = eleccionDelPlan(analisis, ui);
  const montos = [...new Set([...EXTRAS_PLAN, Number(analisis.principal?.extraMinimo) || 0])].sort((a, b) => a - b);
  const otro = Boolean(ui.extraOtro) || !montos.includes(eleccion.extra);
  const chips = montos.map(m => `
        <button type="button" class="plan-cmp__chip" data-action="plan-elegir-extra" data-monto="${m}" aria-pressed="${!otro && m === eleccion.extra}">${f(m)}</button>`).join('');
  return `
    <div class="plan-hoja plan-hoja--comparar">
      ${_barra('Compara formas de pagar')}
      <section class="plan-cmp__extra" aria-labelledby="plan-cmp-extra-h">
        <span class="plan-cmp__extra-cabeza"><h3 class="plan-hoja__h" id="plan-cmp-extra-h">Puedes poner de más cada mes</h3>${_chipEstimado('Estimado')}</span>
        <div class="plan-cmp__chips" role="group" aria-labelledby="plan-cmp-extra-h">${chips}
          <button type="button" class="plan-cmp__chip" data-action="plan-elegir-extra" data-monto="otro" aria-pressed="${otro}">Otro</button>
        </div>${otro ? `
        <div class="monto-hero plan-cmp__monto">
          <label class="monto-hero__label" for="estrategia-extra">¿Cuánto más al mes?</label>
          <div class="monto-hero__box">
            <span class="monto-hero__prefijo" aria-hidden="true">$</span>
            <input id="estrategia-extra" class="input input--big-amount" type="text" value="${miles(eleccion.extra || '')}"
                   placeholder="0" autocomplete="off" inputmode="numeric" data-miles data-action="cambiar-extra-remedio" />
          </div>
        </div>` : ''}
      </section>
      <div class="plan-cmp__opciones" aria-live="polite">${_htmlOpcionesComparar(analisis, ui)}
      </div>
      ${_pie(`Aplicar ${eleccion.nombre}`)}
    </div>`;
}

// ── Cómo funciona ───────────────────────────────────────────────

function _htmlComo(analisis, ui) {
  const eleccion = eleccionDelPlan(analisis, ui);
  const est = _ESTRATEGIA[eleccion.estrategia];
  const deudas = analisis.simulables;
  const hoyISO = hoy();
  const plan = simularEstrategiaPago(deudas, eleccion.extra, eleccion.estrategia);
  const finPlan = new Map(plan.orden.map(o => [o.id, o.mesPagado]));
  const finHoy = new Map(deudas.map(d => {
    const r = simularPagoDeuda(d.saldo, d.tasaEA ?? 0, d.cuota);
    return [d.id, r.completo ? r.meses : null];
  }));
  const conocidos = [...finPlan.values(), ...finHoy.values()].filter(Number.isFinite);
  const horizonte = Math.max(1, ...conocidos);
  const pct = (m) => (Number.isFinite(m) ? Math.max(3, Math.min(100, Math.round((m / horizonte) * 100))) : 100);
  const filas = [...deudas]
    .sort((a, b) => (finPlan.get(a.id) ?? Infinity) - (finPlan.get(b.id) ?? Infinity))
    .map((d) => {
      const mp = finPlan.get(d.id);
      const mh = finHoy.get(d.id);
      const dice = `${d.descripcion}: con el plan ${Number.isFinite(mp) ? `la terminas hacia ${_mesLegible(mesMas(hoyISO, mp))}` : 'no se termina'}; como vas hoy, ${Number.isFinite(mh) ? `hacia ${_mesLegible(mesMas(hoyISO, mh))}` : 'no se termina'}.`;
      return `
          <li class="plan-como__fila">
            <span class="plan-como__teja">${_teja(d)}</span>
            <span class="plan-como__nombre">${_esc(d.descripcion)}</span>
            <span class="plan-como__pista" role="img" aria-label="${_esc(dice)}">
              <span class="plan-como__hoy" style="width:${pct(mh)}%"></span>
              <span class="plan-como__plan${Number.isFinite(mp) ? '' : ' plan-como__plan--no'}" style="width:${pct(mp)}%"></span>
            </span>
          </li>`;
    }).join('');
  const marcas = Array.from({ length: 7 }, (_, k) => {
    const ym = mesMas(hoyISO, Math.round((k * horizonte) / 6));
    const m = /^(\d{4})-(\d{2})$/.exec(ym ?? '');
    const corto = m ? _MESES_CORTOS[Number(m[2]) - 1] : '';
    return `<span>${corto.charAt(0).toUpperCase()}${corto.slice(1)}</span>`;
  }).join('');
  const primera = _prioridad(deudas, eleccion.estrategia)[0]?.descripcion ?? '';
  const pasos = [
    'Sigue pagando las cuotas de siempre.',
    eleccion.extra > 0
      ? `Pon <b>${f(eleccion.extra)} más</b> en ${_esc(primera)} cada mes.`
      : `Empieza por ${_esc(primera)}: es la que recibe lo que se vaya liberando.`,
    'Cuando la termines, pasa todo ese dinero a la siguiente del orden.',
  ];
  return `
    <div class="plan-hoja plan-hoja--como">
      ${_barra(est.nombre, 'Cómo funciona, mes a mes')}
      <p class="plan-como__texto">${_esc(est.como)}</p>
      <section class="plan-como__carta" aria-labelledby="plan-como-h">
        <span class="plan-como__carta-cabeza"><h3 class="plan-como__h" id="plan-como-h">Cuándo terminas cada una</h3>${_chipEstimado('Estimado')}</span>
        <ul class="plan-como__filas">${filas}
        </ul>
        <div class="plan-como__eje" aria-hidden="true">${marcas}</div>
        <div class="plan-como__leyenda" aria-hidden="true">
          <span><i class="plan-como__muestra"></i>Con el plan</span>
          <span><i class="plan-como__muestra plan-como__muestra--hoy"></i>Como vas hoy</span>
        </div>
      </section>
      <section class="plan-hoja__grupo" aria-labelledby="plan-como-pasos-h">
        <h3 class="plan-hoja__h" id="plan-como-pasos-h">Lo que haces tú</h3>
        <ol class="plan-como__pasos">${pasos.map((p, i) => `
          <li><span class="plan-como__paso-num" aria-hidden="true">${i + 1}</span><span>${p}</span></li>`).join('')}
        </ol>
      </section>
      ${_pie('Aplicar este plan')}
    </div>`;
}

// ── Entradas ────────────────────────────────────────────────────

/**
 * Repinta las tarjetas de Comparar mientras se escribe "Otro", sin repintar
 * la hoja (el foco sigue en el campo). No-op fuera de Comparar.
 *
 * @param {number} extra
 * @param {object} ui - el estado de la hoja (`getEstrategiaUI()`).
 * @returns {boolean} true si estaba Comparar y se repintó.
 */
export function refrescarExtraPlan(extra, ui = {}) {
  const cont = document.querySelector('.plan-cmp__opciones');
  if (!cont) return false;
  const analisis = analisisDelPlan();
  const nuevo = { ...ui, extraMensual: extra, extraElegido: true };
  cont.innerHTML = _htmlOpcionesComparar(analisis, nuevo);
  const btn = document.querySelector('.plan-hoja--comparar .plan-hoja__aplicar');
  if (btn) btn.textContent = `Aplicar ${eleccionDelPlan(analisis, nuevo).nombre}`;
  return true;
}

/**
 * "Tu plan" en la tarjeta de escritorio (ADR 189 D5): la recomendación, por
 * qué, qué pasa (estimado) y lo que falta.
 *
 * @param {ReturnType<typeof analisisDelPlan>} analisis
 * @returns {string}
 */
export function htmlTuPlan(analisis) {
  const p = analisis?.principal;
  if (!p) return '';
  const c = p.consecuencias;
  const cuando = c?.completo ? _mesLegible(c.mesSalida) : '';
  const resultado = c?.completo
    ? `Así sales ${analisis.simulables.length < analisis.inventario.length ? 'de las demás' : 'de deudas'} en <strong>${formatearDuracion(c.meses)}</strong>${cuando ? ` (hacia ${cuando})` : ''} y pagas <strong>${f(c.intereses)}</strong> en intereses${c.ahorroIntereses >= _MISMO ? `: ${f(c.ahorroIntereses)} menos que pagando cada una solo con su cuota` : ''}. Es un estimado.`
    : '';
  const acordar = (analisis.alternativas ?? []).filter(a => a.id === 'acordar-cuota');
  return `
    <section class="estrategia-card__tu-plan" aria-labelledby="tu-plan-titulo">
      <h3 class="estrategia-card__bloque-titulo" id="tu-plan-titulo">Tu plan: ${_esc(p.titulo)}</h3>
      ${p.porque.map(t => `<p class="estrategia-card__bloque-body">${_esc(t)}</p>`).join('')}
      ${resultado ? `<p class="estrategia-card__bloque-body">${resultado}</p>` : ''}
      ${acordar.map(a => `<p class="estrategia-card__bloque-body"><strong>${_esc(a.titulo)}.</strong> ${_esc(a.texto)}</p>`).join('')}
    </section>`;
}

/**
 * HTML de la hoja, en la vista que diga `ui.vistaPlan`. El primer argumento
 * queda por compatibilidad (las cuentas son las del motor).
 *
 * @param {unknown} _pagables
 * @param {{ vistaPlan?: string, estrategia?: string|null, extraMensual?: number, extraElegido?: boolean, extraOtro?: boolean, alternativaActiva?: string|null }} ui
 * @returns {string}
 */
export function htmlPlanSalida(_pagables, ui = {}) {
  const analisis = analisisDelPlan();
  const hayComparacion = analisis.simulables.length >= 2 && analisis.principal?.id !== 'completar-datos';
  if (ui.vistaPlan === 'comparar' && hayComparacion) return _htmlComparar(analisis, ui);
  if (ui.vistaPlan === 'como' && analisis.simulables.length > 0 && analisis.principal?.id !== 'completar-datos') {
    return _htmlComo(analisis, ui);
  }
  return _htmlRecomendacion(analisis, ui);
}

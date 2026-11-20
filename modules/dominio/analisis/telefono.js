/**
 * analisis/telefono.js - Análisis en el teléfono (ADR 176).
 *
 * Dos lentes bajo el título (D1): **Tus gastos**, lo que pasa en un periodo,
 * y **Tu situación**, lo que tienes hoy. Tus gastos (D2 a D5) es un periodo
 * (día, semana, mes o año) con su total y su gráfica en la tarjeta de
 * identidad, en qué gastas y, sin gastos, Tino tranquilo (D7). Tu situación
 * son tres tarjetas (D9):
 * la salud de tu dinero con "De dónde sale" en su hoja, lo que realmente
 * tienes con lo que tienes y lo que debes en filas que abren su hoja, y la
 * renta. Desde 1024px sigue el escritorio del ADR 078 (D10).
 *
 * Puede leer S. No puede mutarlo.
 */

import { S } from '../../core/state.js';
import { f, esc as _esc } from '../../infra/utils.js';
import { SALDO_MASCARA, SALDO_MASCARA_CUENTA } from '../../infra/render.js';
import { tejaCategoria } from '../../infra/icons.js';
import { iconoDeCategoriaGasto, SUBCATEGORIAS_GASTO } from '../../core/constants.js';
import { coberturaFondo, mesesEnPalabras } from '../../infra/bolsas.js';
import { hijoPorId } from '../../infra/taxonomia.js';
import { htmlTinoSol } from '../../infra/ilustraciones.js';
import {
  calcularScoreSalud, clasificarScore, repartirPorcentajes,
  PERIODOS_ANALISIS, rangoPeriodo, moverPeriodo, datosPeriodo,
  hallazgosDelPeriodo, hormigaEnRango, datosCategoria, SIN_DETALLE,
} from './logic.js';
import { topeHormiga, aprendidosDe } from '../../infra/hormiga.js';
import { montosOcultos } from '../../infra/privacidad.js';

const _MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
  'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const _DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

const _BANDA = {
  excelente: 'Excelente',
  buena: 'Buena',
  ajustada: 'Ajustada',
  critica: 'Crítica',
};

/** Los cuatro factores, con lo que mide cada uno dicho en una línea. */
export const FACTORES_TELEFONO = [
  { key: 'deuda',    label: 'Deuda',    desc: 'Cuánto pesan tus deudas' },
  { key: 'liquidez', label: 'Liquidez', desc: 'Dinero disponible para el mes' },
  { key: 'control',  label: 'Control',  desc: 'Gastos dentro de tus límites' },
  { key: 'ahorro',   label: 'Ahorro',   desc: 'Fondo y aportes' },
];

/** Las partes de lo que tienes, con su teja. */
const _PARTES = [
  { key: 'totalInversiones', label: 'Inversión',  icono: 'i-inversion',  dom: 'inversion' },
  { key: 'totalCuentas',     label: 'Cuentas',    icono: 'i-cuentas',    dom: 'tesoreria' },
  { key: 'totalMetas',       label: 'Metas',      icono: 'i-metas',      dom: 'metas' },
  { key: 'totalApartados',   label: 'Reservas',   icono: 'i-apartados',  dom: 'ahorro' },
  { key: 'totalPorCobrar',   label: 'Por cobrar', icono: 'i-personales', dom: 'personales' },
];

// ── LA LENTE (ADR 176 D1) ────────────────────────────────────────

/** @type {'gastos' | 'situacion'} */
let _lente = 'gastos';

/** La lente visible. Vive en memoria: al recargar vuelve a Tus gastos. */
export function lenteAnalisis() {
  return _lente;
}

/**
 * Cambia la lente. Un valor desconocido cae en Tus gastos, la de entrada.
 * @param {string} lente
 */
export function cambiarLenteAnalisis(lente) {
  _lente = lente === 'situacion' ? 'situacion' : 'gastos';
}

/** Las dos pestañas, con la activa marcada. */
function _htmlLentes() {
  const tab = (lente, texto) => `
      <button type="button" class="ana-lentes__tab${_lente === lente ? ' active' : ''}" data-action="analisis-lente"
              data-lente="${lente}" aria-pressed="${_lente === lente}">${texto}</button>`;
  return `
    <nav class="ana-lentes" aria-label="Qué mirar en Análisis">${tab('gastos', 'Tus gastos')}${tab('situacion', 'Tu situación')}
    </nav>`;
}

// ── FRASES ───────────────────────────────────────────────────────

/**
 * Lo que más frena la salud y a dónde ir a mejorarlo, en una frase. Con la
 * banda excelente no hay nada que frene.
 *
 * @param {string} banda
 * @param {Record<string, number>} factors
 * @returns {{ frase: string, salida: { href: string, texto: string } | null }}
 */
export function loQueFrena(banda, factors) {
  if (banda === 'excelente') return { frase: 'Vas muy bien: tu base financiera es sólida.', salida: null };
  const peor = FACTORES_TELEFONO.reduce((min, x) => (factors[x.key] < factors[min.key] ? x : min), FACTORES_TELEFONO[0]);
  const salida = _SALIDA[peor.key];
  // Con la banda buena no hay nada que frene: hay algo que puede mejorar.
  if (banda === 'buena') {
    return { frase: `Tienes una base saludable. Lo que más puede mejorar es ${_LO_QUE[peor.key]}.`, salida };
  }
  if (peor.key === 'ahorro') {
    const c = coberturaFondo(S.ahorro, S.compromisos);
    const frase = !S.ahorro?.fondoEmergencia?.activo
      ? 'Lo que más la frena es tu fondo de emergencia: todavía no lo tienes.'
      : c
        ? `Lo que más la frena es tu fondo de emergencia: cubre ${mesesEnPalabras(c.meses)} de los ${c.metaMeses} meses que te propusiste.`
        : 'Lo que más la frena es tu fondo de emergencia.';
    return { frase, salida };
  }
  return { frase: `Lo que más la frena ${peor.key === 'control' ? 'son' : 'es'} ${_LO_QUE[peor.key]}.`, salida };
}

/** Cada factor dicho como cosa, para "Lo que más la frena es ...". */
const _LO_QUE = {
  ahorro:   'tu fondo de emergencia',
  deuda:    'lo que pesan tus deudas',
  liquidez: 'el dinero disponible para el mes',
  control:  'los gastos que pasan sus límites',
};

/** A dónde ir a mejorar cada factor. */
const _SALIDA = {
  ahorro:   { href: '#fondo',       texto: 'Ir a tu fondo de emergencia' },
  deuda:    { href: '#compromisos', texto: 'Ver lo que debes en Por pagar' },
  liquidez: { href: '#tesoreria',   texto: 'Ver tus cuentas' },
  control:  { href: '#presupuesto', texto: 'Ver tus límites' },
};

/** "y" entre los dos últimos: "Tarjeta, Carro y Préstamo". */
function _enLista(nombres) {
  if (nombres.length <= 1) return nombres.join('');
  return `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}`;
}

/**
 * Nombres en una línea corta: hasta cuatro, todos ("Salud, Ropa, Hogar y
 * Mascotas"); desde cinco, tres y "y N más" ("Cuentas, inversión, metas y 2
 * más"). `minuscula` baja la inicial de todos menos el primero, para que se
 * lea como frase.
 *
 * @param {string[]} nombres
 * @param {{ minuscula?: boolean }} [opciones]
 * @returns {string}
 */
export function nombresEnLinea(nombres, { minuscula = false } = {}) {
  const lista = nombres.map((n, i) => (minuscula && i > 0 ? n.charAt(0).toLowerCase() + n.slice(1) : n));
  if (lista.length <= 4) return _enLista(lista);
  return `${lista.slice(0, 3).join(', ')} y ${lista.length - 3} más`;
}

/**
 * La línea de la fila de la renta cuando algún criterio pide atención: pasar
 * un tope pesa más que estar cerca. Sin alerta, nada.
 *
 * @param {Array<{estado: string}>} criterios
 * @returns {{ texto: string, nivel: 'peligro' | 'atencion' } | null}
 */
export function avisoRenta(criterios) {
  const lista = Array.isArray(criterios) ? criterios : [];
  if (lista.some(c => c.estado === 'supera')) return { texto: 'Pasas un tope para declarar', nivel: 'peligro' };
  if (lista.some(c => c.estado === 'cerca')) return { texto: 'Estás cerca de un tope para declarar', nivel: 'atencion' };
  return null;
}

/** Lo que trae el detalle de gastos, dicho en frase (ADR 134 D7). */
export const SUB_DETALLE = 'Contra el mes anterior, por día de la semana y gastos hormiga';

/** Lo que trae la renta: "5 criterios de la DIAN y sus topes". */
export function subRenta(n) {
  return `${n} ${n === 1 ? 'criterio' : 'criterios'} de la DIAN y sus topes`;
}

/**
 * "Hoy, miércoles 18 de noviembre": el alcance de Tu situación (D9).
 * @param {string} fechaHoy - `YYYY-MM-DD`.
 * @returns {string}
 */
export function fraseHoy(fechaHoy) {
  const [a, m, d] = String(fechaHoy ?? '').split('-').map(Number);
  if (!a || !m || !d) return 'Hoy';
  return `Hoy, ${_DIAS[new Date(a, m - 1, d).getDay()]} ${d} de ${_MESES[m - 1]}`;
}

// ── FILAS ────────────────────────────────────────────────────────

/** Una fila que abre su hoja (`analisis-hoja`). `teja` ya viene armada. */
function _fila({ hoja, teja, titulo, sub, monto = '', extra = '' }) {
  return `
        <button type="button" class="ana-fila" data-action="analisis-hoja" data-hoja="${hoja}" aria-haspopup="dialog">
          ${teja}
          <span class="ana-fila__textos"><span class="ana-fila__titulo">${titulo}</span><span class="ana-fila__sub">${sub}</span>${extra}</span>
          ${monto ? `<span class="ana-fila__monto">${monto}</span>` : ''}
          <svg class="icon ana-fila__chevron" aria-hidden="true"><use href="#i-chevron-right"/></svg>
        </button>`;
}

/** La teja pizarra de las filas de Análisis, con su ícono. */
function _tejaAnalisis(iconoId) {
  return `<span class="ana-fila__teja" aria-hidden="true"><svg class="icon" aria-hidden="true"><use href="#${iconoId}"/></svg></span>`;
}

/**
 * "Estado de tu renta" en su tarjeta: una fila que solo avisa con alerta
 * (ADR 176 D9); el detalle sigue en su hoja.
 *
 * @param {number} anio
 * @param {Array<{estado: string}>} criterios
 * @returns {string}
 */
export function htmlFilaRenta(anio, criterios) {
  const lista = Array.isArray(criterios) ? criterios : [];
  const aviso = avisoRenta(lista);
  const lineaAviso = aviso
    ? `<span class="ana-fila__aviso ana-fila__aviso--${aviso.nivel}"><svg class="icon" aria-hidden="true"><use href="#i-alert"/></svg>${aviso.texto}</span>`
    : '';
  return `
    <section class="ana-tarjeta ana-tarjeta--fila" aria-label="Estado de tu renta">${_fila({ hoja: 'renta', teja: _tejaAnalisis('i-percent'), titulo: `Estado de tu renta (${anio})`, sub: subRenta(lista.length), extra: lineaAviso })}
    </section>`;
}

// ── TU SITUACIÓN (ADR 176 D9) ────────────────────────────────────

/** El puntaje de hoy, con su banda. */
function _salud(resumen) {
  const fondo = S.ahorro?.fondoEmergencia;
  const score = calcularScoreSalud(resumen, { activo: fondo?.activo === true, completado: fondo?.completado === true });
  return { score, banda: clasificarScore(score.score) };
}

/** Las partes de lo que tienes con valor, de mayor a menor, con su parte. */
function _partesConValor(activos) {
  const partes = _PARTES.map(p => ({ ...p, valor: Number(activos?.[p.key]) || 0 })).filter(p => p.valor > 0)
    .sort((a, b) => b.valor - a.valor);
  const pcts = repartirPorcentajes(partes.map(p => p.valor));
  return partes.map((p, i) => ({ ...p, pct: pcts[i] }));
}

/** Las deudas activas con saldo, en el orden en que están. */
function _deudasConSaldo() {
  return (S.compromisos ?? []).filter(c => c.activo !== false
    && (c.tipo === 'deuda-entidad' || c.tipo === 'deuda-personal') && Number(c.saldoTotal) > 0);
}

/**
 * Tu situación: la salud, lo que realmente tienes y la renta.
 *
 * @param {{ resumen: object, lecturas: object, anio: number, fechaHoy: string, criterios: Array<{estado: string}> }} p
 * @returns {string}
 */
function _htmlTuSituacion({ resumen, lecturas, anio, fechaHoy, criterios }) {
  const oculto = montosOcultos('analisis');
  const m = (n) => (oculto ? SALDO_MASCARA_CUENTA : f(n));
  const { score, banda } = _salud(resumen);
  const frena = loQueFrena(banda, score.factors);

  const salud = `
    <section class="ana-tarjeta ana-salud" aria-labelledby="ana-salud-titulo">
      <div class="ana-tarjeta__cuerpo">
        <h2 class="ana-rotulo" id="ana-salud-titulo">Salud de tu dinero</h2>
        <p class="ana-salud__cifra">
          <span class="ana-salud__num">${score.score}</span><span class="ana-salud__de">de 100</span>
          <span class="ana-salud__banda ana-salud__banda--${banda}"><svg class="icon" aria-hidden="true"><use href="#${banda === 'excelente' || banda === 'buena' ? 'i-check' : 'i-alert'}"/></svg>${_BANDA[banda]}</span>
        </p>
        <span class="ana-barra ana-barra--salud ana-barra--${banda}" aria-hidden="true"><span style="width:${score.score}%"></span></span>
        <p class="ana-salud__frase">${_esc(frena.frase)}</p>
        ${frena.salida ? `<a class="ana-salida" href="${frena.salida.href}">${_esc(frena.salida.texto)}<svg class="icon" aria-hidden="true"><use href="#i-chevron-right"/></svg></a>` : ''}
      </div>
      ${_fila({ hoja: 'factores', teja: '', titulo: `De dónde sale el ${score.score}`, sub: 'Deuda, liquidez, control y ahorro' })}
    </section>`;

  // Lo que realmente tienes: el neto, una frase y dos filas (lo que tienes y
  // lo que debes) que abren su hoja.
  const { activos, pasivos, patrimonioNeto } = resumen;
  const partes = _partesConValor(activos);
  const neto = oculto ? SALDO_MASCARA : `${patrimonioNeto < 0 ? '−' : ''}${f(Math.abs(patrimonioNeto))}`;
  const lectura = _esc(lecturas?.patrimonio ?? '').replace(/(\d+% de lo que tienes)/, '<strong>$1</strong>');
  const deudas = _deudasConSaldo();
  const filaTienes = partes.length > 0
    ? _fila({
      hoja: 'tienes',
      teja: tejaCategoria('i-saldo', 'tesoreria'),
      titulo: 'Lo que tienes',
      sub: _esc(nombresEnLinea(partes.map(p => p.label), { minuscula: true })),
      monto: m(activos.total),
    })
    : '';
  const subDebes = deudas.length > 0
    ? `${deudas.length} ${deudas.length === 1 ? 'deuda' : 'deudas'}: ${_esc(nombresEnLinea(deudas.map(d => d.descripcion ?? '')))}`
    : `${pasivos.deudasSinSaldo} sin saldo registrado`;
  const filaDebes = pasivos.cantidadDeudas > 0
    ? _fila({ hoja: 'debes', teja: tejaCategoria('i-deudas', 'compromisos'), titulo: 'Lo que debes', sub: subDebes, monto: m(pasivos.total) })
    : '';
  const tienes = `
    <section class="ana-tarjeta ana-tienes" aria-labelledby="ana-tienes-titulo">
      <div class="ana-tarjeta__cuerpo">
        <h2 class="ana-rotulo" id="ana-tienes-titulo">Lo que realmente tienes</h2>
        <p class="ana-neto${patrimonioNeto < 0 ? ' ana-neto--negativo' : ''}">${neto}</p>
        <p class="ana-texto">Tienes ${m(activos.total)} y debes ${m(pasivos.total)}.${lectura ? ` ${lectura}` : ''}</p>
      </div>${filaTienes}${filaDebes}
    </section>`;

  return `
    <p class="ana-alcance">${_esc(fraseHoy(fechaHoy))}</p>
    ${salud}
    ${tienes}
    ${htmlFilaRenta(anio, criterios)}`;
}

// ── LAS HOJAS DE TU SITUACIÓN ────────────────────────────────────

/**
 * La cabeza de una hoja de `#modal-detalle-fila`, como la de la renta.
 * @param {{ teja: string, titulo: string, sub: string }} p
 */
function _cabezaHoja({ teja, titulo, sub }) {
  return `
    <div class="detalle-fila__cabeza" data-hoja-analisis>
      ${teja}
      <div class="detalle-fila__textos">
        <h2 class="detalle-fila__titulo" id="detalle-fila-titulo">${titulo}</h2>
        <p class="detalle-fila__sub">${sub}</p>
      </div>
    </div>`;
}

/**
 * La hoja de una fila de Tu situación (ADR 176 D9): los cuatro factores, las
 * partes de lo que tienes o las deudas.
 *
 * @param {'factores' | 'tienes' | 'debes'} cual
 * @param {object} resumen - el de la vista.
 * @returns {string} HTML del cuerpo de `#modal-detalle-fila`.
 */
export function htmlHojaSituacion(cual, resumen) {
  const oculto = montosOcultos('analisis');
  const m = (n) => (oculto ? SALDO_MASCARA_CUENTA : f(n));
  if (cual === 'factores') {
    const { score } = _salud(resumen);
    return `${_cabezaHoja({ teja: `<span class="analisis-grupo__teja detalle-fila__icono" aria-hidden="true"><svg class="icon" aria-hidden="true"><use href="#i-analisis"/></svg></span>`, titulo: `De dónde sale el ${score.score}`, sub: 'Cuatro factores de 0 a 100: el puntaje los pondera' })}
    <div class="ana-tarjeta ana-hoja">${FACTORES_TELEFONO.map(x => `
      <div class="ana-factor">
        <span class="ana-factor__textos"><span class="ana-factor__nombre">${x.label}</span><span class="ana-factor__desc">${x.desc}</span></span>
        <span class="ana-barra ana-factor__barra" aria-hidden="true"><span style="width:${score.factors[x.key]}%"></span></span>
        <span class="ana-factor__valor" aria-label="${x.label}: ${score.factors[x.key]} de 100">${score.factors[x.key]}</span>
      </div>`).join('')}
    </div>`;
  }
  if (cual === 'tienes') {
    const { activos } = resumen;
    const partes = _partesConValor(activos);
    const aviso = activos.prestamosSinCuenta > 0
      ? `<p class="ana-nota">${activos.prestamosSinCuenta === 1 ? 'Un préstamo no salió' : `${activos.prestamosSinCuenta} préstamos no salieron`} de ninguna cuenta, así que no ${activos.prestamosSinCuenta === 1 ? 'suma' : 'suman'} aquí. <a class="link" href="#personales">Ver en Me deben</a></p>`
      : '';
    return `${_cabezaHoja({ teja: `<span class="detalle-fila__icono" aria-hidden="true">${tejaCategoria('i-saldo', 'tesoreria')}</span>`, titulo: 'Lo que tienes', sub: `${m(activos.total)} hoy, en ${partes.length} ${partes.length === 1 ? 'parte' : 'partes'}` })}
    <div class="ana-tarjeta ana-hoja">${partes.map(p => `
      <div class="ana-parte">
        <span class="ana-parte__teja" aria-hidden="true">${tejaCategoria(p.icono, p.dom)}</span>
        <span class="ana-parte__info">
          <span class="ana-parte__linea"><span class="ana-parte__nombre">${p.label}</span><span class="ana-parte__monto">${m(p.valor)}</span></span>
          <span class="ana-parte__linea"><span class="ana-barra" aria-hidden="true"><span style="width:${p.pct}%"></span></span><span class="ana-parte__pct">${p.pct}%</span></span>
        </span>
      </div>`).join('')}
    </div>${aviso}`;
  }
  // Lo que debes: cada deuda con su saldo y la salida a Por pagar; las que no
  // tienen saldo se completan allá (ADR 090 D1).
  const { pasivos } = resumen;
  const deudas = _deudasConSaldo();
  const idSinSaldo = pasivos.deudaSinSaldoId;
  const sinSaldo = pasivos.deudasSinSaldo > 0
    ? `<p class="ana-nota">${pasivos.deudasSinSaldo === 1 ? 'Una deuda no tiene' : `${pasivos.deudasSinSaldo} deudas no tienen`} saldo registrado, así que no ${pasivos.deudasSinSaldo === 1 ? 'suma' : 'suman'} aquí. <a class="link" href="#compromisos"${idSinSaldo ? ` data-action="analisis-completar-deuda" data-id="${_esc(idSinSaldo)}"` : ''}>${pasivos.deudasSinSaldo === 1 ? 'Complétala' : 'Complétalas'} en Por pagar</a></p>`
    : '';
  return `${_cabezaHoja({ teja: `<span class="detalle-fila__icono" aria-hidden="true">${tejaCategoria('i-deudas', 'compromisos')}</span>`, titulo: 'Lo que debes', sub: `${m(pasivos.total)} hoy, en ${pasivos.cantidadDeudas} ${pasivos.cantidadDeudas === 1 ? 'deuda' : 'deudas'}` })}
    ${deudas.length > 0 ? `<div class="ana-tarjeta ana-hoja">${deudas.map(d => `
      <div class="ana-parte">
        <span class="ana-parte__teja" aria-hidden="true">${tejaCategoria('i-deudas', 'compromisos')}</span>
        <span class="ana-parte__info"><span class="ana-parte__linea"><span class="ana-parte__nombre">${_esc(d.descripcion ?? '')}</span><span class="ana-parte__monto">${m(Number(d.saldoTotal))}</span></span></span>
      </div>`).join('')}
    </div>` : ''}${sinSaldo}
    <a class="ana-salida" href="#compromisos">Ver lo que debes en Por pagar<svg class="icon" aria-hidden="true"><use href="#i-chevron-right"/></svg></a>`;
}

// ── EL PERIODO (ADR 176 D2) ──────────────────────────────────────

/** @type {{ tipo: 'dia'|'semana'|'mes'|'anio', ancla: string|null }} `ancla` null = hoy. */
const _periodo = { tipo: 'mes', ancla: null };

/** El periodo visible de Tus gastos, con la fecha que lo ancla. */
export function periodoAnalisis(hoyISO) {
  return { tipo: _periodo.tipo, ancla: _periodo.ancla ?? hoyISO };
}

/**
 * Cambia el tipo de periodo y vuelve al que contiene hoy (D2). Un valor
 * desconocido cae en Mes, el de entrada.
 * @param {string} tipo
 * @param {string|null} [ancla] - para saltar a un periodo concreto ("Ver julio").
 */
export function cambiarPeriodoAnalisis(tipo, ancla = null) {
  _periodo.tipo = PERIODOS_ANALISIS.includes(tipo) ? tipo : 'mes';
  _periodo.ancla = ancla;
}

/**
 * Mueve el periodo `delta` pasos, sin pasar del que contiene hoy ni antes
 * del primer gasto.
 * @param {number} delta
 * @param {string} hoyISO
 * @param {string|null} primerGasto
 */
export function moverPeriodoAnalisis(delta, hoyISO, primerGasto) {
  const ancla = moverPeriodo(_periodo.tipo, _periodo.ancla ?? hoyISO, delta);
  const rango = rangoPeriodo(_periodo.tipo, ancla);
  if (rango.desde > hoyISO) return;
  if (primerGasto && rango.hasta < primerGasto) return;
  _periodo.ancla = rango.desde <= hoyISO && hoyISO <= rango.hasta ? null : ancla;
}

// ── TUS GASTOS (ADR 176 D2 a D5 y D7) ────────────────────────────

const _MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const _DIAS_CORTOS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const _NUMEROS = ['cero', 'un', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez'];

/** Las partes de un `YYYY-MM-DD`: año, mes (1-12), día y día de la semana (0 = domingo). */
function _partes(iso) {
  const [a, m, d] = String(iso ?? '').split('-').map(Number);
  return { a, m, d, dow: new Date(a, m - 1, d).getDay() };
}

/** El mes en palabras, con el año si no es el de hoy: "octubre", "octubre de 2025". */
function _mesEnPalabras(iso, hoyISO) {
  const { a, m } = _partes(iso);
  return `${_MESES[m - 1]}${String(a) === hoyISO.slice(0, 4) ? '' : ` de ${a}`}`;
}

/**
 * Un monto corto para rotular una barra: "$57 mil", "$2,34 M".
 * @param {number} n
 * @returns {string}
 */
export function montoCorto(n) {
  const v = Math.round(Number(n) || 0);
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2).replace('.', ',')} M`;
  if (v >= 1_000) return `$${Math.round(v / 1_000)} mil`;
  return `$${v}`;
}

/**
 * El nombre del periodo en la pastilla del encabezado: "Hoy", "Dom 8 nov",
 * "16 al 22 nov", "Noviembre", "2026". El año solo si no es el de hoy.
 *
 * @param {{ tipo: string, desde: string, hasta: string }} rango
 * @param {string} hoyISO
 * @returns {string}
 */
export function nombrePeriodo(rango, hoyISO) {
  const anioHoy = Number(hoyISO.slice(0, 4));
  const d = _partes(rango.desde);
  const h = _partes(rango.hasta);
  const conAnio = (a) => (a === anioHoy ? '' : ` ${a}`);
  if (rango.tipo === 'dia') {
    if (rango.desde === hoyISO) return 'Hoy';
    const dia = _DIAS[d.dow];
    return `${dia.charAt(0).toUpperCase()}${dia.slice(1, 3)} ${d.d} ${_MESES_CORTOS[d.m - 1]}${conAnio(d.a)}`;
  }
  if (rango.tipo === 'semana') {
    const inicio = d.m === h.m ? `${d.d}` : `${d.d} ${_MESES_CORTOS[d.m - 1]}`;
    return `${inicio} al ${h.d} ${_MESES_CORTOS[h.m - 1]}${conAnio(h.a)}`;
  }
  if (rango.tipo === 'anio') return String(d.a);
  const mes = _MESES[d.m - 1];
  return `${mes.charAt(0).toUpperCase()}${mes.slice(1)}${conAnio(d.a)}`;
}

/** "Llevas hoy, miércoles 18", "Gastaste en octubre": la línea sobre el total. */
function _rotuloTotal(p, hoyISO) {
  const d = _partes(p.desde);
  if (p.tipo === 'dia') return p.desde === hoyISO ? `Llevas hoy, ${_DIAS[d.dow]} ${d.d}` : `Gastaste el ${_DIAS[d.dow]} ${d.d}`;
  if (p.tipo === 'semana') return p.enCurso ? 'Llevas esta semana' : `Gastaste del ${nombrePeriodo(p, hoyISO)}`;
  if (p.tipo === 'anio') return p.enCurso ? `Llevas en ${d.a}` : `Gastaste en ${d.a}`;
  return p.enCurso ? `Llevas en ${_MESES[d.m - 1]}` : `Gastaste en ${_mesEnPalabras(p.desde, hoyISO)}`;
}

/** El periodo dicho dentro de una frase: "de noviembre", "de la semana", "del año", "de tu día". */
function _dePeriodo(p, hoyISO) {
  if (p.tipo === 'dia') return 'de tu día';
  if (p.tipo === 'semana') return p.enCurso ? 'de la semana' : 'de esa semana';
  if (p.tipo === 'anio') return p.enCurso ? 'del año' : `de ${p.desde.slice(0, 4)}`;
  return `de ${_mesEnPalabras(p.desde, hoyISO)}`;
}

/**
 * La comparación de la pastilla (D4): verde solo al bajar; subir es neutro.
 *
 * @param {ReturnType<typeof datosPeriodo>} p
 * @param {string} hoyISO
 * @param {(n: number) => string} m
 * @returns {{ texto: string, baja: boolean } | null}
 */
export function comparacionPeriodo(p, hoyISO, m) {
  const v = p.variacion;
  if (p.tipo === 'anio') return { texto: `Promedio por mes: ${m(p.promedioMes)}`, baja: false, sinIcono: true };
  if (!v) return null;
  if (p.tipo === 'dia') {
    if (v.direccion === 'igual') return { texto: 'Lo de un día normal', baja: false };
    return { texto: `${m(Math.abs(v.delta))} ${v.direccion === 'baja' ? 'menos' : 'más'} que un día normal`, baja: v.direccion === 'baja' };
  }
  const contra = p.tipo === 'semana'
    ? (p.enCurso ? 'la semana pasada' : 'la semana anterior')
    : _mesEnPalabras(p.anterior.desde, hoyISO);
  const altura = p.anterior.alaAltura ? ' a esta altura' : '';
  if (v.direccion === 'igual') return { texto: `Lo mismo que ${contra}${altura}`, baja: false };
  return { texto: `${v.pct}% ${v.direccion === 'baja' ? 'menos' : 'más'} que ${contra}${altura}`, baja: v.direccion === 'baja' };
}

/** La pastilla de la comparación, con su flecha. */
function _htmlPastilla(c) {
  if (!c) return '';
  const icono = c.sinIcono ? '' : `<svg class="icon" aria-hidden="true"><use href="#i-trending-${c.baja ? 'down' : 'up'}"/></svg>`;
  return `<p class="ana-pastilla${c.baja ? ' ana-pastilla--baja' : ''}">${icono}${_esc(c.texto)}</p>`;
}

// ── LAS GRÁFICAS DEL ENCABEZADO (D3) ─────────────────────────────

/** Día: una barra contra el promedio diario del mes. */
function _graficaDia(p, m) {
  const escala = Math.max(p.total, p.promedioDiario, 1) * 1.25;
  const lleno = Math.round((p.total / escala) * 100);
  const marca = Math.round((p.promedioDiario / escala) * 100);
  const nombreMes = _MESES[_partes(p.desde).m - 1];
  return `
      <div class="ana-dia" aria-hidden="true">
        <span class="ana-dia__marca-txt" style="--x:${marca}%">Promedio ${m(p.promedioDiario)}</span>
        <span class="ana-dia__riel"><span class="ana-dia__lleno" style="width:${lleno}%"></span><span class="ana-dia__marca" style="--x:${marca}%"></span></span>
      </div>
      <p class="ana-hero__nota">Tu promedio sale de ${p.diasPromedio === 1 ? `el día 1 de ${nombreMes}` : `los ${p.diasPromedio} días de ${nombreMes}`}.</p>`;
}

/**
 * Barras sobre la tarjeta: una columna por día o por mes, con el monto de la
 * más alta (y de la actual) encima y, si hay, la línea del promedio.
 */
function _barras({ clase, items, promedio = 0 }) {
  const max = Math.max(1, promedio, ...items.map(x => x.total));
  const iMax = items.findIndex(x => x.total === max && x.total > 0);
  const cols = items.map((x, i) => {
    const valor = (i === iMax || (x.actual && x.rotularActual)) && x.total > 0 ? `<span class="ana-barras__valor">${montoCorto(x.total)}</span>` : '';
    return `<span class="ana-barras__col${x.actual ? ' ana-barras__col--actual' : ''}${x.futuro ? ' ana-barras__col--futuro' : ''}"><span class="ana-barras__barra" style="height:${x.futuro ? 0 : Math.round((x.total / max) * 100)}%">${valor}</span></span>`;
  }).join('');
  const linea = promedio > 0 ? `<span class="ana-barras__promedio" style="--y:${(promedio / max).toFixed(3)}"></span>` : '';
  const lbs = items.map(x => `<span class="ana-barras__lb${x.actual ? ' ana-barras__lb--actual' : ''}">${x.lb}</span>`).join('');
  return `
      <div class="ana-barras ${clase}" aria-hidden="true">
        <div class="ana-barras__plot">${linea}${cols}</div>
        <div class="ana-barras__lbs">${lbs}</div>
      </div>`;
}

/** Semana: siete barras, de lunes a domingo; los días que no llegan, punteados. */
function _graficaSemana(p, hoyISO, m) {
  const items = p.dias.map((x, i) => ({
    total: x.total, futuro: x.futuro, actual: x.fecha === hoyISO, rotularActual: true,
    lb: x.fecha === hoyISO ? 'Hoy' : _DIAS_CORTOS[i],
  }));
  const previo = _partes(p.anterior.desde);
  const corte = _partes(p.anterior.hasta);
  const nota = p.anterior.alaAltura
    ? (p.anterior.desde === p.anterior.hasta
      ? `El lunes ${previo.d} llevabas ${m(p.anterior.total)}.`
      : `Del lunes ${previo.d} al ${_DIAS[corte.dow]} ${corte.d} llevabas ${m(p.anterior.total)}.`)
    : `La semana anterior sumó ${m(p.anterior.total)}.`;
  return `${_barras({ clase: 'ana-barras--semana', items })}
      <p class="ana-hero__nota">${nota}</p>`;
}

/** Mes: el acumulado día a día contra el del mes anterior. */
function _graficaMes(p, hoyISO, m) {
  const actual = p.ritmo;
  const previo = p.ritmoAnterior;
  const max = Math.max(1, ...actual.filter(v => v !== null), ...previo) * 1.08;
  const ancho = 300;
  const alto = 90;
  const x = (i, n) => (n <= 1 ? 0 : (i / (n - 1)) * ancho);
  const y = (v) => alto - (v / max) * (alto - 4);
  const n = actual.length;
  const puntos = actual.map((v, i) => (v === null ? null : `${x(i, n).toFixed(1)},${y(v).toFixed(1)}`)).filter(Boolean);
  // El mes anterior en la escala del actual: su día i cae donde cae el día i
  // de este (el 31 de un mes de 31 queda fuera de uno de 30).
  const puntosPrevio = previo.slice(0, n).map((v, i) => `${x(i, n).toFixed(1)},${y(v).toFixed(1)}`);
  const ultimo = actual.reduce((u, v, i) => (v === null ? u : i), 0);
  const ux = x(ultimo, n);
  const uy = y(actual[ultimo] ?? 0);
  const area = puntos.length > 1 ? `<polygon class="ana-ritmo__area" points="0,${alto} ${puntos.join(' ')} ${ux.toFixed(1)},${alto}"/>` : '';
  const d = _partes(p.desde);
  const h = _partes(p.hasta);
  const mesCorto = _MESES_CORTOS[d.m - 1];
  const nombreMes = _MESES[d.m - 1];
  const nombrePrevio = _MESES[_partes(p.anterior.desde).m - 1];
  const leyendaPrevio = p.anterior.alaAltura
    ? `${nombrePrevio.charAt(0).toUpperCase()}${nombrePrevio.slice(1)} al día ${_partes(p.anterior.hasta).d}: ${m(p.anterior.total)}`
    : `${nombrePrevio.charAt(0).toUpperCase()}${nombrePrevio.slice(1)}: ${m(p.anterior.total)}`;
  const marcaHoy = p.enCurso
    ? `<span class="ana-ritmo__hoy" style="--x:${((ux / ancho) * 100).toFixed(1)}%">Hoy, ${_partes(hoyISO).d}</span>`
    : '';
  return `
      <div class="ana-ritmo" aria-hidden="true">
        <svg class="ana-ritmo__svg" viewBox="0 0 ${ancho} ${alto}" preserveAspectRatio="none">
          <line class="ana-ritmo__base" x1="0" y1="${alto}" x2="${ancho}" y2="${alto}"/>
          ${area}
          <polyline class="ana-ritmo__previo" points="${puntosPrevio.join(' ')}"/>
          <polyline class="ana-ritmo__actual" points="${puntos.join(' ')}"/>
          ${p.enCurso ? `<line class="ana-ritmo__corte" x1="${ux.toFixed(1)}" y1="${uy.toFixed(1)}" x2="${ux.toFixed(1)}" y2="${alto}"/>` : ''}
        </svg>
        <span class="ana-ritmo__punto" style="--x:${((ux / ancho) * 100).toFixed(1)}%;--y:${((uy / alto) * 100).toFixed(1)}%"></span>
      </div>
      <div class="ana-ritmo__ejes" aria-hidden="true"><span>1 ${mesCorto}</span>${marcaHoy}<span>${h.d} ${mesCorto}</span></div>
      <p class="ana-ritmo__leyenda"><span class="ana-ritmo__clave ana-ritmo__clave--actual"></span>${nombreMes.charAt(0).toUpperCase()}${nombreMes.slice(1)}<span class="ana-ritmo__clave ana-ritmo__clave--previo"></span>${_esc(leyendaPrevio)}</p>`;
}

/** Año: doce barras con la línea del promedio de los meses cerrados. */
function _graficaAnio(p) {
  const items = p.meses.map((x, i) => ({
    total: x.total, futuro: x.futuro, actual: x.enCurso, rotularActual: false, lb: _MESES[i].charAt(0).toUpperCase(),
  }));
  const enCurso = p.meses.find(x => x.enCurso);
  const nombre = enCurso ? _MESES[enCurso.mes - 1] : '';
  return `${_barras({ clase: 'ana-barras--anio', items, promedio: p.promedioMes })}
      <p class="ana-ritmo__leyenda">${p.promedioMes > 0 ? '<span class="ana-ritmo__clave ana-ritmo__clave--previo"></span>Promedio' : ''}${enCurso ? `<span class="ana-ritmo__clave ana-ritmo__clave--mes"></span>${nombre.charAt(0).toUpperCase()}${nombre.slice(1)}, en curso` : ''}</p>`;
}

// ── EN QUÉ GASTAS (D5) ───────────────────────────────────────────

/**
 * Una parte del total en palabras, para el día: "casi la mitad", "un tercio".
 * Bajo un quinto, el porcentaje.
 * @param {number} pct
 * @returns {string}
 */
export function parteEnPalabras(pct) {
  if (pct >= 100) return 'todo';
  if (pct > 52) return 'más de la mitad';
  if (pct >= 48) return 'la mitad';
  if (pct >= 40) return 'casi la mitad';
  if (pct >= 30) return 'un tercio';
  if (pct >= 22) return 'una cuarta parte';
  return `el ${pct}%`;
}

/** Las categorías del periodo en filas: cinco y "Otras N" desde siete (D5). */
export function filasCategorias(categorias) {
  if (categorias.length <= 6) return categorias.map(c => ({ ...c, otras: null }));
  const cola = categorias.slice(5);
  const total = cola.reduce((s, c) => s + c.total, 0);
  const pct = cola.reduce((s, c) => s + c.pct, 0);
  return [
    ...categorias.slice(0, 5).map(c => ({ ...c, otras: null })),
    { categoria: `Otras ${cola.length} categorías`, total, pct, cuantos: cola.reduce((s, c) => s + c.cuantos, 0), otras: cola.map(c => c.categoria) },
  ];
}

/** @type {boolean} "Otras N categorías" desplegada: se ven todas. */
let _todasLasCategorias = false;

/** Despliega o recoge "Otras N categorías". */
export function alternarOtrasCategorias() {
  _todasLasCategorias = !_todasLasCategorias;
}

/** "En qué gastas" de una semana, un mes o un año. */
function _htmlEnQueGastas(p, hoyISO, m) {
  const filas = _todasLasCategorias ? p.categorias.map(c => ({ ...c, otras: null })) : filasCategorias(p.categorias);
  const mayor = p.categorias[0];
  const frase = mayor
    ? `${_esc(mayor.categoria)} es tu mayor gasto: <strong>${mayor.pct}% ${_dePeriodo(p, hoyISO)}</strong>.`
    : '';
  return `
    <section class="ana-bloque" aria-labelledby="ana-que-titulo">
      <div class="ana-sub ana-sub--titulo"><h2 class="ana-titulo" id="ana-que-titulo">En qué gastas</h2><p class="ana-sub__nota">${p.categorias.length} ${p.categorias.length === 1 ? 'categoría' : 'categorías'}</p></div>
      ${frase ? `<p class="ana-frase">${frase}</p>` : ''}
      <ul class="ana-tarjeta ana-cats" role="list">${filas.map(x => `
        <li><button type="button" class="ana-parte ana-parte--abre" ${x.otras
          ? 'data-action="analisis-otras" aria-expanded="false"'
          : `data-action="analisis-categoria" data-categoria="${_esc(x.categoria)}"`}>
          <span class="ana-parte__teja" aria-hidden="true">${tejaCategoria(x.otras ? 'c-otros' : (iconoDeCategoriaGasto(x.categoria, S.categoriasPersonalizadas) || 'c-otros'), x.otras ? 'analisis' : 'gastos')}</span>
          <span class="ana-parte__info">
            <span class="ana-parte__linea"><span class="ana-parte__nombre">${_esc(x.categoria)}</span><span class="ana-parte__monto">${m(x.total)}</span></span>
            ${x.otras ? `<span class="ana-parte__linea"><span class="ana-parte__otras">${_esc(nombresEnLinea(x.otras))}</span><span class="ana-parte__pct">${x.pct}%</span></span>`
              : `<span class="ana-parte__linea"><span class="ana-barra ana-barra--gastos" aria-hidden="true"><span style="width:${x.pct}%"></span></span><span class="ana-parte__pct">${x.pct}%</span></span>`}
          </span>
          <svg class="icon" aria-hidden="true"><use href="#i-chevron-right"/></svg>
        </button></li>`).join('')}
      </ul>
      ${_todasLasCategorias && p.categorias.length > 6 ? '<button type="button" class="ana-salida ana-salida--centro" data-action="analisis-otras" aria-expanded="true">Ver menos</button>' : ''}
    </section>`;
}

/** Lo que dice una fila del día bajo la categoría: "Taxi o app · Nequi". */
function _subDelGasto(g) {
  const sub = hijoPorId(SUBCATEGORIAS_GASTO, g.subcategoriaId)?.nombre || (g.descripcion ?? '').trim();
  const cuenta = (S.cuentas ?? []).find(c => c.id === g.cuentaId)?.nombre ?? '';
  return [sub, cuenta].filter(Boolean).join(' · ');
}

/** El día: cada gasto, de mayor a menor, y su salida a Gastos. */
function _htmlGastosDelDia(p, hoyISO, m) {
  const gastos = [...p.gastos].sort((a, b) => (Number(b.monto) || 0) - (Number(a.monto) || 0));
  const mayor = p.categorias[0];
  const veces = mayor && mayor.cuantos > 1 ? ` en ${mayor.cuantos <= 10 ? _NUMEROS[mayor.cuantos] : mayor.cuantos} gastos` : '';
  const frase = mayor && gastos.length > 1
    ? `${_esc(mayor.categoria)} suma <strong>${m(mayor.total)}${veces}</strong>: ${parteEnPalabras(mayor.pct)} ${_dePeriodo(p, hoyISO)}.`
    : '';
  const d = _partes(p.desde);
  const titulo = p.desde === hoyISO ? 'En qué gastaste hoy' : `En qué gastaste el ${_DIAS[d.dow]} ${d.d}`;
  return `
    <section class="ana-bloque" aria-labelledby="ana-que-titulo">
      <div class="ana-sub ana-sub--titulo"><h2 class="ana-titulo" id="ana-que-titulo">${titulo}</h2><p class="ana-sub__nota">De mayor a menor</p></div>
      ${frase ? `<p class="ana-frase">${frase}</p>` : ''}
      <ul class="ana-tarjeta ana-cats" role="list">${gastos.map(g => `
        <li class="ana-parte ana-parte--gasto">
          <span class="ana-parte__teja" aria-hidden="true">${tejaCategoria(iconoDeCategoriaGasto(g.categoria, S.categoriasPersonalizadas) || 'c-otros', 'gastos')}</span>
          <span class="ana-parte__info"><span class="ana-parte__nombre">${_esc(g.categoria || 'Otros')}</span><span class="ana-parte__sub">${_esc(_subDelGasto(g))}</span></span>
          <span class="ana-parte__monto">${m(Number(g.monto) || 0)}</span>
        </li>`).join('')}
      </ul>
      <button type="button" class="ana-salida ana-salida--centro" data-action="analisis-ver-movimientos" data-desde="${p.desde}" data-hasta="${p.hasta}">Ver el día en Gastos<svg class="icon" aria-hidden="true"><use href="#i-chevron-right"/></svg></button>
    </section>`;
}

/** Un periodo sin gastos: Tino tranquilo y, en un día o en el periodo en curso, registrar (D7). */
function _htmlSinGastos(p, hoyISO) {
  const d = _partes(p.desde);
  let titulo;
  let texto;
  let boton = '';
  if (p.tipo === 'dia') {
    const hoy = p.desde === hoyISO;
    titulo = hoy ? 'Hoy todavía no registras gastos' : `El ${_DIAS[d.dow]} ${d.d} no registraste gastos`;
    texto = hoy ? 'Cuando registres uno, aquí verás en qué se va tu día.' : 'Si se te pasó anotar algo, puedes registrarlo con la fecha de ese día.';
    boton = `<button type="button" class="btn btn-secondary ana-vacio__boton" data-action="nuevo-gasto" data-fecha="${p.desde}"><svg class="icon" aria-hidden="true"><use href="#i-plus"/></svg>${hoy ? 'Registrar un gasto' : `Registrar un gasto del ${d.d}`}</button>`;
  } else {
    const cual = p.tipo === 'semana' ? (p.enCurso ? 'Esta semana' : 'Esa semana')
      : p.tipo === 'anio' ? `En ${d.a}` : `En ${_mesEnPalabras(p.desde, hoyISO)}`;
    titulo = `${cual} ${p.enCurso ? 'todavía no registras' : 'no registraste'} gastos`;
    texto = p.enCurso ? 'Cuando registres uno, aquí verás en qué se va tu dinero.' : 'Prueba con otro periodo, o registra lo que se te pasó anotar con su fecha.';
    if (p.enCurso) boton = `<button type="button" class="btn btn-secondary ana-vacio__boton" data-action="nuevo-gasto" data-fecha="${hoyISO}"><svg class="icon" aria-hidden="true"><use href="#i-plus"/></svg>Registrar un gasto</button>`;
  }
  return `
    <section class="ana-vacio">
      ${htmlTinoSol('tranquilo', { tamano: 176, clase: 'ana-vacio__tino' })}
      <h2 class="ana-vacio__titulo">${titulo}</h2>
      <p class="ana-vacio__texto">${texto}</p>
      ${boton}
    </section>`;
}

/** Las cuatro pastillas del periodo. */
function _htmlPeriodos(tipo) {
  const nombres = { dia: 'Día', semana: 'Semana', mes: 'Mes', anio: 'Año' };
  return `
    <nav class="ana-periodos" aria-label="Periodo de tus gastos">${PERIODOS_ANALISIS.map(t => `
      <button type="button" class="ana-periodos__btn${t === tipo ? ' active' : ''}" data-action="analisis-periodo" data-periodo="${t}" aria-pressed="${t === tipo}">${nombres[t]}</button>`).join('')}
    </nav>`;
}

/**
 * La pastilla del encabezado de la sección: "‹ Noviembre ›" (D2). Atrás se
 * apaga en el periodo del primer gasto; adelante, en el periodo en curso.
 *
 * @param {string} hoyISO
 * @param {string|null} primerGasto
 * @returns {string}
 */
export function htmlPastillaPeriodo(hoyISO, primerGasto) {
  const { tipo, ancla } = periodoAnalisis(hoyISO);
  const rango = rangoPeriodo(tipo, ancla);
  const sinAtras = !primerGasto || rango.desde <= primerGasto;
  const sinAdelante = rango.hasta >= hoyISO;
  const etiquetas = { dia: ['Día anterior', 'Día siguiente'], semana: ['Semana anterior', 'Semana siguiente'], mes: ['Mes anterior', 'Mes siguiente'], anio: ['Año anterior', 'Año siguiente'] }[tipo];
  return `
    <button type="button" class="ana-pastilla-periodo__btn" data-action="analisis-periodo-mover" data-delta="-1" aria-label="${etiquetas[0]}"${sinAtras ? ' disabled' : ''}>
      <svg class="icon ana-pastilla-periodo__atras" aria-hidden="true"><use href="#i-chevron-right"/></svg>
    </button>
    <span class="ana-pastilla-periodo__label" aria-live="polite">${_esc(nombrePeriodo(rango, hoyISO))}</span>
    <button type="button" class="ana-pastilla-periodo__btn" data-action="analisis-periodo-mover" data-delta="1" aria-label="${etiquetas[1]}"${sinAdelante ? ' disabled' : ''}>
      <svg class="icon" aria-hidden="true"><use href="#i-chevron-right"/></svg>
    </button>`;
}

/** Tus gastos: las pastillas, el encabezado con su gráfica y en qué gastas. */
function _htmlTusGastos({ hoyISO }) {
  if (_categoria) return _htmlCategoria(hoyISO);
  const oculto = montosOcultos('analisis');
  const m = (n) => (oculto ? SALDO_MASCARA_CUENTA : f(n));
  const { tipo, ancla } = periodoAnalisis(hoyISO);
  const p = datosPeriodo(S.gastos, tipo, ancla, hoyISO);
  if (p.cuantos === 0) return `${_htmlPeriodos(tipo)}${_htmlSinGastos(p, hoyISO)}`;

  const grafica = p.tipo === 'dia' ? _graficaDia(p, m)
    : p.tipo === 'semana' ? _graficaSemana(p, hoyISO, m)
      : p.tipo === 'anio' ? _graficaAnio(p)
        : _graficaMes(p, hoyISO, m);
  const cuantos = p.tipo === 'dia' ? `<span class="ana-hero__cuantos">en ${p.cuantos} ${p.cuantos === 1 ? 'gasto' : 'gastos'}</span>` : '';
  const hero = `
    <section class="hero-analisis ana-hero" aria-labelledby="ana-hero-rotulo">
      <p class="ana-hero__rotulo" id="ana-hero-rotulo">${_esc(_rotuloTotal(p, hoyISO))}</p>
      <p class="ana-hero__total"><span class="ana-hero__monto">${oculto ? SALDO_MASCARA : f(p.total)}</span>${cuantos}</p>
      ${_htmlPastilla(comparacionPeriodo(p, hoyISO, m))}
      ${grafica}
    </section>`;
  const enQue = p.tipo === 'dia' ? _htmlGastosDelDia(p, hoyISO, m) : _htmlEnQueGastas(p, hoyISO, m);
  return `${_htmlPeriodos(tipo)}${hero}${enQue}${_htmlEncontro(p, hoyISO, m)}`;
}

// ── LO QUE FINKO ENCONTRÓ (ADR 176 D6 y D7) ──────────────────────

/** "sábado" → "sábados"; "lunes" se queda igual. */
function _pluralDia(nombre) {
  const n = String(nombre ?? '').toLowerCase();
  return n.endsWith('s') ? n : `${n}s`;
}

/** Un número con coma decimal: 2.3 → "2,3". */
function _decimal(n) {
  return String(n).replace('.', ',');
}

/**
 * Un hallazgo dicho en una frase, con su ícono y su enlace opcional. Describe,
 * no ordena (ADR 046 D3): el enlace es una salida que la persona elige.
 *
 * @param {object} h - de `hallazgosDelPeriodo()`.
 * @param {ReturnType<typeof datosPeriodo>} p
 * @param {string} hoyISO
 * @param {(n: number) => string} m
 * @returns {{ icono: string, frase: string, nota?: string, enlace?: { texto: string, atributos: string } }}
 */
export function fraseHallazgo(h, p, hoyISO, m) {
  if (h.tipo === 'dia-pesado') {
    const d = _partes(h.fecha);
    const cat = h.categoria ? `, sobre todo en ${_esc(h.categoria)} (${m(h.montoCategoria)})` : '';
    return { icono: 'i-agenda', frase: `El ${_DIAS[d.dow]} se llevó el <strong>${h.pct}% de tu semana</strong>${cat}.` };
  }
  if (h.tipo === 'hormiga') {
    const donde = p.tipo === 'anio' ? (p.enCurso ? 'en el año' : `en ${p.desde.slice(0, 4)}`) : `en ${_mesEnPalabras(p.desde, hoyISO)}`;
    const frase = p.tipo === 'anio'
      ? `Tus compras pequeñas que repites suman <strong>${m(h.total)}</strong> ${donde}.`
      : `${h.cuantos} compras pequeñas que repites suman <strong>${m(h.total)}</strong> ${donde}.`;
    return { icono: 'c-hormiga', frase, enlace: { texto: 'Ver cuáles', atributos: `data-action="analisis-hoja" data-hoja="hormiga" aria-haspopup="dialog"` } };
  }
  if (h.tipo === 'cambio') {
    const mesPrevio = _mesEnPalabras(p.anterior.desde, hoyISO);
    const cat = _esc(h.categoria);
    const frase = h.alaAltura
      ? `${cat} va <strong>${h.pct}% por encima</strong> de ${mesPrevio} a esta altura: ${m(h.dinero)} más.`
      : `${cat} ${h.delta > 0 ? 'subió' : 'bajó'} <strong>${h.pct}%</strong> frente a ${mesPrevio}: ${m(h.dinero)} ${h.delta > 0 ? 'más' : 'menos'}.`;
    return {
      icono: h.delta > 0 ? 'i-trending-up' : 'i-trending-down',
      frase,
      enlace: { texto: `Ver ${cat}`, atributos: `data-action="analisis-categoria" data-categoria="${cat}"` },
    };
  }
  if (h.tipo === 'patron') {
    return { icono: 'i-agenda', frase: `Los ${_pluralDia(h.dia)} gastas <strong>${_decimal(h.factor)} veces</strong> lo de un día promedio.`, nota: 'Según tus últimos 90 días' };
  }
  // El mes más alto del año.
  const nombre = _MESES[h.mes - 1];
  return {
    icono: 'i-agenda',
    frase: `${nombre.charAt(0).toUpperCase()}${nombre.slice(1)} fue tu mes con más gasto: <strong>${m(h.total)}</strong>, ${h.pct}% sobre tu promedio.`,
    enlace: { texto: `Ver ${nombre}`, atributos: `data-action="analisis-periodo" data-periodo="mes" data-ancla="${h.anio}-${String(h.mes).padStart(2, '0')}-01"` },
  };
}

/** El bloque: Tino con lupa y hasta tres hallazgos. Sin hallazgos, nada. */
function _htmlEncontro(p, hoyISO, m) {
  const opciones = { tope: topeHormiga(S.config), personalizadas: S.categoriasPersonalizadas ?? [], aprendidos: aprendidosDe(S.config) };
  const hallazgos = hallazgosDelPeriodo(p, S.gastos, hoyISO, opciones);
  if (hallazgos.length === 0) return '';
  const donde = p.tipo === 'semana' ? (p.enCurso ? 'de esta semana' : 'de esa semana')
    : p.tipo === 'anio' ? `de ${p.desde.slice(0, 4)}` : `de ${_mesEnPalabras(p.desde, hoyISO)}`;
  return `
    <section class="ana-tarjeta ana-encontro" aria-labelledby="ana-encontro-titulo">
      <div class="ana-encontro__cabeza">
        ${htmlTinoSol('con-lupa', { tamano: 64, clase: 'ana-encontro__tino' })}
        <div><h2 class="ana-encontro__titulo" id="ana-encontro-titulo">Lo que Finko encontró</h2><p class="ana-encontro__sub">En tus gastos ${donde}</p></div>
      </div>
      <ul class="ana-encontro__lista" role="list">${hallazgos.map(h => {
    const x = fraseHallazgo(h, p, hoyISO, m);
    return `
        <li class="ana-hallazgo">
          <span class="ana-hallazgo__teja" aria-hidden="true"><svg class="icon" aria-hidden="true"><use href="#${x.icono}"/></svg></span>
          <span class="ana-hallazgo__textos">
            <span class="ana-hallazgo__frase">${x.frase}</span>
            ${x.nota ? `<span class="ana-hallazgo__nota">${x.nota}</span>` : ''}
            ${x.enlace ? `<button type="button" class="ana-salida" ${x.enlace.atributos}>${x.enlace.texto}<svg class="icon" aria-hidden="true"><use href="#i-chevron-right"/></svg></button>` : ''}
          </span>
        </li>`;
  }).join('')}
      </ul>
    </section>`;
}

/**
 * La hoja de "Ver cuáles" (ADR 176 D6): las compras pequeñas de gusto del
 * periodo visible, por categoría.
 *
 * @param {string} hoyISO
 * @returns {string} HTML del cuerpo de `#modal-detalle-fila`.
 */
export function htmlHojaHormiga(hoyISO) {
  const oculto = montosOcultos('analisis');
  const m = (n) => (oculto ? SALDO_MASCARA_CUENTA : f(n));
  const { tipo, ancla } = periodoAnalisis(hoyISO);
  const p = datosPeriodo(S.gastos, tipo, ancla, hoyISO);
  const tope = topeHormiga(S.config);
  const h = hormigaEnRango(S.gastos, p.desde, p.corte, { tope, personalizadas: S.categoriasPersonalizadas ?? [], aprendidos: aprendidosDe(S.config) });
  const donde = p.tipo === 'anio' ? `en ${p.desde.slice(0, 4)}` : `en ${_mesEnPalabras(p.desde, hoyISO)}`;
  return `${_cabezaHoja({ teja: `<span class="detalle-fila__icono" aria-hidden="true">${tejaCategoria('c-hormiga', 'gastos')}</span>`, titulo: 'Gastos hormiga', sub: `${h.cuantos} ${h.cuantos === 1 ? 'compra' : 'compras'} ${donde}: ${m(h.total)}` })}
    <div class="ana-tarjeta ana-hoja">${h.porCategoria.map(c => `
      <div class="ana-parte">
        <span class="ana-parte__teja" aria-hidden="true">${tejaCategoria(iconoDeCategoriaGasto(c.categoria, S.categoriasPersonalizadas) || 'c-otros', 'gastos')}</span>
        <span class="ana-parte__info"><span class="ana-parte__nombre">${_esc(c.categoria)}</span><span class="ana-parte__sub">${c.cuantos} ${c.cuantos === 1 ? 'compra' : 'compras'}</span></span>
        <span class="ana-parte__monto">${m(c.total)}</span>
      </div>`).join('')}
    </div>
    <p class="ana-nota">Compras de ${f(tope)} o menos que repites: la misma 3 veces en 30 días, sea necesidad o deseo. Se ajusta en Límites.</p>`;
}

// ── EL DETALLE DE UNA CATEGORÍA (ADR 176 D8) ─────────────────────

/** @type {string|null} La categoría abierta en Tus gastos; `null` = el periodo. */
let _categoria = null;

/** La categoría abierta, o `null`. */
export function categoriaAnalisis() {
  return _categoria;
}

/**
 * Abre el detalle de una categoría (o vuelve al periodo con `null`). Con
 * `tipo`, salta también a ese periodo (el enlace de un hallazgo).
 * @param {string|null} categoria
 */
export function abrirCategoriaAnalisis(categoria) {
  _categoria = categoria ? String(categoria) : null;
  if (_categoria) _lente = 'gastos';
}

/** El nombre de una subcategoría del catálogo. */
function _nombreSub(id) {
  return hijoPorId(SUBCATEGORIAS_GASTO, id)?.nombre ?? '';
}

/** "5 de nov" de un `YYYY-MM-DD`, para las fichas de fecha. */
function _ficha(iso) {
  const d = _partes(String(iso ?? '').slice(0, 10));
  return `<span class="ana-fecha" aria-hidden="true"><span class="ana-fecha__dia">${d.d}</span><span class="ana-fecha__sem">${_DIAS[d.dow].slice(0, 3)}</span></span>`;
}

/** El límite del mes de la categoría, si tiene uno (solo en Mes). */
function _htmlLimite(c, hoyISO, m) {
  if (c.tipo !== 'mes') return '';
  const pres = (S.presupuestos ?? []).find(x => x.activo !== false && x.categoria === c.categoria && Number(x.montoMensual) > 0);
  if (!pres) return '';
  const asignado = Number(pres.montoMensual);
  const pct = Math.min(100, Math.round((c.total / asignado) * 100));
  const restante = asignado - c.total;
  const faltan = c.enCurso ? _diasHasta(hoyISO, c.hasta) : 0;
  let texto;
  if (restante >= 0) {
    texto = c.enCurso
      ? `Te quedan <strong>${m(restante)}</strong>${faltan > 0 ? ` para ${faltan === 1 ? 'el día que falta' : `los ${faltan} días que faltan`}` : ''}.`
      : `Quedaron <strong>${m(restante)}</strong> sin usar.`;
  } else {
    texto = `${c.enCurso ? 'Vas' : 'Quedaste'} <strong>${m(-restante)}</strong> por encima del límite.`;
  }
  return `
    <section class="ana-tarjeta ana-limite" aria-labelledby="ana-limite-titulo">
      <div class="ana-tarjeta__cuerpo">
        <div class="ana-limite__linea"><h2 class="ana-limite__titulo" id="ana-limite-titulo">Tu límite del mes</h2><span class="ana-limite__cifras">${m(c.total)} de ${m(asignado)}</span></div>
        <span class="ana-barra ana-barra--limite" aria-hidden="true"><span style="width:${pct}%"></span></span>
        <p class="ana-limite__texto">${texto}</p>
      </div>
    </section>`;
}

/** Días que faltan después de hoy hasta `hasta` (inclusive). */
function _diasHasta(hoyISO, hasta) {
  const a = _partes(hoyISO);
  const b = _partes(hasta);
  return Math.round((Date.UTC(b.a, b.m - 1, b.d) - Date.UTC(a.a, a.m - 1, a.d)) / 86_400_000);
}

/** "En qué se va": las subcategorías con su parte, en barra y en filas. */
function _htmlSubcategorias(c, m) {
  const subs = c.subcategorias;
  if (subs.length === 0 || (subs.length === 1 && subs[0].nombre === SIN_DETALLE)) return '';
  const mayor = subs[0];
  const frase = mayor.nombre === SIN_DETALLE ? ''
    : `<p class="ana-frase">${_esc(mayor.nombre)} ${subs.length === 1 ? 'es todo' : `es <strong>${parteEnPalabras(mayor.pct)}</strong>`} de lo que gastas aquí.</p>`;
  const tono = (i) => `--tono:${Math.max(25, 100 - i * 22)}%`;
  return `
    <section class="ana-bloque" aria-labelledby="ana-subs-titulo">
      <h2 class="ana-titulo" id="ana-subs-titulo">En qué se va</h2>
      ${frase}
      <div class="ana-tarjeta ana-subs">
        <span class="ana-subs__barra" aria-hidden="true">${subs.map((s, i) => `<span style="width:${s.pct}%;${tono(i)}"></span>`).join('')}</span>
        <ul class="ana-cats" role="list">${subs.map((s, i) => `
          <li class="ana-sub-fila">
            <span class="ana-sub-fila__punto" style="${tono(i)}" aria-hidden="true"></span>
            <span class="ana-parte__info"><span class="ana-parte__nombre">${_esc(s.nombre)}</span><span class="ana-parte__sub">${s.cuantos} ${s.cuantos === 1 ? 'gasto' : 'gastos'}</span></span>
            <span class="ana-sub-fila__cifras"><span class="ana-parte__monto">${m(s.total)}</span><span class="ana-parte__pct">${s.pct}%</span></span>
          </li>`).join('')}
        </ul>
      </div>
    </section>`;
}

/** "Cómo ha cambiado": seis meses contra el promedio de los cinco anteriores. */
function _htmlComoCambio(c, hoyISO, m) {
  if (!c.meses.some(x => x.total > 0)) return '';
  const ultimo = c.meses[c.meses.length - 1];
  const nombre = _MESES[ultimo.mes - 1];
  let frase = '';
  if (c.promedioMeses > 0) {
    const pct = Math.round((ultimo.total / c.promedioMeses) * 100);
    if (ultimo.enCurso) {
      const faltan = _diasHasta(hoyISO, rangoPeriodo('mes', ultimo.desde).hasta);
      frase = `Ya vas en el <strong>${pct}% de tu promedio</strong> mensual${faltan > 0 ? ` y ${faltan === 1 ? 'falta 1 día' : `faltan ${faltan} días`}` : ''}.`;
    } else {
      const dif = pct - 100;
      frase = dif === 0 ? `${nombre.charAt(0).toUpperCase()}${nombre.slice(1)} quedó en tu promedio.`
        : `${nombre.charAt(0).toUpperCase()}${nombre.slice(1)} quedó <strong>${Math.abs(dif)}% ${dif > 0 ? 'sobre' : 'bajo'} tu promedio</strong>.`;
    }
  }
  const items = c.meses.map(x => ({
    total: x.total, futuro: false, actual: x === ultimo, rotularActual: true,
    lb: `${_MESES_CORTOS[x.mes - 1].charAt(0).toUpperCase()}${_MESES_CORTOS[x.mes - 1].slice(1)}`,
  }));
  const desde = _MESES[c.meses[0].mes - 1];
  const hasta = _MESES[c.meses[4].mes - 1];
  return `
    <section class="ana-bloque" aria-labelledby="ana-cambio-titulo">
      <h2 class="ana-titulo" id="ana-cambio-titulo">Cómo ha cambiado</h2>
      ${frase ? `<p class="ana-frase">${frase}</p>` : ''}
      <div class="ana-tarjeta ana-tarjeta__cuerpo ana-cambio">
        ${_barras({ clase: 'ana-barras--cambio', items, promedio: c.promedioMeses })}
        ${c.promedioMeses > 0 ? `<p class="ana-ritmo__leyenda"><span class="ana-ritmo__clave ana-ritmo__clave--previo"></span>Tu promedio de ${c.mesesPromedio === 5 ? `${desde} a ${hasta}` : `los ${c.mesesPromedio} meses anteriores`}: ${m(c.promedioMeses)}</p>` : ''}
      </div>
    </section>`;
}

/** "Tus gastos más grandes": cinco, con la salida a Movimientos. */
function _htmlMayores(c, m) {
  if (c.mayores.length === 0) return '';
  return `
    <section class="ana-bloque" aria-labelledby="ana-mayores-titulo">
      <div class="ana-sub ana-sub--titulo"><h2 class="ana-titulo" id="ana-mayores-titulo">Tus gastos más grandes</h2><p class="ana-sub__nota">${c.mayores.length} de ${c.cuantos}</p></div>
      <ul class="ana-tarjeta ana-cats" role="list">${c.mayores.map(g => `
        <li class="ana-parte ana-parte--gasto">
          ${_ficha(g.fecha)}
          <span class="ana-parte__info"><span class="ana-parte__nombre">${_esc(_nombreSub(g.subcategoriaId) || (g.descripcion ?? '').trim() || c.categoria)}</span><span class="ana-parte__sub">${_esc((S.cuentas ?? []).find(x => x.id === g.cuentaId)?.nombre ?? '')}</span></span>
          <span class="ana-parte__monto">${m(Number(g.monto) || 0)}</span>
        </li>`).join('')}
      </ul>
      <button type="button" class="ana-salida ana-salida--centro" data-action="analisis-ver-movimientos" data-categoria="${_esc(c.categoria)}" data-desde="${c.desde}" data-hasta="${c.corte}">Ver ${c.cuantos === 1 ? 'el gasto' : `los ${c.cuantos}`} en Gastos<svg class="icon" aria-hidden="true"><use href="#i-chevron-right"/></svg></button>
    </section>`;
}

/** El detalle de la categoría abierta, en el periodo visible. */
function _htmlCategoria(hoyISO) {
  const oculto = montosOcultos('analisis');
  const m = (n) => (oculto ? SALDO_MASCARA_CUENTA : f(n));
  const { tipo, ancla } = periodoAnalisis(hoyISO);
  const c = datosCategoria(S.gastos, _categoria, tipo, ancla, hoyISO, _nombreSub);
  const volver = `<button type="button" class="ana-volver" data-action="analisis-categoria" data-categoria=""><svg class="icon" aria-hidden="true"><use href="#i-chevron-right"/></svg>Análisis</button>`;
  const teja = tejaCategoria(iconoDeCategoriaGasto(c.categoria, S.categoriasPersonalizadas) || 'c-otros', 'gastos');
  const cabeza = `
    <section class="ana-cat" aria-labelledby="ana-cat-titulo">
      <div class="ana-cat__cabeza">${teja}<div><h2 class="ana-cat__titulo" id="ana-cat-titulo">${_esc(c.categoria)}</h2>
        <p class="ana-cat__sub">${c.pctDelPeriodo}% de tu gasto ${_dePeriodo(c, hoyISO).replace(/^de tu día$/, 'del día')} · ${c.cuantos} ${c.cuantos === 1 ? 'gasto' : 'gastos'}</p></div></div>
      <p class="ana-cat__total">${oculto ? SALDO_MASCARA : f(c.total)}</p>
      ${c.variacion && c.tipo !== 'anio' ? _htmlPastilla(comparacionPeriodo(c, hoyISO, m)).replace('ana-pastilla', 'ana-pastilla ana-pastilla--suelta') : ''}
      ${c.anterior.total > 0 && c.tipo !== 'anio' ? `<p class="ana-cat__nota">${_esc(_notaAnterior(c, hoyISO, m))}</p>` : ''}
    </section>`;
  if (c.cuantos === 0) {
    return `${volver}${cabeza}<p class="ana-nota">No hay gastos de ${_esc(c.categoria)} en este periodo.</p>`;
  }
  return `${volver}${cabeza}${_htmlLimite(c, hoyISO, m)}${_htmlSubcategorias(c, m)}${_htmlComoCambio(c, hoyISO, m)}${_htmlMayores(c, m)}`;
}

/** "Del 1 al 18 de octubre llevabas $349.000.", "En octubre gastaste $349.000." */
function _notaAnterior(c, hoyISO, m) {
  const d = _partes(c.anterior.desde);
  const h = _partes(c.anterior.hasta);
  if (c.tipo === 'mes') {
    return c.anterior.alaAltura
      ? `Del 1 al ${h.d} de ${_MESES[d.m - 1]} llevabas ${m(c.anterior.total)}.`
      : `En ${_mesEnPalabras(c.anterior.desde, hoyISO)} gastaste ${m(c.anterior.total)}.`;
  }
  if (c.tipo === 'semana') {
    return c.anterior.alaAltura
      ? `Del lunes ${d.d} al ${_DIAS[h.dow]} ${h.d} llevabas ${m(c.anterior.total)}.`
      : `La semana anterior gastaste ${m(c.anterior.total)}.`;
  }
  return `El ${_DIAS[d.dow]} ${d.d} gastaste ${m(c.anterior.total)}.`;
}

// ── LA SECCIÓN ───────────────────────────────────────────────────

/**
 * Análisis en el teléfono: las dos lentes y la visible.
 *
 * @param {{ resumen: object, lecturas: object, anio: number, fechaHoy: string, criterios: Array<{estado: string}> }} p
 * @returns {string}
 */
export function htmlAnalisisTelefono({ resumen, lecturas, anio, fechaHoy, criterios }) {
  const cuerpo = _lente === 'situacion'
    ? _htmlTuSituacion({ resumen, lecturas, anio, fechaHoy, criterios })
    : _htmlTusGastos({ hoyISO: fechaHoy });
  // En el detalle de una categoría la salida es "‹ Análisis": sin pestañas (D8).
  const lentes = _lente === 'gastos' && _categoria ? '' : _htmlLentes();
  return `${lentes}<div class="ana-lente ana-lente--${_lente}">${cuerpo}</div>`;
}

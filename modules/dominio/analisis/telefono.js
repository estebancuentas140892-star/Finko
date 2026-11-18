/**
 * analisis/telefono.js - Análisis en el teléfono (ADR 176).
 *
 * Dos lentes bajo el título (D1): **Tus gastos**, lo que pasa en un periodo,
 * y **Tu situación**, lo que tienes hoy. Tu situación son tres tarjetas (D9):
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
import { iconoDeCategoriaGasto } from '../../core/constants.js';
import { coberturaFondo, mesesEnPalabras } from '../../infra/bolsas.js';
import { gastosMes } from '../gastos/logic.js';
import { gastosDeConsumo } from '../../infra/naturaleza.js';
import { calcularScoreSalud, clasificarScore, repartirPorcentajes } from './logic.js';
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
 * La frase de la comparación del mes, en HTML: "Este mes llevas <b>$897.000</b>,
 * 232% más que octubre ($270.000)." Si el mes anterior no tuvo gastos, lo
 * dice: no hay con qué comparar.
 *
 * @param {Array<{anio:number, mes:number, total:number}>} serie
 * @param {(n:number) => string} m
 * @returns {string}
 */
export function fraseDelMes(serie, m) {
  const actual = serie[serie.length - 1]?.total ?? 0;
  const previo = serie[serie.length - 2];
  const llevas = `Este mes llevas <strong class="ana-meses__monto">${m(actual)}</strong>`;
  if (!previo) return `${llevas}.`;
  const mesPrevio = _MESES[previo.mes - 1] ?? '';
  if (!(previo.total > 0)) return `${llevas}. En ${mesPrevio} no registraste gastos, así que todavía no hay con qué comparar.`;
  const pct = Math.round(((actual - previo.total) / previo.total) * 100);
  if (pct === 0) return `${llevas}, lo mismo que ${mesPrevio}.`;
  return `${llevas}, ${Math.abs(pct)}% ${pct > 0 ? 'más' : 'menos'} que ${mesPrevio} (${m(previo.total)}).`;
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

/**
 * "Más detalle de tus gastos" en Tus gastos, mientras ANA.1c no reparta su
 * contenido (ADR 176 D6).
 * @returns {string}
 */
function _htmlFilaDetalle() {
  return `
    <section class="ana-bloque ana-tarjeta ana-tarjeta--fila" aria-label="Más detalle de tus gastos">${_fila({ hoja: 'detalle', teja: _tejaAnalisis('i-bar-chart'), titulo: 'Más detalle de tus gastos', sub: SUB_DETALLE })}
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

// ── TUS GASTOS (tanda 4, hasta ANA.1b) ───────────────────────────

/**
 * Tus gastos del mes en curso, como los dejó la tanda 4: barras por mes con la
 * comparación en frase y una fila por categoría. ANA.1b lo cambia por el
 * periodo (ADR 176 D2 a D5).
 */
function _htmlTusGastos({ serieGastos, anio, mes, conDetalle }) {
  const oculto = montosOcultos('analisis');
  const m = (n) => (oculto ? SALDO_MASCARA_CUENTA : f(n));

  const serie = Array.isArray(serieGastos) ? serieGastos : [];
  const maximo = Math.max(1, ...serie.map(s => s.total));
  const primero = serie.findIndex(s => s.total > 0);
  const nota = primero > 0
    ? `<p class="ana-nota">Antes de ${_MESES[serie[primero].mes - 1]} no hay gastos registrados: esos meses no cuentan como cero.</p>`
    : '';
  const barras = serie.map((s, i) => `
          <span class="ana-mes${i === serie.length - 1 ? ' ana-mes--actual' : ''}${i < primero || primero < 0 ? ' ana-mes--vacio' : ''}">
            <span class="ana-mes__barra" style="height:${Math.round((s.total / maximo) * 100)}%"></span>
            <span class="ana-mes__lb">${_esc(s.label ?? '')}</span>
          </span>`).join('');
  const vaTu = serie.length > 0 ? `
    <section class="ana-bloque" aria-labelledby="ana-va-titulo">
      <div class="ana-sub ana-sub--titulo"><h2 class="ana-titulo" id="ana-va-titulo">A dónde va tu dinero</h2><p class="ana-sub__suma ana-sub__mes">${_MESES[mes - 1].charAt(0).toUpperCase() + _MESES[mes - 1].slice(1)}</p></div>
      <div class="ana-tarjeta ana-meses">
        <p class="ana-meses__frase">${fraseDelMes(serie, m)}</p>
        <div class="ana-meses__barras" aria-hidden="true">${barras}
        </div>
        ${nota}
      </div>
    </section>` : '';

  // En qué gastas: una fila por categoría; la cola, en una.
  const porCat = {};
  for (const g of gastosMes(gastosDeConsumo(S.gastos), anio, mes)) { // ADR 139 D2
    const c = g.categoria || 'Otro';
    porCat[c] = (porCat[c] ?? 0) + (Number(g.monto) || 0);
  }
  const cats = Object.entries(porCat).filter(([, t]) => t > 0).sort((a, b) => b[1] - a[1]);
  const totalMes = cats.reduce((s, [, t]) => s + t, 0);
  const visibles = cats.length > 6 ? cats.slice(0, 5) : cats;
  const cola = cats.length > 6 ? cats.slice(5) : [];
  const filasCat = visibles.map(([c, t]) => ({ label: c, total: t, icono: iconoDeCategoriaGasto(c, S.categoriasPersonalizadas) || 'c-otros' }));
  if (cola.length > 0) filasCat.push({ label: `Otras ${cola.length} categorías`, total: cola.reduce((s, [, t]) => s + t, 0), icono: 'c-otros' });
  const pctCat = repartirPorcentajes(filasCat.map(x => x.total));
  const mayorCat = Math.max(1, ...filasCat.map(x => x.total));
  const enQue = totalMes > 0 ? `
    <section class="ana-bloque" aria-labelledby="ana-que-titulo">
      <div class="ana-sub ana-sub--titulo"><h2 class="ana-titulo ana-titulo--sub" id="ana-que-titulo">En qué gastas</h2><p class="ana-sub__suma">${m(totalMes)}</p></div>
      <div class="ana-tarjeta">${filasCat.map((x, i) => `
        <div class="ana-parte">
          <span class="ana-parte__teja" aria-hidden="true">${tejaCategoria(x.icono, 'gastos')}</span>
          <span class="ana-parte__info">
            <span class="ana-parte__linea"><span class="ana-parte__nombre">${_esc(x.label)}</span><span class="ana-parte__monto">${m(x.total)}</span></span>
            <span class="ana-parte__linea"><span class="ana-barra ana-barra--gastos" aria-hidden="true"><span style="width:${Math.round((x.total / mayorCat) * 100)}%"></span></span><span class="ana-parte__pct">${pctCat[i]}%</span></span>
          </span>
        </div>`).join('')}
      </div>
    </section>` : `
    <section class="ana-bloque"><p class="analisis__empty">Aún no registras gastos este mes. Cuando lo hagas verás en qué se va tu dinero.</p></section>`;

  return `${vaTu}${enQue}${conDetalle ? _htmlFilaDetalle() : ''}`;
}

// ── LA SECCIÓN ───────────────────────────────────────────────────

/**
 * Análisis en el teléfono: las dos lentes y la visible.
 *
 * @param {{ resumen: object, serieGastos: Array<{anio:number, mes:number, total:number, label:string}>, lecturas: object, anio: number, mes: number, fechaHoy: string, conDetalle: boolean, criterios: Array<{estado: string}> }} p
 * @returns {string}
 */
export function htmlAnalisisTelefono({ resumen, serieGastos, lecturas, anio, mes, fechaHoy, conDetalle, criterios }) {
  const cuerpo = _lente === 'situacion'
    ? _htmlTuSituacion({ resumen, lecturas, anio, fechaHoy, criterios })
    : _htmlTusGastos({ serieGastos, anio, mes, conDetalle });
  return `${_htmlLentes()}<div class="ana-lente ana-lente--${_lente}">${cuerpo}</div>`;
}

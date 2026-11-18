/**
 * analisis/telefono.js - Análisis en el teléfono (ADR 134 D7).
 *
 * El tablero "rediseño3" dice lo mismo que las tarjetas de escritorio, en
 * filas: la salud de tu dinero suelta, con lo que más la frena y su salida;
 * "De dónde sale" el número en una fila por factor; lo que realmente tienes
 * con lo que tienes y lo que debes en filas con su parte; a dónde va tu
 * dinero en barras por mes con la comparación en frase; y en qué gastas, una
 * fila por categoría con su barra. Desde 1024px siguen el anillo, la dona y la
 * línea (ANL.2, DIS.10).
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

/**
 * "Más detalle de tus gastos" y "Estado de tu renta" en una tarjeta: cada una
 * es una fila que abre su hoja (`analisis-hoja`).
 *
 * @param {{ conDetalle: boolean, anio: number, criterios: Array<{estado: string}> }} p
 * @returns {string}
 */
export function htmlMasAnalisis({ conDetalle, anio, criterios }) {
  const fila = (hoja, iconoId, titulo, sub, extra = '') => `
        <li><button type="button" class="ana-fila" data-action="analisis-hoja" data-hoja="${hoja}" aria-haspopup="dialog">
          <span class="ana-fila__teja" aria-hidden="true"><svg class="icon" aria-hidden="true"><use href="#${iconoId}"/></svg></span>
          <span class="ana-fila__textos"><span class="ana-fila__titulo">${titulo}</span><span class="ana-fila__sub">${sub}</span>${extra}</span>
          <svg class="icon ana-fila__chevron" aria-hidden="true"><use href="#i-chevron-right"/></svg>
        </button></li>`;
  const aviso = avisoRenta(criterios);
  const lineaAviso = aviso
    ? `<span class="ana-fila__aviso ana-fila__aviso--${aviso.nivel}"><svg class="icon" aria-hidden="true"><use href="#i-alert"/></svg>${aviso.texto}</span>`
    : '';
  return `
    <section class="ana-bloque" aria-label="Más análisis">
      <ul class="ana-tarjeta ana-mas" role="list">${conDetalle ? fila('detalle', 'i-bar-chart', 'Más detalle de tus gastos', SUB_DETALLE) : ''}${fila('renta', 'i-percent', `Estado de tu renta (${anio})`, subRenta(criterios.length), lineaAviso)}
      </ul>
    </section>`;
}

/** Lo que trae el detalle de gastos, dicho en frase (ADR 134 D7). */
export const SUB_DETALLE = 'Contra el mes anterior, por día de la semana y gastos hormiga';

/** Lo que trae la renta: "5 criterios de la DIAN y sus topes". */
export function subRenta(n) {
  return `${n} ${n === 1 ? 'criterio' : 'criterios'} de la DIAN y sus topes`;
}

/**
 * Análisis en el teléfono. `resumen` y `serieGastos` son los de la vista.
 *
 * @param {{ resumen: object, serieGastos: Array<{anio:number, mes:number, total:number, label:string}>, lecturas: object, anio: number, mes: number }} p
 * @returns {string}
 */
export function htmlAnalisisTelefono({ resumen, serieGastos, lecturas, anio, mes }) {
  const oculto = montosOcultos('analisis');
  const m = (n) => (oculto ? SALDO_MASCARA_CUENTA : f(n));
  const fondo = S.ahorro?.fondoEmergencia;
  const score = calcularScoreSalud(resumen, { activo: fondo?.activo === true, completado: fondo?.completado === true });
  const banda = clasificarScore(score.score);
  const frena = loQueFrena(banda, score.factors);

  const salud = `
    <section class="ana-salud" aria-labelledby="ana-salud-titulo">
      <h2 class="ana-rotulo" id="ana-salud-titulo">Salud de tu dinero</h2>
      <p class="ana-salud__cifra">
        <span class="ana-salud__num">${score.score}</span><span class="ana-salud__de">de 100</span>
        <span class="ana-salud__banda ana-salud__banda--${banda}"><svg class="icon" aria-hidden="true"><use href="#${banda === 'excelente' || banda === 'buena' ? 'i-check' : 'i-alert'}"/></svg>${_BANDA[banda]}</span>
      </p>
      <span class="ana-barra ana-barra--salud" aria-hidden="true"><span style="width:${score.score}%"></span></span>
      <p class="ana-salud__frase">${_esc(frena.frase)}</p>
      ${frena.salida ? `<a class="ana-salida" href="${frena.salida.href}">${_esc(frena.salida.texto)}<svg class="icon" aria-hidden="true"><use href="#i-chevron-right"/></svg></a>` : ''}
    </section>
    <section class="ana-bloque" aria-labelledby="ana-factores-titulo">
      <h2 class="ana-titulo" id="ana-factores-titulo">De dónde sale el ${score.score}</h2>
      <div class="ana-tarjeta">${FACTORES_TELEFONO.map(x => `
        <div class="ana-factor">
          <span class="ana-factor__textos"><span class="ana-factor__nombre">${x.label}</span><span class="ana-factor__desc">${x.desc}</span></span>
          <span class="ana-barra ana-factor__barra" aria-hidden="true"><span style="width:${score.factors[x.key]}%"></span></span>
          <span class="ana-factor__valor" aria-label="${x.label}: ${score.factors[x.key]} de 100">${score.factors[x.key]}</span>
        </div>`).join('')}
      </div>
    </section>`;

  // Lo que realmente tienes: lo que tienes y lo que debes, en filas.
  const { activos, pasivos, patrimonioNeto } = resumen;
  const partes = _PARTES.map(p => ({ ...p, valor: Number(activos[p.key]) || 0 })).filter(p => p.valor > 0)
    .sort((a, b) => b.valor - a.valor);
  const pcts = repartirPorcentajes(partes.map(p => p.valor));
  const neto = oculto ? SALDO_MASCARA : `${patrimonioNeto < 0 ? '−' : ''}${f(Math.abs(patrimonioNeto))}`;
  const deudas = (S.compromisos ?? []).filter(c => c.activo !== false && (c.tipo === 'deuda-entidad' || c.tipo === 'deuda-personal') && Number(c.saldoTotal) > 0);
  const tienes = `
    <section class="ana-bloque" aria-labelledby="ana-tienes-titulo">
      <h2 class="ana-titulo" id="ana-tienes-titulo">Lo que realmente tienes</h2>
      <p class="ana-neto${patrimonioNeto < 0 ? ' ana-neto--negativo' : ''}">${neto}</p>
      <p class="ana-texto">Tienes ${m(activos.total)} y debes ${m(pasivos.total)}.${lecturas?.patrimonio ? ` ${_esc(lecturas.patrimonio)}` : ''}</p>
      ${partes.length > 0 ? `
      <div class="ana-sub"><h3 class="ana-sub__titulo">Lo que tienes</h3><p class="ana-sub__suma">${m(activos.total)}</p></div>
      <div class="ana-tarjeta">${partes.map((p, i) => `
        <div class="ana-parte">
          <span class="ana-parte__teja" aria-hidden="true">${tejaCategoria(p.icono, p.dom)}</span>
          <span class="ana-parte__info">
            <span class="ana-parte__linea"><span class="ana-parte__nombre">${p.label}</span><span class="ana-parte__monto">${m(p.valor)}</span></span>
            <span class="ana-parte__linea"><span class="ana-barra" aria-hidden="true"><span style="width:${pcts[i]}%"></span></span><span class="ana-parte__pct">${pcts[i]}%</span></span>
          </span>
        </div>`).join('')}
      </div>` : ''}
      ${pasivos.cantidadDeudas > 0 ? `
      <div class="ana-sub"><h3 class="ana-sub__titulo">Lo que debes</h3><p class="ana-sub__suma">${m(pasivos.total)}</p></div>
      <a class="ana-tarjeta ana-deudas" href="#compromisos">
        <span class="ana-parte__teja" aria-hidden="true">${tejaCategoria('i-deudas', 'compromisos')}</span>
        <span class="ana-parte__info">
          <span class="ana-parte__nombre">${pasivos.cantidadDeudas} ${pasivos.cantidadDeudas === 1 ? 'deuda' : 'deudas'}</span>
          <span class="ana-deudas__nombres">${_esc(_enLista(deudas.map(d => d.descripcion ?? '')))}${pasivos.deudasSinSaldo > 0 ? ` · ${pasivos.deudasSinSaldo} sin saldo registrado` : ''}</span>
        </span>
      </a>` : ''}
    </section>`;

  // A dónde va tu dinero: barras por mes y la comparación en frase.
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
  // La barra se mide contra la categoría más grande, como en el tablero: la
  // primera va llena y las demás se comparan con ella; el % dice la parte.
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

  return `${salud}${tienes}${vaTu}${enQue}`;
}

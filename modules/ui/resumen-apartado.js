/**
 * resumen-apartado.js - la hoja "Resumen" de cada pestaña de Gastos en el
 * teléfono, como la página 6 del lienzo "Gastos · Rediseño integral"
 * (GAS.15d, [ADR 192](../../docs/DECISIONS/192-los-resumenes-del-lienzo.md)).
 *
 * Arriba, seis meses con su cifra sobre cada barra y "Meses anteriores";
 * debajo, el mes elegido con lo que lo hizo. Pura: recibe el estado y lo que
 * ya calculó el bloque (los totales de cada mes); no lee `S` ni el DOM.
 */

import { nombreMes } from '../infra/mes-bloque.js';
import { esDelDiaADia, repartoPorCategoria } from '../dominio/gastos/logic.js';
import { iconoDeCategoriaGasto, tonoDeCategoria, GRUPOS_CATEGORIA_AGENDA } from '../core/constants.js';
import { presupuestosActivos, calcularProgreso } from '../dominio/presupuesto/logic.js';

/** Cuántos meses se ven a la vez (lienzo, página 6). */
export const MESES_VENTANA = 6;

const _MES_CORTO = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

/** Lo que dicen el título, la gráfica y la cifra de cada pestaña. */
export const RESUMEN_DE_LA_LENTE = Object.freeze({
  gast:        { nombre: 'Día a día', grafica: 'Lo que gastaste cada mes', verbo: 'Gastaste en', vacio: 'Sin gastos' },
  fijos:       { nombre: 'Fijos', grafica: 'Lo que pagaste en fijos cada mes', verbo: 'Pagaste en', vacio: 'Sin pagos' },
  deudas:      { nombre: 'Deudas', grafica: 'Lo que debías al cierre de cada mes', verbo: 'Abonaste en', vacio: 'Sin deudas' },
  presupuesto: { nombre: 'Límites', grafica: 'Cuánto usaste de tus límites', verbo: 'Usaste en', vacio: 'Sin gastos' },
});

/** La salida a Movimientos de cada pestaña. */
const _SALIDA = {
  fijos: 'Ver los pagos de fijos en Movimientos',
  deudas: 'Ver los abonos en Movimientos',
  presupuesto: 'Ver los gastos con límite en Movimientos',
};

const _idx = (x) => x.anio * 12 + x.mes;
const _deIdx = (i) => ({ anio: Math.floor(i / 12), mes: ((i % 12) + 12) % 12 });

/**
 * La cifra sobre cada barra: "812 mil", "1,2 M". Sin el signo: va pequeña.
 *
 * @param {number} n
 * @returns {string}
 */
export function cifraCorta(n) {
  const v = Math.max(0, Math.round(Number(n) || 0));
  if (v >= 999_500) return `${String(Math.round(v / 100_000) / 10).replace('.', ',')} M`;
  if (v >= 1_000) return `${Math.round(v / 1_000)} mil`;
  return String(v);
}

/**
 * El último mes de la ventana al abrir la hoja: el mes tope si el mes visto
 * cabe en los seis que terminan en él; si no, el mes visto.
 *
 * @param {{anio:number, mes:number}} visto
 * @param {{anio:number, mes:number}} tope
 * @returns {{anio:number, mes:number}}
 */
export function finDeVentana(visto, tope, n = MESES_VENTANA) {
  const v = _idx(visto);
  const t = _idx(tope);
  return v >= t || t - v < n ? { anio: tope.anio, mes: tope.mes } : { anio: visto.anio, mes: visto.mes };
}

/**
 * Mueve la ventana `delta` meses sin pasar del tope y sin empezar antes del
 * primer mes de Finko: hacia atrás se detiene en los seis primeros meses.
 */
export function moverVentana(fin, delta, { tope, primero }, n = MESES_VENTANA) {
  const minimo = Math.min(_idx(tope), _idx(primero) + n - 1);
  const i = Math.min(_idx(tope), Math.max(minimo, _idx(fin) + delta));
  return _deIdx(i);
}

/**
 * Los meses de la ventana, del más viejo al de `fin`.
 *
 * @param {{anio:number, mes:number}} fin
 * @returns {Array<{anio:number, mes:number}>}
 */
export function mesesDeLaVentana(fin, n = MESES_VENTANA) {
  const ultimo = _idx(fin);
  return Array.from({ length: n }, (_, i) => _deIdx(ultimo - (n - 1) + i));
}

/** Escapa texto de usuario dentro del HTML. */
function _esc(t) {
  return String(t ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * La gráfica de seis meses (lienzo, página 6): "Lo que gastaste cada mes" y el
 * año arriba; "Meses anteriores" a la izquierda; cada mes con su cifra, su
 * barra y su nombre corto. El mes visto va resaltado y en el color de la
 * pestaña; los demás, en gris. En Límites la cifra es el porcentaje y una
 * raya marca el 100 %.
 *
 * @param {'gast'|'fijos'|'deudas'|'presupuesto'} lente
 * @param {Array<{anio:number, mes:number, valor:number, fuera:boolean, esperado?:number}>} serie
 *   `esperado`: en Fijos, lo del mes en curso con lo que falta; va en un contorno punteado.
 * @param {{ visto:{anio:number, mes:number}, oculto:boolean, hayAnteriores:boolean, haySiguientes:boolean, m:(n:number)=>string }} opciones
 * @returns {string}
 */
export function htmlGraficaResumen(lente, serie, { visto, oculto, hayAnteriores, haySiguientes, m }) {
  const r = RESUMEN_DE_LA_LENTE[lente] ?? RESUMEN_DE_LA_LENTE.gast;
  const enPct = lente === 'presupuesto';
  const dentro = serie.filter(s => !s.fuera);
  const max = Math.max(0, ...dentro.map(s => Math.max(s.valor, s.esperado ?? 0)));
  // En Límites el 100 % va a tres cuartos del alto; un mes que se pasó crece
  // hasta el borde.
  const escala = enPct ? Math.max(100 / 0.75, max) : max;
  const anios = [...new Set(serie.map(s => s.anio))];
  const barras = serie.map(s => {
    if (s.fuera) return `
        <span class="resumen-barra resumen-barra--fuera" aria-hidden="true"><span class="resumen-barra__cifra"></span><span class="resumen-barra__col"></span><span class="resumen-barra__mes">${_MES_CORTO[s.mes]}</span></span>`;
    const esVisto = s.anio === visto.anio && s.mes === visto.mes;
    const alto = oculto || escala <= 0 ? 0 : Math.min(100, Math.round((s.valor / escala) * 100));
    const esperado = !oculto && escala > 0 && (s.esperado ?? 0) > s.valor
      ? `<span class="resumen-barra__esperado" style="--alto: ${Math.min(100, Math.round((s.esperado / escala) * 100))}%"></span>` : '';
    const cifra = oculto ? '' : enPct ? `${s.valor} %` : cifraCorta(s.valor);
    const dicho = enPct ? `${s.valor} % de tus límites` : s.valor > 0 ? m(s.valor) : r.vacio;
    return `
        <button type="button" class="resumen-barra${esVisto ? ' resumen-barra--visto' : ''}${s.valor > 0 ? '' : ' resumen-barra--vacia'}"
                data-action="bloque-ir-mes" data-anio="${s.anio}" data-mes="${s.mes}"
                aria-pressed="${esVisto ? 'true' : 'false'}" aria-label="${nombreMes(s.mes)} de ${s.anio}: ${oculto ? 'oculto' : dicho}">
          <span class="resumen-barra__cifra">${cifra}</span>
          <span class="resumen-barra__col">${esperado}<span class="resumen-barra__fill" style="--alto: ${alto}%"></span></span>
          <span class="resumen-barra__mes">${_MES_CORTO[s.mes]}</span>
        </button>`;
  }).join('');
  const tope = enPct && !oculto ? `
        <span class="resumen-graf__tope" aria-hidden="true" style="--tope: ${(100 / escala).toFixed(3)}"><span>100 %</span></span>` : '';
  return `
      <div class="resumen-graf" data-lente="${lente}">
        <div class="resumen-graf__cab">
          <span class="resumen-graf__que">${r.grafica}</span>
          <span class="resumen-graf__anio">${anios.join(' · ')}</span>
        </div>
        <div class="resumen-graf__barras">
          <button type="button" class="resumen-graf__flecha" data-action="bloque-resumen-ventana" data-delta="-${MESES_VENTANA}"
                  aria-label="Meses anteriores"${hayAnteriores ? '' : ' disabled'}>
            <svg class="icon" aria-hidden="true"><use href="#i-chevron-right"/></svg>
          </button>
          <span class="resumen-graf__meses" role="group" aria-label="Meses">${barras}${tope}
          </span>${haySiguientes ? `
          <button type="button" class="resumen-graf__flecha resumen-graf__flecha--sig" data-action="bloque-resumen-ventana" data-delta="${MESES_VENTANA}"
                  aria-label="Meses siguientes">
            <svg class="icon" aria-hidden="true"><use href="#i-chevron-right"/></svg>
          </button>` : ''}
        </div>
      </div>`;
}

/**
 * La cabecera del mes: "Gastaste en noviembre", la cifra con su "de $X" y la
 * línea de notas (una pastilla y un texto suelto).
 */
function _htmlCabecera(que, cifra, { de = '', pastilla = '', nota = '' } = {}) {
  const notas = pastilla || nota ? `
        <p class="resumen__notas">${pastilla}${nota ? `<span class="resumen__nota">${nota}</span>` : ''}</p>` : '';
  return `
      <div class="resumen__cab">
        <p class="resumen__que">${que}</p>
        <p class="resumen__grande"><span class="resumen__cifra">${cifra}</span>${de ? `<span class="resumen__de">${de}</span>` : ''}</p>${notas}
      </div>`;
}

/** Una pastilla de la cabecera, con su ícono si lo trae y su tono. */
function _pastilla(texto, { icono = '', tono = '' } = {}) {
  return `<span class="resumen__pastilla${tono ? ` resumen__pastilla--${tono}` : ''}">${icono ? `<svg class="icon" aria-hidden="true"><use href="#${icono}"/></svg>` : ''}${texto}</span>`;
}

/** La salida a Movimientos, al pie. */
function _salida(texto, dominio, rango) {
  return `
      <button type="button" class="resumen__salida" data-action="resumen-ver" data-dominio="${dominio}"
              data-desde="${rango.desde}" data-hasta="${rango.hasta}">${texto}<svg class="icon" aria-hidden="true"><use href="#i-chevron-right"/></svg></button>`;
}

/** El rango de un mes para el filtro de Movimientos. */
export function rangoDelMes(anio, mes) {
  const pre = `${anio}-${String(mes + 1).padStart(2, '0')}`;
  const ultimo = new Date(anio, mes + 1, 0).getDate();
  return { prefijo: `${pre}-`, desde: `${pre}-01`, hasta: `${pre}-${String(ultimo).padStart(2, '0')}` };
}

/**
 * Una fila de lo que hizo el mes: el glifo en su tono, el nombre, el
 * porcentaje, la cifra y una barra delgada contra la mayor. Abre Movimientos
 * con el apartado, el mes y la categoría puestos.
 */
function _filaParte(p, max, { oculto, m, dominio, rango }) {
  const ancho = max > 0 ? Math.max(2, Math.round((p.total / max) * 100)) : 0;
  return `
        <li>
          <button type="button" class="resumen__parte" data-action="resumen-ver" data-dominio="${dominio}"
                  ${p.categoria ? `data-categoria="${_esc(p.categoria)}" ` : ''}data-desde="${rango.desde}" data-hasta="${rango.hasta}">
            <svg class="icon resumen__glifo" aria-hidden="true" style="--glifo: var(--fk-cat-${p.tono}-barra)"><use href="#${p.icono}"/></svg>
            <span class="resumen__linea">
              <span class="resumen__nombre">${_esc(p.nombre)}</span>
              <span class="resumen__pct">${oculto ? '' : `${p.pct} %`}</span>
              <span class="resumen__monto">${m(p.total)}</span>
            </span>${oculto ? '' : `
            <span class="resumen__barrita" aria-hidden="true"><span style="width: ${ancho}%; --glifo: var(--fk-cat-${p.tono}-barra)"></span></span>`}
          </button>
        </li>`;
}

/**
 * "Otras N categorías": los puntos de las tres primeras, el porcentaje y la
 * suma; abre las que faltan en la misma lista (como Análisis).
 */
function _filaOtras(cola, { oculto, m }) {
  const total = cola.reduce((a, p) => a + p.total, 0);
  const pct = cola.reduce((a, p) => a + p.pct, 0);
  return `
        <li>
          <button type="button" class="resumen__parte resumen__parte--otras" data-action="resumen-otras" aria-expanded="false">
            <span class="resumen__puntos" aria-hidden="true">${cola.slice(0, 3).map(p => `<span style="--glifo: var(--fk-cat-${p.tono}-barra)"></span>`).join('')}</span>
            <span class="resumen__linea">
              <span class="resumen__nombre">Otras ${cola.length} categorías</span>
              <span class="resumen__pct">${oculto ? '' : `${pct} %`}</span>
              <span class="resumen__monto">${m(total)}</span>
            </span>
            <svg class="icon resumen__chev" aria-hidden="true"><use href="#i-chevron-down"/></svg>
          </button>
        </li>`;
}

/** La lista de partes: cinco y "Otras N" desde siete, o todas abiertas. */
function _listaPartes(partes, mes, { oculto, m, dominio, rango, todas }) {
  if (partes.length === 0) return '';
  const max = partes[0].total;
  const corta = !todas && partes.length > 6;
  const vistas = corta ? partes.slice(0, 5) : partes;
  return `
      <ul class="resumen__partes" aria-label="Lo de ${nombreMes(mes).toLowerCase()}">${vistas.map(p => _filaParte(p, max, { oculto, m, dominio, rango })).join('')}${corta ? _filaOtras(partes.slice(5), { oculto, m }) : ''}
      </ul>${todas && partes.length > 6 ? `
      <button type="button" class="resumen__menos" data-action="resumen-otras" aria-expanded="true">Ver menos</button>` : ''}`;
}

/** La barra partida por categoría, en sus tonos. Sin ojo puesto. */
function _reparto(partes, clase = 'resumen__reparto') {
  return `
      <div class="${clase}" aria-hidden="true">${partes.map(p => `<span style="flex-grow: ${p.total}; --glifo: var(--fk-cat-${p.tono}-barra)"></span>`).join('')}</div>`;
}

/**
 * Día a día (lienzo, página 6): "Gastaste en noviembre", la cifra, "$273.800
 * más que octubre" y cuántos gastos; la barra partida por categoría y las
 * categorías de mayor a menor, cinco y "Otras N"; "Ver los 14 gastos en
 * Movimientos".
 *
 * @param {object} state
 * @param {number} anio
 * @param {number} mes 0-11
 * @param {{ oculto:boolean, m:(n:number)=>string, anterior:number|null, todas?:boolean }} opciones
 *   `anterior`: lo gastado el mes de antes, o `null` si ese mes no es de la historia.
 */
export function htmlCuerpoDiaADia(state, anio, mes, { oculto, m, anterior, todas = false }) {
  const rango = rangoDelMes(anio, mes);
  const propios = (state.gastos ?? []).filter(g => typeof g?.fecha === 'string' && g.fecha.startsWith(rango.prefijo) && esDelDiaADia(g));
  const total = propios.reduce((a, g) => a + (Number(g.monto) || 0), 0);
  const partes = repartoPorCategoria(propios).map(r => ({
    nombre: r.categoria, total: r.total, pct: r.pct, categoria: r.categoria,
    icono: iconoDeCategoriaGasto(r.categoria, state.categoriasPersonalizadas ?? []), tono: tonoDeCategoria(r.categoria),
  }));
  const n = propios.length;
  const mesAntes = nombreMes((mes + 11) % 12).toLowerCase();
  let pastilla = '';
  if (!oculto && anterior !== null && anterior > 0 && total > 0) {
    const dif = total - anterior;
    pastilla = dif > 0 ? _pastilla(`${m(dif)} más que ${mesAntes}`, { icono: 'i-trending-up' })
      : dif < 0 ? _pastilla(`${m(-dif)} menos que ${mesAntes}`, { icono: 'i-trending-down' })
      : _pastilla(`Igual que ${mesAntes}`);
  }
  const nota = n > 0 ? `${n} ${n === 1 ? 'gasto' : 'gastos'}` : '';
  return `${_htmlCabecera(`Gastaste en ${nombreMes(mes).toLowerCase()}`, m(total), { pastilla, nota })}${oculto || partes.length === 0 ? '' : _reparto(partes)}${_listaPartes(partes, mes, { oculto, m, dominio: 'gastos', rango, todas })}${n > 0 ? _salida(n === 1 ? 'Ver el gasto en Movimientos' : `Ver los ${n} gastos en Movimientos`, 'gastos', rango) : ''}`;
}

/**
 * Límites (lienzo, página 6): "Usaste en noviembre $563.400 de $1.160.000",
 * cuántos límites se pasaron y los días que faltan; cada límite con lo usado
 * de su tope, el porcentaje y su barra en el color de su estado.
 *
 * @param {object} state
 * @param {number} anio
 * @param {number} mes 0-11
 * @param {{ oculto:boolean, m:(n:number)=>string, esActual:boolean, hoyDate:Date }} opciones
 */
export function htmlCuerpoLimites(state, anio, mes, { oculto, m, esActual, hoyDate }) {
  const rango = rangoDelMes(anio, mes);
  const filas = presupuestosActivos(state.presupuestos ?? [])
    .map(p => ({ p, pr: calcularProgreso(p, state.gastos ?? [], anio, mes + 1) }))
    .sort((a, b) => b.pr.porcentaje - a.pr.porcentaje || String(a.p.categoria).localeCompare(String(b.p.categoria), 'es'));
  const gastado = filas.reduce((a, x) => a + x.pr.gastado, 0);
  const asignado = filas.reduce((a, x) => a + x.pr.asignado, 0);
  const pasados = filas.filter(x => x.pr.estado === 'excedido').length;
  const n = filas.length;
  let pastilla = '';
  if (n > 0) {
    pastilla = pasados > 0
      ? _pastilla(`${pasados} de ${n} ${n === 1 ? 'límite' : 'límites'} ${pasados === 1 ? 'se pasó' : 'se pasaron'}`, { tono: 'mal' })
      : _pastilla(n === 1 ? 'El límite no se pasó' : 'Ningún límite se pasó', { tono: 'bien' });
  }
  const faltan = esActual ? new Date(anio, mes + 1, 0).getDate() - hoyDate.getDate() : 0;
  const nota = faltan > 0 ? `${faltan === 1 ? 'falta 1 día' : `faltan ${faltan} días`}` : '';
  const lista = filas.map(({ p, pr }) => {
    const cat = String(p.categoria ?? '');
    const tono = tonoDeCategoria(cat);
    const estado = pr.estado === 'excedido' ? 'mal' : pr.estado === 'alerta' ? 'cerca' : 'bien';
    return `
        <li>
          <button type="button" class="resumen__parte resumen__parte--limite" data-action="resumen-ver" data-dominio="gastos"
                  data-categoria="${_esc(cat)}" data-desde="${rango.desde}" data-hasta="${rango.hasta}" data-estado="${estado}">
            <svg class="icon resumen__glifo" aria-hidden="true" style="--glifo: var(--fk-cat-${tono}-barra)"><use href="#${iconoDeCategoriaGasto(cat, state.categoriasPersonalizadas ?? [])}"/></svg>
            <span class="resumen__linea">
              <span class="resumen__nombre">${_esc(cat)}</span>
              <span class="resumen__uso">${m(pr.gastado)} de ${m(pr.asignado)}</span>
              <span class="resumen__pct resumen__pct--limite">${oculto ? '' : `${pr.porcentaje} %`}</span>
            </span>${oculto ? '' : `
            <span class="resumen__barrita" aria-hidden="true"><span style="width: ${Math.max(2, Math.min(100, pr.porcentaje))}%"></span></span>`}
          </button>
        </li>`;
  }).join('');
  return `${_htmlCabecera(`Usaste en ${nombreMes(mes).toLowerCase()}`, m(gastado), { de: asignado > 0 ? `de ${m(asignado)}` : '', pastilla, nota })}${n ? `
      <ul class="resumen__partes resumen__partes--limites" aria-label="Tus límites en ${nombreMes(mes).toLowerCase()}">${lista}
      </ul>` : ''}${n ? _salida(_SALIDA.presupuesto, 'gastos', rango) : ''}`;
}

const _MES_CORTO_MIN = _MES_CORTO.map(x => x.toLowerCase());

/** "12 nov" (con el año si no es el del mes que se mira). */
function _diaMes(iso, anio) {
  if (typeof iso !== 'string' || iso.length < 10) return '';
  const a = Number(iso.slice(0, 4));
  return `${Number(iso.slice(8, 10))} ${_MES_CORTO_MIN[Number(iso.slice(5, 7)) - 1]}${a !== anio ? ` ${a}` : ''}`;
}

/** El nombre corto de cada familia de fijos, para la leyenda. */
const _FAMILIA_CORTA = { casa: 'Casa', conexion: 'Conexión', salud: 'Salud', estudio: 'Estudio', otros: 'Otros' };

/**
 * La familia de un fijo por su categoría (GF.2, ADR 177 D2): casa, conexión,
 * salud, estudio u otros.
 *
 * @param {string} categoria
 * @returns {string}
 */
export function familiaDeFijo(categoria) {
  return GRUPOS_CATEGORIA_AGENDA.find(g => g.categorias.includes(categoria))?.familia ?? 'otros';
}

/** Una fila de un pago o una deuda: la teja, el nombre, su estado y la cifra. */
function _filaPago({ teja, nombre, estado, texto, cifra, bajo = '' }) {
  return `
        <li class="resumen__pago" data-estado="${estado}">
          <span class="resumen__teja" aria-hidden="true">${teja}</span>
          <span class="resumen__pago-info">
            <span class="resumen__pago-nombre">${_esc(nombre)}</span>
            <span class="resumen__pago-estado">${texto}</span>
          </span>
          <span class="resumen__pago-cifra"><span class="resumen__pago-monto">${cifra}</span>${bajo ? `<span class="resumen__pago-bajo">${bajo}</span>` : ''}</span>
        </li>`;
}

/**
 * Fijos (lienzo, página 6): "Pagaste en noviembre $1.200.000 de $1.584.800",
 * "1 de 5 pagos · 1 vencido"; la barra partida por familia con su leyenda y
 * cada fijo del mes con su estado: lo vencido, lo pagado y lo que falta.
 *
 * @param {{ filas: Array<{ nombre:string, teja:string, estado:string, fecha:string|null, monto:number, familia:string }>, pagado:number, total:number }} datos
 * @param {number} anio
 * @param {number} mes 0-11
 * @param {{ oculto:boolean, m:(n:number)=>string }} opciones
 */
export function htmlCuerpoFijos({ filas, pagado, total }, anio, mes, { oculto, m }) {
  const rango = rangoDelMes(anio, mes);
  const n = filas.length;
  const pagados = filas.filter(x => x.estado === 'pagado').length;
  const vencidos = filas.filter(x => x.estado === 'vencido').length;
  const pastilla = n > 0
    ? _pastilla(`${pagados} de ${n} ${n === 1 ? 'pago' : 'pagos'}${vencidos > 0 ? ` · <span class="resumen__mal">${vencidos} ${vencidos === 1 ? 'vencido' : 'vencidos'}</span>` : ''}`) : '';
  const porFamilia = new Map();
  for (const x of filas) porFamilia.set(x.familia, (porFamilia.get(x.familia) ?? 0) + x.monto);
  const suma = [...porFamilia.values()].reduce((a, v) => a + v, 0);
  const familias = [...porFamilia].filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  const reparto = oculto || suma <= 0 ? '' : `
      <div class="resumen__reparto resumen__reparto--fijos" aria-hidden="true">${familias.map(([fam, v]) => `<span data-familia="${fam}" style="flex-grow: ${v}"></span>`).join('')}</div>
      <p class="resumen__leyenda">${familias.map(([fam, v]) => `<span class="resumen__ley" data-familia="${fam}"><span class="resumen__ley-punto" aria-hidden="true"></span>${_FAMILIA_CORTA[fam] ?? 'Otros'} <b>${Math.round((v / suma) * 100)} %</b></span>`).join('')}</p>`;
  const texto = (x) => {
    if (x.estado === 'pagado') return x.fecha ? `Pagado el ${_diaMes(x.fecha, anio)}` : 'Pagado';
    if (x.estado === 'vencido') return x.fecha ? `Venció el ${_diaMes(x.fecha, anio)}` : 'Vencido';
    return x.fecha ? `Vence el ${_diaMes(x.fecha, anio)}` : 'Este mes';
  };
  const lista = filas.map(x => _filaPago({ teja: x.teja, nombre: x.nombre, estado: x.estado, texto: texto(x), cifra: m(x.monto) })).join('');
  return `${_htmlCabecera(`Pagaste en ${nombreMes(mes).toLowerCase()}`, m(pagado), { de: total > pagado ? `de ${m(total)}` : '', pastilla })}${reparto}${n ? `
      <ul class="resumen__pagos" aria-label="Tus fijos de ${nombreMes(mes).toLowerCase()}">${lista}
      </ul>` : ''}${_salida(_SALIDA.fijos, 'fijos', rango)}`;
}

/**
 * Deudas (lienzo, página 6): "Abonaste en noviembre $180.000 de $680.000 en
 * cuotas", "Tu deuda bajó $180.000"; en el mes en curso, la tarjeta de las
 * cuotas con cuántas van al día, por pagar o vencidas; cada deuda con su
 * estado y lo que debes.
 *
 * @param {{ filas: Array<{ nombre:string, teja:string, estado:string, fecha:string|null, cuota:number, pagado:number, saldo:number }>, abonado:number, cuotas:number, bajo:number|null }} datos
 *   `bajo`: cuánto bajó lo que debes desde el cierre del mes anterior (negativo si subió); `null` sin ese mes.
 * @param {number} anio
 * @param {number} mes 0-11
 * @param {{ oculto:boolean, m:(n:number)=>string, esActual:boolean }} opciones
 */
export function htmlCuerpoDeudas({ filas, abonado, cuotas, bajo }, anio, mes, { oculto, m, esActual }) {
  const rango = rangoDelMes(anio, mes);
  const nombre = nombreMes(mes).toLowerCase();
  let pastilla = '';
  if (!oculto && bajo !== null && bajo !== 0) {
    pastilla = bajo > 0 ? _pastilla(`Tu deuda bajó ${m(bajo)}`, { icono: 'i-trending-down', tono: 'bien' })
      : _pastilla(`Tu deuda subió ${m(-bajo)}`, { icono: 'i-trending-up', tono: 'mal' });
  }
  const orden = { pagado: 0, pendiente: 1, libre: 1, vencido: 2 };
  const vistas = [...filas].sort((a, b) => orden[a.estado] - orden[b.estado]);
  const cuenta = (e) => filas.filter(x => x.estado === e).length;
  const alDia = cuenta('pagado');
  const porPagar = cuenta('pendiente');
  const vencidas = cuenta('vencido');
  const tarjeta = !esActual || cuotas <= 0 ? '' : `
      <div class="resumen__cuotas">
        <p class="resumen__cuotas-fila"><span>Cuotas de ${nombre}</span><b>${m(abonado)} de ${m(cuotas)}</b></p>${oculto ? '' : `
        <span class="resumen__cuotas-barra" aria-hidden="true"><span style="width: ${Math.min(100, Math.round((abonado / cuotas) * 100))}%"></span></span>`}
        <p class="resumen__cuotas-cuenta">${[
          alDia ? `<span><b>${alDia}</b> al día</span>` : '',
          porPagar ? `<span><b>${porPagar}</b> por pagar</span>` : '',
          vencidas ? `<span class="resumen__mal"><b>${vencidas}</b> ${vencidas === 1 ? 'vencida' : 'vencidas'}</span>` : '',
        ].join('')}</p>
      </div>`;
  const dia = (iso) => {
    if (!iso) return '';
    return iso.slice(0, 7) === rango.prefijo.slice(0, 7) ? String(Number(iso.slice(8, 10))) : _diaMes(iso, anio);
  };
  const texto = (x) => {
    if (x.estado === 'pagado') return `Abonaste ${m(x.pagado)} · al día`;
    if (x.estado === 'libre') return x.pagado > 0 ? `Abonaste ${m(x.pagado)}` : 'Sin cuota fija';
    const cuota = `Cuota de ${m(x.cuota)}`;
    if (!x.fecha) return cuota;
    return `${cuota} · ${x.estado === 'vencido' ? 'venció' : 'vence'} el ${dia(x.fecha)}`;
  };
  const lista = vistas.map(x => _filaPago({
    teja: x.teja, nombre: x.nombre, estado: x.estado === 'libre' && x.pagado > 0 ? 'pagado' : x.estado,
    texto: texto(x), cifra: m(x.saldo), bajo: 'debes',
  })).join('');
  return `${_htmlCabecera(`Abonaste en ${nombre}`, m(abonado), { de: esActual && cuotas > 0 ? `de ${m(cuotas)} en cuotas` : '', pastilla })}${tarjeta}${filas.length ? `
      <ul class="resumen__pagos resumen__pagos--deudas" aria-label="Tus deudas en ${nombre}">${lista}
      </ul>` : ''}${_salida(_SALIDA.deudas, 'deudas', rango)}`;
}

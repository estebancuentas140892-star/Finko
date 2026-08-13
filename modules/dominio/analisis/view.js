/**
 * analisis/view.js - generación de HTML del panel de análisis financiero.
 * Puede leer S. No puede mutarlo. Sin lógica de negocio.
 */

import { S } from '../../core/state.js';
import { f, hoy, esc as _esc } from '../../infra/utils.js';
import { SALDO_MASCARA, SALDO_MASCARA_CUENTA } from '../../infra/render.js';
import { estadoVigenciaLegal } from '../../core/constants.js';
import { sparkline, donut, colorearSegmentos, progressRing } from '../../infra/svg.js';
import { icon } from '../../infra/icons.js';
import { memoizar } from '../../infra/memo.js';
import { gastosMes } from '../gastos/logic.js';
import {
  generarResumen, serieGastosMensual, seriePorCategoria,
  calcularScoreSalud, clasificarScore,
  calcularComparacionCategorias, detectarPatronGastoSemanal,
  calcularEstadoRenta, detectarNudgesRenta, inferirEstadoDeclarante,
  repartirPorcentajes,
  lecturaPatrimonio, lecturaTendencia, lecturaCategorias, lecturaComparacion,
} from './logic.js';

/**
 * DIS.10 (C8): chevron real del sprite para los dos colapsables del panel.
 * El carácter '▾' del `::after` no hereda trazo ni tamaño del sistema de
 * íconos. Mismo recurso y misma clase que el desglose de Límites de gasto,
 * que ya hizo el cambio; acá se acota a `.analisis-grupo--fila`.
 */
const _CHEVRON_GRUPO = '<svg class="icon analisis-grupo__chevron" aria-hidden="true"><use href="#i-chevron-right"/></svg>';

// ── PANEL PRINCIPAL ──────────────────────────────────────────────

/**
 * Nombres de mes para el chip del header (ANL.2a, ADR 038 D6). Copia local
 * mínima: `MONTHS` de agenda/view.js no se importa (ningún dominio importa
 * a otro, ADN 10; misma duplicación deliberada que documenta ese módulo).
 */
const _MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

/**
 * PERF.2: `renderAnalisis()` hacía ~7 barridos completos de `S.gastos` (cada
 * uno con sub-barridos propios, ej. `serieGastosMensual` recorre 12 meses)
 * en cada `state:change` de `SECCIONES_OBSERVADAS`. Consolidar todo en una
 * sola función memoizada evita repetir el cómputo cuando ninguno de los
 * arrays de origen cambió desde el último render (ej. `renderAll()` vuelve
 * a pintar el dashboard sin que `gastos`/`compromisos`/etc. se hayan tocado).
 *
 * PERF.3: la comparación vs mes anterior y el patrón semanal ya no se calculan
 * aquí. Alimentan solo el grupo colapsado "Más detalle de tus gastos", así que
 * se difieren a cuando el usuario lo abre (ver `_calcularDetalleGastos`).
 *
 * @param {import('../../core/state.js').Gasto[]} gastos
 * @param {import('../../core/state.js').Compromiso[]} compromisos
 * @param {import('../../core/state.js').Cuenta[]} cuentas
 * @param {import('../../core/state.js').Meta[]} metas
 * @param {import('../../core/state.js').Apartado[]} apartados
 * @param {import('../../core/state.js').Inversion[]} inversiones
 * @param {number} anio
 * @param {number} mes
 */
function _calcularDatosAnalisis(gastos, compromisos, cuentas, metas, apartados, inversiones, personales, anio, mes) {
  const resumen = generarResumen(gastos, compromisos, cuentas, anio, mes, metas, apartados, inversiones, personales);

  // Series para gráficos (D.3). Se calculan aquí para no inflar generarResumen.
  const serieGastos  = serieGastosMensual(gastos, anio, mes, 12);
  const gastosDelMes = gastosMes(gastos, anio, mes);
  const catSerie     = seriePorCategoria(gastosDelMes, 6);
  const segmentosCat = colorearSegmentos(catSerie);

  // ANL.1a (ADR 046 D3): las tres lecturas viajan en el mismo bundle que los
  // datos que interpretan. No agregan ni un barrido de `gastos`: leen lo que
  // esta función ya calculó, así que entran gratis a la memoización de PERF.2.
  // `catSerie` es la serie sin color: `colorearSegmentos` es capa de vista y la
  // lógica no la necesita para contar.
  const lecturas = {
    patrimonio: lecturaPatrimonio(resumen.activos, resumen.pasivos, resumen.patrimonioNeto),
    tendencia:  lecturaTendencia(serieGastos),
    categorias: lecturaCategorias(catSerie),
  };

  return { resumen, serieGastos, segmentosCat, lecturas };
}

// PE.7: `personales` entra a las claves de invalidación porque ahora alimenta
// el activo "Por cobrar" del patrimonio. Sin esta clave, prestar o cobrar no
// repintaría el patrimonio hasta que cambiara otra slice.
const _calcularDatosAnalisisMemo = memoizar(
  _calcularDatosAnalisis,
  ['gastos', 'compromisos', 'cuentas', 'metas', 'apartados', 'inversiones', 'personales'],
);

/**
 * PERF.3: cómputo diferido del grupo "Más detalle de tus gastos" (comparación
 * de categorías vs mes anterior + patrón de gasto semanal). Ambos hacen su
 * propio barrido de `gastos` y solo alimentan el grupo colapsable, así que se
 * calculan bajo demanda (al abrir el `<details>`) en vez de en cada render.
 * Las hormigas no entran aquí: ya vienen dentro de `generarResumen`.
 *
 * @param {import('../../core/state.js').Gasto[]} gastos
 * @param {number} anio
 * @param {number} mes
 * @param {string} fechaHoy  YYYY-MM-DD.
 */
function _calcularDetalleGastos(gastos, anio, mes, fechaHoy) {
  const comparacion   = calcularComparacionCategorias(gastos, anio, mes);
  const patronSemanal = detectarPatronGastoSemanal(gastos, fechaHoy);
  return { comparacion, patronSemanal };
}

const _calcularDetalleGastosMemo = memoizar(_calcularDetalleGastos, ['gastos']);

/**
 * PERF.7d: `calcularEstadoRenta()` (barrido de patrimonio bruto + gastos del
 * año) se llamaba sin memoizar en cada `renderAnalisis()`. Memoizarla a ciegas
 * contra `['gastos', 'cuentas', 'inversiones']` con la clave por defecto
 * (pasando `S` entero, que nunca cambia de referencia) serviría un resultado
 * obsoleto tras editar "Datos de renta" en Ajustes: `config/index.js` muta
 * `S.config.datosFiscales` directo, sin pasar por `EventBus`.
 *
 * Por qué es seguro memoizarla igual, sin tocar `config/index.js`: el handler
 * de "Datos de renta" siempre reemplaza `S.config.datosFiscales[anio]` con un
 * objeto NUEVO (`entrada = {}` en cada submit, o lo borra con `delete`), nunca
 * lo muta en el lugar. `extraerClave` lee ese valor directo, así que su
 * identidad cambia en cada guardado real y la comparación por referencia
 * detecta el cambio sola, sin depender de eventos. `cuentas`/`inversiones`/
 * `gastos` siguen cubiertos por el mecanismo de revisión existente (igual que
 * el resto de los memos de este archivo).
 */
// CFG.2a suma `ingresos` e `ingresosPuntuales`: desde que "Ingresos brutos" se
// deriva, registrar un ingreso cambia el resultado y la cache tiene que verlo.
const _calcularEstadoRentaMemo = memoizar(
  calcularEstadoRenta,
  ['gastos', 'cuentas', 'inversiones', 'ingresos', 'ingresosPuntuales'],
  (state, anio) => [
    state.cuentas, state.inversiones, state.gastos,
    state.ingresos, state.ingresosPuntuales,
    state.config?.datosFiscales?.[anio] ?? null, anio,
  ],
);

/**
 * PERF.7c: precalienta `_calcularDatosAnalisisMemo` en idle, con los mismos
 * argumentos que `renderAnalisis()`, para que la primera navegación a
 * Análisis encuentre la caché tibia en vez de pagar el cómputo frío. No toca
 * el DOM.
 */
export function precalentarAnalisis() {
  const fechaHoy = hoy();
  const anio = Number(fechaHoy.slice(0, 4));
  const mes  = Number(fechaHoy.slice(5, 7));
  _calcularDatosAnalisisMemo(
    S.gastos, S.compromisos, S.cuentas, S.metas, S.apartados, S.inversiones, S.personales, anio, mes,
  );
}

/**
 * Renderiza el análisis completo en `#panel-analisis`.
 * No-op si el contenedor no existe.
 */
export function renderAnalisis() {
  const el = document.getElementById('panel-analisis');
  if (!el) return;

  const fechaHoy = hoy();
  const anio = Number(fechaHoy.slice(0, 4));
  const mes  = Number(fechaHoy.slice(5, 7));

  // ANL.3: el chip de mes ya no vive en el header (anclaba visualmente los 5
  // bloques de la página a un mes, cuando solo "Por categoría" lo mide). Se
  // arma acá y se inserta en el rótulo del grupo "A dónde va tu dinero", que
  // es donde vive el bloque mensual.
  const mesTxt = _MESES[mes - 1] ? `${_MESES[mes - 1]} ${anio}` : '';

  // DIS.10 (C11): cada render reescribe `innerHTML`, así que los dos
  // `<details>` se recrean y lo que el usuario abrió se cerraba solo (y con
  // ello se descartaba el cómputo diferido de PERF.3). Se leen los dos estados
  // ANTES de reescribir y se reaplican después. `null` = no había nodo previo
  // (primer render): ahí manda la apertura automática por alerta.
  const previoDetalle  = el.querySelector('.analisis-grupo--detalle');
  const previoRenta    = el.querySelector('.analisis-grupo--renta');
  const abiertoDetalle = previoDetalle ? previoDetalle.open : null;
  const abiertoRenta   = previoRenta   ? previoRenta.open   : null;

  const { resumen, serieGastos, segmentosCat, lecturas } = _calcularDatosAnalisisMemo(
    S.gastos, S.compromisos, S.cuentas, S.metas, S.apartados, S.inversiones, S.personales, anio, mes,
  );

  // ANL.2d (ADR 038 D7): sin gastos registrados, sin activos y sin deudas no
  // hay nada que analizar: un único empty state reemplaza la pila de secciones
  // vacías. Con datos parciales (ej. cuentas con saldo pero sin gastos) el
  // panel se muestra completo y cada card conserva su vacío puntual. Los datos
  // fiscales manuales (Ajustes → Datos de renta) y el perfil fiscal también
  // cuentan como datos: el monitor de renta (K.3) tiene contenido real para
  // ese usuario y no debe esconderse tras un "sin datos".
  const df = S.config?.datosFiscales?.[anio];
  const pf = S.config?.perfilFiscal;
  const tieneSenalFiscal = (df != null && Object.keys(df).length > 0)
    || (pf != null && (pf.ivaResponsable === true || pf.obligadoContabilidad === true || pf.declaranteObligado === true));
  const sinDatos = S.gastos.length === 0
    && resumen.activos.total === 0
    && resumen.pasivos.cantidadDeudas === 0
    && !tieneSenalFiscal;
  if (sinDatos) {
    el.innerHTML = _renderEmptyAnalisis();
    return;
  }

  // PERF.3: el grupo "Más detalle de tus gastos" difiere su cuerpo al toggle.
  // Con gasto este mes, la comparación siempre tiene contenido, así que ese
  // chequeo barato basta para mostrar el grupo y dejar su cuerpo diferido
  // (`null`). Sin gasto este mes (caso menos común), calculamos el detalle ya
  // mismo para saber si el grupo tendría algo que mostrar (comparación con el
  // mes anterior o patrón de los últimos 90 días); si queda vacío, no se dibuja.
  let cuerpoDetalle  = null;
  let mostrarDetalle = true;
  if (resumen.gastoMes <= 0) {
    cuerpoDetalle  = _renderDetalleGastos(resumen.hormigas, anio, mes, fechaHoy);
    mostrarDetalle = cuerpoDetalle.trim() !== '';
  }

  // DIS.10 (C6, regla R18): tendencia y categorías emitían cada una su propio
  // vacío bajo el mismo rótulo, con dos redacciones distintas. Ahora las dos
  // devuelven '' sin datos y el grupo pone un solo mensaje, con la superficie
  // de card que tienen sus hermanos.
  const tendenciaHtml  = _renderTendencia(serieGastos, lecturas.tendencia);
  const categoriasHtml = _renderPorCategoria(resumen.gastoMes, segmentosCat, lecturas.categorias);
  const grupoCuerpo = `${tendenciaHtml}${categoriasHtml}`.trim() !== ''
    ? `${tendenciaHtml}${categoriasHtml}`
    : `<p class="analisis__empty">Aún no registras gastos este mes. Cuando lo hagas verás en qué se va tu dinero y cómo cambia mes a mes.</p>`;

  // Orden de lectura (F8): primero "cómo estoy" (salud + patrimonio), luego
  // "a dónde va mi dinero" (tendencia + categorías, agrupadas bajo un rótulo,
  // ANL.2c / ADR 038 D3). El detalle fino de gastos y lo fiscal quedan
  // colapsados para no enterrar lo importante.
  //
  // DIS.10 (C9, regla R29): el rótulo del grupo es un encabezado, no un
  // párrafo: agrupa dos bloques que sí lo tenían. El tamaño lo sigue dando la
  // clase, así que el cambio de etiqueta no se ve.
  el.innerHTML = `
    ${_renderScoreSalud(resumen)}
    ${_renderPatrimonio(resumen, lecturas.patrimonio)}
    <div class="analisis__group">
      <h2 class="analisis__group-label">A dónde va tu dinero${mesTxt ? ` · ${mesTxt}` : ''}</h2>
      ${grupoCuerpo}
    </div>
    ${mostrarDetalle ? _renderGrupoDetalle(cuerpoDetalle) : ''}
    ${_renderEstadoRenta(anio)}
  `;

  // PERF.3: si el cuerpo quedó diferido, calcularlo la primera vez que el
  // usuario abre el grupo. Cada render recrea el `<details>`, así que el
  // listener se asocia al nodo nuevo (el anterior se descarta con su elemento,
  // sin listeners duplicados). `data-cargado` evita recomputar en aperturas y
  // cierres sucesivos sobre el mismo nodo.
  const detalle = el.querySelector('.analisis-grupo--detalle');
  const cargarDetalle = () => {
    if (!detalle || detalle.dataset.cargado === '1') return;
    detalle.dataset.cargado = '1';
    const cuerpo = detalle.querySelector('.analisis-grupo__body');
    if (cuerpo) cuerpo.innerHTML = _renderDetalleGastos(resumen.hormigas, anio, mes, fechaHoy);
  };
  if (detalle && detalle.dataset.cargado !== '1') {
    detalle.addEventListener('toggle', () => {
      if (detalle.open) cargarDetalle();
    });
  }

  // DIS.10 (C11): se reaplica lo que el usuario tenía abierto o cerrado. El
  // detalle se llena en el acto porque asignar `open` no dispara `toggle` de
  // forma síncrona, y `data-cargado` sigue evitando el recálculo.
  const renta = el.querySelector('.analisis-grupo--renta');
  if (renta && abiertoRenta !== null) renta.open = abiertoRenta;
  if (detalle && abiertoDetalle === true) {
    detalle.open = true;
    cargarDetalle();
  }
}

// ── HELPER: GRUPO COLAPSABLE DE DETALLE ──────────────────────────

/**
 * Envuelve el detalle de gastos en un `<details>` colapsable. El cuerpo puede
 * venir diferido (PERF.3): `null` deja el cuerpo vacío para que `renderAnalisis`
 * lo calcule en el primer `toggle`; un string ya renderizado se inyecta de una
 * vez y marca el grupo como cargado (`data-cargado`), evitando el recálculo.
 *
 * ANL.2d (ADR 038 D5): el summary es una fila limpia (teja pizarra + título +
 * subtítulo con el contenido + chevron). DIS.10 (C2) completa lo que esa
 * decisión dejó pendiente: el cuerpo interno también habla el lenguaje v2.
 *
 * @param {string|null} cuerpo  HTML del cuerpo, o `null` si está diferido.
 * @returns {string}
 */
function _renderGrupoDetalle(cuerpo) {
  const diferido = cuerpo === null;
  return `
    <details class="analisis-grupo analisis-grupo--fila analisis-grupo--detalle"${diferido ? '' : ' data-cargado="1"'}>
      <summary class="analisis-grupo__summary">
        <span class="analisis-grupo__teja" aria-hidden="true">${icon('bar-chart')}</span>
        <span class="analisis-grupo__texto">
          <h2 class="analisis-grupo__title">Más detalle de tus gastos</h2>
          <span class="analisis-grupo__sub">Vs mes anterior · patrón semanal · hormigas</span>
        </span>
        ${_CHEVRON_GRUPO}
      </summary>
      <div class="analisis-grupo__body">${diferido ? '' : cuerpo}</div>
    </details>`;
}

/**
 * ANL.2d (ADR 038 D7): empty state único del panel. Reemplaza la pila de
 * secciones vacías cuando no hay nada que analizar. El CTA reutiliza la
 * acción global `nuevo-gasto` (el modal de gasto es global).
 *
 * @returns {string}
 */
function _renderEmptyAnalisis() {
  return `
    <div class="analisis-empty">
      <span class="analisis-empty__teja" aria-hidden="true">${icon('analisis')}</span>
      <p class="analisis-empty__title">Aún no hay suficientes datos</p>
      <p class="analisis-empty__desc">Registra gastos y agrega tus cuentas: tu score de salud, patrimonio y tendencias aparecen automáticamente.</p>
      <button type="button" class="btn btn-primary" data-action="nuevo-gasto">
        + Registrar un gasto
      </button>
    </div>`;
}

/**
 * Renderiza el cuerpo del grupo colapsable: comparación vs mes anterior +
 * patrón de gasto semanal (ambos diferidos, PERF.3) + hormigas (ya calculadas
 * en `generarResumen`). Devuelve un HTML que queda vacío al hacerle `.trim()`
 * si ninguna de las tres sub-cards tiene datos.
 *
 * @param {ReturnType<import('../gastos/logic.js').detectarHormigas>} hormigas
 * @param {number} anio
 * @param {number} mes
 * @param {string} fechaHoy  YYYY-MM-DD.
 * @returns {string}
 */
function _renderDetalleGastos(hormigas, anio, mes, fechaHoy) {
  const { comparacion, patronSemanal } = _calcularDetalleGastosMemo(S.gastos, anio, mes, fechaHoy);
  return `
    ${_renderComparacionCategorias(comparacion)}
    ${_renderPatronSemanal(patronSemanal)}
    ${_renderHormigas(hormigas)}
  `;
}

/**
 * ANL.1a (ADR 046 D3): imprime la lectura de una card. Una sola envoltura para
 * las tres, así la línea que interpreta se ve igual en todas y no hay que
 * decidir su tipografía card por card. Cadena vacía no dibuja nada: la lógica
 * calla cuando el dato no alcanza, y la card conserva su vacío propio.
 *
 * @param {string} texto
 * @returns {string}
 */
function _renderLectura(texto) {
  return texto ? `<p class="analisis-lectura">${_esc(texto)}</p>` : '';
}

// ── SECCIONES INTERNAS ───────────────────────────────────────────

/**
 * Recomendación fiscal permanente (K.2). Visible cuando al menos un flag de
 * perfilFiscal está en true. Orienta al usuario a consultar con un contador.
 *
 * CFG.2b: `declaranteObligado` salió de esta lista. Ese dato ya no es "una
 * situación más que puede requerir atención": es el override que decide la
 * conclusión del veredicto, y decirlo dos veces en la misma card sobraba.
 */
function _renderRecomendacionFiscal() {
  const pf = (typeof S.config?.perfilFiscal === 'object' && S.config.perfilFiscal !== null)
    ? S.config.perfilFiscal : null;
  if (!pf) return '';

  const motivos = [];
  if (pf.ivaResponsable)       motivos.push('responsable del IVA');
  if (pf.obligadoContabilidad) motivos.push('obligado a llevar contabilidad');

  if (motivos.length === 0) return '';

  const lista = motivos.length === 1
    ? motivos[0]
    : `${motivos.slice(0, -1).join(', ')} y ${motivos[motivos.length - 1]}`;

  // DIS.10 (C10, regla R24): sin `role="status"`. Es un aviso estable, no la
  // respuesta a una acción, y `renderAnalisis()` lo reescribe en cada
  // `state:change`: el lector de pantalla lo volvía a anunciar al registrar
  // un gasto sin salir de la sección. DIS.10 (C8): el ícono sale del sprite.
  return `
    <div class="nudge nudge-info">
      <span class="nudge__icon" aria-hidden="true">${icon('info')}</span>
      <div class="nudge__body">
        <p class="nudge__title">Tu perfil fiscal puede requerir atención</p>
        <p class="nudge__desc">Indicaste que eres ${_esc(lista)}. Estas situaciones
        pueden generar obligaciones de declaración o pago aunque no superes los topes
        de ingresos. Consulta con un contador. <a href="#config" class="link">Editar perfil fiscal</a>.</p>
      </div>
    </div>`;
}

/**
 * Card "Estado de tu renta" (K.3). Muestra los 5 criterios de obligación de
 * declarar con su tope (calculado en vivo desde la UVT del año vigente) y el
 * valor actual cuando Finko puede medirlo. Insertada después del Score.
 *
 * Decisión: criterios sin datos en Finko se muestran igualmente (tope visible,
 * barra gris) para que el usuario conozca el límite y sepa dónde consultar el
 * dato real.
 */
function _renderEstadoRenta(anio) {
  const estado = _calcularEstadoRentaMemo(S, anio);
  const pf     = (typeof S.config?.perfilFiscal === 'object' && S.config.perfilFiscal !== null)
    ? S.config.perfilFiscal : null;
  const nudges = detectarNudgesRenta(estado);
  const vig    = estadoVigenciaLegal();

  // CFG.2b (ADR 050 D2): la conclusión sobre declarar encabeza la card. El
  // usuario no tiene que interpretar cinco barras para saber dónde está.
  const veredicto = inferirEstadoDeclarante(estado, pf, S.perfil?.situacionLaboral ?? '');

  // DIS.10 (C7): los criterios que Finko puede medir conservan su ficha; los
  // que dependen de un dato manual pasan a una lista compacta con su tope al
  // lado. El objetivo declarado se conserva (el límite sigue visible y el
  // enlace a Ajustes sigue ahí): lo que cambia es que dejan de competir cinco
  // fichas iguales cuando solo dos o tres tienen algo que decir.
  const conDato  = estado.criterios.filter(c => c.estado !== 'sin-datos');
  const sinDato  = estado.criterios.filter(c => c.estado === 'sin-datos');
  const filas    = conDato.map(_renderCriterioRenta).join('');
  const tieneAlerta = nudges.some(n => n.nivel === 'nudge-high' || n.nivel === 'nudge-medium');
  const bannerNudges = tieneAlerta
    ? nudges.filter(n => n.nivel !== 'nudge-info').map(_renderNudgeRenta).join('')
    : '';

  // Aviso de vigencia (P1): si empezó un año nuevo y aún no se cargaron los
  // valores oficiales, los topes salen de la UVT del año anterior. Se avisa.
  const avisoVigencia = vig.desactualizado
    ? `
      <div class="nudge nudge-medium">
        <span class="nudge__icon" aria-hidden="true">${icon('agenda')}</span>
        <div class="nudge__body">
          <p class="nudge__title">Topes calculados con la UVT de ${vig.anioVigente}</p>
          <p class="nudge__desc">El año en curso es ${vig.anioActual}, pero Finko todavía usa la UVT de ${vig.anioVigente}: los valores oficiales de ${vig.anioActual} aún no se han cargado. Toma estos topes como referencia provisional y confírmalos con un contador.</p>
        </div>
      </div>`
    : '';

  // El grupo se abre solo si hay algo que el usuario debería ver ya: una alerta
  // de tope, un veredicto accionable o una recomendación por su perfil fiscal.
  const recomFiscal = _renderRecomendacionFiscal();
  const abierto     = tieneAlerta || recomFiscal !== ''
    || veredicto?.estado === 'probable' || veredicto?.estado === 'posible';

  // ANL.2d (ADR 038 D5): badge contador ámbar con los criterios en alerta
  // (cerca + supera), para que lo colapsado no esconda lo urgente.
  const criteriosAlerta = estado.criterios
    .filter(c => c.estado === 'cerca' || c.estado === 'supera').length;
  const badgeAlerta = criteriosAlerta > 0
    ? `<span class="analisis-grupo__badge">${criteriosAlerta}<span class="sr-only"> ${criteriosAlerta === 1 ? 'criterio' : 'criterios'} cerca o sobre un tope</span></span>`
    : '';

  return `
    <details class="analisis-grupo analisis-grupo--fila analisis-grupo--renta"${abierto ? ' open' : ''}>
      <summary class="analisis-grupo__summary">
        <span class="analisis-grupo__teja" aria-hidden="true">${icon('percent')}</span>
        <span class="analisis-grupo__texto">
          <h2 class="analisis-grupo__title">Estado de tu renta (${anio})</h2>
          <span class="analisis-grupo__sub">${estado.criterios.length} criterios DIAN · topes por UVT</span>
        </span>
        ${badgeAlerta}
        ${_CHEVRON_GRUPO}
      </summary>
      <div class="analisis-grupo__body">
        ${_renderVeredictoRenta(veredicto)}
        ${recomFiscal}
        <p class="analisis__hint">
          UVT vigente: ${f(estado.uvt)}. Topes calculados a partir de tus datos en Finko.
          Confirma con un contador antes de declarar.
        </p>
        ${avisoVigencia}
        ${bannerNudges}
        ${filas !== '' ? `<div class="renta-criterios">${filas}</div>` : ''}
        ${_renderCriteriosSinDato(sinDato)}
      </div>
    </details>`;
}

/**
 * DIS.10 (C7): lista compacta de los criterios que Finko no puede medir por sí
 * mismo (dependen de un dato que el usuario registra a mano en Ajustes). El
 * tope sigue visible, que es el objetivo de la decisión original, pero en una
 * línea por criterio en vez de una ficha con valor "N/D", barra al 0% y un tip
 * que repetía la misma instrucción con otra redacción.
 *
 * @param {Array<{etiqueta:string, tope:number}>} criterios
 * @returns {string} HTML, o '' si no hay criterios sin dato.
 */
function _renderCriteriosSinDato(criterios) {
  if (criterios.length === 0) return '';

  const filas = criterios.map(c => `
    <li class="renta-sindatos__row">
      <span class="renta-sindatos__label">${_esc(c.etiqueta)}</span>
      <span class="renta-sindatos__tope">tope ${f(c.tope)}</span>
    </li>`).join('');

  return `
    <div class="renta-sindatos">
      <p class="renta-sindatos__title">
        ${criterios.length} ${criterios.length === 1 ? 'criterio que Finko no puede medir' : 'criterios que Finko no puede medir'}
      </p>
      <ul class="renta-sindatos__list">${filas}</ul>
      <p class="analisis__hint">
        Regístralos en <a href="#config" class="link">Ajustes, Datos de renta</a> y entran al monitor con su tope.
      </p>
    </div>`;
}

function _renderCriterioRenta(c) {
  const ESTADOS = {
    'sin-datos': { banda: '',          badge: 'Sin datos en Finko', valorTxt: 'N/D' },
    'ok':        { banda: 'excelente', badge: 'Dentro del límite',   valorTxt: f(c.valor) },
    'cerca':     { banda: 'ajustada',  badge: 'Cerca del tope',      valorTxt: f(c.valor) },
    'supera':    { banda: 'critica',   badge: 'Supera el tope',      valorTxt: f(c.valor) },
  };
  const { banda, badge, valorTxt } = ESTADOS[c.estado] ?? ESTADOS['sin-datos'];
  const pctClamp = Math.min(100, Math.max(0, c.porcentaje));
  const barra = c.estado === 'sin-datos'
    ? `<div class="progress score-factor__bar"><div class="progress-bar" style="width:0%"></div></div>`
    : `<div class="progress score-factor__bar"
            role="progressbar"
            aria-valuenow="${Math.round(c.porcentaje)}"
            aria-valuemin="0" aria-valuemax="100"
            aria-label="${_esc(c.etiqueta)}: ${Math.round(c.porcentaje)} por ciento del tope">
        <div class="progress-bar progress-bar--score-${banda}"
             style="width:${pctClamp}%"></div>
      </div>`;

  return `
    <article class="renta-criterio renta-criterio--${c.estado}">
      <div class="renta-criterio__head">
        <p class="renta-criterio__label">${_esc(c.etiqueta)}</p>
        <span class="renta-criterio__badge renta-criterio__badge--${c.estado}">${_esc(badge)}</span>
      </div>
      <p class="renta-criterio__valor">${valorTxt}<span class="renta-criterio__tope"> / ${f(c.tope)}</span></p>
      ${barra}
      <p class="renta-criterio__tip">${_esc(c.tip)}</p>
    </article>`;
}

/**
 * Veredicto de declarante (CFG.2b, ADR 050 D2). Reutiliza el componente
 * `nudge` en vez de estrenar uno: es el mismo objeto visual (ícono del sprite,
 * título, cuerpo) y el nivel ya viene calculado por la lógica.
 *
 * El encuadre por situación laboral va en un segundo párrafo, no mezclado con
 * la conclusión: la conclusión responde "¿me toca?" y el encuadre "¿y eso qué
 * significa en mi caso?".
 *
 * @param {ReturnType<import('./logic.js').inferirEstadoDeclarante>} v
 * @returns {string} HTML, o '' si no hay veredicto.
 */
function _renderVeredictoRenta(v) {
  if (!v) return '';
  return `
    <div class="nudge ${v.nivel} nudge--veredicto">
      <span class="nudge__icon" aria-hidden="true">${icon(v.icono)}</span>
      <div class="nudge__body">
        <p class="nudge__title">${_esc(v.titulo)}</p>
        <p class="nudge__desc">${_esc(v.mensaje)}</p>
        <p class="nudge__desc">${_esc(v.encuadre)}</p>
      </div>
    </div>`;
}

function _renderNudgeRenta(n) {
  // DIS.10 (C8 + C10): el ícono viene del sprite (`detectarNudgesRenta`
  // devuelve su nombre) y el bloque deja de ser región viva: es un aviso
  // estable que se repinta en cada `state:change`, no una respuesta.
  return `
    <div class="nudge ${n.nivel}">
      <span class="nudge__icon" aria-hidden="true">${icon(n.icono)}</span>
      <div class="nudge__body">
        <p class="nudge__title">${_esc(n.etiqueta)}</p>
        <p class="nudge__desc">${_esc(n.mensaje)}</p>
      </div>
    </div>`;
}

/**
 * Metadatos de los 4 factores del score (J.1c). El orden es el de lectura
 * de la grilla 2×2 y también el desempate del "factor más débil" (ANL.2a):
 * a igual valor gana el primero de la lista.
 */
const _FACTORES_SCORE = [
  { key: 'deuda',    label: 'Deuda',    icono: 'deudas',   frase: 'nivel de deuda' },
  { key: 'liquidez', label: 'Liquidez', icono: 'saldo',    frase: 'liquidez' },
  { key: 'control',  label: 'Control',  icono: 'analisis', frase: 'control de gastos' },
  { key: 'ahorro',   label: 'Ahorro',   icono: 'ahorro',   frase: 'fondo de ahorro' },
];

/**
 * Frase humana del hero (ANL.2a, ADR 038 D1): reemplaza el desglose técnico
 * "Deuda 80/100 • ..." (redundante con las barras visibles) por una línea
 * derivada de los datos reales. Nombra el factor más débil como siguiente
 * paso; en banda excelente, refuerzo sin señalar factor. Las frases fijas
 * por banda del mockup se descartaron a propósito (datos demo: podían ser
 * falsas para el usuario concreto, ver ADR 038 "Alternativas rechazadas").
 *
 * @param {string} banda
 * @param {{deuda:number, liquidez:number, control:number, ahorro:number}} factors
 * @returns {string}
 */
function _fraseScore(banda, factors) {
  if (banda === 'excelente') return 'Vas muy bien: tu base financiera es sólida. Mantén el ritmo.';
  const peor = _FACTORES_SCORE.reduce(
    (min, m) => (factors[m.key] < factors[min.key] ? m : min),
    _FACTORES_SCORE[0],
  );
  if (banda === 'buena')    return `Base saludable. Tu ${peor.frase} es lo que más puede mejorar.`;
  if (banda === 'ajustada') return `Atención a tu ${peor.frase}: es lo que más está frenando tu score.`;
  return `Tu base financiera está expuesta. Prioriza mejorar tu ${peor.frase}.`;
}

function _renderScoreSalud(resumen) {
  // Lee el estado del fondo para el 4to factor (J.1c).
  const fondo      = S.ahorro?.fondoEmergencia;
  const ahorroData = {
    activo:     fondo?.activo     === true,
    completado: fondo?.completado === true,
  };

  const score = calcularScoreSalud(resumen, ahorroData);
  const banda = clasificarScore(score.score);
  const ETIQUETAS = {
    excelente: { iconoBanda: 'trophy',       label: 'Excelente' },
    buena:     { iconoBanda: 'check-circle', label: 'Buena' },
    ajustada:  { iconoBanda: 'alert',        label: 'Ajustada' },
    critica:   { iconoBanda: 'alert',        label: 'Crítica' },
  };
  const { iconoBanda, label } = ETIQUETAS[banda];

  const nudgeFondo = !ahorroData.activo
    ? `<p class="analisis__hint">
        Sin fondo de emergencia: tu base financiera esta expuesta.
        <a href="#fondo" class="link">Activarlo suma hasta 25 pts al score.</a>
      </p>`
    : '';

  // DIS.10 (C3): la frase de `_fraseScore()` sale de la columna del anillo y
  // baja a ancho completo, justo encima de la grilla de factores. Medido: la
  // columna daba 162,7px de medida y cuatro renglones de unos veinte
  // caracteres para la única línea del panel que interpreta un número. El
  // anillo no se toca (ADR 038 D1 midió su contraste contra el wash).
  //
  // ANL.2a (ADR 038 D1): las mini-barras toman el color de la banda (dentro
  // del hero el dato semántico manda; las barras por dominio de IV.2b siguen
  // vigentes fuera de él). El número acompaña siempre a la barra (SC 1.4.11).
  const factoresHtml = _FACTORES_SCORE.map(m => `
    <div class="score-hero__factor">
      <div class="score-hero__factor-head">
        ${icon(m.icono, 'icon score-hero__factor-icon')}
        <span class="score-hero__factor-label">${m.label}</span>
        <span class="score-hero__factor-valor">${score.factors[m.key]}</span>
      </div>
      <div class="progress score-hero__factor-bar"
           role="progressbar"
           aria-valuenow="${score.factors[m.key]}"
           aria-valuemin="0" aria-valuemax="100"
           aria-label="${m.label}: ${score.factors[m.key]} de 100">
        <div class="progress-bar" style="width:${score.factors[m.key]}%"></div>
      </div>
    </div>`).join('');

  return `
    <section class="analisis__section" aria-labelledby="analisis-score-title">
      <div class="score-hero score-hero--${banda}">
        <div class="score-hero__top">
          <div class="score-hero__ring">
            ${progressRing(score.score, { size: 132, strokeWidth: 11, conLabel: false, ariaLabel: `Score de salud: ${score.score} de 100` })}
            <div class="score-hero__ring-label" aria-hidden="true">
              <span class="score-hero__num">${score.score}</span>
              <span class="score-hero__de">de 100</span>
            </div>
          </div>
          <div class="score-hero__info">
            <h2 class="score-hero__kicker" id="analisis-score-title">Salud de tu dinero</h2>
            <p class="score-hero__sub">Score de salud: 0 a 100</p>
            <span class="score-hero__pill">
              ${icon(iconoBanda, 'icon score-hero__pill-icon')}
              ${label}
            </span>
          </div>
        </div>
        <p class="score-hero__explicacion">${_esc(_fraseScore(banda, score.factors))}</p>
        <div class="score-hero__factors">${factoresHtml}</div>
      </div>
      ${nudgeFondo}
    </section>`;
}

/**
 * Buckets de la barra de composición de activos (ANL.2b, ADR 038 D2).
 * Cada bucket > 0 pinta un segmento con el color de su dominio (ADR 031).
 */
const _BUCKETS_ACTIVOS = [
  { key: 'totalCuentas',     label: 'Cuentas',    mod: 'cuentas' },
  { key: 'totalMetas',       label: 'Metas',      mod: 'metas' },
  { key: 'totalApartados',   label: 'Reservas',   mod: 'apartados' },
  { key: 'totalInversiones', label: 'Inversión',  mod: 'inversion' },
  // PE.7: capital prestado que ya salió de una cuenta y está por volver.
  { key: 'totalPorCobrar',   label: 'Por cobrar', mod: 'porcobrar' },
];

function _renderPatrimonio({ activos, pasivos, patrimonioNeto }, lectura = '') {
  const esPositivo = patrimonioNeto >= 0;
  const valorClase = esPositivo ? 'patri-card__valor--positivo' : 'patri-card__valor--negativo';
  const signo      = esPositivo ? '' : '−';
  const valorAbs   = Math.abs(patrimonioNeto);

  // Ojo de privacidad (D2 + IN.2): mismo flag único de toda la app, máscara
  // larga para el neto y corta para las dos columnas (criterio ADR 034 D3).
  const oculto    = S.config?.ocultarSaldo === true;
  const netoTxt   = oculto ? SALDO_MASCARA : `${signo}${f(valorAbs)}`;
  const activosTxt = oculto ? SALDO_MASCARA_CUENTA : f(activos.total);
  const pasivosTxt = oculto ? SALDO_MASCARA_CUENTA : f(pasivos.total);

  // Composición de activos: deriva del desglose que calcularActivos ya
  // expone, sin cálculo nuevo. La barra es decorativa (aria-hidden); los
  // porcentajes en texto portan la información (SC 1.4.11) y no revelan
  // montos, así que no se enmascaran (igual que la barra del hero de agenda).
  // DIS.10 (C5): el reparto es por resto mayor, así que la fila de porcentajes
  // suma 100 (con un `Math.round` por bucket daba 99 o 101).
  const bucketsConValor = activos.total > 0
    ? _BUCKETS_ACTIVOS
        .map(b => ({ ...b, valor: activos[b.key] }))
        .filter(b => b.valor > 0)
    : [];
  const pctBuckets = repartirPorcentajes(bucketsConValor.map(b => b.valor));
  const buckets    = bucketsConValor.map((b, i) => ({ ...b, pct: pctBuckets[i] }));
  const compBarra = buckets.length > 0
    ? `<div class="patri-card__comp" aria-hidden="true">
        ${buckets.map(b => `<div class="patri-card__seg patri-card__seg--${b.mod}" style="width:${b.pct}%"></div>`).join('')}
      </div>`
    : '';
  const activosDesc = buckets.length > 0
    ? buckets.map(b => `${b.label} ${b.pct}%`).join(' · ')
    : 'Sin activos registrados';

  // CTA si hay deudas sin saldo registrado. ANL.3 (Z3): la etiqueta visible
  // pasa de "Compromisos" (nombre interno) a "Deudas" (nombre de producto,
  // el que ya usa el nav); el destino sigue siendo #compromisos.
  const ctaDeudas = pasivos.deudasSinSaldo > 0
    ? `<p class="analisis__hint">
        Tienes <strong>${pasivos.deudasSinSaldo} deuda${pasivos.deudasSinSaldo > 1 ? 's' : ''}</strong>
        sin saldo registrado. Complétalas en
        <a href="#compromisos" class="link">Deudas</a>
        para calcular tu patrimonio real.
      </p>`
    : '';

  // ANL.3 (Z1 + Z2): patrimonio es una foto de hoy, y "Por cobrar" tiene una
  // salvedad que la pantalla no decía: los préstamos sin cuenta vinculada no
  // suman porque su dinero nunca salió de una cuenta (ver calcularActivos).
  const ctaPrestamosSinCuenta = activos.prestamosSinCuenta > 0
    ? `<p class="analisis__hint">
        Tienes <strong>${activos.prestamosSinCuenta} préstamo${activos.prestamosSinCuenta > 1 ? 's' : ''}</strong>
        que no salió de ninguna cuenta, así que no suma a tu patrimonio.
        <a href="#personales" class="link">Ver en Me deben</a>.
      </p>`
    : '';

  return `
    <section class="analisis__section" aria-labelledby="analisis-patrimonio-title">
      <div class="patri-card">
        <button class="patri-card__ojo" type="button" id="analisis-saldo-ojo"
                data-action="analisis-saldo-visibilidad"
                aria-pressed="${oculto}"
                aria-label="${oculto ? 'Mostrar tus saldos' : 'Ocultar tus saldos'}">
          <svg class="icon" aria-hidden="true"><use href="#i-eye${oculto ? '-off' : ''}"/></svg>
        </button>
        <div class="patri-card__head">
          <span class="patri-card__teja" aria-hidden="true">
            ${icon('saldo', 'icon patri-card__teja-icon')}
          </span>
          <h2 class="patri-card__kicker" id="analisis-patrimonio-title">Lo que realmente tienes</h2>
        </div>
        <p class="patri-card__valor ${valorClase}">${netoTxt}</p>
        <p class="patri-card__hint">Patrimonio neto: activos menos pasivos, hoy</p>
        ${_renderLectura(lectura)}
        ${compBarra}
        <div class="patri-card__grid">
          <article class="patri-card__col">
            <p class="patri-card__col-label">Lo que tienes <span class="patri-card__col-tech">Activos</span></p>
            <p class="patri-card__col-valor">${activosTxt}</p>
            <p class="patri-card__col-desc">${activosDesc}</p>
          </article>
          <article class="patri-card__col">
            <p class="patri-card__col-label">Lo que debes <span class="patri-card__col-tech">Pasivos</span></p>
            <p class="patri-card__col-valor ${pasivos.total > 0 ? 'patri-card__col-valor--pasivo' : ''}">${pasivosTxt}</p>
            <p class="patri-card__col-desc">
              ${pasivos.cantidadDeudas === 0
                ? 'Sin deudas registradas'
                : `${pasivos.cantidadDeudas} deuda${pasivos.cantidadDeudas > 1 ? 's' : ''} · ${pasivos.deudasSinSaldo > 0 ? `${pasivos.deudasSinSaldo} sin saldo` : 'todas con saldo'}`
              }
            </p>
          </article>
        </div>
      </div>
      ${ctaDeudas}
      ${ctaPrestamosSinCuenta}
    </section>`;
}

/**
 * Card "Por categoría" (ANL.2c, ADR 038 D3): dona con el top al centro +
 * filas rankeadas construidas desde LOS MISMOS segmentos coloreados de la
 * dona (una sola lista cuenta la historia; antes leyenda + barras eran dos
 * representaciones paralelas de lo mismo). La paleta unificada dona↔filas
 * se conserva por construcción: cada fila lleva el color de su segmento.
 *
 * @param {number} gastoMes Total del mes (ancla del encabezado).
 * @param {ReturnType<import('../../infra/svg.js').colorearSegmentos>} segmentos
 */
function _renderPorCategoria(gastoMes, segmentos = [], lectura = '') {
  // DIS.10 (C6): sin datos no emite su propio vacío; el rótulo del grupo pone
  // un solo mensaje para tendencia y categorías juntas.
  if (segmentos.length === 0) return '';

  // seriePorCategoria ordena desc y agrega "Otros" al final: el primer
  // segmento siempre es la categoría real con más gasto.
  const top = segmentos[0];

  const filas = segmentos.map(s => `
    <li class="catg-card__row">
      <span class="catg-card__dot" style="background:${s.color}" aria-hidden="true"></span>
      <span class="catg-card__nombre">${_esc(s.label)}</span>
      <span class="catg-card__pct">${s.pct}%</span>
      <span class="catg-card__monto">${f(s.valor)}</span>
    </li>`).join('');

  return `
    <section class="analisis__section" aria-labelledby="analisis-cat-title">
      <div class="catg-card">
        <div class="catg-card__head">
          <div class="catg-card__head-texto">
            <h3 class="catg-card__title" id="analisis-cat-title">En qué gastas</h3>
            <p class="catg-card__sub">Por categoría, este mes</p>
          </div>
          <span class="catg-card__total">${f(gastoMes)}</span>
        </div>
        ${_renderLectura(lectura)}
        <div class="catg-card__layout">
          <div class="catg-card__donut">
            ${donut(segmentos, { size: 120, strokeWidth: 18, ariaLabel: 'Distribución de gastos por categoría' })}
            <div class="catg-card__centro" aria-hidden="true">
              <span class="catg-card__centro-label">Top</span>
              <span class="catg-card__centro-cat">${_esc(top.label)}</span>
              <span class="catg-card__centro-pct">${top.pct}%</span>
            </div>
          </div>
          <ul class="catg-card__list" aria-label="Desglose de gastos por categoría">${filas}</ul>
        </div>
      </div>
    </section>`;
}

function _renderTendencia(serie, lectura = '') {
  if (!serie || serie.length === 0) return '';

  const valores = serie.map(p => p.total);
  const hayDatos = valores.some(v => v > 0);

  // DIS.10 (C6): igual que categorías, el vacío lo pone el grupo una sola vez.
  if (!hayDatos) return '';

  const max     = Math.max(...valores);
  const min     = Math.min(...valores);
  const actual  = valores[valores.length - 1];
  const anterior = valores.length >= 2 ? valores[valores.length - 2] : actual;
  const delta   = actual - anterior;
  // Sin gastos el mes anterior no hay base para un porcentaje: mostrar
  // "↑ 0%" en rojo confunde. Mismo criterio que el resumen semanal (F8).
  const sinBase  = anterior === 0 && delta > 0;
  const deltaPct = anterior > 0 ? Math.round((delta / anterior) * 100) : 0;

  // ANL.2c (ADR 038 D4, re-declara ADR 019/IV.3): la variación vive en un
  // chip; verde SOLO cuando el gasto baja, neutro si sube (nunca rojo),
  // neutro sin ícono cuando no hay base o no cambió. Ícono + texto siempre
  // que hay dirección (SC 1.4.1).
  const bajo      = !sinBase && delta < 0;
  const chipClase = bajo ? ' tend-card__chip--baja' : '';
  const chipIcono = (sinBase || delta === 0)
    ? ''
    : icon(delta < 0 ? 'trending-down' : 'trending-up', 'icon tend-card__chip-icon');
  const chipTexto = sinBase
    ? 'Sin gastos el mes anterior para comparar'
    : delta === 0
      ? 'Igual que el mes pasado'
      : `${delta > 0 ? '↑' : '↓'} ${Math.abs(deltaPct)}% vs mes anterior`;

  // La serie es contexto, no dato semántico: pizarra de sección (ADR 038 D3),
  // variante -text para pasar el umbral no textual en tema claro.
  // DIS.10 (C4, regla R27): 360 y no 600. El SVG rinde ~323px de ancho, así
  // que un viewBox de 600 lo comprimía a la mitad (anisotropía 1,86:1) y el
  // trazo salía más delgado en los tramos planos que en las subidas. Con 360
  // el residuo queda en 1,12:1 y el `non-scaling-stroke` de `sparkline()`
  // cubre el resto.
  const svg = sparkline(valores, {
    width: 360, height: 80, color: 'var(--fk-dom-analisis-text, #8f9bb3)',
    padding: 6, area: true,
    ariaLabel: `Gastos mensuales últimos ${serie.length} meses, máximo ${f(max)}, actual ${f(actual)}`,
  });

  const ejeX = serie.map((p, i) => {
    // Mostrar solo cada 2 meses para no saturar en mobile.
    const visible = i === 0 || i === serie.length - 1 || i % 2 === 0;
    return `<span class="chart-axis__label${visible ? '' : ' chart-axis__label--hidden'}">${p.label}</span>`;
  }).join('');

  const stats = [
    { label: 'Este mes', valor: f(actual) },
    { label: 'Máximo',   valor: f(max) },
    { label: 'Mínimo',   valor: f(min) },
  ].map(s => `
    <div class="tend-card__stat">
      <p class="tend-card__stat-label">${s.label}</p>
      <p class="tend-card__stat-valor">${s.valor}</p>
    </div>`).join('');

  return `
    <section class="analisis__section" aria-labelledby="analisis-tendencia-title">
      <div class="tend-card">
        <div class="tend-card__head">
          <div class="tend-card__head-texto">
            <h3 class="tend-card__title" id="analisis-tendencia-title">Cómo cambia tu gasto</h3>
            <p class="tend-card__sub">Tendencia, últimos ${serie.length} meses</p>
          </div>
          <span class="tend-card__chip${chipClase}">${chipIcono}<span>${chipTexto}</span></span>
        </div>

        ${_renderLectura(lectura)}

        <div class="chart-sparkline-wrap">
          <div class="chart-sparkline__svg" aria-hidden="false">${svg}</div>
          <div class="chart-axis" aria-hidden="true">${ejeX}</div>
        </div>

        <div class="tend-card__stats">${stats}</div>
      </div>
    </section>`;
}

function _renderHormigas(hormigas) {
  if (hormigas.length === 0) return '';

  const items = hormigas.map(h => `
    <li class="hormiga-item">
      <p class="hormiga-item__cat">${icon('alert')}${_esc(h.categoria)}</p>
      <p class="hormiga-item__detalle">
        ${h.cantidad} compras · promedio ${f(h.promedio)} c/u · total <strong>${f(h.total)}</strong>
      </p>
    </li>`).join('');

  return `
    <section class="analisis__section" aria-labelledby="analisis-hormiga-title">
      <h3 class="analisis__section-title" id="analisis-hormiga-title">${icon('alert')}Alertas de gasto hormiga</h3>
      <p class="analisis__desc">Categorías con muchas compras pequeñas que suman montos significativos este mes.</p>
      <ul class="hormiga-list" aria-label="Alertas de gasto hormiga">${items}</ul>
    </section>`;
}

// ── COMPARACIÓN DE CATEGORÍAS (G.2) ──────────────────────────────

/**
 * Renderiza la card de comparación de gastos vs el mes anterior.
 * Devuelve '' si no hay datos suficientes para comparar.
 *
 * @param {ReturnType<import('./logic.js').calcularComparacionCategorias>} comparacion
 */
function _renderComparacionCategorias(comparacion) {
  if (!comparacion || comparacion.categorias.length === 0) return '';

  const { highlights, categorias, totalActual, totalAnterior } = comparacion;

  const deltaTotal = totalActual - totalAnterior;
  const deltaLabel = deltaTotal >= 0
    ? `+${f(deltaTotal)} vs mes anterior`
    : `${f(deltaTotal)} vs mes anterior`;
  const deltaClase = deltaTotal >= 0 ? 'comparacion__delta--sube' : 'comparacion__delta--baja';

  // DIS.10 (C8): los dos glifos del sistema salen del sprite.
  const hilightHtml = highlights.map(h => `
    <li class="comparacion__highlight comparacion__highlight--${h.tipo}">
      ${icon(h.tipo === 'mejora' ? 'check-circle' : 'alert')}<span>${_esc(h.mensaje)}</span>
    </li>`).join('');

  // DIS.10 (C2b, regla R20): la tabla de cuatro columnas de dinero a 12px pasa
  // a la misma anatomía de fila que ya usa la card de categorías: nombre,
  // monto del mes en negrita y tabular, y la variación como chip con su ícono
  // de tendencia. El monto del mes anterior sale de la fila: el delta total
  // del bloque ya lo resume. Verde solo al bajar (ADR 019 / IV.3).
  const filasHtml = categorias.map(c => {
    const baja  = c.direccion === 'bajo' || c.direccion === 'desaparecio';
    const sube  = c.direccion === 'subio' || c.direccion === 'nueva';
    const iconoDelta = baja ? icon('trending-down') : sube ? icon('trending-up') : '';
    const dirTexto   = baja ? 'bajó' : sube ? 'subió' : 'sin cambio';
    return `
      <li class="comparacion__fila">
        <span class="comparacion__fila-cat">${_esc(c.cat)}</span>
        <span class="comparacion__fila-monto">${f(c.actual)}</span>
        <span class="comparacion__fila-delta${baja ? ' comparacion__fila-delta--baja' : ''}">
          ${iconoDelta}<span class="sr-only">${dirTexto} </span>${Math.abs(c.deltaPct)}%
        </span>
      </li>`;
  }).join('');

  return `
    <section class="analisis__section" aria-labelledby="analisis-comparacion-title">
      <h3 class="analisis__section-title" id="analisis-comparacion-title">${icon('bar-chart')}Vs mes anterior</h3>
      <p class="analisis__desc">Comparación de gastos por categoría respecto al mes pasado.</p>
      ${_renderLectura(lecturaComparacion(comparacion))}
      <p class="comparacion__delta ${deltaClase}">${deltaLabel}</p>
      ${highlights.length > 0 ? `<ul class="comparacion__highlights" aria-label="Cambios destacados">${hilightHtml}</ul>` : ''}
      <ul class="comparacion__lista" aria-label="Gastos por categoría">${filasHtml}</ul>
    </section>`;
}

// ── PATRÓN DE GASTO SEMANAL (G.2) ────────────────────────────────

/**
 * Renderiza la card de patrón de gasto semanal.
 * Devuelve '' si no hay datos suficientes o no hay días destacados.
 *
 * @param {ReturnType<import('./logic.js').detectarPatronGastoSemanal>} patron
 */
function _renderPatronSemanal(patron) {
  if (!patron || patron.diasDestacados.length === 0) return '';

  const { diasDestacados, promedioGlobalDia, gastosAnalizados } = patron;

  const itemsHtml = diasDestacados.map(d => {
    const nivel = d.severidad === 'alta' ? 'patron__item--alta' : 'patron__item--media';
    return `
      <li class="patron__item ${nivel}">
        <span class="patron__dia">${_esc(d.nombre)}</span>
        <span class="patron__factor">${d.factor}× el promedio</span>
        <span class="patron__etiqueta">${_esc(d.etiqueta)}</span>
      </li>`;
  }).join('');

  return `
    <section class="analisis__section" aria-labelledby="analisis-patron-title">
      <h3 class="analisis__section-title" id="analisis-patron-title">${icon('agenda')}Patrón de gasto semanal</h3>
      <p class="analisis__desc">Últimos 90 días, ${gastosAnalizados} transacciones. Días donde gastas consistentemente más que el promedio.</p>
      <ul class="patron__lista" aria-label="Días con mayor gasto">${itemsHtml}</ul>
      <p class="analisis__hint">Promedio por día activo: <strong>${f(promedioGlobalDia)}</strong></p>
    </section>`;
}


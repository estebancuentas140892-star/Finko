/**
 * ahorro/view.js - HTML del dominio Ahorro (J.1).
 * Puede leer S. No puede mutarlo. Sin lógica de negocio.
 */

import { S } from '../../core/state.js';
import { f, fechaLegible, formateadorFecha, hoy, esc as _esc } from '../../infra/utils.js';
import { icon, iconoCategoria, emptyArt, tejaCategoria } from '../../infra/icons.js';
import { SALDO_MASCARA_CUENTA } from '../../infra/render.js';
import { siluetaMeta } from '../../infra/svg.js';
import { estadoDeBolsa } from '../../infra/bolsas.js';
import { columnasPortafolio, etapaDePortafolio } from '../../infra/portafolio.js';
import { htmlComparador, pieComparador } from '../../ui/comparador.js';
import { CATEGORIA_META_SILUETA } from '../../core/constants.js';
import {
  calcularObjetivoFondo,
  calcularProgresoFondo,
  mesesDeColchon,
  calcularMontoTotalFondo,
  ordenarAportesPorFecha,
  casaAhorro,
  diasAlProximoApartado,
  nivelesFondo,
  mesesEnPalabras,
  fechaCobertura,
  franjaCobertura,
  aportadoEnPeriodo,
  progresoCompromiso,
  etiquetaCadaPeriodo,
  montoPorPeriodo,
  NIVELES_FONDO,
  META_MESES_MIN,
  META_MESES_MAX,
} from './logic.js';

// ── RENDER PRINCIPAL ─────────────────────────────────────────────

/**
 * Renderiza el panel de Ahorro en `#panel-ahorro`.
 *
 * @param {number}      gastosFijosMensuales COP/mes calculado por index.js desde
 *                                           S.compromisos (regla ADN #10: view no
 *                                           lee otros dominios).
 * @param {number|null} tasaAhorro           Tasa de ahorro mensual (%) calculada
 *                                           por index.js desde S.ingresos + S.gastos.
 *                                           null si no hay ingresos registrados.
 * @param {Object|null} sugerencia           Aporte sugerido (AH.2) calculado por
 *                                           index.js con calcularAporteSugerido.
 *                                           null si no se puede calcular.
 * @param {string}      frecuencia           Frecuencia real de cobro (AH.5, ADR
 *                                           049 D4), calculada por index.js con
 *                                           frecuenciaPrincipalIngresos(S.ingresos).
 *                                           Por defecto 'Mensual'.
 */
export function renderAhorro(gastosFijosMensuales, tasaAhorro = null, sugerencia = null, frecuencia = 'Mensual') {
  const el = document.getElementById('panel-ahorro');
  if (!el) return;

  const carrilEl = document.getElementById('fondo-carril');
  const fondo = S.ahorro?.fondoEmergencia ?? { activo: false, metaMeses: 3, montoActual: 0 };

  if (!fondo.activo) {
    el.innerHTML = _renderEmptyState(gastosFijosMensuales);
    if (carrilEl) carrilEl.innerHTML = '';
    return;
  }

  el.innerHTML = _renderFondoCard(fondo, gastosFijosMensuales, tasaAhorro, sugerencia, frecuencia);

  // INT.1g (ADR 059 D7, P1): el compromiso del mes es lo unico de esta
  // pagina que hoy exige bajar un pliegue para saber si el mes va cumplido.
  // Desde 1.680px se repite aqui, en el carril siempre visible; debajo de
  // esa ventana .section__carril queda oculto (responsive.css) y la copia
  // de _renderHabitoSection sigue siendo la unica visible.
  if (carrilEl) {
    const aportes = Array.isArray(S.ahorro?.aportes) ? S.ahorro.aportes : [];
    const compromisoMensual = Number(S.ahorro?.compromisoMensual) || 0;
    carrilEl.innerHTML = _renderCompromisoCarril(aportes, compromisoMensual, frecuencia);
  }
}

/**
 * Copia del medidor de compromiso para el carril derecho (INT.1g). Mismo
 * calculo que `_renderMedidorCompromiso` dentro de `_renderHabitoSection`;
 * CSS decide cual de las dos copias se ve segun el ancho de ventana, para
 * no perder la posicion actual en portatiles bajo 1.680px.
 */
function _renderCompromisoCarril(aportes, compromisoMensual, frecuencia) {
  if (compromisoMensual <= 0) return '';
  const medidor = _renderMedidorCompromiso(compromisoMensual, aportes, frecuencia);
  if (!medidor) return '';
  return `
    <section class="ahorro-habito ahorro-habito--carril" aria-label="Compromiso de este mes">
      <div class="ahorro-habito__header">
        <h2 class="ahorro-habito__title">Compromiso del mes</h2>
      </div>
      ${medidor}
    </section>`;
}

// ── CASA DE AHORRO: LOS CUATRO CARRILES (DIS.19, arquitectura 1c) ─

/**
 * Renderiza la casa de Ahorro en `#panel-casa-ahorro`: los cuatro carriles, cada
 * uno con su gráfico propio y su acción.
 *
 * DIS.18 dio a las cuatro modalidades una pantalla padre y resolvió la
 * navegación, pero las filas seguían siendo monto y estado en texto: la decisión
 * de a dónde entrar se tomaba **sin información**, y las cuatro se sentían la
 * misma cosa cuatro veces aunque el código ya las hubiera diferenciado. La
 * diferencia estaba adentro de cada sección y la decisión se toma afuera.
 *
 * DIS.19 (items 1 y 2 del informe de gráficos) cambia eso con dos movimientos:
 *
 * - **Cada carril trae su gráfico, y cada gráfico mide en su propia unidad.** El
 *   fondo en meses cubiertos, los apartados en columnas comparadas contra la
 *   marca de su plan, las metas en siluetas que se llenan y la inversión en dos
 *   columnas donde se ve lo que pone el tiempo. Cuatro unidades distintas es lo
 *   que hace que las cuatro dejen de parecer lo mismo: no se distinguen por el
 *   título, se distinguen por la forma.
 * - **El rótulo del momento de uso encabeza cada carril.** "Ojalá nunca lo uses"
 *   sobre el fondo y "En una fecha que no elegiste" sobre los apartados explican
 *   la diferencia entre las dos bolsas mejor que cualquier definición, y ordenan
 *   los cuatro carriles con una sola pregunta.
 *
 * El total baja al pie en una línea. Era la única cifra grande de la pantalla y
 * no servía para decidir nada: nadie hace algo distinto por saber que tiene
 * $12.884.000 repartidos en cuatro sitios.
 *
 * Lee S directamente (permitido para un view), pero NO importa otros dominios:
 * suma inline los montos de cada slice y saca los cálculos compartidos de
 * `infra/bolsas.js` y `infra/portafolio.js`, que existen justamente para eso
 * (regla ADN #10).
 *
 * @param {number} gastosFijosMensuales COP/mes calculado por index.js: el fondo
 *                                      se mide en meses cubiertos.
 */
export function renderCasaAhorro(gastosFijosMensuales = 0) {
  const el = document.getElementById('panel-casa-ahorro');
  if (!el) return;

  const hoyISO = hoy();
  const fondo  = S.ahorro?.fondoEmergencia ?? { activo: false };
  const aportes = Array.isArray(S.ahorro?.aportes) ? S.ahorro.aportes : [];
  const fondoTotal = fondo.activo ? calcularMontoTotalFondo(fondo.montoActual, aportes) : 0;

  const metas = (Array.isArray(S.metas) ? S.metas : []).filter(m => m.completada !== true);
  const metasTotal = metas.reduce((sum, m) => sum + (Number(m.montoActual) || 0), 0);

  // Mismo filtro que `apartadosActivos()`: un apartado completado sigue vivo si
  // es recurrente (espera que lo usen para arrancar el ciclo siguiente). Va
  // replicado y no importado porque ADN #10 lo impide, igual que
  // `_gastosFijosMensuales()` replica el factor de frecuencia de compromisos.
  const apartados = (Array.isArray(S.apartados) ? S.apartados : [])
    .filter(a => a && (a.completado !== true || a.recurrente === true));
  const apartadosTotal = apartados.reduce((sum, a) => sum + (Number(a.montoActual) || 0), 0);

  const inversiones = Array.isArray(S.inversiones) ? S.inversiones : [];
  const inversionesTotal = inversiones.reduce((sum, i) => sum + (Number(i.monto) || 0), 0);

  // La etapa del portafolio y el conteo de abiertas salen de la misma llamada a
  // infra (ARQ.1c): es el criterio que la sección Inversión usa para su chip, y
  // ADN #10 impide leerlo de ese dominio. Antes el carril contaba `.length`, que
  // incluía una inversión sin monto; ahora las dos cifras filtran igual.
  const etapaInversiones = etapaDePortafolio(inversiones);

  const { total, filas } = casaAhorro({
    montos: {
      fondo:       fondoTotal,
      metas:       metasTotal,
      apartados:   apartadosTotal,
      inversiones: inversionesTotal,
    },
    mesesCubiertos:      fondo.activo ? mesesDeColchon(fondoTotal, gastosFijosMensuales) : null,
    metasEnCurso:        metas.length,
    diasProximoApartado: diasAlProximoApartado(apartados, hoyISO),
    inversionesAbiertas: etapaInversiones?.abiertas ?? 0,
    etapaInversion:      etapaInversiones?.numero   ?? null,
  });

  const graficos = {
    fondo:       _graficoFondo(fondo, fondoTotal, gastosFijosMensuales, hoyISO),
    apartados:   _graficoApartados(apartados, hoyISO),
    metas:       _graficoMetas(metas),
    inversiones: _graficoInversion(inversiones),
  };

  el.innerHTML = _htmlHub(total, filas, graficos, fondo.activo === true);
}

/**
 * El hub completo: la frase que enseña la diferencia, los chips para saltar de
 * carril, los cuatro carriles y el total al pie.
 *
 * Los chips no son navegación de sección: mueven el scroll dentro de la misma
 * pantalla. Por eso son botones con acción y no enlaces con hash, que el router
 * leería como una sección inexistente.
 *
 * @param {number} total
 * @param {Array<Object>} filas Salida de `casaAhorro()`, en orden de carril.
 * @param {Object<string, {html: string, accion: string}>} graficos
 * @param {boolean} fondoActivo
 */
function _htmlHub(total, filas, graficos, fondoActivo = true) {
  const oculto = S.config?.ocultarSaldo === true;

  const chipsHtml = filas.map(fila => `
        <button class="chip" type="button" data-action="ahorro-ir-a-carril" data-id="${_esc(fila.clave)}">
          ${_esc(fila.label)}
        </button>`).join('');

  const carrilesHtml = filas.map(fila => _htmlCarril(fila, graficos[fila.clave])).join('');

  // AH4 (ficha 04, ADR 069 D7): el fondo es una precondición en tres sitios de
  // la app y en la casa se dibuja como un igual. La primacía se dice, no se
  // infla: media línea mientras el fondo no está activo, y desaparece cuando
  // lo está, porque entonces deja de ser un consejo. Agrandar su carril sería
  // reintroducir la jerarquía por tamaño que la ficha 03 retiró de "Más".
  const primeroFondo = fondoActivo
    ? ''
    : '<p class="hub__primero"><strong>Empieza por el fondo</strong>: es el que sostiene a los otros tres.</p>';

  return `
    <div class="hub">
      <p class="hub__intro">Cuatro formas de guardar. La diferencia es <strong>cuándo vas a usar este dinero</strong>.</p>
      ${primeroFondo}
      <div class="chips" role="group" aria-label="Saltar a una modalidad">${chipsHtml}</div>
      ${carrilesHtml}
      <p class="hub__total">
        Todo lo que tienes guardado:
        <strong id="casa-ahorro-total">${oculto ? SALDO_MASCARA_CUENTA : f(total)}</strong>
      </p>
    </div>`;
}

/**
 * Un carril: el momento de uso, el nombre, la salida a la sección, el gráfico y
 * la acción.
 *
 * El gráfico va `aria-hidden` y el estado en palabras lo dice el subtítulo, que
 * es la misma frase que la fila de DIS.18 ya usaba ("1 mes y 3 semanas
 * cubiertos", "el más próximo, en 12 días"): el dibujo no es la fuente de la
 * información, la duplica en una forma más rápida de leer (regla R11).
 *
 * @param {{clave:string, seccion:string, icono:string, label:string, cuando:string, proposito:string, monto:number, estado:string}} fila
 * @param {{html:string, accion:string}} grafico
 */
function _htmlCarril(fila, grafico) {
  const oculto = S.config?.ocultarSaldo === true;
  const m = (n) => oculto ? SALDO_MASCARA_CUENTA : f(n);

  return `
      <section class="lane" id="carril-${_esc(fila.clave)}" data-dom="${_esc(fila.clave === 'inversiones' ? 'inversion' : fila.clave === 'metas' ? 'metas' : 'ahorro')}"
               aria-labelledby="carril-${_esc(fila.clave)}-nombre">
        <header class="lane__hd">
          <div class="lane__txt">
            <span class="lane__cuando">${_esc(fila.cuando)}</span>
            <span class="lane__nombre" id="carril-${_esc(fila.clave)}-nombre">
              ${icon(fila.icono, 'icon lane__ico')} ${_esc(fila.label)}
            </span>
            <span class="lane__estado">${m(fila.monto)} · ${_esc(fila.estado)}</span>
          </div>
          <a class="lane__ver" href="#${_esc(fila.seccion)}"
             aria-label="Ver todo en ${_esc(fila.label)}">Ver todo</a>
        </header>
        ${grafico.html}
        ${grafico.accion}
      </section>`;
}

// ── UN GRÁFICO POR CARRIL, CADA UNO EN SU UNIDAD ─────────────────

/**
 * Fondo: los meses cubiertos, en la misma franja que su sección (item 6).
 *
 * Repetir el gráfico y no una versión distinta es deliberado: el carril tiene que
 * enseñar a leer la sección a la que lleva. Va en versión compacta porque acá
 * compite con otros tres.
 */
function _graficoFondo(fondo, fondoTotal, gastosFijosMensuales, hoyISO) {
  if (!fondo.activo) {
    return {
      html: `<p class="lane__nota">Un fondo de emergencia es dinero apartado para cuando algo se dañe o dejes de recibir. Es el primer paso de los cuatro.</p>`,
      accion: `<button class="lane__cta" type="button" data-action="ahorro-activar-fondo">Empezar mi fondo</button>`,
    };
  }

  const colchon = mesesDeColchon(fondoTotal, gastosFijosMensuales);
  if (colchon === null) {
    return {
      html: `<p class="lane__nota">Registra tus gastos fijos desde Calendario y Finko calcula cuánto tiempo te cubre el fondo.</p>`,
      accion: `<button class="lane__cta" type="button" data-action="ahorro-nuevo-aporte">+ Aportar al fondo</button>`,
    };
  }

  const { bloques, eje } = franjaCobertura(colchon, fondo.metaMeses ?? 3, hoyISO);

  const bloquesHtml = bloques.map(b => `
            <span class="cov__mes${b.futuro ? ' cov__mes--futuro' : ''}"><span class="cov__fill" style="height:${b.pct}%"></span></span>`).join('');
  const ejeHtml = eje.map(e => `
            <span class="cov__eje-seg">${e.rotulo ? `<span class="cov__nivel cov__nivel--${e.estado}">${_esc(e.rotulo)}</span>` : ''}</span>`).join('');

  return {
    html: `
        <div class="cov cov--mini" aria-hidden="true">
          <div class="cov__meses">${bloquesHtml}</div>
          <div class="cov__eje">${ejeHtml}</div>
        </div>`,
    accion: `<button class="lane__cta" type="button" data-action="ahorro-nuevo-aporte">${fondoTotal <= 0 ? '+ Hacer mi primer aporte' : '+ Aportar al fondo'}</button>`,
  };
}

/**
 * Apartados: las columnas comparadas contra la marca de su plan (item 5).
 *
 * Acá el gráfico **sí** es interactivo, al contrario que en la lista de
 * Apartados: allá tocar una columna no tenía a dónde llevar porque la tarjeta ya
 * estaba debajo, y acá cada columna es el aporte a ese apartado. Un toque en vez
 * de dos (elegir y luego pulsar un botón), y sin estado de selección que
 * mantener entre renders.
 */
function _graficoApartados(apartados, hoyISO) {
  if (apartados.length === 0) {
    return {
      html: `<p class="lane__nota">Ponle nombre, monto y fecha a un gasto que ya viene, y Finko te dice cuánto separar en cada pago.</p>`,
      accion: `<button class="lane__cta" type="button" data-action="nuevo-apartado">+ Crear un apartado</button>`,
    };
  }

  const columnas = apartados.map(a => {
    const e = estadoDeBolsa(a, hoyISO);
    return {
      id:        a.id,
      nombre:    a.nombre,
      iconoHtml: _iconoDeApartado(a),
      pct:       e.pct,
      plan:      e.planPct,
      nota:      _notaDePlazo(e),
      estado:    e.reunido ? 'listo' : e.atrasada ? 'atras' : '',
      etiquetaAccesible: e.reunido
        ? `${a.nombre}: ya lo reuniste, marcar como usado`
        : `Aportar a ${a.nombre}: ${e.pct}% reunido, ${_notaDePlazo(e)}`,
    };
  });

  return {
    html: htmlComparador(columnas, {
      clase:  'cmp--mini',
      accion: 'aportar-apartado',
      pie:    pieComparador(columnas),
    }),
    accion: '',
  };
}

/**
 * Metas: las siluetas que se llenan (item 3).
 *
 * La silueta hace de gráfico y de botón a la vez: cada una abre el aporte a su
 * meta. Es el mismo dibujo del centro del arco en la sección de Metas, así que el
 * carril enseña a leerla.
 */
function _graficoMetas(metas) {
  if (metas.length === 0) {
    return {
      html: `<p class="lane__nota">Crea tu primera meta: un viaje, un computador, la vivienda. Tú le pones el nombre y Finko le pone la forma.</p>`,
      accion: `<button class="lane__cta" type="button" data-action="nueva-meta">+ Crear una meta</button>`,
    };
  }

  const botones = metas.map(meta => {
    const objetivo = Number(meta.montoObjetivo) || 0;
    const actual   = Number(meta.montoActual) || 0;
    const pct      = objetivo > 0 ? Math.min(100, Math.round((actual / objetivo) * 100)) : 0;
    const forma    = CATEGORIA_META_SILUETA[meta.categoria] ?? 'caja';

    return `
          <button class="silbtn" type="button" data-action="abonar-meta" data-id="${_esc(meta.id)}"
                  aria-label="Aportar a ${_esc(meta.nombre)}: ${pct}% de tu objetivo">
            <span class="silbtn__fig" aria-hidden="true">
              ${siluetaMeta(pct, { forma, clave: `carril-${meta.id}`, decorativa: true })}
            </span>
            <span class="silbtn__lb">${_esc(meta.nombre)}</span>
            <span class="silbtn__pct">${pct}%</span>
          </button>`;
  }).join('');

  return {
    html: `<div class="silrow">${botones}</div>
        <p class="lane__hint">Toca una silueta para aportar. Se llena con lo que ya reuniste.</p>`,
    accion: '',
  };
}

/**
 * Inversión: las dos columnas donde se ve lo que pone el tiempo.
 *
 * Es el mismo gráfico de DIS.17, en versión compacta y con la geometría que
 * `infra/portafolio.js` ya calcula. La franja rayada es el rendimiento esperado:
 * lo único de las cuatro modalidades que crece sin que el usuario aporte.
 */
function _graficoInversion(inversiones) {
  const cols = columnasPortafolio(inversiones);
  if (!cols) {
    return {
      html: `<p class="lane__nota">Aquí llevas el registro de lo que inviertes y ves cuánto le suma el tiempo. Antes de empezar, cubre tu fondo de emergencia.</p>`,
      accion: `<button class="lane__cta" type="button" data-action="inversion-nueva">+ Registrar una inversión</button>`,
    };
  }

  const oculto = S.config?.ocultarSaldo === true;
  const m = (n) => oculto ? SALDO_MASCARA_CUENTA : f(n);

  const cuerpo = cols.segmentos.map((s, i) => `
              <span class="grow__seg" data-seg="${i % 2}" style="height:${s.alto}%"></span>`).join('');

  return {
    html: `
        <div class="grow" aria-hidden="true">
          <span class="grow__col">
            <span class="grow__stack">${cuerpo}</span>
            <span class="grow__lb">hoy</span>
          </span>
          <span class="grow__col">
            <span class="grow__stack">
              <span class="grow__seg grow__seg--tiempo" style="height:${cols.altoTiempo}%"></span>
              ${cuerpo}
            </span>
            <span class="grow__lb">al vencer</span>
          </span>
          <span class="grow__leyenda">
            <span class="grow__leg"><span class="grow__sw grow__sw--tiempo"></span>lo pone el tiempo</span>
          </span>
        </div>
        <p class="lane__hint">El tiempo le suma <strong>${m(cols.rendimiento)}</strong> a lo que ya pusiste.</p>`,
    accion: `<button class="lane__cta" type="button" data-action="inversion-nueva">+ Registrar otra inversión</button>`,
  };
}

// ── HELPERS DE LOS CARRILES ──────────────────────────────────────

/**
 * Ícono de un apartado. Réplica de `_iconoApartado()` de Apartados: los dos
 * formatos de `apartado.icono` (id de sprite o emoji crudo, CAT.2c) hay que
 * distinguirlos igual acá, y ADN #10 impide importar ese view. Se distingue por
 * el patrón `letra-` que ningún emoji real produce.
 */
function _iconoDeApartado(apartado) {
  const valor = apartado.icono ?? '📦';
  return /^[a-z]-/.test(valor) ? iconoCategoria(valor, 'icon') : _esc(valor);
}

/** El plazo de una bolsa, en la unidad más corta que quepa bajo la columna. */
function _notaDePlazo({ reunido, dias }) {
  if (reunido)       return 'listo';
  if (dias === null) return 'sin fecha';
  if (dias > 0)      return dias === 1 ? '1 día' : `${dias} días`;
  if (dias === 0)    return 'es hoy';
  return 'vencido';
}

// ── EMPTY STATE ──────────────────────────────────────────────────

/**
 * Estado 1 (DIS.16): sin fondo todavía. La tarjeta no existe, así que hay que
 * explicar para qué sirve, y los tres niveles aparecen desde el primer momento
 * apagados: son la promesa de la sección. La última línea traduce el primer
 * nivel a pesos con los datos que Finko ya tiene, así que la decisión de
 * activarlo no se toma a ciegas.
 */
function _renderEmptyState(gastosFijosMensuales) {
  const primerNivel = calcularObjetivoFondo(gastosFijosMensuales, NIVELES_FONDO[0].meses);

  const nivelesHtml = NIVELES_FONDO.map(n => `
        <li class="fondo-card__nivel-fila fondo-card__nivel-fila--lejano">
          <span class="fondo-card__punto" aria-hidden="true"></span>
          <span class="fondo-card__nivel-tx">${_esc(n.titulo)} · ${_esc(n.consecuencia)}</span>
        </li>`).join('');

  const pistaHtml = primerNivel > 0
    ? `<p class="fondo-card__veredicto">Con lo que pagas cada mes, tu primer nivel serían <strong>${f(primerNivel)}</strong>.</p>`
    : `<p class="fondo-card__veredicto">Registra tus gastos fijos desde Calendario (arriendo, servicios, suscripciones) y Finko calcula cuánto necesitas.</p>`;

  return `
    <article class="fondo-card fondo-card--vacio" data-dom="ahorro" aria-label="Fondo de emergencia">
      <div class="empty-state__icon">${emptyArt('ahorro')}</div>
      <p class="fondo-card__pregunta">¿Cuánto tiempo aguantarías sin ingresos?</p>
      <p class="fondo-card__explica">Un fondo de emergencia es dinero que apartas para cuando algo se dañe o dejes de recibir. No se gasta: está ahí para que un imprevisto no se convierta en deuda.</p>
      <div class="fondo-card__escalera">
        <p class="fondo-card__kicker">Los tres niveles</p>
        <ul class="fondo-card__niveles" role="list">${nivelesHtml}</ul>
      </div>
      ${pistaHtml}
      <div class="fondo-card__acciones">
        <button class="fondo-card__principal" type="button" data-action="ahorro-activar-fondo">Empezar mi fondo</button>
      </div>
    </article>`;
}

// ── HERO DEL FONDO (estado activo) ───────────────────────────────

/**
 * DIS.16 (arquitectura I con la prueba de H): la tarjeta del fondo deja de
 * medirse en porcentaje y pasa a medirse en **tiempo**. El fondo no es ni una
 * meta ni un apartado, y eso obliga a resolver dos cosas que ninguna otra
 * sección tiene:
 *
 * - **El objetivo se mueve solo.** Si suben los gastos fijos, el porcentaje cae
 *   sin que el usuario haya gastado un peso. Con niveles definidos en meses eso
 *   se entiende: lo que cambió fue el costo de un mes, y **un nivel logrado no
 *   se retira**.
 * - **No hay final.** Llegar a la meta no apaga la tarjeta: el siguiente nivel
 *   sigue a la vista, porque tres meses no es el final del camino.
 *
 * Las cuatro piezas hacen un trabajo cada una: el **nombre del nivel** dice qué
 * logró, los **bloques de mes y la fecha** demuestran cuánto aguanta (una
 * afirmación de texto hay que creerla; agosto entero y casi todo septiembre se
 * ve), la **escalera** dice hacia dónde va y el **veredicto** dice qué hacer.
 *
 * El anillo de progreso se retira: el porcentaje pasa a ser un rótulo pequeño al
 * pie de los bloques, que es todo el peso que merece aquí.
 *
 * AH.5 (ADR 049 D3): antes del primer número va una línea que dice qué es esto
 * y por qué importa, la misma pregunta que ya respondía el estado vacío pero
 * dicha corto, porque acá compite con datos y no puede volver a ocupar un
 * párrafo. El registro emocional (protección, no solo progreso) tiene que
 * leerse antes de llegar a la primera cifra.
 */
function _renderFondoCard(fondo, gastosFijosMensuales, tasaAhorro, sugerencia = null, frecuencia = 'Mensual') {
  const { metaMeses, montoActual: montoBase } = fondo;
  const aportes    = Array.isArray(S.ahorro?.aportes) ? S.ahorro.aportes : [];
  const montoTotal = calcularMontoTotalFondo(montoBase, aportes);
  const objetivo   = calcularObjetivoFondo(gastosFijosMensuales, metaMeses);
  const colchon    = mesesDeColchon(montoTotal, gastosFijosMensuales);
  const { faltante, completado } = calcularProgresoFondo(montoTotal, objetivo);

  const oculto = S.config?.ocultarSaldo === true;
  const m      = (n) => oculto ? SALDO_MASCARA_CUENTA : f(n);
  const enCero = montoTotal <= 0;

  const niveles = nivelesFondo(colchon);
  const actual  = niveles.find(n => n.estado === 'actual') ?? null;
  const ultimoLogrado = [...niveles].reverse().find(n => n.estado === 'logrado') ?? null;

  // La oferta de seguir nombra su destino ("Subir mi meta a 6 meses"): un botón
  // que solo dice "subir" obliga a abrir el formulario para saber a cuánto.
  const siguienteNivel = NIVELES_FONDO.find(n => n.meses > metaMeses) ?? null;

  const compromisoMensual = Number(S.ahorro?.compromisoMensual) || 0;

  return `
    <article class="fondo-card" data-dom="ahorro" aria-label="Fondo de emergencia">
      <p class="fondo-card__explica">Tu protección para cuando algo se dañe o dejes de recibir ingresos.</p>
      ${_renderNivelActual({ enCero, completado, ultimoLogrado, actual })}
      ${_renderCobertura({ colchon, metaMeses, montoTotal, enCero, m })}
      ${_renderVeredictoFondo({ completado, faltante, objetivo, montoTotal, metaMeses, actual, sugerencia, enCero, m })}
      ${_renderDatosFondo({ montoTotal, objetivo, gastosFijosMensuales, compromisoMensual, tasaAhorro, metaMeses, enCero, m, frecuencia })}
      <p class="fondo-card__nota">Este dinero sigue en tus cuentas. Solo queda apartado para emergencias: a diferencia de Metas y Reservas, no descuenta saldo.</p>
      <div class="fondo-card__secundarias">
        <button class="btn btn-ghost btn-sm fondo-card__secundaria" type="button" data-action="ahorro-nuevo-aporte">
          ${enCero ? 'Hacer mi primer aporte' : 'Registrar un aporte'}
        </button>
        <button class="btn btn-ghost btn-sm fondo-card__secundaria" type="button" data-action="ahorro-editar">
          ${completado && siguienteNivel ? `Subir mi meta a ${siguienteNivel.meses} meses` : 'Editar'}
        </button>
      </div>
    </article>

    ${_renderHabitoSection(aportes, compromisoMensual, tasaAhorro, sugerencia, frecuencia)}`;
}

/**
 * El bloque de identidad de la tarjeta. En cero no se dice "0 meses cubiertos"
 * como cifra grande: se nombra el nivel al que va, que es la única lectura que
 * no desanima en el momento más frágil.
 */
function _renderNivelActual({ enCero, completado, ultimoLogrado, actual }) {
  let kicker = 'Ya tienes';
  let nombre = ultimoLogrado?.logrado ?? '';

  if (enCero || (!ultimoLogrado && actual)) {
    // Sin ningún nivel logrado el próximo es siempre el primero, así que el
    // nombre no se deriva: es el paso que el usuario tiene enfrente.
    kicker = 'Vas a empezar';
    nombre = 'Tu primer mes';
  } else if (completado) {
    kicker = 'Lo lograste';
  }

  return `
      <div class="fondo-card__nivel">
        <p class="fondo-card__kicker">${kicker}</p>
        <p class="fondo-card__nivel-nombre">${_esc(nombre)}</p>
      </div>`;
}

/**
 * La franja de cobertura (DIS.19, item 6): la prueba y el camino en un dibujo.
 *
 * Hasta DIS.16 esto eran dos componentes. Los bloques de mes probaban cuánto
 * aguantas ("cubres un mes" es una afirmación que hay que creer; agosto entero y
 * casi todo septiembre se ve) y una lista aparte enumeraba los tres niveles con
 * su porcentaje. La lista costaba unos 90px de alto para decir algo que la
 * propia franja puede decir con un eje: **los niveles son posiciones en el
 * tiempo**, así que su sitio natural es debajo del mes en que caen.
 *
 * Los bloques crecen de abajo hacia arriba y no de izquierda a derecha: en
 * vertical los seis se comparan entre sí de un vistazo, que es lo que convierte
 * la franja en un gráfico y no en seis barras sueltas. Un mes sin nada cubierto
 * se dibuja con contorno punteado: la franja completa siempre está a la vista,
 * porque también es la promesa.
 *
 * La frase dice **"si hoy dejaras"** a propósito: la fecha es hipotética y sin
 * esa apertura parecería un pronóstico.
 */
function _renderCobertura({ colchon, metaMeses, montoTotal, enCero, m }) {
  if (colchon === null) {
    return `
      <p class="fondo-card__frase">Registra tus gastos fijos desde Calendario y Finko calcula cuánto tiempo te cubre el fondo.</p>`;
  }

  const { bloques, eje, conRotulos } = franjaCobertura(colchon, metaMeses, hoy());
  if (bloques.length === 0) return '';

  const mesCorto = formateadorFecha('es-CO', { month: 'short', timeZone: 'UTC' });

  const bloquesHtml = bloques.map(b => `
          <span class="cov__mes${b.futuro ? ' cov__mes--futuro' : ''}">
            <span class="cov__fill" style="height:${b.pct}%"></span>
            ${conRotulos ? `<span class="cov__lb">${_esc(mesCorto.format(new Date(`${b.mesISO}T12:00:00Z`)))}</span>` : ''}
          </span>`).join('');

  const ejeHtml = eje.map(e => `
          <span class="cov__eje-seg">${e.rotulo ? `<span class="cov__nivel cov__nivel--${e.estado}">${_esc(e.rotulo)}</span>` : ''}</span>`).join('');

  const hasta = fechaCobertura(colchon, hoy());
  const frase = enCero || !hasta
    ? 'Todavía no tienes días cubiertos. El primer aporte ya te compra tiempo.'
    : `Si hoy dejaras de recibir ingresos, cubres tus gastos hasta el <strong>${fechaLegible(hasta)}</strong>`;

  return `
      <div class="fondo-card__cobertura">
        <p class="fondo-card__frase">${frase}</p>
        <div class="cov">
          <div class="cov__meses" aria-hidden="true">${bloquesHtml}</div>
          <div class="cov__eje" aria-hidden="true">${ejeHtml}</div>
          <p class="cov__pie">
            <span>${_pieCobertura(colchon, metaMeses)}</span>
            <span>${m(montoTotal)}</span>
          </p>
        </div>
      </div>`;
}

/**
 * El rótulo bajo los bloques. Con la meta cubierta "3 meses de 3 meses" repite
 * la cifra dos veces para decir una sola cosa: que están completos.
 *
 * @param {number} colchon   meses cubiertos.
 * @param {number} metaMeses meses que el usuario apunta a cubrir.
 * @returns {string}
 */
function _pieCobertura(colchon, metaMeses) {
  const plural = metaMeses === 1 ? 'mes' : 'meses';
  return colchon >= metaMeses
    ? `${metaMeses} ${plural} completos`
    : `${mesesEnPalabras(colchon)} de ${metaMeses} ${plural}`;
}

/**
 * La línea que dice qué hacer. Con la meta cumplida celebra primero y ofrece
 * después: seguir hasta el nivel siguiente es una oferta, no un reproche.
 */
function _renderVeredictoFondo({ completado, faltante, objetivo, montoTotal, metaMeses, actual, sugerencia, enCero, m }) {
  if (objetivo <= 0) return '';

  // Estado 2 (recién activado): en cero, "te faltan $4.382.700 para tu meta" es
  // la lectura que más desanima en el momento más frágil. El veredicto apunta al
  // primer nivel, que es el paso que el usuario tiene enfrente y cuesta un
  // tercio de la meta.
  if (enCero && actual) {
    const objetivoNivel = Math.round(actual.meses * (objetivo / metaMeses));
    if (sugerencia?.monto > 0 && objetivoNivel > 0) {
      const mesesNivel = Math.max(1, Math.ceil(objetivoNivel / sugerencia.monto));
      return `<p class="fondo-card__veredicto">Guardando ${m(sugerencia.monto)} al mes, en ${mesesNivel} ${mesesNivel === 1 ? 'mes' : 'meses'} llegas a tu primer nivel.</p>`;
    }
    return `<p class="fondo-card__veredicto">Tu primer nivel son ${m(objetivoNivel)}: un mes de lo que pagas sí o sí.</p>`;
  }

  if (completado) {
    if (!actual) {
      return `<p class="fondo-card__veredicto">Cumpliste tu meta de ${metaMeses} ${metaMeses === 1 ? 'mes' : 'meses'}. Cada aporte extra suma colchón.</p>`;
    }
    const costoMes      = objetivo / metaMeses;
    const objetivoNivel = Math.round(actual.meses * costoMes);
    const faltaNivel    = Math.max(0, objetivoNivel - montoTotal);
    return `<p class="fondo-card__veredicto">Cumpliste tu meta. Si quieres seguir, ${actual.titulo.toLowerCase()} son ${m(objetivoNivel)}: te faltan ${m(faltaNivel)}.</p>`;
  }

  const ritmo = sugerencia?.monto > 0 && sugerencia?.meses
    ? ` Guardando ${m(sugerencia.monto)} al mes llegas en ${sugerencia.meses} ${sugerencia.meses === 1 ? 'mes' : 'meses'}.`
    : '';

  return `<p class="fondo-card__veredicto">Te faltan ${m(faltante)} para tu meta.${ritmo}</p>`;
}

/** Las líneas de detalle del pie, en lenguaje de todos los días. */
function _renderDatosFondo({ montoTotal, objetivo, gastosFijosMensuales, compromisoMensual, tasaAhorro, metaMeses, enCero, m, frecuencia = 'Mensual' }) {
  const lineas = [];

  if (enCero && objetivo > 0) {
    // "Tienes $0 de $4.382.700" es la misma cifra dicha de la peor manera. El
    // "hoy" además advierte que el objetivo se mueve cuando cambian los gastos.
    lineas.push(`<p class="fondo-card__dato fondo-card__dato--fuerte">Tu meta es cubrir ${metaMeses} ${metaMeses === 1 ? 'mes' : 'meses'}: hoy son ${m(objetivo)}</p>`);
  } else {
    lineas.push(objetivo > 0
      ? `<p class="fondo-card__dato fondo-card__dato--fuerte">Tienes ${m(montoTotal)} de ${m(objetivo)}</p>`
      : `<p class="fondo-card__dato fondo-card__dato--fuerte">Tienes ${m(montoTotal)}</p>`);
  }

  if (gastosFijosMensuales > 0) {
    lineas.push(`<p class="fondo-card__dato">Cada nivel es un mes más de lo que pagas sí o sí (${m(gastosFijosMensuales)})</p>`);
  }

  const partesHabito = [];
  if (compromisoMensual > 0) partesHabito.push(`Te propusiste guardar ${m(compromisoMensual)} ${etiquetaCadaPeriodo(frecuencia)}`);
  // Una proporción no revela cuánto dinero hay, así que no se enmascara.
  if (tasaAhorro !== null && tasaAhorro > 0) partesHabito.push(`de cada $100 que recibes, guardas $${tasaAhorro}`);
  if (partesHabito.length > 0) {
    lineas.push(`<p class="fondo-card__dato">${partesHabito.join(' · ')}</p>`);
  }

  return `<div class="fondo-card__datos">${lineas.join('')}</div>`;
}

// ── SECCIÓN DE HÁBITO (aportes + compromiso + tasa) ──────────────

function _renderHabitoSection(aportes, compromisoMensual, tasaAhorro, sugerencia = null, frecuencia = 'Mensual') {
  const ordenados = ordenarAportesPorFecha(aportes);

  // AH.2: si no hay compromiso definido y hay una sugerencia con datos
  // reales, la pregunta viene acompañada del punto de partida. AH.5 (ADR 049
  // D4): el punto de partida se dice en la frecuencia real de cobro, no en
  // el mensual con el que razona internamente calcularAporteSugerido().
  const hintSugerido = (sugerencia && sugerencia.monto > 0)
    ? ` Según tus números, ${f(montoPorPeriodo(sugerencia.monto, frecuencia))} es un buen punto de partida.`
    : '';

  // DIS.12 (hallazgo A6): el compromiso usaba `i-deudas`, el símbolo que
  // identifica la sección Deudas en la navegación y en cada tarjeta de crédito.
  // La metáfora era la contraria: lo que debes marcando lo que apartas.
  // `i-recurring` es el mismo símbolo de recurrencia que ya marca los gastos
  // fijos en Calendario e Inicio, que es exactamente lo que esto es.
  const compromisoHtml = compromisoMensual > 0
    ? _renderMedidorCompromiso(compromisoMensual, aportes, frecuencia)
    : `<p class="ahorro-habito__sin-compromiso">
        ¿Cuánto quieres apartar ${etiquetaCadaPeriodo(frecuencia)}?${hintSugerido}
        <button class="btn btn-ghost btn-sm" data-action="ahorro-editar-compromiso">Definir →</button>
      </p>`;

  const listaHtml = ordenados.length === 0
    ? `<p class="ahorro-habito__empty">Aún no has registrado aportes. Cada vez que apartes dinero para el fondo, regístralo aquí.</p>`
    : `<ul class="ahorro-habito__lista" role="list">
        ${ordenados.map(_renderAporteItem).join('')}
      </ul>`;

  const tasaHtml = tasaAhorro !== null
    ? _renderNudgeTasa(tasaAhorro)
    : '';

  // DIS.16: el botón de registrar se fue de este encabezado. La acción principal
  // de la sección vive ahora en la tarjeta, a ancho completo, y tenerla dos
  // veces en la misma pantalla la volvía ruido (regla R1: un primario).
  return `
    <section class="ahorro-habito" aria-label="Historial de aportes">
      <div class="ahorro-habito__header">
        <h2 class="ahorro-habito__title">Aportes al fondo</h2>
      </div>
      ${compromisoHtml}
      ${listaHtml}
      ${tasaHtml}
    </section>`;
}

/** Copy del cierre del medidor por frecuencia (AH.5, ADR 049 D4). Mensual
 *  conserva el texto original tal cual estaba antes de AH.5. */
const _PERIODO_COPY = {
  Diario:    { cumplido: 'Día cumplido. Mañana vuelve a empezar.',
               cierra: 'Hoy cierra el día.', restante: (n) => `Quedan ${n} días.` },
  Semanal:   { cumplido: 'Semana cumplida. El lunes vuelve a empezar.',
               cierra: 'Hoy cierra la semana.', restante: (n) => `Quedan ${n} días de la semana.` },
  Quincenal: { cumplido: 'Quincena cumplida. Vuelve a empezar en la próxima.',
               cierra: 'Hoy cierra la quincena.', restante: (n) => `Quedan ${n} días de la quincena.` },
  Mensual:   { cumplido: 'Mes cumplido. El 1 vuelve a empezar.',
               cierra: 'Hoy cierra el mes.', restante: (n) => `Quedan ${n} días del mes.` },
};

/**
 * El medidor del compromiso del mes (DIS.19, item 7).
 *
 * "Compromiso mensual: $420.000" informaba sin medir: para saber si el mes iba
 * cumplido había que abrir la lista de aportes y sumar a mano, y el compromiso
 * quedaba como un recordatorio que nadie contesta. El medidor contesta: la gota
 * se llena con lo aportado este mes, y al lado va la cuenta en pesos y lo que
 * queda de mes para cerrarla.
 *
 * Se llena con `siluetaMeta()`, el mismo componente de las metas: el relleno por
 * altura tiene una sola implementación en la app y no dos que se parecen.
 *
 * El dibujo es decorativo: lo que dice está escrito al lado en palabras y en
 * pesos, y el porcentaje sobrepuesto es texto real que el lector ya anuncia.
 *
 * AH.5 (ADR 049 D4) generaliza el período a la frecuencia real de cobro: el
 * texto de cierre ("el 1 vuelve a empezar") cambia de fecha, no de idea.
 *
 * @param {number} compromisoMensual
 * @param {Array<{monto:number, fecha:string}>} aportes
 * @param {string} [frecuencia] una de FRECUENCIAS_APORTE. Por defecto 'Mensual'.
 */
function _renderMedidorCompromiso(compromisoMensual, aportes, frecuencia = 'Mensual') {
  const hoyISO = hoy();
  const p = progresoCompromiso(compromisoMensual, aportadoEnPeriodo(aportes, hoyISO, frecuencia), hoyISO, frecuencia);
  if (!p) return '';

  const oculto = S.config?.ocultarSaldo === true;
  const m = (n) => oculto ? SALDO_MASCARA_CUENTA : f(n);

  // El período cerrado vuelve a cero, así que no dice "te faltan $0": dice que
  // se renueva. Y con el período corriendo la nota es una cuenta concreta, no
  // un ánimo. Cada frecuencia cierra en una fecha propia (ver _PERIODO_COPY).
  const cp = _PERIODO_COPY[frecuencia] ?? _PERIODO_COPY.Mensual;
  const nota = p.completo
    ? cp.cumplido
    : p.diasRestantes <= 1
      ? `${cp.cierra} Con ${m(p.faltante)} lo completas.`
      : `${cp.restante(p.diasRestantes)} Con ${m(p.faltante)} lo completas.`;

  return `
      <div class="ahorro-habito__compromiso">
        <span class="liq">
          ${siluetaMeta(p.pct, { forma: 'gota', clave: 'compromiso', decorativa: true })}
          <span class="liq__pct">${p.pct}%</span>
        </span>
        <div class="ahorro-habito__compromiso-txt">
          <p class="ahorro-habito__compromiso-monto">${m(p.aportado)} de ${m(p.objetivo)}</p>
          <p class="ahorro-habito__compromiso-nota">${nota}</p>
        </div>
        <button class="btn btn-ghost btn-sm" data-action="ahorro-editar-compromiso"
                aria-label="Editar compromiso de ahorro">Editar</button>
      </div>`;
}

/**
 * Fila de un aporte al fondo.
 *
 * DIS.12 (hallazgo A5, regla R2): antes el monto era el `list-item__title` y la
 * fecha el subtítulo, sin teja y sin `list-item__amount`. Quedaba una columna
 * de cifras grandes sin sujeto, alineadas a la izquierda, imposibles de
 * comparar de un vistazo. Acá vale la anatomía del resto de la app
 * (Movimientos, Deudas, Me deben): el título es el sujeto (la fecha), la nota
 * acompaña como subtítulo y el monto vive en su columna derecha, tabular.
 *
 * @param {{id:string, monto:number, fecha:string, nota?:string}} aporte
 */
function _renderAporteItem(aporte) {
  const nota = aporte.nota ? _esc(aporte.nota) : 'Aporte al fondo';
  return `
    <li class="list-item" data-id="${_esc(aporte.id)}">
      <div class="list-item__icon" aria-hidden="true">${tejaCategoria('i-ahorro', 'ahorro')}</div>
      <div class="list-item__body">
        <p class="list-item__title">${fechaLegible(aporte.fecha)}</p>
        <p class="list-item__subtitle">${nota}</p>
      </div>
      <div class="list-item__meta">
        <p class="list-item__amount">+${f(aporte.monto)}</p>
      </div>
      <div class="list-item__action">
        <button class="btn btn-ghost btn-icon"
                data-action="ahorro-eliminar-aporte"
                data-id="${_esc(aporte.id)}"
                aria-label="Eliminar aporte de ${f(aporte.monto)}">
          <svg class="icon" aria-hidden="true"><use href="#i-trash"/></svg>
        </button>
      </div>
    </li>`;
}

function _renderNudgeTasa(tasaAhorro) {
  let icono, titulo, desc, nivel;

  if (tasaAhorro >= 20) {
    icono = icon('trophy'); nivel = 'nudge-success';
    titulo = `Excelente: ahorras el ${tasaAhorro}% de tus ingresos este mes.`;
    desc   = 'Superas el umbral recomendado del 20%. ¡Sigue así!';
  } else if (tasaAhorro >= 10) {
    icono = icon('inversion'); nivel = 'nudge-info';
    titulo = `Ahorras el ${tasaAhorro}% de tus ingresos este mes.`;
    desc   = 'Vas bien. La meta recomendada es el 20%. Un poco más y llegas.';
  } else if (tasaAhorro > 0) {
    icono = icon('lightbulb'); nivel = 'nudge-medium';
    titulo = `Ahorras el ${tasaAhorro}% de tus ingresos este mes.`;
    desc   = 'Antes de recortar el ahorro, revisa tus gastos de estilo de vida (entretenimiento, salidas, suscripciones). Son los más fáciles de ajustar.';
  } else if (tasaAhorro === 0) {
    icono = icon('alert'); nivel = 'nudge-medium';
    titulo = 'Este mes tus gastos igualan tus ingresos.';
    desc   = 'Revisa primero tus gastos de estilo de vida: entretenimiento, salidas, suscripciones. Son más fáciles de reducir que los fijos.';
  } else {
    icono = icon('alert'); nivel = 'nudge-high';
    titulo = `Este mes tus gastos superan tus ingresos en ${Math.abs(tasaAhorro)}%.`;
    desc   = 'Antes de tocar el ahorro, reduce gastos de estilo de vida. Si no alcanza, revisa tus gastos fijos.';
  }

  // DIS.12 (hallazgo A7, regla R55): el nivel alto (los gastos del mes superan
  // los ingresos) interrumpe; `status` es un aviso cortés y el lector espera
  // una pausa. Mismo criterio que `_renderNudge()` en Límites de gasto.
  const rol = nivel === 'nudge-high' ? 'alert' : 'status';

  return `
    <div class="nudge ${nivel}" role="${rol}">
      <span class="nudge__icon" aria-hidden="true">${icono}</span>
      <div class="nudge__body">
        <p class="nudge__title">${titulo}</p>
        <p class="nudge__desc">${desc}</p>
      </div>
    </div>`;
}

// ── FORMULARIO MODAL - FONDO (activar / editar) ──────────────────

/**
 * HTML del formulario para activar el fondo o editarlo (monto base + meta de meses).
 *
 * @param {Object} opts
 * @param {boolean} opts.editando
 * @param {number}  opts.metaMeses
 * @param {number}  opts.montoActual
 * @param {number}  opts.gastosFijosMensuales
 * @returns {string}
 */
export function renderFormFondo({ editando, metaMeses, montoActual, gastosFijosMensuales }) {
  const objetivoPreview = calcularObjetivoFondo(gastosFijosMensuales, metaMeses);
  const previewHtml = objetivoPreview > 0
    ? `<p class="form-hint">Con esa meta tu objetivo sería <strong>${f(objetivoPreview)}</strong>: ${metaMeses} ${metaMeses === 1 ? 'mes' : 'meses'} × ${f(gastosFijosMensuales)}, que es lo que suman al mes tus gastos fijos de Calendario (arriendo, servicios, cuotas...).</p>`
    : `<p class="form-hint">Aún no hay gastos fijos registrados. Cuando los agregues desde Calendario, Finko calcula automáticamente el objetivo.</p>`;

  // DIS.12 (hallazgo A3, regla R53): al editar, "Desactivar fondo" ocupaba el
  // sitio de Cancelar con el mismo `btn-ghost` y el mismo aspecto, y Cancelar
  // no existía: en todos los demás formularios de Finko ese lugar es la salida
  // sin consecuencias. Ahora Cancelar vuelve a su sitio y la acción destructiva
  // baja a su propia fila, separada por un filete y con `.btn-danger`.
  const desactivarHtml = `
      <div class="modal__footer-secundario">
        <button type="button" class="btn btn-danger btn-sm" data-action="ahorro-desactivar">Desactivar fondo</button>
      </div>`;

  return `
    <form id="form-fondo" novalidate>
      <div class="form-group">
        <label for="fondo-meta-meses" class="label">Meses de gastos fijos que quieres cubrir</label>
        <input id="fondo-meta-meses" name="metaMeses" class="input" type="number"
               min="${META_MESES_MIN}" max="${META_MESES_MAX}" step="1"
               value="${metaMeses}" required aria-required="true"
               inputmode="numeric" />
        <p class="form-hint">Recomendado: 3 meses si tienes ingresos estables, 6 si son variables.</p>
      </div>

      <div class="form-group">
        <label for="fondo-monto-actual" class="label">¿Cuánto ya tienes apartado? (COP)</label>
        <input id="fondo-monto-actual" name="montoActual" class="input" type="number"
               min="0" step="10000" value="${montoActual}"
               placeholder="0" required aria-required="true"
               inputmode="numeric" />
        <p class="form-hint">Si todavía no tienes nada, déjalo en 0. Lo vas a ir sumando con cada aporte.</p>
      </div>

      ${previewHtml}

      <div class="modal__footer">
        <button type="button" class="btn btn-ghost" data-action="modal-close">Cancelar</button>
        <button type="submit" class="btn btn-primary">${editando ? 'Guardar cambios' : 'Activar fondo'}</button>
      </div>

      ${editando ? desactivarHtml : ''}
    </form>`;
}

// ── FORMULARIO MODAL - APORTE (J.1b) ─────────────────────────────

/**
 * HTML del formulario para registrar un nuevo aporte al fondo.
 *
 * @param {{ fecha: string, sugerencia?: {monto:number, base:string}|null }} opts
 *   `fecha` en YYYY-MM-DD (default: hoy). `sugerencia` (AH.5a) es la salida de
 *   `calcularAporteSugerido()` (AH.2): con un monto > 0 prellena el campo en
 *   vez de dejarlo en blanco (el mismo número que ya se sugiere para el
 *   compromiso mensual). Sigue siendo editable.
 * @returns {string}
 */
export function renderFormAporte({ fecha, sugerencia = null }) {
  const montoSugerido = sugerencia?.monto > 0 ? sugerencia.monto : null;
  const valorHtml   = montoSugerido ? ` value="${montoSugerido}"` : '';
  const hintPrefill = montoSugerido
    ? 'Prellenado con lo que te conviene apartar este mes, según tus ingresos y gastos. Puedes cambiarlo. Registrarlo no descuenta tus cuentas: el dinero sigue ahí, solo queda marcado como reservado.'
    : '¿Cuánto apartaste para el fondo? Registrarlo no descuenta tus cuentas: el dinero sigue ahí, solo queda marcado como reservado.';

  return `
    <form id="form-aporte" novalidate>
      <div class="form-group">
        <label for="aporte-monto" class="label">Monto del aporte (COP)</label>
        <input id="aporte-monto" name="monto" class="input" type="number"
               min="1" step="10000" placeholder="100000"${valorHtml}
               required aria-required="true" inputmode="numeric" autofocus />
        <p class="form-hint">${hintPrefill}</p>
      </div>

      <div class="form-group">
        <label for="aporte-fecha" class="label">Fecha</label>
        <input id="aporte-fecha" name="fecha" class="input" type="date"
               value="${_esc(fecha)}" required aria-required="true" />
      </div>

      <div class="form-group">
        <label for="aporte-nota" class="label">Nota (opcional)</label>
        <input id="aporte-nota" name="nota" class="input" type="text"
               maxlength="80" placeholder="Ej. Parte de la quincena de mayo"
               autocomplete="off" />
      </div>

      <div class="modal__footer">
        <button type="button" class="btn btn-ghost" data-action="modal-close">Cancelar</button>
        <button type="submit" class="btn btn-primary">Guardar aporte</button>
      </div>
    </form>`;
}

// ── FORMULARIO MODAL - COMPROMISO MENSUAL (J.1b) ─────────────────

/**
 * HTML del formulario para definir o editar el compromiso mensual de ahorro
 * ("págate primero": cuánto se compromete el usuario a apartar cada mes).
 *
 * @param {number}      compromisoMensual Valor actual. 0 = sin compromiso.
 * @param {Object|null} sugerencia        Aporte sugerido (AH.2), salida de
 *                                        calcularAporteSugerido. null = sin caja.
 * @param {string}      [frecuencia]      Frecuencia real de cobro (AH.5, ADR
 *                                        049 D4), calculada por index.js. La
 *                                        pregunta y la caja de sugerencia se
 *                                        hacen en esa frecuencia, no en mensual
 *                                        asumido. Por defecto 'Mensual'.
 * @returns {string}
 */
export function renderFormCompromisoMensual(compromisoMensual, sugerencia = null, frecuencia = 'Mensual') {
  // AH.2: sin ingresos registrados, la sugerencia pide el promedio mensual
  // para afinarse. El valor no se guarda: solo recalcula la caja en vivo.
  const inputIngresoHtml = sugerencia?.base === 'sin-ingreso'
    ? `
      <div class="form-group">
        <label for="sugerencia-ingreso" class="label">¿Cuánto recibes al mes, aproximadamente? (COP) <span class="form-optional">opcional</span></label>
        <input id="sugerencia-ingreso" class="input" type="number"
               min="0" step="10000" placeholder="Ej. 1500000" inputmode="numeric" />
        <p class="form-hint">Solo se usa para afinar la sugerencia de abajo. No se guarda.</p>
      </div>`
    : '';

  const cajaHtml = sugerencia
    ? `<div id="caja-sugerencia">${renderCajaSugerencia(sugerencia, frecuencia)}</div>`
    : '';

  return `
    <form id="form-compromiso" novalidate>
      <div class="form-group">
        <label for="compromiso-monto" class="label">¿Cuánto quieres apartar ${etiquetaCadaPeriodo(frecuencia)}? (COP)</label>
        <input id="compromiso-monto" name="compromisoMensual" class="input" type="number"
               min="0" step="10000" value="${Number(compromisoMensual) || 0}"
               placeholder="0" inputmode="numeric" autofocus />
        <p class="form-hint">Pon 0 para quitar el compromiso. Es un recordatorio personal: no afecta tu saldo hasta que registres el aporte.</p>
      </div>

      ${inputIngresoHtml}
      ${cajaHtml}

      <div class="modal__footer">
        <button type="button" class="btn btn-ghost" data-action="modal-close">Cancelar</button>
        <button type="submit" class="btn btn-primary">Guardar</button>
      </div>
    </form>`;
}

/**
 * Caja con el aporte sugerido y su explicación (AH.2). Reutilizada por el
 * form del compromiso mensual (render inicial y recálculo en vivo cuando el
 * usuario escribe su ingreso promedio).
 *
 * @param {{ monto: number, base: string, razones: string[] }|null} sugerencia
 * @param {string} [frecuencia] una de FRECUENCIAS_APORTE (AH.5, ADR 049 D4):
 *   `sugerencia.monto` es mensual, el título y el botón se muestran en la
 *   frecuencia real de cobro. Por defecto 'Mensual'.
 * @returns {string}
 */
export function renderCajaSugerencia(sugerencia, frecuencia = 'Mensual') {
  if (!sugerencia) return '';
  const { monto, base, razones } = sugerencia;
  const razonesHtml = (razones ?? []).map(r => `<p class="nudge__desc">${r}</p>`).join('');

  if (monto <= 0) {
    const nivel = base === 'deficit' ? 'nudge-high' : 'nudge-success';
    const icono = base === 'deficit' ? icon('alert') : icon('trophy');
    return `
      <div class="nudge ${nivel}" role="status">
        <span class="nudge__icon" aria-hidden="true">${icono}</span>
        <div class="nudge__body">${razonesHtml}</div>
      </div>`;
  }

  const montoPeriodo = montoPorPeriodo(monto, frecuencia);
  return `
    <div class="nudge nudge-info" role="status">
      <span class="nudge__icon" aria-hidden="true">${icon('lightbulb')}</span>
      <div class="nudge__body">
        <p class="nudge__title">Sugerido: ${f(montoPeriodo)} ${etiquetaCadaPeriodo(frecuencia)}</p>
        ${razonesHtml}
        <button type="button" class="btn btn-ghost btn-sm"
                data-action="ahorro-usar-sugerido" data-monto="${montoPeriodo}">Usar este monto</button>
      </div>
    </div>`;
}

// `_fmtMeses` se retiró en DIS.16: decía "1,8 meses", que es lenguaje de hoja
// de cálculo para la cifra más importante de la sección. Lo reemplaza
// `mesesEnPalabras()` en logic.js, que dice "1 mes y 3 semanas".

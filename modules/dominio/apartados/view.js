/**
 * apartados/view.js - generación de HTML para el dominio de apartados.
 * Puede leer S. No puede mutarlo. Sin lógica de negocio.
 */

import { miles, desdeMiles } from '../../infra/miles.js';
import { S } from '../../core/state.js';
import { f, fechaLegible, hoy, esc as _esc } from '../../infra/utils.js';
import { iconoCategoria, emptyArt, icon } from '../../infra/icons.js';
import { SALDO_MASCARA_CUENTA } from '../../infra/render.js';
import { renderSelectorCuenta } from '../../infra/cuenta-helper.js';
import { renderIconoPicker } from '../../infra/icon-picker.js';
import { htmlComparador, pieComparador } from '../../ui/comparador.js';
import { estadoDeBolsa } from '../../infra/bolsas.js';
import { ICONOS_CATEGORIA_PERSONALIZADA } from '../../core/constants.js';
import { htmlFilaReserva } from './detalle.js';
import {
  agruparApartadosPorUrgencia,
  estaListoParaReiniciar,
  calcularProgreso,
  calcularAporteSugerido,
  planDeReferencia,
  diasHastaFecha,
  etiquetaPeriodoMeses,
  apartadosProximos,
  DIAS_PROXIMO,
  FRECUENCIAS_APORTE,
  PLANTILLAS_APARTADO,
  PLANTILLAS_APARTADO_FRECUENTES,
  PERIODO_RECURRENCIA_DEFAULT,
  ICONO_APARTADO_DEFAULT,
} from './logic.js';

/**
 * Tope de casillas que se dibujan para el plan (DIS.15). Un apartado a dos años
 * con aporte semanal preveía más de cien: dejarían de leerse como un camino y
 * pasarían a ser ruido de 1px. Pasado el tope, la segunda carrera se dibuja como
 * barra continua con la misma proporción, y su encabezado sigue diciendo el
 * conteo exacto ("34 de 104 aportes").
 */
const MAX_CASILLAS = 24;

// ── FORMATO DE MONTOS EN CAPTURA (T9, hallazgo A6, regla R16) ────
//
// El par formatear / leer vive en infra desde el ADR 120: lo usan todos los
// campos de dinero. Se reexporta con el nombre de siempre.
export { miles, desdeMiles };

// ── LISTA DE APARTADOS ───────────────────────────────────────────

/**
 * Renderiza la lista de apartados en `#lista-apartados`.
 * No-op si el contenedor no existe.
 */
export function renderListaApartados() {
  const el = document.getElementById('lista-apartados');
  if (!el) return;

  const { listas, proximas, adelante, sinFecha } = agruparApartadosPorUrgencia(S.apartados, hoy());
  const activos = [...listas, ...proximas, ...adelante, ...sinFecha];
  const oculto  = S.config?.ocultarSaldo === true;

  if (activos.length === 0) {
    el.innerHTML = _renderEmptyState();
    return;
  }

  if (reservasEnTelefono()) {
    el.innerHTML = _renderListaTelefono({ listas, proximas, adelante, sinFecha }, activos, oculto);
    return;
  }

  // Los divisores solo se pintan cuando hay más de un grupo que separar: con
  // todas las reservas en el mismo cajón el rótulo nombraría lo único que hay.
  // Mismo criterio que la lista de Metas (ficha 09).
  const grupos = [
    ['Listas para usar',                  listas,   a => _renderFilaLista(a, oculto)],
    [`Vencen en ${DIAS_PROXIMO} días`,    proximas, a => _renderApartadoCard(a, oculto)],
    ['Más adelante',                      adelante, a => _renderApartadoCard(a, oculto)],
    ['Sin fecha',                         sinFecha, a => _renderApartadoCard(a, oculto)],
  ].filter(([, items]) => items.length > 0);

  const conDivisor = grupos.length > 1;

  el.innerHTML = _renderComparador(activos) + grupos
    .map(([rotulo, items, render]) =>
      (conDivisor ? _divisorGrupo(rotulo) : '') + items.map(render).join(''))
    .join('');
}

/** Bajo 1024px la lista se pinta en filas con su hoja (ADR 133 D4). */
export function reservasEnTelefono() {
  return window.matchMedia?.('(max-width: 1023.98px)').matches === true;
}

/**
 * La lista en el teléfono (ADR 133 D4): arriba lo reservado con la pastilla
 * de lo que vence en 30 días y la pista de cómo se lee cada fila; debajo los
 * grupos en frase, cada uno una tarjeta con una fila por reserva. El aviso de
 * proximidad y el comparador quedan para escritorio: la pastilla dice lo mismo
 * que el aviso y cada barra ya trae su rayita.
 */
function _renderListaTelefono({ listas, proximas, adelante, sinFecha }, activos, oculto) {
  const m = (n) => (oculto ? SALDO_MASCARA_CUENTA : f(n));
  const total = activos.reduce((s, a) => s + (Number(a.montoActual) || 0), 0);
  const faltaProximas = proximas.reduce((s, a) => s + calcularProgreso(a).faltante, 0);
  const vencen = apartadosProximos(S.apartados, hoy()).length;

  const pastilla = vencen > 0
    ? `<p class="reservas-resumen__pastilla"><svg class="icon" aria-hidden="true"><use href="#i-agenda"/></svg>${vencen} ${vencen === 1 ? 'vence' : 'vencen'} en ${DIAS_PROXIMO} días · te faltan <strong>${m(faltaProximas)}</strong></p>`
    : '';
  const pista = activos.some(a => !estaListoParaReiniciar(a))
    ? `<p class="bolsa-pista"><svg class="icon" aria-hidden="true"><use href="#i-plus"/></svg>Toca + para aportar lo que te toca. La rayita de cada barra marca dónde deberías ir hoy.</p>`
    : '';

  const grupos = [
    ['Listas para usar', listas, ''],
    [`Vencen en ${DIAS_PROXIMO} días`, proximas, faltaProximas > 0 ? `faltan ${m(faltaProximas)}` : ''],
    ['Más adelante', adelante, ''],
    ['Sin fecha', sinFecha, '', 'Ponles fecha y Finko calcula cuánto separar'],
  ].filter(([, items]) => items.length > 0);
  const conTitulo = grupos.length > 1;

  const gruposHtml = grupos.map(([titulo, items, suma, sub]) => `
    <section class="bolsa-grupo"${conTitulo ? ` aria-label="${_esc(titulo)}"` : ''}>
      ${conTitulo ? `
      <div class="bolsa-grupo__head">
        <h2 class="bolsa-grupo__titulo">${_esc(titulo)}</h2>
        ${suma ? `<p class="bolsa-grupo__suma">${suma}</p>` : ''}
      </div>
      ${sub ? `<p class="bolsa-grupo__sub">${_esc(sub)}</p>` : ''}` : ''}
      <div class="bolsa-lista">${items.map(a => htmlFilaReserva(a, oculto)).join('')}</div>
    </section>`).join('');

  return `
    <section class="reservas-resumen" aria-labelledby="reservas-resumen-titulo">
      <h2 class="reservas-resumen__rotulo" id="reservas-resumen-titulo">Tienes reservado</h2>
      <p class="reservas-resumen__total">${m(total)}</p>
      ${pastilla}
    </section>
    ${pista}
    ${gruposHtml}`;
}

/**
 * Divisor de grupo de la lista (ficha 10). Es el mismo componente con el que
 * Por pagar separa fijos de deudas y con el que la lista de Metas separa lo que
 * tiene plazo de lo que no.
 *
 * @param {string} rotulo
 * @returns {string}
 */
function _divisorGrupo(rotulo) {
  return `
    <div class="grupo-eyebrow-fila">
      <p class="grupo-eyebrow">${_esc(rotulo)}</p>
    </div>`;
}

/**
 * Fila compacta de una reserva ya reunida (ficha 10, hallazgo V2).
 *
 * La tarjeta completa medía 307px para decir una sola cosa: úsala y reinicia.
 * Y no es una impresión, está en el cálculo: `_renderCarreras()` hace
 * `aportesEsperados = listo ? totalAportes : plan.aportesEsperados`, así que
 * con el dinero reunido **la segunda carrera se iguala a la primera por
 * definición**. Dos barras llenas comparándose entre sí no informan de nada.
 *
 * Dos diferencias deliberadas con la fila de una meta cumplida (ADR 082 D3),
 * y las dos salen del comportamiento, no del estilo:
 *
 * - **Conserva su acción.** Una meta cumplida es historia; una reserva reunida
 *   está esperando un toque, y ese toque es lo único que se puede resolver hoy
 *   en la sección.
 * - **Va arriba, no al final.** Enterrar lo que hay que usar es como se acaba
 *   pagando el SOAT dos veces.
 *
 * @param {import('../../core/state.js').Apartado} apartado
 * @param {boolean} oculto `S.config.ocultarSaldo` (regla R20).
 * @returns {string}
 */
function _renderFilaLista(apartado, oculto) {
  const id     = _esc(apartado.id);
  const nombre = _esc(apartado.nombre ?? 'Reserva');
  const m      = valor => (oculto ? SALDO_MASCARA_CUENTA : f(valor));

  const acumulado = Number(apartado.montoActual) || 0;
  const vence = apartado.fechaObjetivo ? ` · vence el ${fechaLegible(apartado.fechaObjetivo)}` : '';

  return `
    <div class="apartado-fila" data-id="${id}" data-dom="apartados">
      <span class="apartado-fila__glifo" aria-hidden="true">${_iconoApartado(apartado)}</span>
      <span class="apartado-fila__cuerpo">
        <span class="apartado-fila__nombre">${nombre}</span>
        <span class="apartado-fila__dato">${m(acumulado)} listos${vence}</span>
      </span>
      <button class="apartado-fila__accion" type="button"
              data-action="reiniciar-apartado" data-id="${id}"
              aria-label="Marcar ${nombre} como usado y reiniciar el ciclo">Ya lo usé</button>
    </div>`;
}

/**
 * El comparador, encima de la lista (DIS.19, item 5 del informe de gráficos).
 *
 * Cada tarjeta responde bien "¿cómo va este apartado?" y ninguna responde "de
 * los cuatro, ¿cuál va mal?": para saberlo hay que recorrer la lista y recordar
 * lo que decía la anterior. El comparador pone las columnas contra la misma
 * escala y esa pregunta se contesta de un vistazo. Las tarjetas de abajo no
 * cambian: la vista de conjunto y el detalle hacen trabajos distintos.
 *
 * No es interactivo. Tocar una columna no tendría a dónde llevar (las tarjetas
 * ya están debajo, en el mismo orden), así que el gráfico va `aria-hidden` y su
 * lectura la da el pie en palabras, que además nombra a los atrasados.
 *
 * Con un solo apartado no se dibuja: comparar una columna con nada es ruido, y
 * su tarjeta ya dice todo lo que el gráfico diría.
 *
 * @param {Array<import('../../core/state.js').Apartado>} activos
 * @returns {string}
 */
function _renderComparador(activos) {
  if (activos.length < 2) return '';

  const columnas = activos.map(a => _columnaComparador(a));

  return `
    <div class="apartados-comparador">
      ${htmlComparador(columnas, {
        titulo: 'Todos, uno al lado del otro',
        medida: 'altura = lo reunido',
        pie:    pieComparador(columnas),
      })}
    </div>`;
}

/**
 * Traduce un apartado a la columna que el comparador sabe dibujar.
 *
 * La altura es el dinero reunido y la marca es el plan, las dos en porcentaje de
 * su propio objetivo: así una bolsa de $800.000 y otra de $1.900.000 se comparan
 * por qué tan cerca están de lo suyo, que es la pregunta, y no por su tamaño.
 *
 * Un apartado ya reunido lleva su marca al 100%: el plan está cumplido aunque el
 * calendario no haya corrido entero (se pueden adelantar cuotas), el mismo
 * criterio que la segunda carrera de su tarjeta.
 *
 * @param {import('../../core/state.js').Apartado} apartado
 * @returns {Object} columna para `htmlComparador()`.
 */
function _columnaComparador(apartado) {
  const e = estadoDeBolsa(apartado, hoy());

  return {
    id:        apartado.id,
    nombre:    apartado.nombre,
    iconoHtml: _iconoApartado(apartado),
    pct:       e.pct,
    plan:      e.planPct,
    nota:      _notaColumna(e),
    estado:    e.reunido ? 'listo' : e.atrasada ? 'atras' : '',
  };
}

/**
 * La nota bajo el nombre de la columna: el plazo en la unidad más corta que
 * quepa. Sin fecha no se inventa un plazo, se dice que falta.
 */
function _notaColumna({ reunido, dias }) {
  if (reunido)       return 'listo';
  if (dias === null) return 'sin fecha';
  if (dias > 0)      return dias === 1 ? '1 día' : `${dias} días`;
  if (dias === 0)    return 'es hoy';
  return 'vencido';
}

/**
 * Ícono de un apartado (CAT.2c): `apartado.icono` puede tener dos formatos,
 * sin bump de schema. Un id de símbolo del sprite (elegido con el picker
 * compartido desde esta rebanada, ej. 'c-carro') o un emoji crudo (plantillas
 * rápidas de `PLANTILLAS_APARTADO`, que conservan su propio catálogo curado
 * de emojis por ser más específicas que el catálogo genérico del picker; o
 * apartados viejos creados con el campo de texto libre anterior a CAT.2c).
 * Se distingue por el patrón `letra-` que ningún emoji real produce (mismo
 * criterio que `_iconoMeta()` en metas/view.js, CAT.2b).
 *
 * @param {import('../../core/state.js').Apartado} apartado
 * @returns {string}
 */
function _iconoApartado(apartado) {
  const valor = apartado.icono ?? ICONO_APARTADO_DEFAULT;
  return /^[a-z]-/.test(valor) ? iconoCategoria(valor) : _esc(valor);
}

/**
 * DIS.15 (arquitectura E, "las dos carreras"): el apartado deja de ser una fila
 * de Metas con datos añadidos y pasa a ser una tarjeta propia. Un apartado no es
 * una meta: la fecha no es una aspiración sino un **vencimiento externo**, y el
 * logro no es llegar al 100% algún día sino no quedar corto el día del cobro.
 * De ahí sale toda la estructura:
 *
 * - **El protagonista es el plazo, no el dinero.** El bloque grande dice cuántos
 *   días faltan; el anillo de progreso se retira y el badge de días deja de ser
 *   un badge al final del subtítulo.
 * - **Dos carreras enfrentadas:** arriba el dinero reunido, abajo lo que el plan
 *   preveía tener hecho a hoy, dibujado en aportes. Se comparan por longitud,
 *   así que la tarjeta se entiende sin leer un solo número. Las dos filas usan
 *   la misma tinta a propósito: si una se dibujara más vistosa, ganaría el
 *   vistazo y la comparación se invertiría.
 * - **El veredicto habla solo con un aporte completo de diferencia.** Por debajo
 *   de eso calla y las barras hablan solas: sin ese umbral, quien aporta
 *   puntualmente aparecería atrasado los días previos a cada aporte.
 * - **Un dato que no existe se ofrece, no se rellena (regla R57):** sin fecha
 *   objetivo no hay días, ni plan, ni sugerencia, así que el monto reunido sube
 *   al lugar protagonista y la tarjeta dice qué ganaría con una fecha, en vez de
 *   fingir la segunda carrera.
 * - **El estado terminal cambia el dato, no solo el botón:** al completarse, el
 *   bloque grande pasa de "cuánto falta" a "cuánto sobró" y la acción principal
 *   deja de ser aportar para ser cerrar el ciclo.
 * - **Regla R20:** toda cifra en pesos pasa por la máscara del ojo. El
 *   porcentaje, las barras, los días y el conteo de aportes no: no revelan
 *   cuánto dinero hay.
 *
 * @param {import('../../core/state.js').Apartado} apartado
 * @param {boolean} [oculto=false] `S.config.ocultarSaldo`.
 */
function _renderApartadoCard(apartado, oculto = false) {
  const nombre = _esc(apartado.nombre);
  const id     = _esc(apartado.id);
  const icono  = _iconoApartado(apartado);
  const hoyISO = hoy();

  const { porcentaje, faltante, completado } = calcularProgreso(apartado);
  const listo    = estaListoParaReiniciar(apartado);
  const sugerido = listo ? null : calcularAporteSugerido(apartado, hoyISO);
  const plan     = planDeReferencia(apartado, hoyISO);
  const dias     = diasHastaFecha(apartado.fechaObjetivo, hoyISO);

  const objetivo  = apartado.montoObjetivo ?? 0;
  const acumulado = apartado.montoActual ?? 0;
  const enCero    = acumulado <= 0;
  const m         = (n) => oculto ? SALDO_MASCARA_CUENTA : f(n);

  const chipHtml = apartado.recurrente
    ? `<span class="apartado-card__chip">${_esc(etiquetaPeriodoMeses(apartado.periodoMeses ?? PERIODO_RECURRENCIA_DEFAULT))}</span>`
    : '';

  return `
    <article class="apartado-card${listo ? ' apartado-card--listo' : ''}" data-id="${id}" data-dom="ahorro">
      <div class="apartado-card__head">
        <p class="apartado-card__nombre"><span class="apartado-card__glifo" aria-hidden="true">${icono}</span> ${nombre}</p>
        ${chipHtml}
      </div>
      ${_renderFoco(apartado, { listo, dias, acumulado, objetivo, m })}
      ${_renderCarreras({ porcentaje, plan, listo, enCero })}
      ${_renderVeredicto({ apartado, plan, listo, enCero, m })}
      <div class="apartado-card__datos">
        ${_renderDatos({ apartado, listo, enCero, sugerido, acumulado, objetivo, faltante, m })}
      </div>
      ${apartado.fechaObjetivo || listo ? '' : `
      <p class="apartado-card__nota">Con una fecha objetivo, Finko calcula cuánto separar en cada pago para llegar a tiempo.</p>`}
      <div class="apartado-card__acciones">
        ${_renderAccionPrincipal({ nombre, id, listo, completado, enCero, sugerido, oculto })}
        <div class="apartado-card__secundarias">
          <button class="btn btn-ghost btn-sm apartado-card__secundaria"
                  type="button"
                  data-action="toggle-recurrente-apartado"
                  data-id="${id}"
                  aria-pressed="${apartado.recurrente === true ? 'true' : 'false'}"
                  aria-label="${apartado.recurrente === true ? 'Desactivar' : 'Activar'} recurrencia de ${nombre}">${apartado.recurrente === true ? 'Recurrente' : 'Hacer recurrente'}</button>
          <button class="btn btn-ghost btn-sm apartado-card__secundaria"
                  type="button"
                  data-action="editar-apartado"
                  data-id="${id}"
                  aria-label="Editar reserva ${nombre}">Editar</button>
          <button class="btn btn-ghost btn-sm apartado-card__secundaria"
                  type="button"
                  data-action="eliminar-apartado"
                  data-id="${id}"
                  aria-label="Eliminar reserva ${nombre}">Eliminar</button>
        </div>
      </div>
    </article>`;
}

/**
 * Bloque protagonista de la tarjeta. Cambia de dato, no solo de formato: días
 * que faltan mientras el apartado corre, cuánto sobró cuando ya está reunido, y
 * el monto acumulado cuando no hay fecha contra la que contar días.
 */
function _renderFoco(apartado, { listo, dias, acumulado, objetivo, m }) {
  let dato = '';
  let nota = '';
  let clase = '';

  if (listo) {
    clase = ' apartado-card__foco-dato--texto';
    dato  = 'Ya lo reuniste';
    nota  = dias !== null && dias >= 0
      ? `con ${dias === 1 ? '1 día' : `${dias} días`} de sobra`
      : 'listo para usar';
  } else if (!apartado.fechaObjetivo) {
    clase = ' apartado-card__foco-dato--monto';
    dato  = m(acumulado);
    nota  = `de ${m(objetivo)} reunidos`;
  } else if (dias === null) {
    return '';
  } else if (dias > 0) {
    dato = String(dias);
    nota = `${dias === 1 ? 'día' : 'días'} para el ${fechaLegible(apartado.fechaObjetivo)}`;
  } else if (dias === 0) {
    clase = ' apartado-card__foco-dato--texto';
    dato  = 'Es hoy';
    nota  = `vence el ${fechaLegible(apartado.fechaObjetivo)}`;
  } else {
    dato = String(Math.abs(dias));
    nota = `${dias === -1 ? 'día' : 'días'} de retraso · vencía el ${fechaLegible(apartado.fechaObjetivo)}`;
  }

  return `
      <div class="apartado-card__foco">
        <p class="apartado-card__foco-dato${clase}">${dato}</p>
        <p class="apartado-card__foco-nota">${nota}</p>
      </div>`;
}

/**
 * Las dos carreras. La primera siempre; la segunda solo cuando hay plan que
 * dibujar (necesita fecha objetivo). Pasado `MAX_CASILLAS` el plan se dibuja
 * como barra continua: el encabezado sigue diciendo el conteo exacto.
 */
function _renderCarreras({ porcentaje, plan, listo, enCero }) {
  const dinero = `
        <div class="apartado-card__carrera">
          <p class="apartado-card__carrera-head"><span>Dinero reunido</span><span>${porcentaje}%</span></p>
          <div class="apartado-card__barra"><div class="apartado-card__barra-fill" style="width:${porcentaje}%"></div></div>
        </div>`;

  if (!plan) {
    return `<div class="apartado-card__carreras">${dinero}</div>`;
  }

  const rotulo = listo ? 'Deberían estar hechos' : enCero ? 'Tu plan' : 'Deberías llevar';
  const { totalAportes } = plan;
  // Con el dinero ya reunido las dos carreras se igualan: el plan está cumplido
  // aunque el calendario no haya corrido entero (se puede adelantar cuotas).
  const aportesEsperados = listo ? totalAportes : plan.aportesEsperados;

  const planHtml = totalAportes <= MAX_CASILLAS
    ? `<div class="apartado-card__casillas" style="--fk-casillas:${totalAportes}">
             ${Array.from({ length: totalAportes }, (_, i) =>
               `<span class="apartado-card__casilla${i < aportesEsperados ? ' apartado-card__casilla--on' : ''}"></span>`).join('')}
           </div>`
    : `<div class="apartado-card__barra"><div class="apartado-card__barra-fill" style="width:${Math.round((aportesEsperados / totalAportes) * 100)}%"></div></div>`;

  return `
      <div class="apartado-card__carreras">
        ${dinero}
        <div class="apartado-card__carrera">
          <p class="apartado-card__carrera-head"><span>${rotulo}</span><span>${aportesEsperados} de ${totalAportes} aportes</span></p>
          ${planHtml}
        </div>
      </div>`;
}

/**
 * El veredicto: la única línea de la tarjeta que emite un juicio. Solo aparece
 * cuando hay algo que decir, y con el atraso el umbral es un aporte completo.
 */
function _renderVeredicto({ apartado, plan, listo, enCero, m }) {
  let texto = '';

  if (listo) {
    texto = `Cuando pagues ${_esc(apartado.nombre)}, marca "Ya lo usé" y arranca el ciclo siguiente.`;
  } else if (plan && plan.delta <= -1) {
    const cuantos = Math.abs(plan.delta);
    texto = `Vas ${cuantos === 1 ? 'un aporte' : `${cuantos} aportes`} atrás del plan. Repón ${m(plan.cuotaPrevista * cuantos)} y quedas al día.`;
  } else if (plan && plan.delta >= 1) {
    const cuantos = plan.delta;
    texto = `Vas ${cuantos === 1 ? 'un aporte' : `${cuantos} aportes`} adelante. Con ${m(calcularProgreso(apartado).faltante)} más quedas cubierto antes de la fecha.`;
  } else if (plan && enCero) {
    texto = 'Vas al día: el plan arranca ahora. Empieza con el primer aporte y el resto sale solo.';
  }

  return texto === '' ? '' : `<p class="apartado-card__veredicto">${texto}</p>`;
}

/** Las dos líneas de detalle del pie, distintas en cada estado. */
function _renderDatos({ apartado, listo, enCero, sugerido, acumulado, objetivo, faltante, m }) {
  const planLinea = sugerido
    ? `<p class="apartado-card__dato">${sugerido.numPeriodos} ${sugerido.numPeriodos === 1 ? 'aporte' : 'aportes'} de ${m(sugerido.aportePorPeriodo)} ${_esc(sugerido.etiquetaPeriodo)}</p>`
    : '';

  if (listo) {
    const vence = apartado.fechaObjetivo ? ` · vence el ${fechaLegible(apartado.fechaObjetivo)}` : '';
    return `<p class="apartado-card__dato apartado-card__dato--fuerte">${m(acumulado)} listos${vence}</p>`;
  }

  if (!apartado.fechaObjetivo) {
    return `<p class="apartado-card__dato apartado-card__dato--fuerte">Faltan ${m(faltante)}</p>
        <p class="apartado-card__dato apartado-card__dato--suave">Sin fecha objetivo</p>`;
  }

  if (enCero) {
    return `<p class="apartado-card__dato apartado-card__dato--fuerte">Objetivo ${m(objetivo)}</p>
        ${planLinea}`;
  }

  return `<p class="apartado-card__dato apartado-card__dato--fuerte">${m(acumulado)} de ${m(objetivo)} · faltan ${m(faltante)}</p>
        ${planLinea}`;
}

/**
 * La acción principal es contextual: cerrar el ciclo cuando el dinero ya está,
 * nombrar el primer paso cuando no hay nada aportado, y traer el monto ya
 * decidido cuando hay plan (con el saldo oculto el monto no se imprime: el
 * botón es la última cifra en pesos que quedaría a la vista).
 */
function _renderAccionPrincipal({ nombre, id, listo, completado, enCero, sugerido, oculto }) {
  if (listo) {
    return `<button class="apartado-card__principal"
                type="button"
                data-action="reiniciar-apartado"
                data-id="${id}"
                aria-label="Marcar ${nombre} como usado y reiniciar el ciclo">Ya lo usé</button>`;
  }
  if (completado) return '';

  // ADR 107 D2: sin "+", que es de crear una ficha; aportar mueve dinero.
  const etiqueta = enCero
    ? 'Hacer el primer aporte'
    : (sugerido && !oculto ? `Aportar ${f(sugerido.aportePorPeriodo)}` : 'Aportar');

  return `<button class="apartado-card__principal"
                type="button"
                data-action="aportar-apartado"
                data-id="${id}"
                aria-label="Aportar a ${nombre}">${etiqueta}</button>`;
}

/**
 * Estado vacío (T11 y T12, hallazgos A9 y A10).
 *
 * Antes eran cinco bloques de texto con el botón en el medio (562px medidos),
 * y encima el banner de propósito: seis párrafos seguidos para el usuario
 * nuevo. El tip educativo se fusiona con la descripción y ahí mismo se cierra
 * el hueco de A9: crear un apartado NO mueve dinero (`normalizarApartado()`
 * nace en `montoActual: 0` y no toca ninguna cuenta), el dinero se aparta en
 * el primer aporte, y ninguna pantalla lo decía mientras el copy sugería lo
 * contrario. La desambiguación con Límites de gasto se queda (son dos
 * secciones que se confunden) en una línea debajo del CTA, que baja a
 * secundario porque "+ Apartado" del encabezado ya es el primario (regla R1).
 */
function _renderEmptyState() {
  // ADR 133 D4: en el teléfono el botón vive dentro de la tarjeta del banner y
  // es el primario (el "+ Reserva" del encabezado se esconde mientras está
  // vacía); la salida a Límites va al pie, fuera de la tarjeta.
  return `
    <div class="empty-state">
      <div class="empty-state__icon">${emptyArt('apartados')}</div>
      <p class="empty-state__title">Sin reservas todavía</p>
      <p class="empty-state__desc">Ponle nombre, monto y fecha a un gasto que viene, y Finko te dice cuánto separar en cada pago. El dinero se aparta cuando registras el primer aporte.</p>
      <button class="btn btn-secondary reservas-vacio__crear" data-action="nuevo-apartado"><svg class="icon" aria-hidden="true"><use href="#i-plus"/></svg>Crear mi primera reserva</button>
    </div>
    <div class="reservas-vacio__pie">
      <p>¿Buscabas ponerle tope a lo que gastas? Eso va en Límites, dentro de Gastos.</p>
      <a class="fondo-vacio__salida" href="#presupuesto">Ir a Límites<svg class="icon" aria-hidden="true"><use href="#i-chevron-right"/></svg></a>
    </div>`;
}

// ── NUDGE DE PROXIMIDAD ──────────────────────────────────────────

/**
 * Renderiza un aviso cuando hay apartados con fecha objetivo dentro de
 * `DIAS_PROXIMO`. No-op si el contenedor no existe o no hay ninguno.
 */
export function renderNudgeApartadosProximos() {
  const el = document.getElementById('apartados-nudge-proximos');
  if (!el) return;

  const proximos = apartadosProximos(S.apartados, hoy());
  if (proximos.length === 0) { el.innerHTML = ''; return; }

  el.innerHTML = _renderNudgeProximos(proximos, S.config?.ocultarSaldo === true);
}

/**
 * Aviso de proximidad (T7, hallazgo A3, reglas R25 y R27).
 *
 * Antes mostraba el apartado más urgente con su fecha y su aporte sugerido, y
 * ese mismo apartado aparecía 60px más abajo en la lista con los mismos dos
 * datos: 86px para no agregar nada. Ahora hace lo único que la lista no puede,
 * que es sumar: cuántos vencen dentro del umbral y cuánto falta reunir entre
 * todos. Con la lista ordenada por urgencia, el primero es el que apura.
 * Sin `role="status"`: se repinta en cada render (T6, regla R24).
 *
 * DIS.15 (regla R20): la suma que este aviso muestra también es dinero, así que
 * respeta el ojo de privacidad como el resto de la sección.
 *
 * @param {import('../../core/state.js').Apartado[]} proximos - ordenados de más urgente.
 * @param {boolean} [oculto=false] `S.config.ocultarSaldo`.
 * @returns {string}
 */
function _renderNudgeProximos(proximos, oculto = false) {
  const cuantos  = proximos.length;
  const faltante = proximos.reduce((acc, a) => acc + calcularProgreso(a).faltante, 0);
  const monto    = oculto ? SALDO_MASCARA_CUENTA : f(faltante);

  const tituloStr = cuantos === 1
    ? `1 reserva vence en los próximos ${DIAS_PROXIMO} días`
    : `${cuantos} reservas vencen en los próximos ${DIAS_PROXIMO} días`;

  const descStr = cuantos === 1
    ? `Te falta reunir <strong>${monto}</strong>.`
    : `Te falta reunir <strong>${monto}</strong> entre los ${cuantos}.`;

  return `
    <div class="nudge nudge-info">
      <span class="nudge__icon" aria-hidden="true">${icon('agenda')}</span>
      <div class="nudge__body">
        <p class="nudge__title">${tituloStr}</p>
        <p class="nudge__desc">${descStr}</p>
      </div>
    </div>`;
}

// ── FORMULARIO: NUEVO APARTADO ───────────────────────────────────

/** Lo que dice la pista bajo la fecha antes de que haya monto y fecha. */
export const SUGERENCIA_INICIAL = 'Con fecha, Finko calcula cuánto separar en cada aporte.';

/**
 * Devuelve el HTML del formulario de apartado, con plantillas rápidas y un
 * hint en vivo del aporte sugerido (lo actualiza el listener en index.js).
 *
 * EDIT.1: `apartado` (opcional) distingue crear de editar. Al editar se
 * prellenan nombre, ícono, objetivo, fecha, frecuencia y nota; las plantillas
 * rápidas se ocultan (ya no hace falta elegir de cero) y no se toca
 * `montoActual` ni `recurrente`/`periodoMeses` (los preserva
 * `normalizarApartado(datos, apartadoExistente)`, la recurrencia vive en su
 * propio toggle sobre la tarjeta).
 *
 * @param {import('../../core/state.js').Apartado|null} [apartado] modo edición si se pasa.
 * @param {string} [frecuenciaPreferida] Pre-selección derivada de S.ingresos (solo al crear).
 * @returns {string}
 */
export function renderFormApartado(apartado = null, frecuenciaPreferida = 'Mensual') {
  // T4 (A8): las 6 frecuentes a la vista, las otras 14 plegadas.
  // AP.5b (ADR 042 D9): lenguaje de chips-cat compartido en vez del `.chip`
  // pildora suelto. No son radios: el nombre sigue siendo texto libre debajo
  // (no hay un valor final fijo que "quede marcado"), la plantilla solo
  // prellena nombre + icono, igual que antes.
  const chip = (p) => `
      <button type="button" class="chip-cat"
              data-action="apartado-plantilla"
              data-nombre="${_esc(p.nombre)}" data-icono="${_esc(p.icono)}">
        <span class="chip-cat__icono" aria-hidden="true">${_esc(p.icono)}</span>
        <span class="chip-cat__label">${_esc(p.nombre)}</span>
      </button>`;

  const frecuentes = PLANTILLAS_APARTADO.filter(p => PLANTILLAS_APARTADO_FRECUENTES.includes(p.nombre));
  const resto      = PLANTILLAS_APARTADO.filter(p => !PLANTILLAS_APARTADO_FRECUENTES.includes(p.nombre));

  // ADR 133 D7: las otras plantillas se abren desde un chip más ("14 más"),
  // al final de la fila, en vez de un enlace aparte.
  const plantillasHtml = frecuentes.map(chip).join('');
  const restoHtml      = resto.length === 0 ? '' : `
        <details class="chips-mas">
          <summary class="chip-cat chip-cat--mas" aria-label="Ver las otras ${resto.length} plantillas">${resto.length} más</summary>
          <div class="chips-cat" role="group" aria-label="Más plantillas de reserva">
            ${resto.map(chip).join('')}
          </div>
        </details>`;

  // ADR 133 D7: la frecuencia en cuatro botones a la vista, no en una lista.
  const frecuenciaActual = apartado?.frecuenciaAporte ?? frecuenciaPreferida;
  const frecOpts = FRECUENCIAS_APORTE
    .map(fr => `
          <label class="familia-segmento__op"><input class="sr-only" type="radio" name="frecuenciaAporte" value="${_esc(fr)}"${fr === frecuenciaActual ? ' checked' : ''} /><span>${_esc(fr)}</span></label>`)
    .join('');

  const botonTexto = apartado ? `${icon('check')} Actualizar reserva` : `${icon('check')} Crear reserva`;

  return `
    <form id="form-apartado" novalidate data-preguntas="${apartado ? 'Tu reserva' : 'Nueva reserva'}"
          data-resumen-titulo="Así queda tu reserva" data-preguntas-inicio="${apartado ? 'resumen' : ''}">
      <div data-pregunta="¿Para qué pago te quieres preparar?" data-pregunta-id="nombre" data-resumen="Reserva" data-no-avanza
           data-ayuda="Toca uno para llenar el nombre, o escribe el tuyo." data-falta="Ponle un nombre a la reserva.">
      ${apartado ? '' : `
      <p class="reserva-form__pregunta">¿Para qué pago te quieres preparar?</p>
      <p class="form-hint reserva-form__sub">Toca uno para llenar el nombre, o escribe el tuyo.</p>
      <div class="chips-cat" role="group" aria-label="Plantillas de reserva">
        ${plantillasHtml}${restoHtml}
      </div>`}

      <div class="form-group">
        <label for="apartado-nombre" class="label">Nombre</label>
        <div class="apartado-nombre-row">
          ${renderIconoPicker(ICONOS_CATEGORIA_PERSONALIZADA, { id: 'apartado-icono', nombreCampo: 'icono', label: '', valorActual: _valorIconoEditable(apartado) })}
          <input id="apartado-nombre" name="nombre" class="input apartado-nombre-row__nombre" type="text"
                 placeholder="Ej. SOAT, Productos personales" required aria-required="true" autocomplete="off"
                 value="${_esc(apartado?.nombre ?? '')}" />
        </div>
      </div>
      </div>
      <div class="monto-hero" data-pregunta="¿Cuánto necesitas reunir?" data-pregunta-id="objetivo" data-resumen="Necesitas"
           data-falta="Escribe cuánto necesitas. Por ejemplo: 520.000">
        <label class="monto-hero__label" for="apartado-objetivo">¿Cuánto necesitas reunir?</label>
        <div class="monto-hero__box">
          <span class="monto-hero__prefijo" aria-hidden="true">$</span>
          <input id="apartado-objetivo" name="montoObjetivo" class="input input--big-amount" type="text"
                 placeholder="0" required aria-required="true"
                 inputmode="numeric" autocomplete="off" data-miles
                 value="${apartado ? miles(String(apartado.montoObjetivo ?? '')) : ''}" />
        </div>
        <span class="monto-hero__hint">COP</span>
      </div>
      <div class="form-group" data-opcional="Para cuándo">
        <label for="apartado-fecha" class="label">¿Para cuándo lo necesitas? <span class="form-optional">Opcional</span></label>
        <input id="apartado-fecha" name="fechaObjetivo" class="input" type="date" value="${_esc(apartado?.fechaObjetivo ?? '')}" />
        <p id="apartado-sugerencia-live" class="form-hint" aria-live="polite">${SUGERENCIA_INICIAL}</p>
      </div>
      <fieldset class="form-group reserva-form__frecuencia" data-opcional="Cada cuánto aportas" data-resumen="Cada cuánto aportas">
        <legend class="label">¿Cada cuánto puedes aportar?</legend>
        <div class="familia-segmento bolsa-frecuencia">${frecOpts}
        </div>
      </fieldset>

      <div class="form-group" data-opcional="Nota">
        <label for="apartado-nota" class="label">Nota <span class="form-optional">Opcional</span></label>
        <input id="apartado-nota" name="nota" class="input" type="text" maxlength="80"
               placeholder="Ej.: la moto de Andrés"
               value="${_esc(apartado?.nota ?? '')}" />
      </div>

      <div class="modal__footer modal__footer--principal">
        <button type="button" class="btn btn-ghost" data-action="modal-close">Cancelar</button>
        <button type="submit" class="btn btn-primary">${botonTexto}</button>
      </div>
    </form>`;
}

/**
 * Valor a prellenar en el selector de ícono al editar. Un apartado creado
 * desde una plantilla rápida guarda el emoji curado tal cual (`_aplicarPlantilla`
 * en index.js, no pasa por el picker), y un emoji no es un `data-icon` válido
 * del catálogo: el picker arrancaría con el recuadro vacío en vez de romperse
 * intentando resolverlo como símbolo (mismo criterio de `metas/view.js`).
 * @param {import('../../core/state.js').Apartado|null} apartado
 * @returns {string|null}
 */
function _valorIconoEditable(apartado) {
  if (!apartado?.icono) return null;
  return /^[a-z]-/.test(apartado.icono) ? apartado.icono : null;
}

// ── FORMULARIO: APORTAR A UN APARTADO ────────────────────────────

/**
 * Devuelve el HTML del formulario para aportar dinero a un apartado existente.
 * Reusa el patrón 0/1/varias cuentas: con una sola cuenta activa la asume.
 *
 * @param {import('../../core/state.js').Apartado} apartado
 * @param {{aportePorPeriodo:number, etiquetaPeriodo:string}|null} [sugerencia]
 *   Salida de `calcularAporteSugerido()` (AP.5a): con fecha objetivo y
 *   frecuencia, el monto ya calculado prellena el campo en vez de dejarlo en
 *   blanco (el usuario ya vio este número en el hint del propio apartado; no
 *   tiene sentido pedirle que lo vuelva a escribir). Sigue siendo editable.
 * @returns {string}
 */
export function renderFormAporteApartado(apartado, sugerencia = null) {
  const { faltante } = calcularProgreso(apartado);

  // T10 (A12): una sola línea de contexto, legible, arriba del campo. Antes
  // iba con `form-hint--muted` (la clase de las ayudas atenuadas) y decía
  // "faltan" por tercera vez, después de la fila que el usuario acaba de tocar
  // y del anillo; el porcentaje entre paréntesis tampoco agregaba. La fecha,
  // que es el dato que faltaba en esta hoja, entra en su lugar.
  // ADR 133 D4: antes del monto, cuánto llevas con la barra y su rayita, y si
  // vas atrás; las preguntas en frase, como "Nuevo gasto" (ADR 132 D9).
  const { pct, planPct } = estadoDeBolsa(apartado, hoy());
  const plan = planDeReferencia(apartado, hoy());
  const atras = plan && plan.delta <= -1
    ? ` · <span class="aporte-reserva__atras">vas ${Math.abs(plan.delta) === 1 ? 'un aporte' : `${Math.abs(plan.delta)} aportes`} atrás</span>`
    : '';
  const faltanteStr = faltante > 0
    ? `<p class="aporte-reserva__falta">Te faltan ${f(faltante)}${apartado.fechaObjetivo ? ` para el ${fechaLegible(apartado.fechaObjetivo)}` : ''}${atras}</p>`
    : '';
  const rayita = planPct === null || planPct >= 100 ? '' : `<i style="left:${planPct}%"></i>`;

  const cuentasActivas = (S.cuentas ?? []).filter(c => c.activa !== false);
  const cuentaHtml     = renderSelectorCuenta(cuentasActivas, { label: '¿De qué cuenta sale?' });

  const montoSugerido = sugerencia?.aportePorPeriodo > 0 ? sugerencia.aportePorPeriodo : null;
  const valorHtml   = montoSugerido ? ` value="${miles(montoSugerido)}"` : '';
  const hintPrefill = montoSugerido
    ? `<p class="form-hint">Es lo que te toca aportar ${_esc(sugerencia.etiquetaPeriodo)} para llegar a tiempo. Puedes cambiarlo.</p>`
    : '';

  return `
    <form id="form-aporte-apartado" novalidate data-etapas-monto="¿Cuánto vas a aportar?"
          data-atajos="${_esc(JSON.stringify(faltante > 0 ? [{ t: 'Lo que falta', v: faltante }] : []))}">
      <input type="hidden" name="apartadoId" value="${_esc(apartado.id)}" />
      <div class="aporte-reserva__contexto">
        <p class="aporte-reserva__llevas">Llevas <strong>${f(apartado.montoActual ?? 0)}</strong> de ${f(apartado.montoObjetivo ?? 0)}</p>
        <span class="detalle-reserva__barra" aria-hidden="true"><span style="width:${pct}%"></span>${rayita}</span>
        ${faltanteStr}
      </div>
      <div class="monto-hero">
        <label for="aporte-apartado-monto" class="monto-hero__label">¿Cuánto vas a aportar?</label>
        <div class="monto-hero__box">
          <span class="monto-hero__prefijo" aria-hidden="true">$</span>
          <input id="aporte-apartado-monto" name="monto" class="input input--big-amount" type="text"
                 placeholder="0"${valorHtml}
                 required aria-required="true"
                 autocomplete="off" inputmode="numeric" data-miles />
        </div>
        ${hintPrefill}
      </div>
      ${cuentaHtml}
      <div class="modal__footer modal__footer--principal">
        <button type="button" class="btn btn-ghost" data-action="modal-close">Cancelar</button>
        <button type="submit" class="btn btn-primary" id="aporte-apartado-enviar"><svg class="icon" aria-hidden="true"><use href="#i-check"/></svg><span>${montoSugerido ? `Aportar ${f(montoSugerido)}` : 'Aportar a la reserva'}</span></button>
      </div>
    </form>`;
}

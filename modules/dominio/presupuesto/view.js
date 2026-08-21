/**
 * presupuesto/view.js - generación de HTML para el dominio de presupuesto.
 * Puede leer S. No puede mutarlo. Sin lógica de negocio.
 */

import { S }                  from '../../core/state.js';
import { f, esc as _esc, hoy } from '../../infra/utils.js';
import { icon, iconoCategoria } from '../../infra/icons.js';
import {
  CATEGORIAS_GASTO_USUARIO,
  LABEL_GRUPO_FINANCIERO,
  iconoDeCategoriaGasto,
} from '../../core/constants.js';
import {
  presupuestosActivos,
  ordenarPresupuestosPorUrgencia,
  calcularProgreso,
  calcularGastadoCategoria,
  categoriasSinPresupuesto,
  tienePresupuesto,
  alertasLimites,
  resumenGrupos,
  ejecutadoPorGrupoDelMes,
  desgloseNecesidadesDelMes,
  generarMensajesLimites,
  coberturaLimitesEstiloVida,
  extraordinarioDelMes,
} from './logic.js';
import { estimarSalarioMensual } from '../../infra/financiero.js';
import { mesBloque } from '../../infra/mes-bloque.js';
import {
  sugerirMontoTope,
  sugerirCategoriasParaTope,
  detectarSuscripcionesLargas,
} from '../../infra/sugerencias-categoria.js';
import {
  construirContextoDistribucion,
  sugerirDistribucionIngreso,
} from '../tesoreria/logic.js';

// ── RESUMEN + LISTA ──────────────────────────────────────────────

/**
 * Renderiza el panel completo de presupuesto en `#panel-presupuesto`.
 * Estructura (ADR 019, MC.8b): un solo relato por grupo. El resumen de los 3
 * grupos financieros es el centro; los topes por categoría (envelope budgeting)
 * viven **dentro** de la tarjeta de Estilo de vida, no en un bloque suelto.
 * No-op si el contenedor no existe.
 */
export function renderPanelPresupuesto() {
  const el = document.getElementById('panel-presupuesto');
  if (!el) return;

  // G4 (ficha 07, ADR 069 D8): la lente deja de estar clavada al mes en curso
  // y obedece al reloj del bloque, que es el mismo de "Día a día" y de "Por
  // pagar". Antes, retroceder a junio en la portada y saltar acá devolvía al
  // mes actual sin avisar.
  const { anio, mes: mes0 } = mesBloque();
  const mes = mes0 + 1;

  el.innerHTML = _renderResumenGrupos(anio, mes);
  _sincronizarBotonEncabezado();
}

/**
 * El primario del encabezado ("+ Límite") queda siempre visible (ficha 12).
 *
 * Antes se ocultaba cuando la lente caía a su estado vacío por falta de plan,
 * y el CTA de "Nuevo límite" aparecía dentro del detalle: la regla del
 * [ADR 077](../DECISIONS/077-limites-de-gasto-tres-grupos-a-la-vista.md) D4 es
 * "un botón siempre, nunca dos". Con los topes como lente entera ya no hay
 * estado vacío por falta de plan, así que la regla se cumple con el de arriba
 * y el de dentro se retira.
 */
function _sincronizarBotonEncabezado() {
  const btn = document.getElementById('btn-nuevo-presupuesto');
  if (!btn) return;
  btn.hidden = false;
}

// ── RESUMEN POR GRUPO FINANCIERO (MC.5b/MC.5c, ADR 017) ──────────

/**
 * La lente "Límites": los topes por categoría, con el plan del mes como
 * referencia arriba (ficha 12, ADR 085).
 *
 * ## Lo que cambió y por qué
 *
 * Hasta la ficha 12 esta lente eran tres tarjetas de grupo, y dos de ellas
 * **eran espejos de solo lectura de otras secciones**: la de Necesidades
 * desplegaba la lista de fijos y deudas (`desgloseNecesidadesDelMes()` filtra
 * exactamente `fijo` + `deuda-entidad` + `deuda-personal`, la definición
 * literal de "Por pagar") y la de Ahorro desplegaba fondo, metas, reservas e
 * inversiones, las cuatro hijas de la casa de Ahorro. Ninguna de las dos
 * permitía hacer nada, y la de Necesidades vivía a un toque de la lente
 * hermana que sí deja pagar.
 *
 * El argumento que lo cierra es el trato asimétrico del [ADR 019]: Necesidades
 * se monitorea y nunca se alarma, Ahorro celebra superar la meta, y solo
 * Estilo de vida tiene alerta al 75% y excedido al 100%. O sea que **de las
 * tres tarjetas de "Límites de gasto", exactamente una se comportaba como un
 * límite de gasto.**
 *
 * Los tres ratios se conservan, porque son lo único que dice si el plan del mes
 * se está cumpliendo, pero como tres líneas con salida a la superficie que
 * administra cada grupo. Los desgloses no se pliegan: se van. Un plegable
 * seguiría siendo un espejo, solo escondido.
 *
 * ## Y los topes dejan de depender de un ingreso
 *
 * Antes, sin ingreso registrado no había plan, y sin plan la lente entera caía
 * a su estado vacío **aunque el usuario tuviera topes puestos**: la función que
 * no necesita ingresos quedaba supeditada a la que sí. Ahora el plan es
 * opcional y su ausencia solo quita la franja.
 *
 * @param {number} anio
 * @param {number} mes - 1-12
 * @returns {string} HTML.
 */
function _renderResumenGrupos(anio, mes) {
  const ingresoMensual = estimarSalarioMensual(S.ingresos ?? []);
  const dist = ingresoMensual
    ? sugerirDistribucionIngreso(ingresoMensual, construirContextoDistribucion(S))
    : null;

  const asignadoPorGrupo = dist
    ? {
      'necesidades':    dist.split.necesidades.monto,
      'estilo-de-vida': dist.split.estiloVida.monto,
      'ahorro':         dist.split.ahorro.monto,
    }
    : {};

  // LIM.1b: los compromisos entran porque el pago de un fijo se guarda con
  // categoría 'Gastos fijos'; sin ellos no se sabe cuál era Streaming.
  const ejecutadoPorGrupo = ejecutadoPorGrupoDelMes(
    S.gastos ?? [], S.ahorro?.aportes ?? [], anio, mes, S.compromisos ?? [],
  );
  const resumen = resumenGrupos(asignadoPorGrupo, ejecutadoPorGrupo);

  // Sigue alimentando los mensajes (el de un fijo vencido es de Necesidades),
  // que es lo único que esta lente necesita del desglose desde la ficha 12.
  const itemsNecesidades = desgloseNecesidadesDelMes(S.compromisos ?? [], S.gastos ?? [], anio, mes);

  // Los mensajes se calculan antes del detalle porque el de cada categoría
  // ya no se apila arriba: baja al sobre que describe (ADR 019 D3, el copy no
  // cambia, cambia de sitio).
  const alertasCategoria = alertasLimites(S.presupuestos ?? [], S.gastos ?? [], anio, mes);
  const mensajes = generarMensajesLimites({ alertasCategoria, resumen, itemsNecesidades });
  const notasCategoria = new Map(
    mensajes.filter(_esMensajeDeCategoria)
      .map(m => [m.id.slice(_PREFIJO_MENSAJE_CATEGORIA.length), m.mensaje]),
  );

  return `
    ${_renderRefuerzoCombinado(mensajes)}
    ${_renderNudgesPlan(mensajes)}
    ${dist ? _renderFranjaPlan(resumen, mes) : ''}
    <section class="estilo-limites-standalone" aria-labelledby="estilo-limites-standalone-title">
      <h2 class="estilo-limites-standalone__title" id="estilo-limites-standalone-title">Límites por categoría</h2>
      ${_renderDetalleEstiloVida(anio, mes, asignadoPorGrupo['estilo-de-vida'] ?? 0, notasCategoria)}
    </section>`;
}

/**
 * La franja del plan del mes: tres líneas, una por grupo, con su porcentaje y
 * la salida a la superficie que administra ese grupo (ficha 12, ADR 085 D2).
 *
 * Sustituye a las tres tarjetas y sus desgloses. Necesidades sale a "Por
 * pagar", que es la lente hermana y la dueña de los tres tipos de compromiso;
 * Ahorro sale a su casa, que es un slot de la barra; **Estilo de vida no sale
 * a ninguna parte porque es la lente en la que ya estás**, y decirlo es más
 * honesto que un enlace que no lleva a nada.
 *
 * Conserva el trato asimétrico del [ADR 019](../DECISIONS/019-limites-por-rol.md)
 * en lo que aplica a una línea: Necesidades es siempre neutra (su porcentaje
 * informa cuánto del ingreso consume, no un umbral de peligro) y Ahorro celebra
 * el excedente. Solo Estilo de vida pinta alerta y excedido.
 *
 * @param {Record<string, {pct:number, estado:string}>} resumen
 * @param {number} mes - 1-12, para nombrar el mes del plan.
 * @returns {string} HTML.
 */
function _renderFranjaPlan(resumen, mes) {
  const SALIDAS = {
    'necesidades':    { href: '#compromisos', texto: 'Por pagar' },
    'ahorro':         { href: '#ahorro',      texto: 'Ahorro' },
    'estilo-de-vida': null,
  };

  const lineas = ['necesidades', 'ahorro', 'estilo-de-vida'].map((grupo) => {
    const r = resumen[grupo] ?? { pct: 0, estado: 'ok' };
    // Necesidades nunca se pinta en rojo (ADR 019: se monitorea, no se alarma)
    // y Ahorro por encima de su meta es un logro, no un exceso.
    const tono = grupo === 'necesidades' ? 'monitor'
      : grupo === 'ahorro' ? (r.pct >= 100 ? 'logro' : 'ok')
        : r.estado;
    const salida = SALIDAS[grupo];

    return `
        <li class="plan-franja__fila">
          <span class="plan-franja__grupo">${_esc(LABEL_GRUPO_FINANCIERO[grupo] ?? grupo)}</span>
          <span class="plan-franja__pct plan-franja__pct--${tono}">${r.pct}%</span>
          ${salida
    ? `<a class="plan-franja__salida" href="${salida.href}">${salida.texto}</a>`
    : '<span class="plan-franja__aqui">aquí</span>'}
        </li>`;
  }).join('');

  return `
    <section class="plan-franja" aria-label="Tu plan del mes por grupo">
      <header class="plan-franja__header">
        <h2 class="plan-franja__title">Tu plan de ${_esc(_MESES_CORTOS[mes - 1] ?? '')}</h2>
        <!-- ADR 080 D4: abre el asistente, no navega a la entrada de la
             sección, y la etiqueta nombra la acción y no la sección (R85). -->
        <a href="#tesoreria" class="plan-franja__link" data-action="presupuesto-abrir-distribucion" aria-label="Ajustar tu distribución del ingreso">Ajustar</a>
      </header>
      <ul class="plan-franja__lista" role="list">${lineas}</ul>
    </section>`;
}

/** Nombre corto del mes para el título de la franja. */
const _MESES_CORTOS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

// ── ALERTAS Y REFUERZOS POR ROL (MC.5d + MC.8a, ADR 017 y ADR 019) ──

const _NUDGE_CLASE = { excedido: 'nudge-high', alerta: 'nudge-medium', info: 'nudge-info', refuerzo: 'nudge-success' };
// Símbolos del sprite, no emoji: un glifo del sistema operativo trae su propio
// color (que no sale de ningún token y no responde al tema), su propio peso y
// su propia caja, así que no comparte el trazo ni el duotono del lenguaje de
// iconografía. El nivel "alerta" usa i-trending-up ("va subiendo"): el sprite
// no tiene reloj y crear uno es alcance de IV.4.
const _NUDGE_ICONO = { excedido: 'i-alert', alerta: 'i-trending-up', info: 'i-info', refuerzo: 'i-check-circle' };

// Los mensajes por categoría de Estilo de vida se identifican por el prefijo
// de su id (`generarMensajesLimites`): ya no se apilan en la cabecera de la
// tarjeta, bajan al sobre que describen.
const _PREFIJO_MENSAJE_CATEGORIA = 'categoria-';

/** @param {{id:string}} m */
function _esMensajeDeCategoria(m) {
  return m.id.startsWith(_PREFIJO_MENSAJE_CATEGORIA);
}

/**
 * Nivel visual de un nudge según el tipo/severidad del mensaje. Los mensajes
 * de refuerzo (Ahorro) van en verde; los informativos (Necesidades, ADR 019)
 * en azul calmado; las alertas de Estilo de vida en ámbar (`alerta`) o rojo
 * (`excedido`).
 * @param {ReturnType<typeof generarMensajesLimites>[number]} m
 * @returns {'excedido'|'alerta'|'info'|'refuerzo'}
 */
function _nivelNudge(m) {
  if (m.tipo === 'refuerzo') return 'refuerzo';
  if (m.tipo === 'info')     return 'info';
  return m.severidad === 'excedido' ? 'excedido' : 'alerta';
}

/**
 * HTML de un mensaje individual, reusando el sistema de nudges de la app
 * (`.nudge nudge-high|nudge-medium|nudge-info|nudge-success`).
 * @param {ReturnType<typeof generarMensajesLimites>[number]} m
 */
function _renderNudge(m) {
  const nivel = _nivelNudge(m);
  // El exceso es el único nivel que interrumpe: el resto de la app ya usa
  // role="alert" para el nivel alto y role="status" para lo demás.
  const rol = nivel === 'excedido' ? 'alert' : 'status';
  return `
    <div class="nudge ${_NUDGE_CLASE[nivel]}" role="${rol}">
      <span class="nudge__icon" aria-hidden="true">${iconoCategoria(_NUDGE_ICONO[nivel])}</span>
      <div class="nudge__body">
        <p class="nudge__title">${_esc(m.mensaje)}</p>
      </div>
    </div>`;
}

/**
 * Los mensajes de los tres grupos, ahora encima de la franja (ficha 12).
 *
 * Antes cada uno vivía dentro de la tarjeta de su grupo. Con las tarjetas de
 * Necesidades y Ahorro retiradas, sus mensajes se quedaban sin sitio, y el de
 * un fijo vencido es información que la lente no debe perder solo porque su
 * tarjeta se fue. Los de categoría siguen bajando a su sobre (ADR 019 D3).
 *
 * @param {ReturnType<typeof generarMensajesLimites>} mensajes
 * @returns {string} HTML.
 */
function _renderNudgesPlan(mensajes) {
  return mensajes
    .filter(m => m.grupo && !_esMensajeDeCategoria(m))
    .map(_renderNudge)
    .join('');
}

/** Refuerzo combinado (no pertenece a ningún grupo específico). */
function _renderRefuerzoCombinado(mensajes) {
  const m = mensajes.find(x => x.grupo === null);
  return m ? _renderNudge(m) : '';
}

// ── DESGLOSE POR ITEM (MC.5c, ADR 017) ───────────────────────────

// Ícono por tipo de fila del desglose (ID.3): el símbolo estructural de la
// sección donde vive cada cosa (fijos y deudas en Por pagar, fondo en
// Ahorro...). Inline con el texto, por eso icon--sm y no teja.
// Chevron real del sprite en vez del carácter '▾' que el CSS inyectaba: hereda
// trazo y tamaño del sistema de iconografía. La regla que apaga el `::after`
// está acotada a `.grupo-card__desglose`, así que el desglose de Análisis, que
// comparte el componente `.analisis-grupo`, no cambia.
const _CHEVRON_DESGLOSE = '<svg class="icon analisis-grupo__chevron" aria-hidden="true"><use href="#i-chevron-right"/></svg>';

const _ICONO_ITEM_NECESIDAD = { fijo: 'i-agenda', deuda: 'i-deudas' };
const _ETIQUETA_ESTADO_PAGO = { ninguno: 'Pendiente', parcial: 'Abono parcial', completo: 'Pagado' };
const _ICONO_ITEM_AHORRO    = { fondo: 'i-ahorro', meta: 'i-metas', apartado: 'i-apartados', inversion: 'i-inversion' };

// ── DETALLE DE ESTILO DE VIDA: TOPES POR CATEGORÍA (MC.8b, ADR 019) ──

/**
 * Detalle del grupo Estilo de vida: los topes por categoría (envelope
 * budgeting) fusionados **dentro** de su tarjeta (ADR 019, decisión 2).
 * Reemplaza el antiguo bloque suelto "Estilo de vida: topes por categoría".
 * Muestra, en orden:
 *   1. la "olla finita": cuánto del presupuesto de Estilo de vida cubren los
 *      topes actuales y cuánto queda sin tope (sin obligar a asignar el 100%);
 *   2. el dinero extraordinario del mes, informado y no repartido (LIM.1a);
 *   3. los envelopes activos, o un mensaje breve si no hay ninguno;
 *   4. la categoría que más pide un tope, con su monto (LIM.1c);
 *   5. las categorías con gasto pero sin tope (sugerencia de dónde poner uno);
 *   6. la suscripción que lleva más tiempo cobrándose (LIM.1c);
 *   7. el botón "Nuevo límite", **solo en el estado vacío** (DSK.8b, ADR 077
 *      D4): con plan del mes el primario de la sección ya está visible, y dos
 *      botones con el mismo texto y el mismo destino, a 1333px de distancia,
 *      se leen como dos acciones distintas. Es la regla inversa de
 *      `_sincronizarBotonEncabezado()`, que oculta el de arriba cuando no hay
 *      plan: un botón siempre, nunca dos.
 *
 * Regla de frecuencia (ADR 044 D6): **una** sugerencia de tope y **una** de
 * suscripción por render, las de mayor monto. El brief pidió avisos "nunca
 * invasivos ni constantes" y la sección ya tiene sus propias alertas por sobre.
 *
 * @param {number} anio
 * @param {number} mes - 1-12
 * @param {number} presupuestoEV - monto del grupo Estilo de vida (distribución).
 * @param {Map<string,string>} [notasCategoria] - mensaje de estado por categoría,
 *   que se dibuja dentro de su propio sobre en vez de apilarse arriba.
 * @returns {string} HTML.
 */
function _renderDetalleEstiloVida(anio, mes, presupuestoEV, notasCategoria = new Map()) {
  const gastos    = S.gastos ?? [];
  // Ficha 12 (L5): por urgencia, no por fecha de creación.
  const activos   = ordenarPresupuestosPorUrgencia(S.presupuestos, gastos, anio, mes);
  const cobertura = coberturaLimitesEstiloVida(activos, presupuestoEV);

  const hoyISO      = hoy();
  const sugerencia  = sugerirCategoriasParaTope(
    gastos, _categoriasDisponibles(), hoyISO, { sinTope: cobertura.sinTope },
  )[0];
  const suscripcion = detectarSuscripcionesLargas(S.compromisos ?? [], gastos, hoyISO)[0];

  // Sin topes y con una sugerencia real, el ejemplo inventado del estado vacío
  // sobra: dos consejos seguidos, uno genérico y otro con la cifra de la
  // persona, compiten entre sí.
  const vacio = sugerencia
    ? 'Aún no le has puesto tope a ninguna categoría.'
    : 'Aún no le has puesto tope a ninguna categoría. Empieza por donde más gastas: por ejemplo, un máximo de $300.000 para Restaurantes.';

  const lista = activos.length === 0
    ? `<p class="estilo-limites__vacio">${vacio}</p>`
    : `<div class="envelope-list">${activos.map(p => _renderEnvelope(p, gastos, anio, mes, notasCategoria.get(p.categoria))).join('')}</div>`;

  return `
    <div class="estilo-limites">
      <p class="estilo-limites__intro">Ponle un máximo mensual a las categorías donde más gastas y te aviso antes de pasarte. Es un tope a lo que gastas, no un ahorro.</p>
      ${_renderOllaFinita(cobertura)}
      ${_renderExtraordinario(extraordinarioDelMes(S.ingresosPuntuales, anio, mes), presupuestoEV)}
      ${lista}
      ${_renderSugerenciaTope(sugerencia)}
      ${_renderSinPresupuesto(activos)}
      ${_renderSuscripcionLarga(suscripcion)}
    </div>`;
}

// ── SUGERENCIAS DEL MOTOR (LIM.1c, ADR 044) ──────────────────────

/**
 * La categoría que más pide un tope, con el monto ya propuesto y su puerta
 * (regla R35: el consejo y el control son lo mismo). El motor devuelve datos;
 * el copy es de acá (ADR 044 D5) y sigue el ADR 003: dice el hecho y ofrece,
 * nunca ordena.
 *
 * El botón solo lleva la categoría: el monto lo vuelve a pedir el formulario al
 * mismo motor, con los mismos datos, así que la cifra del aviso y la del campo
 * son la misma sin pasarla de mano en mano (una copia en el DOM se queda vieja
 * en cuanto se registra un gasto).
 *
 * @param {ReturnType<typeof sugerirCategoriasParaTope>[number]|undefined} s
 * @returns {string} HTML. `''` si no hay ninguna candidata.
 */
function _renderSugerenciaTope(s) {
  if (!s) return '';

  const cat = _esc(s.categoria);
  const hecho = s.motivo === 'creciente'
    ? `Llevas ${f(s.actual)} en ${cat} este mes, más que tus ${f(s.promedio)} habituales.`
    : s.base === 'promedio'
      ? `Gastas ${f(s.promedio)} al mes en ${cat}.`
      : `Llevas ${f(s.actual)} en ${cat} este mes.`;
  const oferta = s.acotado
    ? `Puedes ponerle un tope de ${f(s.monto)}: es lo que tu plan deja sin asignar.`
    : `Un tope de ${f(s.monto)} te avisa antes de pasarte.`;

  return `
    <div class="nudge nudge-info" role="status">
      <span class="nudge__icon" aria-hidden="true">${iconoCategoria('i-trending-up')}</span>
      <div class="nudge__body">
        <p class="nudge__title">${hecho}</p>
        <p class="nudge__desc">${oferta}</p>
      </div>
      <button type="button" class="nudge__cta btn btn-primary btn-sm"
              data-action="nuevo-presupuesto"
              data-categoria="${cat}"
              aria-label="Ponerle un límite de ${f(s.monto)} a ${cat}">Ponerle tope</button>
    </div>`;
}

/**
 * La suscripción que lleva más meses cobrándose. Finko no sabe si se usa (no
 * hay dato de uso y no se inventa): dice cuánto lleva cobrada y cuánto suma al
 * año, que es la cifra que nadie tiene en la cabeza, y deja la decisión.
 *
 * La salida es Calendario, no un control acá: dar de baja un fijo es del
 * dominio `compromisos` y duplicar esa acción en Límites rompería la fuente
 * única (y la regla ADN #10 en su espíritu).
 *
 * @param {ReturnType<typeof detectarSuscripcionesLargas>[number]|undefined} s
 * @returns {string} HTML. `''` si no hay ninguna.
 */
function _renderSuscripcionLarga(s) {
  if (!s) return '';

  return `
    <div class="nudge nudge-info" role="status">
      <span class="nudge__icon" aria-hidden="true">${iconoCategoria('i-info')}</span>
      <div class="nudge__body">
        <p class="nudge__title">Llevas ${s.mesesPagados} meses pagando ${_esc(s.descripcion)}: ${f(s.costoAnual)} al año.</p>
        <p class="nudge__desc">Si ya no lo usas, darlo de baja libera ese dinero. <a href="#compromisos" class="estilo-olla__link">Revisar en Por pagar</a></p>
      </div>
    </div>`;
}

/**
 * Línea de "olla finita" (ADR 019, decisión 2): cuánto del presupuesto de
 * Estilo de vida cubren los topes actuales y cuánto queda sin tope. Da la
 * noción de presupuesto acotado sin forzar a asignar el 100% ni a ponerle tope
 * a cada categoría.
 *
 * @param {ReturnType<typeof coberturaLimitesEstiloVida>} cobertura
 * @returns {string} HTML. `''` cuando no hay presupuesto ni topes que mostrar.
 */
function _renderOllaFinita({ limites, presupuesto, sinTope, excede }) {
  if (presupuesto <= 0) {
    return limites > 0
      ? `<p class="estilo-olla">Tus límites suman ${f(limites)} este mes.</p>`
      : '';
  }
  if (excede) {
    return `<p class="estilo-olla estilo-olla--excede">Tus límites suman ${f(limites)}, más que los ${f(presupuesto)} que tu plan asigna a Estilo de vida. Revisa si alguno quedó muy alto.</p>`;
  }
  if (limites === 0) {
    return `<p class="estilo-olla">Tu plan asigna ${f(presupuesto)} a Estilo de vida este mes. Aún no le has puesto un límite a ninguna categoría.</p>`;
  }
  if (sinTope === 0) {
    return `<p class="estilo-olla">Tus límites cubren todo tu Estilo de vida (${f(presupuesto)}). No te queda dinero sin tope.</p>`;
  }
  return `<p class="estilo-olla">Tus límites cubren ${f(limites)} de los ${f(presupuesto)} de tu Estilo de vida. Te quedan ${f(sinTope)} sin tope.</p>`;
}

/**
 * El dinero extraordinario del mes, junto a la olla finita ([ADR 045](../../../docs/DECISIONS/045-base-de-calculo-del-disponible-para-limites.md)
 * D3, copy de su D5). Una prima o una venta **sí** son capacidad real de gasto,
 * y hasta ahora Límites no las nombraba; lo que la línea no hace es sumarlas al
 * plan, porque el excedente terminaría casi entero en gasto discrecional. La
 * salida es Mis cuentas, donde ese dinero puede ir al fondo, a una meta o a una
 * deuda.
 *
 * Solo se dibuja cuando hay plan del mes: sin plan, "no son parte de tu plan"
 * no significa nada y el estado vacío ya manda al usuario a Mis cuentas.
 *
 * @param {number} total - dinero extraordinario del mes (`extraordinarioDelMes`).
 * @param {number} presupuestoEV - monto del grupo Estilo de vida (distribución).
 * @returns {string} HTML. `''` si no hubo dinero extraordinario o no hay plan.
 */
function _renderExtraordinario(total, presupuestoEV) {
  if (total <= 0 || presupuestoEV <= 0) return '';
  return `
    <p class="estilo-olla estilo-olla--extra">Este mes entraron ${f(total)} que no son parte de tu plan. <a href="#tesoreria" class="estilo-olla__link">Decide dónde va</a></p>`;
}

// ── ENVELOPE INDIVIDUAL ──────────────────────────────────────────

/**
 * Un tope por categoría. El estado ya lo dicen el borde, la barra y la palabra
 * "Excedido", así que el sobre no antepone además un glifo al título; y el
 * mensaje de ese estado (mismo copy del ADR 019 D3) se dibuja aquí, donde el
 * usuario puede editar o eliminar el tope, en vez de apilarse arriba.
 *
 * @param {import('../../core/state.js').Presupuesto} presupuesto
 * @param {import('../../core/state.js').Gasto[]} gastos
 * @param {number} anio
 * @param {number} mes - 1-12
 * @param {string} [nota] - mensaje de estado de esta categoría, si lo hay.
 */
function _renderEnvelope(presupuesto, gastos, anio, mes, nota = '') {
  const { gastado, asignado, restante, porcentaje, estado } = calcularProgreso(presupuesto, gastos, anio, mes);
  const categoria = _esc(presupuesto.categoria);
  const icono = iconoCategoria(iconoDeCategoriaGasto(presupuesto.categoria, S.categoriasPersonalizadas), 'icon icon--sm');
  const widthVisual = Math.min(porcentaje, 100);

  return `
    <article class="envelope" data-id="${_esc(presupuesto.id)}" data-estado="${estado}">
      <div class="envelope__header">
        <p class="envelope__title">${icono} ${categoria}</p>
        <p class="envelope__subtitle">${f(gastado)} / ${f(asignado)}</p>
      </div>
      <div class="progress" role="progressbar"
           aria-valuenow="${porcentaje}" aria-valuemin="0" aria-valuemax="100"
           aria-label="Progreso de ${categoria}: ${porcentaje}%">
        <div class="progress-bar ${_claseProgreso(porcentaje)}" style="width:${widthVisual}%"></div>
      </div>
      <p class="envelope__meta">
        <span class="envelope__porcentaje">${porcentaje}%</span>
        ${restante >= 0
          ? `· Restante: ${f(restante)}`
          : `· Excedido: <strong>${f(-restante)}</strong>`}
      </p>
      ${nota ? `<p class="envelope__nota">${_esc(nota)}</p>` : ''}
      <div class="envelope__actions">
        <!-- G5 (ficha 07, ADR 069 D8): "ver los ocho consumos que forman este
             número" era la pregunta natural después de mirar un tope, y costaba
             cuatro toques mas armar el filtro a mano. Lleva la categoría; el
             mes lo pone el reloj del bloque. -->
        <button class="btn btn-ghost btn-sm envelope__ver"
                data-action="presupuesto-ver-movimientos"
                data-categoria="${categoria}"
                aria-label="Ver los movimientos de ${categoria}">Ver movimientos</button>
        <button class="btn btn-ghost btn-icon"
                data-action="editar-presupuesto"
                data-id="${_esc(presupuesto.id)}"
                aria-label="Editar límite de gasto de ${categoria}"><svg class="icon" aria-hidden="true"><use href="#i-edit"/></svg></button>
        <button class="btn btn-ghost btn-icon"
                data-action="eliminar-presupuesto"
                data-id="${_esc(presupuesto.id)}"
                aria-label="Eliminar límite de gasto de ${categoria}"><svg class="icon" aria-hidden="true"><use href="#i-trash"/></svg></button>
      </div>
    </article>`;
}

// ── CATEGORÍAS HUÉRFANAS ─────────────────────────────────────────

// Motivo por el que una categoría con gasto del mes no puede recibir un tope
// desde acá: son las que el formulario no ofrece. "Vivienda" y "Servicios
// públicos" salieron del selector con CAT.1 (siempre recurrentes con fecha);
// "Deudas" y "Ahorro" son categorías internas que la app escribe sola al
// registrar un abono o un aporte. "Gastos fijos" es la que la app le pone al
// pago de un compromiso: desde LIM.1b, la parte no esencial de esos pagos
// cuenta acá dentro, así que la fila dice dónde se controla en vez de caer al
// genérico "No lleva tope".
//
// Ficha 05 (ADR 069): las cuatro que vivían "en Calendario" o "en Deudas"
// ahora se administran en la misma sección, "Por pagar". Nombrar la sección
// donde el usuario sí puede hacer algo es el punto de estas filas: mandarlo al
// Calendario, que ya no crea ni edita nada, era una puerta cerrada.
const _MOTIVO_SIN_TOPE = {
  'Vivienda':           'Se controla en Por pagar',
  'Servicios públicos': 'Se controla en Por pagar',
  'Gastos fijos':       'Se controla en Por pagar',
  'Deudas':             'Se controla en Por pagar',
  'Ahorro':             'Se controla en Ahorro',
};

/**
 * A dónde lleva cada motivo (ficha 12, L4). Las cuatro primeras a la lente
 * hermana del mismo bloque, la quinta al hub de Ahorro.
 */
const _DESTINO_SIN_TOPE = {
  'Vivienda':           '#compromisos',
  'Servicios públicos': '#compromisos',
  'Gastos fijos':       '#compromisos',
  'Deudas':             '#compromisos',
  'Ahorro':             '#ahorro',
};

/**
 * Categorías con gasto del mes y sin tope. Regla R35 ("todo consejo tiene
 * puerta"): cada fila **es** el botón que abre el formulario con su categoría
 * precargada, en vez de un consejo suelto al pie; y la fila de una categoría
 * que el formulario no ofrece explica por qué en vez de pedir un tope que no
 * se puede crear. No sugiere montos: eso es ADR 044 y LIM.1.
 *
 * @param {import('../../core/state.js').Presupuesto[]} presupuestos
 * @returns {string} HTML.
 */
function _renderSinPresupuesto(presupuestos) {
  // Mismo reloj que el resumen de la lente (G4): si el bloque está en junio,
  // "gastas acá y no tiene tope" tiene que hablar de junio.
  const { anio, mes } = mesBloque();
  const huerfanas = categoriasSinPresupuesto(presupuestos, S.gastos, anio, mes + 1);
  if (huerfanas.length === 0) return '';

  const personalizadas = S.categoriasPersonalizadas ?? [];
  const filas = huerfanas.map(h => {
    const cat   = _esc(h.categoria);
    const icono = iconoCategoria(iconoDeCategoriaGasto(h.categoria, personalizadas), 'icon icon--sm');
    const cuerpo = `
        <span class="envelope-huerfanas__cat">${icono} ${cat}</span>
        <span class="envelope-huerfanas__monto">${f(h.gastado)}</span>`;

    if (!_puedeTenerTope(h.categoria, personalizadas)) {
      // Ficha 12 (L4): el motivo nombraba la sección correcta desde la ficha
      // 05 y seguía siendo texto muerto. Aparece en la fila de una categoría
      // en la que el usuario ESTÁ gastando y donde busca control, así que la
      // salida se enlaza. Sin destino conocido se queda como texto.
      const motivo  = _MOTIVO_SIN_TOPE[h.categoria] ?? 'No lleva tope';
      const destino = _DESTINO_SIN_TOPE[h.categoria] ?? '';
      const motivoHtml = destino
        ? `<a class="envelope-huerfanas__motivo envelope-huerfanas__motivo--link" href="${destino}">${_esc(motivo)}</a>`
        : `<span class="envelope-huerfanas__motivo">${_esc(motivo)}</span>`;

      return `
      <li class="envelope-huerfanas__fija">
        ${cuerpo}
        ${motivoHtml}
      </li>`;
    }

    return `
      <li>
        <button type="button" class="envelope-huerfanas__btn"
                data-action="nuevo-presupuesto"
                data-categoria="${cat}"
                aria-label="Ponerle un límite a ${cat}">
          ${cuerpo}
          <span class="envelope-huerfanas__accion">Nuevo límite</span>
        </button>
      </li>`;
  }).join('');

  return `
    <section class="envelope-huerfanas" aria-label="Categorías con gastos sin límite asignado">
      <h3 class="envelope-huerfanas__title">Gastas acá y no tiene tope</h3>
      <ul class="envelope-huerfanas__list" role="list">${filas}</ul>
    </section>`;
}

/**
 * true si el formulario de límite puede ofrecer esta categoría: nativa visible
 * para el usuario o creada por él en Gastos (TX.9b).
 * @param {string} categoria
 * @param {{nombre:string}[]} personalizadas
 */
function _puedeTenerTope(categoria, personalizadas) {
  return CATEGORIAS_GASTO_USUARIO.includes(categoria)
    || personalizadas.some(c => c.nombre === categoria);
}

// ── FORMULARIO DEL MODAL ─────────────────────────────────────────

/**
 * HTML del formulario de creación/edición, con el patrón de captura de la app
 * (FORM.1b, [ADR 042](docs/DECISIONS/042-formularios-v2-visual.md)): chips de
 * categoría con ícono y el monto como protagonista. Como pista, el gasto real
 * del mes en la categoría elegida: es el dato con el que se decide el número.
 *
 * Al editar, la categoría queda fija (no se puede cambiar sin borrar el tope)
 * y viaja en un campo oculto: un control deshabilitado no entra en `FormData`,
 * así que la validación se quedaba sin categoría y el guardado fallaba.
 *
 * LIM.1c: al crear, el campo abre con el monto sugerido por el motor (punto 3
 * del brief: nadie tiene que inventar un tope de la nada). El número es una
 * propuesta editable, no un valor impuesto: la pista dice de dónde sale.
 *
 * @param {import('../../core/state.js').Presupuesto|null} [actual=null]
 * @param {string} [categoriaPrecargada=''] - categoría que llega desde su fila
 *   en "Gastas acá y no tiene tope" o desde la sugerencia; queda marcada al abrir.
 * @returns {string}
 */
export function renderFormPresupuesto(actual = null, categoriaPrecargada = '') {
  const editando = !!actual;
  const ahora = new Date();
  const anio  = ahora.getFullYear();
  const mes   = ahora.getMonth() + 1;
  const personalizadas = S.categoriasPersonalizadas ?? [];
  const gastos = S.gastos ?? [];
  const hoyISO = hoy();
  const sinTope = _sinTopeDelPlan();

  /** Monto propuesto para una categoría, o null si no hay con qué estimarlo. */
  const sugeridoDe = (categoria) => sugerirMontoTope(gastos, categoria, hoyISO, { sinTope });

  /**
   * Pista del monto: de dónde sale la cifra propuesta y, si no hay ninguna,
   * cuánto se lleva gastado este mes (la pista de FORM.1b, que sigue vigente).
   */
  const hintDe = (categoria) => {
    const s = sugeridoDe(categoria);
    if (s?.acotado)               return `Es lo que tu plan deja sin asignar este mes`;
    if (s?.base === 'promedio')   return `Tu promedio de los últimos meses acá`;
    if (s?.base === 'mes-actual') return `Es lo que llevas gastado acá este mes`;

    const gastado = calcularGastadoCategoria(gastos, categoria, anio, mes);
    return gastado > 0
      ? `Gastaste ${f(gastado)} acá este mes`
      : 'Aún no registras gastos acá este mes';
  };

  const campoCategoria = editando
    ? `
      <div class="form-group">
        <span class="label">Categoría</span>
        <p class="presupuesto-cat-fija">${iconoCategoria(iconoDeCategoriaGasto(actual.categoria, personalizadas), 'icon icon--sm')} ${_esc(actual.categoria)}</p>
        <input type="hidden" name="categoria" value="${_esc(actual.categoria)}" />
        <p class="form-hint">La categoría no se puede cambiar. Si necesitas otra, elimina este límite y crea uno nuevo.</p>
      </div>`
    : _renderChipsCategoria(categoriaPrecargada, personalizadas, hintDe, sugeridoDe);

  const categoriaInicial = editando ? actual.categoria : categoriaPrecargada;
  // Al editar manda el monto guardado; al crear, la propuesta del motor para la
  // categoría precargada. `data-sugerido` marca que el valor lo puso Finko: el
  // cableado solo puede reemplazar lo que Finko escribió, nunca lo que tú.
  const montoInicial = editando
    ? actual.montoMensual
    : (categoriaInicial ? (sugeridoDe(categoriaInicial)?.monto ?? '') : '');

  return `
    <form id="form-presupuesto" novalidate ${editando ? `data-id="${_esc(actual.id)}"` : ''}>
      ${campoCategoria}
      <div class="monto-hero">
        <label class="monto-hero__label" for="presupuesto-monto">Máximo al mes</label>
        <div class="monto-hero__box">
          <span class="monto-hero__prefijo" aria-hidden="true">$</span>
          <input id="presupuesto-monto" name="montoMensual" class="input input--big-amount" type="number"
                 min="1" step="10000" required aria-required="true"
                 value="${montoInicial}"${!editando && montoInicial ? ' data-sugerido="1"' : ''}
                 placeholder="0" autocomplete="off" inputmode="numeric" />
        </div>
        <span class="monto-hero__hint" id="presupuesto-monto-hint">${categoriaInicial ? hintDe(categoriaInicial) : 'COP'}</span>
      </div>
      <div class="modal__footer modal__footer--principal">
        <button type="button" class="btn btn-ghost" data-action="modal-close">Cancelar</button>
        <button type="submit" class="btn btn-primary">${icon('check-circle')} ${editando ? 'Guardar cambios' : 'Crear límite'}</button>
      </div>
    </form>`;
}

/**
 * Chips de categoría del formulario de creación. Incluye las que el usuario
 * creó en Gastos (TX.9b): sin ellas, la sección listaba "Domicilios" entre las
 * categorías sin tope y el formulario no la ofrecía (regla R35).
 *
 * Cada chip trae ya calculada su pista y su monto sugerido (LIM.1c): elegir
 * categoría escribe el número en el campo sin volver a consultar nada.
 *
 * @param {string} precargada
 * @param {{nombre:string, icono:string}[]} personalizadas
 * @param {(categoria:string) => string} hintDe
 * @param {(categoria:string) => {monto:number}|null} sugeridoDe
 * @returns {string} HTML.
 */
function _renderChipsCategoria(precargada, personalizadas, hintDe, sugeridoDe) {
  const chip = (valor) => {
    const marcada  = valor === precargada ? ' checked' : '';
    const sugerido = sugeridoDe(valor)?.monto;
    return `
        <label class="chip-cat">
          <input type="radio" name="categoria" class="chip-cat__radio" value="${_esc(valor)}"
                 data-hint="${_esc(hintDe(valor))}"${sugerido ? ` data-sugerido="${sugerido}"` : ''}${marcada} />
          ${iconoCategoria(iconoDeCategoriaGasto(valor, personalizadas))}
          <span class="chip-cat__label">${_esc(valor)}</span>
        </label>`;
  };

  const disponibles = _categoriasDisponibles(personalizadas);

  if (disponibles.length === 0) {
    return `
      <div class="form-group">
        <p class="form-hint">Ya le pusiste tope a todas tus categorías de gasto. Edita uno existente si quieres cambiar su monto.</p>
      </div>`;
  }

  return `
      <div class="form-group">
        <span class="label" id="presupuesto-categoria-label">¿A qué categoría le pones tope?</span>
        <div class="chips-cat chips-cat--2col" role="radiogroup" aria-labelledby="presupuesto-categoria-label">
          ${disponibles.map(chip).join('')}
        </div>
      </div>`;
}

// ── HELPERS ──────────────────────────────────────────────────────

/**
 * Categorías a las que hoy se les puede poner un tope: las que el formulario
 * ofrece (nativas visibles más las propias del usuario, TX.9b) y que todavía
 * no tienen uno. Es la lista de chips del modal y, desde LIM.1c, también las
 * candidatas que el motor de sugerencia mira: si el motor propusiera una
 * categoría que el formulario no ofrece, el consejo no tendría puerta (R35).
 *
 * @param {{nombre:string}[]} [personalizadas]
 * @returns {string[]}
 */
function _categoriasDisponibles(personalizadas = S.categoriasPersonalizadas ?? []) {
  return [
    ...CATEGORIAS_GASTO_USUARIO,
    ...personalizadas.map(c => c.nombre),
  ].filter(c => !tienePresupuesto(c, S.presupuestos));
}

/**
 * Lo que el plan del mes deja sin ningún tope (`coberturaLimitesEstiloVida`),
 * el techo del monto sugerido (ADR 045 D6). Devuelve 0 sin plan del mes, que
 * el motor interpreta como "sin techo": un usuario sin ingresos registrados
 * igual puede ponerle tope a lo que gasta.
 *
 * @returns {number}
 */
function _sinTopeDelPlan() {
  const ingresoMensual = estimarSalarioMensual(S.ingresos ?? []);
  if (!ingresoMensual) return 0;
  const dist = sugerirDistribucionIngreso(ingresoMensual, construirContextoDistribucion(S));
  const activos = presupuestosActivos(S.presupuestos);
  return coberturaLimitesEstiloVida(activos, dist?.split?.estiloVida?.monto ?? 0).sinTope;
}

function _claseProgreso(porcentaje) {
  if (porcentaje > 100) return 'progress-bar--danger';
  if (porcentaje >= 75) return 'progress-bar--warn';
  return '';
}

// ── PANEL DE ALERTAS EN DASHBOARD ───────────────────────────────

/**
 * Renderiza en `#panel-limites` las alertas de límites de gasto del mes actual.
 * Solo aparece cuando hay envelopes en estado 'alerta' (>=75%) o 'excedido' (>100%).
 * No-op si el contenedor no existe.
 */
export function renderPanelLimites() {
  const el = document.getElementById('panel-limites');
  if (!el) return;

  const hoy    = new Date();
  const anio   = hoy.getFullYear();
  const mes    = hoy.getMonth() + 1;
  const alertas = alertasLimites(S.presupuestos ?? [], S.gastos ?? [], anio, mes);

  if (alertas.length === 0) {
    el.innerHTML = '';
    el.hidden = true;
    return;
  }
  el.hidden = false;

  const items = alertas.map(a => {
    const icono    = iconoCategoria(iconoDeCategoriaGasto(a.categoria, S.categoriasPersonalizadas), 'icon icon--sm');
    const cls      = a.estado === 'excedido' ? 'excedido' : 'alerta';
    const badgeTxt = a.estado === 'excedido'
      ? `Superado ${a.porcentaje}%`
      : `${a.porcentaje}% usado`;
    const sub = a.estado === 'excedido'
      ? `Gastaste ${f(a.gastado)} de ${f(a.asignado)} (${f(a.gastado - a.asignado)} extra)`
      : `Te quedan ${f(a.asignado - a.gastado)} de ${f(a.asignado)}`;

    return `
      <li class="limites-card__item">
        <div class="limites-card__body">
          <p class="limites-card__name">${icono} ${_esc(a.categoria)}</p>
          <p class="limites-card__sub">${sub}</p>
        </div>
        <span class="limites-card__badge limites-card__badge--${cls}">${badgeTxt}</span>
      </li>`;
  }).join('');

  const n      = alertas.length;
  const titulo = n === 1 ? '1 límite de gasto en alerta' : `${n} límites de gasto en alerta`;

  el.innerHTML = `
    <section class="limites-card" aria-label="Alertas de límites de gasto">
      <header class="limites-card__header">
        <h2 class="limites-card__title">${icon('presupuesto')} ${titulo}</h2>
        <a href="#presupuesto" class="limites-card__link" aria-label="Ir a Límites de gasto">Ver todos</a>
      </header>
      <ul class="limites-card__list" role="list">
        ${items}
      </ul>
    </section>`;
}

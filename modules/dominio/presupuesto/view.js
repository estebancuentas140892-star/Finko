/**
 * presupuesto/view.js - generación de HTML para el dominio de presupuesto.
 * Puede leer S. No puede mutarlo. Sin lógica de negocio.
 */

import { miles } from '../../infra/miles.js';
import { S }                  from '../../core/state.js';
import { f, esc as _esc, hoy } from '../../infra/utils.js';
import { icon, iconoCategoria, tejaCategoria } from '../../infra/icons.js';
import { htmlTinoSol } from '../../infra/ilustraciones.js';
import {
  CATEGORIAS_GASTO_USUARIO,
  LABEL_GRUPO_FINANCIERO,
  SUBCATEGORIAS_GASTO,
  iconoDeCategoriaGasto,
  tonoDeCategoria,
} from '../../core/constants.js';
import { hijosDeCategoria, categoriasConHijos } from '../../infra/taxonomia.js';
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
  progresoHormiga,
  calcularProgresoSubcategorias,
  esLimitePorSubcategoria,
  resumenLimitesDelMes,
  sinLimiteDelMes,
  categoriaParaSugerirLimite,
  limiteDeLaAlerta,
  UMBRAL_ALERTA,
  gastoPorSubcategoria,
  esLimiteDeUnaParte,
} from './logic.js';
import { estimarSalarioMensual } from '../../infra/financiero.js';
import { mesBloque, htmlMesDelRotulo } from '../../infra/mes-bloque.js';
import { montosOcultos, htmlOjoTarjeta } from '../../infra/privacidad.js';
import { SALDO_MASCARA } from '../../infra/render.js';
import { aprendidosDe, etiquetaConcepto } from '../../infra/hormiga.js';
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

  // GAS.7b (ADR 179 D2): en el teléfono la lente abre con su tarjeta, que
  // lleva el mes y el ojo del bloque.
  el.innerHTML = (_enMovil() ? _renderHeroLimites(anio, mes) : '') + _renderResumenGrupos(anio, mes);
  _sincronizarBotonEncabezado();
}

/**
 * La tarjeta de Límites (GAS.7b, ADR 179 D2 y D6): lo que queda de los topes
 * del mes, la barra de lo usado y "Usaste $X de $Y · N límite pasado". Si se
 * pasó del total, lo dice. Sin topes, la invitación a poner el primero.
 *
 * @param {number} anio
 * @param {number} mes - 1-12
 * @returns {string} HTML.
 */
function _renderHeroLimites(anio, mes) {
  const r = resumenLimitesDelMes(S.presupuestos ?? [], S.gastos ?? [], anio, mes);
  const oculto = montosOcultos('presupuesto');
  const m = (n) => (oculto ? SALDO_MASCARA : f(n));
  const mesTxt = htmlMesDelRotulo();

  // GAS.8f (ADR 182 D6): sin límites no hay tarjeta; el primer uso explica
  // qué es un límite.
  if (r.cantidad === 0) return '';

  const pasado = r.queda < 0;
  const usado = r.asignado > 0 ? Math.round((r.gastado / r.asignado) * 100) : 0;
  const pct = Math.min(100, usado);
  const tus = r.cantidad === 1 ? 'en tu límite' : `en tus ${r.cantidad} límites`;
  const cierre = _textoCierreMes(anio, mes);
  return `
    <div class="hero-limites">
      <p class="hero-limites__label">${pasado ? 'Te pasaste en' : 'Te queda para gastar en'} ${mesTxt}</p>
      <p class="hero-limites__valor">${_conSignoLimites(m(Math.abs(r.queda)))}</p>${htmlOjoTarjeta(oculto)}${oculto ? '' : `
      <p class="hero-limites__linea">Usaste ${m(r.gastado)} de ${m(r.asignado)} ${tus}</p>
      <div class="hero-limites__barra" role="progressbar" aria-label="Lo que usaste de tus límites"
           aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}">
        <span class="hero-limites__barra-fill" style="--limites-pct: ${oculto ? 0 : pct}%"></span>
      </div>
      <p class="hero-limites__pie"><span>${usado} % usado</span><span>${cierre}</span></p>`}
    </div>`;
}

/**
 * Los días que le quedan al mes que muestra el bloque, o null si ya cerró.
 *
 * @param {number} anio
 * @param {number} mes - 1-12
 * @param {Date} [hoyDate]
 * @returns {number | null}
 */
function _diasParaCerrar(anio, mes, hoyDate = new Date()) {
  if (anio !== hoyDate.getFullYear() || mes !== hoyDate.getMonth() + 1) return null;
  return new Date(anio, mes, 0).getDate() - hoyDate.getDate();
}

/** "Faltan 11 días para cerrar el mes", "Hoy cierra el mes" o "Mes cerrado". */
function _textoCierreMes(anio, mes) {
  const dias = _diasParaCerrar(anio, mes);
  if (dias === null) return 'Mes cerrado';
  if (dias === 0) return 'Hoy cierra el mes';
  return dias === 1 ? 'Falta 1 día para cerrar el mes' : `Faltan ${dias} días para cerrar el mes`;
}

/** El "$" chico y arriba, como en la tarjeta de Día a día (ADR 157 D4). */
function _conSignoLimites(txt) {
  return txt.startsWith('$') ? `<span class="hero-limites__signo">$</span>${txt.slice(1)}` : txt;
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

  // ADR 132 D8: con plan, los avisos de cada grupo van dentro de su tarjeta;
  // sin plan (no hay tarjeta) siguen sueltos arriba.
  const avisosPlan = mensajes.filter(m => m.grupo && !_esMensajeDeCategoria(m));
  // GAS.7f (ADR 179 D6): en el teléfono la lente abre con los topes por
  // estado, como el tablero; el plan del mes, que el tablero no trae, no se
  // borra: baja al final.
  if (_enMovil()) {
    return `
    ${_renderDetalleEstiloVida(anio, mes, asignadoPorGrupo['estilo-de-vida'] ?? 0, notasCategoria)}
    ${_renderRefuerzoCombinado(mensajes)}
    ${dist ? _renderFranjaPlan(resumen, mes, avisosPlan) : avisosPlan.map(_renderNudge).join('')}`;
  }
  return `
    ${_renderRefuerzoCombinado(mensajes)}
    ${dist ? _renderFranjaPlan(resumen, mes, avisosPlan) : avisosPlan.map(_renderNudge).join('')}
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
function _renderFranjaPlan(resumen, mes, avisos = []) {
  // ADR 132 D8: Estilo de vida primero (es la lente en la que estás) y cada
  // grupo dice dónde se mide; la salida de los otros dos es esa misma línea.
  const SALIDAS = {
    'estilo-de-vida': { texto: 'Se mide aquí, con tus límites' },
    'necesidades':    { href: '#compromisos', texto: 'Se mide en Por pagar' },
    'ahorro':         { href: '#fondo',       texto: 'Se mide en Ahorro' },
  };

  const lineas = ['estilo-de-vida', 'necesidades', 'ahorro'].map((grupo) => {
    const r = resumen[grupo] ?? { pct: 0, estado: 'ok' };
    // Necesidades nunca se pinta en rojo (ADR 019: se monitorea, no se alarma)
    // y Ahorro por encima de su meta es un logro, no un exceso.
    const tono = grupo === 'necesidades' ? 'monitor'
      : grupo === 'ahorro' ? (r.pct >= 100 ? 'logro' : 'ok')
        : r.estado;
    const salida = SALIDAS[grupo];

    return `
        <li class="plan-franja__fila">
          <span class="plan-franja__textos">
            <span class="plan-franja__grupo">${_esc(LABEL_GRUPO_FINANCIERO[grupo] ?? grupo)}</span>
            ${salida.href
    ? `<a class="plan-franja__salida" href="${salida.href}">${salida.texto}</a>`
    : `<span class="plan-franja__aqui">${salida.texto}</span>`}
          </span>
          <span class="plan-franja__pct plan-franja__pct--${tono}">${r.pct}%</span>
        </li>`;
  }).join('');

  const avisosHtml = avisos.map((m) => {
    const nivel = _nivelNudge(m);
    return `
      <p class="plan-franja__aviso plan-franja__aviso--${nivel}" role="${nivel === 'excedido' ? 'alert' : 'status'}">${iconoCategoria(_NUDGE_ICONO[nivel])}<span>${_esc(m.mensaje)}</span></p>`;
  }).join('');

  return `
    <section class="plan-franja" aria-label="Tu plan del mes por grupo">
      <header class="plan-franja__header">
        <h2 class="plan-franja__title">Tu plan de ${_esc(_MESES_CORTOS[mes - 1] ?? '')}</h2>
        <!-- ADR 080 D4: abre el asistente, no navega a la entrada de la
             sección, y la etiqueta nombra la acción y no la sección (R85). -->
        <a href="#tesoreria" class="plan-franja__link" data-action="presupuesto-abrir-distribucion" aria-label="Ajustar tu distribución del ingreso">Ajustar${icon('chevron-right')}</a>
      </header>${avisosHtml}
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
  // ADR 132 D6: con el banner de propósito arriba, el hecho sobra (el banner
  // ya lo dice) y queda el ejemplo; `identidad.css` calla el hecho ahí.
  const vacio = '<span class="estilo-limites__vacio-hecho">Aún no le has puesto tope a ninguna categoría.</span>'
    + (sugerencia ? '' : ' Empieza por donde más gastas: por ejemplo, un máximo de $300.000 para Restaurantes.');

  // ADR 132 D6: el vacío trae su propio "Crear límite"; con él, el "+" del
  // encabezado se esconde en el teléfono (un botón siempre, ADR 077 D4).
  // ADR 132 D8: en el teléfono los topes son filas en una sola tarjeta y cada
  // una abre su hoja; desde 1024px siguen los sobres con sus acciones. El
  // límite de deseos pequeños, si lo hay, es la última fila.
  const movil = _enMovil();
  // GAS.8f (ADR 182 D6): en el teléfono, la alerta del límite más cerca,
  // "Tus límites" en una lista con su pastilla, la sugerencia con Tino y
  // "Otras categorías sin límite"; lo que el tablero no trae (la suma de los
  // topes, el extraordinario, la suscripción larga) sigue al final.
  if (movil) {
    const personalizadas = S.categoriasPersonalizadas ?? [];
    const sinLimite = sinLimiteDelMes(S.presupuestos, gastos, anio, mes)
      .filter(s => _puedeTenerTope(s.categoria, personalizadas));
    const extra = `
      ${_renderExtraordinario(extraordinarioDelMes(S.ingresosPuntuales, anio, mes), presupuestoEV)}
      ${_renderSuscripcionLarga(suscripcion)}`;
    if (activos.length === 0) {
      const empieza = [...sinLimite].sort((a, b) => b.cantidad - a.cantidad || b.gastado - a.gastado)[0];
      return `
    <div class="estilo-limites estilo-limites--primera">
      ${_renderQueEsUnLimite()}
      ${_renderEmpiezaPor(empieza, anio, mes)}
      ${_renderSinPresupuesto(activos, empieza?.categoria)}
      ${extra}
    </div>`;
    }
    const filas = activos.map(p => _renderFilaLimite(p, gastos, anio, mes));
    const hormiga = _renderFilaHormiga(anio, mes);
    if (hormiga) filas.push(hormiga);
    const excedidosM = activos.filter(p => calcularProgreso(p, gastos, anio, mes).estado === 'excedido').length;
    const sugerida = _sugerenciaVigente(categoriaParaSugerirLimite(sinLimite), anio, mes);
    return `
    <div class="estilo-limites estilo-limites--lista">
      ${_renderAlertaLimite(anio, mes)}
      <div class="limites-cabeza">
        <h3 class="limites-cabeza__titulo">Tus límites <span class="limites-cabeza__cuantos">· ${filas.length} ${filas.length === 1 ? 'activo' : 'activos'}</span></h3>
        <button type="button" class="limites-cabeza__nuevo" data-action="nuevo-presupuesto">${icon('plus')}Nuevo</button>
      </div>
      <div class="limites-lista">${filas.join('')}</div>
      ${_renderSugerenciaLimite(sugerida, anio, mes)}
      ${_renderSinPresupuesto(activos, sugerida?.categoria)}
      ${_renderOllaFinita(cobertura, excedidosM, activos.length)}
      ${extra}
    </div>`;
  }
  const filaHormiga = '';
  const lista = activos.length === 0
    ? `<div class="empty-state estilo-limites__vacio-caja">
        <p class="estilo-limites__vacio">${vacio}</p>
        <button type="button" class="btn btn-primary" data-action="nuevo-presupuesto">${icon('plus')}Crear límite</button>
      </div>`
    : movil
      ? `<div class="limites-lista">${activos.map(p => _renderFilaLimite(p, gastos, anio, mes)).join('')}${filaHormiga}</div>`
      : `<div class="envelope-list">${activos.map(p => _renderEnvelope(p, gastos, anio, mes, notasCategoria.get(p.categoria))).join('')}</div>`;

  // El resumen cuenta cuántos topes se pasaron: es lo primero que se busca.
  const excedidos = activos.filter(p => calcularProgreso(p, gastos, anio, mes).estado === 'excedido').length;
  const intro = activos.length === 0
    ? '<p class="estilo-limites__intro">Ponle un máximo mensual a las categorías donde más gastas y te aviso antes de pasarte. Es un tope a lo que gastas, no un ahorro.</p>'
    : '';

  return `
    <div class="estilo-limites">
      ${intro}
      ${_renderOllaFinita(cobertura, excedidos, activos.length)}
      ${_renderExtraordinario(extraordinarioDelMes(S.ingresosPuntuales, anio, mes), presupuestoEV)}
      ${lista}
      ${filaHormiga ? '' : _renderHormiga(anio, mes)}
      ${_renderSugerenciaTope(sugerencia)}
      ${_renderSinPresupuesto(activos)}
      ${_renderSuscripcionLarga(suscripcion)}
    </div>`;
}

// ── LÍMITES EN EL TELÉFONO (GAS.8f, ADR 182 D6) ──────────────────

/** "este mes" en el mes corriente; "en octubre" en otro. */
function _cuandoMes(anio, mes) {
  return _diasParaCerrar(anio, mes) === null ? `en ${_MESES_CORTOS[mes - 1] ?? ''}` : 'este mes';
}

/**
 * La alerta de Límites: una sola, la del límite más cerca de pasarse, en
 * ámbar y con Tino sorprendido ("Restaurantes va en 91 %", "Te quedan
 * $15.500 para 11 días", "Ver"); sin uno cerca y con uno pasado, la roja.
 * "Ver" abre la hoja de ese límite.
 *
 * @param {number} anio
 * @param {number} mes - 1-12
 * @returns {string}
 */
function _renderAlertaLimite(anio, mes) {
  const a = limiteDeLaAlerta(S.presupuestos, S.gastos ?? [], anio, mes);
  if (!a) return '';
  const cat = _esc(a.presupuesto.categoria);
  const { restante, porcentaje, estado } = a.progreso;
  const dias = _diasParaCerrar(anio, mes);
  const ver = `<span class="franja-alerta__verbo">Ver${icon('chevron-right')}</span>`;
  if (estado === 'alerta') {
    const sub = dias === null ? `Te quedaron ${f(restante)}`
      : dias === 0 ? `Te quedan ${f(restante)} para hoy`
        : `Te quedan ${f(restante)} para ${dias} ${dias === 1 ? 'día' : 'días'}`;
    return `
      <button type="button" class="franja-alerta franja-alerta--ambar limites-alerta" data-action="limite-detalle"
              data-id="${_esc(a.presupuesto.id)}" aria-label="${cat} va en ${porcentaje} %. ${sub}. Ver el límite">
        ${htmlTinoSol('sorpresa', { tamano: 48, clase: 'limites-alerta__tino' })}
        <span class="franja-alerta__textos">
          <span class="franja-alerta__titulo">${cat} va en ${porcentaje} %</span>
          <span class="franja-alerta__sub">${sub}</span>
        </span>
        ${ver}
      </button>`;
  }
  // GAS.13e (ADR 188 D5): un límite pasado no lleva franja aparte; lo dice su
  // fila, en rojo (texto y barra).
  if (estado === 'excedido') return '';
  const sub = `Te pasaste ${f(-restante)} ${_cuandoMes(anio, mes)}`;
  return `
      <button type="button" class="franja-alerta limites-alerta" data-action="limite-detalle"
              data-id="${_esc(a.presupuesto.id)}" aria-label="${cat} pasó su límite. ${sub}. Ver el límite">
        <span class="franja-alerta__icono" aria-hidden="true">${icon('alert')}</span>
        <span class="franja-alerta__textos">
          <span class="franja-alerta__titulo">${cat} pasó su límite</span>
          <span class="franja-alerta__sub">${sub}</span>
        </span>
        ${ver}
      </button>`;
}

/** La sugerencia del mes, salvo que se haya descartado ("Ahora no"). */
function _sugerenciaVigente(sugerida, anio, mes) {
  if (!sugerida) return null;
  const clave = `${anio}-${String(mes).padStart(2, '0')}:${sugerida.categoria}`;
  return S.config?.limiteSugerenciaDescartada === clave ? null : { ...sugerida, clave };
}

/**
 * La sugerencia girasol de Límites: la categoría sin tope con más gastos
 * del mes, con "Poner límite a {categoría}" y "Ahora no" (la descarta en
 * ese mes, `S.config.limiteSugerenciaDescartada`).
 *
 * @param {{categoria:string, gastado:number, cantidad:number, clave:string} | null} s
 * @param {number} anio
 * @param {number} mes - 1-12
 * @returns {string}
 */
function _renderSugerenciaLimite(s, anio, mes) {
  if (!s) return '';
  const cat = _esc(s.categoria);
  return `
      <section class="sugerencia limites-sugerencia" aria-labelledby="limites-sugerencia-t">
        ${htmlTinoSol('pensando', { tamano: 54, clase: 'sugerencia__tino' })}
        <div class="sugerencia__textos">
          <p class="sugerencia__titulo" id="limites-sugerencia-t">Has hecho ${s.cantidad} gastos en ${cat} ${_cuandoMes(anio, mes)}</p>
          <p class="sugerencia__texto">Suman ${f(s.gastado)}. ¿Qué tal si le pones un límite para decidir cuánto quieres gastar ahí?</p>
          <div class="limites-sugerencia__botones">
            <button type="button" class="btn btn-primary btn-sm" data-action="nuevo-presupuesto" data-categoria="${cat}">Poner límite a ${cat}</button>
            <button type="button" class="btn btn-ghost btn-sm" data-action="limites-sugerencia-descartar"
                    data-clave="${_esc(s.clave)}">Ahora no</button>
          </div>
        </div>
      </section>`;
}

/** El primer uso: "¿Qué es un límite?" con Tino atajando una moneda y los tres pasos. */
function _renderQueEsUnLimite() {
  const pasos = ['Eliges una categoría', 'Pones el monto del mes', `Te aviso al llegar al ${Math.round(UMBRAL_ALERTA * 100)} %`]
    .map((t, i) => `<li class="limites-que__paso"><span class="limites-que__num" aria-hidden="true">${i + 1}</span>${t}</li>`).join('');
  return `
      <section class="limites-que" aria-labelledby="limites-que-t">
        <div class="limites-que__top">
          ${htmlTinoSol('ataja', { tamano: 100, clase: 'limites-que__tino' })}
          <div class="limites-que__textos">
            <h2 class="limites-que__titulo" id="limites-que-t">¿Qué es un límite?</h2>
            <p class="limites-que__texto">Es lo máximo que decides gastar en una categoría cada mes. Te aviso cuando vas llegando, para que no te pases.</p>
          </div>
        </div>
        <ol class="limites-que__pasos">${pasos}</ol>
      </section>`;
}

/**
 * "Empieza por {la categoría que más usas}": la que más gastos tiene en el
 * mes, con su botón. Sin gastos todavía, el botón de crear el primero.
 */
function _renderEmpiezaPor(e, anio, mes) {
  if (!e) {
    return `
      <button type="button" class="btn btn-primary btn-block limites-empieza__cta" data-action="nuevo-presupuesto">${icon('plus')}Crear mi primer límite</button>`;
  }
  const cat = _esc(e.categoria);
  const teja = tejaCategoria(iconoDeCategoriaGasto(e.categoria, S.categoriasPersonalizadas), 'presupuesto', tonoDeCategoria(e.categoria));
  return `
      <section class="limites-empieza" aria-labelledby="limites-empieza-t">
        <div class="limites-empieza__top">
          <span class="limites-empieza__teja" aria-hidden="true">${teja}</span>
          <div>
            <p class="limites-empieza__titulo" id="limites-empieza-t">Empieza por ${cat}</p>
            <p class="limites-empieza__texto">Llevas ${e.cantidad} ${e.cantidad === 1 ? 'gasto' : 'gastos'} y ${f(e.gastado)} ${_cuandoMes(anio, mes)}. Es la categoría que más usas.</p>
          </div>
        </div>
        <button type="button" class="btn btn-primary btn-block limites-empieza__cta" data-action="nuevo-presupuesto" data-categoria="${cat}">Poner límite a ${cat}</button>
      </section>`;
}

/** La pastilla de cada estado y su texto (ADR 182 D6). */
const _PASTILLA_LIMITE = {
  excedido: 'Te pasaste',
  alerta:   'Cerca',
  ok:       'Vas bien',
};

/**
 * Una fila de "Tus límites" en el teléfono: la teja en su tono, "Usaste $X
 * de $Y", lo que queda (o "por encima") a la derecha y la barra con su
 * pastilla. La fila entera abre su hoja.
 */
function _renderFilaEstado(cat, icono, accion, idAttr, { gastado, asignado, restante, porcentaje, estado }, subs) {
  const pasado = restante < 0;
  return `
    <article class="limite-fila limite-fila--estado list-item--detalle" data-estado="${estado}"${idAttr}>
      <button type="button" class="list-item__detalle" data-action="${accion}"${idAttr}
              aria-label="Ver el límite de ${cat}"></button>
      <span class="limite-fila__teja" aria-hidden="true">${tejaCategoria(icono, 'presupuesto', tonoDeCategoria(cat.split(' · ')[0]))}</span>
      <div class="limite-fila__info">
        <p class="limite-fila__nombre">${cat}</p>
        <p class="limite-fila__uso">Usaste ${f(gastado)} de ${f(asignado)}</p>
      </div>
      <p class="limite-fila__queda limite-fila__queda--${estado}">
        <span class="limite-fila__queda-monto">${f(Math.abs(restante))}</span>
        <span class="limite-fila__queda-txt">${pasado ? 'por encima' : 'te quedan'}</span>
      </p>
      <div class="limite-fila__estado-fila">
        <span class="limite-fila__barra" role="progressbar" aria-valuenow="${porcentaje}" aria-valuemin="0" aria-valuemax="100"
              aria-label="Uso del límite de ${cat}: ${porcentaje}%"><span class="limite-fila__barra-fill" style="--limite-pct: ${Math.min(porcentaje, 100)}%"></span></span>
        <span class="limite-fila__pastilla">${_PASTILLA_LIMITE[estado] ?? _PASTILLA_LIMITE.ok}</span>
      </div>
      ${subs}
    </article>`;
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
function _renderOllaFinita({ limites, presupuesto, sinTope, excede }, excedidos = 0, total = 0) {
  // ADR 132 D8: la suma dice cuántos topes se pasaron, y el aviso de que el
  // plan no alcanza va aparte, en su color.
  const pasaron = excedidos > 0 ? ` Se ${excedidos === 1 ? 'pasó' : 'pasaron'} ${excedidos} de ${total}.` : '';
  const suma = `<p class="estilo-olla">Tus límites suman ${f(limites)}.${pasaron}</p>`;
  if (presupuesto <= 0) return limites > 0 ? suma : '';
  if (excede) {
    return `${suma}
      <p class="estilo-olla estilo-olla--excede">${icon('alert')}<span>Es más que los ${f(presupuesto)} que tu plan asigna a Estilo de vida. Revisa si alguno quedó muy alto.</span></p>`;
  }
  if (limites === 0) {
    return `<p class="estilo-olla">Tu plan asigna ${f(presupuesto)} a Estilo de vida este mes. Aún no le has puesto un límite a ninguna categoría.</p>`;
  }
  if (sinTope === 0) {
    return `<p class="estilo-olla">Tus límites cubren todo tu Estilo de vida (${f(presupuesto)}). No te queda dinero sin tope.${pasaron}</p>`;
  }
  return `<p class="estilo-olla">Tus límites cubren ${f(limites)} de los ${f(presupuesto)} de tu Estilo de vida. Te quedan ${f(sinTope)} sin tope.${pasaron}</p>`;
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
      ${htmlSubcategoriasLimite(presupuesto, gastos, anio, mes)}
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

// ── EN EL TELÉFONO: FILAS CON HOJA (ADR 132 D8) ──────────────────

/** Bajo el corte de escritorio de la app (1024px), como Por pagar (ADR 117). */
function _enMovil() {
  return window.matchMedia?.('(max-width: 1023.98px)').matches === true;
}

/**
 * Lo que dice un tope bajo su barra: "Pasó por $X" en rojo, "Quedan $X" en
 * ámbar desde el 75 % y neutro antes. Lo comparten la fila y su hoja.
 *
 * @param {{ restante: number, estado: string }} progreso
 * @returns {{ texto: string, tono: string }}
 */
export function estadoDeLimite({ restante, estado }) {
  if (restante < 0) return { texto: `Pasó por ${f(-restante)}`, tono: 'danger' };
  return { texto: `Quedan ${f(restante)}`, tono: estado === 'alerta' ? 'warning' : '' };
}

/**
 * Una fila de tope: teja, categoría con lo gastado al lado, la barra y debajo
 * lo que queda (o en cuánto se pasó) con el porcentaje de su tope. Sin botones:
 * la fila entera abre su hoja, con cambiar y quitar.
 *
 * @param {string} cat - nombre ya escapado.
 * @param {string} icono - id del símbolo.
 * @param {string} accion - `limite-detalle` u `hormiga-detalle`.
 * @param {string} id - id del tope ('' para deseos pequeños).
 * @param {{ gastado: number, asignado: number, restante: number, porcentaje: number, estado: string }} progreso
 */
function _renderFila(cat, icono, accion, id, { gastado, asignado, restante, porcentaje, estado }, subs = '') {
  const { texto, tono } = estadoDeLimite({ restante, estado });
  const idAttr = id ? ` data-id="${_esc(id)}"` : '';
  if (_enMovil()) {
    return _renderFilaEstado(cat, icono, accion, idAttr, { gastado, asignado, restante, porcentaje, estado }, subs);
  }
  return `
    <article class="limite-fila list-item--detalle" data-estado="${estado}"${idAttr}>
      <button type="button" class="list-item__detalle" data-action="${accion}"${idAttr}
              aria-label="Ver el límite de ${cat}"></button>
      <span class="limite-fila__teja" aria-hidden="true">${tejaCategoria(icono, 'presupuesto', tonoDeCategoria(cat.split(' · ')[0]))}</span>
      <div class="limite-fila__info">
        <p class="limite-fila__linea">
          <span class="limite-fila__nombre">${cat}</span>
          <span class="limite-fila__gastado">${f(gastado)}</span>
        </p>
        <div class="progress" role="progressbar" aria-valuenow="${porcentaje}" aria-valuemin="0" aria-valuemax="100"
             aria-label="Progreso de ${cat}: ${porcentaje}%">
          <div class="progress-bar ${_claseProgreso(porcentaje)}" style="width:${Math.min(porcentaje, 100)}%"></div>
        </div>
        <p class="limite-fila__meta">
          ${_lineaFilaLimite({ texto, tono, restante, asignado, porcentaje })}
        </p>
        ${subs}
      </div>
    </article>`;
}

/**
 * LIM.2 (ADR 164): bajo un tope por subcategoría, una línea por cada una
 * con su barra fina y "$gastado de $máximo", y lo gastado sin límite
 * propio (cuenta solo en el total). '' si el tope es de toda la categoría.
 * Lo comparten la fila del teléfono, el sobre de escritorio y la hoja.
 *
 * @param {import('../../core/state.js').Presupuesto} presupuesto
 * @param {import('../../core/state.js').Gasto[]} gastos
 * @param {number} anio
 * @param {number} mes - 1-12
 * @returns {string}
 */
export function htmlSubcategoriasLimite(presupuesto, gastos, anio, mes) {
  if (!esLimitePorSubcategoria(presupuesto)) return '';
  const { subs, sinLimite } = calcularProgresoSubcategorias(presupuesto, gastos, anio, mes);
  const filas = subs.map(s => {
    const { tono } = estadoDeLimite(s);
    return `
        <li class="limite-sub-fila" data-estado="${s.estado}">
          <p class="limite-sub-fila__linea">
            <span class="limite-sub-fila__nombre">${_esc(s.nombre)}</span>
            <span class="limite-sub-fila__cifra${tono ? ` limite-fila__estado--${tono}` : ''}">${f(s.gastado)} de ${f(s.asignado)}</span>
          </p>
          <div class="progress progress--sub" role="progressbar" aria-valuenow="${s.porcentaje}" aria-valuemin="0" aria-valuemax="100"
               aria-label="Progreso de ${_esc(s.nombre)}: ${s.porcentaje}%">
            <div class="progress-bar ${_claseProgreso(s.porcentaje)}" style="width:${Math.min(s.porcentaje, 100)}%"></div>
          </div>
        </li>`;
  }).join('');
  const resto = sinLimite > 0
    ? `<p class="limite-subs-lista__resto">Sin límite propio: ${f(sinLimite)}, cuenta en el total.</p>` : '';
  return `
      <ul class="limite-subs-lista" role="list" aria-label="Límites por subcategoría de ${_esc(presupuesto.categoria)}">${filas}
      </ul>${resto}`;
}

/**
 * La línea bajo la barra. En el teléfono (ADR 179 D6), una sola frase:
 * "Te pasaste $45.000 · límite $300.000" o "Quedan $88.000 de $500.000".
 * En escritorio, el estado y el porcentaje de siempre.
 */
function _lineaFilaLimite({ texto, tono, restante, asignado, porcentaje }) {
  const clase = `limite-fila__estado${tono ? ` limite-fila__estado--${tono}` : ''}`;
  if (_enMovil()) {
    const frase = restante < 0
      ? `Te pasaste ${f(-restante)} · límite ${f(asignado)}`
      : `Quedan ${f(restante)} de ${f(asignado)}`;
    return `<span class="${clase}">${frase}</span>`;
  }
  return `<span class="${clase}">${texto}</span>
          <span>${porcentaje}% de ${f(asignado)}</span>`;
}

function _renderFilaLimite(presupuesto, gastos, anio, mes) {
  // GAS.8g (ADR 182 D7): el límite de una sola parte se nombra por ella
  // ("Restaurantes · Domicilio") y no repite su única línea debajo.
  const partes = esLimiteDeUnaParte(presupuesto)
    ? hijosDeCategoria(SUBCATEGORIAS_GASTO, presupuesto.categoria).filter(h => Number(presupuesto.subcategorias?.[h.id]) > 0)
    : [];
  if (partes.length === 1) {
    return _renderFila(
      `${_esc(presupuesto.categoria)} · ${_esc(partes[0].nombre)}`,
      iconoDeCategoriaGasto(presupuesto.categoria, S.categoriasPersonalizadas),
      'limite-detalle',
      presupuesto.id,
      calcularProgreso(presupuesto, gastos, anio, mes),
    );
  }
  return _renderFila(
    _esc(presupuesto.categoria),
    iconoDeCategoriaGasto(presupuesto.categoria, S.categoriasPersonalizadas),
    'limite-detalle',
    presupuesto.id,
    calcularProgreso(presupuesto, gastos, anio, mes),
    htmlSubcategoriasLimite(presupuesto, gastos, anio, mes),
  );
}

/** El límite de deseos pequeños, si tiene uno, como una fila más. */
function _renderFilaHormiga(anio, mes) {
  const p = progresoHormiga(S.gastos ?? [], S.config, anio, mes, S.categoriasPersonalizadas ?? []);
  if (!p.limite) return '';
  return _renderFila('Gastos hormiga', 'c-hormiga', 'hormiga-detalle', '', {
    gastado: p.gastado, asignado: p.limite, restante: p.restante, porcentaje: p.porcentaje, estado: p.estado,
  });
}

// ── GASTOS PEQUEÑOS (APR.1b, ADR 092) ────────────────────────────

/**
 * El límite de deseos pequeños: un sobre que no es de una categoría sino de
 * las compras de hasta el tope, de cualquier categoría. Con límite se dibuja
 * como los demás sobres (barra, restante, editar y quitar); sin límite, y solo
 * si el mes ya tiene compras pequeñas, una línea con el total que ofrece
 * ponerle uno (R35: el consejo y el control son lo mismo). Sin compras ni
 * límite no se dibuja nada.
 *
 * @param {number} anio
 * @param {number} mes - 1-12
 * @returns {string} HTML.
 */
function _renderHormiga(anio, mes) {
  const p = progresoHormiga(S.gastos ?? [], S.config, anio, mes, S.categoriasPersonalizadas ?? []);
  const icono = iconoCategoria('c-hormiga', 'icon icon--sm');
  const compras = `${p.cuantos} ${p.cuantos === 1 ? 'compra' : 'compras'} de ${f(p.tope)} o menos`;
  const aprendidos = htmlAprendidosHormiga();
  if (!p.limite) {
    if (p.gastado <= 0) return aprendidos;
    return `
      <div class="hormiga-oferta">
        <span class="hormiga-oferta__teja" aria-hidden="true">${tejaCategoria('c-hormiga', 'presupuesto')}</span>
        <p class="hormiga-oferta__texto">Tus gastos hormiga de este mes suman <strong>${f(p.gastado)}</strong>: ${compras}.</p>
        <button class="btn btn-secondary btn-sm" type="button" data-action="hormiga-editar">Ponerles un límite</button>
      </div>${aprendidos}`;
  }
  const widthVisual = Math.min(p.porcentaje, 100);
  return `
    <article class="envelope envelope--hormiga" data-estado="${p.estado}">
      <div class="envelope__header">
        <p class="envelope__title">${icono} Gastos hormiga</p>
        <p class="envelope__subtitle">${f(p.gastado)} / ${f(p.limite)}</p>
      </div>
      <div class="progress" role="progressbar"
           aria-valuenow="${p.porcentaje}" aria-valuemin="0" aria-valuemax="100"
           aria-label="Progreso de gastos hormiga: ${p.porcentaje}%">
        <div class="progress-bar ${_claseProgreso(p.porcentaje)}" style="width:${widthVisual}%"></div>
      </div>
      <p class="envelope__meta">
        <span class="envelope__porcentaje">${p.porcentaje}%</span>
        ${p.restante >= 0
          ? `· Restante: ${f(p.restante)}`
          : `· Excedido: <strong>${f(-p.restante)}</strong>`}
      </p>
      <p class="envelope__nota">${compras}, de cualquier categoría.</p>
      <div class="envelope__actions">
        <button class="btn btn-ghost btn-icon" type="button" data-action="hormiga-editar"
                aria-label="Editar el límite de gastos hormiga"><svg class="icon" aria-hidden="true"><use href="#i-edit"/></svg></button>
        <button class="btn btn-ghost btn-icon" type="button" data-action="hormiga-quitar"
                aria-label="Quitar el límite de gastos hormiga"><svg class="icon" aria-hidden="true"><use href="#i-trash"/></svg></button>
      </div>
    </article>${aprendidos}`;
}

/**
 * Lo que el usuario le contó a Finko (SUS.2d, ADR 147 D1): cada concepto que
 * contestó en "¿Es un gusto o algo que necesitas?", con "Cambiar" (a la
 * respuesta contraria) y "Olvidar" (vuelve a decidir su categoría, y si se
 * repite Finko pregunta de nuevo). Plegado: es para revisar, no para leer
 * cada vez. Lo guarda la acción `hormiga-concepto` (index.js).
 *
 * @returns {string} '' si todavía no contestó nada.
 */
export function htmlAprendidosHormiga() {
  const aprendidos = Object.entries(aprendidosDe(S.config)).filter(([, v]) => v === 'gusto' || v === 'necesidad');
  if (aprendidos.length === 0) return '';
  const boton = (concepto, etiqueta, respuesta, texto, aria) => `
            <button type="button" class="btn btn-ghost btn-sm" data-action="hormiga-concepto"
                    data-concepto="${_esc(concepto)}" data-etiqueta="${_esc(etiqueta)}" data-respuesta="${respuesta}"
                    aria-label="${_esc(aria)}">${texto}</button>`;
  const filas = aprendidos
    .map(([concepto, valor]) => ({ concepto, valor, etiqueta: etiquetaConcepto(concepto) }))
    .sort((a, b) => a.etiqueta.localeCompare(b.etiqueta, 'es'))
    .map(({ concepto, valor, etiqueta }) => {
      const opuesto = valor === 'gusto' ? 'necesidad' : 'gusto';
      return `
        <li class="hormiga-aprendidos__fila">
          <span class="hormiga-aprendidos__nombre">${_esc(etiqueta)}</span>
          <span class="hormiga-aprendidos__valor">${valor === 'gusto' ? 'Un deseo' : 'Una necesidad'}</span>
          <span class="hormiga-aprendidos__acciones">${boton(concepto, etiqueta, opuesto, 'Cambiar', `${etiqueta}: cambiar a ${opuesto === 'gusto' ? 'un deseo' : 'una necesidad'}`)}${boton(concepto, etiqueta, '', 'Olvidar', `Olvidar lo que dijiste de ${etiqueta}`)}
          </span>
        </li>`;
    }).join('');
  return `
    <details class="hormiga-aprendidos">
      <summary class="hormiga-aprendidos__resumen">Lo que le contaste a Finko (${aprendidos.length})</summary>
      <p class="hormiga-aprendidos__ayuda">Dice si fue una necesidad o un deseo. No cambia qué es hormiga: eso lo decide que se repita.</p>
      <ul class="hormiga-aprendidos__lista" role="list">${filas}
      </ul>
    </details>`;
}

/**
 * Formulario de deseos pequeños: el límite del mes (opcional) y desde cuánto
 * una compra cuenta como pequeña. El tope es uno solo para toda la app: lo
 * leen Límites, las lecciones de Aprende y el logro "Hormiga a raya".
 *
 * @param {number} [limitePropuesto] - el monto con el que llega desde una
 *   lección (Aplícalo); si no viene, el límite vigente.
 * @returns {string} HTML.
 */
export function renderFormHormiga(limitePropuesto) {
  const ahora = new Date();
  const p = progresoHormiga(S.gastos ?? [], S.config, ahora.getFullYear(), ahora.getMonth() + 1, S.categoriasPersonalizadas ?? []);
  const limite = limitePropuesto ?? p.limite ?? '';
  const hint = p.gastado > 0
    ? `Este mes llevas ${f(p.gastado)} en gastos hormiga`
    : 'Aún no tienes gastos hormiga este mes';
  return `
    <form id="form-hormiga" novalidate data-captura>
      <div class="monto-hero">
        <label class="monto-hero__label" for="hormiga-limite">Máximo al mes para tus gastos hormiga</label>
        <div class="monto-hero__box">
          <span class="monto-hero__prefijo" aria-hidden="true">$</span>
          <input id="hormiga-limite" name="limite" class="input input--big-amount" type="text" value="${miles(limite)}" placeholder="Sin límite"
                 autocomplete="off" inputmode="numeric" data-miles aria-describedby="hormiga-limite-hint" />
        </div>
        <span class="monto-hero__hint" id="hormiga-limite-hint">${hint}</span>
      </div>
      <div class="form-group">
        <label for="hormiga-tope" class="label">Una compra es pequeña si cuesta hasta</label>
        <input id="hormiga-tope" name="tope" class="input" type="text"
               value="${miles(p.tope)}" required aria-required="true" inputmode="numeric" data-miles autocomplete="off" aria-describedby="hormiga-tope-hint" />
        <p class="form-hint" id="hormiga-tope-hint">Con este valor se cuentan tus gastos hormiga en Límites, en tus lecciones y en el logro Hormiga a raya.</p>
      </div>
      <div class="modal__footer modal__footer--principal">
        <button type="button" class="btn btn-ghost" data-action="modal-close">Cancelar</button>
        <button type="submit" class="btn btn-primary">${icon('check-circle')} Guardar gastos hormiga</button>
      </div>
    </form>`;
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
  // SUS.1b (ADR 146 D5): ya no se ofrece como categoría; lo pequeño tiene su
  // propio límite en esta misma pantalla, por eso sin destino.
  'Gastos hormiga':     'Se controla con su propio límite',
};

/**
 * A dónde lleva cada motivo (ficha 12, L4). Las cuatro primeras a la lente
 * hermana del mismo bloque, la quinta a Ahorro (su fondo, ADR 125).
 */
const _DESTINO_SIN_TOPE = {
  'Vivienda':           '#compromisos',
  'Servicios públicos': '#compromisos',
  'Gastos fijos':       '#compromisos',
  'Deudas':             '#compromisos',
  'Ahorro':             '#fondo',
};

/** En el teléfono (ADR 179 D1), la pestaña donde se controla cada una. */
const _PESTANA_SIN_TOPE_MOVIL = {
  'Vivienda':           { motivo: 'Se controla en Fijos', destino: '#fijos' },
  'Servicios públicos': { motivo: 'Se controla en Fijos', destino: '#fijos' },
  'Gastos fijos':       { motivo: 'Se controla en Fijos', destino: '#fijos' },
  'Deudas':             { motivo: 'Se controla en Deudas', destino: '#deudas' },
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
function _renderSinPresupuesto(presupuestos, excluir = '') {
  // Mismo reloj que el resumen de la lente (G4): si el bloque está en junio,
  // "gastas acá y no tiene tope" tiene que hablar de junio.
  const { anio, mes } = mesBloque();
  // GAS.8f (ADR 182 D6): en el teléfono la fila dice cuántos gastos son, y
  // la categoría que ya propone la sugerencia no se repite.
  const huerfanas = _enMovil()
    ? sinLimiteDelMes(presupuestos, S.gastos, anio, mes + 1).filter(h => h.categoria !== excluir)
    : categoriasSinPresupuesto(presupuestos, S.gastos, anio, mes + 1);
  if (huerfanas.length === 0) return '';

  const personalizadas = S.categoriasPersonalizadas ?? [];
  const filas = huerfanas.map(h => {
    const cat   = _esc(h.categoria);
    // ADR 132 D8: la teja de la categoría en vez del ícono suelto.
    const teja = tejaCategoria(iconoDeCategoriaGasto(h.categoria, personalizadas), 'presupuesto', tonoDeCategoria(h.categoria));
    // GAS.7f (ADR 179 D6): en el teléfono el monto va bajo el nombre, "este mes".
    const cuerpo = _enMovil() ? `
        <span class="envelope-huerfanas__cat">${teja}<span class="envelope-huerfanas__nombre">${cat}<span class="envelope-huerfanas__mes">${f(h.gastado)} · ${h.cantidad} ${h.cantidad === 1 ? 'gasto' : 'gastos'}</span></span></span>` : `
        <span class="envelope-huerfanas__cat">${teja}<span>${cat}</span></span>
        <span class="envelope-huerfanas__monto">${f(h.gastado)}</span>`;

    if (!_puedeTenerTope(h.categoria, personalizadas)) {
      // Ficha 12 (L4): el motivo nombraba la sección correcta desde la ficha
      // 05 y seguía siendo texto muerto. Aparece en la fila de una categoría
      // en la que el usuario ESTÁ gastando y donde busca control, así que la
      // salida se enlaza. Sin destino conocido se queda como texto.
      // GAS.7f (ADR 179 D6): en el teléfono "Por pagar" ya no es pestaña; la
      // fila nombra la que sí existe, Fijos o Deudas.
      const movilPestana = _enMovil() ? _PESTANA_SIN_TOPE_MOVIL[h.categoria] : null;
      const motivo  = movilPestana?.motivo ?? _MOTIVO_SIN_TOPE[h.categoria] ?? 'No lleva tope';
      const destino = movilPestana?.destino ?? _DESTINO_SIN_TOPE[h.categoria] ?? '';
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
          <span class="envelope-huerfanas__accion">${icon('plus')}Límite</span>
        </button>
      </li>`;
  }).join('');

  return `
    <section class="envelope-huerfanas" aria-label="Categorías con gastos sin límite asignado">
      ${_enMovil()
        ? '<h3 class="envelope-huerfanas__title">Otras categorías sin límite</h3>'
        : '<h3 class="envelope-huerfanas__title">Gastas acá y no tiene tope</h3>'}
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
   * Pista del monto (ADR 132 D8): cuánto lleva la categoría en el mes, que es
   * el dato con el que se decide el número, y de dónde sale la cifra propuesta
   * cuando no es eso mismo (LIM.1c: la pista dice de dónde sale).
   */
  const nombreMes = _MESES_CORTOS[mes - 1] ?? '';
  const hintDe = (categoria) => {
    const gastado = calcularGastadoCategoria(gastos, categoria, anio, mes);
    const llevas = gastado > 0
      ? `En ${nombreMes} llevas ${f(gastado)} en ${categoria}.`
      : `En ${nombreMes} aún no tienes gastos en ${categoria}.`;
    const s = sugeridoDe(categoria);
    if (s?.acotado)             return `${llevas} Te proponemos lo que tu plan deja sin asignar.`;
    if (s?.base === 'promedio') return `${llevas} Te proponemos tu promedio de los últimos meses.`;
    return llevas;
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
  // LIM.2 (ADR 164): con subcategorías se elige si el tope es de toda la
  // categoría o de cada una. Los bloques nacen ocultos si no tocan (el
  // armazón de preguntas no pregunta un bloque oculto) y `_wireForm` los
  // sigue al cambiar la categoría o el modo.
  const tieneSubs = (cat) => hijosDeCategoria(SUBCATEGORIAS_GASTO, cat).length > 0;
  const porSub = editando && esLimitePorSubcategoria(actual);
  const opcionModo = (valor, etiqueta, sub) => `
          <label class="chip-cat">
            <input type="radio" name="modoLimite" class="chip-cat__radio" value="${valor}"${(valor === 'subcategorias') === porSub ? ' checked' : ''} />
            <span class="chip-cat__label">${etiqueta}</span>
            <span class="chip-cat__sub">${sub}</span>
          </label>`;
  const bloqueModo = `
      <div class="form-group limite-modo" data-limite-modo data-pregunta="¿Cómo quieres el límite?" data-pregunta-id="modo" data-resumen="Límite"
           data-ayuda="Por subcategoría, cada una tiene su máximo y el de la categoría es la suma."${categoriaInicial && tieneSubs(categoriaInicial) ? '' : ' hidden'}>
        <span class="label" id="presupuesto-modo-label">¿Cómo quieres el límite?</span>
        <div class="chips-cat chips-cat--2col" role="radiogroup" aria-labelledby="presupuesto-modo-label">
          ${opcionModo('categoria', 'Toda la categoría', 'Un máximo para todo')}${opcionModo('subcategorias', 'Por subcategoría', 'Un máximo para cada una')}
        </div>
      </div>`;
  const totalInicial = porSub ? actual.montoMensual : 0;
  const gruposSub = categoriasConHijos(SUBCATEGORIAS_GASTO).map(cat => {
    const ver = porSub && cat === categoriaInicial;
    const filas = hijosDeCategoria(SUBCATEGORIAS_GASTO, cat).map(h => {
      const v = ver ? actual.subcategorias?.[h.id] : null;
      return `
          <div class="limite-sub">
            <label class="limite-sub__nombre" for="limite-sub-${h.id}">${_esc(h.nombre)}</label>
            <span class="limite-sub__monto"><span aria-hidden="true">$</span><input id="limite-sub-${h.id}" name="limiteSub.${h.id}" class="input" type="text"
                   inputmode="numeric" data-miles placeholder="Sin límite" autocomplete="off" value="${v ? miles(v) : ''}" /></span>
          </div>`;
    }).join('');
    return `
        <fieldset class="limite-subs" data-limite-subs="${_esc(cat)}"${ver ? '' : ' hidden disabled'}>
          <legend class="sr-only">Máximo al mes de cada subcategoría de ${_esc(cat)}</legend>${filas}
        </fieldset>`;
  }).join('');
  const bloqueSubs = `
      <div class="form-group limite-subs-bloque" data-limite-subs-bloque data-pregunta="¿Cuánto es lo máximo para cada una?" data-pregunta-id="subs"
           data-resumen="Por subcategoría" data-falta="Escribe el máximo de al menos una subcategoría."
           data-ayuda="Deja vacía la que no quieras limitar: lo que gastes ahí cuenta en el total."${porSub ? '' : ' hidden'}>
        <span class="label">Máximo al mes de cada una</span>${gruposSub}
        <p class="limite-subs__total">Total de la categoría: <strong data-limite-total data-resumen-valor>${f(totalInicial)}</strong></p>
      </div>`;
  // Al editar manda el monto guardado; al crear, la propuesta del motor para la
  // categoría precargada. `data-sugerido` marca que el valor lo puso Finko: el
  // cableado solo puede reemplazar lo que Finko escribió, nunca lo que tú.
  const montoInicial = editando
    ? actual.montoMensual
    : (categoriaInicial ? (sugeridoDe(categoriaInicial)?.monto ?? '') : '');

  return `
    <form id="form-presupuesto" novalidate ${editando ? `data-id="${_esc(actual.id)}"` : ''}
          data-preguntas="${editando ? 'Tu límite' : 'Nuevo límite'}" data-resumen-titulo="Así queda tu límite"
          data-preguntas-inicio="${editando ? 'resumen' : ''}">
      <div data-pregunta="¿A qué categoría le pones tope?" data-pregunta-id="categoria" data-resumen="Categoría"
           data-falta="Elige una categoría.">
      ${campoCategoria}
      </div>
      ${bloqueModo}
      <div class="monto-hero" data-limite-monto data-pregunta="¿Cuánto es lo máximo al mes?" data-pregunta-id="monto" data-resumen="Máximo al mes"
           data-falta="Escribe el máximo del mes. Por ejemplo: 300.000"${porSub ? ' hidden' : ''}>
        <label class="monto-hero__label" for="presupuesto-monto">Máximo al mes</label>
        <div class="monto-hero__box">
          <span class="monto-hero__prefijo" aria-hidden="true">$</span>
          <input id="presupuesto-monto" name="montoMensual" class="input input--big-amount" type="text" required aria-required="true"
                 value="${miles(montoInicial)}"${!editando && montoInicial ? ' data-sugerido="1"' : ''}
                 placeholder="0" autocomplete="off" inputmode="numeric" data-miles />
        </div>
        <span class="monto-hero__hint" id="presupuesto-monto-hint">${categoriaInicial ? _esc(hintDe(categoriaInicial)) : 'COP'}</span>
      </div>
      ${bloqueSubs}
      <div class="modal__footer modal__footer--principal">
        <button type="button" class="btn btn-ghost" data-action="modal-close">Cancelar</button>
        <button type="submit" class="btn btn-primary">${icon('check-circle')} ${editando ? 'Guardar límite' : 'Crear límite'}</button>
      </div>
    </form>`;
}

// ── NUEVO LÍMITE EN DOS PASOS, EN EL TELÉFONO (GAS.8g, ADR 182 D7) ─

/**
 * Lo que una parte tiene para contar al elegirla (la nota girasol). Solo las
 * que traen algo útil; las demás no llevan nota.
 */
const _NOTA_PARTE = {
  'rest-domicilio': 'Los domicilios suelen crecer sin que lo notemos. Es un buen lugar para empezar.',
};

/**
 * La hoja "Nuevo límite" del teléfono: dos pasos con su barra de avance.
 * Paso 1, dónde: la categoría (o la lista para elegirla) con "Cambiar",
 * "Toda la categoría" o "Solo una parte" y, en la segunda, una opción por
 * subcategoría con lo que llevas este mes. Paso 2, cuánto: el monto.
 *
 * Es el mismo `#form-presupuesto` con los mismos nombres de campo, así que
 * lo guarda `_guardarPresupuesto` como al de siempre; "Solo una parte"
 * agrega `soloParte` y el máximo va en `limiteSub.{id}`.
 *
 * @param {{ categoria?: string, modo?: 'categoria'|'parte', sub?: string, paso?: 1|2 }} [estado]
 * @returns {string}
 */
export function renderFormLimiteTelefono({ categoria = '', modo = 'categoria', sub = '', paso = 1 } = {}) {
  const ahora = new Date();
  const anio = ahora.getFullYear();
  const mes = ahora.getMonth() + 1;
  const personalizadas = S.categoriasPersonalizadas ?? [];
  const gastos = S.gastos ?? [];
  const hijos = categoria ? hijosDeCategoria(SUBCATEGORIAS_GASTO, categoria) : [];
  const parte = modo === 'parte' && hijos.length > 0;
  const hijo = parte ? hijos.find(h => h.id === sub) : null;
  const listoPaso1 = Boolean(categoria) && (!parte || Boolean(hijo));
  const enPaso2 = paso === 2 && listoPaso1;
  const cat = _esc(categoria);

  const avance = `
      <div class="limite-pasos__cabeza">
        <p class="limite-pasos__paso">Paso ${enPaso2 ? 2 : 1} de 2 · ${enPaso2 ? 'Cuánto' : 'Dónde'}</p>
        <div class="limite-pasos__avance" aria-hidden="true"><span class="limite-pasos__tramo limite-pasos__tramo--on"></span><span class="limite-pasos__tramo${enPaso2 ? ' limite-pasos__tramo--on' : ''}"></span></div>
      </div>`;
  const ocultos = `
      <input type="hidden" name="categoria" value="${cat}" />
      <input type="hidden" name="modoLimite" value="${parte ? 'subcategorias' : 'categoria'}" />
      ${parte ? '<input type="hidden" name="soloParte" value="1" />' : ''}`;

  if (enPaso2) {
    const gastado = parte ? (gastoPorSubcategoria(gastos, categoria, anio, mes)[hijo.id]?.gastado ?? 0)
      : calcularGastadoCategoria(gastos, categoria, anio, mes);
    const donde = parte ? _esc(hijo.nombre) : cat;
    const sugerido = parte ? null : sugerirMontoTope(gastos, categoria, hoy(), { sinTope: _sinTopeDelPlan() })?.monto;
    const nombreMes = _MESES_CORTOS[mes - 1] ?? '';
    return `
    <form id="form-presupuesto" class="limite-pasos" novalidate data-paso="2">
      ${avance}${ocultos}
      <h3 class="limite-pasos__pregunta">¿Cuánto es lo máximo al mes para ${donde}?</h3>
      <div class="monto-hero">
        <label class="monto-hero__label" for="presupuesto-monto">Máximo al mes</label>
        <div class="monto-hero__box">
          <span class="monto-hero__prefijo" aria-hidden="true">$</span>
          <input id="presupuesto-monto" name="${parte ? `limiteSub.${_esc(hijo.id)}` : 'montoMensual'}" class="input input--big-amount" type="text" required aria-required="true"
                 value="${sugerido ? miles(sugerido) : ''}" placeholder="0" autocomplete="off" inputmode="numeric" data-miles
                 aria-describedby="presupuesto-monto-hint" />
        </div>
        <span class="monto-hero__hint" id="presupuesto-monto-hint">${gastado > 0 ? `En ${nombreMes} llevas ${f(gastado)} en ${donde}.` : `En ${nombreMes} aún no tienes gastos en ${donde}.`}</span>
      </div>
      <div class="limite-pasos__pie">
        <button type="button" class="btn btn-ghost" data-action="limite-paso" data-paso="1">Atrás</button>
        <button type="submit" class="btn btn-primary limite-pasos__principal">Crear límite</button>
      </div>
    </form>`;
  }

  let cuerpo;
  if (!categoria) {
    const opciones = _categoriasDisponibles(personalizadas).map(c => `
          <li>
            <button type="button" class="limite-pasos__cat" data-action="limite-elegir-categoria" data-categoria="${_esc(c)}">
              <span class="limite-pasos__teja" aria-hidden="true">${tejaCategoria(iconoDeCategoriaGasto(c, personalizadas), 'presupuesto', tonoDeCategoria(c))}</span>
              <span class="limite-pasos__cat-nombre">${_esc(c)}</span>
              ${icon('chevron-right')}
            </button>
          </li>`).join('');
    cuerpo = opciones
      ? `<ul class="limite-pasos__cats" aria-label="Categorías sin límite">${opciones}</ul>`
      : '<p class="form-hint">Ya le pusiste tope a todas tus categorías de gasto. Edita uno existente si quieres cambiar su monto.</p>';
  } else {
    const delMes = sinLimiteDelMes(S.presupuestos, gastos, anio, mes).find(s => s.categoria === categoria);
    const llevas = delMes
      ? `Este mes: ${f(delMes.gastado)} en ${delMes.cantidad} ${delMes.cantidad === 1 ? 'gasto' : 'gastos'}`
      : 'Este mes aún no tienes gastos aquí';
    const tarjeta = `
        <div class="limite-pasos__elegida">
          <span class="limite-pasos__teja" aria-hidden="true">${tejaCategoria(iconoDeCategoriaGasto(categoria, personalizadas), 'presupuesto', tonoDeCategoria(categoria))}</span>
          <span class="limite-pasos__elegida-textos">
            <span class="limite-pasos__elegida-nombre">${cat}</span>
            <span class="limite-pasos__elegida-sub">${llevas}</span>
          </span>
          <button type="button" class="limite-pasos__cambiar" data-action="limite-cambiar-categoria">Cambiar</button>
        </div>`;
    let alcance = '';
    if (hijos.length > 0) {
      const opcion = (valor, texto) => `<button type="button" role="radio" class="limite-pasos__modo${(valor === 'parte') === parte ? ' limite-pasos__modo--on' : ''}"
                aria-checked="${(valor === 'parte') === parte}" data-action="limite-modo" data-modo="${valor}">${texto}</button>`;
      alcance = `
        <div class="limite-pasos__modos" role="radiogroup" aria-label="Alcance del límite">${opcion('categoria', 'Toda la categoría')}${opcion('parte', 'Solo una parte')}</div>`;
      if (parte) {
        const porSub = gastoPorSubcategoria(gastos, categoria, anio, mes);
        const partes = hijos.map((h) => {
          const on = h.id === sub;
          return `
          <button type="button" role="radio" class="limite-pasos__parte${on ? ' limite-pasos__parte--on' : ''}" aria-checked="${on}"
                  data-action="limite-parte" data-sub="${_esc(h.id)}">
            <span class="limite-pasos__radio" aria-hidden="true"></span>
            <span class="limite-pasos__parte-nombre">${_esc(h.nombre)}</span>
            <span class="limite-pasos__parte-monto">${f(porSub[h.id]?.gastado ?? 0)}</span>
          </button>`;
        }).join('');
        const nota = hijo && _NOTA_PARTE[hijo.id] ? `
        <p class="limite-pasos__nota">${icon('lightbulb')}<span>${_NOTA_PARTE[hijo.id]}</span></p>` : '';
        alcance += `
        <p class="limite-pasos__frase">Elige la parte de ${cat} que quieres cuidar. Al lado ves cuánto llevas en cada una.</p>
        <div class="limite-pasos__partes" role="radiogroup" aria-label="Parte de ${cat}">${partes}</div>${nota}`;
      }
    }
    cuerpo = tarjeta + alcance;
  }

  return `
    <form id="form-presupuesto" class="limite-pasos" novalidate data-paso="1">
      ${avance}${ocultos}
      <h3 class="limite-pasos__pregunta">¿Dónde quieres controlar tu gasto?</h3>
      ${cuerpo}
      <button type="button" class="btn btn-primary limite-pasos__principal" data-action="limite-paso" data-paso="2"${listoPaso1 ? '' : ' disabled'}>Siguiente: ¿cuánto?${icon('arrow-right')}</button>
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
        <div class="chips-cat" role="radiogroup" aria-labelledby="presupuesto-categoria-label">
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


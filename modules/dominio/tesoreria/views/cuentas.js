/**
 * tesoreria/views/cuentas.js - lista de cuentas, formulario del modal e indicador GMF.
 *
 * Sub-modulo de tesoreria/view.js (barrel). Reglas de la capa:
 * - Puede leer S. No puede mutarlo.
 * - Devuelve strings HTML o escribe en el DOM (no ambas cosas en la misma funcion).
 * - Sin logica de negocio: delegar a logic/.
 */

import { S } from '../../../core/state.js';
import { regimenGMF, esBajoMonto, textoRegimenGMF, TOPE_GMF_MARCADA } from '../../../infra/gmf.js';
import { f, hoy, esc as _esc } from '../../../infra/utils.js';
import { icon, emptyArt } from '../../../infra/icons.js';
import { htmlTinoSol } from '../../../infra/ilustraciones.js';
import { bancoAvatar, bancoClase } from '../../../infra/bancos.js';
import { resolverMarca, tejaMarca } from '../../../infra/marcas.js';
import { SALDO_MASCARA, SALDO_MASCARA_CUENTA } from '../../../infra/render.js';
import { BANCOS_CO, TIPOS_LLAVE, MAX_LLAVES_CUENTA, ICONOS_CATEGORIA_PERSONALIZADA } from '../../../core/constants.js';
import { renderIconoPicker } from '../../../infra/icon-picker.js';
import {
  cuentasActivas,
  calcularTotalCuentas,
  composicionCuentas,
  resumenCuentas,
  calcularCostoGMF,
  detectarNudgeGMF,
  tarjetasCredito,
  textoLlave,
} from '../logic/cuentas.js';
import { montosOcultos } from '../../../infra/privacidad.js';
import { guardadoEnCuenta } from '../../../infra/guardado-en.js';

// ── HERO: TOTAL EN CUENTAS (MC.18a, ADR 035 D1+D3+D5) ────────────

/**
 * Opacidad de los segmentos de la barra de composición, por peso
 * (mayor saldo = más opaco).
 *
 * MC-DIS.9 C4: eran [1, 0.62, 0.34] con 0,2 de la cuarta en adelante, es
 * decir contrastes de 5,74 · 3,01 · 1,77 · 1,36 contra el fondo del hero: los
 * dos últimos por debajo del umbral no textual de 3:1 (SC 1.4.11) y entre sí
 * indistinguibles (1,3:1). `composicionCuentas()` deja de devolver una entrada
 * por cuenta (como máximo tres, con el resto agrupado en "otras"), así que
 * estos tres valores cubren la barra completa.
 *
 * El piso es 0,62 y no el 0,55 que pedía el informe: medido sobre el fondo real
 * del hero, 0,55 rinde 2,65:1 y no llega al umbral que la propia corrección
 * invoca. 0,62 es el primer paso que lo alcanza. Contrastes medidos con los
 * tres valores: 5,74 · 4,22 · 3,01.
 */
const _COMPO_OPACIDAD = [1, 0.81, 0.62];

/**
 * Renderiza el hero con el total en cuentas en `#tesoreria-hero`.
 * No-op si el contenedor no existe (sección no montada).
 *
 * - Total protagonista con `calcularTotalCuentas()`; enmascarado con
 *   `SALDO_MASCARA` cuando `S.config.ocultarSaldo` es true (mismo flag
 *   que el ojo de Inicio, IN.2: un solo control de privacidad).
 * - Ojo de privacidad anclado a la esquina (posición estable, solo cambia
 *   el contenido). Sin cuentas no se pinta: no hay nada que enmascarar
 *   (misma disciplina que updSaldo() en el hero de Inicio).
 * - Barra de composición (D3): un segmento por cuenta con saldo positivo hasta
 *   el tope de `composicionCuentas()` (MC-DIS.9 C4), ancho proporcional; el
 *   resumen en texto dice lo mismo que la barra (SC 1.4.11, regla R23).
 */
export function renderHeroTesoreria() {
  const el = document.getElementById('tesoreria-hero');
  if (!el) return;

  const activas    = cuentasActivas(S.cuentas);
  const sinCuentas = activas.length === 0;
  const oculto     = montosOcultos('tesoreria');

  const label    = sinCuentas ? 'Aún no tienes cuentas' : 'Tu dinero en cuentas';
  const totalTxt = sinCuentas ? f(0)
                 : oculto     ? SALDO_MASCARA
                 :              f(calcularTotalCuentas(S.cuentas));

  const ojoHtml = sinCuentas ? '' : `
      <button class="hero-tesoreria__ojo" type="button" id="tesoreria-saldo-ojo"
              data-action="tesoreria-saldo-visibilidad"
              aria-pressed="${oculto}"
              aria-label="${oculto ? 'Mostrar tus saldos' : 'Ocultar tus saldos'}">
        <svg class="icon" aria-hidden="true"><use href="#i-eye${oculto ? '-off' : ''}"/></svg>
      </button>`;

  const compo = sinCuentas ? [] : composicionCuentas(S.cuentas);
  const compoHtml = compo.length === 0 ? '' : `
      <div class="hero-tesoreria__compo" aria-hidden="true">
        ${compo.map(() => '<div class="hero-tesoreria__compo-seg"></div>').join('')}
      </div>`;

  const resumen     = sinCuentas ? '' : resumenCuentas(S.cuentas);
  const resumenHtml = resumen
    ? `<p class="hero-tesoreria__resumen">${_esc(resumen)}</p>`
    : '';

  // ADR 135 D1: en el teléfono la composición cede su lugar a una pastilla
  // con cuántas cuentas hay; desde 1024px sigue la barra (CSS).
  const cuantasHtml = sinCuentas ? '' : `
      <p class="hero-tesoreria__cuantas">${icon('cuentas', 'icon icon--sm')}<span>${activas.length} ${activas.length === 1 ? 'cuenta activa' : 'cuentas activas'}</span></p>`;

  el.innerHTML = `
    <div class="hero-tesoreria">
      <svg class="decor decor--bottom-right" aria-hidden="true"><use href="#d-onda"/></svg>
      ${ojoHtml}
      <p class="hero-tesoreria__label">${label}</p>
      <p class="hero-tesoreria__valor">${totalTxt}</p>
      ${compoHtml}
      ${resumenHtml}
      ${cuantasHtml}
    </div>`;

  // Ancho y opacidad por peso van como propiedad JS tras el innerHTML
  // (cero style="" en el HTML generado, regla del proyecto).
  el.querySelectorAll('.hero-tesoreria__compo-seg').forEach((seg, i) => {
    seg.style.width   = `${compo[i].pct.toFixed(2)}%`;
    seg.style.opacity = String(_COMPO_OPACIDAD[i] ?? 0.62);
  });
}

// ── LISTA DE CUENTAS ─────────────────────────────────────────────

/**
 * Renderiza la lista de cuentas en `#lista-tesoreria`.
 * No-op si el contenedor no existe (sección no montada).
 *
 * MC.18b (ADR 035 D5): el ojo del hero enmascara también el saldo de cada
 * tarjeta, mismo flag `S.config.ocultarSaldo` que el total y el saldo de Inicio.
 */
export function renderListaCuentas() {
  const el = document.getElementById('lista-tesoreria');
  if (!el) return;

  const cuentas = cuentasActivas(S.cuentas);
  const oculto  = montosOcultos('tesoreria');
  el.innerHTML = cuentas.length === 0
    ? _renderEmptyState()
    : cuentas.map(c => _renderCuentaItem(c, oculto)).join('');
}

/**
 * Etiqueta descriptiva del tipo de cuenta para la tarjeta (MC.18b): a
 * diferencia de `cuenta.tipo` (que para billeteras guarda el propio banco,
 * ej. tipo="Nequi", y para efectivo guarda "Efectivo"), esta etiqueta
 * siempre describe la CLASE de forma legible, sin duplicar el nombre que
 * ya se muestra arriba.
 *
 * MC-DIS.9 C11: para la clase efectivo devuelve '' y la tarjeta omite el
 * subtítulo. "Efectivo / Dinero en efectivo" decía lo mismo dos veces con más
 * palabras; es el caso que MC.15a resolvió para los bancos y que quedó
 * pendiente acá.
 *
 * @param {import('../../../core/state.js').Cuenta} cuenta
 * @returns {string}
 */
function _tipoLabel(cuenta) {
  const clase = bancoClase(cuenta.banco);
  if (clase === 'billetera') return 'Billetera digital';
  // ADR 135 D1: el efectivo vuelve a tener línea, pero una que dice algo.
  if (clase === 'efectivo')  return 'Lo que llevas encima';
  return cuenta.tipo || 'Cuenta';
}

/**
 * @param {import('../../../core/state.js').Cuenta} cuenta
 * @param {boolean} oculto - S.config.ocultarSaldo (MC.18b, ADR 035 D5).
 * @returns {string}
 */
function _renderCuentaItem(cuenta, oculto) {
  const banco = cuenta.banco;
  const tipo  = cuenta.tipo;

  // MC.15a: el form actual no ofrece un campo para escribir un nombre
  // propio, así que `nombre` sale siempre de `_autoNombre(banco, tipo)`
  // (logic/cuentas.js) y ya contiene banco + tipo ("Banco de Bogotá
  // Ahorros"). MC.18b separa la tarjeta en dos líneas (nombre arriba, tipo
  // debajo): con nombre autogenerado, el nombre se reduce al banco solo
  // ("Banco de Bogotá") y el tipo aporta la info real (`_tipoLabel()`), sin
  // repetir palabras. `normalizarCuenta()` sí respeta un nombre explícito si
  // algún día se habilita ese campo (ver sus tests): ahí el nombre completo
  // se conserva y el subtítulo vuelve a ser "banco · tipo" (informa a qué
  // cuenta real corresponde el nombre elegido).
  const combinado = banco === tipo ? banco : `${banco} ${tipo}`;
  const esAutoNombre = (cuenta.nombre ?? '').trim().toLowerCase() === combinado.trim().toLowerCase();
  const nombre    = _esc(esAutoNombre ? banco : cuenta.nombre);
  // ADR 135 D1: con nombre propio, qué es y de qué banco ("Ahorros ·
  // Bancolombia"), en ese orden.
  const subtitulo = esAutoNombre ? _tipoLabel(cuenta) : `${tipo} · ${banco}`;

  const saldoTxt = oculto ? SALDO_MASCARA_CUENTA : f(cuenta.saldo);

  const chips = [];
  if (cuenta.cuotaManejo) {
    chips.push({ icon: 'i-agenda', label: `Cuota ${f(cuenta.cuotaManejo.monto)} · día ${cuenta.cuotaManejo.diaCobro}` });
  }
  // GMF.1 (ADR 165): el chip dice cómo paga el 4x1000.
  const regimen = regimenGMF(cuenta);
  if (regimen.tipo === 'sujeta') {
    chips.push({ icon: 'i-percent', label: '4x1000' });
  } else if (regimen.tipo === 'exenta') {
    chips.push({ icon: 'i-percent', label: esBajoMonto(cuenta) ? 'Bajo monto' : 'Exenta 4x1000' });
  }
  // MC.19 (ADR 170 D4): el chip de la llave copia lo que muestra.
  const transferencia = _primerDatoTransferencia(cuenta, oculto);
  if (transferencia) {
    chips.push({ icon: 'i-key', label: transferencia.label, copiar: transferencia });
  }
  // MC-DIS.9 C1 (regla R19): la etiqueta viaja en `.chip__label` y no como nodo
  // de texto suelto, para que pueda truncarse con elipsis cuando el dato es
  // largo (un nodo suelto dentro del inline-flex del chip no lo acepta).
  const chipsHtml = chips.map(ch => (ch.copiar ? `
          <button type="button" class="chip chip--copiar" data-action="cuenta-llave-copiar"
                  data-cuenta-id="${_esc(cuenta.id)}" data-llave="${ch.copiar.llave}" aria-label="Copiar ${_esc(ch.copiar.nombre)}">
            <svg class="icon icon--sm" aria-hidden="true"><use href="#${ch.icon}"/></svg>
            <span class="chip__label">${ch.label}</span>
          </button>` : `
          <span class="chip">
            <svg class="icon icon--sm" aria-hidden="true"><use href="#${ch.icon}"/></svg>
            <span class="chip__label">${ch.label}</span>
          </span>`)).join('');

  // MC-DIS.9 C11: sin subtítulo (clase efectivo) el párrafo no se emite.
  // ADR 135 D1: en el teléfono los chips se callan y el 4x1000 viaja en la
  // línea; desde 1024px lo dice su chip y esta parte se oculta (CSS).
  const gmfHtml = regimen.tipo === 'sujeta' ? '<span class="cuenta-card__gmf" data-solo-fila> · aplica 4x1000</span>'
    : regimen.tipo === 'exenta' && !esBajoMonto(cuenta) ? '<span class="cuenta-card__gmf" data-solo-fila> · exenta del 4x1000</span>' : '';
  const subtituloHtml = subtitulo
    ? `<p class="cuenta-card__tipo">${_esc(subtitulo)}${gmfHtml}</p>`
    : '';

  // ADR 109 (MV2.9): en móvil la tarjeta es una fila de una línea que abre la
  // hoja de detalle (ui/detalle-fila.js) con sus acciones y sus chips. En
  // escritorio el botón no se ve y la tarjeta sigue como siempre.
  return `
    <article class="cuenta-card list-item--detalle" data-id="${_esc(cuenta.id)}">
      <button class="list-item__detalle" type="button" data-action="cuenta-detalle" data-id="${_esc(cuenta.id)}"
              aria-label="Ver detalle: ${nombre}, ${saldoTxt}"></button>
      <div class="cuenta-card__top">
        <div class="cuenta-card__icon" aria-hidden="true">${_bankAvatarHtml(cuenta.banco, cuenta.icono)}</div>
        <div class="cuenta-card__info">
          <p class="cuenta-card__nombre">${nombre}</p>
          ${subtituloHtml}
        </div>
        <span class="cuenta-card__saldo">${saldoTxt}</span>
      </div>
      <div class="cuenta-card__bottom">
        <div class="cuenta-card__chips">${chipsHtml}</div>
        <div class="cuenta-card__actions">
          <!-- Ficha 15 (M3): de un saldo a los movimientos que lo explican. Es
               la pregunta natural despues de mirar una cuenta, y hasta ahora
               costaba dos toques mas escribir el nombre en el buscador. Mismo
               patron de salida prefiltrada que la tarjeta de credito usa hacia
               "Por pagar" (ADR 080 D5). -->
          <button class="btn btn-ghost btn-sm"
                  data-action="cuenta-ver-movimientos"
                  data-id="${_esc(cuenta.id)}"
                  aria-label="Ver los movimientos de ${nombre}">Ver sus movimientos</button>
          <button class="btn btn-ghost btn-icon btn-sm"
                  data-action="editar-cuenta"
                  data-id="${_esc(cuenta.id)}"
                  aria-label="Editar cuenta: ${nombre}"><svg class="icon" aria-hidden="true"><use href="#i-edit"/></svg></button>
          <button class="btn btn-ghost btn-icon btn-sm cuenta-card__eliminar"
                  data-action="eliminar-cuenta"
                  data-id="${_esc(cuenta.id)}"
                  aria-label="Eliminar cuenta: ${nombre}"><svg class="icon" aria-hidden="true"><use href="#i-trash"/></svg></button>
        </div>
      </div>
    </article>`;
}

/**
 * La hoja de una cuenta (ADR 135 D4): la cuenta con su saldo; tipo, 4x1000,
 * cuota de manejo y el dato para recibir en filas; "Ver sus movimientos" como
 * fila; "Editar la cuenta" y, aparte, "Eliminar la cuenta". Las acciones pasan
 * por `registrar-abrir`, que cierra la hoja antes de abrir su formulario o su
 * confirmación (mismo puente que la hoja de una reserva, ADR 133 D4).
 *
 * @param {import('../../../core/state.js').Cuenta} cuenta
 * @returns {string}
 */
export function htmlDetalleCuenta(cuenta) {
  const oculto = montosOcultos('tesoreria');
  const id     = _esc(cuenta.id);
  const banco  = cuenta.banco;
  const tipo   = cuenta.tipo;
  const combinado   = banco === tipo ? banco : `${banco} ${tipo}`;
  const esAutoNombre = (cuenta.nombre ?? '').trim().toLowerCase() === combinado.trim().toLowerCase();
  const nombre = _esc(esAutoNombre ? banco : cuenta.nombre);
  const sub    = _esc(esAutoNombre ? _tipoLabel(cuenta) : `${tipo} · ${banco}`);
  const clase  = bancoClase(banco);
  const saldo  = oculto ? SALDO_MASCARA_CUENTA : f(cuenta.saldo);

  const cuota = cuenta.cuotaManejo
    ? `${oculto ? SALDO_MASCARA_CUENTA : f(cuenta.cuotaManejo.monto)}, el día ${_esc(String(cuenta.cuotaManejo.diaCobro))}`
    : 'No tiene';
  const recibir = htmlParaRecibir(cuenta, oculto);
  const datos = [
    ['Tipo', clase === 'billetera' ? 'Billetera digital' : clase === 'efectivo' ? 'Efectivo' : _esc(tipo || 'Cuenta')],
    clase !== 'efectivo' && ['4x1000', _esc(textoRegimenGMF(cuenta, f) || 'No aplica')],
    clase !== 'efectivo' && ['Cuota de manejo', cuota],
  ].filter(Boolean).map(([k, v]) => `
      <div class="detalle-gasto__dato"><dt>${k}</dt><dd>${v}</dd></div>`).join('');

  const puente = (accion) => `data-action="registrar-abrir" data-target-action="${accion}" data-id="${id}"`;
  return `
    <div class="detalle-fila__cabeza" data-cuenta-id="${id}">
      <div class="detalle-fila__icono" aria-hidden="true">${_bankAvatarHtml(banco, cuenta.icono)}</div>
      <div class="detalle-fila__textos">
        <h2 class="detalle-fila__titulo" id="detalle-fila-titulo">${nombre}</h2>
        <p class="detalle-fila__sub">${sub}</p>
      </div>
    </div>
    <p class="detalle-fila__monto">${saldo}</p>
    <dl class="detalle-gasto__datos">${datos}
    </dl>${recibir}${htmlGuardadoAqui(cuenta.id, oculto)}
    <button type="button" class="detalle-gasto__ver" ${puente('cuenta-ver-movimientos')}>
      <span class="detalle-gasto__ver-textos">
        <span class="detalle-gasto__ver-titulo">Ver sus movimientos</span>
        <span class="detalle-gasto__ver-sub">Se abre Movimientos solo con esta cuenta</span>
      </span>
      ${icon('chevron-right')}
    </button>
    <div class="detalle-fila__acciones">
      <button type="button" class="btn btn-secondary detalle-fila__accion" ${puente('editar-cuenta')}>${icon('edit')}Editar la cuenta</button>
    </div>
    <div class="detalle-fila__peligro">
      <button type="button" class="btn btn-ghost detalle-fila__accion detalle-fila__accion--peligro" ${puente('eliminar-cuenta')}>${icon('trash')}Eliminar la cuenta</button>
      <p class="detalle-gasto__al-borrar">Te pediremos confirmar.</p>
    </div>`;
}

/**
 * "Guardado aquí" en la hoja de la cuenta (AH.9, ADR 174 D3): las metas, las
 * reservas y el fondo que dicen estar en ella, con su monto, para compararlos
 * con los bolsillos de la app del banco. Las metas y reservas ya salieron del
 * saldo; el fondo está dentro de él (ADR 020). '' si no hay nada.
 * @param {string} cuentaId
 * @param {boolean} oculto - el ojo de Mis cuentas (ADR 166).
 * @returns {string}
 */
export function htmlGuardadoAqui(cuentaId, oculto) {
  const { bolsas, fondo } = guardadoEnCuenta(cuentaId, { metas: S.metas, apartados: S.apartados, ahorro: S.ahorro });
  if (bolsas.length === 0 && !fondo) return '';
  const m = (n) => (oculto ? SALDO_MASCARA_CUENTA : f(n));
  const fila = (nombre, tipo, bolsillo, monto) => `
        <li class="guardado-aqui__fila">
          <span class="guardado-aqui__textos">
            <span class="guardado-aqui__nombre">${_esc(nombre)}</span>
            <span class="guardado-aqui__sub">${_esc([tipo, bolsillo && `bolsillo ${bolsillo}`].filter(Boolean).join(' · '))}</span>
          </span>
          <span class="guardado-aqui__monto">${m(monto)}</span>
        </li>`;
  const listaBolsas = bolsas.length === 0 ? '' : `
      <ul class="guardado-aqui__lista" role="list">${bolsas.map(b => fila(b.nombre, b.tipo === 'meta' ? 'Meta' : 'Reserva', b.bolsillo, b.monto)).join('')}
      </ul>
      <p class="guardado-aqui__nota">Este dinero ya salió del saldo de la cuenta: lo apartaste.</p>`;
  const listaFondo = !fondo ? '' : `
      <ul class="guardado-aqui__lista" role="list">${fila('Fondo de emergencia', 'Fondo', fondo.bolsillo, fondo.monto)}
      </ul>
      <p class="guardado-aqui__nota">Tu fondo está dentro de este saldo.</p>`;
  return `
    <section class="guardado-aqui" aria-labelledby="guardado-aqui-${_esc(cuentaId)}">
      <h3 class="guardado-aqui__titulo" id="guardado-aqui-${_esc(cuentaId)}">Guardado aquí</h3>${listaBolsas}${listaFondo}
    </section>`;
}

/**
 * Los datos para recibir de una cuenta, en orden (MC.19, ADR 170 D4): cada
 * llave y el número de cuenta. `llave` es el índice en `llaves` o 'numero':
 * es lo que viaja en `data-llave` para copiar o ver el dato sin ponerlo en el
 * HTML.
 * @param {import('../../../core/state.js').Cuenta} cuenta
 * @returns {Array<{ llave: string, tipo: string, valor: string }>}
 */
export function datosParaRecibir(cuenta) {
  const dt = cuenta?.datosTransferencia;
  if (!dt) return [];
  const llaves = (Array.isArray(dt.llaves) ? dt.llaves : [])
    .map((l, i) => ({ llave: String(i), tipo: l.tipo || 'Otro', valor: String(l.valor ?? '') }))
    .filter(l => l.valor);
  if (dt.numeroCuenta) llaves.push({ llave: 'numero', tipo: 'Número de cuenta', valor: String(dt.numeroCuenta) });
  return llaves;
}

/**
 * Cómo se nombra un dato al copiarlo: "tu llave de celular", "tu número de
 * cuenta" (ADR 170 D4: "Copiaste tu llave de celular de Nequi").
 * @param {string} tipo
 * @returns {string}
 */
export function nombreDatoRecibir(tipo) {
  if (tipo === 'Número de cuenta') return 'tu número de cuenta';
  if (tipo === 'Alfanumérica') return 'tu llave alfanumérica';
  if (tipo === 'Otro' || !tipo) return 'tu llave';
  return `tu llave de ${tipo.toLowerCase()}`;
}

/**
 * El dato del chip de la tarjeta de escritorio (MC.14, chip desde MC.18b):
 * UNO, el primero de los datos para recibir (MC-DIS.9 C1: con todos, el chip
 * se salía de la tarjeta). Desde MC.19 el chip lo copia.
 * @param {import('../../../core/state.js').Cuenta} cuenta
 * @param {boolean} oculto el ojo de Mis cuentas cerrado
 * @returns {{ label: string, llave: string, nombre: string }|null}
 */
function _primerDatoTransferencia(cuenta, oculto) {
  const d = datosParaRecibir(cuenta)[0];
  if (!d) return null;
  const etiqueta = d.tipo === 'Número de cuenta' ? 'N.°' : d.tipo;
  return {
    label: `${_esc(etiqueta)} ${_esc(textoLlave(d.tipo, d.valor, { oculto }))}`,
    llave: d.llave,
    nombre: nombreDatoRecibir(d.tipo),
  };
}

/**
 * "Para recibir" en la hoja de la cuenta (MC.19, ADR 170 D4 y D5): cada llave
 * y el número de cuenta con su botón Copiar. El documento y el número van
 * enmascarados (`•••• 4567`) y tocarlos los muestra completos hasta cerrar la
 * hoja; con el ojo de Mis cuentas cerrado, todo va enmascarado. Copiar
 * siempre copia el dato completo.
 * @param {import('../../../core/state.js').Cuenta} cuenta
 * @param {boolean} oculto
 * @returns {string} '' sin datos.
 */
export function htmlParaRecibir(cuenta, oculto) {
  const datos = datosParaRecibir(cuenta);
  if (datos.length === 0) return '';
  const id = _esc(cuenta.id);
  const filas = datos.map(d => {
    const texto = _esc(textoLlave(d.tipo, d.valor, { oculto }));
    const enmascarado = textoLlave(d.tipo, d.valor, { oculto }) !== textoLlave(d.tipo, d.valor, { ver: true });
    const valor = enmascarado && !oculto
      ? `<button type="button" class="detalle-cuenta__ver" data-action="cuenta-llave-ver" data-cuenta-id="${id}" data-llave="${d.llave}" aria-label="Ver ${_esc(nombreDatoRecibir(d.tipo))} completo">${texto}</button>`
      : `<span class="detalle-cuenta__valor">${texto}</span>`;
    return `
      <div class="detalle-gasto__dato detalle-cuenta__llave">
        <dt>${_esc(d.tipo)}</dt>
        <dd>${valor}</dd>
        <button type="button" class="btn btn-ghost detalle-cuenta__copiar" data-action="cuenta-llave-copiar"
                data-cuenta-id="${id}" data-llave="${d.llave}" aria-label="Copiar ${_esc(nombreDatoRecibir(d.tipo))}">Copiar</button>
      </div>`;
  }).join('');
  return `
    <p class="detalle-cuenta__rotulo">Para recibir</p>
    <dl class="detalle-gasto__datos detalle-cuenta__llaves">${filas}
    </dl>`;
}

/**
 * Una llave del formulario (MC.19, ADR 170 D6): su tipo en chips y su valor,
 * con el botón para quitarla. Cada fila es su propio grupo de radios.
 * @param {{ tipo?: string, valor?: string }} [llave]
 * @returns {string}
 */
export function htmlFilaLlave({ tipo = 'Celular', valor = '' } = {}) {
  const uid = Math.random().toString(36).slice(2, 8);
  const chips = TIPOS_LLAVE.map(t => `
            <label class="chip-fecha">
              <input type="radio" class="chip-cat__radio" name="llaveTipo-${uid}" value="${_esc(t)}"${t === tipo ? ' checked' : ''} />
              ${_esc(t)}
            </label>`).join('');
  return `
        <div class="llave-fila" data-llave-fila>
          <div class="fecha-chips fecha-chips--rejilla llave-fila__tipos" role="radiogroup" aria-label="Tipo de llave">${chips}
          </div>
          <div class="llave-fila__valor">
            <label class="sr-only" for="llave-${uid}">Llave</label>
            <input id="llave-${uid}" name="llaveValor" class="input" type="text" autocomplete="off"
                   value="${_esc(valor)}" placeholder="Ej. 300 123 4567, @maria123" />
            <button type="button" class="btn btn-icon btn-ghost" data-action="cuenta-llave-quitar" aria-label="Quitar esta llave">
              <svg class="icon" aria-hidden="true"><use href="#i-trash"/></svg>
            </button>
          </div>
        </div>`;
}

function _renderEmptyState() {
  return `
    <div class="empty-state">
      <div class="empty-state__icon">${emptyArt('cuentas')}</div>
      <p class="empty-state__title">Agrega tu primera cuenta</p>
      <p class="empty-state__desc">Bancaria, billetera digital o efectivo: verás tu saldo real en Inicio.</p>
      <button class="btn btn-primary" data-action="nueva-cuenta">+ Agregar cuenta</button>
      <p class="empty-state__tip">${icon('lightbulb')} Tip: Nequi, Daviplata y el efectivo también cuentan. Todo lo que tienes, en un solo lugar.</p>
    </div>`;
}

// ── TARJETAS DE CRÉDITO (MC.16c, ADR 051 D6) ──────────────────────

/**
 * Renderiza el bloque de tarjetas de crédito en `#tesoreria-tarjetas`.
 * No-op si el contenedor no existe o no hay tarjetas operables.
 *
 * Fuera del total de dinero disponible (D6, la tarjeta no es un activo), con
 * cupo usado/disponible. GAS.9d (ADR 183 D4): la tarjeta nace aquí ("Agregar
 * cuenta") y su fila abre la hoja de la tarjeta (pagar, avance, editar,
 * eliminar); la deuda se consulta en Deudas.
 */
export function renderTarjetasTC() {
  const el = document.getElementById('tesoreria-tarjetas');
  if (!el) return;

  const tarjetas = tarjetasCredito(S.compromisos);
  if (tarjetas.length === 0) {
    el.innerHTML = '';
    return;
  }

  const oculto = montosOcultos('tesoreria');

  el.innerHTML = `
    <h2 class="tesoreria-lb">Tus tarjetas de crédito</h2>
    ${tarjetas.map(t => _renderTarjetaTC(t, oculto)).join('')}`;
}

/**
 * Reusa la anatomía de `.cuenta-card` (MC.18b): mismo componente visual que
 * el resto de la sección, sin vocabulario CSS nuevo. La diferencia es de
 * contenido, no de tarjeta: cupo como subtítulo, disponible como cifra
 * prominente, usado como chip, y la salida a "Por pagar" donde iban editar/eliminar.
 *
 * @param {import('../../../core/state.js').Compromiso} tarjeta
 * @param {boolean} oculto - S.config.ocultarSaldo (mismo flag que el resto de la sección).
 * @returns {string}
 */
function _renderTarjetaTC(tarjeta, oculto) {
  const cupoTotal   = Number(tarjeta.cupoTotal) || 0;
  const usado       = Number(tarjeta.saldoTotal) || 0;
  const disponible  = Math.max(cupoTotal - usado, 0);
  // GAS.9g (ADR 183 D4): una deuda guarda su nombre en `descripcion`; leer
  // `nombre` (MC.16c) dejaba la fila sin nombre. Y el logo de su banco, como en
  // Deudas, cuando el nombre lo dice.
  const nombre      = _esc(tarjeta.descripcion ?? tarjeta.nombre ?? '');
  const marca       = resolverMarca(tarjeta.descripcion ?? tarjeta.nombre ?? '');

  const disponibleTxt = oculto ? SALDO_MASCARA_CUENTA : f(disponible);
  const usadoTxt       = oculto ? SALDO_MASCARA_CUENTA : f(usado);

  // ADR 109: misma fila con hoja que las cuentas; lo usado viaja como nota.
  return `
    <article class="cuenta-card list-item--detalle cuenta-card--tarjeta" data-id="${_esc(tarjeta.id)}">
      <button class="list-item__detalle" type="button" data-action="compromiso-detalle" data-id="${_esc(tarjeta.id)}"
              aria-label="Ver detalle: ${nombre}, disponible ${disponibleTxt}"></button>
      <div class="cuenta-card__top">
        <div class="cuenta-card__icon" aria-hidden="true">${marca ? tejaMarca(marca) : _bankAvatarHtml('otro')}</div>
        <div class="cuenta-card__info">
          <p class="cuenta-card__nombre">${nombre}</p>
          <p class="cuenta-card__tipo">Cupo ${f(cupoTotal)}</p>
        </div>
        <span class="cuenta-card__saldo" aria-label="Disponible ${disponibleTxt}">${disponibleTxt}</span>
      </div>
      <div class="cuenta-card__bottom">
        <div class="cuenta-card__chips">
          <span class="chip"><span class="chip__label">Usado ${usadoTxt}</span></span>
        </div>
        <div class="cuenta-card__actions">
          <!-- ADR 080 D5: el hash ya era el correcto (la lente "Por pagar" es
               #compromisos desde el ADR 069 D1), lo que mentía era el rótulo.
               Y no basta con renombrarlo: la tarjeta habla de UNA deuda, así
               que la salida llega con el chip "Deudas" puesto y esa deuda a la
               vista. Botón y no enlace, porque además de navegar fija un
               filtro: mismo criterio que los chips de la casa de Ahorro. -->
          <button type="button" class="btn btn-ghost btn-sm"
                  data-action="tc-ver-en-por-pagar" data-id="${_esc(tarjeta.id)}">
            Ver la deuda
          </button>
        </div>
      </div>
    </article>`;
}

// ── FORMULARIO DEL MODAL ─────────────────────────────────────────

/**
 * Devuelve el HTML del formulario de nueva cuenta para inyectar en `#modal-cuenta-body`.
 * La función es pura: no toca el DOM.
 *
 * @returns {string}
 */
export function renderFormCuenta() {
  const bancoItems = BANCOS_CO.map(b => `
    <li role="option"
        class="bank-picker__item"
        data-value="${_esc(b.id)}"
        aria-selected="false"
        tabindex="-1">
      ${_bankAvatarHtml(b.id)}
      <span>${_esc(b.id)}</span>
    </li>`).join('');

  return `
    <form id="form-cuenta" novalidate data-preguntas="Nueva cuenta" data-resumen-titulo="Así queda tu cuenta">
      <div data-pregunta="¿Dónde tienes este dinero?" data-pregunta-id="banco" data-resumen="Banco o billetera"
           data-ayuda="Tu banco, tu billetera o el efectivo." data-falta="Elige el banco o la billetera.">
      <div class="form-group">
        <label id="label-banco" class="label">Banco o billetera</label>
        <div class="bank-picker"
             role="combobox"
             aria-expanded="false"
             aria-haspopup="listbox"
             aria-labelledby="label-banco">
          <button type="button"
                  class="bank-picker__trigger"
                  aria-controls="banco-list"
                  aria-expanded="false">
            <span class="bank-picker__display" data-resumen-valor>
              <span class="bank-picker__placeholder">Seleccionar…</span>
            </span>
            <span class="bank-picker__chevron" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5"
                      stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </span>
          </button>
          <input type="hidden" name="banco" value="" required />
          <ul class="bank-picker__list"
              id="banco-list"
              role="listbox"
              aria-label="Banco o billetera"
              tabindex="-1"
              hidden>
            ${bancoItems}
          </ul>
        </div>
      </div>

      <div class="form-group" id="form-group-icono" hidden>
        ${renderIconoPicker(ICONOS_CATEGORIA_PERSONALIZADA, { id: 'cuenta-icono', label: 'Ícono' })}
      </div>

      </div>

      <div class="form-group" id="form-group-tipo" data-pregunta="¿Qué tipo de cuenta es?" data-pregunta-id="tipo"
           data-resumen="Tipo" data-falta="Elige el tipo de cuenta." hidden>
        <label for="cuenta-tipo" class="label">Tipo de cuenta</label>
        <select id="cuenta-tipo" name="tipo" class="input" required aria-required="true">
          <option value="">Seleccionar…</option>
        </select>
      </div>
      <div class="form-group" data-pregunta="¿Cuánto tienes hoy en esta cuenta?" data-pregunta-id="saldo" data-resumen="Saldo"
           data-ayuda="Míralo en la app de tu banco. Si está en cero, sigue.">
        <label for="cuenta-saldo" class="label">Saldo actual</label>
        <input id="cuenta-saldo" name="saldo" class="input" type="text" inputmode="numeric" data-miles autocomplete="off" placeholder="0" value="0" />
      </div>

      <div class="form-group" id="form-group-4x1000" data-pregunta="¿Es tu cuenta marcada exenta del 4x1000?" data-pregunta-id="gmf"
           data-resumen="4x1000" data-falta="Dinos si es tu cuenta marcada exenta del 4x1000." hidden>
        <span class="label" id="cuenta-4x1000-label">¿Es tu cuenta marcada exenta del 4x1000?</span>
        <div class="chips-cat chips-cat--2col" role="radiogroup" aria-labelledby="cuenta-4x1000-label">
          <label class="chip-cat">
            <input type="radio" name="exenta4x1000" value="si" class="chip-cat__radio" required />
            <span class="chip-cat__label">Sí, es la marcada</span>
          </label>
          <label class="chip-cat">
            <input type="radio" name="exenta4x1000" value="no" class="chip-cat__radio" />
            <span class="chip-cat__label">No</span>
          </label>
        </div>
        <p class="form-hint" id="cuenta-4x1000-hint">Casi siempre es la de nómina y solo puede haber una: no paga 4x1000 hasta ${f(TOPE_GMF_MARCADA)} al mes. Las demás pagan en cada retiro.</p>
      </div>

      <div data-opcional="Cuota de manejo">
      <div class="form-group form-group--checkbox">
        <label class="checkbox-row">
          <input type="checkbox"
                 id="cuenta-cuota-toggle"
                 name="cuotaManejoActiva"
                 data-cuota-toggle />
          <span>Esta cuenta cobra cuota de manejo mensual</span>
        </label>
        <p class="form-hint form-hint--muted" id="cuenta-cuota-hint">
          ¿Seguro que esta cuenta no cobra cuota de manejo, seguros u otros costos periódicos?
        </p>
      </div>

      <fieldset id="cuenta-cuota-fieldset" class="cuota-fieldset" hidden>
        <div class="form-group">
          <label for="cuenta-cuota-monto" class="label">
            Monto de la cuota
          </label>
          <input id="cuenta-cuota-monto"
                 name="cuotaManejoMonto"
                 class="input"
                 type="text" inputmode="numeric" data-miles autocomplete="off"
                 placeholder="Ej. 15000" />
        </div>
        <div class="form-group">
          <label for="cuenta-cuota-dia" class="label">Día de cobro</label>
          <input id="cuenta-cuota-dia"
                 name="cuotaManejoDia"
                 class="input"
                 type="number"
                 min="1" max="31" step="1"
                 placeholder="Ej. 15" />
        </div>
        <p class="form-hint form-hint--muted">
          Finko crea un gasto fijo mensual con este monto y día. Lo verás en Por pagar y en tu Calendario.
        </p>
      </fieldset>
      </div>

      <div data-opcional="Datos para que te consignen">
      <div class="form-group form-group--checkbox" id="form-group-transferencia">
        <label class="checkbox-row">
          <input type="checkbox"
                 id="cuenta-transferencia-toggle"
                 name="transferenciaActiva"
                 data-transferencia-toggle />
          <span>Guardar los datos que compartes cuando alguien te va a consignar</span>
        </label>
      </div>

      <fieldset id="cuenta-transferencia-fieldset" class="cuota-fieldset" hidden>
        <div class="form-group">
          <label for="cuenta-numero" class="label">
            Número de cuenta <span class="form-optional">Opcional</span>
          </label>
          <input id="cuenta-numero"
                 name="numeroCuenta"
                 class="input"
                 type="text"
                 autocomplete="off"
                 placeholder="Ej. 1234567890" />
        </div>
        <div class="form-group llaves" id="cuenta-llaves" data-no-avanza>
          <span class="label" id="cuenta-llaves-label">Tus llaves de Bre-B <span class="form-optional">Opcional</span></span>
          <div class="llaves__lista" data-llaves-lista>${htmlFilaLlave()}
          </div>
          <button type="button" class="btn btn-ghost llaves__agregar" data-action="cuenta-llave-agregar" data-max="${MAX_LLAVES_CUENTA}">
            <svg class="icon" aria-hidden="true"><use href="#i-plus"/></svg>Agregar otra llave
          </button>
        </div>
        <p class="form-hint form-hint--muted">
          Finko solo guarda estos datos como referencia para que los consultes rápido. No ejecuta transferencias ni pide contraseñas o claves.
        </p>
      </fieldset>
      </div>

      <div class="modal__footer modal__footer--principal">
        <button type="button" class="btn btn-ghost" data-action="modal-close">
          Cancelar
        </button>
        <button type="submit" class="btn btn-primary">
          Guardar cuenta
        </button>
      </div>
    </form>`;
}

// ── INDICADOR GMF (K.1, tarjeta insight desde MC.18c) ─────────────

/**
 * Renderiza la tarjeta insight de costo del GMF en `#tesoreria-gmf`.
 * Muestra el costo estimado del 4x1000 para el mes actual basado en
 * los gastos registrados desde cuentas con GMF. No-op si el contenedor
 * no existe o si no hay costo que reportar este mes.
 *
 * VIS.1a (ADR 168 D2): la pregunta de la cuenta marcada va aparte, en
 * `#tesoreria-gmf-marcada`, bajo las cuentas: pide algo, no es informativa.
 */
export function renderGMFIndicador() {
  const pregunta = document.getElementById('tesoreria-gmf-marcada');
  if (pregunta) pregunta.innerHTML = _renderPreguntaMarcada();
  const el = document.getElementById('tesoreria-gmf');
  if (!el) return;

  const fechaHoy = hoy();
  const anio = Number(fechaHoy.slice(0, 4));
  const mes  = Number(fechaHoy.slice(5, 7));

  const gmfData = calcularCostoGMF(S.gastos, S.cuentas, anio, mes);
  const nudge   = detectarNudgeGMF(gmfData);

  el.innerHTML = nudge ? _renderGMFInsight(nudge) : '';
}

/**
 * GMF.1 (ADR 165): si ninguna cuenta es la marcada y alguna puede serlo sin
 * haberlo dicho (las de antes de GMF.1), Finko lo pregunta acá con la salida
 * a esa cuenta. Mientras tanto no cobra el 4x1000 en ella.
 * @returns {string}
 */
function _renderPreguntaMarcada() {
  const activas = cuentasActivas(S.cuentas);
  if (activas.some(c => c.exenta4x1000 === true)) return '';
  const pendiente = activas.find(c => regimenGMF(c).tipo === 'sin-definir');
  if (!pendiente) return '';
  return `
    <div class="gmf-insight gmf-insight--pregunta">
      <span class="gmf-insight__icon" aria-hidden="true">
        <svg class="icon" aria-hidden="true"><use href="#i-percent"/></svg>
      </span>
      <div class="gmf-insight__body">
        <p class="gmf-insight__title">¿Cuál es tu cuenta marcada exenta del 4x1000?</p>
        <p class="gmf-insight__desc">Dínoslo para descontar el 4x1000 como tu banco: la marcada no lo paga hasta ${f(TOPE_GMF_MARCADA)} al mes.</p>
        <button type="button" class="btn btn-secondary btn-sm" data-action="editar-cuenta" data-id="${_esc(pendiente.id)}">Revisar ${_esc(pendiente.nombre)}</button>
      </div>
    </div>`;
}

/**
 * MC.18c (ADR 035 D4): antes nudge suelto (`.nudge nudge-info`), ahora
 * tarjeta insight compacta con tinte tesorería, pegada bajo la lista de
 * cuentas que generan el gravamen. Copy y cálculo sin cambios.
 *
 * MC-DIS.9 C10 (regla R24): sin `role="status"`. Es una tarjeta informativa
 * estable, no la respuesta a una acción, y `renderGMFIndicador()` corre en cada
 * `state:change` de la sección: registrar un gasto o guardar un ingreso hacía
 * que el lector de pantalla la volviera a anunciar con la cifra sin cambiar.
 *
 * @param {{ icono: string, nivel: string, cantidadCuentasGMF: number,
 *           gastosGravados: number, costoGMF: number }} nudge
 * @returns {string}
 */
function _renderGMFInsight(nudge) {
  const n = nudge.cantidadCuentasGMF === 1 ? '1 cuenta' : `${nudge.cantidadCuentasGMF} cuentas`;
  return `
    <div class="gmf-insight">
      <span class="gmf-insight__icon" aria-hidden="true">
        <svg class="icon" aria-hidden="true"><use href="#i-percent"/></svg>
      </span>
      <div class="gmf-insight__body">
        <p class="gmf-insight__title">4x1000 estimado este mes: ${f(nudge.costoGMF)}</p>
        <p class="gmf-insight__desc">Calculado desde ${f(nudge.gastosGravados)} en gastos registrados desde ${_esc(n)} con GMF. Las cuentas de nómina y AFC están exentas: consulta con tu banco si aplica.</p>
      </div>
    </div>`;
}

// ── HELPERS ──────────────────────────────────────────────────────

/**
 * Devuelve el HTML de la teja de marca del banco (glifo oficial o iniciales
 * sobre el color corporativo, ADR 025). Si el banco no se encuentra en
 * BANCOS_CO, devuelve una teja generica con "?" y color gris.
 *
 * @param {string} bancoId - valor guardado en cuenta.banco.
 * @param {string|null} [icono] - `cuenta.icono` elegido para el banco "Otro" (CAT.2e).
 * @returns {string} HTML span de la teja.
 */
function _bankAvatarHtml(bancoId, icono = null) {
  return bancoAvatar(bancoId, icono);
}

// ── AGREGAR CUENTA EN EL TELÉFONO (GAS.8h, ADR 182 D8) ────────────

/** Los tipos del primer paso, en dos grupos. */
const _TIPOS_AGREGAR = {
  efectivo:  { titulo: 'Efectivo', sub: 'Billetes y monedas que llevas contigo', icono: 'c-billete', grupo: 'tuyo' },
  ahorros:   { titulo: 'Cuenta de ahorros', sub: 'En un banco o en una billetera como Nequi', icono: 'i-ahorro', grupo: 'tuyo' },
  corriente: { titulo: 'Cuenta corriente', sub: 'Para pagos frecuentes; suele tener chequera', icono: 'i-cuentas', grupo: 'tuyo' },
  tarjeta:   { titulo: 'Tarjeta de crédito', sub: 'Compras con un cupo que pagas después. También aparece en Deudas.', grupo: 'prestado' },
};

/** Nombres cortos para la grilla de entidades. */
const _NOMBRE_CORTO = { 'BBVA Colombia': 'BBVA', 'Banco AV Villas': 'AV Villas' };

/** La tarjeta dibujada, con el logo del banco si ya se eligió. */
function _tarjetaDibujada(banco, { grande = false } = {}) {
  const logo = banco ? `<span class="agregar-cuenta__tarjeta-logo">${_bankAvatarHtml(banco)}</span>` : '';
  if (!grande) {
    return `<span class="agregar-cuenta__tarjeta-mini" aria-hidden="true"><span class="agregar-cuenta__tarjeta-chip"></span><span class="agregar-cuenta__tarjeta-raya"></span></span>`;
  }
  return `
      <div class="agregar-cuenta__tarjeta" aria-hidden="true">
        <span class="agregar-cuenta__tarjeta-rotulo">Tarjeta de crédito</span>${logo}
        <span class="agregar-cuenta__tarjeta-chip"></span>
        <span class="agregar-cuenta__tarjeta-pie">
          <span class="agregar-cuenta__tarjeta-banco">${banco ? _esc(_NOMBRE_CORTO[banco] ?? banco) : 'Tu banco'}</span>
          <span class="agregar-cuenta__tarjeta-cupo">Cupo · lo defines después</span>
        </span>
      </div>`;
}

/** Una entidad de la grilla: su logo y su nombre. */
function _entidadAgregar(b, elegido) {
  const on = b.id === elegido;
  return `
          <button type="button" class="agregar-cuenta__entidad${on ? ' agregar-cuenta__entidad--on' : ''}" data-action="cuenta-agregar-entidad"
                  data-banco="${_esc(b.id)}" data-buscar="${_esc(`${b.id} ${(b.aliases ?? []).join(' ')}`.toLowerCase())}" aria-pressed="${on}">
            <span class="agregar-cuenta__logo">${_bankAvatarHtml(b.id)}${on ? `<span class="agregar-cuenta__check" aria-hidden="true">${icon('check')}</span>` : ''}</span>
            <span class="agregar-cuenta__entidad-nombre">${_esc(_NOMBRE_CORTO[b.id] ?? b.id)}</span>
          </button>`;
}

/**
 * La hoja "Agregar cuenta" del teléfono (ADR 182 D8): el paso 1 pregunta
 * qué se agrega en dos grupos (Dinero tuyo y Dinero prestado); el paso 2,
 * en qué banco o billetera (con buscador) o, en la tarjeta, qué banco la
 * dio, con la tarjeta dibujada. El paso 3 son los datos de siempre: el
 * formulario de la cuenta (o el de la deuda, en la tarjeta).
 *
 * @param {{ tipo?: string, banco?: string, escribir?: boolean }} [estado]
 * @returns {string}
 */
export function htmlAgregarCuenta({ tipo = '', banco = '', escribir = false } = {}) {
  const t = _TIPOS_AGREGAR[tipo];
  const cabeza = (paso, pastilla = '') => `
      <div class="limite-pasos__cabeza agregar-cuenta__cabeza">
        <p class="limite-pasos__paso">Paso ${paso} de 3${pastilla}</p>
        <div class="limite-pasos__avance limite-pasos__avance--3" aria-hidden="true">${[1, 2, 3].map(i =>
          `<span class="limite-pasos__tramo${i <= paso ? ' limite-pasos__tramo--on' : ''}"></span>`).join('')}</div>
      </div>`;

  if (!t) {
    const fila = (clave) => {
      const x = _TIPOS_AGREGAR[clave];
      const teja = clave === 'tarjeta' ? _tarjetaDibujada('')
        : `<span class="agregar-cuenta__teja" aria-hidden="true"><svg class="icon"><use href="#${x.icono}"/></svg></span>`;
      return `
          <li>
            <button type="button" class="agregar-cuenta__tipo${clave === 'tarjeta' ? ' agregar-cuenta__tipo--prestado' : ''}" data-action="cuenta-agregar-tipo" data-tipo="${clave}">
              ${teja}
              <span class="agregar-cuenta__textos">
                <span class="agregar-cuenta__titulo">${x.titulo}</span>
                <span class="agregar-cuenta__sub">${x.sub}</span>
              </span>
              ${icon('chevron-right')}
            </button>
          </li>`;
    };
    const primera = !(S.cuentas ?? []).some(c => c.activa !== false);
    const tino = primera ? `
      <p class="agregar-cuenta__primera">${htmlTinoSol('saluda', { tamano: 48, clase: 'agregar-cuenta__tino' })}<span>¿Es tu primera cuenta? Empieza por la que usas más, como la de tu sueldo.</span></p>` : '';
    return `
    <div class="agregar-cuenta" data-paso="1">
      ${cabeza(1)}
      <h3 class="limite-pasos__pregunta">¿Qué quieres agregar?</h3>
      <section class="agregar-cuenta__grupo" aria-labelledby="agregar-tuyo">
        <p class="agregar-cuenta__grupo-t" id="agregar-tuyo">Dinero tuyo</p>
        <p class="agregar-cuenta__grupo-s">Lo que tienes guardado o a la mano.</p>
        <ul class="agregar-cuenta__lista">${['efectivo', 'ahorros', 'corriente'].map(fila).join('')}</ul>
      </section>
      <section class="agregar-cuenta__grupo" aria-labelledby="agregar-prestado">
        <p class="agregar-cuenta__grupo-t" id="agregar-prestado">Dinero prestado</p>
        <p class="agregar-cuenta__grupo-s">El banco te presta y tú le pagas después.</p>
        <ul class="agregar-cuenta__lista agregar-cuenta__lista--sola">${fila('tarjeta')}</ul>
      </section>${tino}
    </div>`;
  }

  const prestado = t.grupo === 'prestado';
  const pastilla = ` <span class="agregar-cuenta__pastilla agregar-cuenta__pastilla--${t.grupo}">${prestado ? 'Dinero prestado' : 'Dinero tuyo'}</span>`;
  const atras = `<button type="button" class="agregar-cuenta__atras" data-action="cuenta-agregar-atras" aria-label="Volver a qué quieres agregar">${icon('chevron-right')}</button>`;
  const bancos = BANCOS_CO.filter(b => b.clase === 'banco');
  const billeteras = BANCOS_CO.filter(b => b.clase === 'billetera');

  if (prestado) {
    const opciones = [...bancos, ...billeteras.filter(b => b.id === 'Nubank')];
    const nombre = banco ? _esc(_NOMBRE_CORTO[banco] ?? banco) : '';
    return `
    <div class="agregar-cuenta" data-paso="2" data-tipo="tarjeta">
      <div class="agregar-cuenta__titulo-fila">${atras}<p class="agregar-cuenta__nombre">${t.titulo}</p></div>
      ${cabeza(2, pastilla)}
      ${_tarjetaDibujada(banco, { grande: true })}
      <h3 class="limite-pasos__pregunta">¿Qué banco te dio la tarjeta?</h3>
      <div class="agregar-cuenta__grilla" role="group" aria-label="Bancos">${opciones.map(b => _entidadAgregar(b, banco)).join('')}</div>
      <p class="agregar-cuenta__nota">${icon('deudas')}<span>Luego pones el cupo y el día de pago. Lo que uses aparecerá en <strong>Deudas · Con entidades</strong>.</span></p>
      <button type="button" class="btn btn-primary limite-pasos__principal" data-action="cuenta-agregar-continuar"${banco ? '' : ' disabled'}>${banco ? `Continuar con ${nombre}` : 'Elige el banco'}${icon('arrow-right')}</button>
    </div>`;
  }

  const conBilleteras = tipo === 'ahorros';
  const escribe = escribir ? `
      <div class="agregar-cuenta__escribe">
        <label class="label" for="agregar-cuenta-nombre">¿Cómo se llama tu entidad?</label>
        <input id="agregar-cuenta-nombre" class="input" type="text" autocomplete="off" placeholder="Ej. Cooperativa Confiar" />
        <button type="button" class="btn btn-primary limite-pasos__principal" data-action="cuenta-agregar-continuar">Continuar${icon('arrow-right')}</button>
      </div>` : `
      <button type="button" class="agregar-cuenta__otra" data-action="cuenta-agregar-escribir">
        <span class="agregar-cuenta__otra-mas" aria-hidden="true">${icon('plus')}</span>
        <span class="agregar-cuenta__otra-texto">¿No está tu entidad? Escríbela</span>
        ${icon('chevron-right')}
      </button>`;
  return `
    <div class="agregar-cuenta" data-paso="2" data-tipo="${_esc(tipo)}">
      <div class="agregar-cuenta__titulo-fila">${atras}<p class="agregar-cuenta__nombre">${t.titulo}</p></div>
      ${cabeza(2, pastilla)}
      <h3 class="limite-pasos__pregunta">${conBilleteras ? '¿En qué banco o billetera está?' : '¿En qué banco está?'}</h3>
      <label class="agregar-cuenta__buscar">
        ${icon('search')}
        <span class="sr-only">Busca tu banco${conBilleteras ? ' o billetera' : ''}</span>
        <input type="search" class="agregar-cuenta__buscar-input" data-agregar-buscar autocomplete="off"
               placeholder="Busca tu banco${conBilleteras ? ' o billetera' : ''}" />
      </label>
      <section class="agregar-cuenta__grupo" data-agregar-grupo>
        <p class="agregar-cuenta__grupo-t">Bancos</p>
        <div class="agregar-cuenta__grilla" role="group" aria-label="Bancos">${bancos.map(b => _entidadAgregar(b, banco)).join('')}</div>
      </section>
      ${conBilleteras ? `
      <section class="agregar-cuenta__grupo" data-agregar-grupo>
        <p class="agregar-cuenta__grupo-t">Billeteras digitales</p>
        <div class="agregar-cuenta__grilla" role="group" aria-label="Billeteras digitales">${billeteras.map(b => _entidadAgregar(b, banco)).join('')}</div>
      </section>` : ''}
      <p class="agregar-cuenta__sin" data-agregar-sin hidden>No la encontramos. Escríbela abajo.</p>
      ${escribe}
    </div>`;
}

/**
 * tesoreria/views/transferencias.js - entrada y formulario de "Transferir
 * dinero" entre cuentas propias (MC.17b, ADR ninguno: brief General 6-8).
 *
 * Sub-modulo de tesoreria/view.js (barrel). Reglas de la capa:
 * - Puede leer S. No puede mutarlo.
 * - Devuelve strings HTML o escribe en el DOM (no ambas cosas en la misma funcion).
 * - Sin logica de negocio: delegar a logic/.
 */

import { S } from '../../../core/state.js';
import { regimenGMF } from '../../../infra/gmf.js';
import { f, esc as _esc } from '../../../infra/utils.js';
import { icon } from '../../../infra/icons.js';
import { bancoAvatar } from '../../../infra/bancos.js';
import { renderSelectorCuenta } from '../../../infra/cuenta-helper.js';
import { cuentasActivas, tarjetasCredito } from '../logic/cuentas.js';
import { notaTransferencia, cuentasDeRetiro, EFECTIVO_NUEVO, NOTA_RETIRO } from '../logic/transferencias.js';

/**
 * Renderiza el botón de entrada en `#tesoreria-transferir`. Patrón 0/1/2/varias
 * (extiende la regla de cuenta única): con menos de 2 cuentas activas no hay
 * dos endpoints posibles, así que la entrada no aparece. No-op si el
 * contenedor no existe.
 *
 * MC-DIS.9 C3 (regla R21): era `btn-ghost btn-sm` sin ícono, el control más
 * discreto de una sección donde tres primarios solo crean una ficha, y nacía
 * bajo el pliegue. Pasa a control de ancho completo con borde, 44px de alto y
 * el ícono `i-transferencia` (el mismo del ledger, MC.17c). Sigue sin ser
 * primario: el primario de la sección es uno solo, el del encabezado (R11).
 */
export function renderBotonTransferir() {
  const el = document.getElementById('tesoreria-transferir');
  if (!el) return;

  const activas = cuentasActivas(S.cuentas ?? []);
  // MC.20a (ADR 171 D3): "Retirar efectivo" va al lado, con una cuenta que no
  // sea efectivo; transferir sigue pidiendo dos cuentas.
  const transferir = activas.length >= 2;
  const retirar = cuentasDeRetiro(activas).origenes.length > 0;
  if (!transferir && !retirar) { el.innerHTML = ''; return; }

  // ADR 080 D2: conserva su anatomía de R38 (ancho completo, 44px, borde).
  // ADR 135 D1 le quita la marca "Atajo": en Mis cuentas transferir es lo que
  // se viene a hacer, y el botón dice el verbo completo.
  el.innerHTML = `
    <div class="transferir-entradas">${transferir ? `
      <button type="button" class="transferir-entrada btn-dominio" data-dom="tesoreria" data-action="abrir-transferencia">
        ${icon('transferencia')}
        Transferir entre cuentas
      </button>` : ''}${retirar ? `
      <button type="button" class="transferir-entrada btn-dominio" data-dom="tesoreria" data-action="abrir-retiro">
        ${icon('saldo')}
        Retirar efectivo
      </button>` : ''}
    </div>`;
}

/**
 * Una cuenta del par (ADR 135 D5): logo, nombre y "Tienes $X". La de origen
 * lleva "Cambiar", que invierte el par.
 *
 * @param {import('../../../core/state.js').Cuenta} cuenta
 * @param {string} [cambiar] HTML del botón "Cambiar", solo en la de origen.
 */
function _filaParCuenta(cuenta, cambiar = '') {
  return `
      <div class="transferir-cuenta">
        ${bancoAvatar(cuenta.banco, cuenta.icono)}
        <span class="transferir-cuenta__textos">
          <span class="transferir-cuenta__nombre">${_esc(cuenta.nombre)}</span>
          <span class="transferir-cuenta__saldo">Tienes ${f(cuenta.saldo ?? 0)}</span>
        </span>${cambiar}
      </div>`;
}

/**
 * "Sale de" y "Entra a" para exactamente 2 cuentas activas (MC.17b; ADR 135
 * D5 lo dice con esas palabras): el par fijo, y "Cambiar" en la de origen
 * invierte la dirección. Los inputs hidden llevan los ids que lee
 * `validarTransferencia`/`normalizarTransferencia`. `acciones/transferencias.js`
 * reemplaza `#transferencia-par-wrap` por una nueva llamada a esta función con
 * origen/destino invertidos, sin re-renderizar el resto del formulario.
 *
 * @param {import('../../../core/state.js').Cuenta} origen
 * @param {import('../../../core/state.js').Cuenta} destino
 * @returns {string}
 */
export function renderParTransferencia(origen, destino) {
  const cambiar = `
        <button type="button" class="transferir-cuenta__cambiar" data-action="invertir-transferencia"
                aria-label="Cambiar: que salga de ${_esc(destino.nombre)}">Cambiar</button>`;
  return `
    <div class="form-group transferir-de-a" id="transferencia-par-wrap">
      <p class="transferir-de-a__rotulo">Sale de</p>
      ${_filaParCuenta(origen, cambiar)}
      <p class="transferir-de-a__rotulo">Entra a</p>
      ${_filaParCuenta(destino)}
      <input type="hidden" name="cuentaOrigenId" value="${_esc(origen.id)}" />
      <input type="hidden" name="cuentaDestinoId" value="${_esc(destino.id)}" />
    </div>`;
}

/**
 * Sección opcional del 4x1000 (GMF, MC.17d). Solo se muestra cuando la cuenta
 * de origen NO está exenta (`aplica4x1000 === true`): un checkbox marcado por
 * defecto (refleja lo que el banco cobrará: el saldo queda exacto sin que el
 * usuario haga nada) que el usuario puede desmarcar si tiene el cupo exento del
 * mes disponible. Devuelve '' cuando el origen es exento o no hay origen, para
 * no complicar el flujo (mismo criterio "no molestar cuando no aplica" que el
 * hint de cuota de manejo). El monto del gravamen se calcula en vivo en la
 * acción (`_actualizarHintGMF`) a medida que el usuario escribe el monto.
 *
 * Va dentro de `#transferencia-gmf-slot` (contenedor estable): la acción lo
 * re-renderiza cuando cambia el origen (botón invertir o selector), sin tocar
 * el resto del formulario.
 *
 * @param {import('../../../core/state.js').Cuenta} [origen]
 * @returns {string}
 */
export function renderSeccionGMF(origen) {
  // GMF.1 (ADR 165): ya no hay casilla. Finko calcula el 4x1000 con la
  // cuenta de origen, el destino y lo retirado en el mes; acá lo dice.
  if (!origen || regimenGMF(origen).tipo === 'no-aplica') return '';
  return `
    <p class="form-hint form-hint--muted" id="transferencia-gmf-hint" aria-live="polite">
      Escribe el monto para ver si paga 4x1000.
    </p>`;
}

/**
 * Formulario completo del modal "Transferir dinero" (MC.17b). Automatización
 * por conteo de cuentas activas:
 *   - 2 cuentas: `renderParTransferencia()`, par fijo con botón invertir.
 *   - 3+ cuentas: dos `renderSelectorCuenta()` independientes (origen/destino,
 *     mismo componente que usan ingreso puntual y abono a deuda), sin excluir
 *     la cuenta ya elegida en el otro selector: elegir la misma en ambos se
 *     bloquea con un mensaje claro de `validarTransferencia` al confirmar, en
 *     vez de sumar lógica de filtrado en vivo entre dos radiogroups.
 *
 * Devuelve '' con menos de 2 cuentas activas (no hay nada que transferir).
 *
 * @returns {string}
 */
export function renderFormTransferencia() {
  const activas = cuentasActivas(S.cuentas ?? []);
  if (activas.length < 2) return '';

  // El origen inicial es la cuenta de mayor saldo, tanto en el widget de par
  // (par ordenado desc → origen = primera) como en los selectores 3+
  // (renderSelectorCuenta pre-selecciona la de mayor saldo). Con eso se decide
  // si la sección de GMF aparece de entrada.
  const ordenadas     = [...activas].sort((a, b) => (b.saldo ?? 0) - (a.saldo ?? 0));
  const origenInicial = ordenadas[0];
  // REV.2c: la nota depende del destino. Con dos cuentas es la otra; con 3+,
  // el selector "Entra a" también nace en la de mayor saldo.
  const destinoInicial = activas.length === 2 ? ordenadas[1] : ordenadas[0];

  const seccionCuentas = activas.length === 2
    ? renderParTransferencia(...ordenadas)
    : `
      ${renderSelectorCuenta(activas, { label: 'Sale de', name: 'cuentaOrigenId' })}
      ${renderSelectorCuenta(activas, { label: 'Entra a', name: 'cuentaDestinoId' })}`;

  return `
    <form id="form-transferencia" novalidate data-etapas-monto="¿Cuánto vas a pasar?">
      <p class="modal__intro">Pasa dinero de una cuenta a otra.</p>
      ${seccionCuentas}
      <div class="monto-hero">
        <label for="transferencia-monto" class="monto-hero__label">¿Cuánto vas a pasar?</label>
        <div class="monto-hero__box">
          <span class="monto-hero__prefijo" aria-hidden="true">$</span>
          <input id="transferencia-monto" name="monto" type="text" class="input input--big-amount" placeholder="0"
                 inputmode="numeric" data-miles autocomplete="off" required />
        </div>
      </div>
      <p class="transferir-nota" id="transferencia-nota-total">${_esc(notaTransferencia(destinoInicial))}</p>
      <div id="transferencia-gmf-slot">${renderSeccionGMF(origenInicial)}</div>
      <!-- ADR 135 D5: la fecha (hoy por defecto) y la nota se pliegan. -->
      <details class="transferir-mas">
        <summary class="transferir-mas__resumen">Cambiar la fecha o agregar una nota</summary>
        <div class="form-group">
          <label for="transferencia-fecha" class="label">Fecha</label>
          <input id="transferencia-fecha" name="fecha" type="date" class="input" required />
        </div>
        <div class="form-group">
          <label for="transferencia-nota" class="label">Nota <span class="form-optional">Opcional</span></label>
          <input id="transferencia-nota" name="nota" type="text" class="input"
                 placeholder="Ej. ahorro del mes, pasar a Nequi" />
        </div>
      </details>
      <div class="modal__footer modal__footer--principal">
        <button type="button" class="btn btn-ghost" data-action="modal-close">Cancelar</button>
        <button type="submit" class="btn btn-primary" id="transferencia-enviar">${icon('check')}<span data-transferir-texto>Transferir</span></button>
      </div>
    </form>`;
}

/**
 * Una cuenta fija del retiro (sin "Cambiar"), con su input oculto.
 * @param {string} rotulo
 * @param {import('../../../core/state.js').Cuenta} cuenta
 * @param {string} name
 */
function _cuentaFija(rotulo, cuenta, name) {
  return `
      <p class="transferir-de-a__rotulo">${rotulo}</p>
      ${_filaParCuenta(cuenta)}
      <input type="hidden" name="${name}" value="${_esc(cuenta.id)}" />`;
}

/**
 * "Retirar efectivo" (MC.20a, ADR 171 D3): un atajo de la transferencia que
 * siempre llega a Efectivo. "Sale de" son las cuentas que no son efectivo;
 * "Llega a" es la cuenta Efectivo (si hay varias, se elige; si no hay, se crea
 * al guardar, `EFECTIVO_NUEVO`). "¿Te cobraron por el retiro?" es opcional y
 * sale del origen con el monto y el 4x1000 (D4). Usa el mismo `#form-
 * transferencia`, con `data-modo="retiro"`, para compartir el 4x1000 en vivo y
 * el guardado. '' si no hay de dónde sacar.
 *
 * MC.20c (ADR 171 D3): las tarjetas con cupo van en su grupo de "Sale de";
 * elegir una abre "Sacar un avance" (la acción), porque sacar dinero con cupo
 * es un avance, no un retiro: aquí nunca se guarda una transferencia con cupo
 * (ADR 051 D4).
 * @returns {string}
 */
export function renderFormRetiro() {
  const { origenes, efectivos } = cuentasDeRetiro(S.cuentas ?? []);
  if (origenes.length === 0) return '';
  const tarjetas = tarjetasCredito(S.compromisos ?? []);
  const ordenados = [...origenes].sort((a, b) => (b.saldo ?? 0) - (a.saldo ?? 0));
  const origenHtml = origenes.length === 1 && tarjetas.length === 0
    ? _cuentaFija('Sale de', origenes[0], 'cuentaOrigenId')
    : renderSelectorCuenta(origenes, { label: 'Sale de', name: 'cuentaOrigenId', tarjetas });
  let destinoHtml;
  if (efectivos.length === 0) {
    destinoHtml = `
      <p class="transferir-de-a__rotulo">Llega a</p>
      <div class="transferir-cuenta">
        ${bancoAvatar('Efectivo', null)}
        <span class="transferir-cuenta__textos">
          <span class="transferir-cuenta__nombre">Efectivo</span>
          <span class="transferir-cuenta__saldo">La creamos al guardar, con este retiro</span>
        </span>
      </div>
      <input type="hidden" name="cuentaDestinoId" value="${EFECTIVO_NUEVO}" />`;
  } else if (efectivos.length === 1) {
    destinoHtml = _cuentaFija('Llega a', efectivos[0], 'cuentaDestinoId');
  } else {
    destinoHtml = renderSelectorCuenta(efectivos, { label: 'Llega a', name: 'cuentaDestinoId' });
  }
  return `
    <form id="form-transferencia" novalidate data-modo="retiro" data-etapas-monto="¿Cuánto sacaste?">
      <p class="modal__intro">Sacaste dinero del cajero: pasa de tu cuenta a tu efectivo.</p>
      <div class="form-group transferir-de-a" id="retiro-cuentas">
        ${origenHtml}
        ${destinoHtml}
      </div>
      <div class="monto-hero">
        <label for="transferencia-monto" class="monto-hero__label">¿Cuánto sacaste?</label>
        <div class="monto-hero__box">
          <span class="monto-hero__prefijo" aria-hidden="true">$</span>
          <input id="transferencia-monto" name="monto" type="text" class="input input--big-amount" placeholder="0"
                 inputmode="numeric" data-miles autocomplete="off" required />
        </div>
      </div>
      <div class="form-group">
        <label for="transferencia-comision" class="label">¿Te cobraron por el retiro? <span class="form-optional">Opcional</span></label>
        <div class="input-group">
          <span class="input-prefix" aria-hidden="true">$</span>
          <input id="transferencia-comision" name="comision" class="input input--has-prefix" type="text" inputmode="numeric"
                 data-miles placeholder="0" autocomplete="off" />
        </div>
        <p class="form-hint">Lo que cobró el cajero. No es un gasto: sale de tu cuenta junto con el retiro.</p>
      </div>
      <p class="transferir-nota" id="transferencia-nota-total">${_esc(NOTA_RETIRO)}</p>
      <div id="transferencia-gmf-slot">${renderSeccionGMF(ordenados[0])}</div>
      <details class="transferir-mas">
        <summary class="transferir-mas__resumen">Cambiar la fecha o agregar una nota</summary>
        <div class="form-group">
          <label for="transferencia-fecha" class="label">Fecha</label>
          <input id="transferencia-fecha" name="fecha" type="date" class="input" required />
        </div>
        <div class="form-group">
          <label for="transferencia-nota" class="label">Nota <span class="form-optional">Opcional</span></label>
          <input id="transferencia-nota" name="nota" type="text" class="input" placeholder="Ej. para el mercado de la plaza" />
        </div>
      </details>
      <div class="modal__footer modal__footer--principal">
        <button type="button" class="btn btn-ghost" data-action="modal-close">Cancelar</button>
        <button type="submit" class="btn btn-primary" id="transferencia-enviar">${icon('check')}<span data-transferir-texto>Retirar</span></button>
      </div>
    </form>`;
}

/**
 * compromisos/views/estrategia.js - card de estrategia de pago de deudas (F.4).
 *
 * Jerarquía (Revisión D.2, ADR 011): picker Avalancha/Bola de nieve arriba
 * (protagonista) → detalle de la estrategia elegida → acelerador plegable
 * "¿Puedes pagar más rápido?" (plan viable) o primer remedio "Aumenta tu
 * cuota" dentro del bloque "Tu plan no se sostiene" (plan inviable).
 *
 * Aloja el estado UI local `_uiEstrategia` (extra mensual, estrategia activa).
 * Es un singleton mutable; persiste mientras la pestaña está abierta y vuelve
 * a defaults al recargar.
 *
 * Los renderers de "Tu impacto" (Avalancha, Bola de nieve, comparativa) viven
 * en `estrategia-impacto.js` para mantener este archivo bajo 400 líneas.
 */

import { S } from '../../../core/state.js';
import { esc as _esc, f } from '../../../infra/utils.js';
import { icon } from '../../../infra/icons.js';
import {
  filtrarDeudasPagables,
  compararEstrategias,
  recomendarEstrategia,
} from '../logic.js';
import {
  renderImpactoAvalancha,
  renderImpactoBolaNieve,
  renderResumenExtra,
} from './estrategia-impacto.js';

// Estado UI local: extra mensual, estrategia activa.
// Persiste mientras la pestaña está abierta; al recargar vuelve a defaults.
// estrategia=null indica "no elegida aún" (mostramos solo las cards).
const _uiEstrategia = {
  extraMensual:   0,
  estrategia:     null,
};

/**
 * Estado UI exportado para que index.js pueda actualizarlo desde handlers.
 */
export function setEstrategiaUI(patch) {
  if (patch.extraMensual !== undefined) {
    const n = Number(patch.extraMensual);
    _uiEstrategia.extraMensual = Number.isFinite(n) && n >= 0 ? n : 0;
  }
  if (patch.estrategia === 'avalancha' || patch.estrategia === 'bolaNieve') {
    _uiEstrategia.estrategia = patch.estrategia;
  }
}

export function getEstrategiaUI() {
  return { ..._uiEstrategia };
}

/**
 * Renderiza la card de estrategia de pago en `#estrategia-pago`.
 *
 * v6: ahora vive arriba de la lista de deudas y aparece con cualquier cantidad
 * de deudas pagables (≥ 1). El selector Avalancha solo es relevante si hay
 * tasa > 0 en al menos una deuda; si no, se sugiere directamente Bola de Nieve.
 *
 * El orden definido por la estrategia se aplica también a `renderListaCompromisos`.
 */
export function renderEstrategiaPago() {
  const el = document.getElementById('estrategia-pago');
  if (!el) return;

  const deudas = filtrarDeudasPagables(S.compromisos);
  if (deudas.length === 0) {
    el.innerHTML = '';
    return;
  }
  // v7.6: con 1 sola deuda no hay nada que comparar entre estrategias.
  // Mostramos un mensaje útil en vez de cards sin recomendación posible.
  if (deudas.length === 1) {
    const d = deudas[0];
    el.innerHTML = `
      <article class="estrategia-card">
        <header class="estrategia-card__header">
          <h2 class="estrategia-card__title">💡 Estrategia de pago</h2>
        </header>
        <p class="estrategia-card__placeholder">
          Tienes una sola deuda activa (<strong>${_esc(d.descripcion)}</strong>).
          Cuando tengas dos o más, Finko te recomendará la mejor estrategia
          para pagarlas (Avalancha vs Bola de nieve).
        </p>
      </article>`;
    return;
  }

  const hayTasaPositiva = deudas.some(d => d.tasaEA > 0);
  // No forzamos cambio si avalancha no aplica: respetamos la elección del usuario
  // y mostramos un mensaje "no aplica" en el detalle (más educativo que cambiar
  // a sus espaldas).

  const { extraMensual, estrategia } = _uiEstrategia;
  const recomendacion = recomendarEstrategia(deudas, extraMensual);

  const resumenExtraHtml = extraMensual > 0
    ? renderResumenExtra(compararEstrategias(deudas, 0), compararEstrategias(deudas, extraMensual), extraMensual)
    : renderResumenExtra(null, null, 0);

  el.innerHTML = `
    <article class="estrategia-card">
      <header class="estrategia-card__header">
        <h2 class="estrategia-card__title">💡 Estrategia de pago</h2>
        <p class="estrategia-card__subtitle">
          Finko te ayuda a tomar mejores decisiones con tus deudas.
        </p>
      </header>

      ${_renderAvisoTasaDesconocida(deudas)}
      ${recomendacion.viable ? '' : _renderDiagnosticoInviable(recomendacion.diagnostico, extraMensual, resumenExtraHtml)}

      <div class="estrategia-cards" role="group" aria-label="Elige una estrategia">
        ${_renderCardEstrategia('avalancha', estrategia, recomendacion, hayTasaPositiva)}
        ${_renderCardEstrategia('bolaNieve', estrategia, recomendacion, true)}
      </div>

      ${_renderDetalleEstrategia(estrategia, recomendacion, deudas, extraMensual, hayTasaPositiva)}
      ${recomendacion.viable ? _renderAceleradorExtra(extraMensual, resumenExtraHtml) : ''}
    </article>`;
}

/**
 * Bloque "Tu plan no se sostiene" (D.2b, ADR 011 rev.). Aparece cuando ninguna
 * estrategia logra cerrar el plan con el pago actual. Estructura:
 *   1. Diagnóstico: qué deudas crecen y por qué.
 *   2. Primer remedio: input de pago extra (prominente, no plegable) + resumen
 *      de impacto en vivo. Es la misma superficie que el acelerador de D.2a,
 *      pero aquí el extra no es opcional: es la salida más directa.
 *   3. Otras salidas (texto): renegociar tasa, consolidar (interactivos en D.3).
 *
 * @param {{ deudasCrecientes: Array<{ id, descripcion, deficitMensual }>, extraMinimo: number|null }} diagnostico
 * @param {number} extraMensual
 * @param {string} resumenExtraHtml
 */
function _renderDiagnosticoInviable(diagnostico, extraMensual, resumenExtraHtml) {
  if (!diagnostico) return '';
  const { deudasCrecientes, extraMinimo } = diagnostico;

  const listaCrecientes = deudasCrecientes.length > 0
    ? `<ul class="estrategia-card__alerta-lista">
         ${deudasCrecientes.map(d => `
           <li><strong>${_esc(d.descripcion)}</strong>: crece ${f(d.deficitMensual)} al mes
               porque la cuota no alcanza a cubrir el interés.</li>`).join('')}
       </ul>`
    : '';

  const sugerenciaExtra = extraMinimo
    ? `<p class="estrategia-card__bloque-body">
         Para que tu plan funcione, necesitarías aportar al menos
         <strong>${f(extraMinimo)} extra cada mes</strong>.</p>`
    : `<p class="estrategia-card__bloque-body">
         Con el pago actual la deuda crece más rápido de lo que la reduces.</p>`;

  return `
    <div class="estrategia-card__alerta" role="status">
      <p class="estrategia-card__bloque-titulo">⚠️ Con tu pago actual, estas deudas no se terminan de pagar</p>
      ${listaCrecientes}
      ${sugerenciaExtra}

      <div class="estrategia-card__remedio">
        <p class="estrategia-card__bloque-titulo">💪 Aumenta tu cuota</p>
        <div class="form-group">
          <label for="estrategia-extra" class="label">Pago extra mensual</label>
          <input id="estrategia-extra" class="input" type="number"
                 min="0" step="10000" value="${extraMensual || ''}"
                 placeholder="Ej. 50000" autocomplete="off" inputmode="numeric"
                 data-action="cambiar-extra-estrategia" />
          <p class="form-hint">Escribe un monto y mira si tu plan se vuelve viable.</p>
        </div>
        ${resumenExtraHtml}
      </div>

      <p class="estrategia-card__bloque-body">
        <strong>Otras salidas:</strong> renegociar la tasa o consolidar las deudas en
        un crédito más barato.
      </p>
    </div>`;
}

/**
 * Nota informativa cuando alguna deuda con entidad no tiene tasa registrada.
 * Esas deudas se simulan como 0% y subestiman los intereses reales, así que las
 * recomendaciones podrían ser menos precisas hasta que el usuario confirme la tasa.
 *
 * @param {ReturnType<typeof filtrarDeudasPagables>} deudas
 */
function _renderAvisoTasaDesconocida(deudas) {
  const sinTasa = deudas.filter(d => d.tasaDesconocida);
  if (sinTasa.length === 0) return '';

  const nombres = sinTasa.map(d => `<strong>${_esc(d.descripcion)}</strong>`).join(', ');
  const verbo = sinTasa.length === 1 ? 'tiene' : 'tienen';
  return `
    <div class="estrategia-card__nota" role="note">
      <p class="estrategia-card__bloque-body">
        ℹ️ ${nombres} no ${verbo} tasa registrada. La calculamos como 0% por ahora,
        pero eso subestima los intereses: confirma la tasa con tu banco para una
        recomendación más precisa.
      </p>
    </div>`;
}

const _META_ESTRATEGIA = {
  avalancha: { icono: icon('mountain'), nombre: 'Avalancha' },
  bolaNieve: { icono: icon('circle'),   nombre: 'Bola de nieve' },
};

// Resúmenes integrados (mecanismo + ideal en 1 párrafo). La razón de
// recomendación se prepende solo cuando la estrategia es la recomendada.
const _RESUMEN_ESTRATEGIA = {
  avalancha: 'Atacas primero la deuda con la tasa más alta, así cada peso va más al capital y menos a intereses. Puede que la primera deuda tarde un poco más en cerrarse, pero a la larga ahorras más dinero.',
  bolaNieve: 'Atacas primero la deuda más chica; cuando la terminas, esa cuota se suma a la siguiente, generando un efecto acumulativo (la "bola" que crece). Ideal si necesitas ver progreso rápido para mantener el impulso.',
};

/**
 * Renderiza una card seleccionable de estrategia. Si `recomendacion.estrategia`
 * coincide, muestra "✨ Recomendada para vos" como subtítulo interno.
 *
 * NOTA: la card NUNCA está `disabled`. Cuando una estrategia no aplica con
 * las deudas actuales (Avalancha sin deudas con interés), igual es clicable
 * y el detalle muestra un mensaje explicativo. Esto es más educativo que
 * un botón gris no clicable (especialmente en mobile, donde tooltips no funcionan).
 */
function _renderCardEstrategia(tipo, activa, recomendacion, habilitada) {
  const meta = _META_ESTRATEGIA[tipo];
  const seleccionada = activa === tipo;
  const recomendada  = recomendacion.estrategia === tipo;
  const aria = seleccionada ? 'true' : 'false';
  const claseActiva   = seleccionada ? ' estrategia-card-pick--activa' : '';
  const claseInactiva = habilitada   ? '' : ' estrategia-card-pick--inactiva';
  const subtituloHtml = recomendada
    ? '<span class="estrategia-card-pick__sub">✨ Recomendada para ti</span>'
    : '<span class="estrategia-card-pick__sub estrategia-card-pick__sub--ghost" aria-hidden="true">&nbsp;</span>';
  return `
    <button type="button"
            class="estrategia-card-pick${claseActiva}${claseInactiva}"
            data-action="elegir-estrategia"
            data-estrategia="${tipo}"
            aria-pressed="${aria}">
      <span class="estrategia-card-pick__icono" aria-hidden="true">${meta.icono}</span>
      <strong class="estrategia-card-pick__nombre">${meta.nombre}</strong>
      ${subtituloHtml}
    </button>`;
}

/**
 * Muestra 2 bloques de la estrategia seleccionada:
 *   1. Resumen ("✨ Por qué te conviene" si es recomendada, "ℹ️ Cómo funciona" si no)
 *      → integra razón (si recomendada) + mecanismo + ideal en 1 párrafo
 *   2. 📊 Tu impacto (métricas concretas en orden consistente entre estrategias)
 *
 * Caso especial: si la estrategia elegida no aplica (Avalancha sin tasa > 0),
 * mostramos un mensaje educativo en lugar de los 2 bloques.
 *
 * Si no hay ninguna seleccionada, muestra un placeholder.
 */
function _renderDetalleEstrategia(estrategia, recomendacion, deudas, extraMensual, hayTasaPositiva) {
  if (!estrategia) {
    return `
      <p class="estrategia-card__placeholder">
        Toca una estrategia para ver el detalle y cómo te ayuda.
      </p>`;
  }
  // Caso: Avalancha sin sentido → solo el mensaje "no aplica".
  if (estrategia === 'avalancha' && !hayTasaPositiva) {
    return _renderNoAplica('avalancha');
  }

  const esRecomendada = recomendacion.estrategia === estrategia;
  const resumenHtml = _renderResumenEstrategia(estrategia, esRecomendada, recomendacion);

  const resultado = compararEstrategias(deudas, extraMensual);
  const impactoHtml = estrategia === 'avalancha'
    ? renderImpactoAvalancha(resultado, extraMensual)
    : renderImpactoBolaNieve(resultado, deudas, extraMensual);

  return `
    <div class="estrategia-card__detalle">
      ${resumenHtml}
      <div class="estrategia-card__bloque">
        <p class="estrategia-card__bloque-titulo">📊 Tu impacto</p>
        ${impactoHtml}
      </div>
    </div>`;
}

/**
 * Renderiza el bloque-resumen único que integra razón (si es recomendada) +
 * mecanismo + ideal en 1 párrafo. El título cambia: "Por qué te conviene"
 * para la recomendada (vendiendo) vs "Cómo funciona" para la otra (explicando).
 */
function _renderResumenEstrategia(tipo, esRecomendada, recomendacion) {
  const titulo = esRecomendada ? '✨ Por qué te conviene' : 'ℹ️ Cómo funciona';
  const razon  = esRecomendada && recomendacion.razon ? `${recomendacion.razon} ` : '';
  const cuerpo = `${razon}${_RESUMEN_ESTRATEGIA[tipo]}`;
  return `
    <div class="estrategia-card__bloque">
      <p class="estrategia-card__bloque-titulo">${titulo}</p>
      <p class="estrategia-card__bloque-body">${_esc(cuerpo)}</p>
    </div>`;
}

/**
 * Mensaje educativo cuando una estrategia elegida no aplica con las deudas
 * actuales. Reemplaza completamente el bloque de detalle (sin métricas: no
 * tienen sentido si la estrategia no aplica).
 */
function _renderNoAplica(estrategia) {
  if (estrategia === 'avalancha') {
    return `
      <div class="estrategia-card__no-aplica" role="status">
        <p class="estrategia-card__bloque-titulo">🔒 No aplica con tus deudas actuales</p>
        <p class="estrategia-card__bloque-body">
          Avalancha solo tiene sentido si hay al menos una deuda con tasa de interés mayor a 0.
          Actualmente todas tus deudas son sin interés, así que cualquier orden de pago da el mismo resultado.
        </p>
        <p class="estrategia-card__bloque-body">
          <strong>Sugerencia:</strong> usa Bola de nieve para cerrar primero la más chica.
        </p>
      </div>`;
  }
  return '';
}

/**
 * Acelerador plegable: envuelve el input de extra mensual + resumen de impacto
 * en un `<details>` colapsado bajo el detalle de la estrategia (Revisión D.2
 * de ADR 011). Se abre automáticamente si el usuario ya escribió un monto.
 */
function _renderAceleradorExtra(extraMensual, resumenHtml) {
  return `
    <details class="estrategia-card__acelerador"${extraMensual > 0 ? ' open' : ''}>
      <summary class="estrategia-card__acelerador-summary">💪 ¿Puedes pagar más rápido?</summary>
      <div class="estrategia-card__acelerador-body">
        <div class="form-group">
          <label for="estrategia-extra" class="label">Pago extra mensual</label>
          <input id="estrategia-extra" class="input" type="number"
                 min="0" step="10000" value="${extraMensual || ''}"
                 placeholder="Ej. 50000" autocomplete="off" inputmode="numeric"
                 data-action="cambiar-extra-estrategia" />
          <p class="form-hint">Cualquier monto adicional acelera el cierre y ahorra intereses.</p>
        </div>
        ${resumenHtml}
      </div>
    </details>`;
}

/**
 * compromisos/views/estrategia.js - card de estrategia de pago de deudas (F.4).
 *
 * Jerarquía (Revisión D.7, ADR 011): picker Avalancha/Bola de nieve arriba
 * (protagonista) → detalle de la estrategia elegida → acelerador plegable
 * "¿Puedes pagar más rápido?" (plan viable) o, en plan inviable, un botón
 * único de alerta que abre un panel con un selector de 3 alternativas
 * (Aumentar la cuota / Renegociar / Consolidar) que muestra una a la vez.
 *
 * Aloja el estado UI local `_uiEstrategia` (extra mensual, estrategia activa,
 * estado del panel de alternativas). Es un singleton mutable; persiste
 * mientras la pestaña está abierta y vuelve a defaults al recargar.
 *
 * Los renderers de "Tu impacto" (Avalancha, Bola de nieve, comparativa) viven
 * en `estrategia-impacto.js` para mantener este archivo bajo 400 líneas.
 */

import { S } from '../../../core/state.js';
import { esc as _esc, f } from '../../../infra/utils.js';
import { icon } from '../../../infra/icons.js';
import { estimarSalarioMensual } from '../../../infra/financiero.js';
import {
  filtrarDeudasPagables,
  compararEstrategias,
  recomendarEstrategia,
  recomendarPalanca,
  calcularFijosMensuales,
} from '../logic.js';
import {
  renderImpactoAvalancha,
  renderImpactoBolaNieve,
  renderResumenExtra,
  renderRenegociar,
  renderConsolidar,
} from './estrategia-impacto.js';

// Estado UI local: extra mensual, estrategia activa, herramienta de renegociación.
// Persiste mientras la pestaña está abierta; al recargar vuelve a defaults.
// estrategia=null indica "no elegida aún" (mostramos solo las cards).
const _uiEstrategia = {
  extraMensual:       0,
  estrategia:         null,
  renegociarDeudaId:  null,  // deuda elegida en la herramienta de renegociar tasa
  renegociarTasaPct:  0,     // nueva tasa escrita, en la unidad nativa de la deuda
  consolidarTasaPct:  0,     // tasa EA del crédito de consolidación
  consolidarCuota:    0,     // cuota mensual del crédito de consolidación
  panelAlternativasAbierto: false,   // D.8: diagnóstico del plan inviable abierto/cerrado
  // D.15d-2: palanca elegida en la sección siempre visible. null = "sin elegir":
  // se muestra la palanca principal que recomienda el motor. Al tocar un tile
  // se fija aquí y respeta la elección del usuario.
  alternativaActiva:  null,          // null | 'aumentar' | 'renegociar' | 'consolidar'
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
  if (patch.renegociarDeudaId !== undefined) {
    _uiEstrategia.renegociarDeudaId = patch.renegociarDeudaId || null;
  }
  if (patch.renegociarTasaPct !== undefined) {
    const n = Number(patch.renegociarTasaPct);
    _uiEstrategia.renegociarTasaPct = Number.isFinite(n) && n >= 0 ? n : 0;
  }
  if (patch.consolidarTasaPct !== undefined) {
    const n = Number(patch.consolidarTasaPct);
    _uiEstrategia.consolidarTasaPct = Number.isFinite(n) && n >= 0 ? n : 0;
  }
  if (patch.consolidarCuota !== undefined) {
    const n = Number(patch.consolidarCuota);
    _uiEstrategia.consolidarCuota = Number.isFinite(n) && n >= 0 ? n : 0;
  }
  if (patch.panelAlternativasAbierto !== undefined) {
    _uiEstrategia.panelAlternativasAbierto = !!patch.panelAlternativasAbierto;
  }
  // alternativaActiva admite null explícito ("sin elección" → se usa la palanca
  // principal). Un valor no reconocido también cae a null; `undefined` no la toca.
  if (patch.alternativaActiva !== undefined) {
    const v = patch.alternativaActiva;
    _uiEstrategia.alternativaActiva =
      (v === 'aumentar' || v === 'renegociar' || v === 'consolidar') ? v : null;
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
    // D9 (regla R1): el componente conserva su identidad aunque cambien los
    // datos. Con una sola deuda cambia el cuerpo, no el encabezado: antes el
    // título pasaba a "Estrategia de pago" y el eyebrow desaparecía, así que
    // el mismo bloque se presentaba con dos nombres según cuántas deudas hubiera.
    el.innerHTML = `
      <p class="grupo-eyebrow">Estrategia de pago</p>
      <article class="estrategia-card">
        <header class="estrategia-card__header">
          <span class="estrategia-card__header-teja" aria-hidden="true">${icon('lightbulb')}</span>
          <div class="estrategia-card__header-texto">
            <h2 class="estrategia-card__title">¿Cómo salir más rápido?</h2>
          </div>
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

  // BUG-011: la ESTRUCTURA de la card (recomendación de orden, detalle y el
  // bloque viable/inviable) se decide SOLO con los datos registrados (extra = 0).
  // El extra tecleado en la palanca "Aumentar la cuota" es una simulación que se
  // commitea por tecla (para no perder el clic en "Aplicar"): nunca decide
  // estructura. Solo alimenta el resumen comparativo dentro de su propio bloque
  // (resumenExtraHtml). El detalle de la estrategia de orden también usa extra=0:
  // la exploración del pago extra vive en la palanca, no en el detalle de orden.
  const base = recomendarEstrategia(deudas, 0);

  // Nivel PALANCA (D.15d-2): qué ACCIÓN tomar sobre el plan (Aumentar / Renegociar
  // / Consolidar), ortogonal al orden Avalancha/Bola. La recomendación sale de
  // datos registrados (ingreso, fijos, Σ cuotas), no del extra simulado: BUG-011
  // vale también aquí. `estimarSalarioMensual` vive en infra (D.15d-1, ADN #10);
  // los fijos mensuales los suma el propio dominio con `calcularFijosMensuales`.
  const ingresoMensual = estimarSalarioMensual(S.ingresos ?? []);
  const fijosMensuales = calcularFijosMensuales(S.compromisos ?? []);
  const palanca = recomendarPalanca(deudas, { ingresoMensual, fijosMensuales });

  const resumenExtraHtml = extraMensual > 0
    ? renderResumenExtra(compararEstrategias(deudas, 0), compararEstrategias(deudas, extraMensual), extraMensual)
    : renderResumenExtra(null, null, 0);

  el.innerHTML = `
    <p class="grupo-eyebrow">Estrategia de pago</p>
    <article class="estrategia-card">
      <header class="estrategia-card__header">
        <span class="estrategia-card__header-teja" aria-hidden="true">${icon('lightbulb')}</span>
        <div class="estrategia-card__header-texto">
          <h2 class="estrategia-card__title">¿Cómo salir más rápido?</h2>
          <p class="estrategia-card__subtitle">
            Los plazos y ahorros son simulaciones con los datos que registraste; confírmalos con tu entidad antes de decidir.
          </p>
        </div>
      </header>

      <div class="estrategia-cards" role="group" aria-label="Elige una estrategia">
        ${_renderCardEstrategia('avalancha', estrategia, base, hayTasaPositiva)}
        ${_renderCardEstrategia('bolaNieve', estrategia, base, true)}
      </div>

      ${_renderDetalleEstrategia(estrategia, base, deudas, 0, hayTasaPositiva)}
      ${base.viable ? '' : _renderBloqueInviable(base.diagnostico)}
      ${_renderPalancas(deudas, palanca, extraMensual, resumenExtraHtml)}
    </article>`;
}

/**
 * Bloque inviable (Revisión D.7, ADR 011; arquitectura de 2 capas del ADR 031,
 * D.16c). Aparece cuando ninguna estrategia cierra el plan con el pago actual,
 * debajo del detalle de la estrategia de orden. Es la CAPA DE ALARMA: un botón
 * de alerta (danger) que, al abrirse, muestra SOLO el diagnóstico (qué deudas
 * crecen y el extra mínimo). Las soluciones (las 3 palancas) viven en su propia
 * sección siempre visible más abajo (`_renderPalancas`): la alarma señala, la
 * solución calma.
 *
 * @param {{ deudasCrecientes: Array<{ id, descripcion, deficitMensual }>, extraMinimo: number|null }} diagnostico
 */
function _renderBloqueInviable(diagnostico) {
  if (!diagnostico) return '';
  const abierto = _uiEstrategia.panelAlternativasAbierto;
  return `
    ${_renderBotonAlerta(abierto)}
    ${abierto ? `
      <div id="estrategia-panel-alternativas" class="estrategia-card__alerta" role="region" aria-label="Por qué tu plan no se sostiene">
        ${_renderDiagnosticoTexto(diagnostico)}
      </div>` : ''}`;
}

/**
 * Botón único que resume el estado inviable y alterna el diagnóstico. Cambia de
 * copy entre cerrado (alerta + invitación a entender) y abierto (encabezado
 * corto, el panel ya explica el detalle).
 */
function _renderBotonAlerta(abierto) {
  const texto = abierto
    ? 'Tu plan de pago no se sostiene'
    : 'Cuidado: tu plan de pago no se sostiene. Veamos por qué';
  return `
    <button type="button" class="estrategia-card__alerta-boton"
            data-action="abrir-panel-alternativas"
            aria-expanded="${abierto ? 'true' : 'false'}"
            aria-controls="estrategia-panel-alternativas">
      <span>${icon('alert')} ${texto}</span>
      <span class="estrategia-card__alerta-boton-chevron" aria-hidden="true">${abierto ? '▴' : '▾'}</span>
    </button>`;
}

// Meta (ícono + nombre) de las 3 palancas (D.15d-2). El motor `recomendarPalanca`
// decide cuáles aplican y en qué orden (`palanca.orden`) y cuál es la principal;
// aquí solo vive su presentación. D.16c (ADR 036 D4): renegociar usa el símbolo
// de apretón de manos (mismo lenguaje que la deuda personal).
const _META_ALTERNATIVAS = {
  aumentar:   { icono: icon('trending-up', 'icon icon--sm'), nombre: 'Aumentar la cuota' },
  renegociar: { icono: icon('handshake', 'icon icon--sm'),   nombre: 'Renegociar la tasa' },
  consolidar: { icono: icon('cuentas', 'icon icon--sm'),     nombre: 'Consolidar' },
};

/**
 * Sección de PALANCAS (D.15d-2), siempre visible bajo el detalle de orden. Saca
 * las 3 macro-acciones a primer plano (antes enterradas en el panel inviable):
 * intro con la razón de la palanca recomendada + tiles con pesos visuales según
 * `palanca.orden` (la principal marcada "Recomendada" y preseleccionada) + la
 * herramienta de la palanca activa (una a la vez). No decide estructura: BUG-011
 * se respeta porque `palanca` sale de datos registrados, no del extra simulado.
 *
 * @param {ReturnType<typeof filtrarDeudasPagables>} deudas
 * @param {ReturnType<import('../logic.js').recomendarPalanca>} palanca
 * @param {number} extraMensual
 * @param {string} resumenExtraHtml
 */
function _renderPalancas(deudas, palanca, extraMensual, resumenExtraHtml) {
  const orden = palanca.orden || [];
  if (orden.length === 0) return '';

  // Palanca activa: la que el usuario tocó (si sigue disponible) o, sin elección,
  // la principal que recomienda el motor.
  const activa = (_uiEstrategia.alternativaActiva && orden.includes(_uiEstrategia.alternativaActiva))
    ? _uiEstrategia.alternativaActiva
    : palanca.principal;

  return `
    <div class="estrategia-card__palancas">
      <div class="estrategia-card__palancas-intro">
        <p class="estrategia-card__bloque-titulo">${icon('lightbulb', 'icon icon--sm')} ¿Qué acción te conviene?</p>
        ${palanca.razon
          ? `<p class="estrategia-card__palancas-razon">${_esc(palanca.razon)}</p>`
          : ''}
      </div>
      <div class="estrategia-card__selector" role="group" aria-label="Elige una acción sobre tu plan">
        ${orden.map(id => _renderPalancaTile(id, activa, palanca.principal)).join('')}
      </div>
      <div class="estrategia-card__alternativa-contenido">
        ${_renderContenidoAlternativa(activa, extraMensual, resumenExtraHtml, deudas)}
      </div>
    </div>`;
}

/**
 * Un tile de palanca. La principal recomendada muestra el subtítulo "Recomendada"
 * (mismo lenguaje que el picker de estrategia); la activa (elegida o principal)
 * viste la identidad de la sección. Las no principales reservan la altura del
 * subtítulo con un ghost para que la fila quede pareja.
 */
function _renderPalancaTile(id, activa, principal) {
  const meta = _META_ALTERNATIVAS[id];
  const esActiva    = activa === id;
  const esPrincipal = principal === id;
  const sub = esPrincipal
    ? `<span class="estrategia-card__selector-sub">${icon('star', 'icon icon--sm')} Recomendada</span>`
    : '<span class="estrategia-card__selector-sub estrategia-card__selector-sub--ghost" aria-hidden="true">&nbsp;</span>';
  return `
    <button type="button"
            class="estrategia-card__selector-opcion${esActiva ? ' estrategia-card__selector-opcion--activa' : ''}${esPrincipal ? ' estrategia-card__selector-opcion--recomendada' : ''}"
            data-action="elegir-alternativa"
            data-alternativa="${id}"
            aria-pressed="${esActiva ? 'true' : 'false'}">
      <span class="estrategia-card__selector-icono" aria-hidden="true">${meta.icono}</span>
      <span class="estrategia-card__selector-nombre">${meta.nombre}</span>
      ${sub}
    </button>`;
}

/** Despacha al contenido de la alternativa elegida (una sola a la vez). */
function _renderContenidoAlternativa(activa, extraMensual, resumenExtraHtml, deudas) {
  if (activa === 'renegociar') return renderRenegociar(deudas, _uiEstrategia);
  if (activa === 'consolidar') return renderConsolidar(deudas, _uiEstrategia);
  return _renderRemedioExtra(extraMensual, resumenExtraHtml);
}

/**
 * Contenido de "Aumentar la cuota": input + resumen de D.2b, reubicado, más el
 * botón "Aplicar" de D.9. El input usa su propia acción (`cambiar-extra-remedio`)
 * que commitea el valor en vivo sin re-render, para que el botón "Aplicar" no se
 * pierda al hacer clic (mismo patrón que renegociar/consolidar en D.3).
 */
function _renderRemedioExtra(extraMensual, resumenExtraHtml) {
  const puedeAplicar = extraMensual > 0;
  return `
    <div class="estrategia-card__remedio">
      <p class="estrategia-card__bloque-titulo">${icon('trending-up', 'icon icon--sm')} Aumenta tu cuota</p>
      <div class="form-group">
        <label for="estrategia-extra" class="label">Pago extra mensual</label>
        <input id="estrategia-extra" class="input" type="number"
               min="0" step="10000" value="${extraMensual || ''}"
               placeholder="Ej. 50000" autocomplete="off" inputmode="numeric"
               data-action="cambiar-extra-remedio" />
        <p class="form-hint">Escribe cuánto extra puedes pagar al mes y mira el impacto en tu plan. Es una simulación libre: nada cambia hasta que confirmes.</p>
      </div>
      ${resumenExtraHtml}
      <button type="button" class="estrategia-card__aplicar estrategia-card__aumentar-aplicar"
              data-action="aplicar-aumento-cuota" ${puedeAplicar ? '' : 'disabled'}>
        Aplicar este aumento
      </button>
    </div>`;
}

/** Texto del diagnóstico: qué deudas crecen y el extra mínimo estimado. */
function _renderDiagnosticoTexto(diagnostico) {
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
    <div class="estrategia-card__diagnostico">
      <p class="estrategia-card__bloque-titulo">${icon('alert', 'icon icon--sm')} Por qué tu plan no se sostiene</p>
      ${listaCrecientes}
      ${sugerenciaExtra}
    </div>`;
}

// El aviso de tasa desconocida vive ahora en la lista, por deuda (D.12):
// ver `_renderCompromisoItem` en lista.js.

// D.16b (ADR 036 D2): Bola de nieve estrena su símbolo propio `i-snowball`
// (antes el círculo genérico). La metáfora definitiva de ambos íconos sigue
// siendo el mandato de IV.4 (diseño dirigido de Esteban, ADR 026).
const _META_ESTRATEGIA = {
  avalancha: { icono: icon('mountain'),  nombre: 'Avalancha' },
  bolaNieve: { icono: icon('snowball'),  nombre: 'Bola de nieve' },
};

// Resúmenes integrados (mecanismo + ideal en 1 párrafo). La razón de
// recomendación se prepende solo cuando la estrategia es la recomendada.
const _RESUMEN_ESTRATEGIA = {
  avalancha: 'Atacas primero la deuda con la tasa más alta, así cada peso va más al capital y menos a intereses. Puede que la primera deuda tarde un poco más en cerrarse, pero a la larga ahorras más dinero. Te conviene si tu prioridad es pagar lo menos posible.',
  bolaNieve: 'Atacas primero la deuda más chica; cuando la terminas, esa cuota se suma a la siguiente, generando un efecto acumulativo (la "bola" que crece). Te conviene si necesitas ver progreso rápido para mantener el impulso.',
};

/**
 * Renderiza una card seleccionable de estrategia. Si `recomendacion.estrategia`
 * coincide, muestra "Recomendada para ti" (con icon('star')) como subtítulo interno.
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
    ? `<span class="estrategia-card-pick__sub">${icon('star', 'icon icon--sm')} Recomendada para ti</span>`
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
 *   1. Resumen ("Por qué te conviene" si es recomendada, "Cómo funciona" si no)
 *      → integra razón (si recomendada) + mecanismo + ideal en 1 párrafo
 *   2. Tu impacto (métricas concretas en orden consistente entre estrategias)
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
        Elige una estrategia para ver el detalle y cómo te ayuda.
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
        <p class="estrategia-card__bloque-titulo">${icon('bar-chart', 'icon icon--sm')} Tu impacto</p>
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
  const titulo = esRecomendada
    ? `${icon('star', 'icon icon--sm')} Por qué te conviene`
    : `${icon('info', 'icon icon--sm')} Cómo funciona`;
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
        <p class="estrategia-card__bloque-titulo">${icon('alert', 'icon icon--sm')} No aplica con tus deudas actuales</p>
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

// D.15d-2: el acelerador plegable "¿Puedes pagar más rápido?" (un `<details>`
// que solo ofrecía subir la cuota) se retiró. Su función es ahora la palanca
// "Aumentar la cuota" de la sección de palancas (`_renderRemedioExtra`), siempre
// visible y con botón "Aplicar" (absorbe D.15e). El input de extra vive ahí.

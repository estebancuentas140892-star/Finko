/**
 * config/view.js - HTML del panel de configuración.
 * Puede leer S. No puede mutarlo. Sin lógica de negocio.
 */

import { S } from '../../core/state.js';
import { f, hoy, esc as _esc } from '../../infra/utils.js';
import { icon } from '../../infra/icons.js';
import { estadoPermiso } from '../../infra/notificaciones.js';
import { SECCIONES_AVISO, LABEL_SECCION_AVISO } from '../../infra/avisos.js';
import { estadoCuota } from '../../core/storage.js';
import { diasHastaFecha } from '../../infra/bolsas.js';
import { legalVigente, estadoVigenciaLegal, APP_VERSION, SITUACIONES_LABORALES } from '../../core/constants.js';
import { estaInstalada } from '../../ui/install-prompt.js';
import { DOCUMENTOS_LEGALES } from './legal.js';
import { candadoActivo, cryptoDisponible, PIN_LARGO_MIN, PIN_LARGO_MAX } from './bloqueo.js';

// ── FORMATO DE MONTOS EN CAPTURA (B4/R16) ────────────────────────
//
// Los tres campos de renta son los únicos de la app donde el usuario
// escribe cifras de ocho dígitos. `f()` no sirve acá: antepone "$" y eso
// no puede vivir dentro de un `value`. Este par (formatear / leer) es la
// única fuente de verdad del separador de miles en Ajustes.

/**
 * Agrupa miles con punto para mostrar dentro de un campo de texto.
 * Devuelve '' si no hay dígitos: los tres campos son opcionales.
 *
 * @param {string | number | null | undefined} valor
 * @returns {string} - ej. `72.000.000`
 */
export function miles(valor) {
  const digitos = String(valor ?? '').replace(/\D/g, '').replace(/^0+(?=\d)/, '');
  if (digitos === '') return '';
  return digitos.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/**
 * Inversa de `miles()`: lee lo que hay escrito en el campo y devuelve el
 * número. `null` si el campo está vacío (no provisto, distinto de cero).
 *
 * @param {string | number | null | undefined} texto
 * @returns {number | null}
 */
export function desdeMiles(texto) {
  const digitos = String(texto ?? '').replace(/\D/g, '');
  return digitos === '' ? null : Number(digitos);
}

/**
 * Renderiza el panel de configuración completo en `#panel-config`.
 * No-op si el contenedor no existe.
 *
 * B1/R13: la pila plana de diez tarjetas iguales pasa a cinco grupos
 * rotulados, con lo más usado arriba (los dos interruptores) y lo opcional
 * plegado abajo (impuestos). El rótulo de grupo copia la receta de
 * `.mas-sheet__group-label`, el patrón que la hoja "Más" ya usa.
 */
export function renderPanelConfig() {
  const el = document.getElementById('panel-config');
  if (!el) return;

  el.innerHTML = `
    ${_renderAvisoVigencia()}
    ${_grupo('La app',      [_renderTema(), _renderAtajos(), _renderNotificaciones(), _renderInstalarApp()])}
    ${_grupo('Tu cuenta',   [_renderPerfil(), _renderBloqueo()])}
    ${_grupo('Tus datos',   [_renderDatos()])}
    ${_grupo('Impuestos',   [_renderImpuestos()])}
    ${_grupo('Información', [_renderLegal(), _renderAcercaDe()])}
  `;
}

/**
 * Envuelve un puñado de tarjetas bajo un rótulo de grupo (B1).
 * @param {string} rotulo
 * @param {string[]} secciones - HTML de cada `.config-section`
 * @returns {string}
 */
function _grupo(rotulo, secciones) {
  return `
    <div class="config-grupo">
      <span class="config-grupo__label">${_esc(rotulo)}</span>
      ${secciones.join('')}
    </div>`;
}

/**
 * Confirmación visible de guardado (B12/R14). Vive apagada junto al botón y
 * `config/index.js` la enciende unos segundos tras persistir. `aria-hidden`
 * a propósito: quien usa lector de pantalla ya recibe el `announce()`, y sin
 * esto lo escucharía dos veces.
 *
 * @param {string} id - id del chip, el que usa `_confirmarGuardado()`
 * @param {string} texto - etiqueta del botón de submit
 * @returns {string}
 */
function _botonGuardar(id, texto) {
  return `
    <div class="config-form__guardar">
      <button type="submit" class="btn btn-primary">${_esc(texto)}</button>
      <span class="chip chip-success" id="${id}" aria-hidden="true" hidden>
        ${icon('check-circle')} Guardado
      </span>
    </div>`;
}

/**
 * Aviso de vigencia (P1). Visible solo cuando empezó un año nuevo y todavía no
 * se cargaron los valores legales oficiales de ese año: la app usa los del año
 * anterior como referencia provisional. Devuelve '' mientras los valores estén
 * al día.
 */
function _renderAvisoVigencia() {
  const vig = estadoVigenciaLegal();
  if (!vig.desactualizado) return '';

  return `
    <div class="nudge nudge-medium" role="status">
      <span class="nudge__icon" aria-hidden="true">📅</span>
      <div class="nudge__body">
        <p class="nudge__title">Valores legales de ${vig.anioActual} pendientes</p>
        <p class="nudge__desc">Finko todavía usa los valores oficiales de ${vig.anioVigente} (SMMLV, UVT y topes de renta) porque los de ${vig.anioActual} aún no se han cargado. Se muestran como referencia provisional hasta que se actualicen.</p>
      </div>
    </div>`;
}

function _renderTema() {
  const light = document.body.classList.contains('light-theme');
  const icono = light ? icon('sun') : icon('moon');
  const label = light ? 'Tema claro activo' : 'Tema oscuro activo';
  return `
    <section class="config-section" aria-labelledby="config-tema-title">
      <h2 class="config-section__title" id="config-tema-title">Apariencia</h2>
      <label class="config-toggle" for="toggle-tema">
        <span class="toggle">
          <input
            id="toggle-tema"
            type="checkbox"
            data-action="theme-toggle"
            ${light ? 'checked' : ''}
            aria-label="Cambiar entre tema oscuro y claro"
          />
          <span class="toggle__track" aria-hidden="true"></span>
        </span>
        <span class="config-toggle__label">${icono} ${label}</span>
      </label>
    </section>`;
}

/**
 * Interruptor de los atajos de teclado de escritorio (INT.1h). WCAG 2.1.4
 * exige poder apagar un atajo de una sola tecla: este es el apagador.
 */
function _renderAtajos() {
  const activo = S.config?.atajosTeclado !== false;
  return `
    <section class="config-section" aria-labelledby="config-atajos-title">
      <h2 class="config-section__title" id="config-atajos-title">Atajos de teclado</h2>
      <label class="config-toggle" for="toggle-atajos">
        <span class="toggle">
          <input
            id="toggle-atajos"
            type="checkbox"
            data-action="toggle-atajos"
            ${activo ? 'checked' : ''}
            aria-label="Activar o desactivar los atajos de teclado"
          />
          <span class="toggle__track" aria-hidden="true"></span>
        </span>
        <span class="config-toggle__label">
          ${activo ? 'Atajos activados' : 'Atajos desactivados'}
        </span>
      </label>
      <p class="form-hint">
        En pantallas de escritorio: <kbd>N</kbd> registra, <kbd>G</kbd> + letra salta de
        sección, <kbd>?</kbd> muestra la lista completa.
      </p>
    </section>`;
}

// ── SECCIONES ────────────────────────────────────────────────────

function _renderInstalarApp() {
  if (estaInstalada()) {
    return `
      <section class="config-section" aria-labelledby="config-install-title">
        <h2 class="config-section__title" id="config-install-title">Instalar app</h2>
        <p class="config-section__desc">
          Finko ya está instalada en este dispositivo. Puedes abrirla desde tu pantalla de inicio.
        </p>
      </section>`;
  }

  // B2/R11: es una oferta, no la acción principal de la sección.
  return `
    <section class="config-section" aria-labelledby="config-install-title">
      <h2 class="config-section__title" id="config-install-title">Instalar app</h2>
      <p class="config-section__desc">
        Instala Finko en tu pantalla de inicio para acceder más rápido, sin abrir el navegador,
        y para que funcione sin conexión a internet.
      </p>
      <button class="btn btn-secondary" data-action="install-pwa"
              aria-label="Instalar Finko en este dispositivo">
        Instalar Finko
      </button>
    </section>`;
}

function _renderPerfil() {
  const nombre = _esc(S.perfil.nombre || 'Sin nombre');
  const sitId  = typeof S.perfil.situacionLaboral === 'string' ? S.perfil.situacionLaboral : '';

  const opciones = SITUACIONES_LABORALES
    .map(s => `<option value="${s.id}"${s.id === sitId ? ' selected' : ''}>${_esc(s.label)}</option>`)
    .join('');

  // B3: el resumen `<dl>` decía los mismos dos datos que los campos de
  // abajo ya muestran rellenados. Queda solo el formulario.
  return `
    <section class="config-section" aria-labelledby="config-perfil-title">
      <h2 class="config-section__title" id="config-perfil-title">Tu perfil</h2>
      <form id="form-perfil" class="config-form" novalidate>
        <div class="form-group">
          <label for="config-nombre" class="label">Tu nombre</label>
          <input id="config-nombre" name="nombre" class="input" type="text"
                 value="${nombre !== 'Sin nombre' ? nombre : ''}"
                 placeholder="Tu nombre" autocomplete="given-name" />
        </div>
        <div class="form-group">
          <label for="config-situacion" class="label">Situación laboral</label>
          <select id="config-situacion" name="situacionLaboral" class="input">
            <option value="">Sin especificar</option>
            ${opciones}
          </select>
          <p class="form-hint">Ayuda a Finko a interpretar tus ingresos. Opcional.</p>
        </div>
        ${_botonGuardar('config-perfil-ok', 'Guardar perfil')}
      </form>
    </section>`;
}

/**
 * Candado de acceso local (CFG.5a, ADR 063).
 *
 * El alcance real va en el cuerpo de la tarjeta, no en un hint gris: el candado
 * tapa la pantalla frente a otra persona, no cifra los datos. Decirlo de frente
 * es la decisión 1 del ADR 063 y ADN 11.
 */
function _renderBloqueo() {
  const activo = candadoActivo(S.config?.bloqueo);

  if (!cryptoDisponible()) {
    return `
      <section class="config-section" aria-labelledby="config-bloqueo-title">
        <h2 class="config-section__title" id="config-bloqueo-title">Candado de acceso</h2>
        <p class="form-hint form-hint--muted">
          El candado necesita una conexión segura (https) o abrir Finko desde este mismo
          dispositivo. Acá no está disponible.
        </p>
      </section>`;
  }

  const explicacion = `
    <p class="form-hint">
      Pide un PIN al abrir Finko. Sirve para que otra persona que use tu dispositivo no
      vea tus cuentas de una. <strong>No cifra tus datos:</strong> siguen guardados en
      este navegador tal cual, así que quien sepa buscarlos ahí o abra un respaldo tuyo
      los va a ver igual.
    </p>`;

  if (!activo) {
    return `
      <section class="config-section" aria-labelledby="config-bloqueo-title">
        <h2 class="config-section__title" id="config-bloqueo-title">Candado de acceso</h2>
        ${explicacion}
        <form id="form-bloqueo-crear" class="config-form" novalidate>
          <div class="form-group">
            <label for="bloqueo-pin" class="label">PIN nuevo</label>
            <input id="bloqueo-pin" name="pin" class="input" type="password"
                   inputmode="numeric" autocomplete="new-password"
                   maxlength="${PIN_LARGO_MAX}" placeholder="${PIN_LARGO_MIN} a ${PIN_LARGO_MAX} números" />
          </div>
          <div class="form-group">
            <label for="bloqueo-pin2" class="label">Repite el PIN</label>
            <input id="bloqueo-pin2" name="pin2" class="input" type="password"
                   inputmode="numeric" autocomplete="new-password"
                   maxlength="${PIN_LARGO_MAX}" placeholder="Otra vez" />
            <p class="form-hint">Si lo olvidas, la única salida es borrar todo y empezar de cero.</p>
          </div>
          <div class="config-form__guardar">
            <button type="submit" class="btn btn-secondary">Activar candado</button>
          </div>
        </form>
      </section>`;
  }

  const creado = String(S.config.bloqueo.creado || '');
  return `
    <section class="config-section" aria-labelledby="config-bloqueo-title">
      <h2 class="config-section__title" id="config-bloqueo-title">Candado de acceso</h2>
      <p class="chip chip-success" id="config-bloqueo-estado">
        ${icon('check-circle')} Candado activo${creado ? ` desde el ${_esc(creado)}` : ''}
      </p>
      ${explicacion}
      <details class="config-desplegable">
        <summary>Cambiar o quitar el PIN</summary>
        <form id="form-bloqueo-cambiar" class="config-form" novalidate>
          <div class="form-group">
            <label for="bloqueo-actual" class="label">PIN actual</label>
            <input id="bloqueo-actual" name="pinActual" class="input" type="password"
                   inputmode="numeric" autocomplete="current-password"
                   maxlength="${PIN_LARGO_MAX}" />
          </div>
          <div class="form-group">
            <label for="bloqueo-nuevo" class="label">PIN nuevo</label>
            <input id="bloqueo-nuevo" name="pin" class="input" type="password"
                   inputmode="numeric" autocomplete="new-password"
                   maxlength="${PIN_LARGO_MAX}" />
          </div>
          <div class="form-group">
            <label for="bloqueo-nuevo2" class="label">Repite el PIN nuevo</label>
            <input id="bloqueo-nuevo2" name="pin2" class="input" type="password"
                   inputmode="numeric" autocomplete="new-password"
                   maxlength="${PIN_LARGO_MAX}" />
          </div>
          <div class="config-form__guardar">
            <button type="submit" class="btn btn-secondary">Cambiar PIN</button>
          </div>
        </form>
        <form id="form-bloqueo-quitar" class="config-form" novalidate>
          <div class="form-group">
            <label for="bloqueo-quitar-pin" class="label">Quitar el candado</label>
            <input id="bloqueo-quitar-pin" name="pinActual" class="input" type="password"
                   inputmode="numeric" autocomplete="current-password"
                   maxlength="${PIN_LARGO_MAX}" placeholder="Tu PIN actual" />
            <p class="form-hint">Finko vuelve a abrirse sin pedir nada. Tus datos no se tocan.</p>
          </div>
          <div class="config-form__guardar">
            <button type="submit" class="btn btn-secondary">Quitar candado</button>
          </div>
        </form>
      </details>
    </section>`;
}

function _renderNotificaciones() {
  const permiso = estadoPermiso();
  const habilitado = S.config?.notificaciones === true;

  if (permiso === 'unsupported') {
    return `
      <section class="config-section" aria-labelledby="config-notif-title">
        <h2 class="config-section__title" id="config-notif-title">Recordatorios</h2>
        <p class="config-section__desc">
          Tu navegador no soporta notificaciones push. Puedes ver los compromisos
          próximos directamente en la sección <a href="#compromisos" class="link">Compromisos</a>.
        </p>
      </section>`;
  }

  if (permiso === 'denied') {
    // B7/R18: instalada como PWA no hay barra de direcciones ni candado que
    // tocar, y la sección de arriba justamente invita a instalarla. El texto
    // se ramifica con la misma señal que decide si se ofrece la instalación.
    const comoDesbloquear = estaInstalada()
      ? 'Para volver a activarlas: ajustes del teléfono → Notificaciones → Finko → Permitir.'
      : 'Para volver a activarlas, haz clic en el candado de la barra de direcciones → Notificaciones → Permitir.';

    return `
      <section class="config-section" aria-labelledby="config-notif-title">
        <h2 class="config-section__title" id="config-notif-title">Recordatorios</h2>
        <p class="config-section__desc config-section__desc--warn">
          Bloqueaste las notificaciones de Finko en este dispositivo. ${comoDesbloquear}
        </p>
        <p class="form-hint">
          Mientras tanto, los compromisos que vencen pronto siguen visibles en
          <a href="#agenda" class="link">Calendario</a> y en Inicio.
        </p>
      </section>`;
  }

  if (permiso === 'default') {
    // B2/R11: activar recordatorios es una oferta, no la acción principal.
    return `
      <section class="config-section" aria-labelledby="config-notif-title">
        <h2 class="config-section__title" id="config-notif-title">Recordatorios</h2>
        <p class="config-section__desc">
          Recibes una notificación al abrir Finko si hay algo importante: un pago
          por vencer, un tope superado, un préstamo con la fecha pactada cumplida.
        </p>
        <button class="btn btn-secondary" data-action="activar-notificaciones"
                aria-label="Activar recordatorios de compromisos">
          Activar recordatorios
        </button>
      </section>`;
  }

  // permiso === 'granted'
  return `
    <section class="config-section" aria-labelledby="config-notif-title">
      <h2 class="config-section__title" id="config-notif-title">Recordatorios</h2>
      <label class="config-toggle" for="toggle-notif">
        <span class="toggle">
          <input
            id="toggle-notif"
            type="checkbox"
            data-action="toggle-notificaciones"
            ${habilitado ? 'checked' : ''}
            aria-label="Recordatorios de compromisos"
          />
          <span class="toggle__track" aria-hidden="true"></span>
        </span>
        <span class="config-toggle__label">
          ${habilitado ? 'Recordatorios activos' : 'Recordatorios desactivados'}
        </span>
      </label>
      <p class="form-hint">
        Recibes una notificación al abrir la app si hay algo importante y no te
        avisó ya hoy.
      </p>
      ${habilitado ? _renderPreferenciasAvisos() : ''}
    </section>`;
}

/**
 * Interruptor por sección de aviso (CFG.3c, ADR 066 nota 2026-08-13). Solo se
 * muestra con los recordatorios activos: apagar la fuente sin apagar antes el
 * interruptor general no tiene sentido (nada se muestra de todos modos).
 * `<fieldset>`/`<legend>` en vez de un `<h3>` propio: agrupa los cinco
 * controles sin CSS nuevo (`fieldset` ya llega borderless por `reset.css`) y
 * `<legend>` reusa `.form-hint`, mismo criterio de "menos vocabulario nuevo".
 */
function _renderPreferenciasAvisos() {
  const prefs = S.config?.avisosPorSeccion ?? {};

  const filas = SECCIONES_AVISO.map(seccion => {
    const id     = `toggle-aviso-${seccion}`;
    const label  = LABEL_SECCION_AVISO[seccion];
    const activo = prefs[seccion] !== false;
    return `
      <label class="config-toggle" for="${id}">
        <span class="toggle">
          <input
            id="${id}"
            type="checkbox"
            data-action="toggle-aviso-seccion"
            data-seccion="${seccion}"
            ${activo ? 'checked' : ''}
            aria-label="Avisos de ${_esc(label)}"
          />
          <span class="toggle__track" aria-hidden="true"></span>
        </span>
        <span class="config-toggle__label">${_esc(label)}</span>
      </label>`;
  }).join('');

  return `
    <fieldset class="config-avisos-tipos">
      <legend class="form-hint">Qué te avisa</legend>
      ${filas}
    </fieldset>`;
}

/**
 * Bloque "Impuestos" (CFG.2c, ADR 050 D1): perfil fiscal y datos de renta
 * dejan de renderizarse permanentes en Ajustes (ni siquiera plegados) y pasan
 * a un asistente que se abre tras este botón. La interpretación sigue
 * viviendo solo en Análisis (K.3): acá no queda más que la puerta de entrada.
 */
function _renderImpuestos() {
  return `
    <section class="config-section" aria-labelledby="config-fiscal-title">
      <h2 class="config-section__title" id="config-fiscal-title">Impuestos</h2>
      <p class="config-section__desc">
        Perfil fiscal y datos de renta, opcionales. Si los registras, el monitor de renta
        de Análisis deja de mostrar "Sin datos".
      </p>
      <button class="btn btn-secondary" type="button" data-action="abrir-perfil-fiscal">
        Completar perfil fiscal
      </button>
    </section>`;
}

/**
 * Contenido del asistente fiscal (CFG.2c): los dos formularios que antes
 * vivían siempre montados en Ajustes, ahora inyectados en `#modal-fiscal-body`
 * solo cuando el usuario abre el modal. Mismo HTML, mismo contrato de guardado
 * (`config/index.js` los cablea al abrir); sin lógica fiscal nueva.
 */
export function renderModalFiscal() {
  return `${_renderPerfilFiscal()}${_renderDatosRenta()}`;
}

function _renderPerfilFiscal() {
  const pf   = (typeof S.config?.perfilFiscal === 'object' && S.config.perfilFiscal !== null)
    ? S.config.perfilFiscal : {};
  const iva  = pf.ivaResponsable       === true;
  const cont = pf.obligadoContabilidad === true;
  const decl = pf.declaranteObligado   === true;

  return `
    <div class="config-bloque">
      <h3 class="config-bloque__title">Perfil fiscal</h3>
      <p class="config-section__desc">
        Si alguna de estas situaciones aplica a tu caso, Finko agrega una
        recomendación en tu panel de Análisis para que consultes con un contador.
        No necesitas saber si debes declarar: eso lo estima Análisis con tus
        topes de renta.
      </p>
      <form id="form-perfil-fiscal" class="config-form" novalidate>
        <div class="form-group form-group--checkbox">
          <label class="checkbox-row">
            <input type="checkbox" name="ivaResponsable" ${iva ? 'checked' : ''} />
            <span>Soy responsable del IVA (régimen común o simplificado)</span>
          </label>
        </div>
        <div class="form-group form-group--checkbox">
          <label class="checkbox-row">
            <input type="checkbox" name="obligadoContabilidad" ${cont ? 'checked' : ''} />
            <span>Estoy obligado a llevar contabilidad</span>
          </label>
        </div>
        <div class="form-group form-group--checkbox">
          <label class="checkbox-row">
            <input type="checkbox" name="declaranteObligado" ${decl ? 'checked' : ''} />
            <span>La DIAN me notificó como declarante obligado de renta</span>
          </label>
          <p class="form-hint">
            Márcalo solo si ya recibiste esa notificación. Déjalo en blanco si no
            sabes: Análisis lo estima con tus topes de renta.
          </p>
        </div>
        ${_botonGuardar('config-fiscal-ok', 'Guardar perfil fiscal')}
      </form>
    </div>`;
}

function _renderDatosRenta() {
  const anio = Number(hoy().slice(0, 4));
  const df   = (typeof S.config?.datosFiscales === 'object' && S.config.datosFiscales !== null)
    ? (S.config.datosFiscales[anio] ?? {}) : {};
  const val = (k) =>
    (df[k] !== undefined && df[k] !== null && Number.isFinite(Number(df[k]))) ? miles(df[k]) : '';

  // B4/R16: `type="text" inputmode="numeric"` con separador de miles al
  // escribir. Con `type="number"` un ingreso anual se lee `72000000` y un
  // cero de más no se detecta a simple vista. El "(COP)" sale de la
  // etiqueta: su lugar lo ocupa una ayuda que dice de dónde sale el número.
  return `
    <div class="config-bloque">
      <h3 class="config-bloque__title">Datos de renta ${anio}</h3>
      <p class="config-section__desc">
        Finko estima tus ingresos brutos con los ingresos que ya registraste:
        llena ese campo solo si quieres reemplazar la estimación. Los otros dos
        no los puede calcular. Déjalos en blanco si no aplican.
      </p>
      <form id="form-datos-fiscales" class="config-form" novalidate>
        <div class="form-group">
          <label for="df-ingresos" class="label">Ingresos brutos del año</label>
          <input id="df-ingresos" name="ingresosBrutos" class="input" type="text"
                 inputmode="numeric" autocomplete="off" data-miles
                 value="${val('ingresosBrutos')}" placeholder="Ej: 50.000.000" />
          <p class="form-hint">Todo lo que te entró en ${anio} antes de descuentos. En blanco, Análisis usa su estimación.</p>
        </div>
        <div class="form-group">
          <label for="df-tc" class="label">Consumos con tarjeta de crédito</label>
          <input id="df-tc" name="consumosTC" class="input" type="text"
                 inputmode="numeric" autocomplete="off" data-miles
                 value="${val('consumosTC')}" placeholder="Ej: 20.000.000" />
          <p class="form-hint">La suma de lo que gastaste con tarjetas de crédito en ${anio}.</p>
        </div>
        <div class="form-group">
          <label for="df-consig" class="label">Consignaciones y depósitos</label>
          <input id="df-consig" name="consignaciones" class="input" type="text"
                 inputmode="numeric" autocomplete="off" data-miles
                 value="${val('consignaciones')}" placeholder="Ej: 60.000.000" />
          <p class="form-hint">Todo lo que entró a tus cuentas bancarias en ${anio}.</p>
        </div>
        ${_botonGuardar('config-renta-ok', 'Guardar datos de renta')}
      </form>
    </div>`;
}

/**
 * Aviso de almacenamiento (ADR 030). Solo aparece si el espacio local se está
 * agotando o si el último guardado falló: guía al usuario a exportar un
 * respaldo antes de perder información. En operación normal no se muestra.
 * @returns {string}
 */
function _renderAvisoAlmacenamiento() {
  const { nivel, ratio, falloUltimoGuardado } = estadoCuota();
  if (nivel === 'ok' && !falloUltimoGuardado) return '';

  const critico = nivel === 'critico' || falloUltimoGuardado;
  const clase   = critico ? 'nudge-critical' : 'nudge-medium';
  const pct     = Math.min(100, Math.round(ratio * 100));

  const titulo = falloUltimoGuardado
    ? 'No se pudo guardar tu último cambio'
    : critico
      ? 'Tu almacenamiento está casi lleno'
      : 'Tu almacenamiento se está llenando';

  const desc = falloUltimoGuardado
    ? 'El espacio de este dispositivo se llenó y tu último cambio no quedó guardado. Guarda un respaldo ahora y libera espacio para no perder información.'
    : `Estás usando cerca del ${pct}% del espacio disponible en este dispositivo. Guarda un respaldo para no arriesgar tus datos si el espacio se agota.`;

  return `
    <div class="nudge ${clase}" role="${critico ? 'alert' : 'status'}">
      <span class="nudge__icon" aria-hidden="true">⚠️</span>
      <div class="nudge__body">
        <p class="nudge__title">${titulo}</p>
        <p class="nudge__desc">${desc}</p>
        <button class="btn btn-primary nudge__cta" data-action="exportar-datos">Guardar respaldo (JSON)</button>
      </div>
    </div>`;
}

/**
 * Gestión de datos. B6: los cuatro botones eran indistinguibles y dos de
 * ellos mueven TODA la app mientras que los otros dos solo tocan los gastos;
 * ahora van en dos pares rotulados por ámbito, con verbos que dicen la
 * consecuencia. B5: el importador deja de ser un `<label>` con un input
 * `sr-only aria-hidden` que sí recibía foco.
 */
/**
 * Bloque de borrado automático del navegador (CFG.4a, ADR 043 D2.1).
 *
 * Nace `hidden` y con el cuerpo vacío a propósito: el estado real es asíncrono
 * (`navigator.storage.persisted()` devuelve una promesa) y `view.js` es
 * síncrono. Lo llena `_pintarPersistencia()` en `config/index.js` apenas
 * resuelve. La alternativa era pintar una afirmación provisional y corregirla
 * medio segundo después: en un bloque que habla de perder datos, eso no.
 */
function _renderPersistencia() {
  return `
    <div class="config-bloque" id="config-persistencia" hidden>
      <h3 class="config-bloque__title">Borrado automático del navegador</h3>
      <p class="config-section__desc" id="config-persistencia-estado"></p>
      <button class="btn btn-secondary" type="button" id="config-persistencia-btn"
              data-action="proteger-datos" hidden>
        Proteger mis datos
      </button>
    </div>`;
}

/**
 * Sello del último respaldo en lenguaje humano (CFG.4b, ADR 043 D2.2).
 * Exportada porque `config/index.js` la reusa para actualizar el texto tras
 * exportar, sin re-renderizar el panel (mismo criterio que el chip de
 * guardado y que el bloque de persistencia de CFG.4a).
 *
 * @param {string|null} ultimoRespaldoISO `S.config.ultimoRespaldoISO`.
 * @returns {string}
 */
export function textoUltimoRespaldo(ultimoRespaldoISO) {
  if (!ultimoRespaldoISO) return 'Nunca has guardado un respaldo.';

  const dias = diasHastaFecha(ultimoRespaldoISO, hoy());
  if (dias === null) return 'Nunca has guardado un respaldo.';

  const transcurridos = Math.max(0, -dias);
  if (transcurridos === 0) return 'Guardaste tu último respaldo hoy.';
  if (transcurridos === 1) return 'Guardaste tu último respaldo ayer.';
  return `Guardaste tu último respaldo hace ${transcurridos} días.`;
}

function _renderDatos() {
  return `
    <section class="config-section" aria-labelledby="config-datos-title">
      <h2 class="config-section__title" id="config-datos-title">Tus datos</h2>
      ${_renderAvisoAlmacenamiento()}
      <p class="config-section__desc">
        Todo vive solo en este dispositivo. Si lo pierdes o borras la app, se va
        contigo: guarda un respaldo de vez en cuando.
      </p>
      ${_renderPersistencia()}
      <p class="config-section__desc" id="config-ultimo-respaldo">${textoUltimoRespaldo(S.config?.ultimoRespaldoISO)}</p>
      <p class="form-hint">Toda la app</p>
      <div class="config-actions config-actions--ambito">
        <button class="btn btn-secondary" data-action="exportar-datos">
          Guardar respaldo (JSON)
        </button>
        <button class="btn btn-secondary" type="button" data-action="importar-datos"
                aria-label="Restaurar todos tus datos desde un archivo de respaldo JSON">
          Restaurar desde un respaldo
        </button>
      </div>
      <input type="file" accept=".json" id="config-importar-json" hidden />
      <p class="form-hint">Solo tus gastos</p>
      <div class="config-actions config-actions--ambito">
        <button class="btn btn-secondary" data-action="exportar-gastos-csv"
                aria-label="Exportar todos los gastos a archivo CSV">
          Exportar gastos a Excel (CSV)
        </button>
        <button class="btn btn-secondary" data-action="abrir-import"
                aria-label="Importar gastos desde archivo CSV">
          Importar gastos desde CSV
        </button>
      </div>
      <div class="config-danger">
        <h3 class="config-danger__title">${icon('alert')} Borrar todo</h3>
        <p class="config-danger__desc">
          Borra tus gastos, cuentas, metas y compromisos de este dispositivo.
          No se puede deshacer.
        </p>
        <button class="btn btn-danger" data-action="resetear-app">
          Borrar todos mis datos
        </button>
      </div>
    </section>`;
}

/**
 * Centro Legal (LEG.1): lista los documentos de `docs/legal/`, cada uno se
 * abre en un modal genérico (`modal-legal`) que trae el texto con `fetch`
 * y lo convierte con `infra/markdown.js`. Ver `config/legal.js` y `index.js`.
 *
 * B9: los dos documentos que la gente busca de verdad quedan arriba; los
 * otros ocho, a un toque dentro de un `<details>`.
 */
function _renderLegal() {
  const item = (doc) => `
    <li class="legal-lista__item">
      <button type="button" class="legal-lista__link" data-action="abrir-legal" data-doc="${doc.id}">
        <span>${_esc(doc.titulo)}</span>
        <svg class="icon icon--sm" aria-hidden="true"><use href="#i-chevron-right"/></svg>
      </button>
    </li>`;

  const destacados = DOCUMENTOS_LEGALES.filter(d => d.destacado === true);
  const resto      = DOCUMENTOS_LEGALES.filter(d => d.destacado !== true);

  return `
    <section class="config-section" aria-labelledby="config-legal-title">
      <h2 class="config-section__title" id="config-legal-title">Centro Legal</h2>
      <p class="config-section__desc">
        Aplican al modelo actual: tus datos solo en este dispositivo.
      </p>
      <ul class="legal-lista" role="list">
        ${destacados.map(item).join('')}
      </ul>
      <details class="config-desplegable">
        <summary>
          Más documentos (${resto.length})
          ${icon('chevron-right', 'icon icon--sm')}
        </summary>
        <ul class="legal-lista" role="list">
          ${resto.map(item).join('')}
        </ul>
      </details>
    </section>`;
}

/**
 * "Acerca de Finko". B10: "Vanilla JS · Sin framework · Offline-first" y
 * "localStorage" no le dicen nada a la persona para la que se hizo Finko, y
 * tapaban el único dato que sí importa. La promesa de privacidad pasa a ser
 * la primera fila, con su consecuencia práctica escrita al lado.
 */
function _renderAcercaDe() {
  const vigente = legalVigente();
  const fuenteSmmlv = _esc(vigente.fuentes.smmlv);
  return `
    <section class="config-section" aria-labelledby="config-about-title">
      <h2 class="config-section__title" id="config-about-title">Acerca de Finko</h2>
      <dl class="config-info">
        <dt>Tus datos</dt>              <dd>Solo en este dispositivo</dd>
        <dt>Cuenta</dt>                 <dd>No necesitas una</dd>
        <dt>Salario mínimo ${vigente.anio}</dt> <dd>${f(vigente.smmlv)} (${fuenteSmmlv})</dd>
        <dt>Versión</dt>                <dd>${APP_VERSION}</dd>
      </dl>
      <p class="form-hint">
        Finko no tiene servidor: nada de lo que escribes sale de tu teléfono.
        Por eso el respaldo depende de ti.
      </p>
    </section>`;
}

/**
 * config/view.js - HTML del panel de configuración.
 * Puede leer S. No puede mutarlo. Sin lógica de negocio.
 */

import { S } from '../../core/state.js';
import { f, hoy, esc as _esc } from '../../infra/utils.js';
import { estadoPermiso } from '../../infra/notificaciones.js';
import { legalVigente, SMMLV, APP_VERSION } from '../../core/constants.js';
import { estaInstalada } from '../../ui/install-prompt.js';

/**
 * Renderiza el panel de configuración completo en `#panel-config`.
 * No-op si el contenedor no existe.
 */
export function renderPanelConfig() {
  const el = document.getElementById('panel-config');
  if (!el) return;

  el.innerHTML = `
    ${_renderPerfil()}
    ${_renderPerfilFiscal()}
    ${_renderDatosRenta()}
    ${_renderTema()}
    ${_renderInstalarApp()}
    ${_renderNotificaciones()}
    ${_renderDatos()}
    ${_renderAcercaDe()}
  `;
}

function _renderTema() {
  const light = document.body.classList.contains('light-theme');
  const icono = light ? '☀️' : '🌙';
  const label = light ? 'Tema claro activo' : 'Tema oscuro activo';
  return `
    <section class="config-section" aria-labelledby="config-tema-title">
      <h2 class="config-section__title" id="config-tema-title">🎨 Apariencia</h2>
      <p class="config-section__desc">
        Cambia entre tema oscuro (defecto) y tema claro. La preferencia se guarda
        en este dispositivo.
      </p>
      <label class="config-toggle" for="toggle-tema">
        <input
          id="toggle-tema"
          type="checkbox"
          data-action="theme-toggle"
          ${light ? 'checked' : ''}
          aria-label="Cambiar entre tema oscuro y claro"
        />
        <span class="config-toggle__label">${icono} ${label}</span>
      </label>
    </section>`;
}

// ── SECCIONES ────────────────────────────────────────────────────

function _renderInstalarApp() {
  if (estaInstalada()) {
    return `
      <section class="config-section" aria-labelledby="config-install-title">
        <h2 class="config-section__title" id="config-install-title">📲 Instalar app</h2>
        <p class="config-section__desc">
          Finko ya está instalada en este dispositivo. Puedes abrirla desde tu pantalla de inicio.
        </p>
      </section>`;
  }

  return `
    <section class="config-section" aria-labelledby="config-install-title">
      <h2 class="config-section__title" id="config-install-title">📲 Instalar app</h2>
      <p class="config-section__desc">
        Instala Finko en tu pantalla de inicio para acceder más rápido, sin abrir el navegador,
        y para que funcione sin conexión a internet.
      </p>
      <button class="btn btn-primary" data-action="install-pwa"
              aria-label="Instalar Finko en este dispositivo">
        📲 Instalar Finko
      </button>
    </section>`;
}

function _renderPerfil() {
  const nombre = _esc(S.perfil.nombre || 'Sin nombre');
  const smmlv  = f(S.perfil.smmlv ?? 0);

  return `
    <section class="config-section" aria-labelledby="config-perfil-title">
      <h2 class="config-section__title" id="config-perfil-title">👤 Tu perfil</h2>
      <dl class="config-info">
        <dt>Nombre</dt><dd>${nombre}</dd>
        <dt>SMMLV configurado</dt><dd>${smmlv}</dd>
      </dl>
      <form id="form-perfil" class="config-form" novalidate>
        <div class="form-group">
          <label for="config-nombre" class="label">Actualizar nombre</label>
          <input id="config-nombre" name="nombre" class="input" type="text"
                 value="${nombre !== 'Sin nombre' ? nombre : ''}"
                 placeholder="Tu nombre" autocomplete="given-name" />
        </div>
        <div class="form-group">
          <label for="config-smmlv" class="label">SMMLV (COP)</label>
          <input id="config-smmlv" name="smmlv" class="input" type="number"
                 min="1" step="1000" value="${S.perfil.smmlv ?? ''}"
                 placeholder="${SMMLV}" />
          <p class="form-hint">Usar SMMLV ${legalVigente().anio}: ${f(SMMLV)}. Se actualiza cada año.</p>
        </div>
        <button type="submit" class="btn btn-primary">Guardar perfil</button>
      </form>
    </section>`;
}

function _renderNotificaciones() {
  const permiso = estadoPermiso();
  const habilitado = S.config?.notificaciones === true;

  if (permiso === 'unsupported') {
    return `
      <section class="config-section" aria-labelledby="config-notif-title">
        <h2 class="config-section__title" id="config-notif-title">🔔 Recordatorios</h2>
        <p class="config-section__desc">
          Tu navegador no soporta notificaciones push. Puedes ver los compromisos
          próximos directamente en la sección <a href="#compromisos" class="link">Compromisos</a>.
        </p>
      </section>`;
  }

  if (permiso === 'denied') {
    return `
      <section class="config-section" aria-labelledby="config-notif-title">
        <h2 class="config-section__title" id="config-notif-title">🔔 Recordatorios</h2>
        <p class="config-section__desc config-section__desc--warn">
          Las notificaciones están bloqueadas en tu navegador. Para activarlas,
          haz clic en el candado de la barra de direcciones → Notificaciones → Permitir.
        </p>
      </section>`;
  }

  if (permiso === 'default') {
    return `
      <section class="config-section" aria-labelledby="config-notif-title">
        <h2 class="config-section__title" id="config-notif-title">🔔 Recordatorios</h2>
        <p class="config-section__desc">
          Recibes una notificación cada vez que abres Finko si tienes compromisos
          que vencen en los próximos 3 días.
        </p>
        <button class="btn btn-primary" data-action="activar-notificaciones"
                aria-label="Activar recordatorios de compromisos">
          🔔 Activar recordatorios
        </button>
      </section>`;
  }

  // permiso === 'granted'
  return `
    <section class="config-section" aria-labelledby="config-notif-title">
      <h2 class="config-section__title" id="config-notif-title">🔔 Recordatorios</h2>
      <p class="config-section__desc">
        El navegador tiene permiso para enviar notificaciones.
        Activa o desactiva el recordatorio de compromisos próximos.
      </p>
      <label class="config-toggle" for="toggle-notif">
        <input
          id="toggle-notif"
          type="checkbox"
          data-action="toggle-notificaciones"
          ${habilitado ? 'checked' : ''}
          aria-label="Recordatorios de compromisos"
        />
        <span class="config-toggle__label">
          ${habilitado ? 'Recordatorios activos ✅' : 'Recordatorios desactivados'}
        </span>
      </label>
      <p class="form-hint">
        Recibes una notificación al abrir la app si hay compromisos que vencen
        en los próximos 3 días.
      </p>
    </section>`;
}

function _renderPerfilFiscal() {
  const pf   = (typeof S.config?.perfilFiscal === 'object' && S.config.perfilFiscal !== null)
    ? S.config.perfilFiscal : {};
  const iva  = pf.ivaResponsable       === true;
  const cont = pf.obligadoContabilidad === true;
  const decl = pf.declaranteObligado   === true;

  return `
    <section class="config-section" aria-labelledby="config-fiscal-title">
      <h2 class="config-section__title" id="config-fiscal-title">📋 Perfil fiscal</h2>
      <p class="config-section__desc">
        Opcional. Si alguna de estas situaciones aplica a tu caso, Finko agrega una
        recomendación en tu panel de Análisis para que consultes con un contador.
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
        </div>
        <button type="submit" class="btn btn-primary">Guardar perfil fiscal</button>
      </form>
    </section>`;
}

function _renderDatosRenta() {
  const anio = Number(hoy().slice(0, 4));
  const df   = (typeof S.config?.datosFiscales === 'object' && S.config.datosFiscales !== null)
    ? (S.config.datosFiscales[anio] ?? {}) : {};
  const val = (k) =>
    (df[k] !== undefined && df[k] !== null && Number.isFinite(Number(df[k]))) ? df[k] : '';

  return `
    <section class="config-section" aria-labelledby="config-datosrenta-title">
      <h2 class="config-section__title" id="config-datosrenta-title">🧮 Datos de renta (${anio})</h2>
      <p class="config-section__desc">
        Opcional. Finko no puede calcular estos tres valores por su cuenta. Si los
        registras, el monitor de renta en Análisis los incluye y deja de mostrar
        "Sin datos". Déjalos en blanco si no aplican.
      </p>
      <form id="form-datos-fiscales" class="config-form" novalidate>
        <div class="form-group">
          <label for="df-ingresos" class="label">Ingresos brutos del año (COP)</label>
          <input id="df-ingresos" name="ingresosBrutos" class="input" type="number"
                 min="0" step="1000" inputmode="numeric" value="${val('ingresosBrutos')}"
                 placeholder="Ej: 50000000" />
        </div>
        <div class="form-group">
          <label for="df-tc" class="label">Consumos con tarjeta de crédito del año (COP)</label>
          <input id="df-tc" name="consumosTC" class="input" type="number"
                 min="0" step="1000" inputmode="numeric" value="${val('consumosTC')}"
                 placeholder="Ej: 20000000" />
        </div>
        <div class="form-group">
          <label for="df-consig" class="label">Consignaciones y depósitos del año (COP)</label>
          <input id="df-consig" name="consignaciones" class="input" type="number"
                 min="0" step="1000" inputmode="numeric" value="${val('consignaciones')}"
                 placeholder="Ej: 60000000" />
          <p class="form-hint">Estos valores alimentan el monitor de renta de Análisis.</p>
        </div>
        <button type="submit" class="btn btn-primary">Guardar datos de renta</button>
      </form>
    </section>`;
}

function _renderDatos() {
  return `
    <section class="config-section" aria-labelledby="config-datos-title">
      <h2 class="config-section__title" id="config-datos-title">💾 Tus datos</h2>
      <p class="config-section__desc">
        Todos tus datos se almacenan solo en este dispositivo.
        Expórtalos para hacer un respaldo o para moverlos a otro dispositivo.
      </p>
      <div class="config-actions">
        <button class="btn btn-secondary" data-action="exportar-datos">
          ⬇ Exportar datos (JSON)
        </button>
        <label class="btn btn-secondary" aria-label="Importar datos desde archivo JSON">
          ⬆ Importar datos (JSON)
          <input type="file" accept=".json" data-action="importar-datos"
                 class="sr-only" aria-hidden="true" />
        </label>
        <button class="btn btn-secondary" data-action="abrir-import"
                aria-label="Importar gastos desde archivo CSV">
          📥 Importar gastos (CSV)
        </button>
        <button class="btn btn-secondary" data-action="exportar-gastos-csv"
                aria-label="Exportar todos los gastos a archivo CSV">
          📤 Exportar gastos (CSV)
        </button>
      </div>
      <div class="config-danger">
        <h3 class="config-danger__title">⚠️ Zona de peligro</h3>
        <p class="config-danger__desc">Esto borrará TODOS tus datos de manera irreversible.</p>
        <button class="btn btn-danger" data-action="resetear-app">
          🗑 Resetear app
        </button>
      </div>
    </section>`;
}

function _renderAcercaDe() {
  const vigente = legalVigente();
  const fuenteSmmlv = _esc(vigente.fuentes.smmlv);
  return `
    <section class="config-section" aria-labelledby="config-about-title">
      <h2 class="config-section__title" id="config-about-title">ℹ️ Acerca de Finko</h2>
      <dl class="config-info">
        <dt>Versión</dt>        <dd>${APP_VERSION}</dd>
        <dt>Tecnología</dt>    <dd>Vanilla JS · Sin framework · Offline-first</dd>
        <dt>Almacenamiento</dt><dd>localStorage (solo en tu dispositivo)</dd>
        <dt>SMMLV vigente</dt> <dd>${f(vigente.smmlv)} (${fuenteSmmlv})</dd>
      </dl>
    </section>`;
}


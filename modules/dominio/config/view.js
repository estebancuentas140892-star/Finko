/**
 * config/view.js — HTML del panel de configuración.
 * Puede leer S. No puede mutarlo. Sin lógica de negocio.
 */

import { S } from '../../core/state.js';
import { f } from '../../infra/utils.js';

/**
 * Renderiza el panel de configuración completo en `#panel-config`.
 * No-op si el contenedor no existe.
 */
export function renderPanelConfig() {
  const el = document.getElementById('panel-config');
  if (!el) return;

  el.innerHTML = `
    ${_renderPerfil()}
    ${_renderDatos()}
    ${_renderAcercaDe()}
  `;
}

// ── SECCIONES ────────────────────────────────────────────────────

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
                 placeholder="1423500" />
          <p class="form-hint">Usar SMMLV 2026: $1.423.500. Se actualiza cada año.</p>
        </div>
        <button type="submit" class="btn btn-primary">Guardar perfil</button>
      </form>
    </section>`;
}

function _renderDatos() {
  return `
    <section class="config-section" aria-labelledby="config-datos-title">
      <h2 class="config-section__title" id="config-datos-title">💾 Tus datos</h2>
      <p class="config-section__desc">
        Todos tus datos se almacenan solo en este dispositivo.
        Exportalos para hacer un respaldo o para moverlos a otro dispositivo.
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
  return `
    <section class="config-section" aria-labelledby="config-about-title">
      <h2 class="config-section__title" id="config-about-title">ℹ️ Acerca de Finko</h2>
      <dl class="config-info">
        <dt>Versión</dt>        <dd>0.1.0</dd>
        <dt>Tecnología</dt>    <dd>Vanilla JS · Sin framework · Offline-first</dd>
        <dt>Almacenamiento</dt><dd>localStorage (solo en tu dispositivo)</dd>
        <dt>SMMLV vigente</dt> <dd>$1.423.500 (Mintrabajo, vigente hasta 2026-12-31)</dd>
      </dl>
    </section>`;
}

// ── HELPER ───────────────────────────────────────────────────────

function _esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/**
 * config/index.js — API pública del panel de configuración.
 *
 * Responsabilidades:
 * - Renderizar el panel en #panel-config.
 * - Gestionar: edición de perfil, exportar datos, importar datos, reset.
 * - No usa EventBus (las mutaciones se manejan directamente aquí).
 */

import { S } from '../../core/state.js';
import { save, STORAGE_KEY } from '../../core/storage.js';
import { registrarAccion } from '../../ui/actions.js';
import { renderSmart } from '../../infra/render.js';
import { announce } from '../../infra/a11y.js';
import { dialogo } from '../../infra/utils.js';
import { pedirPermiso } from '../../infra/notificaciones.js';
import { renderPanelConfig } from './view.js';
import { gastosACSV } from '../export/logic.js';

// ── HANDLERS DE ACCIÓN ───────────────────────────────────────────

function _exportarDatos() {
  try {
    const json  = JSON.stringify(S, null, 2);
    const blob  = new Blob([json], { type: 'application/json' });
    const url   = URL.createObjectURL(blob);
    const fecha = new Date().toISOString().slice(0, 10);
    const a     = document.createElement('a');
    a.href     = url;
    a.download = `finko-backup-${fecha}.json`;
    a.click();
    URL.revokeObjectURL(url);
    announce('Datos exportados correctamente.');
  } catch (err) {
    console.error('[config] exportarDatos falló:', err);
    announce('No se pudo exportar. Intentá de nuevo.', 'assertive');
  }
}

/** @param {HTMLElement} el — el <input type="file"> */
function _importarDatos(el) {
  const file = el.files?.[0];
  if (!file) return;

  if (!dialogo(`¿Importar datos desde "${file.name}"? Esto reemplazará TODA tu información actual.`)) {
    el.value = '';
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      JSON.parse(e.target.result); // Valida JSON antes de escribir.
      localStorage.setItem(STORAGE_KEY, e.target.result);
      announce('Datos importados. Recargando…');
      setTimeout(() => location.reload(), 800);
    } catch {
      announce('El archivo no es un JSON válido de Finko.', 'assertive');
      el.value = '';
    }
  };
  reader.readAsText(file);
}

async function _activarNotificaciones() {
  const resultado = await pedirPermiso();
  if (resultado === 'granted') {
    if (!S.config) S.config = {};
    S.config.notificaciones = true;
    save();
    renderPanelConfig();
    announce('Recordatorios activados. Recibirás una alerta al abrir Finko si tenés compromisos próximos.');
  } else if (resultado === 'denied') {
    announce('El navegador bloqueó las notificaciones. Habilitá el permiso desde la configuración del navegador.', 'assertive');
  } else {
    announce('No se pudo activar los recordatorios en este momento.', 'assertive');
  }
}

/** @param {HTMLElement} el — el <input type="checkbox"> */
function _toggleNotificaciones(el) {
  if (!S.config) S.config = {};
  S.config.notificaciones = el.checked;
  save();
  renderPanelConfig();
  announce(el.checked ? 'Recordatorios activados.' : 'Recordatorios desactivados.');
}

function _exportarGastosCSV() {
  const csv = gastosACSV(S.gastos ?? [], S.cuentas ?? []);
  if (!csv) {
    announce('No hay gastos para exportar.', 'assertive');
    return;
  }
  try {
    const blob  = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url   = URL.createObjectURL(blob);
    const fecha = new Date().toISOString().slice(0, 10);
    const a     = document.createElement('a');
    a.href     = url;
    a.download = `finko-gastos-${fecha}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    const n = S.gastos?.length ?? 0;
    announce(`${n} gasto${n === 1 ? '' : 's'} exportado${n === 1 ? '' : 's'} a CSV.`);
  } catch (err) {
    console.error('[config] exportarGastosCSV falló:', err);
    announce('No se pudo exportar. Intentá de nuevo.', 'assertive');
  }
}

function _resetearApp() {
  if (!dialogo('¿Resetear TODA la app? Perderás ingresos, gastos, cuentas, metas y compromisos. Esta acción es irreversible.')) return;
  localStorage.clear();
  announce('App reseteada. Recargando…');
  setTimeout(() => location.reload(), 800);
}

// ── INIT ─────────────────────────────────────────────────────────

function _inyectarPanel() {
  renderPanelConfig();

  const panel = document.getElementById('panel-config');
  if (!panel) return;

  // Guardar perfil.
  panel.querySelector('#form-perfil')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const datos = Object.fromEntries(new FormData(e.target));
    const nombre = datos.nombre?.trim();
    const smmlv  = Number(datos.smmlv);

    if (nombre) S.perfil.nombre = nombre;
    if (!isNaN(smmlv) && smmlv > 0) S.perfil.smmlv = smmlv;

    save();
    renderPanelConfig();
    announce('Perfil actualizado.');
  });

  // Importar: el input file no dispara data-action click — usamos change.
  panel.querySelector('[data-action="importar-datos"]')
    ?.addEventListener('change', (e) => _importarDatos(e.target));
}

export function initConfig() {
  registrarAccion('exportar-datos',         _exportarDatos);
  registrarAccion('exportar-gastos-csv',    _exportarGastosCSV);
  registrarAccion('resetear-app',           _resetearApp);
  registrarAccion('activar-notificaciones', _activarNotificaciones);
  registrarAccion('toggle-notificaciones',  _toggleNotificaciones);

  // El panel se inyecta la primera vez que la sección está activa.
  renderSmart(_inyectarPanel, 'config');

  window.addEventListener('hashchange', () => {
    renderSmart(_inyectarPanel, 'config');
  });
}

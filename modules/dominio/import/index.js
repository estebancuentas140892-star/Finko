/**
 * import/index.js - API pública del dominio de importación CSV.
 *
 * Responsabilidades:
 * - Registrar acciones del flujo: abrir-import, seleccionar-csv,
 *   confirmar-import, cancelar-import, reiniciar-import.
 * - Coordinar logic.js (parse + validación) con view.js (render del modal).
 * - Mantener el último resultado procesado en memoria local hasta confirmar.
 *
 * Flujo:
 *   1. abrir-import       → muestra picker
 *   2. seleccionar-csv    → procesa archivo, muestra preview
 *   3. confirmar-import   → guarda gastos válidos en S, cierra modal
 *   3'. cancelar-import   → descarta resultado, cierra modal
 *   3''. reiniciar-import → vuelve al picker (cuando hay error global)
 */

import { S } from '../../core/state.js';
import { guardar } from '../../infra/crud.js';
import { registrarAccion } from '../../ui/actions.js';
import { abrirModal, cerrarModal } from '../../ui/modales.js';
import { announce } from '../../infra/a11y.js';
import { procesarCSV } from './logic.js';
import { renderImportPicker, renderImportPreview } from './view.js';

// ── ESTADO LOCAL ─────────────────────────────────────────────────

/** Último resultado de procesarCSV(); se descarta al cerrar modal. */
let _ultimoResultado = null;

// ── HELPERS ──────────────────────────────────────────────────────

function _getOverlay() {
  return document.getElementById('modal-import');
}

function _getBody() {
  return document.getElementById('modal-import-body');
}

function _setBody(html) {
  const body = _getBody();
  if (body) body.innerHTML = html;
}

// ── HANDLERS ─────────────────────────────────────────────────────

function _abrirImport() {
  const overlay = _getOverlay();
  if (!overlay) return;
  _ultimoResultado = null;
  _setBody(renderImportPicker());
  abrirModal(overlay);
}

/** @param {HTMLElement} el - el <input type="file"> */
function _seleccionarCSV(el) {
  const file = el.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const texto = String(e.target?.result ?? '');
      _ultimoResultado = procesarCSV(texto, S.gastos ?? [], S.cuentas ?? []);
      _setBody(renderImportPreview(_ultimoResultado));
      if (_ultimoResultado.error) {
        announce(_ultimoResultado.error, 'assertive');
      } else {
        const n = _ultimoResultado.validos.length;
        announce(`Preview listo: ${n} gasto${n === 1 ? '' : 's'} listos para importar.`);
      }
    } catch (err) {
      console.error('[import] error al procesar:', err);
      _ultimoResultado = { error: 'No se pudo leer el archivo. ¿Está en formato CSV?' };
      _setBody(renderImportPreview(_ultimoResultado));
    }
  };
  reader.onerror = () => {
    announce('Error leyendo el archivo.', 'assertive');
  };
  reader.readAsText(file, 'UTF-8');

  // Limpiar el input para que se pueda re-seleccionar el mismo archivo.
  el.value = '';
}

function _confirmarImport() {
  if (!_ultimoResultado || _ultimoResultado.validos.length === 0) return;

  let guardados = 0;
  for (const v of _ultimoResultado.validos) {
    guardar('gastos', v.datos);
    guardados++;
  }

  const overlay = _getOverlay();
  if (overlay) cerrarModal(overlay);

  announce(`${guardados} gasto${guardados === 1 ? '' : 's'} importado${guardados === 1 ? '' : 's'} correctamente.`);
  _ultimoResultado = null;
}

function _cancelarImport() {
  const overlay = _getOverlay();
  if (overlay) cerrarModal(overlay);
  _ultimoResultado = null;
  announce('Importación cancelada.');
}

function _reiniciarImport() {
  _ultimoResultado = null;
  _setBody(renderImportPicker());
}

// ── INIT ─────────────────────────────────────────────────────────

export function initImport() {
  registrarAccion('abrir-import',     _abrirImport);
  registrarAccion('confirmar-import', _confirmarImport);
  registrarAccion('cancelar-import',  _cancelarImport);
  registrarAccion('reiniciar-import', _reiniciarImport);

  // Los <input type="file"> disparan 'change', no 'click'. Delegación específica
  // para no contaminar el delegador global de acciones.
  document.addEventListener('change', (e) => {
    const el = e.target.closest?.('[data-action="seleccionar-csv"]');
    if (el) _seleccionarCSV(el);
  });
}

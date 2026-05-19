/**
 * import/view.js - HTML del modal de importación CSV.
 *
 * Dos vistas dentro del mismo modal:
 *   - renderImportPicker() - paso 1: seleccionar archivo + formato esperado.
 *   - renderImportPreview(resultado) - paso 2: resumen + tabla + acciones.
 *
 * Puede leer datos. NO usa S directo. No muta nada. Sin lógica de negocio.
 */

import { f } from '../../infra/utils.js';

// ── PICKER (paso 1) ───────────────────────────────────────────────

/**
 * Vista inicial: file picker + descripción del formato esperado.
 * @returns {string} HTML del body del modal.
 */
export function renderImportPicker() {
  return `
    <div class="import-picker">
      <p class="import-intro">
        Importá tus gastos desde un archivo CSV. Se omiten los duplicados
        (misma fecha, monto y descripción) automáticamente.
      </p>

      <details class="import-format">
        <summary class="import-format__title">📋 Formato esperado</summary>
        <div class="import-format__body">
          <p>Columnas requeridas: <code>fecha</code>, <code>monto</code>, <code>descripcion</code>.</p>
          <p>Columnas opcionales: <code>categoria</code>, <code>cuenta</code>, <code>nota</code>.</p>
          <pre class="import-format__example">fecha,monto,descripcion,categoria
2026-05-15,200000,Mercado,Alimentación
2026-05-16,15000,Café,Alimentación</pre>
          <ul class="import-format__notas">
            <li>Fecha en formato <strong>YYYY-MM-DD</strong> o <strong>DD/MM/YYYY</strong>.</li>
            <li>Separador <strong>coma</strong> o <strong>punto y coma</strong> (autodetectado).</li>
            <li>Codificación recomendada: <strong>UTF-8</strong>.</li>
          </ul>
        </div>
      </details>

      <label class="btn btn-primary import-file-label">
        📂 Elegir archivo CSV
        <input type="file" accept=".csv,text/csv" data-action="seleccionar-csv"
               class="sr-only" aria-label="Seleccionar archivo CSV" />
      </label>
    </div>`;
}

// ── PREVIEW (paso 2) ──────────────────────────────────────────────

/**
 * Vista de preview: resumen + tabla + acciones.
 *
 * @param {ReturnType<import('./logic.js').procesarCSV>} resultado
 * @returns {string} HTML del body del modal.
 */
export function renderImportPreview(resultado) {
  // Error global (archivo vacío, headers faltantes, etc.)
  if (resultado.error) {
    return `
      <div class="import-preview import-preview--error">
        <p class="import-error">
          <strong>No se pudo procesar el archivo:</strong>
          <br>${_esc(resultado.error)}
        </p>
        <button class="btn btn-secondary" data-action="reiniciar-import">
          ← Volver
        </button>
      </div>`;
  }

  const { validos, duplicados, errores, total, headersDesconocidos = [] } = resultado;
  const sinNadaPorImportar = validos.length === 0;

  const headersDesconocidosBloque = headersDesconocidos.length > 0
    ? `<p class="import-warn">
         ⚠️ Columnas ignoradas (no reconocidas): ${headersDesconocidos.map(h => `<code>${_esc(h)}</code>`).join(', ')}
       </p>`
    : '';

  return `
    <div class="import-preview">
      <div class="import-resumen">
        <article class="import-stat import-stat--ok">
          <p class="import-stat__num">${validos.length}</p>
          <p class="import-stat__label">A importar</p>
        </article>
        <article class="import-stat import-stat--dup">
          <p class="import-stat__num">${duplicados.length}</p>
          <p class="import-stat__label">Duplicados</p>
        </article>
        <article class="import-stat import-stat--err">
          <p class="import-stat__num">${errores.length}</p>
          <p class="import-stat__label">Con errores</p>
        </article>
        <article class="import-stat">
          <p class="import-stat__num">${total}</p>
          <p class="import-stat__label">Total filas</p>
        </article>
      </div>

      ${headersDesconocidosBloque}

      ${_renderTabla(validos, duplicados, errores)}

      <div class="import-actions">
        <button class="btn btn-secondary" data-action="cancelar-import">
          Cancelar
        </button>
        <button class="btn btn-primary"
                data-action="confirmar-import"
                ${sinNadaPorImportar ? 'disabled aria-disabled="true"' : ''}>
          ${sinNadaPorImportar
            ? 'Nada para importar'
            : `Importar ${validos.length} gasto${validos.length === 1 ? '' : 's'}`}
        </button>
      </div>
    </div>`;
}

// ── INTERNAS ─────────────────────────────────────────────────────

function _renderTabla(validos, duplicados, errores) {
  const totalFilas = validos.length + duplicados.length + errores.length;
  if (totalFilas === 0) return '<p class="analisis__empty">Sin filas que mostrar.</p>';

  // Combinamos todas las filas en una sola tabla ordenada por número de fila.
  const todasFilas = [
    ...validos.map(v    => ({ ...v, _orden: v.fila })),
    ...duplicados.map(d => ({ ...d, _orden: d.fila })),
    ...errores.map(e    => ({ ...e, _orden: e.fila })),
  ].sort((a, b) => a._orden - b._orden);

  const rows = todasFilas.map(item => {
    if (item.estado === 'error') {
      return `
        <tr class="import-row import-row--error">
          <td>${item.fila}</td>
          <td colspan="4">
            <strong>Errores:</strong> ${item.mensajes.map(_esc).join(' · ')}
          </td>
          <td class="import-row__estado">❌</td>
        </tr>`;
    }
    const g = item.datos;
    const claseEstado = item.estado === 'duplicado' ? 'import-row--dup' : 'import-row--ok';
    const icono       = item.estado === 'duplicado' ? '↻' : '✓';
    return `
      <tr class="import-row ${claseEstado}">
        <td>${item.fila}</td>
        <td>${_esc(g.fecha)}</td>
        <td class="import-row__monto">${f(g.monto)}</td>
        <td>${_esc(g.descripcion)}</td>
        <td>${_esc(g.categoria)}</td>
        <td class="import-row__estado" aria-label="${item.estado}">${icono}</td>
      </tr>`;
  }).join('');

  return `
    <div class="import-tabla-wrap">
      <table class="import-tabla" aria-label="Preview de filas a importar">
        <thead>
          <tr>
            <th scope="col">#</th>
            <th scope="col">Fecha</th>
            <th scope="col">Monto</th>
            <th scope="col">Descripción</th>
            <th scope="col">Categoría</th>
            <th scope="col" aria-label="Estado"></th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

function _esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

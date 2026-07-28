/**
 * metas/view.js - generación de HTML para el dominio de metas de ahorro.
 * Puede leer S. No puede mutarlo. Sin lógica de negocio.
 */

import { S } from '../../core/state.js';
import { f, fechaLegible, esc as _esc } from '../../infra/utils.js';
import { emptyArt, iconoCategoria } from '../../infra/icons.js';
import { progressRing } from '../../infra/svg.js';
import { SALDO_MASCARA_CUENTA } from '../../infra/render.js';
import { renderSelectorCuenta } from '../../infra/cuenta-helper.js';
import { renderIconoPicker } from '../../infra/icon-picker.js';
import { CATEGORIAS_META_USUARIO, CATEGORIA_META_ICONO, ICONOS_CATEGORIA_PERSONALIZADA } from '../../core/constants.js';
import {
  metasActivas, metasCumplidas, calcularProgreso, calcularAhorroPorPeriodo,
  frecuenciaPrincipalIngresos,
} from './logic.js';

// ── LISTA DE METAS ───────────────────────────────────────────────

/**
 * Renderiza la lista de metas en `#lista-metas`.
 * No-op si el contenedor no existe.
 *
 * DIS.13 (MT.d, FM4): las metas cumplidas dejan de desaparecer. Van en un
 * bloque propio al final, apagadas pero presentes: el logro queda a la vista
 * y la fila sigue siendo editable y eliminable (antes su DOM ni se pintaba).
 * El estado vacío solo aparece cuando no hay ninguna meta, de ningún tipo:
 * "Sin metas de ahorro" encima de una lista de metas cumplidas se
 * contradiría (regla R51).
 *
 * DIS.13 (MT.b, FM5): toda cifra en pesos de la sección respeta
 * `S.config.ocultarSaldo`, el mismo flag del ojo de Inicio (regla R20). El
 * porcentaje del anillo no se enmascara: muestra proporción, no magnitud.
 */
export function renderListaMetas() {
  const el = document.getElementById('lista-metas');
  if (!el) return;

  const activas   = metasActivas(S.metas);
  const cumplidas = metasCumplidas(S.metas);

  if (activas.length === 0 && cumplidas.length === 0) {
    el.innerHTML = _renderEmptyState();
    return;
  }

  // MT.4: el ritmo de ahorro sugerido usa la frecuencia real de ingreso del
  // usuario (quincenal, mensual...), no "por día" fijo. Se calcula una sola
  // vez para toda la lista: es la misma frecuencia para todas las metas.
  const frecuenciaIngresos = frecuenciaPrincipalIngresos(S.ingresos);
  const oculto = S.config?.ocultarSaldo === true;

  const cumplidasHtml = cumplidas.length > 0
    ? `<p class="metas-cumplidas__label">Metas cumplidas</p>
       ${cumplidas.map(m => _renderMetaItem(m, frecuenciaIngresos, oculto)).join('')}`
    : '';

  el.innerHTML = `
    ${activas.map(m => _renderMetaItem(m, frecuenciaIngresos, oculto)).join('')}
    ${cumplidasHtml}`;
}

/**
 * DIS.13 (MT.a, FM1 y FM2): la fila emite `.list-item__meta`, la columna de
 * monto que el resto de la app ya usa. No es cosmética: es la clase que
 * activa el layout móvil de dos filas de `responsive.css` (regla R56), cuyo
 * comentario decía cubrir Metas desde siempre. Sin ella el cuerpo se quedaba
 * en 51px de 315 medidos a 374px, el nombre se partía a mitad de palabra en
 * 5 líneas y la fila medía 506px de alto.
 *
 * DIS.13 (MT.c, FM3): el subtítulo baja de cuatro datos a dos. El acumulado y
 * el objetivo suben a su columna (donde se comparan de un vistazo), el ritmo
 * de ahorro (el consejo) pasa a su propia línea y los "N días restantes" se
 * van: la fecha límite dice lo mismo y no envejece.
 *
 * DIS.13 (MT.e, FM6, regla R11): el contenedor del anillo pierde su
 * `aria-hidden`, que borraba el subárbol entero y con él la etiqueta del SVG.
 * En Metas el porcentaje solo vive ahí: sin etiqueta no había forma de
 * conocerlo con lector de pantalla.
 *
 * @param {import('../../core/state.js').Meta} meta
 * @param {string} frecuenciaIngresos - una de FRECUENCIAS_AHORRO (MT.4).
 * @param {boolean} [oculto=false] `S.config.ocultarSaldo` (MT.b, regla R20).
 */
function _renderMetaItem(meta, frecuenciaIngresos, oculto = false) {
  const nombre  = _esc(meta.nombre);
  const icono   = _iconoMeta(meta);
  const { porcentaje, faltante, completada } = calcularProgreso(meta);
  const ahorro  = calcularAhorroPorPeriodo(meta, frecuenciaIngresos);
  const m       = (n) => oculto ? SALDO_MASCARA_CUENTA : f(n);

  // El corte del bloque manda sobre el recálculo: una meta marcada como
  // cumplida se pinta como cumplida aunque su objetivo haya cambiado después.
  const cumplida    = meta.completada === true || completada;
  const claseAnillo = cumplida ? 'complete' : porcentaje >= 80 ? 'near' : 'default';

  const subtitleParts = [];
  if (cumplida) {
    subtitleParts.push('Meta cumplida');
  } else {
    if (faltante > 0) subtitleParts.push(`Faltan ${m(faltante)}`);
    subtitleParts.push(meta.fechaLimite ? fechaLegible(meta.fechaLimite) : 'sin fecha límite');
  }

  const ritmoHtml = (ahorro && !cumplida)
    ? `<p class="list-item__progress-label">${m(ahorro.montoPorPeriodo)} ${ahorro.etiqueta} para llegar a tiempo</p>`
    : '';

  const abonarHtml = !cumplida
    ? `<button class="btn btn-ghost btn-sm"
                data-action="abonar-meta"
                data-id="${_esc(meta.id)}"
                aria-label="Abonar a ${nombre}">+ Abonar</button>`
    : '';

  return `
    <article class="list-item${cumplida ? ' list-item--cumplida' : ''}" data-id="${_esc(meta.id)}">
      <div class="list-item__icon list-item__icon--ring progress-ring-wrap progress-ring-wrap--${claseAnillo}" data-dom="metas">
        ${progressRing(porcentaje, {
          size: 56,
          strokeWidth: 5,
          ariaLabel: cumplida ? `${nombre}: meta cumplida` : `${nombre}: ${porcentaje}% de tu objetivo`,
        })}
      </div>
      <div class="list-item__body">
        <p class="list-item__title">${icono} ${nombre}</p>
        <p class="list-item__subtitle">${subtitleParts.join(' · ')}</p>
        ${ritmoHtml}
      </div>
      <div class="list-item__meta">
        <p class="list-item__amount">${m(meta.montoActual ?? 0)}</p>
        <p class="meta-item__de">${cumplida ? 'completa' : `de ${m(meta.montoObjetivo ?? 0)}`}</p>
        ${abonarHtml}
      </div>
      <div class="list-item__action">
        <button class="btn btn-ghost btn-icon"
                data-action="editar-meta"
                data-id="${_esc(meta.id)}"
                aria-label="Editar meta ${nombre}"><svg class="icon" aria-hidden="true"><use href="#i-edit"/></svg></button>
        <button class="btn btn-ghost btn-icon"
                data-action="eliminar-meta"
                data-id="${_esc(meta.id)}"
                aria-label="Eliminar meta ${nombre}"><svg class="icon" aria-hidden="true"><use href="#i-trash"/></svg></button>
      </div>
    </article>`;
}

function _renderEmptyState() {
  return `
    <div class="empty-state">
      <div class="empty-state__icon">${emptyArt('metas')}</div>
      <p class="empty-state__title">Sin metas de ahorro</p>
      <p class="empty-state__desc">Crea tu primera meta: un viaje, una laptop, la boda o lo que quieras. Para gastos que ya sabes que vienen (SOAT, impuestos, arriendo), usa Apartados.</p>
      <button class="btn btn-primary" data-action="nueva-meta">+ Crear meta</button>
      <p class="empty-state__tip">Tip: para el fondo de emergencia, entra a la pestaña Fondo (arriba). Finko calcula cuántos meses de colchón ya tienes y te avisa cuánto falta.</p>
    </div>`;
}

// ── FORMULARIO DEL MODAL ─────────────────────────────────────────

/**
 * Devuelve el HTML del formulario de abono a una meta existente.
 * Si hay cuentas activas, incluye el selector de tarjetas compartido
 * (MT.5, mismo patrón que Apartados/AP.1): preselecciona la cuenta de
 * mayor saldo; `index.js` resuelve el reparto real con
 * `resolverPagoConPreferida` al guardar.
 * @param {import('../../core/state.js').Meta} meta
 * @returns {string}
 */
export function renderFormAbonoMeta(meta) {
  const { porcentaje, faltante } = calcularProgreso(meta);
  const faltanteHtml = faltante > 0
    ? ` · Faltante: <strong>${f(faltante)}</strong>`
    : '';

  const cuentasActivas = (S.cuentas ?? []).filter(c => c.activa !== false);
  const cuentaHtml     = renderSelectorCuenta(cuentasActivas, { label: '¿De qué cuenta sale el abono?' });

  const frecuenciaIngresos = frecuenciaPrincipalIngresos(S.ingresos);
  const ahorro        = calcularAhorroPorPeriodo(meta, frecuenciaIngresos);
  const montoSugerido = ahorro?.montoPorPeriodo > 0 ? ahorro.montoPorPeriodo : null;
  const valorHtml      = montoSugerido ? ` value="${montoSugerido}"` : '';
  const hintPrefill    = montoSugerido
    ? `<p class="form-hint">Es lo que te toca abonar ${_esc(ahorro.etiqueta)} para llegar a tiempo. Puedes cambiarlo.</p>`
    : '';

  return `
    <form id="form-abono-meta" novalidate>
      <input type="hidden" name="metaId" value="${_esc(meta.id)}" />
      <p class="form-hint form-hint--muted">
        Progreso de <strong>${_esc(meta.nombre)}</strong>:
        <strong>${f(meta.montoActual ?? 0)} de ${f(meta.montoObjetivo ?? 0)}</strong> (${porcentaje}%)${faltanteHtml}
      </p>
      <div class="form-group">
        <label for="abono-meta-monto" class="label">Monto del abono (COP)</label>
        <input id="abono-meta-monto" name="monto" class="input" type="number"
               min="1" step="10000" placeholder="0"${valorHtml}
               required aria-required="true"
               autocomplete="off" inputmode="numeric" />
        ${hintPrefill}
      </div>
      ${cuentaHtml}
      <div class="modal__footer">
        <button type="button" class="btn btn-ghost" data-action="modal-close">Cancelar</button>
        <button type="submit" class="btn btn-primary">Registrar abono</button>
      </div>
    </form>`;
}

/**
 * Devuelve el HTML del formulario de meta: nueva si `meta` es null, edición
 * (EDIT.1) prellenada si se pasa una meta existente. `metas/index.js`
 * reinyecta este HTML en cada apertura del modal (crear o editar), así que
 * no hace falta resetear el form a mano entre una y otra: el DOM nace
 * limpio cada vez.
 *
 * **`montoActual` y el histórico de aportes no viven en este formulario a
 * propósito**: se editan el nombre, el objetivo, la fecha y la categoría,
 * nunca lo ya aportado (eso es lo que `normalizarMeta(datos, metaExistente)`
 * preserva al guardar).
 *
 * @param {import('../../core/state.js').Meta|null} [meta] modo edición si se pasa.
 * @returns {string}
 */
export function renderFormMeta(meta = null) {
  const categoriaActual = meta?.categoria ?? '';
  const esOtra          = categoriaActual === 'Otra';
  const botonTexto      = meta ? 'Actualizar meta' : 'Guardar meta';

  return `
    <form id="form-meta" novalidate>
      <p class="modal__intro">Escribe lo que quieres lograr. Con una fecha límite, Finko calcula cuánto guardar cada día para llegar a tiempo.</p>
      <div class="form-group">
        <label for="meta-nombre" class="label">Nombre de la meta</label>
        <input id="meta-nombre" name="nombre" class="input" type="text"
               placeholder="Ej. Viaje a la playa, laptop nueva, boda" required aria-required="true" autocomplete="off"
               value="${_esc(meta?.nombre ?? '')}" />
      </div>
      <div class="form-group">
        <label for="meta-objetivo" class="label">Monto objetivo (COP)</label>
        <input id="meta-objetivo" name="montoObjetivo" class="input" type="number"
               min="1" step="10000" placeholder="0" required aria-required="true"
               value="${meta ? Number(meta.montoObjetivo) || '' : ''}" />
      </div>
      <div class="form-group">
        <label for="meta-fecha" class="label">Fecha límite (opcional)</label>
        <input id="meta-fecha" name="fechaLimite" class="input" type="date" value="${_esc(meta?.fechaLimite ?? '')}" />
        <p class="form-hint">Sin fecha, la meta queda abierta. Con fecha, Finko muestra cuánto guardar por día para llegar a tiempo.</p>
      </div>
      <div class="form-group">
        <label for="meta-categoria" class="label">Categoría (opcional)</label>
        <select id="meta-categoria" name="categoria" class="input">
          <option value="">Sin categoría</option>
          ${_renderOpcionesCategoria(categoriaActual)}
        </select>
        <p class="form-hint">Elige una categoría y Finko le pone el ícono automáticamente.</p>
      </div>
      <!-- CAT.2b: el ícono ya no es un campo suelto para toda meta; solo con
           categoría "Otra" tiene sentido elegirlo (el resto ya trae el ícono
           de su categoría). index.js (_syncCategoriaMeta) alterna [hidden] al
           cambiar la categoría y resetea el picker al ocultarlo. -->
      <div class="form-group" id="form-group-meta-icono" ${esOtra ? '' : 'hidden'}>
        ${renderIconoPicker(ICONOS_CATEGORIA_PERSONALIZADA, { id: 'meta-icono', nombreCampo: 'icono', label: 'Elige un ícono para tu meta', valorActual: _valorIconoEditable(meta) })}
      </div>
      <div class="modal__footer">
        <button type="button" class="btn btn-ghost" data-action="modal-close">Cancelar</button>
        <button type="submit" class="btn btn-primary">${botonTexto}</button>
      </div>
    </form>`;
}

// ── HELPERS ──────────────────────────────────────────────────────

/**
 * Devuelve las `<option>` de CATEGORIAS_META_USUARIO en el orden del catálogo
 * (texto plano: un <option> nativo no renderiza SVG, ADR 025).
 *
 * CAT.1c: si se edita una meta guardada con una categoría ya retirada
 * ('Cumpleaños', 'Vacaciones'), esa categoría se agrega al final como opción
 * propia. Sin eso el select caería en "Sin categoría" y corregir el nombre de
 * la meta le borraría la categoría y le cambiaría el ícono, que es
 * exactamente lo que EDIT.1 vino a evitar. La opción retirada no se ofrece
 * para metas nuevas: solo sobrevive donde ya estaba elegida.
 *
 * @param {string} [seleccionada] categoría a marcar `selected` (edición).
 * @returns {string}
 */
function _renderOpcionesCategoria(seleccionada = '') {
  const catalogo = seleccionada && !CATEGORIAS_META_USUARIO.includes(seleccionada)
    ? [...CATEGORIAS_META_USUARIO, seleccionada]
    : CATEGORIAS_META_USUARIO;

  return catalogo
    .map(cat => `<option value="${_esc(cat)}"${cat === seleccionada ? ' selected' : ''}>${_esc(cat)}</option>`)
    .join('');
}

/**
 * Valor a prellenar en el selector de ícono al editar. Las metas viejas
 * (MT.3, antes de CAT.2b) guardan a veces un emoji crudo en `icono` en vez
 * de un id de símbolo del sprite (mismo criterio de `_iconoMeta` para
 * distinguirlos): un emoji no es un `data-icon` válido del catálogo, así
 * que el picker arrancaría con el recuadro vacío en vez de romperse
 * intentando resolverlo como símbolo.
 * @param {import('../../core/state.js').Meta|null} meta
 * @returns {string|null}
 */
function _valorIconoEditable(meta) {
  if (!meta?.icono) return null;
  return /^[a-z]-/.test(meta.icono) ? meta.icono : null;
}

/**
 * Ícono inline del título de una meta (ID.3). Con categoría predefinida
 * (cualquiera salvo 'Otra'), el glifo del sprite (icon--sm, en línea con
 * el texto: el slot de ícono de la fila ya lo ocupa el anillo de
 * progreso); las metas viejas guardaban el emoji de su categoría en
 * `icono`, y como aquí la categoría manda, migran solas al sprite al
 * re-renderizar. Con 'Otra' o sin categoría gana lo que haya en `meta.icono`;
 * sin nada, la caja c-otros o la diana i-metas.
 *
 * `meta.icono` puede tener dos formatos (CAT.2b, sin bump de schema): un id
 * de símbolo del sprite ('c-pesa', elegido con el picker compartido desde
 * esta rebanada) o un emoji crudo (dato de metas viejas, creadas antes de
 * CAT.2b con el campo de texto libre de MT.3). Se distingue por el patrón
 * `letra-` que ningún emoji real produce.
 *
 * @param {import('../../core/state.js').Meta} meta
 * @returns {string}
 */
function _iconoMeta(meta) {
  if (meta.categoria && meta.categoria !== 'Otra') {
    const simbolo = CATEGORIA_META_ICONO[meta.categoria];
    if (simbolo) return iconoCategoria(simbolo, 'icon icon--sm');
  }
  if (meta.icono) {
    return /^[a-z]-/.test(meta.icono)
      ? iconoCategoria(meta.icono, 'icon icon--sm')
      : _esc(meta.icono);
  }
  return iconoCategoria(meta.categoria === 'Otra' ? 'c-otros' : 'i-metas', 'icon icon--sm');
}

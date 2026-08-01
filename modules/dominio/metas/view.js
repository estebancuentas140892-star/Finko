/**
 * metas/view.js - generación de HTML para el dominio de metas de ahorro.
 * Puede leer S. No puede mutarlo. Sin lógica de negocio.
 */

import { S } from '../../core/state.js';
import { f, fechaLegible, esc as _esc } from '../../infra/utils.js';
import { emptyArt, iconoCategoria } from '../../infra/icons.js';
import { arcoProgreso, siluetaMeta } from '../../infra/svg.js';
import { SALDO_MASCARA_CUENTA } from '../../infra/render.js';
import { renderSelectorCuenta } from '../../infra/cuenta-helper.js';
import { renderIconoPicker } from '../../infra/icon-picker.js';
import {
  CATEGORIAS_META_USUARIO, CATEGORIA_META_ICONO, CATEGORIA_META_SILUETA,
  ICONOS_CATEGORIA_PERSONALIZADA,
} from '../../core/constants.js';
import {
  metasActivas, metasCumplidas, calcularProgreso, calcularAhorroPorPeriodo,
  etiquetaPeriodoAhorro, frecuenciaPrincipalIngresos,
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
       ${cumplidas.map(m => _renderMetaCard(m, frecuenciaIngresos, oculto)).join('')}`
    : '';

  el.innerHTML = `
    ${activas.map(m => _renderMetaCard(m, frecuenciaIngresos, oculto)).join('')}
    ${cumplidasHtml}`;
}

/**
 * DIS.14 (arquitectura A2): la meta deja de ser una fila horizontal y pasa a
 * ser una tarjeta vertical con medidor semicircular. El cambio no es de
 * estilo, es de arquitectura de información:
 *
 * - **El objetivo deja de competir con lo acumulado.** Antes eran dos cifras
 *   enfrentadas ("$1.200.000" contra "de $3.500.000") y la grande era la de lo
 *   que falta. Ahora el objetivo es el extremo derecho de la escala del arco y
 *   la única cifra grande es la que el usuario ya logró.
 * - **El ícono de la meta vive en el centro del arco**, no junto al nombre: el
 *   progreso rodea a lo que se persigue, y a 44px la meta se reconoce sin leer.
 *   Va sobrepuesto y no dentro del SVG porque `meta.icono` puede ser un emoji
 *   heredado (CAT.2b), que dentro de `<text>` conviviría mal con el símbolo del
 *   sprite (mismo criterio que `.apartado__anillo-icono`).
 * - **Un dato que no existe se ofrece, no se rellena:** sin fecha límite no hay
 *   plan de aportes, así que el hueco lo ocupa la invitación a ponerle fecha.
 * - **Un estado terminal conserva su forma:** la meta cumplida mantiene la
 *   tarjeta y cambia su contenido (arco cerrado, sin acción de aportar).
 * - La acción principal ocupa el ancho completo y las dos secundarias caen a un
 *   renglón de menor peso, ambas con los 44px de la regla R4 (antes "+ Abonar"
 *   era un `btn-sm` de 36px, el hallazgo MT.g).
 *
 * Se conserva de DIS.13 lo que la arquitectura no reemplaza: la máscara del ojo
 * de privacidad en toda cifra en pesos (regla R20; el porcentaje, el número de
 * aportes y las fechas no se enmascaran, que no son magnitudes de dinero) y el
 * anillo accesible sin `aria-hidden` en su contenedor (regla R11).
 *
 * @param {import('../../core/state.js').Meta} meta
 * @param {string} frecuenciaIngresos - una de FRECUENCIAS_AHORRO (MT.4).
 * @param {boolean} [oculto=false] `S.config.ocultarSaldo` (MT.b, regla R20).
 */
function _renderMetaCard(meta, frecuenciaIngresos, oculto = false) {
  const nombre  = _esc(meta.nombre);
  const id      = _esc(meta.id);
  const { porcentaje, faltante, completada } = calcularProgreso(meta);
  const ahorro  = calcularAhorroPorPeriodo(meta, frecuenciaIngresos);
  const m       = (n) => oculto ? SALDO_MASCARA_CUENTA : f(n);

  // El corte del bloque manda sobre el recálculo: una meta marcada como
  // cumplida se pinta como cumplida aunque su objetivo haya cambiado después.
  const cumplida  = meta.completada === true || completada;
  const claseArco = cumplida ? 'complete' : porcentaje >= 80 ? 'near' : 'default';
  const glifo     = _glifoMeta(meta, porcentaje, cumplida);
  const acumulado = meta.montoActual ?? 0;
  const enCero    = acumulado <= 0;

  // Con la meta en cero la cifra grande sería "$0" bajo un arco vacío: doble
  // señal de ausencia justo en el momento más frágil. Cede su línea a la frase
  // que nombra el primer paso, y el objetivo pasa a encabezar los datos.
  const heroHtml = (!cumplida && enCero)
    ? `<p class="meta-card__frase">Tu primer aporte arranca el camino</p>`
    : `<p class="meta-card__monto">${m(acumulado)}</p>`;

  const datos = [];
  if (cumplida) {
    datos.push({ texto: 'Meta cumplida', tono: 'fuerte' });
  } else {
    datos.push({
      texto: enCero ? `Objetivo: ${m(meta.montoObjetivo ?? 0)}` : `Faltan ${m(faltante)}`,
      tono:  'fuerte',
    });
    if (ahorro) {
      const plural = ahorro.numPeriodos === 1 ? 'aporte' : 'aportes';
      datos.push({ texto: `${ahorro.numPeriodos} ${plural} de ${m(ahorro.montoPorPeriodo)} ${_esc(ahorro.etiqueta)}` });
    }
    datos.push({
      texto: meta.fechaLimite ? `Meta: ${fechaLegible(meta.fechaLimite)}` : 'Sin fecha límite',
      tono:  'suave',
    });
  }

  const datosHtml = datos
    .map(d => `<p class="meta-card__dato${d.tono ? ` meta-card__dato--${d.tono}` : ''}">${d.texto}</p>`)
    .join('');

  // El hueco que deja el plan de aportes ausente no se rellena: se pide lo que
  // falta, en el mismo lugar donde iría. La invitación abre el formulario de
  // edición, que es donde vive el campo de fecha.
  const nudgeFechaHtml = (!cumplida && !meta.fechaLimite)
    ? `<p class="meta-card__nudge">Ponle una fecha y Finko calcula cuánto guardar ${_esc(etiquetaPeriodoAhorro(frecuenciaIngresos))}.
         <button class="meta-card__nudge-cta"
                 data-action="editar-meta"
                 data-id="${id}"
                 aria-label="Ponerle fecha límite a ${nombre}">Elegir fecha</button></p>`
    : '';

  const aportarHtml = !cumplida
    ? `<button class="meta-card__aportar"
                type="button"
                data-action="abonar-meta"
                data-id="${id}"
                aria-label="Aportar a ${nombre}">+ ${enCero ? 'Hacer el primer aporte' : 'Aportar'}</button>`
    : '';

  return `
    <article class="meta-card${cumplida ? ' meta-card--cumplida' : ''}" data-id="${id}" data-dom="metas">
      <p class="meta-card__nombre">${nombre}</p>
      <div class="meta-card__medidor progress-ring-wrap progress-ring-wrap--${claseArco}">
        <div class="meta-card__arco">
          ${arcoProgreso(porcentaje, {
            ariaLabel: cumplida ? `${nombre}: meta cumplida` : `${nombre}: ${porcentaje}% de tu objetivo`,
          })}
          <span class="meta-card__arco-icono${glifo.esSilueta ? ' meta-card__arco-icono--silueta' : ''}" aria-hidden="true">${glifo.html}</span>
        </div>
        <p class="meta-card__escala">
          <span>${f(0)}</span>
          <span>${m(meta.montoObjetivo ?? 0)}</span>
        </p>
      </div>
      ${heroHtml}
      <div class="meta-card__datos">${datosHtml}</div>
      ${nudgeFechaHtml}
      <div class="meta-card__acciones">
        ${aportarHtml}
        <div class="meta-card__secundarias">
          <button class="btn btn-ghost btn-sm meta-card__secundaria"
                  type="button"
                  data-action="editar-meta"
                  data-id="${id}"
                  aria-label="Editar meta ${nombre}">Editar</button>
          <button class="btn btn-ghost btn-sm meta-card__secundaria"
                  type="button"
                  data-action="eliminar-meta"
                  data-id="${id}"
                  aria-label="Eliminar meta ${nombre}">Eliminar</button>
        </div>
      </div>
    </article>`;
}

function _renderEmptyState() {
  return `
    <div class="empty-state pattern-dots">
      <div class="empty-state__icon">${emptyArt('metas')}</div>
      <p class="empty-state__title">Sin metas de ahorro</p>
      <p class="empty-state__desc">Crea tu primera meta: un viaje, una laptop, la boda o lo que quieras. Para gastos que ya sabes que vienen (SOAT, impuestos, arriendo), usa Reservas.</p>
      <button class="btn btn-primary" data-action="nueva-meta">+ Crear meta</button>
      <p class="empty-state__tip">Tip: para el fondo de emergencia, entra a la pestaña Fondo (arriba). Finko calcula cuántos meses de colchón ya tienes y te avisa cuánto falta.</p>
    </div>`;
}

// ── FORMULARIO DEL MODAL ─────────────────────────────────────────

/**
 * Devuelve el HTML del formulario de aporte a una meta existente.
 * Si hay cuentas activas, incluye el selector de tarjetas compartido
 * (MT.5, mismo patrón que Apartados/AP.1): preselecciona la cuenta de
 * mayor saldo; `index.js` resuelve el reparto real con
 * `resolverPagoConPreferida` al guardar.
 *
 * DIS.14: el copy visible dice "aporte", no "abono". La arquitectura A2 cuenta
 * el avance en aportes ("9 aportes de $242.000 por quincena") y el botón de la
 * tarjeta dice "+ Aportar", que además es la palabra que ya usan las otras
 * bolsas de ahorro (Apartados, Fondo). Los identificadores del DOM y las
 * `data-action` conservan su nombre: renombrarlos sería un refactor sin efecto
 * para el usuario.
 * @param {import('../../core/state.js').Meta} meta
 * @returns {string}
 */
export function renderFormAbonoMeta(meta) {
  const { porcentaje, faltante } = calcularProgreso(meta);
  const faltanteHtml = faltante > 0
    ? ` · Faltante: <strong>${f(faltante)}</strong>`
    : '';

  const cuentasActivas = (S.cuentas ?? []).filter(c => c.activa !== false);
  const cuentaHtml     = renderSelectorCuenta(cuentasActivas, { label: '¿De qué cuenta sale el aporte?' });

  const frecuenciaIngresos = frecuenciaPrincipalIngresos(S.ingresos);
  const ahorro        = calcularAhorroPorPeriodo(meta, frecuenciaIngresos);
  const montoSugerido = ahorro?.montoPorPeriodo > 0 ? ahorro.montoPorPeriodo : null;
  const valorHtml      = montoSugerido ? ` value="${montoSugerido}"` : '';
  const hintPrefill    = montoSugerido
    ? `<p class="form-hint">Es lo que te toca aportar ${_esc(ahorro.etiqueta)} para llegar a tiempo. Puedes cambiarlo.</p>`
    : '';

  return `
    <form id="form-abono-meta" novalidate>
      <input type="hidden" name="metaId" value="${_esc(meta.id)}" />
      <p class="form-hint form-hint--muted">
        Progreso de <strong>${_esc(meta.nombre)}</strong>:
        <strong>${f(meta.montoActual ?? 0)} de ${f(meta.montoObjetivo ?? 0)}</strong> (${porcentaje}%)${faltanteHtml}
      </p>
      <div class="form-group">
        <label for="abono-meta-monto" class="label">Monto del aporte (COP)</label>
        <input id="abono-meta-monto" name="monto" class="input" type="number"
               min="1" step="10000" placeholder="0"${valorHtml}
               required aria-required="true"
               autocomplete="off" inputmode="numeric" />
        ${hintPrefill}
      </div>
      ${cuentaHtml}
      <div class="modal__footer">
        <button type="button" class="btn btn-ghost" data-action="modal-close">Cancelar</button>
        <button type="submit" class="btn btn-primary">Registrar aporte</button>
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
      <div class="form-group">
        <label for="meta-nota" class="label">Nota (opcional)</label>
        <input id="meta-nota" name="nota" class="input" type="text" maxlength="80"
               placeholder="Ej. Cotización en Despegar, código de la reserva"
               value="${_esc(meta?.nota ?? '')}" />
        <p class="form-hint">Se muestra junto a la meta en el asistente de "Distribuir mi ingreso".</p>
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
 * Lo que va en el centro del arco (DIS.19, item 3 del informe de gráficos).
 *
 * La silueta gana cuando la categoría resuelve una forma, porque hace el trabajo
 * del ícono y uno más: se llena de abajo hacia arriba, así que a 62px la meta se
 * reconoce **y** se mide sin leer una cifra. El resto conserva su glifo de
 * siempre, y la precedencia es exactamente la de `_iconoMeta()` para que las dos
 * lecturas no se contradigan:
 *
 * - Categoría predefinida: manda la categoría, así que manda su silueta.
 * - Categoría 'Otra' con ícono propio: gana el ícono. El usuario eligió ese
 *   glifo a mano (MT.3/CAT.2b) y una caja genérica sería un retroceso.
 * - Categoría 'Otra' sin ícono propio: la caja, que es lo que ya mostraba.
 * - Sin categoría: la diana de siempre. "Sin categoría" no es una categoría, y
 *   darle la caja diría "Otra", que es una elección que el usuario no hizo.
 *
 * La silueta se emite decorativa: el arco que la rodea ya anuncia el porcentaje
 * con el nombre de la meta, y repetirlo lo diría dos veces.
 *
 * @param {import('../../core/state.js').Meta} meta
 * @param {number} porcentaje
 * @param {boolean} cumplida
 * @returns {{html: string, esSilueta: boolean}}
 */
function _glifoMeta(meta, porcentaje, cumplida) {
  const forma = _formaSilueta(meta);
  if (!forma) {
    return { html: _iconoMeta(meta, 'icon meta-card__glifo'), esSilueta: false };
  }

  // Una meta marcada como cumplida se dibuja llena aunque su objetivo haya
  // cambiado después, igual que su arco (el corte del bloque manda).
  return {
    html: siluetaMeta(cumplida ? 100 : porcentaje, {
      forma,
      clave:      meta.id,
      decorativa: true,
    }),
    esSilueta: true,
  };
}

/**
 * Forma de la silueta de una meta, o `null` si le toca conservar su ícono.
 * Las reglas y su motivo están en `_glifoMeta()`.
 * @param {import('../../core/state.js').Meta} meta
 * @returns {string|null} clave de `SILUETAS`.
 */
function _formaSilueta(meta) {
  if (!meta?.categoria) return null;
  if (meta.categoria === 'Otra' && meta.icono) return null;
  return CATEGORIA_META_SILUETA[meta.categoria] ?? null;
}

/**
 * Ícono de una meta (ID.3). Con categoría predefinida (cualquiera salvo
 * 'Otra'), el glifo del sprite; las metas viejas guardaban el emoji de su
 * categoría en `icono`, y como aquí la categoría manda, migran solas al
 * sprite al re-renderizar. Con 'Otra' o sin categoría gana lo que haya en
 * `meta.icono`; sin nada, la caja c-otros o la diana i-metas.
 *
 * DIS.14: el ícono dejó de ir en línea con el nombre y pasó al centro del
 * arco, así que la clase del glifo la decide quien llama (el tamaño ya no es
 * el mismo en los dos sitios).
 *
 * `meta.icono` puede tener dos formatos (CAT.2b, sin bump de schema): un id
 * de símbolo del sprite ('c-pesa', elegido con el picker compartido desde
 * esta rebanada) o un emoji crudo (dato de metas viejas, creadas antes de
 * CAT.2b con el campo de texto libre de MT.3). Se distingue por el patrón
 * `letra-` que ningún emoji real produce.
 *
 * @param {import('../../core/state.js').Meta} meta
 * @param {string} [cls='icon icon--sm'] clase del `<svg>` del sprite.
 * @returns {string}
 */
function _iconoMeta(meta, cls = 'icon icon--sm') {
  if (meta.categoria && meta.categoria !== 'Otra') {
    const simbolo = CATEGORIA_META_ICONO[meta.categoria];
    if (simbolo) return iconoCategoria(simbolo, cls);
  }
  if (meta.icono) {
    return /^[a-z]-/.test(meta.icono)
      ? iconoCategoria(meta.icono, cls)
      : _esc(meta.icono);
  }
  return iconoCategoria(meta.categoria === 'Otra' ? 'c-otros' : 'i-metas', cls);
}

/**
 * comparador.js - las bolsas con fecha, una al lado de la otra (DIS.19).
 *
 * El gráfico que responde "de todo lo que estoy reuniendo, ¿cuál va mal?" con
 * un solo vistazo. Cada bolsa es una columna: la altura es el dinero reunido y
 * la línea punteada marca dónde debería ir hoy según su plan. Una columna que no
 * llega a su línea se ve antes de leer un nombre, y ese es el trabajo que ni la
 * tarjeta individual ni una lista pueden hacer: comparar.
 *
 * Reglas:
 * - `htmlComparador()` es pura: sin DOM, sin S, sin lógica de negocio. Recibe
 *   columnas ya calculadas y devuelve HTML.
 * - Vive en `ui/` y no en un dominio porque tiene dos lectores que ADN #10 no
 *   deja conectar: la lista de Apartados y el carril de Apartados en la casa de
 *   Ahorro. Mismo motivo que `proposito.js`.
 * - Todo el copy lo pasa el llamador. El componente no sabe si una columna es un
 *   apartado, un mes o una cuota: sabe dibujar alturas comparables.
 *
 * Accesibilidad: el gráfico no es la fuente de la información. Sin interacción
 * va `aria-hidden` y lo que dice lo dice el pie en palabras (mismo criterio que
 * los bloques de mes del fondo, regla R11). Con interacción cada columna es un
 * botón con su nombre accesible completo, porque entonces sí hay algo que hacer.
 */

import { esc as _esc } from '../infra/utils.js';

/**
 * HTML del comparador de columnas.
 *
 * @param {Array<{
 *   id: string,
 *   nombre: string,
 *   iconoHtml: string,
 *   pct: number,
 *   plan: number|null,
 *   nota: string,
 *   estado?: 'listo'|'atras'|'',
 *   seleccionada?: boolean,
 *   etiquetaAccesible?: string,
 * }>} columnas
 * @param {Object} [opts]
 * @param {string} [opts.titulo]  - Encabezado del bloque. Sin él no se dibuja cabecera.
 * @param {string} [opts.medida]  - Qué mide la altura, al lado del título ("altura = lo reunido").
 * @param {string} [opts.pie]     - La lectura en palabras. Es lo que anuncia el lector de pantalla.
 * @param {string} [opts.accion]  - `data-action` de cada columna. Sin él el gráfico no es interactivo.
 * @param {string} [opts.clase]   - Clases extra del contenedor (ej. 'cmp--mini').
 * @returns {string} '' si no hay columnas que comparar.
 */
export function htmlComparador(columnas, opts = {}) {
  if (!Array.isArray(columnas) || columnas.length === 0) return '';

  const { titulo = '', medida = '', pie = '', accion = '', clase = '' } = opts;
  const interactivo = accion !== '';

  const cabecera = titulo
    ? `<div class="cmp__head">
        <p class="cmp__title">${_esc(titulo)}</p>
        ${medida ? `<p class="cmp__hint">${_esc(medida)}</p>` : ''}
      </div>`
    : '';

  const cols = columnas.map(c => _htmlColumna(c, accion)).join('');

  return `
    <div class="cmp${clase ? ` ${_esc(clase)}` : ''}">
      ${cabecera}
      <div class="cmp__cols"${interactivo ? '' : ' aria-hidden="true"'}>${cols}</div>
      ${pie ? `<p class="cmp__hint">${pie}</p>` : ''}
    </div>`;
}

/**
 * Una columna: el riel con su relleno y la marca del plan, y la base con el
 * ícono, el nombre y la nota.
 *
 * La marca del plan se posiciona con `bottom` en el mismo porcentaje que usa la
 * altura del relleno, así que las dos se leen contra la misma escala sin ejes.
 * Sin plan (una bolsa sin fecha) no se dibuja: una línea inventada diría que
 * vas atrasado contra nada.
 */
function _htmlColumna(c, accion) {
  const clases = ['cmp__fill'];
  if (c.estado === 'listo') clases.push('cmp__fill--listo');
  else if (c.estado === 'atras') clases.push('cmp__fill--atras');

  const cuerpo = `
        <span class="cmp__riel">
          <span class="${clases.join(' ')}" style="height:${_pct(c.pct)}%"></span>
          ${c.plan === null || c.plan === undefined ? '' : `<span class="cmp__plan" style="bottom:${_pct(c.plan)}%"></span>`}
        </span>
        <span class="cmp__base">
          ${c.iconoHtml ?? ''}
          <span class="cmp__lb">${_esc(c.nombre)}</span>
          <span class="cmp__dias">${_esc(c.nota ?? '')}</span>
        </span>`;

  if (!accion) {
    return `<span class="cmp__col">${cuerpo}</span>`;
  }

  return `<button class="cmp__col" type="button"
              data-action="${_esc(accion)}"
              data-id="${_esc(c.id)}"
              aria-pressed="${c.seleccionada === true}"
              aria-label="${_esc(c.etiquetaAccesible ?? `${c.nombre}: ${c.nota ?? ''}`)}">${cuerpo}</button>`;
}

/** Recorta un porcentaje al rango dibujable. */
function _pct(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(100, Math.round(v)));
}

/**
 * El pie del comparador, en palabras: qué significa la línea punteada y quién
 * va por debajo. Es la versión accesible del gráfico, así que nombra a los
 * atrasados en vez de decir cuántos son.
 *
 * @param {Array<{nombre:string, pct:number, plan:number|null, estado?:string}>} columnas
 * @returns {string} '' si no hay nada que comparar.
 */
export function pieComparador(columnas) {
  if (!Array.isArray(columnas) || columnas.length === 0) return '';

  const conPlan = columnas.filter(c => c.plan !== null && c.plan !== undefined);
  if (conPlan.length === 0) {
    return 'Ponle fecha a un apartado y aparece la marca de dónde deberías ir hoy.';
  }

  const atrasados = conPlan.filter(c => c.estado === 'atras').map(c => c.nombre);
  const base = 'La línea punteada marca dónde deberías ir hoy.';

  if (atrasados.length === 0) {
    return `${base} Todos van sobre la línea: estás al día.`;
  }

  const nombres = atrasados.length === 1
    ? _esc(atrasados[0])
    : `${atrasados.slice(0, -1).map(_esc).join(', ')} y ${_esc(atrasados[atrasados.length - 1])}`;

  return `${base} <strong>${nombres}</strong> ${atrasados.length === 1 ? 'va' : 'van'} por debajo.`;
}

/**
 * familia-view.js - el bloque Familia de Ajustes y el alta del niño
 * (APR.3a, ADR 093 D1 y D2). Solo HTML, sin estado propio.
 *
 * El tutor administra desde aquí: agrega un niño (paso 1: nombre, edad,
 * dibujo y cómo lo nombra), entra a su perfil sin PIN (de adulto a niño es
 * libre) y lo elimina. La mesada, el premio y el progreso del niño llegan
 * con APR.3e.
 */

import { esc } from '../../infra/utils.js';
import { icon } from '../../infra/icons.js';
import { DIBUJOS, htmlDibujo, dibujoPorId } from '../../infra/ilustraciones.js';
import { EDAD_MIN, EDAD_MAX, NOMBRE_MAX, COMO_TE_NOMBRA } from '../../infra/perfiles.js';
import { PIN_LARGO_MIN, PIN_LARGO_MAX } from './bloqueo.js';

/** Desde esta edad la ruta del niño empieza con preguntas de ubicación (D9). */
export const EDAD_UBICACION = 10;

/** El dibujo del niño dentro de su teja de color. */
function _avatar(perfil, tamano = 40) {
  const d = dibujoPorId(perfil.dibujo);
  return `<span class="kidav kidav--sm" style="--d: var(--fk-dom-${d?.dominio ?? 'ahorro'})">${htmlDibujo(perfil.dibujo, { tamano })}</span>`;
}

/**
 * La tarjeta Familia de Ajustes.
 *
 * @param {import('../../infra/perfiles.js').PerfilNino[]} ninos
 * @returns {string}
 */
export function htmlFamilia(ninos) {
  const lista = ninos.length ? `
      <ul class="familia-lista">
        ${ninos.map(p => `
          <li class="familia-nino">
            ${_avatar(p)}
            <div class="familia-nino__datos">
              <p class="familia-nino__nombre">${esc(p.nombre)}</p>
              <p class="familia-nino__meta">${p.edad} años · te dice ${esc(p.teNombra)}</p>
            </div>
            <div class="familia-nino__acciones">
              <button class="btn btn-secondary btn-sm" type="button" data-action="familia-entrar" data-id="${esc(p.id)}">Entrar como ${esc(p.nombre)}</button>
              <button class="btn btn-ghost btn-sm" type="button" data-action="familia-eliminar" data-id="${esc(p.id)}"
                      aria-label="Eliminar el perfil de ${esc(p.nombre)}">${icon('trash')}</button>
            </div>
          </li>`).join('')}
      </ul>` : `
      <p class="form-hint">
        Comparte Finko con tus hijos de ${EDAD_MIN} a ${EDAD_MAX} años. Cada uno tiene su perfil, sus lecciones
        y su alcancía, y no ve nada tuyo.
      </p>`;
  return `
    <section class="config-section" aria-labelledby="config-familia-title" id="config-familia">
      <h2 class="config-section__title" id="config-familia-title">Familia</h2>
      ${lista}
      <div class="config-form__guardar">
        <button class="btn btn-secondary" type="button" data-action="familia-agregar">${icon('plus')}${ninos.length ? 'Agregar otro niño' : 'Agregar un niño'}</button>
      </div>
    </section>`;
}

/**
 * Paso 1 del alta: quién es el niño y qué verá (D2).
 *
 * @param {{ candado: boolean, datos?: Record<string, string> }} opciones
 * @returns {string}
 */
export function htmlAltaNino({ candado, datos = {} }) {
  const edades = Array.from({ length: EDAD_MAX - EDAD_MIN + 1 }, (_, i) => EDAD_MIN + i);
  const marcado = (campo, valor) => String(datos[campo] ?? '') === String(valor) ? ' checked' : '';
  const teNombra = datos.teNombra ?? COMO_TE_NOMBRA[0];
  const esOtro = !COMO_TE_NOMBRA.includes(teNombra);
  return `
    <form id="form-familia-nino" class="familia-alta" novalidate>
      <p class="familia-alta__paso">Familia</p>
      <div class="form-group">
        <label for="familia-nombre" class="label">Nombre</label>
        <input id="familia-nombre" name="nombre" class="input" type="text" autocomplete="off"
               maxlength="${NOMBRE_MAX}" value="${esc(datos.nombre ?? '')}" />
      </div>
      <fieldset class="form-group familia-alta__grupo">
        <legend class="label">Edad</legend>
        <div class="familia-opciones">
          ${edades.map(e => `
            <label class="familia-opcion"><input class="sr-only" type="radio" name="edad" value="${e}"${marcado('edad', e)} /><span>${e}</span></label>`).join('')}
        </div>
        <p class="form-hint">Con ${EDAD_MIN} a ${EDAD_UBICACION - 1} años, la ruta empieza en la unidad 1. Desde los ${EDAD_UBICACION}, primero responde 3 preguntas de ubicación.</p>
      </fieldset>
      <fieldset class="form-group familia-alta__grupo">
        <legend class="label">Su dibujo</legend>
        <div class="familia-dibujos">
          ${DIBUJOS.map((d, i) => `
            <label class="familia-dibujo"><input class="sr-only" type="radio" name="dibujo" value="${d.id}"${datos.dibujo ? marcado('dibujo', d.id) : i === 0 ? ' checked' : ''} />${htmlDibujo(d.id, { tamano: 48 })}<span>${esc(d.nombre)}</span></label>`).join('')}
        </div>
        <p class="form-hint">Sin fotos: ocupan espacio y no hacen falta.</p>
      </fieldset>
      <fieldset class="form-group familia-alta__grupo">
        <legend class="label">¿Cómo te nombra?</legend>
        <div class="familia-opciones">
          ${COMO_TE_NOMBRA.map(n => `
            <label class="familia-opcion"><input class="sr-only" type="radio" name="teNombra" value="${esc(n)}"${!esOtro && teNombra === n ? ' checked' : ''} /><span>${esc(n)}</span></label>`).join('')}
          <label class="familia-opcion"><input class="sr-only" type="radio" name="teNombra" value="otro"${esOtro ? ' checked' : ''} /><span>Otro nombre</span></label>
        </div>
        <label for="familia-otro" class="sr-only">Otro nombre</label>
        <input id="familia-otro" name="teNombraOtro" class="input familia-alta__otro" type="text" autocomplete="off"
               maxlength="${NOMBRE_MAX}" placeholder="Por ejemplo, Abuela" value="${esOtro ? esc(teNombra) : ''}" />
        <p class="form-hint">Así te nombra en su alcancía: «Papá te suma $1 por cada $10».</p>
      </fieldset>
      <div class="familia-alta__ve">
        <p class="familia-alta__ve-titulo">${icon('eye')}Lo que verá</p>
        <p>Sus lecciones, su alcancía y sus metas.</p>
        <p>Nada tuyo: ni cuentas, ni deudas, ni tarjetas, ni impuestos. Tampoco puede exportar datos.</p>
      </div>
      ${candado ? '' : `<p class="form-hint familia-alta__candado">${icon('key')}Aún no tienes candado. Al continuar crearás tu PIN, para que nadie más entre a tu perfil.</p>`}
      <button type="submit" class="btn btn-primary btn-block">Continuar</button>
    </form>`;
}

/**
 * Crear el PIN antes del primer niño (D1: el candado es obligatorio).
 *
 * @param {string} nombre - del niño, para decir para qué es.
 * @returns {string}
 */
export function htmlAltaPin(nombre) {
  return `
    <form id="form-familia-pin" class="familia-alta" novalidate>
      <p class="familia-alta__paso">Familia · tu candado</p>
      <p class="form-hint">
        Con niños en este teléfono, Finko pide un PIN para entrar a tu perfil, así ${esc(nombre)} no
        ve tus cuentas. <strong>No cifra tus datos:</strong> tapa la pantalla, nada más.
      </p>
      <div class="form-group">
        <label for="familia-pin" class="label">Tu PIN nuevo</label>
        <input id="familia-pin" name="pin" class="input" type="password" inputmode="numeric"
               autocomplete="new-password" maxlength="${PIN_LARGO_MAX}" placeholder="${PIN_LARGO_MIN} a ${PIN_LARGO_MAX} números" />
      </div>
      <div class="form-group">
        <label for="familia-pin2" class="label">Repite el PIN</label>
        <input id="familia-pin2" name="pin2" class="input" type="password" inputmode="numeric"
               autocomplete="new-password" maxlength="${PIN_LARGO_MAX}" placeholder="Otra vez" />
        <p class="form-hint">Si lo olvidas, la única salida es borrar todo, también los perfiles de los niños.</p>
      </div>
      <button type="submit" class="btn btn-primary btn-block">Crear PIN y agregar a ${esc(nombre)}</button>
    </form>`;
}

/**
 * nube-view.js - el bloque "Guardar en la nube" de Ajustes (NUBE.1 y
 * NUBE.2, ADR 096). Solo HTML, sin estado propio: lo pinta `config/view.js` con el
 * estado que lleva `config/nube.js`.
 */

import { esc } from '../../infra/utils.js';
import { icon } from '../../infra/icons.js';

/**
 * @typedef {Object} EstadoNubeVista
 * @property {{ email: string } | null} sesion
 * @property {'correo'|'codigo'} paso       - sin sesión: en qué paso del acceso va.
 * @property {string} correo                 - el correo al que se mandó el acceso.
 * @property {boolean} [autoriza]            - marcó la autorización (sobrevive al repintar).
 * @property {boolean} ocupado
 * @property {string} error                  - código de `ErrorNube` o de validación.
 * @property {string} [ultimaSubida]         - ISO de la última sincronización.
 * @property {boolean} [pendiente]           - hay cambios sin sincronizar.
 * @property {{ actualizado: string, dispositivo?: string } | null} [eleccion]
 *   - los dos lados tienen datos: el usuario elige cuál queda.
 */

/** Mensaje humano de cada error. */
export const MENSAJES_NUBE = {
  'no-invitado':         'Ese correo no está invitado a la prueba. Pídele acceso a quien te compartió Finko.',
  'codigo-invalido':     'El código no es válido o ya venció. Pide uno nuevo.',
  'demasiados-intentos': 'Muchos intentos seguidos. Espera unos minutos y vuelve a intentar.',
  'sin-red':             'Sin conexión. Revisa tu internet y vuelve a intentar.',
  'sesion-vencida':      'Tu sesión venció. Vuelve a entrar con tu correo.',
  'servidor':            'La nube no respondió. Intenta de nuevo en un momento.',
  'correo':              'Escribe un correo válido.',
  'autorizacion':        'Para guardar en la nube necesitamos tu autorización.',
  'enlace':              'El enlace del correo no sirvió o ya venció. Pide uno nuevo.',
  'sin-respaldo':        'Todavía no hay datos en la nube.',
};

/**
 * "hace un momento", "hace 5 min", "hace 2 h" o la fecha.
 * @param {string} iso
 * @param {Date} [ahora]
 */
export function haceCuanto(iso, ahora = new Date()) {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return '';
  const min = Math.floor((ahora.getTime() - t) / 60000);
  if (min < 1) return 'hace un momento';
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = new Date(t);
  return `el ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

function _error(codigo) {
  if (!codigo) return '';
  return `<p class="form-hint form-hint--danger" role="alert">${esc(MENSAJES_NUBE[codigo] ?? MENSAJES_NUBE.servidor)}</p>`;
}

function _accesoCorreo(e) {
  return `
      <p class="config-section__desc">
        Con una cuenta, Finko guarda una copia de tus datos en la nube: la ves igual en el
        celular y en el computador, y no la pierdes si cambias de teléfono. Este dispositivo
        sigue teniendo todo.
      </p>
      <form id="form-nube-correo" class="config-form" novalidate>
        <div class="form-group">
          <label for="nube-correo" class="label">Tu correo</label>
          <input id="nube-correo" name="correo" class="input" type="email" inputmode="email"
                 autocomplete="email" value="${esc(e.correo)}" required />
          <p class="form-hint">Solo entran los correos invitados a la prueba.</p>
        </div>
        <div class="form-group form-group--checkbox">
          <label class="checkbox-row">
            <input type="checkbox" name="autoriza" id="nube-autoriza" ${e.autoriza ? 'checked' : ''} />
            <span>Autorizo que Finko guarde en la nube (Supabase, en São Paulo) una copia de mis
              datos y de los perfiles de niños que administro, para sincronizarlos y recuperarlos.
              Si agrego niños, declaro ser su padre, madre o representante legal. Puedo borrar
              esta copia cuando quiera.</span>
          </label>
        </div>
        ${_error(e.error)}
        <div class="config-actions">
          <button type="submit" class="btn btn-secondary" ${e.ocupado ? 'disabled' : ''}>
            ${e.ocupado ? 'Enviando…' : 'Enviarme el acceso'}
          </button>
        </div>
      </form>`;
}

function _accesoCodigo(e) {
  return `
      <p class="config-section__desc" id="nube-enviado">
        Te enviamos un correo a <strong>${esc(e.correo)}</strong>. Abre el enlace desde este
        dispositivo o, si el correo trae un código, escríbelo aquí.
      </p>
      <form id="form-nube-codigo" class="config-form" novalidate>
        <div class="form-group">
          <label for="nube-codigo" class="label">Código del correo</label>
          <input id="nube-codigo" name="codigo" class="input" type="text" inputmode="numeric"
                 autocomplete="one-time-code" maxlength="10" required />
        </div>
        ${_error(e.error)}
        <div class="config-actions">
          <button type="submit" class="btn btn-primary" ${e.ocupado ? 'disabled' : ''}>
            ${e.ocupado ? 'Entrando…' : 'Entrar'}
          </button>
          <button type="button" class="btn btn-secondary" data-action="nube-otro-correo">Usar otro correo</button>
        </div>
      </form>`;
}

function _eleccion(e) {
  const de = e.eleccion.dispositivo ? ` desde ${esc(e.eleccion.dispositivo)}` : '';
  return `
      <div role="group" aria-labelledby="nube-eleccion-titulo">
        <p class="config-section__desc"><strong id="nube-eleccion-titulo">Tienes datos aquí y en la nube</strong></p>
        <p class="config-section__desc">
          La nube tiene datos, con el último cambio ${esc(haceCuanto(e.eleccion.actualizado))}${de}.
          Elige cuáles quedan en todos tus dispositivos: los otros se reemplazan. Mientras eliges, no se sincroniza nada.
        </p>
        <div class="config-actions">
          <button type="button" class="btn btn-primary" data-action="nube-traer">Usar los de la nube</button>
          <button type="button" class="btn btn-secondary" data-action="nube-subir-local">Subir los de este dispositivo</button>
        </div>
      </div>`;
}

function _conectado(e) {
  const estado = e.ocupado ? 'Sincronizando…'
    : e.pendiente ? 'Hay cambios por sincronizar: se suben solos cuando haya conexión.'
    : e.ultimaSubida ? `Sincronizado ${haceCuanto(e.ultimaSubida)}.`
    : 'Todavía no se ha sincronizado.';
  // "Sincronizar ahora" nunca va deshabilitado: la sincronización corre sola y
  // no repinta el panel, así que un botón deshabilitado al pintar quedaría así.
  // `_sincronizar()` ya ignora una pasada encima de otra.
  return `
      <p class="config-section__desc">
        Tu cuenta: <strong>${esc(e.sesion.email)}</strong>. Lo que anotas aquí aparece en tus
        otros dispositivos, y lo de ellos aquí, unos segundos después de cada cambio.
      </p>
      ${e.eleccion ? _eleccion(e) : `<p class="config-section__desc" id="nube-estado" aria-live="polite">${esc(estado)}</p>`}
      ${_error(e.error)}
      <div class="config-actions">
        ${e.eleccion ? '' : `<button type="button" class="btn btn-secondary" data-action="nube-sincronizar">Sincronizar ahora</button>
        <button type="button" class="btn btn-secondary" data-action="nube-traer">Traer los datos de la nube</button>`}
        <button type="button" class="btn btn-secondary" data-action="nube-cerrar">Cerrar sesión</button>
        <button type="button" class="btn btn-secondary" data-action="nube-cerrar-todo">Cerrar sesión en todos los dispositivos</button>
      </div>
      <div class="config-danger">
        <h3 class="config-danger__title">${icon('alert')} Borrar mis datos de la nube</h3>
        <p class="config-danger__desc">Borra todo lo que hay en la nube. Lo de este dispositivo no se toca.</p>
        <button type="button" class="btn btn-danger" data-action="nube-borrar">Borrar de la nube</button>
      </div>`;
}

/**
 * @param {EstadoNubeVista} e
 * @returns {string}
 */
export function htmlNube(e) {
  const cuerpo = e.sesion ? _conectado(e) : e.paso === 'codigo' ? _accesoCodigo(e) : _accesoCorreo(e);
  return `
    <section class="config-section" aria-labelledby="config-nube-title" id="config-nube">
      <h2 class="config-section__title" id="config-nube-title">
        Guardar en la nube <span class="chip chip-info">Prueba</span>
      </h2>
      ${cuerpo}
    </section>`;
}

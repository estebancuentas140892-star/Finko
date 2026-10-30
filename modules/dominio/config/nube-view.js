/**
 * nube-view.js - el bloque "Guardar en la nube" de Ajustes (NUBE.1, NUBE.2
 * y NUBE.2b, ADR 096), el modal "Su teléfono" de Familia y la pantalla del
 * código del niño (NUBE.3). Solo HTML, sin estado propio: lo pinta
 * `config/nube.js` con su estado.
 */

import { esc } from '../../infra/utils.js';
import { icon, isotipo } from '../../infra/icons.js';

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
  'vinculo-invalido':    'Este teléfono ya no está vinculado. Pide un código nuevo.',
  'nino-sin-sincronizar': 'Este perfil todavía no llegó a la nube. Espera unos segundos y vuelve a intentar.',
  'fuera-del-nino':      'La nube no aceptó el cambio. Intenta de nuevo en un momento.',
  'autorizacion-nino':   'Marca las dos casillas para generar el código.',
  'codigo-vacio':        'Escribe el código de 8 letras.',
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
      </div>
      <div class="config-danger">
        <h3 class="config-danger__title">${icon('alert')} Borrar mi cuenta</h3>
        <p class="config-danger__desc">Borra tu cuenta y todo lo que hay en la nube, también lo de tus niños. Para volver
          a usarla necesitas una invitación nueva. Lo de este dispositivo se queda.</p>
        <button type="button" class="btn btn-danger" data-action="nube-borrar-cuenta">Borrar mi cuenta</button>
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

// ── FAMILIA (NUBE.3) ─────────────────────────────────────────────

/** "ABCD2345" → "ABCD-2345", más fácil de dictar. */
export function codigoLegible(codigo) {
  const c = String(codigo ?? '');
  return c.length === 8 ? `${c.slice(0, 4)}-${c.slice(4)}` : c;
}

/**
 * El modal "Su teléfono" de un niño, en Familia.
 * @param {{ nino: { id: string, nombre: string }, sesion: boolean, paso: 'autorizar'|'codigo',
 *   codigo?: string, vinculos: { dispositivo?: string, ultimo_uso?: string, creado?: string }[],
 *   error?: string, ocupado?: boolean }} e
 * @returns {string}
 */
export function htmlVincularNino(e) {
  const nombre = esc(e.nino.nombre);
  if (!e.sesion) {
    return `
      <p class="config-section__desc">
        Para que ${nombre} use Finko en su propio teléfono, primero guarda tus datos en la nube:
        aquí mismo en Ajustes, en <strong>Tus datos, Guardar en la nube</strong>.
      </p>
      <div class="config-actions">
        <button type="button" class="btn btn-secondary" data-action="nube-cerrar-modal">Entendido</button>
      </div>`;
  }
  const vinculados = e.vinculos.length ? `
      <p class="config-section__desc"><strong>Teléfonos vinculados</strong></p>
      <ul class="nube-vinculos">${e.vinculos.map(v => `
        <li>${esc(v.dispositivo || 'Teléfono')}: ${v.ultimo_uso ? `sincronizó ${esc(haceCuanto(v.ultimo_uso))}` : 'todavía no sincroniza'}</li>`).join('')}
      </ul>
      <div class="config-actions">
        <button type="button" class="btn btn-ghost" data-action="nube-desvincular-nino" data-id="${esc(e.nino.id)}">Desvincular su teléfono</button>
      </div>` : '';

  if (e.paso === 'codigo') {
    return `
      <p class="config-section__desc">
        En el teléfono de ${nombre}, abre Finko y toca <strong>Tengo un código de mi familia</strong>.
        Escribe este código:
      </p>
      <p class="nube-codigo" id="nube-codigo-generado">${esc(codigoLegible(e.codigo))}</p>
      <p class="form-hint">Vence en 10 minutos y sirve una sola vez.</p>
      <div class="config-actions">
        <button type="button" class="btn btn-secondary" data-action="nube-cerrar-modal">Listo</button>
      </div>
      ${vinculados}`;
  }
  return `
      <form id="form-nube-vincular" class="config-form" novalidate data-id="${esc(e.nino.id)}">
        <p class="config-section__desc">
          Para que ${nombre} use Finko en su propio teléfono y tú veas su avance desde el tuyo,
          guardamos en la nube su nombre, su edad, su dibujo, sus frascos, su meta, su mesada y sus
          lecciones. Nunca su correo, teléfono, documento, fotos ni ubicación. Solo tú ves sus datos.
        </p>
        <div class="form-group form-group--checkbox">
          <label class="checkbox-row">
            <input type="checkbox" name="representante" id="nube-representante" />
            <span>Soy padre, madre o representante legal de ${nombre} y autorizo que Finko trate sus
              datos para esto, en su interés superior.</span>
          </label>
        </div>
        <div class="form-group form-group--checkbox">
          <label class="checkbox-row">
            <input type="checkbox" name="escuchado" id="nube-escuchado" />
            <span>Le conté a ${nombre} qué es Finko y qué se guarda, y tuve en cuenta su opinión.</span>
          </label>
        </div>
        ${_error(e.error)}
        <div class="config-actions">
          <button type="submit" class="btn btn-primary" ${e.ocupado ? 'disabled' : ''}>
            ${e.ocupado ? 'Generando…' : 'Generar código'}
          </button>
        </div>
      </form>
      ${vinculados}`;
}

/**
 * La pantalla del teléfono del niño para entrar con el código (va dentro
 * del onboarding). Voz del niño: frases cortas (ADR 093 D6).
 * @param {{ error?: string, ocupado?: boolean }} e
 * @returns {string}
 */
export function htmlCodigoNino(e) {
  return `
    <form id="form-nube-codigo-nino" novalidate>
      <div class="onboarding__hero" aria-hidden="true">${isotipo()}</div>
      <h2 class="onboarding__title">Entra con tu código</h2>
      <p class="onboarding__desc">
        Pídele a quien te cuida que abra Finko y vaya a Ajustes, Familia, Su teléfono.
        Te va a dar un código de 8 letras.
      </p>
      <div class="form-group">
        <label for="nube-codigo-nino" class="label">Tu código</label>
        <input id="nube-codigo-nino" name="codigo" class="input nube-codigo-input" type="text"
               autocomplete="one-time-code" autocapitalize="characters" spellcheck="false"
               maxlength="12" placeholder="ABCD-2345" required />
      </div>
      ${_error(e.error)}
      <div class="onboarding__footer">
        <button type="submit" class="btn btn-primary btn-lg" ${e.ocupado ? 'disabled' : ''}>
          ${e.ocupado ? 'Entrando…' : 'Entrar'}
        </button>
        <button type="button" class="btn btn-ghost" data-action="nube-codigo-nino-volver">Volver</button>
      </div>
    </form>`;
}


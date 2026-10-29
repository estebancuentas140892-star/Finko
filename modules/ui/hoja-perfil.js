/**
 * hoja-perfil.js - la hoja "Tu perfil" que abre el avatar de Inicio en móvil
 * (MV2.15c, [ADR 099](../../docs/DECISIONS/099-inicio-movil-hoy-en-una-lista.md) D6 y D7).
 *
 * El avatar dejó de ser una teja decorativa: es la puerta a tu perfil,
 * Familia, la copia en la nube y Ajustes. El engranaje que vivía al lado del
 * saludo salió del encabezado; Ajustes queda aquí y en "Más".
 *
 * No hay pantalla nueva ni lógica nueva:
 * - Cada fila lleva a su bloque de Ajustes, que ya existe.
 * - "Pasarle el teléfono a {nombre}" usa el cambio de perfil de siempre
 *   (`entrarComo`, ADR 093 D1): de adulto a niño es libre, y volver pide el
 *   PIN en "¿Quién usa Finko?". Nada del adulto entra a la app del niño.
 *
 * Solo existe bajo 1024px: el botón que la abre no se ve en escritorio.
 */

import { S } from '../core/state.js';
import { esc } from '../infra/utils.js';
import { icon, iconoCategoria } from '../infra/icons.js';
import { inicialesDe } from '../infra/render.js';
import { navigate } from '../infra/router.js';
import { ninos, entrarComo } from '../infra/perfiles.js';
import { leerSesion, leerToken } from '../infra/nube.js';
import { registrarAccion } from './actions.js';
import { abrirModal, cerrarModal } from './modales.js';

/** El bloque de Ajustes al que lleva cada fila: su título es el ancla. */
const TITULO_BLOQUE = {
  perfil:  'config-perfil-title',
  familia: 'config-familia-title',
  nube:    'config-nube-title',
};

// ── PURAS ────────────────────────────────────────────────────────

/**
 * Lo que dice la fila de Familia: quién está, o la invitación a agregar.
 *
 * @param {Array<{nombre: string, edad: number}>} hijos
 * @returns {string}
 */
export function textoFamilia(hijos) {
  if (hijos.length === 0) return 'Agrega a tus hijos';
  if (hijos.length === 1) return `${hijos[0].nombre}, ${hijos[0].edad} años`;
  if (hijos.length === 2) return `${hijos[0].nombre} y ${hijos[1].nombre}`;
  return `${hijos.length} niños`;
}

/**
 * Lo que la hoja necesita, leído del estado. Sin DOM.
 *
 * @param {typeof S} [state=S]
 * @param {{ access_token?: string } | null} [sesion=leerSesion()]
 */
export function datosHojaPerfil(state = S, sesion = leerSesion()) {
  const nombre = typeof state.perfil?.nombre === 'string' ? state.perfil.nombre.trim() : '';
  const correo = sesion?.access_token ? (leerToken(sesion.access_token).email ?? '') : '';
  return {
    nombre,
    hijos: ninos(state).map(p => ({ id: p.id, nombre: p.nombre, edad: p.edad })),
    correo,
  };
}

/** Una fila de la lista: teja, qué es, para qué, y la flecha de seguir. */
function _fila({ icono, dom, titulo, sub, datos }) {
  return `
        <button type="button" class="hoja-perfil__fila" ${datos}>
          <span class="hoja-perfil__teja hoja-perfil__teja--${dom}" aria-hidden="true">${icono}</span>
          <span class="hoja-perfil__textos">
            <span class="hoja-perfil__t">${esc(titulo)}</span>
            <span class="hoja-perfil__s">${esc(sub)}</span>
          </span>
          ${icon('chevron-right', 'icon icon--sm hoja-perfil__seguir')}
        </button>`;
}

/**
 * HTML de la hoja. Puro respecto al estado.
 *
 * @param {ReturnType<typeof datosHojaPerfil>} d
 * @returns {string}
 */
export function htmlHojaPerfil(d) {
  const titulo = d.nombre || 'Tu perfil';
  const pasar = d.hijos.map(h => `
        <button type="button" class="hoja-perfil__pasar" data-action="perfil-pasar" data-id="${esc(h.id)}">
          <span class="hoja-perfil__teja hoja-perfil__teja--metas" aria-hidden="true">${icon('transferencia')}</span>
          <span class="hoja-perfil__textos">
            <span class="hoja-perfil__t">Pasarle el teléfono a ${esc(h.nombre)}</span>
            <span class="hoja-perfil__s">Abre su app. Para volver, se pide tu PIN</span>
          </span>
          ${icon('chevron-right', 'icon icon--sm hoja-perfil__seguir')}
        </button>`).join('');

  const filas = [
    _fila({ icono: icon('edit'), dom: 'tesoreria', titulo: 'Tu nombre y tu perfil', sub: 'Cómo te saluda Finko',
      datos: 'data-action="perfil-ir" data-bloque="perfil"' }),
    _fila({ icono: icon('personales'), dom: 'personales', titulo: 'Familia', sub: textoFamilia(d.hijos),
      datos: 'data-action="perfil-ir" data-bloque="familia"' }),
    _fila({ icono: iconoCategoria('c-escudo'), dom: 'ahorro', titulo: 'Copia en la nube',
      sub: d.correo || 'Úsala también en otro teléfono',
      datos: 'data-action="perfil-ir" data-bloque="nube"' }),
    _fila({ icono: icon('ajustes'), dom: 'analisis', titulo: 'Ajustes', sub: 'PIN, avisos, respaldo y la app',
      datos: 'data-action="perfil-ir" data-bloque=""' }),
  ].join('');

  return `
    <div class="hoja-perfil__cabeza">
      <span class="hoja-perfil__avatar" aria-hidden="true">${d.nombre ? esc(inicialesDe(d.nombre)) : icon('personales')}</span>
      <div class="hoja-perfil__textos">
        <h2 class="hoja-perfil__titulo" id="perfil-hoja-titulo">${esc(titulo)}</h2>
        <p class="hoja-perfil__s">Tu perfil en este teléfono</p>
      </div>
    </div>
    ${pasar}
    <div class="hoja-perfil__lista">${filas}
    </div>`;
}

// ── DOM ──────────────────────────────────────────────────────────

function _abrir() {
  const hoja = document.getElementById('modal-perfil');
  const cuerpo = document.getElementById('perfil-hoja-body');
  if (!hoja || !cuerpo) return;
  cuerpo.innerHTML = htmlHojaPerfil(datosHojaPerfil());
  abrirModal(hoja);
}

function _cerrarHoja(el) {
  const overlay = el.closest('.modal-overlay');
  if (overlay) cerrarModal(overlay);
}

/**
 * Baja hasta el bloque de Ajustes y le pasa el foco a su título. Corre en un
 * `hashchange` puesto al tocar la fila, o sea detrás del router y de
 * volver.js, que dejan la sección nueva arriba (ADR 098 D2).
 */
function _irABloque(bloque) {
  const id = TITULO_BLOQUE[bloque];
  if (!id) return;
  requestAnimationFrame(() => {
    const titulo = document.getElementById(id);
    if (!titulo) return;
    (titulo.closest('.config-section') ?? titulo).scrollIntoView({ block: 'start', behavior: 'instant' });
    titulo.setAttribute('tabindex', '-1');
    titulo.focus({ preventScroll: true });
  });
}

/** Se llama una vez desde bootstrap.js. */
export function initHojaPerfil() {
  registrarAccion('perfil-abrir', _abrir);

  registrarAccion('perfil-ir', (el) => {
    _cerrarHoja(el);
    const bloque = el.dataset.bloque ?? '';
    if (bloque) window.addEventListener('hashchange', () => _irABloque(bloque), { once: true });
    navigate('config');
  });

  // De adulto a niño es libre (ADR 093 D1); volver pide el PIN.
  registrarAccion('perfil-pasar', (el) => {
    _cerrarHoja(el);
    entrarComo(el.dataset.id ?? null);
  });
}

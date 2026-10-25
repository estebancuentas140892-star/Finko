/**
 * quien-usa.js - "¿Quién usa Finko?" y el cambio de perfil (APR.3a, ADR 093 D1).
 *
 * Contrato:
 * - Con niños en el dispositivo, Finko abre aquí en vez del candado de
 *   siempre: el adulto entra con su PIN y cada niño con su dibujo. Sin niños,
 *   `initPerfiles()` no abre nada y el arranque no cambia (bloqueo-acceso.js).
 * - De niño a adulto se pide el PIN; de adulto a niño es libre. Entrar al
 *   adulto emite `bloqueo:abierto`, como el candado: bootstrap.js tiene detrás
 *   el gate legal, las novedades y los débitos automáticos.
 * - "Agregar un niño" también pide el PIN, y deja al adulto en Ajustes con el
 *   alta abierta (`familia:agregar`, lo atiende config).
 * - La piel cambia con el fundido del tema (CFG.7): `body.kid`, el adulto se
 *   esconde y aparece `#nino-app`. Ningún dato se mueve.
 * - Igual que el candado: tapa la pantalla, no cifra `fk_v1` (ADR 063).
 */

import { S, EventBus } from '../core/state.js';
import { abrirModal, cerrarModal } from './modales.js';
import { registrarAccion } from './actions.js';
import { conFundido } from './shell.js';
import { intentarPin, olvideMiPin } from './bloqueo-acceso.js';
import { announce } from '../infra/a11y.js';
import { esc } from '../infra/utils.js';
import { icon, iconoCategoria } from '../infra/icons.js';
import { htmlDibujo, dibujoPorId } from '../infra/ilustraciones.js';
import { ninos, hayNinos, perfilActivo, esPerfilNino, entrarComo } from '../infra/perfiles.js';
import { candadoActivo, PIN_LARGO_MAX } from '../dominio/config/bloqueo.js';

const _overlay = () => document.getElementById('quien-usa');
const _cuerpo = () => document.getElementById('quien-usa-body');

/** Para qué se pide el PIN: entrar al adulto o agregar un niño. */
let _modoPin = 'adulto';

/** Nombre del adulto para el saludo; sin nombre, "Tú". */
function _nombreAdulto() {
  return String(S.perfil?.nombre ?? '').trim() || 'Tú';
}

/** Iniciales del adulto (máximo dos), su avatar sin foto. */
function _iniciales(nombre) {
  const partes = nombre.split(/\s+/).filter(Boolean);
  return (partes.length > 1 ? partes[0][0] + partes[1][0] : nombre.slice(0, 2)).toUpperCase();
}

/**
 * "Cambiar de perfil" al pie de la barra lateral del adulto (APR.4b, ADR
 * 092 D2): solo existe cuando hay perfiles de niño, con las iniciales y el
 * nombre de quien usa Finko ahora.
 */
function _pintarAccesoPerfil() {
  const boton = document.getElementById('sidebar-perfil');
  if (!boton) return;
  boton.hidden = !hayNinos();
  if (boton.hidden) return;
  const nombre = _nombreAdulto();
  document.getElementById('sidebar-perfil-av').textContent = _iniciales(nombre);
  document.getElementById('sidebar-perfil-nombre').textContent = nombre;
  boton.setAttribute('aria-label', `${nombre}. Cambiar de perfil`);
}

/** HTML de la elección de perfil. */
export function htmlQuienUsa() {
  const adulto = _nombreAdulto();
  const filas = ninos().map(p => {
    const d = dibujoPorId(p.dibujo);
    return `
      <button class="quien-usa__perfil" type="button" data-role="nino" data-id="${esc(p.id)}">
        <span class="kidav" style="--d: var(--fk-dom-${d?.dominio ?? 'ahorro'})">${htmlDibujo(p.dibujo, { tamano: 48 })}</span>
        <span class="quien-usa__nombre">${esc(p.nombre)}</span>
        <span class="quien-usa__meta">${p.edad} años</span>
      </button>`;
  }).join('');
  return `
    <div class="quien-usa">
      <h2 class="onboarding__title" id="quien-usa-titulo" tabindex="-1">¿Quién usa Finko?</h2>
      <p class="onboarding__desc">Elige tu perfil para entrar.</p>
      <div class="quien-usa__perfiles">
        <button class="quien-usa__perfil" type="button" data-role="adulto">
          <span class="quien-usa__iniciales" aria-hidden="true">${esc(_iniciales(adulto))}</span>
          <span class="quien-usa__nombre">${esc(adulto)}</span>
          <span class="quien-usa__meta">${icon('key')}Adulto · con PIN</span>
        </button>
        ${filas}
        <button class="quien-usa__perfil quien-usa__perfil--agregar" type="button" data-role="agregar">
          <span class="kidav kidav--agregar" aria-hidden="true">${icon('plus')}</span>
          <span class="quien-usa__nombre">Agregar un niño</span>
          <span class="quien-usa__meta">${icon('key')}Pide tu PIN</span>
        </button>
      </div>
      <p class="quien-usa__nota">${iconoCategoria('c-escudo')}<span>Todo se queda en este teléfono. Finko no usa cuentas ni internet, y cada niño solo ve su alcancía y sus lecciones.</span></p>
    </div>`;
}

/** HTML del paso del PIN, para entrar al adulto o para agregar un niño. */
export function htmlPinAdulto(modo) {
  const adulto = _nombreAdulto();
  const para = modo === 'agregar' ? 'agregar un niño' : 'entrar a tu perfil';
  return `
    <form class="quien-usa quien-usa--pin" id="form-quien-usa-pin" novalidate>
      <button type="button" class="btn btn-ghost btn-sm quien-usa__volver" data-role="volver">${icon('arrow-left')}Volver</button>
      <span class="quien-usa__iniciales" aria-hidden="true">${esc(_iniciales(adulto))}</span>
      <h2 class="onboarding__title" id="quien-usa-titulo" tabindex="-1">Hola, ${esc(adulto)}</h2>
      <p class="onboarding__desc">Escribe tu PIN para ${para}.</p>
      <div class="form-group">
        <label for="quien-usa-pin" class="label">Tu PIN</label>
        <input id="quien-usa-pin" name="pin" class="input" type="password"
               inputmode="numeric" autocomplete="current-password" maxlength="${PIN_LARGO_MAX}" />
      </div>
      <p class="form-hint form-hint--muted" id="quien-usa-error" role="alert"></p>
      <div class="onboarding__footer">
        <button type="submit" class="btn btn-primary btn-lg">Entrar</button>
        <button type="button" class="btn btn-ghost" data-role="olvide-pin">¿Olvidaste tu PIN?</button>
      </div>
      <p class="quien-usa__nota">${iconoCategoria('c-escudo')}<span>El candado protege tu perfil de quien usa este teléfono. No cifra tus datos.</span></p>
    </form>`;
}

function _pintar(html, foco) {
  const cuerpo = _cuerpo();
  if (!cuerpo) return;
  cuerpo.innerHTML = html;
  cuerpo.querySelector(foco)?.focus({ preventScroll: true });
}

/** Abre la elección de perfil: al arrancar con niños y desde "Cambiar de perfil". */
export function abrirQuienUsa() {
  const overlay = _overlay();
  const cuerpo = _cuerpo();
  if (!overlay || !cuerpo) return;
  cuerpo.innerHTML = htmlQuienUsa();
  if (!('open' in overlay.dataset)) abrirModal(overlay);
  cuerpo.querySelector('#quien-usa-titulo')?.focus({ preventScroll: true });
}

function _cerrar() {
  const overlay = _overlay();
  if (overlay && 'open' in overlay.dataset) cerrarModal(overlay);
}

/** El adulto pasó: vuelve a su perfil y siguen los gates de detrás del candado. */
function _entrarAdulto() {
  const agregar = _modoPin === 'agregar';
  _cerrar();
  entrarComo(null);
  announce('Entraste a tu perfil.');
  EventBus.emit('bloqueo:abierto');
  if (agregar) {
    location.hash = '#config';
    EventBus.emit('familia:agregar');
  }
}

/** Pide el PIN, salvo que no haya candado (un respaldo inconsistente): entra. */
function _pedirPin(modo) {
  _modoPin = modo;
  if (!candadoActivo(S.config?.bloqueo)) {
    _entrarAdulto();
    return;
  }
  _pintar(htmlPinAdulto(modo), '#quien-usa-pin');
}

/** @param {MouseEvent} e */
async function _onClick(e) {
  const el = /** @type {HTMLElement} */ (e.target).closest('[data-role]');
  if (!el) return;
  const rol = el.dataset.role;
  if (rol === 'adulto') _pedirPin('adulto');
  else if (rol === 'agregar') _pedirPin('agregar');
  else if (rol === 'volver') _pintar(htmlQuienUsa(), '#quien-usa-titulo');
  else if (rol === 'olvide-pin') await olvideMiPin();
  else if (rol === 'nino') {
    _cerrar();
    entrarComo(el.dataset.id ?? null);
  }
}

/** @param {SubmitEvent} e */
async function _onSubmit(e) {
  const form = /** @type {HTMLFormElement} */ (e.target);
  if (form.id !== 'form-quien-usa-pin') return;
  e.preventDefault();
  const campo = /** @type {HTMLInputElement|null} */ (form.querySelector('[name="pin"]'));
  const { ok, mensaje } = await intentarPin(campo?.value ?? '');
  if (ok) {
    _entrarAdulto();
    return;
  }
  if (campo) {
    campo.value = '';
    campo.focus();
  }
  const error = document.getElementById('quien-usa-error');
  if (error) error.textContent = mensaje ?? '';
  if (mensaje) announce(mensaje, 'assertive');
}

/** Cambia la piel según quién usa Finko: la app cambia de piel, no de lugar. */
function _aplicarPiel() {
  // La piel se decide al aplicarse, no al pedirse: con View Transitions el
  // cambio corre un cuadro después, y dos cambios seguidos pueden llegar en
  // desorden. Leer el perfil activo en ese momento deja siempre el último.
  const aplicar = () => {
    const nino = esPerfilNino();
    document.body.classList.toggle('kid', nino);
    const app = document.getElementById('app');
    if (app) app.hidden = nino;
    const kid = document.getElementById('nino-app');
    if (kid) kid.hidden = !nino;
  };
  conFundido(aplicar).then(() => {
    // Ya visible: el foco va a lo primero que se lee del niño, su saludo.
    if (!esPerfilNino()) return;
    const destino = document.querySelector('#nino-main h1') ?? document.getElementById('nino-main');
    destino?.focus({ preventScroll: true });
  });
}

/**
 * Cablea los perfiles. Devuelve `true` si abrió "¿Quién usa Finko?" al
 * arrancar (hay niños): entonces el candado de siempre no se abre.
 *
 * @returns {boolean}
 */
export function initPerfiles() {
  const overlay = _overlay();
  overlay?.addEventListener('click', _onClick);
  overlay?.addEventListener('submit', _onSubmit);
  EventBus.on('perfil:cambio', _aplicarPiel);
  // "Cambiar de perfil" desde el niño: vuelve a la elección, donde el adulto
  // pide su PIN (D1).
  registrarAccion('perfil-cambiar', abrirQuienUsa);
  // Si se borra el niño activo o se importa un respaldo sin él, no queda
  // dentro de un perfil fantasma: perfilActivo() ya no lo encuentra.
  EventBus.on('state:change', () => {
    if (!perfilActivo() && document.body.classList.contains('kid')) entrarComo(null);
    _pintarAccesoPerfil();
  });
  _pintarAccesoPerfil();

  if (S.onboarded !== true || !hayNinos()) return false;
  abrirQuienUsa();
  return true;
}

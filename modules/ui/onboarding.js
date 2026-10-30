/**
 * onboarding.js - wizard inicial para usuarios nuevos.
 *
 * Fase 6: stub funcional que auto-completaba el onboarding.
 * Fase 13: wizard real de 2 pasos (nombre + bienvenida) usando el sistema de modales.
 * LEG.2: paso 2, aceptación obligatoria del paquete legal antes de entrar.
 *
 * Contrato:
 * - Si el usuario ya completó el wizard, no hace nada.
 * - Si cierra con Escape en cualquier paso, S.onboarded queda en false y
 *   nada se guarda → el wizard reaparece desde el paso 1 en la próxima visita.
 * - Solo aceptar el paso legal (paso 2) persiste el onboarding.
 * - APR.6a (ADR 100 D1): antes del nombre, "¿Quién va a usar Finko?". El
 *   adulto sigue por aquí; el niño, por onboarding-nino.js, dentro del mismo
 *   overlay; el código de la familia (NUBE.3) sube a esa primera pantalla.
 */

import { S, EventBus } from '../core/state.js';
import { save } from '../core/storage.js';
import { abrirModal, cerrarModal } from './modales.js';
import { renderAll } from '../infra/render.js';
import { announce } from '../infra/a11y.js';
import { mostrarErroresForm } from '../infra/form-errors.js';
import { esc, hoy } from '../infra/utils.js';
import { icon, isotipo } from '../infra/icons.js';
import { htmlDibujo } from '../infra/ilustraciones.js';
import { registrarAccion } from './actions.js';
import { renderBloqueAceptacion, registrarAceptacion } from './aceptacion-legal.js';
import { empezarCaminoNino, manejarFormNino, volverEnCaminoNino } from './onboarding-nino.js';

/** Nombre capturado en el paso 1, en memoria hasta que el paso 2 lo persiste. */
let _nombreTemp = '';

/**
 * Inicializa el flujo de onboarding.
 * Si el usuario ya completó el wizard, retorna inmediatamente.
 */
export function initOnboarding() {
  if (S.onboarded) return;
  registrarAccion('onboarding-adulto', () => _pintarPaso1());
  registrarAccion('onboarding-nino', () => empezarCaminoNino());
  registrarAccion('onboarding-volver', (el) => {
    if (!volverEnCaminoNino(el)) volverAlInicio();
  });
  _mostrarWizard();
}

function _pintarPaso1() {
  const body = document.querySelector('#onboarding #onboarding-body');
  if (!body) return;
  body.innerHTML = _renderPaso1();
  body.querySelector('input')?.focus();
}

// ── WIZARD ───────────────────────────────────────────────────────

function _mostrarWizard() {
  const overlay = document.getElementById('onboarding');
  if (!overlay) return;

  _nombreTemp = '';

  // Inyectar el contenido del wizard en el body del modal: primero, quién
  // va a usar Finko (ADR 100 D1).
  const body = overlay.querySelector('#onboarding-body');
  if (body) body.innerHTML = _renderQuien();

  abrirModal(overlay);

  // Listener del formulario - delegado dentro del overlay.
  overlay.addEventListener('submit', _onSubmitWizard);
}

function _onSubmitWizard(e) {
  e.preventDefault();
  const form = e.target;

  if (manejarFormNino(form)) return;
  if (form.id === 'form-onboarding') {
    _onSubmitPaso1(form);
  } else if (form.id === 'form-onboarding-legal') {
    _onSubmitPaso2(form);
  }
}

function _onSubmitPaso1(form) {
  const nombre = form.querySelector('[name="nombre"]')?.value?.trim() ?? '';

  // ADR 098 D10 (hallazgo N14): el aviso solo llegaba al lector de pantalla y
  // "Continuar" parecía no hacer nada. Ahora se ve, con el mismo bloque de
  // errores de todos los formularios (que también lo anuncia).
  if (!nombre) {
    mostrarErroresForm(form, ['Escribe tu nombre para continuar.'], 'Falta un dato:');
    return;
  }

  _nombreTemp = nombre;

  const overlay = document.getElementById('onboarding');
  const body = overlay?.querySelector('#onboarding-body');
  if (body) {
    body.innerHTML = _renderPaso2(nombre);
    body.querySelector('input, button')?.focus();
  }
}

function _onSubmitPaso2(form) {
  const acepto = form.querySelector('[name="acepto"]')?.checked === true;
  if (!acepto) {
    mostrarErroresForm(form, ['Marca la casilla para confirmar que aceptas los documentos.'], 'Falta un paso:');
    return;
  }

  // Guardar perfil, aceptación legal y marcar onboarding completo.
  S.perfil.nombre = _nombreTemp;
  registrarAceptacion();
  S.onboarded = true;
  // Referencia del aviso de respaldo atrasado si el usuario nunca exporta uno
  // (CFG.4b, ADR 043 D2.2): el reloj arranca acá, no antes.
  if (!S.config || typeof S.config !== 'object') S.config = {};
  S.config.primerUsoISO = hoy();
  save();
  EventBus.emit('onboarding:completado');

  // Cerrar overlay y re-renderizar con los datos del usuario.
  const overlay = document.getElementById('onboarding');
  if (overlay) cerrarModal(overlay);

  renderAll();
  announce(`¡Bienvenido a Finko, ${_nombreTemp}!`);
}

// ── TEMPLATES ────────────────────────────────────────────────────

/**
 * Paso 1 del wizard. El hero lleva la marca "F" de NAV2.1b (ADR 040 D4) y
 * no un emoji: el 💚 se renderizaba distinto en cada sistema operativo, así
 * que la primera impresión de la app cambiaba de dibujo según el teléfono
 * (DIS.6/C2, hallazgo H2). Los estilos de las clases .onboarding__* viven
 * en styles/modals.css.
 */
/**
 * Primera pantalla (APR.6a, ADR 100 D1): quién va a usar Finko. El niño que
 * descarga la app solo no cae en el formulario de un adulto; el código de la
 * familia (NUBE.3) sube acá desde el paso del nombre.
 */
function _renderQuien() {
  return `
    <div class="onboarding-quien">
      <div class="onboarding__hero" aria-hidden="true">${isotipo()}</div>
      <h2 class="onboarding__title" id="onboarding-quien-titulo" tabindex="-1">Te damos la bienvenida a Finko</h2>
      <p class="onboarding__desc">¿Quién va a usar Finko en este teléfono?</p>
      <div class="onboarding-quien__opciones">
        <button type="button" class="onboarding-quien__opcion" data-action="onboarding-adulto">
          <span class="onboarding-quien__icono" aria-hidden="true">${icon('cuentas')}</span>
          <span class="onboarding-quien__textos">
            <span class="onboarding-quien__t">Soy adulto</span>
            <span class="onboarding-quien__s">Tu dinero, tus gastos, tus deudas y tus metas</span>
          </span>
        </button>
        <button type="button" class="onboarding-quien__opcion" data-action="onboarding-nino">
          <span class="onboarding-quien__icono" aria-hidden="true">${htmlDibujo('cometa', { tamano: 32 })}</span>
          <span class="onboarding-quien__textos">
            <span class="onboarding-quien__t">Soy niño o niña</span>
            <span class="onboarding-quien__s">De 7 a 12 años: aprende y cuida tu alcancía</span>
          </span>
        </button>
      </div>
      <p class="onboarding__note">
        <button type="button" class="btn btn-ghost btn-sm" data-action="nube-codigo-nino">Tengo un código de mi familia</button>
      </p>
      <p class="onboarding__note">Todo se guarda en este teléfono. La cuenta en la nube es opcional.</p>
    </div>`;
}

function _renderPaso1() {
  return `
    <form id="form-onboarding" novalidate>
      <button type="button" class="btn btn-ghost btn-sm onboarding__volver" data-action="onboarding-volver">${icon('arrow-left')}Volver</button>
      <div class="onboarding__hero" aria-hidden="true">${isotipo()}</div>
      <h2 class="onboarding__title">¡Bienvenido a Finko!</h2>
      <p class="onboarding__desc">
        Tu gestión financiera personal, en tu idioma y sin complicaciones.
        Primero, ¿cómo te llamas?
      </p>
      <div class="form-group">
        <label for="onboarding-nombre" class="label">Tu nombre</label>
        <input id="onboarding-nombre" name="nombre" class="input" type="text"
               placeholder="Ej. Camilo" required aria-required="true"
               autocomplete="given-name" />
      </div>
      <div class="onboarding__footer">
        <button type="submit" class="btn btn-primary btn-lg">Siguiente →</button>
      </div>
      <p class="onboarding__note">
        Tus datos se guardan en tu dispositivo. La cuenta en la nube es opcional.
      </p>
    </form>`;
}

/**
 * Vuelve a la primera pantalla, "¿Quién va a usar Finko?" (ADR 100 D1): la
 * usan el "Volver" del adulto y del niño, y la pantalla del código del niño
 * (`config/nube.js`, NUBE.3).
 */
export function volverAlInicio() {
  const body = document.querySelector('#onboarding #onboarding-body');
  if (!body) return;
  body.innerHTML = _renderQuien();
  body.querySelector('#onboarding-quien-titulo')?.focus({ preventScroll: true });
}

/**
 * Paso 2 del wizard (LEG.2): aceptación obligatoria del paquete legal antes
 * de entrar. El bloque de checkbox + enlaces es compartido con el gate de
 * re-aceptación de usuarios existentes (aceptacion-legal.js).
 * @param {string} nombre - ya validado en el paso 1, solo para personalizar el saludo.
 */
function _renderPaso2(nombre) {
  return `
    <form id="form-onboarding-legal" novalidate>
      <h2 class="onboarding__title">Gracias, ${esc(nombre)}</h2>
      <p class="onboarding__desc">
        Un último paso antes de entrar: revisa y acepta estos documentos.
      </p>
      ${renderBloqueAceptacion()}
      <div class="onboarding__footer">
        <button type="submit" class="btn btn-primary btn-lg">Entrar a Finko</button>
      </div>
    </form>`;
}
